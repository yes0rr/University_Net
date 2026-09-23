let isZoomed = false;
let selectedCity = null;
let currentUser = null;

// Соответствие городов субъектам РФ для масштабирования к региону
const CITY_TO_REGION = {
    "Владивосток": "Приморский край",
    "Хабаровск": "Хабаровский край",
    "Иркутск": "Иркутская область",
    "Магадан": "Магаданская область",
    "Анадырь": "Чукотский автономный округ",
    "Петропавловск-Камчатский": "Камчатский край",
    "Южно-Сахалинск": "Сахалинская область",
    "Якутск": "Республика Саха (Якутия)",
    "Улан-Удэ": "Республика Бурятия",
    "Кызыл": "Республика Тыва",
    "Красноярск": "Красноярский край",
    "Абакан": "Республика Хакасия",
    "Томск": "Томская область",
    "Горно-Алтайск": "Республика Алтай",
    "Барнаул": "Алтайский край",
    "Кемерово": "Кемеровская область",
    "Новосибирск": "Новосибирская область",
    "Омск": "Омская область",
    "Тюмень": "Тюменская область",
    "Курган": "Курганская область",
    "Челябинск": "Челябинская область",
    "Екатеринбург": "Свердловская область",
    "Ханты-Мансийск": "Ханты-Мансийский АО — Югра",
    "Салехард": "Ямало-Ненецкий автономный округ",
    "Нарьян-Мар": "Ненецкий автономный округ",
    "Сыктывкар": "Республика Коми",
    "Киров": "Кировская область",
    "Пермь": "Пермский край",
    "Уфа": "Республика Башкортостан",
    "Оренбург": "Оренбургская область",
    "Самара": "Самарская область",
    "Ижевск": "Удмуртская Республика",
    "Ульяновск": "Ульяновская область",
    "Казань": "Республика Татарстан",
    "Архангельск": "Архангельская область",
    "Мурманск": "Мурманская область",
    "Санкт-Петербург": "Санкт-Петербург",
    "Петрозаводск": "Республика Карелия",
    "Чита": "Забайкальский край",
    "Благовещенск": "Амурская область",
    "Биробиджан": "Еврейская автономная область",
    "Калининград": "Калининградская область",
    "Великий Новгород": "Новгородская область",
    "Псков": "Псковская область",
    "Вологда": "Вологодская область",
    "Кострома": "Костромская область",
    "Иваново": "Ивановская область",
    "Ярославль": "Ярославская область",
    "Тверь": "Тверская область",
    "Смоленск": "Смоленская область",
    "Владимир": "Владимирская область",
    "Белгород": "Белгородская область",
    "Воронеж": "Воронежская область",
    "Тамбов": "Тамбовская область",
    "Липецк": "Липецкая область",
    "Рязань": "Рязанская область",
    "Тула": "Тульская область",
    "Орел": "Орловская область",
    "Курск": "Курская область",
    "Брянск": "Брянская область",
    "Калуга": "Калужская область",
    "Москва": "Москва",
    "Нижний Новгород": "Нижегородская область",
    "Йошкар-Ола": "Республика Марий Эл",
    "Чебоксары": "Чувашская Республика",
    "Саранск": "Республика Мордовия",
    "Пенза": "Пензенская область",
    "Саратов": "Саратовская область",
    "Волгоград": "Волгоградская область",
    "Астрахань": "Астраханская область",
    "Элиста": "Республика Калмыкия",
    "Луганск": "Луганская Народная Республика",
    "Донецк": "Донецкая Народная Республика",
    "Мелитополь": "Запорожская область",
    "Геническ": "Херсонская область",
    "Симферополь": "Республика Крым",
    "Севастополь": "Республика Крым",
    "Ростов-на-Дону": "Ростовская область",
    "Краснодар": "Краснодарский край",
    "Майкоп": "Республика Адыгея",
    "Ставрополь": "Ставропольский край",
    "Черкесск": "Карачаево-Черкесская Республика",
    "Нальчик": "Кабардино-Балкарская Республика",
    "Владикавказ": "Республика Северная Осетия — Алания",
    "Магас": "Республика Ингушетия",
    "Грозный": "Чеченская Республика",
    "Махачкала": "Республика Дагестан"
};

function showRegionTooltip(e, name) {
    if (isZoomed || !name) return;
    const tooltip = document.getElementById("region-tooltip");
    if (!tooltip) return;
    tooltip.innerHTML = name;
    tooltip.style.left = `${e.clientX}px`;
    tooltip.style.top = `${e.clientY}px`;
    tooltip.classList.add("visible");
}

function showCityTooltip(e, cityName) {
    if (!cityName) return;
    const tooltip = document.getElementById("region-tooltip");
    if (!tooltip) return;
    tooltip.innerHTML = `<span style="color:#60a5fa; margin-right:4px;">📍</span> ${cityName}`;
    tooltip.style.left = `${e.clientX}px`;
    tooltip.style.top = `${e.clientY}px`;
    tooltip.classList.add("visible");
}

function hideRegionTooltip() {
    const tooltip = document.getElementById("region-tooltip");
    if (tooltip) tooltip.classList.remove("visible");
}

/**
 * Функция приближения к выбранному региону
 */
function zoomToRegion(regionElement) {
    if (!regionElement) return;
    isZoomed = true;
    hideRegionTooltip();

    // Снимаем подсветку со всех регионов
    document.querySelectorAll(".region").forEach(r => r.classList.remove("active-region"));

    const regionName = regionElement.getAttribute("data-region-name");
    const regionPaths = regionName 
        ? Array.from(document.querySelectorAll(`.region[data-region-name="${regionName}"]`))
        : [regionElement];

    // Подсвечиваем все части региона
    regionPaths.forEach(r => r.classList.add("active-region"));

    // Показываем кнопку назад
    const backBtn = document.getElementById('back-btn');
    if (backBtn) backBtn.classList.add('visible');

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    regionPaths.forEach(path => {
        try {
            const bbox = path.getBBox();
            if (bbox.width > 0 && bbox.height > 0) {
                minX = Math.min(minX, bbox.x);
                minY = Math.min(minY, bbox.y);
                maxX = Math.max(maxX, bbox.x + bbox.width);
                maxY = Math.max(maxY, bbox.y + bbox.height);
            }
        } catch (err) {
            console.error(err);
        }
    });

    if (minX === Infinity) {
        const bbox = regionElement.getBBox();
        minX = bbox.x;
        minY = bbox.y;
        maxX = bbox.x + bbox.width;
        maxY = bbox.y + bbox.height;
    }

    const padding = 15;
    const targetX = minX - padding;
    const targetY = minY - padding;
    const targetWidth = Math.max(10, (maxX - minX) + padding * 2);
    const targetHeight = Math.max(10, (maxY - minY) + padding * 2);
    const targetViewBox = `${targetX} ${targetY} ${targetWidth} ${targetHeight}`;

    // Точный коэффициент масштабирования точек и подписей
    const zoomFactor = Math.min(800 / targetWidth, 500 / targetHeight);
    const compScale = 1 / zoomFactor;

    document.querySelectorAll(".city-group").forEach(city => {
        const dot = city.querySelector(".city-dot");
        if (dot) {
            const cx = parseFloat(dot.getAttribute("cx"));
            const cy = parseFloat(dot.getAttribute("cy"));
            city.style.transformOrigin = `${cx}px ${cy}px`;
            
            const isInside = (cx >= targetX && cx <= targetX + targetWidth &&
                              cy >= targetY && cy <= targetY + targetHeight);

            if (isInside) {
                city.classList.add("in-active-region");
                city.style.opacity = "1";
                city.style.pointerEvents = "auto";
                city.style.transform = `scale(${compScale})`; 
            } else {
                city.classList.remove("in-active-region");
                city.style.opacity = "0";
                city.style.pointerEvents = "none";
                city.style.transform = `scale(${compScale})`;
            }
        }
    });

    const svg = document.getElementById("russia-map");
    if (svg) animateViewBox(svg, targetViewBox, 600);
}

/**
 * Поиск SVG-элемента региона для указанного города
 */
function getRegionForCity(cityName, cityDot) {
    const regionName = CITY_TO_REGION[cityName];
    if (regionName) {
        const regionEl = document.querySelector(`.region[data-region-name="${regionName}"]`);
        if (regionEl) return regionEl;
    }
    if (cityDot) {
        const cx = parseFloat(cityDot.getAttribute("cx"));
        const cy = parseFloat(cityDot.getAttribute("cy"));
        let bestRegion = null;
        let minArea = Infinity;
        document.querySelectorAll(".region").forEach(reg => {
            const bbox = reg.getBBox();
            if (cx >= bbox.x && cx <= bbox.x + bbox.width &&
                cy >= bbox.y && cy <= bbox.y + bbox.height) {
                const area = bbox.width * bbox.height;
                if (area < minArea) {
                    minArea = area;
                    bestRegion = reg;
                }
            }
        });
        if (bestRegion) return bestRegion;
    }
    return null;
}

function handleCityClick(cityName, dotEl) {
    if (!cityName) return;
    selectCity(cityName);
    const targetRegion = getRegionForCity(cityName, dotEl);
    if (targetRegion) {
        zoomToRegion(targetRegion);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const svg = document.getElementById("russia-map");

    // Обработчики для каждого РЕГИОНА
    document.querySelectorAll(".region").forEach(region => {
        region.addEventListener("mouseenter", function (e) {
            const name = this.getAttribute("data-region-name");
            showRegionTooltip(e, name);
        });

        region.addEventListener("mousemove", function (e) {
            if (!isZoomed) {
                const tooltip = document.getElementById("region-tooltip");
                if (tooltip && tooltip.classList.contains("visible")) {
                    tooltip.style.left = `${e.clientX}px`;
                    tooltip.style.top = `${e.clientY}px`;
                }
            }
        });

        region.addEventListener("mouseleave", function () {
            hideRegionTooltip();
        });

        region.addEventListener("click", function (e) {
            e.stopPropagation();
            zoomToRegion(this);
        });
    });

    // Обработчики для каждого ГОРОДА (наведение + клик)
    document.querySelectorAll(".city-group").forEach(cityGroup => {
        const getCityName = (el) => {
            return el.dataset.city || 
                   el.getAttribute("data-city") || 
                   el.querySelector(".city-dot")?.getAttribute("data-city") ||
                   el.querySelector(".city-label")?.textContent?.trim() || "";
        };

        // Наведение мыши на город — всплывает название
        cityGroup.addEventListener("mouseenter", function (e) {
            e.stopPropagation();
            const name = getCityName(this);
            showCityTooltip(e, name);
        });

        cityGroup.addEventListener("mousemove", function (e) {
            e.stopPropagation();
            const tooltip = document.getElementById("region-tooltip");
            if (tooltip && tooltip.classList.contains("visible")) {
                tooltip.style.left = `${e.clientX}px`;
                tooltip.style.top = `${e.clientY}px`;
            }
        });

        cityGroup.addEventListener("mouseleave", function (e) {
            e.stopPropagation();
            hideRegionTooltip();
        });

        // Клик по группе города
        cityGroup.addEventListener("click", function (e) {
            e.stopPropagation();
            const cityName = getCityName(this);
            const dot = this.querySelector(".city-dot");
            handleCityClick(cityName, dot);
        });
    });

    // Дополнительный прямой обработчик клика на каждый circle.city-dot
    document.querySelectorAll(".city-dot").forEach(dot => {
        dot.addEventListener("click", function (e) {
            e.stopPropagation();
            const cityGroup = this.closest(".city-group");
            const cityName = cityGroup?.dataset?.city || this.getAttribute("data-city") || "";
            handleCityClick(cityName, this);
        });
    });

    // Сброс масштаба при клике на свободное место карты
    if (svg) {
        svg.addEventListener("click", (e) => {
            if (e.target === svg || e.target.id === "map-background") {
                resetMapView();
            }
        });
    }

    addEgeSubject();
});

/**
 * Функция для плавной анимации перехода viewBox у SVG
 */
function animateViewBox(svgElem, targetViewBox, duration) {
    const startViewBox = (svgElem.getAttribute("viewBox") || "0 0 800 500")
        .split(" ")
        .map(Number);
    const target = targetViewBox.split(" ").map(Number);
    const startTime = performance.now();

    function step(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Функция сглаживания Ease-In-Out
        const ease = progress < 0.5 
            ? 2 * progress * progress 
            : -1 + (4 - 2 * progress) * progress;

        const currentViewBox = startViewBox.map((start, i) => start + (target[i] - start) * ease);
        svgElem.setAttribute("viewBox", currentViewBox.join(" "));

        if (progress < 1) {
            requestAnimationFrame(step);
        }
    }

    requestAnimationFrame(step);
}

// Регистрация
function handleRegister() {
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();

    if (!name || !email) {
        alert('Пожалуйста, заполните имя и email.');
        return;
    }

    currentUser = { name, email };
    document.getElementById('user-display-name').innerText = name;
    document.getElementById('user-display-email').innerText = email;

    document.getElementById('reg-form').style.display = 'none';
    document.getElementById('reg-status').style.display = 'block';
}

function handleLogout() {
    currentUser = null;
    document.getElementById('reg-form').style.display = 'flex';
    document.getElementById('reg-status').style.display = 'none';
}

// Расчет суммарного балла
function calculateTotal() {
    const modeElement = document.querySelector('input[name="admissionMode"]:checked');
    const mode = modeElement ? modeElement.value : 'ege';
    const scoreSpan = document.getElementById('total-ege-score');

    if (mode === 'bvi') {
        if (scoreSpan) scoreSpan.textContent = 'БВИ';
        if (typeof updateSidebarUnis === 'function') updateSidebarUnis();
        return;
    }

    let total = 0;
    const inputs = document.querySelectorAll('.ege-input');
    inputs.forEach(input => {
        const val = parseInt(input.value, 10);
        if (!isNaN(val)) {
            total += Math.min(100, Math.max(0, val));
        }
    });

    if (scoreSpan) scoreSpan.textContent = total;
    if (typeof updateSidebarUnis === 'function') updateSidebarUnis();
}

// Выбор города
function selectCity(cityName) {
    selectedCity = cityName;
    const title = document.getElementById('sidebar-region-title');
    if (title) title.innerText = `ВУЗы города ${cityName}`;
    const backBtn = document.getElementById('back-btn');
    if (backBtn) backBtn.classList.add('visible');
    updateSidebarUnis();
}

// Обновление списка ВУЗов в сайдбаре с учетом баллов
function updateSidebarUnis() {
    if (!selectedCity || !uniData[selectedCity]) return;

    const totalScore = Number(document.getElementById('total-ege-score').innerText) || 0;
    const studyType = document.querySelector('input[name="studyType"]:checked').value;
    const listContainer = document.getElementById('sidebar-unis-list');
    listContainer.innerHTML = '';

    uniData[selectedCity].forEach(uni => {
        const reqScore = studyType === 'budget' ? uni.score : uni.paidScore;
        const isPassing = totalScore > 0 && totalScore >= reqScore;
        
        const uniCard = document.createElement('div');
        uniCard.className = 'uni-item';
        uniCard.onclick = () => showUniInfo(uni);
        
        uniCard.innerHTML = `
            <div class="uni-item-name">${uni.name}</div>
            <div class="uni-item-info">
                <span>Мин. балл: <strong>${reqScore}</strong></span>
                ${totalScore > 0 ? `<span class="${isPassing ? 'badge-pass' : 'badge-fail'}">${isPassing ? 'Проходит' : 'Не хватает'}</span>` : ''}
            </div>
        `;
        listContainer.appendChild(uniCard);
    });
}

// Показ деталей ВУЗа
function showUniInfo(uni) {
    document.getElementById('uni-name').innerText = uni.name;
    document.getElementById('uni-score').innerText = `${uni.score} (бюджет) / ${uni.paidScore} (платное)`;
    document.getElementById('uni-specs').innerText = uni.specs;
    document.getElementById('info-panel').classList.add('visible');
}

// Сброс выбора
function resetMapView() {
    isZoomed = false;
    hideRegionTooltip();
    selectedCity = null;

    const title = document.getElementById('sidebar-region-title');
    if (title) title.innerText = 'ВУЗы региона';

    const list = document.getElementById('sidebar-unis-list');
    if (list) list.innerHTML = '<p style="font-size: 12px; color: #94a3b8;">Выберите город на карте для просмотра доступных ВУЗов.</p>';

    const backBtn = document.getElementById('back-btn');
    if (backBtn) backBtn.classList.remove('visible');

    const infoPanel = document.getElementById('info-panel');
    if (infoPanel) infoPanel.classList.remove('visible');

    const svg = document.getElementById("russia-map");
    if (svg) animateViewBox(svg, "0 0 800 500", 600);
    
    // Снимаем подсветку региона
    document.querySelectorAll('.region').forEach(r => r.classList.remove('active-region'));
    
    // Возвращаем все города в исходное состояние
    document.querySelectorAll(".city-group").forEach(city => {
        city.classList.remove("in-active-region");
        city.style.opacity = "1";
        city.style.pointerEvents = "auto";
        city.style.transform = "scale(1)";
    });
}

// Список доступных предметов ЕГЭ
const AVAILABLE_SUBJECTS = [
    "Русский язык",
    "Математика (профиль)",
    "Информатика",
    "Обществознание",
    "Физика",
    "Химия",
    "Биология",
    "История",
    "Иностранный язык",
    "Литература",
    "География"
];

// Переключение между ЕГЭ и БВИ
function toggleAdmissionMode() {
    const mode = document.querySelector('input[name="admissionMode"]:checked').value;
    const egeContainer = document.getElementById('ege-container');
    const bviContainer = document.getElementById('bvi-container');

    if (mode === 'bvi') {
        egeContainer.style.display = 'none';
        bviContainer.style.display = 'block';
    } else {
        egeContainer.style.display = 'block';
        bviContainer.style.display = 'none';
    }
    calculateTotal();
}

// Добавление предмета ЕГЭ (максимум 3)
function addEgeSubject(defaultSubject = null) {
    const list = document.getElementById('ege-subjects-list');
    if (!list) return;
    const currentRows = list.querySelectorAll('.ege-subject-row');
    if (currentRows.length >= 3) return;

    const selectedSubjects = Array.from(list.querySelectorAll('.ege-select')).map(s => s.value);
    const nextAvailable = defaultSubject || AVAILABLE_SUBJECTS.find(s => !selectedSubjects.includes(s)) || AVAILABLE_SUBJECTS[0];

    const row = document.createElement('div');
    row.className = 'ege-field ege-subject-row';

    const select = document.createElement('select');
    select.className = 'ege-select';
    select.onchange = () => {
        updateSubjectDropdowns();
        calculateTotal();
    };

    AVAILABLE_SUBJECTS.forEach(subject => {
        const option = document.createElement('option');
        option.value = subject;
        option.textContent = subject;
        if (subject === nextAvailable) option.selected = true;
        select.appendChild(option);
    });

    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'ege-input';
    input.min = '0';
    input.max = '100';
    input.placeholder = '0';
    input.value = '0';
    input.oninput = calculateTotal;

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn-remove-subject';
    removeBtn.innerHTML = '&times;';
    removeBtn.title = 'Удалить предмет';
    removeBtn.onclick = () => {
        row.remove();
        updateSubjectDropdowns();
        calculateTotal();
    };

    row.appendChild(select);
    row.appendChild(input);
    row.appendChild(removeBtn);
    list.appendChild(row);

    updateSubjectDropdowns();
    calculateTotal();
}

// Блокировка повторного выбора уже выбранных предметов
function updateSubjectDropdowns() {
    const list = document.getElementById('ege-subjects-list');
    if (!list) return;
    const selects = list.querySelectorAll('.ege-select');
    const rows = list.querySelectorAll('.ege-subject-row');
    const selectedValues = Array.from(selects).map(s => s.value);

    // Если остался только 1 предмет, кнопка удаления скрывается
    rows.forEach(row => {
        const btn = row.querySelector('.btn-remove-subject');
        if (btn) btn.style.display = rows.length === 1 ? 'none' : 'block';
    });

    // Делаем выбранные в других списочных полях предметы недоступными
    selects.forEach(select => {
        const currentVal = select.value;
        Array.from(select.options).forEach(opt => {
            if (opt.value !== currentVal && selectedValues.includes(opt.value)) {
                opt.disabled = true;
            } else {
                opt.disabled = false;
            }
        });
    });

    // Скрываем плюсик при достижении 3 предметов
    const addBtn = document.getElementById('add-subject-btn');
    if (addBtn) {
        addBtn.style.display = selects.length >= 3 ? 'none' : 'block';
    }
}
