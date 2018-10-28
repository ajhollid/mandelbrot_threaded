import createColors from './colors';
import Worker from './mandelbrot.worker';
import Utils from './utils';

// Key values for generating set
const MAX_WORKERS = 6;
const DEF_MAX_ITERATIONS = 1000;
const DEF_ESCAPE_RADIUS = 2 ** 8;
const DEF_ZOOM_STEP = 1.5;

const options = {
  iterations: DEF_MAX_ITERATIONS,
  escapeRadius: DEF_ESCAPE_RADIUS,
  zoomStep: DEF_ZOOM_STEP,
};

// Dimens for drawing
const CANVAS_WIDTH = window.innerWidth;
const CANVAS_HEIGHT = window.innerHeight;
const DEFAULT_DIMENS = {
  minReal: -2,
  maxReal: 1.3,
  minImaginary: -1.4,
  maxImaginary: 1.5,
};

const PAN_INCREMENT = 0.02;
let zoomFactor = 1;
let currentDimens = {};


// Colors
const MAX_COLORS = 2 ** 11;
const DEFAULT_COLORS = [
  { r: 0, g: 7, b: 100 },
  { r: 32, g: 107, b: 203 },
  { r: 237, g: 255, b: 255 },
  { r: 255, g: 170, b: 0 },
  { r: 0, g: 2, b: 0 },

];
let currentColors = DEFAULT_COLORS.slice();
let colorArray = [];

// Set up canvas
const myCanvas = document.getElementById('canvas');
myCanvas.width = CANVAS_WIDTH;
myCanvas.height = CANVAS_HEIGHT;
const X_OFFSET = myCanvas.offsetLeft;
const Y_OFFSET = myCanvas.offsetTop;
const context = myCanvas.getContext('2d');

// Sets the key info in the info box
function setInfo(dimens, userOptions) {
  const dimenObj = {
    0: () => document.getElementById('minReal'),
    1: () => document.getElementById('maxReal'),
    2: () => document.getElementById('minImag'),
    3: () => document.getElementById('maxImag'),
  };
  // Iterate over the keys in the dimens object
  for (let i = 0; i < Object.keys(dimens).length; i++) {
    const fn = dimenObj[i];
    if (fn) {
      const dimenSpan = fn();
      // Pull out the appropriate dimension
      dimenSpan.textContent = dimens[Object.keys(dimens)[i]];
    }
  }

  // Set options:
  const optionsObj = {
    0: () => document.getElementById('iterations'),
    1: () => document.getElementById('escapeRadius'),
    2: () => document.getElementById('zoomStep'),
  };

  for (let j = 0; j < Object.keys(userOptions).length; j++) {
    const fn = (optionsObj[j]);
    if (fn) {
      const optionInput = fn();
      optionInput.value = userOptions[Object.keys(userOptions)[j]];
    }
  }
}


function drawMandelbrot(dimens, userOptions) {
  let {
    minReal,
    maxReal,
    minImaginary,
    maxImaginary,
  } = dimens;
  // Generate colors
  colorArray = createColors(MAX_COLORS, currentColors);
  // Correct for aspect ratio
  const ratio = Math.abs(dimens.maxReal - dimens.minReal)
    / Math.abs(dimens.maxImaginary - dimens.minImaginary);
  const sratio = CANVAS_WIDTH / CANVAS_HEIGHT;
  if (sratio > ratio) {
    const xf = sratio / ratio;
    minReal *= xf;
    maxReal *= xf;
  } else {
    const yf = ratio / sratio;
    minImaginary *= yf;
    maxImaginary *= yf;
  }

  // Calculate factors to convert X and Y to real and imaginary components of a compelx number
  const realFactor = Utils.calcRealFactor(maxReal, minReal, CANVAS_WIDTH);
  const imaginaryFactor = Utils.calcImaginaryFactor(maxImaginary, minImaginary, CANVAS_HEIGHT);
  const workerFunction = function (e) {
    const { points } = e.data;
    for (let i = 0; i < points.length; i++) {
      const { y, fillStyle } = points[i];
      context.fillStyle = fillStyle;
      context.fillRect(e.data.x, y, 1, 1);
    }
    let currentX = e.data.x;
    // Start work on the column MAX_WORKERS down the axis
    currentX += MAX_WORKERS;
    // If we haven't reached the end of the canvas
    if (currentX < CANVAS_WIDTH) {
      // Send a message to the current worker to work on the next x
      this.postMessage({
        options: userOptions,
        x: currentX,
        CANVAS_HEIGHT,
        colorArray,
        realFactor,
        imaginaryFactor,
        minReal,
        maxReal,
        minImaginary,
        maxImaginary,
      });
    }
  };
  // Create worker threads and have each thread handle one column of data
  for (let x = 0; x < MAX_WORKERS; x++) {
    const worker = new Worker();
    worker.postMessage({
      options: userOptions,
      x,
      CANVAS_HEIGHT,
      colorArray,
      realFactor,
      imaginaryFactor,
      minReal,
      maxReal,
      minImaginary,
      maxImaginary,
    });
    worker.onmessage = workerFunction;
  }
  setInfo(currentDimens, options);
}


// Get clicks on background canvas via bubbling
const body = document.getElementsByTagName('body')[0];

// Handle zoom in
body.addEventListener('click', (e) => {
  const zoomResults = Utils.handleZoom(
    e,
    options.zoomStep, zoomFactor, currentDimens, CANVAS_WIDTH, CANVAS_HEIGHT, X_OFFSET, Y_OFFSET,
  );
  ({ currentDimens, zoomFactor } = zoomResults);
  drawMandelbrot(currentDimens, options);
});

// Handle zoom out
body.addEventListener('contextmenu', (e) => {
  const zoomResults = Utils.handleZoom(
    e,
    1 / DEF_ZOOM_STEP, zoomFactor, currentDimens, CANVAS_WIDTH, CANVAS_HEIGHT, X_OFFSET, Y_OFFSET,
  );
  ({ currentDimens, zoomFactor } = zoomResults);
  drawMandelbrot(currentDimens, options);
});

// Block all clicks on the control/info area
const elementsToBlock = document.getElementsByClassName('block');
for (let i = 0; i < elementsToBlock.length; i++) {
  const el = elementsToBlock[i];
  el.addEventListener('click', (event) => {
    event.stopPropagation();
  });
}


// handle color picking
window.updateColor = function (colorData, gradientPosition) {
  // Round values in color array, destructure and assign to r, g, b
  const [r, g, b] = colorData.rgb.map(colorChannel => Math.round(colorChannel));
  currentColors[gradientPosition] = { r, g, b };
  drawMandelbrot(currentDimens);
  document.getElementsByClassName('jscolor')[gradientPosition].jscolor.hide();
};


window.pan = function (e, direction) {
  e.stopPropagation();
  currentDimens = Utils.handlePan(direction, PAN_INCREMENT, currentDimens);
  drawMandelbrot(currentDimens, options);
};

// Update options
window.updateMandelbrot = function () {
  const userIterations = document.getElementById('iterations').value;
  const escapeRadius = document.getElementById('escapeRadius').value;
  const zoomStep = document.getElementById('zoomStep').value;
  if (userIterations) {
    options.iterations = parseInt(userIterations, 10);
  } else options.iterations = DEF_MAX_ITERATIONS;
  if (escapeRadius) {
    options.escapeRadius = parseFloat(escapeRadius);
  } else options.escapeRadius = DEF_ESCAPE_RADIUS;
  if (zoomStep) {
    options.zoomStep = parseFloat(zoomStep);
  } else options.zoomStep = DEF_ZOOM_STEP;
  drawMandelbrot(currentDimens, options);
};

window.handleZoomStep = function () {
  const zoomStep = document.getElementById('zoomStep').value;
  if (zoomStep) {
    options.zoomStep = parseFloat(zoomStep);
  } else options.zoomStep = DEF_ZOOM_STEP;
};

window.reset = () => {
  currentDimens = { ...DEFAULT_DIMENS };
  currentColors = DEFAULT_COLORS.slice();
  options.iterations = DEF_MAX_ITERATIONS;
  options.escapeRadius = DEF_ESCAPE_RADIUS;
  options.zoomStep = DEF_ZOOM_STEP;
  const inputs = document.getElementsByClassName('jscolor');
  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i];
    input.jscolor.fromRGB(currentColors[i].r, currentColors[i].g, currentColors[i].b);
  }
  drawMandelbrot(currentDimens, options);
};

currentDimens = { ...DEFAULT_DIMENS };
drawMandelbrot(currentDimens, options);
