#!/usr/bin/env node
/**
 * 生成 Skill（词典模式）：从本地词表查找目标字的所有有效组合，多样性采样后输出 puzzle
 *
 * 用法：
 *   node scripts/generate.js 心 明 水          # 输出到 stdout（JSON）
 *   node scripts/generate.js 心 明 --save      # 合并写入 data/puzzles.json
 *   node scripts/generate.js --batch --save    # 批量生成所有符合条件的字并写入
 */

const fs   = require('fs');
const path = require('path');

const WORDLIST_PATH = path.join(__dirname, '../data/wordlist.txt');
const PUZZLES_PATH  = path.join(__dirname, '../data/puzzles.json');

// ── 过滤规则（与 validate.js 保持一致） ──────────────────────
const MIN_FREQ         = 300;
const EXCLUDE_POS      = new Set(['j','m','q','f','c','r','y','p','s']);
const TRAILING_FUNC    = new Set(['有','于','着','了','过','给','到','为']);
const AMBIGUOUS_PREFIX = new Set(['不','没','非','无','很','太','最','更','越','又','已','一']);

const MIN_OPTIONS = 4;  // 最少 option 数（对应 3 人场景）

// 人数 → 提示数（与 app.js 保持一致）
const CLUE_COUNT = { 3:4, 4:5, 5:5, 6:6, 7:7, 8:8 };

// option 数 → 适用人数标签
function getTag(count) {
  if (count >= 8) return '3-8人';
  if (count >= 7) return '3-7人';
  if (count >= 6) return '3-6人';
  if (count >= 5) return '3-5人';
  return '3人';
}

// ── 词表加载 ──────────────────────────────────────────────────
function loadWordList(filePath) {
  const words = [];
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const parts = line.trim().split(/\s+/);
    const word = parts[0], freq = parseInt(parts[1]), pos = parts[2];
    if (!word || word.length !== 2) continue;
    if (!/^[\u4e00-\u9fff]{2}$/.test(word)) continue;
    if (freq < MIN_FREQ) continue;
    if (/^n[a-z]+/.test(pos)) continue;
    if (EXCLUDE_POS.has(pos)) continue;
    if (word[0] === word[1]) continue;
    if (TRAILING_FUNC.has(word[1])) continue;
    words.push({ word, freq });
  }
  return words;
}

// ── 生成单道题 ────────────────────────────────────────────────
function generatePuzzle(char, allWords) {
  const forward  = [];  // 答案在前：char+X
  const backward = [];  // 答案在后：X+char

  for (const { word, freq } of allWords) {
    if (word[0] === char && word[1] !== char) {
      const other = word[1];
      if (!AMBIGUOUS_PREFIX.has(other))
        forward.push({ freq, other, fullWord: char + other });
    } else if (word[1] === char && word[0] !== char) {
      const other = word[0];
      if (!AMBIGUOUS_PREFIX.has(other))
        backward.push({ freq, other, fullWord: other + char });
    }
  }

  process.stderr.write(`  前置 ${forward.length} 个，后置 ${backward.length} 个\n`);

  // 各方向按词频排序（高频词优先），确保质量好的排在前面
  const fSorted = [...forward].sort((a, b) => b.freq - a.freq);
  const bSorted = [...backward].sort((a, b) => b.freq - a.freq);

  // 前置和后置交替排列，确保任意切片都兼顾两个方向
  const interleaved = [];
  const maxLen = Math.max(fSorted.length, bSorted.length);
  for (let i = 0; i < maxLen; i++) {
    if (i < fSorted.length) interleaved.push(fSorted[i]);
    if (i < bSorted.length) interleaved.push(bSorted[i]);
  }

  // 去重，全量存储（不截断），供服务端随机采样提高局间多样性
  const seen = new Set();
  const options = [], words = [];
  for (const { other, fullWord } of interleaved) {
    if (!seen.has(other)) {
      seen.add(other);
      options.push(other);
      words.push(fullWord);
    }
  }

  if (options.length < MIN_OPTIONS) {
    process.stderr.write(`  ⚠ 有效选项不足（${options.length} 个），跳过\n`);
    return null;
  }

  const tag = getTag(options.length);
  return { answer: char, tag, options, words };
}

// ── 批量模式：找出词表中所有符合条件的字 ─────────────────────
function findEligibleChars(allWords) {
  const charCount = new Map();
  for (const { word } of allWords) {
    for (let i = 0; i < 2; i++) {
      const ch = word[i], other = word[1 - i];
      if (AMBIGUOUS_PREFIX.has(other)) continue;
      charCount.set(ch, (charCount.get(ch) || 0) + 1);
    }
  }
  return [...charCount.entries()]
    .filter(([, n]) => n >= MIN_OPTIONS)
    .map(([ch]) => ch);
}

// ── 主流程 ───────────────────────────────────────────────────
function main() {
  const args  = process.argv.slice(2);
  const save  = args.includes('--save');
  const batch = args.includes('--batch');
  let   chars = args.filter(a => !a.startsWith('--'));

  process.stderr.write('加载词表...\n');
  const allWords = loadWordList(WORDLIST_PATH);
  process.stderr.write(`词表加载完成，共 ${allWords.length} 条\n\n`);

  if (batch) {
    chars = findEligibleChars(allWords);
    process.stderr.write(`批量模式：找到 ${chars.length} 个候选字\n\n`);
  } else if (chars.length === 0) {
    process.stderr.write('用法: node scripts/generate.js 心 明 水 [--save] [--batch]\n');
    process.exit(1);
  }

  const results = [];
  for (const char of chars) {
    process.stderr.write(`生成 "${char}":\n`);
    const puzzle = generatePuzzle(char, allWords);
    if (puzzle) {
      results.push(puzzle);
      process.stderr.write(`  ✓ [${puzzle.tag}] ${puzzle.words.join(' ')}\n`);
    }
    process.stderr.write('\n');
  }

  if (save) {
    const existing = JSON.parse(fs.readFileSync(PUZZLES_PATH, 'utf8'));
    const resultMap = new Map(results.map(p => [p.answer, p]));
    // 覆盖已存在的条目，追加新条目
    const merged = existing.map(p => resultMap.has(p.answer) ? resultMap.get(p.answer) : p);
    const existingAnswers = new Set(existing.map(p => p.answer));
    for (const p of results) if (!existingAnswers.has(p.answer)) merged.push(p);
    fs.writeFileSync(PUZZLES_PATH, JSON.stringify(merged, null, 2) + '\n');
    const overwritten = results.filter(p => existingAnswers.has(p.answer)).length;
    const added = results.length - overwritten;
    process.stderr.write(`已写入 puzzles.json：覆盖 ${overwritten} 道，新增 ${added} 道\n`);
  } else {
    process.stdout.write(JSON.stringify(results, null, 2) + '\n');
  }
}

main();
