@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ============================================
echo   University_Net - публичная ссылка (туннель)
echo ============================================
echo.

rem --- Обход проблем с DNS: используем сервер Cloudflare напрямую
rem     и транспорт HTTP/2 вместо QUIC (по UDP он часто блокируется).
set "TUNNEL_DNS_RESOLVER_ADDRS=1.1.1.1:53"
set "TUNNEL_TRANSPORT_PROTOCOL=http2"
set "LOG=%TEMP%\cf_tunnel.log"
del "%LOG%" 2>nul

rem --- Ищем cloudflared: сначала в PATH, потом рядом с этим файлом ---
set "CF="
where cloudflared >nul 2>nul && set "CF=cloudflared"
if not defined CF if exist "%~dp0cloudflared.exe" set "CF=%~dp0cloudflared.exe"

if not defined CF (
    echo [ОШИБКА] cloudflared не найден.
    echo.
    echo Скачайте файл:
    echo   https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe
    echo Положите его рядом с этим файлом и переименуйте в cloudflared.exe
    echo.
    echo Либо установите MSI - тогда cloudflared попадёт в PATH:
    echo   https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.msi
    echo.
    pause
    exit /b 1
)

rem --- Проверяем, что локальный сервер вообще запущен ---
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:8000/' -TimeoutSec 3 -UseBasicParsing; exit 0 } catch { exit 1 }"
if errorlevel 1 (
    echo [ОШИБКА] Сервер на 127.0.0.1:8000 не отвечает.
    echo.
    echo Сначала запустите сервер: двойной клик по start.bat
    echo Дождитесь строки "Uvicorn running on http://127.0.0.1:8000"
    echo и только потом запускайте этот файл.
    echo.
    pause
    exit /b 1
)

echo Запускаю туннель к http://127.0.0.1:8000 ...
start "cloudflared" /min "%CF%" tunnel --url http://127.0.0.1:8000 --logfile "%LOG%"

echo Жду ссылку (обычно 3-10 секунд)...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$log='%LOG%'; for($i=0;$i -lt 75;$i++){ Start-Sleep -Milliseconds 800; if(Test-Path $log){ $m=[regex]::Match((Get-Content $log -Raw -ErrorAction SilentlyContinue),'https://[a-z0-9-]+\.trycloudflare\.com'); if($m.Success){ $u=$m.Value; Set-Clipboard -Value $u; Write-Host ''; Write-Host '  ВАША ССЫЛКА (скопирована в буфер обмена):' -ForegroundColor Yellow; Write-Host ('  '+$u) -ForegroundColor Green; Write-Host ''; Write-Host '  Открывается с любого устройства и из любой сети.'; exit 0 } } }; Write-Host 'Ссылку получить не удалось. Смотрите окно cloudflared в панели задач.' -ForegroundColor Red"

echo.
echo Туннель работает, пока открыто окно cloudflared (свёрнуто в панель задач).
echo Остановить: закройте окно cloudflared.
echo.
pause
