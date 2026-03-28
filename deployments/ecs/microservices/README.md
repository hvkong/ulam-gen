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
