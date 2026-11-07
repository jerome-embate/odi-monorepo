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

output "frontend_service_name" {
  value       = aws_ecs_service.frontend.name
  description = "Frontend ECS service name."
}

output "backend_service_name" {
  value       = aws_ecs_service.backend.name
  description = "Backend ECS service name."
}

output "frontend_task_family" {
  value       = aws_ecs_task_definition.frontend.family
  description = "Frontend task definition family, used by the deploy workflow."
}

output "backend_task_family" {
  value       = aws_ecs_task_definition.backend.family
  description = "Backend task definition family, used by the deploy workflow."
}

output "backend_internal_url" {
  value       = local.backend_url
  description = "URL the frontend uses to reach the backend through Service Connect."
}

output "frontend_log_group" {
  value       = aws_cloudwatch_log_group.frontend.name
  description = "CloudWatch log group for the frontend container."
}

output "backend_log_group" {
  value       = aws_cloudwatch_log_group.backend.name
  description = "CloudWatch log group for the backend container."
}
