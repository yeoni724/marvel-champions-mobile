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

  // ======================= Synthezoid Smackdown (57001-57073): She-Hulk and Vision leaders, eight modular sets =======================
  // ---- She-Hulk ----
  const sheBase = Object.assign({}, leaderBase, { leaderSide: '57012', on: { async formChanged(g, s, ctx) { if (ctx.form === 'hero' && s === V(g)) { g.log(`${g.nm(s)}: 히어로로 변신 → 피해 1`, 'warn'); await g.dealDamage(g.idt(), 1, {}); } } } });
  S['57001'] = S['57003'] = Object.assign({}, sheBase, { leaderSetup(g, v) { findAttach(g, ['57007'], v); } });
  S['57002'] = S['57004'] = Object.assign({}, sheBase, stage2);
  S['57007'] = Object.assign({}, oneShotProps({ overkill: true }, '공격 후 버림'), revealBoost); // Superhuman Strength
  S['57008'] = Object.assign({ grantStalwart: true, on: { hostWouldScheme(g, a, ctx) { ctx.post.push(gg => { if (gg.c(a).zone === 'attach') gg.discard(a, `${gg.nm(a)} 버림`); }); } } }, revealBoost); // Focused Rage
  S['57009'] = { async whenRevealedAlter(g) { const v = V(g); if (!v) return; await g.enemyScheme(v, {}); g.giveStatus(v, 'tough', '원투 펀치'); }, async whenRevealedHero(g) { const v = V(g); if (!v) return; await g.enemyAttack(v, {}); g.giveStatus(v, 'tough', '원투 펀치'); } };
  S['57010'] = { whenRevealed(g, u, ctx) { const xs = chars(g).filter(x => !g.c(x).ex); xs.forEach(x => { g.c(x).ex = true; }); if (xs.length) g.log(`지면 강타: ${xs.map(x => g.nm(x)).join(', ')} 소진`); else ctx.surge++; }, async boostEffect(g) { await exhaustOne(g, '★ 지면 강타: 소진할 캐릭터'); } }; // Ground Stomp
  S['57011'] = { async whenRevealed(g, u, ctx) { const xs = g.p.allies.concat(g.p.supports).filter(x => !g.d(x).enc && !g.d(x).permanent); let placed = 0; if (xs.length) { const t = await pick(g, highest(g, xs), '감마 슬램: 버릴 카드 (비용이 가장 높은 것)'); const n = costOf(g, t); g.discard(t, `${g.nm(t)} 버림`); if (n) placed = await g.placeThreat(g.e.main, n, {}) || n; } if (!placed) ctx.surge++; } }; // Gamma Slam
  S['57012'] = { removeOnlyBy: (g, s, src) => src === s, respond: [{ window: 'afterChangeForm', timing: 'alter', label: '정체성 소진 → 법률 사무소 위협 3 제거', can: (g, u) => g.c(u).zone === 'side' && !g.c(g.idt()).ex, async resolve(g, u) { g.c(g.idt()).ex = true; await thw(g, u, 3, u); } }] }; // Legal Practice
  // ---- Vision ----
  const massOf = g => { const v = V(g); return v ? g.c(v).att.find(a => ['57046a', '57046b'].includes(idOf(g, a))) : null; };
  const dense = g => { const m = massOf(g); return !!(m && idOf(g, m) === '57046a'); };
  const intang = g => { const m = massOf(g); return !!(m && idOf(g, m) === '57046b'); };
  const flipMass = (g, to) => { const m = massOf(g); if (!m) return false; const nx = to || (idOf(g, m) === '57046a' ? '57046b' : '57046a'); if (idOf(g, m) === nx) return false; g.c(m).id = nx; g.log(`비전: 질량 형태 → ${g.nm(m)}`, 'warn'); return true; };
  const visBase = Object.assign({}, leaderBase, { leaderSide: '57054', on: { mainStep1(g, s) { if (s === V(g)) flipMass(g); } } });
  S['57040'] = S['57042'] = Object.assign({}, visBase, { leaderSetup(g, v) { const x = findAttach(g, ['57046a', '57046b'], v); if (x) g.c(x).id = '57046a'; } });
  S['57041'] = S['57043'] = Object.assign({}, visBase, stage2);
  S['57046a'] = {}; S['57046b'] = { reduceDamage: (g, a, n) => Math.max(0, n - 1) }; // Dense / Intangible
  const flipOnHit = (req, label) => ({ window: 'afterBasicAttack', timing: 'hero', label, cost: { n: req.length, req }, can: (g, u, ctx) => g.c(u).zone === 'attach' && ctx.target === g.c(u).on, resolve(g, u) { g.discard(u, `${g.nm(u)} 버림`); flipMass(g); } });
  S['57047'] = Object.assign({ grantStalwart: true, respond: [flipOnHit('YR', '[에너지][물리] → 태양석 버림, 질량 형태 뒤집기')] }, revealBoost); // Solar Gem
  S['57048'] = Object.assign({ mod: { retaliate: (g, s, t) => g.c(s).zone === 'attach' && t === g.c(s).on ? 1 : 0 }, respond: [flipOnHit('YB', '[에너지][정신] → 비전의 망토 버림, 질량 형태 뒤집기')] }, revealBoost); // Vision's Cape
  S['57049'] = { on: { hostAttacked(g, a, actx) { if (!dense(g) || actx.prevent) return; actx.prevent = true; g.log(`${g.nm(a)}: 피해를 모두 막고 공격자를 기절시킵니다`, 'warn'); g.giveStatus(actx.attacker, 'stun', g.nm(a)); g.discard(a); } } }; // Mass Increase
  S['57050'] = { on: { hostWouldScheme(g, a) { if (flipMass(g, '57046b')) g.discard(a, `${g.nm(a)} 버림`); }, enemyAttacks(g, a, ctx) { if (ctx.enemy === g.c(a).on && flipMass(g, '57046a')) g.discard(a, `${g.nm(a)} 버림`); } } }; // Density Control
  S['57051'] = { async whenRevealedAlter(g) { const v = V(g); if (v) await g.enemyScheme(v, { schBonus: intang(g) ? 1 : 0 }); }, async whenRevealedHero(g) { const v = V(g); if (v) await g.enemyAttack(v, { atkBonus: dense(g) ? 1 : 0 }); } }; // Solar Beam
  S['57052'] = { async whenRevealed(g) { const t = await exhaustOne(g, '초고밀도 일격: 소진할 캐릭터'); if (dense(g)) { if (t) await g.dealDamage(t, 2, {}); } else if (intang(g)) flipMass(g); } }; // Superdense Strike
  S['57053'] = { whenRevealed(g) { const xs = g.p.upgrades.concat(...chars(g).map(c => g.c(c).att)).filter(x => g.d(x).type === 'upgrade' && !g.d(x).enc); const t = CW.worst(g, xs.filter(x => !g.c(x).ex)) || CW.worst(g, xs); // Phase Disruption
    if (t) { if (intang(g) && !g.d(t).permanent) g.discard(t, `위상 교란: ${g.nm(t)} 버림`); else { g.c(t).ex = true; g.log(`위상 교란: ${g.nm(t)} 소진`); } } if (dense(g)) flipMass(g); } };
  S['57054'] = { whenDefeated(g) { if (!g.c(g.idt()).conf) g.giveStatus(g.idt(), 'conf', '그냥 지나가는 중'); else g.giveStatus(g.idt(), 'stun', '그냥 지나가는 중'); } }; // Just Passing Through
  // ---- S.H.I.E.L.D. Ops ----
  S['57013'] = { async whenRevealed(g) { await g.placeThreat(g.e.main, 2, {}); } };
  S['57014'] = { whenRevealed(g) { if (V(g)) g.giveStatus(V(g), 'tough', '전략적 감시'); for (const m of g.e.minions) g.giveStatus(m, 'tough', '전략적 감시'); }, boostEffect(g, u, ctx) { if (ctx.enemy) g.giveStatus(ctx.enemy, 'tough', '★ 전략적 감시'); } }; // Strategic Overwatch
  const firstMinionSurge = { surgeFor(g, s) { if (g.c(s).zone !== 'side' || g.c(s).firstMin === g.s.round) return false; g.c(s).firstMin = g.s.round; return true; } };
  S['57016'] = S['57059'] = firstMinionSurge; // Homeland Security / Young Avengers
  // ---- Thunderbolts ----
  S['57017'] = { whenRevealed: stunYou('아틀라스'), boostEffect: stunYou('★ 아틀라스') };
  S['57018'] = { whenRevealed: confYou('송버드'), boostEffect: confYou('★ 송버드') };
  S['57019'] = { async whenRevealed(g) { await dmgOne(g, 2, '페넌스: 피해 2를 받을 캐릭터'); }, async boostEffect(g) { await dmgOne(g, 1, '★ 페넌스: 피해 1을 받을 캐릭터'); } };
  S['57021'] = { noRemove: g => g.e.minions.some(m => g.hasTrait(m, 'THUNDERBOLT')) }; // The Thunderbolts
  // ---- Taskmaster ----
  const tmOr = g => g.e.minions.find(m => idOf(g, m) === '57022') || V(g);
  const hd = (req, label) => ({ timing: 'hero', label, cost: { n: req.length, req }, can: (g, u) => g.c(u).zone === 'attach', use(g, u) { g.discard(u, `${g.nm(u)} 버림`); } });
  S['57022'] = { async whenRevealed(g, u) { await g.activate(u, {}); } };
  S['57023'] = { attachTo: tmOr, attackProps(g, x, ctx) { return g.c(x).zone === 'attach' && ctx.enemy === g.c(x).on ? { piercing: true } : {}; }, actions: [hd('BR', '[정신][물리] → 태스크마스터의 검 버림')] };
  S['57024'] = { attachTo: tmOr, reduceDamage: (g, a, n) => Math.max(0, n - 1), actions: [hd('BR', '[정신][물리] → 태스크마스터의 방패 버림')] };
  const toughFd = (g, why) => { const v = V(g); if (!v) return; g.giveStatus(v, 'tough', why); g.giveFacedownBoostTo(v, 1); g.log(`${g.nm(v)}: 뒷면 강화 카드 +1`); };
  S['57025'] = { whenRevealed(g) { toughFd(g, '흉내 낸 기술'); }, boostEffect(g, u, ctx) { ctx.extraBoost = (ctx.extraBoost || 0) + 1; } }; // Mimicked Move (it attacks "your leader" only in competitive mode)
  S['57026'] = { whenDefeated(g) { toughFd(g, '태스크마스터 아카데미'); } };
  // ---- Deadly Duo ----
  S['57027'] = { async whenRevealed(g) { const n = typeCount(g, await burn(g, 3)); if (n) await g.indirectDamage(n, null); } }; // Jester
  S['57028'] = { async whenRevealed(g) { const n = typeCount(g, await burn(g, 3)); if (n) await g.placeThreat(g.e.main, n, {}); } }; // Jack O'Lantern
  S['57029'] = Object.assign({}, otherMinionHost); // Mad Jack's Platform
  S['57030'] = { async whenRevealed(g, u, ctx) { const xs = ctrl(g).filter(x => !g.d(x).enc); if (!xs.length) { ctx.surge++; return; } const t = await pick(g, highest(g, xs), '제스터의 요요: 버릴 카드'); g.discard(t, `${g.nm(t)} 버림`); }, async boostEffect(g) { await discardYour(g, ['upgrade'], '★ 제스터의 요요: 버릴 업그레이드'); } };
  S['57031'] = { async whenDefeated(g) { await g.forEachPlayer(() => burn(g, 8)); } }; // Deadly Duo
  // ---- Young Avengers ----
  S['57055'] = { whenRevealed(g) { if (V(g)) g.giveStatus(V(g), 'tough', '패트리어트'); } };
  S['57056'] = { attackProps: () => ({ piercing: true, ranged: true }), async whenRevealed(g) { await discardYour(g, ['upgrade'], '호크아이: 버릴 업그레이드'); } };
  S['57057'] = { async whenRevealed(g) { await discardYour(g, ['support'], '스태처: 버릴 지원'); } };
  S['57058'] = { async whenRevealed(g, u, ctx) { if (!(await CW.minionsWR(g))) ctx.surge++; } }; // Teenage Superheroes
  // ---- Scarlet Twins ----
  S['57060'] = { async whenRevealed(g) { if (!g.giveStatus(g.idt(), 'stun', '스피드')) await g.dealDamage(g.idt(), 2, {}); } }; // Speed
  S['57061'] = { async whenRevealed(g) { if (!g.giveStatus(g.idt(), 'conf', '위칸')) await g.placeThreat(g.e.main, 2, {}); } }; // Wiccan
  S['57062'] = { async whenRevealed(g) { const x = (await g.discardRandomHand(1))[0]; if (x && costOf(g, x)) await g.indirectDamage(costOf(g, x), null); }, async boostEffect(g) { if (g.p.hand.length) await g.discardFromHand(1, 1, '★ 초고속: 버릴 카드'); } }; // Superspeed
  S['57063'] = { whenRevealed(g, u) { g.put(u, 'pobl'); g.log('주문 시전: 다음에 플레이하는 카드의 효과가 취소됩니다', 'warn'); }, // Spellcasting
    on: { cardPlayed(g, u, ctx) { if (g.c(u).zone !== 'pobl' || !ctx.card) return; g.c(ctx.card).playCancelled = true; g.discard(u, '주문 시전 버림'); } } };
  S['57064'] = { async whenDefeated(g) { if (g.p.hand.length) await g.discardFromHand(1, 1, '초능력 남매: 버릴 카드'); } };
  // ---- Moon Knight ----
  async function treacheryWR(g, x) { const f = g.sc(x).whenRevealed || (g.isHero() ? g.sc(x).whenRevealedHero : g.sc(x).whenRevealedAlter); if (!f) return; g.log(`${g.nm(x)}의 공개 시 효과를 해결합니다`); await f(g, x, { surge: 0 }); }
  S['57065'] = { async whenRevealed(g) { const xs = g.e.discard.filter(x => g.d(x).type === 'treachery'); const x = xs[xs.length - 1]; if (x) await treacheryWR(g, x); } };
  S['57066'] = Object.assign({ attachTo: g => g.e.minions.find(m => idOf(g, m) === '57065') || V(g) }, oneShotProps({ piercing: true, ranged: true }, '공격 후 버림')); // Crescent Dart
  S['57067'] = { async whenRevealed(g) { g.c(g.idt()).ex = true; await g.dealDamage(g.idt(), 2, {}); }, boostEffect(g) { g.c(g.idt()).ex = true; g.log('★ 콘슈의 주먹: 정체성 소진'); } };
  S['57068'] = { async whenDefeated(g) { for (let i = 0; i < 200; i++) { const x = g.takeEncounter(); if (!x) return; g.put(x, 'ediscard'); if (g.d(x).type === 'treachery') { await treacheryWR(g, x); return; } } } }; // Khonshu's Avatar
  // ---- Royal Guard ----
  const huntedYou = g => g.hasTrait(g.idt(), 'HUNTED');
  const guardWR = { async whenRevealed(g, u) { if (huntedYou(g)) await g.activate(u, {}); else await burn(g, 2); } };
  S['57069'] = S['57070'] = guardWR;
  S['57072'] = { whenRevealed(g, u) { g.put(u, 'pobl'); g.log('피의 빚: 당신은 [사냥감] 특성을 얻습니다', 'warn'); }, grantTrait: (g, s, u) => g.c(s).zone === 'pobl' && g.c(s).pZone != null && u === g.idt(g.c(s).pZone) ? 'HUNTED' : null, // Blood Debt
    actions: [{ timing: 'alter', label: '덱 위 8장 버림 → 피의 빚 버림', can: (g, u) => g.c(u).zone === 'pobl', async use(g, u) { await burn(g, 8); g.discard(u, '피의 빚 버림'); } }] };
  S['57073'] = { whenDefeated(g) { const x = g.e.deck.concat(g.e.discard).find(y => idOf(g, y) === '57072'); g.shuffle(g.e.deck); if (x) { g.put(x, 'facedown'); g.log('피의 빚을 뒷면 조우 카드로 받습니다', 'warn'); } } };
  MC.registerScripts(S);
})();
