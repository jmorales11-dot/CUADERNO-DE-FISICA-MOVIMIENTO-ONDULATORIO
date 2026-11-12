/**
 * modal-manager.js
 * Gestor de la ventana modal ampliada para visualización en gran formato o pantalla completa.
 * Sincroniza el mismo bucle de tiempo y estado con el gráfico principal sin duplicar renders.
 * Soporta maximizar, restaurar, colapsar/minimizar, pantalla completa y cierre con Escape.
 */

import { stateManager } from './state.js';
import { CartesianPlane } from './cartesian-plane.js';

export class ModalManager {
  constructor(modalElement) {
    this.modalEl = modalElement;
    this.canvasModal = modalElement.querySelector('#modal-canvas');
    this.planeModal = new CartesianPlane(this.canvasModal, { isModal: true });

    this.isMaximized = false;
    this.isCollapsed = false;
    this.previousFocusElement = null;

    this.init();
  }

  init() {
    this.bindEvents();
  }

  open() {
    this.previousFocusElement = document.activeElement;
    this.modalEl.classList.remove('hidden');
    this.modalEl.classList.add('visible');
    document.body.classList.add('modal-open');

    stateManager.setModalState({ isOpen: true });

    // Ajustar dimensiones del canvas del modal inmediatamente
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

    if (this.previousFocusElement) {
      this.previousFocusElement.focus();
    }
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
      this.modalEl.requestFullscreen().catch(err => {
        console.warn('Error al activar pantalla completa:', err);
      });
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  bindEvents() {
    // Botones de la barra de título del modal
    const btnClose = this.modalEl.querySelector('#modal-btn-close');
    const btnMax = this.modalEl.querySelector('#modal-btn-maximize');
    const btnCollapse = this.modalEl.querySelector('#modal-btn-collapse');
    const btnFullscreen = this.modalEl.querySelector('#modal-btn-fullscreen');

    if (btnClose) btnClose.addEventListener('click', () => this.close());
    if (btnMax) btnMax.addEventListener('click', () => this.toggleMaximize());
    if (btnCollapse) btnCollapse.addEventListener('click', () => this.toggleCollapse());
    if (btnFullscreen) btnFullscreen.addEventListener('click', () => this.toggleFullscreen());

    // Cierre con tecla Escape
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && stateManager.state.modal.isOpen) {
        this.close();
      }
    });

    // Redimensionar al cambiar el tamaño de la ventana
    window.addEventListener('resize', () => {
      if (stateManager.state.modal.isOpen && !this.isCollapsed) {
        this.planeModal.resize();
        this.planeModal.render();
      }
    });

    // Sincronizar controles esenciales dentro del modal
    const playBtn = this.modalEl.querySelector('#modal-btn-play');
    if (playBtn) {
      playBtn.addEventListener('click', () => {
        stateManager.togglePlay();
      });
    }

    stateManager.on('playStateChanged', (isPlaying) => {
      if (playBtn) {
        playBtn.innerHTML = isPlaying
          ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`
          : `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
      }
    });

    // Botones de zoom dentro del modal
    const zoomIn = this.modalEl.querySelector('#modal-btn-zoom-in');
    const zoomOut = this.modalEl.querySelector('#modal-btn-zoom-out');
    const reset = this.modalEl.querySelector('#modal-btn-reset');

    if (zoomIn) zoomIn.addEventListener('click', () => stateManager.zoom(0.85));
    if (zoomOut) zoomOut.addEventListener('click', () => stateManager.zoom(1.18));
    if (reset) reset.addEventListener('click', () => stateManager.resetViewport());
  }

  /**
   * Renderiza el lienzo del modal si está abierto y no colapsado
   */
  render() {
    if (stateManager.state.modal.isOpen && !this.isCollapsed) {
      this.planeModal.render();
    }
  }
}
