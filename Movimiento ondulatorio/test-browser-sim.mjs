/**
 * test-browser-sim.mjs
 * Simula el entorno del navegador para detectar cualquier excepción o fallo en app.js
 */

// Crear mocks mínimos para simular el DOM de index.html
class MockElement {
  constructor(id, tag = 'div') {
    this.id = id;
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.classList = {
      add: () => {},
      remove: () => {},
      toggle: () => {},
      contains: () => false
    };
    this.style = {};
    this.dataset = {};
    this.innerHTML = '';
    this._listeners = {};
  }
  addEventListener(event, cb) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(cb);
  }
  removeEventListener() {}
  dispatchEvent() { return true; }
  querySelector(sel) {
    return new MockElement(sel);
  }
  querySelectorAll(sel) {
    return [];
  }
  getBoundingClientRect() {
    return { width: 800, height: 600, top: 0, left: 0, right: 800, bottom: 600 };
  }
  getContext(type) {
    return {
      save: () => {},
      restore: () => {},
      scale: () => {},
      fillRect: () => {},
      clearRect: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
      fill: () => {},
      arc: () => {},
      closePath: () => {},
      setLineDash: () => {},
      fillText: () => {},
      roundRect: () => {},
      quadraticCurveTo: () => {}
    };
  }
}

global.window = global;
global.document = {
  readyState: 'complete',
  createElement: (tag) => new MockElement('mock-' + tag, tag),
  getElementById: (id) => new MockElement(id),
  querySelector: (sel) => new MockElement(sel),
  querySelectorAll: () => [],
  addEventListener: () => {},
  body: new MockElement('body'),
  activeElement: null
};
global.performance = { now: () => Date.now() };
global.requestAnimationFrame = (cb) => setTimeout(cb, 16);

console.log('--- Probando importación de app.js ---');
try {
  await import('./js/app.js');
  console.log('✓ app.js se importó y ejecutó sin errores.');
  console.log('✓ window.app existe:', typeof global.window.app);
} catch (err) {
  console.error('❌ Error al ejecutar app.js:', err);
}
