document.getElementById('open-panel').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const win = await chrome.windows.getCurrent();
  chrome.runtime.sendMessage({
    type: 'open-sidepanel',
    windowId: win.id,
  });
  window.close();
});
