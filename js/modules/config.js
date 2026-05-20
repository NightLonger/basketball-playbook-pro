// js/modules/config.js
export const playerConfig = {
    'PG': { color: '#3366ff', number: null, label: 'PG' },
    'SG': { color: '#33ccff', number: null, label: 'SG' },
    'SF': { color: '#00cc99', number: null, label: 'SF' },
    'PF': { color: '#99cc00', number: null, label: 'PF' },
    'C': { color: '#ffcc00', number: null, label: 'C' },
    'defense': { color: '#ff3333', number: null, label: '⚪' },
    'ball': { color: '#8B4513', number: null, label: '🏀' },
    'select': { color: null, number: null, label: '✏️' }
};

export const drawingConfig = {
    'arrow': { type: 'arrow', color: '#007aff', strokeWidth: 0.8, strokeDasharray: 'none' },
    'line': { type: 'line', color: '#ff3b30', strokeWidth: 0.6, strokeDasharray: 'none' },
    'dashed': { type: 'line', color: '#34c759', strokeWidth: 0.6, strokeDasharray: '2,2' },
    'wavy': { type: 'wavy', color: '#af52de', strokeWidth: 0.6, strokeDasharray: 'none' },
    'screen': { type: 'screen', color: '#ff9500', strokeWidth: 2, strokeDasharray: 'none' },
    'shot': { type: 'shot', color: '#ff3b30', strokeWidth: 0.8, strokeDasharray: 'none' },
    'rebound': { type: 'rebound', color: '#ff3b30', strokeWidth: 0.6, strokeDasharray: '4,2' },
    'eraser': { type: 'eraser', color: null, strokeWidth: null, strokeDasharray: null }
};

export const TOOL_LABELS = {
    // Players
    'Разыгрывающий': { tool: 'player', type: 'PG' },
    'Атакующий': { tool: 'player', type: 'SG' },
    'Форвард': { tool: 'player', type: 'SF' },
    'Тяжелый форвард': { tool: 'player', type: 'PF' },
    'Центровой': { tool: 'player', type: 'C' },
    'Чужой игрок': { tool: 'player', type: 'defense' },
    'Мяч': { tool: 'ball', type: 'ball' },
    'Выделение': { tool: 'select', type: null },
    // Drawing
    'Стрелка': { tool: 'drawing', type: 'arrow' },
    'Линия': { tool: 'drawing', type: 'line' },
    'Пунктир': { tool: 'drawing', type: 'dashed' },
    'Волнистая': { tool: 'drawing', type: 'wavy' },
    'Ластик': { tool: 'drawing', type: 'eraser' }
};

export const RENDER_ZOOM_MIN = 0.5;
export const RENDER_ZOOM_MAX = 3;
export const RENDER_ZOOM_STEP = 0.1;
export const PLAYER_RADIUS = 4;
export const BALL_RADIUS = 2.5;
export const MIN_LINE_LENGTH = 2;
export const MAX_HISTORY = 50;
