import { z } from "zod";
import { exportService } from "../../services/exportService.js";
import { withToolErrorHandling } from "../toolHandler.js";

export const exportContactsInputSchema = {
  contactIds: z.array(z.uuid()).min(1).max(500).describe("Contact ids to include in the export"),
};

export const exportContactsTool = {
  name: "export_contacts",
  config: {
    title: "Export Contacts",
    description: "Export the given contacts to a CSV file and return a time-limited download URL.",
    inputSchema: exportContactsInputSchema,
  },
  handler: withToolErrorHandling("export_contacts", async (input: { contactIds: string[] }) => {
    return exportService.exportContacts(input.contactIds);
  }),
};
