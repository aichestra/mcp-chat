import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

// Local model configuration
interface LocalModelConfig {
  name: string;
  key: string;
  storageKey: string;
  label: string;
  placeholder: string;
}

// Available local model configurations
const LOCAL_MODEL_CONFIG: LocalModelConfig[] = [
  {
    name: "Local Base URL",
    key: "local_base_url",
    storageKey: "LOCAL_OPENAI_BASE_URL",
    label: "Local OpenAI Base URL",
    placeholder: "http://localhost:11434/v1",
  },
  {
    name: "Local API Key",
    key: "local_api_key",
    storageKey: "LOCAL_OPENAI_API_KEY",
    label: "Local OpenAI API Key (optional)",
    placeholder: "leave empty if not required",
  },
];

interface LocalModelsManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LocalModelsManager({ open, onOpenChange }: LocalModelsManagerProps) {
  // State to store local model settings
  const [localSettings, setLocalSettings] = useState<Record<string, string>>({});

  // Load settings from localStorage on initial mount
  useEffect(() => {
    const storedSettings: Record<string, string> = {};

    LOCAL_MODEL_CONFIG.forEach((config) => {
      const value = localStorage.getItem(config.storageKey);
      if (value) {
        storedSettings[config.key] = value;
      }
    });

    setLocalSettings(storedSettings);
  }, []);

  // Update setting in state
  const handleSettingChange = (key: string, value: string) => {
    setLocalSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Save settings to localStorage
  const handleSaveSettings = () => {
    try {
      LOCAL_MODEL_CONFIG.forEach((config) => {
        const value = localSettings[config.key];

        if (value && value.trim()) {
          localStorage.setItem(config.storageKey, value.trim());
        } else {
          localStorage.removeItem(config.storageKey);
        }
      });

      toast.success("Local model settings saved successfully");
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving local model settings:", error);
      toast.error("Failed to save local model settings");
    }
  };

  // Clear all settings
  const handleClearSettings = () => {
    try {
      LOCAL_MODEL_CONFIG.forEach((config) => {
        localStorage.removeItem(config.storageKey);
      });

      setLocalSettings({});
      toast.success("Local model settings cleared");
    } catch (error) {
      console.error("Error clearing local model settings:", error);
      toast.error("Failed to clear local model settings");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Local Models Settings</DialogTitle>
          <DialogDescription>
            Configure your local AI models. Settings are stored
            securely in your browser's local storage.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {LOCAL_MODEL_CONFIG.map((config) => (
            <div key={config.key} className="grid gap-2">
              <Label htmlFor={config.key}>{config.label}</Label>
              <Input
                id={config.key}
                type={config.key === "local_base_url" ? "text" : "password"}
                value={localSettings[config.key] || ""}
                onChange={(e) => handleSettingChange(config.key, e.target.value)}
                placeholder={config.placeholder}
              />
            </div>
          ))}
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button variant="destructive" onClick={handleClearSettings}>
            Clear Settings
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSettings}>Save Settings</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Made with Bob
