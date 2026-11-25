/* NeXt Evolution (40001-40204): Cable, Domino, player side schemes, X-Force cards, five scenarios and the modular sets.
   Ported from cards/pack/next_evol of the community build. The campaign is at the end of the file. */
(function () {
  'use strict';
  const S = {};
  const idOf = (g, u) => g.c(u).id;
  const tr = (g, u, t) => (g.d(u).tr || []).includes(t) || g.hasTrait(u, t);
  const pick = async (g, cands, title) => !cands.length ? null : cands.length === 1 ? cands[0] : await g.ask({ type: 'target', title, cands, cancelable: false });
  const yes = async (g, title) => (await g.ask({ type: 'choice', title, options: [{ id: 'y', label: '예' }, { id: 'n', label: '아니요' }] })) === 'y';
  const NE = MC.nextEvol = MC.nextEvol || {};
  const firstCtrl = zone => ({ firstPlayerChanged(g, u, ctx) { if (g.c(u).zone === zone && g.c(u).ctrl !== ctx.first) { g.withPlayerSync(ctx.first, () => g.put(u, zone)); g.log(`${g.nm(u)}의 조종권이 ${g.playerName(ctx.first)}(으)로 넘어갑니다`, 'good'); } } });
  async function thw(g, t, n, src) { const r = await g.removeThreat(t, n, { src }); g.log(`${g.nm(t)} 위협 ${r} 제거`); const last = r > 0 && (!g.c(t).zone || g.c(t).threat === 0); await g.afterThreatRemoved(t); return { r, last }; }
  const victorySides = g => (g.e.victory || []).filter(u => ['side', 'pside'].includes(g.d(u).type)).length;
  NE.victorySides = victorySides;
  const intoPlay = async (g, x) => { const t = g.d(x).type; if (t === 'ally') await g.putAllyIntoPlay(x); else if (t === 'support') g.put(x, 'support'); else if (t === 'upgrade') { if (g.sc(x).attach) { const h = await g.chooseTarget(g.sc(x).attach, `${g.nm(x)}: 붙일 대상`, x, false); if (!h) return; g.put(x, 'attach', h); } else g.put(x, 'upgrade'); } else if (t === 'pside') await g.enterSide(x, {}); const oe = g.sc(x).onEnter; if (oe && t !== 'ally') await oe(g, x); g.log(`${g.nm(x)}을(를) 플레이에 놓습니다`, 'good'); };
  const searchPlay = async (g, pred, title) => { await g.forEachPlayer(async () => { const c = g.p.deck.concat(g.p.discard).filter(x => !g.d(x).enc && pred(g.d(x), x)); if (!c.length || !(await yes(g, `${title}(${g.playerName()}): 덱·버림 더미에서 찾아 플레이에 놓을까요?`))) return; const t = await pick(g, c, title); g.shuffle(g.p.deck); if (t) await intoPlay(g, t); }); };

  // ======================= Domino: discarding from the top of the deck =======================
  const isDomino = g => idOf(g, g.idt()) === '40037a';
  async function discardTop(g, why) { // returns { card, n }: resource icons on the discarded card (Domino counts wild twice)
    if (!g.p.deck.length) await g.reshuffleDeck(); const x = g.p.deck[0]; if (!x) return { card: null, n: 0, res: '' };
    g.put(x, 'discard'); let res = g.d(x).res || ''; if (isDomino(g)) res = res.replace(/G/g, 'GG');
    g.log(`${why || '덱 맨 위'}: ${g.nm(x)} 버림 (자원 아이콘 ${res.length})`);
    const id = idOf(g, x);
    if (id === '40043') { g.put(x, 'deck'); g.shuffle(g.p.deck); g.log('잭팟!: 덱에 다시 섞습니다', 'good'); } // Jackpot!
    else if (id === '40057') { await g.putAllyIntoPlay(x); g.log('화이트 폭스가 플레이에 들어옵니다', 'good'); } // White Fox
    else if (id === '40060') { g.put(x, 'hand'); g.log('깊이 파고들기: 손으로', 'good'); } // Digging Deep
    else { const pl = g.p.supports.find(s => idOf(g, s) === '40045' && g.c(s).under.length < 3); if (pl && g.c(x).zone === 'discard') { g.put(x, 'under', pl); g.c(x).fd = true; g.log('페인티드 레이디에 뒷면으로 붙입니다'); } } // The Painted Lady
    return { card: x, n: res.length, res };
  }
  NE.discardTop = discardTop;

  // ======================= Cable =======================
  const isCable = g => ['40001a', '40001b'].includes(idOf(g, g.idt()));
  const purged = g => (g.e.victory || []).some(u => idOf(g, u) === '40006');
  const cableMods = { grantTrait: (g, s, t) => t === g.idt() && purged(g) ? 'PSIONIC' : null,
    mod: { atk: (g, s, t) => t === g.idt() && g.isHero() && purged(g) ? 1 : 0, thw: (g, s, t) => t === g.idt() && g.isHero() && purged(g) ? 1 : 0, def: (g, s, t) => t === g.idt() && g.isHero() && purged(g) ? 1 : 0 } };
  const heroSrc = (g, src) => !!src && g.c(src) && g.d(src).type !== 'ally' && !g.d(src).enc;
  S['40001a'] = Object.assign({ respond: [{ window: 'sideSchemeDefeated', label: '케이블 준비 (단계당 1번)', can: (g, u, ctx) => heroSrc(g, ctx.src) && g.c(g.idt()).ex && !g.p.phase.cableReady && g.canReady(g.idt()),
    resolve(g) { g.p.phase.cableReady = true; g.c(g.idt()).ex = false; } }] }, cableMods);
  S['40001b'] = Object.assign({ async setup(g) { const x = g.p.deck.concat(g.p.discard).find(u => g.d(u).type === 'pside'); if (x) { await g.enterSide(x, {}); g.shuffle(g.p.deck); g.log(`솔저 X: ${g.nm(x)}을(를) 플레이에 놓습니다`); } } }, cableMods);
  S['40002'] = { play: { timing: 'action', can: g => !g.formLocked(), async resolve(g) { await g.changeForm(true); const f = g.p.form, act = g.s.ctx; for (const pi of g.livingPlayers()) if (pi !== act) await g.withPlayer(pi, async () => { if (g.p.form !== f && !g.formLocked() && await yes(g, `바디슬라이드(${g.playerName()}): ${f === 'hero' ? '히어로' : '일상'} 형태로 변신할까요?`)) await g.changeForm(true); }); } } }; // Bodyslide
  S['40003'] = { play: { timing: 'hero', label: 'thwart', target: 'thwartable', async resolve(g, u, ctx) { await thw(g, ctx.target, 3 + victorySides(g), u); } } }; // Mind Scan
  S['40004'] = { play: { timing: 'hero', async resolve(g) { const n = victorySides(g); const top = g.e.deck.slice(0, n); if (!top.length) return; // Precognition
    if (await yes(g, `예지: 조우 덱 위 ${top.length}장 (${top.map(x => g.nm(x)).join(', ')}) 중 1장을 버릴까요?`)) { const t = await pick(g, top, '버릴 조우 카드'); if (t) g.put(t, 'ediscard'); } } } };
  S['40005'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { await g.playerAttack(g.idt(), ctx.target, 6 + victorySides(g), { src: u }); } } }; // Telekinetic Blast
  S['40006'] = { removeOnlyBy: (g, s, src) => isCable(g) && g.isHero() && !!src && !!g.c(src) && g.d(src).type !== 'ally' && !g.d(src).enc }; // Technovirus Purge: only Cable
  S['40007'] = { respond: [{ window: 'sideSchemeDefeated', label: '그레이말킨 준비', can: (g, u) => g.c(u).ex, resolve(g, u) { g.c(u).ex = false; } }], // Graymalkin
    resources: [{ gen: 'Y', label: '그레이말킨', can: (g, u) => !g.c(u).ex, use: (g, u) => { g.c(u).ex = true; } }] };
  S['40008'] = { actions: [{ timing: 'alter', exhaust: true, label: '소진 → 카드 1장 또는 플레이어 부가 음모를 손으로', async use(g) { // Professor
    const o = await g.ask({ type: 'choice', title: '프로페서: 하나를 고르세요', options: [{ id: 'd', label: '카드 1장 뽑기' }, { id: 's', label: '덱·버림 더미에서 플레이어 부가 음모를 손으로' }] });
    if (o === 'd') await g.draw(1); else await g.searchToHand(d => d.type === 'pside', '프로페서', { discard: true });
  } }] };
  S['40009'] = { respond: [{ window: 'afterHeroDefends', timing: 'hero', exhaust: true, label: '소진·[에너지] 1 → 저지력만큼 위협 제거', cost: { n: 1, req: 'Y' }, can: g => !g.cannotThwart(), // Askani'son
    async resolve(g, u) { await g.removeThreatChoose(g.stat(g.idt(), 'thw'), '아스카니의 아들: 위협을 제거할 음모', u); } }] };
  S['40010'] = { respond: [{ window: 'sideSchemeDefeated', timing: 'hero', label: '강제 기억 상실: 이 카드와 그 음모를 승리 표시 영역에', can: (g, u, ctx) => !!ctx.scheme && !g.d(ctx.scheme).permanent && g.c(ctx.scheme).zone !== 'victory' && !!g.c(ctx.scheme).zone, // Forced Amnesia
    resolve(g, u, ctx) { g.resetCard(ctx.scheme); g.put(ctx.scheme, 'victory'); g.put(u, 'victory'); g.log(`강제 기억 상실: ${g.nm(ctx.scheme)}을(를) 승리 표시 영역에`, 'good'); } }] };
  S['40011'] = { actions: [{ timing: 'hero', kind: 'attack', exhaust: true, label: '플라스마 라이플: [에너지] 1 → 승리 표시 부가 음모마다 피해 1 (원거리)', cost: { n: 1, req: 'Y' }, can: g => victorySides(g) > 0 && g.targets('attackable', g.idt()).length > 0, // Plasma Rifle
    async use(g, u) { const t = await g.chooseTarget('attackable', '플라스마 라이플: 대상', g.idt(), false); if (t) await g.playerAttack(g.idt(), t, Math.min(4, victorySides(g)), { src: u, ranged: true }); } }] };
  const tkff = { label: '염동력 역장 버림 → 그 피해를 모두 방지', resolve(g, u, ctx) { ctx.prevent = ctx.amount; g.discard(u, '염동력 역장'); } };
  S['40012'] = { heroOnly: true, respond: [Object.assign({ window: 'identityWouldTakeDamage', timing: 'hero', can: (g, u, ctx) => ctx.amount > 0 }, tkff), Object.assign({ window: 'allyWouldTakeDamage', timing: 'hero', can: (g, u, ctx) => ctx.amount > 0 }, tkff)] }; // Telekinetic Force Field
  S['40013'] = { respond: [{ window: 'mainWouldComplete', timing: 'hero', label: '시간 도약: 승리 표시 영역의 부가 음모를 꺼내 주 음모의 위협 4를 옮김', can: g => (g.e.victory || []).some(u => g.d(u).type === 'side' || g.d(u).type === 'pside'), // Temporal Leap
    async resolve(g, u, ctx) { const c = (g.e.victory || []).filter(x => ['side', 'pside'].includes(g.d(x).type)); const t = await pick(g, c, '시간 도약: 다시 꺼낼 부가 음모'); if (!t) return; g.removeFromGame(u);
      await g.enterSide(t, {}); const n = Math.min(4, g.c(g.e.main).threat); g.c(g.e.main).threat -= n; g.c(t).threat += n; g.log(`시간 도약: 주 음모의 위협 ${n}을(를) ${g.nm(t)}(으)로`, 'good'); } }] };
  S['40031'] = { async whenRevealed(g, u, ctx) { // Technovirus Resurgence
    const x = g.p.deck.concat(g.p.discard, g.p.hand, g.e.victory || [], g.e.sides).find(y => idOf(g, y) === '40006');
    if (x) { if (g.c(x).zone !== 'side') { g.resetCard(x); await g.enterSide(x, {}); } g.shuffle(g.p.deck); g.attachEnc(u, x); g.log('테크노바이러스 재발: 테크노바이러스 정화가 다시 나타났습니다', 'warn'); return; }
    g.discard(u); const y = g.takeEncounter(); if (y) g.put(y, 'facedown');
  }, accelBonus: (g, u) => g.c(u).zone === 'attach' ? 1 : 0 };
  S['40032'] = { cancelsEventFn: (g, m, ev) => tr(g, ev, 'PSIONIC') && g.c(m).zone === 'minion' }; // Stryfe (nemesis)
  S['40033'] = { blocksRemoval: (g, x, sc) => g.c(x).zone === 'side' && (isCable(g) ? sc !== x : sc === x) }; // Back to the Future
  const stryfeHost = g => g.e.minions.find(m => idOf(g, m) === '40032') || g.e.villain;
  S['40034'] = { attachTo: stryfeHost, // Telekinetic Force Field (encounter)
    on: { wouldTakeDamage(g, u, ctx) { if (ctx.target !== g.c(u).on || ctx.amount <= 0) return; const n = ctx.amount; ctx.amount = 0; g.log(`염동력 역장: 피해 ${n} 방지`, 'warn'); if (n >= 2) g.discard(u, '염동력 역장이 깨졌습니다'); } },
    boostEffect(g, u, ctx) { (ctx.post || ctx.after).push(async gg => { const h = ctx.enemy || gg.e.villain; if (h && gg.c(h).zone && gg.c(u).zone && gg.c(u).zone !== 'attach') gg.attachEnc(u, h); }); } };
  S['40035'] = { async whenRevealed(g) { await g.placeThreat(g.e.main, 2 + victorySides(g), {}); }, boostEffect(g) { g.giveStatus(g.idt(), 'conf', '★ 정신 스캔'); } };
  S['40036'] = { async whenRevealed(g) { await g.dealDamage(g.idt(), 2 + victorySides(g), {}); }, boostEffect(g) { g.giveStatus(g.idt(), 'stun', '★ 염동력 폭발'); } };

  // ======================= Domino =======================
  const swapAction = (from, label) => ({ timing: 'action', once: true, label, can: g => g.p.hand.length > 0 && (from === 'deck' ? g.p.deck.length : g.p.discard.length) > 0, async use(g) {
    const t = await pick(g, g.p.hand.slice(), '바꿀 손 카드'); if (!t) return;
    if (from === 'deck') { const top = g.p.deck[0]; g.put(top, 'hand'); g.put(t, 'deck', null, true); } else { const top = g.p.discard[g.p.discard.length - 1]; g.put(top, 'hand'); g.put(t, 'discard'); }
    g.log(`${label}: 카드를 바꿨습니다`);
  } });
  S['40037a'] = { actions: [swapAction('deck', '행운의 손길: 손 카드와 덱 맨 위 카드 교체')] };
  S['40037b'] = { actions: [swapAction('discard', '니나: 손 카드와 버림 더미 맨 위 카드 교체')] };
  S['40038'] = { actions: [{ timing: 'action', exhaust: true, label: '소진·피해 1·덱 맨 위 버림 → 아이콘마다 각 적에게 피해 1', async use(g, u) { // Diamondback
    await g.dealDamage(u, 1, {}); const r = await discardTop(g, '다이아몬드백'); if (r.n) for (const e of g.enemies().slice()) await g.dealDamage(e, r.n, { src: u, byPlayer: true }); } }] };
  S['40039'] = { respond: [{ window: 'allyPowerUsed', label: '★ 덱 맨 위 버림 → 아이콘마다 공격 +1', can: (g, u, ctx) => ctx.ally === u && ctx.kind === 'attack', async resolve(g, u, ctx) { const r = await discardTop(g, '아웃로'); ctx.bonus += r.n; } }] }; // Outlaw
  S['40040'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { const r = await discardTop(g, '좋은 운동'); await g.playerAttack(g.idt(), ctx.target, 4 + r.n, { src: u }); } } }; // A Good Workout
  S['40041'] = { play: { timing: 'hero', async resolve(g, u) { const r = await discardTop(g, '행운의 여신'); // Luck Be a Lady
    for (let k of r.res.split('')) {
      if (k === 'G') k = await g.ask({ type: 'choice', title: '행운의 여신: [와일드] → 하나를 고르세요', options: [{ id: 'Y', label: '캐릭터 회복 2' }, { id: 'B', label: '위협 2 제거' }, { id: 'R', label: '적에게 피해 3' }] });
      if (k === 'Y') { const t = await pick(g, g.allFriendlyChars().filter(x => g.c(x).dmg > 0), '회복 2를 받을 캐릭터'); if (t) g.heal(t, 2); }
      else if (k === 'B') await g.removeThreatChoose(2, '행운의 여신: 위협 2를 제거할 음모', u);
      else if (k === 'R') { const t = await g.chooseTarget('enemy', '행운의 여신: 피해 3을 줄 적', g.idt(), false); if (t) await g.dealDamage(t, 3, { src: u, byPlayer: true }); }
    } } } };
  S['40042'] = { play: { timing: 'hero', label: 'thwart', target: 'thwartable', async resolve(g, u, ctx) { const r = await discardTop(g, '적시적소'); await thw(g, ctx.target, 3 + r.n, u); } } }; // Right Place, Right Time
  S['40044'] = { actions: [{ timing: 'alter', exhaust: true, label: '소진 → 도미노·[포세] 카드 1장을 덱 맨 위로', can: g => g.p.discard.some(x => g.d(x).cls === 'Hero' || tr(g, x, 'POSSE')), // Pip the Pug
    async use(g) { const t = await pick(g, g.p.discard.filter(x => g.d(x).cls === 'Hero' || tr(g, x, 'POSSE')), '덱 맨 위에 놓을 카드'); if (t) g.put(t, 'deck', null, true); } }] };
  S['40045'] = { actions: [{ timing: 'alter', exhaust: true, label: '소진 → 붙은 카드 1장을 손으로', can: (g, u) => g.c(u).under.length > 0, async use(g, u) { const t = await pick(g, g.c(u).under.slice(), '손으로 가져올 카드'); if (t) { delete g.c(t).fd; g.put(t, 'hand'); } } }] }; // The Painted Lady
  S['40046'] = { actions: [{ timing: 'hero', kind: 'attack', exhaust: true, label: '도미노의 권총: 덱 맨 위 버림 → 아이콘마다 피해 1 (원거리)', can: g => g.targets('attackable', g.idt()).length > 0, // Domino's Pistol
    async use(g, u) { const t = await g.chooseTarget('attackable', '권총: 대상', g.idt(), false); if (!t) return; const r = await discardTop(g, '도미노의 권총'); await g.playerAttack(g.idt(), t, r.n, { src: u, ranged: true }); } }] };
  S['40047'] = { respond: [{ window: 'boostTurned', timing: 'hero', exhaust: true, label: '소진 → 이 강화 카드 취소, 새 강화 카드', can: (g, u, ctx) => ctx.attack && !ctx.cancelIcons, // Lucky and Good
    resolve(g, u, ctx) { ctx.cancelAbility = true; const x = g.takeEncounter(); if (x) { ctx.icons = g.boostOf(x); g.put(x, 'ediscard'); g.log(`운도 실력: 새 강화 카드 ${g.nm(x)} (아이콘 ${ctx.icons})`); } else ctx.cancelIcons = true; } }] };
  S['40048'] = { respond: [{ window: 'cardRevealed', timing: 'hero', label: '럭키 브레이크 버림 → 그 카드 취소, 다른 카드 공개', can: (g, u, ctx) => !ctx.cancelAll, // Lucky Break
    resolve(g, u, ctx) { g.discard(u); ctx.cancelAll = true; ctx.revealAnother = (ctx.revealAnother || 0) + 1; } }] };
  S['40049'] = { respond: [{ window: 'basicPowerUsed', label: '덱 맨 위 버림 → 아이콘마다 이 기본 능력 +1', async resolve(g, u, ctx) { const r = await discardTop(g, '확률장'); ctx.bonus += r.n; } }] }; // Probability Field
  S['40065'] = { blankIdentity: true, whenRevealed(g, u) { g.put(u, 'pobl'); g.log('아마겟돈의 기억: 정체성의 글상자가 비었습니다', 'warn'); }, // Memories of Armageddon
    actions: [{ timing: 'alter', label: '정체성 소진 → 이 카드 버림', can: (g, u) => g.c(u).zone === 'pobl' && !g.c(g.idt()).ex, use(g, u) { g.c(g.idt()).ex = true; g.discard(u); } }] };
  S['40066'] = { whenRevealed(g) { const x = g.e.deck.concat(g.e.discard, g.e.setaside || []).find(u => idOf(g, u) === '40069'); if (x) { g.attachEnc(x, g.idt()); g.shuffle(g.e.deck); } } }; // Topaz
  S['40067'] = { async whenRevealed(g, u) { await g.forEachPlayer(async () => { const o = await g.ask({ type: 'choice', title: `운 나쁜 날(${g.playerName()}): 하나를 고르세요`, options: [{ id: 'd', label: '피해 1 받기' }, { id: 't', label: '이 음모에 위협 2' }] }); if (o === 'd') await g.dealDamage(g.idt(), 1, {}); else g.c(u).threat += 2; }); } };
  S['40068'] = { mod: { hp: (g, s, t) => t === s ? (g.c(s).cnt.luck || 0) : 0 }, whenRevealed(g, u) { g.c(u).cnt.luck = g.c(g.idt()).dmg; } }; // Prototype
  S['40069'] = { attachTo: g => g.idt(), // Superpower Feedback
    on: { async cardPlayed(g, u, ctx) { if (g.c(u).on === g.idt() && ctx.card && g.d(ctx.card).cls === 'Hero') await g.dealDamage(g.idt(), 1, {}); } },
    actions: [{ timing: 'alter', label: '손의 고유 카드 1장 버림 → 이 카드 버림', can: (g, u) => g.c(u).on === g.idt() && g.p.hand.some(x => g.d(x).cls === 'Hero'), async use(g, u) { const t = await pick(g, g.p.hand.filter(x => g.d(x).cls === 'Hero'), '버릴 고유 카드'); if (t) { g.put(t, 'discard'); g.discard(u); } } }] };

  // ======================= aspect / basic cards =======================
  const xteam = (g, u) => ['X-FACTOR', 'X-FORCE', 'X-MEN'].some(t => tr(g, u, t));
  S['40014'] = { async onEnter(g) { // Caliban
    for (let i = 0; i < 80; i++) { if (!g.p.deck.length) await g.reshuffleDeck(); const x = g.p.deck[0]; if (!x) break; g.put(x, 'discard'); if (g.d(x).type === 'ally' && xteam(g, x)) { g.put(x, 'hand'); g.log(`캘리밴: ${g.nm(x)}을(를) 손으로`, 'good'); break; } }
  } };
  S['40015'] = { async onEnter(g) { const x = g.p.deck.concat(g.p.discard).find(u => idOf(g, u) === '40021'); if (x) { g.put(x, 'support'); g.shuffle(g.p.deck); g.log('판토멕스: E.V.A.를 플레이에 놓습니다', 'good'); } } }; // Fantomex
  S['40016'] = { async onPlay(g, u, ctx) { const n = (ctx && ctx.paid || []).reduce((k, x) => k + ((typeof x === 'string' ? x : (x && x.res) || '').split('').filter(c => c === 'Y').length), 0); if (!n) return; // Sunspot
    const pi = await g.choosePlayer('선스팟: 대상 플레이어');
    for (const e of [g.e.villain].filter(Boolean).concat(g.engagedMinions(pi))) await g.dealDamage(e, n, { src: u, byPlayer: true }); g.log(`선스팟: [에너지] ${n}개 → 빌런과 ${g.playerName(pi)}와(과) 교전 중인 하수인에게 피해 ${n}`, 'good'); } };
  S['40017'] = { play: { timing: 'hero', can: g => victorySides(g) > 0, resolve(g) { g.p.phase.noAllyCons = true; g.log('작전 계획: 이번 단계 동안 동료는 후속 피해를 받지 않습니다', 'good'); } } }; // Mission Planning
  S['40018'] = { async whenDefeated(g) { await searchPlay(g, d => d.type === 'ally', '지원 요청: 동료'); } }; // Call for Backup
  S['40019'] = { async whenDefeated(g) { await searchPlay(g, d => d.type === 'upgrade' && (d.tr || []).includes('WEAPON') && (d.cost || 0) <= 3, '장전 완료: [무기] 업그레이드'); } }; // Lock and Load
  S['40020'] = { async whenDefeated(g) { await g.forEachPlayer(() => { g.giveStatus(g.idt(), 'tough', '경계선 확보'); }); } }; // Establish Perimeter
  S['40027'] = { async whenDefeated(g) { await searchPlay(g, d => d.type === 'support' && (d.cost || 0) <= 3, '지원 구축: 지원'); } }; // Build Support
  S['40054'] = { async whenDefeated(g) { await g.forEachPlayer(async () => { const c = g.e.minions.filter(m => !tr(g, m, 'ELITE')); if (!c.length || !(await yes(g, `경비 제압(${g.playerName()}): 간부가 아닌 하수인 하나를 버릴까요?`))) return; const t = await pick(g, c, '버릴 하수인'); if (t) g.discard(t, '경비 제압'); }); } }; // Take Out the Guards
  S['40059'] = { async whenDefeated(g) { await searchPlay(g, d => d.type === 'upgrade' && d.cls === 'Hero', '초능력 훈련: 고유 업그레이드'); } }; // Superpower Training
  const fantomex = g => g.p.allies.find(a => idOf(g, a) === '40015') || null;
  S['40021'] = { // E.V.A.
    on: { turnBegins(g, u) { if (g.c(u).zone === 'support' && !fantomex(g)) g.discard(u, 'E.V.A.: 판토멕스가 없어 버림'); } },
    actions: [{ timing: 'action', exhaust: true, label: '소진 → 위협 1 제거 / 적에게 피해 1 / 판토멕스 회복 1', can: g => !!fantomex(g), async use(g, u) {
      const o = await g.ask({ type: 'choice', title: 'E.V.A.: 하나를 고르세요', options: [{ id: 't', label: '위협 1 제거' }, { id: 'd', label: '적에게 피해 1' }, { id: 'h', label: '판토멕스 회복 1' }] });
      if (o === 't') await g.removeThreatChoose(1, 'E.V.A.', u); else if (o === 'd') { const t = await g.chooseTarget('enemy', 'E.V.A.: 피해 1을 줄 적', u, false); if (t) await g.dealDamage(t, 1, { src: u, byPlayer: true }); } else { const f = fantomex(g); if (f) g.heal(f, 1); }
    } }] };
  S['40022'] = { mod: { thw: (g, s, t) => g.p.allies.includes(t) && g.friendlyChars().every(x => tr(g, x, 'X-FORCE')) ? 1 : 0 } }; // Uncanny X-Force
  S['40023'] = { selfCostMod: g => tr(g, g.idt(), 'SOLDIER') ? 1 : 0, // Mission Leader
    respond: [{ window: 'sideSchemeDefeated', timing: 'hero', exhaust: true, label: '소진 → 각 플레이어 카드 1장 뽑기', async resolve(g) { await g.forEachPlayer(() => g.draw(1)); } }] };
  S['40024'] = { wouldBeDefeated(g, u, wctx) { if (!wctx.consequential) return; wctx.saved = true; g.heal(u, 3); g.addAccel(1); g.log('데드풀: 후속 피해로 쓰러지지 않고 회복 3 (가속 토큰 +1)', 'warn'); } }; // Deadpool (ally)
  S['40025'] = { async onEnter(g, u) { // Deathlok
    const c = g.livingPlayers().flatMap(pi => g.s.ps[pi].discard).filter(x => g.d(x).type === 'upgrade' && (g.d(x).cost || 0) <= 1 && g.sc(x).attach && g.targets(g.sc(x).attach, x).includes(u)); if (!c.length) return;
    const t = await pick(g, c, '데스락: 붙일 업그레이드'); if (t) { g.put(t, 'attach', u); g.log(`데스락: ${g.nm(t)} 장착`, 'good'); }
  } };
  S['40026'] = { play: { timing: 'hero', label: 'thwart', async resolve(g, u) { // Frenemies
    const nm = x => (g.d(x).en || '').replace(/^\*\s*/, ''); for (const x of g.allFriendlyChars().filter(x => ['Cable', 'Deadpool'].includes(nm(x)))) await g.dealDamage(x, 1, {});
    const a = await g.chooseTarget('thwartable', '프레너미: 위협 3을 제거할 음모', u, false); if (a) await thw(g, a, 3, u);
    const b = await g.chooseTarget({ kind: 'thwartable', filter: (gg, x) => x !== a }, '프레너미: 다른 음모에서 위협 3', u, false); if (b) await thw(g, b, 3, u);
  } } };
  S['40028'] = { doubleFor: (g, u, f) => tr(g, f, 'PSIONIC') }; // The Power of the Mind
  S['40029'] = { respond: [{ window: 'cardPlayedDone', timing: 'hero', exhaust: true, label: '소진 → 적에게 피해 2', can: (g, u, ctx) => ctx.card && ctx.card !== u && tr(g, ctx.card, 'PSIONIC'), // Psimitar
    async resolve(g, u) { const t = await g.chooseTarget('enemy', '사이미타: 피해 2를 줄 적', g.idt(), false); if (t) await g.dealDamage(t, 2, { src: u, byPlayer: true }); } }] };
  S['40050'] = { respond: [{ window: 'afterAllyThwart', label: '★ 덱 맨 위 버림 → 아이콘마다 빌런에게 피해 1', can: (g, u, ctx) => ctx.ally === u, async resolve(g, u) { const r = await discardTop(g, '페랄'); if (r.n && g.e.villain) await g.dealDamage(g.e.villain, r.n, { src: u, byPlayer: true }); } }] }; // Feral
  S['40051'] = { respond: [{ window: 'afterAllyThwart', label: '★ 유형을 정하고 덱 맨 위 버림 → 맞으면 손으로', can: (g, u, ctx) => ctx.ally === u, async resolve(g) { // Wolfsbane
    const ty = await g.ask({ type: 'choice', title: '울프스베인: 카드 유형을 고르세요', options: ['ally', 'event', 'support', 'upgrade', 'resource'].map(k => ({ id: k, label: { ally: '동료', event: '이벤트', support: '지원', upgrade: '업그레이드', resource: '자원' }[k] })) });
    const r = await discardTop(g, '울프스베인'); if (r.card && g.d(r.card).type === ty && g.c(r.card).zone === 'discard') { g.put(r.card, 'hand'); g.log(`울프스베인: ${g.nm(r.card)}을(를) 손으로`, 'good'); }
  } }] };
  S['40053'] = { play: { timing: 'hero', can: g => g.e.sides.some(x => g.c(x).threat > 0), async resolve(g, u) { const t = await g.chooseTarget({ kind: 'thwartable', filter: (gg, x) => gg.c(x).zone === 'side' }, '팀 수사: 위협을 제거할 부가 음모', u, false); if (t) await thw(g, t, 3 * g.players, u); } } }; // Team Investigation
  S['40056'] = { actions: [{ timing: 'action', exhaust: true, label: '소진 → 덱 맨 위 확인 (이벤트면 피해 1로 손에)', can: g => g.p.deck.length > 0, async use(g, u) { // Atlas Bear
    const x = g.p.deck[0]; g.log(`아틀라스 베어: 덱 맨 위는 ${g.nm(x)}`); if (g.d(x).type === 'event' && await yes(g, `${g.nm(x)}: 피해 1을 받고 손으로 가져올까요?`)) { await g.dealDamage(u, 1, {}); g.put(x, 'hand'); } } }] };
  S['40058'] = { play: { timing: 'hero', can: g => g.friendlyChars().filter(x => tr(g, x, 'POSSE')).length >= 3, resolve(g) { for (const x of g.allFriendlyChars().filter(x => tr(g, x, 'POSSE'))) { g.heal(x, 1); if (g.canReady(x)) g.c(x).ex = false; } } } }; // The Posse
  S['40064'] = { respond: [{ window: 'heroRangedAttack', label: '덱 맨 위 버림 → 아이콘마다 피해 +1', async resolve(g, u, ctx) { const r = await discardTop(g, '명사수'); ctx.bonus += r.n; } }] }; // Sharpshooter
  S['40204'] = { grantTrait: (g, s, t) => t === s ? (g.d(g.idt()).tr || []) : null, // Hope Summers (ally)
    async onPlay(g) { await g.searchToHand(d => (d.tr || []).includes('SUPERPOWER'), '호프 서머스: [초능력] 카드'); } };

  // ======================= modular sets =======================
  const searchEnc = (g, pred) => g.e.deck.concat(g.e.discard).find(u => pred(g.d(u), u)) || null;
  const searchReveal = async (g, pred) => { const x = searchEnc(g, pred); if (x) { g.shuffle(g.e.deck); await g.reveal(x); } return x; };
  const millUntil = async (g, pred, engage) => { for (let i = 0; i < 80; i++) { const x = g.takeEncounter(); if (!x) return null; if (pred(g.d(x), x)) { if (engage) await g.enterMinion(x, {}); else await g.reveal(x); return x; } g.put(x, 'ediscard'); } return null; };
  NE.searchReveal = searchReveal; NE.millUntil = millUntil;
  const mine = g => g.friendlyChars();
  const handRes = (g, r) => g.p.hand.reduce((n, x) => n + (g.d(x).res || '').split('').filter(c => c === r).length, 0);
  const handTypeMax = g => { const k = {}; for (const x of g.p.hand) { const t = g.d(x).type; k[t] = (k[t] || 0) + 1; } return Math.max(0, ...Object.values(k)); };
  NE.handTypeMax = handTypeMax;
  const choose2 = async (g, title, a, b) => (await g.ask({ type: 'choice', title, options: [{ id: 'a', label: a }, { id: 'b', label: b }] })) === 'a';
  const costOf = (g, u) => g.d(u).cost || 0;
  const controlledCards = g => g.p.allies.concat(g.p.supports, g.p.upgrades).filter(x => !g.d(x).permanent && !g.sc(x).noAllyLimit);
  // Marauders: "when X attacks you or an ally you control, choose ..."
  const marauder = (label, costLabel, payCost, bonus) => async (g, u, ctx) => {
    if (await choose2(g, `★ ${g.nm(u)}: 하나를 고르세요`, costLabel, `${g.nm(u)} 공격 +${bonus.atk ? bonus.atk(g, u) : 2}${bonus.extra ? ` (${bonus.extra})` : ''}`) && (await payCost(g, u, ctx)) !== false) return;
    ctx.atkBonus = (ctx.atkBonus || 0) + (bonus.atk ? bonus.atk(g, u) : 2); if (bonus.props) Object.assign(ctx, bonus.props); if (bonus.fd) g.giveFacedownBoostTo(u, 1);
  };
  const pickChar = async (g, title, by) => { let c = mine(g).filter(x => g.c(x).zone); if (by) { const top = Math.max(...c.map(x => g.stat(x, by) || 0)); c = c.filter(x => (g.stat(x, by) || 0) === top); } return pick(g, c, title); };
  const M = {
    arclight: (b) => marauder('아크라이트', b ? '저지력이 가장 높은 캐릭터 혼란' : '캐릭터 하나 혼란', async g => { const t = await pickChar(g, '혼란에 빠질 캐릭터', b ? 'thw' : null); if (t) g.giveStatus(t, 'conf', '★ 아크라이트'); }, {}),
    blockbuster: (b) => marauder('블록버스터', '블록버스터에게 강인함', (g, u) => { g.giveStatus(u, 'tough', '★ 블록버스터'); }, b ? { props: { overkill: true }, extra: '압살' } : {}),
    chimera: (b) => marauder('키메라', b ? '[정신][정신] 소모' : '[정신] 소모', async g => { if (!g.canAfford({ n: b ? 2 : 1, req: b ? 'BB' : 'B' }, null)) return false; const r = await g.pay({ n: b ? 2 : 1, req: b ? 'BB' : 'B' }, null, '키메라', true); return r != null; }, {}),
    greycrow: (b) => marauder('그레이크로우', b ? '비용이 가장 높은 카드 모두 버림' : '비용이 가장 높은 카드 1장 버림', async g => { const c = controlledCards(g); if (!c.length) return false; const top = Math.max(...c.map(x => costOf(g, x))); const t = c.filter(x => costOf(g, x) === top); if (b) for (const x of t) g.discard(x, '★ 그레이크로우'); else { const x = await pick(g, t, '버릴 카드'); if (x) g.discard(x, '★ 그레이크로우'); } },
      { atk: g => { const c = controlledCards(g); return c.length ? Math.max(...c.map(x => costOf(g, x))) : 0; } }),
    harpoon: (b, minion) => marauder('하푼', `간접 피해 ${b ? 3 : 2}`, async g => { await g.indirectDamage(b ? 3 : 2, null); }, minion ? { props: { piercing: true }, extra: '관통' } : { atk: () => 0, fd: true, props: b ? { overkill: true } : {}, extra: '뒷면 강화 카드 +1' }),
    riptide: (b) => marauder('립타이드', `주 음모 위협 ${b ? 3 : 2}, 부가 음모마다 1`, async g => { await g.placeThreat(g.e.main, b ? 3 : 2, {}); for (const s of g.e.sides.slice()) await g.placeThreat(s, 1, {}); }, b ? { props: { ranged: true, piercing: true }, extra: '원거리·관통' } : {}),
    vertigo: (b) => marauder('버티고', b ? '공격력이 가장 높은 캐릭터 기절' : '캐릭터 하나 기절', async g => { const t = await pickChar(g, '기절할 캐릭터', b ? 'atk' : null); if (t) g.giveStatus(t, 'stun', '★ 버티고'); }, {})
  };
  const mar = f => ({ onAttackStart: f });
  Object.assign(S, { '40070a': mar(M.arclight(0)), '40070b': mar(M.arclight(1)), '40071a': mar(M.blockbuster(0)), '40071b': mar(M.blockbuster(1)), '40072a': mar(M.chimera(0)), '40072b': mar(M.chimera(1)),
    '40073a': mar(M.greycrow(0)), '40073b': mar(M.greycrow(1)), '40074a': mar(M.harpoon(0)), '40074b': mar(M.harpoon(1)), '40075a': mar(M.riptide(0)), '40075b': mar(M.riptide(1)), '40076a': mar(M.vertigo(0)), '40076b': mar(M.vertigo(1)),
    '40094': mar(M.arclight(0)), '40095': mar(M.blockbuster(0)), '40096': mar(M.chimera(0)), '40097': mar(M.greycrow(0)), '40098': mar(M.harpoon(0, true)), '40099': mar(M.riptide(0)), '40100': mar(M.vertigo(0)) });
  const MARAUDER_IDS = { Arclight: ['40070', '40094'], Blockbuster: ['40071', '40095'], Chimera: ['40072', '40096'], Greycrow: ['40073', '40097'], Harpoon: ['40074', '40098'], Riptide: ['40075', '40099'], Vertigo: ['40076', '40100'] };
  NE.MARAUDER_IDS = MARAUDER_IDS;
  const isMarauderMinion = d => d.type === 'minion' && (d.tr || []).includes('MARAUDER');
  S['40101'] = { grantKw: (g, s, t) => g.c(s).zone === 'side' && g.d(t).type === 'minion' && tr(g, t, 'MARAUDER') ? ['quickstrike'] : null, // Mutant Slayers
    async whenRevealed(g, u) { const n = g.allFriendlyChars().concat(g.enemies()).filter(x => ['MUTANT', 'X-FACTOR', 'X-FORCE', 'X-MEN'].some(t => tr(g, x, t))).length; if (n) await g.placeThreat(u, n, { src: u }); } };
  const inPlayNames = g => new Set(g.inPlay().map(x => (g.d(x).en || '').replace(/^\*\s*/, '').replace(/\s+[AB]$/, '')));
  S['40102'] = { async whenRevealed(g) { const names = inPlayNames(g); await millUntil(g, d => isMarauderMinion(d) && !names.has((d.en || '').replace(/^\*\s*/, '')), true); } }; // Bound by Business
  // Military Grade
  const topAtk = g => { const c = g.enemies(); if (!c.length) return null; const t = Math.max(...c.map(x => g.stat(x, 'atk'))); return c.find(x => g.stat(x, 'atk') === t); };
  const lowHp = g => { const c = g.enemies(); if (!c.length) return null; const t = Math.min(...c.map(x => g.hpLeft(x))); return c.find(x => g.hpLeft(x) === t); };
  S['40090'] = { attachTo: topAtk, mod: { retaliate: (g, s, t) => t === g.c(s).on ? 2 : 0 }, // Heavy Armament
    respond: [{ window: 'heroAttacked', timing: 'hero', label: '같은 유형 자원 2개 → 이 카드 버림', can: (g, u, ctx) => ctx.target === g.c(u).on && ['Y', 'B', 'R'].some(r => g.canAfford({ n: 2, req: r + r }, null)), async resolve(g, u) {
      const r = await g.ask({ type: 'choice', title: '중화기: 자원 유형', options: ['Y', 'B', 'R'].filter(k => g.canAfford({ n: 2, req: k + k }, null)).map(k => ({ id: k, label: { Y: '[에너지]×2', B: '[정신]×2', R: '[물리]×2' }[k] })) });
      if ((await g.pay({ n: 2, req: r + r }, null, '중화기 제거', true)) != null) g.discard(u, '중화기 제거'); } }] };
  S['40091'] = { attachTo: lowHp, on: { wouldTakeDamage(g, u, ctx) { if (ctx.target === g.c(u).on && ctx.byPlayer && ctx.amount > 2) { ctx.amount = 2; g.log('티타늄 외골격: 피해는 2까지만'); } } }, // Titanium Exoskeleton
    actions: [{ timing: 'hero', label: '자원 3 또는 그 적의 혼란·기절 카드 제거 → 이 카드 버림', can: (g, u) => g.c(u).zone === 'attach', async use(g, u) { const h = g.c(u).on;
      if ((g.c(h).stun || g.c(h).conf) && await yes(g, '티타늄 외골격: 그 적의 상태 카드를 버리고 제거할까요? (아니요: 자원 3)')) { if (g.c(h).stun) g.c(h).stun = false; else g.c(h).conf = false; g.discard(u); return; }
      if ((await g.pay({ n: 3, req: '' }, null, '티타늄 외골격 제거', true)) != null) g.discard(u); } }] };
  S['40092'] = { attachTo: g => g.idt(), blankHost: true, // Inhibitor Collar
    actions: [{ timing: 'action', label: '캐릭터 소진 또는 피해 3 → 이 카드 버림', can: (g, u) => g.c(u).on === g.idt(), async use(g, u) {
      const c = mine(g).filter(x => !g.c(x).ex); if (c.length && await yes(g, '억제 목걸이: 캐릭터를 소진할까요? (아니요: 피해 3)')) { const t = await pick(g, c, '소진할 캐릭터'); g.c(t).ex = true; } else await g.dealDamage(g.idt(), 3, {}); g.discard(u); } }] };
  S['40093'] = { async whenDefeated(g) { await g.withPlayer(g.s.first, () => millUntil(g, d => d.type === 'attachment')); } }; // The Senator's Support
  // Nasty Boys
  const exhaustOne = async (g, why) => { const t = await pick(g, mine(g).filter(x => !g.c(x).ex), `${why}: 소진할 캐릭터`); if (t) g.c(t).ex = true; };
  S['40112'] = { async onAttackStart(g) { await exhaustOne(g, '★ 고저스 조지'); }, async boostEffect(g) { await exhaustOne(g, '★ 고저스 조지'); } }; // Gorgeous George
  S['40113'] = { boostEffect(g, u, ctx) { (ctx.post || ctx.after).push(async gg => { if (gg.c(u).zone && !['minion', 'edeck'].includes(gg.c(u).zone)) { gg.put(u, 'edeck'); gg.shuffle(gg.e.deck); gg.log('★ 헤어백: 조우 덱에 섞습니다'); } }); } }; // Hairbag
  S['40114'] = { attackProps: () => ({ piercing: true }), boostEffect(g, u, ctx) { if (ctx && ctx.enemy === g.e.villain) ctx.piercing = true; } }; // Ramrod
  S['40115'] = { whenRevealed(g) { for (const x of mine(g)) g.giveStatus(x, 'stun', '럭커스'); }, boostEffect(g) { g.giveStatus(g.idt(), 'stun', '★ 럭커스'); } }; // Ruckus
  S['40116'] = { onAttackStart(g, u, ctx) { const c = g.c(u); c.cnt.growth = (c.cnt.growth || 0) + 1; ctx.atkBonus = (ctx.atkBonus || 0) + c.cnt.growth; } }; // Slab
  S['40117'] = { mod: { atk: (g, s, t) => g.c(s).zone === 'side' && g.d(t).type === 'minion' ? 1 : 0 }, // Get Nasty
    async whenRevealed(g, u) { const n = g.e.minions.reduce((k, m) => k + (tr(g, m, 'NASTY BOY') ? 2 : 1), 0); if (n) g.c(u).threat += n; await searchReveal(g, d => d.type === 'minion' && (d.tr || []).includes('NASTY BOY')); } };
  // Black Tom Cassidy
  const willows = g => g.e.minions.filter(m => idOf(g, m) === '40133');
  S['40132'] = { cannotTakeDamage: g => willows(g).length > 0, async whenRevealed(g) { const x = searchEnc(g, d => d.id === '40133'); if (x) { g.shuffle(g.e.deck); await g.enterMinion(x, {}); } } }; // Black Tom Cassidy
  S['40133'] = { on: { afterEnemyAttack(g, u, ctx) { if (ctx.enemy === u) for (const x of (ctx.damaged || [])) if (g.c(x).zone) g.giveStatus(x, 'stun', '★ 크리핑 윌로'); } }, // Creeping Willow
    whenRevealed(g, u, ctx) { if (g.e.sides.some(s => idOf(g, s) === '40134')) ctx.surge++; }, boostEffect(g) { g.giveStatus(g.idt(), 'stun', '★ 크리핑 윌로'); } };
  S['40135'] = { async whenRevealed(g) { const w = willows(g), me = g.s.ctx; let hitMe = false; for (const m of w) if (g.c(m).zone === 'minion') { const pi = g.c(m).eng != null ? g.c(m).eng : me; if (pi === me) hitMe = true; await g.withPlayer(pi, async () => { if (g.c(g.idt()).zone) await g.enemyAttack(m, {}); }); } if (!hitMe) await searchReveal(g, d => d.id === '40133'); } }; // A Sound Thrashing
  // Extreme Measures
  S['40180'] = { async whenRevealed(g) { if (await choose2(g, '스트로브: 하나를 고르세요', '내 캐릭터 모두 기절', '내 캐릭터 모두 피해 1')) for (const x of mine(g)) g.giveStatus(x, 'stun', '스트로브'); else for (const x of mine(g).slice()) await g.dealDamage(x, 1, {}); } };
  S['40181'] = { mod: { hs: (g, s, t) => g.c(s).zone === 'minion' && g.c(s).eng != null && g.s.ps[g.c(s).eng] && t === g.s.ps[g.c(s).eng].identity ? 1 : 0 }, // Tempo
    on: { enemyActivated(g, u, ctx) { if (ctx.enemy !== u) return; const n = 2 * g.p.hand.length; for (let i = 0; i < n && g.p.deck.length; i++) g.put(g.p.deck[0], 'discard'); g.log(`★ 템포: 덱 위 ${n}장 버림`, 'warn'); } } };
  const returnTop = async (g, list, why) => { if (!list.length) return false; const top = Math.max(...list.map(x => costOf(g, x))); const t = await pick(g, list.filter(x => costOf(g, x) === top), `${why}: 손으로 되돌릴 카드`); if (!t) return false; for (const a of g.c(t).att.slice()) g.discard(a); g.resetCard(t); g.put(t, 'hand'); g.log(`${why}: ${g.nm(t)}을(를) 손으로`, 'warn'); return true; };
  S['40182'] = { on: { wouldTakeDamage(g, u, ctx) { if (ctx.target === u && ctx.byPlayer && ctx.amount > 0 && !(ctx.src && tr(g, ctx.src, 'TINY'))) ctx.amount -= 1; } }, // Thumbelina
    async whenRevealed(g) { await returnTop(g, g.p.upgrades.filter(x => !g.d(x).permanent), '썸벨리나'); } };
  S['40183'] = { async whenRevealed(g, u) { if (await choose2(g, '와일드사이드: 하나를 고르세요', '와일드사이드가 당신을 공격', '비용이 가장 높은 지원을 손으로')) { if (g.c(u).zone === 'minion') await g.enemyAttack(u, {}); } else await returnTop(g, g.p.supports.filter(x => !g.d(x).permanent), '와일드사이드'); } };
  S['40184'] = { on: { async cardPlayed(g, u, ctx) { if (g.c(u).zone !== 'side' || !ctx.card || g.d(ctx.card).enc || g.d(ctx.card).type === 'event') return; const n = g.d(ctx.card).cost || 0; if (n) await g.indirectDamage(n, null); } } }; // Extreme Measures
  // Mutant Insurrection
  S['40185'] = { onAttackStart(g, u, ctx) { ctx.atkBonus = (ctx.atkBonus || 0) + handRes(g, 'Y'); }, beforeScheme(g, u, ctx) { ctx.reduce -= handRes(g, 'Y'); } }; // Dragoness
  S['40186'] = { on: { afterEnemyAttack(g, u, ctx) { if (ctx.enemy !== u) return; const n = handRes(g, 'R'); for (let i = 0; i < n && g.p.deck.length; i++) g.put(g.p.deck[0], 'discard'); if (n) g.log(`★ 포암: 덱 위 ${n}장 버림`, 'warn'); } } }; // Forearm
  S['40187'] = { onAttackStart(g) { const n = handRes(g, 'B'); if (n >= 2) g.giveStatus(g.idt(), 'stun', '★ 리퍼'); if (n >= 4) g.c(g.idt()).ex = true; } }; // Reaper
  S['40188'] = { on: { async afterEnemyAttack(g, u, ctx) { if (ctx.enemy !== u || !g.c(u).zone) return; const c = g.c(u); c.cnt.charge = (c.cnt.charge || 0) + 1; const k = c.cnt.charge; // Samurai
    const cand = controlledCards(g).filter(x => costOf(g, x) >= k);
    if (cand.length && await choose2(g, `★ 사무라이: 하나를 고르세요 (충전 ${k})`, `비용 ${k} 이상 카드 1장 버림`, `피해 ${k}`)) { const t = await pick(g, cand, '버릴 카드'); if (t) g.discard(t); } else await g.dealDamage(g.idt(), k, {});
  } } };
  S['40189'] = { grantKw: (g, s, t) => g.c(s).zone === 'side' && g.d(t).type === 'minion' ? ['toughness'] : null, // Mutant Insurrection
    on: { minionEnters(g, u, ctx) { if (g.c(u).zone === 'side') g.giveStatus(ctx.minion, 'tough', '뮤턴트 봉기'); } },
    async whenRevealed(g, u, ctx) { const n = 2 * g.enemies().filter(x => tr(g, x, 'MUTANT LIBERATION FRONT')).length; if (n) g.c(u).threat += n; else ctx.surge++; } };

  // ======================= scenarios =======================
  const aside = (g, id) => (g.e.aside || []).concat(g.e.setaside || []).find(u => idOf(g, u) === id) || null;
  const facedown = (g, why) => { const x = g.takeEncounter(); if (x) { g.put(x, 'facedown'); g.log(`${why}: 뒷면 조우 카드 1장`, 'warn'); } };
  const hope = g => g.allAllies().find(a => idOf(g, a) === '40130') || null;
  const hopeIntoPlay = g => { const h = g.e.deck.concat(g.e.aside || [], g.e.setaside || []).find(u => idOf(g, u) === '40130'); if (h) { g.withPlayerSync(g.s.first, () => { g.put(h, 'ally'); g.c(h).ex = false; }); g.log(`호프 서머스가 ${g.playerName(g.s.first)}의 조종하에 들어옵니다`, 'good'); } };
  S['40130'] = { noAllyLimit: true, on: firstCtrl('ally'), baseFn: (g, u, k) => { if (!['atk', 'thw'].includes(k)) return null; const pi = g.c(u).ctrl != null ? g.c(u).ctrl : g.s.first; const idt = g.s.ps[pi] && g.s.ps[pi].identity; return idt ? (g.stat(idt, k) || 0) : 0; }, onLeave(g) { g.lose('호프 서머스가 플레이를 떠났습니다'); } }; // Hope Summers (encounter)
  S['40131'] = { whenRevealed(g) { const h = hope(g); if (h) g.c(h).ex = true; } }; // Captive Hope
  S['40131'].blocksReady = (g, s, u) => g.c(s).zone === 'side' && u === hope(g);
  const villainBaseName = (g, v) => (g.d(v).en || '').replace(/^\*\s*/, '').replace(/\s+[AB]$/, '');
  const discardSameTitle = (g, v) => { const nm = villainBaseName(g, v); for (const m of g.e.minions.slice()) if ((g.d(m).en || '').replace(/^\*\s*/, '') === nm) g.discard(m, `${g.nm(m)}: 같은 이름의 빌런이 등장`); };

  // ---------- Morlock Siege ----------
  const routed = g => (g.e.env || []).find(u => ['40081a', '40081b'].includes(idOf(g, u))) || null;
  const underRouted = g => g.e.stage || 0;
  S['40077a'] = { setup(g) { const r = aside(g, g.s.scen.expert ? '40081b' : '40081a') || aside(g, '40081a'); if (r) { if (g.s.scen.expert) g.c(r).id = '40081b'; g.put(r, 'env'); } discardSameTitle(g, g.e.villain); } };
  S['40077b'] = { on: { async mainStep1(g, u) { if (g.c(u).zone !== 'main' || idOf(g, u) !== '40077b') return; const c = g.c(u); c.cnt.knock = (c.cnt.knock || 0) + 1; g.log(`노크 카운터 ${c.cnt.knock}`, 'warn'); if (c.cnt.knock >= 3) { g.e.knocked = true; await g.setMainStage(1); } } } };
  S['40078a'] = { async whenRevealed(g) { // Mutant Massacre: Morlock allies join
    const ms = [];
    if (g.players === 1) {
      for (const m of (g.e.aside || []).filter(u => idOf(g, u) === '40079').slice(0, 2)) { g.put(m, 'ally'); g.c(m).ex = false; if (g.e.knocked) g.giveStatus(m, 'tough', '몰록'); ms.push(m); }
    } else {
      await g.forEachPlayer(() => { const m = (g.e.aside || []).find(u => idOf(g, u) === '40079'); if (m) { g.put(m, 'ally'); g.c(m).ex = false; if (g.e.knocked) g.giveStatus(m, 'tough', '몰록'); ms.push(m); } });
    }
    const h = (g.e.aside || []).find(u => idOf(g, u) === '40080'); if (h) { g.put(h, 'edeck'); g.shuffle(g.e.deck); } g.log(`몰록 동료 ${ms.length}명이 합류합니다`, 'good');
  } };
  const morlocks = g => g.p.allies.filter(a => idOf(g, a) === '40079');
  const allMorlocks = g => g.allAllies().filter(a => idOf(g, a) === '40079');
  S['40078b'] = { loseOnComplete: true, actions: [{ timing: 'action', label: '몰록 소진 → 버린 조우 더미의 숨어!를 조우 덱에', can: g => morlocks(g).some(a => !g.c(a).ex) && g.e.discard.some(u => idOf(g, u) === '40080'), async use(g) {
    const m = await pick(g, morlocks(g).filter(a => !g.c(a).ex), '소진할 몰록'); if (m) g.c(m).ex = true; const h = g.e.discard.find(u => idOf(g, u) === '40080'); if (h) { g.put(h, 'edeck'); g.shuffle(g.e.deck); } } }] };
  S['40079'] = { noAllyLimit: true, onLeave(g) { if (g.e.main && idOf(g, g.e.main) === '40078b' && !allMorlocks(g).length) g.lose('플레이 중인 몰록 동료가 없습니다'); }, // Morlock
    attackRedirect: true };
  for (const id of ['40081a', '40081b']) S[id] = { on: { async villainAdvanced(g, u, ctx) { // Routed
    const v = ctx.villain; const c = g.c(v); c.stun = c.conf = c.stunH = c.confH = false; for (const a of c.att.slice()) if (!g.d(a).permanent) g.discard(a);
    discardSameTitle(g, v); g.log(`패주: 빌런 ${underRouted(g)}명이 패주했습니다`, 'good'); await g.forEachPlayer(async () => { if (g.c(v).zone) await g.activate(v, {}); });
  } } };
  S['40081b'].mod = { retaliate: (g, s, t) => t === g.e.villain ? underRouted(g) : 0 };
  S['40080'] = { async whenRevealed(g) { const t = await pick(g, allMorlocks(g), '숨어!: 강인함 카드를 줄 몰록 동료'); if (t) g.giveStatus(t, 'tough', '숨어!'); }, async boostEffect(g) { const t = await pick(g, allMorlocks(g), '★ 숨어!: 강인함 카드를 줄 몰록 동료'); if (t) g.giveStatus(t, 'tough', '★ 숨어!'); if (g.e.villain) g.giveFacedownBoostTo(g.e.villain, 1); } }; // Hide!
  S['40082'] = { attachTo: g => g.e.villain, boostEffect: g => underRouted(g), // Bolstered by Wrath
    actions: [{ timing: 'hero', label: '캐릭터 소진·자원 X → 이 카드 버림', can: (g, u) => g.c(u).zone === 'attach' && mine(g).some(x => !g.c(x).ex), async use(g, u) { const t = await pick(g, mine(g).filter(x => !g.c(x).ex), '소진할 캐릭터'); g.c(t).ex = true; const n = underRouted(g); if (!n || (await g.pay({ n, req: '' }, null, `분노의 고취: 자원 ${n}`, true)) != null) g.discard(u); } }] };
  S['40083'] = { attachTo: g => g.e.villain, grantSteady: false, // Pushed to the Limit
    actions: [{ timing: 'hero', label: '빌런이 당신을 공격 → 이 카드 버림', can: (g, u) => g.c(u).zone === 'attach', async use(g, u) { const v = g.c(u).on; g.discard(u); if (v && g.c(v).zone) await g.enemyAttack(v, {}); } }] };
  S['40083'].steadyFor = (g, s, t) => t === g.c(s).on && underRouted(g) === 1; S['40083'].stalwartFor = (g, s, t) => t === g.c(s).on && underRouted(g) === 2;
  S['40088'] = { async whenRevealed(g) { if (g.e.villain) g.giveStatus(g.e.villain, 'tough', '다시 전투로'); const n = underRouted(g); if (n) await g.placeThreat(g.e.main, n, {}); }, // Back in Action
    async boostEffect(g) { const m = morlocks(g); if (!m.length) return; if (await choose2(g, '★ 다시 전투로: 하나를 고르세요', '몰록에게 피해 1', '자원 1 소모') || (await g.pay({ n: 1, req: '' }, null, '자원 1', true)) == null) await g.dealDamage(m[0], 1, {}); } };
  S['40089'] = { async whenRevealed(g, u, ctx) { if (!g.isHero()) { ctx.surge++; return; } if (g.e.villain) { await g.enemyAttack(g.e.villain, {}); } }, // Seek the Weak
    boostEffect(g, u, ctx) { if (ctx && 'undefended' in ctx) ctx.overkill = true; } };
  for (const id of ['40084', '40085', '40086', '40087']) S[id] = { whenRevealed(g, u) { g.c(u).threat += underRouted(g) * g.players; } };

  // ---------- On the Run ----------
  const captor = g => g.e.villain && g.c(g.e.villain).att.find(a => ['40105a', '40105b'].includes(idOf(g, a)));
  S['40103a'] = { setup(g) { const v = g.e.villain; if (!v) return; const nm = villainBaseName(g, v);
    for (const m of g.e.deck.slice()) if ((g.d(m).en || '').replace(/^\*\s*/, '') === nm) { g.removeFromGame(m); g.log(`${g.nm(m)} (하수인) 제거`); }
    const c = aside(g, '40105a'); if (c) g.attachEnc(c, v); } };
  const marauderGuard = { grantKw: (g, s, t) => g.d(t).type === 'minion' && tr(g, t, 'MARAUDER') ? ['guard'] : null };
  const marauderSteady = (g, s, t) => (g.d(t).type === 'minion' && tr(g, t, 'MARAUDER')) || (g.s.scen.expert && t === g.e.villain);
  S['40103b'] = { steadyFor: marauderSteady, async whenRevealed(g) { await g.forEachPlayer(async () => { const x = g.e.deck.find(u => isMarauderMinion(g.d(u))); if (x) await g.enterMinion(x, {}); }); g.shuffle(g.e.deck); } };
  S['40104b'] = Object.assign({ steadyFor: marauderSteady, loseOnComplete: true }, marauderGuard);
  const captorInstead = async (g, a, enemy) => { if (!g.e.minions.some(m => tr(g, m, 'MARAUDER'))) return false; g.log('★ 호프를 붙잡은 자: 공격 대신 음모'); await g.enemyScheme(enemy, {}); };
  S['40105a'] = { permanent: true, hostInsteadOfAttack: captorInstead, // Hope's Captor (Confident)
    on: { async hostWouldBeDefeated(g, a, wctx) { if (wctx.target !== g.c(a).on || wctx.saved) return; wctx.saved = true; g.c(wctx.target).dmg = 0; g.c(a).id = '40105b'; g.log('호프를 붙잡은 자: 빌런의 체력이 초기화되고 절박해집니다', 'warn'); if (g.e.mainIdx === 0) await g.setMainStage(1); } } };
  S['40105b'] = { permanent: true, hostInsteadOfAttack: captorInstead, async whenFlipped(g) {}, mod: { hp: (g, s, t) => t === g.c(s).on ? 6 * g.players : 0 } };
  NE.captorBlocksAttack = g => !!captor(g) && g.e.minions.some(m => tr(g, m, 'MARAUDER'));
  S['40106'] = { attachTo: lowHp, on: { async wouldTakeDamage(g, u, ctx) { const h = g.c(u).on; if (ctx.target !== h || ctx.amount <= 0) return; // Hidden in the Clutter
    g.c(u).dmg += ctx.amount; g.log(`잡동사니 속에 숨다: 피해 ${ctx.amount}을(를) 대신 받습니다`); ctx.amount = 0; if (g.c(u).dmg >= 3) { g.discard(u, '잡동사니 속에 숨다'); if (g.c(h).zone) await g.enemyAttack(h, {}); } } } };
  S['40107'] = { attachTo: g => g.enemies().find(e => /Greycrow|Harpoon/.test(g.d(e).en || '')) || (g.enemies().filter(e => tr(g, e, 'MARAUDER')).sort((a, b) => g.stat(a, 'atk') - g.stat(b, 'atk'))[0]) || null, surgeIfNoHost: true, // Favored Weapon
    attackProps: () => ({ overkill: true, piercing: true, ranged: true }),
    respond: [{ window: 'afterHeroDefends', timing: 'hero', label: '이 카드 버림', can: (g, u, ctx) => ctx.enemy === g.c(u).on && ctx.noDamage, resolve(g, u) { g.discard(u); } }] };
  S['40108'] = { async whenDefeated(g) { const x = searchEnc(g, isMarauderMinion); if (x) { g.shuffle(g.e.deck); await g.enterMinion(x, {}); } } }; // Bushwhack
  const named = (g, n) => g.enemies().some(e => (g.d(e).en || '').includes(n));
  S['40109'] = { icons: (g, u) => ({ crisis: named(g, 'Blockbuster') ? 1 : 0, amplify: named(g, 'Chimera') ? 1 : 0 }) }; // Pure Force
  S['40110'] = { async whenRevealed(g) { await exhaustOne(g, '아찔한 묘기'); if (named(g, 'Arclight')) { const t = await pick(g, mine(g), '기절할 캐릭터'); if (t) g.giveStatus(t, 'stun', '아찔한 묘기'); } // Dizzying Deeds
    if (named(g, 'Riptide')) await g.indirectDamage(3, null); if (named(g, 'Vertigo')) { const t = await pick(g, mine(g), '혼란에 빠질 캐릭터'); if (t) g.giveStatus(t, 'conf', '아찔한 묘기'); } } };
  S['40111'] = { async whenRevealed(g) { // Tag Team
    const m = g.engagedMinions().filter(x => tr(g, x, 'MARAUDER'));
    if (m.length && await choose2(g, '태그 팀: 하나를 고르세요', '[머로더] 하수인이 모두 활성화', '조우 덱 7장 버리고 맨 위 [머로더] 하수인 교전')) { for (const x of m) if (g.c(x).zone === 'minion') await g.activate(x, {}); return; }
    for (let i = 0; i < 7; i++) { const x = g.takeEncounter(); if (!x) break; g.put(x, 'ediscard'); } const y = g.e.discard.slice().reverse().find(u => isMarauderMinion(g.d(u))); if (y) await g.enterMinion(y, {});
  } };

  // ---------- Juggernaut ----------
  const jugg = g => g.e.villain;
  const momentum = g => (jugg(g) && g.c(jugg(g)).cnt.momentum) || 0;
  const addMomentum = (g, n) => { const v = jugg(g); if (!v) return; g.c(v).cnt.momentum = (g.c(v).cnt.momentum || 0) + n; g.log(`가속도 카운터 +${n} (현재 ${g.c(v).cnt.momentum})`, 'warn'); };
  const helmet = g => jugg(g) && g.c(jugg(g)).att.find(a => ['40122a', '40122b'].includes(idOf(g, a)));
  const exposed = g => { const h = helmet(g); return !!h && idOf(g, h) === '40122b'; };
  const flipHelmet = g => { const h = helmet(g); if (!h) return; g.c(h).id = idOf(g, h) === '40122a' ? '40122b' : '40122a'; g.log(idOf(g, h) === '40122a' ? '저거노트가 다시 헬멧을 씁니다' : '저거노트의 헬멧이 벗겨졌습니다!', 'warn'); };
  const juggMod = { mod: { atk: (g, s, t) => t === s ? (g.c(s).cnt.momentum || 0) : 0 } };
  S['40118'] = Object.assign({ whenRevealed(g, u) { addMomentum(g, 1); g.giveStatus(u, 'tough', '저거노트'); } }, juggMod);
  S['40119'] = Object.assign({ whenRevealed(g, u) { addMomentum(g, 1); if (exposed(g)) flipHelmet(g); else g.giveStatus(u, 'tough', '저거노트'); } }, juggMod);
  S['40120'] = Object.assign({ async whenRevealed(g) { const x = searchEnc(g, d => d.id === '40123'); if (x) { g.shuffle(g.e.deck); await g.reveal(x); } if (exposed(g)) flipHelmet(g); } }, juggMod);
  S['40121a'] = { setup(g) { const h = aside(g, '40122a'); if (h && g.e.villain) g.attachEnc(h, g.e.villain); hopeIntoPlay(g); } };
  S['40121b'] = { async whenCompleted(g, u) { g.c(u).threat = 0; if (exposed(g)) flipHelmet(g); addMomentum(g, 1); if (jugg(g)) await g.forEachPlayer(async () => { if (g.c(jugg(g)).zone) await g.enemyAttack(jugg(g), {}); }); return 'handled'; } };
  S['40122a'] = { permanent: true, grantStalwart: true, attackProps: () => ({ overkill: true }), // Juggernaut's Helmet
    actions: [{ timing: 'hero', label: '같은 유형 자원 3개 → 가속도 카운터 모두 제거, 헬멧 벗기기', can: () => true, async use(g, u) {
      const opts = ['Y', 'B', 'R'].filter(k => g.canAfford({ n: 3, req: k + k + k }, null)); if (!opts.length) { g.log('같은 유형 자원 3개가 없습니다'); return; }
      const r = await g.ask({ type: 'choice', title: '저거노트 헬멧: 자원 유형', options: opts.map(k => ({ id: k, label: { Y: '[에너지]×3', B: '[정신]×3', R: '[물리]×3' }[k] })) });
      if ((await g.pay({ n: 3, req: r + r + r }, null, '저거노트 헬멧', true)) == null) return; if (jugg(g)) g.c(jugg(g)).cnt.momentum = 0; flipHelmet(g); } }] };
  S['40122b'] = { permanent: true, on: { wouldTakeDamage(g, u, ctx) { if (ctx.target === g.c(u).on && ctx.src && (g.d(ctx.src).res || '').includes('B')) ctx.amount += 1; }, // Juggernaut Exposed
    afterEnemyScheme(g, u, ctx) { if (ctx && ctx.enemy === g.c(u).on) { addMomentum(g, 1); flipHelmet(g); } } } };
  S['40123'] = { attachTo: g => g.e.villain, mod: { retaliate: (g, s, t) => t === g.c(s).on ? momentum(g) : 0 }, whenRevealed(g) { addMomentum(g, 1); }, // Head of Steam
    respond: [{ window: 'tookAttackDamage', timing: 'hero', label: '입은 피해만큼 자원 → 이 카드 버림', can: (g, u, ctx) => ctx.enemy === g.c(u).on && g.canAfford({ n: ctx.amount, req: '' }, null), async resolve(g, u, ctx) { if ((await g.pay({ n: ctx.amount, req: '' }, null, '전력 질주 제거', true)) != null) g.discard(u); } }] };
  S['40124'] = { respond: [{ window: 'afterHeroDefends', timing: 'hero', label: '이 음모에서 위협 1 제거', can: (g, u, ctx) => ctx.enemy === jugg(g) && g.c(u).zone === 'side', async resolve(g, u) { await g.removeThreat(u, 1, { src: g.idt() }); await g.afterThreatRemoved(u); } }] }; // Building Momentum
  const jAtk = g => jugg(g) ? g.stat(jugg(g), 'atk') : 0;
  S['40125'] = { async whenRevealed(g) { const c = g.p.upgrades.concat(g.p.supports).filter(x => !g.d(x).permanent); // Breakthrough
    if (c.length && !(await choose2(g, '돌파: 하나를 고르세요', `피해 ${jAtk(g)}`, '비용이 가장 높은 업그레이드·지원 버림'))) { const top = Math.max(...c.map(x => costOf(g, x))); const t = await pick(g, c.filter(x => costOf(g, x) === top), '버릴 카드'); if (t) g.discard(t); } else await g.dealDamage(g.idt(), jAtk(g), {}); } };
  S['40126'] = { async whenRevealed(g) { if (await choose2(g, '깔아뭉개기: 하나를 고르세요', `피해 ${jAtk(g)}`, '가속도 카운터 +1')) await g.dealDamage(g.idt(), jAtk(g), {}); else addMomentum(g, 1); }, boostEffect(g) { if (jugg(g)) g.giveStatus(jugg(g), 'tough', '★ 깔아뭉개기'); } }; // Flatten
  S['40127'] = { async whenRevealed(g) { await g.indirectDamage(jAtk(g), null); }, async boostEffect(g) { await g.indirectDamage(1, null); } }; // Ground Pound
  S['40128'] = { async whenRevealed(g) { if (!g.isHero()) { await g.indirectDamage(2, null); return; } const a = g.p.allies.slice().sort((x, y) => g.hpLeft(x) - g.hpLeft(y))[0]; if (a && jugg(g)) await g.enemyAttack(jugg(g), { forceTarget: a }); else if (jugg(g)) await g.enemyAttack(jugg(g), {}); }, // Trample
    async boostEffect(g) { const t = await pick(g, g.p.allies.slice(), '★ 짓밟기: 피해 1을 받을 동료'); if (t) await g.dealDamage(t, 1, {}); } };
  S['40129'] = { inciteFor: (g, s, u) => u === s && g.s.scen.expert ? 1 : 0, async whenRevealed(g) { if (exposed(g)) { flipHelmet(g); addMomentum(g, 1); } else await g.placeThreat(g.e.main, jAtk(g), {}); } }; // Cyttorak's Exemplar

  // ---------- Mister Sinister ----------
  const SETS = ['flight', 'super_strength', 'telepathy'];
  const superpowers = g => g.e.villain ? g.c(g.e.villain).att.filter(a => tr(g, a, 'SUPERPOWER')).length : 0;
  S['40139a'] = { setup(g) { for (const k of SETS) for (const id of (MC.sets[k] || [])) for (const u of g.e.deck.filter(x => idOf(g, x) === id)) g.put(u, 'aside'); hopeIntoPlay(g); g.log('비행·괴력·텔레파시 세트를 따로 둡니다'); } };
  S['40139b'] = { noTarget: true, async whenRevealed(g) { const e = g.e; const twos = e.mainStages.slice(1, 4); g.shuffle(twos); e.mainStages = [e.mainStages[0], twos[0], twos[1], e.mainStages[4]]; g.log('시니스터의 의도: 2단계 하나를 무작위로 게임에서 제거합니다', 'warn'); await g.setMainStage(1); } };
  const sinisterSet = key => async g => { const v = g.e.villain; const ids = MC.sets[key] || []; const cards = (g.e.aside || []).filter(u => ids.includes(idOf(g, u)));
    const sp = cards.find(u => g.d(u).type === 'attachment' && tr(g, u, 'SUPERPOWER')); if (sp && v) g.attachEnc(sp, v); for (const u of cards.filter(x => x !== sp)) g.put(u, 'edeck'); g.shuffle(g.e.deck); g.log(`${g.nm(sp || cards[0])} 세트가 합류합니다`, 'warn'); };
  S['40140b'] = { whenRevealed: sinisterSet('flight') }; S['40141b'] = { whenRevealed: sinisterSet('super_strength') }; S['40142b'] = { whenRevealed: sinisterSet('telepathy') };
  const sinisterStatus = { onStatusGiven(g) { if (g.e.main) { g.c(g.e.main).threat += 1; g.e.recheck = true; g.log('미스터 시니스터: 상태 카드 → 주 음모 위협 +1', 'warn'); } },
    attackTargetFn: g => g.e.main && idOf(g, g.e.main) === '40143b' ? hope(g) : null };
  S['40136'] = Object.assign({}, sinisterStatus);
  S['40137'] = Object.assign({ async whenRevealed(g) { await g.placeThreat(g.e.main, (superpowers(g) < 2 ? 2 : 1) * g.players, {}); } }, sinisterStatus);
  S['40138'] = Object.assign({ async whenRevealed(g) { await g.placeThreat(g.e.main, (superpowers(g) < 2 ? 3 : 2) * g.players, {}); } }, sinisterStatus);
  S['40144'] = { attachTo: g => g.e.villain, on: { async wouldTakeDamage(g, u, ctx) { if (ctx.target !== g.c(u).on || !ctx.byPlayer || ctx.amount <= 0) return; // Sinister Disguise
    const n = ctx.amount; g.discard(u, '시니스터의 변장'); if (g.canAfford({ n: 2, req: 'BB' }, null) && (await g.pay({ n: 2, req: 'BB' }, null, '시니스터의 변장: [정신][정신]을 내지 않으면 피해가 아군에게', true)) != null) return;
    ctx.amount = 0; const c = mine(g); const t = c.sort((a, b) => g.hpLeft(a) - g.hpLeft(b))[0]; if (t) { g.log(`시니스터의 변장: 피해 ${n}이(가) ${g.nm(t)}에게`, 'warn'); await g.dealDamage(t, n, {}); } } } };
  S['40145'] = { mod: { atk: (g, s, t) => t === s ? superpowers(g) : 0, sch: (g, s, t) => t === s ? superpowers(g) : 0 } }; // Sinister Soldier
  S['40146'] = { on: { wouldTakeDamage(g, u, ctx) { if (g.c(u).zone === 'side' && ctx.target === g.e.villain) ctx.amount = 0; } } }; // Teleported Away
  S['40147'] = { async whenRevealed(g) { const v = g.e.villain; if (!v) return; if (tr(g, v, 'AERIAL')) await g.indirectDamage(2, null); if (tr(g, v, 'BRUTE')) g.c(g.idt()).ex = true; if (tr(g, v, 'PSIONIC')) await g.placeThreat(g.e.main, 2, {}); } }; // Genetic Mastery
  S['40148'] = { whenRevealed(g) { const v = g.e.villain; if (!v) return; g.giveStatus(v, 'tough', '분자 제어'); if (tr(g, v, 'BRUTE')) g.heal(v, 4); }, boostEffect(g) { if (g.e.villain) g.giveStatus(g.e.villain, 'tough', '★ 분자 제어'); } };
  S['40149'] = { async whenRevealed(g) { const v = g.e.villain; if (!v) return; await g.enemyScheme(v, {}); if (tr(g, v, 'PSIONIC')) g.giveStatus(g.idt(), 'conf', '시니스터의 계략'); }, boostEffect(g) { g.giveStatus(g.idt(), 'conf', '★ 시니스터의 계략'); } };
  S['40150'] = { async whenRevealed(g, u, ctx) { if (!g.isHero()) { ctx.surge++; return; } const v = g.e.villain; if (!v) return; await g.enemyAttack(v, {}); if (tr(g, v, 'AERIAL')) g.giveStatus(g.idt(), 'stun', '시니스터의 일격'); }, boostEffect(g) { g.giveStatus(g.idt(), 'stun', '★ 시니스터의 일격'); } };
  const onVillain = { attachTo: g => g.e.villain };
  S['40151'] = Object.assign({ permanent: true, grantTrait: (g, s, t) => t === g.c(s).on ? 'AERIAL' : null, attackProps: () => ({ overkill: true }) }, onVillain); // Flight
  const discardAction = (req, label, exhaustHero) => ({ timing: 'hero', label: `${exhaustHero ? '히어로 소진·' : ''}${label} → 이 카드 버림`, cost: { n: req.length, req }, can: (g, u) => g.c(u).zone === 'attach' && (!exhaustHero || !g.c(g.idt()).ex), use(g, u) { if (exhaustHero) g.c(g.idt()).ex = true; g.discard(u); } });
  S['40152'] = Object.assign({ attackBonus: (g, x, ctx) => ctx && ctx.defender && !tr(g, ctx.defender, 'AERIAL') ? 1 : (!ctx.defender && !tr(g, g.idt(), 'AERIAL') ? 1 : 0), actions: [discardAction('BB', '[정신][정신]', true)] }, onVillain); // Aerial Bombardment
  S['40153'] = Object.assign({ on: { wouldTakeDamage(g, u, ctx) { if (ctx.target !== g.c(u).on || !ctx.byPlayer) return; const ok = ctx.src && (tr(g, ctx.src, 'AERIAL') || (ctx.src === g.idt() && tr(g, g.idt(), 'AERIAL'))); if (!ok) { ctx.amount = 0; g.log('닿지 않는 곳: [비행] 공격만 피해를 줄 수 있습니다'); } } }, // Out of Reach
    actions: [discardAction('YY', '[에너지][에너지]', true)] }, onVillain);
  S['40154'] = { async whenRevealed(g) { for (const f of mine(g)) while (await g.loseTough(f, '높은 고지')) { /* discard all */ } const v = g.e.villain; await g.indirectDamage(v && tr(g, v, 'BRUTE') ? 4 : 2, null); }, // High Ground
    boostEffect(g, u, ctx) { if (ctx && 'undefended' in ctx) ctx.piercing = true; } };
  S['40155'] = Object.assign({ permanent: true, grantTrait: (g, s, t) => t === g.c(s).on ? 'BRUTE' : null, grantSteady: true }, onVillain); // Super Strength
  S['40156'] = Object.assign({ on: { wouldTakeDamage(g, u, ctx) { if (ctx.target === g.c(u).on && ctx.byPlayer && ctx.amount > 0) ctx.amount -= 1; } }, // Impervious
    actions: [{ timing: 'hero', label: '[물리][물리] → 빌런 강인함, 이 카드 버림', cost: { n: 2, req: 'RR' }, can: (g, u) => g.c(u).zone === 'attach', use(g, u) { g.giveStatus(g.c(u).on, 'tough', '무적'); g.discard(u); } }] }, onVillain);
  S['40157'] = Object.assign({ attackProps: () => ({ ranged: true }), on: { afterEnemyAttack(g, u, ctx) { if (ctx.enemy === g.c(u).on) g.discard(u, '던진 물체'); } } }, onVillain); // Thrown Object
  S['40158'] = { async whenRevealed(g, u, ctx) { const c = g.p.upgrades.filter(x => !g.d(x).permanent); if (!c.length) { ctx.surge++; return; } const ps = g.e.villain && tr(g, g.e.villain, 'PSIONIC'); // "I'll Take That"
    const v = ps ? Math.max(...c.map(x => costOf(g, x))) : Math.min(...c.map(x => costOf(g, x))); const t = await pick(g, c.filter(x => costOf(g, x) === v), '버릴 업그레이드'); if (t) g.discard(t); } };
  S['40159'] = Object.assign({ permanent: true, grantTrait: (g, s, t) => t === g.c(s).on ? 'PSIONIC' : null, mod: { retaliate: (g, s, t) => t === g.c(s).on ? 1 : 0 } }, onVillain); // Telepathy
  S['40160'] = { whenRevealed(g, u, ctx) { if (!g.p.supports.length) { ctx.surge++; g.discard(u); return; } for (const x of g.p.supports) g.c(x).ex = true; g.put(u, 'pobl'); }, blocksReady: (g, s, x) => g.c(s).zone === 'pobl' && g.p.supports.includes(x), // Manufactured Drama
    actions: [{ timing: 'alter', label: '정체성 소진·지원마다 덱 위 1장 버림 → 이 카드 버림', can: (g, u) => g.c(u).zone === 'pobl' && !g.c(g.idt()).ex, use(g, u) { g.c(g.idt()).ex = true; for (let i = 0; i < g.p.supports.length && g.p.deck.length; i++) g.put(g.p.deck[0], 'discard'); g.discard(u); } }] };
  S['40161'] = { whenRevealed(g, u, ctx) { if (!g.p.allies.length) { ctx.surge++; g.discard(u); return; } for (const x of g.p.allies) g.c(x).ex = true; g.put(u, 'pobl'); }, blocksReady: (g, s, x) => g.c(s).zone === 'pobl' && g.p.allies.includes(x), // Sowing Discord
    actions: [{ timing: 'alter', label: '[정신][정신] → 이 카드 버림', cost: { n: 2, req: 'BB' }, can: (g, u) => g.c(u).zone === 'pobl', use(g, u) { g.discard(u); } }] };
  S['40162'] = { whenRevealed(g) { const n = g.e.villain && tr(g, g.e.villain, 'AERIAL') ? 2 : 1; for (let i = 0; i < n && g.p.hand.length; i++) { const x = g.p.hand[Math.floor(g.rand() * g.p.hand.length)]; g.put(x, 'discard'); g.log(`한 발 앞서: ${g.nm(x)} 버림`, 'warn'); } }, boostEffect(g, u, ctx) { if (ctx && 'undefended' in ctx) ctx.overkill = true; } };

  // ---------- Stryfe ----------
  const stryfeAtk = { attackBonus: (g) => handTypeMax(g) };
  S['40163'] = Object.assign({}, stryfeAtk);
  S['40164'] = Object.assign({ async whenRevealed(g) { await g.forEachPlayer(() => millUntil(g, d => d.type === 'attachment' && (d.tr || []).includes('PSIONIC'))); } }, stryfeAtk);
  S['40165'] = Object.assign({ on: { async afterAttack(g, u, ctx) { if (ctx.target === u && ctx.attacker === g.idt()) { const n = handTypeMax(g); if (n) await g.dealDamage(g.idt(), n, {}); } } } }, stryfeAtk);
  S['40166a'] = { async setup(g) { hopeIntoPlay(g); const s = aside(g, '40168a'); if (s) await g.enterSide(s, {}); } };
  S['40166b'] = { on: { async mainStep1(g, u) { if (g.c(u).zone !== 'main' || idOf(g, u) !== '40166b') return; await g.forEachPlayer(async () => { if (g.p.hand.length && await yes(g, `통제할 수 없는 힘(${g.playerName()}): 손에서 카드 1장을 버릴까요?`)) { const t = await pick(g, g.p.hand.slice(), '버릴 카드'); if (t) g.put(t, 'discard'); } const n = handTypeMax(g); if (n) { g.log(`통제할 수 없는 힘(${g.playerName()}): 손의 같은 유형 ${n}장 → 위협 ${n}`, 'warn'); await g.placeThreat(u, n, {}); } }); } } };
  S['40167b'] = { loseOnComplete: true, mod: { hs: (g, s, t) => ['hero', 'alter'].includes(g.d(t).type) ? 2 : 0 }, costMod: (g, s, uid) => !g.d(uid).enc ? -1 : 0, stalwartFor: (g, s, t) => t === g.e.villain };
  const grasp = g => g.e.sides.find(u => idOf(g, u) === '40168a') || null;
  async function livingBomb(g) { const s = grasp(g); if (!s) return; const n = g.c(s).threat; g.c(s).id = '40168b'; g.c(s).threat = (MC.cards['40168b'].start || 0) + n; g.log('스트라이프의 손아귀 → 살아있는 폭탄!', 'warn'); if (g.e.mainIdx === 0) await g.setMainStage(1); }
  S['40168a'] = { on: { async villainAdvanced(g) { await livingBomb(g); } }, async whenDefeated(g) { await livingBomb(g); return 'handled'; } }; // Stryfe's Grasp
  S['40168b'] = {}; // Living Bomb: Stryfe cannot be defeated while it is in play (see wouldBeDefeated below)
  for (const id of ['40163', '40164', '40165']) S[id].wouldBeDefeated = (g, u, wctx) => { if (g.e.sides.some(x => idOf(g, x) === '40168b')) { wctx.saved = true; g.c(u).dmg = Math.max(0, g.maxHp(u) - 1); g.log('살아있는 폭탄: 스트라이프는 쓰러지지 않습니다', 'warn'); } };
  const selfAttach = { attachTo: g => g.idt() };
  S['40169'] = { attachTo: g => grasp(g) && hope(g) ? hope(g) : g.idt(), on: { async afterTakeDamage(g, u, ctx) { if (ctx.target !== g.e.villain || !ctx.amount) return; const h = g.c(u).on; g.discard(u, '정신 전이'); if (h && g.c(h).zone) await g.dealDamage(h, ctx.amount, {}); } } }; // Mental Transferal
  S['40170'] = Object.assign({ on: { async cardPlayed(g, u, ctx) { if (g.c(u).on === g.idt() && ctx.card && ['event', 'upgrade'].includes(g.d(ctx.card).type)) await g.dealDamage(g.idt(), 1, {}); } }, // Mind Alteration
    respond: [{ window: 'afterRecover', label: '[정신] → 이 카드 버림', cost: { n: 1, req: 'B' }, can: (g, u) => g.c(u).on === g.idt(), resolve(g, u) { g.discard(u); } }] }, selfAttach);
  S['40171'] = Object.assign({ respond: [{ window: 'allyEntered', label: '정신 함정: 소진 상태로 등장', can: (g, u, ctx) => g.c(u).on === g.idt(), resolve(g, u, ctx) { g.c(ctx.ally).ex = true; } }], // Mind Trap
    actions: [{ timing: 'alter', label: '카드 3장 소진 → 이 카드 버림', can: (g, u) => g.c(u).on === g.idt() && g.p.allies.concat(g.p.supports, g.p.upgrades).filter(x => !g.c(x).ex).length >= 3, async use(g, u) { const c = g.p.allies.concat(g.p.supports, g.p.upgrades).filter(x => !g.c(x).ex); const sel = await g.ask({ type: 'select', title: '소진할 카드 3장', cards: c, min: 3, max: 3, confirm: '확정' }); for (const x of sel || c.slice(0, 3)) g.c(x).ex = true; g.discard(u); } }] }, selfAttach);
  S['40172'] = Object.assign({ costMod: (g, s, uid) => g.c(s).on === g.idt() && ['ally', 'support'].includes(g.d(uid).type) ? -2 : 0, // Psionic Amnesia
    respond: [{ window: 'cardPlayedDone', label: '정체성 소진 → 이 카드 버림', can: (g, u, ctx) => g.c(u).on === g.idt() && ctx.card && ['ally', 'support'].includes(g.d(ctx.card).type) && !g.c(g.idt()).ex, resolve(g, u) { g.c(g.idt()).ex = true; g.discard(u); } }] }, selfAttach);
  S['40173'] = Object.assign({ on: { basicHeroPower(g, u, ctx) { if (ctx.kind === 'attack') g.p.phase.didAtk = true; if (ctx.kind === 'thwart') g.p.phase.didThw = true; } }, // Psychic Inertia
    actions: [{ timing: 'hero', label: '이번 단계에 공격·저지했다면 → 이 카드 버림', can: (g, u) => g.c(u).on === g.idt() && g.p.phase.didAtk && g.p.phase.didThw, use(g, u) { g.discard(u); } }] }, selfAttach);
  S['40174'] = { whenDefeated(g, u) { if (handTypeMax(g) < 3) (g.e.toEncDeck = g.e.toEncDeck || []).push(u); } }; // Zero
  S['40175'] = { async whenRevealed(g) { await returnTop(g, g.p.upgrades.concat(g.p.supports).filter(x => !g.d(x).permanent), '대뇌 소거'); }, async whenDefeated(g) { await returnTop(g, g.p.upgrades.concat(g.p.supports).filter(x => !g.d(x).permanent), '대뇌 소거'); } }; // Cerebral Erasure
  S['40176'] = { whenRevealed(g, u) { let n = 0; for (const pi of g.livingPlayers()) g.withPlayerSync(pi, () => { n += handTypeMax(g); }); g.c(u).threat += n; } }; // Telepathic Camouflage
  S['40177'] = { whenRevealed(g) { const n = handTypeMax(g); for (let i = 0; i < n; i++) { const x = g.takeEncounter(); if (!x) break; if (tr(g, x, 'PSIONIC')) g.put(x, 'facedown'); else g.put(x, 'ediscard'); } } }; // Psionic Surge
  S['40178'] = { async whenRevealed(g) { // Psychic Override
    const ty = await g.ask({ type: 'choice', title: '정신 장악: 카드 유형을 고르세요', options: ['ally', 'event', 'support', 'upgrade', 'resource'].map(k => ({ id: k, label: { ally: '동료', event: '이벤트', support: '지원', upgrade: '업그레이드', resource: '자원' }[k] })) });
    for (const x of g.p.hand.filter(x => g.d(x).type !== ty)) g.put(x, 'discard'); await g.draw(Math.max(0, g.handSize() - g.p.hand.length)); const n = g.p.hand.filter(x => g.d(x).type === ty).length; if (n) await g.placeThreat(g.e.main, n, {});
  }, async boostEffect(g) { const t = await pick(g, g.p.hand.slice(), '★ 정신 장악: 버릴 카드'); if (t) { g.put(t, 'discard'); await g.draw(1); } } };
  S['40179'] = { async whenRevealed(g) { await returnTop(g, g.p.upgrades.concat(g.p.supports).filter(x => !g.d(x).permanent), '염동력 파동'); if (g.e.villain) await g.activate(g.e.villain, {}); }, // Telekinetic Wave
    async boostEffect(g) { if (handTypeMax(g) >= 3) await g.placeThreat(g.e.main, 3, {}); } };

  S['40104a'] = { async whenRevealed(g) { // Escaping with Hope (2A): a Marauder engages each player; every Marauder is tough
    await g.forEachPlayer(async () => { const m = g.e.deck.concat(g.e.discard).find(u => g.d(u).type === 'minion' && (g.d(u).tr || []).includes('MARAUDER')); if (m) await g.enterMinion(m, {}, true); }); g.shuffle(g.e.deck);
    for (const x of g.enemies()) if (tr(g, x, 'MARAUDER')) g.giveStatus(x, 'tough', '호프와 함께 탈출');
  } };
  S['40143a'] = { async whenRevealed(g) { await g.forEachPlayer(() => g.dealEncounterCard()); } }; // Sinister Ends (final stage A)
  // ======================= Campaign: NeXt Evolution (cards/pack/next_evol/campaign.py, next_evolution_campaign) =======================
  const NEC = 'next_evolution';
  const PSS = { '40190a': ['40199', '40190b'], '40191a': ['40201', '40191b'], '40192a': ['40203', '40192b'], '40193a': ['40200', '40193b'], '40194a': ['40198', '40194b'], '40195a': ['40202', '40195b'] };
  const ENVS = Object.values(PSS).map(x => x[1]);
  const chosen = (g, lv) => { const out = []; for (let i = 1; i <= lv; i++) { const id = g.clog(`Scenario ${i} Player Side Scheme`); if (PSS[id] && !out.includes(id)) out.push(id); } return out; };
  const earned = g => ENVS.filter(id => g.clogList('Campaign Environments Earned').includes(id));
  async function prevHope(g, sc, name) { const n = g.clogInt(`Scenario ${sc} Hope Summers Damage`); if (n <= 0) return; const h = hope(g), s = g.e.sides.find(x => g.d(x).en === name);
    const opts = []; if (h) opts.push({ id: 'h', label: `호프 서머스에게 피해 ${n}` }); if (s) opts.push({ id: 's', label: `${g.nm(s)}에 위협 ${n}` }); if (!opts.length) return;
    const o = opts.length === 1 ? opts[0].id : await g.ask({ type: 'choice', title: '캠페인: 이전 시나리오의 호프 서머스 피해', options: opts }); if (o === 'h') await g.dealDamage(h, n, {}); else g.c(s).threat += n; }
  MC.CAMPAIGNS[NEC] = {
    async setup(g, spec) {
      const lv = spec.level || 1;
      if (lv >= 2) for (const id of earned(g)) { const e = g.newCard(id, 'limbo'); await g.enterEnv(e); }
      if (lv === 2) { await g.forEachPlayer(async () => { for (let i = 0; i < g.clogInt('Morlocks Saved'); i++) { const c = await pick(g, g.p.deck.slice(), `구한 몰록: 손에 더할 카드 (${i + 1})`); if (c) { g.put(c, 'hand'); g.shuffle(g.p.deck); } } }); if (earned(g).length) g.enemies().forEach(x => g.giveStatus(x, 'tough', '캠페인')); }
      if (lv === 3) { const v = g.e.villain; if (v && /Juggernaut/.test(g.d(v).en || '')) g.c(v).cnt.momentum = (g.c(v).cnt.momentum || 0) + earned(g).length;
        let bt = g.e.deck.find(x => g.c(x).id === '40132') || g.newCard('40132', 'edeck'); let w = g.e.deck.filter(x => g.c(x).id === '40133'); while (w.length < g.players) w.push(g.newCard('40133', 'edeck'));
        const f = [bt].concat(w.slice(0, g.players)); g.shuffle(f); await g.forEachPlayer(() => { const x = f.pop(); if (x) g.put(x, 'facedown'); }); f.forEach(x => g.put(x, 'edeck')); g.shuffle(g.e.deck); g.log('캠페인: 블랙 톰/기어다니는 버드나무를 뒷면으로 받습니다', 'warn'); }
      if (lv === 4) { const t = g.e.deck.concat(g.e.discard, g.e.aside).find(x => g.d(x).en === 'Teleported Away'); if (t) { await g.reveal(t); if (g.c(t).zone === 'side') g.c(t).threat += earned(g).length; } await prevHope(g, 3, 'Teleported Away'); }
      if (lv === 5) { const sg = g.e.sides.find(x => g.d(x).en === "Stryfe's Grasp"); if (sg) g.c(sg).threat += earned(g).length * g.players; await prevHope(g, 4, "Stryfe's Grasp");
        while (true) { const x = g.takeEncounter(); if (!x) break; g.put(x, 'ediscard'); if (g.d(x).type === 'minion' || (g.d(x).type === 'attachment' && (g.d(x).tr || []).includes('PSIONIC'))) { await g.reveal(x); break; } } }
      { const cur = g.clog(`Scenario ${lv} Player Side Scheme`); if (PSS[cur] && !chosen(g, lv - 1).includes(cur)) { const ps = g.newCard(cur, 'limbo'); await g.enterSide(ps, {}); g.log(`캠페인: 플레이어 부가 음모 「${g.nm(ps)}」`, 'good'); }
        const enc = chosen(g, lv).map(id => PSS[id][0]); enc.forEach(id => g.newCard(id, 'edeck')); if (enc.length) g.shuffle(g.e.deck); }
      if (lv < 2) return;
      await g.forEachPlayer(async () => {
        const hp = g.clogPInt('Remaining hit points'); if (hp) g.setIdentityHP(hp);
        if (!g.s.scen.expert || !g.c(g.idt()).dmg) return;
        if ([2, 4].includes(lv)) { if (await yes(g, `숙련 캠페인(${g.playerName()}): 주 음모에 가속 토큰 1개를 놓고 생명력을 모두 회복할까요?`)) { g.c(g.e.main).cnt.accelTok = (g.c(g.e.main).cnt.accelTok || 0) + 1; g.c(g.idt()).dmg = 0; } }
        else if (await yes(g, `숙련 캠페인(${g.playerName()}): 조우 카드 1장을 뒷면으로 받고 생명력을 모두 회복할까요?`)) { await g.dealEncounterCard(); g.c(g.idt()).dmg = 0; }
      });
    }
  };
  [['40077a', 1], ['40103a', 2], ['40121a', 3], ['40139a', 4], ['40166a', 5]].forEach(([id, lv]) => { S[id] = Object.assign(S[id] || {}, { campaign: { level: lv } }); });
  // player side schemes and the environments on their backs
  const pss = env => ({ noPsideLimit: true, async whenDefeated(g) { const e = g.newCard(env, 'limbo'); await g.enterEnv(e); g.log(`${g.nm(e)}이(가) 플레이 영역에 들어옵니다`, 'good'); } });
  Object.keys(PSS).forEach(id => { S[id] = pss(PSS[id][1]); });
  const envUse = (key, label, run) => ({ actions: [{ timing: 'action', label, can: (g, u) => g.c(u).zone === 'env' && (g.c(u).cnt[key] == null ? 1 : g.c(u).cnt[key]) > 0, async use(g, u) { const c = g.c(u).cnt; c[key] = (c[key] == null ? 1 : c[key]) - 1; await run(g, u); } }] });
  S['40190b'] = envUse('form', '결성 카운터 1 → 각 플레이어 비용 3 이하 동료를 덱·버린 더미에서 내려놓기', async g => { await g.forEachPlayer(async () => { const a = await pick(g, g.p.deck.concat(g.p.discard).filter(x => g.d(x).type === 'ally' && (g.d(x).cost || 0) <= 3), `내려놓을 동료(${g.playerName()})`); if (a) { await g.putAllyIntoPlay(a); g.shuffle(g.p.deck); } }); });
  S['40191b'] = envUse('safe', '은신처 카운터 1 → 은신처 지원을 시작 플레이어 영역에 내려놓기', g => { g.withPlayerSync(g.s.first, () => g.newCard('40197', 'support')); });
  S['40192b'] = envUse('pouch', '파우치 카운터 1 → 각 플레이어 파우치를 덱에 섞기', async g => { await g.forEachPlayer(() => { g.newCard('40196', 'deck'); g.shuffle(g.p.deck); }); });
  S['40193b'] = envUse('prep', '준비 카운터 1 → 각 플레이어 비용 2 이하 업그레이드를 덱·버린 더미에서 내려놓기', async g => { await g.forEachPlayer(async () => { const a = await pick(g, g.p.deck.concat(g.p.discard).filter(x => g.d(x).type === 'upgrade' && (g.d(x).cost || 0) <= 2), `내려놓을 업그레이드(${g.playerName()})`); if (a) { g.put(a, 'upgrade'); g.shuffle(g.p.deck); } }); });
  S['40194b'] = { costMod: (g, s, uid) => g.c(s).zone === 'env' && g.d(uid).type === 'event' && (g.d(uid).cost || 0) >= 3 ? 1 : 0 };
  S['40195b'] = { mod: { def: (g, s, t) => g.c(s).zone === 'env' && g.d(t).type === 'hero' ? 1 : 0, retaliate: (g, s, t) => g.c(s).zone === 'env' && g.d(t).type === 'hero' ? 1 : 0 } };
  S['40197'] = { actions: [{ timing: 'alter', label: '은신처: 피해 2 회복 또는 카드 1장', can: (g, u) => g.c(u).zone === 'support' && g.c(u).cnt.safeRound !== g.s.round, async use(g, u) { g.c(u).cnt.safeRound = g.s.round; const o = await g.ask({ type: 'choice', title: '은신처', options: [{ id: 'h', label: '피해 2 회복' }, { id: 'd', label: '카드 1장 뽑기' }] }); if (o === 'h') g.heal(g.idt(), 2); else await g.draw(1); } }] };
  // encounter cards the chosen player side schemes add
  S['40198'] = { async whenRevealed(g) { const ev = g.p.hand.filter(x => g.d(x).type === 'event'); const n = ev.length ? Math.max(...ev.map(x => g.d(x).cost || 0)) : 0; if (n) await g.dealDamage(g.idt(), n, {}); }, // Lady Mastermind
    async boostEffect(g) { const ev = g.p.hand.filter(x => g.d(x).type === 'event'); const t = await pick(g, ev, '★ 레이디 마스터마인드: 버릴 이벤트'); if (t) g.put(t, 'discard'); } };
  S['40199'] = { async whenDefeated(g, u) { const c = g.p.allies.filter(x => !tr(g, x, 'PSIONIC')); if (!c.length) return; const mx = Math.max(...c.map(x => g.d(x).cost || 0)); const a = await pick(g, c.filter(x => (g.d(x).cost || 0) === mx), '맬리스: 빙의될 동료'); if (a && g.allyToMinion) await g.allyToMinion(a, 'POSSESSED'); else if (a) { g.log(`맬리스: ${g.nm(a)}을(를) 버립니다`, 'warn'); g.discard(a); } } }; // Malice
  S['40200'] = { async whenRevealed(g) { const t = await pick(g, g.p.upgrades.slice(), '스크램블러: 버릴 업그레이드'); if (t) g.discard(t); } }; // Scrambler
  const banish = async g => { const sp = g.p.supports.slice(); if (!sp.length) return; const mx = Math.max(...sp.map(x => g.d(x).cost || 0)); const t = await pick(g, sp.filter(x => (g.d(x).cost || 0) === mx), '배니셔: 손으로 되돌릴 지원'); if (t) { g.resetCard(t); g.put(t, 'hand'); } };
  S['40201'] = { whenRevealed: banish, boostEffect: banish }; // Banisher
  S['40202'] = { boostEffect(g, u, ctx) { if (ctx) ctx.extraBoost = (ctx.extraBoost || 0) + 1; } }; // Pressure
  const overload = async g => { const r = g.p.hand.filter(x => g.d(x).type === 'resource'); const o = r.length ? await g.ask({ type: 'choice', title: '과중한 부담', options: [{ id: 'r', label: '자원 카드 1장 버림' }, { id: 'd', label: '피해 2' }] }) : 'd'; if (o === 'r') { const t = await pick(g, r, '버릴 자원 카드'); if (t) g.put(t, 'discard'); } else await g.dealDamage(g.idt(), 2, {}); };
  S['40203'] = { whenRevealed: overload, boostEffect: overload }; // Overburdened
  MC.registerScripts(S);
})();
