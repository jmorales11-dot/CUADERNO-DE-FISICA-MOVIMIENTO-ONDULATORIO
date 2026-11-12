/**
 * test-runner.mjs
 * Script de validación automatizada para el motor matemático, evaluación física y presets.
 */

import { MathEngine } from './js/math-engine.js';
import { DIDACTIC_PRESETS } from './js/didactic.js';
import { stateManager } from './js/state.js';

console.log('--- INICIANDO PRUEBAS DEL MOTOR MATEMÁTICO ---');

// 1. Expresiones del prompt
const testExprs = [
  '2 * sin(x - v * t)',
  '2 / (((x - v * t))^4 + 1)',
  '2 / ((x - v * t)^4 + 1)',
  '2 * sen(x - v * t)',
  '3 / ((x - 2 * t + 8)^2 + 1)',
  '1.5 * exp(-((x + 2.5 * t - 9) / 2)^2)',
  'cos(2*x - 3*t + pi/4)'
];

let allPassed = true;

testExprs.forEach(expr => {
  const res = MathEngine.compile(expr);
  if (!res.valid) {
    console.error(`❌ Falló compilación de "${expr}":`, res.error);
    allPassed = false;
  } else {
    const val = res.fn(2, 1, 2);
    if (isNaN(val) || !isFinite(val)) {
      console.error(`❌ Evaluación retornó NaN o Inf para "${expr}" en (x=2, t=1, v=2):`, val);
      allPassed = false;
    } else {
      console.log(`✓ "${expr}" compiló y evaluó OK: y(2,1) = ${val.toFixed(4)} | LaTeX: ${res.latex}`);
    }
  }
});

// 2. Muestreo con singularidad
console.log('\n--- PRUEBA DE MUESTREO Y DISCONTINUIDADES ---');
const tanRes = MathEngine.compile('tan(x)');
const samples = MathEngine.sampleWave(tanRes.fn, 1, -Math.PI, Math.PI, 0, 100);
const breaks = samples.filter(p => p.break);
console.log(`Muestreo de tan(x): ${samples.length} puntos generados, ${breaks.length} discontinuidades detectadas.`);
if (breaks.length === 0) {
  console.warn('⚠️ Se esperaba detectar asíntotas en tan(x)');
} else {
  console.log('✓ Detección de discontinuidades funcionando correctamente.');
}

// 3. Verificación de Presets Didácticos
console.log('\n--- PRUEBA DE SITUACIONES DIDÁCTICAS (PRESETS) ---');
console.log(`Total de presets encontrados: ${DIDACTIC_PRESETS.length}`);
DIDACTIC_PRESETS.forEach((preset, idx) => {
  preset.setup();
  const waves = stateManager.state.waves;
  let presetOk = true;
  waves.forEach(w => {
    const comp = MathEngine.compile(w.expr);
    if (!comp.valid) {
      console.error(`❌ Preset "${preset.title}" tiene error en onda "${w.name}": ${comp.error}`);
      presetOk = false;
      allPassed = false;
    }
  });
  if (presetOk) {
    console.log(`✓ Preset [${idx + 1}] "${preset.title}" OK (${waves.length} ondas).`);
  }
});

// 4. Verificación: Ocultar curva vs Excluir de suma
console.log('\n--- PRUEBA: VISIBILIDAD VS INCLUSIÓN EN RESULTANTE ---');
stateManager.state.waves = [
  { id: '1', name: 'y1', expr: '3', v: 0, visible: false, inSum: true, compiled: MathEngine.compile('3') },
  { id: '2', name: 'y2', expr: '5', v: 0, visible: true, inSum: false, compiled: MathEngine.compile('5') },
  { id: '3', name: 'y3', expr: '2', v: 0, visible: true, inSum: true, compiled: MathEngine.compile('2') }
];

const evalRes = MathEngine.evaluateAt(stateManager.state.waves, 0, 0);
// Resultante debe ser y1 + y3 = 3 + 2 = 5 (y2 no está en suma; y1 está oculta pero SÍ en suma)
if (evalRes.resultant === 5) {
  console.log(`✓ Verificación exitosa: Suma resultante = ${evalRes.resultant} (Onda oculta y1 incluida, onda excluida y2 no sumada).`);
} else {
  console.error(`❌ Falló lógica de suma: esperada 5, obtenida ${evalRes.resultant}`);
  allPassed = false;
}

// 5. Verificación: Cambio de escala no altera ecuaciones ni parámetros físicos
console.log('\n--- PRUEBA: ESCALA INDEPENDIENTE DE PARÁMETROS FÍSICOS ---');
const prevWaveState = JSON.stringify(stateManager.state.waves.map(w => ({ expr: w.expr, v: w.v })));
stateManager.setViewport(-100, 100, -50, 50);
stateManager.zoom(2.5, 0, 0);
const postWaveState = JSON.stringify(stateManager.state.waves.map(w => ({ expr: w.expr, v: w.v })));

if (prevWaveState === postWaveState) {
  console.log('✓ Verificación exitosa: Cambio de escala en viewport NO altera los parámetros físicos ni ecuaciones.');
} else {
  console.error('❌ Error: El cambio de escala mutó parámetros físicos!');
  allPassed = false;
}

console.log('\n=============================================');
if (allPassed) {
  console.log('🎉 TODAS LAS PRUEBAS MATEMÁTICAS Y FÍSICAS PASARON CON ÉXITO');
} else {
  console.log('❌ ALGUNAS PRUEBAS FALLARON');
  process.exit(1);
}
