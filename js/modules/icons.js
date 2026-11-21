// js/modules/icons.js
// Иконки приложения. Геометрия — трассированные SVG из iconpack (см. iconPaths.js),
// поэтому все иконки монохромные, масштабируются без потерь и красятся через currentColor.

import { ICON_PATHS, ICON_INNER } from './iconPaths.js';

const SVG_OPEN = '<svg viewBox="0 0 120 120" fill="currentColor" aria-hidden="true" focusable="false">';

function fromPath(d) {
  return `${SVG_OPEN}<path d="${d}"/></svg>`;
}

function fromInner(inner) {
  return `${SVG_OPEN}${inner}</svg>`;
}

const BASE = {};

for (const [name, d] of Object.entries(ICON_PATHS)) {
  BASE[name] = fromPath(d);
}

for (const [name, inner] of Object.entries(ICON_INNER)) {
  BASE[name] = fromInner(inner);
}

/**
 * Публичный набор иконок: имена из iconpack + семантические псевдонимы,
 * чтобы HTML и код не зависели от имён файлов исходного набора.
 */
export const ICONS = {
  ...BASE,

  // Инструменты рисования
  dashed: BASE.pass,        // «Передача» — пунктирная дуга с мячом
  eraser: BASE.eraser,      // в наборе не было — нарисована в том же стиле

  // Служебные
  clear: BASE.trash,
  tools: BASE.settings,
  playbook: BASE.clipboard,
  players: BASE.jersey,
  playerCount: BASE.jersey,
  courtToggle: BASE.court,
};

/**
 * Готовая разметка иконки для вставки через innerHTML.
 * @param {string} name ключ из ICONS
 * @param {string} [extraClass] дополнительный класс на обёртке
 */
export function iconMarkup(name, extraClass = '') {
  const svg = ICONS[name];
  if (!svg) return '';
  const cls = 'svg-icon svg-icon-' + name + (extraClass ? ' ' + extraClass : '');
  return `<span class="${cls}">${svg}</span>`;
}

/**
 * Заменить содержимое элемента на иконку.
 * @param {Element} element
 * @param {string} name ключ из ICONS
 * @returns {boolean} удалось ли заменить
 */
export function setIcon(element, name) {
  if (!element || !ICONS[name]) return false;
  element.innerHTML = iconMarkup(name);
  return true;
}

/**
 * Совместимость со старым API.
 */
export function replaceEmojiWithIcon(element, emoji, iconName) {
  return setIcon(element, iconName);
}
