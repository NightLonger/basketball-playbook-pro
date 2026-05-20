// js/modules/players.js
import { playerConfig, PLAYER_RADIUS, BALL_RADIUS } from './config.js';

/**
 * Модуль управления игроками
 */
export class PlayerManager {
    constructor(layers, courtManager) {
        this.layers = layers;
        this.court = courtManager;
        this.players = [];
        this.playerCounter = 0;
        this.currentTool = null;
        this.currentPlayerType = null;
        this.onHistoryChange = null; // callback
        this.onDragMove = null; // callback для захвата промежуточных позиций при перетаскивании
        
        // Long-press параметры
        this.longPressTimer = null;
        this.longPressDuration = 300; // 300ms для long-press
        this.isLongPressing = false;
        this.selectedPlayer = null;
        this._dragMoveThrottle = 0; // для throttle вызова onDragMove
    }

    /**
     * Установить текущий инструмент-игрок
     */
    setTool(tool, type) {
        this.currentTool = tool;
        this.currentPlayerType = type;
    }

    /**
     * Добавить игрока в точку
     */
    addPlayer(x, y, type = null) {
        const playerType = type || this.currentPlayerType;
        if (!playerType) return null;

        this.playerCounter++;
        const config = playerConfig[playerType];
        if (!config) return null;

        const playerId = `player-${this.playerCounter}`;
        
        let playerElement;
        if (playerType === 'ball') {
            playerElement = this._createBall(x, y, config);
        } else {
            playerElement = this._createPlayer(x, y, config, playerType);
        }

        playerElement.setAttribute('id', playerId);
        playerElement.setAttribute('data-type', playerType);
        playerElement.setAttribute('data-x', x);
        playerElement.setAttribute('data-y', y);

        this.makeDraggable(playerElement);
        this.layers.players.appendChild(playerElement);

        const playerData = {
            id: playerId,
            type: playerType,
            x: x,
            y: y,
            element: playerElement
        };

        this.players.push(playerData);

        if (this.onHistoryChange) {
            this.onHistoryChange({
                type: 'add_player',
                player: playerData
            });
        }

        return playerData;
    }

    _createBall(x, y, config) {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', x);
        circle.setAttribute('cy', y);
        circle.setAttribute('r', BALL_RADIUS);
        circle.setAttribute('fill', config.color);
        circle.setAttribute('stroke', '#000');
        circle.setAttribute('stroke-width', '0.2');
        return circle;
    }

    _createPlayer(x, y, config, type) {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', x);
        circle.setAttribute('cy', y);
        circle.setAttribute('r', PLAYER_RADIUS);
        circle.setAttribute('fill', config.color);
        circle.setAttribute('stroke', '#000');
        circle.setAttribute('stroke-width', '0.3');
        circle.setAttribute('class', 'player');
        
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', x);
        text.setAttribute('y', y + 1.2);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('font-size', '2.8');
        text.setAttribute('fill', '#fff');
        text.setAttribute('font-weight', '700');
        text.setAttribute('font-family', "'Oswald','Inter',Arial,sans-serif");
        text.setAttribute('letter-spacing', '0.3');
        text.textContent = config.label;
        text.style.pointerEvents = 'none';
        text.style.userSelect = 'none';
        
        g.appendChild(circle);
        g.appendChild(text);
        return g;
    }

    /**
     * Подсветка выбранного игрока
     */
    _highlightPlayer(element, highlight = true) {
        if (!element) return;
        const circle = element.querySelector('circle');
        if (circle) {
            if (highlight) {
                circle.setAttribute('stroke', '#ffffff');
                circle.setAttribute('stroke-width', '0.8');
                circle.style.filter = 'brightness(1.4) drop-shadow(0 0 3px rgba(255,255,255,0.6))';
            } else {
                circle.setAttribute('stroke', '#000');
                circle.setAttribute('stroke-width', '0.3');
                circle.style.filter = '';
            }
        }
    }

    /**
     * Снять выделение со всех игроков
     */
    _clearAllHighlights() {
        this.players.forEach(p => this._highlightPlayer(p.element, false));
        this.selectedPlayer = null;
    }

    /**
     * Drag & Drop для игроков с long-press
     */
    makeDraggable(element) {
        let selectedElement = null;
        let offset = { x: 0, y: 0 };
        let startX, startY;
        let longPressTimer = null;
        let hasMoved = false;
        let startClientX, startClientY;
        let isDragging = false;

        const startDrag = (e) => {
            // Останавливаем всплытие, чтобы не срабатывало добавление на площадке
            e.stopPropagation();
            e.preventDefault();
            
            const clientX = e.clientX || (e.touches && e.touches[0].clientX);
            const clientY = e.clientY || (e.touches && e.touches[0].clientY);
            if (clientX === undefined) return;
            
            startClientX = clientX;
            startClientY = clientY;
            hasMoved = false;
            isDragging = false;
            
            // Подсвечиваем игрока сразу при нажатии
            this._clearAllHighlights();
            this._highlightPlayer(element, true);
            this.selectedPlayer = element;
            
            selectedElement = element;
            const point = this.court.getSVGPointTransformed(clientX, clientY);
            
            // Получаем текущие координаты игрока (с учетом предыдущих перемещений)
            startX = parseFloat(selectedElement.getAttribute('data-x')) || 0;
            startY = parseFloat(selectedElement.getAttribute('data-y')) || 0;
            
            const transform = selectedElement.transform.baseVal;
            if (transform.length > 0 && transform.getItem(0).type === SVGTransform.SVG_TRANSFORM_TRANSLATE) {
                offset.x = transform.getItem(0).matrix.e;
                offset.y = transform.getItem(0).matrix.f;
            }

            offset.x -= point.x;
            offset.y -= point.y;

            // Long-press таймер — начинаем перетаскивание только после 300ms
            longPressTimer = setTimeout(() => {
                isDragging = true;
                // Визуальный фидбек что можно тащить
                if (selectedElement) {
                    selectedElement.style.cursor = 'move';
                }
            }, this.longPressDuration);

            document.addEventListener('mousemove', drag);
            document.addEventListener('touchmove', drag, { passive: false });
            document.addEventListener('mouseup', endDrag);
            document.addEventListener('touchend', endDrag);
        };

        const drag = (e) => {
            if (!selectedElement || !isDragging) return;
            
            const clientX = e.clientX || (e.touches && e.touches[0].clientX);
            const clientY = e.clientY || (e.touches && e.touches[0].clientY);
            if (clientX === undefined) return;
            
            // Проверяем, сдвинулся ли палец больше чем на 5px
            const dx = clientX - startClientX;
            const dy = clientY - startClientY;
            if (!hasMoved && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
                hasMoved = true;
            }
            
            e.preventDefault();
            const point = this.court.getSVGPointTransformed(clientX, clientY);
            selectedElement.setAttribute('transform',
                `translate(${point.x + offset.x}, ${point.y + offset.y})`);
            
            // Колбэк для записи промежуточных позиций (throttle ~100ms)
            const now = Date.now();
            if (this.onDragMove && now - this._dragMoveThrottle > 80) {
                this._dragMoveThrottle = now;
                const svgTransform = selectedElement.transform.baseVal;
                if (svgTransform.length > 0) {
                    const matrix = svgTransform.getItem(0).matrix;
                    const newX = startX + matrix.e;
                    const newY = startY + matrix.f;
                    // Обновляем data-x/y
                    selectedElement.setAttribute('data-x', newX);
                    selectedElement.setAttribute('data-y', newY);
                    // ОБЯЗАТЕЛЬНО обновляем player.x/y в массиве для getPlayersData()
                    const player = this.players.find(p => p.id === selectedElement.id);
                    if (player) {
                        player.x = newX;
                        player.y = newY;
                    }
                    this.onDragMove();
                }
            }
        };

        const endDrag = () => {
            // Сбрасываем long-press таймер
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
            
            if (selectedElement && isDragging && hasMoved) {
                const svgTransform = selectedElement.transform.baseVal;
                if (svgTransform.length > 0) {
                    const matrix = svgTransform.getItem(0).matrix;
                    const player = this.players.find(p => p.id === selectedElement.id);
                    if (player) {
                        const newX = startX + matrix.e;
                        const newY = startY + matrix.f;
                        
                        // Сохраняем новые координаты
                        player.x = newX;
                        player.y = newY;
                        
                        // Обновляем data-x и data-y
                        selectedElement.setAttribute('data-x', newX);
                        selectedElement.setAttribute('data-y', newY);
                        
                        // Сбрасываем transform, обновляем координаты
                        const tag = selectedElement.tagName;
                        if (tag === 'circle') {
                            // Мяч — сам элемент circle
                            selectedElement.setAttribute('cx', newX);
                            selectedElement.setAttribute('cy', newY);
                        } else {
                            // Игрок — <g> с вложенными circle и text
                            const circle = selectedElement.querySelector('circle');
                            const text = selectedElement.querySelector('text');
                            if (circle) {
                                circle.setAttribute('cx', newX);
                                circle.setAttribute('cy', newY);
                            }
                            if (text) {
                                text.setAttribute('x', newX);
                                text.setAttribute('y', newY + 1.2);
                            }
                        }
                        
                        // Сбрасываем transform
                        selectedElement.setAttribute('transform', '');

                        if (this.onHistoryChange) {
                            this.onHistoryChange({
                                type: 'move_player',
                                playerId: selectedElement.id,
                                oldX: startX,
                                oldY: startY,
                                newX: newX,
                                newY: newY
                            });
                        }
                    }
                }
                
                isDragging = false;
            }
            
            // Снимаем выделение через небольшую задержку
            setTimeout(() => {
                if (selectedElement) {
                    this._highlightPlayer(selectedElement, false);
                    selectedElement.style.cursor = '';
                }
                this.selectedPlayer = null;
            }, 100);

            selectedElement = null;
            document.removeEventListener('mousemove', drag);
            document.removeEventListener('touchmove', drag);
            document.removeEventListener('mouseup', endDrag);
            document.removeEventListener('touchend', endDrag);
        };

        element.addEventListener('mousedown', startDrag);
        element.addEventListener('touchstart', startDrag, { passive: false });
    }

    /**
     * Удалить всех игроков
     */
    clearAll() {
        this.players.forEach(player => {
            if (player.element.parentNode) {
                player.element.remove();
            }
        });
        this.players = [];
        this.playerCounter = 0;
    }

    /**
     * Найти игрока по элементу
     */
    findPlayer(element) {
        return this.players.find(p => p.element === element);
    }

    /**
     * Получить данные всех игроков для сохранения
     */
    getPlayersData() {
        return this.players.map(player => ({
            type: player.type,
            x: player.x,
            y: player.y,
            id: player.id
        }));
    }

    /**
     * Получить список игроков
     */
    getPlayers() {
        return this.players;
    }
}