// js/modules/icons.js
// SVG-иконки в стиле Phosphor — векторные, единый стиль, премиум качество
// Каждая иконка: viewBox="0 0 24 24", stroke-width="2", stroke-linecap="round"

export const ICONS = {
  // Инструменты
  select: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M6 3L18 13L13 15L17 20L15 21L11 16L7 18L6 3Z"/>
  </svg>`,

  ball: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 2C14.5 4 16 7.5 16 12C16 16.5 14.5 20 12 22"/>
    <path d="M12 2C9.5 4 8 7.5 8 12C8 16.5 9.5 20 12 22"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M5 5C8 8 11 9 12 9M5 19C8 16 11 15 12 15"/>
    <path d="M19 5C16 8 13 9 12 9M19 19C16 16 13 15 12 15"/>
  </svg>`,

  arrow: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="4" y1="20" x2="20" y2="4"/>
    <polyline points="8 4 20 4 20 16"/>
  </svg>`,

  line: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
    <line x1="3" y1="21" x2="21" y2="3"/>
  </svg>`,

  dashed: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-dasharray="3 3">
    <line x1="3" y1="21" x2="21" y2="3"/>
  </svg>`,

  wavy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
    <path d="M2 12C5 6 8 18 12 12C16 6 19 18 22 12"/>
  </svg>`,

  screen: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="4" y="4" width="8" height="8" rx="1" opacity="0.5"/>
    <rect x="12" y="12" width="8" height="8" rx="1"/>
  </svg>`,

  shot: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
    <circle cx="12" cy="12" r="9" opacity="0.3"/>
    <line x1="8" y1="8" x2="16" y2="16"/>
    <line x1="16" y1="8" x2="8" y2="16"/>
    <circle cx="12" cy="12" r="2"/>
  </svg>`,

  rebound: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 12C3 8 7 3 12 3C17 3 21 7 21 12"/>
    <polyline points="15 8 21 12 17 14"/>
  </svg>`,

  eraser: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M20 20H7L3 16C2 15 2 13.5 3 12.5L13.5 2C14.5 1 16 1 17 2L22 7C23 8 23 9.5 22 10.5L15 17.5"/>
    <line x1="9" y1="15" x2="15" y2="9"/>
  </svg>`,

  // История
  undo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="1 4 1 10 7 10"/>
    <path d="M3.5 15C4.5 19 8 22 12 22C17 22 21 18 21 13C21 8 17 4 12 4"/>
  </svg>`,

  redo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="23 4 23 10 17 10"/>
    <path d="M20.5 15C19.5 19 16 22 12 22C7 22 3 18 3 13C3 8 7 4 12 4"/>
  </svg>`,

  clear: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6L17.5 20C17.4 21 16.5 22 15.5 22H8.5C7.5 22 6.6 21 6.5 20L5 6"/>
    <line x1="10" y1="11" x2="10" y2="17"/>
    <line x1="14" y1="11" x2="14" y2="17"/>
    <line x1="8" y1="6" x2="9" y2="3C9.2 2.4 9.7 2 10.3 2H13.7C14.3 2 14.8 2.4 15 3L16 6"/>
  </svg>`,

  // Табы
  tools: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15C19.2 15.4 19 15.8 18.7 16.1L20 18.4C20.4 19.1 20.1 20 19.4 20.4L18.4 21.4C17.7 21.8 16.8 21.5 16.4 20.8L14.1 19.5C13.8 19.6 13.4 19.7 13 19.8L12.7 22.3C12.6 23.1 11.9 23.7 11.1 23.6L9.8 23.4C9 23.3 8.4 22.6 8.5 21.8L8.8 19.3C8.4 19.2 8 19 7.7 18.7L5.4 20C4.7 20.4 3.8 20.1 3.4 19.4L2.4 18.4C2 17.7 2.3 16.8 3 16.4L5.3 15.1C5.2 14.8 5.1 14.4 5 14L2.5 13.7C1.7 13.6 1.1 12.9 1.2 12.1L1.4 10.8C1.5 10 2.2 9.4 3 9.5L5.5 9.8C5.6 9.4 5.8 9 6.1 8.7L4.8 6.4C4.4 5.7 4.7 4.8 5.4 4.4L6.4 3.4C7.1 3 8 3.3 8.4 4L9.7 6.3C10 6.2 10.4 6.1 10.8 6L11.1 3.5C11.2 2.7 11.9 2.1 12.7 2.2L14 2.4C14.8 2.5 15.4 3.2 15.3 4L15 6.5C15.4 6.6 15.8 6.8 16.1 7.1L18.4 5.8C19.1 5.4 20 5.7 20.4 6.4L21.4 7.4C21.8 8.1 21.5 9 20.8 9.4L18.5 10.7C18.6 11 18.7 11.4 18.8 11.8L21.3 12.1C22.1 12.2 22.7 12.9 22.6 13.7L22.4 15C22.3 15.8 21.6 16.4 20.8 16.3L18.3 16C18.1 16.3 17.9 16.6 17.6 16.9L18.9 19.2"/>
  </svg>`,

  playbook: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <line x1="9" y1="3" x2="9" y2="21"/>
    <line x1="3" y1="9" x2="21" y2="9"/>
    <line x1="3" y1="15" x2="21" y2="15"/>
  </svg>`,

  save: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M19 21H5C4 21 3 20 3 19V5C3 4 4 3 5 3H16L21 8V19C21 20 20 21 19 21Z"/>
    <polyline points="17 21 17 13 7 13 7 21"/>
    <line x1="7" y1="3" x2="7" y2="8" x3="15" y3="8"/>
  </svg>`,

  // Навигация
  chevronDown: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>`,
  chevronUp: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="18 15 12 9 6 15"/></svg>`,

  // Header иконки
  courtToggle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="2"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
  </svg>`,

  players: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="8" r="4"/>
    <path d="M20 21C20 16.6 16.4 13 12 13C7.6 13 4 16.6 4 21"/>
  </svg>`,
};

/**
 * Заменить emoji внутри элемента на SVG иконку
 * Ищет текст, который совпадает с ключами из map, и заменяет на SVG
 */
export function replaceEmojiWithIcon(element, emoji, iconName) {
  const svg = ICONS[iconName];
  if (!svg) return;
  const wrapper = document.createElement('span');
  wrapper.className = 'svg-icon svg-icon-' + iconName;
  wrapper.innerHTML = svg;
  element.innerHTML = '';
  element.appendChild(wrapper);
}