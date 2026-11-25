# 마블 챔피언스 모바일

## GitHub Pages 게시

이 프로젝트는 빌드 없이 정적 파일로 제공할 수 있습니다. 저장소의 `main` 브랜치에 푸시하면 GitHub Actions가 `index.html`, JavaScript 파일, `fonts/`, `img/`, `packs/`를 GitHub Pages에 배포합니다.

1. 이 폴더를 GitHub 저장소의 루트에 올립니다.
2. 저장소의 **Settings → Pages → Build and deployment → Source**에서 **GitHub Actions**를 선택합니다.
3. `main` 브랜치에 푸시하거나 Actions 탭에서 **Deploy static game to GitHub Pages**를 수동 실행합니다.
4. 배포가 끝나면 저장소의 **Settings → Pages**에 표시된 URL을 휴대폰에서 엽니다.

정적 사이트라 별도 서버나 빌드 도구는 필요하지 않습니다. 게임 진행 데이터는 접속한 기기·브라우저에 저장됩니다.

## 실행

`loadScript`로 팩 데이터를 동적으로 읽기 때문에 `file://`로 열지 말고 로컬 HTTP 서버로 띄우세요.

```bash
cd marvel-champions-mobile
python3 -m http.server 8000      # 또는 npx serve .
# http://localhost:8000
```

## 구성

| 경로 | 내용 |
|---|---|
| `index.html` | 마크업과 CSS 전체, 스크립트 로드 순서 |
| `engine.js` | 규칙 엔진 (`MC` 네임스페이스, `MC.loadScript`) |
| `ui.js` | 화면 렌더링, 입력 처리, 카드 이미지 로더 |
| `fx.js` | 애니메이션 효과 (카드 뒤집기 등) |
| `deck.js` | 덱 저장소 (`Store`) |
| `campaigns.js` | 캠페인 |
| `online.js` | 온라인 2인 플레이 통신 및 방 상태 관리 |
| `packs/index.js` | 팩 카탈로그 |
| `packs/<팩>.js`, `packs/<팩>.data.js` | 팩별 카드 로직과 카드 데이터 (64개 팩) |
| `fonts/ChampionsIcons.ttf` | 자원 아이콘 폰트 |
| `img/` | 카드 썸네일·풀사이즈 이미지, 카드 뒷면, 토큰 |

## 참고

- 덱과 진행 상태는 브라우저의 `localStorage`에 저장됩니다.
- 온라인 2인 모드는 로컬 실행 시 같은 브라우저의 다른 탭 간 테스트 모드로 동작합니다.
- Google Fonts(Bangers, Black Han Sans, IBM Plex Sans KR)는 인터넷 연결 시 불러옵니다.
