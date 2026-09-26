@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ============================================
echo   University_Net - локальный запуск
echo ============================================
echo.

where python >nul 2>nul
if errorlevel 1 (
    echo [ОШИБКА] Python не найден.
    echo Установите его с https://python.org/downloads
    echo При установке отметьте галочку "Add Python to PATH".
    pause
    exit /b 1
)

if not exist ".venv" (
    echo [1/3] Создаю виртуальное окружение...
    python -m venv .venv
)

echo [2/3] Устанавливаю зависимости...
call .venv\Scripts\activate.bat
python -m pip install -q --upgrade pip
python -m pip install -q -r requirements.txt

echo [3/3] Запускаю сервер...
echo.
echo   Сайт:  http://127.0.0.1:8000
echo   API:   http://127.0.0.1:8000/docs
echo.
echo   Остановить сервер: Ctrl+C
echo.
start "" http://127.0.0.1:8000
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload

pause
