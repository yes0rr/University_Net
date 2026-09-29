"""
Чат-бот для мессенджера MAX — каркас для хакатона.

Что делает:
  /start  → приветствие и кнопка, открывающая мини-приложение прямо в чате
  /help   → что умеет бот
  любой другой текст → короткая подсказка

Как запустить:
  1. pip install -r requirements.txt
  2. скопировать .env.example в .env и вписать токен
  3. python bot.py
  4. написать боту в MAX — он ответит

Документация MAX Bot API: https://dev.max.ru/docs-api
"""

import os
import time
import logging
import tempfile

import requests
import certifi
from dotenv import load_dotenv

load_dotenv()

# Логирование настраиваем до всего остального: сообщения об ошибках должны
# работать даже если что-то не найдено на этапе загрузки.
logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(message)s")
log = logging.getLogger("max-bot")


# ─────────────────────────────────────────────────────────────────────────────
# Сертификат Минцифры.
#
# Домен platform-api2.max.ru защищён сертификатом Russian Trusted Root CA, а он
# не входит в стандартный набор, с которым работает Python. Без него соединение
# падает с SSLError("unable to get local issuer certificate") — даже если
# сертификат установлен в Windows, потому что requests использует свой набор.
#
# Поэтому сертификат лежит рядом с ботом (bot/certs/) и подмешивается к
# стандартному набору certifi. Так работает одинаково на Windows, Linux и в
# Docker — ничего доустанавливать в систему не нужно.
# ─────────────────────────────────────────────────────────────────────────────

CERT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "certs")
RU_CA = os.path.join(CERT_DIR, "russian_trusted_root_ca.crt")


def build_ca_bundle():
    """certifi + корневой сертификат Минцифры → путь к общему файлу."""
    if not os.path.exists(RU_CA):
        log.warning("Нет файла %s — работаю на стандартных сертификатах", RU_CA)
        return True

    bundle = os.path.join(tempfile.gettempdir(), "max_ca_bundle.pem")
    try:
        with open(bundle, "w", encoding="utf-8") as out:
            with open(certifi.where(), encoding="utf-8") as f:
                out.write(f.read())
            out.write("\n")
            with open(RU_CA, encoding="utf-8") as f:
                out.write(f.read())
        return bundle
    except OSError as e:
        log.error("Не удалось собрать набор сертификатов: %s", e)
        return True


VERIFY = build_ca_bundle()

API = "https://platform-api2.max.ru"          # старый platform-api.max.ru устарел
TOKEN = os.environ.get("MAX_BOT_TOKEN", "")
BOT_NAME = os.environ.get("MAX_BOT_NAME", "")  # username бота, например t401_hakaton_max_bot

# Публичный адрес мини-приложения (боевой стенд).
# Используется кнопкой-ссылкой — она открывает приложение в MAX сразу,
# не дожидаясь привязки URL к боту на платформе MAX для партнёров.
MINI_APP_URL = os.environ.get("MINI_APP_URL", "https://45-153-69-132.sslip.io")

if not TOKEN:
    raise SystemExit("Нет токена. Создайте файл .env со строкой MAX_BOT_TOKEN=...")

HEADERS = {"Authorization": TOKEN}             # токен только в заголовке


# ── Отправка сообщений ───────────────────────────────────────────────────────

def send(chat_id: int, text: str, buttons=None) -> dict:
    """Отправить сообщение в чат. buttons — список рядов inline-клавиатуры."""
    body = {"text": text}
    if buttons:
        body["attachments"] = [{
            "type": "inline_keyboard",
            "payload": {"buttons": buttons},
        }]

    for attempt in range(3):
        try:
            r = requests.post(f"{API}/messages", headers=HEADERS,
                              params={"chat_id": chat_id}, json=body, timeout=15,
                              verify=VERIFY)

            if r.status_code == 429:          # превышен лимит запросов
                log.warning("429 — лимит запросов, пауза 2 с")
                time.sleep(2)
                continue

            r.raise_for_status()
            return r.json()

        except requests.RequestException as e:
            log.error("Не удалось отправить сообщение (попытка %d): %s", attempt + 1, e)
            time.sleep(1)

    return {}


# ── Клавиатура ───────────────────────────────────────────────────────────────
# Два способа открыть приложение:
#   link      — кнопка-ссылка на публичный адрес стенда. Работает уже сейчас
#               и в мобильном приложении MAX, и в веб-версии, и в браузере.
#   open_app  — нативная кнопка мини-приложения. Поле web_app принимает
#               публичное имя бота, к которому привязано мини-приложение.
#               Включается после того, как URL привязан к боту (t401).

def main_keyboard():
    rows = []

    if MINI_APP_URL:
        rows.append([{"type": "link", "text": "Подобрать вуз",
                      "url": MINI_APP_URL}])

    if BOT_NAME:
        rows.append([{"type": "open_app", "text": "Открыть в MAX",
                      "web_app": BOT_NAME}])

    rows.append([{"type": "callback", "text": "Что умеет бот", "payload": "about"}])
    return rows


TEXT_START = (
    "Привет! Это бот подбора вузов Томска.\n\n"
    "Нажмите «Подобрать вуз» — откроется приложение, где можно выбрать "
    "направление и узнать проходные баллы.\n\n"
    "Команды: /start — начать заново, /help — справка."
)

TEXT_ABOUT = (
    "Бот помогает абитуриенту выбрать вуз:\n\n"
    "• 6 вузов Томска\n"
    "• 81 направление подготовки\n"
    "• проходные баллы ЕГЭ и отметка «проходит / не хватает»\n\n"
    "Данные подготовлены на основе открытой выгрузки и используются "
    "в демонстрационных целях."
)

TEXT_HELP = (
    "Доступные команды:\n"
    "/start — приветствие и кнопка запуска приложения\n"
    "/help — эта справка\n\n"
    "Нажмите «Подобрать вуз», чтобы открыть мини-приложение."
)


# ── Обработка событий ────────────────────────────────────────────────────────

def handle_update(u: dict):
    kind = u.get("update_type")

    if kind == "message_created":
        msg = u.get("message") or {}
        chat_id = (msg.get("recipient") or {}).get("chat_id")
        text = ((msg.get("body") or {}).get("text") or "").strip().lower()
        if not chat_id:
            return

        if text.startswith("/start"):
            send(chat_id, TEXT_START, main_keyboard())
        elif text.startswith("/help"):
            send(chat_id, TEXT_HELP, main_keyboard())
        else:
            send(chat_id, "Не понял. Нажмите кнопку ниже или введите /help.",
                 main_keyboard())

    elif kind == "bot_started":
        chat_id = u.get("chat_id")
        if chat_id:
            send(chat_id, TEXT_START, main_keyboard())

    elif kind == "message_callback":
        cb = u.get("callback") or {}
        chat_id = (cb.get("message") or {}).get("recipient", {}).get("chat_id")
        payload = cb.get("payload")
        callback_id = cb.get("callback_id")

        # Убрать «часики» с нажатой кнопки
        if callback_id:
            try:
                requests.post(f"{API}/answers", headers=HEADERS,
                              json={"callback_id": callback_id}, timeout=10,
                              verify=VERIFY)
            except requests.RequestException as e:
                log.error("Не удалось ответить на callback: %s", e)

        if chat_id:
            send(chat_id, TEXT_ABOUT if payload == "about" else "Готово.",
                 main_keyboard())


# ── Основной цикл (Long Polling) ─────────────────────────────────────────────
# Long Polling подходит для разработки. Для рабочей версии нужен Webhook —
# они не могут работать одновременно.

def check_token() -> bool:
    """Проверяет токен запросом /me. Возвращает True, если он рабочий."""
    try:
        r = requests.get(f"{API}/me", headers=HEADERS, timeout=15, verify=VERIFY)
    except requests.RequestException as e:
        log.error("Не удалось связаться с MAX API: %s", e)
        log.error("Проверьте интернет и файл bot/certs/russian_trusted_root_ca.crt")
        return False

    if r.status_code == 401:
        log.error("Токен неверный или недействителен (HTTP 401).")
        log.error("Скопируйте токен заново: business.max.ru → Чат-боты → "
                  "ваш бот → Настройки")
        return False
    if r.status_code != 200:
        log.error("MAX API ответил кодом %s: %s", r.status_code, r.text[:200])
        return False

    me = r.json()
    log.info("Токен рабочий. Бот: %s (@%s, id %s)",
             me.get("name"), me.get("username"), me.get("user_id"))
    return True


def main():
    log.info("Домен API: %s", API)
    if not check_token():
        raise SystemExit("Запуск отменён — токен не прошёл проверку.")

    if MINI_APP_URL:
        log.info("Адрес приложения для кнопки-ссылки: %s", MINI_APP_URL)
    else:
        log.warning("MINI_APP_URL не задан — кнопка «Подобрать вуз» не появится")

    if not BOT_NAME:
        log.warning("MAX_BOT_NAME не задан — кнопка «Открыть в MAX» не появится")

    log.info("Слушаю сообщения. Напишите боту в MAX. Остановить: Ctrl+C")

    marker = None
    while True:
        params = {"timeout": 30, "limit": 100}
        if marker:
            params["marker"] = marker

        try:
            r = requests.get(f"{API}/updates", headers=HEADERS,
                             params=params, timeout=40, verify=VERIFY)
            if r.status_code == 429:
                time.sleep(2)
                continue
            r.raise_for_status()
            data = r.json()
        except requests.RequestException as e:
            log.error("Ошибка опроса /updates: %s", e)
            time.sleep(3)
            continue
        except ValueError:
            log.error("Ответ не в формате JSON, пропускаю")
            time.sleep(2)
            continue

        marker = data.get("marker") or marker
        for update in data.get("updates") or []:
            try:
                handle_update(update)
            except Exception as e:                      # noqa: BLE001
                log.exception("Ошибка обработки события: %s", e)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        log.info("Бот остановлен (Ctrl+C)")
