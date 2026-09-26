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
