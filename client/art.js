// ❄ 팝잇 11종 + 이모티콘 9종 그림 (SVG)
(function () {
  function starPath(cx, cy, n, R, r, rot = -90) {
    let d = '';
    for (let i = 0; i < n * 2; i++) {
      const rad = ((rot + (180 / n) * i) * Math.PI) / 180;
      const rr = i % 2 === 0 ? R : r;
      d += (i ? 'L' : 'M') + (cx + rr * Math.cos(rad)).toFixed(1) + ',' + (cy + rr * Math.sin(rad)).toFixed(1);
    }
    return d + 'Z';
  }
  // 부드러운 꼭짓점의 별/눈송이
  function softStar(cx, cy, n, R, r, rot = -90) {
    const pts = [];
    for (let i = 0; i < n * 2; i++) {
      const rad = ((rot + (180 / n) * i) * Math.PI) / 180;
      const rr = i % 2 === 0 ? R : r;
      pts.push([cx + rr * Math.cos(rad), cy + rr * Math.sin(rad)]);
    }
    let d = '';
    for (let i = 0; i < pts.length; i++) {
      const p0 = pts[(i - 1 + pts.length) % pts.length], p1 = pts[i], p2 = pts[(i + 1) % pts.length];
      const a = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2], b = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
      d += (i ? 'L' : 'M') + a[0].toFixed(1) + ',' + a[1].toFixed(1) + 'Q' + p1[0].toFixed(1) + ',' + p1[1].toFixed(1) + ' ' + b[0].toFixed(1) + ',' + b[1].toFixed(1);
    }
    return d + 'Z';
  }
  const circ = (cx, cy, r) => `M${cx - r},${cy}a${r},${r} 0 1,0 ${2 * r},0a${r},${r} 0 1,0 ${-2 * r},0Z`;

  const POPITS = [
    { id: 'cat', name: '고양이 얼굴 팝잇', rarity: 'legendary', colors: ['#ffd9ef', '#b597ff'],
      d: 'M38,86 L40,22 Q42,14 50,19 L86,52 Q100,48 114,52 L150,19 Q158,14 160,22 L162,86 Q182,116 166,150 Q146,186 100,186 Q54,186 34,150 Q18,116 38,86 Z',
      deco: '<path d="M55,40 L58,62 L74,53 Z M145,40 L142,62 L126,53 Z" fill="#ffb3d6" opacity=".55"/>' },
    { id: 'heart', name: '서리 하트 팝잇', rarity: 'common', colors: ['#ffc2dc', '#ff7aa8'],
      d: 'M100,180 C42,138 10,104 22,64 C34,24 86,22 100,58 C114,22 166,24 178,64 C190,104 158,138 100,180 Z' },
    { id: 'star', name: '별빛 팝잇', rarity: 'common', colors: ['#fff6b8', '#ffc65a'], d: softStar(100, 108, 5, 96, 48) },
    { id: 'snowflake', name: '눈송이 팝잇', rarity: 'common', colors: ['#e3f7ff', '#86c9ff'], d: softStar(100, 100, 6, 94, 58) },
    { id: 'cloud', name: '눈구름 팝잇', rarity: 'common', colors: ['#f0f5ff', '#aebfff'],
      d: 'M48,156 Q10,156 12,120 Q14,86 52,88 Q56,40 104,40 Q146,42 154,82 Q190,82 190,120 Q188,156 152,156 Z' },
    { id: 'moon', name: '초승달 팝잇', rarity: 'rare', colors: ['#fff4cf', '#e8c463'],
      d: 'M120,14 A88,88 0 1 0 186,128 A70,70 0 0 1 120,14 Z' },
    { id: 'snowman', name: '눈사람 팝잇', rarity: 'rare', colors: ['#ffffff', '#c6d9f2'],
      d: circ(100, 60, 44) + circ(100, 140, 56), noHL: true,
      deco: '<path d="M70,26 L130,26 L124,8 L76,8 Z" fill="#5a4fa3"/><rect x="62" y="24" width="76" height="7" rx="3" fill="#7b6fd0"/>' },
    { id: 'tree', name: '겨울나무 팝잇', rarity: 'rare', colors: ['#c4f7d4', '#3fb683'],
      d: 'M100,8 L146,62 L128,62 L168,112 L148,112 L190,168 L116,168 L116,192 L84,192 L84,168 L10,168 L52,112 L32,112 L72,62 L54,62 Z' },
    { id: 'penguin', name: '펭귄 팝잇', rarity: 'epic', colors: ['#a9bcff', '#5466cf'],
      d: 'M100,12 Q148,12 152,70 Q154,92 172,118 Q178,128 164,128 Q166,160 146,180 Q160,188 150,192 L50,192 Q40,188 54,180 Q34,160 36,128 Q22,128 28,118 Q46,92 48,70 Q52,12 100,12 Z' },
    { id: 'rabbit', name: '눈토끼 팝잇', rarity: 'epic', colors: ['#ffffff', '#d3c4ff'],
      d: 'M64,96 Q44,46 56,10 Q78,2 86,86 Q100,82 114,86 Q122,2 144,10 Q156,46 136,96 Q178,118 164,160 Q146,194 100,194 Q54,194 36,160 Q22,118 64,96 Z',
      deco: '<path d="M60,22 Q70,22 76,74 Q66,66 60,22 Z M140,22 Q130,22 124,74 Q134,66 140,22 Z" fill="#ffc4de" opacity=".6"/>' },
    { id: 'crystal', name: '얼음 보석 팝잇', rarity: 'epic', colors: ['#c2fff3', '#4ccbe6'],
      d: 'M58,24 L142,24 L186,78 L100,190 L14,78 Z' },
  ];
  const POPIT_MAP = Object.fromEntries(POPITS.map(p => [p.id, p]));
  const RARITY = {
    common: { label: '일반', color: '#bcd6ff', order: 3 },
    rare: { label: '희귀', color: '#7fe3ff', order: 2 },
    epic: { label: '영웅', color: '#cf98ff', order: 1 },
    legendary: { label: '전설', color: '#ffd76b', order: 0 },
  };

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    r = Math.round(r * (1 - amt)); g = Math.round(g * (1 - amt)); b = Math.round(b * (1 - amt));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  // 팝잇 모양 안에 꽉 차게 들어가는 버블 위치 계산 (캔버스 isPointInPath)
  const bubbleCache = {};
  function getBubbles(type) {
    if (bubbleCache[type]) return bubbleCache[type];
    const p = POPIT_MAP[type];
    const ctx = document.createElement('canvas').getContext('2d');
    const path = new Path2D(p.d);
    const s = 21, r = 8.6, inset = r + 4.5, out = [];
    const rowH = s * 0.866;
    for (let row = 0, y = 6; y < 200; row++, y += rowH) {
      for (let x = (row % 2 ? s / 2 : 0) + 4; x < 200; x += s) {
        let ok = ctx.isPointInPath(path, x, y);
        for (let k = 0; ok && k < 12; k++) {
          const a = (k / 12) * Math.PI * 2;
          ok = ctx.isPointInPath(path, x + Math.cos(a) * inset, y + Math.sin(a) * inset);
        }
        if (ok) out.push({ x: +x.toFixed(1), y: +y.toFixed(1), r });
      }
    }
    return (bubbleCache[type] = out);
  }

  function injectDefs() {
    let s = '<svg width="0" height="0" style="position:absolute;width:0;height:0" aria-hidden="true"><defs>';
    for (const p of POPITS) {
      const [c0, c1] = p.colors;
      s += `<linearGradient id="pg-${p.id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c0}"/><stop offset="1" stop-color="${c1}"/></linearGradient>`;
      s += `<radialGradient id="pb-${p.id}" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#ffffff"/><stop offset=".35" stop-color="${c0}"/><stop offset="1" stop-color="${shade(c1, 0.12)}"/></radialGradient>`;
      s += `<radialGradient id="pp-${p.id}" cx="62%" cy="68%" r="80%"><stop offset="0" stop-color="${c0}"/><stop offset=".55" stop-color="${shade(c1, 0.15)}"/><stop offset="1" stop-color="${shade(c1, 0.38)}"/></radialGradient>`;
    }
    s += '</defs></svg>';
    document.body.insertAdjacentHTML('afterbegin', s);
  }

  function popitSVG(type, opts = {}) {
    const p = POPIT_MAP[type];
    if (!p) return '';
    const popped = opts.popped || null;
    const edge = shade(p.colors[1], 0.22);
    let bubs = '';
    getBubbles(type).forEach((b, i) => {
      const isP = popped && popped.has(i);
      bubs += `<circle class="bub${isP ? ' popped' : ''}" data-i="${i}" cx="${b.x}" cy="${b.y}" r="${b.r}" fill="url(#${isP ? 'pp' : 'pb'}-${type})" stroke="${edge}" stroke-opacity=".35" stroke-width="1"/>`;
    });
    return `<svg class="popit ${opts.cls || ''}" viewBox="0 0 200 200" role="img" aria-label="${p.name}">
      <path d="${p.d}" fill="url(#pg-${type})" stroke="${edge}" stroke-width="5" stroke-linejoin="round"/>
      ${p.noHL ? '' : `<path d="${p.d}" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="2" stroke-linejoin="round" transform="translate(100 100) scale(.94) translate(-100 -100)"/>`}
      ${p.deco || ''}<g>${bubs}</g></svg>`;
  }

  // ── 이모티콘 9종 (눈고양이 얼굴) ─────────────────────
  const EMOJIS = [
    { id: 'happy', label: '기뻐요' }, { id: 'love', label: '좋아요' }, { id: 'wow', label: '놀라워요' },
    { id: 'sad', label: '슬퍼요' }, { id: 'angry', label: '화나요' }, { id: 'think', label: '고민돼요' },
    { id: 'excited', label: '신나요' }, { id: 'shy', label: '부끄러워요' }, { id: 'sleepy', label: '졸려요' },
  ];
  const INK = '#3b3a6b';
  const ln = (d, w = 2.6) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const heart = (x, y, c = '#ff5c8a') => `<path d="M${x},${y + 4} C${x - 7},${y - 1} ${x - 4},${y - 8} ${x},${y - 3} C${x + 4},${y - 8} ${x + 7},${y - 1} ${x},${y + 4} Z" fill="${c}"/>`;
  const dots = `<circle cx="23" cy="35" r="2.8" fill="${INK}"/><circle cx="41" cy="35" r="2.8" fill="${INK}"/>`;
  const FEATURES = {
    happy: ln('M19,36 Q23,30 27,36') + ln('M37,36 Q41,30 45,36') + ln('M27,43 Q32,49 37,43'),
    love: heart(23, 35) + heart(41, 35) + ln('M27,43 Q32,48 37,43'),
    wow: `<circle cx="23" cy="34" r="3.6" fill="${INK}"/><circle cx="41" cy="34" r="3.6" fill="${INK}"/><circle cx="24.2" cy="32.8" r="1.2" fill="#fff"/><circle cx="42.2" cy="32.8" r="1.2" fill="#fff"/><ellipse cx="32" cy="46" rx="3.6" ry="4.6" fill="${INK}"/>`,
    sad: ln('M18,30 L27,27', 2.2) + ln('M46,30 L37,27', 2.2) + dots + ln('M27,47 Q32,42 37,47') + '<path d="M46,39 Q50,46 46,49 Q42,46 46,39 Z" fill="#7cc8ff"/>',
    angry: ln('M18,27 L27,31', 2.4) + ln('M46,27 L37,31', 2.4) + dots + ln('M27,47 Q32,42 37,47') + `<path d="M50,13 l5,5 M55,13 l-5,5" stroke="#ff5c6c" stroke-width="2.6" stroke-linecap="round"/>`,
    think: dots + ln('M28,45 L37,43') + `<text x="49" y="20" font-size="15" font-weight="bold" fill="#8b8ff0" font-family="sans-serif">?</text>`,
    excited: `<path d="${starPath(23, 35, 5, 5.6, 2.4)}" fill="#ffc63d"/><path d="${starPath(41, 35, 5, 5.6, 2.4)}" fill="#ffc63d"/><path d="M26,42 Q32,52 38,42 Z" fill="${INK}"/><path d="M29,45.5 Q32,49 35,45.5 Z" fill="#ff8fb0"/>`,
    shy: ln('M19,32 L25,35 L19,38') + ln('M45,32 L39,35 L45,38') + ln('M27,45 q2.5,-2.5 5,0 q2.5,2.5 5,0', 2.2),
    sleepy: ln('M19,35 Q23,38.5 27,35') + ln('M37,35 Q41,38.5 45,35') + `<circle cx="32" cy="45" r="2.2" fill="${INK}"/><text x="46" y="20" font-size="12" font-weight="bold" fill="#8b8ff0" font-family="sans-serif">z</text><text x="53" y="13" font-size="9" font-weight="bold" fill="#8b8ff0" font-family="sans-serif">z</text>`,
  };
  function emojiSVG(id, face = '#f4f8ff') {
    if (!FEATURES[id]) id = 'happy';
    const fc = id === 'angry' && face === '#f4f8ff' ? '#ffe1e6' : face;
    const blush = id === 'shy' ? 0.95 : id === 'angry' ? 0 : 0.6;
    return `<svg class="emo" viewBox="0 0 64 64" role="img" aria-label="${(EMOJIS.find(e => e.id === id) || {}).label || ''}">
      <path d="M12,26 L15,6 L29,16 Z M52,26 L49,6 L35,16 Z" fill="${fc}" stroke="#8ea6e0" stroke-width="2" stroke-linejoin="round"/>
      <path d="M16,20 L17.5,11 L24,16 Z M48,20 L46.5,11 L40,16 Z" fill="#ffc4de"/>
      <ellipse cx="32" cy="36" rx="25" ry="23" fill="${fc}" stroke="#8ea6e0" stroke-width="2"/>
      <ellipse cx="17" cy="42" rx="4.6" ry="2.8" fill="#ffadc8" opacity="${blush}"/><ellipse cx="47" cy="42" rx="4.6" ry="2.8" fill="#ffadc8" opacity="${blush}"/>
      ${FEATURES[id]}</svg>`;
  }

  window.Art = { POPITS, POPIT_MAP, RARITY, EMOJIS, popitSVG, emojiSVG, getBubbles, injectDefs };
})();
