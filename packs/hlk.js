/* Hulk hero pack (10001-10032), ported from cards/pack/hlk of the community build. */
(function () {
  'use strict';
  const S = {};
  const onlyR = paid => !!paid && paid.length > 0 && paid.every(l => l === 'R' || l === 'G'); // "paid using only [physical] resources"
  const heroStat = (key, n) => ({ [key]: (g, self, t) => (t === g.idt() && g.c(self).zone && g.isHero()) ? n : 0 });

  S['10001a'] = { on: { playerPhaseEnd(g, u) { if (u !== g.idt() || !g.isHero() || !g.p.hand.length) return; const n = g.p.hand.length; g.p.hand.slice().forEach(x => g.put(x, 'discard')); g.log(`분노: 턴이 끝나 손의 카드 ${n}장을 모두 버립니다`, 'warn'); } } }; // Hulk — Enraged
  S['10001b'] = { // Bruce Banner — Experimental Research
    actions: [{ timing: 'action', once: true, label: '카드 1장 뽑고 1장 버리기', async use(g) { await g.draw(1); await g.discardFromHand(1, 1, '실험 연구: 버릴 카드 1장'); } }]
  };
  S['10002'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { await g.playerAttack(g.idt(), ctx.target, g.stat(g.idt(), 'atk'), {}); } } }; // Crushing Blow
  S['10003'] = { // Hulk Smash
    interrupt: { window: 'basicPowerUsed', timing: 'hero', can: (g, u, ctx) => ctx.kind === 'attack',
      resolve(g, u, ctx, paid) { ctx.bonus += 10; if (onlyR(paid)) ctx.overkill = true; g.log(`헐크 스매시: 이번 공격 +10${onlyR(paid) ? ', 압도' : ''}`, 'good'); } }
  };
  S['10004'] = { // Sub-Orbital Leap
    play: { timing: 'hero', label: 'thwart', target: 'thwartable',
      async resolve(g, u, ctx) { const n = onlyR(ctx.paid) ? 5 : 3; const r = await g.removeThreat(ctx.target, n, { src: u }); g.log(`준궤도 도약: ${g.nm(ctx.target)} 위협 ${r} 제거`); await g.afterThreatRemoved(ctx.target); } }
  };
  S['10005'] = { // Thunderclap
    play: { timing: 'hero', can: g => g.enemies().length > 0,
      async resolve(g, u) { const sel = await g.pickCards(g.enemies(), '천둥 박수: 피해 3을 줄 적 (최대 3)', 1, 3); for (const t of sel) if (g.c(t).zone) await g.dealDamage(t, 3, { src: u, byPlayer: true }); } }
  };
  S['10006'] = { play: { timing: 'hero', async resolve(g, u, ctx) { if (g.canReady(g.idt())) g.c(g.idt()).ex = false; g.log('멈출 수 없는 힘: 헐크 준비', 'good'); if (onlyR(ctx.paid)) await g.draw(1); } } }; // Unstoppable Force
  S['10007'] = { resHeroOnly: true }; // Limitless Strength
  S['10008'] = { // Banner's Laboratory
    mod: { rec: (g, self, t) => (t === g.idt() && g.c(self).zone && !g.isHero()) ? 2 : 0 },
    resources: [{ gen: 'B', label: '배너의 연구실 (소진)', can: (g, u) => !g.isHero() && !g.c(u).ex, use: (g, u) => { g.c(u).ex = true; } }]
  };
  S['10009'] = { heroOnly: true, mod: heroStat('atk', 1), on: { formChanged(g, u) { if (g.c(u).zone) g.discard(u, '끝없는 분노: 변신해서 버려짐'); } } }; // Boundless Rage
  S['10010'] = { mod: Object.assign({ hp: (g, self, t) => (t === g.idt() && g.c(self).zone) ? 4 : 0 }, heroStat('retaliate', 1)) }; // Immovable Object
  S['10025'] = { // Inner Demons
    async whenRevealed(g, u) {
      if (!g.formLocked()) await g.changeForm(true);
      if (g.isHero()) { g.c(g.idt()).ex = true; g.log('내면의 악마: 헐크 소진'); }
      else await g.discardFromHand(Math.min(2, g.p.hand.length), 2, '내면의 악마: 버릴 카드 2장');
      g.discard(u);
    }
  };
  S['10026'] = { on: { async afterEnemyAttack(g, u, ctx) { if (ctx.enemy !== u) return; const top = (await g.discardDeckTop(1))[0]; if (top && (g.d(top).res || '').includes('R')) await g.dealDamage(g.idt(), 2, { src: u }); } } }; // Abomination
  S['10027'] = { noRemove: g => g.e.minions.some(m => g.c(m).id === '10026') }; // Total Destruction
  S['10028'] = { // Clash of the Titans
    async whenRevealed(g, u, ctx) {
      const en = g.enemies(); if (!en.length) { ctx.surge++; return; }
      const hi = Math.max(...en.map(x => g.stat(x, 'atk'))), e = en.find(x => g.stat(x, 'atk') === hi);
      const pool = g.allFriendlyChars().filter(x => g.d(x).type === 'ally' || g.s.ps[g.identityPlayer(x)].form === 'hero');
      if (!pool.length) { g.log('공격할 대상이 없어 쇄도'); ctx.surge++; return; }
      const top = Math.max(...pool.map(x => g.stat(x, 'atk'))), c = pool.filter(x => g.stat(x, 'atk') === top);
      const t = c.length === 1 ? c[0] : await g.ask({ type: 'target', title: '거인들의 격돌: 공격받을 캐릭터', cands: c, cancelable: false });
      const tpi = g.controllerOf(t) ?? g.s.ctx;
      const r = await g.withPlayer(tpi, () => g.enemyAttack(e, { forceTarget: t }));
      if (!g.attackMade(r)) { g.log('공격이 일어나지 않아 쇄도'); ctx.surge++; }
    }
  };

  // ======================= aspect / basic =======================
  S['10011'] = { on: { async afterAttack(g, u, ctx) { if (ctx.attacker === u && g.targets('thwartable').length) await g.removeThreatChoose(1, '브론: 위협 1을 제거할 음모', u); } } }; // Brawn
  S['10012'] = { async onEnter(g) { g.log('센트리: 조우 카드 1장을 받습니다', 'warn'); await g.dealEncounterCard(); } }; // Sentry
  S['10013'] = { mod: { atk: (g, self, t) => t === self ? g.c(self).dmg : 0 } }; // She-Hulk (ally)
  S['10014'] = { // Drop Kick
    play: { timing: 'hero', label: 'attack', target: 'attackable',
      async resolve(g, u, ctx) { await g.playerAttack(g.idt(), ctx.target, 4, {}); if (onlyR(ctx.paid)) { if (g.c(ctx.target).zone) g.giveStatus(ctx.target, 'stun', '기절'); await g.draw(1); } } }
  };
  S['10015'] = { // Toe to Toe
    play: { timing: 'hero', label: 'attack', target: 'enemy',
      async resolve(g, u, ctx) { await g.enemyAttack(ctx.target, {}); if (g.c(ctx.target).zone && g.c(g.idt()).zone) await g.playerAttack(g.idt(), ctx.target, 5, {}); } }
  };
  S['10016'] = { // "You'll Pay for That!"
    interrupt: { window: 'tookAttackDamage', timing: 'hero', can: (g, u, ctx) => ctx.target === g.idt() && ctx.enemy === g.e.villain && g.targets('thwartable').length > 0,
      async resolve(g, u, ctx) { const n = Math.min(5, ctx.amount); for (let i = 0; i < n && g.targets('thwartable').length; i++) await g.removeThreatChoose(1, `두고 보자!: 위협 1을 제거할 음모 (${i + 1}/${n})`, u); } }
  };
  S['10018'] = { resources: [{ gen: 'R', label: '무술 실력 (공격 이벤트 전용)', can: (g, u) => !g.c(u).ex, forOnly: (g, u, f) => g.d(f).type === 'event' && g.hasTrait(f, 'ATTACK'), use: (g, u) => { g.c(u).ex = true; } }] }; // Martial Prowess
  S['10019'] = { play: { timing: 'hero', label: 'thwart', target: 'thwartable', async resolve(g, u, ctx) { const r = await g.removeThreat(ctx.target, 2, { src: u }); g.log(`구출하러!: ${g.nm(ctx.target)} 위협 ${r} 제거`); await g.afterThreatRemoved(ctx.target); } } }; // To the Rescue!
  S['10029'] = { // Beat Cop
    actions: [
      { timing: 'action', exhaust: true, label: '소진 → 음모의 위협 1을 여기로', target: 'thwartable',
        async use(g, u, ctx) { const r = await g.removeThreat(ctx.target, 1, { src: u }); if (r) { g.c(u).cnt.threat = (g.c(u).cnt.threat || 0) + 1; g.log(`순찰 경관: ${g.nm(ctx.target)}의 위협 1을 옮겼습니다`); } await g.afterThreatRemoved(ctx.target); } },
      { timing: 'action', exhaust: true, label: '소진·버리기 → 여기 위협마다 하수인에게 피해 1', can: (g, u) => (g.c(u).cnt.threat || 0) > 0 && g.e.minions.length > 0,
        async use(g, u) {
          const n = g.c(u).cnt.threat || 0; g.discard(u, '순찰 경관 버림');
          for (let i = 0; i < n && g.e.minions.length; i++) { const t = await g.chooseTarget('minion', `순찰 경관: 피해 1을 줄 하수인 (${i + 1}/${n})`, u, false); if (t) await g.dealDamage(t, 1, { src: u, byPlayer: true }); }
        } }
    ]
  };
  S['10030'] = { // Inspiring Presence
    canPlay: g => g.hasTrait(g.idt(), 'AVENGER'),
    play: { timing: 'hero', target: { kind: 'ally', filter: (g, t) => g.c(t).ex || g.c(t).dmg > 0 }, can: g => g.hasTrait(g.idt(), 'AVENGER'),
      resolve(g, u, ctx) { g.heal(ctx.target, 1); if (g.canReady(ctx.target)) g.c(ctx.target).ex = false; g.log(`고무적인 존재: ${g.nm(ctx.target)} 회복·준비`, 'good'); } }
  };
  S['10031'] = { respond: [{ window: 'afterHeroDefends', label: '공격한 적에게 피해 1', can: (g, u, ctx) => g.c(ctx.enemy).zone, async resolve(g, u, ctx) { await g.dealDamage(ctx.enemy, 1, { src: u, byPlayer: true }); } }] }; // Electrostatic Armor
  S['10032'] = { resources: [{ gen: 'G', label: '수완 (버리기)', use: (g, u) => { g.discard(u, '수완 버림'); } }] }; // Resourceful

  MC.registerScripts(S);
})();
