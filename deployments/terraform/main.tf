resource "kubernetes_namespace_v1" "quickpizza" {
  metadata {
    name = var.quickpizza_kubernetes_namespace
  }
}

locals {
  quickpizza_common_env = [
    {
      name  = "QUICKFOOD_CATALOG_ENDPOINT"
      value = "http://catalog:3333"
    },
    {
      name  = "QUICKFOOD_COPY_ENDPOINT"
      value = "http://copy:3333"
    },
    {
      name  = "QUICKFOOD_WS_ENDPOINT"
      value = "http://ws:3333"
    },
    {
      name  = "QUICKFOOD_RECOMMENDATIONS_ENDPOINT"
      value = "http://recommendations:3333"
    },
    {
      name  = "QUICKFOOD_CONFIG_ENDPOINT"
      value = "http://config:3333"
    },
    {
      name  = "QUICKFOOD_ENABLE_ALL_SERVICES"
      value = 0
    },
    {
      name  = "QUICKFOOD_OTLP_ENDPOINT"
      value = "http://alloy:4318"
    },
    {
      name  = "QUICKFOOD_TRUST_CLIENT_TRACEID"
      value = true
    },
    {
      name  = "OTEL_RESOURCE_ATTRIBUTES"
      value = "deployment.environment=${var.deployment_environment},service.version=${var.quickpizza_image}"
    },
    {
      name  = "QUICKFOOD_LOG_LEVEL"
      value = var.quickpizza_log_level
    }
  ]
  default_resources = {
    requests = {
      cpu    = "5m"
      memory = "64Mi"
    }
  }
}