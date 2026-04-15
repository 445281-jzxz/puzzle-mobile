#!/usr/bin/env node
/**
 * 校验 Skill：验证 puzzle 中每个 option 与 answer 是否构成真实词语
 *
 * 用法：
 *   cat data/puzzles.json | node scripts/validate.js
 *   node scripts/generate.js 心 | node scripts/validate.js
 *   node scripts/validate.js < candidates.json > validated.json
 *
 * 词表：data/wordlist.txt，每行一个词（支持"词 频率"格式，取第一列）
 * 推荐词表：https://github.com/fxsjy/jieba 中的 dict.txt
 *
 * 输出：
 *   stdout — 通过校验的 puzzle JSON 数组（可直接追加进题库）
 *   stderr — 校验过程日志
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const WORDLIST_PATH = path.join(__dirname, '../data/wordlist.txt');
const MIN_OPTIONS = 6; // 有效 option 少于此数则整道题丢弃

// 词表过滤规则（与 wordlist.txt 的 jieba dict 格式对应）
const MIN_FREQ = 300;
const EXCLUDE_POS    = new Set(['j', 'm', 'q', 'f', 'c', 'r', 'y', 'p', 's']);
const TRAILING_FUNC  = new Set(['有','于','着','了','过','给','到','为']);
const AMBIGUOUS_PREFIX = new Set(['不','没','非','无','很','太','最','更','越','又','已','一']);

function loadWordList(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const words = new Set();
  for (const line of content.split('\n')) {
    const parts = line.trim().split(/\s+/);
    const word = parts[0];
    const freq = parseInt(parts[1]);
    const pos  = parts[2];
    if (!word || word.length < 2) continue;
    if (freq < MIN_FREQ) continue;               // 低频词排除
    if (/^n[a-z]+/.test(pos)) continue;          // 专名变体排除：ns/nr/nz/nt/nrt 等
    if (EXCLUDE_POS.has(pos)) continue;           // 功能词/量词/数词排除
    words.add(word);
  }
  return words;
}

function validatePuzzle(puzzle, wordSet) {
  const { answer, options } = puzzle;
  const validOptions = [];
  const rejectedOptions = [];

  for (const opt of options) {
    const forward = answer + opt; // 谜底在前
    const backward = opt + answer; // 谜底在后
    if (wordSet.has(forward) || wordSet.has(backward)) {
      validOptions.push(opt);
    } else {
      rejectedOptions.push(`${forward}/${backward}`);
    }
  }

  if (rejectedOptions.length > 0) {
    process.stderr.write(
      `  ${answer} 剔除无效组合：${rejectedOptions.join('、')}\n`
    );
  }

  return { ...puzzle, options: validOptions };
}

function readStdin() {
  return new Promise((resolve, reject) => {
    let input = '';
    const rl = readline.createInterface({ input: process.stdin });
    rl.on('line', line => { input += line + '\n'; });
    rl.on('close', () => resolve(input));
    rl.on('error', reject);
  });
}

async function main() {
  if (!fs.existsSync(WORDLIST_PATH)) {
    process.stderr.write(`词表文件不存在：${WORDLIST_PATH}\n`);
    process.stderr.write('请下载词表（如 jieba dict.txt）并放置于 data/wordlist.txt\n');
    process.exit(1);
  }

  const wordSet = loadWordList(WORDLIST_PATH);
  process.stderr.write(`词表加载完成，共 ${wordSet.size} 条\n`);

  const input = await readStdin();
  const puzzles = JSON.parse(input);
  const arr = Array.isArray(puzzles) ? puzzles : [puzzles];

  const passed = [];
  let dropped = 0;

  for (const puzzle of arr) {
    process.stderr.write(`校验 "${puzzle.answer}"...\n`);
    const validated = validatePuzzle(puzzle, wordSet);

    if (validated.options.length >= MIN_OPTIONS) {
      // 校验通过后裁剪到8个
      passed.push({ ...validated, options: validated.options.slice(0, 8) });
      process.stderr.write(`  ✓ 通过，有效 ${validated.options.length} 个\n`);
    } else {
      dropped++;
      process.stderr.write(
        `  ✗ 丢弃：有效 option 仅 ${validated.options.length} 个（要求 ≥${MIN_OPTIONS}）\n`
      );
    }
  }

  process.stderr.write(`\n校验完成：${passed.length} 道通过，${dropped} 道丢弃\n`);
  process.stdout.write(JSON.stringify(passed, null, 2) + '\n');
}

main().catch(err => {
  process.stderr.write(`错误: ${err.message}\n`);
  process.exit(1);
});
