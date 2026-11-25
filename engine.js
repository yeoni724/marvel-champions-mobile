/* Marvel Champions rules engine (mobile port).
   Rules flow follows the community build's Python engine: player phase actions,
   villain phase (threat, activations with boost, encounter cards), interrupts and
   responses offered at timing windows. Card behaviour lives in packs/*.js scripts. */
(function (root) {
  'use strict';
  const MC = root.MC = root.MC || {};
  MC.cards = MC.cards || {};
  MC.scripts = MC.scripts || {};
  MC.CAMPAIGNS = MC.CAMPAIGNS || {}; // campaign rules (filled by campaigns.js and the pack scripts)
  MC.heroes = MC.heroes || {};
  MC.scenarios = MC.scenarios || {};
  MC.registerPack = function (pack) {
    (pack.cards || []).forEach(c => { MC.cards[c.id] = c; });
    Object.assign(MC.scripts, pack.scripts || {});
    Object.assign(MC.heroes, pack.heroes || {});
    for (const k in (pack.scenarios || {})) MC.scenarios[k] = Object.assign(MC.scenarios[k] || {}, pack.scenarios[k]);
    MC.sets = Object.assign(MC.sets || {}, pack.sets || {});
    MC.modulars = Object.assign(MC.modulars || {}, pack.modulars || {});
  };
  // a player card turned face down as an Ultron drone minion (base 1/1/1 from the Ultron Drones environment)
  MC.cards.DRONE = { id: 'DRONE', name: '드론', type: 'minion', enc: true, atk: 1, sch: 1, hp: 1, tr: ['DRONE'], traits: ['드론'], noImg: true,
    text: '뒷면으로 놓인 플레이어 카드입니다. 울트론 드론 환경 카드 때문에 기본 음모 1, 공격 1, 체력 1을 가집니다. 격파되면 주인의 버림 더미로 갑니다.' };
  MC.registerScripts = function (scripts) { Object.assign(MC.scripts, scripts); };
  // "treat attached ally as a [Trait] minion with a blank text box; its SCH equals its printed THW" — id AM_<ally id>_<TRAIT>
  MC.synth = function (id) {
    const ca = /^CA\d?_(.+)$/.exec(id || ''); const caN = ca ? +(/^CA(\d?)_/.exec(id)[1] || 1) : 1; // Mind Control: a minion treated as a [Controlled] ally with a blank text box
    if (ca && MC.cards[ca[1]]) { const m0 = MC.cards[ca[1]]; MC.cards[id] = { id, name: m0.name, en: m0.en, type: 'ally', enc: true, unique: m0.unique, atk: m0.atk || 0, thw: m0.sch || 0, hp: m0.hp || 1, atkStar: true, thwStar: true, atkCons: caN, thwCons: caN, tr: ['CONTROLLED'], traits: ['조종됨'], link: ca[1], asAlly: ca[1], text: '조종하는 동료로 취급하는 하수인입니다 (글상자 없음). 저지력은 원래 음모력과 같고, 저지·공격 후 후속 피해 ' + caN + '을(를) 받습니다.' }; MC.scripts[id] = {}; if (MC.catalog && MC.catalog.links) MC.catalog.links[id] = ca[1]; return MC.cards[id]; }
    const rf = /^RF_(.+)$/.exec(id || ''); const RH = rf && MC.heroes && MC.heroes[rf[1]]; // Reluctant Foe: a hero treated as an Elite minion (SCH = printed THW)
    if (RH && RH.foe) { const f = RH.foe; MC.cards[id] = { id, name: RH.name, en: f.en, type: 'minion', enc: true, unique: true, hp: f.hp, atk: f.atk, sch: f.thw, tr: f.tr.concat('ELITE'), traits: f.traits.concat('간부'), villainous: 1, link: RH.hero,
        text: '내키지 않는 적: 인쇄된 저지와 같은 음모를 가진 [[간부]] 하수인으로 취급하는 히어로입니다. 악당. <b>격파될 때</b>: 이 히어로와 내키지 않는 적을 게임에서 제거합니다.' };
      MC.scripts[id] = { removeOnLeave: true }; if (MC.catalog && MC.catalog.links) MC.catalog.links[id] = RH.hero; return MC.cards[id]; }
    const m = /^AM_(.+)_([A-Z]+)$/.exec(id || ''); if (!m || !MC.cards[m[1]]) return undefined;
    const a = MC.cards[m[1]], ko = { UNDEAD: '언데드', ENTHRALLED: '매혹됨', REGRESSED: '퇴행함', POOL: '풀', INFLUENCED: '조종당함', DECEIVED: '기만당함' }[m[2]] || m[2];
    MC.cards[id] = { id, name: a.name, en: a.en, type: 'minion', enc: false, unique: a.unique, atk: a.atk, sch: a.thw, hp: a.hp, tr: [m[2]], traits: [ko], link: m[1], asMinion: m[1],
      text: `${ko} 하수인으로 취급하는 동료입니다 (글상자 없음). 음모력은 원래 저지력과 같습니다.` };
    MC.scripts[id] = {}; if (MC.catalog && MC.catalog.links) MC.catalog.links[id] = m[1];
    return MC.cards[id];
  };

  // ---------------------------------------------------------------- packs: catalog + on-demand loading
  // packs/index.js (always loaded) describes every pack; card data (packs/<id>.data.js) and card scripts
  // (packs/<id>.js) are fetched only when a screen or a game needs them.
  MC.catalog = { packs: {}, prefix: {}, idPack: {} };
  MC.loaded = {};
  MC.registerCatalog = function (cat) {
    MC.catalog = cat;
    Object.assign(MC.heroes, cat.heroes || {});
    for (const k in (cat.scenarios || {})) MC.scenarios[k] = Object.assign(MC.scenarios[k] || {}, cat.scenarios[k]);
    MC.sets = Object.assign(MC.sets || {}, cat.sets || {});
    MC.modulars = Object.assign(MC.modulars || {}, cat.modulars || {});
  };
  // a game's modular choice is one key or several joined with '+' (Red Skull uses two, Crossbones three)
  MC.modsOf = function (m) { return String(m || '').split('+').filter(k => k && MC.modulars[k]); };
  MC.packOf = function (id) {
    if (!id || id === 'DRONE') return null;
    const c = MC.catalog; return c.idPack[id] || c.prefix[String(id).slice(0, 2)] || null;
  };
  MC.packsFor = function (ids) {
    const links = MC.catalog.links || {}, all = ids.concat(ids.map(i => links[i]).filter(Boolean));
    return [...new Set(all.map(MC.packOf).filter(p => p && MC.catalog.packs[p]))];
  };
  MC.allPacks = function () { return Object.keys(MC.catalog.packs); };
  MC.isLoaded = function (packs, withScripts) {
    return packs.every(pk => { const st = MC.loaded[pk] || {}, P = MC.catalog.packs[pk] || {}; return st.data && (!withScripts || !P.scripts || st.scripts); });
  };
  // browsers load files with <script>; the headless tests replace this with a file reader
  MC.loadScript = MC.loadScript || function (src) {
    return new Promise((res, rej) => {
      const el = document.createElement('script'); el.src = src; el.async = false;
      el.onload = () => res(); el.onerror = () => { el.remove(); rej(new Error(`${src} 파일을 불러오지 못했습니다`)); };
      document.head.appendChild(el);
    });
  };
  const inflight = {};
  const loadOnce = (src, done) => inflight[src] || (inflight[src] = Promise.resolve(MC.loadScript(src)).then(done, e => { delete inflight[src]; throw e; }));
  MC.loadPacks = function (packs, withScripts) {
    return Promise.all(packs.map(pk => {
      const P = MC.catalog.packs[pk]; if (!P) return null;
      const st = MC.loaded[pk] = MC.loaded[pk] || {};
      const data = st.data ? Promise.resolve() : loadOnce(P.data, () => { st.data = true; });
      if (!withScripts || !P.scripts || st.scripts) return data;
      return data.then(() => loadOnce(P.scripts, () => { st.scripts = true; })); // scripts may look at card data
    }));
  };
  // every card a game will use: the deck, the hero's obligation and nemesis set, the scenario, its encounter sets
  // Standard II / Expert II (The Hood box) replace the core standard / expert sets when chosen
  MC.stdRaw = o => (o.std2 === 3 && MC.sets.standard_iii) || (o.std2 && o.std2 !== 3 && MC.sets.standard_ii) || MC.sets.standard || [];
  MC.stdSet = o => MC.stdRaw(o).flatMap(x => x.split(','));
  MC.expSet = o => ((o.exp2 && MC.sets.expert_ii) || MC.sets.expert || []).slice();
  // Hell's Kitchen missions: the mission (main scheme, its set, modulars) is played against a chosen UNDERLING villain
  MC.scenFor = function (key, ul) {
    const M = MC.scenarios[key] || {};
    if (M.base) { const B = MC.scenFor(M.base, ul); return Object.assign({}, B, M.over || {}, { name: M.name, title: M.title, pack: M.pack, base: M.base, challenge: M.challenge, allow: M.allow, rule: M.rule, defaultModular: M.defaultModular, modCount: M.modCount, extraIds: (B.extraIds || []).concat(M.extraIds || []) }); } // challenges: the base scenario plus the challenge's changes
    if (!M.underlings) return M;
    const uk = M.underlings.includes(ul) ? ul : M.underlings[0], U = MC.scenarios[uk] || {};
    return Object.assign({}, U, M, { villains: U.villains || [], villainsExpert: U.villainsExpert || [], stages: U.stages || [], stagesExpert: U.stagesExpert || [],
      setAside: (M.setAside || []).concat(U.setAside || []), encounter: (M.encounter || []).concat(U.encounter || []), flip: Object.assign({}, U.flip || {}, M.flip || {}),
      extraIds: (M.extraIds || []).concat(U.extraIds || []), sets: (M.sets || []).concat(U.sets || []), underling: uk, name: `${M.name} · ${U.name}` });
  };
  MC.challengeWarn = function (S, heroKey, deck) { // a challenge's hero rules (the original leaves them to the players): a warning, not a block
    const A = S && S.allow; if (!A) return null; const H = MC.heroes[heroKey]; if (!H || !MC.cards[H.hero]) return null;
    const faces = [H.hero, H.alter].concat(H.faces || []).map(id => MC.cards[id]).filter(Boolean), trs = new Set(faces.flatMap(c => c.tr || []));
    const en = faces.map(c => (c.en || '').replace(/^\*\s*/, ''));
    const byName = A.names && A.names.some(n => en.includes(n)), byTr = A.traits && A.traits.some(t => trs.has(t)), byTitle = A.title && en.some(n => n.includes(A.title));
    let ok = (!A.names && !A.traits && !A.title) || byName || byTr || byTitle;
    if (!ok && A.canGain) ok = (H.heroDeck || []).some(id => ((MC.cards[id] || {}).text || '').includes(A.canGain)); // "has or can gain" the trait
    if (ok && A.alterTraits) ok = A.alterTraits.some(t => ((MC.cards[H.alter] || {}).tr || []).includes(t));
    if (ok && A.aspect && deck && MC.Deck) ok = MC.Deck.aspects(deck).includes(A.aspect);
    return ok ? null : A.msg;
  };
  MC.normPlayers = function (opts) {
    if (opts && Array.isArray(opts.players) && opts.players.length) return opts.players;
    return [{ hero: opts && opts.hero, deck: opts && opts.deck, cameo: opts && opts.cameo }];
  };
  MC.idsForGame = function (opts) {
    const S = MC.scenFor(opts.scenario, opts.underling);
    const ids = [S.challenge];
    for (const po of MC.normPlayers(opts)) {
      const H = MC.heroes[po.hero] || {}, d = po.deck || {};
      ids.push(H.hero, H.alter, H.obligation, ...(H.nemesis || []), ...(d.hero_deck || H.heroDeck || []), ...(d.player_deck || (d.hero_deck ? [] : H.starter || [])), ...(H.faces || []));
      if (po.cameo) ids.push(po.cameo); // Cameo: the identity-specific ally picked from the collection
    }
    ids.push(...(opts.expert ? S.villainsExpert || [] : S.villains || []), ...(S.main || []).flat(), ...(S.setAside || []), ...(S.encounter || []));
    if (!S.noStandard) ids.push(...MC.stdSet(opts)); if (opts.expert) ids.push(...MC.expSet(opts));
    for (const k of MC.modsOf(opts.modular || S.defaultModular)) ids.push(...MC.modulars[k].cards);
    for (const k of (S.sets || [])) ids.push(...(MC.sets[k] || []));
    ids.push(...Object.keys(S.flip || {}), ...(S.extraIds || []), ...(S.mainOptions || []).flat(2));
    for (const m of (S.crew || [])) ids.push(opts.expert ? m.b : m.a, m.side, ...m.deck);
    if (opts.campaign && opts.campaign.log) for (const v of Object.values(opts.campaign.log)) for (const x of String(v).split(/[;,]/)) if (/^\d{5}[a-z]?$/.test(x.trim())) ids.push(x.trim());
    if (opts.campaign && MC.CAMPAIGNS[opts.campaign.id] && MC.CAMPAIGNS[opts.campaign.id].ids) ids.push(...MC.CAMPAIGNS[opts.campaign.id].ids);
    return ids.filter(Boolean);
  };
  MC.idsForState = function (state) {
    const ids = Object.values(state.cards || {}).map(c => c.real || c.id);
    ((state.e && state.e.mainStages) || []).forEach(p => ids.push(...[].concat(p).filter(Boolean)));
    const S = MC.scenFor((state.scen || {}).key, (state.scen || {}).underling); ids.push(...(S.extraIds || []));
    return ids;
  };

  const NOSCRIPT = Object.freeze({});
  const RES_KO = { R: '물리', B: '정신', Y: '에너지', G: '와일드' };
  // Korean particles: turns 이(가), 을(를), 은(는), 과(와), (으)로 into the right form for the preceding word.
  MC.josa = function (str) {
    return String(str).replace(/(.)(이\(가\)|을\(를\)|은\(는\)|과\(와\)|\(으\)로)/g, (m, ch, p) => {
      const code = ch.charCodeAt(0); let has = null, rieul = false;
      if (code >= 0xAC00 && code <= 0xD7A3) { const j = (code - 0xAC00) % 28; has = j > 0; rieul = j === 8; }
      else if (/[0-9]/.test(ch)) { has = '013678'.includes(ch); rieul = '178'.includes(ch); }
      if (has === null) return m;
      const pick = { '이(가)': has ? '이' : '가', '을(를)': has ? '을' : '를', '은(는)': has ? '은' : '는', '과(와)': has ? '과' : '와', '(으)로': has && !rieul ? '으로' : '로' }[p];
      return ch + pick;
    });
  };
  MC.RES_KO = RES_KO;

  class GameOver extends Error { constructor(result, reason) { super(reason); this.result = result; this.reason = reason; } }
  MC.GameOver = GameOver;

  class Game {
    constructor(io, state) { this.io = io; this.s = state; }
    get players() { return (this.s.ps || []).length || 1; }

    // ------------------------------------------------------------ basics
    rand() {
      this.s.rng = (this.s.rng + 0x6D2B79F5) >>> 0;
      let t = this.s.rng;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(this.rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
    c(uid) { return this.s.cards[uid]; }
    d(uid) { const id = this.s.cards[uid].id; return MC.cards[id] || MC.synth(id); }
    sc(uid) {
      const id = this.s.cards[uid].id, S = MC.scripts[id] || (MC.cards[id] && MC.cards[id].link && MC.scripts[MC.cards[id].link]) || NOSCRIPT;
      const sides = this.s.e.sides, cc = this.s.cards[uid];
      const ownPi = this.controllerOf(uid), ownP = ownPi != null ? this.s.ps[ownPi] : null;
      if (ownP && uid === ownP.identity && ((cc.att.length && cc.att.some(a => (MC.scripts[this.s.cards[a].id] || NOSCRIPT).blankHost)) || (ownP.obl || []).some(x => (MC.scripts[this.s.cards[x].id] || NOSCRIPT).blankIdentity))) return NOSCRIPT;
      if (cc.blankRound && cc.blankRound === this.s.round) return NOSCRIPT;
      if (ownP && uid === ownP.identity && ownP.blankUntilVP) return NOSCRIPT; // Pestilence: identity text box blank until the next villain phase // Vivian (Champion): text box blank until the end of the round
      if (ownP && MC.cards[id] && MC.cards[id].type === 'support' && cc.zone === 'support' && (ownP.obl || []).some(x => (MC.scripts[this.s.cards[x].id] || NOSCRIPT).blankSupports)) return NOSCRIPT; // Family Matters
      if (sides.length && MC.cards[id] && !MC.cards[id].enc && MC.cards[id].type !== 'hero' && MC.cards[id].type !== 'alter') for (const x of sides) { const X = MC.scripts[this.s.cards[x].id] || NOSCRIPT, b = X.blankTrait; if (b && (!X.blankType || X.blankType === MC.cards[id].type) && [].concat(b).some(t => (MC.cards[id].tr || []).includes(t))) return NOSCRIPT; }
      return S;
    }
    nm(uid) { return uid == null ? '?' : this.d(uid).name; }
    get p() { return this.s.ps[this.s.ctx]; }
    get e() { return this.s.e; }
    idt(pi) { return this.s.ps[pi != null ? pi : this.s.ctx].identity; }
    isHero(pi) { return this.s.ps[pi != null ? pi : this.s.ctx].form === 'hero'; }
    playerName(pi) { const idx = pi != null ? pi : this.s.ctx; const p = this.s.ps[idx]; return p && p.identity ? this.nm(p.identity) : `P${idx + 1}`; }
    async withPlayer(pi, fn) {
      if (pi == null || pi < 0 || pi >= this.s.ps.length) return fn();
      const prev = this.s.ctx; this.s.ctx = pi;
      try { return await fn(); } finally { this.s.ctx = prev; }
    }
    withPlayerSync(pi, fn) {
      if (pi == null || pi < 0 || pi >= this.s.ps.length) return fn();
      const prev = this.s.ctx; this.s.ctx = pi;
      try { return fn(); } finally { this.s.ctx = prev; }
    }
    playerOrder(start) {
      const n = this.s.ps.length, s0 = start != null ? start : (this.s.first || 0), out = [];
      for (let k = 0; k < n; k++) { const i = (s0 + k) % n; if (!this.s.ps[i].eliminated) out.push(i); }
      return out;
    }
    livingPlayers() { return this.playerOrder(); }
    async forEachPlayer(fn) {
      for (const pi of this.playerOrder()) if (!this.s.ps[pi].eliminated) await this.withPlayer(pi, () => fn(pi));
    }
    async choosePlayer(title) {
      const live = this.livingPlayers();
      if (live.length <= 1) return live[0] ?? this.s.ctx;
      const pick = await this.ask({ type: 'choice', title: title || '플레이어를 고르세요', options: live.map(i => ({ id: String(i), uid: this.idt(i), label: this.playerName(i) })) });
      const idx = parseInt(pick, 10);
      return live.includes(idx) ? idx : live[0];
    }
    ownerOf(uid) { const c = this.c(uid); return c && c.owner != null ? c.owner : null; }
    identityPlayer(uid) { return this.s.ps.findIndex(p => p.identity === uid); }
    controllerOf(uid) {
      const c = this.c(uid); if (!c) return null;
      if (c.zone === 'identity') { const i = this.identityPlayer(uid); return i >= 0 ? i : null; }
      if (c.pZone != null) return c.pZone;
      if (c.ctrl != null) return c.ctrl;
      if (c.zone === 'attach' && c.on) {
        if (!this.d(uid).enc) return c.owner != null ? c.owner : this.controllerOf(c.on);
        return null;
      }
      if (!this.d(uid).enc && c.owner != null) return c.owner;
      return null;
    }
    engagedMinions(pi) { const idx = pi != null ? pi : this.s.ctx; return this.e.minions.filter(u => (this.c(u).eng ?? 0) === idx); }
    myDrones(pi) { return this.engagedMinions(pi).filter(u => this.hasTrait(u, 'DRONE')); }
    allFriendlyChars() { const out = []; for (const i of this.livingPlayers()) { const p = this.s.ps[i]; if (p.identity) out.push(p.identity); out.push(...p.allies); } return out; }
    allAllies() { return this.livingPlayers().flatMap(i => this.s.ps[i].allies); }
    encInPlay() {
      const e = this.s.e, out = [];
      const add = u => { if (!u) return; out.push(u); for (const a of this.c(u).att) out.push(a); };
      if (e.villains) e.villains.forEach(add); else add(e.villain);
      add(e.main); e.sides.forEach(add); e.minions.forEach(add); (e.env || []).forEach(add); (e.rules || []).forEach(add);
      return out;
    }
    myAndEncInPlay(pi) {
      const idx = pi != null ? pi : this.s.ctx, out = [];
      const add = u => { if (u && !out.includes(u)) out.push(u); };
      add(this.idt(idx));
      for (const a of this.c(this.idt(idx)).att) add(a);
      for (const u of this.controlled(idx)) { add(u); for (const a of this.c(u).att) add(a); }
      for (const u of this.encInPlay()) add(u);
      return out;
    }
    allPlayerIcons(k) {
      let n = 0;
      for (const i of this.livingPlayers()) {
        const p = this.s.ps[i];
        for (const u of p.allies.concat(p.supports, p.upgrades)) if (!this.d(u).enc) n += this.iconOf(u, k);
      }
      return n;
    }
    log(m, k) {
      const entry = { r: this.s.round, m: MC.josa(m), k: k || '' };
      if (this.players > 1) entry.p = this.s.ctx;
      this.s.log.push(entry);
      if (this.s.log.length > 300) this.s.log.splice(0, this.s.log.length - 300);
      if (this.io.onLog) this.io.onLog(this);
    }
    async ask(q) {
      if (this.s.over) throw new GameOver(this.s.over, this.s.overReason);
      if (q.title) q.title = MC.josa(q.title);
      if (q.owner == null) q.owner = this.s.ctx;
      return await this.io.ask(q, this);
    }
    async show(ev) { if (this.io.show) await this.io.show(ev, this); }

    newCard(id, zone, extra) {
      const uid = 'c' + (this.s.uidNext++);
      this.s.cards[uid] = Object.assign({ uid, id, zone: null, dmg: 0, threat: 0, ex: false, stun: false, conf: false, tough: false, cnt: {}, att: [], on: null, under: [] }, extra || {});
      if (zone) this.put(uid, zone);
      return uid;
    }

    // ------------------------------------------------------------ zones
    arrFor(pi, zone, host) {
      const p = (pi != null && this.s.ps[pi]) ? this.s.ps[pi] : this.p, e = this.s.e;
      switch (zone) {
        case 'deck': return p.deck; case 'hand': return p.hand; case 'discard': return p.discard;
        case 'ally': return p.allies; case 'support': return p.supports; case 'upgrade': return p.upgrades;
        case 'facedown': return p.facedown; case 'removed': return this.s.removed;
        case 'edeck': return e.deck; case 'ediscard': return e.discard; case 'setaside': return e.setaside;
        case 'side': return e.sides; case 'minion': return e.minions; case 'boost': return e.boost;
        case 'limbo': return this.s.limbo;
        case 'env': return e.env; case 'aside': return e.aside;
        case 'rules': return (e.rules = e.rules || []); // a challenge card: rules that stay in play
        case 'mission': return (e.mission = e.mission || []); // Age of Apocalypse campaign: the mission area
        case 'attach': return this.c(host).att;
        case 'villain': return e.villains; // only scenarios with several villains keep this list
        case 'vdeck': return e.vdecks[host].deck; case 'vdisc': return e.vdecks[host].discard;
        case 'under': return this.c(host).under;
        case 'pobl': return (p.obl = p.obl || []);
        case 'coll': return (e.coll = e.coll || []); // The Collection (Collector)
        case 'victory': return (e.victory = e.victory || []); // victory display
        case 'stones': return (e.stones = e.stones || []); case 'stonedis': return (e.stoneDiscard = e.stoneDiscard || []); // Infinity Stone deck
        case 'pset': return (p.pset = p.pset || []); case 'inv': return (p.inv = p.inv || []); case 'invdis': return (p.invDiscard = p.invDiscard || []);
      }
      return null;
    }
    arr(zone, host) { return this.arrFor(this.s.ctx, zone, host); }
    detach(uid) {
      const c = this.c(uid); if (!c.zone) return;
      const a = this.arrFor(c.pZone != null ? c.pZone : this.s.ctx, c.zone, c.on);
      if (a) { const i = a.indexOf(uid); if (i >= 0) a.splice(i, 1); }
      if (c.zone === 'villain' && this.e.villain === uid) this.e.villain = null;
      c.zone = null; c.on = null; c.pZone = null;
    }
    put(uid, zone, host, top) {
      const prevZone = this.c(uid).zone;
      this.put0(uid, zone, host, top);
      const PZ = ['ally', 'support', 'upgrade', 'minion', 'side', 'attach'];
      if (prevZone && PZ.includes(prevZone) && !PZ.includes(zone)) { const f = this.sc(uid).onLeave; if (f) f(this, uid, prevZone); } // Karma: control ends when she leaves play
    }
    put0(uid, zone, host, top) {
      const c0 = this.c(uid);
      if (zone === 'discard' && c0.zone === 'hand' && MC.cards[c0.id] && MC.cards[c0.id].enc) zone = 'ediscard'; // Misled: an encounter card discarded from hand
      if (zone === 'discard' && c0.zone === 'deck' && MC.cards[c0.id] && MC.cards[c0.id].enc) {
        zone = 'facedown';
        const opi = c0.owner != null ? c0.owner : this.s.ctx;
        const op = this.s.ps[opi] || this.p;
        op.mirrorDraw = (op.mirrorDraw || 0) + 1;
        this.log(`${this.nm(uid)}: 덱에서 버려지는 조우 카드를 뒷면으로 받습니다`, 'warn');
      } // Maze of Mirrors
      this.detach(uid);
      const c = this.c(uid);
      const OWNER_ZONES = ['deck', 'hand', 'discard', 'pset', 'inv', 'invdis'];
      const CTRL_ZONES = ['ally', 'support', 'upgrade', 'facedown', 'pobl'];
      let pi = null;
      if (OWNER_ZONES.includes(zone)) pi = c.owner != null ? c.owner : this.s.ctx;
      else if (CTRL_ZONES.includes(zone)) {
        pi = typeof host === 'number' ? host : this.s.ctx;
        if (zone !== 'facedown') c.ctrl = pi;
      }
      c.zone = zone;
      c.on = (typeof host === 'number') ? null : (host || null);
      if (pi != null) c.pZone = pi;
      if (zone === 'minion') c.eng = typeof host === 'number' ? host : this.s.ctx;
      if (zone === 'attach' && !this.d(uid).enc && c.ctrl == null) c.ctrl = c.owner != null ? c.owner : this.s.ctx;
      const a = this.arrFor(pi != null ? pi : this.s.ctx, zone, c.on);
      if (a) { if (top) a.unshift(uid); else a.push(uid); }
    }
    resetCard(uid) { const c = this.c(uid);
      if (c.threat > 0 && ['ally', 'minion'].includes(c.zone) && this.s.e.main && this.sc(this.s.e.main).charThreatToMain) { this.c(this.s.e.main).threat += c.threat; this.log(`${this.nm(uid)}의 위협 ${c.threat}이(가) 주 음모로 옮겨갑니다`, 'warn'); this.s.e.recheck = true; } // MojoMania
      c.dmg = 0; c.threat = 0; c.ex = false; c.stun = false; c.conf = false; c.tough = false; c.stunH = false; c.confH = false; c.toughX = 0; c.cnt = {}; delete c.fd; delete c.eng; delete c.ctrl; }
    discard(uid, why) {
      const c = this.c(uid); if (!c) return;
      if (this.sc(uid).removeOnLeave && ['ally', 'support', 'upgrade', 'minion', 'attach'].includes(c.zone)) { this.removeFromGame(uid); this.log(`${this.nm(uid)}: 플레이 영역을 떠나 게임에서 제거`); return; } // Cosmo, Odin (King)
      if (c.zone && (this.d(uid).type === 'challenge' || this.inPlay().some(x => { const f = this.sc(x).keepInPlay; return f && f(this, x, uid); })) && c.zone !== 'limbo') { this.log(`${this.nm(uid)}: 플레이에서 떠날 수 없습니다`); return; }
      if (c.zone === 'minion' && this.sc(uid) && this.inPlay().some(x => this.sc(x).respond && this.sc(x).respond.some(r => r.window === 'minionLeftPlay'))) (this.e.minionLeft = this.e.minionLeft || []).push(uid); // The Raft
      const ctrlPi = this.controllerOf(uid), ctrlP = ctrlPi != null ? this.s.ps[ctrlPi] : this.p;
      if (this.encFx > 0 && !this.d(uid).enc && ['support', 'upgrade', 'attach', 'ally'].includes(c.zone) && !this.forceDiscard && !this._frontOrg) { const fo = ctrlP.supports.find(x => x !== uid && this.sc(x).insteadOfEncDiscard); if (fo) { this._frontOrg = true; try { this.log(`${this.nm(fo)}: ${this.nm(uid)} 대신 버립니다`, 'good'); this.discard(fo); } finally { this._frontOrg = false; } return; } } // Front Organization
      if (this.d(uid).permanent && ['support', 'upgrade', 'attach', 'ally'].includes(c.zone) && !this.forceDiscard) { this.log(`${this.nm(uid)}: 영구 카드라 버릴 수 없습니다`); return; }
      if (!this.d(uid).enc && ['ally', 'support', 'upgrade', 'attach'].includes(c.zone) && !this.forceDiscard) { // Pinpoint: shuffle it into the deck instead
        const pp = ctrlP.allies.find(a => a !== uid && this.c(a).id === '29035' && !this.c(a).ex && this.c(a).zone === 'ally');
        if (pp && ctrlP.form === 'hero' && this.d(uid).type !== 'obligation') {
          const ownP = this.s.ps[c.owner != null ? c.owner : (ctrlPi ?? this.s.ctx)];
          this.c(pp).ex = true; for (const a of c.att.slice()) this.discard(a); this.resetCard(uid); this.put(uid, 'deck'); this.shuffle(ownP.deck); this.log(`핀포인트: ${this.nm(uid)}을(를) 버리는 대신 덱에 섞습니다`, 'good'); return;
        }
      }
      if (this.d(uid).type === 'attachment' && c.zone === 'attach' && c.on && !this.forceDiscard && !this.hostGone && (this.identityPlayer(c.on) >= 0 || this.c(c.on).zone === 'ally') && this.inPlay().some(u => this.sc(u).lockFriendlyAttachments)) { this.log(`${this.nm(uid)}: 아군 캐릭터에 붙은 부착물은 버릴 수 없습니다`, 'warn'); return; } // Powerful Enchantments
      if (this.d(uid).victory != null && (['minion', 'side'].includes(c.zone) || (c.zone === 'attach' && this.d(uid).type === 'minion'))) { for (const a of c.att.slice()) this.discard(a); this.resetCard(uid); this.put(uid, 'victory'); this.log(`${this.nm(uid)}: 승리 표시 영역으로`); return; }
      if (this.sc(uid).loseIfLeaves && ['ally', 'support'].includes(c.zone)) this.lose(`${this.nm(uid)}이(가) 플레이에서 떠났습니다`);
      { const dto = this.sc(uid).discardTo; const dz = typeof dto === 'function' ? dto(this, uid) : dto; if (dz) { for (const a of c.att.slice()) this.discard(a); this.resetCard(uid); this.put(uid, dz); if (why) this.log(why); const ad = this.sc(uid).afterDiscardTo; if (ad) ad(this, uid); return; } } // Sense deck (Daredevil)
      const SC = this.scenData();
      if (SC.discardInstead && SC.discardInstead(this, uid, c.zone)) return; // The Collection (Collector)
      { const hg = this.hostGone; this.hostGone = true; for (const a of c.att.slice()) this.discard(a); this.hostGone = hg; }
      for (const u of c.under.slice()) this.put(u, this.d(u).enc ? 'ediscard' : 'discard');
      if (c.real) { c.id = c.real; delete c.real; }
      this.resetCard(uid);
      if (c.home && this.e.vdecks && c.home !== this.e.activeKey && this.e.vdecks[c.home]) this.put(uid, 'vdisc', c.home); // its own villain's discard pile
      else this.put(uid, this.d(uid).enc ? 'ediscard' : 'discard');
      if (why) this.log(why);
    }
    removeFromGame(uid) { for (const a of this.c(uid).att.slice()) this.discard(a); this.resetCard(uid); this.put(uid, 'removed'); }

    // everything in play (for modifiers and triggers)
    inPlay() {
      const e = this.s.e, out = [];
      const add = u => { if (!u) return; out.push(u); for (const a of this.c(u).att) out.push(a); };
      for (const i of this.livingPlayers()) {
        const p = this.s.ps[i];
        add(p.identity); p.allies.forEach(add); p.supports.forEach(add); p.upgrades.forEach(add); (p.obl || []).forEach(add);
      }
      if (e.villains) e.villains.forEach(add); else add(e.villain);
      add(e.main); e.sides.forEach(add); e.minions.forEach(add); (e.env || []).forEach(add); (e.rules || []).forEach(add);
      return out;
    }
    hasTrait(uid, t) {
      if ((this.d(uid).tr || []).includes(t)) return true;
      const c = this.c(uid); if ((c.pm && c.pm['tr:' + t]) || (c.rm && c.rm['tr:' + t])) return true;
      for (const u of this.inPlay()) {
        const f = this.sc(u).grantTrait; if (!f) continue;
        const uc = this.controllerOf(u);
        const r = uc != null ? this.withPlayerSync(uc, () => f(this, u, uid)) : f(this, u, uid);
        if (r === t || (Array.isArray(r) && r.includes(t))) return true;
      }
      return false;
    }
    addRoundMod(uid, key, n) { const c = this.c(uid); c.rm = c.rm || {}; c.rm[key] = (c.rm[key] || 0) + n; }
    clearRoundMods() { for (const u in this.s.cards) if (this.s.cards[u].rm) delete this.s.cards[u].rm; }
    // upgrades the player controls: in the upgrade row and attached anywhere (identity, allies, enemies)
    myUpgrades() { return this.controlled().filter(u => this.d(u).type === 'upgrade'); }
    // shared helpers for card scripts
    async pickCards(cards, title, min, max, confirm) {
      if (!cards.length || max <= 0) return [];
      const sel = ((await this.ask({ type: 'select', title, cards: cards.slice(), min, max, confirm: confirm || '확정' })) || []).filter(x => cards.includes(x));
      for (const x of cards) if (sel.length < min && !sel.includes(x)) sel.push(x);
      return sel.slice(0, max);
    }
    async searchToHand(pred, title, o) {
      const pool = this.p.deck.concat(o && o.discard ? this.p.discard : []);
      const cands = pool.filter(x => pred(this.d(x), x));
      if (!cands.length) { this.log(`${title}: 해당하는 카드가 없습니다`); this.shuffle(this.p.deck); return null; }
      const pick = (await this.pickCards(cands, `${title}: 손으로 가져올 카드`, 1, 1, '가져오기'))[0];
      this.put(pick, 'hand'); this.shuffle(this.p.deck);
      this.log(`${title}: ${this.nm(pick)}을(를) 손으로 가져오고 덱을 섞습니다`, 'good');
      return pick;
    }
    async discardFromHand(min, max, title, exclude) {
      const cands = this.p.hand.filter(u => !(exclude || []).includes(u));
      const sel = await this.pickCards(cands, title, Math.min(min, cands.length), Math.min(max, cands.length), '버리기');
      sel.forEach(u => this.put(u, 'discard'));
      if (sel.length) this.log(`손에서 버림: ${sel.map(u => this.nm(u)).join(', ')}`);
      return sel;
    }
    hostOf(u) { const c = this.c(u); return c.on || (c.zone === 'upgrade' ? this.idt() : null); }
    // standard hero obligation: may flip to alter-ego, then exhaust the alter-ego to remove it, or pay the other option
    async heroObligation(u, title, otherLabel, other, o) {
      o = o || {};
      if (!o.noFlip && this.isHero() && !this.formLocked()) {
        const f = await this.ask({ type: 'choice', title: `${title}: 일상 모습으로 변신할 수 있습니다`, options: [{ id: 'flip', label: `${this.d(this.p.identity).name === this.nm(this.idt()) ? '' : ''}일상 모습으로 변신` }, { id: 'no', label: '그대로 둔다' }] });
        if (f === 'flip') await this.changeForm(true);
      }
      const opts = [];
      if (!this.isHero() && !this.c(this.idt()).ex) opts.push({ id: 'remove', label: `${this.nm(this.idt())} 소진 → 이 카드를 게임에서 제거` });
      opts.push({ id: 'other', label: otherLabel });
      const pick = opts.length === 1 ? 'other' : await this.ask({ type: 'choice', title: `${title}: 하나를 고르세요`, options: opts });
      if (pick === 'remove') { this.c(this.idt()).ex = true; this.removeFromGame(u); this.log(`${this.nm(u)}을(를) 게임에서 제거`, 'good'); }
      else await other();
    }
    async lookAtDeckTop(n) {
      if (this.p.deck.length < n) await this.reshuffleDeck();
      return this.p.deck.slice(0, n);
    }
    drones() { return this.e.minions.filter(u => this.hasTrait(u, 'DRONE')); }
    enemies() { const out = this.e.villains ? this.e.villains.slice() : (this.e.villain ? [this.e.villain] : []); return out.concat(this.e.minions, this.heldMinions()); }
    heldMinions() { const out = []; for (const x of (this.e.env || [])) if (this.sc(x).holdsMinions) for (const a of this.c(x).att) if (this.d(a).type === 'minion') out.push(a); return out; } // Thunderbolt Backup: attached minions are in play and can be attacked
    schemes() { const out = []; if (this.e.main) out.push(this.e.main); if (this.e.main2) out.push(this.e.main2); out.push(...(this.e.mainX || [])); return out.concat(this.e.sides); }
    isMain(u) { return !!u && (u === this.e.main || u === this.e.main2 || (this.e.mainX || []).includes(u)); } // mainX: other main schemes in play at once (Venom Goblin)
    targetOf(u) { if (u === this.e.main) return this.mainTarget(); const d = this.d(u); return (d.target || 0) * (d.targetStar ? this.players : 1); }
    friendlyChars() { return [this.idt()].concat(this.p.allies); }
    controlled(pi) { // player cards in play the player controls (upgrades/supports incl. ones attached to enemies)
      const idx = pi != null ? pi : this.s.ctx, p = this.s.ps[idx];
      if (!p) return [];
      const out = p.supports.concat(p.upgrades, p.allies);
      const added = new Set(out);
      const checkAtt = u => {
        for (const a of this.c(u).att) if (!this.d(a).enc && !added.has(a) && (this.c(a).ctrl ?? this.c(a).owner ?? idx) === idx) { out.push(a); added.add(a); }
      };
      for (const en of this.enemies()) checkAtt(en);
      for (const a of this.c(p.identity).att) if (!added.has(a)) { out.push(a); added.add(a); }
      for (const al of this.allAllies()) checkAtt(al);
      for (const i of this.livingPlayers()) if (i !== idx && this.s.ps[i].identity) checkAtt(this.s.ps[i].identity);
      return out;
    }
    findInPlay(pred) { return this.inPlay().find(u => pred(this.d(u), this.c(u))); }

    // ------------------------------------------------------------ stats
    base(uid, key) { const bf = this.sc(uid).baseFn; if (bf) { const uc = this.controllerOf(uid); const v = uc != null ? this.withPlayerSync(uc, () => bf(this, uid, key)) : bf(this, uid, key); if (v != null) return v; } const d = this.d(uid); return d[key] || 0; } // Hope Summers: base stats from your hero
    stat(uid, key) {
      const ctrl = this.controllerOf(uid), cp = ctrl != null ? this.s.ps[ctrl] : null;
      if ((key === 'atk' || key === 'thw') && cp && uid === cp.identity && this.myAndEncInPlay(ctrl).some(x => this.sc(x).useDefFor)) return this.stat(uid, 'def'); // The Best Offense...
      let v = this.base(uid, key);
      const cc = this.c(uid);
      if (cc.pm && cc.pm[key]) v += cc.pm[key];
      if (cc.rm && cc.rm[key]) v += cc.rm[key];
      if (cc.ppMod && cc.ppMod[key] && (this.s.round < cc.ppMod.round || (this.s.round === cc.ppMod.round && this.s.phase === 'player'))) v += cc.ppMod[key]; // Take a Stand
      for (const a of cc.att) { const pl = this.d(a).plus; if (pl && pl[key]) v += pl[key]; }
      for (const u of this.inPlay()) {
        const m = this.sc(u).mod;
        if (m && m[key]) {
          const uc = this.controllerOf(u);
          v += (uc != null ? this.withPlayerSync(uc, () => m[key](this, u, uid)) : m[key](this, u, uid)) || 0;
        }
      }
      const tm = cp && cp.phase && cp.phase.traitMods; // "until the end of the phase, each X character gets +1" (Avengers Assemble!)
      if (tm) for (const m of tm) if (m[key] && this.hasTrait(uid, m.tr)) v += m[key];
      return Math.max(0, v);
    }
    maxHp(uid) {
      const d = this.d(uid); let v = (d.hp || 0) * (d.hpStar ? this.players : 1);
      for (const a of this.c(uid).att) { const pl = this.d(a).plus; if (pl && pl.hp) v += pl.hp; }
      for (const u of this.inPlay()) {
        const m = this.sc(u).mod;
        if (m && m.hp) {
          const uc = this.controllerOf(u);
          v += (uc != null ? this.withPlayerSync(uc, () => m.hp(this, u, uid)) : m.hp(this, u, uid)) || 0;
        }
      }
      if (this.c(uid).zone === 'mission' && this.d(uid).type === 'ally') for (const a of this.c(uid).att) { const m = this.sc(a).mod; if (m && m.hp) v += m.hp(this, a, uid) || 0; } // an ally at the mission keeps its own upgrades
      return Math.max(1, v);
    }
    hpLeft(uid) { return this.maxHp(uid) - this.c(uid).dmg; }
    handSize() { return this.stat(this.idt(), 'hs'); }
    handCount() { return this.p.hand.filter(u => !this.sc(u).noHandSize).length; } // Connection to the Worldmind
    mainTarget() { const m = this.e.main, d = this.d(m); if (this.sc(m).noTarget) return Infinity; let n = (d.target || 0) * (d.targetStar ? this.players : 1); { const tf = this.sc(m).targetFn; if (tf) n += tf(this, m) || 0; } for (const a of this.c(m).att) { const tp = this.sc(a).targetPlus; n += typeof tp === 'function' ? (tp(this, a) || 0) : (tp || 0); } return n; }
    allyLimit() { let n = 3; for (const u of this.myAndEncInPlay()) { const a = this.sc(u).allyLimit; n += typeof a === 'function' ? (a(this, u) || 0) : (a || 0); } return n; }
    clearPhaseMods() { for (const u in this.s.cards) if (this.s.cards[u].pm) delete this.s.cards[u].pm; }
    vsBonus(kind, uid, other) { let n = 0; for (const u of this.myAndEncInPlay()) { const f = this.sc(u)[kind + 'Vs']; if (f) n += f(this, u, uid, other) || 0; } return n; } // Dragonfang / Valkyrie's Spear
    addPhaseMod(uid, key, n) { const c = this.c(uid); c.pm = c.pm || {}; c.pm[key] = (c.pm[key] || 0) + n; }
    crisis() { return this.e.sides.concat(this.e.env || []).some(u => this.d(u).crisis && this.c(u).iconsOffRound !== this.s.round && !this.c(u).att.some(a => this.sc(a).blankIcons)); }
    // a hero's own attacks/thwarts (basic powers, events, upgrades) — not allies' — may ignore guard, patrol or crisis
    ignores(key, src) {
      if (src && this.c(src) && this.d(src).type === 'ally') { const own = this.sc(src).allyIgnores; return !!(own && own.includes(key)); } // Wasp (Champion)
      if ((this.p.ignoreNow || []).includes(key)) return true; // Grapnel Launcher
      for (const u of this.myAndEncInPlay()) { const f = this.sc(u).ignores; if (f && f[key] && f[key](this, u)) return true; }
      return false;
    }
    // keywords given by other cards (The Inheritors: each Inheritor minion gains patrol / guard / villainous ...)
    kw(u, key) {
      for (const x of this.inPlay()) { const f = this.sc(x).loseKw; if (f) { const uc = this.controllerOf(x); const r = uc != null ? this.withPlayerSync(uc, () => f(this, x, u)) : f(this, x, u); if (r && r.includes(key)) return false; } } // Tigra: Hunted minions lose guard
      if (this.d(u)[key]) return true;
      for (const x of this.inPlay()) { const f = this.sc(x).grantKw; if (f) { const uc = this.controllerOf(x); const r = uc != null ? this.withPlayerSync(uc, () => f(this, x, u)) : f(this, x, u); if (r && r.includes(key)) return true; } }
      return false;
    }
    patrolled() { return this.engagedMinions().some(u => this.kw(u, 'patrol')); } // Patrol: you cannot thwart the main scheme
    playerIcons(k) { let n = 0; for (const u of this.p.allies.concat(this.p.supports, this.p.upgrades)) if (!this.d(u).enc) n += this.iconOf(u, k); return n; } // 'Pool cards carry encounter icons
    iconsInPlay() { let n = 0; for (const u of this.inPlay()) { n += this.d(u).crisis ? 1 : 0; n += this.iconOf(u, 'accel') + this.iconOf(u, 'amplify') + this.iconOf(u, 'hazard'); } return n; }
    amplify() { let n = 0; for (const u of this.inPlay()) n += this.iconOf(u, 'amplify'); return n; } // Consume the World: loses amplify while empty
    guarded() { return this.engagedMinions().some(u => this.kw(u, 'guard') || (this.c(u).att.some(a => this.sc(a).grantGuard) && !this.inPlay().some(x => { const f = this.sc(x).loseKw; const r = f && f(this, x, u); return !!(r && r.includes('guard')); }))); }

    // ------------------------------------------------------------ setup
    static create(io, opts) {
      const seed = (opts.seed >>> 0) || ((Math.random() * 4294967296) >>> 0);
      const plist = MC.normPlayers(opts);
      const first = Math.max(0, Math.min(plist.length - 1, opts.first || 0));
      const makePlayer = (po, i) => ({
        idx: i, heroKey: po.hero, deckName: po.deck ? (po.deck.name || '내 덱') : '스타터 덱', cameo: po.cameo || null, eliminated: false,
        identity: null, form: 'alter', heroId: null, alterId: null, flipped: false,
        deck: [], hand: [], discard: [], allies: [], supports: [], upgrades: [], facedown: [], usedOnce: {}, costRed: 0, phase: {}, pset: [], inv: [], invDiscard: [], obl: []
      });
      const ps = plist.map(makePlayer);
      const s = {
        v: 2, seed, rng: seed, uidNext: 1, round: 1, phase: 'setup', over: null, overReason: '',
        first, ctx: first, turnsDone: [],
        heroKey: ps[0].heroKey, scenKey: opts.scenario, cameo: ps[0].cameo, deckName: ps.map(p => p.deckName).join(' + '),
        cards: {}, log: [], limbo: [], removed: [],
        ps,
        e: { villain: null, stages: [], stage: 0, main: null, accelTokens: 0, sides: [], minions: [], deck: [], discard: [], setaside: [], boost: [], env: [], aside: [] },
        scen: { key: opts.scenario, underling: (MC.scenarios[opts.scenario] || {}).underlings ? MC.scenFor(opts.scenario, opts.underling).underling : undefined, expert: !!opts.expert, modular: opts.modular || (MC.scenarios[opts.scenario] || {}).defaultModular, std2: opts.std2 === 3 ? 3 : !!opts.std2, exp2: !!opts.exp2 }
      };
      if (opts.campaign && opts.campaign.id) s.campaign = { id: opts.campaign.id, log: Object.assign({}, opts.campaign.log || {}) }; // campaign mode: the campaign log filled in before the scenario
      const g = new Game(io, s);
      g.setup(opts);
      return g;
    }
    setup(opts) {
      const S = MC.scenFor(opts.scenario, opts.underling);
      const e = this.e;
      const plist = MC.normPlayers(opts);
      for (let i = 0; i < plist.length; i++) {
        const po = plist[i], H = MC.heroes[po.hero];
        this.withPlayerSync(i, () => {
          const p = this.p;
          p.heroId = H.hero; p.alterId = H.alter;
          p.identity = this.newCard(H.alter, null, { owner: i });
          this.c(p.identity).zone = 'identity'; this.c(p.identity).pZone = i;
          const deckIds = po.deck ? (po.deck.hero_deck || H.heroDeck).concat(po.deck.player_deck || []) : H.deck;
          const unknown = deckIds.filter(id => !MC.cards[id]);
          deckIds.filter(id => MC.cards[id]).forEach(id => this.newCard(id, 'deck', { owner: i }));
          if (unknown.length) this.log(`아직 지원하지 않는 카드 ${unknown.length}장은 덱에서 제외했습니다: ${unknown.join(', ')}`, 'warn');
          this.shuffle(p.deck);
        });
      }
      // encounter
      const sc = this.s.scen;
      e.stages = (sc.expert ? S.villainsExpert : S.villains).slice();
      if (S.villainDeck) { this.shuffle(e.stages); e.stages = e.stages.slice(0, S.villainDeck[sc.expert ? 1 : 0]); } // Mansion Attack: a shuffled villain deck
      if (S.six) { e.villains = []; e.villain = null; } // The Sinister Six: villains start set aside and come in by Ambush!
      else if (S.crew) this.setupCrew(S, sc.expert);
      else { e.villain = this.newCard(e.stages[0]); this.c(e.villain).zone = 'villain'; }
      if (e.villain && this.d(e.villain).toughness) this.c(e.villain).tough = true;
      e.mainStages = S.main.map(x => x.slice()); e.mainIdx = 0;
      if (S.mainOptions) { const ch = opts.schemes; e.mainStages = S.mainOptions.map((st, i) => { const f = Array.isArray(ch) && ch[i] && st.find(x => x[0] === ch[i]); return (f || (ch === 'random' || (Array.isArray(ch) && ch[i] === 'random') ? st[Math.floor(this.rand() * st.length)] : st[0])).slice(); }); } // Civil War: the leader's default schemes unless chosen (or random)
      if (S.shuffleMain) { const rest = e.mainStages.slice(1); this.shuffle(rest); e.mainStages = [e.mainStages[0]].concat(rest); } // Mansion Attack: the 2A schemes are shuffled
      e.main = this.newCard(e.mainStages[0][1]); this.c(e.main).zone = 'main';
      const md = this.d(e.main); this.c(e.main).threat = (md.start || 0) * (md.startStar ? this.players : 1);
      const enc = S.crew ? [] : S.encounter.slice();
      const setupIds = []; // Setup keyword in the standard set (Formidable Foe): starts in play
      if (!S.crew && !S.noStandard) { const std = MC.stdRaw(sc); for (const x of std) { const f = x.split(','); const id = f[sc.expert && f[1] && sc.std2 !== 3 ? 1 : 0]; if (MC.cards[id] && MC.cards[id].setupCard) setupIds.push(id); else enc.push(id); } } // Formidable Foe: A side standard, B side expert
      for (const k of (S.sets || [])) enc.push(...(MC.sets[k] || []).map(x => x.split(',')[0])); // Prelates: double-faced, scenario side first
      if (sc.expert && !S.crew) enc.push(...MC.expSet(sc));
      const mods = S.crew ? [] : MC.modsOf(sc.modular);
      if (S.asideMods) { e.asideMods = mods.map(k => ({ key: k, cards: MC.modulars[k].cards.map(id => this.newCard(id, 'aside')) })); } // The Hood: modular sets wait set aside
      else for (const k of mods) enc.push(...MC.modulars[k].cards);
      if (!S.crew && !S.noObligation) for (let i = 0; i < plist.length; i++) { const H = MC.heroes[plist[i].hero]; if (H && H.obligation) enc.push({ id: H.obligation, owner: i }); } // The Wrecking Crew uses no obligations or nemesis sets; Kang removes them
      { const keep = []; for (const item of enc) { const id = typeof item === 'string' ? item : item.id; const cd = MC.cards[id]; if (cd && cd.setupCard && cd.enc && ['side', 'environment'].includes(cd.type) && !setupIds.includes(id)) { e.setupPending = e.setupPending || []; e.setupPending.push(this.newCard(id, 'aside')); } else keep.push(item); } enc.length = 0; enc.push(...keep); } // Setup (Gene Pool, Ancient Ritual)
      enc.forEach(item => typeof item === 'string' ? this.newCard(item, 'edeck') : this.newCard(item.id, 'edeck', { owner: item.owner }));
      setupIds.forEach(id => this.newCard(id, 'env'));
      if (S.challenge && MC.cards[S.challenge]) this.newCard(S.challenge, 'rules'); // the challenge's rules stay in play
      (S.setAside || []).forEach(id => this.newCard(id, 'aside'));
      for (let i = 0; i < plist.length; i++) {
        const H = MC.heroes[plist[i].hero];
        if (!S.crew) (H.nemesis || []).forEach(id => this.newCard(id, 'setaside', { owner: i }));
        this.withPlayerSync(i, () => (H.setAside || []).forEach(id => this.newCard(id, 'pset', { owner: i }))); // e.g. Doctor Strange's Invocation cards
      }
      this.shuffle(e.deck);
      const heroNames = plist.map(po => MC.heroes[po.hero].name).join(' · ');
      this.log(`게임 시작: ${heroNames} 대 ${S.name}${sc.expert ? ' (숙련)' : ''}${sc.std2 === 3 ? ' · 표준 III' : sc.std2 ? ' · 표준 II' : ''}${sc.expert && sc.exp2 ? ' · 숙련 II' : ''} · 모듈 ${mods.map(k => MC.modulars[k].name).join('·') || '없음'}${S.asideMods ? ' (따로 둠)' : ''}`, 'sys');
    }

    // several villains at once, each with a side scheme and an encounter deck; only the active one acts
    setupCrew(S, expert) {
      const e = this.e; e.villains = []; e.vdecks = {}; e.crewSide = {};
      for (const m of S.crew) {
        const v = this.newCard(expert ? m.b : m.a); this.put(v, 'villain');
        const sd = this.newCard(m.side, 'side'); const d = this.d(sd); this.c(sd).threat = (d.start || 0) * (d.startStar ? this.players : 1);
        e.crewSide[v] = sd; e.vdecks[v] = { deck: [], discard: [] };
        for (const id of m.deck) { const u = this.newCard(id, null, { home: v }); this.put(u, 'vdeck', v); }
        this.shuffle(e.vdecks[v].deck);
      }
      e.villain = null; e.activeKey = null;
      this.switchActive(e.villains[0], true);
    }
    // move the active villain counter: the active villain's deck becomes "the encounter deck"
    switchActive(v, quiet) {
      const e = this.e; if (!e.vdecks || !v) return;
      const old = e.activeKey;
      if (old === v && e.villain === v) return;
      if (old && e.vdecks[old]) {
        e.deck.slice().forEach(u => this.put(u, 'vdeck', old));
        e.discard.slice().forEach(u => this.put(u, 'vdisc', old));
      }
      e.activeKey = v; e.villain = v;
      e.vdecks[v].deck.slice().forEach(u => this.put(u, 'edeck'));
      e.vdecks[v].discard.slice().forEach(u => this.put(u, 'ediscard'));
      if (!quiet) this.log(`활성 빌런: ${this.nm(v)}`, 'warn');
    }
    crewSideOf(v) { return this.e.crewSide ? this.e.crewSide[v] : null; }
    crewVillainOf(side) { const cs = this.e.crewSide || {}; return Object.keys(cs).find(v => cs[v] === side) || null; }

    // ------------------------------------------------------------ main loop
    async run() {
      try {
        if (this.s.phase === 'setup') {
          await this.withPlayer(this.s.first, () => this.setupEncounter());
          await this.forEachPlayer(async pi => {
            for (const id of [this.p.alterId, this.p.heroId]) { const f = (MC.scripts[id] || {}).setup; if (f) await f(this, this.idt()); } // identity setup comes before the opening hand
            for (const u of this.p.deck.filter(x => this.d(x).starting)) { this.put(u, 'hand'); this.log(`시작 카드: ${this.nm(u)}을(를) 손에 넣습니다`); }
            for (const u of this.p.deck.filter(x => this.d(x).setupCard && !this.d(x).enc)) { this.put(u, { upgrade: 'upgrade', ally: 'ally' }[this.d(u).type] || 'support'); this.log(`사전 준비: ${this.nm(u)}`); } // Cameo
            this.drawRaw(this.handSize());
            const mTitle = this.players > 1 ? `${this.playerName(pi)} 멀리건: 다시 뽑을 카드를 고르세요` : '멀리건: 다시 뽑을 카드를 고르세요';
            const sel = await this.ask({ type: 'select', title: mTitle, cards: this.p.hand.slice(), min: 0, max: this.p.hand.length, confirm: '확정' });
            if (sel && sel.length) {
              sel.forEach(u => this.put(u, 'discard'));
              this.drawRaw(sel.length);
              this.log(`멀리건: ${sel.length}장 교체`);
            }
            if (this.p.extraMulligan) { this.p.extraMulligan = false; const s2 = await this.ask({ type: 'select', title: '평판 보상: 한 번 더 멀리건 — 다시 뽑을 카드', cards: this.p.hand.slice(), min: 0, max: this.p.hand.length }); if (s2 && s2.length) { s2.forEach(u => this.put(u, 'discard')); this.drawRaw(s2.length); this.log(`추가 멀리건: ${s2.length}장 교체`); } }
          });
          for (const u of this.inPlay()) { const f = this.sc(u).afterSetup; if (f) { const ctrl = this.controllerOf(u); await (ctrl != null ? this.withPlayer(ctrl, () => f(this, u)) : f(this, u)); } } // player cards: "after setup" (Cameo)
          for (const x of (this.e.rules || []).slice()) { const f = this.sc(x).challengeSetup; if (f) await f(this, x); } // challenges: "after setup"
          if (this.campaignOn()) { const C = MC.CAMPAIGNS[this.s.campaign.id], spec = (MC.scripts[this.e.mainStages[0][0]] || {}).campaign || {}; if (C && C.post) await C.post(this, spec); } // campaign steps after the mulligan
          this.s.phase = 'player';
          this.s.ctx = this.s.first;
          this.log(`라운드 1 — 플레이어 단계`, 'phase');
        }
        while (true) {
          if (this.s.phase === 'player') { await this.playerPhase(); this.s.phase = 'villain'; }
          else { await this.villainPhase(); }
        }
      } catch (err) {
        if (err instanceof GameOver) {
          this.s.over = err.result; this.s.overReason = err.reason; this.s.phase = 'over';
          this.log(err.result === 'win' ? `승리! ${err.reason}` : `패배… ${err.reason}`, 'sys');
          if (this.io.gameOver) await this.io.gameOver(this);
          return;
        }
        throw err;
      }
    }
    async setupEncounter() {
      const e = this.e, [a, b] = e.mainStages[0];
      const SA = MC.scripts[a] || {}, SB = MC.scripts[b] || {};
      if (SA.setup) await SA.setup(this, e.main);
      for (const u of (e.setupPending || []).splice(0)) if (this.c(u).zone === 'aside') { if (this.d(u).type === 'side') { await this.enterSide(u, {}); this.log(`사전 준비: ${this.nm(u)}`); } else { this.put(u, 'env'); this.log(`사전 준비: ${this.nm(u)}`); } }
      await this.show({ type: 'reveal', uid: e.main, title: '주 음모' });
      if (SA.whenRevealed) await SA.whenRevealed(this, e.main, { surge: 0 }); // stage 1A is revealed at setup too (The Armies of Thanos)
      if (SB.whenRevealed) await SB.whenRevealed(this, e.main, { surge: 0 });
      const vw = e.villain && this.sc(e.villain).whenRevealed; if (vw) await vw(this, e.villain, {});
      if (this.campaignOn()) await this.campaignSetup();
      for (const x of (e.rules || []).slice()) { const f = this.sc(x).challengePre; if (f) await f(this, x); } // challenges: during setup (before the opening hand)
    }
    // ------------------------------------------------------------ campaign log (game/operate/campaign_logs.py)
    campaignOn(id) { const c = this.s.campaign; return !!(c && c.id && (!id || c.id === id)); }
    clog(key) { const L = (this.s.campaign || {}).log || {}; return L[key] == null ? '' : String(L[key]); }
    clogInt(key) { return parseInt(this.clog(key), 10) || 0; }
    clogList(key) { const v = this.clog(key); return v ? v.split(';').map(x => x.trim()).filter(Boolean) : []; }
    clogP(key, pi) { const n = (pi != null ? pi : this.s.ctx) + 1; return this.clog(`Player ${n} ${key}`) || this.clog(`${key} P${n}`); }
    clogPInt(key, pi) { return parseInt(this.clogP(key, pi), 10) || 0; }
    clogPList(key, pi) { const v = this.clogP(key, pi); return v ? v.split(';').map(x => x.trim()).filter(Boolean) : []; }
    clogPSet(key, value, pi) { const n = (pi != null ? pi : this.s.ctx) + 1; const k = / P\d+$/.test(key) ? key.replace(/ P\d+$/, ` P${n}`) : `Player ${n} ${key}`; this.clogSet(k, value); }
    async campaignSetup() { // step 13 of the original setup: after the scenario setup, before the opening hand
      const c = this.s.campaign; const C = c && MC.CAMPAIGNS[c.id]; if (!C) return;
      const a = this.e.mainStages[0][0], spec = (MC.scripts[a] || {}).campaign || {};
      this.log(`캠페인 「${(MC.CAMPAIGN_DEFS[c.id] || {}).name || c.id}」 준비`, 'sys');
      if (C.setup) await C.setup(this, spec);
      for (const f of (spec.fns || [])) await f(this);
      if (C.after) await C.after(this, spec);
      if (this.s.scen.expert) for (const f of (spec.expert || [])) await f(this);
    }
    clogSet(key, value) { const c = this.s.campaign; if (!c) return; if (value == null || value === '') delete c.log[key]; else c.log[key] = String(value); c.changed = true; this.log(`캠페인 기록: ${MC.campaignLabel ? MC.campaignLabel(key, this.players > 1) : key} → ${value === '' || value == null ? '(지움)' : value}`, 'sys'); }
    setIdentityHP(n) { const i = this.idt(), max = this.stat(i, 'hp'); this.c(i).dmg = Math.max(0, max - Math.max(1, n)); this.log(`캠페인: ${this.nm(i)} 생명력을 ${max - this.c(i).dmg}(으)로 맞춥니다`); }
    lose(reason) { throw new GameOver('lose', MC.josa(reason)); }
    win(reason) { if (!this._winChk) { this._winChk = true; try { for (const x of this.inPlay()) { const f = this.sc(x).winCheck; const r = f && f(this, x, reason); if (r) throw new GameOver('lose', MC.josa(r)); } } finally { this._winChk = false; } } { const C = this.s.campaign && MC.CAMPAIGNS[this.s.campaign.id]; if (C && C.onWin && !this._wonLogged) { this._wonLogged = true; try { C.onWin(this, reason); } catch (e) { console.error(e); } } } throw new GameOver('win', MC.josa(reason)); } // the campaign's end-of-scenario log entries

    // ------------------------------------------------------------ drawing
    drawRaw(n) { for (let i = 0; i < n; i++) { if (!this.p.deck.length) break; const u = this.p.deck[0]; if (this.d(u).enc && !this.sc(u).onHand) { this.put(u, 'facedown'); this.log(`${this.nm(u)}: 덱에서 나온 조우 카드를 뒷면으로 받습니다`, 'warn'); i--; continue; } this.put(u, 'hand'); if (this.sc(u).onHand) (this.p.onHandPending = this.p.onHandPending || []).push(u); } }
    async draw(n) {
      let drawn = 0;
      for (let i = 0; i < n; i++) {
        if (!this.p.deck.length) await this.reshuffleDeck();
        if (!this.p.deck.length) break;
        const u = this.p.deck[0];
        if (this.d(u).enc && !this.sc(u).onHand) { this.put(u, 'facedown'); this.log(`${this.nm(u)}: 덱에서 나온 조우 카드를 뒷면으로 받습니다`, 'warn'); i--; continue; } // Maze of Mirrors
        this.put(u, 'hand'); drawn++;
        if (this.sc(u).onHand) await this.sc(u).onHand(this, u); // Misled (Rogue nemesis): an encounter card that is drawn into your hand
      }
      return drawn;
    }
    async reshuffleDeck() {
      if (!this.p.discard.length) return;
      this.p.discard.slice().forEach(u => this.put(u, 'deck'));
      this.shuffle(this.p.deck);
      this.log('덱이 바닥나 버림 더미를 섞어 새 덱을 만들었습니다. 조우 카드 1장을 받습니다.', 'warn');
      const u = this.takeEncounter(); if (u) this.put(u, 'facedown');
      await this.trigger('deckReset', {}); // Universal Church of Truth
      await this.window('deckReset', {}); // Soul World
    }
    addAccel(n) { n = n || 1; this.e.accelTokens += n; this.e.accelPending = (this.e.accelPending || 0) + n; } // the token's own responses run at the next safe point (flushPending)
    async flushPending() {
      while (this.e.accelPending > 0) { this.e.accelPending--; await this.trigger('accelTokenPlaced', {}); } // Hapless Pedestrians
      for (const pi of this.livingPlayers()) {
        const p = this.s.ps[pi];
        while (p.mirrorDraw > 0) { p.mirrorDraw--; await this.withPlayer(pi, () => this.draw(1)); } // Maze of Mirrors: draw a replacement card
      }
      if (this.e.recheck && this.e.main) { this.e.recheck = false; await this.checkMainScheme(); }
      while ((this.e.toFacedown || []).length) { const u = this.e.toFacedown.shift(); if (['ediscard', 'discard'].includes(this.c(u).zone)) { const opi = this.c(u).owner != null ? this.c(u).owner : this.s.ctx; this.put(u, 'facedown', opi); this.log(`${this.nm(u)}: 뒷면 조우 카드로 받습니다`, 'warn'); } } // Dreadpool
      while ((this.e.toEncDeck || []).length) { const u = this.e.toEncDeck.shift(); if (this.c(u).zone === 'ediscard') { this.put(u, 'edeck'); this.shuffle(this.e.deck); this.log(`${this.nm(u)}: 조우 덱에 섞습니다`); } } // Zero
      if (this.e.needDefeatCheck) { this.e.needDefeatCheck = false; await this.checkDefeats(); }
      while (this.e.encResetPending > 0) { this.e.encResetPending--; await this.trigger('encounterDeckReset', {}); }
      for (const pi of this.livingPlayers()) {
        const p = this.s.ps[pi];
        while ((p.onHandPending || []).length) { const u = p.onHandPending.shift(); if (this.c(u).zone === 'hand') await this.withPlayer(pi, () => this.sc(u).onHand(this, u)); }
      }
      while ((this.e.minionLeft || []).length) { const m = this.e.minionLeft.shift(); await this.window('minionLeftPlay', { minion: m }); } // The Raft: after a minion leaves play
    }
    takeEncounter() {
      if (!this.e.deck.length) {
        if (!this.e.discard.length) return null;
        this.e.discard.slice().forEach(u => this.put(u, 'edeck'));
        this.shuffle(this.e.deck);
        this.addAccel(); this.e.encResetPending = (this.e.encResetPending || 0) + 1; // Wheel of Genres
        this.log('조우 덱이 바닥나 버림 더미를 섞었습니다. 주 음모에 가속 토큰 +1.', 'warn');
      }
      return this.e.deck[0] || null;
    }

    // ------------------------------------------------------------ payment
    resOf(uid, forUid) {
      let r = this.d(uid).res || '';
      const rg = this.sc(uid).resGen; if (rg) r = rg(this, uid) || '';
      if (r && this.p.hand.includes(uid) && this.inPlay().some(x => this.sc(x).handResAsEnergy)) r = 'Y'.repeat(r.length); // Haywire
      if (this.sc(uid).resHeroOnly && !this.isHero()) return '';
      const dbl = this.sc(uid).doubleFor;
      if (dbl && forUid && dbl(this, uid, forUid)) r = r + r;
      return r;
    }
    resAbilities(forUid) { // resource-generating abilities usable now (some only for certain cards)
      const out = [];
      for (const u of this.myAndEncInPlay()) {
        const rs = this.sc(u).resources; if (!rs) continue;
        rs.forEach((r, i) => {
          if (r.can && !r.can(this, u)) return;
          if (r.forOnly && !(forUid && r.forOnly(this, u, forUid))) return;
          const gen = typeof r.gen === 'function' ? r.gen(this, u) : r.gen;
          if (gen) out.push({ key: u + ':' + i, uid: u, idx: i, gen, label: typeof r.label === 'function' ? r.label(this, u) : r.label });
        });
      }
      return out;
    }
    payOk(letters, cost) {
      const cnt = { R: 0, B: 0, Y: 0, G: 0 }; letters.forEach(l => cnt[l]++);
      for (const l of (cost.req || '')) { if (cnt[l] > 0) cnt[l]--; else if (cnt.G > 0) cnt.G--; else return false; }
      const left = cnt.R + cnt.B + cnt.Y + cnt.G;
      if (cost.distinct && (['R', 'B', 'Y'].filter(l => cnt[l] > 0).length + cnt.G) < cost.n) return false;
      if (cost.only && letters.some(l => l !== cost.only && l !== 'G')) return false;
      return left >= Math.max(0, cost.n - (cost.req || '').length);
    }
    paySources(forUid, exclude) {
      const ex = new Set(exclude || []); if (forUid) ex.add(forUid);
      const src = [];
      for (const u of this.p.hand) if (!ex.has(u)) src.push({ key: u, uid: u, kind: 'card', res: this.resOf(u, forUid) });
      if (this.isHero()) for (const u of this.p.hand) if (!ex.has(u) && this.sc(u).siphon) for (let k = 1; k <= 3; k++) src.push({ key: 'sip' + k + ':' + u, uid: u, kind: 'ability', res: 'Y'.repeat(1 + k), label: `${this.nm(u)}: 피해 ${k} → 에너지 ${1 + k}`, siphon: k, noSuggest: true }); // Energy Siphon
      for (const u of this.p.hand) if (!ex.has(u) && this.sc(u).altPay) for (const o of this.sc(u).altPay(this, u, forUid)) src.push(Object.assign({ uid: u, kind: 'ability', alt: true, noSuggest: true }, o, { key: o.key + ':' + u })); // Organizational Support
      for (const a of this.resAbilities(forUid)) src.push({ key: a.key, uid: a.uid, idx: a.idx, kind: 'ability', res: a.gen, label: a.label });
      if (forUid && this.sc(forUid).doubleWild) for (const x of src) x.res = x.res.replace(/G/g, 'GG'); // Nova: Lightspeed Flight, Pot Shot
      return src;
    }
    lettersOf(sel, src) { const out = []; for (const k of sel) { const s = src.find(x => x.key === k); if (s) out.push(...s.res.split('')); } return out; }
    bestPay(cost, forUid, exclude) {
      if (cost.n <= 0 && !(cost.req || '').length) return [];
      const src = this.paySources(forUid, exclude).filter(s => s.res.length && !s.noSuggest);
      if (src.length > 14) src.length = 14;
      let best = null, bestScore = Infinity;
      const N = src.length;
      for (let m = 1; m < (1 << N); m++) {
        const sel = [], letters = [];
        let score = 0;
        for (let i = 0; i < N; i++) if (m & (1 << i)) {
          sel.push(src[i].key); letters.push(...src[i].res.split(''));
          const isRes = src[i].kind === 'card' && this.d(src[i].uid).type === 'resource';
          score += src[i].kind === 'ability' ? 1 : (isRes ? 6 : 10);
        }
        if (!this.payOk(letters, cost)) continue;
        score += (letters.length - cost.n) * 4;
        if (score < bestScore) { bestScore = score; best = sel; }
      }
      return best;
    }
    canAfford(cost, forUid, exclude) { return this.bestPay(cost, forUid, exclude) !== null; }
    cardCost(uid) {
      const d = this.d(uid);
      let n = d.cost || 0;
      if (this.p.costRed) n = Math.max(0, n - this.p.costRed);
      for (const u of this.myAndEncInPlay()) { const f = this.sc(u).costMod; if (f) n -= f(this, u, uid) || 0; }
      const sf = this.sc(uid).selfCostMod; if (sf) n -= sf(this, uid) || 0;
      if (this.p.toll && d.type === 'event') n += 3; // Physical Toll
      if (d.type === 'ally' && this.p.phase.nextAllyRed) n -= this.p.phase.nextAllyRed; // Welcome Aboard
      { const td = this.c(uid).tmpDiscount; if (td && td.key === this.s.round + ':' + this.s.phase) n -= td.n; } // Evaluate Threat: this card costs less until the end of the phase
      if (d.costReq) return { n: Math.max(d.costReq.length, n), req: d.costReq, only: d.costReq[0] };
      return { n: Math.max(0, n, (d.req || '').length), req: d.req || '' }; // Requirement (No Quarter, Honed Technique)
    }
    async overpay(max, letter, title) {
      this.p.overpayId = (this.p.overpayId || 0) + 1; // Mr. Hollywood: once per card
      this.p.overpaying = (this.p.overpaying || 0) + 1; let k = max; try { while (k > 0 && !this.canAfford({ n: k, req: letter ? letter.repeat(k) : '' }, null)) k--; } finally { this.p.overpaying--; }
      if (k <= 0) return 0;
      const opts = []; for (let i = 0; i <= k; i++) opts.push({ id: String(i), label: i ? `자원 ${i}개 더 지불` : '더 지불하지 않음' });
      const pick = +(await this.ask({ type: 'choice', title, options: opts })) || 0;
      if (!pick) return 0;
      this.p.overpaying = (this.p.overpaying || 0) + 1; let paid; try { paid = await this.pay({ n: pick, req: letter ? letter.repeat(pick) : '' }, null, title, true); } finally { this.p.overpaying--; }
      if (!paid) return 0;
      return letter ? paid.filter(l => l === letter || l === 'G').length : paid.length;
    }
    // ask the player to pay; returns letters paid or null if cancelled
    async pay(cost, forUid, title, cancelable) {
      if (cost.n <= 0 && !(cost.req || '').length) return [];
      const src = this.paySources(forUid);
      const suggestion = this.bestPay(cost, forUid);
      if (!suggestion) return null;
      while (true) {
        const sel = await this.ask({ type: 'pay', title, cost, forUid, sources: src, suggestion, cancelable: cancelable !== false });
        if (sel == null) return null;
        const letters = this.lettersOf(sel, src);
        if (!this.payOk(letters, cost)) continue;
        { const seen = new Set(); let dup = false; for (const k of sel) { const s = src.find(x => x.key === k); if (s && (s.kind === 'card' || s.siphon || s.alt)) { if (seen.has(s.uid)) dup = true; seen.add(s.uid); } if (s && s.exhaust) for (const x of s.exhaust) { if (seen.has(x)) dup = true; seen.add(x); } } if (dup) continue; } // one card, one use
        let sipDmg = 0;
        // apply
        this.p.syncUsed = 0; // SP//dr: resources from "Sync Ratio" are counted while they are generated
        for (const k of sel) {
          const s = src.find(x => x.key === k);
          if (s.kind === 'card') { this.put(s.uid, 'discard'); }
          else if (s.siphon) { this.put(s.uid, 'discard'); sipDmg += s.siphon; }
          else if (s.alt) { this.put(s.uid, 'discard'); for (const x of (s.exhaust || [])) this.c(x).ex = true; }
          else {
            const r = this.sc(s.uid).resources[s.idx];
            if (r.use) r.use(this, s.uid); // an ability with an effect queues it in p.afterPay (Battle Cry)
            this.cleanupUses(s.uid);
          }
        }
        const named = sel.map(k => { const s = src.find(x => x.key === k); return s.kind === 'card' ? this.nm(s.uid) : (s.label || this.nm(s.uid)); });
        this.log(`지불: ${named.join(', ')} → ${letters.map(l => RES_KO[l]).join('·')}`);
        this.p.lastPaidLetters = letters.slice(); this.p.lastPaidAbil = sel.map(k => src.find(x => x.key === k)).filter(x => x && x.kind !== 'card').map(x => x.uid); // Cybernetic Arm // Jubilee: "different resource types used to pay"
        this.p.lastPaidCards = sel.map(k => src.find(x => x.key === k)).filter(s => s && (s.kind === 'card' || s.alt)).map(s => s.uid); // Bishop: "if you paid with a resource card"
        for (const k of sel) { const s = src.find(x => x.key === k); const f = s.kind === 'card' && this.sc(s.uid).onSpent; if (f) await f(this, s.uid, forUid); }
        if (sipDmg) { this.log(`에너지 흡수: 피해 ${sipDmg}`); await this.dealDamage(this.idt(), sipDmg, {}); }
        if (this.p.afterPay) { const l = this.p.afterPay; this.p.afterPay = null; for (const f of l) await f(); } // a resource ability with an effect (Battle Cry)
        if (letters.length) await this.trigger('resourcesGenerated', { n: letters.length }); // M.O.R.B.I.U.S.
        return letters;
      }
    }

    // ------------------------------------------------------------ player phase
    async playerPhase() {
      const order = this.playerOrder();
      for (const pi of order) {
        if (this.s.ps[pi].eliminated || (this.s.turnsDone || []).includes(pi)) continue;
        await this.withPlayer(pi, () => this.playerTurn());
        (this.s.turnsDone = this.s.turnsDone || []).push(pi);
      }
      this.s.turnsDone = [];
      await this.endPhaseAll();
    }
    async playerTurn() {
      if (!this.p.turnBegun) {
        this.p.turnBegun = true;
        if (this.players > 1) this.log(`${this.playerName()} 차례`, 'phase');
        await this.trigger('turnBegins', {});
      }
      while (!this.p.eliminated) {
        if (this.e.recheck) { this.e.recheck = false; await this.checkMainScheme(); }
        if (this.p.eliminated) break;
        const acts = this.legalActions();
        if (this.io.save) this.io.save(this);
        const a = await this.ask({ type: 'main', actions: acts });
        if (!a || a.kind === 'end') break;
        if (a.kind === 'request') { await this.requestPlayer(a.targetPlayer); await this.flushPending(); continue; }
        await this.doAction(a);
      }
    }
    scenData() { return MC.scenFor(this.s.scen.key, this.s.scen.underling); }
    async scenHook(name, arg) { const S = this.scenData(); if (S[name]) await S[name](this, arg); }
    async endPhaseAll() {
      await this.forEachPlayer(async () => {
        await this.trigger('playerPhaseEnd', {});
      });
      await this.scenHook('phaseEnd', 'player');
      await this.forEachPlayer(async () => {
        for (const u of (this.p.phase.endDiscard || [])) if (this.c(u).zone === 'ally') this.discard(u, `${this.nm(u)}: 단계 종료로 버림`);
        for (const u of (this.p.phase.endToHand || [])) if (this.c(u).zone === 'ally') { for (const a of this.c(u).att.slice()) this.discard(a); this.resetCard(u); this.put(u, 'hand'); this.log(`${this.nm(u)}: 단계 종료로 손으로`); } // "To Me, My X-Men!"
        for (const x of (this.p.phase.endTraitDamage || [])) for (const f of this.friendlyChars()) if (this.hasTrait(f, x.tr) && this.c(f).zone) await this.dealDamage(f, x.n, {});
      });
      const live = this.livingPlayers();
      if (live.length === 1) {
        await this.withPlayer(live[0], async () => {
          const hs = this.handSize();
          if (this.p.hand.length) {
            const sel = await this.ask({ type: 'select', title: '턴 종료: 버릴 카드를 고르세요 (선택 안 해도 됨)', cards: this.p.hand.slice(), min: 0, max: this.p.hand.length, confirm: '확정' });
            if (sel && sel.length) { sel.forEach(u => this.put(u, 'discard')); this.log(`손에서 ${sel.length}장 버림`); }
          }
          const need = hs - this.handCount();
          if (need > 0) { const n = await this.draw(need); this.log(`카드 ${n}장 뽑음 (손 크기 ${hs})`); }
        });
      } else if (live.length > 1) {
        if (this.io.separateCleanup) {
          await this.forEachPlayer(async pi => {
            if (!this.p.hand.length) return;
            const sel = ((await this.ask({ type: 'select', title: `${this.playerName(pi)} 단계 정리: 버릴 카드를 고르세요 (선택 안 해도 됨)`, cards: this.p.hand.slice(), min: 0, max: this.p.hand.length, confirm: '확정', owner: pi })) || []).filter(u => this.p.hand.includes(u));
            if (sel.length) { sel.forEach(u => this.put(u, 'discard')); this.log(`${this.playerName(pi)} 손에서 ${sel.length}장 버림`); }
          });
        } else {
          const players = live.map(pi => ({ pi, name: this.playerName(pi), cards: this.s.ps[pi].hand.slice(), hs: this.withPlayerSync(pi, () => this.handSize()) }));
          if (players.some(pl => pl.cards.length > 0)) {
            const res = await this.ask({ type: 'cleanup', title: '플레이어 단계 정리: 버릴 카드를 고르세요', players, owner: this.s.first });
            if (res && typeof res === 'object') {
              for (const pl of players) {
                const sel = (res[pl.pi] || []).filter(u => this.s.ps[pl.pi].hand.includes(u));
                if (sel.length) await this.withPlayer(pl.pi, async () => { sel.forEach(u => this.put(u, 'discard')); this.log(`${pl.name} 손에서 ${sel.length}장 버림`); });
              }
            }
          }
        }
        await this.forEachPlayer(async pi => {
          const hs = this.handSize(), need = hs - this.handCount();
          if (need > 0) { const n = await this.draw(need); this.log(`${this.playerName(pi)} 카드 ${n}장 뽑음 (손 크기 ${hs})`); }
        });
      }
      this.readyStep = true;
      await this.forEachPlayer(async () => {
        for (const u of [this.idt()].concat(this.controlled())) {
          if (this.c(u).ex && this.d(u).type === 'upgrade') { const gate = this.myAndEncInPlay().find(x => this.sc(x).upgradeReadyGate); if (gate && !(await this.sc(gate).upgradeReadyGate(this, gate, u))) continue; } // Drained of Power
          const fr = this.c(u).att.find(a => this.sc(a).replacesReady);
          if (fr) { if (this.c(u).ex) this.discard(fr, `${this.nm(fr)}: 준비 대신 버려짐`); continue; }
          if (this.canReady(u)) this.c(u).ex = false;
        }
      });
      this.readyStep = false;
      for (const p of this.s.ps) {
        p.costRed = 0; p.phase = {}; p.turnBegun = false;
        if (p.formLock) p.formLock--;
        if (p.readyLock) p.readyLock--;
      }
      this.clearPhaseMods();
      this.log('플레이어 단계 종료 — 모든 카드를 준비 상태로', 'phase');
    }

    timingOk(t) {
      if (!t) return false;
      if (t === 'action') return true;
      if (t === 'hero') return this.isHero();
      if (t === 'alter') return !this.isHero();
      return false;
    }
    teamUpOk(d) { // Team-Up: each named character must be in play as a distinct identity (either face) or ally
      const SUB_EN = { '그웬 스테이시': 'gwen stacy', '마일스 모랄레스': 'miles morales', '피터 파커': 'peter parker', '신디 문': 'cindy moon', '트찰라': "t'challa", '슈리': 'shuri', '로건': 'logan', '주빌레이션 리': 'jubilation lee' };
      const nm = id => ((MC.cards[id] || {}).en || '').replace(/^\*\s*/, '').toLowerCase();
      const chars = [];
      for (const i of this.livingPlayers()) {
        const p = this.s.ps[i];
        chars.push([nm(p.heroId), nm(p.alterId)].filter(Boolean));
        for (const a of p.allies) {
          const ad = this.d(a), sub = ad.sub && SUB_EN[ad.sub];
          chars.push([nm(ad.id)].concat(sub ? [sub] : []).filter(Boolean));
        }
      }
      const match = (names, entry) => {
        const parts = String(entry).split('/').map(s => s.trim().toLowerCase()).filter(Boolean);
        if (parts.length > 1) return names.length > 1 ? parts.every(p => names.includes(p)) : parts.some(p => names.includes(p));
        return names.includes(parts[0]);
      };
      const used = new Set();
      const assign = idx => {
        if (idx >= d.teamUp.length) return true;
        for (let ci = 0; ci < chars.length; ci++) {
          if (used.has(ci) || !match(chars[ci], d.teamUp[idx])) continue;
          used.add(ci);
          if (assign(idx + 1)) return true;
          used.delete(ci);
        }
        return false;
      };
      return assign(0);
    }
    canPlay(uid) {
      const d = this.d(uid), S = this.sc(uid);
      if (d.type === 'resource' || d.type === 'obligation') return false;
      if (d.teamUp && !this.teamUpOk(d)) return false;
      if (d.enc && this.c(uid).zone === 'hand') return false; // Misled
      if (d.type === 'event') { const pl = S.play; if (!pl || !this.timingOk(pl.timing)) return false; if (pl.label === 'thwart' && this.cannotThwart()) return false; if (pl.label === 'attack' && this.heroNo('attack')) return false; if (pl.can && !pl.can(this, uid)) return false; if (pl.target && !this.targets(pl.target, uid).length) return false; }
      else {
        if (S.heroOnly && !this.isHero()) return false;
        if (d.unique && this.inPlay().some(u => this.d(u).name === d.name && u !== uid)) return false;
        if (d.maxPer && !S.attach && this.controlled().some(u => this.c(u).id === d.id)) return false;
        if (S.attach && !this.targets(S.attach, uid).length) return false;
        if (S.canPlay && !S.canPlay(this, uid)) return false;
      }
      if (this.myAndEncInPlay().some(x => this.sc(x).blocksPlay && this.sc(x).blocksPlay(this, x, uid))) return false;
      if (d.restricted && this.controlled().reduce((t, x) => t + (this.d(x).restricted || 0), 0) + d.restricted > this.restrictedLimit(uid)) return false; // Restricted: max 2 in play
      const cost = this.cardCost(uid); if (this.canAfford(cost, uid)) return true;
      const disc = this.c(uid).zone === 'hand' ? this.playDiscount(uid) : 0; // Star-Lord: "What could go wrong?"
      return disc > 0 && this.canAfford({ n: Math.max((cost.req || '').length, cost.n - disc), req: cost.req, only: cost.only }, uid);
    }
    playDiscount(uid) { let n = 0; for (const u of this.myAndEncInPlay()) { const f = this.sc(u).playDiscount; if (f) n += f(this, u, uid) || 0; } return n; }
    targets(spec, srcUid) {
      const kind = typeof spec === 'string' ? spec : spec.kind;
      let out = [];
      switch (kind) {
        case 'enemy': out = this.enemies(); break;
        case 'attackable': {
          out = this.guarded() && !this.ignores('guard', srcUid) ? this.engagedMinions() : this.enemies();
          const taunt = this.enemies().find(v => this.c(v).att.some(a => this.sc(a).taunt)); // Distracting Taunts
          if (taunt) out = out.filter(u => this.d(u).type !== 'villain' || u === taunt);
          out = out.concat(this.inPlay().filter(x => this.sc(x).attackableAsMinion && this.sc(x).attackableAsMinion(this, x))); // Encased in Ice: attacked as if it were a minion
          const blockers = this.myAndEncInPlay().filter(x => this.sc(x).cannotAttack);
          if (blockers.length) out = out.filter(u => !blockers.some(x => this.sc(x).cannotAttack(this, x, u, srcUid)));
          if (this.p.phase.noVillainAttack) out = out.filter(u => this.d(u).type !== 'villain'); // Face the Past
          break;
        }
        case 'minion': out = this.e.minions.slice(); break;
        case 'scheme': out = this.schemes().filter(u => this.c(u).threat > 0 || !this.isMain(u)); break;
        case 'anyScheme': out = this.schemes(); break;
        case 'encCard': out = this.schemes().concat(this.e.env || [], this.e.minions, this.e.villain ? [this.e.villain] : []); break; // Mitigated Threat
        case 'thwartable': out = this.schemes().filter(u => !(typeof this.sc(u).noThwart === 'function' ? this.sc(u).noThwart(this, u) : this.sc(u).noThwart) && !(this.d(u).type === 'side' && this.e.minions.some(m => this.sc(m).noSideThwart)) && this.c(u).threat > 0 && !(this.isMain(u) && ((this.crisis() && !this.ignores('crisis', srcUid)) || (this.patrolled() && !this.ignores('patrol', srcUid)))) && !this.noRemove(u)); break;
        case 'friendly': out = this.allFriendlyChars(); break;
        case 'character': out = this.enemies().concat(this.allFriendlyChars()); break; // Rogue: Skin Contact
        case 'damagedFriendly': out = this.allFriendlyChars().filter(u => this.c(u).dmg > 0); break;
        case 'identity': out = [this.idt()]; break;
        case 'anyIdentity': out = this.livingPlayers().map(i => this.idt(i)); break;
        case 'ally': out = this.allAllies(); break;
        case 'allyAny': out = this.allAllies().concat((this.e.mission || []).filter(u => this.d(u).type === 'ally')); break; // Desperate Measures: allies at the mission too
        case 'exhaustedAlly': out = this.allAllies().filter(u => this.c(u).ex); break;
      }
      if (spec.filter) out = out.filter(u => spec.filter(this, u, srcUid));
      if (srcUid && this.s.cards[srcUid] && this.d(srcUid).type === 'upgrade' && !this.d(srcUid).enc) out = out.filter(u => !this.sc(u).noUpgrades); // Snow Clone, Azazel
      return out;
    }
    legalActions() {
      const acts = [];
      for (const u of this.p.hand) if (this.canPlay(u)) acts.push({ kind: 'play', uid: u, label: '플레이' });
      for (const u of this.p.discard) if (this.sc(u).playFromDiscard && this.canPlay(u)) acts.push({ kind: 'play', uid: u, label: '플레이 (버림 더미)' });
      for (const u of (this.p.pset || [])) { const f = this.sc(u).playFromSetAside; if (f && f(this, u) && this.canPlay(u)) acts.push({ kind: 'play', uid: u, label: '플레이 (따로 둔 카드)' }); }
      { const tp = this.p.deck[0], f = this.sc(this.idt()).playFromDeckTop; if (tp && f && f(this, this.idt(), tp) && this.canPlay(tp)) acts.push({ kind: 'play', uid: tp, label: '플레이 (덱 맨 위)' }); } // Magik
      for (const q of this.controlled()) if (this.sc(q).playFromAttached) for (const u of this.c(q).att) if (this.canPlay(u)) acts.push({ kind: 'play', uid: u, label: `플레이 (${this.nm(q)})` });
      const id = this.idt(), ic = this.c(id);
      if (!ic.ex) {
        if (this.isHero()) {
          if (ic.stun) acts.push({ kind: 'attack', uid: id, label: '공격 (기절 해제)' });
          else if (this.targets('attackable', id).length && !this.heroNo('attack') && (!this.basicAttackCost() || this.canAfford({ n: this.basicAttackCost(), req: '' }, null))) acts.push({ kind: 'attack', uid: id, label: `공격 (${this.stat(id, 'atk')})` });
          if (this.cannotThwart()) { /* Baron Zemo */ }
          else if (ic.conf) acts.push({ kind: 'thwart', uid: id, label: '저지 (혼란 해제)' });
          else if (this.targets('thwartable').length) acts.push({ kind: 'thwart', uid: id, label: `저지 (${this.stat(id, 'thw')})` });
        } else if (ic.dmg > 0 && !this.heroNo('recover')) acts.push({ kind: 'recover', uid: id, label: `회복 (${this.stat(id, 'rec')})` });
      }
      if (!this.p.flipped && !this.formLocked() && !(this.isHero() && this.noToAlter()) && this.formCostOk()) acts.push({ kind: 'flip', uid: id, label: this.isHero() ? '일상 모습으로 변신' : '히어로로 변신' });
      for (const a of this.p.allies) {
        if (this.c(a).ex) continue;
        const ac = this.c(a);
        const ad = this.d(a);
        if (ad.atk == null && !this.sc(a).baseFn) { /* cannot attack */ }
        else if (ac.stun) acts.push({ kind: 'allyAttack', uid: a, label: '공격 (기절 해제)' });
        else if (this.targets(this.sc(a).attackFilter ? { kind: 'attackable', filter: (g, x) => this.sc(a).attackFilter(g, a, x) } : 'attackable').length && (!this.sc(a).attackCost || this.sc(a).attackCost.can(this, a)) && (!this.allyTaxOn() || this.canAfford({ n: 1, req: '' }, null))) acts.push({ kind: 'allyAttack', uid: a, label: `공격 (${this.stat(a, 'atk')}${this.d(a).atkStar ? `, 후속 피해 ${this.d(a).atkCons || 1}` : ''})` });
        if (ad.thw == null && !this.sc(a).baseFn) { /* cannot thwart */ }
        else if (ac.conf) acts.push({ kind: 'allyThwart', uid: a, label: '저지 (혼란 해제)' });
        else if (this.targets('thwartable').length && (!this.allyTaxOn() || this.canAfford({ n: 1, req: '' }, null))) acts.push({ kind: 'allyThwart', uid: a, label: `저지 (${this.stat(a, 'thw')}${this.d(a).thwStar ? ', 후속 피해 1' : ''})` });
      }
      for (const u of this.myAndEncInPlay().concat(this.p.hand.filter(h => this.sc(h).handActions))) { // handActions: Slingshot
        const ac = this.c(u).zone === 'hand' ? this.sc(u).handActions : this.sc(u).actions; if (!ac) continue;
        ac.forEach((x, i) => {
          if (!this.timingOk(x.timing)) return;
          if (x.exhaust && this.c(u).ex) return;
          if (x.once && this.p.usedOnce[u + ':' + this.c(u).id + ':' + i]) return;
          if (x.exhaustHero && (this.c(this.idt()).ex || !this.isHero())) return;
          if (x.kind === 'thwart' && this.cannotThwart()) return;
          if (x.can && !x.can(this, u)) return;
          if (x.target && !this.targets(x.target, u).length) return;
          if (x.cost && !this.canAfford(x.cost, null)) return;
          acts.push({ kind: 'use', uid: u, idx: i, label: x.label });
        });
      }
      const live = this.livingPlayers();
      if (live.length > 1) {
        for (const pi of live) {
          if (pi !== this.s.ctx && this.requestActions(pi).length > 0) acts.push({ kind: 'request', targetPlayer: pi, label: `${this.playerName(pi)}에게 요청` });
        }
      }
      const done = new Set(this.s.turnsDone || []);
      const nextPlayer = live.find(i => i !== this.s.ctx && !done.has(i));
      acts.push({ kind: 'end', label: nextPlayer != null ? `${this.playerName(nextPlayer)} 차례로 →` : '턴 종료', nextPlayer: nextPlayer != null ? nextPlayer : null });
      return acts;
    }
    requestActions(pi) {
      return this.withPlayerSync(pi, () => {
        const acts = [];
        for (const u of this.p.hand) if (this.d(u).type === 'event' && this.canPlay(u)) acts.push({ kind: 'play', uid: u, label: `${this.nm(u)} 플레이 (비용 ${this.cardCost(u).n})` });
        for (const u of this.myAndEncInPlay().concat(this.p.hand.filter(h => this.sc(h).handActions))) {
          const ac = this.c(u).zone === 'hand' ? this.sc(u).handActions : this.sc(u).actions; if (!ac) continue;
          ac.forEach((x, i) => {
            if (!this.timingOk(x.timing)) return;
            if (x.exhaust && this.c(u).ex) return;
            if (x.once && this.p.usedOnce[u + ':' + this.c(u).id + ':' + i]) return;
            if (x.exhaustHero && (this.c(this.idt()).ex || !this.isHero())) return;
            if (x.kind === 'thwart' && this.cannotThwart()) return;
            if (x.can && !x.can(this, u)) return;
            if (x.target && !this.targets(x.target, u).length) return;
            if (x.cost && !this.canAfford(x.cost, null)) return;
            acts.push({ kind: 'use', uid: u, idx: i, label: `${this.nm(u)}: ${x.label}` });
          });
        }
        return acts;
      });
    }
    async requestPlayer(pi) {
      const requester = this.s.ctx;
      await this.withPlayer(pi, async () => {
        const opts = this.requestActions(pi);
        if (!opts.length) return;
        const pick = await this.ask({
          type: 'request',
          title: `${this.playerName(requester)} → ${this.playerName(pi)}에게 행동 요청`,
          options: opts.map((a, i) => ({ id: String(i), uid: a.uid, label: a.label, act: a })),
          owner: pi
        });
        if (pick == null) return;
        const o = opts[parseInt(pick, 10)];
        if (o) await this.withReadyTax(() => this.doAction0(o));
      });
    }
    async chooseTarget(spec, title, srcUid, cancelable) {
      const cands = this.targets(spec, srcUid);
      if (!cands.length) return null;
      return await this.ask({ type: 'target', title, cands, cancelable: !!cancelable });
    }
    async doAction(a) { const r = await this.withReadyTax(() => this.doAction0(a)); await this.flushPending(); return r; }
    // Mister Fear: readying a hero or ally by a card effect costs an extra [mental]; checked once the whole action has resolved
    async withReadyTax(fn) { // Mister Fear: [mental] to ready a character; Undermine Support: 1 resource to ready a support (outside the ready step)
      const fear = () => this.engagedMinions().some(m => this.sc(m).readyTax), und = () => this.e.sides.some(x => this.sc(x).supportReadyTax);
      if (this._rtDepth || this.readyStep || !(fear() || und())) return fn();
      const pool = () => this.friendlyChars().concat(this.p.supports);
      const before = pool().filter(u => this.c(u).ex);
      this._rtDepth = 1; this._rtSeen = new Set(); let r;
      try { r = await fn(); } finally { this._rtDepth = 0; }
      const readied = [...new Set(before.concat([...this._rtSeen]))].filter(u => this.c(u).zone && !this.c(u).ex && pool().includes(u)); this._rtSeen = null;
      for (const u of readied) {
        const sup = this.p.supports.includes(u); if (sup ? !und() : !fear()) continue;
        const cost = sup ? { n: 1, req: '' } : { n: 1, req: 'B' }, lb = sup ? '지원 약화' : '미스터 피어';
        const paid = this.canAfford(cost, null) ? await this.pay(cost, null, `${lb}: ${this.nm(u)}을(를) 준비시키려면 ${sup ? '자원' : '[정신]'} 1`, true) : null;
        if (paid == null) { this.c(u).ex = true; this.log(`${lb}: 비용을 내지 않아 ${this.nm(u)}은(는) 준비되지 않습니다`, 'warn'); }
      }
      return r;
    }
    allyTaxOn() { return this.e.sides.some(x => this.sc(x).allyTax); } // Divided Loyalties
    async payAllyTax(a, what) {
      if (!this.allyTaxOn()) return true;
      if (!this.canAfford({ n: 1, req: '' }, null)) { this.log(`분열된 충성: 자원이 없어 ${this.nm(a)}(으)로 ${what}할 수 없습니다`, 'warn'); return false; }
      return (await this.pay({ n: 1, req: '' }, null, `분열된 충성: ${this.nm(a)}(으)로 ${what}하려면 자원 1`, true)) != null;
    }
    async doAction0(a) {
      switch (a.kind) {
        case 'play': return this.playCard(a.uid);
        case 'attack': return this.basicAttack();
        case 'thwart': return this.basicThwart();
        case 'recover': {
          const id = this.idt(); this.c(id).ex = true;
          const rr = this.c(id).att.find(a => this.sc(a).replacesRecovery); if (rr) { this.discard(rr, `${this.nm(rr)}: 회복 대신 버립니다`); return; } // Death Factor
          const h = this.heal(id, this.stat(id, 'rec'));
          this.log(`${this.nm(id)} 회복: 피해 ${h} 회복`);
          await this.trigger('afterRecover', { healed: h }); // Peter Porker
          if (this.c(id).zone) await this.window('afterBasicPower', { kind: 'recover' }); // Improved Recovery Upgrade
          return;
        }
        case 'flip': return this.changeForm();
        case 'allyAttack': return this.allyAttack(a.uid);
        case 'allyThwart': return this.allyThwart(a.uid);
        case 'use': return this.useAction(a.uid, a.idx);
      }
    }
    flip(free) {
      this.p.form = this.isHero() ? 'alter' : 'hero';
      if (!free) this.p.flipped = true;
      this.c(this.idt()).id = this.isHero() ? this.p.heroId : this.p.alterId;
      this.log(`${this.nm(this.idt())}(으)로 변신`);
    }
    heroForms() { const H = MC.heroes[this.p.heroKey || this.s.heroKey] || {}; return H.forms || [this.p.heroId]; }
    inHeroForm(trait) { return this.isHero() && (this.d(this.idt()).tr || []).includes(trait); } // Giant / Tiny
    formLabel(id) { const d = MC.cards[id]; return `${d.name} (${(d.traits || []).slice(-1)[0] || ''} · 공격 ${d.atk} 저지 ${d.thw} 방어 ${d.def})`; }
    async changeForm(free) {
      if (this.formLocked()) { this.log('모습을 바꿀 수 없습니다'); return; }
      if (this.isHero() && this.noToAlter()) { this.log('지금은 일상 모습으로 바꿀 수 없습니다'); return; }
      if (!free) for (const x of (this.p.obl || []).slice()) { const f = this.sc(x).formChangeCost; if (f && (await f(this, x)) === false) return; } // Work-Life Balance
      if (!free && !this.isHero() && this.s.phase === 'player' && (this.p.obl || []).some(x => this.sc(x).pairToHero)) { // Grounded: spend 2 resources of the same type to change to hero form
        const ts = ['Y', 'B', 'R', 'G'].filter(t => this.canAfford({ n: 2, req: t + t }, null));
        if (!ts.length) { this.log('외출 금지: 같은 종류 자원 2개가 없어 히어로로 변신할 수 없습니다', 'warn'); return; }
        const RK = { Y: '에너지', B: '정신', R: '물리', G: '와일드' };
        const t = ts.length === 1 ? ts[0] : await this.ask({ type: 'choice', title: '외출 금지: 같은 종류 자원 2개를 내세요', options: ts.map(x => ({ id: x, label: `${RK[x]} 2개` })) });
        if ((await this.pay({ n: 2, req: t + t }, null, '외출 금지: 변신 추가 비용', true)) == null) return;
      }
      const fs = this.heroForms();
      if (!this.isHero() && fs.length > 1) {
        const pick = await this.ask({ type: 'choice', title: '어느 히어로 모습으로 변신할까요?', options: fs.map(id => ({ id, label: this.formLabel(id) })) });
        if (fs.includes(pick)) this.p.heroId = pick;
      }
      this.flip(free);
      await this.trigger('formChanged', { form: this.p.form });
      await this.window('afterChangeForm', { form: this.p.form });
    }
    // "change to your other hero form" / "change to your [Giant] hero form": a form change that is not a flip
    async changeHeroForm(trait) {
      if (!this.isHero() || this.formLocked()) return false;
      const fs = this.heroForms();
      const to = trait ? fs.find(x => (MC.cards[x].tr || []).includes(trait)) : fs.find(x => x !== this.p.heroId);
      if (!to || to === this.p.heroId) return false;
      this.p.heroId = to; this.c(this.idt()).id = to;
      this.log(`${MC.cards[to].name}: ${(MC.cards[to].traits || []).slice(-1)[0] || ''} 모습으로 바꿈`);
      await this.trigger('formChanged', { form: 'hero', heroForm: to });
      await this.window('afterChangeForm', { form: 'hero', heroForm: to });
      return true;
    }
    async basicAttack() {
      const id = this.idt();
      if (this.c(id).stun) { this.c(id).ex = true; this.c(id).stun = false; this.log(`${this.nm(id)}: 기절 상태라 공격 대신 기절 해제`); return; }
      if (this.c(id).att.some(a => this.sc(a).blocksHeroAttack)) { this.c(id).ex = true; this.webbedUp(); return; }
      if (this.c(id).att.some(a => this.sc(a).tangles)) { this.c(id).ex = true; this.tangled(); return; }
      const t = await this.chooseTarget('attackable', '공격할 적을 고르세요', id, true);
      if (!t) return;
      const extra = this.basicAttackCost();
      if (extra && !(await this.pay({ n: extra, req: '' }, null, `기본 공격 추가 비용 ${extra}`, true))) return;
      this.c(id).ex = true;
      const bp = { kind: 'attack', target: t, bonus: 0 }; await this.window('basicPowerUsed', bp);
      const props = { overkill: !!bp.overkill, basic: true }; if (bp.piercing) props.piercing = true;
      for (const u of this.myAndEncInPlay()) { const f = this.sc(u).basicAttackPlus; if (f) Object.assign(props, f(this, u) || {}); }
      const made = await this.attackWith(id, t, this.stat(id, 'atk') + bp.bonus + this.vsBonus('atk', id, t), '기본 공격', props);
      await this.trigger('basicHeroPower', { kind: 'attack' });
      if (this.c(id).zone) await this.window('afterBasicPower', { kind: 'attack' });
      for (const f of (bp.after || [])) await f(this, made);
      if (made !== false) await this.window('afterBasicAttack', { target: t });
    }
    async attackWith(src, target, amount, label, extra) { // a player character attacks (stun check)
      const sc = this.c(src);
      if (sc.stun) { sc.stun = false; this.log(`${this.nm(src)}: 기절 상태라 공격 대신 기절 해제`); return false; }
      this.log(`${this.nm(src)} ${label || '공격'} → ${this.nm(target)} ${amount}`);
      const bp = this.sc(src).basicAttackProps; // Black Knight (piercing), War Machine (ranged)
      const plus = src === this.idt() && extra && extra.basic ? this.myAndEncInPlay().map(x => { const f = this.sc(x).heroBasicAttackPlus; return f ? f(this, x) : null; }).filter(Boolean) : []; // Laser Goggles
      await this.playerAttack(src, target, amount, Object.assign({}, typeof bp === 'function' ? bp(this, src) : bp, ...plus, extra || {}));
      return true;
    }
    // damage from an attack made by a friendly character (basic power, ally, or an (attack) event)
    async playerAttack(attacker, target, amount, o) {
      o = o || {};
      if (attacker === this.idt()) await this.trigger('heroAttacking', { target }); // Nick Fury: Break Cover
      await this.trigger('friendlyAttacking', { attacker, target }); // Caught in the Crossfire: any friendly character
      if (attacker === this.idt()) for (const u of this.myAndEncInPlay()) { const f = this.sc(u).heroAttackPlus; if (f) { const pr = f(this, u); if (pr) o = Object.assign({}, o, pr); } } // Nebula: Cutthroat Ambition
      if (attacker === this.idt()) for (const u of this.myAndEncInPlay().slice()) { const f = this.sc(u).heroAttackBoost; if (f) { const r = await f(this, u, target); if (r) { amount += r.amount || 0; if (r.overkill) o = Object.assign({}, o, { overkill: true }); } } } // Finishing Blow
      if (this.c(target) && this.c(target).att.some(x => this.sc(x).attacksGainOverkill)) o = Object.assign({}, o, { overkill: true }); // Marked
      const type = this.d(target).type;
      if (this.curEvent && this.curEvent.dmgBonus && attacker === this.idt()) amount += this.curEvent.dmgBonus;
      if (attacker === this.idt() && o.ranged) { const rw = { target, bonus: 0 }; await this.window('heroRangedAttack', rw); amount += rw.bonus; } // Sharpshooter
      if (attacker === this.idt() && (o.ranged || o.piercing || o.overkill)) { const kw = { target, bonus: 0 }; await this.window('heroKeywordAttack', kw); amount += kw.bonus; } // Directed Force
      if (attacker === this.idt()) for (const a of this.c(attacker).att.slice()) { const f = this.sc(a).beforeHeroAttack; if (f) { const nt = await f(this, a, target); if (nt && this.c(nt) && this.c(nt).zone) target = nt; } } // Psionic Illusion
      if (o.piercing && (this.sc(target).noPiercingVs || this.c(target).att.some(a => this.sc(a).noPiercingVs))) o = Object.assign({}, o, { piercing: false });
      if (o.piercing && this.c(target).tough) { const k = 1 + (this.c(target).toughX || 0); this.c(target).tough = false; this.c(target).toughX = 0; this.log(`관통: ${this.nm(target)}의 강인함 제거`); for (let i = 0; i < k; i++) await this.toughGone(target); }
      for (const a of this.c(target).att) amount += this.sc(a).attackedBonus || 0; // Cruisin' for a Bruisin'
      const ba = this.sc(target).beforeAttacked; if (ba) { await ba(this, target, attacker); if (!this.c(attacker).zone || !this.c(target).zone) return { dealt: 0, excess: 0 }; } // Speed Demon strikes first
      const actx = { attacker, target, amount, prevent: false, after: [], basic: !!o.basic, ranged: !!o.ranged };
      { const bx = this.sc(target).beforeAttackedCtx; if (bx) { await bx(this, target, actx); if (actx.retarget && this.c(actx.retarget) && this.c(actx.retarget).zone) { target = actx.retarget; actx.target = target; } amount = actx.amount; } } // Black Widow: Preparation
      for (const a of this.c(target).att.slice()) { const f = this.sc(a).on && this.sc(a).on.hostAttacked; if (f && !actx.prevent) await f(this, a, actx); }
      const r = actx.prevent ? { dealt: 0, excess: 0 } : await this.dealDamage(target, amount, { src: o.src || attacker, attacker, byPlayer: true, attack: true, ranged: !!o.ranged });
      if (r.excess > 0 && attacker === this.idt()) { const xc = { excess: r.excess, target }; await this.window('heroAttackExcess', xc); r.excess = xc.excess; }
      if (r.dealt) await this.trigger('attackDealt', { attacker, target, dealt: r.dealt });
      if (o.overkill && r.excess > 0 && type === 'minion' && this.e.villain) {
        this.log(`압도: 남은 피해 ${r.excess} → ${this.nm(this.e.villain)}`);
        await this.dealDamage(this.e.villain, r.excess, { src: o.src || attacker, byPlayer: true, attack: true, overkill: true });
      }
      if (r.defeated) await this.window('afterAttackDefeat', { attacker, target, type, excess: r.excess || 0, src: o.src || attacker });
      else if (this.c(target).zone && this.c(attacker).zone && !o.ranged) {
        const ret = this.stat(target, 'retaliate');
        if (ret > 0) { this.log(`보복: ${this.nm(target)} → ${this.nm(attacker)} 피해 ${ret}`); await this.dealDamage(attacker, ret, { src: target }); }
      }
      await this.trigger('afterAttack', { attacker, target });
      if (attacker === this.idt()) await this.window('heroAttacked', { target });
      for (const f of actx.after) await f(this, r); // Preparation: "after this attack"
      if (attacker === this.idt() && type === 'villain') { const gm = this.e.minions.filter(m => this.kw(m, 'guard')); if (gm.length) await this.window('ignoredGuard', { minions: gm }); } // Acute Control
      return r;
    }
    thwStat(src, t) { if (this.assault(t)) return 'atk'; return this.sc(t).thwartWithAtk && this.stat(src, 'atk') > this.stat(src, 'thw') ? 'atk' : 'thw'; } // Rescue in the Rubble: ATK may be used instead
    assault(t) { return !!(this.c(t) && (this.d(t).assault || this.c(t).att.some(a => this.sc(a).grantAssault))); } // Embody Pathos
    async basicThwart() {
      const id = this.idt();
      if (this.c(id).conf) { this.c(id).ex = true; this.c(id).conf = false; this.log(`${this.nm(id)}: 혼란 상태라 저지 대신 혼란 해제`); return; }
      if (this.c(id).att.some(a => this.sc(a).tangles)) { this.c(id).ex = true; this.tangled(); return; }
      const tf = this.myAndEncInPlay().map(x => this.sc(x).basicThwartFilter).filter(Boolean); // Retinal Display: only the scheme with the most threat
      const t = tf.length ? await (async () => { const c = this.targets('thwartable', id).filter(u => tf.every(f => f(this, u))); if (!c.length) return null; return c.length === 1 ? c[0] : await this.ask({ type: 'target', title: '위협을 제거할 음모를 고르세요', cands: c, cancelable: true }); })() : await this.chooseTarget('thwartable', '위협을 제거할 음모를 고르세요', id, true);
      if (!t) return;
      this.c(id).ex = true;
      { const ig = this.myAndEncInPlay().flatMap(x => { const f = this.sc(x).basicThwartIgnores; return f ? f(this, x) || [] : []; }); if (ig.length) { this.p.ignoreNow = (this.p.ignoreNow || []).concat(ig); this.p.ignoreNowBasic = ig; } }
      const bp = { kind: 'thwart', target: t, bonus: 0 }; await this.window('basicPowerUsed', bp);
      await this.thwartWith(id, t, this.stat(id, this.thwStat(id, t)) + bp.bonus + this.vsBonus('thw', id, t));
      if (this.p.ignoreNowBasic) { const ig = this.p.ignoreNowBasic; this.p.ignoreNow = (this.p.ignoreNow || []).filter(k => !ig.includes(k)); this.p.ignoreNowBasic = null; }
      for (const f of (bp.after || [])) await f(this);
      await this.trigger('basicHeroPower', { kind: 'thwart' });
      await this.window('afterBasicPower', { kind: 'thwart' });
    }
    async thwartWith(src, scheme, amount) {
      const sc = this.c(src);
      { const xc = this.sc(scheme).thwartExtraCost; if (xc) await xc(this, scheme, src); } // Cat Stuck in a Tree
      const tv = this.sc(scheme).thwartValue; if (tv) amount = tv(this, scheme, src, amount);
      if (sc.conf) { sc.conf = false; this.log(`${this.nm(src)}: 혼란 상태라 저지 대신 혼란 해제`); return false; }
      const tc = this.sc(scheme).thwartCost; if (tc && !(await this.pay(tc, null, `${this.nm(scheme)}: 저지 추가 비용`, false))) { this.log('추가 비용을 내지 못해 저지할 수 없습니다'); return false; }
      const r = await this.removeThreat(scheme, amount, { src, thwPaid: true });
      this.log(`${this.nm(src)} 저지 → ${this.nm(scheme)} 위협 ${r} 제거`);
      const cleared = r > 0 && this.c(scheme).threat === 0;
      this.lastThwart = { scheme, removed: r };
      await this.afterThreatRemoved(scheme);
      if (src === this.idt()) await this.window('afterHeroThwart', { scheme, removed: r, cleared });
      { const at = this.sc(scheme).afterThwarted; if (at && this.c(scheme).zone) await at(this, scheme, src); } // Back Alley Robbery
      return true;
    }
    async allyAttack(a) {
      if (this.c(a).stun) { this.c(a).ex = true; this.c(a).stun = false; this.log(`${this.nm(a)}: 기절 상태라 공격 대신 기절 해제`); return; }
      const af = this.sc(a).attackFilter;
      const t = await this.chooseTarget(af ? { kind: 'attackable', filter: (g, x) => af(g, a, x) } : 'attackable', `${this.nm(a)}: 공격할 적`, a, true);
      if (!t) return;
      if (!(await this.payAllyTax(a, '공격'))) return;
      const ac = this.sc(a).attackCost; if (ac && !(await ac.pay(this, a))) return;
      this.c(a).ex = true;
      const pw = { ally: a, kind: 'attack', target: t, bonus: 0, after: [] };
      if (!this.c(a).stun) await this.window('allyPowerUsed', pw);
      const okill = pw.overkill || this.c(a).att.some(x => this.sc(x).grantOverkill) || !!(this.sc(a).selfOverkill && this.sc(a).selfOverkill(this, a)); // Snowguard
      if (this.c(a).att.some(x => this.sc(x).grantPiercing) || this.sc(a).selfPiercing) pw.piercing = true; // Wolverine (ally), Wolfsbane
      if (this.c(a).att.some(x => this.sc(x).grantRanged)) pw.ranged = true;
      const ca = this.sc(a).customAttack; // Bombshell: damage divided among enemies
      const did = ca ? await (async () => { if (this.c(a).stun) { this.c(a).stun = false; this.log(`${this.nm(a)}: 기절 상태라 공격 대신 기절 해제`); return false; } await ca(this, a, this.stat(a, 'atk') + pw.bonus, { overkill: okill, piercing: pw.piercing, ranged: pw.ranged, target: t }); return true; })() : await this.attackWith(a, t, this.stat(a, 'atk') + pw.bonus + this.vsBonus('atk', a, t), '공격', Object.assign(okill ? { overkill: true } : {}, pw.piercing ? { piercing: true } : {}, pw.ranged ? { ranged: true } : {}));
      const consRed = (this.c(t) && this.c(t).att.some(x => this.sc(x).reduceAllyCons) ? 1 : 0) + (this.sc(a).consRedVs && this.sc(a).consRedVs(this, a, t) ? 1 : 0); // Coordinated Attack, Snow Clone
      if (did && this.d(a).atkStar && this.c(a).zone === 'ally' && !pw.noCons && !this.p.phase.noAllyCons && (this.d(a).atkCons || 1) - consRed - (pw.consMinus || 0) > 0) await this.dealDamage(a, (this.d(a).atkCons || 1) - consRed - (pw.consMinus || 0), { consequential: true });
      if (did && this.c(a).zone === 'ally') await this.window('afterAllyAttack', { ally: a, target: t, defeated: !this.c(t).zone || !['villain', 'minion'].includes(this.c(t).zone) });
      if (did && this.c(a).zone === 'ally') await this.trigger('allyBasicPower', { ally: a, kind: 'attack' });
      for (const f of pw.after) await f(this);
    }
    async allyThwart(a) {
      if (this.c(a).conf) { this.c(a).ex = true; this.c(a).conf = false; this.log(`${this.nm(a)}: 혼란 상태라 저지 대신 혼란 해제`); return; }
      const t = await this.chooseTarget('thwartable', `${this.nm(a)}: 위협을 제거할 음모`, a, true);
      if (!t) return;
      if (!(await this.payAllyTax(a, '저지'))) return;
      this.c(a).ex = true;
      const pw = { ally: a, kind: 'thwart', target: t, bonus: 0, after: [] };
      if (!this.c(a).conf) await this.window('allyPowerUsed', pw);
      const did = await this.thwartWith(a, t, this.stat(a, this.thwStat(a, t)) + pw.bonus + this.vsBonus('thw', a, t));
      for (const f of pw.after) await f(this);
      if (did) await this.window('afterAllyThwart', Object.assign({ ally: a }, this.lastThwart || {}));
      { const cr = (this.sc(a).consRedVs ? (this.sc(a).consRedVs(this, a, t) ? 1 : 0) : 0) + (pw.consMinus || 0); if (did && this.d(a).thwStar && this.c(a).zone === 'ally' && !pw.noCons && !this.p.phase.noAllyCons && (this.d(a).thwCons || 1) - cr > 0) await this.dealDamage(a, (this.d(a).thwCons || 1) - cr, { consequential: true }); } // Dagger
      if (did && this.c(a).zone === 'ally') await this.trigger('allyBasicPower', { ally: a, kind: 'thwart' });
    }
    async useAction(uid, idx) {
      const x = (this.c(uid).zone === 'hand' ? this.sc(uid).handActions : this.sc(uid).actions)[idx];
      let target = null;
      if (x.target) { target = await this.chooseTarget(x.target, `${x.label}: 대상`, uid, true); if (!target) return; }
      let paid = [];
      if (x.cost) { paid = await this.pay(x.cost, null, `${this.nm(uid)}: 비용 지불`, true); if (paid == null) return; }
      if (x.exhaust) this.c(uid).ex = true;
      if (x.once) this.p.usedOnce[uid + ':' + this.c(uid).id + ':' + idx] = true;
      if (x.exhaustHero) this.c(this.idt()).ex = true;
      this.log(`${this.nm(uid)}: ${x.label}`);
      if (await this.statusBlocks(x.kind)) { this.cleanupUses(uid); return; }
      await x.use(this, uid, { target, paid });
      if (this.hasTrait(uid, 'PREPARATION')) await this.trigger('preparationUsed', { card: uid });
      this.cleanupUses(uid);
    }
    // an attack/thwart made by your identity while stunned/confused only removes the status
    tangled() { if (!this.isHero()) return false; const w = this.c(this.idt()).att.find(a => this.sc(a).tangles); if (!w) return false; const ot = this.sc(w).onTangle; if (ot) ot(this, w); else this.discard(w, `${this.nm(w)}: 행동 대신 버려집니다`); return true; } // Tangled Up, Bear Hug
    webbedUp() { // Webbed Up (Symbiotic Strength): when your hero would attack, discard it instead, then you are stunned
      if (!this.isHero()) return false; const w = this.c(this.idt()).att.find(a => this.sc(a).blocksHeroAttack); if (!w) return false;
      this.discard(w, `${this.nm(w)}: 공격 대신 버리고 기절합니다`); this.giveStatus(this.idt(), 'stun', this.nm(w)); return true;
    }
    async statusBlocks(kind) {
      const c = this.c(this.idt());
      if (kind === 'attack' && c.stun) { c.stun = false; this.log(`${this.nm(this.idt())}: 기절 상태라 공격 대신 기절 해제`); return true; }
      if (kind === 'attack' && this.webbedUp()) return true;
      if ((kind === 'attack' || kind === 'thwart') && this.tangled()) return true;
      if (kind === 'thwart' && c.conf) { c.conf = false; this.log(`${this.nm(this.idt())}: 혼란 상태라 저지 대신 혼란 해제`); return true; }
      return false;
    }
    cleanupUses(uid) {
      const c = this.c(uid); const u = this.d(uid).uses;
      if (u && c.zone && c.zone !== 'discard' && (c.cnt[u.kind] || 0) <= 0) this.discard(uid, `${this.nm(uid)}: 카운터가 모두 사라져 버려짐`);
    }

    async playCard(uid) {
      const d = this.d(uid), S = this.sc(uid);
      let target = null;
      const spec = d.type === 'event' ? S.play.target : S.attach;
      if (spec) { target = await this.chooseTarget(spec, `${d.name}: 대상을 고르세요`, uid, true); if (!target) return; }
      this.playTarget = target; const cost = this.cardCost(uid); this.playTarget = null;
      const from = { zone: this.c(uid).zone, on: this.c(uid).on };
      if (from.zone === 'hand') { const pc = { card: uid, reduce: 0, cost }; await this.window('playingCard', pc); if (pc.reduce) cost.n = Math.max((cost.req || '').length, cost.n - pc.reduce); }
      this.put(uid, 'limbo');
      const paid = await this.pay(cost, uid, `${d.name} 비용 ${cost.n}`, true);
      if (paid == null) { if (from.zone === 'deck') this.put(uid, 'deck', null, true); else this.put(uid, ['attach', 'discard', 'pset'].includes(from.zone) ? from.zone : 'hand', from.on); return; }
      if (this.p.costRed) this.p.costRed = 0;
      for (const u of this.inPlay()) { const S2 = this.sc(u); if (S2.costMod && S2.costUsed && S2.costMod(this, u, uid)) S2.costUsed(this, u, uid); }
      if (d.type === 'ally') { this.p.usedOnce.allyPlayed = true; this.p.phase.nextAllyRed = 0; }
      this.tollPaid(uid);
      this.log(`${d.name} 플레이`, 'play');
      this.notePlayed(uid);
      await this.trigger('cardPlayed', { card: uid, from: from.zone });
      if (this.c(uid).playCancelled) { delete this.c(uid).playCancelled; this.discard(uid, `${d.name}: 효과가 취소되어 버려집니다`); return; } // Spellcasting
      await this.resolvePlayed(uid, target, paid);
      await this.window('cardPlayedDone', { card: uid }); // Nebula (Cybernetic Upgrades), Guardians of the Galaxy
    }
    notePlayed(uid) {
      this.p.usedOnce.cardsPlayed = (this.p.usedOnce.cardsPlayed || 0) + 1;
      if (this.d(uid).type === 'event') { const t = this.p.phase.evTraits = this.p.phase.evTraits || []; for (const x of (this.d(uid).tr || [])) if (!t.includes(x)) t.push(x); }
    }
    async resolvePlayed(uid, target, paid) {
      const d = this.d(uid), S = this.sc(uid);
      const ctx = { target, paid };
      if (d.type === 'event') {
        const pl = S.play;
        const ev = { card: uid, dmgBonus: (this.p.aggr || 0) + ((d.tr || []).includes('ATTACK') ? this.p.phase.atkEvBonus || 0 : 0), thwBonus: this.p.passion || 0, paid }; this.p.passion = 0; this.p.aggr = 0; // Aggressive Energy
        await this.window('eventPlayed', ev); // Embiggen!, Shrink
        const prev = this.curEvent; this.curEvent = ev;
        try { if (!this.eventCancelled(uid) && !(await this.statusBlocks(pl.label))) await pl.resolve(this, uid, ctx); } finally { this.curEvent = prev; }
        await this.afterEvent(uid);
        return;
      }
      if (d.type === 'ally') {
        for (const x of this.inPlay()) { const f = this.sc(x).allyToMission; if (f && await f(this, x, uid)) { this.p.phase.missionAlly = false; this.put(uid, 'mission'); this.c(uid).ex = false; this.log(`${d.name}을(를) 임무에 보냅니다 (문구 없음)`, 'play'); await this.trigger('missionAllyPlayed', { ally: uid }); return; } } // Age of Apocalypse: Mission Team
        this._enterCtx = ctx; try { await this.putAllyIntoPlay(uid); } finally { this._enterCtx = null; }
        if (S.onPlay && this.c(uid).zone === 'ally') await S.onPlay(this, uid, ctx);
        return;
      } else if (d.type === 'support') this.put(uid, 'support');
      else if (d.type === 'pside') { await this.enterSide(uid, {}); this.log(`플레이어 부가 음모 「${d.name}」 (위협 ${this.c(uid).threat})`, 'play'); } // Cable: player side schemes
      else if (d.type === 'upgrade') {
        if (target && target !== this.idt()) this.put(uid, 'attach', target);
        else this.put(uid, 'upgrade');
      }
      if (d.uses) this.c(uid).cnt[d.uses.kind] = d.uses.n;
      if (S.onPlay) await S.onPlay(this, uid, ctx);
      if (S.onEnter) await S.onEnter(this, uid, ctx);
    }
    tollPaid(uid) { // Physical Toll: discarded after you play an event
      if (this.d(uid).type !== 'event' || !this.p.toll) return;
      const t = this.p.toll; this.p.toll = null; if (this.c(t).zone) this.discard(t, `${this.nm(t)} 버림`);
    }
    eventCancelled(uid) {
      { const m = this.e.minions.find(x => this.sc(x).cancelsEventFn && this.sc(x).cancelsEventFn(this, x, uid)); if (m) { this.c(m).dmg += 1; this.e.needDefeatCheck = true; this.log(`${this.nm(m)}: 「${this.nm(uid)}」의 효과를 취소하고 피해 1을 받습니다`, 'warn'); return true; } } // Stryfe (Cable nemesis)
      const cs = this.c(this.idt()).att.find(a => this.sc(a).cancelsEvent) || (this.e.villain && this.c(this.e.villain).att.find(a => this.sc(a).cancelsEvent)); // Grappling Hook
      if (!cs) return false;
      this.discard(cs); this.log(`${this.nm(cs)}: 「${this.nm(uid)}」의 효과를 취소하고 버립니다`, 'warn');
      return true;
    }
    async afterEvent(uid) { // Ms. Marvel can return Attack/Thwart/Defense events to hand
      await this.window('eventResolved', { card: uid, tr: this.d(uid).tr || [] }); // Gamora
      if (this.c(uid).zone === 'limbo') await this.window('afterEventPlayed', { card: uid });
      if (this.c(uid).zone === 'limbo' && this.p.returnEvent === uid) { this.p.returnEvent = null; this.put(uid, 'hand'); this.log(`${this.nm(uid)}: 손으로 돌아옵니다`, 'good'); } // Avian Anatomy
      if (this.c(uid).zone === 'limbo') this.put(uid, 'discard');
    }
    freeAlly(u) { const f = this.sc(u).noAllyLimit; return typeof f === 'function' ? !!f(this, u) : !!f; } // New Recruits: only while you have a Mutant or X-Men identity
    countedAllies() { return this.p.allies.filter(a => !this.freeAlly(a)).length; }
    async putAllyIntoPlay(uid) {
      while (!this.freeAlly(uid) && this.countedAllies() >= this.allyLimit()) {
        const old = await this.ask({ type: 'target', title: `동료는 최대 ${this.allyLimit()}명입니다. 버릴 동료를 고르세요`, cands: this.p.allies.filter(a => !this.freeAlly(a)), cancelable: false });
        this.discard(old, `${this.nm(old)} 버림 (동료 한도)`);
      }
      this.put(uid, 'ally');
      if (this.d(uid).toughness) this.c(uid).tough = true;
      while (this.countedAllies() > this.allyLimit()) { // e.g. a non-Avenger ally turns off Avengers Tower
        const old = await this.ask({ type: 'target', title: `동료는 최대 ${this.allyLimit()}명입니다. 버릴 동료를 고르세요`, cands: this.p.allies.filter(a => !this.freeAlly(a)), cancelable: false });
        this.discard(old, `${this.nm(old)} 버림 (동료 한도)`);
      }
      const oe = this.sc(uid).onEnter; if (oe && this.c(uid).zone === 'ally') await oe(this, uid, this._enterCtx || {}); // "after X enters play"
      if (this.c(uid).zone === 'ally') await this.trigger('allyEnters', { ally: uid }); // Slippery Conditions
      if (this.c(uid).zone === 'ally') await this.window('allyEntered', { ally: uid }); // Utopia, Danger Room
    }

    // ------------------------------------------------------------ windows (interrupts / responses)
    // Collects optional abilities for a timing window: events in hand (script.interrupt) and
    // abilities of cards in play (script.respond). Forced effects use trigger().
    windowOptions(name, ctx, onlyAnyPlayer) {
      const CROSS_PLAYER_CARDS = new Set([
        '16153', '19015', '23034', '28003', '32011', '42014', // wouldTakeAttackDamage
        '09021', '15008', '16162', '40012', '52013', '52018', '53037', '55053', // identityWouldTakeDamage
        '20028', // tookAttackDamage
        '42019', '48015', '48020', // afterHeroDefends
        '32173b' // afterPlayerDefeatsMinion ("any player may trigger")
      ]);
      const opts = [];
      for (const u of this.p.hand) {
        const it = this.sc(u).interrupt;
        if (!it || !(it.window === name || (it.windows || []).includes(name))) continue;
        if (onlyAnyPlayer && !it.anyPlayer && !CROSS_PLAYER_CARDS.has(this.c(u).id)) continue;
        if (it.timing === 'hero' && !this.isHero()) continue;
        if (it.timing === 'alter' && this.isHero()) continue;
        if (this.d(u).teamUp && !this.teamUpOk(this.d(u))) continue;
        if (it.can && !it.can(this, u, ctx)) continue;
        if (!this.canAfford(it.cost || this.cardCost(u), u)) continue;
        opts.push({ id: u, kind: 'card', uid: u, label: it.label ? `${this.nm(u)}: ${it.label}` : `${this.nm(u)} 플레이` });
      }
      const pool = this.players > 1 ? this.myAndEncInPlay() : this.inPlay();
      for (const u of pool) {
        const rs = this.sc(u).respond; if (!rs) continue;
        rs.forEach((r, i) => {
          if (r.window !== name) return;
          if (onlyAnyPlayer && !r.anyPlayer && !CROSS_PLAYER_CARDS.has(this.c(u).id)) return;
          if (r.timing === 'hero' && !this.isHero()) return;
          if (r.timing === 'alter' && this.isHero()) return;
          if (r.exhaust && this.c(u).ex) return;
          if (r.once && this.p.usedOnce[u + ':' + this.c(u).id + ':r' + i]) return;
          if (r.can && !r.can(this, u, ctx)) return;
          if (r.cost && !this.canAfford(r.cost, null)) return;
          opts.push({ id: u + ':' + i, kind: 'respond', uid: u, idx: i, label: `${this.nm(u)}: ${r.label}` });
        });
      }
      return opts;
    }
    async window(name, ctx, title) { const ef = this.encFx; this.encFx = 0; try { return await this.withReadyTax(() => this.window0(name, ctx, title)); } finally { this.encFx = ef; } } // player responses are not encounter effects
    async resolveWindowOption(o, ctx) {
      if (o.kind === 'card') {
        const cost = this.sc(o.uid).interrupt.cost || this.cardCost(o.uid);
        this.put(o.uid, 'limbo');
        const paid = await this.pay(cost, o.uid, `${this.nm(o.uid)} 비용 ${cost.n}`, true);
        if (paid == null) { this.put(o.uid, 'hand'); return false; }
        if (this.p.costRed) this.p.costRed = 0;
        this.log(`${this.nm(o.uid)} 플레이`, 'play');
        this.notePlayed(o.uid);
        this.tollPaid(o.uid);
        await this.trigger('cardPlayed', { card: o.uid });
        const ev = { card: o.uid, dmgBonus: (this.p.aggr || 0) + ((this.d(o.uid).tr || []).includes('ATTACK') ? this.p.phase.atkEvBonus || 0 : 0), thwBonus: this.p.passion || 0, paid }; this.p.passion = 0; this.p.aggr = 0;
        if (this.d(o.uid).type === 'event') await this.window('eventPlayed', ev);
        const prevEv = this.curEvent; this.curEvent = ev;
        try { if (!this.eventCancelled(o.uid)) await this.sc(o.uid).interrupt.resolve(this, o.uid, ctx, paid); } finally { this.curEvent = prevEv; }
        await this.afterEvent(o.uid);
        if (this.d(o.uid).type === 'event') await this.window('reactionEventResolved', { card: o.uid });
      } else {
        const r = this.sc(o.uid).respond[o.idx];
        if (r.cost) { const paid = await this.pay(r.cost, null, `${this.nm(o.uid)}: 비용 지불`, true); if (paid == null) return false; }
        if (r.exhaust) this.c(o.uid).ex = true;
        if (r.once) this.p.usedOnce[o.uid + ':' + this.c(o.uid).id + ':r' + o.idx] = true;
        this.log(`${this.nm(o.uid)}: ${r.label}`);
        await r.resolve(this, o.uid, ctx);
        if (this.hasTrait(o.uid, 'PREPARATION')) await this.trigger('preparationUsed', { card: o.uid });
      }
      return true;
    }
    async window0(name, ctx, title) {
      const used = new Set();
      const LOCAL_WINDOWS = new Set([
        'wouldTakeAttackDamage', 'identityWouldTakeDamage', 'afterHeroDefends', 'heroDefends',
        'afterBasicAttack', 'basicPowerUsed', 'afterBasicPower', 'afterHeroThwart',
        'heroAttacked', 'heroAttackExcess', 'heroRangedAttack', 'heroKeywordAttack',
        'afterChangeForm', 'playingCard', 'eventPlayed', 'eventResolved', 'afterEventPlayed',
        'reactionEventResolved', 'cardPlayedDone', 'deckReset', 'afterPlayerDefeatsMinion',
        'tookAttackDamage', 'ignoredGuard', 'ignoredPatrol', 'ignoredCrisis',
        'topDiscarded', 'massChanged', 'energyChanged', 'battleMage', 'opticBlast', 'weatherSpecial'
      ]);
      if (this.players === 1) {
        while (true) {
          const opts = this.windowOptions(name, ctx).filter(o => !used.has(o.id));
          if (!opts.length) return;
          const pick = await this.ask({ type: 'window', title: title || this.windowTitle(name, ctx), options: opts, ctx });
          if (!pick) return;
          const o = opts.find(x => x.id === pick);
          if (!o) return;
          used.add(o.id);
          await this.resolveWindowOption(o, ctx);
        }
      }
      // Multi-player window: ask clockwise (for local windows, only cross-player cards are offered to other players)
      const isLocal = LOCAL_WINDOWS.has(name), subjectPi = this.s.ctx;
      while (true) {
        let acted = false;
        const order = this.playerOrder();
        for (const pi of order) {
          if (this.s.ps[pi].eliminated) continue;
          const onlyAny = isLocal && pi !== subjectPi;
          const res = await this.withPlayer(pi, async () => {
            const opts = this.windowOptions(name, ctx, onlyAny).filter(o => !used.has(o.id));
            if (!opts.length) return false;
            const pick = await this.ask({ type: 'window', title: title || this.windowTitle(name, ctx), options: opts, ctx, owner: pi });
            if (!pick) return false;
            const o = opts.find(x => x.id === pick);
            if (!o) return false;
            used.add(o.id);
            await this.resolveWindowOption(o, ctx);
            return true;
          });
          if (res) { acted = true; break; }
        }
        if (!acted) return;
      }
    }
    windowTitle(name, ctx) {
      switch (name) {
        case 'wouldTakeAttackDamage': return `${this.nm(ctx.target)}이(가) 공격으로 피해 ${ctx.amount}을(를) 입으려 합니다`;
        case 'treacheryRevealed': return `변고 「${this.nm(ctx.card)}」 공개`;
        case 'villainSchemes': return `${this.nm(this.e.villain)}이(가) 음모를 꾸밉니다`;
        case 'threatWouldBePlaced': return `${this.nm(ctx.scheme)}에 위협 ${ctx.amount}이(가) 놓이려 합니다`;
        case 'afterAllyThwart': return `${this.nm(ctx.ally)} 저지 후`;
        case 'afterPlayerDefeatsMinion': return `${this.nm(ctx.minion)} 격파 후`;
        case 'afterAttackDefeat': return `${this.nm(ctx.attacker)}의 공격으로 ${this.nm(ctx.target)} 격파`;
        case 'afterHeroDefends': return `${this.nm(this.idt())}이(가) ${this.nm(ctx.enemy)}의 공격을 방어했습니다`;
        case 'minionEntered': return `하수인 ${this.nm(ctx.minion)} 등장`;
        case 'allyEntered': return `동료 ${this.nm(ctx.ally)} 등장`;
        case 'opticBlast': return '옵틱 블래스트';
        case 'weatherSpecial': return '날씨 특수 능력 해결 후';
        case 'mainWouldComplete': return '주 음모가 완료되려 합니다';
        case 'heroRangedAttack': return '원거리 공격';
        case 'heroKeywordAttack': return '키워드(압살·관통·원거리)가 있는 공격';
        case 'topDiscarded': return `덱 맨 위에서 ${this.nm(ctx.card)}을(를) 버렸습니다`;
        case 'toughDiscarded': return `${this.nm(ctx.target)}의 강인함 카드가 버려졌습니다`;
        case 'ignoredGuard': return '경비를 무시하고 공격했습니다';
        case 'ignoredPatrol': return '순찰을 무시하고 저지했습니다';
        case 'ignoredCrisis': return '위기를 무시하고 위협을 제거했습니다';
        case 'cardRevealed': return `조우 카드 「${this.nm(ctx.card)}」 공개`;
        case 'identityWouldTakeDamage': return `${this.nm(ctx.target)}이(가) 피해 ${ctx.amount}을(를) 입으려 합니다`;
        case 'afterChangeForm': return `${this.nm(this.idt())}(으)로 변신했습니다`;
        case 'allyPowerUsed': return `${this.nm(ctx.ally)}의 ${ctx.kind === 'attack' ? '공격' : '저지'}`;
        case 'afterBasicPower': return `${this.nm(this.idt())}의 기본 ${ctx.kind === 'attack' ? '공격' : ctx.kind === 'defend' ? '방어' : '저지'} 후`;
        case 'afterHeroThwart': return `${this.nm(this.idt())} 저지 후`;
        case 'allyWouldTakeDamage': return `${this.nm(ctx.target)}이(가) 피해 ${ctx.amount}을(를) 입으려 합니다`;
        case 'boostCounted': return `${this.nm(ctx.card)}의 강화 아이콘 ${ctx.icons}개를 셉니다`;
        case 'afterAllyAttack': return `${this.nm(ctx.ally)} 공격 후`;
        case 'deckReset': return '덱이 바닥나 다시 섞었습니다';
        case 'cardPlayedDone': return `${this.nm(ctx.card)} 플레이 후`;
        case 'massChanged': return `질량 형태 변경: ${this.nm(this.p.upgrades.find(u => ['26002a', '26002b'].includes(this.c(u).id)))}`;
        case 'willReveal': return '조우 카드를 공개하려 합니다';
        case 'threatRemovedFrom': return `${this.nm(ctx.scheme)}에서 위협 ${ctx.removed} 제거`;
        case 'treacheryResolved': return `「${this.nm(ctx.card)}」 해결 후`;
        case 'enemyWouldActivate': return `${this.nm(ctx.enemy)}이(가) ${ctx.kind === 'attack' ? '공격' : '음모'}하려 합니다`;
        case 'reactionEventResolved': return `${this.nm(ctx.card)} 해결 후`;
        case 'glowEnemyDefeated': return `죽음의 빛이 붙은 ${this.nm(ctx.enemy)} 격파 후`;
        case 'energyChanged': return `에너지 형태: ${this.nm(ctx.form)}`;
        case 'battleMage': return '전투 마법사 해결 후';
        case 'playingCard': return `${this.nm(ctx.card)}을(를) 플레이하려 합니다 (비용 ${ctx.cost.n})`;
        case 'eventResolved': return `${this.nm(ctx.card)} 해결 후`;
        case 'afterVillainAttack': return `${this.nm(ctx.enemy)}의 공격 후`;
        case 'allyWouldBeDefeated': return `${this.nm(ctx.ally)}이(가) 쓰러지려 합니다`;
        case 'allyWouldBeDefeatedByAttack': return `${this.nm(ctx.ally)}이(가) 쓰러지려 합니다`;
        case 'heroAttackExcess': return `남은 피해 ${ctx.excess}`;
        case 'excessDealt': return `${this.nm(ctx.target)}에게 남는 피해 ${ctx.excess}`;
        case 'afterAllyDefends': return `${this.nm(ctx.ally)} 방어 후`;
        case 'afterBasicAttack': return `${this.nm(this.idt())}의 기본 공격 후`;
        case 'heroDefends': return `${this.nm(this.idt())}이(가) ${this.nm(ctx.enemy)}의 공격을 방어합니다`;
        case 'villainAttackInitiated': return `${this.nm(this.e.villain)}이(가) 공격을 시작합니다`;
        case 'sideSchemeDefeated': return `부가 음모 「${this.nm(ctx.scheme)}」 격파 후`;
        case 'eventPlayed': return `「${this.nm(ctx.card)}」을(를) 플레이합니다`;
        case 'afterEventPlayed': return `「${this.nm(ctx.card)}」 해결 후`;
        case 'enemyAttackInitiated': return `${this.nm(ctx.enemy)}이(가) 공격을 시작합니다`;
        case 'boostTurned': return `강화 카드 「${this.nm(ctx.card)}」(아이콘 ${ctx.icons})가 공개됐습니다`;
        case 'boostDealt': return `${this.nm(ctx.enemy)}이(가) 강화 카드 ${ctx.cards.length}장을 받았습니다`;
        case 'minionLeftPlay': return `${this.nm(ctx.minion)}이(가) 플레이 영역을 떠났습니다`;
        case 'basicPowerUsed': return `${this.nm(this.idt())}의 기본 ${ctx.kind === 'attack' ? '공격' : ctx.kind === 'defend' ? '방어' : '저지'}`;
        case 'heroAttacked': return `${this.nm(this.idt())}이(가) ${this.nm(ctx.target)}을(를) 공격한 후`;
        case 'minionSchemed': return `${this.nm(ctx.enemy)}이(가) 음모를 꾸민 후`;
        case 'tookAttackDamage': return `${this.nm(ctx.enemy)}의 공격으로 피해 ${ctx.amount}을(를) 입었습니다`;
        case 'allyDefeated': return `${this.nm(ctx.ally)} 격파 후`;
        case 'surgeResolving': return `「${this.nm(ctx.card)}」의 쇄도`;
      }
      return '대응할 수 있습니다';
    }
    async trigger(hook, ctx) {
      const PLAYER_LOCAL = new Set([
        'turnBegins', 'afterRecover', 'formChanged', 'heroAttacking',
        'basicHeroPower', 'cardPlayed', 'resourcesGenerated', 'deckReset',
        'deckTopDiscarded', 'villainInitiatesAttack', 'enemyAttackStart',
        'preparationUsed', 'playerPhaseEnd'
      ]);
      for (const u of this.inPlay()) {
        const f = this.sc(u).on && this.sc(u).on[hook];
        if (!f || !this.c(u).zone) continue;
        const ctrl = this.controllerOf(u);
        if (ctrl != null && ctrl !== this.s.ctx && PLAYER_LOCAL.has(hook)) continue;
        if (ctrl != null) await this.withPlayer(ctrl, () => f(this, u, ctx));
        else await f(this, u, ctx);
      }
    }

    // ------------------------------------------------------------ damage / heal / threat
    async dealDamage(target, amount, o) {
      o = o || {};
      if (amount <= 0 || !this.c(target) || !this.c(target).zone) return { dealt: 0, excess: 0 };
      { const am = this.sc(target).asMinionDamage; if (am) return am(this, target, amount, o); } // Encased in Ice
      if (o.attack && this.c(target).pm && this.c(target).pm.takeAtk) amount += this.c(target).pm.takeAtk; // Cyclops (ally): +1 damage from each attack this phase
      const ctx = { target, amount, src: o.src, attack: !!o.attack, byPlayer: !!o.byPlayer, consequential: !!o.consequential, prevent: 0 };
      const up = !!o.unpreventable; // Luke Cage, Internal Injury: damage that cannot be prevented (ignores tough)
      const tpi = this.identityPlayer(target);
      if (tpi >= 0 && !up) {
        const tp = this.s.ps[tpi];
        for (const u of tp.supports.concat(tp.upgrades)) { const f = this.sc(u).absorbIdentityDamage; if (f && amount > 0 && this.c(u).zone) { amount = await this.withPlayer(tpi, () => f(this, u, amount, o)); if (!amount) return { dealt: 0, excess: 0 }; ctx.amount = amount; } } // Ice Wall, Magnetic Bubble
      }
      if (tpi >= 0 && o.attack && !up) {
        await this.withPlayer(tpi, () => this.window('wouldTakeAttackDamage', ctx));
        amount = Math.max(0, amount - ctx.prevent);
        if (!amount) { this.log(`${this.nm(target)}: 피해를 모두 방지`); return { dealt: 0, excess: 0 }; }
      }
      if (tpi >= 0 && !up) {
        ctx.amount = amount; ctx.prevent = 0;
        await this.withPlayer(tpi, () => this.window('identityWouldTakeDamage', ctx));
        amount = Math.max(0, amount - ctx.prevent);
        if (!amount) { this.log(`${this.nm(target)}: 피해를 모두 방지`); return { dealt: 0, excess: 0 }; }
        ctx.prevent = 0;
      }
      if (this.c(target).zone === 'ally' && !up) {
        const allyPi = this.controllerOf(target);
        ctx.amount = amount; ctx.prevent = 0;
        await this.withPlayer(allyPi, () => this.window('allyWouldTakeDamage', ctx));
        amount = Math.max(0, amount - ctx.prevent);
        if (!amount) { this.log(`${this.nm(target)}: 피해를 모두 방지`); return { dealt: 0, excess: 0 }; }
        ctx.prevent = 0;
      }
      { const sr = !up && this.sc(target).selfReduce; if (sr) { amount = sr(this, target, amount, o); if (amount <= 0) { this.log(`${this.nm(target)}: 피해를 모두 줄였습니다`); return { dealt: 0, excess: 0 }; } } } // Echo (ally)
      if (!up && o.attack) for (const x of this.inPlay()) { const f = this.sc(x).attackDamageReduce; if (f && amount > 0) amount = f(this, x, target, amount, o); } // Aerial Dogfight
      for (const a of (up ? [] : this.c(target).att.slice())) { const rd = this.sc(a).reduceDamage; if (rd && amount > 0) amount = rd(this, a, amount, o); } if (amount <= 0) return { dealt: 0, excess: 0 }; // Heightened Reflexes, Psionic Force Field
      if (!up && ['villain', 'minion'].includes(this.c(target).zone)) for (const sd of this.e.sides.slice()) { const ab = this.sc(sd).absorbEnemyDamage; if (ab && amount > 0) amount = await ab(this, sd, target, amount, o); } if (amount <= 0) return { dealt: 0, excess: 0 }; // Sonic Bubble
      { const jp = !up && this.c(target).att.find(a => this.sc(a).preventBig && amount >= this.sc(a).preventBig); if (jp) { this.discard(jp, `${this.nm(jp)}: 피해 ${amount}을(를) 모두 방지하고 버려집니다`); return { dealt: 0, excess: 0 }; } } // Jet Pack
      const di = this.sc(target).damageInstead;
      if (!up && di && await di(this, target, amount, o)) return { dealt: 0, excess: 0 };
      const tc = this.c(target);
      const ct = this.sc(target).cannotTakeDamage;
      const tCtrl = this.controllerOf(target), tCp = tCtrl != null ? this.s.ps[tCtrl] : null;
      if (!up && ((ct && ct(this, target, o)) || (this.e.villainNoDmg && target === this.e.villain) || (tCp && tCp.usedOnce.champShield && this.hasTrait(target, 'CHAMPION')) || this.inPlay().some(u => this.sc(u).shieldsFromDamage && this.sc(u).shieldsFromDamage(this, u, target, o)))) { this.log(`${this.nm(target)}은(는) 지금 피해를 입지 않습니다`); return { dealt: 0, excess: 0 }; }
      if (tc.tough && !up) { if (tc.toughX) tc.toughX--; else tc.tough = false; this.log(`${this.nm(target)}: 강인함으로 피해 ${amount} 방지 (강인함 제거)`); await this.toughGone(target); return { dealt: 0, excess: 0 }; }
      for (const u of (up ? [] : this.e.sides.slice())) { const rd = this.sc(u).redirectDamage; if (rd && await rd(this, u, target, amount, o)) return { dealt: 0, excess: 0 }; } // Self-Experimentation
      ctx.amount = amount;
      if (!up) await this.trigger('wouldTakeDamage', ctx); // e.g. Armored Rhino Suit
      amount = Math.max(0, ctx.amount - ctx.prevent);
      if (!amount) return { dealt: 0, excess: 0 };
      for (const x of this.inPlay()) { const f = this.sc(x).capDamage; if (f) amount = f(this, x, target, amount, o); } if (amount <= 0) return { dealt: 0, excess: 0 }; // challenges
      const left = this.hpLeft(target);
      const dealt = Math.min(amount, Math.max(0, left));
      tc.dmg += amount;
      const excess = Math.max(0, amount - left);
      this.log(`${this.nm(target)} 피해 ${amount}${o.consequential ? ' (후속 피해)' : ''} → 남은 체력 ${Math.max(0, this.hpLeft(target))}`, 'dmg');
      await this.trigger('afterTakeDamage', { target, amount, byPlayer: !!o.byPlayer, src: o.src, attack: !!o.attack });
      if (o.byPlayer && excess > 0 && ['villain', 'minion'].includes(this.d(target).type)) await this.window('excessDealt', { target, excess });
      let defeated = false;
      if (this.c(target).zone && this.hpLeft(target) <= 0) {
        const wctx = { target, saved: false, exact: amount === left, attack: !!o.attack, src: o.src, consequential: !!o.consequential };
        const savers = tc.att.slice().concat(tpi >= 0 ? this.s.ps[tpi].upgrades : []);
        const runSavers = async () => {
          for (const a of savers) { const f = this.sc(a).on && this.sc(a).on.hostWouldBeDefeated; if (f && !wctx.saved) await f(this, a, wctx); }
          const wb = this.sc(target).wouldBeDefeated; if (wb && !wctx.saved && this.c(target).zone) await wb(this, target, wctx);
          if (tpi >= 0 && !wctx.saved && this.e.main) { const mw = this.sc(this.e.main).identityWouldBeDefeated; if (mw) await mw(this, target, wctx); } // Mischief and Mayhem
        };
        if (tpi >= 0) await this.withPlayer(tpi, runSavers); else await runSavers();
        if (!wctx.saved) { defeated = true; await this.defeat(target, Object.assign({}, o, { excess })); }
      }
      return { dealt: amount, excess, damaged: true, defeated };
    }
    heal(uid, n) {
      const c = this.c(uid); const h = Math.min(n, c.dmg); c.dmg -= h; return h;
    }
    eliminatePlayer(pi, reason) {
      const p = this.s.ps[pi];
      if (!p || p.eliminated) return;
      p.eliminated = true;
      if (this.s.ps.every(x => x.eliminated)) this.lose(reason);
      const nextAlive = this.playerOrder((pi + 1) % this.s.ps.length)[0];
      this.log(`${this.nm(p.identity)}이(가) 쓰러져 탈락했습니다! 남은 히어로가 계속 싸웁니다.`, 'warn');
      for (const u of p.facedown.slice()) this.put(u, 'ediscard');
      for (const u of (p.obl || []).slice()) this.discard(u);
      if (p.identity) {
        for (const a of this.c(p.identity).att.slice()) this.put(a, this.d(a).enc ? 'ediscard' : 'removed');
      }
      for (const arr of [p.allies, p.supports, p.upgrades, p.hand, p.deck, p.discard, p.pset, p.inv, p.invDiscard]) {
        for (const u of (arr || []).slice()) {
          for (const a of this.c(u).att.slice()) this.put(a, this.d(a).enc ? 'ediscard' : 'removed');
          this.resetCard(u);
          this.put(u, this.d(u).enc ? 'ediscard' : 'removed');
        }
      }
      for (const m of this.e.minions) {
        const mc = this.c(m);
        if ((mc.eng ?? 0) === pi) {
          mc.eng = nextAlive;
          this.log(`${this.nm(m)}이(가) ${this.playerName(nextAlive)}와(과) 교전합니다`, 'warn');
        }
      }
      if (p.identity) { this.c(p.identity).zone = null; this.c(p.identity).pZone = null; }
      if (this.s.first === pi && nextAlive != null) this.s.first = nextAlive;
    }
    async defeat(uid, o) {
      const d = this.d(uid);
      const epi = this.identityPlayer(uid);
      if (epi >= 0) { this.eliminatePlayer(epi, `${d.name}이(가) 쓰러졌습니다`); return; }
      if (d.type === 'ally') {
        const ctrl = this.controllerOf(uid);
        await this.withPlayer(ctrl, async () => {
          { const rc = { ally: uid, saved: false, enemyAttack: !!(o && o.attack && o.src && this.c(o.src) && ['villain', 'minion'].includes(this.d(o.src).type)) }; await this.window('allyWouldBeDefeated', rc); if (rc.saved) return; } // Valkyrie
          if (o && o.attack && o.src && this.c(o.src) && ['villain', 'minion'].includes(this.d(o.src).type)) {
            const rc = { ally: uid, toHand: false }; await this.window('allyWouldBeDefeatedByAttack', rc);
            if (rc.toHand) { for (const a of this.c(uid).att.slice()) this.discard(a); this.resetCard(uid); this.put(uid, 'hand'); this.log(`${d.name}: 버려지는 대신 손으로`, 'good'); return; }
          }
          if (o && o.consequential && this.sc(uid).consToHand) { for (const a of this.c(uid).att.slice()) this.discard(a); this.resetCard(uid); this.put(uid, 'hand'); this.log(`${d.name}: 후속 피해로 격파되어 손으로 돌아옵니다`, 'good'); await this.window('allyDefeated', { ally: uid }); return; }
          for (const a of this.c(uid).att.slice()) { const f = this.sc(a).on && this.sc(a).on.attachedDefeated; if (f) await f(this, a, { ally: uid }); } // "Avenge Me!"
          this.discard(uid, `${d.name} 격파됨`); await this.trigger('allyDefeated', { ally: uid, consequential: !!(o && o.consequential), attack: !!(o && o.attack) }); await this.window('allyDefeated', { ally: uid, consequential: !!(o && o.consequential) });
        });
        return;
      }
      if (d.type === 'minion') {
        const eng = this.c(uid).eng != null ? this.c(uid).eng : this.s.ctx;
        const ctx = { minion: uid, eng, byPlayer: !!(o && o.byPlayer), src: o && o.src, excess: (o && o.excess) || 0 };
        const wd = this.sc(uid).whenDefeated; if (wd) await this.withPlayer(eng, () => wd(this, uid, ctx));
        for (const a of this.c(uid).att.slice()) { const f = this.sc(a).on && this.sc(a).on.attachedDefeated; if (f) await f(this, a, ctx); }
        if (this.c(uid).zone === 'minion') await this.trigger('minionDefeated', ctx); // Dangerous Recruits
        if (this.c(uid).zone === 'removed') this.log(`${d.name} 격파 — 게임에서 제거`);
        else if (this.c(uid).zone === 'minion' || this.heldMinions().includes(uid)) this.discard(uid, `${d.name} 격파됨`);
        else { for (const a of this.c(uid).att.slice()) this.discard(a); this.resetCard(uid); } // e.g. Beetle shuffled back into the encounter deck
        if (ctx.byPlayer) await this.trigger('playerDefeatsMinion', ctx);
        if (ctx.byPlayer) await this.window('afterPlayerDefeatsMinion', ctx);
        return;
      }
      if (d.type === 'villain' && this.e.villains && this.sc(uid).whenDefeatedVillain) { if ((await this.sc(uid).whenDefeatedVillain(this, uid)) === 'handled') return; }
      if (d.type === 'villain' && this.e.villains) {
        const e = this.e, wasActive = e.villain === uid, side = this.crewSideOf(uid);
        for (const a of this.c(uid).att.slice()) this.discard(a);
        this.resetCard(uid); this.put(uid, 'removed');
        this.log(`${d.name} 격파!`, 'sys');
        if (side && this.c(side).zone === 'side') { this.removeFromGame(side); this.log(`${this.nm(side)}을(를) 게임에서 제거`); }
        if (!e.villains.length) this.win('레킹 크루를 모두 물리쳤습니다');
        if (wasActive) {
          const top = Math.max(...e.villains.map(v => this.c(this.crewSideOf(v)).threat || 0));
          const c = e.villains.filter(v => (this.c(this.crewSideOf(v)).threat || 0) === top);
          const nv = c.length === 1 ? c[0] : await this.ask({ type: 'target', title: '다음 활성 빌런을 고르세요 (부가 음모 위협이 가장 많은 빌런)', cands: c, cancelable: false });
          this.switchActive(nv);
        }
        return;
      }
      if (d.type === 'villain') {
        const e = this.e;
        if (e.stage + 1 >= e.stages.length) this.win(`${d.name}을(를) 물리쳤습니다`);
        const vd = this.sc(uid).whenDefeatedVillain; if (vd && (await vd(this, uid)) === 'handled') return;
        for (const a of this.c(uid).att.slice()) { const f = this.sc(a).on && this.sc(a).on.attachedVillainDefeated; if (f) await f(this, a, { villain: uid, byPlayer: !!(o && o.byPlayer), src: o && o.src }); } // Death-Glow
        e.stage++;
        const c = this.c(uid);
        c.id = e.stages[e.stage]; c.dmg = 0;
        if (e.villainSide) this.flipFace(uid);
        if (this.d(uid).toughness) c.tough = true;
        this.log(`${d.name} 격파! 다음 단계 ${this.nm(uid)} (${this.romanStage(this.d(uid).stage)}) 등장`, 'sys');
        await this.show({ type: 'reveal', uid, title: '빌런 단계 진행' });
        const w = this.sc(uid).whenRevealed; if (w) await w(this, uid, {});
        await this.trigger('villainAdvanced', { villain: uid }); // Save the School
      }
    }
    flipFace(uid) { const S = this.scenData(); const to = (S.flip || {})[this.c(uid).id] || ((MC.catalog || {}).cflip || {})[this.c(uid).id]; if (to) this.c(uid).id = to; return !!to; }
    async flipVillain(o) {
      const v = this.e.villain; if (!v) return;
      const from = this.nm(v);
      if (!this.flipFace(v)) return;
      this.e.villainSide = this.e.villainSide ? 0 : 1;
      this.log(`${from} → ${this.nm(v)}(으)로 뒤집힘`, 'warn');
      await this.show({ type: 'reveal', uid: v, title: '빌런이 뒤집혔습니다' });
      if (!(o && o.noReveal)) { const w = this.sc(v).whenRevealed; if (w) await w(this, v, {}); }
    }
    iconOf(u, kind) { if (this.c(u).iconsOffRound === this.s.round && ['accel', 'amplify', 'hazard', 'crisis'].includes(kind)) return 0; if (['accel', 'amplify', 'hazard', 'crisis'].includes(kind) && this.c(u).att.some(a => this.sc(a).blankIcons)) return 0; const f = this.sc(u).icons; if (f) { const r = f(this, u); if (r && kind in r) return r[kind] || 0; } return this.d(u)[kind] || 0; } // Rule by Force: icons that come and go
    accelAmount() {
      const e = this.e, md = this.d(e.main);
      let acc = (md.esc || 0) * (md.escStar ? this.players : 1) + e.accelTokens;
      { const ef = this.sc(e.main).escFn; if (ef) acc += ef(this) || 0; } // The Widow's Web: X = Black Widow's stage
      for (const u of e.sides) acc += this.iconOf(u, 'accel');
      for (const u of e.env) acc += this.iconOf(u, 'accel'); // Formidable Foe (expert)
      for (const u of e.minions) acc += this.c(u).cnt.accelTok || 0; // Ivan Banionis
      for (const i of this.livingPlayers()) for (const u of (this.s.ps[i].obl || [])) acc += this.iconOf(u, 'accel'); // Arrest Warrant
      acc += this.allPlayerIcons('accel'); // 'Pool allies and upgrades
      for (const u of this.inPlay()) { const ab = this.sc(u).accelBonus; if (ab) acc += ab(this, u) || 0; } // Secret Lair
      const f = this.sc(e.main).escalation; if (f) acc += f(this, e.main) || 0;
      return acc;
    }
    villainStage() { return this.e.villain ? (this.d(this.e.villain).stage || 1) : 1; }
    giveFacedownBoostTo(u, n) { let k = 0; for (let i = 0; i < n; i++) if (!this.inPlay().some(x => { const f = this.sc(x).fdBoostShield; return f && f(this, x, u); })) k++; this.c(u).fdBoost = (this.c(u).fdBoost || 0) + k; } // Public Support: instead of a facedown boost card
    minionFd(enemy) { const c = this.c(enemy); let n = c.fdBoost || 0; c.fdBoost = 0; const fq = c.fdCards; if (fq && fq.length) { n += fq.length; this.e.fdPending = (this.e.fdPending || []).concat(fq.splice(0)); } return n; } // facedown boost cards on a minion that is not villainous
    giveFacedownCard(enemy, x) { // this very card waits facedown for the enemy's next activation
      if (!enemy || !this.c(enemy).zone || !x) return false;
      for (const a of this.c(x).att.slice()) this.discard(a);
      this.resetCard(x); this.put(x, 'aside'); (this.c(enemy).fdCards = this.c(enemy).fdCards || []).push(x);
      this.log(`${this.nm(x)}: ${this.nm(enemy)}의 뒷면 강화 카드가 됩니다`, 'warn'); return true;
    }
    giveFacedownBoost(n) { this.e.extraBoost = (this.e.extraBoost || 0) + n; this.log(`빌런이 다음 활성화 때 쓸 강화 카드 ${n}장을 받았습니다`, 'warn'); }
    // extra boost cards for a villain activation: queued facedown boosts + attachments like Hysteria
    activationBoost(enemy, attack) {
      let n = 0;
      if (attack) n += this.sc(enemy).attackBoostExtra || 0;
      const ax = this.sc(enemy).activationExtra; if (ax) n += ax(this, enemy) || 0;
      for (const a of this.c(enemy).att) n += this.sc(a).activationBoost || 0;
      for (const a of this.c(enemy).att.slice()) { const f = this.sc(a).onActivate; if (f) n += f(this, a) || 0; }
      if (enemy === this.e.villain) { n += this.e.extraBoost || 0; this.e.extraBoost = 0; }
      if (this.c(enemy).fdBoost) { n += this.c(enemy).fdBoost; this.c(enemy).fdBoost = 0; } // Solus
      { const fq = this.c(enemy).fdCards; if (fq && fq.length) { n += fq.length; this.e.fdPending = (this.e.fdPending || []).concat(fq.splice(0)); } } // Civil War
      return n;
    }
    discardEncounterN(n) {
      const out = [];
      for (let i = 0; i < n; i++) { const u = this.takeEncounter(); if (!u) break; this.put(u, 'ediscard'); out.push(u); }
      if (out.length) this.log(`조우 덱 위에서 버림: ${out.map(u => `${this.nm(u)}(${this.boostOf(u)})`).join(', ')}`);
      return out;
    }
    // boost icons printed on a card, plus effects like The Next Evolution (+1 on each encounter card)
    boostOf(u) { let n = this.d(u).boost || 0; if (this.d(u).enc) { for (const s of this.e.sides) n += this.sc(s).boostPlus || 0; n += this.e.tempBoostPlus || 0; } return n; } // Biting Retort: +1 for one activation
    boostIcons(cards) { return cards.reduce((t, u) => t + this.boostOf(u), 0); }
    // counting boost icons on cards (discarded from the deck, or turned as boost): "when boost icons would be counted" (Scarlet Witch)
    async countBoost(cards) {
      let t = 0;
      for (const u of cards) { const b = { card: u, icons: this.boostOf(u) }; await this.window('boostCounted', b); t += Math.max(0, b.icons); }
      return t;
    }
    async splitDamage(n, src) { // divide damage among each character you control as evenly as possible (you choose who takes the extra)
      const cs = this.friendlyChars().filter(u => this.c(u).zone); const base = Math.floor(n / cs.length); let rem = n % cs.length; const extra = [];
      while (rem > 0) { const c = cs.filter(x => !extra.includes(x)); const t = c.length === 1 ? c[0] : await this.ask({ type: 'target', title: `피해 1을 더 받을 캐릭터 (${rem}명 남음)`, cands: c, cancelable: false }); extra.push(t); rem--; }
      for (const u of cs) { const k = base + (extra.includes(u) ? 1 : 0); if (k > 0 && this.c(u).zone) await this.dealDamage(u, k, { src, attack: true }); }
    }
    async indirectDamage(n, src) {
      if (n <= 0) return;
      this.log(`간접 피해 ${n}: 내 캐릭터들에게 나눠 받습니다`, 'dmg');
      await this.assignDamage(n, this.friendlyChars(), `간접 피해 ${n}을(를) 받을 캐릭터`, src);
    }
    async discardResourcesFromHand(n, letters, title) { // discard cards whose printed resources total n (optionally only some letters)
      let left = n;
      while (left > 0) {
        const ok = this.p.hand.filter(u => { const r = this.d(u).res || ''; return r && (!letters || r.split('').some(l => letters.includes(l))); });
        if (!ok.length) break;
        const u = ok.length === 1 ? ok[0] : await this.ask({ type: 'target', title: `${title} (자원 ${left}개 남음)`, cands: ok, cancelable: false });
        left -= (this.d(u).res || '').length; this.put(u, 'discard'); this.log(`${this.nm(u)} 버림`);
      }
    }
    noRemove(u) { const f = this.sc(u).noRemove; return (typeof f === 'function' ? !!f(this, u) : !!f) || this.c(u).att.some(a => this.sc(a).blocksThwart) || this.inPlay().some(x => { const b = this.sc(x).blocksRemoval; return !!(b && b(this, x, u)); }); } // Brute Force Barricade, Taunting Presence
    cannotThwart() { return this.myAndEncInPlay().some(u => this.sc(u).cannotThwart && this.c(u).zone && this.sc(u).cannotThwart(this, u)); }
    paidWith(paid, l) { return (paid || []).includes(l) || (paid || []).includes('G'); }
    canReady(uid) {
      const ctrl = this.controllerOf(uid), cp = ctrl != null ? this.s.ps[ctrl] : this.p;
      if (cp && uid === cp.identity && cp.readyLock) return false;
      if (this._rtDepth && this.c(uid) && this.c(uid).ex && this._rtSeen) this._rtSeen.add(uid); // Mister Fear: remember who may get readied
      const pool = ctrl != null ? this.myAndEncInPlay(ctrl) : this.inPlay();
      for (const u of pool) { const f = this.sc(u).blocksReady; if (f && f(this, u, uid)) return false; } // Weight of the World
      const fc = cp ? [cp.identity].concat(cp.allies) : this.friendlyChars();
      if (!this.readyStep && this.e.sides.some(x => this.sc(x).noCardReady) && fc.includes(uid)) return false;
      return !this.c(uid).att.some(a => this.sc(a).noReady || this.sc(a).replacesReady);
    }
    restrictedLimit(uid) { let n = 2; for (const u of this.myAndEncInPlay()) { const f = this.sc(u).restrictedPlus; if (f) n += f(this, u, uid) || 0; } return n; }
    basicAttackCost() { let n = 0; for (const u of this.e.sides) n += this.sc(u).basicAttackCost || 0; return n; }
    noToAlter() { return !!this.p.phase.noAlter || this.myAndEncInPlay().some(x => { const f = this.sc(x).noToAlter; return f && (typeof f !== 'function' || f(this, x)); }); } // Incognito Mode, Bear Hug, Imprisoned
    formCostOk() { return (this.p.obl || []).every(x => { const f = this.sc(x).formChangeCostOk; return !f || f(this, x); }); } // Work-Life Balance
    formLocked() { const nf = a => { const f = this.sc(a).noFormChange; return typeof f === 'function' ? f(this, a) : !!f; }; return !!this.p.formLock || this.c(this.idt()).att.some(nf) || (this.p.obl || []).some(nf); } // Claustrophobia
    romanStage(n) { return ['', 'I', 'II', 'III', 'IV'][n] || (n == null ? '' : String(n)); }
    // place threat with "would be placed" window (Great Responsibility, Emergency handled earlier)
    async placeThreat(scheme, n, o) {
      if (n <= 0 || !scheme) return 0;
      const ctx = { scheme, amount: n, instead: false, o: o || {} };
      await this.window('threatWouldBePlaced', ctx);
      if (ctx.instead || ctx.amount <= 0) return 0;
      this.c(scheme).threat += ctx.amount;
      this.log(`${this.nm(scheme)}에 위협 +${ctx.amount} (현재 ${this.c(scheme).threat})`, 'threat');
      const atp = this.sc(scheme).afterThreatPlaced; if (atp) await atp(this, scheme, ctx.amount);
      if (scheme === this.e.main) await this.checkMainScheme();
      else if ((this.e.mainX || []).includes(scheme) && this.c(scheme).threat >= this.targetOf(scheme)) { const wc = this.sc(scheme).whenCompleted; if (wc) await wc(this, scheme); else this.lose(`주 음모 「${this.nm(scheme)}」가 완료되었습니다`); }
      else if (scheme === this.e.main2 && this.c(scheme).threat >= this.targetOf(scheme)) { const wc = this.sc(scheme).whenCompleted; if (wc) await wc(this, scheme); else this.lose(`주 음모 「${this.nm(scheme)}」가 완료되었습니다`); }
      return ctx.amount;
    }
    async checkMainScheme() {
      const e = this.e, m = e.main;
      if (!m || this.c(m).threat < this.mainTarget()) return;
      { const w = { scheme: m }; await this.window('mainWouldComplete', w); if (this.c(m).threat < this.mainTarget()) return; } // Temporal Leap
      const wc = this.sc(m).whenCompleted; if (wc) { this.log(`주 음모 「${this.nm(m)}」 완료`, 'warn'); if ((await wc(this, m)) === 'handled') return; }
      if (this.sc(m).loseOnComplete || e.mainIdx + 1 >= e.mainStages.length) this.lose(`주 음모 「${this.nm(m)}」가 완료되었습니다`);
      await this.setMainStage(e.mainIdx + 1);
    }
    async setMainStage(idx) {
      const e = this.e, m = e.main;
      e.mainIdx = idx;
      const [a, b] = e.mainStages[e.mainIdx];
      const c = this.c(m); c.id = b;
      const md = this.d(m); c.threat = (md.start || 0) * (md.startStar ? this.players : 1);
      this.log(`주 음모 단계 진행 → ${this.nm(m)} (${e.mainIdx + 1}단계, 목표 ${this.mainTarget()})`, 'warn');
      await this.show({ type: 'reveal', uid: m, title: `주 음모 ${e.mainIdx + 1}단계` });
      const SA = MC.scripts[a] || {}, SB = MC.scripts[b] || {};
      if (SA.whenRevealed) await SA.whenRevealed(this, m, { surge: 0 });
      if (SB.whenRevealed) await SB.whenRevealed(this, m, { surge: 0 });
    }
    async removeThreat(scheme, n, o) {
      if (this.isMain(scheme) && this.crisis() && !(o && o.ignoreCrisis) && !this.ignores('crisis', o && o.src)) { this.log('위기: 주 음모에서 위협을 제거할 수 없습니다', 'warn'); return 0; }
      if (this.noRemove(scheme)) { this.log(`${this.nm(scheme)}에서는 위협을 제거할 수 없습니다`, 'warn'); return 0; }
      { const ra = this.c(scheme).att.find(a => this.sc(a).hostRemoveOnlyBy && !this.sc(a).hostRemoveOnlyBy(this, a, o && o.src)); if (ra) { this.log(`${this.nm(ra)}: 이 위협은 제거할 수 없습니다`, 'warn'); return 0; } }
      { const ro = this.sc(scheme).removeOnlyBy; if (ro && !ro(this, scheme, o && o.src)) { this.log(`${this.nm(scheme)}: 이 캐릭터는 위협을 제거할 수 없습니다`, 'warn'); return 0; } } // Technovirus Purge
      if (o && o.src && !o.thwPaid && this.s.cards[o.src] && !this.d(o.src).enc && this.c(scheme).zone === 'side') { const xc = this.sc(scheme).thwartExtraCost; if (xc) await xc(this, scheme, o.src); } // Cat Stuck in a Tree: card effects thwarting it pay too
      if (this.curEvent && this.curEvent.thwBonus && o && o.src === this.curEvent.card) n += this.curEvent.thwBonus;
      const c = this.c(scheme); const r = Math.min(n, c.threat); c.threat -= r;
      this.lastThreatSrc = o && o.src; this.lastThreatExact = n === r; // Stealth Training: defeated "exactly"
      { const ot = this.sc(scheme).onThreatRemoved; if (ot && r > 0) await ot(this, scheme, r, o || {}); } // Show of Empathy
      if (r > 0 && o && o.src && c.att.some(a => this.sc(a).watchesThreat)) await this.window('threatRemovedFrom', { scheme, removed: r, src: o.src }); // Overwatch
      if (r > 0) { const hr = this.sc(scheme).afterThreatRemovedHere; if (hr) await hr(this, scheme, r); } // Henchmen Shakedown
      if (this.isMain(scheme) && r > 0 && o && o.src && this.d(o.src).type !== 'ally') { // Acute Control, Intangible Interference
        const pm = this.e.minions.filter(m => this.kw(m, 'patrol')); if (pm.length) await this.window('ignoredPatrol', { minions: pm });
        const cs = this.e.sides.filter(x => this.d(x).crisis); if (cs.length && !(o && o.ignoreCrisis)) await this.window('ignoredCrisis', { schemes: cs });
      }
      if (scheme === this.e.main && r > 0 && c.threat === 0) await this.trigger('mainSchemeEmpty', {}); // Out Front
      if (scheme === this.e.main && r > 0 && c.threat === 0) { await this.scenHook('mainCleared'); const wcl = this.sc(scheme).whenCleared; if (wcl) await wcl(this, scheme); } // Escape the Museum, Batroc: removing the last threat advances
      return r;
    }
    async afterThreatRemoved(scheme) {
      const c = this.c(scheme);
      if (!c || c.zone !== 'side' || c.threat > 0) return;
      const cl = this.sc(scheme).cannotLeave; if (cl && cl(this, scheme)) return;
      const f = this.sc(scheme).whenDefeated;
      this.log(`부가 음모 「${this.nm(scheme)}」 격파`, 'good');
      const fr = f ? await f(this, scheme) : null;
      for (const a of c.att.slice()) { const h = this.sc(a).on && this.sc(a).on.attachedDefeated; if (h) await h(this, a, { scheme }); }
      if (c.zone === 'side' && fr !== 'handled') this.discard(scheme); // 'handled': the scheme flipped or moved (Boarding Party)
      await this.trigger('sideSchemeDefeated', { scheme }); // Hela (wounded)
      await this.window('sideSchemeDefeated', { scheme, src: this.lastThreatSrc, exact: !!this.lastThreatExact });
      await this.checkDefeats();
    }
    async checkDefeats() {
      for (const u of this.enemies()) if (this.c(u).zone && this.hpLeft(u) <= 0) {
        const wb = this.sc(u).wouldBeDefeated; if (wb) { const w = { target: u, saved: false }; await wb(this, u, w); if (w.saved) continue; }
        await this.defeat(u, {});
      }
    }
    async removeThreatChoose(n, title, src) {
      const t = await this.chooseTarget('thwartable', title || `위협 ${n}을(를) 제거할 음모`, src, false);
      if (!t) return 0;
      const r = await this.removeThreat(t, n, { src });
      this.log(`${this.nm(t)} 위협 ${r} 제거`);
      await this.afterThreatRemoved(t);
      return r;
    }

    // ------------------------------------------------------------ villain phase
    async villainPhase() {
      const e = this.e;
      this.log(`라운드 ${this.s.round} — 빌런 단계`, 'phase');
      for (const pi of this.livingPlayers()) {
        const p = this.s.ps[pi];
        if (p.blankUntilVP) { p.blankUntilVP = false; this.log(this.players === 1 ? '정체성 텍스트가 다시 적용됩니다' : `${this.nm(p.identity)}: 정체성 텍스트가 다시 적용됩니다`); }
      }
      await this.trigger('villainPhaseBegins', {});
      if (e.skipVP) { e.skipVP = false; this.log('이번 빌런 단계를 건너뜁니다', 'good'); } else {
      if (e.villainNoDmg) { e.villainNoDmg = false; this.log(`${this.nm(e.villain)}: 다시 피해를 받을 수 있습니다`); }
      // 1. threat on main scheme
      let acc = this.accelAmount();
      const mainId = this.c(e.main).id;
      if (acc > 0) { this.log(`가속: 주 음모에 위협 ${acc}`); await this.placeThreat(e.main, acc, { accel: true }); }
      if (e.main2) { const d2 = this.d(e.main2); let a2 = (d2.esc || 0) * (d2.escStar ? this.players : 1); for (const u of e.sides) a2 += this.d(u).accel || 0; if (a2 > 0) await this.placeThreat(e.main2, a2, { accel: true }); }
      for (const mx of (e.mainX || []).slice()) { const dx = this.d(mx); const ax = (dx.esc || 0) * (dx.escStar ? this.players : 1) + (this.c(mx).cnt.accelTok || 0); if (ax > 0 && (e.mainX || []).includes(mx)) { this.log(`가속: ${this.nm(mx)}에 위협 ${ax}`); await this.placeThreat(mx, ax, { accel: true }); } }
      await this.withPlayer(this.s.first, () => this.trigger('mainStep1', { mainId }));
      await this.flushPending();
      // 2. villain + minions activate per player clockwise
      await this.forEachPlayer(async pi => {
        if (this.players > 1) this.log(`빌런 단계 — ${this.playerName(pi)} 차례`, 'phase');
        if (e.villain && !this.p.eliminated) {
          const sk = this.sc(e.villain).skipStep2;
          if (sk && sk(this, e.villain)) { this.heal(e.villain, 4); this.log(`${this.nm(e.villain)}: 활성화하지 않고 피해 4 회복`, 'warn'); }
          else await this.activate(e.villain, { boost: 1 });
        }
        for (const m of this.engagedMinions(pi).slice()) {
          if (!this.p.eliminated && this.c(m).zone === 'minion') await this.activate(m, {});
        }
      });
      // 3. deal encounter cards (1 per player, then +hazard round-robin from first player)
      await this.trigger('villainStep3', {}); // Wheel of Genres
      let hazards = this.allPlayerIcons('hazard');
      for (const u of e.sides) hazards += this.iconOf(u, 'hazard');
      for (const u of this.inPlay()) { const hb = this.sc(u).hazardBonus; if (hb) { const uc = this.controllerOf(u); hazards += (uc != null ? this.withPlayerSync(uc, () => hb(this, u)) : hb(this, u)) || 0; } }
      for (const pi of this.livingPlayers()) {
        await this.withPlayer(pi, async () => {
          const u = this.takeEncounter();
          if (u) { this.put(u, 'facedown', pi); await this.window('encounterDealt', { card: u }); }
        });
      }
      const dealOrder = this.livingPlayers();
      for (let h = 0; h < hazards && dealOrder.length; h++) {
        const pi = dealOrder[h % dealOrder.length];
        await this.withPlayer(pi, async () => {
          const u = this.takeEncounter();
          if (u) { this.put(u, 'facedown', pi); await this.window('encounterDealt', { card: u }); }
        });
      }
      await this.flushPending();
      // 4. reveal in player order (loop until all dealt cards are resolved, incl. cards dealt during step 4)
      while (this.livingPlayers().some(i => this.s.ps[i].facedown.length > 0)) {
        await this.forEachPlayer(async () => {
          while (!this.p.eliminated && this.p.facedown.length) {
            const u = this.p.facedown[0];
            await this.reveal(u);
            if (this.e.recheck) { this.e.recheck = false; await this.checkMainScheme(); }
          }
        });
      }
      } // (skipped villain phase)
      // 5. end of round
      await this.scenHook('phaseEnd', 'villain');
      await this.trigger('villainPhaseEnd', {}); // challenges
      await this.trigger('roundEnd', {});
      for (const u of this.inPlay().slice()) if (this.d(u).temporary && this.c(u).zone && !this.inPlay().some(x => { const k = this.sc(x).keepTemporary; return k && k(this, x, u); })) { this.forceDiscard = true; this.discard(u, `${this.nm(u)}: 임시 카드라 라운드 끝에 버림`); this.forceDiscard = false; } // Temporary
      this.clearPhaseMods(); this.clearRoundMods();
      for (const p of this.s.ps) { p.flipped = false; p.usedOnce = {}; }
      const liveAfter = this.livingPlayers();
      if (this.s.ps.length > 1 && liveAfter.length > 1) {
        this.s.first = liveAfter[1];
        this.log(`선 플레이어: ${this.playerName(this.s.first)}`, 'sys');
        await this.trigger('firstPlayerChanged', { first: this.s.first });
      }
      this.s.ctx = this.s.first;
      this.log(`라운드 ${this.s.round} 종료`, 'phase');
      this.s.round++;
      this.s.phase = 'player';
      this.log(`라운드 ${this.s.round} — 플레이어 단계`, 'phase');
    }
    // what the next villain phase will do if nothing changes (for the UI preview)
    forecast(pi) {
      return this.withPlayerSync(pi != null ? pi : this.s.ctx, () => {
        const e = this.e, hero = this.isHero(), idx = this.s.ctx;
        const accel = this.accelAmount();
        let sch = 0, atk = 0, attacks = 0, boost = 0, idle = 0, minions = 0;
        const list = (e.villain ? [e.villain] : []).concat(this.engagedMinions(idx));
        for (const u of list) {
          const c = this.c(u), isV = u === e.villain;
          const peek = attack => 1 + (attack ? this.sc(u).attackBoostExtra || 0 : 0) + this.c(u).att.reduce((t, x) => t + (this.sc(x).activationBoost || 0), 0) + (this.e.extraBoost || 0);
          if (hero) { if (c.stun) { idle++; continue; } if (this.sc(u).insteadOfAttack) continue; attacks++; if (!isV) minions++; atk += this.stat(u, 'atk'); if (isV) boost += peek(true); }
          else { if (c.conf) { idle++; continue; } if (this.sc(u).insteadOfScheme) continue; if (!this.sc(u).schemeTarget) sch += this.stat(u, 'sch'); if (isV) boost += peek(false); }
        }
        let enc = 1 + this.allPlayerIcons('hazard'); for (const u of e.sides) enc += this.iconOf(u, 'hazard'); for (const u of this.inPlay()) { const hb = this.sc(u).hazardBonus; if (hb) { const uc = this.controllerOf(u); enc += (uc != null ? this.withPlayerSync(uc, () => hb(this, u)) : hb(this, u)) || 0; } }
        const target = this.mainTarget(), after = this.c(e.main).threat + accel + sch;
        return { hero, accel, sch, atk, attacks, minions, boost, idle, enc, pending: this.p.facedown.length, after, target, last: e.mainIdx + 1 >= e.mainStages.length, special: !!this.sc(e.main).whenCompleted && !this.sc(e.main).loseOnComplete };
      });
    }
    forecastAll() {
      const e = this.e, live = this.livingPlayers();
      const accel = this.accelAmount();
      let totalHaz = this.allPlayerIcons('hazard');
      for (const u of e.sides) totalHaz += this.iconOf(u, 'hazard');
      for (const u of this.inPlay()) { const hb = this.sc(u).hazardBonus; if (hb) { const uc = this.controllerOf(u); totalHaz += (uc != null ? this.withPlayerSync(uc, () => hb(this, u)) : hb(this, u)) || 0; } }
      const perPlayer = live.map((pi, ord) => {
        const f = this.forecast(pi);
        const extraEnc = live.length ? Math.floor(totalHaz / live.length) + (ord < (totalHaz % live.length) ? 1 : 0) : 0;
        return Object.assign({}, f, { pi, name: this.playerName(pi), enc: 1 + extraEnc });
      });
      const totalSch = perPlayer.reduce((t, x) => t + x.sch, 0);
      const target = this.mainTarget(), after = this.c(e.main).threat + accel + totalSch;
      return { accel, target, after, totalSch, last: e.mainIdx + 1 >= e.mainStages.length, special: !!this.sc(e.main).whenCompleted && !this.sc(e.main).loseOnComplete, perPlayer };
    }
    defenseOptions(enemy, o, isVillain) {
      const opts = [], id = this.idt();
      if (this.isHero() && !this.c(id).ex && !this.heroNo('defend')) opts.push({ id: 'hero', label: `${this.nm(id)} 방어 (방어력 ${this.stat(id, 'def')})`, uid: id });
      const noAllyDef = isVillain && this.inPlay().some(x => this.sc(x).allyNoDefendVillain && this.c(x).zone === 'side');
      for (const a of this.p.allies) if (!o.heroOnlyDefend && !this.c(a).ex && !this.sc(a).cannotDefend && !noAllyDef && !(isVillain && this.c(a).att.some(x => this.sc(x).noDefendVillain))) opts.push({ id: a, label: `${this.nm(a)} 방어 (체력 ${this.hpLeft(a)})`, uid: a });
      opts.push({ id: 'none', label: '방어하지 않음' });
      if ([enemy].concat(this.c(enemy).att).some(x => this.sc(x).cannotBeDefended && this.sc(x).cannotBeDefended(this, x, enemy))) { opts.length = 0; opts.push({ id: 'none', label: '방어할 수 없음' }); }
      if ((this.sc(enemy).mustDefendWithAlly || this.c(enemy).att.some(a => this.sc(a).mustDefendWithAlly)) && opts.some(x => x.uid && x.uid !== id)) {
        for (let i = opts.length - 1; i >= 0; i--) if (!(opts[i].uid && opts[i].uid !== id)) opts.splice(i, 1);
      }
      return opts;
    }
    async activate(enemy, o) {
      if (this.isHero()) await this.enemyAttack(enemy, o);
      else await this.enemyScheme(enemy, o);
    }
    dealBoost(n) {
      const out = [];
      for (let i = 0; i < n; i++) { const u = (this.e.fdPending && this.e.fdPending.length) ? this.e.fdPending.shift() : this.takeEncounter(); if (u) { this.put(u, 'boost'); out.push(u); } }
      return out;
    }
    async flipBoost(cards, ctx) {
      let icons = 0, batch = cards.slice();
      while (batch.length) {
        const bc = {};
        for (const u of batch) {
          const b = bc[u] = { act: ctx, card: u, icons: this.boostOf(u) + this.amplify() + (ctx.enemy && this.c(ctx.enemy) && this.sc(ctx.enemy).boostPlus ? this.sc(ctx.enemy).boostPlus(this, ctx.enemy, u) : 0), attack: 'undefended' in ctx, enemy: ctx.enemy, cancelIcons: false, cancelAbility: false };
          await this.window('boostTurned', b);
          if (!b.cancelIcons) await this.window('boostCounted', b);
        }
        let n = 0; for (const u of batch) n += bc[u].cancelIcons ? 0 : bc[u].icons;
        icons += n;
        this.log(`강화: ${batch.map(u => `${this.nm(u)}(${bc[u].cancelIcons ? '취소' : bc[u].icons})`).join(', ')} → +${n}`);
        await this.show({ type: 'boost', cards: batch.slice(), icons: n });
        for (const u of batch) { const b = this.sc(u).boostEffect; if (b && !bc[u].cancelAbility && this.c(u).zone === 'boost') { this.encFx = (this.encFx || 0) + 1; let r; try { r = await b(this, u, ctx); } finally { this.encFx--; } if (typeof r === 'number') icons += r; } const ab = ctx.enemy && this.c(ctx.enemy) && this.c(ctx.enemy).zone && this.sc(ctx.enemy).afterBoostCard; if (ab) await ab(this, ctx.enemy, u, ctx); if (ctx.enemy && this.c(ctx.enemy) && this.c(ctx.enemy).zone) for (const a of this.c(ctx.enemy).att.slice()) { const hb = this.sc(a).hostBoostCard; if (hb) await hb(this, a, u, ctx); } } // Loki the Rascal
        // "give the villain an additional boost card for this activation" (Titania's Fury)
        const extra = ctx.extraBoost || 0; ctx.extraBoost = 0;
        batch = extra ? this.dealBoost(extra) : [];
        cards.push(...batch);
      }
      return icons;
    }
    discardBoost(cards, ctx) {
      const back = (ctx && ctx.shuffleBack) || [];
      const bt = ctx && ctx.enemy && this.c(ctx.enemy) && this.sc(ctx.enemy).boostTo;
      cards.forEach(u => { if (this.c(u).zone !== 'boost') return; if (back.includes(u)) { this.put(u, 'edeck'); this.log(`${this.nm(u)}을(를) 조우 덱에 섞습니다`); return; }
        const to = bt && bt(this, ctx.enemy, u); // Seeds of Fear / Creeping Fear / Bound by Fear
        if (to) { this.resetCard(u); this.put(u, 'deck' === to || to === 'deckTop' || to === 'deckBottom' ? 'deck' : 'discard', null, to === 'deckTop'); this.log(`${this.nm(u)}: ${to === 'discard' ? '내 버림 더미로' : to === 'deckTop' ? '내 덱 맨 위로' : '내 덱 맨 아래로'}`, 'warn'); return; }
        this.discard(u); });
      if (back.length) this.shuffle(this.e.deck);
    }
    async putBoostIntoPlay(ctx) {
      for (const u of (ctx.putIntoPlay || [])) if (this.c(u).zone === 'boost') {
        const t = this.d(u).type;
        if (t === 'side') await this.enterSide(u, {});
        else if (t === 'environment') await this.enterEnv(u);
        else if (t === 'attachment') { const h = this.sc(u).attachTo ? this.sc(u).attachTo(this, u) : this.e.villain; if (h) this.attachEnc(u, h); }
        else await this.enterMinion(u, {}, true);
      }
      for (const u of (ctx.revealAfter || [])) if (this.c(u).zone === 'boost') await this.reveal(u);
      for (const f of (ctx.afterBoost || [])) await f(this); // "after this activation ends, ..." (Nebula's Techniques)
    }

    attackMade(r) { return !!(r && !r.stunned && !r.cancelled); }
    // every attack/scheme is an activation: after it, attachments and cards that care get to respond (The Hood box)
    async enemyAttack(enemy, o) { return this.activationWrap(enemy, o, 'attack', o2 => this._enemyAttack(enemy, o2)); }
    async enemyScheme(enemy, o) { return this.activationWrap(enemy, o, 'scheme', o2 => this._enemyScheme(enemy, o2)); }
    async activationWrap(enemy, o, kind, fn) {
      const c = this.c(enemy); if (!c || !c.zone) return fn(o || {});
      if (c.noActUntil && c.noActUntil === this.s.round + ':' + this.s.phase) { this.log(`${this.nm(enemy)}은(는) 이번 단계에 활성화할 수 없습니다`, 'good'); return kind === 'attack' ? { dealt: 0, damaged: [], cancelled: true } : 0; } // Target Spotter
      { const ia = c.att.find(a => this.sc(a).insteadOfActivation); if (ia) { await this.sc(ia).insteadOfActivation(this, ia, enemy, kind); return kind === 'attack' ? { dealt: 0, damaged: [], cancelled: true } : 0; } } // Frozen Solid
      if (c.att.some(a => this.sc(a).noActivate)) { this.log(`${this.nm(enemy)}은(는) 활성화할 수 없습니다`, 'good'); return kind === 'attack' ? { dealt: 0, damaged: [], cancelled: true } : 0; }
      const blocked = kind === 'attack' ? c.stun : c.conf;
      if (!blocked && !(o && o.post)) { const wa = { enemy, kind, cancel: false }; await this.window('enemyWouldActivate', wa); if (wa.cancel) { this.log(`${this.nm(enemy)}의 활성화가 취소되었습니다`, 'good'); return kind === 'attack' ? { dealt: 0, damaged: [], cancelled: true } : 0; } }
      const outer = !(o && o.post); const o2 = Object.assign({}, o || {}); o2.post = o2.post || [];
      const r = await fn(o2);
      if (!blocked && outer) {
        for (const f of o2.post.splice(0)) await f(this);
        if (this.c(enemy).zone) for (const a of this.c(enemy).att.slice()) { const h = this.sc(a).on && this.sc(a).on.hostActivated; if (h) await h(this, a, { enemy, kind }); }
        await this.trigger('enemyActivated', { enemy, kind });
      }
      return r;
    }
    async _enemyAttack(enemy, o) {
      const origCtx = this.s.ctx;
      try {
      o = o || {};
      const ec = this.c(enemy), isVillain = this.d(enemy).type === 'villain';
      if (!ec.zone) return { dealt: 0, damaged: [] };
      if (ec.stun) { ec.stun = false; this.log(`${this.nm(enemy)}: 기절 상태라 공격 대신 기절 해제`); return { dealt: 0, damaged: [], stunned: true }; }
      const ctx = { enemy, cancel: false, overkill: !!o.overkill, piercing: !!o.piercing, ranged: !!o.ranged, after: [], post: o.post || [], onDamaged: o.onDamaged ? [o.onDamaged] : [] };
      // forced interrupts "when would attack" (Webbed Up)
      for (const a of ec.att.slice()) { const f = this.sc(a).on && this.sc(a).on.hostWouldAttack; if (f) await f(this, a, ctx); }
      if (ctx.cancel) return { dealt: 0, damaged: [], cancelled: true };
      const oas = this.sc(enemy).onActivationStart; if (oas) await oas(this, enemy); // Nebula
      for (const a of this.c(enemy).att.slice()) { const f = this.sc(a).on && this.sc(a).on.hostActivates; if (f) await f(this, a, { enemy }); } // Master of the Stones
      if (!this.c(enemy).zone) return { dealt: 0, damaged: [], cancelled: true };
      const ia = this.sc(enemy).insteadOfAttack;
      if (ia && (await ia(this, enemy)) !== false) return { dealt: 0, damaged: [], cancelled: true };
      { const st = this.isHero() && this.p.upgrades.find(x => this.sc(x).insteadOfAttackFor); if (st && !o.forceTarget) { this.log(`${this.nm(st)}: ${this.nm(enemy)}이(가) 공격 대신 음모를 꾸밉니다`, 'good'); await this._enemyScheme(enemy, Object.assign({}, o, { divert: this.sc(st).noDivert ? null : st, post: o.post })); return { dealt: 0, damaged: [], cancelled: true }; } } // Nick Fury: Stealth
      { const pc = this.c(enemy).att.find(a => this.sc(a).hostInsteadOfAttack); if (pc && (await this.sc(pc).hostInsteadOfAttack(this, pc, enemy)) !== false) return { dealt: 0, damaged: [], cancelled: true }; } // Phased and Confused, Hope's Captor
      this.e.curAttacker = enemy; // Flow Like Water
      const oat = this.sc(enemy).onAttackStart; if (oat) await oat(this, enemy, ctx); // Ultron (Vision nemesis)
      this.log(`${this.nm(enemy)}이(가) ${this.nm(this.idt())}을(를) 공격합니다`, 'enemy');
      if (isVillain) await this.trigger('villainInitiatesAttack', ctx); // Spider-Sense
      if (isVillain) await this.window('villainAttackInitiated', ctx); // Mockingbird (Hawkeye)
      await this.window('enemyAttackInitiated', ctx); // Nova
      if (!ctx.cancel) await this.trigger('enemyAttackStart', ctx); // Deadliest Man Alive: a facedown boost card before the boost cards are dealt
      if (ctx.cancel) { this.log(`${this.nm(enemy)}의 공격이 취소되었습니다`, 'good'); return { dealt: 0, damaged: [], cancelled: true }; }
      const allB = this.inPlay().filter(x => this.sc(x).boostAllEnemies && this.c(x).zone === 'side').length; // Playing for Keeps
      let nb = ((isVillain || this.kw(enemy, 'villainous')) && !o.noBoost && !ctx.noBoost) ? 1 + this.activationBoost(enemy, true) + allB : (!o.noBoost ? allB + this.minionFd(enemy) : 0);
      const boost = nb ? this.dealBoost(nb) : [];
      if (boost.length && this.livingPlayers().some(pi => this.s.ps[pi].hand.some(h => { const x = this.sc(h).interrupt; return x && x.window === 'boostDealt'; }))) await this.window('boostDealt', { cards: boost, enemy, attack: true }); // Up, Up, and Away
      ctx.atkBonus = (ctx.atkBonus || 0) + (o.atkBonus || 0);
      await this.trigger('enemyAttacks', ctx); // Charge (overkill), Ultron II, Sonic Converter
      if (!this.c(enemy).zone) { this.discardBoost(boost); return { dealt: 0, damaged: [], cancelled: true }; }
      // defense
      let id = this.idt();
      const cannotDef = [enemy].concat(this.c(enemy).att).some(x => this.sc(x).cannotBeDefended && this.sc(x).cannotBeDefended(this, x, enemy));
      const mustAlly = (this.sc(enemy).mustDefendWithAlly || this.c(enemy).att.some(a => this.sc(a).mustDefendWithAlly));
      const opts = this.defenseOptions(enemy, o, isVillain);
      if (cannotDef) this.log(`${this.nm(enemy)}의 공격은 방어할 수 없습니다`);
      else if (mustAlly && opts.some(x => x.uid && x.uid !== id)) this.log(`${this.nm(enemy)}: 동료로 방어해야 합니다`);
      const atk0 = this.stat(enemy, 'atk');
      let pick = 'none';
      if (isVillain && !o.forceTarget) for (const x of this.inPlay()) { const f = this.sc(x).redirectVillainAttack; if (f && !o.forceTarget && !ctx.forceHeroDefend) await f(this, x, enemy, o, ctx); } // Protect Humanity
      if (!o.forceTarget) { const rd = this.p.allies.find(a => { const f = this.sc(a).attackRedirect; return f && (typeof f !== 'function' || f(this, a, enemy)); }); if (rd) o.forceTarget = rd; } // Morlock, Amadeus Cho
      { const ft = this.sc(enemy).attackTargetFn; if (ft && !o.forceTarget) { const t = ft(this, enemy); if (t && t !== id) o.forceTarget = t; } } // Crossfire
      { const mf = this.e.main && this.sc(this.e.main).forceAttackTarget; if (mf && !o.forceTarget) { const t = mf(this, enemy); if (t && t !== id) o.forceTarget = t; } } // Extract Captives
      if (o.forceTarget && o.forceTarget !== id) pick = 'forced'; // Clash of the Titans: the enemy attacks that ally
      else if (ctx.forceDefender && this.c(ctx.forceDefender).zone === 'ally') pick = ctx.forceDefender; // Mutant Protectors
      else if (ctx.forceHeroDefend && this.isHero() && !this.c(id).ex) pick = 'hero';
      else if (ctx.freeHeroDefense && this.isHero()) { pick = 'hero'; this.log(`${this.nm(id)}이(가) 소진하지 않고 방어합니다`); }
      else if (opts.length > 1) pick = await this.ask({ type: 'defend', title: `${this.nm(enemy)}의 공격 (공격력 ${atk0} + 강화 ${boost.length}장)`, enemy, options: opts, boostCount: boost.length });
      if (pick && !['hero', 'none', 'forced'].includes(pick) && this.c(pick) && this.c(pick).zone === 'ally' && !(await this.payAllyTax(pick, '방어'))) pick = 'none'; // Divided Loyalties
      // Defend for another player (only if target player did not defend and attack is defendable)
      if ((pick === 'none' || !pick) && !cannotDef && !o.forceTarget && !ctx.forceDefender && !ctx.forceHeroDefend && !ctx.freeHeroDefense && this.livingPlayers().length > 1) {
        for (const pi of this.playerOrder(origCtx).slice(1)) {
          const otherOpts = this.withPlayerSync(pi, () => this.defenseOptions(enemy, o, isVillain));
          if (otherOpts.length <= 1) continue;
          let p2 = await this.withPlayer(pi, () => this.ask({
            type: 'defend',
            title: `${this.nm(enemy)}의 ${this.playerName(origCtx)} 공격 — 대신 방어할까요? (공격력 ${atk0} + 강화 ${boost.length}장)`,
            enemy, options: otherOpts, boostCount: boost.length, owner: pi
          }));
          if (p2 && !['hero', 'none'].includes(p2) && this.c(p2) && this.c(p2).zone === 'ally') {
            const taxOk = await this.withPlayer(pi, () => this.payAllyTax(p2, '방어'));
            if (!taxOk) p2 = 'none';
          }
          if (p2 && p2 !== 'none') {
            this.s.ctx = pi;
            id = this.idt();
            pick = p2;
            this.log(`${this.playerName(pi)}이(가) ${this.playerName(origCtx)} 대신 방어합니다`, 'good');
            break;
          }
        }
      }
      ctx.undefended = pick === 'none' || !pick;
      if (ctx.undefended && !ctx.redirectTo) { const rk = this.p.allies.find(a => this.sc(a).takesUndefended); if (rk) ctx.redirectTo = rk; } // Robert Kelly
      ctx.defender = pick === 'hero' ? id : (pick && !['none', 'forced'].includes(pick) ? pick : null);
      const icons = await this.flipBoost(boost, ctx);
      let dmg = ctx.preventAll ? 0 : this.stat(enemy, 'atk') + icons + (ctx.atkBonus || 0);
      if (!ctx.preventAll) for (const x of [enemy].concat(this.c(enemy).att)) { const ab = this.sc(x).attackBonus; if (ab) dmg += ab(this, x, ctx) || 0; } if (!ctx.preventAll) for (const x of this.inPlay()) { const f = this.sc(x).enemyAttackBonus; if (f) dmg += f(this, x, enemy, ctx) || 0; } // Secret Avengers (main scheme) // Wrecker: +2 if undefended
      if (ctx.prevent3) dmg = Math.max(0, dmg - ctx.prevent3); if (ctx.maxDmg != null) dmg = Math.min(dmg, ctx.maxDmg); // Magic Barrier, Energy Conversion
      if (this.kw(enemy, 'overkillAtk')) ctx.overkill = true; if (this.kw(enemy, 'piercingAtk')) ctx.piercing = true; // Karn
      for (const x of [enemy].concat(this.c(enemy).att)) { const ap = this.sc(x).attackProps; if (!ap) continue; const pr = ap(this, x, ctx) || {}; if (pr.piercing) ctx.piercing = true; if (pr.ranged) ctx.ranged = true; if (pr.overkill) ctx.overkill = true; if (pr.indirect) ctx.indirect = true; if (pr.splitEven) ctx.splitEven = true; }
      if (ctx.atkBonus) this.log(`이번 공격 공격력 +${ctx.atkBonus}`);
      if (ctx.lateDefender && ctx.undefended && this.c(ctx.lateDefender) && this.c(ctx.lateDefender).zone === 'ally' && pick !== 'forced') { pick = ctx.lateDefender; ctx.undefended = false; ctx.defender = pick; ctx.noExDef = true; } // Swordsman: declared as a defender after a boost card
      let target = id; const hd = { enemy, defBonus: 0, after: [] }; this.e.heroDefending = pick === 'hero';
      if (pick === 'forced') { target = o.forceTarget; this.log(`${this.nm(enemy)}이(가) ${this.nm(target)}을(를) 공격합니다`); }
      else if (pick === 'hero') { if (!ctx.freeHeroDefense && !this.p.phase.freeDefendPhase) this.c(id).ex = true; const bpd = { kind: 'defend', bonus: 0 }; await this.window('basicPowerUsed', bpd); hd.defBonus += bpd.bonus; await this.window('heroDefends', hd); const df = this.stat(id, 'def') + hd.defBonus + (ctx.defBonus || 0) + this.vsBonus('def', id, enemy); this.log(`${this.nm(id)} 방어: 피해 ${dmg} - 방어력 ${df}`); dmg = Math.max(0, dmg - df); if (hd.toThreat) { const n = dmg; dmg = 0; if (n && this.e.main) { const r = await this.removeThreat(this.e.main, n, { src: id }); this.log(`이 공격은 피해 대신 주 음모에서 위협 ${r}을 제거합니다`, 'good'); } } } // Determined Defense
      else if (pick && pick !== 'none') { target = pick; if (!ctx.noExDef) this.c(target).ex = true; this.log(`${this.nm(target)}이(가) 대신 방어${ctx.noExDef ? ' (소진하지 않음)' : ''}`); const defCtrl = this.controllerOf(pick); ctx.after.push(async gg => { if (gg.c(pick).zone === 'ally') await gg.withPlayer(defCtrl, () => gg.window('afterAllyDefends', { ally: pick, enemy })); }); }
      else this.log('방어하지 않음');
      const damaged = []; let dealt = 0;
      if (this.c(enemy).zone) {
        if (dmg > 0) {
          if (ctx.piercing && (this.sc(target).noPiercingVs || this.c(target).att.some(a => this.sc(a).noPiercingVs))) ctx.piercing = false;
          if (ctx.piercing && this.c(target).tough) { const k = 1 + (this.c(target).toughX || 0); this.c(target).tough = false; this.c(target).toughX = 0; this.log(`관통: ${this.nm(target)}의 강인함 제거`); for (let i = 0; i < k; i++) await this.toughGone(target); }
          if (ctx.indirect) { await this.indirectDamage(dmg, enemy); dmg = 0; }
          if (ctx.splitEven && dmg > 0) { await this.splitDamage(dmg, enemy); dmg = 0; } // Bombshell
          if (dmg > 0 && ctx.redirectTo && this.c(ctx.redirectTo) && this.c(ctx.redirectTo).zone) { this.log(`피해 ${dmg}이(가) ${this.nm(ctx.redirectTo)}에게 갑니다`, 'warn'); await this.dealDamage(ctx.redirectTo, dmg, { src: enemy, attack: true }); dmg = 0; } // Psychic Misdirection
          const r = dmg > 0 ? await this.dealDamage(target, dmg, { src: enemy, attack: true, ranged: !!(ctx.ranged || this.kw(enemy, 'ranged')) }) : { dealt: 0, excess: 0 };
          if (r.dealt) await this.trigger('attackDealt', { attacker: enemy, target, dealt: r.dealt });
          dealt += r.dealt; ctx.excess = r.excess || 0;
          if (r.dealt > 0) damaged.push(target);
          if (r.dealt > 0 && this.c(target).zone) await this.window('tookAttackDamage', { enemy, amount: r.dealt, target });
          if (target !== id && r.excess > 0 && ctx.overkill) {
            this.log(`압도: 남은 피해 ${r.excess} → ${this.nm(id)}`);
            const r2 = await this.dealDamage(id, r.excess, { src: enemy, attack: true });
            dealt += r2.dealt;
            if (r2.dealt > 0) damaged.push(id);
          }
        } else this.log('피해 없음');
        const alive = damaged.filter(u => this.c(u).zone);
        for (const f of ctx.onDamaged) if (damaged.length) await f(this, alive, dealt);
        // Retaliate: the attacked character (hero, or the ally that defended) hits back
        if (this.c(target).zone && this.c(enemy).zone && !ctx.ranged) {
          const ret = this.stat(target, 'retaliate');
          if (ret > 0) { this.log(`보복: ${this.nm(target)} → ${this.nm(enemy)} 피해 ${ret}`); await this.dealDamage(enemy, ret, { src: target, byPlayer: true }); }
        }
        if (pick === 'hero') {
          const none = !damaged.includes(id);
          for (const f of hd.after) await f(this, none); // Desperate Defense
          this.e.lastHeroDefense = { enemy, noDamage: none }; // Defend the Title
          await this.window('afterHeroDefends', { enemy, noDamage: none });
          if (this.c(id).zone) await this.trigger('basicHeroPower', { kind: 'defend' });
          if (this.c(id).zone) await this.window('afterBasicPower', { kind: 'defend' });
        }
      }
      this.e.heroDefending = false;
      for (const f of ctx.after) await f(this);
      if (isVillain && this.c(id).zone && this.c(enemy).zone !== null) await this.window('afterVillainAttack', { enemy, defender: ctx.defender, undefended: ctx.undefended });
      await this.putBoostIntoPlay(ctx);
      this.discardBoost(boost, ctx);
      if (this.c(enemy).zone) await this.trigger('afterEnemyAttack', { enemy, target, damaged, dealt, undefended: ctx.undefended, excess: ctx.excess || 0 });
      return { dealt, damaged, undefended: ctx.undefended };
      } finally { this.s.ctx = origCtx; }
    }
    async _enemyScheme(enemy, o) {
      o = o || {};
      const ec = this.c(enemy), isVillain = this.d(enemy).type === 'villain';
      if (!ec.zone) return;
      if (ec.conf) { ec.conf = false; this.log(`${this.nm(enemy)}: 혼란 상태라 음모 대신 혼란 해제`); return 0; }
      const is = this.sc(enemy).insteadOfScheme;
      if (is) { await is(this, enemy); return 0; }
      const ctx = { enemy, reduce: 0, onDamaged: [], after: [], post: o.post || [] };
      const oas = this.sc(enemy).onActivationStart; if (oas) await oas(this, enemy);
      for (const a of this.c(enemy).att.slice()) { const f = this.sc(a).on && this.sc(a).on.hostActivates; if (f) await f(this, a, { enemy }); }
      this.log(`${this.nm(enemy)}이(가) 음모를 꾸밉니다`, 'enemy');
      if (isVillain) await this.window('villainSchemes', ctx); else await this.window('minionSchemes', ctx); // Informant
      const bsc = this.sc(enemy).beforeScheme; if (bsc) await bsc(this, enemy, ctx); // Master Mold
      for (const a of this.c(enemy).att.slice()) { const f = this.sc(a).on && this.sc(a).on.hostWouldScheme; if (f && this.c(a).zone === 'attach') await f(this, a, ctx); } // Celestial Armor
      const allB = this.inPlay().filter(x => this.sc(x).boostAllEnemies && this.c(x).zone === 'side').length; // Playing for Keeps
      const boost = ((isVillain || this.kw(enemy, 'villainous')) && !o.noBoost && !this.sc(enemy).schemeNoBoost) ? this.dealBoost(1 + this.activationBoost(enemy, false) + allB) : (!o.noBoost && allB ? this.dealBoost(allB) : []);
      const icons = await this.flipBoost(boost, ctx);
      const n = Math.max(0, this.stat(enemy, 'sch') + icons + (o.schBonus || 0) - ctx.reduce);
      await this.putBoostIntoPlay(ctx);
      this.discardBoost(boost, ctx);
      let placed = 0;
      const st = this.sc(enemy).schemeTarget; let dest = (st && st(this, enemy)) || this.e.main; // Wrecking Crew: their own side scheme
      for (const x of this.inPlay()) { const f = this.sc(x).redirectScheme; const d = f && f(this, x, enemy); if (d) dest = d; } // Traffic Jam
      if (n > 0 && ctx.invert) { const r = await this.removeThreat(dest, n, { src: this.idt() }); this.log(`정신 조작: 이번 음모는 위협 ${r}을 제거합니다`, 'good'); await this.afterThreatRemoved(dest); } // Psychic Manipulation
      else if (n > 0) { let m = n; const dv = o.divert; if (dv && dest === this.e.main && this.c(dv).zone && (this.c(dv).threat || 0) <= 5) { m--; this.c(dv).threat = (this.c(dv).threat || 0) + 1; this.log(`${this.nm(dv)}: 위협 1을 대신 받습니다`); } placed = m > 0 ? await this.placeThreat(dest, m, { scheme: true, enemy }) : 0; } // Stealth suit
      else this.log('놓일 위협 없음');
      if (o.onPlaced) await o.onPlaced(this, placed);
      if (this.c(enemy).zone) await this.trigger('afterEnemyScheme', { enemy, placed });
      if (this.c(enemy).zone && placed > 0) await this.window('afterEnemySchemeW', { enemy, placed }, `${this.nm(enemy)}이(가) 위협 ${placed}을(를) 놓았습니다`); // Entrapment
      if (!isVillain && this.c(enemy).zone) await this.window('minionSchemed', { enemy });
      return placed;
    }

    // ------------------------------------------------------------ encounter cards
    async reveal(uid, opts) {
      opts = opts || {};
      const d = this.d(uid), S = this.sc(uid);
      if (d.enc && this.inPlay().some(a => this.sc(a).willRevealHook)) { const wr = { card: uid }; await this.window('willReveal', wr); if (wr.replace && wr.replace !== uid) return this.reveal(wr.replace, opts); } // Scarlet Spider, Spider-Tingle, Eidetic Memory
      this.put(uid, 'limbo');
      this.log(`조우 카드 공개: ${d.name}`, 'enc');
      await this.show({ type: 'reveal', uid });
      if (!d.enc) { // a player card in the encounter deck: its effect cannot be canceled
        if (S.whenRevealedEnc) await S.whenRevealedEnc(this, uid);
        if (this.c(uid).zone === 'limbo') this.removeFromGame(uid);
        return;
      }
      const ctx = { card: uid, surge: 0, cancel: false, cancelAll: false, revealAnother: 0 };
      await this.window('cardRevealed', ctx);
      { let inc = d.incite || 0; for (const x of this.inPlay()) { const f = this.sc(x).inciteFor; if (f && x !== uid) inc += f(this, x, uid) || 0; } // Dial M for Mojo
        if (inc && !ctx.cancelAll && this.e.main) { this.log(`선동 ${inc}: 주 음모에 위협 ${inc}`); await this.placeThreat(this.e.main, inc, {}); } }
      if (ctx.cancelAll) {
        this.discard(uid, `「${d.name}」의 효과를 취소하고 버렸습니다`);
        for (let i = 0; i < ctx.revealAnother; i++) { const n = this.takeEncounter(); if (n) await this.reveal(n); }
        return;
      }
      if (d.type === 'treachery') {
        await this.trigger('treacheryRevealing', ctx);
        await this.window('treacheryRevealed', ctx);
        if (this.c(uid).noWR) { delete this.c(uid).noWR; ctx.cancel = true; this.log(`「${d.name}」의 공개 시 효과가 취소되었습니다`, 'good'); } // Spider-Tingle
        if (!ctx.cancel) await this.runRevealed(uid, ctx);
        if (this.c(uid).zone === 'limbo') await this.trigger('treacheryDone', { card: uid }); // Loki the Miscreant / Knave
        if (this.c(uid).zone === 'limbo') await this.window('treacheryResolved', { card: uid }); // Spider-Man Noir
        if (this.c(uid).zone === 'limbo') this.discard(uid);
      } else if (d.type === 'minion') {
        if (this.inPlay().some(x => this.sc(x).surgeFor && this.sc(x).surgeFor(this, x, uid))) { ctx.surge++; this.log(`${d.name}: 쇄도를 얻습니다`); }
        await this.enterMinion(uid, ctx);
        await this.trigger('minionRevealed', { minion: uid }); // Field Study
      } else if (d.type === 'attachment' && S.revealFirst) { // the card finds its own host (Fallen Warrior, Beguiled)
        await this.runRevealed(uid, ctx);
        if (this.c(uid).zone === 'limbo') this.discard(uid);
      } else if (d.type === 'attachment') {
        const host = S.attachTo ? S.attachTo(this, uid) : this.e.villain;
        if (host) { this.attachEnc(uid, host); await this.runRevealed(uid, ctx); }
        else { this.log(`${d.name}: 부착할 대상이 없어 버립니다`); this.discard(uid); if (S.surgeIfNoHost) ctx.surge++; }
      } else if (d.type === 'environment') {
        await this.enterEnv(uid);
        await this.runRevealed(uid, ctx);
      } else if (d.type === 'side') {
        await this.enterSide(uid, ctx);
      } else if (d.type === 'obligation') {
        const obOwner = this.ownerOf(uid);
        if (obOwner != null && this.s.ps[obOwner] && this.s.ps[obOwner].eliminated) { this.removeFromGame(uid); }
        else if (obOwner != null && obOwner !== this.s.ctx) {
          this.log(`${d.name}: ${this.playerName(obOwner)}에게 주어집니다`, 'warn');
          await this.withPlayer(obOwner, () => this.runRevealed(uid, ctx));
        } else {
          await this.runRevealed(uid, ctx);
        }
        if (this.c(uid).zone === 'limbo') this.discard(uid);
      } else if (d.type === 'ally') { // Shop Proprietor
        await this.putAllyIntoPlay(uid); await this.runRevealed(uid, ctx);
      }
      if (d.surge) ctx.surge++;
      await this.flushPending();
      if (this.allAllies().some(a => this.sc(a).afterRevealResponse)) await this.window('afterEncounterRevealed', { card: uid }); // Venom (ally)
      if (ctx.surge > 0) await this.window('surgeResolving', { card: uid });
      for (let i = 0; i < ctx.surge; i++) {
        this.log(`쇄도: 조우 카드 1장 추가 공개`, 'warn');
        const n = this.takeEncounter();
        if (n) await this.reveal(n);
      }
    }
    async runRevealed(uid, ctx) {
      const S = this.sc(uid);
      const f = (this.isHero() ? S.whenRevealedHero : S.whenRevealedAlter) || S.whenRevealed;
      if (!f) return;
      if (ctx && ctx.cancelWR) { this.log(`「${this.nm(uid)}」의 공개 시 효과가 취소되었습니다`, 'good'); return; }
      if (this.inPlay().some(x => { const f = this.sc(x).skipRevealed; return f && f(this, x, uid); })) { this.log(`「${this.nm(uid)}」의 공개 시 효과를 무시합니다`); return; }
      const times = 1 + this.c(this.idt()).att.filter(a => this.sc(a).extraRevealed).length;
      const enc = !!this.d(uid).enc; if (enc) this.encFx = (this.encFx || 0) + 1; // encounter effects (Front Organization)
      try { for (let i = 0; i < times; i++) { if (i) this.log(`언론 보도: 「${this.nm(uid)}」의 공개될 때 효과를 한 번 더`); await f(this, uid, ctx); } } finally { if (enc) this.encFx--; }
    }
    async enterMinion(uid, ctx, noRevealed) {
      this.put(uid, 'minion');
      if (this.d(uid).toughness || this.kw(uid, 'toughness')) this.c(uid).tough = true; // The Dark Riders grant toughness
      this.log(this.players > 1 ? `${this.nm(uid)}이(가) ${this.playerName()}와(과) 교전합니다` : `${this.nm(uid)}이(가) 당신과 교전합니다`);
      if (!noRevealed) await this.runRevealed(uid, ctx || {});
      if (this.c(uid).zone === 'minion') await this.trigger('minionEnters', { minion: uid });
      if (this.c(uid).zone === 'minion') await this.window('minionEntered', { minion: uid });
      if (this.kw(uid, 'quickstrike') && this.isHero() && this.c(uid).zone === 'minion') { this.log(`${this.nm(uid)} 속공!`); await this.enemyAttack(uid, {}); }
      const tw = this.d(uid).teamwork; // Teamwork (trait): activates if another minion with that trait is in play
      if (tw && this.c(uid).zone === 'minion' && this.e.minions.some(m => m !== uid && this.hasTrait(m, tw))) { this.log(`${this.nm(uid)}: 팀워크 (${tw}) — 활성화합니다`, 'warn'); await this.activate(uid, {}); }
    }
    attachEnc(uid, host) {
      const d = this.d(uid);
      this.put(uid, 'attach', host);
      if (d.uses) this.c(uid).cnt[d.uses.kind] = d.uses.n * (d.uses.star ? this.players : 1) + (d.uses.perHero || 0) * this.players;
      this.log(`${d.name} → ${this.nm(host)}에 부착`);
    }
    async enterEnv(uid) {
      this.put(uid, 'env'); this.log(`환경 「${this.nm(uid)}」 등장`);
      { const d = this.d(uid); if (d.uses && this.c(uid).cnt[d.uses.kind] == null) this.c(uid).cnt[d.uses.kind] = d.uses.n * (d.uses.star ? this.players : 1); } // Disasters: civilian counters
      await this.trigger('environmentEnters', { env: uid });
    }
    minionToAlly(m, cons) { // Mind Control (1 consequential damage), Karma (2)
      const c = this.c(m); const real = c.real || c.id; const id = cons > 1 ? `CA${cons}_${real}` : `CA_${real}`; MC.synth(id);
      c.real = real; c.id = id; c.ex = false; c.stun = false; c.conf = false; this.put(m, 'ally');
      this.log(`${this.nm(m)}을(를) 조종합니다 (동료로 취급)`, 'good'); return m;
    }
    controlEnds(a) { // a controlled minion goes back to being a minion engaged with you
      const c = this.c(a); if (!c || c.zone !== 'ally' || !/^CA\d?_/.test(c.id)) return;
      c.id = c.real; delete c.real; c.ex = false; this.put(a, 'minion'); this.log(`${this.nm(a)}: 조종이 끝나 다시 하수인이 됩니다`, 'warn');
    }
    allyToMinion(ally, trait) {
      const c = this.c(ally); const real = c.real || c.id;
      const id = `AM_${real}_${trait}`; MC.synth(id);
      for (const a of c.att.slice()) if (!this.d(a).enc) this.discard(a);
      c.real = real; c.id = id; c.ex = false; this.put(ally, 'minion');
      this.log(`${this.nm(ally)}이(가) 당신과 교전하는 하수인이 됩니다`, 'warn');
      return ally;
    }
    async enterSide(uid, ctx) {
      const d = this.d(uid);
      this.put(uid, 'side');
      this.c(uid).threat = (d.start || 0) * (d.startStar ? this.players : 1) + (d.hinder || 0) * (d.hinderStar ? this.players : 1);
      this.log(`부가 음모 「${d.name}」 등장 (위협 ${this.c(uid).threat}${d.hinder ? `, 방해 ${d.hinder}` : ''})`);
      await this.runRevealed(uid, ctx || {});
      if (this.c(uid).zone === 'side') await this.trigger('sideEntered', { scheme: uid }); // Wrist Navigator
      if (d.type === 'pside') await this.psideLimit();
    }
    async psideLimit() { // player side scheme limit: (players + 1) / 2 in play; the first player discards the excess
      const lim = Math.floor((this.players + 1) / 2);
      for (let i = 0; i < 10; i++) { const ps = this.e.sides.filter(x => this.d(x).type === 'pside' && !this.sc(x).noPsideLimit); if (ps.length <= lim) return;
        const t = await this.ask({ type: 'target', title: `플레이어 부가 음모는 ${lim}장까지입니다: 버릴 카드를 고르세요`, cands: ps, cancelable: false }); if (!t) return; this.log(`플레이어 부가 음모 한도: ${this.nm(t)}을(를) 버립니다`, 'warn'); this.discard(t); }
    }
    // card helpers used by scripts
    async discardRandomHand(n) {
      const out = [];
      for (let i = 0; i < n && this.p.hand.length; i++) {
        const u = this.p.hand[Math.floor(this.rand() * this.p.hand.length)];
        this.put(u, 'discard'); out.push(u);
      }
      if (out.length) this.log(`무작위로 버림: ${out.map(u => this.nm(u)).join(', ')}`);
      return out;
    }
    // The Hood: shuffle one set-aside modular encounter set, chosen at random, into the encounter deck
    shuffleAsideModular() {
      const e = this.e; const left = (e.asideMods || []).filter(m => !m.used);
      if (!left.length) { this.log('따로 둔 모듈 세트가 더 없습니다'); return null; }
      const m = left[Math.floor(this.rand() * left.length)]; m.used = true;
      for (const u of m.cards) if (this.c(u).zone === 'aside') this.put(u, 'edeck');
      this.shuffle(e.deck); this.log(`모듈 세트 「${MC.modulars[m.key].name}」를 조우 덱에 섞습니다`, 'warn');
      return m.key;
    }
    async createDrones(n) {
      for (let i = 0; i < n; i++) {
        if (!this.p.deck.length) await this.reshuffleDeck();
        const u = this.p.deck[0]; if (!u) return;
        const c = this.c(u); c.real = c.id; c.id = 'DRONE';
        this.put(u, 'minion');
        this.log('덱 맨 위 카드가 뒷면으로 드론 하수인이 되어 교전합니다', 'enemy');
      }
    }
    async discardDeckTop(n) {
      const out = [];
      for (let i = 0; i < n; i++) {
        if (!this.p.deck.length) await this.reshuffleDeck();
        const u = this.p.deck[0]; if (!u) break;
        this.put(u, 'discard'); out.push(u);
      }
      if (out.length) this.log(`덱 맨 위에서 버림: ${out.map(u => this.nm(u)).join(', ')}`);
      if (out.length) await this.trigger('deckTopDiscarded', { cards: out }); // Skrull Business
      return out;
    }
    // discard encounter cards from the top until one matches; returns it (still in the discard pile)
    discardEncounterUntil(pred) {
      const seen = new Set();
      while (true) {
        const u = this.takeEncounter(); if (!u || seen.has(u)) return null;
        seen.add(u);
        this.put(u, 'ediscard');
        if (pred(this.d(u), u)) return u;
      }
    }
    searchEncounter(pred) { return this.e.deck.concat(this.e.discard).find(u => pred(this.d(u), u)) || null; }
    async dealEncounterCard() { const u = this.takeEncounter(); if (u) { this.put(u, 'facedown'); this.log('조우 카드 1장을 받았습니다 (빌런 단계에 공개)'); await this.window('encounterDealt', { card: u }); } }
    steady(uid) { if (this.c(uid).att.some(a => this.sc(a).removesSteady)) return false; if (this.d(uid).steady || this.c(uid).att.some(a => this.sc(a).grantSteady)) return true; for (const u of this.inPlay()) { const f = this.sc(u).steadyFor; if (f && f(this, u, uid)) return true; } return false; }
    stalwart(uid) { if (this.c(uid).att.some(a => this.sc(a).removesStalwart)) return false; if (this.d(uid).stalwart || this.c(uid).att.some(a => this.sc(a).grantStalwart)) return true; for (const u of this.inPlay()) { const f = this.sc(u).stalwartFor; if (f && f(this, u, uid)) return true; } return false; }
    heroNo(what) { for (const u of this.myAndEncInPlay()) { const f = this.sc(u).heroNo; if (f && f[what] && f[what](this, u)) return true; } return false; } // Vision (Intangible): cannot attack / defend
    async loseTough(uid, why) { // a card effect discards one tough status card (Colossus)
      const c = this.c(uid); if (!c || !c.tough) return false;
      if (c.toughX) c.toughX--; else c.tough = false; this.log(`${this.nm(uid)}: 강인함 카드 1장 버림${why ? ` (${why})` : ''}`);
      await this.toughGone(uid); return true;
    }
    async toughGone(uid) { await this.trigger('toughLost', { target: uid }); await this.window('toughDiscarded', { target: uid }); } // Luke Cage
    toughCount(uid) { const c = this.c(uid); return c && c.tough ? 1 + (c.toughX || 0) : 0; }
    statusPlaced(uid, key) { const c = this.c(uid); if (this.e.main && ['villain', 'minion'].includes(c.zone)) { const ms = this.sc(this.e.main).anyStatusGiven; if (ms) ms(this, this.e.main, uid, key); } } // Guerilla Warfare
    giveStatus(uid, key, label) {
      const c = this.c(uid); if (!c || !c.zone) return false;
      if (key === 'stun' || key === 'conf') { const ab = c.att.find(a => this.sc(a).absorbsStatus); if (ab) { this.discard(ab, `${this.nm(ab)}: ${key === 'stun' ? '기절' : '혼란'} 대신 버려집니다`); const oa = this.sc(ab).onAbsorbStatus; if (oa) oa(this, ab, uid); return false; } } // Solid Sound Constructs
      if ((key === 'stun' && (c.att.some(a => this.sc(a).blocksStun) || this.sc(uid).noStun)) || (key === 'conf' && c.att.some(a => this.sc(a).blocksConf))) { this.log(`${this.nm(uid)}: ${key === 'stun' ? '기절' : '혼란'}하지 않습니다`); return false; } // Magneto's Armor / Helmet
      if ((key === 'stun' || key === 'conf') && this.stalwart(uid)) { this.log(`${this.nm(uid)}: 불굴 — ${key === 'stun' ? '기절' : '혼란'}하지 않습니다`); return false; }
      if ((key === 'stun' || key === 'conf') && this.steady(uid) && !c[key] && !c[key + 'H']) { c[key + 'H'] = true; this.statusPlaced(uid, key); this.log(`${this.nm(uid)}: 견고 — ${key === 'stun' ? '기절' : '혼란'} 카드 1장 (2장째에 적용)`); { const os = this.sc(uid).onStatusGiven; if (os) os(this, uid, key); } return true; }
      if ((key === 'stun' || key === 'conf') && c[key + 'H']) c[key + 'H'] = false;
      if (c[key] && key === 'tough' && this.sc(uid).multiTough && (this.sc(uid).multiTough === true || (c.toughX || 0) + 1 < this.sc(uid).multiTough)) { c.toughX = (c.toughX || 0) + 1; this.log(`${this.nm(uid)}: ${label} (강인함 ${c.toughX + 1}장)`); return true; } // Armadillo
      if (c[key]) return false; c[key] = true; this.statusPlaced(uid, key);
      this.log(`${this.nm(uid)}: ${label}`); { const os = this.sc(uid).onStatusGiven; if (os) os(this, uid, key); }
      if ((key === 'stun' || key === 'conf') && this.d(uid).vulnerable && ['minion', 'villain'].includes(c.zone) && this.d(uid).type === 'minion') { this.discard(uid, `${this.nm(uid)}: 취약 — 버려집니다`); } // Vulnerable
      return true;
    }
    async assignDamage(total, cands, title, src) {
      for (let i = 0; i < total; i++) {
        const live = cands.filter(u => this.c(u).zone);
        if (!live.length) return;
        const t = live.length === 1 ? live[0] : await this.ask({ type: 'target', title: `${title} (${i + 1}/${total})`, cands: live, cancelable: false });
        await this.dealDamage(t, 1, { src });
      }
    }

    // ------------------------------------------------------------ save
    snapshot() { return JSON.parse(JSON.stringify(this.s)); }
    static restore(io, state) {
      const s = JSON.parse(JSON.stringify(state)), e = s.e;
      e.env = e.env || []; e.aside = e.aside || [];
      if (e.mainStages && typeof e.mainStages[0] === 'string') e.mainStages = e.mainStages.map(x => [null, x]);
      s.scen = s.scen || { key: 'rhino', expert: false, modular: 'bomb_scare' };
      if (!s.ps && s.p) {
        s.ps = [Object.assign({ idx: 0, heroKey: s.heroKey, deckName: s.deckName || '내 덱', cameo: s.cameo || null, eliminated: false }, s.p)];
        delete s.p;
        s.v = 2; s.first = 0; s.ctx = 0; s.turnsDone = [];
        const pZones = new Set(['deck', 'hand', 'discard', 'ally', 'support', 'upgrade', 'facedown', 'pobl', 'pset', 'inv', 'invdis']);
        for (const u in s.cards) {
          const c = s.cards[u], cd = MC.cards[c.id];
          if (pZones.has(c.zone)) c.pZone = 0;
          if (c.zone === 'identity' || c.zone === 'setaside' || (cd && (!cd.enc || cd.type === 'obligation'))) c.owner = 0;
          if (['ally', 'support', 'upgrade', 'pobl'].includes(c.zone)) c.ctrl = 0;
          if (c.zone === 'minion') c.eng = 0;
        }
      }
      if (s.ctx == null) s.ctx = s.first || 0;
      if (s.first == null) s.first = 0;
      if (!Array.isArray(s.turnsDone)) s.turnsDone = [];
      return new Game(io, s);
    }
  }
  MC.Game = Game;
})(typeof window !== 'undefined' ? window : globalThis);
