# ❄ 서리빛 팝잇 거래소 (Frost Pop-it Bazaar)

판타지 겨울 세계 속 팝잇 수집·거래 실시간 멀티플레이 게임

```
frost-popit/
├── server/          ← Render에 배포 (Node.js + Socket.IO 실시간 서버)
│   ├── server.js
│   └── package.json
├── client/          ← Vercel에 배포 (게임 화면)
│   ├── index.html
│   ├── style.css
│   ├── art.js       ← 팝잇 11종 + 이모티콘 9종 그림 (SVG)
│   ├── app.js       ← 게임 로직
│   └── config.js    ← ⚠ Render 서버 주소 넣는 곳
└── render.yaml
```

## 게임 규칙
| 항목 | 내용 |
|---|---|
| 첫 플레이 | 프로필 생성 시 **2000 코인** 지급 |
| 프로필 | 기기(브라우저)당 **1개만** 생성 가능, 닉네임 중복 불가 |
| 뽑기 | 1회 100코인 · 일반 56% / 희귀 27% / 영웅 15% / 전설 2% |
| 거래 | 거래 신청 → 상대 수락 → 거래판에 팝잇 올리기(최대 6개) → 둘 다 확정 → 교환 |
| 거래 보상 | 거래 완료 시 두 사람 모두 **+50 코인** |
| 이모티콘 | 거래판에서 9종(기뻐요·좋아요·놀라워요·슬퍼요·화나요·고민돼요·신나요·부끄러워요·졸려요) 클릭 → 상대 화면에도 실시간 표시 |

팝잇 11종: 고양이 얼굴(전설), 서리 하트·별빛·눈송이·눈구름(일반), 초승달·눈사람·겨울나무(희귀), 펭귄·눈토끼·얼음 보석(영웅)
보관함에서 팝잇을 누르면 버블을 직접 뽁뽁 눌러볼 수 있어요.

## 로컬에서 먼저 해보기
```bash
cd server
npm install
npm start
```
→ 브라우저에서 `http://localhost:3000` 접속 (일반 창 + 시크릿 창으로 두 명 테스트 가능)

## 배포하기

### 1. GitHub에 올리기
이 폴더 전체를 GitHub 저장소 하나에 올려요.

### 2. Render (서버)
1. Render → **New → Web Service** → 저장소 연결
2. 설정
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - Instance Type: Free
3. 배포가 끝나면 주소를 복사해요. 예) `https://frost-popit-server.onrender.com`
4. `주소/health` 를 열어서 `{"ok":true...}` 가 나오면 성공!

> `render.yaml`이 있어서 **New → Blueprint**로 한 번에 만들어도 돼요.

### 3. config.js 수정
`client/config.js` 의 주소를 2번에서 복사한 Render 주소로 바꾸고 GitHub에 push 해요.
```js
SERVER_URL: 'https://frost-popit-server.onrender.com',
```

### 4. Vercel (게임 화면)
1. Vercel → **Add New → Project** → 같은 저장소 선택
2. **Root Directory**: `client` / Framework Preset: **Other** / Build Command 비워두기
3. Deploy → 나온 링크(예: `https://frost-popit.vercel.app`)를 친구에게 공유하면 끝!
   서로 다른 기기에서 같은 링크로 들어오면 실시간으로 함께 플레이할 수 있어요.

### 5. (선택) 보안 강화
Render → Environment 에서 `ALLOWED_ORIGIN` 값을 Vercel 주소로 바꾸면 내 사이트에서만 서버에 접속할 수 있어요.

## 알아두면 좋은 점
- **Render 무료 플랜은 15분 동안 접속이 없으면 잠들어요.** 처음 접속할 때 30초~1분 정도 로딩될 수 있어요(화면에 안내가 떠요).
- **무료 플랜은 디스크가 유지되지 않아서** 서버가 재시작/재배포되면 `data.json`(프로필·코인·팝잇)이 초기화돼요.
  계속 유지하려면 Render 유료 플랜의 Persistent Disk를 붙이고 환경변수 `DATA_FILE=/var/data/data.json` 으로 설정하거나, Firestore·MongoDB 같은 DB로 바꾸면 돼요.
- 프로필은 브라우저 저장소(localStorage)의 기기 토큰으로 구분해요. 브라우저 데이터를 지우면 그 기기에서는 새 프로필을 만들 수 있어요.
- 코인 부정 획득을 막기 위해 팝잇이 하나도 없는 "빈 거래"는 완료되지 않아요.
