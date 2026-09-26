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

   Панель никогда не бывает пустой — два режима:

     1. ОБЗОР (предметы ЕГЭ ещё не выбраны) — показываются все 6 вузов
        с диапазоном проходных баллов и числом направлений.
     2. КОМБИНАЦИЯ (выбраны два предмета или комбинация задана вручную) —
        для каждого вуза точный минимальный балл, метка «Проходит / Не хватает»
        и список направлений именно этой комбинации.

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

    var originalUpdateSidebarUnis = window.updateSidebarUnis;
    var forcedCombo = null;      /* комбинация, выбранная вручную в списке */
    var forceOverview = false;   /* пользователь выбрал «все комбинации» */

    /* ── Состояние интерфейса ────────────────────────────────────────────── */

    function currentCity() {
        var title = document.getElementById("sidebar-region-title");
        if (!title) return null;
        var m = (title.innerText || "").match(/^ВУЗы города\s+(.+)$/);
        return m ? m[1].trim() : null;
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

    function comboByName(name) {
        for (var i = 0; i < T.combos.length; i++) {
            if (T.combos[i].name === name) return T.combos[i];
        }
        return null;
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

    function comboSelectHtml(active, auto) {
        /* Первый пункт — обзор. Он же выбран, если комбинация не определена. */
        var options = '<option value=""' + (active ? "" : " selected") +
                      ">— все комбинации —</option>";
        if (active) {
            options += '<option value="' + esc(active.name) + '" selected>' +
                       esc(active.name) + " · " + active.specialties.length + " напр.</option>";
        }
        T.combos.forEach(function (c) {
            if (active && c.name === active.name) return;
            options += '<option value="' + esc(c.name) + '">' + esc(c.name) +
                       " · " + c.specialties.length + " напр.</option>";
        });

        var hint;
        if (auto) {
            hint = '<div class="tomsk-hint tomsk-hint-ok">Подобрана по вашим предметам</div>';
        } else if (forcedCombo) {
            hint = '<div class="tomsk-hint">Выбрана вручную · ' +
                   '<a href="#" id="tomsk-auto">вернуть автоподбор</a></div>';
        } else {
            hint = '<div class="tomsk-hint">Выберите два предмета в калькуляторе — ' +
                   'комбинация подберётся сама</div>';
        }

        return '<div class="tomsk-panel">' +
                 '<label class="tomsk-label" for="tomsk-combo">Комбинация предметов ЕГЭ</label>' +
                 '<select id="tomsk-combo" class="tomsk-select">' + options + "</select>" +
                 hint +
               "</div>";
    }

    /* Карточка в режиме обзора: баллы по всем комбинациям */
    function overviewCardHtml(u) {
        var range = scoreRange(u.key);
        var dirs = directionCount(u.key);
        var scoreLine = range
            ? '<span>Проходной балл: <strong>' + range.min + "–" + range.max +
              "</strong> <em>(зависит от комбинации)</em></span>"
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

    /* Карточка в режиме комбинации: точный балл и направления */
    function comboCardHtml(u, combo, total, studyType) {
        var min = combo.scores[u.key];
        var hasScore = typeof min === "number";

        var badge = "";
        if (hasScore && total > 0) {
            var pass = total >= min;
            badge = '<span class="' + (pass ? "badge-pass" : "badge-fail") + '">' +
                    (pass ? "Проходит" : "Не хватает") + "</span>";
        }

        var scoreLine = hasScore
            ? '<span>Мин. балл: <strong>' + min + "</strong>" +
              (studyType === "paid" ? " <em>(данных о платном приёме в таблице нет)</em>" : "") +
              "</span>"
            : '<span class="tomsk-none">Нет данных по этой комбинации</span>';

        var specs = combo.specialties.map(function (s) {
            return '<div class="uni-detail-row">' + esc(s) + "</div>";
        }).join("");

        return '<div class="uni-item">' +
                 '<div class="uni-item-header">' +
                   '<div class="uni-item-name">' + esc(u.short) + " — " + esc(u.full) + "</div>" +
                   '<div class="uni-item-info">' + scoreLine + badge + "</div>" +
                 "</div>" +
                 '<div class="uni-item-details">' +
                   '<div class="uni-detail-row"><strong>Направлений по комбинации: ' +
                     combo.specialties.length + "</strong></div>" + specs +
                 "</div>" +
               "</div>";
    }

    function renderTomsk() {
        var list = document.getElementById("sidebar-unis-list");
        if (!list) return;

        var auto = autoCombo();
        var combo = forcedCombo ? comboByName(forcedCombo)
                                : (forceOverview ? null : auto);
        var total = currentTotal();
        var studyType = currentStudyType();

        var html = comboSelectHtml(combo, auto && !forcedCombo);

        if (!combo) {
            /* ── Режим обзора: список вузов виден сразу ── */
            html += '<div class="tomsk-summary">В Томске <strong>' +
                    T.universities.length + "</strong> " +
                    plural(T.universities.length, "вуз", "вуза", "вузов") + " · <strong>" +
                    T.totalSpecialties + "</strong> " +
                    plural(T.totalSpecialties, "направление", "направления", "направлений") +
                    " · <strong>" + T.combos.length + "</strong> " +
                    plural(T.combos.length, "комбинация", "комбинации", "комбинаций") +
                    " предметов. Укажите баллы ЕГЭ, чтобы увидеть точные проходные баллы.</div>";
            html += T.universities.map(overviewCardHtml).join("");
            list.innerHTML = html;
            bindEvents();
            return;
        }

        /* ── Режим комбинации ── */
        var withScore = T.universities.filter(function (u) {
            return typeof combo.scores[u.key] === "number";
        });

        if (total > 0 && withScore.length) {
            var passing = withScore.filter(function (u) {
                return total >= combo.scores[u.key];
            }).length;
            html += '<div class="tomsk-summary">Сумма <strong>' + total + "</strong> · " +
                    "комбинация " + esc(combo.name) + " · проходит в <strong>" +
                    passing + "</strong> из " + withScore.length + " вузов</div>";
        } else {
            html += '<div class="tomsk-summary">' + esc(combo.name) + " · " +
                    withScore.length + " вузов с данными</div>";
        }

        html += T.universities.map(function (u) {
            return comboCardHtml(u, combo, total, studyType);
        }).join("");

        list.innerHTML = html;
        bindEvents();
    }

    function bindEvents() {
        var select = document.getElementById("tomsk-combo");
        if (select) {
            select.addEventListener("change", function () {
                if (this.value === "") {          /* «все комбинации» → обзор */
                    forcedCombo = null;
                    forceOverview = true;
                } else {
                    forcedCombo = this.value;
                    forceOverview = false;
                }
                renderTomsk();
            });
        }
        var back = document.getElementById("tomsk-auto");
        if (back) {
            back.addEventListener("click", function (e) {
                e.preventDefault();
                forcedCombo = null;
                forceOverview = false;
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
        ".tomsk-hint-ok{color:#4ade80}" +
        ".tomsk-hint a{color:#60a5fa}" +
        ".tomsk-summary{margin:0 0 10px;padding:8px 10px;background:#1e293b;" +
        "border-left:3px solid #3b82f6;border-radius:4px;font-size:12px;" +
        "color:#cbd5e1;line-height:1.5}" +
        ".tomsk-none{color:#94a3b8;font-style:italic}" +
        ".uni-item-info em{font-style:normal;color:#94a3b8;font-size:11px}";
    document.head.appendChild(style);

    /* ── Перехват updateSidebarUnis ──────────────────────────────────────── */

    window.updateSidebarUnis = function () {
        if (currentCity() !== T.city) {
            forcedCombo = null;
            forceOverview = false;
            return originalUpdateSidebarUnis.apply(this, arguments);
        }
        renderTomsk();
    };
})();
