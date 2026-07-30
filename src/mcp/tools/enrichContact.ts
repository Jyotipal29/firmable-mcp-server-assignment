import { z } from "zod";
import { enrichmentService } from "../../services/enrichmentService.js";
import { withToolErrorHandling } from "../toolHandler.js";

export const enrichContactInputSchema = {
  contactId: z.uuid().describe("The contact's unique id"),
};

export const enrichContactTool = {
  name: "enrich_contact",
  config: {
    title: "Enrich Contact",
    description:
      "Look up enrichment data (email, LinkedIn profile) for a contact, simulating a third-party enrichment provider lookup.",
    inputSchema: enrichContactInputSchema,
  },
  handler: withToolErrorHandling("enrich_contact", async (input: { contactId: string }) => {
    return enrichmentService.enrich(input.contactId);
  }),
};
