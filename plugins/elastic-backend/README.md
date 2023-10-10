# Elastic Backstage Plugin (Backend)

Welcome to the Unofficial [Elastic](https://www.elastic.co/) backend plugin for Backstage.

This plugin is **NOT** covered by any Elastic support contracts or SLA's

The scope of this plugin is currently to provide a backend proxy layer for the frontend plugin to communicate with.

For more information about how to setup and configure the Elastic stack or similar, please visit the [Elastic Documentation](https://www.elastic.co/guide/index.html).

The backend plugin is also dependant on the [elastic frontend](../elastic-frontend) plugin.

## Setup
### General
1. Add your plugin to your current backstage backend:

```bash
# From your Backstage root directory
yarn add --cwd packages/backend @p1llus/backstage-plugin-elastic-backend
```

2. Reference your backend plugin by creating a new file called `packages/backend/src/plugins/elastic.ts`

Example:

```tsx
// New file: packages/backend/src/plugins/elastic.ts
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
```

3. Reference this in `packages/backend/src/index.ts`
```diff
diff --git a/packages/backend/src/index.ts b/packages/backend/src/index.ts
index 1c08288..6ff3807 100644
--- a/packages/backend/src/index.ts
+++ b/packages/backend/src/index.ts
@@ -28,6 +28,7 @@ import scaffolder from './plugins/scaffolder';
 import proxy from './plugins/proxy';
 import techdocs from './plugins/techdocs';
 import search from './plugins/search';
+import elastic from './plugins/elastic';
 import { PluginEnvironment } from './types';
 import { ServerPermissionClient } from '@backstage/plugin-permission-node';
 import { DefaultIdentityClient } from '@backstage/plugin-auth-node';
@@ -85,6 +86,7 @@ async function main() {
   const techdocsEnv = useHotMemoize(module, () => createEnv('techdocs'));
   const searchEnv = useHotMemoize(module, () => createEnv('search'));
   const appEnv = useHotMemoize(module, () => createEnv('app'));
+  const elasticEnv = useHotMemoize(module, () => createEnv('elastic'));
 
   const apiRouter = Router();
   apiRouter.use('/catalog', await catalog(catalogEnv));
@@ -93,6 +95,7 @@ async function main() {
   apiRouter.use('/techdocs', await techdocs(techdocsEnv));
   apiRouter.use('/proxy', await proxy(proxyEnv));
   apiRouter.use('/search', await search(searchEnv));
+  apiRouter.use('/elastic', await elastic(elasticEnv));
 
   // Add backends ABOVE this line; this 404 handler is the catch-all fallback
   apiRouter.use(notFoundHandler());
```

### Configuration Files

The backend plugin exposes a few different config parameters under the top field `elastic`. These are meant to be added in your app-config.yaml or similar.

- `elastic.allow_guests`: An optional setting that default is `true`, when set to `false` the API exposed by the backend plugin will only allow requests from authenticated backstage users. By default all Backstage backend plugins do not verify requests, so the default on the plugin is then also to allow.
- `elastic.instances`: An array of the different cluster instances that should be communicated with.
- `elastic.instances[].name`: A unique name, should not be the same as any other instance. This is only used so the `annotations` can specify which cluster to communicate with
- `elastic.instances[].kibana.baseUrl`: Only the base URL used to access the Kibana API, without any trailing slashes, will default to port 80/443 if port number is not included.
- `elastic.instances[].kibana.apiKey`: The API Key used to authenticate with the Kibana instance.
- `elastic.instances[].elasticsearch.baseUrl`: Only the base URL used to access the Elasticsearch API without any trailing slashes, will default to port 80/443 if port number is not included.
- `elastic.instances[].elasticsearch.apiKey`: The API Key used to authenticate with the Kibana instance.

Example:
```yaml
elastic:
  allow_guests: true
  instances:
    - name: somecluster
      kibana:
        baseUrl: https://testkibana.com:5601
        apiKey: ${KIBANA1_KEY}
      elasticsearch:
        baseUrl: https://testes.com:9200
        apiKey: APIKEY
    - name: someothercluster
      kibana:
        baseUrl: https://testkibana2.com
        apiKey: APIKEY
      elasticsearch:
        baseUrl: https://testes2.com
        apiKey: APIKEY
```