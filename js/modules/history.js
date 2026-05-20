// js/modules/history.js
import { MAX_HISTORY } from './config.js';

/**
 * Модуль истории действий (Undo/Redo)
 */
export class HistoryManager {
    constructor() {
        this.actions = [];
        this.currentIndex = -1;
        this.maxHistory = MAX_HISTORY;
    }

    /**
     * Добавить новое действие
     */
    push(action) {
        // Удаляем все действия после текущей позиции (если undo сделан)
        if (this.currentIndex < this.actions.length - 1) {
            this.actions = this.actions.slice(0, this.currentIndex + 1);
        }

        this.actions.push(action);
        this.currentIndex++;

        if (this.actions.length > this.maxHistory) {
            this.actions.shift();
            this.currentIndex--;
        }
    }

    /**
     * Отменить последнее действие
     */
    undo() {
        if (this.currentIndex >= 0) {
            const action = this.actions[this.currentIndex];
            this.currentIndex--;
            return action;
        }
        return null;
    }

    /**
     * Повторить отмененное действие
     */
    redo() {
        if (this.currentIndex < this.actions.length - 1) {
            this.currentIndex++;
            return this.actions[this.currentIndex];
        }
        return null;
    }

    /**
     * Проверить, можно ли отменить
     */
    canUndo() {
        return this.currentIndex >= 0;
    }

    /**
     * Проверить, можно ли повторить
     */
    canRedo() {
        return this.currentIndex < this.actions.length - 1;
    }

    /**
     * Очистить историю
     */
    clear() {
        this.actions = [];
        this.currentIndex = -1;
    }
}