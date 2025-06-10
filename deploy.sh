#!/bin/bash

# Azure Deployment Script for Ask Expert MCP
# Target: Azure App Service (Linux, .NET Core 9.0)

set -e  # Exit on any error

# Configuration
SUBSCRIPTION="IUG-AI-OpenAI"
RESOURCE_GROUP="ToolHub"
APP_NAME="iu-ask-expert-mcp"
PROJECT_PATH="./DotnetAskExpertMCP"
PUBLISH_PATH="./publish"
ZIP_FILE="release.zip"
 
echo "🚀 Starting deployment to Azure App Service..."
echo "📋 Configuration:"
echo "   Subscription: $SUBSCRIPTION"
echo "   Resource Group: $RESOURCE_GROUP"
echo "   App Name: $APP_NAME"
echo "   Project Path: $PROJECT_PATH"
echo ""

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo "❌ Azure CLI is not installed. Please install it first."
    echo "   Visit: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
fi

# Check if dotnet is installed
if ! command -v dotnet &> /dev/null; then
    echo "❌ .NET CLI is not installed. Please install .NET 9.0 SDK first."
    echo "   Visit: https://dotnet.microsoft.com/download"
    exit 1
fi

# Verify .NET version
echo "🔍 Checking .NET version..."
DOTNET_VERSION=$(dotnet --version)
echo "   Detected .NET version: $DOTNET_VERSION"

# Login to Azure (if not already logged in)
echo "🔐 Checking Azure authentication..."
if ! az account show &> /dev/null; then
    echo "   Please login to Azure..."
    az login
else
    echo "   Already authenticated to Azure"
fi

# Set the subscription
echo "📂 Setting Azure subscription..."
az account set --subscription "$SUBSCRIPTION"

# Verify the target app exists
echo "🔍 Verifying target App Service exists..."
if ! az webapp show --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" &> /dev/null; then
    echo "❌ App Service '$APP_NAME' not found in resource group '$RESOURCE_GROUP'"
    echo "   Please create the App Service first or check your configuration."
    exit 1
else
    echo "   ✅ App Service '$APP_NAME' found"
fi

# Clean previous builds
echo "🧹 Cleaning previous builds..."
if [ -d "$PUBLISH_PATH" ]; then
    rm -rf "$PUBLISH_PATH"
fi
if [ -f "$ZIP_FILE" ]; then
    rm -f "$ZIP_FILE"
fi

# Restore dependencies
echo "📦 Restoring NuGet packages..."
cd "$PROJECT_PATH"
dotnet restore

# Build the application
echo "🔨 Building the application..."
dotnet build --configuration Release --no-restore

# Run tests (if any exist)
echo "🧪 Running tests..."
if [ -d "tests" ] || find . -name "*.Tests.csproj" -o -name "*Test*.csproj" | grep -q .; then
    dotnet test --configuration Release --no-build --verbosity normal
else
    echo "   No tests found, skipping test phase"
fi

# Publish the application
echo "📤 Publishing application for Linux deployment..."
dotnet publish --configuration Release --output "../$PUBLISH_PATH" --os linux --arch x64 --self-contained false

# Go back to root directory
cd ..

# Create deployment package
echo "📦 Creating deployment package..."
cd "$PUBLISH_PATH"
zip -r "../$ZIP_FILE" . > /dev/null
cd ..

echo "   ✅ Created deployment package: $ZIP_FILE"

# Deploy to Azure App Service
echo "🚀 Deploying to Azure App Service..."
az webapp deployment source config-zip \
    --resource-group "$RESOURCE_GROUP" \
    --name "$APP_NAME" \
    --src "$ZIP_FILE"

# Wait a moment for deployment to complete
echo "⏳ Waiting for deployment to complete..."
sleep 10

# Check deployment status
echo "🔍 Checking deployment status..."
WEBAPP_URL="https://$APP_NAME.azurewebsites.net"
echo "   App URL: $WEBAPP_URL"

# Try to get app status
APP_STATE=$(az webapp show --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" --query "state" --output tsv)
echo "   App State: $APP_STATE"

if [ "$APP_STATE" = "Running" ]; then
    echo "   ✅ App is running"
else
    echo "   ⚠️  App state is: $APP_STATE"
fi

# Show recent logs
echo "📋 Recent application logs:"
az webapp log tail --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" --timeout 30 || echo "   Unable to retrieve logs at this time"

# Cleanup
echo "🧹 Cleaning up temporary files..."
rm -f "$ZIP_FILE"
rm -rf "$PUBLISH_PATH"

echo ""
echo "✅ Deployment completed!"
echo "🌐 Your application should be available at: $WEBAPP_URL"
echo ""
echo "⚠️  IMPORTANT: Configure required environment variables:"
echo "   You must set these application settings in the Azure portal:"
echo "   - AskExpert__BaseUrl (e.g., https://api.openai.com)"
echo "   - AskExpert__ModelName (e.g., o3)"
echo ""
echo "🔧 Quick setup commands:"
echo "   az webapp config appsettings set --resource-group $RESOURCE_GROUP --name $APP_NAME --settings AskExpert__BaseUrl=\"https://api.openai.com\""
echo "   az webapp config appsettings set --resource-group $RESOURCE_GROUP --name $APP_NAME --settings AskExpert__ModelName=\"o3\""
echo ""
echo "📋 Next steps:"
echo "   1. Configure the required environment variables (see above)"
echo "   2. Restart the application: az webapp restart --name $APP_NAME --resource-group $RESOURCE_GROUP"
echo "   3. Verify the application is working by visiting the URL above"
echo "   4. Check application logs if needed: az webapp log tail --name $APP_NAME --resource-group $RESOURCE_GROUP"
echo ""
echo "🔧 Useful commands:"
echo "   - View app settings: az webapp config appsettings list --name $APP_NAME --resource-group $RESOURCE_GROUP"
echo "   - View app logs: az webapp log tail --name $APP_NAME --resource-group $RESOURCE_GROUP"
echo "   - Restart app: az webapp restart --name $APP_NAME --resource-group $RESOURCE_GROUP"