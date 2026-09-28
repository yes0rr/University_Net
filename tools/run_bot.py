"""
Подготовка и запуск чат-бота для MAX.

Вызывается из start_bot.bat. Вся логика здесь, а не в bat-файле, потому что
в bat легко наступить на разбор круглых скобок и кавычек — эта ошибка уже
случалась.

Что делает по шагам:
  1. создаёт bot/.env из шаблона, если файла нет;
  2. проверяет, вписан ли в него настоящий токен (а не заглушка);
  3. если токена нет — открывает блокнот и ждёт, пока его закроют;
  4. ставит зависимости бота;
  5. запускает bot.py.
"""

import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BOT_DIR = ROOT / "bot"
ENV_FILE = BOT_DIR / ".env"
ENV_EXAMPLE = BOT_DIR / ".env.example"
REQS = BOT_DIR / "requirements.txt"
BOT_PY = BOT_DIR / "bot.py"

PLACEHOLDERS = {"вставьте_сюда_токен", "", "your_token", "token"}
MIN_TOKEN_LEN = 20          # у настоящего токена длина заметно больше


def line(text=""):
    print(text, flush=True)


def read_token():
    """Возвращает значение MAX_BOT_TOKEN из bot/.env или None."""
    if not ENV_FILE.exists():
        return None
    try:
        text = ENV_FILE.read_text(encoding="utf-8", errors="replace")
    except OSError as e:
        line(f"[!] Не удалось прочитать {ENV_FILE}: {e}")
        return None

    for raw in text.splitlines():
        s = raw.strip()
        if s.startswith("MAX_BOT_TOKEN="):
            return s.split("=", 1)[1].strip()
    return None


def token_is_ready(tok):
    return bool(tok) and tok not in PLACEHOLDERS and len(tok) >= MIN_TOKEN_LEN


def open_notepad_and_wait():
    """Открывает блокнот и ждёт закрытия файла."""
    if os.name != "nt":
        line(f"[i] Откройте файл вручную: {ENV_FILE}")
        return
    try:
        subprocess.run(["notepad.exe", str(ENV_FILE)], check=False)
    except OSError as e:
        line(f"[!] Не удалось открыть блокнот: {e}")
        line(f"[i] Откройте файл вручную: {ENV_FILE}")


def ensure_dependencies():
    """Ставит зависимости бота, если их нет."""
    try:
        import requests  # noqa: F401
        import certifi   # noqa: F401
        import dotenv    # noqa: F401
    except ImportError:
        pass
    else:
        line("[2/3] Зависимости бота уже установлены.")
        return True

    line("[2/3] Устанавливаю зависимости бота (полминуты)...")
    try:
        r = subprocess.run(
            [sys.executable, "-m", "pip", "install", "-q", "-r", str(REQS)],
            capture_output=True, text=True,
        )
    except OSError as e:
        line(f"[ОШИБКА] Не удалось запустить pip: {e}")
        return False

    if r.returncode != 0:
        line("[ОШИБКА] Не удалось установить зависимости.")
        line((r.stderr or r.stdout or "").strip()[-500:])
        return False
    return True


def main():
    line("=" * 52)
    line("  University_Net — подготовка чат-бота для MAX")
    line("=" * 52)
    line()

    if not BOT_DIR.exists():
        line(f"[ОШИБКА] Нет папки {BOT_DIR}")
        line("Распакуйте архив заново — папка bot должна быть в корне проекта.")
        return 1

    # ── Шаг 1. Файл с настройками ────────────────────────────────────────────
    if not ENV_FILE.exists():
        if not ENV_EXAMPLE.exists():
            line(f"[ОШИБКА] Нет ни {ENV_FILE}, ни {ENV_EXAMPLE}")
            return 1
        ENV_FILE.write_bytes(ENV_EXAMPLE.read_bytes())
        line("[1/3] Создан файл bot\\.env из шаблона.")
    else:
        line("[1/3] Файл bot\\.env уже есть.")

    # ── Шаг 2. Токен ─────────────────────────────────────────────────────────
    if not token_is_ready(read_token()):
        line()
        line("=" * 62)
        line("  СЕЙЧАС ОТКРОЕТСЯ БЛОКНОТ. Что нужно сделать:")
        line()
        line("   1. Найдите строку      MAX_BOT_TOKEN=")
        line("   2. Сотрите то, что стоит после знака равно")
        line("   3. Вставьте свой токен и нажмите Ctrl+V")
        line("   4. Сохраните файл: Ctrl+S")
        line("   5. Закройте блокнот — запуск продолжится сам")
        line()
        line("  Где взять токен: business.max.ru -> Чат-боты ->")
        line("  ваш бот -> троеточие -> Настройки -> значок копирования")
        line("=" * 62)
        line()
        open_notepad_and_wait()
        line()

        if not token_is_ready(read_token()):
            line("[ОШИБКА] В файле bot\\.env так и нет токена.")
            line(f"Откройте {ENV_FILE} и впишите его после MAX_BOT_TOKEN=")
            return 1
        line("[i] Токен записан.")

    # ── Шаг 3. Зависимости и запуск ──────────────────────────────────────────
    if not ensure_dependencies():
        return 1

    line("[3/3] Запускаю бота...")
    line()
    line("   Остановить бота: Ctrl+C")
    line("   Это окно не закрывайте, пока бот нужен.")
    line()

    try:
        r = subprocess.run([sys.executable, str(BOT_PY)])
        return r.returncode
    except OSError as e:
        line(f"[ОШИБКА] Не удалось запустить бота: {e}")
        return 1
    except KeyboardInterrupt:
        line()
        line("Бот остановлен.")
        return 0


if __name__ == "__main__":
    sys.exit(main())
