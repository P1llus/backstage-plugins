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
import {
  Progress,
  ResponseErrorPanel,
  MissingAnnotationEmptyState,
  InfoCard,
  EmptyState,
} from '@backstage/core-components';
import { Grid, Typography } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import useAsync from 'react-use/lib/useAsync';
import { createLink } from '../../helpers/helpers';
import { elasticApiRef } from '../../api';
import { KIBANA_SLO_ID_ANNOTATION } from '@p1llus/backstage-plugin-elastic-common';
import { isElasticSloIdAvailable } from '../../helpers';
import { stringifyEntityRef } from '@backstage/catalog-model';
import { useEntity } from '@backstage/plugin-catalog-react';
import { useApi } from '@backstage/core-plugin-api';

const useStyles = makeStyles(theme => ({
  violation: {
    fontSize: '5rem',
    textAlign: 'center',
    margin: theme.spacing(2, 0),
    color: theme.palette.error.main,
  },
  healthy: {
    fontSize: '5rem',
    textAlign: 'center',
    margin: theme.spacing(2, 0),
    color: theme.palette.success.main,
  },
  target: {
    fontSize: '1rem',
    textAlign: 'center',
    color: theme.palette.text.secondary,
  },
  disabled: {
    backgroundColor: theme.palette.background.default,
  },
  lastUpdated: {
    color: theme.palette.text.secondary,
    textAlign: 'center',
  },
}));

const cardTitle = 'Service Level Indicator';

// TODO: Might move cards to its own generic component later, though it might result in passing so many props the logic would be too confusing.
const SloCard = () => {
  const { entity } = useEntity();
  const elasticSloApi = useApi(elasticApiRef);
  const stringEntityRef = encodeURIComponent(stringifyEntityRef(entity));
  const classes = useStyles();

  const { value, loading, error } = useAsync(
    async () => elasticSloApi.fetchSlo(stringEntityRef),
    [elasticSloApi, stringEntityRef],
  );

  // TODO: lets move links to backend now that it has the entityref
  const fullUrl = createLink(
    value?.baseUrl,
    value?.res?.id,
    value?.res?.instanceId,
  );
  const linkInfo = { title: 'View in Kibana', link: fullUrl };
  return (
    <>
      {loading && (
        <InfoCard
          title={cardTitle}
          variant="gridItem"
          className={classes.disabled}
        >
          <Progress />
        </InfoCard>
      )}

      {error && (
        <InfoCard
          title={cardTitle}
          variant="gridItem"
          className={classes.disabled}
        >
          <ResponseErrorPanel error={error} />
        </InfoCard>
      )}
      {!loading && !value && (
        <InfoCard
          title={cardTitle}
          variant="gridItem"
          className={classes.disabled}
        >
          <EmptyState
            missing="info"
            title="No SLO data available"
            description="No SLO data available for this entity."
          />
        </InfoCard>
      )}
      {!loading && value && (
        <InfoCard title={cardTitle} variant="gridItem" deepLink={linkInfo}>
          <Grid
            item
            container
            direction="column"
            justifyContent="space-between"
            alignItems="center"
            style={{ height: '100%' }}
            spacing={0}
          >
            <Grid item>
              <Typography
                paragraph
                className={
                  value?.res?.summary?.status === 'VIOLATED'
                    ? classes.violation
                    : classes.healthy
                }
              >
                {`${(value?.res?.summary?.sliValue * 100).toFixed(2)}%`}
              </Typography>
              <Typography paragraph className={classes.target}>
                {`SLO Target: ${(value?.res?.objective?.target * 100).toFixed(
                  2,
                )}%`}
              </Typography>
              <Grid item className={classes.lastUpdated}>
                {`Last Updated: ${value?.res?.updatedAt}`}
              </Grid>
            </Grid>
          </Grid>
        </InfoCard>
      )}
    </>
  );
};

export const ElasticSloCard = () => {
  const { entity } = useEntity();

  // TODO, Better UI handling of errors
  if (!isElasticSloIdAvailable(entity)) {
    return (
      <InfoCard title={cardTitle} variant="gridItem">
        <MissingAnnotationEmptyState annotation={KIBANA_SLO_ID_ANNOTATION} />
      </InfoCard>
    );
  }

  return <SloCard />;
};
