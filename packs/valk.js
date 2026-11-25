/* Valkyrie (25001-25036): Death-Glow, her hero set, Aggression cards and nemesis set.
   Ported from cards/pack/valk of the community build. */
(function () {
  'use strict';
  const S = {};
  const has = (g, u, t) => (g.d(u).tr || []).includes(t);
  const glow = g => Object.keys(g.s.cards).find(u => g.c(u).id === '25002' && g.c(u).zone === 'attach') || null;
  const marked = g => { const d = glow(g); return d ? g.c(d).on : null; }; // the enemy with Death-Glow attached
  const isValk = g => ['25001a', '25001b'].includes(g.c(g.idt()).id);
  async function dmgEnemy(g, n, title, src, attack, props) {
    const t = await g.chooseTarget(attack ? 'attackable' : 'enemy', title, g.idt(), false); if (!t) return null;
    if (attack) await g.playerAttack(g.idt(), t, n, Object.assign({ src }, props || {})); else await g.dealDamage(t, n, { src, byPlayer: true });
    return t;
  }
  const training = cls => ({ actions: [{ timing: 'alter', exhaust: true, label: `소진·훈련 1 → 버림 더미의 ${({ Protection: '수호', Justice: '정의', Leadership: '통솔', Aggression: '용맹' })[cls]} 이벤트를 덱에 섞기`, can: (g, u) => (g.c(u).cnt.training || 0) > 0 && g.p.discard.some(x => g.d(x).type === 'event' && g.d(x).cls === cls),
    async use(g, u) { g.c(u).cnt.training--; const c = g.p.discard.filter(x => g.d(x).type === 'event' && g.d(x).cls === cls); const t = c.length === 1 ? c[0] : await g.ask({ type: 'target', title: '덱에 섞을 이벤트', cands: c, cancelable: false }); g.put(t, 'deck'); g.shuffle(g.p.deck); g.cleanupUses(u); } }] });
  const pairOk = g => { const av = g.friendlyChars().filter(f => !g.c(f).ex && g.hasTrait(f, 'AVENGER')), gu = g.friendlyChars().filter(f => !g.c(f).ex && g.hasTrait(f, 'GUARDIAN')); return av.length > 0 && gu.length > 0 && (av.length + gu.length > 1 || av[0] !== gu[0]); };
  async function exhaustPair(g, title, keepReady) {
    const av = g.friendlyChars().filter(f => (keepReady || !g.c(f).ex) && g.hasTrait(f, 'AVENGER')), gu = g.friendlyChars().filter(f => (keepReady || !g.c(f).ex) && g.hasTrait(f, 'GUARDIAN'));
    if (!av.length || !gu.length) return null;
    const a = av.length === 1 ? av[0] : await g.ask({ type: 'target', title: `${title}: 어벤저 캐릭터`, cands: av, cancelable: false });
    const gc = gu.filter(x => x !== a); if (!gc.length) return null;
    const b = gc.length === 1 ? gc[0] : await g.ask({ type: 'target', title: `${title}: 가디언 캐릭터`, cands: gc, cancelable: false });
    if (!keepReady) { g.c(a).ex = true; g.c(b).ex = true; } return [a, b];
  }

  // ======================= identity =======================
  const clearMark = { afterAttack(g) { g.e.lastGlowDefeated = null; } };
  S['25001a'] = { on: clearMark };
  S['25001b'] = { on: clearMark, actions: [{ timing: 'alter', label: '"오늘은 아니야": 죽음의 빛을 떼어 따로 두기', can: g => !!glow(g), async use(g) { const d = glow(g); g.put(d, 'pset'); g.log('죽음의 빛을 따로 둡니다'); } }] };
  S['25002'] = { // Death-Glow: played from the set-aside area (Death Perception), never discarded
    attach: { kind: 'enemy' }, discardTo: 'pset',
    playFromSetAside: g => g.isHero() && isValk(g),
    on: { attachedDefeated: glowDefeated, attachedVillainDefeated: glowDefeated }
  };
  async function glowDefeated(g, a, ctx) {
    const host = g.c(a).on; g.put(a, 'pset'); g.log('죽음의 빛: 따로 둡니다');
    const byValk = ctx && ctx.byPlayer && ctx.src && g.c(ctx.src) && g.d(ctx.src).type !== 'ally' && isValk(g);
    if (byValk && g.canReady(g.idt()) && g.c(g.idt()).ex) { g.c(g.idt()).ex = false; g.log(`${g.nm(g.idt())} 준비`, 'good'); }
    g.e.lastGlowDefeated = host;
    await g.window('glowEnemyDefeated', { enemy: host });
  }
  S['25003'] = { actions: [{ timing: 'alter', exhaust: true, label: '소진 → 덱 위 5장에서 발키리 카드 1장 손으로', async use(g) { // Annabelle Riggs
    const top = await g.lookAtDeckTop(5); const c = top.filter(x => g.d(x).cls === 'Hero');
    if (c.length) { const t = c.length === 1 ? c[0] : await g.ask({ type: 'target', title: '손으로 가져올 발키리 카드', cands: c, cancelable: false }); g.put(t, 'hand'); }
    g.shuffle(g.p.deck);
  } }] };
  S['25004'] = { respond: [{ window: 'afterAttackDefeat', exhaust: true, label: '소진 → 카드 1장 뽑고 발키리 피해 1 회복', can: (g, u, ctx) => ctx.attacker === g.idt() && ctx.target === g.e.lastGlowDefeated, async resolve(g) { await g.draw(1); g.heal(g.idt(), 1); } }] }; // Valhalla
  S['25005'] = { mod: { def: (g, s, t) => t === g.idt() && g.isHero() ? 1 : 0 }, defVs: (g, s, me, enemy) => me === g.idt() && enemy === marked(g) ? 1 : 0 }; // Valkyrie's Spear
  S['25006'] = { mod: { atk: (g, s, t) => t === g.idt() && g.isHero() ? 1 : 0 }, atkVs: (g, s, me, enemy) => me === g.idt() && enemy === marked(g) ? 1 : 0 }; // Dragonfang
  S['25007'] = { mod: { hp: (g, s, t) => t === g.idt() ? 4 : 0 }, grantTrait: (g, s, t) => t === g.idt() && g.isHero() ? 'AERIAL' : null }; // Aragorn
  S['25008'] = { respond: [{ window: 'glowEnemyDefeated', label: '버리기 → 음모에서 위협 5 제거', can: g => g.schemes().some(x => g.c(x).threat > 0), async resolve(g, u) { g.discard(u); const c = g.schemes().filter(x => g.c(x).threat > 0); const t = c.length === 1 ? c[0] : await g.ask({ type: 'target', title: '발키리오르의 비행: 위협 5를 제거할 음모', cands: c, cancelable: false }); await g.removeThreat(t, 5, { src: u }); await g.afterThreatRemoved(t); } }] }; // Flight of the Valkyrior
  S['25009'] = { play: { timing: 'alter', can: g => g.p.discard.some(x => g.d(x).cls === 'Hero'), async resolve(g) { const c = g.p.discard.filter(x => g.d(x).cls === 'Hero'); const t = c.length === 1 ? c[0] : await g.ask({ type: 'target', title: '손으로 가져올 발키리 카드', cands: c, cancelable: false }); g.put(t, 'hand'); } } }; // Visit Valhalla
  S['25010'] = { play: { timing: 'hero', async resolve(g) { // Chooser of the Slain
    const c = g.e.deck.concat(g.e.discard).filter(x => g.d(x).type === 'minion'); if (!c.length) { g.log('하수인이 없습니다'); return; }
    const t = await g.ask({ type: 'target', title: '전사자를 고르는 자: 교전할 하수인', cands: c, cancelable: false }); g.shuffle(g.e.deck);
    await g.enterMinion(t, {}, true); await g.draw(2);
  } } };
  S['25011'] = { interrupt: { window: 'enemyAttackInitiated', timing: 'hero', label: '발키리가 소진 없이 방어 (방어 +2)', can: (g, u, ctx) => ctx.enemy === marked(g) && !g.heroNo('defend') && !ctx.freeHeroDefense, async resolve(g, u, ctx) { ctx.freeHeroDefense = true; ctx.defBonus = (ctx.defBonus || 0) + 2; g.log('방패 처녀: 소진하지 않고 방어, 방어 +2', 'good'); } } }; // Shieldmaiden
  S['25012'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { await g.playerAttack(g.idt(), ctx.target, 7, { overkill: ctx.target === marked(g) }); } } }; // Have at Thee!
  S['25028'] = { // Trouble in Otherworld
    async whenRevealed(g, u) { g.put(u, 'pobl'); g.log('저세상의 문제: 내 플레이 영역에 남습니다', 'warn'); },
    cannotAttack: (g, self, enemy, src) => g.c(self).zone === 'pobl' && enemy === marked(g) && !(src && g.c(src) && g.d(src).type === 'ally'),
    actions: [{ timing: 'alter', label: '[에너지][정신] → 이 카드를 게임에서 제거', cost: { n: 2, req: 'YB' }, can: (g, u) => g.c(u).zone === 'pobl', async use(g, u) { g.removeFromGame(u); } }]
  };
  S['25029'] = { async whenRevealed(g) { const x = g.e.deck.concat(g.e.discard, g.e.setaside).find(u => ['25032', '21179'].includes(g.c(u).id)); g.shuffle(g.e.deck); if (x) { g.attachEnc(x, g.idt()); g.log('인챈트리스: 매혹됨을 내 정체성에 부착', 'warn'); } } }; // Enchantress (nemesis)
  S['25030'] = { lockFriendlyAttachments: true }; // Powerful Enchantments

  // ======================= Aggression / other aspects / Basic =======================
  S['25013'] = { respond: [{ window: 'allyPowerUsed', label: '[에너지] → 교전 중인 하수인 모두에게 이 공격', cost: { n: 1, req: 'Y' }, can: (g, u, ctx) => ctx.ally === u && ctx.kind === 'attack' && g.d(ctx.target).type === 'minion' && g.engagedMinions(g.c(ctx.target).eng ?? 0).length > 1, // Thor (ally)
    async resolve(g, u, ctx) { const t0 = ctx.target, eng = g.c(t0).eng ?? 0; ctx.after.push(async gg => { for (const m of gg.engagedMinions(eng).slice()) if (m !== t0 && gg.c(m).zone === 'minion') await gg.playerAttack(u, m, gg.stat(u, 'atk') + (ctx.bonus || 0), {}); }); } }] };
  S['25014'] = { onEnter(g, u) { if (g.e.minions.length) g.giveStatus(u, 'tough', '스로그'); } }; // Throg
  S['25018'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { await g.playerAttack(g.idt(), ctx.target, g.stat(g.idt(), 'atk'), {}); } } }; // Quick Strike
  S['25019'] = { play: { timing: 'hero', label: 'thwart', target: 'thwartable', can: g => !g.c(g.idt()).ex, async resolve(g, u, ctx) { // Smash the Problem
    g.c(g.idt()).ex = true; const r = await g.removeThreat(ctx.target, g.stat(g.idt(), 'atk'), { src: u }); g.log(`문제 박살: 위협 ${r} 제거`); await g.afterThreatRemoved(ctx.target);
  } } };
  S['25020'] = { interrupt: { window: 'heroDefends', timing: 'hero', async resolve(g, u, hd) { const id = g.idt(); hd.defBonus += g.stat(id, 'atk') - g.stat(id, 'def'); g.log('최선의 방어는…: 방어 대신 공격력 사용'); } } }; // The Best Defense...
  S['25023'] = { canPlay: g => g.hasTrait(g.idt(), 'ASGARD'), actions: [{ timing: 'action', exhaust: true, label: '소진 → 덱에서 아스가르드 동료를 찾아 플레이', async use(g) { // The Bifrost
    const c = g.p.deck.filter(x => g.d(x).type === 'ally' && (g.d(x).tr || []).includes('ASGARD') && g.canAfford(g.cardCost(x), x));
    if (!c.length) { g.log('플레이할 아스가르드 동료가 없습니다'); g.shuffle(g.p.deck); return; }
    const t = (await g.pickCards(c, '비프로스트: 플레이할 아스가르드 동료', 1, 1, '선택'))[0]; g.shuffle(g.p.deck); if (t) { g.put(t, 'hand'); await g.playCard(t); }
  } }] };
  S['25024'] = { play: { timing: 'action', can: g => g.hasTrait(g.idt(), 'ASGARD'), async resolve(g) { // Godlike Stamina
    g.heal(g.idt(), 2); const c = g.c(g.idt());
    if (c.stun || c.conf || c.tough) { const opts = []; if (c.stun) opts.push({ id: 'stun', label: '기절 버리기' }); if (c.conf) opts.push({ id: 'conf', label: '혼란 버리기' }); opts.push({ id: 'no', label: '그대로 둔다' }); const k = await g.ask({ type: 'choice', title: '신과 같은 체력', options: opts }); if (k !== 'no') c[k] = false; }
  } } };
  S['25033'] = { play: { timing: 'hero', label: 'thwart', can: pairOk, async resolve(g, u) { // Problem Solvers
    const p = await exhaustPair(g, '문제 해결사'); if (!p) return; const n = p.reduce((t, x) => t + g.stat(x, 'thw'), 0);
    for (const s of g.schemes().slice()) if (g.c(s).threat > 0) { await g.removeThreat(s, n, { src: u }); await g.afterThreatRemoved(s); }
  } } };
  S['25034'] = training('Leadership'); // Leadership Training
  S['25035'] = { respond: [{ window: 'minionEntered', timing: 'hero', label: '버리기 → 히어로 준비', can: g => g.c(g.idt()).ex, async resolve(g, u) { g.discard(u); if (g.canReady(g.idt())) g.c(g.idt()).ex = false; } }] }; // Anticipation
  S['25036'] = { play: { timing: 'hero', can: g => g.friendlyChars().some(f => g.hasTrait(f, 'AVENGER')) && g.friendlyChars().some(f => g.hasTrait(f, 'GUARDIAN')), async resolve(g) { // Cosmic Alliance
    const p = await exhaustPair(g, '우주 동맹', true); if (!p) return; p.forEach(x => { if (g.canReady(x)) g.c(x).ex = false; }); g.log('우주 동맹: 두 캐릭터 준비', 'good');
  } } };

  MC.registerScripts(S);
})();
