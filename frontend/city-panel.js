/* ============================================================================
   city-panel.js — панель вузов выбранного города

   Два режима подбора (переключатель над списком):

     1. ПО ПРЕДМЕТАМ ЕГЭ — пользователь отмечает предметы, которые сдаёт,
        и видит вузы с направлениями, куда этих предметов достаточно.

     2. ПО НАПРАВЛЕНИЯМ — пользователь выбирает направление подготовки
        и видит вузы города, где оно есть, с проходными баллами.

   В обоих режимах, если введены баллы ЕГЭ, напротив вуза появляется метка
   «Проходит» или «Не хватает». В режиме БВИ метка не нужна: зачисление
   без вступительных испытаний.

   Данные приходят из data-loader.js (файлы папки data/). Для городов,
   по которым подробной базы нет, работает прежняя заглушка из script.js.
   ========================================================================== */

(function () {
    "use strict";

    if (typeof window.updateSidebarUnis !== "function") return;

    /* Версия файла. Если браузер загрузил из кэша старую панель, номер не
       совпадёт с остальными — подпись внизу панели скажет об этом прямо. */
    var BUILD = "5";
    (window.__BUILDS = window.__BUILDS || {}).panel = BUILD;

    var originalUpdateSidebarUnis = window.updateSidebarUnis;

    var pickMode = "subjects";     /* subjects | directions */
    var selectedProgram = null;    /* код направления в режиме «по направлениям» */
    var loadingCity = null;        /* город, который сейчас загружается */

    /* ── Состояние интерфейса ─────────────────────────────────────────────── */

    /* Город, выбранный пользователем. Запоминаем его сами: заголовок панели
       отрисован с CSS `text-transform: uppercase`, поэтому innerText в браузере
       возвращает «ВУЗЫ ГОРОДА КАЗАНЬ» — по нему название города не найти. */
    var pickedCity = null;

    function currentCity() {
        if (pickedCity) return pickedCity;

        var title = document.getElementById("sidebar-region-title");
        if (!title) return null;

        /* Запасной путь: ищем название города в заголовке без учёта регистра */
        var text = String(title.innerText || title.textContent || "").toLowerCase();
        var found = null;
        Object.keys(window.CITY_REGISTRY || {}).forEach(function (city) {
            if (found) return;
            var lower = city.toLowerCase();
            var stem = lower.replace(/[аеёиоуыэюя]$/, "");
            if (text.indexOf(lower) !== -1 || (stem && text.indexOf(stem) !== -1)) found = city;
        });
        return found;
    }

    /* Предметы, отмеченные пользователем → сокращения из базы («мат», «инф»).

       Русский язык не учитываем: он обязателен для любого направления,
       поэтому ничего не различает. Без этого строка «Русский язык», которую
       интерфейс добавляет по умолчанию, сразу сужала бы выдачу до нуля. */
    function chosenSubjects() {
        var out = [];
        Array.prototype.slice.call(document.querySelectorAll(".ege-select")).forEach(function (select) {
            var short = window.LABEL_TO_SUBJECT[select.value];
            if (!short || short === window.ALWAYS_REQUIRED) return;
            if (out.indexOf(short) === -1) out.push(short);
        });
        return out;
    }

    function currentTotal() {
        var node = document.getElementById("total-ege-score");
        var value = node ? parseInt(node.innerText, 10) : 0;
        return isNaN(value) ? 0 : value;
    }

    /* Уровень образования из общего фильтра: "" — бакалавриат и специалитет,
       иначе конкретный уровень. Магистратуры в списке нет. */
    function currentLevel() {
        var select = document.getElementById("dir-level");
        return select ? select.value : "";
    }

    /* Направление, на которое поступают по баллам ЕГЭ (после 11 класса) */
    function isEgeProgram(program) {
        return window.EGE_LEVELS.indexOf(program.level) !== -1;
    }

    /* Подходит ли направление под выбранный уровень */
    function matchesLevel(program, level) {
        return !level || program.level === level;
    }

    function currentStudyType() {
        var checked = document.querySelector('input[name="studyType"]:checked');
        return checked ? checked.value : "budget";
    }

    function isBvi() {
        var checked = document.querySelector('input[name="admissionMode"]:checked');
        return !!checked && checked.value === "bvi";
    }

    function scoreOf(program, uniKey, studyType) {
        var row = program.scores[uniKey];
        if (!row) return null;
        return studyType === "paid" ? row.paid : row.budget;
    }

    /* ── Утилиты ─────────────────────────────────────────────────────────── */

    function esc(s) {
        return String(s).replace(/[&<>"]/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
        });
    }

    function plural(n, one, few, many) {
        var n10 = n % 10, n100 = n % 100;
        if (n10 === 1 && n100 !== 11) return one;
        if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return few;
        return many;
    }

    /* Короткое название вуза в заголовке карточки, полное — в раскрытии.
       В Москве 13 вузов с длинными названиями: если писать их целиком в
       заголовок, карточка становится нечитаемой. */
    function uniTitle(uni) {
        return esc(uni.short);
    }

    function uniFullRow(uni) {
        if (!uni.full || uni.full === uni.short) return "";
        return '<div class="uni-detail-row"><strong>Вуз:</strong> ' +
               esc(uni.full) + "</div>";
    }

    /* Ярлык уровня образования. Баллы на бакалавриате и специалитете разные,
       поэтому у каждой строки с баллом должно быть видно, к чему он относится. */
    function levelTag(level) {
        return level ? ' <span class="level-tag">' + esc(level) + "</span>" : "";
    }

    /* Метка «Проходит / Не хватает» либо «БВИ» */
    function badgeHtml(score, total, bvi) {
        if (bvi) return '<span class="badge-bvi">БВИ</span>';
        if (!total || score === null) return "";
        var pass = total >= score;
        return '<span class="' + (pass ? "badge-pass" : "badge-fail") + '">' +
               (pass ? "Проходит" : "Не хватает") + "</span>";
    }

    /* ── Отрисовка: обзор города ─────────────────────────────────────────── */

    function overviewCardHtml(uni, model, studyType, level) {
        /* Баллы считаем отдельно по каждому уровню: у бакалавриата и
           специалитета свои проходные, и общий диапазон вводил бы в заблуждение.
           Например, у КФУ это 170–278 на бакалавриате и 217–276 на специалитете. */
        var lines = [];

        model.levels.forEach(function (lvl) {
            if (level && lvl !== level) return;

            var scores = [];
            model.programs.forEach(function (program) {
                if (program.level !== lvl) return;
                var score = scoreOf(program, uni.key, studyType);
                if (score === null) return;
                scores.push(score);
            });
            if (!scores.length) return;

            lines.push("<span>" + esc(lvl) + ": <strong>" +
                       Math.min.apply(null, scores) + "–" + Math.max.apply(null, scores) +
                       "</strong> · " + scores.length + " " +
                       plural(scores.length, "направление", "направления", "направлений") +
                       "</span>");
        });

        var info = lines.length
            ? lines.join("")
            : '<span class="city-none">Нет данных по этой форме обучения</span>';

        return '<div class="uni-item">' +
                 '<div class="uni-item-header">' +
                   '<div class="uni-item-name">' + uniTitle(uni) + "</div>" +
                   '<div class="uni-item-info">' + info + "</div>" +
                 "</div>" +
               "</div>";
    }

    /* ── Отрисовка: подбор по предметам ЕГЭ ──────────────────────────────── */

    function bySubjectsCardHtml(uni, matches, total, bvi, studyType) {
        var shown = matches.slice(0, 3);
        var rest = matches.length - shown.length;

        var rows = shown.map(function (item) {
            return '<div class="uni-detail-row">' + esc(item.program.code) + " " +
                   esc(item.program.name) + levelTag(item.program.level) +
                   " — <strong>" + item.score + "</strong></div>";
        }).join("");

        if (rest > 0) {
            rows += '<div class="uni-detail-row city-more">и ещё ' + rest + " " +
                    plural(rest, "направление", "направления", "направлений") + " по вашим предметам</div>";
        }

        var best = matches[0].score;

        return '<div class="uni-item">' +
                 '<div class="uni-item-header">' +
                   '<div class="uni-item-name">' + uniTitle(uni) + "</div>" +
                   '<div class="uni-item-info">' +
                     "<span>Лучший балл: <strong>" + best + "</strong>" +
                     levelTag(matches[0].program.level) + "</span>" +
                     badgeHtml(best, total, bvi) +
                   "</div>" +
                 "</div>" +
                 '<div class="uni-item-details">' + uniFullRow(uni) + rows + "</div>" +
               "</div>";
    }

    /* Предупреждение: выбранные предметы ЕГЭ не подходят под направление.
       Направление выбирают руками, поэтому набор может не совпасть — об этом
       нужно честно сказать, а не молча показывать баллы. */
    function subjectsMismatchHtml(program, chosen) {
        var need = (window.SUBJECT_LABELS[window.ALWAYS_REQUIRED] || "Русский язык") +
                   " + " + window.programSubjectsLabel(program);
        var have = chosen.map(function (short) {
            return window.SUBJECT_LABELS[short] || short;
        }).join(", ");

        return '<div class="city-warn">' +
                 "<strong>Ваши предметы ЕГЭ не подходят под это направление.</strong><br>" +
                 "Нужны: " + esc(need) + ".<br>" +
                 "У вас выбрано: " + esc(have) + "." +
               "</div>";
    }

    /* ── Отрисовка: подбор по направлениям ───────────────────────────────── */

    function byDirectionCardHtml(uni, program, score, total, bvi) {
        return '<div class="uni-item">' +
                 '<div class="uni-item-header">' +
                   '<div class="uni-item-name">' + uniTitle(uni) + "</div>" +
                   '<div class="uni-item-info">' +
                     "<span>Проходной балл: <strong>" + score + "</strong></span>" +
                     badgeHtml(score, total, bvi) +
                   "</div>" +
                 "</div>" +
                 '<div class="uni-item-details">' +
                   uniFullRow(uni) +
                   '<div class="uni-detail-row"><strong>Направление:</strong> ' +
                     esc(program.code) + " " + esc(program.name) +
                     levelTag(program.level) + "</div>" +
                   '<div class="uni-detail-row"><strong>Предметы ЕГЭ:</strong> ' +
                     esc(window.programSubjectsLabel(program)) + "</div>" +
                 "</div>" +
               "</div>";
    }

    /* ── Главная отрисовка ───────────────────────────────────────────────── */

    function renderCityPanel(model) {
        var list = document.getElementById("sidebar-unis-list");
        if (!list) return;

        var studyType = currentStudyType();
        var level = currentLevel();
        var total = currentTotal();
        var bvi = isBvi();
        var chosen = chosenSubjects();
        var html = "";

        /* ── Режим «по направлениям» с выбранным направлением ── */
        if (pickMode === "directions" && selectedProgram) {
            var program = null;
            model.programs.forEach(function (p) {
                if (p.code === selectedProgram) program = p;
            });
            if (!program) { selectedProgram = null; renderCityPanel(model); return; }

            var found = [];
            model.universities.forEach(function (uni) {
                var score = scoreOf(program, uni.key, studyType);
                if (score !== null) found.push({ uni: uni, score: score });
            });
            found.sort(function (a, b) { return a.score - b.score; });

            html += '<div class="city-summary">' +
                      "<strong>" + esc(program.code) + " " + esc(program.name) + "</strong><br>" +
                      esc(program.level) +
                      (program.group ? " · " + esc(program.group) : "") + "<br>" +
                      "Предметы ЕГЭ: " + esc(window.programSubjectsLabel(program)) +
                    "</div>";

            if (!found.length) {
                html += '<div class="city-empty">По этой форме обучения баллы не указаны ' +
                        "ни в одном вузе города.</div>";
            } else {
                html += '<div class="city-count">Найдено в ' + found.length + " " +
                        plural(found.length, "вузе", "вузах", "вузах") + "</div>";
                html += found.map(function (item) {
                    return byDirectionCardHtml(item.uni, program, item.score, total, bvi);
                }).join("");
            }

            /* Внизу — предупреждение, если предметы абитуриента не подходят */
            if (chosen.length && !window.programFitsSubjects(program, chosen)) {
                html += subjectsMismatchHtml(program, chosen);
            }

        /* ── Режим «по предметам ЕГЭ» с отмеченными предметами ── */
        } else if (pickMode === "subjects" && chosen.length) {
            var unis = [];

            model.universities.forEach(function (uni) {
                var matches = [];
                model.programs.forEach(function (program) {
                    if (!matchesLevel(program, level)) return;
                    if (!window.programFitsSubjects(program, chosen)) return;
                    var score = scoreOf(program, uni.key, studyType);
                    if (score === null) return;
                    matches.push({ program: program, score: score });
                });
                if (!matches.length) return;
                matches.sort(function (a, b) { return a.score - b.score; });
                unis.push({ uni: uni, matches: matches });
            });

            unis.sort(function (a, b) { return a.matches[0].score - b.matches[0].score; });

            /* Считаем уникальные направления: одно и то же направление может
               быть в нескольких вузах, а в сводке речь именно о направлениях. */
            var seenCodes = {};
            unis.forEach(function (u) {
                u.matches.forEach(function (m) { seenCodes[m.program.code] = 1; });
            });
            var totalPrograms = Object.keys(seenCodes).length;

            html += '<div class="city-summary">' +
                      "<strong>Ваши предметы:</strong> " +
                      esc(chosen.map(function (s) {
                          return (window.SUBJECT_LABELS[s] || s).toLowerCase();
                      }).join(" + ")) + "<br>" +
                      "Подходит " + totalPrograms + " " +
                      plural(totalPrograms, "направление", "направления", "направлений") +
                      " в " + unis.length + " " +
                      plural(unis.length, "вузе", "вузах", "вузах") +
                    "</div>";

            if (!unis.length) {
                html += '<div class="city-empty">По этой форме обучения с такими предметами ' +
                        "направлений не найдено. Попробуйте другую комбинацию или форму обучения.</div>";
            } else {
                html += unis.map(function (item) {
                    return bySubjectsCardHtml(item.uni, item.matches, total, bvi, studyType);
                }).join("");
            }

        /* ── Обзор: ни предметы, ни направление не выбраны ── */
        } else {
            var levelPrograms = model.programs.filter(function (p) {
                return matchesLevel(p, level);
            });
            html += '<div class="city-summary">' +
                      "<strong>" + esc(model.city) + "</strong>: " +
                      model.universities.length + " " +
                      plural(model.universities.length, "вуз", "вуза", "вузов") + " · " +
                      levelPrograms.length + " " +
                      plural(levelPrograms.length, "направление", "направления", "направлений") +
                      " после 11 класса" +
                    "</div>";
            html += model.universities.map(function (uni) {
                return overviewCardHtml(uni, model, studyType, level);
            }).join("");

        }

        list.innerHTML = html;

        var badge = document.getElementById("sheet-count-badge");
        if (badge) {
            var shownCount = list.querySelectorAll(".uni-item").length;
            badge.innerText = shownCount + " " + plural(shownCount, "ВУЗ", "ВУЗа", "ВУЗов");
            badge.style.display = shownCount ? "inline-block" : "none";
        }
    }

    /* ── Селектор направлений ────────────────────────────────────────────── */

    /* Заполняем список направлений один раз на город. Повторный вызов не нужен,
       но и не вреден: он сбросил бы выбранный пользователем уровень. */
    var pickerFilledFor = null;

    function ensureDirectionPicker(model) {
        if (pickerFilledFor === model.city) return;
        pickerFilledFor = model.city;
        fillDirectionPicker(model);
    }

    function fillDirectionPicker(model) {
        var levelSelect = document.getElementById("dir-level");
        var dirSelect = document.getElementById("dir-select");
        if (!levelSelect || !dirSelect) return;

        var levels = [];
        model.programs.forEach(function (p) {
            if (p.level && levels.indexOf(p.level) === -1) levels.push(p.level);
        });
        levels.sort(function (a, b) { return a.localeCompare(b, "ru"); });

        levelSelect.innerHTML = '<option value="">Бакалавриат и специалитет</option>' +
            levels.map(function (l) {
                return '<option value="' + esc(l) + '">' + esc(l) + "</option>";
            }).join("");

        fillDirectionOptions(model);
    }

    function fillDirectionOptions(model) {
        var levelSelect = document.getElementById("dir-level");
        var dirSelect = document.getElementById("dir-select");
        if (!dirSelect) return;

        var level = levelSelect ? levelSelect.value : "";
        var byGroup = {};
        var order = [];

        model.programs.forEach(function (p) {
            if (level && p.level !== level) return;
            var group = p.group || "Прочие направления";
            if (!byGroup[group]) { byGroup[group] = []; order.push(group); }
            byGroup[group].push(p);
        });

        order.sort(function (a, b) { return a.localeCompare(b, "ru"); });

        var html = '<option value="">— выберите направление —</option>';
        order.forEach(function (group) {
            byGroup[group].sort(function (a, b) { return a.code.localeCompare(b.code); });
            html += '<optgroup label="' + esc(group) + '">' +
                byGroup[group].map(function (p) {
                    var selected = p.code === selectedProgram ? " selected" : "";
                    return '<option value="' + esc(p.code) + '"' + selected + ">" +
                           esc(p.code) + " " + esc(p.name) + "</option>";
                }).join("") + "</optgroup>";
        });

        dirSelect.innerHTML = html;
        if (selectedProgram && !dirSelect.value) {
            dirSelect.value = selectedProgram;
        }
    }

    /* ── Переключение режимов ────────────────────────────────────────────── */

    window.setPickMode = function (mode) {
        if (mode !== "subjects" && mode !== "directions") return;
        pickMode = mode;

        var subjectsBtn = document.getElementById("pick-mode-subjects");
        var directionsBtn = document.getElementById("pick-mode-directions");
        var picker = document.getElementById("direction-picker");

        if (subjectsBtn) subjectsBtn.classList.toggle("is-active", mode === "subjects");
        if (directionsBtn) directionsBtn.classList.toggle("is-active", mode === "directions");
        if (picker) picker.style.display = mode === "directions" ? "block" : "none";

        window.updateSidebarUnis();
    };

    /* ── Перехват отрисовки ──────────────────────────────────────────────── */

    window.updateSidebarUnis = function () {
        var city = currentCity();

        /* Страница открыта как файл. Данные из data/ недоступны, поэтому
           объясняем причину. Исключение — города, по которым базы нет вовсе:
           у них и без данных есть что показать (заглушка из script.js). */
        if (location.protocol === "file:") {
            var onStandalone = !city || (window.CITY_REGISTRY && window.CITY_REGISTRY[city]);
            if (onStandalone) {
                var notice = document.getElementById("sidebar-unis-list");
                if (notice) notice.innerHTML = fileNoticeHtml();
                return;
            }
            return originalUpdateSidebarUnis.apply(this, arguments);
        }

        /* Города без подробной базы рисует исходная логика script.js */
        if (!city || !window.CITY_REGISTRY[city]) {
            selectedProgram = null;
            return originalUpdateSidebarUnis.apply(this, arguments);
        }

        var cached = window.getCityData(city);
        if (cached) {
            ensureDirectionPicker(cached);
            renderCityPanel(cached);
            return;
        }

        var list = document.getElementById("sidebar-unis-list");
        if (list && loadingCity !== city) {
            list.innerHTML = '<div class="city-empty">Загружаю данные по городу ' +
                             esc(city) + "…</div>";
        }

        if (loadingCity === city) return;
        loadingCity = city;

        window.loadCityData(city).then(function (model) {
            loadingCity = null;
            ensureDirectionPicker(model);
            if (currentCity() === city) renderCityPanel(model);
        }).catch(function (err) {
            loadingCity = null;
            if (list) {
                list.innerHTML = '<div class="city-empty">Не удалось загрузить данные: ' +
                                 esc(err.message) + "</div>";
            }
            console.warn("[Данные] " + err.message);
        });
    };

    /* ── Клик по региону на карте ────────────────────────────────────────── */

    /* script.js по клику на регион только приближает карту. Здесь добавляем
       открытие города: «Республика Татарстан» → Казань.

       Слушатель на фазе перехвата (третий аргумент true): обработчик script.js
       вызывает stopPropagation, до документа событие в обычной фазе не долетает. */
    document.addEventListener("click", function (e) {
        var region = e.target && e.target.closest ? e.target.closest(".region") : null;
        if (!region) return;

        var name = region.getAttribute("data-region-name") || "";
        var city = null;
        Object.keys(window.CITY_REGISTRY).forEach(function (candidate) {
            if (window.CITY_REGISTRY[candidate].region === name) city = candidate;
        });

        var title = document.getElementById("sidebar-region-title");
        var list = document.getElementById("sidebar-unis-list");

        if (city) {
            /* Сбрасываем выбранное направление: в другом городе его может
               не быть, а пустой список выглядел бы как поломка. */
            selectedProgram = null;
            var dirSelect = document.getElementById("dir-select");
            if (dirSelect) dirSelect.value = "";
            if (window.selectCity) window.selectCity(city);
            if (title) title.innerText = "ВУЗы " + city + " и " +
                window.CITY_REGISTRY[city].region;
            window.updateSidebarUnis();
            return;
        }

        /* Регион без подробной базы. Сбрасываем панель через штатную функцию
           приложения: иначе она продолжает показывать вузы прошлого города,
           пока карта уже уехала в другой регион. */
        selectedProgram = null;
        if (typeof window.resetMapView === "function") window.resetMapView();
    }, true);

    /* ── Раскрытие карточки по клику ─────────────────────────────────────── */

    /* Подробности лежат в .uni-item-details, который скрыт до клика
       (правило .uni-item.is-expanded в styles.css). */
    document.addEventListener("click", function (e) {
        var card = e.target && e.target.closest ? e.target.closest(".uni-item") : null;
        if (card && card.querySelector(".uni-item-details")) {
            card.classList.toggle("is-expanded");
        }
    });

    /* ── Обработчики селекторов ──────────────────────────────────────────── */

    document.addEventListener("change", function (e) {
        if (e.target && e.target.id === "dir-level") {
            /* уровень влияет на оба режима: сужаем и список направлений,
               и выдачу по предметам. Выбранное направление сбрасываем —
               в другом уровне его может не быть. */
            selectedProgram = null;
            var dirSelect = document.getElementById("dir-select");
            if (dirSelect) dirSelect.value = "";
            var model = currentCity() ? window.getCityData(currentCity()) : null;
            if (model) fillDirectionOptions(model);
            window.updateSidebarUnis();
        }
        if (e.target && e.target.id === "dir-select") {
            selectedProgram = e.target.value || null;
            window.updateSidebarUnis();
        }
    });

    /* ── Запоминаем выбранный город ──────────────────────────────────────── */

    /* selectCity() — точка входа для выбора города: её зовут и клик по точке
       на карте, и клик по региону. Перехватываем, чтобы точно знать город,
       не разбирая заголовок панели по тексту. */
    if (typeof window.selectCity === "function") {
        var originalSelectCity = window.selectCity;
        window.selectCity = function (cityName) {
            pickedCity = (window.CITY_REGISTRY && window.CITY_REGISTRY[cityName])
                ? cityName : null;
            return originalSelectCity.apply(this, arguments);
        };
    }

    /* resetMapView() сбрасывает выбор города — забываем и свой */
    if (typeof window.resetMapView === "function") {
        var originalResetMapView = window.resetMapView;
        window.resetMapView = function () {
            pickedCity = null;
            return originalResetMapView.apply(this, arguments);
        };
    }

    /* ── Страница открыта как файл ───────────────────────────────────────── */

    /* Браузеры запрещают странице читать файлы проекта (fetch с file://),
       поэтому базы из data/ в этом режиме не загружаются. Говорим об этом
       прямо, а не молча показываем заглушку. */
    function fileNoticeHtml() {
        return '<div class="city-empty"><strong>Данные не загружены.</strong><br>' +
               "Страница открыта как файл, а браузер запрещает читать файлы " +
               "данных в этом режиме.<br><br>" +
               "Запустите <strong>start.bat</strong> и откройте " +
               "<strong>http://127.0.0.1:8000</strong> — тогда данные " +
               "подтянутся из папки <strong>data/</strong>.</div>";
    }

    if (location.protocol === "file:") {
        var placeholder = document.getElementById("sidebar-unis-list");
        if (placeholder) placeholder.innerHTML = fileNoticeHtml();
    }

    /* ── Подпись сборки ──────────────────────────────────────────────────── */

    /* Видно внизу панели. Если файлы разъехались (браузер отдал старый JS
       из кэша или архив распакован не полностью) — это заметно сразу. */
    function renderBuildStamp() {
        var stamp = document.getElementById("build-stamp");
        if (!stamp) return;

        var builds = window.__BUILDS || {};
        var versions = Object.keys(builds).map(function (k) { return k + " " + builds[k]; });
        var same = builds.panel === builds.data && window.APP_BUILD === builds.panel;

        stamp.className = "build-stamp" + (same ? "" : " is-stale");
        stamp.textContent = same
            ? "Сборка " + (window.APP_BUILD || "?") + " · " + versions.join(", ")
            : "Файлы устарели (разметка " + (window.APP_BUILD || "?") + ", " +
              versions.join(", ") + "). Нажмите Ctrl+F5.";
    }

    window.__renderBuildStamp = renderBuildStamp;
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", renderBuildStamp);
    } else {
        renderBuildStamp();
    }

    window.__CITY_PANEL_READY = true;
})();
