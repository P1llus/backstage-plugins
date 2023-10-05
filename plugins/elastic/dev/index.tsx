import React from 'react';
import { createDevApp } from '@backstage/dev-utils';
import { ElasticApi, elasticApiRef } from '../src/api';
import {
  elasticPlugin,
  EntityElasticSloCard,
  EntityElasticSloTableContent,
  EntityElasticApmCard,
  EntityElasticApmTableContent,
} from '../src/plugin';
import { EntityProvider } from '@backstage/plugin-catalog-react';
import sloData from '../src/mocks/slo.json';
import slosData from '../src/mocks/slos.json';
import apmStatsData from '../src/mocks/apmstats.json';
import apmMultiStatsData from '../src/mocks/apmmultistats.json';

// TODO: Proper dev mock tests
createDevApp()
  .registerPlugin(elasticPlugin)
  .registerApi({
    api: elasticApiRef,
    deps: {},
    factory: () =>
      ({
        async fetchSlo() {
          return {
            baseUrl: 'https://testhost.com',
            res: sloData,
          };
        },
        async fetchSlos() {
          return {
            baseUrl: 'https://testhost.com',
            res: slosData,
          };
        },
        async fetchApmStats() {
          return {
            baseUrl: 'https://testhost.com',
            res: apmStatsData,
          };
        },
        async fetchApmMultiStats() {
          return {
            baseUrl: 'https://testhost.com',
            res: apmMultiStatsData,
          };
        },
      } as ElasticApi),
  })
  .addPage({
    element: (
      <EntityProvider
        entity={{
          metadata: {
            annotations: {
              'elastic/instance': 'default',
              'elastic/slo-id': 'sloidtest',
            },
            name: 'backstage',
          },
          apiVersion: 'backstage.io/v1alpha1',
          kind: 'Component',
        }}
      >
        <EntityElasticSloCard />
      </EntityProvider>
    ),
    title: 'SloCard Page',
    path: '/slocard',
  })
  .addPage({
    element: (
      <EntityProvider
        entity={{
          metadata: {
            annotations: {
              'elastic/instance': 'default',
              'elastic/slo-query': 'slo.name: [test]*',
            },
            name: 'backstage',
          },
          apiVersion: 'backstage.io/v1alpha1',
          kind: 'Component',
        }}
      >
        <EntityElasticSloTableContent />
      </EntityProvider>
    ),
    title: 'SloTable Page',
    path: '/slotable',
  })
  .addPage({
    element: (
      <EntityProvider
        entity={{
          metadata: {
            annotations: {
              'elastic/instance': 'default',
              'elastic/apm-name': 'testservice',
            },
            name: 'backstage',
          },
          apiVersion: 'backstage.io/v1alpha1',
          kind: 'Component',
        }}
      >
        <EntityElasticApmCard />
      </EntityProvider>
    ),
    title: 'APM Card Page',
    path: '/apmcard',
  })
  .addPage({
    element: (
      <EntityProvider
        entity={{
          metadata: {
            annotations: {
              'elastic/instance': 'default',
              'elastic/apm-query': 'service.name',
            },
            name: 'backstage',
          },
          apiVersion: 'backstage.io/v1alpha1',
          kind: 'Component',
        }}
      >
        <EntityElasticApmTableContent />
      </EntityProvider>
    ),
    title: 'APM Table Page',
    path: '/apmtable',
  })
  .render();
