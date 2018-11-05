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
  const get_max_wokers = () => MAX_WORKERS;
  const get_def_max_iterations = () => DEF_MAX_ITERATIONS;
  const get_def_escape_radius = () => DEF_ESCAPE_RADIUS;
  const get_def_zoom_step = () => DEF_ZOOM_STEP;

  // public methods option
  const get_options = () => options;
  const set_options_value = (key, value) => {
    options[key] = value;
  };

  // public methods canvas
  const get_canvas = () => myCanvas;
  const get_drawing_context = () => context;
  const get_canvas_width = () => CANVAS_WIDTH;
  const get_canvas_height = () => CANVAS_HEIGHT;
  const get_def_dimens = () => DEFAULT_DIMENS;
  const get_x_offset = () => X_OFFSET;
  const get_y_offset = () => Y_OFFSET;

  // public methods for zoom
  const get_pan_increment = () => PAN_INCREMENT;
  const get_zoom_factor = () => zoomFactor;
  const set_zoom_factor = (zf) => {
    zoomFactor = zf;
  };
  const get_current_dimens = () => currentDimens;
  const set_current_dimens = (dimens) => {
    currentDimens = dimens;
  };

  const get_max_colors = () => MAX_COLORS;
  const get_def_colors = () => DEFAULT_COLORS;
  const get_current_colors = () => currentColors;
  const set_current_colors = (colors) => {
    currentColors = colors;
  };
  const set_current_color_single_color = (color, i) => {
    currentColors[i] = color;
  };
  const get_color_array = () => colorArray;
  const set_color_array = (array) => {
    colorArray = array;
  };


  return {
    get_max_wokers,
    get_def_max_iterations,
    get_def_escape_radius,
    get_def_zoom_step,
    get_options,
    set_options_value,
    get_canvas,
    get_drawing_context,
    get_canvas_width,
    get_canvas_height,
    get_def_dimens,
    get_x_offset,
    get_y_offset,
    get_pan_increment,
    get_zoom_factor,
    set_zoom_factor,
    get_current_dimens,
    set_current_dimens,
    get_max_colors,
    get_def_colors,
    get_current_colors,
    set_current_colors,
    set_current_color_single_color,
    get_color_array,
    set_color_array,
  };
}());


function download() {
  this.href = app.get.toDataURL('image/jpeg');
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
  app.set_color_array(createColors(app.get_max_colors(), app.get_current_colors()));
  // Correct for aspect ratio
  const ratio = Math.abs(dimens.maxReal - dimens.minReal)
    / Math.abs(dimens.maxImaginary - dimens.minImaginary);
  const sratio = app.get_canvas_width() / app.get_canvas_height();
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
  const realFactor = Utils.calcRealFactor(maxReal, minReal, app.get_canvas_width());
  const imaginaryFactor = Utils.calcImaginaryFactor(
    maxImaginary, minImaginary,
    app.get_canvas_height(),
  );
  const workerFunction = function (e) {
    const { points } = e.data;
    for (let i = 0; i < points.length; i++) {
      const { y, fillStyle } = points[i];
      app.get_drawing_context().fillStyle = fillStyle;
      app.get_drawing_context().fillRect(e.data.x, y, 1, 1);
    }
    let currentX = e.data.x;
    // Start work on the column MAX_WORKERS down the axis
    currentX += app.get_max_wokers();
    // If we haven't reached the end of the canvas
    if (currentX < app.get_canvas_width()) {
      // Send a message to the current worker to work on the next x
      this.postMessage({
        options: userOptions,
        x: currentX,
        CANVAS_HEIGHT: app.get_canvas_height(),
        colorArray: app.get_color_array(),
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
  for (let x = 0; x < app.get_max_wokers(); x++) {
    const worker = new Worker();
    worker.postMessage({
      options: userOptions,
      x,
      CANVAS_HEIGHT: app.get_canvas_height(),
      colorArray: app.get_color_array(),
      realFactor,
      imaginaryFactor,
      minReal,
      maxReal,
      minImaginary,
      maxImaginary,
    });
    worker.onmessage = workerFunction;
  }
  setInfo(app.get_current_dimens(), app.get_options());
}


// Get clicks on background canvas via bubbling
const body = document.getElementsByTagName('body')[0];

// Handle zoom in
body.addEventListener('click', (e) => {
  const zoomResults = Utils.handleZoom(
    e,
    app.get_options().zoomStep,
    app.get_zoom_factor(),
    app.get_current_dimens(), app.get_canvas_width(),
    app.get_canvas_height(), app.get_x_offset(), app.get_y_offset(),
  );
  app.set_current_dimens(zoomResults.currentDimens);
  app.set_zoom_factor(zoomResults.zoomFactor);
  drawMandelbrot(app.get_current_dimens(), app.get_options());
});

// Handle zoom out
body.addEventListener('contextmenu', (e) => {
  const zoomResults = Utils.handleZoom(
    e,
    1 / app.get_options().zoomStep,
    app.get_zoom_factor(),
    app.get_current_dimens(), app.get_canvas_width(),
    app.get_canvas_height(), app.get_x_offset(), app.get_y_offset(),
  );
  app.set_current_dimens(zoomResults.currentDimens);
  app.set_zoom_factor(zoomResults.zoomFactor);
  drawMandelbrot(app.get_current_dimens(), app.get_options());
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
  app.set_current_color_single_color({ r, g, b }, gradientPosition);
  drawMandelbrot(app.get_current_dimens(), app.get_options());
  document.getElementsByClassName('jscolor')[gradientPosition].jscolor.hide();
};


window.pan = function (e, direction) {
  e.stopPropagation();
  app.set_current_dimens(Utils.handlePan(
    direction,
    app.get_pan_increment(), app.get_current_dimens(),
  ));
  drawMandelbrot(app.get_current_dimens(), app.get_options());
};

// Update options
window.updateMandelbrot = function () {
  const userIterations = document.getElementById('iterations').value;
  const escapeRadius = document.getElementById('escapeRadius').value;
  const zoomStep = document.getElementById('zoomStep').value;
  if (userIterations) {
    app.set_options_value('iterations', parseInt(userIterations, 10) || app.get_def_max_iterations());
  }
  if (escapeRadius) {
    app.set_options_value('escapeRadius', parseFloat(escapeRadius) || app.get_def_escape_radius());
  }
  if (zoomStep) {
    app.set_options_value('zoomStep', parseFloat(zoomStep) || app.get_def_zoom_step());
  }
  drawMandelbrot(app.get_current_dimens(), app.get_options());
};

window.handleZoomStep = function () {
  const zoomStep = document.getElementById('zoomStep').value;
  if (zoomStep) {
    app.set_options_value('zoomStep', parseFloat(zoomStep) || app.get_def_zoom_step());
  }
};

window.reset = () => {
  app.set_current_dimens({ ...app.get_def_dimens() });
  app.set_current_colors(app.get_def_colors().slice());
  app.set_options_value('iterations', app.get_def_max_iterations());
  app.set_options_value('escapeRadius', app.get_def_escape_radius());
  app.set_options_value('zoomStep', app.get_def_zoom_step());
  const inputs = document.getElementsByClassName('jscolor');
  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i];
    input.jscolor.fromRGB(
      app.get_current_colors()[i].r,
      app.get_current_colors()[i].g, app.get_current_colors()[i].b,
    );
  }
  drawMandelbrot(app.get_current_dimens(), app.get_options());
};

app.set_current_dimens({ ...app.get_def_dimens() });
drawMandelbrot(app.get_current_dimens(), app.get_options());
