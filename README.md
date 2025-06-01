# DotNet Ask Expert MCP Server

A Model Context Protocol (MCP) server that provides AI expert consultation tools for asking questions and analyzing images.

## Authentication

This MCP server uses **client-side authentication** where the API key is provided by the MCP client via the Authorization header. The server extracts the bearer token from the request and uses it to authenticate with the target AI API.

## Configuration

### Server Configuration

The server only requires minimal configuration:

#### User Secrets (Recommended for Local Development)

```bash
dotnet user-secrets set "AskExpert:BaseUrl" "https://api.openai.com"
dotnet user-secrets set "AskExpert:ModelName" "o3"
```

#### Environment Variables (Recommended for Production)

```bash
export ASK_EXPERT__BASEURL="https://api.openai.com"
export ASK_EXPERT__MODELNAME="o3"
```

#### Configuration Files

Update [`appsettings.json`](appsettings.json) or [`appsettings.Development.json`](appsettings.Development.json):

```json
{
  "AskExpert": {
    "BaseUrl": "https://api.openai.com",
    "ModelName": "o3"
  }
}
```

### MCP Client Configuration

When connecting to this remote MCP server, MCP clients must provide authentication via the Authorization header.

#### Cline (VS Code Extension)

Configure in Cline's MCP settings:

```json
{
  "mcpServers": {
    "ask-expert": {
      "url": "https://your-server-url.com/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_OPENAI_API_KEY_HERE"
      },
      "alwaysAllow": ["AskExpert", "AskExpertOnImage"],
      "disabled": false
    }
  }
}
```

**Note**: There's a current issue with Cline ([Issue #2926](https://github.com/cline/cline/issues/2926)) where authorization headers may not be sent properly. Monitor the issue for updates.

#### Claude Desktop Configuration

Add this server to your Claude Desktop configuration with authentication:

```json
{
  "mcpServers": {
    "ask-expert": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-fetch"],
      "env": {
        "FETCH_MCP_SERVER_URL": "https://your-server-url.com/mcp",
        "FETCH_MCP_SERVER_AUTH": "Bearer YOUR_OPENAI_API_KEY_HERE"
      }
    }
  }
}
```

#### VS Code with GitHub Copilot

Configure in VS Code settings:

```json
{
  "github.copilot.chat.mcp.servers": {
    "ask-expert": {
      "url": "https://your-server-url.com/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_OPENAI_API_KEY_HERE"
      }
    }
  }
}
```

#### Cursor IDE

Configure in Cursor's MCP settings:

```json
{
  "mcpServers": {
    "ask-expert": {
      "url": "https://your-server-url.com/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_OPENAI_API_KEY_HERE"
      }
    }
  }
}
```

**Note**: There's a current issue with Cursor ([Issue #3129](https://github.com/getcursor/cursor/issues/3129)) where headers may not be included in MCP requests. Monitor the issue for updates.

#### Testing with curl

You can test the server directly using curl:

```bash
curl -H "Authorization: Bearer YOUR_OPENAI_API_KEY_HERE" \
     -H "Content-Type: application/json" \
     https://your-server-url.com/mcp
```

#### Known Issues

- **Cline**: Authorization headers may not be sent ([Issue #2926](https://github.com/cline/cline/issues/2926))
- **Cursor**: Headers configuration may not work ([Issue #3129](https://github.com/getcursor/cursor/issues/3129))
- **VS Code**: Header support varies by version and configuration

For clients that don't support headers properly, you may need to:
1. Use local MCP servers instead of remote ones
2. Wait for client updates to fix header support
3. Use alternative authentication methods if supported by the client

## Required Configuration

### Server Configuration
- **AskExpert:BaseUrl** - The base URL for the AI API (e.g., `https://api.openai.com`)
- **AskExpert:ModelName** - The AI model to use (default: `o3`)

### Client Configuration
- **Authorization Header** - MCP clients must provide `Authorization: Bearer <api-key>` with each request

## Running the Application

1. Set up your server configuration using one of the methods above
2. Run the application:

```bash
dotnet run
```

3. Configure your MCP client with the server URL and authentication
4. The server will extract the API key from the client's Authorization header

## Available Tools

- **AskExpert** - Ask a question to an AI expert and get a response
- **AskExpertOnImage** - Ask a question about an image (supports URLs, file paths, or base64 data)

## How Authentication Works

1. **MCP Client** sends requests with `Authorization: Bearer <api-key>` header
2. **MCP Server** extracts the bearer token from the Authorization header
3. **MCP Server** uses the extracted token to authenticate with the target AI API (e.g., OpenAI)
4. **Target AI API** processes the request and returns the response
5. **MCP Server** returns the AI response to the MCP client

This approach ensures that:
- API keys are managed by the client, not stored on the server
- Each client can use their own API key
- The server remains stateless and secure

## Security Best Practices

- ✅ API keys are provided by MCP clients via Authorization headers
- ✅ Server doesn't store any API keys or sensitive credentials
- ✅ Use HTTPS for all remote MCP server deployments
- ✅ Validate and sanitize all input data
- ✅ Monitor and log authentication failures
- ✅ Use environment variables for server configuration
- ✅ The `.gitignore` file is configured to exclude sensitive files

## Troubleshooting

### Common Issues

1. **"No Authorization header found"**
   - Ensure your MCP client supports and sends Authorization headers
   - Check the known issues section for client-specific problems

2. **"Invalid Authorization header format"**
   - Verify the header format is exactly: `Authorization: Bearer <token>`
   - Ensure there are no extra spaces or characters

3. **"HttpContext is not available"**
   - This error occurs if the tool is called outside of an HTTP request context
   - Ensure you're using the HTTP transport, not stdio transport

### Testing the Server

Test the server authentication with curl:

```bash
# Test without authentication (should fail)
curl -X POST https://your-server-url.com/mcp

# Test with authentication (should work)
curl -H "Authorization: Bearer your-api-key" \
     -H "Content-Type: application/json" \
     -X POST https://your-server-url.com/mcp
```