"""
Чат-бот для мессенджера MAX — подбор вуза по баллам ЕГЭ.

Что делает:
  /start    → приветствие и меню
  /help     → справка
  /cities   → панель с четырьмя городами, по которым есть данные
  /scores   → подбор по баллам, пять шагов

Подбор по баллам — один путь, пять шагов:

    1. город          — четыре кнопки: Москва, Санкт-Петербург, Казань, Томск
    2. уровень        — бакалавриат или специалитет
    3. направление    — список со страницами по 8 кнопок
    4. форма обучения — бюджет или платное
    5. сумма баллов   — пользователь пишет её сам

    Результат: проходные баллы этого направления по вузам города,
    отметка «хватает / не хватает N» и запас по баллам.

Кнопки меню:
  «Подобрать по баллам» — описанный выше диалог;
  «Города и данные»     — панель с четырьмя городами и сводкой по каждому;
  «Подобрать вуз»       — ссылка на мини-приложение с картой и подробным
                          подбором по предметам ЕГЭ;
  «Что умеет бот»       — короткая справка.

Как запустить:
  1. pip install -r requirements.txt
  2. скопировать .env.example в .env и вписать токен
  3. python bot.py
  4. написать боту в MAX — он ответит

Данные бот читает из папки data/ теми же правилами, что и сайт
(см. bot/vuzdata.py). Магистратура в подбор не попадает.

Документация MAX Bot API: https://dev.max.ru/docs-api
"""

import os
import time
import logging
import tempfile

import requests
import certifi
from dotenv import load_dotenv

import admission as texts
import vuzdata

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

# Состояние диалога: chat_id → что ждём от пользователя.
# Живёт в памяти процесса: перезапуск бота сбрасывает диалоги, для хакатона
# этого достаточно (базы данных в проекте нет сознательно).
STATE = {}

EMPTY_STATE = {
    "step": None,     # None | "city" | "level" | "program" | "form" | "score"
    "city": None,
    "level": None,
    "code": None,     # код выбранного направления
    "form": None,     # "budget" | "paid"
    "total": None,    # сумма баллов пользователя
    "page": 0,        # страница списка направлений
}


def state_of(chat_id: int) -> dict:
    return STATE.setdefault(chat_id, dict(EMPTY_STATE))


def reset_state(chat_id: int) -> dict:
    STATE[chat_id] = dict(EMPTY_STATE)
    return STATE[chat_id]


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


def answer_callback(callback_id: str):
    """Убрать «часики» с нажатой кнопки."""
    if not callback_id:
        return
    try:
        requests.post(f"{API}/answers", headers=HEADERS,
                      json={"callback_id": callback_id}, timeout=10,
                      verify=VERIFY)
    except requests.RequestException as e:
        log.error("Не удалось ответить на callback: %s", e)


# ── Клавиатуры ───────────────────────────────────────────────────────────────
# Два способа открыть приложение:
#   link      — кнопка-ссылка на публичный адрес стенда. Работает уже сейчас
#               и в мобильном приложении MAX, и в веб-версии, и в браузере.
#   open_app  — нативная кнопка мини-приложения. Поле web_app принимает
#               публичное имя бота, к которому привязано мини-приложение.
#               Включается после того, как URL привязан к боту (t401).

def callback(text: str, payload: str) -> dict:
    return {"type": "callback", "text": text, "payload": payload}


def main_keyboard():
    rows = [
        [callback("Подобрать по баллам", "scores"),
         callback("Города и данные", "cities")],
    ]

    if MINI_APP_URL:
        rows.append([{"type": "link", "text": "Подобрать вуз",
                      "url": MINI_APP_URL}])

    if BOT_NAME:
        rows.append([{"type": "open_app", "text": "Открыть в MAX",
                      "web_app": BOT_NAME}])

    rows.append([callback("Что умеет бот", "about")])
    return rows


def cities_keyboard(action: str, extra_rows=None):
    """Панель с четырьмя городами.

    action — «pick» (выбор города для подбора по баллам)
             или «city» (посмотреть, что есть по городу).
    """
    rows, row = [], []
    for name in vuzdata.CITIES:
        row.append(callback(name, f"{action}:{name}"))
        if len(row) == 2:
            rows.append(row)
            row = []
    if row:
        rows.append(row)

    if extra_rows:
        rows.extend(extra_rows)
    return rows


def level_keyboard():
    return [
        [callback("Бакалавриат", "lvl:Бакалавриат"),
         callback("Специалитет", "lvl:Специалитет")],
        [callback("← Другой город", "scores")],
        [callback("В начало", "home")],
    ]


def program_keyboard(model: dict, level: str, page: int, pages: int):
    """Страница списка направлений: кнопки по две в ряд плюс навигация."""
    programs = vuzdata.programs_sorted(model, level)
    start = page * texts.PAGE_SIZE
    chunk = programs[start:start + texts.PAGE_SIZE]

    rows, row = [], []
    for program in chunk:
        row.append(callback(texts.button_label(program), f"prg:{program['code']}"))
        if len(row) == 2:
            rows.append(row)
            row = []
    if row:
        rows.append(row)

    if pages > 1:
        nav = []
        if page > 0:
            nav.append(callback("← Назад", f"page:{page - 1}"))
        if page < pages - 1:
            nav.append(callback("Ещё →", f"page:{page + 1}"))
        if nav:
            rows.append(nav)

    rows.append([callback("← Другой уровень", "back:level"),
                 callback("В начало", "home")])
    return rows


def form_keyboard():
    return [
        [callback("Бюджет", "form:budget"),
         callback("Платное", "form:paid")],
        [callback("← Другое направление", "back:program")],
        [callback("В начало", "home")],
    ]


def score_keyboard():
    return [
        [callback("← Другая форма", "back:form")],
        [callback("В начало", "home")],
    ]


def result_keyboard(form: str):
    other = "paid" if form == "budget" else "budget"
    other_title = vuzdata.FORMS[other]["title"]
    rows = [[callback(f"Показать {other_title}", f"form:{other}")],
            [callback("Другое направление", "back:program"),
             callback("В начало", "home")]]
    if MINI_APP_URL:
        rows.insert(0, [{"type": "link", "text": "Подробнее в приложении",
                         "url": MINI_APP_URL}])
    return rows


# ── Ответы диалога ───────────────────────────────────────────────────────────

def show_city_panel(chat_id: int, st: dict):
    st["step"] = None
    send(chat_id, texts.TEXT_CITY_PANEL,
         cities_keyboard("city", extra_rows=[[callback("В начало", "home")]]))


def show_city_overview(chat_id: int, city: str, st: dict):
    """Что есть по городу: вузы, направления по уровням."""
    if city not in vuzdata.CITY_REGISTRY:
        send(chat_id, f"По городу {city} данных нет. Доступны: "
                      f"{', '.join(vuzdata.CITIES)}.", main_keyboard())
        return

    model = load_or_report(chat_id, city)
    if model is None:
        return

    st["step"] = None
    overview = vuzdata.city_overview(model)
    rows = [[callback("Подобрать по баллам", "scores")],
            [callback("← Другой город", "cities")],
            [callback("В начало", "home")]]
    send(chat_id, texts.text_city_overview(model, overview), rows)


def load_or_report(chat_id: int, city: str):
    """Читает данные города. Если не получилось — объясняет и возвращает None."""
    try:
        return vuzdata.load_city(city)
    except (OSError, ValueError) as e:
        log.exception("Не удалось прочитать данные города %s: %s", city, e)
        send(chat_id, "Не получилось прочитать данные. Попробуйте позже.",
             main_keyboard())
        return None


def ask_city(chat_id: int, st: dict):
    st["step"] = "city"
    send(chat_id, texts.TEXT_ASK_CITY,
         cities_keyboard("pick", extra_rows=[[callback("В начало", "home")]]))


def ask_level(chat_id: int, city: str, st: dict):
    st["step"] = "level"
    st["city"] = city
    st["level"] = None
    st["code"] = None
    st["form"] = None
    st["total"] = None      # у нового города и сумма баллов вводится заново
    st["page"] = 0
    send(chat_id, texts.TEXT_STEP_LEVEL.format(city=city), level_keyboard())


def show_programs(chat_id: int, st: dict, page: int = 0):
    """Шаг 3: список направлений выбранного уровня, по 8 на страницу."""
    model = load_or_report(chat_id, st["city"])
    if model is None:
        return

    level = st["level"]
    programs = vuzdata.programs_sorted(model, level)
    pages = texts.pages_count(model, level, programs)
    page = max(0, min(page, pages - 1))

    st["step"] = "program"
    st["page"] = page

    send(chat_id, texts.text_program_pick(model, level, page, len(programs), pages),
         program_keyboard(model, level, page, pages))


def ask_form(chat_id: int, st: dict):
    model = load_or_report(chat_id, st["city"])
    if model is None:
        return

    program = vuzdata.program_by_code(model, st["code"])
    if program is None:
        send(chat_id, texts.text_program_missing(st["code"]), main_keyboard())
        return

    st["step"] = "form"
    st["form"] = None
    send(chat_id, texts.text_ask_form(program, st["level"]), form_keyboard())


def ask_score(chat_id: int, st: dict):
    model = load_or_report(chat_id, st["city"])
    if model is None:
        return

    program = vuzdata.program_by_code(model, st["code"])
    st["step"] = "score"
    send(chat_id, texts.text_ask_score(program, st["form"]), score_keyboard())


def show_results(chat_id: int, st: dict):
    """Итог: проходные баллы выбранного направления по вузам города."""
    model = load_or_report(chat_id, st["city"])
    if model is None:
        return

    program = vuzdata.program_by_code(model, st["code"])
    if program is None:
        send(chat_id, texts.text_program_missing(st["code"]), main_keyboard())
        return

    result = vuzdata.rank_program(model, program, st["form"], st["total"])
    st["step"] = None
    send(chat_id, texts.text_program_result(model, program, st["form"],
                                            st["total"], result),
         result_keyboard(st["form"]))


# ── Обработка событий ────────────────────────────────────────────────────────

def handle_text(chat_id: int, text: str):
    st = state_of(chat_id)
    lowered = text.lower()

    # Команды работают всегда, независимо от шага диалога
    if lowered.startswith("/start"):
        reset_state(chat_id)
        send(chat_id, texts.TEXT_START, main_keyboard())
        return

    if lowered.startswith("/help"):
        send(chat_id, texts.TEXT_HELP, main_keyboard())
        return

    if lowered.startswith("/cities"):
        show_city_panel(chat_id, st)
        return

    if lowered.startswith("/scores"):
        ask_city(chat_id, st)
        return

    if lowered.startswith("/cancel"):
        reset_state(chat_id)
        send(chat_id, texts.TEXT_CANCELLED, main_keyboard())
        return

    # Шаг 5: пользователь вводит сумму баллов
    if st["step"] == "score":
        total, error = vuzdata.parse_score(text)
        if error:
            send(chat_id, error, score_keyboard())
            return
        st["total"] = total
        log.info("Чат %s: %s · %s · %s · %s → %d баллов",
                 chat_id, st["city"], st["level"], st["code"], st["form"], total)
        show_results(chat_id, st)
        return

    send(chat_id, texts.TEXT_UNKNOWN, main_keyboard())


def handle_callback(chat_id: int, payload: str, callback_id: str):
    answer_callback(callback_id)
    st = state_of(chat_id)

    if payload == "about":
        send(chat_id, texts.TEXT_ABOUT, main_keyboard())
        return

    if payload == "home":
        reset_state(chat_id)
        send(chat_id, texts.TEXT_START, main_keyboard())
        return

    if payload == "cities":
        show_city_panel(chat_id, st)
        return

    if payload == "scores":
        ask_city(chat_id, st)
        return

    # Города: «city:Москва» — сводка, «pick:Москва» — шаг 2 подбора
    if payload.startswith("city:"):
        show_city_overview(chat_id, payload.split(":", 1)[1], st)
        return

    if payload.startswith("pick:"):
        city = payload.split(":", 1)[1]
        if city not in vuzdata.CITY_REGISTRY:
            send(chat_id, f"По городу {city} данных нет. Доступны: "
                          f"{', '.join(vuzdata.CITIES)}.", main_keyboard())
            return
        ask_level(chat_id, city, st)
        return

    if payload.startswith("lvl:"):
        level = payload.split(":", 1)[1]
        if level not in vuzdata.EGE_LEVELS or not st["city"]:
            ask_city(chat_id, st)
            return
        st["level"] = level
        st["code"] = None
        st["page"] = 0
        show_programs(chat_id, st, 0)
        return

    if payload.startswith("page:"):
        if not st["city"] or not st["level"]:
            ask_city(chat_id, st)
            return
        try:
            page = int(payload.split(":", 1)[1])
        except ValueError:
            page = 0
        show_programs(chat_id, st, page)
        return

    if payload.startswith("prg:"):
        code = payload.split(":", 1)[1]
        if not st["city"] or not st["level"]:
            ask_city(chat_id, st)
            return
        model = load_or_report(chat_id, st["city"])
        if model is None:
            return
        if vuzdata.program_by_code(model, code) is None:
            send(chat_id, texts.text_program_missing(code), main_keyboard())
            return
        st["code"] = code
        st["total"] = None   # выбрали другое направление — сумму вводим заново
        ask_form(chat_id, st)
        return

    if payload.startswith("form:"):
        form = payload.split(":", 1)[1]
        if form not in vuzdata.FORMS or not st["city"] or not st["code"]:
            ask_city(chat_id, st)
            return
        st["form"] = form
        # Если сумму уже вводили — сразу пересчитываем по другой форме
        if st["total"] is not None:
            show_results(chat_id, st)
        else:
            ask_score(chat_id, st)
        return

    if payload == "back:level":
        if st["city"]:
            level_keyboard_call(chat_id, st)
        else:
            ask_city(chat_id, st)
        return

    if payload == "back:program":
        if st["city"] and st["level"]:
            show_programs(chat_id, st, st.get("page") or 0)
        elif st["city"]:
            level_keyboard_call(chat_id, st)
        else:
            ask_city(chat_id, st)
        return

    if payload == "back:form":
        if st["code"]:
            ask_form(chat_id, st)
        else:
            ask_city(chat_id, st)
        return

    send(chat_id, texts.TEXT_UNKNOWN, main_keyboard())


def level_keyboard_call(chat_id: int, st: dict):
    """Повторно показать выбор уровня для уже выбранного города."""
    ask_level(chat_id, st["city"], st)


def handle_update(u: dict):
    kind = u.get("update_type")

    if kind == "message_created":
        msg = u.get("message") or {}
        chat_id = (msg.get("recipient") or {}).get("chat_id")
        text = ((msg.get("body") or {}).get("text") or "").strip()
        if not chat_id:
            return
        handle_text(chat_id, text)

    elif kind in ("bot_started", "bot_added"):
        chat_id = u.get("chat_id")
        if chat_id:
            reset_state(chat_id)
            send(chat_id, texts.TEXT_START, main_keyboard())

    elif kind == "message_callback":
        cb = u.get("callback") or {}
        chat_id = ((cb.get("message") or {}).get("recipient") or {}).get("chat_id")
        if not chat_id:
            return
        handle_callback(chat_id, cb.get("payload") or "", cb.get("callback_id"))


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


def log_data():
    """Пишем в лог, что данные найдены и сколько их — это первое, что смотрят."""
    try:
        folder = vuzdata.data_dir()
    except FileNotFoundError as e:
        log.error("ДАННЫЕ НЕ НАЙДЕНЫ: %s", e)
        log.error("Подбор по баллам работать не будет. В Docker нужен "
                  "COPY data/ /app/data/ в deploy/Dockerfile.bot")
        return

    log.info("Данные: %s", folder)
    for city in vuzdata.CITIES:
        try:
            model = vuzdata.load_city(city)
        except (OSError, ValueError) as e:
            log.error("  %s — не читается: %s", city, e)
            continue
        log.info("  %s: %d вузов, %d направлений (%s)",
                 city, len(model["universities"]), len(model["programs"]),
                 ", ".join(model["levels"]))


def main():
    log.info("Домен API: %s", API)
    if not check_token():
        raise SystemExit("Запуск отменён — токен не прошёл проверку.")

    log_data()

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
