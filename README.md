# Workshop Bookings

Book customers into workshop service bays without ever double-booking a bay.

- `backend/`: Laravel 12 API (API-only, SQLite, Pest)
- `frontend/`: Next.js 16 App Router (TypeScript), which calls the API server-side only
- `infra/`: Terraform for all AWS infrastructure

Deployed on **AWS ECS Fargate** at **https://odi-monorepo.embate.dev**.

> **Note:** To save costs, the infrastructure is currently turned down, so the link above won't load. Let me know and I can spin the servers up.

## Deployment

The frontend and backend run as two separate ECS services on one Fargate cluster in `us-east-1`.

```
Internet ──HTTPS──▶ ALB ──▶ frontend (Next.js) ──Service Connect──▶ backend (Laravel)
                    │         private subnets                         private subnets, not public
           Route 53 + ACM
```

- **Frontend** sits behind an Application Load Balancer. HTTP redirects to HTTPS (ACM wildcard cert, Route 53 alias).
- **Backend** is internal only. The frontend reaches it at `http://backend:8000` through ECS Service Connect, and the ALB never exposes it.
- Tasks run in private subnets and reach ECR and CloudWatch through a NAT gateway. They use Fargate Spot, and logs go to CloudWatch (`/ecs/dev-odi-monorepo/*`).
- The backend runs exactly one task because SQLite lives on the task's ephemeral disk. Every new task migrates and reseeds.

> **Kept minimal for this demo.** CloudFront, AWS WAF, ECS auto-scaling and RDS are not used. A production setup would add CloudFront for caching, WAF in front of the ALB, auto-scaling policies on the services, and RDS in place of SQLite so the backend can run more than one task.

### CI/CD

[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) deploys on every push to `main` that touches `frontend/` or `backend/`. It only deploys the apps that changed:

1. Bumps that app's semantic version (git tag `<app>/vX.Y.Z`).
2. Builds the image and pushes it to ECR as `odi-monorepo/<app>:vX.Y.Z`.
3. Registers a new task definition revision and rolls the ECS service. If the deployment fails, the circuit breaker rolls it back.

GitHub Actions signs in to AWS through OIDC, so the repo stores no long-lived keys. You can also run the workflow by hand and choose a `patch`, `minor` or `major` bump.

## Infrastructure (Terraform)

All infrastructure is defined in `infra/`. Remote state lives in the `odi-monorepo-terraform-state` S3 bucket, with native S3 locking.

| Stack | What it manages |
|---|---|
| `infra/globals/s3` | Terraform state bucket |
| `infra/globals/ecr` | ECR repositories for `frontend` and `backend` (keeps the last 30 `v*` images) |
| `infra/globals/iam` | GitHub OIDC provider and the deploy role used by Actions |
| `infra/dev/vpc` | VPC, public/private subnets across two AZs, single NAT gateway |
| `infra/dev/ecs` | ECS cluster, services, task definitions, ALB, security groups, Route 53 record, log groups |

Apply them in the order above. For example:

```bash
cd infra/dev/ecs
terraform init -backend-config=../state.config
terraform apply -var-file=../dev.tfvars -var-file=ecs.tfvars
```

Terraform owns the base task definitions, and GitHub Actions ships new image revisions. That is why the services ignore `task_definition` changes, so an apply never rolls back a release.

## Running locally

With Docker:

```bash
make docker-up    # http://localhost:3000/bookings
```

Without Docker (PHP ≥ 8.2, Node ≥ 20):

```bash
make setup
make dev          # http://localhost:3000/bookings
```

Run `make test` for the full test and lint suite.
