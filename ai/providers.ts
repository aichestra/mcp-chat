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

// Local model configuration
interface LocalModel {
  id: string;
  name: string;
  baseUrl: string;
  apiKey?: string;
  isActive: boolean;
  availableModels?: string[];
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

// Get local models from localStorage
const getLocalModels = (): LocalModel[] => {
  if (typeof window !== 'undefined') {
    try {
      const storedModels = window.localStorage.getItem('local-openai-models');
      if (storedModels) {
        const parsedModels = JSON.parse(storedModels);
        console.log('Loaded local models from localStorage:', parsedModels);
        
        // Check if we have any active models
        const activeModels = parsedModels.filter((model: LocalModel) => model.isActive);
        if (activeModels.length > 0) {
          return parsedModels;
        } else {
          console.log('No active local models found in localStorage');
        }
      }
    } catch (error) {
      console.error('Error parsing local models:', error);
    }
  }
  
  // If no active models found or not in browser, return a default model for Ollama
  const defaultModel: LocalModel = {
    id: 'default-ollama',
    name: 'Ollama',
    baseUrl: 'http://localhost:11434/v1',
    isActive: true,
    availableModels: [
      'qwen3:30b',
      'gpt-oss:20b',
      'gpt-oss:120b',
      'michaelneale/deepseek-r1-goose:latest',
      'deepseek-r1:latest'
    ]
  };
  
  console.log('Using default local model:', defaultModel);
  
  // Store the default model in localStorage if we're in the browser
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('local-openai-models', JSON.stringify([defaultModel]));
  }
  
  return [defaultModel];
};

const groqClient = createGroq({
  apiKey: getConfigValue('GROQ_API_KEY'),
});

const xaiClient = createXai({
  apiKey: getConfigValue('XAI_API_KEY'),
});

// Function to normalize OpenAI base URL
function normalizeOpenAIBaseURL(raw?: string): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.replace(/\/$/, '');
  // Ensure "/v1" suffix for OpenAI-compatible endpoints
  if (/\/v1$/.test(trimmed)) return trimmed;
  return `${trimmed}/v1`;
}

// Create base language models
const baseLanguageModels: Record<string, any> = {
  "qwen3-32b": withReasoning(groqClient('qwen/qwen3-32b')),
  "grok-3-mini": withReasoning(xaiClient("grok-3-mini-latest")),
  "kimi-k2": withReasoning(groqClient('moonshotai/kimi-k2-instruct')),
  "llama4": withReasoning(groqClient('meta-llama/llama-4-scout-17b-16e-instruct')),
};

// Create base model details
const baseModelDetails: Record<string, ModelInfo> = {
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
};

// Add local models to language models and model details
const localModels = getLocalModels().filter(model => model.isActive);
const languageModels: Record<string, any> = { ...baseLanguageModels };
export const modelDetails: Record<string, ModelInfo> = { ...baseModelDetails };

// Debug: Log all active local models
console.log("Active local models:", localModels);

// Add each active local model with available models
localModels.forEach(localModel => {
  if (localModel.availableModels && localModel.availableModels.length > 0) {
    // Create OpenAI client for this endpoint
    const localOpenAI = createOpenAI({
      apiKey: localModel.apiKey || undefined,
      baseURL: normalizeOpenAIBaseURL(localModel.baseUrl) || 'http://localhost:11434/v1',
    });

    // Add each available model
    localModel.availableModels.forEach(modelName => {
      // Use the raw model name directly as the ID without any prefix
      const modelId = modelName;
      
      // Add to language models
      languageModels[modelId] = withReasoning(localOpenAI(modelName));
      
      // Add to model details
      modelDetails[modelId] = {
        provider: localModel.name,
        name: modelName,
        description: `Local model from ${localModel.name} (${localModel.baseUrl})`,
        apiVersion: "OpenAI-compatible",
        capabilities: ["Local", "Reasoning", "Code"]
      };
      
      // Log the registered model
      console.log(`Registered local model: ${modelId}`);
    });
  }
});

// Add legacy local model for backward compatibility
if (!languageModels["gpt-oss-20b"]) {
  const legacyLocalOpenAI = createOpenAI({
    apiKey: getConfigValue('LOCAL_OPENAI_API_KEY'),
    baseURL: normalizeOpenAIBaseURL(getConfigValue('LOCAL_OPENAI_BASE_URL')) || 'http://localhost:11434/v1',
  });
  
  languageModels["gpt-oss-20b"] = withReasoning(legacyLocalOpenAI('gpt-oss:20b'));
  modelDetails["gpt-oss-20b"] = {
    provider: "Local",
    name: "gpt-oss:20b",
    description: "Local OpenAI-compatible model. Configure LOCAL_OPENAI_BASE_URL and optional LOCAL_OPENAI_API_KEY.",
    apiVersion: "OpenAI-compatible",
    capabilities: ["Reasoning", "Code", "Efficient"]
  };
}

// Update API keys when localStorage changes (for runtime updates)
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    // Reload the page if any API key changed to refresh the providers
    if (event.key?.includes('API_KEY') || 
        event.key === 'LOCAL_OPENAI_BASE_URL' || 
        event.key === 'local-openai-models') {
      window.location.reload();
    }
  });
}

// Original languageModels object
const originalLanguageModels = { ...languageModels };

// Debug: Log all available language models
console.log("Available language models:", Object.keys(originalLanguageModels));

export type modelID = keyof typeof languageModels;
export const defaultModel: modelID = "kimi-k2";

// Create a wrapper for the languageModel function
const getLanguageModel = (id: string) => {
  console.log(`Requested model ID: ${id}`);
  
  // Check if the model exists
  if (originalLanguageModels[id]) {
    console.log(`Found exact match for model: ${id}`);
    return originalLanguageModels[id];
  }
  
  // Special handling for Qwen models
  if (id.includes('qwen')) {
    // Look for any model that contains 'qwen'
    for (const [key, value] of Object.entries(originalLanguageModels)) {
      if (key.toLowerCase().includes('qwen')) {
        console.log(`Qwen model ${id} not found, using ${key} instead`);
        return value;
      }
    }
  }
  
  // Look for any model that contains this model name
  for (const [key, value] of Object.entries(originalLanguageModels)) {
    if (key.includes(id)) {
      console.log(`Found similar model: ${key}`);
      return value;
    }
  }
  
  // If we have any local models at all, use the first one
  const availableLocalModels = Object.entries(originalLanguageModels)
    .filter(([key]) => !key.startsWith('qwen') && !key.startsWith('grok') && !key.startsWith('kimi') && !key.startsWith('llama'));
  
  if (availableLocalModels.length > 0) {
    console.log(`No matching model found for ${id}, using available model ${availableLocalModels[0][0]}`);
    return availableLocalModels[0][1];
  }
  
  // If no matching model, use the default model
  console.log(`Model ${id} not found, using default model`);
  return originalLanguageModels[defaultModel];
};

// Debug: Log all active local models and their available models
console.log("Active local models with available models:", localModels.map(model => ({
  id: model.id,
  name: model.name,
  models: model.availableModels
})));

// Export the model with our custom provider
export const model = {
  languageModel: (id: string) => {
    // Use our model selection logic
    return getLanguageModel(id);
  }
};

export const MODELS = Object.keys(languageModels);