// js/modules/timelinePlayer.js
/**
 * Проигрыватель комбинаций по таймлайну (ключевые кадры + события).
 * Интерполяция в requestAnimationFrame для плавного, детерминированного воспроизведения.
 */
export class TimelinePlayer {
    constructor() {
        this.timeline = null;
        this.actors = []; // { id, type, element, keyframes: [{t,x,y}], baseX, baseY }
        this.drawEvents = []; // { spec, element, created }
        this.duration = 0;
        this.startTime = 0;
        this.rafId = null;
        this.playing = false;
        this.speed = 1;
        this.elapsed = 0;
        this.onProgress = null; // (progress01, elapsedMs)
        this.onEnd = null;
        this.ctx = null; // { layers, playerManager, drawingManager }
    }

    load(timeline, ctx) {
        this.stop();
        this.timeline = timeline;
        this.ctx = ctx;
        this.duration = timeline.duration || 5000;
        this.actors = [];
        this.drawEvents = [];
        this.elapsed = 0;

        const { layers, playerManager, drawingManager } = ctx;

        // Очистка площадки
        while (layers.players.firstChild) layers.players.removeChild(layers.players.firstChild);
        while (layers.drawing.firstChild) layers.drawing.removeChild(layers.drawing.firstChild);
        playerManager.getPlayers().length = 0;
        drawingManager.getDrawings().length = 0;
        drawingManager.drawingCounter = 0;

        // Создаём акторов в начальном состоянии
        const initial = timeline.initialPlayers || [];
        initial.forEach((p, i) => {
            const before = playerManager.getPlayers().length;
            playerManager.addPlayer(p.x, p.y, p.type);
            const created = playerManager.getPlayers()[playerManager.getPlayers().length - 1];
            if (!created) return;
            const track = (timeline.tracks && (timeline.tracks[i] || timeline.tracks[p.id] || timeline.tracks[p.type])) || [{ t: 0, x: p.x, y: p.y }];
            const normTrack = this._normalizeTrack(track, p.x, p.y);
            this.actors.push({
                index: i,
                type: p.type,
                element: created.element,
                playerRef: created,
                track: normTrack,
                baseX: p.x,
                baseY: p.y
            });
        });

        // Подготовка событий рисования (создадим по мере наступления времени)
        (timeline.drawings || []).forEach(spec => {
            this.drawEvents.push({ spec: { ...spec }, element: null, markerElement: null, shown: false });
        });

        // Применяем начальный кадр
        this._applyTime(0);
    }

    _normalizeTrack(track, defX, defY) {
        if (!track || !track.length) return [{ t: 0, x: defX, y: defY }];
        const sorted = [...track].sort((a, b) => a.t - b.t);
        return sorted.map(k => ({
            t: typeof k.t === 'number' ? k.t : 0,
            x: typeof k.x === 'number' ? k.x : defX,
            y: typeof k.y === 'number' ? k.y : defY
        }));
    }

    play(speed = 1) {
        if (!this.timeline || this.playing) return false;
        this.speed = speed || 1;
        this.playing = true;
        this.startTime = performance.now() - this.elapsed / this.speed;
        const tick = (now) => {
            if (!this.playing) return;
            this.elapsed = (now - this.startTime) * this.speed;
            if (this.elapsed >= this.duration) {
                this.elapsed = this.duration;
                this._applyTime(this.elapsed);
                if (this.onProgress) this.onProgress(1, this.elapsed);
                this.playing = false;
                if (this.onEnd) this.onEnd();
                return;
            }
            this._applyTime(this.elapsed);
            if (this.onProgress) this.onProgress(this.elapsed / this.duration, this.elapsed);
            this.rafId = requestAnimationFrame(tick);
        };
        this.rafId = requestAnimationFrame(tick);
        return true;
    }

    pause() {
        this.playing = false;
        if (this.rafId) cancelAnimationFrame(this.rafId);
        this.rafId = null;
    }

    stop() {
        this.pause();
        this.elapsed = 0;
    }

    seek(ms) {
        this.elapsed = Math.max(0, Math.min(ms, this.duration));
        this._applyTime(this.elapsed);
        if (this.onProgress) this.onProgress(this.duration ? this.elapsed / this.duration : 0, this.elapsed);
    }

    _applyTime(t) {
        // Акторы
        for (const actor of this.actors) {
            const pos = this._sampleTrack(actor.track, t);
            this._setActorPosition(actor, pos.x, pos.y);
        }
        // Рисования/события
        for (const ev of this.drawEvents) {
            this._applyDrawEvent(ev, t);
        }
    }

    _sampleTrack(track, t) {
        if (!track.length) return { x: 0, y: 0 };
        if (t <= track[0].t) return { x: track[0].x, y: track[0].y };
        const last = track[track.length - 1];
        if (t >= last.t) return { x: last.x, y: last.y };
        // найти сегмент
        let i = 0;
        while (i < track.length - 1 && track[i + 1].t < t) i++;
        const a = track[i];
        const b = track[i + 1] || a;
        const span = (b.t - a.t) || 1;
        let p = (t - a.t) / span;
        p = this._easeInOut(p);
        return {
            x: a.x + (b.x - a.x) * p,
            y: a.y + (b.y - a.y) * p
        };
    }

    _easeInOut(p) {
        return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    }

    _setActorPosition(actor, x, y) {
        const el = actor.element;
        if (!el) return;
        actor.playerRef.x = x;
        actor.playerRef.y = y;
        el.setAttribute('data-x', x);
        el.setAttribute('data-y', y);

        if (el.tagName === 'circle') {
            el.setAttribute('cx', x);
            el.setAttribute('cy', y);
            el.setAttribute('transform', '');
        } else {
            el.setAttribute('transform', '');
            const circle = el.querySelector('circle');
            const text = el.querySelector('text');
            if (circle) { circle.setAttribute('cx', x); circle.setAttribute('cy', y); }
            if (text) { text.setAttribute('x', x); text.setAttribute('y', y + 1.2); }
        }
    }

    _applyDrawEvent(ev, t) {
        const s = ev.spec;
        const t0 = s.t0 ?? 0;
        const t1 = s.t1 ?? (t0 + 400);
        if (t < t0) {
            if (ev.shown && ev.element) {
                ev.element.style.display = 'none';
                if (ev.markerElement) ev.markerElement.style.display = 'none';
                ev.shown = false;
            }
            return;
        }
        if (!ev.element) {
            this._createDrawElement(ev);
        }
        if (!ev.element) return;
        ev.element.style.display = '';
        if (ev.markerElement) ev.markerElement.style.display = '';
        ev.shown = true;

        const dur = Math.max(1, t1 - t0);
        let p = (t - t0) / dur;
        if (p > 1) p = 1;
        // прогрессивная отрисовка линий
        this._setDrawProgress(ev, p);
    }

    _createDrawElement(ev) {
        const s = ev.spec;
        const { layers, drawingManager } = this.ctx;
        const svgNS = 'http://www.w3.org/2000/svg';
        let el = null;

        if (s.type === 'screen') {
            const x1 = s.x1 ?? s.startX, y1 = s.y1 ?? s.startY;
            const x2 = s.x2 ?? s.endX, y2 = s.y2 ?? s.endY;
            const dx = x2 - x1, dy = y2 - y1;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            const ux = dx / len, uy = dy / len;
            const nx = -uy, ny = ux;
            const barLen = s.barLength || 6;
            const stemLen = s.stemLength || 4;
            const hb = barLen / 2;
            const color = s.color || '#ff9500';
            const sw = s.strokeWidth || 1.6;

            const g = document.createElementNS(svgNS, 'g');
            g.setAttribute('class', 'drawing-element screen-element timeline-drawing');

            const bar = document.createElementNS(svgNS, 'line');
            bar.setAttribute('x1', x1 + nx * hb); bar.setAttribute('y1', y1 + ny * hb);
            bar.setAttribute('x2', x1 - nx * hb); bar.setAttribute('y2', y1 - ny * hb);
            bar.setAttribute('stroke', color);
            bar.setAttribute('stroke-width', String(sw));
            bar.setAttribute('stroke-linecap', 'round');

            const stem = document.createElementNS(svgNS, 'line');
            stem.setAttribute('x1', x1); stem.setAttribute('y1', y1);
            stem.setAttribute('x2', x1 + ux * stemLen); stem.setAttribute('y2', y1 + uy * stemLen);
            stem.setAttribute('stroke', color);
            stem.setAttribute('stroke-width', String(sw));
            stem.setAttribute('stroke-linecap', 'round');

            g.appendChild(bar);
            g.appendChild(stem);
            el = g;
        } else if (s.type === 'arrow' || s.type === 'line' || s.type === 'dashed' || s.type === 'rebound' || s.type === 'pass') {
            el = document.createElementNS(svgNS, 'line');
            el.setAttribute('x1', s.x1); el.setAttribute('y1', s.y1);
            el.setAttribute('x2', s.x2); el.setAttribute('y2', s.y2);
            let color = s.color || '#007aff';
            let sw = s.strokeWidth || 0.8;
            let dash = s.dash || 'none';
            if (s.type === 'dashed') { color = s.color || '#34c759'; dash = s.dash || '2,2'; }
            if (s.type === 'line') { color = s.color || '#ff3b30'; }
            if (s.type === 'pass') { color = s.color || '#ffcc00'; sw = s.strokeWidth || 0.9; dash = s.dash || '3,2'; }
            if (s.type === 'rebound') { color = s.color || '#af52de'; dash = s.dash || '3,2'; }
            el.setAttribute('stroke', color);
            el.setAttribute('stroke-width', String(sw));
            el.setAttribute('stroke-dasharray', dash);
            el.setAttribute('stroke-linecap', 'round');
            el.setAttribute('class', 'drawing-element timeline-drawing');
            if (s.type === 'arrow') {
                // Наконечник только для стрелки "Движение"
                const id = 'tl-arrow-' + (++drawingManager.drawingCounter);
                const defs = document.createElementNS(svgNS, 'defs');
                const marker = document.createElementNS(svgNS, 'marker');
                const path = document.createElementNS(svgNS, 'path');
                marker.setAttribute('id', id);
                marker.setAttribute('markerUnits', 'userSpaceOnUse');
                marker.setAttribute('markerWidth', '5');
                marker.setAttribute('markerHeight', '3.5');
                marker.setAttribute('refX', '5');
                marker.setAttribute('refY', '1.75');
                marker.setAttribute('orient', 'auto');
                path.setAttribute('d', 'M0,0 L0,3.5 L5,1.75 z');
                path.setAttribute('fill', color);
                marker.appendChild(path);
                defs.appendChild(marker);
                layers.drawing.appendChild(defs);
                ev.markerElement = defs;
                el.setAttribute('marker-end', `url(#${id})`);
            }
        } else if (s.type === 'wavy') {
            el = document.createElementNS(svgNS, 'path');
            el.setAttribute('d', s.d || s.path || '');
            el.setAttribute('stroke', s.color || '#5ac8fa');
            el.setAttribute('stroke-width', String(s.strokeWidth || 0.7));
            el.setAttribute('fill', 'none');
            el.setAttribute('class', 'drawing-element timeline-drawing');
        } else if (s.type === 'shot') {
            const g = document.createElementNS(svgNS, 'g');
            g.setAttribute('class', 'drawing-element shot-element timeline-drawing');
            const size = s.size || 2.2;
            const l1 = document.createElementNS(svgNS, 'line');
            l1.setAttribute('x1', s.x - size); l1.setAttribute('y1', s.y - size);
            l1.setAttribute('x2', s.x + size); l1.setAttribute('y2', s.y + size);
            l1.setAttribute('stroke', s.color || '#ff3b30'); l1.setAttribute('stroke-width', '0.9'); l1.setAttribute('stroke-linecap', 'round');
            const l2 = document.createElementNS(svgNS, 'line');
            l2.setAttribute('x1', s.x + size); l2.setAttribute('y1', s.y - size);
            l2.setAttribute('x2', s.x - size); l2.setAttribute('y2', s.y + size);
            l2.setAttribute('stroke', s.color || '#ff3b30'); l2.setAttribute('stroke-width', '0.9'); l2.setAttribute('stroke-linecap', 'round');
            g.appendChild(l1); g.appendChild(l2);
            el = g;
        } else if (s.type === 'label') {
            const text = document.createElementNS(svgNS, 'text');
            text.setAttribute('x', s.x); text.setAttribute('y', s.y);
            text.setAttribute('fill', s.color || '#fff');
            text.setAttribute('font-size', String(s.fontSize || 5));
            text.setAttribute('font-weight', '700');
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('class', 'timeline-drawing');
            text.textContent = s.text || '';
            el = text;
        }

        if (el) {
            el.style.display = 'none';
            layers.drawing.appendChild(el);
            ev.element = el;
            if (el.tagName === 'line' || el.tagName === 'path') {
                try {
                    const len = el.getTotalLength ? el.getTotalLength() : 0;
                    if (len > 0) {
                        ev.totalLength = len;
                        const baseDash = el.getAttribute('stroke-dasharray');
                        ev.baseDash = (!baseDash || baseDash === 'none') ? null : baseDash;
                    }
                } catch (e) { /* ignore */ }
            }
        }
    }

    _setDrawProgress(ev, p) {
        const el = ev.element;
        if (!el) return;
        // shot/label: просто появление (можно масштабировать, но просто show достаточно)
        if (ev.spec.type === 'shot' || ev.spec.type === 'label' || el.tagName === 'g' || el.tagName === 'text') {
            el.style.opacity = p < 0.1 ? (p / 0.1) : 1;
            return;
        }
        if (ev.totalLength && (el.tagName === 'line' || el.tagName === 'path')) {
            const len = ev.totalLength;
            const draw = len * p;
            // Для пунктирных сохраняем паттерн неидеально, но для сплошных/стрелок ок
            if (!ev.baseDash) {
                el.setAttribute('stroke-dasharray', `${draw} ${len}`);
            } else {
                // простая прогрессивная маска: переключаемся на полную когда дорисовано
                if (p < 1) {
                    el.setAttribute('stroke-dasharray', `${draw} ${len}`);
                } else {
                    el.setAttribute('stroke-dasharray', ev.baseDash);
                }
            }
            el.setAttribute('stroke-dashoffset', '0');
        }
    }

    isPlaying() { return this.playing; }
    getDuration() { return this.duration; }
}
