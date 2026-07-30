import { faker } from "@faker-js/faker";
import { prisma } from "../db/client.js";
import type { Prisma } from "../generated/prisma/client.js";
import { logger } from "../logging/logger.js";

const SEED_VALUE = 20260728;
const COMPANY_COUNT = 50;
const CONTACT_COUNT = 200;

const COUNTRIES = ["Australia", "United States", "United Kingdom", "Canada", "Singapore", "Germany", "India"];
const INDUSTRIES = [
  "Software",
  "Fintech",
  "Healthtech",
  "E-commerce",
  "Cybersecurity",
  "Marketing Technology",
  "Logistics",
  "AI & Machine Learning",
  "Renewable Energy",
  "Edtech",
];
const JOB_TITLES = [
  "Chief Executive Officer",
  "Chief Technology Officer",
  "VP of Engineering",
  "Senior Software Engineer",
  "Software Engineer",
  "Product Manager",
  "Head of Sales",
  "Account Executive",
  "Marketing Manager",
  "Data Scientist",
  "Customer Success Manager",
  "Operations Lead",
];

async function seed() {
  faker.seed(SEED_VALUE);

  logger.info("Clearing existing data...");
  await prisma.contact.deleteMany();
  await prisma.company.deleteMany();

  logger.info(`Generating ${COMPANY_COUNT} companies...`);
  const companyRows = Array.from({ length: COMPANY_COUNT }, () => {
    const name = faker.company.name();
    return {
      name,
      website: `https://${faker.internet.domainName()}`,
      industry: faker.helpers.arrayElement(INDUSTRIES),
      employees: faker.number.int({ min: 5, max: 5000 }),
      country: faker.helpers.arrayElement(COUNTRIES),
      description: faker.company.catchPhrase() + ". " + faker.company.buzzPhrase() + ".",
    };
  });

  const insertedCompanies = await prisma.company.createManyAndReturn({
    data: companyRows,
    select: { id: true },
  });

  logger.info(`Generating ${CONTACT_COUNT} contacts across ${insertedCompanies.length} companies...`);

  // Distribute contacts unevenly across companies (min 1 each), weighted by random company "size".
  const weights = insertedCompanies.map(() => faker.number.float({ min: 0.2, max: 1 }));
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  const counts = insertedCompanies.map((_, i) =>
    Math.max(1, Math.round((weights[i]! / totalWeight) * (CONTACT_COUNT - insertedCompanies.length))),
  );

  const contactRows: Prisma.ContactCreateManyInput[] = [];
  let remaining = CONTACT_COUNT;
  insertedCompanies.forEach((company, i) => {
    const countForCompany = Math.min(counts[i]! + 1, remaining - (insertedCompanies.length - 1 - i));
    for (let j = 0; j < countForCompany && remaining > 0; j++) {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      contactRows.push({
        companyId: company.id,
        name: `${firstName} ${lastName}`,
        title: faker.helpers.arrayElement(JOB_TITLES),
        email: faker.internet.email({ firstName, lastName }).toLowerCase(),
        linkedin: `https://linkedin.com/in/${faker.helpers.slugify(`${firstName}-${lastName}`).toLowerCase()}`,
      });
      remaining--;
    }
  });

  // If rounding left contacts unassigned, top up on random companies.
  while (remaining > 0) {
    const company = faker.helpers.arrayElement(insertedCompanies);
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    contactRows.push({
      companyId: company.id,
      name: `${firstName} ${lastName}`,
      title: faker.helpers.arrayElement(JOB_TITLES),
      email: faker.internet.email({ firstName, lastName }).toLowerCase(),
      linkedin: `https://linkedin.com/in/${faker.helpers.slugify(`${firstName}-${lastName}`).toLowerCase()}`,
    });
    remaining--;
  }

  await prisma.contact.createMany({ data: contactRows });

  logger.info(
    { companies: insertedCompanies.length, contacts: contactRows.length },
    "Seed complete.",
  );
  process.exit(0);
}

seed().catch((err) => {
  logger.error({ err }, "Seed failed");
  process.exit(1);
});
