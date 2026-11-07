# It's useful to manage public IP addresses outside of NAT/VPC module. 
# You can reuse them later or, for example, whitelist them with your customers for the webhook.
resource "aws_eip" "nat" {
  count = var.enable_nat_gateway ? 1 : 0

  domain = "vpc"

  tags = {
    Name = var.env
    Env  = var.env
  }
}

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "6.4.0"

  name = var.env
  cidr = var.vpc_cidr

  azs             = [var.az1, var.az2]
  private_subnets = [var.private_subnet1_cidr, var.private_subnet2_cidr]
  public_subnets  = [var.public_subnet1_cidr, var.public_subnet2_cidr, ]

  enable_dns_hostnames   = true
  enable_dns_support     = true
  single_nat_gateway     = true
  enable_nat_gateway     = var.enable_nat_gateway
  reuse_nat_ips          = true
  one_nat_gateway_per_az = false
  external_nat_ip_ids    = aws_eip.nat[*].id

  map_public_ip_on_launch = true

  tags = {
    Env = var.env
  }
}
