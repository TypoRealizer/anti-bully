console.log('Content script loaded on:', window.location.href);

function monitorMessages() {
  console.log('Monitoring messages...');
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length) {
        const messages = document.querySelectorAll('[data-author-id], .message-text');
        console.log('Found messages:', messages.length);
        messages.forEach((msgElement) => {
          const text = msgElement.innerText.trim();
          if (text && !msgElement.dataset.processed) {
            msgElement.dataset.processed = 'true';
            const username = msgElement.closest('[data-author-id]')?.getAttribute('data-author-id') || 'Unknown';
            console.log('Sending message:', { user: username, text });
            chrome.runtime.sendMessage({
              type: 'sendMessage',
              data: { user: username, text: text }
            });
          }
        });
      }
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'alert') {
    console.log('Received alert:', request.message);
    const alertDiv = document.createElement('div');
    alertDiv.style.cssText = `
      position: fixed; top: 10px; right: 10px; background: #ffcccc; padding: 10px;
      border: 1px solid #ff0000; z-index: 10000; border-radius: 5px;
    `;
    alertDiv.innerText = request.message;
    document.body.appendChild(alertDiv);
    setTimeout(() => alertDiv.remove(), 5000);
  }
});

monitorMessages();
