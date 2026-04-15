// 本地开发用静态文件服务器，部署到 GitHub Pages 时不需要此文件
const express = require('express');
const path    = require('path');
const app     = express();
const PORT    = process.env.PORT || 3001;

app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`本地预览：http://localhost:${PORT}`);
});
