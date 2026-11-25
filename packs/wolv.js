/* Wolverine (35001-35037): Wolverine's Claws, his hero set, Aggression cards, nemesis set and the Deathstrike modular set.
   Ported from cards/pack/wolv of the community build. */
(function () {
  'use strict';
  const S = {};
  const idOf = (g, u) => g.c(u).id;
  const has = (g, u, t) => g.hasTrait(u, t);
  const pick = async (g, cands, title) => !cands.length ? null : cands.length === 1 ? cands[0] : await g.ask({ type: 'target', title, cands, cancelable: false });
  const isWolv = g => ['35001a', '35001b'].includes(idOf(g, g.idt()));
  const discardRandomHand = g => { if (!g.p.hand.length) return null; const t = g.p.hand[Math.floor(g.rand() * g.p.hand.length)]; g.put(t, 'discard'); g.log(`무작위로 ${g.nm(t)} 버림`); return t; };
  async function dmgEnemy(g, n, title, src, attack, props) {
    const t = await g.chooseTarget(attack ? 'attackable' : 'enemy', title, g.idt(), false); if (!t) return null;
    if (attack) return { t, r: await g.playerAttack(g.idt(), t, n, Object.assign({ src }, props || {})) };
    return { t, r: await g.dealDamage(t, n, { src, byPlayer: true }) };
  }
  const hasHeroAction = (g, a) => { const s = g.sc(a); return (s.actions || []).some(x => x.timing === 'hero') || (s.respond || []).some(x => x.timing === 'hero'); };

  // ======================= identity =======================
  S['35001a'] = { on: { turnBegins(g) { if (g.isHero() && isWolv(g) && g.c(g.idt()).dmg) { const h = g.heal(g.idt(), 2); g.log(`치유 인자: 피해 ${h} 회복`, 'good'); } } } };
  S['35001b'] = { setup(g) { const c = (g.p.pset || []).concat(g.p.deck, g.p.discard).find(x => idOf(g, x) === '35002'); if (c) { g.put(c, 'upgrade'); g.shuffle(g.p.deck); g.log('준비: 울버린의 클로를 플레이에 놓습니다'); } } };

  // ======================= hero cards =======================
  S['35002'] = { heroAttackPlus: g => g.p.clawsPlay ? { piercing: true } : null, // Wolverine's Claws
    actions: [{ timing: 'hero', exhaust: true, label: '소진·[공격] 이벤트의 비용만큼 피해 → 비용 없이 플레이 (관통)', can: g => g.p.hand.some(x => g.d(x).type === 'event' && (g.d(x).tr || []).includes('ATTACK')), async use(g, u) {
      const c = g.p.hand.filter(x => g.d(x).type === 'event' && (g.d(x).tr || []).includes('ATTACK')); const t = await pick(g, c, '클로: 플레이할 [공격] 이벤트'); if (!t) return;
      const n = g.d(t).cost || 0; if (n) await g.dealDamage(g.idt(), n, {});
      g.p.costRed = 99; g.p.clawsPlay = true; try { if (g.canPlay(t)) await g.playCard(t); } finally { g.p.costRed = 0; g.p.clawsPlay = false; }
    } }] };
  S['35003'] = { // Jubilee
    async onEnter(g, u) { if (!g.enemies().length) return; const t = await g.chooseTarget('enemy', '주빌리: 이번 단계 동안 기본 공격 +2를 받을 대상 적', g.idt(), false); if (t) { g.p.phase.jubilee = t; g.log(`주빌리: ${g.nm(t)} 표적`); } },
    atkVs: (g, s, me, enemy) => enemy && enemy === g.p.phase.jubilee && (me === s || (me === g.idt() && isWolv(g))) ? 2 : 0 };
  S['35004'] = { mod: { hp: (g, s, t) => t === g.idt() ? 4 : 0, atk: (g, s, t) => t === g.idt() && g.isHero() ? 1 : 0 }, basicAttackPlus: g => g.isHero() ? { piercing: true } : null }; // Adamantium Skeleton
  S['35005'] = { respond: [{ window: 'tookAttackDamage', timing: 'hero', label: '카드 1장 뽑기', can: (g, u, ctx) => ctx.target === g.idt(), async resolve(g) { await g.draw(1); } }], on: { formChanged(g, u, ctx) { if (ctx.form === 'alter') g.discard(u, '광전사의 광란 버림'); } } }; // Berserker Frenzy
  S['35006'] = { on: { hostWouldBeDefeated(g, a, wctx) { // "I Got Better"
    if (wctx.target !== g.idt() || !wctx.attack || g.c(a).zone !== 'upgrade' || wctx.saved) return; wctx.saved = true;
    g.c(g.idt()).dmg = Math.max(0, g.maxHp(g.idt()) - 5); g.c(g.idt()).ex = false; g.discard(a, '"나아졌어": 체력 5로 버팁니다');
  } } };
  S['35007'] = { actions: [{ timing: 'alter', exhaust: true, label: '소진 → 버림 더미의 울버린 카드 1장을 덱에 섞기', can: g => g.p.discard.some(x => g.d(x).cls === 'Hero'), async use(g) { const t = await pick(g, g.p.discard.filter(x => g.d(x).cls === 'Hero'), '덱에 섞을 울버린 카드'); if (t) { g.put(t, 'deck'); g.shuffle(g.p.deck); } } }] }; // Logan's Cabin
  S['35008'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { // Berserker Barrage
    let t = ctx.target;
    for (let k = 0; k < 20 && t; k++) {
      const r = await g.playerAttack(g.idt(), t, 4, { src: u }); if (!(r && r.defeated) || !g.targets('attackable', g.idt()).length) return;
      if (await g.ask({ type: 'choice', title: '광전사의 연타: 피해 2를 받고 반복할까요?', options: [{ id: 'y', label: '피해 2 받고 반복' }, { id: 'n', label: '그만' }] }) !== 'y') return;
      await g.dealDamage(g.idt(), 2, {}); t = await g.chooseTarget('attackable', '광전사의 연타: 다음 대상', g.idt(), false);
    }
  } } };
  S['35009'] = { play: { timing: 'hero', can: g => g.targets('attackable', g.idt()).length > 0, async resolve(g, u) { // Slice and Dice
    for (let i = 0; i < 2; i++) { if (await g.statusBlocks('attack')) return; if (!g.targets('attackable', g.idt()).length) return; await dmgEnemy(g, 3, `베고 썰기: ${i + 1}번째 공격 대상`, u, true); }
  } } };
  S['35010'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { await g.playerAttack(g.idt(), ctx.target, 8, { src: u, overkill: !!g.p.clawsPlay }); } } }; // Lunging Strike
  S['35011'] = { play: { timing: 'hero', label: 'thwart', target: 'thwartable', async resolve(g, u, ctx) { // Track by Scent
    const r = await g.removeThreat(ctx.target, 3, { src: u }); const last = r > 0 && g.c(ctx.target).threat === 0; g.log(`냄새 추적: 위협 ${r} 제거`); await g.afterThreatRemoved(ctx.target); if (last) await g.draw(2);
  } } };
  S['35012'] = { play: { timing: 'action', async resolve(g) { // Regenerative Healing
    const c = g.c(g.idt()); const k = (c.stun || c.conf) ? await g.ask({ type: 'choice', title: '재생 치유', options: [{ id: 'h', label: '정체성 피해 4 회복' }, { id: 's', label: '기절·혼란 상태 카드 모두 버리기' }] }) : 'h';
    if (k === 's') { c.stun = false; c.conf = false; c.stunH = false; c.confH = false; } else g.heal(g.idt(), 4);
  } } };
  S['35027'] = { async whenRevealed(g, u) { await g.heroObligation(u, '과거의 악령', '기절하고 혼란 → 이 카드 버림', async () => { g.giveStatus(g.idt(), 'stun', '과거의 악령'); g.giveStatus(g.idt(), 'conf', '과거의 악령'); if (g.c(u).zone === 'limbo') g.discard(u); }); } }; // Past Demons
  const omega = g => g.e.minions.find(m => idOf(g, m) === '35028') || null;
  S['35028'] = { async onAttackStart(g, u) { for (const x of g.friendlyChars().slice()) await g.dealDamage(x, 1, { src: u }); }, // Omega Red
    wouldBeDefeated(g, u, wctx) { if (g.e.sides.some(x => idOf(g, x) === '35029')) { wctx.saved = true; g.log('카보나디움 합성기: 오메가 레드는 쓰러지지 않습니다', 'warn'); } } };
  S['35029'] = { async whenDefeated(g) { const o = omega(g); if (o && g.hpLeft(o) <= 0) await g.defeat(o, { byPlayer: true }); } }; // The Carbonadium Synthesizer
  S['35030'] = { attachTo: g => g.idt(), replacesRecovery: true, on: { async playerPhaseEnd(g, a) { if (g.c(a).on === g.idt()) await g.dealDamage(g.idt(), 1, {}); } } }; // Death Factor
  const tentacle = async g => { const was = g.c(g.idt()).stun; g.giveStatus(g.idt(), 'stun', '촉수 공격'); await g.dealDamage(g.idt(), was ? 4 : 1, {}); };
  S['35031'] = { whenRevealed: tentacle, async boostEffect(g) { await tentacle(g); } }; // Tentacle Strike

  // ======================= aspect cards =======================
  S['35013'] = { onEnter(g, u) { g.c(u).cnt.psionic = 2; }, // Psylocke
    respond: [{ window: 'allyPowerUsed', label: '★ 정신 카운터 1 → 그 적 혼란 + 피해 1', can: (g, u, ctx) => ctx.ally === u && ctx.kind === 'attack' && (g.c(u).cnt.psionic || 0) > 0, async resolve(g, u, ctx) { g.c(u).cnt.psionic--; g.giveStatus(ctx.target, 'conf', '사이록'); await g.dealDamage(ctx.target, 1, { src: u, byPlayer: true }); } }] };
  S['35014'] = { async onPlay(g) { // Sunfire
    const c = g.enemies().concat(g.friendlyChars(), g.e.sides).flatMap(x => g.c(x).att).filter(a => g.d(a).enc && hasHeroAction(g, a)); if (!c.length || !g.canAfford({ n: 1, req: 'Y' }, null)) return;
    if (!(await g.pay({ n: 1, req: 'Y' }, null, '선파이어: [에너지] 1', true))) return; const t = await pick(g, c, '선파이어: 버릴 부착물'); if (t) g.discard(t, `${g.nm(t)} 버림`);
  } };
  S['35015'] = { respond: [{ window: 'afterAttackDefeat', timing: 'hero', label: '히어로 피해 1·버리기 → 히어로 준비', can: (g, u, ctx) => ctx.attacker === g.idt() && ctx.type === 'minion', async resolve(g, u) { await g.dealDamage(g.idt(), 1, {}); g.discard(u); if (g.canReady(g.idt())) g.c(g.idt()).ex = false; } }] }; // Battle Fury
  S['35016'] = { respond: [ // Warrior Skill
    { window: 'basicPowerUsed', label: '전사 카운터 1 → 이 공격 피해 +1', can: (g, u, ctx) => ctx.kind === 'attack' && (g.c(u).cnt.warrior || 0) > 0, async resolve(g, u, ctx) { g.c(u).cnt.warrior--; ctx.bonus += 1; g.cleanupUses(u); } },
    { window: 'eventPlayed', label: '전사 카운터 1 → 이 공격 피해 +1', can: (g, u, ev) => (g.d(ev.card).tr || []).includes('ATTACK') && (g.c(u).cnt.warrior || 0) > 0, async resolve(g, u, ev) { g.c(u).cnt.warrior--; ev.dmgBonus += 1; g.cleanupUses(u); } }] };
  S['35017'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { const big = g.kw(ctx.target, 'guard') || g.kw(ctx.target, 'patrol'); await g.playerAttack(g.idt(), ctx.target, big ? 5 : 3, { src: u }); } } }; // Outta My Way!
  S['35018'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { const r = await g.playerAttack(g.idt(), ctx.target, 2, { src: u }); if (r && r.defeated) g.heal(g.idt(), 2); } } }; // Precision Strike
  S['35022'] = { canPlay: g => has(g, g.idt(), 'MUTANT'), actions: [{ timing: 'alter', exhaust: true, label: '소진·피해 1 → 정체성 전용 카드가 나올 때까지 덱을 버리고 손으로', async use(g) { // Weapon X
    await g.dealDamage(g.idt(), 1, {}); const seen = [];
    while (g.p.deck.length) { const x = g.p.deck[0]; if (seen.includes(x)) break; if (g.d(x).cls === 'Hero') { g.put(x, 'hand'); g.log(`웨폰 X: ${g.nm(x)}을(를) 손으로`, 'good'); return; } g.put(x, 'discard'); seen.push(x); }
  } }] };
  S['35023'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { await g.playerAttack(g.idt(), ctx.target, g.stat(g.idt(), 'atk') || 0, { src: u, overkill: true, piercing: true }); } } }; // Fastball Special
  S['35032'] = { respond: [{ window: 'afterAllyThwart', exhaust: true, label: '소진 → 적에게 피해 2', can: (g, u, ctx) => ctx.scheme && g.c(ctx.scheme).zone !== 'side' && g.d(ctx.scheme).type === 'side' && g.enemies().length > 0, async resolve(g, u) { await dmgEnemy(g, 2, '사령 센터: 피해 2를 줄 적', u); } }] }; // Command Center
  S['35033'] = { canPlay: g => has(g, g.idt(), 'X-MEN'), respond: [{ window: 'afterAllyAttack', label: '★ 조우 덱 맨 위 버림 → ★이 있으면 그 하수인 격파', can: (g, u, ctx) => ctx.ally === u && g.c(ctx.target) && g.c(ctx.target).zone === 'minion' && !has(g, ctx.target, 'ELITE'), // Longshot
    async resolve(g, u, ctx) { const x = g.takeEncounter(); if (!x) return; g.put(x, 'ediscard'); if (g.d(x).boostStar) { g.log(`롱샷: ${g.nm(x)}에 ★ — ${g.nm(ctx.target)} 격파!`, 'good'); await g.defeat(ctx.target, { byPlayer: true, src: u }); } else g.log(`롱샷: ${g.nm(x)} (★ 없음)`); } }] };

  // ======================= Deathstrike (modular) =======================
  const deathstrike = g => g.e.minions.find(m => idOf(g, m) === '35034') || null;
  S['35034'] = { on: { afterEnemyAttack(g, u, ctx) { if (ctx.enemy === u && (ctx.damaged || []).length) discardRandomHand(g); } } }; // Lady Deathstrike
  S['35035'] = { async whenRevealed(g) { const d = deathstrike(g); if (d) { await g.activate(d, {}); return; } const x = g.searchEncounter(dd => dd.id === '35034'); g.shuffle(g.e.deck); if (x) await g.enterMinion(x, {}, true); } }; // Seeking Vengeance
  S['35036'] = { attachTo: g => g.enemies().find(e => !g.c(e).att.some(a => idOf(g, a) === '35036')) || null, surgeIfNoHost: true, attackProps: () => ({ piercing: true }), // Adamantium Upgrades
    actions: [{ timing: 'hero', label: '[에너지][정신][물리] → 이 카드 버림', cost: { n: 3, req: 'YBR' }, async use(g, u) { g.discard(u, '아다만티움 업그레이드 버림'); } }] };
  const hack = async g => { const t = discardRandomHand(g); if (t) { const n = (g.d(t).res || '').length; if (n) await g.dealDamage(g.idt(), n, {}); } };
  S['35037'] = { whenRevealed: hack, async boostEffect(g) { await hack(g); } }; // Hack 'n' Slash

  MC.registerScripts(S);
})();
