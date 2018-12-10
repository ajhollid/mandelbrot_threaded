import createColors from './colors';
import Worker from './mandelbrot.worker';
import Utils from './utils';

const app = (function () {
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

  // Values for zooming
  const PAN_INCREMENT = 0.02;
  let zoomFactor = 1;
  let currentDimens = {};


  // Set up canvas
  const myCanvas = document.getElementById('canvas');
  myCanvas.width = CANVAS_WIDTH;
  myCanvas.height = CANVAS_HEIGHT;
  const X_OFFSET = myCanvas.offsetLeft;
  const Y_OFFSET = myCanvas.offsetTop;
  const context = myCanvas.getContext('2d');

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

  // public methods
  const getMaxWorkers = () => MAX_WORKERS;
  const getDefMaxIterations = () => DEF_MAX_ITERATIONS;
  const getDefEscapeRadius = () => DEF_ESCAPE_RADIUS;
  const getDefZoomStep = () => DEF_ZOOM_STEP;

  // public methods option
  const getOptions = () => options;
  const setOptionsValue = (key, value) => {
    options[key] = value;
  };

  // public methods canvas
  const getCanvas = () => myCanvas;
  const getDrawingContext = () => context;
  const getCanvasWidth = () => CANVAS_WIDTH;
  const getCanvasHeight = () => CANVAS_HEIGHT;
  const getDefDimens = () => DEFAULT_DIMENS;
  const getXOffset = () => X_OFFSET;
  const getYOffset = () => Y_OFFSET;

  // public methods for zoom
  const getPanIncrement = () => PAN_INCREMENT;
  const getZoomFactor = () => zoomFactor;
  const setZoomFactor = (zf) => {
    zoomFactor = zf;
  };
  const getCurrentDimens = () => currentDimens;
  const setCurrentDimens = (dimens) => {
    currentDimens = dimens;
  };

  // public methods for colors
  const getMaxColors = () => MAX_COLORS;
  const getDefColors = () => DEFAULT_COLORS;
  const getCurrentColors = () => currentColors;
  const setCurrentColors = (colors) => {
    currentColors = colors;
  };
  const setSingleColor = (color, i) => {
    currentColors[i] = color;
  };
  const getColorArray = () => colorArray;
  const setColorArray = (array) => {
    colorArray = array;
  };


  return {
    getMaxWorkers,
    getDefMaxIterations,
    getDefEscapeRadius,
    getDefZoomStep,
    getOptions,
    setOptionsValue,
    getCanvas,
    getDrawingContext,
    getCanvasWidth,
    getCanvasHeight,
    getDefDimens,
    getXOffset,
    getYOffset,
    getPanIncrement,
    getZoomFactor,
    setZoomFactor,
    getCurrentDimens,
    setCurrentDimens,
    getMaxColors,
    getDefColors,
    getCurrentColors,
    setCurrentColors,
    setSingleColor,
    getColorArray,
    setColorArray,
  };
}());


function download() {
  this.href = app.getCanvas().toDataURL('image/jpeg');
}

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
  app.setColorArray(createColors(app.getMaxColors(), app.getCurrentColors()));
  // Correct for aspect ratio
  const ratio = Math.abs(dimens.maxReal - dimens.minReal)
    / Math.abs(dimens.maxImaginary - dimens.minImaginary);
  const sratio = app.getCanvasWidth() / app.getCanvasHeight();
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
  const realFactor = Utils.calcRealFactor(maxReal, minReal, app.getCanvasWidth());
  const imaginaryFactor = Utils.calcImaginaryFactor(
    maxImaginary, minImaginary,
    app.getCanvasHeight(),
  );
  const workerFunction = function (e) {
    const { points } = e.data;
    for (let i = 0; i < points.length; i++) {
      const { y, fillStyle } = points[i];
      app.getDrawingContext().fillStyle = fillStyle;
      app.getDrawingContext().fillRect(e.data.x, y, 1, 1);
    }
    let currentX = e.data.x;
    // Start work on the column MAX_WORKERS down the axis
    currentX += app.getMaxWorkers();
    // If we haven't reached the end of the canvas
    if (currentX < app.getCanvasWidth()) {
      // Send a message to the current worker to work on the next x
      this.postMessage({
        options: userOptions,
        x: currentX,
        CANVAS_HEIGHT: app.getCanvasHeight(),
        colorArray: app.getColorArray(),
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
  for (let x = 0; x < app.getMaxWorkers(); x++) {
    const worker = new Worker();
    worker.postMessage({
      options: userOptions,
      x,
      CANVAS_HEIGHT: app.getCanvasHeight(),
      colorArray: app.getColorArray(),
      realFactor,
      imaginaryFactor,
      minReal,
      maxReal,
      minImaginary,
      maxImaginary,
    });
    worker.onmessage = workerFunction;
  }
  setInfo(app.getCurrentDimens(), app.getOptions());
}


// Get clicks on background canvas via bubbling
const body = document.getElementsByTagName('body')[0];

// Handle zoom in
body.addEventListener('click', (e) => {
  const zoomResults = Utils.handleZoom(
    e,
    app.getOptions().zoomStep,
    app.getZoomFactor(),
    app.getCurrentDimens(), app.getCanvasWidth(),
    app.getCanvasHeight(), app.getXOffset(), app.getYOffset(),
  );
  app.setCurrentDimens(zoomResults.currentDimens);
  app.setZoomFactor(zoomResults.zoomFactor);
  drawMandelbrot(app.getCurrentDimens(), app.getOptions());
});

// Handle zoom out
body.addEventListener('contextmenu', (e) => {
  const zoomResults = Utils.handleZoom(
    e,
    1 / app.getOptions().zoomStep,
    app.getZoomFactor(),
    app.getCurrentDimens(), app.getCanvasWidth(),
    app.getCanvasHeight(), app.getXOffset(), app.getYOffset(),
  );
  app.setCurrentDimens(zoomResults.currentDimens);
  app.setZoomFactor(zoomResults.zoomFactor);
  drawMandelbrot(app.getCurrentDimens(), app.getOptions());
});

// Set download link
document.getElementById('downloadLink').addEventListener('click', download, false);

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
  app.setSingleColor({ r, g, b }, gradientPosition);
  drawMandelbrot(app.getCurrentDimens(), app.getOptions());
  document.getElementsByClassName('jscolor')[gradientPosition].jscolor.hide();
};


window.pan = function (e, direction) {
  e.stopPropagation();
  app.setCurrentDimens(Utils.handlePan(
    direction,
    app.getPanIncrement(), app.getCurrentDimens(),
  ));
  drawMandelbrot(app.getCurrentDimens(), app.getOptions());
};

// Update options
window.updateMandelbrot = function () {
  const userIterations = document.getElementById('iterations').value;
  const escapeRadius = document.getElementById('escapeRadius').value;
  const zoomStep = document.getElementById('zoomStep').value;
  if (userIterations) {
    app.setOptionsValue('iterations', parseInt(userIterations, 10) || app.getDefMaxIterations());
  }
  if (escapeRadius) {
    app.setOptionsValue('escapeRadius', parseFloat(escapeRadius) || app.getDefEscapeRadius());
  }
  if (zoomStep) {
    app.setOptionsValue('zoomStep', parseFloat(zoomStep) || app.getDefZoomStep());
  }
  drawMandelbrot(app.getCurrentDimens(), app.getOptions());
};

window.handleZoomStep = function () {
  const zoomStep = document.getElementById('zoomStep').value;
  if (zoomStep) {
    app.setOptionsValue('zoomStep', parseFloat(zoomStep) || app.getDefZoomStep());
  }
};

window.reset = () => {
  app.setCurrentDimens({ ...app.getDefDimens() });
  app.setCurrentColors(app.getDefColors().slice());
  app.setOptionsValue('iterations', app.getDefMaxIterations());
  app.setOptionsValue('escapeRadius', app.getDefEscapeRadius());
  app.setOptionsValue('zoomStep', app.getDefZoomStep());
  const inputs = document.getElementsByClassName('jscolor');
  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i];
    input.jscolor.fromRGB(
      app.getCurrentColors()[i].r,
      app.getCurrentColors()[i].g, app.getCurrentColors()[i].b,
    );
  }
  drawMandelbrot(app.getCurrentDimens(), app.getOptions());
};

app.setCurrentDimens({ ...app.getDefDimens() });
drawMandelbrot(app.getCurrentDimens(), app.getOptions());
