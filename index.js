#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Configuration from environment variables
const BASE_URL = process.env.ASK_EXPERT_BASE_URL;
const API_KEY = process.env.ASK_EXPERT_API_KEY;
const MODEL_NAME = process.env.ASK_EXPERT_MODEL_NAME || 'o3';

// Validate configuration
if (!BASE_URL) {
  throw new Error('ASK_EXPERT_BASE_URL environment variable is required');
}

if (!API_KEY) {
  throw new Error('ASK_EXPERT_API_KEY environment variable is required');
}

// Validate argument format
export const isValidQuestionArgs = (args) => {
  return typeof args === 'object' &&
    args !== null &&
    typeof args.question === 'string' &&
    args.question.trim().length > 0;
};

// Helper function to check for valid URL (simplified)
const isValidUrl = (string) => {
  try {
    const url = new URL(string);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (_) {
    return false;
  }
};

// Validate argument format for image questions
export const isValidImageQuestionArgs = (args) => {
  return typeof args === 'object' &&
    args !== null &&
    typeof args.prompt === 'string' &&
    args.prompt.trim().length > 0 &&
    typeof args.image === 'string' &&
    args.image.trim().length > 0;
};

// Helper to get MIME type from extension or URL headers
export function getMimeType(filePathOrUrl, headers = {}) {
  const contentTypeHeader = headers['content-type'];
  if (contentTypeHeader) {
    return contentTypeHeader.split(';')[0]; // e.g., 'image/jpeg'
  }

  const ext = path.extname(filePathOrUrl).toLowerCase();
  switch (ext) {
    case '.png': return 'image/png';
    case '.jpeg':
    case '.jpg': return 'image/jpeg';
    case '.gif': return 'image/gif';
    case '.webp': return 'image/webp';
    default:
      // For URLs without clear extension or content-type, or unknown local files
      console.warn(`Could not determine MIME type for ${filePathOrUrl} from extension. Defaulting to image/jpeg.`);
      return 'image/jpeg'; // Default or throw error
  }
}

export class AskExpertServer {
  constructor() {
    this.server = new Server(
      {
        name: 'ask-an-expert',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {}, // Keep this as an empty object as in the working version
        },
      }
    );

    // Configure axios instance
    this.axiosInstance = axios.create({
      baseURL: BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      timeout: 60000, // 60 seconds timeout
    });

    // Set up tool handlers
    this.setupToolHandlers();
    
    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  // Process the image input string (URL, file path, or base64)
  async _processImageInput(imageString) {
    // 1. Check if it's already a base64 data URI
    if (imageString.startsWith('data:image')) {
      // Validate if it's a well-formed data URI (basic check)
      if (!/^data:image\/[a-zA-Z]+;base64,/.test(imageString)) {
          throw new McpError(ErrorCode.InvalidParams, "Invalid base64 data URI format.");
      }
      return imageString;
    }

    // 2. Check if it's a URL
    if (isValidUrl(imageString)) {
      try {
        const response = await this.axiosInstance.get(imageString, {
          responseType: 'arraybuffer', // Important for binary data
          // Do not use the global baseURL for external image URLs
          baseURL: undefined,
        });
        const imageBuffer = Buffer.from(response.data, 'binary');
        const base64Data = imageBuffer.toString('base64');
        const mimeType = getMimeType(imageString, response.headers);
        if (!mimeType.startsWith('image/')) {
            throw new McpError(ErrorCode.InvalidParams, `Downloaded content from ${imageString} is not a recognized image type (MIME: ${mimeType}).`);
        }
        return `data:${mimeType};base64,${base64Data}`;
      } catch (err) {
        console.error(`Error downloading or processing image URL ${imageString}:`, err);
        if (axios.isAxiosError(err)) {
            throw new McpError(ErrorCode.NetworkError, `Failed to download image from URL: ${imageString}. ${err.message}`);
        }
        throw new McpError(ErrorCode.InvalidParams, `Error processing image URL ${imageString}: ${err.message}`);
      }
    }

    // 3. Try treating as a local file path
    try {
      const fileBuffer = await fs.readFile(imageString);
      const base64Data = fileBuffer.toString('base64');
      const mimeType = getMimeType(imageString);
       if (!mimeType.startsWith('image/')) {
            throw new McpError(ErrorCode.InvalidParams, `File ${imageString} is not a recognized image type (MIME determined as: ${mimeType}).`);
        }
      return `data:${mimeType};base64,${base64Data}`;
    } catch (err) {
      if (err.code !== 'ENOENT') { // If it's an error other than "file not found"
        console.error(`Error reading image file ${imageString}:`, err);
        throw new McpError(ErrorCode.InvalidParams, `Error reading image file ${imageString}: ${err.message}`);
      }
      // If it was ENOENT, or if it wasn't a URL or data URI, proceed to check if it's raw base64
    }

    // 4. Try treating as a raw base64 string
    // A more robust base64 check (still not perfect for detecting if it's an *image*)
    const looksLikeBase64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(imageString);
    if (looksLikeBase64 && imageString.length > 16) { // Arbitrary length check
      console.warn("Interpreting ambiguous image string as raw base64 and assuming JPEG. For best results, provide a full data URI (e.g., data:image/jpeg;base64,...), a valid URL, or a clear file path.");
      return `data:image/jpeg;base64,${imageString}`; // Default to JPEG for raw base64
    }

    throw new McpError(ErrorCode.InvalidParams, `Invalid image string: not a valid data URI, URL, existing file path, or recognizable raw base64 string. Please check the input: "${imageString.substring(0,100)}..."`);
  }

  setupToolHandlers() {
    // Register the tools that this server provides
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'ask_expert',
          description: 'Ask a question to an AI expert and get a response',
          inputSchema: {
            type: 'object',
            properties: {
              question: {
                type: 'string',
                description: 'The question to ask the AI expert'
              }
            },
            required: ['question']
          }
        },
        {
          name: 'askExpertOnImage',
          description: 'Ask a question to an AI expert about an image and get a response. The image can be a URL, a local file path, or a base64 encoded string. All inputs are converted to base64 data URIs.',
          inputSchema: {
            type: 'object',
            properties: {
              prompt: {
                type: 'string',
                description: 'The question or prompt related to the image'
              },
              image: {
                type: 'string',
                description: 'Image URL, local file path, or base64 encoded image string'
              }
            },
            required: ['prompt', 'image']
          }
        }
      ]
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        let responsePayload;
        if (request.params.name === 'ask_expert') {
          if (!isValidQuestionArgs(request.params.arguments)) {
            throw new McpError(
              ErrorCode.InvalidParams,
              'Invalid question format. Please provide a non-empty question string.'
            );
          }
          const question = request.params.arguments.question;
          const response = await this.askExpertApiCall(question);
          responsePayload = { text: response };

        } else if (request.params.name === 'askExpertOnImage') {
          if (!isValidImageQuestionArgs(request.params.arguments)) {
            throw new McpError(
              ErrorCode.InvalidParams,
              'Invalid arguments for askExpertOnImage. Requires "prompt" (string) and "image" (string).'
            );
          }
          const { prompt, image: imageString } = request.params.arguments;
          // Use the class method now
          const processedImageUrl = await this._processImageInput(imageString);
          const response = await this.askExpertOnImageApiCall(prompt, processedImageUrl);
          responsePayload = { text: response };

        } else {
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${request.params.name}`
          );
        }
        
        return {
          content: [ { type: 'text', ...responsePayload } ]
        };

      } catch (error) {
        console.error(`Error calling AI API for tool ${request.params.name}:`, error);
        let errorMessage = 'An error occurred when communicating with the AI API';
        
        if (error instanceof McpError) {
          throw error; // Rethrow McpError directly
        } else if (axios.isAxiosError(error)) {
          errorMessage = `API error: ${error.response?.data?.error?.message || error.message}`;
        } else {
          errorMessage = error.message || errorMessage;
        }
        
        return {
          content: [
            {
              type: 'text',
              text: errorMessage
            }
          ],
          isError: true
        };
      }
    });
  }

  async askExpertApiCall(question) {
    const payload = {
      model: MODEL_NAME,
      messages: [
        {
          role: 'user',
          content: question
        }
      ],
      temperature: 0.4
    };
    return this.performApiCall(payload);
  }

  async askExpertOnImageApiCall(prompt, imageUrl) {
    const payload = {
      model: MODEL_NAME, // Ensure this model supports vision (e.g., gpt-4o, gpt-4-turbo)
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl, // This will be the data URI or public URL
              },
            },
          ],
        },
      ],
      temperature: 0.4,
      // max_tokens can be important for image analysis responses
      // max_tokens: 1000
    };
    return this.performApiCall(payload);
  }

  async performApiCall(payload) {
    try {
      const response = await this.axiosInstance.post('/v1/chat/completions', payload);
      if (response.data &&
          response.data.choices &&
          response.data.choices.length > 0 &&
          response.data.choices[0].message &&
          response.data.choices[0].message.content) {
        return response.data.choices[0].message.content;
      } else {
        console.error('Unexpected API response format:', response.data);
        throw new Error('Unexpected API response format from AI service.');
      }
    } catch (error) {
      console.error('Error in performApiCall:', error.isAxiosError ? error.toJSON() : error);
      throw error; // Let the caller handle the error
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    console.error('Attempting to connect MCP server via stdio...'); // Added logging
    await this.server.connect(transport);
    console.error('Ask Expert MCP server running on stdio');
  }
}

// --- Main Execution ---
export async function start() {
  const serverInstance = new AskExpertServer();
  await serverInstance.run().catch(err => {
    console.error("Failed to start server:", err);
    // process.exit(1); // Optional: exit if server fails to start, can be disruptive for tests
  });
}

// To run the server when executing the file directly (e.g., via `node index.js`)
// process.argv[1] is the path of the executed script.
// fileURLToPath(import.meta.url) is the absolute path of the current module.
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  start();
}