let current = null;
let selectedPlayers = 6;
const scores = new Array(8).fill(0);
const colors = ['c1','c2','c3','c4','c5','c6','c7','c8'];

// 玩家人数 → 提示数量
const CLUE_COUNT = { 3: 4, 4: 5, 5: 5, 6: 6, 7: 7, 8: 8 };

function getClueCount(players) {
  return CLUE_COUNT[players] ?? players;
}

// 提示数量 → 网格列数
function getGridCols(count) {
  if (count <= 4) return 2;
  if (count <= 6) return 3;
  return 4;
}

// ── 选人界面 ─────────────────────────────────────────────
function buildPlayerButtons() {
  const grid = document.getElementById('player-grid');
  for (let p = 3; p <= 8; p++) {
    const count = getClueCount(p);
    const btn = document.createElement('button');
    btn.className = 'player-btn';

    const numEl = document.createElement('span');
    numEl.className = 'player-num';
    numEl.textContent = `${p} 人`;

    const dotsEl = document.createElement('div');
    dotsEl.className = 'player-dots';
    for (let d = 0; d < count; d++) {
      const dot = document.createElement('span');
      dot.className = `player-dot ${colors[d]}`;
      dotsEl.appendChild(dot);
    }

    const hintEl = document.createElement('span');
    hintEl.className = 'player-hint';
    hintEl.textContent = `${count} 个提示`;

    btn.appendChild(numEl);
    btn.appendChild(dotsEl);
    btn.appendChild(hintEl);
    btn.addEventListener('click', () => startGame(p));
    grid.appendChild(btn);
  }
}

function startGame(players) {
  selectedPlayers = players;
  scores.fill(0);
  const count = getClueCount(players);
  document.getElementById('player-screen').classList.add('hidden');
  document.getElementById('game-screen').classList.remove('hidden');
  createScoreCards(count);
  generate();
}

// ── 提示区 ───────────────────────────────────────────────
function createClueButtons(words) {
  const container = document.getElementById('clues');
  container.style.gridTemplateColumns = `repeat(${getGridCols(words.length)}, 1fr)`;
  container.innerHTML = '';
  words.forEach((w, i) => {
    const btn = document.createElement('button');
    btn.className = `clue-btn ${colors[i]}`;
    btn.dataset.word = w;
    btn.dataset.shown = 'false';
    btn.textContent = '查看';
    btn.addEventListener('click', () => toggleClue(btn));
    container.appendChild(btn);
  });
}

function toggleClue(btn) {
  const shown = btn.dataset.shown === 'true';
  if (shown) {
    btn.textContent = '查看';
    btn.dataset.shown = 'false';
  } else {
    btn.textContent = btn.dataset.word;
    btn.dataset.shown = 'true';
  }
}

// ── 计分区 ───────────────────────────────────────────────
function createScoreCards(count) {
  const container = document.getElementById('scores');
  container.style.gridTemplateColumns = `repeat(${getGridCols(count)}, 1fr)`;
  container.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const card = document.createElement('div');
    card.className = `score-card ${colors[i]}`;

    const row = document.createElement('div');
    row.className = 'score-row';

    [-3, -1].forEach(delta => {
      const sb = document.createElement('button');
      sb.className = 'score-btn';
      sb.textContent = String(delta);
      sb.addEventListener('click', () => updateScore(i, delta));
      row.appendChild(sb);
    });

    const display = document.createElement('span');
    display.className = 'score-display';
    display.id = `score-${i}`;
    display.textContent = scores[i];
    display.title = '点击手动输入';
    display.addEventListener('click', () => startManualEdit(i, display));
    row.appendChild(display);

    [1, 3].forEach(delta => {
      const sb = document.createElement('button');
      sb.className = 'score-btn';
      sb.textContent = `+${delta}`;
      sb.addEventListener('click', () => updateScore(i, delta));
      row.appendChild(sb);
    });

    card.appendChild(row);
    container.appendChild(card);
  }
}

function updateScore(index, delta) {
  scores[index] += delta;
  const el = document.getElementById(`score-${index}`);
  if (el) el.textContent = scores[index];
}

function startManualEdit(index, display) {
  const input = document.createElement('input');
  input.type = 'number';
  input.className = 'score-input';
  input.value = scores[index];

  function commit() {
    const val = parseInt(input.value, 10);
    if (!isNaN(val)) scores[index] = val;
    display.textContent = scores[index];
    input.replaceWith(display);
  }

  input.addEventListener('blur', commit);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') input.blur();
    if (e.key === 'Escape') input.replaceWith(display);
  });

  display.replaceWith(input);
  input.select();
  input.focus();
}

// ── 题库（客户端直接加载，无需后端） ────────────────────────
let _puzzles = null;
async function loadPuzzles() {
  if (_puzzles) return _puzzles;
  const res = await fetch('./data/puzzles.json');
  _puzzles = await res.json();
  return _puzzles;
}

function pickPuzzle(puzzles, count) {
  // 筛选候选数足够的题目
  const eligible = puzzles.filter(p => p.options.length >= count);
  if (eligible.length === 0) return null;
  // 随机选一道
  const puzzle = eligible[Math.floor(Math.random() * eligible.length)];
  // 打乱后取前 count 个
  const shuffled = [...puzzle.options].sort(() => Math.random() - 0.5);
  return { answer: puzzle.answer, options: shuffled.slice(0, count) };
}

// ── 题目 / 谜底 ──────────────────────────────────────────
async function generate() {
  const count = getClueCount(selectedPlayers);
  const puzzles = await loadPuzzles();
  current = pickPuzzle(puzzles, count);
  if (!current) return;
  createClueButtons(current.options);
  document.getElementById('btn-reveal').disabled = false;
  document.getElementById('answer').textContent = '';
  document.getElementById('answer').setAttribute('aria-hidden', 'true');
}

function revealAnswer() {
  if (!current) return;
  const el = document.getElementById('answer');
  el.textContent = current.answer;
  el.setAttribute('aria-hidden', 'false');
}

// ── 事件绑定 ─────────────────────────────────────────────
document.getElementById('btn-generate').addEventListener('click', generate);
document.getElementById('btn-reveal').addEventListener('click', revealAnswer);

document.getElementById('btn-start').addEventListener('click', () => {
  document.getElementById('start-screen').classList.add('hidden');
  document.getElementById('player-screen').classList.remove('hidden');
});

document.getElementById('btn-back').addEventListener('click', () => {
  document.getElementById('player-screen').classList.add('hidden');
  document.getElementById('start-screen').classList.remove('hidden');
});

// ── 初始化 ───────────────────────────────────────────────
buildPlayerButtons();
