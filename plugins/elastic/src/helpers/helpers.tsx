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
import { Entity } from '@backstage/catalog-model';
import {
  StatusError,
  StatusOK,
  StatusAborted,
  StatusRunning,
} from '@backstage/core-components';
import {
  KIBANA_SLO_ID_ANNOTATION,
  KIBANA_SLO_QUERY_ANNOTATION,
  ELASTICSEARCH_APM_QUERY_ANNOTATION,
  ELASTICSEARCH_APM_SERVICE_NAME_ANNOTATION,
  ELASTIC_INSTANCE_ANNOTATION,
} from '@p1llus/backstage-plugin-elastic-common';

export function setStatus(field: string | undefined = ''): JSX.Element {
  switch (field) {
    case 'HEALTHY': {
      return <StatusOK />;
    }
    case 'VIOLATED': {
      return <StatusError />;
    }
    case 'NO_DATA': {
      return <StatusRunning />;
    }
    default: {
      return <StatusAborted />;
    }
  }
}

export function createLink(
  baseUrl?: string,
  sloId?: string,
  sloInstance?: string,
) {
  let fullUrl = `${baseUrl}/app/observability/slos/${sloId}`;
  if (sloInstance) {
    fullUrl += `?instanceId=${sloInstance}`;
  }
  return fullUrl;
}

/**
 * Utility function to determine if the annotation exist and it includes both a instance name and the second parameter which is always required.
 * The third entry in the array is optional.
 * @public
 */
const validateAnnotation = (value?: string) => {
  if (!value) return false;
  return value.split('/').length >= 1;
};

/**
 * Utility function to determine if the given entity has an instance annotation.
 * @public
 */
export const isElasticInstanceAvailable = (entity: Entity) =>
  Boolean(entity?.metadata?.annotations?.[ELASTIC_INSTANCE_ANNOTATION]);

/**
 * Utility function to determine if the given entity has a supported SLO ID annotation.
 * @public
 */
export const isElasticSloIdAvailable = (entity: Entity) =>
  validateAnnotation(entity.metadata?.annotations?.[KIBANA_SLO_ID_ANNOTATION]);

/**
 * Utility function to determine if the given entity has a supported SLO KQL Query annotation.
 * @public
 */
export const isElasticSloQueryAvailable = (entity: Entity) =>
  validateAnnotation(
    entity.metadata?.annotations?.[KIBANA_SLO_QUERY_ANNOTATION],
  );

/**
 * Utility function to determine if the given entity has a supported SLO ID annotation.
 * @public
 */
export const isElasticApmNameAvailable = (entity: Entity) =>
  validateAnnotation(
    entity.metadata?.annotations?.[ELASTICSEARCH_APM_SERVICE_NAME_ANNOTATION],
  );

/**
 * Utility function to determine if the given entity has a supported SLO KQL Query annotation.
 * @public
 */
export const isElasticApmQueryAvailable = (entity: Entity) =>
  validateAnnotation(
    entity.metadata?.annotations?.[ELASTICSEARCH_APM_QUERY_ANNOTATION],
  );
