/* Nightcrawler (48001-48038): Bamf!, the Crazy Gang modular, and the pack's player cards.
   Ported from cards/pack/ncrawler of the community build. */
(function () {
  'use strict';
  const S = {};
  const idOf = (g, u) => g.c(u).id;
  const tr = (g, u, t) => (g.d(u).tr || []).includes(t) || g.hasTrait(u, t);
  const pick = async (g, cands, title) => !cands.length ? null : cands.length === 1 ? cands[0] : await g.ask({ type: 'target', title, cands, cancelable: false });
  async function thw(g, t, n, src) { const r = await g.removeThreat(t, n, { src }); g.log(`${g.nm(t)} 위협 ${r} 제거`); await g.afterThreatRemoved(t); return r; }
  const BAMF = '48006';
  const bamfOn = (g, e) => g.c(e).att.find(a => idOf(g, a) === BAMF) || null;
  const bamfEnemies = g => g.enemies().filter(e => bamfOn(g, e));
  const isNc = g => ['48001a', '48001b'].includes(idOf(g, g.idt()));
  S['48001a'] = { actions: [{ timing: 'action', label: '순간이동 연속: 자원 1 → 버림 더미의 뱀프!를 손으로 (단계당 1번)', cost: { n: 1, req: '' }, can: g => !g.p.phase.rapidTele && g.p.discard.some(x => idOf(g, x) === BAMF), async use(g) {
    g.p.phase.rapidTele = true; const x = g.p.discard.find(y => idOf(g, y) === BAMF); if (x) g.put(x, 'hand'); } }] };
  S['48001b'] = { actions: [{ timing: 'alter', label: '덱에서 뱀프!를 손으로 (라운드당 1번)', can: g => g.p.usedOnce.kurtSearch !== g.s.round, async use(g) { g.p.usedOnce.kurtSearch = g.s.round; await g.searchToHand(d => d.id === BAMF, '뱀프!'); } }] };
  S['48002'] = { async onEnter(g, u) { const b = g.p.deck.concat(g.p.discard).find(x => idOf(g, x) === BAMF); g.shuffle(g.p.deck); // Daytripper
    if (b) { const t = await g.chooseTarget({ kind: 'enemy', filter: (gg, e) => !bamfOn(gg, e) && !gg.sc(e).noUpgrades }, '데이트리퍼: 뱀프!를 붙일 적', u, false); if (t) { g.put(b, 'attach', t); g.log(`뱀프! → ${g.nm(t)}`); } }
    for (const e of bamfEnemies(g)) await g.dealDamage(e, 1, { src: u, byPlayer: true }); } };
  S['48003'] = { mod: { rec: (g, s, t) => t === g.idt() && !g.isHero() && isNc(g) ? 1 : 0 }, respond: [{ window: 'afterRecover', timing: 'alter', exhaust: true, label: '커트의 예배당: 카드 1장', async resolve(g) { const pi = await g.choosePlayer('커트의 예배당: 카드 1장을 뽑을 플레이어'); await g.withPlayer(pi, () => g.draw(1)); } }] }; // Kurt's Chapel
  S['48004'] = { mod: { atk: (g, s, t) => t === g.idt() && isNc(g) && g.isHero() ? 1 : 0, def: (g, s, t) => t === g.idt() && isNc(g) && g.isHero() ? 1 : 0, retaliate: (g, s, t) => t === g.idt() && isNc(g) && g.isHero() ? 1 : 0 } }; // Kurt's Cutlasses
  S['48005'] = { restrictedPlus: () => 1, resources: [{ gen: 'G', label: '꼬리 (이벤트)', forOnly: (g, s, uid) => !!uid && g.d(uid).type === 'event', can: (g, u) => !g.c(u).ex, use: (g, u) => { g.c(u).ex = true; } }] }; // Prehensile Tail
  S['48006'] = { attach: { kind: 'enemy', filter: (g, t) => !bamfOn(g, t) }, // Bamf!
    respond: [{ window: 'enemyAttackInitiated', timing: 'hero', label: '뱀프!: 버리고 나이트크롤러가 소진 없이 방어', can: (g, u, ctx) => g.c(u).zone === 'attach' && ctx.enemy === g.c(u).on && g.isHero() && !ctx.freeHeroDefense,
      async resolve(g, u, ctx) { g.discard(u, '뱀프!'); ctx.freeHeroDefense = true; ctx.after.push(async gg => { await gg.window('bamfDefended', { enemy: ctx.enemy, bamf: u }); }); } }] };
  S['48007'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { await g.playerAttack(g.idt(), ctx.target, 3, { src: u }); for (const e of bamfEnemies(g)) await g.dealDamage(e, 3, { src: u, byPlayer: true }); } } }; // 'Port and Punch
  S['48008'] = { play: { timing: 'hero', label: 'attack', target: { kind: 'attackable', filter: (g, t) => !!bamfOn(g, t) }, async resolve(g, u, ctx) { const t = ctx.target, b = bamfOn(g, t); if (b) g.discard(b, '뱀프! 버림'); await g.playerAttack(g.idt(), t, 8, { src: u }); if (g.c(t).zone && ['villain', 'minion'].includes(g.c(t).zone)) g.giveStatus(t, 'stun', '순간이동 낙하'); } } }; // Teleport Drop
  S['48009'] = { play: { timing: 'hero', label: 'thwart', target: 'thwartable', async resolve(g, u, ctx) { await thw(g, ctx.target, 3, u); const b = g.p.hand.find(x => idOf(g, x) === BAMF); // Scout Ahead
    const others = g.schemes().filter(x => x !== ctx.target && g.c(x).threat > 0);
    if (b && others.length && (await g.ask({ type: 'choice', title: '정찰: 손의 뱀프!를 버리고 다른 음모에서 위협 3을 제거할까요?', options: [{ id: 'y', label: '예' }, { id: 'n', label: '아니요' }] })) === 'y') { g.put(b, 'discard'); const t = await pick(g, others, '위협 3을 제거할 다른 음모'); if (t) await thw(g, t, 3, u); } } } };
  S['48010'] = { play: { timing: 'action', can: g => g.p.hand.some(x => idOf(g, x) === BAMF) && !g.formLocked(), async resolve(g) { const b = g.p.hand.find(x => idOf(g, x) === BAMF); if (b) g.put(b, 'discard'); await g.changeForm(true); if (g.canReady(g.idt())) g.c(g.idt()).ex = false; g.log("'포트 어웨이: 모습을 바꾸고 준비", 'good'); } } }; // 'Port Away
  S['48011'] = { interrupt: { window: 'bamfDefended', timing: 'hero', label: '뱀프!를 손으로, 공격한 적에게 피해 3', async resolve(g, u, ctx) { if (g.c(ctx.bamf).zone === 'discard') g.put(ctx.bamf, 'hand'); if (g.c(ctx.enemy).zone) await g.dealDamage(ctx.enemy, 3, { src: u, byPlayer: true }); } } }; // Tally Ho!
  // Protection / Basic
  S['48012'] = { actions: [{ timing: 'action', label: '로그: 다른 아군 캐릭터에게 피해 1 → 특성과 공격·저지를 얻음 (라운드당 1번)', can: (g, u) => g.c(u).zone === 'ally' && g.c(u).rogueRound !== g.s.round && g.allFriendlyChars().some(x => x !== u), async use(g, u) { // Rogue (ally)
    const t = await pick(g, g.allFriendlyChars().filter(x => x !== u), '로그: 힘을 빌릴 캐릭터'); if (!t) return; g.c(u).rogueRound = g.s.round; await g.dealDamage(t, 1, {});
    const d = g.d(t); g.addRoundMod(u, 'atk', d.atk || 0); g.addRoundMod(u, 'thw', d.thw || 0); for (const x of (d.tr || [])) g.addRoundMod(u, 'tr:' + x, 1); g.log(`로그가 ${g.nm(t)}의 힘을 흡수합니다 (공격 +${d.atk || 0}, 저지 +${d.thw || 0})`, 'good'); } }] };
  S['48013'] = { respond: [{ window: 'boostTurned', label: '노스스타 피해 1 → 그 강화 카드의 아이콘 취소', can: (g, u, ctx) => ctx.attack && g.c(u).zone === 'ally' && !ctx.cancelIcons, async resolve(g, u, ctx) { ctx.cancelIcons = true; await g.dealDamage(u, 1, {}); } }] }; // Northstar
  S['48014'] = { respond: [{ window: 'afterPlayerDefeatsMinion', exhaust: true, label: '운명의 전환: 카드 2장', can: g => g.s.phase === 'villain', async resolve(g) { await g.draw(2); } }] }; // Change of Fortune
  S['48015'] = { attach: { kind: 'minion', filter: (g, t) => !g.c(t).att.some(a => idOf(g, a) === '48015') }, // Under Control
    respond: [{ window: 'afterHeroDefends', label: '통제 하에: 부착된 하수인에게 피해 4', can: (g, u, ctx) => g.c(u).zone === 'attach' && ctx.enemy === g.c(u).on && ctx.noDamage, async resolve(g, u, ctx) { await g.dealDamage(ctx.enemy, 4, { src: u, byPlayer: true }); } }] };
  S['48016'] = { play: { timing: 'hero', async resolve(g) { for (let i = 0; i < 200; i++) { const x = g.takeEncounter(); if (!x) break; g.put(x, 'ediscard'); if (g.d(x).type === 'minion') { await g.enterMinion(x, {}); break; } } g.heal(g.idt(), 3); g.giveStatus(g.idt(), 'tough', '덤벼봐, 꼬마!'); } } }; // "Come Get Me, Bub!"
  S['48018'] = { interrupt: { window: 'heroDefends', timing: 'hero', label: '리포스트: 방어 +2', resolve(g, u, ctx) { ctx.defBonus += 2; const e = ctx.enemy; ctx.after.push(async (gg, none) => { if (none && gg.c(e).zone) await gg.dealDamage(e, 3, { src: u, byPlayer: true }); }); } } }; // Riposte
  S['48020'] = { respond: [{ window: 'afterHeroDefends', label: '어스토니싱 엑스맨: 위협 1 제거', can: (g, u, ctx) => g.c(u).zone === 'side' && ctx.noDamage && tr(g, g.idt(), 'X-MEN') && g.c(u).threat > 0, async resolve(g, u) { g.c(u).threat--; await g.afterThreatRemoved(u); } }], // Astonishing X-Men
    whenDefeated(g) { for (const e of g.enemies()) { g.giveStatus(e, 'stun', '어스토니싱 엑스맨'); g.giveStatus(e, 'conf', '어스토니싱 엑스맨'); } } };
  S['48021'] = { baseFn: (g, u, key) => (key === 'atk' || key === 'thw') ? g.c(u).under.reduce((t, x) => t + (g.d(x).boost || 0) + (g.d(x).boostStar ? 1 : 0), 0) : null, // Gambit (ally)
    async onEnter(g, u) { const top = g.e.deck.slice(0, 3); if (!top.length) return; const t = await pick(g, top, '갬빗: 아래에 끼울 조우 카드 (강화 아이콘만 사용)'); if (t) { g.put(t, 'under', u); g.c(t).fd = true; } } };
  S['48026'] = { async whenRevealed(g, u) { await g.heroObligation(u, '신앙의 위기', '손의 [공격]·[방어] 이벤트를 모두 버리고 이 카드 버림', async () => { for (const x of g.p.hand.slice()) if (g.d(x).type === 'event' && (tr(g, x, 'ATTACK') || tr(g, x, 'DEFENSE'))) g.put(x, 'discard'); if (g.c(u).zone === 'limbo') g.discard(u); }); } }; // Crisis of Faith
  // Azazel (nemesis)
  const findAzazel = g => g.e.deck.concat(g.e.discard, g.e.setaside).find(x => idOf(g, x) === '48027') || null;
  const azazel = g => g.e.minions.find(m => idOf(g, m) === '48027') || null;
  S['48027'] = { noUpgrades: true, boostEffect(g, u, ctx) { (ctx.post || ctx.after).push(async gg => { if (['boost', 'ediscard'].includes(gg.c(u).zone)) { gg.put(u, 'facedown'); gg.log('★ 아자젤이 뒷면 조우 카드로 옵니다', 'warn'); } }); } };
  S['48028'] = { whenDefeated(g) { const x = findAzazel(g); if (x) { g.put(x, 'facedown'); g.shuffle(g.e.deck); } } };
  S['48029'] = { attachTo: g => azazel(g) || g.e.villain, attackProps: (g, s, ctx) => g.c(s).zone === 'attach' && ctx.enemy === g.c(s).on ? { piercing: true } : null, // Azazel's Sword
    on: { async afterEnemyAttack(g, u, ctx) { if (g.c(u).zone !== 'attach' || ctx.enemy !== g.c(u).on || !g.isHero() || !g.p.hand.length) return;
      if ((await g.ask({ type: 'choice', title: '아자젤의 검: 무작위 손 카드 1장을 버리고 이 카드를 버릴까요?', options: [{ id: 'y', label: '예' }, { id: 'n', label: '아니요' }] })) === 'y') { await g.discardRandomHand(1); g.discard(u, '아자젤의 검 버림'); } } } };
  S['48030'] = { async whenRevealed(g) { const a = azazel(g) || findAzazel(g); if (!a) return; if (g.c(a).zone !== 'minion') { g.shuffle(g.e.deck); await g.reveal(a); } if (!g.isHero() && g.c(a).zone === 'minion') await g.enemyScheme(a, {}); } }; // Brimstone Strike
  // Alliance
  const xf = (g, c) => tr(g, c, 'X-FORCE'), xm = (g, c) => tr(g, c, 'X-MEN');
  const pairExhaust = async g => { const a = await pick(g, g.allFriendlyChars().filter(c => !g.c(c).ex && xf(g, c)), '소진할 [엑스포스] 캐릭터'); const b = await pick(g, g.allFriendlyChars().filter(c => !g.c(c).ex && xm(g, c) && c !== a), '소진할 [엑스맨] 캐릭터'); if (!a || !b) return null; g.c(a).ex = true; g.c(b).ex = true; return [a, b]; };
  const pairOk = g => { const f = g.allFriendlyChars().filter(c => !g.c(c).ex && xf(g, c)); const m = g.allFriendlyChars().filter(c => !g.c(c).ex && xm(g, c)); return f.length > 0 && m.length > 0 && (f.length + m.length > 1 || f[0] !== m[0]); };
  MC.alliance = { pairExhaust, pairOk };
  S['48031'] = { play: { timing: 'hero', can: g => pairOk(g) && g.e.minions.some(m => !tr(g, m, 'ELITE')), async resolve(g, u) { if (!(await pairExhaust(g))) return; const t = await pick(g, g.e.minions.filter(m => !tr(g, m, 'ELITE')), '힘을 합쳐: 물리칠 하수인'); if (t) await g.defeat(t, { byPlayer: true, src: u }); } } }; // Combine Forces
  S['48032'] = { play: { timing: 'hero', can: pairOk, async resolve(g, u) { const p = await pairExhaust(g); if (!p) return; const x = g.stat(p[0], 'thw') + g.stat(p[1], 'thw'); // Gunboat Diplomacy
    let left = x; while (left > 0 && g.schemes().some(s => g.c(s).threat > 0)) { const t = await pick(g, g.schemes().filter(s => g.c(s).threat > 0), `포함 외교: 위협 제거 (남은 ${left})`); const r = await thw(g, t, 1, u); if (!r) break; left--; }
    left = x; while (left > 0 && g.enemies().length) { const t = await g.chooseTarget('enemy', `포함 외교: 피해 1 (남은 ${left})`, g.idt(), false); if (!t) break; await g.dealDamage(t, 1, { src: u, byPlayer: true }); left--; } } } };
  // Crazy Gang (modular)
  const gang = g => g.e.sides.find(x => idOf(g, x) === '48033') || null;
  S['48033'] = { on: { afterEnemyScheme(g, u, ctx) { const m = ctx.enemy; if (g.c(u).zone === 'side' && g.e.minions.includes(m) && !tr(g, m, 'ELITE')) { for (const a of g.c(m).att.slice()) g.discard(a); g.resetCard(m); g.put(m, 'facedown'); g.log(`크레이지 갱: ${g.nm(m)}이(가) 뒷면 조우 카드가 됩니다`, 'warn'); } } } };
  S['48034'] = { async whenRevealed(g) { if (gang(g)) { const x = g.takeEncounter(); if (x) g.put(x, 'facedown'); return; } const s = g.e.deck.concat(g.e.discard).find(x => idOf(g, x) === '48033'); if (s) { g.shuffle(g.e.deck); await g.reveal(s); } } }; // Queen of Hearts
  S['48035'] = { async whenRevealed(g) { if (g.c(g.idt()).conf) { const t = await pick(g, g.p.supports.filter(x => !g.d(x).permanent), '제스터: 버릴 지원'); if (t) g.discard(t, `${g.nm(t)} 버림`); } else g.giveStatus(g.idt(), 'conf', '제스터'); } }; // Jester
  S['48036'] = { async whenRevealed(g, u) { const c = g.friendlyChars(); const lo = Math.min(...c.map(x => g.hpLeft(x))); const t = await pick(g, c.filter(x => g.hpLeft(x) === lo), '집행자: 공격받을 캐릭터'); // Executioner
    const r = await g.enemyAttack(u, t && t !== g.idt() ? { forceTarget: t } : {}); if (t && t !== g.idt() && g.c(t).zone === 'discard') { g.removeFromGame(t); g.log(`${g.nm(t)}을(를) 게임에서 제거`, 'warn'); } } };
  S['48037'] = { async whenRevealed(g) { if (g.c(g.idt()).stun) { const t = await pick(g, g.p.upgrades.filter(x => !g.d(x).permanent), '트위들도프: 버릴 업그레이드'); if (t) g.discard(t, `${g.nm(t)} 버림`); } else g.giveStatus(g.idt(), 'stun', '트위들도프'); } }; // Tweedledope
  S['48038'] = { async whenRevealed(g) { const ms = g.e.minions.slice(); for (const m of ms) if (g.c(m).zone === 'minion') await g.withPlayer(g.c(m).eng ?? g.s.ctx, () => g.activate(m, {})); // "Off with His Head!"
    if (!ms.length) for (let i = 0; i < 200; i++) { const x = g.takeEncounter(); if (!x) break; g.put(x, 'ediscard'); if (g.d(x).type === 'minion') { await g.reveal(x); break; } } } };
  MC.registerScripts(S);
})();
