/**
 * cartesian-plane.js
 * Renderizador de plano cartesiano interactivo estilo GeoGebra para Canvas 2D.
 * Cuadrícula mayor y menor (papel milimetrado), ejes graduados, muestreo adaptativo sin singularidades,
 * reescalado manual por ejes, inspector de punto x y vectores de propagación.
 */

import { MathEngine } from './math-engine.js';
import { stateManager } from './state.js';

export class CartesianPlane {
  constructor(canvasElement, options = {}) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.isModal = !!options.isModal;

    // Estado de interacción
    this.isDragging = false;
    this.dragMode = 'pan'; // 'pan', 'scale-x', 'scale-y'
    this.dragStartScreen = { x: 0, y: 0 };
    this.dragStartWorld = { x: 0, y: 0 };
    this.dragStartViewport = null;

    // Toque
    this.touchPinchDistance = null;
    this.touchStartCenter = null;

    // Cursor e inspector
    this.hoverPosScreen = null;
    this.hoverPosWorld = null;

    // Manejo de eventos
    this.bindEvents();
  }

  /**
   * Ajusta el tamaño real del canvas para pantallas Retina / 4K (DPR)
   */
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    let w = rect.width;
    let h = rect.height;

    if (!w && this.canvas.parentElement) {
      w = this.canvas.parentElement.clientWidth;
    }
    if (!h && this.canvas.parentElement) {
      h = this.canvas.parentElement.clientHeight;
    }

    if (!w || !h) return;

    const targetW = Math.round(w * dpr);
    const targetH = Math.round(h * dpr);

    if (this.canvas.width !== targetW || this.canvas.height !== targetH) {
      this.canvas.width = targetW;
      this.canvas.height = targetH;
    }

    this.dpr = dpr;
    this.width = w;
    this.height = h;
  }


  // --- TRANSFORMACIONES DE COORDENADAS ---

  worldToScreen(wx, wy) {
    const vp = stateManager.state.viewport;
    const sx = ((wx - vp.xMin) / (vp.xMax - vp.xMin)) * this.width;
    const sy = ((vp.yMax - wy) / (vp.yMax - vp.yMin)) * this.height;
    return { x: sx * this.dpr, y: sy * this.dpr };
  }

  screenToWorld(sx, sy) {
    const vp = stateManager.state.viewport;
    // Normalizar si se reciben coordenadas lógicas de pantalla (sin DPR)
    const wx = vp.xMin + (sx / this.width) * (vp.xMax - vp.xMin);
    const wy = vp.yMax - (sy / this.height) * (vp.yMax - vp.yMin);
    return { x: wx, y: wy };
  }

  /**
   * Cálculo de paso de cuadrícula óptimo (1, 2 o 5 * 10^k)
   */
  calculateGridStep(range, pixelSize, targetPixelStep = 80) {
    const unitsPerPixel = range / pixelSize;
    const rawStep = targetPixelStep * unitsPerPixel;
    const exponent = Math.floor(Math.log10(rawStep));
    const fraction = rawStep / Math.pow(10, exponent);

    let niceFraction = 1;
    if (fraction >= 1.5 && fraction < 3.5) {
      niceFraction = 2;
    } else if (fraction >= 3.5 && fraction < 7.5) {
      niceFraction = 5;
    } else if (fraction >= 7.5) {
      niceFraction = 10;
    }

    const majorStep = niceFraction * Math.pow(10, exponent);
    // Papel milimetrado: 5 divisiones menores por cada división mayor
    const minorStep = majorStep / 5;

    return { majorStep, minorStep };
  }

  // --- RENDERIZADO PRINCIPAL ---

  render() {
    this.resize();
    if (!this.width || !this.height) return;

    const ctx = this.ctx;
    const { viewport, styles, waves, resultant, time, inspector } = stateManager.state;
    const theme = styles.theme;

    ctx.save();
    ctx.scale(this.dpr, this.dpr);

    // 1. Limpiar fondo
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, this.width, this.height);

    // 2. Dibujar cuadrícula menor y mayor estilo GeoGebra
    this.renderGrids(ctx, viewport, styles, theme);

    // 3. Dibujar ejes cartesianos graduados
    this.renderAxes(ctx, viewport, styles, theme);

    // 4. Dibujar ondas componentes activas y visibles
    this.renderWaveComponents(ctx, viewport, waves, time.current, styles);

    // 5. Dibujar onda resultante (Superposición)
    if (resultant.visible) {
      this.renderResultantWave(ctx, viewport, waves, resultant, time.current);
    }

    // 6. Dibujar inspector de punto x si está activo o en hover
    if (inspector.active || this.hoverPosWorld) {
      this.renderInspector(ctx, viewport, waves, resultant, time.current, inspector, theme);
    }

    ctx.restore();
  }

  // --- CUADRÍCULAS ---

  renderGrids(ctx, vp, styles, theme) {
    const xRange = vp.xMax - vp.xMin;
    const yRange = vp.yMax - vp.yMin;

    const xGrid = this.calculateGridStep(xRange, this.width, 90);
    const yGrid = this.calculateGridStep(yRange, this.height, 90);

    // Cuadrícula menor (papel milimetrado)
    if (styles.minorGridVisible) {
      ctx.beginPath();
      ctx.strokeStyle = theme.minorGridColor;
      ctx.lineWidth = styles.minorGridWidth;

      // Líneas verticales menores
      const startXMinor = Math.floor(vp.xMin / xGrid.minorStep) * xGrid.minorStep;
      for (let x = startXMinor; x <= vp.xMax; x += xGrid.minorStep) {
        const sx = ((x - vp.xMin) / xRange) * this.width;
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx, this.height);
      }

      // Líneas horizontales menores
      const startYMinor = Math.floor(vp.yMin / yGrid.minorStep) * yGrid.minorStep;
      for (let y = startYMinor; y <= vp.yMax; y += yGrid.minorStep) {
        const sy = ((vp.yMax - y) / yRange) * this.height;
        ctx.moveTo(0, sy);
        ctx.lineTo(this.width, sy);
      }
      ctx.stroke();
    }

    // Cuadrícula mayor
    if (styles.majorGridVisible) {
      ctx.beginPath();
      ctx.strokeStyle = theme.majorGridColor;
      ctx.lineWidth = styles.majorGridWidth;

      // Líneas verticales mayores
      const startXMajor = Math.floor(vp.xMin / xGrid.majorStep) * xGrid.majorStep;
      for (let x = startXMajor; x <= vp.xMax; x += xGrid.majorStep) {
        const sx = ((x - vp.xMin) / xRange) * this.width;
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx, this.height);
      }

      // Líneas horizontales mayores
      const startYMajor = Math.floor(vp.yMin / yGrid.majorStep) * yGrid.majorStep;
      for (let y = startYMajor; y <= vp.yMax; y += yGrid.majorStep) {
        const sy = ((vp.yMax - y) / yRange) * this.height;
        ctx.moveTo(0, sy);
        ctx.lineTo(this.width, sy);
      }
      ctx.stroke();
    }
  }

  // --- EJES Y GRADUACIÓN ---

  renderAxes(ctx, vp, styles, theme) {
    const xRange = vp.xMax - vp.xMin;
    const yRange = vp.yMax - vp.yMin;

    const xGrid = this.calculateGridStep(xRange, this.width, 90);
    const yGrid = this.calculateGridStep(yRange, this.height, 90);

    // Posición en pantalla de y=0 y x=0
    let originYScreen = ((vp.yMax - 0) / yRange) * this.height;
    let originXScreen = ((0 - vp.xMin) / xRange) * this.width;

    // Limitar posición del texto de los ejes si el origen está fuera de la pantalla
    const clampedY = Math.max(24, Math.min(this.height - 24, originYScreen));
    const clampedX = Math.max(30, Math.min(this.width - 30, originXScreen));

    ctx.save();
    ctx.strokeStyle = theme.axisColor;
    ctx.lineWidth = styles.axisWidth;
    ctx.fillStyle = theme.textColor;
    ctx.font = `${styles.fontSizeTicks}px 'JetBrains Mono', 'Outfit', sans-serif`;

    // 1. Eje X
    ctx.beginPath();
    ctx.moveTo(0, originYScreen);
    ctx.lineTo(this.width, originYScreen);
    ctx.stroke();

    // Flecha eje X
    if (styles.showArrows) {
      this.drawArrowhead(ctx, this.width - 12, originYScreen, this.width, originYScreen, 8);
      ctx.font = `bold ${styles.fontSizeLabels}px 'Outfit', sans-serif`;
      ctx.fillText('x', this.width - 16, originYScreen - 8);
      ctx.font = `${styles.fontSizeTicks}px 'JetBrains Mono', sans-serif`;
    }

    // 2. Eje Y
    ctx.beginPath();
    ctx.moveTo(originXScreen, 0);
    ctx.lineTo(originXScreen, this.height);
    ctx.stroke();

    // Flecha eje Y
    if (styles.showArrows) {
      this.drawArrowhead(ctx, originXScreen, 12, originXScreen, 0, 8);
      ctx.font = `bold ${styles.fontSizeLabels}px 'Outfit', sans-serif`;
      ctx.fillText('y', originXScreen + 8, 16);
      ctx.font = `${styles.fontSizeTicks}px 'JetBrains Mono', sans-serif`;
    }

    // 3. Ticks y etiquetas numéricas en eje X
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const startX = Math.floor(vp.xMin / xGrid.majorStep) * xGrid.majorStep;

    for (let x = startX; x <= vp.xMax; x += xGrid.majorStep) {
      if (Math.abs(x) < 1e-9) continue; // Evitar el 0 duplicado en el origen

      const sx = ((x - vp.xMin) / xRange) * this.width;

      // Marcas / ticks
      ctx.beginPath();
      ctx.moveTo(sx, clampedY - 4);
      ctx.lineTo(sx, clampedY + 4);
      ctx.stroke();

      if (styles.showTickLabels) {
        const txt = this.formatNumber(x);
        // Halo de lectura para contraste perfecto
        ctx.fillStyle = theme.bg;
        ctx.fillRect(sx - 14, clampedY + 6, 28, 14);
        ctx.fillStyle = theme.textColor;
        ctx.fillText(txt, sx, clampedY + 6);
      }
    }

    // 4. Ticks y etiquetas numéricas en eje Y
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const startY = Math.floor(vp.yMin / yGrid.majorStep) * yGrid.majorStep;

    for (let y = startY; y <= vp.yMax; y += yGrid.majorStep) {
      if (Math.abs(y) < 1e-9) continue;

      const sy = ((vp.yMax - y) / yRange) * this.height;

      // Marcas / ticks
      ctx.beginPath();
      ctx.moveTo(clampedX - 4, sy);
      ctx.lineTo(clampedX + 4, sy);
      ctx.stroke();

      if (styles.showTickLabels) {
        const txt = this.formatNumber(y);
        ctx.fillStyle = theme.bg;
        ctx.fillRect(clampedX - 32, sy - 7, 26, 14);
        ctx.fillStyle = theme.textColor;
        ctx.fillText(txt, clampedX - 6, sy);
      }
    }

    // Origen '0'
    if (originXScreen >= 0 && originXScreen <= this.width && originYScreen >= 0 && originYScreen <= this.height) {
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillText('0', originXScreen - 4, originYScreen + 4);
    }

    ctx.restore();
  }

  drawArrowhead(ctx, fromX, fromY, toX, toY, headLength = 7) {
    const angle = Math.atan2(toY - fromY, toX - fromX);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headLength * Math.cos(angle - Math.PI / 6), toY - headLength * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(toX - headLength * Math.cos(angle + Math.PI / 6), toY - headLength * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();
    ctx.restore();
  }

  formatNumber(val) {
    if (Math.abs(val) >= 1000 || (Math.abs(val) < 0.01 && val !== 0)) {
      return val.toExponential(1);
    }
    // Redondeo inteligente para evitar 0.30000000000000004
    return parseFloat(val.toFixed(4)).toString();
  }

  // --- ONDAS COMPONENTES ---

  renderWaveComponents(ctx, vp, waves, t, styles) {
    const xRange = vp.xMax - vp.xMin;
    const yRange = vp.yMax - vp.yMin;

    waves.forEach(wave => {
      if (!wave.visible || !wave.compiled || !wave.compiled.valid) return;

      const numPoints = Math.max(600, Math.min(2400, Math.round(this.width * 1.5)));
      const points = MathEngine.sampleWave(wave.compiled.fn, wave.v, vp.xMin, vp.xMax, t, numPoints);

      ctx.save();
      ctx.beginPath();
      ctx.strokeStyle = wave.color;
      ctx.lineWidth = wave.lineWidth || 2;
      ctx.globalAlpha = wave.opacity !== undefined ? wave.opacity : 0.9;

      // Patrón de guiones
      if (wave.lineDash === 'dashed') {
        ctx.setLineDash([8, 6]);
      } else if (wave.lineDash === 'dotted') {
        ctx.setLineDash([3, 4]);
      } else {
        ctx.setLineDash([]);
      }

      let inSegment = false;
      for (let i = 0; i < points.length; i++) {
        const pt = points[i];
        if (pt.break) {
          inSegment = false;
          continue;
        }

        const sx = ((pt.x - vp.xMin) / xRange) * this.width;
        const sy = ((vp.yMax - pt.y) / yRange) * this.height;

        if (!inSegment) {
          ctx.moveTo(sx, sy);
          inSegment = true;
        } else {
          ctx.lineTo(sx, sy);
        }
      }
      ctx.stroke();

      // Vectores de propagación sobre la onda (flechas indicadoras)
      if (styles.showPropagationVectors && Math.abs(wave.v) > 0.01) {
        this.renderWavePropagationVectors(ctx, wave, points, vp);
      }

      ctx.restore();
    });
  }

  renderWavePropagationVectors(ctx, wave, points, vp) {
    const dir = Math.sign(wave.v);
    const speed = Math.abs(wave.v);
    const arrowLen = Math.min(36, Math.max(16, speed * 8));

    // Buscar crestas locales o puntos con amplitud significativa para dibujar la flecha
    const stepSample = Math.floor(points.length / 5);
    const candidateIndices = [
      Math.floor(points.length * 0.25),
      Math.floor(points.length * 0.5),
      Math.floor(points.length * 0.75)
    ];

    ctx.save();
    ctx.strokeStyle = wave.color;
    ctx.fillStyle = wave.color;
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.85;

    candidateIndices.forEach(idx => {
      const pt = points[idx];
      if (!pt || pt.break || Math.abs(pt.y) < 0.2) return;

      const sx = ((pt.x - vp.xMin) / (vp.xMax - vp.xMin)) * this.width;
      const sy = ((vp.yMax - pt.y) / (vp.yMax - vp.yMin)) * this.height;

      // Desplazar flecha ligeramente por encima o por debajo según signo de y
      const offsetY = pt.y >= 0 ? -12 : 12;
      const arrowY = sy + offsetY;
      const fromX = sx - (dir * arrowLen * 0.5);
      const toX = sx + (dir * arrowLen * 0.5);

      ctx.beginPath();
      ctx.moveTo(fromX, arrowY);
      ctx.lineTo(toX, arrowY);
      ctx.stroke();

      this.drawArrowhead(ctx, fromX, arrowY, toX, arrowY, 6);

      // Etiqueta de vector v
      ctx.font = "10px 'JetBrains Mono', sans-serif";
      ctx.textAlign = 'center';
      ctx.fillText(`v=${wave.v > 0 ? '+' : ''}${wave.v}`, sx, arrowY - (pt.y >= 0 ? 6 : -14));
    });

    ctx.restore();
  }

  // --- ONDA RESULTANTE (SUPERPOSICIÓN) ---

  renderResultantWave(ctx, vp, waves, resultant, t) {
    const activeWaves = waves.filter(w => w.inSum && w.compiled && w.compiled.valid);
    if (activeWaves.length === 0) return;

    const xRange = vp.xMax - vp.xMin;
    const yRange = vp.yMax - vp.yMin;
    const numPoints = Math.max(800, Math.min(2600, Math.round(this.width * 1.6)));
    const step = xRange / (numPoints - 1);

    const points = [];
    let prevY = null;

    for (let i = 0; i < numPoints; i++) {
      const x = vp.xMin + i * step;
      let sumY = 0;
      let hasSingularity = false;

      for (let j = 0; j < activeWaves.length; j++) {
        const w = activeWaves[j];
        try {
          const val = w.compiled.fn(x, t, w.v);
          if (isNaN(val) || !isFinite(val) || Math.abs(val) > 150) {
            hasSingularity = true;
            break;
          }
          sumY += val;
        } catch (e) {
          hasSingularity = true;
          break;
        }
      }

      if (hasSingularity) {
        points.push({ x, y: NaN, break: true });
        prevY = null;
      } else {
        points.push({ x, y: sumY, break: false });
        prevY = sumY;
      }
    }

    ctx.save();

    // Relleno de área sutil si está activado
    if (resultant.fillArea) {
      const zeroY = ((vp.yMax - 0) / yRange) * this.height;
      ctx.fillStyle = resultant.color;
      ctx.globalAlpha = resultant.fillOpacity || 0.12;

      ctx.beginPath();
      let started = false;
      for (let i = 0; i < points.length; i++) {
        const pt = points[i];
        if (pt.break) continue;

        const sx = ((pt.x - vp.xMin) / xRange) * this.width;
        const sy = ((vp.yMax - pt.y) / yRange) * this.height;

        if (!started) {
          ctx.moveTo(sx, zeroY);
          ctx.lineTo(sx, sy);
          started = true;
        } else {
          ctx.lineTo(sx, sy);
        }
      }
      if (started) {
        const lastPt = points[points.length - 1];
        const lastSx = ((lastPt.x - vp.xMin) / xRange) * this.width;
        ctx.lineTo(lastSx, zeroY);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Trazo principal de la resultante
    ctx.beginPath();
    ctx.strokeStyle = resultant.color;
    ctx.lineWidth = resultant.lineWidth || 3.5;
    ctx.globalAlpha = resultant.opacity || 1.0;
    ctx.setLineDash(resultant.lineDash === 'dashed' ? [10, 6] : []);

    // Sutil efecto de brillo si está en modo oscuro
    if (stateManager.state.styles.themeKey === 'darkPro' || stateManager.state.styles.themeKey === 'cyberpunk') {
      ctx.shadowColor = resultant.color;
      ctx.shadowBlur = 8;
    }

    let inSegment = false;
    for (let i = 0; i < points.length; i++) {
      const pt = points[i];
      if (pt.break) {
        inSegment = false;
        continue;
      }

      const sx = ((pt.x - vp.xMin) / xRange) * this.width;
      const sy = ((vp.yMax - pt.y) / yRange) * this.height;

      if (!inSegment) {
        ctx.moveTo(sx, sy);
        inSegment = true;
      } else {
        ctx.lineTo(sx, sy);
      }
    }
    ctx.stroke();
    ctx.restore();
  }

  // --- INSPECTOR DE PUNTO X (CROSSHAIR & TOOLTIP) ---

  renderInspector(ctx, vp, waves, resultant, t, inspector, theme) {
    const inspX = inspector.active ? inspector.x : (this.hoverPosWorld ? this.hoverPosWorld.x : 0);
    const xRange = vp.xMax - vp.xMin;
    const yRange = vp.yMax - vp.yMin;

    if (inspX < vp.xMin || inspX > vp.xMax) return;

    const sx = ((inspX - vp.xMin) / xRange) * this.width;

    ctx.save();

    // 1. Línea vertical del inspector
    ctx.beginPath();
    ctx.strokeStyle = theme.crosshairColor || '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, this.height);
    ctx.stroke();
    ctx.setLineDash([]);

    // 2. Evaluar valores en x
    const evalData = MathEngine.evaluateAt(waves, inspX, t);

    // 3. Puntos marcadores en cada componente visible
    evalData.components.forEach(comp => {
      if (!comp.visible) return;
      const sy = ((vp.yMax - comp.val) / yRange) * this.height;

      ctx.beginPath();
      ctx.arc(sx, sy, 5, 0, Math.PI * 2);
      ctx.fillStyle = comp.color;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    // 4. Marcador en la resultante
    if (resultant.visible) {
      const syRes = ((vp.yMax - evalData.resultant) / yRange) * this.height;
      ctx.beginPath();
      ctx.arc(sx, syRes, 7, 0, Math.PI * 2);
      ctx.fillStyle = resultant.color;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    // 5. HUD / Popover de datos sobre el canvas
    this.renderInspectorHUD(ctx, sx, inspX, t, evalData, resultant, theme);

    ctx.restore();
  }

  renderInspectorHUD(ctx, sx, xVal, t, evalData, resultant, theme) {
    const items = [];
    items.push({ label: `x = ${xVal.toFixed(2)} m`, color: theme.textColor, isHeader: true });
    items.push({ label: `t = ${t.toFixed(2)} s`, color: '#64748b', isHeader: true });

    evalData.components.forEach((c, idx) => {
      items.push({
        label: `${c.name}: ${c.val.toFixed(3)}`,
        color: c.color,
        inSum: c.inSum
      });
    });

    if (resultant.visible) {
      items.push({
        label: `Σ Y(x,t): ${evalData.resultant.toFixed(3)}`,
        color: resultant.color,
        isBold: true
      });
    }

    const boxW = 160;
    const lineH = 18;
    const boxH = items.length * lineH + 16;
    let boxX = sx + 14;
    let boxY = 16;

    // Si choca con el borde derecho, colocar a la izquierda
    if (boxX + boxW > this.width) {
      boxX = sx - boxW - 14;
    }

    // Fondo del HUD con sombra
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = 10;
    ctx.fillStyle = stateManager.state.styles.themeKey === 'geogebra' || stateManager.state.styles.themeKey === 'milimetrado'
      ? 'rgba(255, 255, 255, 0.94)'
      : 'rgba(15, 23, 42, 0.94)';
    ctx.strokeStyle = theme.majorGridColor;
    ctx.lineWidth = 1;

    this.roundRect(ctx, boxX, boxY, boxW, boxH, 8);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Textos del HUD
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    items.forEach((item, i) => {
      const py = boxY + 8 + i * lineH;
      ctx.fillStyle = item.color;
      ctx.font = item.isBold
        ? "bold 12px 'JetBrains Mono', sans-serif"
        : item.isHeader
          ? "600 11px 'Outfit', sans-serif"
          : "11px 'JetBrains Mono', sans-serif";

      // Icono o círculo indicador
      if (!item.isHeader) {
        ctx.beginPath();
        ctx.arc(boxX + 12, py + 6, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillText(item.label, boxX + 22, py);
      } else {
        ctx.fillText(item.label, boxX + 10, py);
      }
    });
  }

  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // --- INTERACCIÓN Y GESTIÓN DE EVENTOS ---

  bindEvents() {
    const el = this.canvas;

    // Mouse Move
    el.addEventListener('mousemove', (e) => this.onMouseMove(e));
    el.addEventListener('mouseenter', (e) => this.onMouseEnter(e));
    el.addEventListener('mouseleave', (e) => this.onMouseLeave(e));

    // Mouse Down / Up
    el.addEventListener('mousedown', (e) => this.onMouseDown(e));
    window.addEventListener('mouseup', (e) => this.onMouseUp(e));

    // Wheel (Zoom centrado en cursor)
    el.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });

    // Touch
    el.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
    el.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
    el.addEventListener('touchend', (e) => this.onTouchEnd(e));
  }

  getPointerPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  onMouseMove(e) {
    const pos = this.getPointerPos(e);
    this.hoverPosScreen = pos;
    this.hoverPosWorld = this.screenToWorld(pos.x, pos.y);

    if (stateManager.state.inspector.active) {
      stateManager.setInspectorPos(this.hoverPosWorld.x);
    }

    if (this.isDragging) {
      const dxScreen = pos.x - this.dragStartScreen.x;
      const dyScreen = pos.y - this.dragStartScreen.y;

      const vp = this.dragStartViewport;
      const xRange = vp.xMax - vp.xMin;
      const yRange = vp.yMax - vp.yMin;

      if (this.dragMode === 'pan') {
        const dxWorld = -(dxScreen / this.width) * xRange;
        const dyWorld = (dyScreen / this.height) * yRange;
        stateManager.setViewport(vp.xMin + dxWorld, vp.xMax + dxWorld, vp.yMin + dyWorld, vp.yMax + dyWorld);
      } else if (this.dragMode === 'scale-x') {
        // Reescalar solo eje X tirando del eje
        const factor = Math.exp(-dxScreen / 250);
        const center = this.dragStartWorld.x;
        const newXMin = center + (vp.xMin - center) * factor;
        const newXMax = center + (vp.xMax - center) * factor;
        stateManager.setViewport(newXMin, newXMax, vp.yMin, vp.yMax);
      } else if (this.dragMode === 'scale-y') {
        // Reescalar solo eje Y tirando del eje
        const factor = Math.exp(dyScreen / 200);
        const center = this.dragStartWorld.y;
        const newYMin = center + (vp.yMin - center) * factor;
        const newYMax = center + (vp.yMax - center) * factor;
        stateManager.setViewport(vp.xMin, vp.xMax, newYMin, newYMax);
      }
    } else {
      // Actualizar cursor según proximidad a los ejes (efecto GeoGebra)
      this.updateCursorMode(pos);
    }
  }

  updateCursorMode(pos) {
    const vp = stateManager.state.viewport;
    const originYScreen = ((vp.yMax - 0) / (vp.yMax - vp.yMin)) * this.height;
    const originXScreen = ((0 - vp.xMin) / (vp.xMax - vp.xMin)) * this.width;

    const nearXAxis = Math.abs(pos.y - originYScreen) < 14;
    const nearYAxis = Math.abs(pos.x - originXScreen) < 14;

    if (nearXAxis && nearYAxis) {
      this.canvas.style.cursor = 'move';
    } else if (nearXAxis) {
      this.canvas.style.cursor = 'ew-resize';
    } else if (nearYAxis) {
      this.canvas.style.cursor = 'ns-resize';
    } else {
      this.canvas.style.cursor = stateManager.state.inspector.active ? 'crosshair' : 'grab';
    }
  }

  onMouseDown(e) {
    if (e.button !== 0) return; // Solo botón principal

    const pos = this.getPointerPos(e);
    this.isDragging = true;
    this.dragStartScreen = pos;
    this.dragStartWorld = this.screenToWorld(pos.x, pos.y);
    this.dragStartViewport = { ...stateManager.state.viewport };

    const vp = stateManager.state.viewport;
    const originYScreen = ((vp.yMax - 0) / (vp.yMax - vp.yMin)) * this.height;
    const originXScreen = ((0 - vp.xMin) / (vp.xMax - vp.xMin)) * this.width;

    const nearXAxis = Math.abs(pos.y - originYScreen) < 14;
    const nearYAxis = Math.abs(pos.x - originXScreen) < 14;

    if (nearXAxis && !nearYAxis) {
      this.dragMode = 'scale-x';
      this.canvas.style.cursor = 'ew-resize';
    } else if (nearYAxis && !nearXAxis) {
      this.dragMode = 'scale-y';
      this.canvas.style.cursor = 'ns-resize';
    } else {
      this.dragMode = 'pan';
      this.canvas.style.cursor = 'grabbing';
    }
  }

  onMouseUp() {
    this.isDragging = false;
    this.canvas.style.cursor = 'grab';
  }

  onMouseEnter(e) {
    this.hoverPosScreen = this.getPointerPos(e);
  }

  onMouseLeave() {
    this.hoverPosScreen = null;
    this.hoverPosWorld = null;
  }

  onWheel(e) {
    e.preventDefault();
    const pos = this.getPointerPos(e);
    const worldPos = this.screenToWorld(pos.x, pos.y);

    const zoomFactor = e.deltaY < 0 ? 0.88 : 1.14;
    stateManager.zoom(zoomFactor, worldPos.x, worldPos.y);
  }

  // --- TÁCTIL ---

  onTouchStart(e) {
    if (e.touches.length === 1) {
      e.preventDefault();
      const t = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      const pos = { x: t.clientX - rect.left, y: t.clientY - rect.top };

      this.isDragging = true;
      this.dragMode = 'pan';
      this.dragStartScreen = pos;
      this.dragStartWorld = this.screenToWorld(pos.x, pos.y);
      this.dragStartViewport = { ...stateManager.state.viewport };
    } else if (e.touches.length === 2) {
      e.preventDefault();
      this.isDragging = false;
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dx = t2.clientX - t1.clientX;
      const dy = t2.clientY - t1.clientY;
      this.touchPinchDistance = Math.hypot(dx, dy);

      const rect = this.canvas.getBoundingClientRect();
      const midX = (t1.clientX + t2.clientX) / 2 - rect.left;
      const midY = (t1.clientY + t2.clientY) / 2 - rect.top;
      this.touchStartCenter = this.screenToWorld(midX, midY);
    }
  }

  onTouchMove(e) {
    if (e.touches.length === 1 && this.isDragging) {
      e.preventDefault();
      const t = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      const pos = { x: t.clientX - rect.left, y: t.clientY - rect.top };

      const dxScreen = pos.x - this.dragStartScreen.x;
      const dyScreen = pos.y - this.dragStartScreen.y;
      const vp = this.dragStartViewport;
      const xRange = vp.xMax - vp.xMin;
      const yRange = vp.yMax - vp.yMin;

      const dxWorld = -(dxScreen / this.width) * xRange;
      const dyWorld = (dyScreen / this.height) * yRange;
      stateManager.setViewport(vp.xMin + dxWorld, vp.xMax + dxWorld, vp.yMin + dyWorld, vp.yMax + dyWorld);
    } else if (e.touches.length === 2 && this.touchPinchDistance) {
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dx = t2.clientX - t1.clientX;
      const dy = t2.clientY - t1.clientY;
      const dist = Math.hypot(dx, dy);

      if (dist > 10) {
        const factor = this.touchPinchDistance / dist;
        stateManager.zoom(factor, this.touchStartCenter.x, this.touchStartCenter.y);
        this.touchPinchDistance = dist;
      }
    }
  }

  onTouchEnd(e) {
    if (e.touches.length === 0) {
      this.isDragging = false;
      this.touchPinchDistance = null;
    }
  }
}
