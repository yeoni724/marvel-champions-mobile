/* Age of Apocalypse (45001-45186): Bishop, Magik, X-Men player cards, five scenarios and the modular sets.
   Ported from cards/pack/aoa of the community build. The Age of Apocalypse campaign (missions) is at the end. */
(function () {
  'use strict';
  const S = {};
  const idOf = (g, u) => g.c(u).id;
  const tr = (g, u, t) => (g.d(u).tr || []).includes(t) || g.hasTrait(u, t);
  const pick = async (g, cands, title) => !cands.length ? null : cands.length === 1 ? cands[0] : await g.ask({ type: 'target', title, cands, cancelable: false });
  const yes = async (g, title) => (await g.ask({ type: 'choice', title, options: [{ id: 'y', label: '예' }, { id: 'n', label: '아니요' }] })) === 'y';
  const AOA = MC.aoa = MC.aoa || {};
  const firstCtrl = zone => ({ firstPlayerChanged(g, u, ctx) { if (g.c(u).zone === zone && g.c(u).ctrl !== ctx.first) { g.withPlayerSync(ctx.first, () => g.put(u, zone)); g.log(`${g.nm(u)}의 조종권이 ${g.playerName(ctx.first)}(으)로 넘어갑니다`, 'good'); } } });
  async function thw(g, t, n, src) { const r = await g.removeThreat(t, n, { src }); g.log(`${g.nm(t)} 위협 ${r} 제거`); await g.afterThreatRemoved(t); return r; }
  const paidWithResourceCard = g => (g.p.lastPaidCards || []).some(u => g.d(u).type === 'resource');
  const resCards = g => g.p.hand.filter(x => g.d(x).type === 'resource');
  const xmen = (g, u) => tr(g, u, 'X-MEN');

  // ======================= Bishop =======================
  const isBishop = g => ['45001a', '45001b'].includes(idOf(g, g.idt()));
  S['45001a'] = { respond: [{ window: 'tookAttackDamage', label: '에너지 흡수: 받은 피해만큼 덱 위 카드를 버리고 자원 카드는 손으로', can: (g, u, ctx) => ctx.target === g.idt() && ctx.amount > 0, async resolve(g, u, ctx) {
    let k = 0; for (let i = 0; i < ctx.amount; i++) { if (!g.p.deck.length) await g.reshuffleDeck(); const x = g.p.deck[0]; if (!x) break; if (g.d(x).type === 'resource') { g.put(x, 'hand'); k++; } else g.put(x, 'discard'); }
    g.log(`에너지 흡수: 자원 카드 ${k}장을 손으로`, 'good'); await g.window('energyAbsorption', {}); } }] };
  S['45001b'] = { respond: [{ window: 'afterChangeForm', label: '시간 이탈: 버림 더미의 [시간] 카드 1장을 손으로', can: (g, u, ctx) => ctx.form === 'alter' && g.p.discard.some(x => tr(g, x, 'TEMPORAL')), async resolve(g) { const t = await pick(g, g.p.discard.filter(x => tr(g, x, 'TEMPORAL')), '손으로 가져올 카드'); if (t) g.put(t, 'hand'); } }] };
  const readyByRes = (icon, label) => ({ actions: [{ timing: 'action', label: `자원 카드 1장 버림 → ${label} 준비 (단계당 1번)`, can: (g, u) => g.c(u).ex && resCards(g).length > 0 && !(g.p.phase.rr || []).includes(u), async use(g, u) {
    const t = await pick(g, resCards(g), '버릴 자원 카드'); if (!t) return; g.put(t, 'discard'); (g.p.phase.rr = g.p.phase.rr || []).push(u); if (g.canReady(u)) g.c(u).ex = false; if ((g.d(t).res || '').includes(icon)) g.heal(u, 1); } }] });
  S['45002'] = readyByRes('R', '맬컴'); S['45003'] = readyByRes('Y', '랜달');
  S['45004'] = { actions: [{ timing: 'hero', kind: 'attack', exhaust: true, label: '비숍의 소총: 손의 자원 카드마다 피해 1 (원거리)', can: g => resCards(g).length > 0, async use(g, u) { const t = await g.chooseTarget('attackable', '대상', g.idt(), false); if (t) await g.playerAttack(g.idt(), t, resCards(g).length, { src: u, ranged: true }); } }] }; // Bishop's Rifle
  S['45005'] = { respond: [{ window: 'energyAbsorption', exhaust: true, label: '소진 → 손의 자원 카드마다 회복 1', can: g => resCards(g).length > 0, resolve(g) { g.heal(g.idt(), resCards(g).length); } }] }; // Bishop's Uniform
  S['45006'] = { actions: [{ timing: 'action', label: '자원 카드 1장 버림 → 자원 아이콘마다 충전 카운터', can: g => resCards(g).length > 0, async use(g, u) { const t = await pick(g, resCards(g), '버릴 자원 카드'); if (!t) return; g.put(t, 'discard'); g.c(u).cnt.charge = (g.c(u).cnt.charge || 0) + (g.d(t).res || '').length; } }], // Super-Charged
    respond: [{ window: 'basicPowerUsed', timing: 'hero', label: '버리기 → 충전 카운터마다 공격 +2', can: (g, u, ctx) => ctx.kind === 'attack' && (g.c(u).cnt.charge || 0) > 0, resolve(g, u, ctx) { ctx.bonus += Math.min(6, 2 * g.c(u).cnt.charge); g.discard(u); } }] };
  S['45007'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { const r = paidWithResourceCard(g); await g.playerAttack(g.idt(), ctx.target, 6, { src: u }); if (r && g.canReady(g.idt())) g.c(g.idt()).ex = false; } } }; // Concussive Blast
  S['45008'] = { play: { timing: 'hero', label: 'thwart', target: 'thwartable', async resolve(g, u, ctx) { const r = paidWithResourceCard(g); await thw(g, ctx.target, 3, u); if (r) await g.draw(1); } } }; // Command Authority
  S['45009'] = { interrupt: { window: 'enemyAttackInitiated', timing: 'hero', label: 'defense', resolve(g, u, ctx) { const c = g.p.discard.filter(x => g.d(x).type === 'resource'); for (const x of c) g.put(x, 'deck'); g.shuffle(g.p.deck); ctx.maxDmg = 3; g.log(`에너지 변환: 자원 카드 ${c.length}장을 덱에, 이번 공격 피해 최대 3`, 'good'); } } }; // Energy Conversion
  S['45025'] = { async whenRevealed(g, u, ctx) { await g.heroObligation(u, '미래에 대한 두려움', '이 카드와 손의 자원 카드를 모두 버림', async () => { const c = resCards(g); for (const x of c) g.put(x, 'discard'); if (g.c(u).zone === 'limbo') g.discard(u); if (!c.length) ctx.surge++; }); } }; // Fear the Future
  const portal = g => g.e.sides.find(s => idOf(g, s) === '45027') || null;
  const portalOrReveal = async (g, n) => { const p = portal(g); if (p) { await g.placeThreat(p, n, {}); return; } const x = g.e.deck.concat(g.e.discard).find(y => idOf(g, y) === '45027'); if (x) { g.shuffle(g.e.deck); await g.reveal(x); } };
  S['45026'] = { on: { async afterEnemyAttack(g, u, ctx) { if (ctx.enemy === u && (ctx.damaged || []).some(x => x !== g.idt() && g.c(x).zone !== 'ally')) await portalOrReveal(g, 2); } } }; // Trevor Fitzroy
  S['45027'] = { on: { treacheryRevealing(g, u, ctx) { if (g.c(u).zone === 'side' && ctx.card && tr(g, ctx.card, 'TEMPORAL') && !g.p.phase.portalSurge) { g.p.phase.portalSurge = true; ctx.surge++; } } } }; // Portal Through Time
  S['45028'] = { async whenRevealed(g, u, ctx) { await portalOrReveal(g, 2); if (portal(g) && !g.p.phase.portalSurge) { g.p.phase.portalSurge = true; ctx.surge++; } } }; // Bantam
  S['45029'] = { async whenRevealed(g) { if (!g.p.hand.length) return; const top = Math.max(...g.p.hand.map(x => (g.d(x).res || '').length)); const t = await pick(g, g.p.hand.filter(x => (g.d(x).res || '').length === top), '버릴 카드'); g.put(t, 'discard'); // Temporal Trickery
    if (top) for (const s of g.schemes().slice()) await g.placeThreat(s, top, {}); } };

  // ======================= Magik =======================
  const top = g => g.p.deck[0] || null;
  const topHas = (g, ...rs) => { const t = top(g); return !!t && rs.some(r => (g.d(t).res || '').includes(r)); };
  AOA.topHas = topHas;
  const isMagik = g => ['45030a', '45030b'].includes(idOf(g, g.idt()));
  S['45030a'] = { showTopCard: true, // play the top card of the deck as if in hand, cost -1, once per phase
    playFromDeckTop: (g, u, t) => !g.p.phase.magikTop && g.d(t).type !== 'resource',
    costMod: (g, s, uid) => g.c(uid).zone === 'deck' && g.p.deck[0] === uid && !g.p.phase.magikTop ? 1 : 0,
    on: { cardPlayed(g, u, ctx) { if (ctx.from === 'deck') g.p.phase.magikTop = true; } } };
  S['45030b'] = { showTopCard: true, respond: [{ window: 'afterChangeForm', label: '버림 더미의 [주문]을 덱 맨 위로 (단계당 1번)', can: (g, u, ctx) => ctx.form === 'hero' && !g.p.phase.illyana && g.p.discard.some(x => tr(g, x, 'SPELL')), async resolve(g) { g.p.phase.illyana = true; const t = await pick(g, g.p.discard.filter(x => tr(g, x, 'SPELL')), '덱 맨 위에 놓을 [주문]'); if (t) g.put(t, 'deck', null, true); } }] };
  S['45031'] = { interrupt: { window: 'enemyAttackInitiated', async resolve(g, u, ctx) { await g.putAllyIntoPlay(u); if (g.c(u).zone !== 'ally') return; ctx.forceDefender = u; ctx.after.push(gg => { if (gg.c(u).zone === 'ally') gg.c(u).ex = false; }); g.log('콜로서스가 뛰어들어 방어합니다', 'good'); } } }; // Colossus (ally)
  const swapTop = async (g, why) => { if (!g.p.hand.length || !g.p.deck.length) return; const t = await pick(g, g.p.hand.slice(), `${why}: 덱 맨 위와 바꿀 손 카드`); if (!t) return; const x = g.p.deck[0]; g.put(x, 'hand'); g.put(t, 'deck', null, true); };
  S['45032'] = { on: { async villainPhaseBegins(g, u) { if (g.c(u).zone === 'support' && !g.c(u).ex && g.p.hand.length && await yes(g, '림보: 소진하고 손 카드와 덱 맨 위를 바꿀까요?')) { g.c(u).ex = true; await swapTop(g, '림보'); } } }, // Limbo
    actions: [{ timing: 'action', exhaust: true, label: '소진 → 손 카드와 덱 맨 위 카드 교체', async use(g) { await swapTop(g, '림보'); } }] };
  S['45033'] = { steadyFor: (g, s, t) => t === g.idt() && isMagik(g), mod: { thw: (g, s, t) => t === g.idt() && isMagik(g) && g.isHero() && topHas(g, 'B', 'G') ? 1 : 0 } }; // Magik's Crown
  S['45034'] = { basicAttackPlus: g => isMagik(g) ? { piercing: true } : {}, mod: { atk: (g, s, t) => t === g.idt() && isMagik(g) && g.isHero() && topHas(g, 'R', 'G') ? 1 : 0 } }; // Soulsword
  S['45035'] = { mod: { retaliate: (g, s, t) => t === g.idt() && isMagik(g) ? 1 : 0, def: (g, s, t) => t === g.idt() && isMagik(g) && g.isHero() && topHas(g, 'Y', 'G') ? 1 : 0 } }; // Mystical Armor
  S['45036'] = { play: { timing: 'action', async resolve(g) { const c = g.p.deck.slice(0, 3); if (!c.length) return; // Scrying
    const d = await pick(g, c, '점술: 뽑을 카드'); g.put(d, 'hand'); const rest = c.filter(x => x !== d); if (!rest.length) return; const x = rest.length === 1 ? null : await pick(g, rest, '점술: 버릴 카드'); if (x) g.put(x, 'discard'); g.log('점술: 1장 뽑고 1장 버리고 1장을 맨 위에'); } } };
  S['45037'] = { play: { timing: 'hero', async resolve(g, u) { if (g.canReady(g.idt())) g.c(g.idt()).ex = false; const t = await pick(g, g.p.discard.filter(x => g.d(x).cls === 'Hero' && idOf(g, x) !== '45037'), '덱 맨 위에 놓을 매직 카드'); if (t) g.put(t, 'deck', null, true); } } }; // Stepping Disc
  S['45038'] = { play: { timing: 'hero', label: 'thwart', target: 'thwartable', async resolve(g, u, ctx) { const c = topHas(g, 'B', 'G'); await thw(g, ctx.target, 4, u); if (c && g.e.villain) g.giveStatus(g.e.villain, 'conf', '퇴마'); } } }; // Exorcism
  S['45039'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { const s = topHas(g, 'R', 'G'); await g.playerAttack(g.idt(), ctx.target, 4, { src: u }); if (s && g.c(ctx.target).zone && ['villain', 'minion'].includes(g.c(ctx.target).zone)) g.giveStatus(ctx.target, 'stun', '영혼 일격'); } } }; // Soul Strike
  S['45040'] = { interrupt: { window: 'enemyAttackInitiated', timing: 'hero', label: 'defense', async resolve(g, u, ctx) { ctx.prevent3 = (ctx.prevent3 || 0) + 3; if (topHas(g, 'Y', 'G')) await g.dealDamage(ctx.enemy, 3, { src: u, byPlayer: true }); if (!g.c(ctx.enemy).zone) ctx.cancel = true; } } }; // Magic Barrier
  S['45053'] = { async whenRevealed(g, u) { await g.heroObligation(u, '다크차일드', '내 캐릭터 모두 피해 1, 이 카드 버림', async () => { for (const x of g.friendlyChars().slice()) await g.dealDamage(x, 1, {}); if (g.c(u).zone === 'limbo') g.discard(u); }); } }; // Darkchilde
  const ruler = g => g.e.sides.find(s => idOf(g, s) === '45055') || null;
  const belasco = g => g.e.minions.find(m => idOf(g, m) === '45054') || null;
  S['45054'] = { on: { enemyActivated(g, u, ctx) { if (ctx.enemy !== u) return; const r = ruler(g); for (let i = 0; i < 3 && g.p.deck.length; i++) { const x = g.p.deck[0]; if (r) { g.put(x, 'under', r); g.c(x).fd = true; } else g.put(x, 'discard'); } g.log('★ 벨라스코: 덱 위 3장', 'warn'); } } }; // Belasco
  S['45055'] = { noRemove: g => !!belasco(g), // Ruler of Limbo
    whenRevealed(g, u) { const l = g.livingPlayers().flatMap(pi => g.s.ps[pi].supports.concat(g.s.ps[pi].hand, g.s.ps[pi].deck, g.s.ps[pi].discard)).find(x => idOf(g, x) === '45032'); if (l) { g.resetCard(l); g.put(l, 'under', u); g.c(l).fd = true; g.log('림보의 지배자: 림보를 빼앗겼습니다', 'warn'); } },
    whenDefeated(g, u) { const l = g.c(u).under.find(x => idOf(g, x) === '45032'); if (l) { delete g.c(l).fd; g.withPlayerSync(g.c(l).owner != null ? g.c(l).owner : g.s.ctx, () => g.put(l, 'support')); g.log('림보를 되찾았습니다', 'good'); } } };
  S['45056'] = { async whenRevealed(g) { await g.placeThreat(ruler(g) || g.e.main, 2, {}); } }; // S'ym
  S['45057'] = { on: { async afterEnemyAttack(g, u, ctx) { if (ctx.enemy === u && (ctx.damaged || []).some(x => x !== g.idt() && g.c(x).zone !== 'ally')) await g.placeThreat(ruler(g) || g.e.main, 1, {}); } } }; // Witchfire
  S['45058'] = { async whenRevealed(g, u, ctx) { const m = g.e.minions.filter(x => tr(g, x, 'LIMBO')); if (!m.length) { ctx.surge++; return; } for (const x of m) if (g.c(x).zone === 'minion') await g.withPlayer(g.c(x).eng != null ? g.c(x).eng : g.s.ctx, () => g.activate(x, {})); }, async boostEffect(g) { if (ruler(g)) await g.placeThreat(ruler(g), 2, {}); } }; // Battle for Limbo

  // ======================= aspect / basic =======================
  S['45011'] = { respond: [{ window: 'afterAllyThwart', label: '부가 음모를 물리쳐 카드 1장', can: (g, u, ctx) => ctx.ally === u && ctx.scheme && g.c(ctx.scheme).zone !== 'side' && g.d(ctx.scheme).type === 'side', async resolve(g) { await g.draw(1); } }] }; // Cable
  S['45012'] = { respond: [{ window: 'afterAllyAttack', label: '적을 물리쳐 X-23 준비', can: (g, u, ctx) => ctx.ally === u && ctx.defeated && g.c(u).zone === 'ally', resolve(g, u) { g.c(u).ex = false; } }] }; // X-23 (ally)
  S['45014'] = { attach: { kind: 'ally', filter: (g, t) => (tr(g, t, 'X-FORCE') || xmen(g, t)) && !g.c(t).att.some(a => idOf(g, a) === '45014') } }; // Advanced Suit
  S['45015'] = { attach: { kind: 'ally', filter: (g, t) => g.d(t).cls === 'Hero' }, mod: { hp: (g, s, t) => t === g.c(s).on ? 2 : 0 }, // Sidekick
    respond: [{ window: 'afterRecover', label: '사이드킥 회복 2', can: (g, u) => g.c(g.c(u).on).dmg > 0, resolve(g, u) { g.heal(g.c(u).on, 2); } }] };
  S['45016'] = { play: { timing: 'hero', can: g => g.p.allies.some(a => g.c(a).att.some(x => idOf(g, x) === '45015')), async resolve(g) { // Side-by-Side
    const sk = g.p.allies.find(a => g.c(a).att.some(x => idOf(g, x) === '45015')); g.c(sk).ex = false; if (g.canReady(g.idt())) g.c(g.idt()).ex = false;
    if (await yes(g, '나란히: 둘 다 회복 1? (아니요: 이번 단계 저지 +1·공격 +1)')) { g.heal(sk, 1); g.heal(g.idt(), 1); } else for (const x of [sk, g.idt()]) { g.addPhaseMod(x, 'thw', 1); g.addPhaseMod(x, 'atk', 1); } } } };
  S['45017'] = { play: { timing: 'alter', async resolve(g) { await g.searchToHand(d => d.type === 'ally', '채비: 동료', { discard: true }); await g.searchToHand(d => d.type === 'upgrade' && !!(MC.scripts[d.id] || {}).attach, '채비: 동료에게 붙일 업그레이드', { discard: true }); } } }; // Suit Up
  S['45018'] = { play: { timing: 'hero', async resolve(g) { const pi = await g.choosePlayer('진두지휘: 대상 플레이어'); g.withPlayerSync(pi, () => { for (const x of g.friendlyChars()) { g.addPhaseMod(x, 'thw', 1); g.addPhaseMod(x, 'atk', 1); } }); g.log(`앞장서서(${g.playerName(pi)}): 이번 단계 저지 +1·공격 +1`, 'good'); } } }; // Lead from the Front
  S['45020'] = { respond: [{ window: 'afterAllyAttack', label: '★ 덱 맨 위 버림 → 자원에 따른 효과', can: (g, u, ctx) => ctx.ally === u, async resolve(g, u) { await legion(g, u); } }, { window: 'afterAllyThwart', label: '★ 덱 맨 위 버림 → 자원에 따른 효과', can: (g, u, ctx) => ctx.ally === u, async resolve(g, u) { await legion(g, u); } }] }; // Legion
  async function legion(g, u) { if (!g.p.deck.length) await g.reshuffleDeck(); const x = g.p.deck[0]; if (!x) return; g.put(x, 'discard'); for (let k of (g.d(x).res || '').split('')) {
    if (k === 'G') k = await g.ask({ type: 'choice', title: '레기온: [와일드]', options: [{ id: 'Y', label: '적에게 피해 2' }, { id: 'B', label: '위협 2 제거' }, { id: 'R', label: '캐릭터 회복 2' }] });
    if (k === 'Y') { const t = await g.chooseTarget('enemy', '레기온: 피해 2', u, false); if (t) await g.dealDamage(t, 2, { src: u, byPlayer: true }); } else if (k === 'B') await g.removeThreatChoose(2, '레기온: 위협 2', u); else if (k === 'R') { const t = await pick(g, g.allFriendlyChars().filter(c => g.c(c).dmg > 0), '레기온: 회복 2'); if (t) g.heal(t, 2); } } }
  S['45021'] = { canPlay: g => tr(g, g.idt(), 'X-FORCE') || xmen(g, g.idt()), async onEnter(g, u) { const t = await g.chooseTarget('enemy', '마로우: 피해 2를 줄 적', u, false); if (t) await g.dealDamage(t, 2, { src: u, byPlayer: true }); } }; // Marrow
  S['45041'] = { respond: [{ window: 'allyPowerUsed', label: '★ 덱 위 최대 3장 버림 → 장수만큼 공격 +', can: (g, u, ctx) => ctx.ally === u && ctx.kind === 'attack', async resolve(g, u, ctx) { const n = +(await g.ask({ type: 'choice', title: '골드볼: 버릴 장수', options: [3, 2, 1, 0].map(k => ({ id: String(k), label: `${k}장` })) })) || 0; let k = 0; for (let i = 0; i < n && g.p.deck.length; i++) { g.put(g.p.deck[0], 'discard'); k++; } ctx.bonus += k; } }] }; // Goldballs
  S['45042'] = { canPlay: g => xmen(g, g.idt()), respond: [{ window: 'enemyWouldActivate', label: '템퍼스 버림 → 빌런의 음모 활성화 취소', can: (g, u, ctx) => ctx.kind === 'scheme' && g.d(ctx.enemy).type === 'villain' && g.c(u).zone === 'ally', resolve(g, u, ctx) { g.discard(u); ctx.cancel = true; const x = g.takeEncounter(); if (x) g.put(x, 'facedown'); } }] }; // Tempus
  S['45043'] = { respond: [{ window: 'afterAttackDefeat', exhaust: true, label: '소진·피해 1 → 카드 1장', can: (g, u, ctx) => ctx.attacker === g.idt(), async resolve(g) { await g.dealDamage(g.idt(), 1, {}); await g.draw(1); } }] }; // Blood Rage
  S['45044'] = { respond: [{ window: 'cardPlayedDone', label: '시험 카운터 1', can: (g, u, ctx) => ctx.card && g.d(ctx.card).type === 'event' && tr(g, ctx.card, 'ATTACK'), async resolve(g, u) { g.c(u).cnt.test = (g.c(u).cnt.test || 0) + 1; if (g.c(u).cnt.test >= 5) { g.discard(u); const t = await g.chooseTarget('enemy', '방어 시험: 피해 5', g.idt(), false); if (t) await g.dealDamage(t, 5, { byPlayer: true }); } } }] }; // Test the Defense
  S['45045'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { await g.playerAttack(g.idt(), ctx.target, 8, { src: u, overkill: g.hpLeft(g.idt()) < g.maxHp(g.idt()) / 2 }); } } }; // Full-Body Charge
  S['45048'] = { async onEnter(g) { const t = await pick(g, g.allFriendlyChars().filter(x => xmen(g, x) && g.c(x).dmg > 0), '트리아지: 회복 2'); if (t) g.heal(t, 2); } }; // Triage
  S['45049'] = { canPlay: g => xmen(g, g.idt()), respond: [{ window: 'cardRevealed', exhaust: true, label: '사이 카운터 1 → 그 배반 카드 취소', can: (g, u, ctx) => g.d(ctx.card).type === 'treachery' && (g.c(u).cnt.psi || 0) > 0 && !ctx.cancelAll, // Stepford Cuckoos
    resolve(g, u, ctx) { g.c(u).cnt.psi--; ctx.cancelAll = true; g.cleanupUses(u); } }] };
  S['45050'] = { canPlay: g => tr(g, g.idt(), 'MYSTIC'), resources: [{ gen: 'G', label: '블러드젬 (피해 2)', can: (g, u) => !g.c(u).ex, use: (g, u) => { g.c(u).ex = true; g.c(g.idt()).dmg += 2; g.e.needDefeatCheck = true; } }] }; // Bloodgem
  S['45051'] = { play: { timing: 'hero', can: g => tr(g, g.idt(), 'MYSTIC'), async resolve(g, u) { const o = await g.ask({ type: 'choice', title: '기본 주문: 하나를 고르세요', options: [{ id: 'h', label: '정체성 회복 3' }, { id: 't', label: '위협 3 제거' }, { id: 'd', label: '적에게 피해 3' }] }); // Basic Spell
    if (o === 'h') g.heal(g.idt(), 3); else if (o === 't') await g.removeThreatChoose(3, '기본 주문', u); else { const t = await g.chooseTarget('enemy', '피해 3', g.idt(), false); if (t) await g.dealDamage(t, 3, { src: u, byPlayer: true }); } } } };
  S['45052'] = { play: { timing: 'action', can: g => tr(g, g.idt(), 'MYSTIC'), async resolve(g) { await g.draw(2); const t = await pick(g, g.p.hand.slice(), '영적 명상: 버릴 카드'); if (t) g.put(t, 'discard'); } } }; // Spiritual Meditation

  // ======================= shared encounter helpers =======================
  const fd = (g, n) => { for (let i = 0; i < (n || 1); i++) { const x = g.takeEncounter(); if (x) g.put(x, 'facedown'); } };
  const fdEach = (g, n) => g.forEachPlayer(() => fd(g, n));
  const discardTopDeck = async (g, n) => { const out = []; for (let i = 0; i < n; i++) { if (!g.p.deck.length) await g.reshuffleDeck(); const x = g.p.deck[0]; if (!x) break; g.put(x, 'discard'); out.push(x); } if (out.length) g.log(`덱 위 ${out.length}장 버림`); return out; };
  async function encDiscardUntil(g, pred, why) { // discard encounter cards from the top until one matches; returns it (in the encounter discard)
    for (let i = 0; i < 200; i++) { const x = g.takeEncounter(); if (!x) return null; g.put(x, 'ediscard'); if (pred(g.d(x), x)) { g.log(`${why}: ${g.nm(x)}`, 'warn'); return x; } }
    return null;
  }
  AOA.encDiscardUntil = encDiscardUntil; AOA.fd = fd; AOA.discardTopDeck = discardTopDeck;
  const findEnc = (g, id) => g.e.deck.concat(g.e.discard, g.e.aside || []).find(x => idOf(g, x) === id) || null;
  const discardUpOrSup = async (g, why) => { const c = g.p.upgrades.concat(g.p.supports).filter(x => !g.d(x).permanent); const t = await pick(g, c, `${why}: 버릴 업그레이드 또는 지원`); if (t) g.discard(t, `${g.nm(t)} 버림`); };
  const giveTough = (g, u, why) => { if (u && g.c(u).zone) g.giveStatus(u, 'tough', why); };
  const stunMe = async (g, why) => { if (g.c(g.idt()).stun) await g.dealDamage(g.idt(), 2, {}); else g.giveStatus(g.idt(), 'stun', why); };
  const villainArmor = (req, label) => [{ window: 'afterBasicAttack', timing: 'hero', label: `${label} → 이 카드 버림`, cost: { n: req.length, req }, can: (g, u, ctx) => g.c(u).zone === 'attach' && ctx.target === g.c(u).on, resolve(g, u) { g.discard(u, `${g.nm(u)} 버림`); } }];
  const boostAttachTo = host => ({ boostEffect(g, u, ctx) { (ctx.post || ctx.after).push(async gg => { const h = host(gg); if (h && ['boost', 'ediscard'].includes(gg.c(u).zone)) gg.attachEnc(u, h); }); } });

  // ======================= Unus / Infinites =======================
  const genePool = g => g.e.sides.find(s => idOf(g, s) === '45071') || null;
  const gp = g => { const s = genePool(g); return s ? g.c(s).threat : 0; };
  const toGP = async (g, n) => { const s = genePool(g); if (s) await g.placeThreat(s, n, {}); };
  AOA.gp = gp; AOA.toGP = toGP;
  const unus = g => g.e.villain && /^4506[01]$|^45059$/.test(idOf(g, g.e.villain)) ? g.e.villain : null;
  const unusV = { mod: { retaliate: (g, s, t) => t === s && gp(g) >= 3 ? 1 : 0 }, stalwartFor: (g, s, t) => t === s && gp(g) >= 6, icons: (g, u) => gp(g) >= 9 ? { amplify: 1 } : null };
  S['45059'] = unusV; S['45060'] = unusV; S['45061'] = unusV;
  S['45062b'] = { on: { async mainStep1(g, u) { if (u === g.e.main) await toGP(g, 1); } } }; // Hunting Gene Traitors
  S['45063'] = { attachTo: g => unus(g) || g.e.villain, // Prelate Sidearm
    on: { async afterEnemyAttack(g, u, ctx) { if (g.c(u).zone === 'attach' && ctx.enemy === g.c(u).on && (ctx.damaged || []).some(x => x !== g.idt() && g.c(x).zone !== 'ally')) await toGP(g, 1); } },
    respond: villainArmor('YR', '[에너지][물리]') };
  S['45064'] = { attachTo: g => unus(g) || g.e.villain, // Prelate Armor
    on: { afterEnemyScheme(g, u, ctx) { if (g.c(u).zone === 'attach' && ctx.enemy === g.c(u).on) giveTough(g, ctx.enemy, '프렐레이트 갑옷'); } },
    respond: villainArmor('BR', '[정신][물리]') };
  S['45065'] = { async whenRevealed(g, u) { const t = await pick(g, g.p.allies.slice(), '인피니트 사냥꾼: 피해 3을 받을 동료'); if (t) await g.dealDamage(t, 3, {}); }, // Infinite Hunter
    async boostEffect(g) { const o = await g.ask({ type: 'choice', title: '★ 인피니트 사냥꾼', options: [{ id: 'gp', label: '유전자 풀에 위협 2' }, { id: 'atk', label: '이번 활성화 계략·공격 +2' }] }); if (o === 'gp') { await toGP(g, 2); return 0; } return 2; } };
  const infiniteMinion = g => g.e.minions.filter(m => tr(g, m, 'INFINITE'));
  S['45066'] = { revealFirst: true, mod: { hp: (g, s, t) => t === g.c(s).on ? 2 : 0 }, // Genetic Experiments
    async whenRevealed(g, u, ctx) { const t = await pick(g, infiniteMinion(g), '유전자 실험을 붙일 [인피니트] 하수인'); if (t) g.attachEnc(u, t); else { g.discard(u); ctx.surge++; } },
    on: { async attachedDefeated(g) { await toGP(g, 2); } },
    boostEffect(g, u, ctx) { (ctx.post || ctx.after).push(async gg => { const t = await pick(gg, infiniteMinion(gg), '★ 유전자 실험을 붙일 하수인'); if (t && ['boost', 'ediscard'].includes(gg.c(u).zone)) gg.attachEnc(u, t); }); } };
  S['45067'] = { async whenRevealed(g) { const v = unus(g) || g.e.villain; if (!v) return; const n = gp(g); if (n >= 3) giveTough(g, v, '인피니트 프렐레이트'); if (n >= 6) g.heal(v, 3); if (n >= 9) g.c(v).fdBoost = (g.c(v).fdBoost || 0) + 1; await g.activate(v, {}); } }; // Infinite Prelate
  S['45068'] = { async whenDefeated(g) { await toGP(g, 3); } }; // Endless Ranks
  S['45069'] = { grantKw: (g, s, t) => t === s && gp(g) >= 3 ? ['quickstrike'] : null, mod: { hp: (g, s, t) => t === s && gp(g) >= 9 ? 3 : 0 }, whenRevealed(g, u, ctx) { if (gp(g) >= 6) ctx.surge++; } }; // Infinite Soldier
  S['45070'] = { async whenRevealed(g) { await toGP(g, 4); }, async boostEffect(g) { await toGP(g, 2); } }; // Culling the Weak
  S['45071'] = { cannotLeave: () => true, on: { async allyDefeated(g, u, ctx) { if (!ctx.consequential && g.c(u).zone === 'side') { g.log('유전자 풀: 동료가 격파되어 위협 3', 'warn'); await g.placeThreat(u, 3, {}); } } } }; // Gene Pool

  // ======================= Dystopian Nightmare =======================
  S['45072'] = { whenRevealed(g, u) { g.put(u, 'pobl'); g.log('사냥감: 계속 남습니다 (위험 아이콘)', 'warn'); }, hazardBonus: (g, u) => g.c(u).zone === 'pobl' ? 1 : 0, // Hunted
    actions: [{ timing: 'alter', label: '손 카드 1장 버림 → 사냥감 버림', can: (g, u) => g.c(u).zone === 'pobl' && g.p.hand.length > 0, async use(g, u) { const t = await pick(g, g.p.hand.slice(), '버릴 카드'); if (!t) return; g.put(t, 'discard'); g.discard(u); } }] };
  S['45073'] = { async whenRevealed(g) { await stunMe(g, '전쟁 피로'); }, async boostEffect(g) { await stunMe(g, '★ 전쟁 피로'); } }; // War-Weary
  S['45074'] = { whenDefeated(g) { g.giveStatus(g.idt(), 'conf', '절멸 대상'); } }; // Targeted for Extermination

  // ======================= Standard III =======================
  const pursued = g => (g.e.env || []).find(x => ['45075a', '45075b'].includes(idOf(g, x))) || null;
  const myNemesisIds = g => { const H = MC.heroes[g.p.heroKey || g.s.heroKey] || {}; return H.nemesis || []; };
  const nemesisMinions = g => { const ids = myNemesisIds(g); return g.e.minions.filter(m => g.d(m).nemesis && (g.c(m).owner === g.s.ctx || ids.includes(idOf(g, m)))); };
  async function pursue(g, n) {
    const p = pursued(g); if (!p || n <= 0) return;
    const c = g.c(p); c.cnt.pursuit = (c.cnt.pursuit || 0) + n; g.log(`과거의 추격: 추격 카운터 ${n} (총 ${c.cnt.pursuit})`, 'warn');
    if (c.cnt.pursuit < 3 + g.players) return;
    c.cnt.pursuit = 0;
    const nm = nemesisMinions(g);
    if (nm.length) { for (const m of nm) if (g.c(m).zone === 'minion') await g.activate(m, {}); return; }
    g.log('과거의 추격: 카드를 뒤집습니다 — 숙적이 나타납니다!', 'warn'); c.id = '45075b';
    const nids = myNemesisIds(g);
    const set = g.e.setaside.filter(x => g.c(x).owner === g.s.ctx || nids.includes(idOf(g, x)));
    const mins = set.filter(x => g.d(x).type === 'minion' && g.d(x).nemesis);
    const found = mins.length ? mins : g.e.deck.concat(g.e.discard).filter(x => g.d(x).type === 'minion' && g.d(x).nemesis && (g.c(x).owner === g.s.ctx || nids.includes(idOf(g, x))));
    for (const m of found) { await g.show({ type: 'reveal', uid: m, title: '숙적 등장' }); await g.enterMinion(m, {}); }
    for (const s of set.filter(x => g.d(x).type === 'side')) { await g.show({ type: 'reveal', uid: s, title: '숙적 음모' }); await g.enterSide(s, {}); }
    for (const x of set) g.put(x, 'edeck'); g.shuffle(g.e.deck);
    if (g.c(p).zone) c.id = '45075a';
  }
  AOA.pursue = pursue;
  const counters = g => { const p = pursued(g); return p ? (g.c(p).cnt.pursuit || 0) : 0; };
  const pursueAfter = { boostEffect(g, u, ctx) { (ctx.post || ctx.after).push(async gg => { await pursue(gg, 1); }); } };
  S['45075a'] = { permanent: true, cannotLeave: () => true }; S['45075b'] = S['45075a'];
  S['45076'] = Object.assign({ async whenRevealed(g) { await pursue(g, 1); if (counters(g) > 0 && g.e.villain) await g.enemyScheme(g.e.villain, {}); } }, pursueAfter); // Dark Design
  S['45077'] = { async whenRevealed(g, u, ctx) { await pursue(g, 1); if (counters(g) <= 0) return; if (g.isHero()) { if (g.e.villain) await g.enemyAttack(g.e.villain, {}); } else ctx.surge++; } }; // Sinister Strike
  S['45078'] = Object.assign({ async whenRevealed(g) { const nm = nemesisMinions(g); for (const m of nm) if (g.c(m).zone === 'minion') await g.activate(m, {}); if (!nm.length) await pursue(g, 3); } }, pursueAfter); // Evil Alliance
  S['45079'] = Object.assign({ async whenRevealed(g) { await pursue(g, 1); if (counters(g) > 0) await discardUpOrSup(g, '어디도 안전하지 않다'); } }, pursueAfter); // Nowhere is Safe
  S['45080'] = { whenRevealed(g, u) { g.put(u, 'pobl'); g.log('다가오는 위협: 계속 남습니다', 'warn'); }, // Drawing Near
    on: { async turnBegins(g, u) { if (g.c(u).zone !== 'pobl') return; const x = (await discardTopDeck(g, 1))[0]; if (x) await pursue(g, (g.d(x).res || '').length); } },
    actions: [{ timing: 'alter', label: '정체성 전용 카드 1장 버림 → 이 카드 버림', can: (g, u) => g.c(u).zone === 'pobl' && g.p.hand.some(x => g.d(x).cls === 'Hero'), async use(g, u) { const t = await pick(g, g.p.hand.filter(x => g.d(x).cls === 'Hero'), '버릴 정체성 전용 카드'); if (!t) return; g.put(t, 'discard'); g.discard(u); } }] };

  // ======================= The Four Horsemen =======================
  const HORSE = ['45081', '45082', '45083', '45084'];
  const horseOf = (g, v) => HORSE.find(h => idOf(g, v).startsWith(h)) || null;
  const horsemen = g => (g.e.villains || []).filter(v => horseOf(g, v));
  const horseNamed = (g, h) => horsemen(g).find(v => horseOf(g, v) === h) || null;
  const propped = (g, v) => g.c(v).att.some(a => ['45090', '45091'].includes(idOf(g, a))); // Golden Horse / Metal Wings: "considered to have at least 1 hit point"
  const alive = (g, v) => g.hpLeft(v) >= 1 || propped(g, v);
  function setActive(g, v) { g.e.villain = v || null; if (v) g.log(`활성 카운터 → ${g.nm(v)}`, 'warn'); }
  function nextHorse(g) { const vs = g.e.villains || []; if (!vs.length) return; const i = vs.indexOf(g.e.villain); setActive(g, vs[(i + 1) % vs.length]); }
  const FX = {
    '45081': async g => discardUpOrSup(g, '★ 전쟁'),
    '45082': async g => { await discardTopDeck(g, 10); g.log('★ 기근: 덱 위 10장 버림', 'warn'); },
    '45083': async g => { g.p.blankUntilVP = true; g.log('★ 역병: 다음 빌런 단계까지 정체성 텍스트가 없는 것으로 취급', 'warn'); },
    '45084': async g => { for (const x of g.friendlyChars().slice()) await g.dealDamage(x, 1, {}); g.log('★ 죽음: 내 캐릭터 모두 피해 1', 'warn'); },
  };
  AOA.horseFX = FX;
  const horseman = h => ({
    on: { async afterEnemyAttack(g, u, ctx) { if (ctx.enemy === u && alive(g, u)) await FX[h](g); } },
    wouldBeDefeated(g, u, w) { if (horsemen(g).some(v => v !== u && alive(g, v)) || propped(g, u)) { w.saved = true; g.c(u).dmg = g.maxHp(u); if ('exact' in w) g.log(`${g.nm(u)}: 다른 기사가 체력 1 이상이라 격파되지 않습니다`); } },
    async whenDefeatedVillain(g, u) { for (const a of g.c(u).att.slice()) g.discard(a); g.win('묵시록의 네 기사를 모두 물리쳤습니다'); return 'handled'; },
  });
  for (const h of HORSE) { S[h + 'a'] = horseman(h); S[h + 'b'] = horseman(h); }
  S['45085a'] = { async setup(g) { // The Horsemen of Apocalypse: all four villains in play in a random order, a random Horsemen side scheme
    g.e.villains = g.e.villains || [];
    const vs = (g.e.aside || []).filter(x => horseOf(g, x)); g.shuffle(vs);
    for (const v of vs) { if (g.s.scen.expert) g.c(v).id = horseOf(g, v) + 'b'; g.resetCard(v); g.put(v, 'villain'); g.log(`${g.nm(v)} 등장`, 'warn'); }
    setActive(g, g.e.villains[0]);
    await g.forEachPlayer(async () => { const sides = g.e.deck.filter(x => ['45086', '45087', '45088', '45089'].includes(idOf(g, x))); if (sides.length) { const s = sides[Math.floor(g.rand() * sides.length)]; await g.show({ type: 'reveal', uid: s, title: '부가 음모' }); await g.enterSide(s, {}); } }); g.shuffle(g.e.deck);
  } };
  S['45085b'] = { on: { enemyActivated(g, u, ctx) { if (u === g.e.main && horseOf(g, ctx.enemy)) nextHorse(g); } } };
  S['45086'] = { async whenDefeated(g) { await discardUpOrSup(g, '전쟁의 참화'); } };
  S['45087'] = { async whenDefeated(g) { await discardTopDeck(g, 10); } };
  S['45088'] = { whenDefeated(g) { g.p.blankUntilVP = true; g.log('역병과 전염병: 다음 빌런 단계까지 정체성 텍스트 없음', 'warn'); } };
  S['45089'] = { async whenDefeated(g) { for (const x of g.friendlyChars().slice()) await g.dealDamage(x, 1, {}); } };
  const horseAttResp = [{ window: 'heroAttacked', timing: 'hero', label: '기사의 강제 반응을 처리 → 이 카드 버림', can: (g, u, ctx) => g.c(u).zone === 'attach' && ctx.target === g.c(u).on, async resolve(g, u) { const v = g.c(u).on; const h = horseOf(g, v); g.discard(u, `${g.nm(u)} 버림`); if (h) await FX[h](g); g.e.needDefeatCheck = true; } }];
  S['45090'] = { attachTo(g) { const c = horsemen(g).filter(v => !g.hasTrait(v, 'AERIAL')); if (!c.length) return g.e.villain; const lo = Math.min(...c.map(v => g.hpLeft(v))); return c.find(v => g.hpLeft(v) === lo); }, // Golden Horse
    grantTrait: (g, s, t) => g.c(s).zone === 'attach' && t === g.c(s).on ? 'AERIAL' : null, respond: horseAttResp };
  S['45091'] = { attachTo(g) { const d = horseNamed(g, '45084'); if (d) setActive(g, d); return d || g.e.villain; }, mod: { retaliate: (g, s, t) => g.c(s).zone === 'attach' && t === g.c(s).on ? 1 : 0 }, respond: horseAttResp }; // Metal Wings
  const horsemanOf = h => ({ async whenRevealed(g) { const v = horseNamed(g, h); if (!v) return; g.heal(v, 2); giveTough(g, v, g.nm(v)); await g.activate(v, {}); },
    boostEffect(g, u, ctx) { (ctx.post || ctx.after).push(async gg => { const v = horseNamed(gg, h); if (v) await gg.activate(v, { noBoost: true }); }); } });
  S['45092'] = horsemanOf('45081'); S['45093'] = horsemanOf('45082'); S['45094'] = horsemanOf('45083'); S['45095'] = horsemanOf('45084');
  S['45096'] = { async whenRevealed(g) { const a = g.e.villain; if (!a) return; const h = horseOf(g, a); if (h) await FX[h](g); nextHorse(g); const b = g.e.villain; const h2 = b && horseOf(g, b); if (h2) await FX[h2](g); } }; // Rough Riders

  // ======================= Hounds =======================
  const hounds = g => g.e.sides.find(s => idOf(g, s) === '45100') || null;
  S['45097'] = { async whenRevealed(g) { const r = hounds(g); if (r) { await g.placeThreat(r, 3, {}); return; } const x = findEnc(g, '45100'); if (x) { g.shuffle(g.e.deck); await g.reveal(x); } } }; // Ahab
  S['45098'] = { async whenRevealed(g, u, ctx) { // Hound
    { const k = g.s.round + ':' + g.s.phase; if (hounds(g) && g.e.houndSurge !== k) { g.e.houndSurge = k; ctx.surge++; } } // the first Hound each phase surges
    if (g.isHero()) await g.enemyAttack(u, {}); else if (!g.formLocked()) { await g.changeForm(true); g.log('사냥개: 히어로 모습으로 변신합니다', 'warn'); } } };
  S['45099'] = { attachTo: g => g.e.minions.find(m => idOf(g, m) === '45097') || g.e.villain, // Ahab's Energy Spear
    on: { hostWouldAttack(g, u, ctx) { ctx.overkill = true; ctx.piercing = true; ctx.after.push(async gg => { if (gg.c(u).zone === 'attach') gg.discard(u, '아합의 에너지 창 버림'); }); } } };
  S['45100'] = { whenDefeated(g) { const h = g.e.deck.concat(g.e.discard).find(u => idOf(g, u) === '45098'); if (h) { g.put(h, 'facedown'); g.log('사냥개를 풀어라 격파: 사냥개를 뒷면 조우 카드로 받습니다', 'warn'); } } }; // Release the Hounds (the surge is on Hound)
  S['45100'].whenDefeated = async g => { const h = g.e.deck.concat(g.e.discard).find(x => idOf(g, x) === '45098'); if (h) { g.put(h, 'facedown'); g.shuffle(g.e.deck); g.log('사냥개 풀어놓기: 사냥개를 뒷면 조우 카드로 받습니다', 'warn'); } };

  // ======================= Apocalypse =======================
  const APO = ['45101a', '45101b', '45102a', '45102b'];
  const apoc = g => (g.e.villain && (APO.includes(idOf(g, g.e.villain)) || /^4518[4-6]/.test(idOf(g, g.e.villain)))) ? g.e.villain : null;
  const prelates = g => g.e.minions.filter(m => tr(g, m, 'PRELATE'));
  const worthy = g => { const a = apoc(g); return !!a && g.c(a).att.some(x => idOf(g, x) === '45105b'); };
  async function revealPrelate(g) { const c = (g.e.aside || []).filter(x => g.d(x).type === 'minion' && tr(g, x, 'PRELATE')); if (!c.length) return; const m = c[Math.floor(g.rand() * c.length)]; await g.show({ type: 'reveal', uid: m, title: '프렐레이트 등장' }); await g.enterMinion(m, {}); }
  const apocVillain = { // the main scheme's interrupt: Apocalypse is never defeated until No Longer Worthy is attached
    wouldBeDefeated(g, u, w) { if (worthy(g)) return; w.saved = true; for (const a of g.c(u).att.slice()) g.discard(a); g.c(u).dmg = 0; const x = g.d(u).hp || 0; const m = g.e.main; const r = Math.min(x, g.c(m).threat); g.c(m).threat -= r; g.log(`묵시록의 시대: 아포칼립스가 쓰러지는 대신 모든 피해를 회복하고 부착 카드를 버립니다. 주 음모 위협 ${r} 제거`, 'warn'); },
    async whenDefeatedVillain(g) { g.win('아포칼립스를 물리쳤습니다'); return 'handled'; } };
  for (const id of APO) S[id] = Object.assign({}, apocVillain);
  S['45102b'] = Object.assign({}, apocVillain, { attackProps: () => ({ overkill: true }) });
  S['45103a'] = { async setup(g) { // The Age of Apocalypse: Heart of the Empire, Prelates set aside, one revealed
    const h = (g.e.aside || []).find(x => idOf(g, x) === '45104a'); if (h) await g.enterSide(h, {});
    for (const x of g.e.deck.slice()) if (g.d(x).type === 'minion' && tr(g, x, 'PRELATE')) g.put(x, 'aside');
    await g.withPlayer(g.s.first, () => revealPrelate(g));
  } };
  S['45103b'] = { targetFn: g => { const a = apoc(g); return a ? (g.d(a).hp || 0) * g.players : 0; },
    async whenCompleted(g, m) { // Apocalypse's interrupt: clear the scheme and move to the next stage; at stage IV the players lose
      const v = apoc(g); if (!v) return; const id = idOf(g, v);
      if (id === '45102b') return; // the players lose
      g.c(m).threat = 0;
      const c = g.c(v);
      if (id === '45101b') { for (const a of c.att.slice()) g.discard(a); c.id = '45102a'; c.dmg = 0; c.stun = false; c.conf = false; c.tough = !!g.d(v).toughness; }
      else { c.id = id === '45101a' ? '45101b' : '45102b'; }
      g.log(`주 음모 완료: 아포칼립스가 ${g.romanStage(g.d(v).stage)}단계로 강해집니다. 주 음모의 위협을 모두 제거합니다`, 'warn');
      await g.show({ type: 'reveal', uid: v, title: '아포칼립스 진화' });
      return 'handled';
    } };
  const empire = next => ({ noRemove: g => prelates(g).length > 0, async whenDefeated(g, u) { await g.withPlayer(g.s.first, () => revealPrelate(g)); for (const pi of g.livingPlayers()) if (pi !== g.s.first) g.withPlayerSync(pi, () => fd(g, 1)); return next(g, u); } });
  S['45104a'] = empire(async (g, u) => { const c = g.c(u); c.id = '45104b'; c.threat = (g.d(u).start || 0); g.log('제국의 심장 → 우뚝 솟은 성채', 'warn'); return 'handled'; });
  S['45104b'] = empire(async (g, u) => { g.removeFromGame(u); const t = (g.e.aside || []).find(x => idOf(g, x) === '45105a'); if (t) await g.enterSide(t, {}); return 'handled'; });
  S['45105a'] = empire(async (g, u) => { const a = apoc(g); g.c(u).id = '45105b'; if (a) { g.attachEnc(u, a); g.heal(a, 5 * g.players); g.log('더 이상 가치 없는 자: 이제 아포칼립스를 쓰러뜨리면 승리합니다', 'good'); } else g.removeFromGame(u); return 'handled'; });
  S['45105b'] = { shieldsFromDamage: (g, s, t) => g.c(s).zone === 'attach' && t === g.c(s).on && prelates(g).length > 0 }; // No Longer Worthy
  const apocAtt = extra => Object.assign({ attachTo: g => apoc(g) || g.e.villain }, boostAttachTo(g => apoc(g) || g.e.villain), extra);
  S['45106'] = apocAtt({ on: { async afterEnemyScheme(g, u, ctx) { if (g.c(u).zone === 'attach' && ctx.enemy === g.c(u).on) for (const s of g.e.sides.slice()) await g.placeThreat(s, 1, {}); } } }); // Cyberpathy
  S['45107'] = apocAtt({ attackProps: (g, s, ctx) => g.c(s).zone === 'attach' && ctx.enemy === g.c(s).on ? { overkill: true } : null }); // Biomorphing
  S['45108'] = apocAtt({ grantStalwart: true, mod: { retaliate: (g, s, t) => g.c(s).zone === 'attach' && t === g.c(s).on ? 1 : 0 } }); // Molecular Control
  S['45109'] = { revealFirst: true, mod: { hp: (g, s, t) => g.c(s).zone === 'attach' && t === g.c(s).on ? 5 : 0 }, // The Fittest
    async whenRevealed(g, u, ctx) { const ms = g.e.minions; if (!ms.length) { g.discard(u); ctx.surge++; return; } const hi = Math.max(...ms.map(m => g.d(m).hp || 0)); const t = await pick(g, ms.filter(m => (g.d(m).hp || 0) === hi), '최적자를 붙일 하수인'); g.attachEnc(u, t); giveTough(g, t, '최적자'); } };
  S['45110'] = { async whenRevealed(g) { const p = prelates(g)[0]; const t = p || apoc(g) || g.e.villain; if (t) await g.activate(t, {}); }, boostEffect(g) { giveTough(g, prelates(g)[0] || apoc(g) || g.e.villain, '★ 양 떼 속의 늑대'); } }; // Wolf Among Sheep
  S['45111'] = { whenDefeated(g) { const a = apoc(g); const x = a ? g.d(a).hp || 0 : 0; for (let i = 0; i < x; i++) { const y = g.takeEncounter(); if (y) g.put(y, 'ediscard'); } g.log(`아포칼립스 해결책: 조우 덱 위 ${x}장 버림`); } };
  // Prelates (scenario side of the double-faced campaign minions)
  S['45180b'] = { on: { async afterEnemyAttack(g, u, ctx) { if (ctx.enemy !== u) return; const al = g.p.allies.filter(a => g.c(a).zone === 'ally'); if (!al.length) return; // The Shadow King
    const hi = Math.max(...al.map(a => g.stat(a, 'thw'))); const t = await pick(g, al.filter(a => g.stat(a, 'thw') === hi), '★ 섀도 킹: 저지가 가장 높은 동료');
    const o = await g.ask({ type: 'choice', title: `★ 섀도 킹: ${g.nm(t)}`, options: [{ id: 'd', label: `${g.nm(t)} 버림` }, { id: 't', label: `주 음모에 위협 ${hi}` }] });
    if (o === 'd') g.discard(t, `${g.nm(t)} 버림`); else await g.placeThreat(g.e.main, hi, {}); } } };
  S['45181b'] = { mod: { hp: (g, s, t) => t === s ? 2 * g.c(s).under.length : 0 }, on: { enemyActivated(g, u, ctx) { if (ctx.enemy !== u || !g.p.deck.length) return; const x = g.p.deck[0]; g.put(x, 'under', u); g.c(x).fd = true; g.log('★ 어비스: 덱 맨 위 카드를 뒷면으로 붙입니다', 'warn'); } } }; // Abyss
  S['45182b'] = { attackProps: (g, s, ctx) => ctx.enemy === s ? { piercing: true } : null, on: { afterEnemyAttack(g, u, ctx) { if (ctx.enemy === u && (ctx.damaged || []).some(x => x !== g.idt() && g.c(x).zone !== 'ally')) { g.heal(u, 5); g.log('★ 슈가 맨: 회복 5'); } } } }; // Sugar Man
  S['45183b'] = { async onAttackStart(g) { await g.dealDamage(g.idt(), 1, {}); g.log('★ 미하일 라스푸틴: 정체성 피해 1', 'warn'); } }; // Mikhail Rasputin

  // ======================= Dark Riders =======================
  const riders = g => g.e.minions.filter(m => tr(g, m, 'DARK RIDERS'));
  S['45112'] = { on: { async afterEnemyAttack(g, u, ctx) { if (ctx.enemy !== u) return; const t = await pick(g, g.p.upgrades.filter(x => !g.d(x).permanent), '★ 건틀렛: 버릴 업그레이드'); if (t) g.discard(t, `${g.nm(t)} 버림`); } } }; // Gauntlet
  S['45113'] = { on: { async afterEnemyAttack(g, u, ctx) { if (ctx.enemy === u) for (const x of g.friendlyChars().slice()) await g.dealDamage(x, 1, {}); } } }; // Barrage
  S['45114'] = { on: { async afterEnemyAttack(g, u, ctx) { if (ctx.enemy === u) for (const s of g.schemes().slice()) await g.placeThreat(s, 1, {}); } } }; // Hard-Drive
  S['45115'] = { on: { afterEnemyAttack(g, u, ctx) { if (ctx.enemy === u) g.giveStatus(g.idt(), 'stun', '★ 터스크'); } }, boostEffect(g) { g.giveStatus(g.idt(), 'stun', '★ 터스크'); } }; // Tusk
  S['45116'] = { on: { afterEnemyAttack(g, u, ctx) { if (ctx.enemy === u) g.giveStatus(g.idt(), 'conf', '★ 사이냅스'); } }, boostEffect(g) { g.giveStatus(g.idt(), 'conf', '★ 사이냅스'); } }; // Psynapse
  S['45117'] = { grantKw: (g, s, t) => g.c(s).zone === 'side' && tr(g, t, 'DARK RIDERS') ? ['toughness'] : null, // The Dark Riders
    async whenRevealed(g) { const m = await encDiscardUntil(g, d => d.type === 'minion' && (d.tr || []).includes('DARK RIDERS'), '다크 라이더즈'); if (m) await g.reveal(m); } };

  // ======================= Dark Beast and the Settings =======================
  const SETTINGS = { savage_land: '45127', genosha: '45133', blue_moon: '45139' };
  const setting = g => (g.e.env || []).find(x => tr(g, x, 'SETTING')) || null;
  async function special(g, times) { const s = setting(g); if (!s) { g.log('[배경] 환경이 없어 특수 능력이 없습니다'); return []; } let out = []; for (let i = 0; i < (times || 1); i++) { g.log(`특수 능력: ${g.nm(s)}`, 'warn'); const f = (MC.scripts[idOf(g, s)] || {}).special; if (f) out = out.concat((await f(g, s)) || []); } return out; }
  AOA.special = special;
  async function revealSetting(g) { // a random set-aside Setting; the rest of its encounter set goes into the encounter deck
    const keys = Object.keys(SETTINGS).filter(k => (g.e.aside || []).some(x => idOf(g, x) === SETTINGS[k])); if (!keys.length) return;
    const k = keys[Math.floor(g.rand() * keys.length)]; const ids = MC.sets[k] || [];
    const env = g.e.aside.find(x => idOf(g, x) === SETTINGS[k]);
    for (const x of g.e.aside.slice()) if (x !== env && ids.includes(idOf(g, x))) g.put(x, 'edeck');
    g.shuffle(g.e.deck); await g.show({ type: 'reveal', uid: env, title: '새 배경' }); await g.reveal(env);
  }
  const darkBeast = deal => ({ async onAttackStart(g) { await special(g); }, async whenRevealed(g) { await revealSetting(g); if (deal) await fdEach(g, 1); } });
  S['45118'] = darkBeast(false); S['45119'] = darkBeast(true); S['45120'] = darkBeast(true);
  S['45121a'] = { setup(g) { const ids = Object.keys(SETTINGS).flatMap(k => MC.sets[k] || []); for (const x of g.e.deck.concat(g.e.env || []).slice()) if (ids.includes(idOf(g, x))) g.put(x, 'aside'); g.e.setupPending = (g.e.setupPending || []).filter(x => !ids.includes(idOf(g, x))); } }; // the three Settings wait set aside
  const goggles = { attachTo: g => g.e.villain, boostEffect(g, u, ctx) { (ctx.post || ctx.after).push(async gg => { if (gg.e.villain && ['boost', 'ediscard'].includes(gg.c(u).zone)) gg.attachEnc(u, gg.e.villain); }); },
    actions: [{ timing: 'hero', label: '히어로 소진 → [배경] 특수 능력 처리, 이 카드 버림', can: (g, u) => g.c(u).zone === 'attach' && !g.c(g.idt()).ex, async use(g, u) { g.c(g.idt()).ex = true; await special(g); g.discard(u, `${g.nm(u)} 버림`); } }] };
  S['45122'] = goggles; S['45123'] = goggles;
  S['45124'] = { revealFirst: true, mod: { hp: (g, s, t) => g.c(s).zone === 'attach' && t === g.c(s).on ? 2 : 0 }, grantKw: (g, s, t) => g.c(s).zone === 'attach' && t === g.c(s).on ? ['guard'] : null, // Cruel Experiment
    async whenRevealed(g, u) { const m = await encDiscardUntil(g, d => d.type === 'minion', '잔혹한 실험'); if (!m) { g.discard(u); return; } await g.reveal(m); if (g.c(m).zone === 'minion') g.attachEnc(u, m); else g.discard(u); } };
  S['45125'] = { async whenRevealed(g) { const v = g.e.villain; if (!v) return; if (g.isHero()) { g.c(v).fdBoost = (g.c(v).fdBoost || 0) + 1; await g.enemyAttack(v, {}); } else { await g.enemyScheme(v, {}); giveTough(g, v, '사악한 천재'); } } }; // Evil Genius
  S['45126'] = { async whenDefeated(g) { const s = setting(g); if (!s) return; const k = Object.keys(SETTINGS).find(k => SETTINGS[k] === idOf(g, s)); const ids = MC.sets[k] || []; const x = await encDiscardUntil(g, (d, u) => ids.includes(idOf(g, u)), '시간 여행 소동'); if (x) await g.reveal(x); } }; // Time-Travel Shenanigans
  const settingEnv = (fx, extra) => Object.assign({ special: fx, whenRevealed(g, u) { for (const x of (g.e.env || []).slice()) if (x !== u && tr(g, x, 'SETTING')) g.discard(x, `${g.nm(x)} 버림 (배경 교체)`); } }, extra);
  // Savage Land
  S['45127'] = settingEnv(async g => discardTopDeck(g, 3), { mod: { retaliate: (g, s, t) => t === g.e.villain ? 1 : 0 } });
  S['45128'] = { async whenRevealed(g) { await special(g); }, boostEffect(g, u, ctx) { if ((g.e.env || []).some(x => idOf(g, x) === '45127')) (ctx.post || ctx.after).push(async gg => { if (['boost', 'ediscard'].includes(gg.c(u).zone)) gg.put(u, 'facedown'); }); } }; // Pterosaur
  S['45129'] = { async onAttackStart(g, u, ctx) { const x = (await discardTopDeck(g, 1))[0]; if (x) { const n = (g.d(x).res || '').length; ctx.atkBonus = (ctx.atkBonus || 0) + n; if (n) g.log(`★ 벨로시랩터: 공격 +${n}`); } } }; // Velociraptor
  S['45130'] = { async whenDefeated(g) { await special(g); } }; // Giant Ape
  S['45131'] = { async whenRevealed(g) { const s = (g.e.env || []).find(x => idOf(g, x) === '45127'); if (s) { const out = await special(g); const n = out.reduce((t, x) => t + (g.d(x).res || '').length, 0); if (n) await g.indirectDamage(n, null); } else { const x = findEnc(g, '45127'); if (x) { g.shuffle(g.e.deck); await g.reveal(x); } } } }; // Land Out of Time
  S['45132'] = { async whenDefeated(g) { await g.forEachPlayer(() => special(g)); } }; // Village Under Attack
  // Genosha
  S['45133'] = settingEnv(async g => { await g.placeThreat(g.e.main, 1, {}); return []; }, { steadyFor: (g, s, t) => t === g.e.villain });
  const escaped = g => g.c(g.idt()).att.find(x => idOf(g, x) === '45137') || null;
  S['45134'] = { async whenDefeated(g) { if (escaped(g)) return; const x = findEnc(g, '45137'); if (x) { g.attachEnc(x, g.idt()); g.log('도망친 뮤턴트가 당신에게 붙습니다', 'warn'); } }, boostEffect: g => escaped(g) ? 3 : 0 }; // Magistrate
  S['45135'] = { on: { async afterEnemyAttack(g, u, ctx) { if (ctx.enemy === u) await special(g); } } }; // Armored Unibike
  S['45136'] = { on: { async afterEnemyAttack(g, u, ctx) { if (ctx.enemy === u && (ctx.damaged || []).some(x => x !== g.idt() && g.c(x).zone !== 'ally')) await special(g, 2); } } }; // Genoshan Mech
  S['45137'] = { attachTo: g => g.idt(), grantKw: (g, s, t) => g.c(s).zone === 'attach' && g.e.minions.includes(t) && tr(g, t, 'GENOSHA') ? ['quickstrike'] : null, // Escaped Mutant
    actions: [{ timing: 'alter', label: '[배경] 특수 능력 처리 → 이 카드 버림', can: (g, u) => g.c(u).zone === 'attach', async use(g, u) { await special(g); g.discard(u, `${g.nm(u)} 버림`); } }] };
  S['45138'] = { async whenDefeated(g) { const x = findEnc(g, '45137'); if (x && !escaped(g)) { g.shuffle(g.e.deck); await g.reveal(x); } } }; // Police State
  // Blue Area of the Moon
  S['45139'] = settingEnv(async g => { await g.dealDamage(g.idt(), 1, {}); return []; }, { grantKw: (g, s, t) => g.e.minions.includes(t) ? ['guard'] : null });
  const trial = g => g.e.sides.find(x => idOf(g, x) === '45146') || null;
  S['45140'] = { cannotTakeDamage: g => !!trial(g), boostEffect(g, u, ctx) { if (trial(g)) (ctx.post || ctx.after).push(async gg => { if (['boost', 'ediscard'].includes(gg.c(u).zone)) gg.put(u, 'facedown'); }); } }; // Gladiator
  S['45141'] = { async whenRevealed(g) { if (g.c(g.idt()).conf) await special(g); else g.giveStatus(g.idt(), 'conf', '오라클'); } }; // Oracle
  S['45142'] = { async whenRevealed(g) { if (g.c(g.idt()).stun) await special(g); else g.giveStatus(g.idt(), 'stun', '만타'); } }; // Manta
  S['45143'] = { async whenRevealed(g) { if (g.c(g.idt()).ex) await special(g); else g.c(g.idt()).ex = true; } }; // Earthquake
  S['45144'] = { async whenRevealed(g) { const x = g.takeEncounter(); if (!x) return; g.put(x, 'ediscard'); if (g.d(x).type === 'minion' && tr(g, x, 'IMPERIAL GUARD')) await g.reveal(x); else await special(g); } }; // Warstar
  S['45145'] = { revealFirst: true, mod: { hp: (g, s, t) => g.c(s).zone === 'attach' && t === g.c(s).on ? 4 : 0 }, grantTrait: (g, s, t) => g.c(s).zone === 'attach' && t === g.c(s).on ? 'IMPERIAL GUARD' : null, // Imperial Guardsman
    async whenRevealed(g, u, ctx) { const t = await pick(g, g.e.minions.slice(), '제국 근위병을 붙일 하수인'); if (t) g.attachEnc(u, t); else { g.discard(u); ctx.surge++; } },
    on: { async attachedDefeated(g) { await special(g); } } };
  S['45146'] = { whenDefeated(g) { const c = g.e.discard.filter(x => g.d(x).type === 'minion' && tr(g, x, 'IMPERIAL GUARD')); for (const x of c) g.put(x, 'edeck'); g.shuffle(g.e.deck); if (c.length) g.log(`결투 재판: 제국 근위대 하수인 ${c.length}장을 조우 덱에 섞습니다`); } }; // Trial by Combat

  // ======================= En Sabah Nur =======================
  const FORM = { BIOMORPH: 'a', CYBERPATH: 'b', GIANT: 'c' };
  const esn = g => g.e.villain && /^4518[4-6][abc]$/.test(idOf(g, g.e.villain)) ? g.e.villain : null;
  const inForm = (g, f) => { const v = esn(g); return !!v && idOf(g, v).endsWith(FORM[f]); };
  async function toForm(g, f) { const v = esn(g); if (!v || inForm(g, f)) return; const c = g.c(v); c.id = c.id.slice(0, 5) + FORM[f]; g.log(`아포칼립스가 [${{ BIOMORPH: '생체 변형', CYBERPATH: '사이버패스', GIANT: '거인' }[f]}] 모습이 됩니다`, 'warn'); const fx = (MC.scripts[c.id] || {}).afterForm; if (fx) await fx(g, v); }
  AOA.toForm = toForm;
  const lvl = id => ({ '45184': 1, '45185': 2, '45186': 3 })[id.slice(0, 5)];
  for (const base of ['45184', '45185', '45186']) {
    const n = lvl(base);
    S[base + 'a'] = { attackProps: () => ({ overkill: true }), async afterForm(g) { await g.indirectDamage(n, null); } };
    S[base + 'b'] = { async afterForm(g) { for (const s of g.schemes().slice()) await g.placeThreat(s, n, {}); } };
    S[base + 'c'] = { afterForm(g, v) { g.heal(v, n); } };
  }
  const powerUp = async (g, n) => { const m = g.e.main; g.c(m).cnt.power = (g.c(m).cnt.power || 0) + n; if (g.c(m).cnt.power >= 4) { g.c(m).cnt.power -= 4; await g.withPlayer(g.s.first, async () => { const x = await encDiscardUntil(g, d => (d.tr || []).includes('SUPERPOWER'), '피라미드의 힘'); if (x) await g.reveal(x); }); } };
  const pyramid = { on: { async mainStep1(g, u) { if (u === g.e.main) await powerUp(g, 1); } } };
  S['45147a'] = { async setup(g) { await fdEach(g, 1); } }; S['45147b'] = pyramid; S['45148b'] = Object.assign({ loseOnComplete: true }, pyramid);
  S['45149'] = { attachTo: g => esn(g) || g.e.villain, async whenRevealed(g) { await toForm(g, 'GIANT'); }, // Staggering Strength
    on: { hostWouldAttack(g, u, ctx) { g.giveStatus(g.idt(), 'stun', '★ 엄청난 힘'); ctx.post.push(async gg => { if (gg.c(u).zone === 'attach') gg.discard(u, '엄청난 힘 버림'); }); } },
    boostEffect(g, u, ctx) { (ctx.post || ctx.after).push(async gg => { if (['boost', 'ediscard'].includes(gg.c(u).zone)) await gg.reveal(u); }); } };
  const formTreachery = f => ({ async whenRevealed(g) { const v = esn(g); if (!v) return; if (inForm(g, f)) await g.activate(v, {}); else { await toForm(g, f); await powerUp(g, 1); } },
    boostEffect(g, u, ctx) { (ctx.post || ctx.after).push(async gg => { await toForm(gg, f); }); } });
  S['45150'] = formTreachery('BIOMORPH'); S['45151'] = formTreachery('CYBERPATH'); S['45152'] = formTreachery('GIANT');
  const formSide = f => ({ async whenDefeated(g) { const v = esn(g); if (!v) return; if (inForm(g, f)) await g.activate(v, {}); else { await toForm(g, f); giveTough(g, esn(g), g.nm(esn(g))); } } });
  S['45153'] = formSide('BIOMORPH'); S['45154'] = formSide('CYBERPATH'); S['45155'] = formSide('GIANT');

  // ======================= Celestial Tech =======================
  async function celestial(g, a, kind) { // discard the top card of your deck and resolve by its resource
    const x = (await discardTopDeck(g, 1))[0]; if (!x) return; const r = g.d(x).res || ''; const has = k => r.includes(k) || r.includes('G'); const v = g.c(a).on;
    if (kind === 'scheme') { if (has('Y')) g.heal(v, 2); if (has('R')) giveTough(g, v, '천상의 갑옷'); if (has('B')) { g.giveStatus(g.idt(), 'conf', '천상의 갑옷'); g.discard(a, '천상의 갑옷 버림'); } }
    else { if (has('Y')) await g.dealDamage(g.idt(), 2, {}); if (has('B') && g.p.hand.length) await g.discardFromHand(1, 1, '천상의 무기: 버릴 카드'); if (has('R')) { g.giveStatus(g.idt(), 'stun', '천상의 무기'); g.discard(a, '천상의 무기 버림'); } }
  }
  S['45156'] = { attachTo: g => g.e.villain, on: { async hostWouldScheme(g, u) { await celestial(g, u, 'scheme'); } } }; // Celestial Armor
  S['45157'] = { attachTo: g => g.e.villain, on: { async hostWouldAttack(g, u) { await celestial(g, u, 'attack'); } } }; // Celestial Weapon
  S['45158'] = { async whenRevealed(g) { const at = g.e.villain ? g.c(g.e.villain).att.filter(x => tr(g, x, 'CELESTIAL')) : []; // Celestial Tech
    if (!at.length) { const x = g.e.deck.concat(g.e.discard).find(y => tr(g, y, 'CELESTIAL') && g.d(y).type === 'attachment'); if (x) { await g.reveal(x); g.shuffle(g.e.deck); } return; }
    for (const a of at) { if (g.c(a).zone !== 'attach') continue; if (idOf(g, a) === '45156') await celestial(g, a, 'scheme'); if (g.c(a).zone === 'attach' && idOf(g, a) === '45157') await celestial(g, a, 'attack'); } } };

  // ======================= Clan Akkaba =======================
  const ritual = g => g.e.sides.find(x => idOf(g, x) === '45163') || null;
  const toRitual = async (g, n) => { const r = ritual(g); if (r) await g.placeThreat(r, n, {}); else await g.placeThreat(g.e.main, n, {}); };
  const ritualOrBoost = async g => { const o = await g.ask({ type: 'choice', title: '★ 고대 의식', options: [{ id: 'r', label: '고대 의식에 위협 3' }, { id: 'b', label: '이 카드의 강화 아이콘 +3' }] }); if (o === 'r') { await toRitual(g, 3); return 0; } return 3; };
  S['45159'] = { schemeTarget: g => ritual(g), boostEffect: ritualOrBoost }; // Ozymandias
  S['45160'] = { on: { async afterEnemyAttack(g, u, ctx) { if (ctx.enemy === u) await toRitual(g, (ctx.damaged || []).some(x => x !== g.idt() && g.c(x).zone !== 'ally') ? 3 : 1); } } }; // Scarab
  S['45161'] = { async whenDefeated(g) { await toRitual(g, 2); }, async boostEffect(g) { await toRitual(g, 1); } }; // Clan Akkaba Zealot
  S['45162'] = { async whenRevealed(g) { await toRitual(g, 5); }, boostEffect: ritualOrBoost }; // Tyrant Worship
  S['45163'] = { cannotLeave: () => true, async afterThreatPlaced(g, u) { if (g.c(u).threat >= 10) { g.c(u).threat -= 5; g.log('고대 의식: 위협 10 이상 — 5를 제거하고 각 플레이어에게 조우 카드를 받습니다', 'warn'); await fdEach(g, 1); } } }; // Ancient Ritual

  S['45062a'] = { async setup(g) { if (g.s.scen.expert) await g.forEachPlayer(() => g.dealEncounterCard()); } }; // Hunting Gene Traitors: expert deals a facedown card
  S['45148a'] = { async whenRevealed(g) { await g.withPlayer(g.s.first, async () => { const x = g.discardEncounterUntil(d => (d.tr || []).includes('SUPERPOWER')); if (x) { g.log(`아포칼립스의 부상: ${g.nm(x)} 공개`, 'warn'); await g.reveal(x); } }); } }; // The Rise of Apocalypse (2A)
  // ======================= Campaign: Age of Apocalypse (cards/pack/aoa/campaign_setup.py, campaign/__init__.py) =======================
  const AOC = 'age_of_apocalypse';
  const MISSIONS = ['45166a', '45167a', '45168a', '45169a'], PROFESSOR = '45170a', OVERSEERS = ['45179a', '45180a', '45181a', '45182a', '45183a'], CAMP_ALLIES = ['45172', '45173', '45174', '45175'];
  const rnd = (g, a) => a.length ? a[Math.floor(g.rand() * a.length)] : '';
  const mArea = g => g.e.mission || [];
  const mScheme = g => g.e.sides.find(x => (g.d(x).tr || []).includes('MISSION'));
  const mAllies = g => mArea(g).filter(x => g.d(x).type === 'ally');
  const mMinions = g => mArea(g).filter(x => g.d(x).type === 'minion');
  const isOverseer = (g, x) => (g.d(x).tr || []).includes('OVERSEER');
  const mTeam = g => g.livingPlayers().flatMap(pi => g.s.ps[pi].supports).find(x => ['45171a', '45171b'].includes(g.c(x).id));
  const RES_KO = { R: '물리', B: '정신', Y: '에너지', G: '와일드' };
  const hasDM = (g, a) => g.c(a).att.some(x => g.c(x).id === '45176');
  const icons = (g, u) => { const s = new Set((g.d(u).res || '').split('').filter(ch => RES_KO[ch])); if (g.d(u).type === 'ally' && hasDM(g, u)) s.add('G'); return s; }; // Desperate Measures: also a wild icon
  const iconTxt = (g, u) => [...icons(g, u)].map(k => RES_KO[k]).join('·') || '자원 없음';
  const matches = (g, a, u) => { const A = icons(g, a), C = icons(g, u); return A.size > 0 && C.size > 0 && (A.has('G') || C.has('G') || [...A].some(k => C.has(k))); };
  const mStat = (g, a, k) => (g.d(a)[k] || 0) + g.c(a).att.filter(x => g.c(x).id === '45176').length; // the ally is blank: printed value + Desperate Measures
  const logAdd = (g, key, id) => { const l = g.clogList(key); if (!l.includes(id)) { l.push(id); g.clogSet(key, l.join(';')); } };
  async function mAllyDamage(g, a, n) {
    const c = g.c(a); if (c.zone !== 'mission') return; c.dmg += n;
    if (c.dmg >= g.maxHp(a)) { g.log(`${g.nm(a)}: 임무에서 쓰러졌습니다`, 'warn'); for (const x of c.att.slice()) { g.resetCard(x); g.put(x, g.d(x).enc ? 'ediscard' : 'discard'); } g.resetCard(a); g.put(a, 'discard'); }
  }
  async function mMinionDamage(g, m, n) {
    if (isOverseer(g, m) && mMinions(g).some(x => x !== m && !isOverseer(g, x))) { g.log(`${g.nm(m)}: 다른 하수인이 임무에 있어 피해를 받지 않습니다`); return; }
    const c = g.c(m); c.dmg += n; if (c.dmg < g.maxHp(m)) return;
    g.log(`${g.nm(m)} 처치 (임무)`, 'good');
    for (const x of c.att.slice()) { g.resetCard(x); g.put(x, g.d(x).enc ? 'ediscard' : 'discard'); }
    g.resetCard(m);
    if (isOverseer(g, m)) { g.put(m, 'victory'); logAdd(g, 'Overseers Defeated', g.c(m).id); } else g.put(m, 'ediscard');
  }
  async function completeMission(g, m, ok) {
    const id = g.c(m).id, team = mTeam(g);
    g.log(`임무 「${g.nm(m)}」 ${ok ? '성공' : '실패'}`, ok ? 'good' : 'warn');
    if (ok) { // each player card at the mission goes back into its owner's deck
      for (const u of mArea(g).slice()) { for (const x of g.c(u).att.slice()) if (!g.d(x).enc) { g.resetCard(x); g.put(x, 'deck'); } if (!g.d(u).enc) { g.resetCard(u); g.put(u, 'deck'); } }
      for (const pi of g.livingPlayers()) g.shuffle(g.s.ps[pi].deck); if (team) g.c(team).id = '45171b';
    } else if (team) g.removeFromGame(team);
    for (const u of mArea(g).slice()) { for (const x of g.c(u).att.slice()) { g.resetCard(x); g.put(x, 'removed'); } g.resetCard(u); g.put(u, 'removed'); } // the rest of the mission area leaves the game
    if (g.c(m).zone === 'side') { g.resetCard(m); g.put(m, 'removed'); }
    if (id !== PROFESSOR) { logAdd(g, 'Mission Side Schemes Removed from campaign', id); if (ok) logAdd(g, 'Mission Side Schemes Defeated', id); }
    if (id === '45166a') {
      if (ok) await g.forEachPlayer(() => { const dm = (g.e.aside || []).find(x => g.c(x).id === '45176'); if (dm) { g.c(dm).owner = g.s.ctx; g.put(dm, 'hand'); g.log(`최후의 수단을 ${g.playerName()}의 손에 더합니다`, 'good'); } });
      else await g.placeThreat(g.e.main, 2 * g.players, {});
    } else if (id === '45167a') {
      if (ok) await g.forEachPlayer(async () => { const c = await pick(g, g.p.deck.concat(g.p.discard), `생존자 대피(${g.playerName()}): 덱·버린 더미에서 손에 더할 카드`); if (c) { g.put(c, 'hand'); g.shuffle(g.p.deck); await handReact(g, c); } });
      else await g.forEachPlayer(() => g.dealEncounterCard());
    } else if (id === '45168a') {
      const walls = g.e.deck.concat(g.e.discard, g.e.sides).filter(x => g.c(x).id === '45177');
      if (ok) { walls.forEach(x => { g.resetCard(x); g.put(x, 'removed'); }); g.log('북미 방파제를 게임에서 제거합니다', 'good'); await g.forEachPlayer(async () => { const t = await g.chooseTarget('enemy', `방파제 파괴 공작(${g.playerName()}): 피해 3을 줄 적`, null, false); if (t) await g.dealDamage(t, 3, { byPlayer: true }); }); }
      else { const w = walls.find(x => g.c(x).zone !== 'side'); if (w) { g.log('북미 방파제를 찾아 공개합니다', 'warn'); await g.reveal(w); g.shuffle(g.e.deck); } }
    } else if (id === '45169a') {
      if (ok) await g.forEachPlayer(async () => { const a = await pick(g, (g.e.aside || []).filter(x => CAMP_ALLIES.includes(g.c(x).id)), `길 잃은 뮤턴트 찾기(${g.playerName()}): 손에 더할 캠페인 동료`); if (a) { g.c(a).owner = g.s.ctx; g.put(a, 'hand'); g.clogPSet('Campaign Ally', g.c(a).id); await handReact(g, a); } });
      else await g.forEachPlayer(async () => { const c = await pick(g, g.p.hand.slice(), `길 잃은 뮤턴트 찾기 실패(${g.playerName()}): 버릴 카드`); if (c) g.put(c, 'discard'); });
    } else if (id === PROFESSOR) {
      if (!ok) g.lose('교수님을 지켜라 임무 실패');
      await g.forEachPlayer(async () => { const a = await pick(g, g.p.deck.concat(g.p.discard).filter(x => g.d(x).type === 'ally'), `교수님을 지켜라(${g.playerName()}): 덱·버린 더미에서 손에 더할 동료`); if (a) { g.put(a, 'hand'); g.shuffle(g.p.deck); await handReact(g, a); } });
    }
  }
  async function handReact(g, u) { const f = g.sc(u).onHand; if (f && g.c(u).zone === 'hand') await f(g, u); }
  async function missionAttempt(g, team) {
    if (!mScheme(g) || !mAllies(g).length) return;
    const disc = await g.discardDeckTop(mAllies(g).length); let rem = disc.slice();
    const ov = mMinions(g).find(x => isOverseer(g, x)), cnt = k => rem.reduce((t, u) => t + (g.d(u).res || '').split('').filter(ch => ch === k).length, 0);
    if (ov) { const oid = g.c(ov).id; // the Overseer's mission response
      if (oid === '45180a') { const n = cnt('B'); if (n) { await g.placeThreat(mScheme(g), 2 * n, {}); g.log(`섀도 킹: 정신 자원 ${n}개 → 임무에 위협 ${2 * n}`, 'warn'); } }
      else if (oid === '45182a') { const n = cnt('R'); if (n && g.c(ov).dmg) { g.c(ov).dmg = Math.max(0, g.c(ov).dmg - 3 * n); g.log(`슈거맨: 물리 자원 ${n}개 → 피해 ${3 * n} 회복`, 'warn'); } }
      else if (oid === '45183a') { const n = cnt('Y'); for (let i = 0; i < n; i++) { const t = await pick(g, mAllies(g), '미하일 라스푸틴: 피해 1을 받을 임무 동료'); if (!t) break; await mAllyDamage(g, t, 1); } }
      else if (oid === '45181a') { const w = rem.filter(u => (g.d(u).res || '').includes('G')); for (const u of w) g.put(u, 'attach', ov); if (w.length) g.log(`어비스: 와일드 카드 ${w.length}장을 어비스에게 뒷면으로 장착`, 'warn'); rem = rem.filter(u => !w.includes(u)); }
    }
    const sinister = mMinions(g).some(x => g.c(x).id === '45179a'), used = new Set(), asg = [];
    for (const a of mAllies(g)) {
      let legal = rem; if (sinister) legal = rem.filter(u => ![...icons(g, u)].some(k => used.has(k)));
      if (!legal.length) break;
      const t = await g.ask({ type: 'target', title: `임무 시도: ${g.nm(a)}(${iconTxt(g, a)})에게 배정할 카드 — 자원이 맞아야 참여합니다`, cands: legal, cancelable: true });
      if (!t) break;
      rem = rem.filter(u => u !== t); asg.push([a, t]); icons(g, t).forEach(k => used.add(k));
    }
    const part = asg.filter(([a, u]) => g.c(a).zone === 'mission' && matches(g, a, u)).map(x => x[0]);
    g.log(`임무 시도: 참여 동료 ${part.length}명${part.length ? ` (${part.map(a => g.nm(a)).join(', ')})` : ''}`, part.length ? 'good' : 'warn');
    for (let dmg = part.reduce((t, a) => t + mStat(g, a, 'atk'), 0); dmg > 0; dmg--) {
      const ms = mMinions(g); if (!ms.length) break; const non = ms.filter(x => !isOverseer(g, x));
      const t = await pick(g, non.length ? non : ms, '임무 시도: 피해 1을 줄 하수인'); if (!t) break; await mMinionDamage(g, t, 1);
    }
    let m = mScheme(g);
    if (m && !mMinions(g).length && g.c(m).threat === 0) await g.afterThreatRemoved(m);
    m = mScheme(g);
    if (m) { const th = part.reduce((t, a) => t + mStat(g, a, 'thw'), 0); if (th) { g.e.missionAttempt = true; let r = 0; try { r = await g.removeThreat(m, th, { src: team }); } finally { g.e.missionAttempt = false; } g.log(`임무 시도: ${g.nm(m)} 위협 ${r} 제거`); await g.afterThreatRemoved(m); } }
    m = mScheme(g); if (!m) return;
    g.c(m).cnt.attempt = (g.c(m).cnt.attempt || 0) + 1; g.log(`${g.nm(m)}: 시도 카운터 ${g.c(m).cnt.attempt}/4, 임무의 각 동료에게 피해 1`);
    for (const a of mAllies(g)) await mAllyDamage(g, a, 1);
    if (g.c(m).zone === 'side' && g.c(m).cnt.attempt >= 4) await completeMission(g, m, false);
  }
  const missionSide = extra => Object.assign({ noThwart: true, removeOnlyBy: g => !!g.e.missionAttempt, cannotLeave: g => mMinions(g).length > 0,
    async whenDefeated(g, u) { await completeMission(g, u, true); return 'handled'; } }, extra || {});
  MISSIONS.forEach(id => { S[id] = missionSide(); });
  S[PROFESSOR] = missionSide({ winCheck: () => '교수님을 지켜라 임무를 끝내지 못했습니다' });
  const noProfX = (g, x, uid) => g.e.aocLevel === 5 && g.d(uid).type === 'ally' && /Professor X/.test(g.d(uid).en || ''); // Protect the Professor
  const teamBase = { keepInPlay: (g, x, uid) => uid === x, blocksPlay: noProfX, on: firstCtrl('support') };
  S['45171a'] = Object.assign({}, teamBase, { // Mission Team
    async allyToMission(g, u, ally) {
      if (g.c(u).zone !== 'support' || !mScheme(g)) return false;
      if (g.p.phase.missionAlly) return true;
      return (await g.ask({ type: 'choice', title: `${g.nm(ally)}: 어디에 내려놓을까요?`, options: [{ id: 'p', label: '내 조종 하에' }, { id: 'm', label: '임무에 (문구 없는 동료로)' }] })) === 'm';
    },
    actions: [{ timing: 'action', exhaust: true, label: '임무팀 소진 → 임무 동료 비용 -2 또는 임무 시도', can: (g, u) => g.c(u).zone === 'support' && !g.c(u).ex && !!mScheme(g), async use(g, u) {
      const opts = [{ id: 'r', label: '이번 단계에 임무에 내려놓는 다음 동료의 비용 -2' }]; if (mAllies(g).length) opts.push({ id: 'a', label: `임무 시도 (임무 동료 ${mAllies(g).length}명, 덱 위 ${mAllies(g).length}장 버림)` });
      const o = opts.length === 1 ? 'r' : await g.ask({ type: 'choice', title: '임무팀', options: opts });
      if (o === 'r') { g.p.phase.nextAllyRed = (g.p.phase.nextAllyRed || 0) + 2; g.p.phase.missionAlly = true; g.log('이번 단계에 내려놓는 다음 동료는 비용 -2로 임무에 갑니다'); }
      else await missionAttempt(g, u);
    } }] });
  S['45171b'] = Object.assign({}, teamBase, { actions: [{ timing: 'action', exhaust: true, label: '임무팀 소진 → 플레이어를 골라 카드 1장 뽑기', can: (g, u) => g.c(u).zone === 'support' && !g.c(u).ex, async use(g) { const pi = await g.choosePlayer('임무팀: 카드 1장을 뽑을 플레이어'); await g.withPlayer(pi, () => g.draw(1)); } }] });
  S['45164'] = { async whenRevealed(g, u) { // Agent of Apocalypse
      if (g.c(u).zone !== 'minion') return;
      const o = mScheme(g) ? await g.ask({ type: 'choice', title: '아포칼립스의 요원', options: [{ id: 'm', label: '임무 구역에 더하기' }, { id: 'a', label: '나를 상대로 활성화' }] }) : 'a';
      if (o === 'm') { for (const a of g.c(u).att.slice()) g.discard(a); g.put(u, 'mission'); g.log('아포칼립스의 요원이 임무 구역에 들어갑니다', 'warn'); }
      else await g.activate(u, {});
    },
    async boostEffect(g, u, ctx) { const t = await pick(g, mAllies(g), '★ 아포칼립스의 요원: 피해 1을 받을 임무 동료'); if (t) await mAllyDamage(g, t, 1); if (ctx) ctx.extraBoost = (ctx.extraBoost || 0) + 1; } };
  S['45165'] = { async whenRevealed(g, u, ctx) { // Worldwide Crisis
      const m = mScheme(g); const o = m ? await g.ask({ type: 'choice', title: '전 세계적 위기', options: [{ id: 't', label: `${g.nm(m)}에 위협 3` }, { id: 'd', label: '피해 1을 받고 쇄도' }] }) : 'd';
      if (o === 't') await g.placeThreat(m, 3, {}); else { await g.dealDamage(g.idt(), 1, {}); if (ctx) ctx.surge++; }
    },
    async boostEffect(g, u, ctx) { const m = mScheme(g); if (m) await g.placeThreat(m, 1, {}); if (ctx) ctx.extraBoost = (ctx.extraBoost || 0) + 1; } };
  const dmMod = (g, s, t) => g.c(s).zone === 'attach' && g.c(s).on === t ? 1 : 0;
  S['45176'] = { attach: { kind: 'allyAny', filter: (g, u) => !hasDM(g, u) }, mod: { atk: dmMod, thw: dmMod, hp: dmMod } }; // Desperate Measures
  S['45177'] = { shieldsFromDamage: (g, s, t) => g.c(s).zone === 'side' && g.d(t).type === 'villain', boostEffect(g, u) { g.put(u, 'facedown'); g.log('★ 북미 방파제: 뒷면 조우 카드로 받습니다', 'warn'); } }; // North American Sea Wall
  S['45178'] = { async onHand(g, u) { g.log(`${g.nm(u)}: 손에 들어와 공개합니다`, 'warn'); await g.reveal(u); await g.draw(1); }, // Frightened Refugees
    whenRevealed(g, u) { g.put(u, 'pobl'); g.log(`${g.nm(u)}이(가) 내 플레이 영역에 남습니다`, 'warn'); },
    actions: [{ timing: 'alter', label: '정체성 소진 → 이 카드를 게임에서 제거', can: (g, u) => g.c(u).zone === 'pobl' && !g.c(g.idt()).ex, use(g, u) { g.c(g.idt()).ex = true; g.removeFromGame(u); } }] };
  S['45172'] = { async onHand(g, u) { g.log(`${g.nm(u)}: 손에 들어와 주 음모 위협 2 제거`, 'good'); await thw(g, g.e.main, 2, u); } }; // Destiny
  S['45173'] = { async onHand(g, u) { const v = g.e.villain; if (v) { g.log(`${g.nm(u)}: 손에 들어와 빌런에게 피해 2`, 'good'); await g.dealDamage(v, 2, { src: u, byPlayer: true }); } } }; // Blink
  S['45174'] = { onHand(g, u) { const v = g.e.villain; if (v) g.giveStatus(v, 'conf', g.nm(u)); } }; // Morph
  S['45175'] = { onHand(g, u) { g.giveStatus(g.idt(), 'tough', g.nm(u)); } }; // X-Man
  MC.CAMPAIGNS[AOC] = {
    async setup(g, spec) {
      const lv = spec.level || 1; g.e.aocLevel = lv;
      const toDeck = (id, why) => { if (!id || !MC.cards[id]) return; g.newCard(id, 'deck'); g.shuffle(g.p.deck); g.log(`캠페인(${g.playerName()}): ${MC.cards[id].name}을(를) 덱에 섞습니다 (${why})`); };
      if (lv > 1) { // AddPreviousMissionRewardsAndPenalties
        const rem = g.clogList('Mission Side Schemes Removed from campaign'), dl = g.clogList('Mission Side Schemes Defeated');
        const won = id => rem.includes(id) && dl.includes(id), lost = id => rem.includes(id) && !dl.includes(id);
        await g.forEachPlayer(async () => {
          if (won('45166a') && await yes(g, `캠페인(${g.playerName()}): 최후의 수단 1장을 덱에 섞을까요?`)) toDeck('45176', '시애틀 코어 해방');
          if (won('45167a')) toDeck(g.clogP('Campaign Aspect Upgrade'), '생존자 대피 보상'); else if (lost('45167a')) toDeck('45178', '생존자 대피 실패');
          if (won('45168a')) toDeck(g.clogP('Campaign Aspect Support'), '방파제 파괴 공작 보상');
          if (won('45169a')) toDeck(g.clogPList('Campaign Ally').find(x => CAMP_ALLIES.includes(x)), '길 잃은 뮤턴트 찾기 보상');
        });
        if (lost('45168a')) { g.newCard('45177', 'edeck'); g.shuffle(g.e.deck); g.log('캠페인: 북미 방파제를 조우 덱에 섞습니다'); }
      }
      ['45164', '45164', '45165', '45165'].forEach(id => g.newCard(id, 'edeck')); g.shuffle(g.e.deck); // the Age of Apocalypse set
      const removed = g.clogList('Mission Side Schemes Removed from campaign');
      const mid = lv === 5 ? PROFESSOR : rnd(g, MISSIONS.filter(x => !removed.includes(x)));
      const prel = g.e.minions.filter(x => tr(g, x, 'PRELATE')).map(x => g.c(x).id.replace(/b$/, 'a'));
      const oid = rnd(g, OVERSEERS.filter(x => !g.clogList('Overseers Defeated').includes(x) && !prel.includes(x)));
      if (mid) { const m = g.newCard(mid, 'limbo'); await g.enterSide(m, {}); g.log(`캠페인: 임무 「${g.nm(m)}」 (위협 ${g.c(m).threat})`, 'warn'); }
      if (oid) { let o = (g.e.aside || []).find(x => g.c(x).id === oid.replace(/a$/, 'b')); if (o) { g.c(o).id = oid; g.put(o, 'mission'); } else o = g.newCard(oid, 'mission'); g.log(`캠페인: 감독관 ${g.nm(o)}이(가) 임무 구역에 있습니다`, 'warn'); }
      g.withPlayerSync(g.s.first, () => g.newCard('45171a', 'support'));
      if (mid === '45166a') for (let i = 0; i < g.players; i++) g.newCard('45176', 'aside');
      else if (mid === '45167a') await g.forEachPlayer(() => { g.newCard('45178', 'deck'); g.shuffle(g.p.deck); });
      else if (mid === '45168a') { g.newCard('45177', 'edeck'); g.shuffle(g.e.deck); }
      else if (mid === '45169a') CAMP_ALLIES.forEach(id => g.newCard(id, 'aside'));
      if (lv >= 2 && g.s.scen.expert) { // ExpertCampaignSetPlayersHPToTheirRemainingHP / ...MayHealAtMissionThreatCost
        await g.forEachPlayer(async () => {
          const v = g.clogP('Remaining hit points'), n = parseInt(v, 10), m = mScheme(g);
          if (v !== '' && n > 0) { g.setIdentityHP(n); if (m && g.c(g.idt()).dmg > 0 && await yes(g, `숙련 캠페인(${g.playerName()}): ${g.nm(m)}에 위협 3을 놓고 생명력을 모두 회복할까요?`)) { await g.placeThreat(m, 3, {}); g.c(g.idt()).dmg = 0; } }
          else if (v !== '' && n === 0 && m) { await g.placeThreat(m, 3, {}); g.c(g.idt()).dmg = 0; g.log(`숙련 캠페인(${g.playerName()}): 남은 생명력 0 → ${g.nm(m)}에 위협 3, 생명력 모두 회복`, 'warn'); }
        });
      }
      await g.forEachPlayer(async () => { // EachPlayerSearchForAnAlly
        let c = g.p.deck.filter(x => g.d(x).type === 'ally');
        if (lv === 5 && g.s.scen.expert) { const ht = g.heroForms().flatMap(id => (MC.cards[id] || {}).tr || []); c = c.filter(x => (g.d(x).tr || []).some(t => ht.includes(t))); }
        const a = await pick(g, c, `캠페인(${g.playerName()}): 덱에서 손에 더할 동료`); if (a) { g.put(a, 'hand'); g.shuffle(g.p.deck); g.log(`캠페인(${g.playerName()}): ${g.nm(a)}을(를) 손에 더합니다`); }
      });
    }
  };
  [['45062a', 1], ['45085a', 2], ['45103a', 3], ['45121a', 4], ['45147a', 5]].forEach(([id, lv]) => { S[id] = Object.assign(S[id] || {}, { campaign: { level: lv } }); });
  MC.registerScripts(S);
})();
