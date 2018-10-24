function receiveMessage(event) {
  drawLine(event.data);
}

function drawLine(data) {
  console.log(data);
}

onmessage = receiveMessage;

