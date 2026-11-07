region         = "us-east-1"
bucket         = "odi-monorepo-terraform-state"
iam_role_name  = "odi-monorepo-github-actions"
github_account = "jerome-embate@8864060"
github_repos = {
  "odi-monorepo" = { repo_id = 1448882319 }
}
apps = ["frontend", "backend"]
