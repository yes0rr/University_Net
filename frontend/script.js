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

// -------------------------------------------------------------
// Кэш и математика масштабирования и панорамирования SVG-карты
// -------------------------------------------------------------
const MIN_VB_WIDTH = 35;
const MAX_VB_WIDTH = 800;
const BASE_WIDTH = 800;
const BASE_HEIGHT = 500;
const ASPECT = BASE_HEIGHT / BASE_WIDTH; // 0.625

let cityNodes = [];

function cacheCityNodes() {
    cityNodes = Array.from(document.querySelectorAll(".city-group")).map(group => {
        const dot = group.querySelector(".city-dot");
        const label = group.querySelector(".city-label");
        const isTop = group.classList.contains("is-top");
        const city = group.getAttribute("data-city") || "";
        const region = group.getAttribute("data-region") || "";
        const cx = dot ? parseFloat(dot.getAttribute("cx")) : 0;
        const cy = dot ? parseFloat(dot.getAttribute("cy")) : 0;
        const origLabelY = label ? parseFloat(label.getAttribute("y")) : cy;
        const isLabelAbove = origLabelY < cy;
        return { group, dot, label, isTop, city, region, cx, cy, origLabelY, isLabelAbove };
    });
}

function getCurrentViewBox() {
    const svg = document.getElementById("russia-map");
    if (!svg) return { x: 0, y: 0, w: 800, h: 500 };
    const parts = (svg.getAttribute("viewBox") || "0 0 800 500").trim().split(/\s+/).map(Number);
    return {
        x: isNaN(parts[0]) ? 0 : parts[0],
        y: isNaN(parts[1]) ? 0 : parts[1],
        w: isNaN(parts[2]) ? 800 : parts[2],
        h: isNaN(parts[3]) ? 500 : parts[3]
    };
}

function clampViewBox(x, y, w, h) {
    let clampedW = Math.max(MIN_VB_WIDTH, Math.min(MAX_VB_WIDTH, w));
    let clampedH = clampedW * ASPECT;

    let clampedX = x;
    let clampedY = y;

    if (clampedW >= MAX_VB_WIDTH) {
        clampedX = 0;
        clampedY = 0;
    } else {
        const marginX = 40;
        const marginY = 30;
        const minX = -marginX;
        const maxX = BASE_WIDTH + marginX - clampedW;
        const minY = -marginY;
        const maxY = BASE_HEIGHT + marginY - clampedH;
        clampedX = Math.max(minX, Math.min(maxX, clampedX));
        clampedY = Math.max(minY, Math.min(maxY, clampedY));
    }

    return { x: clampedX, y: clampedY, w: clampedW, h: clampedH };
}

function setViewBox(x, y, w, h) {
    const svg = document.getElementById("russia-map");
    if (!svg) return;
    svg.setAttribute("viewBox", `${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)}`);
    updateCityScaling({ x, y, w, h });
}

function clientToSvgPoint(clientX, clientY) {
    const svg = document.getElementById("russia-map");
    if (!svg) return { x: 400, y: 250 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (ctm) {
        try {
            const transformed = pt.matrixTransform(ctm.inverse());
            return { x: transformed.x, y: transformed.y };
        } catch (e) {}
    }
    const rect = svg.getBoundingClientRect();
    const vb = getCurrentViewBox();
    const x = vb.x + ((clientX - rect.left) / (rect.width || 800)) * vb.w;
    const y = vb.y + ((clientY - rect.top) / (rect.height || 500)) * vb.h;
    return { x, y };
}

function updateCityScaling(vb) {
    if (!vb) vb = getCurrentViewBox();
    const svg = document.getElementById("russia-map");
    if (!svg) return;

    let screenScale = 1;
    const rect = svg.getBoundingClientRect();
    if (rect.width > 0 && vb.w > 0) {
        screenScale = rect.width / vb.w;
    }

    const isMobile = window.innerWidth <= 768;
    const zoomFactor = Math.min(800 / vb.w, 500 / vb.h);
    const hasActiveRegion = !!document.querySelector(".region.active-region");

    if (cityNodes.length === 0) cacheCityNodes();

    // Целевые размеры в реальных экранных пикселях (CSS px)
    const topFontPx = isMobile ? 13.5 : 12.5;
    const regularFontPx = isMobile ? 12.5 : 11.5;
    const activeFontPx = isMobile ? 14.5 : 13.5;

    const strokePx = isMobile ? 2.8 : 2.2;
    const topDotPx = isMobile ? 6.0 : 4.8;
    const regularDotPx = isMobile ? 4.5 : 3.5;

    // Перевод в координаты SVG
    const svgTopFont = topFontPx / screenScale;
    const svgRegularFont = regularFontPx / screenScale;
    const svgActiveFont = activeFontPx / screenScale;
    const svgStroke = strokePx / screenScale;
    const svgTopDot = topDotPx / screenScale;
    const svgRegularDot = regularDotPx / screenScale;

    cityNodes.forEach(({ group, dot, label, isTop, isLabelAbove, cy }) => {
        const inActive = group.classList.contains("in-active-region");
        const isSelected = group.classList.contains("is-selected");

        const targetSvgR = (isTop || inActive || isSelected) ? svgTopDot : svgRegularDot;
        const targetSvgFont = (inActive || isSelected) ? svgActiveFont : (isTop ? svgTopFont : svgRegularFont);

        if (dot) {
            dot.setAttribute("r", targetSvgR.toFixed(2));
            dot.style.strokeWidth = Math.max(0.6 / screenScale, 1.2 / screenScale).toFixed(2) + "px";
        }

        if (label) {
            label.style.fontSize = targetSvgFont.toFixed(2) + "px";
            label.style.strokeWidth = svgStroke.toFixed(2) + "px";
            label.style.stroke = "#090e1a";
            label.style.paintOrder = "stroke fill";
            label.style.strokeLinejoin = "round";

            // Динамическое смещение по Y: текст никогда не налезает на круг
            if (isLabelAbove) {
                label.setAttribute("y", (cy - targetSvgR - (2.5 / screenScale)).toFixed(2));
            } else {
                label.setAttribute("y", (cy + targetSvgR + targetSvgFont + (1.0 / screenScale)).toFixed(2));
            }

            if (hasActiveRegion) {
                if (inActive || isSelected) {
                    label.style.display = "inline";
                }
            } else {
                if (isTop || isSelected) {
                    label.style.display = "inline";
                } else if (zoomFactor >= 1.6) {
                    label.style.display = "inline";
                } else {
                    label.style.display = "";
                }
            }
        }
    });
}
let currentAnimationId = null;

function stopViewBoxAnimation() {
    if (currentAnimationId !== null) {
        cancelAnimationFrame(currentAnimationId);
        currentAnimationId = null;
    }
}

function animateViewBox(svgElem, targetViewBoxStr, duration = 500) {
    stopViewBoxAnimation();

    const startViewBox = (svgElem.getAttribute("viewBox") || "0 0 800 500")
        .trim()
        .split(/\s+/)
        .map(Number);
    const target = targetViewBoxStr.trim().split(/\s+/).map(Number);
    const startTime = performance.now();

    function step(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);

        const ease = progress < 0.5 
            ? 2 * progress * progress 
            : -1 + (4 - 2 * progress) * progress;

        const currentViewBox = startViewBox.map((start, i) => start + (target[i] - start) * ease);
        svgElem.setAttribute("viewBox", currentViewBox.map(n => n.toFixed(2)).join(" "));

        updateCityScaling({
            x: currentViewBox[0],
            y: currentViewBox[1],
            w: currentViewBox[2],
            h: currentViewBox[3]
        });

        if (progress < 1) {
            currentAnimationId = requestAnimationFrame(step);
        } else {
            currentAnimationId = null;
        }
    }

    currentAnimationId = requestAnimationFrame(step);
}

function zoomAtPoint(svgPt, zoomFactor) {
    stopViewBoxAnimation();
    const current = getCurrentViewBox();
    const newW = current.w * zoomFactor;
    const newH = current.h * zoomFactor;

    const ratioX = (svgPt.x - current.x) / current.w;
    const ratioY = (svgPt.y - current.y) / current.h;

    const rawX = svgPt.x - ratioX * newW;
    const rawY = svgPt.y - ratioY * newH;

    const clamped = clampViewBox(rawX, rawY, newW, newH);
    setViewBox(clamped.x, clamped.y, clamped.w, clamped.h);

    const backBtn = document.getElementById("back-btn");
    if (backBtn) {
        if (clamped.w < 790) {
            backBtn.classList.add("visible");
        } else if (!selectedCity && !document.querySelector(".region.active-region")) {
            backBtn.classList.remove("visible");
        }
    }
}

function zoomIn() {
    const current = getCurrentViewBox();
    const centerPt = { x: current.x + current.w / 2, y: current.y + current.h / 2 };
    const targetW = current.w / 1.4;
    const targetH = current.h / 1.4;
    const rawX = centerPt.x - targetW / 2;
    const rawY = centerPt.y - targetH / 2;
    const clamped = clampViewBox(rawX, rawY, targetW, targetH);
    const svg = document.getElementById("russia-map");
    if (svg) animateViewBox(svg, `${clamped.x} ${clamped.y} ${clamped.w} ${clamped.h}`, 300);

    const backBtn = document.getElementById("back-btn");
    if (backBtn && clamped.w < 790) backBtn.classList.add("visible");
}

function zoomOut() {
    const current = getCurrentViewBox();
    const centerPt = { x: current.x + current.w / 2, y: current.y + current.h / 2 };
    const targetW = current.w * 1.4;
    const targetH = current.h * 1.4;
    const rawX = centerPt.x - targetW / 2;
    const rawY = centerPt.y - targetH / 2;
    const clamped = clampViewBox(rawX, rawY, targetW, targetH);
    const svg = document.getElementById("russia-map");
    if (svg) animateViewBox(svg, `${clamped.x} ${clamped.y} ${clamped.w} ${clamped.h}`, 300);

    const backBtn = document.getElementById("back-btn");
    if (backBtn && clamped.w >= 799 && !selectedCity && !document.querySelector(".region.active-region")) {
        backBtn.classList.remove("visible");
    }
}

let suppressClick = false;

function initMapZoomAndPan() {
    const mapContainer = document.getElementById("map-container");
    const svg = document.getElementById("russia-map");
    if (!mapContainer || !svg) return;

    // 1. Колесо мыши (Десктоп) — плавный зум в точку курсора
    mapContainer.addEventListener("wheel", (e) => {
        e.preventDefault();
        const pt = clientToSvgPoint(e.clientX, e.clientY);
        const delta = Math.max(-120, Math.min(120, e.deltaY));
        const factor = Math.exp(delta * 0.002);
        zoomAtPoint(pt, factor);
    }, { passive: false });

    // 2. Мышь (Десктоп) — панорамирование (Drag to Pan)
    let isMouseDown = false;
    let mouseStartX = 0;
    let mouseStartY = 0;
    let mouseStartVb = null;
    let hasMouseDragged = false;

    mapContainer.addEventListener("mousedown", (e) => {
        if (e.button !== 0) return;
        if (e.target.closest('#back-btn') || e.target.closest('.map-controls')) return;

        isMouseDown = true;
        hasMouseDragged = false;
        mouseStartX = e.clientX;
        mouseStartY = e.clientY;
        mouseStartVb = getCurrentViewBox();
    });

    window.addEventListener("mousemove", (e) => {
        if (!isMouseDown || !mouseStartVb) return;

        const dx = e.clientX - mouseStartX;
        const dy = e.clientY - mouseStartY;

        if (!hasMouseDragged) {
            if (Math.hypot(dx, dy) > 4) {
                hasMouseDragged = true;
                stopViewBoxAnimation();
                mapContainer.classList.add("is-grabbing");
                hideRegionTooltip();
            }
        }

        if (hasMouseDragged) {
            const rect = svg.getBoundingClientRect();
            const scaleX = mouseStartVb.w / (rect.width || 800);
            const scaleY = mouseStartVb.h / (rect.height || 500);

            const rawX = mouseStartVb.x - dx * scaleX;
            const rawY = mouseStartVb.y - dy * scaleY;

            const clamped = clampViewBox(rawX, rawY, mouseStartVb.w, mouseStartVb.h);
            setViewBox(clamped.x, clamped.y, clamped.w, clamped.h);
        }
    });

    window.addEventListener("mouseup", () => {
        if (!isMouseDown) return;
        isMouseDown = false;
        mapContainer.classList.remove("is-grabbing");

        if (hasMouseDragged) {
            suppressClick = true;
            setTimeout(() => {
                suppressClick = false;
            }, 80);
        }
    });

    // 3. Сенсорные жесты (Смартфоны) — Pinch-to-zoom (сведение/разведение пальцев) и Pan
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartVb = null;
    let isTouchPanning = false;
    let isPinching = false;
    let hasTouchDragged = false;
    let initialPinchDist = 0;
    let pinchStartVb = null;
    let initialPinchSvgMid = null;
    let pinchStartMidScreen = null;
    let lastTapTime = 0;
    let lastTapX = 0;
    let lastTapY = 0;

    mapContainer.addEventListener("touchstart", (e) => {
        // Устраняем любое выделение текста в браузере при касании карты
        if (window.getSelection) {
            const sel = window.getSelection();
            if (sel && sel.removeAllRanges) sel.removeAllRanges();
        }

        if (e.target.closest('#back-btn') || e.target.closest('.map-controls')) return;

        stopViewBoxAnimation();
        hideRegionTooltip();

        if (e.touches.length === 1) {
            // Проверка на двойной быстрый тап для приближения
            const now = performance.now();
            const touch = e.touches[0];
            const distFromLastTap = Math.hypot(touch.clientX - lastTapX, touch.clientY - lastTapY);
            if (now - lastTapTime < 320 && distFromLastTap < 30) {
                e.preventDefault();
                const tapSvgPt = clientToSvgPoint(touch.clientX, touch.clientY);
                zoomAtPoint(tapSvgPt, 0.65);
                lastTapTime = 0;
                return;
            }
            lastTapTime = now;
            lastTapX = touch.clientX;
            lastTapY = touch.clientY;

            isTouchPanning = true;
            isPinching = false;
            hasTouchDragged = false;
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
            touchStartVb = getCurrentViewBox();
        } else if (e.touches.length === 2) {
            isPinching = true;
            isTouchPanning = false;
            hasTouchDragged = true;

            const t0 = e.touches[0];
            const t1 = e.touches[1];
            initialPinchDist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);

            const midClientX = (t0.clientX + t1.clientX) / 2;
            const midClientY = (t0.clientY + t1.clientY) / 2;
            pinchStartMidScreen = { x: midClientX, y: midClientY };
            pinchStartVb = getCurrentViewBox();
            initialPinchSvgMid = clientToSvgPoint(midClientX, midClientY);
        }
    }, { passive: false });

    mapContainer.addEventListener("touchmove", (e) => {
        if (e.touches.length === 2 && isPinching && pinchStartVb && initialPinchSvgMid) {
            e.preventDefault();
            const t0 = e.touches[0];
            const t1 = e.touches[1];
            const currentDist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);

            if (initialPinchDist > 0 && currentDist > 0) {
                const pinchRatio = initialPinchDist / currentDist;
                const newW = pinchStartVb.w * pinchRatio;
                const newH = pinchStartVb.h * pinchRatio;

                const currentMidX = (t0.clientX + t1.clientX) / 2;
                const currentMidY = (t0.clientY + t1.clientY) / 2;
                const midDx = currentMidX - pinchStartMidScreen.x;
                const midDy = currentMidY - pinchStartMidScreen.y;

                const rect = svg.getBoundingClientRect();
                const scaleX = pinchStartVb.w / (rect.width || 800);
                const scaleY = pinchStartVb.h / (rect.height || 500);

                const ratioX = (initialPinchSvgMid.x - pinchStartVb.x) / pinchStartVb.w;
                const ratioY = (initialPinchSvgMid.y - pinchStartVb.y) / pinchStartVb.h;

                const rawX = initialPinchSvgMid.x - ratioX * newW - midDx * scaleX;
                const rawY = initialPinchSvgMid.y - ratioY * newH - midDy * scaleY;

                const clamped = clampViewBox(rawX, rawY, newW, newH);
                setViewBox(clamped.x, clamped.y, clamped.w, clamped.h);

                const backBtn = document.getElementById("back-btn");
                if (backBtn && clamped.w < 790) backBtn.classList.add("visible");
            }
        } else if (e.touches.length === 1 && isTouchPanning && touchStartVb) {
            const dx = e.touches[0].clientX - touchStartX;
            const dy = e.touches[0].clientY - touchStartY;

            if (!hasTouchDragged && Math.hypot(dx, dy) > 8) {
                hasTouchDragged = true;
            }

            if (hasTouchDragged) {
                e.preventDefault();
                const rect = svg.getBoundingClientRect();
                const scaleX = touchStartVb.w / (rect.width || 800);
                const scaleY = touchStartVb.h / (rect.height || 500);

                const rawX = touchStartVb.x - dx * scaleX;
                const rawY = touchStartVb.y - dy * scaleY;

                const clamped = clampViewBox(rawX, rawY, touchStartVb.w, touchStartVb.h);
                setViewBox(clamped.x, clamped.y, clamped.w, clamped.h);
            }
        }
    }, { passive: false });

    const handleTouchEnd = () => {
        if (isPinching) {
            isPinching = false;
            isTouchPanning = false;
        }
        if (hasTouchDragged) {
            suppressClick = true;
            setTimeout(() => {
                suppressClick = false;
            }, 100);
        }
        isTouchPanning = false;
    };

    mapContainer.addEventListener("touchend", handleTouchEnd);
    mapContainer.addEventListener("touchcancel", handleTouchEnd);

    // 4. Полный запрет контекстного меню (выделения) при долгом удержании пальца на смартфонах
    mapContainer.addEventListener("contextmenu", (e) => e.preventDefault());
    mapContainer.addEventListener("selectstart", (e) => e.preventDefault());

    // 5. Перехват клика во время фазы захвата (capture): если пользователь перемещал карту, клик отменяется
    mapContainer.addEventListener("click", (e) => {
        if (suppressClick) {
            e.stopPropagation();
            e.preventDefault();
        }
    }, true);
}

function initMapControls() {
    const btnIn = document.getElementById("btn-zoom-in");
    const btnOut = document.getElementById("btn-zoom-out");
    const btnReset = document.getElementById("btn-zoom-reset");

    if (btnIn) btnIn.addEventListener("click", (e) => { e.stopPropagation(); zoomIn(); });
    if (btnOut) btnOut.addEventListener("click", (e) => { e.stopPropagation(); zoomOut(); });
    if (btnReset) btnReset.addEventListener("click", (e) => { e.stopPropagation(); resetMapView(); });
}

function zoomToBox(targetX, targetY, targetWidth, targetHeight, activeRegionName = "") {
    const svg = document.getElementById("russia-map");
    if (!svg) return;

    let w = targetWidth;
    let h = targetHeight;
    const targetAspect = h / w;
    if (targetAspect > ASPECT) {
        w = h / ASPECT;
    } else {
        h = w * ASPECT;
    }
    const x = targetX - (w - targetWidth) / 2;
    const y = targetY - (h - targetHeight) / 2;

    const clamped = clampViewBox(x, y, w, h);

    if (cityNodes.length === 0) cacheCityNodes();

    let matchedCount = 0;
    if (activeRegionName) {
        cityNodes.forEach(({ region }) => {
            if (region && region === activeRegionName) matchedCount++;
        });
    }

    cityNodes.forEach(({ group, region, cx, cy }) => {
        let isBelonging = false;
        if (matchedCount > 0 && activeRegionName) {
            isBelonging = (region === activeRegionName);
        } else {
            isBelonging = (cx >= targetX && cx <= targetX + targetWidth &&
                           cy >= targetY && cy <= targetY + targetHeight);
        }

        group.style.transform = "";
        group.style.transformOrigin = "";

        if (isBelonging) {
            group.classList.add("in-active-region");
            group.style.opacity = "1";
            group.style.pointerEvents = "auto";
        } else {
            group.classList.remove("in-active-region");
            group.style.opacity = "0";
            group.style.pointerEvents = "none";
        }
    });

    animateViewBox(svg, `${clamped.x} ${clamped.y} ${clamped.w} ${clamped.h}`, 550);
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
    cacheCityNodes();
    initBottomSheet();
    initMapZoomAndPan();
    initMapControls();

    const svg = document.getElementById("russia-map");

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

            const regionName = this.getAttribute("data-region-name") || "";

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

            zoomToBox(targetX, targetY, targetWidth, targetHeight, regionName);
        });
    });

    // Навешиваем обработчики клика на каждый ГОРОД
    document.querySelectorAll(".city-group").forEach(cityGroup => {
        cityGroup.addEventListener("click", function (e) {
            e.stopPropagation();
            isZoomed = true;
            hideRegionTooltip();

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
    window.addEventListener("resize", () => {
        updateCityScaling(getCurrentViewBox());
    });
});

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

    if (cityNodes.length === 0) cacheCityNodes();
    cityNodes.forEach(({ group, city }) => {
        if (city === cityName) {
            group.classList.add("is-selected");
        } else {
            group.classList.remove("is-selected");
        }
    });

    const title = document.getElementById('sidebar-region-title');
    if (title) title.innerText = `ВУЗы города ${cityName}`;
    const backBtn = document.getElementById('back-btn');
    if (backBtn) backBtn.classList.add('visible');
    updateSidebarUnis();

    if (window.innerWidth <= 768 && typeof window.expandBottomSheet === "function") {
        window.expandBottomSheet();
    }
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
    stopViewBoxAnimation();
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
    if (svg) animateViewBox(svg, "0 0 800 500", 500);

    // Снимаем подсветку региона
    document.querySelectorAll('.region').forEach(r => r.classList.remove('active-region'));

    if (cityNodes.length === 0) cacheCityNodes();

    // Возвращаем все города, точки и подписи в исходный вид
    cityNodes.forEach(({ group }) => {
        group.classList.remove("in-active-region");
        group.classList.remove("is-selected");
        group.style.opacity = "1";
        group.style.pointerEvents = "auto";
        group.style.transform = "";
        group.style.transformOrigin = "";
    });
    updateCityScaling({ x: 0, y: 0, w: 800, h: 500 });

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
    input.placeholder = '0';        /* виден серым и исчезает при вводе */
    input.value = '';               /* не «0»: иначе его приходится стирать руками */
    input.oninput = function () {
        /* С клавиатуры можно напечатать что угодно (150, 1e3, минус),
           поэтому приводим значение к целому числу в диапазоне 0…100. */
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
