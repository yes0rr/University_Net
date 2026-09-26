/**
 * Автотест фронтенда University_Net (эмулятор браузера, jsdom).
 *
 * Проверяет главный пользовательский сценарий целиком, без запуска браузера:
 *   открыл index.html → кликнул Томск → выбрал направление → ввёл баллы
 *   → увидел только вузы с этим направлением, отсортированные по баллу,
 *     с метками «Проходит / Не хватает».
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
const list = () => doc.getElementById("sidebar-unis-list");
const cards = () => list().querySelectorAll(".uni-item");
const cardNames = () => [...cards()].map(c =>
    c.querySelector(".uni-item-name").innerText.split(" — ")[0]);
const cardScores = () => [...cards()].map(c =>
    Number((c.querySelector(".uni-item-info").innerText.match(/\d+/) || [NaN])[0]));
const setInputs = (vals) => [...doc.querySelectorAll(".ege-input")].forEach((inp, i) => {
    inp.value = String(vals[i]);
    if (inp.oninput) inp.oninput();
});

console.log("=== 1. Данные загрузились с диска, без сервера ===");
check("ошибок в консоли нет", errors.length === 0, errors.join("; "));
check("база вузов (window.uniData) объявлена", typeof window.uniData === "object");
check("данные Томска (window.TOMSK_DATA) объявлены", typeof window.TOMSK_DATA === "object");
check("карта содержит точку Томска", !!doc.querySelector('.city-group[data-city="Томск"]'));

console.log("\n=== 2. Клик по Томску на карте ===");
doc.querySelector('.city-group[data-city="Томск"]')
   .dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true }));

check("сайдбар переключился на Томск",
      doc.getElementById("sidebar-region-title").innerText === "ВУЗы города Томск");
check("список вузов виден СРАЗУ, до выбора направления", cards().length === 6,
      String(cards().length));
check("есть список направлений", !!doc.getElementById("tomsk-direction"));
check("в списке 81 направление + пункт «выберите направление»",
      doc.getElementById("tomsk-direction").options.length === 82,
      String(doc.getElementById("tomsk-direction").options.length));
check("отдельной панели комбинаций предметов больше нет",
      !doc.getElementById("tomsk-combo") && !doc.getElementById("tomsk-auto"));
check("в обзоре виден диапазон проходных баллов",
      /Проходной балл: \d+–\d+/.test(cards()[0].querySelector(".uni-item-info").innerText));

console.log("\n=== 3. Поле баллов ЕГЭ: прозрачный ноль и лимит 100 ===");
const inp0 = doc.querySelector(".ege-input");
check("поле пустое, ноль показан подсказкой (а не значением)",
      inp0.value === "" && inp0.placeholder === "0",
      `value=${JSON.stringify(inp0.value)} placeholder=${JSON.stringify(inp0.placeholder)}`);

inp0.value = "150";
inp0.oninput();
check("150 с клавиатуры превращается в 100", inp0.value === "100", inp0.value);

inp0.value = "9999";
inp0.oninput();
check("9999 превращается в 100", inp0.value === "100", inp0.value);

inp0.value = "7e2";
inp0.oninput();
check("«7e2» очищается до числа", inp0.value === "72", inp0.value);

inp0.value = "85";
inp0.oninput();
check("обычное значение проходит без изменений", inp0.value === "85", inp0.value);

inp0.value = "";
inp0.oninput();
check("после очистки снова видна прозрачная подсказка «0»", inp0.value === "");

console.log("\n=== 4. Выбор направления: предметы подставляются сами ===");
doc.querySelector(".ege-select").value = "Русский язык";
window.addEgeSubject("Математика (профиль)");
window.addEgeSubject("Информатика");

const sel = doc.getElementById("tomsk-direction");
const matchGroup = [...sel.querySelectorAll("optgroup")]
    .find(g => /Подходят под ваши предметы/.test(g.label));
check("появилась группа «Подходят под ваши предметы (мат / инфа)»", !!matchGroup,
      matchGroup ? matchGroup.label : "нет такой группы");
check("в группе 5 направлений комбинации «мат / инфа»",
      matchGroup && matchGroup.querySelectorAll("option").length === 5,
      matchGroup ? String(matchGroup.querySelectorAll("option").length) : "—");

console.log("\n=== 5. Направление «31.05.01 Лечебное дело» (хим / био) ===");
setInputs([87, 91, 78]);                       // сумма 256
check("сумма баллов = 256", doc.getElementById("total-ege-score").innerText === "256",
      doc.getElementById("total-ege-score").innerText);

sel.value = "31.05.01 Лечебное дело";
sel.dispatchEvent(new window.Event("change", { bubbles: true }));

check("осталось 4 вуза из 6 — лишние отброшены", cards().length === 4, String(cards().length));
check("вузы отсортированы по возрастанию проходного балла",
      JSON.stringify(cardScores()) === JSON.stringify([180, 190, 230, 238]),
      JSON.stringify(cardScores()));
check("вузы без этого направления перечислены отдельно",
      /Без этого направления: ТУСУР, ТГАСУ/.test(list().querySelector(".tomsk-dropped").innerText),
      list().querySelector(".tomsk-dropped").innerText);
check("в сводке указаны нужные предметы ЕГЭ",
      /химия \+ биология/.test(list().querySelector(".tomsk-summary").innerText));
check("в сводке «вузов с направлением: 4 из 6»",
      /4<\/strong> из 6/.test(list().querySelector(".tomsk-summary").innerHTML));
check("с суммой 256 проходят все 4",
      [...cards()].filter(c => c.querySelector(".badge-pass")).length === 4);

console.log("\n=== 6. Низкая сумма: часть вузов «Не хватает» ===");
setInputs([60, 60, 60]);                       // сумма 180
check("сумма 180", doc.getElementById("total-ege-score").innerText === "180");
const fails = [...cards()].filter(c => c.querySelector(".badge-fail")).length;
const passes = [...cards()].filter(c => c.querySelector(".badge-pass")).length;
check("проходит только ТГПУ (180), остальные 3 — нет",
      passes === 1 && fails === 3, `проходит ${passes}, не хватает ${fails}`);

console.log("\n=== 7. Другое направление: «09.03.04 Программная инженерия» (мат / инфа) ===");
setInputs([87, 91, 78]);
sel.value = "09.03.04 Программная инженерия";
sel.dispatchEvent(new window.Event("change", { bubbles: true }));
check("6 вузов — есть у всех", cards().length === 6, String(cards().length));
check("сортировка по баллу: СибГМУ 140 → ТГУ 245",
      JSON.stringify(cardScores()) === JSON.stringify([140, 170, 185, 220, 230, 245]),
      JSON.stringify(cardScores()));
check("первым идёт самый доступный вуз", cardNames()[0] === "СибГМУ", cardNames()[0]);
check("в сводке «математика + информатика»",
      /математика \+ информатика/.test(list().querySelector(".tomsk-summary").innerText));

console.log("\n=== 8. Возврат к обзору ===");
sel.value = "";
sel.dispatchEvent(new window.Event("change", { bubbles: true }));
check("снова 6 вузов с диапазонами", cards().length === 6);
check("вернулся режим обзора",
      /Выберите направление/.test(list().querySelector(".tomsk-summary").innerText));

console.log("\n=== 9. Переключатель «Платное» ===");
const paid = doc.querySelector('input[name="studyType"][value="paid"]');
paid.checked = true;
if (paid.onchange) paid.onchange();
check("панель не ломается", cards().length === 6);

console.log("\n=== 10. Остальные города работают по-старому ===");
window.selectCity("Москва");
check("Москва: 3 вуза", cards().length === 3, String(cards().length));
check("первый вуз — МГУ", cardNames()[0] === "МГУ им. М.В. Ломоносова", cardNames()[0]);
check("список направлений в Москве не показывается", !doc.getElementById("tomsk-direction"));

console.log("\n=== 11. Клик по ТОМСКОЙ ОБЛАСТИ (регион на карте) ===");
const region = [...doc.querySelectorAll(".region")]
    .find(r => r.getAttribute("data-region-name") === "Томская область");
check("регион «Томская область» есть на карте", !!region);
region.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true }));
check("панель наполнилась: 6 вузов", cards().length === 6, String(cards().length));
check("заголовок говорит про Томскую область",
      /Томск/i.test(doc.getElementById("sidebar-region-title").innerText));

const other = [...doc.querySelectorAll(".region")]
    .find(r => r.getAttribute("data-region-name") === "Новосибирская область");
if (other) {
    other.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true }));
    check("после другого региона панель сброшена", cards().length === 0, String(cards().length));
}

console.log("\n=== 12. Загрузчик JSON: разбор и нормализация ===");
check("загрузчик подключён (window.TOMSK_JSON_BUILD есть)",
      typeof window.TOMSK_JSON_BUILD === "function");
if (typeof window.TOMSK_JSON_BUILD === "function") {
    const DATA = path.join(__dirname, "..", "data");
    const combos = JSON.parse(fs.readFileSync(path.join(DATA, "tomsk.json"), "utf-8"));
    const subjects = JSON.parse(fs.readFileSync(path.join(DATA, "subj.json"), "utf-8"));
    const built = window.TOMSK_JSON_BUILD(combos, subjects);

    check("собрано 34 комбинации", built.combos.length === 34, String(built.combos.length));
    check("81 уникальное направление", built.totalSpecialties === 81, String(built.totalSpecialties));
    check("6 вузов с названиями", built.universities.length === 6);

    const minfa = built.combos.find(c => c.name === "мат / инфа");
    check("строки «230» стали числами", minfa.scores["тусур"] === 230,
          JSON.stringify(minfa.scores["тусур"]));
    check("«—» стало null (а не 0 и не строкой)",
          Object.values(minfa.scores).every(v => v === null || typeof v === "number"));
    check("ID-шники заменены названиями с кодом направления",
          minfa.specialties.some(t => /^\d{2}\.\d{2}\.\d{2}\s/.test(t)),
          minfa.specialties[0]);

    window.__TOMSK_APPLY(built);
    window.selectCity("Томск");
    check("панель рисуется на данных из JSON", cards().length === 6);
    const sel2 = doc.getElementById("tomsk-direction");
    sel2.value = "31.05.01 Лечебное дело";
    sel2.dispatchEvent(new window.Event("change", { bubbles: true }));
    check("после обновления данных фильтрация по направлению работает",
          cards().length === 4, String(cards().length));
}

console.log(`\n${"─".repeat(52)}`);
console.log(`Пройдено: ${passed}   Провалено: ${failed}`);
if (failed === 0) console.log("Все проверки пройдены ✅");
process.exit(failed ? 1 : 0);
