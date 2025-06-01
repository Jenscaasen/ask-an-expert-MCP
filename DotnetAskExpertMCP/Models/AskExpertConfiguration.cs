namespace DotnetAskExpertMCP.Models;

public class AskExpertConfiguration
{
    public const string SectionName = "AskExpert";
    
    public string BaseUrl { get; set; } = string.Empty;
    public string ModelName { get; set; } = "o3";
}