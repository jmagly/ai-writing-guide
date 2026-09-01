# AI/ML Engineer — Worked Examples

Externalized from the agent definition per the few-shot-examples rule. These examples are patterns to adapt after verifying the project stack, dependency policy, data authorization, and measurable acceptance gates.

## Example 1: Reproducible Experiment Tracking

Track the code, data, parameters, metrics, and model artifact together. Never invent metric values or overwrite an earlier run.

```python
import mlflow
import mlflow.pytorch

mlflow.set_experiment("user-churn-v2")

with mlflow.start_run(run_name="lstm-baseline"):
    mlflow.log_params({
        "dataset_version": dataset_version,
        "source_commit": source_commit,
        "learning_rate": config.learning_rate,
        "batch_size": config.batch_size,
        "seed": config.seed,
    })

    for epoch in range(config.epochs):
        train_loss = train_one_epoch(model, train_loader, optimizer)
        validation = evaluate(model, validation_loader)
        mlflow.log_metrics({
            "train_loss": train_loss,
            "validation_loss": validation["loss"],
            "validation_auc": validation["auc"],
        }, step=epoch)

    signature = mlflow.models.infer_signature(
        sample_features,
        model(sample_features).detach().cpu().numpy(),
    )
    mlflow.pytorch.log_model(model, "model", signature=signature)
    mlflow.log_artifact("evaluation-by-cohort.json")
    mlflow.log_artifact("feature-lineage.json")
```

The run is eligible for promotion only if the recorded dataset, commit, environment, evaluation, and model card all resolve and the declared guardrail metrics pass.

## Example 2: Versioned Training Pipeline

Keep validation ahead of training and evaluation ahead of promotion:

```yaml
stages:
  validate:
    cmd: python src/validate_data.py --config config/data.yaml
    deps: [data/raw, src/validate_data.py, config/data.yaml]
    outs: [reports/data-validation.json]

  preprocess:
    cmd: python src/preprocess.py --config config/data.yaml
    deps: [data/raw, reports/data-validation.json, src/preprocess.py]
    outs: [data/processed/train.parquet, data/processed/validation.parquet]

  train:
    cmd: python src/train.py --config config/model.yaml
    deps: [data/processed/train.parquet, src/train.py, config/model.yaml]
    outs: [models/candidate]
    metrics:
      - metrics/train.json:
          cache: false

  evaluate:
    cmd: python src/evaluate.py --candidate models/candidate
    deps: [models/candidate, data/processed/validation.parquet, src/evaluate.py]
    outs: [reports/model-card.md, reports/release-gate.json]
    metrics:
      - metrics/evaluation.json:
          cache: false
```

CI should reject the candidate when data validation, subgroup, safety, performance, or reproducibility gates fail. Deployment is a separate, authorized step that consumes the immutable candidate and gate evidence.

## Example 3: Serving Bottleneck Investigation

**Symptom**: P99 latency exceeds 500 ms under concurrency although single-request latency appears acceptable.

**Method**:

1. Capture P50/P95/P99 latency, queue delay, batch size, concurrency, device utilization, memory, and error rate.
2. Profile preprocessing, host-to-device transfer, model execution, and postprocessing separately.
3. Verify the model is placed on the intended device and that batching is active.
4. Change one factor at a time and rerun the same load profile.

```python
import time
import torch

def inference(self, inputs):
    started = time.perf_counter()
    with torch.no_grad():
        result = self.model(inputs)
    self.metrics.observe(
        "model_inference_ms",
        (time.perf_counter() - started) * 1000,
        batch_size=len(inputs),
        model_version=self.model_version,
    )
    return result
```

If profiling proves kernel-launch and queue overhead dominate, test bounded dynamic batching:

```text
dynamic_batching {
  preferred_batch_size: [8, 16]
  max_queue_delay_microseconds: 5000
}
```

Do not claim success from average latency. Compare the full distribution, throughput, resource consumption, error rate, and model outputs against the baseline under the same load.

## Example 4: Weekly Retraining With Promotion Guard

A schedule is not a promotion decision. The workflow must validate new data, train an immutable candidate, evaluate it against the deployed version, and require all guardrails before rollout.

```python
with DAG(
    "text_classifier_retrain",
    schedule="@weekly",
    catchup=False,
    default_args={"retries": 2},
) as dag:
    validate_data = run_validation()
    train_candidate = run_training()
    evaluate_candidate = run_evaluation()
    approve_candidate = enforce_release_gates()
    deploy_shadow = deploy_as_shadow()

    validate_data >> train_candidate >> evaluate_candidate
    evaluate_candidate >> approve_candidate >> deploy_shadow
```

The promotion gate should compare the candidate with the deployed model on task metrics, calibration, cohorts, robustness, safety, latency, throughput, and cost. A failed gate retains the current model and records the failed candidate for analysis.

## Example 5: Feature Store Parity Check

Use the same feature definitions and timestamp semantics offline and online, then compare samples before release:

```python
historical = store.get_historical_features(
    entity_df=entities_with_event_timestamps,
    features=feature_refs,
).to_df()

online = store.get_online_features(
    features=feature_refs,
    entity_rows=entity_rows,
).to_dict()

assert_feature_parity(
    historical=historical,
    online=online,
    tolerance=feature_tolerances,
    freshness=feature_freshness_limits,
)
```

Fail the release when online values are stale, timestamps cross the prediction boundary, schemas diverge, or protected attributes appear outside the approved design.
