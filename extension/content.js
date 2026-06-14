// AI Gateway Council — Content Script
// Type // or //council in the chat input to activate.

// ─── Styles ───────────────────────────────────────────────────────────────────

const STYLE_ID = 'gateway-custom-styles';
if (!document.getElementById(STYLE_ID)) {
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = `
    .gateway-card {
      position: relative;
      background: #fff;
      border: 1.5px solid #e0e0e0;
      border-radius: 12px;
      padding: 18px 20px 20px;
      margin: 16px auto;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.65;
      color: #1d1d1f;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
      word-break: break-word;
      overflow-wrap: break-word;
      box-sizing: border-box;
      width: 100%;
      max-width: 720px;
    }

    /* Dark mode */
    @media (prefers-color-scheme: dark) {
      .gateway-card { background:#1e1e1e; color:#e8e8e8; border-color:#3a3a3a; }
    }
    html[class*="dark"] .gateway-card,
    html[data-theme="dark"] .gateway-card,
    body[class*="dark"] .gateway-card,
    body.dark-mode .gateway-card {
      background: #1e1e1e; color: #e8e8e8; border-color: #3a3a3a;
    }

    .gateway-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
      padding-bottom: 10px;
      border-bottom: 1px solid rgba(0,0,0,0.08);
    }
    @media (prefers-color-scheme: dark) {
      .gateway-card-header { border-bottom-color: rgba(255,255,255,0.08); }
    }

    .gateway-card-title {
      display: flex;
      align-items: center;
      gap: 7px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .gateway-card-close {
      background: none;
      border: none;
      cursor: pointer;
      opacity: 0.45;
      padding: 2px 4px;
      border-radius: 4px;
      font-size: 16px;
      line-height: 1;
      color: inherit;
    }
    .gateway-card-close:hover { opacity: 0.9; background: rgba(128,128,128,0.12); }

    .gateway-prompt-pill {
      display: inline-block;
      background: rgba(0,0,0,0.05);
      border-radius: 8px;
      padding: 6px 10px;
      font-size: 13px;
      color: #555;
      margin-bottom: 12px;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      box-sizing: border-box;
    }
    @media (prefers-color-scheme: dark) {
      .gateway-prompt-pill { background: rgba(255,255,255,0.07); color: #aaa; }
    }

    .gateway-logs {
      border-left: 3px solid #6f42c1;
      padding: 10px 14px;
      background: rgba(111,66,193,0.04);
      border-radius: 0 8px 8px 0;
      font-size: 12.5px;
      color: #555;
      margin-bottom: 14px;
    }
    @media (prefers-color-scheme: dark) {
      .gateway-logs { background: rgba(168,85,247,0.08); color: #bbb; }
    }

    .gateway-log-item {
      padding-bottom: 7px;
      margin-bottom: 7px;
      border-bottom: 1px dashed rgba(0,0,0,0.07);
    }
    .gateway-log-item:last-child { padding-bottom:0; margin-bottom:0; border-bottom:none; }

    .gateway-loading {
      display: flex;
      align-items: center;
      gap: 9px;
      color: #888;
    }
    .gateway-spinner {
      width: 15px; height: 15px;
      border: 2px solid #ccc;
      border-top-color: #6f42c1;
      border-radius: 50%;
      flex-shrink: 0;
      animation: gw-spin 0.7s linear infinite;
    }
    @keyframes gw-spin { to { transform: rotate(360deg); } }

    .gateway-response {
      word-break: break-word;
      overflow-wrap: break-word;
      max-height: 55vh;
      overflow-y: auto;
      padding-right: 4px;
    }
    .gateway-response pre {
      white-space: pre;
      overflow-x: auto;
      background: #1e1e1e;
      color: #d4d4d4;
      padding: 14px 16px;
      border-radius: 8px;
      font-family: "Consolas","Courier New",monospace;
      font-size: 13px;
      margin: 12px 0;
      border: 1px solid #333;
      max-width: 100%;
    }
    .gateway-response code {
      background: rgba(120,120,120,0.12);
      padding: 2px 5px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 13px;
    }
    .gateway-response pre code {
      background: none;
      padding: 0;
      border-radius: 0;
      font-size: inherit;
    }
    .gateway-response h2 { font-size:20px; margin:18px 0 8px; }
    .gateway-response h3 { font-size:17px; margin:15px 0 6px; color:#007bff; }
    .gateway-response h4 { font-size:14px; margin:12px 0 4px; border-bottom:1px solid rgba(128,128,128,.2); padding-bottom:3px; }
    .gateway-response ul { margin: 8px 0 12px 20px; }
    .gateway-response li { margin-bottom: 5px; }
    .gateway-response strong { font-weight: 700; }
    .gateway-response em { font-style: italic; }

    .gateway-error { color: #dc3545; font-weight: 500; }
  `;
  document.head.appendChild(el);
}

// ─── Markdown renderer ────────────────────────────────────────────────────────

function escapeHtml(t) {
  return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
           .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

function formatMarkdown(text) {
  // Normalise line endings — APIs sometimes return \r\n
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Split on fenced code blocks BEFORE escaping so the ``` delimiters are intact
  const CODE_FENCE = /^```([\w-]*)\n([\s\S]*?)\n```/gm;
  const segments = [];
  let last = 0;
  let m;
  while ((m = CODE_FENCE.exec(text)) !== null) {
    segments.push({ type: 'text', content: text.slice(last, m.index) });
    segments.push({ type: 'code', lang: m[1], content: m[2] });
    last = m.index + m[0].length;
  }
  segments.push({ type: 'text', content: text.slice(last) });

  return segments.map(seg => {
    if (seg.type === 'code') {
      return `<pre><code class="language-${escapeHtml(seg.lang)}">${escapeHtml(seg.content)}</code></pre>`;
    }

    let h = escapeHtml(seg.content);

    // Inline code
    h = h.replace(/`([^`\n]+)`/g, '<code>$1</code>');

    // Headers
    h = h.replace(/^### (.+)$/gm, '<h4>$1</h4>');
    h = h.replace(/^## (.+)$/gm,  '<h3>$1</h3>');
    h = h.replace(/^# (.+)$/gm,   '<h2>$1</h2>');

    // Bold / italic
    h = h.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
    h = h.replace(/\*([^*\n]+)\*/g,     '<em>$1</em>');

    // List items → wrap in <ul>
    h = h.replace(/^\s*[-*+] (.+)$/gm, '<li>$1</li>');
    h = h.replace(/(<li>[\s\S]*?<\/li>(\n|$))+/g, m => `<ul>${m}</ul>`);

    // Newlines to <br> (outside block elements)
    h = h.replace(/\n/g, '<br>');

    return h;
  }).join('');
}

// ─── Injection helpers ────────────────────────────────────────────────────────

// Walk UP exactly 3 levels from the input. On Gemini/ChatGPT/Claude this
// lands us at the "input section" block inside the conversation wrapper —
// inserting before it places the card just above the input bar, in the chat.
// Stopping at 3 levels avoids climbing into full-screen wrappers.
function findInsertionPoint(inputEl) {
  const STOP = new Set(['MAIN', 'BODY', 'HTML', 'NAV', 'ASIDE', 'HEADER', 'FOOTER']);
  let el = inputEl;
  for (let i = 0; i < 3; i++) {
    if (!el.parentElement || STOP.has(el.parentElement.tagName)) break;
    el = el.parentElement;
  }
  return { parent: el.parentElement || document.body, anchor: el };
}

function injectCard(inputEl, cardEl) {
  const { parent, anchor } = findInsertionPoint(inputEl);
  parent.insertBefore(cardEl, anchor);
  // Scroll card into view after a short delay (let layout settle)
  setTimeout(() => cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 120);
}

// ─── Clear an input (handles textarea, input, and contenteditable) ────────────

function clearInput(el) {
  if (el.tagName.toLowerCase() === 'textarea' || el.tagName.toLowerCase() === 'input') {
    const proto = Object.getPrototypeOf(el);
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
                || Object.getOwnPropertyDescriptor(el, 'value')?.set;
    if (setter) setter.call(el, '');
    else el.value = '';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  } else if (el.isContentEditable) {
    el.focus();
    try {
      document.execCommand('selectAll', false, null);
      document.execCommand('delete',    false, null);
    } catch {
      el.textContent = '';
    }
    el.dispatchEvent(new Event('input',  { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

// ─── Filters & quota ─────────────────────────────────────────────────────────

const TECH_KW = [
  'code','program','develop','software','engineer','function','class','struct','variable',
  'compile','debug','memory','performance','optimize','scaling','architect','database',
  'sql','query','websocket','server','client','api','http','json','git','repo','array',
  'string','object','loop','pointer','thread','process','docker','deploy','rest','endpoint',
  'html','css','javascript','typescript','python','cpp','java','rust','golang','bash','script',
  'algorithm','complexity','web','app','sdk','stack','framework','npm','regex',
  'race condition','memory leak','deadlock','concurrency','design pattern','microservice',
  'load balanc','failover','bottleneck','cach','latency','throughput','build','test','lint'
];
const NON_TECH_KW = [
  'recipe','pizza','cooking','bake','food','joke','weather','movie','song','sports',
  'football','basketball','poem','novel','music','vacation','travel','fashion','makeup',
  'lyrics','restaurant','hotel'
];
const ARCH_KW = [
  'architecture','optimize','race condition','memory leak','scaling','database schema',
  'performance','deadlock','concurrency','design pattern','microservice',
  'load balanc','failover','bottleneck','cach','latency','throughput'
];

function isTechnical(text) {
  const t = text.toLowerCase();
  const hasTech    = TECH_KW.some(k => t.includes(k));
  const hasNonTech = NON_TECH_KW.some(k => t.includes(k));
  if (hasNonTech && !hasTech) return false;
  if (t.length < 50 && !hasTech) return false;
  return true;
}

async function getDailyQuota(date) {
  const { daily_quota: q } = await chrome.storage.local.get(['daily_quota']);
  if (!q || q.date !== date) {
    const fresh = { date, heavy: 0, fast: 0 };
    await chrome.storage.local.set({ daily_quota: fresh });
    return fresh;
  }
  return q;
}
async function saveQuota(q)  { await chrome.storage.local.set({ daily_quota: q }); }
async function rollback(tier, date) {
  const q = await getDailyQuota(date);
  q[tier] = Math.max(0, q[tier] - 1);
  await saveQuota(q);
}

// ─── Card builder ─────────────────────────────────────────────────────────────

function buildCard({ tierColor, tierLabel, promptText }) {
  const card = document.createElement('div');
  card.className = 'gateway-card';
  card.style.borderColor = tierColor;

  // Header
  const header = document.createElement('div');
  header.className = 'gateway-card-header';

  const title = document.createElement('div');
  title.className = 'gateway-card-title';
  title.style.color = tierColor;
  title.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.75z"/>
    </svg>
    ${escapeHtml(tierLabel)}
  `;

  const closeBtn = document.createElement('button');
  closeBtn.className = 'gateway-card-close';
  closeBtn.textContent = '✕';
  closeBtn.title = 'Dismiss';
  closeBtn.addEventListener('click', () => card.remove());

  header.appendChild(title);
  header.appendChild(closeBtn);
  card.appendChild(header);

  // Prompt preview
  const pill = document.createElement('div');
  pill.className = 'gateway-prompt-pill';
  pill.textContent = promptText;
  card.appendChild(pill);

  // Log stream
  const logs = document.createElement('div');
  logs.className = 'gateway-logs';
  logs.innerHTML = `<div class="gateway-loading"><div class="gateway-spinner"></div>Initializing pipeline…</div>`;
  card.appendChild(logs);

  // Final response area
  const response = document.createElement('div');
  response.className = 'gateway-response';
  card.appendChild(response);

  return { card, logs, response };
}

// ─── Core handler ─────────────────────────────────────────────────────────────

async function handleInputEvent(e, inputEl) {
  const raw = inputEl.value || inputEl.innerText || inputEl.textContent || '';
  if (!raw.trim().startsWith('//')) return;

  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();

  const trimmed = raw.trim();
  let isCouncil = false;
  let prompt = '';

  if (trimmed.startsWith('//council')) {
    isCouncil = true;
    prompt = trimmed.slice('//council'.length).trim();
  } else {
    prompt = trimmed.slice(2).trim();
  }

  if (!prompt) return;

  // Clear input before anything else so the site can't also send it
  clearInput(inputEl);

  // ── Non-technical filter ──────────────────────────────────────────────────
  if (!isTechnical(prompt)) {
    const { card, logs } = buildCard({ tierColor: '#ffc107', tierLabel: 'Router Filter', prompt });
    logs.innerHTML = '<span style="color:#ffc107">⚠️ Optimised for software engineering queries — quota saved.</span>';
    injectCard(inputEl, card);
    return;
  }

  // ── Tier routing ──────────────────────────────────────────────────────────
  const heavy = isCouncil || prompt.length >= 150 || ARCH_KW.some(k => prompt.toLowerCase().includes(k));
  const tier  = heavy ? 'heavy' : 'fast';

  // ── Quota ─────────────────────────────────────────────────────────────────
  const pst = new Date().toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles' });
  const [mo, da, yr] = pst.split('/');
  const today = `${yr}-${mo.padStart(2,'0')}-${da.padStart(2,'0')}`;

  const quota  = await getDailyQuota(today);
  const LIMITS = { heavy: 50, fast: 250 };

  if (quota[tier] >= LIMITS[tier]) {
    const { card, logs } = buildCard({ tierColor: '#dc3545', tierLabel: 'Quota Exhausted', prompt });
    logs.innerHTML = `<span style="color:#dc3545">🛑 Daily ${tier} limit (${LIMITS[tier]}) reached. Resets at midnight Pacific.</span>`;
    injectCard(inputEl, card);
    return;
  }

  quota[tier]++;
  await saveQuota(quota);

  // ── Build & inject card ───────────────────────────────────────────────────
  const tierColor = tier === 'heavy' ? '#6f42c1' : '#28a745';
  const tierLabel = tier === 'heavy' ? 'Council Orchestration' : 'Fast Orchestration';
  const { card, logs, response } = buildCard({ tierColor, tierLabel, promptText: prompt });

  injectCard(inputEl, card);

  let firstLog = true;

  // ── Connect to background worker ──────────────────────────────────────────
  try {
    const port = chrome.runtime.connect({ name: 'agent-orchestrator' });
    port.postMessage({ action: 'startOrchestration', userPrompt: prompt, tier });

    port.onMessage.addListener(async (msg) => {
      if (msg.status === 'log') {
        if (firstLog) { logs.innerHTML = ''; firstLog = false; }
        const item = document.createElement('div');
        item.className = 'gateway-log-item';
        item.innerHTML = formatMarkdown(msg.logText);
        logs.appendChild(item);
        logs.scrollTop = logs.scrollHeight;

      } else if (msg.status === 'success') {
        response.innerHTML = formatMarkdown(msg.text);
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        port.disconnect();

      } else if (msg.status === 'error') {
        await rollback(tier, today);
        const err = document.createElement('div');
        err.className = 'gateway-error';
        err.textContent = 'Error: ' + msg.error;
        response.appendChild(err);
        port.disconnect();
      }
    });

    port.onDisconnect.addListener(async () => {
      if (!response.innerHTML.trim()) {
        await rollback(tier, today);
        const err = document.createElement('div');
        err.className = 'gateway-error';
        err.textContent = 'Background worker disconnected. Reload the page and try again.';
        response.appendChild(err);
      }
    });

  } catch (ex) {
    await rollback(tier, today);
    const err = document.createElement('div');
    err.className = 'gateway-error';
    err.textContent = 'Could not connect to extension background: ' + ex.message;
    response.appendChild(err);
  }
}

// ─── Event listeners ──────────────────────────────────────────────────────────

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' || e.shiftKey) return;
  const t = e.target;
  if (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT' || t.isContentEditable) {
    const txt = t.value || t.innerText || t.textContent || '';
    if (txt.trim().startsWith('//')) handleInputEvent(e, t);
  }
}, true);

document.addEventListener('click', (e) => {
  const btn = e.target.closest('button[type="submit"],button[data-testid*="send"],button[aria-label*="end"],button[aria-label*="Send"]');
  if (!btn) return;
  const inp = document.querySelector('textarea,input[type="text"],div[contenteditable="true"]');
  if (!inp) return;
  const txt = inp.value || inp.innerText || inp.textContent || '';
  if (txt.trim().startsWith('//')) handleInputEvent(e, inp);
}, true);
