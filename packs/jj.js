/* Jessica Jones (61001-61040): evidence counters on Alias Investigations, Purple Man nemesis and the pack's player cards.
   Ported from cards/pack/jj of the community build. */
(function () {
  'use strict';
  const S = {};
  const idOf = (g, u) => g.c(u).id;
  const tr = (g, u, t) => (g.d(u).tr || []).includes(t) || g.hasTrait(u, t);
  const pick = async (g, cands, title) => !cands.length ? null : cands.length === 1 ? cands[0] : await g.ask({ type: 'target', title, cands, cancelable: false });
  const yes = async (g, title) => (await g.ask({ type: 'choice', title, options: [{ id: 'y', label: '예' }, { id: 'n', label: '아니요' }] })) === 'y';
  async function thw(g, t, n, src) { const r = await g.removeThreat(t, n, { src }); g.log(`${g.nm(t)} 위협 ${r} 제거`); await g.afterThreatRemoved(t); return r; }
  const pk = g => g.s.round + ':' + g.s.phase;
  const alias = g => g.p.supports.find(x => idOf(g, x) === '61002') || null;
  const ev = g => { const a = alias(g); return a ? (g.c(a).cnt.evidence || 0) : 0; };
  async function addEv(g, n) { const a = alias(g); if (!a || n <= 0) return; g.c(a).cnt.evidence = (g.c(a).cnt.evidence || 0) + n; g.log(`앨리어스 탐정 사무소: 증거 +${n} (${g.c(a).cnt.evidence})`, 'good');
    const w = { n, post: [] }; await g.window('evidencePlaced', w, '증거 카운터가 놓였습니다'); for (const f of w.post) await f(g); }
  function spendEv(g, n) { const a = alias(g); if (!a || ev(g) < n) return false; g.c(a).cnt.evidence -= n; g.log(`증거 ${n}개 사용 (${g.c(a).cnt.evidence} 남음)`); return true; }
  MC.jj = { addEv, ev, spendEv };
  const chars = g => [g.idt()].concat(g.p.allies);
  // ======================= identity =======================
  S['61001a'] = { on: { async basicHeroPower(g) { await addEv(g, 1); } } }; // Gather Evidence
  S['61001b'] = { setup(g) { const x = g.p.deck.concat(g.p.hand).find(y => idOf(g, y) === '61002') || g.newCard('61002', 'deck'); g.put(x, 'support'); g.shuffle(g.p.deck); g.log('사전 준비: 앨리어스 탐정 사무소 등장'); },
    actions: [{ timing: 'alter', label: '잠행 모드: 히어로로 변신 (이번 단계엔 되돌릴 수 없음)', can: g => !g.formLocked(), async use(g) { await g.changeForm(true); g.p.phase.noAlter = true; } }] };
  S['61002'] = { respond: [{ window: 'sideSchemeDefeated', exhaust: true, label: '앨리어스 탐정 사무소: 증거 +2', async resolve(g) { await addEv(g, 2); // Alias Investigations
    const v = g.e.villain; if (!v || g.e.villains) return; const need = Math.max(1, g.hpLeft(v)); if (ev(g) >= need && await yes(g, `증거 ${need}개를 써서 ${g.nm(v)}의 현재 단계를 물리칠까요?`)) { spendEv(g, need); g.log('사건 해결! 빌런 단계를 물리칩니다', 'good'); await g.defeat(v, { byPlayer: true }); } } }] };
  S['61003'] = { actions: [{ exhaust: true, label: '루크 케이지: 피해 1 → 강인함', async use(g, u) { await g.dealDamage(u, 1, {}); if (g.c(u).zone === 'ally') g.giveStatus(u, 'tough', '루크 케이지'); } }] }; // Luke Cage (ally)
  S['61004'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { let n = 3, o = { src: u }; // "Big Mistake"
    if (ev(g) >= 1 && await yes(g, '증거 1개를 써서 피해 +2, 압도 또는 관통?')) { spendEv(g, 1); n += 2; if ((await g.ask({ type: 'choice', title: '"큰 실수"', options: [{ id: 'o', label: '압도' }, { id: 'p', label: '관통' }] })) === 'o') o.overkill = true; else o.piercing = true; }
    await g.playerAttack(g.idt(), ctx.target, n, o); } } };
  S['61005'] = { interrupt: { window: 'evidencePlaced', label: '돌파구: 정체성 준비', can: g => g.c(g.idt()).ex, resolve(g, u, ctx) { if (g.canReady(g.idt())) g.c(g.idt()).ex = false; ctx.post.push(gg => { if (gg.c(u).zone === 'discard') { gg.put(u, 'deck'); gg.shuffle(gg.p.deck); gg.log('돌파구: 덱에 섞음'); } }); } } }; // Breakthrough
  S['61006'] = { play: { timing: 'alter', label: 'thwart', target: 'thwartable', async resolve(g, u, ctx) { await thw(g, ctx.target, 4, u); await addEv(g, 2); // Snooping Around
    const x = g.takeEncounter(); if (!x) return; g.put(x, 'ediscard'); g.log(`조우 덱 맨 위: ${g.nm(x)}`); if (['minion', 'side'].includes(g.d(x).type)) await g.reveal(x); } } };
  S['61007'] = { noPsideLimit: true, async whenDefeated(g) { await g.draw(3); } }; // Piecing It All Together (ignores the player side scheme limit)
  S['61008'] = { actions: [{ timing: 'alter', exhaust: true, label: '부탁하기: 증거 2 → 덱에서 동료 플레이 (비용 -2)', can: g => ev(g) >= 2 && g.p.deck.some(x => g.d(x).type === 'ally'), async use(g) { // Calling in Favors
    spendEv(g, 2); const x = await pick(g, g.p.deck.filter(y => g.d(y).type === 'ally'), '플레이할 동료'); if (!x) return; g.put(x, 'hand'); g.c(x).tmpDiscount = { key: pk(g), n: 2 };
    if (g.canPlay(x)) await g.playCard(x); if (g.c(x).zone === 'hand') { g.put(x, 'deck'); g.log(`${g.nm(x)}: 플레이하지 못해 덱으로`); } g.shuffle(g.p.deck); } }] };
  S['61009'] = { actions: [{ timing: 'alter', exhaust: true, label: '4K 캠코더: 증거로 하수인 버리기', can: g => g.e.minions.some(m => !tr(g, m, 'ELITE') && ev(g) >= Math.max(0, g.hpLeft(m) - 2)), async use(g) { // 4K Digital Camcorder
    const m = await pick(g, g.e.minions.filter(x => !tr(g, x, 'ELITE') && ev(g) >= Math.max(0, g.hpLeft(x) - 2)), '버릴 하수인'); if (!m) return; spendEv(g, Math.max(0, g.hpLeft(m) - 2)); g.discard(m, `4K 캠코더: ${g.nm(m)} 버림`); } }] };
  S['61010'] = { on: { async minionDefeated(g, u) { if (g.c(u).ex) return; g.c(u).ex = true; await addEv(g, 1); } } }; // Circumstantial Evidence
  S['61011'] = { mod: { def: (g, s, t) => t === g.idt() && g.isHero() ? 2 : 0 }, on: { async basicHeroPower(g, u, ctx) { if (ctx.kind === 'defend') await addEv(g, 1); } } }; // Leather Jacket
  S['61012'] = { on: { async enemyActivated(g, u, ctx) { if (ctx.enemy !== g.e.villain || g.c(u).zone !== 'upgrade') return; // "Now I'm Ticked Off!"
    const epi = ctx && ctx.player != null ? ctx.player : g.s.ctx;
    if (!g.isHero() && !g.formLocked()) await g.changeForm(true); g.log('"이제 화났어!": 빌런과 교전 하수인에게 피해 5', 'good');
    for (const t of [g.e.villain].concat(g.engagedMinions(epi))) if (t && g.c(t).zone) await g.playerAttack(g.idt(), t, 5, { src: u }); if (g.c(u).zone === 'upgrade') g.discard(u); } } };
  S['61013'] = { respond: [{ window: 'wouldTakeAttackDamage', timing: 'hero', label: '마지못한 비행: 공격 피해를 모두 막고 피해 1', can: (g, u, ctx) => ctx.amount - ctx.prevent >= 3, async resolve(g, u, ctx) { g.discard(u, '마지못한 비행 버림'); ctx.prevent = ctx.amount; await g.dealDamage(g.idt(), 1, {}); } }] }; // Reluctant Flier
  S['61014'] = { attach: { kind: 'scheme', filter: (g, t) => g.c(t).zone === 'side' && g.d(t).enc && !g.d(t).permanent }, thwVs: (g, s, src, t) => g.c(s).on === t ? 2 : 0, // Stakeout
    on: { async attachedDefeated(g) { await addEv(g, 2); } } };
  // ======================= aspect / basic =======================
  const burn = async (g, n) => { const out = []; for (let i = 0; i < n; i++) { if (!g.p.deck.length) await g.reshuffleDeck(); const x = g.p.deck[0]; if (!x) break; g.put(x, 'discard'); out.push(x); } return out; };
  S['61015'] = { async onEnter(g, u) { const out = await burn(g, 4); const k = out.filter(x => (g.d(x).res || '').includes('Y')).length; g.log(`캡틴 마블: [에너지] 자원 ${k}장`); // Captain Marvel (ally)
    if (k >= 1) await g.removeThreatChoose(2, '캡틴 마블', u); if (k > 1) { const t = await pick(g, g.enemies(), '혼란시킬 적'); if (t) g.giveStatus(t, 'conf', '캡틴 마블'); } } };
  const limb = async (g, u) => { if (g.c(u).zone !== 'ally') return; g.c(u).cnt.limb = Math.min(8, (g.c(u).cnt.limb || 0) + 1); };
  S['61016'] = { on: { async basicHeroPower(g, u, ctx) { if (ctx.kind === 'thwart') await limb(g, u); }, async allyBasicPower(g, u, ctx) { if (ctx.kind === 'thwart') await limb(g, u); } }, // Spider-Woman (ally)
    actions: [{ label: '스파이더우먼: 버리고 다리 카운터만큼 적에게 피해', can: (g, u) => (g.c(u).cnt.limb || 0) > 0, async use(g, u) { const n = g.c(u).cnt.limb || 0; const t = await g.chooseTarget('enemy', `피해 ${n}`, u, false); g.discard(u, '스파이더우먼 버림'); if (t) await g.dealDamage(t, n, { src: u, byPlayer: true }); } }] };
  S['61017'] = { onPlay(g, u) { g.c(u).cnt.squirrel = Math.min(4, g.p.hand.length); }, actions: [{ label: '다람쥐 걸: 다람쥐 1 → 위협 1 제거', can: (g, u) => (g.c(u).cnt.squirrel || 0) > 0, async use(g, u) { g.c(u).cnt.squirrel--; await g.removeThreatChoose(1, '다람쥐 걸', u); } }] }; // Squirrel Girl
  S['61018'] = { interrupt: { window: 'afterChangeForm', timing: 'hero', label: '법의 심판', async resolve(g, u, ctx, paid) { await g.removeThreatChoose((paid || []).includes('B') ? 4 : 3, '법의 심판', u); } } }; // Lay Down the Law
  S['61019'] = { play: { async resolve(g, u) { if (g.isHero()) { const ps = g.e.sides.filter(x => g.d(x).type === 'pside'); const t = await pick(g, ps, '위협을 제거할 플레이어 부가 음모'); if (t) await thw(g, t, 3, u); } else { const pi = await g.choosePlayer('전략 회의: 덱에서 플레이어 부가 음모를 찾을 플레이어'); await g.withPlayer(pi, () => g.searchToHand(d => d.type === 'pside', '플레이어 부가 음모')); } } } }; // Strategy Session
  S['61020'] = { async whenDefeated(g) { g.e.skipVP = true; g.e.villainNoDmg = true; await g.forEachPlayer(() => g.dealEncounterCard()); g.log('추격 완료: 다음 빌런 단계를 건너뛰고, 그때까지 빌런은 피해를 받지 않습니다', 'warn'); } }; // Run Them to Ground
  S['61021'] = { async whenDefeated(g) { if (g.e.villain) await g.dealDamage(g.e.villain, 5 * g.players, { byPlayer: true }); } }; // Lay the Trap
  S['61022'] = { async onSpent(g) { if (g.isHero() && g.e.main) await thw(g, g.e.main, 1, g.idt()); } }; // Determination
  S['61023'] = { actions: [{ timing: 'hero', label: '그래플 런처: 버리고 소진 없이 기본 저지 (+1, 순찰·위기 무시)', async use(g, u) { // Grapnel Launcher
    g.discard(u, '그래플 런처 버림'); const ex = g.c(g.idt()).ex; g.p.ignoreNow = ['patrol', 'crisis']; g.addPhaseMod(g.idt(), 'thw', 1);
    try { await g.basicThwart(); } finally { g.p.ignoreNow = []; g.addPhaseMod(g.idt(), 'thw', -1); g.c(g.idt()).ex = ex; } } }] };
  S['61024'] = { respond: [{ window: 'afterEnemySchemeW', timing: 'alter', label: '함정 수사: 히어로로 변신해 놓인 위협만큼 피해', can: (g, u, ctx) => ctx.enemy === g.e.villain && ctx.placed > 0, async resolve(g, u, ctx) { g.discard(u, '함정 수사 버림'); if (!g.formLocked()) await g.changeForm(true); await g.playerAttack(g.idt(), g.e.villain, ctx.placed, { src: u }); } }] }; // Entrapment
  S['61025'] = { handActions: [{ label: '헬캣: 손에서 바로 등장 (단계 끝에 버림)', can: g => tr(g, g.idt(), 'DEFENDER'), async use(g, u) { await g.putAllyIntoPlay(u); g.c(u).endPhaseDiscard = pk(g); g.log('헬캣 등장 (이번 단계 끝에 버림)'); } }], // Hellcat
    on: { playerPhaseEnd(g, u) { if (g.c(u).zone === 'ally' && g.c(u).endPhaseDiscard) { g.discard(u, '헬캣: 단계가 끝나 버림'); delete g.c(u).endPhaseDiscard; } } } };
  S['61026'] = { play: { async resolve(g) { // Joys of Life
    const id = g.idt(), civ = !g.isHero() && tr(g, id, 'CIVILIAN'); const opts = [];
    if (civ && !g.c(id).ex && g.p.allies.some(a => g.c(a).ex)) opts.push({ id: 'a', label: '일상 모습 소진 → 동료 준비' });
    if (civ && g.c(id).ex && g.p.allies.some(a => !g.c(a).ex)) opts.push({ id: 'b', label: '동료 소진 → 일상 모습 준비' });
    if (!opts.length) { g.log('삶의 기쁨: 할 수 있는 것이 없습니다'); return; } const o = opts.length === 1 ? opts[0].id : await g.ask({ type: 'choice', title: '삶의 기쁨', options: opts });
    if (o === 'a') { g.c(id).ex = true; const a = await pick(g, g.p.allies.filter(x => g.c(x).ex), '준비할 동료'); if (a) g.c(a).ex = false; } else { const a = await pick(g, g.p.allies.filter(x => !g.c(x).ex), '소진할 동료'); if (a) { g.c(a).ex = true; g.c(id).ex = false; } } } } };
  const bondNames = /Jessica Jones|Luke Cage/;
  S['61027'] = S['62024'] = { play: { timing: 'hero', label: 'thwart', target: 'thwartable', async resolve(g, u, ctx) { await thw(g, ctx.target, 3, u); // Unbreakable Bond
    let left = 3; while (left > 0) { const xs = chars(g).filter(x => bondNames.test(g.d(x).en || '') && g.c(x).dmg > 0); if (!xs.length) break; const x = await pick(g, xs, `회복할 캐릭터 (${left} 남음)`); const n = Math.min(left, g.c(x).dmg); g.heal(x, n); left -= n; } } } };
  S['61029'] = { canPlay: g => tr(g, g.idt(), 'DEFENDER'), async whenDefeated(g) { await g.forEachPlayer(async () => { const x = await g.searchToHand(d => !!d.teamUp, `우리 도시를 지켜라(${g.playerName()}): 팀업 카드`, { discard: true }); if (x) g.c(x).tmpDiscount = { key: pk(g), n: 1 }; }); } }; // Defend Our City
  S['61030'] = { whenRevealed(g, u) { g.put(u, 'pobl'); g.log('일과 삶의 균형: 모습을 바꾸려면 손 카드 1장을 버려야 합니다', 'warn'); }, // Work-Life Balance
    formChangeCostOk: g => g.p.hand.length > 0, async formChangeCost(g, u) { if (g.c(u).zone !== 'pobl') return true; if (!g.p.hand.length) { g.log('일과 삶의 균형: 버릴 카드가 없습니다', 'warn'); return false; } await g.discardFromHand(1, 1, '일과 삶의 균형: 변신 추가 비용'); return true; },
    actions: [{ timing: 'alter', label: '일과 삶의 균형 처리', can: (g, u) => g.c(u).zone === 'pobl', async use(g, u) { const opts = [{ id: 'c', label: '정체성 혼란 → 이 카드 버림' }]; if (g.p.allies.length) opts.unshift({ id: 'a', label: '동료 1명을 게임에서 제거 → 이 카드 제거' });
      const o = opts.length === 1 ? 'c' : await g.ask({ type: 'choice', title: '일과 삶의 균형', options: opts }); if (o === 'a') { const a = await pick(g, g.p.allies.slice(), '게임에서 제거할 동료'); g.removeFromGame(a); g.removeFromGame(u); } else { g.giveStatus(g.idt(), 'conf', '일과 삶의 균형'); g.discard(u); } } }] };
  // nemesis
  const othersMax = (g, s, keys) => { let m = 0; for (const x of g.allFriendlyChars().concat(g.e.villain ? [g.e.villain] : [], g.e.minions)) if (x !== s && g.c(x).zone) for (const k of keys) m = Math.max(m, g.stat(x, k)); return m; };
  S['61031'] = { mod: { sch: (g, s, t) => t === s && !g.c(s).inMod ? (g.c(s).inMod = true, (() => { try { return othersMax(g, s, ['sch', 'thw']); } finally { g.c(s).inMod = false; } })()) : 0, // Purple Man
    atk: (g, s, t) => t === s && !g.c(s).inMod ? (g.c(s).inMod = true, (() => { try { return othersMax(g, s, ['atk']); } finally { g.c(s).inMod = false; } })()) : 0 } };
  const isSugg = (g, x) => ['61033a', '61033b', '61033c'].includes(idOf(g, x));
  S['61032'] = { whenRevealed(g) { for (const pi of g.livingPlayers()) for (const x of (g.s.ps[pi].obl || [])) if (isSugg(g, x)) g.c(x).cnt.pheromone = (g.c(x).cnt.pheromone || 0) + 2; } }; // Indomitable Will
  const sugg = (res, label) => ({ whenRevealed(g, u) { g.put(u, 'pobl'); g.c(u).cnt.pheromone = 3 + (g.e.sides.some(s => idOf(g, s) === '61032') ? 2 : 0); g.c(u).ex = false; g.log(`암시 (${label}): 내 차례마다 반드시 처리해야 합니다`, 'warn'); },
    on: { turnBegins(g, u) { if (g.c(u).zone === 'pobl') g.c(u).ex = false; },
      async playerPhaseEnd(g, u) { if (g.c(u).zone === 'pobl' && !g.c(u).ex && (g.c(u).cnt.pheromone || 0) > 0) { g.log(`암시 (${label}): 강제 행동을 처리합니다`); await use(g, u); } } },
    actions: [{ label: `암시 (${label}): 강제 행동`, can: (g, u) => g.c(u).zone === 'pobl' && !g.c(u).ex && (g.c(u).cnt.pheromone || 0) > 0, use: (g, u) => use(g, u) }] });
  async function use(g, u) { const res = { '61033a': 'Y', '61033b': 'B', '61033c': 'R' }[idOf(g, u)]; g.c(u).ex = true; g.c(u).cnt.pheromone--;
    const playable = g.p.hand.filter(x => (g.d(x).res || '').includes(res) && g.canPlay(x)); const o = playable.length ? await g.ask({ type: 'choice', title: '암시: 선택하세요', options: [{ id: 'p', label: '해당 자원 아이콘 카드 플레이' }, { id: 't', label: '주 음모에 위협 2' }] }) : 't';
    if (o === 'p') { const x = await pick(g, playable, '플레이할 카드'); if (x) await g.playCard(x); } else await g.placeThreat(g.e.main, 2, {});
    if ((g.c(u).cnt.pheromone || 0) <= 0 && g.c(u).zone === 'pobl') g.discard(u, '암시: 페로몬 카운터가 없어 버림'); }
  S['61033a'] = sugg('Y', '에너지'); S['61033b'] = sugg('B', '정신'); S['61033c'] = sugg('R', '물리');
  // aspect upgrades
  S['61034'] = { mod: { atk: (g, s, t) => t === g.idt() && g.isHero() ? 1 : 0 } }; // Innate Aggression
  S['61035'] = { respond: [{ window: 'afterAttackDefeat', exhaust: true, label: '갈취: 하수인의 기본 음모력만큼 위협 제거', can: (g, u, ctx) => ctx.type === 'minion' && ctx.excess === 0 && (g.d(ctx.target).sch || 0) > 0, async resolve(g, u, ctx) { await g.removeThreatChoose(g.d(ctx.target).sch || 0, '갈취', u); } }] }; // Shakedown
  S['61036'] = { mod: { thw: (g, s, t) => t === g.idt() && g.isHero() ? 1 : 0 } }; // Innate Perception
  S['61037'] = { mod: { hp: (g, s, t) => g.p.allies.includes(t) ? 1 : 0 } }; // Innate Inspiration
  S['61038'] = { selfReduce: (g, s, n, o) => o && o.attack ? Math.max(0, n - g.stat(g.idt(), 'def')) : n }; // Echo (ally)
  S['61039'] = { async whenDefeated(g) { await g.forEachPlayer(async () => { if (g.isHero() && !g.formLocked() && await yes(g, `잠적(${g.playerName()}): 일상 모습으로 바꿀까요?`)) await g.changeForm(true); if (!g.isHero()) g.heal(g.idt(), g.stat(g.idt(), 'rec')); }); } }; // Lay Low
  S['61040'] = { attach: { kind: 'encCard', filter: (g, t) => g.d(t).enc && ['accel', 'amplify', 'hazard', 'crisis'].some(k => g.d(t)[k]) }, blankIcons: true, // Mitigated Threat
    on: { async roundEnd(g, u) { if (!g.c(u).zone) return; let allPaid = true; await g.forEachPlayer(async () => { if (!allPaid) return; if (g.canAfford({ n: 1, req: '' }, null) && await yes(g, `완화된 위협(${g.playerName()}): 자원 1개를 내고 유지할까요?`) && (await g.pay({ n: 1, req: '' }, null, '완화된 위협', true)) != null) return; allPaid = false; }); if (!allPaid) g.discard(u, '완화된 위협 버림'); } } };
  MC.registerScripts(S);
})();
