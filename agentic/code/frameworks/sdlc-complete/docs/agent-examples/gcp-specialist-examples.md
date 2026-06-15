# GCP Specialist — Worked Examples

Externalized from the agent definition per the few-shot-examples rule (#1587).

## Process Sample Blocks

These are the full sample command/IaC/code blocks for the GCP Specialist's "Your Process" steps. The agent definition retains a compact capability summary for each step; the complete samples live here.

### 1. Project and IAM Structure

GCP resources live inside projects; projects inside folders; folders inside an organization:

```bash
# List project hierarchy under an organization
gcloud resource-manager folders list \
  --organization=$(gcloud organizations list --format='value(name)' | head -1)

# Create a folder for environment isolation
gcloud resource-manager folders create \
  --display-name="Production" \
  --organization=$(gcloud organizations list --format='value(name)')

# Apply an organization policy to deny public IPs on all VMs
gcloud org-policies set-policy - <<'EOF'
name: organizations/123456789/policies/compute.vmExternalIpAccess
spec:
  rules:
  - denyAll: true
EOF

# Grant workload identity to a service account (least privilege)
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:my-app@my-project.iam.gserviceaccount.com" \
  --role="roles/run.invoker" \
  --condition='expression=resource.name.startsWith("projects/my-project/locations/us-central1/services/my-service"),title=service-scope'
```

### 2. Terraform GCP Infrastructure

```hcl
# main.tf — GKE Autopilot with Workload Identity and private networking
terraform {
  required_version = ">= 1.7"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
  backend "gcs" {
    bucket = "my-terraform-state-bucket"
    prefix = "gke/production"
  }
}

variable "project_id" { type = string }
variable "region"     { type = string; default = "us-central1" }
variable "env"        { type = string }

locals {
  cluster_name = "gke-${var.env}-${var.region}"
  network_name = "vpc-${var.env}"
}

# VPC with Private Google Access for private cluster nodes
resource "google_compute_network" "vpc" {
  name                    = local.network_name
  project                 = var.project_id
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "gke" {
  name                     = "subnet-gke-${var.env}"
  project                  = var.project_id
  region                   = var.region
  network                  = google_compute_network.vpc.id
  ip_cidr_range            = "10.0.0.0/20"
  private_ip_google_access = true   # Required for private cluster internet egress

  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = "10.4.0.0/14"
  }
  secondary_ip_range {
    range_name    = "services"
    ip_cidr_range = "10.8.0.0/20"
  }
}

# GKE Autopilot: Google manages node pools; you manage workloads
resource "google_container_cluster" "primary" {
  name     = local.cluster_name
  project  = var.project_id
  location = var.region

  enable_autopilot = true   # Removes node pool management; enforces security baselines

  network    = google_compute_network.vpc.id
  subnetwork = google_compute_subnetwork.gke.id

  ip_allocation_policy {
    cluster_secondary_range_name  = "pods"
    services_secondary_range_name = "services"
  }

  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = false   # true locks control plane to VPN only
    master_ipv4_cidr_block  = "172.16.0.0/28"
  }

  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  release_channel {
    channel = "REGULAR"   # RAPID for new features; STABLE for regulated workloads
  }

  maintenance_policy {
    recurring_window {
      start_time = "2024-01-01T02:00:00Z"
      end_time   = "2024-01-01T06:00:00Z"
      recurrence = "FREQ=WEEKLY;BYDAY=SU"
    }
  }

  deletion_protection = true
}
```

### 3. Cloud Run Service Configuration

```hcl
# Cloud Run with traffic splitting and Secret Manager integration
resource "google_cloud_run_v2_service" "app" {
  name     = "my-api-${var.env}"
  project  = var.project_id
  location = var.region

  ingress = "INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER"   # No direct public access

  template {
    service_account = google_service_account.app.email

    scaling {
      min_instance_count = var.env == "prod" ? 2 : 0   # Keep-warm in prod
      max_instance_count = 100
    }

    containers {
      image = "us-central1-docker.pkg.dev/${var.project_id}/my-repo/my-api:latest"

      resources {
        limits = {
          cpu    = "2"
          memory = "1Gi"
        }
        cpu_idle = true   # CPU throttled between requests; set false for background processing
      }

      env {
        name = "PROJECT_ID"
        value = var.project_id
      }

      # Reference Secret Manager secrets without storing values in IaC
      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.db_url.secret_id
            version = "latest"
          }
        }
      }

      startup_probe {
        http_get { path = "/healthz" }
        initial_delay_seconds = 5
        timeout_seconds       = 1
        period_seconds        = 3
        failure_threshold     = 10
      }

      liveness_probe {
        http_get { path = "/healthz" }
        period_seconds    = 30
        failure_threshold = 3
      }
    }
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }
}

# Cloud Load Balancer with Cloud Armor (WAF)
resource "google_compute_backend_service" "app" {
  name    = "bs-app-${var.env}"
  project = var.project_id

  backend {
    group = google_compute_region_network_endpoint_group.app.id
  }

  security_policy = google_compute_security_policy.waf.id
}

resource "google_compute_security_policy" "waf" {
  name    = "waf-${var.env}"
  project = var.project_id

  rule {
    action   = "deny(403)"
    priority = 1000
    match {
      expr {
        expression = "evaluatePreconfiguredExpr('sqli-stable')"
      }
    }
    description = "Block SQL injection"
  }

  rule {
    action   = "throttle"
    priority = 2000
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
    rate_limit_options {
      rate_limit_threshold {
        count        = 1000
        interval_sec = 60
      }
      conform_action = "allow"
      exceed_action  = "deny(429)"
      enforce_on_key = "IP"
    }
    description = "Rate limit: 1000 req/min per IP"
  }

  rule {
    action   = "allow"
    priority = 2147483647
    match {
      versioned_expr = "SRC_IPS_V1"
      config { src_ip_ranges = ["*"] }
    }
    description = "Default allow"
  }
}
```

### 4. BigQuery Schema and Optimization

Partition and cluster every large table — queries that filter on partition columns skip entire file groups:

```bash
# Create partitioned, clustered table optimized for time-series event queries
bq mk \
  --table \
  --schema 'event_id:STRING,user_id:STRING,event_type:STRING,properties:JSON,created_at:TIMESTAMP' \
  --time_partitioning_field created_at \
  --time_partitioning_type DAY \
  --clustering_fields user_id,event_type \
  --require_partition_filter true \   # Prevent full-table scans
  --description "User events — partitioned by day, clustered by user and type" \
  my-project:my_dataset.user_events

# Check table partition metadata and row distribution
bq query --use_legacy_sql=false "
SELECT
  partition_id,
  total_rows,
  total_logical_bytes / POW(1024, 3) AS gb,
  last_modified_time
FROM \`my-project.my_dataset.INFORMATION_SCHEMA.PARTITIONS\`
WHERE table_name = 'user_events'
ORDER BY partition_id DESC
LIMIT 30
"

# Identify expensive queries via INFORMATION_SCHEMA
bq query --use_legacy_sql=false "
SELECT
  job_id,
  query,
  total_bytes_processed / POW(1024, 4) AS tb_processed,
  total_slot_ms / 1000 AS slot_seconds,
  creation_time
FROM \`region-us.INFORMATION_SCHEMA.JOBS_BY_PROJECT\`
WHERE creation_time > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
  AND statement_type = 'SELECT'
  AND total_bytes_processed > 100 * POW(1024, 3)   -- Only queries processing >100GB
ORDER BY total_bytes_processed DESC
LIMIT 20
"
```

```sql
-- BigQuery ML: train a classification model in-database (no data export)
CREATE OR REPLACE MODEL `my_dataset.churn_classifier`
OPTIONS (
  model_type        = 'LOGISTIC_REG',
  input_label_cols  = ['churned'],
  auto_class_weights = TRUE,
  enable_global_explain = TRUE,   -- Shapley feature importance
  max_iterations    = 20,
  data_split_method = 'AUTO_SPLIT'
) AS
SELECT
  user_id,
  days_since_last_login,
  total_purchases_30d,
  avg_session_duration_sec,
  support_tickets_90d,
  account_age_days,
  churned   -- Label: 1 if churned within 30 days, 0 if retained
FROM `my_dataset.user_features`
WHERE feature_date = DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY);

-- Evaluate model performance
SELECT *
FROM ML.EVALUATE(MODEL `my_dataset.churn_classifier`);

-- Batch predict on current users
SELECT
  user_id,
  predicted_churned,
  predicted_churned_probs[OFFSET(1)].prob AS churn_probability
FROM ML.PREDICT(
  MODEL `my_dataset.churn_classifier`,
  (
    SELECT * FROM `my_dataset.user_features`
    WHERE feature_date = CURRENT_DATE()
  )
)
WHERE predicted_churned_probs[OFFSET(1)].prob > 0.7   -- High churn risk
ORDER BY churn_probability DESC;
```

### 5. Pub/Sub Event-Driven Architecture

```hcl
# Pub/Sub topic with schema validation and dead-letter handling
resource "google_pubsub_schema" "order_event" {
  name       = "order-event-schema"
  project    = var.project_id
  type       = "AVRO"
  definition = jsonencode({
    type = "record"
    name = "OrderEvent"
    fields = [
      { name = "order_id",    type = "string" },
      { name = "user_id",     type = "string" },
      { name = "event_type",  type = "string" },
      { name = "amount_cents", type = "int" },
      { name = "occurred_at", type = "string" }
    ]
  })
}

resource "google_pubsub_topic" "orders" {
  name    = "orders-${var.env}"
  project = var.project_id

  schema_settings {
    schema   = google_pubsub_schema.order_event.id
    encoding = "JSON"
  }

  message_retention_duration = "604800s"   # 7 days — replay capability for outages
}

resource "google_pubsub_topic" "orders_dead_letter" {
  name    = "orders-dead-letter-${var.env}"
  project = var.project_id
}

resource "google_pubsub_subscription" "order_processor" {
  name    = "order-processor-${var.env}"
  project = var.project_id
  topic   = google_pubsub_topic.orders.id

  ack_deadline_seconds       = 60    # Processing SLA; extend with modifyAckDeadline for long jobs
  message_retention_duration = "604800s"

  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "600s"   # Exponential backoff up to 10 minutes
  }

  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.orders_dead_letter.id
    max_delivery_attempts = 5   # After 5 failures, route to dead-letter for inspection
  }

  expiration_policy { ttl = "" }   # Never expire — retain for replay

  push_config {
    push_endpoint = google_cloud_run_v2_service.order_processor.uri
    oidc_token {
      service_account_email = google_service_account.pubsub_invoker.email
    }
  }
}
```

```python
# Cloud Function gen2: process Pub/Sub messages with structured logging
import functions_framework
import base64
import json
import logging
from google.cloud import bigquery

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
bq_client = bigquery.Client()   # Reused across invocations (warm instance)

@functions_framework.cloud_event
def process_order_event(cloud_event):
    """Process order events from Pub/Sub and write to BigQuery."""
    try:
        message_data = base64.b64decode(cloud_event.data["message"]["data"])
        event = json.loads(message_data)

        row = {
            "order_id": event["order_id"],
            "user_id": event["user_id"],
            "event_type": event["event_type"],
            "amount_cents": event["amount_cents"],
            "occurred_at": event["occurred_at"],
            "processed_at": "AUTO",
        }

        errors = bq_client.insert_rows_json("my-project.orders.events", [row])
        if errors:
            logger.error("BigQuery insert error", extra={"errors": errors, "order_id": event["order_id"]})
            raise RuntimeError(f"BigQuery insert failed: {errors}")

        logger.info("Order event processed", extra={"order_id": event["order_id"], "type": event["event_type"]})

    except (KeyError, json.JSONDecodeError) as e:
        # Malformed message — do NOT raise; raising causes infinite retry
        # Return 200 so Pub/Sub acknowledges and routes to dead-letter after max_delivery_attempts
        logger.error("Malformed message, dropping", extra={"error": str(e)})
```

### 6. Dataflow Pipeline for Stream Processing

```python
# Apache Beam pipeline running on Dataflow
import apache_beam as beam
from apache_beam.options.pipeline_options import PipelineOptions, GoogleCloudOptions
from apache_beam.io.gcp.pubsub import ReadFromPubSub
from apache_beam.io.gcp.bigquery import WriteToBigQuery, BigQueryDisposition

class EnrichEvent(beam.DoFn):
    def process(self, element):
        import json
        event = json.loads(element)
        # Enrich: add geolocation, resolve user segment, etc.
        event["region"] = self._lookup_region(event.get("ip_address"))
        yield event

    def _lookup_region(self, ip: str) -> str:
        # In production: call MaxMind or IP2Location
        return "us-east"

def run():
    options = PipelineOptions(
        runner="DataflowRunner",
        project="my-project",
        region="us-central1",
        temp_location="gs://my-dataflow-temp/tmp",
        staging_location="gs://my-dataflow-temp/staging",
        streaming=True,
        save_main_session=True,
        max_num_workers=10,
        worker_machine_type="n2-standard-4",
        use_public_ips=False,   # Private IPs; requires Cloud NAT
    )

    with beam.Pipeline(options=options) as p:
        events = (
            p
            | "ReadPubSub" >> ReadFromPubSub(
                subscription="projects/my-project/subscriptions/order-processor-prod"
              )
            | "EnrichEvent" >> beam.ParDo(EnrichEvent())
            | "WriteBigQuery" >> WriteToBigQuery(
                table="my-project:orders.enriched_events",
                schema={
                    "fields": [
                        {"name": "order_id",    "type": "STRING", "mode": "REQUIRED"},
                        {"name": "user_id",     "type": "STRING", "mode": "REQUIRED"},
                        {"name": "region",      "type": "STRING", "mode": "NULLABLE"},
                        {"name": "occurred_at", "type": "TIMESTAMP", "mode": "REQUIRED"},
                    ]
                },
                write_disposition=BigQueryDisposition.WRITE_APPEND,
                create_disposition=BigQueryDisposition.CREATE_IF_NEEDED,
                method="STREAMING_INSERTS",
            )
        )

if __name__ == "__main__":
    run()
```

### 7. Vertex AI Model Serving

```bash
# Deploy a trained model to Vertex AI Endpoints
MODEL_ID=$(gcloud ai models upload \
  --region=us-central1 \
  --display-name="churn-classifier-v2" \
  --container-image-uri="us-docker.pkg.dev/vertex-ai/prediction/sklearn-cpu.1-3:latest" \
  --artifact-uri="gs://my-models/churn-classifier/v2/" \
  --format="value(model)")

ENDPOINT_ID=$(gcloud ai endpoints create \
  --region=us-central1 \
  --display-name="churn-endpoint" \
  --format="value(name)" | rev | cut -d'/' -f1 | rev)

gcloud ai endpoints deploy-model "$ENDPOINT_ID" \
  --region=us-central1 \
  --model="$MODEL_ID" \
  --display-name="churn-v2" \
  --machine-type="n1-standard-4" \
  --min-replica-count=1 \
  --max-replica-count=10 \
  --traffic-split="0=100"

# Online prediction
gcloud ai endpoints predict "$ENDPOINT_ID" \
  --region=us-central1 \
  --json-request='{"instances": [{"days_since_last_login": 45, "total_purchases_30d": 0, "support_tickets_90d": 3}]}'
```

## Few-Shot Examples

### Example 1: BigQuery Partition Pruning Investigation

**Input:**
"Our BigQuery queries are slow and we're getting billed for scanning 500TB per query. The table has 3TB of actual data."

**Output:**

500TB scanned on a 3TB table means partition pruning is not working — queries are scanning every partition. Diagnose:

```sql
-- Check whether recent queries used partition filters
SELECT
  job_id,
  query,
  total_bytes_processed / POW(1024, 4) AS tb_scanned,
  REGEXP_CONTAINS(query, r'WHERE.*partition_col') AS has_partition_filter,
  creation_time
FROM `region-us.INFORMATION_SCHEMA.JOBS_BY_PROJECT`
WHERE creation_time > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR)
  AND total_bytes_processed > 50 * POW(1024, 3)
ORDER BY total_bytes_processed DESC
```

Common root causes:

**1. Partition filter applied to a derived column — BigQuery cannot prune:**
```sql
-- WRONG: function on partition column defeats pruning
WHERE DATE(created_at) = '2024-01-15'

-- RIGHT: filter directly on the partition column
WHERE created_at >= '2024-01-15'
  AND created_at < '2024-01-16'
```

**2. Partition filter is on a subquery — pruning not propagated:**
```sql
-- WRONG: partition filter in subquery, outer query scans all
SELECT * FROM (SELECT * FROM my_table) WHERE created_at = '2024-01-15'

-- RIGHT: filter in the outermost FROM clause
SELECT * FROM my_table WHERE created_at = '2024-01-15'
```

**3. Enforce partition filters at the table level:**
```bash
bq update \
  --require_partition_filter \
  my-project:my_dataset.my_table
```

After enforcing partition filters, any query without a partition predicate will fail with an explicit error instead of silently scanning all partitions.

---

### Example 2: GKE Workload Identity Setup

**Input:**
"How do I let my GKE pod access a Cloud Storage bucket without a service account key file?"

**Output:**

Workload Identity binds a Kubernetes service account to a GCP service account using the cluster's OIDC token. The pod gets GCP credentials automatically.

```bash
# Step 1: Enable Workload Identity on the cluster (if not already enabled)
gcloud container clusters update my-cluster \
  --region=us-central1 \
  --workload-pool=my-project.svc.id.goog

# Step 2: Create a GCP service account for your app
gcloud iam service-accounts create my-app-sa \
  --display-name="My App Service Account"

# Step 3: Grant the GCS role to the service account
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:my-app-sa@my-project.iam.gserviceaccount.com" \
  --role="roles/storage.objectViewer"

# Step 4: Allow the Kubernetes service account to impersonate the GCP service account
gcloud iam service-accounts add-iam-policy-binding my-app-sa@my-project.iam.gserviceaccount.com \
  --role="roles/iam.workloadIdentityUser" \
  --member="serviceAccount:my-project.svc.id.goog[my-namespace/my-ksa]"
```

```yaml
# Step 5: Annotate the Kubernetes service account
apiVersion: v1
kind: ServiceAccount
metadata:
  name: my-ksa
  namespace: my-namespace
  annotations:
    iam.gke.io/gcp-service-account: my-app-sa@my-project.iam.gserviceaccount.com
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    spec:
      serviceAccountName: my-ksa   # Use the annotated KSA
      containers:
      - name: app
        image: my-app:latest
        env:
        - name: BUCKET_NAME
          value: my-data-bucket
        # No secret mounts needed — Application Default Credentials works automatically
```

```python
# Application code — no credentials; Google client libraries use ADC automatically
from google.cloud import storage

client = storage.Client()   # Uses Workload Identity token automatically
bucket = client.bucket(os.environ["BUCKET_NAME"])
blob = bucket.blob("my/file.json")
data = blob.download_as_bytes()
```

---

### Example 3: Cloud Run Cold Start Elimination

**Input:**
"Our Cloud Run service has 2-3 second cold starts that affect user experience. It's a Node.js service handling API requests."

**Output:**

Cold starts occur when a new instance initializes. Three levers: minimum instances, startup probe tuning, and reducing initialization work.

```hcl
# Set minimum instances to keep instances warm
resource "google_cloud_run_v2_service" "api" {
  template {
    scaling {
      min_instance_count = 2    # Always-warm; costs ~$8/mo per instance at n1-standard-1
      max_instance_count = 50
    }

    containers {
      startup_probe {
        http_get { path = "/healthz" }
        initial_delay_seconds = 0    # Start probing immediately
        period_seconds        = 1    # Probe every second
        failure_threshold     = 30   # Allow 30 seconds total for startup
        timeout_seconds       = 1
      }
    }
  }
}
```

```javascript
// Optimize Node.js initialization: defer expensive work outside the handler
// WRONG: expensive initialization inside the handler
exports.handler = async (req, res) => {
  const db = new Database(process.env.DATABASE_URL);  // New connection on every cold start
  await db.connect();
  // ...
};

// RIGHT: initialize at module level — runs once per instance, not per request
import { Database } from './db.js';

// Module-level initialization — executed once when the instance starts
const db = new Database(process.env.DATABASE_URL);
await db.connect();  // Top-level await in ESM modules

export async function handler(req, res) {
  // db is already connected — no cold start penalty
  const result = await db.query('SELECT 1');
  res.json({ status: 'ok' });
}
```

With `min_instance_count = 2`, users never hit a cold start unless traffic spikes beyond 2 concurrent instances. At that point, new instances warm up in parallel — users on existing instances are unaffected.

Expected outcome: P99 latency drops from 2-3s to <200ms for 99%+ of requests. Cost: ~$16/month for 2 minimum instances on the smallest CPU/memory configuration.
