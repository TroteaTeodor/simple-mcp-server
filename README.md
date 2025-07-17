# Simple MCP Server Example

A basic MCP (Model Context Protocol) server that works with kagent.dev.

## Features

- Simple HTTP server with SSE (Server-Sent Events) support
- 4 basic tools: hello, echo, get_time, add_numbers
- Proper MCP protocol implementation
- Health checks and status endpoints
- Docker support

## Tools

1. **hello** - Say hello to someone
2. **echo** - Echo back a message
3. **get_time** - Get current time
4. **add_numbers** - Add two numbers

## Quick Start

### Local Development

```bash
npm install
npm start
```

### Docker

```bash
docker build -t simple-mcp-example .
docker run -p 8000:8000 simple-mcp-example
```

### Deploy to kagent

```bash
python deploy_mcp.py github.com/yourusername/simple-mcp-example
```

## Endpoints

- `GET /` - Server info
- `GET /health` - Health check
- `GET /status` - Server status with tools
- `GET /sse` - SSE endpoint for kagent
- `POST /sse` - Tool execution endpoint

## Testing

Test the SSE endpoint:
```bash
curl -N http://localhost:8000/sse
```

Test a tool:
```bash
curl -X POST http://localhost:8000/sse \
  -H "Content-Type: application/json" \
  -d '{"method":"tools/call","params":{"name":"hello","arguments":{"name":"World"}}}'
``` 