/* Ironheart (29001-29040): three identity versions with progress counters, Leadership cards, nemesis set and the Zzzax modular set.
   Ported from cards/pack/ironheart of the community build. */
(function () {
  'use strict';
  const S = {};
  const has = (g, u, t) => (g.d(u).tr || []).includes(t);
  const pick = async (g, cands, title) => !cands.length ? null : cands.length === 1 ? cands[0] : await g.ask({ type: 'target', title, cands, cancelable: false });
  const isRiri = g => /^2900[123][ab]$/.test(g.c(g.idt()).id);
  const version = g => { const m = /^2900([123])/.exec(g.p.heroId || ''); return m ? +m[1] : 1; };
  const prog = g => g.c(g.idt()).cnt.progress || 0;
  const addProg = (g, n) => { if (!isRiri(g)) return; const c = g.c(g.idt()).cnt; c.progress = (c.progress || 0) + n; g.log(`진행 카운터 +${n} (현재 ${c.progress})`, 'good'); };
  async function dmgEnemy(g, n, title, src, attack) {
    const t = await g.chooseTarget(attack ? 'attackable' : 'enemy', title, g.idt(), false); if (!t) return null;
    if (attack) return { t, r: await g.playerAttack(g.idt(), t, n, { src }) };
    return { t, r: await g.dealDamage(t, n, { src, byPlayer: true }) };
  }
  // swap to the next version: the identity card keeps its damage, counters and status cards
  function swapTo(g, v) {
    g.p.heroId = `2900${v}a`; g.p.alterId = `2900${v}b`;
    g.c(g.idt()).id = g.isHero() ? g.p.heroId : g.p.alterId;
    g.log(`레벨 업! 아이언하트 버전 ${v}`, 'good');
  }
  const levelUp = (v, tough) => ({ timing: 'action', label: `레벨 업! 진행 6 → 준비하고 버전 ${v}로`, can: g => prog(g) >= 6, async use(g) {
    g.c(g.idt()).cnt.progress -= 6; if (g.canReady(g.idt())) g.c(g.idt()).ex = false; swapTo(g, v); if (tough) g.giveStatus(g.idt(), 'tough', '레벨 업!');
  } });
  const prodigy = (label, cost) => ({ timing: 'action', once: true, label: `천재 소녀: ${label} → 진행 1`, cost, async use(g) { addProg(g, 1); } });

  // ======================= identities =======================
  S['29001a'] = { actions: [levelUp(2, false)] };
  S['29001b'] = { actions: [prodigy('[정신] 1', { n: 1, req: 'B' })] };
  S['29002a'] = { actions: [levelUp(3, true)] };
  S['29002b'] = { actions: [{ timing: 'action', once: true, label: '천재 소녀: [정신] 1 또는 자원 2 → 진행 1', can: g => g.canAfford({ n: 1, req: 'B' }, null) || g.canAfford({ n: 2, req: '' }, null), async use(g) {
    const a = g.canAfford({ n: 1, req: 'B' }, null), b = g.canAfford({ n: 2, req: '' }, null);
    const k = a && b ? await g.ask({ type: 'choice', title: '천재 소녀', options: [{ id: 'b', label: '[정신] 1 지불' }, { id: 'any', label: '자원 2 지불' }] }) : (a ? 'b' : 'any');
    const paid = await g.pay(k === 'b' ? { n: 1, req: 'B' } : { n: 2, req: '' }, null, '천재 소녀: 비용', false); if (paid) addProg(g, 1);
  } }] };
  S['29003a'] = { actions: [{ timing: 'hero', label: '최대 효율: 진행 1 → 적에게 피해 2', can: g => prog(g) >= 1 && g.enemies().length > 0, async use(g, u) { g.c(g.idt()).cnt.progress--; await dmgEnemy(g, 2, '최대 효율: 피해 2를 줄 적', u); } }] };
  S['29003b'] = { actions: [prodigy('자원 1', { n: 1, req: '' })] };

  // ======================= hero cards =======================
  S['29004'] = { resources: [{ gen: 'B', label: '브론 (소진 상태, 단계당 1번)', can: (g, u) => g.c(u).ex && !(g.p.phase.brawn || []).includes(u), use: (g, u) => { (g.p.phase.brawn = g.p.phase.brawn || []).push(u); } }] }; // Brawn
  S['29005'] = { play: { timing: 'hero', label: 'thwart', target: 'thwartable', async resolve(g, u, ctx) { // Fly Over
    const r = await g.removeThreat(ctx.target, 3, { src: u }); const last = r > 0 && g.c(ctx.target).threat === 0; g.log(`비행 통과: 위협 ${r} 제거`); addProg(g, last ? 2 : 1); await g.afterThreatRemoved(ctx.target);
  } } };
  S['29006'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { const r = await g.playerAttack(g.idt(), ctx.target, 4, { src: u }); addProg(g, r && r.defeated ? 2 : 1); } } }; // Photon Beam
  S['29007'] = { play: { timing: 'hero', async resolve(g) { // New and Improved
    const x = version(g); const opts = [{ id: 'search', label: '덱에서 아이언하트 카드 1장을 손으로' }, { id: 'tough', label: '아이언하트에게 강인함' }, { id: 'ready', label: '아이언하트 준비' }];
    const sel = [];
    for (let i = 0; i < Math.min(x, 3); i++) { const left = opts.filter(o => !sel.includes(o.id)); if (left.length === 1 || x >= 3) { sel.push(...left.map(o => o.id)); break; } sel.push(await g.ask({ type: 'choice', title: `새롭게 업그레이드: ${i + 1}/${x}번째 선택`, options: left }) || left[0].id); }
    if (sel.includes('search')) await g.searchToHand(d => d.cls === 'Hero', '새롭게 업그레이드');
    if (sel.includes('tough')) g.giveStatus(g.idt(), 'tough', '새롭게 업그레이드');
    if (sel.includes('ready') && g.canReady(g.idt())) g.c(g.idt()).ex = false;
  } } };
  S['29008'] = { selfCostMod: g => version(g), play: { timing: 'hero', async resolve(g) { g.p.usedOnce.sectorScan = true; g.log('구역 스캔: 이번 라운드 동안 조우 덱 맨 위 카드를 볼 수 있습니다 (위쪽 표시)', 'good'); } } }; // Sector Scan
  S['29009'] = { async onSpent(g) { addProg(g, 1); await g.draw(1); } }; // Stroke of Genius
  S['29010'] = { actions: [{ timing: 'alter', exhaust: true, label: '소진 → 리리 피해 2 회복 또는 진행 1', async use(g) { // Ronnie Williams
    const k = await g.ask({ type: 'choice', title: '로니 윌리엄스', options: [{ id: 'heal', label: '리리 윌리엄스 피해 2 회복' }, { id: 'prog', label: '진행 카운터 1' }] });
    if (k === 'prog') addProg(g, 1); else g.heal(g.idt(), 2);
  } }] };
  S['29011'] = { actions: [{ timing: 'action', exhaust: true, label: '소진 → 덱 위 2장 중 1장 손으로, 1장 버림', async use(g) { // Tony Stark A.I.
    const top = await g.lookAtDeckTop(2); if (!top.length) return;
    const t = top.length === 1 ? top[0] : await g.ask({ type: 'target', title: '토니 스타크 A.I.: 손으로 가져올 카드', cands: top, cancelable: false });
    g.put(t, 'hand'); for (const x of top) if (x !== t) g.put(x, 'discard');
  } }] };
  S['29012'] = { mod: { hp: (g, s, t) => t === g.idt() ? 2 : 0 }, actions: [{ timing: 'hero', exhaust: true, label: '소진 → 적에게 버전 수만큼 피해', can: g => g.enemies().length > 0, async use(g, u) { await dmgEnemy(g, version(g), `광자 블래스터: 피해 ${version(g)}을 줄 적`, u); } }] }; // Photon Blasters
  S['29013'] = { mod: { hp: (g, s, t) => t === g.idt() ? 2 : 0 }, actions: [{ timing: 'hero', exhaust: true, label: '소진 → 음모에서 버전 수만큼 위협 제거', can: g => g.schemes().some(x => g.c(x).threat > 0), async use(g, u) { await g.removeThreatChoose(version(g), `추진 제트: 위협 ${version(g)}을 제거할 음모`, u); } }] }; // Propulsion Jets
  S['29028'] = { async whenRevealed(g, u) { // A Minor Setback
    if (prog(g) > 0) { g.c(g.idt()).cnt.progress--; g.log('작은 차질: 진행 카운터 -1'); g.discard(u); return; }
    const x = g.takeEncounter(); if (x) { g.put(x, 'facedown'); g.log('작은 차질: 뒷면 조우 카드 1장', 'warn'); }
    g.put(u, 'edeck'); g.shuffle(g.e.deck); g.log('작은 차질을 조우 덱에 섞습니다');
  } };
  const lucia = g => g.e.minions.find(m => g.c(m).id === '29030') || null;
  S['29029'] = { icons: g => lucia(g) ? { hazard: 1, accel: 0 } : { hazard: 0, accel: 1 } }; // Rule by Force
  S['29030'] = { mod: { sch: (g, s, t) => t === s && g.c(s).tough ? 1 : 0, atk: (g, s, t) => t === s && g.c(s).tough ? 1 : 0 }, on: { roundEnd(g, u) { if (g.c(u).zone === 'minion') g.giveStatus(u, 'tough', '루시아 폰 바르다스'); } } }; // Lucia von Bardas
  S['29031'] = { // Cyborg Tech
    attachTo: g => { const m = g.e.minions; if (!m.length) return null; const top = Math.max(...m.map(x => (g.d(x).tr || []).length)); return m.find(x => (g.d(x).tr || []).length === top); },
    surgeIfNoHost: true,
    mod: { hp: (g, s, t) => t === g.c(s).on ? 3 : 0, retaliate: (g, s, t) => t === g.c(s).on ? 1 : 0 },
    boostEffect(g, u, ctx) { (ctx.post || ctx.after).push(async gg => { if (['ediscard', 'boost'].includes(gg.c(u).zone)) { gg.put(u, 'facedown'); gg.log('★ 사이보그 기술: 뒷면 조우 카드로 받습니다', 'warn'); } }); }
  };
  S['29032'] = { async whenRevealed(g, u, ctx) { // Political Retribution
    const l = lucia(g), r = g.e.sides.find(x => g.c(x).id === '29029');
    if (l) await g.enemyScheme(l, {}); if (r) await g.placeThreat(r, 3, {});
    if (!l && !r) ctx.surge++;
  } };

  // ======================= Leadership / other aspects / Basic =======================
  S['29014'] = { actions: [{ timing: 'hero', exhaust: true, label: '소진 → [공중] 캐릭터 저지 +1 (이번 단계)', async use(g) { const pi = await g.choosePlayer('클라우드 9: [공중] 캐릭터를 강화할 플레이어'); g.withPlayerSync(pi, () => { for (const f of g.friendlyChars()) if (g.hasTrait(f, 'AERIAL')) g.addPhaseMod(f, 'thw', 1); }); g.log('클라우드 9: [공중] 캐릭터 저지 +1'); } }] }; // Cloud 9
  const falconReady = { timing: 'hero', label: '[에너지] → 다른 [챔피언] 캐릭터 준비', cost: { n: 1, req: 'Y' }, can: (g, u, ctx) => ctx.ally === u && g.friendlyChars().some(f => f !== u && g.c(f).ex && g.hasTrait(f, 'CHAMPION')),
    async resolve(g, u) { const t = await pick(g, g.friendlyChars().filter(f => f !== u && g.c(f).ex && g.hasTrait(f, 'CHAMPION')), '팔콘: 준비시킬 [챔피언] 캐릭터'); if (t && g.canReady(t)) g.c(t).ex = false; } };
  S['29015'] = { respond: [Object.assign({ window: 'afterAllyAttack' }, falconReady), Object.assign({ window: 'afterAllyThwart' }, falconReady)] }; // Falcon (Champion)
  S['29016'] = { async onEnter(g) { // Patriot
    if (!g.isHero()) return; const c = g.friendlyChars().filter(f => g.hasTrait(f, 'CHAMPION')); const t = await pick(g, c, '패트리엇: 기본 능력 +1을 받을 [챔피언] 캐릭터'); if (!t) return;
    for (const k of (t === g.idt() ? ['thw', 'atk', 'def'] : ['thw', 'atk'])) g.addRoundMod(t, k, 1); g.log(`패트리엇: ${g.nm(t)} 기본 능력 +1 (이번 라운드)`, 'good');
  } };
  const tri = g => (g.stat(g.idt(), 'thw') || 0) + (g.stat(g.idt(), 'atk') || 0) + (g.stat(g.idt(), 'def') || 0);
  S['29017'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', can: g => !g.c(g.idt()).ex, async resolve(g, u, ctx) { const n = tri(g); g.c(g.idt()).ex = true; await g.playerAttack(g.idt(), ctx.target, n, { src: u }); } } }; // Go All Out
  S['29018'] = { play: { timing: 'hero', label: 'thwart', target: 'thwartable', can: g => !g.c(g.idt()).ex, async resolve(g, u, ctx) { const n = tri(g); g.c(g.idt()).ex = true; const r = await g.removeThreat(ctx.target, n, { src: u }); g.log(`밀고 나가기: 위협 ${r} 제거`); await g.afterThreatRemoved(ctx.target); } } }; // Push Ahead
  S['29020'] = { actions: [{ timing: 'hero', exhaust: true, label: '소진·연구 1 → 캐릭터 저지·공격 +1 (이번 단계)', can: (g, u) => (g.c(u).cnt.research || 0) > 0, async use(g, u) { // R&D Facility
    g.c(u).cnt.research--; const t = await pick(g, g.allFriendlyChars(), 'R&D 시설: 저지·공격 +1을 받을 캐릭터'); if (t) { g.addPhaseMod(t, 'thw', 1); g.addPhaseMod(t, 'atk', 1); } g.cleanupUses(u);
  } }] };
  const shift = (g, s) => g.c(s).cnt.shift || 0;
  S['29023'] = { // Snowguard
    async onEnter(g, u) { const k = await g.ask({ type: 'choice', title: '스노가드: 변환 카운터', options: [{ id: '1', label: '1개 — 공격 +3, 압도' }, { id: '2', label: '2개 — 저지 +3, [공중]' }, { id: '3', label: '3개 — 체력 +5, 보복 1' }, { id: '0', label: '놓지 않음' }] }); const n = +k || 0; if (n) g.c(u).cnt.shift = n; },
    mod: { atk: (g, s, t) => t === s && shift(g, s) === 1 ? 3 : 0, thw: (g, s, t) => t === s && shift(g, s) === 2 ? 3 : 0, hp: (g, s, t) => t === s && shift(g, s) === 3 ? 5 : 0, retaliate: (g, s, t) => t === s && shift(g, s) === 3 ? 1 : 0 },
    grantTrait: (g, s, t) => t === s && shift(g, s) === 2 ? 'AERIAL' : null,
    selfOverkill: (g, s) => shift(g, s) === 1
  };
  S['29024'] = { async onEnter(g) { // Vivian (Champion)
    if (!g.isHero()) return;
    const atts = g.enemies().concat(g.friendlyChars(), g.e.sides).flatMap(x => g.c(x).att).filter(a => g.d(a).enc);
    const c = atts.concat(g.e.minions.filter(m => !has(g, m, 'ELITE')), g.e.sides.filter(x => !g.d(x).permanent));
    const t = await pick(g, c, '비비안: 이번 라운드 동안 문구를 백지화할 카드'); if (!t) return;
    g.c(t).blankRound = g.s.round; g.log(`비비안: ${g.nm(t)}의 문구를 라운드 끝까지 백지화`, 'good');
  } };
  S['29025'] = { canPlay: g => g.hasTrait(g.idt(), 'CHAMPION'), play: { timing: 'hero', async resolve(g) { for (const pi of g.livingPlayers()) g.s.ps[pi].usedOnce.champShield = true; g.log('"챔피언스, 가자!": 라운드 끝까지 [챔피언] 캐릭터는 피해를 받지 않습니다', 'good'); } } }; // "Go for Champions!"
  S['29027'] = { canPlay: g => g.hasTrait(g.idt(), 'GENIUS'), resources: [{ gen: 'B', label: '독창성 (소진)', can: (g, u) => !g.c(u).ex, use: (g, u) => { g.c(u).ex = true; } }] }; // Ingenuity
  S['29033'] = { canPlay: g => g.hasTrait(g.idt(), 'CHAMPION'), async customAttack(g, a, n, props) { // Bombshell
    const es = g.enemies().filter(x => g.c(x).zone); if (!es.length) return;
    const base = Math.floor(n / es.length); let rem = n % es.length; const extra = [];
    while (rem > 0) { const c = es.filter(x => !extra.includes(x)); const t = await pick(g, c, `밤셸: 피해 1을 더 받을 적 (${rem}명 남음)`); if (!t) break; extra.push(t); rem--; }
    g.log(`밤셸: 피해 ${n}을 적 ${es.length}에게 나눕니다`);
    for (const e of es) { const k = base + (extra.includes(e) ? 1 : 0); if (k > 0 && g.c(e).zone) await g.playerAttack(a, e, k, props); }
  } };
  S['29034'] = { canPlay: g => g.hasTrait(g.idt(), 'CHAMPION'), allyIgnores: ['guard', 'patrol', 'crisis'] }; // Wasp (Champion)
  S['29035'] = { canPlay: g => g.hasTrait(g.idt(), 'CHAMPION') }; // Pinpoint (the engine shuffles a discarded card back while she is ready)

  // ======================= Zzzax (modular) =======================
  const energyIn = (g, list) => list.reduce((t, u) => t + (g.resOf(u) || '').split('').filter(l => l === 'Y').length, 0);
  const energyPrinted = (g, list) => list.reduce((t, u) => t + (g.d(u).res || '').split('').filter(l => l === 'Y').length, 0);
  S['29036'] = { async whenRevealed(g, u) { await g.forEachPlayer(async () => { const n = energyIn(g, g.p.hand) + energyPrinted(g, g.controlled()); if (n) await g.placeThreat(u, n, {}); }); } }; // Feedback Loop
  S['29037'] = { // Zzzax
    mod: { atk: (g, s, t) => t === s ? energyPrinted(g, g.controlled(g.c(s).eng ?? 0)) : 0, hp: (g, s, t) => t === s ? energyPrinted(g, g.controlled(g.c(s).eng ?? 0)) : 0 },
    boostEffect(g, u, ctx) { if (energyIn(g, g.p.hand) >= 2) (ctx.post || ctx.after).push(async gg => { if (gg.c(u).zone && gg.c(u).zone !== 'minion') { gg.log('★ 즈작스가 교전합니다', 'warn'); await gg.enterMinion(u, {}, true); } }); }
  };
  const shake = { timing: 'hero', label: '[에너지] 카드 1장 버림 또는 간접 피해 2 → 이 카드 버림', async use(g, u) {
    const c = g.controlled().filter(x => x !== g.idt() && (g.d(x).res || '').includes('Y') && !g.d(x).permanent);
    const k = c.length ? await g.ask({ type: 'choice', title: g.nm(u), options: [{ id: 'card', label: '[에너지] 카드 1장 버림' }, { id: 'dmg', label: '간접 피해 2' }] }) : 'dmg';
    if (k === 'card') { const t = await pick(g, c, '버릴 [에너지] 카드'); g.discard(t, `${g.nm(t)} 버림`); } else await g.indirectDamage(2, null);
    g.discard(u, `${g.nm(u)} 버림`);
  } };
  S['29038'] = { attachTo: g => g.idt(), handResAsEnergy: true, actions: [shake] }; // Haywire
  S['29039'] = { actions: [shake], on: { async villainPhaseBegins(g) { await g.forEachPlayer(async () => { if (energyIn(g, g.p.hand) + energyPrinted(g, g.controlled()) > 0) { g.log(`대기 정전기(${g.playerName()}): 간접 피해 2`, 'warn'); await g.indirectDamage(2, null); } }); } } }; // Air Static
  S['29040'] = { async whenRevealed(g, u, ctx) { // Zzzap!
    const n = energyIn(g, g.p.hand); const before = g.c(g.idt()).dmg; if (n) await g.indirectDamage(n, null);
    if (g.c(g.idt()).dmg - before <= 1) ctx.surge++;
  } };

  MC.registerScripts(S);
})();
