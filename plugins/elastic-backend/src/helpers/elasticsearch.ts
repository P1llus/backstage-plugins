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

interface Aggregations {
  [key: string]: any;
}

interface ApmRequest {
  track_total_hits: boolean;
  size: number;
  query: {
    bool: {
      filter: object[];
    };
  };
  aggs: Aggregations;
}

export const calculateAverage = (array: number[]): number => {
  const sum = array.reduce((a: number, b: number): number => a + b);
  return sum / array.length;
};

export function createApmRequestBody(
  serviceName?: string,
  queries?: string,
  groupBy?: string,
) {
  const body: ApmRequest = {
    track_total_hits: false,
    size: 0,
    query: {
      bool: {
        filter: [
          {
            term: {
              'processor.event': 'metric',
            },
          },
          {
            term: {
              'metricset.name': 'service_transaction',
            },
          },
          {
            range: {
              '@timestamp': {
                gte: 'now-1h',
                lt: 'now',
              },
            },
          },
        ],
      },
    },
    aggs: {},
  };
  const aggs: Aggregations = {
    latency: {
      avg: {
        field: 'transaction.duration.summary',
      },
    },
    failure_rate: {
      avg: {
        field: 'event.success_count',
      },
    },
    timeseries: {
      date_histogram: {
        field: '@timestamp',
        fixed_interval: '60s',
      },
      aggs: {
        throughput: {
          rate: {
            unit: 'minute',
          },
        },
      },
    },
  };
  // If we have a groupBy, we need to ensure its the first aggregation
  if (groupBy !== undefined) {
    const groupAgg: Aggregations = {
      group_by_service_name: {
        terms: {
          field: groupBy,
        },
      },
    };
    groupAgg.group_by_service_name.aggs = aggs;
    body.aggs = groupAgg;
  }
  if (serviceName !== undefined) {
    body.query.bool.filter.push({ term: { 'service.name': serviceName } });
  }
  if (queries !== undefined) {
    body.query.bool.filter.push(JSON.parse(queries));
  }
  // If groupBy does not exist we are returning a single service, so we need to add the rest of the aggs
  if (groupBy === undefined) {
    body.aggs = aggs;
  }

  return body;
}
