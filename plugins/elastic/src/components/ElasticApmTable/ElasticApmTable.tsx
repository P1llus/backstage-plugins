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
import { Typography } from '@material-ui/core';
import {
  Table,
  TableColumn,
  Progress,
  ResponseErrorPanel,
  MissingAnnotationEmptyState,
  InfoCard,
} from '@backstage/core-components';
import { makeStyles } from '@material-ui/core';
import useAsync from 'react-use/lib/useAsync';
import { useEntity } from '@backstage/plugin-catalog-react';
import { useApi } from '@backstage/core-plugin-api';
import { stringifyEntityRef } from '@backstage/catalog-model';
import { elasticApiRef } from '../../api';
import {
  ELASTICSEARCH_APM_QUERY_ANNOTATION,
  isElasticApmQueryAvailable,
  ApmServiceBucket,
} from '@p1llus/backstage-plugin-elastic-common';

const useStyles = makeStyles(theme => ({
  root: {
    display: 'flex',
    justifyContent: 'center',
    flexWrap: 'wrap',
    listStyle: 'none',
    padding: theme.spacing(0.5),
    margin: 0,
  },
  empty: {
    padding: theme.spacing(2),
    display: 'flex',
    justifyContent: 'center',
  },
  chips: {
    display: 'flex',
    flexWrap: 'wrap',
    marginTop: theme.spacing(1),
  },
}));

const pageTitle = 'APM Metrics (1 Hour)';

const columns: TableColumn[] = [
  {
    title: 'Service Name',
    field: 'key',
    highlight: true,
    width: 'auto',
    type: 'string',
    render: (row: Partial<ApmServiceBucket>) => row?.key,
  },
  {
    title: 'Transactions',
    field: 'doc_count',
    width: 'auto',
    type: 'numeric',
    render: (row: Partial<ApmServiceBucket>) => row?.doc_count,
  },
  {
    title: 'Latency (ms)',
    field: 'latency.value',
    width: 'auto',
    type: 'numeric',
    render: (row: Partial<ApmServiceBucket>) =>
      row?.latency?.value ? row?.latency?.value.toFixed(2) : -1,
  },
  {
    title: 'Throughput (tpm)',
    field: 'throughput',
    width: 'auto',
    type: 'numeric',
    render: (row: Partial<ApmServiceBucket>) => row?.throughput,
  },
  {
    title: 'Failure Rate (%)',
    field: 'failure_rate.value',
    width: 'auto',
    type: 'numeric',
    render: (row: Partial<ApmServiceBucket>) =>
      row?.failure_rate?.value ? row.failure_rate.value.toFixed(2) : -1.0,
  },
];

// TODO: Might move table to its own generic component later, though it might result in passing so many props the logic would be too confusing.
export const ApmTable = () => {
  const { entity } = useEntity();
  const elasticSloApi = useApi(elasticApiRef);
  const stringEntityRef = encodeURIComponent(stringifyEntityRef(entity));

  const { value, loading, error } = useAsync(
    async () => elasticSloApi.fetchApmMultiStats(stringEntityRef),
    [elasticSloApi, stringEntityRef],
  );
  const classes = useStyles();

  if (loading) {
    return <Progress />;
  } else if (error) {
    return <ResponseErrorPanel error={error} />;
  }
  return (
    <Table
      title={pageTitle}
      options={{ paging: true, padding: 'dense', search: true }}
      columns={columns}
      data={value?.res.group_by_service_name.buckets || []}
      emptyContent={
        <div className={classes.empty}>
          No data found. Please check your Entity Annotation.
        </div>
      }
    />
  );
};
export const ElasticApmTable = () => {
  const { entity } = useEntity();

  // TODO, Better UI handling of errors, should not really be a infocard?
  if (!isElasticApmQueryAvailable(entity)) {
    return (
      <InfoCard title={pageTitle}>
        <Typography component="span" variant="body1">
          <MissingAnnotationEmptyState
            annotation={ELASTICSEARCH_APM_QUERY_ANNOTATION}
          />
        </Typography>
      </InfoCard>
    );
  }
  return <ApmTable />;
};
