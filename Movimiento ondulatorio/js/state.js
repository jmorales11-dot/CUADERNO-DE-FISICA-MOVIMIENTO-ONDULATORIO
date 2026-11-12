/**
 * state.js
 * Gestión del estado global y reactivo de la aplicación de movimiento ondulatorio.
 * Proporciona un bus de eventos para sincronizar instantáneamente el lienzo, modal, editor e inspector.
 */

import { MathEngine } from './math-engine.js';

export const THEMES = {
  geogebra: {
    name: 'GeoGebra Clásico',
    bg: '#ffffff',
    axisColor: '#334155',
    majorGridColor: '#cbd5e1',
    minorGridColor: '#f1f5f9',
    textColor: '#1e293b',
    resultantColor: '#8b5cf6', // Violeta intenso
    vectorColor: '#f59e0b',
    crosshairColor: '#475569'
  },
  darkPro: {
    name: 'Modo Oscuro Pro',
    bg: '#0f172a', // Slate 900
    axisColor: '#94a3b8',
    majorGridColor: '#334155',
    minorGridColor: '#1e293b',
    textColor: '#f8fafc',
    resultantColor: '#a78bfa', // Glow purple
    vectorColor: '#fbbf24',
    crosshairColor: '#cbd5e1'
  },
  milimetrado: {
    name: 'Papel Milimetrado',
    bg: '#f8fafd',
    axisColor: '#1e3a8a',
    majorGridColor: '#93c5fd',
    minorGridColor: '#dbeafe',
    textColor: '#0f172a',
    resultantColor: '#dc2626', // Rojo técnico
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
    resultantColor: '#f43f5e', // Neón rosa
    vectorColor: '#10b981',
    crosshairColor: '#38bdf8'
  }
};

export const COLOR_PALETTE = [
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

    // Estado principal
    this.state = {
      // Lista de componentes ondulatorias
      waves: [
        {
          id: 'w1',
          name: 'y₁(x, t)',
          expr: '2 * sin(x - 2 * t)',
          v: 2,
          color: '#2563eb', // Azul
          lineWidth: 2.5,
          lineDash: 'solid',
          opacity: 0.9,
          visible: true,      // Visualizar en pantalla
          inSum: true,        // Incluir en resultante
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
          opacity: 0.9,
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
          opacity: 0.9,
          visible: true,
          inSum: true,
          compiled: null
        }
      ],


      // Configuración de la onda resultante
      resultant: {
        visible: true,
        color: '#8b5cf6',
        lineWidth: 3.5,
        lineDash: 'solid',
        opacity: 1.0,
        fillArea: true,
        fillOpacity: 0.12,
        showVectors: true
      },

      // Parámetros de animación y tiempo
      time: {
        current: 0,
        isPlaying: false,
        speed: 1.0,        // 0.1x a 5x
        direction: 1,      // 1 adelante, -1 atrás
        max: 20,
        min: 0,
        step: 0.05
      },

      // Sistema de coordenadas cartesianas
      viewport: {
        xMin: -12,
        xMax: 12,
        yMin: -6,
        yMax: 6,
        autoCenter: true,
        lockAspectRatio: false,
        padding: 40
      },

      // Estilos visuales y personalización
      styles: {
        themeKey: 'geogebra',
        theme: { ...THEMES.geogebra },
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

      // Herramienta de inspección de punto x
      inspector: {
        active: false,
        x: 0,
        isHovering: false,
        pinned: false
      },

      // Estado de la ventana modal ampliada
      modal: {
        isOpen: false,
        isMaximized: false,
        isMinimized: false,
        isFullscreen: false
      },

      // Didáctica y presets actuales
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

  /**
   * Suscribe una función callback a cambios en propiedades del estado.
   */
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
        try {
          cb(data);
        } catch (e) {
          console.error(`Error en listener de evento ${event}:`, e);
        }
      });
    }
    // Evento comodín general
    if (event !== '*' && this.listeners.has('*')) {
      this.listeners.get('*').forEach(cb => cb({ event, data }));
    }
  }

  // --- MÉTODOS DE ONDAS ---

  getWaves() {
    return this.state.waves;
  }

  getWave(id) {
    return this.state.waves.find(w => w.id === id);
  }

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
      // Renombrar subíndices para mantener orden didáctico
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

  // --- RESULTANTE ---

  updateResultant(changes) {
    Object.assign(this.state.resultant, changes);
    this.emit('resultantUpdated', this.state.resultant);
  }

  // --- TIEMPO Y ANIMACIÓN ---

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

  setDirection(dir) {
    this.state.time.direction = dir;
    this.emit('directionChanged', dir);
  }

  // --- VISTA Y SISTEMA CARTESIANO (GEOGEBRA) ---

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

  pan(dxWorld, dyWorld) {
    const { xMin, xMax, yMin, yMax } = this.state.viewport;
    this.setViewport(xMin + dxWorld, xMax + dxWorld, yMin + dyWorld, yMax + dyWorld);
  }

  zoom(factor, centerWorldX = 0, centerWorldY = 0) {
    const vp = this.state.viewport;
    const newXMin = centerWorldX + (vp.xMin - centerWorldX) * factor;
    const newXMax = centerWorldX + (vp.xMax - centerWorldX) * factor;
    const newYMin = centerWorldY + (vp.yMin - centerWorldY) * factor;
    const newYMax = centerWorldY + (vp.yMax - centerWorldY) * factor;
    this.setViewport(newXMin, newXMax, newYMin, newYMax);
  }

  zoomAxis(axis, factor, center = 0) {
    const vp = this.state.viewport;
    if (axis === 'x') {
      const newXMin = center + (vp.xMin - center) * factor;
      const newXMax = center + (vp.xMax - center) * factor;
      this.setViewport(newXMin, newXMax, vp.yMin, vp.yMax);
    } else if (axis === 'y') {
      const newYMin = center + (vp.yMin - center) * factor;
      const newYMax = center + (vp.yMax - center) * factor;
      this.setViewport(vp.xMin, vp.xMax, newYMin, newYMax);
    }
  }

  // --- ESTILOS Y TEMAS ---

  setTheme(themeKey) {
    if (THEMES[themeKey]) {
      this.state.styles.themeKey = themeKey;
      this.state.styles.theme = { ...THEMES[themeKey] };
      // Actualizar también color resultante por defecto del tema si aplica
      this.state.resultant.color = THEMES[themeKey].resultantColor;
      this.emit('stylesChanged', this.state.styles);
    }
  }

  updateStyles(newStyles) {
    Object.assign(this.state.styles, newStyles);
    this.emit('stylesChanged', this.state.styles);
  }

  // --- INSPECTOR ---

  setInspector(active, x = this.state.inspector.x) {
    this.state.inspector.active = active;
    this.state.inspector.x = x;
    this.emit('inspectorChanged', this.state.inspector);
  }

  setInspectorPos(x) {
    this.state.inspector.x = x;
    this.emit('inspectorMoved', x);
  }

  // --- MODAL ---

  setModalState(changes) {
    Object.assign(this.state.modal, changes);
    this.emit('modalStateChanged', this.state.modal);
  }
}

export const stateManager = new StateManager();
