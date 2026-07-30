import { prisma } from "../db/client.js";

export interface CompanySearchFilters {
  query?: string | undefined;
  country?: string | undefined;
  limit: number;
}

export const companyRepository = {
  async search(filters: CompanySearchFilters) {
    return prisma.company.findMany({
      where: {
        OR: filters.query
          ? [
              { name: { contains: filters.query, mode: "insensitive" } },
              { industry: { contains: filters.query, mode: "insensitive" } },
            ]
          : undefined,
        country: filters.country ?? undefined,
      },
      select: { id: true, name: true, industry: true, employees: true },
      take: filters.limit,
    });
  },

  async findById(id: string) {
    return prisma.company.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        website: true,
        industry: true,
        employees: true,
        country: true,
        description: true,
      },
    });
  },
};
