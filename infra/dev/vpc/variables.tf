variable "env" {
  description = "Environment name."
}

variable "region" {
  description = "AWS region to provision infrastructure."
}

variable "vpc_cidr" {
  description = "CIDR range for the AWS virtual private cloud."
}

variable "az1" {
  description = "Availability zone in AWS."
}

variable "az2" {
  description = "Availability zone in AWS."
}

variable "private_subnet1_cidr" {
  description = "CIDR range for the private subnet."
}

variable "private_subnet2_cidr" {
  description = "CIDR range for the private subnet."
}

variable "public_subnet1_cidr" {
  description = "CIDR range for the public subnet."
}

variable "public_subnet2_cidr" {
  description = "CIDR range for the public subnet."
}

variable "enable_nat_gateway" {
  type        = bool
  default     = false
  description = "Create a NAT gateway so private subnets can reach the internet. Off by default to save cost."
}

variable "bucket" {
  type        = string
  description = "An S3 bucket to store the Terraform state."
}
