/* Challenges (2401-2424): each challenge is a base scenario plus a rules card that stays in play.
   Ported from cards/pack/challenges/24xx_*.py of the original. As in the original, hero restrictions are
   not enforced (the start screen only warns); a challenge whose win condition is not met turns the win into a loss. */
(function () {
  'use strict';
  const MC = window.MC, S = {};
  const idOf = (g, u) => (g.c(u) || {}).real || (g.c(u) || {}).id;
  const enName = (g, u) => ((g.d(u) || {}).en || '').replace(/^\*\s*/, '');
  const heroName = g => ((MC.cards[g.p.heroId] || {}).en || '').replace(/^\*\s*/, '');
  const finalStage = g => !!g.e.villain && (g.e.stage || 0) + 1 >= (g.e.stages || []).length;
  const fromDeck = (g, pred) => g.e.deck.find(u => pred(g.d(u), u)) || null;
  const fail = why => `챌린지 실패: ${why}`;

  // 2401 The Ground is Lava: changing to alter-ego costs 2 damage
  S.ch2401 = { on: { async formChanged(g, u, ctx) { if (ctx.form === 'alter') { g.log('바닥은 용암이다: 일상 형태로 바꿔 피해 2', 'warn'); await g.dealDamage(g.idt(), 2, {}); } } } };

  // 2402 Two for One: the final villain stage only falls to Fastball Special's overkill damage
  S.ch2402 = { capDamage(g, x, t, n, o) {
    if (t !== g.e.villain || !finalStage(g) || n < g.hpLeft(t)) return n;
    if (o && o.overkill && o.src && idOf(g, o.src) === '35023') return n;
    g.log('일석이조: 패스트볼 스페셜의 남은 피해로만 마지막 일격을 가할 수 있습니다', 'warn'); return Math.max(0, g.hpLeft(t) - 1);
  } };

  // 2403 Magnets and Metal: Seized! comes out after setup
  S.ch2403 = { async challengeSetup(g) { const u = fromDeck(g, d => d.id === '32158'); if (u) { g.log('자석과 금속: 포획!을 공개합니다', 'warn'); await g.reveal(u); } } };

  // 2404 Teamwork Makes the Dream Work, 2405 Form Flippers, 2407 Breakin' and Takin', 2409 Gene Pool Party: no rules beyond the setup
  for (const k of ['ch2404', 'ch2405', 'ch2407', 'ch2409']) S[k] = {};

  // 2406 Flower Power: Groot at full health with the Power Stone when the villain falls
  S.ch2406 = { winCheck(g) {
    if (!heroName(g).includes('Groot')) return fail('그루트 히어로로 이겨야 합니다');
    if (g.c(g.idt()).dmg > 0) return fail('그루트의 생명력이 최대치가 아닙니다');
    if (!g.c(g.idt()).att.some(a => idOf(g, a) === '16149')) return fail('그루트가 파워 스톤을 가지고 있지 않습니다');
    return null;
  } };

  // 2408 Absorbing the Elements: Groot, Iceman, Rockslide and Colossus in play (heroes or allies)
  S.ch2408 = { winCheck(g) {
    const names = g.p.allies.map(a => enName(g, a)); if (g.isHero()) names.push(heroName(g));
    const miss = ['Groot', 'Iceman', 'Rockslide', 'Colossus'].filter(n => !names.includes(n));
    return miss.length ? fail(`플레이 영역에 없는 캐릭터: ${miss.join(', ')}`) : null;
  } };

  // 2410 Need for Speed: Quicksilver attacks Speed Demon three times in one turn; beating the villain does not count
  S.ch2410 = {
    on: { afterAttack(g, x, ctx) {
      if (ctx.attacker !== g.idt() || !g.isHero() || !heroName(g).includes('Quicksilver') || idOf(g, ctx.target) !== '24046') return;
      const k = `${g.s.round}`; const q = g.e.qsHits = g.e.qsHits && g.e.qsHits.k === k ? g.e.qsHits : { k, n: 0 }; q.n++;
      g.log(`세상엔 속도가 필요해: 이번 차례 스피드 데몬 공격 ${q.n}/3`, 'good');
      if (q.n >= 3) { g.e.chalWin = true; g.win('퀵실버가 한 차례에 스피드 데몬을 세 번 공격했습니다'); }
    } },
    winCheck: g => g.e.chalWin ? null : fail('퀵실버로 한 차례에 스피드 데몬을 세 번 공격해야 합니다 (빌런 격파는 인정되지 않음)')
  };

  // 2411 Whose Show is it Anyway?: Show environments never leave play and their When Revealed is ignored
  const isShow = (g, u) => g.d(u).type === 'environment' && (g.d(u).tr || []).includes('SHOW');
  S.ch2411 = { keepInPlay: (g, x, u) => isShow(g, u) && g.c(u).zone === 'env', skipRevealed: (g, x, u) => isShow(g, u) };

  // 2412 Wrath of the Mad Titan: start on main scheme 2A; only a hero at 1 hit point deals the final blow
  S.ch2412 = {
    async challengeSetup(g) { if ((g.e.mainStages || []).length > 1 && g.e.mainIdx === 0) { g.log('매드 타이탄의 분노: 주 음모를 2A 단계로 진행합니다', 'warn'); await g.setMainStage(1); } },
    capDamage(g, x, t, n, o) {
      if (t !== g.e.villain || !finalStage(g) || n < g.hpLeft(t)) return n;
      const src = o && o.src, mine = src === g.idt() || (src && g.c(src) && !g.d(src).enc && ['event', 'upgrade', 'support'].includes(g.d(src).type));
      if (mine && g.isHero() && g.hpLeft(g.idt()) === 1) return n;
      g.log('매드 타이탄의 분노: 마지막 일격은 남은 생명력이 1인 히어로만 가할 수 있습니다', 'warn'); return Math.max(0, g.hpLeft(t) - 1);
    }
  };

  // 2413 Complete the Collection: cards stay in The Collection, and it no longer makes you lose
  S.ch2413 = { challengePre(g) { g.e.collLocked = true; } };

  // 2414 Symbiote Smackdown: a permanent Symbiote Suit; Enraged Symbiote reveals; attacking it sets off the villain's Forced Response
  S.ch2414 = {
    async challengeSetup(g) {
      await g.forEachPlayer(async () => {
        const s = g.newCard('27191', 'upgrade'); g.log(`심비오트 난타전: ${g.nm(s)}을(를) 플레이 영역에 내려놓습니다 (영구)`, 'good');
        const u = fromDeck(g, d => d.type === 'minion' && (d.en || '').includes('Enraged Symbiote')); if (u) await g.reveal(u);
      });
    },
    keepInPlay: (g, x, u) => idOf(g, u) === '27191' && g.c(u).zone === 'upgrade',
    on: { async afterAttack(g, x, ctx) {
      const v = g.e.villain; if (!v || !g.c(ctx.target) || !enName(g, ctx.target).includes('Enraged Symbiote') || !g.allFriendlyChars().includes(ctx.attacker)) return;
      const f = g.sc(v).on && g.sc(v).on.attackDealt; if (!f) return;
      g.log('심비오트 난타전: 격노한 심비오트가 공격받아 빌런의 강제 반응이 격발합니다', 'warn'); await f(g, v, { target: v, attacker: ctx.attacker, dealt: 0 });
    } }
  };

  // 2415 Fickle Crowds: each villain phase ends with ratings moving from The Challengers to The Champion
  S.ch2415 = { on: { async villainPhaseEnd(g) {
    const M = MC.magog; if (!M) return; const ch = M.crowd(g, '39004'); if (!ch || !(g.c(ch).cnt.ratings > 0)) return;
    const n = Math.min(g.players, g.c(ch).cnt.ratings); g.c(ch).cnt.ratings -= n; g.log(`변덕스러운 관중: 도전자들 시청률 -${n}`, 'warn');
    await M.ratings(g, '39003', n, '변덕스러운 관중');
  } } };

  // 2416 Everyday Heroes: flipping to hero form loses the game
  S.ch2416 = { on: { formChanged(g, x, ctx) { if (ctx.form === 'hero') g.lose(fail('히어로 형태로 바뀌었습니다')); } } };

  // 2417 Mystic Mayhem: each villain phase ends with the top encounter card revealed
  S.ch2417 = { on: { async villainPhaseEnd(g) { await g.withPlayer(g.s.first, async () => { const u = g.takeEncounter(); if (u) { g.log('신비한 대혼란: 조우 덱 맨 위 카드를 공개합니다', 'warn'); await g.reveal(u); } }); } } };

  // 2418 Lock and Load: the Experimental Weapons deck is four random Weapons from the modular sets
  S.ch2418 = { challengePre(g) {
    const pool = g.e.deck.filter(u => (g.d(u).tr || []).includes('WEAPON') && g.d(u).set !== 'Crossbones'); g.shuffle(pool);
    const pick = pool.slice(0, 4); pick.forEach(u => g.put(u, 'aside')); g.e.sub = g.e.sub || {}; g.e.sub.ew = pick.slice();
    g.log(`장전 완료: 모듈 세트의 무기 ${pick.length}장으로 실험 무기 덱을 만듭니다`, 'warn');
  } };

  // 2419 Lone Wolf: no allies in the deck; defeating a minion draws a card
  S.ch2419 = {
    challengePre(g) { const a = g.p.deck.filter(u => g.d(u).type === 'ally'); a.forEach(u => g.removeFromGame(u)); if (a.length) g.log(`외로운 늑대: 덱에서 동료 ${a.length}장을 제거합니다`, 'warn'); },
    on: { async playerDefeatsMinion(g) { g.log('외로운 늑대: 하수인 격파 → 카드 1장', 'good'); await g.draw(1); } }
  };

  // 2420 Field Study: a revealed minion sets off the Setting's Special
  S.ch2420 = { on: { async minionRevealed(g) { if (MC.aoa && MC.aoa.special) { g.log('현장 연구: 하수인 공개 → 배경의 특수 능력', 'warn'); await MC.aoa.special(g); } } } };

  // 2421 Battle of the Bots: Drone minions are Sentinels and Sentinel minions are Drones
  S.ch2421 = { grantTrait(g, x, u) { const d = g.d(u); if (d.type !== 'minion' && idOf(g, u) !== 'DRONE') return null; const t = d.tr || []; return [t.includes('DRONE') ? 'SENTINEL' : null, t.includes('SENTINEL') ? 'DRONE' : null].filter(Boolean); } };

  // 2422 Not Easy Being Green: 6 infamy per player on Criminal Enterprise loses the game
  S.ch2422 = { countersPlaced(g, x, e, kind, total) { if (kind === 'infamy' && total >= 6 * g.players) g.lose(fail(`범죄 기업의 악명 카운터가 ${total}개입니다`)); } };

  // 2423 The Wreckoning: four Wrecking Crew attachments come out after setup; villains grow with each defeated villain
  const downCount = g => Math.max(0, Object.keys(g.e.crewSide || {}).length - (g.e.villains || []).length);
  const isCrew = (g, t) => (g.e.villains || []).includes(t);
  S.ch2423 = {
    async challengeSetup(g) {
      const decks = [g.e.deck].concat(Object.values(g.e.vdecks || {}).map(v => v.deck));
      for (const id of ['07006', '07020', '07035', '07049']) { const u = decks.map(d => d.find(x => idOf(g, x) === id)).find(Boolean); if (u) await g.reveal(u); }
    },
    mod: { atk: (g, x, t) => isCrew(g, t) ? downCount(g) : 0, sch: (g, x, t) => isCrew(g, t) ? downCount(g) : 0 }
  };

  // 2424 Absolutely Zero Tolerance: Bastion is dealt facedown after setup and whenever he is back in the discard pile or victory display
  const dealBastion = (g, u) => { g.put(u, 'facedown', g.s.first); g.log('절대 무관용: 바스티온을 뒷면 조우 카드로 받습니다', 'warn'); };
  S.ch2424 = {
    challengeSetup(g) { const u = fromDeck(g, d => d.id === '32167'); if (u) dealBastion(g, u); },
    on: { villainPhaseEnd(g) { const u = g.e.discard.concat(g.e.victory || []).find(x => idOf(g, x) === '32167'); if (u) dealBastion(g, u); } }
  };

  MC.registerScripts(S);
})();
