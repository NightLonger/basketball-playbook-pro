// js/modules/playbook.js
/**
 * Модуль библиотеки комбинаций (Playbook)
 */
export class PlaybookManager {
    constructor() {
        this.library = this._buildLibrary();
        this.currentCategory = 'basic';
        this.onLoadCombo = null; // callback для загрузки комбинации
    }

    _buildLibrary() {
        return {
            basic: [
                {
                    id: 'pick-roll-basic',
                    name: 'Pick & Roll',
                    description: 'Классический pick & roll: заслон, проход и скат к кольцу',
                    type: 'offense',
                    data: {
                        players: [
                            { type: 'PG', x: 75, y: 120 },
                            { type: 'SG', x: 22, y: 75 },
                            { type: 'SF', x: 128, y: 75 },
                            { type: 'PF', x: 115, y: 110 },
                            { type: 'C', x: 75, y: 60 }
                        ],
                        drawings: []
                    },
                    timeline: {
                        duration: 7000,
                        initialPlayers: [
                            { type: 'PG', x: 75, y: 120 },
                            { type: 'SG', x: 22, y: 75 },
                            { type: 'SF', x: 128, y: 75 },
                            { type: 'PF', x: 115, y: 110 },
                            { type: 'C', x: 75, y: 60 },
                            { type: 'ball', x: 75, y: 120 }
                        ],
                        tracks: {
                            0: [ // PG: ведение -> использование заслона -> проход -> пас
                                { t: 0,    x: 75, y: 120 },
                                { t: 1200, x: 75, y: 112 },
                                { t: 2200, x: 58, y: 95 },
                                { t: 3200, x: 52, y: 70 },
                                { t: 4200, x: 58, y: 52 },
                                { t: 5200, x: 60, y: 50 },
                                { t: 7000, x: 62, y: 55 }
                            ],
                            1: [ // SG спейсинг
                                { t: 0,    x: 22, y: 75 },
                                { t: 3000, x: 20, y: 65 },
                                { t: 7000, x: 18, y: 60 }
                            ],
                            2: [ // SF спейсинг
                                { t: 0,    x: 128, y: 75 },
                                { t: 3000, x: 130, y: 68 },
                                { t: 7000, x: 132, y: 62 }
                            ],
                            3: [ // PF спейсинг
                                { t: 0,    x: 115, y: 110 },
                                { t: 3000, x: 118, y: 100 },
                                { t: 7000, x: 120, y: 95 }
                            ],
                            4: [ // C: выходит ставить заслон -> скатывается к кольцу -> завершение
                                { t: 0,    x: 75, y: 60 },
                                { t: 1200, x: 88, y: 105 },
                                { t: 2200, x: 88, y: 105 },
                                { t: 3200, x: 84, y: 80 },
                                { t: 4200, x: 78, y: 50 },
                                { t: 5200, x: 75, y: 32 },
                                { t: 7000, x: 75, y: 18 }
                            ],
                            5: [ // Мяч: с PG -> передача -> с C
                                { t: 0,    x: 75, y: 120 },
                                { t: 1200, x: 75, y: 112 },
                                { t: 2200, x: 58, y: 95 },
                                { t: 3200, x: 52, y: 70 },
                                { t: 4200, x: 58, y: 52 },
                                { t: 4600, x: 75, y: 32 },
                                { t: 5200, x: 75, y: 32 },
                                { t: 7000, x: 75, y: 18 }
                            ]
                        },
                        drawings: [
                            { type: 'screen', x1: 83, y1: 112, x2: 93, y2: 98, t0: 900, t1: 1500, color: '#ff9500', strokeWidth: 1.8 },
                            { type: 'arrow',  x1: 75, y1: 110, x2: 52, y2: 72, t0: 1600, t1: 2600, color: '#007aff' },
                            { type: 'dashed', x1: 88, y1: 100, x2: 75, y2: 34, t0: 2400, t1: 3600, color: '#34c759' },
                            { type: 'pass',   x1: 58, y1: 52,  x2: 75, y2: 32, t0: 4200, t1: 4600, color: '#ffcc00' },
                            { type: 'shot',   x: 75, y: 16, t0: 5600, t1: 5900, color: '#ff3b30', size: 2.4 }
                        ]
                    }
                },
                {
                    id: 'zone-defense-2-3',
                    name: 'Зонная защита 2-3',
                    description: 'Базовая зонная защита',
                    type: 'defense',
                    data: {
                        players: [
                            { type: 'defense', x: 40, y: 70 },
                            { type: 'defense', x: 110, y: 70 },
                            { type: 'defense', x: 30, y: 120 },
                            { type: 'defense', x: 75, y: 120 },
                            { type: 'defense', x: 120, y: 120 }
                        ]
                    }
                },
                {
                    id: 'fast-break',
                    name: 'Быстрый прорыв',
                    description: 'Схема быстрой атаки',
                    type: 'offense',
                    data: {
                        players: [
                            { type: 'PG', x: 30, y: 50 },
                            { type: 'SG', x: 60, y: 70 },
                            { type: 'SF', x: 90, y: 90 },
                            { type: 'PF', x: 120, y: 110 },
                            { type: 'C', x: 150, y: 130 }
                        ],
                        drawings: [
                            { type: 'arrow', points: { x1: 30, y1: 50, x2: 150, y2: 130 } }
                        ]
                    }
                },
                {
                    id: 'isolation',
                    name: 'Изоляция',
                    description: 'Игра 1 на 1',
                    type: 'offense',
                    data: {
                        players: [
                            { type: 'PG', x: 75, y: 100 },
                            { type: 'defense', x: 75, y: 85 },
                            { type: 'SG', x: 120, y: 50 },
                            { type: 'SF', x: 120, y: 150 },
                            { type: 'C', x: 30, y: 100 }
                        ]
                    }
                }
            ],
            offense: [
                {
                    id: 'give-go',
                    name: 'Give & Go',
                    description: 'Отдал и пошел',
                    type: 'offense',
                    data: {
                        players: [
                            { type: 'PG', x: 40, y: 100 },
                            { type: 'SG', x: 80, y: 80 },
                            { type: 'defense', x: 75, y: 70 }
                        ],
                        drawings: [
                            { type: 'arrow', points: { x1: 40, y1: 100, x2: 80, y2: 80 } },
                            { type: 'dashed', points: { x1: 80, y1: 80, x2: 100, y2: 60 } }
                        ]
                    }
                },
                {
                    id: 'post-up',
                    name: 'Игра в позиции',
                    description: 'Атака через центрового',
                    type: 'offense',
                    data: {
                        players: [
                            { type: 'PG', x: 40, y: 100 },
                            { type: 'C', x: 75, y: 60 },
                            { type: 'defense', x: 75, y: 50 }
                        ]
                    }
                },
                {
                    id: 'motion-offense',
                    name: 'Движущаяся атака',
                    description: 'Постоянное движение игроков',
                    type: 'offense',
                    data: {
                        players: [
                            { type: 'PG', x: 40, y: 100 },
                            { type: 'SG', x: 110, y: 70 },
                            { type: 'SF', x: 110, y: 130 },
                            { type: 'PF', x: 80, y: 50 },
                            { type: 'C', x: 80, y: 150 }
                        ]
                    }
                }
            ],
            defense: [
                {
                    id: 'man-to-man',
                    name: 'Персональная',
                    description: 'Защита игрок в игрока',
                    type: 'defense',
                    data: {
                        players: [
                            { type: 'PG', x: 40, y: 100 },
                            { type: 'defense', x: 40, y: 85 },
                            { type: 'SG', x: 110, y: 50 },
                            { type: 'defense', x: 110, y: 35 },
                            { type: 'SF', x: 110, y: 150 },
                            { type: 'defense', x: 110, y: 135 }
                        ]
                    }
                },
                {
                    id: 'full-court-press',
                    name: 'Прессинг',
                    description: 'Давление по всей площадке',
                    type: 'defense',
                    data: {
                        players: [
                            { type: 'defense', x: 30, y: 40 },
                            { type: 'defense', x: 75, y: 40 },
                            { type: 'defense', x: 120, y: 40 },
                            { type: 'defense', x: 50, y: 80 },
                            { type: 'defense', x: 100, y: 80 }
                        ]
                    }
                },
                {
                    id: 'zone-3-2',
                    name: 'Зонная 3-2',
                    description: 'Защита трое спереди',
                    type: 'defense',
                    data: {
                        players: [
                            { type: 'defense', x: 40, y: 60 },
                            { type: 'defense', x: 75, y: 60 },
                            { type: 'defense', x: 110, y: 60 },
                            { type: 'defense', x: 60, y: 100 },
                            { type: 'defense', x: 90, y: 100 }
                        ]
                    }
                }
            ],
            special: [
                {
                    id: 'inbound-side',
                    name: 'Аут боковой',
                    description: 'Комбинация при вбрасывании',
                    type: 'special',
                    data: {
                        players: [
                            { type: 'PG', x: 10, y: 100 },
                            { type: 'SG', x: 30, y: 70 },
                            { type: 'SF', x: 30, y: 130 },
                            { type: 'PF', x: 60, y: 100 },
                            { type: 'C', x: 90, y: 100 }
                        ],
                        drawings: [
                            { type: 'arrow', points: { x1: 10, y1: 100, x2: 90, y2: 100 } }
                        ]
                    }
                },
                {
                    id: 'last-shot',
                    name: 'Последний бросок',
                    description: 'Вариант на последние секунды',
                    type: 'special',
                    data: {
                        players: [
                            { type: 'PG', x: 40, y: 100 },
                            { type: 'SG', x: 75, y: 50 },
                            { type: 'SF', x: 110, y: 100 },
                            { type: 'PF', x: 90, y: 130 },
                            { type: 'C', x: 60, y: 130 }
                        ]
                    }
                },
                {
                    id: 'screen-away',
                    name: 'Заслон от мяча',
                    description: 'Заслон без мяча',
                    type: 'special',
                    data: {
                        players: [
                            { type: 'PG', x: 40, y: 100 },
                            { type: 'SG', x: 110, y: 70 },
                            { type: 'SF', x: 90, y: 130 },
                            { type: 'PF', x: 70, y: 70 },
                            { type: 'C', x: 50, y: 130 }
                        ]
                    }
                }
            ]
        };
    }

    /**
     * Получить комбинации по категории
     */
    getCategory(category) {
        return this.library[category] || [];
    }

    /**
     * Получить все категории
     */
    getCategories() {
        return Object.keys(this.library);
    }

    /**
     * Получить комбинацию по ID
     */
    getComboById(id) {
        for (const category of Object.values(this.library)) {
            const found = category.find(combo => combo.id === id);
            if (found) return found;
        }
        return null;
    }

    /**
     * Получить иконку для типа комбинации
     */
    getTypeIcon(type) {
        const icons = {
            'offense': '⚡',
            'defense': '🛡️',
            'special': '🎯'
        };
        return icons[type] || '🏀';
    }

    /**
     * Рендерить комбинации в контейнер
     */
    render(category, container) {
        this.currentCategory = category;
        const combinations = this.library[category] || [];
        
        container.innerHTML = '';

        if (combinations.length === 0) {
            container.innerHTML = '<div class="empty-state">Комбинации скоро появятся</div>';
            return;
        }

        combinations.forEach(combo => {
            const item = document.createElement('div');
            item.className = 'playbook-item';
            item.setAttribute('data-id', combo.id);

            item.innerHTML = `
                <div class="playbook-preview">${this.getTypeIcon(combo.type)}</div>
                <div class="playbook-name">${combo.name}</div>
                <div class="playbook-desc">${combo.description}</div>
            `;

            item.addEventListener('click', () => {
                if (this.onLoadCombo) {
                    this.onLoadCombo(combo);
                }
            });

            container.appendChild(item);
        });
    }
}