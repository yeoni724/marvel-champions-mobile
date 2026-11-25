/* Civil War (cw: 56001-56202, synthezoid: 57001-57073): Tigra, Hulkling, six leaders, Registration/Resistance main
   schemes and the modular sets. Ported from cards/pack/cw and cards/pack/synthezoid of the community build. This prelude
   is shared by packs/cw.js and packs/synthezoid.js. Cooperative (solo) mode only: "your leader" does not exist, so the
   "Otherwise" half of those effects applies, and the "enemy team" makes its choices for you. */
(function () {
  'use strict';
  const S = {};
  const idOf = (g, u) => g.c(u).id;
  const tr = (g, u, t) => (g.d(u).tr || []).includes(t) || g.hasTrait(u, t);
  const pick = async (g, cands, title) => !cands.length ? null : cands.length === 1 ? cands[0] : await g.ask({ type: 'target', title, cands, cancelable: false });
  const yes = async (g, title) => (await g.ask({ type: 'choice', title, options: [{ id: 'y', label: '예' }, { id: 'n', label: '아니요' }] })) === 'y';
  async function thw(g, t, n, src) { const r = await g.removeThreat(t, n, { src }); g.log(`${g.nm(t)} 위협 ${r} 제거`); await g.afterThreatRemoved(t); return r; }
  const CW = MC.cw = MC.cw || {};
  const fd = (g, n) => { for (let i = 0; i < (n || 1); i++) { const x = g.takeEncounter(); if (x) g.put(x, 'facedown'); } };
  const burn = async (g, n) => { const out = []; for (let i = 0; i < n; i++) { if (!g.p.deck.length) await g.reshuffleDeck(); const x = g.p.deck[0]; if (!x) break; g.put(x, 'discard'); out.push(x); }
    const sb = g.e.sides.find(y => idOf(g, y) === '56056'); if (sb && out.length) { g.c(sb).under = g.c(sb).under || []; for (const x of out) if (g.c(x).zone === 'discard') g.put(x, 'under', sb); g.log(`스크럴 사업: 버린 카드 ${out.length}장을 음모 아래에 둡니다`); } // Skrull Business
    return out; };
  const encMinion = async (g, title) => { for (let i = 0; i < 200; i++) { const x = g.takeEncounter(); if (!x) return null; g.put(x, 'ediscard'); if (g.d(x).type === 'minion') return x; } return null; };
  Object.assign(CW, { fd, burn, pick, yes, thw, encMinion });
  const pk = g => g.s.round + ':' + g.s.phase;
  const enc = g => g.e.deck.concat(g.e.discard);
  const findIn = (g, ids, disc) => { const pool = (disc ? enc(g) : g.e.deck.slice()).filter(x => ids.includes(idOf(g, x))); return pool[0] || null; };
  async function findReveal(g, ids, disc) { const x = findIn(g, ids, disc); g.shuffle(g.e.deck); if (!x) { g.log('찾을 카드가 없습니다'); return null; } await g.reveal(x); return x; }
  function findAttach(g, ids, host) { const x = g.e.deck.concat(g.e.discard, g.e.setaside, g.e.aside || []).find(y => ids.includes(idOf(g, y))); if (!x || !host) return null; g.attachEnc(x, host); g.shuffle(g.e.deck); return x; }
  const stage2 = { async whenRevealed(g, v) { await g.forEachPlayer(() => g.dealEncounterCard()); g.c(v).noDmg = pk(g); g.log(`${g.nm(v)}: 이번 단계 동안 피해를 받지 않습니다`, 'warn'); } };
  const leaderBase = { cannotTakeDamage: (g, s) => g.c(s).noDmg === pk(g) };
  const discardOnHit = (req, label) => ({ window: 'afterBasicAttack', timing: 'hero', label, cost: { n: req.length, req }, can: (g, u, ctx) => g.c(u).zone === 'attach' && ctx.target === g.c(u).on, resolve(g, u) { g.discard(u, `${g.nm(u)} 버림`); } });
  const discard3Same = label => ({ window: 'afterBasicAttack', timing: 'hero', label, can: (g, u, ctx) => g.c(u).zone === 'attach' && ctx.target === g.c(u).on && ['Y', 'B', 'R'].some(t => g.canAfford({ n: 3, req: t + t + t }, null)),
    async resolve(g, u) { const RK = { Y: '에너지', B: '정신', R: '물리' }; const ts = ['Y', 'B', 'R'].filter(t => g.canAfford({ n: 3, req: t + t + t }, null)); const t = ts.length === 1 ? ts[0] : await g.ask({ type: 'choice', title: '같은 종류 자원 3개', options: ts.map(x => ({ id: x, label: `${RK[x]} 3개` })) }); if ((await g.pay({ n: 3, req: t + t + t }, null, `${g.nm(u)} 버리기`, true)) == null) return; g.discard(u, `${g.nm(u)} 버림`); } });
  const revealBoost = { boostEffect(g, u, ctx) { (ctx.post || ctx.after).push(async gg => { if (gg.c(u).zone === 'ediscard') { gg.log(`★ 강화: ${gg.nm(u)} 공개`); await gg.reveal(u); } }); } };
  const oneShotProps = (props, why) => ({ attackProps(g, x, ctx) { if (!ctx['_os' + x]) { ctx['_os' + x] = true; ctx.after.push(gg => { if (gg.c(x).zone === 'attach') gg.discard(x, `${gg.nm(x)}: ${why}`); }); } return props; } });
  const chars = g => [g.idt()].concat(g.p.allies);
  const ctrl = g => g.p.allies.concat(g.p.supports, g.p.upgrades).filter(x => !g.d(x).permanent);
  const costOf = (g, x) => g.d(x).cost || 0;
  const highest = (g, xs) => { const m = Math.max(...xs.map(x => costOf(g, x))); return xs.filter(x => costOf(g, x) === m); };
  const allSchemes = g => [g.e.main].concat(g.e.sides).filter(Boolean);
  async function threatEach(g, n) { for (const s of allSchemes(g)) await g.placeThreat(s, n, {}); }
  async function discardYour(g, types, title) { const xs = g.p.allies.concat(g.p.supports, g.p.upgrades).filter(x => types.includes(g.d(x).type) && !g.d(x).permanent && !g.d(x).enc); const t = await pick(g, xs, title); if (t) g.discard(t, `${g.nm(t)} 버림`); return t; }
  const exhaustable = g => chars(g).filter(x => !g.c(x).ex);
  Object.assign(CW, { pk, findReveal, findAttach, revealBoost, oneShotProps, discard3Same, discardOnHit, chars, ctrl, highest, threatEach, discardYour, allSchemes, costOf });
  CW.unreg = (g, u) => g.hasTrait(u || g.idt(), 'UNREGISTERED');
  CW.unregHit = async g => { if (g.e.main && idOf(g, g.e.main) === '56097b' && g.isHero()) { g.log('반란 영웅 사냥: 미등록 → 피해 2', 'warn'); await g.dealDamage(g.idt(), 2, {}); } };
  CW.fdGive = (g, x) => g.giveFacedownCard(g.e.villain, x);

  // "Resolve the When Revealed ability of each minion in play" / "Resolve the Boost ability of each minion"
  CW.minionsWR = async g => { let n = 0; for (const m of g.e.minions.slice()) { const pi = g.c(m).eng ?? g.s.ctx; await g.withPlayer(pi, async () => { const f = g.sc(m).whenRevealed || (g.isHero() ? g.sc(m).whenRevealedHero : g.sc(m).whenRevealedAlter); if (f && g.c(m).zone === 'minion') { n++; g.log(`${g.nm(m)}의 공개 시 효과`); await f(g, m, { surge: 0 }); } }); } return n; };
  CW.minionsBoost = async (g, ms) => { let n = 0; for (const m of ms.slice()) { const pi = g.c(m).eng ?? g.s.ctx; await g.withPlayer(pi, async () => { const f = g.sc(m).boostEffect; if (f && g.c(m).zone === 'minion') { n++; g.log(`${g.nm(m)}의 ★ 강화 효과`); const ctx = { post: [], after: [], enemy: null, minionBoost: m }; await f(g, m, ctx); for (const p of ctx.post.concat(ctx.after)) await p(g); } }); } return n; };
  // the enemy team picks: the most costly / healthiest card
  CW.worst = (g, xs) => xs.slice().sort((a, b) => (g.d(b).cost || 0) - (g.d(a).cost || 0))[0] || null;
  // shared by the modular sets of both boxes
  const V = g => g.e.villain;
  const toughLeader = (g, why) => { if (V(g)) g.giveStatus(V(g), 'tough', why); };
  const stunYou = why => g => g.giveStatus(g.idt(), 'stun', why);
  const confYou = why => g => g.giveStatus(g.idt(), 'conf', why);
  const fdWhenDefeated = { whenDefeated(g, m) { if (V(g)) CW.fdGive(g, m); } };
  const surgeIfNone = async (g, ctx, n) => { if (!n) { ctx.surge++; g.log('효과가 없어 쇄도를 얻습니다'); } };
  const typeCount = (g, xs) => new Set(xs.map(x => g.d(x).type)).size;
  async function minionsActivate(g, ctx) { // Justice Like Lightning / Street Defenders
    const ms = g.e.minions.slice(); let act = 0;
    for (const m of ms) if (g.c(m).zone === 'minion') { const pi = g.c(m).eng ?? g.s.ctx; act++; await g.withPlayer(pi, () => g.activate(m, {})); }
    if (!act && V(g)) { g.log('활성화한 하수인이 없어 리더가 활성화합니다 (강화 카드 없음)'); await g.activate(V(g), { noBoost: true }); }
  }
  async function exhaustOne(g, title) { const xs = CW.chars(g).filter(x => !g.c(x).ex); const t = await pick(g, xs, title); if (t) { g.c(t).ex = true; g.log(`${g.nm(t)} 소진`); } return t; }
  async function dmgOne(g, n, title) { const xs = CW.chars(g).filter(x => g.c(x).zone); const t = await pick(g, xs, title); if (t) await g.dealDamage(t, n, {}); return t; }
  const attachedProps = props => ({ attackProps(g, x, ctx) { return g.c(x).zone === 'attach' && ctx.enemy === g.c(x).on ? props : {}; } });
  const heroDiscard = (req, label) => ({ timing: 'hero', label, cost: { n: req.length, req }, can: (g, u) => g.c(u).zone === 'attach', use(g, u) { g.discard(u, `${g.nm(u)} 버림`); } });
  const attachToOr = id => g => g.e.minions.find(m => idOf(g, m) === id) || V(g);
  const hpPlus = n => ({ hp: (g, s, t) => g.c(s).zone === 'attach' && t === g.c(s).on ? n : 0 });
  const otherMinionHost = { attachTo: g => g.e.minions.slice().sort((a, b) => g.hpLeft(b) - g.hpLeft(a))[0] || null, surgeIfNoHost: true, grantStalwart: true, mod: hpPlus(4),
    boostEffect(g, u, ctx) { (ctx.post || ctx.after).push(async gg => { const m = gg.engagedMinions()[0]; if (m && gg.c(u).zone === 'ediscard') gg.attachEnc(u, m); }); } };
  Object.assign(CW, { toughLeader, fdWhenDefeated, minionsActivate, exhaustOne, dmgOne, attachedProps, heroDiscard, attachToOr, otherMinionHost, typeCount });

  // ======================= Tigra =======================
  const isTigra = g => ['56001a', '56001b'].includes(idOf(g, g.idt()));
  const hunted = (g, m) => g.c(m).att.some(a => idOf(g, a) === '56007');
  S['56001a'] = { loseKw: (g, s, m) => g.c(m).zone === 'minion' && hunted(g, m) ? ['guard'] : null, on: { async turnBegins(g) { const n = Math.min(3, g.engagedMinions().length); if (n && g.isHero()) { await g.draw(n); g.log(`사냥 개시: 교전 하수인 ${n}명 → 카드 ${n}장`, 'good'); } } } };
  S['56001b'] = { actions: [{ timing: 'alter', label: '잠입 수사: 사냥감을 찾아 손으로 (라운드당 1번)', can: g => g.p.usedOnce.undercover !== g.s.round, async use(g) { g.p.usedOnce.undercover = g.s.round; await g.searchToHand(d => d.id === '56007', '사냥감', { discard: true }); } }] };
  S['56002'] = { async onEnter(g) { const x = g.e.deck.concat(g.e.discard).find(y => g.d(y).type === 'minion'); g.shuffle(g.e.deck); if (x) { await g.enterMinion(x, {}, true); g.giveStatus(x, 'stun', '문 나이트'); g.giveStatus(x, 'conf', '문 나이트'); } } }; // Moon Knight (ally)
  S['56003'] = { actions: [{ timing: 'alter', exhaust: true, label: '경찰서: 위협 1 + 교전 하수인마다 1 제거', async use(g, u) { await g.removeThreatChoose(1 + g.engagedMinions().length, '경찰서', u); } }] }; // Precinct HQ
  S['56004'] = { resources: [{ gen: g => 'R'.repeat(Math.min(3, g.engagedMinions().length)), label: '고양이 머리 부적', can: (g, u) => !g.c(u).ex && g.engagedMinions().length > 0, use: (g, u) => { g.c(u).ex = true; } }] }; // Cat's Head Amulet
  S['56005'] = { respond: [{ window: 'basicPowerUsed', exhaust: true, label: '날카로운 발톱: 공격 +1, 압도 또는 관통', can: (g, u, ctx) => ctx.kind === 'attack' && isTigra(g), async resolve(g, u, ctx) { ctx.bonus += 1; if ((await g.ask({ type: 'choice', title: '날카로운 발톱', options: [{ id: 'o', label: '압도' }, { id: 'p', label: '관통' }] })) === 'o') ctx.overkill = true; else ctx.piercing = true; } }] }; // Sharp Claws
  S['56006'] = { respond: [{ window: 'identityWouldTakeDamage', timing: 'hero', label: '고양이 반사신경: 버리고 피해 3 방지', can: (g, u, ctx) => ctx.amount - ctx.prevent > 0, async resolve(g, u, ctx) { g.discard(u, '고양이 반사신경'); ctx.prevent += 3; const m = await pick(g, g.engagedMinions().slice(), '혼란시킬 하수인 (선택)'); if (m) g.giveStatus(m, 'conf', '고양이 반사신경'); } }] }; // Cat-Like Reflexes
  S['56007'] = { canPlay: g => g.e.deck.concat(g.e.discard).some(x => g.d(x).type === 'minion'), // Hunted
    async onPlay(g, u) { const ms = g.e.deck.concat(g.e.discard).filter(y => g.d(y).type === 'minion'); const x = await pick(g, ms, '사냥감: 교전시킬 하수인'); g.shuffle(g.e.deck); if (!x) { g.discard(u); return; } await g.enterMinion(x, {}, true); if (g.c(x).zone !== 'minion') { g.discard(u); return; } g.put(u, 'attach', x); g.giveStatus(x, 'stun', '사냥감'); },
    on: { attachedDefeated(g) { if (isTigra(g) && g.canReady(g.idt())) { g.c(g.idt()).ex = false; g.log('사냥감 격파: 티그라 준비', 'good'); } } } };
  S['56008'] = { selfCostMod: g => g.engagedMinions().length, play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { await g.playerAttack(g.idt(), ctx.target, 4, { src: u }); const t = await g.chooseTarget('attackable', '이빨과 발톱: 두 번째 피해 4', g.idt(), false); if (t) await g.playerAttack(g.idt(), t, 4, { src: u }); } } }; // Tooth and Claw
  S['56009'] = { play: { timing: 'hero', label: 'thwart', target: 'thwartable', async resolve(g, u, ctx) { const t = ctx.target; await thw(g, t, 3, u); if (!g.c(t).zone || g.c(t).threat === 0) { const m = await pick(g, g.e.minions.slice(), '기절시킬 하수인'); if (m) g.giveStatus(m, 'stun', '고양이 감각'); } } } }; // Feline Senses
  S['56023'] = { async whenRevealed(g, u, ctx) { await g.heroObligation(u, '너무 깊이 들어감', '교전 중인 하수인 모두 활성화', async () => { const ms = g.engagedMinions().slice(); for (const m of ms) if (g.c(m).zone === 'minion') await g.activate(m, {}); if (!ms.length) ctx.surge++; if (g.c(u).zone === 'limbo') g.discard(u); }); } }; // In Too Deep
  const underworld = g => g.e.sides.find(x => idOf(g, x) === '56025') || null;
  const toUW = async (g, n) => { const s = underworld(g); if (s) { await g.placeThreat(s, n, {}); return true; } return false; };
  S['56024'] = { on: { async afterEnemyAttack(g, u, ctx) { if (ctx.enemy === u) await toUW(g, 1); } } }; // The Hood
  S['56025'] = { shieldsFromDamage: (g, s, t) => g.c(s).zone === 'side' && g.c(t).zone === 'minion' && g.hasTrait(t, 'CRIMINAL') }; // Criminal Underworld
  S['56026'] = { attachTo: g => g.e.minions.find(m => idOf(g, m) === '56024') || g.e.villain, respond: [{ window: 'afterBasicAttack', timing: 'hero', label: '[에너지][물리] → 후드의 망토 버림', cost: { n: 2, req: 'YR' }, can: (g, u, ctx) => g.c(u).zone === 'attach' && ctx.target === g.c(u).on, resolve(g, u) { g.discard(u, '후드의 망토 버림'); } }],
    boostEffect(g, u, ctx) { (ctx.post || ctx.after).push(async gg => { const h = gg.e.minions.find(m => idOf(gg, m) === '56024') || gg.e.villain; if (h && ['boost', 'ediscard'].includes(gg.c(u).zone)) gg.attachEnc(u, h); }); } };
  S['56027'] = Object.assign({}, { async whenRevealed(g) { if (!(await toUW(g, 2))) { const x = g.e.deck.concat(g.e.discard, g.e.setaside).find(y => idOf(g, y) === '56025'); if (x) await g.enterSide(x, {}); } }, async boostEffect(g) { return (await toUW(g, 2)) ? 0 : 2; } }); // Madame Masque
  S['56028'] = Object.assign({}, { on: { async afterEnemyAttack(g, u, ctx) { if (ctx.enemy === u && (ctx.damaged || []).length) await toUW(g, 2); } } }); // Jigsaw
  // ======================= Hulkling =======================
  const isHulk = g => ['56029a', '56029b'].includes(idOf(g, g.idt()));
  const shapes = g => g.p.upgrades.filter(x => tr(g, x, 'SHAPESHIFT'));
  S['56029a'] = { chosenShape(g, card) { for (const x of shapes(g)) if (x !== card) g.discard(x, `${g.nm(x)} 버림 (선택한 모습)`); if (g.canReady(g.idt()) && g.c(g.idt()).ex) { g.c(g.idt()).ex = false; g.log('선택한 모습: 헐클링 준비', 'good'); } } };
  S['56029b'] = { blocksPlay: (g, s, uid) => tr(g, uid, 'SHAPESHIFT') && shapes(g).length > 0 && !g.isHero(), actions: [{ timing: 'alter', label: '변신술사: [변신] 업그레이드를 손으로 (라운드당 1번)', can: g => g.p.usedOnce.shapeChanger !== g.s.round, async use(g) { g.p.usedOnce.shapeChanger = g.s.round; await g.searchToHand(d => (d.tr || []).includes('SHAPESHIFT'), '[변신]', { discard: true }); } }],
  };
  S['56030'] = { async onPlay(g) { await g.searchToHand(d => d.type === 'event' && d.cls === 'Hero', '위칸: 정체성 전용 이벤트', { discard: true }); } }; // Wiccan (ally)
  S['56031'] = { actions: [{ timing: 'alter', exhaust: true, label: '올트먼 저택: 회복 2, 헐클링 카드 1장 덱에 섞기', async use(g) { g.heal(g.idt(), 2); const t = await pick(g, g.p.discard.filter(x => g.d(x).cls === 'Hero'), '덱에 섞을 카드'); if (t) { g.put(t, 'deck'); g.shuffle(g.p.deck); } } }] }; // Altman Residence
  const shape = (st, resp, label) => ({ mod: { thw: (g, s, t) => t === g.idt() && isHulk(g) && g.isHero() ? st.thw || 0 : 0, atk: (g, s, t) => t === g.idt() && isHulk(g) && g.isHero() ? st.atk || 0 : 0, def: (g, s, t) => t === g.idt() && isHulk(g) && g.isHero() ? st.def || 0 : 0, retaliate: (g, s, t) => t === g.idt() && isHulk(g) && g.isHero() ? st.ret || 0 : 0 },
    grantTrait: st.aerial ? (g, s, t) => t === g.idt() && g.isHero() ? 'AERIAL' : null : undefined,
    onPlay(g, u) { const f = g.sc(g.idt()).chosenShape; if (f && g.c(u).zone === 'upgrade') f(g, u); },
    respond: [{ window: 'cardPlayedDone', timing: 'hero', exhaust: true, label, can: (g, u, ctx) => ctx.card && g.d(ctx.card).type === 'event', async resolve(g, u) { await resp(g, u); } }] });
  S['56032'] = shape({ thw: 1, atk: 1, def: 1, aerial: true }, async (g, u) => g.removeThreatChoose(2, '날개 모습', u), '날개 모습: 위협 2 제거'); // Winged Shape
  S['56033'] = shape({ atk: 2, def: 1 }, async (g, u) => { const t = await g.chooseTarget('enemy', '피해 2', g.idt(), false); if (t) await g.dealDamage(t, 2, { src: u, byPlayer: true }); }, '헐크 모습: 적에게 피해 2'); // Hulk Shape
  S['56034'] = shape({ atk: 1, def: 2, ret: 1 }, async g => { g.heal(g.idt(), 2); }, '갑옷 모습: 회복 2'); // Armored Shape
  S['56035'] = Object.assign(shape({ thw: 2 }, async g => { await g.draw(1); }, '모방 모습: 카드 1장'), { insteadOfAttackFor: true, noDivert: true }); // Imitation Shape
  S['56036'] = { resources: [{ gen: 'GG', label: '외계 생리 (헐클링 카드: 와일드 2)', forOnly: (g, u, f) => g.d(f).cls === 'Hero', can: (g, u) => !g.c(u).ex, use: (g, u) => { g.c(u).ex = true; } }, { gen: 'G', label: '외계 생리', can: (g, u) => !g.c(u).ex, use: (g, u) => { g.c(u).ex = true; } }] }; // Alien Physiology
  S['56037'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { await g.playerAttack(g.idt(), ctx.target, 5, { src: u }); for (const x of shapes(g)) g.c(x).ex = false; } } }; // Shapeshifter Strike
  S['56038'] = { interrupt: { window: 'enemyAttackInitiated', timing: 'hero', label: 'defense', async resolve(g, u, ctx) { await g.dealDamage(ctx.enemy, g.stat(g.idt(), 'def'), { src: u, byPlayer: true }); ctx.after.push(gg => gg.giveStatus(gg.idt(), 'tough', '갑옷 방어')); if (!g.c(ctx.enemy).zone) ctx.cancel = true; } } }; // Armored Defense
  S['56039'] = { play: { timing: 'hero', label: 'thwart', target: 'thwartable', async resolve(g, u, ctx) { const t = ctx.target; await thw(g, t, 4, u); if ((!g.c(t).zone || g.c(t).threat === 0) && !g.formLocked() && await yes(g, '일상 모습으로 바꿀까요?')) await g.changeForm(true); } } }; // Impersonation
  S['56040'] = { play: { timing: 'hero', async resolve(g) { await g.searchToHand(d => (d.tr || []).includes('SHAPESHIFT'), '[변신]', { discard: true }); } } }; // Shapeshifter
  S['56054'] = { async whenRevealed(g, u) { await g.heroObligation(u, '복잡한 혈통', '[변신] 업그레이드 모두 버림', async () => { for (const x of shapes(g)) g.discard(x); if (g.c(u).zone === 'limbo') g.discard(u); }); } }; // Complicated Lineage
  const skrullBiz = g => g.e.sides.find(x => idOf(g, x) === '56056') || null;
  S['56055'] = { async onAttackStart(g, u, ctx) { const x = (await burn(g, 1))[0]; if (!x) return; const r = g.d(x).res || ''; if (r.includes('Y')) ctx.atkBonus = (ctx.atkBonus || 0) + 2; if (r.includes('B') && g.p.hand.length) await g.discardFromHand(1, 1, '★ 슈퍼 스크럴: 버릴 카드'); if (r.includes('R')) g.giveStatus(u, 'tough', '★ 슈퍼 스크럴'); if (r.includes('G')) { const t = await pick(g, g.p.upgrades.filter(y => !g.d(y).permanent), '버릴 업그레이드'); if (t) g.discard(t); } } }; // Super Skrull
  S['56056'] = { on: { deckTopDiscarded(g, u, ctx) { if (g.c(u).zone !== 'side') return; const xs = ctx.cards.filter(x => g.c(x).zone === 'discard'); for (const x of xs) g.put(x, 'under', u); if (xs.length) g.log(`스크럴 사업: 버려진 카드 ${xs.length}장을 이 음모 아래에 뒷면으로 놓습니다`, 'warn'); } } }; // Skrull Business
  S['56057'] = { revealFirst: true, mod: { hp: (g, s, t) => g.c(s).zone === 'attach' && t === g.c(s).on ? 3 : 0, retaliate: (g, s, t) => g.c(s).zone === 'attach' && t === g.c(s).on ? 1 : 0 }, async whenRevealed(g, u) { let m = g.e.minions.find(x => idOf(g, x) === '56055'); if (!m) { const x = g.e.deck.concat(g.e.discard, g.e.setaside).find(y => idOf(g, y) === '56055'); if (x) { await g.enterMinion(x, {}, true); m = x; } } if (m) { g.attachEnc(u, m); if (g.isHero()) await g.enemyAttack(m, {}); } else g.discard(u); } }; // Fantastic Powers
  S['56058'] = { async whenRevealed(g) { const out = await burn(g, 3); const n = new Set(out.flatMap(x => (g.d(x).res || '').split(''))).size; if (!n) return; if (g.isHero()) await g.dealDamage(g.idt(), n, {}); else await g.placeThreat(g.e.main, n, {}); } }; // You're Coming With Me!
  // aspects / basic
  S['56010'] = { async customAttack(g, a, n, o) { // Two-Gun Kid: his basic attack targets two enemies
    const kw = Object.assign(o.overkill ? { overkill: true } : {}, o.piercing ? { piercing: true } : {}, o.ranged ? { ranged: true } : {});
    const t1 = o.target && g.c(o.target).zone ? o.target : null; if (t1) await g.attackWith(a, t1, n + g.vsBonus('atk', a, t1), '공격', kw);
    if (!g.c(a).zone) return; const c2 = g.targets('attackable').filter(x => x !== t1);
    const t2 = c2.length ? await g.ask({ type: 'target', title: '투건 키드: 두 번째로 공격할 적', cands: c2, cancelable: true }) : null; if (t2) await g.attackWith(a, t2, n + g.vsBonus('atk', a, t2), '공격', kw); } };
  S['56012'] = { respond: [{ window: 'minionEntered', label: '공중 엄호: 연료 1 → [전술] 업그레이드를 손으로', can: (g, u) => !g.c(u).ex && (g.c(u).cnt.fuel || 0) > 0, async resolve(g, u) { g.c(u).ex = true; g.c(u).cnt.fuel--; g.cleanupUses(u); await g.searchToHand(d => d.type === 'upgrade' && (d.tr || []).includes('TACTIC'), '[전술] 업그레이드', { discard: true }); } }] }; // Air Cover
  S['56013'] = { mod: { hp: (g, s, t) => t === g.idt() ? 3 : 0, atk: (g, s, t) => t === g.idt() && g.isHero() ? 1 : 0 } }; // Aggressive Conditioning
  S['56016'] = { play: { timing: 'hero', label: 'attack', can: g => g.e.minions.some(m => !tr(g, m, 'ELITE') && g.c(m).att.some(a => !g.d(a).enc)), async resolve(g, u) { const t = await pick(g, g.e.minions.filter(m => !tr(g, m, 'ELITE') && g.c(m).att.some(a => !g.d(a).enc)), '일격필살: 물리칠 하수인'); if (t) { for (const a of g.c(t).att.slice()) g.discard(a); g.discard(t, `${g.nm(t)} 격파 (격파 시 효과 무시)`); } } } }; // Coup de Grâce
  S['56017'] = { interrupt: { window: 'basicPowerUsed', timing: 'hero', label: '야만적 일격: 공격 +6, 관통', can: (g, u, ctx) => ctx.kind === 'attack', resolve(g, u, ctx) { ctx.bonus += 6; ctx.piercing = true; } } }; // Savage Strike
  S['56019'] = { canPlay: g => tr(g, g.idt(), 'AVENGER'), async onEnter(g) { const t = await pick(g, g.p.deck.slice(0, 5).filter(x => g.d(x).type === 'upgrade'), '옐로재킷: 손으로 가져올 업그레이드'); if (t) g.put(t, 'hand'); g.shuffle(g.p.deck); } }; // Yellow Jacket
  S['56041'] = { respond: [{ window: 'minionEntered', label: '패트리어트: 강인함', can: (g, u) => g.c(u).zone === 'ally', resolve(g, u) { g.giveStatus(u, 'tough', '패트리어트'); } }] }; // Patriot
  S['56043'] = { respond: [{ window: 'afterChangeForm', timing: 'alter', exhaust: true, label: '은신 기지: 거점 1 → 정체성 강인함', can: (g, u) => (g.c(u).cnt.stronghold || 0) > 0, resolve(g, u) { g.c(u).cnt.stronghold--; g.cleanupUses(u); g.giveStatus(g.idt(), 'tough', '은신 기지'); } }] }; // Hidden Base
  S['56045'] = { respond: [{ window: 'afterHeroDefends', label: '엑셀시어: [에너지] → 적에게 피해 2', cost: { n: 1, req: 'Y' }, async resolve(g, u) { const t = await g.chooseTarget('enemy', '피해 2', g.idt(), false); if (t) await g.dealDamage(t, 2, { src: u, byPlayer: true }); } }] }; // Excelsior
  S['56046'] = { mod: { hp: (g, s, t) => t === g.idt() ? 3 : 0, def: (g, s, t) => t === g.idt() && g.isHero() ? 1 : 0 } }; // Defensive Conditioning
  S['56047'] = { interrupt: { window: 'enemyAttackInitiated', timing: 'hero', label: 'defense', can: g => g.isHero(), resolve(g, u, ctx) { ctx.freeHeroDefense = true; } } }; // "I Can Do This All Day"
  S['56048'] = { play: { timing: 'hero', async resolve(g) { const v = g.e.villain; if (v) await g.enemyAttack(v, { heroOnlyDefend: true }); await g.draw(3); } } }; // Taunt
  S['56050'] = { interrupt: { window: 'enemyAttackInitiated', timing: 'hero', label: 'defense', resolve(g) { g.addPhaseMod(g.idt(), 'retaliate', 1); } } }; // Cuts Both Ways
  S['56052'] = { respond: [{ window: 'allyPowerUsed', label: '아이언 래드: 다른 [어벤저] 동료 소진 → 그 수치를 더함', // Iron Lad
    can: (g, u, ctx) => ctx.ally === u && ['attack', 'thwart'].includes(ctx.kind) && g.p.allies.some(x => x !== u && !g.c(x).ex && tr(g, x, 'AVENGER')),
    async resolve(g, u, ctx) { const k = ctx.kind === 'attack' ? 'atk' : 'thw'; const c = g.p.allies.filter(x => x !== u && !g.c(x).ex && tr(g, x, 'AVENGER'));
      const t = c.length === 1 ? c[0] : await g.ask({ type: 'target', title: '아이언 래드: 소진할 [어벤저] 동료', cands: c, cancelable: true }); if (!t) return;
      g.c(t).ex = true; const n = g.stat(t, k); ctx.bonus += n; g.log(`아이언 래드: ${g.nm(t)} 소진 → ${k === 'atk' ? '공격' : '저지'} +${n}`, 'good'); } }] };
  // ======================= leaders (cooperative mode: the leader is the villain) =======================
  // ---- main schemes ----
  async function cwSetup(g) {
    const v = g.e.villain; if (!v) return;
    const L = g.sc(v), sid = L.leaderSide;
    const x = sid && enc(g).find(y => idOf(g, y) === sid);
    if (x) { await g.enterSide(x, {}); g.log(`사전 준비: 리더의 부가 음모 「${g.nm(x)}」 공개`); }
    if (L.leaderSetup) await L.leaderSetup(g, v);
  }
  for (const id of ['56063a', '56096a', '56121a', '56122a', '57005a', '56141a', '56172a', '56199a', '56200a', '57044a']) S[id] = { setup: cwSetup };
  const cutOff = { on: { async treacheryRevealing(g, s) { if (s !== g.e.main || g.c(s).cutOff === pk(g)) return; g.c(s).cutOff = pk(g); g.log(`${g.nm(s)}: 보조 카드 공개 → 위협 1`, 'warn'); await g.placeThreat(s, 1, {}); } } };
  const recruits = { async whenRevealed(g, s) { if (g.players >= 2) { const h = 2 * g.players; g.c(s).threat += h; g.log(`${g.nm(s)}: 교란 +${h}`, 'warn'); } await g.forEachPlayer(() => { const ms = g.e.deck.filter(x => g.d(x).type === 'minion'); const x = ms[0]; if (x) { g.put(x, 'facedown'); g.log(`${g.nm(x)}을(를) 뒷면 조우 카드로 받습니다`, 'warn'); } }); g.shuffle(g.e.deck); } };
  const guardAll = { grantKw: (g, s, u) => g.c(u).zone === 'minion' ? ['guard'] : null };
  const mill3 = { whenRevealed(g, s) { if (g.players >= 2) { const h = 2 * g.players; g.c(s).threat += h; g.log(`${g.nm(s)}: 교란 +${h}`, 'warn'); } },
    on: { async mainStep1(g, s) { if (s === g.e.main) { g.log(`${g.nm(s)}: 각 플레이어 덱 위 3장 버림`); await g.forEachPlayer(() => burn(g, 3)); } } } };
  const steadyLeader = { steadyFor: (g, s, t) => t === g.e.villain };
  const atkPlus = { enemyAttackBonus: (g, s, enemy, ctx) => s === g.e.main && enemy === g.e.villain ? (ctx.undefended ? 2 : 1) : 0 };
  const sideToYou = { async whenRevealed(g) { await g.forEachPlayer(() => { const xs = enc(g).filter(x => g.d(x).type === 'side'); const x = xs[0]; if (x) { g.put(x, 'facedown'); g.log(`${g.nm(x)}을(를) 뒷면 조우 카드로 받습니다`, 'warn'); } }); g.shuffle(g.e.deck); } };
  const allyExhausted = { on: { allyEnters(g, s, ctx) { if (s === g.e.main && g.c(ctx.ally).zone === 'ally' && !g.c(ctx.ally).ex) { g.c(ctx.ally).ex = true; g.log(`${g.nm(s)}: ${g.nm(ctx.ally)} 소진된 채 등장`); } } } };
  S['56063b'] = S['56172b'] = cutOff; // Cut Off Support / Open Rebellion
  S['56096b'] = S['56141b'] = recruits; // S.H.I.E.L.D. Recruits / Gathering Support
  S['56121b'] = S['56199b'] = guardAll; // Homeland Security / Rallying Call
  S['56122b'] = S['57044b'] = mill3; // Public Outrage / Protect Secret Identities
  S['57005b'] = S['56200b'] = steadyLeader; // Enforce the Law / Going Underground
  S['57006b'] = S['56142b'] = atkPlus; // Mighty Avengers / Secret Avengers
  S['56123b'] = S['56173b'] = sideToYou; // The Initiative / Neighborhood Protectors
  S['56124b'] = S['57045b'] = allyExhausted; // No Going Back / Expose Overreach
  S['56064b'] = { targetFn: (g, s) => -((g.c(s).under || []).length), // Negative Zone Prison
    on: { allyDefeated(g, s, ctx) { if (s !== g.e.main || !ctx.attack || g.c(ctx.ally).zone !== 'discard') return; g.c(s).under = g.c(s).under || []; g.put(ctx.ally, 'under', s); g.log(`${g.nm(ctx.ally)}: 네거티브 존 감옥에 갇힙니다 (목표 위협 -1)`, 'warn'); } } };
  S['56097b'] = { grantTrait: (g, s, u) => { const pi = g.identityPlayer(u); return s === g.e.main && pi >= 0 && g.s.ps[pi].form === 'hero' ? 'UNREGISTERED' : null; } }; // Hunting Rebel Heroes
  S['56201b'] = { anyStatusGiven(g, s, uid) { if (s === g.e.main && uid === g.e.villain) { g.c(s).threat += 1; g.log(`${g.nm(s)}: 리더에게 상태 카드 → 위협 1`, 'warn'); } } }; // Guerilla Warfare
  S['56202b'] = { on: { async mainStep1(g, s) { if (s !== g.e.main) return; await g.forEachPlayer(async () => { const x = g.takeEncounter(); if (!x) return; g.put(x, 'ediscard'); g.log(`${g.nm(s)}: 조우 덱 맨 위 ${g.nm(x)} 버림`); if (g.d(x).type === 'minion') await g.enterMinion(x, {}, true); }); } } }; // Superhero Jailbreak

  // ---- Iron Man ----
  const IM_ATT = ['56065', '56066', '56067', '56068', '56069'];
  const imFind = (g, disc) => findReveal(g, IM_ATT, disc);
  const iron = Object.assign({}, leaderBase, { leaderSide: '56072', mod: { sch: (g, s, t) => t === s ? Math.min(3, g.c(s).att.filter(a => tr(g, a, 'TECH')).length) : 0 } });
  S['56059'] = Object.assign({}, iron, { async leaderSetup(g) { await imFind(g, false); } });
  S['56060'] = S['56062'] = Object.assign({}, iron, stage2);
  S['56061'] = Object.assign({}, iron, { async whenRevealed(g) { await imFind(g, false); } });
  S['56065'] = Object.assign({ attackProps: () => ({ ranged: true }), respond: [discardOnHit('YR', '[에너지][물리] → 파워 건틀릿 버림')] }, revealBoost);
  S['56066'] = Object.assign({ grantTrait: (g, s, u) => g.c(s).zone === 'attach' && u === g.c(s).on ? 'AERIAL' : null, respond: [discardOnHit('YR', '[에너지][물리] → 로켓 부츠 버림')] }, revealBoost);
  S['56067'] = { grantStalwart: true, async whenRevealed(g, u) { if (g.c(u).on) g.giveStatus(g.c(u).on, 'tough', g.nm(u)); }, respond: [discardOnHit('BR', '[정신][물리] → 마크 V 헬멧 버림')] };
  S['56068'] = { mod: { retaliate: (g, s, t) => g.c(s).zone === 'attach' && t === g.c(s).on ? 1 : 0 }, async whenRevealed(g, u) { if (g.c(u).on) g.giveStatus(g.c(u).on, 'tough', g.nm(u)); }, respond: [discardOnHit('BR', '[정신][물리] → 아크 원자로 버림')] };
  S['56069'] = Object.assign({ reduceDamage(g, a, n) { g.c(a).dmg = (g.c(a).dmg || 0) + n; g.log(`${g.nm(a)}: 피해 ${n}을(를) 대신 받습니다 (${g.c(a).dmg}/5)`); if (g.c(a).dmg >= 5) g.discard(a, `${g.nm(a)} 파괴`); return 0; } }, revealBoost); // Mark V Armor
  S['56070'] = { async whenRevealedAlter(g) { await discardYour(g, ['upgrade', 'support'], '리펄서 블라스트: 버릴 업그레이드/지원'); }, // Repulsor Blast
    async whenRevealedHero(g) { const out = await burn(g, 4); const n = out.reduce((t, x) => t + (g.d(x).res || '').split('').filter(r => r === 'Y' || r === 'G').length, 0); if (n) await g.dealDamage(g.idt(), n, {}); } };
  S['56071'] = { async whenRevealedAlter(g) { const v = g.e.villain; if (!v) return; await g.enemyScheme(v, {}); if (g.c(v).att.some(a => tr(g, a, 'TECH'))) g.giveStatus(g.idt(), 'conf', '초음속 펀치'); }, // Supersonic Punch
    async whenRevealedHero(g) { const v = g.e.villain; if (v) await g.enemyAttack(v, { piercing: g.c(v).att.some(a => tr(g, a, 'TECH')) }); } };
  S['56072'] = { async whenDefeated(g) { await imFind(g, true); } }; // Stark Tower

  // ---- Captain Marvel ----
  const ecOf = g => { const v = g.e.villain; return v ? g.c(v).att.find(a => idOf(g, a) === '56098') : null; };
  const energy = (g, n) => { const a = ecOf(g); if (!a) return; g.c(a).cnt.energy = (g.c(a).cnt.energy || 0) + n; g.log(`에너지 채널: 에너지 +${n} (${g.c(a).cnt.energy})`); };
  const cmBase = Object.assign({}, leaderBase, { leaderSide: '56104', on: { afterEnemyAttack(g, s, ctx) { if (ctx.enemy === s && ctx.target && ctx.target !== g.idt() && g.c(ctx.target).zone !== 'ally') energy(g, 1); } } });
  const cmSetup = { leaderSetup(g, v) { findAttach(g, ['56098'], v); } };
  S['56092'] = S['56094'] = Object.assign({}, cmBase, cmSetup);
  S['56093'] = S['56095'] = Object.assign({}, cmBase, stage2);
  S['56098'] = { on: { async afterAttack(g, u, ctx) { // Energy Channel
    const v = g.c(u).on; if (ctx.target !== v || !g.c(v) || !g.c(v).zone) return;
    energy(g, 1); if ((g.c(u).cnt.energy || 0) < 4) return;
    g.c(u).cnt.energy = 0; const a = ctx.attacker; if (!g.c(a) || !['ally'].includes(g.c(a).zone) && a !== g.idt()) return;
    g.log('에너지 채널: 에너지 4 → 캡틴 마블이 반격합니다 (압도)', 'warn');
    if (a === g.idt()) { if (g.isHero()) await g.enemyAttack(v, { overkill: true }); } else await g.enemyAttack(v, { forceTarget: a, overkill: true }); } } };
  S['56099'] = Object.assign({ grantStalwart: true, respond: [discard3Same('같은 종류 3개 → 헬멧 버림')] }, revealBoost);
  S['56100'] = Object.assign({ reduceDamage(g, a, n, o) { if (o && o.attack && n > 3) { g.discard(a, `${g.nm(a)}: 피해를 3으로 줄이고 버려짐`); return 3; } return n; } }, revealBoost);
  S['56101'] = { async whenRevealedAlter(g) { await discardYour(g, ['ally', 'support'], '광자 블라스트: 버릴 동료/지원'); }, async whenRevealedHero(g) { const v = g.e.villain; if (v) await g.enemyAttack(v, {}); energy(g, 1); } };
  S['56102'] = { async whenRevealedAlter(g) { const v = g.e.villain; if (v) await g.enemyScheme(v, {}); energy(g, 1); }, async whenRevealedHero(g) { await threatEach(g, 2); } };
  S['56103'] = { whenRevealed(g) { energy(g, 1); const a = ecOf(g); if (a && g.e.villain) g.heal(g.e.villain, g.c(a).cnt.energy || 0); }, boostEffect(g) { energy(g, 1); } };
  S['56104'] = { whenDefeated(g) { energy(g, 3); } };

  // ---- Captain America ----
  const shield = g => g.inPlay().find(x => idOf(g, x) === '56143') || g.e.deck.concat(g.e.discard, g.e.setaside, g.e.aside || []).find(x => idOf(g, x) === '56143');
  function shieldToCap(g) {
    const v = g.e.villain, sh = shield(g); if (!v || !sh || g.c(sh).on === v) return false;
    if (g.c(sh).zone === 'attach') { g.put(sh, 'attach', v); g.log(`캡틴의 방패 → ${g.nm(v)}`); } else g.attachEnc(sh, v);
    g.giveStatus(v, 'tough', '캡틴의 방패'); return true;
  }
  const capOnCap = g => { const sh = shield(g); return !!(sh && g.c(sh).zone === 'attach' && g.c(sh).on === g.e.villain); };
  CW.shieldToCap = shieldToCap;
  S['56137'] = S['56139'] = Object.assign({}, leaderBase, { leaderSide: '56149', leaderSetup(g) { shieldToCap(g); } });
  S['56138'] = S['56140'] = Object.assign({}, leaderBase, { leaderSide: '56149' }, stage2);
  S['56143'] = { noPiercingVs: true, mod: { retaliate: (g, s, t) => g.c(s).zone === 'attach' && t === g.c(s).on ? 1 : 0 }, // Cap's Shield
    on: { hostAttacked(g, a, actx) { if (!actx.basic || g.identityPlayer(actx.attacker) < 0) return; actx.after.push(async (gg, r) => { if (r && r.dealt > 0 && gg.c(a).zone === 'attach' && gg.c(a).on === gg.e.villain) { gg.put(a, 'attach', actx.attacker); gg.log('캡틴의 방패를 빼앗았습니다! (보복 1, 관통 무시)', 'good'); } }); },
      afterEnemyAttack(g, a, ctx) { if (ctx.enemy === g.e.villain && g.c(a).on !== ctx.enemy && (ctx.damaged || []).includes(g.c(a).on)) shieldToCap(g); } } };
  S['56144'] = Object.assign({ grantStalwart: true, respond: [discard3Same('같은 종류 3개 → 헬멧 버림')] }, revealBoost);
  S['56145'] = Object.assign({}, oneShotProps({ overkill: true }, '공격 후 버림'), revealBoost); // Super-Soldier Serum
  S['56146'] = { whenRevealed(g) { const v = g.e.villain; if (!v) return; if (capOnCap(g)) g.giveStatus(v, 'tough', '방패 막기'); else shieldToCap(g); g.giveFacedownBoostTo(v, 1); } };
  S['56147'] = { async whenRevealedAlter(g) { const v = g.e.villain; if (v) await g.enemyScheme(v, {}); }, async whenRevealedHero(g) { if (capOnCap(g)) { for (const x of chars(g)) if (g.c(x).zone) await g.dealDamage(x, 2, {}); } else shieldToCap(g); } };
  S['56148'] = { async whenRevealedAlter(g) { await discardYour(g, ['ally', 'upgrade'], '영웅의 일격: 버릴 동료/업그레이드'); }, async whenRevealedHero(g) { const v = g.e.villain; if (v) await g.enemyAttack(v, { onDamaged: (gg, alive) => alive.forEach(x => gg.giveStatus(x, 'stun', '영웅의 일격')) }); } };
  S['56149'] = { async whenDefeated(g) { shieldToCap(g); const v = g.e.villain; if (v) await g.activate(v, {}); } };

  // ---- Spider-Woman ----
  const finOf = g => { const v = g.e.villain; return v ? g.c(v).att.find(a => idOf(g, a) === '56174') : null; };
  const skill = g => { const f = finOf(g); return f ? (g.c(f).cnt.skill || 0) : 0; };
  const addSkill = (g, n) => { const f = finOf(g); if (!f) return; g.c(f).cnt.skill = Math.min(3, (g.c(f).cnt.skill || 0) + n); g.log(`피네스: 기술 카운터 ${g.c(f).cnt.skill}`); };
  const swBase = Object.assign({}, leaderBase, { leaderSide: '56179', onAttackStart(g, v, ctx) { const f = finOf(g); const n = f ? (g.c(f).cnt.skill || 0) : 0; if (n) { ctx.atkBonus = (ctx.atkBonus || 0) + n; g.c(f).cnt.skill = 0; g.log(`★ 스파이더우먼: 기술 카운터 ${n} → 공격력 +${n}`); } } });
  S['56168'] = S['56170'] = Object.assign({}, swBase, { leaderSetup(g, v) { findAttach(g, ['56174'], v); } });
  S['56169'] = S['56171'] = Object.assign({}, swBase, stage2);
  S['56174'] = { on: { treacheryRevealing(g, u) { if (g.c(u).zone === 'attach') addSkill(g, 1); } } }; // Finesse
  S['56175'] = Object.assign({ absorbsStatus: true, onAbsorbStatus(g, a, uid) { g.giveStatus(uid, 'tough', g.nm(a)); } }, revealBoost); // Contaminant Immunity
  S['56176'] = { whenRevealed(g) { g.giveStatus(g.idt(), 'stun', '페로몬'); g.giveStatus(g.idt(), 'conf', '페로몬'); addSkill(g, 1); }, boostEffect(g) { if (!g.c(g.idt()).stun) g.giveStatus(g.idt(), 'stun', '★ 페로몬'); else g.giveStatus(g.idt(), 'conf', '★ 페로몬'); } };
  S['56177'] = { whenRevealedAlter(g, u, ctx) { ctx.surge++; }, async whenRevealedHero(g) { const v = g.e.villain; if (!v) return; const n = skill(g); await g.enemyAttack(v, { ranged: n >= 1, piercing: n >= 2, overkill: n >= 3 }); } }; // Venom Blast
  S['56178'] = { async whenRevealed(g) { const xs = ctrl(g).filter(x => !g.d(x).enc); const o = await g.ask({ type: 'choice', title: '눈에 띄지 않음', options: (xs.length ? [{ id: 'd', label: '비용이 가장 높은 내 카드 버림' }] : []).concat([{ id: 's', label: '스파이더우먼이 음모' }]) });
      if (o === 'd') { const t = await pick(g, highest(g, xs), '버릴 카드'); if (t) g.discard(t, `${g.nm(t)} 버림`); } else if (g.e.villain) await g.enemyScheme(g.e.villain, {}); },
    boostEffect(g) { const c = g.c(g.idt()); return (c.stun ? 1 : 0) + (c.conf ? 1 : 0) + (c.tough ? 1 : 0); } };
  S['56179'] = { absorbEnemyDamage(g, s, t, n, o) { if (t !== g.e.villain || !(o && o.attack)) return n; const k = skill(g); if (k) g.log(`${g.nm(s)}: 피해 -${k}`); return Math.max(0, n - k); } };
  // ======================= Civil War modular sets =======================
  // ---- Mighty Avengers ----
  S['56073'] = { whenRevealed(g) { toughLeader(g, '옐로재킷'); }, boostEffect(g) { toughLeader(g, '★ 옐로재킷'); } };
  S['56074'] = { async whenRevealed(g) { await g.placeThreat(g.e.main, 1, {}); }, async boostEffect(g) { await g.placeThreat(g.e.main, 1, {}); } };
  S['56075'] = { async whenRevealed(g) { await g.dealDamage(g.idt(), 1, {}); }, async boostEffect(g) { await g.dealDamage(g.idt(), 1, {}); } };
  S['56076'] = S['56081'] = { async whenRevealed(g, u, ctx) { await surgeIfNone(g, ctx, await CW.minionsWR(g)); } }; // Mighty Avengers
  const KW = ['guard', 'patrol', 'quickstrike', 'villainous', 'stalwart', 'steady'];
  const avOthers = (g, s, u) => g.c(s).zone === 'side' && g.c(u).zone === 'minion' && tr(g, u, 'AVENGER') ? g.e.minions.filter(m => m !== u && (g.d(m).tr || []).includes('AVENGER')) : [];
  S['56077'] = { grantKw: (g, s, u) => { const o = avOthers(g, s, u); return o.length ? KW.filter(k => o.some(m => g.d(m)[k])) : null; }, // Earth's Mightiest Heroes
    mod: { retaliate: (g, s, t) => { const o = avOthers(g, s, t); return o.length && !g.d(t).retaliate ? Math.max(0, ...o.map(m => g.d(m).retaliate || 0)) : 0; } } };
  // ---- The Initiative ----
  S['56078'] = { async whenRevealed(g) { const was = g.c(g.idt()).conf; g.giveStatus(g.idt(), 'conf', '닥 샘슨'); if (was) await g.placeThreat(g.e.main, 2, {}); }, boostEffect: confYou('★ 닥 샘슨') };
  S['56079'] = { async whenRevealed(g) { const was = g.c(g.idt()).stun; g.giveStatus(g.idt(), 'stun', '헬캣'); if (was) await g.indirectDamage(2, null); }, boostEffect: stunYou('★ 헬캣') };
  S['56080'] = { revealFirst: true, mod: hpPlus(2), grantTrait: (g, s, u) => g.c(s).zone === 'attach' && u === g.c(s).on ? 'AVENGER' : null, // Drafted
    async whenRevealed(g, u) { const m = await CW.encMinion(g); if (!m) { g.discard(u); return; } g.log(`징집: ${g.nm(m)} 공개`); await g.reveal(m); if (g.c(m).zone === 'minion' && g.c(u).zone === 'limbo') g.attachEnc(u, m); } };
  S['56082'] = { whenDefeated(g) { const xs = g.e.discard.filter(x => g.d(x).type === 'minion' && (g.d(x).tr || []).includes('AVENGER')); for (const x of xs) g.put(x, 'edeck'); if (xs.length) { g.shuffle(g.e.deck); g.log(`[어벤저스] 하수인 ${xs.length}장을 조우 덱에 섞습니다`); } } };
  // ---- Maria Hill ----
  const lmdHost = g => { const free = x => !g.c(x).att.some(a => idOf(g, a) === '56084'); const mh = g.e.minions.find(m => idOf(g, m) === '56083' && free(m)); return mh || (V(g) && free(V(g)) ? V(g) : g.e.minions.find(free)) || null; };
  S['56083'] = { whenRevealed(g, u) { const x = g.e.deck.concat(g.e.discard).find(y => idOf(g, y) === '56084' && g.c(y).zone !== 'attach'); if (x && !g.c(u).att.some(a => idOf(g, a) === '56084')) { g.attachEnc(x, u); g.shuffle(g.e.deck); } } };
  S['56084'] = { attachTo: lmdHost, grantStalwart: true, reduceDamage(g, a, n, o) { if (o && o.attack) { g.discard(a, `${g.nm(a)}: 공격 피해를 막고 버려집니다`); return 0; } return n; } }; // Life Model Decoy
  const mhIn = g => g.e.minions.some(m => idOf(g, m) === '56083');
  S['56085'] = { async whenRevealed(g, u, ctx) { await CW.threatEach(g, 2); if (mhIn(g)) ctx.surge++; }, boostEffect: g => mhIn(g) ? 3 : 0 }; // Executive Order
  S['56086'] = { async whenDefeated(g) { for (const x of CW.chars(g).concat(g.engagedMinions())) if (g.c(x).zone) await g.dealDamage(x, 1, {}); } }; // S.H.I.E.L.D. Helicarrier
  // ---- Dangerous Recruits ----
  S['56087'] = { attackProps: () => ({ piercing: true }), async whenRevealed(g, u) { await g.activate(u, {}); } }; // Venom
  S['56088'] = { async whenRevealed(g) { await CW.discardYour(g, ['upgrade'], '불스아이: 버릴 업그레이드'); } }; // Bullseye
  S['56089'] = S['57020'] = { async whenRevealed(g) { await minionsActivate(g); } }; // Justice Like Lightning
  S['56090'] = { async whenRevealed(g, u, ctx) { const n = g.e.minions.length; if (n) await g.placeThreat(g.e.main, n, {}); else ctx.surge++; } }; // Excessive Force (its boost targets your leader: nothing in cooperative mode)
  S['56091'] = { on: { minionDefeated(g, s, ctx) { if (g.c(s).zone === 'side' && g.c(ctx.minion).zone === 'minion') CW.fdGive(g, ctx.minion); } } }; // Dangerous Recruits
  // ---- Cape-Killer ----
  S['56105'] = { attackBonus: (g, x, ctx) => { const defId = ctx.defender && g.identityPlayer(ctx.defender) >= 0 ? ctx.defender : (ctx.undefended ? g.idt() : null); return defId && CW.unreg(g, defId) ? 2 : 0; } };
  const unregSuper = { async whenRevealed(g, u) { g.put(u, 'pobl'); g.log('미등록 초인: 당신은 [미등록] 특성을 얻습니다', 'warn'); await CW.unregHit(g); },
    grantTrait: (g, s, u) => g.c(s).zone === 'pobl' && g.c(s).pZone != null && u === g.idt(g.c(s).pZone) ? 'UNREGISTERED' : null,
    actions: [{ timing: 'alter', label: '정체성 전용 카드 1장 버림 → 미등록 초인 버림', can: (g, u) => g.c(u).zone === 'pobl' && g.p.hand.some(x => g.d(x).cls === 'Hero'), async use(g, u) { const t = await pick(g, g.p.hand.filter(x => g.d(x).cls === 'Hero'), '버릴 정체성 전용 카드'); if (!t) return; g.put(t, 'discard'); g.discard(u, '미등록 초인 버림'); } }] };
  S['56106'] = S['56114'] = unregSuper;
  const dealUnreg = g => { const x = g.e.deck.concat(g.e.discard).find(y => ['56106', '56114'].includes(idOf(g, y))); g.shuffle(g.e.deck); if (x) { g.put(x, 'facedown'); g.log('미등록 초인을 뒷면 조우 카드로 받습니다', 'warn'); } return x; };
  CW.dealUnreg = dealUnreg;
  S['56107'] = { whenRevealed(g) { if (CW.unreg(g)) { g.c(g.idt()).ex = true; g.log('체포하라: [미등록] 정체성 소진', 'warn'); } else dealUnreg(g); } }; // Bring Them In
  S['56108'] = { whenDefeated(g) { const xs = g.e.discard.filter(x => g.d(x).type === 'minion' && tr(g, x, 'S.H.I.E.L.D')); const x = xs[xs.length - 1]; if (x) { g.put(x, 'facedown'); g.log(`${g.nm(x)}을(를) 뒷면 조우 카드로 받습니다`, 'warn'); } } }; // Arrest Order
  // ---- Martial Law ----
  S['56109'] = { async whenRevealed(g) { const xs = g.e.discard.filter(x => g.d(x).type === 'minion' && tr(g, x, 'S.H.I.E.L.D')); const x = xs[xs.length - 1]; if (x) await g.enterMinion(x, {}, true); }, // S.H.I.E.L.D. Soldier
    boostEffect(g, u, ctx) { if (ctx.minionBoost) return; (ctx.post || ctx.after).push(async gg => { if (gg.c(u).zone === 'ediscard') await gg.enterMinion(u, {}, true); }); } };
  S['56110'] = S['57015'] = { async whenRevealed(g) { const m = await CW.encMinion(g); if (!m) return; g.log(`긴급 대응: ${g.nm(m)}`); if (g.isHero()) await g.dealDamage(g.idt(), g.d(m).atk || 0, {}); else await g.placeThreat(g.e.main, g.d(m).sch || 0, {}); } }; // Rapid Response
  S['56111'] = { grantKw: (g, s, u) => g.c(s).zone === 'side' && g.c(u).zone === 'minion' ? ['guard'] : null }; // S.H.I.E.L.D. Patrol
  // ---- Heroes for Hire ----
  S['56112'] = { async whenRevealed(g) { const xs = g.p.allies.slice(); if (!xs.length) return; const t = CW.unreg(g) ? CW.worst(g, xs) : await pick(g, xs, '콜린 윙: 버릴 동료'); if (t) g.discard(t, `${g.nm(t)} 버림`); } };
  S['56113'] = { async whenRevealed(g) { const xs = g.p.upgrades.concat(...CW.chars(g).map(c => g.c(c).att)).filter(x => g.d(x).type === 'upgrade' && !g.d(x).permanent); if (!xs.length) return; const t = CW.unreg(g) ? CW.worst(g, xs) : await pick(g, xs, '샹치: 버릴 업그레이드'); if (t) g.discard(t, `${g.nm(t)} 버림`); } };
  const handDiscard = async g => { if (!g.p.hand.length) return null; if (CW.unreg(g)) return (await g.discardRandomHand(1))[0] || null; return (await g.discardFromHand(1, 1, '버릴 카드'))[0] || null; };
  S['56115'] = S['56119'] = { async whenRevealed(g) { const x = await handDiscard(g); const n = x ? (g.d(x).res || '').length : 0; if (n) await g.placeThreat(g.e.main, n, {}); } }; // Bounty Hunting
  S['56116'] = { whenDefeated(g) { dealUnreg(g); } }; // Heroes for Hire
  // ---- Paladin ----
  S['56117'] = { async whenRevealed(g) { await handDiscard(g); } };
  S['56118'] = Object.assign({ attachTo: attachToOr('56117') }, CW.oneShotProps({ ranged: true, overkill: true }, '공격 후 버림')); // Paladin's Pistol
  S['56120'] = { grantTrait: (g, s, u) => g.c(s).zone === 'side' && g.identityPlayer(u) >= 0 ? 'UNREGISTERED' : null, async whenRevealed(g) { await g.forEachPlayer(() => CW.unregHit(g)); } }; // Government Contractor
  // ---- New Avengers / Secret Avengers ----
  S['56150'] = Object.assign({ boostEffect(g) { const was = g.c(g.idt()).conf; g.giveStatus(g.idt(), 'conf', '★ 팔콘'); return was ? 2 : 0; } }, fdWhenDefeated);
  S['56151'] = Object.assign({ boostEffect(g) { const was = g.c(g.idt()).stun; g.giveStatus(g.idt(), 'stun', '★ 헤라클레스'); return was ? 2 : 0; } }, fdWhenDefeated);
  S['56152'] = Object.assign({ boostEffect(g) { const v = V(g); if (!v) return 0; const was = g.c(v).tough; g.giveStatus(v, 'tough', '★ 골리앗'); return was ? 2 : 0; } }, fdWhenDefeated);
  S['56153'] = S['56157'] = { async whenRevealed(g, u, ctx) { await surgeIfNone(g, ctx, await CW.minionsBoost(g, g.e.minions)); }, async boostEffect(g, u, ctx) { if (ctx.minionBoost) return; (ctx.post || ctx.after).push(async gg => { await CW.minionsBoost(gg, gg.engagedMinions()); }); } }; // Freedom Fighters
  S['56154'] = { whenDefeated(g) { const xs = g.e.discard.filter(x => g.d(x).type === 'minion'); for (const x of xs) g.put(x, 'edeck'); if (xs.length) { g.shuffle(g.e.deck); g.log(`하수인 ${xs.length}장을 조우 덱에 섞습니다`); } } }; // New Avengers
  S['56155'] = Object.assign({ boostEffect(g) { for (const x of g.p.upgrades) g.c(x).ex = true; g.log('★ 블랙 팬서: 업그레이드 모두 소진'); } }, fdWhenDefeated);
  S['56156'] = Object.assign({ async boostEffect(g) { await exhaustOne(g, '★ 스펙트럼: 소진할 캐릭터'); } }, fdWhenDefeated);
  S['56158'] = { async whenRevealed(g, u, ctx) { const t = await pick(g, g.p.allies.slice(), '편 바꾸기: 버릴 동료'); if (t) g.discard(t, `${g.nm(t)} 버림`); else ctx.surge++; } }; // Switching Sides
  S['56159'] = { whenDefeated(g) { const top = g.e.deck.slice(0, 5); if (!top.length || !V(g)) return; const x = top.slice().sort((a, b) => g.boostOf(b) - g.boostOf(a))[0]; CW.fdGive(g, x); g.shuffle(g.e.deck); } }; // Secret Avengers
  // ---- Namor / Atlanteans ----
  S['56160'] = { async whenRevealed(g, u) { await g.activate(u, {}); } };
  S['56161'] = { attachTo: attachToOr('56160'), attackProps(g, x, ctx) { return g.c(x).zone === 'attach' && ctx.enemy === g.c(x).on ? { piercing: true } : {}; }, actions: [heroDiscard('YR', '[에너지][물리] → 넵튠의 삼지창 버림')] };
  S['56162'] = { attachTo: attachToOr('56160'), on: { hostWouldScheme(g, a, ctx) { g.giveStatus(g.c(a).on, 'tough', '★ 프로테우스의 뿔'); } }, actions: [heroDiscard('BR', '[정신][물리] → 프로테우스의 뿔 버림')] };
  S['56163'] = { async whenRevealed(g) { const n = g.e.minions.find(m => idOf(g, m) === '56160'); const e = n || V(g); if (e) await g.activate(e, {}); }, boostEffect(g, u, ctx) { ctx.extraBoost = (ctx.extraBoost || 0) + 1; } }; // Imperius Rex!
  S['56164'] = { shieldsFromDamage: (g, s, t) => g.c(s).zone === 'side' && g.c(t).zone === 'minion' && g.hasTrait(t, 'ATLANTIS') }; // Ruler of Atlantis
  S['56165'] = { async whenRevealed(g) { await burn(g, 3); } };
  S['56166'] = S['57071'] = { async whenRevealed(g) { const n = typeCount(g, await burn(g, 3)); if (!n) return; if (g.isHero()) await g.indirectDamage(n, null); else await g.placeThreat(g.e.main, n, {}); } }; // Atlanteans
  S['56167'] = { icons: (g, u) => ({ accel: (g.d(u).accel || 0) + (g.c(u).cnt.accelTok || 0) }), async whenRevealed(g, u) { const n = typeCount(g, await burn(g, 1)); if (n) { g.c(u).cnt.accelTok = (g.c(u).cnt.accelTok || 0) + n; g.log(`${g.nm(u)}: 가속 토큰 ${n}`); } } }; // Atlantis Attacks
  // ---- Spider-Man ----
  const tangled = (g, pi) => g.c(g.idt(pi)).att.some(a => idOf(g, a) === '56181');
  S['56180'] = { async whenRevealed(g, u) { let attacked = false; for (const pi of g.playerOrder()) { if (tangled(g, pi) && g.s.ps[pi].form === 'hero' && g.c(u).zone === 'minion') { attacked = true; await g.withPlayer(pi, () => g.enemyAttack(u, { forceTarget: g.idt(pi) })); } } if (attacked) return; const x = g.e.deck.concat(g.e.discard).find(y => idOf(g, y) === '56181'); g.shuffle(g.e.deck); if (x) { g.put(x, 'facedown'); g.log('얽힘을 뒷면 조우 카드로 받습니다', 'warn'); } } };
  S['56181'] = { attachTo: g => g.idt(), tangles: true, boostEffect(g, u, ctx) { (ctx.post || ctx.after).push(async gg => { if (gg.c(u).zone === 'ediscard' && gg.e.minions.some(m => idOf(gg, m) === '56180')) await gg.reveal(u); }); } }; // Tangled Up
  S['56182'] = { async whenRevealed(g) { await g.placeThreat(g.e.main, 2, {}); } }; // Spectacular!
  S['56183'] = { async whenRevealed(g, u) { await g.placeThreat(u, 2, {}); } }; // Neighborhood Hero
  // ---- Defenders / Hell's Kitchen ----
  S['56184'] = { whenRevealed: stunYou('루크 케이지'), boostEffect: stunYou('★ 루크 케이지') };
  S['56185'] = { whenRevealed: confYou('제시카 존스'), boostEffect: confYou('★ 제시카 존스') };
  S['56186'] = { whenRevealed(g, u, ctx) { const v = V(g); const was = v && g.c(v).tough; if (v) g.giveStatus(v, 'tough', '무고한 이 보호'); for (const m of g.e.minions) g.giveStatus(m, 'tough', '무고한 이 보호'); if (was) ctx.surge++; } }; // Protect the Innocent
  S['56187'] = S['56192'] = { async whenRevealed(g) { await minionsActivate(g); } }; // Street Defenders
  S['56188'] = { grantKw: (g, s, u) => g.c(s).zone === 'side' && g.c(u).zone === 'minion' ? ['guard'] : null }; // The Defenders
  S['56189'] = { whenRevealed(g) { const xs = CW.chars(g).filter(x => !g.c(x).ex); const t = xs.includes(g.idt()) ? g.idt() : xs[0]; if (t) { g.c(t).ex = true; g.log(`데어데블: ${g.nm(t)} 소진`); } }, async boostEffect(g) { await exhaustOne(g, '★ 데어데블: 소진할 캐릭터'); } };
  S['56190'] = { async whenRevealed(g, u) { await g.activate(u, {}); } }; // Iron Fist (the boost targets your leader: nothing in cooperative mode)
  S['56191'] = Object.assign({}, otherMinionHost); // Resistance Fighter
  S['56193'] = { noRemove: g => g.e.minions.some(m => g.hasTrait(m, 'DEFENDER')) }; // Defend Hell's Kitchen
  // ---- Cloak & Dagger ----
  const inPlayId = (g, id) => g.e.minions.some(m => idOf(g, m) === id);
  const revealSelf = (u, ctx) => (ctx.post || ctx.after).push(async gg => { if (gg.c(u).zone === 'ediscard') await gg.reveal(u); });
  S['56194'] = { async whenRevealed(g) { await g.placeThreat(g.e.main, 2, {}); }, async boostEffect(g, u, ctx) { if (ctx.minionBoost) return; if (inPlayId(g, '56195')) revealSelf(u, ctx); else await g.placeThreat(g.e.main, 1, {}); } }; // Cloak
  S['56195'] = { async whenRevealed(g) { if (V(g)) g.heal(V(g), 2); await dmgOne(g, 2, '대거: 피해 2를 받을 캐릭터'); }, async boostEffect(g, u, ctx) { if (ctx.minionBoost) return; if (inPlayId(g, '56194')) revealSelf(u, ctx); else await dmgOne(g, 1, '★ 대거: 피해 1을 받을 캐릭터'); } }; // Dagger
  S['56196'] = { whenRevealed(g, u) { if (g.c(u).on) g.giveStatus(g.c(u).on, 'tough', '다크포스'); }, on: { hostWouldScheme(g, a, ctx) { ctx.post.push(gg => { if (gg.c(a).zone === 'attach') gg.discard(a, `${gg.nm(a)} 버림`); }); } } }; // Darkforce
  S['56197'] = { async whenRevealed(g) { if (V(g)) g.heal(V(g), 3); await g.indirectDamage(3, null); } }; // Lightforce
  S['56198'] = { whenDefeated(g) { const v = V(g); if (v) { g.heal(v, 3); g.giveStatus(v, 'tough', '클로크와 대거'); } } };
  MC.registerScripts(S);
})();
