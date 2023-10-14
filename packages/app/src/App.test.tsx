import React from 'react';
import { renderWithEffects } from '@backstage/test-utils';
import App from './App';

describe('App', () => {
  it('should render', async () => {
    process.env = {
      NODE_ENV: 'test',
      APP_CONFIG: [
        {
          data: {
            app: { title: 'Test' },
            backend: { baseUrl: 'http://localhost:7007' },
            techdocs: {
              storageUrl: 'http://localhost:7007/api/techdocs/static/docs',
            },
            elastic: {
              allow_guests: true,
              elasticsearch: {
                baseUrl: 'http://localhost:9200',
                apiKey: 'testKey',
              },
              kibana: {
                baseUrl: 'http://localhost:5601',
                apiKey: 'testKey',
              },
            },
            auth: {
              environment: 'test',
            },
          },
          context: 'test',
        },
      ] as any,
    };

    const rendered = await renderWithEffects(<App />);
    expect(rendered.baseElement).toBeInTheDocument();
  });
});
