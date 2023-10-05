/*
 * Copyright 2023 Marius Iversen
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { errorHandler } from '@backstage/backend-common';
import express from 'express';
import Router from 'express-promise-router';
import { Logger } from 'winston';
import {
  getSloIdFromEntity,
  getSloQueryFromEntity,
  getSpaceFromEntity,
  getApmNameFromEntity,
  getApmQueryFromEntity,
  getInstanceNameFromEntity,
} from '@p1llus/backstage-plugin-elastic-common';
import { ElasticInfoProvider } from './elasticInfoProvider';
import { IdentityApi } from '@backstage/plugin-auth-node';
import { CatalogApi } from '@backstage/catalog-client';
import { InputError, AuthenticationError } from '@backstage/errors';
import { getBearerTokenFromAuthorizationHeader } from '@backstage/plugin-auth-node';

export interface RouterOptions {
  logger: Logger;
  elasticInfoProvider: ElasticInfoProvider;
  identity: IdentityApi;
  catalogApi: CatalogApi;
  allowGuests: boolean;
}

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const { logger, elasticInfoProvider, identity, allowGuests, catalogApi } =
    options;

  logger.info('Initializing Elastic plugin backend');

  const router = Router();
  if (!allowGuests) {
    router.use(async (req, res, next) => {
      const user = await identity.getIdentity({ request: req });
      if (!user) {
        res.status(401).json({ message: 'Invalid Backstage token' });
        throw new AuthenticationError('No Backstage token');
      }
      next();
    });
  }
  // TODO: Should it return some 4xx/5xx codes if errors/undefined for the routes?
  router.use(express.json());

  router.get('/slos', async (req, res) => {
    const sloType = req.query.sloType as string;
    const stringEntityRef = req.query.stringEntityRef as string;
    if (!sloType || !stringEntityRef)
      throw new InputError(
        'sloType and stringEntityRef must be provided as a query parameter.',
      );

    const token = getBearerTokenFromAuthorizationHeader(
      req.headers.authorization,
    );

    const entity = await catalogApi.getEntityByRef(stringEntityRef, {
      token: token,
    });

    if (!entity) {
      throw new InputError(`Entity ref missing, ${stringEntityRef}`);
    }

    const space = getSpaceFromEntity(entity);
    const instanceName = getInstanceNameFromEntity(entity);
    if (!instanceName)
      throw new InputError('instanceName is missing from annotations.');

    if (sloType === 'multi') {
      const sloQuery = getSloQueryFromEntity(entity);
      if (!sloQuery) throw new InputError('sloQuery missing from annotations.');
      logger.debug(
        `Retrieving SLO for Query: ${sloQuery} on Kibana instance name ${instanceName}.`,
      );
      res.json(
        await elasticInfoProvider.getSlos({
          sloQuery: sloQuery,
          space: space,
          instanceName: instanceName,
        }),
      );
      return;
    } else if (sloType === 'single') {
      const [sloId, sloInstanceId] = getSloIdFromEntity(entity);
      if (!sloId) throw new InputError('sloId is missing from annotations.');
      logger.debug(
        sloInstanceId
          ? `Retrieving SLO for ID: ${sloId} and instance ID: ${sloInstanceId} on Kibana instance name ${instanceName}.`
          : `Retrieving SLO for ID: ${sloId} on Kibana instance name ${instanceName}.`,
      );
      res.json(
        await elasticInfoProvider.getSlo({
          sloId: sloId,
          instanceName: instanceName,
          space: space,
          sloInstanceId: sloInstanceId,
        }),
      );
      return;
    }
    throw new InputError(`Unsupported or missing SLO Type in /slos endpoint.`);
  });
  router.get('/apm', async (req, res) => {
    const apmType = req.query.apmType as string;
    const stringEntityRef = req.query.stringEntityRef as string;

    if (!apmType || !stringEntityRef)
      throw new InputError(
        'apmType and stringEntityRef must be provided as a query parameter.',
      );

    const token = getBearerTokenFromAuthorizationHeader(
      req.headers.authorization,
    );

    const entity = await catalogApi.getEntityByRef(stringEntityRef, {
      token: token,
    });

    if (!entity) {
      throw new InputError(`Entity ref missing, ${stringEntityRef}`);
    }
    const space = getSpaceFromEntity(entity);
    const instanceName = getInstanceNameFromEntity(entity);
    if (!instanceName)
      throw new InputError('instanceName is missing from annotations.');

    if (apmType === 'multi') {
      const [groupBy, dslQuery] = getApmQueryFromEntity(entity);
      if (!groupBy) throw new InputError('groupBy is missing from entity.');
      logger.debug(
        dslQuery
          ? `Retrieving APM data grouped by: ${groupBy} and query: ${dslQuery} on Elasticsearch instance name ${instanceName}.`
          : `Retrieving APM data grouped by: ${groupBy} on Elasticsearch instance name ${instanceName}.`,
      );
      res.json(
        await elasticInfoProvider.getApmMultiStats({
          groupBy: groupBy,
          instanceName: instanceName,
          space: space,
          dslQuery: dslQuery,
        }),
      );
      return;
    } else if (apmType === 'single') {
      const [serviceName, dslQuery] = getApmNameFromEntity(entity);
      if (!serviceName)
        throw new InputError('serviceName is missing from entity.');
      logger.debug(
        dslQuery
          ? `Retrieving APM data for service name: ${serviceName} and query: ${dslQuery} on Elasticsearch instance name ${instanceName}.`
          : `Retrieving APM data for service name: ${serviceName} on Elasticsearch instance name ${instanceName}.`,
      );
      res.json(
        await elasticInfoProvider.getApmStats({
          serviceName: serviceName,
          instanceName: instanceName,
          space: space,
          dslQuery: dslQuery,
        }),
      );
      return;
    }
    throw new InputError(`Unsupported or missing APM Type in /apm endpoint.`);
  });
  router.use(errorHandler());
  return router;
}
