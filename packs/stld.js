/* Star-Lord (17001-17031): his hero set, Leadership cards and nemesis set.
   Ported from cards/pack/stld of the community build. "Facedown encounter cards in front of you" are the cards
   dealt to you that wait to be revealed in the villain phase. */
(function () {
  'use strict';
  const S = {};
  const fd = g => g.p.facedown.length;
  const dealFacedown = g => { const x = g.takeEncounter(); if (x) { g.put(x, 'facedown'); g.log('조우 카드 1장을 뒷면으로 받았습니다', 'warn'); } };
  async function dmgEnemy(g, n, title, src, attack) {
    const t = await g.chooseTarget(attack ? 'attackable' : 'enemy', title, src, false); if (!t) return null;
    if (attack) await g.playerAttack(g.idt(), t, n, { src }); else await g.dealDamage(t, n, { src, byPlayer: true });
    return t;
  }
  const aerialId = g => g.hasTrait(g.idt(), 'AERIAL');
  const guardianId = g => g.hasTrait(g.idt(), 'GUARDIAN');
  const elementGun = g => g.controlled().find(x => g.c(x).id === '17007');

  // ======================= identity =======================
  S['17001a'] = {
    grantTrait: (g, self, t) => g.p.allies.includes(t) ? 'GUARDIAN' : null,
    playDiscount: (g, u, uid) => g.p.usedOnce.wcgw ? 0 : 3,
    respond: [{ window: 'playingCard', label: '"뭐가 잘못되겠어?": 조우 카드 1장 받기 → 비용 3 감소 (라운드당 1번)', can: (g, u, ctx) => !g.p.usedOnce.wcgw && ctx.cost.n > 0,
      async resolve(g, u, ctx) { g.p.usedOnce.wcgw = true; dealFacedown(g); ctx.reduce += 3; } }]
  };
  S['17001b'] = {
    async setup(g) { const ok = await g.searchToHand(d => d.id === '17007', '원소 총', { discard: true }); if (!ok) g.log('원소 총을 찾지 못했습니다'); },
    actions: [{ timing: 'alter', once: true, label: '손의 카드 1장을 덱 맨 위 카드와 맞바꾸기', can: g => g.p.hand.length > 0 && g.p.deck.length > 0,
      async use(g) {
        const t = await g.ask({ type: 'target', title: '말재주: 덱 맨 위와 바꿀 카드', cands: g.p.hand.slice(), cancelable: false });
        const top = g.p.deck[0]; g.put(t, 'deck', null, true); g.put(top, 'hand'); g.log(`${g.nm(t)} ↔ 덱 맨 위 ${g.nm(top)}`);
      } }]
  };

  // ======================= hero cards =======================
  S['17002'] = { async onPlay(g) { // Nova Prime
    const c = g.e.minions.filter(m => !g.hasTrait(m, 'ELITE')); if (!c.length) return;
    const t = c.length === 1 ? c[0] : await g.ask({ type: 'target', title: '노바 프라임: 격파할 (간부 아닌) 하수인', cands: c, cancelable: false });
    g.log(`노바 프라임: ${g.nm(t)} 격파`, 'good'); await g.defeat(t, { byPlayer: true });
  } };
  S['17003'] = { play: { timing: 'hero', async resolve(g) { dealFacedown(g); const id = g.idt(); if (g.canReady(id)) g.c(id).ex = false; await g.draw(1); } } }; // Daring Escape
  S['17004'] = { play: { timing: 'hero', label: 'thwart', target: 'thwartable', async resolve(g, u, ctx) { // Gutsy Move
    const n = 2 + 2 * fd(g); const r = await g.removeThreat(ctx.target, n, { src: u }); g.log(`무모한 행동: ${g.nm(ctx.target)} 위협 ${r} 제거`); await g.afterThreatRemoved(ctx.target);
  } } };
  S['17005'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', can: g => !!elementGun(g), async resolve(g, u, ctx) { await g.playerAttack(g.idt(), ctx.target, 5 + 2 * fd(g), {}); } } }; // Sliding Shot
  S['17006'] = { respond: [{ window: 'wouldTakeAttackDamage', timing: 'hero', label: '버리기 → 이 피해를 모두 방지, 일상 모습으로 바꾸고 2장 뽑기', can: (g, u, ctx) => ctx.src === g.e.villain && ctx.amount - ctx.prevent > 0, // Bad Boy
    async resolve(g, u, ctx) { g.discard(u); ctx.prevent = ctx.amount; if (g.isHero() && !g.formLocked()) { g.flip(true); await g.trigger('formChanged', { form: g.p.form }); } await g.draw(2); } }] };
  S['17007'] = { actions: [{ timing: 'hero', exhaust: true, label: '소진·자원 1 → 적에게 피해 3 (관통)', cost: { n: 1, req: '' }, can: g => g.targets('attackable').length > 0, // Element Gun
    async use(g, u) { if (await g.statusBlocks('attack')) return; const t = await g.chooseTarget('attackable', '원소 총: 대상', u, false); if (t) await g.playerAttack(g.idt(), t, 3, { piercing: true }); } }] };
  S['17008'] = { // Jet Boots
    grantTrait: (g, self, t) => t === g.idt() && g.isHero() ? 'AERIAL' : null,
    respond: [{ window: 'identityWouldTakeDamage', timing: 'hero', exhaust: true, label: '소진 → 뒷면 조우 카드 1장마다 피해 1 방지', can: (g, u, ctx) => fd(g) > 0 && ctx.amount - ctx.prevent > 0,
      async resolve(g, u, ctx) { ctx.prevent += fd(g); } }]
  };
  S['17009'] = { mod: { thw: (g, self, t) => g.friendlyChars().includes(t) && g.hasTrait(t, 'GUARDIAN') && (t !== g.idt() || g.isHero()) ? 1 : 0 } }; // Leader of the Guardians
  S['17010'] = { mod: { hs: (g, self, t) => t === g.idt() && g.isHero() ? Math.min(3, fd(g)) : 0 } }; // Star-Lord's Helmet
  S['17024'] = { async whenRevealed(g, u) { // Banishment
    await g.heroObligation(u, '추방', '플레이 중인 원소 총 버림 (없으면 주 음모에 위협 3) → 이 카드 버림', async () => {
      const gun = elementGun(g); if (gun) g.discard(gun, '원소 총 버림'); else if (g.e.main) await g.placeThreat(g.e.main, 3, {});
      if (g.c(u).zone === 'limbo') g.discard(u);
    });
  } };
  S['17026'] = { on: { treacheryRevealing(g, u, ctx) { // Mister Knife
    if (g.s.phase !== 'villain' || g.p.usedOnce.knife || g.c(u).zone !== 'minion' || (g.c(u).eng ?? 0) !== g.s.ctx) return;
    g.p.usedOnce.knife = true; ctx.surge++; g.log('미스터 나이프: 이번 빌런 단계 첫 배반 카드에 쇄도', 'warn');
  } } };
  S['17027'] = { async whenRevealed(g, u) { await g.discardRandomHand(1); await g.dealDamage(g.idt(), 1, { src: u }); if (g.e.main) await g.placeThreat(g.e.main, 1, {}); } }; // Spartoi Cunning

  // ======================= Leadership / Basic / aerial events =======================
  S['17011'] = { respond: ['afterAllyAttack', 'afterAllyThwart'].map(w => ({ window: w, label: '무작위로 손에서 1장 버리고 자원에 따라 효과', can: (g, u, ctx) => ctx.ally === u && g.p.hand.length > 0, // Adam Warlock
    async resolve(g, u) {
      const x = g.p.hand[Math.floor(g.rand() * g.p.hand.length)]; g.put(x, 'discard'); const r = g.d(x).res || ''; g.log(`아담 워록: ${g.nm(x)} 버림 (${r || '자원 없음'})`);
      const fx = { R: async () => { if (g.targets('thwartable').length) await g.removeThreatChoose(3, '위협 3을 제거할 음모', u); },
        Y: async () => { g.heal(g.idt(), 3); },
        B: async () => { if (g.enemies().length) await dmgEnemy(g, 3, '피해 3을 줄 적', u); } };
      let k = r.includes('G') ? await g.ask({ type: 'choice', title: '와일드: 효과 고르기', options: [{ id: 'R', label: '위협 3 제거' }, { id: 'Y', label: '정체성 피해 3 회복' }, { id: 'B', label: '적에게 피해 3' }] }) : r[0];
      if (fx[k]) await fx[k]();
    } })) };
  S['17012'] = { respond: [{ window: 'afterAttackDefeat', label: '주 음모 위협 2 제거', can: (g, u, ctx) => ctx.attacker === u && ctx.type === 'minion' && g.c(g.e.main).threat > 0, async resolve(g, u) { await g.removeThreat(g.e.main, 2, { src: u }); } }] }; // Beta Ray Bill
  S['17013'] = { basicAttackProps: { ranged: true } }; // Yondu
  S['17014'] = { play: { timing: 'hero', can: g => g.enemies().length > 0, async resolve(g, u) { // Air Supremacy
    const x = g.friendlyChars().filter(f => g.hasTrait(f, 'AERIAL')).length; if (!x) return;
    const c = g.enemies(); const sel = c.length <= x ? c : await g.ask({ type: 'select', title: `피해 3을 줄 적 (최대 ${x})`, cards: c, min: 0, max: x, confirm: '확정' });
    for (const t of (sel || [])) await g.dealDamage(t, 3, { src: u, byPlayer: true });
  } } };
  S['17015'] = { play: { timing: 'hero', can: g => !g.p.usedOnce.blaze, async resolve(g) { // Blaze of Glory
    g.p.usedOnce.blaze = true;
    (g.p.phase.traitMods = g.p.phase.traitMods || []).push({ tr: 'GUARDIAN', thw: 2, atk: 2 });
    (g.p.phase.endTraitDamage = g.p.phase.endTraitDamage || []).push({ tr: 'GUARDIAN', n: 1 });
    g.log('영광의 불꽃: 이번 단계 동안 가디언 캐릭터 저지·공격 +2 (단계 끝에 피해 1)', 'good');
  } } };
  S['17017'] = { respond: [{ window: 'allyPowerUsed', label: '버리기 → 이번 공격 +2', can: (g, u, ctx) => ctx.kind === 'attack' && g.c(ctx.ally).att.some(a => g.d(a).type === 'upgrade' && g.hasTrait(a, 'WEAPON')), // Target Practice
    async resolve(g, u, ctx) { g.discard(u); ctx.bonus += 2; } }] };
  S['17019'] = { attach: { kind: 'ally', filter: (g, t) => g.hasTrait(t, 'GUARDIAN') && !g.c(t).att.some(a => g.c(a).id === '17019') }, // Laser Blaster
    mod: { atk: (g, self, t) => t === g.c(self).on ? 1 : 0 }, grantOverkill: true };
  S['17020'] = { respond: [{ window: 'allyPowerUsed', label: '카드 종류를 말하고 덱 맨 위 카드 버리기 (맞으면 후속 피해 없음)', can: (g, u, ctx) => ctx.ally === u && g.p.deck.length + g.p.discard.length > 0, // Cosmo
    async resolve(g, u, ctx) {
      const types = [['ally', '동료'], ['event', '이벤트'], ['support', '지원'], ['upgrade', '업그레이드'], ['resource', '자원']];
      const k = await g.ask({ type: 'choice', title: '코스모: 카드 종류', options: types.map(([id, label]) => ({ id, label })) });
      if (!g.p.deck.length) await g.reshuffleDeck(); const x = g.p.deck[0]; if (!x) return;
      g.put(x, 'discard'); const hit = g.d(x).type === k; g.log(`코스모: ${g.nm(x)} — ${hit ? '맞음, 후속 피해 없음' : '틀림'}`);
      if (hit) ctx.noCons = true;
    } }] };
  S['17021'] = { actions: [{ timing: 'hero', exhaust: true, label: '소진·자원 2 → 가디언 캐릭터 준비', cost: { n: 2, req: '' }, can: g => g.friendlyChars().some(f => g.c(f).ex && g.hasTrait(f, 'GUARDIAN')), // C.I.T.T.
    async use(g) { const c = g.friendlyChars().filter(f => g.c(f).ex && g.hasTrait(f, 'GUARDIAN')); const t = c.length === 1 ? c[0] : await g.ask({ type: 'target', title: '준비시킬 가디언 캐릭터', cands: c, cancelable: false }); if (g.canReady(t)) { g.c(t).ex = false; g.log(`${g.nm(t)} 준비`); } } }] };
  S['17022'] = { canPlay: guardianId, allyLimit: 1, // Knowhere
    on: { async cardPlayed(g, u, ctx) { if (g.c(u).ex || g.d(ctx.card).type !== 'ally' || !g.hasTrait(ctx.card, 'GUARDIAN') && !(g.d(ctx.card).tr || []).includes('GUARDIAN')) return; g.c(u).ex = true; g.log('노웨어: 가디언 동료 플레이 → 카드 1장 뽑기'); await g.draw(1); } } };
  S['17023'] = { actions: [{ timing: 'hero', label: '버리기 → 조우 덱 위 2장의 강화 아이콘만큼 적에게 피해', can: g => g.targets('attackable').length > 0, // Pulse Grenade
    async use(g, u) {
      g.discard(u); if (await g.statusBlocks('attack')) return;
      const t = await g.chooseTarget('attackable', '펄스 수류탄: 대상', u, false); if (!t) return;
      const n = await g.countBoost(g.discardEncounterN(2)); if (n) await g.playerAttack(g.idt(), t, n, {}); else g.log('펄스 수류탄: 강화 아이콘 없음');
    } }] };
  S['17028'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', can: aerialId, async resolve(g, u, ctx) { // Dive Bomb
    const others = g.enemies().filter(x => x !== ctx.target);
    await g.playerAttack(g.idt(), ctx.target, 7, {});
    for (const x of others) if (g.c(x).zone) await g.playerAttack(g.idt(), x, 1, {});
  } } };
  S['17029'] = { play: { timing: 'hero', label: 'thwart', can: g => aerialId(g) && g.targets('thwartable').length > 0, async resolve(g, u) { // Agile Flight
    for (let i = 0; i < 5; i++) {
      const t = await g.chooseTarget('thwartable', `민첩한 비행: 위협 1을 제거할 음모 (${i + 1}/5, 취소하면 끝)`, u, true); if (!t) return;
      await g.removeThreat(t, 1, { src: u }); await g.afterThreatRemoved(t);
    }
  } } };
  S['17030'] = { play: { timing: 'hero', can: aerialId, async resolve(g, u) { const id = g.idt(); if (g.canReady(id)) g.c(id).ex = false; if (g.e.main) await g.removeThreat(g.e.main, 2, { src: u }); } } }; // Ever Vigilant

  MC.registerScripts(S);
})();
