/* Winter Soldier (54001-54037): Cybernetic Arm, Whiteout modular and the pack's S.H.I.E.L.D. player cards.
   Ported from cards/pack/winter of the community build. */
(function () {
  'use strict';
  const S = {};
  const idOf = (g, u) => g.c(u).id;
  const tr = (g, u, t) => (g.d(u).tr || []).includes(t) || g.hasTrait(u, t);
  const pick = async (g, cands, title) => !cands.length ? null : cands.length === 1 ? cands[0] : await g.ask({ type: 'target', title, cands, cancelable: false });
  const yes = async (g, title) => (await g.ask({ type: 'choice', title, options: [{ id: 'y', label: '예' }, { id: 'n', label: '아니요' }] })) === 'y';
  const isWS = g => ['54001a', '54001b'].includes(idOf(g, g.idt()));
  const usedArm = g => (g.p.lastPaidAbil || []).some(x => idOf(g, x) === '54002');
  const heroDefeat = (g, ctx) => ctx.attacker === g.idt();
  S['54001a'] = { respond: [{ window: 'afterAttackDefeat', label: '치명적 수호자: 위협 2 제거', can: heroDefeat, async resolve(g) { await g.removeThreatChoose(2, '치명적 수호자', g.idt()); } }] };
  S['54001b'] = { actions: [{ timing: 'alter', label: '사이버네틱 강화: 자원 1 → 사이버네틱 팔을 찾아 플레이 영역에', cost: { n: 1, req: '' }, can: g => g.p.deck.concat(g.p.discard).some(x => idOf(g, x) === '54002'), use(g) { const x = g.p.deck.concat(g.p.discard).find(y => idOf(g, y) === '54002'); g.shuffle(g.p.deck); if (x) { g.put(x, 'upgrade'); g.log('사이버네틱 팔을 플레이 영역에', 'good'); } } }] };
  S['54002'] = { resources: [{ gen: 'G', label: '사이버네틱 팔 ([공격] 이벤트, 피해 +1)', forOnly: (g, s, uid) => !!uid && g.d(uid).type === 'event' && tr(g, uid, 'ATTACK'), can: (g, u) => !g.c(u).ex, use: (g, u) => { g.c(u).ex = true; g.p.aggr = (g.p.aggr || 0) + 1; } }] }; // Cybernetic Arm
  S['54003'] = { async onEnter(g) { const t = await pick(g, g.p.discard.filter(x => g.d(x).type === 'event' && tr(g, x, 'ATTACK')), '블랙 위도우: 손으로 가져올 [공격] 이벤트'); if (t) g.put(t, 'hand'); } }; // Black Widow (ally)
  S['54004'] = { interrupt: { window: 'enemyAttackInitiated', timing: 'hero', label: 'defense', async resolve(g, u, ctx) { const arm = usedArm(g); await g.dealDamage(ctx.enemy, 3 + (g.curEvent ? g.curEvent.dmgBonus || 0 : 0), { src: u, byPlayer: true }); if (arm) ctx.preventAll = true; if (!g.c(ctx.enemy).zone || !['villain', 'minion'].includes(g.c(ctx.enemy).zone)) ctx.cancel = true; } } }; // Arm Block
  S['54005'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { await g.playerAttack(g.idt(), ctx.target, 7, Object.assign({ src: u }, usedArm(g) ? { overkill: true } : {})); } } }; // Metal Punch
  S['54006'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { const t = ctx.target; await g.playerAttack(g.idt(), t, 4, { src: u }); if ((ctx.paid || []).includes('Y') && g.c(t).zone && ['villain', 'minion'].includes(g.c(t).zone)) g.giveStatus(t, 'stun', '전기 방출'); } } }; // Electrical Discharge
  S['54007'] = { actions: [{ timing: 'alter', exhaust: true, label: '은신처 #30: 조우 덱에서 하수인을 찾아 교전, 카드 1장', async use(g) { const c = g.e.deck.filter(x => g.d(x).type === 'minion'); const t = await pick(g, c, '교전할 하수인'); g.shuffle(g.e.deck); if (t) await g.enterMinion(t, {}); await g.draw(1); } }] }; // Safe House #30
  S['54008'] = { respond: [{ window: 'afterAttackDefeat', timing: 'hero', label: '조용한 잠입: 버리고 히어로 준비, 적 혼란', can: heroDefeat, async resolve(g, u) { g.discard(u, '조용한 잠입'); await prep(g, u); if (g.canReady(g.idt())) g.c(g.idt()).ex = false; const e = await g.chooseTarget('enemy', '혼란시킬 적', g.idt(), false); if (e) g.giveStatus(e, 'conf', '조용한 잠입'); } }] }; // Silent Infiltration
  async function prep(g, u) { await g.window('preparationResolved', { card: u }); } // White Widow
  S['54009'] = { mod: { hp: (g, s, t) => t === g.idt() ? 3 : 0 }, steadyFor: (g, s, t) => t === g.idt() }; // Winter Armor
  S['54010'] = { grantTrait: (g, s, t) => t === g.idt() ? 'SPY' : null, respond: [{ window: 'afterAttackDefeat', timing: 'hero', exhaust: true, label: '윈터 마스크: 카드 1장', can: heroDefeat, async resolve(g) { await g.draw(1); } }] }; // Winter Mask
  S['54011'] = { respond: [{ window: 'basicPowerUsed', timing: 'hero', exhaust: true, label: '윈터 라이플: 공격 +2, 관통·원거리', can: (g, u, ctx) => ctx.kind === 'attack' && isWS(g), resolve(g, u, ctx) { ctx.bonus += 2; ctx.piercing = true; ctx.ranged = true; } }] }; // Winter Rifle
  // Aggression / Basic / Protection
  S['54012'] = { async onEnter(g) { const t = await pick(g, g.friendlyChars().filter(c => g.c(c).ex && tr(g, c, 'S.H.I.E.L.D')), '캡틴 아메리카: 준비할 [실드] 캐릭터'); if (t) g.c(t).ex = false; } }; // Captain America (ally)
  S['54013'] = { async onEnter(g, u) { const x = g.p.deck.concat(g.p.discard).find(y => idOf(g, y) === '54020'); g.shuffle(g.p.deck); if (x && !g.c(u).att.some(a => idOf(g, a) === '54020')) { g.put(x, 'attach', u); g.c(x).cnt.ammo = 3; g.log('데스록에게 실드 권총을 붙입니다', 'good'); } } }; // Deathlok
  S['54014'] = { play: { timing: 'hero', label: 'attack', can: g => g.controlled().some(x => tr(g, x, 'WEAPON') && g.d(x).type === 'upgrade' && !g.c(x).ex), async resolve(g, u) { // Firepower
    const w = g.controlled().filter(x => tr(g, x, 'WEAPON') && g.d(x).type === 'upgrade' && !g.c(x).ex); const sel = await g.pickCards(w, '소진할 [무기] 업그레이드 (최대 3)', 1, Math.min(3, w.length), '소진');
    for (const x of sel) { g.c(x).ex = true; const t = await g.chooseTarget('attackable', '화력: 피해 3', g.idt(), false); if (t) await g.playerAttack(g.idt(), t, 3, { src: u, ranged: true }); } } } };
  S['54016'] = { play: { timing: 'hero', async resolve(g) { for (let i = 0; i < 200; i++) { const x = g.takeEncounter(); if (!x) break; g.put(x, 'ediscard'); if (g.d(x).type === 'minion') { await g.enterMinion(x, {}); break; } } if (g.canReady(g.idt())) g.c(g.idt()).ex = false; } } }; // Spoiling for a Fight
  S['54017'] = { respond: [{ window: 'minionEntered', timing: 'hero', label: '공격 태세: 버리고 [공격] 이벤트를 손으로', async resolve(g, u) { g.discard(u, '공격 태세'); await prep(g, u); await g.searchToHand(d => d.type === 'event' && (d.tr || []).includes('ATTACK'), '[공격] 이벤트'); } }] }; // Aggressive Stance
  S['54018'] = { attach: { kind: 'friendly', filter: (g, t) => tr(g, t, 'S.H.I.E.L.D') }, respond: [{ window: 'basicPowerUsed', label: '밤비노: 탄약 1 → 피해 +3, 압도', can: (g, u, ctx) => ctx.kind === 'attack' && g.c(u).on === g.idt() && (g.c(u).cnt.ammo || 0) > 0, resolve(g, u, ctx) { g.c(u).cnt.ammo--; ctx.bonus += 3; ctx.overkill = true; g.cleanupUses(u); } }, // Bambino
    { window: 'allyPowerUsed', label: '밤비노: 탄약 1 → 피해 +3, 압도', can: (g, u, ctx) => ctx.kind === 'attack' && ctx.ally === g.c(u).on && (g.c(u).cnt.ammo || 0) > 0, resolve(g, u, ctx) { g.c(u).cnt.ammo--; ctx.bonus += 3; ctx.overkill = true; g.cleanupUses(u); } }] };
  S['54019'] = { canPlay: g => tr(g, g.idt(), 'SOLDIER'), actions: [{ timing: 'hero', exhaust: true, label: '벽 위의 사나이: 교전 하수인 수만큼 다음 카드 비용 감소', can: g => g.engagedMinions().length > 0, use(g) { g.p.costRed = (g.p.costRed || 0) + g.engagedMinions().length; g.log(`다음 카드 비용 -${g.engagedMinions().length}`, 'good'); } }] }; // Man on the Wall
  const sidearm = w => ({ window: w, label: '실드 권총: 소진·탄약 1 → 적에게 피해 1', can: (g, u, ctx) => ctx.kind === 'attack' && !g.c(u).ex && (g.c(u).cnt.ammo || 0) > 0 && (w === 'basicPowerUsed' ? g.c(u).on === g.idt() : ctx.ally === g.c(u).on), async resolve(g, u) { g.c(u).ex = true; g.c(u).cnt.ammo--; g.cleanupUses(u); const t = await g.chooseTarget('enemy', '피해 1', g.idt(), false); if (t) await g.dealDamage(t, 1, { src: u, byPlayer: true }); } });
  S['54020'] = { attach: { kind: 'friendly', filter: (g, t) => tr(g, t, 'S.H.I.E.L.D') && !g.c(t).att.some(a => idOf(g, a) === '54020') }, respond: [sidearm('basicPowerUsed'), sidearm('allyPowerUsed')] }; // S.H.I.E.L.D. Sidearm
  S['54022'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { await g.playerAttack(g.idt(), ctx.target, 6, { src: u }); for (const c of g.friendlyChars()) if (/Captain America|Winter Soldier|Bucky|Steve Rogers/.test(g.d(c).en || '')) g.giveStatus(c, 'tough', '슈퍼 솔저'); } } }; // Super-Soldiers
  S['54023'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { const p = await pick(g, g.p.discard.filter(x => g.d(x).type === 'upgrade' && tr(g, x, 'PREPARATION')), '플레이 영역에 들일 [준비] 업그레이드'); if (p) g.put(p, 'upgrade'); await g.playerAttack(g.idt(), ctx.target, 4, { src: u }); } } }; // Winter, Widow, Soldier, Spy
  S['54027'] = { async whenRevealed(g, u) { await g.heroObligation(u, '레드 룸 프로그래밍', '손에서 비용이 가장 높은 카드를 버리고 그 비용만큼 간접 피해', async () => { if (g.p.hand.length) { const top = Math.max(...g.p.hand.map(x => g.d(x).cost || 0)); const t = await pick(g, g.p.hand.filter(x => (g.d(x).cost || 0) === top), '버릴 카드'); g.put(t, 'discard'); if (top) await g.indirectDamage(top, null); } if (g.c(u).zone === 'limbo') g.discard(u); }); } }; // Red Room Programming
  // Crossbones (nemesis)
  const crossbones = g => g.e.minions.find(m => idOf(g, m) === '54028') || null;
  S['54028'] = { on: { async afterEnemyAttack(g, u, ctx) { if (ctx.enemy === u && (ctx.damaged || []).some(x => x !== g.idt() && g.c(x).zone !== 'ally')) await g.placeThreat(g.e.main, 2, {}); } } };
  S['54029'] = { mod: { atk: (g, s, t) => g.c(s).zone === 'side' && g.e.minions.includes(t) && tr(g, t, 'HYDRA') ? 1 : 0, hp: (g, s, t) => g.c(s).zone === 'side' && g.e.minions.includes(t) && tr(g, t, 'HYDRA') ? 2 : 0 }, // Hydra Hit Squad
    async whenDefeated(g) { const x = g.e.deck.concat(g.e.discard).find(y => g.d(y).type === 'minion' && tr(g, y, 'HYDRA')); g.shuffle(g.e.deck); if (x) await g.reveal(x); } };
  S['54030'] = { attachTo: g => crossbones(g) || g.e.villain, async whenRevealed(g, u) { const h = g.c(u).on; if (h && g.c(h).zone) await g.activate(h, {}); }, // High-Tech Armament
    actions: [{ timing: 'hero', label: '하이테크 무장: 캐릭터 1명 소진 → 버림', can: (g, u) => g.c(u).zone === 'attach' && g.friendlyChars().some(c => !g.c(c).ex), async use(g, u) { const c = await pick(g, g.friendlyChars().filter(x => !g.c(x).ex), '소진할 캐릭터'); if (!c) return; g.c(c).ex = true; g.discard(u, '하이테크 무장 버림'); } }] };
  S['54032'] = { respond: [{ window: 'preparationResolved', label: '화이트 위도우: 그 카드 비용만큼 회복', can: (g, u, ctx) => g.c(u).dmg > 0, resolve(g, u, ctx) { g.heal(u, g.d(ctx.card).cost || 0); } }] }; // White Widow
  S['54033'] = { canPlay: g => tr(g, g.idt(), 'S.H.I.E.L.D'), attach: { kind: 'friendly' }, mod: { hp: (g, s, t) => t === g.c(s).on ? 1 : 0 }, grantTrait: (g, s, t) => t === g.c(s).on ? 'S.H.I.E.L.D' : null }; // S.H.I.E.L.D. Deputy
  // Whiteout (modular)
  const blizzard = g => g.e.minions.find(m => idOf(g, m) === '54034') || null;
  const encased = g => g.c(g.idt()).att.find(a => idOf(g, a) === '54035') || null;
  S['54034'] = { on: { async afterEnemyAttack(g, u, ctx) { if (ctx.enemy !== u) return; const tgt = ctx.damaged && ctx.damaged[0] || g.idt(); // Blizzard
    const x = g.e.deck.concat(g.e.discard).find(y => idOf(g, y) === '54035'); g.shuffle(g.e.deck); if (x && tgt === g.idt() && g.c(tgt).zone) { g.attachEnc(x, g.idt()); g.log('★ 블리자드: 얼음에 갇힘', 'warn'); } else if (g.c(tgt).zone) g.giveStatus(tgt, 'stun', '★ 블리자드'); } } };
  S['54035'] = { attachTo: g => g.idt(), // Encased in Ice: your identity can attack only this card, which anyone may attack as if it were a minion
    cannotAttack: (g, s, t, src) => g.c(s).zone === 'attach' && t !== s && (!src || src === g.c(s).on || (g.d(src).type === 'event' && g.c(s).on === g.idt())),
    attackableAsMinion: (g, s) => g.c(s).zone === 'attach',
    async asMinionDamage(g, u, n) { const c = g.c(u); c.cnt.damage = (c.cnt.damage || 0) + n; g.log(`얼음에 피해 ${n} (총 ${c.cnt.damage})`); if (c.cnt.damage >= 3) { const over = c.cnt.damage - 3, on = c.on; g.discard(u, '얼음이 깨졌습니다'); if (over && on) await g.dealDamage(on, over, {}); } return { dealt: n, excess: 0 }; } };
  S['54036'] = { on: { allyEnters(g, u, ctx) { if (g.c(u).zone === 'side' && g.c(ctx.ally).zone === 'ally') { g.c(ctx.ally).ex = true; g.log(`미끄러운 노면: ${g.nm(ctx.ally)} 소진`, 'warn'); } } } }; // Slippery Conditions
  S['54037'] = { async whenRevealed(g, u, ctx) { let b = blizzard(g); if (b) g.c(b).eng = g.s.ctx; else { const x = g.e.deck.concat(g.e.discard).find(y => idOf(g, y) === '54034'); if (x) { g.shuffle(g.e.deck); await g.enterMinion(x, {}); b = blizzard(g); } } if (b && g.c(b).zone === 'minion') await g.activate(b, {}); else ctx.surge++; }, // Whiteout
    async boostEffect(g) { if (g.c(g.idt()).stun) await g.dealDamage(g.idt(), 1, {}); else g.giveStatus(g.idt(), 'stun', '★ 화이트아웃'); } };
  MC.registerScripts(S);
})();
