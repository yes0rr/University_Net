@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ============================================
echo   University_Net - запуск чат-бота для MAX
echo ============================================
echo.

rem --- Ищем рабочий Python: сначала лаунчер py, потом python ---
py -3 --version >nul 2>nul
if %errorlevel%==0 goto :found_py

python --version >nul 2>nul
if %errorlevel%==0 goto :found_python

echo [ОШИБКА] Python не найден.
echo.
echo Скачайте его с https://www.python.org/downloads/
echo и на первом экране установщика отметьте галочку
echo "Add python.exe to PATH".
echo.
echo Если Python уже стоит, но не находится - закройте это окно,
echo откройте PowerShell заново и проверьте команду:  py --version
echo.
pause
exit /b 1

:found_py
py -3 "tools\run_bot.py"
goto :finish

:found_python
python "tools\run_bot.py"
goto :finish

:finish
echo.
echo Работа скрипта завершена. Это окно можно закрыть.
pause
