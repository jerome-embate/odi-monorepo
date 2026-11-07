locals {
  # One repository per app in each monorepo, e.g. odi-monorepo/frontend and odi-monorepo/backend.
  repo_names = toset(flatten([
    for name, _ in var.github_repos : [for app in var.apps : "${lower(name)}/${app}"]
  ]))
}

module "ecr" {
  source  = "terraform-aws-modules/ecr/aws"
  version = "3.1.0"

  for_each = local.repo_names

  repository_name = each.key

  repository_lifecycle_policy = jsonencode({
    rules = [
      {
        rulePriority = 1,
        description  = "Keep last 30 images",
        selection = {
          tagStatus = "tagged",
          tagPatternList : ["v"]
          countType   = "imageCountMoreThan",
          countNumber = 30
        },
        action = {
          type = "expire"
        }
      }
    ]
  })
}
