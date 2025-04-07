importScripts('socket.io.min.js'); // Include Socket.IO client library

let socket;

function connectSocket() {
  socket = io('http://172.19.85.31:5000', { transports: ['websocket'] });

  socket.on('connect', () => {
    console.log('Connected to Flask server');
  });

  socket.on('message', (msg) => {
    if (msg.text.includes('⚠️') || msg.text.includes('⛔')) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'alert', message: msg.text });
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from server');
  });
}

connectSocket();

// Reconnect if needed
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'sendMessage' && socket) {
    socket.emit('message', request.data);
  }
});
