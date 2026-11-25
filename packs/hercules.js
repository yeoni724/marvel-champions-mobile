/* Hercules (59001-59040): the LABOR and GIFT decks, victory display, Ares nemesis and the pack's player cards.
   Ported from cards/pack/hercules of the community build. */
(function () {
  'use strict';
  const S = {};
  const idOf = (g, u) => g.c(u).id;
  const tr = (g, u, t) => (g.d(u).tr || []).includes(t) || g.hasTrait(u, t);
  const pick = async (g, cands, title) => !cands.length ? null : cands.length === 1 ? cands[0] : await g.ask({ type: 'target', title, cands, cancelable: false });
  const yes = async (g, title) => (await g.ask({ type: 'choice', title, options: [{ id: 'y', label: '예' }, { id: 'n', label: '아니요' }] })) === 'y';
  async function thw(g, t, n, src) { const r = await g.removeThreat(t, n, { src }); g.log(`${g.nm(t)} 위협 ${r} 제거`); await g.afterThreatRemoved(t); return r; }
  const isHerc = g => ['59001a', '59001b'].includes(idOf(g, g.idt()));
  const gifts = g => (g.p.obl || []).some(x => idOf(g, x) === '59035') ? 0 : g.controlled().filter(x => tr(g, x, 'GIFT')).length;
  const laborInPlay = g => g.inPlay().some(x => (g.d(x).tr || []).includes('LABOR'));
  const pk = g => g.s.round + ':' + g.s.phase;
  // a Hercules attack or thwart: Hercules himself or an event he plays
  const byHerc = (g, src) => !!src && (src === g.idt() || (g.c(src) && !g.d(src).enc && g.d(src).type === 'event'));
  async function laborDone(g, card) {
    g.put(card, 'victory'); g.log(`과업 완수: ${g.nm(card)} → 승리 표시`, 'good');
    if (idOf(g, g.idt()) !== '59001a' || g.p.atonement === pk(g)) return; // Atonement (hero form, once per phase)
    g.p.atonement = pk(g);
    const gf = (g.p.giftDeck || []).shift();
    if (gf) { g.put(gf, 'upgrade'); g.log(`속죄: 선물 「${g.nm(gf)}」 등장`, 'good'); const oe = g.sc(gf).onEnter; if (oe) await oe(g, gf, {}); }
    if (g.canReady(g.idt())) g.c(g.idt()).ex = false;
    if (!g.formLocked() && await yes(g, '속죄: 일상 모습으로 바꿀까요?')) await g.changeForm(true);
  }
  MC.hercules = { laborDone, gifts };
  // ======================= identity =======================
  S['59001b'] = { setup(g) { // the LABOR deck and the GIFT deck
      const ps = g.p.pset || []; g.p.laborDeck = ps.filter(x => tr(g, x, 'LABOR')); g.p.giftDeck = ps.filter(x => tr(g, x, 'GIFT')); g.shuffle(g.p.laborDeck); g.shuffle(g.p.giftDeck);
      g.log(`과업 덱 ${g.p.laborDeck.length}장, 선물 덱 ${g.p.giftDeck.length}장`); },
    actions: [{ timing: 'alter', label: '헤라클레스의 새로운 과업: 과업 카드 공개', can: g => !laborInPlay(g) && (g.p.laborDeck || []).length > 0, async use(g) { const x = g.p.laborDeck.shift(); g.log(`새로운 과업: ${g.nm(x)}`); await g.reveal(x); } }] };
  S['59001a'] = {};
  // LABOR cards
  S['59002'] = { revealFirst: true, mod: { hp: (g, s, t) => g.c(s).zone === 'attach' && t === g.c(s).on ? 6 : 0 }, grantTrait: (g, s, u) => g.c(s).zone === 'attach' && u === g.c(s).on ? 'ELITE' : null, // Defeat the Hydra
    shieldsFromDamage: (g, s, t, o) => g.c(s).zone === 'attach' && t === g.c(s).on && !(o && o.attack && byHerc(g, o.src)),
    async whenRevealed(g, u) { const ms = g.e.deck.concat(g.e.discard, g.e.setaside).filter(x => g.d(x).type === 'minion' && !(g.d(x).tr || []).includes('ELITE') && (g.d(x).hp || 0) >= 6);
      const m = await pick(g, ms, '히드라 퇴치: 공개할 하수인'); g.shuffle(g.e.deck); if (!m) { g.log('조건에 맞는 하수인이 없습니다'); g.discard(u); return; }
      await g.reveal(m); if (g.c(m).zone !== 'minion') { g.discard(u); return; } g.c(m).dmg = 0; g.attachEnc(u, m); },
    on: { async attachedDefeated(g, a) { await laborDone(g, a); } } };
  S['59003'] = { revealFirst: true, grantAssault: true, hostRemoveOnlyBy: (g, a, src) => byHerc(g, src), // Embody Pathos
    async whenRevealed(g, u) { const ss = g.e.deck.concat(g.e.discard, g.e.setaside).filter(x => g.d(x).type === 'side'); const s = await pick(g, ss, '파토스 체현: 공개할 부가 음모'); g.shuffle(g.e.deck);
      if (!s) { g.discard(u); return; } await g.reveal(s); if (g.c(s).zone !== 'side') { g.discard(u); return; } g.attachEnc(u, s); g.c(s).threat += 6; g.log(`${g.nm(s)}: 위협 6 추가 (돌격 — 기본 저지에 공격력 사용)`); },
    on: { async attachedDefeated(g, a) { await laborDone(g, a); } } };
  S['59004'] = { async whenRevealed(g, u) { g.put(u, 'pobl'); g.c(u).cnt.labor = 3; // Protect Humanity
      const am = g.p.deck.concat(g.p.discard, g.p.hand).find(x => idOf(g, x) === '59008'); if (am) { g.shuffle(g.p.deck); await g.putAllyIntoPlay(am); g.log('인류 보호: 아마데우스 조 등장'); } },
    async redirectVillainAttack(g, x, enemy, o, ctx) { if (g.c(x).zone !== 'pobl' || !g.isHero() || !g.p.allies.length) return;
      const al = await pick(g, g.p.allies.slice(), '인류 보호: 빌런이 대신 공격할 동료');
      if (!g.c(g.idt()).ex && await yes(g, `${g.nm(al)}을(를) 헤라클레스가 대신 방어할까요? (과업 카운터 -1)`)) {
        ctx.forceHeroDefend = true; ctx.after.push(async gg => { if (gg.c(x).zone !== 'pobl') return; gg.c(x).cnt.labor--; gg.log(`인류 보호: 과업 카운터 ${gg.c(x).cnt.labor}`); if (gg.c(x).cnt.labor <= 0) await laborDone(gg, x); });
      } else o.forceTarget = al; } };
  // GIFT cards
  const draw4 = { async onEnter(g) { await g.draw(4); } };
  S['59005'] = Object.assign({ mod: { hp: (g, s, t) => t === g.idt() ? 2 : 0 }, steadyFor: (g, s, t) => t === g.idt() }, draw4); // Nemean Lion Skin
  S['59006'] = Object.assign({ mod: { hp: (g, s, t) => t === g.idt() ? 1 : 0, retaliate: (g, s, t) => t === g.idt() && g.isHero() ? 1 : 0 } }, draw4); // Shield of Perseus
  S['59007'] = Object.assign({ mod: { hp: (g, s, t) => t === g.idt() ? 1 : 0 }, basicAttackPlus: g => ({ piercing: true }) }, draw4); // Sword of Peleus
  // hero cards
  S['59008'] = { attackRedirect: (g, a, enemy) => g.d(enemy).type === 'minion', actions: [{ exhaust: true, label: '아마데우스 조: 카드 1장', async use(g) { await g.draw(1); } }] }; // Amadeus Cho
  S['59009'] = { selfCostMod: g => gifts(g), play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { await g.playerAttack(g.idt(), ctx.target, 5, { src: u }); } } }; // The Gift of Battle
  S['59010'] = { play: { timing: 'hero', async resolve(g) { const n = gifts(g); if (g.canReady(g.idt())) g.c(g.idt()).ex = false; // Son of Zeus
    if (n >= 1) { const t = await pick(g, g.p.upgrades.filter(x => g.c(x).ex && g.d(x).cls === 'Hero'), '준비할 정체성 전용 업그레이드'); if (t) g.c(t).ex = false; }
    if (n >= 2) g.giveStatus(g.idt(), 'tough', '제우스의 아들'); if (n >= 3) await g.draw(1); } } };
  S['59011'] = { selfCostMod: g => gifts(g), play: { timing: 'hero', label: 'thwart', target: 'thwartable', async resolve(g, u, ctx) { await thw(g, ctx.target, 4, u); } } }; // Wisdom of Athena
  S['59012'] = { resources: [{ gen: g => 'G'.repeat(gifts(g)), label: '올림푸스 (선물마다 와일드)', can: (g, u) => !g.c(u).ex && gifts(g) > 0, use: (g, u) => { g.c(u).ex = true; } }] }; // Olympus
  S['59013'] = { respond: [{ window: 'heroDefends', timing: 'hero', exhaust: true, label: '헤라클레스의 건틀릿: 이번 공격 보복 +선물 수', can: g => gifts(g) > 0, resolve(g, u, ctx) { const n = gifts(g); g.addPhaseMod(g.idt(), 'retaliate', n); ctx.after.push(gg => gg.addPhaseMod(gg.idt(), 'retaliate', -n)); } }] }; // Gauntlets of Hercules
  S['59014'] = { respond: [{ window: 'basicPowerUsed', timing: 'hero', exhaust: true, label: '황금 철퇴: 공격 +선물 수, 압도', can: (g, u, ctx) => ctx.kind === 'attack', resolve(g, u, ctx) { ctx.bonus += gifts(g); ctx.overkill = true; } }] }; // Golden Mace
  S['59015'] = { respond: [{ window: 'villainAttackInitiated', timing: 'hero', exhaust: true, label: '헤라클레스의 투구: 이번 공격 피해 -1', resolve(g, u, ctx) { ctx.prevent3 = (ctx.prevent3 || 0) + 1; } }] }; // Herc's Helm
  S['59016'] = { mod: { thw: (g, s, t) => t === g.idt() && g.isHero() ? 1 : 0, atk: (g, s, t) => t === g.idt() && g.isHero() ? 1 : 0, def: (g, s, t) => t === g.idt() && g.isHero() ? 1 : 0 } }; // Lion of Olympus (temporary)
  S['59017'] = { respond: [{ window: 'afterAttackDefeat', timing: 'hero', exhaust: true, label: '힘의 왕자: 초과 피해만큼 회복', can: (g, u, ctx) => ctx.attacker === g.idt() && ctx.excess > 0 && ['villain', 'minion'].includes(ctx.type), resolve(g, u, ctx) { g.heal(g.idt(), ctx.excess); } }] }; // Prince of Power
  S['59035'] = { whenRevealed(g, u) { g.put(u, 'pobl'); g.log('아테나에게 호소: 선물 카드를 하나도 통제하지 않는 것으로 칩니다', 'warn'); }, // Appeal to Athena
    actions: [{ timing: 'alter', label: '헤라클레스 소진 또는 [정신][정신] → 아테나에게 호소 제거', can: (g, u) => g.c(u).zone === 'pobl' && (!g.c(g.idt()).ex || g.canAfford({ n: 2, req: 'BB' }, null)), async use(g, u) {
      const o = !g.c(g.idt()).ex && g.canAfford({ n: 2, req: 'BB' }, null) ? await g.ask({ type: 'choice', title: '아테나에게 호소', options: [{ id: 'e', label: '헤라클레스 소진' }, { id: 'p', label: '[정신][정신] 지불' }] }) : (!g.c(g.idt()).ex ? 'e' : 'p');
      if (o === 'e') g.c(g.idt()).ex = true; else if ((await g.pay({ n: 2, req: 'BB' }, null, '아테나에게 호소', true)) == null) return; g.removeFromGame(u); g.log('아테나에게 호소를 게임에서 제거', 'good'); } }] };
  // nemesis
  const ares = g => g.e.minions.find(m => idOf(g, m) === '59036') || null;
  S['59036'] = { beforeScheme(g, u, ctx) { ctx.post.push(gg => { const x = gg.takeEncounter(); if (x) { gg.put(x, 'facedown'); gg.log('★ 아레스: 조우 카드 1장을 받습니다', 'warn'); } }); } }; // Ares
  S['59037'] = { on: { async afterTakeDamage(g, u, ctx) { if (ctx.target !== u || !ctx.attack || !ctx.byPlayer || g.hpLeft(u) <= 0) return; // Lernean Hydra
    const can = g.canAfford({ n: 1, req: 'R' }, null); const o = can ? await g.ask({ type: 'choice', title: '레르네의 히드라', options: [{ id: 'p', label: '[물리] 자원 1개 지불' }, { id: 'h', label: '히드라가 피해 2 회복' }] }) : 'h';
    if (o === 'p' && (await g.pay({ n: 1, req: 'R' }, null, '레르네의 히드라', true)) != null) return; g.heal(u, 2); g.log('레르네의 히드라: 피해 2 회복', 'warn'); } } };
  S['59038'] = { async whenRevealed(g, u) { const n = g.inPlay().filter(x => (g.d(x).tr || []).includes('OLYMPUS')).length; if (n) { g.c(u).threat += n; g.log(`${g.nm(u)}: [올림푸스] 카드 ${n}장 → 위협 +${n}`); } } }; // Olympic Feud
  S['59039'] = { attachTo: g => ares(g) || g.e.villain, on: { afterEnemyAttack(g, a, ctx) { if (ctx.enemy === g.c(a).on && !(ctx.damaged || []).length) g.discard(a, `${g.nm(a)} 버림`); } } }; // Ares's Axe
  S['59040'] = { async whenRevealed(g) { const ms = g.e.minions.slice(); for (const m of ms) if (g.c(m).zone === 'minion') await g.withPlayer(g.c(m).eng ?? g.s.ctx, () => g.enemyAttack(m, { forceAlter: true })); // God of War
    if (!ms.length) { for (let i = 0; i < 200; i++) { const x = g.takeEncounter(); if (!x) return; g.put(x, 'ediscard'); if (g.d(x).type === 'minion') { await g.reveal(x); return; } } } } };
  // ======================= aspect / basic =======================
  S['59018'] = { respond: [{ window: 'allyPowerUsed', timing: 'hero', label: '★ 데스크라이: 히어로 피해 1 → 후속 피해 -1', can: (g, u, ctx) => ctx.ally === u && ctx.kind === 'attack', async resolve(g, u, ctx) { ctx.consMinus = (ctx.consMinus || 0) + 1; await g.dealDamage(g.idt(), 1, {}); } }] }; // Deathcry
  S['59019'] = { mod: { hp: (g, s, t) => t === s ? g.p.allies.filter(a => a !== s).length : 0 } }; // Namora
  S['59020'] = { on: { async allyBasicPower(g, u, ctx) { if (ctx.ally !== u || ctx.kind !== 'thwart') return; for (let i = 0; i < 200; i++) { const x = g.takeEncounter(); if (!x) return; g.put(x, 'ediscard'); if (g.d(x).type === 'minion') { g.log(`★ 토르: ${g.nm(x)}이(가) 교전합니다`); await g.enterMinion(x, {}, true); return; } } } } }; // Thor (ally)
  S['59023'] = { canPlay: g => !g.isHero(), actions: [{ label: '모병 운동: 버리고 이번 단계 다음 동료 비용 0', async use(g, u) { const pi = await g.choosePlayer('신병 모집: 다음 동료 비용을 0으로 줄일 플레이어'); g.discard(u, '모병 운동 버림'); g.s.ps[pi].phase = g.s.ps[pi].phase || {}; g.s.ps[pi].phase.nextAllyRed = 99; } }] }; // Recruitment Drive
  S['59024'] = { canPlay: g => tr(g, g.idt(), 'AVENGER'), attach: { kind: 'ally', filter: (g, t) => !g.c(t).att.some(a => idOf(g, a) === '59024') }, on: { async attachedDefeated(g) { g.log('"복수해 줘!": 카드 2장', 'good'); await g.draw(2); } } }; // "Avenge Me!"
  S['59025'] = { onPlay(g) { if (!g.hasTrait(g.idt(), 'ETERNAL')) g.giveStatus(g.idt(), 'conf', '길가메시 (추가 비용)'); } }; // Gilgamesh
  S['59026'] = { play: { timing: 'hero', async resolve(g) { await g.searchToHand(d => d.type === 'upgrade' && d.cls === 'Hero', '정체성 전용 업그레이드', { discard: true }); // Ancient Rivalry
    const named = x => /Hercules|Thor/.test(g.d(x).en || ''); if (named(g.idt()) && g.canReady(g.idt())) g.c(g.idt()).ex = false; for (const a of g.p.allies) if (named(a)) g.c(a).ex = false; } } };
  S['59028'] = { canPlay: g => tr(g, g.idt(), 'AVENGER') || tr(g, g.idt(), 'S.H.I.E.L.D'), // Evaluate Threat
    async whenDefeated(g) { await g.forEachPlayer(async () => { const x = await g.searchToHand(d => (d.tr || []).includes('AVENGER') || (d.tr || []).includes('S.H.I.E.L.D'), `상황 평가(${g.playerName()}): [어벤저]/[실드] 카드`, { discard: true }); if (x) { g.c(x).tmpDiscount = { key: pk(g), n: 2 }; g.log(`${g.nm(x)}: 이번 단계 비용 -2`); } }); } };
  MC.registerScripts(S);
})();
