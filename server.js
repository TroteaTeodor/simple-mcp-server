#!/usr/bin/env node

import express from 'express';
import cors from 'cors';

class SimpleMCPServer {
  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '8000');
    this.host = process.env.HOST || '0.0.0.0';
    
    this.setupExpress();
    this.setupEndpoints();
  }

  setupExpress() {
    // Enable CORS
    this.app.use(cors());
    this.app.use(express.json());
  }

  setupEndpoints() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        server: 'simple-mcp-example'
      });
    });

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        name: 'simple-mcp-example',
        type: 'mcp-server',
        version: '1.0.0',
        endpoints: ['/sse', '/health', '/status']
      });
    });

    // Status endpoint
    this.app.get('/status', (req, res) => {
      res.json({
        status: 'ok',
        tools: this.getTools(),
        server: {
          name: 'simple-mcp-example',
          version: '1.0.0'
        }
      });
    });

    // SSE endpoint - this is what kagent connects to
    this.app.get('/sse', (req, res) => {
      console.log('SSE connection established from:', req.ip);
      
      // Set SSE headers exactly as kagent expects
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      // Send initial connection message (MCP protocol)
      const initMessage = {
        jsonrpc: '2.0',
        method: 'notifications/initialized',
        params: {}
      };
      console.log('Sending init message:', JSON.stringify(initMessage));
      res.write(`data: ${JSON.stringify(initMessage)}\n\n`);

      // Send tools list immediately (MCP protocol)
      const tools = this.getTools();
      const toolsMessage = {
        jsonrpc: '2.0',
        method: 'tools/list',
        params: { tools }
      };
      console.log('Sending tools message:', JSON.stringify(toolsMessage));
      res.write(`data: ${JSON.stringify(toolsMessage)}\n\n`);

      // Keep connection alive with comments (SSE spec)
      const keepAlive = setInterval(() => {
        res.write(': keep-alive\n\n');
      }, 15000);

      // Handle client disconnect
      req.on('close', () => {
        console.log('SSE connection closed');
        clearInterval(keepAlive);
        res.end();
      });
    });

    // POST endpoint for tool calls
    this.app.post('/sse', async (req, res) => {
      try {
        console.log('Tool call request:', JSON.stringify(req.body));
        const result = await this.handleToolCall(req.body);
        console.log('Tool call result:', JSON.stringify(result));
        res.json(result);
      } catch (error) {
        console.error('Tool call error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Test endpoint to verify tools are available
    this.app.get('/test', (req, res) => {
      const tools = this.getTools();
      res.json({
        message: 'Simple MCP Server is running!',
        tools: tools.map(t => t.name),
        total_tools: tools.length,
        timestamp: new Date().toISOString()
      });
    });

    // Tools discovery endpoint (alternative format)
    this.app.get('/tools', (req, res) => {
      const tools = this.getTools();
      res.json({ tools });
    });

    // MCP endpoint for direct tool calls
    this.app.post('/mcp', async (req, res) => {
      try {
        const result = await this.handleToolCall(req.body);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  }

  getTools() {
    return [
      {
        name: 'hello',
        description: 'Say hello to someone',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name of the person to greet'
            }
          },
          required: ['name']
        }
      },
      {
        name: 'echo',
        description: 'Echo back the input message',
        inputSchema: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Message to echo back'
            }
          },
          required: ['message']
        }
      },
      {
        name: 'get_time',
        description: 'Get the current time',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        }
      },
      {
        name: 'add_numbers',
        description: 'Add two numbers together',
        inputSchema: {
          type: 'object',
          properties: {
            a: {
              type: 'number',
              description: 'First number'
            },
            b: {
              type: 'number',
              description: 'Second number'
            }
          },
          required: ['a', 'b']
        }
      }
    ];
  }

  async handleToolCall(request) {
    const { method, params } = request;
    
    if (method === 'tools/list') {
      return { tools: this.getTools() };
    }
    
    if (method === 'tools/call') {
      const { name, arguments: args } = params;
      
      switch (name) {
        case 'hello':
          return {
            content: [{
              type: 'text',
              text: `Hello, ${args.name}! Welcome to the simple MCP server.`
            }]
          };
          
        case 'echo':
          return {
            content: [{
              type: 'text',
              text: `Echo: ${args.message}`
            }]
          };
          
        case 'get_time':
          return {
            content: [{
              type: 'text',
              text: `Current time: ${new Date().toISOString()}`
            }]
          };
          
        case 'add_numbers':
          const result = args.a + args.b;
          return {
            content: [{
              type: 'text',
              text: `${args.a} + ${args.b} = ${result}`
            }]
          };
          
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    }
    
    throw new Error(`Unknown method: ${method}`);
  }

  start() {
    this.app.listen(this.port, this.host, () => {
      console.log(`Simple MCP Server running on http://${this.host}:${this.port}`);
      console.log(`Health check: http://${this.host}:${this.port}/health`);
      console.log(`SSE endpoint: http://${this.host}:${this.port}/sse`);
      console.log(`Status endpoint: http://${this.host}:${this.port}/status`);
      console.log('Available tools: hello, echo, get_time, add_numbers');
    });
  }
}

// Start the server
const server = new SimpleMCPServer();
server.start(); 