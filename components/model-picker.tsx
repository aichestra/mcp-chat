"use client";

console.log('=== MODEL PICKER LOADING ===');
console.log('Model picker: About to import from providers...');

import {
  modelDetails,
  type modelID,
  defaultModel,
  refreshModels,
  getModelIDs,
} from "@/ai/providers";

console.log('Model picker: Imported refreshModels:', typeof refreshModels);
console.log('Model picker: Imported getModelIDs:', typeof getModelIDs);
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  Zap,
  Info,
  Bolt,
  Code,
  Brain,
  Lightbulb,
  Image as ImageIcon,
  Gauge,
  Rocket,
  Bot,
} from "lucide-react";
import { useState, useEffect } from "react";

interface ModelPickerProps {
  selectedModel: modelID;
  setSelectedModel: (model: modelID) => void;
}

export const ModelPicker = ({
  selectedModel,
  setSelectedModel,
}: ModelPickerProps) => {
  const [hoveredModel, setHoveredModel] = useState<modelID | null>(null);
  const [modelIds, setModelIds] = useState<string[]>(getModelIDs());

  // Debug log for initial model IDs
  console.log('Model picker: Initial model IDs:', modelIds);
  console.log('Model picker: Selected model:', selectedModel);
  console.log('Model picker: Is selected model in available models?', modelIds.includes(selectedModel));

  // Ensure we always have a valid model ID
  const validModelId = modelIds.includes(selectedModel)
    ? selectedModel
    : defaultModel;

  // If the selected model is invalid, update it to the default
  useEffect(() => {
    if (selectedModel !== validModelId) {
      console.log(`Model picker: Selected model ${selectedModel} is invalid, updating to ${validModelId}`);
      setSelectedModel(validModelId as modelID);
    }
  }, [selectedModel, validModelId, setSelectedModel]);

  // Keep local state in sync with provider registry
  useEffect(() => {
    const update = () => {
      const newModelIds = getModelIDs();
      console.log('Model picker: Event received, updating models:', newModelIds);
      console.log('Model picker: Total models available:', newModelIds.length);
      console.log('Model picker: Local models:', newModelIds.filter(id => !id.includes('qwen') && !id.includes('grok') && !id.includes('kimi') && !id.includes('llama')));
      setModelIds(newModelIds);
    };
    update();
    if (typeof window !== "undefined") {
      window.addEventListener("local-models-updated", update);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("local-models-updated", update);
      }
    };
  }, []);

  // Refresh models when component mounts - USE WORKING GLOBAL FUNCTION
  useEffect(() => {
    console.log('=== MODEL PICKER MOUNT EFFECT STARTED ===');
    console.log('Model picker: Component mounted, calling global refresh...');
    
    // Use the global function that we know works
    const executeRefresh = async () => {
      try {
        console.log('Model picker: Calling global debugRefreshModels...');
        
        // Check if the global function exists
        if (typeof (window as any).debugRefreshModels === 'function') {
          await (window as any).debugRefreshModels();
          console.log('✅ Model picker: Global refresh completed successfully');
          
          // Force update the model list
          const updatedModels = getModelIDs();
          console.log('Model picker: Updated models after refresh:', updatedModels);
          console.log('Model picker: Is gpt-oss:20b in updated models?', updatedModels.includes('gpt-oss:20b'));
          setModelIds(updatedModels);
          
          // Dispatch event to notify other components
          window.dispatchEvent(new Event('local-models-updated'));
        } else {
          console.error('❌ Model picker: Global debugRefreshModels not available');
        }
      } catch (error) {
        console.error('❌ Model picker: Global refresh failed:', error);
        
        // Retry after 2 seconds
        setTimeout(() => {
          console.log('Model picker: Retrying global refresh...');
          executeRefresh();
        }, 2000);
      }
    };
    
    // Execute immediately
    executeRefresh();
    
    // Also set up a backup timer
    const backupTimer = setTimeout(() => {
      console.log('Model picker: Backup timer triggered, forcing global refresh...');
      executeRefresh();
    }, 3000);
    
    return () => {
      console.log('Model picker: Cleanup function called, clearing backup timer');
      clearTimeout(backupTimer);
    };
  }, []);

  // Function to get the appropriate icon for each provider
  const getProviderIcon = (provider: string) => {
    switch (provider.toLowerCase()) {
      case "anthropic":
        return <Sparkles className="h-3 w-3 text-orange-600" />;
      case "openai":
        return <Zap className="h-3 w-3 text-green-500" />;
      case "google":
        return <Zap className="h-3 w-3 text-red-500" />;
      case "groq":
        return <Sparkles className="h-3 w-3 text-blue-500" />;
      case "xai":
        return <Sparkles className="h-3 w-3 text-yellow-500" />;
      default:
        return <Info className="h-3 w-3 text-blue-500" />;
    }
  };

  // Function to get capability icon
  const getCapabilityIcon = (capability: string) => {
    switch (capability.toLowerCase()) {
      case "code":
        return <Code className="h-2.5 w-2.5" />;
      case "reasoning":
        return <Brain className="h-2.5 w-2.5" />;
      case "research":
        return <Lightbulb className="h-2.5 w-2.5" />;
      case "vision":
        return <ImageIcon className="h-2.5 w-2.5" />;
      case "fast":
      case "rapid":
        return <Bolt className="h-2.5 w-2.5" />;
      case "efficient":
      case "compact":
        return <Gauge className="h-2.5 w-2.5" />;
      case "creative":
      case "balance":
        return <Rocket className="h-2.5 w-2.5" />;
      case "agentic":
        return <Bot className="h-2.5 w-2.5" />;
      default:
        return <Info className="h-2.5 w-2.5" />;
    }
  };

  // Get capability badge color
  const getCapabilityColor = (capability: string) => {
    switch (capability.toLowerCase()) {
      case "code":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case "reasoning":
      case "research":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
      case "vision":
        return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300";
      case "fast":
      case "rapid":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
      case "efficient":
      case "compact":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300";
      case "creative":
      case "balance":
        return "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300";
      case "agentic":
        return "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  // Get current model details to display
  const displayModelId = hoveredModel || validModelId;
  const currentModelDetails = modelDetails[displayModelId];

  // Handle model change
  const handleModelChange = (modelId: string) => {
    console.log(`Model picker: Model change requested to ${modelId}`);
    console.log(`Model picker: Available models:`, modelIds);
    console.log(`Model picker: Is requested model available?`, modelIds.includes(modelId));
    
    if (modelIds.includes(modelId)) {
      const typedModelId = modelId as modelID;
      console.log(`Model picker: Setting selected model to ${typedModelId}`);
      setSelectedModel(typedModelId);
    } else {
      console.warn(`Model picker: Requested model ${modelId} is not available`);
    }
  };

  return (
    <div className="absolute bottom-2 left-2 z-10">
      <Select
        value={validModelId}
        onValueChange={handleModelChange}
        defaultValue={validModelId}
      >
        <SelectTrigger className="max-w-[200px] sm:max-w-fit sm:w-56 px-2 sm:px-3 h-8 sm:h-9 rounded-full group border-primary/20 bg-primary/5 hover:bg-primary/10 dark:bg-primary/10 dark:hover:bg-primary/20 transition-all duration-200 ring-offset-background focus:ring-2 focus:ring-primary/30 focus:ring-offset-2">
          <SelectValue
            placeholder="Select model"
            className="text-xs font-medium flex items-center gap-1 sm:gap-2 text-primary dark:text-primary-foreground"
          >
            <div className="flex items-center gap-1 sm:gap-2">
              {getProviderIcon(modelDetails[validModelId].provider)}
              <span className="font-medium truncate">
                {modelDetails[validModelId].name}
              </span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent
          align="start"
          className="bg-background/95 dark:bg-muted/95 backdrop-blur-sm border-border/80 rounded-lg overflow-hidden p-0 w-[280px] sm:w-[350px] md:w-[515px]"
        >
          <div className="flex flex-col items-start">
            {/* Model selector column */}
            <div className="bg-muted/20 p-0 pr-1">
              <SelectGroup className="space-y-1">
                {modelIds.map((id) => {
                  const modelId = id as modelID;
                  return (
                    <SelectItem
                      key={id}
                      value={id}
                      onMouseEnter={() => setHoveredModel(modelId)}
                      onMouseLeave={() => setHoveredModel(null)}
                      className={cn(
                        "!px-2 sm:!px-3 py-1.5 sm:py-2 cursor-pointer rounded-md text-xs transition-colors duration-150",
                        "hover:bg-primary/5 hover:text-primary-foreground",
                        "focus:bg-primary/10 focus:text-primary focus:outline-none",
                        "data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary",
                        validModelId === id &&
                          "!bg-primary/15 !text-primary font-medium"
                      )}
                    >
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          {getProviderIcon(modelDetails[modelId].provider)}
                          <span className="font-medium truncate">
                            {modelDetails[modelId].name}
                          </span>
                        </div>
                        <span className="text-[10px] sm:text-xs text-muted-foreground">
                          {modelDetails[modelId].provider}
                        </span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectGroup>
            </div>

            {/* Model details column - hidden on smallest screens, visible on sm+ */}
            <div className="sm:block hidden p-2 sm:p-3 md:p-4 border-t border-border/30">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {getProviderIcon(currentModelDetails.provider)}
                  <h3 className="text-sm font-semibold">
                    {currentModelDetails.name}
                  </h3>
                </div>
                <div className="text-xs text-muted-foreground mb-1">
                  Provider:{" "}
                  <span className="font-medium">
                    {currentModelDetails.provider}
                  </span>
                </div>

                {/* Capability badges */}
                <div className="flex flex-wrap gap-1 mt-2 mb-3">
                  {currentModelDetails.capabilities.map((capability) => (
                    <span
                      key={capability}
                      className={cn(
                        "inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full font-medium",
                        getCapabilityColor(capability)
                      )}
                    >
                      {getCapabilityIcon(capability)}
                      <span>{capability}</span>
                    </span>
                  ))}
                </div>

                <div className="text-xs text-foreground/90 leading-relaxed mb-3 hidden md:block">
                  {currentModelDetails.description}
                </div>
              </div>

              <div className="bg-muted/40 rounded-md p-2 hidden md:block">
                <div className="text-[10px] text-muted-foreground flex justify-between items-center">
                  <span>API Version:</span>
                  <code className="bg-background/80 px-2 py-0.5 rounded text-[10px] font-mono">
                    {currentModelDetails.apiVersion}
                  </code>
                </div>
              </div>
            </div>

            {/* Condensed model details for mobile only */}
            <div className="p-3 sm:hidden border-t border-border/30">
              <div className="flex flex-wrap gap-1 mb-2">
                {currentModelDetails.capabilities
                  .slice(0, 4)
                  .map((capability) => (
                    <span
                      key={capability}
                      className={cn(
                        "inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full font-medium",
                        getCapabilityColor(capability)
                      )}
                    >
                      {getCapabilityIcon(capability)}
                      <span>{capability}</span>
                    </span>
                  ))}
                {currentModelDetails.capabilities.length > 4 && (
                  <span className="text-[10px] text-muted-foreground">
                    +{currentModelDetails.capabilities.length - 4} more
                  </span>
                )}
              </div>
            </div>
          </div>
        </SelectContent>
      </Select>
    </div>
  );
};

// Made with Bob
