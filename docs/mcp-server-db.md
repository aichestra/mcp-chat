# MCP Server Database Integration Design

## Overview

This document outlines the design for persisting MCP server information to the database, similar to how chats and messages are currently stored. The goal is to move from the current local storage implementation to a database-backed solution for better persistence, reliability, and potential multi-user support.

## Current Implementation

Currently, MCP server information is managed through:
- Local storage using `useLocalStorage` hook with keys:
  - `mcp-servers` - Stores the list of configured servers
  - `selected-mcp-servers` - Stores the IDs of currently selected servers
- `MCPContext` React context for state management
- In-memory state with no database persistence

## Database Schema Changes

### New Table: `mcp_servers`

```sql
CREATE TABLE mcp_servers (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT NOT NULL,
  command TEXT,
  args JSONB,
  env JSONB,
  headers JSONB,
  description TEXT,
  is_selected BOOLEAN DEFAULT FALSE NOT NULL,
  status TEXT,
  error_message TEXT,
  tools JSONB,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

## Drizzle Schema Updates

Add the following to `lib/db/schema.ts`:

```typescript
export const mcpServers = pgTable('mcp_servers', {
  id: text('id').primaryKey().notNull().$defaultFn(() => nanoid()),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  url: text('url').notNull(),
  type: text('type').notNull(), // 'sse' or 'http'
  command: text('command'),
  args: json('args'),
  env: json('env'),
  headers: json('headers'),
  description: text('description'),
  isSelected: boolean('is_selected').default(false).notNull(),
  status: text('status'), // 'connected', 'connecting', 'disconnected', 'error'
  errorMessage: text('error_message'),
  tools: json('tools'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type MCPServer = typeof mcpServers.$inferSelect;
```

## API Endpoints

### 1. GET `/api/mcp-servers`

Retrieves all MCP servers for the current user.

```typescript
// app/api/mcp-servers/route.ts
export async function GET(request: Request) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const servers = await getMcpServers(userId);
    return NextResponse.json(servers);
  } catch (error) {
    console.error("Error fetching MCP servers:", error);
    return NextResponse.json(
      { error: "Failed to fetch MCP servers" },
      { status: 500 }
    );
  }
}
```

### 2. POST `/api/mcp-servers`

Creates a new MCP server.

```typescript
// app/api/mcp-servers/route.ts
export async function POST(request: Request) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }
    
    const serverData = await request.json();
    const result = await saveMcpServer({ ...serverData, userId });
    
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error creating MCP server:", error);
    return NextResponse.json(
      { error: "Failed to create MCP server" },
      { status: 500 }
    );
  }
}
```

### 3. PUT `/api/mcp-servers/:id`

Updates an existing MCP server.

```typescript
// app/api/mcp-servers/[id]/route.ts
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }
    
    const serverData = await request.json();
    const result = await saveMcpServer({ 
      ...serverData, 
      id: params.id,
      userId 
    });
    
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error updating MCP server:", error);
    return NextResponse.json(
      { error: "Failed to update MCP server" },
      { status: 500 }
    );
  }
}
```

### 4. DELETE `/api/mcp-servers/:id`

Deletes an MCP server.

```typescript
// app/api/mcp-servers/[id]/route.ts
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }
    
    await deleteMcpServer(params.id, userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting MCP server:", error);
    return NextResponse.json(
      { error: "Failed to delete MCP server" },
      { status: 500 }
    );
  }
}
```

### 5. PUT `/api/mcp-servers/:id/select`

Updates the selection status of an MCP server.

```typescript
// app/api/mcp-servers/[id]/select/route.ts
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }
    
    const { isSelected } = await request.json();
    await updateMcpServerSelection(params.id, userId, isSelected);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating MCP server selection:", error);
    return NextResponse.json(
      { error: "Failed to update MCP server selection" },
      { status: 500 }
    );
  }
}
```

### 6. PUT `/api/mcp-servers/:id/status`

Updates the status of an MCP server.

```typescript
// app/api/mcp-servers/[id]/status/route.ts
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }
    
    const { status, errorMessage } = await request.json();
    await updateMcpServerStatus(params.id, userId, status, errorMessage);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating MCP server status:", error);
    return NextResponse.json(
      { error: "Failed to update MCP server status" },
      { status: 500 }
    );
  }
}
```

## Data Access Layer

Create a new file `lib/mcp-server-store.ts`:

```typescript
import { db } from "./db";
import { mcpServers, type MCPServer } from "./db/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";

type SaveMcpServerParams = {
  id?: string;
  userId: string;
  name: string;
  url: string;
  type: "sse" | "http";
  command?: string;
  args?: string[];
  env?: Array<{ key: string; value: string }>;
  headers?: Array<{ key: string; value: string }>;
  description?: string;
  isSelected?: boolean;
  status?: string;
  errorMessage?: string;
  tools?: any[];
};

export async function saveMcpServer(params: SaveMcpServerParams) {
  const { id, userId, ...serverData } = params;
  const serverId = id || nanoid();
  
  // Check if server already exists
  const existingServer = await db.query.mcpServers.findFirst({
    where: and(
      eq(mcpServers.id, serverId),
      eq(mcpServers.userId, userId)
    ),
  });
  
  if (existingServer) {
    // Update existing server
    await db
      .update(mcpServers)
      .set({
        ...serverData,
        updatedAt: new Date()
      })
      .where(and(
        eq(mcpServers.id, serverId),
        eq(mcpServers.userId, userId)
      ));
  } else {
    // Create new server
    await db.insert(mcpServers).values({
      id: serverId,
      userId,
      ...serverData,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
  
  return { id: serverId };
}

export async function getMcpServers(userId: string) {
  return await db.query.mcpServers.findMany({
    where: eq(mcpServers.userId, userId),
    orderBy: [mcpServers.name]
  });
}

export async function getMcpServerById(id: string, userId: string) {
  return await db.query.mcpServers.findFirst({
    where: and(
      eq(mcpServers.id, id),
      eq(mcpServers.userId, userId)
    ),
  });
}

export async function deleteMcpServer(id: string, userId: string) {
  await db.delete(mcpServers).where(
    and(
      eq(mcpServers.id, id),
      eq(mcpServers.userId, userId)
    )
  );
}

export async function updateMcpServerSelection(id: string, userId: string, isSelected: boolean) {
  await db
    .update(mcpServers)
    .set({ isSelected })
    .where(and(
      eq(mcpServers.id, id),
      eq(mcpServers.userId, userId)
    ));
}

export async function updateMcpServerStatus(id: string, userId: string, status: string, errorMessage?: string) {
  await db
    .update(mcpServers)
    .set({ 
      status,
      errorMessage: errorMessage || null,
      updatedAt: new Date()
    })
    .where(and(
      eq(mcpServers.id, id),
      eq(mcpServers.userId, userId)
    ));
}

export async function updateMcpServerTools(id: string, userId: string, tools: any[]) {
  await db
    .update(mcpServers)
    .set({ 
      tools,
      updatedAt: new Date()
    })
    .where(and(
      eq(mcpServers.id, id),
      eq(mcpServers.userId, userId)
    ));
}

export async function getSelectedMcpServers(userId: string) {
  return await db.query.mcpServers.findMany({
    where: and(
      eq(mcpServers.userId, userId),
      eq(mcpServers.isSelected, true)
    ),
  });
}
```

## React Hook: `useMcpServers`

Create a new file `lib/hooks/use-mcp-servers.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type MCPServer } from '@/lib/db/schema';
import { toast } from 'sonner';

export function useMcpServers(userId: string) {
  const queryClient = useQueryClient();

  // Query to fetch MCP servers
  const {
    data: mcpServers = [],
    isLoading,
    error,
    refetch
  } = useQuery<MCPServer[]>({
    queryKey: ['mcpServers', userId],
    queryFn: async () => {
      if (!userId) return [];

      const response = await fetch('/api/mcp-servers', {
        headers: {
          'x-user-id': userId
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch MCP servers');
      }

      return response.json();
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
  });

  // Mutation to save an MCP server
  const saveMcpServer = useMutation({
    mutationFn: async (server: Omit<MCPServer, 'id' | 'userId' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
      const method = server.id ? 'PUT' : 'POST';
      const url = server.id ? `/api/mcp-servers/${server.id}` : '/api/mcp-servers';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify(server)
      });

      if (!response.ok) {
        throw new Error(`Failed to ${server.id ? 'update' : 'create'} MCP server`);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mcpServers', userId] });
      toast.success('MCP server saved successfully');
    },
    onError: (error) => {
      console.error('Error saving MCP server:', error);
      toast.error('Failed to save MCP server');
    }
  });

  // Mutation to delete an MCP server
  const deleteMcpServer = useMutation({
    mutationFn: async (serverId: string) => {
      const response = await fetch(`/api/mcp-servers/${serverId}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': userId
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete MCP server');
      }

      return serverId;
    },
    onSuccess: (deletedServerId) => {
      queryClient.setQueryData<MCPServer[]>(['mcpServers', userId], (oldServers = []) =>
        oldServers.filter(server => server.id !== deletedServerId)
      );
      toast.success('MCP server deleted');
    },
    onError: (error) => {
      console.error('Error deleting MCP server:', error);
      toast.error('Failed to delete MCP server');
    }
  });

  // Mutation to toggle server selection
  const toggleServerSelection = useMutation({
    mutationFn: async ({ serverId, isSelected }: { serverId: string, isSelected: boolean }) => {
      const response = await fetch(`/api/mcp-servers/${serverId}/select`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({ isSelected })
      });

      if (!response.ok) {
        throw new Error('Failed to update MCP server selection');
      }

      return { serverId, isSelected };
    },
    onSuccess: ({ serverId, isSelected }) => {
      // Update the server in the cache
      queryClient.setQueryData<MCPServer[]>(['mcpServers', userId], (oldServers = []) =>
        oldServers.map(server => 
          server.id === serverId ? { ...server, isSelected } : server
        )
      );
    },
    onError: (error) => {
      console.error('Error updating MCP server selection:', error);
      toast.error('Failed to update MCP server selection');
    }
  });

  // Mutation to update server status
  const updateServerStatus = useMutation({
    mutationFn: async ({ 
      serverId, 
      status, 
      errorMessage 
    }: { 
      serverId: string, 
      status: string, 
      errorMessage?: string 
    }) => {
      const response = await fetch(`/api/mcp-servers/${serverId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({ status, errorMessage })
      });

      if (!response.ok) {
        throw new Error('Failed to update MCP server status');
      }

      return { serverId, status, errorMessage };
    },
    onSuccess: ({ serverId, status, errorMessage }) => {
      // Update the server in the cache
      queryClient.setQueryData<MCPServer[]>(['mcpServers', userId], (oldServers = []) =>
        oldServers.map(server => 
          server.id === serverId ? { ...server, status, errorMessage } : server
        )
      );
    },
    onError: (error) => {
      console.error('Error updating MCP server status:', error);
      toast.error('Failed to update MCP server status');
    }
  });

  // Get selected servers
  const selectedMcpServers = mcpServers.filter(server => server.isSelected).map(server => server.id);

  return {
    mcpServers,
    isLoading,
    error,
    refetch,
    selectedMcpServers,
    saveMcpServer: saveMcpServer.mutate,
    isSaving: saveMcpServer.isPending,
    deleteMcpServer: deleteMcpServer.mutate,
    isDeleting: deleteMcpServer.isPending,
    toggleServerSelection: toggleServerSelection.mutate,
    isTogglingSelection: toggleServerSelection.isPending,
    updateServerStatus: updateServerStatus.mutate,
    isUpdatingStatus: updateServerStatus.isPending
  };
}
```

## Migration Strategy

1. Create a new migration file for the database schema changes
2. Implement the data access layer and API endpoints
3. Update the `MCPContext` to use the new database-backed implementation
4. Add a migration function to move existing local storage data to the database
5. Update the `MCPServerManager` component to use the new hook

## Updated MCPContext Implementation

The updated `MCPContext` will need to:

1. Use the new `useMcpServers` hook instead of `useLocalStorage`
2. Maintain the same API for components that use it
3. Handle the transition from local storage to database storage

```typescript
// lib/context/mcp-context.tsx
"use client";

import { createContext, useContext, useRef, useEffect } from "react";
import { useMcpServers } from "@/lib/hooks/use-mcp-servers";
import { useUserId } from "@/lib/hooks/use-user-id"; // Assuming this hook exists

// ... existing types ...

interface MCPContextType {
  mcpServers: MCPServer[];
  setMcpServers: (servers: MCPServer[]) => void;
  selectedMcpServers: string[];
  setSelectedMcpServers: (serverIds: string[]) => void;
  mcpServersForApi: MCPServerApi[];
  startServer: (serverId: string) => Promise<boolean>;
  stopServer: (serverId: string) => Promise<boolean>;
  updateServerStatus: (
    serverId: string,
    status: ServerStatus,
    errorMessage?: string
  ) => void;
  getActiveServersForApi: () => MCPServerApi[];
}

const MCPContext = createContext<MCPContextType | undefined>(undefined);

// ... existing helper functions ...

export function MCPProvider({ children }: { children: React.ReactNode }) {
  const userId = useUserId();
  
  const {
    mcpServers: dbMcpServers,
    selectedMcpServers: dbSelectedMcpServers,
    saveMcpServer,
    toggleServerSelection,
    updateServerStatus: updateDbServerStatus
  } = useMcpServers(userId);
  
  // Create a ref to track active servers and avoid unnecessary re-renders
  const activeServersRef = useRef<Record<string, boolean>>({});

  // Helper to get a server by ID
  const getServerById = (serverId: string): MCPServer | undefined => {
    return dbMcpServers.find((server) => server.id === serverId);
  };

  // Update server status
  const updateServerStatus = (
    serverId: string,
    status: ServerStatus,
    errorMessage?: string
  ) => {
    updateDbServerStatus({
      serverId,
      status,
      errorMessage
    });
  };

  // Update server with tools
  const updateServerWithTools = (
    serverId: string,
    tools: MCPTool[],
    status: ServerStatus = "connected"
  ) => {
    const server = getServerById(serverId);
    if (server) {
      saveMcpServer({
        ...server,
        tools,
        status,
        errorMessage: undefined
      });
    }
  };

  // Get active servers formatted for API usage
  const getActiveServersForApi = (): MCPServerApi[] => {
    return dbSelectedMcpServers
      .map((id) => getServerById(id))
      .filter(
        (server): server is MCPServer =>
          !!server && server.status === "connected"
      )
      .map((server) => ({
        type: server.type,
        url: server.url,
        headers: server.headers,
      }));
  };

  // ... existing startServer and stopServer functions ...

  // Calculate mcpServersForApi based on current state
  const mcpServersForApi = getActiveServersForApi();

  // Function to set MCP servers
  const setMcpServers = (servers: MCPServer[]) => {
    // Save each server to the database
    servers.forEach(server => {
      saveMcpServer(server);
    });
  };

  // Function to set selected MCP servers
  const setSelectedMcpServers = (serverIds: string[]) => {
    // Update each server's selection status
    dbMcpServers.forEach(server => {
      const isSelected = serverIds.includes(server.id);
      if (server.isSelected !== isSelected) {
        toggleServerSelection({ serverId: server.id, isSelected });
      }
    });
  };

  return (
    <MCPContext.Provider
      value={{
        mcpServers: dbMcpServers,
        setMcpServers,
        selectedMcpServers: dbSelectedMcpServers,
        setSelectedMcpServers,
        mcpServersForApi,
        startServer,
        stopServer,
        updateServerStatus,
        getActiveServersForApi,
      }}
    >
      {children}
    </MCPContext.Provider>
  );
}

export function useMCP() {
  const context = useContext(MCPContext);
  if (context === undefined) {
    throw new Error("useMCP must be used within a MCPProvider");
  }
  return context;
}
```

## Migration Function for Local Storage Data

Add a function to migrate existing local storage data to the database:

```typescript
// lib/migrations/migrate-mcp-servers.ts
import { saveMcpServer } from "@/lib/mcp-server-store";

export async function migrateMcpServersFromLocalStorage(userId: string) {
  try {
    // Check if we've already migrated
    const migrationCompleted = localStorage.getItem('mcp-servers-migration-completed');
    if (migrationCompleted) return;
    
    // Get servers from local storage
    const serversJson = localStorage.getItem('mcp-servers');
    const selectedServersJson = localStorage.getItem('selected-mcp-servers');
    
    if (!serversJson) {
      // No data to migrate
      localStorage.setItem('mcp-servers-migration-completed', 'true');
      return;
    }
    
    const servers = JSON.parse(serversJson);
    const selectedServers = selectedServersJson ? JSON.parse(selectedServersJson) : [];
    
    // Save each server to the database
    for (const server of servers) {
      const isSelected = selectedServers.includes(server.id);
      await saveMcpServer({
        ...server,
        userId,
        isSelected
      });
    }
    
    // Mark migration as completed
    localStorage.setItem('mcp-servers-migration-completed', 'true');
    
    console.log('MCP servers migration completed successfully');
  } catch (error) {
    console.error('Error migrating MCP servers from local storage:', error);
  }
}
```

## Conclusion

This design provides a comprehensive approach to persisting MCP server information in the database, following the same patterns used for chats and messages. The implementation includes:

1. Database schema changes with a single table that includes both selection status and server status
2. API endpoints for CRUD operations
3. Data access layer for database operations
4. React hook for client-side data management
5. Migration strategy for existing data

This approach will improve reliability, enable multi-user support, and provide a consistent experience with the rest of the application.