/* Falcon (53001-53042): boost-icon tricks with the encounter deck top, Techno modular and the pack's player cards.
   Ported from cards/pack/falcon of the community build. */
(function () {
  'use strict';
  const S = {};
  const idOf = (g, u) => g.c(u).id;
  const tr = (g, u, t) => (g.d(u).tr || []).includes(t) || g.hasTrait(u, t);
  const pick = async (g, cands, title) => !cands.length ? null : cands.length === 1 ? cands[0] : await g.ask({ type: 'target', title, cands, cancelable: false });
  const yes = async (g, title) => (await g.ask({ type: 'choice', title, options: [{ id: 'y', label: '예' }, { id: 'n', label: '아니요' }] })) === 'y';
  async function thw(g, t, n, src) { const r = await g.removeThreat(t, n, { src }); g.log(`${g.nm(t)} 위협 ${r} 제거`); await g.afterThreatRemoved(t); return r; }
  const icons = (g, x) => x ? (g.d(x).boost || 0) + (g.d(x).boostStar ? 1 : 0) : 0; // [star] and [boost] icons in the boost area
  const discardEncTop = g => { const x = g.takeEncounter(); if (x) { g.put(x, 'ediscard'); g.log(`조우 덱 맨 위 버림: ${g.nm(x)} (아이콘 ${icons(g, x)})`); } return x; };
  MC.falcon = { icons, discardEncTop };
  const isFalcon = g => ['53001a', '53001b'].includes(idOf(g, g.idt()));
  S['53001a'] = { showEncTop: true, respond: [{ window: 'cardPlayedDone', label: '독수리 눈: 조우 덱 맨 위 카드 버림', can: (g, u, ctx) => ctx.card && tr(g, ctx.card, 'AERIAL') && g.e.deck.length > 0, async resolve(g) { const x = discardEncTop(g); await g.window('eagleEyed', { card: x }); } }] };
  S['53001b'] = { actions: [{ timing: 'alter', label: '깃털이 같은 새: 손 카드 1장 버림 → [새] 카드를 손으로 (라운드당 1번)', can: g => g.p.hand.length > 0 && g.p.usedOnce.birds !== g.s.round, async use(g) { const t = await pick(g, g.p.hand.slice(), '버릴 카드'); if (!t) return; g.put(t, 'discard'); g.p.usedOnce.birds = g.s.round; await g.searchToHand(d => (d.tr || []).includes('BIRD'), '[새] 카드', { discard: true }); } }] };
  S['53002'] = { actions: [{ timing: 'hero', label: '레드윙: 소진·손으로, 조우 덱 맨 위 버림 → 아이콘만큼 피해 또는 위협 제거', can: (g, u) => g.c(u).zone === 'ally' && !g.c(u).ex, async use(g, u) { // Redwing
    for (const a of g.c(u).att.slice()) g.discard(a); g.resetCard(u); g.put(u, 'hand'); const x = discardEncTop(g); const n = icons(g, x); if (!n) return;
    const o = await g.ask({ type: 'choice', title: `레드윙: X = ${n}`, options: [{ id: 'd', label: `적에게 피해 ${n}` }, { id: 't', label: `위협 ${n} 제거` }] });
    if (o === 'd') { const t = await g.chooseTarget('enemy', `피해 ${n}`, u, false); if (t) await g.dealDamage(t, n, { src: u, byPlayer: true }); } else await g.removeThreatChoose(n, '레드윙', u); } }] };
  S['53003'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { let n = 4; if (g.e.deck.length && await yes(g, '조우 덱 맨 위를 버리고 아이콘만큼 피해를 더할까요?')) n += icons(g, discardEncTop(g)); await g.playerAttack(g.idt(), ctx.target, n, { src: u }); } } }; // Bird of Prey
  S['53004'] = { play: { timing: 'hero', label: 'thwart', target: 'thwartable', async resolve(g, u, ctx) { let n = 3; if (g.e.deck.length && await yes(g, '조우 덱 맨 위를 버리고 아이콘만큼 위협을 더 제거할까요?')) n += icons(g, discardEncTop(g)); await thw(g, ctx.target, n, u); } } }; // Bird's-Eye View
  S['53005'] = { interrupt: { window: 'boostDealt', timing: 'hero', label: '하늘 높이: 강화 카드와 조우 덱 맨 위를 보고 바꾸기', can: (g, u, ctx) => ctx.attack && ctx.cards.length > 0, async resolve(g, u, ctx) { // Up, Up, and Away
    const i = ctx.cards.length === 1 ? 0 : ctx.cards.indexOf(await g.ask({ type: 'target', title: '하늘 높이: 볼 강화 카드', cands: ctx.cards.slice(), cancelable: false }));
    const b = ctx.cards[Math.max(0, i)], top = g.e.deck[0];
    if (top && (await g.ask({ type: 'choice', title: `하늘 높이: 강화 카드 「${g.nm(b)}」(아이콘 ${icons(g, b)}) ↔ 조우 덱 맨 위 「${g.nm(top)}」(아이콘 ${icons(g, top)})`, options: [{ id: 's', label: '두 카드를 바꾼다' }, { id: 'k', label: '그대로 둔다' }] })) === 's') {
      g.put(top, 'boost'); g.put(b, 'edeck', null, true); ctx.cards[Math.max(0, i)] = top; g.log(`하늘 높이: 강화 카드를 ${g.nm(top)}(으)로 바꿨습니다`, 'good'); }
    const n = icons(g, ctx.cards[Math.max(0, i)]); if (n) { g.log(`하늘 높이: 아이콘 ${n}개 → 카드 ${n}장`, 'good'); await g.draw(n); } } } };
  S['53006'] = { resources: [{ gen: 'Y', label: '팔콘의 무리 (새 카운터, [비행] 카드)', forOnly: (g, s, uid) => !!uid && tr(g, uid, 'AERIAL'), can: (g, u) => (g.c(u).cnt.bird || 0) > 0, use: (g, u) => { g.c(u).cnt.bird--; } }] }; // Falcon's Flock
  S['53007'] = { actions: [{ timing: 'alter', label: '무료 급식소: 샘 윌슨과 함께 소진 → 회복력만큼 회복, 다음 동료/지원 비용 -2', can: (g, u) => !g.c(u).ex && !g.c(g.idt()).ex, use(g, u) { g.c(u).ex = true; g.c(g.idt()).ex = true; g.heal(g.idt(), g.stat(g.idt(), 'rec')); g.p.phase.nextAllySupRed = 2; } }], // Soup Kitchen
    costMod: (g, s, uid) => g.p.phase.nextAllySupRed && ['ally', 'support'].includes(g.d(uid).type) ? g.p.phase.nextAllySupRed : 0, costUsed: g => { g.p.phase.nextAllySupRed = 0; } };
  const evac = w => ({ window: w, timing: 'hero', label: '공중 대피: 버리고 피해를 모두 방지, 일상 모습으로', can: (g, u, ctx) => ctx.amount - ctx.prevent > 0 && ctx.target !== g.idt(), async resolve(g, u, ctx) { g.discard(u, '공중 대피'); ctx.prevent = ctx.amount; if (g.isHero() && !g.formLocked()) await g.changeForm(true); } });
  S['53008'] = { respond: [evac('allyWouldTakeDamage')] }; // Aerial Evacuation
  S['53009'] = { actions: [{ timing: 'hero', exhaust: true, label: '공중 정찰: 뒷면 조우 카드 1장 받고 정찰 카운터 1', async use(g, u) { const pi = await g.choosePlayer('공중 정찰: 뒷면 조우 카드를 받을 플레이어'); const x = g.takeEncounter(); if (x) g.put(x, 'facedown', pi); g.c(u).cnt.recon = (g.c(u).cnt.recon || 0) + 1; } }], // Aerial Recon
    hazardBonus: (g, u) => g.c(u).reconUsed === g.s.round ? -1 : 0, on: { villainStep3(g, u) { const n = g.c(u).cnt.recon || 0; if (n && g.c(u).zone === 'upgrade') { g.c(u).cnt.recon = n - 1; g.c(u).reconUsed = g.s.round; g.log('공중 정찰: 조우 카드 1장을 받는 대신 정찰 카운터 제거', 'good'); } } } };
  S['53010'] = { respond: [{ window: 'basicPowerUsed', timing: 'hero', exhaust: true, label: '전장 인식: 조우 덱 맨 위 버림 → 아이콘만큼 +', can: g => g.e.deck.length > 0 && isFalcon(g), resolve(g, u, ctx) { ctx.bonus += icons(g, discardEncTop(g)); } }] }; // Battlefield Awareness
  S['53011'] = { on: { async villainPhaseBegins(g, u) { if (g.c(u).zone === 'upgrade' && g.isHero() && await yes(g, '적의 주의를 끌어라를 버리고 이번 단계 동안 팔콘이 소진 없이 방어할까요?')) { g.discard(u); g.p.phase.freeDefendPhase = true; } } } }; // Draw Their Fire
  S['53012'] = { respond: [{ window: 'eagleEyed', timing: 'hero', label: '탤런 라인: 버리고 아이콘마다 캐릭터 준비 또는 적 기절', can: (g, u, ctx) => icons(g, ctx.card) > 0, async resolve(g, u, ctx) { g.discard(u, '탤런 라인'); for (let i = 0; i < icons(g, ctx.card); i++) { // Talon Line
    const o = await g.ask({ type: 'choice', title: `탤런 라인 (${i + 1}/${icons(g, ctx.card)})`, options: [{ id: 'r', label: '캐릭터 준비' }, { id: 's', label: '적 기절' }] });
    if (o === 'r') { const t = await pick(g, g.friendlyChars().filter(c => g.c(c).ex), '준비할 캐릭터'); if (t) g.c(t).ex = false; } else { const t = await g.chooseTarget('enemy', '기절시킬 적', g.idt(), false); if (t) g.giveStatus(t, 'stun', '탤런 라인'); } } } }] };
  S['53013'] = { mod: { def: (g, s, t) => t === g.idt() && isFalcon(g) && g.isHero() ? 1 : 0 }, respond: [{ window: 'identityWouldTakeDamage', timing: 'hero', exhaust: true, label: '비브라늄 마이크로위브: 피해 1 방지, 적에게 피해 1', can: (g, u, ctx) => ctx.amount - ctx.prevent > 0, async resolve(g, u, ctx) { ctx.prevent += 1; const t = await g.chooseTarget('enemy', '피해 1', g.idt(), false); if (t) await g.dealDamage(t, 1, { byPlayer: true, src: u }); } }] }; // Vibranium Microweave
  // Leadership & others
  S['53015'] = { actions: [{ timing: 'hero', exhaust: true, label: '에어로: 이번 단계 [비행] 캐릭터 공격 +1', async use(g) { const pi = await g.choosePlayer('에어로: [공중] 캐릭터를 강화할 플레이어'); g.withPlayerSync(pi, () => { for (const c of g.friendlyChars()) if (tr(g, c, 'AERIAL')) g.addPhaseMod(c, 'atk', 1); }); } }] }; // Aero
  S['53017'] = { async onEnter(g) { const top = g.e.deck.slice(0, 10); const m = top.find(x => g.d(x).type === 'minion'); if (!m) { g.log('후긴과 무닌: 하수인이 없습니다'); return; } // Hugin & Munin
    const c = top.filter(x => g.d(x).type === 'minion'); const t = await pick(g, c, '교전할 하수인'); await g.enterMinion(t, {}); for (let i = 0; i < icons(g, t); i++) { const r = await pick(g, g.friendlyChars().filter(x => g.c(x).ex), '준비할 캐릭터'); if (r) g.c(r).ex = false; } g.shuffle(g.e.deck); } };
  S['53018'] = { async onEnter(g, u) { const c = (g.p.lastPaidCards || []).filter(x => g.c(x).zone === 'discard'); const t = await pick(g, c, '스펙트럼 아래에 둘 카드'); if (!t) return; g.put(t, 'under', u); g.log(`${g.nm(t)}을(를) 스펙트럼 아래에 둡니다`, 'good'); }, // Spectrum
    mod: { thw: (g, s, t) => t === s && spec(g, s, 'B') ? 2 : 0, atk: (g, s, t) => t === s && spec(g, s, 'R') ? 2 : 0, hp: (g, s, t) => t === s && spec(g, s, 'Y') ? 2 : 0 } };
  const spec = (g, s, k) => g.c(s).under.some(x => (g.d(x).res || '').includes(k) || (g.d(x).res || '').includes('G'));
  S['53019'] = { play: { timing: 'hero', async resolve(g, u) { const ts = new Set(); for (const c of g.allFriendlyChars()) for (const t of (g.d(c).tr || [])) ts.add(t); // Strength in Diversity
    for (let i = 0; i < ts.size; i++) { const o = await g.ask({ type: 'choice', title: `다양성의 힘 (${i + 1}/${ts.size})`, options: [{ id: 't', label: '위협 1 제거' }, { id: 'd', label: '적에게 피해 1' }] }); if (o === 't') await g.removeThreatChoose(1, '다양성의 힘', u); else { const t = await g.chooseTarget('enemy', '피해 1', g.idt(), false); if (t) await g.dealDamage(t, 1, { src: u, byPlayer: true }); } } } } };
  const allAerial = g => g.p.allies.every(a => tr(g, a, 'AERIAL'));
  S['53020'] = { canPlay: g => tr(g, g.idt(), 'AERIAL'), allyLimit: g => allAerial(g) ? 1 : 0, // Flight Squadron
    respond: [{ window: 'cardPlayedDone', exhaust: true, label: '비행 편대: 동료 1명 준비', can: (g, u, ctx) => allAerial(g) && ctx.card && tr(g, ctx.card, 'AERIAL') && g.p.allies.some(a => g.c(a).ex), async resolve(g) { const t = await pick(g, g.p.allies.filter(a => g.c(a).ex), '준비할 동료'); if (t) g.c(t).ex = false; } }] };
  S['53021'] = { actions: [{ timing: 'action', exhaust: true, label: '자원 비축: 손의 자원 카드 1장을 아래에', can: (g, u) => !g.c(u).under.length && g.p.hand.some(x => g.d(x).type === 'resource'), async use(g, u) { const t = await pick(g, g.p.hand.filter(x => g.d(x).type === 'resource'), '아래에 둘 자원 카드'); if (t) g.put(t, 'under', u); } }], // Resource Reserve
    resources: [{ gen: (g, u) => { const x = g.c(u).under[0]; return x ? (g.d(x).res || '') : ''; }, label: '자원 비축 (아래 카드)', can: (g, u) => g.c(u).under.length > 0, use: (g, u) => { const x = g.c(u).under[0]; if (x) g.put(x, 'discard'); } }] };
  S['53023'] = { canPlay: g => ['54001b', '54001a', '53001a', '53001b'].includes(idOf(g, g.idt())), actions: [{ timing: 'hero', exhaust: true, cost: { n: 1, req: 'R' }, label: '캡틴 아메리카: 방패를 손으로 (플레이 영역에서 오면 피해 4)', async use(g) { // Captain America (title)
    let s = Object.keys(g.s.cards).find(x => g.c(x).id === '53034' && g.c(x).zone); const fromPlay = s && g.c(s).zone === 'upgrade'; if (!s) s = g.newCard('53034', 'hand'); else { g.resetCard(s); g.put(s, 'hand'); }
    if (fromPlay) { const t = await g.chooseTarget('enemy', '방패 회수: 피해 4', g.idt(), false); if (t) await g.dealDamage(t, 4, { byPlayer: true, src: s }); } } }] };
  S['53034'] = { mod: { def: (g, s, t) => t === g.idt() ? 1 : 0, retaliate: (g, s, t) => t === g.idt() ? 1 : 0 } }; // Captain America's Shield
  S['53024'] = { attach: { kind: 'ally', filter: (g, t) => tr(g, t, 'AERIAL') && !g.c(t).att.some(a => idOf(g, a) === '53024') }, respond: [{ window: 'allyWouldTakeDamage', label: '윙맨: 부착 동료 소진 → 후속 피해 1 방지', can: (g, u, ctx) => ctx.consequential && ctx.target !== g.c(u).on && tr(g, ctx.target, 'AERIAL') && !g.c(g.c(u).on).ex, resolve(g, u, ctx) { g.c(g.c(u).on).ex = true; ctx.prevent += 1; } }] }; // Wingman
  S['53029'] = { whenRevealed(g, u) { g.put(u, 'pobl'); g.c(u).cnt.emergency = 3; g.log('할렘의 수호자: 긴급 카운터 3 (위험 아이콘)', 'warn'); }, hazardBonus: (g, u) => g.c(u).zone === 'pobl' ? 1 : 0, // Harlem's Protector
    actions: [{ timing: 'alter', label: '자원 1 → 긴급 카운터 1 제거', cost: { n: 1, req: '' }, can: (g, u) => g.c(u).zone === 'pobl', use(g, u) { g.c(u).cnt.emergency--; if (g.c(u).cnt.emergency <= 0) { g.put(u, 'victory'); g.log('할렘의 수호자 해결 (승리 표시)', 'good'); } } }] };
  // Viper (nemesis)
  const serpentDiscarded = async (g, x) => { if (x && g.d(x).type === 'minion' && tr(g, x, 'SERPENT SOCIETY') && g.e.sides.some(s => idOf(g, s) === '53031')) { g.put(x, 'facedown', g.s.first); g.log(`뱀 솔루션: ${g.nm(x)}을(를) 뒷면 조우 카드로`, 'warn'); } };
  S['53030'] = { on: { async enemyActivated(g, u, ctx) { if (ctx.enemy !== u) return; for (let i = 0; i < 5; i++) { const x = g.takeEncounter(); if (!x) break; g.put(x, 'ediscard'); await serpentDiscarded(g, x); } } } };
  S['53031'] = {};
  S['53032'] = { boostEffect(g, u, ctx) { ctx.extraBoost = (ctx.extraBoost || 0) + 1; } };
  S['53033'] = { whenRevealed(g) { const c = g.e.discard.filter(x => g.d(x).type === 'minion' && tr(g, x, 'SERPENT SOCIETY')); for (const x of c) g.put(x, 'edeck'); g.shuffle(g.e.deck); } };
  // Justice / Aggression / Protection
  S['53035'] = { respond: [{ window: 'afterAllyAttack', label: '윈터 솔저: 위협 2 제거', can: (g, u, ctx) => ctx.ally === u && ctx.defeated, async resolve(g, u) { await g.removeThreatChoose(2, '윈터 솔저', u); } }] }; // Winter Soldier (ally)
  S['53036'] = { respond: [{ window: 'allyPowerUsed', label: '★ 미스티 나이트: 조우 덱 위 2장 중 1장 버림 → 아이콘만큼 저지 +', can: (g, u, ctx) => ctx.ally === u && ctx.kind === 'thwart' && g.e.deck.length > 0, async resolve(g, u, ctx) { const top = g.e.deck.slice(0, 2); const t = await pick(g, top, '버릴 카드'); g.put(t, 'ediscard'); ctx.bonus += icons(g, t); } }] }; // Misty Knight
  S['53037'] = { respond: [{ window: 'identityWouldTakeDamage', label: '작전실: 경계 카운터 1 → 피해 1 방지, 위협 1 제거', can: (g, u, ctx) => g.e.heroDefending && (g.c(u).cnt.alert || 0) > 0 && ctx.amount - ctx.prevent > 0, async resolve(g, u, ctx) { g.c(u).cnt.alert--; ctx.prevent += 1; g.cleanupUses(u); await g.removeThreatChoose(1, '작전실', u); } }, // Ops Room
    { window: 'allyWouldTakeDamage', label: '작전실: 경계 카운터 1 → 피해 1 방지, 위협 1 제거', can: (g, u, ctx) => g.e.curAttacker && (g.c(u).cnt.alert || 0) > 0 && ctx.amount - ctx.prevent > 0 && !ctx.consequential, async resolve(g, u, ctx) { g.c(u).cnt.alert--; ctx.prevent += 1; g.cleanupUses(u); await g.removeThreatChoose(1, '작전실', u); } }] };
  // Techno (modular)
  const fixer = g => g.e.minions.find(m => idOf(g, m) === '53038') || null;
  const techTo = g => fixer(g) || g.e.villain;
  S['53038'] = {}; // Fixer (Tech attachments go to him through their attachTo)
  S['53039'] = { attachTo: techTo, preventBig: 3, grantTrait: (g, s, t) => g.c(s).zone === 'attach' && t === g.c(s).on ? 'AERIAL' : null }; // Jet Pack
  S['53040'] = { attachTo: techTo, mod: { atk: (g, s, t) => g.c(s).zone === 'attach' && t === g.c(s).on ? g.c(t).att.filter(a => a !== s && tr(g, a, 'TECH')).length : 0 }, // Tech-Pac
    actions: [{ timing: 'hero', label: '테크팩: 저지 합이 적 SCH보다 큰 캐릭터들을 소진 → 버림', can: (g, u) => g.c(u).zone === 'attach' && g.friendlyChars().filter(c => !g.c(c).ex).reduce((t, c) => t + g.stat(c, 'thw'), 0) > g.stat(g.c(u).on, 'sch'), async use(g, u) {
      const need = g.stat(g.c(u).on, 'sch'); const sel = await g.pickCards(g.friendlyChars().filter(c => !g.c(c).ex), `소진할 캐릭터 (저지 합 > ${need})`, 1, 4, '소진'); const sum = sel.reduce((t, c) => t + g.stat(c, 'thw'), 0); if (sum <= need) { g.log('저지 합이 부족합니다'); return; } sel.forEach(c => { g.c(c).ex = true; }); g.discard(u, '테크팩 버림'); } }] };
  S['53041'] = { async whenRevealed(g, u) { const x = g.e.deck.concat(g.e.discard).find(y => g.d(y).type === 'attachment' && tr(g, y, 'TECH')); if (x) { g.shuffle(g.e.deck); await g.reveal(x); } const n = g.inPlay().filter(y => tr(g, y, 'TECH')).length; if (n) g.c(u).threat += n; } }; // Technological Innovation
  S['53042'] = { async whenRevealed(g, u, ctx) { let f = fixer(g); if (f) g.c(f).eng = g.s.ctx; else { const x = g.e.deck.concat(g.e.discard).find(y => idOf(g, y) === '53038'); if (x) { g.shuffle(g.e.deck); await g.enterMinion(x, {}); f = fixer(g); } } if (f && g.c(f).zone === 'minion') await g.activate(f, {}); else ctx.surge++; }, // Techno
    boostEffect(g, u, ctx) { if ('undefended' in ctx) ctx.piercing = true; } };
  MC.registerScripts(S);
})();
