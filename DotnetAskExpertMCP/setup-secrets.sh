#!/bin/bash

# Setup script for DotNet Ask Expert MCP Server
# This script helps you configure user secrets for local development

echo "🔧 Setting up DotNet Ask Expert MCP Server configuration..."
echo ""

# Check if we're in the right directory
if [ ! -f "DotnetAskExpertMCP.csproj" ]; then
    echo "❌ Error: This script must be run from the DotnetAskExpertMCP directory"
    echo "Please navigate to the project directory and run this script again."
    exit 1
fi

# Initialize user secrets if not already done
echo "📦 Initializing user secrets..."
dotnet user-secrets init

echo ""
echo "Please provide the following configuration values:"
echo ""

# Get Base URL
echo "🌐 Enter the API Base URL (e.g., https://api.openai.com):"
read -r base_url
if [ -n "$base_url" ]; then
    dotnet user-secrets set "AskExpert:BaseUrl" "$base_url"
    echo "✅ Base URL saved"
fi

echo ""

# Get API Key
echo "🔑 Enter your API Key:"
read -s api_key
if [ -n "$api_key" ]; then
    dotnet user-secrets set "AskExpert:ApiKey" "$api_key"
    echo "✅ API Key saved (hidden)"
fi

echo ""

# Get Model Name
echo "🤖 Enter the model name (default: o3):"
read -r model_name
model_name=${model_name:-o3}
dotnet user-secrets set "AskExpert:ModelName" "$model_name"
echo "✅ Model name saved: $model_name"

echo ""
echo "🎉 Configuration complete!"
echo ""
echo "You can now run the application with:"
echo "  dotnet run"
echo ""
echo "To view your stored secrets:"
echo "  dotnet user-secrets list"
echo ""
echo "To update a specific value later:"
echo "  dotnet user-secrets set \"AskExpert:ApiKey\" \"new-api-key\""