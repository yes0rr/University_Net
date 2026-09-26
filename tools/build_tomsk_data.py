#!/usr/bin/env python3
"""
Генератор frontend/data.js из таблицы Vuzanet(1).xlsx.

Запуск (из корня проекта):
    python tools/build_tomsk_data.py

Что делает:
  1. читает листы «Баллы вузов» и «Направления и Спецы»;
  2. собирает структуру window.TOMSK_DATA;
  3. берёт UNIVERSITIES_DB из main.py и добавляет его как window.uniData
     (в script.js эта переменная используется, но нигде не была объявлена);
  4. дописывает логику из tools/tomsk_frontend.js;
  5. сохраняет результат в frontend/data.js.

Файл frontend/data.js генерируется — правки в нём вручную затрёт
следующий запуск этого скрипта. Правь tools/tomsk_frontend.js.
"""

import ast
import json
from pathlib import Path

import openpyxl

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
    wb = openpyxl.load_workbook(XLSX, data_only=True)
    specialties = read_specialties(wb)
    combos = read_combos(wb, specialties)
    uni_base = read_uni_base()

    unique_specialties = set()
    for c in combos:
        unique_specialties.update(c["specialties"])

    tomsk = {
        "city": "Томск",
        "universities": [{"key": k, "short": s, "full": f} for k, s, f in UNIVERSITIES],
        "combos": combos,
        "totalSpecialties": len(unique_specialties),
    }

    logic = LOGIC_JS.read_text(encoding="utf-8")

    parts = [
        "/* ==========================================================================",
        "   data.js — ЕДИНЫЙ ФАЙЛ ДАННЫХ (сгенерирован автоматически)",
        "",
        "   НЕ РЕДАКТИРУЙ ВРУЧНУЮ: файл перезаписывается скриптом",
        "       python tools/build_tomsk_data.py",
        "",
        "   Источники:",
        "     · Vuzanet(1).xlsx  — баллы и направления вузов Томска",
        "     · main.py          — UNIVERSITIES_DB (Москва, СПб, Новосибирск,",
        "                          Казань, Екатеринбург)",
        "",
        f"   Комбинаций предметов: {len(combos)}",
        f"   Направлений:          {sum(len(c['specialties']) for c in combos)}",
        f"   Вузов Томска:         {len(UNIVERSITIES)}",
        "   ========================================================================== */",
        "",
        "/* База вузов, которую ждёт script.js. Раньше эта переменная была",
        "   не объявлена вовсе — из-за этого список вузов не появлялся ни для",
        "   одного города (ReferenceError при клике). */",
        "window.uniData = " + js(uni_base) + ";",
        "",
        "/* Данные по вузам Томска из таблицы. Структура:",
        "     combos[].subjects    — пара предметов, например ['мат', 'инфа']",
        "     combos[].scores      — ключ вуза → минимальный балл (или null)",
        "     combos[].specialties — направления, доступные с этой комбинацией */",
        "window.TOMSK_DATA = " + js(tomsk) + ";",
        "",
        logic,
    ]

    OUT.write_text("\n".join(parts), encoding="utf-8")

    print(f"✅ {OUT.relative_to(ROOT)}")
    print(f"   комбинаций: {len(combos)}, "
          f"направлений: {sum(len(c['specialties']) for c in combos)} "
          f"(уникальных {len(unique_specialties)}), "
          f"вузов: {len(UNIVERSITIES)}")
    print(f"   базовых городов: {len(uni_base)}")


if __name__ == "__main__":
    main()
