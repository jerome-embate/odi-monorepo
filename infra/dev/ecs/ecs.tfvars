app_name            = "track-tool"
ecr_repository_name = "track-tool-req"
image_tag           = "v0.1.0-70addf6"

domain_name   = "embate.dev"
app_subdomain = "tracktool"

container_port = 3000
cpu            = 256
memory         = 512
desired_count  = 1

# Cheaper for dev; tasks can be interrupted with 2 minutes' notice.
use_fargate_spot = true

# Keep false while the VPC NAT gateway is disabled.
use_private_subnets = false
