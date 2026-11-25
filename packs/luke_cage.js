/* Luke Cage (62001-62037): any number of tough status cards, Cottonmouth nemesis and the pack's player cards.
   Ported from cards/pack/luke_cage of the community build. */
(function () {
  'use strict';
  const S = {};
  const idOf = (g, u) => g.c(u).id;
  const tr = (g, u, t) => (g.d(u).tr || []).includes(t) || g.hasTrait(u, t);
  const pick = async (g, cands, title) => !cands.length ? null : cands.length === 1 ? cands[0] : await g.ask({ type: 'target', title, cands, cancelable: false });
  const yes = async (g, title) => (await g.ask({ type: 'choice', title, options: [{ id: 'y', label: '예' }, { id: 'n', label: '아니요' }] })) === 'y';
  async function thw(g, t, n, src) { const r = await g.removeThreat(t, n, { src }); g.log(`${g.nm(t)} 위협 ${r} 제거`); await g.afterThreatRemoved(t); return r; }
  const pk = g => g.s.round + ':' + g.s.phase;
  const isLuke = g => ['62001a', '62001b'].includes(idOf(g, g.idt()));
  const tough = g => isLuke(g) ? g.toughCount(g.idt()) : 0;
  const chars = g => [g.idt()].concat(g.p.allies);
  // ======================= identity =======================
  const skin = { multiTough: true, noPiercingVs: true };
  S['62001a'] = Object.assign({ on: { async toughLost(g, u, ctx) { if (ctx.target === u && g.c(u).zone) { g.log('끊어지지 않는 피부: 강인함을 잃어 피할 수 없는 피해 1', 'warn'); await g.dealDamage(u, 1, { unpreventable: true }); } } } }, skin);
  S['62001b'] = Object.assign({ actions: [{ label: '버스타인 처리를 손으로 (단계당 1번)', can: g => g.p.phase.burstein !== true, async use(g) { g.p.phase.burstein = true; await g.searchToHand(d => d.id === '62008', '버스타인 처리', { discard: true }); } }] }, skin);
  S['62002'] = { mod: { thw: (g, s, t) => t === s ? Math.min(4, g.toughCount(g.idt())) : 0 } }; // Jessica Jones (ally)
  S['62003'] = { play: { timing: 'hero', async resolve(g) { g.giveStatus(g.idt(), 'tough', '할렘의 영웅'); const n = tough(g); // Harlem's Hero
    for (let i = 0; i < n; i++) { const xs = chars(g).filter(x => g.c(x).ex && g.canReady(x)); if (!xs.length) break; const x = await pick(g, xs, `준비할 캐릭터 (${n - i})`); g.c(x).ex = false; } } } };
  S['62004'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { await g.playerAttack(g.idt(), ctx.target, 3, { src: u }); // Knuckle Sandwich
    if (tough(g) > 0 && await yes(g, '강인함 카드 1장을 버리고 이 카드를 손으로 돌려받을까요?')) { await g.loseTough(g.idt(), '너클 샌드위치'); g.p.returnEvent = u; } } } };
  S['62005'] = { play: { timing: 'hero', label: 'thwart', target: 'thwartable', async resolve(g, u, ctx) { g.giveStatus(g.idt(), 'tough', '"함께 서자!"'); await thw(g, ctx.target, Math.min(5, Math.max(1, tough(g))), u); } } }; // "Stand with Me!"
  S['62006'] = { selfCostMod: g => tough(g), play: { timing: 'hero', label: 'attack', async resolve(g, u) { for (const t of [g.e.villain].concat(g.engagedMinions())) if (t && g.c(t).zone) await g.playerAttack(g.idt(), t, 5, { src: u }); } } }; // "Sweet Christmas!"
  S['62007'] = { respond: [{ window: 'toughDiscarded', exhaust: true, label: '포그웰 체육관: 그 캐릭터 준비', can: (g, u, ctx) => g.c(ctx.target) && g.c(ctx.target).ex && tr(g, ctx.target, 'DEFENDER') && (ctx.target === g.idt() || g.p.allies.includes(ctx.target)), resolve(g, u, ctx) { if (g.canReady(ctx.target)) g.c(ctx.target).ex = false; } }] }; // Fogwell's Gym
  S['62008'] = { actions: [{ timing: 'alter', exhaust: true, label: '버스타인 처리: 강인함 (없으면 2장)', use(g) { const none = g.toughCount(g.idt()) === 0; g.giveStatus(g.idt(), 'tough', '버스타인 처리'); if (none) g.giveStatus(g.idt(), 'tough', '버스타인 처리'); } }] }; // Burstein Process
  S['62009'] = { attach: { kind: 'minion', filter: (g, t) => !g.c(t).att.some(a => idOf(g, a) === '62009') }, attackedBonus: 2, attacksGainOverkill: true }; // Cruisin' for a Bruisin'
  S['62010'] = { mod: { retaliate: (g, s, t) => t === g.idt() && isLuke(g) ? 1 : 0 }, respond: [{ window: 'identityWouldTakeDamage', timing: 'hero', exhaust: true, label: '금속 팔찌: 피해 -1', can: (g, u, ctx) => ctx.amount - ctx.prevent > 0, resolve(g, u, ctx) { ctx.prevent += 1; } }] }; // Metal Bracer
  S['62011'] = { respond: [{ window: 'toughDiscarded', timing: 'hero', exhaust: true, label: '파워맨: 카드 1장', can: (g, u, ctx) => ctx.target === g.idt(), async resolve(g) { await g.draw(1); } }] }; // Power Man
  // ======================= aspect / basic =======================
  S['62012'] = { respond: [{ window: 'allyWouldTakeDamage', label: '아이언 피스트: 공격력만큼 피해 방지', can: (g, u, ctx) => ctx.target === u && ctx.attack, resolve(g, u, ctx) { ctx.prevent += g.stat(u, 'atk'); } }] }; // Iron Fist
  S['62013'] = { mod: { atk: (g, s, t) => t === s && g.c(s).tough ? 2 : 0, thw: (g, s, t) => t === s && g.c(s).tough ? 2 : 0 } }; // Misty Knight
  S['62014'] = { respond: [{ window: 'allyWouldBeDefeated', label: '발키리: 버리고 그 동료를 체력 1로', can: (g, u, ctx) => ctx.ally !== u && g.c(u).zone === 'ally', resolve(g, u, ctx) { g.discard(u, '발키리 버림'); const a = ctx.ally; g.c(a).dmg = Math.max(0, g.maxHp(a) - 1); ctx.saved = true; g.log(`${g.nm(a)}: 체력 1로 버팁니다`, 'good'); } }] }; // Valkyrie
  S['62015'] = { interrupt: { window: 'afterHeroDefends', timing: 'hero', label: '맞서라', resolve(g) { const r = g.s.phase === 'player' ? g.s.round : g.s.round + 1; for (const a of g.p.allies) g.c(a).ppMod = { round: r, atk: 1, thw: 1 }; g.log('맞서라: 동료 모두 다음 플레이어 단계까지 공격력·저지력 +1', 'good'); } } }; // Take a Stand
  S['62016'] = { async onSpent(g) { if (!g.isHero()) return; const a = await pick(g, g.p.allies.filter(x => g.c(x).dmg > 0), '회복 1을 할 동료'); if (a) g.heal(a, 1); } }; // Innovation
  S['62017'] = { doubleFor: (g, s, uid) => g.d(uid).cls === 'Leadership' }; // The Power of Leadership
  S['62018'] = { actions: [{ exhaust: true, label: '방어 대형: 막기 1 → [디펜더] 동료 강인함', can: (g, u) => (g.c(u).cnt.block || 0) > 0 && g.p.allies.some(a => tr(g, a, 'DEFENDER')), async use(g, u) { g.c(u).cnt.block--; const a = await pick(g, g.p.allies.filter(x => tr(g, x, 'DEFENDER')), '강인함을 줄 동료'); if (a) g.giveStatus(a, 'tough', '방어 대형'); g.cleanupUses(u); } }] }; // Defensive Formation
  const one = (g, t) => chars(g).includes(t) && g.hpLeft(t) === 1;
  S['62019'] = { mod: { atk: (g, s, t) => one(g, t) ? 2 : 0, thw: (g, s, t) => one(g, t) ? 2 : 0 } }; // Righteous Purpose
  S['62020'] = { mod: { atk: (g, s, t) => t === s ? (g.c(s).cnt.rage || 0) : 0 }, on: { afterEnemyAttack(g, u, ctx) { if (ctx.enemy === g.e.villain && g.c(u).zone === 'ally') { g.c(u).cnt.rage = (g.c(u).cnt.rage || 0) + 1; g.log('헐크: 분노 +1'); } } } }; // Hulk (ally)
  S['62021'] = { onEnter(g) { g.giveStatus(g.idt(), 'tough', '쉬헐크'); } }; // She-Hulk (ally)
  S['62023'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { await g.playerAttack(g.idt(), ctx.target, 2, { src: u }); const c = await pick(g, chars(g), '강인함을 줄 캐릭터'); if (c) g.giveStatus(c, 'tough', '파워맨과 아이언 피스트'); } } }; // Power Man and Iron Fist
  S['62028'] = { whenRevealed(g, u) { g.put(u, 'pobl'); g.log('내상: 플레이어 단계가 끝날 때마다 피할 수 없는 피해 3', 'warn'); }, // Internal Injury
    on: { async playerPhaseEnd(g, u) { if (g.c(u).zone === 'pobl') { g.log('내상: 피할 수 없는 피해 3', 'warn'); await g.dealDamage(g.idt(), 3, { unpreventable: true }); } }, afterRecover(g, u) { if (g.c(u).zone === 'pobl') { g.removeFromGame(u); g.log('내상: 회복으로 게임에서 제거', 'good'); } } } };
  // nemesis
  const cotton = g => g.e.minions.find(m => idOf(g, m) === '62029') || null;
  S['62029'] = { on: { async afterEnemyAttack(g, u, ctx) { if (ctx.enemy !== u || g.c(u).cmPhase === pk(g) || !ctx.target || !g.c(ctx.target).zone) return; g.c(u).cmPhase = pk(g); // Cottonmouth
      for (let i = 0; i < 2 && g.c(u).zone === 'minion' && g.c(ctx.target).zone; i++) { g.log('★ 코튼마우스: 같은 캐릭터를 다시 공격합니다', 'warn'); await g.enemyAttack(u, { forceTarget: ctx.target === g.idt() ? undefined : ctx.target }); } } },
    boostEffect(g, u, ctx) { (ctx.post || ctx.after).push(gg => { if (gg.c(u).zone === 'ediscard') { gg.put(u, 'facedown'); gg.log('★ 코튼마우스를 뒷면 조우 카드로 받습니다', 'warn'); } }); } };
  S['62030'] = { cannotAttack: (g, s, t) => g.c(s).zone === 'side' && g.c(t).zone === 'minion' && g.hasTrait(t, 'SERPENT SOCIETY'), // Venomous Whispers
    async whenDefeated(g) { for (let i = 0; i < 200; i++) { const x = g.takeEncounter(); if (!x) return; g.put(x, 'ediscard'); if (g.d(x).type === 'minion' && (g.d(x).tr || []).includes('SERPENT SOCIETY')) { await g.reveal(x); return; } } },
    boostEffect(g) { g.giveStatus(g.idt(), 'conf', '★ 독이 서린 속삭임'); } };
  S['62031'] = { attachTo: g => cotton(g) || g.e.villain, actions: [{ timing: 'hero', label: '[정신][정신] → 강화 턱 버림', cost: { n: 2, req: 'BB' }, can: (g, u) => g.c(u).zone === 'attach', use(g, u) { g.discard(u, '강화 턱 버림'); } }], // Augmented Jaws
    on: { async enemyAttacks(g, a, ctx) { if (ctx.enemy !== g.c(a).on) return; for (const x of chars(g)) while (g.c(x).tough) { if (!(await g.loseTough(x, '★ 강화 턱'))) break; } } } };
  S['62032'] = { on: { afterEnemyScheme(g, u, ctx) { if (ctx.enemy === u) g.giveStatus(g.idt(), 'stun', '★ 아스프'); } }, boostEffect(g) { g.giveStatus(g.idt(), 'stun', '★ 아스프'); } }; // Asp
  S['62033'] = { beforeAttackedCtx(g, t, actx) { const x = g.takeEncounter(); if (!x) return; g.put(x, 'ediscard'); g.log(`사이드와인더: 조우 덱 맨 위 ${g.nm(x)} 버림`); // Sidewinder
    if (g.sc(x).boostEffect) { actx.prevent = true; for (const a of g.c(t).att.slice()) g.discard(a); g.resetCard(t); g.put(t, 'facedown'); g.log('사이드와인더가 사라져 뒷면 조우 카드가 됩니다', 'warn'); } } };
  S['62034'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { const t = ctx.target; const big = tr(g, g.idt(), 'GIANT') || g.hpLeft(g.idt()) > g.hpLeft(t); await g.playerAttack(g.idt(), t, big ? 6 : 3, { src: u }); } } }; // Size Advantage
  S['62035'] = { play: { timing: 'hero', async resolve(g) { if (g.e.villain) await g.enemyScheme(g.e.villain, {}); g.giveStatus(g.idt(), 'tough', '관찰'); } } }; // Observe
  S['62036'] = { on: { afterRecover(g, u) { if (g.c(u).ex || g.hpLeft(g.idt()) < (g.d(g.idt()).hp || 0)) return; g.c(u).ex = true; g.giveStatus(g.idt(), 'tough', '단련'); } } }; // Toughen Up
  S['62037'] = { canPlay: g => g.controlled().concat([g.idt()]).some(x => tr(g, x, 'MARTIAL ARTIST')), attach: { kind: 'friendly', filter: (g, t) => !g.c(t).att.some(a => idOf(g, a) === '62037') }, // Black Belt
    mod: { hp: (g, s, t) => g.c(s).on === t ? 1 : 0 }, grantTrait: (g, s, u) => g.c(s).on === u ? 'MARTIAL ARTIST' : null };
  MC.registerScripts(S);
})();
