/**
 * math-engine.js
 * Motor matemático para análisis, compilación y evaluación de funciones de onda y pulsos.
 * Soporta expresiones arbitrarias y(x, t, v), detección de discontinuidades y generación de LaTeX.
 */

export class MathEngine {
  /**
   * Reemplaza de forma segura el operador de potencia '^' por 'Math.pow(base, exp)'.
   * Evita el error sintáctico de JS con operadores unarios (como -term**2) y respeta paréntesis anidados.
   */
  static replacePowers(expr) {
    let idx = expr.indexOf('^');
    let guard = 0;
    while (idx !== -1 && guard++ < 50) {
      // 1. Buscar operando izquierdo
      let leftStart = idx - 1;
      while (leftStart >= 0 && /\s/.test(expr[leftStart])) leftStart--;

      let left;
      if (expr[leftStart] === ')') {
        let depth = 1;
        let i = leftStart - 1;
        while (i >= 0 && depth > 0) {
          if (expr[i] === ')') depth++;
          else if (expr[i] === '(') depth--;
          i--;
        }
        left = expr.substring(i + 1, leftStart + 1);
        leftStart = i + 1;
      } else {
        let i = leftStart;
        while (i >= 0 && /[a-zA-Z0-9_.]/.test(expr[i])) i--;
        left = expr.substring(i + 1, leftStart + 1);
        leftStart = i + 1;
      }

      // 2. Buscar operando derecho
      let rightStart = idx + 1;
      while (rightStart < expr.length && /\s/.test(expr[rightStart])) rightStart++;

      let right, rightEnd;
      if (expr[rightStart] === '(') {
        let depth = 1;
        let i = rightStart + 1;
        while (i < expr.length && depth > 0) {
          if (expr[i] === '(') depth++;
          else if (expr[i] === ')') depth--;
          i++;
        }
        right = expr.substring(rightStart, i);
        rightEnd = i;
      } else {
        let i = rightStart;
        while (i < expr.length && /[a-zA-Z0-9_.]/.test(expr[i])) i++;
        right = expr.substring(rightStart, i);
        rightEnd = i;
      }

      if (!left || !right) {
        // Fallback básico si la sintaxis era anómala
        expr = expr.replace('^', '**');
        break;
      }

      const replacement = `Math.pow(${left}, ${right})`;
      expr = expr.substring(0, leftStart) + replacement + expr.substring(rightEnd);
      idx = expr.indexOf('^');
    }
    return expr;
  }

  /**
   * Limpia y normaliza una expresión matemática en español o notación estándar.
   * Transforma 'sen' -> 'sin', 'tg' -> 'tan', implícitas como '2x' -> '2*x', '2pi' -> '2*Math.PI', etc.
   */
  static normalizeExpression(rawExpr) {
    if (!rawExpr || typeof rawExpr !== 'string') return '0';

    let expr = rawExpr.trim().toLowerCase();

    // 1. Reemplazos de nombres en español / alternativos
    expr = expr.replace(/\bsen\b/g, 'sin');
    expr = expr.replace(/\btg\b/g, 'tan');
    expr = expr.replace(/\barcsen\b/g, 'asin');
    expr = expr.replace(/\barctg\b/g, 'atan');
    expr = expr.replace(/\bln\b/g, 'log');

    // 2. Multiplicaciones implícitas ANTES de anteponer Math.*
    // Número seguido de letra o paréntesis: '2x' -> '2*x', '3sin' -> '3*sin', '2(' -> '2*('
    expr = expr.replace(/(\d)\s*([a-zA-Z_])/g, '$1*$2');
    expr = expr.replace(/(\d)\s*\(/g, '$1*(');

    // Paréntesis cerrado seguido de paréntesis abierto, número o letra: ')( ' -> ')*(', ')2' -> ')*2', ')x' -> ')*x'
    expr = expr.replace(/\)\s*\(/g, ')*(');
    expr = expr.replace(/\)\s*(\d)/g, ')*$1');
    expr = expr.replace(/\)\s*([a-zA-Z_])/g, ')*$1');

    // Variables individuales x, t, v seguidas de '(': 'x(' -> 'x*('
    expr = expr.replace(/\b([xtv])\s*\(/g, '$1*(');

    // 3. Manejo de constantes matemáticas
    expr = expr.replace(/\bpi\b/g, 'Math.PI');
    expr = expr.replace(/\be\b(?![a-z0-9_])/g, 'Math.E');

    // 4. Funciones estándar a Math.*
    const funcs = [
      'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2',
      'sinh', 'cosh', 'tanh', 'exp', 'log', 'log10', 'sqrt',
      'cbrt', 'abs', 'floor', 'ceil', 'round', 'sign'
    ];

    funcs.forEach(f => {
      const regex = new RegExp(`(?<!Math\\.)${f}\\(`, 'g');
      expr = expr.replace(regex, `Math.${f}(`);
    });

    // 5. Potencias con Math.pow
    expr = this.replacePowers(expr);

    // 6. Limpieza de posibles operadores duplicados
    expr = expr.replace(/Math\.\*/g, 'Math.');

    return expr;
  }

  /**
   * Compila una expresión de onda en una función JS súper rápida: (x, t, v) => number.
   * Retorna { fn, valid, error, latex }
   */
  static compile(rawExpr) {
    if (!rawExpr || !rawExpr.trim()) {
      return {
        fn: () => 0,
        valid: false,
        error: 'La expresión está vacía',
        latex: 'y(x,t) = 0'
      };
    }

    try {
      const normalized = this.normalizeExpression(rawExpr);

      // Verificación de tokens de seguridad
      const forbidden = /([;`]|window|document|eval|Function|fetch|alert|console|XMLHttpRequest|import|export)/i;
      if (forbidden.test(normalized)) {
        throw new Error('Expresión contiene identificadores no permitidos');
      }

      // Crear función dinámica: (x, t, v)
      const body = `
        "use strict";
        return (function(x, t, v) {
          const k = 1;
          const w = v;
          const omega = v;
          try {
            const val = ${normalized};
            return (typeof val === 'number' && !isNaN(val)) ? val : NaN;
          } catch(e) {
            return NaN;
          }
        });
      `;

      const factory = new Function(body);
      const fn = factory();

      // Prueba de validación rápida
      const testVal = fn(1, 0, 1);
      if (isNaN(testVal) && !this.isExpectedSingularity(rawExpr, 1, 0, 1)) {
        const alt1 = fn(0.5, 0.5, 2);
        const alt2 = fn(-1, 1, 1);
        if (isNaN(alt1) && isNaN(alt2)) {
          return {
            fn: () => 0,
            valid: false,
            error: 'La expresión produce valores indefinidos o error de sintaxis',
            latex: this.toLatex(rawExpr)
          };
        }
      }

      return {
        fn,
        valid: true,
        error: null,
        latex: this.toLatex(rawExpr)
      };
    } catch (err) {
      return {
        fn: () => 0,
        valid: false,
        error: err.message || 'Error en sintaxis matemática',
        latex: this.toLatex(rawExpr)
      };
    }
  }

  static isExpectedSingularity(expr, x, t, v) {
    return expr.includes('/') || expr.toLowerCase().includes('tan') || expr.toLowerCase().includes('tg');
  }

  /**
   * Convierte una expresión en texto estándar a una representación LaTeX estética para KaTeX.
   */
  static toLatex(rawExpr) {
    if (!rawExpr || !rawExpr.trim()) return '0';

    let s = rawExpr.trim();

    // Reemplazos de funciones
    s = s.replace(/\bsen\b/g, '\\sin');
    s = s.replace(/\bsin\b/g, '\\sin');
    s = s.replace(/\bcos\b/g, '\\cos');
    s = s.replace(/\btan\b|\btg\b/g, '\\tan');
    s = s.replace(/\bexp\b/g, '\\exp');
    s = s.replace(/\bln\b/g, '\\ln');
    s = s.replace(/\bsqrt\(([^)]+)\)/g, '\\sqrt{$1}');
    s = s.replace(/\bpi\b/gi, '\\pi');

    // Multiplicaciones
    s = s.replace(/\*/g, ' \\cdot ');

    // Potencias: expr^n -> expr^{n}
    s = s.replace(/\^([a-zA-Z0-9_]+)/g, '^{$1}');
    s = s.replace(/\^\(([^)]+)\)/g, '^{$1}');

    // Fracciones simples de tipo a / b
    s = s.replace(/(\d+)\s*\/\s*\(([^)]+)\)/g, '\\frac{$1}{$2}');

    return s;
  }

  /**
   * Evalúa una lista de funciones de onda en una posición x y tiempo t.
   */
  static evaluateAt(waves, x, t) {
    let sum = 0;
    const values = [];

    for (let i = 0; i < waves.length; i++) {
      const wave = waves[i];
      let y = 0;
      if (wave.compiled && wave.compiled.valid) {
        try {
          y = wave.compiled.fn(x, t, wave.v ?? 1);
        } catch (e) {
          y = 0;
        }
      }
      values.push({
        id: wave.id,
        name: wave.name,
        color: wave.color,
        val: isNaN(y) ? 0 : y,
        visible: wave.visible,
        inSum: wave.inSum
      });

      if (wave.inSum && !isNaN(y) && isFinite(y)) {
        sum += y;
      }
    }

    return {
      x,
      t,
      components: values,
      resultant: sum
    };
  }

  /**
   * Genera muestras adaptativas para una onda en el intervalo [xMin, xMax].
   * Maneja singularidades y asíntotas para evitar trazos anómalos.
   */
  static sampleWave(compiledFn, v, xMin, xMax, t, numPoints = 1200, yClamp = 100) {
    const points = [];
    const step = (xMax - xMin) / (numPoints - 1);
    let prevY = null;

    for (let i = 0; i < numPoints; i++) {
      const x = xMin + i * step;
      let y = NaN;

      try {
        y = compiledFn(x, t, v);
      } catch (e) {
        y = NaN;
      }

      // Detección de singularidad por valores no finitos o desbordamiento
      const isSingular = isNaN(y) || !isFinite(y) || Math.abs(y) > yClamp;

      let isDiscontinuity = false;
      if (!isSingular && prevY !== null) {
        const dy = Math.abs(y - prevY);
        const derivative = dy / step;
        // Asintota: pendiente gigantesca cruzando con cambio de signo
        if (derivative > 150 && Math.sign(y) !== Math.sign(prevY) && (Math.abs(y) > 4 || Math.abs(prevY) > 4)) {
          isDiscontinuity = true;
        }
      }

      if (isSingular || isDiscontinuity) {
        points.push({ x, y: NaN, break: true });
        prevY = null;
      } else {
        points.push({ x, y, break: false });
        prevY = y;
      }
    }

    return points;
  }
}
