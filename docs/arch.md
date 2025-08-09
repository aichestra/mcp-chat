# MCP Chat Repository Architecture Analysis

## Background

**Scira MCP Chat** is an open-source AI chatbot application that integrates with the Model Context Protocol (MCP). Built with Next.js and the AI SDK by Vercel, it provides a modern, responsive chat interface that can connect to multiple AI providers and extend capabilities through MCP servers.

### Key Features:
- **Multi-AI Provider Support**: Integrates with Groq, XAI, and other providers via AI SDK
- **Model Context Protocol Integration**: Connects to external MCP servers for enhanced tool capabilities
- **Real-time Streaming**: Supports streaming responses with smooth text animation
- **Persistent Storage**: PostgreSQL database with Drizzle ORM for chat history
- **Modern UI**: Built with shadcn/ui components and Tailwind CSS
- **Bot Protection**: Integrated bot detection via BotId

## Technology Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS 4, shadcn/ui components
- **Database**: PostgreSQL with Drizzle ORM
- **AI Integration**: Vercel AI SDK, Model Context Protocol
- **State Management**: TanStack Query, React Context
- **Authentication**: BotId protection
- **Deployment**: Vercel (with analytics and speed insights)

## High-Level Architecture

```mermaid
graph TB
    %% User Interface Layer
    subgraph "Frontend Layer"
        UI[Chat Interface]
        Sidebar[Chat Sidebar]
        Settings[MCP Server Manager]
        Components[shadcn/ui Components]
    end

    %% Application Layer
    subgraph "Application Layer"
        NextApp[Next.js App Router]
        ReactQuery[TanStack Query]
        MCPContext[MCP Context Provider]
        ChatStore[Chat Store]
    end

    %% API Layer
    subgraph "API Layer"
        ChatAPI["/api/chat"]
        ChatsAPI["/api/chats"]
        MCPHealthAPI["/api/mcp-health"]
    end

    %% AI & External Services
    subgraph "AI Providers"
        Groq[Groq API]
        XAI[XAI API]
        AISDKCore[AI SDK Core]
    end

    subgraph "MCP Ecosystem"
        MCPServers[External MCP Servers]
        MCPClient[MCP Client SDK]
        MCPTransports[HTTP/SSE Transports]
    end

    %% Data Layer
    subgraph "Data Layer"
        PostgreSQL[(PostgreSQL Database)]
        DrizzleORM[Drizzle ORM]
        Schema[Database Schema]
    end

    %% External Services
    subgraph "External Services"
        Vercel[Vercel Platform]
        BotId[BotId Protection]
        Analytics[Vercel Analytics]
    end

    %% Connections
    UI --> NextApp
    Sidebar --> NextApp
    Settings --> MCPContext
    
    NextApp --> ReactQuery
    NextApp --> MCPContext
    NextApp --> ChatStore
    
    ReactQuery --> ChatAPI
    ReactQuery --> ChatsAPI
    MCPContext --> MCPHealthAPI
    
    ChatAPI --> AISDKCore
    ChatAPI --> MCPClient
    ChatAPI --> DrizzleORM
    
    AISDKCore --> Groq
    AISDKCore --> XAI
    
    MCPClient --> MCPTransports
    MCPTransports --> MCPServers
    
    DrizzleORM --> Schema
    Schema --> PostgreSQL
    
    NextApp --> BotId
    NextApp --> Analytics
    NextApp --> Vercel
```

## Data Flow Architecture

```mermaid
sequenceDiagram
    participant User
    participant ChatUI as Chat Interface
    participant API as Chat API
    participant AIProvider as AI Provider
    participant MCPClient as MCP Client
    participant MCPServer as External MCP Server
    participant DB as PostgreSQL

    User->>ChatUI: Send message
    ChatUI->>API: POST /api/chat
    Note over API: Generate chat ID if new
    API->>DB: Save initial chat
    API->>MCPClient: Initialize MCP clients
    MCPClient->>MCPServer: Connect & get tools
    MCPServer-->>MCPClient: Return available tools
    MCPClient-->>API: Tools ready
    API->>AIProvider: Stream text with tools
    AIProvider-->>API: Streaming response
    Note over API: AI may call MCP tools
    API->>MCPServer: Execute tool calls
    MCPServer-->>API: Tool results
    API-->>ChatUI: Stream response chunks
    ChatUI-->>User: Display streaming message
    API->>DB: Save complete conversation
    API->>MCPClient: Cleanup connections
```

## Component Architecture

```mermaid
graph TD
    subgraph "App Layout"
        RootLayout[layout.tsx]
        Providers[providers.tsx]
        ChatSidebar[chat-sidebar.tsx]
    end

    subgraph "Pages"
        HomePage[page.tsx]
        ChatPage["chat/[id]/page.tsx"]
    end

    subgraph "Core Components"
        Chat[chat.tsx]
        Messages[messages.tsx]
        Message[message.tsx]
        Textarea[textarea.tsx]
        ModelPicker[model-picker.tsx]
    end

    subgraph "MCP Components"
        MCPServerManager[mcp-server-manager.tsx]
        MCPContext[mcp-context.tsx]
        ToolInvocation[tool-invocation.tsx]
    end

    subgraph "UI Components"
        Button[ui/button.tsx]
        Dialog[ui/dialog.tsx]
        Input[ui/input.tsx]
        Sidebar[ui/sidebar.tsx]
        Tooltip[ui/tooltip.tsx]
    end

    subgraph "Hooks & Utils"
        useChats[use-chats.ts]
        useMCP[from mcp-context]
        useLocalStorage[use-local-storage.ts]
        ChatUtils[chat-utils.ts]
    end

    RootLayout --> Providers
    RootLayout --> ChatSidebar
    HomePage --> Chat
    ChatPage --> Chat
    
    Chat --> Messages
    Chat --> Textarea
    Chat --> ModelPicker
    Chat --> useChats
    Chat --> useMCP
    
    Messages --> Message
    Message --> ToolInvocation
    
    Textarea --> ModelPicker
    
    MCPServerManager --> MCPContext
    MCPServerManager --> Dialog
    MCPServerManager --> Button
    
    ChatSidebar --> useChats
    ChatSidebar --> Sidebar
    
    Chat --> useLocalStorage
    Chat --> ChatUtils
```

## Database Schema

```mermaid
erDiagram
    CHATS {
        text id PK "nanoid() generated"
        text user_id "User identifier"
        text title "Chat title"
        timestamp created_at "Creation timestamp"
        timestamp updated_at "Last update timestamp"
    }
    
    MESSAGES {
        text id PK "nanoid() generated"
        text chat_id FK "References chats.id"
        text role "user, assistant, or tool"
        json parts "Message parts as JSON"
        timestamp created_at "Creation timestamp"
    }
    
    CHATS ||--o{ MESSAGES : "has many"
```

## API Architecture

```mermaid
graph LR
    subgraph "API Routes"
        ChatRoute["/api/chat<br/>POST"]
        ChatsRoute["/api/chats<br/>GET"]
        ChatIdRoute["/api/chats/[id]<br/>GET"]
        MCPHealthRoute["/api/mcp-health<br/>POST"]
    end

    subgraph "Services"
        AIService[AI Service<br/>Streaming]
        MCPService[MCP Client<br/>Manager]
        DBService[Database<br/>Operations]
        AuthService[Bot Protection<br/>Service]
    end

    subgraph "External APIs"
        GroqAPI[Groq API]
        XAIAPI[XAI API]
        MCPServers[MCP Servers]
    end

    ChatRoute --> AIService
    ChatRoute --> MCPService
    ChatRoute --> DBService
    ChatRoute --> AuthService
    
    ChatsRoute --> DBService
    ChatIdRoute --> DBService
    MCPHealthRoute --> MCPService
    
    AIService --> GroqAPI
    AIService --> XAIAPI
    MCPService --> MCPServers
```

## Core Code Details

### 1. Chat Flow Implementation

The chat functionality is implemented through several key files:

#### **`components/chat.tsx`** (Main Chat Component)
```typescript
// Key features:
- useChat hook from AI SDK for streaming responses
- React Query for chat history management
- MCP context integration for external tools
- Dynamic chat ID generation for new conversations
- Real-time message streaming with error handling
```

#### **`app/api/chat/route.ts`** (Chat API Endpoint)
```typescript
// Core responsibilities:
- Bot protection via BotId
- MCP client initialization with tool discovery
- AI model selection and streaming configuration
- Database persistence of conversations
- Error handling and cleanup
```

### 2. MCP Integration

#### **`lib/mcp-client.ts`** (MCP Client Manager)
```typescript
// Key functionality:
- Support for HTTP and SSE transports
- Dynamic MCP server configuration
- Tool discovery and management
- Connection lifecycle management
- Error handling and fallback strategies
```

#### **`lib/context/mcp-context.tsx`** (MCP State Management)
```typescript
// Features:
- MCP server configuration storage
- Server health monitoring
- Tool discovery and caching
- Connection status management
- Local storage persistence
```

### 3. Database Layer

#### **`lib/db/schema.ts`** (Database Schema)
```typescript
// Schema design:
- Chats: User sessions with metadata
- Messages: Chat messages with JSON parts
- Support for rich message content (text, tools, attachments)
- Cascading deletes for data integrity
```

#### **`lib/chat-store.ts`** (Database Operations)
```typescript
// Key operations:
- Message format conversion (UI ↔ DB)
- Automatic title generation
- Chat history persistence
- Message part handling for complex content
```

### 4. AI Provider Integration

#### **`ai/providers.ts`** (AI Provider Configuration)
```typescript
// Supported providers:
- Groq: Multiple models (Qwen, Kimi, Llama)
- XAI: Grok models
- Custom provider wrapper with reasoning middleware
- Dynamic API key management (env vars + localStorage)
```

### 5. State Management

The application uses a hybrid state management approach:

- **React Query**: Server state and caching for chats and messages
- **React Context**: MCP server configuration and status
- **Local Storage**: User preferences and API keys
- **URL State**: Current chat ID and navigation

### 6. Security Features

- **Bot Protection**: BotId integration to prevent automated abuse
- **Input Validation**: Zod schemas for API validation
- **Secure Headers**: Environment variable prioritization over localStorage
- **Error Boundaries**: Graceful error handling throughout the app

### 7. Performance Optimizations

- **Streaming Responses**: Real-time AI response streaming
- **Query Caching**: TanStack Query for efficient data fetching
- **Component Lazy Loading**: Code splitting for better initial load
- **Message Virtualization**: Efficient rendering of long conversations
- **Connection Pooling**: Reuse of MCP connections

## Key Architectural Decisions

1. **Next.js App Router**: Modern routing with server components where beneficial
2. **Model Context Protocol**: Extensible tool integration architecture
3. **AI SDK Integration**: Provider-agnostic AI model support
4. **PostgreSQL + Drizzle**: Type-safe database operations with good performance
5. **Component-First Design**: Reusable UI components with shadcn/ui
6. **Real-time Updates**: Streaming responses with optimistic UI updates

This architecture provides a scalable, maintainable foundation for an AI chat application with extensive customization capabilities through MCP server integration.
