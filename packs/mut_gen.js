/* Mutant Genesis (32001-32175): Colossus, Shadowcat, the X-Men player cards, five scenarios and six modular sets.
   Ported from cards/pack/mut_gen of the community build. Campaign-only cards are left out. */
(function () {
  'use strict';
  const S = {};
  const idOf = (g, u) => g.c(u).id;
  const tr = (g, u, t) => (g.d(u).tr || []).includes(t) || g.hasTrait(u, t);
  const pick = async (g, cands, title) => !cands.length ? null : cands.length === 1 ? cands[0] : await g.ask({ type: 'target', title, cands, cancelable: false });
  const yes = async (g, title) => (await g.ask({ type: 'choice', title, options: [{ id: 'y', label: '예' }, { id: 'n', label: '아니요' }] })) === 'y';
  const xmen = (g, u) => tr(g, u, 'X-MEN');
  async function thw(g, t, n, src) {
    const r = await g.removeThreat(t, n, { src }); g.log(`${g.nm(t)} 위협 ${r} 제거`);
    const last = r > 0 && (!g.c(t).zone || g.c(t).threat === 0); await g.afterThreatRemoved(t); return { r, last };
  }
  const MG = MC.mutGen = MC.mutGen || {};
  const firstCtrl = zone => ({ firstPlayerChanged(g, u, ctx) { if (g.c(u).zone === zone && g.c(u).ctrl !== ctx.first) { g.withPlayerSync(ctx.first, () => g.put(u, zone)); g.log(`${g.nm(u)}의 조종권이 ${g.playerName(ctx.first)}(으)로 넘어갑니다`, 'good'); } } });

  // ======================= Colossus =======================
  const isColossus = g => ['32001a', '32001b'].includes(idOf(g, g.idt()));
  S['32001a'] = { multiTough: 2,
    respond: [{ window: 'afterChangeForm', label: '강철 피부: 강인함 카드 1장', can: (g, u, ctx) => ctx.form === 'hero' && u === g.idt(), resolve(g) { g.giveStatus(g.idt(), 'tough', '강철 피부'); } }] };
  S['32001b'] = {
    setup(g) { const x = g.p.deck.find(u => idOf(g, u) === '32006'); if (x) { g.put(x, 'hand'); g.shuffle(g.p.deck); g.log('준비: 유기 강철을 손으로'); } },
    respond: [{ window: 'afterChangeForm', label: '꿈꾸는 예술가: 버림 더미의 콜로서스 카드 1장을 덱에 섞기', can: (g, u, ctx) => ctx.form === 'alter' && u === g.idt() && g.p.discard.some(x => g.d(x).cls === 'Hero'),
      async resolve(g) { const t = await pick(g, g.p.discard.filter(x => g.d(x).cls === 'Hero'), '덱에 섞을 콜로서스 카드'); if (t) { g.put(t, 'deck'); g.shuffle(g.p.deck); } } }]
  };
  S['32002'] = { allyIgnores: ['guard', 'patrol', 'crisis'] }; // Shadowcat (ally)
  S['32003'] = { actions: [{ timing: 'alter', exhaust: true, label: '소진 → 콜로서스 카드가 나올 때까지 덱을 버리고 그 카드를 손으로', async use(g) { // Piotr's Studio
    for (let i = 0; i < 80; i++) { if (!g.p.deck.length) await g.reshuffleDeck(); const x = g.p.deck[0]; if (!x) break; if (g.d(x).cls === 'Hero' && !g.d(x).enc) { g.put(x, 'hand'); g.log(`피오트르의 작업실: ${g.nm(x)}을(를) 손으로`, 'good'); break; } g.put(x, 'discard'); }
  } }] };
  S['32004'] = { mod: { thw: (g, s, t) => t === g.idt() && g.isHero() ? 1 : 0 }, // Iron Will
    respond: [{ window: 'toughDiscarded', label: '카드 1장 뽑기', can: (g, u, ctx) => ctx.target === g.idt(), async resolve(g) { await g.draw(1); } }] };
  S['32005'] = { mod: { atk: (g, s, t) => t === g.idt() && g.isHero() ? 1 : 0 }, // Titanium Muscles
    resources: [{ gen: g => 'R'.repeat(Math.max(1, g.toughCount(g.idt()))), label: '티타늄 근육: 강인함 카드마다 [물리]', can: (g, u) => g.isHero() && !g.c(u).ex && g.toughCount(g.idt()) > 0, use: (g, u) => { g.c(u).ex = true; } }] };
  S['32006'] = { respond: [{ window: 'toughDiscarded', timing: 'hero', label: '소진·강철 카운터 1 → 강인함 카드 1장', can: (g, u, ctx) => ctx.target === g.idt() && !g.c(u).ex && (g.c(u).cnt.steel || 0) > 0, // Organic Steel
    resolve(g, u) { g.c(u).ex = true; g.c(u).cnt.steel--; g.giveStatus(g.idt(), 'tough', '유기 강철'); g.cleanupUses(u); } }] };
  S['32007'] = { interrupt: { window: 'basicPowerUsed', timing: 'hero', can: (g, u, ctx) => ctx.kind === 'attack' && g.toughCount(g.idt()) > 0, // Made of Rage
    async resolve(g, u, ctx) { await g.loseTough(g.idt(), '분노의 화신'); ctx.bonus += 6; ctx.overkill = true; g.log('분노의 화신: 이번 공격 +6, 압도', 'good'); } } };
  S['32008'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { // Steel Fist
    await g.playerAttack(g.idt(), ctx.target, 5, { src: u });
    if (g.toughCount(g.idt()) > 0 && g.c(ctx.target).zone && ['villain', 'minion'].includes(g.c(ctx.target).zone) && await yes(g, '강철 주먹: 강인함 카드를 버리고 그 적을 기절·혼란시킬까요?')) {
      await g.loseTough(g.idt(), '강철 주먹'); g.giveStatus(ctx.target, 'stun', '강철 주먹'); g.giveStatus(ctx.target, 'conf', '강철 주먹');
    }
  } } };
  S['32009'] = { play: { timing: 'hero', can: g => g.toughCount(g.idt()) > 0, async resolve(g) { // Bulletproof Protector
    await g.loseTough(g.idt(), '방탄 수호자');
    const o = await g.ask({ type: 'choice', title: '방탄 수호자: 하나를 고르세요', options: [{ id: 't', label: '강인함 카드 2장 받기' }, { id: 'r', label: '히어로 준비' }] });
    if (o === 'r') { if (g.canReady(g.idt())) g.c(g.idt()).ex = false; } else { g.giveStatus(g.idt(), 'tough', '방탄 수호자'); g.giveStatus(g.idt(), 'tough', '방탄 수호자'); }
  } } };
  S['32010'] = { interrupt: { window: 'enemyWouldActivate', timing: 'alter', can: (g, u, ctx) => g.d(ctx.enemy).type === 'villain' && !g.formLocked(), async resolve(g) { await g.changeForm(true); } } }; // Armor Up
  S['32025'] = { async whenRevealed(g, u, ctx) { // Homesick
    await g.heroObligation(u, '향수병', '이 카드와 정체성의 강인함 카드를 모두 버림', async () => {
      let n = 0; while (await g.loseTough(g.idt(), '향수병')) n++;
      if (g.c(u).zone === 'limbo') g.discard(u); if (!n) { ctx.surge++; g.log('향수병: 버린 강인함이 없어 쇄도', 'warn'); }
    });
  } };
  S['32026'] = { boostEffect(g, u, ctx) { if (ctx && ctx.attack !== false) { ctx.overkill = true; ctx.piercing = true; } } }; // Juggernaut
  S['32027'] = { async whenRevealed(g, u) { // Rampaging Juggernaut
    let n = 0; for (const f of g.allFriendlyChars()) while (await g.loseTough(f, '폭주하는 저거너트')) n++;
    if (n) await g.placeThreat(u, 2 * n, { src: u });
  } };
  S['32028'] = { // Unstoppable
    attachTo: g => { const c = g.enemies().filter(e => !g.c(e).att.some(a => idOf(g, a) === '32028')); if (!c.length) return null; const top = Math.max(...c.map(e => g.d(e).atk || 0)); return c.find(e => (g.d(e).atk || 0) === top); }, surgeIfNoHost: true,
    attackProps: () => ({ overkill: true, piercing: true }),
    on: { afterEnemyAttack(g, u, ctx) { if (ctx.enemy === g.c(u).on) g.discard(u, '멈출 수 없는 자: 공격 후 버림'); } }
  };
  S['32029'] = { async whenRevealed(g) { if (g.c(g.idt()).stun) await g.dealDamage(g.idt(), 2, {}); else g.giveStatus(g.idt(), 'stun', '내동댕이'); }, async boostEffect(g, u) { await S['32029'].whenRevealed(g, u, { surge: 0 }); } }; // Slammed

  // ======================= Shadowcat =======================
  const MASS = ['32031a', '32031b'];
  const mass = g => g.p.upgrades.find(u => MASS.includes(idOf(g, u))) || null;
  const phased = g => { const m = mass(g); return !!m && idOf(g, m) === '32031b'; };
  const solid = g => { const m = mass(g); return !!m && idOf(g, m) === '32031a'; };
  const massLocked = g => (g.p.obl || []).some(u => idOf(g, u) === '32055');
  function flipMass(g, to) { const m = mass(g); if (!m || massLocked(g)) return false; const now = idOf(g, m); const nx = to || (now === '32031a' ? '32031b' : '32031a'); if (nx === now) return false; g.c(m).id = nx; g.log(`질량 형태: ${nx === '32031b' ? '위상' : '고체'}`, 'good'); return true; }
  MG.phased = phased;
  const isKitty = g => ['32030a', '32030b'].includes(idOf(g, g.idt()));
  const kittyIgn = g => isKitty(g) && g.isHero() && phased(g);
  S['32030a'] = { ignores: { guard: kittyIgn, patrol: kittyIgn, crisis: kittyIgn } };
  S['32030b'] = {
    setup(g) { const m = (g.p.pset || []).find(u => MASS.includes(idOf(g, u))) || g.p.deck.concat(g.p.hand).find(u => MASS.includes(idOf(g, u))); if (m) { g.c(m).id = '32031a'; g.put(m, 'upgrade'); g.log('준비: 질량 형태(고체)를 플레이에 놓습니다'); } },
    actions: [{ timing: 'action', once: true, label: '위상 조절: 질량 형태 뒤집기', can: g => !!mass(g) && !massLocked(g), use(g) { flipMass(g); } }]
  };
  S['32030a'].actions = S['32030b'].actions;
  async function afterMassUse(g) { // Solid: may flip after you attack or defend; Phased: must flip
    if (!isKitty(g)) return;
    if (phased(g)) flipMass(g, '32031a');
    else if (solid(g) && !massLocked(g) && await yes(g, '고체: 질량 형태를 위상으로 뒤집을까요?')) flipMass(g, '32031b');
  }
  S['32031a'] = { permanent: true, // Solid
    resources: [{ gen: 'R', label: '고체 ([공격]·[방어] 이벤트용)', can: (g, u) => g.isHero() && !g.c(u).ex, forOnly: (g, u, f) => g.d(f).type === 'event' && ['ATTACK', 'DEFENSE'].some(t => (g.d(f).tr || []).includes(t)), use: (g, u) => { g.c(u).ex = true; } }],
    on: { async afterAttack(g, u, ctx) { if (ctx.attacker === g.idt() && g.c(u).zone === 'upgrade' && !g.p.massFlipped) { g.p.massFlipped = true; try { await afterMassUse(g); } finally { g.p.massFlipped = false; } } },
      async basicHeroPower(g, u, ctx) { if (ctx.kind === 'defend' && g.c(u).zone === 'upgrade') await afterMassUse(g); } }
  };
  S['32031b'] = { permanent: true, // Phased
    shieldsFromDamage: (g, u, t, o) => t === g.idt() && g.e.heroDefending && !!(o && o.attack),
    on: S['32031a'].on };
  S['32032'] = { async onEnter(g) { // Lockheed
    if (solid(g)) { const t = await g.chooseTarget('enemy', '록히드: 피해 2를 줄 적', g.idt(), false); if (t) await g.dealDamage(t, 2, { byPlayer: true }); }
    else if (phased(g)) await g.removeThreatChoose(2, '록히드: 위협 2를 제거할 음모');
  } };
  S['32033'] = { actions: [{ timing: 'alter', exhaust: true, label: '소진 → 고체: 회복 2 / 위상: 카드 1장', async use(g) { if (solid(g)) g.heal(g.idt(), 2); else if (phased(g)) await g.draw(1); } }] }; // Kitty's Room
  S['32034'] = { respond: [ // Acute Control
    { window: 'ignoredGuard', timing: 'hero', exhaust: true, label: '소진 → 그 하수인에게 피해 2', async resolve(g, u, ctx) { const t = await pick(g, ctx.minions.filter(m => g.c(m).zone === 'minion'), '정밀 제어: 피해 2를 줄 하수인'); if (t) await g.dealDamage(t, 2, { src: u, byPlayer: true }); } },
    { window: 'ignoredPatrol', timing: 'hero', exhaust: true, label: '소진 → 그 하수인에게 피해 2', async resolve(g, u, ctx) { const t = await pick(g, ctx.minions.filter(m => g.c(m).zone === 'minion'), '정밀 제어: 피해 2를 줄 하수인'); if (t) await g.dealDamage(t, 2, { src: u, byPlayer: true }); } }
  ] };
  S['32035'] = { respond: [{ window: 'ignoredCrisis', timing: 'hero', exhaust: true, label: '소진 → 그 음모에서 위협 2 제거', async resolve(g, u, ctx) { // Intangible Interference
    const t = await pick(g, ctx.schemes.filter(x => g.c(x).zone === 'side'), '무형의 방해: 위협 2를 제거할 음모'); if (t) await thw(g, t, 2, u);
  } }] };
  S['32036'] = { heroOnly: true, attach: { kind: 'enemy', filter: (g, t) => !g.c(t).att.some(a => idOf(g, a) === '32036') }, // Phased and Confused
    hostInsteadOfAttack(g, a, enemy) { g.discard(a, '위상과 혼란: 공격 대신 버림'); g.giveStatus(enemy, 'conf', '위상과 혼란'); } };
  S['32037'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { await g.playerAttack(g.idt(), ctx.target, 3, { src: u }); if (g.canReady(g.idt())) g.c(g.idt()).ex = false; } } }; // Shadowcat Surprise
  S['32038'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { // Phase Strike
    const ph = phased(g); await g.playerAttack(g.idt(), ctx.target, 6, { src: u });
    if (!ph || !g.c(ctx.target).zone) return;
    const c = g.c(ctx.target).att.filter(a => g.d(a).enc && ((g.sc(a).actions || []).some(x => x.timing === 'hero') || (g.sc(a).respond || []).some(x => x.timing === 'hero')));
    if (c.length && await yes(g, '위상 타격: 그 적의 부착물을 버릴까요?')) { const t = await pick(g, c, '버릴 부착물'); if (t) g.discard(t, '위상 타격'); }
  } } };
  S['32039'] = { play: { timing: 'hero', label: 'thwart', target: 'thwartable', async resolve(g, u, ctx) { await thw(g, ctx.target, phased(g) ? 4 : 2, u); } } }; // Airwalk
  S['32040'] = { interrupt: { window: 'enemyAttackInitiated', timing: 'hero', label: 'defense', async resolve(g) { if (solid(g)) flipMass(g, '32031b'); else if (phased(g)) await g.draw(2); } } }; // Quick Shift
  S['32055'] = { // Permanently Phased
    async whenRevealed(g, u) { flipMass(g, '32031b'); g.put(u, 'pobl'); g.log('영구 위상: 공격·방어·질량 형태 변경 불가', 'warn'); },
    heroNo: { attack: (g, s) => g.c(s).zone === 'pobl', defend: (g, s) => g.c(s).zone === 'pobl' },
    actions: [{ timing: 'alter', label: '키티 소진 → 이 카드 제거', can: (g, u) => g.c(u).zone === 'pobl' && !g.c(g.idt()).ex, use(g, u) { g.c(g.idt()).ex = true; g.removeFromGame(u); } }]
  };
  S['32056'] = { // White Queen: while engaged with you, you are confused
    on: { minionEnters(g, u, ctx) { if (ctx.minion === u) g.giveStatus(g.idt(), 'conf', '화이트 퀸'); }, turnBegins(g, u) { if (g.c(u).zone === 'minion') g.giveStatus(g.idt(), 'conf', '화이트 퀸'); } },
    boostEffect(g) { g.giveStatus(g.idt(), 'conf', '화이트 퀸'); }
  };
  S['32057'] = { async whenDefeated(g) { const x = g.e.deck.concat(g.e.discard, g.e.setaside || []).find(u => idOf(g, u) === '32058'); if (x) { g.shuffle(g.e.deck); await g.enterMinion(x, {}); } } }; // The Hellfire Club
  MG.boostEngage = (label) => function (g, u, ctx) { (ctx.post || ctx.after).push(async gg => { if (gg.c(u).zone && gg.c(u).zone !== 'minion') { gg.log(`★ ${label}`, 'warn'); await gg.enterMinion(u, {}, true); } }); };
  S['32058'] = { boostEffect: MG.boostEngage('헬파이어 졸개가 교전합니다') }; // Hellfire Pawn
  S['32059'] = { attachTo: g => g.idt(), // Telepathic Restraint
    on: { turnBegins(g, u) { if (g.c(u).on === g.idt()) g.giveStatus(g.idt(), 'stun', '텔레파시 구속'); } },
    async whenRevealed(g) { g.giveStatus(g.idt(), 'stun', '텔레파시 구속'); },
    actions: [{ timing: 'action', label: '[정신][정신] → 이 카드 버림', cost: { n: 2, req: 'BB' }, can: (g, u) => g.c(u).on === g.idt(), use(g, u) { g.discard(u, '텔레파시 구속 해제'); } }] };

  // ======================= Protection / Aggression / Basic =======================
  const nightcrawler = { label: '[에너지] 1·나이트크롤러를 손으로 → 그 피해를 모두 방지', cost: { n: 1, req: 'Y' },
    resolve(g, u, ctx) { ctx.prevent = ctx.amount; for (const a of g.c(u).att.slice()) g.discard(a); g.resetCard(u); g.put(u, 'hand'); g.log('나이트크롤러: 순간이동으로 피해를 막고 손으로 돌아옵니다', 'good'); } };
  S['32011'] = { respond: [ // Nightcrawler
    Object.assign({ window: 'wouldTakeAttackDamage', can: (g, u, ctx) => g.c(u).zone === 'ally' && xmen(g, ctx.target) && ctx.amount > 0 }, nightcrawler),
    Object.assign({ window: 'allyWouldTakeDamage', can: (g, u, ctx) => g.c(u).zone === 'ally' && ctx.attack && xmen(g, ctx.target) && ctx.amount > 0 }, nightcrawler)
  ] };
  S['32012'] = { async onEnter(g) { const t = await pick(g, g.allFriendlyChars().filter(x => xmen(g, x)), '폴라리스: 강인함 카드를 줄 [엑스맨] 캐릭터'); if (t) g.giveStatus(t, 'tough', '폴라리스'); } }; // Polaris
  const training = (atk, hp) => ({ attach: { kind: 'ally', filter: (g, t) => xmen(g, t) && !g.c(t).att.some(a => tr(g, a, 'TRAINING')) }, mod: { atk: (g, s, t) => t === g.c(s).on ? atk : 0, hp: (g, s, t) => t === g.c(s).on ? hp : 0 } });
  S['32013'] = training(0, 3); // Protective Training
  S['32043'] = training(1, 2); // Attack Training
  S['32014'] = { interrupt: { window: 'enemyAttackInitiated', timing: 'hero', label: 'attack', async resolve(g, u, ctx) { // Powerful Punch
    await g.playerAttack(g.idt(), ctx.enemy, 4, { src: u }); if (!g.c(ctx.enemy).zone || !['villain', 'minion'].includes(g.c(ctx.enemy).zone)) ctx.cancel = true;
  } } };
  S['32017'] = { canPlay: g => xmen(g, g.idt()), interrupt: { window: 'enemyAttackInitiated', timing: 'hero', label: 'defense', can: g => g.p.hand.some(x => g.d(x).type === 'ally' && (g.d(x).tr || []).includes('X-MEN')), // Mutant Protectors
    async resolve(g, u, ctx) {
      const t = await pick(g, g.p.hand.filter(x => g.d(x).type === 'ally' && (g.d(x).tr || []).includes('X-MEN')), '뮤턴트 수호자: 플레이에 놓을 [엑스맨] 동료'); if (!t) return;
      await g.putAllyIntoPlay(t); if (g.c(t).zone === 'ally') { g.c(t).ex = true; ctx.forceDefender = t; g.log(`뮤턴트 수호자: ${g.nm(t)}이(가) 방어합니다`, 'good'); }
    } } };
  S['32018'] = { async onSpent(g, u, forUid) { if (forUid && g.d(forUid).type === 'event' && (g.d(forUid).tr || []).includes('DEFENSE')) await g.draw(1); } }; // Defensive Energy
  S['32047'] = { onSpent(g, u, forUid) { if (forUid && g.d(forUid).type === 'event' && (g.d(forUid).tr || []).includes('ATTACK')) { g.p.aggr = (g.p.aggr || 0) + 1; g.log('용맹의 에너지: 이 이벤트 피해 +1', 'good'); } } }; // Aggressive Energy
  S['32019'] = { // Professor X
    async onEnter(g) {
      const opts = []; if (g.e.villain) opts.push({ id: 'c', label: '빌런 혼란' }); if (g.e.minions.length) opts.push({ id: 's', label: '하수인 기절' });
      if (g.allFriendlyChars().some(x => xmen(g, x) && g.c(x).ex)) opts.push({ id: 'r', label: '[엑스맨] 캐릭터 준비' }); if (!opts.length) return;
      const o = opts.length === 1 ? opts[0].id : await g.ask({ type: 'choice', title: '프로페서 X: 하나를 고르세요', options: opts });
      if (o === 'c') g.giveStatus(g.e.villain, 'conf', '프로페서 X');
      else if (o === 's') { const t = await pick(g, g.e.minions.slice(), '프로페서 X: 기절시킬 하수인'); if (t) g.giveStatus(t, 'stun', '프로페서 X'); }
      else if (o === 'r') { const t = await pick(g, g.allFriendlyChars().filter(x => xmen(g, x) && g.c(x).ex), '프로페서 X: 준비할 캐릭터'); if (t && g.canReady(t)) g.c(t).ex = false; }
    },
    on: { roundEnd(g, u) { if (g.c(u).zone === 'ally') g.discard(u, '프로페서 X: 라운드 끝에 버림'); } }
  };
  S['32020'] = { resources: [{ gen: 'G', label: 'X-제트', can: (g, u) => !g.c(u).ex && xmen(g, g.idt()), use: (g, u) => { g.c(u).ex = true; } }] }; // The X-Jet
  S['32021'] = { interrupt: { window: 'enemyAttackInitiated', timing: 'hero', label: 'defense', async resolve(g, u, ctx) { // Shadow and Steel
    ctx.preventAll = true; g.log('그림자와 강철: 이번 공격의 피해를 모두 막습니다', 'good'); await g.dealDamage(ctx.enemy, 4, { src: u, byPlayer: true }); if (!g.c(ctx.enemy).zone || !['villain', 'minion'].includes(g.c(ctx.enemy).zone)) ctx.cancel = true;
  } } };
  S['32041'] = { selfPiercing: true, on: { turnBegins(g, u) { if (g.c(u).zone === 'ally' && g.c(u).dmg) g.heal(u, 1); } } }; // Wolverine (ally)
  S['32042'] = { async onPlay(g) { // Magik
    const c = g.e.minions.filter(m => !tr(g, m, 'ELITE')); if (!c.length || !xmen(g, g.idt())) return;
    const paid = await g.pay({ n: 1, req: 'B' }, null, '매직: [정신] 1을 내고 하수인을 조우 덱에 섞을까요?', true); if (paid == null) return;
    const t = await pick(g, c, '매직: 조우 덱에 섞을 하수인'); if (!t) return;
    for (const a of g.c(t).att.slice()) g.discard(a); g.resetCard(t); g.put(t, 'edeck'); g.shuffle(g.e.deck); g.log(`매직: ${g.nm(t)}을(를) 조우 덱에 섞었습니다`, 'good');
  } };
  S['32044'] = { attach: { kind: 'minion' }, // Gatekeeper
    mod: { hp: (g, s, t) => t === g.c(s).on ? 2 : 0 }, grantKw: (g, s, t) => t === g.c(s).on ? ['patrol'] : null,
    on: { async attachedDefeated(g) { await thw(g, g.e.main, 4, null); } } };
  S['32045'] = { play: { timing: 'hero', label: 'attack', can: g => xmen(g, g.idt()) && !g.c(g.idt()).ex, async resolve(g, u) { // Team Strike
    g.c(g.idt()).ex = true; let x = g.stat(g.idt(), 'atk');
    const al = g.p.allies.filter(a => xmen(g, a) && !g.c(a).ex);
    const sel = al.length ? await g.ask({ type: 'select', title: '팀 공격: 함께 소진할 [엑스맨] 동료', cards: al, min: 0, max: al.length, confirm: '확정' }) : [];
    for (const a of sel || []) { g.c(a).ex = true; x += g.stat(a, 'atk'); }
    g.log(`팀 공격: 피해 ${x}을(를) 적들에게 나눠 줍니다`, 'good');
    await g.assignDamage(x, g.targets('attackable', g.idt()), '팀 공격: 피해 1을 줄 적', u);
  } } };
  S['32048'] = { selfCostMod: g => tr(g, g.idt(), 'MUTANT') || xmen(g, g.idt()) ? 1 : 0 }; // Colossus (ally)
  S['32049'] = { actions: [{ timing: 'alter', exhaust: true, label: '소진 → [뮤턴트]·[엑스맨] 캐릭터 회복 1', can: g => g.allFriendlyChars().some(x => (tr(g, x, 'MUTANT') || xmen(g, x)) && g.c(x).dmg > 0), // X-Mansion
    async use(g) { const t = await pick(g, g.allFriendlyChars().filter(x => (tr(g, x, 'MUTANT') || xmen(g, x)) && g.c(x).dmg > 0), 'X-맨션: 회복할 캐릭터'); if (t) g.heal(t, 1); } }] };

  // ======================= modular sets =======================
  const searchReveal = async (g, pred) => { const x = g.e.deck.concat(g.e.discard).find(u => pred(g.d(u), u)); if (x) { g.shuffle(g.e.deck); await g.reveal(x); return x; } return null; };
  const millUntil = async (g, pred, engage) => { // discard encounter cards until one matches, then reveal it (or put it into play engaged)
    for (let i = 0; i < 80; i++) { const x = g.takeEncounter(); if (!x) return null; if (pred(g.d(x), x)) { g.log(`${g.nm(x)}이(가) 나왔습니다`, 'warn'); if (engage) await g.enterMinion(x, {}); else await g.reveal(x); return x; } g.put(x, 'ediscard'); }
    return null;
  };
  MG.searchReveal = searchReveal; MG.millUntil = millUntil;
  const isMinionTr = t => d => d.type === 'minion' && (d.tr || []).includes(t);
  const exhaustOne = async (g, label, alliesOnly) => { const c = (alliesOnly ? g.p.allies : g.friendlyChars()).filter(x => !g.c(x).ex); const t = await pick(g, c, `${label}: 소진할 캐릭터`); if (t) { g.c(t).ex = true; g.log(`${label}: ${g.nm(t)} 소진`, 'warn'); } };
  const randomDiscard = (g, label) => { if (!g.p.hand.length) return; const x = g.p.hand[Math.floor(g.rand() * g.p.hand.length)]; g.put(x, 'discard'); g.log(`${label}: 손의 ${g.nm(x)}을(를) 무작위로 버림`, 'warn'); };
  const stunDamaged = (g, ctx) => { for (const x of (ctx.damaged || [])) if (g.c(x).zone) g.giveStatus(x, 'stun', '블롭'); };
  async function pyro(g) { let n = 0; for (let i = 0; i < 2; i++) { if (!g.p.deck.length) await g.reshuffleDeck(); const x = g.p.deck[0]; if (!x) break; n += (g.d(x).res || '').length; g.put(x, 'discard'); } g.log(`파이로: 덱 위 2장 버림, 자원 아이콘 ${n}`, 'warn'); if (n) await g.indirectDamage(n, null); }
  MG.avalanche = exhaustOne; MG.pyro = pyro; MG.toad = randomDiscard; MG.blobStun = stunDamaged;
  // Brotherhood
  S['32073'] = { on: { async afterEnemyAttack(g, u, ctx) { if (ctx.enemy === u) await exhaustOne(g, '애벌랜치'); } }, async boostEffect(g) { await exhaustOne(g, '★ 애벌랜치'); } }; // Avalanche
  S['32074'] = { on: { afterEnemyAttack(g, u, ctx) { if (ctx.enemy === u) stunDamaged(g, ctx); } } }; // Blob
  S['32075'] = { on: { async afterEnemyAttack(g, u, ctx) { if (ctx.enemy === u) await pyro(g); } } }; // Pyro
  S['32076'] = { on: { afterEnemyAttack(g, u, ctx) { if (ctx.enemy === u && (ctx.damaged || []).length) randomDiscard(g, '토드'); } }, boostEffect(g) { randomDiscard(g, '★ 토드'); } }; // Toad
  const homoHost = g => g.e.minions.find(m => !g.c(m).att.some(a => idOf(g, a) === '32077')) || null;
  S['32077'] = { attachTo: homoHost, surgeIfNoHost: true, mod: { hp: (g, s, t) => t === g.c(s).on ? 5 : 0 }, // Homo Superior
    whenRevealed(g, u) { const h = g.c(u).on; if (h) g.giveStatus(h, 'tough', '호모 슈페리어'); },
    boostEffect(g, u, ctx) { (ctx.post || ctx.after).push(async gg => { const h = homoHost(gg); if (h && gg.c(u).zone && gg.c(u).zone !== 'attach') { gg.attachEnc(u, h); gg.giveStatus(h, 'tough', '호모 슈페리어'); } }); } };
  S['32078'] = { async whenRevealed(g) { // Mutant Terrorists
    const x = await searchReveal(g, d => d.id === '32079');
    if (!x || g.c(x).zone !== 'side') await millUntil(g, isMinionTr('BROTHERHOOD OF MUTANTS'));
  } };
  S['32079'] = { grantKw: (g, s, t) => g.d(t).type === 'minion' && tr(g, t, 'BROTHERHOOD OF MUTANTS') ? ['quickstrike'] : null }; // The Brotherhood
  // Mystique
  const villainStat = (g, k) => g.e.villain ? (g.stat(g.e.villain, k) || 0) : 0;
  S['32080'] = { // Mystique (modular)
    mod: { atk: (g, s, t) => t === s ? villainStat(g, 'atk') : 0, sch: (g, s, t) => t === s ? villainStat(g, 'sch') : 0 },
    cannotAttack: (g, s, target) => g.c(s).zone === 'minion' && g.d(target).type === 'villain'
  };
  S['32081'] = { whenDefeated(g) { const c = g.e.discard.filter(u => tr(g, u, 'SHAPESHIFTER')); for (const u of c) { g.resetCard(u); g.put(u, 'deck'); } if (c.length) { g.shuffle(g.p.deck); g.log(`변신의 소동: [변신술사] 카드 ${c.length}장을 당신의 덱에 섞습니다`, 'warn'); } } }; // Metamorphic Mayhem
  const shapeshift = async (g, u, ctx) => { g.resetCard(u); g.put(u, 'deck'); g.shuffle(g.p.deck); g.log(`${g.nm(u)}: 당신의 덱에 섞습니다 (쇄도)`, 'warn'); ctx.surge++; };
  S['32082'] = { whenRevealed: shapeshift, async onHand(g, u) { // Infiltration
    const c = g.p.allies.concat(g.p.supports).filter(x => !g.d(x).permanent); const t = await pick(g, c, '잠입: 버릴 동료 또는 지원'); if (t) g.discard(t, '잠입'); } };
  S['32083'] = { whenRevealed: shapeshift, async onHand(g) { // Shapeshifter Surprise
    const m = g.e.minions.find(x => idOf(g, x) === '32080'); if (m) await g.activate(m, {}); else await searchReveal(g, d => d.id === '32080'); } };
  // Zero Tolerance
  const ozt = g => g.e.sides.find(u => idOf(g, u) === '32104') || null;
  MG.ozt = ozt;
  MG.underOZT = (g, x, why) => { const o = ozt(g); if (!o || !x) return false; g.resetCard(x); g.put(x, 'under', o); g.c(x).fd = true; g.log(`${why || ''}${g.nm(x)}을(를) 무관용 작전 아래에 뒷면으로 놓습니다 (${g.c(o).under.length}/${3 + g.players})`, 'warn');
    if (g.c(o).under.length >= 3 + g.players) g.lose('무관용 작전 아래의 카드가 한도에 이르렀습니다'); return true; };
  S['32101'] = { async whenRevealed(g, u, ctx) { if (ozt(g)) { ctx.surge++; return; } await searchReveal(g, d => d.id === '32104'); } }; // Sentinel Mark II
  S['32102'] = { async whenRevealed(g, u) { const x = g.e.deck.concat(g.e.discard).find(y => idOf(g, y) === '32103'); if (x) { g.attachEnc(x, u); g.giveStatus(u, 'tough', '에너지 장벽'); g.shuffle(g.e.deck); } }, // Sentinel Mark III
    async boostEffect(g) { if (g.c(g.idt()).stun) await g.dealDamage(g.idt(), 2, {}); else g.giveStatus(g.idt(), 'stun', '★ 센티넬 마크 III'); } };
  S['32103'] = { attachTo: g => g.e.minions.find(m => tr(g, m, 'SENTINEL') && !g.c(m).att.some(a => idOf(g, a) === '32103')) || null, surgeIfNoHost: true, // Energy Barrier
    whenRevealed(g, u) { const h = g.c(u).on; if (h) g.giveStatus(h, 'tough', '에너지 장벽'); },
    on: { afterEnemyAttack(g, u, ctx) { if (ctx.enemy === g.c(u).on && g.c(ctx.enemy).zone) g.giveStatus(ctx.enemy, 'tough', '★ 에너지 장벽'); } } };
  S['32104'] = { // Operation Zero Tolerance
    cannotLeave: g => !!g.e.main && idOf(g, g.e.main) === '32087b', // Night of the Sentinels: it gains permanent
    on: { afterEnemyAttack(g, u, ctx) { for (const x of (ctx.damaged || [])) if (x !== g.idt() && g.d(x).type === 'ally' && g.c(x).zone === 'discard') MG.underOZT(g, x, '무관용 작전: '); } }
  };
  // Sentinels
  const tfe = g => g.c(g.idt()).att.find(a => idOf(g, a) === '32107') || null;
  S['32105'] = { async whenRevealed(g, u) { if (tfe(g)) { if (g.c(u).zone === 'minion') await g.enemyAttack(u, {}); } else await searchReveal(g, d => d.id === '32107'); } }; // Sentinel Mark V
  S['32106'] = { boostEffect(g, u, ctx) { if (tfe(g)) (ctx.post || ctx.after).push(async gg => { if (gg.c(u).zone && gg.c(u).zone !== 'minion') { gg.put(u, 'facedown'); gg.log('★ 센티넬 마크 VI를 뒷면 조우 카드로 받습니다', 'warn'); } }); } }; // Sentinel Mark VI
  S['32107'] = { attachTo: g => tfe(g) ? null : g.idt(), surgeIfNoHost: true, // Targeted for Elimination
    noFormChange: (g, a) => g.isHero() && g.c(a).on === g.idt() && g.e.minions.some(m => tr(g, m, 'SENTINEL')),
    actions: [{ timing: 'action', label: '정체성 소진 → 이 카드 버림', can: (g, u) => g.c(u).on === g.idt() && !g.c(g.idt()).ex, use(g, u) { g.c(g.idt()).ex = true; g.discard(u, '제거 대상 해제'); } }] };
  S['32108'] = { noThwart: g => g.engagedMinions().some(m => tr(g, m, 'SENTINEL')) }; // Relentless Robots
  // Acolytes
  const acolyteDefeat = {
    '32159': async g => { await millUntil(g, isMinionTr('ACOLYTE'), true); }, // Fabian Cortez
    '32160': async g => { if (g.c(g.idt()).conf) await g.placeThreat(g.e.main, 2, {}); else g.giveStatus(g.idt(), 'conf', '아멜리아 보트'); }, // Amelia Voght
    '32161': async g => { if (g.c(g.idt()).stun) await g.dealDamage(g.idt(), 3, {}); else g.giveStatus(g.idt(), 'stun', '센야카'); }, // Senyaka
    '32162': async g => { const v = g.e.villain; if (!v) return; g.c(v).stun = false; g.c(v).conf = false; g.giveFacedownBoostTo(v, 1); g.log('델가도: 빌런의 상태 카드를 버리고 뒷면 강화 카드 1장', 'warn'); }, // Delgado
    '32163': async g => { const v = g.e.villain; if (!v) return; if (g.c(v).tough) g.heal(v, 4); else g.giveStatus(v, 'tough', '우누시오네'); } // Unuscione
  };
  for (const id in acolyteDefeat) S[id] = Object.assign(S[id] || {}, { async whenDefeated(g) { await acolyteDefeat[id](g); } });
  S['32161'].attackProps = () => ({ piercing: true });
  S['32164'] = { async whenRevealed(g) { // Zeal for the Cause
    const a = g.e.minions.filter(m => tr(g, m, 'ACOLYTE') && acolyteDefeat[idOf(g, m)]);
    if (!a.length) { await millUntil(g, d => d.type === 'minion'); return; }
    for (const m of a) await acolyteDefeat[idOf(g, m)](g);
  } };
  S['32165'] = { grantKw: (g, s, t) => g.d(t).type === 'minion' && tr(g, t, 'ACOLYTE') ? ['guard'] : null, // The Acolytes
    boostEffect(g) { const c = g.e.discard.filter(u => g.d(u).type === 'minion' && tr(g, u, 'ACOLYTE')); for (const u of c) g.put(u, 'edeck'); if (c.length) { g.shuffle(g.e.deck); g.log(`★ 애콜라이트 하수인 ${c.length}장을 조우 덱에 섞습니다`, 'warn'); } } };
  // Future Past
  S['32166'] = { on: { wouldTakeDamage(g, u, ctx) { // Nimrod: at most 3 damage each phase
    if (ctx.target !== u) return; const key = `${g.s.round}:${g.s.phase}`; const c = g.c(u); if (c.capKey !== key) { c.capKey = key; c.capTaken = 0; }
    const room = Math.max(0, 3 - c.capTaken); if (ctx.amount > room) { g.log(`님로드: 이번 단계 피해는 ${room}까지만`, 'warn'); ctx.amount = room; } c.capTaken += ctx.amount;
  } } };
  S['32167'] = { boostEffect(g, u, ctx) { (ctx.post || ctx.after).push(async gg => { if (gg.c(u).zone === 'boost' || gg.c(u).zone === 'ediscard') { gg.put(u, 'facedown'); gg.log('★ 바스티온을 뒷면 조우 카드로 받습니다', 'warn'); } }); } }; // Bastion
  S['32168'] = { async whenDefeated(g) { await g.forEachPlayer(async () => { let n = 0; for (let i = 0; i < 2; i++) { const x = g.takeEncounter(); if (!x) break; n += g.boostOf(x); g.put(x, 'ediscard'); } g.log(`님로드의 포털(${g.playerName()}): 강화 아이콘 ${n}`, 'warn'); if (n) await g.indirectDamage(n, null); }); } }; // Nimrod's Portal
  const underScheme = (g, u, n) => g.forEachPlayer(() => { let k = 0; for (let i = 0; i < n && g.p.deck.length; i++) { const x = g.p.deck[0]; g.put(x, 'under', u); g.c(x).fd = true; k++; } g.log(`${g.nm(u)}(${g.playerName()}): 덱 위 ${k}장을 뒷면으로 아래에 놓습니다`, 'warn'); });
  MG.underScheme = underScheme;
  S['32169'] = { async whenRevealed(g, u) { await underScheme(g, u, 9); } }; // Bastion's Machinations
  S['32170'] = { // Nano-Sentinel Tech
    mod: { hp: (g, s, t) => t === g.c(s).on ? 4 : 0 }, grantTrait: (g, s, t) => t === g.c(s).on ? 'SENTINEL' : null,
    async whenRevealed(g, u, ctx) {
      const H = Object.values(MC.heroes).find(h => h.hero === g.p.heroId) || {}; const nm = (H.nemesis || []).filter(id => (MC.cards[id] || {}).type === 'minion');
      let m = g.e.minions.find(x => nm.includes(idOf(g, x)));
      if (!m) { m = g.e.deck.concat(g.e.discard, g.e.setaside || [], g.e.aside || []).find(x => nm.includes(idOf(g, x))); if (m) { g.shuffle(g.e.deck); await g.enterMinion(m, {}); } }
      if (m && g.c(m).zone === 'minion') g.attachEnc(u, m); else { g.discard(u); ctx.surge++; }
    } };

  // ======================= scenarios =======================
  const scen = (key, o) => { MC.scenarios[key] = Object.assign(MC.scenarios[key] || {}, o); };
  const fromAside = (g, id) => (g.e.aside || []).concat(g.e.setaside || []).find(u => idOf(g, u) === id) || null;
  const facedownEach = (g, why) => g.forEachPlayer(() => { const x = g.takeEncounter(); if (x) { g.put(x, 'facedown'); g.log(`${why}(${g.playerName()}): 뒷면 조우 카드 1장`, 'warn'); } });
  const cost3 = (req, label) => ({ timing: 'hero', label: `${label} → 이 카드 버림`, cost: { n: 3, req }, can: (g, u) => g.c(u).zone === 'attach', use(g, u) { g.discard(u, label); } });
  const boostAttachVillain = (g, u, ctx) => { (ctx.post || ctx.after).push(async gg => { if (gg.e.villain && gg.c(u).zone && gg.c(u).zone !== 'attach') { gg.attachEnc(u, gg.e.villain); gg.log(`★ ${gg.nm(u)}이(가) 빌런에게 붙습니다`, 'warn'); } }); };
  const sentinelMill = g => millUntil(g, isMinionTr('SENTINEL'), true);

  // ---------- Sabretooth ----------
  const RK = '32066';
  const kelly = g => Object.keys(g.s.cards).find(u => idOf(g, u) === RK && g.c(u).zone && !['setaside', 'aside'].includes(g.c(u).zone)) || null;
  const hurtKelly = async (g, n, why) => { const k = kelly(g); if (k) { g.log(`${why}: 로버트 켈리에게 피해 ${n}`, 'warn'); await g.dealDamage(k, n, {}); } };
  for (const id of ['32060', '32061', '32062']) S[id] = { on: { async enemyActivated(g, u, ctx) { if (ctx.enemy !== u || !g.c(u).zone) return; // Sabretooth
    const x = g.takeEncounter(); if (!x) return; const n = g.boostOf(x); g.put(x, 'ediscard'); g.log(`★ 세이버투스: ${g.nm(x)} 버림 (강화 ${n})`); if (n) g.heal(u, n); } } };
  S['32063a'] = { async setup(g) { // Stalked by Sabretooth: Find the Senator with Robert Kelly attached
    const f = fromAside(g, '32065a'); const k = fromAside(g, RK); if (!f) return; await g.enterSide(f, {}); if (k) { g.put(k, 'attach', f); g.log('로버트 켈리가 「상원의원을 찾아라」에 붙어 있습니다', 'warn'); }
  } };
  S['32063b'] = { noTarget: true, on: { async mainStep1(g, u) { if (g.c(u).zone === 'main') await hurtKelly(g, g.c(u).threat >= 6 * g.players ? 3 : 2, '세이버투스의 추적'); } } };
  S['32064a'] = { async whenRevealed(g) { await facedownEach(g, '부상당한 상원의원'); } };
  S['32064b'] = { whenCompleted(g) { g.lose('로버트 켈리가 쓰러졌습니다'); } };
  S['32065a'] = { // Find the Senator
    async whenDefeated(g, u) {
      const k = kelly(g); if (k) { g.withPlayerSync(g.s.first, () => { g.put(k, 'ally'); g.c(k).ex = false; }); g.log(`로버트 켈리를 구출했습니다 — ${g.playerName(g.s.first)}이(가) 조종합니다`, 'good'); }
      g.c(u).id = '32065b'; g.c(u).threat = 0; g.put(u, 'env'); g.log('「상원의원을 보호하라」 환경', 'warn');
      await g.setMainStage(1); return 'handled';
    } };
  S['32065b'] = { respond: [{ window: 'afterHeroDefends', timing: 'hero', label: '자원 2 → 히어로 준비', cost: { n: 2, req: '' }, // Protect the Senator
    can: (g, u, ctx) => g.d(ctx.enemy).type === 'villain' && g.c(g.idt()).ex && !!kelly(g) && g.c(kelly(g)).zone === 'ally', resolve(g) { if (g.canReady(g.idt())) g.c(g.idt()).ex = false; } }] };
  S[RK] = { noAllyLimit: true, takesUndefended: true, noPlayerAttach: true, on: firstCtrl('ally'),
    onLeave(g) { g.lose('로버트 켈리가 플레이를 떠났습니다'); } };
  S['32067'] = { attachTo: g => g.e.villain, attackProps: () => ({ piercing: true }), actions: [cost3('YBR', '[에너지][정신][물리]')], boostEffect: boostAttachVillain }; // Adamantium Claws
  S['32068'] = { attachTo: g => g.e.villain, grantStalwart: true, actions: [cost3('YBR', '[에너지][정신][물리]')], boostEffect: boostAttachVillain }; // Animal Ferocity
  S['32069'] = { async whenRevealed(g) { // Sabretooth Strikes
    if (!kelly(g)) return; if (g.isHero() && !g.c(g.idt()).ex && await yes(g, '세이버투스의 습격: 히어로를 소진해 로버트 켈리의 피해를 막을까요?')) { g.c(g.idt()).ex = true; return; }
    await hurtKelly(g, 1, '세이버투스의 습격');
  }, boostEffect(g, u, ctx) { (ctx.post || ctx.after).push(async gg => { const d = ctx.defender; if (d && d !== gg.idt() && gg.c(d).zone !== 'ally' && gg.e.main) await gg.placeThreat(gg.e.main, 2, {}); }); } };
  S['32070'] = { async whenRevealed(g) { const v = g.e.villain; if (!v) return; const fresh = !g.c(v).dmg; // Unrelenting Savage
    if (g.isHero()) await g.enemyAttack(v, { atkBonus: fresh ? 1 : 0 }); else await g.enemyScheme(v, { schBonus: fresh ? 1 : 0 }); } };
  S['32071'] = { whenDefeated(g) { const k = kelly(g); if (k) g.heal(k, 2); } }; // Medical Emergency
  S['32072'] = { async whenDefeated(g) { if (g.e.villain) await g.enemyAttack(g.e.villain, {}); } }; // Feral Rage

  // ---------- Project Wideawake ----------
  const captives = g => (g.e.aside || []).concat(g.e.setaside || []).filter(u => tr(g, u, 'CAPTIVE'));
  S['32084'] = { async whenRevealed(g) { await g.withPlayer(g.s.first, () => searchReveal(g, d => d.id === '32100')); } };
  for (const id of ['32085', '32086']) S[id] = { async whenRevealed(g) { await g.withPlayer(g.s.first, () => searchReveal(g, d => d.id === '32100')); for (const pi of g.livingPlayers()) if (pi !== g.s.first) g.withPlayerSync(pi, () => { const x = g.takeEncounter(); if (x) { g.put(x, 'facedown'); g.log(`센티넬(${g.playerName()}): 뒷면 조우 카드 1장`, 'warn'); } }); } };
  S['32087a'] = { async setup(g) { // Night of the Sentinels
    const o = g.e.deck.concat(g.e.discard).find(u => idOf(g, u) === '32104'); if (o) await g.enterSide(o, {});
    const m = fromAside(g, '32088a'); if (m) await g.enterSide(m, {});
  } };
  S['32087b'] = { noTarget: true, async afterThreatPlaced(g, u) {
    while (g.c(u).threat >= 5 * g.players) { await g.forEachPlayer(() => { const x = g.p.deck[0] || null; if (x) MG.underOZT(g, x, `센티넬의 밤(${g.playerName()}): 덱 위 카드 `); }); g.c(u).threat -= 5 * g.players; g.log(`센티넬의 밤: 위협 ${5 * g.players} 제거`); }
  } };
  S['32088a'] = { async whenDefeated(g, u) { // Mutants at the Mall
    await searchReveal(g, isMinionTr('SENTINEL'));
    for (const a of g.allAllies().filter(x => (g.d(x).en || '').includes('Jubilee'))) g.discard(a);
    g.withPlayerSync(g.s.first, () => { g.c(u).id = '32088b'; g.c(u).threat = 0; g.put(u, 'ally'); g.c(u).ex = false; }); g.log(`쇼핑몰의 뮤턴트: 주빌리가 ${g.playerName(g.s.first)}에게 합류합니다`, 'good'); return 'handled';
  } };
  S['32088b'] = { noAllyLimit: true, on: firstCtrl('ally'), actions: [{ timing: 'action', exhaust: true, label: '소진·[에너지] 1 → 적에게 피해 2', cost: { n: 1, req: 'Y' }, can: (g, u) => g.c(u).zone === 'ally', // Jubilee
    async use(g, u) { const t = await g.chooseTarget('enemy', '주빌리: 피해 2를 줄 적', u, false); if (t) await g.dealDamage(t, 2, { src: u, byPlayer: true }); } }] };
  S['32089'] = { respond: [{ window: 'afterAllyAttack', label: '★ 빌런과 교전 중인 하수인 모두에게 피해 1', can: (g, u, ctx) => ctx.ally === u, async resolve(g) { for (const e of [g.e.villain].filter(Boolean).concat(g.engagedMinions())) await g.dealDamage(e, 1, { byPlayer: true }); } }] }; // Rictor
  S['32090'] = { respond: [{ window: 'afterAllyAttack', label: '★ 그 적에게 폭탄 카운터 1', can: (g, u, ctx) => ctx.ally === u && g.c(ctx.target).zone && ['villain', 'minion'].includes(g.c(ctx.target).zone), resolve(g, u, ctx) { g.c(ctx.target).cnt.bomb = (g.c(ctx.target).cnt.bomb || 0) + 1; } }], // Boom Boom
    on: { async playerPhaseEnd(g, u) { if (g.c(u).zone !== 'ally') return; for (const e of g.enemies().slice()) { const n = g.c(e).cnt.bomb || 0; if (!n) continue; g.c(e).cnt.bomb = 0; await g.dealDamage(e, 2 * n, { byPlayer: true }); } } } };
  S['32091'] = { respond: [{ window: 'afterAllyAttack', label: '★ 하수인을 물리쳐 후속 피해 1 회복', can: (g, u, ctx) => ctx.ally === u && ctx.defeated && g.d(ctx.target).type === 'minion' && g.c(u).dmg > 0, resolve(g, u) { g.heal(u, 1); } }] }; // Cannonball
  S['32092'] = { selfPiercing: true }; // Wolfsbane
  S['32093'] = { boostEffect: MG.boostEngage('센티넬 마크 IV가 교전합니다') }; // Sentinel Mark IV
  S['32094'] = { attachTo: g => g.e.villain, attackProps: () => ({ piercing: true, ranged: true }), actions: [cost3('RRR', '[물리]×3')], boostEffect(g) { g.c(g.idt()).ex = true; g.log('★ 건틀릿 빔: 정체성 소진', 'warn'); } }; // Gauntlet Beam
  S['32095'] = { attachTo: g => g.e.villain, mod: { retaliate: (g, s, t) => t === g.c(s).on ? 1 : 0 }, actions: [cost3('BBB', '[정신]×3')], boostEffect: boostAttachVillain }; // Learning A.I.
  S['32096'] = { attachTo: g => g.e.villain, mod: { hp: (g, s, t) => t === g.c(s).on ? 8 : 0 }, actions: [cost3('YYY', '[에너지]×3')], boostEffect: boostAttachVillain }; // Adaptive Armor
  S['32097'] = { whenRevealed(g) { const v = g.e.villain; if (!v) return; const c = g.c(v); c.stun = c.conf = c.stunH = c.confH = false; g.giveStatus(v, 'tough', '자가 수리'); g.heal(v, 5); }, // Self-Repair
    boostEffect(g) { if (g.e.villain) g.giveStatus(g.e.villain, 'tough', '★ 자가 수리'); } };
  S['32098'] = { async whenRevealed(g) { // Mutant Detected
    const opts = []; if (ozt(g) && g.p.deck.length) opts.push({ id: 'u', label: '덱 위 카드를 무관용 작전 아래에' }); opts.push({ id: 'a', label: '빌런과 교전 중인 하수인이 모두 당신을 공격' });
    const o = opts.length === 1 ? 'a' : await g.ask({ type: 'choice', title: '뮤턴트 감지: 하나를 고르세요', options: opts });
    if (o === 'u') MG.underOZT(g, g.p.deck[0], '뮤턴트 감지: ');
    else for (const e of [g.e.villain].concat(g.engagedMinions()).filter(Boolean)) if (g.c(e).zone && g.c(g.idt()).zone) await g.enemyAttack(e, {});
  } };
  S['32099'] = { // Warn the Others
    whenRevealed(g, u) { g.put(u, 'pobl'); },
    on: { playerPhaseEnd(g, u) { if (g.c(u).zone === 'pobl' && ozt(g)) MG.underOZT(g, u, '다른 이들에게 경고: '); } },
    actions: [{ timing: 'alter', label: '정체성 소진 → 이 카드 버림', can: (g, u) => g.c(u).zone === 'pobl' && !g.c(g.idt()).ex, use(g, u) { g.c(g.idt()).ex = true; g.discard(u); } }]
  };
  S['32100'] = { async whenDefeated(g) { const c = captives(g); if (!c.length) return; const x = c[Math.floor(g.rand() * c.length)]; g.put(x, 'ally'); g.c(x).ex = false; g.log(`납치 규약 저지: ${g.nm(x)}을(를) 구출해 조종합니다`, 'good'); } }; // Abduction Protocols

  // ---------- Master Mold ----------
  for (const id of ['32109', '32110', '32111']) S[id] = { schemeNoBoost: true, async beforeScheme(g) { g.log('★ 마스터 몰드: 센티넬 하수인을 찾습니다'); await sentinelMill(g); } };
  S['32112a'] = { setup(g) { const m = fromAside(g, '32172b'); if (m) { g.withPlayerSync(g.s.first, () => g.put(m, 'ally')); g.log(`준비: 매그니토(동료)가 ${g.playerName(g.s.first)}의 편에 섭니다`, 'good'); } } };
  const sentinelGuard = { grantKw: (g, s, t) => g.d(t).type === 'minion' && tr(g, t, 'SENTINEL') ? ['guard'] : null };
  S['32112b'] = Object.assign({ async whenRevealed(g) { await sentinelMill(g); } }, sentinelGuard);
  S['32113a'] = { async whenRevealed(g) { g.e.discard.slice().forEach(u => g.put(u, 'edeck')); g.shuffle(g.e.deck); await sentinelMill(g); } };
  S['32113b'] = Object.assign({ loseOnComplete: true }, sentinelGuard);
  S['32172b'] = { noAllyLimit: true, on: firstCtrl('ally'), respond: [{ window: 'afterAllyAttack', label: '★ 센티넬을 물리쳐 회복 1', can: (g, u, ctx) => ctx.ally === u && ctx.defeated && tr(g, ctx.target, 'SENTINEL') && g.c(u).dmg > 0, resolve(g, u) { g.heal(u, 1); } }] }; // Magneto (ally)
  S['32114'] = { on: { minionEnters(g, u, ctx) { if (ctx.minion !== u) return; const x = g.e.discard.slice().reverse().find(y => g.d(y).type === 'attachment' && tr(g, y, 'SENTINEL')); if (x) g.attachEnc(x, u); } } }; // Sentinel Mark VIII
  const sentinelHost = id => g => g.e.minions.find(m => tr(g, m, 'SENTINEL') && !g.c(m).att.some(a => idOf(g, a) === id)) || null;
  S['32115'] = { attachTo: g => g.e.minions.find(m => tr(g, m, 'SENTINEL')) || null, surgeIfNoHost: true, mod: { hp: (g, s, t) => t === g.c(s).on ? 2 : 0, retaliate: (g, s, t) => t === g.c(s).on ? 1 : 0 }, // Unit Upgrade
    boostEffect(g, u, ctx) { (ctx.post || ctx.after).push(async gg => { const h = gg.e.minions.find(m => tr(gg, m, 'SENTINEL')); if (h && gg.c(u).zone && gg.c(u).zone !== 'attach') gg.attachEnc(u, h); }); } };
  S['32116'] = { attachTo: sentinelHost('32116'), surgeIfNoHost: true, on: { afterEnemyAttack(g, u, ctx) { if (ctx.enemy === g.c(u).on) for (const x of (ctx.damaged || [])) if (g.c(x).zone) g.giveStatus(x, 'stun', '★ 기절 광선'); } } }; // Stun Beam
  S['32117'] = { async whenRevealed(g) { // Master Mold's Children
    const m = g.engagedMinions(); const hero = g.isHero();
    if (!m.length) { if (g.e.villain) { if (hero) await g.enemyAttack(g.e.villain, {}); else await g.enemyScheme(g.e.villain, {}); } return; }
    for (const x of m) if (g.c(x).zone === 'minion' && g.c(g.idt()).zone) { if (hero) await g.enemyAttack(x, {}); else await g.enemyScheme(x, {}); }
  } };
  S['32118'] = { whenRevealed(g, u, ctx) { const m = g.e.minions.filter(x => tr(g, x, 'SENTINEL')); if (!m.length) { ctx.surge++; return; } for (const x of m) g.giveStatus(x, 'tough', '실드 가동'); }, // Shields Up
    boostEffect(g) { if (g.e.villain) g.giveStatus(g.e.villain, 'tough', '★ 실드 가동'); } };
  S['32119'] = { async whenDefeated(g) { await sentinelMill(g); } }; // Intruder Alert!
  S['32120'] = { async whenDefeated(g) { for (const e of g.enemies().filter(x => tr(g, x, 'SENTINEL'))) await g.dealDamage(e, 2, { byPlayer: true }); } }; // Insert Virus Program

  // ---------- Magneto ----------
  const isMagnetic = d => (d.tr || []).includes('MAGNETIC');
  async function addMagnet(g, n) { // magnet counters on the main scheme; at 3 a Magnetic card comes out
    const m = g.e.main; if (!m) return; const c = g.c(m); c.cnt.magnet = (c.cnt.magnet || 0) + n; g.log(`자석 카운터 +${n} (현재 ${c.cnt.magnet})`, 'warn');
    while (['32141b', '32142b', '32143b'].includes(idOf(g, m)) && (c.cnt.magnet || 0) >= 3) { c.cnt.magnet -= 3; await millUntil(g, isMagnetic); }
  }
  MG.addMagnet = addMagnet;
  for (const id of ['32138', '32139', '32140']) S[id] = { on: { async afterEnemyAttack(g, u, ctx) { if (ctx.enemy === u) await addMagnet(g, 1); } } };
  S['32139'].whenRevealed = S['32140'].whenRevealed = g => facedownEach(g, '매그니토');
  S['32141a'] = { async setup(g) { const b = fromAside(g, '32144a'); if (b) await g.enterSide(b, {}); } };
  S['32142a'] = { async whenRevealed(g) { await addMagnet(g, 1); if (!(g.e.victory || []).some(u => idOf(g, u) === '32144b')) await g.withPlayer(g.s.first, () => searchReveal(g, d => d.id === '32146')); } };
  S['32143a'] = { async whenRevealed(g) { await addMagnet(g, 2); const v = g.e.villain; if (v && !g.c(v).att.some(a => idOf(g, a) === '32145b')) await g.withPlayer(g.s.first, () => searchReveal(g, d => d.type === 'attachment' && isMagnetic(d))); } };
  S['32143b'] = { loseOnComplete: true };
  const capDamage = cap => ({ wouldTakeDamage(g, u, ctx) { const v = g.e.villain; if (ctx.target !== v || g.c(u).zone !== 'side') return; const room = Math.max(0, cap * g.players - g.c(v).dmg); if (ctx.amount > room) { g.log(`${g.nm(u)}: 매그니토는 피해를 ${cap * g.players}까지만 받습니다`, 'warn'); ctx.amount = room; } } });
  S['32144a'] = { on: capDamage(6), async whenDefeated(g, u) { g.c(u).id = '32144b'; g.c(u).threat = 0; await g.enterSide(u, {}); return 'handled'; } }; // Boarding Party
  S['32144b'] = { on: capDamage(12), async whenDefeated(g, u) { const o = fromAside(g, '32145a'); g.c(u).threat = 0; g.put(u, 'victory'); if (o) await g.enterSide(o, {}); return 'handled'; } }; // Sabotage Master Mold
  S['32145a'] = { on: capDamage(18), whenDefeated(g, u) { const v = g.e.villain; if (!v) return; g.c(u).id = '32145b'; g.c(u).threat = 0; g.attachEnc(u, v); g.log('물리적 부담: 매그니토가 견고를 잃습니다', 'good'); return 'handled'; } }; // Orbital Decay
  S['32145b'] = { permanent: true, removesSteady: true }; // Physical Strain
  S['32146'] = { whenDefeated(g) { if (g.e.villain) g.giveStatus(g.e.villain, 'tough', 'M형 센티넬'); }, // M-Type Sentinel
    boostEffect(g) { if (g.e.villain) { g.giveStatus(g.e.villain, 'tough', '★ M형 센티넬'); g.giveFacedownBoostTo(g.e.villain, 1); } } };
  const armorPiece = { attachTo: g => g.e.villain, respond: [{ window: 'afterBasicPower', timing: 'hero', label: '[에너지][정신][물리] → 이 카드 버림', cost: { n: 3, req: 'YBR' }, can: (g, u, ctx) => ctx.kind === 'attack' && g.c(u).zone === 'attach', resolve(g, u) { g.discard(u, '자원으로 떼어냄'); } }] };
  S['32147'] = Object.assign({ blocksConf: true }, armorPiece); // Magneto's Helmet
  S['32148'] = Object.assign({ blocksStun: true }, armorPiece); // Magneto's Armor
  S['32149'] = { attachTo: g => g.e.villain, mod: { retaliate: (g, s, t) => t === g.c(s).on ? 1 : 0 }, // Magnetic Bubble
    on: { wouldTakeDamage(g, u, ctx) { if (ctx.target !== g.c(u).on || ctx.amount <= 0) return; g.c(u).dmg += ctx.amount; g.log(`자기장 방울: 피해 ${ctx.amount}을(를) 대신 받습니다 (${g.c(u).dmg}/8)`, 'warn'); ctx.amount = 0; if (g.c(u).dmg >= 8) g.discard(u, '자기장 방울이 터졌습니다'); } } };
  S['32150'] = { attachTo: g => g.c(g.idt()).att.some(a => idOf(g, a) === '32150') ? null : g.idt(), surgeIfNoHost: true, // Wrapped in Metal
    heroNo: { attack: (g, s) => g.c(s).on === g.idt(), defend: (g, s) => g.c(s).on === g.idt(), recover: (g, s) => g.c(s).on === g.idt() }, cannotThwart: (g, s) => g.c(s).on === g.idt(),
    actions: [{ timing: 'action', label: '정체성 소진·[물리] 1 → 이 카드 버림', cost: { n: 1, req: 'R' }, can: (g, u) => g.c(u).on === g.idt() && !g.c(g.idt()).ex, use(g, u) { g.c(g.idt()).ex = true; g.discard(u, '금속 속박 해제'); } }] };
  S['32151'] = { async whenRevealed(g) { const v = g.e.villain; if (!v) return; // Master of Magnetism
    const x = g.e.discard.slice().reverse().find(u => isMagnetic(g.d(u))); if (x) { g.put(x, 'edeck', null, true); g.giveFacedownBoostTo(v, 1); g.log(`자기력의 지배자: ${g.nm(x)}을(를) 매그니토의 강화 카드로`, 'warn'); }
    await g.activate(v, {});
  } };
  const magnets = g => (g.e.main && g.c(g.e.main).cnt.magnet) || 0;
  S['32152'] = { async whenRevealed(g) { const n = magnets(g); // Electric Shock
    if (g.isHero()) { g.giveStatus(g.idt(), 'stun', '전기 충격'); if (n) await g.dealDamage(g.idt(), n, {}); } else { g.giveStatus(g.idt(), 'conf', '전기 충격'); if (n) await g.placeThreat(g.e.main, n, {}); } } };
  S['32153'] = { async whenRevealed(g) { for (const u of g.p.upgrades.concat(g.p.supports)) g.c(u).ex = true; g.log('전자기 폭발: 업그레이드·지원 모두 소진', 'warn'); await addMagnet(g, 1); }, // Electromagnetic Blast
    boostEffect(g) { g.c(g.idt()).ex = true; } };
  S['32154'] = { async whenRevealed(g) { for (const x of g.allFriendlyChars().slice()) await g.dealDamage(x, 1, {}); await addMagnet(g, 1); }, // Metal Shards
    boostEffect(g, u, ctx) { (ctx.post || ctx.after).push(async gg => { const d = ctx.defender; if (d && d !== gg.idt() && gg.c(d).zone !== 'ally') await addMagnet(gg, 1); }); } };
  S['32155'] = { async whenRevealed(g) { // Magnetic Missile
    const s = g.e.minions.filter(m => tr(g, m, 'SENTINEL')); const t = await pick(g, s, '자기 미사일: 물리칠 센티넬 하수인'); if (t) await g.defeat(t, {});
    let n = 5; if (g.p.hand.length) { const sel = await g.ask({ type: 'select', title: '자기 미사일: 버린 장수만큼 피해 방지 (최대 5)', cards: g.p.hand.slice(), min: 0, max: Math.min(5, g.p.hand.length), confirm: '확정' }); for (const x of sel || []) g.put(x, 'discard'); n -= (sel || []).length; }
    if (n > 0) await g.dealDamage(g.idt(), n, {});
  } };
  S['32156'] = { async whenDefeated(g) { let n = 0; for (let i = 0; i < 4; i++) { const x = g.takeEncounter(); if (!x) break; if (isMagnetic(g.d(x))) n++; g.put(x, 'ediscard'); } if (n) await addMagnet(g, n); } }; // Magnetic Mayhem
  S['32157'] = { async whenRevealed(g, u) { const n = 2 * g.p.allies.length; if (n) await g.placeThreat(u, n, { src: u }); }, boostEffect(g) { for (const a of g.p.allies) g.c(a).ex = true; } }; // Magnetically Sealed
  S['32158'] = { async whenRevealed(g, u) { await underScheme(g, u, 6); }, async whenDefeated(g) { if (g.e.villain) await g.activate(g.e.villain, {}); } }; // Seized!

  // ---------- Mansion Attack ----------
  S['32125a'] = { setup(g) { const s = fromAside(g, '32130'); if (s) { g.put(s, 'env'); g.log('「학교를 지켜라」 환경'); } } };
  S['32125b'] = { async whenRevealed(g) { await facedownEach(g, '브라더후드의 습격'); g.e.mainVictory = 1; await g.setMainStage(1); } };
  const mansionComplete = async (g, u) => { g.e.mainVictory = (g.e.mainVictory || 1) + 1; g.log(`학교 구역을 빼앗겼습니다 (${g.e.mainVictory}/3)`, 'warn'); if (g.e.mainVictory >= 3 || g.e.mainIdx + 1 >= g.e.mainStages.length) g.lose('주 음모 3장이 승점 더미에 놓였습니다'); await g.setMainStage(g.e.mainIdx + 1); return 'handled'; };
  const chars = g => g.allFriendlyChars().concat(g.enemies());
  S['32126b'] = { steadyFor: (g, s, t) => chars(g).includes(t), whenCompleted: mansionComplete }; // The Atrium
  S['32127b'] = { mod: { retaliate: (g, s, t) => chars(g).includes(t) ? 1 : 0 }, whenCompleted: mansionComplete }; // The Cafeteria
  S['32128b'] = { on: { minionEnters(g, u, ctx) { g.giveStatus(ctx.minion, 'tough', '농구장'); } }, // The Basketball Court
    respond: [{ window: 'allyEntered', label: '강인함 카드 받기', can: (g, u, ctx) => g.c(ctx.ally).zone === 'ally', resolve(g, u, ctx) { g.giveStatus(ctx.ally, 'tough', '농구장'); } }], whenCompleted: mansionComplete };
  S['32129b'] = { mod: { atk: (g, s, t) => chars(g).includes(t) ? 1 : 0 }, whenCompleted: mansionComplete }; // The Courtyard
  S['32130'] = { on: { async villainAdvanced(g, u, ctx) { // Save the School
    const v = ctx.villain; const c = g.c(v); c.stun = c.conf = c.stunH = c.confH = false; for (const a of c.att.slice()) g.discard(a);
    await facedownEach(g, '학교를 지켜라');
    const en = ((g.d(v).en || '').replace(/^\*\s*/, '').replace(/\s+[AB]$/, '')).toLowerCase();
    const m = g.e.minions.find(x => ((g.d(x).en || '').replace(/^\*\s*/, '')).toLowerCase() === en);
    if (m) { g.discard(m, `${g.nm(m)}: 같은 이름의 빌런이 등장`); await g.activate(v, {}); }
  } } };
  const villainNamed = (g, nm) => g.e.villain && (g.d(g.e.villain).en || '').includes(nm);
  const brotherCall = (nm, minionId) => ({ async whenRevealed(g) { // Ground Swell, Immovable, Pyromaniac, Hopping Mad
    const m = g.e.minions.find(x => idOf(g, x) === minionId);
    if (villainNamed(g, nm)) await g.activate(g.e.villain, {}); else if (m) await g.activate(m, {}); else await searchReveal(g, d => d.id === minionId);
  } });
  S['32132'] = brotherCall('Avalanche', '32073'); S['32133'] = brotherCall('Blob', '32074'); S['32134'] = brotherCall('Pyro', '32075'); S['32135'] = brotherCall('Toad', '32076');
  for (const [id, nm] of [['32132', 'Avalanche'], ['32133', 'Blob'], ['32134', 'Pyro'], ['32135', 'Toad']]) S[id].boostEffect = (g, u, ctx) => { if (villainNamed(g, nm) && ctx && ctx.enemy === g.e.villain) { g.log(`★ ${g.nm(u)}: 강화 카드 1장 추가`, 'warn'); const x = g.takeEncounter(); return x ? (g.put(x, 'ediscard'), g.boostOf(x)) : 0; } return 0; };
  S['32131'] = { async whenRevealed(g) { // Brotherhood Beatdown
    const has = nm => g.enemies().some(e => (g.d(e).en || '').includes(nm));
    if (has('Avalanche')) g.c(g.idt()).ex = true; if (has('Blob')) g.giveStatus(g.idt(), 'stun', '브라더후드의 뭇매');
    if (has('Pyro')) await g.indirectDamage(2, null); if (has('Toad')) randomDiscard(g, '브라더후드의 뭇매');
  } };
  S['32136'] = { async whenDefeated(g) { await g.searchToHand(d => d.type === 'ally', '학생 보호: 손으로 가져올 동료', { discard: true }); } }; // Protect the Students
  S['32137'] = { async whenRevealed(g, u) { const n = 3 * g.enemies().filter(e => tr(g, e, 'BROTHERHOOD OF MUTANTS')).length; if (n) await g.placeThreat(u, n, { src: u }); } }; // Under Siege
  // Mansion Attack villains reuse the Brotherhood minions' abilities
  for (const id of ['32121a', '32121b']) S[id] = { on: { async afterEnemyAttack(g, u, ctx) { if (ctx.enemy === u) await exhaustOne(g, '애벌랜치', true); } } };
  for (const id of ['32122a', '32122b']) S[id] = { on: { afterEnemyAttack(g, u, ctx) { if (ctx.enemy === u) stunDamaged(g, ctx); } } };
  for (const id of ['32123a', '32123b']) S[id] = { on: { async afterEnemyAttack(g, u, ctx) { if (ctx.enemy === u) await pyro(g); } } };
  for (const id of ['32124a', '32124b']) S[id] = { on: { afterEnemyAttack(g, u, ctx) { if (ctx.enemy === u && (ctx.damaged || []).length) randomDiscard(g, '토드'); } } };

  // ======================= Campaign: Mutant Genesis (cards/pack/mut_gen/campaign.py, mutant_genesis_campaign) =======================
  const MGC = 'mutant_genesis', FP = ['32166', '32167', '32168', '32169', '32170'];
  const ROLES = { Brawler: ['32176', '32177', '32178', '32179', '32180'], Commander: ['32181', '32182', '32183', '32184', '32185'], Defender: ['32186', '32187', '32188', '32189', '32190'], Peacekeeper: ['32191', '32192', '32193', '32194', '32195'] };
  const PREREQ = { 2: 'Frightened Police Defeated', 3: 'Enemy of My Enemy Defeated', 4: 'Find the Prisoners Defeated', 5: 'Surprise Attack Defeated' };
  const fpTop = g => { const d = (g.e.fpDeck || []).filter(u => g.c(u).zone === 'aside'); const x = d[0]; if (x) { g.put(x, 'edeck'); g.shuffle(g.e.deck); g.log(`지나간 미래 덱 맨 위 카드 ${g.nm(x)}을(를) 조우 덱에 섞습니다`, 'warn'); } };
  MC.CAMPAIGNS[MGC] = {
    async setup(g, spec) {
      const lv = spec.level || 1, inEnc = g.clogList('Future Past Cards in Encounter Deck'), out = g.clogList('Future Past Cards removed from campaign');
      FP.filter(id => inEnc.includes(id) && !out.includes(id)).forEach(id => g.newCard(id, 'edeck')); g.shuffle(g.e.deck);
      g.e.fpDeck = FP.filter(id => !inEnc.includes(id) && !out.includes(id)).map(id => g.newCard(id, 'aside')); g.shuffle(g.e.fpDeck);
      const cs = g.newCard(`3217${lv}a`, 'limbo'); g.log(`캠페인: 캠페인 부가 음모 「${g.nm(cs)}」 공개`, 'warn'); await g.reveal(cs);
      if (!PREREQ[lv] || g.clog(PREREQ[lv])) {
        const gone = g.clogList('Role Upgrades removed from campaign'), used = new Set();
        await g.forEachPlayer(() => {
          const av = (ROLES[g.clogP('Role')] || []).filter(id => !gone.includes(id) && !used.has(id));
          if (av.length) { const pickId = av[Math.floor(g.rand() * av.length)]; used.add(pickId); const u = g.newCard(pickId, 'upgrade'); g.log(`캠페인(${g.playerName()}): 역할 업그레이드 ${g.nm(u)}`, 'good'); }
        });
      }
      if (lv >= 3) {
        if (g.clog('Jubilee')) { const j = g.newCard('32088b', 'limbo'); await g.withPlayer(g.s.first, () => g.putAllyIntoPlay(j)); }
        const gone = g.clogList('Allies removed from the campaign');
        await g.forEachPlayer(() => {
          const cap = g.clogPList('Captive Allies').filter(id => !gone.includes(id) && MC.cards[id]); cap.forEach(id => g.newCard(id, 'deck')); if (cap.length) g.shuffle(g.p.deck);
          g.p.deck.filter(u => gone.includes(g.c(u).id)).forEach(u => g.removeFromGame(u));
        });
      }
      if (lv < 2) return;
      await g.forEachPlayer(async () => {
        const hp = g.clogPInt('Remaining hit points'); if (hp) g.setIdentityHP(hp);
        if (g.s.scen.expert && g.c(g.idt()).dmg > 0 && await yes(g, `숙련 캠페인(${g.playerName()}): 주 음모에 가속 토큰 1개를 놓고 생명력을 모두 회복할까요?`)) { const m = g.e.main; g.c(m).cnt.accelTok = (g.c(m).cnt.accelTok || 0) + 1; g.c(g.idt()).dmg = 0; }
      });
    }
  };
  [['32063a', 1], ['32087a', 2], ['32112a', 3], ['32125a', 4], ['32141a', 5]].forEach(([id, lv]) => { S[id] = Object.assign(S[id] || {}, { campaign: { level: lv } }); });
  // campaign side schemes and their back sides
  S['32171a'] = { whenDefeated(g) { fpTop(g); g.withPlayerSync(g.s.first, () => g.newCard('32171b', 'support')); g.log(`메트로 경찰이 ${g.playerName(g.s.first)}의 플레이 영역에 들어옵니다`, 'good'); } }; // Frightened Police → Metro Police
  S['32171b'] = { permanent: true, on: firstCtrl('support'), actions: [{ timing: 'action', exhaust: true, label: '메트로 경찰 소진 → 피해 1 또는 위협 1 제거', can: (g, u) => g.c(u).zone === 'support' && !g.c(u).ex, async use(g, u) { g.c(u).ex = true;
    const o = await g.ask({ type: 'choice', title: '메트로 경찰', options: [{ id: 'd', label: '적에게 피해 1' }, { id: 't', label: '음모 위협 1 제거' }] });
    if (o === 'd') { const t = await g.chooseTarget('enemy', '피해 1을 줄 적', u, false); if (t) await g.dealDamage(t, 1, { src: u, byPlayer: true }); } else { const t = await g.chooseTarget('thwartable', '위협 1을 제거할 음모', u, false); if (t) await thw(g, t, 1, u); } } }] };
  S['32172a'] = { async whenDefeated(g) { fpTop(g); const m = g.newCard('32172b', 'limbo'); await g.withPlayer(g.s.first, () => g.putAllyIntoPlay(m)); } }; // Enemy of My Enemy → Magneto
  S['32173a'] = { async whenRevealed(g, u) { const a = await pick(g, g.p.deck.filter(x => g.d(x).type === 'ally'), '포로 찾기: 이 카드 밑에 놓을 동료'); if (a) { g.put(a, 'under', u); g.c(a).fd = true; g.shuffle(g.p.deck); } }, // Find the Prisoners → Free the Prisoners
    async whenDefeated(g, u) { fpTop(g); const env = g.newCard('32173b', 'limbo'); await g.enterEnv(env); for (const x of g.c(u).under.slice()) g.put(x, 'under', env); } };
  S['32173b'] = { respond: [{ window: 'afterPlayerDefeatsMinion', label: '자원 1 → 밑의 동료 1장을 플레이', cost: { n: 1, req: '' }, can: (g, u, ctx) => g.c(u).zone === 'env' && g.c(u).under.length > 0 && ctx.minion && tr(g, ctx.minion, 'SENTINEL'), async resolve(g, u) { const a = await pick(g, g.c(u).under.slice(), '포로 구출: 플레이할 동료'); if (a) { g.c(a).fd = false; await g.putAllyIntoPlay(a); } } }] };
  S['32174a'] = { whenDefeated(g) { fpTop(g); const o = g.newCard('32174b', 'pobl'); g.log(`${g.nm(o)}을(를) 내 플레이 영역에 놓습니다`, 'good'); } }; // Surprise Attack → Reactive Defense
  S['32174b'] = { actions: [{ timing: 'alter', label: '[에너지][정신][물리] → 각 적에게 피해 5', cost: { n: 3, req: 'YBR' }, can: (g, u) => g.c(u).zone === 'pobl', async use(g, u) { for (const x of g.enemies().slice()) if (g.c(x).zone) await g.dealDamage(x, 5, { src: u, byPlayer: true }); g.removeFromGame(u); } }] };
  S['32175a'] = { whenDefeated(g) { fpTop(g); const p = g.newCard('32175b', 'limbo'); const m = g.e.villain; if (m) g.attachEnc(p, m); } }; // Magneto's Fortress → Magneto's Power
  S['32175b'] = { permanent: true };
  // role upgrades (removed from the game and the campaign pool when used)
  const spend = (g, u) => { g.removeFromGame(u); if (g.campaignOn(MGC)) g.clogSet('Role Upgrades removed from campaign', g.clogList('Role Upgrades removed from campaign').concat([g.c(u).id]).join(';')); };
  async function removeTotal(g, n, src) { while (n > 0) { const c = g.targets('thwartable', src).filter(x => g.c(x).threat > 0); if (!c.length) break; const t = await pick(g, c, `위협을 제거할 음모 (남은 ${n})`); if (!t) break; const k = Math.min(n, g.c(t).threat); const { r } = await thw(g, t, k, src); n -= Math.max(1, r); } }
  const roleAct = (timing, label, req, run) => ({ actions: [{ timing, label, cost: req ? { n: req, req: '' } : undefined, can: (g, u) => g.c(u).zone === 'upgrade', async use(g, u) { await run(g, u); spend(g, u); } }] });
  const roleRes = (traits, after) => ({ resources: [{ gen: 'GG', label: '와일드 2', forOnly: (g, s, uid) => !!uid && g.d(uid).type === 'event' && traits.some(t => tr(g, uid, t)), can: (g, u) => g.c(u).zone === 'upgrade' && g.isHero(), use: (g, u) => { spend(g, u); if (after) (g.p.afterPay = g.p.afterPay || []).push(() => after(g)); } }] });
  const finishing = { heroAttackBoost: async (g, u) => g.c(u).zone === 'upgrade' && await yes(g, '최후의 일격: 이 공격에 피해 +3과 압살?') ? (spend(g, u), { amount: 3, overkill: true }) : null };
  S['32176'] = finishing; S['32181'] = finishing;
  const bluster = { respond: [{ window: 'heroDefends', label: '허세: 방어 +3, 히어로 준비', can: (g, u) => g.c(u).zone === 'upgrade', resolve(g, u, hd) { hd.defBonus = (hd.defBonus || 0) + 3; g.c(g.idt()).ex = false; spend(g, u); } }] };
  S['32177'] = bluster; S['32186'] = bluster;
  S['32178'] = { respond: [{ window: 'wouldTakeAttackDamage', label: '대담한 방어: 자원 1 → 피해 3 방지, 그 적에게 피해 3', cost: { n: 1, req: '' }, can: (g, u, ctx) => g.c(u).zone === 'upgrade' && g.isHero() && ctx.target === g.idt(), async resolve(g, u, ctx) { ctx.prevent += 3; const e = ctx.src && g.c(ctx.src) && g.c(ctx.src).zone ? ctx.src : null; spend(g, u); if (e) await g.dealDamage(e, 3, { src: g.idt(), byPlayer: true }); } }] };
  S['32179'] = roleAct('hero', '맹렬한 공격: 자원 3 → 피해 6, 히어로 준비', 3, async (g, u) => { const t = await g.chooseTarget('attackable', '피해 6을 줄 적', g.idt(), false); if (t) await g.playerAttack(g.idt(), t, 6, { src: u }); g.c(g.idt()).ex = false; });
  S['32180'] = roleRes(['ATTACK', 'DEFENSE'], g => g.giveStatus(g.idt(), 'tough', '함성'));
  const compassion = { respond: [{ window: 'afterBasicPower', label: '연민: 피해 합계 3 회복, 카드 1장', can: (g, u, ctx) => g.c(u).zone === 'upgrade' && ctx.kind === 'recover', async resolve(g, u) { let n = 3; while (n > 0) { const c = g.friendlyChars().filter(x => g.c(x).dmg > 0); if (!c.length) break; const t = await pick(g, c, `회복할 캐릭터 (남은 ${n})`); if (!t) break; n -= g.heal(t, n) || 1; } await g.draw(1); spend(g, u); } }] };
  S['32182'] = compassion; S['32192'] = compassion;
  S['32183'] = roleAct('hero', '집단 맹공: 이번 단계 동료의 부수적 피해 방지', 0, g => { g.p.phase.noAllyCons = true; });
  S['32193'] = roleAct('hero', '구조 작전: 이번 단계 동료의 부수적 피해 방지', 0, g => { g.p.phase.noAllyCons = true; });
  S['32184'] = roleAct('hero', '충격과 공포: 자원 3 → 피해 6, 동료 모두 준비', 3, async (g, u) => { const t = await g.chooseTarget('attackable', '피해 6을 줄 적', g.idt(), false); if (t) await g.playerAttack(g.idt(), t, 6, { src: u }); g.p.allies.forEach(a => { g.c(a).ex = false; }); });
  S['32185'] = roleRes(['ATTACK', 'TACTIC'], async g => { const a = await pick(g, g.p.allies.slice(), '즉흥: 준비할 동료'); if (a) { g.c(a).ex = false; g.heal(a, 2); } });
  const surprise = { respond: [{ window: 'afterHeroThwart', label: '놀랐지!: 위협 합계 3 제거, 적 혼란', can: (g, u) => g.c(u).zone === 'upgrade', async resolve(g, u) { await removeTotal(g, 3, g.idt()); const e = await g.chooseTarget('enemy', '혼란에 빠뜨릴 적', u, false); if (e) g.giveStatus(e, 'conf', '놀랐지!'); spend(g, u); } }] };
  S['32187'] = surprise; S['32191'] = surprise;
  S['32188'] = roleAct('hero', '영웅적 개입: 자원 3 → 위협 합계 5 제거, 강인함', 3, async g => { await removeTotal(g, 5, g.idt()); g.giveStatus(g.idt(), 'tough', '영웅적 개입'); });
  S['32189'] = { respond: [{ window: 'heroDefends', label: '결연한 방어: 자원 2 → 피해 대신 주 음모 위협 제거', cost: { n: 2, req: '' }, can: (g, u) => g.c(u).zone === 'upgrade' && !!g.e.main, async resolve(g, u, hd) { hd.toThreat = true; spend(g, u); } }] }; // the attack's damage (after defense) removes threat from the main scheme instead
  S['32190'] = roleRes(['DEFENSE', 'THWART'], async g => { await g.draw(1); });
  S['32194'] = roleAct('hero', '가르침: 자원 3 → 위협 합계 5 제거, 동료 모두 준비', 3, async g => { await removeTotal(g, 5, g.idt()); g.p.allies.forEach(a => { g.c(a).ex = false; }); });
  S['32195'] = roleRes(['TACTIC', 'THWART'], async g => { const e = await g.chooseTarget('enemy', '기절시킬 적', null, false); if (e) g.giveStatus(e, 'stun', '꿋꿋함'); });
  MC.registerScripts(S);
})();
