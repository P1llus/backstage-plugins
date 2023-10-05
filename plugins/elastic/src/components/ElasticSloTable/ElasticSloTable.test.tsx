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

import React from 'react';
import { ElasticSloTable } from './ElasticSloTable';
import { EntityProvider } from '@backstage/plugin-catalog-react';
import { ElasticApi } from '../../api';
import { Entity } from '@backstage/catalog-model';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { screen } from '@testing-library/react';
import { TestApiProvider } from '@backstage/test-utils';
import { elasticApiRef } from '../../api';
import {
  setupRequestMockHandlers,
  renderInTestApp,
} from '@backstage/test-utils';
import slosData from '../../mocks/slos.json';

// TODO, write actual tests
describe('ElasticSloTable', () => {
  let elasticApi: jest.Mocked<ElasticApi>;
  beforeAll(async () => {
    elasticApi = {
      fetchApmStats: jest.fn(),
      fetchApmMultiStats: jest.fn(),
      fetchSlo: jest.fn(),
      fetchSlos: jest.fn(),
    };
  });

  const server = setupServer();
  // Enable sane handlers for network requests
  setupRequestMockHandlers(server);

  // setup mock response
  beforeEach(() => {
    server.use(
      rest.get('/*', (_, res, ctx) => res(ctx.status(200), ctx.json({}))),
    );
  });

  it('should render', async () => {
    elasticApi.fetchSlos.mockResolvedValue({
      baseUrl: 'https://example.com',
      res: slosData,
    });
    const entity: Entity = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'System',
      metadata: {
        annotations: {
          'elastic/instance': 'default',
          'elastic/slo-query': 'slo.tag = [Test]*',
        },
        name: 'backstage',
      },
    };
    await renderInTestApp(
      <TestApiProvider apis={[[elasticApiRef, elasticApi]]}>
        <EntityProvider entity={entity}>
          <ElasticSloTable />
        </EntityProvider>
        ,
      </TestApiProvider>,
    );
    expect(screen.getByText('sloshosttest1.local')).toBeInTheDocument();
  });
  it('render missing annotation', async () => {
    elasticApi.fetchSlos.mockResolvedValue({
      baseUrl: 'https://example.com',
      res: slosData,
    });
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
    await renderInTestApp(
      <TestApiProvider apis={[[elasticApiRef, elasticApi]]}>
        <EntityProvider entity={entity}>
          <ElasticSloTable />
        </EntityProvider>
        ,
      </TestApiProvider>,
    );
    expect(screen.getByText('Missing Annotation')).toBeInTheDocument();
  });
});
