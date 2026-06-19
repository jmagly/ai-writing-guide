# Test Engineer — Worked Examples

Externalized from the agent definition per the few-shot-examples rule (#1587).

## Few-Shot Examples

### Example 1: Simple - Unit Test for Password Validation

**Input:**
"Write unit tests for a password validation function that checks for minimum length of 8 characters, at least one uppercase letter, one number, and one special character."

**Output:**
```typescript
// test/unit/validators/password.test.ts
import { describe, it, expect } from 'vitest';
import { validatePassword } from '@/validators/password';

describe('validatePassword', () => {
  describe('length requirements', () => {
    it('should reject passwords shorter than 8 characters', () => {
      const result = validatePassword('Short1!');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters');
    });

    it('should accept passwords of exactly 8 characters', () => {
      const result = validatePassword('Valid1!a');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept long passwords', () => {
      const result = validatePassword('VeryLongPassword123!WithManyCharacters');

      expect(result.valid).toBe(true);
    });
  });

  describe('complexity requirements', () => {
    it('should require at least one uppercase letter', () => {
      const result = validatePassword('lowercase1!');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should require at least one number', () => {
      const result = validatePassword('NoNumbers!');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should require at least one special character', () => {
      const result = validatePassword('NoSpecial1');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    it('should accept password meeting all complexity requirements', () => {
      const result = validatePassword('Secure123!');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty string', () => {
      const result = validatePassword('');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters');
    });

    it('should handle null input', () => {
      const result = validatePassword(null as any);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password is required');
    });

    it('should handle undefined input', () => {
      const result = validatePassword(undefined as any);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password is required');
    });

    it('should handle unicode characters', () => {
      const result = validatePassword('Valid1!日本語');

      expect(result.valid).toBe(true);
    });

    it('should handle only whitespace', () => {
      const result = validatePassword('        ');

      expect(result.valid).toBe(false);
    });

    it('should handle password with multiple violations', () => {
      const result = validatePassword('short');

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });
});
```

**Why This Is Good:**
- **Comprehensive coverage**: Tests all requirements (length, uppercase, number, special character) plus edge cases (empty, null, unicode)
- **Clear organization**: Groups tests by requirement category making them easy to understand and maintain
- **Explicit assertions**: Each test has specific expectations for both the valid flag and error messages
- **Edge case handling**: Covers null, undefined, whitespace, unicode, and multiple violations - common real-world scenarios
- **Readable test names**: Uses "should" pattern that clearly describes expected behavior
- **Proper structure**: Follows Arrange-Act-Assert pattern consistently

### Example 2: Moderate - Integration Test for Authentication API

**Input:**
"Write integration tests for POST /api/auth/login endpoint that accepts email and password, returns JWT token on success, and handles various failure scenarios including invalid credentials, missing fields, and rate limiting."

**Output:**
```typescript
// test/integration/auth/login.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '@/app';
import { setupTestDatabase, cleanupTestDatabase } from '@/test/utils/database';
import { userFactory } from '@/test/factories/user.factory';
import { hashPassword } from '@/utils/crypto';

describe('POST /api/auth/login', () => {
  let app;
  let database;
  let testUser;

  beforeAll(async () => {
    database = await setupTestDatabase();
    app = createApp(database);
  });

  afterAll(async () => {
    await cleanupTestDatabase(database);
  });

  beforeEach(async () => {
    await database.users.deleteMany({});

    // Create test user with known credentials
    const password = 'SecurePass123!';
    testUser = await database.users.create({
      email: 'test@example.com',
      passwordHash: await hashPassword(password),
      isVerified: true,
      loginAttempts: 0,
    });
  });

  describe('successful authentication', () => {
    it('should return 200 and JWT token with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.user).not.toHaveProperty('passwordHash');
    });

    it('should reset login attempts counter on successful login', async () => {
      // Simulate previous failed attempts
      await database.users.update(testUser.id, { loginAttempts: 3 });

      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!',
        });

      const updatedUser = await database.users.findById(testUser.id);
      expect(updatedUser.loginAttempts).toBe(0);
    });

    it('should update lastLoginAt timestamp', async () => {
      const beforeLogin = new Date();

      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!',
        });

      const updatedUser = await database.users.findById(testUser.id);
      expect(new Date(updatedUser.lastLoginAt)).toBeInstanceOf(Date);
      expect(new Date(updatedUser.lastLoginAt).getTime()).toBeGreaterThanOrEqual(beforeLogin.getTime());
    });
  });

  describe('authentication failures', () => {
    it('should return 401 with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword123!',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
      expect(response.body).not.toHaveProperty('token');
    });

    it('should return 401 with non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'SecurePass123!',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should increment login attempts on failed login', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword',
        });

      const updatedUser = await database.users.findById(testUser.id);
      expect(updatedUser.loginAttempts).toBe(1);
    });

    it('should lock account after 5 failed attempts', async () => {
      // Simulate 4 failed attempts
      await database.users.update(testUser.id, { loginAttempts: 4 });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword',
        });

      expect(response.status).toBe(429);
      expect(response.body.error).toBe('Account locked due to too many failed attempts');

      const updatedUser = await database.users.findById(testUser.id);
      expect(updatedUser.isLocked).toBe(true);
      expect(updatedUser.lockedUntil).toBeInstanceOf(Date);
    });

    it('should reject login for locked account even with correct password', async () => {
      await database.users.update(testUser.id, {
        isLocked: true,
        lockedUntil: new Date(Date.now() + 3600000), // 1 hour from now
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!',
        });

      expect(response.status).toBe(429);
      expect(response.body.error).toMatch(/Account is locked/);
    });

    it('should allow login after lock expires', async () => {
      await database.users.update(testUser.id, {
        isLocked: true,
        lockedUntil: new Date(Date.now() - 1000), // Expired 1 second ago
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
    });
  });

  describe('validation errors', () => {
    it('should return 400 when email is missing', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          password: 'SecurePass123!',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/email/i);
    });

    it('should return 400 when password is missing', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/password/i);
    });

    it('should return 400 with invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'not-an-email',
          password: 'SecurePass123!',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/valid email/i);
    });

    it('should return 400 when body is empty', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('security considerations', () => {
    it('should not reveal whether email exists', async () => {
      const validEmailResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword',
        });

      const invalidEmailResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'WrongPassword',
        });

      // Both should return same error message
      expect(validEmailResponse.body.error).toBe(invalidEmailResponse.body.error);
      expect(validEmailResponse.status).toBe(invalidEmailResponse.status);
    });

    it('should not include sensitive user data in response', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!',
        });

      expect(response.body.user).not.toHaveProperty('passwordHash');
      expect(response.body.user).not.toHaveProperty('loginAttempts');
      expect(response.body.user).not.toHaveProperty('isLocked');
    });

    it('should enforce rate limiting across multiple IPs', async () => {
      // Simulate rapid login attempts
      const attempts = Array.from({ length: 10 }, (_, i) =>
        request(app)
          .post('/api/auth/login')
          .set('X-Forwarded-For', `192.168.1.${i}`)
          .send({
            email: 'test@example.com',
            password: 'WrongPassword',
          })
      );

      await Promise.all(attempts);

      // Next attempt should be rate limited
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!',
        });

      expect(response.status).toBe(429);
    });
  });
});
```

**Why This Is Good:**
- **Real database integration**: Uses actual database connection, not mocks, to test full stack behavior
- **Comprehensive scenarios**: Covers success path, various failure modes, validation errors, and security considerations
- **Database state management**: Properly sets up and tears down test data, ensuring test isolation
- **Security-focused**: Tests account lockout, rate limiting, timing attack prevention, and data exposure
- **Clear test organization**: Groups related tests making it easy to understand what's being validated
- **Realistic test data**: Uses factory for user creation and tests actual JWT token generation

### Example 3: Complex - E2E Test for Multi-Page Checkout Flow

**Input:**
"Write end-to-end tests using Playwright for an e-commerce checkout flow: user adds product to cart, proceeds to checkout, enters shipping information, enters payment details, and completes purchase. Test both successful purchase and payment failure scenarios."

**Output:**
```typescript
// test/e2e/checkout/complete-purchase.test.ts
import { test, expect, Page } from '@playwright/test';
import { PaymentSimulator } from '@/test/utils/payment-simulator';
import { OrderVerifier } from '@/test/utils/order-verifier';

test.describe('Checkout Flow - Complete Purchase', () => {
  let paymentSimulator: PaymentSimulator;
  let orderVerifier: OrderVerifier;

  test.beforeAll(async () => {
    paymentSimulator = new PaymentSimulator();
    orderVerifier = new OrderVerifier();
  });

  test.beforeEach(async ({ page }) => {
    // Start at product catalog
    await page.goto('/products');

    // Clear any existing cart data
    await page.evaluate(() => localStorage.clear());
  });

  test('should complete successful purchase with valid payment', async ({ page }) => {
    // Step 1: Add product to cart
    await test.step('Add product to cart', async () => {
      const productCard = page.locator('[data-testid="product-card"]').first();
      await expect(productCard).toBeVisible();

      const productName = await productCard.locator('h3').textContent();
      const productPrice = await productCard.locator('[data-testid="price"]').textContent();

      await productCard.locator('[data-testid="add-to-cart"]').click();

      // Verify cart badge updates
      await expect(page.locator('[data-testid="cart-badge"]')).toContainText('1');

      // Store for later verification
      await page.evaluate(
        ({ name, price }) => {
          window.testData = { productName: name, productPrice: price };
        },
        { name: productName, price: productPrice }
      );
    });

    // Step 2: Navigate to cart
    await test.step('View cart', async () => {
      await page.locator('[data-testid="cart-icon"]').click();
      await expect(page).toHaveURL(/\/cart/);

      // Verify product appears in cart
      const cartItem = page.locator('[data-testid="cart-item"]').first();
      await expect(cartItem).toBeVisible();

      const testData = await page.evaluate(() => window.testData);
      await expect(cartItem.locator('h3')).toContainText(testData.productName);
    });

    // Step 3: Proceed to checkout
    await test.step('Proceed to checkout', async () => {
      await page.locator('[data-testid="checkout-button"]').click();
      await expect(page).toHaveURL(/\/checkout/);

      // Verify checkout page elements
      await expect(page.locator('h1')).toContainText('Checkout');
      await expect(page.locator('[data-testid="order-summary"]')).toBeVisible();
    });

    // Step 4: Enter shipping information
    await test.step('Enter shipping information', async () => {
      await page.locator('[data-testid="shipping-first-name"]').fill('John');
      await page.locator('[data-testid="shipping-last-name"]').fill('Doe');
      await page.locator('[data-testid="shipping-email"]').fill('john.doe@example.com');
      await page.locator('[data-testid="shipping-phone"]').fill('+1-555-0123');
      await page.locator('[data-testid="shipping-address"]').fill('123 Main Street');
      await page.locator('[data-testid="shipping-city"]').fill('San Francisco');
      await page.locator('[data-testid="shipping-state"]').selectOption('CA');
      await page.locator('[data-testid="shipping-zip"]').fill('94102');

      // Continue to payment
      await page.locator('[data-testid="continue-to-payment"]').click();

      // Verify navigation to payment step
      await expect(page.locator('[data-testid="payment-form"]')).toBeVisible();
    });

    // Step 5: Enter payment information
    let orderId: string;
    await test.step('Enter payment information', async () => {
      // Use test credit card that will succeed
      await page.locator('[data-testid="card-number"]').fill('4242424242424242');
      await page.locator('[data-testid="card-expiry"]').fill('12/25');
      await page.locator('[data-testid="card-cvc"]').fill('123');
      await page.locator('[data-testid="card-name"]').fill('John Doe');

      // Review order total
      const orderTotal = await page.locator('[data-testid="order-total"]').textContent();
      expect(orderTotal).toMatch(/\$\d+\.\d{2}/);

      // Submit payment
      await page.locator('[data-testid="submit-payment"]').click();

      // Wait for processing
      await expect(page.locator('[data-testid="processing-indicator"]')).toBeVisible();
      await expect(page.locator('[data-testid="processing-indicator"]')).not.toBeVisible({ timeout: 10000 });
    });

    // Step 6: Verify order confirmation
    await test.step('Verify order confirmation', async () => {
      // Should redirect to confirmation page
      await expect(page).toHaveURL(/\/order\/confirmation/);

      // Verify confirmation message
      await expect(page.locator('h1')).toContainText('Order Confirmed');
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();

      // Extract order ID
      orderId = await page.locator('[data-testid="order-id"]').textContent();
      expect(orderId).toMatch(/^ORD-\d+$/);

      // Verify order summary shows correct information
      const confirmationEmail = await page.locator('[data-testid="confirmation-email"]').textContent();
      expect(confirmationEmail).toContain('john.doe@example.com');

      // Verify product details in confirmation
      const testData = await page.evaluate(() => window.testData);
      await expect(page.locator('[data-testid="order-items"]')).toContainText(testData.productName);
    });

    // Step 7: Verify email confirmation (mock check)
    await test.step('Verify confirmation email sent', async () => {
      const emailSent = await orderVerifier.wasConfirmationEmailSent(orderId);
      expect(emailSent).toBe(true);
    });

    // Step 8: Verify order persisted in database
    await test.step('Verify order in database', async () => {
      const order = await orderVerifier.getOrder(orderId);

      expect(order).toBeDefined();
      expect(order.status).toBe('confirmed');
      expect(order.customerEmail).toBe('john.doe@example.com');
      expect(order.shippingAddress.city).toBe('San Francisco');
      expect(order.items.length).toBeGreaterThan(0);
    });

    // Step 9: Verify cart is cleared
    await test.step('Verify cart cleared', async () => {
      await page.goto('/cart');
      await expect(page.locator('[data-testid="empty-cart-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="cart-badge"]')).not.toBeVisible();
    });
  });

  test('should handle payment failure gracefully', async ({ page }) => {
    // Add product and proceed through checkout
    await test.step('Setup: Add product and enter shipping', async () => {
      // Add product
      await page.locator('[data-testid="product-card"]').first().locator('[data-testid="add-to-cart"]').click();
      await page.locator('[data-testid="cart-icon"]').click();
      await page.locator('[data-testid="checkout-button"]').click();

      // Fill shipping info
      await page.locator('[data-testid="shipping-first-name"]').fill('John');
      await page.locator('[data-testid="shipping-last-name"]').fill('Doe');
      await page.locator('[data-testid="shipping-email"]').fill('john.doe@example.com');
      await page.locator('[data-testid="shipping-phone"]').fill('+1-555-0123');
      await page.locator('[data-testid="shipping-address"]').fill('123 Main Street');
      await page.locator('[data-testid="shipping-city"]').fill('San Francisco');
      await page.locator('[data-testid="shipping-state"]').selectOption('CA');
      await page.locator('[data-testid="shipping-zip"]').fill('94102');

      await page.locator('[data-testid="continue-to-payment"]').click();
    });

    // Attempt payment with card that will be declined
    await test.step('Submit payment with card that will be declined', async () => {
      // Use test card that simulates decline
      await page.locator('[data-testid="card-number"]').fill('4000000000000002');
      await page.locator('[data-testid="card-expiry"]').fill('12/25');
      await page.locator('[data-testid="card-cvc"]').fill('123');
      await page.locator('[data-testid="card-name"]').fill('John Doe');

      await page.locator('[data-testid="submit-payment"]').click();

      // Wait for processing
      await expect(page.locator('[data-testid="processing-indicator"]')).toBeVisible();
      await expect(page.locator('[data-testid="processing-indicator"]')).not.toBeVisible({ timeout: 10000 });
    });

    // Verify error handling
    await test.step('Verify payment error displayed', async () => {
      // Should remain on payment page
      await expect(page).toHaveURL(/\/checkout/);

      // Error message should be visible
      const errorMessage = page.locator('[data-testid="payment-error"]');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toContainText(/declined|failed/i);

      // Payment form should still be accessible for retry
      await expect(page.locator('[data-testid="card-number"]')).toBeEditable();
    });

    // Verify order not created
    await test.step('Verify no order created in database', async () => {
      const recentOrders = await orderVerifier.getRecentOrdersByEmail('john.doe@example.com');
      expect(recentOrders.length).toBe(0);
    });

    // Verify cart still intact
    await test.step('Verify cart still contains items', async () => {
      await page.goto('/cart');
      await expect(page.locator('[data-testid="cart-item"]')).toHaveCount(1);
      await expect(page.locator('[data-testid="cart-badge"]')).toContainText('1');
    });

    // Retry with valid card
    await test.step('Retry payment with valid card', async () => {
      // Go back to checkout
      await page.locator('[data-testid="checkout-button"]').click();
      await page.locator('[data-testid="continue-to-payment"]').click();

      // Clear previous card info
      await page.locator('[data-testid="card-number"]').clear();

      // Enter valid card
      await page.locator('[data-testid="card-number"]').fill('4242424242424242');
      await page.locator('[data-testid="card-expiry"]').fill('12/25');
      await page.locator('[data-testid="card-cvc"]').fill('123');

      await page.locator('[data-testid="submit-payment"]').click();

      // Should succeed this time
      await expect(page).toHaveURL(/\/order\/confirmation/, { timeout: 10000 });
      await expect(page.locator('h1')).toContainText('Order Confirmed');
    });
  });

  test('should validate shipping information before allowing payment', async ({ page }) => {
    await test.step('Add product and navigate to checkout', async () => {
      await page.locator('[data-testid="product-card"]').first().locator('[data-testid="add-to-cart"]').click();
      await page.locator('[data-testid="cart-icon"]').click();
      await page.locator('[data-testid="checkout-button"]').click();
    });

    await test.step('Attempt to continue with missing required fields', async () => {
      // Fill only some fields
      await page.locator('[data-testid="shipping-first-name"]').fill('John');
      await page.locator('[data-testid="shipping-email"]').fill('john.doe@example.com');

      // Try to continue
      await page.locator('[data-testid="continue-to-payment"]').click();

      // Should show validation errors
      await expect(page.locator('[data-testid="error-last-name"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-address"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-city"]')).toBeVisible();

      // Should not proceed to payment
      await expect(page.locator('[data-testid="payment-form"]')).not.toBeVisible();
    });

    await test.step('Validate email format', async () => {
      await page.locator('[data-testid="shipping-email"]').fill('invalid-email');
      await page.locator('[data-testid="continue-to-payment"]').click();

      await expect(page.locator('[data-testid="error-email"]')).toContainText(/valid email/i);
    });

    await test.step('Complete all required fields and proceed', async () => {
      // Fill remaining fields
      await page.locator('[data-testid="shipping-last-name"]').fill('Doe');
      await page.locator('[data-testid="shipping-email"]').fill('john.doe@example.com');
      await page.locator('[data-testid="shipping-phone"]').fill('+1-555-0123');
      await page.locator('[data-testid="shipping-address"]').fill('123 Main Street');
      await page.locator('[data-testid="shipping-city"]').fill('San Francisco');
      await page.locator('[data-testid="shipping-state"]').selectOption('CA');
      await page.locator('[data-testid="shipping-zip"]').fill('94102');

      await page.locator('[data-testid="continue-to-payment"]').click();

      // Should now proceed to payment
      await expect(page.locator('[data-testid="payment-form"]')).toBeVisible();
    });
  });

  test('should preserve cart across page navigation', async ({ page, context }) => {
    await test.step('Add multiple products to cart', async () => {
      const products = page.locator('[data-testid="product-card"]');
      await products.nth(0).locator('[data-testid="add-to-cart"]').click();
      await products.nth(1).locator('[data-testid="add-to-cart"]').click();

      await expect(page.locator('[data-testid="cart-badge"]')).toContainText('2');
    });

    await test.step('Navigate away and return', async () => {
      await page.goto('/about');
      await page.goto('/products');

      // Cart should still show 2 items
      await expect(page.locator('[data-testid="cart-badge"]')).toContainText('2');
    });

    await test.step('Verify cart contents persist in new tab', async () => {
      const newPage = await context.newPage();
      await newPage.goto('/cart');

      // Should show same cart items
      await expect(newPage.locator('[data-testid="cart-item"]')).toHaveCount(2);

      await newPage.close();
    });

    await test.step('Verify cart persists after page reload', async () => {
      await page.goto('/cart');
      await page.reload();

      await expect(page.locator('[data-testid="cart-item"]')).toHaveCount(2);
    });
  });
});
```

**Why This Is Good:**
- **Complete user journey**: Tests the entire flow from product browsing to order confirmation, simulating real user behavior
- **Multi-page navigation**: Validates navigation between cart, checkout, and confirmation pages with proper state management
- **Both success and failure paths**: Covers successful purchase AND payment decline scenario with retry logic
- **Real-world error handling**: Tests validation errors, payment failures, and recovery mechanisms
- **Database verification**: Confirms orders are properly persisted and emails sent, not just UI state
- **State persistence**: Tests that cart data survives navigation, page reloads, and new tabs
- **Clear test steps**: Uses `test.step()` to break complex flows into readable, debuggable segments
- **Comprehensive assertions**: Verifies UI state, database state, external service calls, and user feedback at each step
