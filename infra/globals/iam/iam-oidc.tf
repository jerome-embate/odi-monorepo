# This already exists on the AWS account, so we don't need to create it again. We can just reference it in iam_role.tf line 50.

# module "iam_oidc_provider" {
#   source  = "terraform-aws-modules/iam/aws//modules/iam-oidc-provider"
#   version = "6.2.1"

#   url            = "https://token.actions.githubusercontent.com"
#   client_id_list = ["sts.amazonaws.com"]
# }

data "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"
}
