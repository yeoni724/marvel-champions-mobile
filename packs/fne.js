/* Hell's Kitchen (fne, 60001-60210): Daredevil and his Sense deck, Echo, the UNDERLING villains, the five missions,
   Kingpin and the modular sets. Ported from cards/pack/fne of the community build. The Fear No Evil campaign is in 5_campaign.js. */
(function () {
  'use strict';
  const S = {};
  const idOf = (g, u) => g.c(u).id;
  const tr = (g, u, t) => (g.d(u).tr || []).includes(t) || g.hasTrait(u, t);
  const pick = async (g, cands, title) => !cands.length ? null : cands.length === 1 ? cands[0] : await g.ask({ type: 'target', title, cands, cancelable: false });
  const yes = async (g, title) => (await g.ask({ type: 'choice', title, options: [{ id: 'y', label: '예' }, { id: 'n', label: '아니요' }] })) === 'y';
  async function thw(g, t, n, src) { const r = await g.removeThreat(t, n, { src }); g.log(`${g.nm(t)} 위협 ${r} 제거`); await g.afterThreatRemoved(t); return r; }
  const pk = g => g.s.round + ':' + g.s.phase;
  const V = g => g.e.villain;
  const chars = g => [g.idt()].concat(g.p.allies);
  const enc = g => g.e.deck.concat(g.e.discard);
  const burn = async (g, n) => { const out = []; for (let i = 0; i < n; i++) { if (!g.p.deck.length) await g.reshuffleDeck(); const x = g.p.deck[0]; if (!x) break; g.put(x, 'discard'); out.push(x); } return out; };
  async function untilType(g, pred) { for (let i = 0; i < 200; i++) { const x = g.takeEncounter(); if (!x) return null; g.put(x, 'ediscard'); if (pred(g.d(x), x)) return x; } return null; }
  const FNE = MC.fne = MC.fne || {};
  // ======================= Daredevil and the Sense deck =======================
  const isDD = g => ['60001a', '60001b'].includes(idOf(g, g.idt()));
  const isSense = (g, x) => (g.d(x).tr || []).includes('SENSE');
  const senseDeck = g => (g.p.senseDeck = g.p.senseDeck || []);
  const senseTargets = (g, x) => { const k = { '60002': 'es', '60003': 'es', '60004': 'e', '60005': 'e', '60006': 's' }[idOf(g, x)] || 'es';
    return g.enemies().filter(() => k.includes('e')).concat(k.includes('s') ? g.schemes() : []).filter(t => g.c(t).zone); };
  async function playSense(g, x, free) { // play a Sense upgrade from the Sense deck (paying its cost unless free)
    const ts = senseTargets(g, x); if (!ts.length) { g.log('붙일 대상이 없습니다'); return false; }
    const d = senseDeck(g); d.splice(d.indexOf(x), 1); g.put(x, 'hand'); if (free) g.c(x).tmpDiscount = { key: pk(g), n: 99 };
    if (g.canPlay(x)) await g.playCard(x);
    if (g.c(x).zone === 'hand') { g.put(x, 'pset'); d.unshift(x); g.log(`${g.nm(x)}: 플레이하지 않아 감각 덱 맨 위로`); return false; }
    return true;
  }
  const senseUp = (kindAttach, extra) => Object.assign({ attach: { kind: 'encCard', filter: (g, t) => (kindAttach.includes('e') && ['villain', 'minion'].includes(g.c(t).zone)) || (kindAttach.includes('s') && ['main', 'side'].includes(g.c(t).zone)) },
    discardTo: g => isDD(g) ? 'pset' : null, afterDiscardTo(g, u) { const d = senseDeck(g); if (!d.includes(u)) d.push(u); g.log(`${g.nm(u)}: 감각 덱 맨 아래로`); },
    onPlay(g, u) { if (g.c(u).zone === 'attach') for (const x of (g.p.obl || []).slice()) { const f = g.sc(x).senseEntered; if (f) f(g, x, u); } } }, extra || {});
  const senseDone = (fn, label) => ({ on: { async attachedDefeated(g, a, ctx) { if (ctx && (ctx.byPlayer || ctx.scheme)) { g.discard(a, `${g.nm(a)}: ${label}`); await fn(g); } },
    async attachedVillainDefeated(g, a, ctx) { if (ctx.byPlayer) { g.discard(a, `${g.nm(a)}: ${label}`); await fn(g); } } } });
  S['60001b'] = { setup(g) { const d = senseDeck(g); for (const x of (g.p.pset || [])) if (isSense(g, x) && !d.includes(x)) d.push(x); g.shuffle(d); g.log(`감각 덱 ${d.length}장`); } };
  S['60001a'] = { actions: [{ timing: 'hero', label: '초인적 감각: 감각 덱 맨 위 카드 플레이', can: g => senseDeck(g).length > 0 && senseTargets(g, senseDeck(g)[0]).length > 0, async use(g) { await playSense(g, senseDeck(g)[0], false); } }] };
  S['60002'] = senseUp('es', senseDone(g => { if (g.canReady(g.idt())) g.c(g.idt()).ex = false; }, '정체성 준비')); // Acute Tactility
  S['60003'] = senseUp('es', senseDone(g => { g.p.costRed = (g.p.costRed || 0) + 2; g.log('다음 카드 비용 -2'); }, '다음 카드 비용 -2')); // Enhanced Olfaction
  S['60004'] = senseUp('e', { on: { enemyAttacks(g, a, ctx) { if (ctx.enemy !== g.c(a).on || !g.isHero()) return; ctx.atkBonus = (ctx.atkBonus || 0) - 3; ctx.forceHeroDefend = false; g.discard(a, '향상된 청각: 이번 공격 -3'); } } }); // Heightened Hearing
  S['60005'] = senseUp('e', { on: { async afterAttack(g, a, ctx) { if (ctx.attacker !== g.idt() || ctx.target !== g.c(a).on || !g.c(ctx.target).zone) return; const t = ctx.target; g.discard(a, '레이더 감각'); await g.dealDamage(t, 3, { src: g.idt(), byPlayer: true }); } } }); // Radar Sense
  S['60006'] = senseUp('s', { respond: [{ window: 'afterHeroThwart', timing: 'hero', label: '뛰어난 미각: 위협 2 추가 제거', can: (g, u, ctx) => g.c(u).zone === 'attach' && ctx.scheme === g.c(u).on && g.c(ctx.scheme).zone, async resolve(g, u, ctx) { const t = g.c(u).on; g.discard(u, '뛰어난 미각'); await thw(g, t, 2, g.idt()); } }] }); // Superior Taste
  S['60007'] = { async damageInstead(g, t, n, o) { if (!o || !o.consequential || !g.isHero() || !isDD(g)) return false; g.log(`★ 엘렉트라: 후속 피해 ${n}을(를) 데어데블이 대신 받습니다`); await g.dealDamage(g.idt(), n, {}); return true; } }; // Elektra
  const upgradesOn = (g, t) => g.c(t).att.filter(a => !g.d(a).enc && g.d(a).type === 'upgrade').length;
  S['60008'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { await g.playerAttack(g.idt(), ctx.target, 3 + upgradesOn(g, ctx.target), { src: u }); } } }; // Cross-Examination
  S['60009'] = { play: { timing: 'alter', label: 'thwart', async resolve(g, u) { const d = senseDeck(g).filter(x => senseTargets(g, x).length); if (d.length && await yes(g, '감각 덱의 업그레이드를 무료로 플레이할까요?')) { const x = await pick(g, d, '플레이할 감각 업그레이드'); if (x) await playSense(g, x, true); } // Deposition
    const t = await g.chooseTarget('thwartable', '위협 2를 제거할 음모', u, false); if (t) await thw(g, t, 2, u); } } };
  S['60010'] = { play: { label: 'thwart', target: 'thwartable', async resolve(g, u, ctx) { await thw(g, ctx.target, 2 + upgradesOn(g, ctx.target), u); } } }; // Living Lie Detector
  S['60011'] = { play: { timing: 'hero', label: 'attack', async resolve(g, u) { const per = g.hasTrait(g.idt(), 'AERIAL') ? 3 : 2; for (const t of g.enemies().slice()) { const n = upgradesOn(g, t); if (n && g.c(t).zone) await g.playerAttack(g.idt(), t, per * n, { src: u }); } } } }; // Raising Hell
  S['60012'] = { removeOnlyBy: (g, s, src) => src === g.idt() && isDD(g), // Focus the Senses
    async whenDefeated(g) { const d = senseDeck(g).slice(); for (const x of d) { if (!senseDeck(g).includes(x) || !senseTargets(g, x).length) continue; if (await yes(g, `감각의 집중: ${g.nm(x)}을(를) 무료로 플레이할까요?`)) await playSense(g, x, true); } } };
  S['60013'] = { actions: [{ timing: 'alter', exhaust: true, label: '포기 넬슨: 위협 2 제거', async use(g, u) { await g.removeThreatChoose(2, '포기 넬슨', u); } }] }; // Foggy Nelson
  S['60014'] = { actions: [{ exhaust: true, label: '캐런 페이지: 데어데블 카드 1장 덱에 섞기', async use(g) { const x = await pick(g, g.p.discard.filter(y => g.d(y).cls === 'Hero'), '덱에 섞을 카드'); if (x) { g.put(x, 'deck'); g.shuffle(g.p.deck); } if (!g.isHero()) await g.draw(1); } }] }; // Karen Page
  S['60015'] = { respond: [{ window: 'sideSchemeDefeated', label: '넬슨 앤 머독: 적 혼란', can: (g, u, ctx) => !!ctx.src && g.c(ctx.src) && tr(g, ctx.src, 'ATTORNEY') && g.enemies().length > 0, async resolve(g) { const t = await pick(g, g.enemies(), '혼란시킬 적'); if (t) g.giveStatus(t, 'conf', '넬슨 앤 머독'); } }] }; // Nelson and Murdock
  S['60016'] = { mod: { rec: (g, s, t) => t === g.idt() && isDD(g) ? 3 : 0 }, on: { afterRecover(g) { const c = g.c(g.idt()); if (c.stun) c.stun = false; else if (c.conf) c.conf = false; else return; g.log('시스터 매기: 상태 카드 1장 제거', 'good'); } } }; // Sister Maggie
  S['60017'] = { mod: { atk: (g, s, t) => t === g.idt() && g.isHero() && isDD(g) ? 1 : 0 }, actions: [{ timing: 'hero', label: '빌리 클럽을 손으로: 적에게 피해 1 또는 [공중] 특성', async use(g, u) { // Daredevil's Billy Club
    g.put(u, 'hand'); const o = await g.ask({ type: 'choice', title: '데어데블의 빌리 클럽', options: [{ id: 'd', label: '적에게 피해 1' }, { id: 'a', label: '이번 라운드 [공중] 특성' }] });
    if (o === 'd') { const t = await g.chooseTarget('enemy', '피해 1', g.idt(), false); if (t) await g.dealDamage(t, 1, { src: g.idt(), byPlayer: true }); } else { g.addRoundMod(g.idt(), 'tr:AERIAL', 1); g.log('데어데블: 이번 라운드 [공중]'); } } }] };
  S['60018'] = { actions: [{ timing: 'hero', exhaust: true, label: '두려움을 모르는 남자: 피해 1 → 감각 업그레이드 무료 플레이 또는 준비', async use(g) { await g.dealDamage(g.idt(), 1, {}); // The Man Without Fear
    const d = senseDeck(g).filter(x => senseTargets(g, x).length); const o = d.length ? await g.ask({ type: 'choice', title: '두려움을 모르는 남자', options: [{ id: 's', label: '감각 업그레이드 무료 플레이' }, { id: 'r', label: '데어데블 준비' }] }) : 'r';
    if (o === 's') { const x = await pick(g, d, '플레이할 감각 업그레이드'); if (x) await playSense(g, x, true); } else if (g.canReady(g.idt())) g.c(g.idt()).ex = false; } }] };
  S['60032'] = { whenRevealed(g, u) { g.put(u, 'pobl'); g.log('감각 과부하: 감각 업그레이드가 들어올 때마다 피해 1', 'warn'); }, async senseEntered(g, u) { if (g.c(u).zone === 'pobl') await g.dealDamage(g.idt(), 1, {}); }, // Sensory Overload
    on: { afterRecover(g, u) { if (g.c(u).zone === 'pobl') g.discard(u, '감각 과부하 버림'); } } };
  // Daredevil nemesis
  const bullseyeMin = g => g.e.minions.find(m => idOf(g, m) === '60033') || null;
  const personas = g => g.p.supports.filter(x => tr(g, x, 'PERSONA'));
  async function bullseyeAttacks(g) { let b = bullseyeMin(g); if (!b) { const x = enc(g).concat(g.e.setaside).find(y => idOf(g, y) === '60033'); if (x) { await g.reveal(x); b = bullseyeMin(g); } } if (b && g.c(b).zone === 'minion') await g.enemyAttack(b, { forceAlter: true }); }
  S['60033'] = { async whenRevealed(g, u) { const ps = personas(g); const o = ps.length ? await g.ask({ type: 'choice', title: '불스아이', options: [{ id: 'p', label: '[퍼소나] 지원 1장 버림' }, { id: 'a', label: '불스아이가 당신을 공격 (일상 모습이어도)' }] }) : 'a';
    if (o === 'p') { const x = await pick(g, ps, '버릴 지원'); g.discard(x); } else await g.enemyAttack(u, {}); } };
  S['60034'] = { on: { enemyAttackStart(g, s, ctx) { if (g.c(s).zone === 'side' && idOf(g, ctx.enemy) === '60033') { g.giveFacedownBoostTo(ctx.enemy, 1); g.log('가장 치명적인 남자: 불스아이에게 뒷면 강화 카드'); } } } }; // Deadliest Man Alive
  S['60035'] = { attachTo: g => g.enemies().slice().sort((a, b) => g.stat(b, 'atk') - g.stat(a, 'atk'))[0] || null, attackProps(g, x, ctx) { return g.c(x).zone === 'attach' && ctx.enemy === g.c(x).on ? { piercing: true } : {}; }, // Stolen Sai
    actions: [{ timing: 'hero', label: '[물리][물리] → 훔친 사이: 엘렉트라에게 붙이거나 버림', cost: { n: 2, req: 'RR' }, can: (g, u) => g.c(u).zone === 'attach' && g.enemies().includes(g.c(u).on), use(g, u) { const el = g.p.allies.find(a => idOf(g, a) === '60007'); if (el) { g.put(u, 'attach', el); g.log('훔친 사이: 엘렉트라에게'); } else g.discard(u); } }],
    boostEffect(g, u, ctx) { if ('undefended' in ctx) ctx.piercing = true; } };
  S['60036'] = { async whenRevealed(g) { const xs = g.p.allies.concat(personas(g)); const o = xs.length ? await g.ask({ type: 'choice', title: '표적 조준', options: [{ id: 'r', label: '동료 또는 [퍼소나] 지원 1장을 게임에서 제거' }, { id: 'a', label: '불스아이가 당신을 공격' }] }) : 'a'; // Eye on the Target
    if (o === 'r') { const x = await pick(g, xs, '게임에서 제거할 카드'); g.removeFromGame(x); } else await bullseyeAttacks(g); } };
  // ======================= Echo =======================
  const isEcho = g => ['60037a', '60037b'].includes(idOf(g, g.idt()));
  const tuckedE = g => g.c(g.idt()).under.filter(x => !g.d(x).enc);
  const aspectEvent = (g, x) => g.d(x).type === 'event' && g.d(x).cls && g.d(x).cls !== 'Hero';
  S['60037a'] = { respond: [{ window: 'cardPlayedDone', label: '보고 배우기: 그 이벤트를 에코 아래에', can: (g, u, ctx) => ctx.card && aspectEvent(g, ctx.card) && g.c(ctx.card).zone === 'discard' && !g.c(ctx.card).noTuck, // Watch and Learn
    resolve(g, u, ctx) { g.put(ctx.card, 'under', g.idt()); g.log(`보고 배우기: ${g.nm(ctx.card)}을(를) 에코 아래에`); const t = tuckedE(g); while (t.length > 3) { const x = t.shift(); g.put(x, 'discard'); } } }] };
  S['60037b'] = { on: { async formChanged(g, u, ctx) { if (ctx.form === 'hero' && isEcho(g)) await g.searchToHand(d => d.type === 'event' && d.cls && d.cls !== 'Hero', '연습이 완벽을 만든다: 성향/기본 이벤트'); } } }; // Practice Makes Perfect
  S['60038'] = { mod: { def: (g, s, t) => t === g.idt() && g.isHero() ? 1 : 0 } }; // Innate Reflexes
  S['60039'] = { on: { allyBasicPower(g, u, ctx) { if (ctx.ally === u) { g.p.usedOnce.ddEv = (g.p.usedOnce.ddEv || 0) + 1; g.log('★ 데어데블: 이번 라운드 다음 이벤트 비용 -1'); } } }, // Daredevil (ally)
    costMod: (g, s, uid) => g.d(uid).type === 'event' ? (g.p.usedOnce.ddEv || 0) : 0, costUsed(g, s, uid) { if (g.d(uid).type === 'event') g.p.usedOnce.ddEv = 0; } };
  const photo = { handActions: [{ label: '사진 같은 반사신경: 버리고 에코 아래 이벤트 플레이 (비용 -2)', can: g => g.isHero() && tuckedE(g).some(x => g.d(x).type === 'event'), async use(g, u) { // Photographic Reflexes
    const x = await pick(g, tuckedE(g).filter(y => g.d(y).type === 'event'), '플레이할 이벤트'); if (!x) return; g.put(u, 'discard'); g.put(x, 'hand'); g.c(x).tmpDiscount = { key: pk(g), n: 2 }; g.c(x).noTuck = true;
    if (g.canPlay(x)) await g.playCard(x); if (g.c(x).zone === 'hand') { g.put(x, 'under', g.idt()); g.log(`${g.nm(x)}: 플레이하지 못해 다시 에코 아래로`); } delete g.c(x).noTuck; } }] };
  S['60040a'] = S['60040b'] = S['60040c'] = photo;
  S['60041'] = { play: { async resolve(g) { const xs = g.p.discard.filter(x => aspectEvent(g, x) || /^60040/.test(idOf(g, x))); const x = await pick(g, xs, '손으로 가져올 이벤트'); if (x) g.put(x, 'hand'); } } }; // Study the Tape
  S['60042'] = { actions: [{ timing: 'alter', exhaust: true, label: '레즈: 아래 카드 최고 비용만큼 회복', can: g => tuckedE(g).length > 0, use(g) { g.heal(g.idt(), Math.max(0, ...tuckedE(g).map(x => g.d(x).cost || 0))); } }] }; // The Rez
  S['60043'] = { resources: [{ gen: 'G', label: '미국 수어 (이벤트용)', forOnly: (g, u, f) => g.d(f).type === 'event', can: (g, u) => !g.c(u).ex && g.isHero(), use: (g, u) => { g.c(u).ex = true; } }] }; // American Sign Language
  S['60044'] = { actions: [{ exhaust: true, label: '안무: 이벤트를 덱에 섞기', can: g => g.p.discard.some(x => aspectEvent(g, x)), async use(g) { const x = await pick(g, g.p.discard.filter(y => aspectEvent(g, y)), '덱에 섞을 이벤트'); if (x) { g.put(x, 'deck'); g.shuffle(g.p.deck); } if (!g.isHero()) await g.draw(1); } }] }; // Choreography
  S['60045'] = { respond: [{ window: 'cardPlayedDone', timing: 'hero', exhaust: true, label: '에코의 카타나: 이벤트 비용만큼 피해 (관통)', can: (g, u, ctx) => ctx.card && g.d(ctx.card).type === 'event' && (g.d(ctx.card).cost || 0) > 0, async resolve(g, u, ctx) { const t = await g.chooseTarget('attackable', '피해를 줄 적', g.idt(), false); if (t) await g.playerAttack(g.idt(), t, g.d(ctx.card).cost || 0, { src: u, piercing: true }); } }] }; // Echo's Katana
  S['60046'] = { respond: [{ window: 'cardPlayedDone', timing: 'hero', label: '즉흥: 이벤트 특성에 따른 효과', can: (g, u, ctx) => ctx.card && g.d(ctx.card).type === 'event' && ['ATTACK', 'DEFENSE', 'THWART'].some(t => (g.d(ctx.card).tr || []).includes(t)) && g.c(u).impro !== ctx.card + pk(g), // Improvisation
    async resolve(g, u, ctx) { g.c(u).impro = ctx.card + pk(g); const t = g.d(ctx.card).tr || []; if (t.includes('ATTACK')) g.heal(g.idt(), 1); if (t.includes('DEFENSE')) await g.removeThreatChoose(1, '즉흥', u); if (t.includes('THWART')) { const e = await g.chooseTarget('enemy', '피해 1', g.idt(), false); if (e) await g.dealDamage(e, 1, { src: u, byPlayer: true }); } } }] };
  S['60047'] = { actions: [{ timing: 'hero', exhaust: true, label: '근육 기억: 에코 아래 이벤트를 손으로', can: g => tuckedE(g).length > 0, async use(g) { const x = await pick(g, tuckedE(g), '손으로 가져올 이벤트'); if (x) g.put(x, 'hand'); } }] }; // Muscle Memory
  S['60048'] = { selfCostMod: g => -g.p.allies.length, play: { timing: 'hero', resolve(g) { if (g.canReady(g.idt())) g.c(g.idt()).ex = false; } } }; // Army of One
  S['60049'] = { interrupt: { window: 'enemyAttackInitiated', timing: 'hero', label: 'defense', async resolve(g, u) { await g.removeThreatChoose(3, '주의 끌기', u); } } }; // Get Their Attention
  S['60050'] = { selfCostMod: g => -g.p.allies.length, play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { const x = g.stat(g.idt(), 'def'); await g.playerAttack(g.idt(), ctx.target, x, { src: u }); await g.removeThreatChoose(x, '위험 속으로', u); } } }; // In Harm's Way
  S['60051'] = { interrupt: { window: 'enemyAttackInitiated', timing: 'hero', label: 'defense', async resolve(g, u, ctx) { if (await g.statusBlocks('attack')) return; await g.playerAttack(g.idt(), ctx.enemy, 4, { src: u }); if (!g.c(ctx.enemy).zone) ctx.cancel = true; } } }; // Powerful Punch
  S['60052'] = { useDefFor: true, mod: { def: (g, s, t) => t === g.idt() && g.isHero() ? 1 : 0 } }; // The Best Offense...
  S['60053'] = { mod: { def: (g, s, t) => t === g.idt() && g.isHero() && !g.p.allies.length ? 1 : 0, retaliate: (g, s, t) => t === g.idt() && g.isHero() && !g.p.allies.length ? 1 : 0 } }; // Ronin
  S['60054'] = { respond: [{ window: 'enemyAttackInitiated', timing: 'hero', exhaust: true, label: '홀로 서기: 히어로 준비', can: g => !g.p.allies.length && g.c(g.idt()).ex, resolve(g) { if (g.canReady(g.idt())) g.c(g.idt()).ex = false; } }] }; // Stand Alone
  S['60055'] = { play: { timing: 'hero', label: 'attack', async resolve(g, u) { for (let i = 0; i < 2; i++) { const o = await g.ask({ type: 'choice', title: `아무것도 보지 않고, 듣지 않고 (${i + 1}/2)`, options: [{ id: 'd', label: '적에게 피해 3' }, { id: 't', label: '음모에서 위협 3 제거' }] }); // See No Evil, Hear No Evil
    if (o === 'd') { const t = await g.chooseTarget('attackable', '피해 3', g.idt(), false); if (t) await g.playerAttack(g.idt(), t, 3, { src: u }); } else await g.removeThreatChoose(3, '위협 3 제거', u); } } } };
  S['60056'] = { async whenDefeated(g) { await g.forEachPlayer(async () => { const xs = g.p.deck.concat(g.p.discard).filter(x => g.d(x).type === 'upgrade' && g.d(x).cls === 'Hero' && !g.sc(x).attach); if (xs.length && await yes(g, `초능력 훈련(${g.playerName()}): 정체성 전용 업그레이드를 플레이에 넣을까요?`)) { const x = await pick(g, xs, '플레이에 넣을 정체성 전용 업그레이드'); g.shuffle(g.p.deck); if (x) { g.put(x, 'upgrade'); const f = g.sc(x).onEnter; if (f) await f(g, x, {}); g.log(`초능력 훈련: ${g.nm(x)} 등장`, 'good'); } } else g.shuffle(g.p.deck); }); } }; // Superpower Training
  // Echo nemesis
  const kingpinM = g => g.e.minions.find(m => idOf(g, m) === '60061') || null;
  async function findKingpin(g) { let k = kingpinM(g); if (k) return k; const x = enc(g).concat(g.e.setaside).find(y => idOf(g, y) === '60061'); if (x) { await g.enterMinion(x, {}, true); return x; } return null; }
  S['60060'] = { async whenRevealed(g, u) { g.put(u, 'pobl'); await findKingpin(g); g.log('킹핀에게 길러짐: 킹핀에게 피해를 줄 수 없습니다', 'warn'); }, // Raised by the Kingpin
    shieldsFromDamage: (g, s, t, o) => g.c(s).zone === 'pobl' && g.c(s).pZone === g.s.ctx && idOf(g, t) === '60061' && !!(o && o.byPlayer),
    respond: [{ window: 'afterHeroThwart', label: '킹핀에게 길러짐: 제거한 위협을 이 카드에', can: (g, u, ctx) => g.c(u).zone === 'pobl' && (ctx.removed || 0) > 0, resolve(g, u, ctx) { g.c(u).threat = (g.c(u).threat || 0) + ctx.removed; g.log(`킹핀에게 길러짐: 위협 ${g.c(u).threat}/4`); if (g.c(u).threat >= 4) { g.removeFromGame(u); g.log('킹핀의 영향에서 벗어났습니다', 'good'); } } }] };
  S['60061'] = { insteadOfAttack: (g, u) => isEcho(g) ? g.enemyScheme(u, {}) : false }; // Kingpin (nemesis): he schemes instead of attacking Maya Lopez
  S['60062'] = { shieldsFromDamage: (g, s, t) => g.c(s).zone === 'side' && idOf(g, t) === '60061', async whenRevealed(g) { await findKingpin(g); }, // Master Manipulator
    boostEffect(g, u, ctx) { (ctx.post || ctx.after).push(async gg => { if (kingpinM(gg) && gg.c(u).zone === 'ediscard') await gg.reveal(u); }); } };
  S['60063'] = { shieldsFromDamage: (g, s, t) => g.c(s).zone === 'minion' && idOf(g, t) === '60061' }; // Kingpin's Henchman
  S['60064'] = { async whenRevealedAlter(g, u, ctx) { const k = kingpinM(g); if (k) await g.enemyScheme(k, {}); else ctx.surge++; }, async whenRevealedHero(g) { await g.dealDamage(g.idt(), g.stat(g.idt(), 'atk'), {}); } }; // Pawn of the Kingpin
  // ======================= aspect / basic =======================
  const discountIf = traits => g => g.controlled().concat([g.idt()]).some(x => traits.some(t => tr(g, x, t))) ? 1 : 0;
  S['60019'] = { respond: [{ window: 'afterAllyThwart', label: '★ 블라인드스팟: 업그레이드 붙은 적 혼란', can: (g, u, ctx) => ctx.ally === u && g.enemies().some(e => upgradesOn(g, e) > 0), async resolve(g) { const t = await pick(g, g.enemies().filter(e => upgradesOn(g, e) > 0), '혼란시킬 적'); if (t) g.giveStatus(t, 'conf', '블라인드스팟'); } }] }; // Blindspot
  const daggerIn = g => g.p.allies.some(a => idOf(g, a) === '60021');
  S['60020'] = { icons: (g, u) => ({ accel: daggerIn(g) ? 0 : (g.d(u).accel || 0) }), actions: [{ exhaust: true, label: '클로크: [에너지][에너지] → 대거 등장', cost: { n: 2, req: 'YY' }, can: g => !daggerIn(g) && g.p.deck.concat(g.p.discard, g.p.hand).some(x => idOf(g, x) === '60021'), async use(g) { const x = g.p.deck.concat(g.p.discard, g.p.hand).find(y => idOf(g, y) === '60021'); if (x) { g.shuffle(g.p.deck); await g.putAllyIntoPlay(x); } } }] }; // Cloak
  S['60021'] = { consRedVs: g => g.p.allies.some(a => idOf(g, a) === '60020') }; // Dagger
  S['60022'] = { respond: [{ window: 'allyPowerUsed', label: '★ 고스트 라이더: 자원을 내고 대상 혼란', can: (g, u, ctx) => ctx.ally === u && ctx.kind === 'attack' && g.canAfford({ n: g.d(ctx.target).type === 'villain' ? 2 : 1, req: g.d(ctx.target).type === 'villain' ? 'YY' : 'Y' }, null), // Ghost Rider
    async resolve(g, u, ctx) { const v = g.d(ctx.target).type === 'villain'; if ((await g.pay({ n: v ? 2 : 1, req: v ? 'YY' : 'Y' }, null, '고스트 라이더', true)) != null) g.giveStatus(ctx.target, 'conf', '고스트 라이더'); } }] };
  S['60023'] = { selfCostMod: discountIf(['MARTIAL ARTIST']), play: { timing: 'hero', label: 'thwart', async resolve(g, u) { for (let i = 0; i < 2; i++) await g.removeThreatChoose(1, `적을 알라 (${i + 1}/2)`, u); } } }; // Know Your Enemy
  S['60024'] = { whenDefeated(g) { if (g.e.accelTokens > 0) { g.e.accelTokens--; g.log('긴장 완화: 가속 토큰 1개 제거', 'good'); } } }; // De-escalation
  S['60026'] = { selfCostMod: discountIf(['ATTORNEY', 'POLICE']), attach: { kind: 'minion', filter: (g, t) => !g.c(t).att.some(a => idOf(g, a) === '60026') }, mod: { sch: (g, s, t) => g.c(s).on === t ? -2 : 0 } }; // Legal Trouble
  S['60027'] = { selfCostMod: discountIf(['MARTIAL ARTIST', 'SPY']), async onPlay(g, u) { await g.removeThreatChoose(1, '그림자 속으로', u); }, // Move in Shadow
    respond: [{ window: 'cardPlayedDone', label: '그림자 속으로: 위협 1 제거', can: (g, u, ctx) => ctx.card && ctx.card !== u && g.c(u).zone === 'upgrade', async resolve(g, u) { await g.removeThreatChoose(1, '그림자 속으로', u); } }] };
  S['60028'] = { respond: [{ window: 'sideSchemeDefeated', exhaust: true, label: '은신 훈련: 적 기절', can: (g, u, ctx) => !!ctx.src && ctx.exact && chars(g).concat(g.controlled()).includes(ctx.src) && g.enemies().length > 0, async resolve(g) { const t = await pick(g, g.enemies(), '기절시킬 적'); if (t) g.giveStatus(t, 'stun', '은신 훈련'); } }] }; // Stealth Training
  S['60029'] = { respond: [{ window: 'basicPowerUsed', label: '스틱: 기본 능력 +1 (소진) 또는 -1 (준비)', can: g => tr(g, g.idt(), 'MARTIAL ARTIST'), async resolve(g, u, ctx) { await stick(g, u, ctx); } }, // Stick
    { window: 'allyPowerUsed', label: '스틱: 기본 능력 +1 (소진) 또는 -1 (준비)', can: (g, u, ctx) => tr(g, ctx.ally, 'MARTIAL ARTIST'), async resolve(g, u, ctx) { await stick(g, u, ctx); } }] };
  async function stick(g, u, ctx) { const opts = []; if (!g.c(u).ex) opts.push({ id: 'p', label: '스틱 소진 → +1' }); if (g.c(u).ex) opts.push({ id: 'm', label: '-1 → 스틱 준비' }); if (!opts.length) return; const o = opts.length === 1 ? opts[0].id : await g.ask({ type: 'choice', title: '스틱', options: opts }); if (o === 'p') { g.c(u).ex = true; ctx.bonus = (ctx.bonus || 0) + 1; } else { g.c(u).ex = false; ctx.bonus = (ctx.bonus || 0) - 1; } }
  S['60030'] = { actions: [{ label: '비상 계획: 업그레이드를 아래에 넣기 / 넣어 둔 업그레이드 플레이', can: (g, u) => (g.c(u).under || []).length > 0 || g.p.hand.some(x => g.d(x).type === 'upgrade' && g.sc(x).attach), async use(g, u) { // Contingency Planning
    g.c(u).under = g.c(u).under || []; if (!g.c(u).under.length) { const x = await pick(g, g.p.hand.filter(y => g.d(y).type === 'upgrade' && g.sc(y).attach), '넣어 둘 업그레이드'); if (x) g.put(x, 'under', u); return; }
    const x = g.c(u).under[0]; g.put(x, 'hand'); if (g.canPlay(x)) await g.playCard(x); if (g.c(x).zone === 'hand') g.put(x, 'under', u); } }] };
  S['60031'] = { attach: { kind: 'enemy' }, actions: [{ timing: 'hero', label: '악마와의 춤: 버리고 붙은 적에게 피해 3', can: (g, u) => g.c(u).zone === 'attach', async use(g, u) { const t = g.c(u).on; g.discard(u, '악마와의 춤'); if (g.c(t).zone) await g.playerAttack(g.idt(), t, 3, { src: u }); } }] }; // Dance with the Devil
  S['61028'] = { whenDefeated(g) { const xs = g.p.discard.filter(x => g.d(x).cls === 'Hero'); for (const x of xs) g.put(x, 'deck'); g.shuffle(g.p.deck); g.log(`두 번째 기회: 정체성 전용 카드 ${xs.length}장을 덱에 섞음`, 'good'); } }; // Second Chance
  S['62022'] = { play: { async resolve(g) { const tu = await g.searchToHand(d => !!d.teamUp, '팀업 카드', { discard: true }); if (!tu) return; const names = (g.d(tu).teamUp || []).map(n => String(n).toLowerCase()); // Dynamic Duo
    await g.searchToHand(d => d.type === 'ally' && names.some(n => (d.en || '').toLowerCase().includes(n)), '팀업에 적힌 동료', { discard: true }); } } };
  // ======================= UNDERLING villains =======================
  const stageNo = g => g.villainStage();
  const findIds = (g, ids) => enc(g).concat(g.e.setaside, g.e.aside || []).find(x => ids.includes(idOf(g, x))) || null;
  // ---- Bullseye ----
  const bullseyeV = { boostPlus: () => 1, attackProps: () => ({ ranged: true }) }; // each boost card gains 1 icon; attacks gain ranged
  const spine = g => { const v = V(g); return v ? g.c(v).att.find(a => /^60068/.test(idOf(g, a))) : null; };
  S['60065'] = Object.assign({ whenRevealed(g) { const s = spine(g); if (s) { g.put(s, 'aside'); g.log('아다만티움 척추: 따로 둡니다'); } } }, bullseyeV);
  S['60066'] = Object.assign({ whenRevealed(g) { if (spine(g)) return; const x = findIds(g, ['60068a', '60068b']); if (x && V(g)) { g.c(x).id = '60068a'; g.c(x).dmg = 0; g.attachEnc(x, V(g)); } } }, bullseyeV);
  S['60067'] = Object.assign({ async whenRevealed(g) { const x = findIds(g, ['60073']); if (x) await g.reveal(x); } }, bullseyeV);
  S['60068a'] = { reduceDamage(g, a, n) { if (n <= 3) return n; const p = n - 3; g.c(a).dmg = (g.c(a).dmg || 0) + p; g.log(`아다만티움 척추: 피해 ${p} 방지 (${g.c(a).dmg}/6)`); if (g.c(a).dmg >= 6) { g.c(a).id = '60068b'; g.log('척추가 손상되었습니다!', 'good'); } return 3; } };
  S['60068b'] = { on: { hostWouldScheme(g, a, ctx) { ctx.post.push(gg => { if (gg.c(a).zone !== 'attach') return; gg.c(a).dmg = Math.max(0, (gg.c(a).dmg || 0) - 3); if (!gg.c(a).dmg) { gg.c(a).id = '60068a'; gg.log('척추가 회복되었습니다', 'warn'); } }); } } };
  S['60069'] = { on: { enemyAttackStart(g, a, ctx) { if (ctx.enemy === g.c(a).on) { g.giveFacedownBoostTo(ctx.enemy, 1); g.c(a).stakes = true; } }, // Raise the Stakes
    afterEnemyAttack(g, a, ctx) { if (ctx.enemy !== g.c(a).on || !g.c(a).stakes) return; g.c(a).stakes = false; const t = ctx.target;
      if (t && t !== g.idt() && g.d(t).type === 'ally' && g.c(t).zone !== 'ally') { g.removeFromGame(t); g.removeFromGame(a); g.log('판돈 올리기: 쓰러진 동료와 이 카드를 게임에서 제거', 'warn'); } else { g.put(a, 'edeck'); g.shuffle(g.e.deck); g.log('판돈 올리기: 조우 덱에 섞음'); } } } };
  S['60070'] = { attackProps(g, x, ctx) { return g.c(x).zone === 'attach' && ctx.enemy === g.c(x).on ? { piercing: true, ranged: false } : {}; }, // Deadly Sai
    respond: [{ window: 'afterHeroDefends', timing: 'hero', label: '서로 다른 자원 2개 → 치명적인 사이 버림', can: (g, u, ctx) => g.c(u).zone === 'attach' && ctx.enemy === g.c(u).on, async resolve(g, u) {
      const paid = await g.pay({ n: 2, req: '' }, null, '치명적인 사이: 서로 다른 자원 2개', true); if (paid && new Set(paid).size >= 2) g.discard(u, '치명적인 사이 버림'); else if (paid) g.log('같은 종류라 버리지 못했습니다', 'warn'); } }] };
  S['60071'] = { attachTo: g => g.allAllies().find(a => !g.c(a).att.some(x => idOf(g, x) === '60071')) || null, surgeIfNoHost: true, // Incessant Pursuit
    redirectVillainAttack(g, x, enemy, o) { const al = g.c(x).on; if (g.c(x).zone !== 'attach' || !al || g.c(al).zone !== 'ally' || g.controllerOf(al) !== g.s.ctx) return; o.forceTarget = al; o.overkill = true; g.c(x).pursuit = al; g.log(`끈질긴 추격: ${g.nm(enemy)}이(가) ${g.nm(al)}을(를) 공격합니다 (압도)`, 'warn'); },
    on: { afterEnemyAttack(g, x, ctx) { const al = g.c(x).pursuit; if (!al) return; g.c(x).pursuit = null; if (g.c(al).zone === 'discard') { g.removeFromGame(al); g.log(`${g.nm(al)}: 게임에서 제거`); } } } };
  S['60072'] = { afterBoostCard(g, v, card, ctx) { if (ctx.undefended && !ctx._lb) { ctx._lb = true; ctx.extraBoost = (ctx.extraBoost || 0) + 1; g.log('★ 레이디 불스아이: 무방비 공격, 강화 카드 1장 추가'); } } }; // Lady Bullseye
  S['60073'] = { whenRevealed(g, u) { const n = stageNo(g); g.c(u).threat += n; g.log(`${g.nm(u)}: 위협 +${n}`); }, boostEffect(g, u, ctx) { (ctx.post || ctx.after).push(async gg => { if (gg.c(u).zone === 'ediscard') await gg.reveal(u); }); } }; // Deranged Bloodlust
  S['60074'] = { async whenRevealedAlter(g) { await g.indirectDamage(2, null); }, // Everything Is a Weapon
    async whenRevealedHero(g) { const o = g.p.allies.length ? await g.ask({ type: 'choice', title: '모든 것이 무기', options: [{ id: 'a', label: '불스아이가 당신을 상대로 활성화' }, { id: 'r', label: '동료 1명을 게임에서 제거' }] }) : 'a';
      if (o === 'r') { const x = await pick(g, g.p.allies.slice(), '게임에서 제거할 동료'); g.removeFromGame(x); } else if (V(g)) await g.activate(V(g), {}); },
    boostEffect(g, u, ctx) { if ('undefended' in ctx) { ctx.extraBoost = (ctx.extraBoost || 0) + 1; ctx.piercing = true; } } };
  S['60075'] = { async whenRevealed(g, u) { const ps = g.p.supports.filter(x => tr(g, x, 'PERSONA')); const o = ps.length ? await g.ask({ type: 'choice', title: '흔들림 없는 욕망', options: [{ id: 'b', label: '이 카드를 빌런의 뒷면 강화 카드로' }, { id: 'r', label: '[퍼소나] 지원 1장을 게임에서 제거' }] }) : 'b'; // Unerring Desire
      if (o === 'r') { const x = await pick(g, ps, '게임에서 제거할 지원'); g.removeFromGame(x); } else if (V(g)) g.giveFacedownCard(V(g), u); },
    boostEffect(g, u, ctx) { if ('undefended' in ctx) ctx.overkill = true; } };
  // ---- Electro ----
  const ecE = g => { const v = V(g); return v ? g.c(v).att.find(a => idOf(g, a) === '60079') : null; };
  const charge = (g, n) => { const a = ecE(g); if (!a) return; g.c(a).cnt.charge = Math.max(0, (g.c(a).cnt.charge || 0) + n); g.log(`전기 충전: 충전 ${n > 0 ? '+' : ''}${n} (${g.c(a).cnt.charge})`); };
  const charges = g => { const a = ecE(g); return a ? (g.c(a).cnt.charge || 0) : 0; };
  const elecAttach = (g, per) => { const v = V(g); if (!v) return; if (!ecE(g)) { const x = findIds(g, ['60079']); if (x) g.attachEnc(x, v); } charge(g, per * g.players); };
  const elecBase = n => ({ beforeScheme(g, v, ctx) { ctx.post.push(gg => charge(gg, n)); } });
  S['60076'] = S['60077'] = Object.assign({ whenRevealed(g) { elecAttach(g, 2); } }, elecBase(1));
  S['60078'] = Object.assign({ whenRevealed(g) { elecAttach(g, 3); } }, elecBase(2));
  const payYor2 = async (g, title) => { const opts = []; if (g.canAfford({ n: 1, req: 'Y' }, null)) opts.push({ id: 'y', label: '[에너지] 1개' }); if (g.canAfford({ n: 2, req: '' }, null)) opts.push({ id: '2', label: '아무 자원 2개' }); if (!opts.length) return false;
    const o = opts.length === 1 ? opts[0].id : await g.ask({ type: 'choice', title, options: opts.concat([{ id: 'n', label: '내지 않음' }]) }); if (o === 'n') return false; return (await g.pay(o === 'y' ? { n: 1, req: 'Y' } : { n: 2, req: '' }, null, title, true)) != null; };
  S['60079'] = { on: { enemyAttackStart(g, a, ctx) { if (ctx.enemy !== g.c(a).on || (g.c(a).cnt.charge || 0) <= 0) return; g.c(a).cnt.charge--; g.giveFacedownBoostTo(ctx.enemy, 1); ctx.overkill = true; g.log(`★ 전기 충전: 충전 1 → 강화 카드 +1, 압도 (${g.c(a).cnt.charge})`); } }, // Electric Charge
    actions: [{ timing: 'hero', label: '전기 충전: [에너지] 또는 자원 2개 → 충전 1 제거', can: (g, u) => (g.c(u).cnt.charge || 0) > 0 && (g.canAfford({ n: 1, req: 'Y' }, null) || g.canAfford({ n: 2, req: '' }, null)), async use(g, u) { if (await payYor2(g, '전기 충전 제거')) { g.c(u).cnt.charge--; g.log(`충전 1 제거 (${g.c(u).cnt.charge})`, 'good'); } } }] };
  S['60080'] = { attachTo: g => g.idt(), whenRevealed(g, u) { g.c(u).cnt.drain = 3; for (const x of g.p.upgrades) g.c(x).ex = true; g.log('기력 소진: 업그레이드 모두 소진'); }, // Drained of Power
    async upgradeReadyGate(g, a, up) { if (g.c(a).zone !== 'attach') return true; if (!(await payYor2(g, `기력 소진: ${g.nm(up)}을(를) 준비하려면`))) { g.log(`${g.nm(up)}: 준비하지 않습니다`); return false; } g.c(a).cnt.drain--; if (g.c(a).cnt.drain <= 0) g.discard(a, '기력 소진 버림'); return true; } };
  S['60081'] = { async beforeAttackedCtx(g, t, actx) { if (charges(g) <= 0) return; charge(g, -1); const x = g.takeEncounter(); if (!x) return; g.put(x, 'ediscard'); const n = g.boostOf(x); g.log(`★ 휘플래시: ${g.nm(x)} → 공격자에게 피해 ${n}`); if (n && g.c(actx.attacker)) await g.dealDamage(actx.attacker, n, { src: t }); } }; // Whiplash
  S['60082'] = { whenDefeated(g) { charge(g, 3); } }; // Charging Up
  S['60083'] = { async whenRevealed(g) { const big = charges(g) > 0; for (const x of chars(g).slice()) { if (!g.c(x).zone) continue; const o = g.c(x).ex ? 'd' : await g.ask({ type: 'choice', title: `연쇄 번개: ${g.nm(x)}`, options: [{ id: 'e', label: '소진' }, { id: 'd', label: `피해 ${big ? 3 : 1}` }] }); // Chain Lightning
    if (o === 'e') g.c(x).ex = true; else await g.dealDamage(x, big ? 3 : 1, {}); } charge(g, -1); } };
  S['60084'] = { async whenRevealed(g, u, ctx) { const xs = g.p.hand.filter(x => (g.d(x).res || '').includes('Y')); if (!xs.length) { ctx.surge++; return; } // Energy Overload
    for (const x of xs) { const o = await g.ask({ type: 'choice', title: `에너지 과부하: ${g.nm(x)}`, options: [{ id: 'd', label: '그 카드 버림' }, { id: 's', label: '내 캐릭터 1명 기절' }] }); if (o === 'd') g.put(x, 'discard'); else { const c = await pick(g, chars(g), '기절시킬 캐릭터'); if (c) g.giveStatus(c, 'stun', '에너지 과부하'); } } } };
  S['60085'] = { async whenRevealed(g) { const n = g.controlled().length + 1; const out = await burn(g, n); for (const x of out.filter(y => (g.d(y).res || '').includes('Y'))) { const o = await g.ask({ type: 'choice', title: `충격적인 폭로: ${g.nm(x)}`, options: [{ id: 'i', label: '간접 피해 1' }, { id: 'c', label: '전기 충전에 충전 1' }] }); if (o === 'i') await g.indirectDamage(1, null); else charge(g, 1); } } }; // Shocking Revelation
  // ---- Hammerhead ----
  const hhHit = n => ({ on: { async afterEnemyAttack(g, v, ctx) { if (ctx.enemy !== v) return; for (const x of (ctx.damaged || [])) { if (!g.c(x).zone) continue; if (g.c(x).stun) await g.dealDamage(x, n, {}); else g.giveStatus(x, 'stun', '★ 해머헤드'); } } } });
  S['60086'] = hhHit(1); S['60087'] = hhHit(1); S['60088'] = hhHit(2);
  S['60089'] = { on: { async afterEnemyAttack(g, a, ctx) { if (ctx.enemy !== g.c(a).on || !ctx.target || !g.c(ctx.target).zone || g.c(a).zone !== 'attach') return; const t = ctx.target, en = ctx.enemy; g.discard(a, '에너지 개틀링 건: 다시 공격'); // Energy Gatling Gun
    await g.enemyAttack(en, t === g.idt() ? {} : { forceTarget: t }); } } };
  S['60090'] = { grantStalwart: true, actions: [{ timing: 'hero', label: '[에너지][정신][물리] → 고집불통 버림', cost: { n: 3, req: 'YBR' }, can: (g, u) => g.c(u).zone === 'attach', use(g, u) { g.discard(u, '고집불통 버림'); } }], boostEffect(g, u, ctx) { if (ctx.enemy) g.giveStatus(ctx.enemy, 'tough', '★ 고집불통'); } }; // Hardheaded
  const maxThw = (g, self) => { let m = 0; for (const x of g.allFriendlyChars()) if (g.c(x).zone) m = Math.max(m, g.stat(x, 'thw')); return m; };
  S['60091'] = { mod: { sch: (g, s, t) => t === s ? maxThw(g, s) : 0 }, async whenRevealed(g, u) { await g.enemyScheme(u, {}); } }; // Chameleon
  S['60092'] = { mod: { sch: (g, s, t) => t === s ? g.enemies().filter(e => (g.d(e).tr || []).includes('MAGGIA')).length : 0 } }; // Maggia Enforcers
  S['60093'] = { onActivationStart(g, u) { if (g.c(g.idt()).stun) { g.giveFacedownBoostTo(u, 1); g.log('★ 마기아 부두목: 당신이 기절해 강화 카드 +1'); } } }; // Maggia Underboss
  S['60094'] = { on: { minionDefeated(g, s, ctx) { if (g.c(s).zone === 'side' && g.c(ctx.minion).zone === 'minion' && V(g)) g.giveFacedownCard(V(g), ctx.minion); } } }; // Consolidate Power
  S['60095'] = { async whenRevealed(g) { const ms = g.e.minions.slice().sort((a, b) => g.hpLeft(a) - g.hpLeft(b)); if (ms[0]) { g.log(`권력 다툼: ${g.nm(ms[0])} 격파`); await g.defeat(ms[0], {}); } const m = await untilType(g, d => d.type === 'minion'); if (m) await g.reveal(m); } }; // Power Struggle
  S['60096'] = { whenRevealedAlter(g, u, ctx) { ctx.surge++; }, async whenRevealedHero(g) { const v = V(g); if (!v) return; const st = g.c(g.idt()).stun; await g.enemyAttack(v, st ? { atkBonus: 2, overkill: true } : {}); } }; // "Head First!"
  // ---- Purple Man ----
  const influenced = (g, m) => g.hasTrait(m, 'INFLUENCED');
  const pmKw = kws => ({ grantKw: (g, s, u) => g.c(u).zone === 'minion' && influenced(g, u) ? kws : null,
    afterBoostCard(g, v, card, ctx) { if (g.d(card).set === 'Purple Man') (ctx.post || ctx.after).push(gg => { if (gg.c(card).zone === 'ediscard') { gg.put(card, 'facedown'); gg.log(`★ 퍼플맨: ${gg.nm(card)}을(를) 뒷면 조우 카드로 받습니다`, 'warn'); } }); } });
  S['60097'] = pmKw(['guard']); S['60098'] = pmKw(['guard', 'villainous']); S['60099'] = pmKw(['guard', 'patrol', 'villainous']);
  S['60100'] = { revealFirst: true, async whenRevealed(g, u, ctx) { const xs = g.p.allies.slice(); if (!xs.length) { ctx.surge++; g.discard(u); return; } // Converted
    const top = Math.max(...xs.map(x => g.d(x).cost || 0)); const a = await pick(g, xs.filter(x => (g.d(x).cost || 0) === top), '조종당할 동료'); if (!a) { g.discard(u); return; } g.allyToMinion(a, 'INFLUENCED'); g.attachEnc(u, a); } };
  S['60101'] = { attackProps: () => ({ piercing: true }), whenDefeated(g) { const xs = g.livingPlayers().flatMap(i => g.s.ps[i].supports.concat(g.s.ps[i].upgrades)).filter(x => !g.d(x).permanent); if (!xs.length) return; const top = Math.max(...xs.map(x => g.d(x).cost || 0)); const x = xs.find(y => (g.d(y).cost || 0) === top); g.discard(x, `소방관: ${g.nm(x)} 버림`); } }; // Firefighter
  S['60102'] = { async whenDefeated(g) { await g.placeThreat(g.e.main, 3, {}); } }; // Judge
  S['60103'] = { whenDefeated(g) { const xs = g.allAllies().slice().sort((a, b) => g.stat(b, 'atk') - g.stat(a, 'atk')); if (xs[0]) g.discard(xs[0], `경비원: ${g.nm(xs[0])} 버림`); } }; // Security Guard
  S['60104'] = { async whenDefeated(g, u, ctx) { if (ctx && ctx.byPlayer) await g.dealDamage(g.idt(), 3, {}); } }; // Skater Punk
  const command = (label, fn) => ({ whenRevealed(g, u) { g.put(u, 'pobl'); g.c(u).cnt.command = 3; g.c(u).ex = false; g.log(`${label}: 내 차례마다 반드시 처리해야 합니다`, 'warn'); },
    on: { turnBegins(g, u) { if (g.c(u).zone === 'pobl') g.c(u).ex = false; }, async playerPhaseEnd(g, u) { if (g.c(u).zone === 'pobl' && !g.c(u).ex && (g.c(u).cnt.command || 0) > 0) await runCmd(g, u, fn); } },
    actions: [{ label: `${label}: 강제 행동`, can: (g, u) => g.c(u).zone === 'pobl' && !g.c(u).ex && (g.c(u).cnt.command || 0) > 0, use: (g, u) => runCmd(g, u, fn) }] });
  async function runCmd(g, u, fn) { g.c(u).ex = true; g.c(u).cnt.command--; await fn(g); if ((g.c(u).cnt.command || 0) <= 0 && g.c(u).zone === 'pobl') g.discard(u, `${g.nm(u)}: 명령 카운터가 없어 버림`); }
  S['60105'] = command('"싸워."', async g => { const t = await pick(g, chars(g).filter(x => g.c(x).zone), '피해 2를 받을 히어로/동료'); if (t) await g.dealDamage(t, 2, {}); });
  S['60106'] = command('"지켜."', g => { if (V(g)) g.giveStatus(V(g), 'tough', '"지켜."'); });
  S['60107'] = command('"섬겨."', async g => { await g.placeThreat(g.e.main, 2, {}); });
  S['60108'] = { grantTrait: (g, s, u) => g.c(s).zone === 'side' && g.c(u).zone === 'minion' ? 'INFLUENCED' : null }; // Power of Suggestion
  S['60109'] = { async whenRevealed(g, u, ctx) { const xs = g.e.discard.filter(x => g.d(x).type === 'minion' && ((g.d(x).tr || []).includes('INFLUENCED') || g.e.sides.some(s => idOf(g, s) === '60108'))); const x = await pick(g, xs, '공개할 [조종당함] 하수인'); if (x) await g.reveal(x); else ctx.surge++; } }; // Sway the Masses
  // ---- Typhoid Mary ----
  const psyche = g => (g.e.env || []).find(x => idOf(g, x) === '60112') || null;
  async function psycheToken(g, why) { const p = psyche(g); if (!p) return; g.c(p).cnt.psyche = (g.c(p).cnt.psyche || 0) + 1; g.log(`불안정한 정신: 토큰 ${g.c(p).cnt.psyche}/3 (${why})`, 'good'); if (g.c(p).cnt.psyche >= 3) g.win('메리의 정신을 붙잡았습니다'); }
  const maryBase = base => ({ async wouldBeDefeated(g, v, w) { if (!psyche(g)) return; w.saved = true; g.c(v).dmg = Math.max(0, g.maxHp(v) - base * g.players); await psycheToken(g, '빌런 격파'); } });
  S['60110a'] = maryBase(10); S['60110b'] = maryBase(10); S['60111a'] = maryBase(13);
  S['60111b'] = Object.assign(maryBase(13), { async whenRevealed(g) { await g.forEachPlayer(async () => { await g.dealDamage(g.idt(), 1, {}); }); } });
  S['60112'] = { on: { roundEnd(g) { if (V(g) && g.flipFace(V(g))) g.log(`불안정한 정신: 빌런이 ${g.nm(V(g))}(으)로 뒤집힙니다`, 'warn'); } } }; // Disturbed Psyche
  const walker = g => { const v = V(g); return v ? g.c(v).att.find(a => idOf(g, a) === '60113b') : null; };
  const trustSide = g => g.e.sides.find(x => idOf(g, x) === '60113a') || null;
  async function walkerToTrust(g) { const w = walker(g); if (!w) return; g.c(w).id = '60113a'; await g.enterSide(w, {}); g.c(w).threat = 8 * g.players + (g.s.scen.expert ? 3 * g.players : 0); g.log('메리 워커 → 신뢰 쌓기', 'warn'); }
  S['60113a'] = { async whenDefeated(g, s) { await psycheToken(g, '신뢰 쌓기'); if (!g.c(s).zone || !V(g)) return; g.c(s).id = '60113b'; g.c(s).threat = 0; g.attachEnc(s, V(g)); g.log('신뢰 쌓기 → 메리 워커 (빌런 활성화 불가)', 'good'); return 'handled'; } }; // Establish Trust
  S['60113b'] = { async insteadOfActivation(g, a, enemy) { g.log('메리 워커: 빌런이 활성화하지 않습니다', 'good'); }, // Mary Walker
    on: { async afterTakeDamage(g, a, ctx) { if (ctx.target === g.c(a).on) { await g.forEachPlayer(() => g.dealEncounterCard()); await walkerToTrust(g); } }, async roundEnd(g) { if (walker(g)) { await g.forEachPlayer(() => g.dealEncounterCard()); await walkerToTrust(g); } } } };
  const typhoidOn = g => V(g) && /a$/.test(idOf(g, V(g))), bloodyOn = g => V(g) && /b$/.test(idOf(g, V(g)));
  S['60114'] = { actions: [{ timing: 'hero', label: '[정신][정신] → 염력 버림', cost: { n: 2, req: 'BB' }, can: (g, u) => g.c(u).zone === 'attach', use(g, u) { g.discard(u, '염력 버림'); } }], // Telekinesis
    async boostEffect(g, u, ctx) { if (ctx.enemy !== V(g) || !typhoidOn(g)) return; const before = chars(g).map(x => [x, g.c(x).dmg]); await g.indirectDamage(3, null); for (const [x, d] of before) if (g.c(x).zone && g.c(x).dmg > d) g.c(x).ex = true; } };
  S['60115'] = { async whenRevealed(g) { await walkerToTrust(g); if (V(g)) await g.enemyScheme(V(g), {}); }, async boostEffect(g, u, ctx) { if (ctx.enemy === V(g) && typhoidOn(g)) { const a = await pick(g, g.p.allies.slice(), '피해 3을 받을 동료'); if (a) await g.dealDamage(a, 3, {}); } } }; // Psionic Slash
  S['60116'] = { async whenRevealed(g) { for (const x of chars(g).slice()) if (g.c(x).zone) await g.dealDamage(x, 1, {}); g.giveStatus(g.idt(), 'stun', '사이 노바'); }, boostEffect(g, u, ctx) { if (ctx.enemy === V(g) && typhoidOn(g)) g.giveStatus(g.idt(), 'stun', '★ 사이 노바'); } }; // Psi Nova
  S['60117'] = { reduceDamage(g, a, n) { g.c(a).dmg = (g.c(a).dmg || 0) + n; const cap = g.s.scen.expert ? 8 : 5; g.log(`조립 갑옷: 피해 ${n}을(를) 대신 받습니다 (${g.c(a).dmg}/${cap})`); if (g.c(a).dmg >= cap) g.discard(a, '조립 갑옷 파괴'); return 0; }, // Assembled Armor
    boostEffect(g, u, ctx) { if (ctx.enemy === V(g) && bloodyOn(g)) g.giveStatus(g.idt(), 'conf', '★ 조립 갑옷'); } };
  S['60118'] = { async whenRevealed(g) { await walkerToTrust(g); if (V(g)) await g.enemyAttack(V(g), {}); }, async boostEffect(g, u, ctx) { if (ctx.enemy === V(g) && bloodyOn(g)) await g.dealDamage(g.idt(), 2, {}); } }; // Hail of Blades
  S['60119'] = { whenRevealed(g) { if (V(g)) g.giveStatus(V(g), 'tough', '긁어모은 방벽'); }, boostEffect(g, u, ctx) { if (ctx.enemy === V(g) && bloodyOn(g)) g.giveStatus(V(g), 'tough', '★ 긁어모은 방벽'); } }; // Scavenged Bulwark
  S['60120'] = { boostEffect(g, u, ctx) { ctx.extraBoost = (ctx.extraBoost || 0) + 1; } }; // Hand Lookout
  MC.fne.typhoidSetup = async function (g) { // Disturbed Psyche: the villain starts on a random side; Establish Trust in play
    const p = psyche(g) || findIds(g, ['60112']); if (p && g.c(p).zone !== 'env') g.put(p, 'env');
    const v = V(g); if (v && g.rand() < 0.5) { g.flipFace(v); g.log(`빌런은 ${g.nm(v)} 모습으로 시작합니다`); }
    const t = findIds(g, ['60113a', '60113b']); if (t && g.c(t).zone !== 'side') { g.c(t).id = '60113a'; await g.enterSide(t, {}); if (g.s.scen.expert) g.c(t).threat += 3 * g.players; } };
  // ======================= missions =======================
  const isTyphoid = g => V(g) && /^6011[01]/.test(idOf(g, V(g)));
  async function missionCommon(g) { if (isTyphoid(g)) await MC.fne.typhoidSetup(g); }
  // ---- Art Museum Heist ----
  const ART = ['60122', '60123', '60124', '60125'];
  const isArt = (g, x) => ART.includes(idOf(g, x));
  const artsOn = (g, h) => h ? g.c(h).att.filter(a => isArt(g, a)) : [];
  async function artTo(g, a, host) { // attach an ART card; its "after this card attaches" response
    if (g.c(a).zone === 'attach') g.put(a, 'attach', host); else g.attachEnc(a, host);
    const id = idOf(g, a); if (id === '60122') g.giveStatus(host, 'conf', '불가능한 물체'); if (id === '60124') g.giveStatus(host, 'tough', '복제 방패'); if (id === '60125') g.giveStatus(host, 'stun', '눈부신 풍경');
    g.log(`${g.nm(a)} → ${g.nm(host)}`); }
  S['60121a'] = { async setup(g) { const arts = ART.map(id => findIds(g, [id])).filter(Boolean); const v = V(g); if (arts.length && v) { const i = Math.floor(g.rand() * arts.length); await artTo(g, arts[i], v); } for (const x of arts) if (g.c(x).zone !== 'attach') g.put(x, 'edeck'); g.shuffle(g.e.deck); await missionCommon(g); } };
  S['60121b'] = { escFn: g => 1 + artsOn(g, V(g)).length, // escalation: 1 more than the ART attachments on the villain
    on: { async afterEnemyAttack(g, s, ctx) { if (s !== g.e.main || !ctx.undefended || ctx.target !== g.idt()) return; const a = artsOn(g, g.idt())[0]; if (a && V(g)) { g.log('무방비 공격: 예술품을 빼앗깁니다', 'warn'); await artTo(g, a, V(g)); } } } };
  const artCard = (req, extra) => Object.assign({ surge: true, attachTo: g => V(g), mod: { sch: (g, s, t) => g.c(s).zone === 'attach' && g.c(s).on === t ? 1 : 0, thw: (g, s, t) => g.c(s).zone === 'attach' && g.c(s).on === t ? 1 : 0 },
    whenRevealed(g, u) { const id = idOf(g, u), h = g.c(u).on; if (!h) return; if (id === '60122') g.giveStatus(h, 'conf', '불가능한 물체'); if (id === '60124') g.giveStatus(h, 'tough', '복제 방패'); if (id === '60125') g.giveStatus(h, 'stun', '눈부신 풍경'); },
    actions: [{ timing: 'hero', label: '예술품을 내 히어로에게 (자원 1개 또는 히어로 소진)', can: (g, u) => g.c(u).zone === 'attach' && g.c(u).on !== g.idt() && (g.canAfford({ n: 1, req: req }, null) || !g.c(g.idt()).ex), async use(g, u) {
      const opts = []; if (g.canAfford({ n: 1, req: req }, null)) opts.push({ id: 'p', label: '자원 지불' }); if (!g.c(g.idt()).ex) opts.push({ id: 'e', label: '히어로 소진' }); const o = opts.length === 1 ? opts[0].id : await g.ask({ type: 'choice', title: g.nm(u), options: opts });
      if (o === 'p') { if ((await g.pay({ n: 1, req: req }, null, g.nm(u), true)) == null) return; } else g.c(g.idt()).ex = true; await artTo(g, u, g.idt()); } }] }, extra || {});
  S['60122'] = artCard('B'); S['60123'] = artCard('G', { grantStalwart: true }); S['60124'] = artCard('R'); S['60125'] = artCard('Y');
  async function artToVillain(g) { const allArts = g.livingPlayers().flatMap(i => artsOn(g, g.idt(i))); const a = await pick(g, allArts, '빌런에게 옮길 예술품'); if (a && V(g)) { await artTo(g, a, V(g)); return true; } return false; }
  S['60126'] = { async whenRevealed(g) { const x = enc(g).find(y => isArt(g, y)); g.shuffle(g.e.deck); if (x && V(g)) await artTo(g, x, V(g)); else await artToVillain(g); }, async boostEffect(g) { await artToVillain(g); } }; // Art Thief
  S['60127'] = { async whenRevealed(g, u, ctx) { const mine = artsOn(g, V(g)); if (mine.length && g.canAfford({ n: 3, req: 'RRR' }, null) && await yes(g, '줄다리기: [물리] 3개로 예술품을 가져올까요?') && (await g.pay({ n: 3, req: 'RRR' }, null, '줄다리기', true)) != null) { const a = await pick(g, mine, '가져올 예술품'); await artTo(g, a, g.idt()); return; } // Tug of War
    await artToVillain(g); ctx.surge++; } };
  // ---- The Getaway ----
  const speed = g => g.c(g.e.main).cnt.speed || 0;
  const addSpeed = (g, n) => { g.c(g.e.main).cnt.speed = speed(g) + n; g.log(`속도 카운터 +${n} (${speed(g)})`, 'warn'); };
  const outFront = g => { const v = V(g); return v ? g.c(v).att.find(a => /^60129/.test(idOf(g, a))) : null; };
  S['60128a'] = { async setup(g) { const of = findIds(g, ['60129a', '60129b']); if (of && V(g)) { g.c(of).id = '60129a'; g.attachEnc(of, V(g)); } g.c(g.e.main).cnt.speed = g.s.scen.expert ? 2 : 1; await missionCommon(g); } };
  S['60128b'] = { on: { roundEnd(g, s) { if (s !== g.e.main || !g.c(s).threat) return; addSpeed(g, 1); const of = outFront(g); if (of && idOf(g, of) === '60129b') { g.c(of).id = '60129a'; g.log('나란히 → 앞서 달림', 'warn'); } else addSpeed(g, 1); } } };
  async function alongside(g, a) { g.c(a).id = '60129b'; g.log('앞서 달림 → 나란히: 따라잡았습니다!', 'good'); await g.forEachPlayer(() => g.indirectDamage(1, null)); if (V(g)) await g.dealDamage(V(g), 2 * g.players, { byPlayer: true }); }
  S['60129a'] = { attackProps: (g, x, ctx) => ctx.enemy === g.c(x).on ? { ranged: true } : {}, // Out Front
    reduceDamage(g, a, n) { const m = g.e.main; const r = Math.min(n, g.c(m).threat); g.c(m).threat -= r; g.log(`앞서 달림: 피해 대신 주 음모 위협 ${r} 제거`, 'good'); if (g.c(m).threat <= 0) g.e.alongPending = a; return 0; },
    on: { async afterAttack(g, a) { if (g.e.alongPending === a) { g.e.alongPending = null; await alongside(g, a); } }, async mainSchemeEmpty(g, a) { if (g.c(a).zone === 'attach' && idOf(g, a) === '60129a' && g.e.alongPending !== a) await alongside(g, a); } } };
  S['60129b'] = {};
  const speedKw = (g, u, k) => (k === 'toughness' && speed(g) >= 3) || (k === 'quickstrike' && speed(g) >= 6);
  S['60130'] = { grantKw: (g, s, u) => u === s ? ['toughness', 'quickstrike'].filter(k => speedKw(g, u, k)) : null, whenRevealed(g, u, ctx) { if (speed(g) >= 3) g.c(u).tough = true; if (speed(g) >= 9) ctx.surge++; } }; // Escort Vehicle
  S['60131'] = { shieldsFromDamage: (g, s, t) => g.c(s).zone === 'side' && t === V(g) }; // Jackknifed Tanker Truck
  S['60132'] = { async whenRevealed(g) { for (let i = 0; i < speed(g); i++) { const o = g.canAfford({ n: 1, req: '' }, null) ? await g.ask({ type: 'choice', title: `타이어 태우기 (${i + 1}/${speed(g)})`, options: [{ id: 'p', label: '자원 1개 지불' }, { id: 't', label: '주 음모에 위협 1' }] }) : 't'; // Burning Rubber
    if (o === 'p' && (await g.pay({ n: 1, req: '' }, null, '타이어 태우기', true)) != null) continue; await g.placeThreat(g.e.main, 1, {}); } } };
  S['60133'] = { async whenRevealed(g) { for (let i = 0; i < speed(g); i++) { const xs = chars(g).filter(x => !g.c(x).ex); const o = xs.length ? await g.ask({ type: 'choice', title: `보행자 (${i + 1}/${speed(g)})`, options: [{ id: 'e', label: '캐릭터 1명 소진' }, { id: 'd', label: '간접 피해 1' }] }) : 'd'; // Pedestrians
    if (o === 'e') { const x = await pick(g, xs, '소진할 캐릭터'); g.c(x).ex = true; } else await g.indirectDamage(1, null); } } };
  // ---- Protection Racket ----
  const PR = ['60134', '60135', '60136', '60137', '60138'];
  async function prSetup(g) { const cur = idOf(g, g.e.main).slice(0, 5); let pickId = cur;
    if (!g.s.scen.expert) { const o = await g.ask({ type: 'choice', title: '보호비 갈취: 주 음모를 고르세요', options: PR.map(p => ({ id: p, label: MC.cards[p + 'b'] ? MC.cards[p + 'b'].name : p })) }); if (PR.includes(o)) pickId = o; }
    if (pickId !== cur) { g.c(g.e.main).id = pickId + 'b'; g.e.mainStages[0] = [pickId + 'a', pickId + 'b']; }
    g.e.prAside = PR.filter(p => p !== pickId); g.log(`보호비 갈취: 「${g.nm(g.e.main)}」`); await missionCommon(g); }
  for (const p of PR) S[p + 'a'] = { setup: prSetup };
  const prMain = (id, extra) => { S[id] = Object.assign({}, extra); };
  prMain('60134b', { on: { async afterEnemyAttack(g, s, ctx) { if (s !== g.e.main || !ctx.target) return; if (!g.s.scen.expert && g.c(s).bodega === pk(g)) return; g.c(s).bodega = pk(g); // Battle in the Bodega
    if (g.c(ctx.enemy).zone) await g.dealDamage(ctx.enemy, 1, { src: s }); await g.placeThreat(s, 1, {}); } } });
  prMain('60135b', { on: { async afterTakeDamage(g, s, ctx) { if (s !== g.e.main) return; const t = ctx.target; if (!g.c(t) || !(g.d(t).type === 'ally' || (g.s.scen.expert && g.d(t).type === 'minion'))) return; const ex = Math.max(0, -g.hpLeft(t)); if (ex > 0) { g.log(`도자기 가게의 황소: 초과 피해 ${ex} → 위협`, 'warn'); await g.placeThreat(s, ex, {}); } } } }); // Bull in a China Shop
  prMain('60136b', { on: { async allyEnters(g, s, ctx) { if (s !== g.e.main) return; await g.dealDamage(ctx.ally, 1, {}); await g.placeThreat(s, 1, {}); }, async minionEnters(g, s, ctx) { if (s !== g.e.main) return; await g.dealDamage(ctx.minion, 1, {}); await g.placeThreat(s, 1, {}); } } }); // Hung Out to Dry
  prMain('60137b', { costMod: (g, s, uid) => s === g.e.main && g.d(uid).type === 'upgrade' && g.p.usedOnce.pawnShop !== true ? 1 : 0, costUsed(g, s, uid) { if (g.d(uid).type === 'upgrade') g.p.usedOnce.pawnShop = true; }, // Pawn Shop Showdown
    on: { async cardPlayed(g, s, ctx) { if (s === g.e.main && g.d(ctx.card).type === 'upgrade') await g.placeThreat(s, 1, {}); } } });
  prMain('60138b', { on: { async playerDefeatsMinion(g, s, ctx) { if (s !== g.e.main) return; const src = ctx.src; if (src && g.c(src) && g.c(src).zone) g.heal(src, 1); await g.placeThreat(s, 1, {}); }, async sideSchemeDefeated(g, s) { if (s === g.e.main) await g.placeThreat(s, 1, {}); } } }); // A Slice of the Pizza Dough
  S['60139'] = { async whenRevealedEnc(g, u) { await g.putAllyIntoPlay(u); g.log('가게 주인이 당신 편에 섭니다 (쇄도)'); const n = g.takeEncounter(); if (n) await g.reveal(n); }, onLeave(g, u, from) { if (from === 'ally' && g.e.main) { g.c(g.e.main).threat += 4; g.log('가게 주인이 떠났습니다: 주 음모에 위협 4', 'warn'); g.e.recheck = true; } } }; // Shop Proprietor
  S['60140'] = { on: { async afterEnemyAttack(g, u, ctx) { if (ctx.enemy === u && ctx.excess > 0) await g.placeThreat(g.e.main, ctx.excess, {}); } }, boostEffect(g, u, ctx) { if ('undefended' in ctx) ctx.after.push(async gg => { if ((ctx.excess || 0) > 0) await gg.placeThreat(gg.e.main, ctx.excess, {}); }); } }; // Man-Bull
  async function changeVenue(g) { const as = g.e.prAside || []; if (!as.length) return; const i = Math.floor(g.rand() * as.length), nid = as[i], old = idOf(g, g.e.main).slice(0, 5); as.splice(i, 1, old); // Change of Venue
    g.c(g.e.main).id = nid + 'b'; g.e.mainStages[g.e.mainIdx] = [nid + 'a', nid + 'b']; g.log(`장소 변경: 주 음모가 「${g.nm(g.e.main)}」(으)로 바뀝니다 (위협 유지)`, 'warn'); }
  S['60141'] = { async whenRevealed(g) { await changeVenue(g); }, async boostEffect(g) { await changeVenue(g); } };
  // ---- The Raft Breakout ----
  S['60142a'] = { async setup(g) { const k = findIds(g, ['60143']); if (k && V(g)) g.attachEnc(k, V(g)); await g.forEachPlayer(async () => { const m = await untilType(g, d => d.type === 'minion' && (d.tr || []).includes('PRISONER')); if (m) await g.reveal(m); }); await missionCommon(g); } };
  S['60142b'] = { on: { async minionDefeated(g, s, ctx) { if (s !== g.e.main) return; const n = tr(g, ctx.minion, 'ELITE') ? 2 : 1; const r = await g.removeThreat(s, n, { ignoreCrisis: true }); if (r) g.log(`탈옥 저지: 하수인 격파 → 주 음모 위협 ${r} 제거`, 'good'); } } };
  S['60143'] = { hostBoostCard(g, a, card, ctx) { if ('undefended' in ctx || g.d(card).type !== 'minion') return; (ctx.post || ctx.after).push(gg => { if (gg.c(card).zone === 'ediscard') { gg.put(card, 'facedown'); gg.log(`마스터 키: ${gg.nm(card)}을(를) 뒷면 조우 카드로`, 'warn'); } }); } }; // Master Key
  S['60144'] = { async onAttackStart(g, u, ctx) { const x = g.p.deck[0]; if (!x) return; g.c(u).under = g.c(u).under || []; g.put(x, 'under', u); const n = new Set(g.c(u).under.flatMap(y => (g.d(y).res || '').split('')).filter(Boolean)).size; ctx.atkBonus = (ctx.atkBonus || 0) + n; g.log(`★ 앱조빙 맨: ${g.nm(x)} 흡수 → 공격 +${n}`); } }; // Absorbing Man
  S['60145'] = { async whenRevealed(g) { const xs = g.p.allies.filter(a => !(g.c(a).threat > 0)); if (!xs.length) return; const a = await pick(g, xs, '바론 제모: 위협을 놓고 기만당할 동료'); g.allyToMinion(a, 'DECEIVED'); g.c(a).threat = 1; g.log(`바론 제모: ${g.nm(a)}이(가) 기만당해 하수인이 됩니다`, 'warn'); } }; // Baron Zemo
  S['60146'] = { on: { async afterEnemyAttack(g, u, ctx) { if (ctx.enemy !== u) return; g.c(u).cnt.barrage = (g.c(u).cnt.barrage || 0) + 1; await g.indirectDamage(g.c(u).cnt.barrage, u); } } }; // Drang
  S['60147'] = { afterBoostCard(g, v, card, ctx) { if ('undefended' in ctx && g.d(card).type === 'treachery') (ctx.post || ctx.after).push(gg => { if (gg.c(card).zone === 'ediscard') { gg.put(card, 'facedown'); gg.log(`★ 미스테리오: ${gg.nm(card)}을(를) 뒷면 조우 카드로`, 'warn'); } }); } }; // Mysterio
  S['60148'] = { async onAttackStart(g, u, ctx) { const o = await g.ask({ type: 'choice', title: '프록시마 미드나잇', options: [{ id: 't', label: '주 음모에 위협 1' }, { id: 'a', label: '이번 공격 +2' }] }); if (o === 't') await g.placeThreat(g.e.main, 1, {}); else ctx.atkBonus = (ctx.atkBonus || 0) + 2; } }; // Proxima Midnight
  S['60149'] = { attackProps: () => ({ overkill: true }), boostEffect(g, u, ctx) { if (ctx.enemy) g.giveStatus(ctx.enemy, 'tough', '★ 라이노'); } }; // Rhino (prisoner)
  S['60150'] = { whenRevealed(g, u) { g.put(u, 'pobl'); g.log('수감: 저지·공격·일상 모습 변신 불가', 'warn'); }, noToAlter: (g, u) => g.c(u).zone === 'pobl', heroNo: { attack: (g, u) => g.c(u).zone === 'pobl' }, cannotThwart: (g, u) => g.c(u).zone === 'pobl', // Imprisoned
    boostEffect(g, u, ctx) { (ctx.post || ctx.after).push(async gg => { if (gg.c(u).zone === 'ediscard') await gg.reveal(u); }); },
    actions: [{ timing: 'hero', label: '수감 해제: 자원 3개 또는 저지력 합 3 이상 소진', can: (g, u) => g.c(u).zone === 'pobl', async use(g, u) {
      const thwSum = chars(g).filter(x => !g.c(x).ex).reduce((t, x) => t + g.stat(x, 'thw'), 0); const opts = []; if (g.canAfford({ n: 3, req: '' }, null)) opts.push({ id: 'p', label: '자원 3개' }); if (thwSum >= 3) opts.push({ id: 'e', label: '캐릭터 소진 (저지력 합 3+)' }); if (!opts.length) return;
      const o = opts.length === 1 ? opts[0].id : await g.ask({ type: 'choice', title: '수감 해제', options: opts });
      if (o === 'p') { if ((await g.pay({ n: 3, req: '' }, null, '수감 해제', true)) == null) return; } else { let s = 0; while (s < 3) { const x = await pick(g, chars(g).filter(y => !g.c(y).ex), `소진할 캐릭터 (저지력 ${s}/3)`); if (!x) break; g.c(x).ex = true; s += g.stat(x, 'thw'); } }
      g.discard(u, '수감 해제'); } }] };
  // ---- Stop the Presses! ----
  const BUGLE = ['60153', '60154', '60155', '60156'];
  const bugles = g => g.p.supports.filter(x => BUGLE.includes(idOf(g, x)));
  const allBugles = g => g.livingPlayers().flatMap(i => g.s.ps[i].supports.filter(x => BUGLE.includes(idOf(g, x))));
  S['60151a'] = { async setup(g) { const env = findIds(g, ['60152']); if (env) g.put(env, 'env'); const cs = BUGLE.map(id => findIds(g, [id])).filter(Boolean); g.shuffle(cs); await g.forEachPlayer(() => { const x = cs.shift(); if (x) { g.put(x, 'support'); g.c(x).cnt.stamina = 3; g.log(`데일리 뷰글(${g.playerName()}): ${g.nm(x)}이(가) 함께합니다`, 'good'); } }); for (const y of cs) g.removeFromGame(y); await missionCommon(g); } };
  S['60151b'] = { on: { async afterEnemyAttack(g, s, ctx) { if (s !== g.e.main || !ctx.undefended || ctx.target !== g.idt()) return; const bs = bugles(g).filter(x => (g.c(x).cnt.stamina || 0) > 0);
    const o = bs.length ? await g.ask({ type: 'choice', title: '무방비 공격', options: [{ id: 't', label: `주 음모에 위협 ${g.s.scen.expert ? 3 : 2}` }, { id: 's', label: '[데일리 뷰글] 지원의 체력 카운터 1 제거' }] }) : 't';
    if (o === 't') await g.placeThreat(s, g.s.scen.expert ? 3 : 2, {}); else { const b = await pick(g, bs, '체력 카운터를 잃을 지원'); g.c(b).cnt.stamina--; g.cleanupUses(b); } } } };
  S['60152'] = { actions: [{ timing: 'alter', label: '데일리 뷰글: [데일리 뷰글] 지원 소진 → 체력 카운터 1', can: g => bugles(g).some(x => !g.c(x).ex), async use(g) { const b = await pick(g, bugles(g).filter(x => !g.c(x).ex), '소진할 지원'); if (b) { g.c(b).ex = true; g.c(b).cnt.stamina = (g.c(b).cnt.stamina || 0) + 1; } } }] };
  const bugleBase = { loseIfLeaves: true };
  S['60153'] = Object.assign({ actions: [{ exhaust: true, label: '벤 유릭: 체력 1 → 조우 덱 위 2장 보고 1장 버리기', can: (g, u) => (g.c(u).cnt.stamina || 0) > 0, async use(g, u) { g.c(u).cnt.stamina--; const top = g.e.deck.slice(0, 2); const x = await g.ask({ type: 'target', title: '버릴 카드 (취소하면 그대로)', cands: top, cancelable: true }); if (x) g.put(x, 'ediscard'); g.cleanupUses(u); } }] }, bugleBase); // Ben Urich
  S['60154'] = Object.assign({ respond: [{ window: 'boostTurned', exhaust: true, label: '베티 브랜트: 이 강화 카드 취소, 새 강화 카드', can: (g, u) => (g.c(u).cnt.stamina || 0) > 0, resolve(g, u, ctx) { g.c(u).cnt.stamina--; ctx.cancelIcons = true; ctx.cancelAbility = true; if (ctx.act) ctx.act.extraBoost = (ctx.act.extraBoost || 0) + 1; g.cleanupUses(u); } }] }, bugleBase); // Betty Brant
  S['60155'] = Object.assign({ actions: [{ exhaust: true, label: 'J. 조나 제임슨: 체력 1, 조우 카드 1장 → 카드 2장', can: (g, u) => (g.c(u).cnt.stamina || 0) > 0, async use(g, u) { g.c(u).cnt.stamina--; await g.dealEncounterCard(); await g.draw(2); g.cleanupUses(u); } }] }, bugleBase); // J. Jonah Jameson
  S['60156'] = Object.assign({ respond: [{ window: 'encounterDealt', exhaust: true, label: '로비 로버트슨: 체력 1 → 받은 조우 카드 확인', // Robbie Robertson
    can: (g, u, ctx) => g.c(u).zone === 'support' && (g.c(u).cnt.stamina || 0) > 0 && g.c(ctx.card).zone === 'facedown',
    async resolve(g, u, ctx) { g.c(u).cnt.stamina--; g.cleanupUses(u);
      const o = await g.ask({ type: 'choice', title: `로비 로버트슨: 받은 조우 카드는 「${g.nm(ctx.card)}」입니다`, options: [{ id: 'swap', label: '버리고 새 조우 카드 1장 받기' }, { id: 'keep', label: '그대로 두기' }] });
      if (o === 'swap') { g.put(ctx.card, 'ediscard'); g.log(`로비 로버트슨: ${g.nm(ctx.card)}을(를) 버리고 새 조우 카드를 받습니다`, 'good'); const n = g.takeEncounter(); if (n) g.put(n, 'facedown'); }
    } }] }, bugleBase);
  S['60157'] = { whenRevealed(g) { for (const b of allBugles(g)) g.c(b).ex = true; }, blocksReady: (g, s, u) => g.c(s).zone === 'side' && BUGLE.includes(idOf(g, u)) }; // Exclusive Interview
  S['60158'] = { async whenRevealed(g) { const bs = allBugles(g).filter(x => !g.c(x).ex); const o = bs.length ? await g.ask({ type: 'choice', title: '속보', options: [{ id: 'b', label: '[데일리 뷰글] 지원 소진, 체력 1 제거' }, { id: 't', label: '주 음모에 위협 2' }] }) : 't'; // Breaking News
    if (o === 'b') { const b = await pick(g, bs, '소진할 지원'); g.c(b).ex = true; g.c(b).cnt.stamina--; g.cleanupUses(b); } else await g.placeThreat(g.e.main, 2, {}); },
    boostEffect(g) { const b = allBugles(g).find(x => !g.c(x).ex); if (b) g.c(b).ex = true; } };
  // ======================= Kingpin =======================
  const isMA = g => V(g) && g.hasTrait(V(g), 'MARTIAL ARTIST');
  const kpA = { noUpgrades: true, cannotTakeDamage: (g, s, o) => true, insteadOfAttack: (g, v) => g.enemyScheme(v, {}) };
  const kpB = n => ({ onActivationStart(g, v) { if (!g.engagedMinions().length) { g.giveFacedownBoostTo(v, 1); if (n) g.c(v).kpOverkill = true; g.log('★ 킹핀: 교전 중인 하수인이 없어 강화 카드 +1'); } }, attackProps(g, v) { if (g.c(v).kpOverkill) { g.c(v).kpOverkill = false; return { overkill: true }; } return {}; } });
  S['60159a'] = Object.assign({}, kpA); S['60160a'] = Object.assign({}, kpA); S['60159b'] = kpB(false); S['60160b'] = kpB(true);
  const myNemIds = g => { const H = MC.heroes[g.p.heroKey] || Object.values(MC.heroes).find(h => h.hero === g.p.heroId) || {}; return new Set(H.nemesis || []); };
  const nemesisMinion = g => g.e.setaside.concat(enc(g)).find(x => g.d(x).type === 'minion' && myNemIds(g).has(idOf(g, x))) || g.e.setaside.concat(enc(g)).find(x => g.d(x).type === 'minion' && (g.d(x).nemesis || g.e.setaside.includes(x))) || null;
  async function revealUnderling(g) { const xs = enc(g).concat(g.e.setaside).filter(x => g.d(x).type === 'minion' && (g.d(x).tr || []).includes('UNDERLING')); const x = xs[Math.floor(g.rand() * xs.length)]; if (x) await g.reveal(x); return x; }
  async function revealNemesis(g) { const nem = myNemIds(g); const n = g.e.setaside.find(x => g.d(x).type === 'minion' && nem.has(idOf(g, x))) || g.e.setaside.find(x => g.d(x).type === 'minion'); if (!n) return null; const title = g.d(n).name; if (g.allFriendlyChars().concat(g.e.minions).some(x => g.d(x).name === title)) { g.removeFromGame(n); g.log(`${title}: 이미 같은 이름의 캐릭터가 있어 대신 언더링 하수인`); return revealUnderling(g); } await g.reveal(n); return n; }
  FNE.revealUnderling = revealUnderling;
  S['60161a'] = { async setup(g) { await g.forEachPlayer(() => revealNemesis(g)); } };
  S['60161b'] = { loseOnComplete: true, async whenRevealed(g) { const ps = findIds(g, ['60163a', '60163b']); if (ps) { g.c(ps).id = '60163a'; g.put(ps, 'env'); g.log('대중의 지지 등장 (낮음)'); } }, // The King's Gambit
    actions: [{ timing: 'hero', label: '왕의 갬빗: 위협 제거 → 조우 버림 더미를 섞고 하수인 공개', can: (g, s) => s === g.e.main && g.c(s).threat >= (g.s.scen.expert ? 4 : 5), async use(g, s) { const n = g.s.scen.expert ? 4 : 5; g.c(s).threat -= n; g.log(`왕의 갬빗: 위협 ${n} 제거`, 'good');
      for (const x of g.e.discard.slice()) g.put(x, 'edeck'); g.shuffle(g.e.deck); const m = await untilType(g, d => d.type === 'minion'); if (m) await g.reveal(m); } }] };
  S['60162a'] = { async whenRevealed(g) { await g.forEachPlayer(async () => { const nem = myNemIds(g); const n = g.e.setaside.concat(enc(g)).find(x => g.d(x).type === 'minion' && nem.has(idOf(g, x))); if (n) await g.reveal(n); else await revealUnderling(g); }); if (g.s.scen.expert) await g.withPlayer(g.s.first, async () => { const oc = findIds(g, ['60174']); if (oc) await g.reveal(oc); }); } }; // Endgame
  S['60162b'] = { grantKw: (g, s, u) => s === g.e.main && g.c(u).zone === 'minion' ? ['guard'] : null };
  S['60163a'] = { on: { minionDefeated(g, u) { g.c(u).cnt.support = (g.c(u).cnt.support || 0) + 1; }, async villainPhaseBegins(g, u) { if ((g.c(u).cnt.support || 0) < 2 * g.players + 2) return; // Public Support (low)
      g.log('대중의 지지가 높아졌습니다: 킹핀이 본색을 드러냅니다!', 'warn'); await g.flipVillain({}); g.c(u).id = '60163b'; if (g.e.mainIdx === 0 && g.e.mainStages.length > 1) await g.setMainStage(1); } } };
  S['60163b'] = { on: { minionDefeated(g, u) { g.c(u).cnt.support = (g.c(u).cnt.support || 0) + 1; } }, // Public Support (high): support counters instead of facedown boost cards
    fdBoostShield(g, x, t) { if (g.c(x).zone !== 'env' || (g.c(x).cnt.support || 0) < g.players) return false; g.c(x).cnt.support -= g.players; g.log(`대중의 지지: 지지 카운터 ${g.players}개를 제거해 ${g.nm(t)}이(가) 뒷면 강화 카드를 받지 않습니다 (남은 ${g.c(x).cnt.support})`, 'good'); return true; } };
  S['60164'] = { attachTo: g => isMA(g) ? g.idt() : null, surgeIfNoHost: true, whenRevealed(g, u) { g.c(u).cnt.grip = 3; }, noToAlter: (g, u) => g.c(u).zone === 'attach' && g.c(u).on === g.idt(), tangles: true, // Bear Hug
    onTangle(g, u) { g.c(u).cnt.grip--; g.log(`곰 껴안기: 행동 대신 조임 카운터 1 제거 (${g.c(u).cnt.grip})`, 'warn'); if (g.c(u).cnt.grip <= 0) g.discard(u, '곰 껴안기 버림'); } };
  S['60165'] = { attachTo: g => V(g), whenRevealed(g) { if (V(g)) g.giveFacedownBoostTo(V(g), 1); }, boostEffect(g, u, ctx) { (ctx.post || ctx.after).push(gg => { if (gg.c(u).zone === 'ediscard' && V(gg)) gg.attachEnc(u, V(gg)); }); }, // James Wesley
    actions: [{ timing: 'hero', label: '[저지] 이벤트 버림 → 제임스 웨슬리 버림 (킹핀 음모)', can: (g, u) => g.c(u).zone === 'attach' && g.p.hand.some(x => (g.d(x).tr || []).includes('THWART')), async use(g, u) { const x = await pick(g, g.p.hand.filter(y => (g.d(y).tr || []).includes('THWART')), '버릴 [저지] 이벤트'); g.put(x, 'discard'); g.discard(u); if (V(g)) await g.enemyScheme(V(g), {}); } }] };
  S['60166'] = { attachTo: g => V(g), whenRevealed(g) { g.giveStatus(g.idt(), 'stun', '킹핀의 지팡이'); }, // Kingpin's Cane
    on: { afterEnemyAttack(g, a, ctx) { if (ctx.enemy !== g.c(a).on || !(ctx.damaged || []).includes(g.idt())) return; if (g.giveStatus(g.idt(), 'stun', '킹핀의 지팡이')) g.discard(a, '킹핀의 지팡이 버림'); } },
    async boostEffect(g) { if (g.c(g.idt()).stun) await g.dealDamage(g.idt(), 1, {}); else g.giveStatus(g.idt(), 'stun', '★ 킹핀의 지팡이'); } };
  S['60167'] = { attachTo: g => isMA(g) ? V(g) : null, surgeIfNoHost: true, mod: { retaliate: (g, s, t) => g.c(s).on === t ? 1 : 0 }, reduceDamage(g, a, n) { g.c(a).dmg = (g.c(a).dmg || 0) + n; g.log(`근육의 산: 피해 ${n} 흡수 (${g.c(a).dmg}/8)`); if (g.c(a).dmg >= 8) g.discard(a, '근육의 산 버림'); return 0; } }; // Mountain of Muscle
  S['60168'] = { attachTo: g => V(g), whenRevealed(g) { g.giveStatus(g.idt(), 'conf', '바네사 피스크'); }, async boostEffect(g) { if (g.c(g.idt()).conf) await g.placeThreat(g.e.main, 1, {}); else g.giveStatus(g.idt(), 'conf', '★ 바네사 피스크'); }, // Vanessa Fisk
    actions: [{ timing: 'hero', label: '[공격] 이벤트 버림 → 바네사 피스크 버림 (킹핀 공격)', can: (g, u) => g.c(u).zone === 'attach' && g.p.hand.some(x => (g.d(x).tr || []).includes('ATTACK')), async use(g, u) { const x = await pick(g, g.p.hand.filter(y => (g.d(y).tr || []).includes('ATTACK')), '버릴 [공격] 이벤트'); g.put(x, 'discard'); g.discard(u); if (V(g)) await g.enemyAttack(V(g), {}); } }] };
  S['60169'] = { actions: [{ timing: 'hero', label: '블랙 캣: [정신] → 위협 1 (4가 되면 동료로)', cost: { n: 1, req: 'B' }, can: (g, u) => g.c(u).zone === 'minion', async use(g, u) { g.c(u).threat = (g.c(u).threat || 0) + 1; g.log(`블랙 캣: 위협 ${g.c(u).threat}/4`); // Black Cat
    if (g.c(u).threat >= 4) { g.c(u).threat = 0; g.minionToAlly(u, 2); g.log('블랙 캣이 당신 편이 됩니다!', 'good'); } } }] };
  S['60170'] = { async onAttackStart(g) { await g.dealDamage(g.idt(), 1, {}); }, async boostEffect(g) { await g.dealDamage(g.idt(), 1, {}); } }; // Diamondback
  S['60171'] = { async beforeAttackedCtx(g, t, actx) { if ((g.c(t).cnt.spot ?? 1) > 0) { g.c(t).cnt.spot = (g.c(t).cnt.spot ?? 1) - 1; actx.prevent = true; g.log('스팟: 공격을 공격자에게 되돌립니다', 'warn'); await g.dealDamage(actx.attacker, actx.amount, { src: t }); } else { g.c(t).cnt.spot = 1; } } }; // Spot
  S['60172'] = { mod: { sch: (g, s, t) => t === s ? (g.c(s).cnt.stilt ?? 2) : 0, atk: (g, s, t) => t === s ? (g.c(s).cnt.stilt ?? 2) : 0 }, // Stilt-Man
    async damageInstead(g, t, n) { const k = g.c(t).cnt.stilt ?? 2; if (k <= 0) return false; g.c(t).cnt.stilt = k - 1; g.log(`스틸트맨: 피해 대신 죽마 카운터 1 제거 (${g.c(t).cnt.stilt})`); return true; } };
  S['60173'] = { async whenDefeated(g) { const nem = myNemIds(g); const ns = g.e.sides.find(s => nem.has(idOf(g, s))) || g.e.sides.find(s => g.d(s).nemesis || (g.d(s).set || '').includes('Nemesis')); if (ns) await g.placeThreat(ns, 3, {}); else { const x = g.e.setaside.find(y => g.d(y).type === 'side' && nem.has(idOf(g, y))) || g.e.setaside.find(y => g.d(y).type === 'side'); if (x) await g.reveal(x); } } }; // Kingpin's Influence
  S['60174'] = { mod: { hp: (g, s, t) => g.c(s).zone === 'side' && g.c(t).zone === 'minion' ? 2 : 0 } }; // Organized Crime
  S['60175'] = { async whenRevealed(g, u, ctx) { const nem = myNemIds(g); const pool = g.e.setaside.filter(x => nem.has(idOf(g, x))); const xs = pool.length ? pool : g.e.setaside; if (!xs.length) { ctx.surge++; return; } await g.reveal(xs[Math.floor(g.rand() * xs.length)]); }, // Bag of Tricks
    boostEffect(g, u, ctx) { const nem = myNemIds(g); const pool = g.e.setaside.filter(x => nem.has(idOf(g, x))); const xs = pool.length ? pool : g.e.setaside; if (!xs.length || !ctx.enemy) return; const x = xs[Math.floor(g.rand() * xs.length)]; g.put(x, 'edeck', null, true); ctx.extraBoost = (ctx.extraBoost || 0) + 1; } };
  S['60176'] = { async whenRevealed(g) { const nem = myNemIds(g); let n = g.e.minions.find(m => nem.has(idOf(g, m))) || g.e.minions.find(m => g.d(m).nemesis); if (!n) { const x = g.e.setaside.concat(enc(g)).find(y => g.d(y).type === 'minion' && nem.has(idOf(g, y))) || g.e.setaside.find(y => g.d(y).type === 'minion'); if (x) { await g.reveal(x); return; } await revealUnderling(g); return; } await g.activate(n, {}); }, // Unrelenting Hate
    boostEffect(g, u, ctx) { if ('undefended' in ctx) ctx.overkill = true; } };
  // ======================= modular sets =======================
  // ---- Disasters ----
  const disasters = g => (g.e.env || []).filter(x => (g.d(x).tr || []).includes('DISASTER'));
  const disaster = (req, special, label) => ({ actions: [{ timing: 'hero', label: `${label}: 시민 구조`, can: (g, u) => (g.c(u).cnt.civilian || 0) > 0 && (g.canAfford({ n: 2, req: req + req }, null) || chars(g).some(x => !g.c(x).ex)), async use(g, u) {
    const opts = []; if (g.canAfford({ n: 2, req: req + req }, null)) opts.push({ id: 'p', label: '같은 자원 2개 지불' }); const cs = chars(g).filter(x => !g.c(x).ex); if (cs.length) opts.push({ id: 'e', label: '히어로/동료 소진' });
    const o = opts.length === 1 ? opts[0].id : await g.ask({ type: 'choice', title: label, options: opts }); let n = 1;
    if (o === 'p') { if ((await g.pay({ n: 2, req: req + req }, null, label, true)) == null) return; } else { const x = await pick(g, cs, '소진할 캐릭터'); if (!x) return; g.c(x).ex = true; if (special(g, x)) n = 2; }
    g.c(u).cnt.civilian = Math.max(0, (g.c(u).cnt.civilian || 0) - n); g.log(`${label}: 시민 ${n}명 구조 (${g.c(u).cnt.civilian} 남음)`, 'good'); g.cleanupUses(u); } }] });
  S['60177'] = disaster('G', (g, x) => tr(g, x, 'MYSTIC'), '신비한 침입'); S['60178'] = disaster('Y', (g, x) => tr(g, x, 'AERIAL'), '침몰하는 페리'); S['60179'] = disaster('R', (g, x) => !!g.c(x).tough, '타워링 인페르노');
  S['60180'] = { onThreatRemoved(g, s, r) { if (r > 0 && g.c(s).zone === 'side') { g.c(s).threat += 1; g.log('무너지는 다리: 위협 1이 다시 쌓입니다', 'warn'); } } }; // Collapsing Bridge
  const civ = async (g, revealIfNone) => { const ds = disasters(g); if (ds.length) { const d = await pick(g, ds, '시민 카운터를 놓을 재난'); g.c(d).cnt.civilian = (g.c(d).cnt.civilian || 0) + 1; g.log(`${g.nm(d)}: 시민 +1`); return; } if (revealIfNone) { const x = enc(g).find(y => (g.d(y).tr || []).includes('DISASTER')); g.shuffle(g.e.deck); if (x) await g.reveal(x); } };
  S['60181'] = { async whenRevealed(g) { await civ(g, true); }, async boostEffect(g) { await civ(g, false); } }; // Bystanders in Peril
  // ---- Cops ----
  S['60182'] = { async insteadOfScheme(g, u) { if (V(g)) { g.log('★ 경찰: 음모 대신 빌런을 공격합니다', 'good'); await g.dealDamage(V(g), g.stat(u, 'atk'), { src: u, attack: true }); } }, async whenDefeated(g) { await g.placeThreat(g.e.main, 2, {}); } }; // Cop
  S['60183'] = { async whenDefeated(g, u, ctx) { if (ctx && ctx.byPlayer) await g.dealEncounterCard(); }, async boostEffect(g) { await g.indirectDamage(2, null); } }; // Crooked Cop
  S['60184'] = { whenRevealed(g, u) { g.put(u, 'pobl'); g.log('수배: [경찰] 하수인을 불러내기 전까지 남습니다'); }, actions: [{ timing: 'hero', label: '수배: [경찰] 하수인과 교전하고 이 카드 버림', can: (g, u) => g.c(u).zone === 'pobl', async use(g, u) { const m = await untilType(g, d => d.type === 'minion' && (d.tr || []).includes('POLICE')); if (m) await g.enterMinion(m, {}, true); g.discard(u, '수배 버림'); } }] }; // Wanted
  S['60185'] = { grantKw: (g, s, u) => g.c(s).zone === 'side' && g.c(u).zone === 'minion' && g.hasTrait(u, 'POLICE') ? ['guard', 'patrol'] : null, // Police Cordon
    async whenRevealed(g) { const x = enc(g).find(y => g.d(y).type === 'minion' && (g.d(y).tr || []).includes('POLICE')); g.shuffle(g.e.deck); if (x) await g.reveal(x); } };
  // ---- Drive ----
  const hasVehicle = (g, x) => g.c(x).att.some(a => (g.d(a).tr || []).includes('VEHICLE'));
  const vehicle = (cap, choose) => ({ attachTo: g => { const es = g.enemies().filter(e => !hasVehicle(g, e)); return es.length ? choose(g, es) : null; }, surgeIfNoHost: true,
    reduceDamage(g, a, n) { g.c(a).dmg = (g.c(a).dmg || 0) + n; g.log(`${g.nm(a)}: 피해 ${n} 흡수 (${g.c(a).dmg}/${cap})`); if (g.c(a).dmg >= cap) g.discard(a, `${g.nm(a)} 파괴`); return 0; } });
  S['60186'] = vehicle(4, (g, es) => es.slice().sort((a, b) => g.stat(b, 'atk') - g.stat(a, 'atk'))[0]); // Sports Car
  S['60187'] = vehicle(3, (g, es) => es.slice().sort((a, b) => g.stat(b, 'sch') - g.stat(a, 'sch'))[0]); // Motorcycle
  S['60188'] = vehicle(6, (g, es) => es.slice().sort((a, b) => g.hpLeft(a) - g.hpLeft(b))[0]); // Utility Van
  S['60189'] = { redirectScheme: (g, s, enemy) => g.c(s).zone === 'side' && hasVehicle(g, enemy) ? s : null }; // Traffic Jam (threat that vehicles would remove is not redirected)
  S['60190'] = { async whenRevealed(g) { const x = await untilType(g, d => d.type === 'attachment' && (d.tr || []).includes('VEHICLE')); if (!x) return; // Carjacking
    const ts = ['Y', 'B', 'R'].filter(t => g.canAfford({ n: 3, req: t + t + t }, null)); if (!hasVehicle(g, g.idt()) && ts.length && await yes(g, `카재킹: 같은 자원 3개로 ${g.nm(x)}을(를) 당신에게 붙일까요?`)) { const t = ts.length === 1 ? ts[0] : await g.ask({ type: 'choice', title: '자원 종류', options: ts.map(k => ({ id: k, label: k })) }); if ((await g.pay({ n: 3, req: t + t + t }, null, '카재킹', true)) != null) { g.attachEnc(x, g.idt()); return; } } await g.reveal(x); } };
  // ---- The Owl ----
  S['60191'] = { attachTo: g => g.enemies().find(e => !g.hasTrait(e, 'AERIAL')) || null, surgeIfNoHost: true, grantTrait: (g, s, u) => g.c(s).on === u ? 'AERIAL' : null, // Flight Serum
    actions: [{ timing: 'hero', label: '[공격] 이벤트 버림 → 비행 혈청 버림', can: (g, u) => g.c(u).zone === 'attach' && g.p.hand.some(x => (g.d(x).tr || []).includes('ATTACK')), async use(g, u) { const x = await pick(g, g.p.hand.filter(y => (g.d(y).tr || []).includes('ATTACK')), '버릴 [공격] 이벤트'); g.put(x, 'discard'); g.discard(u, '비행 혈청 버림'); } }] };
  S['60192'] = { attackProps: () => ({ piercing: true, ranged: true }) }; // Mister Fish (one player: he engages you)
  S['60193'] = { attackProps: () => ({ piercing: true }), boostEffect(g, u, ctx) { if ('undefended' in ctx) ctx.piercing = true; } }; // The Owl
  S['60194'] = { async whenRevealedAlter(g) { for (const e of [V(g)].concat(g.engagedMinions()).filter(Boolean)) if (g.c(e).zone) await g.enemyScheme(e, { schBonus: g.hasTrait(e, 'AERIAL') ? 2 : 0 }); }, // Swoop Down
    async whenRevealedHero(g) { for (const e of [V(g)].concat(g.engagedMinions()).filter(Boolean)) if (g.c(e).zone && g.isHero()) await g.enemyAttack(e, { atkBonus: g.hasTrait(e, 'AERIAL') ? 2 : 0 }); } };
  // ---- Tombstone ----
  const biggest = g => g.e.minions.slice().sort((a, b) => (g.d(b).hp || 0) - (g.d(a).hp || 0))[0] || null;
  S['60195'] = { attachTo: biggest, surgeIfNoHost: true, whenRevealed(g, u) { if (g.c(u).on) g.giveStatus(g.c(u).on, 'tough', '얼음처럼 차가운'); }, on: { hostWouldScheme(g, a, ctx) { ctx.post.push(gg => { gg.giveStatus(gg.idt(gg.s.first), 'conf', '★ 얼음처럼 차가운'); if (gg.c(a).zone === 'attach') gg.discard(a); }); } } }; // Cold as Ice
  S['60196'] = { attachTo: biggest, surgeIfNoHost: true, whenRevealed(g, u) { if (g.c(u).on) g.giveStatus(g.c(u).on, 'tough', '대리석처럼 단단한'); }, on: { afterEnemyAttack(g, a, ctx) { if (ctx.enemy !== g.c(a).on) return; if (ctx.target && g.c(ctx.target).zone) g.giveStatus(ctx.target, 'stun', '★ 대리석처럼 단단한'); g.discard(a); } } }; // Hard as Marble
  S['60197'] = { whenRevealed(g, u) { const x = enc(g).find(y => g.d(y).type === 'attachment' && g.sc(y).attachTo && ['60195', '60196', '60186', '60187', '60188', '60191'].includes(idOf(g, y))); g.shuffle(g.e.deck); if (x) { g.attachEnc(x, u); const w = g.sc(x).whenRevealed; if (idOf(g, x) === '60195' || idOf(g, x) === '60196') g.giveStatus(u, 'tough', g.nm(x)); } } }; // Beetle
  S['60198'] = { boostEffect(g) { if (V(g)) g.giveStatus(V(g), 'tough', '★ 툼스톤'); } }; // Tombstone
  S['60199'] = { on: { async villainPhaseBegins(g, s) { if (g.c(s).zone !== 'side') return; await g.withPlayer(g.s.first, async () => { const before = g.p.allies.slice(); await g.indirectDamage(3, null); const lost = before.filter(a => g.c(a).zone !== 'ally').length; if (lost) { g.c(s).threat = Math.max(0, g.c(s).threat - lost * g.players); g.log(`히트 리스트: 쓰러진 동료 ${lost} → 위협 -${lost * g.players}`); await g.afterThreatRemoved(s); } }); } } }; // Hit List
  // ---- Tracksuit Mafia ----
  const tsScheme = g => g.e.sides.find(x => idOf(g, x) === '60204') || null;
  const tuckTS = (g, m) => { const s = tsScheme(g); if (!s) return false; g.c(s).under = g.c(s).under || []; for (const a of g.c(m).att.slice()) g.discard(a); g.resetCard(m); g.put(m, 'under', s); g.log(`${g.nm(m)}: 트랙수트 마피아 아래로`); return true; };
  S['60200'] = { whenRevealed(g, u) { g.c(u).cnt.accelTok = (g.c(u).cnt.accelTok || 0) + 1; }, beforeScheme(g, u, ctx) { ctx.post.push(gg => { if (gg.c(u).zone === 'minion') gg.c(u).cnt.accelTok = (gg.c(u).cnt.accelTok || 0) + 1; }); } }; // Ivan Banionis
  S['60201'] = { beforeScheme(g, u, ctx) { ctx.post.push(gg => { if (gg.c(u).zone === 'minion') gg.giveFacedownBoostTo(u, 1); }); } }; // The Clown
  S['60202'] = { whenDefeated(g, u, ctx) { if (tuckTS(g, u)) return; const src = ctx && ctx.src; if (src && g.c(src) && g.c(src).zone) { g.giveStatus(src, 'stun', '트랙수트 마피오소'); g.giveStatus(src, 'conf', '트랙수트 마피오소'); } } }; // Tracksuit Mafioso
  S['60203'] = { whenDefeated(g, u) { if (tuckTS(g, u)) return; for (const a of g.c(u).att.slice()) g.discard(a); g.resetCard(u); g.put(u, 'edeck'); g.shuffle(g.e.deck); g.log('트랙수트 녀석: 조우 덱에 섞음'); } }; // Tracksuit Bro
  S['60204'] = { async whenRevealed(g, u) { const m = await untilType(g, d => d.type === 'minion' && (d.tr || []).includes('TRACKSUIT')); if (m) tuckTS(g, m); }, // Tracksuit Mafia
    on: { async minionEnters(g, s, ctx) { if (g.c(s).zone !== 'side' || !g.hasTrait(ctx.minion, 'TRACKSUIT') || g.c(s).tsBusy) return; const x = (g.c(s).under || [])[0]; if (!x) return; g.c(s).tsBusy = true; try { g.log('트랙수트 마피아: 아래 하수인 1명 공개'); await g.reveal(x); } finally { g.c(s).tsBusy = false; } } } };
  // ======================= Campaign: Fear No Evil (cards/pack/fne/campaign.py, fear_no_evil_campaign) =======================
  const FNC = 'fear_no_evil';
  const CENV = { 'Art Museum Heist': '60205', 'The Getaway': '60206', 'Protection Racket': '60207', 'The Raft Breakout': '60208', 'Stop the Presses!': '60209' };
  const RAFT_PRISONERS = ['60144', '60145', '60146', '60147', '60148', '60149'];
  const ltrue = v => ['1', 'checked', 'completed', 'true', 'yes'].includes(String(v || '').trim().toLowerCase());
  const progress = (g, n) => { const v = g.clog(`${n} Progress`).trim(), k = parseInt(v, 10); return Number.isFinite(k) ? Math.max(0, k) : v.split(';').filter(Boolean).length; };
  const status = (g, n) => { const s = g.clog(`${n} Status`).trim().toLowerCase(); if (s === 'completed' || ltrue(g.clog(`${n} Completed`))) return 'Completed'; if (s === 'failed' || ltrue(g.clog(`${n} Failed`))) return 'Failed'; return progress(g, n) >= 3 ? 'Failed' : ''; };
  const removedTitles = g => new Set(['Allies and Persona Supports Removed from the Campaign', 'Allies/Supports Removed from the Campaign'].flatMap(k => g.clogList(k)).map(v => v.trim().replace(/^\*\s*/, '')).filter(Boolean));
  const isRemoved = (R, d, id) => R.has(id) || R.has(d.name) || R.has(String(d.en || '').replace(/^\*\s*/, ''));
  const searchMay = (type, ko) => async g => { await g.forEachPlayer(async () => { // SearchRewardAfterMulligans
    if (!g.p.deck.concat(g.p.discard).some(x => g.d(x).type === type) || !(await yes(g, `캠페인 환경(${g.playerName()}): 덱·버린 더미에서 ${ko} 1장을 손에 더할까요?`))) return;
    if (await g.searchToHand(d => d.type === type, `캠페인 환경 (${ko})`, { discard: true }) && g.s.scen.expert && g.p.hand.length) { const t = await pick(g, g.p.hand.slice(), '숙련: 손에서 버릴 카드'); if (t) g.put(t, 'discard'); }
  }); };
  const CENV_SETUP = {
    '60205a'(g) { for (const pi of g.livingPlayers()) g.giveStatus(g.idt(pi), 'tough', '미술관 털이'); },
    async '60205b'(g) { await g.forEachPlayer(async () => { if (g.s.scen.expert) { g.giveStatus(g.idt(), 'stun', '미술관 털이'); g.giveStatus(g.idt(), 'conf', '미술관 털이'); return; }
      const o = await g.ask({ type: 'choice', title: `미술관 털이 (실패, ${g.playerName()}): 내 아이덴티티에게`, options: [{ id: 'stun', label: '기절' }, { id: 'conf', label: '혼란' }] }); g.giveStatus(g.idt(), o, '미술관 털이'); }); },
    '60206a': searchMay('upgrade', '업그레이드'),
    async '60206b'(g) { await g.forEachPlayer(async () => { const a = g.e.deck.find(x => g.d(x).type === 'attachment'); if (a) { g.log(`도주 (실패): ${g.nm(a)}을(를) 찾아 공개합니다`, 'warn'); await g.reveal(a); g.shuffle(g.e.deck); } else await g.dealEncounterCard(); }); },
    '60207a': searchMay('support', '지원'),
    async '60207b'(g) { await g.forEachPlayer(async () => { for (let i = 0; i < (g.s.scen.expert ? 2 : 1); i++) { const t = await pick(g, g.p.hand.slice(), `보호비 갈취 (실패, ${g.playerName()}): 손에서 버릴 카드`); if (t) g.put(t, 'discard'); } }); },
    '60208a': searchMay('ally', '동료'),
    async '60208b'(g) { const ms = RAFT_PRISONERS.map(id => g.newCard(id, 'limbo')); g.shuffle(ms);
      if (g.s.scen.expert) await g.forEachPlayer(() => { if (ms.length) { const m = ms.pop(); g.put(m, 'facedown'); g.log(`래프트 탈옥 (실패, ${g.playerName()}): 죄수 하수인 1장을 뒷면으로 받습니다`, 'warn'); } });
      ms.forEach(m => g.put(m, 'edeck')); g.shuffle(g.e.deck); g.log('래프트 탈옥 (실패): 죄수 하수인들을 조우 덱에 섞습니다', 'warn'); },
    async '60209a'(g) { const R = removedTitles(g), c = BUGLE.filter(id => MC.cards[id] && !isRemoved(R, MC.cards[id], id)).map(id => g.newCard(id, 'limbo'));
      await g.forEachPlayer(async () => { if (!c.length) return; const t = await pick(g, c, `긴급 속보!(${g.playerName()}): 플레이 영역에 내려놓을 [데일리 뷰글] 지원`);
        if (t) { const i = c.indexOf(t); if (i >= 0) c.splice(i, 1); g.put(t, 'support'); g.c(t).cnt.stamina = 3; g.log(`긴급 속보!(${g.playerName()}): ${g.nm(t)}이(가) 함께합니다`, 'good'); } });
      for (const x of c) g.put(x, 'removed'); },
    async '60209b'(g) { await g.forEachPlayer(async () => { for (let i = 0; i < (g.s.scen.expert ? 2 : 1); i++) await g.dealEncounterCard(); }); }
  };
  S['60206b'] = { keepInPlay: (g, x, uid) => g.c(x).zone === 'env' && g.s.scen.expert && g.s.round <= 1 && g.d(uid).type === 'attachment' && g.c(uid).zone === 'attach' }; // The Getaway (failed)
  const maryFlip = (kind) => async (g, u) => { if (g.c(u).zone !== 'ally') return; g.c(u).dmg = 0; g.c(u).id = g.c(u).id === '60210a' ? '60210b' : '60210a'; g.log(`${kind} 공개 → 피해를 모두 없애고 ${g.nm(u)}(으)로 뒤집습니다`, 'warn'); };
  S['60210a'] = { on: { minionRevealed: maryFlip('하수인') } }; // Typhoid Mary
  S['60210b'] = { on: { sideEntered: maryFlip('부가 음모') } }; // Bloody Mary
  MC.CAMPAIGNS[FNC] = {
    setup(g) { // RemoveRecordedAlliesAndSupports (before the opening hand)
      const R = removedTitles(g); if (!R.size) return;
      for (const pi of g.playerOrder()) g.withPlayerSync(pi, () => {
        for (const x of g.p.deck.slice()) { const d = g.d(x); if (['ally', 'support'].includes(d.type) && d.unique && isRemoved(R, d, g.c(x).id)) { g.removeFromGame(x); g.log(`캠페인(${g.playerName()}): ${d.name}은(는) 캠페인에서 제거되었습니다`, 'warn'); } }
      });
    },
    async post(g, spec) { // after the mulligans
      const name = spec.scen;
      if (g.s.scen.expert) await g.forEachPlayer(async () => {
        const v = g.clogP('Remaining hit points'); if (v !== '' && Number.isFinite(parseInt(v, 10))) { g.setIdentityHP(parseInt(v, 10));
          const rec = (MC.cards[g.p.alterId] || {}).rec || 0; if (g.c(g.idt()).dmg > 0 && await yes(g, `숙련 캠페인(${g.playerName()}): 조우 카드 1장을 뒷면으로 받고 피해 ${rec}을 회복할까요?`)) { await g.dealEncounterCard(); g.heal(g.idt(), rec); } }
      });
      for (const [n, base] of Object.entries(CENV)) { const st = status(g, n); if (!st) continue; // PutResolvedCampaignEnvironmentsIntoPlay
        const id = base + (st === 'Failed' ? 'b' : 'a'), e = g.newCard(id, 'env'); g.log(`캠페인 환경: ${g.nm(e)} (${st === 'Failed' ? '실패' : '완료'})`, st === 'Failed' ? 'warn' : 'good');
        if (CENV_SETUP[id]) await CENV_SETUP[id](g); }
      if (ltrue(g.clog('Trust Established?')) && !ltrue(g.clog('Mary Defeated?'))) { const m = g.newCard('60210a', 'limbo'); await g.putAllyIntoPlay(m); g.log('캠페인: 타이포이드 메리가 동료로 함께합니다', 'good'); }
      if (name === 'Kingpin') { const done = Object.keys(CENV).filter(n => status(g, n) === 'Completed').length;
        if (done >= 3) for (const m of g.e.minions) g.giveStatus(m, 'tough', '캠페인');
        if (done >= 4) { const w = enc(g).find(x => idOf(g, x) === '60165'); if (w) { g.log('캠페인: 제임스 웨슬리를 찾아 공개합니다', 'warn'); await g.reveal(w); g.shuffle(g.e.deck); } }
        return; }
      const p = progress(g, name); if (p <= 0) return;
      g.log(`캠페인: 「${name}」 진행도 ${p}`, 'warn');
      if (['Art Museum Heist', 'Protection Racket'].includes(name)) { for (const m of [g.e.main].concat(g.e.mainX || [])) if (m) await g.placeThreat(m, p * (g.s.scen.expert ? 2 : 1), {}); }
      else if (name === 'The Getaway') { const t = g.e.sides.find(x => idOf(g, x) === '60131') || enc(g).find(x => idOf(g, x) === '60131'); if (t && g.c(t).zone !== 'side') { await g.reveal(t); g.shuffle(g.e.deck); } if (t && p >= 2 && g.c(t).zone === 'side') await g.placeThreat(t, (g.s.scen.expert ? 2 : 1) * g.players, {}); }
      else if (name === 'The Raft Breakout') { for (const m of g.e.minions.filter(x => tr(g, x, 'PRISONER'))) { g.giveStatus(m, 'tough', '캠페인'); if (p >= 2) g.giveFacedownBoostTo(m, 1); } }
      else if (name === 'Stop the Presses!') { for (const b of allBugles(g)) { g.c(b).cnt.stamina = Math.max(0, (g.c(b).cnt.stamina || 0) - p); g.cleanupUses(b); } }
    }
  };
  [['60121a', 'Art Museum Heist'], ['60128a', 'The Getaway'], ['60134a', 'Protection Racket'], ['60142a', 'The Raft Breakout'], ['60151a', 'Stop the Presses!'], ['60161a', 'Kingpin']].forEach(([id, scen]) => { S[id] = Object.assign(S[id] || {}, { campaign: { scen } }); });
  MC.registerScripts(S);
})();
