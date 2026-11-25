/* Drax (19001-19033): his hero set, Protection cards and nemesis set.
   Ported from cards/pack/drax of the community build. */
(function () {
  'use strict';
  const S = {};
  const veng = g => g.c(g.idt()).cnt.vengeance || 0;
  const isDrax = g => ['19001a', '19001b'].includes(g.c(g.idt()).id);
  async function dmgEnemy(g, n, title, src, attack) {
    const t = await g.chooseTarget(attack ? 'attackable' : 'enemy', title, src, false); if (!t) return null;
    if (attack) await g.playerAttack(g.idt(), t, n, { src }); else await g.dealDamage(t, n, { src, byPlayer: true });
    return t;
  }

  // ======================= identity =======================
  S['19001a'] = {
    mod: { atk: (g, self, t) => t === self ? (g.c(self).cnt.vengeance || 0) : 0 },
    respond: [{ window: 'afterVillainAttack', label: '복수 카운터 1개 (최대 3, 꽉 차면 카드 1장 뽑기)',
      async resolve(g, u) { const c = g.c(u).cnt; if ((c.vengeance || 0) < 3) { c.vengeance = (c.vengeance || 0) + 1; g.log(`드랙스: 복수 카운터 ${c.vengeance}`); } else { await g.draw(1); g.log('복수 카운터가 가득 차 카드 1장 뽑기'); } } }]
  };
  S['19001b'] = { on: { formChanged(g, u, ctx) { // remove vengeance counters, heal 2 each
    if (ctx.form !== 'alter') return; const c = g.c(u).cnt; const n = c.vengeance || 0; if (!n) return;
    c.vengeance = 0; const h = g.heal(u, 2 * n); g.log(`드랙스: 복수 카운터 ${n}개 제거, 피해 ${h} 회복`, 'good');
  } } };

  // ======================= hero cards =======================
  S['19002'] = { actions: [{ timing: 'action', exhaust: true, label: '소진·맨티스 피해 1 → 정체성 피해 3 회복', can: g => g.c(g.idt()).dmg > 0, // Mantis
    async use(g, u) { await g.dealDamage(u, 1, { src: u }); const h = g.heal(g.idt(), 3); g.log(`맨티스: 피해 ${h} 회복`, 'good'); } }] };
  S['19003'] = { play: { timing: 'hero', async resolve(g) { const id = g.idt(); if (g.canReady(id)) g.c(id).ex = false; await g.draw(1); if (g.e.villain) await g.enemyAttack(g.e.villain, {}); } } }; // "Fight Me, Coward!"
  S['19004'] = { play: { timing: 'hero', label: 'thwart', target: 'thwartable', async resolve(g, u, ctx) { // Intimidation
    const n = g.stat(g.idt(), 'atk'); const r = await g.removeThreat(ctx.target, n, { src: u }); g.log(`위협: ${g.nm(ctx.target)} 위협 ${r} 제거`); await g.afterThreatRemoved(ctx.target);
  } } };
  S['19005'] = { selfCostMod: g => isDrax(g) ? veng(g) : 0, // Knife Leap
    interrupt: { window: 'basicPowerUsed', timing: 'hero', can: (g, u, ctx) => ctx.kind === 'attack', async resolve(g, u, ctx) { ctx.bonus += 5; ctx.overkill = true; ctx.piercing = true; g.log('칼날 도약: 이번 공격 +5, 압도·관통', 'good'); } } };
  S['19006'] = { interrupt: { window: 'identityWouldTakeDamage', timing: 'hero', can: (g, u, ctx) => ctx.amount - ctx.prevent > 0, async resolve(g, u, ctx) { const n = 2 * g.stat(g.idt(), 'atk'); ctx.prevent += n; g.log(`받아넘기기: 피해 ${n} 방지`); } } }; // Parry
  S['19007'] = { interrupt: { window: 'afterVillainAttack', timing: 'hero', can: g => !!g.e.villain, async resolve(g) { // Payback
    if (await g.statusBlocks('attack')) return; await g.playerAttack(g.idt(), g.e.villain, g.stat(g.idt(), 'atk'), {});
  } } };
  S['19008'] = { mod: { atk: (g, self, t) => t === g.idt() && g.isHero() ? 1 : 0 } }; // Drax's Knife
  S['19009'] = { mod: { retaliate: (g, self, t) => t === g.idt() && g.isHero() ? 1 : 0 } }; // Drax's Other Knife
  S['19010'] = { respond: [{ window: 'afterBasicPower', timing: 'hero', label: '카드 1장 뽑기', can: (g, u, ctx) => ctx.kind === 'attack', async resolve(g) { await g.draw(1); } }] }; // DWI Theet Mastery
  S['19011'] = { on: { async hostWouldBeDefeated(g, a, w) { // Too Stubborn to Die
    if (w.target !== g.idt() || !g.isHero() || g.c(a).zone !== 'upgrade') return;
    w.saved = true; const id = g.idt(); g.c(id).dmg = Math.max(0, g.maxHp(id) - 4);
    g.removeFromGame(a); g.log('죽기엔 너무 고집스럽다: 체력 4로, 일상 모습으로', 'good');
    if (!g.formLocked()) { g.flip(true); await g.trigger('formChanged', { form: g.p.form }); }
  } } };
  S['19025'] = { async whenRevealed(g, u, ctx) { // Memories of Another Life
    await g.heroObligation(u, '또 다른 삶의 기억', '내가 기절 (이미 기절이면 쇄도) → 이 카드 버림', async () => {
      if (!g.giveStatus(g.idt(), 'stun', '기절')) { g.log('이미 기절 상태라 쇄도'); ctx.surge++; }
      if (g.c(u).zone === 'limbo') g.discard(u);
    });
  } };
  S['19026'] = { mod: { atk: (g, self, t) => g.c(self).zone === 'side' && g.enemies().includes(t) ? 2 : 0 } }; // Cull the Weak
  S['19028'] = { attachTo: g => { const e = g.enemies(); if (!e.length) return null; const m = Math.max(...e.map(x => g.stat(x, 'atk'))); return e.find(x => g.stat(x, 'atk') === m); }, // Challenge Accepted
    on: { attackDealt(g, a, ctx) { if (ctx.attacker === g.idt() && ctx.target === g.c(a).on && ctx.dealt >= 4 && g.c(a).zone === 'attach') g.discard(a, '도전 수락 버림'); } } };
  S['19029'] = { // "I Will Destroy You!"
    whenRevealedAlter(g, u, ctx) { ctx.surge++; },
    async whenRevealedHero(g) {
      const y = g.e.minions.find(m => g.c(m).id === '19027');
      const r = y ? await g.enemyAttack(y, { atkBonus: 1 }) : null;
      if (!g.attackMade(r) && g.e.villain) await g.enemyAttack(g.e.villain, {});
    }
  };

  // ======================= Protection / other aspects / Basic =======================
  S['19012'] = { respond: [{ window: 'afterAllyAttack', label: '적을 격파 → 마터에게 강인함', can: (g, u, ctx) => ctx.ally === u && ctx.defeated && g.c(u).zone === 'ally' && !g.c(u).tough, async resolve(g, u) { g.giveStatus(u, 'tough', '마터'); } }] }; // Martyr
  S['19013'] = { actions: [{ timing: 'action', label: '소진·버리기 → 하수인 하나가 다른 적을 공격', can: (g, u) => !g.c(u).ex && g.e.minions.length > 0 && g.enemies().length > 1, // Moondragon
    async use(g, u) {
      g.c(u).ex = true; g.discard(u);
      const m = await g.ask({ type: 'target', title: '공격할 하수인', cands: g.e.minions.slice(), cancelable: false });
      const t = await g.ask({ type: 'target', title: `${g.nm(m)}이(가) 공격할 적`, cands: g.enemies().filter(x => x !== m), cancelable: false });
      const n = g.stat(m, 'atk'); g.log(`문드래곤: ${g.nm(m)} → ${g.nm(t)} 피해 ${n}`); await g.dealDamage(t, n, { src: m, byPlayer: true, attack: true });
    } }] };
  S['19015'] = { interrupt: { window: 'wouldTakeAttackDamage', timing: 'hero', can: (g, u, ctx) => ctx.amount - ctx.prevent > 0, async resolve(g, u, ctx) { // Deflection
    const n = Math.min(5, ctx.amount - ctx.prevent); ctx.prevent += n;
    for (let i = 0; i < n && g.p.deck.length; i++) g.put(g.p.deck[0], 'discard'); g.log(`빗겨내기: 피해 ${n} 방지, 덱 위 ${n}장 버림`);
  } } };
  S['19016'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { const r = await g.playerAttack(g.idt(), ctx.target, 4, {}); if (r && r.defeated) g.giveStatus(g.idt(), 'tough', '혹독한 타격'); } } }; // Hard Knocks
  S['19017'] = { interrupt: { window: 'basicPowerUsed', timing: 'hero', can: (g, u, ctx) => ctx.kind === 'attack' && g.e.deck.length + g.e.discard.length > 0, async resolve(g, u, ctx) { // Leading Blow
    const d = g.discardEncounterN(1); const n = d.reduce((t, x) => t + (g.d(x).boost || 0), 0);
    ctx.bonus -= n; g.log(`선제 타격: 공격력 -${n}`);
    const id = g.idt(); const will = g.stat(id, 'atk') + ctx.bonus > 0;
    (ctx.after = ctx.after || []).push(async gg => { if (will && gg.canReady(id)) { gg.c(id).ex = false; gg.log(`${gg.nm(id)} 준비`, 'good'); } });
  } } };
  S['19018'] = { interrupt: { window: 'enemyAttackInitiated', timing: 'hero', async resolve(g, u, ctx) { ctx.atkBonus = (ctx.atkBonus || 0) - 3; g.log(`제압: ${g.nm(ctx.enemy)} 이번 공격 -3`, 'good'); } } }; // Subdue
  S['19020'] = { canPlay: g => g.hasTrait(g.idt(), 'GUARDIAN'), // Gamora (ally)
    respond: ['afterAllyAttack', 'afterAllyThwart'].map(w => ({ window: w, timing: 'hero', label: '이벤트가 나올 때까지 덱 버리고 그 이벤트를 손으로', can: (g, u, ctx) => ctx.ally === u,
      async resolve(g) {
        const seen = [];
        while (true) { if (!g.p.deck.length) await g.reshuffleDeck(); const x = g.p.deck[0]; if (!x || seen.includes(x)) break; if (g.d(x).type === 'event') { g.put(x, 'hand'); g.log(`가모라: ${g.nm(x)}을(를) 손으로`, 'good'); return; } g.put(x, 'discard'); seen.push(x); }
      } })) };
  S['19030'] = { play: { timing: 'hero', can: g => !g.p.phase.bringIt, async resolve(g) { g.p.phase.bringIt = true; const n = g.engagedMinions().length; if (n) await g.draw(n); g.log(`"덤벼!": ${n}장 뽑기`); } } }; // "Bring It!"
  S['19031'] = { play: { timing: 'hero', can: g => g.hasTrait(g.idt(), 'GUARDIAN') && !!g.e.villain, async resolve(g, u) { await g.dealDamage(g.idt(), 1, { src: u }); g.giveStatus(g.e.villain, 'conf', '"빨리 생각해!"'); } } }; // "Think Fast!"
  S['19032'] = { // Regroup
    respond: [{ window: 'allyWouldBeDefeatedByAttack', label: '그 동료를 버리는 대신 손으로', can: (g, u, ctx) => !ctx.toHand, async resolve(g, u, ctx) { ctx.toHand = true; } }],
    on: { roundEnd(g, u) { if (g.c(u).zone === 'support') g.discard(u, '재정비 버림 (라운드 종료)'); } }
  };

  MC.registerScripts(S);
})();
