/* Doctor Strange hero pack (09001-09039), ported from cards/pack/drs of the community build.
   The Invocation deck lives in p.inv (top first) with its own discard pile p.invDiscard. */
(function () {
  'use strict';
  const S = {};
  // ---------- Invocation deck
  function invTop(g) {
    g.p.inv = g.p.inv || []; g.p.invDiscard = g.p.invDiscard || [];
    if (!g.p.inv.length && g.p.invDiscard.length) { g.p.invDiscard.slice().forEach(u => g.put(u, 'inv')); g.shuffle(g.p.inv); g.log('인보케이션 덱이 비어 버림 더미를 섞었습니다'); }
    return g.p.inv[0] || null;
  }
  function invDiscard(g) { const t = invTop(g); if (t) { g.put(t, 'invdis'); g.log(`인보케이션 덱 맨 위 「${g.nm(t)}」 버림`); } return t; }
  const topCost = g => { const t = invTop(g); return t ? { n: g.d(t).cost || 0, req: '' } : null; };
  const canCast = g => { const c = topCost(g); return !!c && g.canAfford(c, null); };
  async function castTop(g, keepOnTop) {
    const t = invTop(g); if (!t) return false;
    const paid = await g.pay({ n: g.d(t).cost || 0, req: '' }, t, `「${g.nm(t)}」 비용 ${g.d(t).cost || 0}`, true);
    if (paid == null) return false;
    g.log(`특수 능력: 「${g.nm(t)}」`, 'play');
    await g.show({ type: 'reveal', uid: t, title: '인보케이션' });
    const f = (MC.scripts[g.c(t).id] || {}).special; if (f) await f(g, t);
    if (!keepOnTop && g.c(t).zone === 'inv') g.put(t, 'invdis');
    return true;
  }

  // ======================= Doctor Strange =======================
  S['09001a'] = { // Spell Mastery
    actions: [{ timing: 'action', exhaustHero: true, label: '닥터 스트레인지 소진·비용 지불 → 인보케이션 맨 위 카드의 특수 능력', can: g => canCast(g),
      async use(g) { await castTop(g, false); } }]
  };
  S['09001b'] = { // Stephen Strange
    async setup(g) { const c = (g.p.pset || []).filter(u => g.hasTrait(u, 'INVOCATION')); c.forEach(u => g.put(u, 'inv')); g.shuffle(g.p.inv); g.log(`인보케이션 덱 ${c.length}장을 섞어 둡니다`); },
    actions: [{ timing: 'action', once: true, label: '인보케이션 덱 맨 위 카드 버리기', can: g => !!invTop(g), use(g) { invDiscard(g); } }]
  };
  S['09002'] = { // Wong
    actions: [{ timing: 'action', exhaust: true, label: '소진 → 피해 1 회복 또는 인보케이션 맨 위 버리기',
      async use(g) {
        const opts = [];
        if (g.c(g.idt()).dmg > 0) opts.push({ id: 'heal', label: '내 아이덴티티 피해 1 회복' });
        if (invTop(g)) opts.push({ id: 'inv', label: '인보케이션 덱 맨 위 카드 버리기' });
        if (!opts.length) return;
        const pick = opts.length === 1 ? opts[0].id : await g.ask({ type: 'choice', title: '웡: 하나를 고르세요', options: opts });
        if (pick === 'heal') { g.heal(g.idt(), 1); g.log('웡: 피해 1 회복', 'good'); } else invDiscard(g);
      } }]
  };
  S['09003'] = { // Astral Projection
    play: { timing: 'hero', label: 'thwart', target: 'thwartable',
      async resolve(g, u, ctx) {
        const top = g.e.deck[0], extra = top ? (g.d(top).boost || 0) : 0;
        if (top) g.log(`조우 덱 맨 위: ${g.nm(top)} (강화 ${extra})`);
        const r = await g.removeThreat(ctx.target, 3 + extra, { src: u }); g.log(`유체 이탈: ${g.nm(ctx.target)} 위협 ${r} 제거`); await g.afterThreatRemoved(ctx.target);
      } }
  };
  S['09004'] = { // Magic Blast
    play: { timing: 'hero', label: 'attack', target: 'attackable',
      async resolve(g, u, ctx) {
        const t = ctx.target;
        await g.playerAttack(g.idt(), t, 5, {});
        const top = (await g.discardDeckTop(1))[0]; if (!top || !g.c(t).zone) return;
        const r = g.d(top).res || '', w = r.includes('G');
        if (w || r.includes('R')) g.giveStatus(t, 'stun', '기절');
        if (w || r.includes('B')) g.giveStatus(t, 'conf', '혼란');
        if (w || r.includes('Y')) await g.dealDamage(t, 2, { src: u, byPlayer: true });
      } }
  };
  S['09005'] = { play: { timing: 'hero', can: g => !!invTop(g), async resolve(g) { if (canCast(g)) await castTop(g, true); else g.log('인보케이션 비용을 낼 수 없습니다'); } } }; // Master of the Mystic Arts
  S['09006'] = { play: { timing: 'alter', async resolve(g, u) { await g.searchToHand((d, x) => x !== u && d.cls === 'Hero', '신비학 연구', { discard: true }); } } }; // Mystical Studies
  S['09007'] = { interrupt: { window: 'treacheryRevealed', timing: 'hero', can: (g, u, ctx) => !ctx.cancel, resolve(g, u, ctx) { ctx.cancel = true; g.log(`보호 결계: 「${g.nm(ctx.card)}」 효과 취소`, 'good'); } } }; // Protective Ward
  S['09008'] = { // Sanctum Sanctorum
    actions: [{ timing: 'alter', exhaust: true, label: '소진 → 버림 더미의 주문 카드를 덱에 섞고 1장 뽑기', can: g => g.p.discard.some(x => g.hasTrait(x, 'SPELL')),
      async use(g) { const x = (await g.pickCards(g.p.discard.filter(y => g.hasTrait(y, 'SPELL')), '덱에 섞을 주문 카드', 1, 1))[0]; if (x) g.put(x, 'deck'); g.shuffle(g.p.deck); await g.draw(1); } }]
  };
  S['09009'] = { // Cloak of Levitation
    grantTrait: (g, self, t) => (t === g.idt() && g.c(self).zone === 'upgrade') ? 'AERIAL' : null,
    actions: [{ timing: 'hero', exhaust: true, label: '소진 → 닥터 스트레인지 준비', can: g => g.c(g.idt()).ex && g.canReady(g.idt()), use(g) { g.c(g.idt()).ex = false; g.log('부양 망토: 준비', 'good'); } }]
  };
  const heroPlus = (g, self, t) => (t === g.idt() && g.c(self).zone && g.isHero()) ? 1 : 0;
  S['09010'] = { mod: { thw: heroPlus, atk: heroPlus, def: heroPlus }, on: { roundEnd(g, u) { if (g.c(u).zone) g.discard(u, '마법 강화: 라운드가 끝나 버려짐'); } } }; // Magical Enhancements
  S['09011'] = { resources: [{ gen: 'G', label: '아가모토의 눈 (소진)', can: (g, u) => g.isHero() && !g.c(u).ex, use: (g, u) => { g.c(u).ex = true; } }] }; // Eye of Agamotto
  S['09027'] = { // Physical Toll
    async whenRevealed(g, u) {
      await g.heroObligation(u, '육체적 대가', '다음에 플레이하는 이벤트 비용 +3 (그 후 이 카드 버림)', async () => { g.put(u, 'under', g.idt()); g.p.toll = u; g.log('육체적 대가: 다음 이벤트 비용 +3', 'warn'); });
    }
  };
  S['09028'] = { // Baron Mordo
    on: { async enemyAttacks(g, u, ctx) {
      if (ctx.enemy !== u) return;
      const top = (await g.discardDeckTop(1))[0]; if (!top) return;
      const r = g.d(top).res || '', w = r.includes('G');
      if (w || r.includes('R')) g.giveStatus(g.idt(), 'stun', '기절');
      if (w || r.includes('B')) g.giveStatus(g.idt(), 'conf', '혼란');
      if (w || r.includes('Y')) await g.dealDamage(g.idt(), 2, { src: u });
    } }
  };
  S['09029'] = { // Open the Dark Dimension
    whenRevealed(g, u) { const t = invTop(g); if (t) { g.put(t, 'under', u); g.log(`어둠의 차원: 「${g.nm(t)}」을(를) 이 음모 아래에`, 'warn'); } },
    whenDefeated(g, u) { for (const x of g.c(u).under.slice()) if (g.hasTrait(x, 'INVOCATION')) { g.put(x, 'inv'); g.shuffle(g.p.inv); g.log(`「${g.nm(x)}」을(를) 인보케이션 덱에 섞어 넣음`, 'good'); } }
  };
  S['09030'] = { attachTo: g => g.idt(), cancelsEvent: true }; // Counterspell
  S['09031'] = { // Thoughtcasting
    async whenRevealed(g, u) {
      if (!g.p.hand.length) return;
      const hi = Math.max(...g.p.hand.map(x => g.d(x).cost || 0));
      const c = g.p.hand.filter(x => (g.d(x).cost || 0) === hi);
      const x = c.length === 1 ? c[0] : (await g.pickCards(c, '생각 투사: 버릴 카드 (가장 비싼 카드)', 1, 1))[0];
      g.put(x, 'discard'); g.log(`생각 투사: ${g.nm(x)} 버림 (비용 ${hi})`);
      if (!hi) return;
      if (g.isHero()) await g.dealDamage(g.idt(), hi, { src: u }); else await g.placeThreat(g.e.main, hi, {});
    }
  };
  // ---------- Invocation specials
  S['09032'] = { async special(g, u) { const t = await g.chooseTarget('enemy', '사이토락의 진홍 띠: 기절 + 피해 7', u, false); if (t) { g.giveStatus(t, 'stun', '기절'); await g.dealDamage(t, 7, { src: u, byPlayer: true }); } } };
  S['09033'] = { async special(g, u) { if (g.e.villain) g.giveStatus(g.e.villain, 'conf', '혼란'); if (g.targets('thwartable').length) await g.removeThreatChoose(4, '이콘의 환영: 위협 4를 제거할 음모', u); } };
  S['09034'] = { async special(g) { const c = g.allFriendlyChars().filter(x => !g.c(x).tough); const sel = await g.pickCards(c, '라가도르의 일곱 고리: 강인함을 줄 캐릭터 (최대 3)', 0, 3); sel.forEach(x => g.giveStatus(x, 'tough', '강인함 획득')); } };
  S['09035'] = { // Vapors of Valtorr
    async special(g) {
      const NAMES = { stun: '기절', conf: '혼란', tough: '강인함' }, opts = [];
      for (const x of g.allFriendlyChars().concat(g.enemies())) for (const k of ['stun', 'conf', 'tough']) if (g.c(x)[k]) for (const n of ['stun', 'conf', 'tough']) if (n !== k && !g.c(x)[n]) opts.push({ id: `${x}|${k}|${n}`, label: `${g.nm(x)}: ${NAMES[k]} → ${NAMES[n]}` });
      if (!opts.length) { g.log('발토르의 증기: 바꿀 상태 카드가 없습니다'); return; }
      const [x, k, n] = (await g.ask({ type: 'choice', title: '발토르의 증기: 바꿀 상태 카드', options: opts })).split('|');
      g.c(x)[k] = false; g.c(x)[n] = true; g.log(`${g.nm(x)}: ${NAMES[k]} → ${NAMES[n]}`, 'good');
    }
  };
  S['09036'] = { async special(g) { await g.draw(3); g.log('와툼의 바람: 카드 3장 뽑음', 'good'); } };

  // ======================= aspect / basic =======================
  S['09012'] = { // Brother Voodoo
    async onEnter(g) {
      const top = g.p.deck.slice(0, 5), ev = top.filter(x => g.d(x).type === 'event');
      if (ev.length) { const x = (await g.pickCards(ev, '브라더 부두: 손으로 가져올 이벤트', 1, 1))[0]; g.put(x, 'hand'); g.log(`브라더 부두: ${g.nm(x)}을(를) 손으로`, 'good'); }
      g.shuffle(g.p.deck);
    }
  };
  S['09013'] = { wouldBeDefeated(g, u, w) { w.saved = true; g.resetCard(u); g.put(u, 'deck'); g.shuffle(g.p.deck); g.log('클리어: 덱에 섞여 들어갑니다'); } }; // Clea
  S['09014'] = { // Iron Fist
    onEnter(g, u) { g.c(u).cnt.mystic = 2; },
    on: { async afterAttack(g, u, ctx) { if (ctx.attacker !== u || !(g.c(u).cnt.mystic > 0) || !g.c(ctx.target).zone) return; g.c(u).cnt.mystic--; g.giveStatus(ctx.target, 'stun', '기절 (철권)'); await g.dealDamage(ctx.target, 1, { src: u, byPlayer: true }); } }
  };
  S['09015'] = { // Desperate Defense
    interrupt: { window: 'heroDefends', timing: 'hero',
      resolve(g, u, ctx) { ctx.defBonus += 2; ctx.after.push((gg, none) => { if (none && gg.canReady(gg.idt())) { gg.c(gg.idt()).ex = false; gg.log('필사의 방어: 피해가 없어 히어로 준비', 'good'); } }); } }
  };
  S['09016'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { g.heal(g.idt(), 2); await g.playerAttack(g.idt(), ctx.target, 2, {}); } } }; // Momentum Shift
  S['09019'] = { // The Night Nurse
    actions: [{ timing: 'action', exhaust: true, label: '소진·의료 카운터 1 → 히어로 피해 1 회복, 상태 카드 1장 제거', can: (g, u) => (g.c(u).cnt.medical || 0) > 0 && g.livingPlayers().some(i => g.s.ps[i].form === 'hero'),
      async use(g, u) {
        const heroes = g.livingPlayers().filter(i => g.s.ps[i].form === 'hero').map(i => g.idt(i));
        if (!heroes.length) return;
        const id = heroes.length === 1 ? heroes[0] : await g.ask({ type: 'target', title: '나이트 너스: 치료할 히어로', cands: heroes, cancelable: false });
        if (!id) return;
        g.c(u).cnt.medical--; g.heal(id, 1);
        const st = ['stun', 'conf'].filter(k => g.c(id)[k]);
        if (st.length) { const k = st.length === 1 ? st[0] : await g.ask({ type: 'choice', title: '나이트 너스: 없앨 상태', options: st.map(x => ({ id: x, label: x === 'stun' ? '기절' : '혼란' })) }); g.c(id)[k] = false; }
        g.log('나이트 너스: 피해 1 회복', 'good');
      } }]
  };
  S['09020'] = { respond: [{ window: 'afterHeroDefends', exhaust: true, label: '소진 → 카드 1장 뽑기', can: (g, u, ctx) => ctx.noDamage, async resolve(g) { await g.draw(1); } }] }; // Unflappable
  S['09021'] = { interrupt: { window: 'identityWouldTakeDamage', can: (g, u, ctx) => (g.identityPlayer(ctx.target) >= 0 ? g.isHero(g.identityPlayer(ctx.target)) : g.isHero()) && ctx.amount > ctx.prevent, resolve(g, u, ctx) { ctx.prevent += 1; g.log('경고: 피해 1 감소', 'good'); } } }; // Warning
  S['09026'] = { canPlay: g => g.hasTrait(g.idt(), 'MYSTIC'), mod: { hs: (g, self, t) => (t === g.idt() && g.c(self).zone && g.isHero()) ? 1 : 0 } }; // The Sorcerer Supreme
  S['09037'] = { interrupt: { window: 'basicPowerUsed', can: (g, u, ctx) => ctx.kind === 'attack', resolve(g, u, ctx) { ctx.bonus += 2; g.log('숙련된 일격: 이번 공격 +2', 'good'); } } }; // Skilled Strike
  S['09038'] = { interrupt: { window: 'boostTurned', can: (g, u, ctx) => !ctx.attack && !ctx.cancelIcons && ctx.icons > 0, resolve(g, u, ctx) { ctx.cancelIcons = true; g.log(`좌절!: 강화 아이콘 ${ctx.icons}개 취소`, 'good'); } } }; // Foiled!
  S['09039'] = { costMod: (g, self, uid) => (g.d(uid).type === 'upgrade' && g.playTarget === self) ? 1 : 0 }; // Iron Man (ally)

  MC.registerScripts(S);
})();
