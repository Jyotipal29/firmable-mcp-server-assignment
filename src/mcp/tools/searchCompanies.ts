import { z } from "zod";
import { companyService } from "../../services/companyService.js";
import { withToolErrorHandling } from "../toolHandler.js";

export const searchCompaniesInputSchema = {
  query: z.string().trim().min(1).optional().describe("Free-text match against company name or industry, e.g. 'software' or 'Acme'"),
  country: z.string().trim().min(1).optional().describe("Exact country filter, e.g. 'Australia'"),
  limit: z.coerce.number().int().min(1).max(100).default(20).describe("Max results to return (1-100)"),
};

export const searchCompaniesTool = {
  name: "search_companies",
  config: {
    title: "Search Companies",
    description:
      "Search the company database by name or industry (fuzzy match on either) and/or country. Returns a summary of matching companies.",
    inputSchema: searchCompaniesInputSchema,
  },
  handler: withToolErrorHandling(
    "search_companies",
    async (input: { query?: string; country?: string; limit: number }) => {
      const results = await companyService.search(input);
      return { results };
    },
  ),
};
