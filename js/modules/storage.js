// js/modules/storage.js
/**
 * Модуль сохранения/загрузки схем (localStorage)
 */
export class StorageManager {
    constructor() {
        this.STORAGE_KEY = 'basketballSchemes';
        this.schemes = [];
        this.currentSchemeId = null;
        this._load();
    }

    /**
     * Загрузить все схемы из localStorage
     */
    _load() {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved) {
                this.schemes = JSON.parse(saved);
            }
        } catch (e) {
            console.warn('Failed to load schemes:', e);
            this.schemes = [];
        }
    }

    /**
     * Сохранить схемы в localStorage
     */
    _save() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.schemes));
        } catch (e) {
            console.warn('Failed to save schemes:', e);
        }
    }

    /**
     * Сохранить текущую схему
     */
    save(name, playersData, drawingsData) {
        if (!name.trim()) return null;

        const schemeData = {
            id: this.currentSchemeId || Date.now().toString(),
            name: name.trim(),
            date: new Date().toLocaleString(),
            players: playersData,
            drawings: drawingsData
        };

        if (!this.currentSchemeId) {
            this.schemes.push(schemeData);
        } else {
            const index = this.schemes.findIndex(s => s.id === this.currentSchemeId);
            if (index !== -1) {
                this.schemes[index] = schemeData;
            }
        }

        this._save();
        return schemeData;
    }

    /**
     * Загрузить схему по ID
     */
    load(schemeId) {
        return this.schemes.find(s => s.id === schemeId) || null;
    }

    /**
     * Удалить схему по ID
     */
    delete(schemeId) {
        this.schemes = this.schemes.filter(s => s.id !== schemeId);
        this._save();
        
        if (this.currentSchemeId === schemeId) {
            this.currentSchemeId = null;
        }
    }

    /**
     * Получить все схемы
     */
    getAll() {
        return [...this.schemes];
    }

    /**
     * Установить ID текущей схемы
     */
    setCurrentSchemeId(id) {
        this.currentSchemeId = id;
    }

    /**
     * Сбросить ID текущей схемы
     */
    resetCurrentSchemeId() {
        this.currentSchemeId = null;
    }

    /**
     * Получить ID текущей схемы
     */
    getCurrentSchemeId() {
        return this.currentSchemeId;
    }
}