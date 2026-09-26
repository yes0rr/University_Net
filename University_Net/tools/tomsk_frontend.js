/* ============================================================================
   Логика отображения вузов Томска (подключается после script.js)
   Этот блок попадает в frontend/data.js при генерации.

   Что делает:
     1. Перехватывает глобальную функцию updateSidebarUnis() из script.js.
     2. Если выбран НЕ Томск — вызывает оригинал (поведение не меняется).
     3. Если выбран Томск — рисует список из 6 вузов с минимальными баллами
        для той комбинации предметов ЕГЭ, которую выбрал пользователь.

   script.js при этом не изменяется — перехват идёт через window.
   ============================================================================ */

(function () {
    "use strict";

    var T = window.TOMSK_DATA;
    if (!T || typeof window.updateSidebarUnis !== "function") return;

    /* Как предметы называются в калькуляторе ЕГЭ и как — в таблице */
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
        "Русский язык": "рус"   /* обязательный, в комбинациях не участвует */
    };

    var comboOverride = null;   // комбинация, выбранная вручную в выпадающем списке
    var originalUpdateSidebarUnis = window.updateSidebarUnis;

    /* ── Вспомогательное: читаем состояние интерфейса ────────────────────── */

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
        var el = document.getElementById("total-ege-score");
        var n = Number(el && el.innerText);
        return isNaN(n) ? 0 : n;
    }

    function currentStudyType() {
        var el = document.querySelector('input[name="studyType"]:checked');
        return el ? el.value : "budget";
    }

    function findCombo(shorts) {
        for (var i = 0; i < T.combos.length; i++) {
            var c = T.combos[i];
            if (c.subjects.length === 2 &&
                shorts.indexOf(c.subjects[0]) !== -1 &&
                shorts.indexOf(c.subjects[1]) !== -1) {
                return c;
            }
        }
        return null;
    }

    function getComboByName(name) {
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

    /* ── Отрисовка ──────────────────────────────────────────────────────── */

    function comboSelectHtml(auto, active) {
        var options = T.combos.map(function (c) {
            var mark = c === active ? " selected" : "";
            return '<option value="' + esc(c.name) + '"' + mark + ">" +
                esc(c.name) + " — " + c.specialties.length + " напр.</option>";
        }).join("");

        return '' +
            '<div class="tomsk-panel">' +
              '<label class="tomsk-label" for="tomsk-combo">Комбинация предметов ЕГЭ</label>' +
              '<select id="tomsk-combo" class="tomsk-select">' + options + "</select>" +
              (comboOverride
                  ? '<div class="tomsk-hint">Выбрана вручную · ' +
                    '<a href="#" id="tomsk-auto">вернуть автоподбор</a></div>'
                  : auto
                      ? '<div class="tomsk-hint tomsk-hint-ok">Подобрана по вашим предметам автоматически</div>'
                      : '<div class="tomsk-hint">Отметьте два предмета в калькуляторе — комбинация подберётся сама</div>') +
            "</div>";
    }

    function uniCardHtml(u, combo, total, studyType) {
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
              (studyType === "paid" ? " <em>(данных по платному приёму в таблице нет)</em>" : "") +
              "</span>"
            : '<span class="tomsk-none">Нет данных по этой комбинации</span>';

        var specs = combo.specialties.map(function (s) {
            return '<div class="uni-detail-row">' + esc(s) + "</div>";
        }).join("");

        return '' +
            '<div class="uni-item">' +
              '<div class="uni-item-header">' +
                '<div class="uni-item-name">' + esc(u.short) + " — " + esc(u.full) + "</div>" +
                '<div class="uni-item-info">' + scoreLine + badge + "</div>" +
              "</div>" +
              '<div class="uni-item-details">' +
                '<div class="uni-detail-row"><strong>Направлений по комбинации: ' +
                  combo.specialties.length + "</strong></div>" +
                specs +
              "</div>" +
            "</div>";
    }

    function renderTomsk() {
        var list = document.getElementById("sidebar-unis-list");
        if (!list) return;

        var shorts = chosenShorts();
        var auto = findCombo(shorts);
        var combo = (comboOverride && getComboByName(comboOverride)) || auto;
        var total = currentTotal();
        var studyType = currentStudyType();

        var html = comboSelectHtml(auto, combo);

        if (!combo) {
            html += '<p class="tomsk-empty">Выберите комбинацию в списке выше, ' +
                    "чтобы увидеть минимальные баллы и направления.</p>";
            list.innerHTML = html;
            bindComboEvents();
            return;
        }

        var withScore = T.universities.filter(function (u) {
            return typeof combo.scores[u.key] === "number";
        });

        if (total > 0 && withScore.length) {
            var passing = withScore.filter(function (u) {
                return total >= combo.scores[u.key];
            }).length;
            html += '<div class="tomsk-summary">С баллом <strong>' + total + "</strong> " +
                    "проходит в <strong>" + passing + "</strong> из " + withScore.length +
                    " вузов этой комбинации</div>";
        } else {
            html += '<div class="tomsk-summary">' + esc(combo.name) + " · " +
                    withScore.length + " вузов с данными</div>";
        }

        html += T.universities.map(function (u) {
            return uniCardHtml(u, combo, total, studyType);
        }).join("");

        list.innerHTML = html;
        bindComboEvents();
    }

    function bindComboEvents() {
        var select = document.getElementById("tomsk-combo");
        if (select) {
            select.addEventListener("change", function () {
                comboOverride = this.value;
                renderTomsk();
            });
        }
        var back = document.getElementById("tomsk-auto");
        if (back) {
            back.addEventListener("click", function (e) {
                e.preventDefault();
                comboOverride = null;
                renderTomsk();
            });
        }
    }

    /* ── Стили (добавляются из этого файла, чтобы не трогать styles.css) ─── */

    var css = '' +
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
        "border-left:3px solid #3b82f6;border-radius:4px;font-size:12px;color:#cbd5e1}" +
        ".tomsk-empty{font-size:12px;color:#94a3b8;line-height:1.5}" +
        ".tomsk-none{color:#94a3b8;font-style:italic}" +
        ".uni-item-info em{font-style:normal;color:#94a3b8;font-size:11px}";

    var style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);

    /* ── Перехват updateSidebarUnis ─────────────────────────────────────── */

    window.updateSidebarUnis = function () {
        var city = currentCity();

        if (city !== T.city) {
            comboOverride = null;                 // уходим из Томска — сбрасываем выбор
            return originalUpdateSidebarUnis.apply(this, arguments);
        }
        renderTomsk();
    };
})();
