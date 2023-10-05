export interface Config {
  /** Configuration options for the Elastic backend plugin */
  elastic: {
    /**
     * If true, the API exposed by the backend plugin will not validate if a valid Backstage token is provided.
     *
     * Default is true. All Backstage backend plugin API's are by default accessible by anyone, the config option is only exposed to be able to override this default.
     * @visibility backend
     */
    allow_guests?: boolean;

    /**
     * An array of all the Elastic instances that should be available to the backend plugin.
     * @visibility backend
     */
    instances: Array<{
      /**
       * The name of the Elastic instance. This name is used to link a annotated entity to a specific instance when requesting data from the backend plugin.
       *
       * @visibility backend
       */
      name: string;

      /**
       * Specific Kibana configuration options
       *
       * @visibility backend
       */
      kibana?: {
        /**
         * The base URL of the Kibana instance to send the API request to.
         *
         * @visibility backend
         */
        baseUrl: string;

        /**
         * The API Key to authenticate requests sent to the Kibana instances by the backend plugin
         *
         * @visibility secret
         */
        apiKey: string;
      };

      /**
       * Specific Elasticsearch configuration options
       *
       * @visibility backend
       */
      elasticsearch?: {
        /**
         * The base URL of the Elasticsearch instance to send the API request to.
         *
         * @visibility backend
         */
        baseUrl: string;

        /**
         * The API Key to authenticate requests sent to the Elasticsearch instances by the backend plugin
         *
         * @visibility secret
         */
        apiKey: string;
      };
    }>;
  };
}
