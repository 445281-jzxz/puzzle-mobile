@echo off
chcp 65001 > nul
:: 双击此文件即可启动游戏（Windows）
:: 确保已安装 Node.js：https://nodejs.org

:: 切换到脚本所在目录
cd /d "%~dp0"

:: 检查 Node.js 是否存在
where node > nul 2>&1
if %errorlevel% neq 0 (
    echo 未找到 Node.js，请先安装：https://nodejs.org
    pause
    exit /b 1
)

:: 后台启动服务器
echo 启动服务器...
start /b node server.js

:: 等待服务器就绪后打开浏览器
timeout /t 2 /nobreak > nul
start http://localhost:3000

echo 游戏已在浏览器中打开：http://localhost:3000
echo 关闭此窗口将停止服务器
pause
