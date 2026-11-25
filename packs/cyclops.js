/* Cyclops (33001-33035): Optic Blast, Tactic upgrades on enemies, Leadership X-Men cards and nemesis set.
   Ported from cards/pack/cyclops of the community build. */
(function () {
  'use strict';
  const S = {};
  const idOf = (g, u) => g.c(u).id;
  const has = (g, u, t) => g.hasTrait(u, t);
  const pick = async (g, cands, title) => !cands.length ? null : cands.length === 1 ? cands[0] : await g.ask({ type: 'target', title, cands, cancelable: false });
  const isCyc = g => ['33001a', '33001b'].includes(idOf(g, g.idt()));
  const withUpgrade = g => g.enemies().filter(e => g.c(e).att.some(a => !g.d(a).enc));
  async function dmgEnemy(g, n, title, src, attack, kind) {
    const t = await g.chooseTarget(kind || (attack ? 'attackable' : 'enemy'), title, g.idt(), false); if (!t) return null;
    if (attack) return { t, r: await g.playerAttack(g.idt(), t, n, { src }) };
    return { t, r: await g.dealDamage(t, n, { src, byPlayer: true }) };
  }
  const enemyAttach = (id, extra) => Object.assign({ attach: { kind: 'enemy', filter: (g, t) => !g.c(t).att.some(a => idOf(g, a) === id) } }, extra);
  const minionAttach = (id, extra) => Object.assign({ attach: { kind: 'minion', filter: (g, t) => !g.c(t).att.some(a => idOf(g, a) === id) } }, extra);
  const host = (g, s) => g.c(s).on;

  // ======================= identity =======================
  S['33001a'] = { actions: [{ timing: 'action', kind: 'attack', once: true, label: '옵틱 블래스트: 자원 1 → 업그레이드가 붙은 적에게 피해 3', can: g => g.isHero() && !g.heroNo('attack') && withUpgrade(g).some(e => g.targets('attackable', g.idt()).includes(e)) && (g.canAfford({ n: 1, req: '' }, null) || g.p.upgrades.some(u => idOf(g, u) === '33003' && !g.c(u).ex)),
    async use(g, u) {
      const visor = g.p.upgrades.find(x => idOf(g, x) === '33003'); const vReady = visor && !g.c(visor).ex;
      g.p.payingFor = 'opticBlast'; const paid = await g.pay({ n: 1, req: '' }, null, '옵틱 블래스트: 자원 1', false); g.p.payingFor = null; if (!paid) return;
      const byVisor = vReady && g.c(visor).ex;
      const t = await g.chooseTarget({ kind: 'attackable', filter: (gg, x) => withUpgrade(gg).includes(x) }, '옵틱 블래스트: 업그레이드가 붙은 적', g.idt(), false); if (!t) return;
      const ob = { bonus: 0, overkill: false }; await g.window('opticBlast', ob);
      await g.playerAttack(g.idt(), t, 3 + ob.bonus, { piercing: byVisor, ranged: byVisor, overkill: ob.overkill });
    } }] };
  S['33001b'] = { actions: [{ timing: 'action', once: true, label: '끊임없는 훈련: 덱에서 [전술] 업그레이드를 손으로', can: g => g.p.deck.some(x => g.d(x).type === 'upgrade' && has(g, x, 'TACTIC')), async use(g) { await g.searchToHand(d => d.type === 'upgrade' && (d.tr || []).includes('TACTIC'), '끊임없는 훈련'); } }] };

  // ======================= hero cards =======================
  S['33002'] = { async onEnter(g) { const c = g.p.discard.filter(x => g.d(x).cls === 'Hero'); const t = await pick(g, c, '피닉스: 손으로 가져올 사이클롭스 카드'); if (t) g.put(t, 'hand'); } }; // Phoenix (ally)
  S['33003'] = { resources: [{ gen: 'Y', label: '루비 쿼츠 바이저 (옵틱 블래스트용)', can: (g, u) => g.isHero() && !g.c(u).ex && g.p.payingFor === 'opticBlast', use: (g, u) => { g.c(u).ex = true; } }] }; // Ruby Quartz Visor
  S['33004'] = { keepTemporary: (g, s, u) => g.d(u).cls === 'Hero' && g.c(u).zone === 'attach' && g.e.minions.includes(g.c(u).on) }; // Field Commander
  S['33005'] = enemyAttach('33005', { on: { wouldTakeDamage(g, s, ctx) { if (ctx.target === host(g, s) && ctx.attack && !ctx.exploit) { ctx.exploit = true; ctx.amount++; } } } }); // Exploit Weakness
  S['33006'] = enemyAttach('33006', { mod: { atk: (g, s, t) => t === host(g, s) ? -1 : 0 } }); // Practiced Defense
  const priority = async g => { g.log('우선 목표: 카드 2장', 'good'); await g.draw(2); };
  S['33007'] = enemyAttach('33007', { on: { async attachedDefeated(g) { await priority(g); }, async attachedVillainDefeated(g) { await priority(g); } } }); // Priority Target
  S['33008'] = { interrupt: { window: 'opticBlast', timing: 'hero', label: '사이클롭스 소진 → 피해 +8, 압도', can: g => !g.c(g.idt()).ex, async resolve(g, u, ob) { g.c(g.idt()).ex = true; ob.bonus += 8; ob.overkill = true; } } }; // Full Blast
  S['33009'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { // Ricochet Beam
    await g.playerAttack(g.idt(), ctx.target, 3, { src: u });
    const c = withUpgrade(g); const t = await pick(g, c, '도탄 광선: 피해 3을 줄 업그레이드가 붙은 적'); if (t) await g.playerAttack(g.idt(), t, 3, { src: u });
  } } };
  S['33010'] = { play: { timing: 'hero', label: 'thwart', target: 'thwartable', async resolve(g, u, ctx) { // Tactical Brilliance
    const r = await g.removeThreat(ctx.target, 3, { src: u }); g.log(`전술의 천재성: 위협 ${r} 제거`); await g.afterThreatRemoved(ctx.target);
    const t = await pick(g, g.p.discard.filter(x => has(g, x, 'TACTIC') && x !== u), '손으로 가져올 [전술] 카드'); if (t) g.put(t, 'hand');
  } } };
  S['33027'] = { // Lost Visor
    whenRevealed(g, u) { const v = Object.keys(g.s.cards).find(x => idOf(g, x) === '33003' && ['hand', 'deck', 'discard', 'upgrade'].includes(g.c(x).zone)); if (v) { g.resetCard(v); g.put(v, 'under', u); } g.put(u, 'pobl'); g.log('잃어버린 바이저: 사이클롭스는 공격할 수 없습니다', 'warn'); },
    heroNo: { attack: (g, s) => g.c(s).zone === 'pobl' && isCyc(g) },
    actions: [{ timing: 'alter', label: '스콧 소진 → 바이저를 손으로, 이 카드 제거', can: (g, u) => g.c(u).zone === 'pobl' && !g.c(g.idt()).ex, async use(g, u) { g.c(g.idt()).ex = true; for (const v of g.c(u).under.slice()) g.put(v, 'hand'); g.removeFromGame(u); } }]
  };
  S['33028'] = { boostEffect(g) { if (g.c(g.idt()).stun) return g.dealDamage(g.idt(), 2, {}); g.giveStatus(g.idt(), 'stun', '★ 미스터 시니스터'); } }; // Mister Sinister
  S['33029'] = { async whenDefeated(g) { const x = g.searchEncounter(d => d.id === '33030'); g.shuffle(g.e.deck); if (x) await g.reveal(x); } }; // Genetic Manipulation
  S['33030'] = { attachTo: g => { const c = g.enemies().filter(e => !g.c(e).att.some(a => idOf(g, a) === '33030')); if (!c.length) return null; const lo = Math.min(...c.map(e => g.d(e).atk || 0)); return c.find(e => (g.d(e).atk || 0) === lo); }, surgeIfNoHost: true, // Gene Therapy
    attackProps: () => ({ overkill: true, piercing: true }), on: { afterEnemyAttack(g, a, ctx) { if (ctx.enemy === g.c(a).on) g.discard(a, '유전자 치료 버림'); } } };
  S['33031'] = { async whenRevealed(g) { // Concussive Force
    const m = g.e.minions.find(x => idOf(g, x) === '33028');
    if (g.isHero()) { if (m) await g.enemyAttack(m, {}); else await g.dealDamage(g.idt(), 2, {}); }
    else { if (m) await g.enemyScheme(m, {}); else await g.placeThreat(g.e.main, 2, {}); }
  } };

  // ======================= aspect cards =======================
  S['33011'] = { async onEnter(g) { await g.searchToHand(d => d.type === 'resource', '비스트', { discard: true }); } }; // Beast
  S['33012'] = { async customAttack(g, a, n, props) { // Dust
    const t = await g.chooseTarget('attackable', '더스트: 공격할 적', a, false); if (!t) return;
    if (g.d(t).type === 'minion') { g.log('★ 더스트: 모든 하수인을 공격합니다'); for (const m of g.e.minions.slice()) if (g.c(m).zone === 'minion') await g.playerAttack(a, m, n, props); if (g.c(a).zone === 'ally') await g.dealDamage(a, 1, { consequential: true }); }
    else await g.playerAttack(a, t, n, props);
  } };
  S['33014'] = { async onEnter(g) { const top = g.e.deck.slice(0, 5); if (!top.length) return; const t = await g.ask({ type: 'target', title: '블라인드폴드: 조우 덱 위 5장 중 버릴 카드', cands: top, cancelable: false }); g.put(t, 'ediscard'); g.log(`블라인드폴드: ${g.nm(t)} 버림`); } }; // Blindfold
  const training = (thw, atk, hp) => ({ attach: { kind: 'ally', filter: (g, t) => has(g, t, 'X-MEN') && !g.c(t).att.some(a => has(g, a, 'TRAINING')) }, mod: { thw: (g, s, t) => t === host(g, s) ? thw : 0, atk: (g, s, t) => t === host(g, s) ? atk : 0, hp: (g, s, t) => t === host(g, s) ? hp : 0 } });
  S['33015'] = training(1, 1, 1); // Danger Room Training
  S['33016'] = minionAttach('33016', { reduceAllyCons: true }); // Coordinated Attack
  S['33018'] = { onSpent(g, u, forUid) { if (forUid && g.d(forUid).type === 'ally') { g.addPhaseMod(forUid, 'thw', 1); g.addPhaseMod(forUid, 'atk', 1); g.log(`효율적인 리더십: ${g.nm(forUid)} 저지·공격 +1`); } } }; // Effective Leadership
  S['33019'] = { selfCostMod: g => has(g, g.idt(), 'MUTANT') || has(g, g.idt(), 'X-MEN') ? 1 : 0 }; // Angel
  S['33020'] = { allyLimit: g => g.p.allies.every(a => has(g, a, 'X-MEN')) ? 1 : 0, // Utopia
    respond: [{ window: 'allyEntered', exhaust: true, label: '소진 → [엑스맨] 캐릭터 준비', can: (g, u, ctx) => has(g, ctx.ally, 'X-MEN') && g.friendlyChars().some(f => g.c(f).ex && has(g, f, 'X-MEN')), async resolve(g) { const t = await pick(g, g.friendlyChars().filter(f => g.c(f).ex && has(g, f, 'X-MEN')), '준비시킬 [엑스맨] 캐릭터'); if (t && g.canReady(t)) g.c(t).ex = false; } }] };
  S['33021'] = { respond: [{ window: 'allyEntered', exhaust: true, label: '소진 → [훈련] 업그레이드를 그 동료에게 붙이기', can: (g, u, ctx) => !g.isHero() && has(g, ctx.ally, 'X-MEN') && !g.c(ctx.ally).att.some(a => has(g, a, 'TRAINING')) && g.p.deck.concat(g.p.discard).some(x => has(g, x, 'TRAINING')), // Danger Room
    async resolve(g, u, ctx) { const c = g.p.deck.concat(g.p.discard).filter(x => g.d(x).type === 'upgrade' && has(g, x, 'TRAINING')); const t = (await g.pickCards(c, '데인저 룸: 붙일 [훈련] 업그레이드', 1, 1, '선택'))[0]; g.shuffle(g.p.deck); if (t) { g.put(t, 'attach', ctx.ally); g.log(`${g.nm(t)} → ${g.nm(ctx.ally)}`, 'good'); } } }] };
  S['33022'] = { play: { timing: 'hero', can: g => g.p.allies.some(a => g.c(a).att.some(x => has(g, x, 'TRAINING'))), async resolve(g) { const t = await pick(g, g.p.allies.filter(a => g.c(a).att.some(x => has(g, x, 'TRAINING'))), '게임 타임: 준비시킬 동료'); if (t) { if (g.canReady(t)) g.c(t).ex = false; g.heal(t, 1); } } } }; // Game Time
  S['33023'] = { play: { timing: 'hero', async resolve(g) { // Psychic Rapport
    if (g.canReady(g.idt())) g.c(g.idt()).ex = false;
    const pf = g.p.upgrades.find(x => ['34002a', '34002b'].includes(idOf(g, x)));
    const opts = [{ id: 'card', label: '버림 더미의 사이클롭스 카드를 손으로' }]; if (pf) opts.push({ id: 'pow', label: '피닉스 포스에 힘 카운터 2' });
    const k = opts.length === 1 ? 'card' : await g.ask({ type: 'choice', title: '정신적 교감', options: opts });
    if (k === 'pow' && MC.phoenixPower) MC.phoenixPower(g, 2); else { const t = await pick(g, g.p.discard.filter(x => g.d(x).cls === 'Hero'), '손으로 가져올 카드'); if (t) g.put(t, 'hand'); }
  } } };
  S['33032'] = minionAttach('33032', { attacksGainOverkill: true }); // Marked
  S['33033'] = minionAttach('33033', { atkVs: (g, s, me, enemy) => enemy === host(g, s) ? (g.stat(me, 'thw') || 0) - (g.stat(me, 'atk') || 0) : 0 }); // Befuddle
  S['33034'] = minionAttach('33034', { mod: { atk: (g, s, t) => t === host(g, s) ? -2 : 0 } }); // Pinned Down
  S['33035'] = { canPlay: g => has(g, g.idt(), 'X-MEN'), attach: { kind: 'friendly', filter: (g, t) => !g.c(t).att.some(a => idOf(g, a) === '33035') && !(t === g.idt() && g.p.upgrades.some(a => idOf(g, a) === '33035')) }, // Honorary X-Men
    mod: { hp: (g, s, t) => (t === host(g, s) || (g.c(s).zone === 'upgrade' && t === g.idt())) ? 1 : 0 }, grantTrait: (g, s, t) => (t === host(g, s) || (g.c(s).zone === 'upgrade' && t === g.idt())) ? 'X-MEN' : null };

  MC.registerScripts(S);
})();
