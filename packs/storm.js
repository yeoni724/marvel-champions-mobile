/* Storm (36001-36039): the Weather deck, her hero set, Leadership X-Men cards, nemesis set and the Shadow King modular set.
   Ported from cards/pack/storm of the community build. */
(function () {
  'use strict';
  const S = {};
  const idOf = (g, u) => g.c(u).id;
  const has = (g, u, t) => g.hasTrait(u, t);
  const pick = async (g, cands, title) => !cands.length ? null : cands.length === 1 ? cands[0] : await g.ask({ type: 'target', title, cands, cancelable: false });
  const WEATHER = ['36002', '36003', '36004', '36005'];
  const weather = g => g.p.supports.find(u => WEATHER.includes(idOf(g, u))) || null;
  const weatherDeck = g => (g.p.pset || []).filter(u => WEATHER.includes(idOf(g, u)));
  const isWeather = (g, id) => { const w = weather(g); return !!w && idOf(g, w) === id; };
  const chars = g => g.allFriendlyChars().concat(g.enemies());
  async function dmgEnemy(g, n, title, src, attack) {
    const t = await g.chooseTarget(attack ? 'attackable' : 'enemy', title, g.idt(), false); if (!t) return null;
    if (attack) return { t, r: await g.playerAttack(g.idt(), t, n, { src }) };
    return { t, r: await g.dealDamage(t, n, { src, byPlayer: true }) };
  }
  async function special(g) { const w = weather(g); if (!w) return; const f = g.sc(w).special; if (!f) return; g.log(`${g.nm(w)}: 특수 능력`, 'good'); await f(g, w); await g.window('weatherSpecial', { weather: w }); }
  async function swapWeather(g) {
    const c = weatherDeck(g); if (!c.length) { await special(g); return; }
    const t = await pick(g, c, '날씨 덱에서 꺼낼 지원'); const w = weather(g);
    if (w) { g.resetCard(w); g.put(w, 'pset'); } g.put(t, 'support'); g.log(`날씨 조종: ${g.nm(t)}`, 'good'); await special(g);
  }

  // ======================= identity =======================
  S['36001a'] = { actions: [{ timing: 'action', once: true, label: '날씨 조종: [날씨] 지원 교체 → 특수 능력', async use(g) { await swapWeather(g); } }] };
  S['36001b'] = { async setup(g) { const c = weatherDeck(g); const t = await pick(g, c, '준비: 처음 놓을 [날씨] 지원'); if (t) { g.put(t, 'support'); g.log(`준비: ${g.nm(t)}을(를) 플레이에 놓습니다`); } } };
  S['36002'] = { stalwartFor: (g, s, t) => chars(g).includes(t), async special(g) { await g.draw(1); } }; // Clear Skies
  S['36003'] = { mod: { retaliate: (g, s, t) => chars(g).includes(t) ? 1 : 0 }, async special(g, u) { if (g.schemes().some(x => g.c(x).threat > 0)) await g.removeThreatChoose(2, '허리케인: 위협 2를 제거할 음모', u); } }; // Hurricane
  S['36004'] = { mod: { atk: (g, s, t) => chars(g).includes(t) ? 1 : 0 }, async special(g, u) { if (g.enemies().length) await dmgEnemy(g, 2, '뇌우: 피해 2를 줄 적', u); } }; // Thunderstorm
  S['36005'] = { mod: { atk: (g, s, t) => chars(g).includes(t) ? -1 : 0 }, async special(g) { // Blizzard
    const c = g.e.minions.filter(m => !has(g, m, 'ELITE')); const t = await pick(g, c, '눈보라: 라운드 끝까지 문구를 지울 하수인'); if (t) { g.c(t).blankRound = g.s.round; g.log(`눈보라: ${g.nm(t)}의 문구가 지워집니다`); }
  } };

  // ======================= hero cards =======================
  S['36006'] = { mod: { thw: (g, s, t) => t === g.idt() && g.isHero() ? 1 : 0 }, resources: [{ gen: g => { const w = weather(g); return w ? (g.d(w).res || '') : ''; }, label: '폭풍의 왕관 (날씨 지원의 자원)', can: (g, u) => g.isHero() && !g.c(u).ex && !!weather(g), use: (g, u) => { g.c(u).ex = true; } }] }; // Storm's Crown
  S['36007'] = { mod: { def: (g, s, t) => t === g.idt() && g.isHero() ? 1 : 0 }, grantTrait: (g, s, t) => t === g.idt() && g.isHero() ? 'AERIAL' : null, // Storm's Cape
    respond: [{ window: 'weatherSpecial', timing: 'hero', exhaust: true, label: '소진 → 스톰 준비', can: g => g.c(g.idt()).ex, async resolve(g) { if (g.canReady(g.idt())) g.c(g.idt()).ex = false; } }] };
  S['36008'] = { actions: [{ timing: 'alter', exhaust: true, label: '소진 → 정체성 피해 2 회복', async use(g) { g.heal(g.idt(), 2); } }] }; // Ororo's Garden
  S['36009'] = { play: { timing: 'hero', async resolve(g) { await swapWeather(g); } } }; // Weather Goddess
  S['36010'] = { play: { timing: 'hero', label: 'thwart', can: g => g.schemes().some(x => g.c(x).threat > 0 && !g.noRemove(x)), async resolve(g, u) { // Torrential Rain
    let n = 3; while (n > 0) { const sc = g.schemes().filter(x => g.c(x).threat > 0 && !g.noRemove(x)); if (!sc.length) break; const t = await pick(g, sc, `폭우: 위협을 제거할 음모 (남은 ${n})`); const k = sc.length === 1 ? n : (+(await g.ask({ type: 'choice', title: '제거할 양', options: Array.from({ length: n }, (_, i) => ({ id: String(n - i), label: `${n - i}` })) })) || n); const r = await g.removeThreat(t, k, { src: u }); n -= Math.max(1, r); await g.afterThreatRemoved(t); }
    if (isWeather(g, '36003')) await special(g);
  } } };
  S['36011'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { await g.playerAttack(g.idt(), ctx.target, 8, { src: u }); if (isWeather(g, '36004')) await special(g); } } }; // Lightning Bolt
  S['36012'] = { interrupt: { window: 'enemyAttackInitiated', timing: 'hero', label: 'defense', can: (g, u, ctx) => ctx.enemy === g.e.villain, async resolve(g) { // Flash Freeze
    for (const e of [g.e.villain].concat(g.engagedMinions())) if (e) g.addPhaseMod(e, 'atk', -3); g.log('순간 동결: 빌런과 하수인 공격 -3 (이번 단계)', 'good'); if (isWeather(g, '36005')) await special(g);
  } } };
  S['36013'] = { play: { timing: 'hero', async resolve(g, u) { // Blast of Wind
    const pi = await g.choosePlayer('돌풍: 대상 플레이어');
    if (g.e.villain) await g.dealDamage(g.e.villain, 3, { src: u, byPlayer: true }); for (const m of g.engagedMinions(pi).slice()) await g.dealDamage(m, 3, { src: u, byPlayer: true }); await special(g);
  } } };
  S['36030'] = { // Claustrophobia
    async whenRevealed(g, u) { if (g.isHero()) await g.changeForm(true); g.put(u, 'pobl'); g.log('폐소공포증: 일상 모습으로, 모습을 바꿀 수 없습니다', 'warn'); },
    noFormChange: true,
    actions: [{ timing: 'alter', label: '오로로 소진 → 이 카드 제거', can: (g, u) => g.c(u).zone === 'pobl' && !g.c(g.idt()).ex, async use(g, u) { g.c(g.idt()).ex = true; g.removeFromGame(u); } }]
  };
  S['36031'] = { on: { treacheryRevealing(g, u, ctx) { if (ctx.card && idOf(g, ctx.card) === '36034' && g.c(u).zone === 'minion') g.giveStatus(u, 'tough', '칼리스토'); } } }; // Callisto
  S['36032'] = { async whenDefeated(g) { const x = g.e.deck.concat(g.e.discard, g.e.setaside || []).find(y => idOf(g, y) === '36034'); g.shuffle(g.e.deck); if (x) await g.reveal(x); } }; // Leader of the Morlocks
  S['36033'] = { attachTo: g => { const m = g.e.minions; if (!m.length) return null; const top = Math.max(...m.map(x => g.d(x).atk || 0)); return m.find(x => (g.d(x).atk || 0) === top); }, surgeIfNoHost: true, attackProps: () => ({ piercing: true }) }; // Switchblade
  S['36034'] = { async whenRevealed(g, u, ctx) { // Knife Fight
    if (!g.isHero()) { ctx.surge++; return; }
    const es = g.enemies(); if (!es.length) return; const top = Math.max(...es.map(e => g.stat(e, 'atk') || 0)); const t = await pick(g, es.filter(e => (g.stat(e, 'atk') || 0) === top), '칼싸움: 공격력이 가장 높은 적');
    await g.dealDamage(g.idt(), g.stat(t, 'atk') || 0, { src: t }); if (g.c(t).zone) await g.dealDamage(t, g.stat(g.idt(), 'atk') || 0, { src: g.idt(), byPlayer: true });
  } };

  // ======================= aspect cards =======================
  S['36014'] = { respond: [{ window: 'allyPowerUsed', label: '★ 조우 덱 맨 위 버림 → 강화 아이콘만큼 공격 +1, 후속 피해 +1', can: (g, u, ctx) => ctx.ally === u && ctx.kind === 'attack', async resolve(g, u, ctx) { // Havok
    const x = g.takeEncounter(); if (!x) return; g.put(x, 'ediscard'); const n = g.boostOf(x); g.log(`하복: ${g.nm(x)} (강화 ${n})`); if (!n) return;
    ctx.bonus += n; ctx.after.push(async gg => { if (gg.c(u).zone === 'ally') await gg.dealDamage(u, n, { consequential: true }); });
  } }] };
  S['36015'] = { async onEnter(g, u) { const c = g.enemies().filter(e => (g.stat(e, 'sch') || 0) < (g.stat(u, 'thw') || 0)); const t = await pick(g, c, '미라지: 기절시킬 적 (음모력 < 미라지 저지력)'); if (t) g.giveStatus(t, 'stun', '미라지'); } }; // Mirage
  S['36016'] = { respond: [{ window: 'afterAllyAttack', label: '★ 빌런 공격 후 후속 피해 +1', can: (g, u, ctx) => ctx.ally === u && ctx.target === g.e.villain && g.c(u).zone === 'ally', async resolve(g, u) { await g.dealDamage(u, 1, { consequential: true }); } }] }; // Gentle
  S['36017'] = { async onPlay(g) { const t = await pick(g, g.p.discard.filter(x => g.d(x).type === 'ally' && (g.d(x).tr || []).includes('X-MEN')), '픽시: 손으로 가져올 [엑스맨] 동료'); if (t) g.put(t, 'hand'); } }; // Pixie
  S['36018'] = { mod: { hp: (g, s, t) => g.p.allies.includes(t) && has(g, t, 'X-MEN') ? 1 : 0 }, costMod: (g, s, uid) => g.d(uid).type === 'ally' && (g.d(uid).tr || []).includes('X-MEN') && g.friendlyChars().every(f => has(g, f, 'X-MEN')) ? 1 : 0 }; // Uncanny X-Men
  S['36019'] = { respond: [{ window: 'allyPowerUsed', label: '리더십 카운터 1 → 이번 행동 저지·공격 +1', can: (g, u) => (g.c(u).cnt.leadership || 0) > 0, async resolve(g, u, ctx) { g.c(u).cnt.leadership--; ctx.bonus += 1; g.cleanupUses(u); } }] }; // Leadership Skill
  S['36020'] = { canPlay: g => has(g, g.idt(), 'X-MEN'), play: { timing: 'hero', async resolve(g) { // "To Me, My X-Men!"
    const top = g.p.deck.slice(0, 5); const c = top.filter(x => g.d(x).type === 'ally' && (g.d(x).tr || []).includes('X-MEN'));
    const t = c.length ? (await g.pickCards(c, '나에게, 엑스맨!: 플레이에 내놓을 [엑스맨] 동료', 1, 1, '선택'))[0] : null; if (t) { await g.putAllyIntoPlay(t); (g.p.phase.endToHand = g.p.phase.endToHand || []).push(t); } g.shuffle(g.p.deck);
  } } };
  S['36022'] = { async onEnter(g) { await g.searchToHand(d => d.type === 'support' && ((d.tr || []).includes('X-MEN') || (d.tr || []).includes('X-FORCE')), '포지', { discard: true }); } }; // Forge
  S['36035'] = { respond: [{ window: 'afterAllyDefends', exhaust: true, label: '소진 → 그 동료 준비', can: (g, u, ctx) => g.c(ctx.ally) && g.c(ctx.ally).zone === 'ally' && g.c(ctx.ally).ex, async resolve(g, u, ctx) { if (g.canReady(ctx.ally)) g.c(ctx.ally).ex = false; } }] }; // Hangar Bay

  // ======================= Shadow King (modular) =======================
  const controlled = g => g.e.minions.filter(m => has(g, m, 'CONTROLLED'));
  const possessed = g => Object.keys(g.s.cards).filter(u => idOf(g, u) === '36038' && g.c(u).zone === 'attach');
  S['36036'] = { cannotTakeDamage: g => controlled(g).length > 0, async whenRevealed(g) { const x = g.searchEncounter(d => d.id === '36038'); g.shuffle(g.e.deck); if (x) await g.reveal(x); } }; // The Shadow King
  S['36037'] = { whenDefeated(g) { const p = possessed(g)[0]; if (!p) return; const h = g.c(p).on; g.discard(p, '빙의 해제'); if (h && g.c(h).zone === 'minion' && g.c(h).real) { const c = g.c(h); c.id = c.real; delete c.real; g.put(h, 'ally'); g.log(`${g.nm(h)}이(가) 다시 동료가 됩니다`, 'good'); } }, // Ruler of the Astral Plane
    boostEffect(g, u, ctx) { if (controlled(g).length) (ctx.post || ctx.after).push(async gg => { if (['ediscard', 'boost'].includes(gg.c(u).zone)) await gg.reveal(u); }); } };
  S['36038'] = { revealFirst: true, async whenRevealed(g, u, ctx) { // Possessed
    const c = g.p.allies.filter(a => !g.c(a).att.some(x => idOf(g, x) === '36038')); if (!c.length) { g.discard(u); ctx.surge++; return; }
    const lo = Math.min(...c.map(a => g.stat(a, 'thw') || 0)); const a = await pick(g, c.filter(x => (g.stat(x, 'thw') || 0) === lo), '빙의: 하수인이 될 동료');
    g.allyToMinion(a, 'CONTROLLED'); g.attachEnc(u, a);
  } };
  S['36039'] = { async whenRevealed(g, u, ctx) { const c = controlled(g); if (!c.length) { ctx.surge++; return; } for (const m of c) if (g.c(m).zone === 'minion') await g.activate(m, {}); }, // Astral Attack
    boostEffect(g) { const ids = ['36036', '36037', '36038', '36039']; const c = g.e.discard.filter(x => ids.includes(idOf(g, x))); c.forEach(x => g.put(x, 'edeck')); if (c.length) { g.shuffle(g.e.deck); g.log(`★ 아스트랄 공격: 섀도 킹 카드 ${c.length}장을 조우 덱에 섞습니다`); } } };

  MC.registerScripts(S);
})();
