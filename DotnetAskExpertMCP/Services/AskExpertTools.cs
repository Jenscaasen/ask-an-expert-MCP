using DotnetAskExpertMCP.Models;
using ModelContextProtocol.Server;
using ModelContextProtocol.Protocol;
using ModelContextProtocol;
using System.ComponentModel;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace DotnetAskExpertMCP.Services;

[McpServerToolType]
public sealed class AskExpertTools
{
    private readonly AskExpertConfiguration _config;
    private readonly HttpClient _httpClient;
    private readonly AuthTokenProvider _authTokenProvider;
    
    public AskExpertTools(IConfiguration configuration, HttpClient httpClient, AuthTokenProvider authTokenProvider)
    {
                _config = new AskExpertConfiguration();
        configuration.GetSection(AskExpertConfiguration.SectionName).Bind(_config);
        
        // Validate configuration - only BaseUrl is required now, ApiKey comes from MCP client auth
        if (string.IsNullOrEmpty(_config.BaseUrl))
            throw new InvalidOperationException("AskExpert:BaseUrl configuration is required. Set via appsettings.json, environment variable ASK_EXPERT__BASEURL, or user secrets.");
        
        _httpClient = httpClient;
        _httpClient.Timeout = TimeSpan.FromSeconds(60);
        _authTokenProvider = authTokenProvider;
    }

    [McpServerTool, Description("Ask a question to an AI expert and get a response")]
    public async Task<string> AskExpert(
        [Description("The question to ask the AI expert")] string question)
    {
        if (string.IsNullOrWhiteSpace(question))
            throw new McpException("Question cannot be empty");

        var payload = new
        {
            model = _config.ModelName,
            messages = new[]
            {
                new { role = "user", content = question }
            },
            temperature = 1
        };

        return await PerformApiCall(payload);
    }

    [McpServerTool, Description("Ask a question to an AI expert about an image and get a response. The image can be a URL, a local file path, or a base64 encoded string. All inputs are converted to base64 data URIs.")]
    public async Task<string> AskExpertOnImage(
        [Description("The question or prompt related to the image")] string prompt,
        [Description("Image URL, local file path, or base64 encoded image string")] string image)
    {
        if (string.IsNullOrWhiteSpace(prompt))
            throw new McpException("Prompt cannot be empty");
            
        if (string.IsNullOrWhiteSpace(image))
            throw new McpException("Image cannot be empty");

        var processedImageUrl = await ProcessImageInput(image);
        
        var payload = new
        {
            model = _config.ModelName,
            messages = new[]
            {
                new
                {
                    role = "user",
                    content = new object[]
                    {
                        new { type = "text", text = prompt },
                        new
                        {
                            type = "image_url",
                            image_url = new { url = processedImageUrl }
                        }
                    }
                }
            },
            temperature = 1
        };

        return await PerformApiCall(payload);
    }

    private static async Task<string> ProcessImageInput(string imageString)
    {
        // 1. Check if it's already a base64 data URI
        if (imageString.StartsWith("data:image"))
        {
            if (!Regex.IsMatch(imageString, @"^data:image\/[a-zA-Z]+;base64,"))
                throw new McpException("Invalid base64 data URI format.");
            return imageString;
        }

        // 2. Check if it's a URL
        if (IsValidUrl(imageString))
        {
            try
            {
                using var tempClient = new HttpClient();
                var response = await tempClient.GetAsync(imageString);
                response.EnsureSuccessStatusCode();
                
                var imageBytes = await response.Content.ReadAsByteArrayAsync();
                var base64Data = Convert.ToBase64String(imageBytes);
                var mimeType = GetMimeType(imageString, response.Content.Headers.ContentType?.MediaType);
                
                if (!mimeType.StartsWith("image/"))
                    throw new McpException($"Downloaded content from {imageString} is not a recognized image type (MIME: {mimeType}).");
                    
                return $"data:{mimeType};base64,{base64Data}";
            }
            catch (Exception ex) when (!(ex is McpException))
            {
                throw new McpException($"Failed to download image from URL: {imageString}. {ex.Message}");
            }
        }

        // 3. Try treating as a local file path
        if (File.Exists(imageString))
        {
            try
            {
                var fileBytes = await File.ReadAllBytesAsync(imageString);
                var base64Data = Convert.ToBase64String(fileBytes);
                var mimeType = GetMimeType(imageString);
                
                if (!mimeType.StartsWith("image/"))
                    throw new McpException($"File {imageString} is not a recognized image type (MIME determined as: {mimeType}).");
                    
                return $"data:{mimeType};base64,{base64Data}";
            }
            catch (Exception ex) when (!(ex is McpException))
            {
                throw new McpException($"Error reading image file {imageString}: {ex.Message}");
            }
        }

        // 4. Try treating as a raw base64 string
        var looksLikeBase64 = Regex.IsMatch(imageString, @"^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$");
        if (looksLikeBase64 && imageString.Length > 16)
        {
            return $"data:image/jpeg;base64,{imageString}"; // Default to JPEG for raw base64
        }

        throw new McpException($"Invalid image string: not a valid data URI, URL, existing file path, or recognizable raw base64 string. Please check the input: \"{imageString.Substring(0, Math.Min(100, imageString.Length))}...\"");
    }

    private static bool IsValidUrl(string urlString)
    {
        return Uri.TryCreate(urlString, UriKind.Absolute, out var uri) &&
               (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps);
    }

    private static string GetMimeType(string filePathOrUrl, string? contentTypeHeader = null)
    {
        if (!string.IsNullOrEmpty(contentTypeHeader))
            return contentTypeHeader.Split(';')[0];

        var ext = Path.GetExtension(filePathOrUrl).ToLowerInvariant();
        return ext switch
        {
            ".png" => "image/png",
            ".jpeg" or ".jpg" => "image/jpeg",
            ".gif" => "image/gif",
            ".webp" => "image/webp",
            _ => "image/jpeg" // Default
        };
    }

    private string GetApiKeyFromAuthToken()
    {
        var token = _authTokenProvider.GetToken();
        if (string.IsNullOrEmpty(token))
            throw new McpException("No authorization token found. MCP client must provide a Bearer token for API access.");

        return token;
    }

    private async Task<string> PerformApiCall(object payload)
    {
        try
        {
            var apiKey = GetApiKeyFromAuthToken();
            
            var json = JsonSerializer.Serialize(payload);
            var content = new StringContent(json, System.Text.Encoding.UTF8, "application/json");
            
            // Construct the full URL by combining base URL with the endpoint
            var fullUrl = _config.BaseUrl.TrimEnd('/') + "/v1/chat/completions";
            
            // Create a new request message with the dynamic authorization header
            using var request = new HttpRequestMessage(HttpMethod.Post, fullUrl)
            {
                Content = content
            };
            request.Headers.Add("Authorization", $"Bearer {apiKey}");
            
            var response = await _httpClient.SendAsync(request);
            response.EnsureSuccessStatusCode();
            
            var responseContent = await response.Content.ReadAsStringAsync();
            using var document = JsonDocument.Parse(responseContent);
            
            if (document.RootElement.TryGetProperty("choices", out var choices) &&
                choices.GetArrayLength() > 0 &&
                choices[0].TryGetProperty("message", out var message) &&
                message.TryGetProperty("content", out var messageContent))
            {
                return messageContent.GetString() ?? "No response content";
            }
            
            throw new McpException("Unexpected API response format from AI service.");
        }
        catch (HttpRequestException ex)
        {
            throw new McpException($"API error: {ex.Message}");
        }
        catch (JsonException ex)
        {
            throw new McpException($"JSON parsing error: {ex.Message}");
        }
    }
}