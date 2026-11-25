/* The Hood (24001-24070): the scenario, its nine modular sets, Standard II and Expert II.
   Ported from cards/pack/hood of the community build. */
(function () {
  'use strict';
  const S = {};
  const idOf = (g, u) => g.c(u).id;
  const HOOD = new Set(['24007', '24008', '24009', '24010', '24011', '24012', '24013']);
  const has = (g, u, t) => (g.d(u).tr || []).includes(t);
  const myChars = g => g.friendlyChars();
  const pick = async (g, cands, title) => !cands.length ? null : cands.length === 1 ? cands[0] : await g.ask({ type: 'target', title, cands, cancelable: false });
  const fewestHp = g => { const c = myChars(g); const m = Math.min(...c.map(u => g.hpLeft(u))); return c.filter(u => g.hpLeft(u) === m); };
  const inPlayId = (g, id) => g.enemies().concat(g.e.sides, g.e.env).find(u => idOf(g, u) === id) || null;
  const dealFd = (g, n) => { for (let i = 0; i < (n || 1); i++) { const u = g.takeEncounter(); if (u) { g.put(u, 'facedown'); g.log('조우 카드 1장을 뒷면으로 받았습니다', 'warn'); } } };

  // ---------------- Foul Play (the Hood's special ability) ----------------
  // returns how many cards were dealt facedown
  async function foulPlay(g) {
    const v = g.e.villain, vid = v ? idOf(g, v) : '24001';
    const n = vid === '24001' ? 1 : 2, onlyFirst = vid !== '24003';
    const disc = [];
    for (let i = 0; i < n; i++) { const u = g.takeEncounter(); if (!u) break; g.put(u, 'ediscard'); disc.push(u); }
    let dealt = 0;
    for (const u of disc) {
      if (HOOD.has(idOf(g, u))) continue;
      g.put(u, 'facedown'); dealt++;
      if (onlyFirst) break;
    }
    g.log(`비열한 수: 조우 덱 ${disc.length}장 버림 (${disc.map(u => g.nm(u)).join(', ') || '없음'}) → 뒷면 조우 카드 ${dealt}장`, 'warn');
    return dealt;
  }
  MC.hoodFoulPlay = foulPlay;

  // ---------------- scenario ----------------
  S['24002'] = { whenRevealed(g) { g.shuffleAsideModular(); } };
  S['24003'] = { whenRevealed(g) { g.shuffleAsideModular(); } };
  S['24004a'] = { setup(g) { g.shuffleAsideModular(); } }; // Making Connections
  S['24004b'] = { async whenRevealed(g) { await g.forEachPlayer(() => foulPlay(g)); } };
  S['24005a'] = { whenRevealed(g) { g.shuffleAsideModular(); g.addAccel(); g.log('주 음모에 가속 토큰 +1', 'warn'); } }; // Promised Prosperity
  S['24005b'] = { async whenRevealed(g, u) { await g.forEachPlayer(async () => { const n = await foulPlay(g); if (!n) await g.placeThreat(u, 2, {}); }); } };
  S['24006a'] = { async whenRevealed(g) { g.shuffleAsideModular(); g.addAccel(); g.log('주 음모에 가속 토큰 +1', 'warn'); await g.forEachPlayer(() => foulPlay(g)); } }; // Crime State
  S['24006b'] = { loseOnComplete: true, on: { async mainStep1(g, u) { if (u === g.e.main) { g.log('범죄 국가: 비열한 수', 'warn'); await g.forEachPlayer(() => foulPlay(g)); } } } };
  S['24007'] = { // Established Dominance
    attachTo: g => g.idt(),
    on: { async enemyActivated(g, u, ctx) { if (ctx.enemy === g.e.villain && g.c(u).on === g.idt()) { g.log('확립된 지배력: 비열한 수', 'warn'); await foulPlay(g); } } },
    actions: [{ timing: 'alter', label: '정체성 소진·주 음모에 위협 2 → 이 카드 버림', can: (g, u) => g.c(u).zone === 'attach' && g.c(u).on === g.idt() && !g.c(g.idt()).ex, async use(g, u) { g.c(g.idt()).ex = true; await g.placeThreat(g.e.main, 2, {}); g.discard(u, '확립된 지배력 버림'); } }]
  };
  S['24008'] = { // The Hood's Mantle
    mod: { retaliate: (g, s, t) => t === g.c(s).on ? 1 : 0 }, grantSteady: true,
    actions: [{ timing: 'hero', label: '[에너지][정신][물리] → 이 카드 버림', cost: { n: 3, req: 'YBR' }, async use(g, u) { g.discard(u, '더 후드의 망토 버림'); } }]
  };
  S['24009'] = { // The Hood's Pistol
    actions: [{ timing: 'hero', label: '[정신][물리] → 이 카드 버림', cost: { n: 2, req: 'BR' }, async use(g, u) { g.discard(u, '더 후드의 권총 버림'); } }],
    boostEffect(g, u, ctx) { (ctx.post || ctx.after).push(async gg => { if (['ediscard', 'boost'].includes(gg.c(u).zone)) { gg.log('★ 더 후드의 권총: 공개합니다', 'warn'); await gg.reveal(u); } }); }
  };
  S['24010'] = { async whenRevealed(g) { await foulPlay(g); }, async whenDefeated(g) { await foulPlay(g); } }; // Madame Masque
  S['24011'] = { on: { async villainPhaseBegins(g) { g.log('고삐 풀린 야망: 비열한 수', 'warn'); await g.forEachPlayer(() => foulPlay(g)); } } }; // Unbridled Ambition
  S['24012'] = { // Field Recruitment
    async whenRevealed(g, u) { g.shuffleAsideModular(); await foulPlay(g); g.removeFromGame(u); },
    boostEffect(g, u, ctx) { (ctx.post || ctx.after).push(async gg => { gg.log('★ 현장 모집: 비열한 수', 'warn'); await foulPlay(gg); }); }
  };
  S['24013'] = { async whenRevealed(g) { // Upper Hand
    const v = g.e.villain; if (!v) return;
    if (g.isHero()) await g.enemyAttack(v, {}); else await g.enemyScheme(v, {});
    await foulPlay(g);
  } };

  // ---------------- Beasty Boys ----------------
  S['24014'] = { on: { wouldTakeDamage(g, u, ctx) { if (g.allFriendlyChars().includes(ctx.target) && (g.c(ctx.target).stun || g.c(ctx.target).conf) && !ctx.beastMode) { ctx.beastMode = true; ctx.amount++; } } } }; // Beast Mode
  S['24015'] = { // Griffin
    on: { afterEnemyAttack(g, u, ctx) { if (ctx.enemy !== u) return; for (const t of ctx.damaged || []) if (g.c(t).zone) g.giveStatus(t, 'stun', '★ 그리핀'); } },
    whenDefeated(g, u) { if (g.allFriendlyChars().some(x => g.c(x).stun)) { g.put(u, 'edeck'); g.shuffle(g.e.deck); g.log('그리핀: 기절한 아군이 있어 조우 덱에 섞입니다', 'warn'); } }
  };
  S['24016'] = { // Mandrill
    mod: { retaliate: (g, s, t) => t === s ? g.allFriendlyChars().concat(g.enemies()).filter(x => g.c(x).conf).length : 0 },
    whenRevealed(g) { for (const x of myChars(g)) g.giveStatus(x, 'conf', '맨드릴'); }
  };
  const doubleTrouble = async g => {
    const a = await pick(g, myChars(g), '이중고: 기절시킬 내 캐릭터'); if (a) g.giveStatus(a, 'stun', '이중고');
    const b = await pick(g, myChars(g), '이중고: 혼란시킬 내 캐릭터'); if (b) g.giveStatus(b, 'conf', '이중고');
  };
  S['24017'] = { whenRevealed: doubleTrouble, async boostEffect(g) { await doubleTrouble(g); } }; // Double Trouble

  // ---------------- Brothers Grimm ----------------
  S['24018'] = { // Brothers Grimm
    async onActivationStart(g, u) {
      const x = g.discardEncounterUntil(d => d.type === 'attachment');
      if (x) { g.log(`★ 그림 형제: ${g.nm(x)} 공개`, 'warn'); await g.reveal(x); }
    },
    boostEffect(g, u, ctx) { (ctx.post || ctx.after).push(async gg => { if (gg.c(u).zone && gg.c(u).zone !== 'minion') { gg.log('★ 그림 형제가 교전합니다', 'warn'); await gg.withPlayer(gg.s.first, () => gg.enterMinion(u, {}, true)); } }); }
  };
  const grimmItem = (label, fn) => ({
    attachTo: g => g.e.minions.find(m => has(g, m, 'MYSTIC')) || g.e.villain,
    on: { async hostActivated(g, a) { g.discard(a, `★ ${g.nm(a)} 버림`); await fn(g); dealFd(g, 1); } }
  });
  S['24019'] = grimmItem('', async g => { if (g.p.hand.length) { const t = g.p.hand[Math.floor(g.rand() * g.p.hand.length)]; g.put(t, 'discard'); g.log(`무작위로 ${g.nm(t)} 버림`); } }); // Blackbird Pellets
  S['24020'] = grimmItem('', async g => { await g.indirectDamage(3, null); }); // Corrosive Egg Bomb
  S['24021'] = grimmItem('', async g => { g.giveStatus(g.idt(), 'stun', '마비성 별가루'); }); // Paralytic Stardust
  S['24022'] = grimmItem('', async g => { // Unbreakable Thread
    const c = g.p.allies.concat(g.p.supports, g.p.upgrades, ...g.friendlyChars().map(f => g.c(f).att.filter(a => !g.d(a).enc))).filter((x, i, a) => a.indexOf(x) === i && !g.d(x).permanent);
    const t = await pick(g, c, '끊어지지 않는 실: 버릴 동료·지원·업그레이드'); if (t) g.discard(t, `${g.nm(t)} 버림`);
  });

  // ---------------- Crossfire's Crew ----------------
  const outForBlood = async g => {
    for (let guard = 0; guard < 10; guard++) {
      const t = await pick(g, fewestHp(g), '피를 원하다: 피해 1을 받을 캐릭터 (남은 체력이 가장 적음)'); if (!t) return;
      await g.dealDamage(t, 1, {}); if (g.c(t).zone && (t === g.idt() || g.c(t).zone === 'ally')) return;
    }
  };
  S['24023'] = { whenRevealed: outForBlood, async boostEffect(g) { await outForBlood(g); } }; // Out for Blood
  S['24024'] = { on: { wouldTakeDamage(g, u, ctx) { if (ctx.src === u && ctx.attack && ctx.amount - ctx.prevent > 0 && !ctx.controller) { ctx.controller = true; const n = g.stat(ctx.target, 'atk') || 0; if (n) { ctx.amount += n; g.log(`★ 컨트롤러: 피해 +${n}`, 'warn'); } } } } }; // Controller
  S['24025'] = { // Corruptor
    async whenRevealed(g) { const a = g.p.allies.filter(x => !g.c(x).ex); a.forEach(x => { g.c(x).ex = true; }); if (a.length) { g.log(`커럽터: 동료 ${a.length}명 소진`, 'warn'); await g.placeThreat(g.e.main, a.length, {}); } },
    async boostEffect(g) { const t = await pick(g, myChars(g).filter(x => !g.c(x).ex), '★ 커럽터: 소진할 내 캐릭터'); if (t) g.c(t).ex = true; }
  };
  S['24026'] = { attackTargetFn: g => fewestHp(g).find(u => u !== g.idt()) && !fewestHp(g).includes(g.idt()) ? fewestHp(g)[0] : null, attackProps: () => ({ overkill: true, ranged: true }) }; // Crossfire
  S['24027'] = { readyTax: true, // Mister Fear
    boostEffect(g) { const seen = []; while (g.p.deck.length) { const x = g.p.deck[0]; g.put(x, 'discard'); seen.push(x); if (g.d(x).type === 'ally') break; } g.log(`★ 미스터 피어: 덱 위에서 ${seen.length}장 버림`); } };
  S['24028'] = { async whenRevealed(g) { // Caught in the Crossfire
    const x = g.discardEncounterUntil(d => d.type === 'minion' && (d.tr || []).includes("CROSSFIRE'S CREW"));
    if (x) await g.reveal(x);
    const n = g.e.minions.filter(m => has(g, m, "CROSSFIRE'S CREW")).length; if (n) await g.indirectDamage(n, null);
  } };

  // ---------------- Expert II ----------------
  S['24029'] = { async whenRevealed(g) { await g.forEachPlayer(async () => { dealFd(g, 1); }); g.giveFacedownBoost(1); }, boostEffect(g) { dealFd(g, 1); } }; // Cruel Intentions
  S['24030'] = { async whenRevealed(g) { // Ruination
    const x = g.discardEncounterUntil(d => d.type === 'side'); if (x) await g.reveal(x);
    for (const s of g.schemes().slice()) await g.placeThreat(s, 2, {});
  } };
  S['24031'] = { async whenRevealed(g) { // Seek and Destroy
    const pool = g.e.deck.concat(g.e.discard, g.e.setaside || [], g.e.aside || []);
    const nm = pool.find(u => g.d(u).type === 'minion' && (MC.heroes[Object.keys(MC.heroes).find(k => MC.heroes[k].hero === g.p.heroId)] || {}).nemesis && MC.heroes[Object.keys(MC.heroes).find(k => MC.heroes[k].hero === g.p.heroId)].nemesis.includes(idOf(g, u)));
    g.shuffle(g.e.deck);
    if (nm) { g.log(`수색 섬멸: 네메시스 ${g.nm(nm)}가 교전합니다`, 'warn'); await g.enterMinion(nm, {}, true); } else g.log('수색 섬멸: 네메시스 하수인이 없습니다');
  } };
  S['24032'] = { // Slug It Out
    async whenRevealed(g) { g.c(g.idt()).ex = true; await g.dealDamage(g.idt(), 2, {}); },
    async boostEffect(g, u, ctx) { for (const x of myChars(g).slice()) await g.dealDamage(x, 1, {}); ctx.extraBoost = (ctx.extraBoost || 0) + 1; }
  };

  // ---------------- Mister Hyde ----------------
  S['24033'] = { // Self-Experimentation
    async whenRevealed(g) { const h = g.searchEncounter(d => d.id === '24035'); g.shuffle(g.e.deck); if (h) await g.reveal(h); },
    async redirectDamage(g, s, target, amount) {
      if (!g.enemies().includes(target) || !has(g, target, 'BRUTE') || g.c(s).zone !== 'side') return false;
      const r = await g.removeThreat(s, amount, {}); g.log(`자가 실험: ${g.nm(target)}이(가) 받을 피해 ${amount} 대신 위협 ${r} 제거`, 'warn'); await g.afterThreatRemoved(s); return true;
    }
  };
  S['24034'] = { // Calvin Zabo
    async whenRevealed(g, u) { const h = g.e.minions.find(m => idOf(g, m) === '24035'); if (!h) return; g.discard(u, '캘빈 자보 버림'); await g.enemyAttack(h, { atkBonus: 2, overkill: true }); },
    async whenDefeated(g, u) { const h = g.searchEncounter(d => d.id === '24035'); if (h) { g.shuffle(g.e.deck); g.log('캘빈 자보: 미스터 하이드가 교전합니다', 'warn'); await g.withPlayer(g.c(u).eng ?? g.s.ctx, () => g.enterMinion(h, {}, true)); } }
  };
  S['24035'] = { async whenRevealed(g, u) { // Mister Hyde
    const z = g.e.minions.find(m => idOf(g, m) === '24034'); if (!z) return;
    const eng = g.c(z).eng ?? g.s.ctx; g.discard(z, '캘빈 자보 버림'); g.c(u).eng = eng; g.giveStatus(u, 'tough', '미스터 하이드');
    for (const x of g.allFriendlyChars().filter(c => g.d(c).type === 'ally' || g.s.ps[g.identityPlayer(c)].form === 'hero')) await g.dealDamage(x, 1, { src: u });
  } };
  S['24036'] = { async whenRevealed(g, u, ctx) { // Hyde Formula
    const z = g.e.minions.find(m => idOf(g, m) === '24034'), h = g.e.minions.find(m => idOf(g, m) === '24035');
    if (z) { await g.enemyScheme(z, { schBonus: 3 }); if (g.c(z).zone) await g.dealDamage(z, 4, {}); }
    if (h) { g.giveStatus(h, 'tough', '하이드 약물'); await g.enemyAttack(h, {}); }
    if (!z && !h) ctx.surge++;
  } };

  // ---------------- Ransacked Armory ----------------
  const mostHp = g => { const m = g.e.minions; if (!m.length) return null; const top = Math.max(...m.map(x => g.hpLeft(x))); return m.filter(x => g.hpLeft(x) === top); };
  const armory = (fetch, extra) => Object.assign({ revealFirst: true, async whenRevealed(g, u, ctx) {
    let c = mostHp(g), host = c ? await pick(g, c, `${g.nm(u)}: 부착할 하수인 (남은 체력이 가장 많음)`) : null;
    if (!host && fetch) { const m = g.searchEncounter(d => d.type === 'minion'); g.shuffle(g.e.deck); if (m) { await g.enterMinion(m, {}, true); if (g.c(m).zone === 'minion') host = m; } }
    if (host) { g.attachEnc(u, host); g.log(`${g.nm(u)} → ${g.nm(host)}`, 'warn'); }
    else { g.discard(u); if (!fetch) { g.log(`${g.nm(u)}: 부착할 하수인이 없어 쇄도`); ctx.surge++; } }
  } }, extra);
  S['24037'] = armory(true, { attackProps: () => ({ indirect: true }) }); // Flamethrower
  S['24038'] = armory(true, { mod: { hp: (g, s, t) => t === g.c(s).on ? 4 : 0, retaliate: (g, s, t) => t === g.c(s).on ? 2 : 0 } }); // Holoshield Generator
  S['24039'] = armory(false, { on: { wouldTakeDamage(g, a, ctx) { // Jetpack
    if (ctx.target !== g.c(a).on || !ctx.attack || ctx.jetpack) return; ctx.jetpack = true;
    const x = g.takeEncounter(); if (!x) return; g.put(x, 'ediscard'); const n = g.boostOf(x);
    if (n) { ctx.prevent += n; g.log(`제트팩: ${g.nm(x)} 버림 → 피해 ${n} 감소`); } else g.log(`제트팩: ${g.nm(x)} 버림 (강화 아이콘 없음)`);
  } } });
  S['24040'] = armory(false, { mod: { hp: (g, s, t) => t === g.c(s).on ? 3 : 0 }, attackProps: () => ({ overkill: true }) }); // Tech Gauntlets

  // ---------------- Sinister Syndicate ----------------
  S['24042'] = { async whenRevealed(g, u, ctx) { // Crime Pays
    const m = g.e.deck.find(x => g.d(x).type === 'minion' && has(g, x, 'CRIMINAL')); g.shuffle(g.e.deck);
    if (m) await g.enterMinion(m, {}, true); else { g.log('범죄는 돈이 된다: [범죄자] 하수인이 없어 쇄도'); ctx.surge++; }
  } };
  const lowestUpgrade = g => { const ups = g.controlled().filter(x => g.d(x).type === 'upgrade' && !g.d(x).permanent); if (!ups.length) return []; const lo = Math.min(...ups.map(x => g.d(x).cost || 0)); return ups.filter(x => (g.d(x).cost || 0) === lo); };
  S['24043'] = { // Beetle
    on: { async afterEnemyAttack(g, u, ctx) { if (ctx.enemy !== u || !(ctx.damaged || []).includes(g.idt())) return; const t = await pick(g, lowestUpgrade(g), '★ 비틀: 버릴 업그레이드 (비용이 가장 낮음)'); if (t) g.discard(t, `${g.nm(t)} 버림`); } },
    async boostEffect(g) { const ups = g.controlled().filter(x => g.d(x).type === 'upgrade' && !g.d(x).permanent); const t = await pick(g, ups, '★ 비틀: 버릴 업그레이드'); if (t) g.discard(t, `${g.nm(t)} 버림`); }
  };
  S['24044'] = { // Boomerang
    on: { async afterEnemyAttack(g, u, ctx) { if (ctx.enemy !== u) return; for (const a of g.p.allies.slice()) await g.dealDamage(a, 1, { src: u }); } },
    async boostEffect(g) { const t = await pick(g, g.p.allies.slice(), '★ 부메랑: 피해 2를 받을 동료'); if (t) await g.dealDamage(t, 2, {}); }
  };
  S['24045'] = { // Shocker
    on: { afterAttack(g, u, ctx) { if (ctx.target === u && g.c(ctx.attacker) && g.c(ctx.attacker).zone) g.giveStatus(ctx.attacker, 'stun', '쇼커'); } },
    boostEffect(g) { const c = myChars(g); const top = Math.max(...c.map(x => g.stat(x, 'atk') || 0)); const t = c.find(x => (g.stat(x, 'atk') || 0) === top); if (t) g.giveStatus(t, 'stun', '★ 쇼커'); }
  };
  S['24046'] = { // Speed Demon
    async beforeAttacked(g, u, attacker) { if (!g.c(u).zone || g.c(u).stun) { if (g.c(u).stun) { g.c(u).stun = false; g.log('스피드 데몬: 기절 상태라 반격 대신 기절 해제'); } return; } g.log('스피드 데몬이 먼저 공격합니다', 'warn'); await g.enemyAttack(u, { forceTarget: attacker, noBoost: true }); },
    async boostEffect(g) { const s = g.p.supports.filter(x => !g.d(x).permanent); if (!s.length) return; const lo = Math.min(...s.map(x => g.d(x).cost || 0)); const t = await pick(g, s.filter(x => (g.d(x).cost || 0) === lo), '★ 스피드 데몬: 버릴 지원 카드'); if (t) g.discard(t, `${g.nm(t)} 버림`); }
  };
  S['24047'] = { // White Rabbit
    onAttackStart(g) { if (g.p.hand.length) { const t = g.p.hand[Math.floor(g.rand() * g.p.hand.length)]; g.put(t, 'discard'); g.log(`★ 화이트 래빗: 무작위로 ${g.nm(t)} 버림`, 'warn'); } },
    async boostEffect(g) { const c = g.p.hand.filter(x => g.d(x).cls === 'Hero'); const t = await pick(g, c, '★ 화이트 래빗: 버릴 정체성 전용 카드'); if (t) { g.put(t, 'discard'); g.log(`${g.nm(t)} 버림`); } }
  };
  S['24048'] = { async whenRevealed(g, u, ctx) { // Sinister Onslaught
    const c = g.enemies().filter(x => has(g, x, 'CRIMINAL')); let n = 0;
    for (const x of c) { if (!g.c(x).zone) continue; n++; if (g.isHero()) await g.enemyAttack(x, {}); else await g.enemyScheme(x, {}); }
    if (!n) ctx.surge++;
  } };

  // ---------------- Standard II ----------------
  S['24049a'] = { steadyFor: (g, s, t) => t === g.e.villain }; // Formidable Foe (standard)
  S['24049b'] = { steadyFor: (g, s, t) => g.enemies().includes(t) }; // Formidable Foe (expert)
  S['24050'] = { async whenRevealed(g) { if (g.e.villain) await g.enemyScheme(g.e.villain, { schBonus: 1 }); }, boostEffect(g, u, ctx) { ctx.extraBoost = (ctx.extraBoost || 0) + 1; } }; // Dark Dealings
  S['24051'] = { async whenRevealed(g, u, ctx) { // Mob Mentality
    if (!g.isHero()) {
      let m = null; for (let i = 0; i < 7; i++) { const x = g.takeEncounter(); if (!x) break; g.put(x, 'ediscard'); if (!m && g.d(x).type === 'minion') m = x; }
      if (m) await g.enterMinion(m, {}, true); return;
    }
    if (g.e.villain) await g.enemyAttack(g.e.villain, {});
    for (const m of g.engagedMinions().slice()) if (g.c(m).zone === 'minion') await g.enemyAttack(m, {});
    ctx.surge++;
  } };
  S['24052'] = { async whenRevealed(g, u, ctx) { // Overwhelming Force
    const c = g.p.upgrades.concat(g.p.supports, ...g.friendlyChars().map(f => g.c(f).att.filter(a => !g.d(a).enc && g.d(a).type === 'upgrade'))).filter(x => !g.d(x).permanent);
    if (!c.length) { ctx.surge++; return; }
    const hi = Math.max(...c.map(x => g.d(x).cost || 0)); const t = await pick(g, c.filter(x => (g.d(x).cost || 0) === hi), '압도적인 힘: 버릴 카드 (비용이 가장 높음)'); g.discard(t, `${g.nm(t)} 버림`);
  }, boostEffect(g, u, ctx) { ctx.extraBoost = (ctx.extraBoost || 0) + 1; } };
  S['24054'] = { async whenRevealed(g) { if (g.isHero() && g.e.villain) await g.enemyAttack(g.e.villain, { overkill: true }); }, boostEffect(g, u, ctx) { if ('undefended' in ctx && ctx.enemy === g.e.villain) ctx.overkill = true; } }; // Total Annihilation

  // ---------------- State of Emergency ----------------
  S['24055'] = { async whenRevealed(g) { if (!g.p.hand.length) return; const hi = Math.max(...g.p.hand.map(x => g.d(x).cost || 0)); const t = await pick(g, g.p.hand.filter(x => (g.d(x).cost || 0) === hi), '대담한 강탈: 버릴 카드 (비용이 가장 높음)'); g.put(t, 'discard'); g.log(`${g.nm(t)} 버림`); } }; // Feisty Heist
  S['24056'] = { async whenRevealed(g) { await g.indirectDamage(3, null); } }; // Disaster at the Docks
  S['24057'] = { async whenRevealed(g) { // Offshore Inferno
    const c = g.controlled().filter(x => x !== g.idt() && !g.d(x).permanent && g.d(x).type !== 'obligation'); if (!c.length) return;
    const lo = Math.min(...c.map(x => g.d(x).cost || 0)); const t = await pick(g, c.filter(x => (g.d(x).cost || 0) === lo), '해상의 불지옥: 버릴 카드 (비용이 가장 낮음)'); g.discard(t, `${g.nm(t)} 버림`);
  } };
  S['24058'] = { async whenRevealed(g) { const m = g.discardEncounterUntil(d => d.type === 'minion'); if (m) await g.enterMinion(m, {}, true); } }; // Hot Pursuit
  const citywide = async g => {
    let n = 0;
    for (const s of g.e.sides.slice()) { const w = g.sc(s).whenRevealed; if (w && g.c(s).zone === 'side') { n++; g.log(`도시 전역의 위기: ${g.nm(s)}의 공개 시 능력`); await w(g, s, { surge: 0 }); } }
    if (!n) for (const s of g.schemes().slice()) await g.placeThreat(s, 2, {});
  };
  S['24059'] = { whenRevealed: citywide, async boostEffect(g) { await citywide(g); } }; // Citywide Crisis

  // ---------------- Streets of Mayhem (settings) ----------------
  const setting = extra => Object.assign({ whenRevealed(g, u) { for (const x of g.e.env.slice()) if (x !== u && has(g, x, 'SETTING')) g.discard(x, `${g.nm(x)} 버림 (다른 장소)`); } }, extra);
  const isChar = (g, t) => g.allFriendlyChars().includes(t) || g.enemies().includes(t);
  S['24060'] = setting({ mod: { atk: (g, s, t) => isChar(g, t) ? 1 : 0 } }); // Back-Alley Enclave
  S['24061'] = setting({ mod: { thw: (g, s, t) => g.allFriendlyChars().includes(t) ? 1 : 0 }, accelBonus: g => g.enemies().length }); // Secret Lair
  S['24062'] = setting({ mod: { retaliate: (g, s, t) => isChar(g, t) ? 1 : 0 } }); // Sewer Tunnels
  S['24063'] = setting({ steadyFor: (g, s, t) => isChar(g, t) }); // Warehouse District

  // ---------------- Wrecking Crew (modular) ----------------
  S['24064'] = { mod: { retaliate: (g, s, t) => (t === g.e.villain || (g.e.minions.includes(t) && has(g, t, 'ELITE'))) ? 1 : 0 } }; // Top Talent
  S['24065'] = { attackBonus: (g, x, ctx) => ctx.undefended ? 2 : 0 }; // Wrecker
  S['24066'] = { attackProps: () => ({ overkill: true }) }; // Bulldozer
  S['24068'] = { on: { async afterEnemyAttack(g, u, ctx) { if (ctx.enemy !== u) return; for (const x of myChars(g).slice()) await g.dealDamage(x, 1, { src: u }); } } }; // Thunderball
  S['24069'] = { // Combined Effort
    async whenRevealed(g, u, ctx) { const c = g.e.minions.filter(m => has(g, m, 'ELITE')); if (!c.length) { ctx.surge++; return; } for (const m of c) if (g.c(m).zone === 'minion') { const pi = g.c(m).eng ?? g.s.ctx; await g.withPlayer(pi, () => g.activate(m, {})); } },
    boostEffect(g) { return g.e.minions.filter(m => has(g, m, 'ELITE')).length; }
  };
  S['24070'] = { async whenRevealed(g) { // Magic Muscle
    const c = g.enemies().filter(x => has(g, x, 'BRUTE') && !g.c(x).tough); c.forEach(x => g.giveStatus(x, 'tough', '마법 근육'));
    if (c.length) return; const m = g.discardEncounterUntil(d => d.type === 'minion' && (d.tr || []).includes('BRUTE')); if (m) await g.reveal(m);
  } };

  MC.registerScripts(S);
})();
