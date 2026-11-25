/* Ant-Man (12001-12033): Tiny and Giant hero forms, his Leadership cards and nemesis set.
   Ported from cards/pack/ant of the community build. */
(function () {
  'use strict';
  const S = {};
  const tiny = g => g.inHeroForm('TINY'), giant = g => g.inHeroForm('GIANT');
  const toForm = (ctx, trait) => ctx.form === 'hero' && !!MC.cards[ctx.heroForm || ''] && (MC.cards[ctx.heroForm].tr || []).includes(trait);
  const nowIn = (g, trait) => g.inHeroForm(trait);
  async function dmgEnemy(g, n, title, src, attack) {
    const t = await g.chooseTarget(attack ? 'attackable' : 'enemy', title, src, false); if (!t) return;
    if (attack) await g.playerAttack(g.idt(), t, n, { src }); else await g.dealDamage(t, n, { src, byPlayer: true });
  }
  async function thwartN(g, n, title, src) {
    const id = g.idt();
    if (g.c(id).conf) { g.c(id).conf = false; g.log(`${g.nm(id)}: 혼란 상태라 저지 대신 혼란 해제`); return; }
    await g.removeThreatChoose(n, title, src);
  }
  // overpaying for the cost: pym counters (Ant-Man / Wasp allies), they set the ally's hit points
  const pymAlly = (max, letter) => ({
    mod: { hp: (g, self, t) => t === self ? (g.c(self).cnt.pym || 0) : 0 },
    async onPlay(g, u) {
      const n = Math.min(max, await g.overpay(max, letter, `${g.nm(u)}: 비용을 더 내면 핌 카운터 (최대 ${max})${letter === 'Y' ? ' — 에너지 자원만' : ''}`));
      if (n) { g.c(u).cnt.pym = n; g.log(`${g.nm(u)}: 핌 카운터 ${n}개`); }
      if (g.hpLeft(u) <= 0 || !n) { g.discard(u, `${g.nm(u)}: 체력이 0이라 버려짐`); }
    }
  });

  // ======================= identity =======================
  S['12001a'] = { respond: [{ window: 'afterChangeForm', label: '작은 말썽꾼: 음모에서 위협 1 제거', can: (g, u, ctx) => ctx.form === 'hero' && g.c(g.idt()).id === '12001a' && g.targets('thwartable').length > 0,
    async resolve(g, u) { await g.removeThreatChoose(1, '위협 1을 제거할 음모', u); } }] };
  S['12001b'] = { respond: [{ window: 'afterChangeForm', label: '휴식 시간: 스콧 랭 피해 1 회복', can: (g, u, ctx) => ctx.form === 'alter' && g.c(g.idt()).dmg > 0,
    async resolve(g) { g.heal(g.idt(), 1); } }] };
  S['12001c'] = { respond: [{ window: 'afterChangeForm', label: '거대한 골칫거리: 적에게 피해 1', can: (g, u, ctx) => ctx.form === 'hero' && g.c(g.idt()).id === '12001c' && g.enemies().length > 0,
    async resolve(g, u) { await dmgEnemy(g, 1, '피해 1을 줄 적', u); } }] };

  // ======================= hero cards =======================
  S['12002'] = { // Wasp (ally)
    async onEnter(g, u) {
      if (giant(g) && g.enemies().length) { g.log('와스프: 거대 모습 — 적에게 피해 2'); await dmgEnemy(g, 2, '와스프: 피해 2를 줄 적', u); }
      else if (tiny(g) && g.targets('thwartable').length) { g.log('와스프: 작은 모습 — 위협 2 제거'); await g.removeThreatChoose(2, '와스프: 위협 2를 제거할 음모', u); }
    }
  };
  S['12003'] = { // Giant Stomp
    play: { timing: 'hero', label: 'attack', can: g => giant(g) && g.enemies().length > 0,
      async resolve(g, u) {
        for (const m of g.e.minions.slice()) await g.dealDamage(m, 1, { src: g.idt(), byPlayer: true });
        const t = await g.chooseTarget('attackable', '거대한 발구르기: 피해 8을 줄 적', u, false);
        if (t) await g.playerAttack(g.idt(), t, 8, {});
      } }
  };
  S['12004'] = { // Hive Mind
    play: { timing: 'hero', label: 'thwart', target: 'thwartable', can: g => tiny(g),
      async resolve(g, u, ctx) {
        const n = 2 + g.p.supports.filter(x => g.c(x).id === '12007').length;
        const r = await g.removeThreat(ctx.target, n, { src: u }); g.log(`군체 의식: ${g.nm(ctx.target)} 위협 ${r} 제거`);
        await g.afterThreatRemoved(ctx.target);
      } }
  };
  S['12005'] = { play: { timing: 'hero', can: g => g.heroForms().length > 1 && !g.formLocked(), async resolve(g) { await g.changeHeroForm(); await g.draw(1); } } }; // Resize
  S['12006'] = { async onSpent(g) { // Pym Particles
    if (giant(g) && g.c(g.idt()).dmg > 0) { const h = g.heal(g.idt(), 2); g.log(`핌 입자: 히어로 피해 ${h} 회복`); }
    else if (tiny(g)) { g.log('핌 입자: 카드 1장 뽑기'); await g.draw(1); }
  } };
  S['12007'] = { actions: [{ timing: 'hero', exhaust: true, label: '소진 → 적에게 피해 1 (작은 모습)', can: g => tiny(g) && g.enemies().length > 0,
    async use(g, u) { await dmgEnemy(g, 1, '개미 군단: 피해 1을 줄 적', u); } }] }; // Army of Ants
  S['12008'] = { respond: [ // Ant-Man's Helmet
    { window: 'afterChangeForm', timing: 'hero', label: '거대 모습: 히어로 피해 2 회복', can: (g, u, ctx) => nowIn(g, 'GIANT') && ctx.form === 'hero' && g.c(g.idt()).dmg > 0, async resolve(g) { g.heal(g.idt(), 2); } },
    { window: 'afterChangeForm', timing: 'hero', label: '작은 모습: 카드 1장 뽑기', can: (g, u, ctx) => nowIn(g, 'TINY') && ctx.form === 'hero', async resolve(g) { await g.draw(1); } }] };
  S['12009'] = { respond: [{ window: 'afterChangeForm', timing: 'hero', label: '거대 모습: 이번 턴 공격력 +1', can: (g, u, ctx) => nowIn(g, 'GIANT') && ctx.form === 'hero',
    async resolve(g) { g.addPhaseMod(g.idt(), 'atk', 1); } }] }; // Giant Strength
  S['12010'] = { actions: [ // Wrist Gauntlets
    { timing: 'hero', exhaust: true, label: '소진·[물리][물리] → 적 기절 (거대 모습)', cost: { n: 2, req: 'RR' }, can: g => giant(g) && g.enemies().length > 0,
      async use(g, u) { const t = await g.chooseTarget('enemy', '기절시킬 적', u, false); if (t) g.giveStatus(t, 'stun', '손목 건틀릿'); } },
    { timing: 'hero', exhaust: true, label: '소진·[에너지][에너지] → 적 혼란 (작은 모습)', cost: { n: 2, req: 'YY' }, can: g => tiny(g) && g.enemies().length > 0,
      async use(g, u) { const t = await g.chooseTarget('enemy', '혼란시킬 적', u, false); if (t) g.giveStatus(t, 'conf', '손목 건틀릿'); } }] };
  S['12025'] = { // Care for Cassie
    async whenRevealed(g, u) {
      await g.heroObligation(u, '캐시 돌보기', '손에서 카드를 최대 1장 버리고, 다음 턴이 끝날 때까지 변신 불가 → 이 카드 버림', async () => {
        if (g.p.hand.length) { const sel = await g.ask({ type: 'select', title: '버릴 카드 (0~1장)', cards: g.p.hand.slice(), min: 0, max: 1, confirm: '확정' }); (sel || []).forEach(x => { g.put(x, 'discard'); g.log(`${g.nm(x)} 버림`); }); }
        g.p.formLock = g.s.phase === 'player' ? 2 : 1; g.log('다음 턴이 끝날 때까지 모습을 바꿀 수 없습니다', 'warn');
        g.discard(u);
      });
    }
  };
  // nemesis
  S['12026'] = { blankTrait: 'TECH' }; // Tech Theft
  S['12027'] = { // Yellowjacket
    grantTrait: (g, self, t) => t !== self ? null : giant(g) ? 'GIANT' : tiny(g) ? 'TINY' : null,
    mod: { retaliate: (g, self, t) => t === self && giant(g) ? 1 : 0, atk: (g, self, t) => t === self && tiny(g) ? 1 : 0 }
  };
  const onlyYJ = g => g.e.minions.find(m => g.c(m).id === '12027');
  S['12028'] = { // Size Increase
    attachTo: g => onlyYJ(g) || g.e.villain,
    on: {
      async afterEnemyAttack(g, a, ctx) { if (ctx.enemy === g.c(a).on) { g.c(a).cnt.size = (g.c(a).cnt.size || 1) - 1; g.log(`크기 증가: 크기 카운터 1 제거 (남은 ${g.c(a).cnt.size})`); g.cleanupUses(a); } },
      async afterEnemyScheme(g, a, ctx) { if (ctx.enemy === g.c(a).on) { g.c(a).cnt.size = (g.c(a).cnt.size || 1) - 1; g.log(`크기 증가: 크기 카운터 1 제거 (남은 ${g.c(a).cnt.size})`); g.cleanupUses(a); } }
    }
  };
  S['12029'] = { async whenRevealed(g) { // Yellowjacket's Plan
    const nem = new Set((MC.heroes.ant_man || {}).nemesis || []);
    const u = g.discardEncounterUntil((d, x) => nem.has(g.c(x).id));
    if (u) { g.log(`옐로재킷의 계획: ${g.nm(u)} 공개`); await g.reveal(u); } else g.log('옐로재킷의 계획: 앤트맨 숙적 세트 카드가 없습니다');
  } };

  // ======================= Leadership / Basic / other aspects =======================
  S['12011'] = pymAlly(4, ''); // Ant-Man (ally)
  S['12012'] = { mod: { atk: (g, self, t) => t === self && g.hpLeft(self) >= 3 ? 2 : 0 } }; // Giant-Man
  S['12013'] = { mod: { atk: (g, self, t) => t === self && g.c(self).att.some(a => g.d(a).type === 'upgrade') ? 1 : 0, thw: (g, self, t) => t === self && g.c(self).att.some(a => g.d(a).type === 'upgrade') ? 1 : 0 } }; // Ronin
  S['12014'] = { canPlay: g => g.hasTrait(g.idt(), 'AVENGER'), noAllyLimit: true }; // Stinger
  S['12015'] = { play: { timing: 'hero', async resolve(g) { // Call for Aid
    const out = [];
    while (true) {
      if (!g.p.deck.length) await g.reshuffleDeck();
      const x = g.p.deck[0]; if (!x || out.includes(x)) break;
      if (g.d(x).type === 'ally' && (g.d(x).tr || []).includes('AVENGER')) { g.put(x, 'hand'); g.log(`지원 요청: ${out.length}장 버리고 ${g.nm(x)}을(를) 손으로`, 'good'); return; }
      g.put(x, 'discard'); out.push(x);
    }
    g.log('지원 요청: 어벤저 동료를 찾지 못했습니다');
  } } };
  S['12016'] = { interrupt: { window: 'afterChangeForm', timing: 'hero', can: g => g.isHero(), // Moxie
    async resolve(g) { const id = g.idt(); ['thw', 'atk', 'def'].forEach(k => g.addRoundMod(id, k, 1)); g.log('배짱: 라운드 끝까지 저지·공격·방어 +1', 'good'); } } };
  S['12017'] = { // Power Gloves
    attach: { kind: 'ally', filter: (g, t) => (g.d(t).tr || []).includes('AVENGER') && !g.c(t).att.some(a => g.c(a).id === '12017') },
    respond: [
      { window: 'afterAllyAttack', label: '적에게 피해 1', can: (g, u, ctx) => ctx.ally === g.c(u).on && g.enemies().length > 0, async resolve(g, u) { await dmgEnemy(g, 1, '파워 글러브: 피해 1을 줄 적', u); } },
      { window: 'afterAllyThwart', label: '적에게 피해 1', can: (g, u, ctx) => ctx.ally === g.c(u).on && g.enemies().length > 0, async resolve(g, u) { await dmgEnemy(g, 1, '파워 글러브: 피해 1을 줄 적', u); } }]
  };
  S['12018'] = { attach: { kind: 'ally', filter: (g, t) => !g.c(t).att.some(a => g.c(a).id === '12018') }, mod: { hp: (g, self, t) => t === g.c(self).on ? 2 : 0 } }; // Reinforced Suit
  S['12020'] = { play: { timing: 'hero', can: g => g.heroForms().length > 1 && !g.formLocked(), // Swarm Tactics
    async resolve(g) { await g.changeHeroForm(); const id = g.idt(); if (g.canReady(id)) { g.c(id).ex = false; g.log(`${g.nm(id)} 준비`); } } } };
  const sharesTrait = (g, x) => { const ht = g.d(g.idt()).tr || []; return (g.d(x).tr || []).some(t => ht.includes(t)); };
  S['12024'] = { actions: [{ timing: 'hero', exhaust: true, label: '소진 → 히어로와 특성이 같은 카드 비용 1 낮춰 플레이', // Team-Building Exercise
    can: g => { g.p.costRed = 1; const ok = g.p.hand.some(x => sharesTrait(g, x) && g.canPlay(x)); g.p.costRed = 0; return ok; },
    async use(g, u) {
      g.p.costRed = 1;
      const c = g.p.hand.filter(x => sharesTrait(g, x) && g.canPlay(x));
      if (!c.length) { g.p.costRed = 0; return; }
      const t = c.length === 1 ? c[0] : await g.ask({ type: 'target', title: '팀 빌딩 훈련: 플레이할 카드', cands: c, cancelable: false });
      await g.playCard(t); g.p.costRed = 0;
    } }] };
  S['12030'] = { interrupt: { window: 'afterAttackDefeat', timing: 'hero', can: (g, u, ctx) => ctx.attacker === g.idt() && ctx.excess > 0 && g.c(g.idt()).dmg > 0, // Moment of Triumph
    async resolve(g, u, ctx) { const h = g.heal(g.idt(), ctx.excess); g.log(`승리의 순간: 피해 ${h} 회복`, 'good'); } } };
  S['12031'] = { interrupt: { window: 'afterChangeForm', timing: 'hero', can: g => g.isHero() && g.targets('thwartable').length > 0, // Lay Down the Law
    async resolve(g, u, ctx, paid) { await thwartN(g, g.paidWith(paid, 'B') ? 4 : 3, '법대로: 위협을 제거할 음모', u); } } };
  S['12032'] = { play: { timing: 'hero', can: g => g.hasTrait(g.idt(), 'AVENGER'), async resolve(g) { // Muster Courage
    const x = Math.min(3, g.villainStage());
    const c = g.friendlyChars().filter(f => !g.c(f).tough);
    const sel = c.length <= x ? c : await g.ask({ type: 'select', title: `강인함을 줄 아군 (최대 ${x})`, cards: c, min: 0, max: x, confirm: '확정' });
    (sel || []).forEach(f => g.giveStatus(f, 'tough', '용기 내기'));
  } } };
  S['12033'] = { play: { timing: 'action', async resolve(g) { g.addPhaseMod(g.idt(), 'hs', 1); g.log('상황 판단: 이번 단계 동안 손 크기 +1', 'good'); } } }; // Assess the Situation

  MC.registerScripts(S);
})();
