<a href="https://mcp.scira.ai">
  <h1 align="center">Open MCP Chat</h1>
</a>

<p align="center">
  An open-source AI chatbot app powered by Model Context Protocol (MCP), built with Next.js and the AI SDK by Vercel.
</p>

<p align="center">
  <a href="#features"><strong>Features</strong></a> •
  <a href="#mcp-server-configuration"><strong>MCP Configuration</strong></a> •
  <a href="#license"><strong>License</strong></a>
</p>
<br/>

## Features

- Streaming text responses powered by the [AI SDK by Vercel](https://sdk.vercel.ai/docs), allowing multiple AI providers to be used interchangeably with just a few lines of code.
- Full integration with [Model Context Protocol (MCP)](https://modelcontextprotocol.io) servers to expand available tools and capabilities.
- HTTP and SSE transport types for connecting to various MCP tool providers.
- Built-in tool integration for extending AI capabilities.
- Reasoning model support.
- [shadcn/ui](https://ui.shadcn.com/) components for a modern, responsive UI powered by [Tailwind CSS](https://tailwindcss.com).
- Built with the latest [Next.js](https://nextjs.org) App Router.

## MCP Server Configuration

This application supports connecting to Model Context Protocol (MCP) servers to access their tools. You can add and manage MCP servers through the settings icon in the chat interface.

### Adding an MCP Server

1. Click the settings icon (⚙️) next to the model selector in the chat interface.
2. Enter a name for your MCP server.
3. Select the transport type:
   - **HTTP**: For HTTP-based remote servers
   - **SSE (Server-Sent Events)**: For SSE-based remote servers

#### HTTP or SSE Configuration

1. Enter the server URL (e.g., `https://mcp.example.com/mcp` or `https://mcp.example.com/token/sse`)
2. Click "Add Server"
3. Click "Enable Server" to activate the server for the current chat session.

### Available MCP Servers

You can use any MCP-compatible server with this application. Here are some examples:

- [Composio](https://composio.dev/mcp) - Provides search, code interpreter, and other tools
- [Zapier MCP](https://zapier.com/mcp) - Provides access to Zapier tools
- [Hugging Face MCP](https://huggingface.co/mcp) - Provides tool access to Hugging Face Hub
- Any MCP server compatible with HTTP or SSE transport

## Development

### Prerequisites
- Node.js (version 18 or higher)
- pnpm

### Setup
1. Clone the repository
```bash
git clone https://github.com/yourusername/mcp-chat.git
cd mcp-chat
```

2. Install dependencies
```bash
pnpm install
```

3. Create a `.env.local` file in the root directory with your AI provider API keys
```
# OpenAI
OPENAI_API_KEY=your_openai_api_key
# Anthropic
ANTHROPIC_API_KEY=your_anthropic_api_key
# Google
GOOGLE_API_KEY=your_google_api_key
# Cohere
COHERE_API_KEY=your_cohere_api_key
# Groq
GROQ_API_KEY=your_groq_api_key
# XAI
XAI_API_KEY=your_xai_api_key
   
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/scira_mcp_chat
```

### Database Setup

The application uses PostgreSQL with Drizzle ORM for data persistence. To set up the database:

1. Install PostgreSQL on your system or use a cloud service like [Neon](https://neon.tech)

2. Create a database and update your `.env` file with the database connection URL:

```
CREATE DATABASE scira_mcp_chat;
```
```
DATABASE_URL=postgresql://username:password@localhost:5432/scira_mcp_chat
```

3. Generate and push the database schema:
```bash
# Generate migration files
pnpm db:generate

# Push schema to database
pnpm db:push
```

4. You can explore your database using Drizzle Studio:
```bash
pnpm db:studio
```

5. Start the development server
```bash
pnpm dev
```

### Adding AI SDK Providers

This application uses the [AI SDK by Vercel](https://sdk.vercel.ai/docs) which supports multiple AI providers. You can configure additional providers by:

1. Adding the appropriate API key to your `.env` file
2. Configuring the provider in your code

The project already has the following AI SDK provider packages installed:
- `@ai-sdk/openai`
- `@ai-sdk/anthropic`
- `@ai-sdk/google`
- `@ai-sdk/cohere`
- `@ai-sdk/groq`
- `@ai-sdk/xai`

To obtain API keys:
- [OpenAI](https://platform.openai.com/api-keys)
- [Anthropic](https://console.anthropic.com/settings/keys)
- [Google AI](https://ai.google.dev/)
- [Cohere](https://dashboard.cohere.com/api-keys)
- [Groq](https://console.groq.com/keys)
- [XAI](https://console.x.ai/)

### Running and Building

#### Development

```bash
# Start the development server
pnpm dev
```

#### Distribution
```bash
# Build the application
pnpm build

# Create distributable (macOS)
pnpm dist
```

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.