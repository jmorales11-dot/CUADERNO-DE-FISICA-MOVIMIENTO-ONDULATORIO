/**
 * bundle.js - OndaLab Pro
 * Código empaquetado autónomo (sin dependencias CORS de ES Modules).
 * Funciona al 100% tanto con protocolo http:// como al hacer doble clic local en index.html (file:///).
 */

(function () {
  'use strict';

  // ==========================================================================
  // 1. MOTOR MATEMÁTICO (MathEngine)
  // ==========================================================================
  class MathEngine {
    static replacePowers(expr) {
      let idx = expr.indexOf('^');
      let guard = 0;
      while (idx !== -1 && guard++ < 50) {
        let leftStart = idx - 1;
        while (leftStart >= 0 && /\s/.test(expr[leftStart])) leftStart--;

        let left;
        if (expr[leftStart] === ')') {
          let depth = 1;
          let i = leftStart - 1;
          while (i >= 0 && depth > 0) {
            if (expr[i] === ')') depth++;
            else if (expr[i] === '(') depth--;
            i--;
          }
          left = expr.substring(i + 1, leftStart + 1);
          leftStart = i + 1;
        } else {
          let i = leftStart;
          while (i >= 0 && /[a-zA-Z0-9_.]/.test(expr[i])) i--;
          left = expr.substring(i + 1, leftStart + 1);
          leftStart = i + 1;
        }

        let rightStart = idx + 1;
        while (rightStart < expr.length && /\s/.test(expr[rightStart])) rightStart++;

        let right, rightEnd;
        if (expr[rightStart] === '(') {
          let depth = 1;
          let i = rightStart + 1;
          while (i < expr.length && depth > 0) {
            if (expr[i] === '(') depth++;
            else if (expr[i] === ')') depth--;
            i++;
          }
          right = expr.substring(rightStart, i);
          rightEnd = i;
        } else {
          let i = rightStart;
          while (i < expr.length && /[a-zA-Z0-9_.]/.test(expr[i])) i++;
          right = expr.substring(rightStart, i);
          rightEnd = i;
        }

        if (!left || !right) {
          expr = expr.replace('^', '**');
          break;
        }

        const replacement = `Math.pow(${left}, ${right})`;
        expr = expr.substring(0, leftStart) + replacement + expr.substring(rightEnd);
        idx = expr.indexOf('^');
      }
      return expr;
    }

    static normalizeExpression(rawExpr) {
      if (!rawExpr || typeof rawExpr !== 'string') return '0';

      let expr = rawExpr.trim().toLowerCase();

      // Español / sinónimos
      expr = expr.replace(/\bsen\b/g, 'sin');
      expr = expr.replace(/\btg\b/g, 'tan');
      expr = expr.replace(/\barcsen\b/g, 'asin');
      expr = expr.replace(/\barctg\b/g, 'atan');
      expr = expr.replace(/\bln\b/g, 'log');

      // Multiplicaciones implícitas
      expr = expr.replace(/(\d)\s*([a-zA-Z_])/g, '$1*$2');
      expr = expr.replace(/(\d)\s*\(/g, '$1*(');
      expr = expr.replace(/\)\s*\(/g, ')*(');
      expr = expr.replace(/\)\s*(\d)/g, ')*$1');
      expr = expr.replace(/\)\s*([a-zA-Z_])/g, ')*$1');
      expr = expr.replace(/\b([xtv])\s*\(/g, '$1*(');

      // Constantes
      expr = expr.replace(/\bpi\b/g, 'Math.PI');
      expr = expr.replace(/\be\b(?![a-z0-9_])/g, 'Math.E');

      // Funciones a Math.*
      const funcs = [
        'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2',
        'sinh', 'cosh', 'tanh', 'exp', 'log', 'log10', 'sqrt',
        'cbrt', 'abs', 'floor', 'ceil', 'round', 'sign'
      ];

      funcs.forEach(f => {
        const regex = new RegExp(`(?<!Math\\.)${f}\\(`, 'g');
        expr = expr.replace(regex, `Math.${f}(`);
      });

      // Potencias
      expr = this.replacePowers(expr);
      expr = expr.replace(/Math\.\*/g, 'Math.');

      return expr;
    }

    static compile(rawExpr) {
      if (!rawExpr || !rawExpr.trim()) {
        return {
          fn: () => 0,
          valid: false,
          error: 'La expresión está vacía',
          latex: 'y(x,t) = 0'
        };
      }

      try {
        const normalized = this.normalizeExpression(rawExpr);

        const forbidden = /([;`]|window|document|eval|Function|fetch|alert|console|XMLHttpRequest|import|export)/i;
        if (forbidden.test(normalized)) {
          throw new Error('Expresión contiene identificadores no permitidos');
        }

        const body = `
          "use strict";
          return (function(x, t, v) {
            const k = 1;
            const w = v;
            const omega = v;
            try {
              const val = ${normalized};
              return (typeof val === 'number' && !isNaN(val)) ? val : NaN;
            } catch(e) {
              return NaN;
            }
          });
        `;

        const factory = new Function(body);
        const fn = factory();

        // Prueba de evaluación
        const testVal = fn(1, 0, 1);
        if (isNaN(testVal) && !this.isExpectedSingularity(rawExpr, 1, 0, 1)) {
          const alt1 = fn(0.5, 0.5, 2);
          const alt2 = fn(-1, 1, 1);
          if (isNaN(alt1) && isNaN(alt2)) {
            return {
              fn: () => 0,
              valid: false,
              error: 'La expresión produce valores indefinidos o error de sintaxis',
              latex: this.toLatex(rawExpr)
            };
          }
        }

        return {
          fn,
          valid: true,
          error: null,
          latex: this.toLatex(rawExpr)
        };
      } catch (err) {
        return {
          fn: () => 0,
          valid: false,
          error: err.message || 'Error en sintaxis matemática',
          latex: this.toLatex(rawExpr)
        };
      }
    }

    static isExpectedSingularity(expr, x, t, v) {
      return expr.includes('/') || expr.toLowerCase().includes('tan') || expr.toLowerCase().includes('tg');
    }

    static toLatex(rawExpr) {
      if (!rawExpr || !rawExpr.trim()) return '0';
      let s = rawExpr.trim();

      s = s.replace(/\bsen\b/g, '\\sin');
      s = s.replace(/\bsin\b/g, '\\sin');
      s = s.replace(/\bcos\b/g, '\\cos');
      s = s.replace(/\btan\b|\btg\b/g, '\\tan');
      s = s.replace(/\bexp\b/g, '\\exp');
      s = s.replace(/\bln\b/g, '\\ln');
      s = s.replace(/\bsqrt\(([^)]+)\)/g, '\\sqrt{$1}');
      s = s.replace(/\bpi\b/gi, '\\pi');
      s = s.replace(/\*/g, ' \\cdot ');
      s = s.replace(/\^([a-zA-Z0-9_]+)/g, '^{$1}');
      s = s.replace(/\^\(([^)]+)\)/g, '^{$1}');
      s = s.replace(/(\d+)\s*\/\s*\(([^)]+)\)/g, '\\frac{$1}{$2}');

      return s;
    }

    static evaluateAt(waves, x, t) {
      let sum = 0;
      const values = [];

      for (let i = 0; i < waves.length; i++) {
        const wave = waves[i];
        let y = 0;
        if (wave.compiled && wave.compiled.valid) {
          try {
            y = wave.compiled.fn(x, t, wave.v ?? 1);
          } catch (e) {
            y = 0;
          }
        }
        values.push({
          id: wave.id,
          name: wave.name,
          color: wave.color,
          val: isNaN(y) ? 0 : y,
          visible: wave.visible,
          inSum: wave.inSum
        });

        if (wave.inSum && !isNaN(y) && isFinite(y)) {
          sum += y;
        }
      }

      return {
        x,
        t,
        components: values,
        resultant: sum
      };
    }

    static sampleWave(compiledFn, v, xMin, xMax, t, numPoints = 1200, yClamp = 100) {
      const points = [];
      const step = (xMax - xMin) / (numPoints - 1);
      let prevY = null;

      for (let i = 0; i < numPoints; i++) {
        const x = xMin + i * step;
        let y = NaN;

        try {
          y = compiledFn(x, t, v);
        } catch (e) {
          y = NaN;
        }

        const isSingular = isNaN(y) || !isFinite(y) || Math.abs(y) > yClamp;

        let isDiscontinuity = false;
        if (!isSingular && prevY !== null) {
          const dy = Math.abs(y - prevY);
          const derivative = dy / step;
          if (derivative > 150 && Math.sign(y) !== Math.sign(prevY) && (Math.abs(y) > 4 || Math.abs(prevY) > 4)) {
            isDiscontinuity = true;
          }
        }

        if (isSingular || isDiscontinuity) {
          points.push({ x, y: NaN, break: true });
          prevY = null;
        } else {
          points.push({ x, y, break: false });
          prevY = y;
        }
      }

      return points;
    }
  }

  // ==========================================================================
  // 2. GESTIÓN DEL ESTADO (StateManager & Themes)
  // ==========================================================================
  const THEMES = {
    darkPro: {
      name: 'Modo Oscuro Pro',
      bg: '#0b1120', // Slate profundo
      axisColor: '#94a3b8',
      majorGridColor: '#1e293b',
      minorGridColor: '#0f172a',
      textColor: '#f8fafc',
      resultantColor: '#a78bfa',
      vectorColor: '#fbbf24',
      crosshairColor: '#38bdf8'
    },
    geogebra: {
      name: 'GeoGebra Clásico',
      bg: '#ffffff',
      axisColor: '#334155',
      majorGridColor: '#cbd5e1',
      minorGridColor: '#f1f5f9',
      textColor: '#1e293b',
      resultantColor: '#8b5cf6',
      vectorColor: '#f59e0b',
      crosshairColor: '#475569'
    },
    milimetrado: {
      name: 'Papel Milimetrado',
      bg: '#f8fafd',
      axisColor: '#1e3a8a',
      majorGridColor: '#93c5fd',
      minorGridColor: '#dbeafe',
      textColor: '#0f172a',
      resultantColor: '#dc2626',
      vectorColor: '#ea580c',
      crosshairColor: '#2563eb'
    },
    cyberpunk: {
      name: 'Laboratorio Neón',
      bg: '#05050d',
      axisColor: '#06b6d4',
      majorGridColor: '#1e1b4b',
      minorGridColor: '#0f0f23',
      textColor: '#e0e7ff',
      resultantColor: '#f43f5e',
      vectorColor: '#10b981',
      crosshairColor: '#38bdf8'
    }
  };

  const COLOR_PALETTE = [
    '#2563eb', // Azul
    '#dc2626', // Rojo
    '#059669', // Esmeralda
    '#d97706', // Ámbar
    '#0891b2', // Cian
    '#7c3aed', // Púrpura
    '#db2777', // Rosa
    '#4f46e5'  // Índigo
  ];

  class StateManager {
    constructor() {
      this.listeners = new Map();

      // Estado con 3 ondas iniciales completas
      this.state = {
        waves: [
          {
            id: 'w1',
            name: 'y₁(x, t)',
            expr: '2 * sin(x - 2 * t)',
            v: 2,
            color: '#2563eb', // Azul
            lineWidth: 2.5,
            lineDash: 'solid',
            opacity: 0.95,
            visible: true,
            inSum: true,
            compiled: null
          },
          {
            id: 'w2',
            name: 'y₂(x, t)',
            expr: '1.8 * sin(x + 2 * t)',
            v: -2,
            color: '#dc2626', // Rojo
            lineWidth: 2.5,
            lineDash: 'dashed',
            opacity: 0.95,
            visible: true,
            inSum: true,
            compiled: null
          },
          {
            id: 'w3',
            name: 'y₃(x, t)',
            expr: '1.2 * cos(2 * (x - 2 * t))',
            v: 2,
            color: '#059669', // Verde Esmeralda
            lineWidth: 2.5,
            lineDash: 'dotted',
            opacity: 0.95,
            visible: true,
            inSum: true,
            compiled: null
          }
        ],

        resultant: {
          visible: true,
          color: '#a78bfa',
          lineWidth: 3.5,
          lineDash: 'solid',
          opacity: 1.0,
          fillArea: true,
          fillOpacity: 0.15,
          showVectors: true
        },

        time: {
          current: 0,
          isPlaying: false,
          speed: 1.0,
          direction: 1,
          max: 20,
          min: 0,
          step: 0.05
        },

        viewport: {
          xMin: -12,
          xMax: 12,
          yMin: -6,
          yMax: 6,
          autoCenter: true,
          lockAspectRatio: false,
          padding: 40
        },

        styles: {
          themeKey: 'darkPro',
          theme: { ...THEMES.darkPro },
          axisWidth: 2,
          majorGridWidth: 1.2,
          minorGridWidth: 0.6,
          minorGridVisible: true,
          majorGridVisible: true,
          fontSizeTicks: 12,
          fontSizeLabels: 14,
          showTickLabels: true,
          showArrows: true,
          showPropagationVectors: true,
          vectorSize: 24,
          vectorOpacity: 0.85
        },

        inspector: {
          active: false,
          x: 0,
          isHovering: false,
          pinned: false
        },

        modal: {
          isOpen: false,
          isMaximized: false,
          isMinimized: false,
          isFullscreen: false
        },

        didactic: {
          currentPresetId: 'estacionaria',
          userPrediction: null
        }
      };

      // Compilar ondas iniciales
      this.state.waves.forEach(w => {
        w.compiled = MathEngine.compile(w.expr);
      });
    }

    on(event, callback) {
      if (!this.listeners.has(event)) {
        this.listeners.set(event, new Set());
      }
      this.listeners.get(event).add(callback);
      return () => this.off(event, callback);
    }

    off(event, callback) {
      if (this.listeners.has(event)) {
        this.listeners.get(event).delete(callback);
      }
    }

    emit(event, data) {
      if (this.listeners.has(event)) {
        this.listeners.get(event).forEach(cb => {
          try { cb(data); } catch (e) { console.error(`Error en evento ${event}:`, e); }
        });
      }
      if (event !== '*' && this.listeners.has('*')) {
        this.listeners.get('*').forEach(cb => cb({ event, data }));
      }
    }

    getWaves() { return this.state.waves; }
    getWave(id) { return this.state.waves.find(w => w.id === id); }

    addWave(waveData = {}) {
      const nextIdx = this.state.waves.length + 1;
      const color = COLOR_PALETTE[(nextIdx - 1) % COLOR_PALETTE.length];
      const newWave = {
        id: 'w_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
        name: `y${this.toSubscript(nextIdx)}(x, t)`,
        expr: waveData.expr || `sin(x - 2 * t)`,
        v: waveData.v !== undefined ? waveData.v : 2,
        color: waveData.color || color,
        lineWidth: waveData.lineWidth || 2.5,
        lineDash: waveData.lineDash || (nextIdx % 2 === 0 ? 'dashed' : 'solid'),
        opacity: waveData.opacity !== undefined ? waveData.opacity : 0.9,
        visible: waveData.visible !== undefined ? waveData.visible : true,
        inSum: waveData.inSum !== undefined ? waveData.inSum : true,
        compiled: null
      };

      newWave.compiled = MathEngine.compile(newWave.expr);
      this.state.waves.push(newWave);
      this.emit('wavesChanged', this.state.waves);
      return newWave;
    }

    updateWave(id, changes) {
      const wave = this.getWave(id);
      if (!wave) return;

      let recompile = false;
      if (changes.expr !== undefined && changes.expr !== wave.expr) {
        wave.expr = changes.expr;
        recompile = true;
      }
      if (changes.v !== undefined) wave.v = changes.v;
      if (changes.color !== undefined) wave.color = changes.color;
      if (changes.lineWidth !== undefined) wave.lineWidth = changes.lineWidth;
      if (changes.lineDash !== undefined) wave.lineDash = changes.lineDash;
      if (changes.opacity !== undefined) wave.opacity = changes.opacity;
      if (changes.visible !== undefined) wave.visible = changes.visible;
      if (changes.inSum !== undefined) wave.inSum = changes.inSum;
      if (changes.name !== undefined) wave.name = changes.name;

      if (recompile) {
        wave.compiled = MathEngine.compile(wave.expr);
      }

      this.emit('waveUpdated', { wave, recompiled: recompile });
      this.emit('wavesChanged', this.state.waves);
    }

    removeWave(id) {
      const idx = this.state.waves.findIndex(w => w.id === id);
      if (idx !== -1) {
        this.state.waves.splice(idx, 1);
        this.state.waves.forEach((w, i) => {
          w.name = `y${this.toSubscript(i + 1)}(x, t)`;
        });
        this.emit('wavesChanged', this.state.waves);
      }
    }

    toSubscript(num) {
      const subs = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];
      return String(num).split('').map(d => subs[parseInt(d, 10)] || d).join('');
    }

    updateResultant(changes) {
      Object.assign(this.state.resultant, changes);
      this.emit('resultantUpdated', this.state.resultant);
    }

    setTime(t) {
      this.state.time.current = Math.max(this.state.time.min, Math.min(this.state.time.max, t));
      this.emit('timeUpdated', this.state.time.current);
    }

    stepTime(delta) {
      let nextT = this.state.time.current + delta;
      if (nextT > this.state.time.max) nextT = this.state.time.min;
      if (nextT < this.state.time.min) nextT = this.state.time.max;
      this.setTime(nextT);
    }

    togglePlay() {
      this.state.time.isPlaying = !this.state.time.isPlaying;
      this.emit('playStateChanged', this.state.time.isPlaying);
      return this.state.time.isPlaying;
    }

    setPlaying(isPlaying) {
      this.state.time.isPlaying = isPlaying;
      this.emit('playStateChanged', this.state.time.isPlaying);
    }

    setSpeed(speed) {
      this.state.time.speed = speed;
      this.emit('speedChanged', speed);
    }

    setViewport(xMin, xMax, yMin, yMax) {
      this.state.viewport.xMin = xMin;
      this.state.viewport.xMax = xMax;
      this.state.viewport.yMin = yMin;
      this.state.viewport.yMax = yMax;
      this.emit('viewportChanged', this.state.viewport);
    }

    resetViewport() {
      this.setViewport(-12, 12, -6, 6);
    }

    zoom(factor, centerWorldX = 0, centerWorldY = 0) {
      const vp = this.state.viewport;
      const newXMin = centerWorldX + (vp.xMin - centerWorldX) * factor;
      const newXMax = centerWorldX + (vp.xMax - centerWorldX) * factor;
      const newYMin = centerWorldY + (vp.yMin - centerWorldY) * factor;
      const newYMax = centerWorldY + (vp.yMax - centerWorldY) * factor;
      this.setViewport(newXMin, newXMax, newYMin, newYMax);
    }

    setTheme(themeKey) {
      if (THEMES[themeKey]) {
        this.state.styles.themeKey = themeKey;
        this.state.styles.theme = { ...THEMES[themeKey] };
        this.state.resultant.color = THEMES[themeKey].resultantColor;
        this.emit('stylesChanged', this.state.styles);
      }
    }

    updateStyles(newStyles) {
      Object.assign(this.state.styles, newStyles);
      this.emit('stylesChanged', this.state.styles);
    }

    setInspector(active, x = this.state.inspector.x) {
      this.state.inspector.active = active;
      this.state.inspector.x = x;
      this.emit('inspectorChanged', this.state.inspector);
    }

    setInspectorPos(x) {
      this.state.inspector.x = x;
      this.emit('inspectorMoved', x);
    }

    setModalState(changes) {
      Object.assign(this.state.modal, changes);
      this.emit('modalStateChanged', this.state.modal);
    }
  }

  const stateManager = new StateManager();

  // ==========================================================================
  // 3. RENDERIZADOR CARTESIANO GEOGEBRA (CartesianPlane)
  // ==========================================================================
  class CartesianPlane {
    constructor(canvasElement, options = {}) {
      this.canvas = canvasElement;
      this.ctx = canvasElement.getContext('2d');
      this.isModal = !!options.isModal;

      this.isDragging = false;
      this.dragMode = 'pan';
      this.dragStartScreen = { x: 0, y: 0 };
      this.dragStartWorld = { x: 0, y: 0 };
      this.dragStartViewport = null;

      this.hoverPosScreen = null;
      this.hoverPosWorld = null;

      this.bindEvents();
    }

    resize() {
      const rect = this.canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      let w = rect.width;
      let h = rect.height;

      if (!w && this.canvas.parentElement) {
        w = this.canvas.parentElement.clientWidth;
      }
      if (!h && this.canvas.parentElement) {
        h = this.canvas.parentElement.clientHeight;
      }

      if (!w || !h) return;

      const targetW = Math.round(w * dpr);
      const targetH = Math.round(h * dpr);

      if (this.canvas.width !== targetW || this.canvas.height !== targetH) {
        this.canvas.width = targetW;
        this.canvas.height = targetH;
      }

      this.dpr = dpr;
      this.width = w;
      this.height = h;
    }

    worldToScreen(wx, wy) {
      const vp = stateManager.state.viewport;
      const sx = ((wx - vp.xMin) / (vp.xMax - vp.xMin)) * this.width;
      const sy = ((vp.yMax - wy) / (vp.yMax - vp.yMin)) * this.height;
      return { x: sx * this.dpr, y: sy * this.dpr };
    }

    screenToWorld(sx, sy) {
      const vp = stateManager.state.viewport;
      const wx = vp.xMin + (sx / this.width) * (vp.xMax - vp.xMin);
      const wy = vp.yMax - (sy / this.height) * (vp.yMax - vp.yMin);
      return { x: wx, y: wy };
    }

    calculateGridStep(range, pixelSize, targetPixelStep = 80) {
      const unitsPerPixel = range / pixelSize;
      const rawStep = targetPixelStep * unitsPerPixel;
      const exponent = Math.floor(Math.log10(rawStep));
      const fraction = rawStep / Math.pow(10, exponent);

      let niceFraction = 1;
      if (fraction >= 1.5 && fraction < 3.5) niceFraction = 2;
      else if (fraction >= 3.5 && fraction < 7.5) niceFraction = 5;
      else if (fraction >= 7.5) niceFraction = 10;

      const majorStep = niceFraction * Math.pow(10, exponent);
      const minorStep = majorStep / 5;
      return { majorStep, minorStep };
    }

    render() {
      this.resize();
      if (!this.width || !this.height) return;

      const ctx = this.ctx;
      const { viewport, styles, waves, resultant, time, inspector } = stateManager.state;
      const theme = styles.theme;

      ctx.save();
      ctx.scale(this.dpr, this.dpr);

      // Fondo
      ctx.fillStyle = theme.bg;
      ctx.fillRect(0, 0, this.width, this.height);

      // Cuadrículas
      this.renderGrids(ctx, viewport, styles, theme);

      // Ejes
      this.renderAxes(ctx, viewport, styles, theme);

      // Ondas componentes
      this.renderWaveComponents(ctx, viewport, waves, time.current, styles);

      // Onda Resultante
      if (resultant.visible) {
        this.renderResultantWave(ctx, viewport, waves, resultant, time.current);
      }

      // Inspector de punto x
      if (inspector.active || this.hoverPosWorld) {
        this.renderInspector(ctx, viewport, waves, resultant, time.current, inspector, theme);
      }

      ctx.restore();
    }

    renderGrids(ctx, vp, styles, theme) {
      const xRange = vp.xMax - vp.xMin;
      const yRange = vp.yMax - vp.yMin;

      const xGrid = this.calculateGridStep(xRange, this.width, 90);
      const yGrid = this.calculateGridStep(yRange, this.height, 90);

      // Cuadrícula Menor (Milimetrado)
      if (styles.minorGridVisible) {
        ctx.beginPath();
        ctx.strokeStyle = theme.minorGridColor;
        ctx.lineWidth = styles.minorGridWidth;

        const startXMinor = Math.floor(vp.xMin / xGrid.minorStep) * xGrid.minorStep;
        for (let x = startXMinor; x <= vp.xMax; x += xGrid.minorStep) {
          const sx = ((x - vp.xMin) / xRange) * this.width;
          ctx.moveTo(sx, 0);
          ctx.lineTo(sx, this.height);
        }

        const startYMinor = Math.floor(vp.yMin / yGrid.minorStep) * yGrid.minorStep;
        for (let y = startYMinor; y <= vp.yMax; y += yGrid.minorStep) {
          const sy = ((vp.yMax - y) / yRange) * this.height;
          ctx.moveTo(0, sy);
          ctx.lineTo(this.width, sy);
        }
        ctx.stroke();
      }

      // Cuadrícula Mayor
      if (styles.majorGridVisible) {
        ctx.beginPath();
        ctx.strokeStyle = theme.majorGridColor;
        ctx.lineWidth = styles.majorGridWidth;

        const startXMajor = Math.floor(vp.xMin / xGrid.majorStep) * xGrid.majorStep;
        for (let x = startXMajor; x <= vp.xMax; x += xGrid.majorStep) {
          const sx = ((x - vp.xMin) / xRange) * this.width;
          ctx.moveTo(sx, 0);
          ctx.lineTo(sx, this.height);
        }

        const startYMajor = Math.floor(vp.yMin / yGrid.majorStep) * yGrid.majorStep;
        for (let y = startYMajor; y <= vp.yMax; y += yGrid.majorStep) {
          const sy = ((vp.yMax - y) / yRange) * this.height;
          ctx.moveTo(0, sy);
          ctx.lineTo(this.width, sy);
        }
        ctx.stroke();
      }
    }

    renderAxes(ctx, vp, styles, theme) {
      const xRange = vp.xMax - vp.xMin;
      const yRange = vp.yMax - vp.yMin;

      const xGrid = this.calculateGridStep(xRange, this.width, 90);
      const yGrid = this.calculateGridStep(yRange, this.height, 90);

      const originYScreen = ((vp.yMax - 0) / yRange) * this.height;
      const originXScreen = ((0 - vp.xMin) / xRange) * this.width;

      const clampedY = Math.max(24, Math.min(this.height - 24, originYScreen));
      const clampedX = Math.max(30, Math.min(this.width - 30, originXScreen));

      ctx.save();
      ctx.strokeStyle = theme.axisColor;
      ctx.lineWidth = styles.axisWidth;
      ctx.fillStyle = theme.textColor;
      ctx.font = `${styles.fontSizeTicks}px 'JetBrains Mono', 'Outfit', sans-serif`;

      // Eje X
      ctx.beginPath();
      ctx.moveTo(0, originYScreen);
      ctx.lineTo(this.width, originYScreen);
      ctx.stroke();

      if (styles.showArrows) {
        this.drawArrowhead(ctx, this.width - 12, originYScreen, this.width, originYScreen, 8);
        ctx.font = `bold ${styles.fontSizeLabels}px 'Outfit', sans-serif`;
        ctx.fillText('x', this.width - 16, originYScreen - 8);
        ctx.font = `${styles.fontSizeTicks}px 'JetBrains Mono', sans-serif`;
      }

      // Eje Y
      ctx.beginPath();
      ctx.moveTo(originXScreen, 0);
      ctx.lineTo(originXScreen, this.height);
      ctx.stroke();

      if (styles.showArrows) {
        this.drawArrowhead(ctx, originXScreen, 12, originXScreen, 0, 8);
        ctx.font = `bold ${styles.fontSizeLabels}px 'Outfit', sans-serif`;
        ctx.fillText('y', originXScreen + 8, 16);
        ctx.font = `${styles.fontSizeTicks}px 'JetBrains Mono', sans-serif`;
      }

      // Ticks X
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const startX = Math.floor(vp.xMin / xGrid.majorStep) * xGrid.majorStep;

      for (let x = startX; x <= vp.xMax; x += xGrid.majorStep) {
        if (Math.abs(x) < 1e-9) continue;
        const sx = ((x - vp.xMin) / xRange) * this.width;

        ctx.beginPath();
        ctx.moveTo(sx, clampedY - 4);
        ctx.lineTo(sx, clampedY + 4);
        ctx.stroke();

        if (styles.showTickLabels) {
          const txt = this.formatNumber(x);
          ctx.fillStyle = theme.bg;
          ctx.fillRect(sx - 14, clampedY + 6, 28, 14);
          ctx.fillStyle = theme.textColor;
          ctx.fillText(txt, sx, clampedY + 6);
        }
      }

      // Ticks Y
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      const startY = Math.floor(vp.yMin / yGrid.majorStep) * yGrid.majorStep;

      for (let y = startY; y <= vp.yMax; y += yGrid.majorStep) {
        if (Math.abs(y) < 1e-9) continue;
        const sy = ((vp.yMax - y) / yRange) * this.height;

        ctx.beginPath();
        ctx.moveTo(clampedX - 4, sy);
        ctx.lineTo(clampedX + 4, sy);
        ctx.stroke();

        if (styles.showTickLabels) {
          const txt = this.formatNumber(y);
          ctx.fillStyle = theme.bg;
          ctx.fillRect(clampedX - 32, sy - 7, 26, 14);
          ctx.fillStyle = theme.textColor;
          ctx.fillText(txt, clampedX - 6, sy);
        }
      }

      // Origen '0'
      if (originXScreen >= 0 && originXScreen <= this.width && originYScreen >= 0 && originYScreen <= this.height) {
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText('0', originXScreen - 4, originYScreen + 4);
      }

      ctx.restore();
    }

    drawArrowhead(ctx, fromX, fromY, toX, toY, headLength = 7) {
      const angle = Math.atan2(toY - fromY, toX - fromX);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(toX, toY);
      ctx.lineTo(toX - headLength * Math.cos(angle - Math.PI / 6), toY - headLength * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(toX - headLength * Math.cos(angle + Math.PI / 6), toY - headLength * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fill();
      ctx.restore();
    }

    formatNumber(val) {
      if (Math.abs(val) >= 1000 || (Math.abs(val) < 0.01 && val !== 0)) {
        return val.toExponential(1);
      }
      return parseFloat(val.toFixed(4)).toString();
    }

    renderWaveComponents(ctx, vp, waves, t, styles) {
      const xRange = vp.xMax - vp.xMin;
      const yRange = vp.yMax - vp.yMin;

      waves.forEach(wave => {
        if (!wave.visible || !wave.compiled || !wave.compiled.valid) return;

        const numPoints = Math.max(600, Math.min(2400, Math.round(this.width * 1.5)));
        const points = MathEngine.sampleWave(wave.compiled.fn, wave.v, vp.xMin, vp.xMax, t, numPoints);

        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = wave.color;
        ctx.lineWidth = wave.lineWidth || 2;
        ctx.globalAlpha = wave.opacity !== undefined ? wave.opacity : 0.9;

        if (wave.lineDash === 'dashed') ctx.setLineDash([8, 6]);
        else if (wave.lineDash === 'dotted') ctx.setLineDash([3, 4]);
        else ctx.setLineDash([]);

        let inSegment = false;
        for (let i = 0; i < points.length; i++) {
          const pt = points[i];
          if (pt.break) {
            inSegment = false;
            continue;
          }

          const sx = ((pt.x - vp.xMin) / xRange) * this.width;
          const sy = ((vp.yMax - pt.y) / yRange) * this.height;

          if (!inSegment) {
            ctx.moveTo(sx, sy);
            inSegment = true;
          } else {
            ctx.lineTo(sx, sy);
          }
        }
        ctx.stroke();

        if (styles.showPropagationVectors && Math.abs(wave.v) > 0.01) {
          this.renderWavePropagationVectors(ctx, wave, points, vp);
        }

        ctx.restore();
      });
    }

    renderWavePropagationVectors(ctx, wave, points, vp) {
      const dir = Math.sign(wave.v);
      const speed = Math.abs(wave.v);
      const arrowLen = Math.min(36, Math.max(16, speed * 8));

      const candidateIndices = [
        Math.floor(points.length * 0.25),
        Math.floor(points.length * 0.5),
        Math.floor(points.length * 0.75)
      ];

      ctx.save();
      ctx.strokeStyle = wave.color;
      ctx.fillStyle = wave.color;
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.globalAlpha = 0.85;

      candidateIndices.forEach(idx => {
        const pt = points[idx];
        if (!pt || pt.break || Math.abs(pt.y) < 0.2) return;

        const sx = ((pt.x - vp.xMin) / (vp.xMax - vp.xMin)) * this.width;
        const sy = ((vp.yMax - pt.y) / (vp.yMax - vp.yMin)) * this.height;

        const offsetY = pt.y >= 0 ? -12 : 12;
        const arrowY = sy + offsetY;
        const fromX = sx - (dir * arrowLen * 0.5);
        const toX = sx + (dir * arrowLen * 0.5);

        ctx.beginPath();
        ctx.moveTo(fromX, arrowY);
        ctx.lineTo(toX, arrowY);
        ctx.stroke();

        this.drawArrowhead(ctx, fromX, arrowY, toX, arrowY, 6);

        ctx.font = "10px 'JetBrains Mono', sans-serif";
        ctx.textAlign = 'center';
        ctx.fillText(`v=${wave.v > 0 ? '+' : ''}${wave.v}`, sx, arrowY - (pt.y >= 0 ? 6 : -14));
      });

      ctx.restore();
    }

    renderResultantWave(ctx, vp, waves, resultant, t) {
      const activeWaves = waves.filter(w => w.inSum && w.compiled && w.compiled.valid);
      if (activeWaves.length === 0) return;

      const xRange = vp.xMax - vp.xMin;
      const yRange = vp.yMax - vp.yMin;
      const numPoints = Math.max(800, Math.min(2600, Math.round(this.width * 1.6)));
      const step = xRange / (numPoints - 1);

      const points = [];
      let prevY = null;

      for (let i = 0; i < numPoints; i++) {
        const x = vp.xMin + i * step;
        let sumY = 0;
        let hasSingularity = false;

        for (let j = 0; j < activeWaves.length; j++) {
          const w = activeWaves[j];
          try {
            const val = w.compiled.fn(x, t, w.v);
            if (isNaN(val) || !isFinite(val) || Math.abs(val) > 150) {
              hasSingularity = true;
              break;
            }
            sumY += val;
          } catch (e) {
            hasSingularity = true;
            break;
          }
        }

        if (hasSingularity) {
          points.push({ x, y: NaN, break: true });
          prevY = null;
        } else {
          points.push({ x, y: sumY, break: false });
          prevY = sumY;
        }
      }

      ctx.save();

      // Relleno de área
      if (resultant.fillArea) {
        const zeroY = ((vp.yMax - 0) / yRange) * this.height;
        ctx.fillStyle = resultant.color;
        ctx.globalAlpha = resultant.fillOpacity || 0.15;

        ctx.beginPath();
        let started = false;
        for (let i = 0; i < points.length; i++) {
          const pt = points[i];
          if (pt.break) continue;

          const sx = ((pt.x - vp.xMin) / xRange) * this.width;
          const sy = ((vp.yMax - pt.y) / yRange) * this.height;

          if (!started) {
            ctx.moveTo(sx, zeroY);
            ctx.lineTo(sx, sy);
            started = true;
          } else {
            ctx.lineTo(sx, sy);
          }
        }
        if (started) {
          const lastPt = points[points.length - 1];
          const lastSx = ((lastPt.x - vp.xMin) / xRange) * this.width;
          ctx.lineTo(lastSx, zeroY);
          ctx.closePath();
          ctx.fill();
        }
      }

      // Trazo
      ctx.beginPath();
      ctx.strokeStyle = resultant.color;
      ctx.lineWidth = resultant.lineWidth || 3.5;
      ctx.globalAlpha = resultant.opacity || 1.0;
      ctx.setLineDash(resultant.lineDash === 'dashed' ? [10, 6] : []);

      if (stateManager.state.styles.themeKey === 'darkPro' || stateManager.state.styles.themeKey === 'cyberpunk') {
        ctx.shadowColor = resultant.color;
        ctx.shadowBlur = 8;
      }

      let inSegment = false;
      for (let i = 0; i < points.length; i++) {
        const pt = points[i];
        if (pt.break) {
          inSegment = false;
          continue;
        }

        const sx = ((pt.x - vp.xMin) / xRange) * this.width;
        const sy = ((vp.yMax - pt.y) / yRange) * this.height;

        if (!inSegment) {
          ctx.moveTo(sx, sy);
          inSegment = true;
        } else {
          ctx.lineTo(sx, sy);
        }
      }
      ctx.stroke();
      ctx.restore();
    }

    renderInspector(ctx, vp, waves, resultant, t, inspector, theme) {
      const inspX = inspector.active ? inspector.x : (this.hoverPosWorld ? this.hoverPosWorld.x : 0);
      const xRange = vp.xMax - vp.xMin;
      const yRange = vp.yMax - vp.yMin;

      if (inspX < vp.xMin || inspX > vp.xMax) return;
      const sx = ((inspX - vp.xMin) / xRange) * this.width;

      ctx.save();
      ctx.beginPath();
      ctx.strokeStyle = theme.crosshairColor || '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, this.height);
      ctx.stroke();
      ctx.setLineDash([]);

      const evalData = MathEngine.evaluateAt(waves, inspX, t);

      evalData.components.forEach(comp => {
        if (!comp.visible) return;
        const sy = ((vp.yMax - comp.val) / yRange) * this.height;

        ctx.beginPath();
        ctx.arc(sx, sy, 5, 0, Math.PI * 2);
        ctx.fillStyle = comp.color;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });

      if (resultant.visible) {
        const syRes = ((vp.yMax - evalData.resultant) / yRange) * this.height;
        ctx.beginPath();
        ctx.arc(sx, syRes, 7, 0, Math.PI * 2);
        ctx.fillStyle = resultant.color;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }

      this.renderInspectorHUD(ctx, sx, inspX, t, evalData, resultant, theme);
      ctx.restore();
    }

    renderInspectorHUD(ctx, sx, xVal, t, evalData, resultant, theme) {
      const items = [];
      items.push({ label: `x = ${xVal.toFixed(2)} m`, color: theme.textColor, isHeader: true });
      items.push({ label: `t = ${t.toFixed(2)} s`, color: '#64748b', isHeader: true });

      evalData.components.forEach(c => {
        items.push({
          label: `${c.name}: ${c.val.toFixed(3)}`,
          color: c.color,
          inSum: c.inSum
        });
      });

      if (resultant.visible) {
        items.push({
          label: `Σ Y(x,t): ${evalData.resultant.toFixed(3)}`,
          color: resultant.color,
          isBold: true
        });
      }

      const boxW = 160;
      const lineH = 18;
      const boxH = items.length * lineH + 16;
      let boxX = sx + 14;
      let boxY = 16;

      if (boxX + boxW > this.width) {
        boxX = sx - boxW - 14;
      }

      ctx.shadowColor = 'rgba(0,0,0,0.25)';
      ctx.shadowBlur = 10;
      ctx.fillStyle = stateManager.state.styles.themeKey === 'geogebra' || stateManager.state.styles.themeKey === 'milimetrado'
        ? 'rgba(255, 255, 255, 0.94)'
        : 'rgba(15, 23, 42, 0.94)';
      ctx.strokeStyle = theme.majorGridColor;
      ctx.lineWidth = 1;

      this.roundRect(ctx, boxX, boxY, boxW, boxH, 8);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      items.forEach((item, i) => {
        const py = boxY + 8 + i * lineH;
        ctx.fillStyle = item.color;
        ctx.font = item.isBold
          ? "bold 12px 'JetBrains Mono', sans-serif"
          : item.isHeader
            ? "600 11px 'Outfit', sans-serif"
            : "11px 'JetBrains Mono', sans-serif";

        if (!item.isHeader) {
          ctx.beginPath();
          ctx.arc(boxX + 12, py + 6, 3.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillText(item.label, boxX + 22, py);
        } else {
          ctx.fillText(item.label, boxX + 10, py);
        }
      });
    }

    roundRect(ctx, x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    }

    bindEvents() {
      const el = this.canvas;

      el.addEventListener('mousemove', (e) => this.onMouseMove(e));
      el.addEventListener('mouseenter', (e) => this.onMouseEnter(e));
      el.addEventListener('mouseleave', (e) => this.onMouseLeave(e));

      el.addEventListener('mousedown', (e) => this.onMouseDown(e));
      window.addEventListener('mouseup', () => this.onMouseUp());

      el.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });

      el.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
      el.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
      el.addEventListener('touchend', (e) => this.onTouchEnd(e));
    }

    getPointerPos(e) {
      const rect = this.canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }

    onMouseMove(e) {
      const pos = this.getPointerPos(e);
      this.hoverPosScreen = pos;
      this.hoverPosWorld = this.screenToWorld(pos.x, pos.y);

      if (stateManager.state.inspector.active) {
        stateManager.setInspectorPos(this.hoverPosWorld.x);
      }

      if (this.isDragging) {
        const dxScreen = pos.x - this.dragStartScreen.x;
        const dyScreen = pos.y - this.dragStartScreen.y;
        const vp = this.dragStartViewport;
        const xRange = vp.xMax - vp.xMin;
        const yRange = vp.yMax - vp.yMin;

        if (this.dragMode === 'pan') {
          const dxWorld = -(dxScreen / this.width) * xRange;
          const dyWorld = (dyScreen / this.height) * yRange;
          stateManager.setViewport(vp.xMin + dxWorld, vp.xMax + dxWorld, vp.yMin + dyWorld, vp.yMax + dyWorld);
        } else if (this.dragMode === 'scale-x') {
          const factor = Math.exp(-dxScreen / 250);
          const center = this.dragStartWorld.x;
          const newXMin = center + (vp.xMin - center) * factor;
          const newXMax = center + (vp.xMax - center) * factor;
          stateManager.setViewport(newXMin, newXMax, vp.yMin, vp.yMax);
        } else if (this.dragMode === 'scale-y') {
          const factor = Math.exp(dyScreen / 200);
          const center = this.dragStartWorld.y;
          const newYMin = center + (vp.yMin - center) * factor;
          const newYMax = center + (vp.yMax - center) * factor;
          stateManager.setViewport(vp.xMin, vp.xMax, newYMin, newYMax);
        }
      } else {
        this.updateCursorMode(pos);
      }
    }

    updateCursorMode(pos) {
      const vp = stateManager.state.viewport;
      const originYScreen = ((vp.yMax - 0) / (vp.yMax - vp.yMin)) * this.height;
      const originXScreen = ((0 - vp.xMin) / (vp.xMax - vp.xMin)) * this.width;

      const nearXAxis = Math.abs(pos.y - originYScreen) < 14;
      const nearYAxis = Math.abs(pos.x - originXScreen) < 14;

      if (nearXAxis && nearYAxis) this.canvas.style.cursor = 'move';
      else if (nearXAxis) this.canvas.style.cursor = 'ew-resize';
      else if (nearYAxis) this.canvas.style.cursor = 'ns-resize';
      else this.canvas.style.cursor = stateManager.state.inspector.active ? 'crosshair' : 'grab';
    }

    onMouseDown(e) {
      if (e.button !== 0) return;
      const pos = this.getPointerPos(e);
      this.isDragging = true;
      this.dragStartScreen = pos;
      this.dragStartWorld = this.screenToWorld(pos.x, pos.y);
      this.dragStartViewport = { ...stateManager.state.viewport };

      const vp = stateManager.state.viewport;
      const originYScreen = ((vp.yMax - 0) / (vp.yMax - vp.yMin)) * this.height;
      const originXScreen = ((0 - vp.xMin) / (vp.xMax - vp.xMin)) * this.width;

      const nearXAxis = Math.abs(pos.y - originYScreen) < 14;
      const nearYAxis = Math.abs(pos.x - originXScreen) < 14;

      if (nearXAxis && !nearYAxis) {
        this.dragMode = 'scale-x';
        this.canvas.style.cursor = 'ew-resize';
      } else if (nearYAxis && !nearXAxis) {
        this.dragMode = 'scale-y';
        this.canvas.style.cursor = 'ns-resize';
      } else {
        this.dragMode = 'pan';
        this.canvas.style.cursor = 'grabbing';
      }
    }

    onMouseUp() {
      this.isDragging = false;
      this.canvas.style.cursor = 'grab';
    }

    onMouseEnter(e) { this.hoverPosScreen = this.getPointerPos(e); }
    onMouseLeave() { this.hoverPosScreen = null; this.hoverPosWorld = null; }

    onWheel(e) {
      e.preventDefault();
      const pos = this.getPointerPos(e);
      const worldPos = this.screenToWorld(pos.x, pos.y);
      const zoomFactor = e.deltaY < 0 ? 0.88 : 1.14;
      stateManager.zoom(zoomFactor, worldPos.x, worldPos.y);
    }

    onTouchStart(e) {
      if (e.touches.length === 1) {
        e.preventDefault();
        const t = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        const pos = { x: t.clientX - rect.left, y: t.clientY - rect.top };

        this.isDragging = true;
        this.dragMode = 'pan';
        this.dragStartScreen = pos;
        this.dragStartWorld = this.screenToWorld(pos.x, pos.y);
        this.dragStartViewport = { ...stateManager.state.viewport };
      }
    }

    onTouchMove(e) {
      if (e.touches.length === 1 && this.isDragging) {
        e.preventDefault();
        const t = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        const pos = { x: t.clientX - rect.left, y: t.clientY - rect.top };

        const dxScreen = pos.x - this.dragStartScreen.x;
        const dyScreen = pos.y - this.dragStartScreen.y;
        const vp = this.dragStartViewport;
        const xRange = vp.xMax - vp.xMin;
        const yRange = vp.yMax - vp.yMin;

        const dxWorld = -(dxScreen / this.width) * xRange;
        const dyWorld = (dyScreen / this.height) * yRange;
        stateManager.setViewport(vp.xMin + dxWorld, vp.xMax + dxWorld, vp.yMin + dyWorld, vp.yMax + dyWorld);
      }
    }

    onTouchEnd(e) {
      if (e.touches.length === 0) this.isDragging = false;
    }
  }

  // ==========================================================================
  // 4. TECLADO VIRTUAL MATEMÁTICO (VirtualKeyboard)
  // ==========================================================================
  class VirtualKeyboard {
    constructor(options = {}) {
      this.targetInput = null;
      this.isOpen = false;
      this.activeTab = 'basic';
      this.container = null;
      this.onInputChange = options.onInputChange || (() => {});
      this.initDOM();
    }

    initDOM() {
      let el = document.getElementById('virtual-keyboard');
      if (!el) {
        el = document.createElement('div');
        el.id = 'virtual-keyboard';
        el.className = 'virtual-keyboard-container hidden';
        document.body.appendChild(el);
      }
      this.container = el;
      this.render();
    }

    attachTo(inputElement) {
      this.targetInput = inputElement;
      if (!this.isOpen) this.open();
    }

    open() {
      this.isOpen = true;
      this.container.classList.remove('hidden');
      this.container.classList.add('visible');
      const toggleBtn = document.getElementById('btn-toggle-keyboard');
      if (toggleBtn) toggleBtn.classList.add('active');
    }

    close() {
      this.isOpen = false;
      this.container.classList.remove('visible');
      this.container.classList.add('hidden');
      const toggleBtn = document.getElementById('btn-toggle-keyboard');
      if (toggleBtn) toggleBtn.classList.remove('active');
    }

    toggle() {
      if (this.isOpen) this.close();
      else this.open();
    }

    render() {
      this.container.innerHTML = `
        <div class="vk-header">
          <div class="vk-tabs">
            <button class="vk-tab-btn ${this.activeTab === 'basic' ? 'active' : ''}" data-tab="basic">123 &amp; Operadores</button>
            <button class="vk-tab-btn ${this.activeTab === 'funcs' ? 'active' : ''}" data-tab="funcs">Funciones</button>
            <button class="vk-tab-btn ${this.activeTab === 'physics' ? 'active' : ''}" data-tab="physics">Física Ondulatoria</button>
            <button class="vk-tab-btn ${this.activeTab === 'pulses' ? 'active' : ''}" data-tab="pulses">Pulsos &amp; Presets</button>
          </div>
          <div class="vk-header-actions">
            <span class="vk-target-badge" id="vk-target-name">Entrada: ${this.targetInput ? (this.targetInput.dataset.name || 'Onda') : 'Selecciona una onda'}</span>
            <button class="vk-btn-icon" id="vk-close-btn" title="Cerrar teclado (Esc)">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>

        <div class="vk-body">
          ${this.renderTabContent()}
        </div>

        <div class="vk-footer-actions">
          <button class="vk-key-util vk-key-nav" data-action="left" title="Mover cursor a la izquierda">◀</button>
          <button class="vk-key-util vk-key-nav" data-action="right" title="Mover cursor a la derecha">▶</button>
          <button class="vk-key-util vk-key-backspace" data-action="backspace" title="Borrar">⌫ Borrar</button>
          <button class="vk-key-util vk-key-clear" data-action="clear" title="Limpiar">Limpiar</button>
          <button class="vk-key-util vk-key-confirm" data-action="confirm" title="Aceptar">✓ Listo</button>
        </div>
      `;

      this.bindEvents();
    }

    renderTabContent() {
      switch (this.activeTab) {
        case 'basic':
          return `
            <div class="vk-grid-basic">
              <div class="vk-col">
                <button class="vk-key vk-key-var" data-insert="x">x</button>
                <button class="vk-key vk-key-var" data-insert="t">t</button>
                <button class="vk-key vk-key-var" data-insert="v">v</button>
                <button class="vk-key vk-key-const" data-insert="pi">π</button>
                <button class="vk-key vk-key-const" data-insert="e">e</button>
              </div>
              <div class="vk-col-numpad">
                <button class="vk-key vk-key-num" data-insert="7">7</button>
                <button class="vk-key vk-key-num" data-insert="8">8</button>
                <button class="vk-key vk-key-num" data-insert="9">9</button>
                <button class="vk-key vk-key-num" data-insert="4">4</button>
                <button class="vk-key vk-key-num" data-insert="5">5</button>
                <button class="vk-key vk-key-num" data-insert="6">6</button>
                <button class="vk-key vk-key-num" data-insert="1">1</button>
                <button class="vk-key vk-key-num" data-insert="2">2</button>
                <button class="vk-key vk-key-num" data-insert="3">3</button>
                <button class="vk-key vk-key-num" data-insert="0">0</button>
                <button class="vk-key vk-key-num" data-insert=".">.</button>
                <button class="vk-key vk-key-op" data-insert="^">^</button>
              </div>
              <div class="vk-col">
                <button class="vk-key vk-key-op" data-insert="+">+</button>
                <button class="vk-key vk-key-op" data-insert="-">-</button>
                <button class="vk-key vk-key-op" data-insert="*">·</button>
                <button class="vk-key vk-key-op" data-insert="/">/</button>
                <button class="vk-key vk-key-op" data-insert="^2">x²</button>
              </div>
              <div class="vk-col">
                <button class="vk-key vk-key-sym" data-insert="(">(</button>
                <button class="vk-key vk-key-sym" data-insert=")">)</button>
                <button class="vk-key vk-key-fn" data-insert="sin()">sen( )</button>
                <button class="vk-key vk-key-fn" data-insert="cos()">cos( )</button>
                <button class="vk-key vk-key-fn" data-insert="sqrt()">√( )</button>
              </div>
            </div>
          `;
        case 'funcs':
          return `
            <div class="vk-grid-funcs">
              <button class="vk-key vk-key-fn" data-insert="sin()">sen(x)</button>
              <button class="vk-key vk-key-fn" data-insert="cos()">cos(x)</button>
              <button class="vk-key vk-key-fn" data-insert="tan()">tan(x)</button>
              <button class="vk-key vk-key-fn" data-insert="asin()">arcsen(x)</button>
              <button class="vk-key vk-key-fn" data-insert="acos()">arccos(x)</button>
              <button class="vk-key vk-key-fn" data-insert="atan()">arctan(x)</button>
              <button class="vk-key vk-key-fn" data-insert="exp()">exp(x)</button>
              <button class="vk-key vk-key-fn" data-insert="ln()">ln(x)</button>
              <button class="vk-key vk-key-fn" data-insert="sqrt()">√(x)</button>
              <button class="vk-key vk-key-fn" data-insert="abs()">|x|</button>
              <button class="vk-key vk-key-fn" data-insert="^(4)">x⁴</button>
              <button class="vk-key vk-key-fn" data-insert="1/()">1 / ( )</button>
            </div>
          `;
        case 'physics':
          return `
            <div class="vk-grid-physics">
              <button class="vk-key vk-key-preset" data-insert="(x - v*t)">(x - v·t) [Viajera +x]</button>
              <button class="vk-key vk-key-preset" data-insert="(x + v*t)">(x + v·t) [Viajera -x]</button>
              <button class="vk-key vk-key-preset" data-insert="sin(x - 2*t)">sen(x - 2·t)</button>
              <button class="vk-key vk-key-preset" data-insert="sin(x + 2*t)">sen(x + 2·t)</button>
              <button class="vk-key vk-key-preset" data-insert="2 * sin(0.5*x - t)">2·sen(0.5x - t)</button>
              <button class="vk-key vk-key-preset" data-insert="cos(2*x - 3*t + pi/4)">cos(2x - 3t + π/4)</button>
            </div>
          `;
        case 'pulses':
          return `
            <div class="vk-grid-pulses">
              <button class="vk-key vk-key-pulse" data-insert="2 / (((x - v*t))^4 + 1)">
                <strong>Pulso Cuártico:</strong> 2 / ((x - v·t)⁴ + 1)
              </button>
              <button class="vk-key vk-key-pulse" data-insert="2 / (((x - v*t))^2 + 1)">
                <strong>Pulso Lorentz:</strong> 2 / ((x - v·t)² + 1)
              </button>
              <button class="vk-key vk-key-pulse" data-insert="2 * exp(-((x - v*t))^2)">
                <strong>Pulso Gaussiano:</strong> 2 · exp(-(x - v·t)²)
              </button>
              <button class="vk-key vk-key-pulse" data-insert="-2 / (((x + v*t))^2 + 1)">
                <strong>Pulso Invertido:</strong> -2 / ((x + v·t)² + 1)
              </button>
            </div>
          `;
        default: return '';
      }
    }

    bindEvents() {
      const tabs = this.container.querySelectorAll('.vk-tab-btn');
      tabs.forEach(tab => {
        tab.addEventListener('click', () => {
          this.activeTab = tab.dataset.tab;
          this.render();
        });
      });

      const closeBtn = this.container.querySelector('#vk-close-btn');
      if (closeBtn) closeBtn.addEventListener('click', () => this.close());

      const keys = this.container.querySelectorAll('.vk-key');
      keys.forEach(k => {
        k.addEventListener('click', () => {
          const text = k.dataset.insert;
          if (text) this.insertText(text);
        });
      });

      const utils = this.container.querySelectorAll('.vk-key-util');
      utils.forEach(btn => {
        btn.addEventListener('click', () => {
          const action = btn.dataset.action;
          if (action === 'backspace') this.backspace();
          else if (action === 'clear') this.clear();
          else if (action === 'left') this.moveCursor(-1);
          else if (action === 'right') this.moveCursor(1);
          else if (action === 'confirm') this.close();
        });
      });
    }

    insertText(text) {
      if (!this.targetInput) {
        const firstInput = document.querySelector('.wave-equation-input');
        if (firstInput) this.targetInput = firstInput;
        else return;
      }

      const input = this.targetInput;
      input.focus();

      const start = input.selectionStart !== null ? input.selectionStart : input.value.length;
      const end = input.selectionEnd !== null ? input.selectionEnd : input.value.length;
      const val = input.value;

      input.value = val.substring(0, start) + text + val.substring(end);

      let newCursorPos = start + text.length;
      if (text.includes('()')) newCursorPos = start + text.indexOf('()') + 1;
      else if (text.endsWith('( )')) newCursorPos = start + text.length - 2;

      input.setSelectionRange(newCursorPos, newCursorPos);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      this.onInputChange(input.value);
    }

    backspace() {
      if (!this.targetInput) return;
      const input = this.targetInput;
      input.focus();
      const start = input.selectionStart;
      const end = input.selectionEnd;
      const val = input.value;

      if (start === end) {
        if (start > 0) {
          input.value = val.substring(0, start - 1) + val.substring(start);
          input.setSelectionRange(start - 1, start - 1);
        }
      } else {
        input.value = val.substring(0, start) + val.substring(end);
        input.setSelectionRange(start, start);
      }

      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      this.onInputChange(input.value);
    }

    clear() {
      if (!this.targetInput) return;
      this.targetInput.value = '';
      this.targetInput.focus();
      this.targetInput.dispatchEvent(new Event('input', { bubbles: true }));
      this.targetInput.dispatchEvent(new Event('change', { bubbles: true }));
      this.onInputChange('');
    }

    moveCursor(dir) {
      if (!this.targetInput) return;
      const input = this.targetInput;
      input.focus();
      const pos = Math.max(0, Math.min(input.value.length, input.selectionStart + dir));
      input.setSelectionRange(pos, pos);
    }
  }

  // ==========================================================================
  // 5. GESTOR DE ONDAS (WaveManager)
  // ==========================================================================
  class WaveManager {
    constructor(containerElement, virtualKeyboard) {
      this.container = containerElement;
      this.vk = virtualKeyboard;
      this.init();
    }

    init() {
      this.render();
      stateManager.on('wavesChanged', () => this.render());
      stateManager.on('waveUpdated', ({ wave }) => this.updateWaveCard(wave));
      stateManager.on('resultantUpdated', () => this.updateResultantCard());
    }

    render() {
      const waves = stateManager.getWaves();
      const resultant = stateManager.state.resultant;

      this.container.innerHTML = `
        <div class="waves-header">
          <div class="waves-header-title">
            <div class="icon-waves-glow">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M2 12c2-3 4-3 6 0s4 3 6 0 4-3 6 0"></path>
                <path d="M2 17c2-3 4-3 6 0s4 3 6 0 4-3 6 0"></path>
              </svg>
            </div>
            <div>
              <h3>Ondas Componentes</h3>
              <p class="subtitle">Escribe ecuaciones de propagación $y(x,t)$ y superposición</p>
            </div>
          </div>

          <div class="waves-header-actions">
            <button id="btn-add-wave" class="btn btn-primary btn-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Nueva Onda
            </button>
          </div>
        </div>

        <!-- Tarjeta de Onda Resultante -->
        <div class="resultant-card" id="resultant-card">
          ${this.renderResultantContent(resultant, waves)}
        </div>

        <!-- Lista de Ondas Componentes -->
        <div class="waves-list" id="waves-list">
          ${waves.map((w, index) => this.renderWaveCardHTML(w, index)).join('')}
        </div>
      `;

      this.bindEvents();
      this.renderAllKatex();
    }

    renderResultantContent(res, waves) {
      const activeComponents = waves.filter(w => w.inSum);
      const sumExprLatex = activeComponents.length > 0
        ? activeComponents.map(w => w.name.replace(/[₀-₉]/g, m => '_' + '₀₁₂₃₄₅₆₇₈₉'.indexOf(m))).join(' + ')
        : '0';

      return `
        <div class="resultant-header">
          <div class="res-title-group">
            <span class="badge-sum">Σ</span>
            <div>
              <h4 class="res-name">Onda Resultante $Y(x, t)$</h4>
              <div class="res-equation-preview katex-render" data-latex="Y(x,t) = ${sumExprLatex}">
                Y(x,t) = ${sumExprLatex}
              </div>
            </div>
          </div>

          <div class="res-controls-group">
            <label class="toggle-switch" title="Mostrar u ocultar onda resultante en el gráfico">
              <input type="checkbox" id="toggle-res-visible" ${res.visible ? 'checked' : ''}>
              <span class="toggle-slider"></span>
              <span class="toggle-label-text">Visualizar</span>
            </label>

            <label class="toggle-switch" title="Rellenar área bajo la curva resultante">
              <input type="checkbox" id="toggle-res-fill" ${res.fillArea ? 'checked' : ''}>
              <span class="toggle-slider"></span>
              <span class="toggle-label-text">Área</span>
            </label>
          </div>
        </div>
      `;
    }

    renderWaveCardHTML(wave, index) {
      const dirIcon = wave.v > 0
        ? '→ Derecha (+x)'
        : wave.v < 0
          ? '← Izquierda (-x)'
          : '• Estacionaria';

      const dashText = wave.lineDash === 'dashed' ? 'Trazos' : wave.lineDash === 'dotted' ? 'Puntos' : 'Continua';

      return `
        <div class="wave-card ${!wave.visible ? 'is-hidden' : ''} ${!wave.inSum ? 'is-excluded' : ''}" 
             id="wave-card-${wave.id}" data-id="${wave.id}">
          
          <div class="wave-card-top">
            <div class="wave-identity">
              <span class="color-dot" style="background-color: ${wave.color}"></span>
              <span class="wave-title">${wave.name}</span>
              <span class="wave-prop-badge ${wave.v > 0 ? 'prop-right' : wave.v < 0 ? 'prop-left' : 'prop-static'}">
                ${dirIcon}
              </span>
            </div>

            <div class="wave-toggles">
              <label class="toggle-switch" title="Visualizar/Ocultar curva en el gráfico (sin excluir de la suma)">
                <input type="checkbox" class="toggle-wave-visible" data-id="${wave.id}" ${wave.visible ? 'checked' : ''}>
                <span class="toggle-slider"></span>
                <span class="toggle-icon-hint">👁️</span>
              </label>

              <label class="toggle-switch sum-toggle" title="Incluir / Excluir del principio de superposición (Σ)">
                <input type="checkbox" class="toggle-wave-insum" data-id="${wave.id}" ${wave.inSum ? 'checked' : ''}>
                <span class="toggle-slider"></span>
                <span class="toggle-icon-hint">Σ</span>
              </label>

              <button class="btn-icon-subtle btn-duplicate-wave" data-id="${wave.id}" title="Duplicar onda">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              </button>

              <button class="btn-icon-subtle btn-delete-wave" data-id="${wave.id}" title="Eliminar onda">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          </div>

          <div class="wave-equation-row">
            <div class="input-with-icon">
              <span class="math-prefix">${wave.name.split('(')[0]} =</span>
              <input type="text" 
                     class="wave-equation-input" 
                     data-id="${wave.id}" 
                     data-name="${wave.name}"
                     value="${wave.expr}" 
                     placeholder="ej: 2 * sin(x - 2*t)"
                     spellcheck="false" 
                     autocomplete="off">
              <button class="btn-keyboard-trigger" data-id="${wave.id}" title="Abrir teclado virtual">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect>
                  <line x1="6" y1="8" x2="6.01" y2="8"></line>
                  <line x1="10" y1="8" x2="10.01" y2="8"></line>
                  <line x1="14" y1="8" x2="14.01" y2="8"></line>
                  <line x1="18" y1="8" x2="18.01" y2="8"></line>
                  <line x1="6" y1="12" x2="6.01" y2="12"></line>
                  <line x1="10" y1="12" x2="10.01" y2="12"></line>
                  <line x1="14" y1="12" x2="14.01" y2="12"></line>
                  <line x1="18" y1="12" x2="18.01" y2="12"></line>
                  <line x1="7" y1="16" x2="17" y2="16"></line>
                </svg>
              </button>
            </div>
          </div>

          <div class="wave-katex-row">
            <div class="wave-katex-preview katex-render" id="katex-${wave.id}" data-latex="${wave.compiled ? wave.compiled.latex : wave.expr}">
              ${wave.expr}
            </div>
            ${wave.compiled && !wave.compiled.valid ? `<span class="wave-error-badge">${wave.compiled.error}</span>` : ''}
          </div>

          <div class="wave-params-grid">
            <div class="param-box">
              <div class="param-label-row">
                <label>Velocidad v:</label>
                <span class="param-val" id="val-v-${wave.id}">${wave.v} m/s</span>
              </div>
              <div class="slider-row">
                <input type="range" class="wave-v-slider" data-id="${wave.id}" min="-5" max="5" step="0.1" value="${wave.v}">
              </div>
            </div>

            <div class="param-box">
              <div class="param-label-row">
                <label>Estilo / Color:</label>
                <span class="param-val">${dashText}, ${wave.lineWidth}px</span>
              </div>
              <div class="style-row">
                <input type="color" class="wave-color-picker" data-id="${wave.id}" value="${wave.color}">
                <select class="wave-dash-select" data-id="${wave.id}">
                  <option value="solid" ${wave.lineDash === 'solid' ? 'selected' : ''}>Continua</option>
                  <option value="dashed" ${wave.lineDash === 'dashed' ? 'selected' : ''}>Trazos</option>
                  <option value="dotted" ${wave.lineDash === 'dotted' ? 'selected' : ''}>Puntos</option>
                </select>
                <select class="wave-width-select" data-id="${wave.id}">
                  <option value="1.5" ${wave.lineWidth === 1.5 ? 'selected' : ''}>Fina</option>
                  <option value="2.5" ${wave.lineWidth === 2.5 ? 'selected' : ''}>Media</option>
                  <option value="4" ${wave.lineWidth === 4 ? 'selected' : ''}>Gruesa</option>
                </select>
              </div>
            </div>
          </div>

        </div>
      `;
    }

    bindEvents() {
      const btnAdd = this.container.querySelector('#btn-add-wave');
      if (btnAdd) {
        btnAdd.addEventListener('click', () => {
          stateManager.addWave({ expr: '1.5 * sin(x - 2 * t)', v: 2 });
        });
      }

      const toggleResVisible = this.container.querySelector('#toggle-res-visible');
      if (toggleResVisible) {
        toggleResVisible.addEventListener('change', (e) => {
          stateManager.updateResultant({ visible: e.target.checked });
        });
      }

      const toggleResFill = this.container.querySelector('#toggle-res-fill');
      if (toggleResFill) {
        toggleResFill.addEventListener('change', (e) => {
          stateManager.updateResultant({ fillArea: e.target.checked });
        });
      }

      const eqInputs = this.container.querySelectorAll('.wave-equation-input');
      eqInputs.forEach(input => {
        input.addEventListener('focus', () => {
          if (this.vk) this.vk.attachTo(input);
        });
        input.addEventListener('input', (e) => {
          const id = input.dataset.id;
          stateManager.updateWave(id, { expr: e.target.value });
        });
      });

      const kbBtns = this.container.querySelectorAll('.btn-keyboard-trigger');
      kbBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.id;
          const input = this.container.querySelector(`.wave-equation-input[data-id="${id}"]`);
          if (input && this.vk) {
            this.vk.attachTo(input);
            this.vk.open();
          }
        });
      });

      const visToggles = this.container.querySelectorAll('.toggle-wave-visible');
      visToggles.forEach(t => {
        t.addEventListener('change', (e) => {
          const id = t.dataset.id;
          stateManager.updateWave(id, { visible: e.target.checked });
          const card = document.getElementById(`wave-card-${id}`);
          if (card) card.classList.toggle('is-hidden', !e.target.checked);
        });
      });

      const sumToggles = this.container.querySelectorAll('.toggle-wave-insum');
      sumToggles.forEach(t => {
        t.addEventListener('change', (e) => {
          const id = t.dataset.id;
          stateManager.updateWave(id, { inSum: e.target.checked });
          const card = document.getElementById(`wave-card-${id}`);
          if (card) card.classList.toggle('is-excluded', !e.target.checked);
        });
      });

      const vSliders = this.container.querySelectorAll('.wave-v-slider');
      vSliders.forEach(slider => {
        slider.addEventListener('input', (e) => {
          const id = slider.dataset.id;
          const val = parseFloat(e.target.value);
          const label = this.container.querySelector(`#val-v-${id}`);
          if (label) label.textContent = `${val} m/s`;
          stateManager.updateWave(id, { v: val });
        });
      });

      const colorPickers = this.container.querySelectorAll('.wave-color-picker');
      colorPickers.forEach(picker => {
        picker.addEventListener('input', (e) => {
          const id = picker.dataset.id;
          stateManager.updateWave(id, { color: e.target.value });
        });
      });

      const dashSelects = this.container.querySelectorAll('.wave-dash-select');
      dashSelects.forEach(select => {
        select.addEventListener('change', (e) => {
          const id = select.dataset.id;
          stateManager.updateWave(id, { lineDash: e.target.value });
        });
      });

      const widthSelects = this.container.querySelectorAll('.wave-width-select');
      widthSelects.forEach(select => {
        select.addEventListener('change', (e) => {
          const id = select.dataset.id;
          stateManager.updateWave(id, { lineWidth: parseFloat(e.target.value) });
        });
      });

      const dupBtns = this.container.querySelectorAll('.btn-duplicate-wave');
      dupBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.id;
          const orig = stateManager.getWave(id);
          if (orig) {
            stateManager.addWave({
              expr: orig.expr,
              v: orig.v,
              lineWidth: orig.lineWidth,
              lineDash: orig.lineDash
            });
          }
        });
      });

      const delBtns = this.container.querySelectorAll('.btn-delete-wave');
      delBtns.forEach(delBtn => {
        delBtn.addEventListener('click', () => {
          const id = delBtn.dataset.id;
          if (stateManager.getWaves().length <= 1) {
            alert('Debe haber al menos una onda en la simulación.');
            return;
          }
          stateManager.removeWave(id);
        });
      });
    }

    updateWaveCard(wave) {
      const card = document.getElementById(`wave-card-${wave.id}`);
      if (!card) return;

      const katexEl = document.getElementById(`katex-${wave.id}`);
      if (katexEl) {
        katexEl.dataset.latex = wave.compiled ? wave.compiled.latex : wave.expr;
        this.renderKatexElement(katexEl);
      }

      const badge = card.querySelector('.wave-prop-badge');
      if (badge) {
        badge.textContent = wave.v > 0 ? '→ Derecha (+x)' : wave.v < 0 ? '← Izquierda (-x)' : '• Estacionaria';
        badge.className = `wave-prop-badge ${wave.v > 0 ? 'prop-right' : wave.v < 0 ? 'prop-left' : 'prop-static'}`;
      }

      const dot = card.querySelector('.color-dot');
      if (dot) dot.style.backgroundColor = wave.color;

      this.updateResultantCard();
    }

    updateResultantCard() {
      const resCard = document.getElementById('resultant-card');
      if (!resCard) return;
      const waves = stateManager.getWaves();
      const resultant = stateManager.state.resultant;
      resCard.innerHTML = this.renderResultantContent(resultant, waves);
      this.renderAllKatex();
    }

    renderAllKatex() {
      if (typeof window.katex === 'undefined') {
        if (!this._katexWaitInterval) {
          this._katexWaitInterval = setInterval(() => {
            if (typeof window.katex !== 'undefined') {
              clearInterval(this._katexWaitInterval);
              this._katexWaitInterval = null;
              this.renderAllKatex();
            }
          }, 100);
        }
        return;
      }

      const elements = this.container.querySelectorAll('.katex-render');
      elements.forEach(el => this.renderKatexElement(el));
    }

    renderKatexElement(el) {
      if (typeof window.katex === 'undefined' || !el) {
        if (el) el.textContent = el.dataset.latex || el.textContent;
        return;
      }
      const rawLatex = el.dataset.latex || el.textContent;
      try {
        window.katex.render(rawLatex, el, {
          throwOnError: false,
          displayMode: false
        });
      } catch (e) {
        el.textContent = rawLatex;
      }
    }
  }

  // ==========================================================================
  // 6. MÓDULO DIDÁCTICO Y PRESETS (DidacticManager)
  // ==========================================================================
  const DIDACTIC_PRESETS = [
    {
      id: 'pulsos_iguales',
      title: '1. Dos pulsos iguales en sentidos opuestos',
      category: 'Interferencia Constructiva',
      description: 'Dos pulsos idénticos de perfil simétrico lorentziano se aproximan con rapideces opuestas (+2 m/s y -2 m/s). Al encontrarse en el centro (x=0), sus elongaciones se suman algebraicamente dando un pico de amplitud doble.',
      explanation: 'El principio de superposición establece que el desplazamiento de cualquier punto de la cuerda es la suma algebraica directa de los desplazamientos que produciría cada onda por separado. Cuando los máximos coinciden, la interferencia es constructiva pura. Tras el cruce, los pulsos continúan su propagación sin sufrir deformación ni pérdida de energía.',
      questions: [
        {
          q: '¿Qué ocurrirá con la forma y la altura máxima de la cuerda cuando ambos pulsos coincidan exactamente en el origen (x = 0)?',
          hint: 'Suma las amplitudes máximas de cada pulso individual: 2 + 2 = 4.'
        },
        {
          q: '¿Los pulsos "rebotan" entre sí o se atraviesan mutuamente sin alterarse?',
          hint: 'Observa la forma de los pulsos una vez que el tiempo avanza después del cruce (t > 4 s).'
        }
      ],
      setup: () => {
        stateManager.state.waves = [
          {
            id: 'p1',
            name: 'y₁(x, t)',
            expr: '2 / ((x - 2 * t + 8)^2 + 1)',
            v: 2,
            color: '#2563eb',
            lineWidth: 2.5,
            lineDash: 'solid',
            opacity: 0.9,
            visible: true,
            inSum: true,
            compiled: null
          },
          {
            id: 'p2',
            name: 'y₂(x, t)',
            expr: '2 / ((x + 2 * t - 8)^2 + 1)',
            v: -2,
            color: '#059669',
            lineWidth: 2.5,
            lineDash: 'dashed',
            opacity: 0.9,
            visible: true,
            inSum: true,
            compiled: null
          }
        ];
        stateManager.setViewport(-12, 12, -4, 6);
        stateManager.setTime(0);
        stateManager.setPlaying(false);
      }
    },
    {
      id: 'pulsos_contrarios',
      title: '2. Dos pulsos de signos contrarios',
      category: 'Interferencia Destructiva',
      description: 'Un pulso positivo que viaja hacia la derecha (+x) y un pulso invertido (negativo) que viaja hacia la izquierda (-x). En el instante de cruce central, la suma es exactamente cero en todo el medio.',
      explanation: 'Durante el instante en que las crestas y valles coinciden, la suma y₁ + y₂ es cero en cada punto y la cuerda parece plana. La energía mecánica no desaparece: se almacena como energía cinética transversal (velocidad vertical máxima de las partículas).',
      questions: [
        {
          q: 'Si la cuerda queda horizontal momentáneamente, ¿desapareció la energía?',
          hint: 'Toda la energía potencial elástica se convirtió en energía cinética transversal (dy/dt).'
        }
      ],
      setup: () => {
        stateManager.state.waves = [
          {
            id: 'p1',
            name: 'y₁(x, t)',
            expr: '2 / ((x - 2 * t + 8)^2 + 1)',
            v: 2,
            color: '#2563eb',
            lineWidth: 2.5,
            lineDash: 'solid',
            opacity: 0.9,
            visible: true,
            inSum: true,
            compiled: null
          },
          {
            id: 'p2',
            name: 'y₂(x, t)',
            expr: '-2 / ((x + 2 * t - 8)^2 + 1)',
            v: -2,
            color: '#dc2626',
            lineWidth: 2.5,
            lineDash: 'dashed',
            opacity: 0.9,
            visible: true,
            inSum: true,
            compiled: null
          }
        ];
        stateManager.setViewport(-12, 12, -4, 4);
        stateManager.setTime(0);
        stateManager.setPlaying(false);
      }
    },
    {
      id: 'pulsos_asimetricos',
      title: '3. Pulsos con diferentes amplitudes y anchuras',
      category: 'Superposición No Homogénea',
      description: 'Un pulso cuártico angosto de gran amplitud y un pulso ancho gaussiano. Muestra la superposición de perfiles no idénticos.',
      explanation: 'La superposición no requiere formas simétricas. La forma de la onda resultante evoluciona continuamente según las pendientes relativas de ambos pulsos.',
      questions: [
        {
          q: '¿La onda resultante es simétrica durante el traslape?',
          hint: 'La potencia 4 del pulso cuártico cae mucho más rápido que la campana gaussiana.'
        }
      ],
      setup: () => {
        stateManager.state.waves = [
          {
            id: 'p1',
            name: 'y₁(x, t)',
            expr: '3 / ((x - 2 * t + 8)^4 + 1)',
            v: 2,
            color: '#7c3aed',
            lineWidth: 2.5,
            lineDash: 'solid',
            opacity: 0.9,
            visible: true,
            inSum: true,
            compiled: null
          },
          {
            id: 'p2',
            name: 'y₂(x, t)',
            expr: '1.5 * exp(-((x + 2.5 * t - 9) / 2)^2)',
            v: -2.5,
            color: '#d97706',
            lineWidth: 2.5,
            lineDash: 'dashed',
            opacity: 0.9,
            visible: true,
            inSum: true,
            compiled: null
          }
        ];
        stateManager.setViewport(-14, 14, -3, 6);
        stateManager.setTime(0);
        stateManager.setPlaying(false);
      }
    },
    {
      id: 'paquete_armonicos',
      title: '4. Superposición de tres o más componentes (Fourier)',
      category: 'Síntesis Armónica',
      description: 'Tres ondas sinusoidales armónicas con frecuencias y amplitudes decrecientes que viajan juntas formando un perfil periódico complejo.',
      explanation: 'Cualquier forma periódica puede descomponerse en una serie de armónicos sinusoidales. Al viajar a la misma rapidez (medio no dispersivo), la forma compuesta no cambia.',
      questions: [
        {
          q: '¿Por qué la forma compuesta no se deforma al avanzar?',
          hint: 'Todas las componentes tienen la misma velocidad v = 2 m/s.'
        }
      ],
      setup: () => {
        stateManager.state.waves = [
          {
            id: 'f1',
            name: 'y₁(x, t)',
            expr: '2 * sin(x - 2 * t)',
            v: 2,
            color: '#2563eb',
            lineWidth: 2,
            lineDash: 'solid',
            opacity: 0.85,
            visible: true,
            inSum: true,
            compiled: null
          },
          {
            id: 'f2',
            name: 'y₂(x, t)',
            expr: '0.9 * sin(2 * (x - 2 * t))',
            v: 2,
            color: '#059669',
            lineWidth: 2,
            lineDash: 'dashed',
            opacity: 0.85,
            visible: true,
            inSum: true,
            compiled: null
          },
          {
            id: 'f3',
            name: 'y₃(x, t)',
            expr: '0.45 * sin(3 * (x - 2 * t))',
            v: 2,
            color: '#db2777',
            lineWidth: 2,
            lineDash: 'dotted',
            opacity: 0.85,
            visible: true,
            inSum: true,
            compiled: null
          }
        ];
        stateManager.setViewport(-12, 12, -4, 4);
        stateManager.setTime(0);
        stateManager.setPlaying(false);
      }
    },
    {
      id: 'ondas_fases',
      title: '5. Dos ondas sinusoidales con desfase',
      category: 'Interferencia Armónica',
      description: 'Dos ondas sinusoidales de igual frecuencia pero desfasadas un ángulo constante φ = π/2.',
      explanation: 'La amplitud resultante sigue la relación 2A cos(Δφ/2). Para Δφ = π/2 la amplitud es 2A cos(π/4) ≈ 1.41 A.',
      questions: [
        {
          q: '¿Qué desfase produciría anulación total permanente?',
          hint: 'Δφ = π radianes (180 grados).'
        }
      ],
      setup: () => {
        stateManager.state.waves = [
          {
            id: 'w1',
            name: 'y₁(x, t)',
            expr: '1.8 * sin(x - 2 * t)',
            v: 2,
            color: '#2563eb',
            lineWidth: 2.5,
            lineDash: 'solid',
            opacity: 0.85,
            visible: true,
            inSum: true,
            compiled: null
          },
          {
            id: 'w2',
            name: 'y₂(x, t)',
            expr: '1.8 * sin(x - 2 * t + pi / 2)',
            v: 2,
            color: '#dc2626',
            lineWidth: 2.5,
            lineDash: 'dashed',
            opacity: 0.85,
            visible: true,
            inSum: true,
            compiled: null
          }
        ];
        stateManager.setViewport(-10, 10, -4, 4);
        stateManager.setTime(0);
        stateManager.setPlaying(false);
      }
    },
    {
      id: 'estacionaria',
      title: '6. Onda Estacionaria (Nodos y Antinodos)',
      category: 'Ondas Estacionarias',
      description: 'Dos ondas armónicas de idéntica amplitud que viajan en direcciones contrarias (+v y -v). La superposición produce nodos fijos y antinodos.',
      explanation: 'sin(kx - ωt) + sin(kx + ωt) = 2 sin(kx) cos(ωt). No hay propagación neta de energía a lo largo del medio.',
      questions: [
        {
          q: '¿En qué posiciones x la elongación es siempre cero (nodos)?',
          hint: 'Donde sin(x) = 0, es decir x = 0, ±π, ±2π...'
        }
      ],
      setup: () => {
        stateManager.state.waves = [
          {
            id: 'w1',
            name: 'y₁(x, t)',
            expr: '1.8 * sin(x - 2 * t)',
            v: 2,
            color: '#2563eb',
            lineWidth: 2.5,
            lineDash: 'solid',
            opacity: 0.85,
            visible: true,
            inSum: true,
            compiled: null
          },
          {
            id: 'w2',
            name: 'y₂(x, t)',
            expr: '1.8 * sin(x + 2 * t)',
            v: -2,
            color: '#dc2626',
            lineWidth: 2.5,
            lineDash: 'dashed',
            opacity: 0.85,
            visible: true,
            inSum: true,
            compiled: null
          }
        ];
        stateManager.setViewport(-10, 10, -4, 4);
        stateManager.setTime(0);
        stateManager.setPlaying(false);
      }
    }
  ];

  class DidacticManager {
    constructor(containerElement) {
      this.container = containerElement;
      this.currentPreset = DIDACTIC_PRESETS[3]; // Fourier (3 componentes)
      this.init();
    }

    init() { this.render(); }

    loadPreset(presetId) {
      const preset = DIDACTIC_PRESETS.find(p => p.id === presetId);
      if (!preset) return;

      this.currentPreset = preset;
      stateManager.state.didactic.currentPresetId = preset.id;
      preset.setup();

      stateManager.state.waves.forEach(w => {
        w.compiled = MathEngine.compile(w.expr);
      });

      stateManager.emit('wavesChanged', stateManager.state.waves);
      stateManager.emit('timeUpdated', 0);
      this.render();
    }

    render() {
      const p = this.currentPreset;

      this.container.innerHTML = `
        <div class="didactic-panel-header">
          <div class="didactic-badge-category">${p.category}</div>
          <h3 class="didactic-title">${p.title}</h3>
        </div>

        <div class="preset-selector-row">
          <label for="select-preset">Seleccionar Ejemplo Didáctico:</label>
          <select id="select-preset" class="form-select">
            ${DIDACTIC_PRESETS.map(preset => `
              <option value="${preset.id}" ${preset.id === p.id ? 'selected' : ''}>
                ${preset.title}
              </option>
            `).join('')}
          </select>
        </div>

        <div class="didactic-card">
          <div class="didactic-card-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            Fenómeno Observado
          </div>
          <p class="didactic-desc">${p.description}</p>
          <div class="didactic-explanation">
            <strong>Fundamento Teórico:</strong> ${p.explanation}
          </div>
        </div>

        <div class="didactic-card questions-card">
          <div class="didactic-card-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            Preguntas de Predicción
          </div>
          <div class="questions-list">
            ${p.questions.map((item, idx) => `
              <div class="question-item">
                <p class="question-text"><strong>P${idx + 1}:</strong> ${item.q}</p>
                <details class="hint-details">
                  <summary>Ver Pista / Explicación</summary>
                  <div class="hint-content">${item.hint}</div>
                </details>
              </div>
            `).join('')}
          </div>
        </div>
      `;

      const sel = this.container.querySelector('#select-preset');
      if (sel) {
        sel.addEventListener('change', (e) => this.loadPreset(e.target.value));
      }
    }
  }

  // ==========================================================================
  // 7. GESTOR DE VENTANA MODAL AMPLIADA (ModalManager)
  // ==========================================================================
  class ModalManager {
    constructor(modalElement) {
      this.modalEl = modalElement;
      this.canvasModal = modalElement.querySelector('#modal-canvas');
      this.planeModal = new CartesianPlane(this.canvasModal, { isModal: true });

      this.isMaximized = false;
      this.isCollapsed = false;
      this.previousFocusElement = null;

      this.bindEvents();
    }

    open() {
      this.previousFocusElement = document.activeElement;
      this.modalEl.classList.remove('hidden');
      this.modalEl.classList.add('visible');
      document.body.classList.add('modal-open');

      stateManager.setModalState({ isOpen: true });

      setTimeout(() => {
        this.planeModal.resize();
        this.planeModal.render();
        const closeBtn = this.modalEl.querySelector('#modal-btn-close');
        if (closeBtn) closeBtn.focus();
      }, 50);
    }

    close() {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }

      this.modalEl.classList.remove('visible');
      this.modalEl.classList.add('hidden');
      document.body.classList.remove('modal-open');

      stateManager.setModalState({ isOpen: false });

      if (this.previousFocusElement) this.previousFocusElement.focus();
    }

    toggleMaximize() {
      this.isMaximized = !this.isMaximized;
      this.modalEl.classList.toggle('maximized', this.isMaximized);
      stateManager.setModalState({ isMaximized: this.isMaximized });

      setTimeout(() => {
        this.planeModal.resize();
        this.planeModal.render();
      }, 100);
    }

    toggleCollapse() {
      this.isCollapsed = !this.isCollapsed;
      this.modalEl.classList.toggle('collapsed', this.isCollapsed);
      stateManager.setModalState({ isMinimized: this.isCollapsed });
    }

    toggleFullscreen() {
      if (!document.fullscreenElement) {
        this.modalEl.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    }

    bindEvents() {
      const btnClose = this.modalEl.querySelector('#modal-btn-close');
      const btnMax = this.modalEl.querySelector('#modal-btn-maximize');
      const btnCollapse = this.modalEl.querySelector('#modal-btn-collapse');
      const btnFullscreen = this.modalEl.querySelector('#modal-btn-fullscreen');

      if (btnClose) btnClose.addEventListener('click', () => this.close());
      if (btnMax) btnMax.addEventListener('click', () => this.toggleMaximize());
      if (btnCollapse) btnCollapse.addEventListener('click', () => this.toggleCollapse());
      if (btnFullscreen) btnFullscreen.addEventListener('click', () => this.toggleFullscreen());

      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && stateManager.state.modal.isOpen) this.close();
      });

      window.addEventListener('resize', () => {
        if (stateManager.state.modal.isOpen && !this.isCollapsed) {
          this.planeModal.resize();
          this.planeModal.render();
        }
      });

      const playBtn = this.modalEl.querySelector('#modal-btn-play');
      if (playBtn) {
        playBtn.addEventListener('click', () => stateManager.togglePlay());
      }

      stateManager.on('playStateChanged', (isPlaying) => {
        if (playBtn) {
          playBtn.innerHTML = isPlaying
            ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`
            : `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
        }
      });

      const zoomIn = this.modalEl.querySelector('#modal-btn-zoom-in');
      const zoomOut = this.modalEl.querySelector('#modal-btn-zoom-out');
      const reset = this.modalEl.querySelector('#modal-btn-reset');

      if (zoomIn) zoomIn.addEventListener('click', () => stateManager.zoom(0.85));
      if (zoomOut) zoomOut.addEventListener('click', () => stateManager.zoom(1.18));
      if (reset) reset.addEventListener('click', () => stateManager.resetViewport());
    }

    render() {
      if (stateManager.state.modal.isOpen && !this.isCollapsed) {
        this.planeModal.render();
      }
    }
  }

  // ==========================================================================
  // 8. PALETA DE ESTILOS (PaletteManager)
  // ==========================================================================
  class PaletteManager {
    constructor(modalElement) {
      this.modalEl = modalElement;
      this.isOpen = false;
      this.renderContent();
      this.bindEvents();

      stateManager.on('stylesChanged', () => {
        if (this.isOpen) this.updateInputValues();
      });
    }

    open() {
      this.isOpen = true;
      this.updateInputValues();
      this.modalEl.classList.remove('hidden');
      this.modalEl.classList.add('visible');
    }

    close() {
      this.isOpen = false;
      this.modalEl.classList.remove('visible');
      this.modalEl.classList.add('hidden');
    }

    toggle() {
      if (this.isOpen) this.close();
      else this.open();
    }

    renderContent() {
      this.modalEl.innerHTML = `
        <div class="palette-modal-backdrop" id="palette-backdrop"></div>
        <div class="palette-modal-box">
          <div class="palette-header">
            <div class="palette-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"></circle>
                <circle cx="17.5" cy="10.5" r=".5" fill="currentColor"></circle>
                <circle cx="8.5" cy="7.5" r=".5" fill="currentColor"></circle>
                <circle cx="6.5" cy="12.5" r=".5" fill="currentColor"></circle>
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"></path>
              </svg>
              <h3>Paleta de Estilos Gráficos</h3>
            </div>
            <button class="btn-icon-subtle" id="palette-btn-close" title="Cerrar (Esc)">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div class="palette-body">
            <div class="palette-section">
              <h4>Temas Visuales</h4>
              <div class="theme-cards-grid">
                ${Object.entries(THEMES).map(([key, t]) => `
                  <button class="theme-card-btn" data-theme="${key}">
                    <span class="theme-preview-box" style="background-color: ${t.bg}; border-color: ${t.axisColor};">
                      <span class="preview-line" style="background-color: ${t.resultantColor};"></span>
                    </span>
                    <span class="theme-card-label">${t.name}</span>
                  </button>
                `).join('')}
              </div>
            </div>

            <div class="palette-section">
              <h4>Lienzo y Ejes Cartesianos</h4>
              <div class="palette-form-grid">
                <div class="form-group">
                  <label>Color de Fondo:</label>
                  <input type="color" id="pal-bg-color">
                </div>
                <div class="form-group">
                  <label>Color de Ejes:</label>
                  <input type="color" id="pal-axis-color">
                </div>
                <div class="form-group">
                  <label>Grosor de Ejes (px):</label>
                  <input type="range" id="pal-axis-width" min="1" max="5" step="0.5">
                  <span class="range-val" id="pal-val-axis-width">2px</span>
                </div>
                <div class="form-group">
                  <label>Tamaño Números (px):</label>
                  <input type="range" id="pal-font-ticks" min="9" max="18" step="1">
                  <span class="range-val" id="pal-val-font-ticks">12px</span>
                </div>
              </div>
            </div>

            <div class="palette-section">
              <h4>Cuadrícula Estilo GeoGebra</h4>
              <div class="palette-form-grid">
                <div class="form-group">
                  <label>Cuadrícula Mayor:</label>
                  <div class="flex-inline">
                    <input type="color" id="pal-major-grid-color">
                    <label class="toggle-switch">
                      <input type="checkbox" id="pal-major-grid-toggle" checked>
                      <span class="toggle-slider"></span>
                    </label>
                  </div>
                </div>
                <div class="form-group">
                  <label>Grosor Cuadrícula Mayor:</label>
                  <input type="range" id="pal-major-grid-width" min="0.5" max="3" step="0.2">
                  <span class="range-val" id="pal-val-major-width">1.2px</span>
                </div>

                <div class="form-group">
                  <label>Cuadrícula Menor (Milimetrado):</label>
                  <div class="flex-inline">
                    <input type="color" id="pal-minor-grid-color">
                    <label class="toggle-switch">
                      <input type="checkbox" id="pal-minor-grid-toggle" checked>
                      <span class="toggle-slider"></span>
                    </label>
                  </div>
                </div>
                <div class="form-group">
                  <label>Grosor Cuadrícula Menor:</label>
                  <input type="range" id="pal-minor-grid-width" min="0.2" max="2" step="0.2">
                  <span class="range-val" id="pal-val-minor-width">0.6px</span>
                </div>
              </div>
            </div>

            <div class="palette-section">
              <h4>Estilo de Onda Resultante Σ Y(x, t)</h4>
              <div class="palette-form-grid">
                <div class="form-group">
                  <label>Color Resultante:</label>
                  <input type="color" id="pal-res-color">
                </div>
                <div class="form-group">
                  <label>Grosor de Línea (px):</label>
                  <input type="range" id="pal-res-width" min="1.5" max="7" step="0.5">
                  <span class="range-val" id="pal-val-res-width">3.5px</span>
                </div>
                <div class="form-group">
                  <label>Patrón de Trazo:</label>
                  <select id="pal-res-dash" class="form-select">
                    <option value="solid">Línea Continua</option>
                    <option value="dashed">Línea de Trazos</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Opacidad Área Sombreada:</label>
                  <input type="range" id="pal-res-fill-opacity" min="0.05" max="0.5" step="0.05">
                  <span class="range-val" id="pal-val-res-fill">15%</span>
                </div>
              </div>
            </div>

            <div class="palette-section">
              <h4>Vectores de Propagación (v)</h4>
              <div class="palette-form-grid">
                <div class="form-group">
                  <label>Mostrar Vectores de Propagación:</label>
                  <label class="toggle-switch">
                    <input type="checkbox" id="pal-vectors-toggle" checked>
                    <span class="toggle-slider"></span>
                  </label>
                </div>
                <div class="form-group">
                  <label>Opacidad de Vectores:</label>
                  <input type="range" id="pal-vectors-opacity" min="0.2" max="1" step="0.05">
                  <span class="range-val" id="pal-val-vectors-opacity">85%</span>
                </div>
              </div>
            </div>
          </div>

          <div class="palette-footer">
            <button class="btn btn-secondary" id="palette-btn-reset">Tema por Defecto</button>
            <button class="btn btn-primary" id="palette-btn-apply">Aplicar y Cerrar</button>
          </div>
        </div>
      `;
    }

    updateInputValues() {
      const { styles, resultant } = stateManager.state;
      const theme = styles.theme;

      const setVal = (id, val) => {
        const el = this.modalEl.querySelector(id);
        if (el) el.value = val;
      };
      const setChecked = (id, checked) => {
        const el = this.modalEl.querySelector(id);
        if (el) el.checked = checked;
      };
      const setText = (id, txt) => {
        const el = this.modalEl.querySelector(id);
        if (el) el.textContent = txt;
      };

      setVal('#pal-bg-color', theme.bg);
      setVal('#pal-axis-color', theme.axisColor);
      setVal('#pal-axis-width', styles.axisWidth);
      setText('#pal-val-axis-width', `${styles.axisWidth}px`);

      setVal('#pal-font-ticks', styles.fontSizeTicks);
      setText('#pal-val-font-ticks', `${styles.fontSizeTicks}px`);

      setVal('#pal-major-grid-color', theme.majorGridColor);
      setChecked('#pal-major-grid-toggle', styles.majorGridVisible);
      setVal('#pal-major-grid-width', styles.majorGridWidth);
      setText('#pal-val-major-width', `${styles.majorGridWidth}px`);

      setVal('#pal-minor-grid-color', theme.minorGridColor);
      setChecked('#pal-minor-grid-toggle', styles.minorGridVisible);
      setVal('#pal-minor-grid-width', styles.minorGridWidth);
      setText('#pal-val-minor-width', `${styles.minorGridWidth}px`);

      setVal('#pal-res-color', resultant.color);
      setVal('#pal-res-width', resultant.lineWidth);
      setText('#pal-val-res-width', `${resultant.lineWidth}px`);
      setVal('#pal-res-dash', resultant.lineDash || 'solid');
      setVal('#pal-res-fill-opacity', resultant.fillOpacity || 0.15);
      setText('#pal-val-res-fill', `${Math.round((resultant.fillOpacity || 0.15) * 100)}%`);

      setChecked('#pal-vectors-toggle', styles.showPropagationVectors);
      setVal('#pal-vectors-opacity', styles.vectorOpacity || 0.85);
      setText('#pal-val-vectors-opacity', `${Math.round((styles.vectorOpacity || 0.85) * 100)}%`);
    }

    bindEvents() {
      const btnClose = this.modalEl.querySelector('#palette-btn-close');
      const backdrop = this.modalEl.querySelector('#palette-backdrop');
      const btnApply = this.modalEl.querySelector('#palette-btn-apply');

      if (btnClose) btnClose.addEventListener('click', () => this.close());
      if (backdrop) backdrop.addEventListener('click', () => this.close());
      if (btnApply) btnApply.addEventListener('click', () => this.close());

      const themeBtns = this.modalEl.querySelectorAll('.theme-card-btn');
      themeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const themeKey = btn.dataset.theme;
          stateManager.setTheme(themeKey);
          this.updateInputValues();
        });
      });

      const elBg = this.modalEl.querySelector('#pal-bg-color');
      if (elBg) {
        elBg.addEventListener('input', (e) => {
          stateManager.state.styles.theme.bg = e.target.value;
          stateManager.emit('stylesChanged', stateManager.state.styles);
        });
      }

      const elAxis = this.modalEl.querySelector('#pal-axis-color');
      if (elAxis) {
        elAxis.addEventListener('input', (e) => {
          stateManager.state.styles.theme.axisColor = e.target.value;
          stateManager.emit('stylesChanged', stateManager.state.styles);
        });
      }

      const elAxisW = this.modalEl.querySelector('#pal-axis-width');
      if (elAxisW) {
        elAxisW.addEventListener('input', (e) => {
          const val = parseFloat(e.target.value);
          stateManager.updateStyles({ axisWidth: val });
          const label = this.modalEl.querySelector('#pal-val-axis-width');
          if (label) label.textContent = `${val}px`;
        });
      }

      const elMajorColor = this.modalEl.querySelector('#pal-major-grid-color');
      if (elMajorColor) {
        elMajorColor.addEventListener('input', (e) => {
          stateManager.state.styles.theme.majorGridColor = e.target.value;
          stateManager.emit('stylesChanged', stateManager.state.styles);
        });
      }

      const elMajorToggle = this.modalEl.querySelector('#pal-major-grid-toggle');
      if (elMajorToggle) {
        elMajorToggle.addEventListener('change', (e) => {
          stateManager.updateStyles({ majorGridVisible: e.target.checked });
        });
      }

      const elMinorColor = this.modalEl.querySelector('#pal-minor-grid-color');
      if (elMinorColor) {
        elMinorColor.addEventListener('input', (e) => {
          stateManager.state.styles.theme.minorGridColor = e.target.value;
          stateManager.emit('stylesChanged', stateManager.state.styles);
        });
      }

      const elMinorToggle = this.modalEl.querySelector('#pal-minor-grid-toggle');
      if (elMinorToggle) {
        elMinorToggle.addEventListener('change', (e) => {
          stateManager.updateStyles({ minorGridVisible: e.target.checked });
        });
      }

      const elResColor = this.modalEl.querySelector('#pal-res-color');
      if (elResColor) {
        elResColor.addEventListener('input', (e) => {
          stateManager.updateResultant({ color: e.target.value });
        });
      }

      const elResWidth = this.modalEl.querySelector('#pal-res-width');
      if (elResWidth) {
        elResWidth.addEventListener('input', (e) => {
          const val = parseFloat(e.target.value);
          stateManager.updateResultant({ lineWidth: val });
          const label = this.modalEl.querySelector('#pal-val-res-width');
          if (label) label.textContent = `${val}px`;
        });
      }

      const elResDash = this.modalEl.querySelector('#pal-res-dash');
      if (elResDash) {
        elResDash.addEventListener('change', (e) => {
          stateManager.updateResultant({ lineDash: e.target.value });
        });
      }

      const elResFill = this.modalEl.querySelector('#pal-res-fill-opacity');
      if (elResFill) {
        elResFill.addEventListener('input', (e) => {
          const val = parseFloat(e.target.value);
          stateManager.updateResultant({ fillOpacity: val });
          const label = this.modalEl.querySelector('#pal-val-res-fill');
          if (label) label.textContent = `${Math.round(val * 100)}%`;
        });
      }

      const elVecToggle = this.modalEl.querySelector('#pal-vectors-toggle');
      if (elVecToggle) {
        elVecToggle.addEventListener('change', (e) => {
          stateManager.updateStyles({ showPropagationVectors: e.target.checked });
        });
      }

      const btnReset = this.modalEl.querySelector('#palette-btn-reset');
      if (btnReset) {
        btnReset.addEventListener('click', () => {
          stateManager.setTheme('darkPro');
          this.updateInputValues();
        });
      }
    }
  }

  // ==========================================================================
  // 9. EXPORTACIÓN E IMPORTACIÓN (ExportImportManager)
  // ==========================================================================
  class ExportImportManager {
    static exportJSON() {
      const data = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        waves: stateManager.state.waves.map(w => ({
          name: w.name,
          expr: w.expr,
          v: w.v,
          color: w.color,
          lineWidth: w.lineWidth,
          lineDash: w.lineDash,
          opacity: w.opacity,
          visible: w.visible,
          inSum: w.inSum
        })),
        resultant: stateManager.state.resultant,
        viewport: stateManager.state.viewport,
        styles: stateManager.state.styles
      };

      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `superposicion_ondas_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    static importJSON(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = JSON.parse(e.target.result);
            if (!data.waves || !Array.isArray(data.waves)) {
              throw new Error('Formato JSON no válido: falta lista de ondas');
            }

            stateManager.state.waves = data.waves.map((w, idx) => ({
              id: 'w_imp_' + idx,
              name: w.name || `y${idx + 1}(x, t)`,
              expr: w.expr || 'sin(x - 2*t)',
              v: w.v !== undefined ? w.v : 2,
              color: w.color || '#2563eb',
              lineWidth: w.lineWidth || 2.5,
              lineDash: w.lineDash || 'solid',
              opacity: w.opacity !== undefined ? w.opacity : 0.9,
              visible: w.visible !== undefined ? w.visible : true,
              inSum: w.inSum !== undefined ? w.inSum : true,
              compiled: MathEngine.compile(w.expr || 'sin(x - 2*t)')
            }));

            if (data.resultant) Object.assign(stateManager.state.resultant, data.resultant);
            if (data.viewport) Object.assign(stateManager.state.viewport, data.viewport);
            if (data.styles) Object.assign(stateManager.state.styles, data.styles);

            stateManager.emit('wavesChanged', stateManager.state.waves);
            stateManager.emit('viewportChanged', stateManager.state.viewport);
            stateManager.emit('stylesChanged', stateManager.state.styles);
            stateManager.setTime(0);

            resolve(data);
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = () => reject(new Error('Error al leer archivo'));
        reader.readAsText(file);
      });
    }

    static exportCanvasImage(canvasElement, fileName = 'grafico_ondas.png') {
      try {
        const imageURL = canvasElement.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = imageURL;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } catch (err) {
        console.error('Error al exportar imagen:', err);
      }
    }
  }

  // ==========================================================================
  // 10. APLICACIÓN PRINCIPAL (App Coordinator)
  // ==========================================================================
  class App {
    constructor() {
      this.mainCanvas = document.getElementById('main-canvas');
      this.plane = null;
      this.modalManager = null;
      this.paletteManager = null;
      this.vk = null;
      this.waveManager = null;
      this.didacticManager = null;

      this.lastFrameTime = performance.now();
      this.animationId = null;

      this.init();
    }

    init() {
      // 1. Teclado Virtual
      this.vk = new VirtualKeyboard();

      // 2. Gestor de Ondas
      const wavesContainer = document.getElementById('waves-container');
      this.waveManager = new WaveManager(wavesContainer, this.vk);

      // 3. Módulo Didáctico
      const didacticContainer = document.getElementById('didactic-container');
      this.didacticManager = new DidacticManager(didacticContainer);

      // 4. Lienzo Cartesiano GeoGebra
      this.plane = new CartesianPlane(this.mainCanvas, { isModal: false });

      // 5. Ventana Modal Ampliada
      const modalEl = document.getElementById('expanded-modal');
      this.modalManager = new ModalManager(modalEl);

      // 6. Paleta de Estilos
      const paletteEl = document.getElementById('palette-modal');
      this.paletteManager = new PaletteManager(paletteEl);

      // 7. Enlazar Controles y Atajos
      this.bindControls();
      this.bindSplitter();
      this.bindKeyboardShortcuts();

      // 8. Eventos de Estado
      stateManager.on('viewportChanged', () => this.drawOnce());
      stateManager.on('wavesChanged', () => this.drawOnce());
      stateManager.on('waveUpdated', () => this.drawOnce());
      stateManager.on('resultantUpdated', () => this.drawOnce());
      stateManager.on('stylesChanged', () => this.drawOnce());
      stateManager.on('inspectorChanged', () => this.drawOnce());
      stateManager.on('inspectorMoved', () => this.drawOnce());

      // 9. Bucle de animación a 60 FPS
      this.startLoop();

      window.addEventListener('resize', () => {
        this.plane.resize();
        this.drawOnce();
      });

      console.log('✓ OndaLab Pro inicializado con éxito. 3 ondas cargadas.');
    }

    startLoop() {
      const loop = (currentTime) => {
        const deltaSeconds = (currentTime - this.lastFrameTime) / 1000;
        this.lastFrameTime = currentTime;

        if (stateManager.state.time.isPlaying) {
          const step = deltaSeconds * stateManager.state.time.speed * stateManager.state.time.direction;
          let newT = stateManager.state.time.current + step;

          if (newT > stateManager.state.time.max) newT = stateManager.state.time.min;
          else if (newT < stateManager.state.time.min) newT = stateManager.state.time.max;

          stateManager.state.time.current = newT;
          this.updateTimeControlsUI(newT);
        }

        this.plane.render();

        if (stateManager.state.modal.isOpen) {
          this.modalManager.render();
        }

        this.animationId = requestAnimationFrame(loop);
      };

      this.animationId = requestAnimationFrame(loop);
    }

    drawOnce() {
      this.plane.render();
      if (stateManager.state.modal.isOpen) {
        this.modalManager.render();
      }
    }

    bindControls() {
      const btnPlay = document.getElementById('btn-play');
      if (btnPlay) {
        btnPlay.addEventListener('click', () => stateManager.togglePlay());
      }

      stateManager.on('playStateChanged', (isPlaying) => {
        if (btnPlay) {
          btnPlay.innerHTML = isPlaying
            ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg><span>Pausar</span>`
            : `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg><span>Reproducir</span>`;
        }
      });

      const btnStepBack = document.getElementById('btn-step-back');
      const btnStepForward = document.getElementById('btn-step-forward');
      if (btnStepBack) btnStepBack.addEventListener('click', () => stateManager.stepTime(-0.1));
      if (btnStepForward) btnStepForward.addEventListener('click', () => stateManager.stepTime(0.1));

      const btnResetTime = document.getElementById('btn-reset-time');
      if (btnResetTime) btnResetTime.addEventListener('click', () => stateManager.setTime(0));

      const timeSlider = document.getElementById('time-slider');
      if (timeSlider) {
        timeSlider.addEventListener('input', (e) => {
          stateManager.setTime(parseFloat(e.target.value));
        });
      }

      const speedSelect = document.getElementById('speed-select');
      if (speedSelect) {
        speedSelect.addEventListener('change', (e) => {
          stateManager.setSpeed(parseFloat(e.target.value));
        });
      }

      const btnToggleKb = document.getElementById('btn-toggle-keyboard');
      if (btnToggleKb) {
        btnToggleKb.addEventListener('click', () => this.vk.toggle());
      }

      const btnPalette = document.getElementById('btn-open-palette');
      const btnToolbarPalette = document.getElementById('toolbar-btn-palette');
      if (btnPalette) btnPalette.addEventListener('click', () => this.paletteManager.toggle());
      if (btnToolbarPalette) btnToolbarPalette.addEventListener('click', () => this.paletteManager.toggle());

      const btnModal = document.getElementById('btn-open-modal');
      const btnToolbarModal = document.getElementById('toolbar-btn-modal');
      if (btnModal) btnModal.addEventListener('click', () => this.modalManager.open());
      if (btnToolbarModal) btnToolbarModal.addEventListener('click', () => this.modalManager.open());

      // Barra flotante GeoGebra
      const tbZoomIn = document.getElementById('toolbar-btn-zoom-in');
      const tbZoomOut = document.getElementById('toolbar-btn-zoom-out');
      const tbReset = document.getElementById('toolbar-btn-reset');
      const tbInspector = document.getElementById('toolbar-btn-inspector');
      const tbPan = document.getElementById('toolbar-btn-pan');

      if (tbZoomIn) tbZoomIn.addEventListener('click', () => stateManager.zoom(0.85));
      if (tbZoomOut) tbZoomOut.addEventListener('click', () => stateManager.zoom(1.18));
      if (tbReset) tbReset.addEventListener('click', () => stateManager.resetViewport());

      if (tbInspector) {
        tbInspector.addEventListener('click', () => {
          const nextState = !stateManager.state.inspector.active;
          stateManager.setInspector(nextState);
          tbInspector.classList.toggle('active', nextState);
        });
      }

      if (tbPan) {
        tbPan.addEventListener('click', () => {
          stateManager.setInspector(false);
          if (tbInspector) tbInspector.classList.remove('active');
        });
      }

      // Exportar / Importar
      const btnExportJSON = document.getElementById('btn-export-json');
      const btnImportJSON = document.getElementById('btn-import-json');
      const fileImportInput = document.getElementById('file-import-input');
      const btnExportPNG = document.getElementById('btn-export-png');

      if (btnExportJSON) btnExportJSON.addEventListener('click', () => ExportImportManager.exportJSON());

      if (btnImportJSON && fileImportInput) {
        btnImportJSON.addEventListener('click', () => fileImportInput.click());
        fileImportInput.addEventListener('change', (e) => {
          if (e.target.files && e.target.files[0]) {
            ExportImportManager.importJSON(e.target.files[0])
              .then(() => alert('¡Configuración cargada con éxito!'))
              .catch(err => alert('Error al importar: ' + err.message));
          }
        });
      }

      if (btnExportPNG) {
        btnExportPNG.addEventListener('click', () => {
          ExportImportManager.exportCanvasImage(this.mainCanvas, 'superposicion_ondas.png');
        });
      }
    }

    updateTimeControlsUI(t) {
      const timeSlider = document.getElementById('time-slider');
      const timeDisplay = document.getElementById('time-display');
      if (timeSlider) timeSlider.value = t.toFixed(2);
      if (timeDisplay) timeDisplay.textContent = `t = ${t.toFixed(2)} s`;
    }

    bindSplitter() {
      const splitter = document.getElementById('workspace-splitter');
      const leftPane = document.getElementById('left-pane');
      const container = document.getElementById('main-workspace');

      if (!splitter || !leftPane || !container) return;

      let isResizing = false;

      splitter.addEventListener('mousedown', () => {
        isResizing = true;
        document.body.classList.add('resizing');
        splitter.classList.add('active');
      });

      window.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        const containerRect = container.getBoundingClientRect();
        const pointerX = e.clientX - containerRect.left;
        const minW = 340;
        const maxW = containerRect.width - 340;

        if (pointerX >= minW && pointerX <= maxW) {
          const pct = (pointerX / containerRect.width) * 100;
          leftPane.style.width = `${pct}%`;
          this.plane.resize();
          this.drawOnce();
        }
      });

      window.addEventListener('mouseup', () => {
        if (isResizing) {
          isResizing = false;
          document.body.classList.remove('resizing');
          splitter.classList.remove('active');
          this.plane.resize();
          this.drawOnce();
        }
      });
    }

    bindKeyboardShortcuts() {
      window.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
          if (e.key === 'Escape') {
            e.target.blur();
            this.vk.close();
          }
          return;
        }

        if (e.code === 'Space') {
          e.preventDefault();
          stateManager.togglePlay();
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          stateManager.stepTime(0.1);
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          stateManager.stepTime(-0.1);
        } else if (e.key === 'r' || e.key === 'R') {
          stateManager.resetViewport();
        } else if (e.key === 't' || e.key === 'T') {
          stateManager.setTime(0);
        } else if (e.key === 'k' || e.key === 'K') {
          this.vk.toggle();
        } else if (e.key === 'p' || e.key === 'P') {
          this.paletteManager.toggle();
        } else if (e.key === 'm' || e.key === 'M') {
          this.modalManager.open();
        } else if (e.key === 'i' || e.key === 'I') {
          const nextState = !stateManager.state.inspector.active;
          stateManager.setInspector(nextState);
          const tbInspector = document.getElementById('toolbar-btn-inspector');
          if (tbInspector) tbInspector.classList.toggle('active', nextState);
        }
      });
    }
  }

  // ==========================================================================
  // 11. INICIALIZACIÓN INMEDIATA (Auto-arranque sin depender de CORS de módulos)
  // ==========================================================================
  function launchOndaLab() {
    if (!window.app) {
      try {
        window.app = new App();
      } catch (err) {
        console.error('Error al iniciar OndaLab Pro:', err);
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', launchOndaLab);
  } else {
    launchOndaLab();
  }

  // Exportar al ámbito global para depuración si fuera necesario
  window.OndaLab = {
    MathEngine,
    stateManager,
    THEMES,
    DIDACTIC_PRESETS
  };

})();
