
// Инициализация нижней шторки (Bottom Sheet) для мобильных устройств
function initBottomSheet() {
    const sidebar = document.getElementById("region-sidebar");
    const dragArea = document.getElementById("sheet-drag-area");
    if (!sidebar || !dragArea) return;

    let startY = 0;
    let currentY = 0;
    let isDragging = false;

    window.expandBottomSheet = function() {
        sidebar.classList.add("sheet-expanded");
    };

    window.collapseBottomSheet = function() {
        sidebar.classList.remove("sheet-expanded");
    };

    window.toggleBottomSheet = function() {
        sidebar.classList.toggle("sheet-expanded");
    };

    dragArea.addEventListener("click", () => {
        window.toggleBottomSheet();
    });

    dragArea.addEventListener("touchstart", (e) => {
        startY = e.touches[0].clientY;
        currentY = startY;
        isDragging = true;
    }, { passive: true });

    window.addEventListener("touchmove", (e) => {
        if (!isDragging) return;
        currentY = e.touches[0].clientY;
    }, { passive: true });

    window.addEventListener("touchend", () => {
        if (!isDragging) return;
        isDragging = false;
        const diff = currentY - startY;
        if (diff < -35) {
            window.expandBottomSheet();
        } else if (diff > 35) {
            window.collapseBottomSheet();
        }
    });
}

function zoomToBox(targetX, targetY, targetWidth, targetHeight) {
    const svg = document.getElementById("russia-map");
    const targetViewBox = `${targetX} ${targetY} ${targetWidth} ${targetHeight}`;
    const zoomFactor = Math.min(800 / targetWidth, 500 / targetHeight);
    const compScale = 1 / zoomFactor;

    document.querySelectorAll(".city-group").forEach(city => {
        const dot = city.querySelector(".city-dot");
        const label = city.querySelector(".city-label");
        if (dot) {
            const cx = parseFloat(dot.getAttribute("cx"));
            const cy = parseFloat(dot.getAttribute("cy"));
            
            const isInside = (cx >= targetX && cx <= targetX + targetWidth &&
                              cy >= targetY && cy <= targetY + targetHeight);

            // Сбрасываем CSS scale-трансформации, чтобы не искажать и не сдвигать текст
            city.style.transform = "";
            city.style.transformOrigin = "";

            if (isInside) {
                city.classList.add("in-active-region");
                city.style.opacity = "1";
                city.style.pointerEvents = "auto";

                // Адаптивный аккуратный размер точки без пикселизации
                const isTop = city.classList.contains("is-top");
                const scaledR = Math.max(1.3, (isTop ? 3.2 : 2.2) * Math.pow(compScale, 0.65));
                dot.setAttribute("r", scaledR.toFixed(2));
                dot.style.strokeWidth = Math.max(0.35, (isTop ? 1.0 : 0.8) * compScale).toFixed(2) + "px";

                // Адаптивный размер текста рядом с точкой
                if (label) {
                    const scaledFont = Math.max(2.6, (isTop ? 7.5 : 6.8) * Math.pow(compScale, 0.75));
                    const scaledStroke = Math.max(0.6, 2.0 * compScale);
                    label.style.fontSize = scaledFont.toFixed(2) + "px";
                    label.style.strokeWidth = scaledStroke.toFixed(2) + "px";
                }
            } else {
                city.classList.remove("in-active-region");
                city.style.opacity = "0";
                city.style.pointerEvents = "none";
            }
        }
    });

    if (svg) animateViewBox(svg, targetViewBox, 600);
}

let isZoomed = false;
let selectedCity = null;
let currentUser = null;

function showRegionTooltip(e, name) {
    if (isZoomed || !name) return;
    const tooltip = document.getElementById("region-tooltip");
    if (!tooltip) return;
    tooltip.textContent = name;
    tooltip.style.left = `${e.clientX}px`;
    tooltip.style.top = `${e.clientY}px`;
    tooltip.classList.add("visible");
}

function hideRegionTooltip() {
    const tooltip = document.getElementById("region-tooltip");
    if (tooltip) tooltip.classList.remove("visible");
}

document.addEventListener("DOMContentLoaded", () => {
    initBottomSheet();
    const svg = document.getElementById("russia-map");
    const initialViewBox = svg ? (svg.getAttribute("viewBox") || "0 0 800 500") : "0 0 800 500";

    // Навешиваем обработчики клика и наведения на каждый регион
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
            isZoomed = true;
            hideRegionTooltip();

            // Убираем подсветку со всех регионов и добавляем текущему
            document.querySelectorAll(".region").forEach(r => r.classList.remove("active-region"));
            this.classList.add("active-region");

            // Показываем кнопку "вернуться"
            const backBtn = document.getElementById('back-btn');
            if (backBtn) backBtn.classList.add('visible');

            const bbox = this.getBBox();
            const padding = 12;
            const targetX = bbox.x - padding;
            const targetY = bbox.y - padding;
            const targetWidth = bbox.width + padding * 2;
            const targetHeight = bbox.height + padding * 2;

            zoomToBox(targetX, targetY, targetWidth, targetHeight);
        });
    });

    // Навешиваем обработчики клика на каждый ГОРОД
    document.querySelectorAll(".city-group").forEach(cityGroup => {
        cityGroup.addEventListener("click", function (e) {
            e.stopPropagation();
            isZoomed = true;
            hideRegionTooltip();

            // 1. Вызываем функцию выбора города
            selectCity(this.dataset.city);

            const bbox = this.getBBox();
            const padding = 20;
            const targetX = bbox.x - padding;
            const targetY = bbox.y - padding;
            const targetWidth = bbox.width + padding * 2;
            const targetHeight = bbox.height + padding * 2;

            zoomToBox(targetX, targetY, targetWidth, targetHeight);
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
    const studyType = document.querySelector('input[name="studyType"]:checked')?.value || 'budget';
    const listContainer = document.getElementById('sidebar-unis-list');
    listContainer.innerHTML = '';

    uniData[selectedCity].forEach(uni => {
        const reqScore = studyType === 'budget' ? uni.score : uni.paidScore;
        const isPassing = totalScore > 0 && totalScore >= reqScore;
        
        const uniCard = document.createElement('div');
        uniCard.className = 'uni-item';
        
        uniCard.innerHTML = `
            <div class="uni-item-header">
                <div class="uni-item-name">${uni.name}</div>
                <div class="uni-item-info">
                    <span>Мин. балл (${studyType === 'budget' ? 'бюджет' : 'платное'}): <strong>${reqScore}</strong></span>
                    ${totalScore > 0 ? `<span class="${isPassing ? 'badge-pass' : 'badge-fail'}">${isPassing ? 'Проходит' : 'Не хватает'}</span>` : ''}
                </div>
            </div>
            <div class="uni-item-details">
                <div class="uni-detail-row"><strong>Баллы:</strong> ${uni.score} (бюджет) / ${uni.paidScore} (платное)</div>
                <div class="uni-detail-row"><strong>Специальности:</strong> ${uni.specs}</div>
            </div>
        `;

        // Клик раскрывает подробности ВУЗа прямо в списке
        uniCard.addEventListener('click', () => {
            uniCard.classList.toggle('is-expanded');
        });

        listContainer.appendChild(uniCard);
    });
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

    const svg = document.getElementById("russia-map");
    if (svg) animateViewBox(svg, "0 0 800 500", 600);
    
    // Снимаем подсветку региона
    document.querySelectorAll('.region').forEach(r => r.classList.remove('active-region'));
    
    // Возвращаем все города, точки и подписи в исходный вид
    document.querySelectorAll(".city-group").forEach(city => {
        city.classList.remove("in-active-region");
        city.style.opacity = "1";
        city.style.pointerEvents = "auto";
        city.style.transform = "";
        city.style.transformOrigin = "";

        const dot = city.querySelector(".city-dot");
        if (dot) {
            const isTop = city.classList.contains("is-top");
            dot.setAttribute("r", isTop ? "3.2" : "2.2");
            dot.style.strokeWidth = "";
        }

        const label = city.querySelector(".city-label");
        if (label) {
            label.style.fontSize = "";
            label.style.strokeWidth = "";
        }
    });

    const sheetTitle = document.getElementById("sheet-title");
    const sheetSubtitle = document.getElementById("sheet-subtitle");
    const sheetCountBadge = document.getElementById("sheet-count-badge");
    if (sheetTitle) sheetTitle.innerText = "Калькулятор и ВУЗы";
    if (sheetSubtitle) sheetSubtitle.innerText = "Нажмите или потяните вверх";
    if (sheetCountBadge) sheetCountBadge.style.display = "none";
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
