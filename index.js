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

// Configuration from environment variables
const BASE_URL = process.env.ASK_EXPERT_BASE_URL;
const API_KEY = process.env.ASK_EXPERT_API_KEY;
const MODEL_NAME = process.env.ASK_EXPERT_MODEL_NAME || 'o1';

// Validate configuration
if (!BASE_URL) {
  throw new Error('ASK_EXPERT_BASE_URL environment variable is required');
}

if (!API_KEY) {
  throw new Error('ASK_EXPERT_API_KEY environment variable is required');
}

// Validate argument format
const isValidQuestionArgs = (args) => {
  return typeof args === 'object' &&
    args !== null &&
    typeof args.question === 'string' &&
    args.question.trim().length > 0;
};

class AskExpertServer {
  constructor() {
    this.server = new Server(
      {
        name: 'ask-an-expert',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
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
        }
      ]
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name !== 'ask_expert') {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${request.params.name}`
        );
      }

      // Validate arguments
      if (!isValidQuestionArgs(request.params.arguments)) {
        throw new McpError(
          ErrorCode.InvalidParams,
          'Invalid question format. Please provide a non-empty question string.'
        );
      }

      const question = request.params.arguments.question;

      try {
        // Make request to the AI API
        const response = await this.askExpert(question);
        
        return {
          content: [
            {
              type: 'text',
              text: response
            }
          ]
        };
      } catch (error) {
        console.error('Error calling AI API:', error);
        
        let errorMessage = 'An error occurred when communicating with the AI API';
        
        if (axios.isAxiosError(error)) {
          errorMessage = `API error: ${error.response?.data?.error?.message || error.message}`;
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

  async askExpert(question) {
    try {
      // Format the payload according to OpenAI API requirements
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

      // Send request to the AI API
      const response = await this.axiosInstance.post('/v1/chat/completions', payload);
      
      // Extract and return the assistant's message content
      if (response.data && 
          response.data.choices && 
          response.data.choices.length > 0 && 
          response.data.choices[0].message) {
        return response.data.choices[0].message.content;
      } else {
        throw new Error('Unexpected API response format');
      }
    } catch (error) {
      console.error('Error in askExpert:', error);
      throw error;
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Ask Expert MCP server running on stdio');
  }
}
// --- Main Execution ---
const server = new AskExpertServer();
server.run().catch(console.error);