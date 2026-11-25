/* Black Widow hero pack (08001-08033), ported from cards/pack/bkw of the community build. */
(function () {
  'use strict';
  const S = {};
  const isPrep = (g, u) => g.hasTrait(u, 'PREPARATION');
  const myPreps = g => g.controlled().filter(x => isPrep(g, x));
  const hasSpy = g => g.friendlyChars().some(x => g.hasTrait(x, 'SPY'));
  const hurt = async (g, src, n, title) => { const t = await g.chooseTarget('enemy', title, src, false); if (t) await g.dealDamage(t, n, { src, byPlayer: true }); };

  S['08001a'] = { on: { async preparationUsed(g, u) { if (u === g.idt() && g.isHero() && g.enemies().length) await hurt(g, u, 1, '과부 제조기: 피해 1을 줄 적'); } } }; // Black Widow — Widowmaker
  S['08001b'] = { // Natasha Romanoff — Mission Prep
    on: { async cardPlayed(g, u, ctx) {
      if (u !== g.idt() || g.isHero() || !isPrep(g, ctx.card)) return;
      const k = 'natasha:' + g.s.phase; if (g.p.usedOnce[k]) return;
      g.p.usedOnce[k] = true; await g.draw(1); g.log('임무 준비: 카드 1장 뽑음', 'good');
    } }
  };
  S['08002'] = { selfCostMod: g => myPreps(g).length }; // Winter Soldier
  S['08003'] = { // Covert Ops
    play: { timing: 'action', label: 'thwart', target: 'thwartable',
      async resolve(g, u, ctx) { const r = await g.removeThreat(ctx.target, 4, { src: u }); g.log(`비밀 작전: ${g.nm(ctx.target)} 위협 ${r} 제거`); await g.afterThreatRemoved(ctx.target); if (g.e.villain) g.giveStatus(g.e.villain, 'conf', '혼란'); } }
  };
  S['08004'] = { // Dance of Death
    play: { timing: 'hero', label: 'attack', can: g => g.targets('attackable').length > 0,
      async resolve(g) {
        for (const n of [1, 2, 3]) {
          const t = await g.chooseTarget('attackable', `죽음의 춤: 피해 ${n}을 줄 적`, g.idt(), false); if (!t) return;
          await g.playerAttack(g.idt(), t, n, {});
        }
      } }
  };
  S['08005'] = { // Safe House #29
    actions: [{ timing: 'alter', exhaust: true, label: '소진 → 버림 더미의 준비 카드 1장을 손으로', can: g => g.p.discard.some(x => isPrep(g, x)),
      async use(g) { const x = (await g.pickCards(g.p.discard.filter(y => isPrep(g, y)), '안전가옥 #29: 손으로 가져올 준비 카드', 1, 1))[0]; if (x) { g.put(x, 'hand'); g.log(`${g.nm(x)}을(를) 손으로`, 'good'); } } }]
  };
  S['08006'] = { // Attacrobatics
    respond: [{ window: 'boostTurned', timing: 'hero', label: '버리기 → 강화 아이콘 취소, 빌런에게 그만큼 피해', can: (g, u, ctx) => !ctx.cancelIcons && ctx.icons > 0,
      async resolve(g, u, ctx) { g.discard(u); ctx.cancelIcons = true; if (g.e.villain) await g.dealDamage(g.e.villain, ctx.icons, { src: u, byPlayer: true }); } }]
  };
  S['08007'] = { resources: [{ gen: 'G', label: '블랙 위도우의 건틀릿 (준비 카드 전용)', can: (g, u) => !g.c(u).ex, forOnly: (g, u, f) => isPrep(g, f), use: (g, u) => { g.c(u).ex = true; } }] }; // Gauntlet
  S['08008'] = { // Grappling Hook
    respond: [{ window: 'treacheryRevealed', timing: 'hero', label: '버리기 → 이 배반 카드의 효과 취소', can: (g, u, ctx) => !ctx.cancel,
      resolve(g, u, ctx) { g.discard(u); ctx.cancel = true; g.log(`갈고리: 「${g.nm(ctx.card)}」 효과 취소`, 'good'); } }]
  };
  S['08009'] = { // Synth-Suit
    mod: { def: (g, self, t) => (t === g.idt() && g.c(self).zone === 'upgrade' && g.isHero()) ? 1 : 0 },
    on: { preparationUsed(g, u) { const id = g.idt(); if (g.isHero() && !g.c(u).ex && g.c(id).ex && g.canReady(id)) { g.c(u).ex = true; g.c(id).ex = false; g.log('합성 슈트: 소진하고 블랙 위도우 준비', 'good'); } } }
  };
  S['08010'] = { // Widow's Bite
    respond: [{ window: 'minionEntered', timing: 'hero', label: '버리기 → 그 하수인에게 피해 2, 기절', can: (g, u, ctx) => g.c(ctx.minion).zone === 'minion',
      async resolve(g, u, ctx) { g.discard(u); g.giveStatus(ctx.minion, 'stun', '기절'); await g.dealDamage(ctx.minion, 2, { src: u, byPlayer: true }); } }]
  };
  S['08025'] = { // Burn Notice
    async whenRevealed(g, u, ctx) {
      await g.heroObligation(u, '해고 통지', '비용이 가장 높은 준비 카드를 버림 (없으면 쇄도) → 이 카드 버림', async () => {
        const c = myPreps(g).sort((a, b) => (g.d(b).cost || 0) - (g.d(a).cost || 0));
        if (c.length) g.discard(c[0], `${g.nm(c[0])} 버림`); else { g.log('버릴 준비 카드가 없어 쇄도'); ctx.surge++; }
        g.discard(u);
      });
    }
  };
  S['08026'] = { // Taskmaster (Black Widow's nemesis)
    mod: { atk: (g, self, t) => t === self ? g.myUpgrades().length : 0, sch: (g, self, t) => t === self ? g.myUpgrades().length : 0 },
    boostEffect(g) { const n = g.myUpgrades().length; if (n) g.log(`★ 강화: 내 업그레이드 ${n}장만큼 +${n}`); return n; }
  };
  S['08027'] = { async whenRevealed(g, u) { await g.placeThreat(u, 1 * g.players, {}); } }; // Killer for Hire
  const loseUpgrade = async g => { const c = g.myUpgrades(); if (!c.length) return; const x = c.length === 1 ? c[0] : await g.ask({ type: 'target', title: '버릴 업그레이드', cands: c, cancelable: false }); g.discard(x, `${g.nm(x)} 버림`); };
  S['08029'] = { // Deadly Shot
    async whenRevealedAlter(g) { await loseUpgrade(g); await g.placeThreat(g.e.main, 1, {}); },
    async whenRevealedHero(g, u) { await loseUpgrade(g); await g.dealDamage(g.idt(), 1, { src: u }); }
  };

  // ======================= aspect / basic =======================
  S['08011'] = { async onEnter(g) { if (g.p.deck.concat(g.p.discard).some(x => isPrep(g, x))) await g.searchToHand(d => (d.tr || []).includes('PREPARATION'), '콜슨 요원', { discard: true }); } }; // Agent Coulson
  S['08012'] = { // Quake
    respond: [{ window: 'minionSchemed', exhaust: true, label: '소진 → 그 하수인에게 피해 2', can: (g, u, ctx) => g.c(ctx.enemy).zone === 'minion',
      async resolve(g, u, ctx) { await g.dealDamage(ctx.enemy, 2, { src: u, byPlayer: true }); } }]
  };
  S['08013'] = { // Stealth Strike
    play: { timing: 'hero', label: 'attack', target: 'attackable',
      async resolve(g, u, ctx) { const r = await g.playerAttack(g.idt(), ctx.target, 4, {}); if (r && r.defeated && g.targets('thwartable').length) await g.removeThreatChoose(2, '은밀한 일격: 위협 2를 제거할 음모', u); } }
  };
  S['08017'] = { // Counterintelligence
    respond: [{ window: 'threatWouldBePlaced', label: '버리기 → 주 음모에 놓일 위협 3 방지', can: (g, u, ctx) => ctx.scheme === g.e.main && !ctx.instead && ctx.amount > 0,
      resolve(g, u, ctx) { g.discard(u); ctx.amount = Math.max(0, ctx.amount - 3); g.log('방첩: 위협 3 방지', 'good'); } }]
  };
  S['08018'] = { // Spycraft
    canPlay: g => hasSpy(g),
    respond: [{ window: 'cardRevealed', label: '버리기 → 효과 취소하고 다른 카드 공개', can: (g, u, ctx) => !ctx.cancelAll,
      resolve(g, u, ctx) { g.discard(u); ctx.cancelAll = true; ctx.revealAnother++; } }]
  };
  S['08023'] = { canPlay: g => g.hasTrait(g.idt(), 'AVENGER'), resources: [{ gen: 'G', label: '퀸캐리어 (소진)', can: (g, u) => !g.c(u).ex, use: (g, u) => { g.c(u).ex = true; } }] }; // Quincarrier
  S['08024'] = { // Target Acquired
    respond: [{ window: 'boostTurned', timing: 'hero', label: '버리기 → 이 강화 카드의 강화 능력 취소', can: (g, u, ctx) => !ctx.cancelAbility && !!g.sc(ctx.card).boostEffect,
      resolve(g, u, ctx) { g.discard(u); ctx.cancelAbility = true; g.log(`표적 포착: 「${g.nm(ctx.card)}」의 강화 능력 취소`, 'good'); } }]
  };
  S['08030'] = { // Counterattack
    respond: [{ window: 'tookAttackDamage', timing: 'hero', label: '버리기 → 그 적에게 같은 양의 피해', can: (g, u, ctx) => ctx.target === g.idt() && g.c(ctx.enemy).zone,
      async resolve(g, u, ctx) { g.discard(u); await g.dealDamage(ctx.enemy, ctx.amount, { src: u, byPlayer: true }); } }]
  };
  S['08031'] = { // Rapid Response
    respond: [{ window: 'allyDefeated', timing: 'hero', label: '버리기 → 그 동료를 다시 플레이 영역에 (피해 1)', can: (g, u, ctx) => g.c(ctx.ally).zone === 'discard',
      async resolve(g, u, ctx) { g.discard(u); await g.putAllyIntoPlay(ctx.ally); g.log(`신속 대응: ${g.nm(ctx.ally)} 복귀`, 'good'); await g.dealDamage(ctx.ally, 1, { src: u }); } }]
  };
  S['08032'] = { // Defensive Stance
    respond: [{ window: 'identityWouldTakeDamage', timing: 'hero', label: '버리기 → 피해 3 방지', can: (g, u, ctx) => ctx.amount > ctx.prevent,
      resolve(g, u, ctx) { g.discard(u); ctx.prevent += 3; g.log('방어 태세: 피해 3 방지', 'good'); } }]
  };
  S['08033'] = { // Espionage
    canPlay: g => hasSpy(g),
    respond: [{ window: 'surgeResolving', label: '버리기 → 카드 2장 뽑기', async resolve(g, u) { g.discard(u); await g.draw(2); } }]
  };

  MC.registerScripts(S);
})();
