app_name              = "odi-monorepo"
ecr_repository_prefix = "odi-monorepo"

domain_name   = "embate.dev"
app_subdomain = "odi-monorepo"

# image_tag only seeds the first task definition; GitHub Actions deploys later releases.
# Push an image with this tag to each repo before the first apply, or the services won't start.
frontend = {
  image_tag     = "v0.1.0"
  port          = 3000
  cpu           = 256
  memory        = 512
  desired_count = 1
}

# SQLite lives on the task's ephemeral disk: each new backend task migrates and reseeds.
backend = {
  image_tag = "v0.1.0"
  port      = 8000
  cpu       = 256
  memory    = 512
}

# Cheaper for dev; tasks can be interrupted with 2 minutes' notice.
# A backend interruption resets its SQLite data.
use_fargate_spot = true

# Tasks run in the private subnets without public IPs and reach ECR/CloudWatch through the
# VPC NAT gateway. Requires enable_nat_gateway = true in vpc.tfvars (apply the VPC first).
use_private_subnets = true
