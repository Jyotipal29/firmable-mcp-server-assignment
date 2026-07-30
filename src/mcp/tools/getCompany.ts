import { z } from "zod";
import { companyService } from "../../services/companyService.js";
import { withToolErrorHandling } from "../toolHandler.js";

export const getCompanyInputSchema = {
  companyId: z.uuid().describe("The company's unique id"),
};

export const getCompanyTool = {
  name: "get_company",
  config: {
    title: "Get Company Details",
    description: "Fetch full details for a single company by id, including website and description.",
    inputSchema: getCompanyInputSchema,
  },
  handler: withToolErrorHandling("get_company", async (input: { companyId: string }) => {
    return companyService.getById(input.companyId);
  }),
};
