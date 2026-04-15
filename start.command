#!/bin/bash
# 双击此文件即可启动游戏（Mac）
# 确保已安装 Node.js：https://nodejs.org

# 切换到脚本所在目录（无论从哪里双击都能找到项目文件）
cd "$(dirname "$0")"

# 检查 Node.js 是否存在（Homebrew 安装的 node 在 /opt/homebrew/bin）
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

if ! command -v node &> /dev/null; then
  echo "❌ 未找到 Node.js，请先安装：https://nodejs.org"
  read -p "按 Enter 退出..."
  exit 1
fi

# 启动服务器（后台运行）
echo "启动服务器..."
node server.js &
SERVER_PID=$!

# 等待服务器就绪后打开浏览器
sleep 1.5
open http://localhost:3000

echo "游戏已在浏览器中打开：http://localhost:3000"
echo "关闭此窗口将停止服务器"

# 保持脚本运行（服务器随之运行）
wait $SERVER_PID
