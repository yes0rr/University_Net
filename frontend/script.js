/* ==========================================================================
   Интерактивная карта ВУЗов России — script.js
   - Масштабирование (колесико мыши на ПК, pinch-to-zoom двумя пальцами на смартфонах)
   - Слои в стиле Photoshop (#map-paths -> #cities-dots-layer -> #cities-labels-layer)
   - Названия отображаются ТОЛЬКО для:
     * Москва
     * Санкт-Петербург
     * Томск
     * Казань
     (для всех остальных городов названия полностью убраны)
   - Динамические точки городов:
     * На общем виде — небольшие и аккуратные (2.0px)
     * При приближении — плавно и заметно увеличиваются до кликабельного размера (8.5px)
     * Единый алгоритм масштабирования для всех точек
   - Выбор города:
     * При нажатии на город нижняя панель НЕ выдвигается автоматически
   ========================================================================== */

// --- Глобальное состояние карты ---
let currentViewBox = { x: 0, y: 0, w: 800, h: 500 };
let isZoomed = false;
let selectedCity = null;
let activeRegion = null;
let currentUser = null;
let animFrameId = null;

// Флаг для предотвращения срабатывания клика после перетаскивания (панорамирования)
window.__justDragged = false;

// Реестр городов на карте
let cityRegistry = [];

// ТОЛЬКО эти 4 города имеют текстовые названия на карте по требованию
const ALLOWED_CITIES_WITH_NAMES = new Set([
    'Москва',
    'Санкт-Петербург',
    'Томск',
    'Казань'
]);

// Ограничения масштабирования
const MIN_VIEWBOX_W = 35;   // Максимальный зум (~23x)
const MAX_VIEWBOX_W = 800;  // Обзорный режим всей России (1x)

// Измерение ширины текста через невидимый Canvas для точного позиционирования
let measureCanvasCtx = null;
function getMeasureContext() {
    if (!measureCanvasCtx) {
        const canvas = document.createElement('canvas');
        measureCanvasCtx = canvas.getContext('2d');
    }
    return measureCanvasCtx;
}

function measureTextWidth(text, fontSizePx) {
    const ctx = getMeasureContext();
    ctx.font = `600 ${fontSizePx}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    return ctx.measureText(text).width;
}

// Преобразование экранных координат (clientX, clientY) в координаты SVG
function clientToSvgPoint(svg, clientX, clientY) {
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (ctm) {
        return pt.matrixTransform(ctm.inverse());
    }
    const rect = svg.getBoundingClientRect();
    const scale = Math.min(rect.width / currentViewBox.w, rect.height / currentViewBox.h);
    const offsetX = (rect.width - currentViewBox.w * scale) / 2;
    const offsetY = (rect.height - currentViewBox.h * scale) / 2;
    return {
        x: currentViewBox.x + (clientX - rect.left - offsetX) / scale,
        y: currentViewBox.y + (clientY - rect.top - offsetY) / scale
    };
}

// Ограничение координат viewBox, чтобы карта не улетала за экран
function clampX(x, w) {
    if (w >= 800) return 0;
    return Math.max(-50, Math.min(850 - w, x));
}

function clampY(y, h) {
    if (h >= 500) return 0;
    return Math.max(-30, Math.min(530 - h, y));
}

// Инициализация реестра городов
function initCityRegistry() {
    cityRegistry = [];
    const dots = document.querySelectorAll('#cities-dots-layer .city-dot');
    dots.forEach(dot => {
        const cityName = dot.getAttribute('data-city');
        const label = document.querySelector(`#cities-labels-layer .city-label[data-city="${cityName}"]`);
        const cx = parseFloat(dot.getAttribute('cx'));
        const cy = parseFloat(dot.getAttribute('cy'));

        cityRegistry.push({
            name: cityName,
            dot,
            label,
            cx,
            cy,
            isHovered: false
        });
    });
}

/**
 * Главная функция пересчета отображения карты:
 * 1. Динамические точки: небольшие на общем виде (2.0px), увеличиваются при приближении до 8.5px.
 * 2. Названия отображаются ТОЛЬКО для Москвы, Санкт-Петербурга, Томска и Казани.
 *    Для всех остальных городов названия полностью убраны.
 */
function updateMapDisplay(viewBox) {
    const svg = document.getElementById('russia-map');
    if (!svg) return;

    svg.setAttribute('viewBox', `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`);

    const rect = svg.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const scale = Math.min(rect.width / viewBox.w, rect.height / viewBox.h);
    if (!scale || scale <= 0) return;

    const renderW = viewBox.w * scale;
    const renderH = viewBox.h * scale;
    const offsetX = (rect.width - renderW) / 2;
    const offsetY = (rect.height - renderH) / 2;

    const zoomProgress = Math.min(1, Math.max(0, (800 - viewBox.w) / (800 - MIN_VIEWBOX_W)));

    // 1. ДИНАМИЧЕСКИЕ ТОЧКИ ГОРОДОВ (Layer 2)
    // - На общем виде (w = 800): радиус 2.0px (диаметр 4.0px) — аккуратные, не загромождают карту.
    // - При приближении: плавно вырастают до 8.5px (диаметр 17.0px) — крупные и удобные для нажатия!
    // - Единая формула для ВСЕХ точек без исключения.
    cityRegistry.forEach(item => {
        const isSel = (item.name === selectedCity);
        const isHov = item.isHovered;

        let rScreenPx = 2.0 + 6.5 * Math.pow(zoomProgress, 0.7);
        if (isSel) {
            rScreenPx += 2.5; // Выбранный город крупнее (до ~11px)
        } else if (isHov) {
            rScreenPx += 1.2;
        }

        const rSvg = rScreenPx / scale;
        const strokeWidthPx = isSel ? 2.2 : (0.7 + 0.9 * zoomProgress);
        const strokeSvg = strokeWidthPx / scale;

        item.dot.setAttribute('r', rSvg.toFixed(2));
        item.dot.style.strokeWidth = strokeSvg.toFixed(2) + 'px';
        item.dot.classList.toggle('is-selected', isSel);
    });

    // 2. ОТОБРАЖЕНИЕ НАЗВАНИЙ (Layer 3)
    // ТОЛЬКО для Москвы, Санкт-Петербурга, Томска и Казани!
    const fontScreenPx = 11.5;
    const selFontScreenPx = 13.0;

    cityRegistry.forEach(item => {
        if (!item.label) return;

        // Требование: для других городов названия полностью убрать
        if (!ALLOWED_CITIES_WITH_NAMES.has(item.name)) {
            item.label.style.opacity = '0';
            item.label.style.pointerEvents = 'none';
            return;
        }

        const isSel = (item.name === selectedCity);

        // Экранные координаты центра точки
        const screenX = offsetX + (item.cx - viewBox.x) * scale;
        const screenY = offsetY + (item.cy - viewBox.y) * scale;

        // Отсекаем если точка за пределами экрана
        if (screenX < 6 || screenX > rect.width - 6 || screenY < 6 || screenY > rect.height - 6) {
            item.label.style.opacity = '0';
            item.label.style.pointerEvents = 'none';
            return;
        }

        const fontPx = isSel ? selFontScreenPx : fontScreenPx;
        const fontSvg = fontPx / scale;
        const strokeSvg = (isSel ? 2.6 : 2.1) / scale;

        // Текущий экранный радиус точки для отступа текста строго сверху над точкой
        let dotScreenR = 2.0 + 6.5 * Math.pow(zoomProgress, 0.7);
        if (isSel) dotScreenR += 2.5;

        const offsetScreen = dotScreenR + 4.5;
        const offsetSvg = offsetScreen / scale;

        item.label.setAttribute('x', item.cx.toFixed(2));
        item.label.setAttribute('y', (item.cy - offsetSvg).toFixed(2));
        item.label.setAttribute('text-anchor', 'middle');
        item.label.style.fontSize = fontSvg.toFixed(2) + 'px';
        item.label.style.strokeWidth = strokeSvg.toFixed(2) + 'px';
        item.label.style.opacity = '1';
        item.label.style.pointerEvents = 'auto';
        item.label.classList.toggle('is-selected', isSel);
    });

    updateBackButtonVisibility();
}

function isCityInViewBox(cityItem, vb) {
    return (
        cityItem.cx >= vb.x &&
        cityItem.cx <= vb.x + vb.w &&
        cityItem.cy >= vb.y &&
        cityItem.cy <= vb.y + vb.h
    );
}

function setViewBox(x, y, w, h) {
    currentViewBox = { x, y, w, h };
    updateMapDisplay(currentViewBox);
}

function cancelAnimation() {
    if (animFrameId) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
    }
}

function animateViewBoxTo(targetX, targetY, targetW, targetH, duration = 500, onComplete = null) {
    cancelAnimation();
    const startX = currentViewBox.x;
    const startY = currentViewBox.y;
    const startW = currentViewBox.w;
    const startH = currentViewBox.h;
    const startTime = performance.now();

    function step(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3); // Ease-out cubic

        const curX = startX + (targetX - startX) * ease;
        const curY = startY + (targetY - startY) * ease;
        const curW = startW + (targetW - startW) * ease;
        const curH = startH + (targetH - startH) * ease;

        currentViewBox = { x: curX, y: curY, w: curW, h: curH };
        updateMapDisplay(currentViewBox);

        if (progress < 1) {
            animFrameId = requestAnimationFrame(step);
        } else {
            animFrameId = null;
            currentViewBox = { x: targetX, y: targetY, w: targetW, h: targetH };
            updateMapDisplay(currentViewBox);
            if (typeof onComplete === 'function') onComplete();
        }
    }

    animFrameId = requestAnimationFrame(step);
}

function zoomAroundPoint(svgPt, factor) {
    cancelAnimation();
    let newW = currentViewBox.w * factor;
    newW = Math.max(MIN_VIEWBOX_W, Math.min(MAX_VIEWBOX_W, newW));
    let newH = newW * (500 / 800);

    const rx = (svgPt.x - currentViewBox.x) / currentViewBox.w;
    const ry = (svgPt.y - currentViewBox.y) / currentViewBox.h;

    let newX = svgPt.x - rx * newW;
    let newY = svgPt.y - ry * newH;

    newX = clampX(newX, newW);
    newY = clampY(newY, newH);

    setViewBox(newX, newY, newW, newH);
}

function updateBackButtonVisibility() {
    const backBtn = document.getElementById('back-btn');
    if (!backBtn) return;
    const isOverview = (
        Math.abs(currentViewBox.w - 800) < 4 &&
        Math.abs(currentViewBox.x) < 4 &&
        Math.abs(currentViewBox.y) < 4
    );
    if (!isOverview || selectedCity || activeRegion) {
        backBtn.classList.add('visible');
    } else {
        backBtn.classList.remove('visible');
    }
}

function zoomToBox(targetX, targetY, targetWidth, targetHeight) {
    isZoomed = true;
    const aspectRatio = 800 / 500;
    let finalW = targetWidth;
    let finalH = targetHeight;

    if (finalW / finalH > aspectRatio) {
        finalH = finalW / aspectRatio;
    } else {
        finalW = finalH * aspectRatio;
    }

    finalW = Math.max(MIN_VIEWBOX_W, Math.min(MAX_VIEWBOX_W, finalW));
    finalH = finalW / aspectRatio;

    let finalX = targetX - (finalW - targetWidth) / 2;
    let finalY = targetY - (finalH - targetHeight) / 2;

    finalX = clampX(finalX, finalW);
    finalY = clampY(finalY, finalH);

    animateViewBoxTo(finalX, finalY, finalW, finalH, 500);
}

function showRegionTooltip(e, name) {
    if (!name) return;
    const tooltip = document.getElementById('region-tooltip');
    if (!tooltip) return;
    tooltip.textContent = name;
    tooltip.style.left = `${e.clientX}px`;
    tooltip.style.top = `${e.clientY}px`;
    tooltip.classList.add('visible');
}

function hideRegionTooltip() {
    const tooltip = document.getElementById('region-tooltip');
    if (tooltip) tooltip.classList.remove('visible');
}

// Выбор города: просто выбирает город и обновляет данные ВУЗов, БЕЗ выдвижения нижней панели
function selectCity(cityName) {
    selectedCity = cityName;
    const title = document.getElementById('sidebar-region-title');
    if (title) title.innerText = `ВУЗы города ${cityName}`;

    const sheetTitle = document.getElementById('sheet-title');
    const sheetSubtitle = document.getElementById('sheet-subtitle');
    if (sheetTitle) sheetTitle.innerText = cityName;
    if (sheetSubtitle) sheetSubtitle.innerText = 'ВУЗы города (потяните вверх)';

    updateSidebarUnis();
    updateBackButtonVisibility();
    updateMapDisplay(currentViewBox);
}

// Обновление списка ВУЗов в сайдбаре
function updateSidebarUnis() {
    const listContainer = document.getElementById('sidebar-unis-list');
    if (!listContainer) return;

    if (!selectedCity) {
        listContainer.innerHTML = '<p style="font-size: 12px; color: #94a3b8;">Выберите город на карте для просмотра доступных ВУЗов.</p>';
        return;
    }

    const cityUnis = (window.uniData && window.uniData[selectedCity]) ? window.uniData[selectedCity] : null;

    if (!cityUnis || cityUnis.length === 0) {
        listContainer.innerHTML = `
            <div style="padding: 16px; background: #1e293b; border-radius: 8px; border: 1px dashed #334155; text-align: center; color: #94a3b8; font-size: 13px;">
                ВУЗы города <strong>${selectedCity}</strong> добавляются в базу данных.
            </div>
        `;
        const badge = document.getElementById('sheet-count-badge');
        if (badge) badge.style.display = 'none';
        return;
    }

    const totalScore = Number(document.getElementById('total-ege-score')?.innerText) || 0;
    const studyType = document.querySelector('input[name="studyType"]:checked')?.value || 'budget';
    listContainer.innerHTML = '';

    cityUnis.forEach(uni => {
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

        uniCard.addEventListener('click', () => {
            uniCard.classList.toggle('is-expanded');
        });

        listContainer.appendChild(uniCard);
    });

    const badge = document.getElementById('sheet-count-badge');
    if (badge) {
        badge.innerText = `${cityUnis.length} ВУЗов`;
        badge.style.display = 'inline-block';
    }
}

// Сброс выбора и масштаба карты
function resetMapView() {
    isZoomed = false;
    hideRegionTooltip();
    selectedCity = null;
    activeRegion = null;

    const title = document.getElementById('sidebar-region-title');
    if (title) title.innerText = 'ВУЗы региона';

    const list = document.getElementById('sidebar-unis-list');
    if (list) list.innerHTML = '<p style="font-size: 12px; color: #94a3b8;">Выберите город на карте для просмотра доступных ВУЗов.</p>';

    document.querySelectorAll('.region').forEach(r => r.classList.remove('active-region'));

    const sheetTitle = document.getElementById('sheet-title');
    const sheetSubtitle = document.getElementById('sheet-subtitle');
    const sheetCountBadge = document.getElementById('sheet-count-badge');
    if (sheetTitle) sheetTitle.innerText = 'Калькулятор и ВУЗы';
    if (sheetSubtitle) sheetSubtitle.innerText = 'Нажмите или потяните вверх';
    if (sheetCountBadge) sheetCountBadge.style.display = 'none';

    animateViewBoxTo(0, 0, 800, 500, 500);
}

// Инициализация нижней шторки (Bottom Sheet)
function initBottomSheet() {
    const sidebar = document.getElementById('region-sidebar');
    const dragArea = document.getElementById('sheet-drag-area');
    if (!sidebar || !dragArea) return;

    let startY = 0;
    let currentY = 0;
    let isDragging = false;

    window.expandBottomSheet = function() {
        sidebar.classList.add('sheet-expanded');
    };

    window.collapseBottomSheet = function() {
        sidebar.classList.remove('sheet-expanded');
    };

    window.toggleBottomSheet = function() {
        sidebar.classList.toggle('sheet-expanded');
    };

    dragArea.addEventListener('click', () => {
        window.toggleBottomSheet();
    });

    dragArea.addEventListener('touchstart', (e) => {
        startY = e.touches[0].clientY;
        currentY = startY;
        isDragging = true;
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        currentY = e.touches[0].clientY;
    }, { passive: true });

    window.addEventListener('touchend', () => {
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

const AVAILABLE_SUBJECTS = [
    'Русский язык',
    'Математика (профиль)',
    'Информатика',
    'Обществознание',
    'Физика',
    'Химия',
    'Биология',
    'История',
    'Иностранный язык',
    'Литература',
    'География'
];

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
    input.value = '';
    input.oninput = function () {
        const digits = this.value.replace(/[^\d]/g, '');
        const num = digits === '' ? NaN : Math.min(100, parseInt(digits, 10));
        const clean = isNaN(num) ? '' : String(num);
        if (this.value !== clean) this.value = clean;
        calculateTotal();
    };

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

function updateSubjectDropdowns() {
    const list = document.getElementById('ege-subjects-list');
    if (!list) return;
    const selects = list.querySelectorAll('.ege-select');
    const rows = list.querySelectorAll('.ege-subject-row');
    const selectedValues = Array.from(selects).map(s => s.value);

    rows.forEach(row => {
        const btn = row.querySelector('.btn-remove-subject');
        if (btn) btn.style.display = rows.length === 1 ? 'none' : 'block';
    });

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

    const addBtn = document.getElementById('add-subject-btn');
    if (addBtn) {
        addBtn.style.display = selects.length >= 3 ? 'none' : 'block';
    }
}

/**
 * Вспомогательная функция: поиск города рядом с точкой касания/клика на экране.
 * Обеспечивает легкое нажатие даже при легком промахе пальцем (радиус 28px).
 */
function findNearestCity(clientX, clientY, maxDistPx = 28) {
    const svg = document.getElementById('russia-map');
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const scale = Math.min(rect.width / currentViewBox.w, rect.height / currentViewBox.h);
    if (!scale || scale <= 0) return null;

    const offsetX = (rect.width - currentViewBox.w * scale) / 2;
    const offsetY = (rect.height - currentViewBox.h * scale) / 2;

    let nearest = null;
    let minDist = Infinity;

    for (const item of cityRegistry) {
        const sx = rect.left + offsetX + (item.cx - currentViewBox.x) * scale;
        const sy = rect.top + offsetY + (item.cy - currentViewBox.y) * scale;
        const dist = Math.hypot(clientX - sx, clientY - sy);
        if (dist <= maxDistPx && dist < minDist) {
            minDist = dist;
            nearest = item;
        }
    }
    return nearest;
}

// --- Обработчики взаимодействия с картой ---
document.addEventListener('DOMContentLoaded', () => {
    initBottomSheet();
    initCityRegistry();

    const mapContainer = document.getElementById('map-container');
    const svg = document.getElementById('russia-map');
    if (!svg || !mapContainer) return;

    // Первоначальная отрисовка
    updateMapDisplay(currentViewBox);
    window.addEventListener('resize', () => updateMapDisplay(currentViewBox));

    // 1. Масштабирование колесиком мыши (Desktop)
    mapContainer.addEventListener('wheel', (e) => {
        e.preventDefault();
        cancelAnimation();
        const pt = clientToSvgPoint(svg, e.clientX, e.clientY);
        const factor = e.deltaY < 0 ? 0.82 : 1.22;
        zoomAroundPoint(pt, factor);
    }, { passive: false });

    // 2. Панорамирование мышью (Desktop)
    let isMouseDown = false;
    let hasDragged = false;
    let startMouse = { x: 0, y: 0 };
    let startVB = { ...currentViewBox };

    mapContainer.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        cancelAnimation();
        isMouseDown = true;
        hasDragged = false;
        startMouse = { x: e.clientX, y: e.clientY };
        startVB = { ...currentViewBox };
    });

    window.addEventListener('mousemove', (e) => {
        if (!isMouseDown) return;
        const dx = e.clientX - startMouse.x;
        const dy = e.clientY - startMouse.y;
        if (Math.hypot(dx, dy) > 4) {
            hasDragged = true;
            mapContainer.classList.add('is-panning');
        }
        if (hasDragged) {
            const rect = svg.getBoundingClientRect();
            const scale = Math.min(rect.width / startVB.w, rect.height / startVB.h);
            if (scale > 0) {
                const newX = clampX(startVB.x - dx / scale, startVB.w);
                const newY = clampY(startVB.y - dy / scale, startVB.h);
                setViewBox(newX, newY, startVB.w, startVB.h);
            }
        }
    });

    window.addEventListener('mouseup', () => {
        if (isMouseDown) {
            isMouseDown = false;
            mapContainer.classList.remove('is-panning');
            if (hasDragged) {
                window.__justDragged = true;
                setTimeout(() => { window.__justDragged = false; }, 100);
            }
        }
    });

    // 3. Сенсорные жесты для смартфонов (Pinch-to-zoom и Touch-pan)
    let touchMode = 'none';
    let startTouch0 = { x: 0, y: 0 };
    let touchHasDragged = false;
    let pinchStartDist = 0;
    let pinchMidSvg = { x: 0, y: 0 };
    let pinchStartVB = { ...currentViewBox };

    mapContainer.addEventListener('touchstart', (e) => {
        cancelAnimation();
        if (e.touches.length === 1) {
            touchMode = 'pan';
            touchHasDragged = false;
            startTouch0 = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            startVB = { ...currentViewBox };
        } else if (e.touches.length === 2) {
            touchMode = 'pinch';
            touchHasDragged = true;
            const t0 = e.touches[0];
            const t1 = e.touches[1];
            pinchStartDist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
            const midX = (t0.clientX + t1.clientX) / 2;
            const midY = (t0.clientY + t1.clientY) / 2;
            pinchMidSvg = clientToSvgPoint(svg, midX, midY);
            pinchStartVB = { ...currentViewBox };
        }
    }, { passive: false });

    mapContainer.addEventListener('touchmove', (e) => {
        if (touchMode === 'pan' && e.touches.length === 1) {
            const dx = e.touches[0].clientX - startTouch0.x;
            const dy = e.touches[0].clientY - startTouch0.y;
            if (Math.hypot(dx, dy) > 6) {
                touchHasDragged = true;
                e.preventDefault();
                const rect = svg.getBoundingClientRect();
                const scale = Math.min(rect.width / startVB.w, rect.height / startVB.h);
                if (scale > 0) {
                    const newX = clampX(startVB.x - dx / scale, startVB.w);
                    const newY = clampY(startVB.y - dy / scale, startVB.h);
                    setViewBox(newX, newY, startVB.w, startVB.h);
                }
            }
        } else if (touchMode === 'pinch' && e.touches.length === 2) {
            e.preventDefault();
            const t0 = e.touches[0];
            const t1 = e.touches[1];
            const curDist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
            if (pinchStartDist > 0 && curDist > 0) {
                const scaleFactor = pinchStartDist / curDist;
                let newW = pinchStartVB.w * scaleFactor;
                newW = Math.max(MIN_VIEWBOX_W, Math.min(MAX_VIEWBOX_W, newW));
                let newH = newW * (500 / 800);

                const rx = (pinchMidSvg.x - pinchStartVB.x) / pinchStartVB.w;
                const ry = (pinchMidSvg.y - pinchStartVB.y) / pinchStartVB.h;

                let newX = pinchMidSvg.x - rx * newW;
                let newY = pinchMidSvg.y - ry * newH;

                newX = clampX(newX, newW);
                newY = clampY(newY, newH);

                setViewBox(newX, newY, newW, newH);
            }
        }
    }, { passive: false });

    mapContainer.addEventListener('touchend', (e) => {
        if (e.touches.length === 0) {
            touchMode = 'none';
            if (touchHasDragged) {
                window.__justDragged = true;
                setTimeout(() => { window.__justDragged = false; }, 120);
            }
        } else if (e.touches.length === 1) {
            touchMode = 'pan';
            startTouch0 = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            startVB = { ...currentViewBox };
        }
    });

    // 4. Обработчики для регионов (Layer 1)
    document.querySelectorAll('.region').forEach(region => {
        region.addEventListener('mouseenter', function (e) {
            const name = this.getAttribute('data-region-name');
            showRegionTooltip(e, name);
        });

        region.addEventListener('mousemove', function (e) {
            if (!isZoomed) {
                const tooltip = document.getElementById('region-tooltip');
                if (tooltip && tooltip.classList.contains('visible')) {
                    tooltip.style.left = `${e.clientX}px`;
                    tooltip.style.top = `${e.clientY}px`;
                }
            }
        });

        region.addEventListener('mouseleave', function () {
            hideRegionTooltip();
        });

        region.addEventListener('click', function (e) {
            if (window.__justDragged) return;
            e.stopPropagation();
            isZoomed = true;
            hideRegionTooltip();

            activeRegion = this.getAttribute('data-region-name');
            document.querySelectorAll('.region').forEach(r => r.classList.remove('active-region'));
            this.classList.add('active-region');

            const bbox = this.getBBox();
            const padding = 12;
            zoomToBox(bbox.x - padding, bbox.y - padding, bbox.width + padding * 2, bbox.height + padding * 2);
        });
    });

    // 5. Обработчики для точек (Layer 2) и названий городов (Layer 3)
    function onCityActivate(item) {
        hideRegionTooltip();
        selectCity(item.name);
    }

    cityRegistry.forEach(item => {
        const handleCityClick = (e) => {
            if (window.__justDragged) return;
            e.stopPropagation();
            onCityActivate(item);
        };

        const handleCityEnter = (e) => {
            item.isHovered = true;
            item.dot.classList.add('is-hovered');
            if (item.label) item.label.classList.add('is-hovered');
            showRegionTooltip(e, item.name);
            updateMapDisplay(currentViewBox);
        };

        const handleCityLeave = () => {
            item.isHovered = false;
            item.dot.classList.remove('is-hovered');
            if (item.label) item.label.classList.remove('is-hovered');
            hideRegionTooltip();
            updateMapDisplay(currentViewBox);
        };

        item.dot.addEventListener('click', handleCityClick);
        item.dot.addEventListener('mouseenter', handleCityEnter);
        item.dot.addEventListener('mouseleave', handleCityLeave);

        if (item.label) {
            item.label.addEventListener('click', handleCityClick);
            item.label.addEventListener('mouseenter', handleCityEnter);
            item.label.addEventListener('mouseleave', handleCityLeave);
        }
    });

    // 6. Умный перехват тапа поблизости от города на смартфонах
    mapContainer.addEventListener('click', (e) => {
        if (window.__justDragged) return;

        const nearCity = findNearestCity(e.clientX, e.clientY, 28);
        if (nearCity) {
            e.stopPropagation();
            onCityActivate(nearCity);
            return;
        }

        if (e.target === svg || e.target.id === 'map-background') {
            resetMapView();
        }
    });

    // Инициализация предметов ЕГЭ
    addEgeSubject();
});
