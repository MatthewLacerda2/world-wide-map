variable "project_id" {
  description = "The ID of the project to create"
  type        = str
}

variable "billing_account" {
  description = "The billing account ID to link the project to"
  type        = string
}

variable "org_id" {
  description = "The organization ID (optional)"
  type        = string
  default     = null
}

variable "regions" {
  description = "List of regions to deploy workers in"
  type        = list(string)
  default     = ["us-central1", "europe-west1", "asia-east1", "southamerica-east1"]
}
