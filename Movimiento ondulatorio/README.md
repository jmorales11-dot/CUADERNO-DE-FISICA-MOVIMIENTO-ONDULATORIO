# OndaLab Pro &bull; Simulador de Movimiento Ondulatorio y Superposición de Ondas

Una aplicación web interactiva, moderna y rigurosa diseñada para la enseñanza y el aprendizaje del **Movimiento Ondulatorio, la Propagación y el Principio de Superposición en Física**.

---

## 🚀 Instrucciones de Ejecución

La aplicación está construida enteramente con **HTML5, CSS3 y JavaScript moderno (ES Modules)**, sin dependencias pesadas ni frameworks de compilación (sin React, Vue o Node obligatorios para su ejecución en producción).

### Opción 1: Servidor Local Rápido (Recomendado)
Para evitar restricciones de seguridad CORS del navegador con ES Modules (`import/export` locales), ejecuta un servidor HTTP simple:

```bash
# Con Python 3
python -m http.server 8080

# O con Node.js (npx)
npx serve .
```

Abre en tu navegador: **`http://localhost:8080`**.

### Opción 2: Abrir en Visual Studio Code
Instala la extensión **Live Server** en VS Code y haz clic en *Go Live* desde `index.html`.

---

## 📐 Características Principales

### 1. Plano Cartesiano Interactivo "Estilo GeoGebra"
* **Cuadrícula Mayor y Menor**: Cuadrícula continua con papel milimetrado configurable (subdivisiones decimales dinámicas $1, 2, 5 \times 10^k$).
* **Ejes Graduados**: Reglas sobre los ejes, marcas de ticks mayores y menores, números con halos de lectura y flechas directoras de eje.
* **Manejo Independiente de Escalas**: El cambio de zoom o escala visual modifica **exclusivamente la visualización**, sin mutar ni alterar las ecuaciones matemáticas ni los parámetros físicos de las ondas.
* **Reescalado Manual por Ejes**:
  - Arrastrar sobre el eje horizontal $X$ reescala únicamente la escala horizontal.
  - Arrastrar sobre el eje vertical $Y$ reescala únicamente la escala vertical.
  - Arrastrar en cualquier otra parte del lienzo realiza desplazamiento (paneo).
  - Rueda del mouse (Wheel) realiza zoom continuo centrado exactamente en la posición del puntero.
* **Soporte Táctil Completo**: Desplazamiento con un dedo y pellizco con dos dedos (*pinch-to-zoom*).
* **Renderizado Nítido en Pantallas de Alta Densidad**: Manejo automático de `window.devicePixelRatio` para pantallas Retina y monitores 4K.
* **Muestreo Adaptativo Libre de Singularidades**: El algoritmo de muestreo analiza las derivadas discretas y el signo para detectar asíntotas verticales (p. ej., en funciones tangentes o racionales con polos) y corta el trazo (`ctx.moveTo`) en lugar de conectar puntos artificialmente a través de discontinuidades.

### 2. Principio de Superposición y Gestión de Ondas
* **Editor Dinámico de Ondas**: Añade, duplica, edita o elimina tantas ondas componentes como desees.
* **Soporte de Expresiones Arbitrarias**:
  - Ondas viajeras armónicas: $y(x,t) = 2 \cdot \sin(x - v \cdot t)$
  - Pulsos cuárticos y de Lorentz: $y(x,t) = \frac{2}{(x - v \cdot t)^4 + 1}$
  - Pulsos gaussianos y paquetes de ondas: $A e^{-(x - v \cdot t)^2} \cos(kx)$
  - Notación tanto en español (`sen`, `tg`, `arcsen`) como estándar (`sin`, `tan`, `asin`), potencias `^` y productos implícitos.
* **Previsualización KaTeX en Vivo**: Cada onda muestra su ecuación renderizada en tipografía matemática LaTeX en tiempo real.
* **Distinción Rigurosa**:
  - **Ocultar una curva** (👁️): La curva deja de dibujarse en el plano para facilitar la inspección visual, pero **se mantiene sumada** en la resultante si su interruptor $\Sigma$ está activo.
  - **Excluir de la suma** ($\Sigma$): La curva se desactiva del cálculo de superposición $Y(x, t) = \sum y_i(x, t)$.
* **Vectores de Propagación**: Indicadores y flechas vectoriales sobre las crestas que señalan la dirección física del avance según el signo y magnitud de $v$.

### 3. Teclado Virtual Matemático Profesional
* Accesible mediante el icono de teclado en cada tarjeta o en la barra inferior.
* Organizado en 4 secciones especializadas:
  1. **123 & Operadores**: Teclado numérico, variables físicas ($x, t, v$), constantes ($\pi, e$) y operadores básicos ($+, -, \cdot, /, \wedge$).
  2. **Funciones**: Funciones trigonométricas, exponenciales, logaritmos, valor absoluto y raíces.
  3. **Física Ondulatoria**: Plantillas directas de argumentos de ondas viajeras progresivas $(x - v \cdot t)$ y regresivas $(x + v \cdot t)$, ondas con desfase y amortiguadas.
  4. **Pulsos & Presets**: Pulsos de Lorentz, cuárticos, gaussianos y paquetes de ondas.
* Inserción en posición de cursor con posicionamiento inteligente dentro de los paréntesis.

### 4. Inspector de Posición $x$
* Herramienta activable desde la barra GeoGebra o con el atajo de teclado `i`.
* Traza una línea guía vertical con marcadores de colores en cada componente y en la resultante.
* Despliega un panel flotante de alta precisión (HUD) con los valores numéricos instantáneos:
  - Posición espacial $x$
  - Tiempo de simulación $t$
  - Elongación individual $y_i(x, t)$ de cada onda
  - Elongación resultante total $Y(x, t)$

### 5. Experiencia Didáctica (6 Presets de Física)
Incluye una biblioteca de situaciones experimentales listas para analizar en clase:
1. **Dos pulsos iguales en sentidos opuestos**: Interferencia constructiva y conservación de forma tras el cruce.
2. **Dos pulsos de signos contrarios**: Interferencia destructiva total; análisis de la energía cinética transversal cuando la cuerda está plana.
3. **Pulsos con diferentes amplitudes y anchuras**: Superposición asimétrica.
4. **Superposición de tres o más componentes (Fourier)**: Síntesis armónica periódica.
5. **Dos ondas sinusoidales con desfase**: Comprobación analítica de la modulación por desfase $\Delta\phi$.
6. **Ondas Estacionarias (Nodos y Antinodos)**: Superposición armónica contrapropagante con nodos permanentes en $x = n\pi$.
* Cada preset incluye **fundamento teórico** y **preguntas de predicción** con pistas desplegables para incentivar el método científico en los estudiantes.

### 6. Paleta de Estilos y Temas
* Personalización completa de:
  - Color de fondo del lienzo
  - Colores y grosores de ejes graduados
  - Cuadrícula mayor y menor (color, grosor, visibilidad)
  - Tamaño de números y etiquetas
  - Estilos de línea (continua, trazos, puntos) y colores por onda
  - Estilo exclusivo de la onda resultante (grosor reforzado, resplandor, área sombreada bajo la curva)
  - Vectores de propagación (visibilidad y opacidad)
* Temas listos: **GeoGebra Clásico**, **Modo Oscuro Pro**, **Papel Milimetrado**, **Laboratorio Neón**.

### 7. Ventana Modal Ampliada Sincronizada
* Permite proyectar el gráfico en gran tamaño o en **Pantalla Completa**.
* Estados de ventana: Maximizar, Restaurar, Colapsar/Minimizar y Cerrar (con tecla `Esc`).
* **Sincronización Total**: Ambas vistas comparten el mismo estado, parámetros y reloj de tiempo en el mismo bucle de 60 FPS, garantizando que no existan desincronizaciones ni sobrecarga de CPU/GPU.

### 8. Exportación e Importación
* **Exportar/Importar Configuración en JSON**: Guarda simulaciones completas para reutilizarlas en tareas o exámenes.
* **Exportar Gráfico en PNG**: Captura el lienzo en alta definición para informes de laboratorio o presentaciones.

---

## ⌨️ Atajos de Teclado

| Tecla | Acción |
| :--- | :--- |
| `Espacio` | Reproducir / Pausar simulación |
| `→` / `←` | Avanzar / Retroceder tiempo ($\pm 0.1\text{ s}$) |
| `R` | Restablecer vista del plano cartesiano al origen |
| `T` | Reiniciar tiempo a $t = 0\text{ s}$ |
| `I` | Activar / Desactivar Inspector de punto $x$ |
| `K` | Abrir / Cerrar Teclado Virtual Matemático |
| `P` | Abrir / Cerrar Paleta de Estilos |
| `M` | Abrir / Cerrar Ventana Modal Ampliada |
| `Esc` | Cerrar modales o desenfocar entradas |

---

## 🏛️ Arquitectura del Código

El proyecto sigue una separación rigurosa de responsabilidades:

```
├── index.html               # Estructura semántica, accesibilidad y contenedores
├── css/
│   ├── main.css             # Tokens de diseño, variables, tipografía y maquetación
│   ├── canvas.css           # Lienzo y barra flotante GeoGebra
│   ├── controls.css         # Tarjetas de ondas, resultante, didáctica y reproducción
│   ├── keyboard.css         # Teclado virtual matemático táctil
│   ├── modal.css            # Ventana modal ampliada sincronizada
│   └── palette.css          # Paleta de estilos gráficos y temas
├── js/
│   ├── math-engine.js       # Compilador dinámico, saneamiento y detección de singularidades
│   ├── state.js             # Estado global reactivo con bus de eventos desacoplado
│   ├── cartesian-plane.js   # Renderizador 2D GeoGebra, cuadrículas y muestreo adaptativo
│   ├── wave-manager.js      # Interfaz de tarjetas de ondas, KaTeX e interruptores
│   ├── virtual-keyboard.js  # Lógica del teclado virtual con inserción en cursor
│   ├── didactic.js          # Situaciones físicas predefinidas y preguntas de predicción
│   ├── modal-manager.js     # Gestión de ventana ampliada y sincronización
│   ├── palette-manager.js   # Personalización de estilos y temas
│   ├── export-import.js     # Serialización JSON y captura de imágenes PNG
│   └── app.js               # Coordinador principal y bucle unificado de animación a 60 FPS
├── test-runner.mjs          # Batería de pruebas automatizadas de física y matemáticas
└── README.md                # Documentación del proyecto
```

---

## 🔍 Consideraciones y Limitaciones Físicas Reales

1. **Frecuencias Espaciales Extremas (Teorema de Nyquist)**: Si se escribe una ecuación con número de onda artificialmente gigante (por ejemplo, $k > 500\text{ rad/m}$ o $\sin(1000x)$), el número discreto de píxeles en pantalla puede producir aliasing visual. La aplicación emplea hasta 2400 puntos de muestreo adaptativo para maximizar la resolución en pantallas 4K.
2. **Dispersión**: La simulación asume medios lineales ideales en los que rige estrictamente el principio de superposición clásica. Si se desea simular dispersión dependiente de la longitud de onda, basta con asignar velocidades $v(\lambda)$ diferentes a cada componente en las tarjetas de ondas.
