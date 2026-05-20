// js/app.js v4.5 — Recording & Playback фикс
import { CourtManager } from './modules/court.js';
import { PlayerManager } from './modules/players.js';
import { DrawingManager } from './modules/drawing.js';
import { HistoryManager } from './modules/history.js';
import { TouchManager } from './modules/touch.js';
import { StorageManager } from './modules/storage.js';
import { PlaybookManager } from './modules/playbook.js';
import { RecorderManager } from './modules/recorder.js';

document.addEventListener('DOMContentLoaded', function() {
    // ============================================
    // LOADING SCREEN
    // ============================================
    const loadingScreen = document.getElementById('loading-screen');
    
    // Simulate loading and hide after resources are ready
    window.addEventListener('load', () => {
        setTimeout(() => {
            loadingScreen.classList.add('hidden');
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }, 1000);
    });

    // ============================================
    // CUSTOM CONFIRM DIALOG
    // ============================================
    const confirmOverlay = document.getElementById('confirm-overlay');
    const confirmMsg = document.getElementById('confirm-msg');
    const confirmIcon = document.getElementById('confirm-icon');
    const confirmOk = document.getElementById('confirm-ok');
    const confirmCancel = document.getElementById('confirm-cancel');
    
    function showConfirm(message, icon = '⚠️', isLoad = false) {
        return new Promise((resolve) => {
            confirmMsg.textContent = message;
            confirmIcon.textContent = icon;
            confirmOverlay.style.display = 'flex';
            
            // Меняем стиль кнопки OK в зависимости от типа действия
            if (isLoad) {
                confirmOk.classList.add('load');
            } else {
                confirmOk.classList.remove('load');
            }
            
            const handleOk = () => {
                confirmOverlay.style.display = 'none';
                confirmOk.removeEventListener('click', handleOk);
                confirmCancel.removeEventListener('click', handleCancel);
                resolve(true);
            };
            
            const handleCancel = () => {
                confirmOverlay.style.display = 'none';
                confirmOk.removeEventListener('click', handleOk);
                confirmCancel.removeEventListener('click', handleCancel);
                resolve(false);
            };
            
            confirmOk.addEventListener('click', handleOk);
            confirmCancel.addEventListener('click', handleCancel);
        });
    }

    const courtSvg = document.getElementById('basketball-court');
    const courtManager = new CourtManager(courtSvg);
    const layers = courtManager.getLayers();
    
    const playerManager = new PlayerManager(layers, courtManager);
    const drawingManager = new DrawingManager(layers, courtManager);
    const historyManager = new HistoryManager();
    const storageManager = new StorageManager();
    const playbookManager = new PlaybookManager();
    const recorderManager = new RecorderManager();
    // TouchManager отключен — площадка статична для мобильных
    // const touchManager = new TouchManager(courtManager, {
    //     pinchEnabled: false, panEnabled: false, swipeEnabled: false
    // });

    let currentTool = null;
    let currentToolType = null;
    let recordedSnapshots = [];
    let lastLoadedComboName = '';

    // History callbacks — при любом изменении (игрок или рисунок) сохраняем снэпшот
    // ВАЖНО: captureSnapshot вызываем ТОЛЬКО если идёт запись, чтобы не испортить playback
    playerManager.onHistoryChange = (action) => { 
        historyManager.push(action); 
        if (recorderManager.isRecording) {
            recorderManager.captureFrame(); 
            captureSnapshot(); 
        }
    };
    drawingManager.onHistoryChange = (action) => { 
        historyManager.push(action); 
        if (recorderManager.isRecording) {
            recorderManager.captureFrame(); 
            captureSnapshot(); 
        }
    };
    // Колбэк для захвата промежуточных позиций при перетаскивании (плавное движение)
    playerManager.onDragMove = () => {
        if (recorderManager.isRecording) {
            recorderManager.captureFrame();
            captureSnapshot();
        }
    };
    // Колбэк для захвата промежуточных позиций при рисовании (линии, заслоны и т.д.)
    drawingManager.onDrawingContinue = () => {
        if (recorderManager.isRecording) {
            recorderManager.captureFrame();
            captureSnapshot();
        }
    };

    // ============================================
    // BOTTOM SHEET
    // ============================================
    const bottomPanel = document.getElementById('bottom-panel');
    const panelHandle = document.getElementById('panel-handle');
    const handleArrow = document.getElementById('handle-arrow');

    let sheetState = 'expanded';
    const HANDLE_HEIGHT = 44;
    let autoCollapseTimer = null;

    function updateSheet(state, instant = false) {
        sheetState = state;
        if (state === 'collapsed') {
            bottomPanel.style.transform = `translateY(calc(100% - ${HANDLE_HEIGHT}px))`;
            handleArrow.classList.add('rotated');
            bottomPanel.classList.add('collapsed');
            // Отключаем анимацию при схлопывании по таймеру (мгновенно)
            if (instant) {
                bottomPanel.style.transition = 'none';
                requestAnimationFrame(() => { bottomPanel.style.transition = ''; });
            }
        } else {
            bottomPanel.style.transform = 'translateY(0)';
            handleArrow.classList.remove('rotated');
            bottomPanel.classList.remove('collapsed');
        }
    }

    // Авто-сворачивание при начале рисования (делаем placeholder — будет подключено позже)
    function autoCollapsePanel() {
        if (sheetState === 'expanded') {
            updateSheet('collapsed', false);
        }
    }

    // Auto-expand при нажатии на площадку (если панель свернута — разворачиваем, но не сейчас)
    // Использование: вызывать autoCollapsePanel() при старте рисования
    updateSheet('expanded');

    let sheetTouchStartY = 0, sheetTouchStartX = 0, sheetStartState = 'expanded';

    [panelHandle, bottomPanel].forEach(target => {
        target.addEventListener('touchstart', (e) => {
            sheetTouchStartY = e.touches[0].clientY;
            sheetTouchStartX = e.touches[0].clientX;
            sheetStartState = sheetState;
        }, { passive: true });

        target.addEventListener('touchmove', (e) => {
            const dy = e.touches[0].clientY - sheetTouchStartY;
            const dx = e.touches[0].clientX - sheetTouchStartX;
            if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
                e.preventDefault();
                const panelHeight = bottomPanel.offsetHeight;
                if (sheetStartState === 'expanded') {
                    const translateY = Math.min(Math.max(0, dy), panelHeight - HANDLE_HEIGHT);
                    bottomPanel.style.transform = `translateY(${translateY}px)`;
                } else {
                    const translateY = -(panelHeight - HANDLE_HEIGHT) + dy;
                    const clamped = Math.max(-(panelHeight - HANDLE_HEIGHT), Math.min(0, translateY));
                    bottomPanel.style.transform = `translateY(${clamped}px)`;
                }
            }
        }, { passive: false });

        target.addEventListener('touchend', (e) => {
            const dy = e.changedTouches[0].clientY - sheetTouchStartY;
            const dx = e.changedTouches[0].clientX - sheetTouchStartX;

            if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
                const tabs = document.querySelectorAll('.panel-tab');
                const activeIdx = Array.from(tabs).findIndex(t => t.classList.contains('active'));
                if (dx > 0 && activeIdx > 0) tabs[activeIdx - 1].click();
                else if (dx < 0 && activeIdx < tabs.length - 1) tabs[activeIdx + 1].click();
                updateSheet(sheetStartState);
                return;
            }

            const panelHeight = bottomPanel.offsetHeight;
            const threshold = panelHeight * 0.3;
            if (dy > threshold) updateSheet('collapsed');
            else if (dy < -threshold) updateSheet('expanded');
            else updateSheet(sheetStartState);
        }, { passive: true });
    });

    panelHandle.addEventListener('click', () => {
        updateSheet(sheetState === 'expanded' ? 'collapsed' : 'expanded');
    });

    // ============================================
    // PANEL TABS
    // ============================================
    document.querySelectorAll('.panel-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const section = this.dataset.section;
            document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            document.querySelectorAll('.panel-section').forEach(s => s.classList.remove('active'));
            const target = document.getElementById(section + '-section');
            if (target) target.classList.add('active');
            updateSheet('expanded');
        });
    });

    // ============================================
    // TOOL SELECTION
    // ============================================
    const toolButtons = document.querySelectorAll('#tools-section .tool-btn');
    const hintText = document.getElementById('hint-text');

    toolButtons.forEach(btn => btn.classList.remove('active'));
    const defaultTool = document.querySelector('#tools-section .tool-btn.pg');
    if (defaultTool) { defaultTool.classList.add('active'); setToolFromButton(defaultTool); }

    toolButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            if (this.id === 'undo-btn') { undoLastAction(); return; }
            if (this.id === 'redo-btn') { redoLastAction(); return; }
            if (this.id === 'clear-all-btn') { clearAllAction(); return; }
            toolButtons.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            setToolFromButton(this);
        });
    });

    function setToolFromButton(btn) {
        if (!btn) return;
        const tool = btn.dataset.tool;
        const type = btn.dataset.type;
        if (!tool) return;
        playerManager.setTool(null, null);
        drawingManager.setTool(null, null);
        courtSvg.classList.remove('eraser-cursor');

        if (tool === 'player' || tool === 'ball') {
            currentTool = tool; currentToolType = type;
            playerManager.setTool(tool, type);
            const names = { 'PG': 'PG', 'SG': 'SG', 'SF': 'SF', 'PF': 'PF', 'C': 'C', 'defense': '⚪ Защитник', 'ball': '🏀 Мяч' };
            setHint(names[type] || type, 'Нажмите на площадку');
        } else if (tool === 'drawing') {
            currentTool = 'drawing'; currentToolType = type;
            if (type === 'eraser') {
                drawingManager.setTool('drawing', 'eraser');
                courtSvg.classList.add('eraser-cursor');
                setHint('🧹 Ластик', 'Кликните на линию');
            } else {
                drawingManager.setTool('drawing', type);
                const names = { 'arrow': '➡️ Стрелка', 'line': '📏 Линия', 'dashed': '••• Пунктир', 'wavy': '〰️ Волнистая', 'screen': '🛡️ Экран', 'shot': '🎯 Бросок', 'rebound': '⬆️ Подбор' };
                setHint(names[type] || type, 'Проведите по площадке');
            }
        } else if (tool === 'select') {
            currentTool = 'select'; currentToolType = null;
            setHint('✏️ Выделение', 'Перетащите игрока');
        }
    }

    function setHint(toolName, hint) {
        if (hintText) hintText.textContent = (toolName ? toolName + ' — ' : '') + (hint || '');
    }

    // ============================================
    // COURT EVENTS
    // ============================================
    function handleStart(e) {
        // Проверяем, что клик был именно по SVG площадке, а не по игроку
        const target = e.target;
        if (target.closest('#players-layer') || target.closest('.player')) {
            // Клик по игроку — не добавляем нового
            return;
        }
        
        if (!currentTool || currentTool === 'select') return;
        e.preventDefault();
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);
        if (clientX === undefined) return;
        const point = courtManager.getSVGPoint(clientX, clientY);
        if (currentTool === 'player' || currentTool === 'ball') {
            playerManager.addPlayer(point.x, point.y);
            updatePlayerCount();
            return;
        }
        // Авто-сворачивание при начале рисования
        if (currentTool === 'drawing') {
            autoCollapsePanel();
        }
        drawingManager.startDrawing(point);
    }

    function handleMove(e) {
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);
        if (clientX === undefined) return;
        drawingManager.continueDrawing(courtManager.getSVGPoint(clientX, clientY));
    }

    function handleEnd(e) {
        const clientX = e.clientX || (e.changedTouches && e.changedTouches[0].clientX);
        const clientY = e.clientY || (e.changedTouches && e.changedTouches[0].clientY);
        if (clientX === undefined) { drawingManager.endDrawing({ x: 0, y: 0 }); return; }
        drawingManager.endDrawing(courtManager.getSVGPoint(clientX, clientY));
    }

    courtSvg.addEventListener('mousedown', handleStart);
    courtSvg.addEventListener('touchstart', handleStart, { passive: false });
    courtSvg.addEventListener('mousemove', handleMove);
    courtSvg.addEventListener('touchmove', handleMove, { passive: false });
    courtSvg.addEventListener('mouseup', handleEnd);
    courtSvg.addEventListener('touchend', handleEnd);
    courtSvg.addEventListener('mouseleave', handleEnd);

    function updatePlayerCount() {
        const el = document.querySelector('#player-count .badge-count');
        if (el) el.textContent = playerManager.getPlayers().length;
    }

    document.getElementById('toggle-court')?.addEventListener('click', function() {
        const wasFull = courtManager.toggleCourt();
        const icon = this.querySelector('.tool-icon');
        if (icon) icon.textContent = wasFull ? '1/2' : 'Full';
    });

    document.getElementById('reset-zoom')?.addEventListener('click', () => {
        courtManager.resetView();
        showToast('Масштаб сброшен');
    });

    // ============================================
    // UNDO / REDO / CLEAR
    // ============================================
    function undoLastAction() {
        const action = historyManager.undo();
        if (action) { undoAction(action); showToast('Отмена'); } else showToast('Нет действий');
    }
    function redoLastAction() {
        const action = historyManager.redo();
        if (action) { redoAction(action); showToast('Повтор'); } else showToast('Нет действий');
    }
    async function clearAllAction() {
        const confirmed = await showConfirm('Очистить всё?', '🗑️', false);
        if (!confirmed) return;
        const savedDrawings = [...drawingManager.getDrawings()];
        if (savedDrawings.length > 0 && drawingManager.onHistoryChange) {
            drawingManager.onHistoryChange({ type: 'clear_all_drawings', drawings: savedDrawings });
        }
        drawingManager.clearAll();
        playerManager.clearAll();
        historyManager.clear();
        updatePlayerCount();
        recorderManager.captureFrame();
        captureSnapshot();
        showToast('Всё очищено');
    }

    function undoAction(action) {
        switch (action.type) {
            case 'add_player':
                if (action.player.element.parentNode) action.player.element.remove();
                const pIdx = playerManager.getPlayers().findIndex(p => p.id === action.player.id);
                if (pIdx !== -1) playerManager.getPlayers().splice(pIdx, 1);
                updatePlayerCount(); break;
            case 'add_drawing':
                if (action.drawing.element.parentNode) action.drawing.element.remove();
                const dIdx = drawingManager.getDrawings().findIndex(d => d.id === action.drawing.id);
                if (dIdx !== -1) drawingManager.getDrawings().splice(dIdx, 1); break;
            case 'remove_drawing':
                layers.drawing.appendChild(action.drawing.element);
                drawingManager.getDrawings().push(action.drawing); break;
            case 'clear_all_drawings':
                action.drawings.forEach(d => { layers.drawing.appendChild(d.element); drawingManager.getDrawings().push(d); }); break;
            case 'move_player':
                const p = playerManager.getPlayers().find(pl => pl.id === action.playerId);
                if (p && p.element) {
                    p.element.setAttribute('transform', '');
                    p.x = action.oldX; p.y = action.oldY;
                    p.element.setAttribute('data-x', action.oldX); p.element.setAttribute('data-y', action.oldY);
                } break;
        }
    }

    function redoAction(action) {
        switch (action.type) {
            case 'add_player':
                layers.players.appendChild(action.player.element);
                playerManager.getPlayers().push(action.player);
                updatePlayerCount(); break;
            case 'add_drawing':
                layers.drawing.appendChild(action.drawing.element);
                drawingManager.getDrawings().push(action.drawing); break;
            case 'remove_drawing':
                if (action.drawing.element.parentNode) action.drawing.element.remove();
                const rdIdx = drawingManager.getDrawings().findIndex(d => d.id === action.drawing.id);
                if (rdIdx !== -1) drawingManager.getDrawings().splice(rdIdx, 1); break;
            case 'clear_all_drawings':
                while (layers.drawing.firstChild) layers.drawing.removeChild(layers.drawing.firstChild);
                drawingManager.getDrawings().length = 0; break;
            case 'move_player':
                const pl = playerManager.getPlayers().find(p => p.id === action.playerId);
                if (pl && pl.element) {
                    pl.element.setAttribute('transform', `translate(${action.newX}, ${action.newY})`);
                    pl.x = action.newX; pl.y = action.newY;
                } break;
        }
    }

    // ============================================
    // RECORD
    // ============================================
    const recordBtn = document.getElementById('record-start');
    const playBtn = document.getElementById('play-btn');
    const stopPlaybackBtn = document.getElementById('stop-playback');
    const recPlayback = document.getElementById('rec-playback');
    const playbackFill = document.getElementById('playback-fill');
    const recStatus = document.getElementById('rec-status');
    const recordIndicator = document.getElementById('record-indicator');

    recordBtn.addEventListener('click', function() {
        if (recorderManager.getStatus() === 'recording') stopRecording();
        else startRecording();
    });

    function startRecording() {
        playerManager.clearAll();
        drawingManager.clearAll();
        historyManager.clear();
        updatePlayerCount();
        recorderManager.clearRecording();
        recordedSnapshots = [];
        const ok = recorderManager.startRecording();
        if (!ok) return;
        recordBtn.classList.add('recording');
        recordBtn.querySelector('.rec-label').textContent = 'Стоп';
        recordBtn.querySelector('.rec-icon').textContent = '⏹';
        playBtn.classList.add('disabled');
        recordIndicator.style.display = 'flex';
        recStatus.textContent = '00:00';
        // Захватываем начальный пустой кадр
        captureSnapshot();
        showToast('🔴 Запись');
    }

    function stopRecording() {
        recorderManager.stopRecording();
        recordBtn.classList.remove('recording');
        recordBtn.querySelector('.rec-label').textContent = 'Запись';
        recordBtn.querySelector('.rec-icon').textContent = '⏺';
        playBtn.classList.remove('disabled');
        recordIndicator.style.display = 'none';
        const d = ((Date.now() - recorderManager.recordingStartTime) / 1000).toFixed(1);
        recStatus.textContent = d + 's';
        showToast('⏹ Запись: ' + recordedSnapshots.length + ' шагов');
    }

    // Сохраняем рисунки через getDrawingsData() (attrs через _getElementAttrs, не outerHTML)
    function captureSnapshot() {
        if (!recorderManager.isRecording) return;
        const snap = {
            players: JSON.parse(JSON.stringify(playerManager.getPlayersData())),
            drawings: drawingManager.getDrawingsData()
        };
        const frames = recorderManager.getRecording();
        const last = frames[frames.length - 1];
        const timestamp = last ? last.timestamp : 0;
        
        // Если последний снэпшот с тем же timestamp — обновляем его данные
        if (recordedSnapshots.length > 0 && recordedSnapshots[recordedSnapshots.length - 1].timestamp === timestamp) {
            recordedSnapshots[recordedSnapshots.length - 1].data = snap;
        } else {
            recordedSnapshots.push({ timestamp, data: snap });
        }
        
        // Показываем время записи
        const totalSec = (timestamp / 1000).toFixed(1);
        recStatus.textContent = (timestamp >= 60000) ? 
            Math.floor(timestamp / 60000) + ':' + (totalSec.padStart(5, '0')) :
            '00:' + totalSec.padStart(4, '0');
    }

    // ============================================
    // PLAYBACK
    // ============================================
    function renderSnapshotFrame(frameData) {
        if (!frameData || !frameData.players) return;
        while (layers.players.firstChild) layers.players.removeChild(layers.players.firstChild);
        while (layers.drawing.firstChild) layers.drawing.removeChild(layers.drawing.firstChild);
        playerManager.getPlayers().length = 0;
        drawingManager.getDrawings().length = 0;
        drawingManager.drawingCounter = 0;

        // Игроки
        frameData.players.forEach(p => {
            playerManager.addPlayer(p.x, p.y, p.type);
        });

        // Рисунки — восстанавливаем из attrs через createElementNS
        if (frameData.drawings) {
            frameData.drawings.forEach(d => {
                if (d.attrs) {
                    const id = 'drawing-pb-' + (++drawingManager.drawingCounter);
                    const el = drawingManager.recreateElementFromAttrs(d.type, d.attrs, id);
                    if (el) {
                        layers.drawing.appendChild(el);
                        drawingManager.getDrawings().push({ id, type: d.type, element: el, points: d.points || {} });
                    }
                }
            });
        }
        updatePlayerCount();
    }

    playBtn.addEventListener('click', function() {
        if (recordedSnapshots.length < 2) { showToast('Нет данных для воспроизведения'); return; }
        if (recorderManager.getStatus() === 'playing') return;

        recPlayback.style.display = 'flex';
        playBtn.style.display = 'none';
        playbackFill.style.width = '0%';

        renderSnapshotFrame(recordedSnapshots[0].data);

        const totalDur = recordedSnapshots[recordedSnapshots.length - 1].timestamp || 5000;

        recorderManager.onFrame = (frame) => {
            if (frame.data) renderSnapshotFrame(frame.data);
            // Ищем индекс в recordedSnapshots для прогресс-бара
            const idx = recordedSnapshots.indexOf(frame);
            const prog = totalDur > 0 ? (frame.timestamp / totalDur) * 100 : 0;
            playbackFill.style.width = Math.min(prog, 100) + '%';
        };

        recorderManager.onPlaybackEnd = () => {
            recPlayback.style.display = 'none';
            playBtn.style.display = 'flex';
            playbackFill.style.width = '0%';
            recorderManager.onFrame = null;
            recorderManager.onPlaybackEnd = null;
            showToast('✅ Воспроизведение завершено');
        };

        recorderManager.startPlayback(recordedSnapshots, null, 1);
    });

    stopPlaybackBtn.addEventListener('click', function() {
        recorderManager.stopPlayback();
        recPlayback.style.display = 'none';
        playBtn.style.display = 'flex';
        playbackFill.style.width = '0%';
        recorderManager.onFrame = null;
        recorderManager.onPlaybackEnd = null;
        clearCourtLayers();
        updatePlayerCount();
        showToast('⏹ Стоп');
    });

    function clearCourtLayers() {
        while (layers.players.firstChild) layers.players.removeChild(layers.players.firstChild);
        while (layers.drawing.firstChild) layers.drawing.removeChild(layers.drawing.firstChild);
        playerManager.getPlayers().length = 0;
        drawingManager.getDrawings().length = 0;
        drawingManager.drawingCounter = 0;
    }

    // ============================================
    // SAVE / LOAD (используем outerHTML)
    // ============================================
    function initSaveSystem() {
        const saveBtn = document.getElementById('save-scheme');
        const nameInput = document.getElementById('scheme-name');
        saveBtn.addEventListener('click', saveCurrentScheme);
        nameInput.addEventListener('keypress', function(e) { if (e.key === 'Enter') saveCurrentScheme(); });
        renderSchemesList();
    }

    function saveCurrentScheme() {
        const name = document.getElementById('scheme-name').value.trim();
        if (!name) { showToast('Введите название'); return; }
        // Сохраняем с outerHTML
        const drawingsData = drawingManager.getDrawings().map(d => ({
            type: d.type,
            element: d.element.outerHTML,
            points: d.points || {}
        }));
        const res = storageManager.save(name, playerManager.getPlayersData(), drawingsData);
        if (res) {
            document.getElementById('scheme-name').value = '';
            renderSchemesList();
            showToast('✅ Схема сохранена');
        }
    }

    function renderSchemesList() {
        const list = document.getElementById('schemes-list');
        const schemes = storageManager.getAll();
        list.innerHTML = '';
        if (!schemes.length) { list.innerHTML = '<div class="empty-state"><span class="empty-icon">📂</span>Нет схем</div>'; return; }
        schemes.forEach(s => {
            const item = document.createElement('div');
            item.className = 'scheme-item';
            item.innerHTML = `
                <div class="scheme-info"><div class="scheme-name">${s.name}</div><div class="scheme-date">${s.date}</div></div>
                <div class="scheme-actions">
                    <button class="scheme-btn load-btn" data-id="${s.id}">Загрузить</button>
                    <button class="scheme-btn delete-btn" data-id="${s.id}">Удалить</button>
                </div>`;
            list.appendChild(item);
        });
        list.querySelectorAll('.load-btn').forEach(b => b.addEventListener('click', function() { loadScheme(this.dataset.id); }));
        list.querySelectorAll('.delete-btn').forEach(b => b.addEventListener('click', async function() {
            const confirmed = await showConfirm('Удалить схему?', '🗑️', false);
            if (!confirmed) return;
            storageManager.delete(this.dataset.id);
            renderSchemesList();
            showToast('Схема удалена');
        }));
    }

    async function loadScheme(id) {
        const s = storageManager.load(id);
        if (!s) return;
        const confirmed = await showConfirm('Загрузить "' + s.name + '"?', '📥', true);
        if (!confirmed) return;
        clearCourtLayers();
        if (s.players) s.players.forEach(p => playerManager.addPlayer(p.x, p.y, p.type));
        if (s.drawings) {
            s.drawings.forEach(d => {
                // Восстанавливаем из outerHTML
                const wrapper = document.createElement('div');
                wrapper.innerHTML = d.element;
                const el = wrapper.firstChild;
                if (el) {
                    const did = 'drawing-' + drawingManager.drawingCounter++;
                    el.setAttribute('id', did);
                    layers.drawing.appendChild(el);
                    drawingManager.getDrawings().push({ id: did, type: d.type, element: el, points: d.points || {} });
                }
            });
        }
        storageManager.setCurrentSchemeId(id);
        document.getElementById('scheme-name').value = s.name;
        updatePlayerCount();
        showToast('✅ "' + s.name + '" загружена');
    }

    // ============================================
    // PLAYBOOK LIBRARY
    // ============================================
    function initPlaybookLibrary() {
        const catBtns = document.querySelectorAll('#playbook-section .category-btn');
        const grid = document.getElementById('playbook-grid');

        playbookManager.onLoadCombo = async (combo) => {
            const confirmed = await showConfirm('Загрузить комбинацию "' + combo.name + '"?', '📋', true);
            if (!confirmed) return;
            clearCourtLayers();
            lastLoadedComboName = combo.name;
            const comboSnapshots = [];

            // Расставляем игроков
            if (combo.data.players) combo.data.players.forEach(p => playerManager.addPlayer(p.x, p.y, p.type));
            
            // Снэпшот 1: только игроки
            comboSnapshots.push({
                timestamp: 0,
                data: {
                    players: JSON.parse(JSON.stringify(playerManager.getPlayersData())),
                    drawings: []
                }
            });

            // Рисуем линии поэтапно
            if (combo.data.drawings) {
                combo.data.drawings.forEach((d, i) => {
                    // Создаем SVG-элемент как в drawing.js
                    let el = null;
                    if (d.type === 'arrow' || d.type === 'line' || d.type === 'dashed' || d.type === 'screen' || d.type === 'rebound') {
                        el = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                        el.setAttribute('x1', d.points.x1 || d.points.startX);
                        el.setAttribute('y1', d.points.y1 || d.points.startY);
                        el.setAttribute('x2', d.points.x2 || d.points.endX);
                        el.setAttribute('y2', d.points.y2 || d.points.endY);
                        
                        const cfg = { color: '#007aff', sw: 0.7, dash: 'none' };
                        if (d.type === 'arrow') cfg.color = '#007aff';
                        else if (d.type === 'dashed') { cfg.color = '#34c759'; cfg.dash = '2,2'; }
                        else if (d.type === 'line') cfg.color = '#ff3b30';
                        else if (d.type === 'screen') { cfg.color = '#ff9500'; cfg.sw = 1.5; }
                        else if (d.type === 'rebound') { cfg.color = '#af52de'; cfg.dash = '3,2'; }
                        
                        el.setAttribute('stroke', cfg.color);
                        el.setAttribute('stroke-width', String(cfg.sw));
                        el.setAttribute('stroke-dasharray', cfg.dash);
                        el.setAttribute('class', 'drawing-element');
                    } else if (d.type === 'wavy') {
                        el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                        el.setAttribute('d', d.points.path || '');
                        el.setAttribute('stroke', '#5ac8fa');
                        el.setAttribute('stroke-width', '0.7');
                        el.setAttribute('fill', 'none');
                        el.setAttribute('class', 'drawing-element');
                    } else if (d.type === 'shot') {
                        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                        g.setAttribute('class', 'drawing-element shot-element');
                        const size = 2;
                        const l1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                        l1.setAttribute('x1', d.points.x - size);
                        l1.setAttribute('y1', d.points.y - size);
                        l1.setAttribute('x2', d.points.x + size);
                        l1.setAttribute('y2', d.points.y + size);
                        l1.setAttribute('stroke', '#ff3b30');
                        l1.setAttribute('stroke-width', '0.8');
                        l1.setAttribute('stroke-linecap', 'round');
                        const l2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                        l2.setAttribute('x1', d.points.x + size);
                        l2.setAttribute('y1', d.points.y - size);
                        l2.setAttribute('x2', d.points.x - size);
                        l2.setAttribute('y2', d.points.y + size);
                        l2.setAttribute('stroke', '#ff3b30');
                        l2.setAttribute('stroke-width', '0.8');
                        l2.setAttribute('stroke-linecap', 'round');
                        g.appendChild(l1);
                        g.appendChild(l2);
                        el = g;
                    }
                    
                    if (el) {
                        const did = 'drawing-cb-' + (++drawingManager.drawingCounter);
                        el.setAttribute('id', did);
                        layers.drawing.appendChild(el);
                        drawingManager.getDrawings().push({ id: did, type: d.type, element: el, points: d.points });
                    }

                    // Снэпшот после каждого рисунка — с outerHTML
                    comboSnapshots.push({
                        timestamp: (i + 1) * 500,
                        data: {
                            players: JSON.parse(JSON.stringify(playerManager.getPlayersData())),
                            drawings: drawingManager.getDrawings().map(dd => ({
                                type: dd.type,
                                element: dd.element.outerHTML,
                                points: dd.points || {}
                            }))
                        }
                    });
                });
            }

            recordedSnapshots = comboSnapshots;
            playBtn.classList.remove('disabled');
            updatePlayerCount();
            showToast('✅ "' + combo.name + '" — нажмите ▶️');
        };

        catBtns.forEach(b => {
            b.addEventListener('click', function() {
                catBtns.forEach(x => x.classList.remove('active'));
                this.classList.add('active');
                playbookManager.render(this.dataset.category, grid);
            });
        });
        playbookManager.render('basic', grid);
    }

    // ============================================
    // TOAST
    // ============================================
    function showToast(msg) {
        let toast = document.getElementById('toast');
        if (!toast) { toast = document.createElement('div'); toast.id = 'toast'; toast.className = 'toast'; document.body.appendChild(toast); }
        toast.textContent = msg;
        toast.classList.add('show');
        clearTimeout(toast._timer);
        toast._timer = setTimeout(() => toast.classList.remove('show'), 2000);
    }

    // ============================================
    // INIT
    // ============================================
    initSaveSystem();
    initPlaybookLibrary();
    updatePlayerCount();
    console.log('🏀 v4.5 — Playback with outerHTML');
});