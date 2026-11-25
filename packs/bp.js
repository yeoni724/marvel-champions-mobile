/* Black Panther (Shuri) (51001-51042): Black Panther upgrade "Special" abilities, Dora Milaje, Extreme Risk modular and the pack's player cards.
   Ported from cards/pack/bp of the community build. */
(function () {
  'use strict';
  const S = {};
  const idOf = (g, u) => g.c(u).id;
  const tr = (g, u, t) => (g.d(u).tr || []).includes(t) || g.hasTrait(u, t);
  const pick = async (g, cands, title) => !cands.length ? null : cands.length === 1 ? cands[0] : await g.ask({ type: 'target', title, cands, cancelable: false });
  const yes = async (g, title) => (await g.ask({ type: 'choice', title, options: [{ id: 'y', label: '예' }, { id: 'n', label: '아니요' }] })) === 'y';
  async function thw(g, t, n, src) { const r = await g.removeThreat(t, n, { src }); g.log(`${g.nm(t)} 위협 ${r} 제거`); await g.afterThreatRemoved(t); return r; }
  // ---- Black Panther upgrades: Special abilities
  const bpUps = g => g.controlled().filter(x => g.d(x).type === 'upgrade' && tr(g, x, 'BLACK PANTHER') && !!(MC.scripts[idOf(g, x)] || {}).special);
  async function special(g, u) { const f = (MC.scripts[idOf(g, u)] || {}).special; if (!f) return; g.log(`특수 능력: ${g.nm(u)}`, 'good'); await f(g, u); }
  async function specialOne(g, title) { const c = bpUps(g); if (!c.length) return; const u = await pick(g, c, title || '특수 능력을 처리할 [블랙 팬서] 업그레이드'); if (u) await special(g, u); }
  MC.bp = { special, specialOne, bpUps };
  S['51010'] = { special: async (g, u) => { await g.removeThreatChoose(1, '키모요 구슬', g.idt()); if (await yes(g, '키모요 구슬을 버리고 적 하나를 혼란시킬까요?')) { g.discard(u); const e = await g.chooseTarget('enemy', '혼란시킬 적', g.idt(), false); if (e) g.giveStatus(e, 'conf', '키모요 구슬'); } } }; // Kimoyo Beads
  S['51011'] = { special: async (g, u) => { const t = await g.chooseTarget('attackable', '팬서 발톱: 피해 2 (버리면 +3·관통)', g.idt(), false); if (!t) return; const big = await yes(g, '팬서 발톱을 버리고 피해 3을 더하고 관통을 얻을까요?'); if (big) g.discard(u); await g.playerAttack(g.idt(), t, big ? 5 : 2, Object.assign({ src: u }, big ? { piercing: true } : {})); } }; // Panther Claws
  S['51012'] = { special: async (g, u) => { const pi = await g.choosePlayer('거미의 독니: 대상 플레이어'); const es = [g.e.villain].concat(g.engagedMinions(pi)).filter(Boolean); for (const e of es) await g.dealDamage(e, 1, { src: u, byPlayer: true }); // Spider Bites
    if (await yes(g, '거미 침을 버리고 그 적들을 모두 기절시킬까요?')) { g.discard(u); for (const e of es) if (g.c(e).zone) g.giveStatus(e, 'stun', '거미 침'); } } };
  S['51013'] = { special: async (g, u) => { if (g.c(g.idt()).dmg > 0) { const t = await g.chooseTarget('attackable', '비브라늄 슈트: 피해 1을 옮길 적', g.idt(), false); if (t) { g.c(g.idt()).dmg--; await g.dealDamage(t, 1, { src: u, byPlayer: true }); } } // Vibranium Suit
    if (await yes(g, '비브라늄 슈트를 버리고 히어로에게 강인함을 줄까요?')) { g.discard(u); g.giveStatus(g.idt(), 'tough', '비브라늄 슈트'); } } };
  // ---- Black Panther / Shuri
  S['51001a'] = { respond: [{ window: 'afterBasicPower', label: '★ [블랙 팬서] 업그레이드 1장의 특수 능력', can: g => bpUps(g).length > 0, async resolve(g) { await specialOne(g); } }] };
  S['51001b'] = { actions: [{ timing: 'alter', label: '발명가: 슈리 소진 → [블랙 팬서]/[테크] 업그레이드를 찾아 비용 -2로 플레이 (라운드당 1번)', can: g => !g.c(g.idt()).ex && g.p.usedOnce.inventor !== g.s.round, async use(g) {
    g.c(g.idt()).ex = true; g.p.usedOnce.inventor = g.s.round;
    const c = g.p.deck.filter(x => g.d(x).type === 'upgrade' && (tr(g, x, 'BLACK PANTHER') || tr(g, x, 'TECH'))); const t = c.length ? (await g.pickCards(c, '발명가: 플레이할 업그레이드', 1, 1, '선택'))[0] : null; g.shuffle(g.p.deck); if (!t) { g.log('해당하는 업그레이드가 없습니다'); return; }
    g.put(t, 'hand'); g.p.costRed = (g.p.costRed || 0) + 2; try { if (g.canPlay(t)) await g.playCard(t); else g.log(`${g.nm(t)}을(를) 지금 낼 수 없어 손에 둡니다`); } finally { g.p.costRed = 0; } } }] };
  S['51002'] = { respond: [{ window: 'afterAllyAttack', timing: 'hero', label: '★ 티찰라: [블랙 팬서] 업그레이드 특수 능력', can: (g, u, ctx) => ctx.ally === u && bpUps(g).length > 0, async resolve(g) { await specialOne(g); } }, { window: 'afterAllyThwart', timing: 'hero', label: '★ 티찰라: [블랙 팬서] 업그레이드 특수 능력', can: (g, u, ctx) => ctx.ally === u && bpUps(g).length > 0, async resolve(g) { await specialOne(g); } }] }; // T'Challa
  S['51003'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { await g.playerAttack(g.idt(), ctx.target, 4, { src: u }); await specialOne(g); } } }; // Clawed Strike
  S['51004'] = { play: { timing: 'hero', label: 'thwart', target: 'thwartable', async resolve(g, u, ctx) { await thw(g, ctx.target, 3, u); await specialOne(g); } } }; // On the Prowl
  S['51005'] = { play: { timing: 'hero', async resolve(g) { const done = []; while (true) { const c = bpUps(g).filter(x => !done.includes(x)); if (!c.length) break; const u = await pick(g, c, '와칸다 포에버!: 다음 특수 능력'); done.push(u); await special(g, u); } } } }; // Wakanda Forever!
  const wakSupAl = g => g.p.allies.concat(g.p.supports).filter(x => tr(g, x, 'WAKANDA') && !g.c(x).ex);
  S['51007'] = { actions: [{ timing: 'alter', label: '코끼리의 코: 소진(+[와칸다] 2장까지) → 소진한 장수만큼 카드', can: (g, u) => !g.c(u).ex, async use(g, u) { g.c(u).ex = true; let n = 1; // The Elephant's Trunk
    const c = wakSupAl(g).filter(x => x !== u); const sel = c.length ? await g.pickCards(c, '함께 소진할 [와칸다] 동료/지원 (최대 2)', 0, Math.min(2, c.length), '소진') : []; for (const x of sel) { g.c(x).ex = true; n++; } await g.draw(n); } }] };
  S['51008'] = { actions: [{ timing: 'alter', exhaust: true, label: '라몬다 왕비: 회복력만큼 회복', can: g => tr(g, g.idt(), 'WAKANDA') && g.c(g.idt()).dmg > 0, use(g) { g.heal(g.idt(), g.stat(g.idt(), 'rec')); } }] }; // Queen Ramonda
  S['51009'] = { actions: [{ timing: 'action', exhaust: true, label: '아자-아다나: 버림 더미의 정체성 전용 카드 1장을 덱에 섞기', can: g => g.p.discard.some(x => g.d(x).cls === 'Hero'), async use(g) { const t = await pick(g, g.p.discard.filter(x => g.d(x).cls === 'Hero'), '덱에 섞을 카드'); if (t) { g.put(t, 'deck'); g.shuffle(g.p.deck); } } }] }; // Aja-Adanna
  S['51031'] = { whenRevealed(g, u) { g.put(u, 'pobl'); g.c(u).cnt.doubt = 4; g.log('티찰라의 그림자: 의심 카운터 4개, 카드 비용 +1', 'warn'); }, // T'Challa's Shadow
    costMod: (g, s) => g.c(s).zone === 'pobl' ? -1 : 0,
    on: { basicHeroPower(g, u) { if (g.c(u).zone !== 'pobl') return; g.c(u).cnt.doubt = Math.max(0, (g.c(u).cnt.doubt || 0) - 1); g.log(`티찰라의 그림자: 의심 카운터 ${g.c(u).cnt.doubt}`); if (!g.c(u).cnt.doubt) { g.put(u, 'victory'); g.log('티찰라의 그림자를 떨쳐냈습니다 (승리 표시)', 'good'); } } } };
  // nemesis: Klaw, M.U.S.I.C.
  S['51032'] = { attackBoostExtra: 1 };
  const findX = (g, id) => g.e.deck.concat(g.e.discard, g.e.setaside).find(x => idOf(g, x) === id) || null;
  S['51033'] = { async whenRevealed(g) { const m = findX(g, '51034'); if (m) await g.enterMinion(m, {}, true); }, whenDefeated(g) { const m = g.e.minions.find(x => idOf(g, x) === '51034'); if (m) g.discard(m, 'M.U.S.I.C. 버림'); } };
  S['51034'] = { async whenRevealed(g) { if (!g.e.sides.some(x => idOf(g, x) === '51033')) { const s = findX(g, '51033'); if (s) await g.enterSide(s, {}); } },
    async whenDefeated(g) { const s = g.e.sides.find(x => idOf(g, x) === '51033'); if (s && g.c(s).threat) { const n = g.c(s).threat; g.c(s).threat = 0; await g.placeThreat(g.e.main, n, {}); } } };
  // ---- Justice / Basic / Leadership / Aggression
  S['51014'] = { async onEnter(g) { const pi = await g.choosePlayer('매니폴드: 플레이어 부가 음모를 찾을 플레이어'); await g.withPlayer(pi, () => g.searchToHand(d => d.type === 'pside', '매니폴드: 플레이어 부가 음모', { discard: true })); } }; // Manifold
  S['51015'] = { play: { timing: 'hero', label: 'thwart', async resolve(g, u) { const n = +(await g.ask({ type: 'choice', title: '잠입: 조우 덱 위에서 버릴 장수', options: [5, 4, 3, 2, 1].map(k => ({ id: String(k), label: `${k}장` })) })) || 1; // Infiltration
    const out = []; for (let i = 0; i < n; i++) { const x = g.takeEncounter(); if (!x) break; g.put(x, 'ediscard'); out.push(x); }
    if (out.length) await g.removeThreatChoose(out.length, '잠입', u); const ms = out.filter(x => g.d(x).type === 'minion' && g.c(x).zone === 'ediscard'); const m = await pick(g, ms, '잠입: 교전할 하수인'); if (m) await g.enterMinion(m, {}); } } };
  S['51016'] = { async whenDefeated(g) { const top = g.e.deck.slice(0, 5); if (!top.length) return; const own = new Set(g.scenData().encounter || []); // Going Undercover
    const c = top.filter(x => !own.has(idOf(g, x)) && !g.d(x).nemesis); const t = c.length ? await g.ask({ type: 'target', title: '위장 잠입: 승리 표시로 보낼 카드 (취소 가능)', cands: c, cancelable: true }) : null; if (t) { g.put(t, 'victory'); g.log(`${g.nm(t)}을(를) 승리 표시로`, 'good'); } } };
  S['51017'] = { async onThreatRemoved(g, s, n) { const ms = g.e.minions.filter(m => !tr(g, m, 'ELITE')); if (!ms.length) return; const m = await pick(g, ms, '공감의 표시: 위협을 옮길 하수인'); g.c(m).threat = (g.c(m).threat || 0) + n; g.log(`${g.nm(m)}에 위협 ${n}`); // Show of Empathy
    if (g.c(m).threat >= g.hpLeft(m)) { g.c(s).threat = 0; g.put(s, 'victory'); g.c(m).threat = 0; g.minionToAlly(m, 1); const r = g.newCard('51036', 'attach'); g.put(r, 'attach', m); g.log(`${g.nm(m)}이(가) 구원받아 동료가 됩니다`, 'good'); } } };
  S['51036'] = {}; // Redemption (handled by Show of Empathy)
  S['51018'] = { respond: [{ window: 'minionLeftPlay', label: '래프트: 하수인을 아래에 넣고 그 SCH만큼 위협 제거', can: (g, u, ctx) => g.c(u).zone === 'support' && ctx.minion && g.c(ctx.minion).zone === 'ediscard', async resolve(g, u, ctx) { const m = ctx.minion; g.put(m, 'under', u); g.c(m).fd = false; // The Raft
    const n = g.d(m).sch || 0; if (n) await g.removeThreatChoose(n, '래프트', u); const ms = g.c(u).under.filter(x => g.d(x).type === 'minion'); if (ms.length >= 4) { const x = ms[Math.floor(g.rand() * ms.length)]; const pi = await g.choosePlayer('래프트: 뒷면 조우 카드를 받을 플레이어'); g.put(x, 'facedown', pi); g.log(`래프트: ${g.nm(x)}을(를) 뒷면 조우 카드로 받습니다`, 'warn'); } } }] };
  S['51019'] = { respond: [{ window: 'enemyWouldActivate', label: '투명 장비 버림 → 공격 대신 음모', can: (g, u, ctx) => ctx.kind === 'attack', async resolve(g, u, ctx) { g.discard(u, '투명 장비'); ctx.cancel = true; await g.enemyScheme(ctx.enemy, {}); } }] }; // Invisibility Gear
  S['51021'] = { respond: [{ window: 'minionSchemed', label: '함정 수사 버림 → 그 하수인 버림', can: (g, u, ctx) => g.c(ctx.enemy).zone === 'minion' && !tr(g, ctx.enemy, 'ELITE'), resolve(g, u, ctx) { g.discard(u, '함정 수사'); for (const a of g.c(ctx.enemy).att.slice()) g.discard(a); g.discard(ctx.enemy, `${g.nm(ctx.enemy)} 버림`); } }] }; // Sting Operation
  const dora = g => g.p.allies.filter(a => tr(g, a, 'DORA MILAJE') && !!(MC.scripts[idOf(g, a)] || {}).special);
  const doraAfter = id => { const r = (g, u) => ({ label: '★ 다른 [도라 밀라제] 동료의 특수 능력', can: (gg, uu, ctx) => ctx.ally === uu && dora(gg).some(x => x !== uu), async resolve(gg, uu) { const t = await pick(gg, dora(gg).filter(x => x !== uu), '특수 능력을 처리할 [도라 밀라제] 동료'); if (t) await special(gg, t); } });
    return [Object.assign({ window: 'afterAllyAttack' }, r()), Object.assign({ window: 'afterAllyThwart' }, r())]; };
  S['51022'] = { respond: doraAfter(), special: async g => { await g.removeThreatChoose(1, '아네카', g.idt()); } }; // Aneka
  S['51023'] = { respond: doraAfter(), special: async g => { const t = await g.chooseTarget('enemy', '아요: 피해 1', g.idt(), false); if (t) await g.dealDamage(t, 1, { byPlayer: true }); } }; // Ayo
  S['51024'] = { respond: doraAfter(), special: async g => { const t = await pick(g, g.friendlyChars().filter(x => tr(g, x, 'WAKANDA') && (x !== g.idt() || g.isHero())), '오코예: 저지·공격 +1을 받을 [와칸다] 캐릭터'); if (t) { g.addPhaseMod(t, 'thw', 1); g.addPhaseMod(t, 'atk', 1); } } }; // Okoye
  S['51025'] = { play: { timing: 'hero', async resolve(g) { const c = g.p.deck.concat(g.p.discard).filter(x => g.d(x).type === 'upgrade' && tr(g, x, 'BLACK PANTHER')); const t = await pick(g, c, '팬서의 심장: 플레이 영역에 들일 업그레이드'); g.shuffle(g.p.deck); if (t) g.put(t, 'upgrade'); // Heart of the Panther
    const done = []; for (let i = 0; i < 4; i++) { const cc = bpUps(g).filter(x => !done.includes(x)); if (!cc.length) break; const u = await pick(g, cc, `팬서의 심장: 특수 능력 (${i + 1}/4)`); done.push(u); await special(g, u); } } } };
  S['51026'] = { async whenDefeated(g) { await g.forEachPlayer(async () => { const c = g.p.deck.concat(g.p.discard).filter(x => g.d(x).type === 'support' && (g.d(x).cost || 0) <= 3); // Build Support
    const t = c.length ? await g.ask({ type: 'target', title: `지지 확보(${g.playerName()}): 플레이 영역에 들일 지원 (취소 가능)`, cands: c, cancelable: true }) : null; g.shuffle(g.p.deck); if (t) { g.put(t, 'support'); g.log(`${g.nm(t)}이(가) 플레이 영역에 들어옵니다`, 'good'); } }); } };
  S['51030'] = { selfCostMod: g => tr(g, g.idt(), 'WAKANDA') ? 3 : 0, actions: [{ timing: 'action', exhaust: true, label: '도라 밀라제: 동료 1명의 특수 능력 + 회복 1', can: g => dora(g).length > 0, async use(g) { const t = await pick(g, dora(g), '특수 능력을 처리할 동료'); if (t) { await special(g, t); g.heal(t, 1); } } }] }; // Dora Milaje (support)
  S['51037'] = { on: { async allyBasicPower(g, u, ctx) { if (ctx.ally === u) { g.log('★ 화이트 울프: 주 음모에 위협 1', 'warn'); await g.placeThreat(g.e.main, 1, {}); } } } }; // White Wolf
  S['51038'] = { respond: [{ window: 'minionEntered', label: '표적 관측: 카운터 1 → 그 하수인은 이번 단계에 활성화하지 못함', can: (g, u) => (g.c(u).cnt.target || 0) > 0, resolve(g, u, ctx) { g.c(u).cnt.target--; g.cleanupUses(u); g.c(ctx.minion).noActUntil = g.s.round + ':' + g.s.phase; } }] }; // Target Spotter
  // Extreme Risk (modular)
  const joystick = g => g.e.minions.find(m => idOf(g, m) === '51039') || null;
  S['51039'] = { async onActivationStart(g, u) { const o = await g.ask({ type: 'choice', title: '★ 조이스틱', options: [{ id: 'b', label: '강화 카드 1장 추가, 당신은 카드 1장' }, { id: 't', label: '조이스틱에게 강인함' }] }); if (o === 'b') { g.c(u).fdBoost = (g.c(u).fdBoost || 0) + 1; await g.draw(1); } else g.giveStatus(u, 'tough', '조이스틱'); } }; // Joystick
  S['51040'] = { attachTo: g => joystick(g) || g.e.villain }; // Energy Truncheon
  S['51041'] = { boostAllEnemies: true, mod: { hs: (g, s, t) => g.c(s).zone === 'side' && g.identityPlayer(t) >= 0 ? 1 : 0 } }; // Playing for Keeps
  S['51042'] = { async whenRevealed(g, u, ctx) { let j = joystick(g); if (j) g.c(j).eng = g.s.ctx; else { const x = findX(g, '51039'); if (x) { g.shuffle(g.e.deck); await g.enterMinion(x, {}); j = joystick(g); } } if (j && g.c(j).zone === 'minion') await g.activate(j, {}); else ctx.surge++; }, // Extreme Risk
    async boostEffect(g, u, ctx) { if (ctx.enemy && await yes(g, '★ 익스트림 리스크: 강화 카드 1장을 더 주고 카드 1장을 뽑을까요?')) { ctx.extraBoost = (ctx.extraBoost || 0) + 1; await g.draw(1); } } };
  S['51035'] = { // M.U.S.I.C. (Shuri's nemesis set)
    async whenRevealed(g) { for (const x of g.friendlyChars().slice()) { if (g.c(x).stun) await g.dealDamage(x, 1, {}); else g.giveStatus(x, 'stun', 'M.U.S.I.C.'); } },
    async boostEffect(g) { const i = g.idt(); if (g.c(i).stun) await g.dealDamage(i, 1, {}); else g.giveStatus(i, 'stun', '★ M.U.S.I.C.'); }
  };
  MC.registerScripts(S);
})();
