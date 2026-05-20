// js/modules/touch.js
/**
 * Модуль обработки мультитач жестов (pinch-to-zoom, pan, swipe)
 */
export class TouchManager {
    constructor(courtManager, options = {}) {
        this.court = courtManager;
        this.svg = courtManager.getSVG();
        
        // Настройки
        this.pinchEnabled = options.pinchEnabled !== false;
        this.panEnabled = options.panEnabled !== false;
        this.swipeEnabled = options.swipeEnabled !== false;
        this.onSwipe = options.onSwipe || null; // callback для свайпа по табам
        
        // Состояние тача
        this.touches = {};
        this.lastPinchDist = 0;
        this.lastTouchCenter = null;
        this.isPanning = false;
        this.panStart = null;
        this.swipeStartX = 0;
        this.swipeStartY = 0;
        this.swipeStartTime = 0;
        this.minSwipeDistance = 50;
        this.maxSwipeTime = 300;
        
        // Привязываем события
        this._bindEvents();
    }

    _bindEvents() {
        this.svg.addEventListener('touchstart', this._onTouchStart.bind(this), { passive: false });
        this.svg.addEventListener('touchmove', this._onTouchMove.bind(this), { passive: false });
        this.svg.addEventListener('touchend', this._onTouchEnd.bind(this), { passive: false });
    }

    _onTouchStart(e) {
        const touches = e.touches;
        
        // Сохраняем информацию о касаниях
        for (let i = 0; i < touches.length; i++) {
            const touch = touches[i];
            this.touches[touch.identifier] = {
                x: touch.clientX,
                y: touch.clientY,
                startX: touch.clientX,
                startY: touch.clientY
            };
        }

        if (touches.length === 1 && this.swipeEnabled) {
            // Начало возможного свайпа или пана
            this.swipeStartX = touches[0].clientX;
            this.swipeStartY = touches[0].clientY;
            this.swipeStartTime = Date.now();
            this.isPanning = true;
            this.panStart = this.court.getSVGPoint(touches[0].clientX, touches[0].clientY);
        }

        if (touches.length === 2 && this.pinchEnabled) {
            // Начало пинч-зума
            this.isPanning = false;
            this.lastPinchDist = this._getPinchDistance(touches);
            this.lastTouchCenter = this._getTouchCenter(touches);
        }
    }

    _onTouchMove(e) {
        const touches = e.touches;

        // Обновляем позиции касаний
        for (let i = 0; i < touches.length; i++) {
            const touch = touches[i];
            if (this.touches[touch.identifier]) {
                this.touches[touch.identifier].x = touch.clientX;
                this.touches[touch.identifier].y = touch.clientY;
            }
        }

        if (touches.length === 1 && this.isPanning && this.panEnabled) {
            e.preventDefault();
            const dx = touches[0].clientX - this.swipeStartX;
            const dy = touches[0].clientY - this.swipeStartY;
            
            // Если движение значительное, применяем pan
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
                this.court.applyPan(dx * 0.1, dy * 0.1);
                this.swipeStartX = touches[0].clientX;
                this.swipeStartY = touches[0].clientY;
            }
        }

        if (touches.length === 2 && this.pinchEnabled) {
            e.preventDefault();
            const dist = this._getPinchDistance(touches);
            
            if (this.lastPinchDist > 0) {
                const scale = dist / this.lastPinchDist;
                const center = this._getTouchCenter(touches);
                this.court.applyPinchZoom(scale, center.x, center.y);
            }
            
            this.lastPinchDist = dist;
            this.lastTouchCenter = this._getTouchCenter(touches);
        }
    }

    _onTouchEnd(e) {
        // Удаляем завершенные касания
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            delete this.touches[touch.identifier];
        }

        // Если не осталось касаний
        if (e.touches.length === 0) {
            // Проверяем, был ли это свайп
            if (this.swipeEnabled && this.isPanning) {
                const dt = Date.now() - this.swipeStartTime;
                if (dt < this.maxSwipeTime) {
                    // Свайп только если был быстрый жест
                    // Обработчик свайпа вызывается из App при клике по табам
                }
            }
            
            this.isPanning = false;
            this.lastPinchDist = 0;
            this.lastTouchCenter = null;
        }
        
        // Если осталось одно касание после двух
        if (e.touches.length === 1) {
            this.lastPinchDist = 0;
        }
    }

    _getPinchDistance(touches) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    _getTouchCenter(touches) {
        return {
            x: (touches[0].clientX + touches[1].clientX) / 2,
            y: (touches[0].clientY + touches[1].clientY) / 2
        };
    }

    /**
     * Сбросить все состояния
     */
    reset() {
        this.touches = {};
        this.lastPinchDist = 0;
        this.lastTouchCenter = null;
        this.isPanning = false;
        this.panStart = null;
    }
}