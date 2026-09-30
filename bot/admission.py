"""
admission.py — тексты ответов бота.

Здесь только формулировки: ни сети, ни клавиатур. Так текст можно править,
не трогая логику диалога, и проверять отдельным тестом.

Путь пользователя в подборе по баллам — пять шагов:
    город → уровень → направление → форма обучения → сумма баллов → результат
"""

from vuzdata import (ALWAYS_REQUIRED_TITLE, FORMS, MAX_SCORE,
                     SUBJECT_LABELS, programs_of_level)

# ── Постоянные тексты ────────────────────────────────────────────────────────
TEXT_START = (
    "Привет! Это бот подбора вузов.\n\n"
    "Что можно сделать прямо здесь, в чате:\n"
    "• «Подобрать по баллам» — выбрать город, уровень (бакалавриат или\n"
    "  специалитет), направление и форму обучения (бюджет или платное),\n"
    "  ввести свою сумму баллов — и увидеть проходные баллы по вузам;\n"
    "• «Города и данные» — посмотреть, по каким городам есть базы.\n\n"
    "А кнопка «Подобрать вуз» откроет приложение с картой: там тот же подбор\n"
    "по предметам ЕГЭ.\n\n"
    "Команды: /start — начать заново, /help — справка."
)

TEXT_HELP = (
    "Что умеет бот:\n\n"
    "• «Подобрать по баллам» — пять шагов: город → уровень → направление →\n"
    "  бюджет или платное → сумма баллов. В ответ придут проходные баллы\n"
    "  этого направления по вузам города и отметка, куда вашей суммы хватает.\n"
    "• «Города и данные» — панель с четырьмя городами: Москва,\n"
    "  Санкт-Петербург, Казань, Томск. По каждому видно число вузов\n"
    "  и направлений.\n"
    "• «Подобрать вуз» — открывает приложение с картой России: подбор\n"
    "  по предметам ЕГЭ и по направлениям подготовки.\n\n"
    "Команды: /start, /help, /cities — города, /scores — подбор по баллам."
)

TEXT_ABOUT = (
    "Бот помогает абитуриенту выбрать вуз:\n\n"
    "• четыре города: Москва, Санкт-Петербург, Казань, Томск\n"
    "• 31 вуз и 360 направлений бакалавриата и специалитета\n"
    "• подбор по баллам ЕГЭ прямо в чате: город, уровень, направление,\n"
    "  форма обучения — и проходные баллы по вузам\n"
    "• проходные баллы на бюджет и на платное, отметка «проходит / не хватает»\n\n"
    "Магистратура не показывается: туда поступают после диплома и по другим\n"
    "экзаменам, а не по баллам ЕГЭ.\n\n"
    "Данные подготовлены на основе открытой выгрузки и используются\n"
    "в демонстрационных целях."
)

TEXT_UNKNOWN = (
    "Не понял сообщение. Выберите, что сделать, или введите /help."
)

TEXT_CANCELLED = "Хорошо, вернулись в начало."

TEXT_CITY_PANEL = (
    "Города и данные\n\n"
    "Базы собраны по четырём городам — по остальным данных нет.\n"
    "Выберите город, чтобы посмотреть, что по нему есть:"
)

TEXT_ASK_CITY = "Шаг 1 из 5. Выберите город:"

TEXT_STEP_LEVEL = "Шаг 2 из 5. {city}. Выберите уровень образования:"

TEXT_SCORE_WRONG = (
    "Напишите, пожалуйста, сумму баллов цифрами — одним числом от 0 до 300.\n"
    "Например: 190"
)

TEXT_LIMIT = (
    "Проходные баллы прошлого года, демонстрационная выгрузка:\n"
    "балл — минимальный по этому направлению среди вузов города."
)

# Сколько направлений показываем на одной странице списка
PAGE_SIZE = 8
# Кнопка не должна быть длиннее 128 символов (лимит MAX),
# а две кнопки в ряд должны читаться на телефоне
LABEL_LIMIT = 45


# ── Сборка текстов по данным ─────────────────────────────────────────────────

def button_label(program: dict) -> str:
    """Подпись кнопки со направлением: «09.03.04 Программная инженерия»."""
    text = f"{program['code']} {program['name']}"
    if len(text) <= LABEL_LIMIT:
        return text
    return text[:LABEL_LIMIT - 1].rstrip() + "…"


def pages_count(model: dict, level: str, programs: list = None) -> int:
    """Сколько страниц займёт список направлений уровня."""
    total = len(programs if programs is not None else programs_of_level(model, level))
    return max(1, -(-total // PAGE_SIZE))


def text_program_pick(model: dict, level: str, page: int, total: int,
                      pages: int) -> str:
    """Заголовок списка направлений со страницами."""
    lines = [
        f"Шаг 3 из 5. {model['city']}, {level.lower()} — выберите направление.",
        f"Всего {total} {_plural(total, 'направление', 'направления', 'направлений')}"
        f", страница {page + 1} из {pages}.",
    ]
    if pages > 1:
        lines.append("")
        lines.append("Листайте кнопками «← Назад» и «Ещё →».")
    return "\n".join(lines)


def text_ask_form(program: dict, level: str) -> str:
    """Шаг 4: выбор формы обучения."""
    return (f"Шаг 4 из 5. {program['code']} {program['name']}\n"
            f"{level.lower()}\n\n"
            "Выберите форму обучения: бюджет или платное.\n"
            "Можно нажать и то, и другое — цифры разные.")


def text_ask_score(program: dict, form: str) -> str:
    """Шаг 5: сумма баллов."""
    return (f"Шаг 5 из 5. {program['code']} {program['name']}\n"
            f"{FORMS[form]['title']}\n\n"
            f"Напишите свою сумму баллов ЕГЭ одним числом.\n"
            f"Например: 190\n"
            f"Считается сумма по трём экзаменам, максимум — {MAX_SCORE}.")


def text_city_overview(model: dict, overview: dict) -> str:
    """Что есть по городу: вузы, направления по уровням."""
    uni_count = len(overview["universities"])
    total = overview["total"]
    lines = [f"{overview['city']} — {uni_count} "
             f"{_plural(uni_count, 'вуз', 'вуза', 'вузов')}, {total} "
             f"{_plural(total, 'направление', 'направления', 'направлений')} "
             f"бакалавриата и специалитета", ""]

    for item in overview["levels"]:
        count = item["count"]
        lines.append(f"• {item['level']}: {count} "
                     f"{_plural(count, 'направление', 'направления', 'направлений')}")
    lines.append("")

    lines.append("Вузы:")
    for uni in overview["universities"]:
        lines.append(f"• {uni['short']} — {uni['full']}")
    lines.append("")
    lines.append("Чтобы подобрать вуз по своей сумме баллов, нажмите "
                 "«Подобрать по баллам».")
    return "\n".join(lines)


def text_program_result(model: dict, program: dict, form: str, total: int,
                        result: dict) -> str:
    """Результат: проходные баллы одного направления по вузам города."""
    form_title = FORMS[form]["title"]
    rows = result["rows"]

    header = (f"{program['code']} {program['name']}\n"
              f"{model['city']} · {program['level'].lower()} · {form_title}\n"
              f"Ваша сумма: {total} из {MAX_SCORE}")

    if not rows:
        return (header + "\n\nПо этому направлению нет ни одного балла "
                f"({form_title}). Выберите другую форму обучения "
                "или другое направление.")

    passes = [u for u in rows if u["score"] <= total]
    misses = [u for u in rows if u["score"] > total]

    lines = [header, ""]

    if passes:
        lines.append(f"Баллов хватает — {len(passes)} "
                     f"{_plural(len(passes), 'вуз', 'вуза', 'вузов')}:")
        for uni in passes:
            lines.append(f"• {uni['short']} — {uni['score']} "
                         f"(запас {uni['margin']})")
    else:
        closest = rows[0]
        lines.append(f"Ни одному вузу этой суммы пока не хватает. "
                     f"Ближе всего {closest['short']}: "
                     f"не хватает {abs(closest['margin'])}.")

    if misses:
        lines.append("")
        lines.append(f"Не хватает — {len(misses)} "
                     f"{_plural(len(misses), 'вуз', 'вуза', 'вузов')}:")
        for uni in misses[:8]:
            lines.append(f"• {uni['short']} — {uni['score']}, "
                         f"не дотягиваете {abs(uni['margin'])}")
        if len(misses) > 8:
            lines.append(f"• и ещё {len(misses) - 8}")

    lines.append("")
    lines.append(f"Проходные баллы по этой форме указаны у {len(rows)} "
                 f"{_plural(len(rows), 'вуза', 'вузов', 'вузов')} города "
                 f"из {len(model['universities'])}.")

    if result["no_data"]:
        names = ", ".join(u["short"] for u in result["no_data"][:6])
        if len(result["no_data"]) > 6:
            names += " и другие"
        lines.append(f"Без баллов по этой форме: {names}.")

    subjects = _subjects_line(program)
    if subjects:
        lines.append("")
        lines.append(f"Предметы ЕГЭ: {subjects}.")

    lines.append("")
    lines.append(TEXT_LIMIT)
    return "\n".join(lines)


def text_program_missing(code: str) -> str:
    return (f"Направления {code} нет в базе этого города. "
            "Выберите другое направление.")


def _subjects_line(program: dict) -> str:
    """«русский язык + химия + биология или математика»."""
    parts = [ALWAYS_REQUIRED_TITLE]
    required = program.get("required")
    if required:
        parts.append(SUBJECT_LABELS.get(required, required))
    choice = program.get("choice") or []
    if choice:
        parts.append(" или ".join(SUBJECT_LABELS.get(c, c) for c in choice))
    return " + ".join(parts)


def _plural(number: int, one: str, few: str, many: str) -> str:
    """1 вуз, 2 вуза, 5 вузов."""
    n = abs(number) % 100
    if 11 <= n <= 14:
        return many
    n %= 10
    if n == 1:
        return one
    if 2 <= n <= 4:
        return few
    return many
