#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { resolveProjectRoot } from "./workspace.js";
import { registerTools } from "./tools.js";
import { SERVER_INSTRUCTIONS } from "./instructions.js";

// 工作区定位（决议 #13/#18）：CLAUDE_PROJECT_DIR > --project-root > cwd 兜底
const projectRoot = resolveProjectRoot();

const server = new McpServer(
  { name: "cool-teach-mcp", version: "0.1.0" },
  { instructions: SERVER_INSTRUCTIONS },
);

registerTools(server, projectRoot);

const transport = new StdioServerTransport();
await server.connect(transport);
