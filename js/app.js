// js/app.js v5.1 — Timeline playback PoC + UX fixes
import { CourtManager } from './modules/court.js';
import { PlayerManager } from './modules/players.js';
import { DrawingManager } from './modules/drawing.js';
import { HistoryManager } from './modules/history.js';
import { TouchManager } from './modules/touch.js';
import { StorageManager } from './modules/storage.js';
import { PlaybookManager } from './modules/playbook.js';
import { RecorderManager } from './modules/recorder.js';
import { TimelinePlayer } from './modules/timelinePlayer.js';
import { setIcon, iconMarkup } from './modules/icons.js';

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

    function showConfirm(message, icon = 'warning', isLoad = false) {
        return new Promise((resolve) => {
            confirmMsg.textContent = message;
            if (!setIcon(confirmIcon, icon)) confirmIcon.textContent = icon;
            confirmIcon.dataset.tone = icon === 'trash' ? 'danger'
                : (icon === 'warning' ? 'warning' : 'primary');
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
    // Позиции, которые могут быть на площадке только в одном экземпляре.
    // defense намеренно не входит: защитников обычно нужно несколько.
    const UNIQUE_PLAYER_TYPES = new Set(['PG', 'SG', 'SF', 'PF', 'C', 'ball']);
    let recordedSnapshots = [];
    let lastLoadedComboName = '';
    let activeTimeline = null;
    const timelinePlayer = new TimelinePlayer();

    // History callbacks — при любом изменении (игрок или рисунок) сохраняем снэпшот
    // ВАЖНО: captureSnapshot вызываем ТОЛЬКО если идёт запись, чтобы не испортить playback
    playerManager.onHistoryChange = (action) => {
        historyManager.push(action);
        syncHistoryButtons();
        if (recorderManager.isRecording) {
            recorderManager.captureFrame();
            captureSnapshot();
        }
    };
    drawingManager.onHistoryChange = (action) => {
        historyManager.push(action);
        syncHistoryButtons();
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

    // Компактный режим: Drawing виден по умолчанию, Players/History живут в выносных лотках.
    let compactView = 'drawing';
    const compactTrays = {
        players: document.getElementById('players-tray'),
        history: document.getElementById('history-tray')
    };

    function setCompactView(view) {
        compactView = view;
        Object.entries(compactTrays).forEach(([name, tray]) => {
            const open = view === name;
            bottomPanel.classList.toggle(name + '-open', open);
            if (tray) tray.setAttribute('aria-hidden', open ? 'false' : 'true');
        });
    }

    function updateSheet(state, instant = false) {
        sheetState = state;

        bottomPanel.classList.remove('collapsed', 'half', 'hint-bob');

        if (state === 'collapsed') {
            bottomPanel.style.transform = `translateY(calc(100% - ${HANDLE_HEIGHT}px))`;
            bottomPanel.style.maxHeight = '';
            bottomPanel.classList.add('collapsed');
            handleArrow.classList.add('rotated');
        } else if (state === 'half') {
            // Компактный режим: только секция игроков (остальное раскрывается вручную)
            bottomPanel.style.transform = 'translateY(0)';
            bottomPanel.style.maxHeight = '';
            bottomPanel.classList.add('half', 'hint-bob');
            handleArrow.classList.remove('rotated');
        } else {
            bottomPanel.style.transform = 'translateY(0)';
            bottomPanel.style.maxHeight = '';
            handleArrow.classList.remove('rotated');
            // В раскрытом меню обе группы видны — лотки больше не нужны.
            if (compactView !== 'drawing') setCompactView('drawing');
        }

        if (instant) {
            bottomPanel.style.transition = 'none';
            requestAnimationFrame(() => { bottomPanel.style.transition = ''; });
        }
    }

    // Авто-сворачивание при начале рисования
    function autoCollapsePanel() {
        if (sheetState === 'expanded') {
            updateSheet('collapsed', false);
        }
    }

    updateSheet('half');

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

            const panelHeight = bottomPanel.offsetHeight || 300;
            const threshold = Math.max(40, panelHeight * 0.18);

            if (sheetStartState === 'half') {
                if (dy < -threshold) updateSheet('expanded');
                else if (dy > threshold) updateSheet('collapsed');
                else updateSheet('half');
                return;
            }

            if (sheetStartState === 'collapsed') {
                if (dy < -threshold) updateSheet('expanded');
                else updateSheet('collapsed');
                return;
            }

            // expanded
            if (dy > threshold) updateSheet('half');
            else updateSheet('expanded');
        }, { passive: true });
    });

    panelHandle.addEventListener('click', () => {
        if (sheetState === 'expanded') updateSheet('half');
        else if (sheetState === 'half') updateSheet('expanded');
        else updateSheet('half');
    });

    // ============================================
    // PLAYERS TRAY — выносная группа расстановки
    // ============================================
    function countDefenders() {
        return playerManager.getPlayers().filter(p => p.type === 'defense').length;
    }

    function updateDefCounter() {
        const el = document.getElementById('def-counter');
        if (el) el.textContent = 'DEF ' + countDefenders() + '/5';
    }

    // Доступность Undo/Redo и счётчик в History-лотке (и в раскрытой панели).
    function syncHistoryButtons() {
        const canUndo = historyManager.canUndo();
        const canRedo = historyManager.canRedo();
        document.querySelectorAll('.tool-btn[data-action="undo"]').forEach(b => { b.disabled = !canUndo; });
        document.querySelectorAll('.tool-btn[data-action="redo"]').forEach(b => { b.disabled = !canRedo; });
        const counter = document.getElementById('history-counter');
        if (counter) counter.textContent = 'UNDO ' + (historyManager.currentIndex + 1);
    }

    function openPlayersTray() {
        deactivateTool();
        syncPlayerButtons();
        updateDefCounter();
        updateSheet('half');
        setCompactView('players');
    }

    function openHistoryTray() {
        deactivateTool();
        syncHistoryButtons();
        updateSheet('half');
        setCompactView('history');
    }

    function closeCompactTray() {
        setCompactView('drawing');
        deactivateTool();
    }

    const trayToggles = [
        { el: document.getElementById('players-tray-toggle'), view: 'players' },
        { el: document.getElementById('history-tray-toggle'), view: 'history' }
    ];
    // Лотки и кнопки лежат внутри панели — не даём их касаниям запускать drag-жест.
    ['touchstart', 'touchend', 'mousedown'].forEach(evt => {
        trayToggles.forEach(({ el }) => el?.addEventListener(evt, e => e.stopPropagation(), { passive: true }));
        Object.values(compactTrays).forEach(tray => tray?.addEventListener(evt, e => e.stopPropagation(), { passive: true }));
    });
    trayToggles.forEach(({ el, view }) => {
        el?.addEventListener('click', (e) => {
            e.stopPropagation();
            if (compactView === view) closeCompactTray();
            else if (view === 'players') openPlayersTray();
            else openHistoryTray();
            haptic();
        });
    });

    document.querySelectorAll('[data-tray-done]').forEach(btn => {
        btn.addEventListener('click', () => {
            closeCompactTray();
            haptic();
        });
    });

    document.getElementById('clear-players-btn')?.addEventListener('click', async () => {
        const confirmed = await showConfirm('Очистить игроков?', 'trash', false);
        if (!confirmed) return;
        playerManager.clearAll();
        updatePlayerCount();
        showToast('Игроки очищены', 'trash');
        openPlayersTray();
        haptic();
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
    // TOOL SELECTION & HINTS
    // ============================================
    const POSITION_HINTS = {
        'PG': 'Разыгрывающий защитник',
        'SG': 'Атакующий защитник',
        'SF': 'Легкий форвард',
        'PF': 'Тяжелый форвард',
        'C': 'Центровой',
        'defense': 'Защитник',
        'ball': 'Мяч'
    };

    // Подпись + иконка для подсказок и тостов. Иконки берём из iconpack,
    // эмодзи в интерфейсе больше не используются.
    const HINT_META = {
        'PG': { label: 'PG', icon: 'PG' },
        'SG': { label: 'SG', icon: 'SG' },
        'SF': { label: 'SF', icon: 'SF' },
        'PF': { label: 'PF', icon: 'PF' },
        'C': { label: 'C', icon: 'C' },
        'defense': { label: 'Защитник', icon: 'DEF' },
        'ball': { label: 'Мяч', icon: 'ball' },
        'arrow': { label: 'Движение', icon: 'arrow' },
        'line': { label: 'Линия', icon: 'line' },
        'dashed': { label: 'Передача', icon: 'pass' },
        'wavy': { label: 'Ведение', icon: 'wavy' },
        'screen': { label: 'Заслон', icon: 'screen' },
        'shot': { label: 'Бросок', icon: 'shot' },
        'rebound': { label: 'Подбор', icon: 'rebound' },
        'eraser': { label: 'Ластик', icon: 'eraser' }
    };

    // Один набор кнопок на две локации: постоянная группа в expanded и выносной лоток.
    const toolButtons = document.querySelectorAll('#tools-section .tool-btn, #players-tray .tool-btn, #history-tray .tool-btn');
    const hintText = document.getElementById('hint-text');

    // Плавающая подсказка под шапкой (не перекрывается нижней панелью)
    const floatingHint = document.createElement('div');
    floatingHint.id = 'floating-hint';
    floatingHint.className = 'floating-hint';
    document.body.appendChild(floatingHint);

    // Индикатор активного инструмента в шапке
    const activeToolChip = document.getElementById('active-tool-chip');
    const activeToolChipIcon = document.getElementById('active-tool-chip-icon');
    const activeToolChipLabel = document.getElementById('active-tool-chip-label');

    const TOOL_CHIP_COLORS = {
        pg: '#3366ff', sg: '#33ccff', sf: '#00cc99', pf: '#99cc00',
        c: '#ffcc00', defense: '#ef4444', ball: '#8B4513',
        arrow: '#ff6b00', line: '#ef4444', dashed: '#22c55e', wavy: '#af52de',
        screen: '#ff9500', shot: '#ff3b30', rebound: '#ff3b30', eraser: '#f59e0b'
    };

    function withAlpha(hex, alpha) {
        const raw = hex.replace('#', '');
        const full = raw.length === 3 ? raw.split('').map(c => c + c).join('') : raw;
        const r = parseInt(full.slice(0, 2), 16);
        const g = parseInt(full.slice(2, 4), 16);
        const b = parseInt(full.slice(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    function showActiveToolChip(btn) {
        if (!activeToolChip || !btn) return;
        const iconEl = btn.querySelector('.tool-icon');
        const labelEl = btn.querySelector('.tool-label');
        const colorKey = Array.from(btn.classList).find(c => TOOL_CHIP_COLORS[c]);
        const label = labelEl ? labelEl.textContent.trim() : '';
        const iconText = iconEl ? iconEl.textContent.trim() : '';
        if (activeToolChipIcon) {
            const accent = colorKey ? TOOL_CHIP_COLORS[colorKey] : null;
            activeToolChipIcon.innerHTML = iconEl ? iconEl.innerHTML : '';
            activeToolChipIcon.style.background = accent ? withAlpha(accent, 0.18) : 'var(--bg-card)';
            activeToolChipIcon.style.color = accent || '#fff';
            activeToolChipIcon.style.borderColor = accent ? withAlpha(accent, 0.55) : 'transparent';
        }
        // Для позиций (PG/SG/... и DEF) иконка уже содержит abbreviation — подпись не нужна.
        const showLabel = label && !['PG', 'SG', 'SF', 'PF', 'C', 'DEF'].includes(label);
        if (activeToolChipLabel) activeToolChipLabel.textContent = showLabel ? label : '';
        activeToolChip.classList.toggle('no-label', !showLabel);
        activeToolChip.title = label || iconText;
        activeToolChip.hidden = false;
    }

    function hideActiveToolChip() {
        if (activeToolChip) activeToolChip.hidden = true;
    }

    let hintTimer = null;
    let toastActive = false;
    const HINT_VISIBLE_MS = 5000;

    function showFloatingHint() {
        if (!currentTool || currentTool === 'select' || toastActive) {
            floatingHint.classList.remove('visible');
            return;
        }
        floatingHint.classList.add('visible');
        clearTimeout(hintTimer);
        hintTimer = setTimeout(() => floatingHint.classList.remove('visible'), HINT_VISIBLE_MS);
    }

    function hintTextValue(name, hint) {
        const n = (name || '').trim();
        const h = (hint || '').trim();
        // «Мяч — Мяч» → «Мяч»: если подпись и описание совпадают, оставляем одно.
        return !n ? h : (!h || h.toLowerCase() === n.toLowerCase()) ? n : n + ' — ' + h;
    }

    function hintContent(name, hint, iconName) {
        const icon = iconName ? iconMarkup(iconName, 'hint-icon') : '';
        return icon + '<span>' + hintTextValue(name, hint) + '</span>';
    }

    function setHint(toolName, hint, iconName) {
        // В компактной панели только текст: иконка там ломает выравнивание по вертикали.
        if (hintText) hintText.textContent = hintTextValue(toolName, hint);
        floatingHint.innerHTML = hintContent(toolName, hint, iconName);
        showFloatingHint();
    }

    toolButtons.forEach(btn => btn.classList.remove('active'));

    function playerTypeExists(type) {
        return playerManager.getPlayers().some(p => p.type === type);
    }

    // Блокируем уникальные позиции, уже занятые на площадке, и DEF после лимита в 5.
    function syncPlayerButtons() {
        const defCount = countDefenders();
        toolButtons.forEach(btn => {
            const tool = btn.dataset.tool;
            if (tool !== 'player' && tool !== 'ball') return;
            const type = btn.dataset.type;
            const used = UNIQUE_PLAYER_TYPES.has(type) && playerTypeExists(type);
            const defFull = type === 'defense' && defCount >= 5;
            const blocked = used || defFull;
            btn.classList.toggle('used', blocked);
            btn.disabled = blocked;
            if (blocked) btn.classList.remove('active');
        });
    }

    // После размещения игрока выключаем инструмент: одна позиция — одно размещение.
    function deactivateTool() {
        currentTool = null;
        currentToolType = null;
        playerManager.setTool(null, null);
        drawingManager.setTool(null, null);
        courtSvg.classList.remove('eraser-cursor');
        toolButtons.forEach(t => t.classList.remove('active'));
        floatingHint.classList.remove('visible');
        hideActiveToolChip();
        setHint('', 'Выберите позицию или инструмент');
    }

    // Иконки готовим до первой подсказки и чипа в шапке.
    initIcons();

    // Старт: сразу открываем Players — расстановка игроков — первое действие.
    // «Готово» убирает лоток и оставляет Drawing в компактном режиме.
    openPlayersTray();
    syncHistoryButtons();

    // Тактильный отклик (вибрация на мобильных)
    function haptic() {
        try { navigator.vibrate && navigator.vibrate(10); } catch(e) {}
    }

    toolButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const action = this.dataset.action;
            if (action === 'undo') { undoLastAction(); return; }
            if (action === 'redo') { redoLastAction(); return; }
            if (action === 'clear') { clearAllAction(); return; }
            toolButtons.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            setToolFromButton(this);
            haptic();
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

        const meta = HINT_META[type] || { label: type, icon: type };

        if (tool === 'player' || tool === 'ball') {
            if (UNIQUE_PLAYER_TYPES.has(type) && playerTypeExists(type)) {
                showToast(meta.label + ' уже на площадке', meta.icon);
                deactivateTool();
                syncPlayerButtons();
                return;
            }
            if (type === 'defense' && countDefenders() >= 5) {
                showToast('DEF 5/5 — максимум защитников', 'DEF');
                deactivateTool();
                syncPlayerButtons();
                return;
            }
            // В компактном режиме выбор позиции открывает лоток; в expanded просто вооружаем инструмент.
            if (sheetState !== 'expanded') setCompactView('players');
            currentTool = tool; currentToolType = type;
            playerManager.setTool(tool, type);
            const posDesc = POSITION_HINTS[type] || 'Нажмите на площадку';
            setHint(meta.label, posDesc, meta.icon);
            showActiveToolChip(btn);
            if (sheetState !== 'expanded') updateSheet('half');
        } else if (tool === 'drawing') {
            currentTool = 'drawing'; currentToolType = type;
            if (type === 'eraser') {
                drawingManager.setTool('drawing', 'eraser');
                courtSvg.classList.add('eraser-cursor');
                setHint(meta.label, 'Кликните на линию', meta.icon);
            } else {
                drawingManager.setTool('drawing', type);
                setHint(meta.label, 'Проведите по площадке', meta.icon);
            }
            // Drawing — компактный вид по умолчанию: площадка остаётся открытой.
            setCompactView('drawing');
            showActiveToolChip(btn);
            updateSheet('half');
        } else {
            currentTool = null;
            currentToolType = null;
            setCompactView('drawing');
            hideActiveToolChip();
            setHint('', 'Выберите инструмент');
            updateSheet('half');
        }
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
            if (UNIQUE_PLAYER_TYPES.has(currentToolType) && playerTypeExists(currentToolType)) {
                const busyMeta = HINT_META[currentToolType] || { label: currentToolType, icon: currentToolType };
                showToast(busyMeta.label + ' уже на площадке', busyMeta.icon);
                deactivateTool();
                return;
            }
            if (currentToolType === 'defense' && countDefenders() >= 5) {
                showToast('DEF 5/5 — максимум защитников', 'DEF');
                deactivateTool();
                return;
            }

            const placedType = currentToolType;
            const placed = playerManager.addPlayer(point.x, point.y);
            updatePlayerCount();

            // Фишка коротко «вылетает» из лотка на площадку.
            if (placed && placed.element) {
                placed.element.classList.add('pop-in');
                placed.element.addEventListener('animationend', () => placed.element.classList.remove('pop-in'), { once: true });
            }

            const placedMeta = HINT_META[placedType] || { label: placedType, icon: placedType };
            if (placedType === 'defense') {
                // Защитников можно ставить несколько подряд — лоток остаётся открытым.
                showToast('Защитник добавлен — DEF ' + countDefenders() + '/5', 'DEF');
            } else {
                // Уникальные позиции — одно размещение, но лоток остаётся открытым
                // до явного «Готово», чтобы можно было поставить следующую позицию.
                deactivateTool();
                showToast(placedMeta.label + ' добавлен', placedMeta.icon);
            }
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
        syncPlayerButtons();
        updateDefCounter();
    }

    function syncCourtToggle() {
        const icon = document.querySelector('#toggle-court .tool-icon');
        if (icon) icon.textContent = courtManager.isHalfCourt ? 'Full' : '1/2';
    }

    document.getElementById('toggle-court')?.addEventListener('click', function() {
        courtManager.toggleCourt();
        syncCourtToggle();
    });

    document.getElementById('reset-zoom')?.addEventListener('click', () => {
        courtManager.resetView();
        showToast('Масштаб сброшен', 'target');
    });

    // ============================================
    // UNDO / REDO / CLEAR
    // ============================================
    function undoLastAction() {
        const action = historyManager.undo();
        if (action) { undoAction(action); showToast('Отмена', 'undo'); } else showToast('Нет действий', 'warning');
        syncHistoryButtons();
    }
    function redoLastAction() {
        const action = historyManager.redo();
        if (action) { redoAction(action); showToast('Повтор', 'redo'); } else showToast('Нет действий', 'warning');
        syncHistoryButtons();
    }
    async function clearAllAction() {
        const confirmed = await showConfirm('Очистить всё?', 'trash', false);
        if (!confirmed) return;
        const savedDrawings = [...drawingManager.getDrawings()];
        if (savedDrawings.length > 0 && drawingManager.onHistoryChange) {
            drawingManager.onHistoryChange({ type: 'clear_all_drawings', drawings: savedDrawings });
        }
        drawingManager.clearAll();
        playerManager.clearAll();
        historyManager.clear();
        updatePlayerCount();
        syncHistoryButtons();
        recorderManager.captureFrame();
        captureSnapshot();
        showToast('Всё очищено', 'trash');
        // После очистки снова предлагаем расстановку игроков.
        openPlayersTray();
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
    const playbackHud = document.getElementById('playback-hud');
    const playbackFill = document.getElementById('playback-fill');
    const recStatus = document.getElementById('rec-status');
    const recordIndicator = document.getElementById('record-indicator');

    // Во время розыгрыша панель полностью скрывается, чтобы была видна вся площадка,
    // а прогресс и «Стоп» показываются в плавающем пульте.
    let courtViewBeforePlayback = null;

    function applyTimelineCourtView(timeline) {
        if (timeline && timeline.view === 'half') courtManager.setHalfCourt();
        else courtManager.setFullCourt();
        syncCourtToggle();
    }

    function enterPlaybackMode() {
        if (courtViewBeforePlayback === null) courtViewBeforePlayback = courtManager.isHalfCourt;
        applyTimelineCourtView(activeTimeline);
        document.body.classList.add('playback-mode');
        playbackHud.style.display = 'flex';
    }

    function exitPlaybackMode() {
        document.body.classList.remove('playback-mode');
        playbackHud.style.display = 'none';
        if (courtViewBeforePlayback !== null) {
            if (courtViewBeforePlayback) courtManager.setHalfCourt();
            else courtManager.setFullCourt();
            courtViewBeforePlayback = null;
            syncCourtToggle();
        }
    }

    recordBtn.addEventListener('click', function() {
        if (recorderManager.getStatus() === 'recording') stopRecording();
        else startRecording();
    });

    function startRecording() {
        timelinePlayer.stop();
        timelinePlayer.onProgress = null;
        timelinePlayer.onEnd = null;
        activeTimeline = null;
        playerManager.clearAll();
        drawingManager.clearAll();
        historyManager.clear();
        updatePlayerCount();
        syncHistoryButtons();
        recorderManager.clearRecording();
        recordedSnapshots = [];
        const ok = recorderManager.startRecording();
        if (!ok) return;
        recordBtn.classList.add('recording');
        recordBtn.querySelector('.rec-label').textContent = 'Стоп';
        setIcon(recordBtn.querySelector('.rec-icon'), 'stop');
        playBtn.classList.add('disabled');
        recordIndicator.style.display = 'flex';
        recStatus.textContent = '00:00';
        // Захватываем начальный пустой кадр
        captureSnapshot();
        showToast('Запись', 'record');
    }

    function stopRecording() {
        recorderManager.stopRecording();
        recordBtn.classList.remove('recording');
        recordBtn.querySelector('.rec-label').textContent = 'Запись';
        setIcon(recordBtn.querySelector('.rec-icon'), 'record');
        playBtn.classList.remove('disabled');
        recordIndicator.style.display = 'none';
        const d = ((Date.now() - recorderManager.recordingStartTime) / 1000).toFixed(1);
        recStatus.textContent = d + 's';
        showToast('Запись: ' + recordedSnapshots.length + ' шагов', 'stop');
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
            Math.floor(timestamp / 60000) + ':' + (String(Math.floor((timestamp % 60000) / 1000)).padStart(2, '0')) + '.' + String(Math.floor((timestamp % 1000) / 100)) :
            '00:' + String(Math.floor(timestamp / 1000)).padStart(2, '0') + '.' + String(Math.floor((timestamp % 1000) / 100));
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

    function finishPlaybackUI(message = 'Воспроизведение завершено') {
        exitPlaybackMode();
        stopPlaybackBtn.style.display = 'none';
        playBtn.style.display = 'flex';
        playbackFill.style.width = '0%';
        recStatus.textContent = '00:00';
        if (message) showToast(message, 'play');
    }

    playBtn.addEventListener('click', function() {
        if (timelinePlayer.isPlaying() || recorderManager.getStatus() === 'playing') return;

        // Таймлайн-комбинация (плавный сценарный розыгрыш)
        if (activeTimeline) {
            enterPlaybackMode();
            stopPlaybackBtn.style.display = 'flex';
            playBtn.style.display = 'none';
            playbackFill.style.width = '0%';
            timelinePlayer.load(activeTimeline, { layers, playerManager, drawingManager });
            timelinePlayer.onProgress = (p, elapsed) => {
                playbackFill.style.width = Math.min(p * 100, 100) + '%';
                const sec = Math.max(0, elapsed / 1000);
                const m = Math.floor(sec / 60);
                const s = (sec % 60).toFixed(1).padStart(4, '0');
                recStatus.textContent = String(m).padStart(2, '0') + ':' + s;
            };
            timelinePlayer.onEnd = () => {
                timelinePlayer.onProgress = null;
                timelinePlayer.onEnd = null;
                finishPlaybackUI('Розыгрыш завершён');
                updatePlayerCount();
            };
            timelinePlayer.play(1);
            return;
        }

        // Покадровое воспроизведение (запись/старые снапшоты)
        if (recordedSnapshots.length < 2) { showToast('Нет данных для воспроизведения', 'warning'); return; }

        enterPlaybackMode();
        stopPlaybackBtn.style.display = 'flex';
        playBtn.style.display = 'none';
        playbackFill.style.width = '0%';

        renderSnapshotFrame(recordedSnapshots[0].data);

        const totalDur = recordedSnapshots[recordedSnapshots.length - 1].timestamp || 5000;

        recorderManager.onFrame = (frame) => {
            if (frame.data) renderSnapshotFrame(frame.data);
            const prog = totalDur > 0 ? (frame.timestamp / totalDur) * 100 : 0;
            playbackFill.style.width = Math.min(prog, 100) + '%';
        };

        recorderManager.onPlaybackEnd = () => {
            exitPlaybackMode();
            stopPlaybackBtn.style.display = 'none';
            playBtn.style.display = 'flex';
            playbackFill.style.width = '0%';
            recorderManager.onFrame = null;
            recorderManager.onPlaybackEnd = null;
            showToast('Воспроизведение завершено', 'play');
        };

        recorderManager.startPlayback(recordedSnapshots, null, 1);
    });

    stopPlaybackBtn.addEventListener('click', function() {
        if (timelinePlayer.isPlaying() || activeTimeline) {
            timelinePlayer.stop();
            timelinePlayer.onProgress = null;
            timelinePlayer.onEnd = null;
        }
        recorderManager.stopPlayback();
        exitPlaybackMode();
        stopPlaybackBtn.style.display = 'none';
        playBtn.style.display = 'flex';
        playbackFill.style.width = '0%';
        recStatus.textContent = '00:00';
        recorderManager.onFrame = null;
        recorderManager.onPlaybackEnd = null;
        clearCourtLayers();
        updatePlayerCount();
        showToast('Стоп', 'stop');
    });

    function clearCourtLayers() {
        if (timelinePlayer.isPlaying()) timelinePlayer.stop();
        while (layers.players.firstChild) layers.players.removeChild(layers.players.firstChild);
        while (layers.drawing.firstChild) layers.drawing.removeChild(layers.drawing.firstChild);
        playerManager.getPlayers().length = 0;
        drawingManager.getDrawings().length = 0;
        drawingManager.drawingCounter = 0;
        syncPlayerButtons();
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
        if (!name) { showToast('Введите название', 'warning'); return; }
        // Сохраняем через attrs (включая marker для стрелок), с обратной совместимостью при загрузке
        const drawingsData = drawingManager.getDrawings().map(d => ({
            type: d.type,
            attrs: drawingManager._getElementAttrs(d.element),
            points: d.points || {}
        }));
        const res = storageManager.save(name, playerManager.getPlayersData(), drawingsData);
        if (res) {
            document.getElementById('scheme-name').value = '';
            renderSchemesList();
            showToast('Схема сохранена', 'save');
        }
    }

    function renderSchemesList() {
        const list = document.getElementById('schemes-list');
        const schemes = storageManager.getAll();
        list.innerHTML = '';
        if (!schemes.length) { list.innerHTML = `<div class="empty-state"><span class="empty-icon">${iconMarkup('folder')}</span>Нет схем</div>`; return; }
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
            const confirmed = await showConfirm('Удалить схему?', 'trash', false);
            if (!confirmed) return;
            storageManager.delete(this.dataset.id);
            renderSchemesList();
            showToast('Схема удалена', 'trash');
        }));
    }

    async function loadScheme(id) {
        const s = storageManager.load(id);
        if (!s) return;
        const confirmed = await showConfirm('Загрузить "' + s.name + '"?', 'download', true);
        if (!confirmed) return;
        timelinePlayer.stop();
        activeTimeline = null;
        recordedSnapshots = [];
        clearCourtLayers();
        if (s.players) s.players.forEach(p => playerManager.addPlayer(p.x, p.y, p.type));
        if (s.drawings) {
            s.drawings.forEach(d => {
                if (d.attrs) {
                    const did = 'drawing-' + (++drawingManager.drawingCounter);
                    const el = drawingManager.recreateElementFromAttrs(d.type, d.attrs, did);
                    if (el) {
                        layers.drawing.appendChild(el);
                        drawingManager.getDrawings().push({ id: did, type: d.type, element: el, points: d.points || {} });
                    }
                } else if (d.element) {
                    // Совместимость со старыми схемами (outerHTML)
                    const wrapper = document.createElement('div');
                    wrapper.innerHTML = d.element;
                    const el = wrapper.firstChild;
                    if (el) {
                        const did = 'drawing-' + (++drawingManager.drawingCounter);
                        el.setAttribute('id', did);
                        layers.drawing.appendChild(el);
                        drawingManager.getDrawings().push({ id: did, type: d.type, element: el, points: d.points || {} });
                    }
                }
            });
        }
        storageManager.setCurrentSchemeId(id);
        document.getElementById('scheme-name').value = s.name;
        playBtn.classList.add('disabled');
        recStatus.textContent = '00:00';
        updatePlayerCount();
        showToast('"' + s.name + '" загружена', 'folder');
    }

    // ============================================
    // PLAYBOOK LIBRARY
    // ============================================
    function initPlaybookLibrary() {
        const catBtns = document.querySelectorAll('#playbook-section .category-btn');
        const grid = document.getElementById('playbook-grid');

        playbookManager.onLoadCombo = async (combo) => {
            const confirmed = await showConfirm('Загрузить комбинацию "' + combo.name + '"?', 'clipboard', true);
            if (!confirmed) return;
            timelinePlayer.stop();
            timelinePlayer.onProgress = null;
            timelinePlayer.onEnd = null;
            recorderManager.stopPlayback();
            exitPlaybackMode();
            setCompactView('drawing');
            activeTimeline = null;
            recordedSnapshots = [];
            clearCourtLayers();
            lastLoadedComboName = combo.name;

            // Сценарный таймлайн: плавный розыгрыш по ключевым кадрам
            if (combo.timeline) {
                activeTimeline = combo.timeline;
                timelinePlayer.load(activeTimeline, { layers, playerManager, drawingManager });
                timelinePlayer.seek(0);
                applyTimelineCourtView(activeTimeline);
                playBtn.classList.remove('disabled');
                updatePlayerCount();
                recStatus.textContent = '00:00';
                // Кнопка Play живёт во вкладке Tools — показываем её сразу после загрузки.
                document.querySelector('.panel-tab[data-section="tools"]').click();
                showToast('"' + combo.name + '" — нажмите Play для розыгрыша', 'play');
                return;
            }

            // Старый формат: пошаговые снапшоты
            const comboSnapshots = [];

            if (combo.data && combo.data.players) combo.data.players.forEach(p => playerManager.addPlayer(p.x, p.y, p.type));

            comboSnapshots.push({
                timestamp: 0,
                data: {
                    players: JSON.parse(JSON.stringify(playerManager.getPlayersData())),
                    drawings: []
                }
            });

            if (combo.data && combo.data.drawings) {
                combo.data.drawings.forEach((d, i) => {
                    let el = null;
                    if (d.type === 'arrow' || d.type === 'line' || d.type === 'dashed' || d.type === 'rebound') {
                        el = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                        el.setAttribute('x1', d.points.x1 || d.points.startX);
                        el.setAttribute('y1', d.points.y1 || d.points.startY);
                        el.setAttribute('x2', d.points.x2 || d.points.endX);
                        el.setAttribute('y2', d.points.y2 || d.points.endY);

                        const cfg = { color: '#007aff', sw: 0.7, dash: 'none' };
                        if (d.type === 'arrow') cfg.color = '#007aff';
                        else if (d.type === 'dashed') { cfg.color = '#34c759'; cfg.dash = '2,2'; }
                        else if (d.type === 'line') cfg.color = '#ff3b30';
                        else if (d.type === 'rebound') { cfg.color = '#af52de'; cfg.dash = '3,2'; }

                        el.setAttribute('stroke', cfg.color);
                        el.setAttribute('stroke-width', String(cfg.sw));
                        el.setAttribute('stroke-dasharray', cfg.dash);
                        el.setAttribute('class', 'drawing-element');

                        if (d.type === 'arrow') {
                            const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
                            const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
                            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                            const mid = 'cb-arrow-' + (++drawingManager.drawingCounter);
                            marker.setAttribute('id', mid);
                            marker.setAttribute('markerUnits', 'userSpaceOnUse');
                            marker.setAttribute('markerWidth', '5');
                            marker.setAttribute('markerHeight', '3.5');
                            marker.setAttribute('refX', '5');
                            marker.setAttribute('refY', '1.75');
                            marker.setAttribute('orient', 'auto');
                            path.setAttribute('d', 'M0,0 L0,3.5 L5,1.75 z');
                            path.setAttribute('fill', cfg.color);
                            marker.appendChild(path);
                            defs.appendChild(marker);
                            layers.drawing.appendChild(defs);
                            el.setAttribute('marker-end', `url(#${mid})`);
                        }
                    } else if (d.type === 'screen') {
                        const svgNS = 'http://www.w3.org/2000/svg';
                        const sx = d.points.startX ?? d.points.x1;
                        const sy = d.points.startY ?? d.points.y1;
                        const ex = d.points.endX ?? d.points.x2;
                        const ey = d.points.endY ?? d.points.y2;
                        const dx = ex - sx, dy = ey - sy;
                        const len = Math.sqrt(dx * dx + dy * dy) || 1;
                        const ux = dx / len, uy = dy / len;
                        const nx = -uy, ny = ux;
                        const barLen = 6, stemLen = 4, hb = barLen / 2;
                        const color = '#ff9500', sw = 1.5;

                        const g = document.createElementNS(svgNS, 'g');
                        g.setAttribute('class', 'drawing-element screen-element');
                        const bar = document.createElementNS(svgNS, 'line');
                        bar.setAttribute('x1', sx + nx * hb); bar.setAttribute('y1', sy + ny * hb);
                        bar.setAttribute('x2', sx - nx * hb); bar.setAttribute('y2', sy - ny * hb);
                        bar.setAttribute('stroke', color);
                        bar.setAttribute('stroke-width', String(sw));
                        bar.setAttribute('stroke-linecap', 'round');
                        const stem = document.createElementNS(svgNS, 'line');
                        stem.setAttribute('x1', sx); stem.setAttribute('y1', sy);
                        stem.setAttribute('x2', sx + ux * stemLen); stem.setAttribute('y2', sy + uy * stemLen);
                        stem.setAttribute('stroke', color);
                        stem.setAttribute('stroke-width', String(sw));
                        stem.setAttribute('stroke-linecap', 'round');
                        g.appendChild(bar);
                        g.appendChild(stem);
                        el = g;
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
            showToast('"' + combo.name + '" — нажмите Play', 'play');
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
    function showToast(msg, iconName) {
        let toast = document.getElementById('toast');
        if (!toast) { toast = document.createElement('div'); toast.id = 'toast'; toast.className = 'toast'; document.body.appendChild(toast); }
        toast.innerHTML = '';
        if (iconName) {
            const iconWrap = document.createElement('span');
            iconWrap.className = 'toast-icon';
            iconWrap.innerHTML = iconMarkup(iconName);
            toast.appendChild(iconWrap);
        }
        const text = document.createElement('span');
        text.textContent = msg;
        toast.appendChild(text);
        // Тост и подсказка живут в одном месте — на время тоста прячем подсказку
        toastActive = true;
        clearTimeout(hintTimer);
        floatingHint.classList.remove('visible');
        toast.classList.add('show');
        clearTimeout(toast._timer);
        toast._timer = setTimeout(() => {
            toast.classList.remove('show');
            toastActive = false;
            showFloatingHint();
        }, 2000);
    }

    // ============================================
    // ICON INIT — все [data-icon] заменяются на SVG из icons.js
    // ============================================
    function initIcons() {
        document.querySelectorAll('[data-icon]').forEach(el => {
            setIcon(el, el.dataset.icon);
        });
    }

    // ============================================
    // INIT
    // ============================================
    initSaveSystem();
    initPlaybookLibrary();
    updatePlayerCount();
    console.log('🏀 Basketball Playbook — timeline PoC ready');
});
