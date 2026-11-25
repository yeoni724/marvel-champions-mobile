/* Wonder Man (58001-58034): Ionic Physiology tucks [energy] events, overpaying, Grim Reaper nemesis and the pack's player cards.
   Ported from cards/pack/wonder_man of the community build. */
(function () {
  'use strict';
  const S = {};
  const idOf = (g, u) => g.c(u).id;
  const tr = (g, u, t) => (g.d(u).tr || []).includes(t) || g.hasTrait(u, t);
  const pick = async (g, cands, title) => !cands.length ? null : cands.length === 1 ? cands[0] : await g.ask({ type: 'target', title, cands, cancelable: false });
  async function thw(g, t, n, src) { const r = await g.removeThreat(t, n, { src }); g.log(`${g.nm(t)} 위협 ${r} 제거`); await g.afterThreatRemoved(t); return r; }
  const isWM = g => ['58001a', '58001b'].includes(idOf(g, g.idt()));
  const ip = g => g.p.upgrades.find(x => idOf(g, x) === '58002') || null;
  const tucked = g => { const x = ip(g); return x ? (g.c(x).under || []) : []; };
  const energyEvent = (g, x) => g.d(x).type === 'event' && (g.d(x).res || '').includes('Y');
  function tuck(g, x) { const p = ip(g); if (!p || tucked(g).length >= 3) return false; g.c(p).under = g.c(p).under || []; g.put(x, 'under', p); g.log(`${g.nm(x)}: 이온 생리 아래에 넣음 (${tucked(g).length}/3)`); return true; }
  // overpaid [energy]: the extra resources of the payment itself (a double resource on a 1-cost card), then more if you like
  async function overY(g, u, ctx, max, letter) {
    const paid = (ctx && ctx.paid) || []; const need = (g.d(u).cost || 0) > 0 ? g.d(u).cost : 0; const extra = Math.max(0, paid.length - need);
    const already = Math.min(max, extra, letter ? paid.filter(l => l === letter || l === 'G').length : extra);
    if (already) g.log(`${g.nm(u)}: 이미 ${already}개 더 지불`);
    const more = already < max ? await g.overpay(max - already, letter, `${g.nm(u)}: 더 지불할 ${letter === 'Y' ? '[에너지] ' : ''}자원 (최대 ${max - already})`) : 0;
    return already + Math.min(max - already, more);
  }
  // ======================= identity =======================
  S['58001a'] = { mod: { atk: (g, s, t) => t === s ? tucked(g).length : 0 }, // Power Recycling
    on: { basicHeroPower(g, u, ctx) { if (ctx.kind !== 'attack' || !tucked(g).length) return; for (const x of tucked(g).slice()) g.put(x, 'discard'); g.log('★ 원더맨: 이온 생리 아래 카드를 모두 버립니다'); } } };
  S['58001b'] = { setup(g) { const x = g.p.deck.concat(g.p.hand).find(y => idOf(g, y) === '58002'); if (x) { g.put(x, 'upgrade'); g.shuffle(g.p.deck); g.log('사전 준비: 이온 생리 등장'); } } };
  S['58002'] = { respond: [{ window: 'cardPlayedDone', label: '이온 생리: 그 이벤트를 아래에 넣고 회복 1', can: (g, u, ctx) => ctx.card && energyEvent(g, ctx.card) && g.c(ctx.card).zone === 'discard' && tucked(g).length < 3,
    resolve(g, u, ctx) { if (tuck(g, ctx.card)) g.heal(g.idt(), 1); } }] }; // Ionic Physiology
  S['58003'] = { play: { timing: 'hero', label: 'thwart', target: 'thwartable', async resolve(g, u, ctx) { const n = await overY(g, u, ctx, 2, 'Y'); await thw(g, ctx.target, 1 + 2 * n, u); } } }; // Active Altruism
  S['58004'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { const n = await overY(g, u, ctx, 3, 'Y'); await g.playerAttack(g.idt(), ctx.target, 3 + 2 * n, { src: u }); } } }; // Ionic Blast
  S['58005'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { const n = await overY(g, u, ctx, 1, 'Y'); const t = ctx.target; await g.playerAttack(g.idt(), t, g.stat(g.idt(), 'atk'), { src: u }); if (n && g.c(t).zone) g.giveStatus(t, 'stun', '스타스트럭'); } } }; // Starstruck
  S['58006'] = { siphon: true }; // Energy Siphon: pick "피해 k → 에너지 1+k" when paying (hero form)
  S['58007'] = { actions: [{ timing: 'alter', exhaust: true, label: '원더 팬: 이벤트를 이온 생리 아래에 넣기 또는 카드 1장', async use(g, u) { // Wonder Fans
    const ev = g.p.discard.filter(x => energyEvent(g, x)); const o = ev.length && tucked(g).length < 3 ? await g.ask({ type: 'choice', title: '원더 팬', options: [{ id: 't', label: '[에너지] 이벤트를 이온 생리 아래에' }, { id: 'd', label: '카드 1장 뽑기' }] }) : 'd';
    if (o === 't') { const x = await pick(g, ev, '넣을 이벤트'); if (x) tuck(g, x); } else await g.draw(1); } }] };
  S['58008'] = { resources: [{ gen: 'Y', label: '제트 벨트 (이벤트용)', forOnly: (g, u, f) => g.d(f).type === 'event', can: (g, u) => !g.c(u).ex && g.isHero(), use: (g, u) => { g.c(u).ex = true; } }, // Jet Belt
    { gen: 'Y', label: '제트 벨트 (아래 카드 1장 버림)', can: (g, u) => !g.c(u).ex && g.isHero() && tucked(g).length > 0, use: (g, u) => { g.c(u).ex = true; const x = tucked(g)[0]; if (x) g.put(x, 'discard'); } }] };
  S['58009'] = { resources: [{ gen: 'Y', label: '미스터 할리우드 (더 지불할 때만)', can: (g, u) => (g.p.overpaying || 0) > 0 && g.c(u).hollyId !== g.p.overpayId, use: (g, u) => { g.c(u).hollyId = g.p.overpayId; } }] }; // Mr. Hollywood
  S['58010'] = { respond: [{ window: 'afterChangeForm', label: '시그니처 선글라스: 카드를 이온 생리 아래에 넣기 또는 아래 카드를 손으로', can: g => (g.p.discard.some(x => ['event', 'resource'].includes(g.d(x).type) && (g.d(x).res || '').includes('Y')) && tucked(g).length < 3) || tucked(g).length > 0,
    async resolve(g) { const cand = g.p.discard.filter(x => ['event', 'resource'].includes(g.d(x).type) && (g.d(x).res || '').includes('Y')); const opts = []; if (cand.length && tucked(g).length < 3) opts.push({ id: 't', label: '버림 더미의 [에너지] 카드를 넣기' }); if (tucked(g).length) opts.push({ id: 'h', label: '아래 카드 1장을 손으로' });
      const o = opts.length === 1 ? opts[0].id : await g.ask({ type: 'choice', title: '시그니처 선글라스', options: opts }); if (o === 't') { const x = await pick(g, cand, '넣을 카드'); if (x) tuck(g, x); } else { const x = await pick(g, tucked(g).slice(), '손으로 가져올 카드'); if (x) g.put(x, 'hand'); } } }] };
  S['58011'] = { on: { async hostWouldBeDefeated(g, a, w) { if (w.saved || w.target !== g.idt() || !g.isHero() || g.c(a).zone !== 'upgrade') return; w.saved = true; // "What Are You?"
    const c = g.c(g.idt()); c.dmg = Math.max(0, g.maxHp(g.idt()) - 4); g.flip(true); g.log('"넌 뭐야?": 체력 4로 일상 모습이 됩니다', 'good');
    while (tucked(g).length < 3) { const ev = g.p.discard.filter(x => energyEvent(g, x)); if (!ev.length) break; const x = await g.ask({ type: 'target', title: '이온 생리 아래에 넣을 이벤트 (취소하면 그만)', cands: ev, cancelable: true }); if (!x) break; tuck(g, x); }
    g.removeFromGame(a); } } };
  S['58025'] = { whenRevealed(g, u) { g.put(u, 'pobl'); g.log('평화주의: 원더맨은 공격할 수 없습니다', 'warn'); }, heroNo: { attack: (g, u) => g.c(u).zone === 'pobl' }, // Pacifism
    actions: [{ timing: 'alter', label: '사이먼 소진 또는 아래 카드 3장 버림 → 평화주의 버림', can: (g, u) => g.c(u).zone === 'pobl' && (!g.c(g.idt()).ex || tucked(g).length >= 3), async use(g, u) {
      const o = !g.c(g.idt()).ex && tucked(g).length >= 3 ? await g.ask({ type: 'choice', title: '평화주의', options: [{ id: 'e', label: '사이먼 윌리엄스 소진' }, { id: 't', label: '아래 카드 3장 버림' }] }) : (!g.c(g.idt()).ex ? 'e' : 't');
      if (o === 'e') g.c(g.idt()).ex = true; else for (const x of tucked(g).slice(0, 3)) g.put(x, 'discard'); g.discard(u, '평화주의 버림'); } }] };
  // nemesis
  const reaper = g => g.e.minions.find(m => idOf(g, m) === '58026') || null;
  S['58026'] = { on: { afterEnemyAttack(g, u, ctx) { if (ctx.enemy === u && ctx.target && ctx.target !== g.idt() && g.d(ctx.target).type === 'ally' && g.c(ctx.target).zone !== 'ally') { const x = g.takeEncounter(); if (x) { g.put(x, 'facedown'); g.log('★ 그림 리퍼: 동료를 쓰러뜨려 조우 카드 1장', 'warn'); } } } },
    async beforeAttackedCtx(g, t, actx) { if (!g.e.sides.some(s => idOf(g, s) === '58027')) return; if (!g.p.hand.length) { actx.prevent = true; g.log('형제 대 형제: 버릴 카드가 없어 공격할 수 없습니다', 'warn'); return; } await g.discardFromHand(1, 1, '형제 대 형제: 공격 추가 비용'); } };
  S['58027'] = {}; // Brother vs. Brother (the extra cost is paid when the attack is made)
  S['58028'] = { async whenRevealed(g) { const r = reaper(g); if (r) await g.activate(r, {}); else await g.indirectDamage(2, null); } }; // Scythe Strike
  S['58029'] = { async whenRevealed(g) { let r = reaper(g); if (!r) { const x = g.e.deck.concat(g.e.discard, g.e.setaside, g.e.aside || []).find(y => idOf(g, y) === '58026'); if (x) { await g.reveal(x); return; } } if (r) await g.activate(r, {}); }, // Death Cannot Die
    boostEffect(g, u, ctx) { const r = reaper(g); if (r && ctx.enemy !== r) (ctx.post || ctx.after).push(async gg => { if (gg.c(r).zone === 'minion') await gg.activate(r, {}); }); } };
  // ======================= aspect / basic =======================
  S['58012'] = { async onPlay(g, u, ctx) { if (await overY(g, u, ctx, 1, null)) { g.c(u).cnt.rebirth = 1; g.log('파이어버드: 부활 카운터 1'); } }, // Firebird
    async wouldBeDefeated(g, u, w) { if (w.consequential && (g.c(u).cnt.rebirth || 0) > 0) { g.c(u).cnt.rebirth--; g.c(u).dmg = 0; w.saved = true; g.log('파이어버드: 부활! 피해를 모두 회복', 'good'); } } };
  S['58013'] = { onEnter(g, u) { g.c(u).cnt.arrow = 4; }, respond: [{ window: 'afterAllyThwart', label: '호크아이: 화살 1 → 하수인에게 피해 2', can: (g, u) => g.c(u).zone === 'ally' && (g.c(u).cnt.arrow || 0) > 0 && g.e.minions.length > 0, // Hawkeye (ally)
    async resolve(g, u) { g.c(u).cnt.arrow--; const m = await pick(g, g.e.minions.slice(), '피해 2를 줄 하수인'); if (m) await g.dealDamage(m, 2, { src: u, byPlayer: true }); } }] };
  S['58014'] = { async onPlay(g) { const x = g.takeEncounter(); if (!x) return; g.put(x, 'ediscard'); g.log(`스칼렛 위치: 조우 덱 맨 위 ${g.nm(x)} 버림`); if (g.d(x).type === 'treachery') { const f = g.sc(x).whenRevealed || (g.isHero() ? g.sc(x).whenRevealedHero : g.sc(x).whenRevealedAlter); if (f) await f(g, x, { surge: 0 }); } } }; // Scarlet Witch (ally)
  S['58015'] = { async onEnter(g) { const x = g.e.deck.find(y => g.d(y).type === 'side'); g.shuffle(g.e.deck); if (x) await g.reveal(x); else { g.log('센트리: 부가 음모가 없어 주 음모에 위협 6', 'warn'); await g.placeThreat(g.e.main, 6, {}); } } }; // Sentry
  S['58016'] = { play: { timing: 'hero', can: g => g.enemies().some(e => g.c(e).dmg > 0), async resolve(g) { const t = await pick(g, g.enemies().filter(e => g.c(e).dmg > 0), '회복 2 후 혼란시킬 적'); if (!t) return; g.heal(t, 2); g.giveStatus(t, 'conf', '전장의 자비'); } } }; // Battlefield Benevolence
  S['58018'] = { canPlay: g => tr(g, g.idt(), 'AERIAL'), play: { timing: 'hero', label: 'thwart', can: g => tr(g, g.idt(), 'AERIAL'), async resolve(g, u) { // Everywhere All at Once (X)
    const all = g.targets('thwartable'); if (!all.length) return; const x = await g.overpay(all.length, null, `X를 정하세요: 고를 음모 수 (최대 ${all.length})`); if (!x) return;
    const extra = await g.overpay(1, null, '더 지불하면 음모마다 위협 3 제거'); const chosen = all.length <= x ? all : await g.pickCards(all, `위협을 제거할 음모 ${x}개`, x, x, '선택');
    for (const s of chosen) await thw(g, s, extra ? 3 : 2, u); } } };
  S['58019'] = { interrupt: { window: 'allyWouldTakeDamage', timing: 'hero', label: '함께 더 강하게', can: (g, u, ctx) => (g.d(ctx.target).tr || []).some(t => g.hasTrait(g.idt(), t)), resolve(g, u, ctx) { ctx.prevent += g.stat(g.idt(), 'def'); } } }; // Stronger Together
  S['58020'] = { interrupt: { window: 'allyPowerUsed', timing: 'hero', label: '합동 일격', can: g => !g.c(g.idt()).ex, resolve(g, u, ctx) { g.c(g.idt()).ex = true; ctx.bonus += g.stat(g.idt(), ctx.kind === 'attack' ? 'atk' : 'thw'); ctx.noCons = true; g.log(`합동 일격: ${g.nm(ctx.ally)} +${g.stat(g.idt(), ctx.kind === 'attack' ? 'atk' : 'thw')}, 후속 피해 없음`); } } }; // Unified Strike
  S['58021'] = { mod: { hp: (g, s, t) => t === g.idt() ? 3 : 0, thw: (g, s, t) => t === g.idt() && g.isHero() ? 1 : 0 } }; // Heroic Conditioning
  S['58022'] = { selfPiercing: true, respond: [{ window: 'boostTurned', label: '소드맨: 소진하지 않고 방어자로 선언', can: (g, u, b) => g.isHero() && g.c(u).zone === 'ally' && b.attack && b.act && b.act.undefended && !b.act.lateDefender, resolve(g, u, b) { b.act.lateDefender = u; g.log('소드맨이 방어자로 나섭니다', 'good'); } }] }; // Swordsman
  S['58024'] = { respond: [{ window: 'afterChangeForm', exhaust: true, label: '자비스: 회복력 +2 또는 상태 카드 1장 제거', can: (g, u, ctx) => ctx.form === 'alter' && tr(g, g.idt(), 'AVENGER'), async resolve(g) { // Jarvis
    const c = g.c(g.idt()); const opts = [{ id: 'r', label: '이번 단계 회복력 +2' }]; if (c.stun) opts.push({ id: 's', label: '기절 제거' }); if (c.conf) opts.push({ id: 'c', label: '혼란 제거' });
    const o = opts.length === 1 ? 'r' : await g.ask({ type: 'choice', title: '자비스', options: opts }); if (o === 'r') g.addPhaseMod(g.idt(), 'rec', 2); else if (o === 's') c.stun = false; else c.conf = false; } }] };
  S['58030'] = { attach: { kind: 'minion', filter: (g, t) => !tr(g, t, 'ELITE') && !g.c(t).att.some(a => idOf(g, a) === '58030') }, // Caught in the Crossfire
    on: { async friendlyAttacking(g, u) { const m = g.c(u).on; if (m && g.c(m).zone === 'minion') await g.dealDamage(m, 1, { src: u, byPlayer: true }); } } };
  S['58031'] = { async afterSetup(g, u) { // Cameo: the identity-specific ally chosen on the start screen goes into the deck, then discard 2 and remove Cameo
    const id = g.s.cameo; if (id && MC.cards[id]) { g.newCard(id, 'deck'); g.shuffle(g.p.deck); g.log(`카메오: ${MC.cards[id].name}을(를) 덱에 섞습니다`, 'good'); } else g.log('카메오: 고른 동료가 없습니다');
    for (let i = 0; i < 2 && g.p.hand.length; i++) { const t = await pick(g, g.p.hand.slice(), `카메오: 손에서 버릴 카드 (${i + 1}/2)`); if (t) g.put(t, 'discard'); }
    g.removeFromGame(u); g.log('카메오를 게임에서 제거합니다'); } };
  S['58032'] = {}; // Coordinated Effort (no effect with one player)
  S['58033'] = { interrupt: { window: 'heroDefends', timing: 'hero', label: '무장 해제 방어', resolve(g, u, ctx) { ctx.defBonus += 2; const en = ctx.enemy; ctx.after.push(async (gg, none) => { if (!none || !gg.c(en) || !gg.c(en).zone) return; const xs = gg.c(en).att.filter(a => gg.sc(a).actions || gg.sc(a).respond); const a = await pick(gg, xs, '버릴 부착물'); if (a) gg.discard(a, `무장 해제 방어: ${gg.nm(a)} 버림`); }); } } }; // Disarming Defense
  S['58034'] = { canPlay: g => tr(g, g.idt(), 'AVENGER'), actions: [{ exhaust: true, label: '어벤져스 컴파운드: 동료 넣기 또는 넣어 둔 동료 플레이', can: (g, u) => (g.c(u).under || []).length > 0 || g.p.hand.some(x => g.d(x).type === 'ally'), // Avengers Compound
    async use(g, u) { g.c(u).under = g.c(u).under || []; if (!g.c(u).under.length) { const x = await pick(g, g.p.hand.filter(y => g.d(y).type === 'ally'), '넣어 둘 동료'); if (x) { g.put(x, 'under', u); g.log(`${g.nm(x)}: 어벤져스 컴파운드에 넣어 둠`); } } else { const x = g.c(u).under[0]; g.put(x, 'hand'); if (g.canPlay(x)) await g.playCard(x); if (g.c(x).zone === 'hand') { g.put(x, 'under', u); g.log(`${g.nm(x)}: 플레이하지 못해 다시 넣어 둡니다`); } } } }] };
  MC.registerScripts(S);
})();
