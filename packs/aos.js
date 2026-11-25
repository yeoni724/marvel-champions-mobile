/* Agents of S.H.I.E.L.D. (50001-50193): Maria Hill, Nick Fury, five scenarios and their modular sets.
   Ported from cards/pack/aos of the community build. The Agents of S.H.I.E.L.D. campaign is at the end. */
(function () {
  'use strict';
  const S = {};
  const idOf = (g, u) => g.c(u).id;
  const tr = (g, u, t) => (g.d(u).tr || []).includes(t) || g.hasTrait(u, t);
  const pick = async (g, cands, title) => !cands.length ? null : cands.length === 1 ? cands[0] : await g.ask({ type: 'target', title, cands, cancelable: false });
  const yes = async (g, title) => (await g.ask({ type: 'choice', title, options: [{ id: 'y', label: '예' }, { id: 'n', label: '아니요' }] })) === 'y';
  async function thw(g, t, n, src) { const r = await g.removeThreat(t, n, { src }); g.log(`${g.nm(t)} 위협 ${r} 제거`); await g.afterThreatRemoved(t); return r; }
  const AOS = MC.aos = MC.aos || {};
  const fd = (g, n) => { for (let i = 0; i < (n || 1); i++) { const x = g.takeEncounter(); if (x) g.put(x, 'facedown'); } };
  const fdEach = (g, n) => g.forEachPlayer(() => fd(g, n));
  function rotateEngaged(g) { const live = g.livingPlayers(); if (live.length < 2) return; const snap = g.e.minions.map(m => [m, g.c(m).eng]); for (const [m, eng] of snap) { const idx = live.indexOf(eng); if (idx >= 0) g.c(m).eng = live[(idx - 1 + live.length) % live.length]; } g.log('교전 중인 하수인들이 시계 방향 플레이어와 교전합니다', 'warn'); }
  AOS.fd = fd;
  const prep = async (g, u) => { await g.window('preparationResolved', { card: u }); }; AOS.prep = prep;
  // ---------- all-purpose counters on S.H.I.E.L.D. supports: they count as the support's own uses counters
  const shieldSup = g => g.p.supports.filter(x => tr(g, x, 'S.H.I.E.L.D'));
  const apKind = (g, u) => (g.d(u).uses && g.d(u).uses.kind) || 'ap';
  const apCount = (g, u) => g.c(u).cnt[apKind(g, u)] || 0;
  const addAP = (g, u, n) => { const k = apKind(g, u); g.c(u).cnt[k] = (g.c(u).cnt[k] || 0) + (n || 1); g.log(`${g.nm(u)}: 만능 카운터 +${n || 1}`, 'good'); };
  async function apOn(g, title, n) { const t = await pick(g, shieldSup(g), title || '만능 카운터를 놓을 [실드] 지원'); if (t) addAP(g, t, n || 1); return t; }
  AOS.addAP = addAP; AOS.apOn = apOn; AOS.shieldSup = shieldSup;
  const isMaria = g => ['50001a', '50001b'].includes(idOf(g, g.idt()));
  const funding = { on: { cardPlayed(g, u, ctx) { if (g.p.fundFor && ctx.card === g.p.fundFor) { if (g.c(ctx.card).zone === 'support') addAP(g, ctx.card, 1); g.p.fundFor = null; } } } };
  S['50001a'] = Object.assign({ grantTrait: (g, s, t) => g.p.allies.includes(t) ? 'S.H.I.E.L.D' : null, // Maria Hill (hero)
    actions: [{ timing: 'action', label: '재배치: [실드] 지원의 만능 카운터 1개를 다른 [실드] 지원으로 (라운드당 1번)', can: g => g.p.usedOnce.reassign !== g.s.round && shieldSup(g).filter(x => apCount(g, x) > 0).length > 0 && shieldSup(g).length > 1, async use(g) {
      const a = await pick(g, shieldSup(g).filter(x => apCount(g, x) > 0), '카운터를 옮길 지원'); const b = await pick(g, shieldSup(g).filter(x => x !== a), '받을 지원'); if (!a || !b) return; g.p.usedOnce.reassign = g.s.round; g.c(a).cnt[apKind(g, a)]--; addAP(g, b, 1); } }] }, funding);
  S['50001b'] = Object.assign({ actions: [{ timing: 'alter', exhaust: true, label: '[실드] 지원을 찾아 손으로', async use(g) { await g.searchToHand(d => d.type === 'support' && (d.tr || []).includes('S.H.I.E.L.D'), '[실드] 지원'); } }] }, funding);
  S['50007'] = { onSpent(g, u, forUid) { if (forUid && g.d(forUid).type === 'support' && tr(g, forUid, 'S.H.I.E.L.D')) g.p.fundFor = forUid; } }; // Special Funding
  const afterPower = (fx, label) => [{ window: 'afterAllyAttack', label, can: (g, u, ctx) => ctx.ally === u, async resolve(g, u) { await fx(g, u); } }, { window: 'afterAllyThwart', label, can: (g, u, ctx) => ctx.ally === u, async resolve(g, u) { await fx(g, u); } }];
  S['50002'] = { respond: afterPower(async g => { await apOn(g); }, '★ [실드] 지원에 만능 카운터 1') }; // Nick Fury (ally)
  S['50003'] = { play: { timing: 'hero', async resolve(g, u) { const n = shieldSup(g).length; for (let i = 0; i < n; i++) { const o = await g.ask({ type: 'choice', title: `전면 수배 (${i + 1}/${n})`, options: [{ id: 't', label: '위협 1 제거' }, { id: 'd', label: '적에게 피해 1' }] }); // All-Points Bulletin
    if (o === 't') await g.removeThreatChoose(1, '전면 수배', u); else { const t = await g.chooseTarget('enemy', '피해 1', g.idt(), false); if (t) await g.dealDamage(t, 1, { src: u, byPlayer: true }); } } } } };
  const pickCost6 = async (g, c, title) => { const out = []; let left = 6; while (true) { const cc = c.filter(x => !out.includes(x) && (g.d(x).cost || 0) <= left); if (!cc.length) break; const t = await g.ask({ type: 'target', title: `${title} (남은 비용 ${left}, 취소하면 끝)`, cands: cc, cancelable: true }); if (!t) break; out.push(t); left -= g.d(t).cost || 0; } return out; };
  S['50004'] = { play: { timing: 'action', async resolve(g) { for (const x of await pickCost6(g, shieldSup(g).filter(y => g.c(y).ex), '준비할 [실드] 지원')) g.c(x).ex = false; } } }; // On the Double
  S['50005'] = { play: { timing: 'action', async resolve(g) { for (const x of await pickCost6(g, shieldSup(g), '만능 카운터를 놓을 [실드] 지원')) addAP(g, x, 1); } } }; // Reinforcements
  S['50006'] = { play: { timing: 'hero', can: g => shieldSup(g).length > 0, async resolve(g, u) { const t = await pick(g, shieldSup(g), '버릴 [실드] 지원'); if (!t) return; const x = g.d(t).cost || 0; g.discard(t, `${g.nm(t)} 버림`); for (const e of g.enemies().slice()) await g.dealDamage(e, x, { src: u, byPlayer: true }); } } }; // The Hard Call
  S['50008'] = { resources: [{ gen: 'G', label: '지원 인력 ([실드] 정체성)', can: (g, u) => !g.c(u).ex && (g.c(u).cnt.staff || 0) > 0 && tr(g, g.idt(), 'S.H.I.E.L.D'), use: (g, u) => { g.c(u).ex = true; g.c(u).cnt.staff--; g.cleanupUses(u); } }] }; // Support Staff
  const vehicle = (kind, label, fx) => ({ actions: [{ timing: 'action', exhaust: true, label, can: (g, u) => (g.c(u).cnt[kind] || 0) > 0, async use(g, u) { g.c(u).cnt[kind]--; await fx(g, u); g.cleanupUses(u); } }] });
  S['50009'] = vehicle('mission', '일리아드: 임무 카운터 1 → 피해 5 / 위협 4 제거 / 회복 3', async (g, u) => { const o = await g.ask({ type: 'choice', title: '일리아드', options: [{ id: 'd', label: '적에게 피해 5' }, { id: 't', label: '위협 4 제거' }, { id: 'h', label: '정체성 회복 3' }] }); // The Iliad
    if (o === 'd') { const t = await g.chooseTarget('enemy', '피해 5', g.idt(), false); if (t) await g.dealDamage(t, 5, { src: u, byPlayer: true }); } else if (o === 't') await g.removeThreatChoose(4, '일리아드', u); else { const t = await pick(g, g.livingPlayers().map(pi => g.s.ps[pi].identity).filter(Boolean), '회복 3을 받을 아이덴티티'); if (t) g.heal(t, 3); } });
  S['50010'] = { respond: [{ window: 'enemyAttackInitiated', label: '라이프 모델 디코이: 버리고 이 공격의 피해를 모두 방지', async resolve(g, u, ctx) { g.discard(u, '라이프 모델 디코이'); ctx.preventAll = true; await prep(g, u); } }] }; // Life Model Decoy
  S['50011'] = { actions: [{ timing: 'action', exhaust: true, label: '실드 국장: [실드] 지원에 만능 카운터 1', can: g => shieldSup(g).length > 0, async use(g) { await apOn(g); } }] }; // S.H.I.E.L.D. Director
  S['50012'] = { async onEnter(g) { const t = await pick(g, shieldSup(g).filter(x => g.c(x).ex), '빅토리아 핸드: 준비할 [실드] 지원'); if (t) g.c(t).ex = false; } }; // Victoria Hand
  S['50013'] = { handActions: [{ timing: 'action', cost: { n: 1, req: 'Y' }, label: '슬링샷: [에너지] → 손에서 플레이 영역으로 (단계 끝에 손으로)', can: g => g.p.allies.length < g.allyLimit() || true, async use(g, u) { const pi = await g.choosePlayer('슬링샷: 조종할 플레이어'); await g.withPlayer(pi, () => g.putAllyIntoPlay(u)); g.c(u).slingPhase = g.s.round + ':' + g.s.phase; } }], // Slingshot
    on: { playerPhaseEnd(g, u) { if (g.c(u).zone === 'ally' && g.c(u).slingPhase) { delete g.c(u).slingPhase; for (const a of g.c(u).att.slice()) g.discard(a); g.resetCard(u); g.put(u, 'hand'); g.log('슬링샷이 손으로 돌아옵니다'); } }, roundEnd(g, u) { if (g.c(u).zone === 'ally' && g.c(u).slingPhase) { delete g.c(u).slingPhase; g.resetCard(u); g.put(u, 'hand'); } } } };
  S['50014'] = { altPay(g, u) { // Organizational Support: also exhaust up to 3 allies/supports sharing a trait with your identity for their printed resources
    const it = new Set(g.d(g.idt()).tr || []), base = g.resOf(u);
    const el = g.p.allies.concat(g.p.supports).filter(x => !g.c(x).ex && (g.d(x).res || '') && (g.d(x).tr || []).some(t => it.has(t))).slice(0, 5); const out = [];
    for (let m = 1; m < (1 << el.length); m++) { const sub = el.filter((_, i) => m & (1 << i)); if (sub.length > 3) continue;
      out.push({ key: 'org' + m, res: base + sub.map(x => g.d(x).res).join(''), exhaust: sub, label: `${g.nm(u)} + 소진: ${sub.map(x => g.nm(x)).join(', ')}` }); }
    return out; } };
  S['50015'] = { respond: [{ window: 'cardRevealed', exhaust: true, label: '에이전트 오브 실드: 그 카드 취소, 다른 카드 공개', can: g => g.friendlyChars().every(c => tr(g, c, 'S.H.I.E.L.D')), resolve(g, u, ctx) { ctx.cancelAll = true; ctx.revealAnother = (ctx.revealAnother || 0) + 1; } }] }; // Agents of S.H.I.E.L.D.
  S['50017'] = vehicle('deploy', '서스: 배치 카운터 1 → 플레이어의 손에서 동료를 플레이 영역에', async g => { const pi = await g.choosePlayer('서스: 동료를 낼 플레이어'); await g.withPlayer(pi, async () => { const t = await pick(g, g.p.hand.filter(x => g.d(x).type === 'ally'), '플레이 영역에 들일 동료'); if (t) await g.putAllyIntoPlay(t); }); }); // The Circe
  S['50018'] = vehicle('missile', '벨레로폰: 미사일 1 → 빌런과 선택한 플레이어의 하수인 강인함 제거 후 피해 3', async (g, u) => { const pi = await g.choosePlayer('벨레로폰: 대상 플레이어'); for (const e of [g.e.villain].filter(Boolean).concat(g.engagedMinions(pi))) { g.c(e).tough = false; g.c(e).toughX = 0; await g.dealDamage(e, 3, { src: u, byPlayer: true }); } }); // The Bellerophon
  S['50019'] = vehicle('operation', '더글러스: 작전 1 → 모든 음모에서 위협 2 제거 (위기 무시)', async (g, u) => { for (const s of g.schemes().slice()) { const r = await g.removeThreat(s, 2, { src: u, ignoreCrisis: true }); await g.afterThreatRemoved(s); } }); // The Douglass
  S['50020'] = vehicle('supply', '페리클레스: 보급 1 → 히어로/빌런과 동료/하수인에게 상태 카드', async g => { const st = async (c, title) => { const t = await pick(g, c, title); if (!t) return; const k = await g.ask({ type: 'choice', title: '줄 상태 카드', options: [{ id: 'stun', label: '기절' }, { id: 'conf', label: '혼란' }, { id: 'tough', label: '강인함' }] }); g.giveStatus(t, k, '페리클레스'); }; // The Pericles
    await st(g.livingPlayers().map(pi => g.s.ps[pi].identity).concat([g.e.villain]).filter(Boolean), '상태 카드를 줄 히어로 또는 빌런'); await st(g.allAllies().concat(g.e.minions), '상태 카드를 줄 동료 또는 하수인'); });
  S['50022'] = { cannotDefend: true, on: { async treacheryDone(g, u) { if (g.c(u).zone !== 'ally') return; if (g.canAfford({ n: 1, req: 'B' }, null) && await yes(g, '그랜트 워드: [정신] 자원을 쓸까요? (아니면 피해를 받고 워드는 제거)') && (await g.pay({ n: 1, req: 'B' }, null, '그랜트 워드', true)) != null) return; await g.dealDamage(g.idt(), g.stat(u, 'atk'), {}); g.removeFromGame(u); g.log('그랜트 워드가 배신했습니다', 'warn'); } } }; // Grant Ward
  S['50023'] = { respond: afterPower(async g => { const t = g.e.deck[0]; if (t && await yes(g, `멜린다 메이: 조우 덱 맨 위 ${g.nm(t)}을(를) 버릴까요?`)) g.put(t, 'ediscard'); }, '★ 조우 덱 맨 위를 보고 버릴 수 있음') }; // Melinda May
  S['50024'] = { play: { timing: 'hero', async resolve(g) { for (let i = 0; i < 3; i++) { const c = shieldSup(g).concat(suit(g) ? [suit(g)] : []); const t = await pick(g, c, `슈퍼 스파이 (${i + 1}/3)`); if (!t) break; if (t === suit(g)) await suitThreat(g, 1); else addAP(g, t, 1); } } } }; // Super Spies
  S['50028'] = { insteadOfEncDiscard: true }; // Front Organization: discarded instead when an encounter effect would discard a card you control
  S['50029'] = { whenRevealed(g, u) { g.put(u, 'pobl'); g.log('기자 회견: 플레이어 단계가 끝날 때마다 지원의 만능 카운터 1 제거', 'warn'); }, // Press Conference
    on: { playerPhaseEnd(g, u) { if (g.c(u).zone !== 'pobl') return; for (const s of g.p.supports) { const k = apKind(g, s); if ((g.c(s).cnt[k] || 0) > 0) { g.c(s).cnt[k]--; g.cleanupUses(s); } } } },
    actions: [{ timing: 'alter', label: '정체성 소진 → 기자 회견 버림', can: (g, u) => g.c(u).zone === 'pobl' && !g.c(g.idt()).ex, use(g, u) { g.c(g.idt()).ex = true; g.discard(u); } }] };
  // Maria Hill nemesis: Controller
  const innocents = g => (g.e.env || []).find(x => idOf(g, x) === '50032') || null;
  const removeAP = async g => { const c = g.p.supports.filter(x => apCount(g, x) > 0); const t = await pick(g, c, '만능 카운터를 제거할 지원'); if (t) { g.c(t).cnt[apKind(g, t)]--; g.cleanupUses(t); } };
  async function controlled(g) { if (!innocents(g)) return; if (!g.p.deck.length) await g.reshuffleDeck(); const u = g.p.deck[0]; if (!u) return; const c = g.c(u); c.real = c.id; c.id = 'CONTROLLED'; g.put(u, 'minion'); g.log('덱 맨 위 카드가 [조종당한] 하수인이 되어 교전합니다', 'enemy'); }
  MC.cards.CONTROLLED = { id: 'CONTROLLED', name: '조종당한 시민', type: 'minion', enc: true, atk: 1, sch: 1, hp: 1, tr: ['CONTROLLED'], traits: ['조종당함'], noImg: true, text: '뒷면으로 놓인 플레이어 카드입니다. 조종당한 무고한 시민 환경 때문에 기본 음모 1, 공격 1, 체력 1을 가집니다. 격파되면 주인의 버림 더미로 가고 주 음모에 위협 1이 놓입니다.' };
  S.CONTROLLED = { async whenDefeated(g) { if (innocents(g)) await g.placeThreat(g.e.main, 1, {}); } };
  S['50030'] = { on: { async enemyActivated(g, u, ctx) { if (ctx.enemy !== u) return; await removeAP(g); await controlled(g); } } }; // Controller
  S['50031'] = { async whenRevealed(g) { if (!innocents(g)) { const x = g.e.deck.concat(g.e.discard, g.e.setaside).find(y => idOf(g, y) === '50032'); if (x) g.put(x, 'env'); } }, // Army of the Controlled
    async whenDefeated(g) { const ms = g.e.minions.filter(m => g.c(m).id === 'CONTROLLED'); for (const m of ms) g.discard(m); for (let i = 0; i < ms.length; i++) await apOn(g); } };
  S['50032'] = {};
  S['50033'] = { async whenRevealed(g) { await removeAP(g); await controlled(g); } }; // Diabolical Discs

  // ---------- Nick Fury: suit form upgrade (Assault / Stealth) with threat on it
  const suit = g => g.p.upgrades.find(x => ['50035a', '50035b'].includes(idOf(g, x))) || null;
  const stealth = g => { const s = suit(g); return !!s && idOf(g, s) === '50035b'; };
  const toForm = (g, f) => { const s = suit(g); if (!s) return; const id = f === 'stealth' ? '50035b' : '50035a'; if (g.c(s).id !== id) { g.c(s).id = id; g.log(`슈트 모드: ${g.nm(s)}`, 'good'); } };
  async function suitThreat(g, n) { const s = suit(g); if (!s || n <= 0) return; g.c(s).threat = (g.c(s).threat || 0) + n; g.log(`${g.nm(s)}에 위협 +${n} (총 ${g.c(s).threat})`); }
  AOS.suit = suit; AOS.suitThreat = suitThreat; AOS.toForm = toForm;
  S['50034b'] = { setup(g) { const x = g.p.deck.concat(g.p.hand, g.p.pset || []).find(y => ['50035a', '50035b'].includes(idOf(g, y))); if (x) { g.c(x).id = '50035a'; g.put(x, 'upgrade'); g.log('슈트 착용: 습격 모드', 'good'); } }, // Nick Fury (alter)
    actions: [{ timing: 'action', label: '잠입: 은신 슈트 모드로', can: g => !!suit(g) && !stealth(g), use(g) { toForm(g, 'stealth'); } }] };
  S['50034a'] = { respond: [{ window: 'afterBasicPower', label: '★ 정보 수집: 슈트에 위협 1', can: (g, u, ctx) => ctx.kind === 'thwart' && !!suit(g), async resolve(g) { await suitThreat(g, 1); } }], // Nick Fury (hero)
    on: { heroAttacking(g) { if (suit(g) && stealth(g)) { toForm(g, 'assault'); g.log('엄폐 해제: 습격 모드로', 'warn'); } } },
    actions: [{ timing: 'action', label: '잠입: 은신 슈트 모드로', can: g => !!suit(g) && !stealth(g), use(g) { toForm(g, 'stealth'); } }] };
  S['50035a'] = { permanent: true, respond: [{ window: 'basicPowerUsed', label: '습격: 슈트의 위협을 최대 3 제거 → 그만큼 피해 +', can: (g, u, ctx) => ctx.kind === 'attack' && (g.c(u).threat || 0) > 0, async resolve(g, u, ctx) { const m = Math.min(3, g.c(u).threat); const n = +(await g.ask({ type: 'choice', title: '습격: 제거할 위협', options: Array.from({ length: m }, (_, i) => m - i).map(k => ({ id: String(k), label: `${k}` })) })) || m; g.c(u).threat -= n; ctx.bonus += n; } }] }; // Assault
  S['50035b'] = { permanent: true, respond: [] }; // Stealth (handled by the engine hook below)
  S['50035b'].insteadOfAttackFor = true;
  S['50036'] = { respond: [{ window: 'allyPowerUsed', label: '★ 마리아 힐: 제거한 위협을 슈트에', can: (g, u, ctx) => ctx.ally === u && ctx.kind === 'thwart' && !!suit(g), resolve(g, u, ctx) { ctx.after.push(async gg => { const r = (gg.lastThwart || {}).removed || 0; if (r) await suitThreat(gg, r); }); } }] }; // Maria Hill (ally)
  S['50037'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { const t = ctx.target; const sch = g.d(t).sch || 0; await g.playerAttack(g.idt(), t, 4, { src: u, ranged: true }); // Concentrated Fire
    if (!g.c(t).zone || !['villain', 'minion'].includes(g.c(t).zone)) { const o = await g.ask({ type: 'choice', title: '집중 사격', options: [{ id: 't', label: `슈트에 위협 ${sch}` }, { id: 's', label: '은신 슈트 모드로' }] }); if (o === 't') await suitThreat(g, sch); else toForm(g, 'stealth'); } } } };
  S['50038'] = { play: { timing: 'hero', label: 'thwart', target: 'thwartable', async resolve(g, u, ctx) { const r = await thw(g, ctx.target, 2, u); if (stealth(g)) { if (r && await yes(g, `제거한 위협 ${r}을 슈트에 놓을까요?`)) await suitThreat(g, r); } else if (suit(g) && await yes(g, '은신 슈트 모드로 바꿀까요?')) toForm(g, 'stealth'); } } }; // Covert Surveillance
  S['50039'] = { play: { timing: 'hero', label: 'attack', async resolve(g, u) { const pi = await g.choosePlayer('난사: 대상 플레이어'); for (const e of [g.e.villain].filter(Boolean).concat(g.engagedMinions(pi))) await g.playerAttack(g.idt(), e, 3, { src: u, ranged: true }); } } }; // Spray Fire
  S['50040'] = { actions: [{ timing: 'hero', exhaust: true, label: '퓨리의 비행차: 슈트 위협 1 → 닉 퓨리 준비, 이번 라운드 [비행]', can: g => suit(g) && (g.c(suit(g)).threat || 0) > 0 && g.c(g.idt()).ex, use(g, u) { g.c(suit(g)).threat--; if (g.canReady(g.idt())) g.c(g.idt()).ex = false; g.addRoundMod(g.idt(), 'tr:AERIAL', 1); } }] }; // Fury's Flying Car
  S['50041'] = { actions: [{ timing: 'alter', exhaust: true, label: '은신처 #221: 회복 2 또는 슈트에 위협 1', async use(g) { const o = await g.ask({ type: 'choice', title: '은신처 #221', options: [{ id: 'h', label: '닉 퓨리 회복 2' }, { id: 't', label: '슈트에 위협 1' }] }); if (o === 'h') g.heal(g.idt(), 2); else await suitThreat(g, 1); } }] };
  S['50042'] = { respond: [{ window: 'wouldTakeAttackDamage', label: 'EM 방패: 버리고 이 피해를 모두 방지', can: (g, u, ctx) => ctx.target === g.idt(), async resolve(g, u, ctx) { g.discard(u, 'EM 방패'); ctx.prevent = ctx.amount; await prep(g, u); } }] }; // EM Shield
  S['50043'] = { respond: [{ window: 'threatWouldBePlaced', timing: 'hero', label: '안대 카메라: 버리고 그 위협 중 최대 3을 슈트에', can: (g, u, ctx) => ctx.scheme === g.e.main && !!suit(g), async resolve(g, u, ctx) { g.discard(u, '안대 카메라'); const n = Math.min(3, ctx.amount); ctx.amount -= n; await suitThreat(g, n); await prep(g, u); } }] }; // Eyepatch Camera
  S['50044'] = { resources: [{ gen: (g, u) => 'B'.repeat(Math.min(2, (suit(g) && g.c(suit(g)).threat) || 0)), label: '퓨리의 시계 (슈트 위협 최대 2 → [정신])', can: (g, u) => !g.c(u).ex && !!suit(g) && (g.c(suit(g)).threat || 0) > 0, use: (g, u) => { g.c(u).ex = true; const s = suit(g); g.c(s).threat = Math.max(0, g.c(s).threat - 2); } }] }; // Fury's Watch
  S['50045'] = { respond: [{ window: 'cardRevealed', label: '정보 분석: 버리고 슈트 위협 1 → 변고 취소', can: (g, u, ctx) => g.d(ctx.card).type === 'treachery' && !ctx.cancelAll && !!suit(g) && (g.c(suit(g)).threat || 0) > 0, async resolve(g, u, ctx) { g.discard(u, '정보 분석'); g.c(suit(g)).threat--; ctx.cancelAll = true; await prep(g, u); } }] }; // Intelligence Analysis
  S['50046'] = { respond: [{ window: 'preparationResolved', timing: 'hero', label: '비밀 요원: 음모의 위협 1을 슈트로', can: g => !!suit(g) && g.schemes().some(s => g.c(s).threat > 0), async resolve(g) { const s = await pick(g, g.schemes().filter(x => g.c(x).threat > 0), '위협을 가져올 음모'); if (s) { g.c(s).threat--; await suitThreat(g, 1); await g.afterThreatRemoved(s); } } }] }; // Secret Agent
  // Justice / Basic
  S['50050'] = { respond: [{ window: 'minionSchemes', label: '정보원: 버리고 이 활성화는 위협을 제거', async resolve(g, u, ctx) { g.discard(u, '정보원'); ctx.invert = true; await prep(g, u); } }] }; // Informant
  S['50051'] = { respond: [{ window: 'encounterDealt', label: '정보력 버림 → 받은 조우 카드와 조우 덱 맨 위 카드 확인·교체', // Intelligence
    can: (g, u) => g.c(u).zone === 'upgrade' && g.livingPlayers().some(pi => g.s.ps[pi].facedown.length > 0) && g.e.deck.length > 0,
    async resolve(g, u) { g.discard(u, '정보력'); const top = g.e.deck[0];
      const opts = [];
      for (const pi of g.livingPlayers()) for (const x of g.s.ps[pi].facedown) opts.push({ id: `${pi}:${x}`, label: `${g.playerName(pi)} 「${g.nm(x)}」 ↔ 맨 위 「${g.nm(top)}」` });
      opts.push({ id: 'none', label: '바꾸지 않음' });
      const allFd = g.livingPlayers().flatMap(pi => g.s.ps[pi].facedown.map(x => `${g.playerName(pi)}:${g.nm(x)}`)).join(', ');
      const k = await g.ask({ type: 'choice', title: `정보력: 받은 조우 카드 ${allFd} / 조우 덱 맨 위 ${g.nm(top)}`, options: opts });
      if (k && k !== 'none') { const [piS, cid] = k.split(':'); const pi = +piS; if (g.c(cid).zone === 'facedown') { g.put(cid, 'edeck', null, true); g.put(top, 'facedown', pi); g.log(`정보력: ${g.playerName(pi)}이(가) ${g.nm(top)}을(를) 받고 ${g.nm(cid)}을(를) 조우 덱 맨 위로`, 'good'); } }
    } }] };
  S['50052'] = { respond: [{ window: 'minionEntered', timing: 'hero', label: '프리즘 가루: 버리고 그 하수인 혼란, 피해 2', async resolve(g, u, ctx) { g.discard(u, '프리즘 가루'); g.giveStatus(ctx.minion, 'conf', '프리즘 가루'); await g.dealDamage(ctx.minion, 2, { src: u, byPlayer: true }); await prep(g, u); } }] }; // Prism Dust
  S['50054'] = { async onEnter(g, u) { const o = await g.ask({ type: 'choice', title: '닉 퓨리 시니어', options: [{ id: 't', label: '위협 3 제거' }, { id: 'd', label: '카드 2장' }, { id: 's', label: '[실드] 캐릭터에게 강인함' }] }); // Nick Fury, Sr.
    if (o === 't') await g.removeThreatChoose(3, '닉 퓨리 시니어', u); else if (o === 'd') await g.draw(2); else { const t = await pick(g, g.allFriendlyChars().filter(c => tr(g, c, 'S.H.I.E.L.D')), '강인함을 받을 캐릭터'); if (t) g.giveStatus(t, 'tough', '닉 퓨리 시니어'); } },
    on: { roundEnd(g, u) { if (g.c(u).zone === 'ally') g.discard(u, '닉 퓨리 시니어가 떠납니다'); } } };
  S['50055'] = { selfCostMod: g => tr(g, g.idt(), 'S.H.I.E.L.D') ? 2 : 0, resources: [{ gen: 'B', label: '젬마 시몬스 ([테크] 카드)', forOnly: (g, s, uid) => !!uid && tr(g, uid, 'TECH'), can: (g, u) => !g.c(u).ex, use: (g, u) => { g.c(u).ex = true; } }] }; // Jemma Simmons
  S['50056'] = { selfCostMod: g => tr(g, g.idt(), 'S.H.I.E.L.D') ? 2 : 0, actions: [{ timing: 'alter', exhaust: true, label: '레오 피츠: [테크] 카드를 손으로', async use(g) { await g.searchToHand(d => (d.tr || []).includes('TECH'), '[테크] 카드'); } }] }; // Leo Fitz
  S['50058'] = { respond: [{ window: 'preparationResolved', label: '숙련된 계획: 버리고 그 카드를 손으로', can: (g, u, ctx) => ctx.card !== u && g.c(ctx.card).zone === 'discard', resolve(g, u, ctx) { g.discard(u, '숙련된 계획'); g.put(ctx.card, 'hand'); } }] }; // Practiced Plan
  S['50059'] = { async whenRevealed(g, u, ctx) { toForm(g, 'assault'); const s = suit(g); const n = s ? g.c(s).threat || 0 : 0; if (!n) { ctx.surge++; return; } // Discovered
    const o = await g.ask({ type: 'choice', title: '발각', options: [{ id: 'd', label: `피해 ${n}` }, { id: 'r', label: '슈트의 위협 모두 제거' }] }); if (o === 'd') await g.dealDamage(g.idt(), n, {}); else g.c(s).threat = 0; } };
  // Nick Fury nemesis: Orion
  const orion = g => g.e.minions.find(m => idOf(g, m) === '50060') || null;
  S['50060'] = { multiTough: true, // Orion
    on: { afterTakeDamage(g, u, ctx) { if (ctx.target === u && g.c(u).zone === 'minion') g.giveStatus(u, 'tough', '★ 오리온'); } } };
  S['50061'] = { on: { async afterTakeDamage(g, u, ctx) { if (g.c(u).zone !== 'side' || !['50034a', '50034b'].includes(idOf(g, ctx.target))) return; const npi = g.identityPlayer(ctx.target); const o = orion(g); if (o) g.giveStatus(o, 'tough', '인피니티 포뮬러'); else { const x = g.e.deck.concat(g.e.discard, g.e.setaside).find(y => idOf(g, y) === '50060'); if (x) await g.withPlayer(npi >= 0 ? npi : g.s.ctx, () => g.enterMinion(x, {}, true)); } } } };
  S['50062'] = { on: { async afterEnemyScheme(g, u, ctx) { if (ctx.enemy === u) await g.withPlayer(g.c(u).eng != null ? g.c(u).eng : g.s.ctx, () => g.dealDamage(g.idt(), 1, {})); } } };
  S['50063'] = { async whenRevealed(g) { const x = g.e.deck.concat(g.e.discard).find(y => g.d(y).type === 'minion' && tr(g, y, 'LEVIATHAN')); g.shuffle(g.e.deck); if (x) await g.enterMinion(x, {}); else await g.dealDamage(g.idt(), 2, {}); }, async boostEffect(g) { await g.dealDamage(g.idt(), 1, {}); } };

  // ======================= Black Widow (scenario) =======================
  const BW = ['50064', '50065', '50066'];
  const widow = g => g.e.villain && BW.includes(idOf(g, g.e.villain)) ? g.e.villain : null;
  const nvg = g => { const w = widow(g); return w ? g.c(w).att.find(a => idOf(g, a) === '50070') || null : null; };
  const autoDef = g => g.e.sides.some(x => idOf(g, x) === '50074');
  async function resolvePrep(g, card, actx) { // the discarded card's Preparation ability during an attack against Black Widow
    const P = (MC.scripts[idOf(g, card)] || {}).prep;
    if (P) { g.log(`준비: ${g.nm(card)}`, 'warn'); await P(g, card, actx); g.e.prepThisAttack = true; return; }
    if (nvg(g)) { actx.prevent = true; g.discard(nvg(g), '야간 투시경 버림'); g.log('준비 (야간 투시경): 이 공격의 피해를 모두 방지', 'warn'); g.e.prepThisAttack = true; }
    if (autoDef(g)) { g.log('준비 (자동 방어): 공격한 캐릭터에게 피해 1', 'warn'); await g.dealDamage(actx.attacker, 1, {}); g.e.prepThisAttack = true; }
  }
  const widowV = extra => Object.assign({ async beforeAttackedCtx(g, u, actx) { g.e.prepThisAttack = false; const m = g.e.main; if (!m || g.c(m).threat <= 0) return; g.c(m).threat--; g.log('블랙 위도우: 주 음모 위협 1 제거 → 조우 덱 맨 위 버리고 준비 능력', 'warn'); const x = g.takeEncounter(); if (!x) return; g.put(x, 'ediscard'); await g.show({ type: 'reveal', uid: x, title: '준비' }); await resolvePrep(g, x, actx); } }, extra);
  S['50064'] = widowV({});
  S['50065'] = widowV({ async whenRevealed(g) { await g.placeThreat(g.e.main, 2 * g.players, {}); } });
  S['50066'] = widowV({ async whenRevealed(g) { await g.placeThreat(g.e.main, 3 * g.players, {}); } });
  S['50067a'] = { async setup(g) { await g.forEachPlayer(async () => { const m = g.e.deck.find(x => g.d(x).type === 'minion'); if (m) await g.enterMinion(m, {}); }); g.shuffle(g.e.deck); } }; // The Widow's Web
  S['50067b'] = { escFn: g => { const w = widow(g); return w ? (g.d(w).stage || 1) * g.players : 0; } };
  const attachW = { prep: async (g, u) => { const w = widow(g); if (w) g.attachEnc(u, w); }, attachTo: g => widow(g) || g.e.villain };
  S['50068'] = Object.assign({}, attachW, { mod: { retaliate: (g, s, t) => g.c(s).zone === 'attach' && t === g.c(s).on ? 1 : 0 }, // Black Widow's Gauntlet
    respond: [{ window: 'heroAttacked', timing: 'hero', label: '준비 능력이 없었다면 건틀릿 버림', can: (g, u, ctx) => g.c(u).zone === 'attach' && ctx.target === g.c(u).on && !g.e.prepThisAttack, resolve(g, u) { g.discard(u, '블랙 위도우의 건틀릿 버림'); } }] });
  S['50069'] = { attachTo: g => widow(g) || g.e.villain, cancelsEvent: true, prep: async g => { const t = g.p.hand.filter(x => g.d(x).type === 'event'); if (t.length) await g.discardFromHand(1, 1, '갈고리: 버릴 이벤트', g.p.hand.filter(x => g.d(x).type !== 'event')); } }; // Grappling Hook
  S['50070'] = Object.assign({}, attachW); // Night Vision Goggles
  S['50071'] = { attachTo: g => g.idt(), heroNo: { attack: (g, s) => g.c(s).zone === 'attach' && g.c(s).on === g.idt() }, cannotAttack: (g, s, t, src) => g.c(s).zone === 'attach' && !!src && src === g.c(s).on && src !== g.idt(), // Stun Net
    actions: [{ timing: 'action', label: '그물 제거: 캐릭터 1명 소진 → 기절 그물 버림', can: (g, u) => g.c(u).zone === 'attach' && g.friendlyChars().some(c => !g.c(c).ex), async use(g, u) { const c = await pick(g, g.friendlyChars().filter(x => !g.c(x).ex), '소진할 캐릭터'); if (c) { g.c(c).ex = true; g.discard(u, '기절 그물 버림'); } } }],
    prep: async (g, u, actx) => { actx.after.push(async gg => { if (gg.c(actx.attacker).zone && gg.c(u).zone === 'ediscard') gg.attachEnc(u, actx.attacker); }); } };
  S['50072'] = { prep: async (g, u, actx) => { actx.after.push(async gg => { if (gg.c(u).zone === 'ediscard') await gg.enterMinion(u, {}); }); } }; // A.I.M. Commando
  S['50073'] = { prep: async (g, u, actx) => { await g.enterMinion(u, {}); if (g.c(u).zone === 'minion') actx.retarget = u; } }; // A.I.M. Grunt
  S['50074'] = {}; // Automated Defenses (see resolvePrep)
  S['50075'] = { inciteFor: (g, s, uid) => g.c(s).zone === 'side' && uid !== s && g.d(uid).enc ? 1 : 0 }; // Destroy Evidence
  S['50076'] = { async whenRevealed(g) { const w = widow(g); if (!w) return; if (!g.isHero() && !g.formLocked()) await g.changeForm(true); g.c(w).fdBoost = (g.c(w).fdBoost || 0) + 1; await g.enemyAttack(w, {}); }, // Attacrobatics
    prep: async (g, u, actx) => { actx.prevent = true; if (g.s.scen.expert) await g.dealDamage(actx.attacker, actx.amount, {}); } };
  S['50077'] = { async whenRevealed(g) { g.giveStatus(g.idt(), 'conf', '비밀 작전'); const w = widow(g); if (w) await g.enemyScheme(w, {}); }, prep: async g => { for (const s of g.schemes().slice()) await g.placeThreat(s, 1, {}); } }; // Covert Ops
  S['50078'] = { async whenRevealed(g) { const done = []; for (const n of [1, 2, 3]) { const c = g.friendlyChars().filter(x => !done.includes(x)); const t = await pick(g, c, `죽음의 춤: 피해 ${n}을 받을 캐릭터`); if (!t) break; done.push(t); await g.dealDamage(t, n, {}); } }, // Dance of Death
    prep: async g => { for (const c of g.friendlyChars().slice()) await g.dealDamage(c, 1, {}); } };
  S['50079'] = { async whenRevealed(g) { const was = g.c(g.idt()).stun; g.giveStatus(g.idt(), 'stun', '과부의 독침'); await g.dealDamage(g.idt(), was ? 2 : 1, {}); }, prep: async (g, u, actx) => { actx.after.push(async gg => { if (gg.c(actx.attacker).zone) gg.giveStatus(actx.attacker, 'stun', '준비: 과부의 독침'); }); } }; // Widow's Bite
  // A.I.M. Abduction (modular)
  const abduct = g => g.e.sides.find(x => idOf(g, x) === '50081') || null;
  async function abductOrFind(g) { let a = abduct(g); if (a) return a; const x = g.e.deck.concat(g.e.discard).find(y => idOf(g, y) === '50081'); if (x) { await g.enterSide(x, {}); a = abduct(g); } return a; }
  async function tuckAlly(g, a, s) { for (const x of g.c(a).att.slice()) g.discard(x); g.resetCard(a); g.put(a, 'under', s); g.c(s).threat += g.d(a).cost || 0; g.c(s).cnt.accelTok = (g.c(s).cnt.accelTok || 0) + 1; g.log(`${g.nm(a)}이(가) 납치되었습니다 (위협 +${g.d(a).cost || 0}, 가속 토큰 +1)`, 'warn'); }
  S['50080'] = { async whenRevealed(g) { const s = await abductOrFind(g); if (!s) return; const al = g.p.allies.filter(a => !g.sc(a).noAllyLimit || true); if (al.length) { const hi = Math.max(...al.map(a => g.hpLeft(a))); const a = await pick(g, al.filter(x => g.hpLeft(x) === hi), '납치될 동료'); await tuckAlly(g, a, s); } else await g.placeThreat(s, 2, {}); } }; // A.I.M. Abductor
  S['50081'] = { icons: (g, u) => ({ accel: (g.d(u).accel || 0) + (g.c(u).cnt.accelTok || 0) }), // Abduct Superhumans
    on: { async allyDefeated(g, u, ctx) { if (g.c(u).zone === 'side' && ['discard', 'removed'].includes(g.c(ctx.ally).zone) && !g.d(ctx.ally).enc) await tuckAlly(g, ctx.ally, u); } },
    async whenDefeated(g, u) { for (const a of g.c(u).under.slice()) if (g.d(a).type === 'ally' && !g.d(a).enc) { await g.withPlayer(g.c(a).owner != null ? g.c(a).owner : g.s.ctx, () => g.putAllyIntoPlay(a)); g.log(`${g.nm(a)}을(를) 구출했습니다`, 'good'); } } };
  S['50082'] = { async whenRevealed(g) { const s = await abductOrFind(g); if (!s) return; for (let i = 0; i < 60; i++) { if (!g.p.deck.length) await g.reshuffleDeck(); const x = g.p.deck[0]; if (!x) break; if (g.d(x).type === 'ally') { await tuckAlly(g, x, s); break; } g.put(x, 'discard'); } } }; // Nabbed!
  // A.I.M. Science (modular)
  const aimAccel = g => g.e.sides.some(x => idOf(g, x) === '50085');
  S['50083'] = { icons: (g, u) => ({ accel: (g.d(u).accel || 0) + (aimAccel(g) ? 1 : 0) }), cannotAttack: (g, s, t) => t === s && g.engagedMinions(g.c(s).eng).some(m => m !== s) }; // A.I.M. Scientist
  S['50084'] = { icons: (g, u) => aimAccel(g) ? { accel: 1 } : null, async whenRevealed(g) { let sc = g.e.minions.find(m => idOf(g, m) === '50083'); if (!sc) { const x = g.e.deck.concat(g.e.discard).find(y => idOf(g, y) === '50083'); if (x) { await g.enterMinion(x, {}, true); sc = x; } } else if (g.c(sc).eng !== g.s.ctx) { g.c(sc).eng = g.s.ctx; g.log(`${g.nm(sc)}이(가) ${g.playerName()}와(과) 교전합니다`, 'warn'); } if (!sc || g.c(sc).zone !== 'minion') await g.placeThreat(g.e.main, 1, {}); } }; // A.I.M. Soldier
  S['50085'] = {}; // Mad Science (accel icons on A.I.M. minions above)

  // ======================= Batroc (scenario) =======================
  const alert = g => (g.e.env || []).find(x => ['50090a', '50090b'].includes(idOf(g, x))) || null;
  const high = g => { const a = alert(g); return !!a && idOf(g, a) === '50090b'; };
  async function alertThreat(g, n) { const a = alert(g); if (!a || n <= 0) return; g.c(a).threat = (g.c(a).threat || 0) + n; g.log(`경계 수준: 위협 ${g.c(a).threat}/${4 * g.players}`, 'warn'); await alertCheck(g); }
  async function alertCheck(g) { const a = alert(g); if (!a || (g.c(a).threat || 0) < 4 * g.players) return; if (high(g)) g.lose('경계 수준이 최고조에 이르렀습니다'); g.c(a).threat = 0; g.c(a).id = '50090b'; g.log('경계 수준이 [높음]으로 뒤집힙니다', 'warn'); }
  const batroc = g => g.e.villain && ['50086a', '50086b'].includes(idOf(g, g.e.villain)) ? g.e.villain : null;
  const batrocV = { on: { async afterEnemyAttack(g, u, ctx) { if (ctx.enemy === u) await alertThreat(g, 1); } }, mod: { sch: (g, s, t) => t === s && high(g) ? 1 : 0, atk: (g, s, t) => t === s && high(g) ? 1 : 0 },
    async wouldBeDefeated(g, u, w) { w.saved = true; g.c(u).dmg = 0; for (const a of g.c(u).att.slice()) { const R = MC.scripts[idOf(g, a)] || {}; if (R.discardOnReset) g.discard(a); } const r = Math.min(6, g.c(g.e.main).threat); g.c(g.e.main).threat -= r; g.log(`바트록: 체력을 회복하고 주 음모 위협 ${r} 제거`, 'good'); if (r && g.c(g.e.main).threat === 0) { const wc = g.sc(g.e.main).whenCleared; if (wc) await wc(g, g.e.main); } } };
  S['50086a'] = batrocV; S['50086b'] = batrocV;
  const captives = g => g.allAllies().filter(a => idOf(g, a) === '50091');
  S['50087a'] = { setup(g) { const a = (g.e.aside || []).find(x => idOf(g, x) === '50090a') || g.newCard('50090a'); g.put(a, 'env'); g.c(a).threat = g.s.scen.expert ? 2 * g.players : 0; } }; // Infiltrate A.I.M. Island Embassy
  S['50087b'] = { loseOnComplete: true, async whenCleared(g) { g.log('대사관 잠입 성공: 다음 단계로', 'good'); await g.setMainStage(g.e.mainIdx + 1); } };
  S['50088b'] = { loseOnComplete: true, async whenCleared(g, m) { const c = (g.e.aside || []).find(x => idOf(g, x) === '50091'); if (c) { const pi = await g.choosePlayer('구출된 포로: 조종할 플레이어'); await g.withPlayer(pi, async () => { await g.putAllyIntoPlay(c); g.c(c).ex = true; }); g.log(`구출된 포로가 ${g.playerName(pi)}에게 합류합니다`, 'good'); } // Locate Missing Person
    if (await (async () => (await g.ask({ type: 'choice', title: '실종자 찾기: 다음 단계(포로 탈출)로 진행할까요?', options: [{ id: 'y', label: '진행' }, { id: 'n', label: '진행하지 않음 (위협 +3/인)' }] })) === 'y')()) await g.setMainStage(g.e.mainIdx + 1); else g.c(m).threat += 3 * g.players; } };
  S['50089a'] = { async whenRevealed(g) { if (!captives(g).length) g.lose('구출된 포로가 없습니다'); if (high(g)) await fdEach(g, 1); else { const a = alert(g); if (a) { g.c(a).threat = 0; g.c(a).id = '50090b'; } } if (g.s.scen.expert) await alertThreat(g, 2 * g.players); } };
  S['50089b'] = { grantKw: (g, s, t) => g.s.scen.expert && g.e.minions.includes(t) ? ['quickstrike'] : null, // Extract Captives
    forceAttackTarget: g => { const c = captives(g); if (!c.length) return null; const lo = Math.min(...c.map(x => g.hpLeft(x))); return c.find(x => g.hpLeft(x) === lo); },
    async whenCleared(g) { g.win('포로들을 모두 탈출시켰습니다'); },
    on: { roundEnd(g, u) { if (u === g.e.main && !captives(g).length) g.lose('구출된 포로가 모두 사라졌습니다'); } } };
  S['50090a'] = { respond: [], actions: [{ timing: 'hero', label: '경계 수준: 자원 1 → 위협 1 제거', cost: { n: 1, req: '' }, can: (g, u) => (g.c(u).threat || 0) > 0, use(g, u) { g.c(u).threat--; } }], on: { async allyDefeated(g, u, ctx) { if (!ctx.consequential) await alertThreat(g, 1); } } };
  S['50090b'] = S['50090a'];
  S['50091'] = { noAllyLimit: true, actions: [{ timing: 'hero', exhaust: true, label: '구출된 포로: 주 음모 위협 제거', async use(g, u) { const r = await g.removeThreat(g.e.main, g.players, { src: u }); g.log(`주 음모 위협 ${r} 제거`); } }], // Rescued Captive
};
  S['50092'] = { attachTo: g => batroc(g) || g.e.villain, reduceDamage(g, a, n) { if (g.c(a).zone !== 'attach') return n; g.c(a).cnt.leap = (g.c(a).cnt.leap || 0) - 1; g.log(`고양된 반사신경: 피해 2 방지 (도약 ${Math.max(0, g.c(a).cnt.leap)})`, 'warn'); if (g.c(a).cnt.leap <= 0) g.discard(a, '고양된 반사신경 버림'); return Math.max(0, n - 2); }, // Heightened Reflexes
    boostEffect(g, u, ctx) { (ctx.post || ctx.after).push(async gg => { const b = batroc(gg); if (b && ['boost', 'ediscard'].includes(gg.c(u).zone)) { gg.attachEnc(u, b); gg.c(u).cnt.leap = 4; } }); },
    whenRevealed(g, u) { g.c(u).cnt.leap = 4; } };
  S['50093'] = { whenRevealed(g, u, ctx) { if (high(g)) ctx.surge++; }, async whenDefeated(g) { await alertThreat(g, 1); } }; // Embassy Guard
  S['50094'] = { inciteFor: (g, s, uid) => uid === s && high(g) ? 1 : 0, async whenDefeated(g) { await alertThreat(g, 1); } }; // Embassy Patrol
  S['50095'] = { icons: (g, u) => ({ accel: (g.d(u).accel || 0) + (g.c(u).cnt.accelTok || 0) }), whenRevealed(g, u) { if (high(g)) g.c(u).cnt.accelTok = 1; }, whenDefeated(g) { const a = alert(g); if (a) g.c(a).threat = Math.max(0, (g.c(a).threat || 0) - g.players); } }; // Commandeer Security Office
  S['50096'] = { async whenRevealed(g) { const b = batroc(g) || g.e.villain; if (!b) return; if (!g.isHero()) { await g.enemyScheme(b, {}); return; } const al = g.p.allies; // Leaping Kick
    if (al.length) { const hi = Math.max(...al.map(a => g.hpLeft(a))); const t = al.find(a => g.hpLeft(a) === hi); await g.enemyAttack(b, { forceTarget: t, overkill: true }); } else await g.enemyAttack(b, { overkill: true }); } };
  S['50097'] = { async whenRevealed(g, u, ctx) { if (!g.isHero()) { const a = alert(g); if (a) g.c(a).threat = Math.max(0, (g.c(a).threat || 0) - 1); ctx.surge++; return; } // Security Cameras
    for (const c of g.friendlyChars().slice()) { const o = await g.ask({ type: 'choice', title: `보안 카메라: ${g.nm(c)}`, options: [{ id: 'e', label: '소진' }, { id: 't', label: `경계 수준에 위협 ${high(g) ? 2 : 1}` }] }); if (o === 'e') g.c(c).ex = true; else await alertThreat(g, high(g) ? 2 : 1); } } };
  // Batroc's Brigade (modular)
  S['50098'] = { attackProps: (g, s, ctx) => ctx.enemy === s ? { piercing: true } : null, whenDefeated(g, u) { g.e.toEncDeck = (g.e.toEncDeck || []).concat([u]); } }; // Machete
  S['50099'] = { attackProps: (g, s, ctx) => ctx.enemy === s ? { ranged: true, indirect: true } : null, async whenRevealed(g) { for (const c of g.friendlyChars().slice()) await g.dealDamage(c, 1, {}); }, async boostEffect(g) { for (const c of g.friendlyChars().slice()) await g.dealDamage(c, 1, {}); } }; // Rapido
  S['50100'] = { mod: { atk: (g, s, t) => t === s ? g.c(s).under.reduce((n, x) => n + (g.d(x).cost || 0), 0) : 0 }, async whenRevealed(g, u) { const w = g.controlled().filter(x => g.d(x).type === 'upgrade' && tr(g, x, 'WEAPON') && !g.d(x).enc); // Zaran
    const t = await pick(g, w, '자란 아래에 둘 [무기] 업그레이드'); if (t) { g.resetCard(t); g.put(t, 'under', u); } else { if (!g.p.deck.length) await g.reshuffleDeck(); const x = g.p.deck[0]; if (x) g.put(x, 'under', u); } } };
  S['50101'] = { grantKw: (g, s, t) => g.c(s).zone === 'side' && g.e.minions.includes(t) ? ['toughness'] : null, whenRevealed(g) { for (const e of g.enemies()) g.giveStatus(e, 'tough', '바트록 여단'); }, // Batroc's Brigade
    respond: [{ window: 'cardRevealed', timing: 'hero', label: '자원 3 → 그 하수인 취소·버림', cost: { n: 3, req: '' }, can: (g, u, ctx) => g.c(u).zone === 'side' && g.d(ctx.card).type === 'minion' && !tr(g, ctx.card, 'ELITE') && !ctx.cancelAll && g.canAfford({ n: 3, req: '' }, null), async resolve(g, u, ctx) { if ((await g.pay({ n: 3, req: '' }, null, '바트록 여단', true)) != null) ctx.cancelAll = true; } }] };
  S['50102'] = { async whenRevealed(g, u, ctx) { const o = g.canAfford({ n: 3, req: '' }, null) ? await g.ask({ type: 'choice', title: '용병들', options: [{ id: 'p', label: '자원 3 지불' }, { id: 'm', label: '[용병] 하수인을 찾아 공개' }] }) : 'm'; // Soldiers of Fortune
    if (o === 'p' && (await g.pay({ n: 3, req: '' }, null, '용병들', true)) != null) return; const x = g.e.deck.concat(g.e.discard).find(y => g.d(y).type === 'minion' && tr(g, y, 'MERCENARY')); if (x) { g.shuffle(g.e.deck); await g.reveal(x); if (g.c(x).zone === 'minion') return; } ctx.surge++; },
    async boostEffect(g) { if (g.canAfford({ n: 1, req: '' }, null) && (await g.ask({ type: 'choice', title: '★ 용병들', options: [{ id: 'p', label: '자원 1 지불' }, { id: 'b', label: '강화 아이콘 +3' }] })) === 'p' && (await g.pay({ n: 1, req: '' }, null, '용병들', true)) != null) return 0; return 3; } };

  // ======================= M.O.D.O.K. =======================
  const modok = g => g.e.villain && ['50103a', '50103b'].includes(idOf(g, g.e.villain)) ? g.e.villain : null;
  const CELLS = { '50105': 'YY', '50106': 'BB', '50107': 'G', '50108': 'RR' };
  const cell = g => (g.e.env || []).find(x => /^5010[5-8]a$/.test(idOf(g, x))) || null;
  const cellDeck = g => (g.e.cellDeck = g.e.cellDeck || []);
  function nextCell(g) { const d = cellDeck(g); const u = d.shift(); if (!u) return null; g.c(u).id = g.c(u).id.slice(0, 5) + 'a'; g.resetCard(u); g.put(u, 'env'); g.c(u).cnt.lock = 2 * g.players; g.log(`감옥 칸 등장 (잠금 ${2 * g.players})`, 'warn'); return u; }
  async function unlock(g, u, n) { const c = g.c(u); c.cnt.lock = Math.max(0, (c.cnt.lock || 0) - (n || 1)); g.log(`감옥 칸: 잠금 ${c.cnt.lock}`); if (c.cnt.lock > 0) return;
    c.id = c.id.slice(0, 5) + 'b'; c.cnt = {}; g.put(u, 'discard'); const pi = await g.choosePlayer(`${g.nm(u)}: 조종할 플레이어`); await g.withPlayer(pi, () => g.putAllyIntoPlay(u)); g.log(`${g.nm(u)}이(가) 풀려나 ${g.playerName(pi)}에게 합류합니다`, 'good'); nextCell(g); }
  AOS.unlock = unlock;
  const modokV = hp => ({ async wouldBeDefeated(g, u, w) { const c = cell(g); if (!c) return; w.saved = true; g.c(u).dmg = 0; g.log(`M.O.D.O.K.: 체력 ${hp}로 재설정, 감옥 칸 잠금 2 제거`, 'warn'); for (const a of g.c(u).att.slice()) if ((MC.scripts[idOf(g, a)] || {}).discardOnReset) g.discard(a); await unlock(g, c, 2); } });
  S['50103a'] = modokV(10); S['50103b'] = modokV(14);
  S['50104a'] = { async setup(g) { // Upgrading Adaptoids: Holding Cell deck, Adaptoid upgrades, an Adaptoid per player
    const cells = (g.e.aside || []).filter(x => /^5010[5-8]a$/.test(idOf(g, x))); g.shuffle(cells); for (const x of cells) cellDeck(g).push(x); nextCell(g);
    for (let i = 0; i < (g.s.scen.expert ? 2 : 1); i++) await adaptoidUp(g);
    await g.forEachPlayer(async () => { const a = g.e.deck.find(x => idOf(g, x) === '50113'); if (a) await g.reveal(a); }); g.shuffle(g.e.deck); } };
  async function adaptoidUp(g) { const c = (g.e.aside || []).filter(x => /^5011[0-2]$|^50109$/.test(idOf(g, x))); if (!c.length) return false; const t = c[Math.floor(g.rand() * c.length)]; g.put(t, 'env'); g.log(`어댑토이드 강화: ${g.nm(t)}`, 'warn'); return true; }
  S['50104b'] = { async whenCompleted(g, m) { if (!(await adaptoidUp(g))) { g.lose('어댑토이드 강화가 모두 끝났습니다'); return; } if (!(g.e.aside || []).some(x => /^5011[0-2]$|^50109$/.test(idOf(g, x)))) g.lose('어댑토이드 강화가 모두 끝났습니다'); // Upgrading Adaptoids
    g.c(m).threat = 0; const ad = g.e.discard.filter(x => idOf(g, x) === '50113'); for (const x of ad) g.put(x, 'edeck'); g.shuffle(g.e.deck); return 'handled'; } };
  const cellAction = req => ({ actions: [{ timing: 'hero', label: `감옥 칸: ${req === 'G' ? '[와일드]' : req === 'YY' ? '[에너지][에너지]' : req === 'BB' ? '[정신][정신]' : '[물리][물리]'} 또는 자원 3 → 잠금 1 제거`, can: (g, u) => g.c(u).zone === 'env' && (g.canAfford({ n: req.length, req }, null) || g.canAfford({ n: 3, req: '' }, null)), async use(g, u) {
    const o = g.canAfford({ n: req.length, req }, null) ? (g.canAfford({ n: 3, req: '' }, null) ? await g.ask({ type: 'choice', title: '감옥 칸: 비용', options: [{ id: 'r', label: '지정 자원' }, { id: '3', label: '자원 3' }] }) : 'r') : '3';
    if ((await g.pay(o === 'r' ? { n: req.length, req } : { n: 3, req: '' }, null, '감옥 칸', true)) == null) return; await unlock(g, u, 1); } }] });
  for (const k of Object.keys(CELLS)) S[k + 'a'] = cellAction(CELLS[k]);
  const backToCells = { noAllyLimit: true, onLeave(g, u) { const c = g.c(u); c.id = c.id.slice(0, 5) + 'a'; g.put(u, 'aside'); cellDeck(g).push(u); } };
  S['50105b'] = Object.assign({ respond: [{ window: 'afterAllyThwart', label: '★ 다른 음모에서 위협 1 제거', can: (g, u, ctx) => ctx.ally === u, async resolve(g, u, ctx) { const t = await pick(g, g.schemes().filter(s => s !== ctx.scheme && g.c(s).threat > 0), '위협 1을 제거할 음모'); if (t) await thw(g, t, 1, u); } }] }, backToCells); // Flying Inhuman
  S['50106b'] = Object.assign({ respond: [{ window: 'afterAllyThwart', label: '★ 감옥 칸 잠금 1 제거', can: (g, u, ctx) => ctx.ally === u && !!cell(g), async resolve(g) { await unlock(g, cell(g), 1); } }] }, backToCells); // Psionic Inhuman
  S['50107b'] = Object.assign({ selfOverkill: () => true }, backToCells); // Sarah Garza
  S['50108b'] = Object.assign({}, backToCells); // Strong Inhuman
  const upg = id => g => (g.e.env || []).some(x => idOf(g, x) === id);
  S['50113'] = { // Adaptoid (modifiers from the Adaptoid environments)
    mod: { sch: (g, s, t) => t === s && upg('50109')(g) ? 1 : 0, atk: (g, s, t) => t === s ? (upg('50111')(g) ? 1 : 0) + (upg('50112')(g) ? 1 : 0) : 0 },
    inciteFor: (g, s, uid) => uid === s && upg('50109')(g) ? 1 : 0, grantKw: (g, s, t) => t === s ? [].concat(upg('50110')(g) ? ['villainous'] : [], upg('50112')(g) ? ['toughness'] : []) : null,
    grantTrait: (g, s, t) => t === s ? [].concat(upg('50109')(g) ? ['AERIAL'] : [], upg('50110')(g) ? ['PSIONIC'] : [], upg('50111')(g) ? ['ELITE'] : [], upg('50112')(g) ? ['BRUTE'] : []) : null,
    attackProps: (g, s, ctx) => ctx.enemy === s && upg('50111')(g) ? { overkill: true, ranged: true } : null,
    async whenDefeated(g) { const c = cell(g); if (c) await unlock(g, c, 1); },
    boostEffect(g, u, ctx) { (ctx.post || ctx.after).push(async gg => { if (['boost', 'ediscard'].includes(gg.c(u).zone)) { gg.put(u, 'edeck'); gg.shuffle(gg.e.deck); } }); } };
  for (const id of ['50109', '50110', '50111', '50112']) S[id] = {};
  const modAtt = extra => Object.assign({ attachTo: g => modok(g) || g.e.villain, discardOnReset: true }, extra);
  S['50114'] = modAtt({ mod: { hp: (g, s, t) => g.c(s).zone === 'attach' && t === g.c(s).on ? 5 : 0 } }); // Automated Mobile Unit
  S['50115'] = modAtt({}); // Focusing Crystal (acceleration icon from data)
  S['50116'] = modAtt({ on: { hostActivated(g, u) { const m = g.c(u).on; if (m) g.heal(m, 1); } } }); // Nanobots
  S['50117'] = { attachTo: g => modok(g) || g.e.villain, grantStalwart: true, reduceDamage(g, a, n) { if (g.c(a).zone !== 'attach') return n; g.c(a).cnt.damage = (g.c(a).cnt.damage || 0) + n; g.log(`염동 역장이 피해 ${n}을 받습니다 (${g.c(a).cnt.damage}/5)`, 'warn'); if (g.c(a).cnt.damage >= 5) g.discard(a, '염동 역장 버림'); return 0; }, // Psionic Force Field
    boostEffect(g, u, ctx) { (ctx.post || ctx.after).push(async gg => { if (ctx.enemy && gg.c(ctx.enemy).zone && ['boost', 'ediscard'].includes(gg.c(u).zone)) gg.attachEnc(u, ctx.enemy); }); } };
  S['50118'] = modAtt({ attackProps: (g, s, ctx) => g.c(s).zone === 'attach' && ctx.enemy === g.c(s).on ? { piercing: true } : null, boostEffect(g, u, ctx) { if ('undefended' in ctx) ctx.piercing = true; } }); // Psionic Machetes
  S['50119'] = modAtt({ mod: { atk: (g, s, t) => g.c(s).zone === 'attach' && t === g.c(s).on ? g.c(s).under.reduce((n, x) => n + (g.d(x).cost || 0), 0) : 0 }, // Reverse Engineering
    async whenRevealed(g, u) { const c = g.controlled().filter(x => g.d(x).type === 'upgrade' && !g.d(x).enc); const t = await pick(g, c, '역설계: 아래에 둘 업그레이드'); if (t) { g.resetCard(t); g.put(t, 'under', u); } else { if (!g.p.deck.length) await g.reshuffleDeck(); const x = g.p.deck[0]; if (x) g.put(x, 'under', u); } } });
  S['50120'] = { async whenRevealed(g, u) { const r = g.allAllies().filter(a => tr(g, a, 'RESCUED')); if (r.length) { const lo = Math.min(...r.map(a => g.hpLeft(a))); await g.enemyAttack(u, { forceTarget: r.find(a => g.hpLeft(a) === lo) }); } else { const c = cell(g); if (c) g.c(c).cnt.lock = (g.c(c).cnt.lock || 0) + 1; } } }; // A.I.M. Jailer
  S['50121'] = { async whenRevealed(g, u) { const r = g.allAllies().filter(a => tr(g, a, 'RESCUED')); const t = await pick(g, r, '인질로 잡힐 [구출된] 동료'); if (t) { g.resetCard(t); g.put(t, 'under', u); g.log(`${g.nm(t)}이(가) 인질로 잡힙니다`, 'warn'); } }, // Hostage Situation
    async whenDefeated(g, u) { for (const a of g.c(u).under.slice()) await g.putAllyIntoPlay(a); } };
  for (const id of ['50103a', '50103b']) S[id].cannotTakeDamage = g => g.e.sides.some(x => idOf(g, x) === '50121');
  S['50122'] = { boostEffect(g, u, ctx) { ctx.extraBoost = (ctx.extraBoost || 0) + 1; } }; // Psionic Enhancement
  S['50123'] = { async whenRevealed(g) { await g.forEachPlayer(async () => { const a = g.e.deck.concat(g.e.discard).find(x => idOf(g, x) === '50113'); g.shuffle(g.e.deck); if (a) await g.reveal(a); else fd(g, 1); }); } }; // "It's Alive!"
  S['50124'] = { async whenRevealed(g) { const m = modok(g) || g.e.villain; if (!g.isHero()) { g.giveStatus(g.idt(), 'conf', '염동 폭발'); if (m) await g.enemyScheme(m, {}); return; } const x = m ? g.stat(m, 'sch') : 0; const before = g.friendlyChars().map(c => [c, g.c(c).dmg]); await g.indirectDamage(x, null); for (const [c, d] of before) if (g.c(c).zone && g.c(c).dmg > d) g.giveStatus(c, 'conf', '염동 폭발'); } }; // Psionic Blast
  // Scientist Supreme (modular)
  const inVictory = (g, id) => (g.e.victory || []).some(x => idOf(g, x) === id);
  const aimVictory = g => (g.e.victory || []).filter(x => tr(g, x, 'A.I.M')).length;
  S['50125'] = { attackProps: (g, s, ctx) => ctx.enemy === s ? { piercing: true, ranged: true } : null }; // Scientist Supreme
  S['50126'] = { grantKw: (g, s, t) => t === s && inVictory(g, '50125') ? ['villainous'] : null }; // Monica Rappaccini
  S['50127'] = { icons: (g, u) => ({ accel: (g.d(u).accel || 0) + (g.c(u).cnt.accelTok || 0) }), whenRevealed(g, u) { g.c(u).cnt.accelTok = aimVictory(g); } }; // Diplomatic Immunity
  S['50128'] = { async whenRevealed(g) { const n = aimVictory(g); for (let i = 0; i < n && g.p.hand.length; i++) await g.discardFromHand(1, 1, '외교 제재: 버릴 카드'); }, boostEffect: g => aimVictory(g) }; // Diplomatic Sanctions

  // ======================= Thunderbolts =======================
  const tbMinions = g => g.e.minions.filter(m => tr(g, m, 'THUNDERBOLT'));
  const tbVictory = g => (g.e.victory || []).filter(x => tr(g, x, 'THUNDERBOLT')).length;
  const backup = g => (g.e.env || []).find(x => idOf(g, x) === '50131b') || null;
  const citizenV = { wouldBeDefeated(g, u, w) { if (tbVictory(g) < g.players) { w.saved = true; g.c(u).dmg = g.maxHp(u) - 1; if ('exact' in w) g.log('시티즌 V: 승리 표시에 [썬더볼트] 하수인이 부족해 쓰러지지 않습니다', 'warn'); } },
    skipStep2: g => tbMinions(g).length > 0 };
  S['50129a'] = Object.assign({}, citizenV); S['50129b'] = Object.assign({}, citizenV);
  S['50130a'] = { async setup(g) { // Apprehending Rogue Agents: Elite Thunderbolt minions set aside, Justice Like Lightning revealed
    const els = g.e.deck.filter(x => g.d(x).type === 'minion' && tr(g, x, 'THUNDERBOLT') && tr(g, x, 'ELITE')); for (const x of els) g.put(x, 'aside');
    const j = (g.e.aside || []).find(x => idOf(g, x) === '50131a'); if (j) { g.put(j, 'env'); await jll(g, j); } } };
  async function jll(g, j) { const tb = (g.e.aside || []).filter(x => g.d(x).type === 'minion' && tr(g, x, 'THUNDERBOLT')); g.shuffle(tb);
    await g.forEachPlayer(async () => { const first = tb.shift(); if (first) { await g.show({ type: 'reveal', uid: first, title: '썬더볼트' }); await g.enterMinion(first, {}); if (g.s.scen.expert) g.giveStatus(first, 'tough', '썬더볼트'); } });
    for (const x of tb) { g.resetCard(x); g.put(x, 'attach', j); if (g.s.scen.expert) g.c(x).tough = true; } g.c(j).id = '50131b'; g.log('정의, 번개처럼 → 썬더볼트 지원군', 'warn'); }
  S['50130b'] = { grantKw: (g, s, t) => g.e.minions.includes(t) && tr(g, t, 'THUNDERBOLT') ? ['guard'] : null };
  S['50131b'] = { holdsMinions: true, on: { roundEnd(g, u) { // Thunderbolt Backup: the most damaged Thunderbolt swaps with an attached one; attached minions heal
    const tb = tbMinions(g), hi = tb.length ? Math.max(...tb.map(m => g.c(m).dmg)) : 0, m = tb.find(x => g.c(x).dmg === hi), here = g.c(u).att.find(x => g.d(x).type === 'minion');
    if (here && m) { const epi = g.c(m).eng != null ? g.c(m).eng : g.s.first; g.put(here, 'minion', epi); g.log(`썬더볼트 지원군: ${g.nm(here)}이(가) ${g.playerName(epi)}와(과) 교전합니다`, 'warn'); }
    if (m) { for (const a of g.c(m).att.slice()) g.discard(a); g.put(m, 'attach', u); g.log(`썬더볼트 지원군: ${g.nm(m)}이(가) 물러납니다`, 'warn'); }
    for (const x of g.c(u).att.filter(a => g.d(a).type === 'minion')) { g.heal(x, g.players * (g.s.scen.expert ? 2 : 1)); if (g.s.scen.expert) g.giveStatus(x, 'tough', '썬더볼트 지원군'); } } } };
  S['50132'] = { attachTo: g => g.e.villain, async whenRevealed(g, u) { const v = g.c(u).on; if (v) await g.activate(v, {}); }, // Citizen V's Sword
    respond: [{ window: 'heroAttacked', timing: 'hero', label: '[물리][물리] → 시티즌 V의 검 버림', cost: { n: 2, req: 'RR' }, can: (g, u, ctx) => g.c(u).zone === 'attach' && ctx.target === g.c(u).on, resolve(g, u) { g.discard(u, '시티즌 V의 검 버림'); } }] };
  S['50133'] = { async whenDefeated(g) { await g.placeThreat(g.e.main, 3, {}); }, actions: [{ timing: 'hero', label: '졸트와 협상: 히어로 소진 → 협상 카운터 1', can: (g, u) => g.c(u).zone === 'minion' && !g.c(g.idt()).ex, use(g, u) { g.c(g.idt()).ex = true; g.c(u).cnt.parley = (g.c(u).cnt.parley || 0) + 1; if (g.c(u).cnt.parley >= 3) { g.removeFromGame(u); g.log('졸트가 설득되어 떠납니다', 'good'); } } }] }; // Jolt
  S['50134'] = { whenRevealed(g, u) { g.put(u, 'pobl'); g.c(u).cnt.bystander = 4; }, // Innocent Bystanders
    on: { async afterEnemyAttack(g, u) { await bystander(g, u); }, async heroAttacking(g, u) { await bystander(g, u); } } };
  async function bystander(g, u) { if (g.c(u).zone !== 'pobl') return; const n = g.s.scen.expert ? 2 : 1; const o = g.canAfford({ n: 1, req: '' }, null) ? await g.ask({ type: 'choice', title: '무고한 시민', options: [{ id: 'p', label: '자원 1 지불' }, { id: 't', label: `주 음모에 위협 ${n}` }] }) : 't'; if (o !== 'p' || (await g.pay({ n: 1, req: '' }, null, '무고한 시민', true)) == null) await g.placeThreat(g.e.main, n, {}); g.c(u).cnt.bystander--; if (g.c(u).cnt.bystander <= 0) g.discard(u, '무고한 시민 해결'); }
  S['50135'] = { whenRevealed(g) { rotateEngaged(g); } }; S['50136'] = { whenRevealed(g) { rotateEngaged(g); } };
  S['50137'] = { async whenRevealed(g, u, ctx) { const c = (g.e.victory || []).filter(x => g.d(x).type === 'minion' && tr(g, x, 'THUNDERBOLT')); if (!c.length) { ctx.surge++; return; } const m = c[Math.floor(g.rand() * c.length)]; g.resetCard(m); await g.enterMinion(m, {}); g.c(m).dmg = Math.max(0, g.maxHp(m) - 5); g.removeFromGame(u); } }; // Down but Not Out
  S['50138'] = { async whenRevealed(g) { const tb = tbMinions(g).filter(m => g.c(m).eng !== g.s.ctx); if (tb.length) { const lo = Math.min(...tb.map(m => g.c(m).dmg)); const t = tb.find(m => g.c(m).dmg === lo); g.c(t).eng = g.s.ctx; g.log(`교대 투입: ${g.nm(t)}이(가) ${g.playerName()}와(과) 교전합니다`, 'warn'); await g.activate(t, {}); } else if (g.e.villain) await g.activate(g.e.villain, {}); } }; // Tap In
  // Thunderbolt modular sets: an Elite Thunderbolt minion + its treachery "find her/him and reveal"
  const findReveal = id => async (g, u, ctx) => { let m = g.e.minions.find(x => idOf(g, x) === id); if (!m) { const x = g.e.deck.concat(g.e.discard, g.e.aside || []).find(y => idOf(g, y) === id); if (x) { g.shuffle(g.e.deck); await g.enterMinion(x, {}); m = x; } } if (m && g.c(m).zone === 'minion') await g.activate(m, {}); else ctx.surge++; };
  S['50139'] = { on: { enemyActivated(g, u, ctx) { if (ctx.enemy === u) g.giveStatus(u, 'tough', '★ 문스톤'); } } }; // Moonstone
  S['50140'] = { mod: { atk: (g, s, t) => g.c(s).zone === 'side' && g.hasTrait(t, 'AERIAL') ? 1 : 0 }, boostEffect(g, u, ctx) { if (ctx.enemy && g.hasTrait(ctx.enemy, 'AERIAL')) ctx.extraBoost = (ctx.extraBoost || 0) + 1; } }; // Rule the Skies
  S['50141'] = { whenRevealed: findReveal('50139') };
  S['50142'] = { async whenRevealed(g, u, ctx) { if (!g.isHero()) { const c = g.p.allies.concat(g.p.supports); const t = await pick(g, c, '심리 조작: 버릴 동료/지원'); if (t) g.discard(t, `${g.nm(t)} 버림`); else ctx.surge++; return; } const c = g.friendlyChars(); const lo = Math.min(...c.map(x => g.hpLeft(x))); const t = c.find(x => g.hpLeft(x) === lo); await g.dealDamage(t, g.stat(g.idt(), 'atk'), {}); } }; // Psychological Manipulation
  S['50143'] = { activationExtra: () => 1 }; // Songbird
  S['50144'] = { attachTo: g => g.e.minions.find(m => idOf(g, m) === '50143') || g.e.villain, removesStalwart: true, absorbsStatus: true }; // Solid Sound Constructs
  S['50145'] = { attachTo: g => g.idt(), on: { heroAttacking(g, u) { if (g.c(u).zone === 'attach') { g.discard(u, '굳은 소리 결박'); g.giveStatus(g.idt(), 'stun', '굳은 소리 결박'); } } }, boostEffect(g) { if (g.c(g.idt()).stun) g.giveStatus(g.idt(), 'conf', '★ 굳은 소리 결박'); else g.giveStatus(g.idt(), 'stun', '★ 굳은 소리 결박'); } }; // Hard Sound Bindings
  S['50146'] = { async absorbEnemyDamage(g, s, t, n) { const r = Math.min(n, g.c(s).threat); if (!r) return n; g.c(s).threat -= r; g.log(`음파 거품: 피해 대신 위협 ${r} 제거`, 'warn'); if (!g.c(s).threat) await g.afterThreatRemoved(s); return n - r; } }; // Sonic Bubble
  S['50147'] = { whenRevealed: findReveal('50143') };
  S['50148'] = { on: { async afterEnemyScheme(g, u, ctx) { if (ctx.enemy !== u) return; const x = g.e.deck.concat(g.e.discard).find(y => idOf(g, y) === '50149'); g.shuffle(g.e.deck); if (x) { g.resetCard(x); g.attachEnc(x, u); } else g.giveStatus(g.idt(), 'conf', '★ 블랙 위도우'); } } }; // Black Widow (Thunderbolt)
  S['50149'] = { attachTo: g => g.e.minions.find(m => idOf(g, m) === '50148') || g.e.villain, on: { async hostAttacked(g, u, actx) { actx.prevent = true; g.discard(u, '핸드스프링'); g.log('핸드스프링: 공격한 캐릭터가 대신 피해를 받습니다', 'warn'); await g.dealDamage(actx.attacker, actx.amount, {}); } } }; // Handspring
  S['50150'] = { whenRevealed(g, u) { const n = g.inPlay().filter(x => tr(g, x, 'PREPARATION')).length; if (n) g.c(u).threat += n; } }; // Pride of the Red Room
  S['50151'] = { whenRevealed: findReveal('50148') };
  S['50152'] = { on: { async enemyActivated(g, u, ctx) { if (ctx.enemy === u) for (const c of g.friendlyChars().slice()) await g.dealDamage(c, 1, {}); } } }; // Radioactive Man
  S['50153'] = { attachTo: g => g.idt(), on: { afterRecover(g, u) { if (g.c(u).zone === 'attach') g.discard(u, '방사능 노출 버림'); } } }; // Radiation Exposure
  S['50154'] = { on: { async afterTakeDamage(g, u, ctx) { if (g.c(u).zone !== 'side' || idOf(g, ctx.target) !== '50152') return; g.c(u).threat += ctx.amount; if (g.c(u).threat >= 10) { g.log('폭주하는 핵반응!', 'warn'); for (const c of g.allFriendlyChars().concat(g.enemies()).slice()) await g.dealDamage(c, 10, {}); g.discard(u); } } } }; // Runaway Nuclear Reaction
  S['50155'] = { whenRevealed: findReveal('50152') };
  S['50156'] = { cannotBeDefended: (g, s, enemy) => enemy === s && !g.hasTrait(g.idt(), 'AERIAL') }; // MACH-IV
  S['50157'] = { attachTo: g => g.e.minions.find(m => idOf(g, m) === '50156') || g.enemies().sort((a, b) => g.stat(b, 'atk') - g.stat(a, 'atk'))[0], attackProps: (g, s, ctx) => g.c(s).zone === 'attach' && ctx.enemy === g.c(s).on ? { overkill: true, ranged: true } : null }; // Blasters
  S['50158'] = { attachTo: g => g.e.minions.find(m => idOf(g, m) === '50156') || g.e.villain, whenRevealed(g, u) { g.c(u).cnt.missile = 4; }, on: { async afterEnemyAttack(g, u, ctx) { if (g.c(u).zone !== 'attach' || ctx.enemy !== g.c(u).on) return; g.c(u).cnt.missile--; await g.indirectDamage(2, null); if (g.c(u).cnt.missile <= 0) g.discard(u, '열추적 미사일 소진'); } } }; // Heat-Seeking Missiles
  S['50159'] = { attackDamageReduce(g, x, t, n, o) { // Aerial Dogfight: AERIAL characters take 2 less from each attack unless the attacker/attack is AERIAL or the attack is ranged
    if (g.c(x).zone !== 'side' || !tr(g, t, 'AERIAL') || o.ranged) return n; if ([o.src, o.attacker].some(a => a && g.s.cards[a] && tr(g, a, 'AERIAL'))) return n;
    const r = Math.max(0, n - 2); if (r < n) g.log(`공중전: ${g.nm(t)}이(가) 받는 피해 -${n - r}`); return r; } };
  S['50160'] = { whenRevealed: findReveal('50156') };
  S['50161'] = { async whenRevealed(g) { if (g.p.hand.length) await g.discardFromHand(1, 1, '바트록: 버릴 카드'); } }; // Batroc (Thunderbolt)
  S['50162'] = { on: { async minionEnters(g, u, ctx) { if (g.c(u).zone !== 'side') return; const epi = g.c(ctx.minion).eng != null ? g.c(ctx.minion).eng : g.s.ctx; await g.withPlayer(epi, async () => { const n = g.d(ctx.minion).boost || 0; let y = 0; for (let i = 0; i < n; i++) { if (!g.p.deck.length) await g.reshuffleDeck(); const x = g.p.deck[0]; if (x) { g.put(x, 'discard'); y += (g.d(x).res || '').split('').filter(r => r === 'Y').length; } } if (y) await g.placeThreat(u, y, {}); }); } } }; // Coup de Foudre
  S['50163'] = { whenRevealed: findReveal('50161') };
  S['50164'] = { whenRevealed(g) { rotateEngaged(g); }, async boostEffect(g) { const c = g.e.minions.filter(m => g.c(m).eng !== g.s.ctx); if (!c.length) return; const t = await pick(g, c, '★ 장애물 돌파 훈련: 교전할 하수인'); if (t) { g.c(t).eng = g.s.ctx; g.log(`★ 장애물 돌파 훈련: ${g.nm(t)}이(가) ${g.playerName()}와(과) 교전합니다`, 'warn'); } } }; // Parcours du Combattant

  // ======================= Baron Zemo =======================
  const BOARD = { '50181': 'medical', '50182': 'surveillance', '50183': 'tactical' };
  const AOSC = 'agents_of_shield', MEMBERS = [['50181', 'Chief Medical Officer'], ['50182', 'Chief Surveillance Officer'], ['50183', 'Chief Tactical Officer']];
  const boardEnv = g => (g.e.env || []).filter(x => /^5018[1-3]a$/.test(idOf(g, x)));
  const boardAtt = g => g.e.villain ? g.c(g.e.villain).att.filter(x => /^5018[1-3]b$/.test(idOf(g, x))) : [];
  const boardAll = g => boardEnv(g).concat(boardAtt(g));
  const zemo = g => g.e.villain && /^5016[56][ab]$/.test(idOf(g, g.e.villain)) ? g.e.villain : null;
  const flipAt = g => g.s.scen.expert ? 3 : 4;
  async function secret(g, u, n) { if (!u || n <= 0) return; const c = g.c(u); c.cnt.secret = (c.cnt.secret || 0) + n; g.log(`${g.nm(u)}: 비밀 카운터 +${n} (총 ${c.cnt.secret})`, 'warn');
    if (/a$/.test(c.id) && c.cnt.secret >= flipAt(g)) { const v = g.e.villain; c.id = c.id.slice(0, 5) + 'b'; if (v) { g.attachEnc(u, v); g.log(`${g.nm(u)}이(가) 빌런에게 붙습니다`, 'warn'); } { const nm = (MEMBERS.find(m => m[0] === c.id.slice(0, 5)) || [])[1]; if (nm && g.campaignOn(AOSC)) g.clogSet(`${nm} Flipped`, 'Yes'); } if (boardAtt(g).length >= 3) g.lose('이사회 3명이 모두 바론 제모에게 넘어갔습니다'); return; }
    if (/b$/.test(c.id)) for (let i = 0; i < n; i++) await aidFx(g, u); }
  async function aidFx(g, u) { const k = idOf(g, u).slice(0, 5); const v = g.e.villain;
    if (k === '50181') { const o = await g.ask({ type: 'choice', title: '의료 책임자의 지원', options: [{ id: 'h', label: '빌런 회복 2' }, { id: 'd', label: '체력이 가장 낮은 아군 캐릭터에게 피해 1' }] }); if (o === 'h') { if (v) g.heal(v, 2); } else { const c = g.allFriendlyChars(); const lo = Math.min(...c.map(x => g.hpLeft(x))); await g.dealDamage(c.find(x => g.hpLeft(x) === lo), 1, {}); } }
    else if (k === '50182') await g.placeThreat(g.e.main, 2, {});
    else { const t = await pick(g, g.allFriendlyChars(), '전술 책임자의 지원: 피해 2를 받을 캐릭터'); if (t) await g.dealDamage(t, 2, {}); } }
  const fewest = g => { const c = boardEnv(g); if (!c.length) return null; const lo = Math.min(...c.map(x => g.c(x).cnt.secret || 0)); return c.find(x => (g.c(x).cnt.secret || 0) === lo); };
  async function removeSecrets(g, n, title) { for (let i = 0; i < n; i++) { const c = boardAll(g).filter(x => (g.c(x).cnt.secret || 0) > 0); const t = await pick(g, c, `${title || '비밀 카운터 제거'} (${i + 1}/${n})`); if (!t) break; g.c(t).cnt.secret--; } }
  AOS.secret = secret; AOS.removeSecrets = removeSecrets;
  const zemoA = hp => ({ async wouldBeDefeated(g, u, w) { if (/b$/.test(idOf(g, u))) return; w.saved = true; g.c(u).dmg = 0; g.log(`바론 제모: 체력 ${hp}로 재설정`, 'warn'); await removeSecrets(g, 3, '바론 제모: 이사회 비밀 카운터 제거'); } });
  S['50165a'] = zemoA(12); S['50166a'] = zemoA(16);
  const zemoB = n => ({ async onActivationStart(g, u) { const c = boardAll(g); const o = c.length ? await g.ask({ type: 'choice', title: '★ 바론 제모', options: [{ id: 's', label: `[이사회] 카드에 비밀 카운터 ${n}` }, { id: 'b', label: '강화 카드 1장 추가' }] }) : 'b'; if (o === 's') await secret(g, await pick(g, c, '비밀 카운터를 놓을 카드'), n); else g.c(u).fdBoost = (g.c(u).fdBoost || 0) + 1; },
    async whenDefeatedVillain() {} });
  S['50165b'] = zemoB(1); S['50166b'] = zemoB(2);
  // the evidence envelopes: one Means, one Motive and one Opportunity in the A.I.M. envelope (hidden), the other six in the S.H.I.E.L.D. envelope
  const MEANS = ['50185', '50186', '50187'], MOTIVE = ['50188', '50189', '50190'], OPP = ['50191', '50192', '50193'];
  const MOLE = { medical: [['50185', '50188', '50191'], ['50185', '50188', '50192'], ['50185', '50189', '50191'], ['50185', '50189', '50193'], ['50185', '50190', '50192'], ['50186', '50188', '50191'], ['50186', '50188', '50192'], ['50186', '50189', '50191'], ['50187', '50188', '50191']],
    surveillance: [['50185', '50189', '50192'], ['50186', '50188', '50193'], ['50186', '50189', '50192'], ['50186', '50189', '50193'], ['50186', '50190', '50191'], ['50186', '50190', '50192'], ['50187', '50189', '50192'], ['50187', '50189', '50193'], ['50187', '50190', '50192']],
    tactical: [['50185', '50188', '50193'], ['50185', '50190', '50191'], ['50185', '50190', '50193'], ['50186', '50190', '50193'], ['50187', '50188', '50192'], ['50187', '50188', '50193'], ['50187', '50189', '50191'], ['50187', '50190', '50191'], ['50187', '50190', '50193']] };
  const moleOf = ids => { const k = ids.slice().sort().join(','); for (const [m, l] of Object.entries(MOLE)) if (l.some(x => x.slice().sort().join(',') === k)) return m; return null; };
  const evName = id => MC.cards[id] ? MC.cards[id].name : id;
  S['50167a'] = { setup(g) { // Zemo's Manipulations: build the envelopes
    if (g.campaignOn('agents_of_shield')) return; // the campaign prepares the evidence and the board
    for (const u of (g.e.setupPending || [])) if (/^5018[1-3]a$/.test(idOf(g, u))) g.c(u).cnt.secret = 2; // not in campaign mode: 2 secret counters on each Board Member
    const ev = g.e.deck.filter(x => g.d(x).type === 'evidence'); for (const x of ev) g.put(x, 'aside');
    const by = l => { const c = ev.filter(x => l.includes(idOf(g, x))); return c[Math.floor(g.rand() * c.length)]; };
    const aim = [by(MEANS), by(MOTIVE), by(OPP)].filter(Boolean); g.e.aimEnv = aim; g.e.shieldEnv = ev.filter(x => !aim.includes(x)); g.shuffle(g.e.shieldEnv); g.e.earned = [];
    for (const x of ev) g.c(x).fd = true; g.log('증거 봉투를 준비했습니다 (A.I.M. 봉투 3장, S.H.I.E.L.D. 봉투 6장)', 'warn'); } };
  async function gainEvidence(g, n) { for (let i = 0; i < n; i++) { const x = (g.e.shieldEnv || []).shift(); if (!x) break; g.c(x).fd = false; g.put(x, 'env'); g.e.earned.push(idOf(g, x)); await g.show({ type: 'reveal', uid: x, title: '증거 확보' }); g.log(`증거 확보: ${g.nm(x)} (범인 쪽 증거가 아닙니다)`, 'good'); const f = (MC.scripts[idOf(g, x)] || {}).evidenceSetup; if (f) await f(g, x); } }
  S['50167b'] = { loseOnComplete: true, on: { async playerPhaseEnd(g, u) { if (u !== g.e.main) return; // Zemo's Manipulations
    await g.withPlayer(g.s.first, async () => { const empty = boardEnv(g).filter(x => !(g.c(x).cnt.secret || 0)); if ((g.e.shieldEnv || []).length && empty.length && await yes(g, '이사회 카드 하나에 비밀 카운터 2개를 놓고 S.H.I.E.L.D. 봉투에서 증거 2장을 얻을까요?')) { await secret(g, await pick(g, empty, '비밀 카운터 2개를 놓을 [이사회] 환경'), 2); await gainEvidence(g, 2); } });
    if ((await g.ask({ type: 'choice', title: '고발 단계(2A)로 넘어갈까요? (얻은 증거로 범인을 추리합니다)', options: [{ id: 'n', label: '아직 아니요' }, { id: 'y', label: '고발한다' }] })) === 'y') await g.setMainStage(g.e.mainIdx + 1); } } };
  S['50168a'] = { async whenRevealed(g) { // The Accusation: guess means, motive, opportunity and accuse a board member
    const ask = async (l, t) => { const c = l.filter(id => !(g.e.earned || []).includes(id)); if (c.length === 1) return c[0]; return await g.ask({ type: 'choice', title: `고발: ${t}`, options: c.map(id => ({ id, label: evName(id) })) }); };
    g.e.guess = { means: await ask(MEANS, '수단'), motive: await ask(MOTIVE, '동기'), opp: await ask(OPP, '기회') };
    const accused = await g.ask({ type: 'choice', title: '고발: 내부 첩자로 지목할 이사', options: Object.entries(BOARD).map(([k, v]) => ({ id: v, label: MC.cards[k + 'a'] ? MC.cards[k + 'a'].name : v })) }); g.e.guess.accused = accused; } };
  S['50168b'] = { async whenRevealed(g, m) { const aim = (g.e.aimEnv || []).map(x => idOf(g, x)); const gs = g.e.guess || {}; const mole = moleOf(aim);
    for (const x of g.e.aimEnv || []) { g.c(x).fd = false; } g.log(`A.I.M. 봉투: ${aim.map(evName).join(', ')} → 내부 첩자: ${mole}`, 'warn');
    const wrong = ['means', 'motive', 'opp'].filter(k => !aim.includes(gs[k])).length; if (wrong) { g.log(`잘못 추리한 증거 ${wrong}개: 각 이사회 카드에 비밀 카운터 ${wrong}`, 'warn'); for (const b of boardAll(g).slice()) await secret(g, b, wrong); }
    if (gs.accused && gs.accused !== mole) { const acc = boardAll(g).find(x => BOARD[idOf(g, x).slice(0, 5)] === gs.accused); if (acc) { g.log('잘못된 고발: 지목한 이사에게 비밀 카운터 3', 'warn'); await secret(g, acc, 3); } } else g.log('고발 성공!', 'good');
    g.e.mole = mole; await g.setMainStage(g.e.mainIdx + 1); } };
  S['50169a'] = { async whenRevealed(g) { const z = zemo(g); if (!z) return; g.c(z).id = g.c(z).id.slice(0, 5) + 'b'; g.c(z).dmg = 0; g.log('바론 제모가 가면을 벗습니다!', 'warn'); await g.show({ type: 'reveal', uid: z, title: '바론 제모' }); // Fighting Zemo
    const sw = g.e.deck.concat(g.e.discard).find(x => idOf(g, x) === '50170'); if (sw) { g.resetCard(sw); g.attachEnc(sw, z); } } };
  S['50169b'] = { async whenRevealed(g, m) { const z = zemo(g); const mole = boardAll(g).find(x => BOARD[idOf(g, x).slice(0, 5)] === g.e.mole); if (mole && /a$/.test(idOf(g, mole)) && z) { g.c(mole).id = idOf(g, mole).slice(0, 5) + 'b'; g.attachEnc(mole, z); g.log(`내부 첩자 ${g.nm(mole)}이(가) 제모에게 붙습니다`, 'warn'); if (boardAtt(g).length >= 3) g.lose('이사회 3명이 모두 바론 제모에게 넘어갔습니다'); }
    const n = boardAtt(g).reduce((t, x) => t + (g.c(x).cnt.secret || 0), 0); if (n) g.c(m).threat += n * g.players; } };
  for (const k of ['50165b', '50166b']) S[k].whenDefeatedVillain = async g => { g.win('바론 제모를 물리쳤습니다'); return 'handled'; };
  const boardEnvS = (req, label, fx) => ({ actions: [{ timing: 'hero', label: `${label} → 비밀 카운터 1 제거`, cost: { n: req.length, req }, can: (g, u) => g.c(u).zone === 'env' && (g.c(u).cnt.secret || 0) > 0, async use(g, u) { g.c(u).cnt.secret--; if (fx) await fx(g); } }] });
  S['50181a'] = boardEnvS('YY', '[에너지][에너지]', async g => { const t = await pick(g, g.allFriendlyChars().filter(c => g.c(c).dmg > 0), '회복 1을 받을 캐릭터'); if (t) g.heal(t, 1); });
  S['50182a'] = boardEnvS('BB', '[정신][정신]'); S['50183a'] = boardEnvS('RR', '[물리][물리]');
  for (const k of ['50181b', '50182b', '50183b']) S[k] = { permanent: true };
  S['50170'] = { attachTo: g => zemo(g) || g.e.villain, on: { async afterEnemyAttack(g, u, ctx) { if (g.c(u).zone === 'attach' && ctx.enemy === g.c(u).on && (ctx.damaged || []).some(x => x !== g.idt() && g.c(x).zone !== 'ally')) await secret(g, fewest(g), 1); } }, // Baron Zemo's Sword
    actions: [{ timing: 'hero', label: '[물리]×3 또는 [에너지]×3 → 비밀 카운터 1 제거, 검 버림', can: (g, u) => g.c(u).zone === 'attach' && (g.canAfford({ n: 3, req: 'RRR' }, null) || g.canAfford({ n: 3, req: 'YYY' }, null)), async use(g, u) { const r = g.canAfford({ n: 3, req: 'RRR' }, null) ? 'RRR' : 'YYY'; if ((await g.pay({ n: 3, req: r }, null, '제모의 검', true)) == null) return; await removeSecrets(g, 1); g.discard(u, '바론 제모의 검 버림'); } }] };
  S['50171'] = { removeOnLeave: true, async whenRevealed(g, u, ctx) { // Reluctant Foe: a hero from your collection joins Zemo as an Elite minion
    const nt = x => String(x || '').replace(/^\*\s*/, '').trim().toLowerCase(), titles = new Set();
    for (const x of g.allFriendlyChars().concat(g.enemies())) titles.add(nt(g.d(x).en));
    const activeKeys = new Set(g.livingPlayers().map(pi => g.s.ps[pi].heroKey)), ownN = new Set();
    for (const ak of activeKeys) { const h = MC.heroes[ak]; if (h) [h.hero, h.alter].forEach(id => MC.cards[id] && ownN.add(nt(MC.cards[id].en))); }
    const cands = Object.keys(MC.heroes).filter(k => { const f = MC.heroes[k].foe; return f && !activeKeys.has(k) && !titles.has(nt(f.en)) && !(f.sub && titles.has(nt(f.sub))) && !ownN.has(nt(f.en)); })
      .sort((a, b) => MC.heroes[a].name.localeCompare(MC.heroes[b].name, 'ko'));
    if (!cands.length) { ctx.surge++; return; }
    const k = await g.ask({ type: 'choice', title: '마지못한 적: 내 컬렉션에서 빌런 편에 설 히어로를 고르세요', options: cands.map(k => { const f = MC.heroes[k].foe; return { id: k, label: `${MC.heroes[k].name} (체력 ${f.hp} · 공격 ${f.atk} · 음모 ${f.thw})` }; }) });
    const m = g.newCard('RF_' + (k || cands[0]), 'limbo'); await g.enterMinion(m, {}, true); g.attachEnc(u, m); g.log(`마지못한 적: ${g.nm(m)}이(가) 간부 하수인으로 당신과 교전합니다`, 'warn'); } };
  S['50172'] = { on: { async enemyActivated(g, u, ctx) { if (ctx.enemy === u) await secret(g, fewest(g), 1); } }, async whenDefeated(g) { await secret(g, fewest(g), 1); } }; // S.H.I.E.L.D. Agent
  S['50173'] = { allyTax: true, async whenDefeated(g) { await removeSecrets(g, g.players); } }; // Divided Loyalties: 1 resource to attack, thwart or defend with an ally
  S['50174'] = { supportReadyTax: true, async whenDefeated(g) { await removeSecrets(g, g.players); } }; // Undermine Support: 1 resource to ready a support
  S['50175'] = { async whenRevealed(g) { const z = zemo(g) || g.e.villain; if (!z) return; const before = g.c(g.e.main).threat; await g.enemyScheme(z, {}); const placed = g.c(g.e.main).threat - before; // Battle of Wits
    if (placed > 0) { let k = 0; for (let x = placed; x >= 1; x--) if (g.canAfford({ n: x, req: 'B'.repeat(x) }, null)) { k = x; break; } if (k && await yes(g, `[정신] ${k}개로 위협 ${k}을 막고 비밀 카운터 ${k}개를 제거할까요?`) && (await g.pay({ n: k, req: 'B'.repeat(k) }, null, '두뇌 싸움', true)) != null) { g.c(g.e.main).threat -= k; await removeSecrets(g, k); } } } };
  S['50176'] = { async whenRevealed(g) { const z = zemo(g) || g.e.villain; if (!g.isHero()) { await secret(g, fewest(g), 2); return; } if (!z) return; const r = await g.enemyAttack(z, {}); if (!r || !(r.damaged || []).length) await removeSecrets(g, 3); } }; // Might Makes Right
  S['50177'] = { async whenRevealed(g) { const c = g.p.allies.concat(g.p.supports); const o = await g.ask({ type: 'choice', title: '목적이 수단을 정당화한다', options: [{ id: 'z', label: '제모가 가장 약한 하수인을 물리치고 음모' }].concat(c.length ? [{ id: 'd', label: '동료/지원 1장 버림 → 그 비용만큼 비밀 카운터 제거' }] : []) }); // The Ends Justify the Means
    if (o === 'd') { const t = await pick(g, c, '버릴 카드'); if (t) { const n = g.d(t).cost || 0; g.discard(t, `${g.nm(t)} 버림`); await removeSecrets(g, n); } return; }
    if (g.e.minions.length) { const lo = Math.min(...g.e.minions.map(m => g.hpLeft(m))); const m = g.e.minions.find(x => g.hpLeft(x) === lo); await g.defeat(m, {}); } const z = zemo(g) || g.e.villain; if (z) await g.enemyScheme(z, {}); } };
  // S.H.I.E.L.D. (modular)
  S['50178'] = { async whenDefeated(g, u) { await g.withPlayer(g.c(u).eng != null ? g.c(u).eng : g.s.ctx, async () => { const c = g.p.allies.concat(g.p.supports).filter(x => tr(g, x, 'S.H.I.E.L.D')); const t = await pick(g, c, '실드 기동대: 버릴 [실드] 동료/지원'); if (t) g.discard(t, `${g.nm(t)} 버림`); else await g.placeThreat(g.e.main, 2, {}); }); } }; // S.H.I.E.L.D. Trooper
  S['50179'] = { whenRevealed(g, u) { g.put(u, 'pobl'); }, // Arrest Warrant (its acceleration icon counts while it stays)
    actions: [{ timing: 'alter', label: '정체성 또는 [실드] 카드 소진 → [실드] 하수인을 찾아 공개, 이 카드 버림', can: (g, u) => g.c(u).zone === 'pobl' && (!g.c(g.idt()).ex || g.controlled().some(x => !g.c(x).ex && tr(g, x, 'S.H.I.E.L.D'))), async use(g, u) {
      const c = [g.idt()].filter(x => !g.c(x).ex).concat(g.controlled().filter(x => !g.c(x).ex && tr(g, x, 'S.H.I.E.L.D'))); const t = await pick(g, c, '소진할 카드'); if (!t) return; g.c(t).ex = true; g.discard(u); const m = g.e.deck.concat(g.e.discard).find(x => g.d(x).type === 'minion' && tr(g, x, 'S.H.I.E.L.D')); g.shuffle(g.e.deck); if (m) await g.reveal(m); } }] };
  S['50180'] = { costMod: (g, s, uid) => g.c(s).zone === 'side' && tr(g, uid, 'S.H.I.E.L.D') ? -1 : 0, whenRevealed(g, u) { const n = g.inPlay().filter(x => tr(g, x, 'S.H.I.E.L.D')).length; if (n) g.c(u).threat += n; } }; // Disavowed
  const interference = req => ({ async whenRevealed(g) { let n = boardAll(g).length; let k = 0; for (let x = n; x >= 1; x--) if (g.canAfford({ n: x, req: req.repeat(x) }, null)) { k = x; break; } // A.I.M. Interference
    let skip = 0; if (k && await yes(g, `${{ Y: '[에너지]', B: '[정신]', R: '[물리]' }[req]} ${k}개까지 써서 비밀 카운터를 막을까요?`)) { const m = +(await g.ask({ type: 'choice', title: '막을 카운터 수', options: Array.from({ length: k }, (_, i) => k - i).map(x => ({ id: String(x), label: `${x}` })) })) || k; if ((await g.pay({ n: m, req: req.repeat(m) }, null, 'A.I.M. 방해', true)) != null) skip = m; }
    for (const b of boardAll(g).slice()) { if (skip > 0) { skip--; continue; } await secret(g, b, 1); } }, async boostEffect(g, u) { await (MC.scripts[idOf(g, u)] || {}).whenRevealed(g, u, { surge: 0 }); } });
  S['50184a'] = interference('Y'); S['50184b'] = interference('B'); S['50184c'] = interference('R');
  // Evidence: when gained, each player may trade a secret counter for a card from the collection, and a threat for a card from the deck
  const evidence = (cls, type) => ({ async evidenceSetup(g) { const typeKo = { ally: '동료', upgrade: '업그레이드', support: '지원' }[type];
    await g.forEachPlayer(async () => {
      if (boardEnv(g).length && await yes(g, `[이사회] 환경(${g.playerName()})에 비밀 카운터 1을 놓고 컬렉션에서 ${MC.ASPECTS[cls] ? MC.ASPECTS[cls].ko : cls} ${typeKo} 1장을 덱에 섞을까요?`)) { const pool = Object.values(MC.cards).filter(c => !c.enc && c.cls === cls && c.type === type && !c.linked); const t = pool.length ? await g.ask({ type: 'choice', title: '컬렉션에서 덱에 섞을 카드', options: pool.slice(0, 40).map(c => ({ id: c.id, label: c.name })) }) : null; if (t) { await secret(g, await pick(g, boardEnv(g), '비밀 카운터를 놓을 환경'), 1); g.newCard(t, 'deck'); g.shuffle(g.p.deck); } }
      if (await yes(g, `주 음모(${g.playerName()})에 위협 1을 놓고 덱에서 ${MC.ASPECTS[cls] ? MC.ASPECTS[cls].ko : cls} ${typeKo} 1장을 손으로 가져올까요?`)) { await g.placeThreat(g.e.main, 1, {}); await g.searchToHand(d => d.cls === cls && d.type === type, '증거'); }
    }); } });
  S['50185'] = evidence('Protection', 'ally'); S['50186'] = evidence('Justice', 'ally'); S['50187'] = evidence('Aggression', 'ally');
  S['50188'] = evidence('Protection', 'upgrade'); S['50189'] = evidence('Justice', 'upgrade'); S['50190'] = evidence('Aggression', 'upgrade');
  S['50191'] = evidence('Protection', 'support'); S['50192'] = evidence('Justice', 'support'); S['50193'] = evidence('Aggression', 'support');

  // ======================= Campaign: Agents of S.H.I.E.L.D. (cards/pack/aos/campaign.py) =======================
  const EVID = MEANS.concat(MOTIVE, OPP), ADAPT_ENV = ['50109', '50110', '50111', '50112'];
  const TB_SETS = { '50139': 'gravitational_pull', '50143': 'hard_sound', '50148': 'pale_little_spider', '50152': 'power_of_the_atom', '50156': 'supersonic', '50161': 'the_leaper' };
  const seeded = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  function prepareEnvelopes(g) { // PrepareEvidenceEnvelopes: the Evidence Seed keeps the same A.I.M. envelope for the whole campaign
    let seed = parseInt(g.clog('Evidence Seed'), 10); if (!Number.isFinite(seed)) { seed = Math.floor(g.rand() * 1e9); g.clogSet('Evidence Seed', seed); }
    const r = seeded(seed), aimIds = [MEANS, MOTIVE, OPP].map(l => l[Math.floor(r() * l.length)]);
    const earned = g.clogList('Evidence Earned').filter(id => EVID.includes(id) && !aimIds.includes(id)), cards = {};
    for (const id of EVID) { const u = g.e.deck.concat(g.e.discard, g.e.aside || []).find(x => idOf(g, x) === id) || g.newCard(id, 'aside'); g.resetCard(u); g.put(u, 'aside'); g.c(u).fd = true; cards[id] = u; }
    g.e.aimEnv = aimIds.map(id => cards[id]); g.e.shieldEnv = EVID.filter(id => !aimIds.includes(id) && !earned.includes(id)).map(id => cards[id]); g.shuffle(g.e.shieldEnv);
    g.e.earned = earned.slice(); for (const id of earned) { g.c(cards[id]).fd = false; g.put(cards[id], 'removed'); } // gained evidence is campaign information
    g.log(`캠페인: 증거 봉투 준비 (A.I.M. 3장, S.H.I.E.L.D. ${g.e.shieldEnv.length}장${earned.length ? `, 확보한 증거 ${earned.map(evName).join(', ')}` : ''})`);
  }
  function prepareBoard(g, lv) { // PrepareExecutiveBoard
    for (const [k, name] of MEMBERS) {
      let u = (g.e.env || []).concat(g.e.deck, g.e.discard, g.e.aside || []).find(x => idOf(g, x).slice(0, 5) === k);
      if (!u) u = g.newCard(k + 'a', 'limbo');
      const n = lv === 1 ? 2 : g.clogInt(`Scenario ${lv - 1} ${name} Secret Counters`);
      g.resetCard(u); g.c(u).id = k + 'a';
      if (g.clog(`${name} Flipped`) === 'Yes' && g.e.villain) { g.c(u).id = k + 'b'; g.attachEnc(u, g.e.villain); } else g.put(u, 'env');
      g.c(u).cnt.secret = n; g.log(`캠페인: ${g.nm(u)} (비밀 카운터 ${n})`);
    }
    if (boardAtt(g).length >= 3) g.lose('이사회 3명이 모두 넘어갔습니다');
    for (const id of ['50184a', '50184b', '50184c']) if (!g.e.deck.some(x => idOf(g, x) === id)) g.newCard(id, 'edeck');
    g.shuffle(g.e.deck);
  }
  MC.CAMPAIGNS[AOSC] = {
    async setup(g, spec) {
      const lv = spec.level || 1; g.e.aosLevel = lv;
      prepareEnvelopes(g); prepareBoard(g, lv);
      for (const id of g.e.earned) { const f = (MC.scripts[id] || {}).evidenceSetup; if (f) { g.log(`캠페인: 확보한 증거 「${evName(id)}」 사전 준비`); await f(g); } } // ResolveEarnedEvidenceSetup
      if (lv === 2) { const n = g.clogInt('Scenario 1 Minions and side schemes in play'); if (n && alert(g)) await alertThreat(g, n); }
      else if (lv === 3) { const c = cell(g); if (c) { const k = g.c(c); k.cnt.lock = (k.cnt.lock || 0) + 3 * g.players - g.clogInt('Scenario 2 Rescued Captives'); g.log(`캠페인: 감옥 칸 잠금 ${k.cnt.lock}`); if (k.cnt.lock <= 0) { k.cnt.lock = 1; await unlock(g, c, 1); } } }
      else if (lv === 5) {
        for (const id of g.clogList('Scenario 3 Adaptoid environments').filter(x => ADAPT_ENV.includes(x))) { const e = g.newCard(id, 'limbo'); await g.enterEnv(e); g.log(`캠페인: ${g.nm(e)} 환경`); }
        for (let i = 0; i < 4; i++) g.newCard('50113', 'edeck');
        const sets = [...new Set(g.clogList('Scenario 4 Surviving Thunderbolts').map(id => TB_SETS[id]).filter(Boolean))];
        for (const k of sets) { for (const id of ((MC.modulars[k] || {}).cards || [])) g.newCard(id, 'edeck'); g.log(`캠페인: 살아남은 썬더볼트 — ${(MC.modulars[k] || {}).name || k} 세트를 조우 덱에 섞습니다`); }
        g.shuffle(g.e.deck);
      }
      if (lv < 2) return;
      await g.forEachPlayer(async () => {
        const hp = g.clogPInt('Remaining hit points'); if (hp) g.setIdentityHP(hp);
        if (g.s.scen.expert && g.c(g.idt()).dmg > 0 && boardEnv(g).length) { const rec = (MC.cards[g.p.alterId] || {}).rec || 0; // ExpertCampaignEachPlayerMayHealAtSecretCost
          if (await yes(g, `숙련 캠페인(${g.playerName()}): [이사회] 환경에 비밀 카운터 1을 놓고 피해 ${rec}을 회복할까요?`)) { await secret(g, await pick(g, boardEnv(g), '비밀 카운터를 놓을 [이사회] 환경'), 1); g.heal(g.idt(), rec); } }
      });
    },
    onWin(g) { // ResolveCampaignVictory (+ this scenario's campaign log entries)
      const lv = g.e.aosLevel || 1;
      if (lv <= 4) for (const [k, name] of MEMBERS) { const u = boardAll(g).find(x => idOf(g, x).slice(0, 5) === k); if (u) { g.clogSet(`Scenario ${lv} ${name} Secret Counters`, g.c(u).cnt.secret || 0); if (/b$/.test(idOf(g, u))) g.clogSet(`${name} Flipped`, 'Yes'); } }
      if (lv === 1) g.clogSet('Scenario 1 Minions and side schemes in play', g.e.minions.length + g.e.sides.length);
      else if (lv === 2) g.clogSet('Scenario 2 Rescued Captives', captives(g).length);
      else if (lv === 3) g.clogSet('Scenario 3 Adaptoid environments', (g.e.env || []).map(x => idOf(g, x)).filter(id => ADAPT_ENV.includes(id)).join(';'));
      else if (lv === 4) g.clogSet('Scenario 4 Surviving Thunderbolts', Object.keys(TB_SETS).filter(id => Object.values(g.s.cards).some(c => c.id === id && c.zone && !['victory', 'removed'].includes(c.zone))).join(';'));
      if (boardEnv(g).some(x => !(g.c(x).cnt.secret || 0)) && (g.e.shieldEnv || []).length) { // an unflipped member fully investigated: one random S.H.I.E.L.D. evidence
        const x = g.e.shieldEnv[Math.floor(g.rand() * g.e.shieldEnv.length)], id = idOf(g, x), l = g.clogList('Evidence Earned');
        if (!l.includes(id)) { l.push(id); g.clogSet('Evidence Earned', l.join(';')); } g.log(`캠페인 보상: 증거 「${g.nm(x)}」 확보`, 'good');
      }
    }
  };
  [['50067a', 1], ['50087a', 2], ['50104a', 3], ['50130a', 4], ['50167a', 5]].forEach(([id, lv]) => { S[id] = Object.assign(S[id] || {}, { campaign: { level: lv } }); });

  MC.registerScripts(S);
})();
