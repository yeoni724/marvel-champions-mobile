/* Quicksilver (14001-14032): his hero set, Protection cards and nemesis set.
   Ported from cards/pack/qsv of the community build. */
(function () {
  'use strict';
  const S = {};
  const oncePhase = (g, key) => !g.p.usedOnce[key + ':' + g.s.phase];
  const useOncePhase = (g, key) => { g.p.usedOnce[key + ':' + g.s.phase] = true; };
  // ready Quicksilver; Friction Resistance readies after him
  async function readyHero(g) {
    const id = g.idt(); if (!g.c(id).ex || !g.canReady(id)) return false;
    g.c(id).ex = false; g.log(`${g.nm(id)} 준비`, 'good');
    for (const u of g.p.upgrades) if (g.c(u).id === '14009' && g.c(u).ex && g.isHero()) { g.c(u).ex = false; g.log('마찰 저항: 준비'); }
    return true;
  }
  const siblingsDraw = sibling => ({ actions: [{ timing: 'alter', once: true, label: '손에서 2장 버림 → 2장 뽑기', can: g => g.p.hand.length >= 2,
    async use(g) {
      const sel = await g.ask({ type: 'select', title: '버릴 카드 2장', cards: g.p.hand.slice(), min: 2, max: 2, confirm: '확정' });
      (sel || []).forEach(x => g.put(x, 'discard'));
      const n = sibling(g) ? 3 : 2; await g.draw(n); g.log(`초인 남매: ${n}장 뽑기`);
    } }] });
  async function dmgEnemy(g, n, title, src) { const t = await g.chooseTarget('enemy', title, src, false); if (t) await g.dealDamage(t, n, { src, byPlayer: true }); }

  // ======================= identity =======================
  S['14001a'] = { respond: [{ window: 'afterBasicPower', label: '초고속: 퀵실버 준비 (단계당 1번)', can: g => g.c(g.idt()).ex && g.canReady(g.idt()) && oncePhase(g, 'qsReady'),
    async resolve(g) { useOncePhase(g, 'qsReady'); await readyHero(g); } }] };
  S['14001b'] = siblingsDraw(g => g.p.allies.some(a => g.c(a).id === '14002'));

  // ======================= hero cards =======================
  S['14002'] = { respond: [{ window: 'allyPowerUsed', label: '조우 덱 맨 위를 버리고 강화 아이콘만큼 +', can: (g, u, ctx) => ctx.ally === u && g.e.deck.length + g.e.discard.length > 0, // Scarlet Witch (ally)
    async resolve(g, u, ctx) { const n = await g.countBoost(g.discardEncounterN(1)); ctx.bonus += n; g.log(`스칼렛 위치: 이번 사용 +${n}`); } }] };
  S['14003'] = { play: { timing: 'hero', can: g => g.c(g.idt()).ex && g.canReady(g.idt()), async resolve(g) { await readyHero(g); } } }; // Always Be Running
  S['14004'] = { play: { timing: 'hero', async resolve(g, u) { // Double Time
    for (let i = 0; i < 2; i++) {
      const opts = [];
      if (g.enemies().length) opts.push({ id: 'dmg', label: '적에게 피해 2' });
      if (g.targets('thwartable').length) opts.push({ id: 'thw', label: '음모에서 위협 2 제거' });
      if (!opts.length) return;
      const k = opts.length === 1 ? opts[0].id : await g.ask({ type: 'choice', title: `두 배의 시간 (${i + 1}/2)`, options: opts });
      if (k === 'thw') await g.removeThreatChoose(2, '위협 2를 제거할 음모', u); else await dmgEnemy(g, 2, '피해 2를 줄 적', u);
    }
  } } };
  S['14005'] = { play: { timing: 'hero', can: g => !g.p.phase.maxVel, async resolve(g) { // Maximum Velocity
    g.p.phase.maxVel = true; ['thw', 'atk', 'def'].forEach(k => g.addRoundMod(g.idt(), k, 2)); g.log('최고 속도: 라운드 끝까지 저지·공격·방어 +2', 'good');
  } } };
  S['14006'] = { play: { timing: 'hero', can: g => g.enemies().some(x => !g.c(x).stun), async resolve(g, u) { // Speed Cyclone (cost X)
    const c = g.enemies().filter(x => !g.c(x).stun);
    let max = c.length; while (max > 0 && !g.canAfford({ n: max, req: '' }, null)) max--;
    if (!max) { g.log('속도 사이클론: X를 낼 자원이 없습니다'); return; }
    const opts = []; for (let i = 1; i <= max; i++) opts.push({ id: String(i), label: `X = ${i}` });
    const x = +(await g.ask({ type: 'choice', title: '속도 사이클론: X (기절시킬 적 수, 자원 X 지불)', options: opts })) || 1;
    if (!(await g.pay({ n: x, req: '' }, null, `속도 사이클론 X=${x}`, false))) return;
    const sel = c.length <= x ? c : await g.ask({ type: 'select', title: `기절시킬 적 ${x}명`, cards: c, min: x, max: x, confirm: '확정' });
    (sel || []).forEach(e => g.giveStatus(e, 'stun', '속도 사이클론'));
  } } };
  S['14007'] = { actions: [{ timing: 'alter', exhaust: true, label: '소진 → 버림 더미의 퀵실버 카드 2장을 덱에 섞기', can: g => g.p.discard.some(x => g.d(x).cls === 'Hero'), // Serval Industries
    async use(g) {
      const c = g.p.discard.filter(x => g.d(x).cls === 'Hero');
      const sel = c.length <= 2 ? c : await g.ask({ type: 'select', title: '덱에 섞을 퀵실버 카드 2장', cards: c, min: 2, max: 2, confirm: '확정' });
      (sel || []).forEach(x => g.put(x, 'deck')); g.shuffle(g.p.deck); g.log(`${(sel || []).length}장을 덱에 섞음`);
    } }] };
  S['14008'] = { mod: { def: (g, self, t) => t === g.idt() && g.isHero() ? 1 : 0 } }; // Accelerated Reflex
  S['14009'] = { resources: [{ gen: 'R', label: '마찰 저항 (소진)', can: (g, u) => !g.c(u).ex, use: (g, u) => { g.c(u).ex = true; } }] }; // Friction Resistance
  S['14010'] = { mod: { thw: (g, self, t) => t === g.idt() && g.isHero() ? 1 : 0 } }; // Hyper Perception
  S['14011'] = { mod: { atk: (g, self, t) => t === g.idt() && g.isHero() ? 1 : 0 } }; // Reinforced Sinew
  S['14024'] = { // Need for Speed
    async whenRevealed(g, u) {
      await g.heroObligation(u, '속도에 대한 갈망', '내 정체성 소진, 다음 턴이 끝날 때까지 준비 불가 → 이 카드 버림', async () => {
        g.c(g.idt()).ex = true; g.p.readyLock = g.s.phase === 'player' ? 2 : 1;
        g.log('다음 턴이 끝날 때까지 정체성을 준비할 수 없습니다', 'warn'); g.discard(u);
      });
    }
  };
  // nemesis
  S['14026'] = { async whenRevealed(g, u) { await g.forEachPlayer(async () => { // Avalanche
    const pick = g.c(g.idt()).ex ? 'dmg' : await g.ask({ type: 'choice', title: `아발란치(${g.playerName()}): 하나를 고르세요`, options: [{ id: 'dmg', label: '간접 피해 2' }, { id: 'ex', label: '내 정체성 소진' }] });
    if (pick === 'ex') { g.c(g.idt()).ex = true; g.log(`${g.nm(g.idt())} 소진`); } else await g.indirectDamage(2, u);
  }); } };
  S['14027'] = { // Vibration Resistance
    attachTo: g => g.e.minions.find(m => g.c(m).id === '14026') || g.e.villain,
    on: { wouldTakeDamage(g, a, ctx) { if (ctx.target === g.c(a).on && ctx.attack) { ctx.prevent++; g.log('진동 저항: 공격 피해 1 감소'); } } },
    actions: [{ timing: 'hero', exhaustHero: true, label: '히어로 소진 → 이 카드 버리기', async use(g, u) { g.discard(u, '진동 저항 버림'); } }]
  };
  S['14028'] = { // Earthquake
    async whenRevealed(g) { const n = Math.min(2, g.p.hand.length); if (n) await g.discardFromHand(n, n, '지진: 버릴 카드 2장'); g.c(g.idt()).ex = true; g.log(`${g.nm(g.idt())} 소진`); },
    async boostEffect(g) {
      const cost = { n: 2, req: 'RR' };
      const pick = g.canAfford(cost, null) ? await g.ask({ type: 'choice', title: '지진 (강화): 하나를 고르세요', options: [{ id: 'pay', label: '[물리][물리] 지불' }, { id: 'ex', label: '내 정체성 소진' }] }) : 'ex';
      if (pick === 'pay' && await g.pay(cost, null, '지진: [물리][물리]', false)) return;
      g.c(g.idt()).ex = true; g.log(`${g.nm(g.idt())} 소진`);
    }
  };

  // ======================= aspect / basic =======================
  S['14012'] = { async onEnter(g, u) { // Multiple Man
    const c = g.p.hand.concat(g.p.deck).filter(x => x !== u && g.c(x).id === '14012');
    if (!c.length) return;
    const fromDeck = g.p.deck.includes(c[0]);
    g.log('멀티플 맨: 복제를 플레이에 내놓습니다', 'good');
    await g.putAllyIntoPlay(c[0]);
    if (fromDeck) g.shuffle(g.p.deck);
  } };
  S['14013'] = { actions: [{ timing: 'action', label: '[정신] 지불 → 워록 피해 최대 2 회복', cost: { n: 1, req: 'B' }, can: (g, u) => g.c(u).dmg > 0, async use(g, u) { g.heal(u, 2); } }] }; // Warlock
  S['14014'] = { interrupt: { window: 'heroDefends', timing: 'hero', async resolve(g, u, hd) { // Never Back Down
    hd.defBonus += 2; g.log('물러서지 않는다: 방어 +2');
    hd.after.push(async (gg, none) => { if (none && gg.c(hd.enemy).zone) gg.giveStatus(hd.enemy, 'stun', '물러서지 않는다'); });
  } } };
  S['14015'] = { interrupt: { window: 'identityWouldTakeDamage', timing: 'hero', can: (g, u, ctx) => ctx.amount - ctx.prevent > 0, async resolve(g, u, ctx, paid) { // Side Step
    ctx.prevent += 3; g.log('비켜서기: 피해 3 방지');
    if (g.paidWith(paid, 'Y') && ctx.src && g.c(ctx.src) && g.c(ctx.src).zone && ['villain', 'minion'].includes(g.d(ctx.src).type)) await g.dealDamage(ctx.src, 1, { src: u, byPlayer: true });
  } } };
  S['14017'] = { resources: [{ gen: 'Y', label: '강철 신경 (소진, 방어 이벤트 전용)', can: (g, u) => !g.c(u).ex, forOnly: (g, u, f) => g.d(f).type === 'event' && (g.d(f).tr || []).includes('DEFENSE'), use: (g, u) => { g.c(u).ex = true; } }] }; // Nerves of Steel
  S['14018'] = { interrupt: { window: 'treacheryRevealed', timing: 'hero', can: (g, u, ctx) => !ctx.cancel, async resolve(g, u, ctx) { // Order and Chaos
    ctx.cancel = true; g.log(`질서와 혼돈: 「${g.nm(ctx.card)}」의 공개될 때 효과 취소`, 'good');
    if (g.e.villain) await g.dealDamage(g.e.villain, 2, { src: u, byPlayer: true });
  } } };
  S['14022'] = { actions: [{ timing: 'hero', label: '버리기 → 이번 단계 공격력 +1', async use(g, u) { g.discard(u); g.addPhaseMod(g.idt(), 'atk', 1); } }] }; // Adrenaline Rush
  S['14023'] = { actions: [{ timing: 'hero', label: '버리기 → 이번 단계 저지력 +1', async use(g, u) { g.discard(u); g.addPhaseMod(g.idt(), 'thw', 1); } }] }; // Civic Duty
  S['14029'] = { // Brute Force
    mod: { atk: (g, self, t) => t === g.idt() && g.isHero() ? 1 : 0 },
    basicAttackPlus: () => ({ piercing: true }),
    on: { basicHeroPower(g, u, ctx) { if (ctx.kind === 'attack' && g.c(u).zone === 'upgrade') g.discard(u, '폭력: 기본 공격 후 버림'); } }
  };
  S['14030'] = { resources: [{ gen: 'B', label: '정의감 (소진, 저지 이벤트 전용)', can: (g, u) => !g.c(u).ex, forOnly: (g, u, f) => g.d(f).type === 'event' && (g.d(f).tr || []).includes('THWART'), use: (g, u) => { g.c(u).ex = true; } }] }; // Sense of Justice
  S['14031'] = { play: { timing: 'hero', can: g => g.hasTrait(g.idt(), 'AVENGER'), async resolve(g) { // United We Stand
    const x = Math.min(3, g.villainStage());
    const c = g.friendlyChars().filter(f => g.c(f).dmg > 0);
    const sel = c.length <= x ? c : await g.ask({ type: 'select', title: `피해 1을 회복할 아군 (최대 ${x})`, cards: c, min: 0, max: x, confirm: '확정' });
    (sel || []).forEach(f => g.heal(f, 1));
  } } };
  S['14032'] = { play: { timing: 'hero', async resolve(g, u) { // Beat 'Em Up
    if (g.e.villain) await g.dealDamage(g.e.villain, 1, { src: u, byPlayer: true });
    for (const m of g.engagedMinions().slice()) await g.dealDamage(m, 1, { src: u, byPlayer: true });
  } } };

  MC.registerScripts(S);
})();
