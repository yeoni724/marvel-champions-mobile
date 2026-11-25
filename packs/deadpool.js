/* Deadpool (44001-44058): the Regeneratin' Degenerate, the 'Pool aspect, his nemesis set and the Dreadpool modular set.
   Ported from cards/pack/deadpool of the community build. Metagame cards with printed diagrams are simplified. */
(function () {
  'use strict';
  const S = {};
  const idOf = (g, u) => g.c(u).id;
  const tr = (g, u, t) => (g.d(u).tr || []).includes(t) || g.hasTrait(u, t);
  const pick = async (g, cands, title) => !cands.length ? null : cands.length === 1 ? cands[0] : await g.ask({ type: 'target', title, cands, cancelable: false });
  const yes = async (g, title) => (await g.ask({ type: 'choice', title, options: [{ id: 'y', label: '예' }, { id: 'n', label: '아니요' }] })) === 'y';
  const isDP = g => ['44001a', '44001b'].includes(idOf(g, g.idt()));
  const accelTok = g => g.e.accelTokens || 0;
  const icons = g => g.iconsInPlay();
  async function howMuch(g, max, title) { if (max <= 0) return 0; const opts = []; for (let i = max; i >= 1; i--) opts.push({ id: String(i), label: String(i) }); return +(await g.ask({ type: 'choice', title, options: opts })) || 0; }
  async function thw(g, t, n, src, o) { const r = await g.removeThreat(t, n, Object.assign({ src }, o || {})); g.log(`${g.nm(t)} 위협 ${r} 제거`); await g.afterThreatRemoved(t); return r; }

  // identity
  S['44001a'] = { wouldBeDefeated(g, u, wctx) { if (wctx.saved || u !== g.idt()) return; wctx.saved = true; g.c(u).dmg = g.maxHp(u) - 1; g.log('재생하는 막장 용병: 체력 1로 버티고 일상 모습으로', 'warn'); g.addAccel(1); g.flip(true); } };
  S['44001b'] = { actions: [{ timing: 'action', once: true, label: '제4의 벽 깨기: 손 카드 1장 버림 → 데드풀 이벤트를 손으로', can: g => g.p.hand.length > 0, async use(g) { const t = await pick(g, g.p.hand.slice(), '버릴 카드'); if (t) g.put(t, 'discard'); await g.searchToHand(d => d.type === 'event' && d.cls === 'Hero', '제4의 벽 깨기'); } }] };
  // hero cards
  S['44002'] = { mod: { atk: (g, s, t) => t === s ? Math.min(3, accelTok(g)) : 0, thw: (g, s, t) => t === s ? Math.min(3, accelTok(g)) : 0 } }; // Cable (ally)
  S['44003'] = { play: { timing: 'hero', async resolve(g) { // Exhausting Personality
    if (g.e.villain && (await g.ask({ type: 'choice', title: '피곤한 성격: 하나를 고르세요', options: [{ id: 'a', label: '가속 토큰 1 → 빌런 기절·혼란' }, { id: 'b', label: '정체성 소진 → 가속 토큰마다 카드 1장' }] })) === 'a') { g.addAccel(1); g.giveStatus(g.e.villain, 'stun', '피곤한 성격'); g.giveStatus(g.e.villain, 'conf', '피곤한 성격'); }
    else { const pi = await g.choosePlayer('기 빨리는 성격: 소진하고 카드를 뽑을 플레이어'); await g.withPlayer(pi, async () => { g.c(g.idt()).ex = true; await g.draw(accelTok(g)); }); } } } };
  S['44004'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { const n = await howMuch(g, g.hpLeft(g.idt()) - 0, '최대 노력: 받을 피해 (그만큼 공격)'); if (!n) return; await g.dealDamage(g.idt(), n, {}); if (g.c(g.idt()).zone) await g.playerAttack(g.idt(), ctx.target, n, { src: u }); } } }; // Maximum Effort
  S['44005'] = { interrupt: { window: 'cardRevealed', timing: 'hero', can: (g, u, ctx) => !ctx.cancelAll, async resolve(g, u, ctx) { ctx.cancelAll = true; const n = (g.d(ctx.card).boost || 0) + (g.d(ctx.card).boostStar ? 1 : 0); g.log(`메타지식: ${g.nm(ctx.card)} 취소, 피해 ${n}`, 'good'); if (n) await g.dealDamage(g.idt(), n, {}); } } }; // Metaknowledge
  S['44006'] = { play: { timing: 'hero', label: 'thwart', target: 'thwartable', async resolve(g, u, ctx) { const n = await howMuch(g, Math.min(g.hpLeft(g.idt()), g.c(ctx.target).threat), '"여기요~!": 받을 피해 (그만큼 위협 제거)'); if (!n) return; await g.dealDamage(g.idt(), n, {}); await thw(g, ctx.target, n, u); } } }; // "Yoo-Hoo!"
  S['44007'] = { resGen: g => 'G'.repeat(1 + Math.min(3, accelTok(g))) }; // Montage
  S['44008'] = { respond: [{ window: 'afterRecover', exhaust: true, label: '소진 → 정체성 준비', can: g => g.c(g.idt()).ex, resolve(g) { if (g.canReady(g.idt())) g.c(g.idt()).ex = false; } }] }; // Chimichanga Truck
  S['44009'] = { async onEnter(g, u) { const c = Object.values(MC.cards).filter(c => c.type === 'upgrade' && (c.tr || []).includes('WEAPON') && c.cls && c.cls !== 'Hero' && !c.enc); if (!c.length) return; // Armed to the Teeth
    const o = await g.ask({ type: 'choice', title: '중무장: 가져올 [무기] 업그레이드', options: c.slice(0, 24).map(x => ({ id: x.id, label: `${x.name} (${(MC.ASPECTS[x.cls] || {}).ko || x.cls})` })) }); const w = g.newCard(o || c[0].id); g.put(w, 'under', u); g.c(w).fd = true; g.log(`중무장: ${g.nm(w)}을(를) 뒷면으로`, 'good'); },
    actions: [{ timing: 'action', exhaust: true, label: '붙은 무기를 손의 [무기] 업그레이드와 교체', can: (g, u) => g.c(u).under.length > 0 && g.p.hand.some(x => tr(g, x, 'WEAPON')), async use(g, u) { const t = await pick(g, g.p.hand.filter(x => tr(g, x, 'WEAPON')), '바꿀 [무기]'); const w = g.c(u).under[0]; if (!t || !w) return; delete g.c(w).fd; g.put(w, 'hand'); g.put(t, 'under', u); g.c(t).fd = true; } }] };
  S['44010'] = { actions: [{ timing: 'hero', kind: 'attack', exhaust: true, label: '소진·피해 1 → 적에게 피해 2 (관통)', async use(g, u) { const t = await g.chooseTarget('attackable', '데드풀의 카타나: 대상', g.idt(), false); if (!t) return; await g.dealDamage(g.idt(), 1, {}); await g.playerAttack(g.idt(), t, 2, { src: u, piercing: true }); } }] }; // Deadpool's Katana
  S['44011'] = { attach: { kind: 'anyScheme', filter: (g, t) => t === g.e.main }, targetPlus: g => 2 * accelTok(g) }; // It Ain't Over...
  S['44012'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { await g.playerAttack(g.idt(), ctx.target, g.c(g.idt()).dmg, { src: u }); } } }; // This Card is Fire
  S['44032'] = { // The Merc with the Mouth
    whenRevealed(g, u) { for (const a of g.p.allies) g.c(a).ex = true; g.put(u, 'pobl'); g.log('입담 용병: 동료 모두 소진, 준비 불가', 'warn'); },
    blocksReady: (g, s, x) => g.c(s).zone === 'pobl' && g.p.allies.includes(x),
    on: { playerPhaseEnd(g, u) { if (g.c(u).zone === 'pobl') g.discard(u, '입담 용병'); } } };
  // nemesis
  const procedures = g => g.e.sides.find(u => idOf(g, u) === '44034') || null;
  S['44033'] = { schemeTarget: g => procedures(g), boostEffect(g) { g.giveStatus(g.idt(), 'conf', '★ 버틀러'); } }; // Butler
  S['44034'] = { on: { afterTakeDamage(g, u, ctx) { if (ctx.target !== g.idt() || !isDP(g) || g.c(u).zone !== 'side') return; g.c(u).threat += 1; if (g.c(u).threat >= 10) { g.removeFromGame(u); g.log('비자발적 시술: 게임에서 제거', 'good'); } } } }; // Involuntary Procedures
  S['44035'] = { attachTo: g => g.idt(), blankHost: true, // Tabula Rasa 16
    actions: [{ timing: 'alter', label: '[정신][정신] → 이 카드 버림', cost: { n: 2, req: 'BB' }, can: (g, u) => g.c(u).on === g.idt(), use(g, u) { g.discard(u); } }],
    boostEffect(g, u, ctx) { (ctx.post || ctx.after).push(async gg => { if (gg.c(u).zone && gg.c(u).zone !== 'attach') gg.attachEnc(u, gg.idt()); }); } };
  S['44036'] = { on: { enemyActivated(g, u, ctx) { if (ctx.enemy === u && g.c(u).zone === 'minion') g.c(u).dmg = 0; } } }; // Mutated Soldier
  // Dreadpool (modular)
  const dreadIds = ['44038', '44039', '44040', '44041', '44042'];
  S['44037'] = { async whenRevealed(g, u) { // Crisis of Infinite Deadpools
    const set = g.e.deck.concat(g.e.discard, g.e.aside || []).filter(x => dreadIds.includes(idOf(g, x)));
    const dp = set.find(x => idOf(g, x) === '44038'), dd = set.find(x => idOf(g, x) === '44039');
    if (dp) await g.withPlayer(g.s.first, () => g.enterMinion(dp, {})); if (dd) await g.enterSide(dd, {}); g.shuffle(g.e.deck); g.removeFromGame(u);
  } };
  S['44038'] = { async whenDefeated(g, u) { (g.e.toFacedown = g.e.toFacedown || []).push(u); } }; // Dreadpool
  S['44039'] = { whenRevealed(g, u) { if (g.controlled().some(x => g.d(x).cls === "'Pool")) g.c(u).threat += 2; } }; // Dreadful Deeds
  S['44040'] = { attachTo: g => g.e.minions.find(m => idOf(g, m) === '44038') || g.e.villain }; // Anti-Regeneration Ray
  S['44041'] = { // 'Pool-ized
    attachTo: () => null,
    async whenRevealed(g, u, ctx) { const a = g.p.allies.filter(x => !g.sc(x).noAllyLimit); if (!a.length) { ctx.surge++; g.discard(u); return; } const top = Math.max(...a.map(x => g.d(x).cost || 0)); const t = a.find(x => (g.d(x).cost || 0) === top); g.allyToMinion(t, 'POOL'); g.log(`'풀화: ${g.nm(t)}이(가) 하수인이 됩니다`, 'warn'); g.discard(u); } };
  S['44042'] = { async whenRevealed(g) { const n = g.e.minions.some(m => idOf(g, m) === '44038') ? 3 : 2; const c = g.allFriendlyChars().filter(x => tr(g, x, 'DEADPOOL CORPS')); for (const x of c) await g.dealDamage(x, n, {}); if (!c.length) g.addAccel(1); } }; // Metacidal Tendencies
  // 'Pool aspect
  S['44013'] = { async whenDefeated(g) { const t = await g.chooseTarget('enemy', '도그풀: 피해 1을 줄 적', g.idt(), false); if (t) await g.dealDamage(t, 1, { byPlayer: true }); } }; // Dogpool
  S['44014'] = { respond: [{ window: 'afterAllyAttack', label: '★ 그 하수인이 다른 적을 공격', can: (g, u, ctx) => ctx.ally === u && g.c(ctx.target).zone === 'minion' && g.enemies().length > 1, async resolve(g, u, ctx) { // Headpool
    const t = await pick(g, g.enemies().filter(e => e !== ctx.target), '헤드풀: 그 하수인이 공격할 적'); if (t) await g.dealDamage(t, g.stat(ctx.target, 'atk'), { src: ctx.target, byPlayer: true }); } }] };
  S['44015'] = { selfPiercing: true }; // Kidpool
  S['44016'] = { async whenDefeated(g) { const t = await pick(g, g.e.minions.filter(m => !tr(g, m, 'ELITE')), '레이디 데드풀: 물리칠 하수인'); if (t) await g.defeat(t, { byPlayer: true }); } }; // Lady Deadpool
  S['44017'] = { interrupt: { windows: ['wouldTakeAttackDamage'], timing: 'hero', label: 'defense', resolve(g, u, ctx) { const n = icons(g); ctx.prevent += n; g.log(`겨우 생채기: 피해 ${n} 방지`, 'good'); } } }; // Barely a Scratch
  S['44018'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { await g.playerAttack(g.idt(), ctx.target, 5, { src: u }); if (g.c(ctx.target).zone && ['villain', 'minion'].includes(g.c(ctx.target).zone)) g.giveStatus(ctx.target, 'stun', '어퍼컷'); } } }; // Cutupper
  S['44019'] = { play: { timing: 'hero', can: g => !!g.e.villain, async resolve(g, u) { const n = icons(g); await g.dealDamage(g.e.villain, 10, { src: u, byPlayer: true }); // Da Bomb
    if (n) { for (const e of g.enemies().slice()) await g.dealDamage(e, n, { src: u, byPlayer: true }); for (const pi of g.livingPlayers()) if (g.s.ps[pi].form === 'hero' && g.c(g.idt(pi)).zone) await g.dealDamage(g.idt(pi), n, {}); } } } };
  S['44020'] = { play: { timing: 'action', can: g => g.p.allies.some(a => g.c(a).ex), async resolve(g) { const t = await pick(g, g.p.allies.filter(a => g.c(a).ex), '준비할 동료'); if (t) { g.c(t).ex = false; g.addPhaseMod(t, 'atk', 1); } } } }; // Get Rage-y
  S['44021'] = { play: { timing: 'hero', async resolve(g, u) { // "I Got This"
    const has = k => g.inPlay().some(x => k === 'crisis' ? !!g.d(x).crisis : g.iconOf(x, k) > 0);
    if (has('crisis')) { const t = await g.chooseTarget('enemy', '"내가 맡을게": 피해 3을 줄 적', g.idt(), false); if (t) await g.dealDamage(t, 3, { src: u, byPlayer: true }); }
    if (has('accel')) await g.removeThreatChoose(2, '"내가 맡을게": 위협 2', u);
    if (has('amplify')) { const t = await pick(g, g.p.allies.filter(a => g.c(a).ex), '준비할 동료'); if (t) g.c(t).ex = false; }
    if (has('hazard')) await g.draw(1);
  } } };
  S['44022'] = { interrupt: { window: 'threatWouldBePlaced', can: (g, u, ctx) => ctx.amount > 0, async resolve(g, u, ctx) { const n = ctx.amount; ctx.amount = 0; const t = await pick(g, g.friendlyChars(), '내 책임 아님: 대신 피해를 받을 캐릭터'); if (t) await g.dealDamage(t, n, {}); } } }; // Not My Responsibility
  S['44023'] = { play: { timing: 'hero', label: 'thwart', async resolve(g, u) { await thw(g, g.e.main, 5, u, { ignoreCrisis: true }); const n = icons(g); if (n) for (const s of g.schemes().slice()) if (g.c(s).zone && g.c(s).threat > 0) await thw(g, s, n, u); } } }; // 'Pool Inspection
  S['44024'] = { mod: { hs: (g, s, t) => g.identityPlayer(t) >= 0 && g.c(s).zone === 'side' ? 2 : 0 } }; // Live Dangerously
  const selfRes = r => ({ resGen: g => { const d = g.c(g.idt()).dmg; return r.repeat(d === 0 ? 3 : d < 5 ? 2 : 1); } });
  S['44025'] = selfRes('R'); S['44026'] = selfRes('B'); S['44027'] = selfRes('Y');
  S['44028'] = { on: { hostWouldBeDefeated(g, a, wctx) { const pi = g.identityPlayer(wctx.target); if (pi < 0 || wctx.saved) return; wctx.saved = true; g.withPlayerSync(pi, () => { g.c(g.idt()).dmg = g.maxHp(g.idt()) - 1; if (g.isHero()) g.flip(true); }); g.removeFromGame(a); g.log('깃 굿: 체력 1로 버팁니다', 'good'); } } }; // Git Gud
  S['44029'] = { on: { turnBegins(g, u) { if (!g.c(u).ex && g.c(g.idt()).dmg > 0) { g.c(u).ex = true; g.heal(g.idt(), 2); g.log('치유 인자: 회복 2', 'good'); } } } }; // Healing Factor
  S['44030'] = { actions: [{ timing: 'hero', exhaust: true, label: '[물리] 1 → 히어로 준비', cost: { n: 1, req: 'R' }, can: g => g.c(g.idt()).ex, use(g) { if (g.canReady(g.idt())) g.c(g.idt()).ex = false; } }] }; // Stick-To-Itiveness
  S['44043'] = { async onEnter(g, u) { if (g.e.villain && (await g.ask({ type: 'choice', title: '하이드라 요원 밥: 하나를 고르세요', options: [{ id: 'd', label: '적에게 피해 2' }, { id: 't', label: '위협 1 제거' }] })) === 'd') { const t = await g.chooseTarget('enemy', '피해 2를 줄 적', u, false); if (t) await g.dealDamage(t, 2, { src: u, byPlayer: true }); } else await g.removeThreatChoose(1, '밥: 위협 1', u); } }; // Bob, Agent of Hydra
  S['44044'] = { respond: [{ window: 'cardRevealed', label: '네가소닉 피해 2 → 배반 카드의 "공개될 때" 취소', can: (g, u, ctx) => g.d(ctx.card).type === 'treachery' && !ctx.cancel && g.c(u).zone === 'ally', async resolve(g, u, ctx) { await g.dealDamage(u, 2, {}); ctx.cancel = true; } }] }; // Negasonic Teenage Warhead
  S['44046'] = { play: { timing: 'alter', resolve(g) { for (const pi of g.livingPlayers()) g.heal(g.idt(pi), 3); g.log('휴식 시간: 만화책 한 권 읽고 오세요 (회복 3)', 'good'); } } }; // Break Time
  S['44047'] = { interrupt: { window: 'cardRevealed', timing: 'hero', can: (g, u, ctx) => g.d(ctx.card).type === 'treachery' && !ctx.cancel && !!g.e.villain, async resolve(g, u, ctx) { ctx.cancel = true; await g.enemyAttack(g.e.villain, {}); } } }; // Get in Front of Me!
  S['44048'] = { play: { timing: 'action', async resolve(g) { for (const x of g.p.hand.slice()) g.put(x, 'discard'); await g.draw(g.handSize()); } } }; // Mulligan
  S['44049'] = { actions: [{ timing: 'action', exhaust: true, label: '소진·뒷면 조우 카드 1장 → 손의 \'풀 동료 플레이', can: g => g.p.hand.some(x => g.d(x).type === 'ally' && g.d(x).cls === "'Pool"), async use(g) { const x = g.takeEncounter(); if (x) g.put(x, 'facedown'); const t = await pick(g, g.p.hand.filter(y => g.d(y).type === 'ally' && g.d(y).cls === "'Pool"), '플레이할 \'풀 동료'); if (t) await g.putAllyIntoPlay(t); } }] }; // Deadpool Corps Ship
  S['44050'] = { actions: [{ timing: 'action', exhaust: true, label: '소진 → 성향 카드 1장을 붙이기 / 붙은 카드 1장을 손으로', async use(g, u) { // Plot Convenience
    const c = g.c(u); if (c.under.length && (c.under.length >= 3 || !g.p.hand.some(x => MC.ASPECTS[g.d(x).cls] && g.d(x).cls !== 'Basic') || await yes(g, '붙은 카드를 손으로 가져올까요?'))) { const t = await pick(g, c.under.slice(), '손으로 가져올 카드'); if (t) { delete g.c(t).fd; g.put(t, 'hand'); } return; }
    const t = await pick(g, g.p.hand.filter(x => MC.ASPECTS[g.d(x).cls] && g.d(x).cls !== 'Basic'), '붙일 성향 카드'); if (t) { g.put(t, 'under', u); g.c(t).fd = true; } } }] };
  S['44051'] = { attach: { kind: 'anyScheme', filter: (g, t) => g.c(t).zone === 'side' && !g.c(t).att.some(a => idOf(g, a) === '44051') }, on: { async attachedDefeated(g) { const t = await pick(g, g.e.minions.filter(m => !tr(g, m, 'ELITE')), '매복: 버릴 하수인'); if (t) g.discard(t); } } }; // Ambush
  S['44052'] = { actions: [{ timing: 'hero', kind: 'attack', label: '버리기 → 아이콘마다 피해 1 (원거리)', async use(g, u) { const t = await g.chooseTarget('attackable', '바주카: 대상', g.idt(), false); if (!t) return; const n = icons(g); g.discard(u); await g.playerAttack(g.idt(), t, n, { src: u, ranged: true }); } }] }; // Bazooka
  S['44054'] = { attach: { kind: 'minion', filter: (g, t) => !tr(g, t, 'ELITE') && !g.c(t).att.some(a => idOf(g, a) === '44054') }, noActivate: true }; // Distraction
  S['44055'] = { mod: { atk: (g, s, t) => t === g.idt() && g.isHero() ? Math.min(4, icons(g)) : 0 } }; // Laser Swords
  S['44058'] = { actions: [{ timing: 'hero', exhaust: true, label: '전쟁: 조우 덱 맨 위 vs 내 덱 맨 위', async use(g, u) { // War
    const x = g.takeEncounter(); let n = 0; if (x) { n = (g.d(x).boost || 0) + (g.d(x).boostStar ? 1 : 0); g.put(x, 'ediscard'); } if (n) await g.dealDamage(g.idt(), n, {});
    if (!g.p.deck.length) await g.reshuffleDeck(); const y = g.p.deck[0]; if (!y) return; g.put(y, 'discard'); const k = g.d(y).cost || 0; g.log(`전쟁: ${g.nm(y)} (비용 ${k})`); if (k) { const t = await g.chooseTarget('enemy', '전쟁: 피해를 줄 적', g.idt(), false); if (t) await g.dealDamage(t, k, { src: u, byPlayer: true }); } } }] };
  // Blackout, Rock Paper Scissors and Tic-Tac-Toe: the printed boxes are counters on the card (as in the original)
  const COLK = { R: '물리', B: '정신', Y: '에너지' };
  const colorsPaid = paid => (paid || []).includes('G') ? ['R', 'B', 'Y'] : ['R', 'B', 'Y'].filter(k => (paid || []).includes(k));
  const pickColor = async (g, cs, title) => cs.length <= 1 ? cs[0] : await g.ask({ type: 'choice', title, options: cs.map(k => ({ id: k, label: COLK[k] })) });
  S['44053'] = { actions: [{ timing: 'hero', label: '정전: 자원 1 → 음모의 위협 1을 같은 색 칸으로', cost: { n: 1, req: '' }, target: 'thwartable', async use(g, u, a) { // Blackout
    const c = g.c(u).cnt, open = colorsPaid(a.paid).filter(k => (c['bo' + k] || 0) < 2); if (!open.length) { g.log('정전: 그 색 칸이 모두 찼습니다'); return; }
    const k = await pickColor(g, open, '정전: 채울 칸의 색'); const r = await g.removeThreat(a.target, 1, { src: u }); await g.afterThreatRemoved(a.target); c['bo' + k] = (c['bo' + k] || 0) + 1; g.log(`정전: ${g.nm(a.target)} 위협 ${r} → ${COLK[k]} 칸 (${c['bo' + k]}/2)`);
    if (['R', 'B', 'Y'].every(x => (c['bo' + x] || 0) >= 2)) { g.discard(u, '정전: 모든 칸이 찼습니다'); const vs = g.e.villains ? g.e.villains.filter(v => g.c(v).zone) : (g.e.villain ? [g.e.villain] : []); const v = await pick(g, vs, '정전: 혼란시킬 빌런'); if (v) g.giveStatus(v, 'conf', '정전'); } } }] };
  const RPS_BEATS = { R: 'Y', B: 'R', Y: 'B' }; // the printed cycle: [physical] > [energy] > [mental] > [physical]; [wild] beats any
  const rpsBeat = (a, b) => { a = a || ''; b = b || ''; if (!a || !b || !/[RBY]/.test(b) && !b.includes('G')) return false; if (a.includes('G')) return /[RBY]/.test(b); return [...a].some(x => RPS_BEATS[x] && b.includes(RPS_BEATS[x])); };
  S['44056'] = { actions: [{ timing: 'hero', exhaust: true, label: '가위바위보: 손의 카드 1장 vs 덱 맨 위', can: g => g.p.hand.length > 0, async use(g, u) { // Rock, Paper, Scissors
    const h = await pick(g, g.p.hand.slice(), '가위바위보: 손에서 고를 카드'); if (!h) return; if (!g.p.deck.length) await g.reshuffleDeck(); const y = g.p.deck[0]; if (!y) return; g.put(y, 'discard');
    const win = rpsBeat(g.resOf(h), g.d(y).res); g.log(`가위바위보: ${g.nm(h)}(${g.resOf(h) || '-'}) vs ${g.nm(y)}(${g.d(y).res || '-'}) → ${win ? '승리' : '패배'}`, win ? 'good' : '');
    if (win) { g.put(y, 'hand'); g.log(`${g.nm(y)}을(를) 손에 더합니다`, 'good'); } } }] };
  const TTT_ROW = { Y: 1, B: 2, R: 3 }, TTT_LINES = [[11, 12, 13], [21, 22, 23], [31, 32, 33], [11, 21, 31], [12, 22, 32], [13, 23, 33], [11, 22, 33], [13, 22, 31]];
  S['44057'] = { actions: [{ timing: 'hero', label: '틱택토: 자원 1 → 캐릭터의 피해 1을 같은 색 줄의 빈칸으로', cost: { n: 1, req: '' }, can: g => g.friendlyChars().some(x => g.c(x).dmg > 0), async use(g, u, a) { // Tic-Tac-Toe
    const c = g.c(u).cnt, open = []; for (const k of colorsPaid(a.paid)) for (let col = 1; col <= 3; col++) { const b = TTT_ROW[k] * 10 + col; if (!c['t' + b]) open.push(b); }
    if (!open.length) { g.log('틱택토: 그 색 줄에 빈칸이 없습니다'); return; }
    const t = await pick(g, g.friendlyChars().filter(x => g.c(x).dmg > 0), '틱택토: 피해를 옮길 캐릭터'); if (!t) return;
    const b = open.length === 1 ? open[0] : +(await g.ask({ type: 'choice', title: '틱택토: 피해를 놓을 칸 (줄-칸)', options: open.map(x => ({ id: String(x), label: `${Math.floor(x / 10)}줄(${COLK[Object.keys(TTT_ROW).find(k => TTT_ROW[k] === Math.floor(x / 10))]}) ${x % 10}번째 칸` })) }));
    g.heal(t, 1); c['t' + b] = 1; g.log(`틱택토: ${g.nm(t)}의 피해 1을 ${Math.floor(b / 10)}-${b % 10} 칸으로`);
    if (TTT_LINES.some(l => l.every(x => c['t' + x]))) { const n = Object.keys(c).filter(k => /^t\d\d$/.test(k) && c[k]).length; const e = await g.chooseTarget('enemy', `틱택토 완성: 피해 ${n}을 줄 적`, u, false); if (e) await g.dealDamage(e, n, { src: u, byPlayer: true }); g.discard(u, '틱택토 완성'); } } }] };

  MC.registerScripts(S);
})();
