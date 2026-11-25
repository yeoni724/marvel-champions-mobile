/* Gambit (37001-37035): charge counters and Throw de Card, Justice X-Men cards, nemesis set and the Exodus modular set.
   Ported from cards/pack/gambit of the community build. */
(function () {
  'use strict';
  const S = {};
  const idOf = (g, u) => g.c(u).id;
  const tr = (g, u, t) => (g.d(u).tr || []).includes(t) || g.hasTrait(u, t);
  const pick = async (g, cands, title) => !cands.length ? null : cands.length === 1 ? cands[0] : await g.ask({ type: 'target', title, cands, cancelable: false });
  const isGambit = g => ['37001a', '37001b'].includes(idOf(g, g.idt()));
  const charge = g => g.c(g.idt()).cnt.charge || 0;
  const addCharge = (g, n) => { const c = g.c(g.idt()); c.cnt.charge = (c.cnt.charge || 0) + n; g.log(`충전 카운터 +${n} (총 ${c.cnt.charge})`, 'good'); };
  async function thw(g, t, n, src) { // remove threat from one scheme; reports whether it removed the last threat
    const r = await g.removeThreat(t, n, { src }); g.log(`${g.nm(t)} 위협 ${r} 제거`);
    const last = r > 0 && (!g.c(t).zone || g.c(t).threat === 0); await g.afterThreatRemoved(t); return { r, last };
  }
  async function shuffleBack(g, pred, title) { // Mutant Education, X-Men Instruction
    const c = g.p.discard.filter(pred); if (!c.length) return;
    const sel = c.length <= 2 ? c : await g.ask({ type: 'select', title, cards: c, min: 0, max: 2, confirm: '확정' });
    for (const u of sel || []) g.put(u, 'deck'); g.shuffle(g.p.deck); if ((sel || []).length) g.log(`${sel.length}장을 덱에 섞습니다`);
    if (g.inPlay().some(u => idOf(g, u) === '32049')) await g.draw(1); // X-Mansion
  }

  // ======================= identity =======================
  S['37001a'] = {
    actions: [{ timing: 'action', once: true, label: '카드 충전: 충전 카운터 1', async use(g) { addCharge(g, 1); } }],
    respond: [{ window: 'eventPlayed', label: '카드 던지기: 충전 카운터 제거 → 이 이벤트 피해 +1씩', can: (g, u, ev) => u === g.idt() && charge(g) > 0 && tr(g, ev.card, 'ATTACK') && !ev.thrown,
      async resolve(g, u, ev) {
        const max = Math.min(3, charge(g)); const opts = []; for (let i = max; i >= 1; i--) opts.push({ id: String(i), label: `${i}개 제거 (피해 +${i})` });
        const n = max === 1 ? 1 : +(await g.ask({ type: 'choice', title: '카드 던지기: 제거할 충전 카운터', options: opts })) || max;
        g.c(g.idt()).cnt.charge -= n; ev.dmgBonus += n; ev.thrown = n; g.log(`카드 던지기: 충전 카운터 ${n}개 → 이 이벤트의 피해 +${n}`, 'good');
      } }]
  };
  S['37001b'] = { actions: [{ timing: 'action', kind: 'thwart', exhaust: true, label: '도둑의 재주: 조우 덱 위 2장 중 1장 버림 → 그 강화 아이콘만큼 위협 제거', can: g => g.e.deck.length > 0 && !g.cannotThwart(),
    async use(g, u) {
      const top = g.e.deck.slice(0, 2); const t = await pick(g, top, '도둑의 재주: 버릴 조우 카드 (강화 아이콘만큼 위협 제거)'); if (!t) return;
      const n = g.boostOf(t); g.put(t, 'ediscard'); g.log(`도둑의 재주: ${g.nm(t)} 버림 (강화 아이콘 ${n})`);
      if (n > 0) await g.removeThreatChoose(n, `도둑의 재주: 위협 ${n}을(를) 제거할 음모`, u);
      await g.window('thiefExtraordinaire', {});
    } }] };

  // ======================= hero cards =======================
  S['37002'] = { selfCostMod: g => charge(g) }; // Rogue (ally)
  S['37003'] = { respond: [{ window: 'thiefExtraordinaire', timing: 'alter', exhaust: true, label: '소진 → 음모에서 위협 1 제거 (마지막이면 카드 1장)', can: g => g.schemes().some(x => g.c(x).threat > 0 && !g.noRemove(x)),
    async resolve(g, u) { const t = await g.chooseTarget('thwartable', '도둑 길드: 위협 1을 제거할 음모', u, false); if (!t) return; const r = await thw(g, t, 1, u); if (r.last) await g.draw(1); } }] }; // The Thieves Guild
  S['37004'] = { respond: [{ window: 'enemyAttackInitiated', timing: 'hero', exhaust: true, label: '소진 → 공격하는 적에게 피해 1', can: (g, u, ctx) => !!g.c(ctx.enemy).zone,
    async resolve(g, u, ctx) { await g.dealDamage(ctx.enemy, 1, { src: u, byPlayer: true }); if (!g.c(ctx.enemy).zone) ctx.cancel = true; } }] }; // Gambit's Staff
  S['37005'] = { respond: [{ window: 'afterHeroDefends', timing: 'hero', exhaust: true, label: '소진 → 갬빗 준비', can: (g, u, ctx) => ctx.noDamage && g.c(g.idt()).ex && g.canReady(g.idt()),
    resolve(g) { g.c(g.idt()).ex = false; g.log('길드 아머: 갬빗을 준비합니다', 'good'); } }] }; // Gambit's Guild Armor
  S['37006'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { // Charged Card
    const n = (g.curEvent && g.curEvent.thrown) || 0;
    await g.playerAttack(g.idt(), ctx.target, 4, { src: u, ranged: n >= 1, piercing: n >= 2, overkill: n >= 3 });
  } } };
  S['37007'] = { play: { timing: 'hero', label: 'attack', can: g => g.targets('attackable', g.idt()).length > 0, async resolve(g, u) { // Royal Flush
    addCharge(g, 1);
    for (let i = 0; i < 3; i++) { const t = await g.chooseTarget('attackable', `로열 플러시: 피해 0 (${i + 1}/3)`, g.idt(), false); if (!t) break; await g.playerAttack(g.idt(), t, 0, { src: u }); if (!g.c(g.idt()).zone) break; }
  } } };
  S['37008'] = { interrupt: { window: 'heroDefends', timing: 'hero', label: 'defense', async resolve(g, u, ctx) { addCharge(g, 1); ctx.defBonus += charge(g); g.log(`타고난 민첩성: 이번 공격 방어력 +${charge(g)}`, 'good'); } } }; // Natural Agility
  S['37009'] = { play: { timing: 'alter', label: 'thwart', target: 'thwartable', async resolve(g, u, ctx) { // Creole Charmer
    const r = await thw(g, ctx.target, 3, u); if (r.last && g.e.villain) g.giveStatus(g.e.villain, 'conf', '크리올 차머');
  } } };
  S['37010'] = { onSpent(g) { if (g.isHero() && isGambit(g)) addCharge(g, 1); } }; // Molecular Acceleration
  S['37025'] = { // Guild Business
    async whenRevealed(g, u) { g.put(u, 'pobl'); g.log('길드 업무: 플레이에 남습니다 (위험 아이콘 1)', 'warn'); },
    hazardBonus: (g, u) => g.c(u).zone === 'pobl' ? 1 : 0,
    actions: [{ timing: 'alter', label: '레미 소진·[에너지] 1 → 이 카드 제거', cost: { n: 1, req: 'Y' }, can: (g, u) => g.c(u).zone === 'pobl' && !g.c(g.idt()).ex, async use(g, u) { g.c(g.idt()).ex = true; g.removeFromGame(u); g.log('길드 업무를 게임에서 제거했습니다', 'good'); } }]
  };
  // nemesis: Belladonna and the Assassins Guild
  const defeatedBy = (g, ctx) => (ctx.damaged || []).filter(x => x !== g.idt() && g.c(x).zone !== 'ally').length > 0;
  S['37026'] = { on: { async afterEnemyAttack(g, u, ctx) { if (ctx.enemy === u && defeatedBy(g, ctx)) await g.placeThreat(g.e.main, 2, { src: u }); } } }; // Belladonna
  S['37027'] = { on: { async afterEnemyAttack(g, u, ctx) { if (g.c(ctx.enemy).zone && tr(g, ctx.enemy, 'ASSASSIN') && defeatedBy(g, ctx)) await g.placeThreat(u, 2, { src: u }); } } }; // The Assassins Guild
  S['37028'] = { on: { async afterEnemyAttack(g, u, ctx) { if (ctx.enemy === u && defeatedBy(g, ctx)) await g.placeThreat(g.e.main, 1, { src: u }); } } }; // Guild Assassin
  S['37029'] = { async whenRevealed(g) { // Assassination Attempt
    const a = g.e.minions.filter(m => tr(g, m, 'ASSASSIN'));
    if (!a.length) { const x = g.searchEncounter(d => d.type === 'minion' && (d.tr || []).includes('ASSASSIN')); if (x) { g.shuffle(g.e.deck); await g.reveal(x); } return; }
    for (const m of a) if (g.c(m).zone === 'minion' && g.c(g.idt()).zone) await g.enemyAttack(m, {});
  } };

  // ======================= Justice / Aggression / Basic =======================
  S['37011'] = { // Bishop
    on: { afterEnemyAttack(g, u) { if (g.c(u).zone === 'ally') { g.c(u).cnt.energy = (g.c(u).cnt.energy || 0) + 1; } } },
    respond: [{ window: 'allyPowerUsed', label: '★ 에너지 카운터 모두 제거 → 개당 공격력 +2 (최대 +6)', can: (g, u, ctx) => ctx.ally === u && ctx.kind === 'attack' && (g.c(u).cnt.energy || 0) > 0,
      resolve(g, u, ctx) { const n = g.c(u).cnt.energy; g.c(u).cnt.energy = 0; ctx.bonus += Math.min(6, 2 * n); g.log(`비숍: 에너지 ${n}개 → 공격력 +${Math.min(6, 2 * n)}`, 'good'); } }]
  };
  S['37012'] = { async onEnter(g) { const t = await g.chooseTarget('enemy', '대즐러: 혼란에 빠뜨릴 적', g.idt(), false); if (t) g.giveStatus(t, 'conf', '대즐러'); } }; // Dazzler
  S['37013'] = { respond: [ // Operative Skill
    { window: 'basicPowerUsed', label: '요원 카운터 1 → 이 저지 위협 +1 제거', can: (g, u, ctx) => ctx.kind === 'thwart' && (g.c(u).cnt.operative || 0) > 0, resolve(g, u, ctx) { g.c(u).cnt.operative--; ctx.bonus += 1; g.cleanupUses(u); } },
    { window: 'eventPlayed', label: '요원 카운터 1 → 이 저지 위협 +1 제거', can: (g, u, ev) => tr(g, ev.card, 'THWART') && (g.c(u).cnt.operative || 0) > 0, resolve(g, u, ev) { g.c(u).cnt.operative--; ev.thwBonus = (ev.thwBonus || 0) + 1; g.cleanupUses(u); } }
  ] };
  S['37014'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { // Stealth Strike
    await g.playerAttack(g.idt(), ctx.target, 4, { src: u });
    if (!g.c(ctx.target).zone || !['villain', 'minion'].includes(g.c(ctx.target).zone)) await g.removeThreatChoose(2, '은밀한 일격: 위협 2를 제거할 음모', u);
  } } };
  S['37015'] = { play: { timing: 'action', label: 'thwart', target: 'thwartable', can: g => tr(g, g.idt(), 'SPY') || tr(g, g.idt(), 'THIEF'), async resolve(g, u, ctx) { await thw(g, ctx.target, 3, u); } } }; // Breaking and Entering
  S['37019'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { // Beauty and the Thief
    await g.playerAttack(g.idt(), ctx.target, 4, { src: u });
    if (!g.cannotThwart()) await g.removeThreatChoose(4, '미녀와 도둑: 위협 4를 제거할 음모', u);
  } } };
  S['37021'] = { play: { timing: 'alter', can: g => tr(g, g.idt(), 'MUTANT'), async resolve(g) { await shuffleBack(g, x => g.d(x).cls === 'Hero', '뮤턴트 교육: 덱에 섞을 고유 카드 (최대 2장)'); } } }; // Mutant Education
  S['37030'] = { respond: [{ window: 'afterAllyAttack', exhaust: true, label: '소진 → 음모에서 위협 1 제거', can: (g, u, ctx) => ctx.defeated && g.d(ctx.target).type === 'minion',
    async resolve(g, u) { await g.removeThreatChoose(1, '작전실: 위협 1을 제거할 음모', u); } }] }; // War Room
  S['37031'] = { play: { timing: 'alter', can: g => tr(g, g.idt(), 'MUTANT'), async resolve(g) { await shuffleBack(g, x => g.d(x).type === 'ally' && (g.d(x).tr || []).includes('X-MEN'), '엑스맨 교육: 덱에 섞을 [엑스맨] 동료 (최대 2장)'); } } }; // X-Men Instruction

  // ======================= Exodus (modular) =======================
  S['37032'] = { async whenRevealed(g, u) { const x = g.searchEncounter(d => d.id === '37034'); if (x) { g.attachEnc(x, u); g.shuffle(g.e.deck); } } }; // Exodus
  S['37033'] = { async whenDefeated(g) { const x = g.searchEncounter(d => d.id === '37032'); if (x) { g.shuffle(g.e.deck); await g.reveal(x); } } }; // Herald of Avalon
  S['37034'] = { // Psionic Shield
    attachTo: g => g.e.minions.find(m => !g.c(m).att.some(a => idOf(g, a) === '37034')) || g.e.minions[0] || null, surgeIfNoHost: true,
    on: { hostWouldBeDefeated(g, a, wctx) { const m = g.c(a).on; if (wctx.target !== m || wctx.saved) return; wctx.saved = true; g.c(m).dmg = 0; g.forceDiscard = true; g.discard(a, `${g.nm(a)}: ${g.nm(m)}의 피해를 모두 회복하고 남깁니다`); g.forceDiscard = false; } }
  };
  S['37035'] = { // Acolyte Frenzy
    async whenRevealed(g, u, ctx) { const a = g.engagedMinions().filter(m => tr(g, m, 'ACOLYTE')); if (!a.length) { ctx.surge++; return; } for (const m of a) if (g.c(m).zone === 'minion' && g.c(g.idt()).zone) await g.activate(m, {}); },
    boostEffect(g) { g.giveStatus(g.idt(), 'stun', '광신도의 광란'); g.giveStatus(g.idt(), 'conf', '광신도의 광란'); }
  };

  MC.registerScripts(S);
})();
