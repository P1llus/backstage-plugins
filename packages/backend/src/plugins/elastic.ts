import {
  createRouter,
  DefaultElasticInfoProvider,
} from '@p1llus/backstage-plugin-elastic-backend';
import { Router } from 'express';
import { PluginEnvironment } from '../types';
import { CatalogClient } from '@backstage/catalog-client';

export default async function createPlugin(
  env: PluginEnvironment,
): Promise<Router> {
  const catalogApi = new CatalogClient({ discoveryApi: env.discovery });
  return await createRouter({
    logger: env.logger,
    elasticInfoProvider: DefaultElasticInfoProvider.fromConfig(env.config),
    identity: env.identity,
    catalogApi,
    allowGuests: DefaultElasticInfoProvider.getAllowedGuests(env.config),
  });
}
