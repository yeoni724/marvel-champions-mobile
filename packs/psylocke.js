/* Psylocke (41001-41033): Psi-Knife / Psi-Katana, Justice X-Force cards and her nemesis set.
   Ported from cards/pack/psylocke of the community build. */
(function () {
  'use strict';
  const S = {};
  const idOf = (g, u) => g.c(u).id;
  const tr = (g, u, t) => (g.d(u).tr || []).includes(t) || g.hasTrait(u, t);
  const pick = async (g, cands, title) => !cands.length ? null : cands.length === 1 ? cands[0] : await g.ask({ type: 'target', title, cands, cancelable: false });
  const yes = async (g, title) => (await g.ask({ type: 'choice', title, options: [{ id: 'y', label: '예' }, { id: 'n', label: '아니요' }] })) === 'y';
  const PSI = ['41002a', '41002b'];
  const psi = g => g.p.upgrades.filter(u => PSI.includes(idOf(g, u)));
  const knives = g => psi(g).filter(u => idOf(g, u) === '41002a').length;
  const katanas = g => psi(g).filter(u => idOf(g, u) === '41002b').length;
  const swapped = g => (g.p.obl || []).some(u => idOf(g, u) === '41025');
  const isPsy = g => ['41001a', '41001b'].includes(idOf(g, g.idt()));
  function flip(g, u) { if (!u) return; const to = idOf(g, u) === '41002a' ? '41002b' : '41002a'; if (to === '41002a' && swapped(g)) { g.log('몸이 바뀜: 사이 카타나를 뒤집을 수 없습니다', 'warn'); return; } g.c(u).id = to; g.log(`사이 에너지: ${to === '41002a' ? '사이 나이프' : '사이 카타나'}`, 'good'); }
  async function flipOne(g, title) { const c = psi(g).filter(u => !(idOf(g, u) === '41002b' && swapped(g))); const t = await pick(g, c, title || '뒤집을 사이 에너지'); flip(g, t); }
  const mentalOnCards = g => g.p.allies.concat(g.p.supports, g.p.upgrades).reduce((n, x) => n + (g.d(x).res || '').split('').filter(c => c === 'B').length, 0);

  // identity
  S['41001a'] = { respond: [{ window: 'basicPowerUsed', label: '★ 사이 에너지 조절: 사이 에너지 1장 뒤집기', can: g => psi(g).length > 0, async resolve(g) { await flipOne(g); } }] };
  S['41001b'] = {
    setup(g) { const c = (g.p.pset || []).filter(u => PSI.includes(idOf(g, u))); for (const u of c) { g.c(u).id = '41002a'; g.put(u, 'upgrade'); } g.log(`준비: 사이 에너지 ${c.length}장 (사이 나이프)`); },
    actions: [{ timing: 'action', label: '사이 에너지 소진 → 버림 더미의 [사이오닉] 카드 1장을 덱에 섞기', can: g => psi(g).some(u => !g.c(u).ex) && g.p.discard.some(x => tr(g, x, 'PSIONIC')), async use(g) {
      const e = await pick(g, psi(g).filter(u => !g.c(u).ex), '소진할 사이 에너지'); g.c(e).ex = true; const t = await pick(g, g.p.discard.filter(x => tr(g, x, 'PSIONIC')), '덱에 섞을 카드'); if (t) { g.put(t, 'deck'); g.shuffle(g.p.deck); } } }]
  };
  const psiRes = (gen, label) => [{ gen, label, can: (g, u) => !g.c(u).ex, use: (g, u) => { g.c(u).ex = true; }, async after(g, u) { if (await yes(g, `${g.nm(u)}: 뒤집을까요?`)) flip(g, u); } }];
  S['41002a'] = { permanent: true, mod: { thw: (g, s, t) => t === g.idt() && isPsy(g) ? 1 : 0 }, resources: psiRes('B', '사이 나이프') };
  S['41002b'] = { permanent: true, mod: { atk: (g, s, t) => t === g.idt() && isPsy(g) ? 1 : 0 }, basicAttackPlus: g => isPsy(g) ? { piercing: true } : {}, resources: psiRes('R', '사이 카타나') };
  S['41002a'].onSpent = S['41002b'].onSpent = async (g, u) => { if (g.c(u).zone === 'upgrade' && (idOf(g, u) === '41002a' || !swapped(g)) && await yes(g, `${g.nm(u)}: 자원으로 쓴 뒤 뒤집을까요?`)) flip(g, u); };
  // hero cards
  S['41003'] = { onPlay(g) { if (g.canReady(g.idt())) g.c(g.idt()).ex = false; } }; // Angel (ally)
  S['41004'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { // Flurry of Blades
    const kn = knives(g), ka = katanas(g); await g.playerAttack(g.idt(), ctx.target, 2, { src: u });
    for (let i = 0; i < kn; i++) { const t = await g.chooseTarget('enemy', '칼날 폭풍: 혼란에 빠뜨릴 적', g.idt(), false); if (t) g.giveStatus(t, 'conf', '칼날 폭풍'); }
    for (let i = 0; i < ka; i++) { const t = await g.chooseTarget('enemy', '칼날 폭풍: 피해 2를 줄 적', g.idt(), false); if (t) await g.dealDamage(t, 2, { src: u, byPlayer: true }); }
  } } };
  S['41005'] = { play: { timing: 'hero', label: 'thwart', target: 'thwartable', async resolve(g, u, ctx) { const kn = knives(g), ka = katanas(g); // Mental Detection
    const r = await g.removeThreat(ctx.target, 1 + 2 * kn, { src: u }); g.log(`${g.nm(ctx.target)} 위협 ${r} 제거`); await g.afterThreatRemoved(ctx.target); if (ka) await g.draw(ka); } } };
  S['41006'] = { interrupt: { window: 'wouldTakeAttackDamage', timing: 'hero', label: 'defense', async resolve(g, u, ctx) { // Psionic Redirect
    ctx.prevent += 2 + 2 * katanas(g); g.log(`사이오닉 전환: 피해 ${2 + 2 * katanas(g)} 방지`, 'good'); if (knives(g) && ctx.src && g.c(ctx.src).zone) g.giveStatus(ctx.src, 'conf', '사이오닉 전환'); } } };
  S['41007'] = { interrupt: { window: 'cardRevealed', timing: 'hero', can: (g, u, ctx) => !ctx.cancel && !ctx.cancelAll, async resolve(g, u, ctx) { // Telepathic Suggestion
    ctx.cancel = true; g.log(`텔레파시 암시: ${g.nm(ctx.card)}의 "공개될 때" 효과 취소`, 'good');
    for (let i = 0; i < katanas(g); i++) { const t = await g.chooseTarget('enemy', '피해 2를 줄 적', g.idt(), false); if (t) await g.dealDamage(t, 2, { src: u, byPlayer: true }); }
    for (let i = 0; i < knives(g); i++) await g.removeThreatChoose(1, '위협 1을 제거할 음모', u);
  } } };
  S['41008'] = { actions: [{ timing: 'action', exhaust: true, label: '소진 → [기술] 카드를 손으로', async use(g) { await g.searchToHand(d => (d.tr || []).includes('SKILL'), '훈련 일정'); if (g.isHero() && g.p.hand.length) { const t = await pick(g, g.p.hand.slice(), '버릴 카드 1장'); if (t) g.put(t, 'discard'); } } }] }; // Training Regimen
  S['41009'] = { mod: { def: (g, s, t) => t === g.idt() && isPsy(g) ? 1 : 0 }, respond: [{ window: 'afterHeroDefends', timing: 'hero', label: '버리기 → 사일록 준비', can: g => isPsy(g) && g.c(g.idt()).ex, resolve(g, u) { g.discard(u); if (g.canReady(g.idt())) g.c(g.idt()).ex = false; } }] }; // Martial Arts Training
  const psyIgn = g => isPsy(g) && g.isHero() && g.p.upgrades.some(u => idOf(g, u) === '41010');
  S['41010'] = { ignores: { guard: psyIgn, patrol: psyIgn }, respond: [{ window: 'afterBasicPower', timing: 'hero', label: '버리기 → 적 혼란', can: (g, u, ctx) => ctx.kind === 'thwart' && isPsy(g), async resolve(g, u) { g.discard(u); const t = await g.chooseTarget('enemy', '사이오닉 훈련: 혼란에 빠뜨릴 적', g.idt(), false); if (t) g.giveStatus(t, 'conf', '사이오닉 훈련'); } }] }; // Psionic Training
  S['41011'] = { mod: { retaliate: (g, s, t) => t === g.idt() && isPsy(g) ? 1 : 0 }, respond: [{ window: 'heroAttacked', timing: 'hero', label: '버리기 → [무기] 업그레이드 모두 준비', can: g => isPsy(g) && g.p.upgrades.some(x => tr(g, x, 'WEAPON') && g.c(x).ex), resolve(g, u) { g.discard(u); for (const x of g.p.upgrades) if (tr(g, x, 'WEAPON')) g.c(x).ex = false; } }] }; // Weapons Training
  S['41025'] = { // Body Swapped
    whenRevealed(g, u) { for (const x of psi(g)) { g.c(x).id = '41002b'; g.c(x).ex = true; } g.put(u, 'pobl'); g.log('몸이 바뀜: 사이 에너지가 모두 사이 카타나(소진)', 'warn'); },
    actions: [{ timing: 'alter', label: '손의 [사이오닉] 카드 1장 버림 → 이 카드 버림', can: (g, u) => g.c(u).zone === 'pobl' && g.p.hand.some(x => tr(g, x, 'PSIONIC')), async use(g, u) { const t = await pick(g, g.p.hand.filter(x => tr(g, x, 'PSIONIC')), '버릴 카드'); if (t) { g.put(t, 'discard'); g.discard(u); } } }] };
  S['41026'] = { onAttackStart(g, u, ctx) { ctx.atkBonus = (ctx.atkBonus || 0) + mentalOnCards(g); }, beforeScheme(g, u, ctx) { ctx.reduce -= mentalOnCards(g); } }; // Chimera (nemesis)
  S['41027'] = { whenRevealed(g, u) { g.c(u).threat += g.livingPlayers().reduce((n, i) => n + g.s.ps[i].upgrades.length, 0) + g.inPlay().filter(a => g.c(a).zone === 'attach' && g.d(a).type === 'upgrade').length; } }; // Interdimensional Plunder
  S['41028'] = { attachTo: g => g.idt(), async beforeHeroAttack(g, a, target) { // Psionic Illusion
    const r = await g.ask({ type: 'choice', title: '사이오닉 환영: 자원 유형을 말하세요', options: [{ id: 'Y', label: '[에너지]' }, { id: 'B', label: '[정신]' }, { id: 'R', label: '[물리]' }, { id: 'G', label: '[와일드]' }] });
    if (!g.p.deck.length) await g.reshuffleDeck(); const x = g.p.deck[0]; if (!x) return null; g.put(x, 'discard'); g.log(`사이오닉 환영: ${g.nm(x)} 버림`);
    if ((g.d(x).res || '').includes(r)) return null; g.discard(a, '사이오닉 환영'); const t = await pick(g, g.friendlyChars(), '사이오닉 환영: 대신 공격받을 아군 캐릭터'); g.log('사이오닉 환영: 공격 대상이 아군으로 바뀝니다', 'warn'); return t;
  } };
  S['41029'] = { async whenRevealed(g, u, ctx) { const n = mentalOnCards(g); if (!n) { ctx.surge++; return; } await g.indirectDamage(n, null); }, // Telekinetic Dragon
    async boostEffect(g) { if (g.canAfford({ n: 1, req: 'B' }, null) && (await g.pay({ n: 1, req: 'B' }, null, '★ 염동력 용: [정신] 1 (아니면 혼란)', true)) != null) return; g.giveStatus(g.idt(), 'conf', '★ 염동력 용'); } };
  // aspect / basic
  S['41012'] = { respond: [{ window: 'afterAllyAttack', label: '★ 하수인 공격: 후속 피해 1 회복', can: (g, u, ctx) => ctx.ally === u && g.d(ctx.target).type === 'minion' && g.c(u).dmg > 0, resolve(g, u) { g.heal(u, 1); } }, // Captain Britain
    { window: 'afterAllyThwart', label: '★ 부가 음모 저지: 후속 피해 1 회복', can: (g, u, ctx) => ctx.ally === u && ctx.scheme && g.d(ctx.scheme).type === 'side' && g.c(u).dmg > 0, resolve(g, u) { g.heal(u, 1); } }] };
  S['41013'] = { respond: [{ window: 'afterAllyAttack', label: '★ 혼란 상태의 적을 공격: 카드 1장', can: (g, u, ctx) => ctx.ally === u && g.c(ctx.target).conf, async resolve(g) { await g.draw(1); } }] }; // Cypher
  S['41014'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { g.giveStatus(ctx.target, 'conf', '뇌진탕 일격'); if ((ctx.paid || []).includes('R')) await g.playerAttack(g.idt(), ctx.target, 3, { src: u }); } } }; // Concussive Blow
  S['41015'] = { interrupt: { window: 'heroAttacked', timing: 'hero', can: (g, u, ctx) => !!g.c(ctx.target).zone && ['villain', 'minion'].includes(g.c(ctx.target).zone), resolve(g, u, ctx) { if (g.c(ctx.target).conf) g.giveStatus(ctx.target, 'stun', '머리 강타'); else g.giveStatus(ctx.target, 'conf', '머리 강타'); } } }; // Upside the Head
  S['41016'] = { async whenDefeated(g) { if (g.e.villain) await g.dealDamage(g.e.villain, 5 * g.players, { byPlayer: true }); } }; // Lay the Trap
  S['41017'] = { on: { wouldTakeDamage(g, u, ctx) { if (ctx.byPlayer && g.c(ctx.target) && g.c(ctx.target).conf && ['villain', 'minion'].includes(g.c(ctx.target).zone) && ctx.amount > 0) ctx.amount += 1; } } }; // Float Like a Butterfly
  S['41018'] = { canPlay: g => tr(g, g.idt(), 'X-FORCE'), respond: [{ window: 'treacheryResolved', label: '피트 위즈덤 회복 1', can: (g, u) => g.c(u).dmg > 0, resolve(g, u) { g.heal(u, 1); } }] }; // Pete Wisdom
  S['41019'] = { interrupt: { window: 'heroKeywordAttack', timing: 'hero', can: (g, u, ctx) => !ctx.directed, resolve(g, u, ctx) { ctx.bonus += 2; ctx.directed = true; } } }; // Directed Force
  S['41020'] = { play: { timing: 'hero', async resolve(g) { // Soaring Hearts
    const t = await pick(g, g.p.discard.filter(x => g.d(x).type === 'event' && g.d(x).cls === 'Hero'), '손으로 가져올 고유 이벤트'); if (t) g.put(t, 'hand');
    const nm = x => (g.d(x).en || '').replace(/^\*\s*/, ''); for (const x of g.friendlyChars().filter(x => ['Angel', 'Psylocke'].includes(nm(x)))) if (g.canReady(x)) g.c(x).ex = false;
  } } };
  S['41022'] = { canPlay: g => tr(g, g.idt(), 'X-FORCE'), actions: [{ timing: 'hero', exhaust: true, label: '소진·뒷면 조우 카드 1장 → 카드 2장', async use(g) { const pi = await g.choosePlayer('IPAC: 뒷면 조우 카드를 받고 카드 2장을 뽑을 플레이어'); await g.withPlayer(pi, async () => { const x = g.takeEncounter(); if (x) g.put(x, 'facedown'); await g.draw(2); }); } }] }; // IPAC
  S['41023'] = { actions: [{ timing: 'action', exhaust: true, label: '소진 → 덱 위 X장 중 1장을 손으로 (X: 승리 표시 부가 음모)', can: g => g.livingPlayers().some(i => g.withPlayerSync(i, () => tr(g, g.idt(), 'MUTANT') || ((MC.cards[g.p.alterId] || {}).tr || []).includes('MUTANT'))), async use(g) { // X-Bunker
    const cands = g.livingPlayers().filter(i => g.withPlayerSync(i, () => tr(g, g.idt(), 'MUTANT') || ((MC.cards[g.p.alterId] || {}).tr || []).includes('MUTANT')));
    const pi = cands.length === 1 ? cands[0] : parseInt(await g.ask({ type: 'choice', title: 'X-벙커: 덱을 볼 플레이어', options: cands.map(i => ({ id: String(i), uid: g.idt(i), label: g.playerName(i) })) }), 10);
    await g.withPlayer(pi, async () => {
      const n = (g.e.victory || []).filter(u => ['side', 'pside'].includes(g.d(u).type)).length; const top = g.p.deck.slice(0, n); const t = await pick(g, top, 'X-벙커: 손으로 가져올 카드'); if (t) { g.put(t, 'hand'); g.shuffle(g.p.deck); }
    }); } }] };
  S['41024'] = { canPlay: g => tr(g, g.idt(), 'PSIONIC'), actions: [{ timing: 'hero', kind: 'thwart', exhaust: true, label: '소진·[정신][정신] → 위협 2 제거', cost: { n: 2, req: 'BB' }, can: g => !g.cannotThwart(), async use(g, u) { await g.removeThreatChoose(2, '텔레파시: 위협 2', u); } }] }; // Telepathy
  S['41030'] = { canPlay: g => tr(g, g.idt(), 'PSIONIC'), play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { await g.playerAttack(g.idt(), ctx.target, 4, { src: u, ranged: true }); } } }; // Psi-Bow Attack
  S['41031'] = { respond: [{ window: 'allyPowerUsed', label: '★ 손 카드와 덱 맨 위 카드 교체', can: (g, u, ctx) => ctx.ally === u && g.p.hand.length && g.p.deck.length, async resolve(g) { const t = await pick(g, g.p.hand.slice(), '바꿀 손 카드'); if (!t) return; const top = g.p.deck[0]; g.put(top, 'hand'); g.put(t, 'deck', null, true); } }] }; // Domino (ally)
  S['41032'] = { canPlay: g => tr(g, g.idt(), 'PSIONIC'), interrupt: { window: 'afterHeroDefends', timing: 'hero', label: 'attack', can: (g, u, ctx) => !!g.c(ctx.enemy).zone, async resolve(g, u, ctx) { await g.playerAttack(g.idt(), ctx.enemy, 3, { src: u }); if (g.c(ctx.enemy).zone && ['villain', 'minion'].includes(g.c(ctx.enemy).zone)) g.giveStatus(ctx.enemy, 'stun', '사이 플레일'); } } }; // Psi-Flail Strike
  S['41033'] = { canPlay: g => tr(g, g.idt(), 'PSIONIC'), actions: [{ timing: 'hero', kind: 'attack', exhaust: true, label: '소진·[정신][정신] → 적에게 피해 3', cost: { n: 2, req: 'BB' }, async use(g, u) { const t = await g.chooseTarget('attackable', '염동력: 대상', g.idt(), false); if (t) await g.playerAttack(g.idt(), t, 3, { src: u }); } }] }; // Telekinesis

  MC.registerScripts(S);
})();
