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

import { Config } from '@backstage/config';
import {
  SloProps,
  SlosProps,
  SloResponse,
  SlosResponse,
  ApmStatsRoot,
  ApmMultiStatsRoot,
  ApmStatsResponse,
  ApmMultiStatsResponse,
  ApmStatsProps,
  GroupByServiceName,
} from '@p1llus/backstage-plugin-elastic-common';
import fetch from 'node-fetch';
import { createApmRequestBody } from '../helpers';
import { calculateAverage } from '../helpers/elasticsearch';

/**
 * Provides an interface to retrieve information from a instance of the Elastic Stack.
 * @public
 */
export interface ElasticInfoProvider {
  /**
   * Query the Kibana instance to retrieve a single SLO object.
   *
   * @param sloId - The ID of the SLO to retrieve.
   * @param instanceName - name of the instance (in config) where the project is hosted.
   * @param space - The Kibana space to query. Defaults to 'default'.
   * @param sloInstanceId - When the SLO partition its metric by a specific field, this is a unique value from that partition field.
   *
   * @returns All measures with the analysis date. Will return undefined if no SLO is found or if the instance is unavailable.
   * can't provide the full response
   */
  getSlo(options: {
    sloId: string;
    instanceName: string;
    space: string;
    sloInstanceId?: string;
  }): Promise<SloResponse | undefined>;

  /**
   * Query the Kibana instance to retrieve an array of SLO objects matching the filter provided in the instance config.
   * @param sloQuery - The KQL query to use to filter the SLOs.
   * @param instanceName - name of the instance (in config) where the project is hosted.
   * @param space - The Kibana space to query. Defaults to 'default'.
   * @returns All SLO objects matching the filter provided in the instance config. Will return undefined if no matches are found.
   */
  getSlos(options: {
    sloQuery: string;
    instanceName: string;
    space: string;
  }): Promise<SlosResponse | undefined>;

  /**
   * Query the Elasticsearch instance to retrieve the aggregated latency, throughput and failure rate of a specific APM service.
   * @param serviceName - the name of the service in which APM collects metrics from.
   * @param instanceName - name of the instance (in config) where the project is hosted.
   * @param space - The Kibana space to query. Defaults to 'default'.
   * @param dslQuery - optional setting to add additional filters to the DSL query when required.
   * @returns A object containing the current average latency, throughput and failure rate from the matching query.
   */
  getApmStats(options: {
    serviceName: string;
    instanceName: string;
    space: string;
    dslQuery?: string;
  }): Promise<ApmStatsResponse | undefined>;

  /**
   * Query the Elasticsearch instance to retrieve the aggregated latency, throughput and failure rate of a group of APM service.
   * @param groupBy - The field in Elasticsearch that is used to pivot the stats. For example service.name.
   * @param instanceName - name of the instance (in config) where the project is hosted.
   * @param space - The Kibana space to query. Defaults to 'default'.
   * @param dslQuery - The Elasticsearch DSL query added to the filter part of the query. Used to for example filter out based on a tag.
   * @returns A object containing the current average latency, throughput and failure rate from the matching query.
   */
  getApmMultiStats(options: {
    groupBy: string;
    instanceName: string;
    space: string;
    dslQuery?: string;
  }): Promise<ApmMultiStatsResponse | undefined>;
}

/**
 * Type definition for a single instance configuration.
 * @public
 */
export interface ElasticInstanceConfig {
  /** The name of the clusterElastic instance. This name is used to link a annotated entity to a specific instance when requesting data from the backend plugin. */
  name: string;
  /** Specific Kibana configuration options */
  kibana?: InstanceCredentials;
  /** Specific Elasticsearch configuration options */
  elasticsearch?: InstanceCredentials;
}

export interface InstanceCredentials {
  /** The base URL of the Kibana instance to send the API request to. */
  baseUrl: string;
  /** The API Key to authenticate requests sent to the Kibana instances by the backend plugin */
  apiKey: string;
}

/**
 * Multiple instance configurations
 * @public
 */

// TODO: See if we can add some good config validation on startup, how should we handle misconfiguration? Should the backend still start?
export class ElasticConfig {
  /**
   *
   * @param instances - Array of all configured instances found in local config file.
   */
  constructor(public readonly instances: ElasticInstanceConfig[]) {}

  /**
   * Read all Elastic instances from the provided config.
   * @param config - Root configuration
   * @returns A ElasticConfig that contains all configured Elasticsearch and Kibana instances.
   */
  static fromConfig(config: Config): ElasticConfig {
    const elasticConfig = config.getConfig('elastic');

    // load all named instance config
    const namedInstanceConfig =
      elasticConfig.getConfigArray('instances')?.map(c => ({
        name: c.getString('name'),
        kibana: {
          baseUrl: c.getString('kibana.baseUrl'),
          apiKey: c.getString('kibana.apiKey'),
        },
        elasticsearch: {
          baseUrl: c.getString('elasticsearch.baseUrl'),
          apiKey: c.getString('elasticsearch.apiKey'),
        },
      })) || [];

    return new ElasticConfig(namedInstanceConfig);
  }

  /**
   * Retrieves the instance config for the provided name, or default if none is provided. Ensures that the instance is of the correct type
   * @param instanceName - Name of the Elastic instance defined in the app-config.
   * @returns The requested Elastic instance.
   * @throws Error when no default config could be found or the requested name couldn't be found in config.
   */
  getInstanceConfig(options: { instanceName: string }): ElasticInstanceConfig {
    const { instanceName } = options;

    // if an instance name is provided, use that instance.-
    const instanceConfig = this.instances.find(c => c.name === instanceName);

    if (!instanceConfig) {
      throw new Error(
        `Couldn't find a elastic instance in the config with name ${instanceName}.`,
      );
    }
    return instanceConfig;
  }
}

/**
 * @public
 *
 * Use default config and annotations, build using fromConfig static function.
 */
// TODO: Really need to split this up into multiple providers to make it more testable and easier to read.
export class DefaultElasticInfoProvider implements ElasticInfoProvider {
  private constructor(private readonly config: ElasticConfig) {}

  /**
   * Generate an instance from a Config instance
   * @param config - Backend configuration
   */
  static fromConfig(config: Config): DefaultElasticInfoProvider {
    return new DefaultElasticInfoProvider(ElasticConfig.fromConfig(config));
  }

  /**
   * Returns if guests are allowed to access the backend API. Defaults to true.
   * @param config - Backend configuration
   */
  static getAllowedGuests(config: Config): boolean {
    const elasticConfig = config.getConfig('elastic');
    const allowed = elasticConfig.getOptionalBoolean('allow_guests');
    // Default to true if config is not set
    if (allowed === undefined) {
      return true;
    }
    return allowed;
  }

  /**
   * Call the Kibana API with provided arguments
   * @param url - URL of the API to call
   * @param path - path to call
   * @param apiKey - API Key for authentication
   * @param query - parameters to provide to the call
   * @returns A promise on the answer to the API call if the answer status code is 200, undefined otherwise.
   * @private
   */
  private static async callKibanaApi<T>(
    url: string,
    path: string,
    apiKey: string,
    query?: { [key in string]: any },
  ): Promise<T | undefined> {
    let fullUrl = '';
    if (query) {
      fullUrl = `${url}/${path}?${new URLSearchParams(query).toString()}`;
    } else {
      fullUrl = `${url}/${path}`;
    }
    const response = await fetch(`${fullUrl}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'kbn-xsrf': 'true',
        'User-Agent': 'Backstage-Elastic-Plugin/0.1',
        Authorization: `ApiKey ${apiKey}`,
      },
    });
    // TODO: Add more and better checks for responses
    if (response.status === 200) {
      return (await response.json()) as T;
    }
    return undefined;
  }

  /**
   * Call the Elasticsearch API with provided arguments
   * @param url - URL of the API to call
   * @param path - path to call
   * @param apiKey - API Key for authentication
   * @param body - the JSON body of the request
   * @returns A promise on the answer to the API call if the answer status code is 200, undefined otherwise.
   * @private
   */
  private static async callElasticsearchApi<T>(
    url: string,
    path: string,
    apiKey: string,
    body: any,
  ): Promise<T | undefined> {
    const fullUrl = `${url}/${path}`;

    const response = await fetch(`${fullUrl}`, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Backstage-Elastic-Plugin/0.1',
        Authorization: `ApiKey ${apiKey}`,
      },
    });
    // TODO: Add more and better checks for responses
    if (response.status === 200) {
      return (await response.json()) as T;
    }
    return undefined;
  }

  /**
   * {@inheritDoc ElasticInfoProvider.getSlo}
   * @throws Error If configuration can't be retrieved.
   */
  async getSlo(options: {
    sloId: string;
    instanceName: string;
    space: string;
    instanceId?: string;
  }): Promise<SloResponse | undefined> {
    const { sloId, instanceName, instanceId, space } = options;
    const config = this.config.getInstanceConfig({
      instanceName: instanceName,
    });

    if (!config || !config?.kibana) {
      return undefined;
    }

    const { baseUrl, apiKey } = config.kibana;
    // Check if instanceId is provided, if so, add it to the path.
    let fullPath = `s/${space}/api/observability/slos/${sloId}`;
    if (instanceId && instanceId !== undefined) {
      fullPath += `?instanceId=${instanceId}`;
    }

    const res = await DefaultElasticInfoProvider.callKibanaApi<SloProps>(
      baseUrl,
      fullPath,
      apiKey,
    );

    // TODO: Move res checks and add more tests inside callKibanaAPI
    if (!res) {
      return undefined;
    }
    return { baseUrl: baseUrl, res: res };
  }

  // TODO: This needs to support pagination at some point if we got lots of APM services
  /**
   * {@inheritDoc ElasticInfoProvider.getSlos}
   * @throws Error If configuration can't be retrieved.
   */
  async getSlos(options: {
    sloQuery: string;
    instanceName: string;
    space: string;
  }): Promise<SlosResponse | undefined> {
    const { sloQuery, instanceName, space } = options;
    const config = this.config.getInstanceConfig({
      instanceName: instanceName,
    });

    if (!config || !config?.kibana) {
      return undefined;
    }

    const { baseUrl, apiKey } = config.kibana;
    const res = await DefaultElasticInfoProvider.callKibanaApi<SlosProps>(
      baseUrl,
      `s/${space}/api/observability/slos?kqlQuery=${sloQuery}`,
      apiKey,
    );

    // TODO: Move res checks and add more tests inside callKibanaAPI
    if (!res) {
      return undefined;
    }

    return { baseUrl: baseUrl, res: res };
  }

  /**
   * {@inheritDoc ElasticInfoProvider.getApmStats}
   * @throws Error If configuration can't be retrieved.
   */
  async getApmStats(options: {
    serviceName: string;
    instanceName: string;
    space: string;
    dslQuery?: string;
  }): Promise<ApmStatsResponse | undefined> {
    const { serviceName, instanceName, space, dslQuery } = options;
    const config = this.config.getInstanceConfig({
      instanceName: instanceName,
    });

    if (!config || !config?.elasticsearch) {
      return undefined;
    }

    const { baseUrl, apiKey } = config.elasticsearch;
    let kibanaBaseUrl = '';
    if (config?.kibana) {
      kibanaBaseUrl = `${config.kibana.baseUrl}/s/${space}/app/services/`;
    }
    const body = createApmRequestBody(serviceName, dslQuery, undefined);
    const res =
      await DefaultElasticInfoProvider.callElasticsearchApi<ApmStatsRoot>(
        baseUrl,
        `metrics-apm*/_search`,
        apiKey,
        body,
      );
    // TODO: Move res checks and add more tests inside callKibanaAPI
    if (!res) {
      return undefined;
    }

    const results = res.aggregations as ApmStatsProps;
    const throughput = [];
    if (results.timeseries) {
      for (const val in results.timeseries.buckets) {
        if (val) {
          throughput.push(results.timeseries.buckets[val]?.throughput.value);
        }
      }
    }
    results.throughput = calculateAverage(throughput);
    // We do not really want the whole timeseries in the end result
    delete results.timeseries;
    return { baseUrl: kibanaBaseUrl, res: results };
  }

  // TODO: This needs to support pagination at some point if we got lots of APM services
  /**
   * {@inheritDoc ElasticInfoProvider.getApmMultiStats}
   * @throws Error If configuration can't be retrieved.
   */
  async getApmMultiStats(options: {
    groupBy: string;
    instanceName: string;
    space: string;
    dslQuery?: string;
  }): Promise<ApmMultiStatsResponse | undefined> {
    const { groupBy, instanceName, space, dslQuery } = options;
    const config = this.config.getInstanceConfig({
      instanceName: instanceName,
    });

    if (!config || !config?.elasticsearch) {
      return undefined;
    }

    const { baseUrl, apiKey } = config.elasticsearch;
    let kibanaBaseUrl = '';
    if (config?.kibana) {
      kibanaBaseUrl = `${config.kibana.baseUrl}/s/${space}/app/services/`;
    }
    const body = createApmRequestBody(undefined, dslQuery, groupBy);
    const res =
      await DefaultElasticInfoProvider.callElasticsearchApi<ApmMultiStatsRoot>(
        baseUrl,
        `metrics-apm*/_search`,
        apiKey,
        body,
      );
    // TODO: Move res checks and add more tests inside callKibanaAPI
    if (!res) {
      return undefined;
    }
    const results = res.aggregations as GroupByServiceName;
    const buckets = results.group_by_service_name.buckets;

    for (const bucket of buckets) {
      if (bucket.timeseries) {
        for (const val of bucket?.timeseries?.buckets) {
          const throughput = [];
          if (val) {
            throughput.push(val.throughput.value);
          }
          bucket.throughput = calculateAverage(throughput);
          // We do not really want to keep the timeseries
          delete bucket.timeseries;
        }
      }
    }
    return { baseUrl: kibanaBaseUrl, res: results };
  }
}
