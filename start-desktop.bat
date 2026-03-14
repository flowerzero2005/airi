@echo off
chcp 65001 >nul
echo ========================================
echo AIRI 桌面版启动器
echo ========================================
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

echo 正在检查端口占用...
echo.

REM 清理端口 5173
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173" ^| findstr "LISTENING"') do (
    echo 终止占用端口 5173 的进程 (PID: %%a)
    taskkill /F /PID %%a >nul 2>&1
)

REM 清理端口 6121
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":6121" ^| findstr "LISTENING"') do (
    echo 终止占用端口 6121 的进程 (PID: %%a)
    taskkill /F /PID %%a >nul 2>&1
)

timeout /t 1 /nobreak >nul

echo 端口检查完成
echo.
echo 正在启动 AIRI 桌面版...
echo.

REM 启动开发服务器
pnpm run dev:tamagotchi

pause
