// js/modules/court.js
/**
 * Модуль управления SVG площадкой
 */
export class CourtManager {
    constructor(svgElement) {
        this.svg = svgElement;
        this.isHalfCourt = false;
        this.viewBox = { x: 0, y: 0, w: 150, h: 280 };
        this.zoom = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        
        // Инициализация
        this.setFullCourt();
    }

    setFullCourt() {
        this.isHalfCourt = false;
        this.svg.setAttribute('viewBox', '0 0 150 280');
        this.svg.classList.remove('half-court');
        this.svg.classList.add('full-court');
    }

    setHalfCourt() {
        this.isHalfCourt = true;
        this.svg.setAttribute('viewBox', '0 0 150 140');
        this.svg.classList.add('half-court');
        this.svg.classList.remove('full-court');
    }

    toggleCourt() {
        if (this.isHalfCourt) {
            this.setFullCourt();
        } else {
            this.setHalfCourt();
        }
        return !this.isHalfCourt;
    }

    /**
     * Получить точку на SVG из события мыши/тача
     */
    getSVGPoint(clientX, clientY) {
        const rect = this.svg.getBoundingClientRect();
        const vBox = this.svg.viewBox.animVal;
        
        const x = ((clientX - rect.left) / rect.width) * vBox.width;
        const y = ((clientY - rect.top) / rect.height) * vBox.height;
        
        return { x, y };
    }

    /**
     * Получить точку через SVG API (для корректного transform)
     */
    getSVGPointTransformed(clientX, clientY) {
        const point = this.svg.createSVGPoint();
        point.x = clientX;
        point.y = clientY;
        return point.matrixTransform(this.svg.getScreenCTM().inverse());
    }

    /**
     * Zoom пальцами (pinch)
     */
    applyPinchZoom(scale, centerX, centerY) {
        const oldZoom = this.zoom;
        this.zoom = Math.max(0.5, Math.min(3, this.zoom * scale));
        
        const vBox = this.svg.viewBox.animVal;
        const centerSVG = this.getSVGPoint(centerX, centerY);
        
        const newW = vBox.width * (oldZoom / this.zoom);
        const newH = vBox.height * (oldZoom / this.zoom);
        
        const newX = centerSVG.x - (centerSVG.x - vBox.x) * (newW / vBox.width);
        const newY = centerSVG.y - (centerSVG.y - vBox.y) * (newH / vBox.height);
        
        this.svg.setAttribute('viewBox', `${newX} ${newY} ${newW} ${newH}`);
    }

    /**
     * Перетаскивание площадки (pan)
     */
    applyPan(dx, dy) {
        const vBox = this.svg.viewBox.animVal;
        this.svg.setAttribute('viewBox', 
            `${vBox.x - dx} ${vBox.y - dy} ${vBox.width} ${vBox.height}`);
    }

    /**
     * Сбросить zoom/pan
     */
    resetView() {
        if (this.isHalfCourt) {
            this.svg.setAttribute('viewBox', '0 0 150 140');
        } else {
            this.svg.setAttribute('viewBox', '0 0 150 280');
        }
        this.zoom = 1;
    }

    /**
     * Получить SVG элемент инстанс
     */
    getSVG() {
        return this.svg;
    }

    /**
     * Получить слои
     */
    getLayers() {
        return {
            players: document.getElementById('players-layer'),
            drawing: document.getElementById('drawing-layer'),
            animation: document.getElementById('animation-layer'),
            elements: document.getElementById('court-elements')
        };
    }
}