# Phase 3: Observability Namespace & Metrics Standardization - COMPLETED

## Objective
Standardize service namespace and metric names to ensure consistent observability data across all deployment methods and monitoring tools.

## Changes Made

### 1. k6 Metric Names (8 files)
Changed all custom metric names from `quickpizza_*` to `quickfood_*`:

✅ **k6/foundations/04.metrics.js**
- `quickpizza_number_of_pizzas` → `quickfood_number_of_foods`
- `quickpizza_ingredients` → `quickfood_ingredients`

✅ **k6/foundations/05.thresholds.js**
- Updated metric names and thresholds

✅ **k6/foundations/06.checks-with-thresholds.js**
- Updated metric names and thresholds

✅ **k6/foundations/07.scenarios.js**
- Updated metric names and thresholds

✅ **k6/foundations/08.arrival-rate.js**
- Updated metric names and thresholds

✅ **k6/foundations/09.data.js**
- Updated metric names and thresholds

✅ **k6/foundations/10.summary.js**
- Updated metric names and thresholds

✅ **k6/foundations/11.composability.js**
- Updated metric names and thresholds

### 2. Documentation Updates

✅ **README.md**
- Updated observability labels documentation:
  - Microservices mode: `service_namespace=quickfood`
  - Monolithic mode: `service_namespace=quickfood`
  - OTEL resource attributes: `service.namespace=quickfood`

✅ **docs/metrics.md**
- Updated metric documentation:
  - `quickpizza_server_http_requests_total` → `quickfood_server_http_requests_total`
  - Section title: "QuickPizza WebSocket Metrics" → "QuickFood WebSocket Metrics"
  - All `quickpizza_server_ws_*` → `quickfood_server_ws_*`

### 3. Kubernetes Configuration

✅ **deployments/kubernetes/base/quickpizza/kustomization.yaml**
- Updated namespace comment: `# namespace: quickpizza` → `# namespace: quickfood`

✅ **deployments/kubernetes/base/alloy/alloy.yaml**
- Updated service account namespace reference: `quickpizza` → `quickfood`

### 4. Terraform Configuration

✅ **deployments/terraform/variables.tf**
- Updated default namespace: `default = "quickpizza"` → `default = "quickfood"`
- Updated description to reference QuickFood

✅ **deployments/terraform/k8-monitoring.yaml**
- Updated namespace exclusion comment and value: `quickpizza` → `quickfood`

## What This Fixes

### Observability Consistency
Before Phase 3, observability data appeared under different namespaces depending on deployment method:
- Docker Compose: `service.namespace=quickfood` ✓
- Kubernetes: `service.namespace=quickpizza` ✗
- Terraform: `service.namespace=quickpizza` ✗

After Phase 3, all deployment methods use:
- `service.namespace=quickfood` ✓
- `service_namespace=quickfood` ✓

### Metric Naming
- k6 custom metrics now use `quickfood_*` prefix
- Consistent with application metrics (`quickfood_server_*`)
- Easier to identify metrics in Grafana Cloud/Prometheus

### Benefits
1. **Unified Dashboards**: All services appear under the same namespace in Application Observability
2. **Consistent Queries**: PromQL queries work across all deployment methods
3. **Clear Branding**: All metrics and labels reflect the QuickFood name
4. **Better Organization**: Metrics are properly grouped by namespace

## Testing Checklist for Phase 3

### Docker Compose Testing
1. ✅ Build: `docker buildx build -t quickfood-local:latest --load .`
2. ✅ Start: `QUICKFOOD_IMAGE=quickfood-local:latest docker compose -f compose.grafana-cloud.microservices.yaml up -d`
3. ✅ Verify application works at http://localhost:3333
4. ✅ Check Grafana Cloud Application Observability
5. ✅ Verify services appear under `service.namespace=quickfood`
6. ✅ Check that metrics are properly labeled

### k6 Testing
Run k6 tests to verify custom metrics are exported correctly:

```bash
cd k6/foundations
k6 run 04.metrics.js
k6 run 05.thresholds.js
```

Expected behavior:
- Tests should pass thresholds
- Custom metrics `quickfood_number_of_foods` and `quickfood_ingredients` should be created
- No errors about missing metrics

### Grafana Cloud Verification
1. ✅ Open Application Observability
2. ✅ Filter by `service.namespace=quickfood`
3. ✅ Verify all services appear (catalog, config, copy, public-api, recommendations, ws, grpc)
4. ✅ Check metrics explorer for `quickfood_server_*` metrics
5. ✅ Verify traces show correct service namespace
6. ✅ Check logs have correct namespace labels

### Prometheus/Metrics Verification
Query Prometheus/Grafana Cloud for:
```promql
# Application metrics
quickfood_server_food_recommendations_total
quickfood_server_http_requests_total
quickfood_server_ws_connections_active

# k6 custom metrics (if k6 is sending to Prometheus)
quickfood_number_of_foods
quickfood_ingredients
```

## Expected Behavior After Phase 3

✅ All services report under `service.namespace=quickfood`
✅ Metrics use `quickfood_*` prefix consistently
✅ Application Observability shows unified view of all services
✅ k6 tests pass with new metric names
✅ Dashboards can query metrics consistently
✅ No breaking changes to application functionality

## Important Notes

### Backward Compatibility
- **Terraform**: Users with existing deployments using `quickpizza` namespace can override the variable
- **Kubernetes**: Namespace is commented out by default, users can set it explicitly
- **Docker Compose**: Already using `quickfood` namespace

### Metric Migration
If you have existing dashboards or alerts using `quickpizza_*` metrics:
1. Update PromQL queries to use `quickfood_*` instead
2. Update service namespace filters from `quickpizza` to `quickfood`
3. Historical data with old metric names will remain queryable

### Database Observability
The Terraform configuration uses the Kubernetes namespace name for database observability labels. With the updated default, new deployments will use `quickfood` namespace.

## Not Changed (Intentional)

The following were NOT changed as they are internal Terraform resource names or will be addressed in Phase 4:
- Terraform resource name: `kubernetes_namespace_v1.quickpizza` (internal identifier)
- Terraform variable name: `quickpizza_kubernetes_namespace` (for backward compatibility)
- UI text and labels - Phase 4
- Documentation prose - Phase 4

## Next Phase

Phase 4 will address:
- Frontend UI text and titles
- Documentation updates (README, docs)
- Image asset names
- Any remaining user-facing "pizza" references
