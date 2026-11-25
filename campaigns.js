/* Campaign log fields, from the original's public/scene.html (solo: Player 1 only). Labels are translated; keys stay as in the original. */
(function () {
  'use strict';
  const MC = window.MC;
  const redSkullImprovedUpgrades = { '04159a': '04159b', '04160a': '04160b', '04161a': '04161b', '04162a': '04162b' };
  const galaxysMostWantedMarketCards = Array.from({ length: 28 }, (_, i) => String(16150 + i));
  MC.CAMPAIGN_FIELDS = {
                        rise_of_red_skull:
                        [
                            { description: "Player 1 Remaining hit points", type: "number" },
                            { description: "Player 1 Obligations", type: "checkbox", options: ["04163", "04164", "04165", "04166"] },

                            { description: "Player 1 Tech Upgrade", type: "select", options: ["04155", "04156", "04157", "04158"] },
                            { description: "Player 1 tech upgrade removed from campaign", type: "checkbox", options: ["Yes"] },

                            { description: "Player 1 Basic Upgrade", type: "select", options: ["04159a", "04159b", "04160a", "04160b", "04161a", "04161b", "04162a", "04162b"], disabledOptions: Object.values(redSkullImprovedUpgrades) },
                            { description: "Player 1 Basic Condition replaced with Improved side", label: 'Player 1 "Basic" Condition replaced with "Improved" side', type: "checkbox", options: ["Yes"] },

                            { description: "Player 1 Rescued Allies", type: "checkbox", options: ["04097", "04098", "04099", "04100"] },

                            { description: "Experimental Weapons added to encounter deck", type: "checkbox", options: ["04072", "04073", "04074", "04075"] },
                            { description: "Number of delay counters on main scheme", type: "number" },
                            { description: "Players engaged with minions", type: "checkbox", options: ["0", "1", "2", "3"]},
                            { description: "Allies removed from the campaign", type: "list" },

                        ],
                        galaxys_most_wanted:
                        [
                            { description: "Player 1 Remaining hit points", type: "number" },

                            { description: "Player 1 Unspent Units", type: "number" },

                            { description: "Player 1 Market Cards", type: "checkbox", options: galaxysMostWantedMarketCards },

                            { description: "Player 1 Cards in The Collection", type: "list", tooltip: "카드 ID를 ';'로 구분해 입력" },

                            { description: "Headhunter Defeated", type: "checkbox", options: ["Scenario 1", "Scenario 2", "Scenario 3", "Scenario 4"] },
                            { description: "Galactic Artifacts Side Schemes in the Victory Display", type: "checkbox", options: ["16127", "16128", "16129", "16130"] },
                            { description: "Power Stone Control", type: "select", options: ["Player 1", "Player 2", "Player 3", "Player 4"] },
                            { description: "Evasion Counters", type: "number" },
                            { description: "Reveal Kree Supremacy", type: "select", options: ["Yes"] },
                        ],
                        mad_titans_shadow:
                        [
                            { description: "Player 1 Remaining hit points", type: "number" },

                            { description: "Cosmo in campaign pool", type: "select", options: ["Yes"] },
                            { description: "Security Breach in campaign pool", type: "select", options: ["Yes"] },
                            { description: "Shawarma in campaign pool", type: "select", options: ["Yes"] },
                            { description: "Black Swan in campaign pool", type: "select", options: ["Yes"] },
                            { description: "Avengers Tower has the Damaged trait", type: "select", options: ["Yes"] },
                            { description: "System Shock in campaign pool", type: "select", options: ["Yes"] },
                            { description: "The Infinity Stones 1B was completed", type: "select", options: ["Yes"] },
                            { description: "Norn Stone in campaign pool", type: "select", options: ["Yes"] },
                            { description: "Odin in campaign pool", type: "select", options: ["Yes"] },
                        ],
                        sinister_motives:
                        [
                            { description: "Reputation Track", type: "number" },
                            { description: "Player 1 Remaining hit points", type: "number" },
                            { description: "Community Service: Victory for Scenarios #1-4", type: "checkbox", options: ["27176", "27177", "27178", "27179", "27180"] },
                            { description: "Waking Nightmare: Victory for Scenario #3 - Mysterio", type: "number" },
                            { description: "Last Ones Standing: Victory for Scenario #4 - The Sinister Six", type: "checkbox", options: ["27099", "27094", "27095", "27096", "27097", "27098"] },
                            { description: "Final Reputation Score: Victory for Scenario #5 - Venom Goblin", type: "number" },
                            { description: "S.H.I.E.L.D. Tech: Reputation Track Reward P1", type: "select", options: ["27182a,27182b", "27183a,27183b", "27184a,27184b", "27185a,27185b", "27186a,27186b", "27187a,27187b", "27188a,27188b", "27189a,27189b"]},
                            { description: "Aspect Advantage: Reputation Track Reward P1", type: "list", tooltip: "e.g. 05015;05015;05015" },
                            { description: "Planning Ahead: Reputation Track Reward P1", type: "card" },
                            { description: "Osborn Tech: Reputation Track Penalty", type: "checkbox", options: ["27147", "27148", "27149", "27150", "27151", "27152"] },
                        ],
                        mutant_genesis:
                        [
                            { description: "Player 1 Role", type: "select", options: ["Brawler", "Commander", "Defender", "Peacekeeper"] },

                            { description: "Player 1 Remaining hit points", type: "number" },

                            { description: "Frightened Police Defeated", type: "checkbox", options: ["Yes"] },
                            { description: "Enemy of My Enemy Defeated", type: "checkbox", options: ["Yes"] },
                            { description: "Find the Prisoners Defeated", type: "checkbox", options: ["Yes"] },
                            { description: "Surprise Attack Defeated", type: "checkbox", options: ["Yes"] },

                            { description: "Future Past Cards in Encounter Deck", type: "checkbox", options: ["32166", "32167", "32168", "32169", "32170"] },
                            { description: "Future Past Cards removed from campaign", type: "checkbox", options: ["32166", "32167", "32168", "32169", "32170"] },
                            { description: "Role Upgrades removed from campaign", type: "checkbox", options: ["32176", "32177", "32178", "32179", "32180", "32181", "32182", "32183", "32184", "32185", "32186", "32187", "32188", "32189", "32190", "32191", "32192", "32193", "32194", "32195"] },

                            { description: "Jubilee", type: "select", options: ["32088b"] },
                            { description: "Player 1 Captive Allies", type: "checkbox", options: ["32089", "32090", "32091", "32092"] },
                            { description: "Allies removed from the campaign", type: "list", tooltip: "카드 ID를 ';'로 구분해 입력" },
                        ],
                        next_evolution:
                        [
                            { description: "Player 1 Remaining hit points", type: "number" },

                            { description: "Marauders Defeated", type: "checkbox", options: ["40070a", "40071a", "40072a", "40073a", "40074a", "40075a", "40076a"] },
                            { description: "Morlocks Saved", type: "number" },

                            { description: "Scenario 1 Player Side Scheme", type: "select", options: ["40190a", "40191a", "40192a", "40193a", "40194a", "40195a"] },
                            { description: "Scenario 2 Player Side Scheme", type: "select", options: ["40190a", "40191a", "40192a", "40193a", "40194a", "40195a"] },
                            { description: "Scenario 3 Player Side Scheme", type: "select", options: ["40190a", "40191a", "40192a", "40193a", "40194a", "40195a"] },
                            { description: "Scenario 4 Player Side Scheme", type: "select", options: ["40190a", "40191a", "40192a", "40193a", "40194a", "40195a"] },
                            { description: "Scenario 5 Player Side Scheme", type: "select", options: ["40190a", "40191a", "40192a", "40193a", "40194a", "40195a"] },

                            { description: "Campaign Environments Earned", type: "checkbox", options: ["40190b", "40191b", "40192b", "40193b", "40194b", "40195b"] },

                            { description: "Scenario 3 Hope Summers Damage", type: "number" },
                            { description: "Scenario 4 Hope Summers Damage", type: "number" },
                        ],
                        age_of_apocalypse:
                        [
                            { description: "Player 1 Remaining hit points", type: "number" },

                            { description: "Mission Side Schemes Removed from campaign", type: "checkbox", options: ["45166a", "45167a", "45168a", "45169a"] },
                            { description: "Mission Side Schemes Defeated", type: "checkbox", options: ["45166a", "45167a", "45168a", "45169a"] },
                            { description: "Overseers Defeated", type: "checkbox", options: ["45179a", "45180a", "45181a", "45182a", "45183a"] },

                            { description: "Player 1 Campaign Ally", type: "checkbox", options: ["45172", "45173", "45174", "45175"] },

                            { description: "Player 1 Campaign Aspect Upgrade", type: "card" },
                            { description: "Player 1 Campaign Aspect Support", type: "card" },
                        ],
                        fear_no_evil:
                        [
                            { description: "Scenarios to Progress", type: "campaignRandom", randomType: "scenarios", emptyText: "[무작위]를 눌러 남은 시나리오를 최대 2개 뽑습니다" },
                            { description: "Random Underling", type: "campaignRandom", randomType: "underling", emptyText: "[무작위]를 눌러 아직 나오지 않은 부하를 뽑습니다" },

                            { description: "Player 1 Remaining hit points", type: "number" },

                            { description: "Art Museum Heist Status", type: "select", options: ["Completed", "Failed"] },
                            { description: "The Getaway Status", type: "select", options: ["Completed", "Failed"] },
                            { description: "Protection Racket Status", type: "select", options: ["Completed", "Failed"] },
                            { description: "The Raft Breakout Status", type: "select", options: ["Completed", "Failed"] },
                            { description: "Stop the Presses! Status", type: "select", options: ["Completed", "Failed"] },

                            { description: "Art Museum Heist Progress", type: "number" },
                            { description: "The Getaway Progress", type: "number" },
                            { description: "Protection Racket Progress", type: "number" },
                            { description: "The Raft Breakout Progress", type: "number" },
                            { description: "Stop the Presses! Progress", type: "number" },

                            { description: "Art Museum Heist Villain", type: "select", options: ["Bullseye", "Electro", "Hammerhead", "Purple Man", "Typhoid Mary"] },
                            { description: "The Getaway Villain", type: "select", options: ["Bullseye", "Electro", "Hammerhead", "Purple Man", "Typhoid Mary"] },
                            { description: "Protection Racket Villain", type: "select", options: ["Bullseye", "Electro", "Hammerhead", "Purple Man", "Typhoid Mary"] },
                            { description: "The Raft Breakout Villain", type: "select", options: ["Bullseye", "Electro", "Hammerhead", "Purple Man", "Typhoid Mary"] },
                            { description: "Stop the Presses! Villain", type: "select", options: ["Bullseye", "Electro", "Hammerhead", "Purple Man", "Typhoid Mary"] },

                            { description: "Trust Established?", type: "checkbox", options: ["Yes"] },
                            { description: "Mary Defeated?", type: "checkbox", options: ["Yes"] },
                            { description: "Allies and Persona Supports Removed from the Campaign", type: "list", tooltip: "카드 이름 또는 ID 입력" },
                        ],
                        agents_of_shield:
                        [
                            { description: "Evidence Seed", label: "Evidence Seed (Do Not Change During a Campaign)", type: "number", random: true },
                            { description: "Evidence Earned", type: "checkbox", options: ["50185", "50186", "50187", "50188", "50189", "50190", "50191", "50192", "50193"] },
                            { description: "Chief Medical Officer Flipped", type: "select", options: ["Yes"] },
                            { description: "Chief Surveillance Officer Flipped", type: "select", options: ["Yes"] },
                            { description: "Chief Tactical Officer Flipped", type: "select", options: ["Yes"] },

                            { description: "Player 1 Remaining hit points", type: "number" },

                            { description: "Scenario 1 Chief Medical Officer Secret Counters", type: "number" },
                            { description: "Scenario 1 Chief Surveillance Officer Secret Counters", type: "number" },
                            { description: "Scenario 1 Chief Tactical Officer Secret Counters", type: "number" },
                            { description: "Scenario 2 Chief Medical Officer Secret Counters", type: "number" },
                            { description: "Scenario 2 Chief Surveillance Officer Secret Counters", type: "number" },
                            { description: "Scenario 2 Chief Tactical Officer Secret Counters", type: "number" },
                            { description: "Scenario 3 Chief Medical Officer Secret Counters", type: "number" },
                            { description: "Scenario 3 Chief Surveillance Officer Secret Counters", type: "number" },
                            { description: "Scenario 3 Chief Tactical Officer Secret Counters", type: "number" },
                            { description: "Scenario 4 Chief Medical Officer Secret Counters", type: "number" },
                            { description: "Scenario 4 Chief Surveillance Officer Secret Counters", type: "number" },
                            { description: "Scenario 4 Chief Tactical Officer Secret Counters", type: "number" },

                            { description: "Scenario 1 Minions and side schemes in play", type: "number" },
                            { description: "Scenario 2 Rescued Captives", type: "number" },
                            { description: "Scenario 3 Adaptoid environments", type: "checkbox", options: ["50109", "50110", "50111", "50112"] },
                            { description: "Scenario 4 Surviving Thunderbolts", type: "checkbox", options: ["50139", "50143", "50148", "50152", "50156", "50161"] },
                        ]
  };
  MC.CAMPAIGN_KO = {"Remaining hit points": "남은 생명력", "Obligations": "의무 카드", "Tech Upgrade": "기술 업그레이드", "tech upgrade removed from campaign": "기술 업그레이드가 캠페인에서 제거됨", "Basic Upgrade": "기본 업그레이드", "Basic Condition replaced with Improved side": "기본 상태를 강화 면으로 교체", "Rescued Allies": "구출한 동료", "Experimental Weapons added to encounter deck": "조우 덱에 추가된 실험 무기", "Number of delay counters on main scheme": "주 음모의 지연 카운터 수", "Players engaged with minions": "하수인과 교전 중인 플레이어", "Allies removed from the campaign": "캠페인에서 제거된 동료", "Unspent Units": "남은 유닛", "Market Cards": "마켓 카드", "Cards in The Collection": "콜렉션의 카드", "Headhunter Defeated": "헤드헌터 격파", "Galactic Artifacts Side Schemes in the Victory Display": "승점 구역의 은하 유물 부가 음모", "Power Stone Control": "파워 스톤 조종", "Evasion Counters": "회피 카운터", "Reveal Kree Supremacy": "크리 패권 공개", "Cosmo in campaign pool": "코스모가 캠페인 풀에 있음", "Security Breach in campaign pool": "보안 침해가 캠페인 풀에 있음", "Shawarma in campaign pool": "샤와르마가 캠페인 풀에 있음", "Black Swan in campaign pool": "블랙 스완이 캠페인 풀에 있음", "Avengers Tower has the Damaged trait": "어벤져스 타워가 [손상] 특성", "System Shock in campaign pool": "시스템 쇼크가 캠페인 풀에 있음", "The Infinity Stones 1B was completed": "인피니티 스톤 1B 완료됨", "Norn Stone in campaign pool": "노른 스톤이 캠페인 풀에 있음", "Odin in campaign pool": "오딘이 캠페인 풀에 있음", "Reputation Track": "평판 트랙", "Community Service: Victory for Scenarios #1-4": "사회봉사: 시나리오 1~4 승리", "Waking Nightmare: Victory for Scenario #3 - Mysterio": "깨어난 악몽: 시나리오 3(미스테리오) 승리", "Last Ones Standing: Victory for Scenario #4 - The Sinister Six": "최후의 생존자: 시나리오 4(시니스터 식스) 승리", "Final Reputation Score: Victory for Scenario #5 - Venom Goblin": "최종 평판: 시나리오 5(베놈 고블린) 승리", "S.H.I.E.L.D. Tech: Reputation Track Reward": "쉴드 기술: 평판 보상", "Aspect Advantage: Reputation Track Reward": "성향 이점: 평판 보상", "Planning Ahead: Reputation Track Reward": "사전 계획: 평판 보상", "Osborn Tech: Reputation Track Penalty": "오스본 기술: 평판 페널티", "Role": "역할", "Frightened Police Defeated": "겁먹은 경찰 격파", "Enemy of My Enemy Defeated": "적의 적 격파", "Find the Prisoners Defeated": "포로 찾기 격파", "Surprise Attack Defeated": "기습 공격 격파", "Future Past Cards in Encounter Deck": "조우 덱의 퓨처 패스트 카드", "Future Past Cards removed from campaign": "캠페인에서 제거된 퓨처 패스트 카드", "Role Upgrades removed from campaign": "캠페인에서 제거된 역할 업그레이드", "Jubilee": "주빌리", "Captive Allies": "포로 동료", "Marauders Defeated": "격파한 머로더", "Morlocks Saved": "구한 몰록 수", "Scenario 1 Player Side Scheme": "시나리오 1 플레이어 부가 음모", "Scenario 2 Player Side Scheme": "시나리오 2 플레이어 부가 음모", "Scenario 3 Player Side Scheme": "시나리오 3 플레이어 부가 음모", "Scenario 4 Player Side Scheme": "시나리오 4 플레이어 부가 음모", "Scenario 5 Player Side Scheme": "시나리오 5 플레이어 부가 음모", "Campaign Environments Earned": "얻은 캠페인 환경", "Scenario 3 Hope Summers Damage": "시나리오 3 호프 서머스 피해", "Scenario 4 Hope Summers Damage": "시나리오 4 호프 서머스 피해", "Mission Side Schemes Removed from campaign": "캠페인에서 제거된 임무 부가 음모", "Mission Side Schemes Defeated": "격파한 임무 부가 음모", "Overseers Defeated": "격파한 감독관", "Campaign Ally": "캠페인 동료", "Campaign Aspect Upgrade": "캠페인 성향 업그레이드", "Campaign Aspect Support": "캠페인 성향 지원", "Scenarios to Progress": "진행할 시나리오", "Random Underling": "무작위 부하", "Trust Established?": "신뢰를 쌓았나?", "Mary Defeated?": "메리를 격파했나?", "Allies and Persona Supports Removed from the Campaign": "캠페인에서 제거된 동료·인물 지원", "Evidence Seed": "증거 시드(캠페인 중 바꾸지 마세요)", "Evidence Earned": "얻은 증거", "Chief Medical Officer Flipped": "최고 의료 책임자 뒤집힘", "Chief Surveillance Officer Flipped": "최고 감시 책임자 뒤집힘", "Chief Tactical Officer Flipped": "최고 전술 책임자 뒤집힘", "Scenario 1 Minions and side schemes in play": "시나리오 1 플레이 중인 하수인·부가 음모", "Scenario 2 Rescued Captives": "시나리오 2 구출한 포로", "Scenario 3 Adaptoid environments": "시나리오 3 어댑토이드 환경", "Scenario 4 Surviving Thunderbolts": "시나리오 4 살아남은 썬더볼츠", "Art Museum Heist Status": "미술관 강도 결과", "Art Museum Heist Progress": "미술관 강도 진행도", "Art Museum Heist Villain": "미술관 강도 부하 빌런", "The Getaway Status": "도주 결과", "The Getaway Progress": "도주 진행도", "The Getaway Villain": "도주 부하 빌런", "Protection Racket Status": "보호비 갈취 결과", "Protection Racket Progress": "보호비 갈취 진행도", "Protection Racket Villain": "보호비 갈취 부하 빌런", "The Raft Breakout Status": "래프트 탈옥 결과", "The Raft Breakout Progress": "래프트 탈옥 진행도", "The Raft Breakout Villain": "래프트 탈옥 부하 빌런", "Stop the Presses! Status": "인쇄 중단! 결과", "Stop the Presses! Progress": "인쇄 중단! 진행도", "Stop the Presses! Villain": "인쇄 중단! 부하 빌런", "Scenario 1 Chief Medical Officer Secret Counters": "시나리오 1 최고 의료 책임자 비밀 카운터", "Scenario 1 Chief Surveillance Officer Secret Counters": "시나리오 1 최고 감시 책임자 비밀 카운터", "Scenario 1 Chief Tactical Officer Secret Counters": "시나리오 1 최고 전술 책임자 비밀 카운터", "Scenario 2 Chief Medical Officer Secret Counters": "시나리오 2 최고 의료 책임자 비밀 카운터", "Scenario 2 Chief Surveillance Officer Secret Counters": "시나리오 2 최고 감시 책임자 비밀 카운터", "Scenario 2 Chief Tactical Officer Secret Counters": "시나리오 2 최고 전술 책임자 비밀 카운터", "Scenario 3 Chief Medical Officer Secret Counters": "시나리오 3 최고 의료 책임자 비밀 카운터", "Scenario 3 Chief Surveillance Officer Secret Counters": "시나리오 3 최고 감시 책임자 비밀 카운터", "Scenario 3 Chief Tactical Officer Secret Counters": "시나리오 3 최고 전술 책임자 비밀 카운터", "Scenario 4 Chief Medical Officer Secret Counters": "시나리오 4 최고 의료 책임자 비밀 카운터", "Scenario 4 Chief Surveillance Officer Secret Counters": "시나리오 4 최고 감시 책임자 비밀 카운터", "Scenario 4 Chief Tactical Officer Secret Counters": "시나리오 4 최고 전술 책임자 비밀 카운터"};
  MC.CAMPAIGN_VAL_KO = { Yes: '예', Completed: '완료', Failed: '실패', Brawler: '격투가', Commander: '지휘관', Defender: '수호자', Peacekeeper: '평화유지군', 'Scenario 1': '시나리오 1', 'Scenario 2': '시나리오 2', 'Scenario 3': '시나리오 3', 'Scenario 4': '시나리오 4', 'Player 1': '플레이어 1', 'Player 2': '플레이어 2', 'Player 3': '플레이어 3', 'Player 4': '플레이어 4', Bullseye: '불스아이', Electro: '일렉트로', Hammerhead: '해머헤드', 'Purple Man': '퍼플맨', 'Typhoid Mary': '타이포이드 메리' };
  MC.CAMPAIGNS = MC.CAMPAIGNS || {};
  MC.CAMPAIGN_DEFS = {
    rise_of_red_skull: { name: '레드 스컬의 부상', pack: 'trors' }, galaxys_most_wanted: { name: '은하계 최고 수배자', pack: 'gmw' },
    mad_titans_shadow: { name: '매드 타이탄의 그림자', pack: 'mts' }, sinister_motives: { name: '시니스터 모티브', pack: 'sm' },
    mutant_genesis: { name: '뮤턴트 제네시스', pack: 'mut_gen' }, next_evolution: { name: '넥스트 에볼루션', pack: 'next_evol' },
    age_of_apocalypse: { name: '에이지 오브 아포칼립스', pack: 'aoa' }, agents_of_shield: { name: '에이전트 오브 쉴드', pack: 'aos' }, fear_no_evil: { name: '피어 노 이블', pack: 'fne' }
  };
  MC.campaignOfPack = pk => Object.keys(MC.CAMPAIGN_DEFS).find(k => MC.CAMPAIGN_DEFS[k].pack === pk) || null;
  MC.campaignFieldsFor = (cid, playerCount) => {
    const base = MC.CAMPAIGN_FIELDS[cid] || [], n = Math.max(1, playerCount || 1);
    if (n === 1) return base;
    const out = [];
    for (const f of base) {
      if (/^Player 1 /.test(f.description)) {
        for (let i = 1; i <= n; i++) {
          const item = Object.assign({}, f, { description: f.description.replace(/^Player 1 /, `Player ${i} `) });
          if (f.label) item.label = f.label.replace(/^Player 1 /, `Player ${i} `);
          out.push(item);
        }
      } else if (/ P1$/.test(f.description)) {
        for (let i = 1; i <= n; i++) {
          const item = Object.assign({}, f, { description: f.description.replace(/ P1$/, ` P${i}`) });
          if (f.label) item.label = f.label.replace(/ P1$/, ` P${i}`);
          out.push(item);
        }
      } else out.push(f);
    }
    return out;
  };
  MC.campaignLabel = (d, multi) => {
    const mp = d.match(/^Player (\d+) (.+)$/), ms = !mp && d.match(/^(.+) P(\d+)$/);
    const pn = mp ? +mp[1] : ms ? +ms[2] : 0;
    const k = mp ? mp[2] : ms ? ms[1] : d;
    const base = MC.CAMPAIGN_KO[k] || MC.CAMPAIGN_KO[d] || d;
    return pn && (multi || pn > 1) ? `P${pn} · ${base}` : base;
  };
})();
