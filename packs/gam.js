/* Gamora (18001-18032): her hero set, Aggression cards and nemesis set.
   Ported from cards/pack/gam of the community build. Skilled Tactician (up to 6 Attack/Thwart events from other
   aspects) is a deck-building rule handled in deck.js. */
(function () {
  'use strict';
  const S = {};
  const has = (g, u, t) => (g.d(u).tr || []).includes(t);
  const atkOrThw = (g, u) => g.d(u).type === 'event' && (has(g, u, 'ATTACK') || has(g, u, 'THWART'));
  const playedThisTurn = (g, t) => (g.p.phase.evTraits || []).includes(t);
  const firstCardThisRound = g => (g.p.usedOnce.cardsPlayed || 0) <= 1;
  const oncePhase = (g, k) => !g.p.usedOnce[k + ':' + g.s.phase];
  const useOncePhase = (g, k) => { g.p.usedOnce[k + ':' + g.s.phase] = true; };
  const isGamora = g => ['18001a', '18001b'].includes(g.c(g.idt()).id);
  async function dmgEnemy(g, n, title, src, attack) {
    const t = await g.chooseTarget(attack ? 'attackable' : 'enemy', title, src, false); if (!t) return null;
    if (attack) await g.playerAttack(g.idt(), t, n, { src }); else await g.dealDamage(t, n, { src, byPlayer: true });
    return t;
  }
  const backToHand = (g, u) => { if (firstCardThisRound(g) && g.c(u).zone === 'limbo') { g.put(u, 'hand'); g.log(`${g.nm(u)}: 이번 라운드 첫 카드라 손으로 돌아옵니다`, 'good'); } };

  // ======================= identity =======================
  S['18001a'] = { respond: [
    { window: 'eventResolved', label: '기교: 음모에서 위협 1 제거 (단계당 1번)', can: (g, u, ctx) => ctx.tr.includes('ATTACK') && oncePhase(g, 'finesse') && g.targets('thwartable').length > 0,
      async resolve(g, u) { useOncePhase(g, 'finesse'); await g.removeThreatChoose(1, '위협 1을 제거할 음모', u); } },
    { window: 'eventResolved', label: '정확성: 적에게 피해 1 (단계당 1번)', can: (g, u, ctx) => ctx.tr.includes('THWART') && oncePhase(g, 'precision') && g.enemies().length > 0,
      async resolve(g, u) { useOncePhase(g, 'precision'); await dmgEnemy(g, 1, '피해 1을 줄 적', u); } }] };
  S['18001b'] = { actions: [{ timing: 'alter', label: '덱 맨 위를 보고 공격·저지 이벤트면 뽑기 (단계당 1번)', can: g => oncePhase(g, 'tactician') && g.p.deck.length + g.p.discard.length > 0,
    async use(g) {
      useOncePhase(g, 'tactician');
      const top = (await g.lookAtDeckTop(1))[0]; if (!top) return;
      if (atkOrThw(g, top)) { g.put(top, 'hand'); g.log(`능숙한 전술가: ${g.nm(top)}을(를) 뽑음`, 'good'); } else g.log(`능숙한 전술가: 덱 맨 위는 ${g.nm(top)}`);
    } }] };

  // ======================= hero cards =======================
  S['18002'] = { async onEnter(g) { // Nebula (ally)
    const ok = await g.searchToHand(d => d.type === 'event' && ((d.tr || []).includes('ATTACK') || (d.tr || []).includes('THWART')), '네뷸라: 공격·저지 이벤트');
    g.shuffle(g.p.deck); if (!ok) g.log('네뷸라: 찾는 이벤트가 없습니다');
  } };
  S['18003'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { await g.playerAttack(g.idt(), ctx.target, 2, {}); } } }; // Acrobatic Move
  S['18004'] = { interrupt: { window: 'identityWouldTakeDamage', timing: 'hero', can: (g, u, ctx) => ctx.amount - ctx.prevent > 0, async resolve(g, u, ctx) { // Crosscounter
    ctx.prevent += 3; g.log('크로스카운터: 피해 3 방지');
    if (g.enemies().length) await dmgEnemy(g, 1, '크로스카운터: 피해 1을 줄 적', u);
    if (g.targets('thwartable').length) await g.removeThreatChoose(1, '크로스카운터: 위협 1을 제거할 음모', u);
  } } };
  S['18005'] = { play: { timing: 'hero', label: 'thwart', target: 'thwartable', async resolve(g, u, ctx) { await g.removeThreat(ctx.target, 1, { src: u }); await g.afterThreatRemoved(ctx.target); } } }; // Set the Pace
  S['18006'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { await g.playerAttack(g.idt(), ctx.target, playedThisTurn(g, 'THWART') ? 7 : 4, {}); } } }; // Decisive Blow
  S['18007'] = { play: { timing: 'hero', label: 'thwart', target: 'thwartable', async resolve(g, u, ctx) { // Forward Momentum
    const n = playedThisTurn(g, 'ATTACK') ? 5 : 3; const r = await g.removeThreat(ctx.target, n, { src: u }); g.log(`전진의 기세: ${g.nm(ctx.target)} 위협 ${r} 제거`); await g.afterThreatRemoved(ctx.target);
  } } };
  S['18008'] = { actions: [{ timing: 'alter', exhaust: true, label: '소진 → 버림 더미 맨 아래 공격·저지 이벤트를 손으로, 피해 1 회복', can: g => g.p.discard.some(x => atkOrThw(g, x)), // Conditioning Room
    async use(g) { const x = g.p.discard.find(y => atkOrThw(g, y)); if (x) { g.put(x, 'hand'); g.log(`${g.nm(x)}을(를) 손으로`); } if (isGamora(g)) g.heal(g.idt(), 1); } }] };
  S['18009'] = { resources: [{ gen: 'G', label: '예리한 본능 (소진, 공격·저지 이벤트 전용)', can: (g, u) => !g.c(u).ex, forOnly: (g, u, f) => atkOrThw(g, f), use: (g, u) => { g.c(u).ex = true; } }] }; // Keen Instincts
  S['18010'] = { respond: [{ window: 'eventResolved', label: '적에게 피해 1', can: (g, u, ctx) => ctx.tr.includes('ATTACK') && g.enemies().length > 0, async resolve(g, u) { await dmgEnemy(g, 1, '가모라의 검: 피해 1을 줄 적', u); } }] }; // Gamora's Sword
  S['18024'] = { async whenRevealed(g, u) { // Unfulfilled Destiny
    await g.heroObligation(u, '이루지 못한 운명', '손에서 이벤트 2장 버림 → 이 카드 버림', async () => {
      const ev = g.p.hand.filter(x => g.d(x).type === 'event'); const n = Math.min(2, ev.length);
      if (n) { const sel = ev.length <= 2 ? ev : await g.ask({ type: 'select', title: '버릴 이벤트 2장', cards: ev, min: n, max: n, confirm: '확정' }); (sel || []).forEach(x => g.put(x, 'discard')); g.log(`이벤트 ${n}장 버림`); }
      if (g.c(u).zone === 'limbo') g.discard(u);
    });
  } };
  // nemesis
  S['18025'] = { // Sibling Rivalry
    noRemove: g => !isGamora(g),
    on: { villainPhaseBegins(g) { if (isGamora(g)) { const x = g.takeEncounter(); if (x) { g.put(x, 'facedown'); g.log('형제간 경쟁: 가모라에게 조우 카드 1장', 'warn'); } } } }
  };
  S['18026'] = { on: { minionEnters(g, u, ctx) { if (ctx.minion !== u) return; const a = g.p.allies.find(x => g.c(x).id === '18002'); if (a) g.discard(a, '네뷸라(동료)가 버려집니다'); } } }; // Nebula (nemesis)
  S['18027'] = { attachTo: g => isGamora(g) ? g.idt() : null, surgeIfNoHost: false, blankHost: true, // In A Bind
    actions: [{ timing: 'hero', label: '공격 이벤트 1장 버림·피해 1 → 이 카드 버리기', can: g => g.p.hand.some(x => g.d(x).type === 'event' && has(g, x, 'ATTACK')),
      async use(g, u) {
        const c = g.p.hand.filter(x => g.d(x).type === 'event' && has(g, x, 'ATTACK')); const t = c.length === 1 ? c[0] : await g.ask({ type: 'target', title: '버릴 공격 이벤트', cands: c, cancelable: false });
        g.put(t, 'discard'); await g.dealDamage(g.idt(), 1, { src: u }); g.discard(u, '곤경 버림');
      } }] };
  S['18028'] = { whenRevealed(g, u, ctx) { // Waylay
    if (!isGamora(g)) return; const c = g.c(g.idt());
    if (c.stun || c.conf) { g.log('이미 기절·혼란 상태라 쇄도'); ctx.surge++; }
    g.giveStatus(g.idt(), 'stun', '매복: 기절'); g.giveStatus(g.idt(), 'conf', '매복: 혼란');
  } };

  // ======================= Aggression / other aspects / Basic =======================
  S['18011'] = { async onEnter(g, u) { // Angela
    const top = g.e.deck.slice(0, 10); const m = top.find(x => g.d(x).type === 'minion');
    if (m) { g.log(`앤젤라: ${g.nm(m)}이(가) 교전합니다`, 'warn'); await g.enterMinion(m, {}, true); }
    g.shuffle(g.e.deck);
    if (!m) g.discard(u, '앤젤라: 하수인이 없어 버려집니다');
  } };
  S['18012'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { await g.playerAttack(g.idt(), ctx.target, 3, {}); backToHand(g, u); } } }; // Clobber
  S['18013'] = { play: { timing: 'action', async resolve(g) { // Plan of Attack
    const n = g.isHero() ? 4 : 7; const top = await g.lookAtDeckTop(n);
    const c = top.filter(x => g.d(x).type === 'event' && has(g, x, 'ATTACK'));
    if (c.length) { const t = c.length === 1 ? c[0] : await g.ask({ type: 'target', title: '공격 계획: 손으로 가져올 공격 이벤트', cands: c, cancelable: false }); g.put(t, 'hand'); g.log(`${g.nm(t)}을(를) 손으로`); }
    g.shuffle(g.p.deck);
  } } };
  S['18015'] = { // First Hit
    play: { timing: 'hero', label: 'attack', can: g => !!g.e.villain && g.targets('attackable').includes(g.e.villain), async resolve(g) { await g.playerAttack(g.idt(), g.e.villain, 2, {}); } },
    interrupt: { window: 'enemyAttackInitiated', timing: 'hero', can: (g, u, ctx) => g.d(ctx.enemy).type === 'minion', async resolve(g, u, ctx) { if (await g.statusBlocks('attack')) return; await g.playerAttack(g.idt(), ctx.enemy, 2, {}); if (!g.c(ctx.enemy).zone) ctx.cancel = true; } }
  };
  S['18016'] = { play: { timing: 'hero', label: 'thwart', can: g => g.c(g.e.main).threat > 0 && !g.crisis(), async resolve(g, u) { const r = await g.removeThreat(g.e.main, 3, { src: u }); g.log(`저지: 주 음모 위협 ${r} 제거`); backToHand(g, u); } } }; // Impede
  S['18018'] = { respond: [{ window: 'basicPowerUsed', timing: 'hero', exhaust: true, label: '소진 → 이번 공격 +2 (고유 적)', can: (g, u, ctx) => ctx.kind === 'attack' && g.d(ctx.target).unique, async resolve(g, u, ctx) { ctx.bonus += 2; } }] }; // Godslayer
  S['18019'] = { canPlay: g => g.hasTrait(g.idt(), 'GUARDIAN'), attackFilter: (g, u, t) => g.d(t).type !== 'minion' }; // Drax (ally)
  S['18020'] = { play: { timing: 'hero', label: 'attack', async resolve(g, u) { // Hit and Run
    if (g.targets('attackable').length) await dmgEnemy(g, 2, '치고 빠지기: 피해 2를 줄 적', u, true);
    if (g.targets('thwartable').length) await g.removeThreatChoose(2, '치고 빠지기: 위협 2를 제거할 음모', u);
  } } };
  S['18029'] = { play: { timing: 'hero', can: g => !!g.e.villain, async resolve(g, u) { await g.dealDamage(g.e.villain, g.c(g.e.main).threat === 0 ? 5 : 2, { src: u, byPlayer: true }); } } }; // Pivotal Moment
  S['18030'] = { attach: { kind: 'ally', filter: (g, t) => g.hasTrait(t, 'GUARDIAN') && !g.c(t).att.some(a => g.c(a).id === '18030') }, // Comms Implant
    mod: { thw: (g, self, t) => t === g.c(self).on ? 1 : 0, hp: (g, self, t) => t === g.c(self).on ? 1 : 0 } };
  S['18031'] = { interrupt: { window: 'afterHeroDefends', can: g => g.targets('thwartable').length > 0, async resolve(g, u) { // True Grit
    const id = g.idt(); if (g.c(id).conf) { g.c(id).conf = false; g.log('혼란 해제'); return; }
    await g.removeThreatChoose(g.stat(id, 'thw'), '진정한 용기: 위협을 제거할 음모', u);
  } } };

  MC.registerScripts(S);
})();
