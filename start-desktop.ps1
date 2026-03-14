# AIRI Desktop Launcher
# PowerShell script to start AIRI desktop application

$Host.UI.RawUI.WindowTitle = "AIRI Desktop Launcher"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "AIRI 桌面版启动器" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get script directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

Write-Host "正在检查环境..." -ForegroundColor Yellow

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "[错误] 未找到 node_modules 目录" -ForegroundColor Red
    Write-Host "请先运行: pnpm install" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "按任意键退出"
    exit 1
}

# Check if pnpm is installed
try {
    $pnpmVersion = pnpm --version 2>$null
    Write-Host "✓ pnpm 版本: $pnpmVersion" -ForegroundColor Green
} catch {
    Write-Host "[错误] 未找到 pnpm" -ForegroundColor Red
    Write-Host "请先安装 pnpm: npm install -g pnpm" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "按任意键退出"
    exit 1
}

Write-Host ""
Write-Host "正在检查端口占用..." -ForegroundColor Yellow

# Function to kill process by port
function Kill-ProcessByPort {
    param([int]$Port)

    $connections = netstat -ano | Select-String ":$Port\s" | Select-String "LISTENING"
    if ($connections) {
        foreach ($conn in $connections) {
            $pid = ($conn -split '\s+')[-1]
            if ($pid -and $pid -match '^\d+$') {
                try {
                    $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
                    if ($process) {
                        Write-Host "  终止占用端口 $Port 的进程: $($process.ProcessName) (PID: $pid)" -ForegroundColor Yellow
                        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                        Start-Sleep -Milliseconds 500
                    }
                } catch {
                    # Ignore errors
                }
            }
        }
    }
}

# Clean up ports 5173 and 6121
Kill-ProcessByPort 5173
Kill-ProcessByPort 6121

Write-Host "✓ 端口检查完成" -ForegroundColor Green
Write-Host ""
Write-Host "正在启动 AIRI 桌面版..." -ForegroundColor Green
Write-Host ""

# Start the desktop application
pnpm run dev:tamagotchi

Write-Host ""
Read-Host "按任意键退出"
