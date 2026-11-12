/**
 * export-import.js
 * Módulo para exportación e importación de configuraciones en JSON
 * y exportación del gráfico en alta resolución PNG para informes y exámenes.
 */

import { stateManager } from './state.js';
import { MathEngine } from './math-engine.js';

export class ExportImportManager {
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
      styles: stateManager.state.styles,
      time: {
        speed: stateManager.state.time.speed,
        step: stateManager.state.time.step
      }
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
            throw new Error('Formato JSON no válido: falta arreglo de ondas');
          }

          // Cargar ondas
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
      alert('No se pudo exportar la imagen debido a una restricción de seguridad del navegador.');
    }
  }
}
