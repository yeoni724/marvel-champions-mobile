/* Silk (52001-52038): tucked encounter cards, Growing Strong modular and the pack's Web-Warrior player cards.
   Ported from cards/pack/silk of the community build. */
(function () {
  'use strict';
  const S = {};
  const idOf = (g, u) => g.c(u).id;
  const tr = (g, u, t) => (g.d(u).tr || []).includes(t) || g.hasTrait(u, t);
  const pick = async (g, cands, title) => !cands.length ? null : cands.length === 1 ? cands[0] : await g.ask({ type: 'target', title, cands, cancelable: false });
  const yes = async (g, title) => (await g.ask({ type: 'choice', title, options: [{ id: 'y', label: '예' }, { id: 'n', label: '아니요' }] })) === 'y';
  async function thw(g, t, n, src) { const r = await g.removeThreat(t, n, { src }); g.log(`${g.nm(t)} 위협 ${r} 제거`); await g.afterThreatRemoved(t); return r; }
  const isSilk = g => ['52001a', '52001b'].includes(idOf(g, g.idt()));
  const tucked = g => g.c(g.idt()).under.filter(x => g.d(x).enc);
  const sameSet = (g, a, b) => !!g.d(a).set && g.d(a).set === g.d(b).set;
  const tuckedLike = (g, x) => tucked(g).filter(t => sameSet(g, t, x));
  const overload = g => (g.p.obl || []).find(x => idOf(g, x) === '52028') || null;
  async function trim(g) { while (tucked(g).length > 4) { const t = await pick(g, tucked(g), '아래에 둔 카드가 4장을 넘습니다: 버릴 카드'); await untuck(g, t); } }
  async function untuck(g, t) { g.c(t).fd = false; g.put(t, 'ediscard'); if (idOf(g, t) === '52031') { g.log('거미 신부 사냥: 피해 2', 'warn'); await g.dealDamage(g.idt(), 2, {}); } }
  async function tuck(g, x, byPlayer) { // tuck an encounter card under your identity
    if (!x) return; const o = byPlayer && overload(g);
    if (o) { g.resetCard(x); g.put(x, 'under', o); const n = g.c(o).under.length; g.log(`실크 감각 과부하: ${g.nm(x)}을(를) 의무 카드 아래에 둡니다 (${n}장)`, 'warn');
      if (n >= 3) { for (const y of g.c(o).under.slice()) g.put(y, 'ediscard'); g.removeFromGame(o); g.log('실크 감각 과부하를 게임에서 제거', 'good'); } else if (n >= 2 && await yes(g, '실크 감각 과부하를 버릴까요?')) { for (const y of g.c(o).under.slice()) g.put(y, 'ediscard'); g.discard(o); } return; }
    g.resetCard(x); g.put(x, 'under', g.idt()); g.log(`${g.nm(x)}을(를) 정체성 아래에 둡니다`, 'good'); await trim(g);
  }
  MC.silk = { tucked, tuck, untuck, sameSet };
  const silkSense = [
    { window: 'afterPlayerDefeatsMinion', label: '실크 감각: 그 하수인을 아래에 둠', can: (g, u, ctx) => ctx.minion && g.c(ctx.minion).zone === 'ediscard', async resolve(g, u, ctx) { await tuck(g, ctx.minion, true); } },
    { window: 'sideSchemeDefeated', label: '실크 감각: 그 부가 음모를 아래에 둠', can: (g, u, ctx) => ctx.scheme && g.c(ctx.scheme).zone === 'ediscard' && g.d(ctx.scheme).enc, async resolve(g, u, ctx) { await tuck(g, ctx.scheme, true); } },
    { window: 'treacheryResolved', label: '실크 감각: 그 변고를 아래에 둠', can: (g, u, ctx) => ctx.card && ['ediscard', 'limbo'].includes(g.c(ctx.card).zone), async resolve(g, u, ctx) { await tuck(g, ctx.card, true); } }];
  S['52001a'] = { respond: silkSense };
  S['52001b'] = { actions: [{ timing: 'alter', label: '아래 카드 1장 버림 → 카드 2장 (라운드당 1번)', can: g => tucked(g).length > 0 && g.p.usedOnce.cindy !== g.s.round, async use(g) { g.p.usedOnce.cindy = g.s.round; const t = await pick(g, tucked(g), '버릴 카드'); if (t) await untuck(g, t); await g.draw(2); } }] };
  S['52002'] = { play: { timing: 'hero', async resolve(g) { const c = g.enemies().concat(g.schemes()).filter(x => g.d(x).set); const t = await pick(g, c, '부드러운 실크: 적 또는 음모'); if (!t) return; // Smooth as Silk
    for (let i = 0; i < 200; i++) { const x = g.takeEncounter(); if (!x) break; g.put(x, 'ediscard'); if (sameSet(g, x, t)) { await tuck(g, x, true); break; } } } } };
  S['52003'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { const t = ctx.target; const m = tuckedLike(g, t); let big = false; // Swinging Silk Kick
    if (m.length && await yes(g, '같은 세트의 아래 카드를 버리고 피해 +2·압도를 얻을까요?')) { await untuck(g, await pick(g, m, '버릴 카드')); big = true; }
    await g.playerAttack(g.idt(), t, big ? 9 : 7, Object.assign({ src: u }, big ? { overkill: true } : {})); } } };
  S['52004'] = { play: { timing: 'hero', label: 'thwart', target: 'thwartable', async resolve(g, u, ctx) { await thw(g, ctx.target, 2, u); const c = g.schemes().filter(s => g.c(s).threat > 0 && tuckedLike(g, s).length); const s = c.length ? await g.ask({ type: 'target', title: '벽타기: 같은 세트 카드를 버리고 위협 3을 제거할 음모 (취소 가능)', cands: c, cancelable: true }) : null; // Wallcrawl
    if (s) { await untuck(g, await pick(g, tuckedLike(g, s), '버릴 카드')); await thw(g, s, 3, u); } } } };
  S['52005'] = { actions: [{ timing: 'alter', label: '정체성 소진 → 특종 위협 2 제거', can: (g, u) => g.c(u).zone === 'side' && !g.c(g.idt()).ex && g.c(u).threat > 0, async use(g, u) { g.c(g.idt()).ex = true; g.c(u).threat = Math.max(0, g.c(u).threat - 2); await g.afterThreatRemoved(u); } }], // Get the Scoop
    async whenDefeated(g) { const c = g.e.deck.slice(0, 2); const t = await pick(g, c, '특종: 아래에 둘 조우 카드'); if (t) await tuck(g, t, true); } };
  S['52006'] = { actions: [{ timing: 'alter', exhaust: true, label: '앨버트 문: 조우 덱 위 카드를 아래에 두거나 아래 카드마다 회복 1', can: () => true, async use(g) { const o = await g.ask({ type: 'choice', title: '앨버트 문', options: [{ id: 't', label: '조우 덱 위 카드를 신디 아래에' }, { id: 'h', label: `회복 ${tucked(g).length}` }] }); if (o === 't') { const x = g.takeEncounter(); if (x) await tuck(g, x, true); } else g.heal(g.idt(), tucked(g).length); } }] }; // Albert Moon
  S['52007'] = { actions: [ // J. Jonah Jameson
    { timing: 'alter', exhaust: true, label: '특종을 찾아 플레이 영역에', can: g => g.p.deck.concat(g.p.discard).some(x => idOf(g, x) === '52005'), async use(g) { const x = g.p.deck.concat(g.p.discard).find(y => idOf(g, y) === '52005'); g.shuffle(g.p.deck); if (x) await g.enterSide(x, {}); } },
    { timing: 'action', exhaust: true, label: '부가 음모 위협 2 제거', can: g => g.e.sides.some(s => g.c(s).threat > 0), async use(g, u) { const t = await pick(g, g.e.sides.filter(s => g.c(s).threat > 0), '위협 2를 제거할 부가 음모'); if (t) await thw(g, t, 2, u); } }] };
  S['52008'] = { willRevealHook: true, respond: [{ window: 'willReveal', exhaust: true, label: '직관 기억: 아래의 같은 세트 카드와 바꿔 공개', can: (g, u, ctx) => tuckedLike(g, ctx.card).length > 0, async resolve(g, u, ctx) { // Eidetic Memory
    const t = await pick(g, tuckedLike(g, ctx.card), '대신 공개할 아래 카드'); if (!t) return; g.c(t).fd = false; g.put(t, 'limbo'); g.resetCard(ctx.card); g.put(ctx.card, 'under', g.idt()); ctx.replace = t; } }] };
  S['52009'] = { mod: { thw: (g, s, t) => t === g.idt() && isSilk(g) && g.isHero() ? 1 : 0 }, grantTrait: (g, s, t) => t === g.idt() && g.c(s).aerialRound === g.s.round ? 'AERIAL' : null, // Organic Webbing
    actions: [{ timing: 'hero', exhaust: true, label: '아래 카드 1장 버림 → 실크 준비, 이번 라운드 [비행]', can: g => tucked(g).length > 0 && g.c(g.idt()).ex, async use(g, u) { await untuck(g, await pick(g, tucked(g), '버릴 카드')); if (g.canReady(g.idt())) g.c(g.idt()).ex = false; g.c(u).aerialRound = g.s.round; } }] };
  S['52010'] = { respond: [{ window: 'basicPowerUsed', timing: 'hero', exhaust: true, label: '허 찌르기: 같은 세트 아래 카드마다 저지 +1', can: (g, u, ctx) => ctx.kind === 'thwart' && ctx.target && tuckedLike(g, ctx.target).length > 0, resolve(g, u, ctx) { ctx.bonus += tuckedLike(g, ctx.target).length; } }] }; // Outwit
  S['52011'] = { respond: [{ window: 'basicPowerUsed', timing: 'hero', exhaust: true, label: '거미 발톱: 같은 세트 아래 카드마다 공격 +1, 관통', can: (g, u, ctx) => ctx.kind === 'attack' && ctx.target, resolve(g, u, ctx) { ctx.bonus += tuckedLike(g, ctx.target).length; ctx.piercing = true; } }] }; // Spider Claws
  S['52012'] = { respond: [{ window: 'heroDefends', timing: 'hero', exhaust: true, label: '거미 반사신경: 같은 세트 아래 카드마다 방어 +1', can: (g, u, ctx) => !!ctx.enemy, resolve(g, u, ctx) { ctx.defBonus += tuckedLike(g, ctx.enemy).length; ctx.after.push(async gg => { const x = gg.e.discard[gg.e.discard.length - 1]; if (x) await tuck(gg, x, true); }); } }] }; // Spider Reflexes
  S['52013'] = { respond: [ // Scarlet Spider
    { window: 'identityWouldTakeDamage', label: '스칼렛 스파이더가 대신 피해를 받습니다', can: (g, u, ctx) => g.c(u).zone === 'ally' && tr(g, ctx.target, 'WEB-WARRIOR') && ctx.amount - ctx.prevent > 0, async resolve(g, u, ctx) { const n = ctx.amount - ctx.prevent; ctx.prevent += n; await g.dealDamage(u, n, {}); } },
    { window: 'allyWouldTakeDamage', label: '스칼렛 스파이더가 대신 피해를 받습니다', can: (g, u, ctx) => g.c(u).zone === 'ally' && ctx.target !== u && tr(g, ctx.target, 'WEB-WARRIOR') && ctx.amount - ctx.prevent > 0, async resolve(g, u, ctx) { const n = ctx.amount - ctx.prevent; ctx.prevent += n; await g.dealDamage(u, n, {}); } }] };
  S['52014'] = { selfCostMod: g => g.controlled().filter(x => tr(g, x, 'TECH')).length }; // Spider-Byte
  S['52016'] = { interrupt: { window: 'afterHeroDefends', timing: 'hero', label: '"그만 때려!": 방어력만큼 피해', can: (g, u, ctx) => ctx.noDamage && g.c(ctx.enemy).zone, async resolve(g, u, ctx) { await g.playerAttack(g.idt(), ctx.enemy, g.stat(g.idt(), 'def'), { src: u }); } } }; // "Stop Hitting Yourself"
  S['52017'] = { actions: [{ timing: 'alter', exhaust: true, label: '싱클레어 박사: [정신] → 회복력만큼 회복', cost: { n: 1, req: 'B' }, can: g => g.c(g.idt()).dmg > 0 || g.c(g.idt()).stun || g.c(g.idt()).conf, async use(g) { g.heal(g.idt(), g.stat(g.idt(), 'rec')); const c = g.c(g.idt()); const k = ['stun', 'conf', 'tough'].filter(x => c[x] && x !== 'tough'); if (k.length && await yes(g, '정체성의 상태 카드 1장을 버릴까요?')) { const s = k.length === 1 ? k[0] : await g.ask({ type: 'choice', title: '버릴 상태', options: k.map(x => ({ id: x, label: x === 'stun' ? '기절' : '혼란' })) }); c[s] = false; } } }] }; // Dr. Sinclair
  const shield = w => ({ window: w, label: '에너지 방패: [에너지] X개 → 피해 X 방지', can: (g, u, ctx) => g.c(u).on === ctx.target && ctx.amount - ctx.prevent > 0 && g.canAfford({ n: 1, req: 'Y' }, null), async resolve(g, u, ctx) {
    const max = ctx.amount - ctx.prevent; let n = 0; for (let k = max; k >= 1; k--) if (g.canAfford({ n: k, req: 'Y'.repeat(k) }, null)) { n = k; break; } if (!n) return;
    const k = +(await g.ask({ type: 'choice', title: '에너지 방패: 방지할 피해', options: Array.from({ length: n }, (_, i) => n - i).map(x => ({ id: String(x), label: `${x}` })) })) || n; if ((await g.pay({ n: k, req: 'Y'.repeat(k) }, u, '에너지 방패', true)) != null) ctx.prevent += k; } });
  S['52018'] = { attach: { kind: 'friendly', filter: (g, t) => !g.c(t).att.some(a => idOf(g, a) === '52018') }, respond: [shield('identityWouldTakeDamage'), shield('allyWouldTakeDamage')] }; // Energy Shield
  S['52019'] = { respond: [{ window: 'enemyWouldActivate', label: '싸울 준비: 버리고 히어로로 변신, 그 적이 대신 공격', can: (g, u, ctx) => ctx.kind === 'scheme' && !g.formLocked(), async resolve(g, u, ctx) { g.discard(u, '싸울 준비'); ctx.cancel = true; if (!g.isHero()) await g.changeForm(true); await g.enemyAttack(ctx.enemy, {}); } }] }; // Ready for a Fight
  S['52020'] = { actions: [{ timing: 'hero', exhaust: true, label: '전기 충격기: 충전 1 → 하수인 기절 / 충전 2 → 빌런 기절', can: (g, u) => (g.c(u).cnt.charge || 0) > 0, async use(g, u) { const c = g.c(u); const o = []; if (g.e.minions.length) o.push({ id: '1', label: '충전 1: 하수인 기절' }); if (c.cnt.charge >= 2 && g.e.villain) o.push({ id: '2', label: '충전 2: 빌런 기절' }); if (!o.length) return; // Stun Gun
    const k = o.length === 1 ? o[0].id : await g.ask({ type: 'choice', title: '전기 충격기', options: o }); c.cnt.charge -= +k; if (k === '1') { const t = await pick(g, g.e.minions.slice(), '기절시킬 하수인'); if (t) g.giveStatus(t, 'stun', '전기 충격기'); } else g.giveStatus(g.e.villain, 'stun', '전기 충격기'); g.cleanupUses(u); } }] };
  S['52021'] = { async onEnter(g) { const x = g.controlled().concat([g.idt()]).filter(c => tr(g, c, 'WEB-WARRIOR')).length; const top = g.e.deck.slice(0, x); if (!top.length) return; // Madame Web
    const t = await g.ask({ type: 'target', title: `마담 웹: 조우 덱 위 ${top.length}장 — 버릴 카드 (취소 가능)`, cands: top, cancelable: true }); if (t) { g.put(t, 'ediscard'); g.log(`${g.nm(t)}을(를) 버립니다`, 'good'); } } };
  S['52024'] = { interrupt: { window: 'enemyWouldActivate', timing: 'alter', label: '탐사 보도: 음모 활성화 취소, 그 적 혼란', can: (g, u, ctx) => ctx.kind === 'scheme', resolve(g, u, ctx) { ctx.cancel = true; g.giveStatus(ctx.enemy, 'conf', '탐사 보도'); } } }; // Investigative Journalism
  S['52028'] = { whenRevealed(g, u) { g.put(u, 'pobl'); g.log('실크 감각 과부하: 플레이어 효과로 아래에 둘 카드가 이 카드 아래로 갑니다', 'warn'); } }; // Silk Sense Overload
  // Morlun (nemesis)
  const allTucked = g => g.livingPlayers().reduce((n, i) => n + (g.c(g.idt(i)).under || []).filter(x => g.d(x).enc).length, 0);
  S['52029'] = { mod: { sch: (g, s, t) => t === s ? allTucked(g) : 0, atk: (g, s, t) => t === s ? allTucked(g) : 0 }, whenDefeated(g) { for (const pi of g.livingPlayers()) for (const x of (g.c(g.idt(pi)).under || []).filter(y => g.d(y).enc)) if (idOf(g, x) === '52031') g.put(x, 'ediscard'); } };
  S['52030'] = { whenRevealed(g, u) { const n = allTucked(g); if (n) { g.c(u).threat += n; g.log(`대사냥: 위협 +${n}`); } } };
  S['52031'] = { async whenRevealed(g, u) { if (tucked(g).length >= 4) { const t = tucked(g)[Math.floor(g.rand() * 4)]; g.put(t, 'ediscard'); } g.resetCard(u); g.put(u, 'under', g.idt()); g.log('거미 신부 사냥: 정체성 아래에 둡니다', 'warn'); } };
  // Leadership / Aggression / Justice
  S['52032'] = { respond: [{ window: 'afterAllyAttack', label: '★ [웹 워리어] 동료 1명을 손으로', can: (g, u, ctx) => ctx.ally === u && g.allAllies().some(a => tr(g, a, 'WEB-WARRIOR')), async resolve(g) { await back(g); } }, { window: 'afterAllyThwart', label: '★ [웹 워리어] 동료 1명을 손으로', can: (g, u, ctx) => ctx.ally === u && g.allAllies().some(a => tr(g, a, 'WEB-WARRIOR')), async resolve(g) { await back(g); } }] }; // Spider-Man 2099
  async function back(g) { const t = await pick(g, g.allAllies().filter(a => tr(g, a, 'WEB-WARRIOR')), '손으로 되돌릴 동료'); if (t) { for (const a of g.c(t).att.slice()) g.discard(a); g.resetCard(t); g.put(t, 'hand'); } }
  S['52033'] = { respond: [{ window: 'allyEntered', label: '스파이더우먼: 적에게 피해 1', can: (g, u, ctx) => g.c(u).zone === 'ally' && tr(g, ctx.ally, 'WEB-WARRIOR'), async resolve(g, u) { const t = await g.chooseTarget('enemy', '피해 1', u, false); if (t) await g.dealDamage(t, 1, { src: u, byPlayer: true }); } }] }; // Spider-Woman
  S['52034'] = { play: { timing: 'hero', can: g => g.friendlyChars().some(c => tr(g, c, 'WEB-WARRIOR')), async resolve(g) { const w = await pick(g, g.friendlyChars().filter(c => tr(g, c, 'WEB-WARRIOR')), '피해 1을 받을 [웹 워리어]'); if (w) await g.dealDamage(w, 1, {}); // Quick Quip
    for (let i = 0; i < 2; i++) { const e = await g.chooseTarget('enemy', `재치 있는 농담: 혼란 (${i + 1}/2)`, g.idt(), false); if (e) g.giveStatus(e, 'conf', '재치 있는 농담'); } } } };
  // Growing Strong (modular)
  const atlas = g => g.e.minions.find(m => idOf(g, m) === '52035') || null;
  S['52035'] = { mod: { hp: (g, s, t) => t === s ? 2 * (g.c(s).cnt.growth || 0) : 0 }, on: { roundEnd(g, u) { if (g.c(u).zone !== 'minion') return; g.c(u).cnt.growth = (g.c(u).cnt.growth || 0) + 1; g.log(`아틀라스 성장 카운터 ${g.c(u).cnt.growth}`, 'warn'); if (g.c(u).cnt.growth >= 10 && g.e.sides.some(x => idOf(g, x) === '52036')) g.lose('아틀라스의 성장 카운터가 10개가 되었습니다'); } } }; // Atlas
  S['52036'] = { whenRevealed(g, u) { const a = atlas(g); const n = a ? g.c(a).cnt.growth || 0 : 0; if (n) g.c(u).threat += n; if (n >= 10) g.lose('아틀라스의 성장 카운터가 10개입니다'); } }; // Grow Invulnerable
  S['52037'] = { async whenRevealed(g, u, ctx) { let a = atlas(g); if (!a) { const x = g.e.deck.concat(g.e.discard).find(y => idOf(g, y) === '52035'); if (x) { g.shuffle(g.e.deck); await g.enterMinion(x, {}); a = atlas(g); } } if (a && g.c(a).zone === 'minion') { g.c(a).eng = g.s.ctx; await g.activate(a, {}); } else ctx.surge++; }, // Growing Strong
    boostEffect(g, u, ctx) { if (ctx.enemy && g.c(ctx.enemy).zone) g.giveStatus(ctx.enemy, 'tough', '★ 점점 강해진다'); } };
  S['52038'] = { // Titanic Proportions (Growing Strong)
    async whenRevealed(g, u, ctx) { const a = atlas(g); const n = a ? g.c(a).cnt.growth || 0 : 0; if (n) await g.indirectDamage(n, u); if (n < 3 && ctx) { ctx.surge = (ctx.surge || 0) + 1; g.log('거대한 체구: 쇄도'); } },
    boostEffect(g) { const a = atlas(g); if (a) { g.c(a).cnt.growth = (g.c(a).cnt.growth || 0) + 1; g.log('★ 거대한 체구: 아틀라스 성장 카운터 +1', 'warn'); } }
  };
  MC.registerScripts(S);
})();
