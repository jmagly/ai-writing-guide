# Django Expert — Worked Examples

Externalized from the agent definition per the few-shot-examples rule (#1587).

## Your Process — Sample Implementations

### 1. Codebase Audit

```bash
# Identify slow views via Django Debug Toolbar queries
# Check for common anti-patterns
grep -r "\.objects\.all()" apps/ --include="*.py"
grep -r "select_related\|prefetch_related" apps/ --include="*.py"

# Run Django system checks
python manage.py check --deploy

# Find large migration files that may indicate schema issues
find . -path "*/migrations/*.py" -size +20k | sort -rh | head -10
```

### 2. ORM Optimization

```python
# PROBLEM: N+1 queries — one query per related object
def get_orders(request):
    orders = Order.objects.filter(user=request.user)
    for order in orders:
        # Each access hits the DB again
        print(order.customer.name)      # N queries for customer
        print(order.items.count())      # N queries for item counts
    return orders

# SOLUTION: select_related for FK/OneToOne, prefetch_related for M2M/reverse FK
def get_orders(request):
    orders = (
        Order.objects.filter(user=request.user)
        .select_related("customer")              # JOIN — single query
        .prefetch_related(
            Prefetch(
                "items",
                queryset=OrderItem.objects.select_related("product"),
            )
        )
        .annotate(item_count=Count("items"))     # DB-level aggregation
        .order_by("-created_at")
    )
    return orders

# Custom manager encapsulates query logic
class OrderManager(models.Manager):
    def for_user(self, user):
        return (
            self.get_queryset()
            .filter(user=user)
            .select_related("customer")
            .prefetch_related("items__product")
            .annotate(item_count=Count("items"))
        )

    def pending(self):
        return self.get_queryset().filter(status=Order.Status.PENDING)

class Order(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        CONFIRMED = "confirmed", "Confirmed"
        SHIPPED = "shipped", "Shipped"

    objects = OrderManager()
```

### 3. DRF API Design

```python
# Serializer with nested writes and validation
from rest_framework import serializers
from rest_framework.validators import UniqueTogetherValidator

class OrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    subtotal = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = ["id", "product", "product_name", "quantity", "unit_price", "subtotal"]
        read_only_fields = ["unit_price"]

    def get_subtotal(self, obj) -> str:
        return str(obj.quantity * obj.unit_price)


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Order
        fields = ["id", "customer", "status", "status_display", "items", "created_at"]
        read_only_fields = ["created_at"]

    def validate(self, data):
        # Cross-field validation
        if data.get("status") == Order.Status.SHIPPED and not data.get("tracking_number"):
            raise serializers.ValidationError(
                {"tracking_number": "Tracking number required when shipping."}
            )
        return data

    def create(self, validated_data):
        items_data = validated_data.pop("items")
        order = Order.objects.create(**validated_data)
        OrderItem.objects.bulk_create(
            [OrderItem(order=order, **item) for item in items_data]
        )
        return order


# ViewSet with queryset optimization and action methods
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Order.objects.for_user(self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=["post"])
    def confirm(self, request, pk=None):
        order = self.get_object()
        if order.status != Order.Status.PENDING:
            return Response(
                {"detail": "Only pending orders can be confirmed."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        order.status = Order.Status.CONFIRMED
        order.save(update_fields=["status"])
        send_confirmation_email.delay(order.id)  # Celery task
        return Response(OrderSerializer(order).data)
```

### 4. Middleware Patterns

```python
# Custom middleware: timing and request ID injection
import time
import uuid
import logging
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger("django.request")

class RequestTimingMiddleware(MiddlewareMixin):
    """Adds X-Request-ID header and logs request duration."""

    def process_request(self, request):
        request.request_id = str(uuid.uuid4())
        request._start_time = time.monotonic()

    def process_response(self, request, response):
        duration_ms = (time.monotonic() - request._start_time) * 1000
        response["X-Request-ID"] = getattr(request, "request_id", "")
        response["X-Response-Time"] = f"{duration_ms:.2f}ms"

        if duration_ms > 500:
            logger.warning(
                "Slow request: %s %s took %.2fms (request_id=%s)",
                request.method,
                request.path,
                duration_ms,
                request.request_id,
            )
        return response


# Middleware for current user context (signals, models)
import threading

_thread_local = threading.local()

class CurrentUserMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        _thread_local.user = getattr(request, "user", None)
        response = self.get_response(request)
        _thread_local.user = None
        return response

def get_current_user():
    return getattr(_thread_local, "user", None)
```

### 5. Celery Integration

```python
# tasks.py — idempotent tasks with retry strategy
from celery import shared_task
from celery.utils.log import get_task_logger
from django.db import transaction

logger = get_task_logger(__name__)

@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,  # 1 minute
    acks_late=True,           # Acknowledge only after successful completion
    reject_on_worker_lost=True,
)
def send_confirmation_email(self, order_id: int) -> dict:
    """Send order confirmation email. Idempotent — safe to retry."""
    try:
        order = Order.objects.select_related("customer").get(pk=order_id)

        if order.confirmation_sent_at:
            logger.info("Confirmation already sent for order %d, skipping.", order_id)
            return {"status": "skipped", "order_id": order_id}

        with transaction.atomic():
            # Mark sent atomically before sending to prevent duplicate sends
            rows = Order.objects.filter(
                pk=order_id, confirmation_sent_at__isnull=True
            ).update(confirmation_sent_at=now())

            if rows == 0:
                return {"status": "skipped", "order_id": order_id}

            _send_email(order)  # Actual send after DB lock

        return {"status": "sent", "order_id": order_id}

    except Order.DoesNotExist:
        logger.error("Order %d not found, not retrying.", order_id)
        return {"status": "not_found", "order_id": order_id}

    except Exception as exc:
        logger.warning("Email send failed for order %d: %s", order_id, exc)
        raise self.retry(exc=exc)


# celery.py — app configuration
from celery import Celery
from celery.schedules import crontab

app = Celery("myproject")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()

app.conf.beat_schedule = {
    "cleanup-expired-sessions": {
        "task": "apps.accounts.tasks.cleanup_expired_sessions",
        "schedule": crontab(hour=2, minute=0),  # 2am daily
    },
    "send-daily-digest": {
        "task": "apps.notifications.tasks.send_daily_digest",
        "schedule": crontab(hour=8, minute=0, day_of_week="mon-fri"),
    },
}
```

### 6. Settings Management

```python
# settings/base.py — environment-driven configuration
from pathlib import Path
import environ

env = environ.Env(
    DEBUG=(bool, False),
    ALLOWED_HOSTS=(list, []),
)

BASE_DIR = Path(__file__).resolve().parent.parent
environ.Env.read_env(BASE_DIR / ".env")

SECRET_KEY = env("SECRET_KEY")
DEBUG = env("DEBUG")
ALLOWED_HOSTS = env("ALLOWED_HOSTS")

DATABASES = {
    "default": env.db("DATABASE_URL")  # postgres://user:pass@host/db
}

CACHES = {
    "default": env.cache("REDIS_URL")  # redis://localhost:6379/0
}

CELERY_BROKER_URL = env("REDIS_URL")
CELERY_RESULT_BACKEND = env("REDIS_URL")

# Security hardening for production
SECURE_HSTS_SECONDS = env.int("SECURE_HSTS_SECONDS", default=0)
SECURE_SSL_REDIRECT = env.bool("SECURE_SSL_REDIRECT", default=False)
SESSION_COOKIE_SECURE = env.bool("SESSION_COOKIE_SECURE", default=False)
CSRF_COOKIE_SECURE = env.bool("CSRF_COOKIE_SECURE", default=False)
```

## Few-Shot Examples

### Example 1: N+1 Query Detection and Fix

**Input**: "Our `/api/orders/` endpoint is slow — 300ms for 25 orders"

**Diagnosis with Django Debug Toolbar**:
```
GET /api/orders/
51 queries | 287ms
```

**Root cause**:
```python
# views.py — missing prefetch
class OrderViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        return Order.objects.filter(user=self.request.user)
        # Missing: each serializer access to order.customer and order.items
        # triggers separate DB hits → 1 + 25 + 25 = 51 queries
```

**Fix**:
```python
class OrderViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        return (
            Order.objects.filter(user=self.request.user)
            .select_related("customer")
            .prefetch_related(
                Prefetch("items", queryset=OrderItem.objects.select_related("product"))
            )
            .annotate(item_count=Count("items"))
        )
```

**Result**: 51 queries → 3 queries. Response time: 287ms → 18ms.

---

### Example 2: DRF Serializer for Nested Create

**Input**: "We need to create an order with multiple line items in one API call"

```python
# serializers.py
class CreateOrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, min_length=1)

    class Meta:
        model = Order
        fields = ["customer", "shipping_address", "items"]

    def validate_items(self, items):
        # Validate product availability
        product_ids = [item["product"].id for item in items]
        unavailable = Product.objects.filter(
            id__in=product_ids, available=False
        ).values_list("id", flat=True)
        if unavailable:
            raise serializers.ValidationError(
                f"Products unavailable: {list(unavailable)}"
            )
        return items

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop("items")
        order = Order.objects.create(
            user=self.context["request"].user, **validated_data
        )
        # Bulk create for efficiency
        OrderItem.objects.bulk_create([
            OrderItem(
                order=order,
                product=item["product"],
                quantity=item["quantity"],
                unit_price=item["product"].price,  # Capture price at time of order
            )
            for item in items_data
        ])
        return order
```

---

### Example 3: Zero-Downtime Migration for Adding a Non-Nullable Column

**Input**: "We need to add a required `sku` field to Product — how do we migrate without downtime?"

```python
# Step 1: Add nullable column (deploy 1 — backward compatible)
# migrations/0042_product_add_sku_nullable.py
class Migration(migrations.Migration):
    def up(self, schema_editor):
        schema_editor.add_column(
            "products_product",
            models.CharField(max_length=64, null=True, blank=True),
        )

# Step 2: Backfill data (data migration — run separately or in step 1)
# migrations/0043_product_backfill_sku.py
def backfill_sku(apps, schema_editor):
    Product = apps.get_model("products", "Product")
    products = Product.objects.filter(sku__isnull=True)
    for batch_start in range(0, products.count(), 1000):
        batch = products[batch_start : batch_start + 1000]
        for product in batch:
            product.sku = generate_sku(product.name, product.id)
        Product.objects.bulk_update(batch, ["sku"])

# Step 3: Add NOT NULL constraint (deploy 2 — after all rows backfilled)
# migrations/0044_product_sku_not_null.py
class Migration(migrations.Migration):
    def up(self, schema_editor):
        schema_editor.execute(
            "ALTER TABLE products_product ALTER COLUMN sku SET NOT NULL"
        )
```
