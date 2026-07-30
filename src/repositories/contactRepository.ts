import { prisma } from "../db/client.js";

export interface ContactSearchFilters {
  companyId?: string | undefined;
  jobTitle?: string | undefined;
  limit: number;
}

export const contactRepository = {
  /**
   * Deliberately projects only {id, name, title} — email/linkedin are never
   * selectable through this method, so search results structurally cannot
   * leak enrichment data regardless of what callers do with the result.
   */
  async search(filters: ContactSearchFilters) {
    return prisma.contact.findMany({
      where: {
        companyId: filters.companyId ?? undefined,
        title: filters.jobTitle ? { contains: filters.jobTitle, mode: "insensitive" } : undefined,
      },
      select: { id: true, name: true, title: true },
      take: filters.limit,
    });
  },

  async findEnrichmentById(id: string) {
    return prisma.contact.findUnique({
      where: { id },
      select: { id: true, email: true, linkedin: true },
    });
  },

  async findManyForExport(ids: string[]) {
    if (ids.length === 0) return [];
    return prisma.contact.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, title: true, companyId: true },
    });
  },
};
