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
import {
  Box,
  Grid,
  Card,
  CardContent,
  Tooltip,
  Typography,
  CardActions,
  Button,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import useAsync from 'react-use/lib/useAsync';
import { elasticApiRef } from '../../api';
import { ELASTICSEARCH_APM_SERVICE_NAME_ANNOTATION } from '@p1llus/backstage-plugin-elastic-common';
import { isElasticApmNameAvailable } from '../../helpers';
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

const cardTitle = 'APM Stats';

// TODO: Might move cards to its own generic component later, though it might result in passing so many props the logic would be too confusing.
const ApmCard = () => {
  const { entity } = useEntity();
  const elasticSloApi = useApi(elasticApiRef);
  const stringEntityRef = encodeURIComponent(stringifyEntityRef(entity));
  const classes = useStyles();

  const { value, loading, error } = useAsync(
    async () => elasticSloApi.fetchApmStats(stringEntityRef),
    [elasticSloApi, stringEntityRef],
  );

  // TODO: lets move links to backend now that it has the entityref
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
            title="No APM data found"
            description="No APM data found for this entity."
          />
        </InfoCard>
      )}
      {!loading && value?.res && (
        <Box sx={{ mb: 1 }}>
          <Grid container>
            <Grid container spacing={1}>
              <Grid item xs={4} sm={4}>
                <Tooltip title="Average latency based on last 1 hour">
                  <Card>
                    <CardContent>
                      <Typography component="span" variant="body2">
                        Latency
                      </Typography>
                      <Typography variant="h4">
                        {value.res.latency.value.toFixed(2)} ms
                      </Typography>
                    </CardContent>
                    <CardActions>
                      <Button size="small">View in Kibana</Button>
                    </CardActions>
                  </Card>
                </Tooltip>
              </Grid>
              <Grid item xs={4} sm={4}>
                <Tooltip title="Average throughput from last 1 hour">
                  <Card>
                    <CardContent>
                      <Typography component="span" variant="body2">
                        Throughput
                      </Typography>
                      <Typography variant="h4">
                        {value.res.throughput.toFixed(2)} tpm
                      </Typography>
                    </CardContent>
                    <CardActions>
                      <Button size="small">View in Kibana</Button>
                    </CardActions>
                  </Card>
                </Tooltip>
              </Grid>
              <Grid item xs={4} sm={4}>
                <Tooltip title="The average rate of failures from last 1 hour">
                  <Card>
                    <CardContent>
                      <Typography component="span" variant="body2">
                        Failure Rate
                      </Typography>
                      <Typography variant="h4">
                        {value.res.failure_rate.value.toFixed(2)}%
                      </Typography>
                    </CardContent>
                    <CardActions>
                      <Button size="small">View in Kibana</Button>
                    </CardActions>
                  </Card>
                </Tooltip>
              </Grid>
            </Grid>
          </Grid>
        </Box>
      )}
    </>
  );
};

export const ElasticApmCard = () => {
  const { entity } = useEntity();

  // TODO, Better UI handling of errors
  if (!isElasticApmNameAvailable(entity)) {
    return (
      <InfoCard title={cardTitle} variant="gridItem">
        <MissingAnnotationEmptyState
          annotation={ELASTICSEARCH_APM_SERVICE_NAME_ANNOTATION}
        />
      </InfoCard>
    );
  }

  return <ApmCard />;
};
