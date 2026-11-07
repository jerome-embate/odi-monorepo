terraform {
  backend "s3" {
    region       = ""
    bucket       = ""
    key          = "dev/ecs/terraform.tfstate"
    use_lockfile = true
    encrypt      = true
  }
}
