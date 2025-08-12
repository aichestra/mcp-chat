"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  PlusCircle,
  ServerIcon,
  X,
  Globe,
  ExternalLink,
  Trash2,
  CheckCircle,
  Plus,
  Cog,
  Edit2,
  Eye,
  EyeOff,
  AlertTriangle,
  RefreshCw,
  Power,
} from "lucide-react";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";
import {
  KeyValuePair,
  MCPServer,
  ServerStatus,
  useMCP,
  MCPTool,
} from "@/lib/context/mcp-context";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

// Default template for a new MCP server
const INITIAL_NEW_SERVER: Omit<MCPServer, "id"> = {
  name: "",
  url: "",
  type: "sse",
  command: "",
  args: [],
  env: [],
  headers: [],
};

interface MCPServerManagerProps {
  servers: MCPServer[];
  onServersChange: (servers: MCPServer[]) => void;
  selectedServers: string[];
  onSelectedServersChange: (serverIds: string[]) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant?: "modal" | "full-panel";
}

// Check if a key name might contain sensitive information
const isSensitiveKey = (key: string): boolean => {
  const sensitivePatterns = [
    /key/i,
    /token/i,
    /secret/i,
    /password/i,
    /pass/i,
    /auth/i,
    /credential/i,
  ];
  return sensitivePatterns.some((pattern) => pattern.test(key));
};

// Mask a sensitive value
const maskValue = (value: string): string => {
  if (!value) return "";
  if (value.length < 8) return "••••••";
  return (
    value.substring(0, 3) +
    "•".repeat(Math.min(10, value.length - 4)) +
    value.substring(value.length - 1)
  );
};

// Update the StatusIndicator to use Tooltip component
const StatusIndicator = ({
  status,
  onClick,
  hoverInfo,
}: {
  status?: ServerStatus;
  onClick?: () => void;
  hoverInfo?: string;
}) => {
  const isClickable = !!onClick;
  const hasHoverInfo = !!hoverInfo;

  const className = `flex-shrink-0 flex items-center gap-1 ${
    isClickable ? "cursor-pointer" : ""
  }`;

  const statusIndicator = (status: ServerStatus | undefined) => {
    switch (status) {
      case "connected":
        return (
          <div className={className} onClick={onClick}>
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-green-500 hover:underline">
              Connected
            </span>
          </div>
        );
      case "connecting":
        return (
          <div className={className} onClick={onClick}>
            <RefreshCw className="w-3 h-3 text-amber-500 animate-spin" />
            <span className="text-xs text-amber-500">Connecting</span>
          </div>
        );
      case "error":
        return (
          <div className={className} onClick={onClick}>
            <AlertTriangle className="w-3 h-3 text-red-500" />
            <span className="text-xs text-red-500 hover:underline">Error</span>
          </div>
        );
      case "disconnected":
      default:
        return (
          <div className={className} onClick={onClick}>
            <div className="w-2 h-2 rounded-full bg-gray-400" />
            <span className="text-xs text-muted-foreground">Disconnected</span>
          </div>
        );
    }
  };

  // Use Tooltip if we have hover info
  if (hasHoverInfo) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{statusIndicator(status)}</TooltipTrigger>
        <TooltipContent
          side="top"
          align="center"
          className="max-w-[300px] break-all text-wrap"
        >
          {hoverInfo}
        </TooltipContent>
      </Tooltip>
    );
  }

  // Otherwise just return the status indicator
  return statusIndicator(status);
};

// Add a component to display tools
const ToolsList = ({ tools }: { tools?: MCPTool[] }) => {
  if (!tools || tools.length === 0) {
    return (
      <div className="text-xs text-muted-foreground italic">
        No tools available
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-muted-foreground mb-1">
        Tools ({tools.length}):
      </div>
      <div className="flex flex-wrap gap-1">
        {tools.slice(0, 3).map((tool, index) => (
          <TooltipProvider key={index}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-secondary text-secondary-foreground cursor-help">
                  {tool.name}
                </span>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                align="start"
                className="max-w-[250px]"
              >
                <div className="space-y-1">
                  <div className="font-medium">{tool.name}</div>
                  {tool.description && (
                    <div className="text-xs text-muted-foreground">
                      {tool.description}
                    </div>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
        {tools.length > 3 && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">
            +{tools.length - 3} more
          </span>
        )}
      </div>
    </div>
  );
};

export const MCPServerManager = ({
  servers,
  onServersChange,
  selectedServers,
  onSelectedServersChange,
  open,
  onOpenChange,
  variant = "modal",
}: MCPServerManagerProps) => {
  const [newServer, setNewServer] =
    useState<Omit<MCPServer, "id">>(INITIAL_NEW_SERVER);
  const [view, setView] = useState<"list" | "add">("list");
  const [newEnvVar, setNewEnvVar] = useState<KeyValuePair>({
    key: "",
    value: "",
  });
  const [newHeader, setNewHeader] = useState<KeyValuePair>({
    key: "",
    value: "",
  });
  const [editingServerId, setEditingServerId] = useState<string | null>(null);
  const [showSensitiveEnvValues, setShowSensitiveEnvValues] = useState<
    Record<number, boolean>
  >({});
  const [showSensitiveHeaderValues, setShowSensitiveHeaderValues] = useState<
    Record<number, boolean>
  >({});
  const [editingEnvIndex, setEditingEnvIndex] = useState<number | null>(null);
  const [editingHeaderIndex, setEditingHeaderIndex] = useState<number | null>(
    null
  );
  const [editedEnvValue, setEditedEnvValue] = useState<string>("");
  const [editedHeaderValue, setEditedHeaderValue] = useState<string>("");

  // Add access to the MCP context for server control
  const { startServer, stopServer, updateServerStatus } = useMCP();

  const resetAndClose = () => {
    setView("list");
    setNewServer(INITIAL_NEW_SERVER);
    setNewEnvVar({ key: "", value: "" });
    setNewHeader({ key: "", value: "" });
    setShowSensitiveEnvValues({});
    setShowSensitiveHeaderValues({});
    setEditingEnvIndex(null);
    setEditingHeaderIndex(null);
    onOpenChange(false);
  };

  const addServer = () => {
    if (!newServer.name) {
      toast.error("Server name is required");
      return;
    }

    if (!newServer.url) {
      toast.error("Server URL is required");
      return;
    }

    const id = crypto.randomUUID();
    const updatedServers = [...servers, { ...newServer, id }];
    onServersChange(updatedServers);

    toast.success(`Added MCP server: ${newServer.name}`);
    setView("list");
    setNewServer(INITIAL_NEW_SERVER);
    setNewEnvVar({ key: "", value: "" });
    setNewHeader({ key: "", value: "" });
    setShowSensitiveEnvValues({});
    setShowSensitiveHeaderValues({});
  };

  const removeServer = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedServers = servers.filter((server) => server.id !== id);
    onServersChange(updatedServers);

    // If the removed server was selected, remove it from selected servers
    if (selectedServers.includes(id)) {
      onSelectedServersChange(
        selectedServers.filter((serverId) => serverId !== id)
      );
    }

    toast.success("Server removed");
  };

  const toggleServer = (id: string) => {
    if (selectedServers.includes(id)) {
      // Remove from selected servers but DON'T stop the server
      onSelectedServersChange(
        selectedServers.filter((serverId) => serverId !== id)
      );
      const server = servers.find((s) => s.id === id);

      if (server) {
        toast.success(`Disabled MCP server: ${server.name}`);
      }
    } else {
      // Add to selected servers
      onSelectedServersChange([...selectedServers, id]);
      const server = servers.find((s) => s.id === id);

      if (server) {
        // Auto-start the server if it's disconnected
        if (
          !server.status ||
          server.status === "disconnected" ||
          server.status === "error"
        ) {
          updateServerStatus(server.id, "connecting");
          startServer(id)
            .then((success) => {
              if (success) {
                console.log(`Server ${server.name} successfully connected`);
              } else {
                console.error(`Failed to connect server ${server.name}`);
              }
            })
            .catch((error) => {
              console.error(`Error connecting server ${server.name}:`, error);
              updateServerStatus(
                server.id,
                "error",
                `Failed to connect: ${
                  error instanceof Error ? error.message : String(error)
                }`
              );
            });
        }

        toast.success(`Enabled MCP server: ${server.name}`);
      }
    }
  };

  const clearAllServers = () => {
    if (selectedServers.length > 0) {
      // Just deselect all servers without stopping them
      onSelectedServersChange([]);
      toast.success("All MCP servers disabled");
      resetAndClose();
    }
  };

  const addEnvVar = () => {
    if (!newEnvVar.key) return;

    setNewServer({
      ...newServer,
      env: [...(newServer.env || []), { ...newEnvVar }],
    });

    setNewEnvVar({ key: "", value: "" });
  };

  const removeEnvVar = (index: number) => {
    const updatedEnv = [...(newServer.env || [])];
    updatedEnv.splice(index, 1);
    setNewServer({ ...newServer, env: updatedEnv });

    // Clean up visibility state for this index
    const updatedVisibility = { ...showSensitiveEnvValues };
    delete updatedVisibility[index];
    setShowSensitiveEnvValues(updatedVisibility);

    // If currently editing this value, cancel editing
    if (editingEnvIndex === index) {
      setEditingEnvIndex(null);
    }
  };

  const startEditEnvValue = (index: number, value: string) => {
    setEditingEnvIndex(index);
    setEditedEnvValue(value);
  };

  const saveEditedEnvValue = () => {
    if (editingEnvIndex !== null) {
      const updatedEnv = [...(newServer.env || [])];
      updatedEnv[editingEnvIndex] = {
        ...updatedEnv[editingEnvIndex],
        value: editedEnvValue,
      };
      setNewServer({ ...newServer, env: updatedEnv });
      setEditingEnvIndex(null);
    }
  };

  const addHeader = () => {
    if (!newHeader.key) return;
    const updatedHeaders = [...(newServer.headers || [])];
    updatedHeaders.push(newHeader);
    setNewServer({ ...newServer, headers: updatedHeaders });
    setNewHeader({ key: "", value: "" });
  };

  const updateEnvVar = (index: number, field: "key" | "value", value: string) => {
    const updatedEnv = [...(newServer.env || [])];
    updatedEnv[index] = { ...updatedEnv[index], [field]: value };
    setNewServer({ ...newServer, env: updatedEnv });
  };

  const updateHeader = (index: number, field: "key" | "value", value: string) => {
    const updatedHeaders = [...(newServer.headers || [])];
    updatedHeaders[index] = { ...updatedHeaders[index], [field]: value };
    setNewServer({ ...newServer, headers: updatedHeaders });
  };

  const removeHeader = (index: number) => {
    const updatedHeaders = [...(newServer.headers || [])];
    updatedHeaders.splice(index, 1);
    setNewServer({ ...newServer, headers: updatedHeaders });

    // Clean up visibility state for this index
    const updatedVisibility = { ...showSensitiveHeaderValues };
    delete updatedVisibility[index];
    setShowSensitiveHeaderValues(updatedVisibility);

    // If currently editing this value, cancel editing
    if (editingHeaderIndex === index) {
      setEditingHeaderIndex(null);
    }
  };

  const startEditHeaderValue = (index: number, value: string) => {
    setEditingHeaderIndex(index);
    setEditedHeaderValue(value);
  };

  const saveEditedHeaderValue = () => {
    if (editingHeaderIndex !== null) {
      const updatedHeaders = [...(newServer.headers || [])];
      updatedHeaders[editingHeaderIndex] = {
        ...updatedHeaders[editingHeaderIndex],
        value: editedHeaderValue,
      };
      setNewServer({ ...newServer, headers: updatedHeaders });
      setEditingHeaderIndex(null);
    }
  };

  const toggleSensitiveEnvValue = (index: number) => {
    setShowSensitiveEnvValues((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const toggleSensitiveHeaderValue = (index: number) => {
    setShowSensitiveHeaderValues((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const hasAdvancedConfig = (server: MCPServer) => {
    return (
      (server.env && server.env.length > 0) ||
      (server.headers && server.headers.length > 0)
    );
  };

  // Editing support
  const startEditing = (server: MCPServer) => {
    setEditingServerId(server.id);
    setNewServer({
      name: server.name,
      url: server.url,
      type: server.type,
      command: server.command,
      args: server.args,
      env: server.env,
      headers: server.headers,
    });
    setView("add");
    // Reset sensitive value visibility states
    setShowSensitiveEnvValues({});
    setShowSensitiveHeaderValues({});
    setEditingEnvIndex(null);
    setEditingHeaderIndex(null);
  };

  const handleFormCancel = () => {
    if (view === "add") {
      setView("list");
      setEditingServerId(null);
      setNewServer(INITIAL_NEW_SERVER);
      setShowSensitiveEnvValues({});
      setShowSensitiveHeaderValues({});
      setEditingEnvIndex(null);
      setEditingHeaderIndex(null);
    } else {
      resetAndClose();
    }
  };

  const updateServer = () => {
    if (!newServer.name) {
      toast.error("Server name is required");
      return;
    }
    if (!newServer.url) {
      toast.error("Server URL is required");
      return;
    }
    const updated = servers.map((s) =>
      s.id === editingServerId ? { ...newServer, id: editingServerId! } : s
    );
    onServersChange(updated);
    toast.success(`Updated MCP server: ${newServer.name}`);
    setView("list");
    setEditingServerId(null);
    setNewServer(INITIAL_NEW_SERVER);
    setShowSensitiveEnvValues({});
    setShowSensitiveHeaderValues({});
  };

  // Update functions to control servers
  const toggleServerStatus = async (server: MCPServer, e: React.MouseEvent) => {
    e.stopPropagation();

    if (
      !server.status ||
      server.status === "disconnected" ||
      server.status === "error"
    ) {
      try {
        updateServerStatus(server.id, "connecting");
        const success = await startServer(server.id);

        if (success) {
          toast.success(`Started server: ${server.name}`);
        } else {
          toast.error(`Failed to start server: ${server.name}`);
        }
      } catch (error) {
        updateServerStatus(
          server.id,
          "error",
          `Error: ${error instanceof Error ? error.message : String(error)}`
        );
        toast.error(
          `Error starting server: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    } else {
      try {
        const success = await stopServer(server.id);
        if (success) {
          toast.success(`Stopped server: ${server.name}`);
        } else {
          toast.error(`Failed to stop server: ${server.name}`);
        }
      } catch (error) {
        toast.error(
          `Error stopping server: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }
  };

  // Update function to restart a server
  const restartServer = async (server: MCPServer, e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      // First stop it
      if (server.status === "connected" || server.status === "connecting") {
        await stopServer(server.id);
      }

      // Then start it again (with delay to ensure proper cleanup)
      setTimeout(async () => {
        updateServerStatus(server.id, "connecting");
        const success = await startServer(server.id);

        if (success) {
          toast.success(`Restarted server: ${server.name}`);
        } else {
          toast.error(`Failed to restart server: ${server.name}`);
        }
      }, 500);
    } catch (error) {
      updateServerStatus(
        server.id,
        "error",
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );
      toast.error(
        `Error restarting server: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  };

  // UI element to display the correct server URL
  const getServerDisplayUrl = (server: MCPServer): string => {
    return server.url;
  };

  // Update the hover info function to return richer content
  const getServerStatusHoverInfo = (server: MCPServer): string | undefined => {
    // For error status, show the error message
    if (server.status === "error" && server.errorMessage) {
      return `Error: ${server.errorMessage}`;
    }

    return undefined;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ServerIcon className="h-5 w-5 text-primary" />
            MCP Server Configuration
          </DialogTitle>
          <DialogDescription>
            Connect to Model Context Protocol servers to access additional AI
            tools.
            {selectedServers.length > 0 && (
              <span className="block mt-1 text-xs font-medium text-primary">
                {selectedServers.length} server
                {selectedServers.length !== 1 ? "s" : ""} currently active
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {variant === "modal" ? (
          <div className="flex-1 overflow-hidden flex flex-col">
            {servers.length > 0 ? (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {servers.map((server) => (
                  <div
                    key={server.id}
                    className={`relative flex flex-col p-3.5 rounded-xl transition-colors border ${
                      selectedServers.includes(server.id)
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/30 hover:bg-primary/5"
                    }`}
                  >
                    {/* Server Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <h4 className="text-sm font-medium truncate max-w-[160px]">
                          {server.name}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                          {server.type.toUpperCase()}
                        </span>
                        <button
                          onClick={(e) => toggleServerStatus(server, e)}
                          className="p-1 rounded-full hover:bg-muted/70"
                          title="Toggle server status"
                        >
                          <Power className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => startEditing(server)}
                          className="p-1 rounded-full hover:bg-muted/50"
                          title="Edit server"
                        >
                          <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                        <button
                          onClick={(e) => removeServer(server.id, e)}
                          className="p-1 rounded-full hover:bg-muted/70"
                          title="Remove server"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Server URL */}
                    <p className="text-xs text-muted-foreground mb-2.5 truncate">
                      {getServerDisplayUrl(server)}
                    </p>
                    
                    {/* Action Button */}
                    <Button
                      size="sm"
                      className="w-full gap-1.5 hover:text-black hover:dark:text-white rounded-lg"
                      variant={selectedServers.includes(server.id) ? "default" : "outline"}
                      onClick={() => toggleServer(server.id)}
                    >
                      {selectedServers.includes(server.id) && (
                        <CheckCircle className="h-3.5 w-3.5" />
                      )}
                      {selectedServers.includes(server.id) ? "Active" : "Enable Server"}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-4">
                <div className="text-center space-y-2">
                  <ServerIcon className="h-12 w-12 text-muted-foreground mx-auto" />
                  <p className="text-muted-foreground">No MCP servers configured</p>
                  <p className="text-xs text-muted-foreground">
                    Add your first server to get started
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          // Full panel variant
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {view === "list" ? (
                <>
                  {servers.length > 0 ? (
                    <div className="space-y-4">
                      {servers.map((server) => (
                        <div
                          key={server.id}
                          className={`relative flex flex-col p-4 rounded-xl transition-colors border ${
                            selectedServers.includes(server.id)
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/30 hover:bg-primary/5"
                          }`}
                        >
                          {/* Server Header */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <Globe className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                              <h4 className="text-base font-medium">
                                {server.name}
                              </h4>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
                                {server.type.toUpperCase()}
                              </span>
                              <button
                                onClick={(e) => toggleServerStatus(server, e)}
                                className="p-1 rounded-full hover:bg-muted/70"
                                title="Toggle server status"
                              >
                                <Power className="h-4 w-4 text-muted-foreground" />
                              </button>
                              <button
                                onClick={() => startEditing(server)}
                                className="p-1 rounded-full hover:bg-muted/50"
                                title="Edit server"
                              >
                                <Edit2 className="h-4 w-4 text-muted-foreground" />
                              </button>
                              <button
                                onClick={(e) => removeServer(server.id, e)}
                                className="p-1 rounded-full hover:bg-muted/70"
                                title="Remove server"
                              >
                                <Trash2 className="h-4 w-4 text-muted-foreground" />
                              </button>
                            </div>
                          </div>
                          
                          {/* Server URL */}
                          <p className="text-sm text-muted-foreground mb-3">
                            {getServerDisplayUrl(server)}
                          </p>
                          
                          {/* Action Button */}
                          <Button
                            size="sm"
                            className="w-full gap-2 hover:text-black hover:dark:text-white rounded-lg"
                            variant={selectedServers.includes(server.id) ? "default" : "outline"}
                            onClick={() => toggleServer(server.id)}
                          >
                            {selectedServers.includes(server.id) && (
                              <CheckCircle className="h-4 w-4" />
                            )}
                            {selectedServers.includes(server.id) ? "Active" : "Enable Server"}
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center space-y-4 py-12">
                      <ServerIcon className="h-16 w-16 text-muted-foreground mx-auto" />
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold text-foreground">No MCP servers configured</h3>
                        <p className="text-muted-foreground">Add your first server to access additional AI tools</p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="max-w-2xl mx-auto space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="server-name">Server Name</Label>
                      <Input
                        id="server-name"
                        value={newServer.name}
                        onChange={(e) =>
                          setNewServer({ ...newServer, name: e.target.value })
                        }
                        placeholder="My MCP Server"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="server-url">Server URL</Label>
                      <Input
                        id="server-url"
                        value={newServer.url}
                        onChange={(e) =>
                          setNewServer({ ...newServer, url: e.target.value })
                        }
                        placeholder="http://localhost:8000/mcp/"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="server-type">Connection Type</Label>
                      <select
                        id="server-type"
                        value={newServer.type}
                        onChange={(e) =>
                          setNewServer({
                            ...newServer,
                            type: e.target.value as "http" | "sse",
                          })
                        }
                        className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                      >
                        <option value="http">HTTP</option>
                        <option value="sse">Server-Sent Events (SSE)</option>
                      </select>
                    </div>
                  </div>

                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="advanced">
                      <AccordionTrigger className="text-sm">
                        Advanced Configuration
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="server-command">Command (for process type)</Label>
                          <Input
                            id="server-command"
                            value={newServer.command}
                            onChange={(e) =>
                              setNewServer({ ...newServer, command: e.target.value })
                            }
                            placeholder="python -m mcp.server"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="server-args">Arguments</Label>
                          <Input
                            id="server-args"
                            value={(newServer.args || []).join(" ")}
                            onChange={(e) =>
                              setNewServer({
                                ...newServer,
                                args: e.target.value.split(" ").filter(Boolean),
                              })
                            }
                            placeholder="--port 8000 --host localhost"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Environment Variables</Label>
                          <div className="space-y-2">
                            {(newServer.env || []).map((envVar, index) => (
                              <div key={index} className="flex gap-2">
                                <Input
                                  value={envVar.key}
                                  onChange={(e) =>
                                    updateEnvVar(index, "key", e.target.value)
                                  }
                                  placeholder="KEY"
                                  className="flex-1"
                                />
                                <Input
                                  value={envVar.value}
                                  onChange={(e) =>
                                    updateEnvVar(index, "value", e.target.value)
                                  }
                                  placeholder="value"
                                  className="flex-1"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeEnvVar(index)}
                                  className="h-8 w-8 p-0"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={addEnvVar}
                              className="gap-1.5"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Add Environment Variable
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>HTTP Headers</Label>
                          <div className="space-y-2">
                            {(newServer.headers || []).map((header, index) => (
                              <div key={index} className="flex gap-2">
                                <Input
                                  value={header.key}
                                  onChange={(e) =>
                                    updateHeader(index, "key", e.target.value)
                                  }
                                  placeholder="Header-Name"
                                  className="flex-1"
                                />
                                <Input
                                  value={header.value}
                                  onChange={(e) =>
                                    updateHeader(index, "value", e.target.value)
                                  }
                                  placeholder="header-value"
                                  className="flex-1"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeHeader(index)}
                                  className="h-8 w-8 p-0"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={addHeader}
                              className="gap-1.5"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Add HTTP Header
                            </Button>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              )}
            </div>
            
            {/* Footer buttons for full-panel variant */}
            {variant === "full-panel" && (
              <div className="border-t border-border p-4 bg-background flex justify-between">
                {view === "list" ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={clearAllServers}
                      size="sm"
                      className="gap-1.5 hover:text-black hover:dark:text-white"
                      disabled={selectedServers.length === 0}
                    >
                      <X className="h-3.5 w-3.5" />
                      Disable All
                    </Button>
                    <Button
                      onClick={() => setView("add")}
                      size="sm"
                      className="gap-1.5"
                    >
                      <PlusCircle className="h-3.5 w-3.5" />
                      Add Server
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" onClick={handleFormCancel}>
                      Cancel
                    </Button>
                    <Button
                      onClick={editingServerId ? updateServer : addServer}
                      disabled={!newServer.name || !newServer.url}
                    >
                      {editingServerId ? "Save Changes" : "Add Server"}
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* Footer buttons for modal variant */}
        {variant === "modal" && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t border-border flex justify-between z-10">
            {view === "list" ? (
              <>
                <Button
                  variant="outline"
                  onClick={clearAllServers}
                  size="sm"
                  className="gap-1.5 hover:text-black hover:dark:text-white"
                  disabled={selectedServers.length === 0}
                >
                  <X className="h-3.5 w-3.5" />
                  Disable All
                </Button>
                <Button
                  onClick={() => setView("add")}
                  size="sm"
                  className="gap-1.5"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  Add Server
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={handleFormCancel}>
                  Cancel
                </Button>
                <Button
                  onClick={editingServerId ? updateServer : addServer}
                  disabled={!newServer.name || !newServer.url}
                >
                  {editingServerId ? "Save Changes" : "Add Server"}
                </Button>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
