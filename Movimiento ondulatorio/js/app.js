/**
 * app.js
 * Coordinador principal de la aplicación de Movimiento Ondulatorio y Superposición.
 * Bucle de animación sincronizado a 60 FPS, atajos de teclado, paneles divisores ajustables
 * y barra de herramientas GeoGebra flotante.
 */

import { stateManager } from './state.js';
import { CartesianPlane } from './cartesian-plane.js';
import { WaveManager } from './wave-manager.js';
import { VirtualKeyboard } from './virtual-keyboard.js';
import { DidacticManager } from './didactic.js';
import { ModalManager } from './modal-manager.js';
import { PaletteManager } from './palette-manager.js';
import { ExportImportManager } from './export-import.js';

class App {
  constructor() {
    this.mainCanvas = document.getElementById('main-canvas');
    this.plane = null;
    this.modalManager = null;
    this.paletteManager = null;
    this.vk = null;
    this.waveManager = null;
    this.didacticManager = null;

    // Control de tiempo para animación suave
    this.lastFrameTime = performance.now();
    this.animationId = null;

    this.init();
  }

  init() {
    // 1. Inicializar Teclado Virtual
    this.vk = new VirtualKeyboard();

    // 2. Inicializar Gestor de Ondas
    const wavesContainer = document.getElementById('waves-container');
    this.waveManager = new WaveManager(wavesContainer, this.vk);

    // 3. Inicializar Módulo Didáctico
    const didacticContainer = document.getElementById('didactic-container');
    this.didacticManager = new DidacticManager(didacticContainer);

    // 4. Inicializar Lienzo Cartesiano Principal (GeoGebra)
    this.plane = new CartesianPlane(this.mainCanvas, { isModal: false });

    // 5. Inicializar Ventana Modal Ampliada
    const modalEl = document.getElementById('expanded-modal');
    this.modalManager = new ModalManager(modalEl);

    // 6. Inicializar Paleta de Estilos
    const paletteEl = document.getElementById('palette-modal');
    this.paletteManager = new PaletteManager(paletteEl);

    // 7. Enlazar Controles de Interfaz y Barra GeoGebra
    this.bindControls();
    this.bindSplitter();
    this.bindKeyboardShortcuts();

    // 8. Reaccionar a cambios de estado para redibujar
    stateManager.on('viewportChanged', () => this.drawOnce());
    stateManager.on('wavesChanged', () => this.drawOnce());
    stateManager.on('waveUpdated', () => this.drawOnce());
    stateManager.on('resultantUpdated', () => this.drawOnce());
    stateManager.on('stylesChanged', () => this.drawOnce());
    stateManager.on('inspectorChanged', () => this.drawOnce());
    stateManager.on('inspectorMoved', () => this.drawOnce());

    // 9. Iniciar bucle de animación
    this.startLoop();

    // 10. Ajuste inicial de ventana
    window.addEventListener('resize', () => {
      this.plane.resize();
      this.drawOnce();
    });

    console.log('Simulador de Movimiento Ondulatorio inicializado.');
  }

  // --- BUCLE DE ANIMACIÓN UNIFICADO ---

  startLoop() {
    const loop = (currentTime) => {
      const deltaSeconds = (currentTime - this.lastFrameTime) / 1000;
      this.lastFrameTime = currentTime;

      // Actualizar tiempo de simulación si está en reproducción
      if (stateManager.state.time.isPlaying) {
        const step = deltaSeconds * stateManager.state.time.speed * stateManager.state.time.direction;
        let newT = stateManager.state.time.current + step;

        if (newT > stateManager.state.time.max) {
          newT = stateManager.state.time.min;
        } else if (newT < stateManager.state.time.min) {
          newT = stateManager.state.time.max;
        }

        stateManager.state.time.current = newT;
        this.updateTimeControlsUI(newT);
      }

      // Renderizar lienzo principal
      this.plane.render();

      // Si el modal está abierto, renderizar el lienzo del modal con el MISMO tiempo t
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

  // --- CONTROLES DE TIEMPO Y REPRODUCCIÓN ---

  bindControls() {
    // 1. Play / Pause
    const btnPlay = document.getElementById('btn-play');
    if (btnPlay) {
      btnPlay.addEventListener('click', () => {
        stateManager.togglePlay();
      });
    }

    stateManager.on('playStateChanged', (isPlaying) => {
      if (btnPlay) {
        btnPlay.innerHTML = isPlaying
          ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg><span>Pausar</span>`
          : `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg><span>Reproducir</span>`;
      }
    });

    // 2. Paso Atrás / Adelante
    const btnStepBack = document.getElementById('btn-step-back');
    const btnStepForward = document.getElementById('btn-step-forward');

    if (btnStepBack) {
      btnStepBack.addEventListener('click', () => stateManager.stepTime(-0.1));
    }
    if (btnStepForward) {
      btnStepForward.addEventListener('click', () => stateManager.stepTime(0.1));
    }

    // 3. Reiniciar tiempo a t=0
    const btnResetTime = document.getElementById('btn-reset-time');
    if (btnResetTime) {
      btnResetTime.addEventListener('click', () => stateManager.setTime(0));
    }

    // 4. Slider de tiempo
    const timeSlider = document.getElementById('time-slider');
    if (timeSlider) {
      timeSlider.addEventListener('input', (e) => {
        stateManager.setTime(parseFloat(e.target.value));
      });
    }

    // 5. Selector de velocidad
    const speedSelect = document.getElementById('speed-select');
    if (speedSelect) {
      speedSelect.addEventListener('change', (e) => {
        stateManager.setSpeed(parseFloat(e.target.value));
      });
    }

    // 6. Botón de Teclado Virtual Global
    const btnToggleKb = document.getElementById('btn-toggle-keyboard');
    if (btnToggleKb) {
      btnToggleKb.addEventListener('click', () => {
        this.vk.toggle();
      });
    }

    // 7. Botón de Paleta de Estilos
    const btnPalette = document.getElementById('btn-open-palette');
    const btnToolbarPalette = document.getElementById('toolbar-btn-palette');

    if (btnPalette) btnPalette.addEventListener('click', () => this.paletteManager.toggle());
    if (btnToolbarPalette) btnToolbarPalette.addEventListener('click', () => this.paletteManager.toggle());

    // 8. Botón Ventana Modal Ampliada
    const btnModal = document.getElementById('btn-open-modal');
    const btnToolbarModal = document.getElementById('toolbar-btn-modal');

    if (btnModal) btnModal.addEventListener('click', () => this.modalManager.open());
    if (btnToolbarModal) btnToolbarModal.addEventListener('click', () => this.modalManager.open());

    // 9. Barra de Herramientas Flotante GeoGebra
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

    // 10. Exportar e Importar
    const btnExportJSON = document.getElementById('btn-export-json');
    const btnImportJSON = document.getElementById('btn-import-json');
    const fileImportInput = document.getElementById('file-import-input');
    const btnExportPNG = document.getElementById('btn-export-png');

    if (btnExportJSON) {
      btnExportJSON.addEventListener('click', () => ExportImportManager.exportJSON());
    }

    if (btnImportJSON && fileImportInput) {
      btnImportJSON.addEventListener('click', () => fileImportInput.click());
      fileImportInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          ExportImportManager.importJSON(e.target.files[0])
            .then(() => alert('¡Configuración cargada con éxito!'))
            .catch(err => alert('Error al importar archivo: ' + err.message));
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

  // --- PANEL DIVISOR AJUSTABLE (SPLITTER DESKTOP) ---

  bindSplitter() {
    const splitter = document.getElementById('workspace-splitter');
    const leftPane = document.getElementById('left-pane');
    const rightPane = document.getElementById('right-pane');
    const container = document.getElementById('main-workspace');

    if (!splitter || !leftPane || !container) return;

    let isResizing = false;

    splitter.addEventListener('mousedown', (e) => {
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

  // --- ATAJOS DE TECLADO ---

  bindKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Ignorar atajos si el usuario está escribiendo en un input o textarea
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

// Inicialización segura que comprueba el estado actual del DOM
function startApp() {
  if (!window.app) {
    try {
      window.app = new App();
      console.log('✓ OndaLab Pro inicializado con éxito.');
    } catch (err) {
      console.error('Error al inicializar OndaLab Pro:', err);
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  // El DOM ya terminó de cargar antes de evaluar el módulo
  startApp();
}

