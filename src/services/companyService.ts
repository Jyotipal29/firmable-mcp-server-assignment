import { companyRepository } from "../repositories/companyRepository.js";
import { InternalError, NotFoundError } from "../mcp/errors.js";

export const companyService = {
  async search(params: { query?: string | undefined; country?: string | undefined; limit: number }) {
    try {
      return await companyRepository.search(params);
    } catch (err) {
      throw new InternalError("Failed to search companies", err);
    }
  },

  async getById(companyId: string) {
    let company;
    try {
      company = await companyRepository.findById(companyId);
    } catch (err) {
      throw new InternalError("Failed to fetch company", err);
    }
    if (!company) {
      throw new NotFoundError(`Company ${companyId} not found`);
    }
    return company;
  },
};
