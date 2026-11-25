/* The Rise of Red Skull (04001-04154): Hawkeye, Spider-Woman, five Hydra scenarios and their modular sets.
   Ported from cards/pack/trors of the community build. The campaign (04155-04166) is at the end of the file. */
(function () {
  'use strict';
  const S = {};
  const ASPECTS = ['Aggression', 'Justice', 'Leadership', 'Protection'];
  const aspectsOf = d => ASPECTS.filter(a => (d.cls || '').split(';').includes(a));
  const isArrowEvent = (g, u) => g.d(u).type === 'event' && (g.d(u).tr || []).includes('ARROW');
  const discardThis = (timing, label, req, extra) => Object.assign({ timing, label, cost: { n: req.length, req }, async use(g, u) { g.discard(u, `${g.nm(u)}을(를) 버렸습니다`); } }, extra || {});
  async function payOrElse(g, title, cost, payLabel, elseLabel, elseFn) {
    const opts = [];
    if (g.canAfford(cost, null)) opts.push({ id: 'pay', label: payLabel });
    opts.push({ id: 'else', label: elseLabel });
    const pick = opts.length === 1 ? 'else' : await g.ask({ type: 'choice', title, options: opts });
    if (pick === 'pay') { const paid = await g.pay(cost, null, title, false); if (paid != null) return true; }
    await elseFn(); return false;
  }
  async function optionalPay(g, title, cost, fn) { // "Response: ... spend X → effect" on captives
    if (!g.canAfford(cost, null)) return;
    const pick = await g.ask({ type: 'choice', title, options: [{ id: 'yes', label: '자원을 지불하고 사용' }, { id: 'no', label: '사용하지 않음' }] });
    if (pick !== 'yes') return;
    const paid = await g.pay(cost, null, title, true); if (paid == null) return;
    await fn();
  }
  const villainTough = (g, heal) => { const v = g.e.villain; if (!v) return; if (!g.giveStatus(v, 'tough', '강인함 획득') && heal) { const h = g.heal(v, heal); if (h) g.log(`${g.nm(v)} 피해 ${h} 회복`); } };
  const hasWeapon = (g, en) => !!en && g.c(en).att.some(a => g.hasTrait(a, 'WEAPON'));
  const host = (g, u) => g.c(u).on;
  const mostThreatSide = g => g.e.sides.slice().sort((a, b) => g.c(b).threat - g.c(a).threat)[0] || null;
  // separate decks kept beside the encounter deck (Experimental Weapons, the side-scheme deck)
  const sub = (g, name) => ((g.e.sub || {})[name] || []).filter(u => g.c(u).zone === 'aside');
  function makeSub(g, name, cards) { cards.forEach(u => { if (g.c(u).zone !== 'aside') g.put(u, 'aside'); }); g.shuffle(cards); g.e.sub = g.e.sub || {}; g.e.sub[name] = cards.slice(); }
  async function revealSub(g, name, label) {
    const u = sub(g, name)[0];
    if (!u) { g.log(`${label}: 남은 카드가 없습니다`); return null; }
    g.log(`${label} 덱 맨 위 카드를 공개합니다 (남은 ${sub(g, name).length - 1}장)`);
    await g.reveal(u); return u;
  }
  async function exhaustCharacters(g, n, title) {
    for (let i = 0; i < n; i++) {
      const c = g.friendlyChars().filter(x => !g.c(x).ex);
      if (!c.length) return;
      const t = c.length === 1 ? c[0] : await g.ask({ type: 'target', title: `${title} (${i + 1}/${n})`, cands: c, cancelable: false });
      g.c(t).ex = true; g.log(`${g.nm(t)} 소진`);
    }
  }
  async function discardControlled(g, filter, title) {
    const c = g.controlled().filter(u => !filter || filter(u));
    if (!c.length) return null;
    const t = c.length === 1 ? c[0] : await g.ask({ type: 'target', title, cands: c, cancelable: false });
    g.discard(t, `${g.nm(t)} 버림`); return t;
  }

  // ======================= Hawkeye (04001-04010, 04026-04030) =======================
  const bowOf = g => g.p.upgrades.find(u => g.c(u).id === '04002');
  const readyBow = g => { const b = bowOf(g); return b && !g.c(b).ex ? b : null; };
  const useBow = g => { const b = readyBow(g); if (b) g.c(b).ex = true; };
  const arrowRanged = g => !!bowOf(g); // "each of your Arrow attacks gain ranged"
  S['04001a'] = { // Hawkeye — Quick Draw
    actions: [{ timing: 'action', exhaustHero: true, label: '호크아이 소진 → 활 준비', can: g => { const b = bowOf(g); return !!b && g.c(b).ex; },
      use(g) { g.c(bowOf(g)).ex = false; g.log('속사: 호크아이의 활 준비', 'good'); } }]
  };
  S['04001b'] = { // Clint Barton — Weapon of Choice
    actions: [{ timing: 'action', once: true, label: '자원 1 → 호크아이의 활 가져오기', cost: { n: 1, req: '' },
      can: g => g.p.deck.concat(g.p.discard).some(x => g.c(x).id === '04002'),
      async use(g) { await g.searchToHand(d => d.id === '04002', '애용하는 무기', { discard: true }); } }]
  };
  S['04002'] = { mod: { atk: (g, self, t) => (t === g.idt() && g.hostOf(self) === t && g.isHero()) ? 1 : 0 } }; // Hawkeye's Bow
  S['04003'] = { // Hawkeye's Quiver
    playFromAttached: true,
    actions: [{ timing: 'hero', exhaust: true, label: '소진 → 덱 위 5장에서 화살 이벤트를 화살통에',
      async use(g, u) {
        const top = g.p.deck.slice(0, 5), arrows = top.filter(x => isArrowEvent(g, x));
        g.log(`화살통: 덱 위 ${top.length}장 — ${top.map(x => g.nm(x)).join(', ')}`);
        if (!arrows.length) return;
        const pick = (await g.pickCards(arrows, '화살통에 넣을 화살 이벤트', 1, 1))[0];
        g.put(pick, 'attach', u); g.log(`${g.nm(pick)}을(를) 화살통에 부착 — 손에 있는 것처럼 플레이할 수 있습니다`, 'good');
      } }]
  };
  S['04004'] = { // Mockingbird (Hawkeye)
    respond: [{ window: 'villainAttackInitiated', label: '자원 1·손으로 되돌림 → 이번 공격 피해 모두 방지', cost: { n: 1, req: '' }, can: (g, u, ctx) => !ctx.preventAll,
      resolve(g, u, ctx) { g.put(u, 'hand'); ctx.preventAll = true; g.log('모킹버드: 손으로 돌아가고 이번 공격의 피해를 모두 막습니다', 'good'); } }]
  };
  const arrowAttack = (dmg, extra) => ({ timing: 'hero', label: 'attack', target: 'attackable', can: g => !!readyBow(g),
    async resolve(g, u, ctx) {
      useBow(g);
      const o = extra ? await extra(g, ctx.target) : {};
      const n = o.n != null ? o.n : dmg;
      g.log(`${g.nm(u)} → ${g.nm(ctx.target)} ${n}`);
      await g.playerAttack(g.idt(), ctx.target, n, { ranged: arrowRanged(g), piercing: !!o.piercing });
    } });
  S['04005'] = { play: arrowAttack(3, async (g, t) => { const was = g.c(t).conf; g.giveStatus(t, 'conf', '혼란'); return { n: was ? 5 : 3 }; }) }; // Sonic Arrow
  S['04006'] = { // Explosive Arrow
    play: { timing: 'hero', can: g => !!readyBow(g),
      async resolve(g, u) {
        const pi = await g.choosePlayer('폭파 화살: 대상 플레이어');
        if (pi == null) return;
        useBow(g);
        for (const x of [g.e.villain].concat(g.engagedMinions(pi)).filter(Boolean)) if (g.c(x).zone) await g.dealDamage(x, 3, { src: u, byPlayer: true });
      } }
  };
  S['04007'] = { play: arrowAttack(3, async (g, t) => { const was = g.c(t).stun; g.giveStatus(t, 'stun', '기절'); return { n: was ? 5 : 3 }; }) }; // Electric Arrow
  S['04008'] = { // Cable Arrow
    play: { timing: 'hero', label: 'thwart', target: { kind: 'scheme', filter: (g, t) => g.c(t).threat > 0 && !g.sc(t).noRemove }, can: g => !!readyBow(g),
      async resolve(g, u, ctx) {
        useBow(g);
        const r = await g.removeThreat(ctx.target, 3, { src: u, ignoreCrisis: true });
        g.log(`케이블 화살: ${g.nm(ctx.target)} 위협 ${r} 제거 (위기 무시)`);
        await g.afterThreatRemoved(ctx.target);
      } }
  };
  S['04009'] = { play: arrowAttack(6, async () => ({ piercing: true })) }; // Vibranium Arrow
  S['04010'] = { // Expert Marksman
    resources: [{ gen: 'G', label: '명사수 (화살 이벤트 전용)', can: (g, u) => !g.c(u).ex, forOnly: (g, u, f) => isArrowEvent(g, f), use: (g, u) => { g.c(u).ex = true; } }]
  };
  S['04026'] = { // Criminal Past (obligation)
    async whenRevealed(g, u) {
      if (g.isHero()) {
        const f = await g.ask({ type: 'choice', title: '범죄 전력: 일상 모습으로 변신할 수 있습니다', options: [{ id: 'flip', label: '클린트 바튼으로 변신' }, { id: 'no', label: '그대로 둔다' }] });
        if (f === 'flip') await g.changeForm(true);
      }
      const opts = [];
      if (!g.isHero() && !g.c(g.idt()).ex) opts.push({ id: 'remove', label: '클린트 바튼 소진 → 이 카드를 게임에서 제거' });
      opts.push({ id: 'bow', label: '플레이 중인 호크아이의 활을 버림 → 이 카드 버림' });
      const pick = opts.length === 1 ? opts[0].id : await g.ask({ type: 'choice', title: '범죄 전력: 하나를 고르세요', options: opts });
      if (pick === 'remove') { g.c(g.idt()).ex = true; g.removeFromGame(u); g.log('범죄 전력을 게임에서 제거', 'good'); }
      else { const b = bowOf(g); if (b) g.discard(b, '호크아이의 활 버림'); g.discard(u); }
    }
  };
  S['04027'] = { // Crossfire
    attackProps: () => ({ piercing: true }),
    boostEffect(g, u, ctx) { if ('undefended' in ctx) { ctx.piercing = true; g.log('★ 강화: 이번 공격은 관통을 얻습니다'); } }
  };
  S['04028'] = { // Marked for Death
    async whenRevealed(g, u) {
      const mb = g.p.hand.concat(g.p.deck, g.p.discard, g.p.allies).find(x => g.c(x).id === '04004');
      if (mb) { g.put(mb, 'under', u); g.log('죽음의 표적: 모킹버드를 이 음모 아래에 둡니다', 'warn'); }
    },
    async whenDefeated(g, u) { for (const x of g.c(u).under.slice()) { g.put(x, 'hand'); g.log(`${g.nm(x)}을(를) 손으로 되돌립니다`, 'good'); } }
  };
  S['04029'] = { // Crossfire's Rifle
    attachTo: g => g.e.minions.find(m => g.c(m).id === '04027') || g.e.villain,
    attackProps: () => ({ ranged: true }),
    actions: [discardThis('hero', '히어로 소진·와일드 1 → 버리기', 'G', { exhaustHero: true })]
  };
  S['04030'] = { // Sniper Shot
    async whenRevealedAlter(g) { await g.placeThreat(g.e.main, 3, {}); },
    async whenRevealedHero(g, u) { await g.dealDamage(g.idt(), 3, { src: u }); }
  };

  // ======================= Spider-Woman (04031-04039, 04053-04056) =======================
  S['04031a'] = { // Spider-Woman — Superhuman Agility
    on: { cardPlayed(g, u, ctx) {
      if (u !== g.idt() || !g.isHero()) return;
      for (const a of aspectsOf(g.d(ctx.card))) {
        const k = 'sw:' + a; if (g.p.usedOnce[k]) continue;
        g.p.usedOnce[k] = true;
        ['thw', 'atk', 'def'].forEach(s => g.addRoundMod(u, s, 1));
        g.log(`초인적 민첩성 (${MC.ASPECT_KO ? MC.ASPECT_KO[a] || a : a}): 라운드 끝까지 저지·공격·방어 +1`, 'good');
      }
    } }
  };
  S['04031b'] = { // Jessica Drew — look at the top card of any deck
    actions: [{ timing: 'action', once: true, label: '아무 덱의 맨 위 카드 보기',
      async use(g) {
        const opts = g.livingPlayers().map(pi => ({ id: 'p:' + pi, label: pi === g.s.ctx ? '내 덱' : `${g.playerName(pi)} 덱` })).concat([{ id: 'e', label: '조우 덱' }]);
        const pick = opts.length === 1 ? opts[0].id : await g.ask({ type: 'choice', title: '어느 덱의 맨 위 카드를 볼까요?', options: opts });
        if (!pick) return;
        const isEnc = pick === 'e', pi = isEnc ? null : +pick.slice(2);
        const deck = isEnc ? g.e.deck : (g.s.ps[pi] || {}).deck || [];
        const label = isEnc ? '조우 덱' : (pi === g.s.ctx ? '내 덱' : `${g.playerName(pi)} 덱`);
        const top = deck[0];
        if (!top) { g.log(`${label}이 비어 있습니다`); return; }
        g.log(`${label} 맨 위: ${g.nm(top)}`);
        await g.show({ type: 'reveal', uid: top, title: `${label} 맨 위 카드` });
      } }]
  };
  S['04032'] = { on: { async allyBasicPower(g, u, ctx) { if (ctx.ally === u) { await g.draw(1); g.log('캡틴 마블: 카드 1장 뽑음', 'good'); } } } }; // Captain Marvel (ally)
  S['04033'] = { // Finesse
    resources: [{ gen: 'G', label: '기교 (성향 카드 전용)', can: (g, u) => g.isHero() && !g.c(u).ex, forOnly: (g, u, f) => aspectsOf(g.d(f)).length > 0, use: (g, u) => { g.c(u).ex = true; } }]
  };
  S['04034'] = { // Jessica Drew's Apartment
    actions: [{ timing: 'alter', exhaust: true, label: '소진 → 덱 위 5장에서 성향 카드 1장 가져오기',
      async use(g) {
        const top = g.p.deck.slice(0, 5), ok = top.filter(x => aspectsOf(g.d(x)).length);
        if (ok.length) { const x = (await g.pickCards(ok, '손으로 가져올 성향 카드', 1, 1))[0]; g.put(x, 'hand'); g.log(`제시카 드루의 집: ${g.nm(x)}을(를) 손으로`, 'good'); }
        else g.log('제시카 드루의 집: 덱 위 5장에 성향 카드가 없습니다');
        g.shuffle(g.p.deck);
      } }]
  };
  S['04035'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { await g.playerAttack(g.idt(), ctx.target, 5, {}); } } }; // Venom Blast
  S['04036'] = { play: { timing: 'hero', target: 'enemy', resolve(g, u, ctx) { g.giveStatus(ctx.target, 'stun', '기절'); g.giveStatus(ctx.target, 'conf', '혼란'); } } }; // Pheromones
  S['04037'] = { play: { timing: 'hero', resolve(g) { const h = g.heal(g.idt(), 3); g.log(`오염 면역: 피해 ${h} 회복`, 'good'); g.giveStatus(g.idt(), 'tough', '강인함 획득'); } } }; // Contaminant Immunity
  S['04038'] = { // Inconspicuous
    play: { timing: 'hero', label: 'thwart', can: g => g.targets('thwartable').length > 0,
      async resolve(g, u) {
        for (let i = 0; i < 3 && g.targets('thwartable').length; i++) {
          const t = await g.chooseTarget('thwartable', `눈에 띄지 않게: 위협 1을 제거할 음모 (${i + 1}/3)`, u, false);
          if (!t) break;
          await g.removeThreat(t, 1, { src: u }); g.log(`${g.nm(t)} 위협 1 제거`); await g.afterThreatRemoved(t);
        }
      } }
  };
  S['04039'] = { // Self-Propelled Glide
    play: { timing: 'hero', resolve(g) { if (g.canReady(g.idt())) g.c(g.idt()).ex = false; g.addRoundMod(g.idt(), 'tr:AERIAL', 1); g.log('자체 추진 활공: 스파이더우먼 준비, 라운드 끝까지 [공중]', 'good'); } }
  };
  S['04053'] = { // Uncertain Loyalties
    async whenRevealed(g, u) {
      const opts = [];
      if (!g.isHero() && !g.c(g.idt()).ex) opts.push({ id: 'remove', label: '제시카 드루 소진 → 이 카드를 게임에서 제거' });
      opts.push({ id: 'threat', label: '주 음모에 위협 3 → 이 카드 버림' });
      const pick = opts.length === 1 ? opts[0].id : await g.ask({ type: 'choice', title: '불확실한 충성: 하나를 고르세요', options: opts });
      if (pick === 'remove') { g.c(g.idt()).ex = true; g.removeFromGame(u); g.log('불확실한 충성을 게임에서 제거', 'good'); }
      else { await g.placeThreat(g.e.main, 3, {}); g.discard(u); }
    }
  };
  S['04054'] = { mod: { hs: (g, self, t) => (t === g.idt() && g.c(self).zone === 'minion') ? -1 : 0 } }; // The Viper
  S['04055'] = { async whenRevealed(g, u) { await g.placeThreat(u, 1 * g.players, {}); } }; // The Viper's Ambition

  // ======================= Leadership / Aggression / Justice / Basic =======================
  S['04011'] = { // Hawkeye (ally)
    actions: [{ timing: 'action', exhaust: true, label: '소진·손 1장 버림 → 그 카드 자원 수만큼 적에게 피해', target: 'enemy', can: g => g.p.hand.length > 0,
      async use(g, u, ctx) {
        const c = (await g.discardFromHand(1, 1, '호크아이: 버릴 카드 (자원 수 = 피해)'))[0]; if (!c) return;
        const n = (g.d(c).res || '').length;
        if (n) await g.dealDamage(ctx.target, n, { src: u, byPlayer: true }); else g.log('자원이 없는 카드라 피해 없음');
      } }]
  };
  S['04012'] = { basicAttackProps: { piercing: true } }; // Black Knight
  S['04013'] = { // Goliath
    actions: [{ timing: 'action', once: true, label: '이번 단계 공격 +4 (단계 끝에 버려짐)',
      use(g, u) { g.addPhaseMod(u, 'atk', 4); g.p.phase = g.p.phase || {}; (g.p.phase.goliath = g.p.phase.goliath || []).push(u); g.log('골리앗: 이번 단계 공격 +4', 'good'); } }],
    on: { playerPhaseEnd(g, u) { if (g.p.phase && (g.p.phase.goliath || []).includes(u) && g.c(u).zone === 'ally') g.discard(u, '골리앗: 단계가 끝나 버려짐'); } }
  };
  S['04015'] = { // Sky Cycle
    attach: { kind: 'ally', filter: (g, t) => g.hasTrait(t, 'AVENGER') && !g.c(t).att.some(a => g.c(a).id === '04015') },
    grantTrait: (g, self, t) => g.c(self).on === t ? 'AERIAL' : null,
    actions: [{ timing: 'action', exhaust: true, label: '소진 → 부착된 동료 준비', can: (g, u) => { const h = g.c(u).on; return !!h && g.c(h).ex && g.canReady(h); },
      use(g, u) { g.c(g.c(u).on).ex = false; g.log(`스카이 사이클: ${g.nm(g.c(u).on)} 준비`, 'good'); } }]
  };
  S['04016'] = { mod: { hp: (g, self, t) => g.c(t).zone === 'ally' ? 1 : 0 } }; // Team Training
  S['04017'] = { play: { timing: 'hero', target: { kind: 'ally', filter: (g, t) => !g.c(t).tough }, resolve(g, u, ctx) { g.giveStatus(ctx.target, 'tough', '강인함 획득'); } } }; // Ready for Action
  S['04020'] = { basicAttackProps: { ranged: true } }; // War Machine
  const avChars = g => g.friendlyChars().filter(x => g.hasTrait(x, 'AVENGER'));
  S['04022'] = { // Earth's Mightiest Heroes
    play: { timing: 'hero', can: g => { const a = avChars(g); return a.some(x => !g.c(x).ex) && a.some(x => g.c(x).ex && g.canReady(x)); },
      async resolve(g) {
        const rdy = avChars(g).filter(x => !g.c(x).ex);
        const e = rdy.length === 1 ? rdy[0] : await g.ask({ type: 'target', title: '지구 최강의 영웅들: 소진할 어벤저스 캐릭터', cands: rdy, cancelable: false });
        g.c(e).ex = true;
        const ex = avChars(g).filter(x => x !== e && g.c(x).ex && g.canReady(x));
        if (!ex.length) return;
        const r = ex.length === 1 ? ex[0] : await g.ask({ type: 'target', title: '준비시킬 다른 어벤저스 캐릭터', cands: ex, cancelable: false });
        g.c(r).ex = false; g.log(`${g.nm(e)} 소진 → ${g.nm(r)} 준비`, 'good');
      } }
  };
  S['04040'] = { // Spider-Girl
    async onPlay(g) {
      const c = g.e.minions.slice(); if (!c.length) return;
      const t = c.length === 1 ? c[0] : await g.ask({ type: 'target', title: '스파이더걸: 기절·혼란시킬 하수인', cands: c, cancelable: false });
      g.giveStatus(t, 'stun', '기절'); g.giveStatus(t, 'conf', '혼란');
    }
  };
  S['04043'] = { // Press the Advantage
    play: { timing: 'hero', label: 'attack', target: 'attackable',
      async resolve(g, u, ctx) { const st = g.c(ctx.target).stun || g.c(ctx.target).conf; await g.playerAttack(g.idt(), ctx.target, 2, {}); if (st) { await g.draw(1); g.log('우위 점하기: 카드 1장 뽑음', 'good'); } } }
  };
  S['04044'] = { play: { timing: 'hero', label: 'attack', target: 'attackable', async resolve(g, u, ctx) { await g.playerAttack(g.idt(), ctx.target, 3, { piercing: true }); } } }; // Piercing Strike
  S['04045'] = { // Spider-Man (ally)
    async onPlay(g, u) {
      const c = g.e.sides.filter(x => g.c(x).threat > 0 && !g.sc(x).noRemove); if (!c.length) return;
      const t = c.length === 1 ? c[0] : await g.ask({ type: 'target', title: '스파이더맨: 위협을 제거할 부가 음모', cands: c, cancelable: false });
      const r = await g.removeThreat(t, 3 * g.players, { src: u }); g.log(`스파이더맨: ${g.nm(t)} 위협 ${r} 제거`); await g.afterThreatRemoved(t);
    }
  };
  S['04047'] = { respond: [{ window: 'sideSchemeDefeated', timing: 'hero', exhaust: true, label: '소진 → 카드 1장 뽑기', async resolve(g) { await g.draw(1); } }] }; // Skilled Investigator
  S['04049'] = { // Clear the Area
    play: { timing: 'hero', label: 'thwart', target: 'thwartable',
      async resolve(g, u, ctx) {
        const r = await g.removeThreat(ctx.target, 2, { src: u }); g.log(`지역 정리: ${g.nm(ctx.target)} 위협 ${r} 제거`);
        const last = r > 0 && g.c(ctx.target).threat === 0;
        await g.afterThreatRemoved(ctx.target);
        if (last) { await g.draw(1); g.log('마지막 위협을 제거해 카드 1장 뽑음', 'good'); }
      } }
  };

  // ======================= Crossbones (04058-04075) =======================
  const EW = ['04072', '04073', '04074', '04075'];
  const crossbones = { attackProps: (g, v) => hasWeapon(g, v) ? { piercing: true } : null };
  S['04058'] = crossbones;
  S['04059'] = Object.assign({ async whenRevealed(g) {
    const mg = g.searchEncounter(d => d.id === '04064');
    if (mg && g.e.villain) { g.log('크로스본즈 II: 기관총을 찾아 부착합니다'); g.attachEnc(mg, g.e.villain); }
    g.shuffle(g.e.deck);
  } }, crossbones);
  S['04060'] = Object.assign({ async whenRevealed(g) { await revealSub(g, 'ew', '실험 무기'); } }, crossbones);
  S['04061a'] = { setup(g) { makeSub(g, 'ew', g.e.deck.filter(u => EW.includes(g.c(u).id))); g.log('준비: 실험 무기 카드 4장을 따로 섞어 실험 무기 덱을 만듭니다'); } };
  S['04062b'] = { async whenRevealed(g) { await revealSub(g, 'ew', '실험 무기'); } };
  S['04063b'] = { async whenRevealed(g) { await revealSub(g, 'ew', '실험 무기'); } };
  S['04064'] = { // Crossbones' Machine Gun
    on: { async enemyAttacks(g, u, ctx) {
      if (ctx.enemy !== host(g, u) || ctx.enemy !== g.e.villain) return;
      const c = g.c(u); if (!(c.cnt.ammo > 0)) return;
      c.cnt.ammo--;
      const n = await g.countBoost(g.discardEncounterN(1));
      g.log(`기관총: 탄약 1 사용 (남은 ${c.cnt.ammo}) → 간접 피해 ${n}`, 'warn');
      if (n) await g.indirectDamage(n, u);
      if (c.cnt.ammo <= 0 && c.zone) g.discard(u, '기관총: 탄약이 떨어져 버려짐');
    } }
  };
  S['04065'] = { // Crossbones' Armor
    on: { wouldTakeDamage(g, u, ctx) {
      if (ctx.target !== host(g, u) || ctx.prevent >= ctx.amount) return;
      const n = ctx.amount - ctx.prevent; ctx.prevent = ctx.amount;
      const c = g.c(u); c.cnt.damage = (c.cnt.damage || 0) + n;
      g.log(`크로스본즈의 갑옷이 피해 ${n}을(를) 대신 받음 (${c.cnt.damage}/5)`);
      if (c.cnt.damage >= 5) g.discard(u, '크로스본즈의 갑옷 파괴');
    } }
  };
  S['04067'] = { // Full Auto
    async whenRevealedAlter(g, u, ctx) { ctx.surge++; },
    async whenRevealedHero(g, u) { const x = g.e.villain ? g.stat(g.e.villain, 'atk') : 0; const n = await g.countBoost(g.discardEncounterN(x)); if (n) await g.indirectDamage(n, u); }
  };
  S['04068'] = { whenRevealed(g) { villainTough(g, 3); }, boostEffect(g) { villainTough(g, 3); } }; // Hard as Nails
  S['04069'] = { // Raid the Armory
    async whenRevealed(g) { const w = g.discardEncounterUntil(d => d.type === 'attachment' && (d.tr || []).includes('WEAPON')); if (w) { g.log(`무기고 습격: ${g.nm(w)} 공개`); await g.reveal(w); } }
  };
  S['04070'] = { async whenDefeated(g) { if (g.e.villain) { g.log('크로스본즈의 습격: 크로스본즈가 활성화합니다', 'warn'); await g.activate(g.e.villain, {}); } } }; // Crossbones' Assault
  S['04071'] = { async whenRevealed(g, u) { const n = await g.countBoost(g.discardEncounterN(1 * g.players)); if (n) await g.placeThreat(u, n, {}); } }; // Cornered Staff
  S['04072'] = { attackProps: () => ({ ranged: true }), actions: [discardThis('hero', '에너지·물리 → 버리기', 'YR')] }; // Laser Rifle
  S['04073'] = { mod: { retaliate: (g, self, t) => host(g, self) === t ? 1 : 0 }, actions: [discardThis('hero', '에너지·정신 → 버리기', 'YB')] }; // Energy Shield
  S['04074'] = { // Power Gauntlets
    on: { async afterEnemyAttack(g, u, ctx) { if (ctx.enemy === host(g, u) && ctx.damaged.includes(g.idt())) await g.discardFromHand(1, 1, '파워 건틀릿: 손에서 1장 버리기'); } },
    actions: [discardThis('hero', '정신·물리 → 버리기', 'BR')]
  };
  S['04075'] = { actions: [discardThis('hero', '에너지·정신·물리 → 버리기', 'YBR')] }; // Exo-Suit

  // ======================= Absorbing Man (04076-04092) =======================
  const isAM = g => !!g.e.villain && ['04076', '04077', '04078'].includes(g.c(g.e.villain).id);
  const amHas = (g, t) => isAM(g) && g.hasTrait(g.e.villain, t);
  const delay = g => (g.e.main && g.c(g.e.main).cnt.delay) || 0;
  const big = g => delay(g) >= 5;
  const absorb = { grantTrait: (g, self, t) => t === self ? g.e.env.flatMap(x => g.d(x).tr || []) : null };
  S['04076'] = absorb;
  S['04077'] = Object.assign({ async whenRevealed(g) {
    if (g.e.sides.some(x => g.c(x).id === '04092')) { await g.forEachPlayer(() => g.dealEncounterCard()); return; }
    const sap = g.searchEncounter(d => d.id === '04092');
    if (sap) { g.log('흡수인간 II: 초흡수 능력을 찾아 공개합니다'); await g.reveal(sap); }
    g.shuffle(g.e.deck);
  } }, absorb);
  const amAfter = async (g, u, ctx) => {
    if (ctx.enemy !== u) return;
    if (amHas(g, 'ICE') || amHas(g, 'STONE')) await g.placeThreat(g.e.main, 1, {});
    if (amHas(g, 'METAL') || amHas(g, 'WOOD')) await g.indirectDamage(1, u);
  };
  S['04078'] = Object.assign({ on: { afterEnemyAttack: amAfter, afterEnemyScheme: amAfter } }, absorb);
  S['04079b'] = { // None Shall Pass
    on: {
      mainStep1(g, u) { if (u !== g.e.main) return; const c = g.c(u); c.cnt.delay = (c.cnt.delay || 0) + 1; g.log(`아무도 지나갈 수 없다: 지연 카운터 +1 (${c.cnt.delay})`); },
      environmentEnters(g, u, ctx) { for (const x of g.e.env.slice()) if (x !== ctx.env) g.discard(x, `${g.nm(x)}: 다른 환경이 들어와 버려짐`); }
    }
  };
  const environment = (fn) => ({
    on: { async afterEnemyAttack(g, u, ctx) { if (ctx.enemy === g.e.villain && isAM(g) && ctx.undefended) await fn(g, u, big(g) ? 2 : 1); } },
    boostEffect(g, u, ctx) { (ctx.putIntoPlay = ctx.putIntoPlay || []).push(u); g.log(`★ 강화: ${g.nm(u)}이(가) 플레이 영역에 들어옵니다`); }
  });
  S['04080'] = environment(async (g, u, n) => g.indirectDamage(n, u)); // Dense Forest
  S['04081'] = environment(async (g, u, n) => { await g.placeThreat(g.e.main, n, {}); }); // Snowy Hillside
  S['04082'] = environment(async (g, u, n) => { const h = g.heal(g.e.villain, n); if (h) g.log(`${g.nm(g.e.villain)} 피해 ${h} 회복`); }); // Rocky Outcrop
  S['04083'] = environment(async (g, u, n) => g.discardResourcesFromHand(n, null, `버려진 시설: 자원 ${n}개 버리기`)); // Abandoned Facility
  S['04084'] = { // Ball and Chain
    attachTo: g => isAM(g) ? g.e.villain : null,
    actions: [{ timing: 'hero', label: '물리 → 조우 덱에 섞어 넣기', cost: { n: 1, req: 'R' }, use(g, u) { g.put(u, 'edeck'); g.shuffle(g.e.deck); g.log('철구와 사슬을 조우 덱에 섞어 넣었습니다'); } }],
    boostEffect(g, u, ctx) { (ctx.revealAfter = ctx.revealAfter || []).push(u); g.log('★ 강화: 이 카드를 공개합니다'); }
  };
  S['04085'] = { // Stall Tactics
    async whenRevealed(g, u, ctx) { const n = Math.floor(delay(g) / 2); if (n) await g.placeThreat(g.e.main, n, {}); else { g.log('놓인 위협이 없어 쇄도'); ctx.surge++; } },
    async boostEffect(g, u) { if (big(g)) await g.indirectDamage(1, u); }
  };
  S['04086'] = { // Swinging Stone
    async whenRevealedAlter(g) { if (g.e.villain) await g.enemyScheme(g.e.villain, { schBonus: amHas(g, 'STONE') ? 1 : 0 }); },
    async whenRevealedHero(g) { if (g.e.villain) await g.enemyAttack(g.e.villain, { atkBonus: amHas(g, 'STONE') ? 1 : 0 }); }
  };
  S['04087'] = { // Steel Kick
    async whenRevealedAlter(g) { await g.placeThreat(g.e.main, amHas(g, 'METAL') ? 3 : 2, {}); },
    async whenRevealedHero(g, u) { await g.indirectDamage(amHas(g, 'METAL') ? 4 : 3, u); }
  };
  S['04088'] = { // Piercing Thorns
    async whenRevealed(g) { await g.discardRandomHand(1); if (amHas(g, 'WOOD')) await discardControlled(g, null, '가시: 버릴 내 카드'); },
    boostEffect(g) { if (amHas(g, 'STONE') || amHas(g, 'WOOD')) g.giveStatus(g.idt(), 'stun', '★ 강화: 기절'); }
  };
  S['04089'] = { // Omni-Morph Duplication
    async whenRevealed(g) {
      if (amHas(g, 'ICE')) { g.c(g.idt()).ex = true; g.log('얼음: 아이덴티티 소진'); }
      if (amHas(g, 'METAL')) villainToughHeal(g);
      if (amHas(g, 'STONE')) g.giveFacedownBoost(1);
      if (amHas(g, 'WOOD')) await g.discardRandomHand(1);
    }
  };
  function villainToughHeal(g) { const v = g.e.villain; g.giveStatus(v, 'tough', '강인함 획득'); const h = g.heal(v, 1); if (h) g.log(`${g.nm(v)} 피해 1 회복`); }
  S['04090'] = { // Icy Grip
    async whenRevealed(g, u) { g.giveStatus(g.idt(), 'stun', '기절'); if (amHas(g, 'ICE')) await g.indirectDamage(2, u); },
    boostEffect(g) { if (amHas(g, 'ICE') || amHas(g, 'METAL')) villainTough(g, 0); }
  };
  S['04091'] = { async whenRevealed(g, u) { const n = big(g) ? 3 : 2; await g.forEachPlayer(async () => { await payOrElse(g, '눈사태!', { n: 1, req: 'Y' }, '에너지 자원 지불', `간접 피해 ${n}`, () => g.indirectDamage(n, u)); }); } }; // Avalanche!
  S['04092'] = { // Super Absorbing Power
    grantTrait: (g, self, t) => (t === g.e.villain && isAM(g)) ? ['ICE', 'METAL', 'STONE', 'WOOD'] : null,
    boostEffect(g, u, ctx) { (ctx.revealAfter = ctx.revealAfter || []).push(u); g.log('★ 강화: 이 카드를 공개합니다'); }
  };

  // ======================= Taskmaster (04093-04108) =======================
  const tmFlip = { on: { async formChanged(g, u, ctx) {
    if (ctx.form !== 'hero') return;
    const n = await g.countBoost(g.discardEncounterN(1));
    g.log(`태스크마스터: 히어로로 변신하자 피해 ${n}`, 'warn');
    if (n) await g.dealDamage(g.idt(), n, { src: u });
  } } };
  S['04093'] = tmFlip;
  S['04094'] = Object.assign({ async whenRevealed(g) { await g.forEachPlayer(() => g.dealEncounterCard()); } }, tmFlip);
  S['04095'] = Object.assign({ async whenRevealed(g) { await g.forEachPlayer(() => g.dealEncounterCard()); } }, tmFlip);
  S['04096b'] = { // Hunting Down Heroes
    on: { async mainStep1(g, u) {
      if (u !== g.e.main) return;
      await g.forEachPlayer(async () => {
        if (!g.isHero()) return;
        const pick = await g.ask({ type: 'choice', title: '영웅 사냥: 하나를 고르세요', options: [{ id: 't', label: '이 음모에 위협 1' }, { id: 'd', label: '피해 1 받기' }] });
        if (pick === 'd') await g.dealDamage(g.idt(), 1, { src: u }); else await g.placeThreat(u, 1, {});
      });
    } }
  };
  S['04097'] = { async onPlay(g) { await optionalPay(g, '문 나이트: 와일드 자원 → 카드 2장 뽑기', { n: 1, req: 'G' }, async () => { await g.draw(2); }); } };
  S['04098'] = { async onPlay(g, u) { if (!g.enemies().length) return; await optionalPay(g, '샹치: 에너지 자원 → 적 기절', { n: 1, req: 'Y' }, async () => { const t = await g.chooseTarget('enemy', '샹치: 기절시킬 적', u, false); if (t) g.giveStatus(t, 'stun', '기절'); }); } };
  S['04099'] = { async onPlay(g, u) { if (!g.targets('thwartable').length) return; await optionalPay(g, '화이트 타이거: 정신 자원 → 위협 3 제거', { n: 1, req: 'B' }, async () => { await g.removeThreatChoose(3, '화이트 타이거: 위협 3을 제거할 음모', u); }); } };
  S['04100'] = { async onPlay(g, u) { if (!g.enemies().length) return; await optionalPay(g, '엘렉트라: 물리 자원 → 적에게 피해 3', { n: 1, req: 'R' }, async () => { const t = await g.chooseTarget('enemy', '엘렉트라: 피해 3을 줄 적', u, false); if (t) await g.dealDamage(t, 3, { src: u, byPlayer: true }); }); } };
  S['04101'] = { // Hydra Hunter
    attackProps: () => ({ piercing: true, ranged: true }),
    async boostEffect(g, u) { if (g.isHero()) await g.dealDamage(g.idt(), 1, { src: u }); else await g.placeThreat(g.e.main, 1, {}); }
  };
  S['04102'] = { attackProps: () => ({ piercing: true }), actions: [discardThis('hero', '히어로 소진·정신·물리 → 버리기', 'BR', { exhaustHero: true })] }; // Taskmaster's Sword
  S['04103'] = { mod: { retaliate: (g, self, t) => host(g, self) === t ? 1 : 0 }, actions: [discardThis('hero', '히어로 소진·정신·물리 → 버리기', 'BR', { exhaustHero: true })] }; // Taskmaster's Shield
  S['04104'] = { // Photographic Reflexes
    on: { async wouldTakeDamage(g, u, ctx) {
      if (ctx.target !== host(g, u) || !ctx.attack || !ctx.byPlayer || ctx.prevent >= ctx.amount || !g.c(u).zone) return;
      const n = ctx.amount - ctx.prevent; ctx.prevent = ctx.amount;
      g.discard(u, '사진 같은 반사신경: 공격 피해를 되돌리고 버려짐');
      await g.dealDamage(g.idt(), n, { src: g.e.villain });
    } }
  };
  S['04105'] = { // Mimicry
    async whenRevealedAlter(g) { const out = await g.discardDeckTop(5); if (g.e.villain && out.some(x => g.hasTrait(x, 'THWART'))) await g.enemyScheme(g.e.villain, {}); },
    async whenRevealedHero(g) { const out = await g.discardDeckTop(5); if (g.e.villain && out.some(x => g.hasTrait(x, 'ATTACK'))) await g.enemyAttack(g.e.villain, {}); }
  };
  S['04106'] = { async whenRevealed(g, u) { await g.forEachPlayer(async () => { if (!g.isHero()) return; await g.dealDamage(g.idt(), 1, { src: u }); await g.discardRandomHand(1); }); } }; // Hunted by Hydra
  S['04107'] = { // Captured by Hydra
    whenRevealed(g, u) {
      const caps = g.e.aside.filter(x => g.hasTrait(x, 'CAPTIVE'));
      if (!caps.length) return;
      const x = caps[Math.floor(g.rand() * caps.length)];
      g.put(x, 'under', u); g.log('하이드라에 붙잡힘: 붙잡힌 동료 1명을 뒷면으로 이 음모 아래에 둡니다');
    },
    whenDefeated(g, u) {
      for (const x of g.c(u).under.slice()) { g.put(x, 'hand'); g.log(`${g.nm(x)}을(를) 구출해 손으로 가져옵니다`, 'good'); }
      g.removeFromGame(u);
    }
  };
  S['04108'] = { on: { minionEnters(g, u, ctx) { g.giveStatus(ctx.minion, 'tough', '훈련 캠프: 강인함 획득'); } } }; // Taskmaster's Training Camp

  // ======================= Zola (04109-04124) =======================
  const addTest = (g, n) => { const m = g.e.main; if (!m) return 0; const c = g.c(m); c.cnt.test = (c.cnt.test || 0) + (n || 1); g.log(`실험 카운터 +${n || 1} (${c.cnt.test})`); return c.cnt.test; };
  S['04110'] = { async whenRevealed(g) { const t = g.searchEncounter(d => d.id === '04123'); if (t) { g.log('졸라 II: 실험체 부가 음모를 공개합니다'); await g.reveal(t); } g.shuffle(g.e.deck); } };
  S['04111'] = { async whenRevealed(g) { await g.forEachPlayer(async () => { const m = g.searchEncounter(d => d.type === 'minion'); if (m) { g.log(`졸라 III: ${g.nm(m)} 공개`); await g.reveal(m); } }); g.shuffle(g.e.deck); } };
  const zolaMain = { on: { async mainStep1(g, u) {
    if (u !== g.e.main) return;
    const n = addTest(g, 1);
    if (n < 3) return;
    const m = g.discardEncounterUntil(d => d.type === 'minion');
    g.c(u).cnt.test -= 3;
    if (m) { g.log(`실험 카운터 3개: ${g.nm(m)}이(가) 교전합니다`, 'warn'); await g.enterMinion(m, {}, true); }
  } } };
  S['04112b'] = zolaMain; S['04113b'] = zolaMain;
  S['04114'] = { mod: { atk: (g, self, t) => t === self ? g.c(self).att.length : 0 }, boostEffect(g) { villainTough(g, 0); } }; // Ultimate Bio-Servant
  S['04115'] = { // Zola's Mutate
    whenRevealed(g, u) { const t = g.discardEncounterUntil(d => d.type === 'attachment' && (d.tr || []).includes('TECH')); if (t && g.c(u).zone === 'minion') g.attachEnc(t, u); },
    boostEffect(g, u, ctx) { (ctx.shuffleBack = ctx.shuffleBack || []).push(u); }
  };
  S['04116'] = { boostEffect(g) { const n = addTest(g, 1); g.log(`★ 강화: 실험 카운터 ${n}개만큼 이번 활성화 +${n}`); return n; } }; // Berserk Mutate
  const tech = (id, extra) => Object.assign({
    surgeIfNoHost: true,
    attachTo(g) {
      const c = g.e.minions.filter(m => !g.c(m).att.some(a => g.c(a).id === id));
      if (!c.length) return null;
      return c.reduce((b, m) => g.hpLeft(m) > g.hpLeft(b) ? m : b, c[0]);
    },
    mod: Object.assign({ hp: (g, self, t) => host(g, self) === t ? 2 : 0 }, (extra && extra.mod) || {})
  }, extra && extra.rest);
  S['04117'] = tech('04117', { rest: { grantGuard: true } }); // Defensive Programming
  S['04118'] = tech('04118', { mod: { retaliate: (g, self, t) => host(g, self) === t ? 1 : 0 } }); // Pain Inhibitors
  S['04119'] = tech('04119'); // Neurological Implants
  S['04120'] = { // Mind Ray
    async whenRevealedAlter(g) { if (g.e.villain) await g.enemyScheme(g.e.villain, {}); g.giveStatus(g.idt(), 'conf', '혼란'); },
    async whenRevealedHero(g) { if (g.e.villain) await g.enemyAttack(g.e.villain, {}); g.giveStatus(g.idt(), 'stun', '기절'); }
  };
  S['04121'] = { whenRevealed(g) { addTest(g, 1); }, boostEffect(g) { addTest(g, 1); } }; // Technological Enhancements
  S['04122'] = { // Hydra Prison
    async whenRevealed(g, u) {
      await g.forEachPlayer(async () => {
        const c = g.p.deck.concat(g.p.discard, g.p.hand).filter(x => g.d(x).type === 'ally' && g.d(x).cls === 'Hero');
        if (c.length) {
          const x = (await g.pickCards(c, '하이드라 감옥: 가둘 히어로 전용 동료', 1, 1))[0];
          g.put(x, 'under', u); g.log(`하이드라 감옥: ${g.nm(x)}을(를) 이 음모 아래에 가둡니다`, 'warn');
        }
        g.shuffle(g.p.deck);
      });
      const n = g.c(u).under.reduce((t, y) => t + (g.d(y).cost || 0), 0);
      if (n) await g.placeThreat(u, n, {});
    },
    whenDefeated(g, u) { for (const x of g.c(u).under.slice()) { g.put(x, 'hand'); g.log(`${g.nm(x)}을(를) 손으로 되찾습니다`, 'good'); } g.removeFromGame(u); }
  };
  S['04123'] = { async whenDefeated(g) { await g.withPlayer(g.s.first, async () => { const m = g.discardEncounterUntil(d => d.type === 'minion'); if (m) await g.reveal(m); }); } }; // Test Subjects
  S['04124'] = { on: { minionEnters(g, u, ctx) { // Zola's Experiments
    const t = g.e.discard.slice().reverse().find(x => g.d(x).type === 'attachment' && (g.d(x).tr || []).includes('TECH'));
    if (t && g.c(ctx.minion).zone === 'minion') { g.log('졸라의 실험: 버림 더미의 기술 부착물을 새 하수인에게'); g.attachEnc(t, ctx.minion); }
  } } };

  // ======================= Red Skull (04125-04144) =======================
  const skull = { mod: { atk: (g, self, t) => t === self ? g.e.sides.length : 0 } };
  S['04125'] = skull;
  S['04126'] = Object.assign({ async whenRevealed(g) { await g.forEachPlayer(() => g.dealEncounterCard()); } }, skull);
  S['04127'] = Object.assign({ async whenRevealed(g) { await g.forEachPlayer(() => g.dealEncounterCard()); } }, skull);
  const SS = ['04140', '04141', '04142', '04143', '04144'];
  S['04128a'] = { async setup(g) {
    const rh = g.e.aside.find(u => g.c(u).id === '04139');
    makeSub(g, 'ss', g.e.aside.filter(u => SS.includes(g.c(u).id)));
    if (rh) { g.log('준비: 레드 하우스를 플레이 영역에 둡니다'); await g.enterSide(rh, {}); }
    g.log('준비: 나머지 부가 음모 5장으로 부가 음모 덱을 만듭니다');
  } };
  const nextSide = async g => { await revealSub(g, 'ss', '부가 음모'); };
  const skullMain = { on: { async mainStep1(g, u) { if (u === g.e.main) await nextSide(g); } } };
  S['04128b'] = skullMain;
  S['04129a'] = { async whenRevealed(g) { await nextSide(g); } };
  S['04129b'] = skullMain;
  S['04130'] = { // The Sleeper
    whenDefeated(g, u) {
      g.removeFromGame(u);
      const aw = g.e.sides.find(x => g.c(x).id === '04140'); if (aw) { g.removeFromGame(aw); g.log('잠든 자가 깨어나다를 게임에서 제거'); }
    }
  };
  S['04131'] = { boostEffect(g, u, ctx) { villainTough(g, 0); ctx.extraBoost = (ctx.extraBoost || 0) + 1; g.log('★ 강화: 강화 카드 1장 추가'); } }; // Hydra Exo-Soldier
  S['04132'] = { // Red Skull's Luger
    attackProps: () => ({ piercing: true, ranged: true }),
    actions: [discardThis('hero', '에너지·정신·물리 → 버리기', 'YBR')],
    boostEffect(g, u, ctx) { (ctx.putIntoPlay = ctx.putIntoPlay || []).push(u); g.log('★ 강화: 레드 스컬의 루거를 부착합니다'); }
  };
  S['04133'] = { mod: { retaliate: (g, self, t) => host(g, self) === t ? 1 : 0 }, actions: [discardThis('hero', '에너지·정신·물리 → 버리기', 'YBR')] }; // Right Hook
  S['04134'] = { onActivate(g, u) { const n = g.e.sides.length; g.discard(u, `전략의 대가: 강화 카드 ${n}장 추가 후 버려짐`); return n; } }; // Master Strategist
  S['04135'] = { // Twisted Reality
    attachTo: g => mostThreatSide(g),
    on: { async attachedDefeated(g, u, ctx) { if (ctx.scheme) { g.log('뒤틀린 현실: 시작 플레이어가 조우 카드 1장을 받습니다'); await g.withPlayer(g.s.first, () => g.dealEncounterCard()); } } }
  };
  S['04136'] = { // Bitter Rival
    async whenRevealed(g) { await exhaustCharacters(g, g.e.sides.length, '숙적: 소진할 캐릭터'); },
    async boostEffect(g) { await exhaustCharacters(g, 1, '★ 강화: 소진할 캐릭터'); }
  };
  S['04137'] = { // Spreading Lies
    async whenRevealed(g) { for (const s of [g.e.main].concat(g.e.sides)) if (g.c(s).zone) await g.placeThreat(s, 2, {}); },
    boostEffect(g) { villainTough(g, 0); }
  };
  S['04138'] = { // Infinite Power
    async whenRevealedAlter(g) { villainTough(g, 0); if (g.e.villain) await g.enemyScheme(g.e.villain, {}); },
    async whenRevealedHero(g) { villainTough(g, 0); if (g.e.villain) await g.enemyAttack(g.e.villain, {}); }
  };
  S['04139'] = { // The Red House
    shieldsFromDamage: (g, self, t) => g.c(self).zone === 'side' && t === g.e.villain,
    thwartValue: (g, self, src, n) => Math.max(n, g.stat(src, 'atk'))
  };
  S['04140'] = { // The Sleeper Awakened
    cannotLeave: g => g.e.minions.some(m => g.c(m).id === '04130'),
    async whenRevealed(g) { const s = g.e.aside.find(u => g.c(u).id === '04130'); if (s) { g.log('잠든 자가 깨어나다: 슬리퍼가 시작 플레이어와 교전합니다', 'warn'); await g.withPlayer(g.s.first, () => g.enterMinion(s, {})); } }
  };
  S['04141'] = { // Prison Camps
    async whenDefeated(g) {
      const c = g.p.deck.concat(g.p.discard).filter(x => g.d(x).type === 'ally' && !(g.d(x).unique && g.inPlay().some(y => g.d(y).name === g.d(x).name)));
      if (c.length) {
        const x = (await g.pickCards(c, '포로 수용소: 플레이 영역에 내놓을 동료', 1, 1))[0];
        await g.putAllyIntoPlay(x); g.log(`포로 수용소: ${g.nm(x)} 구출`, 'good');
      }
      g.shuffle(g.p.deck);
    }
  };
  S['04142'] = { // Censor the Past
    async whenDefeated(g) {
      await g.forEachPlayer(async () => {
        const sel = await g.pickCards(g.p.discard.slice(), '과거 검열: 덱에 섞어 넣을 카드 (최대 3장)', 0, 3);
        sel.forEach(x => g.put(x, 'deck')); g.shuffle(g.p.deck);
        if (sel.length) g.log(`과거 검열: ${sel.length}장을 덱에 섞어 넣음`, 'good');
      });
    }
  };
  S['04143'] = { // Hydra Reinforcements
    async whenDefeated(g) {
      const c = g.e.minions.filter(m => !g.hasTrait(m, 'ELITE')); if (!c.length) return;
      const t = c.length === 1 ? c[0] : await g.ask({ type: 'target', title: '하이드라 증원: 버릴 하수인 (간부 제외)', cands: c, cancelable: false });
      g.discard(t, `${g.nm(t)} 버림`);
    }
  };
  S['04144'] = { // Mass Chaos
    async whenRevealed(g, u) {
      await g.forEachPlayer(async () => {
        const out = await g.discardDeckTop(5);
        const kinds = new Set(out.flatMap(x => (g.d(x).res || '').split('').filter(Boolean)));
        if (kinds.size) await g.placeThreat(u, kinds.size, {});
      });
    }
  };

  // ======================= Modular sets (04145-04154) =======================
  const loseSupport = g => discardControlled(g, x => g.d(x).type === 'support', '버릴 지원 카드');
  S['04145'] = { // Hydra Flame-Soldier
    on: { async afterEnemyAttack(g, u, ctx) { if (ctx.enemy === u && ctx.undefended) await loseSupport(g); } },
    async boostEffect(g, u, ctx) { if (ctx.undefended) await loseSupport(g); }
  };
  S['04146'] = { // Hydra Jet-Trooper
    boostEffect(g, u, ctx) { if (g.isHero() && ctx.after) { ctx.after.push(async gg => { if (gg.e.villain && gg.isHero()) await gg.enemyAttack(gg.e.villain, { noBoost: true }); }); g.log('★ 강화: 이 활성화 후 빌런이 한 번 더 공격합니다'); } }
  };
  S['04148'] = { attackProps: () => ({ piercing: true }), actions: [discardThis('hero', '정신·물리 → 버리기', 'BR')] }; // Combat Knife
  S['04149'] = { attackProps: () => ({ ranged: true }), actions: [discardThis('hero', '정신·물리 → 버리기', 'BR')] }; // Hydra Sidearm
  S['04150'] = { // Weapon Master
    async whenRevealedAlter(g, u, ctx) { if (!g.e.villain) return; await g.enemyScheme(g.e.villain, {}); if (hasWeapon(g, g.e.villain)) ctx.surge++; },
    async whenRevealedHero(g, u, ctx) { if (!g.e.villain) return; await g.enemyAttack(g.e.villain, {}); if (hasWeapon(g, g.e.villain)) ctx.surge++; }
  };
  S['04151'] = { // Concussion Grenade
    async whenRevealedAlter(g) { const was = g.c(g.idt()).conf; g.giveStatus(g.idt(), 'conf', '혼란'); await g.placeThreat(g.e.main, was ? 2 : 1, {}); },
    async whenRevealedHero(g, u) { const was = g.c(g.idt()).stun; g.giveStatus(g.idt(), 'stun', '기절'); await g.dealDamage(g.idt(), was ? 2 : 1, { src: u }); }
  };
  S['04154'] = { // Hydra Patrol
    async whenDefeated(g) { await g.forEachPlayer(async () => { const m = g.searchEncounter(d => d.type === 'minion' && (d.tr || []).includes('HYDRA')); if (m) { g.log(`하이드라 순찰대: ${g.nm(m)}이(가) 교전합니다`); await g.enterMinion(m, {}, true); } }); g.shuffle(g.e.deck); }
  };

  // ---- main scheme setups the port had missed (cards/pack/trors/*/04061b, 04079a, 04096a, 04112a, 04113a) ----
  const findEnc = (g, pred, withDiscard) => (withDiscard ? g.e.deck.concat(g.e.discard) : g.e.deck).find(u => pred(g.d(u), u)) || null;
  S['04061b'] = { async whenRevealed(g) { await revealSub(g, 'ew', '실험 무기'); } }; // Attack on Mount Athena
  S['04079a'] = { async setup(g) { // None Shall Pass: discard until an environment, put it into play, shuffle the discards back
    const env = g.discardEncounterUntil(d => d.type === 'environment');
    if (env) { g.log(`아무도 지나갈 수 없다: ${g.nm(env)}을(를) 플레이에 내려놓습니다`, 'warn'); await g.enterEnv(env); }
    g.e.discard.slice().forEach(u => g.put(u, 'edeck')); g.shuffle(g.e.deck);
  } };
  S['04096a'] = { async setup(g) { const p = findEnc(g, d => d.id === '04154', true); if (p) { await g.enterSide(p, {}); g.shuffle(g.e.deck); } } }; // Hunting Down Heroes: Hydra Patrol
  S['04112a'] = { async setup(g) { // The Island of Dr. Zola: reveal Hydra Prison; an Ultimate Bio-Servant engages each player
    const pr = findEnc(g, d => d.id === '04122'); if (pr) await g.reveal(pr);
    await g.forEachPlayer(async () => { const bs = findEnc(g, d => d.id === '04114'); if (bs) await g.enterMinion(bs, {}, true); });
    g.shuffle(g.e.deck);
  } };
  S['04113a'] = { async whenRevealed(g) { await g.forEachPlayer(async () => { const m = findEnc(g, d => d.type === 'minion', true); if (m) { g.log(`미치광이 박사: ${g.nm(m)} 공개`, 'warn'); await g.reveal(m); } }); g.shuffle(g.e.deck); } }; // The Mad Doctor
  // ======================= Campaign: The Rise of Red Skull (cards/pack/trors/campaign.py, hydra_campaign, expert_campaign) =======================
  const RRS = 'rise_of_red_skull', IMPROVED = { '04159a': '04159b', '04160a': '04160b', '04161a': '04161b', '04162a': '04162b' };
  const cardsIn = (g, ids, zones) => zones.flatMap(z => z).filter(u => ids.includes(g.c(u).id));
  MC.CAMPAIGNS[RRS] = {
    async setup(g, spec) {
      const lv = spec.level || 1;
      await g.forEachPlayer(async () => {
        const tech = g.clogP('Tech Upgrade'), gone = g.clogP('tech upgrade removed from campaign') === 'Yes';
        if (tech && gone) cardsIn(g, [tech], [g.p.deck, g.p.upgrades]).forEach(u => g.removeFromGame(u)); // a used tech upgrade stays out of the campaign
        if (lv >= 2) {
          if (tech && !gone && MC.cards[tech]) { const u = g.newCard(tech, 'upgrade'); g.log(`캠페인: ${g.nm(u)}을(를) 플레이 영역에 내려놓습니다`); }
          let b = g.clogP('Basic Upgrade'); if (b && g.clogP('Basic Condition replaced with Improved side') === 'Yes') b = IMPROVED[b] || b;
          if (b && MC.cards[b]) { const u = g.newCard(b, 'upgrade'); g.log(`캠페인: ${g.nm(u)}을(를) 플레이 영역에 내려놓습니다`); }
        }
        if (lv >= 4) { const al = g.clogPList('Rescued Allies').filter(id => MC.cards[id]); al.forEach(id => g.newCard(id, 'deck')); if (al.length) { g.shuffle(g.p.deck); g.log(`캠페인: 구출한 동료 ${al.length}장을 덱에 섞습니다`); } }
      });
      if (lv >= 2) {
        const ew = g.clogList('Experimental Weapons added to encounter deck').filter(id => MC.cards[id]); ew.forEach(id => g.newCard(id, 'edeck')); if (ew.length) { g.shuffle(g.e.deck); g.log(`캠페인: 실험 무기 ${ew.length}장을 조우 덱에 섞습니다`); }
      }
    },
    async after(g, spec) {
      if ((spec.level || 1) < 2) return;
      await g.forEachPlayer(async () => {
        const hp = g.clogPInt('Remaining hit points'); if (hp) g.setIdentityHP(hp);
        if (!g.s.scen.expert) return; // expert campaign: obligations from the expert set
        const OB = ['04163', '04164', '04165', '04166'], have = g.clogPList('Obligations').filter(id => OB.includes(id));
        have.forEach(id => g.newCard(id, 'deck')); if (have.length) g.shuffle(g.p.deck);
        const rest = OB.filter(id => !have.includes(id)), i = g.idt();
        if (rest.length && g.c(i).dmg > 0 && await g.ask({ type: 'choice', title: `숙련 캠페인(${g.playerName()}): 숙련 캠페인 의무 카드 1장(무작위)을 덱에 넣고 생명력을 모두 회복할까요?`, options: [{ id: 'y', label: '넣고 모두 회복' }, { id: 'n', label: '안 함' }] }) === 'y') {
          const id = rest[Math.floor(g.rand() * rest.length)]; g.newCard(id, 'deck'); g.shuffle(g.p.deck); g.c(i).dmg = 0;
          g.clogPSet('Obligations', have.concat([id]).join(';')); g.log(`숙련 캠페인: ${MC.cards[id].name}을(를) 덱에 넣고 생명력을 모두 회복합니다`, 'warn');
        }
      });
    }
  };
  const techAction = (label, can, run) => ({ actions: [{ timing: 'hero', label: `${label} (버리고 캠페인에서 제거)`, can: (g, u) => g.c(u).zone === 'upgrade' && (!can || can(g, u)),
    async use(g, u) { g.log(`${g.nm(u)} 사용 — 캠페인에서 제거`); g.removeFromGame(u); if (g.campaignOn(RRS)) g.clogPSet('tech upgrade removed from campaign', 'Yes'); await run(g, u); } }] });
  S['04155'] = techAction('히어로 준비, 피해 5 회복', null, async g => { g.c(g.idt()).ex = false; g.heal(g.idt(), 5); }); // Adrenal Stims
  S['04156'] = techAction('카드 5장 뽑기', null, async g => { await g.draw(5); }); // Tactical Scanner
  S['04157'] = techAction('덱·버린 더미에서 동료를 찾아 내려놓기', g => g.p.deck.concat(g.p.discard).some(x => g.d(x).type === 'ally'), async g => { // Emergency Teleporter
    const c = g.p.deck.concat(g.p.discard).filter(x => g.d(x).type === 'ally'); const t = c.length === 1 ? c[0] : await g.ask({ type: 'target', title: '비상 순간이동 장치: 내려놓을 동료', cands: c, cancelable: false }) || c[0];
    await g.putAllyIntoPlay(t); g.giveStatus(t, 'tough', '비상 순간이동 장치'); g.shuffle(g.p.deck); });
  S['04158'] = techAction('빌런과 교전 중인 하수인 모두에게 피해 5', null, async (g, u) => { for (const x of (g.e.villain ? [g.e.villain] : []).concat(g.engagedMinions().slice())) if (g.c(x).zone) await g.dealDamage(x, 5, { src: u, byPlayer: true }); }); // Laser Cannon
  const basicUp = (hp, stat, alter) => ({ permanent: true, mod: { hp: (g, s, t) => t === g.idt() && g.c(s).zone === 'upgrade' ? hp : 0, [stat]: (g, s, t) => t === g.idt() && g.c(s).zone === 'upgrade' && (alter ? !g.isHero() : g.isHero()) ? 1 : 0 } });
  const improved = (base, win, can) => Object.assign({}, base, { respond: [{ window: win, exhaust: true, label: '소진 → 카드 1장 뽑기', can: (g, u, ctx) => g.c(u).zone === 'upgrade' && can(g, u, ctx), async resolve(g) { await g.draw(1); } }] });
  S['04159a'] = basicUp(2, 'thw'); S['04159b'] = improved(S['04159a'], 'sideSchemeDefeated', () => true); // Basic / Improved Thwart Upgrade
  S['04160a'] = basicUp(1, 'atk'); S['04160b'] = improved(S['04160a'], 'afterPlayerDefeatsMinion', g => g.isHero());
  S['04161a'] = basicUp(3, 'def'); S['04161b'] = improved(S['04161a'], 'afterHeroDefends', g => g.isHero());
  S['04162a'] = basicUp(4, 'rec', true); S['04162b'] = improved(S['04162a'], 'afterBasicPower', (g, u, ctx) => ctx.kind === 'recover');
  const campOb = (label, req, pay, extra) => Object.assign({ // expert campaign obligations stay in your play area until an alter-ego action discards them
    whenRevealed(g, u) { g.put(u, 'pobl'); g.log(`${g.nm(u)}이(가) 내 플레이 영역에 남습니다`, 'warn'); },
    actions: [{ timing: 'alter', label, cost: { n: 1, req }, can: (g, u) => g.c(u).zone === 'pobl' && (!pay.can || pay.can(g, u)), async use(g, u) { if (await pay.run(g, u) === false) return; g.discard(u, `${g.nm(u)}을(를) 버렸습니다`); } }]
  }, extra || {});
  S['04163'] = campOb('일상 소진·[정신] → 버리기', 'B', { can: g => !g.c(g.idt()).ex, run: g => { g.c(g.idt()).ex = true; } }); // Zola's Algorithm
  S['04164'] = campOb('덱 위 5장 버림·[물리] → 버리기', 'R', { run: g => { for (const x of g.p.deck.slice(0, 5)) g.put(x, 'discard'); } }, { on: { async playerPhaseEnd(g, u) { if (g.c(u).zone === 'pobl' && g.isHero()) { g.log('의료 응급상황: 피해 1', 'warn'); await g.dealDamage(g.idt(), 1, { src: u }); } } } }); // Medical Emergency
  S['04165'] = campOb('조우 카드 1장 받기·[에너지] → 버리기', 'Y', { run: async g => { await g.dealEncounterCard(); } }, { mod: { hs: (g, s, t) => g.c(s).zone === 'pobl' && t === g.idt() ? -1 : 0 } }); // Martial Law
  S['04166'] = campOb('피해 2·[와일드] → 버리기', 'G', { run: async g => { await g.dealDamage(g.idt(), 2, {}); } }, { mod: ['thw', 'atk', 'def'].reduce((m, k) => (m[k] = (g, s, t) => g.c(s).zone === 'pobl' && t === g.idt() && g.isHero() ? -1 : 0, m), {}) }); // Anti-Hero Propaganda
  // each scenario's campaign setup level (CampaignSetup(n) on its main scheme 1A)
  const camp = (id, c) => { S[id] = Object.assign(S[id] || {}, { campaign: c }); };
  camp('04061a', { level: 1 }); camp('04079a', { level: 2 }); camp('04096a', { level: 3 }); camp('04112a', { level: 4 });
  camp('04128a', { level: 5, fns: [
    async g => { const n = g.clogInt('Number of delay counters on main scheme') * (g.s.scen.expert ? g.players : 1); if (n && g.e.main) { g.log(`캠페인: 지연 카운터만큼 주 음모에 위협 ${n}`, 'warn'); await g.placeThreat(g.e.main, n, {}); } },
    g => { const ids = g.clogList('Allies removed from the campaign'); const x = g.p.deck.filter(u => g.d(u).type === 'ally' && ids.includes(g.c(u).id)); x.forEach(u => g.removeFromGame(u)); if (x.length) g.log(`캠페인: 캠페인에서 제거된 동료 ${x.length}장을 뺍니다`); }
  ], expert: [async g => { if (g.clogList('Players engaged with minions').includes('0')) await g.dealEncounterCard(); }] });
  MC.registerScripts(S);
})();
