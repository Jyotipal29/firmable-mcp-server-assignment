import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { searchCompaniesTool } from "./tools/searchCompanies.js";
import { getCompanyTool } from "./tools/getCompany.js";
import { searchContactsTool } from "./tools/searchContacts.js";
import { enrichContactTool } from "./tools/enrichContact.js";
import { exportContactsTool } from "./tools/exportContacts.js";

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "account-intelligence-platform",
    version: "1.0.0",
  });

  server.registerTool(searchCompaniesTool.name, searchCompaniesTool.config, searchCompaniesTool.handler);
  server.registerTool(getCompanyTool.name, getCompanyTool.config, getCompanyTool.handler);
  server.registerTool(searchContactsTool.name, searchContactsTool.config, searchContactsTool.handler);
  server.registerTool(enrichContactTool.name, enrichContactTool.config, enrichContactTool.handler);
  server.registerTool(exportContactsTool.name, exportContactsTool.config, exportContactsTool.handler);

  return server;
}
