// js/modules/recorder.js
/**
 * Модуль записи и воспроизведения комбинаций
 * Записывает действия (расстановка игроков, рисование) и проигрывает их с временными метками
 */

export class RecorderManager {
    constructor() {
        this.isRecording = false;
        this.isPlaying = false;
        this.recordedFrames = []; // массив { timestamp, snapshot }
        this.currentPlaybackIndex = 0;
        this.recordingStartTime = 0;
        this.onFrame = null; // callback(frame, index)
        this.onPlaybackEnd = null;
        this.onRecordedFrame = null; // callback(frame)
        
        this._timerId = null;
    }

    /**
     * Начать запись
     */
    startRecording() {
        if (this.isPlaying) return false;
        
        this.isRecording = true;
        this.recordedFrames = [];
        this.recordingStartTime = Date.now();
        
        // Сразу записываем начальное состояние (чистая площадка)
        this._captureFrame();
        
        return true;
    }

    /**
     * Остановить запись
     */
    stopRecording() {
        if (!this.isRecording) return null;
        
        this.isRecording = false;
        
        // Финальный кадр
        this._captureFrame();
        
        const recording = {
            frames: this.recordedFrames,
            duration: Date.now() - this.recordingStartTime,
            frameCount: this.recordedFrames.length
        };
        
        return recording;
    }

    /**
     * Захватить текущий кадр (вызывается при каждом изменении на площадке)
     */
    captureFrame() {
        if (!this.isRecording) return;
        this._captureFrame();
    }

    _captureFrame() {
        const now = Date.now();
        const timestamp = now - this.recordingStartTime;
        
        const frame = {
            timestamp: timestamp,
            time: now
        };
        
        this.recordedFrames.push(frame);
        
        if (this.onRecordedFrame) {
            this.onRecordedFrame(frame);
        }
    }

    /**
     * Получить данные игроков и рисунков для текущего кадра
     * @param {Object} playersData - данные игроков
     * @param {Object} drawingsData - данные рисунков
     */
    createSnapshot(playersData, drawingsData) {
        return {
            players: JSON.parse(JSON.stringify(playersData)),
            drawings: JSON.parse(JSON.stringify(drawingsData)),
            timestamp: Date.now()
        };
    }

    /**
     * Начать воспроизведение
     * @param {Array} frames - массив кадров с данными
     * @param {Function} applyFrame - функция применения кадра (players, drawings) => {}
     * @param {number} speed - множитель скорости (1 = нормальная)
     */
    startPlayback(frames, applyFrame, speed = 1) {
        if (this.isRecording || this.isPlaying) return false;
        if (!frames || frames.length < 2) return false;
        
        this.isPlaying = true;
        this.currentPlaybackIndex = 0;
        
        const startTime = Date.now();
        const totalDuration = frames[frames.length - 1].timestamp;
        
        // Применяем первый кадр сразу
        if (frames[0].data && this.onFrame) {
            this.onFrame(frames[0], 0);
        }
        
        const playStep = () => {
            if (!this.isPlaying) return;
            
            const elapsed = Date.now() - startTime;
            const playbackTime = elapsed * speed;
            
            // Находим текущий кадр
            while (this.currentPlaybackIndex < frames.length - 1 &&
                   frames[this.currentPlaybackIndex + 1].timestamp <= playbackTime) {
                this.currentPlaybackIndex++;
            }
            
            const frame = frames[this.currentPlaybackIndex];
            
            if (this.onFrame) {
                this.onFrame(frame, this.currentPlaybackIndex);
            }
            
            // Обновляем прогресс
            const progress = Math.min(playbackTime / totalDuration * 100, 100);
            
            // Проверяем завершение
            if (this.currentPlaybackIndex >= frames.length - 1 || playbackTime >= totalDuration) {
                this.isPlaying = false;
                if (this.onPlaybackEnd) {
                    this.onPlaybackEnd();
                }
                return;
            }
            
            // Следующий шаг — через 50ms для плавности
            this._timerId = setTimeout(playStep, 50);
        };
        
        playStep();
        return true;
    }

    /**
     * Остановить воспроизведение
     */
    stopPlayback() {
        this.isPlaying = false;
        if (this._timerId) {
            clearTimeout(this._timerId);
            this._timerId = null;
        }
        this.currentPlaybackIndex = 0;
    }

    /**
     * Получить статус
     */
    getStatus() {
        if (this.isRecording) return 'recording';
        if (this.isPlaying) return 'playing';
        return 'idle';
    }

    /**
     * Есть ли записанные кадры
     */
    hasRecording() {
        return this.recordedFrames.length > 1;
    }

    /**
     * Получить записанные кадры
     */
    getRecording() {
        return this.recordedFrames;
    }

    /**
     * Очистить запись
     */
    clearRecording() {
        this.recordedFrames = [];
        this.currentPlaybackIndex = 0;
    }
}