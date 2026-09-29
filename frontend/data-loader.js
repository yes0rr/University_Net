/* ============================================================================
   data-loader.js — загрузка баз по городам из папки data/

   Источник правды — файлы в папке data/:

       data/spec_napr.json   справочник: код направления → название и уровень
       data/kazan_2026.json  база города: баллы по (направление × вуз × форма)

   Как устроена база города (по одной строке на направление):

       id-1, id-2, id-3      код направления собирается как «id-1.id-2.id-3»:
                             01.03.01 → бакалавриат, 01.04.01 → магистратура,
                             01.05.01 → специалитет (id-2: 3 / 4 / 5)
       пред обяз             обязательный предмет (русский язык не указан —
                             он обязателен для всех и в базе не хранится)
       пред 1, пред 2        предметы НА ВЫБОР: достаточно сдать один из двух
       бю <ВУЗ>              проходной балл на бюджет
       пл <ВУЗ>              проходной балл на платное
                             «-» означает «нет данных»

   Новый город подключается добавлением строки в CITY_REGISTRY: ни код панели,
   ни разметка менять не нужно.
   ========================================================================== */

(function () {
    "use strict";

    var BUILD = "4";
    (window.__BUILDS = window.__BUILDS || {}).data = BUILD;

    var SPEC_URL = "data/spec_napr.json";

    /* ── Реестр городов ───────────────────────────────────────────────────────
       file   — файл базы в папке data/
       region — название региона на карте: по клику на него открывается город
       Чтобы подключить город, достаточно добавить строку и положить файл. */
    var CITY_REGISTRY = {
        "Казань": { file: "data/kazan_2026.json", region: "Республика Татарстан" }
        /* Следующие города — снять комментарий, когда появятся файлы баз:
        , "Томск":           { file: "data/tomsk_2026.json",   region: "Томская область" }
        , "Москва":          { file: "data/moscow_2026.json",  region: "Москва" }
        , "Санкт-Петербург": { file: "data/spb_2026.json",     region: "Санкт-Петербург" } */
    };

    /* ── Полные названия вузов ────────────────────────────────────────────────
       В базе хранятся только короткие ключи столбцов. Здесь — расшифровка
       для карточек. Ключа может не быть: тогда покажется короткое название. */
    var UNI_NAMES = {
        "КФУ": "Казанский (Приволжский) федеральный университет",
        "КНИТУ-КАИ": "Казанский национальный исследовательский технический университет им. А. Н. Туполева",
        "КНИТУ": "Казанский национальный исследовательский технологический университет",
        "КГМУ": "Казанский государственный медицинский университет",
        "КГЭУ": "Казанский государственный энергетический университет",
        "КГАСУ": "Казанский государственный архитектурно-строительный университет"
    };

    /* ── Предметы ─────────────────────────────────────────────────────────────
       Сокращения из базы, человеческие подписи и соответствие названиям
       в выпадающих списках интерфейса. */
    var SUBJECT_LABELS = {
        "мат": "Математика (профиль)",
        "инф": "Информатика",
        "физ": "Физика",
        "хим": "Химия",
        "био": "Биология",
        "общество": "Обществознание",
        "история": "История",
        "геогр": "География",
        "ин.яз": "Иностранный язык",
        "лит": "Литература",
        "рус": "Русский язык"
    };

    /* Название в списке интерфейса → сокращение в базе */
    var LABEL_TO_SUBJECT = {};
    Object.keys(SUBJECT_LABELS).forEach(function (short) {
        LABEL_TO_SUBJECT[SUBJECT_LABELS[short]] = short;
    });

    /* Русский язык обязателен для всех направлений и в базе не хранится */
    var ALWAYS_REQUIRED = "рус";

    /* Уровни, на которые поступают по баллам ЕГЭ, то есть сразу после 11 класса.
       Это единственный список уровней, который видит пользователь: магистратура,
       аспирантура и всё прочее в подбор не попадут никогда, даже если появятся
       в новых файлах баз. Причина: у каждого уровня свои проходные баллы и свои
       правила приёма — магистратура набирается после диплома и по другим
       экзаменам (в базе Казани её баллы от 40 до 98, к ЕГЭ они не относятся). */
    var EGE_LEVELS = ["Бакалавриат", "Специалитет"];

    var EMPTY = { "": 1, "-": 1, "—": 1, "–": 1 };

    /* ── Разбор ──────────────────────────────────────────────────────────── */

    /* Строка базы → код направления «01.03.01» */
    function codeOf(row) {
        return pad(row["id-1"]) + "." + pad(row["id-2"]) + "." + pad(row["id-3"]);
    }

    function pad(value) {
        var n = parseInt(value, 10);
        return isNaN(n) ? "00" : (n < 10 ? "0" + n : String(n));
    }

    /* "237" → 237, "-" → null */
    function toScore(value) {
        if (value === null || value === undefined) return null;
        var text = String(value).trim();
        if (EMPTY[text]) return null;
        var num = Number(text.replace(",", "."));
        return isNaN(num) ? null : Math.round(num);
    }

    function subjectLabel(short) {
        return SUBJECT_LABELS[short] || short;
    }

    /* ── Сборка модели города ───────────────────────────────────────────────── */

    function buildCity(rows, specIndex, cityName) {
        var uniKeys = [];
        var programs = [];

        /* Вузы определяем по столбцам «бю …» первой строки */
        Object.keys(rows[0] || {}).forEach(function (column) {
            if (column.indexOf("бю ") === 0) {
                var key = column.slice(3).trim();
                if (uniKeys.indexOf(key) === -1) uniKeys.push(key);
            }
        });

        rows.forEach(function (row) {
            var code = codeOf(row);
            var meta = specIndex[code] || {};

            var scores = {};
            var hasAny = false;
            uniKeys.forEach(function (key) {
                var budget = toScore(row["бю " + key]);
                var paid = toScore(row["пл " + key]);
                if (budget !== null || paid !== null) hasAny = true;
                scores[key] = { budget: budget, paid: paid };
            });

            /* Направление, которого нет ни в одном вузе города, в панели
               бесполезно: по нему нельзя ничего показать. */
            if (!hasAny) return;

            var required = String(row["пред обяз"] || "").trim();
            var choice = [String(row["пред 1"] || "").trim(),
                          String(row["пред 2"] || "").trim()]
                         .filter(function (s, i, arr) { return s && arr.indexOf(s) === i; });

            programs.push({
                code: code,
                name: meta.name || code,
                level: meta.level || "",
                groupCode: code.slice(0, 2) + ".00.00",
                group: meta.group || "",
                required: required,
                choice: choice,
                scores: scores
            });
        });

        var universities = uniKeys.map(function (key) {
            return { key: key, short: key, full: UNI_NAMES[key] || key };
        });

        var egePrograms = programs.filter(function (p) {
            return EGE_LEVELS.indexOf(p.level) !== -1;
        });

        return {
            city: cityName,
            universities: universities,
            programs: programs,               /* всё, включая магистратуру */
            egePrograms: egePrograms,         /* только то, куда идут после 11 класса */
            /* Уровни — только из белого списка EGE_LEVELS и только те, что
               реально есть в файле. Порядок: бакалавриат, затем специалитет. */
            levels: EGE_LEVELS.filter(function (level) {
                return egePrograms.some(function (p) { return p.level === level; });
            }),
            groups: uniqueValues(egePrograms.map(function (p) { return p.group; })),
            totalSpecialties: egePrograms.length,
            magistracyCount: programs.length - egePrograms.length
        };
    }

    function uniqueValues(list) {
        var seen = {};
        var out = [];
        list.forEach(function (v) {
            if (!v || seen[v]) return;
            seen[v] = 1;
            out.push(v);
        });
        return out.sort(function (a, b) { return a.localeCompare(b, "ru"); });
    }

    /* Справочник превращаем в индекс: код → {name, level, group} */
    function indexSpec(rows) {
        var index = {};
        var groups = {};

        rows.forEach(function (row) {
            var code = String(row["Код"] || "").trim();
            var name = String(row["Наименование укрупненных групп, специальностей и направлений подготовки"] || "").trim();
            var level = String(row["Уровень образования"] || "").trim();
            if (!code) return;

            if (level === "Укрупненная группа") {
                groups[code] = name.replace(/\s*\(Укрупненная группа\)\s*$/, "");
                return;
            }
            index[code] = { name: name, level: level };
        });

        /* Дописываем группу каждому направлению */
        Object.keys(index).forEach(function (code) {
            var groupCode = code.slice(0, 2) + ".00.00";
            index[code].group = groups[groupCode] || "";
        });

        return index;
    }

    /* ── Загрузка ────────────────────────────────────────────────────────── */

    function getJSON(url) {
        return fetch(url, { cache: "no-store" }).then(function (response) {
            if (!response.ok) throw new Error(url + " → HTTP " + response.status);
            return response.json();
        });
    }

    /* Браузеры запрещают fetch к локальным файлам, поэтому при открытии страницы
       двойным кликом (протокол file://) базы не загрузятся. Говорим об этом
       прямо, иначе пользователь увидит непонятную ошибку сети. */
    function fileProtocolError() {
        return new Error("страница открыта как файл. Запустите start.bat " +
                         "(Windows) или start.sh и откройте сайт по адресу сервера");
    }

    var specPromise = null;
    var cityCache = {};

    function loadSpec() {
        if (!specPromise) specPromise = getJSON(SPEC_URL).then(indexSpec);
        return specPromise;
    }

    /* Загрузить базу города. Возвращает промис с моделью или с ошибкой. */
    function loadCity(cityName) {
        if (location.protocol === "file:") return Promise.reject(fileProtocolError());

        var entry = CITY_REGISTRY[cityName];
        if (!entry) return Promise.reject(new Error("нет данных по городу " + cityName));

        if (cityCache[cityName]) return Promise.resolve(cityCache[cityName]);

        return Promise.all([getJSON(entry.file), loadSpec()]).then(function (parts) {
            var model = buildCity(parts[0], parts[1], cityName);
            cityCache[cityName] = model;
            console.info("[Данные] " + cityName + ": " + model.totalSpecialties +
                         " направлений после 11 класса (магистратура: " +
                         model.magistracyCount + "), " + model.universities.length + " вузов");
            return model;
        });
    }

    /* ── Наружу ──────────────────────────────────────────────────────────── */

    window.CITY_REGISTRY = CITY_REGISTRY;
    window.EGE_LEVELS = EGE_LEVELS;
    window.SUBJECT_LABELS = SUBJECT_LABELS;
    window.LABEL_TO_SUBJECT = LABEL_TO_SUBJECT;
    window.ALWAYS_REQUIRED = ALWAYS_REQUIRED;
    window.UNI_NAMES = UNI_NAMES;
    window.loadCityData = loadCity;
    window.getCityData = function (cityName) { return cityCache[cityName] || null; };

    /* Соответствует ли направление набору предметов пользователя.
       Нужен обязательный предмет и хотя бы один из двух на выбор.
       Русский язык не проверяем: он обязателен везде. */
    window.programFitsSubjects = function (program, chosen) {
        if (!chosen.length) return false;
        if (program.required && chosen.indexOf(program.required) === -1) return false;
        if (!program.choice.length) return true;
        return program.choice.some(function (s) { return chosen.indexOf(s) !== -1; });
    };

    /* Подпись предметов направления: «математика + информатика / физика» */
    /* Панель уже загрузилась и нарисовала подпись — обновляем её, теперь
       известны версии всех файлов. */
    if (typeof window.__renderBuildStamp === "function") window.__renderBuildStamp();
    console.log("[Сборка] разметка " + window.APP_BUILD + ", панель " +
                window.__BUILDS.panel + ", данные " + BUILD);

    window.programSubjectsLabel = function (program) {
        var parts = [];
        if (program.required) parts.push(subjectLabel(program.required));
        if (program.choice.length) {
            parts.push(program.choice.map(subjectLabel).join(" или "));
        }
        return parts.join(" + ");
    };
})();
