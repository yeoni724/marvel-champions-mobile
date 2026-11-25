/* Vision (26001-26036): mass form (Intangible / Dense), his hero set, Protection cards and nemesis set.
   Ported from cards/pack/vision of the community build. */
(function () {
  'use strict';
  const S = {};
  const MASS = ['26002a', '26002b'];
  const mass = g => g.p.upgrades.find(u => MASS.includes(g.c(u).id)) || null;
  const dense = g => { const m = mass(g); return !!m && g.c(m).id === '26002b'; };
  const intangible = g => { const m = mass(g); return !!m && g.c(m).id === '26002a'; };
  const blanked = g => (g.p.obl || []).some(u => g.c(u).id === '26028'); // Corrupted Programming
  const isVision = g => ['26001a', '26001b'].includes(g.c(g.idt()).id);
  async function changeMass(g) {
    const m = mass(g); if (!m) return;
    const c = g.c(m); c.id = c.id === '26002a' ? '26002b' : '26002a';
    g.log(`비전: 질량 형태 → ${g.nm(m)}`, 'good');
    await g.window('massChanged', { form: c.id });
  }
  async function dmgEnemy(g, n, title, src, attack, props) {
    const t = await g.chooseTarget(attack ? 'attackable' : 'enemy', title, g.idt(), false); if (!t) return null;
    if (attack) await g.playerAttack(g.idt(), t, n, Object.assign({ src }, props || {})); else await g.dealDamage(t, n, { src, byPlayer: true });
    return t;
  }
  const training = cls => ({ actions: [{ timing: 'alter', exhaust: true, label: `소진·훈련 1 → 버림 더미의 ${({ Protection: '수호', Justice: '정의', Leadership: '통솔', Aggression: '용맹' })[cls]} 이벤트를 덱에 섞기`, can: (g, u) => (g.c(u).cnt.training || 0) > 0 && g.p.discard.some(x => g.d(x).type === 'event' && g.d(x).cls === cls),
    async use(g, u) { g.c(u).cnt.training--; const c = g.p.discard.filter(x => g.d(x).type === 'event' && g.d(x).cls === cls); const t = c.length === 1 ? c[0] : await g.ask({ type: 'target', title: '덱에 섞을 이벤트', cands: c, cancelable: false }); g.put(t, 'deck'); g.shuffle(g.p.deck); g.cleanupUses(u); } }] });

  // ======================= identity =======================
  const massSetup = async g => { // Setup: put the mass form upgrade into play, Intangible side faceup
    if (mass(g)) return;
    const m = (g.p.pset || []).find(u => MASS.includes(g.c(u).id)); if (!m) return;
    g.c(m).id = '26002a'; g.put(m, 'upgrade'); g.log('비전: 질량 형태(무형)를 플레이에 놓습니다');
  };
  S['26001a'] = { setup: massSetup, actions: [{ timing: 'action', once: true, label: '밀도 조작: 질량 형태 바꾸기', can: g => !!mass(g), async use(g) { await changeMass(g); } }] };
  S['26001b'] = { setup: massSetup, mod: { rec: (g, s, t) => t === g.idt() && dense(g) ? 2 : 0, hs: (g, s, t) => t === g.idt() && intangible(g) ? 1 : 0 } };
  S['26002a'] = { // Intangible
    heroNo: { attack: g => isVision(g) && !blanked(g), defend: g => isVision(g) && !blanked(g) },
    on: { wouldTakeDamage(g, u, ctx) { if (ctx.target === g.idt() && ctx.attack && !blanked(g) && ctx.amount - ctx.prevent > 0) { ctx.prevent = Math.min(ctx.amount, ctx.prevent + 2); } } }
  };
  S['26002b'] = { // Dense
    mod: { atk: (g, s, t) => t === g.idt() && g.isHero() && !blanked(g) ? 2 : 0, def: (g, s, t) => t === g.idt() && g.isHero() && !blanked(g) ? 2 : 0 },
    respond: [{ window: 'massChanged', label: '카드 1장 뽑기', can: (g, u, ctx) => ctx.form === '26002b' && !blanked(g), async resolve(g) { await g.draw(1); } }]
  };

  // ======================= hero cards =======================
  S['26003'] = { mod: { thw: (g, s, t) => t === s && intangible(g) ? 2 : 0, atk: (g, s, t) => t === s && dense(g) ? 2 : 0 } }; // Vivian
  S['26004'] = { actions: [{ timing: 'alter', exhaust: true, label: '소진 → 덱/버림 더미에서 안드로이드 동료를 손으로', async use(g) { await g.searchToHand(d => d.type === 'ally' && (d.tr || []).includes('ANDROID'), '히코리 브랜치 레인 616', { discard: true }); } }] };
  S['26005'] = { grantTrait: (g, s, t) => t === g.idt() && isVision(g) ? 'AERIAL' : null, resources: [{ gen: 'G', label: '솔라 젬 (소진)', can: (g, u) => !g.c(u).ex, use: (g, u) => { g.c(u).ex = true; } }] }; // Solar Gem
  S['26006'] = { mod: { retaliate: (g, s, t) => t === g.idt() && dense(g) ? 1 : 0 }, stalwartFor: (g, s, t) => t === g.idt() && intangible(g) }; // Vision's Cape
  S['26007'] = { respond: [{ window: 'massChanged', timing: 'hero', label: '버리기 → 버림 더미의 비전 이벤트를 손으로', can: g => g.p.discard.some(x => g.d(x).type === 'event' && g.d(x).cls === 'Hero'), // Density Control
    async resolve(g, u) { g.discard(u); const c = g.p.discard.filter(x => g.d(x).type === 'event' && g.d(x).cls === 'Hero'); const t = c.length === 1 ? c[0] : await g.ask({ type: 'target', title: '손으로 가져올 비전 이벤트', cands: c, cancelable: false }); g.put(t, 'hand'); } }] };
  S['26008'] = { play: { timing: 'hero', can: g => (dense(g) && !g.heroNo('attack') && g.targets('attackable', g.idt()).length > 0) || (intangible(g) && !g.cannotThwart() && g.targets('thwartable', g.idt()).length > 0), async resolve(g, u) { // Solar Beam
    if (dense(g)) { if (await g.statusBlocks('attack')) return; await dmgEnemy(g, 7, '솔라 빔: 피해 7을 줄 적', u, true); }
    else if (intangible(g)) { if (await g.statusBlocks('thwart')) return; await g.removeThreatChoose(5, '솔라 빔: 위협 5를 제거할 음모', u); }
  } } };
  S['26009'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', can: g => dense(g), async resolve(g, u, ctx) { await g.playerAttack(g.idt(), ctx.target, 5, { piercing: true, src: u }); } } }; // Superdense Strike
  S['26010'] = { play: { timing: 'hero', label: 'thwart', can: g => intangible(g) && g.schemes().some(x => g.c(x).threat > 0 && !g.noRemove(x)), async resolve(g, u) { // Just Passing Through
    const c = g.schemes().filter(x => g.c(x).threat > 0 && !g.noRemove(x)); const t = c.length === 1 ? c[0] : await g.ask({ type: 'target', title: '그냥 지나가는 길: 위협 3을 제거할 음모 (순찰·위기 무시)', cands: c, cancelable: false });
    const r = await g.removeThreat(t, 3, { src: u }); g.log(`위협 ${r} 제거`); await g.afterThreatRemoved(t);
  } } };
  const heroTextAtt = (g, a) => { const s = g.sc(a); return (s.actions || []).some(x => x.timing === 'hero') || (s.respond || []).some(x => x.timing === 'hero'); };
  S['26011'] = { play: { timing: 'hero', target: 'enemy', can: g => intangible(g), async resolve(g, u, ctx) { // Phase Disruption
    g.giveStatus(ctx.target, 'conf', '위상 교란');
    const c = g.c(ctx.target).att.filter(a => g.d(a).enc && heroTextAtt(g, a)); if (!c.length) return;
    const t = c.length === 1 ? c[0] : await g.ask({ type: 'target', title: '버릴 부착물', cands: c, cancelable: false }); g.discard(t, `${g.nm(t)} 버림`);
  } } };
  S['26012'] = { interrupt: { window: 'heroDefends', timing: 'hero', can: g => dense(g), async resolve(g, u, hd) { // Mass Increase
    hd.defBonus += 999; g.log('질량 증가: 이 공격의 피해를 모두 방지', 'good'); const e = hd.enemy;
    hd.after.push(async gg => { if (gg.c(e) && gg.c(e).zone) gg.giveStatus(e, 'stun', '질량 증가'); });
  } } };

  // ======================= Protection / other aspects / Basic =======================
  S['26013'] = { playFromAttached: true, async onEnter(g, u) { // Jocasta
    const c = g.p.discard.filter(x => g.d(x).type === 'event' && (g.d(x).tr || []).includes('DEFENSE')); if (!c.length) return;
    const t = c.length === 1 ? c[0] : await g.ask({ type: 'target', title: '조카스타에게 뒷면으로 붙일 [방어] 이벤트', cands: c, cancelable: false }); g.put(t, 'attach', u); g.c(t).fd = true; g.log(`${g.nm(t)}을(를) 조카스타에게 붙임`);
  } };
  S['26014'] = { respond: [{ window: 'allyWouldTakeDamage', label: '[정신] → 피해 1 감소', once: true, cost: { n: 1, req: 'B' }, can: (g, u, ctx) => ctx.target === u && ctx.amount - ctx.prevent > 0, async resolve(g, u, ctx) { ctx.prevent++; } }] }; // Protector
  S['26015'] = { on: { wouldTakeDamage(g, u, ctx) { if (ctx.target === u && ctx.attack && ctx.amount - ctx.prevent > 0) ctx.prevent++; } } }; // Victor Mancha
  S['26016'] = { respond: [{ window: 'eventResolved', label: '공격 중인 적에게 피해 1', can: (g, u, ctx) => (ctx.tr || []).includes('DEFENSE') && g.e.curAttacker && g.c(g.e.curAttacker) && ['minion', 'villain'].includes(g.c(g.e.curAttacker).zone), // Flow Like Water
    async resolve(g, u) { await g.dealDamage(g.e.curAttacker, 1, { src: u, byPlayer: true }); } }] };
  S['26018'] = { interrupt: { window: 'boostTurned', timing: 'hero', label: '그 강화 카드를 대신 버림', can: (g, u, ctx) => ctx.attack && !ctx.cancelIcons, async resolve(g, u, ctx) { // Defiance
    ctx.cancelIcons = true; ctx.cancelAbility = true; g.put(ctx.card, 'ediscard'); g.log(`도전: ${g.nm(ctx.card)}을(를) 버립니다`, 'good');
  } } };
  S['26022'] = { respond: [{ window: 'allyPowerUsed', label: '자원 최대 3 지불 → 1당 저지·공격 +1', can: (g, u, ctx) => ctx.ally === u && g.canAfford({ n: 1, req: '' }, null), async resolve(g, u, ctx) { // Machine Man
    let max = 3; while (max > 0 && !g.canAfford({ n: max, req: '' }, null)) max--; if (!max) return;
    const opts = []; for (let i = 1; i <= max; i++) opts.push({ id: String(i), label: `${i}개 지불 (+${i})` });
    const x = +(await g.ask({ type: 'choice', title: '머신 맨', options: opts })) || 1;
    if (!(await g.pay({ n: x, req: '' }, null, `머신 맨: 자원 ${x}`, false))) return; ctx.bonus += x;
  } }] };
  S['26024'] = { play: { timing: 'action', can: g => g.friendlyChars().some(f => g.hasTrait(f, 'ANDROID')), async resolve(g) { // Reboot
    const c = g.friendlyChars().filter(f => g.hasTrait(f, 'ANDROID')); const t = c.length === 1 ? c[0] : await g.ask({ type: 'target', title: '재부팅: 준비시킬 안드로이드 캐릭터', cands: c, cancelable: false });
    if (g.canReady(t)) g.c(t).ex = false; g.heal(t, 1);
  } } };
  S['26028'] = { // Corrupted Programming
    async whenRevealed(g, u) { g.put(u, 'pobl'); g.log('오염된 프로그래밍: 질량 형태 업그레이드의 텍스트가 비활성화됩니다', 'warn'); },
    actions: [{ timing: 'alter', label: '정체성 소진 → 이 카드를 게임에서 제거', can: (g, u) => g.c(u).zone === 'pobl' && !g.c(g.idt()).ex, async use(g, u) { g.c(g.idt()).ex = true; g.removeFromGame(u); } }]
  };
  const dronesInPlay = g => g.e.env.some(u => g.c(u).id === '01140');
  S['26029'] = { async onAttackStart(g, u) { if (dronesInPlay(g)) { g.log('울트론: 덱 맨 위 카드가 드론이 됩니다', 'warn'); await g.createDrones(1); } } }; // Ultron
  S['26030'] = { async whenRevealed(g) { // Ultron Unleashed
    if (!dronesInPlay(g)) { const x = g.e.deck.concat(g.e.discard, g.e.aside || []).find(u => g.c(u).id === '01140'); if (x) { g.put(x, 'env'); g.log('울트론 드론을 플레이에 놓습니다', 'warn'); } }
    g.shuffle(g.e.deck); await g.forEachPlayer(() => g.createDrones(1));
  } };
  S['26032'] = { async whenRevealed(g) { // Relentless Android
    if (dronesInPlay(g)) { await g.createDrones(2); return; }
    for (let i = 0; i < 2 && g.p.hand.length; i++) { const t = g.p.hand[Math.floor(g.rand() * g.p.hand.length)]; g.put(t, 'discard'); g.log(`무작위로 ${g.nm(t)} 버림`); }
  } };
  S['26033'] = training('Aggression'); // Assault Training
  S['26034'] = { attach: { kind: 'scheme', filter: (g, t) => g.c(t).zone === 'side' && !g.c(t).att.some(a => g.c(a).id === '26034') }, // Chance Encounter
    on: { async attachedDefeated(g, u, ctx) { if (ctx.scheme) await g.searchToHand(d => d.type === 'ally', '우연한 만남', { discard: true }); } } };
  S['26035'] = { play: { timing: 'hero', can: g => g.p.hand.some(x => g.d(x).type === 'ally' && ((g.d(x).tr || []).includes('AVENGER') || (g.d(x).tr || []).includes('GUARDIAN'))), async resolve(g) { // Joining Forces
    for (const [tr, ko] of [['AVENGER', '어벤저'], ['GUARDIAN', '가디언']]) {
      const c = g.p.hand.filter(x => g.d(x).type === 'ally' && (g.d(x).tr || []).includes(tr)); if (!c.length) continue;
      const t = (await g.pickCards(c, `힘을 합쳐: 플레이에 내놓을 [${ko}] 동료`, 0, 1, '선택'))[0]; if (t) await g.putAllyIntoPlay(t);
    }
  } } };
  S['26036'] = { play: { timing: 'alter', can: g => !g.c(g.idt()).ex, async resolve(g, u) { // Meditation
    g.c(g.idt()).ex = true; g.p.costRed = 3;
    const c = g.p.hand.filter(x => x !== u && g.canPlay(x)); if (!c.length) { g.p.costRed = 0; g.log('플레이할 카드가 없습니다'); return; }
    const t = (await g.pickCards(c, '명상: 비용 3 감소로 플레이할 카드', 0, 1, '플레이'))[0];
    if (t) await g.playCard(t); g.p.costRed = 0;
  } } };

  MC.registerScripts(S);
})();
