terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  alias = "no_project"
}

# 1. Create the Project
resource "google_project" "traceroute_project" {
  provider        = google.no_project
  name            = "World Wide Map"
  project_id      = var.project_id
  billing_account = var.billing_account
  org_id          = var.org_id
}

# 2. Enable Services
resource "google_project_service" "services" {
  for_each = toset([
    "compute.googleapis.com",
    "run.googleapis.com",
    "sqladmin.googleapis.com",
    "artifactregistry.googleapis.com",
    "iam.googleapis.com",
  ])
  project = google_project.traceroute_project.project_id
  service = each.key
}

# 3. Cloud SQL
resource "google_sql_database_instance" "postgres" {
  project          = google_project.traceroute_project.project_id
  name             = "traceroute-db"
  database_version = "POSTGRES_15"
  region           = "us-central1"
  deletion_protection = false

  settings {
    tier = "db-f1-micro"
    disk_type = "PD_HDD"
    disk_size = 10
    availability_type = "ZONAL"
    
    backup_configuration {
      enabled = false
    }
    
    ip_configuration {
      ipv4_enabled = true
    }
  }
}

resource "google_sql_user" "users" {
  project  = google_project.traceroute_project.project_id
  name     = "postgres"
  instance = google_sql_database_instance.postgres.name
  password = "postgres" #idgaf
}

# 4. Artifact Registry
resource "google_artifact_registry_repository" "repo" {
  project       = google_project.traceroute_project.project_id
  location      = "us-central1"
  repository_id = "traceroute-repo"
  format        = "DOCKER"
}

# 5. Cloud Run (API)
resource "google_cloud_run_v2_service" "api" {
  project  = google_project.traceroute_project.project_id
  name     = "traceroute-api"
  location = "us-central1"
  template {
    containers {
      image = "gcr.io/cloudrun/placeholder" 
      env {
        name  = "DATABASE_URL"
        value = "postgresql+psycopg2://postgres:postgres@/traceroute?host=/cloudsql/${google_sql_database_instance.postgres.connection_name}"
      }
    }
  }

  # This allows you to manually deploy new versions via 'gcloud run deploy'
  # without Terraform trying to roll them back to the placeholder.
  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
    ]
  }
}

# 6. Worker Infrastructure (Template + MIG)
resource "google_compute_instance_template" "worker_template" {
  project      = google_project.traceroute_project.project_id
  name_prefix  = "traceroute-worker-template-"
  machine_type = "e2-micro"
  region       = "us-central1"

  disk {
    source_image = "debian-cloud/debian-11"
    auto_delete  = true
    boot         = true
  }

  network_interface {
    network = "default"
    access_config {}
  }

  scheduling {
    preemptible        = true
    automatic_restart  = false
    provisioning_model = "SPOT"
  }

  metadata_startup_script = <<-EOF
    #!/bin/bash
    sudo apt-get update
    sudo apt-get install -y python3-pip traceroute
    pip3 install requests pydantic
    export API_URL="${google_cloud_run_v2_service.api.uri}"
    # The worker.py should be fetched here (e.g. from GitHub or a Cloud Storage bucket)
    # curl -O https://raw.githubusercontent.com/.../worker.py
    # python3 worker.py
  EOF

  lifecycle {
    create_before_destroy = true
  }
}

resource "google_compute_region_instance_group_manager" "worker_mig" {
  for_each           = toset(var.regions)
  project            = google_project.traceroute_project.project_id
  name               = "worker-mig-${each.key}"
  region             = each.key
  base_instance_name = "worker"
  target_size        = 1

  version {
    instance_template = google_compute_instance_template.worker_template.id
  }

  update_policy {
    type                           = "OPPORTUNISTIC"
    minimal_action                 = "REPLACE"
    instance_redistribution_type   = "PROACTIVE"
  }
}

# 7. IAM Permissions for Workers to resize themselves to 0
resource "google_project_iam_member" "worker_compute_admin" {
  project = google_project.traceroute_project.project_id
  role    = "roles/compute.instanceGroupAdmin"
  member  = "serviceAccount:${google_project.traceroute_project.number}-compute@developer.gserviceaccount.com"
}
