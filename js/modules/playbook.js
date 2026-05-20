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
                    description: 'Базовая комбинация подбора и отскока',
                    type: 'offense',
                    data: {
                        players: [
                            { type: 'PG', x: 40, y: 100 },
                            { type: 'SG', x: 110, y: 50 },
                            { type: 'SF', x: 110, y: 150 },
                            { type: 'PF', x: 75, y: 80 },
                            { type: 'C', x: 75, y: 60 }
                        ],
                        drawings: [
                            { type: 'arrow', points: { x1: 40, y1: 100, x2: 75, y2: 80 } },
                            { type: 'dashed', points: { x1: 75, y1: 60, x2: 75, y2: 40 } }
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
                    name: 'Экран от мяча',
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