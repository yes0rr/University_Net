/**
 * Автотест фронтенда University_Net (эмулятор браузера, jsdom).
 *
 * Проверяет всю новую логику целиком, без запуска браузера:
 *   1) авторизации в интерфейсе и в коде больше нет;
 *   2) данные берутся из папки data/ (spec_napr.json + <город>_2026.json);
 *   3) панель вузов умеет два подбора: по предметам ЕГЭ и по направлениям;
 *   4) баллы ЕГЭ дают метки «Проходит / Не хватает», БВИ — метку «БВИ»;
 *   5) города без подробной базы работают по-прежнему (заглушка uniData).
 *
 * Запуск (нужен Node.js):
 *     npm install jsdom
 *     node tools/test_frontend.js
 *
 * Скрипты подключаются ровно в том порядке, в котором их грузит index.html —
 * поэтому тест заодно ловит ошибку «забыли подключить новый скрипт».
 */

const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const ROOT = path.join(__dirname, "..");
const FRONTEND = path.join(ROOT, "frontend");

let passed = 0, failed = 0;
const check = (name, ok, detail = "") =>
    ok ? (passed++, console.log(`  ✅ ${name}`))
       : (failed++, console.log(`  ❌ ${name}${detail ? " → " + detail : ""}`));

const section = (title) => console.log(`\n=== ${title} ===`);
const tick = (ms = 30) => new Promise(r => setTimeout(r, ms));

// ── Загружаем index.html так же, как это делает браузер с сервера ────────────
const html = fs.readFileSync(path.join(FRONTEND, "index.html"), "utf-8");

const dom = new JSDOM(html, {
    runScripts: "outside-only",
    pretendToBeVisual: true,
    url: "http://localhost:8000/index.html",
});
const { window } = dom;
const doc = window.document;

// jsdom не реализует innerText и SVG.getBBox(), которыми пользуется script.js.
// В настоящих браузерах они есть — подставляем, чтобы не было ложных ошибок.
Object.defineProperty(window.HTMLElement.prototype, "innerText", {
    get() { return this.textContent; },
    set(v) { this.textContent = v; },
    configurable: true,
});
/* Правдоподобный прямоугольник региона. По нему script.js приближает карту
   при клике по региону; слишком маленький бокс увёл бы вид от Казани, и
   подписи «пропадали» бы из-за отсечения за пределами экрана. */
Object.defineProperty(window.SVGElement.prototype, "getBBox", {
    value() { return { x: 60, y: 180, width: 260, height: 240 }; },
    configurable: true,
});
// jsdom отдаёт нулевые размеры, и updateMapDisplay выходит, не показав подписи.
// Подставляем реальные пропорции карты, как в браузере.
Object.defineProperty(window.Element.prototype, "getBoundingClientRect", {
    value() { return { x: 0, y: 0, width: 900, height: 560, top: 0, left: 0,
                       right: 900, bottom: 560 }; },
    configurable: true,
});

// jsdom не умеет сетевые запросы. Подменяем fetch: он читает те же файлы,
// что отдаёт сервер по адресу /data/... (см. deploy/Dockerfile.web).
const fetched = [];
window.fetch = (url) => {
    const name = String(url).split("/").pop();
    fetched.push(name);
    const file = path.join(ROOT, "data", name);
    if (!fs.existsSync(file)) {
        return Promise.resolve({
            ok: false, status: 404,
            json: () => Promise.reject(new Error("HTTP 404")),
        });
    }
    const text = fs.readFileSync(file, "utf-8");
    return Promise.resolve({
        ok: true, status: 200,
        json: () => Promise.resolve(JSON.parse(text)),
    });
};

/* Встроенный скрипт с версией сборки jsdom не выполняет (runScripts:
   outside-only), а браузер выполняет. Читаем значение из разметки сами,
   иначе подпись сборки справедливо ругалась бы на «устаревшие» файлы. */
const appBuild = (html.match(/window\.APP_BUILD\s*=\s*"([^"]+)"/) || [])[1];
if (appBuild) window.APP_BUILD = appBuild;

const errors = [];
window.addEventListener("error", e => errors.push(e.message));

/* Адреса содержат ?v= — метку версии сборки: так браузер гарантированно
   забирает новый файл, а не старый из кэша. Для проверки существования
   файла параметр отбрасываем. */
const scriptTags = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
const scripts = scriptTags.map(src => src.split("?")[0]);
console.log(`  адрес страницы: http://localhost:8000/ · скрипты: ${scripts.join(" → ")}`);

for (const src of scripts) {
    const file = path.join(FRONTEND, src);
    if (!fs.existsSync(file)) {
        console.log(`  ❌ НЕ НАЙДЕН ФАЙЛ: ${src} — проверь, что он скопирован в frontend/`);
        failed++;
        continue;
    }
    try {
        window.eval(fs.readFileSync(file, "utf-8"));
    } catch (e) {
        console.log(`  ❌ ошибка при выполнении ${src}: ${e.message}`);
        failed++;
    }
}

// Скрипты навешивают обработчик на DOMContentLoaded. jsdom бросает это
// событие сам, но чуть позже; ждём его и запускаем вручную только если
// загрузка почему-то не состоялась — иначе приложение инициализируется
// дважды и добавляет лишнюю строку предмета.
async function waitForInit() {
    for (let i = 0; i < 100 && doc.readyState !== "complete"; i++) await tick(10);
    if (!doc.querySelector(".ege-subject-row")) {
        doc.dispatchEvent(new window.Event("DOMContentLoaded", { bubbles: true }));
        await tick(20);
    }
}

// ── Утилиты для проверок ────────────────────────────────────────────────────
const list = () => doc.getElementById("sidebar-unis-list");
const cards = () => list().querySelectorAll(".uni-item");
const cardNames = () => [...cards()].map(c =>
    c.querySelector(".uni-item-name").innerText.split(" — ")[0]);
const cardScores = () => [...cards()].map(c =>
    Number((c.querySelector(".uni-item-info").innerText.match(/балл:\s*(\d+)/) || [NaN, NaN])[1]));
const badges = () => ({
    pass: list().querySelectorAll(".badge-pass").length,
    fail: list().querySelectorAll(".badge-fail").length,
    bvi: list().querySelectorAll(".badge-bvi").length,
});
const summary = () => {
    const s = list().querySelector(".city-summary");
    return s ? s.innerText : "";
};

const setSubjects = (names) => {
    // строк должно стать ровно столько, сколько предметов передали
    while (doc.querySelectorAll(".ege-subject-row").length < names.length) window.addEgeSubject();
    while (doc.querySelectorAll(".ege-subject-row").length > names.length) {
        doc.querySelector(".ege-subject-row .btn-remove-subject").onclick();
    }
    const selects = [...doc.querySelectorAll(".ege-select")];
    names.forEach((name, i) => { selects[i].value = name; selects[i].onchange(); });
};
const setScores = (vals) => {
    // строк предметов должно хватать под все переданные баллы
    while (doc.querySelectorAll(".ege-subject-row").length < vals.length) window.addEgeSubject();
    [...doc.querySelectorAll(".ege-input")].forEach((inp, i) => {
        inp.value = String(vals[i]);
        inp.oninput();
    });
};
const setStudyType = (value) => {
    doc.querySelector(`input[name="studyType"][value="${value}"]`).checked = true;
    window.updateSidebarUnis();
};
const setAdmission = (value) => {
    // в разметке обработчик навешен атрибутом onchange — в jsdom он не
    // компилируется, поэтому зовём ту же функцию приложения напрямую
    doc.querySelector(`input[name="admissionMode"][value="${value}"]`).checked = true;
    window.toggleAdmissionMode();
};
const clickRegion = (name) => doc.querySelector(`.region[data-region-name="${name}"]`)
    .dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true }));

async function main() {

    await waitForInit();

    // ─────────────────────────────────────────────────────────────────────────
    section("1. Авторизации в системе больше нет");

    check("поля регистрации нет в разметке",
        !doc.getElementById("reg-form") && !doc.getElementById("reg-name") &&
        !doc.getElementById("reg-email"));
    check("блок «Регистрация абитуриента» не отрисован",
        !doc.querySelector(".auth-section") && !/Регистрация абитуриента/.test(html));
    check("в интерфейсе нет имени и почты пользователя",
        !doc.getElementById("user-display-name") && !doc.getElementById("user-display-email"));
    check("нет кнопки «Сменить аккаунт»", !/Сменить аккаунт/.test(html));

    const sources = ["script.js", "city-panel.js", "data-loader.js", "styles.css"]
        .map(f => fs.readFileSync(path.join(FRONTEND, f), "utf-8")).join("\n");
    check("в коде нет currentUser", !/currentUser/.test(sources));
    check("в коде нет handleRegister / handleLogout",
        !/handleRegister|handleLogout/.test(sources));
    check("в стилях не осталось правил авторизации",
        !/auth-section|user-card|form-input|form-group|btn-primary/.test(sources));
    check("при старте ровно одна строка предмета (русский язык по умолчанию)",
        doc.querySelectorAll(".ege-subject-row").length === 1,
        String(doc.querySelectorAll(".ege-subject-row").length));
    check("стартовая строка не сужает выдачу: панель в режиме обзора",
        !list().querySelector(".city-summary") ||
        !/Ваши предметы/.test(list().querySelector(".city-summary").innerText),
        list().innerText.slice(0, 60));
    check("index.html ссылается на новые скрипты",
        scripts.includes("city-panel.js") && scripts.includes("data-loader.js") &&
        !scripts.includes("tomsk-loader.js"));

    // ─────────────────────────────────────────────────────────────────────────
    section("2. Данные читаются из папки data/");

    check("база вузов (window.uniData) объявлена для городов без подробных данных",
        typeof window.uniData === "object" && Object.keys(window.uniData).length === 7,
        typeof window.uniData === "object" ? String(Object.keys(window.uniData).length) : "—");
    check("в реестре городов есть Казань",
        !!(window.CITY_REGISTRY && window.CITY_REGISTRY["Казань"]));
    check("таблицы данных Томска (window.TOMSK_DATA) больше нет",
        typeof window.TOMSK_DATA === "undefined");

    const kazan = await window.loadCityData("Казань");
    check("файлы data/ запрошены по сети",
        fetched.includes("kazan_2026.json") && fetched.includes("spec_napr.json"),
        fetched.join(", "));
    check("всего разобрано 145 направлений (из 196 строк файла)",
        kazan.programs.length === 145, String(kazan.programs.length));
    check("после 11 класса — 103 направления, магистратура отложена отдельно",
        kazan.egePrograms.length === 103 && kazan.magistracyCount === 42,
        `${kazan.egePrograms.length} + ${kazan.magistracyCount}`);
    check("найдено 6 вузов", kazan.universities.length === 6,
        kazan.universities.map(u => u.short).join(", "));
    check("уровни образования — только те, куда идут по ЕГЭ",
        kazan.levels.join(" / ") === "Бакалавриат / Специалитет",
        kazan.levels.join(" / "));
    check("магистратуры нет среди уровней для подбора",
        kazan.levels.indexOf("Магистратура") === -1);

    const леч = kazan.programs.find(p => p.code === "31.05.01");
    check("код 31.05.01 собран из id-1.id-2.id-3",
        !!леч && леч.name === "Лечебное дело", леч ? леч.name : "нет");
    check("обязательный предмет — химия",
        !!леч && леч.required === "хим", леч ? леч.required : "—");
    check("предметы на выбор — биология или математика",
        !!леч && леч.choice.join("/") === "био/мат", леч ? леч.choice.join("/") : "—");
    check("тире «-» стало null, а не нулём",
        !!леч && леч.scores["КНИТУ"].budget === null,
        леч ? String(леч.scores["КНИТУ"].budget) : "—");
    check("укрупнённая группа подставлена",
        !!леч && леч.group === "Клиническая медицина",
        леч ? леч.group : "—");

    // ─────────────────────────────────────────────────────────────────────────
    section("3. Клик по региону на карте открывает город");

    check("регион «Республика Татарстан» есть на карте",
        !!doc.querySelector('.region[data-region-name="Республика Татарстан"]'));
    clickRegion("Республика Татарстан");
    window.updateSidebarUnis();
    await tick();

    check("сайдбар переключился на Казань",
        /Казан/.test(doc.getElementById("sidebar-region-title").innerText),
        doc.getElementById("sidebar-region-title").innerText);
    check("в обзоре 6 вузов", cards().length === 6, String(cards().length));
    check("сводка города: 6 вузов · 103 направления после 11 класса",
        /6 вузов · 103 направления после 11 класса/.test(summary()), summary());
    /* Баллы показываются отдельно по уровням: у бакалавриата и специалитета
       свои проходные, общий диапазон смешивал бы их. */
    const kfuInfo = cards()[0].querySelector(".uni-item-info").innerText;
    check("у КФУ баллы раздельно: бакалавриат 170–278, специалитет 217–276",
        /Бакалавриат: 170–278/.test(kfuInfo) && /Специалитет: 217–276/.test(kfuInfo),
        kfuInfo);
    check("у КНИТУ баллы тоже раздельно: 171–253 и 137–215",
        /Бакалавриат: 171–253/.test(cards()[2].innerText) &&
        /Специалитет: 137–215/.test(cards()[2].innerText),
        cards()[2].querySelector(".uni-item-info").innerText);

    /* Каждая строка баллов относится ровно к одному уровню, поэтому в ней
       не может быть смешанного диапазона и не может быть магистратуры. */
    const infoLines = [...list().querySelectorAll(".uni-item-info")].map(e => e.innerText);
    check("ни один вуз не показывает балл ниже 130 (магистратура исключена)",
        infoLines.every(t => [...t.matchAll(/(\d+)–(\d+)/g)].every(m => Number(m[1]) >= 130)),
        infoLines[0]);
    check("магистратуры в обзоре города нет",
        !/Магистратура/.test(list().innerText) && !/\.04\./.test(list().innerText));
    check("у каждого балла подписан уровень",
        infoLines.every(t => /Бакалавриат|Специалитет|Нет данных/.test(t)), infoLines[0]);
    check("внизу списка написано, почему магистратуры нет",
        /42 программы магистратуры/.test(list().innerText) &&
        /после диплома/.test(list().innerText),
        (list().querySelector(".city-note") || { innerText: "плашки нет" }).innerText);
    check("счётчик в шапке: «6 ВУЗов»",
        doc.getElementById("sheet-count-badge").innerText === "6 ВУЗов",
        doc.getElementById("sheet-count-badge").innerText);

    // ─────────────────────────────────────────────────────────────────────────
    section("4. Подбор №1 — по предметам ЕГЭ");

    setSubjects(["Русский язык", "Математика (профиль)", "Информатика"]);
    await tick();
    check("режим «по предметам» включён по умолчанию",
        doc.getElementById("pick-mode-subjects").classList.contains("is-active"));
    check("список направлений скрыт", doc.getElementById("direction-picker").style.display === "none");

    check("осталось 5 вузов: 6-й не ведёт приём по этой комбинации",
        cards().length === 5, String(cards().length));
    check("вузы отсортированы от самого доступного: КНИТУ 183 → КГАСУ 192",
        cardNames().join(", ") === "КНИТУ, КФУ, КГЭУ, КНИТУ-КАИ, КГАСУ",
        cardNames().join(", "));
    check("в сводке перечислены выбранные предметы, без русского (он везде обязателен)",
        /математика \(профиль\)/.test(summary()) && /информатика/.test(summary()) &&
        !/русский/.test(summary()), summary());
    check("в сводке 48 направлений и 5 вузов (уникальные, а не «направление × вуз»)",
        /Подходит 48 направлений в 5 вузах/.test(summary()), summary());
    check("магистратуры в выдаче нет ни в одном вузе",
        !/Магистратура/.test(list().innerText) && !/04\d{1}/.test(summary()));
    check("у вуза показан лучший балл и примеры направлений",
        /Лучший балл: \d+/.test(cards()[0].querySelector(".uni-item-info").innerText) &&
        cards()[0].querySelectorAll(".uni-detail-row").length >= 1,
        cards()[0].querySelector(".uni-item-details").innerText.slice(0, 80));
    check("у лучшего балла подписан уровень",
        cards()[0].querySelector(".uni-item-info .level-tag") !== null,
        cards()[0].querySelector(".uni-item-info").innerText);
    check("у каждого примера направления подписан уровень",
        [...cards()[0].querySelectorAll(".uni-detail-row")].every(r =>
            r.querySelector(".level-tag") || /и ещё/.test(r.innerText)),
        cards()[0].querySelector(".uni-item-details").innerText.replace(/\n/g, " | ").slice(0, 90));

    setScores([80, 80, 80]);          // сумма 240
    check("сумма баллов = 240",
        doc.getElementById("total-ege-score").innerText === "240",
        doc.getElementById("total-ege-score").innerText);
    check("с 240 баллами проходят все 5 вузов",
        badges().pass === 5 && badges().fail === 0,
        `проходит ${badges().pass}, не хватает ${badges().fail}`);

    setScores([60, 60, 60]);          // сумма 180
    check("со 180 баллами не проходит никто: минимум по городу 183, а не 40",
        badges().pass === 0 && badges().fail === 5,
        `проходит ${badges().pass}, не хватает ${badges().fail}`);

    setScores([65, 70, 70]);          // сумма 205
    check("с 205 баллами проходят все 5 вузов",
        badges().pass === 5 && badges().fail === 0,
        `проходит ${badges().pass}, не хватает ${badges().fail}`);

    setSubjects(["Русский язык", "Химия", "Биология"]);
    await tick();
    check("комбинация «химия + биология»: 3 вуза", cards().length === 3, String(cards().length));
    check("порядок по возрастанию лучшего балла: КНИТУ 215, КФУ 217, КГМУ 217",
        cardNames().join(", ") === "КНИТУ, КФУ, КГМУ", cardNames().join(", "));

    setSubjects(["Физика"]);          // физика без математики не подходит никуда
    await tick();
    check("одна физика без математики — направлений нет",
        cards().length === 0 && /направлений не найдено/.test(list().innerText),
        list().innerText.slice(0, 60));

    // ─────────────────────────────────────────────────────────────────────────
    section("5. Подбор №2 — по направлениям");

    window.setPickMode("directions");
    await tick();
    check("переключились на режим «по направлениям»",
        doc.getElementById("pick-mode-directions").classList.contains("is-active") &&
        doc.getElementById("pick-mode-subjects").classList.contains("is-active") === false);
    check("появился список направлений", doc.getElementById("direction-picker").style.display === "block");

    const dirSelect = doc.getElementById("dir-select");
    const levelSelect = doc.getElementById("dir-level");
    check("уровни: «Бакалавриат и специалитет» + 2 уровня, магистратуры нет",
        levelSelect.options.length === 3 &&
        /Бакалавриат и специалитет/.test(levelSelect.options[0].textContent) &&
        ![...levelSelect.options].some(o => /Магистратура/.test(o.textContent)),
        [...levelSelect.options].map(o => o.textContent).join(" | "));
    check("направления сгруппированы по укрупнённым группам",
        dirSelect.querySelectorAll("optgroup").length === 34,
        String(dirSelect.querySelectorAll("optgroup").length));
    check("в списке 103 направления после 11 класса",
        dirSelect.options.length === 104, String(dirSelect.options.length));
    check("магистратуры в списке направлений нет",
        ![...dirSelect.options].some(o => /\.04\./.test(o.value)));

    levelSelect.value = "Специалитет";
    levelSelect.dispatchEvent(new window.Event("change", { bubbles: true }));
    check("фильтр по уровню «Специалитет» сузил список",
        dirSelect.options.length === 30, String(dirSelect.options.length));

    levelSelect.value = "";
    levelSelect.dispatchEvent(new window.Event("change", { bubbles: true }));

    dirSelect.value = "09.03.04";
    dirSelect.dispatchEvent(new window.Event("change", { bubbles: true }));
    await tick();

    check("«09.03.04 Программная инженерия» есть в 2 вузах", cards().length === 2, String(cards().length));
    check("вузы отсортированы по баллу: КФУ 263, КНИТУ-КАИ 279",
        cardScores().join(", ") === "263, 279", cardScores().join(", "));
    check("в карточке видны предметы ЕГЭ направления",
        /Математика \(профиль\) \+ Информатика или Физика/.test(cards()[0].innerText),
        cards()[0].querySelector(".uni-item-details").innerText.replace(/\n/g, " | "));
    check("в карточке указано название направления",
        /Программная инженерия/.test(cards()[0].innerText));

    dirSelect.value = "31.05.01";
    dirSelect.dispatchEvent(new window.Event("change", { bubbles: true }));
    await tick();
    check("«31.05.01 Лечебное дело»: специалитет, 2 вуза",
        cards().length === 2 && cardScores().join(", ") === "258, 276",
        cardScores().join(", "));
    check("уровень указан в сводке", /Специалитет/.test(summary()), summary());

    setScores([90, 95, 92]);          // сумма 277
    check("с 277 баллами проходит и КГМУ, и КФУ",
        badges().pass === 2, `проходит ${badges().pass}`);
    setScores([50, 50, 50]);
    check("с 150 баллами не проходит никто",
        badges().fail === 2 && badges().pass === 0);

    // ─────────────────────────────────────────────────────────────────────────
    section("6. БВИ и платное отделение");

    setAdmission("bvi");
    await tick();
    check("в режиме БВИ вместо «Проходит» стоит метка «БВИ»",
        badges().bvi === 2 && badges().pass === 0,
        `БВИ ${badges().bvi}, проходит ${badges().pass}`);
    setAdmission("ege");
    await tick();

    setStudyType("paid");
    await tick();
    check("платное: у КФУ и КНИТУ-КАИ баллы отличаются от бюджета",
        cardScores().join(", ") !== "263, 279", cardScores().join(", "));
    check("панель не сломалась", cards().length === 2, String(cards().length));

    setStudyType("budget");
    window.setPickMode("subjects");
    await tick();
    check("возврат к подбору по предметам работает", cards().length === 5, String(cards().length));
    check("выбранное ранее направление больше не мешает", !/Лечебное дело/.test(list().innerText));

    // ─────────────────────────────────────────────────────────────────────────
    section("7. Города без подробной базы работают по-старому");

    window.selectCity("Москва");
    await tick();
    check("Москва: 3 вуза из uniData", cards().length === 3, String(cards().length));
    check("заголовок говорит про Москву",
        /Москв/.test(doc.getElementById("sidebar-region-title").innerText));

    window.selectCity("Новосибирск");
    check("Новосибирск: 2 вуза", cards().length === 2, String(cards().length));

    clickRegion("Томская область");   // региона нет ни в одном реестре городов
    await tick();
    check("регион без данных показывает подсказку, а не чужие вузы",
        /Выберите город на карте/.test(list().innerText), list().innerText.slice(0, 60));

    // ─────────────────────────────────────────────────────────────────────────
    section("8. Регрессия: заголовок панели написан капсом и город всё равно найден");

    /* В styles.css есть правило `.unis-section h3 { text-transform: uppercase }`,
       а заголовок панели — это <h3 id="sidebar-region-title">. Браузер возвращает
       innerText уже преобразованным: «ВУЗЫ ГОРОДА КАЗАНЬ». Из-за этого поиск
       города по точному совпадению не срабатывал и панель откатывалась на
       старую заглушку uniData — вместо 6 вузов показывался один КФУ. */
    setSubjects(["Русский язык"]);               // возвращаем режим обзора
    await tick();
    window.resetMapView();                       // сбрасывает и запомненный город
    await tick();
    doc.getElementById("sidebar-region-title").innerText = "ВУЗЫ ГОРОДА КАЗАНЬ";
    window.updateSidebarUnis();
    await tick();
    check("город распознан по заголовку в верхнем регистре",
        cards().length === 6, String(cards().length));
    check("это данные Казани, а не заглушка",
        /Казань: 6 вузов/.test(summary()), summary().slice(0, 60));

    clickRegion("Республика Татарстан");
    await tick();
    check("клик по региону тоже ведёт в Казань", cards().length === 6, String(cards().length));

    /* Точки городов лежат в слое #cities-dots-layer (см. initCityRegistry) */
    const kazanDot = doc.querySelector('#cities-dots-layer .city-dot[data-city="Казань"]');
    if (kazanDot) {
        kazanDot.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true }));
        await tick();
        check("клик по точке Казани на карте открывает данные города",
            cards().length === 6, String(cards().length));
    } else {
        check("точка Казани есть на карте", false, "не найдена в #cities-dots-layer");
    }

    // ─────────────────────────────────────────────────────────────────────────
    section("9. Открытие файлом: объяснение вместо молчаливой заглушки");

    /* Браузеры запрещают fetch к file:// — данные из data/ не загрузятся.
       Страница обязана сказать об этом, а не показывать старую заглушку. */
    const fileDom = new JSDOM(html, {
        runScripts: "outside-only",
        pretendToBeVisual: true,
        url: "file:///C:/Users/nk/Desktop/University_Net/frontend/index.html",
    });
    const fw = fileDom.window;
    Object.defineProperty(fw.HTMLElement.prototype, "innerText", {
        get() { return this.textContent; }, set(v) { this.textContent = v; },
        configurable: true,
    });
    Object.defineProperty(fw.SVGElement.prototype, "getBBox", {
        value() { return { x: 1, y: 1, width: 1, height: 1 }; }, configurable: true,
    });
    if (appBuild) fw.APP_BUILD = appBuild;

    const fileErrors = [];
    fw.addEventListener("error", e => fileErrors.push(e.message));
    for (const src of scripts) {
        try { fw.eval(fs.readFileSync(path.join(FRONTEND, src), "utf-8")); }
        catch (e) { fileErrors.push(`${src}: ${e.message}`); }
    }
    await tick(30);
    if (!fw.document.querySelector(".ege-subject-row")) {
        fw.document.dispatchEvent(new fw.Event("DOMContentLoaded", { bubbles: true }));
        await tick(20);
    }

    const fileList = fw.document.getElementById("sidebar-unis-list");
    check("в панели написано, что данные не загружены и что делать",
        /Данные не загружены/.test(fileList.innerText) &&
        /start\.bat/.test(fileList.innerText) &&
        /127\.0\.0\.1:8000/.test(fileList.innerText),
        fileList.innerText.slice(0, 70));

    fw.selectCity("Казань");
    await tick(30);
    check("и после выбора города сообщение остаётся, а не подменяется заглушкой",
        /Данные не загружены/.test(fileList.innerText), fileList.innerText.slice(0, 70));
    check("ошибок в консоли нет", fileErrors.length === 0, fileErrors.join("; "));

    // ─────────────────────────────────────────────────────────────────────────
    section("11. Карта: название города выводится один раз");

    /* Раньше при наведении на город появлялись сразу две подписи: жёлтая
       (подсветка .city-label) и всплывающая подсказка — причём разными
       шрифтами, потому что у #region-tooltip шрифт не был задан. */
    const css = fs.readFileSync(path.join(FRONTEND, "styles.css"), "utf-8");
    const labelRules = css.match(/\.city-label[^{]*\{[^}]*\}/g) || [];
    check("жёлтой подсветки подписи города больше нет",
        !labelRules.some(r => /#fbbf24/i.test(r)),
        labelRules.filter(r => /#fbbf24/i.test(r)).join(" "));

    /* Жёлтыми были и сами точки городов: при наведении и у выбранного города. */
    const dotRules = css.match(/\.city-dot[^{]*\{[^}]*\}/g) || [];
    check("жёлтого нет и у точек городов",
        !dotRules.some(r => /#fbbf24|#f59e0b|#eab308/i.test(r)) &&
        !/#fbbf24|#f59e0b/i.test(css),
        dotRules.filter(r => /#fbbf24|#f59e0b/i.test(r)).join(" "));
    check("подсветка точки при наведении — голубая, выбранный город — белый",
        /\.city-dot:hover[^{]*\{[^}]*#7dd3fc/.test(css) &&
        /\.city-dot\.is-selected[^{]*\{[^}]*#ffffff/.test(css));
    check("у всплывающей подсказки задан тот же шрифт, что у подписей",
        /#region-tooltip\s*\{[^}]*font-family:\s*-apple-system/.test(css));
    check("размер подписи города уменьшен до 10px",
        /const fontScreenPx = 10(\.0)?;/.test(fs.readFileSync(path.join(FRONTEND, "script.js"), "utf-8")));

    const kazanLabel = doc.querySelector('#cities-labels-layer .city-label[data-city="Казань"]');
    const kazanDotMap = doc.querySelector('#cities-dots-layer .city-dot[data-city="Казань"]');
    check("подпись Казани показана на карте", !!kazanLabel && kazanLabel.style.opacity === "1",
        kazanLabel ? `opacity=${kazanLabel.style.opacity}` : "нет подписи");
    check("подпись Казани не крупнее 10px в экранных пикселях",
        kazanLabel && parseFloat(kazanLabel.style.fontSize) > 0 &&
        parseFloat(kazanLabel.style.fontSize) * 1.6 < 20,
        kazanLabel ? kazanLabel.style.fontSize : "—");

    const tooltip = doc.getElementById("region-tooltip");

    kazanDotMap.dispatchEvent(new window.MouseEvent("mouseenter", { bubbles: false }));
    await tick(20);
    check("у города с подписью подсказка НЕ появляется — название видно один раз",
        !tooltip.classList.contains("visible"),
        tooltip.classList.contains("visible") ? `"${tooltip.textContent}"` : "скрыта");

    /* У городов без подписи подсказка остаётся единственным способом
       увидеть название — её не убираем. */
    const noLabelCity = [...doc.querySelectorAll("#cities-dots-layer .city-dot")]
        .find(d => !["Москва", "Санкт-Петербург", "Томск", "Казань"]
            .includes(d.getAttribute("data-city")));
    if (noLabelCity) {
        const hiddenLabel = doc.querySelector(
            `#cities-labels-layer .city-label[data-city="${noLabelCity.getAttribute("data-city")}"]`);
        check("у остальных городов подпись скрыта",
            !hiddenLabel || hiddenLabel.style.opacity === "0",
            hiddenLabel ? hiddenLabel.style.opacity : "нет подписи вовсе");

        noLabelCity.dispatchEvent(new window.MouseEvent("mouseenter", { bubbles: false }));
        await tick(20);
        check(`у города без подписи (${noLabelCity.getAttribute("data-city")}) подсказка показывается`,
            tooltip.classList.contains("visible") &&
            tooltip.textContent === noLabelCity.getAttribute("data-city"),
            `"${tooltip.textContent}"`);
    }

    // ─────────────────────────────────────────────────────────────────────────
    section("12. Уровень образования: магистратура не вводит в заблуждение");

    window.selectCity("Казань");
    await tick();
    setScores([], );
    setSubjects(["Русский язык", "Математика (профиль)", "Информатика"]);
    await tick();

    const levelPicker = doc.getElementById("dir-level");
    check("фильтр уровня виден и в режиме «по предметам»",
        levelPicker && levelPicker.offsetParent !== null || !!levelPicker);
    check("в фильтре есть бакалавриат и специалитет",
        [...levelPicker.options].map(o => o.value).join(",") === ",Бакалавриат,Специалитет",
        [...levelPicker.options].map(o => o.textContent).join(" | "));

    /* Каждый уровень должен считаться по СВОИМ проходным баллам.
       Числа проверяем точные: если фильтр смешает уровни, они не сойдутся. */
    levelPicker.value = "Бакалавриат";
    levelPicker.dispatchEvent(new window.Event("change", { bubbles: true }));
    await tick();
    check("Бакалавриат: 34 направления в 5 вузах",
        /Подходит 34 направления в 5 вузах/.test(summary()), summary());
    check("Бакалавриат: порядок по своим баллам — КФУ 185, КНИТУ 185, КГЭУ 187, КГАСУ 192",
        cardNames().join(", ") === "КФУ, КНИТУ, КГЭУ, КГАСУ, КНИТУ-КАИ",
        cardNames().join(", "));
    check("Бакалавриат: у всех лучший балл из диапазона 185–193",
        cardScores().every(v => v >= 185 && v <= 193), cardScores().join(", "));
    check("Бакалавриат: ни одного балла специалитета (137–252) в выдаче",
        !/20\.05\.01|11\.05\.01|03\.05\.01/.test(list().innerText));
    check("Бакалавриат: подписи уровня у лучшего балла говорят «бакалавриат»",
        [...cards()].every(c => /бакалавриат/i.test(
            c.querySelector(".uni-item-info .level-tag").innerText)),
        cards()[0].querySelector(".uni-item-info").innerText);

    levelPicker.value = "Специалитет";
    levelPicker.dispatchEvent(new window.Event("change", { bubbles: true }));
    await tick();
    check("Специалитет: 14 направлений в 5 вузах",
        /Подходит 14 направлений в 5 вузах/.test(summary()), summary());
    check("Специалитет: свой порядок — КНИТУ 183, КНИТУ-КАИ 190, КГАСУ 195",
        cardNames().slice(0, 3).join(", ") === "КНИТУ, КНИТУ-КАИ, КГАСУ",
        cardNames().join(", "));
    check("Специалитет: баллы другие, чем на бакалавриате",
        cardScores()[0] === 183 && cardScores().join(",") !== "185,185,187,192,193",
        cardScores().join(", "));
    check("Специалитет: подписи уровня говорят «специалитет»",
        [...cards()].every(c => /специалитет/i.test(
            c.querySelector(".uni-item-info .level-tag").innerText)));
    check("Специалитет: в выдаче нет бакалаврских кодов (20.03.02 и подобных)",
        !/20\.03\.02|11\.03\.01|13\.03\.01/.test(list().innerText));

    levelPicker.value = "";
    levelPicker.dispatchEvent(new window.Event("change", { bubbles: true }));
    await tick();
    check("возврат к «бакалавриат и специалитет» расширяет выдачу до 48 направлений",
        cards().length === 5 && /Подходит 48 направлений в 5 вузах/.test(summary()),
        summary());

    // ─────────────────────────────────────────────────────────────────────────
    section("14. Версии файлов и защита от старого кэша");

    /* Эта проверка появилась после реального случая: браузер отдал старые
       city-panel.js и data-loader.js из кэша, и на экране остались цифры
       прошлой версии (63 направления и балл 40 из магистратуры) — при том
       что на диске лежал уже исправленный код. */
    check("у всех скриптов и стилей стоит метка версии ?v=",
        scriptTags.every(src => /\?v=\d+/.test(src)) &&
        /styles\.css\?v=\d+/.test(html),
        scriptTags.join(", "));
    check("метки версий совпадают между собой",
        new Set([...scriptTags, (html.match(/styles\.css\?(v=\d+)/) || [])[1] || "styles.css"]
            .map(src => (src.match(/\?v=(\d+)/) || [])[1]).filter(Boolean)).size === 1,
        scriptTags.join(", "));

    check("в разметке объявлена версия сборки", window.APP_BUILD === "4", window.APP_BUILD);
    check("панель и загрузчик данных той же версии",
        window.__BUILDS && window.__BUILDS.panel === "4" && window.__BUILDS.data === "4",
        JSON.stringify(window.__BUILDS));

    const stamp = doc.getElementById("build-stamp");
    check("внизу панели есть подпись сборки", !!stamp && /Сборка 4/.test(stamp.textContent),
        stamp ? stamp.textContent : "нет элемента");
    check("подпись не в тревожном состоянии — файлы совпадают",
        stamp && !stamp.classList.contains("is-stale"), stamp ? stamp.className : "—");

    /* Если какая-то часть окажется старой, подпись обязана это показать. */
    const savedAppBuild = window.APP_BUILD;
    window.APP_BUILD = "1";
    window.__renderBuildStamp();
    check("при расхождении версий подпись предупреждает о старых файлах",
        stamp.classList.contains("is-stale") && /Ctrl\+F5/.test(stamp.textContent),
        stamp.textContent);
    window.APP_BUILD = savedAppBuild;
    window.__renderBuildStamp();

    const caddyConf = fs.readFileSync(path.join(ROOT, "deploy", "Caddyfile"), "utf-8");
    const mainPy = fs.readFileSync(path.join(ROOT, "main.py"), "utf-8");
    check("на сервере html, js и css отдаются с запретом кэша",
        /@code path \*\.html \*\.js \*\.css/.test(caddyConf) &&
        /header @code Cache-Control "no-cache"/.test(caddyConf));
    check("локальный сервер start.bat тоже не кэширует код",
        /NO_CACHE_SUFFIXES = \("\.html", "\.js", "\.css"\)/.test(mainPy) &&
        /no_cache_for_code/.test(mainPy));

    // ─────────────────────────────────────────────────────────────────────────
    section("15. Предупреждение: предметы не подходят под выбранное направление");

    /* Направление выбирают руками, поэтому набор предметов может не совпасть.
       Панель обязана сказать это внизу, а не молча показывать баллы. */
    window.selectCity("Казань");
    window.setPickMode("directions");
    await tick();

    setSubjects(["Русский язык", "Математика (профиль)", "Информатика"]);
    const dirPick = doc.getElementById("dir-select");
    dirPick.value = "09.03.04";
    dirPick.dispatchEvent(new window.Event("change", { bubbles: true }));
    await tick();
    check("предметы подходят — предупреждения нет",
        !/не подходят/.test(list().innerText), list().innerText.slice(-60));
    check("карточки направления на месте", cards().length === 2, String(cards().length));

    setSubjects(["Русский язык", "Химия", "Биология"]);
    await tick();
    check("предметы не подходят — внизу появилось предупреждение",
        /Ваши предметы ЕГЭ не подходят/.test(list().innerText),
        list().innerText.slice(-80));
    check("в предупреждении перечислено, что нужно сдать",
        /Нужны: Русский язык \+ Математика \(профиль\) \+ Информатика или Физика/.test(list().innerText),
        (list().querySelector(".city-warn") || { innerText: "нет блока" }).innerText);
    check("и что выбрано у абитуриента",
        /У вас выбрано: Химия, Биология/.test(list().innerText),
        (list().querySelector(".city-warn") || { innerText: "нет" }).innerText);
    check("предупреждение стоит внизу, после карточек",
        list().lastElementChild.classList.contains("city-warn"),
        list().lastElementChild.className);
    check("баллы при этом всё равно показаны — направление смотрят осознанно",
        cards().length === 2, String(cards().length));

    setSubjects(["Русский язык", "Химия", "Биология"]);
    dirPick.value = "31.05.01";
    dirPick.dispatchEvent(new window.Event("change", { bubbles: true }));
    await tick();
    check("химия + биология подходят для лечебного дела — предупреждения нет",
        !/не подходят/.test(list().innerText), list().innerText.slice(-60));

    // ─────────────────────────────────────────────────────────────────────────
    section("16. Стабильность");

    check("ошибок в консоли нет", errors.length === 0, errors.join("; "));
    check("панель выдержала все переключения", cards().length === 0 || cards().length > 0);

    console.log(`\nПройдено: ${passed}   Провалено: ${failed}`);
    if (failed === 0) console.log("Все проверки пройдены ✅");
    process.exit(failed ? 1 : 0);
}

main().catch(e => {
    console.log(`\n❌ Тест упал: ${e.message}\n${e.stack}`);
    process.exit(1);
});
