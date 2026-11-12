/**
 * wave-manager.js
 * Gestor de la interfaz de ondas componentes y resultante.
 * Renderiza tarjetas dinámicas de ondas, inputs con previsualización KaTeX en vivo,
 * interruptores de visualización y de suma, controles de velocidad v y estilos.
 */

import { stateManager, COLOR_PALETTE } from './state.js';
import { MathEngine } from './math-engine.js';

export class WaveManager {
  constructor(containerElement, virtualKeyboard) {
    this.container = containerElement;
    this.vk = virtualKeyboard;

    this.init();
  }

  init() {
    this.render();

    // Suscribirse a cambios en el estado
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

      <!-- Tarjeta de Onda Resultante (Superposición) -->
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
          <!-- Toggle Visualizar Resultante -->
          <label class="toggle-switch" title="Mostrar u ocultar onda resultante en el gráfico">
            <input type="checkbox" id="toggle-res-visible" ${res.visible ? 'checked' : ''}>
            <span class="toggle-slider"></span>
            <span class="toggle-label-text">Visualizar</span>
          </label>

          <!-- Toggle Área Sombreada -->
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
          <!-- Indicador y Nombre -->
          <div class="wave-identity">
            <span class="color-dot" style="background-color: ${wave.color}"></span>
            <span class="wave-title">${wave.name}</span>
            <span class="wave-prop-badge ${wave.v > 0 ? 'prop-right' : wave.v < 0 ? 'prop-left' : 'prop-static'}">
              ${dirIcon}
            </span>
          </div>

          <!-- Toggles rápidos -->
          <div class="wave-toggles">
            <!-- Toggle 1: Visible en Gráfico -->
            <label class="toggle-switch" title="Visualizar/Ocultar curva en el gráfico (sin excluir de la suma)">
              <input type="checkbox" class="toggle-wave-visible" data-id="${wave.id}" ${wave.visible ? 'checked' : ''}>
              <span class="toggle-slider"></span>
              <span class="toggle-icon-hint" title="Ver en gráfico">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              </span>
            </label>

            <!-- Toggle 2: Incluir en Resultante -->
            <label class="toggle-switch sum-toggle" title="Incluir / Excluir del principio de superposición (Σ)">
              <input type="checkbox" class="toggle-wave-insum" data-id="${wave.id}" ${wave.inSum ? 'checked' : ''}>
              <span class="toggle-slider"></span>
              <span class="toggle-icon-hint" title="Incluir en Σ">Σ</span>
            </label>

            <!-- Botón duplicar -->
            <button class="btn-icon-subtle btn-duplicate-wave" data-id="${wave.id}" title="Duplicar onda">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            </button>

            <!-- Botón eliminar -->
            <button class="btn-icon-subtle btn-delete-wave" data-id="${wave.id}" title="Eliminar onda">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>

        <!-- Entrada de ecuación -->
        <div class="wave-equation-row">
          <div class="input-with-icon">
            <span class="math-prefix">${wave.name.split('(')[0]} =</span>
            <input type="text" 
                   class="wave-equation-input" 
                   data-id="${wave.id}" 
                   data-name="${wave.name}"
                   value="${wave.expr}" 
                   placeholder="ej: 2 * sin(x - 2*t) ó 2/((x-v*t)^4+1)"
                   spellcheck="false" 
                   autocomplete="off">
            <button class="btn-keyboard-trigger" data-id="${wave.id}" title="Abrir teclado matemático para esta onda">
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

        <!-- Vista previa KaTeX y estado de error -->
        <div class="wave-katex-row">
          <div class="wave-katex-preview katex-render" id="katex-${wave.id}" data-latex="${wave.compiled ? wave.compiled.latex : wave.expr}">
            ${wave.expr}
          </div>
          ${wave.compiled && !wave.compiled.valid ? `<span class="wave-error-badge">${wave.compiled.error}</span>` : ''}
        </div>

        <!-- Parámetros físicos: Velocidad v y Estilo de Línea -->
        <div class="wave-params-grid">
          <!-- Velocidad v -->
          <div class="param-box">
            <div class="param-label-row">
              <label>Velocidad v:</label>
              <span class="param-val" id="val-v-${wave.id}">${wave.v} m/s</span>
            </div>
            <div class="slider-row">
              <input type="range" class="wave-v-slider" data-id="${wave.id}" min="-5" max="5" step="0.1" value="${wave.v}">
            </div>
          </div>

          <!-- Estilo de Trazo y Color -->
          <div class="param-box">
            <div class="param-label-row">
              <label>Estilo / Color:</label>
              <span class="param-val">${dashText}, ${wave.lineWidth}px</span>
            </div>
            <div class="style-row">
              <input type="color" class="wave-color-picker" data-id="${wave.id}" value="${wave.color}" title="Cambiar color">
              <select class="wave-dash-select" data-id="${wave.id}">
                <option value="solid" ${wave.lineDash === 'solid' ? 'selected' : ''}>Continua</option>
                <option value="dashed" ${wave.lineDash === 'dashed' ? 'selected' : ''}>Trazos</option>
                <option value="dotted" ${wave.lineDash === 'dotted' ? 'selected' : ''}>Puntos</option>
              </select>
              <select class="wave-width-select" data-id="${wave.id}">
                <option value="1.5" ${wave.lineWidth === 1.5 ? 'selected' : ''}>Fina (1.5)</option>
                <option value="2.5" ${wave.lineWidth === 2.5 ? 'selected' : ''}>Media (2.5)</option>
                <option value="4" ${wave.lineWidth === 4 ? 'selected' : ''}>Gruesa (4)</option>
              </select>
            </div>
          </div>
        </div>

      </div>
    `;
  }

  bindEvents() {
    // 1. Añadir nueva onda
    const btnAdd = this.container.querySelector('#btn-add-wave');
    if (btnAdd) {
      btnAdd.addEventListener('click', () => {
        stateManager.addWave({
          expr: '2 * sin(x - 2 * t)',
          v: 2
        });
      });
    }

    // 2. Resultante Toggles
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

    // 3. Inputs de ecuación
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

    // 4. Botones de teclado virtual por onda
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

    // 5. Toggles de visibilidad individual
    const visToggles = this.container.querySelectorAll('.toggle-wave-visible');
    visToggles.forEach(t => {
      t.addEventListener('change', (e) => {
        const id = t.dataset.id;
        stateManager.updateWave(id, { visible: e.target.checked });
        const card = document.getElementById(`wave-card-${id}`);
        if (card) {
          card.classList.toggle('is-hidden', !e.target.checked);
        }
      });
    });

    // 6. Toggles de inclusión en suma (Σ)
    const sumToggles = this.container.querySelectorAll('.toggle-wave-insum');
    sumToggles.forEach(t => {
      t.addEventListener('change', (e) => {
        const id = t.dataset.id;
        stateManager.updateWave(id, { inSum: e.target.checked });
        const card = document.getElementById(`wave-card-${id}`);
        if (card) {
          card.classList.toggle('is-excluded', !e.target.checked);
        }
      });
    });

    // 7. Slider de velocidad v
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

    // 8. Color picker
    const colorPickers = this.container.querySelectorAll('.wave-color-picker');
    colorPickers.forEach(picker => {
      picker.addEventListener('input', (e) => {
        const id = picker.dataset.id;
        stateManager.updateWave(id, { color: e.target.value });
      });
    });

    // 9. Dash select
    const dashSelects = this.container.querySelectorAll('.wave-dash-select');
    dashSelects.forEach(select => {
      select.addEventListener('change', (e) => {
        const id = select.dataset.id;
        stateManager.updateWave(id, { lineDash: e.target.value });
      });
    });

    // 10. Width select
    const widthSelects = this.container.querySelectorAll('.wave-width-select');
    widthSelects.forEach(select => {
      select.addEventListener('change', (e) => {
        const id = select.dataset.id;
        stateManager.updateWave(id, { lineWidth: parseFloat(e.target.value) });
      });
    });

    // 11. Duplicar onda
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

    // 12. Eliminar onda
    const delBtns = this.container.querySelectorAll('.btn-delete-wave');
    delBtns.forEach(delBtn => {
      delBtn.addEventListener('click', () => {
        const id = delBtn.dataset.id;
        if (stateManager.getWaves().length <= 1) {
          alert('Debe haber al menos una función de onda en la simulación.');
          return;
        }
        stateManager.removeWave(id);
      });
    });
  }

  updateWaveCard(wave) {
    const card = document.getElementById(`wave-card-${wave.id}`);
    if (!card) return;

    // Actualizar previsualización KaTeX
    const katexEl = document.getElementById(`katex-${wave.id}`);
    if (katexEl) {
      katexEl.dataset.latex = wave.compiled ? wave.compiled.latex : wave.expr;
      this.renderKatexElement(katexEl);
    }

    // Actualizar badge de dirección
    const badge = card.querySelector('.wave-prop-badge');
    if (badge) {
      badge.textContent = wave.v > 0 ? '→ Derecha (+x)' : wave.v < 0 ? '← Izquierda (-x)' : '• Estacionaria';
      badge.className = `wave-prop-badge ${wave.v > 0 ? 'prop-right' : wave.v < 0 ? 'prop-left' : 'prop-static'}`;
    }

    // Actualizar color dot
    const dot = card.querySelector('.color-dot');
    if (dot) dot.style.backgroundColor = wave.color;

    // Actualizar tarjeta resultante por si cambió el nombre
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
        }, 80);
      }
      return;
    }

    const elements = this.container.querySelectorAll('.katex-render');
    elements.forEach(el => this.renderKatexElement(el));
  }


  renderKatexElement(el) {
    if (typeof window.katex === 'undefined' || !el) return;
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
