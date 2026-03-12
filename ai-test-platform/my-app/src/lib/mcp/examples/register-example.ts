// MCP Tool Registration Example
// This file demonstrates how to register all MCP tools in the server

import { MCPServer } from "../server";
import { MCPClient } from "../client";

// Import all tools
import { PDFParserTool } from "../tools/pdf-parser";
import { DOCXParserTool } from "../tools/docx-parser";
import { OCRExtractorTool } from "../tools/ocr-extractor";
import { EquivalenceClassTool } from "../tools/equivalence-class";
import { BoundaryValueTool } from "../tools/boundary-value";
import { ScenarioMethodTool } from "../tools/scenario-method";
import { JiraSyncTool } from "../tools/jira-sync";
import { TestRailExportTool } from "../tools/testrail-export";
import { WebhookNotifyTool } from "../tools/webhook-notify";

/**
 * Register all MCP tools to the server
 * @param server - The MCP server instance
 */
export function registerAllTools(server: MCPServer): void {
  // Document parsing tools
  server.registerTool(new PDFParserTool());
  server.registerTool(new DOCXParserTool());
  server.registerTool(new OCRExtractorTool());
  
  // Testing technique tools
  server.registerTool(new EquivalenceClassTool());
  server.registerTool(new BoundaryValueTool());
  server.registerTool(new ScenarioMethodTool());
  
  // Integration tools
  server.registerTool(new JiraSyncTool());
  server.registerTool(new TestRailExportTool());
  server.registerTool(new WebhookNotifyTool());
  
  console.log("[MCP] All tools registered successfully");
}

/**
 * Example: Initialize MCP server with all tools
 */
export async function initializeMCPServer(): Promise<MCPServer> {
  const server = new MCPServer({
    name: "ai-test-platform",
    version: "1.0.0"
  });
  
  // Register all tools
  registerAllTools(server);
  
  // Start server
  await server.start();
  
  return server;
}

/**
 * Example: Use client to call tools
 */
export async function exampleToolUsage(): Promise<void> {
  const client = new MCPClient();
  await client.connect();
  
  // List available tools
  const tools = await client.listTools();
  console.log("Available tools:", tools.map(t => t.name));
  
  // Example 1: Parse PDF
  const pdfResult = await client.callTool("parse_pdf", {
    file_path: "./docs/requirements.pdf",
    options: { extract_tables: true }
  });
  console.log("PDF content length:", pdfResult.data.text.length);
  
  // Example 2: Generate equivalence classes
  const eqResult = await client.callTool("generate_equivalence_classes", {
    input_spec: {
      name: "username",
      type: "string",
      constraints: { min: 2, max: 20 }
    }
  });
  console.log("Equivalence classes:", eqResult.data.valid_classes.length);
  
  // Example 3: Send webhook notification
  await client.callTool("send_webhook", {
    platform: "feishu",
    webhook_url: process.env.FEISHU_WEBHOOK_URL!,
    message: {
      type: "text",
      content: "MCP tools initialized successfully"
    }
  });
  
  await client.disconnect();
}

/**
 * Example: Register custom tool
 */
export function registerCustomTool(server: MCPServer): void {
  const customTool = {
    name: "custom_analysis",
    description: "Custom analysis tool for specific requirements",
    parameters: {
      type: "object",
      properties: {
        input: { type: "string" },
        options: { type: "object" }
      },
      required: ["input"]
    },
    async execute(params: any) {
      // Custom implementation
      return {
        success: true,
        data: { result: "Analysis complete" }
      };
    }
  };
  
  server.registerTool(customTool);
}

export { registerAllTools, initializeMCPServer, exampleToolUsage, registerCustomTool };
