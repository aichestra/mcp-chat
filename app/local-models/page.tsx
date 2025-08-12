"use client";

import { useState, useEffect } from "react";
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
}

// Local storage key
const LOCAL_MODELS_STORAGE_KEY = "local-openai-models";

export default function LocalModelsPage() {
  const [localModels, setLocalModels] = useState<LocalModel[]>([]);
  const [view, setView] = useState<"list" | "add">("list");
  const [editingModelId, setEditingModelId] = useState<string | null>(null);
  const [newModel, setNewModel] = useState<Omit<LocalModel, "id" | "isActive">>({
    name: "",
    baseUrl: "",
    apiKey: "",
  });

  // Load local models from localStorage on initial mount
  useEffect(() => {
    const storedModels = localStorage.getItem(LOCAL_MODELS_STORAGE_KEY);
    if (storedModels) {
      try {
        setLocalModels(JSON.parse(storedModels));
      } catch (error) {
        console.error("Error parsing stored local models:", error);
        setLocalModels([]);
      }
    }
  }, []);

  // Save local models to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(LOCAL_MODELS_STORAGE_KEY, JSON.stringify(localModels));
  }, [localModels]);

  const addModel = () => {
    if (!newModel.name || !newModel.baseUrl) return;
    
    const id = `local-model-${Date.now()}`;
    const model: LocalModel = {
      id,
      ...newModel,
      isActive: false,
    };
    
    setLocalModels([...localModels, model]);
    setNewModel({ name: "", baseUrl: "", apiKey: "" });
    setView("list");
    toast.success("Local model added successfully");
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

  const updateModel = () => {
    if (!editingModelId || !newModel.name || !newModel.baseUrl) return;
    
    const updated = localModels.map(model =>
      model.id === editingModelId ? { 
        ...model, 
        name: newModel.name,
        baseUrl: newModel.baseUrl,
        apiKey: newModel.apiKey,
      } : model
    );
    setLocalModels(updated);
    setEditingModelId(null);
    setNewModel({ name: "", baseUrl: "", apiKey: "" });
    setView("list");
    toast.success("Local model updated successfully");
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
            <p className="text-2xl font-bold text-primary">{localModels.filter(model => model.isActive).length}</p>
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
                disabled={!newModel.name || !newModel.baseUrl}
              >
                {editingModelId ? "Save Changes" : "Add Endpoint"}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
