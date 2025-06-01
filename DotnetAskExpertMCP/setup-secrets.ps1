# Setup script for DotNet Ask Expert MCP Server
# This script helps you configure user secrets for local development

Write-Host "🔧 Setting up DotNet Ask Expert MCP Server configuration..." -ForegroundColor Green
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "DotnetAskExpertMCP.csproj")) {
    Write-Host "❌ Error: This script must be run from the DotnetAskExpertMCP directory" -ForegroundColor Red
    Write-Host "Please navigate to the project directory and run this script again." -ForegroundColor Red
    exit 1
}

# Initialize user secrets if not already done
Write-Host "📦 Initializing user secrets..." -ForegroundColor Yellow
dotnet user-secrets init

Write-Host ""
Write-Host "Please provide the following configuration values:" -ForegroundColor Cyan
Write-Host ""

# Get Base URL
Write-Host "🌐 Enter the API Base URL (e.g., https://api.openai.com):" -ForegroundColor Yellow
$baseUrl = Read-Host
if ($baseUrl) {
    dotnet user-secrets set "AskExpert:BaseUrl" $baseUrl
    Write-Host "✅ Base URL saved" -ForegroundColor Green
}

Write-Host ""

# Get API Key
Write-Host "🔑 Enter your API Key:" -ForegroundColor Yellow
$apiKey = Read-Host -AsSecureString
$apiKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($apiKey))
if ($apiKeyPlain) {
    dotnet user-secrets set "AskExpert:ApiKey" $apiKeyPlain
    Write-Host "✅ API Key saved (hidden)" -ForegroundColor Green
}

Write-Host ""

# Get Model Name
Write-Host "🤖 Enter the model name (default: o3):" -ForegroundColor Yellow
$modelName = Read-Host
if (-not $modelName) {
    $modelName = "o3"
}
dotnet user-secrets set "AskExpert:ModelName" $modelName
Write-Host "✅ Model name saved: $modelName" -ForegroundColor Green

Write-Host ""
Write-Host "🎉 Configuration complete!" -ForegroundColor Green
Write-Host ""
Write-Host "You can now run the application with:" -ForegroundColor Cyan
Write-Host "  dotnet run" -ForegroundColor White
Write-Host ""
Write-Host "To view your stored secrets:" -ForegroundColor Cyan
Write-Host "  dotnet user-secrets list" -ForegroundColor White
Write-Host ""
Write-Host "To update a specific value later:" -ForegroundColor Cyan
Write-Host "  dotnet user-secrets set `"AskExpert:ApiKey`" `"new-api-key`"" -ForegroundColor White