# QuickFood Prometheus Metrics

This document provides a comprehensive list of Prometheus metrics collected by the QuickFood application. All metrics are identified by the labels `namespace=quickfood` or `service_namespace=quickfood`.

## Go Runtime Metrics

`go_*`

These metrics are automatically collected by the Prometheus Go client library and provide insights into the Go runtime behavior.


## Process Metrics

`process_*`

These metrics provide information about the operating system process running the application.

## PostgreSQL Metrics

`pg_*`

These metrics provide information about the PostgreSQL database connections and operations.

## OpenTelemetry HTTP Metrics

`http_client_*` and `http_server_*`

These metrics are automatically collected by the OpenTelemetry HTTP instrumentation  and provide detailed insights into HTTP request/response patterns. 

Request duration metrics are implemented as **classic histograms** with `_bucket`, `_sum`, and `_count` suffixes.


- `http_server_request_duration`: Duration of HTTP server requests in seconds.
  
- `http_server_request_body_size`: Size of HTTP server request bodies in bytes.
  
- `http_server_response_body_size`: Size of HTTP server response bodies in bytes.

- `http_client_request_duration`: Duration of HTTP client requests in seconds. Measures time spent making outbound HTTP requests. Useful for monitoring external service dependencies.
  
- `http_client_request_body_size`: Size of HTTP client request bodies in bytes.

## Trace-Derived Metrics

`traces_service_graph_*` and `traces_span_metrics_*`

These metrics are generated from distributed traces and are configured in Grafana Alloy or enabled automatically in Grafana Cloud. They provide service-to-service relationship data and span-level metrics from traces.

## QuickFood Application Metrics

`quickfood_server_*`

These are custom application metrics specific to the QuickFood application, implemented using the Prometheus Go client library. 

- `quickfood_server_food_recommendations_total`: Total number of food recommendations served (Counter metric).

- `quickfood_server_number_of_ingredients_per_food`: Distribution of ingredients per food (Classic Histogram).

- `quickfood_server_number_of_ingredients_per_food_native`: Distribution of ingredients per food (Native Histogram).

- `quickfood_server_food_calories_per_serving`: Distribution of calories per food serving (Classic Histogram).

- `quickfood_server_food_calories_per_serving_native`: Distribution of calories per food serving (Native Histogram).

- `quickfood_server_http_request_duration_seconds`: Duration of HTTP request processing (Classic Histogram).

- `quickfood_server_http_request_duration_seconds_native`: Duration of HTTP request processing (Native Histogram).

- `quickfood_server_http_request_duration_seconds_gauge`: Duration of HTTP request processing (Gauge).

- `quickfood_server_http_requests_total`: Total number of HTTP requests received (Counter metric).

## QuickFood WebSocket Metrics

`quickfood_server_ws_*`

These metrics track WebSocket connection lifecycle and message processing. They are separate from HTTP metrics because WebSocket connections are long-lived and would skew HTTP latency results.

- `quickfood_server_ws_connections_active`: Number of currently active WebSocket connections (Gauge).

- `quickfood_server_ws_connection_duration_seconds`: Duration of WebSocket connections in seconds (Native Histogram).

- `quickfood_server_ws_messages_received_total`: Total number of messages received via WebSocket (Counter).

- `quickfood_server_ws_message_processing_duration_seconds`: Time to process and broadcast incoming WebSocket messages (Native Histogram).