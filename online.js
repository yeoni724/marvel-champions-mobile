/* Online 2-player transport and room state manager (Claude Artifacts DB + local tab fallback). */
(function (root) {
  'use strict';
  const MC = root.MC = root.MC || {};
  const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const SESSION_KEY = 'mc-online-session-v1';
  const NICK_KEY = 'mc-online-nick-v1';
  const LOCAL_UID_KEY = 'mc-local-uid-v1';
  const LOCAL_PREFIX = 'mc-local-room-';
  const CKPT_PREFIX = 'mc-online-ckpt-';
  const SESSION_TTL = 24 * 60 * 60 * 1000;
  const CLOSED_TTL = 5 * 60 * 1000;

  function cleanJSON(val) {
    if (val === undefined) return null;
    return JSON.parse(JSON.stringify(val));
  }

  function genId(len) {
    let s = '';
    for (let i = 0; i < (len || 8); i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    return s;
  }

  function normCode(raw) {
    return String(raw || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
  }

  function formatError(err) {
    if (!err) return '알 수 없는 오류가 발생했습니다';
    const msg = err.message || String(err);
    const code = err.code || '';
    if (code === 'permission-denied' || /permission|denied|unauthorized|forbidden/i.test(msg)) {
      return '공유 저장소 접근 권한이 없습니다. Claude 아티팩트 공유 설정에서 상대에게 "기여자" 이상 권한을 주세요.';
    }
    if (code === 'quota_exceeded' || /quota|storage|limit|full/i.test(msg)) {
      return '공유 저장소 용량이 가득 찼습니다. 오래된 방이 정리된 뒤 다시 시도해 주세요.';
    }
    if (code === 'invalid-argument' || /too large|1048576/i.test(msg)) {
      return '게임 상태 크기가 너무 커서 저장할 수 없습니다.';
    }
    return msg;
  }

  function sanitizeQuestion(q) {
    if (!q || typeof q !== 'object') return null;
    const owner = q.owner != null ? q.owner : 0;
    switch (q.type) {
      case 'main':
        return {
          type: 'main',
          owner,
          actions: (q.actions || []).map(a => ({
            kind: a.kind,
            uid: a.uid != null ? a.uid : null,
            idx: a.idx != null ? a.idx : null,
            label: a.label || '',
            targetPlayer: a.targetPlayer != null ? a.targetPlayer : null,
            nextPlayer: a.nextPlayer != null ? a.nextPlayer : null
          }))
        };
      case 'target':
        return {
          type: 'target',
          owner,
          title: q.title || '',
          cands: (q.cands || []).slice(),
          cancelable: !!q.cancelable
        };
      case 'choice':
      case 'window':
      case 'defend':
      case 'request':
        return {
          type: q.type,
          owner,
          title: q.title || '',
          enemy: q.enemy != null ? q.enemy : null,
          boostCount: q.boostCount != null ? q.boostCount : null,
          options: (q.options || []).map(o => ({
            id: String(o.id),
            uid: o.uid != null ? o.uid : null,
            label: o.label || ''
          }))
        };
      case 'pay':
        return {
          type: 'pay',
          owner,
          title: q.title || '',
          cost: cleanJSON(q.cost),
          forUid: q.forUid != null ? q.forUid : null,
          sources: (q.sources || []).map(s => ({
            key: s.key,
            uid: s.uid != null ? s.uid : null,
            kind: s.kind,
            res: s.res || '',
            label: s.label != null ? s.label : null
          })),
          suggestion: (q.suggestion || []).slice(),
          cancelable: !!q.cancelable
        };
      case 'select':
        return {
          type: 'select',
          owner,
          title: q.title || '',
          cards: (q.cards || []).slice(),
          min: q.min != null ? q.min : 0,
          max: q.max != null ? q.max : 0,
          confirm: q.confirm != null ? q.confirm : null
        };
      case 'cleanup':
        return {
          type: 'cleanup',
          owner,
          title: q.title || '',
          players: cleanJSON(q.players || [])
        };
      default:
        return cleanJSON(q);
    }
  }

  function sanitizeShow(ev) {
    if (!ev || typeof ev !== 'object') return null;
    return {
      type: ev.type,
      uid: ev.uid != null ? ev.uid : null,
      title: ev.title != null ? ev.title : null,
      cards: ev.cards ? ev.cards.slice() : null,
      icons: ev.icons != null ? ev.icons : null
    };
  }

  function getLocalTabUid() {
    try {
      let id = root.sessionStorage && root.sessionStorage.getItem(LOCAL_UID_KEY);
      if (!id) {
        id = 'tab-' + genId(8);
        if (root.sessionStorage) root.sessionStorage.setItem(LOCAL_UID_KEY, id);
      }
      return id;
    } catch (e) {
      return 'tab-' + genId(8);
    }
  }

  function createLocalTransport() {
    const uid = getLocalTabUid();
    const bc = typeof root.BroadcastChannel === 'function' ? new root.BroadcastChannel('mc-online-v1') : null;
    const watchers = new Map(); // code -> Set<fn>

    function readRoomDocs(code) {
      const docs = [];
      try {
        if (!root.localStorage) return docs;
        for (let i = 0; i < root.localStorage.length; i++) {
          const k = root.localStorage.key(i);
          if (!k || !k.startsWith(LOCAL_PREFIX)) continue;
          const raw = root.localStorage.getItem(k);
          if (!raw) continue;
          const data = JSON.parse(raw);
          if (data && data.room === code) docs.push({ id: k.slice(LOCAL_PREFIX.length), data });
        }
      } catch (e) { /* ignore */ }
      return docs;
    }

    function notify(code) {
      const set = watchers.get(code);
      if (!set || !set.size) return;
      const docs = readRoomDocs(code);
      for (const fn of [...set]) {
        try { fn(docs); } catch (e) { /* ignore */ }
      }
    }

    if (bc) {
      bc.addEventListener('message', ev => {
        if (ev && ev.data && ev.data.room) notify(ev.data.room);
      });
    }
    if (typeof root.addEventListener === 'function') {
      root.addEventListener('storage', ev => {
        if (!ev.key || !ev.key.startsWith(LOCAL_PREFIX)) return;
        for (const code of watchers.keys()) notify(code);
      });
    }

    return {
      mode: 'local',
      uid,
      name: '',
      watchRoom(code, onDocs) {
        let set = watchers.get(code);
        if (!set) { set = new Set(); watchers.set(code, set); }
        set.add(onDocs);
        setTimeout(() => {
          if (set.has(onDocs)) onDocs(readRoomDocs(code));
        }, 0);
        return () => {
          set.delete(onDocs);
          if (!set.size) watchers.delete(code);
        };
      },
      async writeDoc(docId, data) {
        const clean = cleanJSON(data);
        try {
          if (root.localStorage) root.localStorage.setItem(LOCAL_PREFIX + docId, JSON.stringify(clean));
        } catch (e) { throw new Error('로컬 저장소에 방 상태를 쓸 수 없습니다'); }
        if (bc) bc.postMessage({ room: clean.room, docId });
        notify(clean.room);
      },
      async deleteDoc(docId) {
        let room = null;
        try {
          const raw = root.localStorage && root.localStorage.getItem(LOCAL_PREFIX + docId);
          if (raw) room = JSON.parse(raw).room;
          if (root.localStorage) root.localStorage.removeItem(LOCAL_PREFIX + docId);
        } catch (e) { /* ignore */ }
        if (room && bc) bc.postMessage({ room, docId });
        if (room) notify(room);
      },
      async cleanupStale(maxAgeMs) {
        try {
          if (!root.localStorage) return;
          const now = Date.now(), ttl = maxAgeMs || SESSION_TTL;
          const activeCodes = new Set(), removeKeys = [], ckptKeys = [];
          let sessCode = null;
          try {
            const rawSess = root.localStorage.getItem(SESSION_KEY);
            const sess = rawSess ? JSON.parse(rawSess) : null;
            if (sess && sess.code && now - (sess.updatedAt || 0) <= SESSION_TTL) sessCode = sess.code;
          } catch (e) { /* ignore */ }
          for (let i = 0; i < root.localStorage.length; i++) {
            const k = root.localStorage.key(i);
            if (!k) continue;
            if (k.startsWith(CKPT_PREFIX)) { ckptKeys.push(k); continue; }
            if (!k.startsWith(LOCAL_PREFIX)) continue;
            try {
              const data = JSON.parse(root.localStorage.getItem(k) || 'null');
              if (!data) { removeKeys.push(k); continue; }
              const ts = data.updatedAt || data.createdAt || 0;
              const stale = (data.status === 'closed' && now - ts > CLOSED_TTL) || (now - ts > ttl);
              if (stale) removeKeys.push(k);
              else if (data.room) activeCodes.add(data.room);
            } catch (e) { removeKeys.push(k); }
          }
          for (const k of removeKeys) root.localStorage.removeItem(k);
          for (const k of ckptKeys) {
            const code = k.slice(CKPT_PREFIX.length);
            if (!activeCodes.has(code) && code !== sessCode) root.localStorage.removeItem(k);
          }
        } catch (e) { /* ignore */ }
      }
    };
  }

  async function resolveDefaultTransport() {
    if (root.claude && typeof root.claude.use === 'function') {
      try {
        const [db, user] = await Promise.all([root.claude.use('db'), root.claude.use('user')]);
        const uid = user && typeof user.id === 'function' ? await user.id() : null;
        let name = '';
        try {
          if (user && typeof user.name === 'function') name = (await user.name()) || '';
        } catch (e) { name = ''; }
        if (db && uid) {
          const col = db.collection('data/shared/rooms');
          return {
            mode: 'cloud',
            uid,
            name,
            watchRoom(code, onDocs, onError) {
              return col.where('room', '==', code).onSnapshot(snap => {
                const docs = snap.docs.map(d => ({ id: d.id, data: d.data() })).filter(x => x.data);
                onDocs(docs);
              }, err => {
                if (onError) onError(err);
              });
            },
            async writeDoc(docId, data) {
              await col.doc(docId).set(cleanJSON(data));
            },
            async deleteDoc(docId) {
              await col.doc(docId).delete();
            },
            async cleanupStale(maxAgeMs) {
              try {
                if (typeof col.where !== 'function') return;
                const q = col.where('kind', '==', 'mc-room');
                if (!q || typeof q.get !== 'function') return;
                const snap = await q.get();
                const now = Date.now(), ttl = maxAgeMs || SESSION_TTL;
                for (const doc of (snap.docs || [])) {
                  const d = doc && typeof doc.data === 'function' ? doc.data() : null;
                  if (!d || (d.hostUid !== uid && d.guestUid !== uid)) continue;
                  const ts = d.updatedAt || d.createdAt || 0;
                  if ((d.status === 'closed' && now - ts > CLOSED_TTL) || (now - ts > ttl)) {
                    await col.doc(doc.id).delete().catch(() => {});
                  }
                }
              } catch (e) { /* ignore if .get unsupported */ }
            }
          };
        }
      } catch (e) { /* fall back to local transport */ }
    }
    return createLocalTransport();
  }

  function createController(customTransport) {
    let transport = customTransport || null;
    let initPromise = null;
    let unsub = null;
    let waiter = null; // { gameId, askId, cb }
    let hostState = null;
    let guestState = null;
    const listeners = [];

    const ctrl = {
      ready: !!customTransport,
      mode: customTransport ? customTransport.mode : 'local',
      uid: customTransport ? customTransport.uid : '',
      nickname: '',
      code: null,
      role: null, // 'host' | 'guest' | null
      hostDoc: null,
      guestDoc: null,
      error: '',
      seq: 0,

      onChange(fn) {
        listeners.push(fn);
        return () => {
          const i = listeners.indexOf(fn);
          if (i >= 0) listeners.splice(i, 1);
        };
      },
      emit() {
        for (const fn of listeners.slice()) {
          try { fn(ctrl); } catch (e) { /* ignore */ }
        }
      },
      statusText() {
        if (!ctrl.ready) return '연결 확인 중…';
        if (ctrl.mode === 'cloud') return 'Claude 공유 저장소 연결됨 (기기 간 실시간 동기화)';
        return '로컬 테스트 모드 (같은 브라우저의 다른 탭과 연결됩니다)';
      },
      loadNickname() {
        try {
          const n = root.localStorage && root.localStorage.getItem(NICK_KEY);
          if (n) return n;
        } catch (e) { /* ignore */ }
        return '';
      },
      setNickname(name) {
        const clean = String(name || '').trim().slice(0, 20);
        ctrl.nickname = clean;
        try {
          if (root.localStorage) {
            if (clean) root.localStorage.setItem(NICK_KEY, clean);
            else root.localStorage.removeItem(NICK_KEY);
          }
        } catch (e) { /* ignore */ }
        if (ctrl.code && ctrl.role === 'host' && hostState) {
          hostState.hostName = ctrl.displayName();
          hostState.updatedAt = Date.now();
          transport.writeDoc(hostDocId(ctrl.code), hostState).catch(() => {});
        } else if (ctrl.code && ctrl.role === 'guest' && guestState) {
          guestState.guestName = ctrl.displayName();
          guestState.updatedAt = Date.now();
          transport.writeDoc(guestDocId(ctrl.code), guestState).catch(() => {});
        }
      },
      displayName() {
        return ctrl.nickname || (ctrl.role === 'guest' ? '게스트' : '방장');
      },
      savedSession() {
        try {
          const raw = root.localStorage && root.localStorage.getItem(SESSION_KEY);
          if (!raw) return null;
          const s = JSON.parse(raw);
          if (!s || !s.code || !s.role || !s.updatedAt) return null;
          if (Date.now() - s.updatedAt > SESSION_TTL) {
            root.localStorage.removeItem(SESSION_KEY);
            return null;
          }
          return s;
        } catch (e) { return null; }
      },
      saveSession(code, role) {
        try {
          if (root.localStorage) root.localStorage.setItem(SESSION_KEY, JSON.stringify({ code, role, updatedAt: Date.now() }));
        } catch (e) { /* ignore */ }
      },
      clearSession() {
        try {
          if (root.localStorage) root.localStorage.removeItem(SESSION_KEY);
        } catch (e) { /* ignore */ }
      },

      async init() {
        if (transport) {
          if (!ctrl.nickname) ctrl.nickname = ctrl.loadNickname() || transport.name || '';
          ctrl.ready = true;
          ctrl.mode = transport.mode;
          ctrl.uid = transport.uid;
          if (typeof transport.cleanupStale === 'function') transport.cleanupStale().catch(() => {});
          ctrl.emit();
          return ctrl;
        }
        if (!initPromise) {
          initPromise = resolveDefaultTransport().then(t => {
            transport = t;
            ctrl.ready = true;
            ctrl.mode = t.mode;
            ctrl.uid = t.uid;
            ctrl.nickname = ctrl.loadNickname() || t.name || '';
            if (typeof t.cleanupStale === 'function') t.cleanupStale().catch(() => {});
            ctrl.emit();
            return ctrl;
          });
        }
        return initPromise;
      },
      cleanupLocal() {
        if (transport && typeof transport.cleanupStale === 'function') return transport.cleanupStale();
        return Promise.resolve();
      },

      _unsubscribe() {
        if (unsub) {
          try { unsub(); } catch (e) { /* ignore */ }
          unsub = null;
        }
      },

      _handleDocs(docs) {
        const h = docs.find(d => d.data && d.data.role === 'host');
        const g = docs.find(d => d.data && d.data.role === 'guest');
        ctrl.hostDoc = h ? h.data : null;
        ctrl.guestDoc = g ? g.data : null;
        if (waiter && ctrl.guestDoc && ctrl.guestDoc.joined !== false && ctrl.guestDoc.answer) {
          const a = ctrl.guestDoc.answer;
          if (a.gameId === waiter.gameId && a.askId === waiter.askId) {
            const cb = waiter.cb;
            waiter = null;
            Promise.resolve().then(() => cb(a.value));
          }
        }
        ctrl.emit();
      },

      async createRoom(lobbyData) {
        await ctrl.init();
        await ctrl.leaveRoom({ closeIfHost: false, silent: true });
        const code = genId(4);
        ctrl.code = code;
        ctrl.role = 'host';
        ctrl.error = '';
        ctrl.seq = 1;
        ctrl.hostDoc = null;
        ctrl.guestDoc = null;
        hostState = {
          kind: 'mc-room',
          room: code,
          role: 'host',
          v: 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          hostUid: transport.uid,
          hostName: ctrl.displayName(),
          status: 'lobby',
          lobby: cleanJSON(lobbyData),
          gameId: null,
          seq: 1,
          state: null,
          pendingAsk: null,
          showEv: null
        };
        ctrl.hostDoc = hostState;
        unsub = transport.watchRoom(code, docs => ctrl._handleDocs(docs), err => {
          ctrl.error = formatError(err);
          ctrl.emit();
        });
        try {
          await transport.writeDoc(hostDocId(code), hostState);
        } catch (err) {
          ctrl._unsubscribe();
          ctrl.code = null;
          ctrl.role = null;
          hostState = null;
          ctrl.hostDoc = null;
          ctrl.error = formatError(err);
          ctrl.emit();
          throw new Error(ctrl.error);
        }
        ctrl.saveSession(code, 'host');
        ctrl.emit();
        return code;
      },

      async joinRoom(rawCode, guestData) {
        await ctrl.init();
        const code = normCode(rawCode);
        if (code.length !== 4) throw new Error('4자리 방 코드를 입력해 주세요');
        await ctrl.leaveRoom({ closeIfHost: false, silent: true });
        ctrl.code = code;
        ctrl.role = 'guest';
        ctrl.error = '';
        ctrl.hostDoc = null;
        ctrl.guestDoc = null;

        let settled = false;
        let timeoutId = null;
        const found = await new Promise((resolve, reject) => {
          timeoutId = setTimeout(() => {
            if (settled) return;
            settled = true;
            ctrl._unsubscribe();
            ctrl.code = null;
            ctrl.role = null;
            reject(new Error('방을 찾을 수 없습니다. 방 코드를 다시 확인해 주세요.'));
          }, 6000);

          unsub = transport.watchRoom(code, docs => {
            ctrl._handleDocs(docs);
            if (settled) return;
            const h = docs.find(d => d.data && d.data.role === 'host');
            if (!h) return;
            const hd = h.data;
            const g = docs.find(d => d.data && d.data.role === 'guest');
            const gd = g ? g.data : null;
            if (hd.status === 'closed') {
              settled = true; clearTimeout(timeoutId); ctrl._unsubscribe();
              ctrl.code = null; ctrl.role = null;
              reject(new Error('방장이 이미 종료한 방입니다'));
              return;
            }
            if (gd && gd.joined && gd.guestUid && gd.guestUid !== transport.uid) {
              settled = true; clearTimeout(timeoutId); ctrl._unsubscribe();
              ctrl.code = null; ctrl.role = null;
              reject(new Error('이미 다른 플레이어가 참여 중인 방입니다'));
              return;
            }
            settled = true;
            clearTimeout(timeoutId);
            resolve({ hostDoc: hd, guestDoc: gd });
          }, err => {
            const msg = formatError(err);
            ctrl.error = msg;
            if (!settled) {
              settled = true; clearTimeout(timeoutId); ctrl._unsubscribe();
              ctrl.code = null; ctrl.role = null;
              reject(new Error(msg));
            } else {
              ctrl.emit();
            }
          });
        });

        const prev = found.guestDoc && found.guestDoc.guestUid === transport.uid ? found.guestDoc : null;
        guestState = {
          kind: 'mc-room',
          room: code,
          role: 'guest',
          v: 1,
          updatedAt: Date.now(),
          guestUid: transport.uid,
          guestName: ctrl.displayName(),
          joined: true,
          deck: cleanJSON((guestData && guestData.deck) || (prev && prev.deck) || null),
          deckSummary: cleanJSON((guestData && guestData.deckSummary) || (prev && prev.deckSummary) || null),
          cameo: (guestData && guestData.cameo !== undefined) ? guestData.cameo : (prev ? prev.cameo : null),
          ready: prev ? !!prev.ready : false,
          answer: prev && prev.answer ? cleanJSON(prev.answer) : null,
          showAckId: prev && prev.showAckId ? prev.showAckId : 0
        };
        ctrl.guestDoc = guestState;
        try {
          await transport.writeDoc(guestDocId(code), guestState);
        } catch (err) {
          ctrl._unsubscribe();
          ctrl.code = null;
          ctrl.role = null;
          guestState = null;
          ctrl.error = formatError(err);
          ctrl.emit();
          throw new Error(ctrl.error);
        }
        ctrl.saveSession(code, 'guest');
        ctrl.emit();
        return found;
      },

      async rejoinRoom(rawCode, role, fallbackData) {
        await ctrl.init();
        const code = normCode(rawCode);
        if (code.length !== 4) throw new Error('유효하지 않은 방 코드입니다');
        if (role === 'guest') return ctrl.joinRoom(code, fallbackData);

        await ctrl.leaveRoom({ closeIfHost: false, silent: true });
        ctrl.code = code;
        ctrl.role = 'host';
        ctrl.error = '';
        ctrl.hostDoc = null;
        ctrl.guestDoc = null;

        let settled = false;
        let timeoutId = null;
        const found = await new Promise((resolve, reject) => {
          timeoutId = setTimeout(() => {
            if (settled) return;
            settled = true;
            ctrl._unsubscribe();
            ctrl.code = null; ctrl.role = null;
            reject(new Error('이전 방을 찾을 수 없습니다'));
          }, 6000);
          unsub = transport.watchRoom(code, docs => {
            ctrl._handleDocs(docs);
            if (settled) return;
            const h = docs.find(d => d.data && d.data.role === 'host');
            if (!h) return;
            const hd = h.data;
            if (hd.status === 'closed') {
              settled = true; clearTimeout(timeoutId); ctrl._unsubscribe();
              ctrl.code = null; ctrl.role = null;
              reject(new Error('이미 종료된 방입니다'));
              return;
            }
            if (hd.hostUid && hd.hostUid !== transport.uid && transport.mode === 'cloud') {
              settled = true; clearTimeout(timeoutId); ctrl._unsubscribe();
              ctrl.code = null; ctrl.role = null;
              reject(new Error('방장 계정과 일치하지 않습니다'));
              return;
            }
            settled = true; clearTimeout(timeoutId);
            const g = docs.find(d => d.data && d.data.role === 'guest');
            resolve({ hostDoc: hd, guestDoc: g ? g.data : null });
          }, err => {
            const msg = formatError(err);
            ctrl.error = msg;
            if (!settled) {
              settled = true; clearTimeout(timeoutId); ctrl._unsubscribe();
              ctrl.code = null; ctrl.role = null;
              reject(new Error(msg));
            } else {
              ctrl.emit();
            }
          });
        });

        hostState = cleanJSON(found.hostDoc);
        ctrl.seq = hostState.seq || 1;
        ctrl.saveSession(code, 'host');
        ctrl.emit();
        return found;
      },

      async updateHostLobby(lobbyData) {
        if (!ctrl.code || ctrl.role !== 'host' || !hostState) return;
        hostState.lobby = cleanJSON(lobbyData);
        hostState.hostName = ctrl.displayName();
        hostState.status = 'lobby';
        hostState.updatedAt = Date.now();
        hostState.seq = ++ctrl.seq;
        ctrl.hostDoc = hostState;
        ctrl.emit();
        try {
          await transport.writeDoc(hostDocId(ctrl.code), hostState);
        } catch (err) {
          ctrl.error = formatError(err);
          ctrl.emit();
        }
      },

      async updateGuestLobby(patch) {
        if (!ctrl.code || ctrl.role !== 'guest' || !guestState) return;
        if (patch.deck !== undefined) guestState.deck = cleanJSON(patch.deck);
        if (patch.deckSummary !== undefined) guestState.deckSummary = cleanJSON(patch.deckSummary);
        if (patch.cameo !== undefined) guestState.cameo = patch.cameo;
        if (patch.ready !== undefined) guestState.ready = !!patch.ready;
        guestState.guestName = ctrl.displayName();
        guestState.joined = true;
        guestState.updatedAt = Date.now();
        ctrl.guestDoc = guestState;
        ctrl.emit();
        try {
          await transport.writeDoc(guestDocId(ctrl.code), guestState);
        } catch (err) {
          ctrl.error = formatError(err);
          ctrl.emit();
        }
      },

      async publishHostState(payload) {
        if (!ctrl.code || ctrl.role !== 'host' || !hostState) return;
        const st = cleanJSON(payload.state);
        if (st && Array.isArray(st.log) && st.log.length > 60) st.log = st.log.slice(-60);
        hostState.status = payload.status || 'playing';
        hostState.gameId = payload.gameId || hostState.gameId;
        hostState.state = st;
        hostState.pendingAsk = cleanJSON(payload.pendingAsk || null);
        hostState.showEv = cleanJSON(payload.showEv || null);
        hostState.updatedAt = Date.now();
        hostState.seq = ++ctrl.seq;
        ctrl.hostDoc = hostState;
        try {
          await transport.writeDoc(hostDocId(ctrl.code), hostState);
        } catch (err) {
          ctrl.error = formatError(err);
          ctrl.emit();
        }
      },

      waitForGuestAnswer(gameId, askId, onAnswer) {
        waiter = { gameId, askId, cb: onAnswer };
        if (ctrl.guestDoc && ctrl.guestDoc.joined !== false && ctrl.guestDoc.answer) {
          const a = ctrl.guestDoc.answer;
          if (a.gameId === gameId && a.askId === askId) {
            const cb = waiter.cb;
            waiter = null;
            Promise.resolve().then(() => cb(a.value));
          }
        }
      },

      cancelWaiter() {
        waiter = null;
      },

      async sendGuestAnswer(gameId, askId, value) {
        if (!ctrl.code || ctrl.role !== 'guest' || !guestState) return;
        guestState.answer = { gameId, askId, value: cleanJSON(value) };
        guestState.updatedAt = Date.now();
        ctrl.guestDoc = guestState;
        try {
          await transport.writeDoc(guestDocId(ctrl.code), guestState);
        } catch (err) {
          ctrl.error = formatError(err);
          ctrl.emit();
        }
      },

      async leaveRoom(opts) {
        const o = opts || {};
        const code = ctrl.code;
        const role = ctrl.role;
        waiter = null;
        ctrl._unsubscribe();
        if (code && transport) {
          try {
            if (role === 'host' && o.closeIfHost && hostState) {
              const hasGuest = !!(ctrl.guestDoc && ctrl.guestDoc.joined);
              if (!hasGuest) {
                await transport.deleteDoc(hostDocId(code)).catch(() => {});
                await transport.deleteDoc(guestDocId(code)).catch(() => {});
              } else {
                const tr = transport;
                hostState.status = 'closed';
                hostState.state = null;
                hostState.pendingAsk = null;
                hostState.showEv = null;
                hostState.updatedAt = Date.now();
                hostState.seq = ++ctrl.seq;
                await tr.writeDoc(hostDocId(code), hostState);
                setTimeout(() => {
                  tr.deleteDoc(hostDocId(code)).catch(() => {});
                  tr.deleteDoc(guestDocId(code)).catch(() => {});
                }, 5000);
              }
            } else if (role === 'guest' && guestState) {
              if (o.deleteGuestDoc || (ctrl.hostDoc && ctrl.hostDoc.status === 'closed')) {
                await transport.deleteDoc(guestDocId(code)).catch(() => {});
              } else {
                guestState.joined = false;
                guestState.ready = false;
                guestState.updatedAt = Date.now();
                await transport.writeDoc(guestDocId(code), guestState);
              }
            }
          } catch (e) { /* ignore errors while leaving */ }
        }
        ctrl.code = null;
        ctrl.role = null;
        ctrl.hostDoc = null;
        ctrl.guestDoc = null;
        ctrl.error = '';
        hostState = null;
        guestState = null;
        if (!o.keepSession) ctrl.clearSession();
        if (!o.silent) ctrl.emit();
      }
    };

    return ctrl;
  }

  function hostDocId(code) { return `mc-room-${code}-host`; }
  function guestDocId(code) { return `mc-room-${code}-guest`; }

  const Online = createController();
  Online.createController = createController;
  Online.sanitizeQuestion = sanitizeQuestion;
  Online.sanitizeShow = sanitizeShow;
  Online.cleanJSON = cleanJSON;
  Online.normCode = normCode;
  MC.Online = Online;
})(typeof window !== 'undefined' ? window : globalThis);
