document.addEventListener('DOMContentLoaded', () => {
  const geminiKeyInput   = document.getElementById('geminiKey');
  const openaiKeyInput   = document.getElementById('openaiKey');
  const anthropicKeyInput = document.getElementById('anthropicKey');
  const providerSelect   = document.getElementById('provider');
  const saveBtn          = document.getElementById('saveBtn');
  const statusDiv        = document.getElementById('status');

  // Load saved settings
  chrome.storage.local.get(
    ['GEMINI_API_KEY', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'preferred_provider'],
    (result) => {
      if (result.GEMINI_API_KEY)    geminiKeyInput.value    = result.GEMINI_API_KEY;
      if (result.OPENAI_API_KEY)    openaiKeyInput.value    = result.OPENAI_API_KEY;
      if (result.ANTHROPIC_API_KEY) anthropicKeyInput.value = result.ANTHROPIC_API_KEY;
      if (result.preferred_provider) providerSelect.value   = result.preferred_provider;
    }
  );

  function showStatus(message, isError = false) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${isError ? 'error' : 'success'}`;
    statusDiv.style.display = 'block';
    setTimeout(() => { statusDiv.style.display = 'none'; }, 3000);
  }

  saveBtn.addEventListener('click', () => {
    const geminiKey    = geminiKeyInput.value.trim();
    const openaiKey    = openaiKeyInput.value.trim();
    const anthropicKey = anthropicKeyInput.value.trim();
    const provider     = providerSelect.value;

    // Validate: at least one key must be present
    if (!geminiKey && !openaiKey && !anthropicKey) {
      showStatus('Enter at least one API key before saving.', true);
      return;
    }

    // Validate selected non-auto provider has a key
    if (provider === 'gemini' && !geminiKey) {
      showStatus('Gemini is selected but no Gemini API key was entered.', true);
      return;
    }
    if (provider === 'openai' && !openaiKey) {
      showStatus('OpenAI is selected but no OpenAI API key was entered.', true);
      return;
    }
    if (provider === 'claude' && !anthropicKey) {
      showStatus('Claude is selected but no Anthropic API key was entered.', true);
      return;
    }

    chrome.storage.local.set({
      GEMINI_API_KEY:    geminiKey,
      OPENAI_API_KEY:    openaiKey,
      ANTHROPIC_API_KEY: anthropicKey,
      preferred_provider: provider
    }, () => {
      if (chrome.runtime.lastError) {
        showStatus('Save failed: ' + chrome.runtime.lastError.message, true);
      } else {
        showStatus('Settings saved!');
      }
    });
  });
});
