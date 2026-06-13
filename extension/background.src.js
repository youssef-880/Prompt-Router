// Gemini Gateway Multi-Agent Orchestrator Service Worker (Source)
// This file references process.env.GEMINI_API_KEY, which is replaced by the root build.js script.

// Retrieve API key with secure environment variable build-injection fallback
function getApiKey(storageResult) {
  // process.env.GEMINI_API_KEY will be replaced with the string from .env during compile
  const buildKey = process.env.GEMINI_API_KEY;
  if (buildKey && buildKey !== 'undefined' && buildKey.trim() !== '') {
    return buildKey;
  }
  return storageResult ? storageResult.GEMINI_API_KEY : null;
}

// Global listen for legacy or simple fetch AI requests
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fetchAIResponse') {
    // Run the orchestrator in a single run and return final response
    runOrchestrationLogic(request.userPrompt, request.model || 'gemini-2.5-flash')
      .then(result => sendResponse({ success: true, text: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    
    // Return true for async response
    return true; 
  }
});

// Port-based messaging for real-time progress updates & agent logs
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'agent-orchestrator') {
    port.onMessage.addListener(async (msg) => {
      if (msg.action === 'startOrchestration') {
        try {
          const result = await runOrchestrationLogic(msg.userPrompt, msg.model, port);
          port.postMessage({ status: 'success', text: result });
        } catch (error) {
          console.error("Orchestrator error:", error);
          port.postMessage({ status: 'error', error: error.message });
        }
      }
    });
  }
});

/**
 * Executes the multi-agent orchestration pipeline.
 * Runs up to 5 iterations of: Router -> Sub-Agent -> Router -> ...
 */
async function runOrchestrationLogic(userPrompt, modelName, port = null) {
  // 1. Fetch API Key
  const storage = await chrome.storage.local.get(['GEMINI_API_KEY']);
  const apiKey = getApiKey(storage);
  if (!apiKey) {
    throw new Error('API Key not found. Please configure your Gemini API Key in the extension popup.');
  }

  // 2. Define Persona Instructions
  const routerSystemPrompt = `You are the Router agent for a multi-agent software engineering team.
Your task is to analyze the user's prompt and the conversational history, then make a decision:
1. If the request needs backend implementation, database schemas, API architecture, performance optimization, or logic, delegate to 'Backend_Optimizer'.
2. If the request needs frontend layouts, HTML, CSS, JavaScript, user experience updates, or visuals, delegate to 'UI_Engineer'.
3. If you have gathered all necessary context and code solutions from the sub-agents, or if the user's request is fully answered, compile a final, comprehensive, production-ready response and mark the task as finished.

You MUST respond in valid JSON format. Do not write any markdown code block wraps like \`\`\`json around your response, just return the raw JSON object.
JSON Schema:
{
  "decision": "delegate" | "finish",
  "recipient": "Backend_Optimizer" | "UI_Engineer" | null,
  "reason": "Why this agent/step was selected",
  "instruction": "Specific tasks and context for the sub-agent (only if decision is delegate)",
  "response": "The final comprehensive response in markdown (only if decision is finish)"
}`;

  const backendSystemPrompt = `You are Backend_Optimizer, an elite software architect and systems engineer.
Your specialty is backend logic, database designs, performance, parallel API execution streams, and memory safety.
Analyze the Router's instructions and the original query, then design/write the logic. Provide clean, well-commented code blocks and explain your choices.`;

  const uiSystemPrompt = `You are UI_Engineer, a principal frontend developer and UI/UX specialist.
Your specialty is building premium, modern user interfaces, visual hierarchy, styling, layout components, and DOM interaction.
Analyze the Router's instructions and the original query, then design/write the frontend solution. Provide clean HTML/CSS/JS snippets and explain your design decisions.`;

  // 3. Initialize Orchestration Loop State
  let iteration = 1;
  const maxIterations = 5;
  const history = [
    {
      role: 'system',
      content: routerSystemPrompt
    },
    {
      role: 'user',
      content: `Here is the user query to process: "${userPrompt}"`
    }
  ];

  logProgress(port, `🚦 Initiating Multi-Agent Pipeline for model: **${modelName}**`);

  // Main orchestrator loop
  while (iteration <= maxIterations) {
    logProgress(port, `🔍 **[Iteration ${iteration}/${maxIterations}]** Router analyzing history and planning next step...`);

    // Call Router
    const routerRawResponse = await callGemini(modelName, history, apiKey);
    
    // Parse decision
    let decisionObj;
    try {
      let cleaned = routerRawResponse.trim();
      // Strip markdown code block wrapper if the model accidentally output it anyway
      const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (match) {
        cleaned = match[1];
      }
      decisionObj = JSON.parse(cleaned);
    } catch (e) {
      console.warn("Could not parse Router response as JSON. Raw response was:", routerRawResponse);
      // Fallback: treat the raw response as a final answer
      decisionObj = {
        decision: 'finish',
        response: routerRawResponse,
        reason: 'Failed to parse JSON, falling back to raw output.'
      };
    }

    if (decisionObj.decision === 'finish') {
      logProgress(port, `✨ Consensus reached by the Router in **${iteration}** turns: *${decisionObj.reason || 'Tasks complete'}*`);
      return decisionObj.response || 'No response compiled.';
    }

    if (decisionObj.decision === 'delegate') {
      const agent = decisionObj.recipient;
      const instruction = decisionObj.instruction;
      const reason = decisionObj.reason || 'Requires sub-agent expertise';

      logProgress(port, `➡️ **Router delegated to ${agent}**: *${reason}*\n\n**Task:** *${instruction}*`);

      // Determine sub-agent prompt
      let agentPrompt = '';
      if (agent === 'Backend_Optimizer') {
        agentPrompt = backendSystemPrompt;
      } else if (agent === 'UI_Engineer') {
        agentPrompt = uiSystemPrompt;
      } else {
        throw new Error(`Router delegated to unknown agent: "${agent}"`);
      }

      // Execute sub-agent call with the specific instruction
      const agentMessages = [
        { role: 'system', content: agentPrompt },
        { role: 'user', content: `Original User Prompt: "${userPrompt}"\n\nYour task instructions: "${instruction}"\n\nPlease execute and provide your findings and code.` }
      ];

      logProgress(port, `⚙️ **${agent}** is analyzing requirements and writing solution...`);
      const agentResult = await callGemini(modelName, agentMessages, apiKey);

      // Append results to orchestration history
      history.push({
        role: 'user',
        content: `Feedback from execution: Router delegated to ${agent} with instructions: "${instruction}".\n\nHere is ${agent}'s implementation output:\n\n${agentResult}`
      });

      logProgress(port, `📥 **${agent} completed its task** and passed context back.`);
    }

    iteration++;
  }

  // Guardrail fallback: synthesise final output if loops exhaust without explicit finish
  logProgress(port, `⚠️ **Max iteration limit (${maxIterations}) reached.** Synthesizing final consensus...`);
  const synthMessages = [
    { role: 'system', content: 'You are the compiler agent. Review the task history and compile a final, comprehensive, structured answer solving the user request.' },
    ...history.filter(m => m.role !== 'system') // Filter out the complex router system prompt
  ];
  
  return await callGemini(modelName, synthMessages, apiKey);
}

// Helper: send logs via port if active
function logProgress(port, text) {
  console.log(`[Orchestrator Log]: ${text}`);
  if (port) {
    port.postMessage({ status: 'log', logText: text });
  }
}

// Core Fetch Client Wrapper using Google Generative Language OpenAI Compatibility Endpoint
async function callGemini(model, messages, apiKey) {
  const payload = {
    model: model || 'gemini-2.5-flash',
    messages: messages
  };

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    let errMsg = `Gemini API Request failed (${response.status})`;
    const responseText = await response.text();
    console.error("Gemini API Error Response:", responseText);
    try {
      const errJson = JSON.parse(responseText);
      if (errJson.error && errJson.error.message) {
        errMsg += `: ${errJson.error.message}`;
      }
    } catch (e) {
      errMsg += `: ${responseText.substring(0, 100)}`;
    }
    throw new Error(errMsg);
  }

  const data = await response.json();
  if (data.choices && data.choices.length > 0 && data.choices[0].message) {
    return data.choices[0].message.content;
  } else {
    throw new Error('Unexpected response format from API');
  }
}
