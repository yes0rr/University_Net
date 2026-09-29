#!/usr/bin/env python3
"""
Генератор frontend/data.js — базы вузов по городам.

Сейчас файл собирает только window.uniData: справочную базу «город → вузы»
для городов, по которым подробных данных ещё нет.

ПОДРОБНЫЕ ДАННЫЕ ЗДЕСЬ БОЛЬШЕ НЕ СОБИРАЮТСЯ. Баллы, направления и предметы
ЕГЭ лежат в папке data/ отдельными файлами и подгружаются в браузере через
frontend/data-loader.js:

    data/spec_napr.json   справочник направлений (код → название, уровень)
    data/<город>_2026.json  база города: баллы по направлениям и вузам

Такой файл готовится выгрузкой из информационной системы, а не скриптом.
Добавить город в интерфейс — значит дописать строку в CITY_REGISTRY
в frontend/data-loader.js и положить файл в data/.

Запуск:  python tools/build_tomsk_data.py
Результат: frontend/data.js (перезаписывается)
"""

import ast
import json
from pathlib import Path

import openpyxl
import re

ROOT = Path(__file__).resolve().parent.parent
XLSX = ROOT / "Vuzanet(1).xlsx"
MAIN_PY = ROOT / "main.py"
LOGIC_JS = ROOT / "tools" / "tomsk_frontend.js"
OUT = ROOT / "frontend" / "data.js"

# ── Полные названия вузов: в таблице только сокращения ───────────────────────
UNIVERSITIES = [
    ("тусур", "ТУСУР", "Томский государственный университет систем управления и радиоэлектроники"),
    ("тпу", "ТПУ", "Национальный исследовательский Томский политехнический университет"),
    ("тгу", "ТГУ", "Национальный исследовательский Томский государственный университет"),
    ("сибгму", "СибГМУ", "Сибирский государственный медицинский университет"),
    ("тгасу", "ТГАСУ", "Томский государственный архитектурно-строительный университет"),
    ("тгпу", "ТГПУ", "Томский государственный педагогический университет"),
]

# ── Коды регионов из main.py → названия городов на карте ─────────────────────
CITY_BY_REGION = {
    "RU-MOW": "Москва",
    "RU-SPE": "Санкт-Петербург",
    "RU-NVR": "Новосибирск",
    "RU-TAT": "Казань",
    "RU-SVE": "Екатеринбург",
}

DASHES = {"—", "–", "-", "—", "", None}


def cell_number(value):
    """Значение из ячейки → int или None (прочерк = нет данных)."""
    if value in DASHES:
        return None
    if isinstance(value, (int, float)):
        return int(value)
    text = str(value).strip()
    return int(float(text)) if text.replace(".", "", 1).isdigit() else None


def read_specialties(wb) -> dict:
    """Лист «Направления и Спецы»: ID → {code, title}."""
    ws = wb["Направления и Спецы"]
    result = {}
    for row in list(ws.iter_rows(values_only=True))[1:]:
        if not row or not row[0]:
            continue
        spec_id = str(row[0]).strip()
        full = (str(row[2]).strip() if len(row) > 2 and row[2] else "")
        if not full:
            continue
        # «09.03.04 Программная инженерия» → код отдельно, название отдельно
        parts = full.split(" ", 1)
        if len(parts) == 2 and parts[0].count(".") == 2:
            result[spec_id] = {"code": parts[0], "title": parts[1].strip()}
        else:
            result[spec_id] = {"code": "", "title": full}
    return result


def read_combos(wb, specialties: dict) -> list:
    """Лист «Баллы вузов»: список комбинаций предметов."""
    ws = wb["Баллы вузов"]
    rows = list(ws.iter_rows(values_only=True))
    header = rows[0]

    # Индексы столбцов ищем по заголовку, а не по номерам — так надёжнее
    id_cols = [j for j, h in enumerate(header) if h and str(h).startswith("ID")]
    uni_cols = {}
    for j, h in enumerate(header):
        key = str(h).strip().lower() if h else ""
        if key in {u[0] for u in UNIVERSITIES}:
            uni_cols[key] = j

    combos = []
    for row in rows[1:]:
        if not row or not row[0]:
            continue
        name = str(row[0]).strip()
        subjects = [s.strip() for s in name.split("/") if s.strip()]

        specs = []
        for j in id_cols:
            if j < len(row) and row[j]:
                spec = specialties.get(str(row[j]).strip())
                if spec:
                    specs.append(spec["code"] + " " + spec["title"] if spec["code"] else spec["title"])

        scores = {}
        for key, j in uni_cols.items():
            scores[key] = cell_number(row[j]) if j < len(row) else None

        combos.append({"name": name, "subjects": subjects,
                       "specialties": specs, "scores": scores})

    return combos


def read_existing_cities() -> dict:
    """Города, которые уже лежат в data.js, но которых нет в main.py.

    Такие города появились в файле раньше (например, Красногорск и Гатчина).
    Без этой функции запуск генератора молча стирал бы их из базы.
    """
    if not OUT.exists():
        return {}

    text = OUT.read_text(encoding="utf-8")
    match = re.search(r"window\.uniData\s*=\s*(\{.*?\n\});", text, re.S)
    if not match:
        return {}

    try:
        return json.loads(match.group(1))
    except json.JSONDecodeError:
        return {}


def read_uni_base() -> dict:
    """UNIVERSITIES_DB из main.py → структура, которую ждёт script.js."""
    tree = ast.parse(MAIN_PY.read_text(encoding="utf-8"))
    db = None
    for node in tree.body:
        if isinstance(node, ast.AnnAssign) and getattr(node.target, "id", "") == "UNIVERSITIES_DB":
            db = ast.literal_eval(node.value)
            break
    if db is None:
        raise SystemExit("Не нашёл UNIVERSITIES_DB в main.py")

    base = {}
    for code, region in db.items():
        city = CITY_BY_REGION.get(code, region["city"])
        base[city] = [{
            "name": u["name"],
            "score": u["min_score"],
            "paidScore": max(0, u["min_score"] - 10),
            "specs": f'{u["badge"]} · бюджетных мест: {u["budget_places"]} · {u["site"]}',
        } for u in region["universities"]]
    return base


def js(value) -> str:
    return json.dumps(value, ensure_ascii=False, indent=4)


def main():
    """Собирает frontend/data.js: только window.uniData."""
    uni_base = read_uni_base()

    # Города, которых нет в main.py, но которые уже были в data.js,
    # сохраняем: иначе запуск генератора их потеряет.
    extra = []
    for city, unis in read_existing_cities().items():
        if city not in uni_base:
            uni_base[city] = unis
            extra.append(city)

    parts = [
        "/* ==========================================================================",
        "   data.js — БАЗА ВУЗОВ ПО ГОРОДАМ (сгенерирован автоматически)",
        "",
        "   НЕ РЕДАКТИРУЙ ВРУЧНУЮ: файл перезаписывается скриптом",
        "       python tools/build_tomsk_data.py",
        "",
        "   Источник: main.py — UNIVERSITIES_DB",
        "",
        "   Подробные данные (баллы, направления, предметы ЕГЭ) здесь не лежат:",
        "   они в папке data/ и подгружаются через frontend/data-loader.js.",
        "",
        f"   Городов в базе: {len(uni_base)}",
        "   ========================================================================== */",
        "",
        "/* Справочная база «город → список вузов» для городов, по которым",
        "   подробной выгрузки пока нет: script.js показывает её как заглушку. */",
        "window.uniData = " + js(uni_base) + ";",
        "",
    ]

    OUT.write_text("\n".join(parts), encoding="utf-8")

    print(f"OK {OUT.relative_to(ROOT)}")
    print(f"   базовых городов: {len(uni_base)}")
    if extra:
        print("   сохранены города, которых нет в main.py: " + ", ".join(extra))
        print("     (добавь их в UNIVERSITIES_DB в main.py, чтобы это не повторялось)")
    print("   подробные данные по городам лежат в data/ и правятся отдельно")


if __name__ == "__main__":
    main()
