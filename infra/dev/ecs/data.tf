data "terraform_remote_state" "vpc" {
  backend = "s3"

  config = {
    region = var.region
    bucket = var.bucket
    key    = "${var.env}/vpc/terraform.tfstate"
  }
}

data "aws_ecr_repository" "frontend" {
  name = "${var.ecr_repository_prefix}/frontend"
}

data "aws_ecr_repository" "backend" {
  name = "${var.ecr_repository_prefix}/backend"
}

locals {
  name               = "${var.env}-${var.app_name}"
  app_domain         = "${var.app_subdomain}.${var.domain_name}"
  vpc_id             = data.terraform_remote_state.vpc.outputs.vpc_id
  public_subnet_ids  = data.terraform_remote_state.vpc.outputs.public_subnet_ids
  private_subnet_ids = data.terraform_remote_state.vpc.outputs.private_subnet_ids

  # Private subnets reach ECR through the NAT gateway. Without one, tasks need a public IP in a public subnet.
  task_subnet_ids   = var.use_private_subnets ? local.private_subnet_ids : local.public_subnet_ids
  task_public_ip    = !var.use_private_subnets
  capacity_provider = var.use_fargate_spot ? "FARGATE_SPOT" : "FARGATE"

  # Service Connect name the frontend uses to reach the backend (http://backend:<port>).
  backend_dns_name = "backend"
  backend_url      = "http://${local.backend_dns_name}:${var.backend.port}"
}
