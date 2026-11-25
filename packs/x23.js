/* X-23 (43001-43040): Living Weapon, Honey Badger, Aggression X-Force cards, Specialized Training and her nemesis set.
   Ported from cards/pack/x23 of the community build. */
(function () {
  'use strict';
  const S = {};
  const idOf = (g, u) => g.c(u).id;
  const tr = (g, u, t) => (g.d(u).tr || []).includes(t) || g.hasTrait(u, t);
  const pick = async (g, cands, title) => !cands.length ? null : cands.length === 1 ? cands[0] : await g.ask({ type: 'target', title, cands, cancelable: false });
  const isX = g => ['43001a', '43001b'].includes(idOf(g, g.idt()));
  const badger = g => g.p.allies.find(a => idOf(g, a) === '43003') || null;
  const victorySides = g => (g.e.victory || []).filter(u => ['side', 'pside'].includes(g.d(u).type)).length;
  const roundMod = (g, u, key, n) => { const c = g.c(u); c.rm = c.rm || {}; c.rm[key] = (c.rm[key] || 0) + n; };

  // identity
  S['43001a'] = { on: { afterTakeDamage(g, u, ctx) { if (ctx.target === g.idt() && g.isHero() && isX(g) && g.c(g.idt()).ex && !g.p.phase.livingWeapon && g.canReady(g.idt())) { g.p.phase.livingWeapon = true; g.c(g.idt()).ex = false; g.log('살아있는 무기: X-23 준비', 'good'); } } } };
  S['43001b'] = {
    setup(g) { const c = (g.p.pset || []).concat(g.p.deck, g.p.discard).find(u => idOf(g, u) === '43002'); if (c) { g.put(c, 'upgrade'); g.shuffle(g.p.deck); g.log('준비: X-23의 클로'); } },
    actions: [{ timing: 'action', once: true, label: '허니 배저 또는 자매의 유대를 덱에 섞기 → 카드 1장', can: g => g.p.discard.some(x => ['43003', '43007'].includes(idOf(g, x))), async use(g) {
      const t = await pick(g, g.p.discard.filter(x => ['43003', '43007'].includes(idOf(g, x))), '덱에 섞을 카드'); if (t) { g.put(t, 'deck'); g.shuffle(g.p.deck); await g.draw(1); } } }]
  };
  // hero cards
  S['43002'] = { permanent: true, actions: [{ timing: 'hero', exhaust: true, label: '소진·피해 2 → 라운드 끝까지 공격 +2', can: g => isX(g), async use(g) { await g.dealDamage(g.idt(), 2, {}); if (g.c(g.idt()).zone) roundMod(g, g.idt(), 'atk', 2); g.log('X-23의 클로: 공격 +2', 'good'); } }] };
  S['43003'] = { on: { afterTakeDamage(g, u, ctx) { if (ctx.target === u && g.c(u).zone === 'ally' && g.isHero() && g.c(g.idt()).ex && g.canReady(g.idt())) { g.c(g.idt()).ex = false; g.log('허니 배저: X-23 준비', 'good'); } } } }; // Honey Badger
  S['43004'] = { interrupt: { window: 'basicPowerUsed', timing: 'hero', can: (g, u, ctx) => ctx.kind === 'thwart' && isX(g), resolve(g, u, ctx) { ctx.bonus += g.stat(g.idt(), 'atk'); } } }; // Animal Instinct
  S['43005'] = { play: { timing: 'hero', can: g => !g.p.usedOnce.clawMastery, resolve(g) { g.p.usedOnce.clawMastery = true; roundMod(g, g.idt(), 'atk', 2); g.p.clawMasteryRound = g.s.round; g.log('클로 숙련: 라운드 끝까지 공격 +2', 'good'); } } }; // Claw Mastery
  S['43006'] = { play: { timing: 'action', async resolve(g) { for (let i = 0; i < 4; i++) { const c = [g.idt(), badger(g)].filter(x => x && g.c(x).dmg > 0); const t = await pick(g, c, `재생의 장수: 회복 1 (${i + 1}/4)`); if (!t) break; g.heal(t, 1); } } } }; // Regenerative Longevity
  S['43007'] = { interrupt: { window: 'allyPowerUsed', timing: 'hero', can: (g, u, ctx) => idOf(g, ctx.ally) === '43003', resolve(g, u, ctx) { ctx.bonus += g.stat(g.idt(), ctx.kind === 'attack' ? 'atk' : 'thw'); } } }; // Sisterly Bond
  S['43008'] = { actions: [{ timing: 'action', exhaust: true, label: '소진·X-23 카드 1장 버림 → 허니 배저를 손으로', can: g => g.p.hand.some(x => g.d(x).cls === 'Hero'), async use(g) { // Sisterhood
    const t = await pick(g, g.p.hand.filter(x => g.d(x).cls === 'Hero'), '버릴 X-23 카드'); if (t) g.put(t, 'discard'); await g.searchToHand(d => d.id === '43003', '자매애', { discard: true }); } }] };
  S['43009'] = { mod: { hp: (g, s, t) => t === g.idt() ? 2 : 0, retaliate: (g, s, t) => t === g.idt() && g.isHero() && isX(g) ? 1 : 0 }, basicAttackPlus: g => isX(g) ? { piercing: true } : {} }; // Adamantium Lacing
  S['43010'] = { resources: [{ gen: 'G', label: '굳은 결의 (피해 1)', can: (g, u) => !g.c(u).ex, use: (g, u) => { g.c(u).ex = true; g.c(g.idt()).dmg += 1; g.log('굳은 결의: 피해 1', 'warn'); g.e.needDefeatCheck = true; } }] }; // Grim Resolve
  S['43011'] = { respond: [{ window: 'cardPlayedDone', label: '회복 1', can: (g, u, ctx) => ctx.card && g.d(ctx.card).cls === 'Hero' && g.c(g.idt()).dmg > 0, resolve(g) { g.heal(g.idt(), 1); } }] }; // Pain Tolerance
  S['43012'] = { attach: { kind: 'enemy', filter: (g, t) => (g.p.phase.x23Hit || []).includes(t) }, mod: { atk: (g, s, t) => t === g.c(s).on ? -1 : 0 }, // Puncture Wound
    on: { async turnBegins(g, u) { const h = g.c(u).on; if (g.c(u).zone !== 'attach') return; g.discard(u, '관통상'); if (h && g.c(h).zone) await g.dealDamage(h, 3, { byPlayer: true }); } } };
  // remember enemies X-23 / Honey Badger attacked this phase (Puncture Wound)
  S['43001a'].on.afterAttack = (g, u, ctx) => { if (ctx.attacker === g.idt() || (ctx.attacker && idOf(g, ctx.attacker) === '43003')) (g.p.phase.x23Hit = g.p.phase.x23Hit || []).push(ctx.target); };
  S['43003'].on.afterAttack = S['43001a'].on.afterAttack;
  S['43028'] = { // Self-Isolation
    async whenRevealed(g, u) { const b = g.p.hand.concat(g.p.deck, g.p.discard, g.p.allies).find(x => idOf(g, x) === '43003');
      if (!b) { g.discard(u); const x = g.takeEncounter(); if (x) g.put(x, 'facedown'); return; } for (const a of g.c(b).att.slice()) g.discard(a); g.resetCard(b); g.put(u, 'pobl'); g.put(b, 'under', u); g.c(b).fd = true; g.log('고립: 허니 배저를 이 카드 밑에 둡니다', 'warn'); },
    on: { afterRecover(g, u) { if (g.c(u).zone !== 'pobl') return; for (const x of g.c(u).under.slice()) { delete g.c(x).fd; g.put(x, 'discard'); } g.discard(u, '고립 해제'); } } };
  // nemesis
  S['43029'] = { async whenDefeated(g) { const x = g.takeEncounter(); if (!x) return; const n = g.boostOf(x); g.put(x, 'ediscard'); if (n) await g.indirectDamage(n, null); } }; // Lady Deathstrike
  S['43030'] = { mod: { retaliate: (g, s, t) => g.c(s).zone === 'side' && g.enemies().includes(t) ? 1 : 0 } }; // In the Name of Vengeance
  S['43031'] = { attachTo: g => g.e.minions.find(m => idOf(g, m) === '43029') || null, // Cybermods
    async whenRevealed(g, u) { if (g.c(u).zone === 'attach') return; for (let i = 0; i < 80; i++) { const x = g.takeEncounter(); if (!x) break; if (g.d(x).type === 'minion') { await g.enterMinion(x, {}); if (g.c(x).zone === 'minion') g.attachEnc(u, x); return; } g.put(x, 'ediscard'); } g.discard(u); },
    on: { hostWouldBeDefeated(g, a, wctx) { const m = g.c(a).on; if (wctx.target !== m || wctx.saved) return; wctx.saved = true; g.forceDiscard = true; g.discard(a); g.forceDiscard = false; g.resetCard(m); g.put(m, 'edeck'); g.shuffle(g.e.deck); g.log('사이버 개조: 하수인을 조우 덱에 섞습니다', 'warn'); } } };
  S['43032'] = { attachTo: g => g.idt(), on: { async playerPhaseEnd(g, u) { if (g.c(u).on !== g.idt()) return; g.discard(u, '치명상'); await g.dealDamage(g.idt(), 4, {}); } } }; // Critical Wound
  S['43033'] = { async whenRevealed(g) { if (!g.p.hand.length) return; const x = g.p.hand[Math.floor(g.rand() * g.p.hand.length)]; g.put(x, 'discard'); const n = (g.d(x).res || '').length; g.log(`난도질: ${g.nm(x)} 버림, 피해 ${n}`, 'warn'); if (n) await g.dealDamage(g.idt(), n, {}); } };
  S['43033'].boostEffect = S['43033'].whenRevealed;
  // aspect / basic
  S['43013'] = { actions: [{ timing: 'action', exhaust: true, label: '소진 → 붐 카운터 1 (버리면 카운터마다 각 적에게 피해 1)', async use(g, u) { // Boom Boom
    g.c(u).cnt.boom = (g.c(u).cnt.boom || 0) + 1; const n = g.c(u).cnt.boom;
    if ((await g.ask({ type: 'choice', title: `붐붐: 버리고 각 적에게 피해 ${n}을 줄까요?`, options: [{ id: 'y', label: '예' }, { id: 'n', label: '아니요' }] })) === 'y') { g.discard(u); for (const e of g.enemies().slice()) await g.dealDamage(e, n, { src: u, byPlayer: true }); } } }] };
  S['43014'] = { respond: [{ window: 'afterAllyAttack', label: '★ 덱 맨 위 버림 → 자원마다 하수인 모두 피해 1', can: (g, u, ctx) => ctx.ally === u, async resolve(g, u) { // Rictor
    if (!g.p.deck.length) await g.reshuffleDeck(); const x = g.p.deck[0]; if (!x) return; g.put(x, 'discard'); const n = (g.d(x).res || '').length; for (const m of g.engagedMinions().slice()) await g.dealDamage(m, n, { src: u, byPlayer: true }); } }] };
  S['43015'] = { respond: [{ window: 'allyPowerUsed', label: '★ 하수인 공격 +1', can: (g, u, ctx) => ctx.ally === u && ctx.kind === 'attack' && ctx.target && g.d(ctx.target).type === 'minion', resolve(g, u, ctx) { ctx.bonus += 1; } }] }; // Shatterstar
  S['43016'] = { interrupt: { window: 'heroAttacked', timing: 'hero', can: (g, u, ctx) => victorySides(g) > 0 && !!g.c(ctx.target).zone && ['villain', 'minion'].includes(g.c(ctx.target).zone), resolve(g, u, ctx) { g.giveStatus(ctx.target, 'stun', '치명타'); } } }; // Critical Hit
  S['43018'] = { async whenDefeated(g) { const r = await g.removeThreat(g.e.main, 5 * g.players, { src: g.idt() }); g.log(`주의 끌기: 주 음모 위협 ${r} 제거`, 'good'); } }; // Keep Them Busy
  S['43019'] = { mod: { atk: (g, s, t) => t === g.idt() && g.isHero() && g.hpLeft(t) < g.maxHp(t) / 2 ? 1 : 0, thw: (g, s, t) => t === g.idt() && g.isHero() && g.hpLeft(t) < g.maxHp(t) / 2 ? -1 : 0 } }; // "Now I'm Mad"
  S['43020'] = { grantAssault: true, attach: { kind: 'anyScheme', filter: (g, t) => g.c(t).zone === 'side' && !g.d(t).permanent && !g.c(t).att.some(a => g.c(a).id === '43020') } }; // The Direct Approach: the attached side scheme gains assault
  const SPEC = ['43034', '43035', '43036', '43037'];
  S['43021'] = { async whenDefeated(g) { const used = new Set(g.livingPlayers().flatMap(i => g.s.ps[i].upgrades.map(u => idOf(g, u)).filter(id => SPEC.includes(id)))); await g.forEachPlayer(async () => { if (g.p.upgrades.some(u => SPEC.includes(idOf(g, u)))) return; // Specialized Training
    const avail = SPEC.filter(id => !used.has(id)); if (!avail.length) return;
    const opts = avail.map(id => ({ id, label: MC.cards[id].name })); const id = await g.ask({ type: 'choice', title: `전문 훈련(${g.playerName()}): 플레이에 놓을 [전문화] 업그레이드`, options: opts }); const pickId = id || avail[0]; used.add(pickId); const u = g.newCard(pickId, null, { owner: g.s.ctx }); g.put(u, 'upgrade'); g.log(`전문 훈련(${g.playerName()}): ${g.nm(u)}`, 'good'); }); } };
  const specDraw = (kind) => ({ respond: [{ window: 'afterBasicPower', timing: 'hero', exhaust: true, label: '소진 → 카드 1장', can: (g, u, ctx) => ctx.kind === kind, async resolve(g) { await g.draw(1); } }] });
  S['43034'] = Object.assign({ mod: { atk: (g, s, t) => t === g.idt() && g.isHero() ? 1 : 0 } }, specDraw('attack'));
  S['43035'] = Object.assign({ mod: { def: (g, s, t) => t === g.idt() && g.isHero() ? 1 : 0 } }, specDraw('defend'));
  S['43036'] = { mod: { hp: (g, s, t) => t === g.idt() ? 4 : 0 }, respond: [{ window: 'tookAttackDamage', exhaust: true, label: '소진 → 카드 1장', can: (g, u, ctx) => ctx.target === g.idt(), async resolve(g) { await g.draw(1); } }] };
  S['43037'] = Object.assign({ mod: { thw: (g, s, t) => t === g.idt() && g.isHero() ? 1 : 0 } }, specDraw('thwart'));
  S['43038'] = { interrupt: { window: 'cardRevealed', timing: 'hero', can: (g, u, ctx) => victorySides(g) > 0 && g.d(ctx.card).type === 'treachery' && !ctx.cancel, resolve(g, u, ctx) { ctx.cancel = true; g.log('예측된 술수: "공개될 때" 효과 취소', 'good'); } } }; // Predictable Ploy
  S['43039'] = { whenDefeated(g) { for (const a of g.allAllies()) g.heal(a, 2); } }; // Rally the Troops
  S['43040'] = { interrupt: { window: 'enemyAttackInitiated', timing: 'hero', label: 'defense', can: g => victorySides(g) > 0, resolve(g) { g.giveStatus(g.idt(), 'tough', '예상된 공격'); } } }; // Anticipated Attack

  MC.registerScripts(S);
})();
