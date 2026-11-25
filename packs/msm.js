/* Ms. Marvel hero pack (05001-05033), ported from cards/pack/msm of the community build. */
(function () {
  'use strict';
  const S = {};
  const isPersona = (g, u) => g.d(u).type === 'support' && g.hasTrait(u, 'PERSONA');
  const evTrait = (g, u, ...t) => g.d(u).type === 'event' && t.some(x => g.hasTrait(u, x));
  const statPlus = (key, n, cond) => ({ [key]: (g, self, t) => (t === g.idt() && g.c(self).zone && (!cond || cond(g))) ? n : 0 });

  // ======================= Ms. Marvel =======================
  S['05001a'] = { // Morphogenetics
    respond: [{ window: 'afterEventPlayed', label: '미즈 마블 소진 → 그 이벤트를 손으로', can: (g, u, ctx) => u === g.idt() && !g.c(u).ex && evTrait(g, ctx.card, 'ATTACK', 'THWART', 'DEFENSE'),
      resolve(g, u, ctx) { g.c(u).ex = true; g.put(ctx.card, 'hand'); g.log(`형태 변환: ${g.nm(ctx.card)}을(를) 손으로 되돌립니다`, 'good'); } }]
  };
  S['05001b'] = { // Kamala Khan — Teen Spirit
    actions: [{ timing: 'action', once: true, label: '미즈 마블 카드가 나올 때까지 덱을 버리고 손으로',
      async use(g) {
        for (let i = 0; i < 60; i++) {
          if (!g.p.deck.length) await g.reshuffleDeck();
          const u = g.p.deck[0]; if (!u) return;
          if (g.d(u).cls === 'Hero') { g.put(u, 'hand'); g.log(`십대의 열정: ${g.nm(u)}을(를) 손으로`, 'good'); return; }
          g.put(u, 'discard'); g.log(`덱 맨 위 ${g.nm(u)} 버림`);
        }
      } }]
  };
  S['05002'] = { // Red Dagger
    async wouldBeDefeated(g, u, w) {
      const cost = { n: 2, req: '', distinct: true };
      if (!g.enemies().length || !g.canAfford(cost, null)) return;
      const ok = await g.ask({ type: 'choice', title: '레드 대거가 쓰러지려 합니다', options: [{ id: 'yes', label: '서로 다른 자원 2개 → 적에게 피해 2, 손으로 되돌림' }, { id: 'no', label: '그대로 쓰러짐' }] });
      if (ok !== 'yes') return;
      const paid = await g.pay(cost, null, '레드 대거: 서로 다른 종류 자원 2개', true); if (paid == null) return;
      w.saved = true; g.resetCard(u); g.put(u, 'hand'); g.log('레드 대거: 손으로 돌아갑니다', 'good');
      const t = await g.chooseTarget('enemy', '레드 대거: 피해 2를 줄 적', u, false);
      if (t) await g.dealDamage(t, 2, { src: u, byPlayer: true });
    }
  };
  S['05003'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { await g.playerAttack(g.idt(), ctx.target, 4, {}); } } }; // Big Hands
  S['05004'] = { // Sneak By
    play: { timing: 'hero', label: 'thwart', target: 'thwartable',
      async resolve(g, u, ctx) { const r = await g.removeThreat(ctx.target, 3, { src: u }); g.log(`몰래 지나가기: ${g.nm(ctx.target)} 위협 ${r} 제거`); await g.afterThreatRemoved(ctx.target); } }
  };
  S['05005'] = { // Wiggle Room
    interrupt: { window: 'identityWouldTakeDamage', timing: 'hero', can: (g, u, ctx) => ctx.amount > ctx.prevent,
      async resolve(g, u, ctx) { ctx.prevent += 3; g.log('비좁은 틈: 피해 3 방지', 'good'); await g.draw(1); } }
  };
  S['05006'] = { // Aamir Khan
    actions: [{ timing: 'alter', exhaust: true, label: '소진 → 버림 더미 1장을 덱 맨 아래에, 카드 1장 뽑기', can: g => g.p.discard.length > 0,
      async use(g) {
        const x = (await g.pickCards(g.p.discard.slice(), '아미르 칸: 덱 맨 아래로 보낼 카드', 1, 1))[0];
        if (x) { g.put(x, 'deck'); g.log(`${g.nm(x)}을(를) 덱 맨 아래로`); }
        await g.draw(1);
      } }]
  };
  S['05007'] = { // Bruno Carrelli
    actions: [
      { timing: 'alter', exhaust: true, label: '소진 → 손의 카드 1장을 뒷면으로 보관', can: g => g.p.hand.length > 0,
        async use(g, u) { const x = (await g.pickCards(g.p.hand.slice(), '브루노 카렐리: 맡겨 둘 카드', 1, 1))[0]; if (x) { g.put(x, 'under', u); g.log('카드 1장을 브루노에게 맡겼습니다'); } } },
      { timing: 'action', exhaust: true, label: '소진 → 맡긴 카드 최대 3장을 손으로', can: (g, u) => g.c(u).under.length > 0,
        async use(g, u) { const sel = await g.pickCards(g.c(u).under.slice(), '브루노 카렐리: 손으로 가져올 카드 (최대 3장)', 1, 3); sel.forEach(x => g.put(x, 'hand')); g.log(`맡긴 카드 ${sel.length}장을 손으로`, 'good'); } }
    ]
  };
  S['05008'] = { // Nakia Bahadir
    actions: [{ timing: 'alter', exhaust: true, label: '소진 → 이번 단계 다음 카드 비용 -1', can: g => !g.p.costRed, use(g) { g.p.costRed = 1; g.log('나키아 바하디르: 다음 카드 비용 -1'); } }]
  };
  S['05009'] = { // Biokinetic Polymer Suit
    resources: [{ gen: 'G', label: '생체역학 폴리머 슈트 (이벤트 전용)', can: (g, u) => g.isHero() && !g.c(u).ex, forOnly: (g, u, f) => g.d(f).type === 'event', use: (g, u) => { g.c(u).ex = true; } }]
  };
  S['05010'] = { // Embiggen!
    respond: [{ window: 'eventPlayed', timing: 'hero', exhaust: true, label: '소진 → 이 이벤트의 피해 +2', can: (g, u, ctx) => g.hasTrait(ctx.card, 'ATTACK'), resolve(g, u, ctx) { ctx.dmgBonus += 2; } }]
  };
  S['05011'] = { // Shrink
    respond: [{ window: 'eventPlayed', timing: 'hero', exhaust: true, label: '소진 → 이 이벤트가 제거하는 위협 +2', can: (g, u, ctx) => g.hasTrait(ctx.card, 'THWART'), resolve(g, u, ctx) { ctx.thwBonus += 2; } }]
  };
  S['05025'] = { // Home by Dawn
    async whenRevealed(g, u, ctx) {
      await g.heroObligation(u, '새벽 전 귀가', '페르소나 지원 1장 버림 (없으면 쇄도) → 이 카드 버림', async () => {
        const c = g.p.supports.filter(x => isPersona(g, x));
        if (c.length) { const x = c.length === 1 ? c[0] : await g.ask({ type: 'target', title: '버릴 페르소나 지원', cands: c, cancelable: false }); g.discard(x, `${g.nm(x)} 버림`); }
        else { g.log('버릴 페르소나 지원이 없어 쇄도'); ctx.surge++; }
        g.discard(u);
      });
    }
  };
  S['05026'] = { // Generation Why?
    async whenRevealed(g) { const n = g.allAllies().length + g.inPlay().filter(x => isPersona(g, x)).length; if (n) await g.forEachPlayer(() => g.discardDeckTop(n)); }
  };
  S['05027'] = { cannotTakeDamage: (g, t) => g.engagedMinions().some(m => m !== t) }; // Thomas Edison
  S['05028'] = { // Edison's Giant Robot
    cannotTakeDamage: (g, t) => !((g.p.phase || {}).blank || []).includes(t),
    actions: [{ timing: 'hero', label: '정신 1 → 이번 단계 동안 텍스트 무시', cost: { n: 1, req: 'B' }, can: (g, u) => !((g.p.phase || {}).blank || []).includes(u),
      use(g, u) { g.p.phase = g.p.phase || {}; (g.p.phase.blank = g.p.phase.blank || []).push(u); g.log('에디슨의 거대 로봇: 이번 단계 동안 피해를 입을 수 있습니다', 'good'); } }]
  };
  S['05029'] = { // Harvest
    whenRevealed(g, u, ctx) {
      const ps = g.inPlay().filter(x => isPersona(g, x) && !g.c(x).ex);
      ps.forEach(x => { g.c(x).ex = true; });
      if (!ps.length) { g.log('소진할 페르소나 지원이 없어 쇄도'); ctx.surge++; return; }
      const v = g.e.villain; if (v) { const h = g.heal(v, ps.length); if (h) g.log(`${g.nm(v)} 피해 ${h} 회복`); }
    }
  };

  // ======================= aspect / basic =======================
  S['05012'] = { // Nova
    respond: [{ window: 'enemyAttackInitiated', label: '에너지 1 → 공격하는 적에게 피해 2', cost: { n: 1, req: 'Y' }, can: (g, u, ctx) => g.c(ctx.enemy).zone,
      async resolve(g, u, ctx) { await g.dealDamage(ctx.enemy, 2, { src: u, byPlayer: true }); } }]
  };
  S['05014'] = { // Preemptive Strike
    interrupt: { window: 'boostTurned', timing: 'hero', can: (g, u, ctx) => ctx.attack && ctx.enemy === g.e.villain && !ctx.cancelIcons && ctx.icons > 0,
      async resolve(g, u, ctx) { ctx.cancelIcons = true; g.log(`선제공격: 강화 아이콘 ${ctx.icons}개 취소`, 'good'); if (g.e.villain) await g.dealDamage(g.e.villain, ctx.icons, { src: u, byPlayer: true }); } }
  };
  S['05015'] = { // Tackle
    play: { timing: 'hero', label: 'attack', target: 'attackable',
      async resolve(g, u, ctx) { g.giveStatus(ctx.target, 'stun', '기절'); if (g.paidWith(ctx.paid, 'R')) await g.playerAttack(g.idt(), ctx.target, 3, {}); } }
  };
  S['05017'] = { // Energy Barrier
    respond: [{ window: 'identityWouldTakeDamage', label: '반사 카운터 1 → 피해 1 방지, 적에게 피해 1', can: (g, u, ctx) => (g.c(u).cnt.reflection || 0) > 0 && ctx.amount > ctx.prevent,
      async resolve(g, u, ctx) {
        g.c(u).cnt.reflection--; ctx.prevent += 1;
        const t = await g.chooseTarget('enemy', '에너지 장벽: 피해 1을 줄 적', u, false);
        if (t) await g.dealDamage(t, 1, { src: u, byPlayer: true });
        g.cleanupUses(u);
      } }]
  };
  S['05018'] = { playFromDiscard: true }; // Lockjaw
  S['05023'] = { mod: statPlus('hp', 3) }; // Endurance
  S['05024'] = { // Enhanced Reflexes
    resources: [{ gen: 'Y', label: '향상된 반사신경 (에너지 카운터 1)', can: (g, u) => g.isHero() && !g.c(u).ex && (g.c(u).cnt.energy || 0) > 0, use: (g, u) => { g.c(u).ex = true; g.c(u).cnt.energy--; } }]
  };
  S['05030'] = { // Melee
    play: { timing: 'hero', label: 'attack', target: 'attackable',
      async resolve(g, u, ctx) {
        await g.playerAttack(g.idt(), ctx.target, 3, {});
        const c = g.targets('attackable').filter(x => x !== ctx.target); if (!c.length) return;
        const t = c.length === 1 ? c[0] : await g.ask({ type: 'target', title: '난투: 피해 3을 줄 다른 적', cands: c, cancelable: false });
        await g.playerAttack(g.idt(), t, 3, {});
      } }
  };
  S['05031'] = { // Concussive Blow
    play: { timing: 'hero', label: 'attack', target: 'attackable',
      async resolve(g, u, ctx) { g.giveStatus(ctx.target, 'conf', '혼란'); if (g.paidWith(ctx.paid, 'R')) await g.playerAttack(g.idt(), ctx.target, 3, {}); } }
  };
  S['05032'] = { play: { timing: 'hero', async resolve(g) { const hs = g.livingPlayers().filter(i => g.s.ps[i].form === 'hero').map(i => g.idt(i)); if (!hs.length) return; const t = hs.length === 1 ? hs[0] : await g.ask({ type: 'target', title: '사기 증진: 강화할 히어로', cands: hs, cancelable: false }); if (t) { ['thw', 'atk', 'def'].forEach(k => g.addRoundMod(t, k, 1)); g.log(`사기 진작: ${g.nm(t)} 라운드 끝까지 저지·공격·방어 +1`, 'good'); } } } }; // Morale Boost
  S['05033'] = { mod: { rec: (g, self, t) => t === g.idt() && g.c(self).zone ? 2 : 0 } }; // Down Time

  MC.registerScripts(S);
})();
