document.addEventListener('DOMContentLoaded', () => {
    // Создаем элемент курсора
    const cursor = document.createElement('div');
    cursor.classList.add('custom-cursor');
    document.body.appendChild(cursor);

    let mouseX = 0;
    let mouseY = 0;
    let cursorX = 0;
    let cursorY = 0;
    let isHovering = false;
    let magneticOffset = { x: 0, y: 0 };
    let currentScale = 1;

    // Плавное движение курсора с использованием lerp
    function lerp(start, end, t) {
        return start * (1 - t) + end * t;
    }

    // Магнитный эффект
    function getMagneticOffset(element) {
        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const distance = Math.sqrt(
            Math.pow(mouseX - centerX, 2) + 
            Math.pow(mouseY - centerY, 2)
        );

        const maxDistance = Math.sqrt(
            Math.pow(rect.width / 2, 2) + 
            Math.pow(rect.height / 2, 2)
        );

        const strength = Math.max(0, 1 - distance / maxDistance);
        const offset = 30 * strength;

        return {
            x: (centerX - mouseX) * strength * 0.2,
            y: (centerY - mouseY) * strength * 0.2
        };
    }

    function animateCursor() {
        // Применяем магнитный эффект
        if (isHovering) {
            const target = document.elementFromPoint(mouseX, mouseY);
            if (target) {
                const offset = getMagneticOffset(target);
                magneticOffset.x = lerp(magneticOffset.x, offset.x, 0.2);
                magneticOffset.y = lerp(magneticOffset.y, offset.y, 0.2);
            }
        } else {
            magneticOffset.x = lerp(magneticOffset.x, 0, 0.2);
            magneticOffset.y = lerp(magneticOffset.y, 0, 0.2);
        }

        // Плавное движение курсора
        cursorX = lerp(cursorX, mouseX + magneticOffset.x, 0.2);
        cursorY = lerp(cursorY, mouseY + magneticOffset.y, 0.2);

        cursor.style.left = cursorX + 'px';
        cursor.style.top = cursorY + 'px';
        cursor.style.transform = `translate(-50%, -50%) scale(${currentScale})`;

        requestAnimationFrame(animateCursor);
    }

    // Обновляем позицию курсора
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    // Добавляем эффект при наведении на интерактивные элементы
    const interactiveElements = document.querySelectorAll('a, button, .poem, .minimap-cell, .scroll-to-top');
    
    interactiveElements.forEach(el => {
        el.addEventListener('mouseenter', () => {
            isHovering = true;
            cursor.classList.add('hover');
            currentScale = 1.2;
        });
        
        el.addEventListener('mouseleave', () => {
            isHovering = false;
            cursor.classList.remove('hover');
            currentScale = 1;
        });
    });

    // Скрываем курсор, когда мышь покидает окно
    document.addEventListener('mouseleave', () => {
        cursor.style.display = 'none';
    });

    document.addEventListener('mouseenter', () => {
        cursor.style.display = 'block';
    });

    // Добавляем эффект при клике
    document.addEventListener('mousedown', () => {
        cursor.classList.add('click');
        currentScale = 0.8;
    });

    document.addEventListener('mouseup', () => {
        cursor.classList.remove('click');
        currentScale = isHovering ? 1.2 : 1;
    });

    // Добавляем эффект при движении
    let lastX = 0;
    let lastY = 0;
    let velocity = 0;

    document.addEventListener('mousemove', (e) => {
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        velocity = Math.sqrt(dx * dx + dy * dy);
        
        if (velocity > 10) {
            cursor.classList.add('moving');
        } else {
            cursor.classList.remove('moving');
        }
        
        lastX = e.clientX;
        lastY = e.clientY;
    });

    // Запускаем анимацию
    animateCursor();
}); 