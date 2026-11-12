/**
 * palette-manager.js
 * Gestor del modal/panel de paleta de estilos gráficos.
 * Permite personalizar fondo, ejes, cuadrícula mayor y menor, tamaños de texto,
 * estilo independiente de la resultante, vectores de propagación y temas claro/oscuro.
 */

import { stateManager, THEMES } from './state.js';

export class PaletteManager {
  constructor(modalElement) {
    this.modalEl = modalElement;
    this.isOpen = false;
    this.init();
  }

  init() {
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
          <!-- 1. Temas Predefinidos -->
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

          <!-- 2. Fondo y Ejes Cartesianos -->
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

          <!-- 3. Cuadrículas Mayor y Menor (Papel Milimetrado) -->
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

          <!-- 4. Estilo de Onda Resultante -->
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
                <span class="range-val" id="pal-val-res-fill">12%</span>
              </div>
            </div>
          </div>

          <!-- 5. Vectores de Propagación -->
          <div class="palette-section">
            <h4>Vectores e Indicadores de Propagación (v)</h4>
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
          <button class="btn btn-secondary" id="palette-btn-reset">Restablecer Tema</button>
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
    setVal('#pal-res-fill-opacity', resultant.fillOpacity || 0.12);
    setText('#pal-val-res-fill', `${Math.round((resultant.fillOpacity || 0.12) * 100)}%`);

    setChecked('#pal-vectors-toggle', styles.showPropagationVectors);
    setVal('#pal-vectors-opacity', styles.vectorOpacity || 0.85);
    setText('#pal-val-vectors-opacity', `${Math.round((styles.vectorOpacity || 0.85) * 100)}%`);
  }

  bindEvents() {
    // Cerrar
    const btnClose = this.modalEl.querySelector('#palette-btn-close');
    const backdrop = this.modalEl.querySelector('#palette-backdrop');
    const btnApply = this.modalEl.querySelector('#palette-btn-apply');

    if (btnClose) btnClose.addEventListener('click', () => this.close());
    if (backdrop) backdrop.addEventListener('click', () => this.close());
    if (btnApply) btnApply.addEventListener('click', () => this.close());

    // Temas predefinidos
    const themeBtns = this.modalEl.querySelectorAll('.theme-card-btn');
    themeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const themeKey = btn.dataset.theme;
        stateManager.setTheme(themeKey);
        this.updateInputValues();
      });
    });

    // Color Fondo
    const elBg = this.modalEl.querySelector('#pal-bg-color');
    if (elBg) {
      elBg.addEventListener('input', (e) => {
        stateManager.state.styles.theme.bg = e.target.value;
        stateManager.emit('stylesChanged', stateManager.state.styles);
      });
    }

    // Color Ejes
    const elAxis = this.modalEl.querySelector('#pal-axis-color');
    if (elAxis) {
      elAxis.addEventListener('input', (e) => {
        stateManager.state.styles.theme.axisColor = e.target.value;
        stateManager.emit('stylesChanged', stateManager.state.styles);
      });
    }

    // Grosor Ejes
    const elAxisW = this.modalEl.querySelector('#pal-axis-width');
    if (elAxisW) {
      elAxisW.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        stateManager.updateStyles({ axisWidth: val });
        const label = this.modalEl.querySelector('#pal-val-axis-width');
        if (label) label.textContent = `${val}px`;
      });
    }

    // Cuadrícula Mayor
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

    // Cuadrícula Menor
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

    // Resultante
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

    // Vectores de propagación
    const elVecToggle = this.modalEl.querySelector('#pal-vectors-toggle');
    if (elVecToggle) {
      elVecToggle.addEventListener('change', (e) => {
        stateManager.updateStyles({ showPropagationVectors: e.target.checked });
      });
    }

    // Restablecer tema
    const btnReset = this.modalEl.querySelector('#palette-btn-reset');
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        stateManager.setTheme('geogebra');
        this.updateInputValues();
      });
    }
  }
}
