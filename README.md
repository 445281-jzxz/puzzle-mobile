# 猜字解底

快速启动：

```bash
cd /Users/a/skill/puzzle
npm install
npm start
# 打开 http://localhost:3000
```

功能：
- `换一题`：从后端随机抽取一组数据（不展示谜面与谜底）
- 支持 2–8 人游戏，每位玩家对应一个颜色按钮：点击查看单个谜面，再次点击可隐藏
- `揭示谜底`：显示谜底

后端在 `server.js` 中读取 `data/puzzles.json`；格式为 `{ answer: 谜底汉字, options: [提示字×8] }`，可替换为数据库查询并返回相同 JSON 格式。
