// ❄ 서리빛 팝잇 거래소 - 클라이언트
(function () {
  const cfgUrl = window.POPIT_CONFIG && window.POPIT_CONFIG.SERVER_URL;
  const SERVER_URL = (cfgUrl && !/YOUR-RENDER-APP/.test(cfgUrl) ? cfgUrl : location.origin).replace(/\/$/, '');
  const TOKEN_KEY = 'frostpop_device_token';
  const COLORS = ['#f4f8ff', '#ffe3f0', '#e6dcff', '#d9f4ff', '#fff3c9', '#dcffe9'];
  let RULES = { GACHA_COST: 100, TRADE_REWARD: 50, MAX_OFFER: 6 };

  function makeToken() {
    const a = new Uint8Array(24);
    crypto.getRandomValues(a);
    return Array.from(a, b => b.toString(16).padStart(2, '0')).join('');
  }
  let token = localStorage.getItem(TOKEN_KEY);
  if (!token) { token = makeToken(); localStorage.setItem(TOKEN_KEY, token); }

  const S = { me: null, players: [], trade: null, invite: null, popped: {}, gachaBusy: false };
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const { POPIT_MAP, POPITS, RARITY, EMOJIS, popitSVG, emojiSVG } = window.Art;

  Art.injectDefs();
  startSnow();

  // ── 화면/알림 도우미 ─────────────────────────
  const show = id => document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === id));
  function toast(msg, kind = 'info') {
    const t = document.createElement('div');
    t.className = 'toast ' + kind;
    t.innerHTML = msg;
    $('#toasts').appendChild(t);
    setTimeout(() => t.classList.add('out'), 3300);
    setTimeout(() => t.remove(), 3800);
  }
  const openModal = id => $('#' + id).classList.add('open');
  const closeModal = id => $('#' + id).classList.remove('open');
  document.addEventListener('click', e => {
    const c = e.target.closest('[data-close]');
    if (c) closeModal(c.dataset.close);
    else if (e.target.classList.contains('modal') && e.target.id !== 'modal-invite') closeModal(e.target.id);
  });
  const avatarHTML = (u, cls = '') => `<div class="avatar ${cls}">${emojiSVG(u.avatar, u.color)}</div>`;
  function cardHTML(item, extra = '') {
    const p = POPIT_MAP[item.type], rk = RARITY[p.rarity];
    return `<button class="card ${p.rarity} ${extra}" style="--rc:${rk.color}" data-uid="${item.uid}" data-type="${item.type}">
      <span class="rk">${rk.label}</span>${popitSVG(item.type)}<div class="nm">${p.name}</div></button>`;
  }
  const sortItems = items => [...items].sort((a, b) => RARITY[POPIT_MAP[a.type].rarity].order - RARITY[POPIT_MAP[b.type].rarity].order || POPITS.findIndex(p => p.id === a.type) - POPITS.findIndex(p => p.id === b.type) || b.at - a.at);

  // ── 서버 연결 (Socket.IO 클라이언트는 서버에서 직접 받아와요) ──
  const slowTimer = setTimeout(() => { $('#loading-msg').innerHTML = '무료 서버가 겨울잠에서 깨어나는 중이에요…<br/>(처음엔 최대 1분 정도 걸릴 수 있어요)'; }, 4000);
  function loadSocketLib(tries = 0) {
    const s = document.createElement('script');
    s.src = SERVER_URL + '/socket.io/socket.io.js';
    s.onload = connect;
    s.onerror = () => {
      $('#loading-msg').textContent = '서버에 연결하지 못했어요. 다시 시도하는 중… (' + (tries + 1) + ')';
      setTimeout(() => loadSocketLib(tries + 1), 3000);
    };
    document.head.appendChild(s);
  }
  loadSocketLib();

  let socket;
  function connect() {
    socket = io(SERVER_URL, { transports: ['websocket', 'polling'], reconnectionDelayMax: 4000 });
    socket.on('connect', () => {
      $('#conn') && $('#conn').classList.remove('off');
      socket.emit('hello', { token }, res => {
        clearTimeout(slowTimer);
        if (res.rules) RULES = res.rules;
        if (res.user) { S.me = res.user; enterMain(); }
        else { show('screen-profile'); buildProfileForm(); }
      });
    });
    socket.on('disconnect', () => { $('#conn').classList.add('off'); if (S.me) toast('연결이 끊겼어요. 다시 연결하는 중…', 'warn'); });
    socket.on('me', u => {
      const prev = S.me ? S.me.coins : u.coins;
      S.me = u; renderMe(); renderCollection(); renderPlayers();
      if (u.coins > prev) bumpCoins();
      if (S.trade) renderTrade();
    });
    socket.on('players', list => { S.players = list; renderPlayers(); });
    socket.on('toast', d => toast(d.msg, d.kind));
    socket.on('trade:invite', onInvite);
    socket.on('trade:state', t => { S.trade = t; closeModal('modal-invite'); closeModal('modal-pick'); openTrade(); renderTrade(); });
    socket.on('trade:closed', d => { if (S.invite && S.invite.id === d.id) hideInvite(); closeTrade(); toast(esc(d.reason), 'warn'); });
    socket.on('trade:done', onTradeDone);
    socket.on('trade:emoji', onEmoji);
  }

  // ── 프로필 만들기 ─────────────────────────────
  const pf = { avatar: 'happy', color: COLORS[0] };
  function buildProfileForm() {
    $('#pf-faces').innerHTML = EMOJIS.map(e => `<button type="button" data-face="${e.id}" title="${e.label}" class="${e.id === pf.avatar ? 'on' : ''}">${emojiSVG(e.id, pf.color)}</button>`).join('');
    $('#pf-colors').innerHTML = COLORS.map(c => `<button type="button" data-color="${c}" style="background:${c}" class="${c === pf.color ? 'on' : ''}"></button>`).join('');
    $('#pf-avatar').innerHTML = emojiSVG(pf.avatar, pf.color);
  }
  $('#pf-faces').addEventListener('click', e => { const b = e.target.closest('[data-face]'); if (b) { pf.avatar = b.dataset.face; buildProfileForm(); } });
  $('#pf-colors').addEventListener('click', e => { const b = e.target.closest('[data-color]'); if (b) { pf.color = b.dataset.color; buildProfileForm(); } });
  $('#pf-nickname').addEventListener('input', e => { $('#pf-name-preview').textContent = e.target.value.trim() || '닉네임'; });
  $('#profile-form').addEventListener('submit', e => {
    e.preventDefault();
    const nickname = $('#pf-nickname').value.trim();
    if (nickname.length < 2) return ($('#pf-error').textContent = '닉네임은 2~12자로 지어주세요.');
    const btn = e.submitter || $('#profile-form .btn');
    btn.disabled = true;
    socket.emit('profile:create', { token, nickname, bio: $('#pf-bio').value.trim(), avatar: pf.avatar, color: pf.color }, res => {
      btn.disabled = false;
      if (!res.ok) return ($('#pf-error').textContent = res.error);
      S.me = res.user;
      enterMain();
      toast(`환영해요, <b>${esc(res.user.nickname)}</b>님! 🎁 <b class="gold">2000 코인</b>을 받았어요`, 'gold');
    });
  });

  // ── 메인 ─────────────────────────────────────
  function enterMain() {
    show('screen-main');
    renderMe(); renderCollection(); renderPlayers(); renderCapsules();
  }
  function renderMe() {
    const m = S.me;
    $('#me-chip').innerHTML = `${avatarHTML(m)}<div style="min-width:0"><div class="nm">${esc(m.nickname)}</div><div class="bio">${esc(m.bio || '❄ 겨울 팝잇 수집가')}</div></div>`;
    $('#coin-count').textContent = m.coins.toLocaleString();
    $('#btn-gacha').disabled = m.coins < RULES.GACHA_COST;
  }
  function bumpCoins() {
    const b = $('.coin-badge'); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump');
  }
  function renderCollection() {
    const inv = S.me.inventory, owned = new Set(inv.map(i => i.type));
    $('#dex-count').textContent = owned.size;
    $('#dex').innerHTML = POPITS.map(p => `<div class="${owned.has(p.id) ? '' : 'no'}" title="${owned.has(p.id) ? p.name : '???'}">${popitSVG(p.id)}</div>`).join('');
    $('#inventory').innerHTML = inv.length
      ? sortItems(inv).map(i => cardHTML(i)).join('')
      : '<div class="empty">아직 팝잇이 없어요.<br/>가운데의 <b>🎁 뽑기</b>로 첫 팝잇을 만나보세요!</div>';
  }
  $('#inventory').addEventListener('click', e => { const c = e.target.closest('.card'); if (c) openPopit(c.dataset.uid, c.dataset.type); });

  function renderCapsules() {
    const cols = ['#ffc2dc', '#a8f0ff', '#fff3a6', '#c7a8ff', '#b8f5c8', '#ffd9a8', '#e3f7ff'];
    let h = '';
    for (let i = 0; i < 14; i++) {
      const x = 12 + (i % 5) * 38 + (Math.floor(i / 5) % 2) * 16, y = 150 - Math.floor(i / 5) * 34 + (i % 2) * 6;
      h += `<i style="left:${x}px;top:${y}px;background:linear-gradient(180deg,${cols[i % cols.length]} 50%,#fff 50%);animation-delay:${-i * 0.13}s"></i>`;
    }
    $('#capsules').innerHTML = h;
  }

  function playerHTML(p) {
    const inTrade = !!S.trade;
    return `<div class="player">${avatarHTML(p, 'lg')}
      <div class="info"><div class="nm">${esc(p.nickname)}</div><div class="bio">${esc(p.bio || '❄')}</div>
      <div class="meta">도감 ${p.dex}/11 · 팝잇 ${p.items}개 · 거래 ${p.trades}회 ${p.busy ? '<span class="tag">· 거래 중</span>' : ''}</div></div>
      <button class="btn trade" data-trade="${p.id}" ${p.busy || inTrade ? 'disabled' : ''}>거래 신청</button></div>`;
  }
  function renderPlayers() {
    const me = S.me ? S.me.id : null;
    const others = S.players.filter(p => p.id !== me);
    $('#online-count').textContent = S.players.length;
    const html = others.length ? others.map(playerHTML).join('') : '<div class="empty">지금은 광장에 아무도 없어요.<br/>친구에게 이 링크를 보내 같이 놀아요! ❄</div>';
    $('#player-list').innerHTML = html;
    $('#pick-list').innerHTML = html;
  }
  function onPlayerClick(e) {
    const b = e.target.closest('[data-trade]');
    if (!b) return;
    b.disabled = true;
    socket.emit('trade:request', { to: b.dataset.trade }, res => {
      if (!res.ok) { b.disabled = false; return toast(esc(res.error), 'warn'); }
      closeModal('modal-pick');
      toast(`<b>${esc(res.to.nickname)}</b>님에게 거래를 신청했어요! 응답을 기다리는 중… ⏳`);
    });
  }
  $('#player-list').addEventListener('click', onPlayerClick);
  $('#pick-list').addEventListener('click', onPlayerClick);
  $('#btn-trade').addEventListener('click', () => { renderPlayers(); openModal('modal-pick'); });

  // ── 뽑기 ─────────────────────────────────────
  function doGacha() {
    if (S.gachaBusy) return;
    if (S.me.coins < RULES.GACHA_COST) return toast('코인이 부족해요! 친구와 거래하면 50코인을 받을 수 있어요.', 'warn');
    S.gachaBusy = true;
    closeModal('modal-reveal');
    $('#btn-gacha').disabled = true;
    $('#machine').classList.add('shake');
    chime(0);
    socket.emit('gacha', {}, res => {
      setTimeout(() => {
        $('#machine').classList.remove('shake');
        S.gachaBusy = false;
        renderMe();
        if (!res.ok) return toast(esc(res.error), 'warn');
        const p = POPIT_MAP[res.item.type], rk = RARITY[p.rarity];
        const card = $('.reveal-card');
        card.style.setProperty('--rc', rk.color);
        $('#reveal-art').innerHTML = popitSVG(p.id);
        $('#reveal-rarity').textContent = rk.label;
        $('#reveal-name').textContent = p.name;
        $('#reveal-new').style.display = res.isNew ? '' : 'none';
        $('#reveal-again').disabled = S.me.coins < RULES.GACHA_COST;
        openModal('modal-reveal');
        chime(rk.order === 0 ? 3 : rk.order === 1 ? 2 : 1);
      }, 1300);
    });
  }
  $('#btn-gacha').addEventListener('click', doGacha);
  $('#reveal-again').addEventListener('click', doGacha);

  // ── 팝잇 눌러보기 ──────────────────────────────
  let current = null;
  function openPopit(uid, type) {
    current = { uid, type };
    const p = POPIT_MAP[type], rk = RARITY[p.rarity];
    $('#popit-name').textContent = p.name;
    $('#popit-rarity').textContent = rk.label;
    $('#popit-rarity').style.setProperty('--rc', rk.color);
    S.popped[uid] = S.popped[uid] || new Set();
    $('#popit-art').innerHTML = popitSVG(type, { popped: S.popped[uid] });
    openModal('modal-popit');
  }
  $('#popit-art').addEventListener('click', e => {
    const b = e.target.closest('.bub');
    if (!b || !current) return;
    const set = S.popped[current.uid], i = +b.dataset.i;
    const now = !set.has(i);
    now ? set.add(i) : set.delete(i);
    b.classList.toggle('popped', now);
    b.setAttribute('fill', `url(#${now ? 'pp' : 'pb'}-${current.type})`);
    popSound(now);
    if (now && set.size === Art.getBubbles(current.type).length) toast('모두 눌렀어요! 🔄 뒤집기로 다시 눌러봐요 ✨', 'good');
  });
  $('#popit-reset').addEventListener('click', () => { if (!current) return; S.popped[current.uid] = new Set(); openPopit(current.uid, current.type); popSound(false); });

  // ── 거래 초대 ─────────────────────────────────
  let inviteTimer = null;
  function onInvite(d) {
    S.invite = d;
    $('#invite-avatar').innerHTML = emojiSVG(d.from.avatar, d.from.color);
    $('#invite-title').innerHTML = `<b>${esc(d.from.nickname)}</b>님의 거래 신청!`;
    $('#invite-bio').textContent = `${d.from.bio || '❄'} · 도감 ${d.from.dex}/11`;
    const bar = $('#invite-bar');
    bar.style.transition = 'none'; bar.style.width = '100%';
    requestAnimationFrame(() => requestAnimationFrame(() => { bar.style.transition = `width ${d.expiresIn}ms linear`; bar.style.width = '0%'; }));
    clearTimeout(inviteTimer);
    inviteTimer = setTimeout(hideInvite, d.expiresIn);
    openModal('modal-invite');
    chime(1);
  }
  function hideInvite() { S.invite = null; clearTimeout(inviteTimer); closeModal('modal-invite'); }
  function respond(accept) {
    if (!S.invite) return;
    socket.emit('trade:respond', { id: S.invite.id, accept }, res => { if (!res.ok) toast(esc(res.error), 'warn'); });
    hideInvite();
  }
  $('#invite-yes').addEventListener('click', () => respond(true));
  $('#invite-no').addEventListener('click', () => respond(false));

  // ── 거래판 ───────────────────────────────────
  $('#tb-emojis').innerHTML = EMOJIS.map(e => `<button data-emo="${e.id}">${emojiSVG(e.id)}<span>${e.label}</span></button>`).join('');
  function openTrade() { $('#trade').classList.add('open'); renderPlayers(); }
  function closeTrade() { S.trade = null; $('#trade').classList.remove('open'); renderPlayers(); }
  function sides() {
    const t = S.trade, mine = t.a.user.id === S.me.id ? 'a' : 'b';
    return { M: t[mine], P: t[mine === 'a' ? 'b' : 'a'] };
  }
  function renderSide(el, side, isMe) {
    el.classList.toggle('ready', side.ready);
    $('.tb-user', el).innerHTML = `${avatarHTML(side.user)}<div><div class="nm">${esc(side.user.nickname)}</div><div class="who">${isMe ? '나의 제안' : '상대의 제안'} · ${side.items.length}/${RULES.MAX_OFFER}</div></div>`;
    let h = '';
    for (let i = 0; i < RULES.MAX_OFFER; i++) {
      const it = side.items[i];
      if (it) {
        const p = POPIT_MAP[it.type];
        h += `<div class="slot-cell filled" style="--rc:${RARITY[p.rarity].color}" data-uid="${it.uid}" title="${p.name}">${popitSVG(it.type)}<span class="nm">${p.name.replace(' 팝잇', '')}</span></div>`;
      } else h += '<div class="slot-cell">❄</div>';
    }
    $('.tb-slots', el).innerHTML = h;
    $('.tb-ready', el).textContent = side.ready ? '✓ 확정 완료!' : '고르는 중…';
  }
  function renderTrade() {
    if (!S.trade || !S.me) return;
    const { M, P } = sides();
    renderSide($('#tb-me'), M, true);
    renderSide($('#tb-partner'), P, false);
    const offered = new Set(M.items.map(i => i.uid));
    $('#tb-inv').innerHTML = S.me.inventory.length
      ? sortItems(S.me.inventory).map(i => cardHTML(i, offered.has(i.uid) ? 'sel' : '')).join('')
      : '<div class="empty" style="padding:12px">보관함이 비어 있어요. 상대의 팝잇을 선물로 받을 수도 있어요!</div>';
    const btn = $('#tb-ready-btn');
    btn.textContent = M.ready ? '확정 취소하기' : '거래 확정하기';
    btn.classList.toggle('on', M.ready);
    let st;
    if (M.items.length + P.items.length === 0) st = '서로 교환할 팝잇을 거래판에 올려주세요.';
    else if (M.ready && !P.ready) st = `${esc(P.user.nickname)}님이 확정하기를 기다리는 중… ⏳`;
    else if (!M.ready && P.ready) st = `✨ ${esc(P.user.nickname)}님이 확정했어요! 나도 확정하면 거래 완료!`;
    else st = '둘 다 <b>거래 확정</b>을 누르면 교환돼요. 거래판이 바뀌면 다시 확정해야 해요.';
    $('#tb-status').innerHTML = st;
  }
  function setOffer(uids) {
    socket.emit('trade:offer', { id: S.trade.id, uids }, res => { if (!res.ok) toast(esc(res.error), 'warn'); });
  }
  $('#tb-inv').addEventListener('click', e => {
    const c = e.target.closest('.card');
    if (!c || !S.trade) return;
    const cur = sides().M.items.map(i => i.uid);
    const uid = c.dataset.uid;
    if (cur.includes(uid)) setOffer(cur.filter(x => x !== uid));
    else if (cur.length >= RULES.MAX_OFFER) toast(`거래판에는 ${RULES.MAX_OFFER}개까지 올릴 수 있어요.`, 'warn');
    else { setOffer([...cur, uid]); popSound(true); }
  });
  $('#tb-me').addEventListener('click', e => {
    const c = e.target.closest('.slot-cell.filled');
    if (!c || !S.trade) return;
    setOffer(sides().M.items.map(i => i.uid).filter(x => x !== c.dataset.uid));
  });
  $('#tb-ready-btn').addEventListener('click', () => {
    if (!S.trade) return;
    socket.emit('trade:ready', { id: S.trade.id, ready: !sides().M.ready }, res => { if (!res.ok) toast(esc(res.error), 'warn'); });
  });
  $('#tb-cancel').addEventListener('click', () => { if (S.trade) socket.emit('trade:cancel', { id: S.trade.id }); });
  $('#tb-emojis').addEventListener('click', e => {
    const b = e.target.closest('[data-emo]');
    if (b && S.trade) socket.emit('trade:emoji', { id: S.trade.id, emoji: b.dataset.emo });
  });
  function onEmoji(d) {
    if (!S.trade || S.trade.id !== d.id) return;
    const stage = $(d.from === S.me.id ? '#tb-me .emote-stage' : '#tb-partner .emote-stage');
    const f = document.createElement('div');
    f.className = 'emote-float';
    f.innerHTML = emojiSVG(d.emoji);
    stage.innerHTML = '';
    stage.appendChild(f);
    setTimeout(() => f.remove(), 2300);
    if (d.from !== S.me.id) popSound(true);
  }
  function onTradeDone(d) {
    closeTrade();
    $('#done-text').innerHTML = `<b>${esc(d.partner.nickname)}</b>님과의 거래가 끝났어요!` + (d.received.length ? '<br/>새로 받은 팝잇:' : '<br/>이번엔 선물을 주었어요 💝');
    $('#done-items').innerHTML = d.received.map(i => cardHTML(i)).join('');
    openModal('modal-done');
    chime(2);
  }

  // ── 소리 ─────────────────────────────────────
  let actx;
  const ac = () => (actx = actx || new (window.AudioContext || window.webkitAudioContext)());
  function popSound(down) {
    try {
      const a = ac(), o = a.createOscillator(), g = a.createGain(), t = a.currentTime;
      o.type = 'sine';
      o.frequency.setValueAtTime(down ? 560 : 340, t);
      o.frequency.exponentialRampToValueAtTime(down ? 160 : 620, t + 0.08);
      g.gain.setValueAtTime(0.22, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      o.connect(g).connect(a.destination); o.start(t); o.stop(t + 0.13);
    } catch (e) {}
  }
  function chime(level) {
    try {
      const a = ac(), base = [523, 659, 784, 1046, 1318];
      const n = level === 0 ? 2 : level + 2;
      for (let i = 0; i < n; i++) {
        const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + i * 0.09;
        o.type = 'triangle'; o.frequency.value = base[i % base.length] * (level === 3 ? 1.5 : 1);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
        o.connect(g).connect(a.destination); o.start(t); o.stop(t + 0.55);
      }
    } catch (e) {}
  }

  // ── 눈 내리는 배경 ─────────────────────────────
  function startSnow() {
    const c = $('#snow'), ctx = c.getContext('2d');
    let W, H, flakes = [], stars = [];
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    function resize() {
      W = c.width = innerWidth; H = c.height = innerHeight;
      const n = Math.min(160, Math.floor(W * H / 9000));
      flakes = Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 2.4 + 0.6, s: Math.random() * 0.7 + 0.3, w: Math.random() * Math.PI * 2 }));
      stars = Array.from({ length: 70 }, () => ({ x: Math.random() * W, y: Math.random() * H * 0.6, r: Math.random() * 1.2 + 0.3, p: Math.random() * 6 }));
    }
    resize(); addEventListener('resize', resize);
    function frame(t) {
      ctx.clearRect(0, 0, W, H);
      for (const s of stars) {
        ctx.globalAlpha = 0.35 + 0.45 * Math.sin(t / 900 + s.p) ** 2;
        ctx.fillStyle = '#e8f2ff';
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill();
      }
      ctx.fillStyle = '#ffffff';
      for (const f of flakes) {
        f.y += f.s; f.w += 0.01; f.x += Math.sin(f.w) * 0.4;
        if (f.y > H + 5) { f.y = -5; f.x = Math.random() * W; }
        ctx.globalAlpha = 0.45 + f.r / 6;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 7); ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (!reduce) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
})();
