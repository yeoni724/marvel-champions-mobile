/* Iceman (46001-46032): Frostbite, Sauron modular, and the Aggression/Basic player cards of the pack.
   Ported from cards/pack/iceman of the community build. */
(function () {
  'use strict';
  const S = {};
  const idOf = (g, u) => g.c(u).id;
  const tr = (g, u, t) => (g.d(u).tr || []).includes(t) || g.hasTrait(u, t);
  const pick = async (g, cands, title) => !cands.length ? null : cands.length === 1 ? cands[0] : await g.ask({ type: 'target', title, cands, cancelable: false });
  async function thw(g, t, n, src) { const r = await g.removeThreat(t, n, { src }); g.log(`${g.nm(t)} 위협 ${r} 제거`); await g.afterThreatRemoved(t); return r; }
  const isIce = g => ['46001a', '46001b'].includes(idOf(g, g.idt()));
  const frostOn = (g, e) => g.c(e).att.filter(a => idOf(g, a) === '46002');
  const hasFrost = (g, e) => frostOn(g, e).length > 0;
  const hasUpgrade = (g, e) => g.c(e).att.some(a => !g.d(a).enc);
  // attach a set-aside Frostbite to an enemy
  async function frost(g, e) {
    if (!e || !g.c(e).zone || !['villain', 'minion'].includes(g.c(e).zone)) return false;
    const f = (g.p.pset || []).find(x => idOf(g, x) === '46002'); if (!f) { g.log('따로 둔 동상이 없습니다'); return false; }
    g.put(f, 'attach', e); g.log(`동상 → ${g.nm(e)}`, 'good');
    for (const o of (g.p.obl || []).filter(x => idOf(g, x) === '46024')) { g.log('★ 성급함: 피해 1', 'warn'); await g.dealDamage(g.idt(), 1, {}); }
    return true;
  }
  MC.iceman = { frost, hasFrost };
  const setAsideFrost = (g, u) => { g.resetCard(u); g.put(u, 'pset'); };
  S['46002'] = { mod: { sch: (g, s, t) => g.c(s).zone === 'attach' && t === g.c(s).on ? -1 : 0, atk: (g, s, t) => g.c(s).zone === 'attach' && t === g.c(s).on ? -1 : 0 }, // Frostbite
    on: { hostActivated(g, u) { if (g.c(u).zone === 'attach') { setAsideFrost(g, u); g.log('동상: 활성화한 적에게서 떨어져 따로 둡니다'); } } },
    onLeave(g, u) { if (g.c(u).zone !== 'pset') setAsideFrost(g, u); } };
  const freeze = async (g, e) => { if (await frost(g, e)) await g.window('freezeResolved', { enemy: e }); };
  S['46001a'] = { respond: [
    { window: 'basicPowerUsed', label: '"얼어붙어라!": 공격 대상에 동상 부착', can: (g, u, ctx) => ctx.kind === 'attack' && ctx.target && g.enemies().includes(ctx.target) && (g.p.pset || []).some(x => idOf(g, x) === '46002'), async resolve(g, u, ctx) { await freeze(g, ctx.target); } },
    { window: 'heroDefends', label: '"얼어붙어라!": 공격한 적에 동상 부착 (이번 공격 피해 -1)', can: (g, u, ctx) => !!ctx.enemy && g.c(ctx.enemy).zone && (g.p.pset || []).some(x => idOf(g, x) === '46002'), async resolve(g, u, ctx) { if (await frost(g, ctx.enemy)) { ctx.defBonus += 1; await g.window('freezeResolved', { enemy: ctx.enemy }); } } }] };
  S['46001b'] = { respond: [{ window: 'afterChangeForm', label: '진정: 동상 수만큼 [얼음] 카드를 덱에 섞기', can: (g, u, ctx) => ctx.form === 'alter' && g.p.discard.some(x => tr(g, x, 'ICE')), async resolve(g) {
    const n = Object.keys(g.s.cards).filter(x => g.c(x).id === '46002' && g.c(x).zone === 'attach').length; let k = 0;
    for (let i = 0; i < n; i++) { const t = await pick(g, g.p.discard.filter(x => tr(g, x, 'ICE')), '덱에 섞을 [얼음] 카드'); if (!t) break; g.put(t, 'deck'); k++; } g.shuffle(g.p.deck); g.log(`진정: [얼음] 카드 ${k}장을 덱에 섞습니다`); } }] };
  S['46003'] = { noUpgrades: true, consRedVs: (g, a, t) => hasFrost(g, t) }; // Snow Clone
  S['46004'] = { mod: { hp: (g, s, t) => t === g.idt() ? 3 : 0 }, resources: [{ gen: 'G', label: '파워 벨트 ([얼음] 카드)', forOnly: (g, s, uid) => !!uid && tr(g, uid, 'ICE'), can: (g, u) => !g.c(u).ex && g.isHero(), use: (g, u) => { g.c(u).ex = true; } }] }; // Power Belt
  S['46005'] = { respond: [{ window: 'freezeResolved', timing: 'hero', exhaust: true, label: '소진 → 카드 1장, [얼음]이면 아이스맨 준비', async resolve(g) { const before = g.p.hand.slice(); await g.draw(1); const x = g.p.hand.find(y => !before.includes(y)); if (x && tr(g, x, 'ICE') && g.canReady(g.idt())) { g.c(g.idt()).ex = false; g.log('냉기 감지: 아이스맨 준비', 'good'); } } }] }; // Cryokinetic Perception
  S['46006'] = { grantTrait: (g, s, t) => t === g.idt() && g.isHero() ? 'AERIAL' : null, mod: { thw: (g, s, t) => t === g.idt() && g.isHero() ? 1 : 0, atk: (g, s, t) => t === g.idt() && g.isHero() ? 1 : 0, def: (g, s, t) => t === g.idt() && g.isHero() ? 1 : 0 }, // Ice Slide
    on: { formChanged(g, u) { if (!g.isHero() && g.c(u).zone === 'upgrade') { g.put(u, 'deck'); g.shuffle(g.p.deck); g.log('얼음 미끄럼틀을 덱에 섞습니다'); } } } };
  S['46007'] = { heroOnly: true, attach: { kind: 'enemy', filter: (g, t) => !g.c(t).att.some(a => idOf(g, a) === '46007') }, // Frozen Solid
    async insteadOfActivation(g, u, enemy) { g.discard(u, `꽁꽁 얼음: ${g.nm(enemy)}의 활성화 대신 버림`); await frost(g, enemy); } };
  S['46008'] = { async absorbIdentityDamage(g, u, n, o) { if (!o.attack) return n; const c = g.c(u); c.cnt.damage = (c.cnt.damage || 0) + n; g.log(`얼음 벽이 피해 ${n}을 받습니다 (총 ${c.cnt.damage})`, 'good'); // Ice Wall
    if (c.cnt.damage >= 8) { const e = g.e.curAttacker; g.discard(u, '얼음 벽이 부서졌습니다'); if (e) await frost(g, e); } return 0; } };
  S['46009'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { const t = ctx.target; // Arctic Attack
    if (hasFrost(g, t) && (await g.ask({ type: 'choice', title: '북극 공격', options: [{ id: '6', label: '피해 6 (동상 붙은 적)' }, { id: '4', label: '피해 4 + 동상 부착' }] })) === '6') await g.playerAttack(g.idt(), t, 6, { src: u });
    else { await g.playerAttack(g.idt(), t, 4, { src: u }); if (g.c(t).zone) await frost(g, t); } } } };
  S['46010'] = { play: { timing: 'hero', async resolve(g, u) { const pi = await g.choosePlayer('얼음 작렬: 대상 플레이어'); for (const e of [g.e.villain].concat(g.engagedMinions(pi)).filter(Boolean)) await frost(g, e); for (const e of g.enemies().filter(x => hasFrost(g, x))) await g.dealDamage(e, 3, { src: u, byPlayer: true }); } } }; // Ice Blast
  S['46011'] = { play: { timing: 'hero', label: 'thwart', target: 'thwartable', async resolve(g, u, ctx) { await thw(g, ctx.target, 3, u); const e = await pick(g, g.enemies().slice(), '진정해!: 동상을 붙일 적'); if (e) await frost(g, e); } } }; // Chill Out!
  S['46024'] = { whenRevealed(g, u) { g.put(u, 'pobl'); g.log('성급함: 동상을 붙일 때마다 피해 1', 'warn'); }, // Hot-Headed
    respond: [{ window: 'afterRecover', timing: 'alter', label: '성급함 버림', can: (g, u) => g.c(u).zone === 'pobl', resolve(g, u) { g.discard(u); } }] };
  // Pyro (nemesis)
  const pyro = g => g.e.minions.find(m => idOf(g, m) === '46025') || null;
  const burnTop = async (g, n) => { let k = 0; for (let i = 0; i < n; i++) { if (!g.p.deck.length) await g.reshuffleDeck(); const x = g.p.deck[0]; if (!x) break; g.put(x, 'discard'); k += (g.d(x).res || '').length; } return k; };
  S['46025'] = { attackProps: (g, s, ctx) => ctx.enemy === s ? { indirect: true } : null };
  S['46026'] = { async whenDefeated(g) { const k = await burnTop(g, 3); if (k) await g.indirectDamage(k, null); } };
  S['46027'] = { attachTo: g => pyro(g), surgeIfNoHost: true, on: { async hostWouldAttack(g, u, ctx) { const k = await burnTop(g, 1); if (k) { ctx.atkBonus = (ctx.atkBonus || 0) + k; g.log(`★ 화염방사기: 공격 +${k}`); } } } };
  S['46028'] = { async whenRevealed(g) { const k = await burnTop(g, pyro(g) ? 3 : 2); if (k) await g.indirectDamage(k, null); }, async boostEffect(g) { return await burnTop(g, 1); } }; // Burn!
  // Sauron (modular)
  const sauron = g => g.e.minions.find(m => idOf(g, m) === '46029') || null;
  S['46029'] = { async whenRevealed(g) { const x = g.e.deck.concat(g.e.discard).find(y => idOf(g, y) === '46031'); if (x) { g.shuffle(g.e.deck); await g.reveal(x); } }, // Sauron
    boostEffect(g, u, ctx) { const e = ctx.enemy; if (e && g.c(e).zone) { g.heal(e, 3); g.giveStatus(e, 'tough', '★ 사우론'); } } };
  S['46030'] = { whenDefeated(g) { const x = g.e.deck.concat(g.e.discard).find(y => idOf(g, y) === '46029'); if (x) { g.put(x, 'facedown'); g.shuffle(g.e.deck); g.log('사우론을 뒷면 조우 카드로 받습니다', 'warn'); } } };
  S['46031'] = { revealFirst: true, async whenRevealed(g, u, ctx) { const ms = g.e.minions; if (!ms.length) { g.discard(u); ctx.surge++; return; } const hi = Math.max(...ms.map(m => g.d(m).hp || 0)); const t = await pick(g, ms.filter(m => (g.d(m).hp || 0) === hi), '생명력 흡수를 붙일 하수인'); g.attachEnc(u, t); await g.activate(t, {}); }, // Life Drain
    on: { async hostWouldAttack(g, u, ctx) { await g.dealDamage(g.idt(), 2, {}); g.giveStatus(ctx.enemy, 'tough', '★ 생명력 흡수'); } } };
  S['46032'] = { async whenRevealed(g) { const n = sauron(g) ? 3 : 2; const out = []; for (let i = 0; i < n; i++) { if (!g.p.deck.length) await g.reshuffleDeck(); const x = g.p.deck[0]; if (!x) break; g.put(x, 'discard'); out.push(x); } // The Eye of Sauron
    for (const x of out) for (const r of (g.d(x).res || '')) {
      if (r === 'Y') await g.placeThreat(g.e.main, 1, {}); else if (r === 'B') { if (g.p.hand.length) await g.discardFromHand(1, 1, '사우론의 눈: 버릴 카드'); } else if (r === 'R') await g.dealDamage(g.idt(), 1, {});
      else if (r === 'G') { const t = await pick(g, g.friendlyChars().filter(c => !g.c(c).ex), '사우론의 눈: 소진할 캐릭터'); if (t) g.c(t).ex = true; } } } };
  // Aggression / Basic
  S['46012'] = { atkVs: (g, s, uid, t) => uid === s && t && g.c(t) ? g.c(t).att.filter(x => !g.d(x).enc).length : 0 }; // Shark-Girl
  S['46013'] = { canPlay: g => tr(g, g.idt(), 'X-MEN'), async onEnter(g, u) { const c = g.enemies().filter(e => hasUpgrade(g, e)); const t = await pick(g, c, '글롭: 피해 2를 줄 적 (업그레이드 부착)'); if (t) await g.dealDamage(t, 2, { src: u, byPlayer: true }); } }; // Glob
  S['46014'] = { attach: { kind: 'minion', filter: (g, t) => !g.c(t).att.some(a => idOf(g, a) === '46014') }, // Suppressing Fire
    on: { attachedDefeated(g, u, ctx) { if (ctx.byPlayer && (!ctx.src || !g.p.allies.includes(ctx.src))) { g.heal(g.idt(), 2); g.log('제압 사격: 히어로 회복 2', 'good'); } } } };
  S['46015'] = { interrupt: { window: 'basicPowerUsed', timing: 'hero', label: '기습: 공격 +2', can: (g, u, ctx) => ctx.kind === 'attack' && ctx.target && hasUpgrade(g, ctx.target), resolve(g, u, ctx) { ctx.bonus += 2; const t = ctx.target; // Surprise Move
    (ctx.after = ctx.after || []).push(async gg => { if (!gg.c(t).zone || !['villain', 'minion'].includes(gg.c(t).zone)) { if (gg.canReady(gg.idt())) gg.c(gg.idt()).ex = false; gg.log('기습: 적을 물리쳐 히어로 준비', 'good'); } }); } } };
  S['46016'] = { play: { timing: 'hero', label: 'attack', target: { kind: 'attackable', filter: (g, t) => hasUpgrade(g, t) }, async resolve(g, u, ctx) { await g.playerAttack(g.idt(), ctx.target, 7, { src: u }); } } }; // Take That!
  S['46017'] = { play: { timing: 'hero', label: 'thwart', async resolve(g, u) { for (let i = 0; i < 200; i++) { const x = g.takeEncounter(); if (!x) break; g.put(x, 'ediscard'); if (g.d(x).type === 'minion') { await g.enterMinion(x, {}); break; } } await thw(g, g.e.main, 3, u); } } }; // Looking for Trouble
  S['46018'] = { async whenDefeated(g) { await g.forEachPlayer(async () => { await g.searchToHand(d => d.type === 'event' && (d.tr || []).includes('ATTACK'), `압박 유지(${g.playerName()}): [공격] 이벤트`, { discard: true }); g.p.phase.atkEvBonus = (g.p.phase.atkEvBonus || 0) + 1; }); g.log('이번 단계 동안 [공격] 이벤트 피해 +1', 'good'); } }; // Keep Up the Pressure
  S['46019'] = { canPlay: g => tr(g, g.idt(), 'X-MEN'), async onEnter(g) { const t = await pick(g, g.e.sides.slice(), '섀도캣: 아이콘을 잃을 부가 음모'); if (t) { g.c(t).iconsOffRound = g.s.round; g.log(`${g.nm(t)}: 이번 라운드 동안 가속·증폭·위기·위험 아이콘 없음`, 'good'); } } }; // Shadowcat (ally)
  S['46020'] = { async onEnter(g, u) { const n = g.p.allies.filter(a => tr(g, a, 'X-MEN')).length; if (n) await g.removeThreatChoose(n, '비크: 위협 제거', u); } }; // Beak
  S['46023'] = { doubleFor: (g, s, uid) => !!uid && g.d(uid).cls === 'Basic' }; // The Power in All of Us
  MC.registerScripts(S);
})();
