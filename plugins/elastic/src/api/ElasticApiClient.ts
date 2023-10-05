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
  SloResponse,
  SlosResponse,
  ApmMultiStatsResponse,
  ApmStatsResponse,
} from '@p1llus/backstage-plugin-elastic-common';

import { ElasticApi } from './ElasticApi';
import { DiscoveryApi, FetchApi } from '@backstage/core-plugin-api';

export interface ElasticClientOptions {
  discoveryApi: DiscoveryApi;
  fetchApi: FetchApi;
}

/** @public */
export class ElasticApiClient implements ElasticApi {
  private readonly discoveryApi: DiscoveryApi;
  private readonly fetchApi: FetchApi;

  constructor(options: ElasticClientOptions) {
    this.discoveryApi = options.discoveryApi;
    this.fetchApi = options.fetchApi;
  }

  async sendRequest(url: string): Promise<any> {
    const fullUrl = `${await this.discoveryApi.getBaseUrl('elastic')}${url}`;
    return await this.fetchApi.fetch(fullUrl).then(res => res.json());
  }

  async fetchSlo(stringEntityRef: string): Promise<SloResponse> {
    return await this.sendRequest(
      `/slos?stringEntityRef=${stringEntityRef}&sloType=single`,
    );
  }

  async fetchSlos(stringEntityRef: string): Promise<SlosResponse> {
    return await this.sendRequest(
      `/slos?stringEntityRef=${stringEntityRef}&sloType=multi`,
    );
  }

  async fetchApmStats(stringEntityRef: string): Promise<ApmStatsResponse> {
    return await this.sendRequest(
      `/apm?stringEntityRef=${stringEntityRef}&apmType=single`,
    );
  }

  async fetchApmMultiStats(
    stringEntityRef: string,
  ): Promise<ApmMultiStatsResponse> {
    return await this.sendRequest(
      `/apm?stringEntityRef=${stringEntityRef}&apmType=multi`,
    );
  }
}
