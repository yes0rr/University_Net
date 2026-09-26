/* ==========================================================================
   data.js — ЕДИНЫЙ ФАЙЛ ДАННЫХ (сгенерирован автоматически)

   НЕ РЕДАКТИРУЙ ВРУЧНУЮ: файл перезаписывается скриптом
       python tools/build_tomsk_data.py

   Источники:
     · Vuzanet(1).xlsx  — баллы и направления вузов Томска
     · main.py          — UNIVERSITIES_DB (Москва, СПб, Новосибирск,
                          Казань, Екатеринбург)

   Комбинаций предметов: 34
   Направлений:          81
   Вузов Томска:         6
   ========================================================================== */

/* База вузов, которую ждёт script.js. Раньше эта переменная была
   не объявлена вовсе — из-за этого список вузов не появлялся ни для
   одного города (ReferenceError при клике). */
window.uniData = {
    "Москва": [
        {
            "name": "МГУ им. М.В. Ломоносова",
            "score": 275,
            "paidScore": 265,
            "specs": "Топ-1 РФ · бюджетных мест: 4100 · https://msu.ru"
        },
        {
            "name": "НИУ ВШЭ (Высшая школа экономики)",
            "score": 280,
            "paidScore": 270,
            "specs": "ИТ & Экономика · бюджетных мест: 2450 · https://hse.ru"
        },
        {
            "name": "МГТУ им. Н.Э. Баумана",
            "score": 255,
            "paidScore": 245,
            "specs": "Инженерия & ИТ · бюджетных мест: 3500 · https://bmstu.ru"
        }
    ],
    "Санкт-Петербург": [
        {
            "name": "СПбГУ (Санкт-Петербургский гос. университет)",
            "score": 268,
            "paidScore": 258,
            "specs": "Классический · бюджетных мест: 3200 · https://spbu.ru"
        },
        {
            "name": "Университет ИТМО",
            "score": 272,
            "paidScore": 262,
            "specs": "ИТ & Оптика · бюджетных мест: 1400 · https://itmo.ru"
        }
    ],
    "Новосибирск": [
        {
            "name": "Новосибирский государственный университет",
            "score": 250,
            "paidScore": 240,
            "specs": "Академгородок · бюджетных мест: 1600 · https://nsu.ru"
        },
        {
            "name": "НГТУ (Новосибирский гос. тех. университет)",
            "score": 215,
            "paidScore": 205,
            "specs": "Технический · бюджетных мест: 2100 · https://nstu.ru"
        }
    ],
    "Казань": [
        {
            "name": "Казанский федеральный университет",
            "score": 245,
            "paidScore": 235,
            "specs": "Федеральный · бюджетных мест: 3800 · https://kpfu.ru"
        }
    ],
    "Екатеринбург": [
        {
            "name": "Уральский федеральный университет",
            "score": 230,
            "paidScore": 220,
            "specs": "Крупнейший в УрФО · бюджетных мест: 4500 · https://urfu.ru"
        }
    ]
};

/* Данные по вузам Томска из таблицы. Структура:
     combos[].subjects    — пара предметов, например ['мат', 'инфа']
     combos[].scores      — ключ вуза → минимальный балл (или null)
     combos[].specialties — направления, доступные с этой комбинацией */
window.TOMSK_DATA = {
    "city": "Томск",
    "universities": [
        {
            "key": "тусур",
            "short": "ТУСУР",
            "full": "Томский государственный университет систем управления и радиоэлектроники"
        },
        {
            "key": "тпу",
            "short": "ТПУ",
            "full": "Национальный исследовательский Томский политехнический университет"
        },
        {
            "key": "тгу",
            "short": "ТГУ",
            "full": "Национальный исследовательский Томский государственный университет"
        },
        {
            "key": "сибгму",
            "short": "СибГМУ",
            "full": "Сибирский государственный медицинский университет"
        },
        {
            "key": "тгасу",
            "short": "ТГАСУ",
            "full": "Томский государственный архитектурно-строительный университет"
        },
        {
            "key": "тгпу",
            "short": "ТГПУ",
            "full": "Томский государственный педагогический университет"
        }
    ],
    "combos": [
        {
            "name": "мат / инфа",
            "subjects": [
                "мат",
                "инфа"
            ],
            "specialties": [
                "09.03.04 Программная инженерия",
                "01.03.02 Прикладная математика и информатика",
                "09.03.01 Информатика и вычислительная техника",
                "05.03.03 Картография и геоинформатика",
                "35.03.01 Лесное дело"
            ],
            "scores": {
                "тусур": 230,
                "тпу": 220,
                "тгу": 245,
                "сибгму": 140,
                "тгасу": 185,
                "тгпу": 170
            }
        },
        {
            "name": "мат / физ",
            "subjects": [
                "мат",
                "физ"
            ],
            "specialties": [
                "14.03.02 Ядерные физика и технологии",
                "13.03.02 Электроэнергетика и электротехника",
                "22.03.01 Материаловедение и технологии материалов",
                "11.03.03 Конструирование и технология электронных средств"
            ],
            "scores": {
                "тусур": 220,
                "тпу": 230,
                "тгу": 235,
                "сибгму": 140,
                "тгасу": 160,
                "тгпу": 165
            }
        },
        {
            "name": "мат / хим",
            "subjects": [
                "мат",
                "хим"
            ],
            "specialties": [
                "18.03.01 Химическая технология",
                "04.03.01 Химия",
                "20.03.01 Техносферная безопасность"
            ],
            "scores": {
                "тусур": 143,
                "тпу": 153,
                "тгу": 148,
                "сибгму": 140,
                "тгасу": 120,
                "тгпу": 140
            }
        },
        {
            "name": "мат / био",
            "subjects": [
                "мат",
                "био"
            ],
            "specialties": [
                "06.03.01 Биология (Биоинженерия)",
                "35.03.04 Агрономия",
                "19.03.01 Биотехнология"
            ],
            "scores": {
                "тусур": 143,
                "тпу": 153,
                "тгу": 148,
                "сибгму": 135,
                "тгасу": 120,
                "тгпу": 140
            }
        },
        {
            "name": "мат / общество",
            "subjects": [
                "мат",
                "общество"
            ],
            "specialties": [
                "38.03.01 Экономика",
                "38.03.02 Менеджмент",
                "44.03.01 Педагогическое образование (Математика и Обществознание)"
            ],
            "scores": {
                "тусур": 143,
                "тпу": 153,
                "тгу": 148,
                "сибгму": null,
                "тгасу": 120,
                "тгпу": 140
            }
        },
        {
            "name": "мат / история",
            "subjects": [
                "мат",
                "история"
            ],
            "specialties": [
                "46.03.01 История",
                "44.03.05 Пед. образование (с двумя профилями)"
            ],
            "scores": {
                "тусур": 143,
                "тпу": 153,
                "тгу": 148,
                "сибгму": null,
                "тгасу": 120,
                "тгпу": 140
            }
        },
        {
            "name": "мат / геогр",
            "subjects": [
                "мат",
                "геогр"
            ],
            "specialties": [
                "05.03.02 География",
                "21.03.02 Землеустройство и кадастры"
            ],
            "scores": {
                "тусур": 143,
                "тпу": 153,
                "тгу": 148,
                "сибгму": null,
                "тгасу": 120,
                "тгпу": 140
            }
        },
        {
            "name": "мат / ин-яз",
            "subjects": [
                "мат",
                "ин-яз"
            ],
            "specialties": [
                "38.03.06 Торговое дело (Международное)",
                "44.03.05 Пед. образование (Иностранный язык)"
            ],
            "scores": {
                "тусур": 143,
                "тпу": 153,
                "тгу": 148,
                "сибгму": null,
                "тгасу": 120,
                "тгпу": 140
            }
        },
        {
            "name": "хим / био",
            "subjects": [
                "хим",
                "био"
            ],
            "specialties": [
                "31.05.01 Лечебное дело",
                "31.05.03 Стоматология",
                "33.05.01 Фармация"
            ],
            "scores": {
                "тусур": null,
                "тпу": 190,
                "тгу": 230,
                "сибгму": 238,
                "тгасу": null,
                "тгпу": 180
            }
        },
        {
            "name": "физ / био",
            "subjects": [
                "физ",
                "био"
            ],
            "specialties": [
                "30.05.02 Медицинская биофизика",
                "20.03.01 Техносферная безопасность (в медицине)"
            ],
            "scores": {
                "тусур": 143,
                "тпу": 153,
                "тгу": 148,
                "сибгму": 140,
                "тгасу": 120,
                "тгпу": 140
            }
        },
        {
            "name": "инфа / био",
            "subjects": [
                "инфа",
                "био"
            ],
            "specialties": [
                "30.05.03 Медицинская кибернетика",
                "06.03.01 Биоинформатика",
                "39.03.02 Социальная работа"
            ],
            "scores": {
                "тусур": 143,
                "тпу": 153,
                "тгу": 148,
                "сибгму": 140,
                "тгасу": 120,
                "тгпу": 140
            }
        },
        {
            "name": "геогр / био",
            "subjects": [
                "геогр",
                "био"
            ],
            "specialties": [
                "05.03.06 Экология и природопользование",
                "35.03.10 Ландшафтная архитектура"
            ],
            "scores": {
                "тусур": null,
                "тпу": 153,
                "тгу": 148,
                "сибгму": 140,
                "тгасу": null,
                "тгпу": 140
            }
        },
        {
            "name": "ин-яз / био",
            "subjects": [
                "ин-яз",
                "био"
            ],
            "specialties": [
                "37.03.01 Психология (Клиническая/Международная)",
                "44.03.02 Психолого-педагогическое образование"
            ],
            "scores": {
                "тусур": null,
                "тпу": 153,
                "тгу": 148,
                "сибгму": 140,
                "тгасу": null,
                "тгпу": 140
            }
        },
        {
            "name": "физ / хим",
            "subjects": [
                "физ",
                "хим"
            ],
            "specialties": [
                "04.05.01 Фундаментальная и прикладная химия",
                "18.03.02 Энерго- и ресурсосберегающие процессы"
            ],
            "scores": {
                "тусур": 143,
                "тпу": 153,
                "тгу": 148,
                "сибгму": 140,
                "тгасу": 120,
                "тгпу": 140
            }
        },
        {
            "name": "хим / инфа",
            "subjects": [
                "хим",
                "инфа"
            ],
            "specialties": [
                "18.03.01 Химическая технология (Цифровая)",
                "28.03.02 Наноинженерия"
            ],
            "scores": {
                "тусур": 143,
                "тпу": 153,
                "тгу": 148,
                "сибгму": 140,
                "тгасу": 120,
                "тгпу": 140
            }
        },
        {
            "name": "общество / история",
            "subjects": [
                "общество",
                "история"
            ],
            "specialties": [
                "40.03.01 Юриспруденция",
                "41.03.05 Международные отношения",
                "39.03.01 Социология"
            ],
            "scores": {
                "тусур": 143,
                "тпу": null,
                "тгу": 250,
                "сибгму": null,
                "тгасу": null,
                "тгпу": 210
            }
        },
        {
            "name": "общество / био",
            "subjects": [
                "общество",
                "био"
            ],
            "specialties": [
                "37.03.01 Психология",
                "44.03.03 Специальное (дефектологическое) образование"
            ],
            "scores": {
                "тусур": 143,
                "тпу": 153,
                "тгу": 148,
                "сибгму": 140,
                "тгасу": null,
                "тгпу": 140
            }
        },
        {
            "name": "общество / ин-яз",
            "subjects": [
                "общество",
                "ин-яз"
            ],
            "specialties": [
                "41.03.01 Зарубежное регионоведение",
                "42.03.01 Реклама и связи с общественностью",
                "44.03.05 Пед. образование (Общ + Ино)"
            ],
            "scores": {
                "тусур": 143,
                "тпу": null,
                "тгу": 148,
                "сибгму": null,
                "тгасу": null,
                "тгпу": 140
            }
        },
        {
            "name": "общество / лит",
            "subjects": [
                "общество",
                "лит"
            ],
            "specialties": [
                "42.03.02 Журналистика",
                "51.03.01 Культурология"
            ],
            "scores": {
                "тусур": 143,
                "тпу": null,
                "тгу": 148,
                "сибгму": null,
                "тгасу": null,
                "тгпу": 140
            }
        },
        {
            "name": "общество / физ",
            "subjects": [
                "общество",
                "физ"
            ],
            "specialties": [
                "44.03.01 Педагогическое образование (Физическая культура)",
                "38.03.02 Менеджмент в спорте"
            ],
            "scores": {
                "тусур": 143,
                "тпу": 153,
                "тгу": 148,
                "сибгму": 140,
                "тгасу": 120,
                "тгпу": 140
            }
        },
        {
            "name": "общество / инфа",
            "subjects": [
                "общество",
                "инфа"
            ],
            "specialties": [
                "38.03.05 Бизнес-информатика",
                "42.03.01 Медиакоммуникации",
                "44.03.01 Информатика в образовании"
            ],
            "scores": {
                "тусур": 143,
                "тпу": 153,
                "тгу": 148,
                "сибгму": 140,
                "тгасу": 120,
                "тгпу": 140
            }
        },
        {
            "name": "общество / геогр",
            "subjects": [
                "общество",
                "геогр"
            ],
            "specialties": [
                "43.03.02 Туризм",
                "44.03.01 География в образовании"
            ],
            "scores": {
                "тусур": 143,
                "тпу": null,
                "тгу": 148,
                "сибгму": null,
                "тгасу": null,
                "тгпу": 140
            }
        },
        {
            "name": "общество / хим",
            "subjects": [
                "общество",
                "хим"
            ],
            "specialties": [
                "44.03.01 Химия и обществознание в школе"
            ],
            "scores": {
                "тусур": 143,
                "тпу": 153,
                "тгу": 148,
                "сибгму": 140,
                "тгасу": null,
                "тгпу": 140
            }
        },
        {
            "name": "история / ин-яз",
            "subjects": [
                "история",
                "ин-яз"
            ],
            "specialties": [
                "41.03.05 Международные отношения и дипломатия",
                "46.03.01 История и иностранный язык"
            ],
            "scores": {
                "тусур": null,
                "тпу": null,
                "тгу": 148,
                "сибгму": null,
                "тгасу": null,
                "тгпу": 140
            }
        },
        {
            "name": "история / лит",
            "subjects": [
                "история",
                "лит"
            ],
            "specialties": [
                "50.03.03 История искусств",
                "46.03.01 Историческое краеведение"
            ],
            "scores": {
                "тусур": null,
                "тпу": null,
                "тгу": 148,
                "сибгму": null,
                "тгасу": null,
                "тгпу": 140
            }
        },
        {
            "name": "история / инфа",
            "subjects": [
                "история",
                "инфа"
            ],
            "specialties": [
                "46.03.01 Цифровая гуманитаристика (Digital Humanities)",
                "46.03.02 Документоведение и архивоведение"
            ],
            "scores": {
                "тусур": 143,
                "тпу": 153,
                "тгу": 148,
                "сибгму": 140,
                "тгасу": 120,
                "тгпу": 140
            }
        },
        {
            "name": "история / геогр",
            "subjects": [
                "история",
                "геогр"
            ],
            "specialties": [
                "43.03.02 Историко-культурный туризм",
                "44.03.01 История и география"
            ],
            "scores": {
                "тусур": null,
                "тпу": null,
                "тгу": 148,
                "сибгму": null,
                "тгасу": null,
                "тгпу": 140
            }
        },
        {
            "name": "инфа / ин-яз",
            "subjects": [
                "инфа",
                "ин-яз"
            ],
            "specialties": [
                "45.03.04 Интеллектуальные системы в гуманитарной сфере",
                "44.03.01 Цифровой лингвист"
            ],
            "scores": {
                "тусур": 143,
                "тпу": 153,
                "тгу": 148,
                "сибгму": 140,
                "тгасу": 120,
                "тгпу": 140
            }
        },
        {
            "name": "лит / ин-яз",
            "subjects": [
                "лит",
                "ин-яз"
            ],
            "specialties": [
                "45.03.02 Лингвистика (Перевод и переводоведение)",
                "45.03.01 Филология (Зарубежная филология)"
            ],
            "scores": {
                "тусур": null,
                "тпу": null,
                "тгу": 148,
                "сибгму": null,
                "тгасу": null,
                "тгпу": 140
            }
        },
        {
            "name": "геогр / ин-яз",
            "subjects": [
                "геогр",
                "ин-яз"
            ],
            "specialties": [
                "05.03.02 Международный туризм и геоурбанистика",
                "44.03.01 География и английский язык"
            ],
            "scores": {
                "тусур": null,
                "тпу": null,
                "тгу": 148,
                "сибгму": null,
                "тгасу": null,
                "тгпу": 140
            }
        },
        {
            "name": "физ / инфа",
            "subjects": [
                "физ",
                "инфа"
            ],
            "specialties": [
                "10.03.01 Информационная безопасность",
                "11.03.02 Инфокоммуникационные технологии и системы связи",
                "03.03.02 Физика (Вычислительная физика)"
            ],
            "scores": {
                "тусур": 143,
                "тпу": 153,
                "тгу": 148,
                "сибгму": 140,
                "тгасу": 120,
                "тгпу": 140
            }
        },
        {
            "name": "инфа / геогр",
            "subjects": [
                "инфа",
                "геогр"
            ],
            "specialties": [
                "05.03.03 ГИС-технологии в мониторинге среды",
                "21.03.03 Геодезия и дистанционное зондирование"
            ],
            "scores": {
                "тусур": 143,
                "тпу": 153,
                "тгу": 148,
                "сибгму": 140,
                "тгасу": 120,
                "тгпу": 140
            }
        },
        {
            "name": "физ / геогр",
            "subjects": [
                "физ",
                "геогр"
            ],
            "specialties": [
                "05.03.04 Гидрометеорология",
                "21.05.02 Прикладная геология"
            ],
            "scores": {
                "тусур": 143,
                "тпу": 153,
                "тгу": 148,
                "сибгму": 140,
                "тгасу": 120,
                "тгпу": 140
            }
        },
        {
            "name": "хим / геогр",
            "subjects": [
                "хим",
                "геогр"
            ],
            "specialties": [
                "05.03.06 Экологическая геохимия",
                "44.03.01 Химия и география"
            ],
            "scores": {
                "тусур": null,
                "тпу": 153,
                "тгу": 148,
                "сибгму": 140,
                "тгасу": null,
                "тгпу": 140
            }
        }
    ],
    "totalSpecialties": 81
};

/* ============================================================================
   Логика отображения вузов Томска (подключается после script.js)
   Этот блок попадает в frontend/data.js при генерации.

   Как устроена панель
   -------------------
   Пользователь выбирает НАПРАВЛЕНИЕ (специальность), а не комбинацию предметов.
   Направление однозначно определяет, какие предметы ЕГЭ нужны, поэтому
   комбинация подставляется автоматически.

     1. ОБЗОР (направление не выбрано) — все 6 вузов с диапазоном проходных
        баллов по всем направлениям и числом направлений.
     2. НАПРАВЛЕНИЕ ВЫБРАНО — вузы сортируются по проходному баллу, а те,
        у кого этого направления нет, отбрасываются. Для оставшихся виден
        проходной балл и метка «Проходит / Не хватает» по сумме баллов ЕГЭ.

   Важное ограничение данных: таблица хранит баллы по (комбинация предметов ×
   вуз), а не по (направление × вуз). Поэтому все направления внутри одной
   комбинации показывают одинаковый проходной балл.

   script.js не изменяется: его updateSidebarUnis() перехватывается,
   а для всех городов кроме Томска вызывается оригинал.
   ============================================================================ */

(function () {
    "use strict";

    var T = window.TOMSK_DATA;
    if (!T || typeof window.updateSidebarUnis !== "function") return;

    /* Названия предметов в калькуляторе ЕГЭ → сокращения, как в таблице */
    var SUBJECT_TO_SHORT = {
        "Математика (профиль)": "мат",
        "Информатика": "инфа",
        "Физика": "физ",
        "Химия": "хим",
        "Биология": "био",
        "Обществознание": "общество",
        "История": "история",
        "География": "геогр",
        "Иностранный язык": "ин-яз",
        "Литература": "лит",
        "Русский язык": "рус"        /* обязательный, в комбинациях не участвует */
    };

    /* Сокращения из таблицы → человеческие названия для подписи */
    var SHORT_TO_LABEL = {
        "мат": "математика",
        "инфа": "информатика",
        "физ": "физика",
        "хим": "химия",
        "био": "биология",
        "общество": "обществознание",
        "история": "история",
        "геогр": "география",
        "ин-яз": "иностранный язык",
        "лит": "литература"
    };

    var originalUpdateSidebarUnis = window.updateSidebarUnis;
    var selectedDirection = null;   /* строка вида «09.03.04 Программная инженерия» */

    /* Регионы на карте, клик по которым должен показывать вузы Томска.
       Дополняй словарь, если появятся данные по другим областям. */
    var REGION_TO_CITY = {
        "Томская область": "Томск"
    };

    /* ── Состояние интерфейса ────────────────────────────────────────────── */

    function currentCity() {
        var title = document.getElementById("sidebar-region-title");
        if (!title) return null;
        var m = (title.innerText || "").match(/^ВУЗ[ыа]\s+(.+)$/i);
        if (!m) return null;
        var name = m[1].trim();
        /* «ВУЗы города Томск», «Вузы Томска и Томской области» → город Томск */
        if (/Томск/i.test(name)) return T.city;
        return name;
    }

    function chosenShorts() {
        return Array.prototype.slice
            .call(document.querySelectorAll(".ege-select"))
            .map(function (s) { return SUBJECT_TO_SHORT[s.value]; })
            .filter(Boolean);
    }

    function currentTotal() {
        var n = Number(document.getElementById("total-ege-score") &&
                       document.getElementById("total-ege-score").innerText);
        return isNaN(n) ? 0 : n;
    }

    function currentStudyType() {
        var el = document.querySelector('input[name="studyType"]:checked');
        return el ? el.value : "budget";
    }

    /* Комбинация, подходящая под выбранные предметы ЕГЭ */
    function autoCombo() {
        var shorts = chosenShorts();
        for (var i = 0; i < T.combos.length; i++) {
            var c = T.combos[i];
            if (c.subjects.length === 2 &&
                shorts.indexOf(c.subjects[0]) !== -1 &&
                shorts.indexOf(c.subjects[1]) !== -1) return c;
        }
        return null;
    }

    /* ── Направления ─────────────────────────────────────────────────────── */

    /* Плоский список направлений с привязкой к комбинации предметов.
       Направление встречается в таблице ровно один раз, поэтому карта
       «название → комбинация» однозначна. */
    function directionIndex() {
        var items = [];
        T.combos.forEach(function (c) {
            c.specialties.forEach(function (text) {
                items.push({ text: text, combo: c });
            });
        });
        items.sort(function (a, b) { return a.text.localeCompare(b.text, "ru"); });
        return items;
    }

    function comboByDirection(text) {
        var found = null;
        T.combos.forEach(function (c) {
            if (c.specialties.indexOf(text) !== -1) found = c;
        });
        return found;
    }

    function subjectsLabel(combo) {
        return combo.subjects
            .map(function (s) { return SHORT_TO_LABEL[s] || s; })
            .join(" + ");
    }

    function esc(s) {
        return String(s).replace(/[&<>"]/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
        });
    }

    /* Склонение существительных: plural(6, 'вуз', 'вуза', 'вузов') → 'вузов' */
    function plural(n, one, few, many) {
        var n10 = n % 10, n100 = n % 100;
        if (n10 === 1 && n100 !== 11) return one;
        if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return few;
        return many;
    }

    /* Баллы вуза по всем комбинациям — для режима обзора */
    function scoreRange(uniKey) {
        var vals = T.combos
            .map(function (c) { return c.scores[uniKey]; })
            .filter(function (v) { return typeof v === "number"; });
        if (!vals.length) return null;
        return { min: Math.min.apply(null, vals), max: Math.max.apply(null, vals) };
    }

    function directionCount(uniKey) {
        var seen = {};
        T.combos.forEach(function (c) {
            if (typeof c.scores[uniKey] !== "number") return;
            c.specialties.forEach(function (s) { seen[s] = 1; });
        });
        return Object.keys(seen).length;
    }

    /* ── Отрисовка ───────────────────────────────────────────────────────── */

    function directionSelectHtml(activeText, auto) {
        var match = auto ? auto.specialties : null;

        var html = '<option value=""' + (activeText ? "" : " selected") +
                   ">— выберите направление —</option>";

        var items = directionIndex();
        var inMatch = [], rest = [];
        items.forEach(function (it) {
            (match && match.indexOf(it.text) !== -1 ? inMatch : rest).push(it);
        });

        function options(list) {
            return list.map(function (it) {
                var sel = it.text === activeText ? " selected" : "";
                return '<option value="' + esc(it.text) + '"' + sel + ">" +
                       esc(it.text) + "</option>";
            }).join("");
        }

        if (inMatch.length) {
            html += '<optgroup label="Подходят под ваши предметы (' +
                    esc(auto.name) + ')">' + options(inMatch) + "</optgroup>";
        }
        html += '<optgroup label="Все направления">' + options(rest) + "</optgroup>";

        return '<div class="tomsk-panel">' +
                 '<label class="tomsk-label" for="tomsk-direction">Направление</label>' +
                 '<select id="tomsk-direction" class="tomsk-select">' + html + "</select>" +
                 '<div class="tomsk-hint">Выберите специальность — панель покажет вузы, ' +
                 "где она есть, и проходные баллы</div>" +
               "</div>";
    }

    /* Карточка в режиме обзора: баллы по всем комбинациям */
    function overviewCardHtml(u) {
        var range = scoreRange(u.key);
        var dirs = directionCount(u.key);
        var scoreLine = range
            ? '<span>Проходной балл: <strong>' + range.min + "–" + range.max +
              "</strong></span>"
            : '<span class="tomsk-none">Нет данных</span>';

        return '<div class="uni-item">' +
                 '<div class="uni-item-header">' +
                   '<div class="uni-item-name">' + esc(u.short) + " — " + esc(u.full) + "</div>" +
                   '<div class="uni-item-info">' + scoreLine +
                     "<span>" + dirs + " " +
                     plural(dirs, "направление", "направления", "направлений") +
                     "</span></div>" +
                 "</div>" +
               "</div>";
    }

    /* Карточка по выбранному направлению: только проходной балл и вердикт */
    function directionCardHtml(u, combo, total, studyType) {
        var min = combo.scores[u.key];
        var badge = "";
        if (total > 0) {
            var pass = total >= min;
            badge = '<span class="' + (pass ? "badge-pass" : "badge-fail") + '">' +
                    (pass ? "Проходит" : "Не хватает") + "</span>";
        }

        return '<div class="uni-item">' +
                 '<div class="uni-item-header">' +
                   '<div class="uni-item-name">' + esc(u.short) + " — " + esc(u.full) + "</div>" +
                   '<div class="uni-item-info">' +
                     "<span>Проходной балл: <strong>" + min + "</strong>" +
                     (studyType === "paid"
                        ? " <em>(данных о платном приёме в таблице нет)</em>" : "") +
                     "</span>" + badge +
                   "</div>" +
                 "</div>" +
               "</div>";
    }

    function renderTomsk() {
        var list = document.getElementById("sidebar-unis-list");
        if (!list) return;

        var auto = autoCombo();
        var combo = selectedDirection ? comboByDirection(selectedDirection) : null;
        var total = currentTotal();
        var studyType = currentStudyType();

        var html = directionSelectHtml(selectedDirection, auto);

        /* ── Режим обзора ── */
        if (!combo) {
            html += '<div class="tomsk-summary">В Томске <strong>' +
                    T.universities.length + "</strong> " +
                    plural(T.universities.length, "вуз", "вуза", "вузов") + " · <strong>" +
                    T.totalSpecialties + "</strong> " +
                    plural(T.totalSpecialties, "направление", "направления", "направлений") +
                    ". Выберите направление, чтобы увидеть проходные баллы.</div>";
            html += T.universities.map(overviewCardHtml).join("");
            list.innerHTML = html;
            bindEvents();
            return;
        }

        /* ── Режим направления ── */

        /* Вузы с этим направлением — по возрастанию проходного балла,
           чтобы первыми шли те, куда поступить проще. Остальные отбрасываются. */
        var withDirection = T.universities
            .filter(function (u) { return typeof combo.scores[u.key] === "number"; })
            .sort(function (a, b) { return combo.scores[a.key] - combo.scores[b.key]; });
        var without = T.universities.filter(function (u) {
            return typeof combo.scores[u.key] !== "number";
        });

        var summary = "<strong>" + esc(selectedDirection) + "</strong><br>" +
                      "Предметы ЕГЭ: " + esc(subjectsLabel(combo)) + " · " +
                      "вузов с направлением: <strong>" + withDirection.length +
                      "</strong> из " + T.universities.length;
        if (total > 0) {
            var passing = withDirection.filter(function (u) {
                return total >= combo.scores[u.key];
            }).length;
            summary += "<br>С суммой <strong>" + total + "</strong> проходит в <strong>" +
                       passing + "</strong> " +
                       plural(passing, "вуз", "вуза", "вузов");
        }
        html += '<div class="tomsk-summary">' + summary + "</div>";

        html += withDirection.map(function (u) {
            return directionCardHtml(u, combo, total, studyType);
        }).join("");

        if (without.length) {
            html += '<div class="tomsk-dropped">Без этого направления: ' +
                    without.map(function (u) { return esc(u.short); }).join(", ") + "</div>";
        }

        list.innerHTML = html;
        bindEvents();
    }

    function bindEvents() {
        var select = document.getElementById("tomsk-direction");
        if (select) {
            select.addEventListener("change", function () {
                selectedDirection = this.value || null;
                renderTomsk();
            });
        }
    }

    /* ── Стили ───────────────────────────────────────────────────────────── */

    var style = document.createElement("style");
    style.textContent =
        ".tomsk-panel{margin-bottom:10px;padding:10px;background:#111827;" +
        "border:1px solid #374151;border-radius:8px}" +
        ".tomsk-label{display:block;font-size:11px;text-transform:uppercase;" +
        "letter-spacing:.04em;color:#94a3b8;margin-bottom:6px}" +
        ".tomsk-select{width:100%;padding:8px;background:#1f2937;color:#f8fafc;" +
        "border:1px solid #374151;border-radius:6px;font-size:12px}" +
        ".tomsk-hint{margin-top:6px;font-size:11px;color:#94a3b8;line-height:1.4}" +
        ".tomsk-summary{margin:0 0 10px;padding:8px 10px;background:#1e293b;" +
        "border-left:3px solid #3b82f6;border-radius:4px;font-size:12px;" +
        "color:#cbd5e1;line-height:1.5}" +
        ".tomsk-dropped{margin-top:8px;font-size:11px;color:#64748b;line-height:1.4}" +
        ".tomsk-none{color:#94a3b8;font-style:italic}" +
        ".uni-item-info em{font-style:normal;color:#94a3b8;font-size:11px}" +
        ".ege-input::placeholder{color:#64748b}";
    document.head.appendChild(style);

    /* ── Клик по региону на карте ────────────────────────────────────────── */

    /* script.js по клику на регион только приближает карту и не наполняет панель.
       Здесь добавляем недостающее: «Томская область» наполняет панель так же,
       как клик по точке Томска.

       Слушатель вешается на фазу ПЕРЕХВАТА (третий аргумент true), потому что
       обработчик script.js вызывает e.stopPropagation() — до документа событие
       в обычной фазе не долетает, а перехват происходит раньше и не блокируется. */
    document.addEventListener("click", function (e) {
        var region = e.target && e.target.closest ? e.target.closest(".region") : null;
        if (!region) return;

        var title = document.getElementById("sidebar-region-title");
        var list = document.getElementById("sidebar-unis-list");
        var city = REGION_TO_CITY[region.getAttribute("data-region-name") || ""];

        if (city) {
            window.selectCity(city);
            /* Уточняем заголовок: кликнули область, а не город */
            if (title) title.innerText = "Вузы Томска и Томской области";
            renderTomsk();
            return;
        }

        /* Ушли в другой регион — возвращаем заглушку, чтобы панель не показывала
           тюменские вузы под новосибирской областью. */
        if (title && /Томск/i.test(title.innerText || "")) {
            title.innerText = "ВУЗы региона";
            if (list) {
                list.innerHTML = '<p style="font-size: 12px; color: #94a3b8;">' +
                    "Выберите город на карте для просмотра доступных ВУЗов.</p>";
            }
        }
    }, true);

    /* ── Обновление данных на лету ───────────────────────────────────────── */

    /* Вызывается из tomsk-loader.js после загрузки data/*.json.
       Меняем поля существующего объекта (T === window.TOMSK_DATA), поэтому
       закрытие сохраняет актуальную ссылку и панель перерисовывается. */
    window.__TOMSK_APPLY = function (fresh) {
        if (!fresh) return false;
        if (fresh.universities && fresh.universities.length) T.universities = fresh.universities;
        if (fresh.combos && fresh.combos.length) T.combos = fresh.combos;
        if (typeof fresh.totalSpecialties === "number") T.totalSpecialties = fresh.totalSpecialties;
        if (fresh.city) T.city = fresh.city;

        /* Направления могли переименовать — сбрасываем несуществующий выбор */
        if (selectedDirection && !comboByDirection(selectedDirection)) selectedDirection = null;

        if (currentCity() === T.city) renderTomsk();   /* Томск сейчас открыт — обновляем */
        return true;
    };
    window.__TOMSK_UI_READY = true;

    /* ── Перехват updateSidebarUnis ──────────────────────────────────────── */

    window.updateSidebarUnis = function () {
        if (currentCity() !== T.city) {
            selectedDirection = null;
            return originalUpdateSidebarUnis.apply(this, arguments);
        }
        renderTomsk();
    };
})();
