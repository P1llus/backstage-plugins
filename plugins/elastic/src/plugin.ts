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

import {
  createPlugin,
  createComponentExtension,
  createApiFactory,
  discoveryApiRef,
  fetchApiRef,
} from '@backstage/core-plugin-api';

import { ElasticApiClient, elasticApiRef } from './api';

export const elasticPlugin = createPlugin({
  id: 'elastic',
  apis: [
    createApiFactory({
      api: elasticApiRef,
      deps: {
        discoveryApi: discoveryApiRef,
        fetchApi: fetchApiRef,
      },
      factory: ({ discoveryApi, fetchApi }) =>
        new ElasticApiClient({ discoveryApi, fetchApi }),
    }),
  ],
});

export const EntityElasticSloCard = elasticPlugin.provide(
  createComponentExtension({
    name: 'EntityElasticSloCard',
    component: {
      lazy: () =>
        import('./components/ElasticSloCard').then(m => m.ElasticSloCard),
    },
  }),
);

export const EntityElasticSloTableContent = elasticPlugin.provide(
  createComponentExtension({
    name: 'EntityElasticSloTableContent',
    component: {
      lazy: () =>
        import('./components/ElasticSloTable').then(m => m.ElasticSloTable),
    },
  }),
);

export const EntityElasticApmCard = elasticPlugin.provide(
  createComponentExtension({
    name: 'EntityElasticApmCard',
    component: {
      lazy: () =>
        import('./components/ElasticApmCard').then(m => m.ElasticApmCard),
    },
  }),
);

export const EntityElasticApmTableContent = elasticPlugin.provide(
  createComponentExtension({
    name: 'EntityElasticTableContent',
    component: {
      lazy: () =>
        import('./components/ElasticApmTable').then(m => m.ElasticApmTable),
    },
  }),
);
