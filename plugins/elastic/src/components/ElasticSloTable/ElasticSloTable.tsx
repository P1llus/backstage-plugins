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
import { Typography, Box, Chip } from '@material-ui/core';
import {
  Table,
  TableColumn,
  Progress,
  ResponseErrorPanel,
  MissingAnnotationEmptyState,
  InfoCard,
  Link,
} from '@backstage/core-components';
import { makeStyles } from '@material-ui/core';
import useAsync from 'react-use/lib/useAsync';
import { useEntity } from '@backstage/plugin-catalog-react';
import { useApi } from '@backstage/core-plugin-api';
import { setStatus, createLink } from '../../helpers/helpers';
import { stringifyEntityRef } from '@backstage/catalog-model';
import { elasticApiRef } from '../../api';
import {
  KIBANA_SLO_QUERY_ANNOTATION,
  SloProps,
} from '@p1llus/backstage-plugin-elastic-common';
import { isElasticSloQueryAvailable } from '../../helpers';

const pageTitle = 'Service Level Objectives';

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

// TODO: Might move table to its own generic component later, though it might result in passing so many props the logic would be too confusing.
export const SloTable = () => {
  const { entity } = useEntity();
  const elasticSloApi = useApi(elasticApiRef);
  const stringEntityRef = encodeURIComponent(stringifyEntityRef(entity));

  const { value, loading, error } = useAsync(
    async () => elasticSloApi.fetchSlos(stringEntityRef),
    [elasticSloApi, stringEntityRef],
  );
  const classes = useStyles();

  const columns: TableColumn[] = [
    {
      title: 'Name',
      field: 'name',
      highlight: true,
      width: 'auto',
      type: 'string',
      render: (row: Partial<SloProps>) => row?.name,
    },
    {
      title: 'Instance ID',
      field: 'instanceId',
      width: 'auto',
      type: 'string',
      render: (row: Partial<SloProps>) => row?.instanceId,
    },
    {
      title: 'Target %',
      field: 'objective.target',
      width: 'auto',
      type: 'numeric',
      render: (row: Partial<SloProps>) =>
        row?.objective?.target !== undefined
          ? (row.objective.target * 100).toFixed(2)
          : -1.0,
    },
    {
      title: 'Current %',
      field: 'summary.sliValue',
      width: 'auto',
      type: 'numeric',
      render: (row: Partial<SloProps>) =>
        row?.summary?.sliValue !== undefined
          ? (row.summary.sliValue * 100).toFixed(2)
          : -1.0,
    },
    {
      title: 'Status',
      field: 'summary.status',
      width: 'auto',
      type: 'string',
      render: (row: Partial<SloProps>) => (
        <Box display="flex" alignItems="center">
          {setStatus(row?.summary?.status)}
          <Box mr={1} />{' '}
          <Typography variant="button">{row?.summary?.status}</Typography>
        </Box>
      ),
    },
    {
      title: 'Tags',
      field: 'tags',
      width: 'auto',
      render: (row: Partial<SloProps>) => {
        if (!row.tags) {
          return (
            <Box display="flex" alignItems="center" className={classes.root} />
          );
        }
        return (
          <Box display="flex" alignItems="center" className={classes.root}>
            {row.tags.map(tag => (
              <li key={tag}>
                <Chip
                  label={tag}
                  size="small"
                  color="primary"
                  className={classes.chips}
                />
              </li>
            ))}
          </Box>
        );
      },
    },
    {
      title: 'Budget Remaining',
      field: 'summary.errorBudget.remaining',
      width: 'auto',
      type: 'numeric',
      render: (row: Partial<SloProps>) =>
        row?.summary?.errorBudget?.remaining !== undefined
          ? (row.summary.errorBudget.remaining * 100).toFixed(2)
          : -1.0,
    },
    {
      title: 'Budget Consumed',
      field: 'summary.errorBudget.consumed',
      width: 'auto',
      type: 'numeric',
      render: (row: Partial<SloProps>) =>
        row?.summary?.errorBudget?.consumed !== undefined
          ? (row.summary.errorBudget.consumed * 100).toFixed(2)
          : -1.0,
    },
    {
      title: 'Action',
      field: 'action',
      width: 'auto',
      type: 'numeric',
      render: (row: Partial<SloProps>) => {
        if (value?.baseUrl && row?.id && row?.instanceId) {
          return (
            <Link to={createLink(value.baseUrl, row.id, row.instanceId)}>
              View In Kibana
            </Link>
          );
        }
        return <Link to="">URL not found</Link>;
      },
    },
  ];

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
      data={value?.res.results || []}
      emptyContent={
        <div className={classes.empty}>
          No data found. Please check your Entity Annotation.
        </div>
      }
    />
  );
};

export const ElasticSloTable = () => {
  const { entity } = useEntity();

  // TODO, Better UI handling of errors, should not really be a infocard?
  if (!isElasticSloQueryAvailable(entity)) {
    return (
      <InfoCard title={pageTitle}>
        <Typography component="span" variant="body1">
          <MissingAnnotationEmptyState
            annotation={KIBANA_SLO_QUERY_ANNOTATION}
          />
        </Typography>
      </InfoCard>
    );
  }
  return <SloTable />;
};
