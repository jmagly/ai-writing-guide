# AWS Specialist — Worked Examples

Externalized from the agent definition per the few-shot-examples rule (#1587).

## Few-Shot Examples

### Example 1: Lambda Cold Start Optimization

**Input:**
"Our Java Lambda function has 3-4 second cold starts on the /login endpoint. How do I fix it?"

**Output:**

Cold starts on Java are primarily caused by JVM initialization plus class loading. Three levers to pull, in priority order:

**1. Enable SnapStart (zero cold start for Java 21)**

```python
# CDK: Enable SnapStart on the function
from aws_cdk import aws_lambda as lambda_

function = lambda_.Function(
    self, "LoginHandler",
    runtime=lambda_.Runtime.JAVA_21,
    handler="com.example.LoginHandler::handleRequest",
    code=lambda_.Code.from_asset("target/login-handler.jar"),
    memory_size=1024,
    snap_start=lambda_.SnapStartConf.ON_PUBLISHED_VERSIONS,
)

# SnapStart only works on published versions, not $LATEST
alias = lambda_.Alias(
    self, "ProdAlias",
    alias_name="prod",
    version=function.current_version,
)
```

**2. Increase memory to reduce initialization time**

```bash
# Memory directly controls CPU allocation in Lambda
# Run Power Tuning tool comparing 512MB, 1024MB, 2048MB
# Java typically sees diminishing returns above 1792MB

aws stepfunctions start-execution \
  --state-machine-arn arn:aws:states:us-east-1:123456789:stateMachine:powerTuningStateMachine \
  --input '{
    "lambdaARN": "arn:aws:lambda:us-east-1:123456789:function:login-handler",
    "powerValues": [512, 1024, 1769, 2048, 3008],
    "num": 20,
    "payload": {"username": "test", "password": "test"},
    "strategy": "balanced"
  }'
```

**3. Add provisioned concurrency for the login alias**

```bash
aws lambda put-provisioned-concurrency-config \
  --function-name login-handler \
  --qualifier prod \
  --provisioned-concurrent-executions 10

# Use Application Auto Scaling to scale PC during business hours
aws application-autoscaling register-scalable-target \
  --service-namespace lambda \
  --resource-id function:login-handler:prod \
  --scalable-dimension lambda:function:ProvisionedConcurrency \
  --min-capacity 5 \
  --max-capacity 50
```

Expected outcome: SnapStart reduces cold start from 3-4s to <200ms. Provisioned concurrency eliminates cold starts entirely for the configured baseline. Cost increase: ~$15/month per 10 provisioned concurrency units.

---

### Example 2: S3 Cost Analysis and Lifecycle Optimization

**Input:**
"Our S3 bill jumped 40% last month. The bucket has 500TB of mixed data — some accessed daily, most untouched for 6+ months. How do we reduce costs?"

**Output:**

Start with data — analyze actual access patterns before writing lifecycle rules:

```bash
# Enable S3 Inventory to get object-level storage class and last modified
aws s3api put-bucket-inventory-configuration \
  --bucket my-data-bucket \
  --id full-inventory \
  --inventory-configuration '{
    "Id": "full-inventory",
    "IsEnabled": true,
    "Destination": {
      "S3BucketDestination": {
        "Bucket": "arn:aws:s3:::my-inventory-bucket",
        "Format": "Parquet"
      }
    },
    "Schedule": {"Frequency": "Weekly"},
    "IncludedObjectVersions": "Current",
    "OptionalFields": ["StorageClass", "LastModifiedDate", "Size", "ReplicationStatus"]
  }'

# After inventory runs, query with Athena
# Create table first, then:
SELECT
  storage_class,
  COUNT(*) as object_count,
  SUM(size) / POWER(1024, 4) as size_tb,
  AVG(DATE_DIFF('day', from_iso8601_timestamp(last_modified_date), current_date)) as avg_age_days
FROM s3_inventory.my_data_bucket
GROUP BY storage_class
ORDER BY size_tb DESC;
```

Once you know the distribution, apply targeted lifecycle rules:

```python
# CDK: Tiered lifecycle based on your access pattern data
bucket.add_lifecycle_rule(
    id="hot-to-cold",
    enabled=True,
    prefix="data/",  # Apply only to data/ prefix, not logs/
    transitions=[
        s3.Transition(
            storage_class=s3.StorageClass.INFREQUENT_ACCESS,
            transition_after=Duration.days(30),   # IA: $0.0125/GB vs $0.023/GB standard
        ),
        s3.Transition(
            storage_class=s3.StorageClass.GLACIER_INSTANT_RETRIEVAL,
            transition_after=Duration.days(90),   # GIR: $0.004/GB — millisecond retrieval
        ),
        s3.Transition(
            storage_class=s3.StorageClass.DEEP_ARCHIVE,
            transition_after=Duration.days(180),  # DA: $0.00099/GB — 12h retrieval
        ),
    ],
)
```

Projected savings on 500TB:
- 400TB moved to Glacier Instant Retrieval: from $9,200/mo to $1,600/mo
- 80TB moved to Deep Archive: from $1,840/mo to $79/mo
- 20TB stays Standard for active data: $460/mo unchanged
- **Total: ~$11,500/mo → ~$2,140/mo (81% reduction)**

---

### Example 3: Well-Architected Framework Finding — Reliability Pillar

**Input:**
"Run a Well-Architected review on our reliability posture. We have a single RDS instance with daily snapshots and no read replicas."

**Output:**

**Finding: REL-3 — Single point of failure in database tier**

Risk level: HIGH

Current state:
- Single RDS instance in one availability zone
- Recovery method: restore from daily snapshot (RTO: 2-4 hours, RPO: up to 24 hours)
- No read replica to offload reporting queries

Remediation plan:

```bash
# Step 1: Promote to Multi-AZ (< 5 minutes downtime)
aws rds modify-db-instance \
  --db-instance-identifier production-db \
  --multi-az \
  --apply-immediately

# Monitor the modification
aws rds describe-db-instances \
  --db-instance-identifier production-db \
  --query 'DBInstances[0].{Status:DBInstanceStatus,MultiAZ:MultiAZ,SecondaryAZ:SecondaryAvailabilityZone}'
```

```python
# CDK: Multi-AZ with read replica and automated backups
from aws_cdk import aws_rds as rds, Duration

primary = rds.DatabaseInstance(
    self, "Primary",
    engine=rds.DatabaseInstanceEngine.postgres(
        version=rds.PostgresEngineVersion.VER_16_2
    ),
    instance_type=ec2.InstanceType.of(
        ec2.InstanceClass.R6G, ec2.InstanceSize.XLARGE
    ),
    multi_az=True,                                   # Automatic standby in second AZ
    backup_retention=Duration.days(7),               # Reduce RPO to <5 minutes with PITR
    delete_automated_backups=False,
    deletion_protection=True,
)

read_replica = rds.DatabaseInstanceReadReplica(
    self, "ReadReplica",
    source_database_instance=primary,
    instance_type=ec2.InstanceType.of(
        ec2.InstanceClass.R6G, ec2.InstanceSize.LARGE
    ),
)
```

Validate failover:

```bash
# Force a failover to test your RTO
aws rds reboot-db-instance \
  --db-instance-identifier production-db \
  --force-failover

# Measure time until DNS resolves to new primary
watch -n 5 "aws rds describe-db-instances \
  --db-instance-identifier production-db \
  --query 'DBInstances[0].{Status:DBInstanceStatus,AZ:AvailabilityZone}'"
```

Expected outcome after remediation:
- RTO: <60 seconds (automatic failover to standby)
- RPO: <5 minutes (continuous transaction log shipping)
- Reliability pillar risk: HIGH → NONE for this question
