# Ask-an-Expert MCP Server

This is an MCP (Model Context Protocol) server that allows you to ask questions to an OpenAI-compatible API endpoint.

## Intended Use
While smaller and cheaper models can do 90% of the work, they might get stuck at some point. Using the huge context sizes of agentic coding assistants
such as Roo Coder or CLINE with expesive models does not justify the price in all cases. This MCP lets cheaper models ask specific questions without paying for a a big context to an expert model.

## Overview

The server exposes a single tool:
- `ask_expert`: Sends a question to an AI expert and returns the response

## Installation

1. Clone this repository:

   Prerequisites:
   - Ensure you have Git installed on your system
   - Open a terminal or command prompt

   Using HTTPS:
   ```bash
   git clone https://github.com/Jenscaasen/ask-an-expert-MCP.git
   cd ask-an-expert-MCP
   ```

   Using SSH (requires SSH key setup):
   ```bash
   git clone git@github.com:Jenscaasen/ask-an-expert-MCP.git
   cd ask-an-expert-MCP
   ```

2. Install dependencies:
   ```
   npm install
   ```
3. Build the server:
   ```
   npm run build
   ```

## Configuration

The server requires the following environment variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `ASK_EXPERT_BASE_URL` | The base URL of the OpenAI-compatible API | `https://api.openai.com` |
| `ASK_EXPERT_API_KEY` | Your API key for authentication | `sk-...` |
| `ASK_EXPERT_MODEL_NAME` | The model to use (optional, defaults to 'o1') | `o1` |

## Registering the MCP Server

To use this MCP server with the Roo-Code/Cline system, add it to your MCP settings file:

```json
{
  "mcpServers": {
    "ask-an-expert": {
      "command": "node",
      "args": ["/path/to/ask-an-expert-mcp/index.js"],
      "env": {
        "ASK_EXPERT_BASE_URL": "https://api.openai.com",
        "ASK_EXPERT_API_KEY": "your-api-key",
        "ASK_EXPERT_MODEL_NAME": "your-preferred-model"
      }
    }
  }
}
```

## Usage

Once the server is registered, you can use the `ask_expert` tool through the MCP protocol:

```xml
<use_mcp_tool>
<server_name>ask-an-expert</server_name>
<tool_name>ask_expert</tool_name>
<arguments>
{
  "question": "Dear expert, i am having trouble getting my data science script to work. What am i missing? This is what i tried: [...]. This is my goal: [...] Script [...]: "
}
</arguments>
</use_mcp_tool>
```

## License

ISC