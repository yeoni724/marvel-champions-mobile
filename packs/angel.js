/* Angel (42001-42032): Angel / Archangel forms, Protection X-Force cards and his nemesis set.
   Ported from cards/pack/angel of the community build. */
(function () {
  'use strict';
  const S = {};
  const idOf = (g, u) => g.c(u).id;
  const tr = (g, u, t) => (g.d(u).tr || []).includes(t) || g.hasTrait(u, t);
  const pick = async (g, cands, title) => !cands.length ? null : cands.length === 1 ? cands[0] : await g.ask({ type: 'target', title, cands, cancelable: false });
  const isAngel = g => idOf(g, g.idt()) === '42001a';
  const isArch = g => idOf(g, g.idt()) === '42001c';
  const aerialEvent = (g, u) => g.d(u).type === 'event' && tr(g, u, 'AERIAL');
  const aerialChars = g => g.friendlyChars().filter(x => tr(g, x, 'AERIAL'));
  async function thw(g, t, n, src, o) { const r = await g.removeThreat(t, n, Object.assign({ src }, o || {})); g.log(`${g.nm(t)} 위협 ${r} 제거`); await g.afterThreatRemoved(t); return r; }

  // identity
  S['42001a'] = { respond: [{ window: 'cardPlayedDone', label: '삶의 천사: 카드 1장 (단계당 1번)', can: (g, u, ctx) => ctx.card && aerialEvent(g, ctx.card) && !g.p.phase.angelLife, async resolve(g) { g.p.phase.angelLife = true; await g.draw(1); } }] };
  S['42001c'] = { accelBonus: (g, u) => u === g.idt() ? 1 : 0,
    respond: [{ window: 'cardPlayedDone', label: '죽음의 천사: 그 이벤트의 비용만큼 적에게 피해 (단계당 1번)', can: (g, u, ctx) => ctx.card && aerialEvent(g, ctx.card) && !g.p.phase.angelDeath && (g.d(ctx.card).cost || 0) > 0,
      async resolve(g, u, ctx) { g.p.phase.angelDeath = true; const t = await g.chooseTarget('enemy', '죽음의 천사: 피해를 줄 적', g.idt(), false); if (t) await g.dealDamage(t, g.d(ctx.card).cost || 0, { src: g.idt(), byPlayer: true }); } }] };
  S['42001b'] = { actions: [{ timing: 'action', once: true, label: '재생: 회복 1', can: g => g.c(g.idt()).dmg > 0, use(g) { g.heal(g.idt(), 1); } }] };
  // hero cards
  S['42002'] = { respond: [{ window: 'afterAllyAttack', timing: 'hero', label: '★ 엔젤: 사일록 회복 1 / 아크엔젤: 히어로 준비', can: (g, u, ctx) => ctx.ally === u && ((isAngel(g) && g.c(u).dmg > 0) || (isArch(g) && g.c(g.idt()).ex)), // Psylocke (ally)
    resolve(g, u) { if (isAngel(g)) g.heal(u, 1); else if (g.canReady(g.idt())) g.c(g.idt()).ex = false; } }] };
  S['42003'] = { play: { timing: 'hero', label: 'thwart', async resolve(g, u) { // Adaptive Plumage
    if (isAngel(g)) { const t = await g.chooseTarget('thwartable', '적응형 깃털: 위협 3을 제거할 음모', u, false); if (t) await thw(g, t, 3, u); const e = await g.chooseTarget('enemy', '혼란에 빠뜨릴 적', g.idt(), false); if (e) g.giveStatus(e, 'conf', '적응형 깃털'); }
    else if (isArch(g)) { const t = await g.chooseTarget('attackable', '적응형 깃털: 피해 4를 줄 적', g.idt(), false); if (t) { await g.playerAttack(g.idt(), t, 4, { src: u }); if (g.c(t).zone && ['villain', 'minion'].includes(g.c(t).zone)) g.giveStatus(t, 'stun', '적응형 깃털'); } }
  } } };
  S['42004'] = { interrupt: { window: 'enemyAttackInitiated', timing: 'hero', label: 'defense', resolve(g, u, ctx) { // Aerial Agility
    if (isAngel(g)) { ctx.noBoost = true; g.log('공중 기동: 이번 공격의 강화 카드를 무시합니다', 'good'); } else if (isArch(g)) g.giveStatus(g.idt(), 'tough', '공중 기동'); } } };
  S['42005'] = { play: { timing: 'action', can: g => !g.formLocked(), async resolve(g, u) { await g.changeForm(true); // Metamorphosis
    if (!g.isHero()) await g.draw(1); else if (isAngel(g)) await g.removeThreatChoose(2, '변태: 위협 2를 제거할 음모', u); else if (isArch(g)) { const t = await g.chooseTarget('enemy', '변태: 피해 3을 줄 적', g.idt(), false); if (t) await g.dealDamage(t, 3, { src: u, byPlayer: true }); } } } };
  S['42006'] = { play: { timing: 'hero', label: 'thwart', target: 'thwartable', async resolve(g, u, ctx) { await thw(g, ctx.target, 4, u, isAngel(g) ? { ignoreCrisis: true } : {}); } } }; // Natural Flight
  S['42007'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { const a = isArch(g); await g.playerAttack(g.idt(), ctx.target, 6, { src: u, overkill: a, piercing: a }); } } }; // Razor Dive
  S['42008'] = { onSpent(g, u, forUid) { if (forUid && aerialEvent(g, forUid)) g.p.returnEvent = forUid; } }; // Avian Anatomy
  S['42009'] = { actions: [{ timing: 'action', exhaust: true, label: '소진 → [비행] 카드 1장을 덱에 섞기 (일상이면 카드 1장)', can: g => g.p.discard.some(x => tr(g, x, 'AERIAL')), async use(g) { // Worthington Industries
    const t = await pick(g, g.p.discard.filter(x => tr(g, x, 'AERIAL')), '덱에 섞을 카드'); if (t) { g.put(t, 'deck'); g.shuffle(g.p.deck); } if (!g.isHero()) await g.draw(1); } }] };
  S['42010'] = { costMod: (g, s, uid) => g.p.phase.wings && aerialEvent(g, uid) ? 2 : 0, costUsed(g) { g.p.phase.wings = false; }, // Techno-Organic Wings
    actions: [{ timing: 'hero', exhaust: true, label: '소진 → 엔젤: 히어로 준비 / 아크엔젤: 다음 [비행] 이벤트 비용 -2', async use(g) { if (isAngel(g)) { if (g.canReady(g.idt())) g.c(g.idt()).ex = false; } else if (isArch(g)) { g.p.phase.wings = true; g.log('테크노 오가닉 날개: 이번 단계 다음 [비행] 이벤트 비용 -2', 'good'); } } }] };
  S['42024'] = { hazardBonus: (g, u) => g.c(u).zone === 'pobl' ? 1 : 0, // Apocalyptic Influence
    async whenRevealed(g, u) { if (isArch(g)) await g.placeThreat(g.e.main, 2, {}); else if (!g.formLocked()) { g.p.heroId = '42001c'; if (!g.isHero()) g.flip(true); else g.c(g.idt()).id = '42001c'; g.log('묵시록의 영향: 아크엔젤로 변신합니다', 'warn'); await g.trigger('formChanged', { form: g.p.form }); } g.put(u, 'pobl'); g.log('묵시록의 영향: 플레이에 남습니다 (위험 1)', 'warn'); },
    actions: [{ timing: 'alter', label: '조우 카드 1장을 받기 → 이 카드 버림', can: (g, u) => g.c(u).zone === 'pobl', use(g, u) { const x = g.takeEncounter(); if (x) g.put(x, 'facedown', g.s.first); g.discard(u); } }] };
  const discardUntilEvent = async (g, why) => { for (let i = 0; i < 80; i++) { if (!g.p.deck.length) await g.reshuffleDeck(); const x = g.p.deck[0]; if (!x) return null; g.put(x, 'discard'); if (g.d(x).type === 'event') { g.log(`${why}: ${g.nm(x)} (비용 ${g.d(x).cost || 0})`, 'warn'); return x; } } return null; };
  S['42025'] = { attackBonus: (g, x, ctx) => { const t = ctx && ctx.defender ? ctx.defender : g.idt(); return tr(g, t, 'AERIAL') ? 1 : 0; }, // Harpoon (nemesis)
    async whenRevealed(g) { const e = await discardUntilEvent(g, '하푼'); if (e && g.d(e).cost) await g.indirectDamage(g.d(e).cost, null); } };
  S['42026'] = { on: { enemyAttacks(g, u, ctx) { if (g.c(u).zone === 'side' && ctx.enemy && tr(g, ctx.enemy, 'BRUTE')) ctx.indirect = true; } } }; // Hook, Line, and Sinker
  const harpoon = g => g.e.minions.find(m => idOf(g, m) === '42025') || null;
  S['42027'] = { attachTo: harpoon, // Harpoon's Harpoon
    async whenRevealed(g, u, ctx) { if (g.c(u).zone === 'attach') return; const x = g.e.deck.concat(g.e.discard).find(y => idOf(g, y) === '42025'); if (x) { g.shuffle(g.e.deck); await g.reveal(x); if (harpoon(g)) { g.attachEnc(u, harpoon(g)); return; } } ctx.surge++; },
    surgeIfNoHost: false, on: { async afterEnemyAttack(g, u, ctx) { if (ctx.enemy === g.c(u).on) await g.indirectDamage(2, null); } } };
  S['42028'] = { async whenRevealed(g, u, ctx) { const e = await discardUntilEvent(g, '창 사격'); if (!e) return; if (g.d(e).cost) await g.indirectDamage(g.d(e).cost, null); if (tr(g, e, 'AERIAL')) ctx.surge++; }, async boostEffect(g) { await g.indirectDamage(2, null); } }; // Spear Shot
  // aspect / basic
  S['42011'] = { canPlay: g => tr(g, g.idt(), 'X-FORCE') || tr(g, g.idt(), 'X-MEN'), respond: ['afterAllyAttack', 'afterAllyThwart'].map(w => ({ window: w, label: '★ 다른 아군 캐릭터 회복 1', can: (g, u, ctx) => ctx.ally === u && g.allFriendlyChars().some(x => x !== u && g.c(x).dmg > 0), // Elixir
    async resolve(g, u) { const t = await pick(g, g.allFriendlyChars().filter(x => x !== u && g.c(x).dmg > 0), '엘릭서: 회복할 캐릭터'); if (t) g.heal(t, 1); } })) };
  S['42012'] = { respond: [{ window: 'afterAllyAttack', label: '★ 하수인 기절', can: (g, u, ctx) => ctx.ally === u && g.e.minions.length > 0, async resolve(g) { const t = await pick(g, g.e.minions.slice(), '사이렌: 기절시킬 하수인'); if (t) g.giveStatus(t, 'stun', '사이렌'); } }] }; // Siryn
  S['42013'] = { respond: [{ window: 'afterAllyDefends', timing: 'hero', label: '손의 [히어로 행동] 이벤트 1장 플레이', can: (g, u, ctx) => ctx.ally === u && g.p.hand.some(x => g.d(x).type === 'event' && g.sc(x).play && g.sc(x).play.timing === 'hero' && g.canPlay(x)), // Warpath
    async resolve(g) { const t = await pick(g, g.p.hand.filter(x => g.d(x).type === 'event' && g.sc(x).play && g.sc(x).play.timing === 'hero' && g.canPlay(x)), '플레이할 이벤트'); if (t) await g.playCard(t); } }] };
  const intervene = { label: '[비행] 캐릭터 소진 → 피해 최대 3 방지', async resolve(g, u, ctx) { const t = await pick(g, aerialChars(g).filter(x => !g.c(x).ex), '소진할 [비행] 캐릭터'); if (!t) return; g.c(t).ex = true; ctx.prevent += Math.min(3, ctx.amount); } };
  S['42014'] = { interrupt: Object.assign({ windows: ['wouldTakeAttackDamage', 'allyWouldTakeDamage'], can: (g, u, ctx) => ctx.attack && ctx.amount > 0 && aerialChars(g).some(x => !g.c(x).ex) }, intervene) }; // Aerial Intervention
  S['42015'] = { play: { timing: 'hero', can: g => tr(g, g.idt(), 'AERIAL'), async resolve(g, u) { if (g.canReady(g.idt())) g.c(g.idt()).ex = false; await thw(g, g.e.main, 2, u); } } }; // Ever Vigilant
  S['42016'] = { play: { timing: 'hero', can: g => !!g.e.villain, async resolve(g) { await g.enemyAttack(g.e.villain, {}); if (g.c(g.idt()).zone) await g.draw(3); } } }; // Taunt
  S['42017'] = { async whenDefeated(g) { await g.forEachPlayer(async () => { for (let i = 0; i < 5; i++) { const c = g.friendlyChars().filter(x => g.c(x).dmg > 0); if (!c.length) break; const t = await pick(g, c, `의료 지원(${g.playerName()}): 회복 1 (${i + 1}/5)`); if (t) g.heal(t, 1); } }); } }; // Render Medical Aid
  S['42018'] = { respond: [{ window: 'afterHeroDefends', label: '피로 카운터 1', resolve(g, u) { g.c(u).cnt.fatigue = (g.c(u).cnt.fatigue || 0) + 1; } }], // Angel's Aerie
    actions: [{ timing: 'alter', label: '피로 카운터 모두 제거 → 개당 회복 1', can: (g, u) => (g.c(u).cnt.fatigue || 0) > 0, use(g, u) { const n = g.c(u).cnt.fatigue; g.c(u).cnt.fatigue = 0; g.heal(g.idt(), n); } }] };
  S['42019'] = { attach: { kind: 'anyScheme', filter: (g, t) => g.c(t).zone === 'side' && !g.d(t).permanent && !g.c(t).att.some(a => idOf(g, a) === '42019') }, // Containment Strategy
    respond: [{ window: 'afterHeroDefends', label: '붙은 음모에서 위협 1 (피해가 없으면 2) 제거', can: (g, u) => g.c(u).zone === 'attach' && g.c(g.c(u).on).threat > 0, async resolve(g, u, ctx) { await thw(g, g.c(u).on, ctx.noDamage ? 2 : 1, g.idt()); } }] };
  S['42020'] = { respond: [{ window: 'allyWouldTakeDamage', label: '손의 [비행] 카드 수만큼 후속 피해 감소', can: (g, u, ctx) => ctx.target === u && ctx.consequential && g.p.hand.some(x => tr(g, x, 'AERIAL')), resolve(g, u, ctx) { ctx.prevent += g.p.hand.filter(x => tr(g, x, 'AERIAL')).length; } }] }; // Cannonball
  S['42022'] = { doubleFor: (g, u, f) => tr(g, f, 'AERIAL') }; // The Power of Flight
  S['42023'] = { respond: [{ window: 'basicPowerUsed', timing: 'hero', exhaust: true, label: '소진 → 이 기본 능력 +1', can: g => tr(g, g.idt(), 'AERIAL'), resolve(g, u, ctx) { ctx.bonus += 1; } }, // Soaring Acrobatics
    { window: 'allyPowerUsed', timing: 'hero', exhaust: true, label: '소진 → 이 동료 능력 +1', can: (g, u, ctx) => tr(g, ctx.ally, 'AERIAL'), resolve(g, u, ctx) { ctx.bonus += 1; } }] };
  S['42029'] = { play: { timing: 'hero', can: g => aerialChars(g).some(x => !g.c(x).ex), async resolve(g, u) { const t = await pick(g, aerialChars(g).filter(x => !g.c(x).ex), '소진할 [비행] 캐릭터'); g.c(t).ex = true; const pi = await g.choosePlayer('폭탄 투하: 대상 플레이어'); for (const e of [g.e.villain].concat(g.engagedMinions(pi)).filter(Boolean)) await g.dealDamage(e, 3, { src: u, byPlayer: true }); } } }; // Bombs Away
  S['42030'] = { respond: [{ window: 'cardRevealed', timing: 'hero', label: '[비행] 캐릭터 소진·버림 → 그 하수인 취소', can: (g, u, ctx) => g.d(ctx.card).type === 'minion' && !tr(g, ctx.card, 'ELITE') && aerialChars(g).some(x => !g.c(x).ex) && !ctx.cancelAll, // Eyes in the Sky
    async resolve(g, u, ctx) { const t = await pick(g, aerialChars(g).filter(x => !g.c(x).ex), '소진할 [비행] 캐릭터'); g.c(t).ex = true; g.discard(u); ctx.cancelAll = true; ctx.revealAnother = (ctx.revealAnother || 0) + 1; } }] };
  S['42031'] = { play: { timing: 'hero', async resolve(g) { for (let i = 0; i < 3; i++) { const c = aerialChars(g).filter(x => g.c(x).ex && g.canReady(x)); const t = await pick(g, c, `편대 비행: 준비할 [비행] 캐릭터 (${i + 1}/3)`); if (!t) break; g.c(t).ex = false; } } } }; // Flying Formation
  S['42032'] = { canPlay: g => tr(g, g.idt(), 'X-FORCE'), attach: { kind: 'friendly', filter: (g, t) => !g.c(t).att.some(a => idOf(g, a) === '42032') }, mod: { hp: (g, s, t) => t === g.c(s).on ? 1 : 0 }, grantTrait: (g, s, t) => t === g.c(s).on ? 'X-FORCE' : null }; // X-Force Recruit

  MC.registerScripts(S);
})();
