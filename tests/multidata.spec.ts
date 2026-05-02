import employees from "../test-data/employee.json";
import { faker } from "@faker-js/faker";
import { test, expect } from "../fixtures/base.fixture";

type Employee = {
  firstName: string;
  lastName: string;
  email: string;
  address: string;
  department: string;
};

function transformUser(employee: Employee): Employee {
  const firstName = `${faker.person.firstName().toLowerCase()}`;
  const lastName = `${faker.person.lastName().toLowerCase()}`;
  return {
    ...employee,
    firstName,
    lastName,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@test.com`,
  };
}

test.describe("User Tests", () => {
  employees.forEach((employee, index) => {
    test(`Test user ${index}`, async ({ logger }) => {
      const dynamicUser = transformUser(employee);
      logger.info(JSON.stringify(dynamicUser));
      expect(dynamicUser).toBeDefined();
      logger.info(
        `Test user ${index}: ${dynamicUser.firstName} ${dynamicUser.lastName} ${dynamicUser.email} ${dynamicUser.address} ${dynamicUser.department}`,
      );
    });
  });
});
