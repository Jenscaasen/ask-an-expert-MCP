# Deployment Guide for Ask Expert MCP

This guide explains how to deploy the .NET Core 9.0 Ask Expert MCP application to Azure App Service.

## Prerequisites

Before running the deployment script, ensure you have:

1. **Azure CLI** installed and configured
   ```bash
   # Install Azure CLI (if not already installed)
   curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
   ```

2. **.NET 9.0 SDK** installed
   ```bash
   # Check if .NET is installed
   dotnet --version
   ```

3. **Azure permissions** to deploy to the target subscription and resource group

## Deployment Configuration

The deployment script is configured for:
- **Azure Subscription**: IUG-AI-OpenAI
- **Resource Group**: ToolHub
- **Web App Name**: iu-ask-expert-mcp
- **Runtime**: Linux with .NET Core 9.0

## Quick Deployment

To deploy the application, simply run:

```bash
./deploy.sh
```

## What the Script Does

1. **Validates environment** - Checks for Azure CLI and .NET SDK
2. **Authenticates to Azure** - Prompts for login if needed
3. **Sets subscription** - Switches to the target subscription
4. **Verifies target app** - Confirms the App Service exists
5. **Builds application** - Restores packages and builds in Release mode
6. **Runs tests** - Executes any unit tests found
7. **Publishes app** - Creates a Linux-compatible build
8. **Creates package** - Zips the published files
9. **Deploys to Azure** - Uploads and deploys the package
10. **Verifies deployment** - Checks app status and shows logs
11. **Cleans up** - Removes temporary files

## Troubleshooting

### Common Issues

1. **Authentication Error**
   ```bash
   # Re-login to Azure 
   az login
   az account set --subscription "IUG-AI-OpenAI"
   ```

2. **App Service Not Found**
   - Verify the app name and resource group are correct
   - Check you have permissions to the subscription

3. **Build Errors**
   ```bash
   # Clean and rebuild manually
   cd DotnetAskExpertMCP
   dotnet clean
   dotnet restore
   dotnet build
   ```

4. **Deployment Fails**
   ```bash
   # Check app service logs
   az webapp log tail --name iu-ask-expert-mcp --resource-group ToolHub
   ```

### Manual Commands

If you need to perform steps manually:

```bash
# Login to Azure
az login
az account set --subscription "IUG-AI-OpenAI"

# Build and publish
cd DotnetAskExpertMCP
dotnet publish --configuration Release --output ../publish --os linux

# Deploy
cd ..
zip -r release.zip publish/
az webapp deployment source config-zip \
  --resource-group ToolHub \
  --name iu-ask-expert-mcp \
  --src release.zip
```

### Useful Azure CLI Commands

```bash
# View app settings
az webapp config appsettings list --name iu-ask-expert-mcp --resource-group ToolHub

# View application logs
az webapp log tail --name iu-ask-expert-mcp --resource-group ToolHub

# Restart the application
az webapp restart --name iu-ask-expert-mcp --resource-group ToolHub

# Check app status
az webapp show --name iu-ask-expert-mcp --resource-group ToolHub --query "state"
```

## Required Environment Variables

After deployment, you **must** configure these application settings in the Azure portal:

### Required Settings:

1. **`AskExpert__BaseUrl`** - The API base URL (e.g., `https://api.openai.com`)
2. **`AskExpert__ModelName`** - The AI model to use (default: `o3`)

### Configuration Steps:

1. Navigate to the App Service in Azure portal
2. Go to **Configuration** → **Application settings**
3. Click **+ New application setting** and add:

```
Name: AskExpert__BaseUrl
Value: https://api.openai.com
```

```
Name: AskExpert__ModelName
Value: o3
```

4. Save the configuration
5. Restart the application

### Important Notes:

- **API Key**: The application expects the API key to be provided via MCP client authentication (Bearer token), not as an environment variable
- **Double Underscore**: Use `__` (double underscore) in environment variable names for nested configuration sections
- **Authentication**: The app uses token-based authentication where the MCP client provides the API key as a Bearer token

### Alternative Configuration Methods:

You can also set these via Azure CLI:

```bash
# Set the base URL
az webapp config appsettings set \
  --resource-group ToolHub \
  --name iu-ask-expert-mcp \
  --settings AskExpert__BaseUrl="https://api.openai.com"

# Set the model name
az webapp config appsettings set \
  --resource-group ToolHub \
  --name iu-ask-expert-mcp \
  --settings AskExpert__ModelName="o3"
```

## Monitoring

Access your deployed application at:
**https://iu-ask-expert-mcp.azurewebsites.net**

Monitor the application through:
- Azure portal App Service logs
- Application Insights (if configured)
- Azure CLI log commands

## Security Notes

- The application uses authentication middleware
- Ensure all secrets are properly configured in Azure App Service settings
- Do not commit sensitive information to the repository