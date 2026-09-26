/* ============================================================================
   tomsk-loader.js — загрузка вузов Томска из JSON

   Источник правды — файлы в папке data/:
       data/tomsk.json   баллы по комбинациям предметов (34 записи)
       data/subj.json    справочник направлений ID → «код + название»

   Файл забирает их через fetch, приводит к структуре, которую ждёт панель
   (её рисует логика из data.js), и отдаёт в интерфейс. Правки в JSON видны
   при перезагрузке страницы — пересборка не нужна.

   Если fetch недоступен — страница открыта двойным кликом (протокол file://),
   браузеры запрещают такие запросы. В этом случае ничего не делаем: панель
   работает на данных из data.js, который уже загружен и содержит то же самое.
   ========================================================================== */

(function () {
    "use strict";

    var COMBO_URL = "data/tomsk.json";      /* относительно адреса страницы */
    var SUBJ_URL = "data/subj.json";

    /* Названия вузов: в JSON только ключи столбцов таблицы.
       Порядок карточек в панели берётся отсюда. */
    var UNIVERSITIES = [
        { key: "тусур",  short: "ТУСУР",  full: "Томский государственный университет систем управления и радиоэлектроники" },
        { key: "тпу",    short: "ТПУ",    full: "Национальный исследовательский Томский политехнический университет" },
        { key: "тгу",    short: "ТГУ",    full: "Национальный исследовательский Томский государственный университет" },
        { key: "сибгму", short: "СибГМУ", full: "Сибирский государственный медицинский университет" },
        { key: "тгасу",  short: "ТГАСУ",  full: "Томский государственный архитектурно-строительный университет" },
        { key: "тгпу",   short: "ТГПУ",   full: "Томский государственный педагогический университет" }
    ];

    var EMPTY = { "": 1, "-": 1, "—": 1, "–": 1 };

    /* ── Приведение данных ───────────────────────────────────────────────── */

    /* "230" → 230, "—" → null (в таблице тире означает «нет данных»).
       Без этого панель показывает «Нет данных» для всех вузов сразу:
       она сравнивает значение по typeof === "number". */
    function toScore(value) {
        if (value === null || value === undefined) return null;
        var text = String(value).trim();
        if (EMPTY[text]) return null;
        var num = Number(text.replace(",", "."));
        return isNaN(num) ? null : num;
    }

    /* «09.03.04 Программная инженерия» → {code: "09.03.04", title: "Программная инженерия"} */
    function parseSpecialty(full) {
        var text = String(full || "").trim();
        var m = text.match(/^(\d{2}\.\d{2}\.\d{2})\s+(.+)$/);
        return m ? { code: m[1], title: m[2] } : { code: "", title: text };
    }

    function indexSpecialties(rows) {
        var byId = {};
        rows.forEach(function (row) {
            if (row && row.ID) byId[row.ID] = parseSpecialty(row["Специальность / Направление"]);
        });
        return byId;
    }

    function buildData(comboRows, subjRows) {
        var byId = indexSpecialties(subjRows);
        var unique = {};

        var combos = comboRows.map(function (row) {
            var name = String(row["Комбинация предметов"] || "").trim();

            var specialties = [];
            for (var i = 1; i <= 5; i++) {
                var id = row["ID(" + i + ")"];
                if (!id) continue;
                id = String(id).trim();
                if (EMPTY[id]) continue;

                var spec = byId[id];
                var text = spec
                    ? (spec.code ? spec.code + " " + spec.title : spec.title)
                    : id;                       /* нет в справочнике — покажем ID */
                specialties.push(text);
                unique[text] = 1;
            }

            var scores = {};
            UNIVERSITIES.forEach(function (u) { scores[u.key] = toScore(row[u.key]); });

            return {
                name: name,
                subjects: name.split("/").map(function (p) { return p.trim(); }).filter(Boolean),
                specialties: specialties,
                scores: scores
            };
        });

        return {
            city: "Томск",
            universities: UNIVERSITIES,
            combos: combos,
            totalSpecialties: Object.keys(unique).length
        };
    }

    /* ── Загрузка ────────────────────────────────────────────────────────── */

    function getJSON(url) {
        return fetch(url, { cache: "no-store" }).then(function (response) {
            if (!response.ok) throw new Error(url + " → HTTP " + response.status);
            return response.json();
        });
    }

    /* Интерфейс может инициализироваться чуть позже загрузчика — ждём его */
    function applyWhenReady(data, tries) {
        if (typeof window.__TOMSK_APPLY === "function") {
            window.__TOMSK_APPLY(data);
            console.info("[Томск] данные загружены из JSON: " + data.combos.length +
                         " комбинаций, " + data.totalSpecialties + " направлений");
            return;
        }
        if ((tries || 0) >= 20) {
            console.warn("[Томск] интерфейс панели не найден — данные из JSON не применены");
            return;
        }
        setTimeout(function () { applyWhenReady(data, (tries || 0) + 1); }, 150);
    }

    /* Пригодится тестам и отладке в консоли браузера */
    window.TOMSK_JSON_BUILD = buildData;

    if (location.protocol === "file:") {
        console.info("[Томск] страница открыта как файл — fetch недоступен, " +
                     "панель работает на данных из data.js");
        return;
    }

    Promise.all([getJSON(COMBO_URL), getJSON(SUBJ_URL)])
        .then(function (files) { applyWhenReady(buildData(files[0], files[1])); })
        .catch(function (err) {
            console.warn("[Томск] JSON не загрузился (" + err.message + "), " +
                         "панель работает на данных из data.js");
        });
})();
