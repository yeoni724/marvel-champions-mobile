/* Magneto (49001-49042): Magnetic Pull, the Hellfire modular, New Recruits and the pack's player cards.
   Ported from cards/pack/magneto of the community build. */
(function () {
  'use strict';
  const S = {};
  const idOf = (g, u) => g.c(u).id;
  const tr = (g, u, t) => (g.d(u).tr || []).includes(t) || g.hasTrait(u, t);
  const pick = async (g, cands, title) => !cands.length ? null : cands.length === 1 ? cands[0] : await g.ask({ type: 'target', title, cands, cancelable: false });
  async function thw(g, t, n, src) { const r = await g.removeThreat(t, n, { src }); g.log(`${g.nm(t)} 위협 ${r} 제거`); await g.afterThreatRemoved(t); return r; }
  const isMag = g => ['49001a', '49001b'].includes(idOf(g, g.idt()));
  const magnetic = (g, x) => tr(g, x, 'MAGNETIC');
  S['49001a'] = { actions: [{ timing: 'action', label: '자력 끌기: [자성] 카드가 나올 때까지 덱 위를 버리고 손으로 (라운드당 1번)', can: g => g.p.usedOnce.magPull !== g.s.round, async use(g) { // Magnetic Pull
    g.p.usedOnce.magPull = g.s.round; const out = []; let found = null;
    for (let i = 0; i < 60; i++) { if (!g.p.deck.length) await g.reshuffleDeck(); const x = g.p.deck[0]; if (!x || out.includes(x)) break; g.put(x, 'discard'); out.push(x); if (magnetic(g, x)) { found = x; break; } }
    if (found) { g.put(found, 'hand'); g.log(`자력 끌기: ${g.nm(found)}을(를) 손으로 (버린 카드 ${out.length}장)`, 'good'); }
    const icons = out.reduce((t, x) => t + (g.d(x).res || ''), ''); await g.window('magneticPull', { discarded: out, icons });
    for (const o of (g.p.obl || []).filter(x => idOf(g, x) === '49027')) { g.log(`★ 오랜 원한: 피해 ${out.length}`, 'warn'); await g.dealDamage(g.idt(), out.length, {}); } } }] };
  S['49001b'] = { respond: [{ window: 'afterChangeForm', label: '생존자: 버림 더미 위 3장을 덱에 섞기', can: (g, u, ctx) => ctx.form === 'alter' && g.p.discard.length > 0, resolve(g) { const c = g.p.discard.slice(-3); for (const x of c) g.put(x, 'deck'); g.shuffle(g.p.deck); g.log(`생존자: ${c.length}장을 덱에 섞습니다`); } }] };
  S['49002'] = { actions: [{ timing: 'alter', exhaust: true, label: '아스테로이드 M: 가장 위 [자성] 카드를 덱에 섞고 회복 1', can: g => g.p.discard.some(x => magnetic(g, x)), use(g) { const c = g.p.discard.filter(x => magnetic(g, x)); const x = c[c.length - 1]; g.put(x, 'deck'); g.shuffle(g.p.deck); g.heal(g.idt(), 1); } }] }; // Asteroid M
  S['49003'] = { steadyFor: (g, s, t) => t === g.idt() && isMag(g) && g.isHero(), resources: [{ gen: 'G', label: '매그니토의 투구 ([자성] 카드)', forOnly: (g, s, uid) => !!uid && magnetic(g, uid), can: (g, u) => !g.c(u).ex, use: (g, u) => { g.c(u).ex = true; } }] }; // Magneto's Helmet
  S['49004'] = { respond: [{ window: 'magneticPull', label: '매그니토의 갑옷: 버린 자원에 따라 이번 라운드 능력치 +1', can: (g, u, ctx) => /[YBRG]/.test(ctx.icons), resolve(g, u, ctx) { const has = k => ctx.icons.includes(k) || ctx.icons.includes('G'); // Magneto's Armor
    if (has('B')) g.addRoundMod(g.idt(), 'thw', 1); if (has('R')) g.addRoundMod(g.idt(), 'atk', 1); if (has('Y')) g.addRoundMod(g.idt(), 'def', 1); } }] };
  S['49005'] = { grantTrait: (g, s, t) => t === g.idt() && g.isHero() ? 'AERIAL' : null, respond: [{ window: 'magneticPull', exhaust: true, label: '매그니토의 망토: 매그니토 준비', can: g => g.c(g.idt()).ex && g.canReady(g.idt()), resolve(g) { g.c(g.idt()).ex = false; } }] }; // Magneto's Cape
  S['49006'] = { mod: { retaliate: (g, s, t) => t === g.idt() && isMag(g) && g.isHero() ? 1 : 0 }, async absorbIdentityDamage(g, u, n) { const c = g.c(u); c.cnt.damage = (c.cnt.damage || 0) + n; g.log(`자기장 방어막이 피해 ${n}을 받습니다 (총 ${c.cnt.damage})`, 'good'); if (c.cnt.damage >= 6) g.discard(u, '자기장 방어막이 사라졌습니다'); return 0; } }; // Magnetic Bubble
  S['49007'] = { heroOnly: true, attach: { kind: 'minion', filter: (g, t) => !tr(g, t, 'ELITE') }, noActivate: true, blankHost: true }; // Wrapped in Metal
  S['49008'] = { play: { timing: 'hero', label: 'thwart', target: 'thwartable', async resolve(g, u, ctx) { const r = await thw(g, ctx.target, 3, u); const cleared = r > 0 && (!g.c(ctx.target).zone || g.c(ctx.target).zone !== 'side' && g.c(ctx.target).zone !== 'main' || g.c(ctx.target).threat === 0); // Electromagnetic Blast
    if (!cleared) return; const heroAbil = a => { const X = MC.scripts[idOf(g, a)] || {}; return (X.actions || []).some(x => x.timing === 'hero') || (X.respond || []).some(x => x.timing === 'hero'); };
    const c = []; for (const e of g.enemies().concat(g.e.sides, [g.e.main])) for (const a of g.c(e).att) if (g.d(a).enc && heroAbil(a)) c.push(a);
    const t = c.length ? await g.ask({ type: 'target', title: '전자기 폭발: 버릴 부착 카드 (취소하면 버리지 않음)', cands: c, cancelable: true }) : null; if (t) g.discard(t, `${g.nm(t)} 버림`); } } };
  S['49009'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { const t = ctx.target; await g.playerAttack(g.idt(), t, 7, { src: u }); if (!g.c(t).zone || !['villain', 'minion'].includes(g.c(t).zone)) g.giveStatus(g.idt(), 'tough', '금속 파편'); } } }; // Metal Shards
  const wrapped = g => g.e.minions.filter(m => g.c(m).att.some(a => idOf(g, a) === '49007'));
  S['49010'] = { play: { timing: 'hero', can: g => wrapped(g).length > 0, async resolve(g, u) { const m = await pick(g, wrapped(g), '자력 미사일: 버릴 하수인'); if (!m) return; for (const a of g.c(m).att.slice()) g.discard(a); g.discard(m, `${g.nm(m)} 버림`); // Magnetic Missile
    const t = await g.chooseTarget('enemy', '자력 미사일: 피해 5와 기절', g.idt(), false); if (t) { await g.dealDamage(t, 5, { src: u, byPlayer: true }); if (g.c(t).zone) g.giveStatus(t, 'stun', '자력 미사일'); } } } };
  S['49027'] = { whenRevealed(g, u) { g.put(u, 'pobl'); g.log('오랜 원한: 자력 끌기로 버린 카드마다 피해 1', 'warn'); }, // Old Grievances
    actions: [{ timing: 'alter', label: '에릭 렌셔 소진 → 오랜 원한 버림', can: (g, u) => g.c(u).zone === 'pobl' && !g.c(g.idt()).ex, use(g, u) { g.c(g.idt()).ex = true; g.discard(u); } }] };
  // Leadership / Basic
  S['49012'] = { async onEnter(g, u) { const c = g.e.minions.filter(m => g.hpLeft(m) < g.hpLeft(u)); const t = await pick(g, c, 'M: 물리칠 하수인'); if (t) await g.defeat(t, { byPlayer: true, src: u }); } }; // M
  S['49013'] = { async onEnter(g, u) { const o = []; if (g.canAfford({ n: 1, req: 'Y' }, null)) o.push({ id: 'Y', label: '[에너지] → 모든 적에게 피해 1' }); if (g.canAfford({ n: 1, req: 'B' }, null)) o.push({ id: 'B', label: '[정신] → 모든 음모에서 위협 1 제거' }); o.push({ id: 'n', label: '하지 않음' }); // Kid Omega
    const k = await g.ask({ type: 'choice', title: '키드 오메가', options: o }); if (k === 'n') return; if ((await g.pay({ n: 1, req: k }, null, '키드 오메가', true)) == null) return;
    if (k === 'Y') for (const e of g.enemies().slice()) await g.dealDamage(e, 1, { src: u, byPlayer: true }); else for (const s of g.schemes().slice()) await thw(g, s, 1, u); } };
  S['49014'] = { async onEnter(g, u) { const t = await pick(g, g.p.allies.filter(a => a !== u && tr(g, a, 'X-MEN')), '피닉스: 준비시킬 [엑스맨] 동료'); if (t) { g.c(t).ex = false; g.heal(t, 1); } } }; // Phoenix (ally)
  S['49015'] = { async onEnter(g) { const t = await g.chooseTarget('enemy', '사이클롭스: 이번 단계 공격 피해 +1을 받을 적', g.idt(), false); if (t) { g.addPhaseMod(t, 'takeAtk', 1); g.log(`${g.nm(t)}: 이번 단계 공격마다 피해 +1`, 'good'); } } }; // Cyclops (ally)
  S['49016'] = { canPlay: g => tr(g, g.idt(), 'X-FORCE') || tr(g, g.idt(), 'X-MEN'), actions: [{ timing: 'alter', label: '버림 → [엑스포스]/[엑스맨] 동료를 손으로', can: g => g.p.discard.some(x => g.d(x).type === 'ally' && (tr(g, x, 'X-FORCE') || tr(g, x, 'X-MEN'))), async use(g, u) { g.discard(u); const t = await pick(g, g.p.discard.filter(x => g.d(x).type === 'ally' && (tr(g, x, 'X-FORCE') || tr(g, x, 'X-MEN'))), '손으로 가져올 동료'); if (t) g.put(t, 'hand'); } }] }; // Won't Stay Down
  S['49017'] = { play: { timing: 'hero', async resolve(g) { for (let i = 0; i < 200; i++) { const x = g.takeEncounter(); if (!x) break; g.put(x, 'ediscard'); if (g.d(x).type === 'minion') { await g.enterMinion(x, {}); break; } } // Squared Off
    const c = g.p.hand.filter(x => g.d(x).type === 'ally'); const t = c.length ? await g.ask({ type: 'target', title: '맞대결: 비용 -3으로 플레이할 동료 (취소 가능)', cands: c, cancelable: true }) : null; if (!t) return; g.p.costRed = (g.p.costRed || 0) + 3; try { if (g.canPlay(t)) await g.playCard(t); } finally { g.p.costRed = 0; } } } };
  S['49018'] = { play: { timing: 'hero', can: g => g.p.allies.length > 0, async resolve(g) { const a = await pick(g, g.p.allies.slice(), '숭고한 희생: 버릴 동료'); if (!a) return; const h = g.d(a).hp || 0; g.discard(a, `${g.nm(a)} 버림`); g.heal(g.idt(), h); g.giveStatus(g.idt(), 'tough', '숭고한 희생'); } } }; // Noble Sacrifice
  S['49019'] = { interrupt: { window: 'basicPowerUsed', timing: 'hero', label: '"넌 할 수 있어!": 동료를 버리고 그 능력치를 더한 뒤 준비', can: (g, u, ctx) => ['attack', 'thwart'].includes(ctx.kind) && g.p.allies.length > 0, async resolve(g, u, ctx) { // "You Got This!"
    const a = await pick(g, g.p.allies.slice(), '버릴 동료'); if (!a) return; ctx.bonus += g.stat(a, ctx.kind === 'attack' ? 'atk' : 'thw'); g.discard(a, `${g.nm(a)} 버림`); (ctx.after = ctx.after || []).push(gg => { if (gg.canReady(gg.idt())) gg.c(gg.idt()).ex = false; }); } } };
  const NEW = ['49033', '49034', '49035', '49036'];
  S['49020'] = { canPlay: g => tr(g, g.idt(), 'X-MEN'), async whenDefeated(g) { await g.forEachPlayer(async () => { // New Recruits
    const have = Object.keys(g.s.cards).filter(x => NEW.includes(g.c(x).id) && g.c(x).zone).map(x => g.c(x).id); const opts = NEW.filter(id => !have.includes(id)); if (!opts.length) return;
    const k = await g.ask({ type: 'choice', title: `신입 대원(${g.playerName()}): 손에 넣을 [신입] 동료`, options: opts.map(id => ({ id, label: MC.cards[id].name })) }); const x = g.newCard(k || opts[0], null, { owner: g.s.ctx }); g.put(x, 'hand'); g.log(`${g.nm(x)}을(를) 손에 넣습니다`, 'good'); }); } };
  const mx = g => tr(g, g.idt(), 'MUTANT') || tr(g, g.idt(), 'X-MEN');
  S['49033'] = { noAllyLimit: g => mx(g), mod: { atk: (g, s, t) => t === s && mx(g) ? 1 : 0 } }; // Surge
  S['49034'] = { noAllyLimit: g => mx(g), mod: { thw: (g, s, t) => t === s && mx(g) ? 1 : 0 } }; // Anole
  S['49035'] = { noAllyLimit: g => mx(g), onEnter(g, u) { if (mx(g)) g.c(u).tough = true; } }; // Bling!
  S['49036'] = { noAllyLimit: g => mx(g), mod: { hp: (g, s, t) => t === s && mx(g) ? 2 : 0 } }; // Indra
  S['49037'] = { grantTrait: (g, s, t) => g.friendlyChars().includes(t) && ['X-FACTOR', 'X-FORCE', 'X-MEN'].some(x => (g.d(t).tr || []).includes(x)) ? ['X-FACTOR', 'X-FORCE', 'X-MEN'] : null }; // Children of the Atom
  S['49021'] = { canPlay: g => tr(g, g.idt(), 'X-FORCE') || tr(g, g.idt(), 'X-MEN'), async onEnter(g) { const c = g.friendlyChars().concat(g.enemies()).filter(x => g.c(x).stun || g.c(x).conf || g.c(x).tough); const t = await pick(g, c, '화이트 퀸: 상태 카드를 버릴 캐릭터'); if (!t) return; // White Queen
    const k = ['stun', 'conf', 'tough'].filter(s => g.c(t)[s]); const s = k.length === 1 ? k[0] : await g.ask({ type: 'choice', title: '버릴 상태 카드', options: k.map(x => ({ id: x, label: { stun: '기절', conf: '혼란', tough: '강인함' }[x] })) }); g.c(t)[s] = false; g.log(`${g.nm(t)}의 ${{ stun: '기절', conf: '혼란', tough: '강인함' }[s]} 제거`); } };
  S['49022'] = { play: { timing: 'hero', async resolve(g, u) { const m = g.e.deck.concat(g.e.discard, g.e.setaside).find(x => g.d(x).type === 'minion' && g.d(x).nemesis); // Face the Past
    if (m) { g.shuffle(g.e.deck); await g.reveal(m); } if (g.canReady(g.idt())) g.c(g.idt()).ex = false; await g.draw(3); g.p.phase.noVillainAttack = true; g.removeFromGame(u); g.log('과거와의 대면: 이번 단계 동안 빌런을 공격할 수 없습니다', 'warn'); } } };
  // Magneto nemesis
  const burn = async (g, n) => { for (let i = 0; i < n; i++) { if (!g.p.deck.length) await g.reshuffleDeck(); const x = g.p.deck[0]; if (!x) break; g.put(x, 'discard'); } g.log(`덱 위 ${n}장 버림`); };
  S['49028'] = { on: { async afterEnemyAttack(g, u, ctx) { if (ctx.enemy === u) await burn(g, g.stat(u, 'atk')); } } }; // Exodus
  S['49029'] = { async whenDefeated(g) { await burn(g, 9); } }; // Martyr for Mutants
  S['49030'] = { async whenDefeated(g) { await burn(g, 4); }, async boostEffect(g) { await burn(g, 4); } }; // Fabian Cortez
  S['49031'] = { on: { async afterEnemyAttack(g, u, ctx) { if (ctx.enemy === u) await burn(g, 2); } }, async boostEffect(g) { await burn(g, 4); } }; // Frenzy
  S['49032'] = { async whenRevealed(g) { const ms = g.e.minions.filter(m => tr(g, m, 'ACOLYTE')); for (const m of ms) if (g.c(m).zone === 'minion') await g.withPlayer(g.c(m).eng ?? g.s.ctx, () => g.activate(m, {})); // Angry Acolyte
    if (!ms.length) for (let i = 0; i < 200; i++) { const x = g.takeEncounter(); if (!x) break; g.put(x, 'ediscard'); if (g.d(x).type === 'minion' && tr(g, x, 'ACOLYTE')) { await g.reveal(x); break; } } } };
  // Hellfire (modular)
  S['49038'] = { cannotAttack: (g, s, t) => t === s && g.c(s).shawPhase === g.s.round + ':' + g.s.phase, on: { afterAttack(g, u, ctx) { if (ctx.target === u && g.c(u).zone && g.c(u).shawPhase !== g.s.round + ':' + g.s.phase) { g.c(u).shawPhase = g.s.round + ':' + g.s.phase; g.c(u).fdBoost = (g.c(u).fdBoost || 0) + 1; g.log('세바스찬 쇼: 강화 카드 1장을 얻고 이번 단계 동안 공격받지 않습니다', 'warn'); } } } }; // Sebastian Shaw
  S['49039'] = { cannotAttack: (g, s, t, src) => t === s && !!src && g.allAllies().includes(src), async boostEffect(g) { const t = await pick(g, g.p.allies.slice(), '★ 셀린: 버릴 동료'); if (t) g.discard(t, `${g.nm(t)} 버림`); } }; // Selene
  S['49040'] = { boostEffect(g, u, ctx) { (ctx.post || ctx.after).push(async gg => { if (['boost', 'ediscard'].includes(gg.c(u).zone)) await gg.enterMinion(u, {}); }); } }; // Hellfire Pawn
  S['49041'] = { whenRevealed(g, u) { const n = g.inPlay().filter(x => g.d(x).enc && tr(g, x, 'HELLFIRE')).length; if (n) { g.c(u).threat += 2 * n; g.log(`이너 서클: [헬파이어] ${n}장 → 위협 +${2 * n}`); } } }; // The Inner Circle
  S['49042'] = { async whenRevealed(g, u) { const v = g.e.villain; if (!v) return; g.giveStatus(v, 'tough', '권력과 퇴폐'); g.c(v).fdBoost = (g.c(v).fdBoost || 0) + 1; g.log('권력과 퇴폐: 빌런의 다음 활성화에 강화 카드 1장 추가', 'warn'); }, // Power and Decadence
    boostEffect(g, u, ctx) { const e = ctx.enemy; (ctx.post || ctx.after).push(async gg => { if (e && gg.c(e).zone) await gg.activate(e, { noBoost: true }); }); } };
  MC.registerScripts(S);
})();
