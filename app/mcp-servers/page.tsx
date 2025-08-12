"use client";

import { useState } from "react";
import { useMCP } from "@/lib/context/mcp-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PlusCircle,
  ServerIcon,
  X,
  Globe,
  Trash2,
  CheckCircle,
  Plus,
  Edit2,
  Power,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function MCPServersPage() {
  const {
    mcpServers,
    setMcpServers,
    selectedMcpServers,
    setSelectedMcpServers,
    startServer,
    stopServer,
  } = useMCP();

  const [view, setView] = useState<"list" | "add">("list");
  const [editingServerId, setEditingServerId] = useState<string | null>(null);
  const [newServer, setNewServer] = useState({
    name: "",
    url: "",
    type: "http" as "http" | "sse",
    command: "",
    args: [] as string[],
    env: [] as { key: string; value: string }[],
    headers: [] as { key: string; value: string }[],
  });

  const addServer = () => {
    if (!newServer.name || !newServer.url) return;
    
    const id = `server-${Date.now()}`;
    const server = {
      id,
      ...newServer,
      status: "disconnected" as const,
      tools: [],
      errorMessage: undefined,
    };
    
    setMcpServers([...mcpServers, server]);
    setNewServer({ name: "", url: "", type: "http", command: "", args: [], env: [], headers: [] });
    setView("list");
    toast.success("Server added successfully");
  };

  const removeServer = (id: string) => {
    setMcpServers(mcpServers.filter(server => server.id !== id));
    setSelectedMcpServers(selectedMcpServers.filter(serverId => serverId !== id));
    toast.success("Server removed");
  };

  const toggleServer = (id: string) => {
    if (selectedMcpServers.includes(id)) {
      setSelectedMcpServers(selectedMcpServers.filter(serverId => serverId !== id));
    } else {
      setSelectedMcpServers([...selectedMcpServers, id]);
    }
  };

  const startEditing = (server: any) => {
    setEditingServerId(server.id);
    setNewServer({
      name: server.name,
      url: server.url,
      type: server.type,
      command: server.command || "",
      args: server.args || [],
      env: server.env || [],
      headers: server.headers || [],
    });
    setView("add");
  };

  const updateServer = () => {
    if (!editingServerId || !newServer.name || !newServer.url) return;
    
    const updated = mcpServers.map(s =>
      s.id === editingServerId ? { ...s, ...newServer } : s
    );
    setMcpServers(updated);
    setEditingServerId(null);
    setNewServer({ name: "", url: "", type: "http", command: "", args: [], env: [], headers: [] });
    setView("list");
    toast.success("Server updated successfully");
  };

  const clearAllServers = () => {
    setSelectedMcpServers([]);
    toast.success("All servers disabled");
  };

  const addEnvVar = () => {
    if (!newServer.env) newServer.env = [];
    setNewServer({ ...newServer, env: [...newServer.env, { key: "", value: "" }] });
  };

  const removeEnvVar = (index: number) => {
    const updatedEnv = [...(newServer.env || [])];
    updatedEnv.splice(index, 1);
    setNewServer({ ...newServer, env: updatedEnv });
  };

  const addHeader = () => {
    if (!newServer.headers) newServer.headers = [];
    setNewServer({ ...newServer, headers: [...newServer.headers, { key: "", value: "" }] });
  };

  const removeHeader = (index: number) => {
    const updatedHeaders = [...(newServer.headers || [])];
    updatedHeaders.splice(index, 1);
    setNewServer({ ...newServer, headers: updatedHeaders });
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

  const handleFormCancel = () => {
    setView("list");
    setEditingServerId(null);
    setNewServer({ name: "", url: "", type: "http", command: "", args: [], env: [], headers: [] });
  };

  return (
    <div className="flex-1 flex flex-col h-full w-full">
      {/* Header */}
      <div className="border-b border-border p-4 sm:p-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between pl-12 sm:pl-16">
          <div>
            <h1 className="text-2xl font-bold text-foreground">MCP Server Management</h1>
            <p className="text-muted-foreground mt-1">
              Connect to Model Context Protocol servers to access additional AI tools
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Active servers</p>
            <p className="text-2xl font-bold text-primary">{selectedMcpServers.length}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col min-h-0">
        {view === "list" ? (
          <div className="flex-1 p-3 sm:p-4 lg:p-6 overflow-auto">
            {mcpServers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4 auto-rows-fr">
                {mcpServers.map((server) => (
                  <div
                    key={server.id}
                    className={`relative flex flex-col p-3 sm:p-4 rounded-xl transition-all duration-200 border min-h-[180px] sm:min-h-[200px] hover:shadow-md ${
                      selectedMcpServers.includes(server.id)
                        ? "border-primary bg-primary/10 shadow-primary/20"
                        : "border-border hover:border-primary/30 hover:bg-primary/5"
                    }`}
                  >
                    {/* Server Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <h4 className="text-sm font-medium truncate">
                          {server.name}
                        </h4>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground font-medium">
                          {server.type.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    
                    {/* Server URL */}
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2 leading-relaxed">
                      {server.url}
                    </p>
                    
                    {/* Server Status */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-2 h-2 rounded-full ${
                        selectedMcpServers.includes(server.id) 
                          ? "bg-green-500 animate-pulse" 
                          : "bg-gray-400"
                      }`} />
                      <span className="text-xs text-muted-foreground font-medium">
                        {selectedMcpServers.includes(server.id) ? "Active" : "Inactive"}
                      </span>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 mb-3">
                      <Button
                        size="sm"
                        variant={selectedMcpServers.includes(server.id) ? "default" : "outline"}
                        onClick={() => toggleServer(server.id)}
                        className="flex-1 gap-1.5 text-xs h-8"
                      >
                        {selectedMcpServers.includes(server.id) && (
                          <CheckCircle className="h-3 w-3" />
                        )}
                        {selectedMcpServers.includes(server.id) ? "Active" : "Enable"}
                      </Button>
                    </div>
                    
                    {/* Server Actions */}
                    <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/20">
                      <button
                        onClick={() => startEditing(server)}
                        className="p-1.5 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                        title="Edit server"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => removeServer(server.id)}
                        className="p-1.5 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-red-400 transition-colors"
                        title="Remove server"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
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
          </div>
        ) : (
          <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
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
          </div>
        )}
        
        {/* Footer buttons */}
        <div className="border-t border-border p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex justify-between">
          {view === "list" ? (
            <>
              <Button
                variant="outline"
                onClick={clearAllServers}
                size="sm"
                className="gap-1.5 hover:text-black hover:dark:text-white"
                disabled={selectedMcpServers.length === 0}
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
      </div>
    </div>
  );
}
