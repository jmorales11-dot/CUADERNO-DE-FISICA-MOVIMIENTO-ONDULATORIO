/**
 * virtual-keyboard.js
 * Teclado virtual matemático completo, moderno y elegante para escribir ecuaciones de ondas.
 * Incluye pestañas para Números/Básico, Funciones, Física de Ondas y Pulsos/Paquetes.
 * Soporta inserción precisa en cursor, avance inteligente entre paréntesis y retroceso.
 */

export class VirtualKeyboard {
  constructor(options = {}) {
    this.targetInput = null;
    this.isOpen = false;
    this.activeTab = 'basic'; // 'basic', 'funcs', 'physics', 'pulses'
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
    if (!this.isOpen) {
      this.open();
    }
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
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  render() {
    this.container.innerHTML = `
      <div class="vk-header">
        <div class="vk-tabs">
          <button class="vk-tab-btn ${this.activeTab === 'basic' ? 'active' : ''}" data-tab="basic">
            123 &amp; Operadores
          </button>
          <button class="vk-tab-btn ${this.activeTab === 'funcs' ? 'active' : ''}" data-tab="funcs">
            Funciones
          </button>
          <button class="vk-tab-btn ${this.activeTab === 'physics' ? 'active' : ''}" data-tab="physics">
            Física Ondulatoria
          </button>
          <button class="vk-tab-btn ${this.activeTab === 'pulses' ? 'active' : ''}" data-tab="pulses">
            Pulsos &amp; Presets
          </button>
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
        <button class="vk-key-util vk-key-backspace" data-action="backspace" title="Borrar">
          ⌫ Borrar
        </button>
        <button class="vk-key-util vk-key-clear" data-action="clear" title="Limpiar expresión">
          Limpiar
        </button>
        <button class="vk-key-util vk-key-confirm" data-action="confirm" title="Aceptar">
          ✓ Listo
        </button>
      </div>
    `;

    this.bindEvents();
  }

  renderTabContent() {
    switch (this.activeTab) {
      case 'basic':
        return `
          <div class="vk-grid-basic">
            <!-- Columna Variables -->
            <div class="vk-col">
              <button class="vk-key vk-key-var" data-insert="x">x</button>
              <button class="vk-key vk-key-var" data-insert="t">t</button>
              <button class="vk-key vk-key-var" data-insert="v">v</button>
              <button class="vk-key vk-key-const" data-insert="pi">π</button>
              <button class="vk-key vk-key-const" data-insert="e">e</button>
            </div>

            <!-- Teclado Numérico -->
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

            <!-- Operadores Básicos -->
            <div class="vk-col">
              <button class="vk-key vk-key-op" data-insert="+">+</button>
              <button class="vk-key vk-key-op" data-insert="-">-</button>
              <button class="vk-key vk-key-op" data-insert="*">·</button>
              <button class="vk-key vk-key-op" data-insert="/">/</button>
              <button class="vk-key vk-key-op" data-insert="^2">x²</button>
            </div>

            <!-- Paréntesis y Estructuras -->
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
            <button class="vk-key vk-key-preset" data-insert="(x - v*t)">(x - v·t) [Viajera Derecha]</button>
            <button class="vk-key vk-key-preset" data-insert="(x + v*t)">(x + v·t) [Viajera Izquierda]</button>
            <button class="vk-key vk-key-preset" data-insert="sin(x - 2*t)">sen(x - 2·t)</button>
            <button class="vk-key vk-key-preset" data-insert="sin(x + 2*t)">sen(x + 2·t)</button>
            <button class="vk-key vk-key-preset" data-insert="2 * sin(0.5*x - t)">2·sen(0.5x - t)</button>
            <button class="vk-key vk-key-preset" data-insert="cos(2*x - 3*t + pi/4)">cos(2x - 3t + π/4)</button>
            <button class="vk-key vk-key-preset" data-insert="sin(2*pi*(x/4 - t/2))">sen(2π(x/λ - t/T))</button>
            <button class="vk-key vk-key-preset" data-insert="exp(-0.1*t) * sin(x - 2*t)">Amortiguada e⁻ᵒ˙¹ᵗ</button>
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
            <button class="vk-key vk-key-pulse" data-insert="2 * exp(-((x - v*t)/1.5)^2) * cos(4*(x - v*t))">
              <strong>Paquete de Ondas:</strong> A · exp(-(x-vt)²) · cos(kx)
            </button>
            <button class="vk-key vk-key-pulse" data-insert="-2 / (((x + v*t))^2 + 1)">
              <strong>Pulso Negativo Inverso:</strong> -2 / ((x + v·t)² + 1)
            </button>
            <button class="vk-key vk-key-pulse" data-insert="1.5 / (((x - 3*t + 6)/1.2)^2 + 1)">
              <strong>Pulso Desplazado:</strong> 1.5 / (((x - 3t + 6)/1.2)² + 1)
            </button>
          </div>
        `;

      default:
        return '';
    }
  }

  bindEvents() {
    // Pestañas
    const tabs = this.container.querySelectorAll('.vk-tab-btn');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        this.activeTab = tab.dataset.tab;
        this.render();
      });
    });

    // Botón Cerrar
    const closeBtn = this.container.querySelector('#vk-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    // Teclas de inserción
    const keys = this.container.querySelectorAll('.vk-key');
    keys.forEach(k => {
      k.addEventListener('click', () => {
        const text = k.dataset.insert;
        if (text) this.insertText(text);
      });
    });

    // Acciones de utilidad
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
      // Buscar el primer input de ecuación disponible
      const firstInput = document.querySelector('.wave-equation-input');
      if (firstInput) {
        this.targetInput = firstInput;
      } else {
        return;
      }
    }

    const input = this.targetInput;
    input.focus();

    const start = input.selectionStart !== null ? input.selectionStart : input.value.length;
    const end = input.selectionEnd !== null ? input.selectionEnd : input.value.length;
    const val = input.value;

    const before = val.substring(0, start);
    const after = val.substring(end);

    input.value = before + text + after;

    // Colocar cursor de forma inteligente
    let newCursorPos = start + text.length;

    // Si termina en () o contiene (), posicionar cursor dentro del paréntesis
    if (text.includes('()')) {
      newCursorPos = start + text.indexOf('()') + 1;
    } else if (text.endsWith('( )')) {
      newCursorPos = start + text.length - 2;
    }

    input.setSelectionRange(newCursorPos, newCursorPos);

    // Disparar eventos reactivos
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
