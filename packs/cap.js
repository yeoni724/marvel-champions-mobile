/* Captain America hero pack (03001-03034), ported from cards/pack/cap of the community build. */
(function () {
  'use strict';
  const S = {};
  const shield = g => g.p.upgrades.find(u => g.c(u).id === '03009');
  const readyShield = g => { const s = shield(g); return s && !g.c(s).ex ? s : null; };
  const isAvengerAlly = (g, u) => g.d(u).type === 'ally' && g.hasTrait(u, 'AVENGER');
  const uniqueOk = (g, u) => !(g.d(u).unique && g.inPlay().some(x => g.d(x).name === g.d(u).name));

  // ======================= Captain America (03001-03010) =======================
  S['03001a'] = { // Captain America — "I Can Do This All Day!"
    actions: [{ timing: 'action', once: true, label: '손 1장 버림 → 캡틴 아메리카 준비', can: g => g.c(g.idt()).ex && g.p.hand.length > 0 && g.canReady(g.idt()),
      async use(g) {
        const out = await g.discardFromHand(1, 1, '캡틴 아메리카: 버릴 카드 1장');
        if (out.length) { g.c(g.idt()).ex = false; g.log('캡틴 아메리카 준비', 'good'); }
      } }]
  };
  S['03001b'] = { // Steve Rogers — Living Legend / Setup
    costMod: (g, self, uid) => (g.d(uid).type === 'ally' && !g.p.usedOnce.allyPlayed) ? 1 : 0,
    async setup(g) { await g.searchToHand(d => d.id === '03009', '스티브 로저스', { discard: true }); }
  };
  S['03002'] = { // Agent 13
    async onEnter(g, u) { if (g.targets('thwartable').length) await g.removeThreatChoose(2, '에이전트 13: 위협 2를 제거할 음모', u); }
  };
  S['03003'] = { // Fearless Determination
    play: { timing: 'hero',
      async resolve(g) { g.addPhaseMod(g.idt(), 'thw', 1); await g.draw(1); g.log('용기 있는 결단: 이번 단계 저지 +1, 카드 1장 뽑음', 'good'); } }
  };
  S['03004'] = { // Heroic Strike
    play: { timing: 'hero', label: 'attack', target: 'attackable',
      async resolve(g, u, ctx) {
        g.log(`영웅적인 일격 → ${g.nm(ctx.target)} 6`);
        await g.playerAttack(g.idt(), ctx.target, 6, {});
        if (g.paidWith(ctx.paid, 'R') && g.c(ctx.target).zone) g.giveStatus(ctx.target, 'stun', '기절 (물리 자원으로 지불)');
      } }
  };
  S['03005'] = { // Shield Block
    interrupt: { window: 'identityWouldTakeDamage', can: (g, u, ctx) => ctx.target === g.idt() && ctx.amount > ctx.prevent && !!readyShield(g),
      resolve(g, u, ctx) { g.c(readyShield(g)).ex = true; ctx.prevent = ctx.amount; g.log('방패 올리기: 방패를 소진하고 피해를 모두 막음', 'good'); } }
  };
  S['03006'] = { // Shield Toss
    play: { timing: 'hero', label: 'attack', can: g => !!shield(g) && g.targets('attackable').length > 0,
      async resolve(g, u) {
        const max = Math.min(g.p.hand.length, g.targets('attackable').length);
        const out = await g.discardFromHand(0, max, `방패 튕기기: 버릴 카드 X장 (적 X명에게 피해 4)`);
        const s = shield(g); if (s) { g.put(s, 'hand'); g.log('캡틴 아메리카 방패를 손으로 되돌림'); }
        const hit = [];
        for (let i = 0; i < out.length; i++) {
          const c = g.targets('attackable').filter(x => !hit.includes(x));
          if (!c.length) break;
          const t = c.length === 1 ? c[0] : await g.ask({ type: 'target', title: `방패 튕기기: 피해 4를 줄 적 (${i + 1}/${out.length})`, cands: c, cancelable: false });
          hit.push(t);
          g.log(`방패 튕기기 → ${g.nm(t)} 4`);
          await g.playerAttack(g.idt(), t, 4, {});
        }
      } }
  };
  S['03007'] = { // Steve's Apartment
    actions: [{ timing: 'alter', exhaust: true, label: '소진 → 카드 1장 뽑고 피해 1 회복',
      async use(g) { await g.draw(1); const h = g.heal(g.idt(), 1); g.log(`스티브의 집: 카드 1장 뽑음${h ? ', 피해 1 회복' : ''}`, 'good'); } }]
  };
  S['03008'] = { // Captain America's Helmet
    on: { async hostWouldBeDefeated(g, u, w) {
      if (w.target !== g.idt() || !g.isHero()) return;
      g.c(w.target).dmg = g.maxHp(w.target) - 1; w.saved = true;
      g.discard(u, '캡틴 아메리카 헬멧: 체력을 1로 만들고 버려짐');
    } }
  };
  S['03009'] = { // Captain America's Shield
    mod: {
      def: (g, self, t) => (t === g.idt() && g.hostOf(self) === t && g.isHero()) ? 1 : 0,
      retaliate: (g, self, t) => (t === g.idt() && g.hostOf(self) === t && g.isHero()) ? 1 : 0
    }
  };
  S['03010'] = { // Super-Soldier Serum
    resources: [{ gen: 'R', label: '슈퍼 솔져 혈청 (소진)', can: (g, u) => !g.c(u).ex, use: (g, u) => { g.c(u).ex = true; } }]
  };
  S['03026'] = { // Man Out of Time (obligation)
    async whenRevealed(g, u) {
      if (g.isHero()) {
        const f = await g.ask({ type: 'choice', title: '시대를 잃은 남자: 일상 모습으로 변신할 수 있습니다', options: [{ id: 'flip', label: '스티브 로저스로 변신' }, { id: 'no', label: '그대로 둔다' }] });
        if (f === 'flip') await g.changeForm(true);
      }
      const half = Math.floor(g.p.hand.length / 2);
      const opts = [];
      if (!g.isHero() && !g.c(g.idt()).ex) opts.push({ id: 'remove', label: '스티브 로저스 소진 → 이 카드를 게임에서 제거' });
      opts.push({ id: 'discard', label: `손의 절반(${half}장) 버리기 → 이 카드 버림` });
      const pick = opts.length === 1 ? opts[0].id : await g.ask({ type: 'choice', title: '시대를 잃은 남자: 하나를 고르세요', options: opts });
      if (pick === 'remove') { g.c(g.idt()).ex = true; g.removeFromGame(u); g.log('시대를 잃은 남자를 게임에서 제거', 'good'); }
      else { if (half) await g.discardFromHand(half, half, `시대를 잃은 남자: 버릴 카드 ${half}장`); g.discard(u); }
    }
  };
  // nemesis: Baron Zemo
  S['03027'] = { // Hit Squad
    async whenRevealed(g, u) { await g.forEachPlayer(async () => { const n = await g.countBoost(g.discardEncounterN(1)); if (n) await g.dealDamage(g.idt(), n, { src: u }); }); }
  };
  S['03028'] = { cannotThwart: (g, self) => g.c(self).zone === 'minion' && (g.c(self).eng ?? 0) === g.s.ctx }; // Baron Zemo: while engaged with you, you cannot thwart
  S['03030'] = { // Hail Hydra!
    async whenRevealed(g) {
      let needShuffle = false;
      await g.forEachPlayer(async () => {
        let attacked = false;
        for (const m of g.engagedMinions().slice()) if (g.c(m).zone === 'minion' && g.hasTrait(m, 'HYDRA')) { if (g.attackMade(await g.enemyAttack(m, {}))) attacked = true; }
        if (attacked) return;
        const m = g.searchEncounter(d => d.type === 'minion' && (d.tr || []).includes('HYDRA'));
        if (m) { g.log(`하이드라 만세!: ${g.nm(m)}이(가) 교전합니다`); await g.enterMinion(m, {}, true); }
        needShuffle = true;
      });
      if (needShuffle) g.shuffle(g.e.deck);
    }
  };

  // ======================= Leadership (03011-03019) =======================
  S['03011'] = { // Falcon
    async onEnter(g, u) {
      const top = g.e.deck.slice(0, 3);
      const n = top.filter(x => g.d(x).type === 'treachery').length;
      g.log(`팔콘: 조우 덱 위 ${top.length}장 확인 — ${top.map(x => g.nm(x)).join(', ') || '없음'} (배반 ${n}장)`);
      for (let i = 0; i < n && g.targets('thwartable').length; i++) await g.removeThreatChoose(1, `팔콘: 위협 1을 제거할 음모 (${i + 1}/${n})`, u);
    }
  };
  S['03013'] = { // Squirrel Girl
    async onEnter(g, u) { for (const x of g.enemies()) if (g.c(x).zone) await g.dealDamage(x, 1, { src: u, byPlayer: true }); }
  };
  S['03014'] = { // Wonder Man
    attackCost: { can: g => g.p.hand.length > 0, async pay(g) { return (await g.discardFromHand(1, 1, '원더맨: 공격하려면 손에서 1장 버리기')).length > 0; } }
  };
  S['03015'] = { // Avengers Assemble!
    play: { timing: 'hero', can: g => !g.p.usedOnce.avengersAssemble,
      async resolve(g) {
        g.p.usedOnce.avengersAssemble = true;
        for (const x of g.friendlyChars()) if (g.hasTrait(x, 'AVENGER') && g.canReady(x)) g.c(x).ex = false;
        for (const pi of g.livingPlayers()) {
          const p = g.s.ps[pi];
          p.phase = p.phase || {};
          (p.phase.traitMods = p.phase.traitMods || []).push({ tr: 'AVENGER', atk: 1, thw: 1 });
        }
        g.log('어벤저스 어셈블!: 어벤저스 캐릭터 모두 준비, 이번 단계 공격·저지 +1', 'good');
      } }
  };
  S['03017'] = { // Strength in Numbers
    play: { timing: 'action', can: g => g.p.allies.some(a => !g.c(a).ex),
      async resolve(g) {
        const ready = g.p.allies.filter(a => !g.c(a).ex);
        const sel = await g.pickCards(ready, '수의 힘: 소진할 동료 (1명당 카드 1장)', 1, ready.length);
        sel.forEach(a => { g.c(a).ex = true; });
        const n = await g.draw(sel.length);
        g.log(`수의 힘: 동료 ${sel.length}명 소진 → 카드 ${n}장 뽑음`, 'good');
      } }
  };
  const quinjetAllies = (g, u) => g.p.hand.filter(x => isAvengerAlly(g, x) && (g.d(x).cost || 0) <= (g.c(u).cnt.time || 0) && uniqueOk(g, x));
  S['03019'] = { // Quinjet
    on: { async turnBegins(g, u) { const c = g.c(u); c.cnt.time = (c.cnt.time || 0) + 1; g.log(`퀸젯: 시간 카운터 +1 (${c.cnt.time})`); } },
    actions: [{ timing: 'action', label: '어벤저스 동료를 손에서 내놓기', can: (g, u) => quinjetAllies(g, u).length > 0,
      async use(g, u) {
        const c = quinjetAllies(g, u); if (!c.length) return;
        const x = c.length === 1 ? c[0] : await g.ask({ type: 'target', title: '퀸젯: 플레이 영역에 내놓을 어벤저스 동료', cands: c, cancelable: false });
        await g.putAllyIntoPlay(x);
        g.log(`퀸젯: ${g.nm(x)}이(가) 플레이 영역에 들어옴`, 'good');
        g.discard(u, '퀸젯 버림');
      } }]
  };

  // ======================= Basic (03024-03025, 03034) =======================
  S['03024'] = { // Avengers Tower
    allyLimit: g => g.p.allies.every(a => g.hasTrait(a, 'AVENGER')) ? 1 : 0,
    actions: [{ timing: 'action', exhaust: true, label: '소진 → 이번 단계 다음 어벤저스 동료 비용 -1',
      use(g) { g.p.phase = g.p.phase || {}; g.p.phase.towerRed = (g.p.phase.towerRed || 0) + 1; g.log('어벤저스 타워: 이번 단계에 플레이하는 다음 어벤저스 동료 비용 -1'); } }],
    costMod: (g, self, uid) => (g.p.phase && g.p.phase.towerRed && isAvengerAlly(g, uid)) ? g.p.phase.towerRed : 0,
    costUsed: g => { g.p.phase.towerRed = 0; }
  };
  const hasHonorary = (g, t) => t === g.idt() ? g.p.upgrades.some(x => g.c(x).id === '03025') : g.c(t).att.some(x => g.c(x).id === '03025');
  S['03025'] = { // Honorary Avenger
    canPlay: g => g.hasTrait(g.idt(), 'AVENGER'),
    attach: { kind: 'friendly', filter: (g, t) => !hasHonorary(g, t) },
    grantTrait: (g, self, t) => g.hostOf(self) === t ? 'AVENGER' : null,
    mod: { hp: (g, self, t) => g.hostOf(self) === t ? 1 : 0 }
  };
  S['03034'] = { // Enhanced Awareness
    resources: [{ gen: 'B', label: '향상된 인지력 (정신 카운터 1)', can: (g, u) => g.isHero() && !g.c(u).ex && (g.c(u).cnt.mental || 0) > 0,
      use: (g, u) => { g.c(u).ex = true; g.c(u).cnt.mental--; } }]
  };

  // ======================= other aspects (03031-03033) =======================
  const hasCopy = (g, t, id) => g.c(t).att.some(x => g.c(x).id === id);
  S['03031'] = { // Enraged
    attach: { kind: 'ally', filter: (g, t) => !hasCopy(g, t, '03031') },
    mod: { atk: (g, self, t) => g.c(self).on === t ? 2 : 0 },
    on: { async afterAttack(g, u, ctx) { const h = g.c(u).on; if (h && ctx.attacker === h && g.c(h).zone === 'ally') await g.dealDamage(h, 1, { consequential: true }); } }
  };
  S['03032'] = { // Followed
    attach: { kind: 'scheme', filter: (g, t) => g.c(t).zone === 'side' && !hasCopy(g, t, '03032') },
    on: { async attachedDefeated(g, u, ctx) {
      if (!ctx.scheme) return;
      const t = await g.chooseTarget('enemy', '미행: 피해 4를 줄 적', u, false);
      if (t) await g.dealDamage(t, 4, { src: u, byPlayer: true });
    } }
  };
  S['03033'] = { // Expert Defense
    interrupt: { window: 'heroDefends', timing: 'hero', resolve(g, u, ctx) { ctx.defBonus += 3; g.log('전문가의 방어: 이번 공격 방어력 +3', 'good'); } }
  };

  MC.registerScripts(S);
})();
