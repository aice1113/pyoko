'use strict';

/* ============================================================
   ぴょこと あそぼう（3歳児向け知育アプリ）MVP
   記録はこの端末の localStorage にだけ保存する。外部への通信はしない。
   ============================================================ */

const APP_VERSION = 'MVP 0.1';
const STORAGE_KEY = 'chiiku.v1';
const QUESTIONS_PER_ROUND = 5;
const PASS_SCORE = 4;        // 5問中4問以上で合格
const LEVEL_UP_STREAK = 3;   // 合格が3回続いたらレベルアップ
const LIMIT_CHOICES = [5, 10, 15, 20, 30];
const DONE_HOLD_MS = 4500;   // 時間切れでも、ほめ終わるまでは「おしまい」にしない
const GAMES = {
  iro: { name: 'いろ', maxLevel: 2 },
  kazu: { name: 'かず', maxLevel: 2 },
};

const COLORS = [
  { name: 'あか', hex: '#ff4d4d' },
  { name: 'あお', hex: '#3d8bff' },
  { name: 'きいろ', hex: '#ffd23d' },
  { name: 'みどり', hex: '#35c46a' },
  { name: 'ぴんく', hex: '#ff8fc7' },
  { name: 'おれんじ', hex: '#ff9a2e' },
  { name: 'むらさき', hex: '#9b5de5' },
  { name: 'ちゃいろ', hex: '#9c6b3f' },
];
const NUM_WORDS = ['', 'いち', 'に', 'さん', 'よん', 'ご'];
const COUNT_WORDS = ['', 'ひとつ', 'ふたつ', 'みっつ', 'よっつ', 'いつつ'];
const FRUITS = [
  { name: 'りんご', color: '#ff4d4d', round: false },
  { name: 'みかん', color: '#ff9a2e', round: true },
];
const CONFETTI_COLORS = ['#ff4d4d', '#ffd23d', '#3d8bff', '#35c46a', '#ff8fc7', '#9b5de5'];

// ---------- 小さな道具 ----------
const $ = (sel) => document.querySelector(sel);
const randInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const sample = (arr, n) => shuffle(arr).slice(0, n);
// 前回と同じ答えが続かないように選ぶ
const pickOther = (arr, prev) => {
  const c = arr.filter((x) => x !== prev);
  return c[Math.floor(Math.random() * c.length)];
};
const toInt = (v) => (Number.isFinite(+v) && +v > 0 ? Math.floor(+v) : 0);
const clampLevel = (id, v) => Math.min(GAMES[id].maxLevel, Math.max(1, toInt(v) || 1));
const pad2 = (n) => String(n).padStart(2, '0');
const dateKey = (d = new Date()) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

function h(tag, className, html) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (html != null) e.innerHTML = html;
  return e;
}

function fmtDate(key) {
  const [y, m, d] = key.split('-').map(Number);
  const w = '日月火水木金土'[new Date(y, m - 1, d).getDay()];
  return `${m}/${d}（${w}）`;
}

// ---------- 絵 ----------
function rabbitSVG() {
  const line = 'stroke="#e3cdd5" stroke-width="3"';
  return `
<svg class="rabbit-svg" viewBox="0 0 200 250" aria-hidden="true">
  <g class="ear ear-l">
    <ellipse cx="72" cy="64" rx="20" ry="52" fill="#fff" ${line}/>
    <ellipse cx="72" cy="68" rx="10" ry="38" fill="#ffc3d3"/>
  </g>
  <g class="ear ear-r">
    <ellipse cx="128" cy="64" rx="20" ry="52" fill="#fff" ${line}/>
    <ellipse cx="128" cy="68" rx="10" ry="38" fill="#ffc3d3"/>
  </g>
  <ellipse cx="100" cy="222" rx="46" ry="26" fill="#fff" ${line}/>
  <circle cx="100" cy="150" r="64" fill="#fff" ${line}/>
  <g transform="translate(142 103) rotate(22)">
    <path d="M0 0 L-21 -13 Q-26 0 -21 13 Z" fill="#ffb547"/>
    <path d="M0 0 L21 -13 Q26 0 21 13 Z" fill="#ffb547"/>
    <circle r="6.5" fill="#ff9318"/>
  </g>
  <ellipse cx="64" cy="174" rx="13" ry="8" fill="#ffc9d6"/>
  <ellipse cx="136" cy="174" rx="13" ry="8" fill="#ffc9d6"/>
  <g class="eyes-open">
    <ellipse cx="78" cy="146" rx="8" ry="11" fill="#3a2e39"/>
    <ellipse cx="122" cy="146" rx="8" ry="11" fill="#3a2e39"/>
    <circle cx="81" cy="141" r="3" fill="#fff"/>
    <circle cx="125" cy="141" r="3" fill="#fff"/>
  </g>
  <g class="eyes-happy" fill="none" stroke="#3a2e39" stroke-width="5" stroke-linecap="round">
    <path d="M68 150 Q78 136 88 150"/>
    <path d="M112 150 Q122 136 132 150"/>
  </g>
  <g class="eyes-sleep" fill="none" stroke="#3a2e39" stroke-width="5" stroke-linecap="round">
    <path d="M68 146 Q78 156 88 146"/>
    <path d="M112 146 Q122 156 132 146"/>
  </g>
  <path d="M93 163 Q100 158 107 163 Q100 172 93 163 Z" fill="#ff8fab"/>
  <path d="M100 169 Q100 177 92 179 M100 169 Q100 177 108 179" fill="none" stroke="#3a2e39" stroke-width="3" stroke-linecap="round"/>
  <ellipse cx="68" cy="214" rx="12" ry="10" fill="#fff" ${line}/>
  <ellipse cx="132" cy="214" rx="12" ry="10" fill="#fff" ${line}/>
</svg>`;
}

function balloonSVG(hex) {
  return `<svg class="balloon-svg" viewBox="0 0 100 150" aria-hidden="true">
  <path d="M50 106 Q44 120 54 132 Q61 142 50 150" stroke="#9a8f99" stroke-width="2.5" fill="none"/>
  <path d="M43 99 L57 99 L50 108 Z" fill="${hex}"/>
  <ellipse cx="50" cy="52" rx="40" ry="48" fill="${hex}"/>
  <ellipse cx="34" cy="34" rx="8" ry="14" fill="#fff" opacity=".45" transform="rotate(-20 34 34)"/>
</svg>`;
}

function fruitSVG(f) {
  const body = f.round
    ? `<circle cx="50" cy="57" r="37" fill="${f.color}"/>`
    : `<path d="M50 30C32 16 8 26 10 54c2 26 22 40 40 34 18 6 38-8 40-34 2-28-22-38-40-24z" fill="${f.color}"/>`;
  return `<svg class="fruit" viewBox="0 0 100 100" aria-hidden="true">${body}<path d="M50 30q2-14 8-22" stroke="#6b4423" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M56 18q16-12 26-2q-12 10-26 2z" fill="#4caf50"/><ellipse cx="32" cy="48" rx="7" ry="11" fill="#fff" opacity=".4"/></svg>`;
}

const STAR_SVG = '<svg class="star" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17l-6.1 3.4 1.5-6.8L2.2 9l6.9-.7z"/></svg>';

// ---------- 記録（端末内だけに保存） ----------
const Store = {
  data: null,
  load() {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { raw = null; }
    this.data = normalize(raw);
  },
  save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data)); } catch { /* 保存できない環境では記録しない */ }
  },
};

// 壊れたデータや読み込んだファイルを、決まった形にそろえる
function normalize(raw) {
  const d = raw && typeof raw === 'object' ? raw : {};
  const s = d.settings || {};
  const lv = s.level || {};
  const st = d.streak || {};
  const days = {};
  if (d.days && typeof d.days === 'object') {
    for (const [k, v] of Object.entries(d.days)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(k) || !v || typeof v !== 'object') continue;
      days[k] = {
        sec: toInt(v.sec),
        extraMin: toInt(v.extraMin),
        rounds: Array.isArray(v.rounds)
          ? v.rounds.filter((r) => r && GAMES[r.game]).map((r) => ({
            game: r.game,
            level: clampLevel(r.game, r.level),
            correct: Math.min(toInt(r.correct), toInt(r.total) || QUESTIONS_PER_ROUND),
            total: toInt(r.total) || QUESTIONS_PER_ROUND,
            time: /^\d{2}:\d{2}$/.test(r.time) ? r.time : '',
          }))
          : [],
      };
    }
  }
  return {
    version: 1,
    settings: {
      dailyLimitMin: LIMIT_CHOICES.includes(s.dailyLimitMin) ? s.dailyLimitMin : 10,
      level: { iro: clampLevel('iro', lv.iro), kazu: clampLevel('kazu', lv.kazu) },
    },
    streak: { iro: toInt(st.iro), kazu: toInt(st.kazu) },
    days,
    milestones: Array.isArray(d.milestones)
      ? d.milestones
        .filter((m) => m && GAMES[m.game] && /^\d{4}-\d{2}-\d{2}$/.test(m.date))
        .map((m) => ({ date: m.date, game: m.game, level: clampLevel(m.game, m.level) }))
      : [],
  };
}

function today() {
  const days = Store.data.days;
  const k = dateKey();
  if (!days[k]) days[k] = { sec: 0, extraMin: 0, rounds: [] };
  return days[k];
}
const remainingSec = () => (Store.data.settings.dailyLimitMin + today().extraMin) * 60 - today().sec;

// ---------- 音声（iPhone の合成音声） ----------
const Speech = {
  supported: 'speechSynthesis' in window,
  voice: null,
  current: null,
  init() {
    if (!this.supported) return;
    const pick = () => {
      const ja = speechSynthesis.getVoices().filter((v) => /^ja([-_]|$)/i.test(v.lang));
      this.voice = ja.find((v) => /kyoko/i.test(v.name)) || ja.find((v) => v.localService) || ja[0] || null;
    };
    pick();
    speechSynthesis.onvoiceschanged = pick;
  },
  // 前の発話は止めて、新しい発話だけを読む
  say(text) {
    if (!this.supported || !text) return Promise.resolve();
    return new Promise((resolve) => {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ja-JP';
      if (this.voice) u.voice = this.voice;
      u.rate = 0.9;
      u.pitch = 1.25;
      let finished = false;
      const finish = () => { if (!finished) { finished = true; resolve(); } };
      u.onend = finish;
      u.onerror = finish;
      setTimeout(finish, 1500 + text.length * 250);
      this.current = u; // 参照を持っておかないと onend が来ないブラウザがある
      const go = () => { if (this.current === u) speechSynthesis.speak(u); };
      if (speechSynthesis.speaking || speechSynthesis.pending) {
        speechSynthesis.cancel();
        setTimeout(go, 80); // cancel 直後の speak は iOS で無視されることがある
      } else {
        go();
      }
    });
  },
  stop() {
    if (!this.supported) return;
    this.current = null;
    speechSynthesis.cancel();
  },
};

// ---------- 効果音（その場で合成するので音声ファイルは不要） ----------
const Sfx = {
  ctx: null,
  unlock() {
    try {
      if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch { this.ctx = null; }
  },
  tone(freq, start, dur, type = 'sine', vol = 0.18) {
    const c = this.ctx;
    if (!c) return;
    const o = c.createOscillator();
    const g = c.createGain();
    const t = c.currentTime + start;
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + dur + 0.05);
  },
  tap() { this.tone(880, 0, 0.09, 'sine', 0.12); },
  correct() { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, i * 0.09, 0.28, 'triangle')); },
  oops() { this.tone(392, 0, 0.18, 'sine', 0.12); this.tone(330, 0.16, 0.26, 'sine', 0.12); },
  fanfare() {
    [523.25, 659.25, 783.99, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, i * 0.13, 0.3, 'triangle', 0.2));
  },
};

// ---------- 画面の切りかえ ----------
let current = 'start';
const COUNTING = new Set(['home', 'game', 'done']); // 時間を数える画面

function show(name) {
  for (const s of document.querySelectorAll('.screen')) s.classList.toggle('active', s.id === `screen-${name}`);
  current = name;
}

function setMood(el, mood) {
  el.classList.remove('mood-happy', 'mood-sleep');
  if (mood === 'normal') return;
  void el.offsetWidth; // 同じ動きをもう一度再生させる
  el.classList.add(`mood-${mood}`);
}

function confetti(count = 28) {
  const box = $('#confetti');
  for (let i = 0; i < count; i++) {
    const p = h('i');
    p.style.left = `${Math.random() * 100}%`;
    p.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    p.style.animationDelay = `${Math.random() * 0.3}s`;
    p.style.animationDuration = `${1.2 + Math.random() * 0.9}s`;
    p.style.setProperty('--drift', `${randInt(-60, 60)}px`);
    p.style.setProperty('--rot', `${randInt(180, 720)}deg`);
    box.append(p);
    setTimeout(() => p.remove(), 2600);
  }
}

// ---------- 時間制限（1日の合計） ----------
let pendingOver = false; // 問題の途中で時間切れになったら、5問終わってから「おしまい」にする
let warnedDate = '';
let doneAt = 0;

function tick() {
  if (document.hidden || !COUNTING.has(current)) return;
  const d = today();
  d.sec += 1;
  if (d.sec % 5 === 0) Store.save();
  if (remainingSec() > 0) {
    if (current !== 'game') maybeWarn();
    return;
  }
  if (current === 'game') pendingOver = true;
  else if (current === 'home') goOver();
  else if (current === 'done' && Date.now() - doneAt > DONE_HOLD_MS) goOver();
}

function maybeWarn() {
  const r = remainingSec();
  if (r > 0 && r <= 60 && warnedDate !== dateKey()) {
    warnedDate = dateKey();
    Speech.say('あと すこしで おしまい だよ');
  }
}

function goHome(silent) {
  game = null;
  if (remainingSec() <= 0) { goOver(); return; }
  show('home');
  setMood($('#home-rabbit'), 'normal');
  if (!silent) Speech.say('つぎは なにで あそぶ？');
  maybeWarn();
}

function goOver() {
  game = null;
  pendingOver = false;
  Store.save();
  show('over');
  setMood($('#over-rabbit'), 'sleep');
  Speech.say('きょうは おしまい。 また あした あそぼうね');
}

// ---------- 問題の進行 ----------
let game = null;
let lastGameId = 'iro';

function startGame(id) {
  if (remainingSec() <= 0) { goOver(); return; }
  lastGameId = id;
  game = { id, level: Store.data.settings.level[id], q: 0, score: 0, missed: false, locked: false, phase: '', last: null, speech: '' };
  renderProgress();
  show('game');
  nextQuestion();
}

// 画面を離れたら、予約していた処理は実行しない
function later(fn, ms) {
  const g = game;
  setTimeout(() => { if (g && game === g) fn(); }, ms);
}

function ask(text, speech) {
  $('#prompt').textContent = text;
  game.speech = speech || text;
  Speech.say(game.speech);
}

function renderProgress() {
  const box = $('#progress');
  box.innerHTML = '';
  for (let i = 0; i < QUESTIONS_PER_ROUND; i++) {
    box.append(h('span', `pip${game && i < game.q ? ' on' : ''}`, STAR_SVG));
  }
}

function nextQuestion() {
  if (game.q >= QUESTIONS_PER_ROUND) { finishRound(); return; }
  game.missed = false;
  game.locked = false;
  game.phase = '';
  setMood($('#game-rabbit'), 'normal');
  const stage = $('#stage');
  stage.innerHTML = '';
  stage.className = 'stage';
  if (game.id === 'iro') askIro(game, stage);
  else askKazu(game, stage);
}

function correct(praise, wait = 1900) {
  const g = game;
  g.locked = true;
  if (!g.missed) g.score++;
  g.q++;
  renderProgress();
  Sfx.correct();
  setMood($('#game-rabbit'), 'happy');
  confetti();
  Speech.say(praise);
  later(nextQuestion, wait);
}

// まちがえても×は出さない。正解をふくらませて見せ、タップしてもらう
function wrong(btn, answerBtn, hint) {
  game.missed = true;
  Sfx.oops();
  btn.classList.remove('wiggle');
  void btn.offsetWidth;
  btn.classList.add('wiggle', 'dim');
  answerBtn.classList.add('hint');
  Speech.say(hint);
}

// いろ：Lv1 は4色から2択、Lv2 は8色から3択
function askIro(g, stage) {
  const pool = g.level === 1 ? COLORS.slice(0, 4) : COLORS;
  const n = g.level === 1 ? 2 : 3;
  const target = pickOther(pool, g.last);
  g.last = target;
  const options = shuffle([target, ...sample(pool.filter((c) => c !== target), n - 1)]);
  stage.classList.add('stage-iro', `n${n}`);
  let answerBtn = null;
  options.forEach((c, i) => {
    const b = h('button', 'choice balloon', balloonSVG(c.hex));
    b.setAttribute('aria-label', c.name);
    b.style.setProperty('--bob-delay', `${i * -0.8}s`); // 風船ごとに揺れのタイミングをずらす
    if (c === target) answerBtn = b;
    b.addEventListener('click', () => {
      if (game !== g || g.locked) return;
      if (c === target) {
        b.classList.add('fly');
        correct(`やったね！ ${c.name}！`);
      } else {
        wrong(b, answerBtn, `おしいね。 ${target.name} は これ だよ`);
      }
    });
    stage.append(b);
  });
  ask(`${target.name} は どれかな？`);
}

function askKazu(g, stage) {
  const fruit = FRUITS[randInt(0, FRUITS.length - 1)];
  if (g.level === 1) askCount(g, stage, fruit);
  else askPick(g, stage, fruit);
}

// かず Lv1：1〜3個をタップして数え、「いくつ だった？」を2択で答える
function askCount(g, stage, fruit) {
  const n = pickOther([1, 2, 3], g.last);
  g.last = n;
  g.phase = 'count';
  stage.classList.add('stage-count');
  const tray = h('div', 'tray');
  const cards = h('div', 'cards');
  stage.append(tray, cards);
  let counted = 0;
  for (let i = 0; i < n; i++) {
    const b = h('button', 'choice fruit-btn', `${fruitSVG(fruit)}<span class="count-badge"></span>`);
    b.setAttribute('aria-label', fruit.name);
    b.addEventListener('click', () => {
      if (game !== g || g.phase !== 'count') return;
      const badge = b.querySelector('.count-badge');
      if (b.classList.contains('counted')) {
        b.classList.remove('counted');
        void b.offsetWidth;
        b.classList.add('counted');
        Speech.say(NUM_WORDS[+badge.textContent]);
        return;
      }
      counted++;
      b.classList.add('counted');
      badge.textContent = counted;
      Sfx.tap();
      Speech.say(NUM_WORDS[counted]);
      if (counted === n) {
        g.phase = 'wait';
        later(() => Speech.say(`ぜんぶで ${COUNT_WORDS[n]}！`), 700);
        later(() => showCountChoices(g, cards, fruit, n), 2300);
      }
    });
    tray.append(b);
  }
  if (g.q === 0) ask(`${fruit.name} を かぞえよう`, `${fruit.name} を かぞえて みよう。 タッチ してね`);
  else ask(`${fruit.name} を かぞえよう`);
}

function showCountChoices(g, box, fruit, n) {
  g.phase = 'choose';
  let answerBtn = null;
  for (const k of shuffle([n, pickOther([1, 2, 3], n)])) {
    const b = h('button', 'choice num-card', `<span class="num">${k}</span><span class="dots">${'<i></i>'.repeat(k)}</span>`);
    b.setAttribute('aria-label', COUNT_WORDS[k]);
    if (k === n) answerBtn = b;
    b.addEventListener('click', () => {
      if (game !== g || g.locked || g.phase !== 'choose') return;
      if (k === n) correct(`そう！ ${COUNT_WORDS[n]}！`);
      else wrong(b, answerBtn, `おしいね。 ${COUNT_WORDS[n]} は これ だよ`);
    });
    box.append(b);
  }
  box.classList.add('show');
  ask(`${fruit.name} は いくつ？`, `${fruit.name} は いくつ だった？`);
}

// かず Lv2：「みっつ は どれ？」を、数の違う3枚のおさらから選ぶ（1〜5）
function askPick(g, stage, fruit) {
  const all = [1, 2, 3, 4, 5];
  const t = pickOther(all, g.last);
  g.last = t;
  g.phase = 'choose';
  const options = shuffle([t, ...sample(all.filter((k) => k !== t), 2)]);
  stage.classList.add('stage-pick');
  let answerBtn = null;
  for (const k of options) {
    const b = h('button', 'choice plate', fruitSVG(fruit).repeat(k));
    b.setAttribute('aria-label', `${fruit.name} ${COUNT_WORDS[k]}`);
    if (k === t) answerBtn = b;
    b.addEventListener('click', () => {
      if (game !== g || g.locked) return;
      if (k === t) {
        // 正解したら、1つずつ数えながら弾ませる
        b.querySelectorAll('.fruit').forEach((f, i) => {
          f.style.animationDelay = `${0.2 + i * 0.42}s`;
          f.classList.add('pop');
        });
        correct(`${NUM_WORDS.slice(1, t + 1).join('、 ')}。 ${COUNT_WORDS[t]}！ やったね`, 2200 + t * 420);
      } else {
        wrong(b, answerBtn, `おしいね。 ${COUNT_WORDS[t]} は これ だよ`);
      }
    });
    stage.append(b);
  }
  ask(`${fruit.name} ${COUNT_WORDS[t]} は どれ？`, `${fruit.name} ${COUNT_WORDS[t]} は どれかな？`);
}

function finishRound() {
  const g = game;
  game = null;
  const s = Store.data;
  const now = new Date();
  today().rounds.push({
    game: g.id, level: g.level, correct: g.score, total: QUESTIONS_PER_ROUND,
    time: `${pad2(now.getHours())}:${pad2(now.getMinutes())}`,
  });
  s.streak[g.id] = g.score >= PASS_SCORE ? s.streak[g.id] + 1 : 0;
  let badge = '';
  if (s.streak[g.id] >= LEVEL_UP_STREAK) {
    s.streak[g.id] = 0;
    const firstClear = !s.milestones.some((m) => m.game === g.id && m.level === g.level);
    if (firstClear) s.milestones.push({ date: dateKey(), game: g.id, level: g.level });
    if (g.level < GAMES[g.id].maxLevel) {
      s.settings.level[g.id] = g.level + 1;
      badge = 'レベル アップ！';
    } else if (firstClear) {
      badge = 'クリア！';
    }
  }
  Store.save();
  showDone(g, badge);
}

function showDone(g, badge) {
  const over = pendingOver || remainingSec() <= 0;
  pendingOver = false;
  const perfect = g.score === QUESTIONS_PER_ROUND;
  $('#done-text').textContent = perfect ? 'ぜんぶ できたね！' : 'がんばったね！';
  $('#done-stars').innerHTML = STAR_SVG.repeat(g.score);
  $('#done-badge').textContent = badge;
  $('#done-badge').hidden = !badge;
  $('#done-buttons').hidden = over;
  show('done');
  doneAt = Date.now();
  setMood($('#done-rabbit'), 'happy');
  confetti(60);
  if (badge) Sfx.fanfare(); else Sfx.correct();
  let text = perfect ? 'ぜんぶ できたね！ すごい！' : 'がんばったね！';
  if (badge === 'レベル アップ！') text += ' レベル アップ だよ！';
  if (badge === 'クリア！') text += ' クリア だよ！';
  Speech.say(text);
}

// ---------- 保護者画面 ----------
let lockAnswer = 0;

function bindLongPress(btn, ms, fn) {
  let timer = null;
  const cancel = () => {
    btn.classList.remove('pressing');
    clearTimeout(timer);
    timer = null;
  };
  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    btn.classList.add('pressing');
    timer = setTimeout(() => { cancel(); fn(); }, ms);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((t) => btn.addEventListener(t, cancel));
}

function openLock() {
  const a = randInt(4, 9);
  const b = randInt(3, 9);
  lockAnswer = a + b;
  $('#lock-q').textContent = `${a} ＋ ${b} ＝ ？`;
  const opts = new Set([lockAnswer]);
  while (opts.size < 4) opts.add(lockAnswer + randInt(-4, 4));
  const box = $('#lock-opts');
  box.innerHTML = '';
  for (const v of shuffle([...opts])) {
    const btn = h('button', 'pbtn lock-opt');
    btn.textContent = v;
    btn.addEventListener('click', () => {
      $('#lock').hidden = true;
      if (v === lockAnswer) openParent();
    });
    box.append(btn);
  }
  $('#lock').hidden = false;
}

function openParent() {
  game = null;
  Speech.stop();
  Store.save();
  renderParent();
  show('parent');
}

function segmented(box, values, selected, label, onPick) {
  box.innerHTML = '';
  for (const v of values) {
    const b = h('button', `seg${v === selected ? ' on' : ''}`);
    b.textContent = label(v);
    b.addEventListener('click', () => onPick(v));
    box.append(b);
  }
}

function renderParent() {
  const s = Store.data;
  const d = today();
  $('#p-today').textContent = `${Math.floor(d.sec / 60)}分 ／ ${s.settings.dailyLimitMin + d.extraMin}分`;

  segmented($('#p-limit'), LIMIT_CHOICES, s.settings.dailyLimitMin, (v) => `${v}分`, (v) => {
    s.settings.dailyLimitMin = v;
    Store.save();
    renderParent();
  });

  for (const id of Object.keys(GAMES)) {
    const levels = Array.from({ length: GAMES[id].maxLevel }, (_, i) => i + 1);
    segmented($(`#p-level-${id}`), levels, s.settings.level[id], (v) => `レベル${v}`, (v) => {
      s.settings.level[id] = v;
      s.streak[id] = 0;
      Store.save();
      renderParent();
    });
    $(`#p-streak-${id}`).textContent = `合格の連続：${s.streak[id]}／${LEVEL_UP_STREAK} 回`;
  }

  const ul = $('#p-milestones');
  ul.innerHTML = '';
  const ms = s.milestones.slice().sort((a, b) => b.date.localeCompare(a.date));
  if (!ms.length) ul.append(h('li', 'empty', 'まだ ありません'));
  for (const m of ms) {
    const li = h('li');
    li.textContent = `${fmtDate(m.date)}　${GAMES[m.game].name} レベル${m.level} クリア`;
    ul.append(li);
  }

  const tbody = $('#p-history');
  tbody.innerHTML = '';
  const keys = Object.keys(s.days).sort().reverse().slice(0, 14);
  if (!keys.length) {
    const tr = h('tr');
    const td = h('td', 'empty');
    td.colSpan = 4;
    td.textContent = 'まだ ありません';
    tr.append(td);
    tbody.append(tr);
  }
  for (const k of keys) {
    const day = s.days[k];
    const tr = h('tr');
    const cells = [fmtDate(k), `${Math.floor(day.sec / 60)}分`];
    for (const id of Object.keys(GAMES)) {
      const rs = day.rounds.filter((r) => r.game === id);
      const total = rs.reduce((a, r) => a + r.total, 0);
      const ok = rs.reduce((a, r) => a + r.correct, 0);
      cells.push(rs.length ? `${rs.length}回 ${Math.round((ok / total) * 100)}%` : '—');
    }
    for (const c of cells) {
      const td = h('td');
      td.textContent = c;
      tr.append(td);
    }
    tbody.append(tr);
  }
  $('#p-version').textContent = APP_VERSION;
}

async function exportRecord() {
  const name = `pyoko-kiroku-${dateKey()}.json`;
  const json = JSON.stringify(Store.data, null, 2);
  const file = new File([json], name, { type: 'application/json' });
  // iPhone では共有シートから「ファイルに保存」できる
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file] }); } catch { /* 取り消したときは何もしない */ }
    return;
  }
  const url = URL.createObjectURL(file);
  const a = h('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function importRecord(input) {
  const file = input.files && input.files[0];
  input.value = '';
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    let parsed;
    try { parsed = JSON.parse(reader.result); } catch { parsed = null; }
    if (!parsed || typeof parsed !== 'object' || !parsed.days) {
      alert('記録のファイルとして読み込めませんでした。');
      return;
    }
    if (!confirm('いまの記録を、このファイルの内容で置きかえます。よろしいですか？')) return;
    Store.data = normalize(parsed);
    Store.save();
    renderParent();
  };
  reader.readAsText(file);
}

// ---------- はじめに ----------
function init() {
  Store.load();
  Speech.init();
  for (const el of document.querySelectorAll('.rabbit')) el.innerHTML = rabbitSVG();
  $('#pic-iro').innerHTML = [COLORS[0], COLORS[1], COLORS[2]].map((c) => balloonSVG(c.hex)).join('');
  $('#pic-kazu').innerHTML = fruitSVG(FRUITS[0]).repeat(3);

  $('#btn-start').addEventListener('click', () => {
    // iPhone では、最初の音はタップの中で鳴らす必要がある
    Sfx.unlock();
    if (remainingSec() <= 0) { goOver(); return; }
    Speech.say('ぴょこ だよ。 いっしょに あそぼう！');
    goHome(true);
    setMood($('#home-rabbit'), 'happy');
  });
  for (const b of document.querySelectorAll('.menu-btn')) {
    b.addEventListener('click', () => { Sfx.tap(); startGame(b.dataset.game); });
  }
  $('#home-rabbit').addEventListener('click', () => {
    setMood($('#home-rabbit'), 'happy');
    Speech.say('ぴょこ だよ！');
  });
  $('#game-rabbit').addEventListener('click', () => { if (game) Speech.say(game.speech); });
  $('#prompt').addEventListener('click', () => { if (game) Speech.say(game.speech); });
  $('#btn-back').addEventListener('click', () => goHome());
  $('#btn-again').addEventListener('click', () => startGame(lastGameId));
  $('#btn-home').addEventListener('click', () => goHome());

  for (const g of document.querySelectorAll('.gear')) bindLongPress(g, 2000, openLock);
  $('#lock-cancel').addEventListener('click', () => { $('#lock').hidden = true; });
  $('#p-extra').addEventListener('click', () => {
    today().extraMin += 5;
    warnedDate = '';
    Store.save();
    renderParent();
  });
  $('#p-export').addEventListener('click', exportRecord);
  $('#p-import').addEventListener('change', (e) => importRecord(e.target));
  $('#p-close').addEventListener('click', () => {
    if (remainingSec() > 0) goHome(true);
    else goOver();
  });

  // 拡大・長押しメニューを出さない
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('visibilitychange', () => { if (document.hidden) Store.save(); });

  setInterval(tick, 1000);

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

document.addEventListener('DOMContentLoaded', init);
