import { contactRepository } from "../repositories/contactRepository.js";
import { InternalError, NotFoundError } from "../mcp/errors.js";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Simulates calling out to a third-party enrichment provider against our
 * seeded "known" data, rather than just reading columns already exposed by
 * search_contacts. Real integrations (Clearbit, Apollo, etc.) are
 * network calls with latency and a confidence/source signal — we mirror
 * that shape here even though the data is local.
 */
export const enrichmentService = {
  async enrich(contactId: string) {
    let record;
    try {
      record = await contactRepository.findEnrichmentById(contactId);
    } catch (err) {
      throw new InternalError("Failed to enrich contact", err);
    }

    if (!record) {
      throw new NotFoundError(`Contact ${contactId} not found`);
    }

    await sleep(50 + Math.floor(Math.random() * 100));

    return {
      email: record.email,
      linkedin: record.linkedin,
      source: "internal-directory",
      confidence: record.email && record.linkedin ? "high" : "partial",
      lastVerified: new Date().toISOString().slice(0, 10),
    };
  },
};
