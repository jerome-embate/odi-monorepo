variable "env" {
  description = "Environment name."
}

variable "region" {
  description = "AWS region to provision infrastructure."
}

variable "bucket" {
  type        = string
  description = "S3 bucket for terraform state. Also used to read the VPC state."
}

variable "app_name" {
  type        = string
  description = "Application name, used to name the ECS, ALB and security group resources."
}

variable "ecr_repository_prefix" {
  type        = string
  description = "ECR repository prefix. Images are read from <prefix>/frontend and <prefix>/backend."
}

variable "frontend" {
  type = object({
    image_tag         = string
    port              = optional(number, 3000)
    cpu               = optional(number, 256)
    memory            = optional(number, 512)
    desired_count     = optional(number, 1)
    health_check_path = optional(string, "/")
  })
  description = "Next.js frontend service. It's the only service behind the ALB. image_tag is only used for the initial task definition; later releases are deployed by GitHub Actions."
}

variable "backend" {
  type = object({
    image_tag         = string
    port              = optional(number, 8000)
    cpu               = optional(number, 256)
    memory            = optional(number, 512)
    health_check_path = optional(string, "/up")
  })
  description = "Laravel backend service. Internal only, reachable by the frontend at http://backend:<port> through Service Connect. Always runs one task because SQLite is per task. image_tag is only used for the initial task definition."
}

variable "domain_name" {
  type        = string
  description = "Route 53 hosted zone and ACM certificate domain, e.g. example.com."
}

variable "app_subdomain" {
  type        = string
  description = "Subdomain the app is served on, e.g. app for app.example.com."
}

variable "use_fargate_spot" {
  type        = bool
  default     = false
  description = "Run tasks on Fargate Spot (cheaper, but tasks can be interrupted)."
}

variable "use_private_subnets" {
  type        = bool
  default     = false
  description = "Run tasks in private subnets. Only set to true once the VPC NAT gateway is enabled, otherwise tasks cannot pull from ECR."
}

variable "log_retention_days" {
  type        = number
  default     = 7
  description = "CloudWatch log retention for the app containers."
}
