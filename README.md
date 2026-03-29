# Ulam Generator

## Read Me
This is a demo app inspired from Grafana's demo localized to asian food theme to demo monitoring + observability. This was modified to convert it to asian themed food generator for APAC audience demos and also updated with AWS specific tweaks specifically:
- The original application communicated all services in port 3333 which Alloy is able to emit telemetry that Grafana can granulary present in the `Application > Services` and `Services Map` screen. For ECS on Fargate deployment, we create the option to run only specific services in the task definition to match how the app would be deployed in a Production setting in Fargate and allow us to seperate the telemetry better rendering in downstream Observability tool destinations.
- Added custom Alloy sidecar in `deployments\ecs` that can emit signals from Fargate.
- Added ECS Fargate task definitions that will utilize ADOT sidecar under `ecs\microservices` instead of the standard Alloy.
- For Fargate deployment, ADOT can emit signals to both Grafana Cloud and AWS native observability services (CloudWatch) at the same time allowing one application to be able to cover multiple demos.

## Customizations
1. AWS Fargate Deployment
2. Option: Alloy sidecar for deploying to AWS Fargate and emit signals to Grafana Cloud
3. Option (recommended): ADOT sidecar for deploying to AWS Fargate and emit signals to Grafana Cloud (and native AWS services out-of-the-box)
4. Custom rice error (logged in backend) that triggers randomly when garlic bread is generated instead of rice (demonstrate in Faro, app logs)
5. Spruced up the UI with hero image to make it fun for demos in the office
6. Asian food theme because I'm Asian - Lol

##

---

## AWS Specific Fargate Deployment Notes

### ALB Setup (for public-api only)

Create an Application Load Balancer for the public-api service:
- Scheme: Internet-facing
- Security group: separate ALB SG allowing inbound HTTP/80 from 0.0.0.0/0
- Target group: IP type, port 3333, health check path `/healthz`
- Attach to the public-api ECS service

The services security group should allow port 3333 inbound from the ALB security group
(not from 0.0.0.0/0) for proper traffic isolation.

### ADOT Environment Variables

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

Note: The ALB incurs ~$0.70/day even with zero tasks. Delete it and recreate when needed. The target group persists independently.

### Troubleshooting

#### CloudWatch Log Group Not Found
ECS tasks will fail to start with `ResourceInitializationError` if the CloudWatch log
group doesn't exist. Create all log groups before deploying. The log group
name in the task definition must match exactly.

#### ADOT 401 Unauthorized to Grafana Cloud
ADOT returns `401 Unauthorized` if `GRAFANA_OTLP_AUTH` is incorrect or the token has
expired. Verify the token has the required scopes: `metrics:write`, `logs:write`,
`traces:write`, `profiles:write`.

#### Faro CORS Errors
The browser will show `CORS Missing Allow Origin` if your app's domain is not whitelisted
in Grafana Cloud Frontend Observability settings. Add the exact origin (e.g.
`http://<alb-dns-name>`) to the Faro app's Allowed Origins list in Grafana Cloud →
Frontend Observability → your app → Settings.

#### Faro AdBlocker Errors
During testing, I was using uBlock Origin and this may sometimes interfere with the browser
sending data to Faro. Disable your adblocker

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
