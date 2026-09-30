"""
vuzdata.py — данные для бота: те же файлы data/*.json, что читает сайт.

Зачем отдельный модуль: сайт разбирает данные на JavaScript
(frontend/data-loader.js), бот — на Python. Если правила разойдутся, бот и сайт
начнут показывать разные баллы. Поэтому здесь повторяются ровно те же правила:

  • код направления собирается из id-1.id-2.id-3 («01.03.01»);
  • строки уровня «Магистратура» (xx.04.xx) отбрасываются — приём туда идёт
    после диплома и по другим экзаменам, а не по баллам ЕГЭ;
  • «-» и пустая строка означают «нет данных», а не ноль;
  • направления, у которых нет ни одного балла ни в одном вузе города,
    в модель не попадают;
  • названия вузов восстанавливаются из вложенных ключей (в файле Москвы
    точки в названиях разложили столбцы на объекты).

Проверки на этих правилах — в tools/test_bot.py.
"""

import json
import os

# ── Где лежат данные ─────────────────────────────────────────────────────────
# В контейнере бота:      /app/data   (см. deploy/Dockerfile.bot)
# На ноутбуке:            <папка проекта>/data   (bot/ лежит рядом)
_BOT_DIR = os.path.dirname(os.path.abspath(__file__))
_CANDIDATES = (
    os.environ.get("DATA_DIR", ""),
    os.path.join(_BOT_DIR, "data"),
    os.path.join(os.path.dirname(_BOT_DIR), "data"),
    "/app/data",
)


def data_dir() -> str:
    """Папка с данными. Ищем при первом обращении, а не при импорте."""
    for path in _CANDIDATES:
        if path and os.path.isfile(os.path.join(path, "spec_napr.json")):
            return path
    raise FileNotFoundError(
        "Не нашёл папку data с файлами городов. Проверьте, что рядом с ботом "
        "лежит data/spec_napr.json (в Docker — COPY data/ /app/data/)"
    )


# ── Города ───────────────────────────────────────────────────────────────────
# Ровно четыре города, по которым есть базы. Значения — файлы в data/.
CITY_REGISTRY = {
    "Москва": "moscow.json",
    "Санкт-Петербург": "spb.json",
    "Казань": "kazan_2026.json",
    "Томск": "tomsk.json",
}

CITIES = tuple(CITY_REGISTRY)

# ── Уровни ───────────────────────────────────────────────────────────────────
# Показываем только то, куда поступают по баллам ЕГЭ после 11 класса.
EGE_LEVELS = ("Бакалавриат", "Специалитет")

LEVEL_TITLES = {
    "Бакалавриат": "Бакалавриат",
    "Специалитет": "Специалитет",
}

# ── Формы обучения ───────────────────────────────────────────────────────────
FORMS = {
    "budget": {"title": "бюджет", "column": "бю "},
    "paid":   {"title": "платное", "column": "пл "},
}

MAX_SCORE = 300          # три экзамена по 100 баллов

# ── Короткие названия вузов → полные ─────────────────────────────────────────
# Те же строки, что в frontend/data-loader.js.
UNI_NAMES = {
    "КФУ": "Казанский (Приволжский) федеральный университет",
    "КНИТУ-КАИ": "Казанский национальный исследовательский технический университет им. А. Н. Туполева",
    "КНИТУ": "Казанский национальный исследовательский технологический университет",
    "КГМУ": "Казанский государственный медицинский университет",
    "КГЭУ": "Казанский государственный энергетический университет",
    "КГАСУ": "Казанский государственный архитектурно-строительный университет",
    "МГУ им. М.В. Ломоносова": "Московский государственный университет имени М. В. Ломоносова",
    "НИУ ВШЭ": "Национальный исследовательский университет «Высшая школа экономики»",
    "РУДН": "Российский университет дружбы народов имени Патриса Лумумбы",
    "РГГУ": "Российский государственный гуманитарный университет",
    "МГТУ им. Баумана": "Московский государственный технический университет имени Н. Э. Баумана",
    "НИЯУ МИФИ": "Национальный исследовательский ядерный университет «МИФИ»",
    "МАИ": "Московский авиационный институт (национальный исследовательский университет)",
    "МГИМО": "Московский государственный институт международных отношений",
    "РАНХиГС": "Российская академия народного хозяйства и государственной службы",
    "РЭУ им. Плеханова": "Российский экономический университет имени Г. В. Плеханова",
    "МГЮА им. Кутафина": "Московский государственный юридический университет имени О. Е. Кутафина",
    "Первый МГМУ им. Сеченова": "Первый Московский государственный медицинский университет имени И. М. Сеченова",
    "РНИМУ им. Пирогова": "Российский национальный исследовательский медицинский университет имени Н. И. Пирогова",
    "СПбГУ": "Санкт-Петербургский государственный университет",
    "ИТМО": "Национальный исследовательский университет ИТМО",
    "СПбПУ": "Санкт-Петербургский политехнический университет Петра Великого",
    "ПСПбГМУ": "Первый Санкт-Петербургский государственный медицинский университет имени И. П. Павлова",
    "РГПУ": "Российский государственный педагогический университет имени А. И. Герцена",
    "СПбГАСУ": "Санкт-Петербургский государственный архитектурно-строительный университет",
    "ТГУ": "Национальный исследовательский Томский государственный университет",
    "ТУСУР": "Томский государственный университет систем управления и радиоэлектроники",
    "ТПУ": "Национальный исследовательский Томский политехнический университет",
    "СибГМУ": "Сибирский государственный медицинский университет",
    "ТГПУ": "Томский государственный педагогический университет",
    "ТГАСУ": "Томский государственный архитектурно-строительный университет",
}

SUBJECT_LABELS = {
    "мат": "математика (профиль)",
    "инф": "информатика",
    "физ": "физика",
    "хим": "химия",
    "био": "биология",
    "общество": "обществознание",
    "история": "история",
    "геогр": "география",
    "ин.яз": "иностранный язык",
    "лит": "литература",
    "рус": "русский язык",
}

# Русский язык обязателен для всех направлений и в файлах не указан
ALWAYS_REQUIRED = "рус"
ALWAYS_REQUIRED_TITLE = "русский язык"

EMPTY = {"", "-", "—", "–"}


# ── Разбор значений ──────────────────────────────────────────────────────────

def _to_score(value):
    """'237' → 237, '-' → None (нет данных)."""
    if value is None:
        return None
    text = str(value).strip()
    if text in EMPTY:
        return None
    try:
        return int(round(float(text.replace(",", "."))))
    except ValueError:
        return None


def _restore_nested_keys(row: dict) -> dict:
    """Склеивает вложенные ключи обратно через точку.

        {"бю МГУ им": {" М": {"В": {" Ломоносова": "-"}}}}
            → {"бю МГУ им. М.В. Ломоносова": "-"}

    Экспорт таблицы принимает точки в названиях вузов за разделители уровней.
    Если файл исправят, функция ничего не меняет.
    """
    # Порядок ключей сохраняем: от него зависит порядок вузов в списках
    # (в файле Москвы столбцы «бю …» идут сверху вниз, как в таблице).
    # Обход в глубину — восстановленное название встаёт на место своего ключа,
    # а не в конец словаря.
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


def _code_of(row: dict) -> str:
    """id-1, id-2, id-3 → «01.03.01»."""
    parts = []
    for key in ("id-1", "id-2", "id-3"):
        try:
            number = int(float(str(row.get(key, 0)).strip()))
        except ValueError:
            number = 0
        parts.append(f"{number:02d}")
    return ".".join(parts)


# ── Загрузка ─────────────────────────────────────────────────────────────────

def _read_json(name: str):
    with open(os.path.join(data_dir(), name), encoding="utf-8") as f:
        return json.load(f)


_spec_cache = None
_city_cache = {}


def load_spec() -> dict:
    """Справочник направлений: код → {name, level, group}."""
    global _spec_cache
    if _spec_cache is not None:
        return _spec_cache

    index, groups = {}, {}
    for row in _read_json("spec_napr.json"):
        code = str(row.get("Код", "")).strip()
        level = str(row.get("Уровень образования", "")).strip()
        name = str(row.get("Наименование укрупненных групп, специальностей "
                           "и направлений подготовки", "")).strip()
        if not code:
            continue
        if level == "Укрупненная группа":
            groups[code] = name.replace(" (Укрупненная группа)", "")
            continue
        index[code] = {"name": name, "level": level, "group": ""}

    for code, item in index.items():
        item["group"] = groups.get(code[:2] + ".00.00", "")

    _spec_cache = index
    return index


def load_city(city: str) -> dict:
    """Модель города: вузы, направления и баллы.

    Возвращает dict:
        city          — название
        universities  — [{"key","short","full"}]
        programs      — [{"code","name","level","group","required","choice",
                          "scores": {вуз: {"budget": int|None,"paid": int|None}}}]
        levels        — уровни, которые реально есть в городе
    """
    if city not in CITY_REGISTRY:
        raise KeyError(f"нет данных по городу {city} (есть: {', '.join(CITIES)})")
    if city in _city_cache:
        return _city_cache[city]

    spec = load_spec()
    rows = [_restore_nested_keys(r) for r in _read_json(CITY_REGISTRY[city])]

    # Вузы — по столбцам «бю …» первой строки
    uni_keys = []
    for column in (rows[0] if rows else {}):
        if column.startswith("бю "):
            key = column[3:].strip()
            if key not in uni_keys:
                uni_keys.append(key)

    programs = []
    for row in rows:
        code = _code_of(row)
        meta = spec.get(code, {})
        level = meta.get("level", "")

        # Магистратуру и всё, что не ведёт к приёму по ЕГЭ, отбрасываем сразу
        if level not in EGE_LEVELS:
            continue

        scores, has_any = {}, False
        for key in uni_keys:
            budget = _to_score(row.get("бю " + key))
            paid = _to_score(row.get("пл " + key))
            if budget is not None or paid is not None:
                has_any = True
            scores[key] = {"budget": budget, "paid": paid}
        if not has_any:
            continue

        choice = []
        for field in ("пред 1", "пред 2"):
            value = str(row.get(field, "")).strip()
            if value and value not in choice:
                choice.append(value)

        programs.append({
            "code": code,
            "name": meta.get("name") or code,
            "level": level,
            "group": meta.get("group", ""),
            "required": str(row.get("пред обяз", "")).strip(),
            "choice": choice,
            "scores": scores,
        })

    model = {
        "city": city,
        "universities": [
            {"key": k, "short": k, "full": UNI_NAMES.get(k, k)} for k in uni_keys
        ],
        "programs": programs,
        "levels": [lvl for lvl in EGE_LEVELS
                   if any(p["level"] == lvl for p in programs)],
    }
    _city_cache[city] = model
    return model


# ── Подбор по баллам ─────────────────────────────────────────────────────────

def programs_of_level(model: dict, level: str) -> list:
    """Направления одного уровня, у которых есть хоть один балл."""
    return [p for p in model["programs"] if p["level"] == level]


def subjects_label(program: dict) -> str:
    """«химия + биология» — обязательный предмет плюс выбор."""
    parts = []
    required = program.get("required")
    if required:
        parts.append(SUBJECT_LABELS.get(required, required))
    choice = program.get("choice") or []
    if choice:
        parts.append(" или ".join(SUBJECT_LABELS.get(c, c) for c in choice))
    return " + ".join(parts) if parts else "—"


def programs_sorted(model: dict, level: str) -> list:
    """Направления одного уровня, по возрастанию кода — для списка со страницами."""
    return sorted(programs_of_level(model, level), key=lambda p: p["code"])


def program_by_code(model: dict, code: str):
    """Направление по коду — или None, если такого в городе нет."""
    for program in model["programs"]:
        if program["code"] == code:
            return program
    return None


def program_has_form(program: dict, form: str) -> bool:
    """Есть ли у направления хоть один балл по этой форме обучения."""
    return any(values.get(form) is not None
               for values in program["scores"].values())


def rank_program(model: dict, program: dict, form: str, total: int) -> dict:
    """Кто принимает на это направление с такой суммой баллов.

    form — «budget» или «paid». total — сумма баллов пользователя.

    Возвращает:
        rows    — [{"short","full","score","margin"}] по возрастанию балла
        no_data — [{"short","full"}] вузы города без баллов по этой форме
        has_any — есть ли вообще баллы по выбранной форме
        passes  — сколько вузов из rows принимают эту сумму
        misses  — сколько не принимают
    """
    rows, no_data = [], []

    for uni in model["universities"]:
        score = program["scores"].get(uni["short"], {}).get(form)
        if score is None:
            no_data.append({"short": uni["short"], "full": uni["full"]})
            continue
        rows.append({
            "short": uni["short"],
            "full": uni["full"],
            "score": score,
            "margin": total - score,
        })

    rows.sort(key=lambda u: (u["score"], u["short"]))
    return {
        "rows": rows,
        "no_data": no_data,
        "has_any": bool(rows),
        "passes": sum(1 for u in rows if u["score"] <= total),
        "misses": sum(1 for u in rows if u["score"] > total),
    }


def city_overview(model: dict) -> dict:
    """Сводка по городу: сколько вузов и направлений по каждому уровню."""
    levels = []
    for level in model["levels"]:
        programs = programs_of_level(model, level)
        levels.append({"level": level, "count": len(programs)})
    return {
        "city": model["city"],
        "universities": model["universities"],
        "total": len(model["programs"]),
        "levels": levels,
    }


def parse_score(text: str):
    """Текст пользователя → сумма баллов. None, если это не число.

    Возвращает (значение, сообщение об ошибке) — оба могут быть None.
    """
    cleaned = text.strip().replace(",", ".")
    try:
        value = int(round(float(cleaned)))
    except ValueError:
        return None, "Это не похоже на число. Напишите сумму баллов цифрами, например: 190"
    if value < 0:
        return None, (f"Сумма баллов не может быть отрицательной. "
                      f"Напишите число от 0 до {MAX_SCORE}.")
    if value > MAX_SCORE:
        return None, (f"Баллов больше {MAX_SCORE} быть не может: три экзамена "
                      f"по 100. Напишите число от 0 до {MAX_SCORE}.")
    return value, None
