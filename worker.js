const MAX_ITERATIONS = 10000;


function receiveMessage(event) {
  drawLine(event.data);
}

function drawLine(data) {
  const points = [];
  for (let y = 0; y < data.CANVAS_HEIGHT; y++) {
    const cReal = data.minReal + data.x * data.realFactor;
    const cImaginary = data.minImaginary + y * data.imaginaryFactor;

    let zReal = 0;
    let zImaginary = 0;
    let iterations = 0;

    while (zReal * zReal + zImaginary * zImaginary <= 2 * 2 && iterations < MAX_ITERATIONS) {
      const nextZReal = zReal * zReal - zImaginary * zImaginary + cReal;
      const nextZImaginary = 2 * zReal * zImaginary + cImaginary;
      zReal = nextZReal;
      zImaginary = nextZImaginary;
      iterations++;
    }

    if (iterations === MAX_ITERATIONS) {
      points.push({
        y,
        fillStyle: 'black',
      });
    } else {
      points.push({
        y,
        fillStyle: 'red',
      });
    }
  }
  postMessage({
    x: data.x,
    points,
  });
}

onmessage = receiveMessage;

