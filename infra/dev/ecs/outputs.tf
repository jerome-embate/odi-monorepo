output "app_url" {
  value       = "https://${local.app_domain}"
  description = "Public URL of the app."
}

output "alb_dns_name" {
  value       = aws_lb.app.dns_name
  description = "ALB DNS name, which the app domain aliases to."
}

output "cluster_name" {
  value       = aws_ecs_cluster.this.name
  description = "ECS cluster name."
}

output "service_name" {
  value       = aws_ecs_service.app.name
  description = "ECS service name."
}

output "log_group" {
  value       = aws_cloudwatch_log_group.app.name
  description = "CloudWatch log group for the app container."
}
