import { createGroq } from "@ai-sdk/groq";
import { createXai } from "@ai-sdk/xai";
import { createOpenAI } from "@ai-sdk/openai";

import {
  customProvider,
  wrapLanguageModel,
  extractReasoningMiddleware
} from "ai";

export interface ModelInfo {
  provider: string;
  name: string;
  description: string;
  apiVersion: string;
  capabilities: string[];
}

const middleware = extractReasoningMiddleware({
  tagName: 'think',
});

const withReasoning = (mdl: any) =>
  wrapLanguageModel({
    model: mdl,
    middleware,
  });

// Helper to get configuration values from environment variables first, then localStorage
const getConfigValue = (key: string): string | undefined => {
  // Check for environment variables first
  if (process.env[key]) {
    return process.env[key] || undefined;
  }

  // Fall back to localStorage if available
  if (typeof window !== 'undefined') {
    return window.localStorage.getItem(key) || undefined;
  }

  return undefined;
};

const groqClient = createGroq({
  apiKey: getConfigValue('GROQ_API_KEY'),
});

const xaiClient = createXai({
  apiKey: getConfigValue('XAI_API_KEY'),
});

// Local OpenAI-compatible backend (e.g., Ollama, LM Studio, vLLM, gpt-oss server)
// Configure via env or localStorage:
//   LOCAL_OPENAI_BASE_URL (e.g., http://localhost:11434/v1)
//   LOCAL_OPENAI_API_KEY  (optional, if your local server requires it)
function normalizeOpenAIBaseURL(raw?: string): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.replace(/\/$/, '');
  // Ensure "/v1" suffix for OpenAI-compatible endpoints
  if (/\/v1$/.test(trimmed)) return trimmed;
  return `${trimmed}/v1`;
}

const localOpenAI = createOpenAI({
  apiKey: getConfigValue('LOCAL_OPENAI_API_KEY'),
  baseURL: normalizeOpenAIBaseURL(getConfigValue('LOCAL_OPENAI_BASE_URL')) || 'http://localhost:11434/v1',
});

const languageModels = {
  "qwen3-32b": withReasoning(groqClient('qwen/qwen3-32b')),
  "grok-3-mini": withReasoning(xaiClient("grok-3-mini-latest")),
  "kimi-k2": withReasoning(groqClient('moonshotai/kimi-k2-instruct')),
  "llama4": withReasoning(groqClient('meta-llama/llama-4-scout-17b-16e-instruct')),
  // Example local model served by an OpenAI-compatible API
  // Adjust the model name to any local one you have available
  "gpt-oss-20b": withReasoning(localOpenAI('gpt-oss:20b'))
};

export const modelDetails: Record<keyof typeof languageModels, ModelInfo> = {
  "kimi-k2": {
    provider: "Groq",
    name: "Kimi K2",
    description: "Latest version of Moonshot AI's Kimi K2 with good balance of capabilities.",
    apiVersion: "kimi-k2-instruct",
    capabilities: ["Balanced", "Efficient", "Agentic"]
  },
  "qwen3-32b": {
    provider: "Groq",
    name: "Qwen 3 32B",
    description: "Latest version of Alibaba's Qwen 32B with strong reasoning and coding capabilities.",
    apiVersion: "qwen3-32b",
    capabilities: ["Reasoning", "Efficient", "Agentic"]
  },
  "grok-3-mini": {
    provider: "XAI",
    name: "Grok 3 Mini",
    description: "Latest version of XAI's Grok 3 Mini with strong reasoning and coding capabilities.",
    apiVersion: "grok-3-mini-latest",
    capabilities: ["Reasoning", "Efficient", "Agentic"]
  },
  "llama4": {
    provider: "Groq",
    name: "Llama 4",
    description: "Latest version of Meta's Llama 4 with good balance of capabilities.",
    apiVersion: "llama-4-scout-17b-16e-instruct",
    capabilities: ["Balanced", "Efficient", "Agentic"]
  },
  "gpt-oss-20b": {
    provider: "Local",
    name: "gpt-oss:20b",
    description: "Local OpenAI-compatible model. Configure LOCAL_OPENAI_BASE_URL and optional LOCAL_OPENAI_API_KEY.",
    apiVersion: "OpenAI-compatible",
    capabilities: ["Reasoning", "Code", "Efficient"]
  }
};

// Update API keys when localStorage changes (for runtime updates)
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    // Reload the page if any API key changed to refresh the providers
    if (event.key?.includes('API_KEY') || event.key === 'LOCAL_OPENAI_BASE_URL') {
      window.location.reload();
    }
  });
}

export const model = customProvider({
  languageModels,
});

export type modelID = keyof typeof languageModels;

export const MODELS = Object.keys(languageModels);

export const defaultModel: modelID = "kimi-k2";
