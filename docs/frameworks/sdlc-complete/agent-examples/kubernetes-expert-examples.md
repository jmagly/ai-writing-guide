# Kubernetes Expert — Worked Examples

Externalized from the agent definition per the few-shot-examples rule (#1587).

## Process Sample Blocks

These are the full illustrative sample blocks for the agent's process steps. Each corresponds to a capability summarized inline in the agent definition's `## Your Process` section.

### 1. Cluster State Audit

```bash
# Check node health and resource pressure
kubectl get nodes -o wide
kubectl describe nodes | grep -A5 "Conditions:"

# Identify resource-constrained pods
kubectl top pods --all-namespaces --sort-by=cpu | head -20
kubectl top pods --all-namespaces --sort-by=memory | head -20

# Find pods without resource requests/limits
kubectl get pods --all-namespaces -o json \
  | jq '.items[] | select(.spec.containers[].resources.requests == null)
        | {name: .metadata.name, ns: .metadata.namespace}'

# Check for pods in non-Running states
kubectl get pods --all-namespaces --field-selector=status.phase!=Running

# Inspect cluster events for warnings
kubectl get events --all-namespaces --sort-by='.lastTimestamp' \
  | grep -i "warning\|failed\|error" | tail -30

# Audit RBAC — who can do what
kubectl auth can-i --list --as=system:serviceaccount:default:my-sa
```

### 2. Production Deployment Manifests

```yaml
# Deployment with all production fields set
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
  namespace: production
  labels:
    app: order-service
    version: "2026.2.0"
    app.kubernetes.io/part-of: commerce-platform
spec:
  replicas: 3
  revisionHistoryLimit: 5
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0       # Zero-downtime: always have full capacity
  selector:
    matchLabels:
      app: order-service
  template:
    metadata:
      labels:
        app: order-service
        version: "2026.2.0"
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8080"
        prometheus.io/path: "/actuator/prometheus"
    spec:
      serviceAccountName: order-service
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 2000
        seccompProfile:
          type: RuntimeDefault
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: order-service
      containers:
        - name: order-service
          image: registry.example.com/order-service:2026.2.0
          imagePullPolicy: IfNotPresent
          ports:
            - name: http
              containerPort: 8080
              protocol: TCP
          env:
            - name: SPRING_PROFILES_ACTIVE
              value: "prod"
            - name: DB_URL
              valueFrom:
                secretKeyRef:
                  name: order-service-secrets
                  key: database-url
            - name: POD_NAME
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
          resources:
            requests:
              cpu: "250m"
              memory: "512Mi"
            limits:
              cpu: "1000m"
              memory: "1Gi"
          livenessProbe:
            httpGet:
              path: /actuator/health/liveness
              port: http
            initialDelaySeconds: 30
            periodSeconds: 10
            failureThreshold: 3
            timeoutSeconds: 5
          readinessProbe:
            httpGet:
              path: /actuator/health/readiness
              port: http
            initialDelaySeconds: 20
            periodSeconds: 5
            failureThreshold: 3
            timeoutSeconds: 3
          startupProbe:
            httpGet:
              path: /actuator/health
              port: http
            failureThreshold: 30    # Allow 5 minutes for slow JVM startup
            periodSeconds: 10
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop: ["ALL"]
          volumeMounts:
            - name: tmp
              mountPath: /tmp
      volumes:
        - name: tmp
          emptyDir: {}
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                topologyKey: kubernetes.io/hostname
                labelSelector:
                  matchLabels:
                    app: order-service
```

### 3. Service, Ingress, and HPA

```yaml
# Service
apiVersion: v1
kind: Service
metadata:
  name: order-service
  namespace: production
  labels:
    app: order-service
spec:
  selector:
    app: order-service
  ports:
    - name: http
      port: 80
      targetPort: http
      protocol: TCP
  type: ClusterIP

---
# Ingress with TLS and rate limiting annotations
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: order-service
  namespace: production
  annotations:
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-burst-multiplier: "3"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "2m"
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - api.example.com
      secretName: api-example-com-tls
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /api/v1/orders
            pathType: Prefix
            backend:
              service:
                name: order-service
                port:
                  name: http

---
# HorizontalPodAutoscaler — scale on CPU and custom metrics
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: order-service
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: order-service
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 60
    - type: Pods
      pods:
        metric:
          name: http_requests_per_second
        target:
          type: AverageValue
          averageValue: "500"
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300   # 5-minute cooldown before scale-down
      policies:
        - type: Pods
          value: 2
          periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
        - type: Pods
          value: 4
          periodSeconds: 30

---
# PodDisruptionBudget — maintain minimum availability during disruptions
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: order-service
  namespace: production
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: order-service
```

### 4. Helm Chart Structure

```
charts/order-service/
├── Chart.yaml
├── values.yaml
├── values-staging.yaml
├── values-prod.yaml
└── templates/
    ├── _helpers.tpl
    ├── deployment.yaml
    ├── service.yaml
    ├── ingress.yaml
    ├── hpa.yaml
    ├── pdb.yaml
    ├── serviceaccount.yaml
    ├── configmap.yaml
    └── NOTES.txt
```

```yaml
# Chart.yaml
apiVersion: v2
name: order-service
description: Order service for commerce platform
type: application
version: 1.0.0
appVersion: "2026.2.0"
dependencies:
  - name: common
    version: ">=1.0.0"
    repository: https://charts.example.com

---
# values.yaml — defaults (development)
replicaCount: 1

image:
  repository: registry.example.com/order-service
  pullPolicy: IfNotPresent
  tag: ""  # Overridden by CI with image digest or tag

serviceAccount:
  create: true
  name: ""
  annotations: {}

service:
  type: ClusterIP
  port: 80

ingress:
  enabled: false
  className: nginx
  annotations: {}
  hosts: []
  tls: []

resources:
  requests:
    cpu: 250m
    memory: 512Mi
  limits:
    cpu: 1000m
    memory: 1Gi

autoscaling:
  enabled: false
  minReplicas: 1
  maxReplicas: 10
  targetCPUUtilizationPercentage: 60

podDisruptionBudget:
  enabled: false
  minAvailable: 1

env:
  SPRING_PROFILES_ACTIVE: dev

secrets:
  databaseUrl: ""   # Injected via CI or External Secrets Operator
```

```yaml
# values-prod.yaml — production overrides
replicaCount: 3

ingress:
  enabled: true
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
  hosts:
    - host: api.example.com
      paths:
        - path: /api/v1/orders
          pathType: Prefix
  tls:
    - secretName: api-tls
      hosts:
        - api.example.com

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 20

podDisruptionBudget:
  enabled: true
  minAvailable: 2

env:
  SPRING_PROFILES_ACTIVE: prod
```

```bash
# Deploy with Helm
helm upgrade --install order-service ./charts/order-service \
  --namespace production \
  --create-namespace \
  --values ./charts/order-service/values-prod.yaml \
  --set image.tag="${IMAGE_TAG}" \
  --set secrets.databaseUrl="${DB_URL}" \
  --wait \
  --timeout 5m
```

### 5. Kustomize Overlay Pattern

```
k8s/
├── base/
│   ├── kustomization.yaml
│   ├── deployment.yaml
│   ├── service.yaml
│   └── serviceaccount.yaml
└── overlays/
    ├── staging/
    │   ├── kustomization.yaml
    │   └── patches/
    │       └── deployment-replicas.yaml
    └── production/
        ├── kustomization.yaml
        └── patches/
            ├── deployment-resources.yaml
            └── hpa.yaml
```

```yaml
# base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml
  - serviceaccount.yaml
commonLabels:
  app.kubernetes.io/managed-by: kustomize

---
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: production
resources:
  - ../../base
  - hpa.yaml
  - pdb.yaml
patches:
  - path: patches/deployment-resources.yaml
    target:
      kind: Deployment
      name: order-service
images:
  - name: registry.example.com/order-service
    newTag: "2026.2.0"
configMapGenerator:
  - name: order-service-config
    literals:
      - SPRING_PROFILES_ACTIVE=prod
      - LOG_LEVEL=WARN
```

```yaml
# overlays/production/patches/deployment-resources.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  replicas: 3
  template:
    spec:
      containers:
        - name: order-service
          resources:
            requests:
              cpu: "500m"
              memory: "768Mi"
            limits:
              cpu: "2000m"
              memory: "1536Mi"
```

### 6. RBAC and Network Policies

```yaml
# ServiceAccount with minimal permissions
apiVersion: v1
kind: ServiceAccount
metadata:
  name: order-service
  namespace: production
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789:role/order-service-role  # AWS IRSA

---
# Role — least-privilege namespace access
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: order-service
  namespace: production
rules:
  - apiGroups: [""]
    resources: ["configmaps"]
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["secrets"]
    resourceNames: ["order-service-secrets"]  # Only specific secret
    verbs: ["get"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: order-service
  namespace: production
subjects:
  - kind: ServiceAccount
    name: order-service
    namespace: production
roleRef:
  kind: Role
  name: order-service
  apiGroup: rbac.authorization.k8s.io

---
# NetworkPolicy — default deny, explicit allow
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: order-service-netpol
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: order-service
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: ingress-nginx
        - podSelector:
            matchLabels:
              app: api-gateway
      ports:
        - port: 8080
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: postgres
      ports:
        - port: 5432
    - to:
        - podSelector:
            matchLabels:
              app: redis
      ports:
        - port: 6379
    - to:                  # Allow DNS resolution
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
      ports:
        - port: 53
          protocol: UDP
```

### 7. GitOps with ArgoCD

```yaml
# ArgoCD Application — declarative delivery
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: order-service-prod
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  project: commerce-platform
  source:
    repoURL: https://git.example.com/infra/k8s-manifests
    targetRevision: main
    path: overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true          # Remove resources deleted from Git
      selfHeal: true       # Revert manual cluster changes
    syncOptions:
      - CreateNamespace=true
      - PrunePropagationPolicy=foreground
      - RespectIgnoreDifferences=true
    retry:
      limit: 3
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
  ignoreDifferences:
    - group: apps
      kind: Deployment
      jsonPointers:
        - /spec/replicas   # HPA manages replicas — ignore Git drift

---
# ArgoCD AppProject — RBAC boundaries
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: commerce-platform
  namespace: argocd
spec:
  description: Commerce platform production applications
  sourceRepos:
    - https://git.example.com/infra/k8s-manifests
  destinations:
    - namespace: production
      server: https://kubernetes.default.svc
  clusterResourceWhitelist:
    - group: ""
      kind: Namespace
  namespaceResourceBlacklist:
    - group: ""
      kind: ResourceQuota    # Protect quota settings
  roles:
    - name: deployer
      policies:
        - p, proj:commerce-platform:deployer, applications, sync, commerce-platform/*, allow
```

### 8. Observability Stack

```yaml
# PrometheusRule — alerts for order-service SLIs
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: order-service-alerts
  namespace: production
  labels:
    prometheus: kube-prometheus
    role: alert-rules
spec:
  groups:
    - name: order-service.slo
      interval: 30s
      rules:
        # SLI: error rate
        - record: job:order_service_errors:rate5m
          expr: |
            rate(http_server_requests_seconds_count{
              service="order-service", status=~"5.."
            }[5m])

        # Alert: error rate > 1% over 5 minutes
        - alert: OrderServiceHighErrorRate
          expr: |
            (
              rate(http_server_requests_seconds_count{
                service="order-service", status=~"5.."
              }[5m])
              /
              rate(http_server_requests_seconds_count{
                service="order-service"
              }[5m])
            ) > 0.01
          for: 5m
          labels:
            severity: warning
            team: commerce
          annotations:
            summary: "Order service error rate above 1%"
            description: "Error rate is {{ $value | humanizePercentage }} over the last 5 minutes"
            runbook_url: "https://runbooks.example.com/order-service/high-error-rate"

        # Alert: P99 latency > 500ms
        - alert: OrderServiceHighLatency
          expr: |
            histogram_quantile(0.99,
              rate(http_server_requests_seconds_bucket{
                service="order-service"
              }[5m])
            ) > 0.5
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Order service P99 latency above 500ms"
```

```yaml
# ServiceMonitor — Prometheus scrape config
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: order-service
  namespace: production
  labels:
    release: kube-prometheus-stack
spec:
  selector:
    matchLabels:
      app: order-service
  endpoints:
    - port: http
      path: /actuator/prometheus
      interval: 15s
      scrapeTimeout: 10s
```

### 9. Custom Resource Definitions and Operators

```go
// CRD type using controller-runtime
// +kubebuilder:object:root=true
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="Ready",type="string",JSONPath=".status.ready"
// +kubebuilder:printcolumn:name="Replicas",type="integer",JSONPath=".status.readyReplicas"
type OrderProcessor struct {
    metav1.TypeMeta   `json:",inline"`
    metav1.ObjectMeta `json:"metadata,omitempty"`
    Spec   OrderProcessorSpec   `json:"spec,omitempty"`
    Status OrderProcessorStatus `json:"status,omitempty"`
}

type OrderProcessorSpec struct {
    Replicas    int32  `json:"replicas"`
    Queue       string `json:"queue"`
    MaxRetries  int    `json:"maxRetries,omitempty"`
}

// Reconciler
type OrderProcessorReconciler struct {
    client.Client
    Scheme *runtime.Scheme
    Log    logr.Logger
}

func (r *OrderProcessorReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    log := r.Log.WithValues("orderprocessor", req.NamespacedName)

    var op commercev1.OrderProcessor
    if err := r.Get(ctx, req.NamespacedName, &op); err != nil {
        return ctrl.Result{}, client.IgnoreNotFound(err)
    }

    // Ensure Deployment matches desired state
    deployment := r.deploymentForOrderProcessor(&op)
    if err := ctrl.SetControllerReference(&op, deployment, r.Scheme); err != nil {
        return ctrl.Result{}, err
    }

    found := &appsv1.Deployment{}
    err := r.Get(ctx, types.NamespacedName{Name: deployment.Name, Namespace: deployment.Namespace}, found)
    if errors.IsNotFound(err) {
        log.Info("Creating Deployment", "name", deployment.Name)
        return ctrl.Result{}, r.Create(ctx, deployment)
    }
    if err != nil {
        return ctrl.Result{}, err
    }

    // Reconcile spec if drifted
    if *found.Spec.Replicas != op.Spec.Replicas {
        found.Spec.Replicas = &op.Spec.Replicas
        return ctrl.Result{}, r.Update(ctx, found)
    }

    return ctrl.Result{RequeueAfter: 30 * time.Second}, nil
}
```

## Few-Shot Examples

### Example 1: Diagnosing CrashLoopBackOff

**Input**: "order-service pod keeps restarting with CrashLoopBackOff"

```bash
# Step 1: Get pod details
kubectl describe pod order-service-7d9f8c-x2k9p -n production

# Look for:
# - Last State exit code (1=app error, 137=OOMKilled, 143=SIGTERM)
# - Events section for scheduling or image pull errors
# - Liveness probe failures

# Step 2: View current and previous logs
kubectl logs order-service-7d9f8c-x2k9p -n production
kubectl logs order-service-7d9f8c-x2k9p -n production --previous

# Step 3: If OOMKilled (exit 137) — increase memory limit
# kubectl top pod shows actual usage near limit → bump limit 50%
kubectl top pod order-service-7d9f8c-x2k9p -n production

# Step 4: If startup probe failing — check initialDelaySeconds
# Application needs 45s to start but probe fires at 30s
```

**Fix for OOMKilled**:
```yaml
resources:
  requests:
    memory: "512Mi"
  limits:
    memory: "1Gi"    # Increased from 512Mi based on actual usage
```

**Fix for slow startup**:
```yaml
startupProbe:
  httpGet:
    path: /actuator/health
    port: http
  failureThreshold: 30    # 30 * 10s = 5 minutes max startup time
  periodSeconds: 10
livenessProbe:
  # Only activates after startupProbe succeeds
  initialDelaySeconds: 0
  periodSeconds: 10
```

---

### Example 2: Zero-Downtime Deployment with PodDisruptionBudget

**Input**: "Cluster node maintenance causes order service to go down during pod evictions"

```yaml
# Problem: no PDB means all pods can be evicted simultaneously

# Solution 1: PodDisruptionBudget
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: order-service-pdb
  namespace: production
spec:
  minAvailable: 2        # At least 2 pods always available during disruptions
  selector:
    matchLabels:
      app: order-service

# Solution 2: Topology spread across nodes and zones
spec:
  topologySpreadConstraints:
    - maxSkew: 1
      topologyKey: kubernetes.io/hostname
      whenUnsatisfiable: DoNotSchedule
      labelSelector:
        matchLabels:
          app: order-service
    - maxSkew: 1
      topologyKey: topology.kubernetes.io/zone
      whenUnsatisfiable: DoNotSchedule
      labelSelector:
        matchLabels:
          app: order-service

# Solution 3: Graceful shutdown — handle SIGTERM before pod is removed
spec:
  terminationGracePeriodSeconds: 60   # Allow in-flight requests to complete
  containers:
    - name: order-service
      lifecycle:
        preStop:
          exec:
            command: ["sh", "-c", "sleep 5"]  # Let load balancer drain first
```

---

### Example 3: Canary Deployment with Argo Rollouts

**Input**: "We want to roll out the new checkout service version to 10% of traffic first"

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: checkout-service
  namespace: production
spec:
  replicas: 10
  selector:
    matchLabels:
      app: checkout-service
  template:
    metadata:
      labels:
        app: checkout-service
    spec:
      containers:
        - name: checkout-service
          image: registry.example.com/checkout-service:2026.2.0
          resources:
            requests:
              cpu: 250m
              memory: 512Mi
  strategy:
    canary:
      canaryService: checkout-service-canary
      stableService: checkout-service-stable
      trafficRouting:
        nginx:
          stableIngress: checkout-ingress
      steps:
        - setWeight: 10         # 10% traffic to canary
        - pause: {duration: 5m} # Observe error rate and latency
        - setWeight: 30
        - pause: {duration: 5m}
        - setWeight: 60
        - pause: {duration: 5m}
        - setWeight: 100
      analysis:
        templates:
          - templateName: success-rate
        startingStep: 1
        args:
          - name: service-name
            value: checkout-service-canary

---
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: success-rate
spec:
  args:
    - name: service-name
  metrics:
    - name: success-rate
      interval: 1m
      successCondition: result[0] >= 0.99   # Abort if error rate > 1%
      failureLimit: 2
      provider:
        prometheus:
          address: http://prometheus:9090
          query: |
            sum(rate(http_requests_total{service="{{args.service-name}}", status!~"5.."}[5m]))
            /
            sum(rate(http_requests_total{service="{{args.service-name}}"}[5m]))
```

```bash
# Monitor rollout progress
kubectl argo rollouts get rollout checkout-service -n production --watch

# Manually promote or abort
kubectl argo rollouts promote checkout-service -n production
kubectl argo rollouts abort checkout-service -n production
```
