/**
 * Проверка фронтенда в эмуляторе браузера (jsdom).
 *
 * Зачем: имитирует реального пользователя — кликает по точке Томска на карте,
 * выбирает предметы ЕГЭ, вводит баллы и проверяет, что список вузов построился
 * правильно. Ловит регрессии без открытия браузера.
 *
 * Запуск:
 *     npm install jsdom
 *     node tools/test_frontend.js
 *
 * Если Node нет — не страшно, это необязательный инструмент разработчика.
 */

const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const REPO = "/home/user/University_Net";
const FRONTEND = path.join(REPO, "frontend");

let passed = 0, failed = 0;
function check(name, condition, detail = "") {
    if (condition) { passed++; console.log(`  ✅ ${name}`); }
    else { failed++; console.log(`  ❌ ${name}${detail ? " → " + detail : ""}`); }
}

// ── Собираем страницу так же, как её отдаёт сервер ───────────────────────────
const files = ["index.html", "styles.css", "script.js", "russia-map.js", "data.js"];
const html = fs.readFileSync(path.join(FRONTEND, "index.html"), "utf-8");
const scripts = {};
for (const f of ["script.js", "russia-map.js", "data.js"]) {
    scripts[f] = fs.readFileSync(path.join(FRONTEND, f), "utf-8");
}

const dom = new JSDOM(html, {
    runScripts: "outside-only",
    pretendToBeVisual: true,
    url: "http://127.0.0.1:8000/",
});
const { window } = dom;

// jsdom не реализует innerText (в браузерах он есть, и script.js им пользуется).
// Подставляем textContent — иначе тест покажет ложные ошибки.
Object.defineProperty(window.HTMLElement.prototype, "innerText", {
    get() { return this.textContent; },
    set(v) { this.textContent = v; },
    configurable: true,
});

// jsdom не реализует и SVG getBBox(), который script.js зовёт при клике по городу
Object.defineProperty(window.SVGElement.prototype, "getBBox", {
    value() { return { x: 340, y: 340, width: 30, height: 30 }; },
    configurable: true,
});

// Собираем ошибки консоли
const errors = [];
window.addEventListener("error", e => errors.push(e.message));

// Выполняем скрипты в том порядке, в котором их подключает index.html
const order = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
console.log(`  порядок скриптов в index.html: ${order.join(" → ")}\n`);

for (const name of order) {
    if (!scripts[name]) { console.log(`  (пропущен ${name})`); continue; }
    try {
        window.eval(scripts[name]);
    } catch (e) {
        console.log(`  ❌ ошибка при выполнении ${name}: ${e.message}`);
        failed++;
    }
}

// script.js вешает инициализацию на DOMContentLoaded — в jsdom он уже прошёл,
// поэтому запускаем событие вручную (в браузере это делает сам браузер).
window.document.dispatchEvent(new window.Event("DOMContentLoaded", { bubbles: true }));

console.log("\n=== 1. Базовые проверки ===");
check("все скрипты выполнились без исключений", errors.length === 0, errors.join("; "));
check("window.uniData объявлен (старый баг №2)", typeof window.uniData === "object",
      String(typeof window.uniData));
check("window.TOMSK_DATA объявлен", typeof window.TOMSK_DATA === "object");
check("updateSidebarUnis перехвачен", typeof window.updateSidebarUnis === "function");
check("карта содержит Томск", html.includes('data-city="Томск"'));

console.log("\n=== 2. НАСТОЯЩИЙ клик по точке «Томск» на карте ===");
const doc = window.document;

const tomskDot = doc.querySelector('.city-group[data-city="Томск"]');
check("точка Томска найдена на карте", !!tomskDot);
tomskDot.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true }));

const title = doc.getElementById("sidebar-region-title").innerText;
check("клик по карте открыл сайдбар Томска", title === "ВУЗы города Томск", title);
check("кнопка «Вернуться к карте России» показана",
      doc.getElementById("back-btn").classList.contains("visible"));

console.log("\n--- выбор предметов «Русский + Мат + Инфа» ---");

// Ставим предметы в калькуляторе: Русский, Математика (профиль), Информатика
const select = doc.querySelector(".ege-select");
function setSubject(selectEl, value) {
    selectEl.value = value;
    if (selectEl.onchange) selectEl.onchange();
}
setSubject(select, "Русский язык");
window.addEgeSubject("Математика (профиль)");
window.addEgeSubject("Информатика");

const allSelects = [...doc.querySelectorAll(".ege-select")].map(s => s.value);
check("предметы выставлены", allSelects.length === 3, allSelects.join(", "));

// Вводим баллы: 85 + 80 + 78 = 243
const inputs = [...doc.querySelectorAll(".ege-input")];
const values = [85, 80, 78];
inputs.forEach((inp, i) => { inp.value = values[i]; if (inp.oninput) inp.oninput(); });

const total = doc.getElementById("total-ege-score").innerText;
check("сумма баллов посчитана", total === "243", total);

const comboSelect = doc.getElementById("tomsk-combo");
check("выпадающий список комбинаций появился", !!comboSelect);
check("комбинация подобрана автоматически: «мат / инфа»",
      comboSelect && comboSelect.value === "мат / инфа",
      comboSelect ? comboSelect.value : "нет списка");

console.log("\n=== 3. Что отрисовалось в сайдбаре ===");
const cards = doc.querySelectorAll("#sidebar-unis-list .uni-item");
check("карточек вузов ровно 6", cards.length === 6, String(cards.length));

const summary = doc.querySelector(".tomsk-summary");
check("сводка «проходит в N из 6» есть", !!summary);
if (summary) console.log(`     ${summary.innerText.replace(/\s+/g, " ").trim()}`);

// Ожидаемые баллы для «мат / инфа»: тусур 230, тпу 220, тгу 245, сибгму 140, тгасу 185, тгпу 170
// При сумме 243 проходят: ТУСУР(230), ТПУ(220), СибГМУ(140), ТГАСУ(185), ТГПУ(170) = 5 из 6
const passing = [...cards].filter(c => c.querySelector(".badge-pass")).length;
const failing = [...cards].filter(c => c.querySelector(".badge-fail")).length;
check("проходит 5 вузов", passing === 5, `прошло ${passing}`);
check("не хватает 1 вузу (ТГУ, 245)", failing === 1, `не прошло ${failing}`);

console.log("\n     карточки:");
[...cards].forEach(c => {
    const name = c.querySelector(".uni-item-name").innerText.split(" — ")[0];
    const score = (c.querySelector(".uni-item-info").innerText.match(/\d+/) || ["?"])[0];
    const badge = c.querySelector(".badge-pass") ? "проходит"
                : c.querySelector(".badge-fail") ? "не хватает" : "—";
    console.log(`       ${name.padEnd(8)} мин. ${String(score).padStart(3)}  ${badge}`);
});

console.log("\n=== 4. Детали: направления по комбинации ===");
const details = cards[0].querySelectorAll(".uni-detail-row");
check("у первой карточки список направлений", details.length > 1, `${details.length} строк`);
if (details.length > 1) console.log(`     ${details[1].innerText.trim()}`);

console.log("\n=== 5. Смена комбинации вручную ===");
comboSelect.value = "хим / био";
comboSelect.dispatchEvent(new window.Event("change"));
const cards2 = doc.querySelectorAll("#sidebar-unis-list .uni-item");
const tgu = [...cards2].find(c => c.querySelector(".uni-item-name").innerText.startsWith("ТГУ"));
const tguScore = tgu ? tgu.querySelector(".uni-item-info").innerText.match(/\d+/)[0] : null;
check("после смены комбинации балл ТГУ = 230 (хим/био)", tguScore === "230", String(tguScore));
if (summary) {
    const s2 = doc.querySelector(".tomsk-summary");
    console.log(`     ${s2.innerText.replace(/\s+/g, " ").trim()}`);
}

console.log("\n=== 6. Возврат автоподбора ===");
const autoLink = doc.getElementById("tomsk-auto");
if (autoLink) {
    autoLink.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true }));
    const after = doc.getElementById("tomsk-combo");
    check("вернулась автокомбинация «мат / инфа»", after.value === "мат / инфа", after.value);
} else {
    check("ссылка «вернуть автоподбор» есть", false);
}

console.log("\n=== 7. Другие города не сломались (делегирование в оригинал) ===");
window.selectCity("Москва");
const moscowCards = doc.querySelectorAll("#sidebar-unis-list .uni-item");
check("Москва: 3 вуза из старой базы", moscowCards.length === 3, String(moscowCards.length));
const mowName = moscowCards[0] ? moscowCards[0].querySelector(".uni-item-name").innerText : "";
check("первый вуз Москвы — МГУ", mowName.includes("МГУ"), mowName);
check("названия городов снова рендерит оригинал (без панели комбинаций)",
      !doc.getElementById("tomsk-combo"));

window.selectCity("Томск");
check("возврат в Томск: панель комбинаций снова есть", !!doc.getElementById("tomsk-combo"));

console.log(`\n${"─".repeat(50)}`);
console.log(`Пройдено: ${passed}   Провалено: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
