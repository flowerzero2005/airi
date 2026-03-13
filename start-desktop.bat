@echo off
chcp 65001 >nul
echo ========================================
echo AIRI 桌面版启动器
echo ========================================
echo.
echo 正在启动 AIRI 桌面版...
echo.

cd /d "%~dp0"

REM 检查 node_modules 是否存在
if not exist "node_modules" (
    echo [错误] 未找到 node_modules 目录
    echo 请先运行: pnpm install
    echo.
    pause
    exit /b 1
)

REM 启动开发服务器
pnpm run dev:tamagotchi

pause
