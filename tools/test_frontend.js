/**
 * Автотест фронтенда University_Net (эмулятор браузера, jsdom).
 *
 * Проверяет главный пользовательский сценарий целиком, без запуска браузера:
 *   открыл index.html → кликнул Томск → выбрал предметы ЕГЭ → ввёл баллы
 *   → увидел список вузов с проходными баллами и метками «Проходит / Не хватает».
 *
 * Запуск (нужен Node.js):
 *     npm install jsdom
 *     node tools/test_frontend.js
 *
 * Скрипты подключаются ровно в том порядке, в котором их грузит index.html —
 * поэтому тест заодно ловит ошибку «забыли подключить data.js».
 */

const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const FRONTEND = path.join(__dirname, "..", "frontend");

let passed = 0, failed = 0;
const check = (name, ok, detail = "") =>
    ok ? (passed++, console.log(`  ✅ ${name}`))
       : (failed++, console.log(`  ❌ ${name}${detail ? " → " + detail : ""}`));

// ── Загружаем index.html так же, как это делает браузер с диска (file://) ────
const html = fs.readFileSync(path.join(FRONTEND, "index.html"), "utf-8");

const dom = new JSDOM(html, {
    runScripts: "outside-only",
    pretendToBeVisual: true,
    url: "file:///C:/Users/nx/Desktop/University_Net/frontend/index.html",
});
const { window } = dom;

// jsdom не реализует innerText и SVG.getBBox(), которыми пользуется script.js.
// В настоящих браузерах они есть — подставляем, чтобы не было ложных ошибок.
Object.defineProperty(window.HTMLElement.prototype, "innerText", {
    get() { return this.textContent; },
    set(v) { this.textContent = v; },
    configurable: true,
});
Object.defineProperty(window.SVGElement.prototype, "getBBox", {
    value() { return { x: 340, y: 340, width: 30, height: 30 }; },
    configurable: true,
});

const errors = [];
window.addEventListener("error", e => errors.push(e.message));

const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
console.log(`  протокол file:// · скрипты: ${scripts.join(" → ")}\n`);

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

// В браузере это событие наступает само; в jsdom запускаем вручную
window.document.dispatchEvent(new window.Event("DOMContentLoaded", { bubbles: true }));
const doc = window.document;

console.log("=== 1. Данные загрузились с диска, без сервера ===");
check("ошибок в консоли нет", errors.length === 0, errors.join("; "));
check("база вузов (window.uniData) объявлена", typeof window.uniData === "object");
check("данные Томска (window.TOMSK_DATA) объявлены", typeof window.TOMSK_DATA === "object");
check("карта содержит точку Томска", !!doc.querySelector('.city-group[data-city="Томск"]'));

console.log("\n=== 2. Клик по Томску на карте ===");
const tomsk = doc.querySelector('.city-group[data-city="Томск"]');
tomsk.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true }));

check("сайдбар переключился на Томск",
      doc.getElementById("sidebar-region-title").innerText === "ВУЗы города Томск");
check("показана кнопка «Вернуться к карте России»",
      doc.getElementById("back-btn").classList.contains("visible"));

const list = doc.getElementById("sidebar-unis-list");
let cards = list.querySelectorAll(".uni-item");
check("список вузов виден СРАЗУ, до выбора предметов", cards.length === 6, `${cards.length}`);
check("заглушки «Выберите город на карте…» больше нет",
      ![...list.querySelectorAll("p")].some(p => p.textContent.includes("Выберите город")));
check("есть выпадающий список комбинаций", !!doc.getElementById("tomsk-combo"));
check("в списке 34 комбинации + пункт «все комбинации»",
      doc.getElementById("tomsk-combo").options.length === 35,
      String(doc.getElementById("tomsk-combo").options.length));

console.log("\n=== 3. Выбираем предметы: Русский + Математика + Информатика ===");
doc.querySelector(".ege-select").value = "Русский язык";
window.addEgeSubject("Математика (профиль)");
window.addEgeSubject("Информатика");

[...doc.querySelectorAll(".ege-input")].forEach((inp, i) => {
    inp.value = [56, 100, 90][i];
    if (inp.oninput) inp.oninput();
});
const total = doc.getElementById("total-ege-score").innerText;
check("сумма баллов = 246", total === "246", total);
check("комбинация подобрана автоматически: «мат / инфа»",
      doc.getElementById("tomsk-combo").value === "мат / инфа",
      doc.getElementById("tomsk-combo").value);

console.log("\n=== 4. Панель «ВУЗы города Томск» ===");
cards = list.querySelectorAll(".uni-item");
check("отрисовано 6 вузов", cards.length === 6, String(cards.length));

const summary = list.querySelector(".tomsk-summary");
check("есть сводка по баллам", !!summary);
console.log(`     ${summary.innerText.replace(/\s+/g, " ").trim()}`);

// Баллы для «мат / инфа»: ТУСУР 230, ТПУ 220, ТГУ 245, СибГМУ 140, ТГАСУ 185, ТГПУ 170
// При сумме 246 проходят все шесть
const passing = [...cards].filter(c => c.querySelector(".badge-pass")).length;
check("с баллом 246 проходят все 6 вузов", passing === 6, String(passing));

console.log("\n     карточки:");
[...cards].forEach(c => {
    const name = c.querySelector(".uni-item-name").innerText.split(" — ")[0];
    const sc = (c.querySelector(".uni-item-info").innerText.match(/\d+/) || ["?"])[0];
    const badge = c.querySelector(".badge-pass") ? "проходит"
                : c.querySelector(".badge-fail") ? "не хватает" : "—";
    console.log(`       ${name.padEnd(8)} мин. ${String(sc).padStart(3)}   ${badge}`);
});

check("в раскрытой карточке есть направления",
      cards[0].querySelectorAll(".uni-detail-row").length > 1);

console.log("\n=== 5. Низкий балл даёт «не хватает» ===");
[...doc.querySelectorAll(".ege-input")].forEach((inp, i) => {
    inp.value = [40, 40, 40][i];
    if (inp.oninput) inp.oninput();
});
cards = list.querySelectorAll(".uni-item");
const failing = [...cards].filter(c => c.querySelector(".badge-fail")).length;
check("с баллом 120 не проходит ни один вуз", failing === 6, String(failing));

console.log("\n=== 6. Ручной выбор комбинации ===");
const sel = doc.getElementById("tomsk-combo");
sel.value = "хим / био";
sel.dispatchEvent(new window.Event("change"));
const tgu = [...list.querySelectorAll(".uni-item")]
    .find(c => c.querySelector(".uni-item-name").innerText.startsWith("ТГУ"));
const tguScore = tgu ? tgu.querySelector(".uni-item-info").innerText.match(/\d+/)[0] : null;
check("ТГУ по «хим / био» — 230 (а не 245, как по «мат / инфа»)",
      tguScore === "230", String(tguScore));

sel.value = "";
sel.dispatchEvent(new window.Event("change"));
check("пункт «все комбинации» возвращает обзор",
      doc.querySelectorAll("#sidebar-unis-list .uni-item").length === 6);
check("в обзоре видны диапазоны баллов",
      doc.querySelector(".tomsk-summary").innerText.includes("Укажите баллы ЕГЭ"));

console.log("\n=== 7. Переключатель «Платное» ===");
const paid = doc.querySelector('input[name="studyType"][value="paid"]');
paid.checked = true;
if (paid.onchange) paid.onchange();
check("панель не ломается", doc.querySelectorAll("#sidebar-unis-list .uni-item").length === 6);

console.log("\n=== 8. Остальные города работают по-старому ===");
window.selectCity("Москва");
const mow = doc.querySelectorAll("#sidebar-unis-list .uni-item");
check("Москва: 3 вуза", mow.length === 3, String(mow.length));
check("первый вуз — МГУ",
      mow[0] && mow[0].querySelector(".uni-item-name").innerText.includes("МГУ"));
check("панель комбинаций в Москве не показывается", !doc.getElementById("tomsk-combo"));

console.log(`\n${"─".repeat(52)}`);
console.log(`Пройдено: ${passed}   Провалено: ${failed}`);
if (failed === 0) console.log("Все проверки пройдены ✅");
process.exit(failed ? 1 : 0);
