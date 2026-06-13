document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('apiKey');
  const saveBtn = document.getElementById('saveBtn');
  const statusDiv = document.getElementById('status');

  // Load existing key
  chrome.storage.local.get(['GEMINI_API_KEY'], (result) => {
    if (result.GEMINI_API_KEY) {
      apiKeyInput.value = result.GEMINI_API_KEY;
    }
  });

  // Save new settings
  saveBtn.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    chrome.storage.local.set({ GEMINI_API_KEY: key }, () => {
      statusDiv.style.display = 'block';
      setTimeout(() => {
        statusDiv.style.display = 'none';
      }, 2000);
    });
  });
});
