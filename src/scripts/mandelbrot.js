import createColors from './colors.js';
import Worker from './mandelbrot.worker';


const CANVAS_WIDTH = window.innerWidth;
const CANVAS_HEIGHT = window.innerHeight;
const MAX_ITERATIONS = 1000;
const BAILOUT_RADIUS = 2 ** 8;
const MAX_COLORS = 2 ** 11;


// Default values for initialization

const MAX_WORKERS = 6;
const DEF_MIN_REAL = -2;
const DEF_MAX_REAL = 1.3;
const DEF_MIN_IMAGINARY = -1.4;
const DEF_MAX_IMAGINARY = 1.5;

// Zoom and Pan constants
const ZOOM_STEP = 1.5;
const PAN_INCREMENT = 0.02;
let zoomFactor = 1;

// Colors
const DEFAULT_COLORS = [
  { r: 0, g: 7, b: 100 },
  { r: 32, g: 107, b: 203 },
  { r: 237, g: 255, b: 255 },
  { r: 255, g: 170, b: 0 },
  { r: 0, g: 2, b: 0 },

];
const currentColors = DEFAULT_COLORS;

let COLORS = createColors(MAX_COLORS, currentColors);

let currentMinReal = DEF_MIN_REAL;
let currentMaxReal = DEF_MAX_REAL;
let currentMinImaginary = DEF_MIN_IMAGINARY;
let currentMaxImaginary = DEF_MAX_IMAGINARY;


// Set up canvas
const myCanvas = document.getElementById('canvas');
myCanvas.width = CANVAS_WIDTH;
myCanvas.height = CANVAS_HEIGHT;
const X_OFFSET = myCanvas.offsetLeft;
const Y_OFFSET = myCanvas.offsetTop;
const context = myCanvas.getContext('2d');

function calcRealFactor(maxReal, minReal) {
  return (maxReal - minReal) / (CANVAS_WIDTH);
}

function calcImaginaryFactor(maxImaginary, minImaginary) {
  return (maxImaginary - minImaginary) / (CANVAS_HEIGHT);
}

function interpolate(start, end, interpolation) {
  return start + ((end - start) * interpolation);
}

function drawMandelbrot(minReal, maxReal, minImaginary, maxImaginary) {
  // Correct for aspect ratio
  const ratio = Math.abs(maxReal - minReal) / Math.abs(maxImaginary - minImaginary);
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
  const realFactor = calcRealFactor(maxReal, minReal);
  const imaginaryFactor = calcImaginaryFactor(maxImaginary, minImaginary);

  // Create worker threads and have each thread handle one column of data
  for (let x = 0; x < MAX_WORKERS; x++) {
    const worker = new Worker();
    worker.postMessage({
      MAX_ITERATIONS,
      BAILOUT_RADIUS,
      x,
      CANVAS_HEIGHT,
      COLORS,
      realFactor,
      imaginaryFactor,
      minReal,
      maxReal,
      minImaginary,
      maxImaginary,
    });
    worker.onmessage = function (e) {
      const { points } = e.data;
      for (let i = 0; i < points.length; i++) {
        const point = points[i];
        const { y, fillStyle } = point;
        const currentX = e.data.x;
        context.fillStyle = fillStyle;
        context.fillRect(currentX, y, 1, 1);
      }
      let currentX = e.data.x;
      // Start work on the column MAX_WORKERS down the axis
      currentX += MAX_WORKERS;
      // If we haven't reached the end of the canvas
      if (currentX < CANVAS_WIDTH) {
        worker.postMessage({
          MAX_ITERATIONS,
          BAILOUT_RADIUS,
          x: currentX,
          CANVAS_HEIGHT,
          COLORS,
          realFactor,
          imaginaryFactor,
          minReal,
          maxReal,
          minImaginary,
          maxImaginary,
        });
      }
    };
  }
}

function applyZoom(mouseReal, mouseImaginary) {
  // Create a new zoomed in view rectangle
  const interpolation = 1.0 / zoomFactor;
  currentMinReal = interpolate(mouseReal, currentMinReal, interpolation);
  currentMinImaginary = interpolate(mouseImaginary, currentMinImaginary, interpolation);
  currentMaxReal = interpolate(mouseReal, currentMaxReal, interpolation);
  currentMaxImaginary = interpolate(mouseImaginary, currentMaxImaginary, interpolation);

  // Center on the mouse click
  const centerReal = (currentMinReal + currentMaxReal) / 2;
  const centerImaginary = (currentMinImaginary + currentMaxImaginary) / 2;
  const deltaReal = centerReal - mouseReal;
  const deltaImaginary = centerImaginary - mouseImaginary;

  currentMinReal -= deltaReal;
  currentMaxReal -= deltaReal;
  currentMinImaginary -= deltaImaginary;
  currentMaxImaginary -= deltaImaginary;
}

function handleZoom(event, zoomStep) {
  event.preventDefault();
  const realFactor = calcRealFactor(currentMaxReal, currentMinReal);
  const imaginaryFactor = calcImaginaryFactor(currentMaxImaginary, currentMinImaginary);
  const mouseReal = currentMinReal + (event.clientX - X_OFFSET) * realFactor;
  const mouseImaginary = currentMinImaginary + (event.clientY - Y_OFFSET) * imaginaryFactor;
  zoomFactor *= zoomStep;
  applyZoom(mouseReal, mouseImaginary);
  drawMandelbrot(currentMinReal, currentMaxReal, currentMinImaginary, currentMaxImaginary);
}

drawMandelbrot(currentMinReal, currentMaxReal, currentMinImaginary, currentMaxImaginary);

myCanvas.addEventListener('click', (e) => {
  handleZoom(e, ZOOM_STEP);
});

myCanvas.addEventListener('contextmenu', (e) => {
  handleZoom(e, 1 / ZOOM_STEP);
});

// handle color picking
window.update = function (colorData, colorNumber) {
  const r = Math.round(colorData.rgb[0]);
  const g = Math.round(colorData.rgb[1]);
  const b = Math.round(colorData.rgb[2]);
  currentColors[colorNumber] = { r, g, b };
  COLORS = createColors(MAX_COLORS, currentColors);
  drawMandelbrot(currentMinReal, currentMaxReal, currentMinImaginary, currentMaxImaginary);
  document.getElementsByClassName('jscolor')[colorNumber].jscolor.hide();
};

function handlePan(direction) {
  const panTypes = {
    0() {
      // up
      currentMinImaginary += increment;
      currentMaxImaginary += increment;
    },
    1() {
      // right
      currentMinReal += increment;
      currentMaxReal += increment;
    },
    2() {
      // down
      currentMinImaginary -= increment;
      currentMaxImaginary -= increment;
    },
    3() {
      // left
      currentMinReal -= increment;
      currentMaxReal -= increment;
    },
  };
  const increment = Math.min(
    Math.abs(currentMinImaginary * PAN_INCREMENT),
    Math.abs(currentMaxImaginary * PAN_INCREMENT),
  );
  const fn = panTypes[direction];
  if (fn) {
    fn();
    drawMandelbrot(currentMinReal, currentMaxReal, currentMinImaginary, currentMaxImaginary);
  }
}

window.pan = function (direction) {
  handlePan(direction);
};
