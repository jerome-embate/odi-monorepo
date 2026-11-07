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

variable "ecr_repository_name" {
  type        = string
  description = "Name of the ECR repository holding the app image."
}

variable "image_tag" {
  type        = string
  description = "Image tag for the initial task definition. Later releases are deployed by GitHub Actions."
}

variable "domain_name" {
  type        = string
  description = "Route 53 hosted zone and ACM certificate domain, e.g. example.com."
}

variable "app_subdomain" {
  type        = string
  description = "Subdomain the app is served on, e.g. app for app.example.com."
}

variable "container_port" {
  type        = number
  default     = 3000
  description = "Port the container listens on."
}

variable "cpu" {
  type        = number
  default     = 256
  description = "Fargate task CPU units (256 = 0.25 vCPU)."
}

variable "memory" {
  type        = number
  default     = 512
  description = "Fargate task memory in MiB."
}

variable "desired_count" {
  type        = number
  default     = 1
  description = "Number of tasks to run."
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

variable "health_check_path" {
  type        = string
  default     = "/"
  description = "Path the ALB uses to health check the app."
}

variable "log_retention_days" {
  type        = number
  default     = 7
  description = "CloudWatch log retention for the app container."
}
