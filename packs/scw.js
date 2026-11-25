/* Scarlet Witch (15001-15031): her hero set, Justice cards and nemesis set.
   Ported from cards/pack/scw of the community build. Boost icons are counted through the
   'boostCounted' window so Chaos Control and her Crest can change a count. */
(function () {
  'use strict';
  const S = {};
  const oncePhase = (g, key) => !g.p.usedOnce[key + ':' + g.s.phase];
  const useOncePhase = (g, key) => { g.p.usedOnce[key + ':' + g.s.phase] = true; };
  async function dmgEnemy(g, n, title, src, attack) {
    const t = await g.chooseTarget(attack ? 'attackable' : 'enemy', title, src, false); if (!t) return null;
    if (attack) await g.playerAttack(g.idt(), t, n, { src }); else await g.dealDamage(t, n, { src, byPlayer: true });
    return t;
  }
  const encLeft = g => g.e.deck.length + g.e.discard.length > 0;

  // ======================= identity =======================
  S['15001a'] = { respond: [{ window: 'boostCounted', label: '혼돈 제어: 조우 덱 맨 위 카드를 버리고 그 카드의 강화 아이콘으로 대신 세기 (단계당 1번)',
    can: (g, u, ctx) => oncePhase(g, 'chaosControl') && encLeft(g) && !ctx.replaced,
    async resolve(g, u, ctx) {
      useOncePhase(g, 'chaosControl');
      const d = g.discardEncounterN(1); const n = g.boostIcons(d);
      ctx.icons = n; ctx.replaced = true; g.log(`혼돈 제어: 강화 아이콘을 ${n}개로 셉니다`, 'good');
    } }] };
  S['15001b'] = { actions: [{ timing: 'alter', once: true, label: '손에서 2장 버림 → 2장 뽑기', can: g => g.p.hand.length >= 2, // Wanda Maximoff
    async use(g) {
      const sel = await g.ask({ type: 'select', title: '버릴 카드 2장', cards: g.p.hand.slice(), min: 2, max: 2, confirm: '확정' });
      (sel || []).forEach(x => g.put(x, 'discard'));
      const n = g.p.allies.some(a => g.c(a).id === '15002') ? 3 : 2; await g.draw(n); g.log(`초인 남매: ${n}장 뽑기`);
    } }] };

  // ======================= hero cards =======================
  S['15002'] = { actions: [{ timing: 'action', label: '퀵실버 준비 (단계당 1번)', can: (g, u) => g.c(u).ex && oncePhase(g, 'qsAlly:' + u), // Quicksilver (ally)
    async use(g, u) { useOncePhase(g, 'qsAlly:' + u); g.c(u).ex = false; g.log(`${g.nm(u)} 준비`); } }] };
  const freePlay = (g, x) => { const keep = g.p.costRed; g.p.costRed = 99; const ok = g.canPlay(x); g.p.costRed = keep; return ok; };
  S['15003'] = { play: { timing: 'hero', can: (g, u) => g.p.hand.some(x => x !== u && freePlay(g, x)), async resolve(g, u) { // Chaos Magic
    const c = g.p.hand.filter(x => freePlay(g, x)); if (!c.length) return;
    const t = c.length === 1 ? c[0] : await g.ask({ type: 'target', title: '혼돈 마법: 비용 없이 플레이할 카드', cands: c, cancelable: false });
    const printed = g.d(t).cost || 0;
    g.p.costRed = 99; await g.playCard(t); g.p.costRed = 0;
    if (printed) g.discardEncounterN(printed);
  } } };
  S['15004'] = { play: { timing: 'hero', async resolve(g, u) { // Hex Bolt
    const cards = g.discardEncounterN(3);
    for (const x of cards) {
      const n = await g.countBoost([x]);
      if (n === 0) { if (g.enemies().length) await dmgEnemy(g, 2, `저주 화살 (${g.nm(x)}: 0): 피해 2를 줄 적`, u); }
      else if (n === 1) { if (g.targets('thwartable').length) await g.removeThreatChoose(2, `저주 화살 (${g.nm(x)}: 1): 위협 2를 제거할 음모`, u); }
      else if (n === 2) { await g.draw(1); g.log('저주 화살: 카드 1장 뽑기'); }
      else {
        const k = await g.ask({ type: 'choice', title: `저주 화살 (${g.nm(x)}: ${n}): 놓을 상태 카드`, options: [{ id: 'stun', label: '기절' }, { id: 'conf', label: '혼란' }, { id: 'tough', label: '강인함' }] });
        const cands = k === 'tough' ? g.friendlyChars() : g.enemies();
        if (!cands.length) continue;
        const t = cands.length === 1 ? cands[0] : await g.ask({ type: 'target', title: '상태 카드를 놓을 캐릭터', cands, cancelable: false });
        g.giveStatus(t, k, '저주 화살');
      }
    }
  } } };
  S['15005'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { // Molecular Decay
    const n = await g.countBoost(g.discardEncounterN(2));
    g.log(`분자 붕괴: 강화 아이콘 ${n} → 피해 ${5 + n}`);
    await g.playerAttack(g.idt(), ctx.target, 5 + n, {});
  } } };
  S['15006'] = { interrupt: { window: 'cardRevealed', timing: 'hero', can: (g, u, ctx) => !ctx.cancelAll && !ctx.notFromDeck, async resolve(g, u, ctx) { // Warp Reality
    ctx.cancelAll = true;
    const n = await g.countBoost([ctx.card]);
    g.log(`현실 왜곡: 「${g.nm(ctx.card)}」의 효과를 모두 취소하고 버립니다. 조우 덱 위 ${n}장 버림`, 'good');
    if (n) g.discardEncounterN(n);
  } } };
  S['15007'] = { actions: [{ timing: 'alter', exhaust: true, label: '소진 → 덱 위 3장 중 1장을 손으로, 나머지는 덱 맨 아래로', can: g => g.p.deck.length + g.p.discard.length > 0, // Agatha Harkness
    async use(g) {
      const top = await g.lookAtDeckTop(3); if (!top.length) return;
      const pick = top.length === 1 ? top[0] : await g.ask({ type: 'target', title: '애거사 하크니스: 손으로 가져올 카드', cands: top, cancelable: false });
      g.put(pick, 'hand');
      top.filter(x => x !== pick).forEach(x => { g.put(x, 'deck'); }); // put() appends: the bottom of the deck
      g.log(`애거사 하크니스: ${g.nm(pick)}을(를) 손으로`);
    } }] };
  const shield = w => ({ window: w, timing: 'hero', label: '버리기 → 피해 3 방지', can: (g, u, ctx) => ctx.amount - ctx.prevent > 0, async resolve(g, u, ctx) { g.discard(u); ctx.prevent += 3; g.log('마법 방패: 피해 3 방지', 'good'); } });
  S['15008'] = { respond: [shield('identityWouldTakeDamage'), shield('allyWouldTakeDamage')] }; // Magic Shield
  S['15009'] = { respond: [{ window: 'boostCounted', exhaust: true, label: '소진 → 강화 아이콘 수 1 늘리거나 줄이기', // Scarlet Witch's Crest
    async resolve(g, u, ctx) {
      const k = await g.ask({ type: 'choice', title: `스칼렛 위치의 문장: ${g.nm(ctx.card)} 강화 아이콘 ${ctx.icons}개`, options: [{ id: 'dn', label: '1 줄이기' }, { id: 'up', label: '1 늘리기' }] });
      ctx.icons = Math.max(0, ctx.icons + (k === 'up' ? 1 : -1)); g.log(`문장: 강화 아이콘 ${ctx.icons}개로`);
    } }] };
  S['15023'] = { // Slipping Sanity
    async whenRevealed(g, u) {
      await g.heroObligation(u, '흔들리는 정신', '조우 덱 위 5장 버림, 강화 칸의 별 1개마다 주 음모에 위협 1 → 이 카드 버림', async () => {
        const cards = g.discardEncounterN(5); const n = cards.filter(x => g.d(x).boostStar).length;
        if (n && g.e.main) await g.placeThreat(g.e.main, n, {});
        g.log(`흔들리는 정신: 별 ${n}개 → 주 음모 위협 ${n}`);
        if (g.c(u).zone === 'limbo') g.discard(u);
      });
    }
  };
  // nemesis
  S['15024'] = { boostPlus: 1 }; // The Next Evolution
  async function luminousCheck(g, u) {
    const n = await g.countBoost(g.discardEncounterN(1));
    if (n >= 2) { const x = g.takeEncounter(); if (x) { g.put(x, 'facedown'); g.log('루미너스: 조우 카드 1장을 받습니다', 'warn'); } }
  }
  S['15025'] = { on: { // Luminous
    async afterEnemyAttack(g, u, ctx) { if (ctx.enemy === u && g.c(u).zone === 'minion') await luminousCheck(g, u); },
    async afterEnemyScheme(g, u, ctx) { if (ctx.enemy === u && g.c(u).zone === 'minion') await luminousCheck(g, u); }
  } };
  S['15026'] = { // Magical Suspension
    attachTo: g => g.idt(),
    costMod: (g, self) => g.c(self).on === g.idt() ? -1 : 0,
    actions: [{ timing: 'hero', exhaustHero: true, label: '히어로 소진 → 이 카드 버리기', async use(g, u) { g.discard(u, '마법 정지 버림'); } }]
  };
  S['15027'] = { async whenRevealed(g) { // Chaos Manipulation
    let l = g.e.minions.find(m => g.c(m).id === '15025');
    if (!l) { l = g.e.deck.concat(g.e.discard).find(x => g.c(x).id === '15025'); if (l) { g.log('혼돈 조작: 루미너스가 교전합니다', 'warn'); await g.enterMinion(l, {}, true); } }
    g.shuffle(g.e.deck);
    const n = await g.countBoost(g.discardEncounterN(1));
    if (n >= 2 && l && g.c(l).zone === 'minion') { g.log('혼돈 조작: 루미너스가 활성화합니다', 'warn'); await g.activate(l, {}); }
  } };

  // ======================= Justice / other aspects / Basic =======================
  S['15010'] = { respond: [{ window: 'afterAllyThwart', once: true, label: '스피드 준비', can: (g, u, ctx) => ctx.ally === u && g.c(u).ex, async resolve(g, u) { g.c(u).ex = false; g.log('스피드 준비'); } }] }; // Speed
  S['15011'] = { respond: [{ window: 'afterAllyThwart', label: '조우 덱 맨 위를 버리고 강화 아이콘 1개마다 적에게 피해 1', can: (g, u, ctx) => ctx.ally === u && encLeft(g), // Wiccan
    async resolve(g, u) { const n = await g.countBoost(g.discardEncounterN(1)); for (let i = 0; i < n && g.enemies().length; i++) await dmgEnemy(g, 1, `위칸: 피해 1을 줄 적 (${i + 1}/${n})`, u); } }] };
  S['15012'] = { play: { timing: 'hero', label: 'thwart', can: g => !!g.e.main && g.c(g.e.main).threat > 0, async resolve(g, u, ctx) { // Crisis Averted
    const ign = g.paidWith(ctx.paid, 'B');
    const r = await g.removeThreat(g.e.main, 6, { src: u, ignoreCrisis: ign }); g.log(`위기 모면: 주 음모 위협 ${r} 제거${ign ? ' (위기 무시)' : ''}`);
  } } };
  S['15013'] = { play: { timing: 'hero', label: 'thwart', target: 'thwartable', async resolve(g, u, ctx) { // Multitasking
    const r = await g.removeThreat(ctx.target, 2, { src: u }); g.log(`멀티태스킹: ${g.nm(ctx.target)} 위협 ${r} 제거`);
    const first = ctx.target; await g.afterThreatRemoved(first);
    if (g.paidWith(ctx.paid, 'B')) {
      const t = await g.chooseTarget({ kind: 'thwartable', filter: (gg, x) => x !== first }, '멀티태스킹: 다른 음모', u, false);
      if (t) { const r2 = await g.removeThreat(t, 2, { src: u }); g.log(`멀티태스킹: ${g.nm(t)} 위협 ${r2} 제거`); await g.afterThreatRemoved(t); }
    }
  } } };
  S['15014'] = { play: { timing: 'hero', label: 'attack', can: g => !!g.e.villain, async resolve(g, u) { // Swift Retribution
    await g.enemyScheme(g.e.villain, {});
    if (g.e.villain) await g.playerAttack(g.idt(), g.e.villain, 4, {});
  } } };
  S['15015'] = { interrupt: { window: 'afterHeroThwart', can: (g, u, ctx) => ctx.cleared && g.targets('attackable').length > 0, async resolve(g, u) { // Turn the Tide
    if (await g.statusBlocks('attack')) return; await dmgEnemy(g, 3, '전세 역전: 피해 3을 줄 적', u, true);
  } } };
  S['15019'] = { play: { timing: 'action', can: g => g.hasTrait(g.idt(), 'MYSTIC'), async resolve(g) { // Spiritual Meditation
    await g.draw(2); if (g.p.hand.length) await g.discardFromHand(1, 1, '영적 명상: 버릴 카드 1장');
  } } };
  S['15028'] = { play: { timing: 'hero', label: 'attack', can: g => g.hasTrait(g.idt(), 'AVENGER') && !!g.e.villain && g.targets('attackable').includes(g.e.villain), async resolve(g) { // Browbeat
    await g.playerAttack(g.idt(), g.e.villain, 2 + Math.min(3, g.villainStage()), {});
  } } };
  S['15029'] = { interrupt: { window: 'allyPowerUsed', timing: 'hero', can: (g, u, ctx) => ctx.kind === 'attack', async resolve(g, u, ctx) { // Last Stand
    ctx.bonus += 3; g.log(`최후의 저항: ${g.nm(ctx.ally)} 공격 +3`);
    ctx.after.push(async gg => { if (gg.c(ctx.ally).zone === 'ally') gg.discard(ctx.ally, `최후의 저항: ${gg.nm(ctx.ally)} 버림`); });
  } } };
  S['15030'] = { play: { timing: 'hero', label: 'thwart', async resolve(g, u) { // Bait and Switch
    if (g.e.villain) await g.enemyAttack(g.e.villain, {});
    if (g.e.main && g.c(g.idt()).zone) { const r = await g.removeThreat(g.e.main, 4, { src: u }); g.log(`미끼와 바꿔치기: 주 음모 위협 ${r} 제거`); }
  } } };
  S['15031'] = { play: { timing: 'alter', can: g => g.c(g.idt()).dmg > 0, async resolve(g) { const h = g.heal(g.idt(), g.stat(g.idt(), 'rec')); g.log(`회복: 피해 ${h} 회복`, 'good'); } } }; // Recuperation

  MC.registerScripts(S);
})();
