/* Wasp (13001-13034): Tiny and Giant hero forms, her Aggression cards and nemesis set.
   Ported from cards/pack/wsp of the community build. */
(function () {
  'use strict';
  const S = {};
  const tiny = g => g.inHeroForm('TINY'), giant = g => g.inHeroForm('GIANT');
  const pymAlly = (max, letter) => ({
    mod: { hp: (g, self, t) => t === self ? (g.c(self).cnt.pym || 0) : 0 },
    async onPlay(g, u) {
      const n = Math.min(max, await g.overpay(max, letter, `${g.nm(u)}: 비용을 더 내면 핌 카운터 (최대 ${max})${letter === 'Y' ? ' — 에너지 자원만' : ''}`));
      if (n) { g.c(u).cnt.pym = n; g.log(`${g.nm(u)}: 핌 카운터 ${n}개`); }
      else g.discard(u, `${g.nm(u)}: 체력이 0이라 버려짐`);
    }
  });
  async function divided(g, total, spec, title, fn) {
    for (let i = 0; i < total; i++) {
      const t = await g.chooseTarget(spec, `${title} (${i + 1}/${total})`, null, false); if (!t) return;
      await fn(t);
    }
  }
  const byWaspOrEvent = (g, src) => src === g.idt() || (src && g.c(src) && g.d(src).type === 'event');
  const smallButMighty = { label: '작지만 강하다: 빌런에게 피해 1', can: g => !!g.e.villain, async resolve(g, u) { await g.dealDamage(g.e.villain, 1, { src: u, byPlayer: true }); } };

  // ======================= identity =======================
  const waspHero = { respond: [
    Object.assign({ window: 'afterPlayerDefeatsMinion' }, smallButMighty, { can: (g, u, ctx) => !!g.e.villain && byWaspOrEvent(g, ctx.src) }),
    Object.assign({ window: 'sideSchemeDefeated' }, smallButMighty, { can: (g, u, ctx) => !!g.e.villain && byWaspOrEvent(g, ctx.src) })] };
  S['13001a'] = waspHero; S['13001c'] = waspHero;
  S['13001b'] = { actions: [{ timing: 'alter', once: true, label: 'G.I.R.L.: 버림 더미의 [정신] 카드 최대 2장을 덱에 섞기', // Nadia Van Dyne
    can: g => g.p.discard.some(x => (g.d(x).res || '').includes('B')),
    async use(g) {
      const c = g.p.discard.filter(x => (g.d(x).res || '').includes('B'));
      const sel = c.length <= 2 ? c : await g.ask({ type: 'select', title: '덱에 섞을 카드 (최대 2장)', cards: c, min: 0, max: 2, confirm: '확정' });
      (sel || []).forEach(x => g.put(x, 'deck')); g.shuffle(g.p.deck); g.log(`${(sel || []).length}장을 덱에 섞음`);
    } }] };

  // ======================= hero cards =======================
  S['13002'] = { // Ant-Man (ally)
    grantTrait: (g, self, t) => t !== self ? null : giant(g) ? 'GIANT' : tiny(g) ? 'TINY' : null,
    mod: { atk: (g, self, t) => t === self && giant(g) ? 1 : 0, thw: (g, self, t) => t === self && tiny(g) ? 1 : 0 }
  };
  S['13003'] = { play: { timing: 'hero', label: 'thwart', can: g => g.targets('thwartable').length > 0, async resolve(g, u) { // Giant Help
    if (giant(g)) await divided(g, 4, 'thwartable', '거대한 도움: 위협 1을 제거할 음모', async t => { await g.removeThreat(t, 1, { src: u }); await g.afterThreatRemoved(t); });
    else await g.removeThreatChoose(3, '거대한 도움: 위협 3을 제거할 음모', u);
  } } };
  S['13004'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { // Pinpoint Strike
    const t = tiny(g); await g.playerAttack(g.idt(), ctx.target, t ? 8 : 7, { overkill: t });
  } } };
  S['13005'] = { // Rapid Growth: +2 to a basic power and change to Giant
    interrupt: { window: 'basicPowerUsed', timing: 'hero', async resolve(g, u, ctx) { await g.changeHeroForm('GIANT'); ctx.bonus = (ctx.bonus || 0) + 2; g.log('급성장: 이번 기본 능력 +2', 'good'); } }
  };
  S['13006'] = { play: { timing: 'hero', label: 'attack', can: g => (giant(g) || tiny(g)) && g.targets('attackable').length > 0, async resolve(g, u) { // Wasp Sting
    if (giant(g)) await divided(g, 4, 'attackable', '와스프 침: 피해 1을 줄 적', async t => { await g.playerAttack(g.idt(), t, 1, {}); });
    else { const t = await g.chooseTarget('attackable', '와스프 침: 피해 5를 줄 적', u, false); if (t) await g.playerAttack(g.idt(), t, 5, {}); }
  } } };
  S['13008'] = { // Red Room Training
    mod: { retaliate: (g, self, t) => t === g.idt() && giant(g) ? 1 : 0 },
    basicAttackPlus: g => tiny(g) ? { piercing: true } : null
  };
  S['13009'] = { // Bio-Synthetic Wings
    grantTrait: (g, self, t) => t === g.idt() && g.isHero() ? 'AERIAL' : null,
    respond: [{ window: 'identityWouldTakeDamage', exhaust: true, label: '소진 → 피해 1 방지 (작은 모습)', can: (g, u, ctx) => tiny(g) && ctx.amount - ctx.prevent > 0,
      async resolve(g, u, ctx) { ctx.prevent++; } }]
  };
  S['13010'] = { mod: { thw: (g, self, t) => t === g.idt() && giant(g) ? 1 : 0, atk: (g, self, t) => t === g.idt() && tiny(g) ? 1 : 0 } }; // Wasp's Helmet
  S['13026'] = { // Red Dreams
    async whenRevealed(g, u) {
      await g.heroObligation(u, '붉은 꿈', '손의 [정신] 카드를 모두 버리고 피해 1 → 이 카드 버림', async () => {
        const c = g.p.hand.filter(x => (g.d(x).res || '').includes('B'));
        c.forEach(x => g.put(x, 'discard')); if (c.length) g.log(`[정신] 카드 ${c.length}장 버림`);
        await g.dealDamage(g.idt(), 1, { src: u });
        if (g.c(u).zone === 'limbo') g.discard(u);
      });
    }
  };
  // nemesis
  S['13027'] = { basicAttackCost: 1 }; // Mother's Orders
  S['13028'] = { // Beetle
    async whenDefeated(g, u) {
      const cost = { n: 1, req: 'R' };
      if (g.canAfford(cost, null)) {
        const pick = await g.ask({ type: 'choice', title: '비틀 격파: 하나를 고르세요', options: [{ id: 'pay', label: '[물리] 자원 1 지불' }, { id: 'shuffle', label: '비틀을 조우 덱에 섞기' }] });
        if (pick === 'pay' && await g.pay(cost, null, '비틀: [물리] 자원 1', false)) return;
      }
      g.put(u, 'edeck'); g.shuffle(g.e.deck); g.log('비틀을 조우 덱에 섞습니다', 'warn');
    }
  };
  S['13029'] = { attachTo: g => g.e.minions.find(m => g.c(m).id === '13028') || g.e.villain, mod: { hp: (g, self, t) => t === g.c(self).on ? 4 : 0 } }; // Beetle Armor MK IV
  S['13030'] = { // Beetle Mania
    whenRevealedAlter(g, u, ctx) { ctx.surge++; },
    async whenRevealedHero(g, u, ctx) {
      const b = g.e.minions.find(m => g.c(m).id === '13028');
      const r = b ? await g.enemyAttack(b, { atkBonus: 1 }) : null;
      if (!g.attackMade(r)) { g.log('공격이 없어 쇄도'); ctx.surge++; }
    }
  };

  // ======================= Aggression / other aspects / Basic =======================
  S['13011'] = { async onPlay(g, u, ctx) { const v = g.e.villain; if (!v) return; const n = g.paidWith(ctx.paid, 'R') ? 3 : 2; g.log(`토르: 빌런에게 피해 ${n}`); await g.dealDamage(v, n, { src: u, byPlayer: true }); } }; // Thor
  S['13012'] = pymAlly(3, 'Y'); // Wasp (ally)
  S['13013'] = { play: { timing: 'hero', label: 'attack', target: 'minion', async resolve(g, u, ctx) { // Into the Fray
    const r = await g.playerAttack(g.idt(), ctx.target, 6, {});
    const x = (r && r.excess) || 0;
    if (x && g.e.main) { const n = await g.removeThreat(g.e.main, x, { src: u }); g.log(`난전 속으로: 남은 피해 ${x} → 주 음모 위협 ${n} 제거`); }
  } } };
  S['13014'] = { interrupt: { window: 'afterChangeForm', timing: 'hero', can: g => g.isHero() && g.targets('attackable').length > 0, // Surprise Attack
    async resolve(g, u, ctx, paid) {
      if (await g.statusBlocks('attack')) return;
      const t = await g.chooseTarget('attackable', '기습 공격: 대상', u, false); if (t) await g.playerAttack(g.idt(), t, g.paidWith(paid, 'R') ? 4 : 3, {});
    } } };
  S['13016'] = { mod: { atk: (g, self, t) => g.p.allies.includes(t) ? 1 : 0 } }; // Boot Camp
  S['13017'] = { respond: [{ window: 'minionEntered', timing: 'hero', label: '버리기 → 그 하수인에게 피해 3', can: (g, u, ctx) => g.c(ctx.minion).zone === 'minion', // Lie in Wait
    async resolve(g, u, ctx) { g.discard(u); if (await g.statusBlocks('attack')) return; await g.playerAttack(g.idt(), ctx.minion, 3, {}); } }] };
  S['13018'] = { async onPlay(g) { await g.draw(1); g.log('아이언하트: 카드 1장 뽑기'); } }; // Ironheart
  S['13019'] = { async onPlay(g, u) { // Spider-Man
    const k = await g.ask({ type: 'choice', title: '스파이더맨: 이번 단계 동안 +2할 능력', options: [{ id: 'thw', label: '저지 +2' }, { id: 'atk', label: '공격 +2' }] });
    g.addPhaseMod(u, k === 'thw' ? 'thw' : 'atk', 2);
  } };
  S['13024'] = { doubleFor: (g, u, forUid) => !!forUid && g.d(forUid).cls === 'Basic' }; // The Power in All of Us
  S['13031'] = { play: { timing: 'hero', label: 'thwart', can: g => g.hasTrait(g.idt(), 'AVENGER') && g.c(g.e.main).threat > 0 && !g.crisis(), async resolve(g, u) { // Running Interference
    const n = 2 + Math.min(3, g.villainStage());
    const r = await g.removeThreat(g.e.main, n, { src: u }); g.log(`방해 작전: 주 음모 위협 ${r} 제거`);
  } } };
  S['13032'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { // All for One
    const c = g.friendlyChars().filter(x => !g.c(x).ex && g.hasTrait(x, 'AVENGER'));
    const sel = c.length ? await g.ask({ type: 'select', title: '소진할 어벤저 캐릭터 (1명당 피해 +1)', cards: c, min: 0, max: c.length, confirm: '확정' }) : [];
    (sel || []).forEach(x => { g.c(x).ex = true; });
    await g.playerAttack(g.idt(), ctx.target, 3 + (sel || []).length, {});
  } } };
  S['13033'] = { interrupt: { window: 'afterChangeForm', timing: 'hero', can: g => g.isHero() && !g.c(g.idt()).tough, async resolve(g) { g.giveStatus(g.idt(), 'tough', '인내'); } } }; // Perseverance
  S['13034'] = { play: { timing: 'hero', can: g => g.c(g.idt()).stun || g.c(g.idt()).conf, async resolve(g) { // Athletic Conditioning
    const c = g.c(g.idt()); const k = c.stun && c.conf ? await g.ask({ type: 'choice', title: '버릴 상태 카드', options: [{ id: 'stun', label: '기절' }, { id: 'conf', label: '혼란' }] }) : (c.stun ? 'stun' : 'conf');
    c[k === 'conf' ? 'conf' : 'stun'] = false; g.log(`${k === 'conf' ? '혼란' : '기절'} 상태 해제`, 'good');
  } } };

  MC.registerScripts(S);
})();
