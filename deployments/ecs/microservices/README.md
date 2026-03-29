# ECS Fargate Microservices Deployment

Deploys QuickFood as separate ECS services with ADOT collector sidecars,
sending telemetry to both AWS (X-Ray, CloudWatch, Application Signals)
and Grafana Cloud.

## Architecture

```
ECS Cluster (Service Connect namespace: quickfood)
├── public-api   (port 3333, internet-facing, serves frontend + gateway)
├── catalog      (port 3333, internal, DB access)
├── copy         (port 3333, internal, DB access)
├── recommendations (port 3333, internal)
├── ws           (port 3333, internal, WebSocket)
├── config       (port 3333, internal)
└── grpc         (port 3334, internal)
Each service has an ADOT sidecar for telemetry collection.
```

## Prerequisites

1. ECR image pushed: `<account-id>.dkr.ecr.<region>.amazonaws.com/hkdemo/ulam-gen:latest`
2. ECS cluster with Service Connect enabled (namespace: `quickfood`)
3. IAM task execution role with:
   - `AmazonECSTaskExecutionRolePolicy`
   - `AWSXRayDaemonWriteAccess`
   - `CloudWatchLogsFullAccess`
4. IAM task role with:
   - `AWSXRayDaemonWriteAccess`
   - `CloudWatchLogsFullAccess`
5. VPC with subnets and security group allowing internal traffic on ports 3333-3335
6. CloudWatch log groups created (see below)

## Setup Steps

### 1. Create CloudWatch Log Groups

```bash
aws logs create-log-group --log-group-name /ecs/quickfood/public-api --region us-east-1
aws logs create-log-group --log-group-name /ecs/quickfood/catalog --region us-east-1
aws logs create-log-group --log-group-name /ecs/quickfood/copy --region us-east-1
aws logs create-log-group --log-group-name /ecs/quickfood/recommendations --region us-east-1
aws logs create-log-group --log-group-name /ecs/quickfood/ws --region us-east-1
aws logs create-log-group --log-group-name /ecs/quickfood/config --region us-east-1
aws logs create-log-group --log-group-name /ecs/quickfood/grpc --region us-east-1
aws logs create-log-group --log-group-name /ecs/quickfood/metrics --region us-east-1
aws logs create-log-group --log-group-name /ecs/quickfood/otel-logs --region us-east-1
```

### 2. Create ECS Cluster with Service Connect

```bash
aws ecs create-cluster \
  --cluster-name quickfood \
  --service-connect-defaults namespace=quickfood \
  --region us-east-1
```

### 3. Register Task Definitions

See task definition JSON files in this directory.
Register each one:

```bash
for svc in public-api catalog copy recommendations ws config grpc; do
  aws ecs register-task-definition \
    --cli-input-json file://task-def-${svc}.json \
    --region us-east-1
done
```

### 4. Create Services

Create internal services first, then public-api last:

```bash
# Internal services (no load balancer)
for svc in catalog copy recommendations ws config grpc; do
  aws ecs create-service \
    --cluster quickfood \
    --service-name ${svc} \
    --task-definition quickfood-${svc} \
    --desired-count 1 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[<subnet-id>],securityGroups=[<sg-id>],assignPublicIp=ENABLED}" \
    --service-connect-configuration '{
      "enabled": true,
      "namespace": "quickfood",
      "services": [{
        "portName": "'${svc}'",
        "discoveryName": "'${svc}'",
        "clientAliases": [{"port": 3333, "dnsName": "'${svc}'"}]
      }]
    }' \
    --region us-east-1
done

# public-api (internet-facing, attach to ALB if needed)
aws ecs create-service \
  --cluster quickfood \
  --service-name public-api \
  --task-definition quickfood-public-api \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[<subnet-id>],securityGroups=[<sg-id>],assignPublicIp=ENABLED}" \
  --service-connect-configuration '{
    "enabled": true,
    "namespace": "quickfood",
    "services": [{
      "portName": "public-api",
      "discoveryName": "public-api",
      "clientAliases": [{"port": 3333, "dnsName": "public-api"}]
    }]
  }' \
  --region us-east-1
```

### Environment Variables

Set these in the ADOT container for Grafana Cloud integration:
- `GRAFANA_OTLP_ENDPOINT`: e.g. `https://otlp-gateway-prod-us-east-0.grafana.net/otlp`
- `GRAFANA_OTLP_AUTH`: Base64-encoded `<instance-id>:<token>`
- `AWS_REGION`: `us-east-1`

---

## Suggested Additions (review and merge as needed)

### 5. Create ALB (for public-api only)

Create an Application Load Balancer for the public-api service:
- Scheme: Internet-facing
- Security group: separate ALB SG allowing inbound HTTP/80 from 0.0.0.0/0
- Target group: IP type, port 3333, health check path `/healthz`
- Attach to the public-api ECS service

The services security group should allow port 3333 inbound from the ALB security group
(not from 0.0.0.0/0) for proper traffic isolation.

### Environment Variables (expanded)

- `GRAFANA_OTLP_ENDPOINT`: e.g. `https://otlp-gateway-prod-us-east-0.grafana.net/otlp`
- `GRAFANA_OTLP_AUTH`: Base64-encoded `<instance-id>:<token>`. You can find the pre-encoded value in Grafana Cloud → Connections → OpenTelemetry (OTLP) under the `OTEL_EXPORTER_OTLP_HEADERS` example.
- `AWS_REGION`: e.g. `us-east-1` (where your ECS cluster runs, independent of Grafana Cloud region)

### IAM Roles

Two roles are required:
- **Task Execution Role**: Used by the ECS agent to pull images from ECR and write container logs to CloudWatch. Needs `AmazonECSTaskExecutionRolePolicy`.
- **Task Role**: Used by containers at runtime. The ADOT sidecar needs this to call X-Ray and CloudWatch APIs. Needs `AWSXRayDaemonWriteAccess` and `CloudWatchFullAccessV2` (or `CloudWatchLogsFullAccess`).

Both roles must trust `ecs-tasks.amazonaws.com` in their trust policy.

### Scaling Down (Cost Savings)

Scale all services to zero when not in use:

```bash
for svc in public-api catalog copy recommendations ws config grpc; do
  aws ecs update-service --cluster quickfood --service ${svc} --desired-count 0 --region us-east-1
done
```

Scale back up:

```bash
for svc in public-api catalog copy recommendations ws config grpc; do
  aws ecs update-service --cluster quickfood --service ${svc} --desired-count 1 --region us-east-1
done
```

Note: The ALB incurs ~$0.70/day even with zero tasks. Delete it for true zero cost
and recreate when needed. The target group persists independently.

### Troubleshooting

#### CloudWatch Log Group Not Found
ECS tasks will fail to start with `ResourceInitializationError` if the CloudWatch log
group doesn't exist. Create all log groups before deploying (see Step 1). The log group
name in the task definition must match exactly.

#### ADOT 401 Unauthorized to Grafana Cloud
The `grafana_cloud.stack` module returns `401 Unauthorized` if `GRAFANA_CLOUD_TOKEN` or
`GRAFANA_CLOUD_STACK` are incorrect. Verify the token hasn't expired and has the required
scopes: `metrics:write`, `logs:write`, `traces:write`, `profiles:write`.

#### Faro CORS Errors
The browser will show `CORS Missing Allow Origin` if your app's domain is not whitelisted
in Grafana Cloud Frontend Observability settings. Add the exact origin (e.g.
`http://<alb-dns-name>`) to the Faro app's Allowed Origins list in Grafana Cloud →
Frontend Observability → your app → Settings.

#### Services Missing from Grafana Service Map
- Verify each service's ADOT sidecar is running (check ECS task containers)
- Confirm the task is using the latest task definition revision with the Grafana exporter
- Check ADOT logs in CloudWatch for export errors
- Services only appear on the service map when they participate in distributed traces;
  generate traffic by using the app

#### Fargate Tasks Can't Pull Images or Send Telemetry
Tasks in public subnets need `assignPublicIp=ENABLED` to reach ECR, CloudWatch, X-Ray,
and Grafana Cloud. Without it, use VPC endpoints (PrivateLink) or a NAT Gateway.

#### Service Connect DNS Resolution Failures
Ensure all services use "Client and server" mode in Service Connect configuration.
The discovery name and DNS name must match what other services use in their endpoint
env vars (e.g. `QUICKFOOD_CATALOG_ENDPOINT=http://catalog:3333` requires DNS name `catalog`).
