/**
 * didactic.js
 * Módulo didáctico y biblioteca de situaciones de física ondulatoria para clase.
 * Incluye presets listos para cargar, explicaciones físicas rigurosas,
 * preguntas orientadoras para formulación de hipótesis y respuestas desplegables.
 */

import { stateManager } from './state.js';
import { MathEngine } from './math-engine.js';

export const DIDACTIC_PRESETS = [
  {
    id: 'pulsos_iguales',
    title: '1. Dos pulsos iguales en sentidos opuestos',
    category: 'Interferencia Constructiva',
    description: 'Dos pulsos idénticos de perfil simétrico lorentziano se aproximan con rapideces opuestas (+2 m/s y -2 m/s). Al encontrarse en el centro (x=0), sus elongaciones se suman algebraicamente dando un pico de amplitud doble.',
    explanation: 'El principio de superposición establece que el desplazamiento de cualquier punto de la cuerda es la suma algebraica directa de los desplazamientos que produciría cada onda por separado. Cuando los máximos coinciden, la interferencia es constructiva pura. Tras el cruce, los pulsos continúan su propagación sin sufrir deformación ni pérdida de energía.',
    questions: [
      {
        q: '¿Qué ocurrirá con la forma y la altura máxima de la cuerda cuando ambos pulsos coincidan exactamente en el origen (x = 0)?',
        hint: 'Suma las amplitudes máximas de cada pulso individual: 2 + 2.'
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
    explanation: 'Durante el instante en que las crestas y valles coinciden, la suma y₁ + y₂ es cero en cada punto y la cuerda parece completamente plana. Sin embargo, la energía mecánica NO desaparece: en ese instante toda la energía potencial elástica se ha transformado en energía cinética transversal (las partículas de la cuerda se mueven a velocidad máxima). Inmediatamente después, cada pulso resurge intacto.',
    questions: [
      {
        q: 'Si en el instante del cruce la cuerda queda totalmente horizontal (amplitud cero en todos los puntos), ¿desapareció la energía de los pulsos?',
        hint: 'Piensa en las dos formas de energía de una onda: potencial elástica y cinética transversal (dy/dt).'
      },
      {
        q: '¿Hacia dónde se mueve cada pulso después de haberse cruzado?',
        hint: 'Verifica la polaridad y el sentido de propagación para t > 4 s.'
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
    description: 'Un pulso cuártico angosto de gran amplitud y un pulso ancho gaussiano de menor amplitud. Muestra la superposición de perfiles no idénticos.',
    explanation: 'La superposición no requiere formas simétricas. La forma de la onda resultante cambia continuamente a medida que los pulsos se traslapan debido a la diferencia en sus pendientes y extensiones espaciales.',
    questions: [
      {
        q: '¿La forma de la onda resultante es simétrica durante el traslape?',
        hint: 'Compara las derivadas espaciales de un pulso con potencia 4 versus un pulso gaussiano.'
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
    description: 'Tres ondas sinusoidales armónicas con frecuencias y amplitudes decrecientes (fundamental, 2° y 3° armónico) que viajan juntas formando un perfil periódico complejo.',
    explanation: 'Cualquier forma de onda periódica puede descomponerse en una serie de ondas sinusoidales armónicas (Teorema de Fourier). Cuando todas las componentes viajan a la misma velocidad de fase (medio no dispersivo), la onda compuesta mantiene su forma mientras viaja.',
    questions: [
      {
        q: '¿Por qué la onda resultante no se deforma a lo largo del tiempo en este caso?',
        hint: 'Revisa las velocidades de propagación v de las tres ondas. Si todas viajan con la misma rapidez, no hay dispersión.'
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
          opacity: 0.8,
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
          opacity: 0.8,
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
          opacity: 0.8,
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
    description: 'Dos ondas sinusoidales de igual frecuencia pero desfasadas un ángulo constante φ = π/2 o π. Permite comprobar la fórmula analítica 2A cos(Δφ/2) sin(kx - ωt + φ/2).',
    explanation: 'La amplitud de la onda resultante depende críticamente de la diferencia de fase: si Δφ = 0 están en fase (constructiva pura, amplitud 2A); si Δφ = π están en contrafase (destructiva pura, amplitud 0); para desfases intermedios se obtiene una sinusoide de amplitud intermedia.',
    questions: [
      {
        q: '¿Qué valor de desfase φ producirá una anulación completa en todo instante de tiempo?',
        hint: 'Busca el valor en radianes donde cos(Δφ/2) = 0, es decir Δφ = π (180°).'
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
    description: 'Dos ondas armónicas de idéntica amplitud y longitud de onda que viajan en direcciones contrarias (+v y -v). La superposición produce puntos fijos en reposo (nodos) y puntos de máxima oscilación (antinodos).',
    explanation: 'Por identidades trigonométricas: sin(kx - ωt) + sin(kx + ωt) = 2 sin(kx) cos(ωt). Las variables espacial y temporal quedan factorizadas: no hay propagación neta de energía a lo largo de la cuerda. Los nodos ocurren donde sin(kx) = 0.',
    questions: [
      {
        q: '¿En qué posiciones fijas x la cuerda nunca se mueve (nodos)? Utiliza el inspector en esos puntos.',
        hint: 'Busca los puntos donde x = n · π ≈ 0, 3.14, 6.28, -3.14...'
      },
      {
        q: '¿Viaja energía a lo largo de la onda resultante en este caso?',
        hint: 'La energía queda confinada oscilando entre energía cinética y potencial en cada bucle o vientre.'
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

export class DidacticManager {
  constructor(containerElement) {
    this.container = containerElement;
    this.currentPreset = DIDACTIC_PRESETS[5]; // Estacionaria por defecto
    this.init();
  }

  init() {
    this.render();
  }

  loadPreset(presetId) {
    const preset = DIDACTIC_PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    this.currentPreset = preset;
    stateManager.state.didactic.currentPresetId = preset.id;
    preset.setup();

    // Recompilar funciones síncronamente
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

      <!-- Selector de Situaciones Didácticas -->
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

      <!-- Descripción y Explicación Física -->
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

      <!-- Preguntas Orientadoras para Hipótesis y Predicción -->
      <div class="didactic-card questions-card">
        <div class="didactic-card-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          Preguntas de Predicción (Antes de reproducir)
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

    this.bindEvents();
  }

  bindEvents() {
    const sel = this.container.querySelector('#select-preset');
    if (sel) {
      sel.addEventListener('change', (e) => {
        this.loadPreset(e.target.value);
      });
    }
  }
}
