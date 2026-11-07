# ALB: open to the internet on HTTP/HTTPS, can only talk to the frontend tasks.
resource "aws_security_group" "alb" {
  name        = "${local.name}-alb"
  description = "ALB for ${local.name}"
  vpc_id      = local.vpc_id

  tags = {
    Name = "${local.name}-alb"
    Env  = var.env
  }
}

resource "aws_vpc_security_group_ingress_rule" "alb_http" {
  security_group_id = aws_security_group.alb.id
  description       = "HTTP from the internet"
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "tcp"
  from_port         = 80
  to_port           = 80
}

resource "aws_vpc_security_group_ingress_rule" "alb_https" {
  security_group_id = aws_security_group.alb.id
  description       = "HTTPS from the internet"
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "tcp"
  from_port         = 443
  to_port           = 443
}

resource "aws_vpc_security_group_egress_rule" "alb_to_frontend" {
  security_group_id            = aws_security_group.alb.id
  description                  = "To frontend tasks"
  referenced_security_group_id = aws_security_group.frontend.id
  ip_protocol                  = "tcp"
  from_port                    = var.frontend.port
  to_port                      = var.frontend.port
}

# Frontend tasks: only reachable from the ALB.
resource "aws_security_group" "frontend" {
  name        = "${local.name}-frontend"
  description = "Frontend ECS tasks for ${local.name}"
  vpc_id      = local.vpc_id

  tags = {
    Name = "${local.name}-frontend"
    Env  = var.env
  }
}

resource "aws_vpc_security_group_ingress_rule" "frontend_from_alb" {
  security_group_id            = aws_security_group.frontend.id
  description                  = "From the ALB"
  referenced_security_group_id = aws_security_group.alb.id
  ip_protocol                  = "tcp"
  from_port                    = var.frontend.port
  to_port                      = var.frontend.port
}

# Outbound is needed to pull the image from ECR, ship logs, and call the backend.
resource "aws_vpc_security_group_egress_rule" "frontend_all" {
  security_group_id = aws_security_group.frontend.id
  description       = "All outbound"
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
}

# Backend tasks: internal API, only reachable from the frontend tasks (via Service Connect).
resource "aws_security_group" "backend" {
  name        = "${local.name}-backend"
  description = "Backend ECS tasks for ${local.name}"
  vpc_id      = local.vpc_id

  tags = {
    Name = "${local.name}-backend"
    Env  = var.env
  }
}

# The Service Connect proxy in the backend task listens on the container port.
resource "aws_vpc_security_group_ingress_rule" "backend_from_frontend" {
  security_group_id            = aws_security_group.backend.id
  description                  = "From the frontend tasks"
  referenced_security_group_id = aws_security_group.frontend.id
  ip_protocol                  = "tcp"
  from_port                    = var.backend.port
  to_port                      = var.backend.port
}

# Outbound is needed to pull the image from ECR and ship logs to CloudWatch.
resource "aws_vpc_security_group_egress_rule" "backend_all" {
  security_group_id = aws_security_group.backend.id
  description       = "All outbound"
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
}
