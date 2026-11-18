// ❄ 서리빛 팝잇 거래소 - 실시간 멀티플레이 서버 (Render 배포용)
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3000;
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'data.json');
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*'; // 예: https://my-game.vercel.app

// ── 게임 규칙 ──────────────────────────────────────────────
const START_COINS = 2000;   // 첫 플레이 지급 코인
const TRADE_REWARD = 50;    // 거래 완료 시 각자 받는 코인
const GACHA_COST = 100;     // 뽑기 1회 비용
const MAX_OFFER = 6;        // 거래판 한쪽에 올릴 수 있는 최대 팝잇 수
const INVITE_TIMEOUT_MS = 30000;

const POPITS = [
  { id: 'cat', name: '고양이 얼굴 팝잇', rarity: 'legendary' },
  { id: 'heart', name: '서리 하트 팝잇', rarity: 'common' },
  { id: 'star', name: '별빛 팝잇', rarity: 'common' },
  { id: 'snowflake', name: '눈송이 팝잇', rarity: 'common' },
  { id: 'cloud', name: '눈구름 팝잇', rarity: 'common' },
  { id: 'moon', name: '초승달 팝잇', rarity: 'rare' },
  { id: 'snowman', name: '눈사람 팝잇', rarity: 'rare' },
  { id: 'tree', name: '겨울나무 팝잇', rarity: 'rare' },
  { id: 'penguin', name: '펭귄 팝잇', rarity: 'epic' },
  { id: 'rabbit', name: '눈토끼 팝잇', rarity: 'epic' },
  { id: 'crystal', name: '얼음 보석 팝잇', rarity: 'epic' },
];
const POPIT_MAP = Object.fromEntries(POPITS.map(p => [p.id, p]));
const WEIGHTS = { common: 14, rare: 9, epic: 5, legendary: 2 }; // 합계 100 → 확률(%)
const EMOJI_IDS = ['happy', 'love', 'wow', 'sad', 'angry', 'think', 'excited', 'shy', 'sleepy'];
const AVATAR_COLORS = ['#f4f8ff', '#ffe3f0', '#e6dcff', '#d9f4ff', '#fff3c9', '#dcffe9'];

// ── 저장소 (JSON 파일) ─────────────────────────────────────
let db = { users: {}, tokens: {}, nicknames: {} };
try {
  if (fs.existsSync(DATA_FILE)) db = { ...db, ...JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) };
} catch (e) {
  console.error('데이터 파일을 읽지 못했어요:', e.message);
}
let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const tmp = DATA_FILE + '.tmp';
    fs.writeFile(tmp, JSON.stringify(db), err => {
      if (err) return console.error('저장 실패:', err.message);
      fs.rename(tmp, DATA_FILE, () => {});
    });
  }, 400);
}

// ── 서버 ──────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: ALLOWED_ORIGIN === '*' ? true : ALLOWED_ORIGIN.split(',').map(s => s.trim()) },
});

const online = new Map();   // userId → Set(socketId)
const trades = new Map();   // tradeId → trade
const userTrade = new Map(); // userId → tradeId

app.get('/health', (req, res) => res.json({ ok: true, users: Object.keys(db.users).length, online: online.size }));
// 로컬 테스트용: 서버 하나로 화면까지 같이 띄울 수 있게 client 폴더도 제공
app.use(express.static(path.join(__dirname, '..', 'client')));

// ── 도우미 ────────────────────────────────────────────────
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const uid = () => crypto.randomBytes(8).toString('hex');

function publicUser(u) {
  return {
    id: u.id,
    nickname: u.nickname,
    avatar: u.avatar,
    color: u.color,
    bio: u.bio,
    dex: new Set(u.inventory.map(i => i.type)).size,
    items: u.inventory.length,
    trades: u.stats.trades,
  };
}
function privateUser(u) {
  return { ...publicUser(u), coins: u.coins, inventory: u.inventory, stats: u.stats, createdAt: u.createdAt };
}
function pushMe(userId) {
  const u = db.users[userId];
  if (u) io.to('u:' + userId).emit('me', privateUser(u));
}
function broadcastPlayers() {
  const list = [...online.keys()]
    .map(id => db.users[id])
    .filter(Boolean)
    .map(u => ({ ...publicUser(u), busy: userTrade.has(u.id) }));
  io.emit('players', list);
}
function pickPopit() {
  const total = POPITS.reduce((s, p) => s + WEIGHTS[p.rarity], 0);
  let r = Math.random() * total;
  for (const p of POPITS) {
    r -= WEIGHTS[p.rarity];
    if (r < 0) return p;
  }
  return POPITS[POPITS.length - 1];
}

// ── 거래 ──────────────────────────────────────────────────
function tradeSide(t, key) {
  const u = db.users[t[key]];
  const items = t.offers[key].map(id => u.inventory.find(i => i.uid === id)).filter(Boolean);
  return { user: publicUser(u), items, ready: !!t.ready[key] };
}
function emitTradeState(t) {
  const payload = { id: t.id, status: t.status, a: tradeSide(t, 'a'), b: tradeSide(t, 'b') };
  io.to('u:' + t.a).to('u:' + t.b).emit('trade:state', payload);
}
function closeTrade(t, reason, notify = true) {
  if (!trades.has(t.id)) return;
  clearTimeout(t.timer);
  trades.delete(t.id);
  if (userTrade.get(t.a) === t.id) userTrade.delete(t.a);
  if (userTrade.get(t.b) === t.id) userTrade.delete(t.b);
  if (notify) io.to('u:' + t.a).to('u:' + t.b).emit('trade:closed', { id: t.id, reason });
  broadcastPlayers();
}
function keyOf(t, userId) {
  return t.a === userId ? 'a' : t.b === userId ? 'b' : null;
}
function executeTrade(t) {
  const A = db.users[t.a], B = db.users[t.b];
  const takeFrom = (u, ids) => {
    const taken = [];
    for (const id of ids) {
      const idx = u.inventory.findIndex(i => i.uid === id);
      if (idx === -1) return null;
      taken.push(u.inventory[idx]);
    }
    return taken;
  };
  const fromA = takeFrom(A, t.offers.a);
  const fromB = takeFrom(B, t.offers.b);
  if (!fromA || !fromB) return closeTrade(t, '거래할 팝잇이 사라져서 거래가 취소됐어요.');
  if (fromA.length + fromB.length === 0) {
    t.ready = { a: false, b: false };
    emitTradeState(t);
    io.to('u:' + t.a).to('u:' + t.b).emit('toast', { msg: '거래판에 팝잇을 하나 이상 올려야 해요!', kind: 'warn' });
    return;
  }
  const now = Date.now();
  A.inventory = A.inventory.filter(i => !t.offers.a.includes(i.uid));
  B.inventory = B.inventory.filter(i => !t.offers.b.includes(i.uid));
  fromB.forEach(i => A.inventory.push({ ...i, at: now }));
  fromA.forEach(i => B.inventory.push({ ...i, at: now }));
  A.coins += TRADE_REWARD;
  B.coins += TRADE_REWARD;
  A.stats.trades++;
  B.stats.trades++;
  save();

  clearTimeout(t.timer);
  trades.delete(t.id);
  userTrade.delete(t.a);
  userTrade.delete(t.b);
  pushMe(t.a);
  pushMe(t.b);
  io.to('u:' + t.a).emit('trade:done', { id: t.id, partner: publicUser(B), received: fromB, given: fromA, reward: TRADE_REWARD });
  io.to('u:' + t.b).emit('trade:done', { id: t.id, partner: publicUser(A), received: fromA, given: fromB, reward: TRADE_REWARD });
  broadcastPlayers();
}

// ── 소켓 ──────────────────────────────────────────────────
io.on('connection', socket => {
  let userId = null;
  let lastGacha = 0, lastEmoji = 0;
  const ack = cb => (typeof cb === 'function' ? cb : () => {});

  function bind(id) {
    userId = id;
    socket.join('u:' + id);
    if (!online.has(id)) online.set(id, new Set());
    online.get(id).add(socket.id);
    broadcastPlayers();
    // 진행 중인 거래가 있으면 새 탭/재접속에도 거래판 복원
    const tid = userTrade.get(id);
    const t = tid && trades.get(tid);
    if (t && t.status === 'open') emitTradeState(t);
  }

  socket.on('hello', (data, cb) => {
    cb = ack(cb);
    const token = str(data && data.token, 100);
    const id = db.tokens[token];
    if (id && db.users[id]) {
      bind(id);
      return cb({ ok: true, user: privateUser(db.users[id]), rules: { GACHA_COST, TRADE_REWARD, MAX_OFFER } });
    }
    cb({ ok: true, user: null, rules: { GACHA_COST, TRADE_REWARD, MAX_OFFER } });
    socket.emit('players', [...online.keys()].map(i => db.users[i]).filter(Boolean).map(u => ({ ...publicUser(u), busy: userTrade.has(u.id) })));
  });

  socket.on('profile:create', (data, cb) => {
    cb = ack(cb);
    data = data || {};
    const token = str(data.token, 100);
    if (token.length < 16) return cb({ ok: false, error: '기기 정보를 확인할 수 없어요. 새로고침 해주세요.' });
    if (db.tokens[token]) return cb({ ok: false, error: '이 기기에는 이미 프로필이 있어요. 프로필은 1개만 만들 수 있어요!' });
    if (userId) return cb({ ok: false, error: '이미 프로필로 접속 중이에요.' });
    const nickname = str(data.nickname, 12);
    if (nickname.length < 2) return cb({ ok: false, error: '닉네임은 2~12자로 지어주세요.' });
    if (db.nicknames[nickname.toLowerCase()]) return cb({ ok: false, error: '이미 누군가 쓰고 있는 닉네임이에요.' });
    const avatar = EMOJI_IDS.includes(data.avatar) ? data.avatar : 'happy';
    const color = AVATAR_COLORS.includes(data.color) ? data.color : AVATAR_COLORS[0];
    const id = uid();
    const u = {
      id, nickname, avatar, color,
      bio: str(data.bio, 30),
      coins: START_COINS,
      inventory: [],
      stats: { trades: 0, pulls: 0 },
      createdAt: Date.now(),
    };
    db.users[id] = u;
    db.tokens[token] = id;
    db.nicknames[nickname.toLowerCase()] = id;
    save();
    bind(id);
    cb({ ok: true, user: privateUser(u) });
  });

  socket.on('gacha', (_, cb) => {
    cb = ack(cb);
    const u = userId && db.users[userId];
    if (!u) return cb({ ok: false, error: '프로필을 먼저 만들어주세요.' });
    if (Date.now() - lastGacha < 400) return cb({ ok: false, error: '잠깐만요, 뽑기 기계가 돌아가는 중이에요!' });
    lastGacha = Date.now();
    if (userTrade.has(userId)) return cb({ ok: false, error: '거래 중에는 뽑기를 할 수 없어요.' });
    if (u.coins < GACHA_COST) return cb({ ok: false, error: `코인이 부족해요! (뽑기 ${GACHA_COST}코인)` });
    const p = pickPopit();
    const isNew = !u.inventory.some(i => i.type === p.id);
    const item = { uid: uid(), type: p.id, at: Date.now() };
    u.coins -= GACHA_COST;
    u.inventory.push(item);
    u.stats.pulls++;
    save();
    pushMe(userId);
    cb({ ok: true, item, isNew });
    if (p.rarity === 'legendary') {
      io.emit('toast', { msg: `✨ <b>${u.nickname.replace(/[<>&]/g, '')}</b>님이 전설의 <b>${p.name}</b>을 뽑았어요!`, kind: 'gold' });
    }
    broadcastPlayers();
  });

  socket.on('trade:request', (data, cb) => {
    cb = ack(cb);
    const to = str(data && data.to, 40);
    if (!userId) return cb({ ok: false, error: '프로필을 먼저 만들어주세요.' });
    if (to === userId) return cb({ ok: false, error: '자기 자신과는 거래할 수 없어요.' });
    if (!online.has(to) || !db.users[to]) return cb({ ok: false, error: '상대가 접속 중이 아니에요.' });
    if (userTrade.has(userId)) return cb({ ok: false, error: '이미 진행 중인 거래가 있어요.' });
    if (userTrade.has(to)) return cb({ ok: false, error: '상대가 다른 사람과 거래 중이에요.' });
    const t = {
      id: uid(), a: userId, b: to, status: 'pending',
      offers: { a: [], b: [] }, ready: { a: false, b: false },
    };
    t.timer = setTimeout(() => {
      if (trades.get(t.id) && t.status === 'pending') closeTrade(t, '거래 신청에 응답이 없어서 취소됐어요.');
    }, INVITE_TIMEOUT_MS);
    trades.set(t.id, t);
    userTrade.set(t.a, t.id);
    userTrade.set(t.b, t.id);
    io.to('u:' + to).emit('trade:invite', { id: t.id, from: publicUser(db.users[userId]), expiresIn: INVITE_TIMEOUT_MS });
    broadcastPlayers();
    cb({ ok: true, tradeId: t.id, to: publicUser(db.users[to]) });
  });

  socket.on('trade:respond', (data, cb) => {
    cb = ack(cb);
    const t = trades.get(str(data && data.id, 40));
    if (!t || t.b !== userId || t.status !== 'pending') return cb({ ok: false, error: '이미 끝난 거래 신청이에요.' });
    if (!data.accept) {
      closeTrade(t, `${db.users[t.b].nickname}님이 거래를 거절했어요.`);
      return cb({ ok: true });
    }
    clearTimeout(t.timer);
    t.status = 'open';
    emitTradeState(t);
    cb({ ok: true });
  });

  socket.on('trade:offer', (data, cb) => {
    cb = ack(cb);
    const t = trades.get(str(data && data.id, 40));
    const k = t && keyOf(t, userId);
    if (!k || t.status !== 'open') return cb({ ok: false, error: '진행 중인 거래가 없어요.' });
    const ids = Array.isArray(data.uids) ? [...new Set(data.uids.map(x => str(x, 40)))] : [];
    if (ids.length > MAX_OFFER) return cb({ ok: false, error: `한 번에 ${MAX_OFFER}개까지만 올릴 수 있어요.` });
    const inv = db.users[userId].inventory;
    if (!ids.every(id => inv.some(i => i.uid === id))) return cb({ ok: false, error: '내가 가진 팝잇만 올릴 수 있어요.' });
    t.offers[k] = ids;
    t.ready = { a: false, b: false }; // 내용이 바뀌면 둘 다 다시 확정해야 함
    emitTradeState(t);
    cb({ ok: true });
  });

  socket.on('trade:ready', (data, cb) => {
    cb = ack(cb);
    const t = trades.get(str(data && data.id, 40));
    const k = t && keyOf(t, userId);
    if (!k || t.status !== 'open') return cb({ ok: false, error: '진행 중인 거래가 없어요.' });
    t.ready[k] = !!data.ready;
    if (t.ready.a && t.ready.b) executeTrade(t);
    else emitTradeState(t);
    cb({ ok: true });
  });

  socket.on('trade:emoji', data => {
    const t = trades.get(str(data && data.id, 40));
    if (!t || !keyOf(t, userId) || !EMOJI_IDS.includes(data.emoji)) return;
    if (Date.now() - lastEmoji < 250) return;
    lastEmoji = Date.now();
    io.to('u:' + t.a).to('u:' + t.b).emit('trade:emoji', { id: t.id, from: userId, emoji: data.emoji });
  });

  socket.on('trade:cancel', (data, cb) => {
    cb = ack(cb);
    const t = trades.get(str(data && data.id, 40));
    if (!t || !keyOf(t, userId)) return cb({ ok: false });
    closeTrade(t, `${db.users[userId].nickname}님이 거래를 취소했어요.`);
    cb({ ok: true });
  });

  socket.on('disconnect', () => {
    if (!userId) return;
    const set = online.get(userId);
    if (set) {
      set.delete(socket.id);
      if (set.size === 0) {
        online.delete(userId);
        const t = trades.get(userTrade.get(userId));
        if (t) closeTrade(t, `${db.users[userId].nickname}님의 접속이 끊겨서 거래가 취소됐어요.`);
      }
    }
    broadcastPlayers();
  });
});

server.listen(PORT, () => console.log(`❄ 서리빛 팝잇 거래소 서버 실행 중: http://localhost:${PORT}`));
