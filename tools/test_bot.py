"""
Автотест бота University_Net — без сети и без токена.

Что проверяется:
  1) разбор data/*.json в Python даёт те же числа, что видит сайт
     (четыре города, 31 вуз, 360 направлений, магистратуры нет);
  2) список направлений уровня: сортировка, страницы, подписи кнопок;
  3) подбор по конкретному направлению — на реальных данных Казани;
  4) тексты ответов собираются без ошибок и укладываются в лимиты MAX;
  5) диалог проходит весь путь: город → уровень → направление → форма →
     сумма баллов → результат, включая листание страниц и переключение формы.

Запуск:
    python tools/test_bot.py

Сеть не нужна: функции отправки сообщений подменяются заглушкой, поэтому
тест можно гонять до деплоя и без токена.
"""

import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BOT = os.path.join(ROOT, "bot")
sys.path.insert(0, BOT)

# Токен боту нужен только для запуска long polling, для импорта не нужен —
# но подстрахуемся, если проверка появится при импорте.
os.environ.setdefault("MAX_BOT_TOKEN", "test-token")

import vuzdata        # noqa: E402
import admission      # noqa: E402

passed = 0
failed = 0


def check(name, ok, detail=""):
    global passed, failed
    if ok:
        passed += 1
        print(f"  ✅ {name}")
    else:
        failed += 1
        print(f"  ❌ {name}" + (f" → {detail}" if detail else ""))


def section(title):
    print(f"\n=== {title} ===")


# ─────────────────────────────────────────────────────────────────────────────
section("1. Данные: те же файлы, что читает сайт")

check("папка data найдена", os.path.isfile(
    os.path.join(vuzdata.data_dir(), "spec_napr.json")), vuzdata.data_dir())
check("в реестре ровно четыре города",
      vuzdata.CITIES == ("Москва", "Санкт-Петербург", "Казань", "Томск"),
      ", ".join(vuzdata.CITIES))
check("уровни — только бакалавриат и специалитет",
      vuzdata.EGE_LEVELS == ("Бакалавриат", "Специалитет"),
      ", ".join(vuzdata.EGE_LEVELS))

expected = {
    "Москва": (13, 87),
    "Санкт-Петербург": (6, 88),
    "Казань": (6, 103),
    "Томск": (6, 82),
}
total_unis = total_programs = 0
for city, (unis, programs) in expected.items():
    model = vuzdata.load_city(city)
    total_unis += len(model["universities"])
    total_programs += len(model["programs"])

    check(f"{city}: {unis} вузов", len(model["universities"]) == unis,
          str(len(model["universities"])))
    check(f"{city}: {programs} направлений", len(model["programs"]) == programs,
          str(len(model["programs"])))
    check(f"{city}: магистратуры нет ни одной строки",
          all(".04." not in p["code"] for p in model["programs"]))
    check(f"{city}: баллы — числа, а не строки",
          all(isinstance(v["budget"], (int, type(None))) and
              isinstance(v["paid"], (int, type(None)))
              for p in model["programs"] for v in p["scores"].values()))

check("всего 31 вуз", total_unis == 31, str(total_unis))
check("всего 360 направлений", total_programs == 360, str(total_programs))

# ─────────────────────────────────────────────────────────────────────────────
section("2. Москва: вложенные ключи и порядок вузов")


def flatten_dfs(row):
    """Независимая реализация восстановления ключей — для сверки с ботом."""
    flat = {}

    def walk(key, value):
        if isinstance(value, dict):
            for sub, inner in value.items():
                walk(key + "." + sub, inner)
        else:
            flat[key] = value

    for key, value in row.items():
        walk(key, value)
    return flat


with open(os.path.join(vuzdata.data_dir(), "moscow.json"), encoding="utf-8") as f:
    raw_moscow = json.load(f)
file_order = [k[3:].strip() for k in flatten_dfs(raw_moscow[0]) if k.startswith("бю ")]

moscow = vuzdata.load_city("Москва")
shorts = [u["short"] for u in moscow["universities"]]

check("13 вузов Москвы", len(shorts) == 13, str(len(shorts)))
check("МГУ восстановлен целиком — с точками в названии",
      "МГУ им. М.В. Ломоносова" in shorts, ", ".join(shorts[:3]))
check("названий с точками ровно 6 (не обрезаны)",
      sum(1 for s in shorts if "." in s) == 6, str(sum(1 for s in shorts if "." in s)))
check("порядок вузов такой же, как в файле",
      shorts == file_order, f"{shorts[:3]} ≠ {file_order[:3]}")
check("у каждого вуза есть полное название",
      all(u["full"] != u["short"] for u in moscow["universities"]))

# ─────────────────────────────────────────────────────────────────────────────
section("3. Список направлений: сортировка, страницы, подписи")

kazan = vuzdata.load_city("Казань")
bachelor = vuzdata.programs_sorted(kazan, "Бакалавриат")
spec = vuzdata.programs_sorted(kazan, "Специалитет")

check("бакалавриат Казани: 74 направления", len(bachelor) == 74, str(len(bachelor)))
check("специалитет Казани: 29 направлений", len(spec) == 29, str(len(spec)))
check("список отсортирован по коду",
      [p["code"] for p in bachelor] == sorted(p["code"] for p in bachelor),
      f"{bachelor[0]['code']} … {bachelor[-1]['code']}")
check("уровни в списке не смешаны",
      {p["level"] for p in bachelor} == {"Бакалавриат"} and
      {p["level"] for p in spec} == {"Специалитет"})
check("страниц по 8: бакалавриат 10, специалитет 4",
      admission.pages_count(kazan, "Бакалавриат") == 10 and
      admission.pages_count(kazan, "Специалитет") == 4,
      f"{admission.pages_count(kazan, 'Бакалавриат')} и "
      f"{admission.pages_count(kazan, 'Специалитет')}")
check("все страницы покрывают список без пропусков и повторов",
      len({p["code"] for p in bachelor}) == len(bachelor))

lechen = vuzdata.program_by_code(kazan, "31.05.01")
check("направление ищется по коду", lechen is not None and
      lechen["name"] == "Лечебное дело", lechen["name"] if lechen else "нет")
check("несуществующий код даёт None",
      vuzdata.program_by_code(kazan, "99.99.99") is None)

label = admission.button_label(lechen)
check("подпись кнопки: код плюс название",
      label == "31.05.01 Лечебное дело", label)
long_label = admission.button_label(vuzdata.program_by_code(kazan, "18.03.02"))
check("длинное название обрезается до 45 символов",
      len(long_label) <= admission.LABEL_LIMIT and long_label.endswith("…"),
      f"{len(long_label)} симв.: {long_label}")
check("подписи кнопок укладываются в лимит MAX (128 символов)",
      all(len(admission.button_label(p)) <= 128 for p in kazan["programs"]))

check("у направления есть баллы на бюджете", vuzdata.program_has_form(lechen, "budget"))
check("у направления есть баллы и на платном",
      vuzdata.program_has_form(lechen, "paid"))

# ─────────────────────────────────────────────────────────────────────────────
section("4. Подбор по направлению: 31.05.01, Казань")

budget = vuzdata.rank_program(kazan, lechen, "budget", 280)
rows = [(u["short"], u["score"], u["margin"]) for u in budget["rows"]]
check("баллы по бюджету только у двух вузов",
      rows == [("КГМУ", 258, 22), ("КФУ", 276, 4)], str(rows))
check("с 280 баллами хватает обоим", budget["passes"] == 2 and
      budget["misses"] == 0, f"проходит {budget['passes']}, не хватает {budget['misses']}")
check("остальные четыре вуза — без баллов",
      [u["short"] for u in budget["no_data"]] ==
      ["КНИТУ-КАИ", "КНИТУ", "КГЭУ", "КГАСУ"],
      str([u["short"] for u in budget["no_data"]]))

low = vuzdata.rank_program(kazan, lechen, "budget", 250)
check("с 250 баллами не хватает обоим", low["passes"] == 0 and low["misses"] == 2,
      f"проходит {low['passes']}")
check("ближе всего КГМУ: не хватает 8",
      low["rows"][0]["short"] == "КГМУ" and low["rows"][0]["margin"] == -8,
      f"{low['rows'][0]['short']} {low['rows'][0]['margin']}")

paid = vuzdata.rank_program(kazan, lechen, "paid", 120)
check("платное: КФУ 110 и КГМУ 149",
      [(u["short"], u["score"]) for u in paid["rows"]] ==
      [("КФУ", 110), ("КГМУ", 149)], str([(u["short"], u["score"]) for u in paid["rows"]]))
check("с 120 баллами проходит КФУ с запасом 10",
      paid["passes"] == 1 and paid["rows"][0]["margin"] == 10,
      f"проходит {paid['passes']}, запас {paid['rows'][0]['margin']}")

empty_program = next(p for p in kazan["programs"]
                     if not vuzdata.program_has_form(p, "paid"))
empty = vuzdata.rank_program(kazan, empty_program, "paid", 200)
check("направление без платных баллов честно сообщает об этом",
      empty["has_any"] is False and not empty["rows"],
      empty_program["code"])

check("сумма баллов влияет на результат",
      vuzdata.rank_program(kazan, lechen, "budget", 258)["passes"] == 1 and
      vuzdata.rank_program(kazan, lechen, "budget", 257)["passes"] == 0)

# ─────────────────────────────────────────────────────────────────────────────
section("5. Разбор введённых баллов")

check("«190» → 190", vuzdata.parse_score("190") == (190, None))
check("«0» → 0", vuzdata.parse_score("0") == (0, None))
check("« 250 » с пробелами → 250", vuzdata.parse_score(" 250 ") == (250, None))
check("«триста» → ошибка с подсказкой",
      vuzdata.parse_score("триста")[0] is None and
      "цифрами" in vuzdata.parse_score("триста")[1])
check("«350» → ошибка про максимум 300",
      vuzdata.parse_score("350")[0] is None and
      "300" in vuzdata.parse_score("350")[1])
check("«-5» → отказ с понятной причиной, а не «больше 300»",
      vuzdata.parse_score("-5")[0] is None and
      "отрицательной" in vuzdata.parse_score("-5")[1],
      str(vuzdata.parse_score("-5")))

# ─────────────────────────────────────────────────────────────────────────────
section("6. Тексты ответов")

pick_text = admission.text_program_pick(kazan, "Бакалавриат", 0, 74, 10)
check("в заголовке списка — шаг, город, уровень и страница",
      "Шаг 3 из 5" in pick_text and "Казань, бакалавриат" in pick_text and
      "страница 1 из 10" in pick_text, pick_text.split("\n")[0])
check("на первой странице подсказка про листание",
      "Ещё →" in pick_text)

form_text = admission.text_ask_form(lechen, "Специалитет")
check("на шаге формы видно направление и варианты",
      "Шаг 4 из 5" in form_text and "31.05.01 Лечебное дело" in form_text and
      "бюджет или платное" in form_text, form_text.split("\n")[0])

score_text = admission.text_ask_score(lechen, "budget")
check("на шаге баллов видно форму и пример",
      "Шаг 5 из 5" in score_text and "Например: 190" in score_text and
      "бюджет" in score_text, score_text.split("\n")[1])

res = admission.text_program_result(kazan, lechen, "budget", 280, budget)
check("в результате — код, название, город, форма и сумма",
      "31.05.01 Лечебное дело" in res and "Казань · специалитет · бюджет" in res and
      "Ваша сумма: 280 из 300" in res, res.split("\n")[1])
check("в результате есть запас по баллам",
      "КГМУ — 258 (запас 22)" in res, next((l for l in res.split("\n") if "КГМУ" in l), "—"))
check("в результате перечислены вузы без баллов",
      "Без баллов по этой форме: КНИТУ-КАИ" in res,
      next((l for l in res.split("\n") if "Без баллов" in l), "—"))
check("в результате указаны предметы ЕГЭ",
      "Предметы ЕГЭ: русский язык + химия" in res,
      next((l for l in res.split("\n") if "Предметы" in l), "—"))
check("в результате помечена демонстрационная выгрузка",
      "демонстрационная выгрузка" in res)

res_low = admission.text_program_result(kazan, lechen, "budget", 250, low)
check("если не проходит никуда — сказано, где ближе всего",
      "Ближе всего КГМУ: не хватает 8" in res_low,
      next((l for l in res_low.split("\n") if "Ближе" in l), "—"))

res_paid = admission.text_program_result(kazan, lechen, "paid", 120, paid)
check("на платном текст пересчитан по столбцу «пл»",
      "платное" in res_paid and "КФУ — 110 (запас 10)" in res_paid and
      "не дотягиваете 29" in res_paid,
      " | ".join(l for l in res_paid.split("\n") if "КФУ" in l or "КГМУ" in l))

check("тексты укладываются в лимит MAX (4000 символов)",
      all(len(t) < 4000 for t in (res, res_low, res_paid, pick_text)),
      str(max(len(t) for t in (res, res_low, res_paid))))
check("магистратуры ни в одном тексте нет",
      all("магистратур" not in t.lower() for t in (res, res_low, res_paid,
                                                   pick_text, form_text, score_text)))
check("склонение: 1 вуз / 2 вуза / 5 вузов",
      (admission._plural(1, "вуз", "вуза", "вузов") == "вуз" and
       admission._plural(2, "вуз", "вуза", "вузов") == "вуза" and
       admission._plural(5, "вуз", "вуза", "вузов") == "вузов"))

# ─────────────────────────────────────────────────────────────────────────────
section("7. Диалог: город → уровень → направление → форма → баллы")

try:
    import bot as bot_module
except ImportError as e:                       # requests / dotenv не стоят
    check("модуль бота импортируется", False, str(e))
    bot_module = None

if bot_module:
    sent = []
    bot_module.send = lambda chat_id, text, buttons=None: sent.append(
        {"chat_id": chat_id, "text": text, "buttons": buttons or []})

    def last_buttons():
        return [b["text"] for row in sent[-1]["buttons"] for b in row]

    def last_payloads():
        return [b["payload"] for row in sent[-1]["buttons"] for b in row
                if "payload" in b]

    CHAT = 555
    bot_module.STATE.clear()

    # шаг 1 — город
    bot_module.handle_text(CHAT, "/scores")
    check("после /scores бот просит выбрать город",
          "Шаг 1 из 5" in sent[-1]["text"], sent[-1]["text"][:40])
    check("в панели ровно четыре города",
          all(c in last_buttons() for c in vuzdata.CITIES) and
          len([b for b in last_buttons() if b in vuzdata.CITIES]) == 4,
          ", ".join(last_buttons()))

    # шаг 2 — уровень
    bot_module.handle_callback(CHAT, "pick:Казань", "cb1")
    check("после города бот спрашивает уровень",
          "Шаг 2 из 5" in sent[-1]["text"] and "Казань" in sent[-1]["text"],
          sent[-1]["text"])
    check("предложены ровно два уровня, без магистратуры",
          "Бакалавриат" in last_buttons() and "Специалитет" in last_buttons() and
          "Магистратура" not in last_buttons(), ", ".join(last_buttons()))

    # шаг 3 — направление: первая страница
    bot_module.handle_callback(CHAT, "lvl:Бакалавриат", "cb2")
    check("после уровня бот показывает список направлений",
          "Шаг 3 из 5" in sent[-1]["text"] and "страница 1 из 10" in sent[-1]["text"],
          sent[-1]["text"].split("\n")[0])
    first_page = last_payloads()
    check("на странице 8 направлений",
          len([p for p in first_page if p.startswith("prg:")]) == 8,
          str(len([p for p in first_page if p.startswith("prg:")])))
    check("все направления страницы — бакалавриата",
          all(not p.split(":")[1].endswith((".04.01", ".05.01"))
              for p in first_page if p.startswith("prg:")),
          ", ".join(p for p in first_page if p.startswith("prg:"))[:80])
    check("на первой странице можно только листать вперёд",
          "page:1" in first_page and "page:-1" not in first_page,
          ", ".join(p for p in first_page if p.startswith("page:")))
    check("есть кнопка вернуться к уровню",
          "back:level" in last_payloads())

    # листание
    bot_module.handle_callback(CHAT, "page:1", "cb3")
    second_dirs = {p for p in last_payloads() if p.startswith("prg:")}
    check("вторая страница показывает другие направления",
          "страница 2 из 10" in sent[-1]["text"] and
          not (second_dirs & {p for p in first_page if p.startswith("prg:")}),
          sent[-1]["text"].split("\n")[0])
    check("на второй странице можно листать в обе стороны",
          "page:0" in last_payloads() and "page:2" in last_payloads(),
          ", ".join(p for p in last_payloads() if p.startswith("page:")))

    bot_module.handle_callback(CHAT, "page:9", "cb4")
    check("последняя страница: 2 направления и только «← Назад»",
          len([p for p in last_payloads() if p.startswith("prg:")]) == 2 and
          "page:8" in last_payloads() and "page:10" not in last_payloads(),
          str(len([p for p in last_payloads() if p.startswith("prg:")])))

    # шаг 3 — выбираем Лечебное дело (специалитет)
    bot_module.handle_callback(CHAT, "back:level", "cb5")
    bot_module.handle_callback(CHAT, "lvl:Специалитет", "cb6")
    check("для специалитета своя страница списка",
          "Шаг 3 из 5" in sent[-1]["text"] and "страница 1 из 4" in sent[-1]["text"] and
          "29 направлений" in sent[-1]["text"], sent[-1]["text"].split("\n")[1])

    bot_module.handle_callback(CHAT, "prg:31.05.01", "cb7")
    check("после направления бот спрашивает форму обучения",
          "Шаг 4 из 5" in sent[-1]["text"] and "31.05.01 Лечебное дело" in sent[-1]["text"],
          sent[-1]["text"].split("\n")[0])
    check("предложены бюджет и платное",
          {"Бюджет", "Платное"} <= set(last_buttons()), ", ".join(last_buttons()))
    check("состояние помнит код направления",
          bot_module.STATE[CHAT]["code"] == "31.05.01" and
          bot_module.STATE[CHAT]["level"] == "Специалитет")

    # шаг 4 — форма
    bot_module.handle_callback(CHAT, "form:budget", "cb8")
    check("после формы бот просит сумму баллов",
          "Шаг 5 из 5" in sent[-1]["text"] and "Например: 190" in sent[-1]["text"],
          sent[-1]["text"].split("\n")[0])

    # шаг 5 — баллы
    bot_module.handle_text(CHAT, "280")
    check("бот отвечает результатом по выбранному направлению",
          "31.05.01 Лечебное дело" in sent[-1]["text"] and
          "КГМУ — 258 (запас 22)" in sent[-1]["text"],
          " | ".join(l for l in sent[-1]["text"].split("\n") if "КГМУ" in l))

    # переключение формы прямо из результата
    bot_module.handle_callback(CHAT, "form:paid", "cb9")
    check("кнопка формы пересчитывает тот же экран по платному",
          "платное" in sent[-1]["text"] and "КФУ — 110" in sent[-1]["text"],
          " | ".join(l for l in sent[-1]["text"].split("\n") if "КФУ" in l))

    # «другое направление» возвращает к списку
    bot_module.handle_callback(CHAT, "back:program", "cb10")
    check("«Другое направление» возвращает к списку шага 3",
          "Шаг 3 из 5" in sent[-1]["text"],
          sent[-1]["text"].split("\n")[0])

    # мусор вместо числа
    bot_module.handle_callback(CHAT, "prg:31.05.01", "cb11")
    bot_module.handle_callback(CHAT, "form:budget", "cb12")
    bot_module.handle_text(CHAT, "ерунда")
    check("на не-число бот объясняет, что делать",
          "цифрами" in sent[-1]["text"], sent[-1]["text"][:50])
    bot_module.handle_text(CHAT, "350")
    check("на 350 бот напоминает про максимум 300",
          "300" in sent[-1]["text"] and "не может" in sent[-1]["text"],
          sent[-1]["text"][:60])

    # неизвестный код направления
    bot_module.handle_callback(CHAT, "prg:99.99.99", "cb13")
    check("несуществующее направление отклоняется понятно",
          "нет в базе" in sent[-1]["text"], sent[-1]["text"][:60])

    # город без данных
    bot_module.handle_callback(CHAT, "pick:Новосибирск", "cb14")
    check("город без данных отклоняется вежливо",
          "нет" in sent[-1]["text"].lower() and "Доступны" in sent[-1]["text"],
          sent[-1]["text"][:60])

    # панель городов
    bot_module.handle_callback(CHAT, "cities", "cb15")
    check("«Города и данные» показывает четыре города",
          all(c in sent[-1]["text"] + str(sent[-1]["buttons"]) for c in vuzdata.CITIES),
          sent[-1]["text"].split("\n")[0])
    bot_module.handle_callback(CHAT, "city:Томск", "cb16")
    check("сводка по Томску содержит вузы и направления",
          "Томск — 6 вузов" in sent[-1]["text"] and
          "82 направления" in sent[-1]["text"], sent[-1]["text"].split("\n")[0])

    # /start сбрасывает диалог
    bot_module.handle_callback(CHAT, "pick:Казань", "cb17")
    bot_module.handle_text(CHAT, "/start")
    check("/start сбрасывает диалог",
          bot_module.STATE[CHAT] == dict(bot_module.EMPTY_STATE),
          str(bot_module.STATE[CHAT]))
    check("в меню есть кнопки «Подобрать по баллам» и «Города и данные»",
          all(any(b["text"] == name for row in sent[-1]["buttons"] for b in row)
              for name in ("Подобрать по баллам", "Города и данные")),
          str(last_buttons()))

    check("во всём диалоге ни разу не встретилось слово «магистратура»",
          all("магистратур" not in m["text"].lower() for m in sent))

# ─────────────────────────────────────────────────────────────────────────────
print()
print(f"Пройдено: {passed}   Провалено: {failed}")
if failed:
    sys.exit(1)
print("Все проверки пройдены ✅")
