/* Sinister Motives (27001-27173): Ghost-Spider, Spider-Man (Miles Morales), their aspect cards and nemesis sets,
   the five scenarios and nine modular sets. Ported from cards/pack/sm of the community build. */
(function () {
  'use strict';
  const S = {};
  const idOf = (g, u) => g.c(u).id;
  const has = (g, u, t) => g.hasTrait(u, t);
  const pick = async (g, cands, title) => !cands.length ? null : cands.length === 1 ? cands[0] : await g.ask({ type: 'target', title, cands, cancelable: false });
  const webWarriors = g => g.controlled().filter(u => has(g, u, 'WEB-WARRIOR'));
  const shieldCards = g => g.controlled().filter(u => u !== g.idt() && has(g, u, 'S.H.I.E.L.D') || (u === g.idt() && has(g, u, 'S.H.I.E.L.D')));
  const paidWith = (paid, l) => (paid || []).includes(l);
  const dealFd = (g, n) => { for (let i = 0; i < (n || 1); i++) { const u = g.takeEncounter(); if (u) { g.put(u, 'facedown'); g.log('조우 카드 1장을 뒷면으로 받았습니다', 'warn'); } } };
  const discardRandomHand = g => { if (!g.p.hand.length) return null; const t = g.p.hand[Math.floor(g.rand() * g.p.hand.length)]; g.put(t, 'discard'); g.log(`무작위로 ${g.nm(t)} 버림`); return t; };
  async function dmgEnemy(g, n, title, src, attack, kind) {
    const t = await g.chooseTarget(kind || (attack ? 'attackable' : 'enemy'), title, g.idt(), false); if (!t) return null;
    if (attack) return { t, r: await g.playerAttack(g.idt(), t, n, { src }) };
    return { t, r: await g.dealDamage(t, n, { src, byPlayer: true }) };
  }
  const isGwen = g => ['27001a', '27001b'].includes(g.c(g.idt()).id);
  const isMiles = g => ['27030a', '27030b'].includes(g.c(g.idt()).id);
  const george = g => g.p.supports.find(u => idOf(g, u) === '27007') || null;

  // ======================= Ghost-Spider =======================
  S['27001a'] = { respond: [{ window: 'reactionEventResolved', label: '아찔한 반사신경: 고스트 스파이더 준비 (단계당 1번)', can: g => g.c(g.idt()).ex && !g.p.phase.dizzy, async resolve(g) { g.p.phase.dizzy = true; if (g.canReady(g.idt())) g.c(g.idt()).ex = false; } }] };
  S['27001b'] = { actions: [{ timing: 'action', once: true, label: '멀티버스 티켓을 덱에 섞기 또는 조지 스테이시 준비', can: g => g.p.discard.some(u => idOf(g, u) === '27008') || (george(g) && g.c(george(g)).ex), async use(g) {
    const t = g.p.discard.find(u => idOf(g, u) === '27008'), ge = george(g);
    const opts = []; if (t) opts.push({ id: 't', label: '멀티버스 티켓을 덱에 섞기' }); if (ge && g.c(ge).ex) opts.push({ id: 'g', label: '조지 스테이시 준비' });
    const k = opts.length === 1 ? opts[0].id : await g.ask({ type: 'choice', title: '그웬 스테이시', options: opts });
    if (k === 't') { g.put(t, 'deck'); g.shuffle(g.p.deck); } else if (ge && g.canReady(ge)) g.c(ge).ex = false;
  } }] };
  const afterBasicResp = (kind, fn) => ({ interrupt: { window: 'afterBasicPower', timing: 'hero', can: g => isGwen(g) && fn.can(g), async resolve(g, u) { await fn.run(g, u); } } });
  S['27002'] = afterBasicResp('attack', { can: g => g.targets('attackable', g.idt()).length > 0, async run(g, u) { if (await g.statusBlocks('attack')) return; await dmgEnemy(g, 6, '고스트 킥: 피해 6을 줄 적', u, true); } }); // Ghost Kick
  S['27003'] = { play: { timing: 'alter', async resolve(g) { // Parental Guidance
    const ge = george(g);
    if (ge) { const c = g.p.hand.concat(g.p.discard).filter(x => g.d(x).type === 'event' && x !== undefined); const t = await pick(g, c, '조지 스테이시에게 뒷면으로 붙일 이벤트'); if (t) { g.put(t, 'attach', ge); g.c(t).fd = true; } return; }
    await g.searchToHand(d => d.id === '27007', '부모의 지도', { discard: true });
  } } };
  S['27004'] = afterBasicResp('thwart', { can: g => g.schemes().some(x => g.c(x).threat > 0), async run(g, u) { if (await g.statusBlocks('thwart')) return; await g.removeThreatChoose(5, '팬텀 플립: 위협 5를 제거할 음모', u); } }); // Phantom Flip
  S['27005'] = { interrupt: { window: 'cardRevealed', timing: 'hero', can: (g, u, ctx) => !!g.e.villain && !ctx.cancelAll, async resolve(g, u, ctx) { // Pirouette and Punch
    const n = g.boostOf(ctx.card) + 1; await g.dealDamage(g.e.villain, n, { src: u, byPlayer: true }); ctx.cancelWR = true; ctx.cancel = true;
  } } };
  S['27006'] = { interrupt: { window: 'enemyWouldActivate', timing: 'hero', can: (g, u, ctx) => !ctx.cancel, async resolve(g, u, ctx) { // Web Binding
    ctx.cancel = true; if (g.d(ctx.enemy).type === 'minion') await g.dealDamage(ctx.enemy, 4, { src: u, byPlayer: true });
  } } };
  S['27007'] = { playFromAttached: true, actions: [{ timing: 'action', exhaust: true, label: '소진 → 손의 이벤트 1장을 뒷면으로 붙이기 (최대 3)', can: (g, u) => g.p.hand.some(x => g.d(x).type === 'event') && g.c(u).att.length < 3, // George Stacy
    async use(g, u) { const t = await pick(g, g.p.hand.filter(x => g.d(x).type === 'event'), '조지 스테이시에게 붙일 이벤트'); if (t) { g.put(t, 'attach', u); g.c(t).fd = true; } } }] };
  S['27008'] = { actions: [{ timing: 'action', label: '게임에서 제거 → 손 버리고 덱 재구성, 손 크기까지 뽑기, 고스트 스파이더 카드 준비', async use(g, u) { // Ticket to the Multiverse
    g.removeFromGame(u); g.p.hand.slice().forEach(x => g.put(x, 'discard')); g.p.discard.slice().forEach(x => g.put(x, 'deck')); g.shuffle(g.p.deck);
    await g.draw(Math.max(0, g.handSize() - g.handCount()));
    for (const x of [g.idt()].concat(g.controlled())) if ((x === g.idt() || g.d(x).cls === 'Hero') && g.c(x).ex && g.canReady(x)) g.c(x).ex = false;
    g.log('멀티버스 티켓: 덱을 다시 섞고 손을 새로 채웠습니다', 'good');
  } }] };
  S['27009'] = { respond: [{ window: 'reactionEventResolved', timing: 'hero', exhaust: true, label: '소진 → 카드 1장 뽑기', async resolve(g) { await g.draw(1); } }] }; // Web-Bracelet
  S['27025'] = { async whenRevealed(g, u) { // Worried Father
    const ge = Object.keys(g.s.cards).find(x => idOf(g, x) === '27007' && ['deck', 'hand', 'discard', 'support'].includes(g.c(x).zone));
    if (ge) { for (const a of g.c(ge).att.slice()) g.put(a, 'discard'); g.resetCard(ge); g.put(ge, 'pset'); g.shuffle(g.p.deck); g.log('걱정 많은 아버지: 조지 스테이시를 따로 둡니다', 'warn'); }
    g.put(u, 'pobl');
  },
    actions: [{ timing: 'alter', label: '그웬 소진·이 카드 제거 → 조지 스테이시를 손으로', can: (g, u) => g.c(u).zone === 'pobl' && !g.c(g.idt()).ex, async use(g, u) {
      g.c(g.idt()).ex = true; g.removeFromGame(u); const ge = (g.p.pset || []).find(x => idOf(g, x) === '27007'); if (ge) g.put(ge, 'hand');
    } }] };
  S['27026'] = { on: { villainPhaseBegins(g) { for (const e of g.enemies()) if (g.c(e).dmg) g.heal(e, 1); g.log('재생 연구: 각 적 피해 1 회복', 'warn'); } } }; // Regenerative Research
  S['27027'] = { on: { villainPhaseBegins(g, u) { if (g.c(u).dmg) { g.heal(u, 1); g.log('리저드: 피해 1 회복'); } } } }; // The Lizard
  const mostHpMinion = g => { const m = g.e.minions; if (!m.length) return null; const top = Math.max(...m.map(x => g.hpLeft(x))); return m.find(x => g.hpLeft(x) === top); };
  S['27028'] = { attachTo: mostHpMinion, surgeIfNoHost: true, mod: { hp: (g, s, t) => t === g.c(s).on ? 4 : 0 }, grantTrait: (g, s, t) => t === g.c(s).on ? 'CREATURE' : null }; // Experimental Injection
  S['27029'] = { async whenRevealed(g, u, ctx) { const l = g.e.minions.find(m => idOf(g, m) === '27027'); if (!l) { ctx.surge++; return; } const r = await g.enemyAttack(l, {}); if (!g.attackMade(r)) ctx.surge++; } }; // In Cold Blood

  // ======================= Spider-Man (Miles Morales) =======================
  async function venomBlast(g, u) { if (!g.enemies().length) return; const t = await g.chooseTarget('enemy', '베놈 블라스트: 피해 2 + 기절', g.idt(), false); if (!t) return; await g.dealDamage(t, 2, { src: u || g.idt(), byPlayer: true }); if (g.c(t).zone) g.giveStatus(t, 'stun', '베놈 블라스트'); }
  async function camouflage(g) { g.giveStatus(g.idt(), 'tough', '스파이더 위장'); if (!g.enemies().length) return; const t = await g.chooseTarget('enemy', '스파이더 위장: 혼란시킬 적', g.idt(), false); if (t) g.giveStatus(t, 'conf', '스파이더 위장'); }
  S['27030a'] = {};
  S['27030b'] = { respond: [{ window: 'afterChangeForm', label: '버림 더미의 스파이더맨 카드 1장을 덱에 섞기', can: (g, u, ctx) => ctx.form === 'alter' && g.p.discard.some(x => g.d(x).cls === 'Hero'), async resolve(g) { const t = await pick(g, g.p.discard.filter(x => g.d(x).cls === 'Hero'), '덱에 섞을 스파이더맨 카드'); if (t) { g.put(t, 'deck'); g.shuffle(g.p.deck); } } }] };
  S['27031'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { const c = g.c(ctx.target); const n = 2 + (c.stun ? 3 : 0) + (c.conf ? 3 : 0); await g.playerAttack(g.idt(), ctx.target, n, { src: u }); } } }; // Arachnobatics
  S['27032'] = { play: { timing: 'action', can: g => !g.p.usedOnce.doubleLife && !g.formLocked(), async resolve(g, u, ctx) { g.p.usedOnce.doubleLife = true; await g.changeForm(true); if (paidWith(ctx.paid, 'R') && g.canReady(g.idt())) g.c(g.idt()).ex = false; } } }; // Double Life
  S['27033'] = { play: { timing: 'hero', label: 'thwart', target: 'thwartable', async resolve(g, u, ctx) { const r = await g.removeThreat(ctx.target, 4, { src: u }); g.log(`스윙 인: 위협 ${r} 제거`); await g.afterThreatRemoved(ctx.target); if (paidWith(ctx.paid, 'B') && isMiles(g)) await camouflage(g); } } }; // Swing In
  S['27034'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { await g.playerAttack(g.idt(), ctx.target, 4, { src: u }); if (paidWith(ctx.paid, 'Y') && isMiles(g)) await venomBlast(g, u); } } }; // Web-Shot
  S['27035'] = { actions: [{ timing: 'action', exhaust: true, label: '소진 → 카드 1장 뽑기 (히어로 모습이면 1장 버림)', async use(g) { await g.draw(1); if (g.isHero() && g.p.hand.length) await g.discardFromHand(1, 1, '갱키 리: 버릴 카드'); } }] }; // Ganke Lee
  S['27036'] = { actions: [{ timing: 'alter', exhaust: true, label: '소진 → 위협이 가장 적은 음모에서 위협 1 제거', async use(g, u) { // Jefferson Davis
    const sc = g.schemes(); const lo = Math.min(...sc.map(x => g.c(x).threat)); const t = await pick(g, sc.filter(x => g.c(x).threat === lo), '위협 1을 제거할 음모'); if (t) { await g.removeThreat(t, 1, { src: u }); await g.afterThreatRemoved(t); }
  } }] };
  S['27037'] = { respond: [{ window: 'afterBasicPower', timing: 'hero', label: '버리기 → 베놈 블라스트', can: g => isMiles(g), async resolve(g, u) { g.discard(u); await venomBlast(g, u); } }] }; // Power Within
  S['27038'] = { respond: [{ window: 'afterBasicPower', timing: 'hero', label: '버리기 → 스파이더 위장', can: g => isMiles(g), async resolve(g, u) { g.discard(u); await camouflage(g); } }] }; // Defense Mechanism
  S['27039'] = { resources: [{ gen: 'G', label: '웹 슈터 (소진·웹 1)', can: (g, u) => g.isHero() && !g.c(u).ex && (g.c(u).cnt.web || 0) > 0, use: (g, u) => { g.c(u).ex = true; g.c(u).cnt.web--; } }] }; // Web-Shooter (Miles)
  S['27056'] = { async whenRevealed(g, u, ctx) { // Keeping Secrets
    await g.heroObligation(u, '비밀 지키기', '갱키 리와 제퍼슨 데이비스 버림 (둘 다 없으면 쇄도) → 이 카드 버림', async () => {
      const c = g.p.supports.filter(x => ['27035', '27036'].includes(idOf(g, x))); c.forEach(x => g.discard(x, `${g.nm(x)} 버림`)); if (!c.length) ctx.surge++;
      if (g.c(u).zone === 'limbo') g.discard(u);
    });
  } };
  S['27057'] = { icons: (g, u) => ({ accel: 1 + (g.c(u).cnt.accel || 0) }), whenRevealed(g, u) { if (!g.isHero()) { g.c(u).cnt.accel = (g.c(u).cnt.accel || 0) + 1; g.log('먹잇감 추적: 가속 토큰 +1', 'warn'); } } }; // Tracking Prey
  S['27058'] = { whenRevealed(g, u) { if (!g.isHero()) g.giveStatus(u, 'tough', '프라울러'); } }; // Prowler
  S['27059'] = { attachTo: g => { const m = g.e.minions; if (!m.length) return null; const top = Math.max(...m.map(x => g.d(x).hp || 0)); return m.find(x => (g.d(x).hp || 0) === top); }, surgeIfNoHost: true, attackProps: () => ({ piercing: true }) }; // Razor Claws
  S['27060'] = { async whenRevealed(g, u, ctx) { // Slice and Dice
    const p = g.e.minions.find(m => idOf(g, m) === '27058'); if (!p) { ctx.surge++; return; }
    const allies0 = g.p.allies.slice(); const r = await g.enemyAttack(p, {});
    if (!g.attackMade(r) || allies0.some(a => g.c(a).zone !== 'ally')) ctx.surge++;
  } };

  // ======================= Protection / Justice / Basic =======================
  S['27010'] = { async onPlay(g) { if (!webWarriors(g).some(x => idOf(g, x) !== '27010')) return; const t = g.e.deck.find(x => g.d(x).type === 'treachery'); g.shuffle(g.e.deck); if (t) { g.put(t, 'ediscard'); g.log(`실크: 조우 덱의 ${g.nm(t)} 버림`, 'good'); } } }; // Silk
  S['27011'] = { async onPlay(g) { if (webWarriors(g).length < 3 || !g.enemies().length) return; const t = await g.chooseTarget('enemy', '스파이더맨: 기절·혼란시킬 적', g.idt(), false); if (t) { g.giveStatus(t, 'stun', '스파이더맨'); g.giveStatus(t, 'conf', '스파이더맨'); } } }; // Spider-Man (Protection)
  S['27012'] = { respond: [{ window: 'afterAllyDefends', label: '공격한 적에게 [웹 워리어] 수만큼 피해', can: (g, u, ctx) => ctx.ally === u && g.c(ctx.enemy) && !!g.c(ctx.enemy).zone, async resolve(g, u, ctx) { await g.dealDamage(ctx.enemy, webWarriors(g).length, { src: u, byPlayer: true }); } }] }; // Spider-UK
  S['27014'] = { interrupt: { window: 'identityWouldTakeDamage', timing: 'hero', label: 'defense', can: (g, u, ctx) => ctx.amount - ctx.prevent > 0, async resolve(g, u, ctx, paid) { ctx.prevent = Math.min(ctx.amount, ctx.prevent + 2); if (paidWith(paid, 'Y') && g.e.main) { await g.removeThreat(g.e.main, 2, { src: u }); } } } }; // Jump Flip
  S['27015'] = { play: { timing: 'hero', label: 'attack', can: g => !!g.e.villain, async resolve(g, u) { // Return the Favor
    const t = g.discardEncounterUntil(d => d.type === 'treachery'); if (t) await g.reveal(t);
    if (g.e.villain && g.targets('attackable', g.idt()).includes(g.e.villain)) await g.playerAttack(g.idt(), g.e.villain, 5, { src: u });
  } } };
  S['27016'] = { play: { timing: 'hero', can: g => g.c(g.idt()).dmg > 0, async resolve(g) { g.heal(g.idt(), 2); if (g.canReady(g.idt())) g.c(g.idt()).ex = false; } } }; // What Doesn't Kill Me
  const leaveDig = { respond: [{ window: 'allyDefeated', label: '조우 덱 위 3장 버리고 강화 아이콘만큼 빌런 피해', can: (g, u, ctx) => ctx.ally === u, async resolve(g, u) { // Spider-Man (Basic)
    let n = 0; for (let i = 0; i < 3; i++) { const x = g.takeEncounter(); if (!x) break; g.put(x, 'ediscard'); n += g.boostOf(x); } if (n && g.e.villain) await g.dealDamage(g.e.villain, n, { src: u, byPlayer: true });
  } }] };
  S['27017'] = Object.assign({ canPlay: g => webWarriors(g).length > 0 }, leaveDig);
  S['27018'] = { play: { timing: 'hero', can: g => webWarriors(g).some(x => !g.c(x).ex) && g.p.discard.some(x => g.d(x).type === 'ally' && (g.d(x).tr || []).includes('WEB-WARRIOR')), async resolve(g) { // Across the Spider-Verse
    let pi = g.s.ctx;
    for (let rep = 0; rep < 5; rep++) {
      let cont = false;
      await g.withPlayer(pi, async () => {
        const w = await pick(g, webWarriors(g).filter(x => !g.c(x).ex), '소진할 [웹 워리어] 카드'); if (!w) return; g.c(w).ex = true;
        const a = await pick(g, g.p.discard.filter(x => g.d(x).type === 'ally' && (g.d(x).tr || []).includes('WEB-WARRIOR')), '플레이에 내놓을 [웹 워리어] 동료'); if (a) await g.putAllyIntoPlay(a);
        const nextPi = await g.choosePlayer('스파이더버스를 넘어: 반복할 플레이어');
        await g.withPlayer(nextPi, async () => {
          if (!webWarriors(g).some(x => !g.c(x).ex) || !g.p.discard.some(x => g.d(x).type === 'ally' && (g.d(x).tr || []).includes('WEB-WARRIOR')) || !g.canAfford({ n: 3, req: '' }, null)) return;
          if (await g.ask({ type: 'choice', title: `스파이더버스를 넘어(${g.playerName()}): 자원 3을 내고 반복할까요?`, options: [{ id: 'y', label: '자원 3 지불하고 반복' }, { id: 'n', label: '그만' }] }) !== 'y') return;
          if (!(await g.pay({ n: 3, req: '' }, null, '스파이더버스를 넘어: 반복', true))) return;
          pi = nextPi; cont = true;
        });
      });
      if (!cont) return;
    }
  } } };
  S['27019'] = { play: { timing: 'alter', async resolve(g) { g.heal(g.idt(), 3); g.log('풋사랑: 피해 3 회복', 'good'); } } }; // Young Love
  S['27023'] = { selfCostMod: (g, u) => has(g, g.idt(), 'WEB-WARRIOR') ? (g.d(u).cost || 0) : 0, // Web of Life and Destiny
    respond: [{ window: 'allyDefeated', label: '플레이어를 골라 카드 1장 뽑기', can: (g, u, ctx) => (g.d(ctx.ally).tr || []).includes('WEB-WARRIOR'), async resolve(g) { const pi = await g.choosePlayer('생명과 운명의 거미줄: 카드 1장을 뽑을 플레이어'); await g.withPlayer(pi, () => g.draw(1)); } }] };
  S['27024'] = { actions: [{ timing: 'hero', exhaust: true, label: '소진·손 무작위 1장 버림 → 적에게 피해 2', can: g => g.p.hand.length > 0 && g.enemies().length > 0, async use(g, u) { discardRandomHand(g); await dmgEnemy(g, 2, '플랜 B: 피해 2를 줄 적', u); } }] }; // Plan B
  S['27040'] = { async onEnter(g) { // Monica Chang
    const st = g.p.deck.concat(g.p.hand, g.p.discard).find(x => idOf(g, x) === '01064' || g.d(x).link === '01064' || idOf(g, x) === '27045');
    if (st) { g.put(st, 'support'); const d = g.d(st); if (d.uses) g.c(st).cnt[d.uses.kind] = d.uses.n; g.shuffle(g.p.deck); g.log('모니카 창: 감시팀을 플레이에 놓습니다', 'good'); }
    for (const x of g.p.supports) if (['01064', '27045'].includes(idOf(g, x)) || g.d(x).link === '01064') g.c(x).cnt.snoop = (g.c(x).cnt.snoop || 0) + 1;
  } };
  S['27041'] = { selfCostMod: g => g.enemies().filter(e => g.c(e).conf).length }; // Spider-Woman (Justice)
  const shieldReady = g => g.controlled().filter(u => has(g, u, 'S.H.I.E.L.D') && !g.c(u).ex);
  S['27042'] = { play: { timing: 'action', can: g => shieldReady(g).length > 0 && g.schemes().some(x => g.c(x).threat > 0), async resolve(g, u) { // Homeland Intervention
    const c = shieldReady(g); const sel = c.length <= 1 ? c : await g.ask({ type: 'select', title: '소진할 [S.H.I.E.L.D.] 카드 (최대 3)', cards: c, min: 1, max: Math.min(3, c.length), confirm: '확정' });
    (sel || []).forEach(x => { g.c(x).ex = true; }); const n = 2 * (sel || []).length; if (n) await g.removeThreatChoose(n, `본토 개입: 위협 ${n}을 제거할 음모`, u);
  } } };
  S['27043'] = { play: { timing: 'action', can: g => shieldReady(g).length > 0, async resolve(g) { // Global Logistics
    const w = await pick(g, shieldReady(g), '소진할 [S.H.I.E.L.D.] 카드'); if (!w) return; g.c(w).ex = true;
    const opts = g.livingPlayers().map(pi => ({ id: `p:${pi}`, label: `${g.playerName(pi)}의 덱` })).concat([{ id: 'e', label: '조우 덱' }]);
    const k = await g.ask({ type: 'choice', title: '세계 물류: 어느 덱?', options: opts });
    const deck = k === 'e' ? g.e.deck : g.s.ps[+k.slice(2)].deck; const top = deck.slice(0, 4); if (!top.length) return;
    const dis = await g.ask({ type: 'select', title: '버릴 카드 (나머지는 덱 위에 그대로)', cards: top, min: 0, max: top.length, confirm: '확정' }) || [];
    for (const x of dis) g.put(x, k === 'e' ? 'ediscard' : 'discard'); g.log(`세계 물류: ${dis.length}장 버림`);
  } } };
  S['27044'] = { respond: [{ window: 'allyWouldTakeDamage', timing: 'hero', exhaust: true, label: '소진·지원 1 → 후속 피해 1 방지', can: (g, u, ctx) => ctx.consequential && has(g, ctx.target, 'S.H.I.E.L.D') && (g.c(u).cnt.backup || 0) > 0 && ctx.amount - ctx.prevent > 0, // Field Agent
    async resolve(g, u, ctx) { g.c(u).cnt.backup--; ctx.prevent++; g.cleanupUses(u); } }] };
  S['27046'] = { on: { async allyBasicPower(g, u, ctx) { if (ctx.ally !== u) return; const c = g.p.supports.filter(x => has(g, x, 'S.H.I.E.L.D') && g.c(x).ex); const t = await pick(g, c, '★ 에이전트 13: 준비시킬 [S.H.I.E.L.D.] 지원'); if (t && g.canReady(t)) g.c(t).ex = false; } } }; // Agent 13
  S['27047'] = { respond: [{ window: 'allyPowerUsed', label: '[S.H.I.E.L.D.] 카드를 최대 3장 소진 → 1장당 +1', can: (g, u, ctx) => ctx.ally === u && shieldReady(g).some(x => x !== u), async resolve(g, u, ctx) { // Dum Dum Dugan
    const c = shieldReady(g).filter(x => x !== u); const sel = await g.ask({ type: 'select', title: '소진할 [S.H.I.E.L.D.] 카드 (최대 3)', cards: c, min: 0, max: Math.min(3, c.length), confirm: '확정' }) || [];
    sel.forEach(x => { g.c(x).ex = true; }); ctx.bonus += sel.length;
  } }] };
  S['27048'] = { canPlay: g => webWarriors(g).length > 0, respond: [{ window: 'allyDefeated', label: '덱에서 정체성 전용 이벤트를 손으로', can: (g, u, ctx) => ctx.ally === u, async resolve(g) { await g.searchToHand(d => d.type === 'event' && d.cls === 'Hero', '고스트 스파이더'); } }] }; // Ghost-Spider (ally)
  S['27049'] = { on: { async allyBasicPower(g, u, ctx) { if (ctx.ally !== u) return; const c = g.allFriendlyChars().filter(f => f !== u && g.c(f).ex && has(g, f, 'WEB-WARRIOR')); const t = await pick(g, c, '스파이더맨: 준비시킬 다른 [웹 워리어] 캐릭터'); if (t && g.canReady(t)) g.c(t).ex = false; } } }; // Spider-Man (Basic, YBR)
  S['27054'] = { actions: [{ timing: 'hero', exhaust: true, label: '소진 → 손의 [S.H.I.E.L.D.] 카드를 비용 1 줄여 플레이', can: g => g.p.hand.some(x => has(g, x, 'S.H.I.E.L.D')), async use(g) { // Government Liaison
    g.p.costRed = 1; const c = g.p.hand.filter(x => has(g, x, 'S.H.I.E.L.D') && g.canPlay(x)); const t = await pick(g, c, '플레이할 [S.H.I.E.L.D.] 카드'); if (t) await g.playCard(t); g.p.costRed = 0;
  } }] };
  S['27055'] = { respond: [{ window: 'cardPlayedDone', exhaust: true, label: '소진 → 적에게 피해 2', can: (g, u, ctx) => has(g, ctx.card, 'S.H.I.E.L.D') && g.enemies().length > 0, async resolve(g, u) { await dmgEnemy(g, 2, '하늘 파괴자: 피해 2를 줄 적', u); } }] }; // Sky-Destroyer

  // ======================= City in Chaos =======================
  S['27127'] = { blankTrait: ['LOCATION', 'PERSONA'], blankType: 'support' }; // Panic in the Streets
  S['27128'] = { attackProps: () => ({ overkill: true, piercing: true }) }; // Rhino (minion)
  S['27129'] = { async whenRevealed(g) { // Calling in Favors
    const r = g.e.minions.find(m => idOf(g, m) === '27128');
    if (r) { await g.enemyScheme(r, { schBonus: 2 }); return; }
    const x = g.searchEncounter(d => d.id === '27128'); g.shuffle(g.e.deck); if (x) await g.enterMinion(x, {}, true);
  } };
  S['27130'] = { async whenRevealed(g) { // Now or Never
    const can = g.friendlyChars().some(f => !g.c(f).ex) && g.canAfford({ n: 1, req: '' }, null);
    const k = can ? await g.ask({ type: 'choice', title: '지금 아니면 끝', options: [{ id: 'acc', label: '주 음모에 가속 토큰 1' }, { id: 'ex', label: '캐릭터 1명 소진 + 자원 1 지불' }] }) : 'acc';
    if (k === 'ex') { const t = await pick(g, g.friendlyChars().filter(f => !g.c(f).ex), '소진할 캐릭터'); if (t && await g.pay({ n: 1, req: '' }, null, '지금 아니면 끝: 자원 1', false)) { g.c(t).ex = true; return; } }
    g.addAccel(); g.log('주 음모에 가속 토큰 +1', 'warn');
  } };

  // ======================= Down to Earth =======================
  S['27131'] = { actions: [{ timing: 'alter', label: '[물리] → 이 하수인에게 피해 3', cost: { n: 1, req: 'R' }, can: (g, u) => g.c(u).zone === 'minion', async use(g, u) { // Common Criminal
    await g.dealDamage(u, 3, { src: g.idt(), byPlayer: true });
    if (g.c(u).zone !== 'minion') { const opts = [{ id: 'd', label: '카드 1장 뽑기' }]; if (g.e.sides.some(x => g.c(x).threat > 0)) opts.push({ id: 's', label: '부가 음모 위협 3 제거' });
      const k = opts.length === 1 ? 'd' : await g.ask({ type: 'choice', title: '흔한 범죄자', options: opts });
      if (k === 's') { const s = await pick(g, g.e.sides.filter(x => g.c(x).threat > 0), '위협 3을 제거할 부가 음모'); if (s) { await g.removeThreat(s, 3, { src: g.idt() }); await g.afterThreatRemoved(s); } } else await g.draw(1); }
  } }] };
  S['27132'] = { // Friends and Family (stays in your play area)
    whenRevealed(g, u) { g.put(u, 'pobl'); g.log('친구와 가족: 히어로 모습일 때 이벤트 비용 +1', 'warn'); },
    costMod: (g, s, uid) => g.c(s).zone === 'pobl' && g.isHero() && g.d(uid).type === 'event' ? -1 : 0,
    actions: [{ timing: 'alter', label: '손의 정체성 전용 카드 1장 버림 → 이 카드 버림', can: (g, u) => g.c(u).zone === 'pobl' && g.p.hand.some(x => g.d(x).cls === 'Hero'), async use(g, u) { const t = await pick(g, g.p.hand.filter(x => g.d(x).cls === 'Hero'), '버릴 정체성 전용 카드'); if (t) { g.put(t, 'discard'); g.discard(u, '친구와 가족 버림'); } } }]
  };
  S['27133'] = { noThwart: true, actions: [{ timing: 'alter', label: '자원 2 → 회복력만큼 위협 제거', cost: { n: 2, req: '' }, can: (g, u) => g.c(u).zone === 'side' && g.c(u).threat > 0, async use(g, u) { // Volunteer Work
    const n = g.stat(g.idt(), 'rec') || 0; await g.removeThreat(u, n, { src: g.idt() }); if (has(g, g.idt(), 'CIVILIAN')) await g.draw(1); await g.afterThreatRemoved(u);
  } }] };
  S['27134'] = { async whenRevealed(g) { // "Threat or Menace?"
    if (!g.formLocked() && await g.ask({ type: 'choice', title: '"위협인가 공포인가?": 모습을 바꿀 수 있습니다', options: [{ id: 'y', label: '모습 바꾸기' }, { id: 'n', label: '그대로' }] }) === 'y') await g.changeForm(true);
    if (g.isHero()) await g.placeThreat(g.e.main, 2, {}); else { g.p.formLock = g.s.phase === 'player' ? 2 : 1; g.log('다음 턴 동안 모습을 바꿀 수 없습니다', 'warn'); }
  } };
  S['27135'] = { async whenRevealed(g, u, ctx) { // Loose Ends
    const H = MC.heroes[g.p.heroKey || g.s.heroKey] || {}; const ob = H.obligation;
    const pool = g.e.deck.concat(g.e.discard, g.e.setaside || [], g.e.aside || [], g.s.removed || []); const x = pool.find(y => idOf(g, y) === ob);
    g.shuffle(g.e.deck); if (!x) { ctx.surge++; return; }
    const wasHero = g.isHero(); await g.reveal(x); if (wasHero && !g.isHero()) discardRandomHand(g);
  } };

  // ======================= Goblin Gear =======================
  S['27136'] = { // Advanced Glider
    attachTo: g => g.e.villain,
    on: { async hostActivated(g, a, ctx) { if (g.p.usedOnce.glider) return; g.p.usedOnce.glider = true; g.log('고급 글라이더: 빌런이 다시 활성화합니다', 'warn'); if (g.c(ctx.enemy).zone) await g.activate(ctx.enemy, {}); } },
    actions: [{ timing: 'hero', label: '손의 [공격] 카드들(비용 합 3 이상) 버림 → 이 카드 버림', can: g => g.p.hand.filter(x => (g.d(x).tr || []).includes('ATTACK')).reduce((t, x) => t + (g.d(x).cost || 0), 0) >= 3, async use(g, u) {
      const c = g.p.hand.filter(x => (g.d(x).tr || []).includes('ATTACK')); const sel = await g.ask({ type: 'select', title: '버릴 [공격] 카드 (비용 합 3 이상)', cards: c, min: 1, max: c.length, confirm: '확정' }) || [];
      if (sel.reduce((t, x) => t + (g.d(x).cost || 0), 0) < 3) { g.log('비용 합이 3 미만입니다'); return; } sel.forEach(x => g.put(x, 'discard')); g.discard(u, '고급 글라이더 버림');
    } }]
  };
  const bomb = fx => ({ attachTo: g => g.e.villain, on: { async afterEnemyAttack(g, a, ctx) { if (ctx.enemy !== g.c(a).on || ctx.enemy !== g.e.villain || !((g.c(a).cnt.bomb || 0) > 0)) return; g.c(a).cnt.bomb--; await fx(g); g.cleanupUses(a); } } });
  S['27137'] = bomb(async g => { const up = await pick(g, g.p.upgrades.filter(x => !g.c(x).ex), '★ 진동 폭탄: 소진할 업그레이드'); if (up) g.c(up).ex = true; const sp = await pick(g, g.p.supports.filter(x => !g.c(x).ex), '★ 진동 폭탄: 소진할 지원'); if (sp) g.c(sp).ex = true; }); // Concussive Bombs
  S['27138'] = bomb(async g => { await g.indirectDamage(2, null); }); // Incendiary Bombs
  S['27139'] = bomb(async g => { const ev = g.p.hand.filter(x => g.d(x).type === 'event'); if (!ev.length) return; const lo = Math.min(...ev.map(x => g.d(x).cost || 0)); const t = await pick(g, ev.filter(x => (g.d(x).cost || 0) === lo), '★ 연막탄: 버릴 이벤트'); if (t) { g.put(t, 'discard'); g.log(`${g.nm(t)} 버림`); } }); // Smoke Bombs
  S['27140'] = { surgeFor: (g, s, x) => g.d(x).type === 'attachment' && (g.d(x).tr || []).includes('TECH') }; // Limitless Supply
  S['27141'] = { async whenRevealed(g) { // Remote Navigation
    const gl = g.e.villain && g.c(g.e.villain).att.find(a => idOf(g, a) === '27136');
    if (gl) { await g.activate(g.e.villain, {}); return; }
    const x = g.searchEncounter(d => d.id === '27136'); g.shuffle(g.e.deck); if (x) await g.reveal(x);
  }, boostEffect(g, u, ctx) { ctx.extraBoost = (ctx.extraBoost || 0) + 2; } };

  // ======================= Guerrilla Tactics =======================
  S['27142'] = { noSideThwart: true, whenRevealed(g, u) { if (g.s.scen.expert) g.giveStatus(u, 'tough', '실물 크기 미끼'); }, // Life-Size Decoy
    boostEffect(g, u, ctx) { (ctx.post || ctx.after).push(async gg => { if (gg.c(u).zone && gg.c(u).zone !== 'minion') await gg.enterMinion(u, {}, true); }); } };
  S['27143'] = { accelBonus: g => g.enemies().length, async boostEffect(g) { for (const s of g.schemes().slice()) await g.placeThreat(s, 1, {}); if (g.s.scen.expert) await g.placeThreat(g.e.main, 1, {}); } }; // Coordinated Effort
  S['27144'] = { hazardBonus: g => g.enemies().length, async boostEffect(g) { await g.forEachPlayer(() => g.indirectDamage(1, null)); if (g.s.scen.expert) await g.withPlayer(g.s.first, () => g.indirectDamage(1, null)); } }; // Hidden in Shadow
  S['27145'] = { mod: { sch: (g, s, t) => g.enemies().includes(t) ? 1 : 0, atk: (g, s, t) => g.enemies().includes(t) ? 1 : 0 }, boostEffect(g) { return g.s.scen.expert ? 2 : 0; } }; // Teamwork Makes the Dream Work
  S['27146'] = { async whenRevealed(g, u, ctx) { if (g.s.scen.expert) ctx.surge++; const n = g.enemies().length; if (n) await g.placeThreat(g.e.main, n, {}); } }; // From Every Direction

  // ======================= Osborn Tech =======================
  const osborn = extra => Object.assign({ attachTo: g => g.e.villain }, extra);
  S['27147'] = osborn({ attackProps: () => ({ overkill: true, piercing: true }), actions: [{ timing: 'hero', label: '비용이 가장 높은 업그레이드 버림 → 이 카드 버림', can: g => g.controlled().some(x => g.d(x).type === 'upgrade' && !g.d(x).permanent), async use(g, u) { // Arm Cannon
    const c = g.controlled().filter(x => g.d(x).type === 'upgrade' && !g.d(x).permanent); const hi = Math.max(...c.map(x => g.d(x).cost || 0)); const t = await pick(g, c.filter(x => (g.d(x).cost || 0) === hi), '버릴 업그레이드'); g.discard(t); g.discard(u, '팔 대포 버림'); } }] });
  S['27148'] = osborn({ on: { async afterEnemyAttack(g, a, ctx) { if (ctx.enemy === g.c(a).on && (ctx.damaged || []).includes(g.idt())) await g.placeThreat(g.e.main, 2, {}); } }, // Ionic Boots
    actions: [{ timing: 'hero', label: '[에너지][정신][물리] → 이 카드 버림', cost: { n: 3, req: 'YBR' }, async use(g, u) { g.discard(u, '이온 부츠 버림'); } }] });
  S['27149'] = osborn({ mod: { retaliate: (g, s, t) => t === g.c(s).on ? 1 : 0 }, actions: [{ timing: 'hero', label: '간접 피해 3 → 이 카드 버림', async use(g, u) { await g.indirectDamage(3, null); g.discard(u, '운동 갑옷 버림'); } }] }); // Kinetic Armor
  S['27150'] = osborn({ on: { wouldTakeDamage(g, a, ctx) { if (ctx.target === g.c(a).on && ctx.attack && ctx.amount - ctx.prevent > 0) ctx.prevent++; } }, // Neocarbon Scales
    actions: [{ timing: 'hero', label: '빌런에게 강인함과 뒷면 강화 1 → 이 카드 버림', async use(g, u) { const v = g.c(u).on; g.giveStatus(v, 'tough', '네오카본 비늘'); g.giveFacedownBoost(1); g.discard(u, '네오카본 비늘 버림'); } }] });
  S['27151'] = osborn({ actions: [{ timing: 'hero', label: '빌런이 공격 → 피해를 안 받으면 이 카드 버림', async use(g, u) { // Spiked Gauntlet
    const v = g.c(u).on; const before = g.c(g.idt()).dmg; await g.enemyAttack(v, {}); if (g.c(g.idt()).dmg <= before && g.c(u).zone) g.discard(u, '가시 건틀릿 버림');
  } }] });
  S['27152'] = osborn({ cannotBeDefended: (g, s, enemy) => enemy === g.c(s).on, // Tracking Display
    actions: [{ timing: 'hero', label: '캐릭터 1명 소진·손 무작위 1장 버림 → 이 카드 버림', can: g => g.friendlyChars().some(f => !g.c(f).ex) && g.p.hand.length > 0, async use(g, u) { const t = await pick(g, g.friendlyChars().filter(f => !g.c(f).ex), '소진할 캐릭터'); g.c(t).ex = true; discardRandomHand(g); g.discard(u, '추적 디스플레이 버림'); } }] });

  // ======================= Personal Nightmare =======================
  const idCards = g => g.p.hand.filter(x => g.d(x).cls === 'Hero');
  S['27153'] = { attachTo: g => g.idt(), blankHost: true, // Induced Panic
    actions: [{ timing: 'alter', label: '손의 정체성 전용 카드 무작위 1장 버림 → 이 카드 버림', can: g => idCards(g).length > 0, async use(g, u) { const c = idCards(g); const t = c[Math.floor(g.rand() * c.length)]; g.put(t, 'discard'); g.log(`무작위로 ${g.nm(t)} 버림`); g.discard(u, '유도된 공포 버림'); } }] };
  S['27154'] = { mod: { sch: (g, s, t) => t === s ? idCards(g).length : 0, atk: (g, s, t) => t === s ? idCards(g).length : 0 }, async boostEffect(g) { await g.draw(3); for (let i = 0; i < 3; i++) discardRandomHand(g); } }; // Evil Doppelganger
  S['27155'] = { mod: { hs: (g, s, t) => t === g.idt() ? 2 : 0 } }; // Fool's Paradise
  S['27156'] = { async whenRevealed(g, u) { const n = g.p.hand.length; if (n) await g.placeThreat(u, n, {}); } }; // Weakness from Within
  S['27157'] = { async whenRevealed(g) { // Deepest Fears
    const n = g.p.hand.length; let idn = 0; for (let i = 0; i < n && g.p.deck.length; i++) { const x = g.p.deck[0]; g.put(x, 'discard'); if (g.d(x).cls === 'Hero') idn++; }
    g.log(`가장 깊은 공포: 덱 위 ${n}장 버림`); if (idn) await g.placeThreat(g.e.main, 1, {}); else await g.dealDamage(g.idt(), 1, {});
  } };

  // ======================= Sinister Assault =======================
  S['27158'] = { on: { async enemyActivated(g, u, ctx) { if (ctx.enemy === u && g.c(u).zone === 'minion') for (const s of g.schemes().slice()) await g.placeThreat(s, 1, {}); } } }; // Doctor Octopus (minion)
  const electroDig = g => { const seen = []; while (g.p.deck.length) { const x = g.p.deck[0]; g.put(x, 'discard'); seen.push(x); if (/[YG]/.test(g.d(x).res || '') && g.d(x).type === 'resource') break; if (/[YG]/.test(g.d(x).res || '')) break; } g.log(`★ 일렉트로: 덱 위 ${seen.length}장 버림`); };
  S['27159'] = { on: { minionEnters(g, u, ctx) { if (ctx.minion === u) electroDig(g); }, enemyActivated(g, u, ctx) { if (ctx.enemy === u && g.c(u).zone === 'minion') electroDig(g); } } }; // Electro (minion)
  S['27160'] = { on: { async afterEnemyAttack(g, u, ctx) { if (ctx.enemy === u) await g.indirectDamage(2, u); } } }; // Hobgoblin (minion)
  S['27161'] = { on: { async afterEnemyAttack(g, u, ctx) { if (ctx.enemy !== u || !(ctx.damaged || []).length) return; const c = g.p.upgrades.concat(g.p.supports, ...g.friendlyChars().map(f => g.c(f).att.filter(a => !g.d(a).enc))).filter(x => !g.d(x).permanent); const t = await pick(g, c, '★ 크레이븐: 버릴 업그레이드 또는 지원'); if (t) g.discard(t, `${g.nm(t)} 버림`); } } }; // Kraven (minion)
  S['27162'] = { on: { async afterEnemyAttack(g, u, ctx) { if (ctx.enemy !== u) return; for (const t of ctx.damaged || []) { if (!g.c(t).zone) continue; if (g.c(t).stun) await g.dealDamage(t, 2, { src: u }); else g.giveStatus(t, 'stun', '★ 스콜피온'); } } } }; // Scorpion (minion)
  S['27163'] = { on: { enemyActivated(g, u, ctx) { if (ctx.enemy === u && g.c(u).zone === 'minion') discardRandomHand(g); } } }; // Vulture (minion)

  // ======================= Symbiotic Strength =======================
  S['27164'] = { attachTo: g => g.e.villain, actions: [{ timing: 'hero', label: '[정신][물리][에너지] → 이 카드 버림', cost: { n: 3, req: 'BRY' }, async use(g, u) { g.discard(u, '즉석 무기 버림'); } }] }; // Improvised Weapons
  S['27165'] = { attachTo: g => g.e.villain, on: { afterTakeDamage(g, a, ctx) { if (ctx.target !== g.c(a).on || !ctx.attack) return; g.giveFacedownBoost(1); if (ctx.amount >= 3) g.discard(a, '폭력적 성향 버림'); } } }; // Violent Tendencies
  S['27166'] = { attachTo: g => g.idt(), blocksHeroAttack: true, // Webbed Up
    boostEffect(g) { if (g.c(g.idt()).stun) return g.dealDamage(g.idt(), 2, {}); g.giveStatus(g.idt(), 'stun', '★ 거미줄에 묶임'); } };
  const suitOn = (g, s, t) => t === g.idt() && g.c(s).zone === 'upgrade'; // Symbiote Suit: +1 to each basic power, hand size +1, hit points +10
  S['27191'] = { mod: { atk: (g, s, t) => suitOn(g, s, t) ? 1 : 0, thw: (g, s, t) => suitOn(g, s, t) ? 1 : 0, def: (g, s, t) => suitOn(g, s, t) ? 1 : 0, rec: (g, s, t) => suitOn(g, s, t) ? 1 : 0, hs: (g, s, t) => suitOn(g, s, t) ? 1 : 0, hp: (g, s, t) => suitOn(g, s, t) ? 10 : 0 } };
  S['27167'] = { boostEffect(g, u, ctx) { (ctx.post || ctx.after).push(async gg => { if (gg.c(u).zone && gg.c(u).zone !== 'minion') await gg.enterMinion(u, {}, true); }); } }; // Enraged Symbiote
  S['27168'] = { async whenRevealed(g) { // Swinging Assault
    if (!g.isHero()) { await g.changeForm(true); if (g.e.villain) await g.enemyAttack(g.e.villain, {}); return; }
    if (g.e.villain) { g.giveFacedownBoost(1); await g.enemyAttack(g.e.villain, {}); }
  } };
  S['27169'] = { whenRevealed(g) { g.giveFacedownBoost(1); }, boostEffect(g, u, ctx) { if ('undefended' in ctx) { ctx.overkill = true; return 2; } return 0; } }; // Unstable Sentience

  // ======================= Whispers of Paranoia =======================
  S['27170'] = { attachTo: g => g.idt(), // Delusion of Collusion
    blocksReady: (g, s, t) => g.c(s).on === g.idt() && (g.p.allies.includes(t) || (g.p.supports.includes(t) && has(g, t, 'PERSONA'))),
    actions: [{ timing: 'alter', label: '동료 또는 [퍼소나] 지원 1장 버림 → 이 카드 버림', can: g => g.p.allies.length > 0 || g.p.supports.some(x => has(g, x, 'PERSONA')), async use(g, u) { const t = await pick(g, g.p.allies.concat(g.p.supports.filter(x => has(g, x, 'PERSONA'))), '버릴 동료 또는 [퍼소나] 지원'); if (t) { g.discard(t); g.discard(u, '공모의 망상 버림'); } } }],
    boostEffect(g, u, ctx) { if (!('undefended' in ctx)) return; const before = g.p.allies.slice(); ctx.after.push(async gg => { for (const a of before) if (gg.c(a).zone !== 'ally') await gg.indirectDamage(gg.d(a).cost || 0, null); }); } };
  S['27171'] = { revealFirst: true, async whenRevealed(g, u, ctx) { // Manipulated Mind
    const c = g.p.allies.slice(); if (!c.length) { g.discard(u); ctx.surge++; return; }
    const lo = Math.min(...c.map(x => g.d(x).cost || 0)); const a = await pick(g, c.filter(x => (g.d(x).cost || 0) === lo), '조종당한 정신: 하수인이 될 동료');
    g.allyToMinion(a, 'MANIPULATED'); g.attachEnc(u, a);
  } };
  const nemesisOf = g => (MC.heroes[g.p.heroKey || g.s.heroKey] || {}).nemesis || [];
  S['27172'] = { revealFirst: true, mod: { hp: (g, s, t) => t === g.c(s).on ? 1 : 0 }, async whenRevealed(g, u) { // Old Grudge
    const ids = nemesisOf(g); const pool = g.e.deck.concat(g.e.discard, g.e.setaside || []); const m = pool.find(x => g.d(x).type === 'minion' && ids.includes(idOf(g, x)));
    g.shuffle(g.e.deck); if (!m) { g.discard(u); return; }
    await g.reveal(m); if (g.c(m).zone === 'minion') g.attachEnc(u, m); else g.discard(u);
  }, async boostEffect(g) { for (const x of g.friendlyChars().slice()) await g.dealDamage(x, 1, {}); } };
  S['27173'] = { async whenRevealed(g, u) { // Analysis Paralysis
    const ids = nemesisOf(g); const pool = g.e.deck.concat(g.e.discard, g.e.setaside || []); const s = pool.find(x => g.d(x).type === 'side' && ids.includes(idOf(g, x)));
    g.shuffle(g.e.deck); if (!s) return; await g.reveal(s); const n = g.c(s).zone === 'side' ? g.c(s).threat : 0; if (n) await g.placeThreat(u, n, {});
  } };


  // ======================= Scenario: Sandman =======================
  const SANDSET = new Set(['27061', '27062', '27063', '27065', '27066', '27067', '27068', '27069', '27070', '27071', '27072']);
  const streets = g => g.e.env.find(u => idOf(g, u) === '27065') || null;
  const sand = g => { const c = streets(g); return c ? (g.c(c).cnt.sand || 0) : 0; };
  const addSand = (g, n) => { const c = streets(g); if (!c) return; g.c(c).cnt.sand = (g.c(c).cnt.sand || 0) + n; };
  function surgingSands(g) { // Special: place 1 sand counter, discard that many encounter cards
    const c = streets(g); if (!c) return [];
    addSand(g, 1); const n = sand(g); const out = [];
    for (let i = 0; i < n; i++) { const x = g.takeEncounter(); if (!x) break; g.put(x, 'ediscard'); out.push(x); }
    g.log(`솟구치는 모래: 모래 ${n} → 조우 덱 ${out.length}장 버림`, 'warn'); return out;
  }
  const sandBlast = wave => ({
    attackProps: () => wave ? { overkill: true } : { indirect: true },
    onAttackStart(g) { g.e.sbDmg0 = g.c(g.idt()).dmg; },
    on: { afterEnemyAttack(g, u, ctx) { if (ctx.enemy === u && g.e.sbDmg0 != null && g.c(g.idt()).dmg > g.e.sbDmg0) { g.e.sbDmg0 = null; surgingSands(g); } } },
    async damageInstead(g, v, amount, o) { // Sand Form
      const sf = g.c(v).att.find(a => idOf(g, a) === '27066'); if (!sf || !(o && (o.byPlayer || o.attack))) return false;
      g.discard(sf, '모래 형태: 피해 대신 버립니다'); surgingSands(g); return true;
    }
  });
  S['27061'] = sandBlast(false);
  S['27062'] = Object.assign(sandBlast(false), { whenRevealed(g) { surgingSands(g); } });
  S['27063'] = Object.assign(sandBlast(true), { whenRevealed(g) { addSand(g, 1); surgingSands(g); } });
  S['27064a'] = { setup(g) { // Hapless Pedestrians: City Streets into play with 4 sand counters
    const c = g.e.deck.concat(g.e.aside || []).find(u => idOf(g, u) === '27065'); if (!c) return;
    g.put(c, 'env'); g.c(c).cnt.sand = 4; g.log('준비: 도시 거리를 플레이에 놓고 모래 카운터 4개', 'warn');
  } };
  S['27064b'] = { loseOnComplete: true, on: { async accelTokenPlaced(g, u) { if (u === g.e.main) { g.log('무력한 보행자들: 가속 토큰 → 시작 플레이어 간접 피해 3', 'warn'); await g.withPlayer(g.s.first, () => g.indirectDamage(3, null)); } } } };
  S['27065'] = { actions: [{ timing: 'hero', label: '캐릭터 1명 소진 → 공격력만큼 모래 카운터 제거 (라운드당 1번)', can: g => sand(g) > 0 && !g.p.usedOnce.streets && g.friendlyChars().some(f => !g.c(f).ex), async use(g, u) { // City Streets
    const t = await pick(g, g.friendlyChars().filter(f => !g.c(f).ex), '소진할 캐릭터'); if (!t) return; g.p.usedOnce.streets = true; g.c(t).ex = true;
    const n = Math.min(sand(g), g.stat(t, 'atk') || 0); g.c(u).cnt.sand -= n; g.log(`도시 거리: 모래 카운터 ${n}개 제거`, 'good');
  } }] };
  S['27066'] = { attachTo: g => g.e.villain, boostEffect(g, u, ctx) { (ctx.post || ctx.after).push(async gg => { if (['ediscard', 'boost'].includes(gg.c(u).zone)) await gg.reveal(u); }); } }; // Sand Form
  S['27067'] = { mod: { atk: (g, s, t) => t === s ? sand(g) : 0 }, whenDefeated(g) { surgingSands(g); } }; // Sand Clone
  S['27068'] = { whenDefeated(g) { surgingSands(g); surgingSands(g); } }; // Dirt Trap
  S['27069'] = { async whenRevealed(g, u) { const n = sand(g); if (n) await g.placeThreat(u, n, {}); } }; // Tidal Sands
  const sandslide = g => { addSand(g, 2); const out = surgingSands(g); if (out.some(x => SANDSET.has(idOf(g, x)))) g.giveStatus(g.idt(), 'stun', '모래 사태'); };
  S['27070'] = { whenRevealed: sandslide, boostEffect(g) { sandslide(g); } }; // Sandslide
  S['27071'] = { async whenRevealed(g, u) { // Sand Storm
    const n = sand(g); if (n) { await g.indirectDamage(n, null); return; }
    addSand(g, 3); g.put(u, 'edeck'); g.shuffle(g.e.deck); g.log('모래 폭풍: 모래 카운터 3개, 조우 덱에 섞습니다');
  } };
  S['27072'] = { async whenRevealed(g, u, ctx) { // Sand Smash
    if (!g.isHero()) { surgingSands(g); ctx.surge++; return; }
    if (g.e.villain) await g.enemyAttack(g.e.villain, { atkBonus: 1 });
  } };


  // ======================= Scenario: Mysterio =======================
  const isIllusion = (g, u) => (g.d(u).tr || []).includes('ILLUSION');
  const encToDeck = (g, n) => { let k = 0; for (let i = 0; i < n; i++) { const x = g.takeEncounter(); if (!x) break; g.put(x, 'deck'); k++; } g.shuffle(g.p.deck); if (k) g.log(`조우 카드 ${k}장을 내 덱에 섞습니다`, 'warn'); };
  const mirage = { async damageInstead(g, v, amount, o) { // Masterful Mirage
    const mm = g.c(v).att.find(a => idOf(g, a) === '27090'); if (!mm || !(o && (o.byPlayer || o.attack))) return false;
    for (let i = 0; i < 4 && g.p.deck.length; i++) g.put(g.p.deck[0], 'discard'); g.discard(mm, '능숙한 신기루: 피해 대신 덱 위 4장을 버립니다'); await g.flushPending(); return true;
  } };
  S['27084'] = Object.assign({ boostTo: (g, v, u) => isIllusion(g, u) ? 'discard' : null }, mirage); // Mysterio I: Seeds of Fear
  S['27085'] = Object.assign({ boostTo: (g, v, u) => isIllusion(g, u) ? 'deckBottom' : null, async whenRevealed(g) { await g.forEachPlayer(() => encToDeck(g, 1)); } }, mirage); // Mysterio II: Creeping Fear
  S['27086'] = Object.assign({ boostTo: (g, v, u) => isIllusion(g, u) ? 'deckTop' : null, async whenRevealed(g) { await g.forEachPlayer(async () => { for (let i = 0; i < 5 && g.p.deck.length; i++) g.put(g.p.deck[0], 'discard'); g.log(`미스테리오 III(${g.playerName()}): 덱 위 5장 버림`); await g.flushPending(); }); } }, mirage); // Mysterio III: Bound by Fear
  S['27088b'] = { loseOnComplete: true }; // Edge of Reality
  S['27087a'] = { async setup(g) { await g.forEachPlayer(async () => { const a = g.e.deck.find(u => idOf(g, u) === '27091'); if (a) await g.enterMinion(a, {}, true); }); g.shuffle(g.e.deck); } }; // Maze of Mirrors: a Shifting Apparition engages each player
  S['27088a'] = { async whenRevealed(g) { await g.forEachPlayer(() => encToDeck(g, 2)); } }; // Edge of Reality (2A): the top 2 encounter cards go into each player's deck
  S['27190'] = { afterRevealResponse: true, respond: [{ window: 'afterEncounterRevealed', label: '베놈에게 피해 1 → 강화 아이콘 수만큼 적에게 피해', // Venom (ally)
    can: (g, u, ctx) => g.c(u).zone === 'ally' && ((g.d(ctx.card).boost || 0) + (g.d(ctx.card).star ? 1 : 0)) > 0 && g.enemies().length > 0,
    async resolve(g, u, ctx) {
      const n = (g.d(ctx.card).boost || 0) + (g.d(ctx.card).star ? 1 : 0);
      await g.dealDamage(u, 1, { src: u });
      const t = await g.chooseTarget('enemy', `베놈: 피해 ${n}을(를) 줄 적`, u, false);
      if (t) await g.dealDamage(t, n, { src: u, byPlayer: true });
    } }] };
  S['27089'] = { attachTo: g => g.e.villain, actions: [{ timing: 'hero', label: '자원 1·조우 덱 위 2장을 내 덱에 섞기 → 이 카드 버림', cost: { n: 1, req: '' }, async use(g, u) { encToDeck(g, 2); g.discard(u, '거대한 환각 버림'); } }] }; // Humongous Hallucination
  S['27090'] = { attachTo: g => g.e.villain, boostEffect(g, u, ctx) { ctx.extraBoost = (ctx.extraBoost || 0) + 1; } }; // Masterful Mirage
  S['27091'] = { whenDefeated(g, u, ctx) { if (ctx && ctx.excess > 0) encToDeck(g, 1); } }; // Shifting Apparition
  S['27092'] = { async whenRevealed(g, u) { // Déjà Vu
    const k = await g.ask({ type: 'choice', title: '데자뷔', options: [{ id: 'dmg', label: '피해 1' }, { id: 'thr', label: '주 음모에 위협 1' }] });
    if (k === 'thr') await g.placeThreat(g.e.main, 1, {}); else await g.dealDamage(g.idt(), 1, {});
    const pi = await g.choosePlayer('데자뷔: 덱에 섞어 넣을 플레이어');
    g.withPlayerSync(pi, () => { g.c(u).owner = pi; g.put(u, 'deck'); g.shuffle(g.p.deck); g.log(`데자뷔를 ${g.playerName()}의 덱에 섞습니다`, 'warn'); });
  }, boostEffect(g, u, ctx) { (ctx.post || ctx.after).push(async gg => { if (['ediscard', 'boost', 'discard', 'deck'].includes(gg.c(u).zone) && gg.d(u).enc) await gg.reveal(u); }); } };
  S['27093'] = { async whenRevealed(g) { g.p.hand.slice().forEach(x => g.put(x, 'discard')); await g.draw(Math.max(0, g.handSize() - g.handCount())); g.log('공포 조장: 손을 모두 버리고 손 크기까지 뽑습니다', 'warn'); }, // Fearmonger
    async boostEffect(g, u, ctx) {
      const can = g.canAfford({ n: 2, req: 'BB' }, null);
      if (can && await g.ask({ type: 'choice', title: '★ 공포 조장', options: [{ id: 'pay', label: '[정신][정신] 지불' }, { id: 'fd', label: '이 카드를 뒷면 조우 카드로 받기' }] }) === 'pay' && await g.pay({ n: 2, req: 'BB' }, null, '공포 조장', false)) return;
      (ctx.post || ctx.after).push(async gg => { if (['ediscard', 'boost', 'discard', 'deck'].includes(gg.c(u).zone)) { gg.put(u, 'facedown'); gg.log('공포 조장: 뒷면 조우 카드로 받습니다', 'warn'); } });
    } };


  // ======================= Scenario: Venom =======================
  const bell = g => g.e.env.find(u => ['27077a', '27077b'].includes(idOf(g, u))) || null;
  const bellBlank = g => g.e.sides.some(x => idOf(g, x) === '27079'); // Guard the Bell Tower
  const ringing = g => { const b = bell(g); return !!b && idOf(g, b) === '27077b'; };
  const chime = g => { const b = bell(g); return b ? (g.c(b).cnt.chime || 0) : 0; };
  function setChime(g, n) { const b = bell(g); if (!b) return; g.c(b).cnt.chime = Math.max(0, n); checkBell(g); }
  function checkBell(g) {
    const b = bell(g); if (!b || bellBlank(g)) return;
    if (!ringing(g) && chime(g) >= 3 * g.players) { g.c(b).id = '27077b'; g.log('종탑: 종이 울립니다! (울림 면)', 'good'); }
    else if (ringing(g) && chime(g) <= 0) { g.c(b).id = '27077a'; g.log('종탑: 조용해졌습니다 (고요 면)', 'warn'); }
  }
  const fdOnId = (g, n) => { for (let i = 0; i < n; i++) { const x = g.takeEncounter(); if (!x) break; g.put(x, 'under', g.idt()); } g.log(`정체성에 뒷면 강화 카드 ${n}장`, 'warn'); };
  const venomBase = level => ({
    onActivationStart(g, v) { // "Leave Us Alone!": facedown boost cards on your identity move to Venom
      const id = g.idt(); const c = g.c(id).under.filter(x => g.d(x).enc); if (!c.length) return;
      for (const x of c.slice().reverse()) g.put(x, 'edeck', null, true); g.e.extraBoost = (g.e.extraBoost || 0) + c.length; g.log(`"우릴 내버려 둬!": 뒷면 강화 카드 ${c.length}장이 베놈에게`, 'warn');
    },
    on: { attackDealt(g, u, ctx) { // Vengeance / Retribution
      if (ctx.target !== u || (!g.allFriendlyChars().includes(ctx.attacker) && !(g.c(ctx.attacker) && !g.d(ctx.attacker).enc))) return;
      const ctrl = g.controllerOf(ctx.attacker);
      g.withPlayerSync(ctrl != null ? ctrl : g.s.ctx, () => {
        let n = 1; if (level === 3 && !g.p.usedOnce.venomHit) n = 2; g.p.usedOnce.venomHit = true; fdOnId(g, n);
      });
    },
    wouldTakeDamage(g, u, ctx) { if (ctx.target === u && ringing(g) && !bellBlank(g) && !ctx.bellUp) { ctx.bellUp = true; ctx.amount++; } } },
    async damageInstead(g, v, amount, o) { // Bell Tower (quiet): place chime counters instead
      if (!(o && o.attack) || !bell(g) || ringing(g) || bellBlank(g)) return false;
      if (await g.ask({ type: 'choice', title: `종탑: 베놈이 받을 피해 ${amount} 대신 종 카운터 ${amount}개를 놓을까요?`, options: [{ id: 'y', label: `종 카운터 ${amount}개 (현재 ${chime(g)}/${3 * g.players})` }, { id: 'n', label: '피해를 준다' }] }) !== 'y') return false;
      setChime(g, chime(g) + amount); return true;
    }
  });
  S['27073'] = venomBase(1);
  S['27074'] = Object.assign(venomBase(2), { async whenRevealed(g) { const t = g.searchEncounter(d => d.id === '27081'); g.shuffle(g.e.deck); if (t) await g.reveal(t); } });
  S['27075'] = Object.assign(venomBase(3), { async whenRevealed(g) { await g.forEachPlayer(() => fdOnId(g, 2)); } });
  S['27076a'] = { setup(g) { const b = g.e.aside.find(u => ['27077a', '27077b'].includes(idOf(g, u))); if (b) { g.c(b).id = '27077a'; g.put(b, 'env'); g.log('준비: 종탑(고요 면)을 플레이에 놓습니다'); } } };
  S['27076b'] = { loseOnComplete: true };
  S['27077a'] = {};
  S['27077b'] = { on: { wouldTakeDamage(g, u, ctx) { // ringing: Venom's attacks lose damage for each chime counter removed
    if (bellBlank(g) || ctx.target !== g.idt() || !ctx.attack || ctx.src !== g.e.villain) return; const n = Math.min(chime(g), ctx.amount - ctx.prevent); if (n <= 0) return;
    ctx.prevent += n; g.log(`종탑: 종 카운터 ${n}개 제거 → 피해 ${n} 방지`, 'good'); setChime(g, chime(g) - n);
  } } };
  S['27078'] = { attachTo: (g, u) => { g.c(u).cnt.rage = 2; return g.e.villain; }, attackProps: () => ({ overkill: true }), // "Now We're Angry!"
    on: { afterTakeDamage(g, a, ctx) { if (ctx.target === g.c(a).on && ctx.attack) { g.c(a).cnt.rage = (g.c(a).cnt.rage || 0) - 1; if (g.c(a).cnt.rage <= 0) g.discard(a, '"이제 화났다!" 버림'); } } },
    boostEffect(g, u, ctx) { (ctx.post || ctx.after).push(async gg => { if (['ediscard', 'boost'].includes(gg.c(u).zone)) await gg.reveal(u); }); } };
  S['27079'] = { whenRevealed(g) { const b = bell(g); if (b) { g.c(b).cnt.chime = 0; g.c(b).id = '27077a'; g.log('종탑 지키기: 종 카운터 제거, 고요 면으로'); } } }; // Guard the Bell Tower
  const lash = { on: { async afterTakeDamage(g, s, ctx) { if (ctx.target === g.e.villain && ctx.attack && g.c(s).zone === 'side' && g.c(s).threat > 0) { await g.removeThreat(s, ctx.amount, {}); await g.afterThreatRemoved(s); } } } };
  S['27080'] = Object.assign({ async boostEffect(g, u, ctx) { if ('undefended' in ctx) await g.indirectDamage(2, null); } }, lash); // Lashing Out
  S['27081'] = Object.assign({ boostEffect(g, u, ctx) { if ('undefended' in ctx) ctx.piercing = true; } }, lash); // Tooth and Nail
  S['27082'] = { async whenRevealed(g) { const v = g.e.villain; if (!v) return; g.e.tempBoostPlus = 1; try { await g.activate(v, {}); } finally { g.e.tempBoostPlus = 0; } }, // Biting Retort
    boostEffect(g) { setChime(g, chime(g) - 1); } };
  const bellTolls = async g => { setChime(g, chime(g) - 2); if (!bell(g)) return; if (ringing(g)) { await g.removeThreat(g.e.main, 1, {}); } else await g.dealDamage(g.idt(), 1, {}); };
  S['27083'] = { whenRevealed: bellTolls, async boostEffect(g) { await bellTolls(g); } }; // For Whom the Bell Tolls


  // ======================= Scenario: Venom Goblin =======================
  // Lower / Midtown / Upper Manhattan are all main schemes; e.main is the one with the glider counter.
  const MANH = { '27117a': '27117b', '27118a': '27118b', '27119a': '27119b' };
  const mains = g => [g.e.main].concat(g.e.mainX || []).filter(Boolean);
  const symbioteEnvs = g => { const env = g.e.env.filter(u => (g.d(u).tr || []).includes('SYMBIOTE') && g.d(u).type === 'environment'); const fm = g.e.sides.find(x => idOf(g, x) === '27124'); return env.length ? env : (fm ? [fm] : []); };
  const symbiote = g => symbioteEnvs(g).length > 0;
  function moveGlider(g, to) {
    const e = g.e; if (!to || to === e.main || !(e.mainX || []).includes(to)) return;
    const from = e.main; g.c(from).cnt.accelTok = e.accelTokens; e.accelTokens = g.c(to).cnt.accelTok || 0; g.c(to).cnt.accelTok = 0;
    e.mainX = e.mainX.filter(x => x !== to).concat(from); e.main = to; g.log(`글라이더 → ${g.nm(to)}`, 'warn');
  }
  async function gliderTo(g, most, title) {
    const ms = mains(g); if (!ms.length) return null; const v = ms.map(x => g.c(x).threat); const want = most ? Math.max(...v) : Math.min(...v);
    const t = await pick(g, ms.filter(x => g.c(x).threat === want), title || `글라이더를 옮길 주 음모 (위협이 가장 ${most ? '많은' : '적은'})`); moveGlider(g, t); return t;
  }
  async function special(g, m) { const f = g.sc(m).special; if (f) { g.log(`${g.nm(m)}: 특수 능력`, 'warn'); await f(g, m); } }
  const manhattan = sp => ({ special: sp, async whenCompleted(g, m) { // a completed Manhattan main scheme flips to its Symbiote environment
    const e = g.e; const wasGlider = m === e.main; const tok = wasGlider ? e.accelTokens : (g.c(m).cnt.accelTok || 0);
    if (wasGlider) { const rest = e.mainX || []; if (!rest.length) { g.lose('맨해튼이 공생체에게 넘어갔습니다'); } e.main = rest[0]; e.mainX = rest.slice(1); e.accelTokens = g.c(e.main).cnt.accelTok || 0; g.c(e.main).cnt.accelTok = 0; }
    else e.mainX = e.mainX.filter(x => x !== m);
    g.c(m).threat = 0; g.c(m).cnt = {}; g.c(m).id = MANH[idOf(g, m)] || idOf(g, m); g.put(m, 'env'); g.log(`${g.nm(m)}: 공생체 환경으로 뒤집힙니다`, 'warn');
    if (symbioteEnvs(g).filter(x => g.d(x).type === 'environment').length >= 2) g.lose('공생체 환경이 둘 이상입니다');
    const t = await gliderTo(g, false); if (t) { if (t === e.main) e.accelTokens += tok; else g.c(t).cnt.accelTok = (g.c(t).cnt.accelTok || 0) + tok; }
    return 'handled';
  } });
  S['27116a'] = { setup(g) { // Skies Over New York: the three Manhattan main schemes, glider on Midtown
    const e = g.e; e.mainX = [];
    for (const id of ['27117a', '27119a']) { const u = g.newCard(id); g.c(u).zone = 'main'; const d = g.d(u); g.c(u).threat = (d.start || 0) * (d.startStar ? g.players : 1); e.mainX.push(u); }
    const sk = g.newCard('27116b'); g.put(sk, 'env'); g.log('준비: 로어·미드타운·어퍼 맨해튼 주 음모, 글라이더는 미드타운', 'warn');
  } };
  S['27116b'] = {};
  S['27117a'] = manhattan(async (g, m) => { for (const sc of g.schemes().slice()) await g.placeThreat(sc, sc === m && symbiote(g) ? 2 : 1, {}); }); // Lower Manhattan
  S['27118a'] = manhattan(async g => { await g.indirectDamage(2 + (symbiote(g) ? 1 : 0), null); }); // Midtown Manhattan
  S['27119a'] = manhattan(async g => { if (g.p.hand.length) await g.discardFromHand(1, 1, '어퍼 맨해튼: 버릴 카드'); if (symbiote(g)) { for (let i = 0; i < 4 && g.p.deck.length; i++) g.put(g.p.deck[0], 'discard'); await g.flushPending(); } }); // Upper Manhattan
  for (const b of ['27117b', '27118b', '27119b']) S[b] = {};
  const vgAfter = mode => ({ on: { async enemyActivated(g, u, ctx) {
    if (ctx.enemy !== u) return; const m = await gliderTo(g, false); if (!m) return;
    if (mode === 1) { const k = await g.ask({ type: 'choice', title: '★ 도시 감염', options: [{ id: 't', label: `${g.nm(m)}에 위협 2` }, { id: 's', label: `${g.nm(m)}의 특수 능력` }] }); if (k === 't') await g.placeThreat(m, 2, {}); else await special(g, m); }
    else if (mode === 2) await special(g, m);
    else { await g.placeThreat(m, 1, {}); await special(g, m); }
  } } });
  S['27113'] = vgAfter(1);
  S['27114'] = Object.assign(vgAfter(2), { async whenRevealed(g) { await g.forEachPlayer(() => dealFd(g, 2)); } });
  S['27115'] = Object.assign(vgAfter(3), { async whenRevealed(g) { await g.forEachPlayer(() => dealFd(g, 3)); } });
  S['27120'] = { attachTo: g => g.e.villain, actions: [{ timing: 'hero', label: '인쇄된 [에너지][정신][물리] 자원 → 이 카드 버림', cost: { n: 3, req: 'YBR' }, async use(g, u) { g.discard(u, '우리는 하나 버림'); } }] }; // We Are One
  S['27121'] = { grantKw: (g, s, t) => t === s && symbiote(g) ? ['quickstrike'] : null, async boostEffect(g) { const m = await gliderTo(g, true); if (m) await g.placeThreat(m, 1, {}); } }; // Symbiotic Berserker
  S['27122'] = { mod: { hp: (g, s, t) => t === s && symbiote(g) ? 3 : 0 }, boostEffect(g, u, ctx) { if ('undefended' in ctx) ctx.indirect = true; } }; // Symbiotic Monstrosity
  S['27123'] = { grantKw: (g, s, t) => t === s && symbiote(g) ? ['patrol'] : null, async boostEffect(g) { for (const m of (g.e.mainX || []).slice()) await g.placeThreat(m, 1, {}); } }; // Symbiotic Thrall
  S['27124'] = { boostEffect(g, u, ctx) { (ctx.post || ctx.after).push(async gg => { if (['ediscard', 'boost'].includes(gg.c(u).zone)) await gg.reveal(u); }); } }; // Festering Mass
  S['27125'] = { async whenRevealed(g) { const m = await gliderTo(g, true); if (m) await special(g, m); } }; // Joy Ride
  S['27126'] = { async whenRevealed(g) { if (g.e.main) await special(g, g.e.main); }, async boostEffect(g) { if (g.e.main) await special(g, g.e.main); } }; // Spreading Panic


  // ======================= Scenario: The Sinister Six =======================
  const ORDER = { '27094': 1, '27095': 2, '27096': 3, '27097': 4, '27098': 5, '27099': 6 };
  const ord = (g, v) => ORDER[idOf(g, v)] || 0;
  const sixIn = g => (g.e.villains || []).slice();
  const sixAside = g => (g.e.aside || []).filter(u => ORDER[idOf(g, u)]);
  const light = g => g.e.sides.find(x => ['27102a', '27102b'].includes(idOf(g, x))) || null;
  function sixEnter(g, v) { g.resetCard(v); g.put(v, 'villain'); if (g.d(v).toughness) g.c(v).tough = true; g.log(`${g.nm(v)}이(가) 나타났습니다 (활성 순서 ${ord(g, v)})`, 'warn'); }
  function setActive(g, v) { g.e.villain = v || null; if (v) g.log(`활성 빌런: ${g.nm(v)}`, 'warn'); }
  async function ambush(g) { // Ambush!: a set-aside villain at random comes into play and becomes active
    const c = sixAside(g); let v = null;
    if (c.length) { v = c[Math.floor(g.rand() * c.length)]; sixEnter(g, v); setActive(g, v); g.log('매복!', 'warn'); }
    if (g.s.scen.expert) { const l = light(g); if (l) await g.placeThreat(l, 2, {}); }
    return v;
  }
  function nextActive(g) { // move the active counter to the next villain in the activation order
    const vs = sixIn(g); if (!vs.length) { setActive(g, null); return; } const cur = g.e.villain ? ord(g, g.e.villain) : 0;
    for (let k = 1; k <= 6; k++) { const o = ((cur - 1 + k) % 6) + 1; const v = vs.find(x => ord(g, x) === o); if (v) { setActive(g, v); return; } }
  }
  const sixVillain = fx => ({
    on: { async afterEnemyAttack(g, u, ctx) { if (ctx.enemy !== u || !(ctx.damaged || []).includes(g.idt())) return; await fx(g, u); if (g.e.villain === u) nextActive(g); } },
    async whenDefeatedVillain(g, u) {
      const others = sixIn(g).filter(x => x !== u); const n = others.length ? 4 : 7;
      const sides = g.e.sides.filter(x => g.c(x).threat > 0 && !g.noRemove(x)); const t = await pick(g, sides, `${g.nm(u)} 격파: 위협 ${n}을 제거할 부가 음모`);
      for (const a of g.c(u).att.slice()) g.discard(a); g.resetCard(u); g.put(u, 'aside'); g.log(`${g.nm(u)} 격파 — 따로 둡니다`, 'good');
      if (g.e.villain === u) setActive(g, null);
      if (t) { await g.removeThreat(t, n, { src: g.idt() }); await g.afterThreatRemoved(t); }
      return 'handled';
    }
  });
  S['27094'] = sixVillain(async g => { for (const s of g.schemes().slice()) await g.placeThreat(s, 1, {}); }); // Doctor Octopus
  S['27095'] = sixVillain(async g => { for (let i = 0; i < 7 && g.p.deck.length; i++) g.put(g.p.deck[0], 'discard'); g.log('★ 일렉트로: 덱 위 7장 버림'); }); // Electro
  S['27096'] = sixVillain(async g => { await g.indirectDamage(2, null); }); // Hobgoblin
  S['27097'] = sixVillain(async g => { const c = g.p.upgrades.concat(g.p.supports).filter(x => !g.d(x).permanent); const t = await pick(g, c, '★ 크레이븐: 버릴 지원 또는 업그레이드'); if (t) g.discard(t, `${g.nm(t)} 버림`); }); // Kraven
  S['27098'] = sixVillain(async g => { const t = await pick(g, g.friendlyChars(), '★ 스콜피온: 기절시킬 캐릭터'); if (t) g.giveStatus(t, 'stun', '스콜피온'); }); // Scorpion
  S['27099'] = sixVillain(async g => { if (g.p.hand.length) await g.discardFromHand(1, 1, '★ 벌처: 버릴 카드'); }); // Vulture
  S['27100a'] = { async setup(g) { // Sinister Synchronization: players + 1 villains, active counter on the lowest order, Light at the End
    for (let i = 0; i < g.players + 1; i++) { const c = sixAside(g); if (!c.length) break; sixEnter(g, c[Math.floor(g.rand() * c.length)]); }
    const vs = sixIn(g).sort((a, b) => ord(g, a) - ord(g, b)); setActive(g, vs[0]);
    const l = g.e.aside.find(x => ['27102a', '27102b'].includes(idOf(g, x))); if (l) { g.c(l).id = '27102a'; await g.enterSide(l, {}); }
  } };
  const ambushIfNone = { on: { async mainStep1(g, u) { if (u === g.e.main && !g.e.villain) { g.log('활성 빌런이 없어 매복!', 'warn'); await ambush(g); } } } };
  S['27100b'] = Object.assign({}, ambushIfNone);
  S['27101a'] = { async whenRevealed(g) { const v = await ambush(g); if (!v || g.s.scen.expert) await g.forEachPlayer(() => dealFd(g, 1)); } }; // Sinister Beatdown
  S['27101b'] = Object.assign({ loseOnComplete: true }, ambushIfNone);
  S['27102a'] = { permanent: true, cannotLeave(g, u) { // Light at the End (Trap!)
    g.log('마지막 빛: 매복! 그리고 카드를 뒤집습니다 (추격!)', 'warn');
    const c = sixAside(g); if (c.length) { const v = c[Math.floor(g.rand() * c.length)]; sixEnter(g, v); setActive(g, v); }
    g.c(u).id = '27102b'; const d = g.d(u); g.c(u).threat = (d.start || 0) * (d.startStar ? g.players : 1) + (d.hinder || 0) * (d.hinderStar ? g.players : 1); return true;
  } };
  S['27102b'] = { permanent: true, cannotLeave(g) { g.win('마지막 빛 너머로 탈출했습니다!'); return true; } }; // Light at the End (Chase!)
  async function sixAttach(g, u, chooser) { // attach to a villain by rule; if none is in play, Ambush! then attach to the active villain
    let vs = sixIn(g); if (!vs.length) { await ambush(g); vs = sixIn(g); }
    const h = vs.length ? (chooser(g, vs) || g.e.villain) : null; if (h) g.attachEnc(u, h); else g.discard(u);
  }
  const att = (chooser, extra) => Object.assign({ revealFirst: true, async whenRevealed(g, u) { await sixAttach(g, u, chooser); } }, extra);
  S['27103'] = att((g, vs) => vs.sort((a, b) => ord(g, b) - ord(g, a))[0], { mod: { atk: (g, s, t) => t === g.c(s).on ? sixIn(g).length : 0 } }); // Heightened Morale
  S['27104'] = att((g, vs) => vs.sort((a, b) => g.hpLeft(b) - g.hpLeft(a))[0], { blocksRemoval: (g, s, sch) => g.c(s).zone === 'attach' && sch === light(g) }); // Taunting Presence
  S['27105'] = att((g, vs) => vs.sort((a, b) => ord(g, a) - ord(g, b))[0]); // Team Leader
  S['27106'] = att((g, vs) => vs.sort((a, b) => g.stat(b, 'atk') - g.stat(a, 'atk'))[0], { cannotAttack: (g, s, enemy) => g.c(s).zone === 'attach' && (g.e.villains || []).includes(enemy) && !g.c(enemy).att.some(a => idOf(g, a) === '27106') }); // Take One for the Team
  S['27107'] = { blocksRemoval: (g, s, sch) => g.c(s).zone === 'side' && sch !== s && g.d(sch).type === 'side', boostEffect(g, u, ctx) { ctx.extraBoost = (ctx.extraBoost || 0) + 1; } }; // Brute Force Barricade
  const pair = (a, b, fa, fb) => ({ async whenRevealed(g) {
    if (g.s.scen.expert && g.e.main) await g.placeThreat(g.e.main, 1, {});
    for (const [id, f] of [[a, fa], [b, fb]]) { const inPlay = sixIn(g).find(v => idOf(g, v) === id); if (inPlay) await f(g); else { const x = sixAside(g).find(v => idOf(g, v) === id); if (x) { sixEnter(g, x); if (!g.e.villain) setActive(g, x); } } }
  } });
  S['27108'] = pair('27096', '27099', async g => { await g.indirectDamage(2, null); }, async g => { discardRandomHand(g); }); // Frequent Flyers
  S['27109'] = pair('27095', '27097', async g => { const c = g.controlled().filter(x => x !== g.idt() && !g.d(x).permanent); if (!c.length) return; const hi = Math.max(...c.map(x => g.d(x).cost || 0)); const t = await pick(g, c.filter(x => (g.d(x).cost || 0) === hi), '버릴 카드 (비용이 가장 높음)'); g.discard(t); }, // High Fashion
    async g => { const c = g.controlled().filter(x => x !== g.idt() && !g.d(x).permanent); if (!c.length) return; const lo = Math.min(...c.map(x => g.d(x).cost || 0)); const t = await pick(g, c.filter(x => (g.d(x).cost || 0) === lo), '버릴 카드 (비용이 가장 낮음)'); g.discard(t); });
  S['27110'] = pair('27094', '27098', async g => { const t = await pick(g, g.friendlyChars(), '혼란시킬 캐릭터'); if (t) g.giveStatus(t, 'conf', '로봇 강화'); }, async g => { const t = await pick(g, g.friendlyChars(), '기절시킬 캐릭터'); if (t) g.giveStatus(t, 'stun', '로봇 강화'); }); // Robotic Enhancements
  S['27111'] = { async whenRevealed(g) { // Partnership of Pain
    const vs = sixIn(g); if (!vs.length) return;
    if (!g.isHero()) { const v = vs.sort((a, b) => ord(g, a) - ord(g, b))[0]; const x = vs.filter(o => o !== v).reduce((t, o) => t + (g.stat(o, 'sch') || 0), 0); await g.enemyScheme(v, { schBonus: x }); }
    else { const v = vs.sort((a, b) => ord(g, b) - ord(g, a))[0]; const x = vs.filter(o => o !== v).reduce((t, o) => t + (g.stat(o, 'atk') || 0), 0); await g.enemyAttack(v, { atkBonus: x }); }
  } };
  S['27112'] = { async whenRevealed(g, u, ctx) { if (g.s.scen.expert) ctx.surge++; const v = await ambush(g); if (!v) { const l = light(g); if (l) await g.placeThreat(l, 3, {}); } } }; // Surprise!

  // ======================= Campaign: Sinister Motives (cards/pack/sm/campaign.py, bad_publicity, community_service, shield_tech) =======================
  const SMC = 'sinister_motives', CS = ['27176', '27177', '27178', '27179', '27180'];
  const resOk = g => g.p.hand.some(u => g.d(u).res) || g.controlled().some(u => (g.sc(u).resources || []).length);
  MC.CAMPAIGNS[SMC] = {
    async setup(g, spec) {
      const lv = spec.level || 1, x = g.s.scen.expert;
      if (lv >= 3 && lv !== 5) { const v = g.newCard('27190', 'limbo'); await g.putAllyIntoPlay(v); g.log('캠페인: 베놈(에디 브록)이 당신의 조종하에 들어옵니다', 'good'); }
      { const pr = g.newCard(x ? '27174b' : '27174a', 'limbo'); await g.enterEnv(pr); g.c(pr).cnt.infamy = (x ? 3 : 2) * g.players; g.log(`캠페인: 대중의 항의 (악명 카운터 ${g.c(pr).cnt.infamy})`, 'warn'); }
      g.newCard('27175', 'edeck');
      if (lv >= 3 && lv !== 5) g.newCard('27181', 'edeck');
      if (lv !== 5) { const won = g.clogList('Community Service: Victory for Scenarios #1-4'); const left = CS.filter(id => !won.includes(id)); if (left.length) g.newCard(left[Math.floor(g.rand() * left.length)], 'edeck'); }
      g.shuffle(g.e.deck);
      if (lv >= 2) await repTrack(g);
      for (const f of (spec.sm || [])) await f(g);
      if (lv < 2) return;
      const k = { 2: 1, 3: 2, 4: 2, 5: 3 }[lv];
      await g.forEachPlayer(async () => {
        const hp = g.clogPInt('Remaining hit points'); if (hp) g.setIdentityHP(hp);
        if (x && g.c(g.idt()).dmg > 0 && await g.ask({ type: 'choice', title: `숙련 캠페인(${g.playerName()}): 조우 카드 ${k}장을 뒷면으로 받고 생명력을 모두 회복할까요?`, options: [{ id: 'y', label: '받고 회복' }, { id: 'n', label: '안 함' }] }) === 'y') { for (let i = 0; i < k; i++) await g.dealEncounterCard(); g.c(g.idt()).dmg = 0; }
      });
    }
  };
  async function repTrack(g) { // FollowSetupInstructionOfReputationTrack
    const v = g.clogInt('Reputation Track');
    await g.forEachPlayer(async () => {
      if (v >= 1) { const t = g.clogP('S.H.I.E.L.D. Tech: Reputation Track Reward'); if (t) { const id = t.split(',')[v >= 13 ? 1 : 0]; if (MC.cards[id]) { g.newCard(id, 'upgrade'); g.log(`평판 보상(${g.playerName()}): ${MC.cards[id].name}`, 'good'); } } }
      if (v >= 5) g.p.extraMulligan = true;
      if (v >= 9) { const ids = g.clogPList('Aspect Advantage: Reputation Track Reward').filter(id => MC.cards[id]); ids.forEach(id => g.newCard(id, 'deck')); if (ids.length) g.shuffle(g.p.deck); }
      if (v >= 17) { const id = g.clogP('Planning Ahead: Reputation Track Reward'); const u = id && g.p.deck.concat(g.p.discard).find(x => g.c(x).id === id); if (u) { g.put(u, 'hand'); g.shuffle(g.p.deck); } }
      if (v >= 21 && MC.cards['01092'] && await g.ask({ type: 'choice', title: `평판 보상(${g.playerName()}): 헬리캐리어를 플레이 영역에 내려놓을까요?`, options: [{ id: 'y', label: '내려놓기' }, { id: 'n', label: '안 함' }] }) === 'y') g.newCard('01092', 'support');
      if (v >= 25 && await g.ask({ type: 'choice', title: `평판 보상(${g.playerName()}): 심비오트 슈트를 플레이 영역에 내려놓을까요?`, options: [{ id: 'y', label: '내려놓기' }, { id: 'n', label: '안 함' }] }) === 'y') g.newCard('27191', 'upgrade');
    });
    if (v >= 1) { const ot = g.clogList('Osborn Tech: Reputation Track Penalty').filter(id => MC.cards[id]); ot.forEach(id => g.newCard(id, 'edeck')); if (ot.length) g.shuffle(g.e.deck); }
    if (v >= 5 && g.e.main) await g.placeThreat(g.e.main, g.players, {});
    if (v >= 9) await g.forEachPlayer(async () => { const m = g.e.deck.concat(g.e.discard).find(u => g.d(u).type === 'minion'); if (m) await g.enterMinion(m, {}, true); else await g.dealEncounterCard(); g.shuffle(g.e.deck); });
    if (v >= 17) { const sc = g.e.deck.concat(g.e.discard).find(u => g.d(u).type === 'side' && !CS.includes(g.c(u).id) && g.d(u).set && g.d(u).set === g.d(g.e.main).set); if (sc) { await g.reveal(sc); if (g.c(sc).zone === 'side') g.c(sc).threat += g.players; } }
    if (v >= 25) await g.forEachPlayer(() => g.dealEncounterCard());
  }
  const camp = (id, c) => { S[id] = Object.assign(S[id] || {}, { campaign: c }); };
  camp('27064a', { level: 1, expert: [g => { const c = streets(g); if (c) { addSand(g, 2); surgingSands(g); } }] });
  camp('27076a', { level: 2, expert: [async g => { await g.forEachPlayer(() => { fdOnId(g, 1); }); }] });
  camp('27087a', { level: 3, expert: [async g => { await g.forEachPlayer(() => { encToDeck(g, 2); }); }] });
  camp('27100a', { level: 4, sm: [g => { const n = g.clogInt('Waking Nightmare: Victory for Scenario #3 - Mysterio'); const l = Object.keys(g.s.cards).find(u => ['27102a', '27102b'].includes(g.c(u).id) && g.c(u).zone); if (l && n) { g.c(l).threat = (g.c(l).threat || 0) + n; g.log(`캠페인: 마지막 빛에 위협 ${n}`); } }] });
  camp('27116a', { level: 5, sm: [g => { const M = { 27094: '27158', 27095: '27159', 27096: '27160', 27097: '27161', 27098: '27162', 27099: '27163' }; const ids = g.clogList('Last Ones Standing: Victory for Scenario #4 - The Sinister Six').map(x => M[x]).filter(id => id && MC.cards[id]); ids.forEach(id => g.newCard(id, 'edeck')); if (ids.length) g.shuffle(g.e.deck); }],
    expert: [async g => { for (const m of [g.e.main].concat(g.e.mainX || []).filter(Boolean)) await g.placeThreat(m, g.players, {}); }] });
  // Bad Publicity
  const outcry = { on: { minionDefeated(g, u) { lessInfamy(g, u); }, sideSchemeDefeated(g, u) { lessInfamy(g, u); } } }; // Reaction: after a minion or side scheme is defeated, remove 1 infamy
  function lessInfamy(g, u) { if (g.c(u).zone !== 'env' || !(g.c(u).cnt.infamy > 0)) return; const c = g.c(u).cnt; c.infamy--; g.log(`대중의 항의: 악명 카운터 ${c.infamy}`, 'good'); if (!c.infamy) { g.put(u, 'victory'); g.log('대중의 항의를 승점 구역에 더합니다', 'good'); } }
  S['27174a'] = outcry; S['27174b'] = outcry;
  S['27175'] = { whenRevealed(g, u, ctx) { if (g.s.scen.expert && ctx) ctx.surge = (ctx.surge || 0) + 1; const pr = g.e.env.find(x => ['27174a', '27174b'].includes(g.c(x).id)); if (pr) { g.c(pr).cnt.infamy = (g.c(pr).cnt.infamy || 0) + 2; g.log('흑색선전: 대중의 항의에 악명 카운터 2', 'warn'); g.removeFromGame(u); } else if (g.e.main) return g.placeThreat(g.e.main, 2, {}); } };
  // Community Service side schemes
  S['27176'] = { async afterThwarted(g) { const o = await g.ask({ type: 'choice', title: '뒷골목 털이: 하나를 고르세요', options: [{ id: 'p', label: '[물리] 자원 소모' }, { id: 'd', label: '손에서 무작위 1장 버림' }] }); if (o === 'p' && (await g.pay({ n: 1, req: 'R' }, null, '뒷골목 털이: [물리]', true)) != null) return; if (g.p.hand.length) g.put(g.p.hand[Math.floor(g.rand() * g.p.hand.length)], 'discard'); } }; // Back Alley Robbery
  S['27177'] = { async thwartExtraCost(g, u) { g.log('나무 위의 고양이: 저지 추가 비용으로 간접 피해 2'); await g.indirectDamage(2, u); } }; // Cat Stuck in a Tree
  S['27178'] = { async afterThreatRemovedHere(g, u, n) { if (g.e.main) { g.log(`부하들의 강탈: 주 음모에 위협 ${n}`, 'warn'); await g.placeThreat(g.e.main, n, {}); } } }; // Henchmen Shakedown
  S['27179'] = { on: { async villainPhaseBegins(g, u) { if (g.c(u).zone !== 'side') return; const c = g.c(u).cnt; c.speed = (c.speed || 0) + 1; g.log(`탈선: 속도 카운터 ${c.speed}`, 'warn'); if (c.speed >= 2) { g.removeFromGame(u); await g.forEachPlayer(() => { g.p.deck.slice(0, 3).forEach(x => g.put(x, 'discard')); }); g.log('탈선: 각 플레이어 덱 위 3장 버림', 'warn'); } } } }; // Derailed
  S['27180'] = { thwartWithAtk: true }; // Rescue in the Rubble
  S['27181'] = { revealFirst: true, async whenRevealed(g, u, ctx) { const v = g.p.allies.find(a => g.c(a).id === '27190'); if (v) g.attachEnc(u, v); else { g.discard(u); if (ctx) ctx.surge = (ctx.surge || 0) + 1; } }, // Snitches Get Stitches
    redirectVillainAttack(g, x, enemy, o) { if (g.c(x).zone === 'attach' && g.c(g.c(x).on).zone === 'ally') o.forceTarget = g.c(x).on; }, actions: [{ timing: 'action', label: '베놈 소진·같은 자원 2개 → 버리기', can: (g, u) => g.c(u).zone === 'attach' && !g.c(g.c(u).on).ex, async use(g, u) { const opts = ['R', 'B', 'Y', 'G'].filter(l => g.canAfford({ n: 2, req: l + l }, null)); if (!opts.length) return; const l = opts.length === 1 ? opts[0] : await g.ask({ type: 'choice', title: '같은 자원 2개', options: opts.map(x => ({ id: x, label: MC.RES_KO[x] })) }); if ((await g.pay({ n: 2, req: l + l }, null, '밀고자', true)) == null) return; g.c(g.c(u).on).ex = true; g.discard(u); } }] };
  // S.H.I.E.L.D. Tech (a: standard reward, b: enhanced at reputation 13+)
  const ON = (g, s) => g.c(s).zone === 'upgrade';
  const hero = (g, s, t) => ON(g, s) && t === g.idt() && g.isHero();
  const darts = two => ({ permanent: true, respond: [{ window: 'heroAttacked', label: '다트 카운터 1 → 피해 1', can: (g, u) => ON(g, u) && (g.c(u).cnt.dart || 0) > 0 && g.enemies().length > 0, async resolve(g, u) { g.c(u).cnt.dart--; const a = await g.chooseTarget('enemy', '소형 다트: 피해 1', u, false); if (a) await g.dealDamage(a, 1, { src: u, byPlayer: true }); if (two) { const b = await g.ask({ type: 'target', title: '소형 다트: 다른 적에게 피해 1 (선택)', cands: g.enemies().filter(x => x !== a), cancelable: true }); if (b) await g.dealDamage(b, 1, { src: u, byPlayer: true }); } } }],
    actions: [{ timing: 'alter', label: '자원 1 → 다트 카운터 3', cost: { n: 1, req: '' }, can: (g, u) => ON(g, u) && g.c(u).cnt.dartRound !== g.s.round, use(g, u) { g.c(u).cnt.dart = (g.c(u).cnt.dart || 0) + 3; g.c(u).cnt.dartRound = g.s.round; } }] });
  S['27182a'] = darts(false); S['27182b'] = darts(true);
  S['27183a'] = { permanent: true, mod: { hp: (g, s, t) => ON(g, s) && t === g.idt() ? 2 : 0 }, on: { async villainPhaseBegins(g, u) { if (!ON(g, u) || !g.isHero() || !g.canAfford({ n: 1, req: '' }, null)) return; if (await g.ask({ type: 'choice', title: '충격 완화 슈트: 자원 1개로 이번 단계 공격 피해 -1?', options: [{ id: 'y', label: '자원 1 소모' }, { id: 'n', label: '안 함' }] }) !== 'y') return; if ((await g.pay({ n: 1, req: '' }, null, '충격 완화 슈트', true)) != null) g.c(u).cnt.shock = g.s.round; },
    wouldTakeDamage(g, u, ctx) { if (ON(g, u) && g.c(u).cnt.shock === g.s.round && g.s.phase === 'villain' && ctx.attack && ctx.target === g.idt()) ctx.amount = Math.max(0, ctx.amount - 1); } } };
  S['27183b'] = { permanent: true, mod: { hp: (g, s, t) => ON(g, s) && t === g.idt() ? 3 : 0 }, respond: [{ window: 'wouldTakeAttackDamage', label: '덱 위 1장 버림 → 피해 1 방지', can: (g, u, ctx) => ON(g, u) && g.isHero() && ctx.target === g.idt() && ctx.amount - ctx.prevent > 0 && g.p.deck.length > 0, resolve(g, u, ctx) { g.put(g.p.deck[0], 'discard'); ctx.prevent += 1; } }] };
  const goggles = (n, pierce) => ({ permanent: true, mod: { thw: (g, s, t) => hero(g, s, t) ? -1 : 0, atk: (g, s, t) => hero(g, s, t) ? n : 0 }, basicAttackPlus: (g, s) => ON(g, s) ? Object.assign({ overkill: true }, pierce ? { piercing: true } : {}) : null });
  S['27184a'] = goggles(1, false); S['27184b'] = goggles(2, true);
  const gauntlet = enh => ({ permanent: true, actions: [{ timing: 'hero', label: '추진 건틀렛 소진·간접 피해 2 → 히어로 준비', can: (g, u) => ON(g, u) && !g.c(u).ex, async use(g, u) { g.c(u).ex = true; await g.indirectDamage(2, u); g.c(g.idt()).ex = false; if (enh) ['thw', 'atk', 'def'].forEach(k => g.addPhaseMod(g.idt(), k, 1)); } }] });
  S['27185a'] = gauntlet(false); S['27185b'] = gauntlet(true);
  const retinal = (n, patrol) => ({ permanent: true, mod: { thw: (g, s, t) => hero(g, s, t) ? n : 0 }, basicThwartFilter: (g, sc) => { const all = g.schemes(); const mx = Math.max(...all.map(x => g.c(x).threat || 0)); return (g.c(sc).threat || 0) === mx; }, basicThwartIgnores: (g, s) => ON(g, s) ? (patrol ? ['crisis', 'patrol'] : ['crisis']) : [] });
  S['27186a'] = retinal(1, false); S['27186b'] = retinal(2, true);
  const knuckles = (lim, atk) => ({ permanent: true, mod: { atk: (g, s, t) => hero(g, s, t) ? atk : 0 }, respond: [{ window: 'afterBasicAttack', label: '전격 너클: 조우 덱 위 1장 버리고 기절 시도', can: (g, u, ctx) => ON(g, u) && ctx.target && g.c(ctx.target).zone && g.e.deck.length > 0, resolve(g, u, ctx) { const x = g.takeEncounter(); if (!x) return; g.put(x, 'ediscard'); const n = g.boostOf(x); g.log(`전격 너클: ${g.nm(x)} (강화 ${n})`); if (n <= lim) g.giveStatus(ctx.target, 'stun', '전격 너클'); } }] });
  S['27187a'] = knuckles(0, 0); S['27187b'] = knuckles(1, 1);
  const bracers = (d, steady) => ({ permanent: true, mod: { atk: (g, s, t) => hero(g, s, t) ? -1 : 0, def: (g, s, t) => hero(g, s, t) ? d : 0, retaliate: (g, s, t) => hero(g, s, t) ? 1 : 0 }, [steady ? 'steadyFor' : 'stalwartFor']: (g, s, t) => hero(g, s, t) });
  S['27188a'] = bracers(1, false); S['27188b'] = bracers(2, true);
  const navigator = enh => ({ permanent: true, on: { minionEnters(g, u, ctx) { navAttach(g, u, ctx.minion); }, sideEntered(g, u, ctx) { navAttach(g, u, ctx.scheme); }, async attachedDefeated(g, u) { await navDefeated(g, u, enh); g.put(u, 'upgrade'); } } });
  async function navDefeated(g, u, enh) { if (enh) { await g.draw(2); if (g.p.hand.length) { const t = await g.ask({ type: 'target', title: '손목 내비게이터: 버릴 카드', cands: g.p.hand.slice(), cancelable: false }) || g.p.hand[0]; g.put(t, 'discard'); } } else await g.draw(1); }
  function navAttach(g, u, host) { if (!host || !g.c(host).zone || !['upgrade', 'attach'].includes(g.c(u).zone)) return; g.put(u, 'attach', host); g.c(u).navHost = true; g.log(`손목 내비게이터 → ${g.nm(host)}`); }
  S['27189a'] = navigator(false); S['27189b'] = navigator(true);
  MC.registerScripts(S);
})();
