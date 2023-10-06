# [Backstage Plugins](https://github.com/p1llus/elastic-backstage-plugins)

Currently 3 plugins are hosted here each with their own readme:

- [Elastic (Frontend UI)](https://github.com/p1llus/elastic-backstage-plugins/tree/main/plugins/elastic)
- [Elastic Common (Common TS types and methods shared between other plugins)](https://github.com/p1llus/elastic-backstage-plugins/tree/main/plugins/elastic-common)
- [Elastic Backend (Backend API used by the frontend and communicates with the Elastic instances)](https://github.com/p1llus/elastic-backstage-plugins/tree/main/plugins/elastic-backend)

To use or install any of the plugins (Elastic Common is just a dependency for the two others and can be ignored), please visit each plugin page for more information.

## Testing the plugins locally 

The examples are very basic, and any visualization is not restricted to a specific page or entity type in a real deployment scenario.
1. Clone this repository (https://github.com/p1llus/backstage-plugins).
2. Run `yarn install` in the root of the project.
3. Ensure that you have the stack running somewhere with all relevant things you want to test (currently only SLO).
4. Modify the annotations in `./examples/test.yaml` file. A list of annotations required can be found in the [Elastic (Frontend UI)](https://github.com/p1llus/elastic-backstage-plugins/tree/main/plugins/elastic) readme.
5. Create a `app-config.local.yml` in the root of the project, and fill out the relevant configuration

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

integrations:
  github:
    - host: github.com
      token: GITHUB Personal Access TOKEN

auth:
  environment: development
  providers:
    github:
      development:
        clientId: Github APP ID
        clientSecret: Github APP secret
```

6. Run `yarn dev` and visit to test [SLO TABLE](http://localhost:3000/catalog/default/group/guests/slo) and [SLO Gauge](http://localhost:3000/catalog/default/component/example-website).
