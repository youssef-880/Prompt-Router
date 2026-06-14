// AI Gateway Council — Multi-Provider Orchestrator Service Worker
// Supports: Gemini (Google), OpenAI (ChatGPT), Claude (Anthropic)
// API keys are loaded from chrome.storage.local (set via the popup).

// ─── Provider Configuration ─────────────────────────────────────────────────

const PROVIDER_MODELS = {
  gemini: { fast: 'gemini-2.5-flash', heavy: 'gemini-2.5-flash' },
  openai: { fast: 'gpt-4o-mini',      heavy: 'gpt-4o'           },
  claude: { fast: 'claude-haiku-4-5-20251001', heavy: 'claude-sonnet-4-6' }
};

function detectProviderFromHostname(hostname) {
  if (hostname.includes('gemini')) return 'gemini';
  if (hostname.includes('chatgpt')) return 'openai';
  if (hostname.includes('claude')) return 'claude';
  return 'gemini';
}

async function getProviderConfig(hostname) {
  const storage = await chrome.storage.local.get([
    'GEMINI_API_KEY', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'preferred_provider'
  ]);

  let provider = storage.preferred_provider || 'auto';
  if (provider === 'auto') {
    provider = detectProviderFromHostname(hostname);
  }

  const keyMap = {
    gemini: storage.GEMINI_API_KEY,
    openai: storage.OPENAI_API_KEY,
    claude: storage.ANTHROPIC_API_KEY
  };

  const apiKey = keyMap[provider];
  if (!apiKey || apiKey.trim() === '') {
    const label = { gemini: 'Gemini', openai: 'OpenAI', claude: 'Anthropic' }[provider];
    throw new Error(`No API key set for ${label}. Open the extension popup and enter your key.`);
  }

  return { provider, apiKey };
}

// ─── Message Routing ─────────────────────────────────────────────────────────

// Simple one-shot request (legacy support)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fetchAIResponse') {
    const hostname = sender.tab ? new URL(sender.tab.url).hostname : 'gemini.google.com';
    runOrchestrationLogic(request.userPrompt, request.tier || 'fast', hostname)
      .then(result => sendResponse({ success: true, text: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

// Port-based messaging for real-time progress streaming
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'agent-orchestrator') return;

  const hostname = port.sender && port.sender.tab
    ? new URL(port.sender.tab.url).hostname
    : 'gemini.google.com';

  port.onMessage.addListener(async (msg) => {
    if (msg.action === 'startOrchestration') {
      try {
        const result = await runOrchestrationLogic(msg.userPrompt, msg.tier || 'fast', hostname, port);
        port.postMessage({ status: 'success', text: result });
      } catch (error) {
        console.error('[Orchestrator]', error);
        port.postMessage({ status: 'error', error: error.message });
      }
    }
  });
});

// ─── Orchestration Pipeline ───────────────────────────────────────────────────

async function runOrchestrationLogic(userPrompt, tier, hostname, port = null) {
  const { provider, apiKey } = await getProviderConfig(hostname);
  const modelName = PROVIDER_MODELS[provider]?.[tier] ?? PROVIDER_MODELS.gemini.fast;

  const providerLabel = { gemini: 'Gemini', openai: 'OpenAI', claude: 'Claude' }[provider];
  logProgress(port, `🚦 Initiating Multi-Agent Pipeline — **${providerLabel}** (${modelName})`);

  // ── Agent System Prompts ──────────────────────────────────────────────────

  const routerSystemPrompt = `You are the Router agent for a multi-agent software engineering team.
Analyze the user's prompt and the conversational history, then decide:
1. If the request needs backend logic, APIs, databases, performance, or architecture — delegate to 'Backend_Optimizer'.
2. If the request needs frontend layouts, HTML, CSS, JavaScript, or UX — delegate to 'UI_Engineer'.
3. If all necessary context has been gathered, or the request is fully addressed, compile a final production-ready response and mark the task finished.

Respond ONLY with a raw JSON object — no markdown code fences.
Schema:
{
  "decision": "delegate" | "finish",
  "recipient": "Backend_Optimizer" | "UI_Engineer" | null,
  "reason": "Brief explanation",
  "instruction": "Specific instructions for the sub-agent (only when decision is delegate)",
  "response": "Final comprehensive markdown answer (only when decision is finish)"
}`;

  const backendSystemPrompt = `You are Backend_Optimizer, an elite software architect and systems engineer.
Your specialty: backend logic, database design, API architecture, performance, concurrency, and memory safety.
Analyze the Router's instructions and the original query. Write clean, production-grade code with clear explanations.`;

  const uiSystemPrompt = `You are UI_Engineer, a principal frontend developer and UI/UX specialist.
Your specialty: modern web interfaces, HTML/CSS/JavaScript, visual hierarchy, animations, and DOM interaction.
Analyze the Router's instructions and the original query. Provide complete, styled HTML/CSS/JS solutions.`;

  // ── Orchestration History (OpenAI message format internally) ─────────────

  const history = [
    { role: 'system', content: routerSystemPrompt },
    { role: 'user',   content: `User query: "${userPrompt}"` }
  ];

  const maxIterations = 5;

  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    logProgress(port, `🔍 **[Round ${iteration}/${maxIterations}]** Router is planning next step…`);

    // Call router
    const routerRaw = await callProvider(provider, modelName, history, apiKey);

    // Add router response to history for coherent context in next turn
    history.push({ role: 'assistant', content: routerRaw });

    // Parse router decision
    let decision;
    try {
      let cleaned = routerRaw.trim();
      const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (fenceMatch) cleaned = fenceMatch[1];
      decision = JSON.parse(cleaned);
    } catch {
      // Router returned non-JSON — treat as final answer
      decision = { decision: 'finish', response: routerRaw, reason: 'Router produced a direct answer' };
    }

    if (decision.decision === 'finish') {
      logProgress(port, `✨ **Done in ${iteration} round(s):** *${decision.reason || 'Task complete'}*`);
      return decision.response || 'No response compiled.';
    }

    if (decision.decision === 'delegate') {
      const { recipient: agent, instruction, reason } = decision;

      if (agent !== 'Backend_Optimizer' && agent !== 'UI_Engineer') {
        throw new Error(`Router delegated to unknown agent: "${agent}"`);
      }

      logProgress(port, `➡️ **Delegating to ${agent}:** *${reason || 'Sub-agent expertise required'}*\n**Task:** ${instruction}`);

      const agentSystemPrompt = agent === 'Backend_Optimizer' ? backendSystemPrompt : uiSystemPrompt;
      const agentMessages = [
        { role: 'system', content: agentSystemPrompt },
        { role: 'user',   content: `Original user prompt: "${userPrompt}"\n\nYour task: "${instruction}"\n\nExecute and provide your implementation.` }
      ];

      logProgress(port, `⚙️ **${agent}** is working on the solution…`);
      const agentResult = await callProvider(provider, modelName, agentMessages, apiKey);
      logProgress(port, `📥 **${agent}** completed and returned context to Router.`);

      // Feed sub-agent output back to router as a user turn
      history.push({
        role: 'user',
        content: `Update: ${agent} completed task.\nInstructions given: "${instruction}"\n\n${agent} output:\n\n${agentResult}`
      });
    }
  }

  // Fallback: synthesise from all accumulated history
  logProgress(port, `⚠️ **Max rounds reached.** Synthesizing final answer…`);
  const synthMessages = [
    { role: 'system', content: 'You are a synthesis agent. Review the task history and write a final, comprehensive, structured answer for the user.' },
    ...history.filter(m => m.role !== 'system')
  ];
  return await callProvider(provider, modelName, synthMessages, apiKey);
}

// ─── Provider Dispatch ────────────────────────────────────────────────────────

async function callProvider(provider, model, messages, apiKey) {
  switch (provider) {
    case 'gemini': return callGemini(model, messages, apiKey);
    case 'openai': return callOpenAI(model, messages, apiKey);
    case 'claude': return callClaude(model, messages, apiKey);
    default: throw new Error(`Unknown provider: "${provider}"`);
  }
}

// ─── Gemini (via OpenAI-compatibility endpoint) ───────────────────────────────

async function callGemini(model, messages, apiKey) {
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({ model, messages })
  });
  return parseOpenAIStyleResponse(response, 'Gemini');
}

// ─── OpenAI ───────────────────────────────────────────────────────────────────

async function callOpenAI(model, messages, apiKey) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({ model, messages })
  });
  return parseOpenAIStyleResponse(response, 'OpenAI');
}

// ─── Claude (Anthropic Messages API) ─────────────────────────────────────────

async function callClaude(model, messages, apiKey) {
  // Anthropic uses a distinct format: system is a top-level field, messages must alternate user/assistant.
  const systemParts = messages.filter(m => m.role === 'system').map(m => m.content);
  const systemContent = systemParts.join('\n\n');

  // Build alternating user/assistant array, merging consecutive same-role messages
  const nonSystem = messages.filter(m => m.role !== 'system');
  const merged = [];
  for (const msg of nonSystem) {
    if (merged.length > 0 && merged[merged.length - 1].role === msg.role) {
      merged[merged.length - 1].content += '\n\n' + msg.content;
    } else {
      merged.push({ role: msg.role, content: msg.content });
    }
  }

  // Claude requires the first message to be from 'user'
  if (merged.length === 0 || merged[0].role !== 'user') {
    merged.unshift({ role: 'user', content: 'Please proceed.' });
  }

  const body = { model, max_tokens: 8192, messages: merged };
  if (systemContent) body.system = systemContent;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const text = await response.text();
    let detail = text.substring(0, 150);
    try { detail = JSON.parse(text)?.error?.message ?? detail; } catch { /* keep raw */ }
    throw new Error(`Claude API error (${response.status}): ${detail}`);
  }

  const data = await response.json();
  if (data.content && data.content.length > 0 && data.content[0].type === 'text') {
    return data.content[0].text;
  }
  throw new Error('Unexpected response format from Claude API');
}

// ─── Shared Response Parser (OpenAI / Gemini compat) ─────────────────────────

async function parseOpenAIStyleResponse(response, providerName) {
  if (!response.ok) {
    const text = await response.text();
    let detail = text.substring(0, 150);
    try { detail = JSON.parse(text)?.error?.message ?? detail; } catch { /* keep raw */ }
    throw new Error(`${providerName} API error (${response.status}): ${detail}`);
  }
  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (content !== undefined && content !== null) return content;
  throw new Error(`Unexpected response format from ${providerName} API`);
}

// ─── Logging Helper ───────────────────────────────────────────────────────────

function logProgress(port, text) {
  console.log('[Orchestrator]', text);
  if (port) {
    try { port.postMessage({ status: 'log', logText: text }); } catch { /* port closed */ }
  }
}
