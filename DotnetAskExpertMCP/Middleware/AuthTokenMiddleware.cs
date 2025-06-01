using DotnetAskExpertMCP.Services;

namespace DotnetAskExpertMCP.Middleware;

public class AuthTokenMiddleware
{
    private readonly RequestDelegate _next;
    private readonly AuthTokenProvider _authTokenProvider;
    private readonly ILogger<AuthTokenMiddleware> _logger;

    public AuthTokenMiddleware(RequestDelegate next, AuthTokenProvider authTokenProvider, ILogger<AuthTokenMiddleware> logger)
    {
        _next = next;
        _authTokenProvider = authTokenProvider;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Log all headers for debugging
        _logger.LogInformation("Request Path: {Path}", context.Request.Path);
        _logger.LogInformation("Request Headers:");
        foreach (var header in context.Request.Headers)
        {
            _logger.LogInformation("  {Key}: {Value}", header.Key, string.Join(", ", header.Value.ToArray()));
        }

        // Extract authorization header if present
        var authHeader = context.Request.Headers.Authorization.FirstOrDefault();
        if (!string.IsNullOrEmpty(authHeader))
        {
            _logger.LogInformation("Authorization header found: {AuthHeader}", authHeader);
            if (authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            {
                var token = authHeader.Substring("Bearer ".Length).Trim();
                if (!string.IsNullOrEmpty(token))
                {
                    _logger.LogInformation("Setting token in provider (length: {TokenLength})", token.Length);
                    _authTokenProvider.SetToken(token);
                }
                else
                {
                    _logger.LogWarning("Bearer token is empty");
                }
            }
            else
            {
                _logger.LogWarning("Authorization header does not start with 'Bearer ': {AuthHeader}", authHeader);
            }
        }
        else
        {
            _logger.LogWarning("No Authorization header found");
        }

        await _next(context);
    }
}