data "terraform_remote_state" "vpc" {
  backend = "s3"

  config = {
    region = var.region
    bucket = var.bucket
    key    = "${var.env}/vpc/terraform.tfstate"
  }
}

data "aws_ecr_repository" "app" {
  name = var.ecr_repository_name
}

locals {
  name               = "${var.env}-${var.app_name}"
  app_domain         = "${var.app_subdomain}.${var.domain_name}"
  vpc_id             = data.terraform_remote_state.vpc.outputs.vpc_id
  public_subnet_ids  = data.terraform_remote_state.vpc.outputs.public_subnet_ids
  private_subnet_ids = data.terraform_remote_state.vpc.outputs.private_subnet_ids
}
