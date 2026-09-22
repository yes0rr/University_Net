
    document.addEventListener("DOMContentLoaded", () => {
        const svg = document.getElementById("russia-map");
        // Сохраняем исходные координаты viewBox карты для сброса
        const initialViewBox = svg.getAttribute("viewBox") || "0 0 1000 600";

        // Навешиваем обработчики клика на каждый регион
        document.querySelectorAll(".region").forEach(region => {
            region.addEventListener("click", function (e) {
                e.stopPropagation();
                // Убираем подсветку со всех регионов и добавляем текущему
                document.querySelectorAll(".region").forEach(r => r.classList.remove("active-region"));
                this.classList.add("active-region");

                // Показываем кнопку "вернуться"
                document.getElementById('back-btn').classList.add('visible');
 // Предотвращаем всплытие клика к родителю

                // Получаем точный прямоугольник границ выбранного SVG-элемента
                const bbox = this.getBBox();

                // Задаем отступ (padding) в пикселях вокруг региона
                const padding = 5;

                // Вычисляем новые целевые координаты для viewBox
                const targetX = bbox.x - padding;
                const targetY = bbox.y - padding;
                const targetWidth = bbox.width + padding * 2;
                const targetHeight = bbox.height + padding * 2;

                const targetViewBox = `${targetX} ${targetY} ${targetWidth} ${targetHeight}`;

                // Плавно анимируем transition SVG к новому viewBox
                
                // Скрываем города из других регионов и уменьшаем точки текущего
                const scale = targetWidth / 800; // коэффициент масштабирования
                document.querySelectorAll(".city-group").forEach(city => {
                    const dot = city.querySelector(".city-dot");
                    if (dot) {
                        const cx = parseFloat(dot.getAttribute("cx"));
                        const cy = parseFloat(dot.getAttribute("cy"));
                        // Устанавливаем центр трансформации
                        city.style.transformOrigin = `${cx}px ${cy}px`;
                        
                        // Проверяем, попадает ли город в новую область просмотра
                        if (cx >= targetX && cx <= targetX + targetWidth &&
                            cy >= targetY && cy <= targetY + targetHeight) {
                            city.style.opacity = "1";
                            city.style.pointerEvents = "auto";
                            // Сохраняем визуальный размер точек, компенсируя зум
                            city.style.transform = `scale(${Math.max(scale, 0.15)})`; 
                        } else {
                            city.style.opacity = "0";
                            city.style.pointerEvents = "none";
                        }
                    }
                });

                animateViewBox(svg, targetViewBox, 600);
            });
        });

        // Навешиваем обработчики клика на каждый ГОРОД (огонек)
        document.querySelectorAll(".city-group").forEach(cityGroup => {
            cityGroup.addEventListener("click", function (e) {
                e.stopPropagation();

                // 1. Вызываем функцию выбора города (обновит боковую панель)
                selectCity(this.dataset.city);

                // 2. Получаем координаты города для зума
                const bbox = this.getBBox();
                const padding = 15; // отступ вокруг города при приближении

                const targetX = bbox.x - padding;
                const targetY = bbox.y - padding;
                const targetWidth = bbox.width + padding * 2;
                const targetHeight = bbox.height + padding * 2;

                const targetViewBox = `${targetX} ${targetY} ${targetWidth} ${targetHeight}`;

                // 3. Плавно анимируем SVG к городу
                
                // Скрываем города из других регионов и уменьшаем точки текущего
                const scale = targetWidth / 800; // коэффициент масштабирования
                document.querySelectorAll(".city-group").forEach(city => {
                    const dot = city.querySelector(".city-dot");
                    if (dot) {
                        const cx = parseFloat(dot.getAttribute("cx"));
                        const cy = parseFloat(dot.getAttribute("cy"));
                        // Устанавливаем центр трансформации
                        city.style.transformOrigin = `${cx}px ${cy}px`;
                        
                        // Проверяем, попадает ли город в новую область просмотра
                        if (cx >= targetX && cx <= targetX + targetWidth &&
                            cy >= targetY && cy <= targetY + targetHeight) {
                            city.style.opacity = "1";
                            city.style.pointerEvents = "auto";
                            // Сохраняем визуальный размер точек, компенсируя зум
                            city.style.transform = `scale(${Math.max(scale, 0.15)})`; 
                        } else {
                            city.style.opacity = "0";
                            city.style.pointerEvents = "none";
                        }
                    }
                });

                animateViewBox(svg, targetViewBox, 600);
            });
        });


        // Сброс масштаба при клике на свободное место карты
        svg.addEventListener("click", (e) => {
            if (e.target === svg || e.target.id === "map-background") {
                resetMapView();
                
            }
        });
    });

    /**
     * Функция для плавной анимации перехода viewBox у SVG
     * @param {SVGSVGElement} svgElem - SVG элемент карты
     * @param {string} targetViewBox - Строка с целевыми координатами "x y width height"
     * @param {number} duration - Длительность анимации в миллисекундах
     */
    function animateViewBox(svgElem, targetViewBox, duration) {
        const startViewBox = (svgElem.getAttribute("viewBox") || "0 0 1000 600")
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

            // Вычисляем промежуточные значения
            const currentViewBox = startViewBox.map((start, i) => start + (target[i] - start) * ease);

            svgElem.setAttribute("viewBox", currentViewBox.join(" "));

            if (progress < 1) {
                requestAnimationFrame(step);
            }
        }

        requestAnimationFrame(step);
    }
    // База данных ВУЗов по городам
    const citiesData = [
        // Первоначальный список
        { name: "Владивосток", cx: 688, cy: 450 },
        { name: "Хабаровск", cx: 683, cy: 393 },
        { name: "Иркутск", cx: 476, cy: 417 },
        { name: "Магадан", cx: 691, cy: 241 },
        { name: "Анадырь", cx: 730, cy: 103 },
        { name: "Петропавловск-Камчатский", cx: 775, cy: 254 },
        { name: "Южно-Сахалинск", cx: 734, cy: 372 },
        { name: "Якутск", cx: 583, cy: 281 },
        { name: "Улан-Удэ", cx: 492, cy: 419 },
        { name: "Кызыл", cx: 410, cy: 422 },
        { name: "Красноярск", cx: 399, cy: 376 },
        { name: "Абакан", cx: 387, cy: 398 },
        { name: "Томск", cx: 352, cy: 361 },
        { name: "Горно-Алтайск", cx: 347, cy: 419 },
        { name: "Барнаул", cx: 341, cy: 397 },
        { name: "Кемерово", cx: 361, cy: 382 },
        { name: "Новосибирск", cx: 339, cy: 377 },
        { name: "Омск", cx: 283, cy: 360 },
        { name: "Тюмень", cx: 251, cy: 323 },
        { name: "Курган", cx: 241, cy: 338 },
        { name: "Челябинск", cx: 217, cy: 327 },
        { name: "Екатеринбург", cx: 226, cy: 308 },
        { name: "Ханты-Мансийск", cx: 289, cy: 294 },
        { name: "Салехард", cx: 300, cy: 235 },
        { name: "Нарьян-Мар", cx: 259, cy: 193 },
        { name: "Сыктывкар", cx: 209, cy: 236 },
        { name: "Киров", cx: 183, cy: 261 },
        { name: "Пермь", cx: 208, cy: 285 },
        { name: "Уфа", cx: 187, cy: 313 },
        { name: "Оренбург", cx: 164, cy: 335 },
        { name: "Самара", cx: 149, cy: 306 },
        { name: "Ижевск", cx: 185, cy: 285 },
        { name: "Ульяновск", cx: 147, cy: 289 },
        { name: "Казань", cx: 163, cy: 280 },
        { name: "Архангельск", cx: 197, cy: 180 },
        { name: "Мурманск", cx: 212, cy: 126 },
        { name: "Санкт-Петербург", cx: 138, cy: 180 },
        { name: "Петрозаводск", cx: 156, cy: 172 }
        ];

    document.querySelector('svg').addEventListener('click', (e) => {
        const svg = e.currentTarget;
        const pt = svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const cursorPt = pt.matrixTransform(svg.getScreenCTM().inverse());
        console.log(`cx="${Math.round(cursorPt.x)}" cy="${Math.round(cursorPt.y)}"`);
    });

    let selectedCity = null;
    let currentUser = null;

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
        const inputs = document.querySelectorAll('.ege-input');
        let total = 0;
        inputs.forEach(input => {
            total += Number(input.value) || 0;
        });
        document.getElementById('total-ege-score').innerText = total;
        if (selectedCity) updateSidebarUnis();
    }

    // Выбор города
    function selectCity(cityName) {
        selectedCity = cityName;
        document.getElementById('sidebar-region-title').innerText = `ВУЗы города ${cityName}`;
        document.getElementById('back-btn').classList.add('visible');
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
        selectedCity = null;
        document.getElementById('sidebar-region-title').innerText = 'ВУЗы региона';
        document.getElementById('sidebar-unis-list').innerHTML = '<p style="font-size: 12px; color: #94a3b8;">Выберите город на карте для просмотра доступных ВУЗов.</p>';
        document.getElementById('back-btn').classList.remove('visible');
        document.getElementById('info-panel').classList.remove('visible');

        const svg = document.getElementById("russia-map");
        if (svg) animateViewBox(svg, "0 0 800 500", 600);
        
        // Снимаем подсветку региона
        document.querySelectorAll('.region').forEach(r => r.classList.remove('active-region'));
        
        // Возвращаем все города
        document.querySelectorAll(".city-group").forEach(city => {
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

// Перерасчет суммы баллов
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

// Инициализация стартового предмета при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    addEgeSubject();
});
