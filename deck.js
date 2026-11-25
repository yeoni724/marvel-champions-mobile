/* Deck model (same JSON shape as the community build's deck editor) and deck storage. */
(function () {
  'use strict';
  const MC = window.MC;
  MC.ASPECTS = {
    Justice: { ko: '정의', css: 'y' }, Aggression: { ko: '용맹', css: 'r' },
    Leadership: { ko: '통솔', css: 'b' }, Protection: { ko: '수호', css: 'g' }, "'Pool": { ko: '풀', css: 'p' }, Basic: { ko: '기본', css: 'n' }
  };
  const ASPECT_KEYS = ['Justice', 'Aggression', 'Leadership', 'Protection', "'Pool"];
  const CORE_ASPECTS = ['Justice', 'Aggression', 'Leadership', 'Protection'];
  const TYPE_ORDER = { ally: 0, event: 1, support: 2, upgrade: 3, pside: 4, resource: 5 };
  const lower = s => (s || '').toLowerCase();
  const asAspectKey = a => ASPECT_KEYS.find(k => lower(k) === lower(a)) || '';

  const Deck = {
    ASPECT_KEYS,
    heroKeyOf(deck) {
      const first = ((deck.hero && deck.hero[0]) || '').split(',')[0];
      return Object.keys(MC.heroes).find(k => MC.heroes[k].hero === first || MC.heroes[k].alter === first) || null;
    },
    starter(heroKey) {
      const H = MC.heroes[heroKey];
      return {
        id: 'starter-' + heroKey, starter: true, name: `${H.name} 스타터 (${MC.ASPECTS[H.starterAspect].ko}${H.dual ? '·' + MC.ASPECTS[H.starterAspect2].ko : ''})`, version: '0.5.8',
        hero: [H.hero + ',' + H.alter], hero_deck: H.heroDeck.slice(), obligations: [H.obligation], nemesis_set: H.nemesis.slice(),
        set_aside: [], player_deck: H.starter.slice(), side_deck: [], aspect: lower(H.starterAspect), aspect2: H.dual ? lower(H.starterAspect2) : ''
      };
    },
    blank(heroKey, aspect) {
      const d = Deck.starter(heroKey);
      d.id = Deck.newId(); d.starter = false; d.name = `${MC.heroes[heroKey].name} · ${MC.ASPECTS[aspect].ko}`; d.aspect = lower(aspect); d.player_deck = [];
      if (d.aspect2 === d.aspect) d.aspect2 = lower(ASPECT_KEYS.find(k => lower(k) !== d.aspect));
      return d;
    },
    copy(deck, name) { const d = JSON.parse(JSON.stringify(deck)); d.id = Deck.newId(); d.starter = false; if (name) d.name = name; return d; },
    newId() { return 'd' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36); },
    aspectKey(deck) { return asAspectKey(deck.aspect) || 'Justice'; },
    isDual(deck) { const k = Deck.heroKeyOf(deck); return !!(k && MC.heroes[k].dual); },
    // the deck's aspects: one, or two for Spider-Woman (Double Agent)
    allAspects(deck) { const k = Deck.heroKeyOf(deck); return !!(k && MC.heroes[k].allAspects); }, // Adam Warlock (Avatar of Life)
    aspects(deck) {
      if (Deck.allAspects(deck)) return CORE_ASPECTS.slice();
      const a = Deck.aspectKey(deck); if (!Deck.isDual(deck)) return [a];
      const b = asAspectKey(deck.aspect2); return b && b !== a ? [a, b] : [a, ASPECT_KEYS.find(k => k !== a)];
    },
    // all player cards a deck can draw from, for its aspect(s) plus basic
    // Team-up cards (Swarm Tactics) only for the heroes they name
    teamUpOk(c, heroKey) {
      if (!c.teamUp || !heroKey || !MC.heroes[heroKey]) return true;
      const H = MC.heroes[heroKey], clean = id => ((MC.cards[id] || {}).en || '').replace(/^\*\s*/, '').toLowerCase();
      const names = [clean(H.hero), clean(H.alter)].filter(Boolean);
      return c.teamUp.some(entry => {
        const parts = String(entry).split('/').map(s => s.trim().toLowerCase()).filter(Boolean);
        return parts.length > 1 ? parts.every(p => names.includes(p)) : names.includes(parts[0]);
      });
    },
    // Gamora (Skilled Tactician): up to 6 Attack/Thwart events from other aspects
    offAspectOk(c, heroKey) {
      if (heroKey === 'cable' && c.type === 'pside' && ASPECT_KEYS.includes(c.cls)) return true; // Nathan Summers: player side schemes from any aspect
      if (heroKey === 'wonder_man' && c.type === 'event' && ASPECT_KEYS.includes(c.cls) && (c.res || '').includes('Y')) return true; // Simon Williams: [energy] events from any aspect
      if (heroKey === 'maria_hill' && c.type === 'support' && ASPECT_KEYS.includes(c.cls) && (c.tr || []).includes('S.H.I.E.L.D')) return true; // Maria Hill: S.H.I.E.L.D. supports from other aspects (3 different)
      if (heroKey === 'cyclops' && c.type === 'ally' && ASPECT_KEYS.includes(c.cls) && (c.tr || []).includes('X-MEN')) return true; // Scott Summers: X-Men allies from any aspect
      return heroKey === 'gamora' && c.type === 'event' && ASPECT_KEYS.includes(c.cls) && ((c.tr || []).includes('ATTACK') || (c.tr || []).includes('THWART'));
    },
    pool(aspect, heroKey) {
      const al = Array.isArray(aspect) ? aspect : [aspect];
      return Object.values(MC.cards).filter(c => !c.enc && c.cls && !c.linked && (al.includes(c.cls) || c.cls === 'Basic' || Deck.offAspectOk(c, heroKey)) && Deck.teamUpOk(c, heroKey))
        .sort((a, b) => (a.cls === 'Basic') - (b.cls === 'Basic') || al.indexOf(a.cls) - al.indexOf(b.cls) || ((TYPE_ORDER[a.type] ?? 9) - (TYPE_ORDER[b.type] ?? 9)) || (a.cost || 0) - (b.cost || 0) || a.id.localeCompare(b.id));
    },
    counts(list) { const m = {}; (list || []).forEach(id => { m[id] = (m[id] || 0) + 1; }); return m; },
    limit(id) { const c = MC.cards[id]; return c && c.maxDeck ? c.maxDeck : 3; },
    validate(deck) {
      const warn = [];
      const heroN = (deck.hero_deck || []).length, playerN = (deck.player_deck || []).length, total = heroN + playerN;
      if (total < 40) warn.push(`덱이 ${total}장입니다. 최소 40장이 필요합니다 (${40 - total}장 부족)`);
      if (total > 50) warn.push(`덱이 ${total}장입니다. 최대 50장입니다 (${total - 50}장 초과)`);
      const al = Deck.aspects(deck);
      const cnt = Deck.counts(deck.player_deck);
      const unknown = [], over = [], offAspect = [], per = {}; let extra = 0, mariaOff = 0;
      for (const id in cnt) {
        const c = MC.cards[id];
        if (!c) { unknown.push(id); continue; }
        if (cnt[id] > Deck.limit(id)) over.push(`${c.name} ${cnt[id]}/${Deck.limit(id)}`);
        if (c.cls && c.cls !== 'Basic' && !al.includes(c.cls) && c.cls !== 'Hero') { if (Deck.offAspectOk(c, Deck.heroKeyOf(deck))) { if (Deck.heroKeyOf(deck) === 'gamora') extra += cnt[id]; if (Deck.heroKeyOf(deck) === 'maria_hill') mariaOff++; } else offAspect.push(c.name); }
        if (!Deck.teamUpOk(c, Deck.heroKeyOf(deck))) offAspect.push(c.name);
        if (al.includes(c.cls)) per[c.cls] = (per[c.cls] || 0) + cnt[id];
      }
      if (over.length) warn.push(`장수 제한 초과: ${over.join(', ')}`);
      if (mariaOff > 3) warn.push(`마리아 힐: 다른 성향의 [실드] 지원은 3종류까지입니다 (${mariaOff}종류)`);
      if (extra > 6) warn.push(`능숙한 전술가: 다른 성향의 공격·저지 이벤트는 6장까지입니다 (${extra}장)`);
      if (offAspect.length) warn.push(`${al.map(a => MC.ASPECTS[a].ko).join('·')} 성향이 아닌 카드: ${offAspect.join(', ')}`);
      if (Deck.isDual(deck) && (per[al[0]] || 0) !== (per[al[1]] || 0)) warn.push(`이중 첩자: 두 성향 카드 수가 같아야 합니다 (${al.map(a => `${MC.ASPECTS[a].ko} ${per[a] || 0}`).join(' / ')})`);
      if (Deck.allAspects(deck) && new Set(al.map(a => per[a] || 0)).size > 1) warn.push(`생명의 화신: 네 성향 카드 수가 같아야 합니다 (${al.map(a => `${MC.ASPECTS[a].ko} ${per[a] || 0}`).join(' / ')})`);
      if (Deck.allAspects(deck)) { const dup = Object.keys(cnt).filter(id => cnt[id] > 1 && MC.cards[id] && MC.cards[id].cls !== 'Hero'); if (dup.length) warn.push(`생명의 화신: 같은 카드는 1장까지입니다 (${dup.map(id => MC.cards[id].name).join(', ')})`); }
      if (unknown.length) warn.push(`아직 지원하지 않는 카드 ${unknown.length}종은 게임에서 빠집니다: ${unknown.join(', ')}`);
      return { total, heroN, playerN, warn, ok: !warn.length };
    },
    stats(deck) {
      const curve = [0, 0, 0, 0, 0], types = {}, res = { R: 0, B: 0, Y: 0, G: 0 };
      for (const id of (deck.hero_deck || []).concat(deck.player_deck || [])) {
        const c = MC.cards[id]; if (!c) continue;
        types[c.type] = (types[c.type] || 0) + 1;
        if (c.type !== 'resource' && c.cost != null) curve[Math.min(4, c.cost)]++;
        (c.res || '').split('').forEach(l => { if (res[l] != null) res[l]++; });
      }
      return { curve, types, res };
    },
    // accepts this app's format, the community build's deck JSON, or a MarvelCDB deck export
    normalize(json) {
      let o = typeof json === 'string' ? JSON.parse(json) : json;
      if (!o || typeof o !== 'object') throw new Error('덱 JSON이 아닙니다');
      if (o.slots && (o.investigator_code || o.hero_code)) {
        const heroId = String(o.hero_code || o.investigator_code);
        const key = Object.keys(MC.heroes).find(k => MC.heroes[k].hero === heroId || MC.heroes[k].hero.replace(/a$/, '') === heroId.replace(/a$/, ''));
        if (!key) throw new Error(`아직 지원하지 않는 히어로입니다 (${heroId})`);
        const d = Deck.starter(key); d.id = Deck.newId(); d.starter = false; d.name = o.name || d.name;
        let meta = o.meta; try { if (typeof meta === 'string') meta = JSON.parse(meta); } catch (e) { meta = {}; }
        d.aspect = lower((meta && meta.aspect) || d.aspect);
        const sig = new Set(d.hero_deck);
        d.player_deck = [];
        const H = MC.heroes[key];
        for (const id in o.slots) { if (sig.has(id) || id === H.hero || id === H.alter || id.replace(/[ab]$/, '') === H.hero.replace(/[ab]$/, '') || (MC.cards[id] && MC.cards[id].cls === 'Hero')) continue; for (let i = 0; i < o.slots[id]; i++) d.player_deck.push(id); }
        return d;
      }
      if (!Array.isArray(o.hero) || !o.hero.length) throw new Error('hero 항목이 없는 덱입니다');
      const key = Deck.heroKeyOf(o);
      if (!key) throw new Error(`아직 지원하지 않는 히어로입니다 (${o.hero[0]})`);
      const base = Deck.starter(key);
      const d = Object.assign({}, base, o);
      d.id = o.id && !String(o.id).startsWith('starter-') ? o.id : Deck.newId();
      d.starter = false;
      d.name = o.name || base.name;
      d.hero_deck = (o.hero_deck && o.hero_deck.length) ? o.hero_deck : base.hero_deck;
      d.player_deck = o.player_deck || []; d.side_deck = o.side_deck || []; d.set_aside = o.set_aside || [];
      if (!asAspectKey(d.aspect)) {
        const tally = {}; d.player_deck.forEach(id => { const c = MC.cards[id]; if (c && ASPECT_KEYS.includes(c.cls)) tally[c.cls] = (tally[c.cls] || 0) + 1; });
        d.aspect = lower(Object.keys(tally).sort((a, b) => tally[b] - tally[a])[0] || 'Justice');
      }
      return d;
    },
    exportJSON(deck) {
      const o = Object.assign({}, deck); delete o.starter; delete o.id;
      return JSON.stringify(o, null, 2);
    }
  };
  MC.Deck = Deck;

  // ------------------------------------------------------------------ storage
  // Decks live in this artifact's per-person store when the viewer offers it (syncs across
  // the person's devices); otherwise, or until it answers, in this browser's localStorage.
  const LKEY = 'mc-decks-v1';
  const Store = {
    decks: [], mode: 'local', status: '', listeners: [], db: null, col: null, unsub: null, userDocs: {},
    onChange(f) { this.listeners.push(f); },
    emit() { this.listeners.forEach(f => f()); },
    loadLocal() { try { const s = localStorage.getItem(LKEY); return s ? JSON.parse(s) : []; } catch (e) { return []; } },
    saveLocal() { try { localStorage.setItem(LKEY, JSON.stringify(this.decks)); } catch (e) { /* storage unavailable */ } },
    registerUserDoc(docId, kind, opts) {
      const cfg = Object.assign({ docId, kind }, opts || {});
      this.userDocs[kind] = cfg;
      if (this.mode === 'cloud' && this.col && !cfg.unsub) this._subscribeUserDoc(kind);
    },
    _subscribeUserDoc(kind) {
      const cfg = this.userDocs[kind];
      if (!cfg || !this.col) return;
      let first = true;
      cfg.unsub = this.col.where('kind', '==', kind).onSnapshot(async snap => {
        const doc = snap.docs.find(d => d.id === cfg.docId) || snap.docs[0];
        const remote = doc && doc.data() ? doc.data().data : null;
        if (first && !snap.metadata.fromCache) {
          first = false;
          const local = cfg.localGet ? cfg.localGet() : null;
          if (remote != null) {
            const merged = cfg.merge ? cfg.merge(local, remote) : remote;
            if (cfg.localSet) cfg.localSet(merged);
            if (cfg.onRemote) cfg.onRemote(merged);
            if (JSON.stringify(merged) !== JSON.stringify(remote)) {
              try { await this.col.doc(cfg.docId).set({ kind, updated: Date.now(), data: merged }); } catch (e) { /* ignore */ }
            }
          } else if (local != null && JSON.stringify(local) !== '{}' && JSON.stringify(local) !== '[]') {
            try { await this.col.doc(cfg.docId).set({ kind, updated: Date.now(), data: local }); } catch (e) { /* ignore */ }
          }
          return;
        }
        if (remote != null && !first) {
          const merged = cfg.merge ? cfg.merge(cfg.localGet ? cfg.localGet() : null, remote) : remote;
          if (cfg.localSet) cfg.localSet(merged);
          if (cfg.onRemote) cfg.onRemote(merged);
        }
      }, () => { /* ignore user doc sync error */ });
    },
    async saveUserDoc(docId, kind, data) {
      if (this.mode !== 'cloud' || !this.col) return;
      try { await this.col.doc(docId).set({ kind, updated: Date.now(), data }); } catch (e) { /* keep local copy */ }
    },
    async init() {
      this.decks = this.loadLocal();
      this.status = '이 기기에 저장';
      this.emit();
      if (!window.claude || !window.claude.use) return;
      let db = null, user = null;
      try { [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]); } catch (e) { return; }
      const uid = user ? await user.id() : null;
      if (!db || !uid) return;
      this.db = db;
      this.col = db.collection('data/users/' + uid);
      this.status = 'Claude 계정과 동기화 중…';
      this.emit();
      const timer = setTimeout(() => { if (this.mode !== 'cloud') { this.status = '계정 저장소에 연결하지 못해 이 기기에 저장합니다'; this.emit(); } }, 10000);
      let first = true;
      this.unsub = this.col.where('kind', '==', 'deck').onSnapshot(async snap => {
        const remote = snap.docs.map(d => d.data().deck).filter(Boolean);
        if (first && !snap.metadata.fromCache) {
          first = false; clearTimeout(timer);
          this.mode = 'cloud'; this.status = 'Claude 계정에 저장 (기기 간 동기화)';
          // move decks made on this device before the store answered
          const have = new Set(remote.map(d => d.id));
          const local = this.decks.filter(d => !have.has(d.id));
          for (const d of local) { try { await this.col.doc('deck-' + d.id).set({ kind: 'deck', updated: Date.now(), deck: d }); remote.push(d); } catch (e) { /* keep local copy */ } }
          for (const k of Object.keys(this.userDocs)) if (!this.userDocs[k].unsub) this._subscribeUserDoc(k);
        }
        if (this.mode === 'cloud') { this.decks = remote.sort((a, b) => (b.updated || 0) - (a.updated || 0)); this.saveLocal(); this.emit(); }
      }, err => { clearTimeout(timer); this.mode = 'local'; this.status = '계정 저장소를 쓸 수 없어 이 기기에 저장합니다'; this.emit(); });
    },
    async save(deck) {
      deck.updated = Date.now();
      const i = this.decks.findIndex(d => d.id === deck.id);
      if (i >= 0) this.decks[i] = deck; else this.decks.unshift(deck);
      this.saveLocal(); this.emit();
      if (this.mode === 'cloud') {
        try { await this.col.doc('deck-' + deck.id).set({ kind: 'deck', updated: deck.updated, deck }); }
        catch (e) { this.status = e && e.code === 'quota_exceeded' ? '저장 공간이 가득 찼습니다. 덱을 지워 주세요' : '계정 저장에 실패해 이 기기에만 저장했습니다'; this.emit(); }
      }
    },
    async remove(id) {
      this.decks = this.decks.filter(d => d.id !== id);
      this.saveLocal(); this.emit();
      if (this.mode === 'cloud') { try { await this.col.doc('deck-' + id).delete(); } catch (e) { /* ignore */ } }
    },
    all() { return Object.keys(MC.heroes).map(k => Deck.starter(k)).concat(this.decks); },
    get(id) { return this.all().find(d => d.id === id) || null; }
  };
  MC.DeckStore = Store;
})();
