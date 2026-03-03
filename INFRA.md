# Infrastructure Setup & Deployment

This guide explains how to deploy the World Wide Map infrastructure to Google Cloud Platform using Terraform.

## Prerequisites

You will need the _gcloud CLI_ and _terraform_ installed
You will need a Billing Account on GCP, and it's ID

`gcloud auth login`
`gcloud auth application-default login`

Navigate to `terraform` directory and create a `terraform.tfvars` file.
That file is just the `terraform.tfvars.example` but with the real values.
`cd terraform`
`terraform init`
`terraform apply`

*Note: If Terraform fails at "Enable Services", it might be because the project was just created and the APIs hasn't caught up. Wait a minute and run `terraform apply` again.*

## How to run

From the root folder, run:
`gcloud run deploy traceroute-api --source ./gcp-api --project=[PROJECT_ID] --region us-central1`

## Initialize Targets

We chose to initialize the traceroutes with an endpoint call.
1. Get your Cloud Run URL from the command output above (or the GCP Console).
2. Open your browser or use `curl`:
   `https://[YOUR-API-URL]/targets/initialize`

The Spot instances will automatically spin up, traceroute and report to the API.

- **Check Workers**: You can see the instances in the [Compute Engine console](https://console.cloud.google.com/compute/instances).

Once a region finishes its targets, the worker will resize its own Instance Group to 0.

## Troubleshooting

- **Permissions**: Ensure your authenticated account has `Project Creator` and `Billing User` roles at the Organization or Folder level if you are creating a new project.
- **Spot Availability**: If a region has no Spot capacity, the MIG might take a while to spin up an instance.
