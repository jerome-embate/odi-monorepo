data "aws_route53_zone" "this" {
  name         = var.domain_name
  private_zone = false
}

# The wildcard certificate (*.domain) is requested and validated outside Terraform.
data "aws_acm_certificate" "this" {
  domain      = var.domain_name
  statuses    = ["ISSUED"]
  most_recent = true
}

resource "aws_route53_record" "app" {
  zone_id = data.aws_route53_zone.this.zone_id
  name    = local.app_domain
  type    = "A"

  alias {
    name                   = aws_lb.app.dns_name
    zone_id                = aws_lb.app.zone_id
    evaluate_target_health = true
  }
}
