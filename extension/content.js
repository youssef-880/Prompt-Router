// Inject custom CSS styles for our mock chat turn
const styleId = 'gateway-custom-styles';
if (!document.getElementById(styleId)) {
  const styleEl = document.createElement('style');
  styleEl.id = styleId;
  styleEl.textContent = `
    .gateway-turn {
      display: flex;
      flex-direction: column;
      margin: 20px auto;
      width: 100%;
      max-width: 768px;
      padding: 0 24px;
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    .gateway-user-card {
      align-self: flex-end;
      background-color: #007bff;
      color: #ffffff;
      padding: 12px 18px;
      border-radius: 18px 18px 2px 18px;
      max-width: 80%;
      margin-bottom: 16px;
      font-size: 14px;
      line-height: 1.5;
      box-shadow: 0 1px 2px rgba(0,0,0,0.1);
    }
    .gateway-ai-card {
      align-self: flex-start;
      background-color: #ffffff;
      color: #1f1f1f;
      border: 1px solid #e0e0e0;
      padding: 20px;
      border-radius: 18px 18px 18px 2px;
      width: 100%;
      box-sizing: border-box;
      margin-bottom: 24px;
      font-size: 14px;
      line-height: 1.6;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }
    
    /* Dark Mode Adjustments */
    @media (prefers-color-scheme: dark) {
      .gateway-ai-card {
        background-color: #2f2f2f;
        color: #f1f1f1;
        border-color: #424242;
      }
    }
    html[class*="dark"] .gateway-ai-card,
    html[data-theme="dark"] .gateway-ai-card,
    body[class*="dark"] .gateway-ai-card,
    body.dark-mode .gateway-ai-card {
      background-color: #212121;
      color: #ececec;
      border-color: #383838;
    }

    .gateway-header {
      display: flex;
      align-items: center;
      font-weight: 700;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1.2px;
      margin-bottom: 12px;
    }
    .gateway-header svg {
      margin-right: 8px;
    }
    .gateway-loading {
      display: flex;
      align-items: center;
      gap: 10px;
      color: #6c757d;
    }
    .gateway-spinner {
      width: 18px;
      height: 18px;
      border: 2.5px solid #ccc;
      border-top-color: #007bff;
      border-radius: 50%;
      animation: gateway-spin 0.8s linear infinite;
    }
    .gateway-error-text {
      color: #dc3545;
      font-weight: 500;
    }
    @keyframes gateway-spin {
      to { transform: rotate(360deg); }
    }

    /* Multi-Agent Orchestrator Styles */
    .gateway-orchestrator-logs {
      background-color: #f8f9fa;
      border-left: 4px solid #6f42c1;
      padding: 12px 16px;
      margin: 12px 0;
      border-radius: 0 12px 12px 0;
      font-size: 13px;
      color: #495057;
      max-height: 250px;
      overflow-y: auto;
      box-shadow: inset 0 1px 3px rgba(0,0,0,0.05);
      transition: all 0.3s ease;
    }
    .gateway-log-item {
      margin-bottom: 10px;
      line-height: 1.5;
      border-bottom: 1px dashed rgba(0,0,0,0.05);
      padding-bottom: 8px;
    }
    .gateway-log-item:last-child {
      border-bottom: none;
      margin-bottom: 0;
      padding-bottom: 0;
    }
    .gateway-orchestrator-response {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid rgba(0,0,0,0.1);
    }
    
    /* Dark Mode Adjustments for Orchestrator UI */
    html[class*="dark"] .gateway-orchestrator-logs,
    html[data-theme="dark"] .gateway-orchestrator-logs,
    body[class*="dark"] .gateway-orchestrator-logs,
    body.dark-mode .gateway-orchestrator-logs {
      background-color: #1e1e1e;
      border-left-color: #a855f7;
      color: #cbd5e1;
      box-shadow: inset 0 1px 3px rgba(0,0,0,0.3);
    }
    html[class*="dark"] .gateway-log-item,
    html[data-theme="dark"] .gateway-log-item,
    body[class*="dark"] .gateway-log-item,
    body.dark-mode .gateway-log-item {
      border-bottom-color: rgba(255,255,255,0.05);
    }
    html[class*="dark"] .gateway-orchestrator-response,
    html[data-theme="dark"] .gateway-orchestrator-response,
    body[class*="dark"] .gateway-orchestrator-response,
    body.dark-mode .gateway-orchestrator-response {
      border-top-color: rgba(255,255,255,0.1);
    }
  `;
  document.head.appendChild(styleEl);
}

// Helper: Escape HTML to prevent injection attacks
function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Simple Markdown to HTML Parser
function formatMarkdown(text) {
  let html = escapeHtml(text);
  
  // Format code blocks
  html = html.replace(/```([\w-]*)\n([\s\S]*?)\n```/g, (match, lang, code) => {
    return `<pre style="background: #1e1e1e; color: #d4d4d4; padding: 16px; border-radius: 8px; overflow-x: auto; font-family: 'Consolas', 'Courier New', monospace; font-size: 13px; margin: 16px 0; border: 1px solid #333;"><code class="language-${lang}">${code}</code></pre>`;
  });
  
  // Format inline code
  html = html.replace(/`([^`]+)`/g, '<code style="background: rgba(120, 120, 120, 0.15); padding: 3px 6px; border-radius: 4px; font-family: monospace; font-size: 13px;">$1</code>');
  
  // Format headers
  html = html.replace(/^### (.*$)/gim, '<h4 style="margin: 16px 0 8px 0; font-size: 15px; font-weight: 700; border-bottom: 1px solid rgba(128,128,128,0.2); padding-bottom: 4px;">$1</h4>');
  html = html.replace(/^## (.*$)/gim, '<h3 style="margin: 20px 0 10px 0; font-size: 18px; font-weight: 700; color: #007bff;">$1</h3>');
  html = html.replace(/^# (.*$)/gim, '<h2 style="margin: 24px 0 12px 0; font-size: 22px; font-weight: 700;">$1</h2>');

  // Format bold and italics
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  
  // Format bullets
  html = html.replace(/^\s*[-*+]\s+(.+)$/gm, '<li style="margin-bottom: 6px;">$1</li>');
  
  // Group <li> lines into <ul> list structures
  html = html.replace(/(<li style="margin-bottom: 6px;">.*?<\/li>)+/gs, (match) => {
    return `<ul style="margin-left: 20px; margin-bottom: 16px; list-style-type: disc;">${match}</ul>`;
  });
  
  // Convert newlines to breaks (ignoring inside pre blocks)
  const parts = html.split(/(<pre[\s\S]*?<\/pre>)/);
  for (let i = 0; i < parts.length; i++) {
    if (!parts[i].startsWith('<pre')) {
      parts[i] = parts[i].replace(/\n/g, '<br>');
    }
  }
  return parts.join('');
}

// Detect the active message feed container on Gemini or ChatGPT
function getChatContainer() {
  const hostname = window.location.hostname;
  if (hostname.includes('gemini')) {
    return document.querySelector('message-loop') || 
           document.querySelector('.conversation-container') || 
           document.querySelector('div[role="log"]');
  } else if (hostname.includes('chatgpt')) {
    return document.querySelector('main div.flex-col.items-center') || 
           document.querySelector('div.react-scroll-to-bottom--css-1') ||
           document.querySelector('div.react-scroll-to-bottom--css-1 > div') ||
           document.querySelector('div.react-scroll-to-bottom--css-2 > div') ||
           document.querySelector('main div.flex.flex-col.text-sm') ||
           document.querySelector('div[role="presentation"] div.flex.flex-col');
  }
  return null;
}

// Function to update the text in React-controlled inputs safely
function setNativeValue(element, value) {
  const valueSetter = Object.getOwnPropertyDescriptor(element, 'value')?.set;
  const prototype = Object.getPrototypeOf(element);
  const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
  
  if (valueSetter && valueSetter !== prototypeValueSetter) {
    prototypeValueSetter.call(element, value);
  } else if (valueSetter) {
    valueSetter.call(element, value);
  } else {
    element.value = value;
  }
  element.dispatchEvent(new Event('input', { bubbles: true }));
}

// Quota Storage Helpers
async function getDailyQuota(currentDate) {
  const data = await chrome.storage.local.get(['daily_quota']);
  let quota = data.daily_quota;
  if (!quota || quota.date !== currentDate) {
    quota = { date: currentDate, heavy: 0, fast: 0 };
    await chrome.storage.local.set({ daily_quota: quota });
  }
  return quota;
}

async function updateQuota(quota) {
  await chrome.storage.local.set({ daily_quota: quota });
}

// Non-technical prompt heuristic filter
function isTechnicalPrompt(prompt) {
  const text = prompt.toLowerCase();
  
  const techKeywords = [
    'code', 'program', 'develop', 'software', 'engineer', 'function', 'class', 'struct', 'variable', 
    'compile', 'debug', 'memory', 'performance', 'optimize', 'scaling', 'architect', 'database', 
    'sql', 'query', 'websocket', 'server', 'client', 'api', 'http', 'json', 'git', 'repo', 'array', 
    'string', 'object', 'loop', 'pointer', 'thread', 'process', 'docker', 'deploy', 'rest', 'endpoint', 
    'html', 'css', 'javascript', 'python', 'cpp', 'java', 'rust', 'golang', 'bash', 'script', 
    'algorithm', 'complexity', 'web', 'app', 'sdk', 'stack', 'framework', 'npm', 'regex',
    'race condition', 'memory leak', 'deadlock', 'concurrency', 'design pattern', 'microservice',
    'load balancing', 'failover', 'bottleneck', 'caching'
  ];
  
  const nonTechKeywords = [
    'recipe', 'pizza', 'cooking', 'bake', 'food', 'joke', 'weather', 'movie', 'song', 'sports', 
    'football', 'basketball', 'poem', 'novel', 'music', 'vacation', 'travel', 'fashion', 'makeup',
    'lyrics', 'restaurant', 'hotel'
  ];

  const hasTech = techKeywords.some(kw => text.includes(kw));
  const hasNonTech = nonTechKeywords.some(kw => text.includes(kw));

  if (hasNonTech && !hasTech) {
    return false;
  }
  
  if (text.length < 50 && !hasTech) {
    return false;
  }
  
  return true;
}

// Robust Scrolling Helper: Handles window scrolling and auto-detection of internal scroll containers
function scrollToBottom(container) {
  if (!container) return;
  
  // 1. Try to scroll the window to the bottom smoothly
  window.scrollTo({
    top: document.documentElement.scrollHeight,
    behavior: 'smooth'
  });
  
  // 2. Find and scroll any scrollable ancestors (overflow-y: auto/scroll)
  let parent = container.parentElement;
  while (parent && parent !== document.body) {
    if (parent.scrollHeight > parent.clientHeight) {
      const style = window.getComputedStyle(parent);
      if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
        parent.scrollTo({
          top: parent.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
    parent = parent.parentElement;
  }
  
  // 3. Scroll the chat container element itself
  container.scrollTop = container.scrollHeight;
}

async function handleInputEvent(e, inputElement) {
  const text = inputElement.value || inputElement.innerText || "";
  const triggerPrefix = "//";
  
  if (text.trim().startsWith(triggerPrefix)) {
    e.preventDefault();
    e.stopPropagation();
    
    // Parse the command and prompt
    let isExplicitCouncil = false;
    let promptText = "";

    const trimmedText = text.trim();
    if (trimmedText.startsWith("//council")) {
      isExplicitCouncil = true;
      promptText = trimmedText.substring("//council".length).trim();
    } else {
      promptText = trimmedText.substring("//".length).trim();
    }
    
    if (!promptText) return;

    const chatContainer = getChatContainer();
    if (!chatContainer) {
      alert("Error: Chat container timeline not found. Unable to inject turn.");
      return;
    }

    // 1. Create Turn Container
    const turnDiv = document.createElement('div');
    turnDiv.className = 'gateway-turn';

    // 2. Inject User Message Card
    const userCard = document.createElement('div');
    userCard.className = 'gateway-user-card';
    userCard.innerText = promptText;
    turnDiv.appendChild(userCard);

    // 3. Clear textarea
    if (inputElement.tagName.toLowerCase() === 'textarea' || inputElement.tagName.toLowerCase() === 'input') {
      setNativeValue(inputElement, "");
    } else {
      inputElement.innerText = "";
      inputElement.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // 4. NON-TECHNICAL FILTER
    if (!isTechnicalPrompt(promptText)) {
      const aiCard = document.createElement('div');
      aiCard.className = 'gateway-ai-card';
      aiCard.style.borderColor = '#ffc107';
      
      const header = document.createElement('div');
      header.className = 'gateway-header';
      header.style.color = '#ffc107';
      header.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
        </svg>
        Router Filter Block
      `;
      
      const content = document.createElement('div');
      content.innerText = "⚠️ [Router Block]: Quota saved. This extension is optimized for software engineering queries only.";
      
      aiCard.appendChild(header);
      aiCard.appendChild(content);
      turnDiv.appendChild(aiCard);
      chatContainer.appendChild(turnDiv);
      
      scrollToBottom(chatContainer);
      return;
    }

    // 5. COMPLEXITY ROUTER
    let tier = 'fast';
    let model = 'gemini-2.5-flash';

    const archKeywords = ["architecture", "optimize", "race condition", "memory leak", "scaling", "database schema", "performance", "deadlock", "concurrency", "design pattern", "microservice", "load balancing", "failover", "bottleneck", "caching"];
    const hasArchKeywords = archKeywords.some(kw => promptText.toLowerCase().includes(kw));

    if (isExplicitCouncil || hasArchKeywords || promptText.length >= 150) {
      tier = 'heavy';
      model = 'gemini-2.5-flash';
    }

    // Get current date string in America/Los_Angeles timezone (PST/PDT)
    const pstDate = new Date().toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles' });
    const [month, day, year] = pstDate.split('/');
    const currentDateString = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

    // 6. QUOTA STORAGE & LIMIT ENFORCEMENT
    const quota = await getDailyQuota(currentDateString);
    const HEAVY_LIMIT = 50;
    const FAST_LIMIT = 250;

    if (tier === 'heavy' && quota.heavy >= HEAVY_LIMIT) {
      injectQuotaBlock(turnDiv, chatContainer, "🛑 [Quota Limit Reached]: Free-tier daily allocation exhausted for the Heavy Tier. Reset happens at midnight Pacific Time.");
      return;
    } else if (tier === 'fast' && quota.fast >= FAST_LIMIT) {
      injectQuotaBlock(turnDiv, chatContainer, "🛑 [Quota Limit Reached]: Free-tier daily allocation exhausted for the Fast Tier. Reset happens at midnight Pacific Time.");
      return;
    }

    // 7. SPECULATIVE INCREMENT
    quota[tier]++;
    await updateQuota(quota);

    // 8. Inject AI Card (Loading & Multi-Agent UI Scaffolding)
    const aiCard = document.createElement('div');
    aiCard.className = 'gateway-ai-card';
    aiCard.style.borderColor = (tier === 'heavy') ? '#6f42c1' : '#28a745';
    
    const header = document.createElement('div');
    header.className = 'gateway-header';
    header.style.color = (tier === 'heavy') ? '#6f42c1' : '#28a745';
    header.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.75z"/>
      </svg>
      ${tier === 'heavy' ? 'Heavy Tier Orchestration' : 'Fast Tier Orchestration'}
    `;

    const logsContainer = document.createElement('div');
    logsContainer.className = 'gateway-orchestrator-logs';
    logsContainer.innerHTML = `<div class="gateway-loading"><div class="gateway-spinner"></div>Initializing Multi-Agent Pipeline...</div>`;

    const responseContainer = document.createElement('div');
    responseContainer.className = 'gateway-orchestrator-response';

    aiCard.appendChild(header);
    aiCard.appendChild(logsContainer);
    aiCard.appendChild(responseContainer);
    turnDiv.appendChild(aiCard);
    chatContainer.appendChild(turnDiv);

    scrollToBottom(chatContainer);

    // Setup MutationObserver to watch the chat container and auto-scroll as nodes update
    const observer = new MutationObserver(() => {
      scrollToBottom(chatContainer);
    });
    observer.observe(chatContainer, { childList: true, subtree: true });

    let isFirstLog = true;

    // 9. API Request via Port Connection
    try {
      const port = chrome.runtime.connect({ name: 'agent-orchestrator' });
      
      port.postMessage({
        action: 'startOrchestration',
        model: model,
        userPrompt: promptText
      });

      port.onMessage.addListener(async (msg) => {
        if (msg.status === 'log') {
          if (isFirstLog) {
            logsContainer.innerHTML = '';
            isFirstLog = false;
          }
          const logItem = document.createElement('div');
          logItem.className = 'gateway-log-item';
          logItem.innerHTML = formatMarkdown(msg.logText);
          logsContainer.appendChild(logItem);
          
          // Keep inner log container scrolled to bottom
          logsContainer.scrollTop = logsContainer.scrollHeight;
          scrollToBottom(chatContainer);
        } else if (msg.status === 'success') {
          responseContainer.innerHTML = formatMarkdown(msg.text);
          scrollToBottom(chatContainer);
          observer.disconnect();
          port.disconnect();
        } else if (msg.status === 'error') {
          await rollbackQuota(tier, currentDateString);
          const errorDiv = document.createElement('div');
          errorDiv.className = 'gateway-error-text';
          errorDiv.innerText = "Error: " + msg.error;
          responseContainer.appendChild(errorDiv);
          scrollToBottom(chatContainer);
          observer.disconnect();
          port.disconnect();
        }
      });

      port.onDisconnect.addListener(async () => {
        observer.disconnect();
        if (responseContainer.innerHTML === '') {
          const errorDiv = document.createElement('div');
          errorDiv.className = 'gateway-error-text';
          errorDiv.innerText = "Error: Background service worker connection lost.";
          responseContainer.appendChild(errorDiv);
          scrollToBottom(chatContainer);
        }
      });
    } catch (err) {
      await rollbackQuota(tier, currentDateString);
      observer.disconnect();
      const errorDiv = document.createElement('div');
      errorDiv.className = 'gateway-error-text';
      errorDiv.innerText = "Connection failed: " + err.message;
      responseContainer.appendChild(errorDiv);
      scrollToBottom(chatContainer);
    }
  }
}

function injectQuotaBlock(turnDiv, chatContainer, message) {
  const aiCard = document.createElement('div');
  aiCard.className = 'gateway-ai-card';
  aiCard.style.borderColor = '#dc3545';
  
  const header = document.createElement('div');
  header.className = 'gateway-header';
  header.style.color = '#dc3545';
  header.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
    </svg>
    Quota Exhausted
  `;
  
  const content = document.createElement('div');
  content.innerText = message;
  
  aiCard.appendChild(header);
  aiCard.appendChild(content);
  turnDiv.appendChild(aiCard);
  chatContainer.appendChild(turnDiv);
  
  setTimeout(() => {
    turnDiv.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, 100);
}

async function rollbackQuota(tier, currentDateString) {
  const currentQuota = await getDailyQuota(currentDateString);
  currentQuota[tier] = Math.max(0, currentQuota[tier] - 1);
  await updateQuota(currentQuota);
}

// Global keydown listener to capture Enter key on inputs/textareas
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    const target = e.target;
    if (target.tagName.toLowerCase() === 'textarea' || target.tagName.toLowerCase() === 'input' || target.isContentEditable) {
      handleInputEvent(e, target);
    }
  }
}, true); // Intercept during capturing phase

// Capture click events on send buttons
document.addEventListener('click', (e) => {
  const button = e.target.closest('button[type="submit"], button[data-testid*="send"], button[aria-label*="end"]');
  if (button) {
    const inputElement = document.querySelector('textarea, [contenteditable="true"]');
    if (inputElement) {
      const text = inputElement.value || inputElement.innerText || "";
      if (text.trim().startsWith("//")) {
        handleInputEvent(e, inputElement);
      }
    }
  }
}, true);
