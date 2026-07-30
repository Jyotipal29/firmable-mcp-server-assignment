import { z } from "zod";
import { contactService } from "../../services/contactService.js";
import { withToolErrorHandling } from "../toolHandler.js";

export const searchContactsInputSchema = {
  companyId: z.uuid().optional().describe("Restrict results to this company"),
  jobTitle: z.string().trim().min(1).optional().describe("Fuzzy match against job title, e.g. 'Engineer'"),
};

export const searchContactsTool = {
  name: "search_contacts",
  config: {
    title: "Search Contacts",
    description:
      "Search contacts by company and/or job title. Returns name/title only — use enrich_contact for email/LinkedIn.",
    inputSchema: searchContactsInputSchema,
  },
  handler: withToolErrorHandling(
    "search_contacts",
    async (input: { companyId?: string; jobTitle?: string }) => {
      const contacts = await contactService.search(input);
      return { contacts };
    },
  ),
};
