// js/modules/drawing.js
import { drawingConfig, MIN_LINE_LENGTH } from './config.js';

/**
 * Модуль инструментов рисования
 */
export class DrawingManager {
    constructor(layers, courtManager) {
        this.layers = layers;
        this.court = courtManager;
        this.drawings = [];
        this.drawingCounter = 0;
        this.currentDrawingType = null;
        
        this.isDrawing = false;
        this.currentPath = null;
        this.startPoint = null;
        this.wavyPoints = [];
        
        this.currentTool = null;
        this.onHistoryChange = null;
        this.onDrawingContinue = null; // колбэк для захвата промежуточных позиций при рисовании
        this._continueThrottle = 0;
    }

    setTool(tool, type) {
        this.currentTool = tool;
        this.currentDrawingType = type;
    }

    /**
     * Обработчик начала рисования
     */
    startDrawing(point) {
        if (!this.currentTool && this.currentTool !== 'drawing' && this.currentDrawingType !== 'eraser') return;
        if (this.currentDrawingType === 'eraser') {
            this._startEraser(point);
            return;
        }
        if (this.currentTool !== 'drawing') return;

        this.startPoint = point;
        this.isDrawing = true;

        // Бросок - просто клик (точка)
        if (this.currentDrawingType === 'shot') {
            this._drawShotPoint(point);
            this.isDrawing = false;
            this.startPoint = null;
            return;
        }

        if (this.currentDrawingType === 'wavy') {
            this._startWavyLine(point);
        } else if (this.currentDrawingType === 'screen') {
            this._startScreen(point);
        } else {
            this._startStraightLine(point);
        }
    }

    /**
     * Продолжение рисования
     */
    continueDrawing(point) {
        if (!this.isDrawing || !this.currentPath) return;

        if (this.currentDrawingType === 'eraser') {
            this._continueEraser(point);
            return;
        }

        if (this.currentDrawingType === 'wavy') {
            this._continueWavyLine(point);
        } else if (this.currentDrawingType === 'screen') {
            this._continueScreen(point);
        } else {
            this._continueStraightLine(point);
        }

        // Колбэк для захвата промежуточных позиций при рисовании (throttle ~100ms)
        const now = Date.now();
        if (this.onDrawingContinue && now - this._continueThrottle > 80) {
            this._continueThrottle = now;
            this.onDrawingContinue();
        }
    }

    /**
     * Завершение рисования
     */
    endDrawing(point) {
        if (!this.isDrawing) return;

        if (this.currentDrawingType === 'eraser') {
            this._endEraser();
            return;
        }
        if (this.currentTool !== 'drawing') return;

        if (this.currentDrawingType === 'wavy') {
            this._endWavyLine(point);
        } else if (this.currentDrawingType === 'screen') {
            this._endScreen(point);
        } else if (this.currentDrawingType === 'rebound') {
            this._endRebound(point);
        } else {
            this._endStraightLine(point);
        }

        this.isDrawing = false;
        this.currentPath = null;
        this.startPoint = null;
        this.wavyPoints = [];
    }

    /**
     * Бросок - крестик по клику
     */
    _drawShotPoint(point) {
        const shotData = this._createShot(point);
        if (!shotData) return;

        this.layers.drawing.appendChild(shotData.element);
        const drawingData = {
            id: `drawing-${this.drawingCounter}`,
            type: 'shot',
            element: shotData.element,
            points: shotData.points
        };
        this.drawings.push(drawingData);

        if (this.onHistoryChange) {
            this.onHistoryChange({
                type: 'add_drawing',
                drawing: drawingData
            });
        }
    }

    // === Экран (заслон) ===
    _startScreen(point) {
        // Создаем временную линию для предпросмотра
        this.drawingCounter++;
        const config = drawingConfig.screen;
        
        this.currentPath = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        this.currentPath.setAttribute('x1', point.x);
        this.currentPath.setAttribute('y1', point.y);
        this.currentPath.setAttribute('x2', point.x);
        this.currentPath.setAttribute('y2', point.y);
        this.currentPath.setAttribute('stroke', config.color);
        this.currentPath.setAttribute('stroke-width', config.strokeWidth);
        this.currentPath.setAttribute('stroke-linecap', 'round');
        this.currentPath.setAttribute('class', 'drawing-element screen-element');
        this.currentPath.setAttribute('id', `drawing-${this.drawingCounter}`);
        
        this.layers.drawing.appendChild(this.currentPath);
    }

    _continueScreen(point) {
        if (!this.currentPath || !this.startPoint) return;
        
        // Показываем направление движения для экрана
        const dx = point.x - this.startPoint.x;
        const dy = point.y - this.startPoint.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        if (length < 1) return;
        
        // Нормализуем и поворачиваем на 90 градусов
        const nx = -dy / length;
        const ny = dx / length;
        
        const screenLength = 6;
        const halfScreen = screenLength / 2;
        
        const x1 = this.startPoint.x + nx * halfScreen;
        const y1 = this.startPoint.y + ny * halfScreen;
        const x2 = this.startPoint.x - nx * halfScreen;
        const y2 = this.startPoint.y - ny * halfScreen;
        
        this.currentPath.setAttribute('x1', x1);
        this.currentPath.setAttribute('y1', y1);
        this.currentPath.setAttribute('x2', x2);
        this.currentPath.setAttribute('y2', y2);
    }

    _endScreen(point) {
        if (!this.currentPath || !this.startPoint) {
            if (this.currentPath && this.currentPath.parentNode) {
                this.layers.drawing.removeChild(this.currentPath);
            }
            return;
        }
        
        const dx = point.x - this.startPoint.x;
        const dy = point.y - this.startPoint.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        if (length < MIN_LINE_LENGTH) {
            if (this.currentPath.parentNode) {
                this.layers.drawing.removeChild(this.currentPath);
            }
            return;
        }
        
        const drawingData = {
            id: `drawing-${this.drawingCounter}`,
            type: 'screen',
            element: this.currentPath,
            points: {
                startX: this.startPoint.x, startY: this.startPoint.y,
                endX: point.x, endY: point.y
            }
        };
        
        this.drawings.push(drawingData);
        
        if (this.onHistoryChange) {
            this.onHistoryChange({
                type: 'add_drawing',
                drawing: drawingData
            });
        }
    }

    // === Подбор - стрелка к кольцу ===
    _endRebound(point) {
        if (!this.startPoint) return;
        
        const dx = point.x - this.startPoint.x;
        const dy = point.y - this.startPoint.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        if (length < MIN_LINE_LENGTH) return;
        
        const reboundData = this._createRebound(this.startPoint, point);
        if (!reboundData) return;
        
        this.layers.drawing.appendChild(reboundData.element);
        
        const drawingData = {
            id: `drawing-${this.drawingCounter}`,
            type: 'rebound',
            element: reboundData.element,
            points: reboundData.points
        };
        
        this.drawings.push(drawingData);
        
        if (this.onHistoryChange) {
            this.onHistoryChange({
                type: 'add_drawing',
                drawing: drawingData
            });
        }
    }

    // === Линии ===
    _startStraightLine(point) {
        this.drawingCounter++;
        const config = drawingConfig[this.currentDrawingType];

        this.currentPath = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        this.currentPath.setAttribute('x1', point.x);
        this.currentPath.setAttribute('y1', point.y);
        this.currentPath.setAttribute('x2', point.x);
        this.currentPath.setAttribute('y2', point.y);
        this.currentPath.setAttribute('stroke', config.color);
        this.currentPath.setAttribute('stroke-width', config.strokeWidth);
        this.currentPath.setAttribute('stroke-dasharray', config.strokeDasharray);
        this.currentPath.setAttribute('class', 'drawing-element');
        this.currentPath.setAttribute('id', `drawing-${this.drawingCounter}`);

        this.layers.drawing.appendChild(this.currentPath);
    }

    _continueStraightLine(point) {
        if (!this.currentPath) return;
        this.currentPath.setAttribute('x2', point.x);
        this.currentPath.setAttribute('y2', point.y);
    }

    _endStraightLine(point) {
        if (!this.currentPath || !this.startPoint) return;

        const length = Math.sqrt(
            Math.pow(point.x - this.startPoint.x, 2) +
            Math.pow(point.y - this.startPoint.y, 2)
        );

        if (length < MIN_LINE_LENGTH) {
            this.layers.drawing.removeChild(this.currentPath);
            return;
        }

        if (this.currentDrawingType === 'arrow') {
            this._addArrowhead(this.currentPath);
        }

        const drawingData = {
            id: `drawing-${this.drawingCounter}`,
            type: this.currentDrawingType,
            element: this.currentPath,
            points: {
                x1: this.startPoint.x, y1: this.startPoint.y,
                x2: point.x, y2: point.y
            }
        };

        this.drawings.push(drawingData);

        if (this.onHistoryChange) {
            this.onHistoryChange({
                type: 'add_drawing',
                drawing: drawingData
            });
        }
    }

    // === Волнистые линии ===
    _startWavyLine(point) {
        this.drawingCounter++;
        const config = drawingConfig[this.currentDrawingType];

        this.currentPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        this.currentPath.setAttribute('d', `M ${point.x} ${point.y}`);
        this.currentPath.setAttribute('stroke', config.color);
        this.currentPath.setAttribute('stroke-width', config.strokeWidth);
        this.currentPath.setAttribute('fill', 'none');
        this.currentPath.setAttribute('class', 'drawing-element');
        this.currentPath.setAttribute('id', `drawing-${this.drawingCounter}`);

        this.layers.drawing.appendChild(this.currentPath);
        this.wavyPoints = [point];
    }

    _continueWavyLine(point) {
        if (!this.currentPath) return;
        const d = this.currentPath.getAttribute('d');
        this.currentPath.setAttribute('d', d + ` L ${point.x} ${point.y}`);
        this.wavyPoints.push(point);
    }

    _endWavyLine(point) {
        if (!this.currentPath) return;

        if (this.wavyPoints.length < 2) {
            this.layers.drawing.removeChild(this.currentPath);
            return;
        }

        const drawingData = {
            id: `drawing-${this.drawingCounter}`,
            type: this.currentDrawingType,
            element: this.currentPath,
            points: { path: this.currentPath.getAttribute('d') }
        };

        this.drawings.push(drawingData);

        if (this.onHistoryChange) {
            this.onHistoryChange({
                type: 'add_drawing',
                drawing: drawingData
            });
        }
    }

    // === Стрелка (наконечник) ===
    _addArrowhead(line) {
        const drawingLayer = this.layers.drawing;
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        const arrowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');

        marker.setAttribute('id', `arrowhead-${this.drawingCounter}`);
        marker.setAttribute('markerWidth', '4');
        marker.setAttribute('markerHeight', '3');
        marker.setAttribute('refX', '3');
        marker.setAttribute('refY', '1.5');
        marker.setAttribute('orient', 'auto');

        arrowPath.setAttribute('d', 'M0,0 L0,3 L4,1.5 z');
        arrowPath.setAttribute('fill', drawingConfig.arrow.color);

        marker.appendChild(arrowPath);
        defs.appendChild(marker);
        drawingLayer.appendChild(defs);

        line.setAttribute('marker-end', `url(#arrowhead-${this.drawingCounter})`);
    }

    // === Экран (заслон) - вертикальная или горизонтальная линия с утолщением ===
    _createScreen(startPoint, endPoint) {
        this.drawingCounter++;
        const config = drawingConfig.screen;
        
        // Экран рисуется как перпендикулярная линия к направлению движения
        const dx = endPoint.x - startPoint.x;
        const dy = endPoint.y - startPoint.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        if (length < MIN_LINE_LENGTH) return null;
        
        // Нормализуем и поворачиваем на 90 градусов
        const nx = -dy / length;
        const ny = dx / length;
        
        // Длина экрана (стандартная)
        const screenLength = 6;
        const halfScreen = screenLength / 2;
        
        const x1 = startPoint.x + nx * halfScreen;
        const y1 = startPoint.y + ny * halfScreen;
        const x2 = startPoint.x - nx * halfScreen;
        const y2 = startPoint.y - ny * halfScreen;
        
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x1);
        line.setAttribute('y1', y1);
        line.setAttribute('x2', x2);
        line.setAttribute('y2', y2);
        line.setAttribute('stroke', config.color);
        line.setAttribute('stroke-width', config.strokeWidth);
        line.setAttribute('stroke-linecap', 'round');
        line.setAttribute('class', 'drawing-element screen-element');
        line.setAttribute('id', `drawing-${this.drawingCounter}`);
        
        return {
            element: line,
            points: { x1, y1, x2, y2, startX: startPoint.x, startY: startPoint.y }
        };
    }

    // === Бросок - крестик (X) ===
    _createShot(point) {
        this.drawingCounter++;
        const config = drawingConfig.shot;
        const size = 2;
        
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'drawing-element shot-element');
        g.setAttribute('id', `drawing-${this.drawingCounter}`);
        
        const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line1.setAttribute('x1', point.x - size);
        line1.setAttribute('y1', point.y - size);
        line1.setAttribute('x2', point.x + size);
        line1.setAttribute('y2', point.y + size);
        line1.setAttribute('stroke', config.color);
        line1.setAttribute('stroke-width', config.strokeWidth);
        line1.setAttribute('stroke-linecap', 'round');
        
        const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line2.setAttribute('x1', point.x + size);
        line2.setAttribute('y1', point.y - size);
        line2.setAttribute('x2', point.x - size);
        line2.setAttribute('y2', point.y + size);
        line2.setAttribute('stroke', config.color);
        line2.setAttribute('stroke-width', config.strokeWidth);
        line2.setAttribute('stroke-linecap', 'round');
        
        g.appendChild(line1);
        g.appendChild(line2);
        
        return {
            element: g,
            points: { x: point.x, y: point.y, size }
        };
    }

    // === Подбор - стрелка к кольцу с пунктиром ===
    _createRebound(startPoint, endPoint) {
        this.drawingCounter++;
        const config = drawingConfig.rebound;
        
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', startPoint.x);
        line.setAttribute('y1', startPoint.y);
        line.setAttribute('x2', endPoint.x);
        line.setAttribute('y2', endPoint.y);
        line.setAttribute('stroke', config.color);
        line.setAttribute('stroke-width', config.strokeWidth);
        line.setAttribute('stroke-dasharray', config.strokeDasharray);
        line.setAttribute('class', 'drawing-element rebound-element');
        line.setAttribute('id', `drawing-${this.drawingCounter}`);
        
        // Добавляем наконечник стрелки
        const drawingLayer = this.layers.drawing;
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        const arrowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        
        marker.setAttribute('id', `rebound-arrow-${this.drawingCounter}`);
        marker.setAttribute('markerWidth', '4');
        marker.setAttribute('markerHeight', '3');
        marker.setAttribute('refX', '3');
        marker.setAttribute('refY', '1.5');
        marker.setAttribute('orient', 'auto');
        
        arrowPath.setAttribute('d', 'M0,0 L0,3 L4,1.5 z');
        arrowPath.setAttribute('fill', config.color);
        
        marker.appendChild(arrowPath);
        defs.appendChild(marker);
        drawingLayer.appendChild(defs);
        
        line.setAttribute('marker-end', `url(#rebound-arrow-${this.drawingCounter})`);
        
        return {
            element: line,
            points: { x1: startPoint.x, y1: startPoint.y, x2: endPoint.x, y2: endPoint.y }
        };
    }

    // === Ластик ===
    _startEraser(point) {
        this.isDrawing = true;
        this._eraseAtPoint(point);
    }

    _continueEraser(point) {
        this._eraseAtPoint(point);
    }

    _endEraser() {
        this.isDrawing = false;
    }

    _eraseAtPoint(point) {
        const elements = this.layers.drawing.querySelectorAll('.drawing-element');
        elements.forEach(element => {
            const bbox = element.getBBox();
            if (point.x >= bbox.x && point.x <= bbox.x + bbox.width &&
                point.y >= bbox.y && point.y <= bbox.y + bbox.height) {

                const drawing = this.drawings.find(d => d.element === element);
                if (drawing) {
                    if (this.onHistoryChange) {
                        this.onHistoryChange({
                            type: 'remove_drawing',
                            drawing: drawing
                        });
                    }
                }

                element.remove();
                this.drawings = this.drawings.filter(d => d.element !== element);
            }
        });
    }

    /**
     * Очистить все рисунки
     */
    clearAll() {
        if (this.drawings.length > 0) {
            if (this.onHistoryChange) {
                this.onHistoryChange({
                    type: 'clear_all_drawings',
                    drawings: [...this.drawings]
                });
            }
        }

        while (this.layers.drawing.firstChild) {
            this.layers.drawing.removeChild(this.layers.drawing.firstChild);
        }
        this.drawings = [];
        this.drawingCounter = 0;
    }

    /**
     * Получить данные рисунков для сохранения (атрибуты без outerHTML, т.к. SVG namespace теряется)
     */
    getDrawingsData() {
        return this.drawings.map(drawing => ({
            type: drawing.type,
            attrs: this._getElementAttrs(drawing.element),
            points: drawing.points
        }));
    }

    /**
     * Получить массив рисунков
     */
    getDrawings() {
        return this.drawings;
    }

    /**
     * Сохранить атрибуты SVG-элемента в виде плоского объекта
     */
    _getElementAttrs(el) {
        const attrs = {};
        // Основные атрибуты самого элемента
        for (let i = 0; i < el.attributes.length; i++) {
            const attr = el.attributes[i];
            if (attr.name !== 'id') {
                attrs[attr.name] = attr.value;
            }
        }
        // Для shot (крестик из <g> с дочерними <line>) сохраняем дочерние
        if (el.tagName === 'g') {
            attrs._children = [];
            for (let i = 0; i < el.children.length; i++) {
                const child = el.children[i];
                const childAttrs = {};
                for (let j = 0; j < child.attributes.length; j++) {
                    const a = child.attributes[j];
                    childAttrs[a.name] = a.value;
                }
                childAttrs._tag = child.tagName;
                attrs._children.push(childAttrs);
            }
        }
        // Для arrow и rebound — сохраняем marker-end и связанные defs/marker
        if (el.hasAttribute('marker-end')) {
            attrs['marker-end'] = el.getAttribute('marker-end');
            // Ищем связанный marker в DOM
            const markerId = attrs['marker-end'].match(/url\(#(.+?)\)/);
            if (markerId && markerId[1]) {
                const markerEl = el.closest('svg')?.querySelector('#' + markerId[1]);
                if (markerEl) {
                    attrs._marker = this._getElementAttrs(markerEl);
                    attrs._marker._tag = markerEl.tagName;
                    // Дочерние элементы marker (path)
                    attrs._marker._children = [];
                    for (let i = 0; i < markerEl.children.length; i++) {
                        const mc = markerEl.children[i];
                        const mcAttrs = {};
                        for (let j = 0; j < mc.attributes.length; j++) {
                            const a = mc.attributes[j];
                            mcAttrs[a.name] = a.value;
                        }
                        mcAttrs._tag = mc.tagName;
                        attrs._marker._children.push(mcAttrs);
                    }
                }
            }
        }
        return attrs;
    }

    /**
     * Воссоздать SVG-элемент из атрибутов
     */
    recreateElementFromAttrs(type, attrs, id) {
        let el;
        if (type === 'shot') {
            el = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        } else if (type === 'wavy') {
            el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        } else {
            el = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        }
        el.setAttribute('id', id);
        
        // Восстанавливаем основные атрибуты
        for (const key in attrs) {
            if (key === '_children' || key === '_marker' || key.startsWith('_')) continue;
            el.setAttribute(key, attrs[key]);
        }
        
        // Для shot — восстанавливаем дочерние элементы
        if (attrs._children) {
            attrs._children.forEach(childAttrs => {
                const child = document.createElementNS('http://www.w3.org/2000/svg', childAttrs._tag || 'line');
                for (const key in childAttrs) {
                    if (key === '_tag') continue;
                    child.setAttribute(key, childAttrs[key]);
                }
                el.appendChild(child);
            });
        }
        
        return el;
    }
}