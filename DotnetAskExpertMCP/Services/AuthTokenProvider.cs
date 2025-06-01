namespace DotnetAskExpertMCP.Services;

public class AuthTokenProvider 
{
    private readonly AsyncLocal<string?> _token = new();
    private readonly ILogger<AuthTokenProvider> _logger;

    public AuthTokenProvider(ILogger<AuthTokenProvider> logger)
    {
        _logger = logger;
    }

    public string? GetToken()
    {
        var token = _token.Value;
        _logger.LogInformation("Getting token - value: {HasToken} (length: {Length})", 
            !string.IsNullOrEmpty(token) ? "present" : "null/empty",
            token?.Length ?? 0);
        return token;
    }

    public void SetToken(string token)
    {
        _logger.LogInformation("Setting token (length: {Length})", token?.Length ?? 0);
        _token.Value = token;
    }
}