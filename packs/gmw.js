/* Galaxy's Most Wanted (16001-16149): Groot, Rocket Raccoon, five scenarios (Brotherhood of Badoon,
   Infiltrate the Museum, Escape the Museum, Nebula, Ronan) and their encounter sets.
   Ported from cards/pack/gmw of the community build. The campaign (market cards, challenge side schemes) is at the end of the file. */
(function () {
  'use strict';
  const S = {};
  const idOf = (g, u) => g.c(u).id;
  const findIn = (arr, g, id) => arr.find(u => g.c(u).id === id) || null;
  async function dmgEnemy(g, n, title, src, attack) {
    const t = await g.chooseTarget(attack ? 'attackable' : 'enemy', title, src, false); if (!t) return null;
    if (attack) await g.playerAttack(g.idt(), t, n, { src }); else await g.dealDamage(t, n, { src, byPlayer: true });
    return t;
  }
  async function choose(g, title, options) { const ok = options.filter(o => !o.can || o.can()); if (!ok.length) return null; const id = ok.length === 1 ? ok[0].id : await g.ask({ type: 'choice', title, options: ok.map(o => ({ id: o.id, label: o.label })) }); const o = ok.find(x => x.id === id) || ok[0]; await o.run(); return o.id; }
  const facedown = (g, n) => { for (let i = 0; i < (n || 1); i++) { const x = g.takeEncounter(); if (x) { g.put(x, 'facedown'); g.log('조우 카드 1장을 뒷면으로 받았습니다', 'warn'); } } };
  async function untilMinion(g, pred, label) {
    const u = g.discardEncounterUntil((d, x) => d.type === 'minion' && (!pred || pred(d, x)));
    if (!u) g.log(`${label}: 조건에 맞는 하수인이 없습니다`); return u;
  }
  const randomDiscard = (g, n) => g.discardRandomHand(n);
  const spendTypes = (g, letters, title) => g.pay({ n: letters.length, req: letters }, null, title, true);

  // ---------------- the Milano (Ship Command): a permanent support the first player controls ----------------
  const milano = g => { for (const p of g.s.ps) { const m = findIn(p.supports, g, '16142'); if (m) return m; } return null; };
  const isFirst = g => g.s.ctx === g.s.first;
  const milanoReady = g => { const m = milano(g); return !!m && !g.c(m).ex; };
  const exhaustMilano = g => { const m = milano(g); if (m) { g.c(m).ex = true; g.log('밀라노 소진'); } };
  const milanoAct = (label, fn, can) => ({ timing: 'action', label: `밀라노 소진 → ${label}`, can: (g, u) => isFirst(g) && milanoReady(g) && (!can || can(g, u)), async use(g, u) { exhaustMilano(g); await fn(g, u); } });
  const milanoThwart3 = milanoAct('이 음모에서 위협 3 제거', async (g, u) => { const r = await g.removeThreat(u, 3, { src: milano(g) }); g.log(`${g.nm(u)} 위협 ${r} 제거`); await g.afterThreatRemoved(u); }, (g, u) => g.c(u).threat > 0);
  S['16142'] = {
    resources: [{ gen: 'G', label: '밀라노 (소진)', can: (g, u) => !g.c(u).ex, use: (g, u) => { g.c(u).ex = true; } }],
    on: { firstPlayerChanged(g, u, ctx) { const fp = ctx.first; if (g.c(u).zone === 'support' && g.c(u).ctrl !== fp && g.s.ps[fp] && !g.s.ps[fp].eliminated) { g.withPlayerSync(fp, () => g.put(u, 'support')); g.log(`밀라노 조종권 → ${g.playerName(fp)}`, 'sys'); } } }
  };
  async function putMilanoIntoPlay(g) {
    const m = g.e.deck.concat(g.e.discard, g.e.aside).find(u => g.c(u).id === '16142');
    if (m) await g.withPlayer(g.s.first, () => { g.put(m, 'support'); g.log(`밀라노가 ${g.playerName(g.s.first)}의 통제 하에 플레이에 들어옵니다`, 'good'); });
  }

  // ---------------- the Power Stone ----------------
  const powerStone = g => Object.keys(g.s.cards).find(u => g.c(u).id === '16149' && g.c(u).zone === 'attach') || null;
  const stoneOn = g => { const p = powerStone(g); return p ? g.c(p).on : null; };
  const youControlStone = g => stoneOn(g) === g.idt();
  function attachStone(g, to) {
    const p = powerStone(g) || Object.keys(g.s.cards).find(u => g.c(u).id === '16149' && g.c(u).zone) || null;
    if (!p || !to || g.c(p).on === to) return false;
    if (g.c(p).on === g.e.villain && g.e.sides.some(s => idOf(g, s) === '16113') && to !== g.e.villain) { g.log('우월한 전술: 파워 스톤을 떼어낼 수 없습니다'); return false; }
    g.put(p, 'attach', to); g.log(`파워 스톤 → ${g.nm(to)}`, 'warn'); return true;
  }
  S['16149'] = { on: { attackDealt(g, a, ctx) { // after a hero or villain deals 3+ damage to the holder with one attack, it takes the stone
    if (ctx.target !== g.c(a).on || ctx.dealt < 3) return;
    const api = g.identityPlayer(ctx.attacker);
    if (api >= 0 && g.withPlayerSync(api, () => g.isHero())) attachStone(g, ctx.attacker);
    else if (ctx.attacker === g.e.villain) attachStone(g, g.e.villain);
  } } };

  // ======================= Groot =======================
  const growth = g => g.c(g.idt()).cnt.growth || 0;
  const addGrowth = (g, n) => { const c = g.c(g.idt()).cnt; const b = c.growth || 0; c.growth = Math.min(10, b + n); g.log(`그루트: 성장 카운터 ${c.growth - b}개 (현재 ${c.growth})`); };
  const takeGrowth = (g, n) => { const c = g.c(g.idt()).cnt; const r = Math.min(n, c.growth || 0); c.growth = (c.growth || 0) - r; return r; };
  const isGroot = g => ['16001a', '16001b'].includes(idOf(g, g.idt()));
  S['16001a'] = { on: { wouldTakeDamage(g, u, ctx) { // Flora Colossus
    if (ctx.target !== u) return; const want = ctx.amount - ctx.prevent; if (want <= 0) return;
    const r = takeGrowth(g, want); if (r) { ctx.prevent += r; g.log(`플로라 콜로서스: 성장 카운터 ${r}개 제거, 피해 ${r} 방지`, 'good'); }
  } } };
  S['16001b'] = { actions: [{ timing: 'alter', once: true, label: '성장 카운터 2개 (최대 10)', can: g => growth(g) < 10, async use(g) { addGrowth(g, 2); } }] };
  S['16002'] = { play: { timing: 'action', can: g => isGroot(g) && growth(g) < 10, async resolve(g) { addGrowth(g, 2); } } }; // Fruition
  S['16003'] = { play: { timing: 'hero', label: 'thwart', target: 'thwartable', can: g => growth(g) > 0, async resolve(g, u, ctx) { // "I am Groot"
    const r = await g.removeThreat(ctx.target, growth(g), { src: u }); g.log(`"난 그루트다": ${g.nm(ctx.target)} 위협 ${r} 제거`); await g.afterThreatRemoved(ctx.target);
  } } };
  S['16004'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', can: g => growth(g) > 0, async resolve(g, u, ctx) { await g.playerAttack(g.idt(), ctx.target, growth(g), {}); } } }; // "I. AM. GROOT!"
  S['16005'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { // Root Stomp
    const r = await g.playerAttack(g.idt(), ctx.target, 5, {}); if (r && r.defeated && isGroot(g)) addGrowth(g, 1);
  } } };
  S['16006'] = { play: { timing: 'hero', can: g => growth(g) > 0, async resolve(g) { // "We Are Groot"
    const max = Math.min(4, growth(g));
    const c = g.allFriendlyChars().filter(f => !g.c(f).tough);
    const sel = await g.ask({ type: 'select', title: `강인함을 줄 아군 (최대 ${max}, 1명당 성장 카운터 1개)`, cards: c, min: 0, max: Math.min(max, c.length), confirm: '확정' });
    takeGrowth(g, (sel || []).length); (sel || []).forEach(f => g.giveStatus(f, 'tough', '"우린 그루트다"'));
  } } };
  S['16007'] = { actions: [{ timing: 'alter', exhaust: true, label: '소진 → 성장 카운터 1개, 카드 1장 뽑기', async use(g) { if (isGroot(g)) addGrowth(g, 1); await g.draw(1); } }] }; // Fertile Ground
  const vine = (window, kind, label, n, apply) => ({ respond: [{ window, timing: 'hero', exhaust: true, label, can: (g, u, ctx) => (!kind || ctx.kind === kind) && growth(g) >= n,
    async resolve(g, u, ctx) { takeGrowth(g, n); await apply(g, ctx); } }] });
  S['16008'] = vine('basicPowerUsed', 'thwart', '성장 카운터 1개 제거·소진 → 이번 저지 +2', 1, (g, ctx) => { ctx.bonus += 2; }); // Entangling Vines
  S['16009'] = vine('afterBasicPower', null, '성장 카운터 2개 제거·소진 → 그루트 준비', 2, g => { const id = g.idt(); if (g.canReady(id)) { g.c(id).ex = false; g.log(`${g.nm(id)} 준비`); } }); // Lashing Vines
  S['16010'] = vine('heroDefends', null, '성장 카운터 1개 제거·소진 → 이번 방어 +3', 1, (g, hd) => { hd.defBonus += 3; }); // Vine Shield
  S['16011'] = vine('basicPowerUsed', 'attack', '성장 카운터 1개 제거·소진 → 이번 공격 +2', 1, (g, ctx) => { ctx.bonus += 2; }); // Vine Spikes
  S['16025'] = { async whenRevealed(g, u, ctx) { // Wilt
    await g.heroObligation(u, '시듦', '그루트의 성장 카운터 3개 제거 (없으면 쇄도) → 이 카드 버림', async () => {
      const r = takeGrowth(g, 3); g.log(`시듦: 성장 카운터 ${r}개 제거`); if (!r) { g.log('제거한 카운터가 없어 쇄도'); ctx.surge++; }
      if (g.c(u).zone === 'limbo') g.discard(u);
    });
  } };
  S['16026'] = { on: { async villainPhaseBegins(g, u) { g.log('타오르는 불길: 각 플레이어 간접 피해 2'); await g.forEachPlayer(() => g.indirectDamage(2, u)); } } }; // Blazing Inferno
  const furnax = async (g, u, ctx) => { if (ctx.enemy === u && g.c(u).zone) { g.log('퍼낵스: 각 플레이어 간접 피해 2'); await g.forEachPlayer(() => g.indirectDamage(2, u)); } };
  S['16027'] = { on: { afterEnemyAttack: furnax, afterEnemyScheme: furnax } }; // Furnax
  S['16028'] = { async whenRevealed(g, u) { // Fan the Flames
    let n = 2; if (g.e.sides.some(x => idOf(g, x) === '16026')) n++; if (g.e.minions.some(x => idOf(g, x) === '16027')) n++;
    await g.indirectDamage(n, u);
  } };

  // ======================= Rocket Raccoon =======================
  const techUps = g => g.controlled().filter(x => g.d(x).type === 'upgrade' && g.hasTrait(x, 'TECH'));
  const withCharge = n => ({ onEnter(g, u) { g.c(u).cnt.charge = n; } });
  S['16029a'] = { // "Murdered You!"; Schadenfreude heals
    respond: [{ window: 'excessDealt', label: '"죽여버렸지!": 카드 1장 뽑기', async resolve(g) { await g.draw(1); } }],
    on: { afterTakeDamage(g, u, ctx) { if (g.p.phase.schadenfreude && ctx.byPlayer && ['villain', 'minion'].includes(g.d(ctx.target).type) && g.c(u).dmg > 0) { const h = g.heal(u, 2); g.log(`남의 불행: 피해 ${h} 회복`); } } }
  };
  S['16029b'] = { actions: [{ timing: 'alter', once: true, label: '내 [기술] 업그레이드 1장 버림 → 2장 뽑기', can: g => techUps(g).length > 0, async use(g) { // Tinkering
    const c = techUps(g); const t = c.length === 1 ? c[0] : await g.ask({ type: 'target', title: '버릴 기술 업그레이드', cands: c, cancelable: false });
    g.discard(t, `${g.nm(t)} 버림`); await g.draw(2);
  } }] };
  S['16030'] = { interrupt: { window: 'afterBasicPower', timing: 'hero', can: (g, u, ctx) => ctx.kind === 'thwart', async resolve(g) { // I've Got a Plan
    const id = g.idt(); if (g.canReady(id)) { g.c(id).ex = false; g.log(`${g.nm(id)} 준비`); }
    g.addPhaseMod(id, 'thw', 1);
  } } };
  S['16031'] = { play: { timing: 'hero', can: g => techUps(g).some(x => g.c(x).ex), async resolve(g) { techUps(g).forEach(x => { g.c(x).ex = false; }); g.log('재장전: 기술 업그레이드 모두 준비'); } } }; // Reload
  S['16032'] = { play: { timing: 'hero', async resolve(g) { g.p.phase.schadenfreude = true; g.log('남의 불행: 이번 턴 동안 적에게 피해를 줄 때마다 피해 2 회복', 'good'); } } }; // Schadenfreude
  S['16033'] = { async onSpent(g) { // Salvage
    const c = g.p.discard.filter(x => g.d(x).type === 'upgrade' && (g.d(x).tr || []).includes('TECH')); if (!c.length) return;
    const t = c.length === 1 ? c[0] : await g.ask({ type: 'target', title: '폐품 회수: 덱 맨 위에 놓을 기술 업그레이드', cands: c, cancelable: true });
    if (t) { g.put(t, 'deck', null, true); g.log(`폐품 회수: ${g.nm(t)}을(를) 덱 맨 위로`); }
  } };
  S['16034'] = Object.assign(withCharge(2), { actions: [{ timing: 'action', exhaust: true, label: '소진 → 충전 카운터 1개를 다른 기술 업그레이드로', // Battery Pack
    can: (g, u) => (g.c(u).cnt.charge || 0) > 0 && techUps(g).some(x => x !== u),
    async use(g, u) { const c = techUps(g).filter(x => x !== u); const t = c.length === 1 ? c[0] : await g.ask({ type: 'target', title: '충전 카운터를 옮길 업그레이드', cands: c, cancelable: false }); g.c(u).cnt.charge--; g.c(t).cnt.charge = (g.c(t).cnt.charge || 0) + 1; } }] });
  S['16035'] = { mod: { hp: (g, self, t) => t === g.idt() && g.c(self).zone ? 3 : 0, atk: (g, self, t) => t === g.idt() && g.isHero() ? 1 : 0 } }; // Cybernetic Skeleton
  const chargeShot = (label, fn, extra) => Object.assign(withCharge(extra && extra.charge || 2), { actions: [{ timing: 'hero', exhaust: true, label, can: (g, u) => (g.c(u).cnt.charge || 0) > 0 && (!extra || !extra.can || extra.can(g)),
    async use(g, u) { g.c(u).cnt.charge--; await fn(g, u); } }] });
  S['16036'] = chargeShot('소진·충전 1 → 적에게 피해 4 (압도·원거리)', async (g, u) => { if (await g.statusBlocks('attack')) return; const t = await g.chooseTarget('attackable', '입자 캐논: 대상', u, false); if (t) await g.playerAttack(g.idt(), t, 4, { overkill: true, ranged: true }); }, { can: g => g.targets('attackable').length > 0 }); // Particle Cannon
  S['16037'] = chargeShot('소진·충전 1 → 선택한 플레이어와 교전 중인 하수인과 빌런에게 피해 2', async (g, u) => { const pi = await g.choosePlayer('로켓 발사기: 대상 플레이어'); if (g.e.villain) await g.dealDamage(g.e.villain, 2, { src: u, byPlayer: true }); for (const m of g.engagedMinions(pi).slice()) await g.dealDamage(m, 2, { src: u, byPlayer: true }); }); // Rocket Launcher
  S['16038'] = chargeShot('소진·충전 1 → 적에게 피해 2', async (g, u) => { if (await g.statusBlocks('attack')) return; const t = await g.chooseTarget('attackable', '로켓의 권총: 대상', u, false); if (t) await g.playerAttack(g.idt(), t, 2, {}); }, { charge: 3, can: g => g.targets('attackable').length > 0 }); // Rocket's Pistol
  S['16039'] = { mod: { thw: (g, self, t) => t === g.idt() && g.isHero() ? 1 : 0 }, grantTrait: (g, self, t) => t === g.idt() && g.isHero() ? 'AERIAL' : null }; // Thruster Boots
  S['16053'] = { async whenRevealed(g, u, ctx) { // Crisis on Halfworld
    await g.heroObligation(u, '하프월드의 위기', '비용이 가장 높은 업그레이드 1장 버림 (없으면 쇄도) → 이 카드 버림', async () => {
      const ups = g.controlled().filter(x => g.d(x).type === 'upgrade');
      if (!ups.length) { g.log('버릴 업그레이드가 없어 쇄도'); ctx.surge++; }
      else { const top = Math.max(...ups.map(x => g.d(x).cost || 0)); const c = ups.filter(x => (g.d(x).cost || 0) === top); const t = c.length === 1 ? c[0] : await g.ask({ type: 'target', title: '버릴 업그레이드', cands: c, cancelable: false }); g.discard(t, `${g.nm(t)} 버림`); }
      if (g.c(u).zone === 'limbo') g.discard(u);
    });
  } };
  S['16056'] = { attachTo: g => findIn(g.e.minions, g, '16055') || g.e.villain, // Blackjack's Bazooka
    actions: [{ timing: 'hero', label: '[정신][정신][정신] → 이 카드 버리기', cost: { n: 3, req: 'BBB' }, async use(g, u) { g.discard(u, '블랙잭의 바주카 버림'); } }] };
  S['16057'] = { async whenRevealed(g) { const m = await untilMinion(g, null, '행성 침공'); if (m) { await g.reveal(m); if (g.c(m).zone === 'minion') g.giveStatus(m, 'tough', '행성 침공'); } } }; // Planetary Invasion

  // ======================= Protection / Aggression / Basic =======================
  S['16012'] = { wouldBeDefeated(g, u, w) { if (w.exact && g.c(u).zone === 'ally') { w.saved = true; g.resetCard(u); g.put(u, 'hand'); g.log('스타호크: 손으로 돌아갑니다', 'good'); } } }; // Starhawk
  const fullHp = g => g.hpLeft(g.idt()) >= (g.d(g.idt()).hp || 0);
  S['16014'] = { play: { timing: 'hero', label: 'attack', can: g => !!g.e.villain && g.targets('attackable').includes(g.e.villain), async resolve(g) { await g.playerAttack(g.idt(), g.e.villain, fullHp(g) ? 5 : 2, {}); } } }; // Fighting Fit
  S['16016'] = { mod: { retaliate: (g, self, t) => t === g.idt() && g.isHero() && fullHp(g) ? 1 : 0 } }; // Dauntless
  S['16017'] = { respond: [{ window: 'afterHeroDefends', timing: 'hero', exhaust: true, label: '소진 → 주 음모 위협 1 제거', can: (g, u, ctx) => ctx.noDamage && g.c(g.e.main).threat > 0, async resolve(g, u) { await g.removeThreat(g.e.main, 1, { src: u }); } }] }; // Hard to Ignore
  const guardianOnly = g => g.hasTrait(g.idt(), 'GUARDIAN');
  S['16019'] = { canPlay: guardianOnly, respond: [{ window: 'allyPowerUsed', label: '하수인 공격: 공격 +3, 압도', can: (g, u, ctx) => ctx.ally === u && ctx.kind === 'attack' && g.d(ctx.target).type === 'minion', // Rocket Raccoon (ally)
    async resolve(g, u, ctx) { ctx.bonus += 3; ctx.overkill = true; } }] };
  S['16020'] = { play: { timing: 'hero', async resolve(g) { // Flora and Fauna
    const opts = [];
    if (isGroot(g)) opts.push({ id: 'groot', label: '그루트: 성장 카운터 2개, 준비', run: async () => { addGrowth(g, 2); if (g.canReady(g.idt())) g.c(g.idt()).ex = false; } });
    const ups = techUps(g).filter(x => (g.d(x).tr || []).length && ['16034', '16036', '16037', '16038'].includes(idOf(g, x)));
    if (ups.length) opts.push({ id: 'rocket', label: '로켓 업그레이드: 충전 카운터 2개, 준비', run: async () => { const t = ups.length === 1 ? ups[0] : await g.ask({ type: 'target', title: '충전할 업그레이드', cands: ups, cancelable: false }); g.c(t).cnt.charge = (g.c(t).cnt.charge || 0) + 2; g.c(t).ex = false; } });
    await choose(g, '식물과 동물', opts);
  } } };
  S['16024'] = { // Deft Focus
    actions: [{ timing: 'hero', exhaust: true, label: '소진 → 이번 턴 다음 [슈퍼파워] 카드 비용 1 감소', async use(g) { g.p.phase.deftFocus = true; } }],
    costMod: (g, self, uid) => g.p.phase.deftFocus && (g.d(uid).tr || []).includes('SUPERPOWER') ? 1 : 0,
    costUsed: g => { g.p.phase.deftFocus = false; }
  };
  S['16040'] = { respond: [{ window: 'afterBasicPower', timing: 'hero', label: '버그 피해 1 회복', can: (g, u, ctx) => ctx.kind === 'attack' && g.c(u).dmg > 0, async resolve(g, u) { g.heal(u, 1); } }] }; // Bug
  S['16043'] = { play: { timing: 'hero', label: 'thwart', async resolve(g, u) { // Looking for Trouble
    const m = await untilMinion(g, null, '말썽 찾기'); if (!m) return;
    await g.enterMinion(m, {}, true);
    if (g.e.main) { const r = await g.removeThreat(g.e.main, 3, { src: u }); g.log(`말썽 찾기: 주 음모 위협 ${r} 제거`); }
  } } };
  S['16045'] = { respond: [{ window: 'heroAttackExcess', timing: 'hero', label: '남은 피해 +1', async resolve(g, u, ctx) { ctx.excess++; } }] }; // Follow Through
  S['16046'] = { respond: [{ window: 'basicPowerUsed', timing: 'hero', exhaust: true, label: '소진·충전 1 → 이번 공격 +2, 압도', can: (g, u, ctx) => ctx.kind === 'attack' && (g.c(u).cnt.charge || 0) > 0, // Hand Cannon
    async resolve(g, u, ctx) { g.c(u).cnt.charge--; ctx.bonus += 2; ctx.overkill = true; g.cleanupUses(u); } }] };
  S['16047'] = { canPlay: guardianOnly, respond: [{ window: 'afterAllyDefends', label: '그루트 피해 2 회복', can: (g, u, ctx) => ctx.ally === u && g.c(u).dmg > 0, async resolve(g, u) { g.heal(u, 2); } }] }; // Groot (ally)
  S['16052'] = { canPlay: guardianOnly, respond: [{ window: 'wouldTakeAttackDamage', timing: 'hero', exhaust: true, label: '소진·덱 맨 위 1장 버림 → 피해 1 방지', can: (g, u, ctx) => ctx.amount - ctx.prevent > 0, // Booster Boots
    async resolve(g, u, ctx) { if (!g.p.deck.length) await g.reshuffleDeck(); if (g.p.deck[0]) g.put(g.p.deck[0], 'discard'); ctx.prevent++; } }] };

  // ======================= Brotherhood of Badoon =======================
  async function chargeUp(g) {
    const ship = findIn(g.e.env, g, '16063'); if (!ship) return;
    const c = g.c(ship).cnt; c.barrage = (c.barrage || 0) + 1; g.log(`바둔 함선 충전: 포격 카운터 ${c.barrage}`, 'warn');
    if (c.barrage >= 4) { g.log('바둔 함선 포격: 각 플레이어 간접 피해 2', 'warn'); c.barrage = 0; await g.forEachPlayer(() => g.indirectDamage(2, ship)); }
  }
  const afterSchemeCharge = { on: { async afterEnemyScheme(g, u, ctx) { if (ctx.enemy === u) await chargeUp(g); } } };
  S['16058'] = afterSchemeCharge;
  S['16059'] = Object.assign({ async whenRevealed(g) { // Drang II
    const v = g.e.villain; const sp = Object.keys(g.s.cards).find(u => idOf(g, u) === '16064' && g.c(u).zone === 'attach');
    if (sp) g.giveFacedownBoost(1);
    else { const x = g.e.deck.concat(g.e.discard).find(u => idOf(g, u) === '16064'); if (x) { await g.reveal(x); } g.shuffle(g.e.deck); }
  } }, afterSchemeCharge);
  const afterActivateCharge = async (g, u, ctx) => { if (ctx.enemy === u) await chargeUp(g); };
  S['16060'] = { on: { afterEnemyAttack: afterActivateCharge, afterEnemyScheme: afterActivateCharge }, async whenRevealed(g) { // Drang III
    const cards = g.discardEncounterN(4 * g.players);
    for (const x of cards) if (g.d(x).type === 'minion') await g.enterMinion(x, {}, true);
  } };
  S['16061a'] = { async setup(g) { const ship = g.e.aside.find(u => idOf(g, u) === '16063'); if (ship) await g.enterEnv(ship); await putMilanoIntoPlay(g); } };
  S['16061b'] = { on: { async mainStep1(g) { await chargeUp(g); } }, actions: [milanoThwart3] };
  S['16062a'] = { async whenRevealed(g) { await chargeUp(g); } }; // Defend the Planet: resolve the Badoon Ship's Charge Up
  S['16062b'] = { on: { async mainStep1(g) { await chargeUp(g); } }, actions: [
    milanoThwart3,
    milanoAct('하수인에게 피해 3', async (g, u) => { const t = await g.chooseTarget('minion', '피해 3을 줄 하수인', u, false); if (t) await g.dealDamage(t, 3, { src: milano(g), byPlayer: true }); }, g => g.e.minions.length > 0)] };
  S['16064'] = { attachTo: g => g.e.villain, grantStalwart: true, // Drang's Spear
    actions: [{ timing: 'hero', label: '[정신][물리][물리] → 이 카드 버리기', cost: { n: 3, req: 'BRR' }, async use(g, u) { g.discard(u, '드랑의 창 버림'); } }] };
  S['16065'] = { // Badoon Engineer
    on: { async minionEnters(g, u, ctx) { if (ctx.minion === u) await chargeUp(g); }, afterEnemyAttack: afterActivateCharge, afterEnemyScheme: afterActivateCharge },
    async boostEffect(g) { await chargeUp(g); }
  };
  S['16066'] = { actions: [milanoThwart3] }; // Blockade
  S['16067'] = { on: { async mainStep1(g) { await chargeUp(g); } }, actions: [milanoThwart3] }; // Bombardment
  S['16068'] = { actions: [milanoThwart3] }; // Oppressive Armada
  S['16069'] = { actions: [milanoThwart3] }; // Spatial Positioning

  // ======================= Infiltrate the Museum (Collector I-III) =======================
  const coll = g => (g.e.coll = g.e.coll || []);
  const COLLECTOR1 = ['16070', '16071', '16072'];
  const IN_PLAY = ['ally', 'support', 'upgrade', 'attach', 'minion', 'side', 'env', 'pobl'];
  function toCollection(g, u) {
    for (const a of g.c(u).att.slice()) g.discard(a);
    g.resetCard(u); g.put(u, 'coll'); g.log(`${g.nm(u)} → 콜렉션 (${coll(g).length}장)`, 'warn');
    if (coll(g).length >= 5 * g.players && !g.e.collLocked) g.lose(`콜렉션에 카드가 ${coll(g).length}장 모였습니다`);
  }
  const topToCollection = g => { const x = g.p.deck[0]; if (x) toCollection(g, x); else g.log('덱이 비어 콜렉션에 넣을 카드가 없습니다'); };
  MC.scenarios.infiltrate_the_museum = Object.assign(MC.scenarios.infiltrate_the_museum || {}, {
    discardInstead(g, u, zone) {
      const v = g.e.villain; if (!v || !COLLECTOR1.includes(idOf(g, v)) || !IN_PLAY.includes(zone)) return false;
      toCollection(g, u);
      if (idOf(g, v) === '16072' && g.e.main) { g.c(g.e.main).threat++; g.log('콜렉터 III: 주 음모에 위협 1'); g.e.recheck = true; }
      return true;
    }
  });
  S['16071'] = { async whenRevealed(g) { // Collector II
    await g.forEachPlayer(async () => {
      await choose(g, `콜렉터(${g.playerName()}): 하나를 고르세요`, [
        { id: 'top', label: '덱 맨 위 카드를 콜렉션에', can: () => g.p.deck.length > 0, run: async () => topToCollection(g) },
        { id: 'dmg', label: '피해 3', run: async () => { await g.dealDamage(g.idt(), 3, { src: g.e.villain }); } }]);
    });
  } };
  S['16072'] = { async whenRevealed(g) { await g.forEachPlayer(() => { topToCollection(g); }); if (g.e.main) await g.placeThreat(g.e.main, coll(g).length, {}); } }; // Collector III
  S['16073a'] = { async setup(g) { await g.forEachPlayer(() => { topToCollection(g); }); } };
  S['16073b'] = { actions: [{ timing: 'hero', label: '히어로 소진 또는 자원 2 → 콜렉션 카드 1장을 주인의 버림 더미로', can: g => coll(g).length > 0 && !g.e.collLocked && !g.p.usedOnce.grandColl && (!g.c(g.idt()).ex || g.canAfford({ n: 2, req: '' }, null)),
    async use(g) {
      const opts = [];
      if (!g.c(g.idt()).ex) opts.push({ id: 'ex', label: '히어로 소진', run: async () => { g.c(g.idt()).ex = true; return true; } });
      if (g.canAfford({ n: 2, req: '' }, null)) opts.push({ id: 'pay', label: '자원 2 지불', run: async () => !!(await g.pay({ n: 2, req: '' }, null, '콜렉션: 자원 2', true)) });
      const id = opts.length === 1 ? opts[0].id : await g.ask({ type: 'choice', title: '대가', options: opts.map(o => ({ id: o.id, label: o.label })) });
      if (!(await (opts.find(o => o.id === id) || opts[0]).run())) return;
      g.p.usedOnce.grandColl = true;
      const t = await g.ask({ type: 'target', title: '콜렉션에서 꺼낼 카드', cands: coll(g).slice(), cancelable: false });
      g.discard(t, `${g.nm(t)}을(를) 콜렉션에서 버림 더미로`);
    } }] };
  S['16074'] = { attachTo: g => g.e.villain, // Biogram Image
    on: { async wouldTakeDamage(g, a, ctx) {
      if (ctx.target !== g.c(a).on || ctx.amount - ctx.prevent <= 0) return;
      const n = ctx.amount - ctx.prevent; ctx.prevent = ctx.amount;
      toCollection(g, a); g.log(`생체 이미지: 피해 ${n} 방지, 주 음모에 위협 ${n}`, 'warn');
      if (g.e.main) await g.placeThreat(g.e.main, n, {});
    } },
    boostEffect(g, u, ctx) { (ctx.revealAfter = ctx.revealAfter || []).push(u); }
  };
  S['16076'] = { // Inconspicuous Box
    async whenRevealed(g, u, ctx) {
      const c = g.controlled(); if (!c.length) { g.log('통제하는 카드가 없어 쇄도'); ctx.surge++; return; }
      const low = Math.min(...c.map(x => g.d(x).cost || 0)); const cc = c.filter(x => (g.d(x).cost || 0) === low);
      const t = cc.length === 1 ? cc[0] : await g.ask({ type: 'target', title: '콜렉션에 넣을 카드 (비용이 가장 낮은 카드)', cands: cc, cancelable: false });
      toCollection(g, t);
    },
    boostEffect(g) { if (coll(g).length <= 3 * g.players) topToCollection(g); }
  };
  S['16077'] = { async whenRevealed(g) { // View the Cosmos
    if (!g.p.hand.length) return;
    const top = Math.max(...g.p.hand.map(x => g.d(x).cost || 0)); const c = g.p.hand.filter(x => (g.d(x).cost || 0) === top);
    const pick = async () => c.length === 1 ? c[0] : await g.ask({ type: 'target', title: '비용이 가장 높은 카드', cands: c, cancelable: false });
    await choose(g, '우주 감상: 하나를 고르세요', [
      { id: 'coll', label: '손에서 비용이 가장 높은 카드를 콜렉션에', run: async () => toCollection(g, await pick()) },
      { id: 'disc', label: '그 카드를 버리고 그 비용만큼 주 음모에 위협', run: async () => { const t = await pick(); g.put(t, 'discard'); g.log(`${g.nm(t)} 버림`); const n = g.d(t).cost || 0; if (n && g.e.main) await g.placeThreat(g.e.main, n, {}); } }]);
  } };
  S['16078'] = { // Stay Awhile
    async whenRevealedAlter(g) {
      const cost = { n: 2, req: 'RR' };
      await choose(g, '머물러 가게: 하나를 고르세요', [
        { id: 'pay', label: '[물리][물리] 지불', can: () => g.canAfford(cost, null), run: async () => { if (!(await g.pay(cost, null, '[물리][물리]', false))) topToCollection(g); } },
        { id: 'top', label: '덱 맨 위 카드를 콜렉션에', run: async () => topToCollection(g) }]);
    },
    async whenRevealedHero(g) { if (!g.e.villain) return; const r = await g.enemyAttack(g.e.villain, { atkBonus: 1 }); if (r && r.damaged && r.damaged.includes(g.idt())) topToCollection(g); }
  };
  S['16075'] = {}; // Monarch Starstalker (Villainous from data)

  // ======================= Escape the Museum (Collector A/B) =======================
  const mainStage = g => (g.e.mainIdx || 0) + 1;
  const collector2 = { mod: { atk: (g, self, t) => t === self ? mainStage(g) : 0, sch: (g, self, t) => t === self ? mainStage(g) : 0 },
    async wouldBeDefeated(g, u, w) {
      w.saved = true;
      await g.flipVillain({ noReveal: true });
      if (g.e.main) { const r = await g.removeThreat(g.e.main, 3 * g.players, { src: u, ignoreCrisis: true }); g.log(`콜렉터: 쓰러지는 대신 주 음모 위협 ${r} 제거, 뒤집힘`, 'good'); }
    } };
  const collectorWounded = { wouldBeDefeated(g, u, w) { w.saved = true; }, on: { roundEnd(g, u) { if (g.e.villain !== u) return; g.flipFace(u); g.e.villainSide = g.e.villainSide ? 0 : 1; g.c(u).dmg = 0; g.log(`${g.nm(u)}: 라운드 종료 — 다시 뒤집고 체력 회복`, 'warn'); } } };
  S['16080a'] = collector2; S['16081a'] = collector2; S['16080b'] = collectorWounded; S['16081b'] = collectorWounded;
  // removing the last threat from stages 1 and 2 advances (players win by advancing); no threat on stage 3 wins
  async function afterMainThreat(g) {
    const m = g.e.main; if (!m || g.c(m).threat > 0) return;
    const id = idOf(g, m);
    if (id === '16082b' || id === '16083b') { g.log('마지막 위협을 제거해 주 음모가 다음 단계로', 'good'); await g.setMainStage(g.e.mainIdx + 1); }
    else if (id === '16084b') g.win('대탈출: 주 음모에 위협이 없습니다');
  }
  MC.scenarios.escape_the_museum = Object.assign(MC.scenarios.escape_the_museum || {}, { mainCleared: afterMainThreat });
  S['16082a'] = { setup(g) { // Library Labyrinth into play; Ship Command set aside
    const lab = g.e.aside.find(u => idOf(g, u) === '16085a'); if (lab) g.put(lab, 'env');
  } };
  S['16083a'] = { async whenRevealed(g) { await putMilanoIntoPlay(g); } };
  S['16084a'] = { async whenRevealed(g) { // The Great Escape
    const lab = findIn(g.e.env, g, '16085a'); if (lab) { g.c(lab).id = '16085b'; g.log('도서관 미로 → 박물관 함선', 'warn'); }
    g.addAccel();
    const ship = g.e.aside.filter(u => (MC.sets.ship_command || []).includes(idOf(g, u)));
    ship.forEach(u => g.put(u, 'edeck')); g.shuffle(g.e.deck); g.log(`함선 지휘 세트 ${ship.length}장을 조우 덱에 섞습니다`);
  } };
  S['16084b'] = { actions: [milanoThwart3] };
  S['16082b'] = { loseOnComplete: true }; S['16083b'] = { loseOnComplete: true };
  S['16085a'] = { actions: [{ timing: 'hero', label: '"이쪽인가?": 조우 카드 1장 받기 → 주 음모 위협 5 제거', can: g => !g.p.usedOnce.labyrinth && g.c(g.e.main).threat > 0,
    async use(g) { g.p.usedOnce.labyrinth = true; facedown(g, 1); const r = await g.removeThreat(g.e.main, 5, {}); g.log(`도서관 미로: 주 음모 위협 ${r} 제거`); } }] };
  S['16085b'] = { on: { async villainPhaseBegins(g, u) { // Museum Ship
    await g.withPlayer(g.s.first, () => choose(g, '"꽉 잡아!": 하나를 고르세요', [
      { id: 'mil', label: '밀라노 소진 → 각 플레이어 간접 피해 2', can: () => milanoReady(g), run: async () => { exhaustMilano(g); await g.forEachPlayer(() => g.indirectDamage(2, u)); } },
      { id: 'dmg', label: '각 플레이어 간접 피해 3', run: async () => { await g.forEachPlayer(() => g.indirectDamage(3, u)); } }]));
  } } };
  S['16086'] = { // "I Have You Now!"
    async whenRevealedAlter(g) { g.c(g.idt()).ex = true; if (g.e.villain) await g.enemyScheme(g.e.villain, {}); },
    async whenRevealedHero(g) { g.giveStatus(g.idt(), 'stun', '"잡았다!"'); if (g.e.villain) await g.enemyAttack(g.e.villain, {}); },
    boostEffect(g) { if (g.e.villain) g.giveStatus(g.e.villain, 'tough', '강화: 강인함'); }
  };
  S['16087'] = { async whenRevealed(g) { // Impossible Geometry
    if (!g.giveStatus(g.idt(), 'conf', '불가능한 기하학: 혼란')) {
      const c = g.controlled(); if (c.length) { const t = c.length === 1 ? c[0] : await g.ask({ type: 'target', title: '이미 혼란: 버릴 카드', cands: c, cancelable: false }); g.discard(t, `${g.nm(t)} 버림`); }
    }
  } };

  // ======================= Nebula =======================
  const nebShip = g => findIn(g.e.env, g, '16093');
  const evasion = g => { const s = nebShip(g); return s ? (g.c(s).cnt.evasion || 0) : 0; };
  const addEvasion = (g, n) => { const s = nebShip(g); if (!s) return; const c = g.c(s).cnt; c.evasion = Math.max(0, (c.evasion || 0) + n); g.log(`네뷸라의 함선: 회피 카운터 ${c.evasion}`, n > 0 ? 'warn' : 'good'); };
  const techniques = g => g.inPlay().filter(u => g.d(u).type === 'attachment' && (g.d(u).tr || []).includes('TECHNIQUE'));
  async function special(g, u) { const f = (MC.scripts[idOf(g, u)] || {}).special; if (f) { g.log(`${g.nm(u)}: 특수 능력`); await f(g, u); } }
  const nebula = mode => ({
    async onActivationStart(g, v) {
      const ts = techniques(g); if (!ts.length) return;
      for (const t of ts) await special(g, t);
      if (mode === 1) ts.forEach(t => { if (g.c(t).zone) g.discard(t); });
      else {
        const live = ts.filter(t => g.c(t).zone === 'attach'); if (!live.length) return;
        if (mode === 3) {
          if (!g.p.deck.length) return;
          const k = await g.ask({ type: 'choice', title: '네뷸라 III: 덱 맨 위 카드를 게임에서 제거하고 기술 1장을 버릴까요?', options: [{ id: 'yes', label: '제거하고 버리기' }, { id: 'no', label: '그대로 둔다' }] });
          if (k !== 'yes') return; g.removeFromGame(g.p.deck[0]);
        }
        const t = live.length === 1 ? live[0] : await g.ask({ type: 'target', title: '버릴 기술 부착물', cands: live, cancelable: false }); g.discard(t, `${g.nm(t)} 버림`);
      }
    }
  });
  S['16088'] = nebula(1); S['16089'] = nebula(2); S['16090'] = nebula(3);
  // "the first Technique attachment revealed each round gains surge"
  const techniqueReveal = { async whenRevealed(g, u, ctx) { if (!g.p.usedOnce.techSurge && g.e.villain && ['16088', '16089', '16090'].includes(idOf(g, g.e.villain))) { g.p.usedOnce.techSurge = true; g.log('이번 라운드 첫 기술 부착물: 쇄도'); ctx.surge++; } } };
  const technique = (special, extra) => Object.assign({ attachTo: g => g.e.villain, special,
    boostEffect(g, u, ctx) { (ctx.afterBoost = ctx.afterBoost || []).push(async gg => { if (gg.c(u).zone === 'boost' && gg.e.villain) { gg.attachEnc(u, gg.e.villain); await special(gg, u); } }); } }, techniqueReveal, extra || {});
  S['16094'] = technique(async g => { if (g.e.main) await g.placeThreat(g.e.main, 1, {}); }, { on: { wouldTakeDamage(g, a, ctx) { if (ctx.target === g.c(a).on && ctx.attack && ctx.amount - ctx.prevent > 5) { ctx.prevent = ctx.amount - 5; g.log('냉혹한 야망: 한 번의 공격으로 5 이상 피해를 입지 않습니다'); } } } }); // Cutthroat Ambition
  S['16095'] = technique(async g => { if (!g.giveStatus(g.idt(), 'stun', '회피 기동: 기절') && g.c(g.idt()).stun) g.giveFacedownBoost(1); }, { grantStalwart: true }); // Evasive Maneuvering
  S['16096'] = technique(async g => { const v = g.e.villain; if (!v) return; if (g.c(v).tough) g.giveFacedownBoost(1); else g.giveStatus(v, 'tough', '불굴의 끈기: 강인함'); }, { grantStalwart: true }); // Unyielding Persistence
  S['16097'] = technique(async (g, u) => { await g.dealDamage(g.idt(), 1, { src: u }); }, { mod: { retaliate: (g, self, t) => t === g.c(self).on ? 1 : 0 } }); // Weapon Mastery
  S['16098'] = technique(async g => { await randomDiscard(g, 1); }, { on: { wouldTakeDamage(g, a, ctx) { if (ctx.target === g.c(a).on && ctx.attack && ctx.amount - ctx.prevent > 0) ctx.prevent++; } } }); // Wide Stance
  async function revealTechnique(g, label, withSpecial) {
    const u = g.discardEncounterUntil(d => d.type === 'attachment' && (d.tr || []).includes('TECHNIQUE'));
    if (!u) { g.log(`${label}: 기술 부착물이 없습니다`); return; }
    await g.reveal(u); if (withSpecial && g.c(u).zone === 'attach') await special(g, u);
  }
  S['16099'] = { async whenRevealed(g) { await revealTechnique(g, '치명적인 의도', false); } }; // Lethal Intent
  S['16100'] = { whenRevealed(g) { addEvasion(g, 1); }, boostEffect(g) { addEvasion(g, 1); } }; // Barrel Roll
  S['16101'] = { async whenRevealed(g) { await revealTechnique(g, '전투 준비', true); } }; // Combat Ready
  S['16102'] = S['16101'];
  S['16091a'] = { async setup(g) {
    const ship = g.e.aside.find(u => idOf(g, u) === '16093'); if (ship) await g.enterEnv(ship);
    await putMilanoIntoPlay(g); stoneSetup(g, g.e.villain);
    const cards = g.discardEncounterN(2 * g.players);
    for (const x of cards) if (g.d(x).type === 'attachment' && (g.d(x).tr || []).includes('TECHNIQUE')) g.attachEnc(x, g.e.villain);
  } };
  S['16091b'] = { escalation: g => evasion(g) * g.players };
  S['16092a'] = { async whenRevealed(g) { // Warp Drive Initiated
    addEvasion(g, 2); const n = evasion(g) * 2;
    await g.forEachPlayer(() => { for (let i = 0; i < n && g.p.deck.length; i++) g.put(g.p.deck[0], 'discard'); });
    g.discardEncounterN(n); g.log(`워프 드라이브: 각 플레이어 덱과 조우 덱 위 ${n}장씩 버림`, 'warn');
  } };
  S['16092b'] = { escalation: g => evasion(g) * g.players };
  S['16093'] = { // Nebula's Ship
    on: { villainPhaseBegins(g) { addEvasion(g, 1); } },
    actions: [{ timing: 'action', label: '"추진기를 쏴!": 밀라노 소진·자원 최대 2 → 회피 카운터 제거', can: g => isFirst(g) && milanoReady(g) && evasion(g) > 0 && g.canAfford({ n: 1, req: '' }, null),
      async use(g) {
        const max = Math.min(2, evasion(g)); let k = max; while (k > 1 && !g.canAfford({ n: k, req: '' }, null)) k--;
        const n = k > 1 ? +(await g.ask({ type: 'choice', title: '지불할 자원 수', options: [{ id: '1', label: '1' }, { id: '2', label: '2' }] })) || 1 : 1;
        if (!(await g.pay({ n, req: '' }, null, `추진기: 자원 ${n}`, true))) return;
        exhaustMilano(g); addEvasion(g, -n);
      } }]
  };
  function stoneSetup(g, to) { const p = g.e.deck.concat(g.e.discard, g.e.aside).find(u => idOf(g, u) === '16149'); if (p && to) { g.put(p, 'attach', to); g.log(`파워 스톤 → ${g.nm(to)}`); } }

  // ======================= Ronan the Accuser =======================
  const ronanBoost = { activationExtra: g => youControlStone(g) ? 1 : 0 };
  S['16103'] = ronanBoost;
  const searchReveal = async (g, id) => { const x = g.e.deck.concat(g.e.discard).find(u => idOf(g, u) === id); g.shuffle(g.e.deck); if (x) await g.reveal(x); };
  S['16104'] = Object.assign({ async whenRevealed(g) { await searchReveal(g, '16111'); } }, ronanBoost);
  S['16105'] = Object.assign({ async whenRevealed(g) { await searchReveal(g, '16113'); } }, ronanBoost);
  S['16106a'] = { async setup(g) {
    const ship = g.e.aside.find(u => idOf(g, u) === '16108'); if (ship) await g.enterEnv(ship);
    await putMilanoIntoPlay(g);
    const uw = g.e.aside.find(u => idOf(g, u) === '16109'); if (uw && g.e.villain) g.attachEnc(uw, g.e.villain);
    stoneSetup(g, g.s.ps[g.s.first].identity);
  } };
  S['16106b'] = { actions: [milanoThwart3] };
  S['16107a'] = { whenRevealed(g) { if (stoneOn(g) === g.e.villain) g.giveFacedownBoost(1); else attachStone(g, g.e.villain); } };
  S['16107b'] = { noRemove: g => stoneOn(g) === g.e.villain && !!g.e.villain };
  S['16108'] = { respond: [{ window: 'treacheryRevealed', label: '밀라노 소진·자원 1 → 그 카드의 공개될 때 효과 취소', cost: { n: 1, req: '' }, can: (g, u, ctx) => milanoReady(g) && !ctx.cancel, // Kree Command Ship
    async resolve(g, u, ctx) { exhaustMilano(g); ctx.cancel = true; g.log(`크리 지휘선: 「${g.nm(ctx.card)}」 효과 취소`, 'good'); } }] };
  S['16109'] = { attachTo: g => g.e.villain, grantStalwart: true, // Universal Weapon (+1 ATK/SCH from data)
    actions: [{ timing: 'hero', label: '피해 2·조우 카드 1장 받기 → 유니버설 웨폰을 조우 덱에 섞기', async use(g, u) {
      await g.dealDamage(g.idt(), 2, { src: u }); facedown(g, 1);
      if (g.c(u).zone) { g.resetCard(u); g.put(u, 'edeck'); g.shuffle(g.e.deck); g.log('유니버설 웨폰을 조우 덱에 섞습니다'); }
    } }],
    boostEffect(g, u, ctx) { (ctx.putIntoPlay = ctx.putIntoPlay || []).push(u); }
  };
  S['16110'] = { attachTo: g => g.e.villain, // Fanaticism
    on: { enemyAttacks(g, a, ctx) {
      if (ctx.enemy !== g.c(a).on) return;
      ctx.overkill = true; ctx.piercing = true; g.log('광신: 이번 공격 압도·관통');
      ctx.after.push(async gg => { if (gg.c(a).zone === 'attach') { gg.c(a).cnt.fury = (gg.c(a).cnt.fury || 1) - 1; gg.cleanupUses(a); } });
    } } };
  S['16111'] = { async boostEffect(g) { // Cut the Power
    await choose(g, '동력 차단 (강화): 하나를 고르세요', [
      { id: 'mil', label: '밀라노 소진', can: () => milanoReady(g), run: async () => exhaustMilano(g) },
      { id: 'thr', label: '주 음모에 위협 2', run: async () => { if (g.e.main) await g.placeThreat(g.e.main, 2, {}); } }]);
  } };
  S['16112'] = { actions: [milanoThwart3] }; // Pincer Maneuver
  S['16113'] = { async whenRevealed(g, u) { if (stoneOn(g) === g.e.villain) await g.placeThreat(u, g.players, {}); else attachStone(g, g.e.villain); } }; // Superior Tactics
  S['16114'] = { // Single-Minded Fury
    async whenRevealed(g, u, ctx) { const r = youControlStone(g) && g.e.villain ? await g.enemyAttack(g.e.villain, {}) : null; if (!g.attackMade(r)) { g.log('공격이 없어 쇄도'); ctx.surge++; } },
    boostEffect(g) { if (g.e.villain) attachStone(g, g.e.villain); }
  };
  S['16115'] = { async whenRevealed(g, u) { const v = g.e.villain; if (!v) return; if (g.c(v).tough) await g.dealDamage(g.idt(), 1, { src: u }); else g.giveStatus(v, 'tough', '크리 생리학: 강인함'); } }; // Kree Physiology
  S['16116'] = { // "You Stand Accused!"
    async whenRevealedAlter(g) { if (g.e.villain) await g.enemyScheme(g.e.villain, { schBonus: 1 }); },
    async whenRevealedHero(g) { if (g.e.villain) await g.enemyAttack(g.e.villain, { atkBonus: 1 }); },
    boostEffect(g, u, ctx) { ctx.extraBoost = (ctx.extraBoost || 0) + 1; }
  };

  // ======================= modular sets =======================
  // Band of Badoon
  S['16117'] = { // Badoon Assassin
    on: { async minionEnters(g, u, ctx) { if (ctx.minion === u && g.isHero() && g.c(u).zone === 'minion') await g.enemyAttack(u, { atkBonus: 2 }); } },
    boostEffect(g, u, ctx) { if ('undefended' in ctx) { ctx.overkill = true; ctx.piercing = true; ctx.ranged = true; } }
  };
  S['16118'] = { // Badoon Grunt
    on: { minionEnters(g, u, ctx) { if (ctx.minion === u && g.e.minions.length === 1) facedown(g, 1); } },
    boostEffect(g, u, ctx) { (ctx.putIntoPlay = ctx.putIntoPlay || []).push(u); }
  };
  S['16119'] = { boostEffect: (g, u, ctx) => ('undefended' in ctx) ? 0 : 2 }; // Badoon Lieutenant
  S['16120'] = { boostEffect(g) { const v = g.e.villain; if (!v) return 0; if (g.c(v).tough) return 2; g.giveStatus(v, 'tough', '바둔 보초: 강인함'); return 0; } }; // Badoon Sentry
  S['16121'] = { attackProps: () => ({ overkill: true }), boostEffect: (g, u, ctx) => ('undefended' in ctx) ? 2 : 0 }; // Badoon Warlord
  // Galactic Artifacts
  const lowest = (g, key) => { const e = g.enemies(); if (!e.length) return null; const m = Math.min(...e.map(x => g.stat(x, key))); return e.find(x => g.stat(x, key) === m); };
  const highest = (g, key) => { const e = g.enemies(); if (!e.length) return null; const m = Math.max(...e.map(x => g.stat(x, key))); return e.find(x => g.stat(x, key) === m); };
  const discardThisFor = (label, cost, pre) => ({ timing: 'hero', label: `${label} → 이 카드 버리기`, cost, async use(g, u) { if (pre) await pre(g, u); g.discard(u, `${g.nm(u)} 버림`); } });
  S['16122'] = { attachTo: g => lowest(g, 'atk'), actions: [discardThisFor('[물리][물리][물리]', { n: 3, req: 'RRR' })] }; // Cloak of Hercules (+3 ATK from data)
  S['16123'] = { attachTo: g => g.idt(), mod: { thw: (g, s, t) => t === g.c(s).on ? -1 : 0, atk: (g, s, t) => t === g.c(s).on ? -1 : 0, def: (g, s, t) => t === g.c(s).on ? -1 : 0 }, // Obedience Potion
    actions: [discardThisFor('피해 1·[정신][정신]', { n: 2, req: 'BB' }, async (g, u) => { await g.dealDamage(g.idt(), 1, { src: u }); })] };
  S['16124'] = { attachTo: g => highest(g, 'sch'), actions: [discardThisFor('주 음모에 위협 2·자원 2', { n: 2, req: '' }, async g => { if (g.e.main) await g.placeThreat(g.e.main, 2, {}); })] }; // Beyonder's Blazer
  S['16125'] = { attachTo: g => g.idt(), // The Poison
    on: { async turnBegins(g, a) { const c = g.c(a).cnt; c.poison = (c.poison || 0) + 1; g.log(`독: 독 카운터 ${c.poison} → 피해 ${c.poison}`, 'warn'); await g.dealDamage(g.idt(), c.poison, { src: a }); } },
    actions: [{ timing: 'hero', label: '서로 다른 자원 3개 → 이 카드 버리기', can: g => ['RBY', 'RBG', 'RYG', 'BYG'].some(r => g.canAfford({ n: 3, req: r }, null)),
      async use(g, u) { for (const r of ['RBY', 'RBG', 'RYG', 'BYG']) if (g.canAfford({ n: 3, req: r }, null)) { if (await g.pay({ n: 3, req: r }, null, '독: 서로 다른 자원 3개', true)) g.discard(u, '독 버림'); return; } } }] };
  S['16126'] = { attachTo: g => lowest(g, 'sch'), actions: [discardThisFor('[에너지][에너지][에너지]', { n: 3, req: 'YYY' })] }; // Vandarian Power Stone
  S['16127'] = { whenDefeated(g) { if (g.c(g.idt()).ex && g.canReady(g.idt())) { g.c(g.idt()).ex = false; g.log('후자다리안 왕의 알: 정체성 준비', 'good'); } } };
  S['16128'] = { whenDefeated(g) { const h = g.heal(g.idt(), 4); if (h) g.log(`마법의 찻주전자: 피해 ${h} 회복`, 'good'); } };
  S['16129'] = { async whenDefeated(g) { await g.draw(2); g.log('현자의 돌: 카드 2장 뽑기', 'good'); } };
  S['16130'] = { async whenDefeated(g) { // Crystal Ball
    g.p.costRed = 3; const c = g.p.hand.filter(x => g.canPlay(x)); if (!c.length) { g.p.costRed = 0; return; }
    const t = await g.ask({ type: 'target', title: '수정 구슬: 비용 3 낮춰 플레이할 카드 (취소 가능)', cands: c, cancelable: true });
    if (t) await g.playCard(t); g.p.costRed = 0;
  } };
  // Kree Militants
  S['16131'] = { attachTo: g => highest(g, 'atk'), // Kree Combat Armor
    on: { wouldTakeDamage(g, a, ctx) { if (ctx.target === g.c(a).on && ctx.attack && ctx.amount - ctx.prevent > 0) ctx.prevent++; } },
    actions: [{ timing: 'hero', label: '같은 종류 자원 3개 → 이 카드 버리기', can: g => ['RRR', 'BBB', 'YYY'].some(r => g.canAfford({ n: 3, req: r }, null)),
      async use(g, u) { const opts = ['RRR', 'BBB', 'YYY'].filter(r => g.canAfford({ n: 3, req: r }, null)); const r = opts.length === 1 ? opts[0] : await g.ask({ type: 'choice', title: '지불할 자원 종류', options: opts.map(x => ({ id: x, label: x })) }); if (await g.pay({ n: 3, req: r }, null, '크리 전투 갑옷', true)) g.discard(u, '크리 전투 갑옷 버림'); } }] };
  S['16132'] = { boostEffect(g, u, ctx) { if ('undefended' in ctx) ctx.piercing = true; } }; // Kree Commando
  S['16133'] = { boostEffect: (g, u, ctx) => ('undefended' in ctx) ? 3 : 0 }; // Kree Lieutenant
  S['16134'] = { boostEffect(g, u, ctx) { if ('undefended' in ctx) ctx.overkill = true; } }; // Kree Private
  // Menagerie Medley
  S['16135'] = { async whenRevealed(g) { if (!g.giveStatus(g.idt(), 'conf', '사이오닉 유령: 혼란') && g.c(g.idt()).conf) await g.dealDamage(g.idt(), 1, {}); }, // Psionic Ghost
    boostEffect(g, u, ctx) { (ctx.putIntoPlay = ctx.putIntoPlay || []).push(u); } };
  S['16137'] = { attackProps: () => ({ indirect: true }), async boostEffect(g, u) { for (const f of g.friendlyChars()) await g.dealDamage(f, 1, { src: u }); } }; // Starshark
  // Space Pirates
  const pirate = fn => ({ on: { async afterEnemyAttack(g, u, ctx) { if (ctx.enemy === u && ctx.damaged && ctx.damaged.includes(g.idt())) await fn(g); } }, boostEffect(g, u, ctx) { ctx.extraBoost = (ctx.extraBoost || 0) + 1; } });
  S['16138'] = pirate(g => { if (!g.p.hand.length) return; const x = g.p.hand[Math.floor(g.rand() * g.p.hand.length)]; g.removeFromGame(x); g.log(`해적 사령관: ${g.nm(x)}을(를) 게임에서 제거`, 'warn'); });
  S['16139'] = pirate(g => { const x = g.p.deck[0]; if (x) { g.removeFromGame(x); g.log(`해적 졸개: 덱 맨 위 ${g.nm(x)}을(를) 게임에서 제거`, 'warn'); } });
  S['16140'] = { mod: { atk: (g, s, t) => g.c(s).zone === 'side' && g.enemies().includes(t) ? 1 : 0 }, boostEffect(g, u, ctx) { (ctx.revealAfter = ctx.revealAfter || []).push(u); } }; // Sound the Alarms
  S['16141'] = { async whenRevealed(g) { // Honor Among Thieves
    const m = await untilMinion(g, d => (d.tr || []).includes('CRIMINAL'), '도둑들의 의리'); if (!m) return;
    await g.reveal(m); if (g.c(m).zone === 'minion') g.giveStatus(m, 'tough', '도둑들의 의리'); g.giveFacedownBoost(1);
  } };
  // Ship Command
  S['16143'] = { on: { async roundEnd(g, u) { await g.forEachPlayer(() => g.dealDamage(g.idt(), 1, { src: u })); } }, // Rogue Vessel ("when the villain phase ends")
    actions: [milanoAct('자원 2 지불, 이 카드 버리기', async (g, u) => { if (await g.pay({ n: 2, req: '' }, null, '불량 함선: 자원 2', true)) g.discard(u, '불량 함선 버림'); }, g => g.canAfford({ n: 2, req: '' }, null))] };
  S['16144'] = { actions: [milanoThwart3] }; // Cannonade
  const peril = (title, letters, other) => ({ async whenRevealed(g) {
    await choose(g, title, [
      { id: 'mil', label: '밀라노 소진', can: () => milanoReady(g), run: async () => exhaustMilano(g) },
      { id: 'pay', label: `${letters} 지불`, can: () => g.canAfford({ n: 2, req: letters }, null), run: async () => { if (!(await g.pay({ n: 2, req: letters }, null, title, false))) await other.run(g); } },
      { id: 'other', label: other.label, run: async () => other.run(g) }]);
  } });
  S['16145'] = peril('사각지대', 'RR', { label: '시작 플레이어 기절', run: async g => { await g.withPlayer(g.s.first, () => { g.giveStatus(g.idt(), 'stun', '사각지대'); }); } });
  S['16146'] = peril('선체 파손', 'BB', { label: '시작 플레이어에게 피해 3', run: async g => { await g.withPlayer(g.s.first, () => g.dealDamage(g.idt(), 3, {})); } });
  S['16147'] = peril('동력 흡수', 'YY', { label: '시작 플레이어 손에서 무작위로 1장 버리기', run: async g => { await g.withPlayer(g.s.first, () => randomDiscard(g, 1)); } });
  S['16148'] = { // Special Delivery
    async whenRevealedAlter(g) { if (milanoReady(g) && await g.ask({ type: 'choice', title: '특별 배송', options: [{ id: 'mil', label: '밀라노 소진' }, { id: 'no', label: '빌런이 음모 (+1)' }] }) === 'mil') exhaustMilano(g); else if (g.e.villain) await g.enemyScheme(g.e.villain, { schBonus: 1 }); },
    async whenRevealedHero(g) { if (milanoReady(g) && await g.ask({ type: 'choice', title: '특별 배송', options: [{ id: 'mil', label: '밀라노 소진' }, { id: 'no', label: '빌런이 공격 (+1)' }] }) === 'mil') exhaustMilano(g); else if (g.e.villain) await g.enemyAttack(g.e.villain, { atkBonus: 1 }); }
  };
  // Badoon Headhunter
  S['16183'] = { boostEffect(g, u, ctx) { (ctx.putIntoPlay = ctx.putIntoPlay || []).push(u); } };
  const moreBoost = (g, u, ctx) => { ctx.extraBoost = (ctx.extraBoost || 0) + 1; };
  S['16184'] = { async whenRevealed(g) { await choose(g, '사냥 중: 하나를 고르세요', [{ id: 'dmg', label: '피해 2', run: async () => { await g.dealDamage(g.idt(), 2, {}); } }, { id: 'disc', label: '손에서 무작위로 1장 버리기', can: () => g.p.hand.length > 0, run: async () => randomDiscard(g, 1) }]); }, boostEffect: moreBoost };
  S['16185'] = { async whenRevealed(g) { if (!g.c(g.idt()).ex) { g.c(g.idt()).ex = true; g.log(`${g.nm(g.idt())} 소진`); } else if (g.e.main) await g.placeThreat(g.e.main, 2, {}); }, boostEffect: moreBoost };

  // ======================= Campaign: Galaxy's Most Wanted (cards/pack/gmw/campaign.py, the_market, challenge) =======================
  const GMW = 'galaxys_most_wanted', MARKET = Array.from({ length: 28 }, (_, i) => String(16150 + i)), HEADHUNTERS = ['16183', '16184', '16185', '16186', '16187'], ARTIFACTS = ['16127', '16128', '16129', '16130'];
  const schemesWithThreat = g => [g.e.main].concat(g.e.sides).filter(x => x && g.c(x).threat > 0);
  MC.CAMPAIGNS[GMW] = {
    async setup(g, spec) {
      const lv = spec.level || 1;
      if (lv > 1) await g.forEachPlayer(() => { const m = g.clogPList('Market Cards').filter(id => MARKET.includes(id)); m.forEach(id => g.newCard(id, 'deck')); if (m.length) { g.shuffle(g.p.deck); g.log(`캠페인(${g.playerName()}): 마켓 카드 ${m.length}장을 덱에 섞습니다`); } });
      if (lv < 5 || g.clog('Reveal Kree Supremacy') === 'Yes') { const cs = g.newCard(`${16177 + lv}${g.s.scen.expert ? 'b' : 'a'}`, 'limbo'); g.log(`캠페인: 도전 부가 음모 「${g.nm(cs)}」 공개`, 'warn'); await g.reveal(cs); }
      if (lv === 3) await g.forEachPlayer(() => { const ids = g.clogPList('Cards in The Collection'); for (const id of ids) { const u = g.p.hand.concat(g.p.discard, g.p.deck).find(x => g.c(x).id === id); if (u) g.removeFromGame(u); } if (ids.length) g.shuffle(g.p.deck); });
      if (lv === 4) { const arts = g.clogList('Galactic Artifacts Side Schemes in the Victory Display').filter(id => ARTIFACTS.includes(id)); arts.forEach(id => g.newCard(id, 'edeck')); if (arts.length) g.shuffle(g.e.deck);
        for (const id of arts) { const v = g.e.villain; if (id === '16127') addEvasion(g, 1); else if (id === '16128') await g.forEachPlayer(() => g.dealEncounterCard()); else if (id === '16129' && v) g.giveFacedownBoost(1); else if (id === '16130' && v) g.giveStatus(v, 'tough', '은하 유물'); } }
      if (lv === 5) {
        const ps = g.clog('Power Stone Control').toLowerCase().replace(/[^a-z0-9]/g, '');
        const mPs = ps.match(/^(?:player|p)?(\d+)$/); const pi = mPs ? +mPs[1] - 1 : -1;
        if (pi >= 0 && g.s.ps[pi] && !g.s.ps[pi].eliminated) { const a = g.e.deck.concat(g.e.discard).find(x => g.c(x).id === '16116'); if (a) await g.withPlayer(pi, () => { g.put(a, 'facedown'); g.log(`캠페인: 파워 스톤을 가진 ${g.playerName(pi)}에게 고발을 뒷면으로`); }); }
        const pm = g.e.deck.concat(g.e.discard).find(x => g.c(x).id === '16112'); if (pm) { await g.reveal(pm); const n = Math.max(0, 3 - g.clogInt('Evasion Counters')); if (n && g.c(pm).zone === 'side') { g.c(pm).threat += n; g.log(`캠페인: 협공 작전에 위협 ${n} 추가 (회피 카운터 ${g.clogInt('Evasion Counters')})`); } }
      }
      const hh = [HEADHUNTERS[0]].concat(HEADHUNTERS.slice(1, Math.min(g.clogList('Headhunter Defeated').length + 1, lv))); hh.forEach(id => g.newCard(id, 'edeck')); g.shuffle(g.e.deck); g.log(`캠페인: 바둔 헤드헌터 카드 ${hh.length}장을 조우 덱에 섞습니다`);
      if (lv === 1) { if (g.s.scen.expert) await g.forEachPlayer(async () => { const m = g.discardEncounterUntil(d => d.type === 'minion'); if (m) await g.enterMinion(m, {}, true); }); return; }
      await g.forEachPlayer(async () => {
        const hp = g.clogPInt('Remaining hit points'); if (hp) g.setIdentityHP(hp);
        if (!g.s.scen.expert) return;
        const units = g.clogPInt('Unspent Units'), i = g.idt();
        if (units > 0 && g.c(i).dmg > 0 && await g.ask({ type: 'choice', title: `숙련 캠페인(${g.playerName()}): 유닛 1개(남은 ${units})를 써서 생명력을 모두 회복할까요?`, options: [{ id: 'y', label: '유닛 1개 사용' }, { id: 'n', label: '안 함' }] }) === 'y') { g.c(i).dmg = 0; g.clogPSet('Unspent Units', units - 1); }
      });
      if (!g.s.scen.expert) return;
      if (lv === 3) { const a = g.discardEncounterUntil(d => d.type === 'attachment'); if (a) await g.reveal(a); }
      if (lv === 4) { const t = g.discardEncounterUntil(d => d.type === 'attachment' && (d.tr || []).includes('TECHNIQUE')); if (t && g.e.villain) g.attachEnc(t, g.e.villain); }
      if (lv === 5 && g.e.main) await g.placeThreat(g.e.main, g.players, {});
    },
    async post(g, spec) { // Infiltrate the Museum, expert campaign: a card from your hand goes into The Collection
      if (spec.level === 2 && g.s.scen.expert) await g.forEachPlayer(async () => { if (!g.p.hand.length) return; const t = await g.ask({ type: 'target', title: `숙련 캠페인(${g.playerName()}): 콜렉션에 넣을 손 카드`, cands: g.p.hand.slice(), cancelable: false }) || g.p.hand[0]; toCollection(g, t); });
    }
  };
  [['16061a', 1], ['16073a', 2], ['16082a', 3], ['16091a', 4], ['16106a', 5]].forEach(([id, lv]) => { S[id] = Object.assign(S[id] || {}, { campaign: { level: lv } }); });
  // challenge side schemes (A: standard, B: expert)
  S['16178a'] = { async whenDefeated(g) { await g.forEachPlayer(async () => { if (await g.ask({ type: 'choice', title: `바둔 급습(${g.playerName()}): 카드 1장을 뽑을까요?`, options: [{ id: 'y', label: '뽑기' }, { id: 'n', label: '안 함' }] }) === 'y') await g.draw(1); }); } };
  S['16178b'] = { async whenDefeated(g) { await g.forEachPlayer(async () => { if (!g.p.hand.length) return; const t = await g.ask({ type: 'target', title: `바둔 급습(${g.playerName()}): 버릴 손 카드`, cands: g.p.hand.slice(), cancelable: false }) || g.p.hand[0]; g.put(t, 'discard'); }); } };
  S['16179a'] = { async whenDefeated(g) { await g.forEachPlayer(() => { const x = g.p.deck[0]; if (x) toCollection(g, x); }); } };
  S['16179b'] = { async whenDefeated(g) { await g.forEachPlayer(() => { if (g.p.hand.length) toCollection(g, g.p.hand[Math.floor(g.rand() * g.p.hand.length)]); }); } };
  S['16180a'] = { async whenDefeated(g) { await g.forEachPlayer(() => g.dealDamage(g.idt(), 1, {})); } }; S['16180b'] = { async whenDefeated(g) { await g.forEachPlayer(() => g.dealDamage(g.idt(), 2, {})); } };
  S['16181a'] = { whenDefeated(g) { addEvasion(g, 2); } }; S['16181b'] = { whenDefeated(g) { addEvasion(g, 3); } };
  S['16182a'] = {}; S['16182b'] = {};
  // the market (player cards bought with units between scenarios)
  const ev = (label, resolve, o) => ({ play: Object.assign({ timing: 'hero', label: label || 'action', resolve }, o || {}) });
  const gone = (g, u) => { g.removeFromGame(u); g.log(`${g.nm(u)}: 게임에서 제거`); };
  const withMilano = g => !!findIn(g.p.supports, g, '16142');
  const exAct = (label, run, can) => ({ actions: [{ timing: 'hero', exhaust: true, label, can: (g, u) => g.c(u).zone === 'upgrade' && !g.c(u).ex && (!can || can(g, u)), async use(g, u) { g.c(u).ex = true; await run(g, u); } }] });
  S['16150'] = ev('thwart', async (g, u) => { // Brilliant Plan
    const types = [['ally', '동료'], ['event', '이벤트'], ['support', '지원'], ['upgrade', '업그레이드'], ['resource', '자원']]; const t = await g.ask({ type: 'choice', title: '묘안: 카드 유형 선언', options: types.map(([id, label]) => ({ id, label })) });
    const top = g.p.deck[0]; if (!top) return; g.log(`덱 맨 위: ${g.nm(top)}`);
    if (g.d(top).type === t && g.e.main) { const r = await g.removeThreat(g.e.main, 3, { src: u }); g.log(`묘안: 주 음모 위협 ${r} 제거`, 'good'); await g.afterThreatRemoved(g.e.main); }
    if (await g.ask({ type: 'choice', title: `묘안: ${g.nm(top)}을(를) 어디에?`, options: [{ id: 't', label: '덱 맨 위' }, { id: 'b', label: '덱 맨 아래' }] }) === 'b') { g.p.deck.splice(g.p.deck.indexOf(top), 1); g.p.deck.push(top); }
    await g.draw(1); });
  S['16151'] = ev('attack', async (g, u) => { if (g.e.main) await g.placeThreat(g.e.main, 2, {}); if (g.e.villain) await g.dealDamage(g.e.villain, 3, { src: u, byPlayer: true }); await g.draw(1); });
  S['16152'] = ev('attack', async (g, u) => { const top = g.p.deck.slice(0, 4); top.forEach(x => g.put(x, 'discard')); const n = new Set(top.flatMap(x => (g.d(x).res || '').split('')).filter(Boolean)).size; g.log(`비상 계획: 서로 다른 자원 ${n}종`); for (let i = 0; i < n; i++) await dmgEnemy(g, 1, `비상 계획: 피해 1 (${i + 1}/${n})`, u); await g.draw(1); });
  S['16153'] = { interrupt: { window: 'wouldTakeAttackDamage', timing: 'hero', can: (g, u, ctx) => g.identityPlayer(ctx.target) >= 0 && ctx.amount - ctx.prevent > 0, async resolve(g, u, ctx) { ctx.prevent += 2; g.log('불복: 피해 2 방지', 'good'); await g.draw(1); } } };
  S['16154'] = ev(null, async g => { await g.draw(1); const pi = await g.choosePlayer('승산 계산: 대상 플레이어'); if (pi != null) await g.withPlayer(pi, async () => { if (await g.ask({ type: 'choice', title: '승산 계산: 카드 1장을 더 뽑을까요?', options: [{ id: 'y', label: '뽑기' }, { id: 'n', label: '안 함' }] }) === 'y') await g.draw(1); if (g.p.hand.length) { const t = await g.ask({ type: 'target', title: '승산 계산: 버릴 카드', cands: g.p.hand.slice(), cancelable: false }) || g.p.hand[0]; g.put(t, 'discard'); } }); });
  S['16155'] = ev(null, async (g, u) => { await g.draw(1); // Creative Solution
    const opts = []; for (const x of g.enemies().concat(g.friendlyChars())) for (const k of ['tough', 'stun', 'conf']) if (g.c(x)[k]) opts.push({ id: x + '|' + k, label: `${g.nm(x)}: ${{ tough: '강인함', stun: '기절', conf: '혼란' }[k]}` });
    if (!opts.length) return; const pk = await g.ask({ type: 'choice', title: '창의적인 해결책: 제거할 상태 카드', options: opts }) || opts[0].id; const [x, k] = pk.split('|'); g.c(x)[k] = false; g.log(`${g.nm(x)}의 상태 카드 제거`);
    if (k === 'tough') await dmgEnemy(g, 3, '창의적인 해결책: 피해 3', u);
    else if (k === 'stun') { const sc = schemesWithThreat(g); if (sc.length) { const t = sc.length === 1 ? sc[0] : await g.ask({ type: 'target', title: '위협 3을 제거할 음모', cands: sc, cancelable: false }) || sc[0]; await g.removeThreat(t, 3, { src: u }); await g.afterThreatRemoved(t); } }
    else g.heal(g.idt(), 3); });
  S['16156'] = ev(null, async (g, u) => { const t = await dmgEnemy(g, 1, '붙잡기: 피해 1 + 기절', u); if (t && g.c(t).zone) g.giveStatus(t, 'stun', '붙잡기'); g.giveStatus(g.idt(), 'stun', '붙잡기'); await g.draw(1); });
  S['16157'] = ev(null, async (g, u) => { const t = await dmgEnemy(g, 1, '즉흥 대처: 피해 1 + 혼란', u); if (t && g.c(t).zone) g.giveStatus(t, 'conf', '즉흥 대처'); g.giveStatus(g.idt(), 'conf', '즉흥 대처'); await g.draw(1); });
  S['16158'] = { interrupt: { window: 'boostTurned', timing: 'hero', can: (g, u, b) => !b.cancelIcons, async resolve(g, u, b) { b.cancelIcons = true; b.cancelAbility = true; g.log(`위기일발: ${g.nm(b.card)}의 강화 무효`, 'good'); await g.draw(1); } } };
  S['16159'] = ev('attack', async (g, u) => { await dmgEnemy(g, 5, '위험 무릅쓰기: 피해 5', u, true); const x = g.takeEncounter(); if (x) { g.put(x, 'ediscard'); const n = g.boostOf(x); g.log(`조우 덱 맨 위 ${g.nm(x)} 버림 (강화 ${n})`); if (n) await g.dealDamage(g.idt(), n, {}); } });
  S['16160'] = ev('thwart', async (g, u) => { await g.dealDamage(g.idt(), 2, {}); const sc = schemesWithThreat(g); if (!sc.length) return; const t = sc.length === 1 ? sc[0] : await g.ask({ type: 'target', title: '위험 속으로: 위협 5를 제거할 음모', cands: sc, cancelable: false }) || sc[0]; await g.removeThreat(t, 5, { src: u }); await g.afterThreatRemoved(t); });
  S['16161'] = ev(null, async g => { // Seize the Initiative
    const top = g.e.deck.slice(0, 2 * g.players); if (!top.length) return; const keep = []; for (const x of top) { if (await g.ask({ type: 'choice', title: `선제 공세: ${g.nm(x)}`, options: [{ id: 'd', label: '버리기' }, { id: 't', label: '맨 위' }, { id: 'b', label: '맨 아래' }] }) === 'd') g.put(x, 'ediscard'); else keep.push(x); }
    for (const x of keep) { g.e.deck.splice(g.e.deck.indexOf(x), 1); } for (const x of keep.slice().reverse()) g.e.deck.unshift(x); await g.draw(1); });
  S['16162'] = { respond: [{ window: 'identityWouldTakeDamage', exhaust: true, label: '장갑판 소진 → 피해 방지', can: (g, u, ctx) => g.c(u).zone === 'upgrade' && g.identityPlayer(ctx.target) >= 0 && ctx.amount - ctx.prevent > 0, resolve(g, u, ctx) { const n = withMilano(g) ? 2 : 1; ctx.prevent += n; g.log(`장갑판: 피해 ${n} 방지`, 'good'); } }] };
  S['16163'] = exAct('중포 소진 → 각 적에게 피해 1', async (g, u) => { for (const x of g.enemies().slice()) if (g.c(x).zone) await g.dealDamage(x, 1, { src: u, byPlayer: true }); if (withMilano(g) && g.e.villain) await g.dealDamage(g.e.villain, 1, { src: u, byPlayer: true }); });
  S['16164'] = exAct('하이퍼 추진기 소진 → 각 음모 위협 1 제거', async (g, u) => { for (const x of g.schemes().slice()) { await g.removeThreat(x, 1, { src: u }); await g.afterThreatRemoved(x); } if (withMilano(g) && g.e.main) { await g.removeThreat(g.e.main, 1, { src: u }); await g.afterThreatRemoved(g.e.main); } });
  S['16165'] = Object.assign(exAct('원자로 노심 소진 → 다음 이벤트 비용 -1', async (g, u) => { g.p.deck.slice(0, withMilano(g) ? 1 : 2).forEach(x => g.put(x, 'discard')); g.c(u).cnt.evRed = g.s.round; }),
    { costMod: (g, u, uid) => g.c(u).cnt.evRed === g.s.round && g.d(uid).type === 'event' ? 1 : 0, costUsed: (g, u) => { g.c(u).cnt.evRed = 0; } });
  S['16166'] = ev(null, async g => { const c = g.allFriendlyChars().filter(x => g.c(x).ex); if (c.length) { const t = c.length === 1 ? c[0] : await g.ask({ type: 'target', title: '불타는 결의: 준비할 캐릭터', cands: c, cancelable: false }) || c[0]; g.c(t).ex = false; } await g.draw(1); });
  S['16167'] = { interrupt: { window: 'cardRevealed', timing: 'hero', can: (g, u, ctx) => !ctx.cancelAll, resolve(g, u, ctx) { ctx.cancelAll = true; g.log(`맹렬한 돌격: ${g.nm(ctx.card)} 무효`, 'good'); } } };
  S['16168'] = ev(null, async g => { const sel = await g.pickCards(g.allFriendlyChars(), '보호 조치: 강인함을 줄 캐릭터 (최대 2)', 0, 2); for (const x of sel || []) g.giveStatus(x, 'tough', '보호 조치'); await g.draw(1); });
  S['16169'] = ev(null, g => { g.p.costRed = (g.p.costRed || 0) + 3; g.log('확실한 도박: 다음 카드 비용 -3', 'good'); });
  S['16170'] = exAct('화물칸 소진 → 아군 피해 1 회복', async g => { const c = g.allFriendlyChars().filter(x => g.c(x).dmg > 0); if (c.length) { const t = c.length === 1 ? c[0] : await g.ask({ type: 'target', title: '화물칸: 회복할 캐릭터', cands: c, cancelable: false }) || c[0]; g.heal(t, 1); } if (withMilano(g)) g.heal(g.idt(), 1); });
  S['16171'] = exAct('거치형 레이저 소진 → 적에게 피해', async (g, u) => { await dmgEnemy(g, withMilano(g) ? 3 : 2, '거치형 레이저', u); });
  S['16172'] = exAct('항법 장치 소진 → 카드 1장 뽑기', async g => { if (withMilano(g)) { const x = g.p.deck[0]; if (x) g.put(x, 'discard'); } else if (g.p.hand.length) { const t = await g.ask({ type: 'target', title: '항법 장치: 버릴 손 카드', cands: g.p.hand.slice(), cancelable: false }) || g.p.hand[0]; g.put(t, 'discard'); } await g.draw(1); }, g => withMilano(g) || g.p.hand.length > 0);
  S['16173'] = exAct('조준 화면 소진 → 위협 제거', async (g, u) => { const sc = schemesWithThreat(g); if (!sc.length) return; const t = sc.length === 1 ? sc[0] : await g.ask({ type: 'target', title: '조준 화면: 위협을 제거할 음모', cands: sc, cancelable: false }) || sc[0]; await g.removeThreat(t, withMilano(g) ? 3 : 2, { src: u }); await g.afterThreatRemoved(t); });
  S['16174'] = ev(null, async (g, u) => { const n = Math.max(0, g.handSize() - g.p.hand.length); if (n) await g.draw(n); gone(g, u); });
  S['16175'] = ev(null, async (g, u) => { if (g.e.villain) await g.dealDamage(g.e.villain, 5, { src: u, byPlayer: true }); if (g.e.main) { await g.removeThreat(g.e.main, 5, { src: u }); await g.afterThreatRemoved(g.e.main); } gone(g, u); });
  S['16176'] = ev(null, async (g, u) => { const pi = await g.choosePlayer('검증된 방법: 대상 플레이어'); if (pi != null) await g.withPlayer(pi, async () => { const sel = await g.pickCards(g.p.discard.slice(), '검증된 방법: 손에 더할 카드 (최대 3)', 0, 3); for (const x of sel || []) g.put(x, 'hand'); }); gone(g, u); });
  S['16177'] = ev(null, async (g, u) => { const sel = await g.pickCards(g.allFriendlyChars().filter(x => g.c(x).ex), '삼중 위협: 준비할 캐릭터 (최대 3)', 0, 3); for (const x of sel || []) g.c(x).ex = false; gone(g, u); });
  MC.registerScripts(S);
})();
