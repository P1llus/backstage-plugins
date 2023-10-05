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
  createBackendPlugin,
  coreServices,
} from '@backstage/backend-plugin-api';
import { loggerToWinstonLogger } from '@backstage/backend-common';
import { DefaultElasticInfoProvider } from './service/elasticInfoProvider';
import { catalogServiceRef } from '@backstage/plugin-catalog-node/alpha';
import { createRouter } from './service/router';

/**
 * The Todos plugin is responsible for aggregating todo comments within source.
 * @public
 */
export const elasticPlugin = createBackendPlugin({
  pluginId: 'elastic',
  register(env) {
    env.registerInit({
      deps: {
        config: coreServices.rootConfig,
        logger: coreServices.logger,
        identityApi: coreServices.identity,
        catalogApi: catalogServiceRef,
        http: coreServices.httpRouter,
      },
      async init({ config, logger, identityApi, catalogApi, http }) {
        const winstonLogger = loggerToWinstonLogger(logger);
        http.use(
          await createRouter({
            logger: winstonLogger,
            elasticInfoProvider: DefaultElasticInfoProvider.fromConfig(config),
            identity: identityApi,
            catalogApi: catalogApi,
            allowGuests: DefaultElasticInfoProvider.getAllowedGuests(config),
          }),
        );
      },
    });
  },
});
