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
