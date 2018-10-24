const CANVAS_WIDTH = window.innerWidth;
const CANVAS_HEIGHT = window.innerHeight;
const MAX_ITERATIONS = 10000;


// Default values for initialization

const MAX_WORKERS = 6;
const DEF_MIN_REAL = -2;
const DEF_MAX_REAL = 1.3;
const DEF_MIN_IMAGINARY = -1.4;
const DEF_MAX_IMAGINARY = 1.5;

// Colors
const COLORS = [];
const createInterpolant = function (xs, ys) {
  let i,
    length = xs.length;

    // Deal with length issues
  if (length != ys.length) { throw 'Need an equal count of xs and ys.'; }
  if (length === 0) { return function (x) { return 0; }; }
  if (length === 1) {
    // Impl: Precomputing the result prevents problems if ys is mutated later and allows garbage collection of ys
    // Impl: Unary plus properly converts values to numbers
    const result = +ys[0];
    return function (x) { return result; };
  }

  // Rearrange xs and ys so that xs is sorted
  const indexes = [];
  for (i = 0; i < length; i++) { indexes.push(i); }
  indexes.sort((a, b) => (xs[a] < xs[b] ? -1 : 1));
  let oldXs = xs,
    oldYs = ys;
    // Impl: Creating new arrays also prevents problems if the input arrays are mutated later
  xs = []; ys = [];
  // Impl: Unary plus properly converts values to numbers
  for (i = 0; i < length; i++) { xs.push(+oldXs[indexes[i]]); ys.push(+oldYs[indexes[i]]); }

  // Get consecutive differences and slopes
  let dys = [],
    dxs = [],
    ms = [];
  for (i = 0; i < length - 1; i++) {
    let dx = xs[i + 1] - xs[i],
      dy = ys[i + 1] - ys[i];
    dxs.push(dx); dys.push(dy); ms.push(dy / dx);
  }

  // Get degree-1 coefficients
  const c1s = [ms[0]];
  for (i = 0; i < dxs.length - 1; i++) {
    let m = ms[i],
      mNext = ms[i + 1];
    if (m * mNext <= 0) {
      c1s.push(0);
    } else {
      let dx_ = dxs[i],
        dxNext = dxs[i + 1],
        common = dx_ + dxNext;
      c1s.push(3 * common / ((common + dxNext) / m + (common + dx_) / mNext));
    }
  }
  c1s.push(ms[ms.length - 1]);

  // Get degree-2 and degree-3 coefficients
  let c2s = [],
    c3s = [];
  for (i = 0; i < c1s.length - 1; i++) {
    let c1 = c1s[i],
      m_ = ms[i],
      invDx = 1 / dxs[i],
      common_ = c1 + c1s[i + 1] - m_ - m_;
    c2s.push((m_ - c1 - common_) * invDx); c3s.push(common_ * invDx * invDx);
  }

  // Return interpolant function
  return function (x) {
    // The rightmost point in the dataset should give an exact result
    let i = xs.length - 1;
    if (x == xs[i]) { return ys[i]; }

    // Search for the interval x is in, returning the corresponding y if x is one of the original xs
    let low = 0,
      mid,
      high = c3s.length - 1;
    while (low <= high) {
      mid = Math.floor(0.5 * (low + high));
      const xHere = xs[mid];
      if (xHere < x) { low = mid + 1; } else if (xHere > x) { high = mid - 1; } else { return ys[mid]; }
    }
    i = Math.max(0, high);

    // Interpolate
    let diff = x - xs[i],
      diffSq = diff * diff;
    return ys[i] + c1s[i] * diff + c2s[i] * diffSq + c3s[i] * diff * diffSq;
  };
};


function createChannelArray(array, interpolant) {
  for (let x = 0; x < 1; x += 1 / 2048) {
    const xSquared = interpolant(x);
    array.push(xSquared);
  }
}

const rArray = [];
const gArray = [];
const bArray = [];

createChannelArray(
  rArray,
  createInterpolant([0, 0.16, 0.42, 0.6425, 0.8575], [236, 214, 180, 40, 120]),
);
createChannelArray(
  gArray,
  createInterpolant([0, 0.16, 0.42, 0.6425, 0.8575], [100, 72.8, 100, 100, 100]),
);
createChannelArray(
  bArray,
  createInterpolant([0, 0.16, 0.42, 0.6425, 0.8575], [19.6, 16.1, 96.5, 50, 0.4]),
);

for (let i = 0; i < bArray.length; i++) {
  COLORS.push(`hsl(${rArray[i]},${gArray[i]}%,${bArray[i]}%)`);
}

let currentMinReal = DEF_MIN_REAL;
let currentMaxReal = DEF_MAX_REAL;
let currentMinImaginary = DEF_MIN_IMAGINARY;
let currentMaxImaginary = DEF_MAX_IMAGINARY;

const ZOOM_STEP = 1.5;
let zoomFactor = 1;

function calcRealFactor(maxReal, minReal) {
  return (maxReal - minReal) / (CANVAS_WIDTH);
}

function calcImaginaryFactor(maxImaginary, minImaginary) {
  return (maxImaginary - minImaginary) / (CANVAS_HEIGHT);
}

function interpolate(start, end, interpolation) {
  return start + ((end - start) * interpolation);
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

// Set up canvas
const myCanvas = document.getElementById('canvas');
myCanvas.width = CANVAS_WIDTH;
myCanvas.height = CANVAS_HEIGHT;
const X_OFFSET = myCanvas.offsetLeft;
const Y_OFFSET = myCanvas.offsetTop;
const context = myCanvas.getContext('2d');

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
    const worker = new Worker('worker.js');
    worker.postMessage({
      MAX_ITERATIONS,
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
    //   console.log(e.data);
      const results = e.data;
      // Draw points from workers
      const { points } = results;
      for (let i = 0; i < points.length; i++) {
        const point = points[i];
        const y = point.y;
        const x = e.data.x;
        const fillStyle = point.fillStyle;
        context.fillStyle = fillStyle;
        context.fillRect(x, y, 1, 1);
      }
      let currentX = e.data.x;
      // Start work on the column MAX_WORKERS down the axis
      currentX += MAX_WORKERS;
      // If we haven't reached the end of the canvas
      if (currentX < CANVAS_WIDTH) {
        worker.postMessage({
          MAX_ITERATIONS,
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

drawMandelbrot(currentMinReal, currentMaxReal, currentMinImaginary, currentMaxImaginary);

myCanvas.addEventListener('click', (e) => {
  const realFactor = calcRealFactor(currentMaxReal, currentMinReal);
  const imaginaryFactor = calcImaginaryFactor(currentMaxImaginary, currentMinImaginary);
  const mouseReal = currentMinReal + (e.clientX - X_OFFSET) * realFactor;
  const mouseImaginary = currentMinImaginary + (e.clientY - Y_OFFSET) * imaginaryFactor;
  zoomFactor *= ZOOM_STEP;
  applyZoom(mouseReal, mouseImaginary);


  drawMandelbrot(currentMinReal, currentMaxReal, currentMinImaginary, currentMaxImaginary);
});
