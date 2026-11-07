resource "aws_ecs_cluster" "this" {
  name = local.name

  setting {
    name  = "containerInsights"
    value = "disabled"
  }

  tags = {
    Env = var.env
  }
}

resource "aws_ecs_cluster_capacity_providers" "this" {
  cluster_name       = aws_ecs_cluster.this.name
  capacity_providers = ["FARGATE", "FARGATE_SPOT"]
}

resource "aws_cloudwatch_log_group" "app" {
  name              = "/ecs/${local.name}"
  retention_in_days = var.log_retention_days

  tags = {
    Env = var.env
  }
}

resource "aws_ecs_task_definition" "app" {
  family                   = local.name
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.cpu
  memory                   = var.memory
  execution_role_arn       = aws_iam_role.task_execution.arn

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "X86_64"
  }

  container_definitions = jsonencode([
    {
      name      = var.app_name
      image     = "${data.aws_ecr_repository.app.repository_url}:${var.image_tag}"
      essential = true

      portMappings = [
        {
          containerPort = var.container_port
          protocol      = "tcp"
        },
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.app.name
          awslogs-region        = var.region
          awslogs-stream-prefix = var.app_name
        }
      }
    },
  ])

  tags = {
    Env = var.env
  }
}

resource "aws_ecs_service" "app" {
  name            = local.name
  cluster         = aws_ecs_cluster.this.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = var.desired_count

  capacity_provider_strategy {
    capacity_provider = var.use_fargate_spot ? "FARGATE_SPOT" : "FARGATE"
    weight            = 1
  }

  # Without a NAT gateway, tasks need a public IP in a public subnet to reach ECR.
  network_configuration {
    subnets          = var.use_private_subnets ? local.private_subnet_ids : local.public_subnet_ids
    security_groups  = [aws_security_group.app.id]
    assign_public_ip = !var.use_private_subnets
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = var.app_name
    container_port   = var.container_port
  }

  health_check_grace_period_seconds = 30

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  # GitHub Actions deploys new task definition revisions with each image release.
  # Terraform keeps managing the base task definition but doesn't roll the service back.
  lifecycle {
    ignore_changes = [task_definition]
  }

  depends_on = [
    aws_lb_listener.https,
    aws_ecs_cluster_capacity_providers.this,
  ]

  tags = {
    Env = var.env
  }
}
