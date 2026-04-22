import { test as base } from '@playwright/test';
import { ApiHelper } from '../helpers/api.helper';
import { Logger } from '../utils/logger';

export type ApiFixtures = {
  apiHelper: ApiHelper;
};

export const apiFixtures = base.extend<ApiFixtures & { logger: Logger }>({
  apiHelper: async ({ request, logger }, use) => {
    const apiHelper = new ApiHelper(request, logger);
    await use(apiHelper);
  },
});
