// One interface, three interchangeable model providers, selected by LLM_PROVIDER:
//   ollama : on-device (default). Microsoft Phi via Ollama; no data leaves the machine.
//   azure  : Azure OpenAI / Azure AI Foundry / GitHub Models (any OpenAI-compatible endpoint).
//   gemini : Google Gemini (needs internet + GEMINI_API_KEY).
// Every provider must return parsed JSON; callers validate it, never trust it.
import { GoogleGenAI } from '@google/genai';

const TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS || 90000);

async function ollama({ system, user, schema }) {
  const base = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
  const model = process.env.OLLAMA_MODEL || 'phi4-mini';
  const res = await fetch(`${base}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    body: JSON.stringify({
      model,
      stream: false,
      format: schema, // Ollama constrains generation to this JSON schema
      options: { temperature: 0.1, num_ctx: 8192, num_predict: 1800, repeat_penalty: 1.15 },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Ollama HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return { json: JSON.parse(data.message.content), provider: 'ollama', model, onDevice: true };
}

async function azure({ system, user }) {
  const url = process.env.AZURE_OPENAI_URL; // e.g. https://<resource>.openai.azure.com/openai/v1 or https://models.github.ai/inference
  const key = process.env.AZURE_OPENAI_KEY;
  const model = process.env.AZURE_OPENAI_MODEL || 'gpt-4o-mini';
  if (!url || !key) throw new Error('AZURE_OPENAI_URL / AZURE_OPENAI_KEY not configured');
  const res = await fetch(`${url.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'api-key': key, authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    body: JSON.stringify({
      model,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Azure OpenAI HTTP ${res.status}`);
  const data = await res.json();
  return { json: JSON.parse(data.choices[0].message.content), provider: 'azure', model, onDevice: false };
}

async function gemini({ system, user, schema }) {
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured');
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model,
    contents: user,
    config: {
      systemInstruction: system,
      temperature: 0.1,
      responseMimeType: 'application/json',
      responseJsonSchema: schema,
      abortSignal: AbortSignal.timeout(TIMEOUT_MS),
    },
  });
  return { json: JSON.parse(response.text.trim()), provider: 'gemini', model, onDevice: false };
}

const PROVIDERS = { ollama, azure, gemini };

export function providerInfo() {
  const provider = process.env.LLM_PROVIDER || 'ollama';
  const model =
    provider === 'ollama' ? process.env.OLLAMA_MODEL || 'phi4-mini'
      : provider === 'azure' ? process.env.AZURE_OPENAI_MODEL || 'gpt-4o-mini'
        : process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  return { provider, model, onDevice: provider === 'ollama', mode: process.env.AI_MODE || 'live' };
}

export async function generateJSON(args) {
  const { provider } = providerInfo();
  const fn = PROVIDERS[provider];
  if (!fn) throw new Error(`Unknown LLM_PROVIDER ${provider}`);
  return fn(args);
}
