using DotnetAskExpertMCP.Models;
using DotnetAskExpertMCP.Services;
using DotnetAskExpertMCP.Middleware;
using ModelContextProtocol.Server;

var builder = WebApplication.CreateBuilder(args);

// Configure the AskExpert settings
builder.Services.Configure<AskExpertConfiguration>(
    builder.Configuration.GetSection(AskExpertConfiguration.SectionName));

// Add HttpClient
builder.Services.AddHttpClient();

// Add authentication token provider as singleton service
builder.Services.AddSingleton<AuthTokenProvider>();

builder.Services.AddMcpServer()
    .WithHttpTransport()
    .WithTools<AskExpertTools>();

 builder.Services.AddHttpContextAccessor(); 
 
var app = builder.Build();

// Add the authentication token middleware before MCP
app.UseMiddleware<AuthTokenMiddleware>();

app.MapMcp();

app.Run();

