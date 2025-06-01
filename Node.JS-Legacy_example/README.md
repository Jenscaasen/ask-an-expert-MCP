# Ask-an-Expert MCP Server

This is an MCP (Model Context Protocol) server that allows you to ask questions to an OpenAI-compatible API endpoint.

## Intended Use
While smaller and cheaper models can do 90% of the work, they might get stuck at some point. Using the huge context sizes of agentic coding assistants
such as Roo Code or CLINE with expensive models does not justify the price in all cases. This MCP lets cheaper models ask specific questions without paying for a big context to an expert model.

## Using with Roo Code / CLINE
Add this to your Custom Instructions for All Modes:

> When you are stuck and cannot fix a bug, are unfamiliar with a concept or your knowledge is lacking, then use the "Ask Expert" MCP Server by asking a detailed question including:
> - What the goal is
> - What you tried
> - What the problem is
> 
> Add as much information as needed into the question.

## Overview

The server exposes the following tools:
- `ask_expert`: Sends a text-based question to an AI expert and returns the response.
- `askExpertOnImage`: Sends a text prompt along with an image (URL, local file path, or base64 string) to an AI expert for analysis and returns the response. All image inputs are converted to base64 data URIs before being sent to the API.

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
| `ASK_EXPERT_MODEL_NAME` | The model to use (optional, defaults to 'o3'). For `askExpertOnImage`, ensure this model supports vision (e.g., `gpt-4o`, `gpt-4-turbo`). | `o3` |

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

Once the server is registered, you can use the tools through the MCP protocol.

### `ask_expert` (Text-based questions)

```xml
<use_mcp_tool>
  <server_name>ask-an-expert</server_name>
  <tool_name>ask_expert</tool_name>
  <arguments>
    {
      "question": "Dear expert, I am having trouble understanding this concept. Can you explain it?"
    }
  </arguments>
</use_mcp_tool>
```

### `askExpertOnImage` (Image-based questions)

The `image` parameter can be a publicly accessible URL, a local file path on the machine running the MCP server, or a base64 encoded string (either raw or as a data URI like `data:image/jpeg;base64,...`). The server will process all these formats into a base64 data URI before sending to the AI.

```xml
<use_mcp_tool>
  <server_name>ask-an-expert</server_name>
  <tool_name>askExpertOnImage</tool_name>
  <arguments>
    {
      "prompt": "What objects are prominent in this image?",
      "image": "https://example.com/path/to/your/image.jpg"
    }
  </arguments>
</use_mcp_tool>
```

Or with a local file path:
```xml
<use_mcp_tool>
  <server_name>ask-an-expert</server_name>
  <tool_name>askExpertOnImage</tool_name>
  <arguments>
    {
      "prompt": "Describe this architectural design.",
      "image": "/path/to/local/image.png"
    }
  </arguments>
</use_mcp_tool>
```

Or with a base64 encoded string:
```xml
<use_mcp_tool>
  <server_name>ask-an-expert</server_name>
  <tool_name>askExpertOnImage</tool_name>
  <arguments>
    {
      "prompt": "Is this a cat or a dog?",
      "image": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkS..."
    }
  </arguments>
</use_mcp_tool>
```

## Testing with MCP Inspector

The [MCP Inspector](https://github.com/modelcontextprotocol/inspector) is a useful tool for testing and debugging MCP servers locally.

1.  **Run the Inspector:** Open your terminal in the project directory and run the following command:

    ```bash
    npx @modelcontextprotocol/inspector node index.js
    ```

2.  **Configure Environment Variables:** In the Inspector's "Server connection pane", you can set environment variables for the server process. Add the following variables:

    *   `ASK_EXPERT_BASE_URL`: Set this to your OpenAI-compatible API endpoint (e.g., `https://api.openai.com`).
    *   `ASK_EXPERT_API_KEY`: Set this to your API key from [https://platform.openai.com/settings/organization/api-keys](https://platform.openai.com/settings/organization/api-keys).
    *   `ASK_EXPERT_MODEL_NAME`: Set this to a model that supports vision, such as `gpt-4o`.

3.  **Connect to the Server:** Click the "Connect" button in the Inspector.

4.  **Test `ask_expert`:**
    *   Go to the "Tools" tab.
    *   Select the `ask_expert` tool.
    *   In the arguments section, enter:
        ```json
        {
          "question": "What is the capital of france?"
        }
        ```
    *   Click "Execute". Verify that the response is meaningful.

5.  **Test `askExpertOnImage`:**
    *   Go to the "Tools" tab.
    *   Select the `askExpertOnImage` tool.
    *   In the arguments section, enter:
        ```json
        {
          "prompt": "What does the picture show?",
          "image": "(full local path to img.png)"
        }
        ```
    *   Click "Execute". Verify that the response mentions a "cat" or describes the image content accurately.

This process allows you to directly interact with the server's tools and verify their functionality before integrating with a client like Roo Code or CLINE.
## License

ISC