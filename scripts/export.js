#!/usr/bin/env node
/**
 * 导出 Skill：将 puzzles.json 导出为 xlsx 和 txt，方便人工审核噪音
 *
 * 用法：node scripts/export.js
 * 输出：data/puzzles.xlsx、data/puzzles.txt
 */

const fs   = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const PUZZLES_PATH = path.join(__dirname, '../data/puzzles.json');
const XLSX_PATH    = path.join(__dirname, '../data/puzzles.xlsx');
const TXT_PATH     = path.join(__dirname, '../data/puzzles.txt');

function main() {
  const puzzles = JSON.parse(fs.readFileSync(PUZZLES_PATH, 'utf8'));
  console.log(`读取题库：${puzzles.length} 道题`);

  const maxOptions = Math.max(...puzzles.map(p => p.options.length));
  console.log(`最大候选数：${maxOptions}`);

  // ── xlsx ──────────────────────────────────────────────────
  const header = ['谜底', '标签', '候选数'];
  for (let i = 1; i <= maxOptions; i++) header.push(`词${i}`);

  const rows = puzzles.map(p => {
    const row = [p.answer, p.tag || '—', p.options.length];
    const words = p.words || p.options.map(o => `(${o})`);
    for (let i = 0; i < maxOptions; i++) row.push(words[i] || '');
    return row;
  });

  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);

  // 列宽
  ws['!cols'] = [
    { wch: 4 },   // 谜底
    { wch: 8 },   // 标签
    { wch: 6 },   // 候选数
    ...Array(maxOptions).fill({ wch: 8 }),
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '题库');
  XLSX.writeFile(wb, XLSX_PATH);
  console.log(`xlsx 已写入：${XLSX_PATH}`);

  // ── txt ───────────────────────────────────────────────────
  // 格式：谜底\t标签\t候选数\t词1 词2 词3 ...
  const lines = puzzles.map(p => {
    const words = p.words || p.options.map(o => `(${o})`);
    return `${p.answer}\t${(p.tag || '—').padEnd(6)}\t${String(p.options.length).padEnd(4)}\t${words.join(' ')}`;
  });

  fs.writeFileSync(TXT_PATH, lines.join('\n') + '\n', 'utf8');
  console.log(`txt 已写入：${TXT_PATH}`);

  // ── 标签统计 ─────────────────────────────────────────────
  const tagCount = {};
  for (const p of puzzles) {
    const t = p.tag || '无标签';
    tagCount[t] = (tagCount[t] || 0) + 1;
  }
  console.log('\n标签分布：');
  for (const [tag, n] of Object.entries(tagCount).sort()) {
    console.log(`  ${tag}：${n} 道`);
  }
}

main();
