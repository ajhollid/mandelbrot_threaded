// Source: https://en.wikipedia.org/wiki/Monotone_cubic_interpolation
const MAX_COLORS = 2 ** 11;
export default function createColors() {
  const colors = [];
  const createInterpolant = function (xs, ys) {
    let i = xs.length;
    const { length } = xs;

    // Deal with length issues
    if (length !== ys.length) { throw new Error('Need an equal count of xs and ys.'); }
    if (length === 0) { return function () { return 0; }; }
    if (length === 1) {
      // Impl: Precomputing the result prevents problems
      // if ys is mutated later and allows garbage collection of ys
      // Impl: Unary plus properly converts values to numbers
      const result = +ys[0];
      return function () { return result; };
    }

    // Rearrange xs and ys so that xs is sorted
    const indexes = [];
    for (i = 0; i < length; i++) { indexes.push(i); }
    indexes.sort((a, b) => (xs[a] < xs[b] ? -1 : 1));
    const oldXs = xs;
    const oldYs = ys;
    // Impl: Creating new arrays also prevents problems if the input arrays are mutated later
    xs = []; ys = [];
    // Impl: Unary plus properly converts values to numbers
    for (i = 0; i < length; i++) { xs.push(+oldXs[indexes[i]]); ys.push(+oldYs[indexes[i]]); }

    // Get consecutive differences and slopes
    const dys = [];
    const dxs = [];
    const ms = [];
    for (i = 0; i < length - 1; i++) {
      const dx = xs[i + 1] - xs[i];
      const dy = ys[i + 1] - ys[i];
      dxs.push(dx); dys.push(dy); ms.push(dy / dx);
    }

    // Get degree-1 coefficients
    const c1s = [ms[0]];
    for (i = 0; i < dxs.length - 1; i++) {
      const m = ms[i];
      const mNext = ms[i + 1];
      if (m * mNext <= 0) {
        c1s.push(0);
      } else {
        const dx_ = dxs[i];
        const dxNext = dxs[i + 1];
        const common = dx_ + dxNext;
        c1s.push(3 * common / ((common + dxNext) / m + (common + dx_) / mNext));
      }
    }
    c1s.push(ms[ms.length - 1]);

    // Get degree-2 and degree-3 coefficients
    const c2s = [];
    const c3s = [];
    for (i = 0; i < c1s.length - 1; i++) {
      const c1 = c1s[i];
      const m_ = ms[i];
      const invDx = 1 / dxs[i];
      const common_ = c1 + c1s[i + 1] - m_ - m_;
      c2s.push((m_ - c1 - common_) * invDx); c3s.push(common_ * invDx * invDx);
    }

    // Return interpolant function
    return function (x) {
      // The rightmost point in the dataset should give an exact result
      let j = xs.length - 1;
      if (x === xs[j]) { return ys[j]; }

      // Search for the interval x is in,
      // returning the corresponding y if x is one of the original xs
      let low = 0;
      let mid;
      let high = c3s.length - 1;
      while (low <= high) {
        mid = Math.floor(0.5 * (low + high));
        const xHere = xs[mid];
        if (xHere < x) {
          low = mid + 1;
        } else if (xHere > x) {
          high = mid - 1;
        } else { return ys[mid]; }
      }
      j = Math.max(0, high);

      // Interpolate
      const diff = x - xs[j];
      const diffSq = diff * diff;
      return ys[j] + c1s[j] * diff + c2s[j] * diffSq + c3s[j] * diff * diffSq;
    };
  };


  function createChannelArray(array, interpolant) {
    for (let x = 0; x < 1; x += 1 / MAX_COLORS) {
      const xSquared = interpolant(x);
      array.push(xSquared);
    }
  }

  const rArray = [];
  const gArray = [];
  const bArray = [];

  createChannelArray(
    rArray,
    createInterpolant([0, 0.16, 0.42, 0.6425, 0.8575], [0, 32, 237, 255, 0]),
  );
  createChannelArray(
    gArray,
    createInterpolant([0, 0.16, 0.42, 0.6425, 0.8575], [7, 107, 255, 170, 2]),
  );
  createChannelArray(
    bArray,
    createInterpolant([0, 0.16, 0.42, 0.6425, 0.8575], [100, 203, 255, 0, 0]),
  );

  for (let i = 0; i < bArray.length; i++) {
    colors.push(`rgb(${rArray[i]},${gArray[i]},${bArray[i]})`);
  }
  return colors;
}
