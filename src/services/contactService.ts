import { contactRepository } from "../repositories/contactRepository.js";
import { companyRepository } from "../repositories/companyRepository.js";
import { InternalError, NotFoundError } from "../mcp/errors.js";

const DEFAULT_SEARCH_LIMIT = 50;

export const contactService = {
  async search(params: { companyId?: string | undefined; jobTitle?: string | undefined }) {
    if (params.companyId) {
      let company;
      try {
        company = await companyRepository.findById(params.companyId);
      } catch (err) {
        throw new InternalError("Failed to verify company", err);
      }
      if (!company) {
        throw new NotFoundError(`Company ${params.companyId} not found`);
      }
    }

    try {
      return await contactRepository.search({ ...params, limit: DEFAULT_SEARCH_LIMIT });
    } catch (err) {
      throw new InternalError("Failed to search contacts", err);
    }
  },

  async findManyForExport(contactIds: string[]) {
    try {
      return await contactRepository.findManyForExport(contactIds);
    } catch (err) {
      throw new InternalError("Failed to load contacts for export", err);
    }
  },
};
