/* Phoenix (34001-34035): Phoenix Force (Restrained / Unleashed), Psionic cards, Justice X-Men cards and nemesis set.
   Ported from cards/pack/phoenix of the community build. */
(function () {
  'use strict';
  const S = {};
  const idOf = (g, u) => g.c(u).id;
  const has = (g, u, t) => g.hasTrait(u, t);
  const pick = async (g, cands, title) => !cands.length ? null : cands.length === 1 ? cands[0] : await g.ask({ type: 'target', title, cands, cancelable: false });
  const PF = ['34002a', '34002b'];
  const pf = g => g.p.upgrades.find(u => PF.includes(idOf(g, u))) || null;
  const power = g => { const f = pf(g); return f ? (g.c(f).cnt.power || 0) : 0; };
  const unleashed = g => { const f = pf(g); return !!f && idOf(g, f) === '34002b'; };
  const restrained = g => { const f = pf(g); return !!f && idOf(g, f) === '34002a'; };
  function phoenixPower(g, n) { // + places counters, - removes them; the Phoenix Force flips on its own triggers
    const f = pf(g); if (!f) return 0; const c = g.c(f); const before = c.cnt.power || 0;
    c.cnt.power = Math.max(0, before + n); const did = c.cnt.power - before;
    if (did) g.log(`피닉스 포스: 힘 카운터 ${did > 0 ? '+' : ''}${did} (현재 ${c.cnt.power})`);
    if (did < 0 && restrained(g) && c.cnt.power === 0) { c.id = '34002b'; g.log('피닉스 포스가 해방되었습니다! (해방 면)', 'warn'); }
    if (did > 0 && unleashed(g) && c.cnt.power >= 4) { c.id = '34002a'; g.log('피닉스 포스를 다시 억눌렀습니다 (억제 면)', 'good'); }
    return Math.abs(did);
  }
  MC.phoenixPower = phoenixPower;
  async function dmgEnemy(g, n, title, src, attack, props) {
    const t = await g.chooseTarget(attack ? 'attackable' : 'enemy', title, g.idt(), false); if (!t) return null;
    if (attack) return { t, r: await g.playerAttack(g.idt(), t, n, Object.assign({ src }, props || {})) };
    return { t, r: await g.dealDamage(t, n, { src, byPlayer: true }) };
  }

  // ======================= identity =======================
  S['34001a'] = { resources: [{ gen: 'G', label: '정신적 유대: 피닉스 포스 힘 1 (단계당 1번)', can: g => g.isHero() && power(g) > 0 && !g.p.phase.psionicBond, use: g => { g.p.phase.psionicBond = true; phoenixPower(g, -1); } }] };
  S['34001b'] = {
    setup(g) { const f = (g.p.pset || []).find(u => PF.includes(idOf(g, u))); if (!f) return; g.c(f).id = '34002a'; g.put(f, 'upgrade'); g.c(f).cnt.power = 4; g.log('준비: 피닉스 포스(억제 면), 힘 카운터 4개'); },
    on: { afterRecover(g) { phoenixPower(g, 1); } }
  };
  S['34002a'] = { grantTrait: (g, s, t) => t === g.idt() ? 'RESTRAINED' : null };
  S['34002b'] = { grantTrait: (g, s, t) => t === g.idt() ? 'UNLEASHED' : null, mod: { thw: (g, s, t) => t === g.idt() && g.isHero() ? -2 : 0, atk: (g, s, t) => t === g.idt() && g.isHero() ? 2 : 0 } };

  // ======================= hero cards =======================
  S['34003'] = { onEnter(g) { phoenixPower(g, 2); }, respond: [{ window: 'allyDefeated', label: '피닉스 포스 힘 2 제거', can: (g, u, ctx) => ctx.ally === u, async resolve(g) { phoenixPower(g, -2); } }] }; // Cyclops (ally)
  S['34004'] = { actions: [{ timing: 'alter', exhaust: true, label: '소진 → 힘 카운터 1 또는 진 그레이 피해 2 회복', async use(g) { // White Hot Room
    const k = await g.ask({ type: 'choice', title: '화이트 핫 룸', options: [{ id: 'p', label: '피닉스 포스에 힘 1' }, { id: 'h', label: '진 그레이 피해 2 회복' }] }); if (k === 'h') g.heal(g.idt(), 2); else phoenixPower(g, 1);
  } }] };
  S['34005'] = { grantTrait: (g, s, t) => t === g.idt() && g.isHero() ? 'AERIAL' : null, steadyFor: (g, s, t) => t === g.idt() && restrained(g), mod: { retaliate: (g, s, t) => t === g.idt() && unleashed(g) ? 1 : 0 } }; // Phoenix Suit
  S['34006'] = { on: { hostWouldBeDefeated(g, a, wctx) { // Rise from the Ashes
    if (wctx.target !== g.idt() || g.c(a).zone !== 'upgrade') return; wctx.saved = true; g.removeFromGame(a);
    g.c(g.idt()).dmg = 0; g.c(g.idt()).ex = false; const f = pf(g); if (f) g.c(f).cnt.power = 0; g.log('잿더미에서 부활: 체력을 회복하고 준비합니다', 'good');
  } } };
  S['34007'] = { attach: { kind: 'friendly' }, on: { wouldTakeDamage(g, a, ctx) { // Telekinetic Shield
    const h = g.hostOf(a); if (ctx.target !== h || !ctx.attack || !ctx.src || !g.enemies().includes(ctx.src)) return; const n = ctx.amount - ctx.prevent; if (n <= 0) return;
    ctx.prevent = ctx.amount; g.c(a).dmg = (g.c(a).dmg || 0) + n; g.log(`염동 방어막: 피해 ${n} 흡수 (${g.c(a).dmg}/5)`, 'good'); if (g.c(a).dmg >= 5) g.discard(a, '염동 방어막이 깨졌습니다');
  } } };
  S['34008'] = { heroOnly: true, attach: { kind: 'minion', filter: (g, t) => !has(g, t, 'ELITE') }, noActivate: true, on: { formChanged(g, a, ctx) { if (ctx.form === 'alter') g.discard(a, '정신 마비 버림'); } } }; // Mental Paralysis
  S['34009'] = { attach: { kind: 'minion', filter: (g, t) => !has(g, t, 'ELITE') }, onPlay(g, u) { const m = g.c(u).on; if (m && g.c(m).zone === 'minion') g.minionToAlly(m); } }; // Mind Control
  S['34010'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { const un = unleashed(g); await g.playerAttack(g.idt(), ctx.target, 7 + (un ? 2 : 0), { src: u, overkill: un }); } } }; // Telekinetic Attack
  S['34011'] = { play: { timing: 'hero', can: g => !!g.e.villain, async resolve(g, u) { // Psychic Blast
    await g.dealDamage(g.e.villain, 4, { src: u, byPlayer: true }); if (unleashed(g)) for (const m of g.engagedMinions().slice()) await g.dealDamage(m, 4, { src: u, byPlayer: true });
  } } };
  S['34012'] = { play: { timing: 'hero', label: 'thwart', target: 'thwartable', async resolve(g, u, ctx) { // Telepathic Trickery
    const r = await g.removeThreat(ctx.target, 4, { src: u }); g.log(`텔레파시 속임수: 위협 ${r} 제거`); await g.afterThreatRemoved(ctx.target);
    if (unleashed(g) && g.enemies().length) { const t = await g.chooseTarget('enemy', '기절·혼란시킬 적', g.idt(), false); if (t) { g.giveStatus(t, 'stun', '텔레파시 속임수'); g.giveStatus(t, 'conf', '텔레파시 속임수'); } }
  } } };
  S['34013'] = { play: { timing: 'hero', async resolve(g) { // Phoenix Firebird
    const opts = []; if (power(g) > 0) opts.push({ id: 'r', label: '힘 1 제거 → 피닉스 준비' }); opts.push({ id: 'p', label: '힘 카운터 2' });
    const k = opts.length === 1 ? 'p' : await g.ask({ type: 'choice', title: '피닉스 파이어버드', options: opts });
    if (k === 'r') { phoenixPower(g, -1); if (g.canReady(g.idt())) g.c(g.idt()).ex = false; } else phoenixPower(g, 2);
  } } };
  S['34028'] = { async whenRevealed(g, u, ctx) { // Burning Hunger
    if (unleashed(g)) { const d = g.e.deck.concat(g.e.discard, g.e.setaside || []).find(x => idOf(g, x) === '34029'); g.shuffle(g.e.deck); if (d) await g.reveal(d); g.removeFromGame(u); return; }
    if (restrained(g)) phoenixPower(g, -1); ctx.surge++;
  } };
  const ctw = g => g.e.sides.find(x => idOf(g, x) === '34030') || null;
  S['34029'] = { schemeTarget: g => ctw(g), async whenRevealed(g) { if (ctw(g)) return; const x = g.e.deck.concat(g.e.discard, g.e.setaside || []).find(y => idOf(g, y) === '34030'); g.shuffle(g.e.deck); if (x) await g.reveal(x); } }; // Dark Phoenix
  S['34030'] = { permanent: true, icons: (g, u) => ({ amplify: g.c(u).threat > 0 ? 1 : 0 }), afterThreatPlaced(g, u) { if (g.c(u).threat >= 12) g.lose('세상이 피닉스에게 삼켜졌습니다'); } }; // Consume the World
  S['34031'] = { async whenRevealed(g, u, ctx) { const d = g.e.minions.find(x => idOf(g, x) === '34029'); if (d) { await g.activate(d, {}); return; } const c = ctw(g); if (c) await g.placeThreat(c, 1, {}); ctx.surge++; } }; // Fiery Rage

  // ======================= aspect cards =======================
  S['34014'] = { respond: [{ window: 'afterAllyThwart', label: '★ 하수인 혼란', can: (g, u, ctx) => ctx.ally === u && g.e.minions.length > 0, async resolve(g) { const t = await pick(g, g.e.minions.slice(), '밴시: 혼란시킬 하수인'); if (t) g.giveStatus(t, 'conf', '밴시'); } }] }; // Banshee
  S['34015'] = { respond: [{ window: 'allyPowerUsed', label: '★ 주 음모에서 그 하수인의 음모력만큼 위협 제거', can: (g, u, ctx) => ctx.ally === u && ctx.kind === 'attack' && g.d(ctx.target).type === 'minion', async resolve(g, u, ctx) { const n = g.d(ctx.target).sch || 0; if (n) await g.removeThreat(g.e.main, n, { src: u }); } }] }; // Marvel Girl
  S['34016'] = { attach: { kind: 'ally', filter: (g, t) => has(g, t, 'X-MEN') && !g.c(t).att.some(a => has(g, a, 'TRAINING')) }, mod: { thw: (g, s, t) => t === g.c(s).on ? 1 : 0, hp: (g, s, t) => t === g.c(s).on ? 2 : 0 } }; // Mission Training
  S['34017'] = { canPlay: g => has(g, g.idt(), 'PSIONIC'), interrupt: { window: 'villainSchemes', label: '이번 음모는 위협을 제거', can: g => has(g, g.idt(), 'PSIONIC'), async resolve(g, u, ctx) { ctx.invert = true; } } }; // Psychic Manipulation
  S['34018'] = { canPlay: g => has(g, g.idt(), 'X-MEN'), play: { timing: 'hero', label: 'thwart', can: g => !g.c(g.idt()).ex, async resolve(g, u) { // Mutant Peacekeepers
    g.c(g.idt()).ex = true; let n = g.stat(g.idt(), 'thw') || 0;
    const c = g.p.allies.filter(a => !g.c(a).ex && has(g, a, 'X-MEN')); const sel = c.length ? await g.ask({ type: 'select', title: '함께 소진할 [엑스맨] 동료', cards: c, min: 0, max: c.length, confirm: '확정' }) || [] : [];
    for (const a of sel) { g.c(a).ex = true; n += g.stat(a, 'thw') || 0; }
    while (n > 0) { const sc = g.schemes().filter(x => g.c(x).threat > 0 && !g.noRemove(x)); if (!sc.length) break; const t = await pick(g, sc, `뮤턴트 평화유지군: 위협을 제거할 음모 (남은 ${n})`); const r = await g.removeThreat(t, n, { src: u }); n -= r; await g.afterThreatRemoved(t); if (!r) break; }
  } } };
  S['34020'] = { onSpent(g, u, forUid) { if (forUid && g.d(forUid).type === 'event' && (g.d(forUid).tr || []).includes('THWART')) g.p.passion = (g.p.passion || 0) + 1; } }; // Passion for Justice
  S['34021'] = { selfCostMod: g => has(g, g.idt(), 'MUTANT') || has(g, g.idt(), 'X-MEN') ? 1 : 0, // Storm (ally)
    respond: [{ window: 'allyPowerUsed', label: '★ 그 음모의 위협 2를 다른 음모로 옮기기', can: (g, u, ctx) => ctx.ally === u && ctx.kind === 'thwart' && g.schemes().length > 1 && g.c(ctx.target).threat > 0, async resolve(g, u, ctx) {
      const t = await pick(g, g.schemes().filter(x => x !== ctx.target), '위협을 옮길 다른 음모'); if (!t) return; const r = await g.removeThreat(ctx.target, 2, { src: u }); if (r) await g.placeThreat(t, r, {});
    } }] };
  S['34022'] = { canPlay: g => has(g, g.idt(), 'MUTANT'), actions: [{ timing: 'alter', exhaust: true, label: '소진 → 덱 위 5장(정신 캐릭터가 있으면 덱 전체)에서 [엑스맨] 동료를 손으로', async use(g) { // Cerebro
    const all = g.friendlyChars().some(f => has(g, f, 'PSIONIC')); const pool = all ? g.p.deck.slice() : g.p.deck.slice(0, 5);
    const c = pool.filter(x => g.d(x).type === 'ally' && (g.d(x).tr || []).includes('X-MEN')); const t = c.length ? (await g.pickCards(c, '세레브로: 손으로 가져올 [엑스맨] 동료', 1, 1, '선택'))[0] : null; if (t) g.put(t, 'hand'); g.shuffle(g.p.deck);
  } }] };
  S['34032'] = { canPlay: g => has(g, g.idt(), 'PSIONIC'), play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { await g.playerAttack(g.idt(), ctx.target, 3, { src: u }); if (g.c(ctx.target).zone) g.giveStatus(ctx.target, 'conf', '정신 공격'); } } }; // Psychic Assault
  S['34033'] = { canPlay: g => has(g, g.idt(), 'PSIONIC'), interrupt: { window: 'enemyAttackInitiated', timing: 'hero', label: 'defense', can: (g, u, ctx) => has(g, g.idt(), 'PSIONIC') && g.enemies().some(e => e !== ctx.enemy), async resolve(g, u, ctx) { const t = await pick(g, g.enemies().filter(e => e !== ctx.enemy), '정신적 교란: 대신 피해를 받을 적'); if (t) ctx.redirectTo = t; } } }; // Psychic Misdirection
  S['34034'] = { canPlay: g => has(g, g.idt(), 'PSIONIC'), play: { timing: 'hero', can: g => g.p.allies.length > 0, async resolve(g) { const t = await pick(g, g.p.allies.slice(), '정신 자극: 준비시킬 동료'); if (!t) return; if (g.canReady(t)) g.c(t).ex = false; g.addPhaseMod(t, 'thw', 2); g.addPhaseMod(t, 'atk', 2); } } }; // Psychic Kicker
  S['34035'] = { play: { timing: 'hero', async resolve(g) { // Soul Sisters: ready and heal Phoenix and Storm (identity or ally)
    const nm = u => (g.d(u).en || '').replace(/^\*\s*/, '').toLowerCase();
    for (const u of g.friendlyChars().filter(x => ['phoenix', 'storm'].includes(nm(x)))) { if (g.canReady(u)) g.c(u).ex = false; g.heal(u, 2); }
  } } };

  MC.registerScripts(S);
})();
