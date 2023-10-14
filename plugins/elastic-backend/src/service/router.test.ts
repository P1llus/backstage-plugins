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

import { IdentityApi } from '@backstage/plugin-auth-node';
import { CatalogApi } from '@backstage/catalog-client';
import { stringifyEntityRef } from '@backstage/catalog-model';
import { ElasticInfoProvider } from './elasticInfoProvider';
import { createRouter } from './router';
import express from 'express';
import { getVoidLogger } from '@backstage/backend-common';
import { Entity } from '@backstage/catalog-model';
import request from 'supertest';
import {
  BackstageIdentityResponse,
  IdentityApiGetIdentityRequest,
} from '@backstage/plugin-auth-node';
import {
  SloResponse,
  SlosResponse,
  ApmStatsResponse,
  ApmMultiStatsResponse,
} from '@p1llus/backstage-plugin-elastic-common';

describe('createRouter', () => {
  let identityApi: jest.Mocked<IdentityApi>;
  const elasticInfoProvider: jest.Mocked<ElasticInfoProvider> = {
    getSlo: jest.fn(),
    getSlos: jest.fn(),
    getApmStats: jest.fn(),
    getApmMultiStats: jest.fn(),
  };
  let app: express.Express;

  const catalogApi = {
    addLocation: jest.fn(),
    getEntities: jest.fn(),
    getEntityByRef: jest.fn(),
    getLocationByRef: jest.fn(),
    getLocationById: jest.fn(),
    removeLocationById: jest.fn(),
    removeEntityByUid: jest.fn(),
    refreshEntity: jest.fn(),
    getEntityAncestors: jest.fn(),
    getEntityFacets: jest.fn(),
    validateEntity: jest.fn(),
  };

  const getIdentity = jest.fn();

  beforeAll(async () => {
    getIdentity.mockImplementation(
      async ({
        request: _request,
      }: IdentityApiGetIdentityRequest): Promise<
        BackstageIdentityResponse | undefined
      > => {
        return {
          identity: {
            userEntityRef: 'user:default/guest',
            ownershipEntityRefs: [],
            type: 'user',
          },
          token: 'token',
        };
      },
    );

    const router = await createRouter({
      logger: getVoidLogger(),
      elasticInfoProvider,
      identity: identityApi,
      catalogApi: catalogApi as Partial<CatalogApi> as CatalogApi,
      allowGuests: true,
    });

    app = express().use(router);
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('GET /slos sloType single', () => {
    const sloResponse = {
      baseUrl: 'https://test.com',
      res: {
        id: 'sloidtest',
        name: 'slonametest',
        description: 'slodesctest',
        indicator: {
          type: 'sli.kql.custom',
          params: {
            index: 'metrics-*:traces-apm-*',
            filter: 'service.name : testservice AND transaction.type: testtype',
            good: 'http.response.status_code<500',
            total: 'http.response.status_code :*',
            timestampField: '@timestamp',
          },
        },
        budgetingMethod: 'occurrences',
        timeWindow: {
          duration: '7d',
          type: 'rolling',
        },
        objective: {
          target: 0.99,
        },
        tags: ['testtag1', 'testtag2'],
        groupBy: 'host.name',
        settings: {
          syncDelay: '1m',
          frequency: '1m',
        },
        revision: 1,
        enabled: true,
        createdAt: '2023-09-26T14:52:57.861Z',
        updatedAt: '2023-09-26T14:52:57.861Z',
        instanceId: 'testhost.local',
        summary: {
          sliValue: 0.989362,
          errorBudget: {
            initial: 0.01,
            consumed: 1.0638,
            remaining: -0.0638,
            isEstimated: false,
          },
          status: 'VIOLATED',
        },
      },
    } as SloResponse;
    it('returns proper response', async () => {
      const entity: Entity = {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'System',
        metadata: {
          annotations: {
            'elastic/instance': 'default',
            'elastic/slo-id': 'sloidtest',
          },
          name: 'backstage',
        },
      };
      const stringEntityRef = stringifyEntityRef(entity);
      elasticInfoProvider.getSlo.mockResolvedValue(sloResponse);
      catalogApi.getEntityByRef.mockResolvedValue(entity);
      const response = await request(app).get(
        `/slos?sloType=single&stringEntityRef=${stringEntityRef}`,
      );
      expect(response.status).toEqual(200);
      expect(response.body).toEqual(sloResponse);
    });
    it('returns 400 incorrect annotation', async () => {
      const entity: Entity = {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'System',
        metadata: {
          annotations: {
            'elastic/instance': 'default',
          },
          name: 'backstage',
        },
      };
      const stringEntityRef = stringifyEntityRef(entity);
      elasticInfoProvider.getSlo.mockResolvedValue(sloResponse);
      catalogApi.getEntityByRef.mockResolvedValue(entity);
      const response = await request(app).get(
        `/slos?sloType=single&stringEntityRef=${stringEntityRef}`,
      );
      expect(response.status).toEqual(400);
      expect(response.body.error.message).toEqual(
        'sloId is missing from annotations.',
      );
    });
  });
  describe('GET /slos sloType multi', () => {
    const slosResponse = {
      baseUrl: 'https://test.com',
      res: {
        page: 1,
        perPage: 2,
        total: 384,
        results: [
          {
            id: 'sloidtest1',
            name: 'slonametest1',
            description: '',
            indicator: {
              type: 'sli.kql.custom',
              params: {
                index: 'metrics-*:traces-apm-*',
                filter:
                  'service.name : testservice AND transaction.type: "testtype" ',
                good: 'http.response.status_code<500',
                total: 'http.response.status_code :*',
                timestampField: '@timestamp',
              },
            },
            budgetingMethod: 'occurrences',
            timeWindow: {
              duration: '7d',
              type: 'rolling',
            },
            objective: {
              target: 0.99,
            },
            tags: ['testtag1', 'testtag2'],
            settings: {
              syncDelay: '1m',
              frequency: '1m',
            },
            revision: 1,
            enabled: true,
            createdAt: '2023-09-26T14:52:57.861Z',
            updatedAt: '2023-09-26T14:52:57.861Z',
            instanceId: 'sloshosttest1.local',
            summary: {
              errorBudget: {
                initial: 0.01,
                consumed: 0,
                remaining: 1,
                isEstimated: false,
              },
              sliValue: 1,
              status: 'HEALTHY',
            },
          },
          {
            id: 'sloidtest2',
            name: 'slotestname2',
            description: '',
            indicator: {
              type: 'sli.kql.custom',
              params: {
                index: 'metrics-*:traces-apm-*',
                filter:
                  'service.name : testservice AND transaction.type: "testtype"',
                good: 'http.response.status_code<500',
                total: 'http.response.status_code :*',
                timestampField: '@timestamp',
              },
            },
            budgetingMethod: 'occurrences',
            timeWindow: {
              duration: '7d',
              type: 'rolling',
            },
            objective: {
              target: 0.99,
            },
            tags: ['testtag1', 'testtag2'],
            groupBy: 'host.hostname',
            settings: {
              syncDelay: '1m',
              frequency: '1m',
            },
            revision: 1,
            enabled: true,
            createdAt: '2023-09-26T14:52:57.861Z',
            updatedAt: '2023-09-26T14:52:57.861Z',
            instanceId: 'slohosttest2.local',
            summary: {
              errorBudget: {
                initial: 0.01,
                consumed: 0,
                remaining: 1,
                isEstimated: false,
              },
              sliValue: 1,
              status: 'HEALTHY',
            },
          },
        ],
      },
    } as SlosResponse;
    it('returns proper response', async () => {
      const entity: Entity = {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'System',
        metadata: {
          annotations: {
            'elastic/instance': 'default',
            'elastic/slo-query': 'service.name',
          },
          name: 'backstage',
        },
      };
      const stringEntityRef = stringifyEntityRef(entity);
      elasticInfoProvider.getSlos.mockResolvedValue(slosResponse);
      catalogApi.getEntityByRef.mockResolvedValue(entity);
      const response = await request(app).get(
        `/slos?sloType=multi&stringEntityRef=${stringEntityRef}`,
      );
      expect(response.status).toEqual(200);
      expect(response.body).toEqual(slosResponse);
    });
    it('returns 400 incorrect annotation', async () => {
      const entity: Entity = {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'System',
        metadata: {
          annotations: {
            'elastic/instance': 'default',
          },
          name: 'backstage',
        },
      };
      const stringEntityRef = stringifyEntityRef(entity);
      elasticInfoProvider.getSlos.mockResolvedValue(slosResponse);
      catalogApi.getEntityByRef.mockResolvedValue(entity);
      const response = await request(app).get(
        `/slos?sloType=multi&stringEntityRef=${stringEntityRef}`,
      );
      expect(response.status).toEqual(400);
      expect(response.body.error.message).toEqual(
        'sloQuery missing from annotations.',
      );
    });
  });
  describe('GET /apm apmType single', () => {
    const apmResponse = {
      baseUrl: 'https://test.com',
      res: {
        failure_rate: {
          value: 0.9977246871444824,
        },
        timeseries: {
          buckets: [
            {
              key_as_string: '2023-09-29T15:10:00.000Z',
              key: 1696000200000,
              doc_count: 167,
              throughput: {
                value: 167,
              },
            },
            {
              key_as_string: '2023-09-29T15:11:00.000Z',
              key: 1696000260000,
              doc_count: 169,
              throughput: {
                value: 169,
              },
            },
          ],
        },
        throughput: 123.21,
        latency: {
          value: 398430.11422070535,
        },
      },
    } as ApmStatsResponse;
    it('returns proper response', async () => {
      const entity: Entity = {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'System',
        metadata: {
          annotations: {
            'elastic/instance': 'default',
            'elastic/apm-name': 'testservice',
          },
          name: 'backstage',
        },
      };
      const stringEntityRef = stringifyEntityRef(entity);
      elasticInfoProvider.getApmStats.mockResolvedValue(apmResponse);
      catalogApi.getEntityByRef.mockResolvedValue(entity);
      const response = await request(app).get(
        `/apm?apmType=single&stringEntityRef=${stringEntityRef}`,
      );
      expect(response.status).toEqual(200);
      expect(response.body).toEqual(apmResponse);
    });
    it('returns 400 incorrect annotation', async () => {
      const entity: Entity = {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'System',
        metadata: {
          annotations: {
            'elastic/instance': 'default',
          },
          name: 'backstage',
        },
      };
      const stringEntityRef = stringifyEntityRef(entity);
      elasticInfoProvider.getApmStats.mockResolvedValue(apmResponse);
      catalogApi.getEntityByRef.mockResolvedValue(entity);
      const response = await request(app).get(
        `/apm?apmType=single&stringEntityRef=${stringEntityRef}`,
      );
      expect(response.status).toEqual(400);
      expect(response.body.error.message).toEqual(
        'serviceName is missing from entity.',
      );
    });
  });
  describe('GET /apm apmType multi', () => {
    const apmResponse = {
      baseUrl: 'https://test.com',
      res: {
        group_by_service_name: {
          doc_count_error_upper_bound: 0,
          sum_other_doc_count: 841,
          buckets: [
            {
              key: 'frontend-node',
              doc_count: 8790,
              throughput: 175,
              failure_rate: {
                value: 0.9977246871444824,
              },
              timeseries: {
                buckets: [
                  {
                    key_as_string: '2023-09-29T15:10:00.000Z',
                    key: 1696000200000,
                    doc_count: 167,
                    throughput: {
                      value: 167,
                    },
                  },
                  {
                    key_as_string: '2023-09-29T15:11:00.000Z',
                    key: 1696000260000,
                    doc_count: 169,
                    throughput: {
                      value: 169,
                    },
                  },
                ],
              },
              latency: {
                value: 398430.11422070535,
              },
            },
            {
              key: 'productCatalogService',
              doc_count: 6965,
              throughput: 123,
              failure_rate: {
                value: 1,
              },
              timeseries: {
                buckets: [
                  {
                    key_as_string: '2023-09-29T15:10:00.000Z',
                    key: 1696000200000,
                    doc_count: 132,
                    throughput: {
                      value: 132,
                    },
                  },
                  {
                    key_as_string: '2023-09-29T15:11:00.000Z',
                    key: 1696000260000,
                    doc_count: 131,
                    throughput: {
                      value: 131,
                    },
                  },
                ],
              },
              latency: {
                value: 101843.12761020882,
              },
            },
          ],
        },
      },
    } as ApmMultiStatsResponse;
    it('returns proper response', async () => {
      const entity: Entity = {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'System',
        metadata: {
          annotations: {
            'elastic/instance': 'default',
            'elastic/apm-query': '{"term": {"service.name": "frontend-node"}}',
          },
          name: 'backstage',
        },
      };
      const stringEntityRef = stringifyEntityRef(entity);
      elasticInfoProvider.getApmMultiStats.mockResolvedValue(apmResponse);
      catalogApi.getEntityByRef.mockResolvedValue(entity);
      const response = await request(app).get(
        `/apm?apmType=multi&stringEntityRef=${stringEntityRef}`,
      );
      expect(response.status).toEqual(200);
      expect(response.body).toEqual(apmResponse);
    });
    it('returns 400 incorrect annotation', async () => {
      const entity: Entity = {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'System',
        metadata: {
          annotations: {
            'elastic/instance': 'default',
          },
          name: 'backstage',
        },
      };
      const stringEntityRef = stringifyEntityRef(entity);
      elasticInfoProvider.getApmMultiStats.mockResolvedValue(apmResponse);
      catalogApi.getEntityByRef.mockResolvedValue(entity);
      const response = await request(app).get(
        `/apm?apmType=multi&stringEntityRef=${stringEntityRef}`,
      );
      expect(response.status).toEqual(400);
      expect(response.body.error.message).toEqual(
        'groupBy is missing from entity.',
      );
    });
  });
});
