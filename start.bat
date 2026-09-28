@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ============================================
echo   University_Net - локальный запуск
echo ============================================
echo.

rem --- Ищем рабочий Python: сначала лаунчер py, потом python ---
set "PY="
where py >nul 2>nul && set "PY=py -3"
if not defined PY (
    where python >nul 2>nul && set "PY=python"
)

if not defined PY (
    echo [ОШИБКА] Python не найден.
    echo.
    echo Установите его с https://www.python.org/downloads/
    echo ВАЖНО: на первом экране установщика отметьте галочку
    echo         "Add python.exe to PATH", иначе команды не заработают.
    echo.
    pause
    exit /b 1
)

echo Найден Python:
%PY% --version
if errorlevel 1 (
    echo.
    echo [ОШИБКА] Команда %PY% не работает.
    echo Возможно, установлена только заглушка из Microsoft Store.
    echo Скачайте установщик с https://www.python.org/downloads/ и отметьте
    echo галочку "Add python.exe to PATH".
    echo.
    pause
    exit /b 1
)
echo.

rem --- Виртуальное окружение ---
if not exist ".venv\Scripts\python.exe" (
    echo [1/3] Создаю виртуальное окружение...
    %PY% -m venv .venv
    if errorlevel 1 (
        echo.
        echo [ОШИБКА] Не удалось создать окружение .venv
        pause
        exit /b 1
    )
) else (
    echo [1/3] Виртуальное окружение уже есть.
)

echo [2/3] Устанавливаю зависимости...
call ".venv\Scripts\activate.bat"
python -m pip install -q --upgrade pip
python -m pip install -q -r requirements.txt
if errorlevel 1 (
    echo.
    echo [ОШИБКА] Не удалось установить зависимости. Проверьте интернет.
    pause
    exit /b 1
)

echo [3/3] Запускаю сервер...
echo.
echo   Сайт:  http://127.0.0.1:8000
echo   API:   http://127.0.0.1:8000/docs
echo.
echo   Остановить сервер: Ctrl+C
echo   Это окно не закрывайте, пока сайт нужен.
echo.
start "" http://127.0.0.1:8000
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload

pause
