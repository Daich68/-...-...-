class PoemRenderer {
    constructor() {
        this.container = document.getElementById('poems-container');
        this.loadingIndicator = document.querySelector('.loading-indicator');
        this.scrollToTopBtn = document.getElementById('scroll-to-top');
        this.poems = [];
        this.currentPage = 1;
        this.poemsPerPage = 1;
        this.isLoading = false;

        // Карта как граф
        this.nodes = [];
        this.currentNodeId = 0;
        this.currentLevel = 0;
        this.minimap = document.getElementById('minimap');

        // Отключаем автопрокрутку
        this.shouldAutoScroll = false;

        // Размер карты
        this.mapWidth = 19;
        this.mapHeight = 19;

        // Добавляем новые свойства для анимаций
        this.isAnimating = false;
        this.animationDuration = 800;
        this.lastScrollTime = 0;
        this.scrollCooldown = 500;
        
        // Текущая позиция
        this.currentPos = { x: 0, y: 0 };
        this.visitedPositions = []; // Сохраняем посещенные позиции на миникарте
        
        // Оптимизация производительности
        this.animationFrame = null;
        this.lastUpdateTime = 0;
        this.updateInterval = 1000 / 60; // 60 FPS

        // Инициализация доски Го для фона
        this.goBoard = null;
        this.isReadingPoem = false;
        this.lastReadPoemIndex = 0; // Для отслеживания прогресса чтения
        this.initGoBoard();

        this.setupScrollToTop();
        this.setupScrollHandling();
        this.setupMovement();
        this.setupMinimap();
        this.setupMovementHint();
        this.setupScrollListeners();
    }

    async init() {
        try {
            const response = await fetch('poems.json');
            const data = await response.json();
            this.poems = data.poems;
            this.setupMap();
            this.renderPoems();
            this.setupInfiniteScroll();
            this.hideLoading();
            // Показываем доску Го с эстетичным узором
            this.showGoBoard();
        } catch (error) {
            console.error('Error loading poems:', error);
            this.showError();
        }
    }

    scrollToFirstSection() {
        const poemsSection = document.getElementById('poems-section');
        if (poemsSection) {
            poemsSection.scrollIntoView({ behavior: 'smooth' });
        }
    }

    setupMap() {
        this.nodes = [];
        const numPoems = this.poems.length;

        let grid = Array(this.mapHeight).fill().map(() => Array(this.mapWidth).fill(null));
        let nodeId = 0;
        let poemIndex = 0;

        for (let i = 0; i < Math.min(numPoems, this.mapWidth * this.mapHeight); i++) {
            let x, y;
            let placed = false;

            while (!placed && poemIndex < numPoems) {
                x = Math.floor(Math.random() * this.mapWidth);
                y = Math.floor(Math.random() * this.mapHeight);
                if (grid[y][x] === null) {
                    const level = 0;
                    grid[y][x] = nodeId;
                    this.nodes.push({
                        id: nodeId,
                        poemIndex: poemIndex,
                        level: level,
                        x: x,
                        y: y
                    });
                    placed = true;
                    nodeId++;
                    poemIndex++;
                }
            }
        }

        this.currentNodeId = this.nodes.length > 0 ? this.nodes[0].id : 0;
        this.currentLevel = 0;
        if (this.nodes.length > 0) {
            this.currentPos = { x: this.nodes[0].x, y: this.nodes[0].y };
        }
        this.setupMinimap();
        this.updateCurrentSection();
    }

    setupMinimap() {
        this.minimap.innerHTML = '';
        this.minimap.style.display = 'grid';

        const levelNodes = this.nodes.filter(node => node.level === this.currentLevel);
        if (levelNodes.length === 0) {
            this.minimap.style.display = 'none';
            return;
        }

        const width = this.mapWidth;
        const height = this.mapHeight;

        this.minimap.style.gridTemplateRows = `repeat(${height}, 1fr)`;
        this.minimap.style.gridTemplateColumns = `repeat(${width}, 1fr)`;

        const grid = Array(height).fill().map(() => Array(width).fill(null));
        levelNodes.forEach(node => {
            if (node.x >= 0 && node.x < width && node.y >= 0 && node.y < height) {
                grid[node.y][node.x] = node;
            }
        });

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const cell = document.createElement('div');
                cell.className = 'minimap-cell';
                const node = grid[y][x];
                
                if (!node) {
                    cell.classList.add('empty');
                } else {
                    if (node.id === this.currentNodeId) {
                        cell.classList.add('current');
                    }
                    const poem = this.poems[node.poemIndex];
                    if (poem) {
                        cell.title = poem.title;
                    }
                }
                
                this.minimap.appendChild(cell);
            }
        }

        this.updateMinimapPosition(this.currentPos.x, this.currentPos.y);
    }

    setupMovementHint() {
        const hint = document.createElement('div');
        hint.className = 'movement-hint';
        document.body.appendChild(hint);
    }

    setupMovement() {
        const step = 0.5;

        window.addEventListener('keydown', (e) => {
            if (this.isAnimating) return;

            let moved = false;
            let targetX = this.currentPos.x;
            let targetY = this.currentPos.y;

            switch (e.key) {
                case 'ArrowUp':
                case 'w':
                case 'W':
                    targetY = Math.max(0, this.currentPos.y - step);
                    moved = true;
                    break;
                case 'ArrowDown':
                case 's':
                case 'S':
                    targetY = Math.min(this.mapHeight - 1, this.currentPos.y + step);
                    moved = true;
                    break;
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    targetX = Math.max(0, this.currentPos.x - step);
                    moved = true;
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    targetX = Math.min(this.mapWidth - 1, this.currentPos.x + step);
                    moved = true;
                    break;
                case 'Enter':
                    const nearestNode = this.findNearestNode(this.currentPos.x, this.currentPos.y);
                    if (nearestNode) {
                        this.currentNodeId = nearestNode.id;
                        this.animateMovement(this.currentPos, { x: nearestNode.x, y: nearestNode.y });
                        this.currentPos = { x: nearestNode.x, y: nearestNode.y };
                    }
                    return;
                default:
                    return;
            }

            if (moved) {
                e.preventDefault();
                this.animateMovement(this.currentPos, { x: targetX, y: targetY });
                this.currentPos = { x: targetX, y: targetY };
            }
        });

        this.minimap.addEventListener('click', (e) => {
            if (this.isAnimating) return;

            const rect = this.minimap.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const gridX = (x / rect.width) * this.mapWidth;
            const gridY = (y / rect.height) * this.mapHeight;

            this.animateMovement(this.currentPos, { x: gridX, y: gridY });
            this.currentPos = { x: gridX, y: gridY };
        });
    }

    animateMovement(fromPos, toPos) {
        if (this.isAnimating) return;

        this.isAnimating = true;
        const startTime = performance.now();

        const currentSection = document.querySelector('.poem-container');
        if (currentSection) {
            currentSection.classList.add('moving');
        }

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / this.animationDuration, 1);

            const easedProgress = this.easeInOutCubic(progress);

            const currentX = fromPos.x + (toPos.x - fromPos.x) * easedProgress;
            const currentY = fromPos.y + (toPos.y - fromPos.y) * easedProgress;

            this.updateMinimapPosition(currentX, currentY);

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.isAnimating = false;
                if (currentSection) {
                    currentSection.classList.remove('moving');
                }
                
                
                this.addVisitedPosition(toPos);
                
                const nearestNode = this.findNearestNode(toPos.x, toPos.y);
                if (nearestNode) {
                    this.currentNodeId = nearestNode.id;
                    this.updateCurrentSection();
                }
            }
        };

        requestAnimationFrame(animate);
    }
    
    // Добавляем позицию в список посещенных
    addVisitedPosition(pos) {
        // Проверяем, что позиция еще не была посещена
        const isAlreadyVisited = this.visitedPositions.some(visitedPos => {
            return Math.floor(visitedPos.x) === Math.floor(pos.x) && 
                   Math.floor(visitedPos.y) === Math.floor(pos.y);
        });
        
        if (!isAlreadyVisited) {
            this.visitedPositions.push({...pos});
            
            // Если мы не читаем стихотворение, обновляем доску
            if (!this.isReadingPoem && this.goBoard) {
                // Добавляем новый камень на доску
                const color = this.visitedPositions.length % 2 === 0 ? 'black' : 'white';
                this.goBoard.addStone(Math.floor(pos.x), Math.floor(pos.y), color);
            }
        }
    }

    updateMinimapPosition(x, y) {
        const cells = this.minimap.querySelectorAll('.minimap-cell');
        cells.forEach(cell => cell.classList.remove('current'));

        const cellIndex = Math.floor(y) * this.mapWidth + Math.floor(x);
        if (cells[cellIndex]) {
            cells[cellIndex].classList.add('current');
        }
    }

    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    findNearestNode(x, y) {
        let nearestNode = null;
        let minDistance = Infinity;

        this.nodes.forEach(node => {
            const distance = Math.sqrt(
                Math.pow(node.x - x, 2) + 
                Math.pow(node.y - y, 2)
            );

            if (distance < minDistance) {
                minDistance = distance;
                nearestNode = node;
            }
        });

        return nearestNode;
    }

    updateCurrentSection() {
        const currentNode = this.nodes.find(node => node.id === this.currentNodeId);
        if (!currentNode) {
            console.warn("No current node found for ID:", this.currentNodeId);
            return;
        }

        const sections = Array.from(document.querySelectorAll('.poem-container'));
        const currentSection = sections[this.currentLevel];

        if (currentSection && currentNode) {
            const poemIndex = currentNode.poemIndex;
            if (poemIndex !== null && poemIndex < this.poems.length) {
                const poem = this.poems[poemIndex];
                const newPoemElement = this.createPoemElement(poem);

                currentSection.innerHTML = '';
                currentSection.appendChild(newPoemElement);

                // Добавляем небольшую задержку перед настройкой взаимодействия
                setTimeout(() => {
                    this.setupPoemInteraction();
                }, 100);
            } else {
                currentSection.innerHTML = '<p class="empty-message korean-text">여기엔 아무것도 없어요...</p>';
            }
        }
    }

    createPoemElement(poem) {
        const article = document.createElement('article');
        article.className = `poem-container ${poem.layout}-layout`;
        
        // Разбиваем контент на страницы
        const linesPerPage = 10; // Уменьшаем количество строк для лучшего центрирования
        const pages = [];
        for (let i = 0; i < poem.content.length; i += linesPerPage) {
            pages.push(poem.content.slice(i, i + linesPerPage));
        }
        
        article.innerHTML = `
            <div class="poem" data-poem-id="${poem.id}" data-lang="ru">
                <h2 class="poem-title">${poem.title}</h2>
                <div class="poem-content">
                    ${pages.map((page, index) => `
                        <div class="poem-page ${index === 0 ? 'active' : ''}" data-page="${index}">
                            ${page.map(line => `<p>${line}</p>`).join('')}
                        </div>
                    `).join('')}
                </div>
                <div class="poem-info">
                    <div class="poet-info">
                        <span class="poet-name">— ${poem.author}</span>
                        <span class="poem-date">${poem.date}</span>
                    </div>
                </div>
                <div class="poem-tags">
                    ${poem.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
                ${pages.length > 1 ? `
                    <div class="page-indicators">
                        ${Array.from({length: pages.length}, (_, i) => `
                            <div class="page-dot ${i === 0 ? 'active' : ''}" data-page="${i+1}/${pages.length}"></div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;

        const poemElement = article.querySelector('.poem');
        poemElement.addEventListener('click', () => this.togglePoemLanguage(poem, poemElement));

        // Добавляем обработчики для новой системы навигации
        if (pages.length > 1) {
            const pageDots = article.querySelectorAll('.page-dot');
            let currentPage = 0;

            const updatePage = (page) => {
                const pages = article.querySelectorAll('.poem-page');
                
                // Скрываем все страницы с плавной анимацией
                pages.forEach(p => {
                    p.style.display = 'none';
                    p.classList.remove('active');
                });
                
                // Показываем нужную страницу
                const nextPageElement = pages[page];
                nextPageElement.style.display = 'flex';
                nextPageElement.classList.add('active');
                
                // Обновляем индикаторы страниц
                pageDots.forEach((dot, index) => {
                    if (index === page) {
                        dot.classList.add('active');
                    } else {
                        dot.classList.remove('active');
                    }
                });
                
                // Обновляем текущую страницу
                currentPage = page;
            };

            // Обработчики для точек навигации
            pageDots.forEach((dot, index) => {
                dot.addEventListener('click', (e) => {
                    e.stopPropagation();
                    updatePage(index);
                });
            });

            // Добавляем поддержку клавиатуры
            const handleKeyPress = (e) => {
                if (e.key === 'ArrowLeft' && currentPage > 0) {
                    currentPage--;
                    updatePage(currentPage);
                } else if (e.key === 'ArrowRight' && currentPage < pages.length - 1) {
                    currentPage++;
                    updatePage(currentPage);
                }
            };

            // Добавляем и удаляем обработчик клавиатуры при фокусе
            poemElement.addEventListener('focus', () => {
                document.addEventListener('keydown', handleKeyPress);
            });

            poemElement.addEventListener('blur', () => {
                document.removeEventListener('keydown', handleKeyPress);
            });

            // Улучшенная поддержка свайпов для мобильных устройств
            let touchStartX = 0;
            let touchEndX = 0;
            let touchStartY = 0;
            let touchEndY = 0;

            poemElement.addEventListener('touchstart', (e) => {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
            });

            poemElement.addEventListener('touchend', (e) => {
                touchEndX = e.changedTouches[0].clientX;
                touchEndY = e.changedTouches[0].clientY;
                const diffX = touchStartX - touchEndX;
                const diffY = touchStartY - touchEndY;
                
                // Проверяем, что свайп был преимущественно горизонтальным
                if (Math.abs(diffX) > Math.abs(diffY) * 2) {
                    // Определяем направление свайпа (право/лево) с плавной анимацией
                    if (diffX > 50 && currentPage < pages.length - 1) { // Свайп влево
                        currentPage++;
                        updatePage(currentPage);
                    } else if (diffX < -50 && currentPage > 0) { // Свайп вправо
                        currentPage--;
                        updatePage(currentPage);
                    }
                }
            });
        }

        return article;
    }

    togglePoemLanguage(poem, element) {
        const isRussian = element.getAttribute('data-lang') === 'ru';
        
        const newTitle = isRussian ? poem.titleKo : poem.title;
        const newContent = isRussian ? poem.contentKo : poem.content;
        
        // Разбиваем контент на страницы
        const linesPerPage = 8;
        const pages = [];
        for (let i = 0; i < newContent.length; i += linesPerPage) {
            pages.push(newContent.slice(i, i + linesPerPage));
        }
        
        element.setAttribute('data-lang', isRussian ? 'ko' : 'ru');
        element.querySelector('.poem-title').textContent = newTitle;
        
        const poemContent = element.querySelector('.poem-content');
        poemContent.innerHTML = pages.map((page, index) => `
            <div class="poem-page ${index === 0 ? 'active' : ''}" data-page="${index}">
                ${page.map(line => `<p>${line}</p>`).join('')}
            </div>
        `).join('');

        // Обновляем пагинацию
        if (pages.length > 1) {
            const paginationControls = element.querySelector('.pagination-controls');
            if (!paginationControls) {
                const controls = document.createElement('div');
                controls.className = 'pagination-controls';
                controls.innerHTML = `
                    <button class="pagination-button prev-page">←</button>
                    <span class="page-info">1 / ${pages.length}</span>
                    <button class="pagination-button next-page">→</button>
                `;
                element.appendChild(controls);

                // Добавляем обработчики для новой пагинации
                const prevButton = controls.querySelector('.prev-page');
                const nextButton = controls.querySelector('.next-page');
                const pageInfo = controls.querySelector('.page-info');
                let currentPage = 0;

                const updatePage = (page) => {
                    const pages = element.querySelectorAll('.poem-page');
                    pages.forEach(p => p.classList.remove('active'));
                    pages[page].classList.add('active');
                    pageInfo.textContent = `${page + 1} / ${pages.length}`;
                    prevButton.disabled = page === 0;
                    nextButton.disabled = page === pages.length - 1;
                };

                prevButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (currentPage > 0) {
                        currentPage--;
                        updatePage(currentPage);
                    }
                });

                nextButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (currentPage < pages.length - 1) {
                        currentPage++;
                        updatePage(currentPage);
                    }
                });
            }
        }
    }

    renderPoems(append = false) {
        const start = (this.currentPage - 1) * this.poemsPerPage;
        const end = start + this.poemsPerPage;
        const poemsToRender = this.poems.slice(start, end);

        if (!append) {
            this.container.innerHTML = '';
        }

        const fragment = document.createDocumentFragment();

        poemsToRender.forEach(poem => {
            const poemElement = this.createPoemElement(poem);
            fragment.appendChild(poemElement);
        });

        this.container.appendChild(fragment);
        this.updateCurrentLevel();
    }

    setupInfiniteScroll() {
        window.addEventListener('scroll', () => {
            if (this.isLoading) return;

            const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
            if (scrollTop + clientHeight >= scrollHeight - 500) {
                this.loadMorePoems();
            }
            this.updateCurrentLevel();
        });
    }

    initGoBoard() {
        // Инициализация доски Го
        if (window.GoBoard) {
            this.goBoard = new GoBoard('canvas-container', this.mapWidth, this.mapHeight);
            // Изначально скрываем доску
            if (this.goBoard.canvas) {
                this.goBoard.canvas.style.opacity = 0;
            }
        }
    }

    showGoBoard() {
        if (this.goBoard) {
            // Создаем узор на доске на основе посещенных позиций на миникарте
            this.goBoard.clearStones();
            
            // Добавляем камни на основе посещенных позиций
            if (this.visitedPositions.length > 0) {
                // Добавляем камни для каждой посещенной позиции
                this.visitedPositions.forEach((pos, index) => {
                    // Чередуем черные и белые камни
                    const color = index % 2 === 0 ? 'black' : 'white';
                    // Преобразуем координаты в целые числа для доски
                    const x = Math.floor(pos.x);
                    const y = Math.floor(pos.y);
                    this.goBoard.addStone(x, y, color);
                });
            } else {
                // Если нет посещенных позиций, используем прогресс чтения
                const readingProgress = this.calculateReadingProgress();
                this.goBoard.createPositionBasedPattern(readingProgress);
            }
            
            // Плавно показываем доску
            this.goBoard.fadeIn(1500);
        }
    }

    hideGoBoard() {
        if (this.goBoard) {
            this.goBoard.fadeOut(800);
        }
    }
    
    // Вычисляем прогресс чтения на основе прочитанных стихотворений
    calculateReadingProgress() {
        // Если нет стихотворений, возвращаем 0
        if (!this.poems || this.poems.length === 0) return 0;
        
        // Если не было прочитано ни одного стихотворения, возвращаем 0
        if (!this.lastReadPoemIndex) return 0;
        
        // Вычисляем прогресс как отношение прочитанных стихотворений к общему количеству
        const progress = Math.min(this.lastReadPoemIndex / this.poems.length, 1);
        return progress;
    }
    setupScrollListeners() {
        window.addEventListener('scroll', () => {
            // Определяем, находимся ли мы в заголовке или в разделе стихотворений
            const headerSection = document.getElementById('header-section');
            const headerRect = headerSection.getBoundingClientRect();
            const isAtHeader = headerRect.top <= 0 && headerRect.bottom > 0;
            
            // Определяем, находимся ли мы на разделе со стихами
            const poemsSection = document.getElementById('poems-section');
            const poemsSectionRect = poemsSection.getBoundingClientRect();
            const isAtPoemsSection = poemsSectionRect.top <= window.innerHeight / 2 && poemsSectionRect.bottom >= window.innerHeight / 2;
            
            // Если пользователь вернулся к заголовку после чтения стихотворения
            if (isAtHeader && this.isReadingPoem) {
                this.isReadingPoem = false;
                this.showGoBoard();
            }
            
            // Если пользователь начал читать стихотворение
            if (isAtPoemsSection && !this.isReadingPoem) {
                this.isReadingPoem = true;
                this.hideGoBoard();
            }
        });
    }

    async loadMorePoems() {
        if (this.currentPage * this.poemsPerPage >= this.poems.length) return;

        this.isLoading = true;
        this.showLoading();

        await new Promise(resolve => setTimeout(resolve, 1000));

        this.currentPage++;
        this.renderPoems(true);
        this.isLoading = false;
        this.hideLoading();

        this.setupMap();
        this.updateCurrentLevel();
    }

    updateCurrentLevel() {
        const headerSection = document.getElementById('header-section');
        const poemsSection = document.getElementById('poems-section');
        
        const headerRect = headerSection.getBoundingClientRect();
        const poemsSectionRect = poemsSection.getBoundingClientRect();
        
        let newLevel = 0;
        
        if (poemsSectionRect.top <= 50 && poemsSectionRect.bottom > 50) {
            newLevel = 1;
        }
        
        if (newLevel !== this.currentLevel) {
            this.currentLevel = newLevel;
            const levelNodes = this.nodes.filter(node => node.level === this.currentLevel);
            if (levelNodes.length > 0) {
                this.currentNodeId = levelNodes[0].id;
                this.currentPos = { x: levelNodes[0].x, y: levelNodes[0].y };
            }
            this.setupMinimap();
            this.updateCurrentSection();
        }
    }

    showLoading() {
        this.loadingIndicator.style.display = 'block';
    }

    hideLoading() {
        this.loadingIndicator.style.display = 'none';
    }

    showError() {
        this.container.innerHTML = `
            <div class="error-message korean-text">
                <p>시를 불러오는 데 실패했습니다. 나중에 다시 시도해주세요.</p>
            </div>
        `;
    }

    setupScrollToTop() {
        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset || document.documentElement.scrollTop;
            if (scrolled > window.innerHeight) {
                this.scrollToTopBtn.classList.add('visible');
            } else {
                this.scrollToTopBtn.classList.remove('visible');
            }
        });

        this.scrollToTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    setupScrollHandling() {
        // Удаляем обработку прокрутки колесиком мыши для свободной прокрутки
        // Пользователь может свободно прокручивать страницу
    }

    handleScroll(e) {
        // Удаляем обработчик прокрутки для свободной навигации
        // Теперь пользователь может прокручивать страницу без ограничений
    }

    setupPoemInteraction() {
        const poemContent = document.querySelector('.poem-content');
        if (!poemContent) return;

        // Удаляем блокировку прокрутки внутри стихотворений
        // для свободной навигации
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const poemRenderer = new PoemRenderer();
    poemRenderer.init();
});