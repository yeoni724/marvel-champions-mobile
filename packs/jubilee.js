/* Jubilee (47001-47034): "different resource types" payments, Shopping Spree, Arcade modular, and the pack's player cards.
   Ported from cards/pack/jubilee of the community build. */
(function () {
  'use strict';
  const S = {};
  const idOf = (g, u) => g.c(u).id;
  const tr = (g, u, t) => (g.d(u).tr || []).includes(t) || g.hasTrait(u, t);
  const pick = async (g, cands, title) => !cands.length ? null : cands.length === 1 ? cands[0] : await g.ask({ type: 'target', title, cands, cancelable: false });
  async function thw(g, t, n, src) { const r = await g.removeThreat(t, n, { src }); g.log(`${g.nm(t)} 위협 ${r} 제거`); await g.afterThreatRemoved(t); return r; }
  const types = paid => new Set((paid || []).filter(x => 'YBRG'.includes(x))).size; // [energy] [mental] [physical] [wild]
  MC.jubilee = { types };
  const isJub = g => ['47001a', '47001b'].includes(idOf(g, g.idt()));
  S['47001a'] = { resources: [{ gen: 'G', label: '"완전 끝내줘!" (주빌리 소진)', can: (g, u) => !g.c(u).ex, use: (g, u) => { g.c(u).ex = true; } }] };
  S['47001b'] = { actions: [{ timing: 'alter', label: '몰 랫: 덱에서 쇼핑 삼매경을 찾아 플레이 영역에 (단계당 1번)', can: g => !g.p.phase.mallRat && g.p.deck.some(x => idOf(g, x) === '47003'), async use(g) {
    g.p.phase.mallRat = true; const x = g.p.deck.find(y => idOf(g, y) === '47003'); g.shuffle(g.p.deck); if (x) { await g.enterSide(x, {}); g.log('쇼핑 삼매경이 플레이 영역에 들어옵니다', 'good'); } } }] };
  S['47002'] = { selfPiercing: true, respond: [{ window: 'afterChangeForm', label: '울버린 회복 3', can: (g, u, ctx) => ctx.form === 'alter' && g.c(u).zone === 'ally' && g.c(u).dmg > 0, resolve(g, u) { g.heal(u, 3); } }] }; // Wolverine (ally)
  S['47003'] = { removeOnlyBy: () => false, // Shopping Spree
    actions: [{ timing: 'alter', label: '정체성 소진 → 쇼핑 삼매경 위협 1 제거', can: (g, u) => g.c(u).zone === 'side' && !g.c(g.idt()).ex && g.c(u).threat > 0, async use(g, u) { g.c(g.idt()).ex = true; g.c(u).threat--; g.log('쇼핑 삼매경 위협 1 제거'); await g.afterThreatRemoved(u); } }],
    async whenDefeated(g) { const c = g.p.deck.concat(g.p.discard).filter(x => tr(g, x, 'ITEM') && !g.d(x).enc && ['upgrade', 'support'].includes(g.d(x).type)); const t = await pick(g, c, '쇼핑 삼매경: 플레이 영역에 들일 [아이템]'); g.shuffle(g.p.deck); if (!t) return; // Item into play
      if (g.d(t).type === 'support') g.put(t, 'support'); else if ((MC.scripts[idOf(g, t)] || {}).attach) { const h = await g.chooseTarget(MC.scripts[idOf(g, t)].attach, `${g.nm(t)}: 붙일 대상`, t, false); if (h) g.put(t, 'attach', h); else g.put(t, 'discard'); } else g.put(t, 'upgrade');
      g.log(`${g.nm(t)}이(가) 플레이 영역에 들어옵니다`, 'good'); } };
  const coatLike = (kind, label) => ({ mod: { [kind === 'thwart' ? 'thw' : 'atk']: (g, s, t) => t === g.idt() && isJub(g) && g.isHero() ? 1 : 0 },
    respond: [{ window: 'cardPlayedDone', timing: 'hero', exhaust: true, label, can: (g, u, ctx) => ctx.card && g.d(ctx.card).type === 'event' && tr(g, ctx.card, kind === 'thwart' ? 'THWART' : 'ATTACK') && types(g.p.lastPaidLetters) > 0,
      async resolve(g, u) { const n = types(g.p.lastPaidLetters); if (kind === 'thwart') { const t = await pick(g, g.schemes().filter(x => g.c(x).threat > 0), '주빌리의 코트: 위협을 제거할 음모'); if (t) await thw(g, t, n, g.idt()); } else { const t = await g.chooseTarget('enemy', `주빌리의 선글라스: 피해 ${n}`, g.idt(), false); if (t) await g.dealDamage(t, n, { byPlayer: true, src: g.idt() }); } } }] });
  S['47004'] = coatLike('thwart', '소진 → 지불한 자원 종류마다 위협 1 제거'); // Jubilee's Coat
  S['47005'] = coatLike('attack', '소진 → 지불한 자원 종류마다 적에게 피해 1'); // Jubilee's Sunglasses
  S['47006'] = { play: { timing: 'hero', async resolve(g, u, ctx) { let n = types(ctx.paid); const left = g.enemies().slice(); const chosen = []; // Blinding Flash
    while (n-- > 0 && left.length) { const t = await pick(g, left, '눈부신 섬광: 기절·혼란시킬 적'); if (!t) break; chosen.push(t); left.splice(left.indexOf(t), 1); }
    for (const t of chosen) { g.giveStatus(t, 'stun', '눈부신 섬광'); g.giveStatus(t, 'conf', '눈부신 섬광'); } } } };
  const firecracker = { play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { const t = ctx.target; await g.playerAttack(g.idt(), t, 4, { src: u }); if (types(ctx.paid) >= 2 && g.c(t).zone && ['villain', 'minion'].includes(g.c(t).zone)) g.giveStatus(t, 'stun', '폭죽'); } } };
  S['47007a'] = firecracker; S['47007b'] = firecracker; S['47007c'] = firecracker;
  const flash = { play: { timing: 'hero', label: 'thwart', target: 'thwartable', async resolve(g, u, ctx) { await thw(g, ctx.target, 3, u); if (types(ctx.paid) >= 2) { const e = await g.chooseTarget('enemy', '빛의 섬광: 혼란시킬 적', g.idt(), false); if (e) g.giveStatus(e, 'conf', '빛의 섬광'); } } } };
  S['47008a'] = flash; S['47008b'] = flash; S['47008c'] = flash;
  S['47009'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { await g.playerAttack(g.idt(), ctx.target, 2, { src: u }); // Grande Finale
    for (let i = 0; i < types(ctx.paid); i++) { const t = await g.chooseTarget('enemy', `그랑 피날레: 피해 2 (${i + 1}/${types(ctx.paid)})`, g.idt(), false); if (!t) break; await g.dealDamage(t, 2, { src: u, byPlayer: true }); } } } };
  S['47011'] = { consRedVs: (g, a, t) => !!g.c(t) && g.c(t).conf }; // Chamber
  S['47012'] = { respond: [{ window: 'allyPowerUsed', label: '★ 최대 3 자원 사용 → 자원별 효과', can: (g, u, ctx) => ctx.ally === u, async resolve(g, u, ctx) { // Husk
    const n = +(await g.ask({ type: 'choice', title: '허스크: 사용할 자원 수', options: [3, 2, 1, 0].map(k => ({ id: String(k), label: `${k}개` })) })) || 0; if (!n) return;
    const paid = await g.pay({ n, req: '' }, u, `허스크: 자원 ${n}`, true); if (paid == null) return; const has = k => paid.includes(k) || paid.includes('G');
    if (has('Y')) ctx.bonus += 1; if (has('B')) g.heal(u, 1); if (has('R')) ctx.after.push(gg => { if (gg.c(u).zone === 'ally') gg.c(u).ex = false; }); } }] };
  S['47013'] = { actions: [{ timing: 'action', exhaust: true, label: '변장: 소진·정체성 소진 → 위협 2 제거', can: g => !g.c(g.idt()).ex, async use(g, u) { g.c(g.idt()).ex = true; await g.removeThreatChoose(2, '변장', g.idt()); } }] }; // Disguise
  S['47014'] = { interrupt: { window: 'afterHeroThwart', timing: 'hero', label: '매복 습격: 적에게 피해 4 (마지막 위협이면 7)', async resolve(g, u, ctx) { const n = ctx.cleared ? 7 : 4; // Waylay
    const t = await g.chooseTarget('attackable', `매복 습격: 피해 ${n}`, g.idt(), false); if (t) await g.playerAttack(g.idt(), t, n, { src: u }); } } };
  S['47015'] = { play: { timing: 'hero', label: 'thwart', async resolve(g, u, ctx) { for (let i = 0; i < types(ctx.paid); i++) { const t = await pick(g, g.schemes().filter(x => g.c(x).threat > 0), `세 걸음 앞서: 위협 2를 제거할 음모 (${i + 1})`); if (!t) break; await thw(g, t, 2, u); } } } }; // Three Steps Ahead
  S['47016'] = { thwVs: (g, s, who, sch) => sch === s && tr(g, who, 'X-MEN') ? 1 : 0, // Generation X
    async whenDefeated(g) { await g.forEachPlayer(async () => { await g.searchToHand(d => d.type === 'event' && d.cls === 'Hero', `제너레이션 X(${g.playerName()}): 정체성 전용 이벤트`, { discard: true }); }); } };
  S['47018'] = { canPlay: g => tr(g, g.idt(), 'X-MEN'), respond: [{ window: 'basicPowerUsed', exhaust: true, label: '싱크 소진 → 이번 기본 능력 +1', can: (g, u, ctx) => ['attack', 'thwart', 'defend'].includes(ctx.kind) && g.c(u).zone === 'ally', resolve(g, u, ctx) { ctx.bonus += 1; } }] }; // Synch
  S['47019'] = { actions: [{ timing: 'action', exhaust: true, label: '충전 1 → 캐릭터의 기본 공격·저지 (+1)', can: (g, u) => (g.c(u).cnt.charge || 0) > 0, async use(g, u) { // Cell Phone
    g.c(u).cnt.charge--; g.cleanupUses(u);
    const pi = await g.choosePlayer('휴대폰: 기본 공격/저지를 할 플레이어');
    await g.withPlayer(pi, async () => {
      const c = g.friendlyChars().filter(x => !g.c(x).ex && (x === g.idt() ? g.isHero() : true)); const who = await pick(g, c, '휴대폰: 기본 공격 또는 저지를 할 캐릭터'); if (!who) return;
      const k = await g.ask({ type: 'choice', title: `${g.nm(who)}: 무엇을 할까요?`, options: [{ id: 'attack', label: '공격 (+1)' }, { id: 'thwart', label: '저지 (+1)' }] });
      g.addPhaseMod(who, 'atk', 1); g.addPhaseMod(who, 'thw', 1);
      try { if (who === g.idt()) { if (k === 'attack') await g.basicAttack(); else await g.basicThwart(); } else { if (k === 'attack') await g.allyAttack(who); else await g.allyThwart(who); } }
      finally { g.addPhaseMod(who, 'atk', -1); g.addPhaseMod(who, 'thw', -1); }
    }); } }] };
  S['47021'] = { play: { timing: 'hero', async resolve(g, u, ctx) { const has = k => (ctx.paid || []).includes(k); // Multitalented
    if (has('R')) { const t = await g.chooseTarget('attackable', '다재다능: 피해 2', g.idt(), false); if (t) await g.playerAttack(g.idt(), t, 2, { src: u }); }
    if (has('B')) await g.removeThreatChoose(2, '다재다능', u); if (has('Y')) g.heal(g.idt(), 2); } } };
  S['47022'] = { play: { timing: 'hero', label: 'attack', async resolve(g, u) { const e = await g.chooseTarget('enemy', '뜻밖의 2인조: 혼란시킬 적', g.idt(), false); if (e) g.giveStatus(e, 'conf', '뜻밖의 2인조'); // Unlikely Duo
    const t = await pick(g, g.targets('attackable', g.idt()).filter(x => g.c(x).conf), '뜻밖의 2인조: 피해 4를 줄 혼란 상태의 적'); if (t) await g.playerAttack(g.idt(), t, 4, { src: u }); } } };
  S['47023'] = { whenRevealed(g, u) { g.put(u, 'pobl'); if (g.isHero() && !g.formLocked()) { g.flip(true); g.log('외출 금지: 일상 모습이 됩니다', 'warn'); } }, // Grounded
    pairToHero: true,
    respond: [{ window: 'cardPlayedDone', label: '외출 금지를 게임에서 제거', can: (g, u, ctx) => g.c(u).zone === 'pobl' && ctx.card && g.d(ctx.card).type === 'event' && g.d(ctx.card).cls === 'Hero', resolve(g, u) { g.removeFromGame(u); } }] };
  // Jubilee nemesis
  const lostChild = async g => { const x = g.e.deck.concat(g.e.discard, g.e.setaside, g.e.aside || []).find(y => idOf(g, y) === '47027'); if (x) await g.reveal(x); };
  S['47024'] = { on: { async afterEnemyAttack(g, u, ctx) { if (ctx.enemy === u && g.p.allies.length) await lostChild(g); } } }; // Nanny
  S['47025'] = { whenRevealed(g, u) { const t = new Set(); for (const x of g.p.hand) for (const r of (g.d(x).res || '')) t.add(r); if (t.size) g.c(u).threat += t.size; g.log(`말썽꾸러기들: 손의 자원 종류 ${t.size}개만큼 위협`); } }; // Naughty Children
  S['47026'] = { revealFirst: true, mod: { hp: (g, s, t) => g.c(s).zone === 'attach' && t === g.c(s).on ? 3 : 0 }, grantTrait: (g, s, t) => g.c(s).zone === 'attach' && t === g.c(s).on ? 'AERIAL' : null, // Battle Suit
    async whenRevealed(g, u, ctx) { const ms = g.e.minions; if (!ms.length) { g.discard(u); ctx.surge++; return; } const lo = Math.min(...ms.map(m => g.hpLeft(m))); const t = await pick(g, ms.filter(m => g.hpLeft(m) === lo), '전투복을 붙일 하수인'); g.attachEnc(u, t); } };
  S['47027'] = { revealFirst: true, async whenRevealed(g, u, ctx) { const a = g.p.allies.filter(x => !g.c(x).att.some(y => idOf(g, y) === '47027')); if (!a.length) { g.discard(u); ctx.surge++; return; } // "Lost" Child
    const top = Math.max(...a.map(x => g.d(x).cost || 0)); const t = await pick(g, a.filter(x => (g.d(x).cost || 0) === top), '"길 잃은" 아이: 하수인이 될 동료'); g.allyToMinion(t, 'REGRESSED'); g.attachEnc(u, t); } };
  // Arcade (modular)
  const traps = g => g.e.sides.filter(x => tr(g, x, 'TRAP!'));
  const trapUntil = async g => { for (let i = 0; i < 200; i++) { const x = g.takeEncounter(); if (!x) return; g.put(x, 'ediscard'); if (g.d(x).type === 'side' && tr(g, x, 'TRAP!')) { await g.reveal(x); return; } } };
  S['47030'] = { cannotTakeDamage: g => traps(g).length > 0, async whenRevealed(g) { await trapUntil(g); } }; // Arcade
  const TRAPFX = {
    '47031': async g => { await g.dealDamage(g.idt(), 2, {}); },
    '47032': async g => { if (g.c(g.idt()).stun) { const c = g.p.allies.concat(g.p.upgrades).filter(x => !g.d(x).permanent); const t = await pick(g, c, '펀하우스: 버릴 동료 또는 업그레이드'); if (t) g.discard(t, `${g.nm(t)} 버림`); } else g.giveStatus(g.idt(), 'stun', '아케이드의 펀하우스'); },
    '47033': async g => { if (g.c(g.idt()).conf) await g.placeThreat(g.e.main, 2, {}); else g.giveStatus(g.idt(), 'conf', '거울의 방'); },
  };
  for (const id of Object.keys(TRAPFX)) S[id] = { async whenDefeated(g) { await TRAPFX[id](g); } };
  S['47034'] = { async whenRevealed(g) { const t = traps(g); for (const x of t) await TRAPFX[idOf(g, x)](g); if (!t.length) await trapUntil(g); } }; // Elaborate Trap
  // Alliance events
  const xf = (g, c) => tr(g, c, 'X-FORCE'), xm = (g, c) => tr(g, c, 'X-MEN');
  S['47028'] = { play: { timing: 'hero', can: g => g.p.allies.some(a => xf(g, a)) && g.p.allies.some(a => xm(g, a)), async resolve(g) { // Mutant Mayhem
    const a = await pick(g, g.p.allies.filter(x => xf(g, x)), '[엑스포스] 동료'); const b = await pick(g, g.p.allies.filter(x => xm(g, x) && x !== a), '[엑스맨] 동료');
    for (const x of [a, b].filter(Boolean)) { for (const at of g.c(x).att.slice()) g.discard(at); g.resetCard(x); g.put(x, 'hand'); }
    for (const x of [a, b].filter(Boolean)) await g.putAllyIntoPlay(x); } } };
  S['47029'] = { interrupt: { window: 'threatWouldBePlaced', timing: 'hero', label: '봉사와 보호: 주 음모 위협 방지', can: (g, u, ctx) => ctx.scheme === g.e.main && g.allFriendlyChars().some(c => !g.c(c).ex && xf(g, c)) && g.allFriendlyChars().some(c => !g.c(c).ex && xm(g, c)), async resolve(g, u, ctx) { // Serve and Protect
    const a = await pick(g, g.allFriendlyChars().filter(c => !g.c(c).ex && xf(g, c)), '소진할 [엑스포스] 캐릭터'); const b = await pick(g, g.allFriendlyChars().filter(c => !g.c(c).ex && xm(g, c) && c !== a), '소진할 [엑스맨] 캐릭터'); if (!a || !b) return;
    g.c(a).ex = true; g.c(b).ex = true; ctx.instead = true; g.giveStatus(a, 'tough', '봉사와 보호'); g.giveStatus(b, 'tough', '봉사와 보호'); } } };
  MC.registerScripts(S);
})();
