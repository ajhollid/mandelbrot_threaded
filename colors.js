export default function createColors() {
  const colors = [];
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
    colors.push(`hsl(${rArray[i]},${gArray[i]}%,${bArray[i]}%)`);
  }
  return colors;
}
