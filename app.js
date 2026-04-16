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

function buildPuzzleId(puzzleIndex, playerCount, selectedIndices) {
  const pos = String(puzzleIndex + 1).padStart(4, '0');
  const players = String(playerCount);
  const indices = (selectedIndices || []).map(i => String(i + 1).padStart(3, '0')).join('');
  return pos + players + indices;
}

function renderPuzzle(json, id) {
  current = json;
  createClueButtons(json.options || []);
  document.getElementById('btn-reveal').disabled = false;
  document.getElementById('answer').textContent = '';
  document.getElementById('answer').setAttribute('aria-hidden', 'true');
  const idEl = document.getElementById('puzzle-id');
  if (idEl) {
    idEl.textContent = id || '';
    idEl.dataset.id = id || '';
  }
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
  // 找到所有可用题目的索引
  const eligibleIdx = puzzles.map((p, idx) => ({ p, idx })).filter(x => (x.p.options || []).length >= count).map(x => x.idx);
  if (eligibleIdx.length === 0) return null;
  const pickIdx = eligibleIdx[Math.floor(Math.random() * eligibleIdx.length)];
  const puzzle = puzzles[pickIdx];
  const n = puzzle.options.length;
  // 随机选择若干选项的索引
  const idxs = Array.from({ length: n }, (_, i) => i).sort(() => Math.random() - 0.5).slice(0, count);
  const options = idxs.map(i => puzzle.options[i]);
  return { answer: puzzle.answer, options, puzzleIndex: pickIdx, selectedIndices: idxs };
}

// ── 题目 / 谜底 ──────────────────────────────────────────
async function generate() {
  const count = getClueCount(selectedPlayers);
  const puzzles = await loadPuzzles();
  const picked = pickPuzzle(puzzles, count);
  if (!picked) return;
  const id = buildPuzzleId(picked.puzzleIndex, selectedPlayers, picked.selectedIndices || []);
  renderPuzzle(picked, id);
}

async function loadGameById() {
  const input = document.getElementById('input-id');
  const errorEl = document.getElementById('id-error');
  const id = (input && input.value || '').trim();
  if (errorEl) { errorEl.classList.add('hidden'); errorEl.textContent = ''; }
  if (!id) return;
  // 格式：pos(4)+players(1)+indices(each 3)
  const pos = parseInt(id.slice(0, 4), 10);
  const playerCount = parseInt(id.slice(4, 5), 10);
  if (Number.isNaN(pos) || Number.isNaN(playerCount)) {
    if (errorEl) { errorEl.textContent = '编号格式无效'; errorEl.classList.remove('hidden'); }
    return;
  }
  const count = getClueCount(playerCount);
  const rest = id.slice(5);
  if (rest.length < count * 3) {
    if (errorEl) { errorEl.textContent = '编号长度与玩家数不匹配'; errorEl.classList.remove('hidden'); }
    return;
  }
  const indices = [];
  for (let i = 0; i < count; i++) {
    const seg = rest.slice(i * 3, i * 3 + 3);
    const idx = parseInt(seg, 10);
    if (Number.isNaN(idx)) {
      if (errorEl) { errorEl.textContent = '编号包含非法段'; errorEl.classList.remove('hidden'); }
      return;
    }
    indices.push(idx - 1);
  }

  const puzzles = await loadPuzzles();
  const puzzleIndex = pos - 1;
  if (!puzzles[puzzleIndex]) {
    if (errorEl) { errorEl.textContent = '未找到对应题目'; errorEl.classList.remove('hidden'); }
    return;
  }
  const puzzle = puzzles[puzzleIndex];
  // 构造选项
  const options = (indices || []).map(i => puzzle.options[i]).filter(Boolean);
  if (options.length !== count) {
    if (errorEl) { errorEl.textContent = '题目选项索引越界或无效'; errorEl.classList.remove('hidden'); }
    return;
  }

  selectedPlayers = playerCount;
  scores.fill(0);
  document.getElementById('start-screen').classList.add('hidden');
  document.getElementById('player-screen').classList.add('hidden');
  document.getElementById('game-screen').classList.remove('hidden');
  createScoreCards(getClueCount(playerCount));
  renderPuzzle({ answer: puzzle.answer, options }, id);
  if (input) input.value = '';
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

document.getElementById('puzzle-id').addEventListener && document.getElementById('puzzle-id').addEventListener('click', () => {
  const el = document.getElementById('puzzle-id');
  const text = el && el.dataset && el.dataset.id;
  if (!text) return;
  navigator.clipboard && navigator.clipboard.writeText(text).then(() => {
    el.textContent = '已复制';
    el.classList.add('copied');
    setTimeout(() => {
      el.textContent = text;
      el.classList.remove('copied');
    }, 1500);
  }).catch(() => {});
});

document.getElementById('btn-start').addEventListener('click', () => {
  document.getElementById('start-screen').classList.add('hidden');
  document.getElementById('player-screen').classList.remove('hidden');
});

document.getElementById('btn-back').addEventListener('click', () => {
  document.getElementById('player-screen').classList.add('hidden');
  document.getElementById('start-screen').classList.remove('hidden');
});

document.getElementById('btn-home') && document.getElementById('btn-home').addEventListener('click', () => {
  document.getElementById('game-screen').classList.add('hidden');
  document.getElementById('start-screen').classList.remove('hidden');
});

document.getElementById('btn-load-id') && document.getElementById('btn-load-id').addEventListener('click', loadGameById);
document.getElementById('input-id') && document.getElementById('input-id').addEventListener('keydown', e => { if (e.key === 'Enter') loadGameById(); });

// ── 初始化 ───────────────────────────────────────────────
buildPlayerButtons();
