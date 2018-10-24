function receiveMessage(event) {
  postMessage(event.data);
}

onmessage = receiveMessage;

