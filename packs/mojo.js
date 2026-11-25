/* MojoMania (39001-39071): MaGog, Spiral and Mojo scenarios, the six genre modular sets and Longshot.
   Ported from cards/pack/mojo of the community build. */
(function () {
  'use strict';
  const S = {};
  const idOf = (g, u) => g.c(u).id;
  const tr = (g, u, t) => (g.d(u).tr || []).includes(t) || g.hasTrait(u, t);
  const pick = async (g, cands, title) => !cands.length ? null : cands.length === 1 ? cands[0] : await g.ask({ type: 'target', title, cands, cancelable: false });
  const yes = async (g, title) => (await g.ask({ type: 'choice', title, options: [{ id: 'y', label: '예' }, { id: 'n', label: '아니요' }] })) === 'y';
  const P = (g, n) => n * g.players;
  const aside = (g, id) => (g.e.aside || []).concat(g.e.setaside || []).find(u => idOf(g, u) === id) || null;
  const searchEnc = (g, pred) => g.e.deck.concat(g.e.discard).find(u => pred(g.d(u), u)) || null;
  const facedown = (g, why) => { const x = g.takeEncounter(); if (x) { g.put(x, 'facedown'); g.log(`${why}: 뒷면 조우 카드 1장`, 'warn'); } };
  const mine = g => g.friendlyChars();
  const addThreatTo = (g, u, n, why) => { if (!g.c(u).zone || n <= 0) return; g.c(u).threat += n; g.log(`${why}: ${g.nm(u)}에 위협 ${n}`, 'warn'); };
  const boostReveal = (g, u, ctx) => { (ctx.revealAfter = ctx.revealAfter || []).push(u); };
  const millN = (g, n) => { const out = []; for (let i = 0; i < n; i++) { const x = g.takeEncounter(); if (!x) break; g.put(x, 'ediscard'); out.push(x); } return out; };

  // ======================= MaGog =======================
  const crowd = (g, base) => (g.e.env || []).find(u => [base + 'a', base + 'b'].includes(idOf(g, u))) || null;
  const ratingsOf = (g, base) => { const c = crowd(g, base); return c ? (g.c(c).cnt.ratings || 0) : 0; };
  MC.magog = { crowd: (g, b) => crowd(g, b), ratings: (g, b, n, why) => ratings(g, b, n, why) }; // Fickle Crowds
  async function ratings(g, base, n, why) { // 39003 The Champion, 39004 The Challengers
    const c = crowd(g, base); if (!c || n <= 0) return; g.c(c).cnt.ratings = (g.c(c).cnt.ratings || 0) + n;
    g.log(`${why ? why + ': ' : ''}${base === '39003' ? '챔피언' : '도전자들'}에 시청률 카운터 +${n} (현재 ${g.c(c).cnt.ratings})`, base === '39003' ? 'warn' : 'good');
    const r = g.c(c).cnt.ratings;
    if (idOf(g, c) === base + 'a' && r >= P(g, 5)) {
      g.c(c).id = base + 'b'; g.log(`${base === '39003' ? '챔피언' : '도전자들'}: 관중이 환호합니다`, 'warn');
      if (base === '39003') await g.forEachPlayer(() => g.draw(1));
      else { const x = g.e.minions.find(m => idOf(g, m) === '39007'); if (x) g.giveStatus(x, 'tough', '태그 팀'); else { const y = searchEnc(g, d => d.id === '39007'); if (y) { g.shuffle(g.e.deck); await g.enterMinion(y, {}); } } }
    }
    if (r >= P(g, 10)) { if (base === '39003') g.lose('마곡이 다시 승리했습니다 (챔피언 시청률 10)'); else g.win('관중을 사로잡았습니다 (도전자들 시청률 10)'); }
  }
  const magog = (champ, chall) => ({
    on: { async afterEnemyAttack(g, u, ctx) { if (ctx.enemy === u && (ctx.damaged || []).length) await ratings(g, '39003', champ, '★ 마곡'); } },
    async wouldBeDefeated(g, u, wctx) {
      wctx.saved = true; g.c(u).dmg = 0; g.log('마곡: 쓰러지는 대신 체력이 초기화됩니다', 'warn');
      await ratings(g, '39004', P(g, chall), '마곡 체력 초기화'); await g.forEachPlayer(async () => { facedown(g, '마곡'); });
      for (const a of g.c(u).att.slice()) if (['39005', '39006'].includes(idOf(g, a))) { g.discard(a, `${g.nm(a)}: 체력 초기화 후 버림`); await ratings(g, '39004', P(g, 1), g.nm(a)); }
    }
  });
  S['39001a'] = magog(1, 3); S['39001b'] = magog(2, 2);
  S['39002a'] = { setup(g) { for (const id of ['39003a', '39004a']) { const x = aside(g, id); if (x) { g.put(x, 'env'); g.c(x).cnt.ratings = 0; } } g.log('챔피언과 도전자들이 등장합니다 (야유하는 관중)'); } };
  S['39002b'] = { async whenCompleted(g, u) { await ratings(g, '39003', P(g, 2), '모조지엄 난투극'); g.c(u).threat = 0; return 'handled'; } };
  S['39005'] = { attachTo: g => g.e.villain, mod: { retaliate: (g, s, t) => t === g.c(s).on ? 1 : 0 }, grantStalwart: true, boostEffect: boostReveal }; // Jolt of Adrenaline
  S['39006'] = { attachTo: g => g.e.villain, boostEffect: boostReveal }; // Surge of Aggression
  S['39007'] = { on: { async afterEnemyAttack(g, u, ctx) { if (ctx.enemy === u && (ctx.damaged || []).length) await ratings(g, '39003', 1, '★ 깜짝 도전자'); } }, // Surprise Contender
    async whenDefeated(g) { await ratings(g, '39004', P(g, 2), '깜짝 도전자 격파'); } };
  S['39008'] = { whenRevealed(g, u) { const c = crowd(g, '39003'); if (c && idOf(g, c) === '39003b') g.c(u).threat += P(g, 1); }, async whenDefeated(g) { await ratings(g, '39004', P(g, 1), '관중 열광시키기'); } }; // Pump Up the Crowd
  S['39009'] = { async whenRevealed(g) { // Break a Leg
    g.giveStatus(g.idt(), 'stun', '다리나 부러져라!'); let n = ratingsOf(g, '39004') > ratingsOf(g, '39003') ? 4 : 2;
    const opts = []; for (let i = 0; i <= n; i++) opts.push({ id: String(i), label: i ? `챔피언에 시청률 ${i} → 피해 ${n - i}` : `피해 ${n} 그대로 받기` });
    const k = +(await g.ask({ type: 'choice', title: '다리나 부러져라!: 피해를 줄일까요?', options: opts })) || 0;
    if (k) await ratings(g, '39003', k, '다리나 부러져라!'); if (n - k > 0) await g.dealDamage(g.idt(), n - k, {});
  } };
  S['39010'] = { async whenRevealed(g) { // Defend the Title
    if (!g.isHero()) { await ratings(g, '39003', 2, '타이틀 방어'); return; }
    const v = g.e.villain; if (!v) return; g.e.lastHeroDefense = null; await g.enemyAttack(v, {});
    const d = g.e.lastHeroDefense; if (d && d.enemy === v && d.noDamage) await ratings(g, '39004', 2, '타이틀 방어');
  } };
  S['39011'] = { async whenRevealed(g) { g.giveStatus(g.idt(), 'conf', '무대 공포증'); await g.placeThreat(g.e.main, ratingsOf(g, '39004') > ratingsOf(g, '39003') ? 4 : 2, {}); }, boostEffect(g) { g.giveStatus(g.idt(), 'conf', '★ 무대 공포증'); } }; // Stage Fright

  // ======================= Spiral =======================
  const showDeck = g => (g.e.showDeck = (g.e.showDeck || []).filter(u => g.c(u).zone === 'aside'));
  const isShow = (g, u) => g.d(u).type === 'environment' && tr(g, u, 'SHOW');
  const cornered = g => !!g.e.villain && tr(g, g.e.villain, 'CORNERED');
  async function enterShow(g, u, fromShow) { g.put(u, 'env'); g.log(`쇼 「${g.nm(u)}」 시작`, 'warn'); await g.runRevealed(u, { surge: 0, fromShow: !!fromShow }); }
  async function revealShowTop(g) {
    const d = showDeck(g); const x = d.shift(); if (!x) { g.log('쇼 덱이 비었습니다'); return; }
    if (isShow(g, x)) await enterShow(g, x, true); else { g.log(`쇼 덱: ${g.nm(x)} 공개`, 'warn'); const f = g.sc(x).whenRevealed; if (f) await f(g, x, { surge: 0 }); }
  }
  for (const id of ['39012a', '39013a', '39014a']) S[id] = { cannotTakeDamage: () => true, noStun: true, blocksRemoval: (g, x, sc) => sc === g.e.main, // Spiral (Escaped)
    async insteadOfAttack(g, u) { g.log('★ 스파이럴: 공격 대신 음모를 꾸밉니다'); await g.enemyScheme(u, {}); } };
  const corneredSide = need => ({ on: { async enemyActivated(g, u, ctx) { // Spiral (Cornered)
    if (ctx.enemy !== u || !g.c(u).zone) return; const c = g.c(u); c.cnt.teleport = (c.cnt.teleport || 0) + 1; g.log(`★ 스파이럴: 순간이동 카운터 ${c.cnt.teleport}`);
    if (c.cnt.teleport >= P(g, need)) { c.cnt.teleport = 0; await g.flipVillain(); }
  } } });
  S['39012b'] = corneredSide(3); S['39013b'] = corneredSide(2);
  S['39014b'] = Object.assign(corneredSide(3), { async whenRevealed(g) { await g.forEachPlayer(async () => { if (g.e.villain) await g.enemyAttack(g.e.villain, { forceAlter: true }); }); } });
  S['39015a'] = { async setup(g) { // Across the Mojoverse
    const s = aside(g, '39016'); if (s) await g.enterSide(s, {});
    const shows = g.e.deck.filter(u => isShow(g, u)); const first = shows.length ? shows[Math.floor(g.rand() * shows.length)] : null;
    const rest = shows.filter(u => u !== first); const cor = aside(g, '39017'); if (cor) rest.push(cor);
    for (const u of rest) g.put(u, 'aside'); g.shuffle(rest); g.e.showDeck = rest.slice();
    if (first) await enterShow(g, first, true);
    g.log(`쇼 덱 ${rest.length}장`);
  } };
  MC.scenarios.spiral = Object.assign(MC.scenarios.spiral || {}, { discardInstead(g, u, zone) { // a Show environment goes to the bottom of the show deck instead
    if (zone !== 'env' || !isShow(g, u) || !g.e.showDeck) return false; g.put(u, 'aside'); g.e.showDeck.push(u); g.log(`${g.nm(u)}: 쇼 덱 맨 아래로`); return true;
  } });
  S['39015b'] = { loseOnComplete: true };
  S['39016'] = { // The Search for Spiral
    actions: [{ timing: 'hero', label: '피해 2 → 이 음모에서 위협 3 제거', can: (g, u) => g.c(u).zone === 'side' && g.c(u).threat > 0, async use(g, u) { await g.dealDamage(g.idt(), 2, {}); if (!g.c(g.idt()).zone) return; const r = await g.removeThreat(u, 3, { src: g.idt() }); g.log(`스파이럴 수색: 위협 ${r} 제거`); await g.afterThreatRemoved(u); } }],
    async whenDefeated(g, u) { await revealShowTop(g); g.c(u).threat = P(g, 3); g.log(`스파이럴 수색: 위협 ${P(g, 3)}을(를) 다시 놓습니다`); return 'handled'; }
  };
  S['39017'] = { async whenRevealed(g, u) { // Cornered!
    if (!cornered(g)) await g.flipVillain(); await revealShowTop(g);
    g.put(u, 'aside'); const d = showDeck(g); d.push(u); g.shuffle(d); g.e.showDeck = d; g.log('궁지에 몰렸다!: 쇼 덱에 다시 섞습니다');
  } };
  S['39018'] = { attachTo: g => g.e.villain, mod: { atk: (g, s, t) => t === g.c(s).on ? (g.c(s).cnt.sword || 0) : 0 }, // Spiral's Swords
    actions: [{ timing: 'hero', label: '[물리][물리] → 검 카운터 1 제거', cost: { n: 2, req: 'RR' }, can: (g, u) => cornered(g) && (g.c(u).cnt.sword || 0) > 0, use(g, u) { g.c(u).cnt.sword--; } }] };
  S['39019'] = { async whenRevealed(g) { // Erratic Teleportation
    if (cornered(g)) { const c = g.c(g.e.villain); c.cnt.teleport = (c.cnt.teleport || 0) + 1; return; }
    const d = showDeck(g); if (!d.length) return; const paid = await g.pay({ n: 1, req: 'B' }, null, '불규칙한 순간이동: [정신] 1로 쇼 덱 맨 위를 볼까요?', true); if (paid == null) return;
    const top = d[0]; const o = await g.ask({ type: 'choice', title: `쇼 덱 맨 위: ${g.nm(top)}`, options: [{ id: 't', label: '맨 위에 둠' }, { id: 'b', label: '맨 아래로' }] }); if (o === 'b') { d.push(d.shift()); g.e.showDeck = d; }
  } };
  S['39020'] = { async whenRevealed(g) { // The Show Must Go On
    const sh = (g.e.env || []).find(u => isShow(g, u)); if (!sh) return; const key = Object.keys(MC.modulars).find(k => MC.modulars[k].cards.includes(idOf(g, sh))); if (!key) return;
    await g.forEachPlayer(() => { const x = searchEnc(g, d => MC.modulars[key].cards.includes(d.id)); if (x) { g.put(x, 'facedown'); g.log(`쇼는 계속되어야 한다: ${MC.modulars[key].name} 카드를 뒷면으로 받습니다`, 'warn'); } });
    g.shuffle(g.e.deck);
  } };
  S['39021'] = { async whenRevealed(g) { const v = g.e.villain; if (!v) return; // Well-Armed
    if (g.c(v).att.some(a => idOf(g, a) === '39018')) await g.enemyAttack(v, {}); else { const x = searchEnc(g, d => d.id === '39018'); if (x) { g.attachEnc(x, v); g.shuffle(g.e.deck); } } } };

  // ======================= Mojo =======================
  const mojoSet = g => new Set(((g.scenData()).encounter || []).concat(['39022', '39023', '39024', '39025a', '39025b', '39026a', '39026b']));
  const mojo = n => ({ on: { async playerPhaseEnd(g) { if (!g.isHero()) return; // Mojo: ratings for the off-brand shows
    const out = millN(g, n); const set = mojoSet(g); const k = out.filter(x => !set.has(idOf(g, x))).length; g.log(`★ 모조: 조우 덱 ${out.length}장 버림, 다른 세트 ${k}장`); addThreatTo(g, g.idt(), k, '모조');
  } } });
  S['39022'] = mojo(3); S['39023'] = Object.assign(mojo(4), { whenRevealed(g) { for (const x of g.allFriendlyChars()) addThreatTo(g, x, 2, '모조'); } });
  S['39024'] = Object.assign(mojo(5), { whenRevealed(g) { for (const x of g.allFriendlyChars()) addThreatTo(g, x, 3, '모조'); } });
  async function revealModule(g, onTop) { // a set-aside modular set: its Show comes out, the rest goes into the encounter deck
    const left = (g.e.asideMods || []).filter(m => !m.used); if (!left.length) return null; const m = left[Math.floor(g.rand() * left.length)]; m.used = true;
    const show = m.cards.find(u => g.c(u).zone === 'aside' && isShow(g, u)); const rest = m.cards.filter(u => u !== show && g.c(u).zone === 'aside');
    g.log(`장르의 바퀴: 「${MC.modulars[m.key].name}」`, 'warn');
    if (onTop) { g.shuffle(rest); for (const u of rest.slice().reverse()) g.put(u, 'edeck', null, true); } else { for (const u of rest) g.put(u, 'edeck'); g.shuffle(g.e.deck); }
    if (show) await enterShow(g, show, true); return m.key;
  }
  S['39025a'] = { setup(g) { const w = aside(g, '39026a'); if (w) g.put(w, 'env'); } };
  S['39025b'] = { charThreatToMain: true, async whenRevealed(g) { await revealModule(g, false); },
    on: { async formChanged(g, u) { const c = g.c(g.idt()); if (c.threat > 0 && g.c(u).zone === 'main') { const n = c.threat; c.threat = 0; g.log(`정체성의 위협 ${n}이(가) 주 음모로`, 'warn'); await g.placeThreat(u, n, {}); } } } };
  S['39026a'] = { on: { encounterDeckReset(g, u) { if (g.c(u).zone !== 'env') return; if (!(g.e.asideMods || []).some(m => !m.used)) g.lose('남은 장르가 없습니다'); g.c(u).id = '39026b'; g.log('장르의 바퀴가 멈췄습니다', 'warn'); } } };
  S['39026b'] = { on: { async villainStep3(g, u) { if (g.c(u).zone !== 'env') return; await revealModule(g, true); await g.withPlayer(g.s.first, async () => { facedown(g, '장르의 바퀴'); facedown(g, '장르의 바퀴'); }); g.c(u).id = '39026a'; } } };
  S['39027'] = { attachTo: g => g.e.villain, on: { afterEnemyAttack(g, u, ctx) { if (ctx.enemy === g.c(u).on && ctx.dealt > 0) { millN(g, ctx.dealt); g.log(`★ 메이저 도모: 조우 카드 ${ctx.dealt}장 버림`); } } }, // Major Domo
    actions: [{ timing: 'hero', label: '[에너지][정신][물리] → 이 카드 버림', cost: { n: 3, req: 'YBR' }, can: (g, u) => g.c(u).zone === 'attach', use(g, u) { g.discard(u); } }] };
  S['39028'] = { attachTo: g => g.e.villain, mod: { retaliate: (g, s, t) => t === g.c(s).on ? 2 : 0 } }; // Stinger Tail
  S['39029'] = { on: { enemyActivated(g, u, ctx) { if (ctx.enemy === u && g.c(u).zone === 'minion') addThreatTo(g, u, 2, '★ 조연 배우'); } }, boostEffect(g) { for (const x of mine(g)) addThreatTo(g, x, 1, '조연 배우'); } }; // Supporting Actor
  S['39030'] = { // Paparazzi
    whenRevealed(g, u) { g.put(u, 'pobl'); g.c(u).threat = 10; g.log('파파라치: 위협 10', 'warn'); },
    actions: [{ timing: 'action', label: '캐릭터 소진 또는 손 1장 버림 → 위협 2 제거 (일상이면 3)', can: (g, u) => g.c(u).zone === 'pobl' && (g.p.hand.length > 0 || mine(g).some(x => !g.c(x).ex)), async use(g, u) {
      const opts = []; if (mine(g).some(x => !g.c(x).ex)) opts.push({ id: 'x', label: '캐릭터 소진' }); if (g.p.hand.length) opts.push({ id: 'd', label: '손 카드 1장 버림' });
      const o = opts.length === 1 ? opts[0].id : await g.ask({ type: 'choice', title: '파파라치: 대가', options: opts });
      if (o === 'x') { const t = await pick(g, mine(g).filter(x => !g.c(x).ex), '소진할 캐릭터'); if (t) g.c(t).ex = true; } else { const t = await pick(g, g.p.hand.slice(), '버릴 카드'); if (t) g.put(t, 'discard'); }
      g.c(u).threat = Math.max(0, g.c(u).threat - (g.isHero() ? 2 : 3)); if (!g.c(u).threat) g.discard(u, '파파라치를 따돌렸습니다');
    } }],
    on: { async playerPhaseEnd(g, u) { if (g.c(u).zone !== 'pobl') return; const n = g.c(u).threat; g.discard(u, '파파라치: 차례 끝'); if (n) await g.placeThreat(g.e.main, n, {}); } }
  };
  S['39031'] = { on: { async wouldTakeDamage(g, u, ctx) { if (ctx.target !== g.e.villain || g.c(u).zone !== 'side' || ctx.amount <= 0) return; // Undercover Mojo
    const n = ctx.amount; ctx.amount = 0; g.c(u).threat = Math.max(0, g.c(u).threat - n); g.log(`위장 잠입한 모조: 피해 대신 위협 ${n} 제거`); await g.afterThreatRemoved(u); } } };
  S['39032'] = { async whenRevealed(g) { // Curtain Call
    const all = g.allFriendlyChars().concat(g.enemies()); const top = all.filter(x => g.c(x).threat > 0).sort((a, b) => g.c(b).threat - g.c(a).threat)[0];
    if (top) { const n = g.c(top).threat; g.c(top).threat = 0; g.log(`커튼콜: ${g.nm(top)}의 위협 ${n}을(를) 주 음모로`, 'warn'); await g.placeThreat(g.e.main, n, {}); } else for (const x of mine(g)) addThreatTo(g, x, 1, '커튼콜');
  }, boostEffect: boostReveal };
  S['39033'] = { async whenRevealed(g, u, ctx) { // Director's Directions
    const opts = [{ id: 'p', label: '서로 다른 자원 2개 소모' }, { id: 's', label: '모조가 음모를 꾸밈' }, { id: 'd', label: `정체성의 위협 ${g.c(g.idt()).threat}만큼 피해` }];
    const o = await g.ask({ type: 'choice', title: '감독의 지시: 하나를 고르세요', options: opts });
    if (o === 'p') { const r = await g.pay({ n: 2, req: '', distinct: true }, null, '감독의 지시: 서로 다른 자원 2개', true); if (r != null) return; }
    if (o === 's' || o === 'p') { if (g.e.villain) await g.enemyScheme(g.e.villain, {}); return; }
    const n = g.c(g.idt()).threat; if (n) await g.dealDamage(g.idt(), n, {}); if (n < 2) ctx.surge++;
  } };
  S['39034'] = { whenRevealed(g) { for (const x of mine(g)) { if (g.c(x).dmg) g.heal(x, 1); addThreatTo(g, x, 2, '주연 자리'); } }, boostEffect(g) { for (const x of mine(g)) addThreatTo(g, x, 1, '★ 주연 자리'); } }; // Top Billing

  // ======================= genre modular sets =======================
  const setting = extra => Object.assign({ async whenRevealed(g, u, ctx) { // a Setting: the other Settings leave; revealed from the deck it gains surge
    for (const x of (g.e.env || []).slice()) if (x !== u && tr(g, x, 'SETTING')) g.discard(x, `${g.nm(x)}: 다른 배경이 들어와 버림`);
    if (ctx && !ctx.fromShow && g.c(u).zone === 'env') ctx.surge++;
  } }, extra);
  const resRemove = (req, label) => ({ timing: 'hero', label: `${label} X개 → 위협 X 제거`, can: (g, u) => g.c(u).zone === 'side' && g.c(u).threat > 0, async use(g, u) {
    const max = g.c(u).threat; const opts = []; for (let i = max; i >= 1; i--) opts.push({ id: String(i), label: `${i}개` });
    const x = +(await g.ask({ type: 'choice', title: `${g.nm(u)}: 소모할 ${label} 수`, options: opts })) || 1;
    const paid = await g.pay({ n: x, req: req.repeat(x) }, null, `${label} ${x}`, true); if (paid == null) return;
    const r = await g.removeThreat(u, x, { src: g.idt() }); g.log(`${g.nm(u)}: 위협 ${r} 제거`); await g.afterThreatRemoved(u);
  } });
  // Crime
  S['39035'] = setting({ inciteFor: (g, s, u) => g.d(u).enc && g.c(s).zone === 'env' ? 1 : 0, mod: { thw: (g, s, t) => g.allFriendlyChars().includes(t) ? 1 : 0 } }); // Dial M for Mojo
  const oblAccel = { accelBonus: (g, u) => g.c(u).zone === 'pobl' ? 1 + ((g.e.env || []).some(x => idOf(g, x) === '39060') ? 1 : 0) : 0 };
  S['39036'] = Object.assign({ whenRevealed(g, u) { g.put(u, 'pobl'); }, // Build the Case
    on: { sideSchemeDefeated(g, u) { if (g.c(u).zone !== 'pobl') return; g.c(u).cnt.clue = (g.c(u).cnt.clue || 0) + 1; if (g.c(u).cnt.clue >= 3) g.discard(u, '증거 확보 완료'); } } }, oblAccel);
  S['39037'] = { blocksRemoval: (g, x, sc) => g.c(x).zone === 'side' && sc !== x, actions: [resRemove('B', '[정신]')] }; // Crime Scene Investigation
  S['39038'] = { mod: { atk: (g, s, t) => g.c(s).zone === 'side' && g.allFriendlyChars().includes(t) ? -2 : 0 }, actions: [resRemove('Y', '[에너지]')] }; // Law & Order
  S['39039'] = { shieldsFromDamage: (g, u, t) => g.c(u).zone === 'side' && t === g.e.villain, actions: [resRemove('R', '[물리]')] }; // Dragnet
  S['39040'] = { async whenRevealed(g) { // Elementary, My Dear Mojo
    const sides = g.e.sides.filter(x => g.c(x).threat > 0); const o = sides.length ? await g.ask({ type: 'choice', title: '기본이지, 친애하는 모조: 하나를 고르세요', options: [{ id: 'm', label: '부가 음모 하나의 위협을 모두 주 음모로' }, { id: 'r', label: '부가 음모가 나올 때까지 조우 덱을 버리고 공개' }] }) : 'r';
    if (o === 'm') { const t = await pick(g, sides, '위협을 옮길 부가 음모'); const n = g.c(t).threat; g.c(t).threat = 0; await g.placeThreat(g.e.main, n, {}); await g.afterThreatRemoved(t); return; }
    for (let i = 0; i < 80; i++) { const x = g.takeEncounter(); if (!x) break; if (g.d(x).type === 'side') { await g.reveal(x); break; } g.put(x, 'ediscard'); }
  } };
  // Fantasy
  S['39041'] = setting({ mod: { hs: (g, s, t) => g.identityPlayer(t) >= 0 && g.c(s).zone === 'env' ? 1 : 0 } }); // A Game of Mojo's
  const printed = (g, src, r) => !!src && !!g.c(src) && (g.d(src).res || '').includes(r);
  S['39042'] = { on: { wouldTakeDamage(g, u, ctx) { if (ctx.target === u && printed(g, ctx.src, 'Y')) { ctx.amount *= 2; g.log('드래곤: [에너지] 카드에게 피해 2배'); } } }, async whenDefeated(g) { await g.forEachPlayer(() => g.draw(4)); } }; // Dragon
  S['39044'] = { on: { wouldTakeDamage(g, u, ctx) { if (ctx.target === u && printed(g, ctx.src, 'B')) ctx.amount += 1; } }, // Troll
    async whenDefeated(g) { const c = g.p.discard.filter(x => g.d(x).type === 'ally'); if (!c.length || !(await yes(g, '트롤 격파: 버림 더미의 동료 1장을 플레이할까요?'))) return; const t = await pick(g, c, '플레이에 놓을 동료'); if (t) await g.putAllyIntoPlay(t); } };
  S['39045'] = { async whenDefeated(g) { await g.forEachPlayer(async () => { // Fetch Quest
    const c = g.p.deck.filter(x => !g.d(x).enc && g.d(x).type !== 'resource'); if (!c.length || !(await yes(g, `심부름 퀘스트(${g.playerName()}): 덱에서 카드 1장을 비용 없이 플레이할까요?`))) return;
    const t = await pick(g, c, '플레이할 카드'); if (!t) return; g.put(t, 'hand'); g.shuffle(g.p.deck); g.p.costRed = 99; try { if (g.canPlay(t)) await g.playCard(t); } finally { g.p.costRed = 0; }
  }); }, boostEffect(g, u, ctx) { (ctx.putIntoPlay = ctx.putIntoPlay || []).push(u); } };
  S['39046'] = { async whenRevealed(g) { // Mana Drain
    const o = await g.ask({ type: 'choice', title: '마나 흡수: 자원 유형을 고르세요', options: [{ id: 'Y', label: '[에너지]' }, { id: 'B', label: '[정신]' }, { id: 'R', label: '[물리]' }] });
    await g.forEachPlayer(async () => { await g.draw(2); const c = g.p.hand.filter(x => (g.d(x).res || '').includes(o)); for (const x of c) g.put(x, 'discard'); g.log(`마나 흡수(${g.playerName()}): ${c.length}장 버림`, 'warn'); });
  }, async boostEffect(g) { const t = await pick(g, g.p.hand.slice(), '★ 마나 흡수: 버릴 카드'); if (t) g.put(t, 'discard'); } };
  // Horror
  S['39047'] = setting({ grantKw: (g, s, t) => g.c(s).zone === 'env' && g.d(t).type === 'minion' ? ['quickstrike'] : null }); // The Mojo Files
  S['39048'] = { attachTo: g => g.idt(), // Bandolier of Stakes
    async whenRevealed(g, u) { const paid = g.canAfford({ n: 1, req: '' }, null) ? await g.pay({ n: 1, req: '' }, null, '말뚝 탄띠: 자원 1로 장착할까요?', true) : null; if (paid != null) { g.c(u).cnt.stake = 3; g.log('말뚝 탄띠를 장착했습니다', 'good'); } else g.discard(u); },
    respond: [{ window: 'basicPowerUsed', timing: 'hero', label: '말뚝 1 → 이 공격 +1, 관통', can: (g, u, ctx) => ctx.kind === 'attack' && g.c(u).on === g.idt() && (g.c(u).cnt.stake || 0) > 0, resolve(g, u, ctx) { g.c(u).cnt.stake--; ctx.bonus += 1; ctx.piercing = true; if (!g.c(u).cnt.stake) g.discard(u); } }] };
  S['39049'] = { on: { async enemyActivated(g, u, ctx) { if (ctx.enemy !== u || g.c(u).zone !== 'minion') return; // Cultist
    const k = searchEnc(g, d => d.id === '39050'); if (k) { g.shuffle(g.e.deck); await g.enterMinion(k, {}); } g.discard(u, '★ 광신도: 크라켄을 부르고 버림'); } } };
  S['39050'] = { on: { async enemyActivated(g, u, ctx) { if (ctx.enemy !== u) return; for (const x of g.allFriendlyChars().concat(g.enemies()).filter(x => x !== u)) await g.dealDamage(x, 1, {}); } }, // The Kraken
    whenDefeated(g) { for (const x of g.allFriendlyChars()) g.heal(x, 1); } };
  S['39051'] = { on: { afterEnemyAttack(g, u, ctx) { if (ctx.enemy !== u || !(ctx.damaged || []).length || !g.c(u).zone) return; if (g.c(u).dmg) { g.c(u).dmg = 0; g.log('★ 뱀파이어: 피해를 모두 회복'); } else g.giveStatus(u, 'tough', '★ 뱀파이어'); } } }; // Vampire
  S['39052'] = { // Werewolf Pack
    whenRevealed(g, u) { const a = g.p.allies.filter(x => !g.sc(x).noAllyLimit); if (!a.length) return; const t = a[0]; g.discard(t, '늑대인간 무리: 동료 격파'); g.put(t, 'under', u); g.c(t).fd = true; },
    async wouldBeDefeated(g, u, wctx) { const x = g.c(u).under[0]; if (!x) return; wctx.saved = true; g.put(x, g.d(x).enc ? 'ediscard' : 'discard'); g.c(u).dmg = 0; g.log('늑대인간 무리: 밑의 동료를 버리고 회복합니다', 'warn'); } };
  // Sci-Fi
  S['39053'] = setting({ on: { minionEnters(g, u, ctx) { if (g.c(u).zone === 'env') g.giveStatus(ctx.minion, 'tough', '모조 러너'); } }, // Mojo Runner
    respond: [{ window: 'allyEntered', label: '강인함 카드 받기', can: (g, u, ctx) => g.c(u).zone === 'env' && g.c(ctx.ally).zone === 'ally', resolve(g, u, ctx) { g.giveStatus(ctx.ally, 'tough', '모조 러너'); } }] });
  const exhaustChar = async (g, why, dmg) => { const t = await pick(g, mine(g).filter(x => !g.c(x).ex), `${why}: 소진할 캐릭터`); if (!t) return; g.c(t).ex = true; if (dmg) await g.dealDamage(t, dmg, {}); };
  S['39054'] = { on: { async minionEnters(g, u, ctx) { if (ctx.minion === u) await exhaustChar(g, '애벌랜치 9.0', 1); } }, async boostEffect(g) { await exhaustChar(g, '★ 애벌랜치 9.0', 0); } };
  S['39055'] = { on: { wouldTakeDamage(g, u, ctx) { if (ctx.target === u && ctx.byPlayer && ctx.amount > 2) { ctx.amount = 2; g.log('블롭 3.14: 피해는 2까지만'); } } }, boostEffect(g) { g.giveStatus(g.idt(), 'stun', '★ 블롭 3.14'); } };
  S['39056'] = { on: { async enemyActivated(g, u, ctx) { if (ctx.enemy !== u || !g.c(u).zone) return; const c = g.c(u); c.cnt.magnet = (c.cnt.magnet || 0) + 1; // Magneto 2.6
    const n = Math.min(c.cnt.magnet, g.p.hand.length); if (!n) return; const sel = await g.ask({ type: 'select', title: `매그니토 2.6: 버릴 카드 ${n}장`, cards: g.p.hand.slice(), min: n, max: n, confirm: '버리기' }); for (const x of sel || []) g.put(x, 'discard'); } } };
  S['39057'] = { async onAttackStart(g) { await g.indirectDamage(2, null); }, async boostEffect(g) { await g.indirectDamage(2, null); } }; // Pyro 4.0
  S['39058'] = { on: { async minionEnters(g, u, ctx) { if (ctx.minion !== u) return; const t = await pick(g, g.p.upgrades.filter(x => !g.d(x).permanent), '토드 2.0: 밑에 놓일 업그레이드'); if (t) { for (const a of g.c(t).att.slice()) g.discard(a); g.resetCard(t); g.put(t, 'under', u); g.c(t).fd = true; } } }, // Toad 2.0
    whenDefeated(g, u) { for (const x of g.c(u).under.slice()) { delete g.c(x).fd; g.put(x, 'hand'); } } };
  S['39059'] = { grantKw: (g, s, t) => g.c(s).zone === 'side' && g.d(t).type === 'minion' ? ['guard', 'patrol'] : null, // ICE-Teroid M
    on: { async roundEnd(g, u) { if (g.c(u).zone !== 'side') return; const live = g.livingPlayers(); const pi = live.length > 1 ? live[1] : g.s.first; await g.withPlayer(pi, async () => { const x = searchEnc(g, d => d.type === 'minion'); if (x) { g.shuffle(g.e.deck); await g.enterMinion(x, {}); } }); } } };
  // Sitcom
  S['39060'] = setting({}); // Mojo in the Middle (obligations gain acceleration: see oblAccel)
  const sitcom = (o) => Object.assign({ whenRevealed(g, u) { g.put(u, 'pobl'); g.log(`${g.nm(u)}: 플레이에 남습니다`, 'warn'); } }, oblAccel, o);
  S['39061'] = sitcom({ blankSupports: true, actions: [{ timing: 'alter', label: '정체성과 지원 모두 소진 → 이 카드 버림', can: (g, u) => g.c(u).zone === 'pobl' && !g.c(g.idt()).ex, use(g, u) { g.c(g.idt()).ex = true; for (const x of g.p.supports) g.c(x).ex = true; g.discard(u); } }] }); // Family Matters
  S['39062'] = sitcom({ costMod: (g, s, uid) => g.c(s).zone === 'pobl' && g.d(uid).type === 'upgrade' ? -2 : 0, // Growing Pains
    actions: [{ timing: 'alter', label: '업그레이드 1장 버림 (조건 충족 시 이 카드 버림)', can: (g, u) => g.c(u).zone === 'pobl' && (g.p.upgrades.some(x => !g.d(x).permanent) || g.p.hand.some(x => g.d(x).type === 'upgrade')), async use(g, u) {
      const t = await pick(g, g.p.upgrades.filter(x => !g.d(x).permanent).concat(g.p.hand.filter(x => g.d(x).type === 'upgrade')), '버릴 업그레이드'); if (t) g.discard(t) || (g.c(t).zone === 'hand' && g.put(t, 'discard'));
      if (g.p.discard.filter(x => g.d(x).type === 'upgrade').length > g.p.upgrades.length) g.discard(u, '성장통을 극복했습니다');
    } }] });
  S['39063'] = sitcom({ allyLimit: (g, u) => g.c(u).zone === 'pobl' ? -2 : 0, // The Odd Couple
    actions: [{ timing: 'alter', label: '캐릭터 2명 소진 → 동료 1장을 덱에 섞고 이 카드 버림', can: (g, u) => g.c(u).zone === 'pobl' && mine(g).filter(x => !g.c(x).ex).length >= 2, async use(g, u) {
      const c = mine(g).filter(x => !g.c(x).ex); const sel = await g.ask({ type: 'select', title: '소진할 캐릭터 2명', cards: c, min: 2, max: 2, confirm: '확정' }); for (const x of sel || c.slice(0, 2)) g.c(x).ex = true;
      const a = await pick(g, g.p.discard.filter(x => g.d(x).type === 'ally'), '덱에 섞을 동료'); if (a) { g.put(a, 'deck'); g.shuffle(g.p.deck); } g.discard(u);
    } }] });
  S['39064'] = sitcom({ actions: [{ timing: 'alter', label: '손 카드 3장 버림 → 카드 1장 뽑고 이 카드 버림', can: (g, u) => g.c(u).zone === 'pobl' && g.p.hand.length >= 3, async use(g, u) { // The One with the Breakup
    const sel = await g.ask({ type: 'select', title: '버릴 카드 3장', cards: g.p.hand.slice(), min: 3, max: 3, confirm: '버리기' }); for (const x of sel || []) g.put(x, 'discard'); const pi = await g.choosePlayer('이별 에피소드: 카드 1장을 뽑을 플레이어'); await g.withPlayer(pi, () => g.draw(1)); g.discard(u); } }] });
  S['39065'] = sitcom({ actions: [{ timing: 'alter', label: '정체성 소진·혼란 카드 버림 → 이 카드 버림', can: (g, u) => g.c(u).zone === 'pobl' && !g.c(g.idt()).ex && g.c(g.idt()).conf, use(g, u) { g.c(g.idt()).ex = true; g.c(g.idt()).conf = false; g.discard(u); } }] }); // Watch Me Play
  // Western
  S['39066'] = setting({ grantKw: (g, s, t) => g.c(s).zone === 'env' && ['villain', 'minion'].includes(g.d(t).type) ? ['overkillAtk'] : null, // Wild Wild Mojo
    on: { wouldTakeDamage(g, u, ctx) { if (g.c(u).zone === 'env' && ctx.amount > 0 && ['hero', 'alter', 'ally', 'villain', 'minion'].includes(g.d(ctx.target).type)) ctx.amount += 1; } } });
  S['39067'] = { attachTo: g => { const m = g.e.minions; if (!m.length) return null; const top = Math.max(...m.map(x => g.d(x).hp || 0)); return m.find(x => (g.d(x).hp || 0) === top); }, surgeIfNoHost: true, // Dead or Alive
    mod: { hp: (g, s, t) => t === g.c(s).on ? P(g, 3) : 0 }, on: { async attachedDefeated(g) { await g.forEachPlayer(async () => { const t = await pick(g, g.p.discard.slice(), `생사불문(${g.playerName()}): 손으로 가져올 카드`); if (t) g.put(t, 'hand'); }); } } };
  const resTypes = (g, cards) => new Set(cards.flatMap(x => (g.d(x).res || '').split(''))).size;
  S['39068'] = { on: { async afterEnemyAttack(g, u, ctx) { if (ctx.enemy !== u) return; const c = []; for (let i = 0; i < 3; i++) { if (!g.p.deck.length) await g.reshuffleDeck(); const x = g.p.deck[0]; if (!x) break; g.put(x, 'discard'); c.push(x); } // Card Shark
    const n = resTypes(g, c); g.log(`★ 카드 사기꾼: 자원 유형 ${n}가지`); if (n) await g.indirectDamage(n, u); } } };
  S['39070'] = { async whenRevealed(g) { await g.draw(5); const n0 = Math.min(5, g.p.hand.length); // A Game of Cards
    const sel = await g.ask({ type: 'select', title: `카드 게임 한 판: 버릴 카드 ${n0}장`, cards: g.p.hand.slice(), min: n0, max: n0, confirm: '버리기' }) || g.p.hand.slice(0, n0);
    for (const x of sel) g.put(x, 'discard'); const n = resTypes(g, sel); g.log(`카드 게임 한 판: 자원 유형 ${n}가지`, 'warn');
    for (let i = 0; i < n; i++) { const t = await pick(g, g.p.upgrades.concat(g.p.supports).filter(x => !g.d(x).permanent), '버릴 업그레이드 또는 지원'); if (!t) break; g.forceDiscard = true; g.discard(t); g.forceDiscard = false; }
  } };
  // Longshot
  S['39071'] = { noAllyLimit: true, selfPiercing: true, whenRevealed(g, u, ctx) { g.put(u, 'ally'); g.c(u).ex = false; g.log('롱샷이 당신 편에 합류합니다', 'good'); ctx.surge++; } };

  S['39043'] = { // Goblin (Fantasy): only cards with a printed [physical] resource can damage it
    cannotTakeDamage: (g, u, o) => { const s = o && o.src; return !(s && g.c(s) && (g.d(s).res || '').includes('R')); },
    async whenDefeated(g) { const sc = [g.e.main].concat(g.e.sides).filter(x => x && g.c(x).threat > 0); if (!sc.length) return;
      const t = sc.length === 1 ? sc[0] : await g.ask({ type: 'target', title: '고블린: 위협 2를 제거할 음모', cands: sc, cancelable: false }) || sc[0];
      const r = await g.removeThreat(t, 2, {}); g.log(`고블린 격파: ${g.nm(t)}에서 위협 ${r} 제거`, 'good'); await g.afterThreatRemoved(t); }
  };
  S['39069'] = { on: { async minionEnters(g, u, ctx) { // Gunslinger (Western): before its quickstrike you may spend [energy][energy] to hit it with your ATK
    if (ctx.minion !== u || !g.isHero() || !g.canAfford({ n: 2, req: 'YY' }, null)) return;
    if (await g.ask({ type: 'choice', title: '총잡이: [에너지][에너지]를 소모하고 히어로 공격력만큼 피해를 줄까요?', options: [{ id: 'y', label: `소모 → 피해 ${g.stat(g.idt(), 'atk') || 0}` }, { id: 'n', label: '안 함' }] }) !== 'y') return;
    if ((await g.pay({ n: 2, req: 'YY' }, null, '총잡이: [에너지][에너지]', true)) == null) return;
    await g.dealDamage(u, g.stat(g.idt(), 'atk') || 0, { src: g.idt(), byPlayer: true });
  } } };
  MC.registerScripts(S);
})();
