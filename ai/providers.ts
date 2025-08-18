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

// Create a mapping between model IDs and their endpoints
const modelEndpointMap: Record<string, { baseURL: string, apiKey?: string }> = {};

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

// Initialize with base models only
const languageModels: Record<string, any> = { ...baseLanguageModels };
export const modelDetails: Record<string, ModelInfo> = { ...baseModelDetails };

// Function to get all available models from the server
export const getAllModels = async (): Promise<{ models: any[], baseCount: number, localCount: number }> => {
  try {
    // TODO: Get actual userId from auth context
    const userId = 'default-user'; // Placeholder
    
    console.log('getAllModels: Fetching models from /api/models with userId:', userId);
    const response = await fetch(`/api/models?userId=${userId}`);
    console.log('getAllModels: Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('getAllModels: Fetched data from server:', data);
      console.log('getAllModels: Total models:', data.models?.length || 0);
      console.log('getAllModels: Base count:', data.baseCount || 0);
      console.log('getAllModels: Local count:', data.localCount || 0);
      
      if (data.models) {
        // Log all local models with their baseUrl
        const localModels = data.models.filter((model: any) => 
          model.provider !== 'Groq' && model.provider !== 'XAI');
        
        console.log('getAllModels: Local models count:', localModels.length);
        console.log('getAllModels: Local models with baseUrl:');
        
        localModels.forEach((model: any, index: number) => {
          console.log(`getAllModels: Local model ${index + 1}:`, {
            id: model.id,
            name: model.name,
            provider: model.provider,
            baseUrl: model.baseUrl || 'MISSING',
            hasBaseUrl: !!model.baseUrl
          });
        });
      }
      
      return data;
    } else {
      const errorText = await response.text();
      console.error('getAllModels: Failed to fetch models from server. Status:', response.status, 'Error:', errorText);
      return { models: [], baseCount: 0, localCount: 0 };
    }
  } catch (error) {
    console.error('getAllModels: Error fetching models from server:', error);
    return { models: [], baseCount: 0, localCount: 0 };
  }
};

// Function to refresh models from server
export const refreshModels = async () => {
  console.log('=== refreshModels FUNCTION CALLED ===');
  console.log('refreshModels: CALL STACK:', new Error().stack);
  console.log('refreshModels: CALL TIME:', new Date().toISOString());
  try {
    console.log('refreshModels: Starting refresh...');
    console.log('refreshModels: Current models before refresh:', Object.keys(languageModels));
    
    const { models } = await getAllModels();
    console.log('refreshModels: Got models from getAllModels:', models);
    
    // Clear existing models
    console.log('refreshModels: Clearing existing models...');
    Object.keys(languageModels).forEach(key => delete (languageModels as any)[key]);
    Object.keys(modelDetails).forEach(key => delete (modelDetails as any)[key]);
    
    // Clear model endpoint mapping
    console.log('refreshModels: Clearing model endpoint mapping...');
    Object.keys(modelEndpointMap).forEach(key => delete modelEndpointMap[key]);
    
    // Add base models first
    Object.assign(languageModels, baseLanguageModels);
    Object.assign(modelDetails, baseModelDetails);
    console.log('refreshModels: After clearing and adding base models:', Object.keys(languageModels));
    
    // Add local models
    let localModelCount = 0;
    console.log(`refreshModels: Processing ${models.length} models from API`);
    
    // First, register all endpoints in the modelEndpointMap
    models.forEach(model => {
      if (model.provider !== 'Groq' && model.provider !== 'XAI' && model.baseUrl) {
        const baseURL = model.baseUrl.endsWith('/v1') ? model.baseUrl : `${model.baseUrl}/v1`;
        console.log(`refreshModels: Registering endpoint for ${model.id}: ${baseURL}`);
        
        modelEndpointMap[model.id] = {
          baseURL,
          apiKey: model.apiKey
        };
      }
    });
    
    console.log('refreshModels: Registered endpoints:', Object.keys(modelEndpointMap));
    
    // Then create the language models
    models.forEach(model => {
      if (model.provider !== 'Groq' && model.provider !== 'XAI') {
        console.log(`refreshModels: Processing local model: ${model.id}`);
        
        if (modelEndpointMap[model.id]) {
          try {
            const baseURL = modelEndpointMap[model.id].baseURL;
            console.log(`refreshModels: Creating model ${model.id} with baseURL: ${baseURL}`);
            
            const localOpenAI = createOpenAI({
              apiKey: undefined,
              baseURL: baseURL,
            });
            
            languageModels[model.id] = withReasoning(localOpenAI(model.id));
            modelDetails[model.id] = {
              provider: model.provider,
              name: model.name,
              description: model.description || `Local model from ${model.provider}`,
              apiVersion: model.apiVersion || model.id,
              capabilities: model.capabilities || ["Local"]
            };
            
            localModelCount++;
            console.log(`refreshModels: Successfully registered local model: ${model.id}`);
          } catch (error) {
            console.error(`refreshModels: Error registering model ${model.id}:`, error);
          }
        } else {
          console.warn(`refreshModels: No endpoint information for ${model.id}`);
        }
      }
    });
    
    console.log(`refreshModels: Registration complete. Local models added: ${localModelCount}`);
    console.log('refreshModels: Final models list:', Object.keys(languageModels));
    console.log('refreshModels: Final modelDetails keys:', Object.keys(modelDetails));
    console.log('refreshModels: Final modelEndpointMap keys:', Object.keys(modelEndpointMap));
    
    // Notify clients that models changed
    if (typeof window !== 'undefined') {
      console.log('refreshModels: Dispatching local-models-updated event');
      window.dispatchEvent(new Event('local-models-updated'));
    }
  } catch (error) {
    console.error('refreshModels: Error refreshing models:', error);
  }
};

// Server-side only: ensure local models are registered before usage in API routes
export const refreshModelsServerSide = async (): Promise<void> => {
  if (typeof window !== 'undefined') {
    // Only intended for server-side usage
    return;
  }

  try {
    // Lazy import to avoid bundling server DB code into client
    const [{ db }, schema, orm] = await Promise.all([
      import("@/lib/db"),
      import("@/lib/db/schema"),
      import("drizzle-orm"),
    ]);

    const { localModels } = schema as any;
    const { eq } = orm as any;

    const userId = process.env.DEFAULT_USER_ID || 'default-user';

    const rows = await (db as any)
      .select()
      .from(localModels)
      .where(eq(localModels.userId, userId));

    // Clear existing local entries (keep base models)
    Object.keys(modelEndpointMap).forEach((key) => delete modelEndpointMap[key]);

    // Register endpoints and models
    for (const row of rows) {
      if (!row.isActive) continue;
      const baseURL = row.baseUrl?.endsWith('/v1') ? row.baseUrl : `${row.baseUrl}/v1`;

      if (Array.isArray(row.availableModels)) {
        for (const modelName of row.availableModels) {
          // Track endpoint for on-demand lookups
          modelEndpointMap[modelName] = { baseURL, apiKey: row.apiKey };

          // Create and register now
          try {
            const localOpenAI = createOpenAI({
              apiKey: row.apiKey || undefined,
              baseURL,
            });

            (languageModels as any)[modelName] = withReasoning(localOpenAI(modelName));
            (modelDetails as any)[modelName] = {
              provider: row.name || 'Local',
              name: modelName,
              description: `Local model from ${row.name} (${row.baseUrl})`,
              apiVersion: 'OpenAI-compatible',
              capabilities: ['Local', 'Reasoning', 'Code'],
            };
          } catch (e) {
            console.error(`Failed to register server-side local model ${modelName}:`, e);
          }
        }
      }
    }

    console.log('Server-side models ready:', Object.keys(languageModels));
  } catch (error) {
    console.error('refreshModelsServerSide error:', error);
  }
};

// Update API keys when localStorage changes (for runtime updates)
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    // Reload the page if any API key changed to refresh the providers
    if (event.key?.includes('API_KEY')) {
      window.location.reload();
    }
  });
}

// Debug: Log all available language models
console.log("Available language models (initial):", Object.keys(languageModels));

export type modelID = keyof typeof languageModels;
export const defaultModel: modelID = "kimi-k2";

// Create a wrapper for the languageModel function
const getLanguageModel = (id: string) => {
  console.log(`Requested model ID: ${id}`);
  console.log(`Available models: ${Object.keys(languageModels).join(', ')}`);
  console.log(`Available endpoints: ${Object.keys(modelEndpointMap).join(', ')}`);
  
  // Check if the model exists
  if ((languageModels as any)[id]) {
    console.log(`Found exact match for model: ${id}`);
    return (languageModels as any)[id];
  }
  
  // Check if we have endpoint information for this model
  if (modelEndpointMap[id]) {
    console.log(`Model ${id} not registered yet but we have endpoint info, creating on-demand`);
    console.log(`Endpoint for ${id}: ${modelEndpointMap[id].baseURL}`);
    
    try {
      // Create the client on-demand
      const localOpenAI = createOpenAI({
        apiKey: undefined,
        baseURL: modelEndpointMap[id].baseURL,
      });
      
      // Register the model
      const model = withReasoning(localOpenAI(id));
      (languageModels as any)[id] = model;
      
      // Also add to modelDetails if missing
      if (!modelDetails[id]) {
        modelDetails[id] = {
          provider: "Local",
          name: id,
          description: `Local model ${id}`,
          apiVersion: id,
          capabilities: ["Local"]
        };
      }
      
      console.log(`Successfully created on-demand model ${id} with endpoint ${modelEndpointMap[id].baseURL}`);
      return model;
    } catch (error) {
      console.error(`Error creating on-demand model ${id}:`, error);
    }
  } else {
    console.log(`No endpoint information found for model ${id}`);
  }
  
  // Special handling for Qwen models
  if (id.includes('qwen')) {
    // Look for any model that contains 'qwen'
    for (const [key, value] of Object.entries(languageModels)) {
      if (key.toLowerCase().includes('qwen')) {
        console.log(`Qwen model ${id} not found, using ${key} instead`);
        return value;
      }
    }
  }
  
  // Look for any model that contains this model name
  for (const [key, value] of Object.entries(languageModels)) {
    if (key.includes(id)) {
      console.log(`Found similar model: ${key}`);
      return value;
    }
  }
  
  // If we have any local models at all, use the first one
  const availableLocalModels = Object.entries(languageModels)
    .filter(([key]) => !key.startsWith('qwen') && !key.startsWith('grok') && !key.startsWith('kimi') && !key.startsWith('llama'));
  
  if (availableLocalModels.length > 0) {
    console.log(`No matching model found for ${id}, using available model ${availableLocalModels[0][0]}`);
    return availableLocalModels[0][1];
  }
  
  // If no matching model, use the default model
  console.log(`Model ${id} not found, using default model`);
  return (languageModels as any)[defaultModel];
};

// Debug: Log all available language models
console.log("Available language models (runtime):", Object.keys(languageModels));

// Export the model with our custom provider
export const model = {
  languageModel: (id: string) => {
    // Use our model selection logic
    return getLanguageModel(id);
  }
};

// Expose a getter for up-to-date model IDs
export const getModelIDs = (): string[] => {
  const modelIds = Object.keys(languageModels);
  console.log('getModelIDs: Returning model IDs:', modelIds);
  console.log('getModelIDs: Total count:', modelIds.length);
  return modelIds;
};

// Debug function to check if a model exists
const debugCheckModel = (id: string) => {
  console.log(`DEBUG CHECK MODEL: ${id}`);
  console.log(`Available models: ${Object.keys(languageModels).join(', ')}`);
  console.log(`Model exists in languageModels: ${!!languageModels[id]}`);
  console.log(`Model exists in modelDetails: ${!!modelDetails[id]}`);
  console.log(`Model exists in modelEndpointMap: ${!!modelEndpointMap[id]}`);
  
  if (modelEndpointMap[id]) {
    console.log(`Model endpoint: ${modelEndpointMap[id].baseURL}`);
  }
  
  // Try to create the model on-demand
  if (!languageModels[id] && modelEndpointMap[id]) {
    try {
      console.log(`Attempting to create model ${id} on-demand`);
      const localOpenAI = createOpenAI({
        apiKey: undefined,
        baseURL: modelEndpointMap[id].baseURL,
      });
      
      const model = withReasoning(localOpenAI(id));
      languageModels[id] = model;
      console.log(`Successfully created model ${id} on-demand`);
      return true;
    } catch (error) {
      console.error(`Failed to create model ${id} on-demand:`, error);
      return false;
    }
  }
  
  return !!languageModels[id];
};

// Make functions globally available for debugging
if (typeof window !== 'undefined') {
  (window as any).debugRefreshModels = refreshModels;
  (window as any).debugGetAllModels = getAllModels;
  (window as any).debugGetModelIDs = getModelIDs;
  (window as any).debugCheckModel = debugCheckModel;
  console.log('=== GLOBAL DEBUG FUNCTIONS ADDED ===');
  console.log('window.debugRefreshModels:', typeof (window as any).debugRefreshModels);
  console.log('window.debugGetAllModels:', typeof (window as any).debugGetAllModels);
  console.log('window.debugGetModelIDs:', typeof (window as any).debugGetModelIDs);
  console.log('window.debugCheckModel:', typeof (window as any).debugCheckModel);
}

// Made with Bob
