/* Nova (28001-28032): his hero set, Aggression cards, nemesis set and the Armadillo modular set.
   Ported from cards/pack/nova of the community build. */
(function () {
  'use strict';
  const S = {};
  const has = (g, u, t) => (g.d(u).tr || []).includes(t);
  const isNova = g => ['28001a', '28001b'].includes(g.c(g.idt()).id);
  const helmet = g => g.p.upgrades.find(u => g.c(u).id === '28009') || null;
  const wildPaid = paid => (paid || []).includes('G');
  const printedWild = (g, u) => (g.d(u).res || '').includes('G');
  const pick = async (g, cands, title) => !cands.length ? null : cands.length === 1 ? cands[0] : await g.ask({ type: 'target', title, cands, cancelable: false });
  async function dmgEnemy(g, n, title, src, attack) {
    const t = await g.chooseTarget(attack ? 'attackable' : 'enemy', title, g.idt(), false); if (!t) return null;
    if (attack) return { t, r: await g.playerAttack(g.idt(), t, n, { src }) };
    return { t, r: await g.dealDamage(t, n, { src, byPlayer: true }) };
  }
  const readyHelmet = g => { const h = helmet(g); if (h && g.c(h).ex && g.canReady(h)) { g.c(h).ex = false; g.log('슈퍼노바 헬멧 준비', 'good'); } };

  // ======================= identity =======================
  S['28001a'] = {
    respond: [
      { window: 'afterBasicPower', label: '슈퍼노바 헬멧 준비', can: g => { const h = helmet(g); return !!h && g.c(h).ex; }, async resolve(g) { readyHelmet(g); } }
    ],
    on: { // Unleash Nova Force: until the end of the round
      async playerDefeatsMinion(g, u, ctx) { if (g.p.usedOnce.novaForce && ctx.src && (ctx.src === g.idt() || (g.c(ctx.src) && g.d(ctx.src).type === 'event'))) await novaForce(g); },
      async sideSchemeDefeated(g) { if (g.p.usedOnce.novaForce && g.lastThreatSrc && (g.lastThreatSrc === g.idt() || (g.c(g.lastThreatSrc) && g.d(g.lastThreatSrc).type === 'event'))) await novaForce(g); }
    }
  };
  async function novaForce(g) { if (!g.isHero()) return; if (g.c(g.idt()).ex && g.canReady(g.idt())) g.c(g.idt()).ex = false; g.log('노바 포스 해방: 노바 준비, 카드 1장', 'good'); await g.draw(1); }
  S['28001b'] = { actions: [{ timing: 'alter', label: '자원 1 → 슈퍼노바 헬멧 찾기 (와일드로 내면 바로 플레이)', cost: { n: 1, req: '' }, can: g => !helmet(g) && g.p.deck.concat(g.p.discard).some(u => g.c(u).id === '28009'),
    async use(g, u, o) {
      const c = g.p.deck.concat(g.p.discard).filter(x => g.c(x).id === '28009'); g.shuffle(g.p.deck); if (!c.length) return;
      if (wildPaid(o.paid)) { g.put(c[0], 'upgrade'); g.log('슈퍼노바 헬멧을 플레이에 놓습니다', 'good'); }
      else { g.put(c[0], 'hand'); g.log('슈퍼노바 헬멧을 손으로', 'good'); }
    } }] };

  // ======================= hero cards =======================
  S['28002'] = { respond: [{ window: 'afterEventPlayed', timing: 'hero', label: '소진·피해 1 → 그 이벤트를 손으로', can: (g, u, ctx) => !g.c(u).ex && g.c(ctx.card) && g.c(ctx.card).zone === 'limbo' && !g.d(ctx.card).enc, // Ms. Marvel
    async resolve(g, u, ctx) { g.c(u).ex = true; await g.dealDamage(u, 1, { src: u }); if (g.c(ctx.card).zone === 'limbo') { g.put(ctx.card, 'hand'); g.log(`${g.nm(ctx.card)}을(를) 손으로`, 'good'); } } }] };
  S['28003'] = { interrupt: { window: 'wouldTakeAttackDamage', windows: ['allyWouldTakeDamage'], timing: 'hero', can: (g, u, ctx) => ctx.attack && ctx.amount - ctx.prevent > 0, // Forcefield Projection
    async resolve(g, u, ctx, paid) { ctx.prevent = Math.min(ctx.amount, ctx.prevent + 3); g.log('역장 투사: 피해 3 방지', 'good'); if (wildPaid(paid) && g.enemies().length) await dmgEnemy(g, 3, '역장 투사: 피해 3을 줄 적', u); } } };
  S['28004'] = { doubleWild: true, play: { timing: 'hero', label: 'thwart', target: 'thwartable', async resolve(g, u, ctx) { const r = await g.removeThreat(ctx.target, 3, { src: u }); g.log(`광속 비행: 위협 ${r} 제거`); await g.afterThreatRemoved(ctx.target); } } }; // Lightspeed Flight
  S['28005'] = { doubleWild: true, play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { await g.playerAttack(g.idt(), ctx.target, 4, { src: u }); } } }; // Pot Shot
  S['28006'] = { play: { timing: 'hero', can: g => !g.p.usedOnce.novaForce, async resolve(g) { g.p.usedOnce.novaForce = true; g.log('노바 포스 해방: 이번 라운드 동안 적을 쓰러뜨리거나 음모를 비우면 준비 + 1장', 'good'); } } }; // Unleash Nova Force
  S['28007'] = { noHandSize: true }; // Connection to the Worldmind
  S['28008'] = { actions: [{ timing: 'alter', exhaust: true, label: '소진 → 월드마인드와의 연결 1장을 덱에 섞고 1장 뽑기', async use(g) { // Jesse Alexander
    const c = g.p.discard.find(x => g.c(x).id === '28007'); if (c) { g.put(c, 'deck'); g.shuffle(g.p.deck); } await g.draw(1);
  } }] };
  S['28009'] = { grantTrait: (g, s, t) => t === g.idt() && isNova(g) ? 'AERIAL' : null, // Supernova Helmet
    resources: [{ gen: 'G', label: '슈퍼노바 헬멧 (소진)', can: (g, u) => !g.c(u).ex && g.isHero(), use: (g, u) => { g.c(u).ex = true; } }] };
  S['28021'] = { // Weight of the World
    async whenRevealed(g, u) { g.put(u, 'pobl'); g.log('세상의 무게: 슈퍼노바 헬멧이 준비되지 않습니다', 'warn'); },
    blocksReady: (g, s, t) => g.c(s).zone === 'pobl' && g.c(t).id === '28009',
    actions: [{ timing: 'alter', label: '샘 알렉산더 소진 → 이 카드를 게임에서 제거', can: (g, u) => g.c(u).zone === 'pobl' && !g.c(g.idt()).ex, async use(g, u) { g.c(g.idt()).ex = true; g.removeFromGame(u); } }]
  };
  S['28023'] = { attackBonus: g => g.p.hand.filter(u => printedWild(g, u)).length, attackProps: () => ({ overkill: true }) }; // Warbringer
  S['28024'] = { // War Delivery
    async whenRevealed(g) {
      const canPay = g.canAfford({ n: 1, req: 'G', only: 'G' }, null);
      if (canPay && await g.ask({ type: 'choice', title: '전쟁 배달', options: [{ id: 'pay', label: '[와일드] 자원 1 지불' }, { id: 'no', label: '내지 않는다 (빌런과 워브링어가 공격)' }] }) === 'pay') { if (await g.pay({ n: 1, req: 'G', only: 'G' }, null, '전쟁 배달: [와일드] 1', false)) return; }
      if (g.e.villain) await g.enemyAttack(g.e.villain, {});
      const w = g.e.minions.find(m => g.c(m).id === '28023'); if (w && g.c(w).zone === 'minion') await g.enemyAttack(w, {});
    },
    async boostEffect(g) { const n = g.p.hand.filter(u => printedWild(g, u)).length; if (n) await g.placeThreat(g.e.main, n, {}); }
  };
  S['28025'] = { whenRevealed(g) { // "The War's Been Brought"
    const n = g.p.hand.concat(g.controlled(), g.p.discard).filter(u => printedWild(g, u)).length;
    let k = 0; for (let i = 0; i < n; i++) { const x = g.takeEncounter(); if (!x) break; g.put(x, 'ediscard'); k++; }
    g.log(`"전쟁이 왔다": 조우 덱 ${k}장 버림`);
  } };

  // ======================= Aggression / other aspects / Basic =======================
  S['28010'] = { canPlay: g => g.hasTrait(g.idt(), 'CHAMPION'), async onEnter(g) { // The Locust
    if (!g.isHero()) return; const c = g.p.discard.filter(x => g.d(x).type === 'event' && g.d(x).cls === 'Aggression'); const t = await pick(g, c, '로커스트: 손으로 가져올 용맹 이벤트'); if (t) g.put(t, 'hand');
  } };
  S['28012'] = { canPlay: g => g.hasTrait(g.idt(), 'AERIAL'), interrupt: { window: 'heroAttacked', timing: 'hero', can: g => g.hasTrait(g.idt(), 'AERIAL') && g.enemies().length > 0, async resolve(g, u) { await dmgEnemy(g, 4, '되받아치기: 피해 4를 줄 적', u, true); } } }; // Pitchback
  S['28013'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { // No Quarter
    const r = await g.playerAttack(g.idt(), ctx.target, 4, { src: u }); const x = (r && r.excess) || 0; let got = 0;
    for (let i = 0; i < x && g.p.deck.length; i++) { const c = g.p.deck[0]; if (g.d(c).cls === 'Aggression') { g.put(c, 'hand'); got++; } else g.put(c, 'discard'); }
    if (x) g.log(`가차없이: 초과 피해 ${x} → 덱 위 ${x}장 확인, 용맹 카드 ${got}장 손으로`);
  } } };
  S['28014'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { // One by One
    const r = await g.playerAttack(g.idt(), ctx.target, 2, { src: u }); if (r && r.defeated && g.enemies().length) await dmgEnemy(g, 2, '하나씩: 피해 2를 줄 적', u);
  } } };
  S['28016'] = { respond: [{ window: 'eventResolved', timing: 'hero', exhaust: true, label: '소진 → 히어로 공격 +1 (이번 단계)', can: (g, u, ctx) => (ctx.tr || []).includes('ATTACK'), async resolve(g) { g.addPhaseMod(g.idt(), 'atk', 1); } }] }; // Fluid Motion
  S['28017'] = { respond: [{ window: 'eventPlayed', label: '용맹 [공격] 이벤트 피해 + 인쇄 비용', can: (g, u, ev) => g.d(ev.card).cls === 'Aggression' && (g.d(ev.card).tr || []).includes('ATTACK') && (ev.paid || []).includes('B') && (g.d(ev.card).cost || 0) > 0, // Honed Technique
    async resolve(g, u, ev) { ev.dmgBonus += g.d(ev.card).cost || 0; } }] };
  S['28018'] = { canPlay: g => g.hasTrait(g.idt(), 'CHAMPION') || g.hasTrait(g.idt(), 'GENIUS'), async onPlay(g, u, ctx) { const n = (ctx.paid || []).filter(l => l === 'B').length; if (n) { await g.draw(n); g.log(`문걸: 카드 ${n}장`); } } }; // Moon Girl
  S['28019'] = { onSpent(g) { if (g.hasTrait(g.idt(), 'CIVILIAN') && g.c(g.idt()).dmg) { g.heal(g.idt(), 1); g.log('일상의 영웅: 피해 1 회복', 'good'); } } }; // Everyday Hero
  S['28020'] = { actions: [{ timing: 'hero', exhaust: true, label: '소진 → [챔피언] 정체성: 2장 뽑고 2장 버리기', can: g => g.hasTrait(g.idt(), 'CHAMPION'), async use(g) { // Champions Mobile Bunker
    if (await g.ask({ type: 'choice', title: '챔피언 이동 벙커', options: [{ id: 'y', label: '2장 뽑고 2장 버리기' }, { id: 'n', label: '하지 않음' }] }) !== 'y') return;
    await g.draw(2); await g.discardFromHand(Math.min(2, g.p.hand.length), 2, '챔피언 이동 벙커: 버릴 카드 2장');
  } }] };
  S['28026'] = { canPlay: g => g.hasTrait(g.idt(), 'AERIAL'), interrupt: { window: 'afterHeroThwart', timing: 'hero', can: g => g.hasTrait(g.idt(), 'AERIAL') && g.targets('thwartable', g.idt()).length > 0, async resolve(g, u) { await g.removeThreatChoose(3, '요와 롤: 위협 3을 제거할 음모', u); } } }; // Yaw and Roll
  S['28027'] = { // Height Advantage
    on: { wouldTakeDamage(g, u, ctx) { if (ctx.target === g.idt() && ctx.attack && g.hasTrait(g.idt(), 'AERIAL') && ctx.amount - ctx.prevent > 0) ctx.prevent++; }, turnBegins(g, u) { g.discard(u, '고도의 우위: 턴 시작에 버림'); } }
  };

  // ======================= Armadillo (modular) =======================
  const dillo = g => g.e.minions.find(m => g.c(m).id === '28029') || null;
  S['28028'] = { mod: { atk: (g, s, t) => g.enemies().includes(t) && g.c(t).tough ? 3 : 0 } }; // Armored Assault
  S['28029'] = { multiTough: true, on: { enemyActivated(g, u, ctx) { if (ctx.enemy === u && g.c(u).zone === 'minion') g.giveStatus(u, 'tough', '★ 아르마딜로'); } } }; // Armadillo
  S['28030'] = { revealFirst: true, // Rollin', Rollin'
    async whenRevealed(g, u) {
      let a = dillo(g);
      if (!a) { a = g.searchEncounter(d => d.id === '28029'); g.shuffle(g.e.deck); if (a) await g.enterMinion(a, {}, true); if (a && g.c(a).zone !== 'minion') a = null; }
      if (a) { g.attachEnc(u, a); g.log('굴러, 굴러: 아르마딜로에 부착', 'warn'); } else g.discard(u);
    },
    cannotBeDefended: (g, s, enemy) => enemy === g.c(s).on && g.c(enemy).tough
  };
  S['28031'] = { async whenRevealed(g, u, ctx) { // Tough and Tumble
    const c = g.enemies().filter(x => g.c(x).tough); let n = 0;
    for (const x of c) { if (!g.c(x).zone) continue; n++; if (g.isHero()) await g.enemyAttack(x, {}); else await g.enemyScheme(x, {}); }
    if (!n) ctx.surge++;
  } };
  S['28032'] = { whenRevealed(g, u, ctx) { // Tough It Out
    let n = 0; const a = dillo(g); if (a && g.giveStatus(a, 'tough', '버텨내기')) n++;
    if (g.e.villain && g.giveStatus(g.e.villain, 'tough', '버텨내기')) n++;
    if (n <= 1) ctx.surge++;
  } };

  S['28022'] = { async whenRevealed(g, u) { await g.forEachPlayer(async () => { // "Bring the War!": discard a card you control with a printed [wild] resource; 1 threat here for each
    const c = g.p.allies.concat(g.p.supports, g.p.upgrades).filter(x => (g.d(x).res || '').includes('G')); if (!c.length) { g.log(`"전쟁을 가져와라!"(${g.playerName()}): 버릴 와일드 자원 카드가 없습니다`); return; }
    const t = await g.ask({ type: 'target', title: `"전쟁을 가져와라!"(${g.playerName()}): 버릴 카드 ([와일드] 자원)`, cands: c, cancelable: false }) || c[0];
    g.discard(t, '"전쟁을 가져와라!"'); g.c(u).threat += 1; g.log('"전쟁을 가져와라!": 위협 +1', 'warn');
  }); } };
  MC.registerScripts(S);
})();
