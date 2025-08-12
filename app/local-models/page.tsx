"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PlusCircle,
  X,
  Globe,
  Trash2,
  CheckCircle,
  Plus,
  Edit2,
} from "lucide-react";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Local model configuration
interface LocalModel {
  id: string;
  name: string;
  baseUrl: string;
  apiKey?: string;
  isActive: boolean;
  availableModels?: string[];
}

// Ollama model response type
interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

interface OllamaModelsResponse {
  models: OllamaModel[];
}

// Local storage key
const LOCAL_MODELS_STORAGE_KEY = "local-openai-models";

export default function LocalModelsPage() {
  // Initialize state from localStorage if available
  const [localModels, setLocalModels] = useState<LocalModel[]>(() => {
    // This function only runs on the client during initial render
    if (typeof window !== 'undefined') {
      const storedModels = localStorage.getItem(LOCAL_MODELS_STORAGE_KEY);
      if (storedModels) {
        try {
          return JSON.parse(storedModels);
        } catch (error) {
          console.error("Error parsing stored local models:", error);
        }
      }
    }
    return [];
  });
  const [view, setView] = useState<"list" | "add">("list");
  const [editingModelId, setEditingModelId] = useState<string | null>(null);
  const [newModel, setNewModel] = useState<Omit<LocalModel, "id" | "isActive">>({
    name: "",
    baseUrl: "",
    apiKey: "",
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Function to fetch available models from an Ollama endpoint
  const fetchOllamaModels = useCallback(async (baseUrl: string, apiKey?: string): Promise<string[]> => {
    try {
      // Extract the base URL without the /v1 suffix
      const baseApiUrl = baseUrl.replace(/\/v1\/?$/, '');
      
      // Try different API endpoints based on the server type
      // First try Ollama's API
      try {
        const ollamaUrl = `${baseApiUrl}/api/tags`;
        
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };
        
        if (apiKey) {
          headers['Authorization'] = `Bearer ${apiKey}`;
        }
        
        const response = await fetch(ollamaUrl, { headers });
        
        if (response.ok) {
          const data: OllamaModelsResponse = await response.json();
          return data.models.map(model => model.name);
        }
      } catch (ollamaError) {
        console.log('Not an Ollama endpoint or error:', ollamaError);
      }
      
      // If Ollama API fails, try OpenAI compatible API
      try {
        const openaiUrl = `${baseApiUrl}/models`;
        
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };
        
        if (apiKey) {
          headers['Authorization'] = `Bearer ${apiKey}`;
        }
        
        const response = await fetch(openaiUrl, { headers });
        
        if (response.ok) {
          const data = await response.json();
          if (data.data && Array.isArray(data.data)) {
            return data.data.map((model: any) => model.id || model.name);
          }
        }
      } catch (openaiError) {
        console.log('Not an OpenAI compatible endpoint or error:', openaiError);
      }
      
      // If we can't detect models, just add a default one based on the endpoint
      return ['default'];
    } catch (error) {
      console.error('Error fetching models:', error);
      return ['default']; // Return a default model name so we have something to work with
    }
  }, []);

  // No need to load from localStorage on mount since we're initializing from localStorage

  // Save local models to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(LOCAL_MODELS_STORAGE_KEY, JSON.stringify(localModels));
  }, [localModels]);

  // Function to refresh available models for a specific model
  const refreshAvailableModels = async (modelId: string) => {
    const model = localModels.find(m => m.id === modelId);
    if (!model) return;

    setIsLoading(true);
    setFetchError(null);
    
    try {
      const models = await fetchOllamaModels(model.baseUrl, model.apiKey);
      
      // Update the model with available models
      setLocalModels(localModels.map(m =>
        m.id === modelId ? { ...m, availableModels: models } : m
      ));
      
      if (models.length === 0) {
        toast.warning("No models found at this endpoint");
      } else {
        toast.success(`Found ${models.length} models`);
      }
    } catch (error) {
      console.error("Error fetching models:", error);
      setFetchError(error instanceof Error ? error.message : "Unknown error");
      toast.error("Failed to fetch models");
    } finally {
      setIsLoading(false);
    }
  };

  const addModel = async () => {
    if (!newModel.name || !newModel.baseUrl) return;
    
    const id = `local-model-${Date.now()}`;
    const model: LocalModel = {
      id,
      ...newModel,
      isActive: false,
    };
    
    // Add the model first
    const updatedModels = [...localModels, model];
    setLocalModels(updatedModels);
    
    // Then try to fetch available models
    setIsLoading(true);
    try {
      const availableModels = await fetchOllamaModels(model.baseUrl, model.apiKey);
      
      // Update the model with available models
      setLocalModels(updatedModels.map(m =>
        m.id === id ? { ...m, availableModels } : m
      ));
      
      if (availableModels.length === 0) {
        toast.warning("Added endpoint, but no models were found");
      } else {
        toast.success(`Added endpoint with ${availableModels.length} models`);
      }
    } catch (error) {
      console.error("Error fetching models:", error);
      toast.warning("Added endpoint, but couldn't fetch models");
    } finally {
      setIsLoading(false);
      setNewModel({ name: "", baseUrl: "", apiKey: "" });
      setView("list");
    }
  };

  const removeModel = (id: string) => {
    setLocalModels(localModels.filter(model => model.id !== id));
    toast.success("Local model removed");
  };

  const toggleModelActive = (id: string) => {
    setLocalModels(localModels.map(model => 
      model.id === id ? { ...model, isActive: !model.isActive } : model
    ));
  };

  const startEditing = (model: LocalModel) => {
    setEditingModelId(model.id);
    setNewModel({
      name: model.name,
      baseUrl: model.baseUrl,
      apiKey: model.apiKey || "",
    });
    setView("add");
  };

  const updateModel = async () => {
    if (!editingModelId || !newModel.name || !newModel.baseUrl) return;
    
    // First update the model
    const updated = localModels.map(model =>
      model.id === editingModelId ? {
        ...model,
        name: newModel.name,
        baseUrl: newModel.baseUrl,
        apiKey: newModel.apiKey,
      } : model
    );
    setLocalModels(updated);
    
    // Then try to fetch available models if the URL or API key changed
    const originalModel = localModels.find(m => m.id === editingModelId);
    if (originalModel &&
        (originalModel.baseUrl !== newModel.baseUrl ||
         originalModel.apiKey !== newModel.apiKey)) {
      
      setIsLoading(true);
      try {
        const availableModels = await fetchOllamaModels(newModel.baseUrl, newModel.apiKey);
        
        // Update the model with available models
        setLocalModels(updated.map(m =>
          m.id === editingModelId ? { ...m, availableModels } : m
        ));
        
        if (availableModels.length === 0) {
          toast.warning("Updated endpoint, but no models were found");
        } else {
          toast.success(`Updated endpoint with ${availableModels.length} models`);
        }
      } catch (error) {
        console.error("Error fetching models:", error);
        toast.warning("Updated endpoint, but couldn't fetch models");
      } finally {
        setIsLoading(false);
      }
    } else {
      toast.success("Local model updated successfully");
    }
    
    setEditingModelId(null);
    setNewModel({ name: "", baseUrl: "", apiKey: "" });
    setView("list");
  };

  const handleFormCancel = () => {
    setView("list");
    setEditingModelId(null);
    setNewModel({ name: "", baseUrl: "", apiKey: "" });
  };

  return (
    <div className="flex-1 flex flex-col h-full w-full">
      {/* Header */}
      <div className="border-b border-border p-4 sm:p-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between pl-12 sm:pl-16">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Local OpenAI Compatible API Endpoints Management</h1>
            <p className="text-muted-foreground mt-1">
              Configure your local OpenAI-compatible API endpoints for use with local models
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Active endpoints</p>
            <p className="text-2xl font-bold text-primary">
              {typeof window !== 'undefined' ? localModels.filter(model => model.isActive).length : 0}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col min-h-0">
        {view === "list" ? (
          <div className="flex-1 p-3 sm:p-4 lg:p-6 overflow-auto">
            {localModels.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4 auto-rows-fr">
                {localModels.map((model) => (
                  <div
                    key={model.id}
                    className={`relative flex flex-col p-3 sm:p-4 rounded-xl transition-all duration-200 border min-h-[180px] sm:min-h-[200px] hover:shadow-md ${
                      model.isActive
                        ? "border-primary bg-primary/10 shadow-primary/20"
                        : "border-border hover:border-primary/30 hover:bg-primary/5"
                    }`}
                  >
                    {/* Model Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <h4 className="text-sm font-medium truncate">
                          {model.name}
                        </h4>
                      </div>
                    </div>
                    
                    {/* Model URL */}
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2 leading-relaxed">
                      {model.baseUrl}
                    </p>
                    
                    {/* Model Status */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-2 h-2 rounded-full ${
                        model.isActive
                          ? "bg-green-500 animate-pulse"
                          : "bg-gray-400"
                      }`} />
                      <span className="text-xs text-muted-foreground font-medium">
                        {model.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>

                    {/* Available Models */}
                    {model.availableModels && model.availableModels.length > 0 && (
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-muted-foreground">Available Models</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              refreshAvailableModels(model.id);
                            }}
                            className="p-1 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                            title="Refresh models"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                              <path d="M21 3v5h-5" />
                              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                              <path d="M3 21v-5h5" />
                            </svg>
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                          {model.availableModels.map((modelName) => (
                            <span
                              key={modelName}
                              className="inline-flex items-center text-[9px] px-1.5 py-0.5 rounded-full font-medium bg-primary/10 text-primary"
                            >
                              {modelName}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 mb-3">
                      <Button
                        size="sm"
                        variant={model.isActive ? "default" : "outline"}
                        onClick={() => toggleModelActive(model.id)}
                        className="flex-1 gap-1.5 text-xs h-8"
                      >
                        {model.isActive && (
                          <CheckCircle className="h-3 w-3" />
                        )}
                        {model.isActive ? "Active" : "Enable"}
                      </Button>
                    </div>
                    
                    {/* Model Actions */}
                    <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/20">
                      <button
                        onClick={() => startEditing(model)}
                        className="p-1.5 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                        title="Edit model"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => removeModel(model.id)}
                        className="p-1.5 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-red-400 transition-colors"
                        title="Remove model"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center space-y-4 py-12">
                <Globe className="h-16 w-16 text-muted-foreground mx-auto" />
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-foreground">No local models configured</h3>
                  <p className="text-muted-foreground">Add your first local OpenAI-compatible API endpoint</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="model-name">Model Name</Label>
                  <Input
                    id="model-name"
                    value={newModel.name}
                    onChange={(e) =>
                      setNewModel({ ...newModel, name: e.target.value })
                    }
                    placeholder="My Local LLM"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model-url">Base URL</Label>
                  <Input
                    id="model-url"
                    value={newModel.baseUrl}
                    onChange={(e) =>
                      setNewModel({ ...newModel, baseUrl: e.target.value })
                    }
                    placeholder="http://localhost:11434/v1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model-api-key">API Key (optional)</Label>
                  <Input
                    id="model-api-key"
                    type="password"
                    value={newModel.apiKey}
                    onChange={(e) =>
                      setNewModel({ ...newModel, apiKey: e.target.value })
                    }
                    placeholder="Leave empty if not required"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Footer buttons */}
        <div className="border-t border-border p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex justify-between">
          {view === "list" ? (
            <>
              <div></div> {/* Empty div for spacing */}
              <Button
                onClick={() => setView("add")}
                size="sm"
                className="gap-1.5"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                Add Endpoint
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleFormCancel}>
                Cancel
              </Button>
              <Button
                onClick={editingModelId ? updateModel : addModel}
                disabled={!newModel.name || !newModel.baseUrl || isLoading}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {editingModelId ? "Saving..." : "Adding..."}
                  </>
                ) : (
                  editingModelId ? "Save Changes" : "Add Endpoint"
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
