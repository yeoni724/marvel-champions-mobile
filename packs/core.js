/* Core set card scripts, ported from cards/pack/core/*.py of the community build. */
(function () {
  'use strict';
  const S = {};
  const heroForm = g => g.isHero();

  // ======================= Spider-Man (01001-01009, 01165) =======================
  S['01001a'] = { // Spider-Man — Spider-Sense
    on: {
      async villainInitiatesAttack(g, u) {
        const n = await g.draw(1);
        if (n) g.log('스파이더센스: 카드 1장 뽑음', 'good');
      }
    }
  };
  S['01001b'] = { // Peter Parker — Scientist
    resources: [{ gen: 'B', label: '과학자 (피터 파커)', can: g => !g.isHero() && !g.p.usedOnce.scientist, use: g => { g.p.usedOnce.scientist = true; } }]
  };
  S['01002'] = { // Black Cat
    async onPlay(g, u) {
      const top = g.p.deck.slice(0, 2);
      if (top.length < 2) await g.reshuffleDeck();
      const cards = g.p.deck.slice(0, 2);
      cards.forEach(x => g.put(x, 'discard'));
      const keep = cards.filter(x => (g.d(x).res || '').includes('B'));
      keep.forEach(x => g.put(x, 'hand'));
      g.log(`블랙 캣: ${cards.map(x => g.nm(x)).join(', ')} 버림${keep.length ? ` → ${keep.map(x => g.nm(x)).join(', ')} 손으로` : ''}`);
    }
  };
  S['01003'] = { // Backflip
    interrupt: { window: 'wouldTakeAttackDamage', can: (g, u, ctx) => ctx.target === g.idt() && ctx.amount > ctx.prevent,
      resolve(g, u, ctx) { ctx.prevent = ctx.amount; } }
  };
  S['01004'] = { // Enhanced Spider-Sense
    interrupt: { window: 'treacheryRevealed', timing: 'hero', can: (g, u, ctx) => !ctx.cancel,
      resolve(g, u, ctx) { ctx.cancel = true; g.log(`「${g.nm(ctx.card)}」의 공개될 때 효과 취소`, 'good'); } }
  };
  S['01005'] = { // Swinging Web Kick
    play: { timing: 'hero', label: 'attack', target: 'attackable',
      async resolve(g, u, ctx) { g.log(`거미줄 날아차기 → ${g.nm(ctx.target)} 8`); await g.playerAttack(g.idt(), ctx.target, 8, {}); } }
  };
  S['01006'] = { // Aunt May
    actions: [{ timing: 'alter', label: '소진 → 피터 파커 피해 4 회복', exhaust: true, can: g => g.c(g.idt()).dmg > 0,
      async use(g) { const h = g.heal(g.idt(), 4); g.log(`메이 숙모: 피해 ${h} 회복`, 'good'); } }]
  };
  S['01007'] = { // Spider-Tracer
    attach: { kind: 'minion' },
    on: { async attachedDefeated(g, u) { await g.removeThreatChoose(3, '스파이더 추적기: 위협 3을 제거할 음모', u); } }
  };
  S['01008'] = { // Web-Shooter
    resources: [{ gen: 'G', label: '웹 슈터 (웹 카운터 1)', can: (g, u) => g.isHero() && !g.c(u).ex && (g.c(u).cnt.web || 0) > 0,
      use: (g, u) => { g.c(u).ex = true; g.c(u).cnt.web--; } }]
  };
  S['01009'] = { // Webbed Up
    heroOnly: true,
    attach: { kind: 'enemy', filter: (g, t) => !g.c(t).att.some(a => g.c(a).id === '01009') },
    on: {
      async hostWouldAttack(g, u, ctx) {
        const host = g.c(u).on;
        ctx.cancel = true;
        g.discard(u);
        g.c(host).stun = true;
        g.log(`거미줄 포박: ${g.nm(host)}의 공격 대신 카드를 버리고 기절시킴`, 'good');
      }
    }
  };
  S['01165'] = { // Eviction Notice (obligation)
    async whenRevealed(g, u, ctx) {
      if (g.isHero()) {
        const f = await g.ask({ type: 'choice', title: '퇴거 통지서: 일상 모습으로 변신할 수 있습니다', options: [{ id: 'flip', label: '피터 파커로 변신' }, { id: 'no', label: '그대로 둔다' }] });
        if (f === 'flip') await g.changeForm(true);
      }
      const opts = [];
      if (!g.isHero() && !g.c(g.idt()).ex) opts.push({ id: 'remove', label: '피터 파커 소진 → 퇴거 통지서를 게임에서 제거' });
      opts.push({ id: 'discard', label: '손에서 무작위 1장 버리기 (쇄도, 의무 카드 버림)' });
      const pick = opts.length === 1 ? opts[0].id : await g.ask({ type: 'choice', title: '퇴거 통지서: 하나를 고르세요', options: opts });
      if (pick === 'remove') { g.c(g.idt()).ex = true; g.removeFromGame(u); g.log('퇴거 통지서를 게임에서 제거', 'good'); }
      else { await g.discardRandomHand(1); ctx.surge++; g.discard(u); }
    }
  };

  // ======================= Justice aspect (01058-01065) =======================
  S['01058'] = { // Daredevil
    respond: [{ window: 'afterAllyThwart', label: '적에게 피해 1', can: (g, u, ctx) => ctx.ally === u && g.enemies().length > 0,
      async resolve(g, u) {
        const t = await g.chooseTarget('enemy', '데어데블: 피해 1을 줄 적', u, false);
        if (t) await g.dealDamage(t, 1, { src: u, byPlayer: true });
      } }]
  };
  S['01059'] = { // Jessica Jones
    mod: { thw: (g, self, target) => target === self ? g.e.sides.length : 0 }
  };
  S['01060'] = { // For Justice!
    play: { timing: 'hero', label: 'thwart', target: 'thwartable',
      async resolve(g, u, ctx) {
        const n = g.paidWith(ctx.paid, 'B') ? 4 : 3;
        const r = await g.removeThreat(ctx.target, n, { src: u });
        g.log(`정의를 위하여!: ${g.nm(ctx.target)} 위협 ${r} 제거${n === 4 ? ' (정신 자원 보너스)' : ''}`);
        await g.afterThreatRemoved(ctx.target);
      } }
  };
  S['01061'] = { // Great Responsibility
    interrupt: { window: 'threatWouldBePlaced', timing: 'hero', can: (g, u, ctx) => !ctx.instead && ctx.amount > 0,
      async resolve(g, u, ctx) {
        ctx.instead = true;
        g.log(`큰 책임: 위협 ${ctx.amount} 대신 피해를 받습니다`);
        await g.dealDamage(g.idt(), ctx.amount, { src: u });
      } }
  };
  S['01062'] = { doubleFor: (g, u, forUid) => g.d(forUid).cls === 'Justice' }; // The Power of Justice
  S['01063'] = { // Interrogation Room
    respond: [{ window: 'afterPlayerDefeatsMinion', label: '소진 → 위협 1 제거', exhaust: true, can: g => g.targets('thwartable').length > 0,
      async resolve(g, u) { await g.removeThreatChoose(1, '심문실: 위협 1을 제거할 음모', u); } }]
  };
  S['01064'] = { // Surveillance Team
    actions: [{ timing: 'action', label: '소진·카운터 1 → 위협 1 제거', exhaust: true, target: 'thwartable', can: (g, u) => (g.c(u).cnt.snoop || 0) > 0,
      async use(g, u, ctx) {
        g.c(u).cnt.snoop--;
        const r = await g.removeThreat(ctx.target, 1, { src: u });
        g.log(`감시팀: ${g.nm(ctx.target)} 위협 ${r} 제거`);
        await g.afterThreatRemoved(ctx.target);
      } }]
  };
  S['01065'] = { // Heroic Intuition
    mod: { thw: (g, self, target) => (target === g.idt() && g.isHero()) ? 1 : 0 }
  };


  // ======================= Aggression (01050-01057) =======================
  S['01050'] = { // Hulk
    on: {
      async afterAttack(g, u, ctx) {
        if (ctx.attacker !== u || g.c(u).zone !== 'ally') return;
        if (!g.p.deck.length) await g.reshuffleDeck();
        const top = g.p.deck[0]; if (!top) return;
        g.put(top, 'discard');
        const r = g.d(top).res || '';
        g.log(`헐크: 덱 맨 위 ${g.nm(top)} 버림 (${r.split('').map(l => MC.RES_KO[l]).join('·') || '자원 없음'})`);
        const wild = r.includes('G');
        if (wild || r.includes('R')) { const t = await g.chooseTarget('enemy', '헐크: 피해 2를 줄 적', u, false); if (t) await g.dealDamage(t, 2, { src: u, byPlayer: true }); }
        if (wild || r.includes('Y')) {
          g.log('헐크: 모든 캐릭터에게 피해 1');
          const all = g.allFriendlyChars().concat(g.enemies());
          for (const x of all) if (g.c(x).zone) await g.dealDamage(x, 1, { src: u, byPlayer: true });
        }
        if ((wild || r.includes('B')) && g.c(u).zone === 'ally') g.discard(u, '헐크가 버려졌습니다');
      }
    }
  };
  S['01051'] = { // Tigra
    respond: [{ window: 'afterAttackDefeat', label: '티그라 피해 1 회복', can: (g, u, ctx) => ctx.attacker === u && ctx.type === 'minion' && g.c(u).dmg > 0,
      async resolve(g, u) { g.heal(u, 1); g.log('티그라: 피해 1 회복', 'good'); } }]
  };
  S['01052'] = { // Chase Them Down
    interrupt: { window: 'afterAttackDefeat', can: (g, u, ctx) => ctx.attacker === g.idt() && g.targets('thwartable').length > 0,
      async resolve(g, u) {
        const id = g.idt();
        if (g.c(id).conf) { g.c(id).conf = false; g.log(`${g.nm(id)}: 혼란 상태라 저지 대신 혼란 해제`); return; }
        await g.removeThreatChoose(2, '적을 추적하다: 위협 2를 제거할 음모', u);
      } }
  };
  S['01053'] = { // Relentless Assault
    play: { timing: 'hero', label: 'attack', target: { kind: 'minion' },
      async resolve(g, u, ctx) {
        const ok = g.paidWith(ctx.paid, 'R');
        g.log(`거침없는 돌진 → ${g.nm(ctx.target)} 5${ok ? ' (압도)' : ''}`);
        await g.playerAttack(g.idt(), ctx.target, 5, { overkill: ok });
      } }
  };
  S['01054'] = { // Uppercut
    play: { timing: 'hero', label: 'attack', target: 'attackable',
      async resolve(g, u, ctx) { g.log(`어퍼컷 → ${g.nm(ctx.target)} 5`); await g.playerAttack(g.idt(), ctx.target, 5, {}); } }
  };
  S['01055'] = { doubleFor: (g, u, forUid) => g.d(forUid).cls === 'Aggression' }; // The Power of Aggression
  S['01056'] = { // Tac Team
    actions: [{ timing: 'action', label: '소진·카운터 1 → 적에게 피해 2', exhaust: true, target: 'enemy', can: (g, u) => (g.c(u).cnt.attack || 0) > 0,
      async use(g, u, ctx) { g.c(u).cnt.attack--; await g.dealDamage(ctx.target, 2, { src: u, byPlayer: true }); } }]
  };
  S['01057'] = { mod: { atk: (g, self, target) => (target === g.idt() && g.isHero()) ? 1 : 0 } }; // Combat Training

  // ======================= Leadership (01066-01074) =======================
  S['01066'] = { // Hawkeye
    async onEnter(g, u) { g.c(u).cnt.arrow = 4; },
    respond: [{ window: 'minionEntered', label: '화살 카운터 1 → 그 하수인에게 피해 2', can: (g, u, ctx) => (g.c(u).cnt.arrow || 0) > 0 && g.c(ctx.minion).zone === 'minion',
      async resolve(g, u, ctx) { g.c(u).cnt.arrow--; await g.dealDamage(ctx.minion, 2, { src: u, byPlayer: true }); } }]
  };
  S['01067'] = { // Maria Hill
    async onEnter(g) { await g.forEachPlayer(async () => { const n = await g.draw(1); if (n) g.log('마리아 힐: 카드 1장 뽑음', 'good'); }); }
  };
  S['01068'] = { // Vision
    actions: [{ timing: 'action', label: '에너지 1 → 저지 또는 공격 +2 (이번 단계)', once: true, cost: { n: 1, req: 'Y' },
      async use(g, u) {
        const pick = await g.ask({ type: 'choice', title: '비전: 강화할 능력치', options: [{ id: 'thw', label: '저지 +2' }, { id: 'atk', label: '공격 +2' }] });
        g.addPhaseMod(u, pick === 'atk' ? 'atk' : 'thw', 2);
        g.log(`비전: 이번 단계 동안 ${pick === 'atk' ? '공격' : '저지'} +2`, 'good');
      } }]
  };
  S['01069'] = { // Get Ready
    play: { timing: 'action', target: 'exhaustedAlly', async resolve(g, u, ctx) { g.c(ctx.target).ex = false; g.log(`준비 태세: ${g.nm(ctx.target)} 준비`, 'good'); } }
  };
  S['01070'] = { // Lead from the Front
    play: { timing: 'hero',
      async resolve(g) {
        const pi = await g.choosePlayer('진두지휘: 강화할 플레이어');
        await g.withPlayer(pi, () => {
          for (const x of g.friendlyChars()) { g.addPhaseMod(x, 'atk', 1); g.addPhaseMod(x, 'thw', 1); }
          g.log(g.players > 1 ? `진두지휘: 이번 단계 동안 ${g.playerName(pi)}의 캐릭터 모두 저지·공격 +1` : '진두지휘: 이번 단계 동안 내 캐릭터 모두 저지·공격 +1', 'good');
        });
      } }
  };
  const callable = (g, self) => g.livingPlayers().flatMap(i => g.s.ps[i].discard).filter(x => g.d(x).type === 'ally' && !g.inPlay().some(y => g.d(y).unique && g.d(y).name === g.d(x).name)
    && g.canAfford({ n: g.d(x).cost || 0, req: '' }, x, self ? [self] : []));
  S['01071'] = { // Make the Call
    play: { timing: 'action', can: (g, u) => callable(g, u).length > 0,
      async resolve(g, u) {
        const c = callable(g, u); if (!c.length) return;
        const pick = await g.ask({ type: 'choice', title: '소집명령: 버림 더미에서 동료를 고르세요', options: c.map(x => ({ id: x, uid: x, label: `${g.nm(x)} (비용 ${g.d(x).cost})` })) });
        const x = pick || c[0];
        const paid = await g.pay({ n: g.d(x).cost || 0, req: '' }, x, `${g.nm(x)}의 비용 ${g.d(x).cost}`, false);
        if (paid == null) return;
        await g.putAllyIntoPlay(x);
        g.log(`소집명령: ${g.nm(x)}이(가) 플레이 영역에 들어옴`, 'good');
      } }
  };
  S['01072'] = { doubleFor: (g, u, forUid) => g.d(forUid).cls === 'Leadership' }; // The Power of Leadership
  S['01073'] = { allyLimit: 1 }; // The Triskelion
  S['01074'] = { // Inspired
    attach: { kind: 'ally', filter: (g, t) => !g.c(t).att.some(a => g.c(a).id === '01074') },
    mod: { atk: (g, self, target) => g.c(self).on === target ? 1 : 0, thw: (g, self, target) => g.c(self).on === target ? 1 : 0 }
  };

  // ======================= Protection (01075-01082) =======================
  S['01075'] = { // Black Widow
    respond: [{ window: 'cardRevealed', label: '소진·정신 1 → 효과 취소하고 다른 카드 공개', exhaust: true, cost: { n: 1, req: 'B' },
      can: (g, u, ctx) => !ctx.cancelAll,
      async resolve(g, u, ctx) { ctx.cancelAll = true; ctx.revealAnother++; } }]
  };
  S['01077'] = { // Counter-Punch
    interrupt: { window: 'afterHeroDefends', can: (g, u, ctx) => g.c(ctx.enemy).zone && g.isHero(),
      async resolve(g, u, ctx) {
        const id = g.idt();
        if (g.c(id).stun) { g.c(id).stun = false; g.log(`${g.nm(id)}: 기절 상태라 공격 대신 기절 해제`); return; }
        const n = g.stat(id, 'atk'); g.log(`카운터 펀치 → ${g.nm(ctx.enemy)} ${n}`);
        await g.playerAttack(id, ctx.enemy, n, {});
      } }
  };
  S['01078'] = { // Get Behind Me!
    interrupt: { window: 'treacheryRevealed', timing: 'hero', can: (g, u, ctx) => !ctx.cancel,
      async resolve(g, u, ctx) {
        ctx.cancel = true; g.log(`「${g.nm(ctx.card)}」의 공개될 때 효과 취소 — 대신 빌런이 공격합니다`);
        if (g.e.villain) await g.enemyAttack(g.e.villain, { boost: 1 });
      } }
  };
  S['01079'] = { doubleFor: (g, u, forUid) => g.d(forUid).cls === 'Protection' }; // The Power of Protection
  S['01080'] = { // Med Team
    actions: [{ timing: 'action', label: '소진·카운터 1 → 아군 피해 2 회복', exhaust: true, target: 'damagedFriendly', can: (g, u) => (g.c(u).cnt.medical || 0) > 0,
      async use(g, u, ctx) { g.c(u).cnt.medical--; const h = g.heal(ctx.target, 2); g.log(`의료팀: ${g.nm(ctx.target)} 피해 ${h} 회복`, 'good'); } }]
  };
  S['01081'] = { mod: { def: (g, self, target) => (target === g.idt() && g.isHero()) ? 1 : 0 } }; // Armored Vest
  S['01082'] = { // Indomitable
    respond: [{ window: 'afterHeroDefends', label: '버리기 → 히어로 준비', can: g => g.c(g.idt()).ex,
      async resolve(g, u) { g.discard(u); g.c(g.idt()).ex = false; g.log('불굴의 정신: 히어로를 준비 상태로', 'good'); } }]
  };

  // ======================= Basic (01083-01093) =======================
  S['01083'] = { // Mockingbird
    async onEnter(g, u) {
      const c = g.enemies().filter(x => !g.c(x).stun);
      if (!c.length) return;
      const t = await g.ask({ type: 'target', title: '모킹버드: 기절시킬 적을 고르세요', cands: c, cancelable: true });
      if (t) g.giveStatus(t, 'stun', '기절');
    }
  };
  S['01084'] = { // Nick Fury
    async onEnter(g, u) {
      const opts = [];
      if (g.targets('thwartable').length) opts.push({ id: 'threat', label: '음모에서 위협 2 제거' });
      opts.push({ id: 'draw', label: '카드 3장 뽑기' });
      if (g.enemies().length) opts.push({ id: 'dmg', label: '적에게 피해 4' });
      const pick = await g.ask({ type: 'choice', title: '닉 퓨리: 하나를 고르세요', options: opts });
      if (pick === 'threat') await g.removeThreatChoose(2, '닉 퓨리: 위협 2를 제거할 음모', u);
      else if (pick === 'draw') { const n = await g.draw(3); g.log(`닉 퓨리: 카드 ${n}장 뽑음`); }
      else if (pick === 'dmg') { const t = await g.chooseTarget('enemy', '닉 퓨리: 피해 4를 줄 적', u, false); if (t) await g.dealDamage(t, 4, { src: u, byPlayer: true }); }
    },
    on: { async roundEnd(g, u) { if (g.c(u).zone === 'ally') g.discard(u, '닉 퓨리: 라운드 종료로 버려짐'); } }
  };
  S['01085'] = { // Emergency
    interrupt: { window: 'villainSchemes', resolve(g, u, ctx) { ctx.reduce += 1; g.log('비상사태: 놓일 위협 -1', 'good'); } }
  };
  S['01086'] = { // First Aid
    play: { timing: 'action', target: 'damagedFriendly',
      async resolve(g, u, ctx) { const h = g.heal(ctx.target, 2); g.log(`응급 처치: ${g.nm(ctx.target)} 피해 ${h} 회복`, 'good'); } }
  };
  S['01087'] = { // Haymaker
    play: { timing: 'hero', label: 'attack', target: 'attackable',
      async resolve(g, u, ctx) { g.log(`강타 → ${g.nm(ctx.target)} 3`); await g.playerAttack(g.idt(), ctx.target, 3, {}); } }
  };
  S['01091'] = { // Avengers Mansion
    actions: [{ timing: 'action', label: '소진 → 카드 1장 뽑기', exhaust: true, async use(g) {
      const pi = await g.choosePlayer('어벤져스 맨션: 카드를 뽑을 플레이어');
      await g.withPlayer(pi, async () => { await g.draw(1); g.log(g.players > 1 ? `어벤저스 맨션: ${g.playerName(pi)} 카드 1장 뽑음` : '어벤저스 맨션: 카드 1장 뽑음'); });
    } }]
  };
  S['01092'] = { // Helicarrier
    actions: [{ timing: 'action', label: '소진 → 다음 카드 비용 -1', exhaust: true, can: g => g.livingPlayers().some(i => !g.s.ps[i].costRed), async use(g) {
      const cands = g.livingPlayers().filter(i => !g.s.ps[i].costRed);
      let pi = cands[0];
      if (cands.length > 1) {
        const pick = await g.ask({ type: 'choice', title: '헬리캐리어: 다음 카드 비용을 줄일 플레이어', options: cands.map(i => ({ id: String(i), uid: g.idt(i), label: g.playerName(i) })) });
        const idx = parseInt(pick, 10);
        if (cands.includes(idx)) pi = idx;
      }
      g.s.ps[pi].costRed = 1;
      g.log(g.players > 1 ? `헬리캐리어: ${g.playerName(pi)}이(가) 이번 단계에 플레이하는 다음 카드 비용 -1` : '헬리캐리어: 이번 단계에 플레이하는 다음 카드 비용 -1');
    } }]
  };
  S['01093'] = { // Tenacity
    actions: [{ timing: 'hero', label: '물리 1 지불·버리기 → 히어로 준비', cost: { n: 1, req: 'R' }, can: g => g.c(g.idt()).ex,
      async use(g, u) { g.discard(u); g.c(g.idt()).ex = false; g.log('불굴: 히어로를 준비 상태로', 'good'); } }]
  };

  // ======================= Rhino (01094-01108) =======================
  S['01095'] = { // Rhino II
    async whenRevealed(g) {
      const pool = g.e.deck.concat(g.e.discard);
      const bt = pool.find(x => g.c(x).id === '01107');
      if (bt) { g.log('라이노 II: 「부수고 털기」를 찾아 공개합니다'); await g.reveal(bt); }
      g.shuffle(g.e.deck);
    }
  };
  S['01098'] = { // Armored Rhino Suit
    on: {
      async wouldTakeDamage(g, u, ctx) {
        if (ctx.target !== g.c(u).on || ctx.prevent >= ctx.amount) return;
        const n = ctx.amount - ctx.prevent;
        ctx.prevent = ctx.amount;
        const c = g.c(u); c.cnt.damage = (c.cnt.damage || 0) + n;
        g.log(`장갑 라이노 슈트가 피해 ${n}을(를) 대신 받음 (${c.cnt.damage}/5)`);
        if (c.cnt.damage >= 5) g.discard(u, '장갑 라이노 슈트 파괴');
      }
    }
  };
  S['01099'] = { // Charge
    on: {
      async enemyAttacks(g, u, ctx) {
        if (ctx.enemy !== g.c(u).on) return;
        ctx.overkill = true;
        g.log('돌진: 이 공격은 압도를 얻습니다');
        ctx.after.push(async gg => { if (gg.c(u).zone === 'attach') gg.discard(u, '돌진 버려짐'); });
      }
    }
  };
  S['01100'] = { // Enhanced Ivory Horn
    actions: [{ timing: 'hero', label: '물리 3 지불 → 버리기', cost: { n: 3, req: 'RRR' }, async use(g, u) { g.discard(u, '강화된 상아 뿔을 버림'); } }]
  };
  S['01103'] = { // Shocker
    async whenRevealed(g, u) { await g.forEachPlayer(async () => { if (g.isHero()) { g.log('쇼커: 각 히어로에게 피해 1'); await g.dealDamage(g.idt(), 1, { src: u }); } }); }
  };
  S['01104'] = { // Hard to Keep Down
    async whenRevealed(g, u, ctx) {
      const v = g.e.villain; const h = v ? g.heal(v, 4) : 0;
      if (h) g.log(`${g.nm(v)} 피해 ${h} 회복`); else { g.log('회복할 피해가 없어 쇄도'); ctx.surge++; }
    }
  };
  S['01105'] = { // I'm Tough
    async whenRevealed(g, u, ctx) {
      const v = g.e.villain;
      if (v && !g.c(v).tough) g.giveStatus(v, 'tough', '강인함 획득');
      else { g.log('이미 강인하여 쇄도'); ctx.surge++; }
    }
  };
  S['01106'] = { // Stampede
    async whenRevealedAlter(g, u, ctx) { ctx.surge++; },
    async whenRevealedHero(g) {
      if (!g.e.villain) return;
      await g.enemyAttack(g.e.villain, { boost: 1, onDamaged: async (gg, units) => units.forEach(x => gg.giveStatus(x, 'stun', '기절')) });
    }
  };
  S['01107'] = { // Breakin' & Takin'
    async whenRevealed(g, u) { await g.placeThreat(u, 1 * g.players, {}); }
  };

  // ======================= Bomb Scare (01109-01112) =======================
  S['01109'] = { async whenRevealed(g, u) { await g.placeThreat(u, 1 * g.players, {}); } };
  S['01110'] = { // Hydra Bomber
    async whenRevealed(g, u) {
      const pick = await g.ask({ type: 'choice', title: '히드라 폭파병: 하나를 고르세요', options: [{ id: 'dmg', label: '피해 2 받기' }, { id: 'threat', label: '주 음모에 위협 1' }] });
      if (pick === 'dmg') await g.dealDamage(g.idt(), 2, { src: u });
      else await g.placeThreat(g.e.main, 1, {});
    }
  };
  S['01111'] = { // Explosion
    async whenRevealed(g, u, ctx) {
      const bs = g.e.sides.find(x => g.c(x).id === '01109');
      if (!bs) { g.log('폭탄 위협이 없어 쇄도'); ctx.surge++; return; }
      const x = g.c(bs).threat;
      const cands = g.allFriendlyChars().filter(ch => g.d(ch).type === 'ally' || g.isHero(g.identityPlayer(ch)));
      g.log(`폭발: 피해 ${x}을(를) 히어로와 동료에게 배정`);
      if (x > 0 && cands.length) await g.assignDamage(x, cands, '폭발 피해를 받을 캐릭터');
    }
  };
  S['01112'] = { // False Alarm
    async whenRevealed(g, u, ctx) { if (!g.giveStatus(g.idt(), 'conf', '혼란')) { g.log('이미 혼란 상태라 쇄도'); ctx.surge++; } }
  };

  // ======================= Standard (01186-01190) =======================
  S['01186'] = { async whenRevealed(g) { if (g.e.villain) await g.enemyScheme(g.e.villain, { boost: 1 }); } }; // Advance
  S['01187'] = { // Assault
    async whenRevealedAlter(g, u, ctx) { ctx.surge++; },
    async whenRevealedHero(g) { if (g.e.villain) await g.enemyAttack(g.e.villain, { boost: 1 }); }
  };
  S['01188'] = { // Caught Off Guard
    async whenRevealed(g, u, ctx) {
      const c = g.controlled().filter(x => ['upgrade', 'support'].includes(g.d(x).type));
      if (!c.length) { g.log('버릴 강화/지원이 없어 쇄도'); ctx.surge++; return; }
      const t = c.length === 1 ? c[0] : await g.ask({ type: 'target', title: '방심: 버릴 강화 또는 지원 카드', cands: c, cancelable: false });
      g.discard(t, `${g.nm(t)} 버림`);
    }
  };
  S['01189'] = { // Gang-Up
    async whenRevealedAlter(g, u, ctx) { ctx.surge++; },
    async whenRevealedHero(g) {
      if (g.e.villain) await g.enemyAttack(g.e.villain, { boost: 1 });
      for (const m of g.engagedMinions().slice()) if (g.c(m).zone === 'minion' && g.isHero()) await g.enemyAttack(m, {});
    }
  };
  S['01190'] = { // Shadow of the Past
    async whenRevealed(g, u, ctx) {
      const set = g.e.setaside.filter(x => g.ownerOf(x) === null || g.ownerOf(x) === g.s.ctx);
      const minions = set.filter(x => g.d(x).type === 'minion');
      const schemes = set.filter(x => g.d(x).type === 'side');
      const rest = set.filter(x => !minions.includes(x) && !schemes.includes(x));
      if (!set.length) { g.log('숙적 세트가 이미 나와 쇄도'); ctx.surge++; return; }
      g.log('과거의 그림자: 숙적이 등장합니다', 'warn');
      for (const m of minions) { await g.show({ type: 'reveal', uid: m, title: '숙적 등장' }); await g.enterMinion(m, {}); }
      for (const s of schemes) { await g.show({ type: 'reveal', uid: s, title: '숙적 음모' }); await g.enterSide(s, {}); }
      rest.forEach(x => g.put(x, 'edeck'));
      g.shuffle(g.e.deck);
      if (!minions.length) ctx.surge++;
    }
  };

  // ======================= Spider-Man nemesis: Vulture (01166-01169) =======================
  S['01166'] = { // Highway Robbery
    async whenRevealed(g, u) {
      await g.forEachPlayer(() => {
        if (!g.p.hand.length) return;
        const x = g.p.hand[Math.floor(g.rand() * g.p.hand.length)];
        g.put(x, 'under', u);
      });
      if (g.c(u).under.length) g.log('노상강도: 손에서 무작위 1장씩을 뒷면으로 이 카드 아래에 둡니다');
    },
    async whenDefeated(g, u) {
      const under = g.c(u).under.slice();
      under.forEach(x => g.put(x, 'hand'));
      if (under.length) g.log(`노상강도: ${under.map(x => g.nm(x)).join(', ')} 손으로 돌아옴`, 'good');
    }
  };
  S['01168'] = { // Sweeping Swoop
    async whenRevealed(g, u, ctx) {
      if (g.isHero()) g.giveStatus(g.idt(), 'stun', '기절');
      if (g.e.minions.some(x => g.c(x).id === '01167')) { g.log('벌처가 있어 쇄도'); ctx.surge++; }
    },
    boostEffect(g, u, ctx) {
      if (ctx.onDamaged) ctx.onDamaged.push(async (gg, units) => units.forEach(x => gg.giveStatus(x, 'stun', '기절 (휩쓰는 강습)')));
    }
  };
  S['01169'] = { // The Vulture's Plans
    async whenRevealed(g) {
      const types = new Set();
      await g.forEachPlayer(async () => {
        const out = await g.discardRandomHand(1);
        out.forEach(x => (g.d(x).res || '').split('').forEach(l => types.add(l)));
      });
      if (types.size) await g.placeThreat(g.e.main, types.size, {});
      else g.log('버린 카드가 없어 위협 없음');
    }
  };


  // ======================= helpers for encounter scripts =======================
  const villainNamed = (g, name) => g.e.villain && g.d(g.e.villain).en.replace(/^\*\s*/, '') === name ? g.e.villain : null;
  const hostOf = (g, u) => g.c(u).on;
  const discardThisAction = (label, req, exhaustHero) => ({ timing: 'hero', label, cost: { n: req.length, req }, exhaustHero: !!exhaustHero,
    async use(g, u) { g.discard(u, `${g.nm(u)}을(를) 버렸습니다`); } });
  const payOrElse = async (g, title, cost, elseLabel, elseFn) => {
    const opts = [];
    if (g.canAfford(cost, null)) opts.push({ id: 'pay', label: `자원 지불 (${cost.req.split('').map(l => MC.RES_KO[l]).join('·')})` });
    opts.push({ id: 'else', label: elseLabel });
    const pick = opts.length === 1 ? 'else' : await g.ask({ type: 'choice', title, options: opts });
    if (pick === 'pay') { const paid = await g.pay(cost, null, title, false); if (paid != null) return; }
    await elseFn();
  };
  const putMinionFromEncounter = async (g, pred, label) => {
    const m = g.searchEncounter(pred);
    if (m) { g.log(`${label}: ${g.nm(m)}을(를) 찾아 교전시킵니다`); await g.show({ type: 'reveal', uid: m, title: label }); await g.enterMinion(m, {}, true); }
    g.shuffle(g.e.deck);
    return m;
  };
  const discardUntilMinion = async (g, pred, label) => {
    const m = g.discardEncounterUntil(pred);
    if (m) { g.log(`${label}: ${g.nm(m)}이(가) 교전합니다`); await g.show({ type: 'reveal', uid: m, title: label }); await g.enterMinion(m, {}, true); }
    return m;
  };

  // ======================= Rhino III =======================
  S['01096'] = { async whenRevealed(g) { await g.forEachPlayer(() => { if (g.isHero()) g.giveStatus(g.idt(), 'stun', '기절'); }); } };

  // ======================= Klaw (01113-01127) =======================
  S['01113'] = { attackBoostExtra: 1 };
  S['01114'] = { attackBoostExtra: 1,
    async whenRevealed(g) {
      const k = g.searchEncounter(d => d.id === '01127');
      if (k) { g.log('클로 II: 「"불멸의" 클로」를 찾아 공개합니다'); await g.reveal(k); }
      g.shuffle(g.e.deck);
    } };
  S['01115'] = { attackBoostExtra: 1 };
  S['01116a'] = { // Underground Distribution (setup)
    async setup(g) { const dn = g.e.aside.find(u => g.c(u).id === '01125'); if (dn) { g.log('준비: 「방어망」 부가 음모를 공개합니다'); await g.reveal(dn); } }
  };
  S['01116b'] = { async whenRevealed(g) { await g.withPlayer(g.s.first, () => discardUntilMinion(g, d => d.type === 'minion', '지하 유통망')); } };
  S['01117a'] = { async whenRevealed(g) { await g.withPlayer(g.s.first, () => discardUntilMinion(g, d => d.type === 'minion', '비밀 회동')); } };
  S['01118'] = { // Sonic Converter
    on: { async enemyAttacks(g, u, ctx) { if (ctx.enemy === hostOf(g, u)) ctx.onDamaged.push(async (gg, units) => units.forEach(x => gg.giveStatus(x, 'stun', '기절 (음파 변환기)'))); } },
    actions: [discardThisAction('에너지·정신·물리 지불 → 버리기', 'YBR')]
  };
  S['01119'] = { // Solid-Sound Body
    mod: { retaliate: (g, self, target) => target === hostOf(g, self) ? 1 : 0 },
    actions: [discardThisAction('에너지·정신·물리 지불 → 버리기', 'YBR')]
  };
  S['01121'] = { // Weapons Runner
    boostEffect(g, u, ctx) { ctx.putIntoPlay = (ctx.putIntoPlay || []).concat(u); g.log('★ 강화: 무기 밀매상이 교전합니다'); }
  };
  S['01122'] = { // Klaw's Vengeance
    async whenRevealedAlter(g) { await g.discardRandomHand(1); },
    async whenRevealedHero(g) {
      if (!g.e.villain) return;
      await g.enemyAttack(g.e.villain, { boost: 1, onDamaged: async (gg, units, dealt) => { if (dealt > 0) await gg.placeThreat(gg.e.main, 1, {}); } });
    }
  };
  S['01123'] = { // Sonic Boom
    async whenRevealed(g) {
      await payOrElse(g, '소닉 붐', { n: 3, req: 'YBR' }, '내가 조종하는 캐릭터 모두 소진', async () => {
        g.friendlyChars().forEach(x => { g.c(x).ex = true; }); g.log('소닉 붐: 캐릭터를 모두 소진');
      });
    },
    boostEffect(g, u, ctx) { if (ctx.onDamaged) ctx.onDamaged.push(async (gg, units) => { if (units.includes(gg.idt()) && gg.isHero()) { gg.c(gg.idt()).ex = true; gg.log('★ 소닉 붐: 히어로 소진'); } }); }
  };
  S['01124'] = { // Sound Manipulation
    async whenRevealedAlter(g, u, ctx) { const v = g.e.villain; const h = v ? g.heal(v, 4) : 0; if (h) g.log(`${g.nm(v)} 피해 ${h} 회복`); else { g.log('회복할 피해가 없어 쇄도'); ctx.surge++; } },
    async whenRevealedHero(g, u) { await g.dealDamage(g.idt(), 2, { src: u }); const v = g.e.villain; if (v) { const h = g.heal(v, 2); if (h) g.log(`${g.nm(v)} 피해 ${h} 회복`); } }
  };
  S['01125'] = { async whenRevealed(g, u) { await g.placeThreat(u, 1 * g.players, {}); } }; // Defense Network
  S['01126'] = { async whenRevealed(g, u) { await g.placeThreat(u, 1 * g.players, {}); } }; // Illegal Arms Factory
  S['01127'] = { mod: { hp: (g, self, target) => target === g.e.villain && villainNamed(g, 'Klaw') ? 10 : 0 } }; // The "Immortal" Klaw

  // ======================= Masters of Evil (01128-01133) =======================
  const isMoE = (g, u) => g.hasTrait(u, 'MASTERS OF EVIL');
  S['01128'] = { async whenRevealed(g) { await g.withPlayer(g.s.first, () => discardUntilMinion(g, d => d.type === 'minion' && (d.tr || []).includes('MASTERS OF EVIL'), '마스터즈 오브 이블')); } };
  S['01129'] = { // Radioactive Man
    on: { async afterEnemyAttack(g, u, ctx) { if (ctx.enemy === u) await g.discardRandomHand(1); } },
    async boostEffect(g) { g.log('★ 강화: 라디오액티브맨'); await g.discardRandomHand(1); }
  };
  S['01130'] = { // Whirlwind
    on: { async afterEnemyAttack(g, u, ctx) {
      if (ctx.enemy !== u || g._wwActive || g.livingPlayers().length <= 1) return;
      const orig = g.s.ctx; g._wwActive = true;
      try {
        for (const pi of g.playerOrder(orig).slice(1)) {
          if (g.c(u).zone !== 'minion') break;
          await g.withPlayer(pi, async () => { if (g.isHero()) await g.enemyAttack(u, {}); });
        }
      } finally { g._wwActive = false; }
    } },
    async boostEffect(g, u) { await g.forEachPlayer(async () => { if (g.isHero()) { g.log('★ 강화: 월윈드 — 각 히어로에게 피해 1'); await g.dealDamage(g.idt(), 1, { src: u }); } }); }
  };
  S['01131'] = { // Tiger Shark
    on: { async afterEnemyAttack(g, u, ctx) { if (ctx.enemy === u) g.giveStatus(u, 'tough', '강인함 획득'); } },
    async boostEffect(g) { if (g.e.villain) g.giveStatus(g.e.villain, 'tough', '★ 강화: 강인함 획득'); }
  };
  S['01132'] = { // Melter
    mustDefendWithAlly: true,
    async boostEffect(g) { g.p.allies.forEach(x => { g.c(x).ex = true; }); if (g.p.allies.length) g.log('★ 강화: 멜터 — 동료 모두 소진'); }
  };
  S['01133'] = { // Masters of Mayhem
    async whenRevealed(g) {
      let attacked = false;
      // matches the original: a stunned minion's "attack" only removes the stun, so it doesn't count as an attack made
      for (const m of g.e.minions.slice()) if (g.c(m).zone === 'minion' && isMoE(g, m)) {
        const eng = g.c(m).eng != null ? g.c(m).eng : g.s.ctx;
        await g.withPlayer(eng, async () => {
          if (g.isHero() && g.attackMade(await g.enemyAttack(m, {}))) attacked = true;
        });
      }
      if (!attacked) await putMinionFromEncounter(g, d => d.type === 'minion' && (d.tr || []).includes('MASTERS OF EVIL'), '혼돈의 대가들');
    }
  };

  // ======================= Ultron (01134-01150) =======================
  S['01134'] = { // Ultron I
    on: { async afterEnemyAttack(g, u, ctx) {
      if (ctx.enemy !== u) return;
      const pick = await g.ask({ type: 'choice', title: '울트론: 하나를 고르세요', options: [{ id: 'threat', label: '주 음모에 위협 1' }, { id: 'drone', label: '덱 맨 위 카드를 드론으로' }] });
      if (pick === 'threat') await g.placeThreat(g.e.main, 1, {}); else await g.createDrones(1);
    } }
  };
  S['01135'] = { // Ultron II
    on: { async enemyAttacks(g, u, ctx) {
      if (ctx.enemy !== u) return;
      await g.createDrones(1);
      ctx.atkBonus = (ctx.atkBonus || 0) + g.myDrones().length;
    } }
  };
  S['01136'] = { // Ultron III
    cannotTakeDamage: g => g.drones().length > 0,
    mod: { atk: (g, self, t) => g.c(t).zone === 'minion' && g.hasTrait(t, 'DRONE') ? 1 : 0, hp: (g, self, t) => g.c(t).zone === 'minion' && g.hasTrait(t, 'DRONE') ? 1 : 0 },
    async whenRevealed(g) {
      const k = g.searchEncounter(d => d.id === '01150');
      if (k) { g.log('울트론 III: 「울트론의 지상명령」을 찾아 공개합니다'); await g.reveal(k); }
      g.shuffle(g.e.deck);
    }
  };
  S['01137a'] = { async setup(g) { const env = g.e.aside.find(u => g.c(u).id === '01140'); if (env) { g.put(env, 'env'); g.log('준비: 「울트론 드론」 환경 카드를 플레이 영역에 둡니다'); } } };
  S['01137b'] = { async whenRevealed(g) { await g.forEachPlayer(() => g.createDrones(1)); } };
  S['01138a'] = { async whenRevealed(g) { await g.forEachPlayer(() => g.createDrones(1)); } };
  S['01138b'] = { // Assault on NORAD
    on: { async mainStep1(g, u, ctx) {
      if (g.c(u).id !== ctx.mainId) return; // only when step-1 threat went onto this stage
      await g.forEachPlayer(async () => {
        const pick = await g.ask({ type: 'choice', title: 'NORAD 습격: 하나를 고르세요', options: [{ id: 'threat', label: '이 음모에 위협 2' }, { id: 'drone', label: '덱 맨 위 카드를 드론으로' }] });
        if (pick === 'threat') await g.placeThreat(u, 2, {}); else await g.createDrones(1);
      });
    } }
  };
  S['01139a'] = { async whenRevealed(g) { await g.forEachPlayer(() => g.createDrones(1)); } };
  S['01139b'] = { noRemove: true };
  S['01141'] = { // Program Transmitter
    on: { async afterEnemyScheme(g, u, ctx) { if (ctx.enemy === hostOf(g, u)) for (const sch of g.e.sides.slice()) await g.placeThreat(sch, 1, {}); } },
    actions: [discardThisAction('히어로 소진·정신 2 → 버리기', 'BB', true)]
  };
  S['01142'] = { // Upgraded Drones
    attachTo: g => g.e.env.find(u => g.c(u).id === '01140') || null,
    mod: { atk: (g, self, t) => g.c(t).id === 'DRONE' ? 1 : 0, hp: (g, self, t) => g.c(t).id === 'DRONE' ? 1 : 0 },
    actions: [discardThisAction('에너지·정신·물리 지불 → 버리기', 'YBR')]
  };
  S['01143'] = { async whenDefeated(g) { await g.createDrones(1); } }; // Advanced Ultron Drone
  const androidEff = req => ({
    async whenRevealed(g) { await g.forEachPlayer(() => g.createDrones(1)); },
    async boostEffect(g) { await payOrElse(g, '★ 안드로이드의 효율', { n: 1, req }, '덱 맨 위 카드를 드론으로', async () => g.createDrones(1)); }
  });
  S['01144a'] = androidEff('Y'); S['01144b'] = androidEff('B'); S['01144c'] = androidEff('R');
  S['01145'] = { // Rage of Ultron
    async whenRevealedAlter(g) { if (g.e.villain) await g.enemyScheme(g.e.villain, { boost: 1, onPlaced: async (gg, n) => { if (n > 0) await gg.discardDeckTop(n); } }); },
    async whenRevealedHero(g) { if (g.e.villain) await g.enemyAttack(g.e.villain, { boost: 1, onDamaged: async (gg, units, dealt) => { if (dealt > 0) await gg.discardDeckTop(dealt); } }); }
  };
  S['01146'] = { // Repair Sequence
    async whenRevealed(g, u, ctx) { const v = g.e.villain; const n = 2 * g.myDrones().length; const h = (v && n) ? g.heal(v, n) : 0; if (h) g.log(`${g.nm(v)} 피해 ${h} 회복`); else { g.log('회복한 피해가 없어 쇄도'); ctx.surge++; } },
    async boostEffect(g) { const v = g.e.villain; const n = g.myDrones().length; if (v && n) { const h = g.heal(v, n); if (h) g.log(`★ 강화: ${g.nm(v)} 피해 ${h} 회복`); } }
  };
  S['01147'] = { // Swarm Attack
    async whenRevealed(g) {
      let made = false;
      if (g.isHero()) for (const d of g.myDrones()) if (g.c(d).zone === 'minion') { if (g.attackMade(await g.enemyAttack(d, {}))) made = true; }
      if (!made) await g.createDrones(1);
    }
  };
  S['01148'] = { async whenRevealed(g, u) { await g.forEachPlayer(() => g.createDrones(1)); await g.placeThreat(u, g.drones().length, {}); } }; // Drone Factory
  S['01149'] = { async whenRevealed(g) { await g.forEachPlayer(() => g.discardDeckTop(3)); } }; // Invasive AI
  S['01150'] = { async whenRevealed(g) { await g.withPlayer(g.s.first, () => g.createDrones(2)); } }; // Ultron's Imperative

  // ======================= Under Attack (01151-01154) =======================
  S['01151'] = {
    async whenRevealed(g, u) {
      await g.forEachPlayer(async () => {
        const opts = [{ id: 'threat', label: '이 음모에 위협 2' }];
        if (g.isHero()) opts.push({ id: 'dmg', label: `${g.playerName()}에게 피해 3` });
        const pick = opts.length === 1 ? 'threat' : await g.ask({ type: 'choice', title: '습격받는 중: 하나를 고르세요', options: opts });
        if (pick === 'dmg') await g.dealDamage(g.idt(), 3, { src: u }); else await g.placeThreat(u, 2, {});
      });
    }
  };
  S['01152'] = { // Vibranium Armor
    on: { async afterTakeDamage(g, u, ctx) { if (ctx.target === hostOf(g, u) && g.c(ctx.target).zone) g.giveStatus(ctx.target, 'tough', '강인함 획득 (비브라늄 갑옷)'); } },
    actions: [discardThisAction('히어로 소진·물리 2 → 버리기', 'RR', true)]
  };
  S['01153'] = { // Concussion Blasters
    mod: { retaliate: (g, self, target) => target === hostOf(g, self) ? 1 : 0 },
    actions: [discardThisAction('히어로 소진·에너지 2 → 버리기', 'YY', true)]
  };
  S['01154'] = { // Concussive Blast
    async whenRevealed(g, u) { g.log('충격파 폭발: 아군 캐릭터 모두에게 피해 1'); for (const x of g.allFriendlyChars().slice()) if (g.c(x).zone) await g.dealDamage(x, 1, { src: u }); },
    async boostEffect(g, u) { g.log('★ 강화: 내 캐릭터 모두에게 피해 1'); for (const x of g.friendlyChars().slice()) if (g.c(x).zone) await g.dealDamage(x, 1, { src: u }); }
  };

  // ======================= Legions of Hydra (01180-01182) =======================
  const lohInPlay = g => g.e.sides.find(u => g.c(u).id === '01180');
  S['01180'] = {
    async whenRevealed(g, u) {
      if (!g.e.minions.some(x => g.c(x).id === '01181')) await putMinionFromEncounter(g, d => d.id === '01181', '하이드라 군단');
      const n = 2 * g.enemies().filter(x => g.hasTrait(x, 'HYDRA')).length;
      if (n) await g.placeThreat(u, n, {});
    }
  };
  S['01181'] = { // Madame Hydra
    cannotTakeDamage: g => !!lohInPlay(g),
    on: {
      async afterEnemyAttack(g, u, ctx) { const l = lohInPlay(g); if (ctx.enemy === u && l) await g.placeThreat(l, 2, {}); },
      async afterEnemyScheme(g, u, ctx) { const l = lohInPlay(g); if (ctx.enemy === u && l) await g.placeThreat(l, 2, {}); }
    }
  };
  S['01182'] = { async whenDefeated(g) { await g.dealEncounterCard(); } }; // Hydra Soldier

  // ======================= The Doomsday Chair (01183-01185) =======================
  S['01183'] = { async whenRevealed(g) { if (!g.e.minions.some(x => g.c(x).id === '01184')) await putMinionFromEncounter(g, d => d.id === '01184', '둠스데이 체어'); } };
  S['01185'] = { // Biomechanical Upgrades
    attachTo(g) {
      const c = g.e.minions.filter(m => !g.c(m).att.some(a => g.c(a).id === '01185'));
      if (!c.length) return null;
      const best = Math.max(...c.map(m => g.d(m).hp || 0));
      return c.find(m => (g.d(m).hp || 0) === best);
    },
    on: { async hostWouldBeDefeated(g, u, ctx) {
      if (ctx.target !== hostOf(g, u)) return;
      ctx.saved = true; g.c(ctx.target).dmg = 0;
      g.discard(u, `생체기계 업그레이드: ${g.nm(ctx.target)}의 격파를 막고 피해를 모두 회복`);
    } }
  };

  // ======================= Expert (01191-01193) =======================
  S['01191'] = { async whenRevealed(g) { g.c(g.idt()).ex = true; g.log('탈진: 정체성 카드 소진'); } };
  S['01192'] = {
    async whenRevealed(g) {
      if (g.e.sides.length) { for (const sch of g.e.sides.slice()) await g.placeThreat(sch, 4, {}); return; }
      const sch = g.discardEncounterUntil(d => d.type === 'side');
      if (sch) { g.log(`마스터플랜: 「${g.nm(sch)}」을(를) 공개합니다`); await g.reveal(sch); }
    }
  };
  S['01193'] = { async whenRevealed(g) { const n = g.takeEncounter(); if (n) { g.log('포화 속에서: 조우 카드 1장 추가 공개'); await g.reveal(n); } } };


  // ======================= helpers for the hero sets =======================
  const aerial = g => g.hasTrait(g.idt(), 'AERIAL');
  const myTech = g => g.myUpgrades().filter(u => g.hasTrait(u, 'TECH'));
  const bpUpgrades = g => g.myUpgrades().filter(u => g.hasTrait(u, 'BLACK PANTHER'));
  const resCount = (g, u, l) => (g.d(u).res || '').split('').filter(x => x === l).length;
  // obligations: "You may flip to alter-ego form. Choose: exhaust <alter-ego> → remove this from the game, or <other>."
  async function obligation(g, u, title, otherLabel, other) {
    if (g.isHero()) {
      const f = await g.ask({ type: 'choice', title: `${title}: 일상 모습으로 변신할 수 있습니다`, options: [{ id: 'flip', label: `${MC.cards[g.p.alterId].name}(으)로 변신` }, { id: 'no', label: '그대로 둔다' }] });
      if (f === 'flip') await g.changeForm(true);
    }
    const opts = [];
    if (!g.isHero() && !g.c(g.idt()).ex) opts.push({ id: 'remove', label: `${g.nm(g.idt())} 소진 → ${g.nm(u)}을(를) 게임에서 제거` });
    opts.push({ id: 'other', label: otherLabel });
    const pick = opts.length === 1 ? 'other' : await g.ask({ type: 'choice', title: `${title}: 하나를 고르세요`, options: opts });
    if (pick === 'remove') { g.c(g.idt()).ex = true; g.removeFromGame(u); g.log(`${g.nm(u)}을(를) 게임에서 제거`, 'good'); }
    else await other();
  }
  async function pickFrom(g, cards, title, min, max, confirm) {
    if (!cards.length) return [];
    const sel = await g.ask({ type: 'select', title, cards: cards.slice(), min, max, confirm: confirm || '확정' });
    return (sel || []).filter(x => cards.includes(x));
  }
  async function searchDeckToHand(g, pred, title) {
    const cands = g.p.deck.filter(x => pred(g.d(x), x));
    if (!cands.length) { g.log(`${title}: 덱에 해당하는 카드가 없습니다`); g.shuffle(g.p.deck); return null; }
    const pick = (await pickFrom(g, cands, `${title}: 손으로 가져올 카드`, 1, 1, '가져오기'))[0] || cands[0];
    g.put(pick, 'hand'); g.shuffle(g.p.deck);
    g.log(`${title}: ${g.nm(pick)}을(를) 손으로 가져오고 덱을 섞습니다`, 'good');
    return pick;
  }
  const sideByName = (g, id) => g.e.sides.find(x => g.c(x).id === id);
  const startPerHero = { async whenRevealed(g, u) { await g.placeThreat(u, 1 * g.players, {}); } };

  // ======================= Captain Marvel (01010-01018, 01175) =======================
  S['01010a'] = { // Captain Marvel — Rechannel
    actions: [{ timing: 'action', label: '재충전: 에너지 1 지불·피해 1 회복 → 카드 1장 뽑기', once: true, cost: { n: 1, req: 'Y' }, can: g => g.c(g.idt()).dmg > 0,
      async use(g) { g.heal(g.idt(), 1); const n = await g.draw(1); g.log(`재충전: 피해 1 회복, 카드 ${n}장 뽑음`, 'good'); } }]
  };
  S['01010b'] = { // Carol Danvers — Commander
    actions: [{ timing: 'action', label: '지휘관: 카드 1장 뽑기', once: true, async use(g) {
      const pi = await g.choosePlayer('지휘관: 카드를 뽑을 플레이어');
      await g.withPlayer(pi, async () => { await g.draw(1); if (g.players > 1) g.log(`지휘관: ${g.playerName(pi)} 카드 1장 뽑음`); });
    } }]
  };
  S['01011'] = { async onEnter(g) { if (g.e.villain) g.giveStatus(g.e.villain, 'conf', '혼란 (스파이더우먼)'); } }; // Spider-Woman
  S['01012'] = { // Crisis Interdiction
    play: { timing: 'hero', label: 'thwart', target: 'thwartable',
      async resolve(g, u, ctx) {
        const r = await g.removeThreat(ctx.target, 2, { src: u }); g.log(`위기 저지: ${g.nm(ctx.target)} 위협 ${r} 제거`);
        await g.afterThreatRemoved(ctx.target);
        if (aerial(g)) {
          const t2 = await g.chooseTarget({ kind: 'thwartable', filter: (gg, x) => x !== ctx.target }, '위기 저지 (비행): 위협 2를 제거할 다른 음모', u, false);
          if (t2) { const r2 = await g.removeThreat(t2, 2, { src: u }); g.log(`위기 저지: ${g.nm(t2)} 위협 ${r2} 제거`); await g.afterThreatRemoved(t2); }
        }
      } }
  };
  S['01013'] = { // Photonic Blast
    play: { timing: 'hero', label: 'attack', target: 'attackable',
      async resolve(g, u, ctx) {
        g.log(`광자 폭발 → ${g.nm(ctx.target)} 5`); await g.playerAttack(g.idt(), ctx.target, 5, {});
        if (g.paidWith(ctx.paid, 'Y')) { await g.draw(1); g.log('광자 폭발: 에너지 자원으로 냈으니 카드 1장 뽑음', 'good'); }
      } }
  };
  S['01015'] = { // Alpha Flight Station
    actions: [{ timing: 'action', label: '소진·손 1장 버리기 → 카드 뽑기', exhaust: true, can: g => g.p.hand.length > 0,
      async use(g) {
        const sel = await pickFrom(g, g.p.hand, '알파 플라이트 기지: 버릴 카드', 1, 1, '버리기');
        if (sel[0]) g.put(sel[0], 'discard');
        const n = (!g.isHero() && g.c(g.idt()).id === '01010b') ? 2 : 1;
        await g.draw(n); g.log(`알파 플라이트 기지: 카드 ${n}장 뽑음`, 'good');
      } }]
  };
  S['01016'] = { mod: { def: (g, self, t) => (t === g.idt() && g.isHero()) ? (aerial(g) ? 2 : 1) : 0 } }; // Captain Marvel's Helmet
  S['01017'] = { // Cosmic Flight
    grantTrait: (g, self, t) => (t === g.idt() && g.isHero()) ? 'AERIAL' : null,
    respond: [{ window: 'identityWouldTakeDamage', timing: 'hero', label: '우주 비행 버리기 → 피해 3 방지', can: (g, u, ctx) => ctx.amount - ctx.prevent > 0,
      async resolve(g, u, ctx) { ctx.prevent += 3; g.discard(u, '우주 비행: 피해 3 방지'); } }]
  };
  S['01018'] = { // Energy Channel
    actions: [
      { timing: 'action', label: '에너지 X 지불 → 에너지 카운터 X', can: g => g.canAfford({ n: 1, req: 'Y' }, null),
        async use(g, u) {
          let max = 0; while (max < 10 && g.canAfford({ n: max + 1, req: 'Y'.repeat(max + 1) }, null)) max++;
          const opts = []; for (let i = max; i >= 1; i--) opts.push({ id: String(i), label: `에너지 ${i}개 → 카운터 ${i}` });
          const x = max === 1 ? 1 : +(await g.ask({ type: 'choice', title: '에너지 채널: 몇 개를 지불할까요?', options: opts }));
          const paid = await g.pay({ n: x, req: 'Y'.repeat(x) }, null, `에너지 채널: 에너지 ${x}`, true);
          if (paid == null) return;
          g.c(u).cnt.energy = (g.c(u).cnt.energy || 0) + x; g.log(`에너지 채널: 카운터 ${g.c(u).cnt.energy}`);
        } },
      { timing: 'hero', kind: 'attack', label: '버리기 → 적에게 피해 (카운터 × 2, 최대 10)', target: 'attackable', can: (g, u) => (g.c(u).cnt.energy || 0) > 0,
        async use(g, u, ctx) { const n = Math.min(10, 2 * (g.c(u).cnt.energy || 0)); g.discard(u); g.log(`에너지 채널 → ${g.nm(ctx.target)} ${n}`); await g.playerAttack(g.idt(), ctx.target, n, { src: u }); } }
    ]
  };
  S['01175'] = { // Family Emergency
    async whenRevealed(g, u, ctx) {
      await obligation(g, u, '가족의 위기', '기절 상태가 되고 쇄도, 의무 카드 버리기', async () => {
        g.giveStatus(g.idt(), 'stun', '기절 (가족의 위기)'); ctx.surge++; g.discard(u);
      });
    }
  };
  S['01176'] = startPerHero; // The Psyche-Magnitron
  S['01177'] = { // Yon-Rogg
    on: { async afterEnemyAttack(g, u, ctx) { const s = sideByName(g, '01176'); if (ctx.enemy === u && s) await g.placeThreat(s, 1, {}); } }
  };
  S['01178'] = { // Kree Manipulator
    async whenRevealed(g) { await g.placeThreat(g.e.main, 1, {}); },
    async boostEffect(g, u, ctx) { if (ctx.undefended) { g.log('★ 강화: 방어하지 않은 공격 → 주 음모에 위협 1'); await g.placeThreat(g.e.main, 1, {}); } }
  };
  S['01179'] = { // Yon-Rogg's Treason
    async whenRevealed(g, u, ctx) {
      const ys = g.p.hand.filter(x => (g.d(x).res || '').includes('Y'));
      if (!ys.length) { g.log('버릴 에너지 카드가 없어 쇄도'); ctx.surge++; return; }
      ys.forEach(x => g.put(x, 'discard')); g.log(`욘-로그의 배신: 에너지 카드 ${ys.length}장 버림 (${ys.map(x => g.nm(x)).join(', ')})`);
    }
  };

  // ======================= She-Hulk (01019-01028, 01160) =======================
  S['01019a'] = { // She-Hulk — "Do You Even Lift?"
    respond: [{ window: 'afterChangeForm', label: '"하나만 들어 봐?": 적에게 피해 2', can: (g, u, ctx) => ctx.form === 'hero' && g.enemies().length > 0,
      async resolve(g, u) { const t = await g.chooseTarget('enemy', '피해 2를 줄 적', u, false); if (t) await g.dealDamage(t, 2, { src: u, byPlayer: true }); } }]
  };
  S['01019b'] = { // Jennifer Walters — "I Object!"
    respond: [{ window: 'threatWouldBePlaced', once: true, label: '"이의 있습니다!": 위협 1 방지 (라운드당 1번)', can: (g, u, ctx) => !ctx.instead && ctx.amount > 0,
      resolve(g, u, ctx) { ctx.amount -= 1; g.log('이의 있습니다!: 위협 1 방지', 'good'); } }]
  };
  S['01020'] = { // Hellcat
    actions: [{ timing: 'action', label: '헬캣을 손으로 되돌리기', async use(g, u) { for (const a of g.c(u).att.slice()) g.discard(a); g.resetCard(u); g.put(u, 'hand'); } }]
  };
  S['01021'] = { // Gamma Slam
    play: { timing: 'hero', label: 'attack', target: 'attackable',
      async resolve(g, u, ctx) { const n = Math.min(15, g.c(g.idt()).dmg); g.log(`감마 슬램 → ${g.nm(ctx.target)} ${n} (입은 피해만큼)`); await g.playerAttack(g.idt(), ctx.target, n, {}); } }
  };
  S['01022'] = { // Ground Stomp
    play: { timing: 'hero', async resolve(g, u) { g.log('그라운드 스톰프: 모든 적에게 피해 1'); for (const e of g.enemies().slice()) if (g.c(e).zone) await g.dealDamage(e, 1, { src: u, byPlayer: true }); } }
  };
  S['01023'] = { // Legal Practice
    play: { timing: 'alter', label: 'thwart', target: 'thwartable',
      async resolve(g, u, ctx) {
        const sel = await pickFrom(g, g.p.hand, '법률 업무: 버릴 카드 (최대 5장, 1장당 위협 1 제거)', 0, Math.min(5, g.p.hand.length), '버리기');
        sel.forEach(x => g.put(x, 'discard'));
        const r = await g.removeThreat(ctx.target, sel.length, { src: u }); g.log(`법률 업무: ${sel.length}장 버림 → ${g.nm(ctx.target)} 위협 ${r} 제거`);
        await g.afterThreatRemoved(ctx.target);
      } }
  };
  S['01024'] = { // One-Two Punch
    interrupt: { window: 'afterBasicAttack', timing: 'hero', can: g => g.c(g.idt()).ex,
      resolve(g) { g.c(g.idt()).ex = false; g.log('원투 펀치: 쉬헐크 준비', 'good'); } }
  };
  S['01025'] = { // Split Personality
    play: { timing: 'action',
      async resolve(g) {
        await g.changeForm(true);
        const need = (g.d(g.idt()).hs || 0) - g.p.hand.length;
        if (need > 0) { const n = await g.draw(need); g.log(`이중인격: 인쇄된 손 크기까지 ${n}장 뽑음`, 'good'); }
      } }
  };
  S['01026'] = { // Superhuman Law Division
    actions: [{ timing: 'alter', kind: 'thwart', label: '소진·정신 1 → 위협 2 제거', exhaust: true, cost: { n: 1, req: 'B' }, target: 'thwartable',
      async use(g, u, ctx) { const r = await g.removeThreat(ctx.target, 2, { src: u }); g.log(`초인 법률 부서: ${g.nm(ctx.target)} 위협 ${r} 제거`); await g.afterThreatRemoved(ctx.target); } }]
  };
  S['01027'] = { // Focused Rage
    actions: [{ timing: 'hero', label: '소진·피해 1 받기 → 카드 1장 뽑기', exhaust: true,
      async use(g, u) { await g.dealDamage(g.idt(), 1, { src: u }); if (g.c(g.idt()).zone) await g.draw(1); } }]
  };
  S['01028'] = { // Superhuman Strength
    mod: { atk: (g, self, t) => (t === g.idt() && g.isHero()) ? 2 : 0 },
    on: { async afterAttack(g, u, ctx) {
      if (ctx.attacker !== g.idt() || !g.c(u).zone) return;
      g.discard(u, '초인적인 힘 버림');
      if (g.c(ctx.target).zone) g.giveStatus(ctx.target, 'stun', '기절 (초인적인 힘)');
    } }
  };
  S['01160'] = { // Legal Work
    async whenRevealed(g, u) {
      await obligation(g, u, '법률 일', '주 음모에 가속 토큰 1개, 의무 카드 버리기', async () => {
        g.addAccel(); g.log('법률 일: 주 음모에 가속 토큰 1개', 'warn'); g.discard(u);
      });
    }
  };
  S['01161'] = startPerHero; // Personal Challenge
  S['01162'] = { mod: { atk: (g, self, t) => t === self ? g.hpLeft(self) : 0 } }; // Titania: ATK = remaining hit points
  S['01163'] = { // Genetically Enhanced
    surgeIfNoHost: true,
    attachTo(g) { const m = g.e.minions; if (!m.length) return null; const best = Math.max(...m.map(x => g.d(x).hp || 0)); return m.find(x => (g.d(x).hp || 0) === best); },
    mod: { hp: (g, self, t) => t === g.c(self).on ? 3 : 0 }
  };
  S['01164'] = { // Titania's Fury
    async whenRevealed(g, u, ctx) {
      const t = g.e.minions.find(x => g.c(x).id === '01162');
      let attacked = false;
      if (t && g.isHero()) attacked = g.attackMade(await g.enemyAttack(t, {}));
      if (!attacked) { if (t && g.c(t).zone) { g.c(t).dmg = 0; g.log('티타니아의 분노: 티타니아의 피해를 모두 회복'); } g.log('티타니아가 공격하지 않아 쇄도'); ctx.surge++; }
    },
    boostEffect(g, u, ctx) { ctx.extraBoost = (ctx.extraBoost || 0) + 1; g.log('★ 강화: 강화 카드 1장을 더 받습니다'); }
  };

  // ======================= Iron Man (01029-01039, 01170) =======================
  S['01029a'] = { mod: { hs: (g, self, t) => t === self ? Math.min(6, myTech(g).length) : 0 } }; // +1 hand size per Tech upgrade (max 7)
  S['01029b'] = { // Tony Stark — Futurist
    actions: [{ timing: 'action', label: '미래학자: 덱 위 3장 중 1장을 손으로', once: true,
      async use(g) {
        const top = await g.lookAtDeckTop(3); if (!top.length) return;
        const pick = (await pickFrom(g, top, '미래학자: 손으로 가져올 카드 (나머지는 버림)', 1, 1, '가져오기'))[0] || top[0];
        g.put(pick, 'hand'); top.filter(x => x !== pick).forEach(x => g.put(x, 'discard'));
        g.log(`미래학자: ${g.nm(pick)}을(를) 손으로, ${top.length - 1}장 버림`, 'good');
      } }]
  };
  S['01030'] = { // War Machine
    actions: [{ timing: 'action', label: '소진·자신에게 피해 2 → 모든 적에게 피해 1', exhaust: true,
      async use(g, u) { await g.dealDamage(u, 2, { src: u }); for (const e of g.enemies().slice()) if (g.c(e).zone) await g.dealDamage(e, 1, { src: u, byPlayer: true }); } }]
  };
  S['01031'] = { // Repulsor Blast
    play: { timing: 'hero', label: 'attack', target: 'attackable',
      async resolve(g, u, ctx) {
        const out = await g.discardDeckTop(5);
        const y = out.reduce((s2, x) => s2 + resCount(g, x, 'Y'), 0);
        const n = 1 + 2 * y; g.log(`리펄서 블라스트: 에너지 ${y}개 → ${g.nm(ctx.target)} ${n}`);
        if (g.c(ctx.target).zone) await g.playerAttack(g.idt(), ctx.target, n, {});
      } }
  };
  S['01032'] = { // Supersonic Punch
    play: { timing: 'hero', label: 'attack', target: 'attackable',
      async resolve(g, u, ctx) { const n = aerial(g) ? 8 : 4; g.log(`초음속 펀치 → ${g.nm(ctx.target)} ${n}`); await g.playerAttack(g.idt(), ctx.target, n, {}); } }
  };
  S['01033'] = { // Pepper Potts
    resources: [{ gen: g => { const top = g.p.discard[g.p.discard.length - 1]; return top ? (g.d(top).res || '') : ''; },
      label: g => `페퍼 포츠 (버림 더미 맨 위: ${g.nm(g.p.discard[g.p.discard.length - 1])})`,
      can: (g, u) => !g.c(u).ex && g.p.discard.length > 0, use: (g, u) => { g.c(u).ex = true; } }]
  };
  S['01034'] = { // Stark Tower
    actions: [{ timing: 'alter', label: '소진 → 버림 더미 맨 위의 기술 업그레이드를 손으로', exhaust: true,
      can: g => g.p.discard.some(x => g.d(x).type === 'upgrade' && g.hasTrait(x, 'TECH')),
      async use(g) { const x = g.p.discard.slice().reverse().find(y => g.d(y).type === 'upgrade' && g.hasTrait(y, 'TECH')); if (x) { g.put(x, 'hand'); g.log(`스타크 타워: ${g.nm(x)}을(를) 손으로`, 'good'); } } }]
  };
  S['01035'] = { // Arc Reactor
    actions: [{ timing: 'hero', label: '소진 → 아이언맨 준비', exhaust: true, can: g => g.c(g.idt()).ex, use(g) { g.c(g.idt()).ex = false; g.log('아크 원자로: 아이언맨 준비', 'good'); } }]
  };
  S['01036'] = { mod: { hp: (g, self, t) => t === g.idt() ? 6 : 0 } }; // Mark V Armor
  S['01037'] = { // Mark V Helmet
    actions: [{ timing: 'hero', kind: 'thwart', label: '소진 → 위협 1 제거 (비행이면 모든 음모에서)', exhaust: true, can: g => g.targets('thwartable').length > 0,
      async use(g, u) {
        if (!aerial(g)) { await g.removeThreatChoose(1, '마크 V 헬멧: 위협 1을 제거할 음모', u); return; }
        for (const t of g.targets('thwartable')) { const r = await g.removeThreat(t, 1, { src: u }); g.log(`마크 V 헬멧: ${g.nm(t)} 위협 ${r} 제거`); await g.afterThreatRemoved(t); }
      } }]
  };
  S['01038'] = { // Powered Gauntlets
    actions: [{ timing: 'hero', kind: 'attack', label: '소진 → 적에게 피해 1 (비행이면 2)', exhaust: true, target: 'attackable',
      async use(g, u, ctx) { const n = aerial(g) ? 2 : 1; g.log(`파워 건틀릿 → ${g.nm(ctx.target)} ${n}`); await g.playerAttack(g.idt(), ctx.target, n, { src: u }); } }]
  };
  S['01039'] = { // Rocket Boots
    mod: { hp: (g, self, t) => t === g.idt() ? 1 : 0 },
    actions: [{ timing: 'hero', label: '소진·정신 1 → 이번 단계 동안 비행', exhaust: true, cost: { n: 1, req: 'B' }, can: g => !aerial(g),
      use(g) { g.addPhaseMod(g.idt(), 'tr:AERIAL', 1); g.log('로켓 부츠: 이번 단계 동안 [비행] 특성', 'good'); } }]
  };
  S['01170'] = { // Business Problems
    async whenRevealed(g, u) {
      await obligation(g, u, '사업 문제', '내 업그레이드를 모두 소진, 의무 카드 버리기', async () => {
        g.myUpgrades().forEach(x => { g.c(x).ex = true; }); g.log('사업 문제: 업그레이드를 모두 소진'); g.discard(u);
      });
    }
  };
  S['01171'] = startPerHero; // Imminent Overload
  S['01173'] = { // Electric Whip Attack
    async whenRevealed(g, u) {
      const ups = g.myUpgrades(), opts = [];
      if (g.isHero()) opts.push({ id: 'dmg', label: `내 히어로에게 피해 ${ups.length} (업그레이드 수)` });
      if (ups.length) opts.push({ id: 'disc', label: '내 업그레이드 1장 골라 버리기' });
      if (!opts.length) return;
      const pick = opts.length === 1 ? opts[0].id : await g.ask({ type: 'choice', title: '전기 채찍 공격: 하나를 고르세요', options: opts });
      if (pick === 'dmg') { if (ups.length) await g.dealDamage(g.idt(), ups.length, { src: u }); }
      else { const t = await g.ask({ type: 'target', title: '버릴 업그레이드', cands: ups, cancelable: false }); g.discard(t, `${g.nm(t)} 버림`); }
    },
    async boostEffect(g, u, ctx) {
      const ups = g.myUpgrades();
      if (!ctx.undefended || !ups.length) return;
      const t = await g.ask({ type: 'target', title: '★ 강화: 방어하지 않은 공격 — 버릴 업그레이드', cands: ups, cancelable: false });
      g.discard(t, `★ 강화: ${g.nm(t)} 버림`);
    }
  };
  S['01174'] = { // Electromagnetic Backlash
    async whenRevealed(g, u) {
      await g.forEachPlayer(async () => {
        const out = await g.discardDeckTop(5);
        const y = out.reduce((s2, x) => s2 + resCount(g, x, 'Y'), 0);
        g.log(`전자기 역류: 에너지 ${y}개 → 피해 ${y}`);
        if (y) await g.dealDamage(g.idt(), y, { src: u });
      });
    }
  };

  // ======================= Black Panther (01040-01049, 01155) =======================
  S['01040b'] = { // T'Challa — Foresight (setup)
    async setup(g) { await searchDeckToHand(g, d => d.type === 'upgrade' && (d.tr || []).includes('BLACK PANTHER'), '선견지명'); }
  };
  S['01041'] = { async onEnter(g) { await searchDeckToHand(g, d => d.type === 'upgrade', '슈리'); } }; // Shuri
  S['01042'] = { // Ancestral Knowledge
    play: { timing: 'alter', can: g => g.p.discard.length > 0,
      async resolve(g) {
        const sel = await pickFrom(g, g.p.discard.slice().reverse(), '선조의 지식: 덱에 섞을 카드 (서로 다른 이름, 최대 3장)', 0, Math.min(3, g.p.discard.length), '섞기');
        const seen = new Set(), keep = sel.filter(x => { const n = g.d(x).name; if (seen.has(n)) return false; seen.add(n); return true; });
        if (keep.length < sel.length) g.log('이름이 같은 카드는 1장만 섞습니다');
        keep.forEach(x => g.put(x, 'deck')); g.shuffle(g.p.deck);
        if (keep.length) g.log(`선조의 지식: ${keep.map(x => g.nm(x)).join(', ')}을(를) 덱에 섞음`, 'good');
      } }
  };
  const wakanda = { // Wakanda Forever! (four printings)
    play: { timing: 'hero', can: g => bpUpgrades(g).length > 0,
      async resolve(g) {
        let left = bpUpgrades(g);
        while (left.length) {
          const pick = left.length === 1 ? left[0] : await g.ask({ type: 'target', title: `와칸다 포에버!: 다음에 발동할 업그레이드 (${left.length}개 남음 · 마지막 단계는 효과 2배)`, cands: left, cancelable: false });
          left = left.filter(x => x !== pick);
          const final = !left.length;
          const sp = g.sc(pick).special;
          if (sp && g.c(pick).zone) { g.log(`특수: ${g.nm(pick)}${final ? ' (마지막 단계)' : ''}`); await sp(g, pick, final); }
          left = left.filter(x => g.c(x).zone);
        }
      } }
  };
  S['01043a'] = wakanda; S['01043b'] = wakanda; S['01043c'] = wakanda; S['01043d'] = wakanda;
  S['01045'] = { actions: [{ timing: 'alter', label: '소진 → 카드 2장 뽑기', exhaust: true, async use(g) { await g.draw(2); } }] }; // The Golden City
  S['01046'] = { // Energy Daggers
    async special(g, u, final) {
      const n = final ? 2 : 1;
      const pi = await g.choosePlayer('에너지 단검: 공격할 플레이어 영역');
      const enemies = (g.e.villain ? [g.e.villain] : []).concat(g.engagedMinions(pi));
      for (const e of enemies) if (g.c(e).zone) await g.dealDamage(e, n, { src: u, byPlayer: true });
    }
  };
  S['01047'] = { // Panther Claws
    async special(g, u, final) {
      if (await g.statusBlocks('attack')) return;
      const t = await g.chooseTarget('attackable', `팬서 클로: 피해 ${final ? 4 : 2}을(를) 줄 적`, u, false);
      if (t) await g.playerAttack(g.idt(), t, final ? 4 : 2, { src: u });
    }
  };
  S['01048'] = { // Tactical Genius
    async special(g, u, final) { if (await g.statusBlocks('thwart')) return; await g.removeThreatChoose(final ? 2 : 1, `전술 천재: 위협 ${final ? 2 : 1}을(를) 제거할 음모`, u); }
  };
  S['01049'] = { // Vibranium Suit
    async special(g, u, final) {
      if (await g.statusBlocks('attack')) return;
      const n = Math.min(final ? 2 : 1, g.c(g.idt()).dmg);
      if (n <= 0) { g.log('비브라늄 슈트: 옮길 피해가 없습니다'); return; }
      const t = await g.chooseTarget('attackable', `비브라늄 슈트: 피해 ${n}을(를) 옮길 적`, u, false);
      if (!t) return;
      const ct = g.sc(t).cannotTakeDamage;
      if (ct && ct(g, t, { src: u })) { g.log(`${g.nm(t)}은(는) 이 피해를 받지 않습니다`); return; }
      g.heal(g.idt(), n); g.log(`비브라늄 슈트: 피해 ${n}을(를) ${g.nm(t)}에게 옮김`);
      await g.playerAttack(g.idt(), t, n, { src: u });
    }
  };
  S['01155'] = { // Affairs of State
    async whenRevealed(g, u) {
      await obligation(g, u, '국정', '블랙 팬서 업그레이드 1장 버리기 (있다면), 의무 카드 버리기', async () => {
        const ups = bpUpgrades(g);
        if (ups.length) { const t = ups.length === 1 ? ups[0] : await g.ask({ type: 'target', title: '버릴 블랙 팬서 업그레이드', cands: ups, cancelable: false }); g.discard(t, `${g.nm(t)} 버림`); }
        g.discard(u);
      });
    }
  };
  S['01157'] = { // Killmonger: no damage from Black Panther upgrades
    cannotTakeDamage: (g, self, o) => !!(o && o.src && g.c(o.src) && g.d(o.src).type === 'upgrade' && g.hasTrait(o.src, 'BLACK PANTHER'))
  };
  S['01158'] = { // Heart-Shaped Herb
    async whenRevealed(g) { for (const x of (g.e.villain ? [g.e.villain] : []).concat(g.engagedMinions())) g.giveStatus(x, 'tough', '강인함 (심장 모양 허브)'); },
    boostEffect(g) { if (g.e.villain) g.giveStatus(g.e.villain, 'tough', '★ 강화: 강인함'); }
  };
  S['01159'] = { // Ritual Combat
    async whenRevealed(g, u) {
      const top = g.takeEncounter(); let x = 1;
      if (top) { g.put(top, 'ediscard'); x += g.d(top).boost || 0; g.log(`의식 결투: ${g.nm(top)} 버림 (강화 아이콘 ${g.d(top).boost || 0}) → X = ${x}`); }
      const opts = [{ id: 'threat', label: `주 음모에 위협 ${x}` }];
      if (g.isHero()) opts.unshift({ id: 'dmg', label: `내 히어로에게 피해 ${x}` });
      const pick = opts.length === 1 ? 'threat' : await g.ask({ type: 'choice', title: '의식 결투: 하나를 고르세요', options: opts });
      if (pick === 'dmg') await g.dealDamage(g.idt(), x, { src: u }); else await g.placeThreat(g.e.main, x, {});
    }
  };

  MC.registerScripts(S);
})();
