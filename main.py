from pathlib import Path
from typing import Dict

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

# Абсолютные пути: приложение работает из любой рабочей папки,
# а не только когда запущено из корня проекта.
BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BASE_DIR / "frontend"

app = FastAPI(title="Поиск ВУЗов - MAX Mini App")

# База данных ВУЗов по регионам (демо-данные)
UNIVERSITIES_DB: Dict[str, Dict] = {
    "RU-MOW": {
        "region_name": "Москва",
        "city": "Москва",
        "universities": [
            {
                "name": "МГУ им. М.В. Ломоносова",
                "badge": "Топ-1 РФ",
                "budget_places": 4100,
                "min_score": 275,
                "site": "https://msu.ru"
            },
            {
                "name": "НИУ ВШЭ (Высшая школа экономики)",
                "badge": "ИТ & Экономика",
                "budget_places": 2450,
                "min_score": 280,
                "site": "https://hse.ru"
            },
            {
                "name": "МГТУ им. Н.Э. Баумана",
                "badge": "Инженерия & ИТ",
                "budget_places": 3500,
                "min_score": 255,
                "site": "https://bmstu.ru"
            }
        ]
    },
    "RU-SPE": {
        "region_name": "Санкт-Петербург",
        "city": "Санкт-Петербург",
        "universities": [
            {
                "name": "СПбГУ (Санкт-Петербургский гос. университет)",
                "badge": "Классический",
                "budget_places": 3200,
                "min_score": 268,
                "site": "https://spbu.ru"
            },
            {
                "name": "Университет ИТМО",
                "badge": "ИТ & Оптика",
                "budget_places": 1400,
                "min_score": 272,
                "site": "https://itmo.ru"
            }
        ]
    },
    "RU-NVR": {
        "region_name": "Новосибирская область",
        "city": "Новосибирск",
        "universities": [
            {
                "name": "Новосибирский государственный университет",
                "badge": "Академгородок",
                "budget_places": 1600,
                "min_score": 250,
                "site": "https://nsu.ru"
            },
            {
                "name": "НГТУ (Новосибирский гос. тех. университет)",
                "badge": "Технический",
                "budget_places": 2100,
                "min_score": 215,
                "site": "https://nstu.ru"
            }
        ]
    },
    "RU-TAT": {
        "region_name": "Республика Татарстан",
        "city": "Казань",
        "universities": [
            {
                "name": "Казанский федеральный университет",
                "badge": "Федеральный",
                "budget_places": 3800,
                "min_score": 245,
                "site": "https://kpfu.ru"
            }
        ]
    },
    "RU-SVE": {
        "region_name": "Свердловская область",
        "city": "Екатеринбург",
        "universities": [
            {
                "name": "Уральский федеральный университет",
                "badge": "Крупнейший в УрФО",
                "budget_places": 4500,
                "min_score": 230,
                "site": "https://urfu.ru"
            }
        ]
    }
}

@app.get("/api/universities/{region_code}")
async def get_universities(region_code: str):
    region_data = UNIVERSITIES_DB.get(region_code.upper())
    if not region_data:
        return {
            "region_name": region_code,
            "city": "Региональный центр",
            "universities": [
                {
                    "name": f"Государственный Университет ({region_code})",
                    "badge": "Региональный ВУЗ",
                    "budget_places": 1200,
                    "min_score": 195,
                    "site": "#"
                }
            ]
        }
    return region_data


# Данные о вузах в формате JSON: data/tomsk.json и data/subj.json.
# Лежат в корне проекта, поэтому монтируем отдельно — фронтенд их забирает
# через fetch ("data/tomsk.json"). Монтируется до "/", иначе перехватит
# раздача фронтенда. Папки может не быть — тогда просто пропускаем.
DATA_DIR = BASE_DIR / "data"
if DATA_DIR.is_dir():
    app.mount("/data", StaticFiles(directory=str(DATA_DIR)), name="data")


# Раздача фронтенда монтируется ПОСЛЕДНЕЙ, чтобы не перекрывать /api и /data.
# html=True отдаёт frontend/index.html на запрос "/" — раньше здесь стоял
# FileResponse("templates/index.html"), а такого файла в проекте нет, и
# главная страница отвечала ошибкой 500.
app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")