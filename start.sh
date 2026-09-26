#!/usr/bin/env bash
# Локальный запуск University_Net (macOS / Linux)
set -e
cd "$(dirname "$0")"

command -v python3 >/dev/null || { echo "[ОШИБКА] Python 3 не найден"; exit 1; }

[ -d .venv ] || python3 -m venv .venv
source .venv/bin/activate
pip install -q --upgrade pip
pip install -q -r requirements.txt

echo "Сайт: http://127.0.0.1:8000   (остановить: Ctrl+C)"
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
