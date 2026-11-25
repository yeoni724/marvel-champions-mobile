/* The Once and Future Kang (11001-11051): the Kang scenario with its Temporal, Anachronauts and Master of Time sets.
   Ported from cards/pack/toafk of the community build.
   Solo flow of the game areas: stage 1 (Kang I) → when Kang I is defeated, at the end of the phase the main scheme goes to
   The Master of Time, which picks one of the four stage-3 schemes at random; that stage brings its own Kang (stage II).
   Defeating that Kang, or completing that stage, sends you back to The Master of Time at the end of the phase, which then
   advances to Kang's Wrath (stage 4) with Kang III. Completing that stage instead also puts one Kang's Dominion into play. */
(function () {
  'use strict';
  const S = {};
  const isKang = (g, u) => /^\*?\s*Kang\b/.test(g.d(u).en || '');
  const kangVillain = g => (g.e.villain && isKang(g, g.e.villain)) ? g.e.villain : null;
  const K = g => (g.e.kang = g.e.kang || { pending: null, dominion: 0 });
  const obligations = g => (g.p.obl || []).length;
  const allObligations = g => g.livingPlayers().reduce((n, i) => n + (g.s.ps[i].obl || []).length, 0);
  // stage-3 main schemes and the Kang (stage II) each one brings: [standard, expert]
  const STAGE3 = { '11009': ['11002', '11035'], '11010': ['11003', '11036'], '11011': ['11004', '11037'], '11012': ['11005', '11038'] };
  const dealFacedown = (g, n) => { for (let i = 0; i < (n || 1); i++) { const u = g.takeEncounter(); if (u) { g.put(u, 'facedown'); g.log('조우 카드 1장을 뒷면으로 받았습니다'); } } };
  async function choose(g, title, options) { const ok = options.filter(o => !o.can || o.can()); if (!ok.length) return null; const id = ok.length === 1 ? ok[0].id : await g.ask({ type: 'choice', title, options: ok.map(o => ({ id: o.id, label: o.label })) }); const o = ok.find(x => x.id === id) || ok[0]; await o.run(); return o.id; }
  async function discardControlled(g, filter, title) {
    const c = g.controlled().filter(u => !filter || filter(u));
    if (!c.length) return null;
    const t = c.length === 1 ? c[0] : await g.ask({ type: 'target', title, cands: c, cancelable: false });
    g.discard(t, `${g.nm(t)} 버림`); return t;
  }
  function discardRandom(g, n) {
    for (let i = 0; i < n; i++) { if (!g.p.hand.length) return; const u = g.p.hand[Math.floor(g.rand() * g.p.hand.length)]; g.put(u, 'discard'); g.log(`무작위로 ${g.nm(u)} 버림`); }
  }
  function removeKang(g, why) {
    const v = g.e.villain; if (!v) return;
    for (const a of g.c(v).att.slice()) g.discard(a);
    g.resetCard(v); g.put(v, 'removed'); g.e.villain = null;
    g.log(why || `${g.nm(v)}을(를) 게임에서 제거`, 'sys');
  }
  async function bringKang(g, id) {
    const v = g.newCard(id); g.c(v).zone = 'villain'; g.e.villain = v;
    if (g.d(v).toughness) g.c(v).tough = true;
    g.log(`${g.nm(v)} 등장`, 'sys');
    await g.show({ type: 'reveal', uid: v, title: '빌런 등장' });
  }
  async function enemyFromDeckUntilMinion(g, pred, label) {
    const u = g.discardEncounterUntil((d, x) => d.type === 'minion' && (!pred || pred(d, x)));
    if (!u) { g.log(`${label}: 조건에 맞는 하수인이 없습니다`); return null; }
    g.log(`${label}: ${g.nm(u)}`); return u;
  }

  // ---------------- the scenario's game areas (solo) ----------------
  MC.scenarios.the_once_and_future_kang = Object.assign(MC.scenarios.the_once_and_future_kang || {}, {
    async phaseEnd(g) {
      const k = K(g); const what = k.pending; if (!what) return;
      k.pending = null;
      if (what === 'toStage2') {
        g.log('단계가 끝나 주 음모가 2단계로 진행합니다', 'warn');
        await g.setMainStage(1);
        await g.setMainStage(2);
      } else if (what === 'toStage4') {
        if (g.e.villain) removeKang(g, `${g.nm(g.e.villain)}와(과) 이 단계를 게임에서 제거`);
        g.log('시간의 지배자 게임 영역에 합류합니다 — 모든 플레이어가 모였으므로 4단계로 진행', 'warn');
        await g.setMainStage(3);
      }
    }
  });

  // Kang (The Conqueror) I / III: Forced Interrupt when he attacks you
  const conquerorAttack = { on: { async enemyAttacks(g, u, ctx) {
    if (ctx.enemy !== u) return;
    await choose(g, `${g.nm(u)}의 공격: 하나를 고르세요`, [
      { id: 'threat', label: '주 음모에 위협 1 놓기', run: async () => { await g.placeThreat(g.e.main, 1, {}); } },
      { id: 'atk', label: '이번 공격 공격력 +2', run: async () => { ctx.atkBonus = (ctx.atkBonus || 0) + 2; } }
    ]);
  } } };
  const kangI = Object.assign({}, conquerorAttack, {
    async whenDefeatedVillain(g, u) {
      removeKang(g, `${g.nm(u)} 격파 — 게임에서 제거합니다. 이 단계가 끝나면 주 음모가 2단계로 진행합니다`);
      K(g).pending = 'toStage2';
      return 'handled';
    }
  });
  S['11001'] = kangI; S['11034'] = kangI;
  S['11006'] = conquerorAttack; S['11039'] = conquerorAttack;
  const kangII = scheme => ({
    async whenDefeatedVillain(g, u) {
      removeKang(g, `${g.nm(u)} 격파 — 게임에서 제거합니다`);
      g.log(`「${MC.cards[scheme + 'b'].name}」을(를) 게임에서 제거 — 이 단계가 끝나면 다른 게임 영역에 합류합니다`, 'warn');
      K(g).pending = 'toStage4';
      return 'handled';
    }
  });
  S['11002'] = Object.assign(kangII('11009'), { cannotTakeDamage: g => g.e.minions.length > 0 }); // Immortus
  S['11035'] = S['11002'];
  S['11003'] = kangII('11010'); S['11036'] = S['11003']; // Iron Lad (Retaliate from data)
  S['11004'] = Object.assign(kangII('11011'), { mod: { atk: (g, self, t) => t === self ? allObligations(g) : 0 } }); // Rama-Tut
  S['11037'] = S['11004'];
  S['11005'] = Object.assign(kangII('11012'), { attackProps: () => ({ piercing: true }) }); // Scarlet Centurion
  S['11038'] = S['11005'];

  // ---------------- main schemes ----------------
  S['11007b'] = { loseOnComplete: true, async whenRevealed(g) { await g.forEachPlayer(async () => { dealFacedown(g, 1); }); } }; // Kang's Arrival: completing it loses the game
  S['11008b'] = { async whenCompleted() { return 'handled'; } }; // The Master of Time takes no threat (solo: we never stay on it)
  S['11008a'] = { // The Master of Time
    async whenRevealed(g) {
      const sides = g.e.sides.slice();
      if (sides.length) {
        g.e.accelTokens += sides.length;
        g.log(`시간의 지배자: 부가 음모 ${sides.length}개만큼 가속 토큰을 놓고 부가 음모를 모두 버립니다`, 'warn');
        sides.forEach(u => g.discard(u));
      }
      const keys = Object.keys(STAGE3), pick = keys[Math.floor(g.rand() * keys.length)];
      g.e.mainStages[2] = [pick + 'a', pick + 'b'];
      g.log(`무작위로 고른 3단계: ${MC.cards[pick + 'b'].name}`, 'warn');
    }
  };
  for (const sid of Object.keys(STAGE3)) {
    S[sid + 'a'] = { async whenRevealed(g) {
      const id = STAGE3[sid][g.s.scen.expert ? 1 : 0];
      g.e.stages[1] = id; g.e.stage = 1;
      await bringKang(g, id);
      await g.forEachPlayer(async () => { dealFacedown(g, 1); });
    } };
    S[sid + 'b'] = { async whenCompleted(g, m) {
      const k = K(g); if (k.pending) return 'handled';
      k.dominion++; k.pending = 'toStage4';
      g.log(`3단계 완료: 캉의 지배 1장을 4단계 아래에 놓습니다. 이 단계가 끝나면 ${g.e.villain ? g.nm(g.e.villain) + '와(과) ' : ''}이 단계를 제거합니다`, 'warn');
      return 'handled';
    } };
  }
  S['11013a'] = { // Kang's Wrath: Kang III and each Kang's Dominion under this stage
    async whenRevealed(g) {
      const id = g.e.stages[2]; g.e.stage = 2;
      await bringKang(g, id);
      const k = K(g);
      for (let i = 0; i < k.dominion; i++) {
        const u = g.e.aside.find(x => g.c(x).id === '11023');
        if (u) { g.log('캉의 지배를 공개합니다', 'warn'); await g.enterSide(u, {}); }
      }
    }
  };
  S['11013b'] = { // each player puts their nemesis minion into play
    async whenRevealed(g) {
      await g.forEachPlayer(async () => {
        const H = MC.heroes[g.p.heroKey] || Object.values(MC.heroes).find(h => h.hero === g.p.heroId) || {};
        const nem = new Set(H.nemesis || []);
        const u = g.e.deck.concat(g.e.discard, g.e.setaside).find(x => nem.has(g.c(x).id) && g.d(x).type === 'minion');
        if (u) { g.log(`캉의 분노: 숙적 하수인 ${g.nm(u)}이(가) 교전합니다`, 'warn'); await g.enterMinion(u, {}, true); }
      });
      g.shuffle(g.e.deck);
    }
  };

  // ---------------- Kang encounter set ----------------
  S['11014'] = { // Temporal Shield
    attachTo: g => kangVillain(g),
    on: { async hostAttacked(g, a, ctx) {
      ctx.prevent = true;
      g.discard(a, `시간 보호막: 이번 공격의 피해를 모두 방지하고 공격자에게 피해 1 (보호막 버림)`);
      if (g.c(ctx.attacker) && g.c(ctx.attacker).zone) await g.dealDamage(ctx.attacker, 1, { src: g.e.villain });
    } }
  };
  S['11015'] = { // Future Weapon (+2 ATK from data)
    attachTo: g => kangVillain(g),
    on: { async enemyAttacks(g, a, ctx) {
      if (ctx.enemy !== g.c(a).on) return;
      ctx.overkill = true;
      ctx.onDamaged.push(async (gg, alive) => { const id = gg.idt(); if (alive.includes(id) && gg.isHero()) gg.giveStatus(id, 'stun', '미래 무기: 기절'); });
      ctx.after.push(async gg => { if (gg.c(a).zone === 'attach') gg.discard(a, '미래 무기: 공격 후 버림'); });
    } }
  };
  S['11016'] = { // Frozen in Time
    attachTo: g => g.idt(), replacesReady: true,
    boostEffect(g, u, ctx) { (ctx.putIntoPlay = ctx.putIntoPlay || []).push(u); }
  };
  S['11017'] = { boostEffect(g) { const v = kangVillain(g); if (v) g.giveStatus(v, 'tough', '매크로봇: 캉 강인함'); } }; // Macrobots
  // obligations that stay in your play area until an alter-ego action discards them
  const corrupted = g => g.e.sides.some(u => g.c(u).id === '11022');
  const hasRes = (g, l) => g.p.hand.some(u => (g.d(u).res || '').includes(l));
  function temporalObligation(label, can, pay, revealed) {
    return {
      async whenRevealed(g, u, ctx) { g.put(u, 'pobl'); g.log(`${g.nm(u)}이(가) 내 플레이 영역에 남습니다`); if (revealed) await revealed(g, u, ctx); },
      actions: [{ timing: 'alter', label, can: (g, u) => g.c(u).zone === 'pobl' && !corrupted(g) && can(g, u),
        async use(g, u) { if (await pay(g, u) === false) return; g.discard(u, `${g.nm(u)}을(를) 버렸습니다`); } }]
    };
  }
  const discardHandWith = (letter, ko) => async g => {
    const c = g.p.hand.filter(u => (g.d(u).res || '').includes(letter));
    if (!c.length) return false;
    const t = c.length === 1 ? c[0] : await g.ask({ type: 'target', title: `버릴 ${ko} 자원 카드`, cands: c, cancelable: false });
    g.put(t, 'discard'); g.log(`${g.nm(t)} 버림`);
  };
  S['11018'] = Object.assign(temporalObligation('[물리] 자원 카드 버림 → 이 의무 버리기', g => hasRes(g, 'R'), discardHandWith('R', '물리')), { // Weakened
    on: { async basicHeroPower(g, u) { if (g.c(u).zone !== 'pobl') return; g.log('쇠약: 기본 능력 사용 후 피해 1'); await g.dealDamage(g.idt(), 1, { src: u }); } }
  });
  S['11019'] = temporalObligation('[정신] 자원 카드 버림 → 이 의무 버리기', g => hasRes(g, 'B'), discardHandWith('B', '정신'), async (g, u) => { // Stolen Memories
    const top = g.p.deck.slice(0, 8);
    top.forEach(x => g.put(x, 'under', u));
    g.log(`도둑맞은 기억: 덱 위 ${top.length}장을 이 카드 아래에 뒷면으로 놓습니다`, 'warn');
  });
  S['11020'] = Object.assign(temporalObligation('영웅 전용 카드 버림 → 이 의무 버리기', g => g.p.hand.some(u => g.d(u).cls === 'Hero'), async g => { // Depowered
    const c = g.p.hand.filter(u => g.d(u).cls === 'Hero'); if (!c.length) return false;
    const t = c.length === 1 ? c[0] : await g.ask({ type: 'target', title: '버릴 영웅 전용 카드', cands: c, cancelable: false });
    g.put(t, 'discard'); g.log(`${g.nm(t)} 버림`);
  }), { blocksPlay: (g, self, uid) => g.c(self).zone === 'pobl' && g.d(uid).cls === 'Hero' });
  S['11021'] = temporalObligation('[에너지] 자원 카드 버림 → 이 의무 버리기', g => hasRes(g, 'Y'), discardHandWith('Y', '에너지'), async (g, u) => { // Time-Travel Hijinks
    const ctl = g.controlled(); if (!ctl.length) return;
    const top = Math.max(...ctl.map(x => g.d(x).cost || 0));
    const c = ctl.filter(x => (g.d(x).cost || 0) === top);
    const t = c.length === 1 ? c[0] : await g.ask({ type: 'target', title: '시간 여행 소동: 버릴 카드 (비용이 가장 높은 카드)', cands: c, cancelable: false });
    g.discard(t, `${g.nm(t)} 버림`);
    g.put(t, 'under', u); g.log(`${g.nm(t)}을(를) 이 카드 아래에 뒷면으로 놓습니다`);
  });
  S['11022'] = { // Corrupted Timestream
    async whenRevealed(g, u) {
      await g.forEachPlayer(async () => {
        await choose(g, `오염된 시간의 흐름(${g.playerName()}): 하나를 고르세요`, [
          { id: 'discard', label: '손에서 무작위로 1장 버리기', can: () => g.p.hand.length > 0, run: async () => discardRandom(g, 1) },
          { id: 'threat', label: '여기에 위협 2 놓기', run: async () => { await g.placeThreat(u, 2, {}); } }
        ]);
      });
    }
  };
  S['11023'] = { // Kang's Dominion
    shieldsFromDamage: (g, self, target) => g.c(self).zone === 'side' && isKang(g, target),
    async whenDefeated(g) { g.log('캉의 지배 격파: 조우 카드 1장을 받습니다'); dealFacedown(g, 1); }
  };
  S['11024'] = { async whenRevealed(g, u) { const obs = allObligations(g), n = 2 * obs; if (n) { g.log(`고정: 의무 ${obs}장 → 위협 ${n}`); await g.placeThreat(u, n, {}); } } }; // Pinned Down
  const minionToPlay = label => async g => { const u = await enemyFromDeckUntilMinion(g, null, label); if (u) await g.enterMinion(u, {}, true); };
  S['11025'] = { whenDefeated: minionToPlay('난동') }; // Rampage
  S['11026'] = { // Energy Blast
    async whenRevealedAlter(g, u, ctx) { const t = await discardControlled(g, x => ['ally', 'support'].includes(g.d(x).type), '에너지 폭발: 버릴 동료나 지원 카드'); if (!t) { g.log('버릴 카드가 없어 쇄도'); ctx.surge++; } },
    async whenRevealedHero(g) { const v = kangVillain(g); if (v) await g.enemyAttack(v, {}); else g.log('캉이 없어 공격하지 않습니다'); }
  };
  S['11027'] = { async whenRevealed(g, u, ctx) { // Manipulated Timestream
    const ev = g.p.hand.filter(x => g.d(x).type === 'event');
    ev.forEach(x => g.put(x, 'discard'));
    if (ev.length) g.log(`조작된 시간의 흐름: 이벤트 ${ev.length}장 버림`); else { g.log('버릴 이벤트가 없어 쇄도'); ctx.surge++; }
  } };
  S['11028'] = { // Time-Travel Tactics
    async whenRevealed(g) { await g.forEachPlayer(async () => { const n = obligations(g); if (n) await g.indirectDamage(n, null); }); },
    boostEffect: g => obligations(g)
  };
  S['11029'] = { async whenRevealed(g) { // Past Machinations
    const chosenIds = new Set();
    await g.forEachPlayer(async () => {
      const c = g.e.deck.concat(g.e.discard).filter(x => g.d(x).type === 'obligation' && !chosenIds.has(g.c(x).id));
      const seen = new Set(), uniq = c.filter(x => !seen.has(g.c(x).id) && seen.add(g.c(x).id));
      let t = null;
      if (uniq.length) t = uniq.length === 1 ? uniq[0] : await g.ask({ type: 'target', title: `과거의 계략(${g.playerName()}): 공개할 의무 카드`, cands: uniq, cancelable: false });
      if (t) { chosenIds.add(g.c(t).id); g.log(`과거의 계략(${g.playerName()}): ${g.nm(t)} 공개`); await g.reveal(t); } else g.log(`과거의 계략(${g.playerName()}): 공개할 의무 카드가 없습니다`);
    });
    g.shuffle(g.e.deck);
  } };

  // ---------------- Temporal (modular) ----------------
  S['11030'] = { boostEffect(g) { g.giveStatus(g.idt(), 'stun', '고대 전사: 기절'); } }; // Ancient Warrior
  S['11031'] = { on: { async enemyAttacks(g, u, ctx) { // Chitauri Soldier
    if (ctx.enemy !== u) return;
    const d = g.discardEncounterN(1); const n = await g.countBoost(d);
    if (n) await g.indirectDamage(n, u);
  } } };
  S['11032'] = { attackProps: () => ({ piercing: true }) }; // Tyrannosaurus Rex
  S['11033'] = { whenDefeated(g, u) { g.resetCard(u); g.put(u, 'edeck'); g.shuffle(g.e.deck); g.log('시간 포털을 조우 덱에 섞습니다'); } };

  // ---------------- Anachronauts (modular) ----------------
  const anotherBoost = (ctx, n) => { ctx.extraBoost = (ctx.extraBoost || 0) + (n || 1); };
  S['11040'] = { // Apocryphus
    async whenRevealed(g) { await discardControlled(g, x => ['ally', 'support'].includes(g.d(x).type), '아포크리퍼스: 버릴 동료나 지원 카드'); },
    async boostEffect(g, u, ctx) {
      const c = g.friendlyChars().filter(x => !g.c(x).ex);
      if (c.length) { const t = c.length === 1 ? c[0] : await g.ask({ type: 'target', title: '소진할 캐릭터', cands: c, cancelable: false }); g.c(t).ex = true; g.log(`${g.nm(t)} 소진`); }
      anotherBoost(ctx);
    }
  };
  S['11041'] = { boostEffect(g, u, ctx) { if (ctx.enemy && g.c(ctx.enemy).zone) g.giveStatus(ctx.enemy, 'tough', '데스헌트 9000: 강인함'); anotherBoost(ctx); } };
  S['11042'] = { async boostEffect(g, u, ctx) { await g.dealDamage(g.idt(), 1, { src: u }); anotherBoost(ctx); } }; // Sir Raston
  S['11043'] = { attackProps: () => ({ piercing: true }), boostEffect(g, u, ctx) { anotherBoost(ctx, 2); } }; // Terminatrix
  S['11044'] = { whenRevealed(g) { discardRandom(g, 1); }, boostEffect(g, u, ctx) { discardRandom(g, 1); anotherBoost(ctx); } }; // Wildrun
  S['11045'] = { whenDefeated(g) { // The Anachronauts
    const t = g.e.discard.filter(x => (g.d(x).tr || []).includes('TEMPORAL'));
    t.forEach(x => g.put(x, 'edeck')); g.shuffle(g.e.deck);
    g.log(`아나크로노츠 격파: [시간] 카드 ${t.length}장을 조우 덱에 섞습니다`);
  } };
  S['11046'] = { async whenRevealed(g) { // Kang's Chosen
    const u = await enemyFromDeckUntilMinion(g, d => (d.tr || []).includes('TEMPORAL'), '캉의 선택');
    if (u) await g.reveal(u);
  } };

  // ---------------- Master of Time (modular) ----------------
  S['11047'] = { mod: { atk: (g, self, t) => t === self ? (g.s.ps[g.c(self).eng ?? 0].obl || []).length : 0, sch: (g, self, t) => t === self ? (g.s.ps[g.c(self).eng ?? 0].obl || []).length : 0 } };
  S['11048'] = { boostEffect(g) { dealFacedown(g, 1); } }; // Time-Displaced Soldier
  S['11049'] = Object.assign(temporalObligation('손에서 무작위로 1장 버림 → 이 의무 버리기', g => g.p.hand.length > 0, async g => discardRandom(g, 1)), { // Fear of Kang
    cannotAttack: (g, self, enemy) => g.c(self).zone === 'pobl' && isKang(g, enemy)
  });
  S['11050'] = { whenDefeated: minionToPlay('세기의 빛 구체') }; // Light of Centuries Sphere
  S['11051'] = { async whenRevealed(g) { // Ancient Grudge
    const k = g.e.minions.find(x => g.c(x).id === '11047');
    if (k) { g.log('오랜 원한: 캉(시간의 지배자)이 활성화합니다', 'warn'); await g.activate(k, {}); return; }
    const u = g.e.deck.concat(g.e.discard).find(x => g.c(x).id === '11047');
    if (u) { g.log('오랜 원한: 캉(시간의 지배자)이 교전합니다', 'warn'); await g.enterMinion(u, {}, true); }
    g.shuffle(g.e.deck);
  } };

  MC.registerScripts(S);
})();
