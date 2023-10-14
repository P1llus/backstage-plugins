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

// SLO TYPES

/**
 * Field Props for a response from the SLO API that returns a single SLO object.
 * @public
 */
export interface SloResponse {
  baseUrl: string;
  res: SloProps;
}

/**
 * Field Props for a response from the SLO API that returns an array of SLO objects.
 * @public
 */
export interface SlosResponse {
  baseUrl: string;
  res: SlosProps;
}

/**
 * Field Props for an SLO object, contained in the SLO API response.
 * @public
 */
export interface SloProps {
  name: string;
  description: string;
  indicator: Indicator;
  instanceId: string;
  budgetingMethod: string;
  timeWindow: TimeWindow;
  objective: Objective;
  tags: string[];
  id: string;
  settings: Settings;
  revision: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  summary: Summary;
}

/** @public */
export interface Indicator {
  type: string;
  params: Params;
}

/** @public */
export interface Params {
  index: string;
  filter: string;
  good: string;
  total: string;
  timestampField: string;
}

/** @public */
export interface TimeWindow {
  duration: string;
  type: string;
}

/** @public */
export interface Objective {
  target: number;
  timesliceTarget?: number;
  timesliceWindow?: string;
}

/** @public */
export interface Settings {
  syncDelay: string;
  frequency: string;
}

/** @public */
export interface Summary {
  sliValue: number;
  errorBudget: ErrorBudget;
  status: string;
}

/** @public */
export interface ErrorBudget {
  initial: number;
  consumed: number;
  remaining: number;
  isEstimated: boolean;
}

/** @public */
export interface SlosProps {
  page: number;
  perPage: number;
  total: number;
  results: SloProps[];
}

// APM TYPES

/**
 * Field Props for a response from the Elasticsearch API when retrieving APM stats for a single service.
 * @public
 */

export interface ApmStatsRoot {
  took: number;
  timed_out: boolean;
  terminated_early: boolean;
  _shards: any;
  hits: any;
  aggregations: ApmStatsProps;
}

export interface ApmStatsResponse {
  baseUrl: string;
  res: ApmStatsProps;
}

/**
 * Field Props for a response from the Elasticsearch API when retrieving APM stats grouped by a field.
 * @public
 */

export interface ApmMultiStatsRoot {
  took: number;
  timed_out: boolean;
  terminated_early: boolean;
  _shards: any;
  hits: any;
  aggregations: GroupByServiceName;
}

export interface ApmMultiStatsResponse {
  baseUrl: string;
  res: GroupByServiceName;
}

/** @public */
export interface GroupByServiceName {
  group_by_service_name: ApmMultiStatsProps;
}

/** @public */
export interface ApmMultiStatsProps {
  doc_count_error_upper_bound: number;
  sum_other_doc_count: number;
  buckets: ApmServiceBucket[];
}

// APM Types shared between single/multi

/** @public */
export interface ApmStatsProps {
  failure_rate: FailureRate;
  throughput: number;
  timeseries?: Timeseries;
  latency: Latency;
}

/** @public */
export interface ApmServiceBucket {
  key: string;
  doc_count: number;
  failure_rate: FailureRate;
  throughput: number;
  timeseries?: Timeseries;
  latency: Latency;
}

/** @public */
export interface FailureRate {
  value: number;
}

/** @public */
export interface Timeseries {
  buckets: ApmRateBucket[];
}

/** @public */
export interface ApmRateBucket {
  key_as_string: string;
  key: number;
  doc_count: number;
  throughput: Throughput;
}

/** @public */
export interface Throughput {
  value: number;
}

/** @public */
export interface Latency {
  value: number;
}
