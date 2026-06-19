# Frontend Specialist — Worked Examples

Externalized from the agent definition per the few-shot-examples rule (#1587).

## Process Reference Samples

These illustrative code/CSS samples support the agent's `## Your Process` section. The agent definition retains the load-bearing guidance and patterns; the full samples live here.

### 1. Component Architecture — compound component pattern

```typescript
// Compound component pattern — expose sub-components for flexible composition
interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card = ({ children, className }: CardProps) => (
  <div className={cn('rounded-lg border bg-surface shadow-sm', className)}>
    {children}
  </div>
);

Card.Header = ({ children }: { children: React.ReactNode }) => (
  <div className="border-b px-6 py-4 font-semibold">{children}</div>
);

Card.Body = ({ children }: { children: React.ReactNode }) => (
  <div className="px-6 py-4">{children}</div>
);

Card.Footer = ({ children }: { children: React.ReactNode }) => (
  <div className="border-t px-6 py-4 text-sm text-muted">{children}</div>
);

// Usage
<Card>
  <Card.Header>Order Summary</Card.Header>
  <Card.Body>...</Card.Body>
  <Card.Footer>Last updated 5 min ago</Card.Footer>
</Card>
```

### 2. Performance Optimization

**Bundle analysis:**

```bash
# Analyze bundle composition
npx vite-bundle-visualizer
# or for webpack
npx webpack-bundle-analyzer stats.json

# Track size over time in CI
npx bundlesize --config bundlesize.config.json
```

**Code splitting and lazy loading:**

```typescript
// Route-level code splitting
import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));

export function AppRoutes() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Suspense>
  );
}

// Component-level lazy loading for heavy widgets
const HeavyChart = lazy(() =>
  import('./components/HeavyChart').then((m) => ({ default: m.HeavyChart }))
);
```

**Image optimization:**

```typescript
// Responsive image with explicit dimensions to prevent CLS
<img
  src="/hero.webp"
  srcSet="/hero-480.webp 480w, /hero-960.webp 960w, /hero-1440.webp 1440w"
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
  width={960}
  height={540}
  loading="lazy"
  decoding="async"
  alt="Team working together in a modern office"
/>
```

### 3. Accessibility Compliance

**Semantic structure:**

```typescript
// Use landmarks and headings to structure the page
<header role="banner">
  <nav aria-label="Main navigation">...</nav>
</header>

<main id="main-content">
  <h1>Dashboard</h1>
  <section aria-labelledby="stats-heading">
    <h2 id="stats-heading">Key Statistics</h2>
    ...
  </section>
</main>

<footer role="contentinfo">...</footer>

// Skip link for keyboard users
<a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4">
  Skip to main content
</a>
```

**Color contrast and focus visibility:**

```css
/* Minimum contrast: 4.5:1 for normal text, 3:1 for large text */
:root {
  --color-text-primary: #1a1a2e;   /* contrast 14.3:1 on white */
  --color-text-muted: #595975;     /* contrast 4.6:1 on white — just passes AA */
  --color-action: #1d4ed8;         /* contrast 5.9:1 on white */
}

/* Always show focus ring — never remove it without a replacement */
:focus-visible {
  outline: 2px solid var(--color-action);
  outline-offset: 2px;
}

/* High-contrast mode support */
@media (forced-colors: active) {
  .button {
    border: 2px solid ButtonText;
  }
}
```

### 4. CSS Architecture — responsive design with container queries

```css
/* Prefer container queries over media queries for component-level responsiveness */
.card-container {
  container-type: inline-size;
  container-name: card;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

@container card (min-width: 480px) {
  .card-body {
    flex-direction: row;
  }
}

/* Fluid typography with clamp() */
:root {
  --font-size-heading: clamp(1.5rem, 4vw, 2.5rem);
  --font-size-body: clamp(0.875rem, 1.5vw, 1rem);
}
```

### 5. Testing Strategy

**Component unit tests:**

```typescript
// UserCard.test.tsx — test behavior, not implementation details
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserCard } from './UserCard';

const user = { id: '1', name: 'Alex Kim', email: 'alex@example.com', role: 'admin' };

describe('UserCard', () => {
  it('renders user name and email', () => {
    render(<UserCard user={user} onEdit={() => {}} />);
    expect(screen.getByText('Alex Kim')).toBeInTheDocument();
    expect(screen.getByText('alex@example.com')).toBeInTheDocument();
  });

  it('calls onEdit with user id when edit button is clicked', async () => {
    const onEdit = vi.fn();
    render(<UserCard user={user} onEdit={onEdit} />);
    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    expect(onEdit).toHaveBeenCalledWith('1');
  });

  it('displays admin badge when role is admin', () => {
    render(<UserCard user={user} onEdit={() => {}} />);
    expect(screen.getByText('admin')).toBeInTheDocument();
  });
});
```

**Accessibility testing:**

```typescript
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

it('has no accessibility violations', async () => {
  const { container } = render(<Select options={options} value="a" onChange={() => {}} label="Status" />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

**Playwright E2E:**

```typescript
// tests/e2e/checkout.spec.ts
import { test, expect } from '@playwright/test';

test('user can complete checkout', async ({ page }) => {
  await page.goto('/cart');
  await page.getByRole('button', { name: 'Proceed to checkout' }).click();
  await page.getByLabel('Card number').fill('4242424242424242');
  await page.getByLabel('Expiry').fill('12/28');
  await page.getByLabel('CVC').fill('123');
  await page.getByRole('button', { name: 'Pay now' }).click();
  await expect(page.getByRole('heading', { name: 'Order confirmed' })).toBeVisible();
});

// Accessibility check in E2E
test('checkout page has no critical a11y violations', async ({ page }) => {
  await page.goto('/checkout');
  const violations = await page.evaluate(async () => {
    const { axe } = await import('axe-core');
    const results = await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] });
    return results.violations;
  });
  const criticalOrSerious = violations.filter((v) => ['critical', 'serious'].includes(v.impact ?? ''));
  expect(criticalOrSerious).toHaveLength(0);
});
```

## Few-Shot Examples

### Example 1 (Simple): Component Architecture Review

**Input:**
> "Review this ProductCard component — it feels hard to extend."

```typescript
// Current implementation
function ProductCard({ product, onAddToCart, onWishlist, showBadge, badgeText, variant }) {
  return (
    <div className={`card ${variant}`}>
      {showBadge && <span className="badge">{badgeText}</span>}
      <img src={product.image} alt={product.name} />
      <h3>{product.name}</h3>
      <p>{product.price}</p>
      <button onClick={() => onAddToCart(product.id)}>Add to cart</button>
      {onWishlist && <button onClick={() => onWishlist(product.id)}>Save</button>}
    </div>
  );
}
```

**Analysis:**
The component mixes layout, badge logic, and action handling into a single flat prop surface. Adding a new action or badge variant requires a new prop each time.

**Refactor — compound component with slot-based composition:**

```typescript
function ProductCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return <article className={cn('rounded-lg border bg-white shadow-sm', className)}>{children}</article>;
}

ProductCard.Image = ({ src, alt }: { src: string; alt: string }) => (
  <img src={src} alt={alt} className="rounded-t-lg object-cover w-full aspect-square" loading="lazy" decoding="async" />
);

ProductCard.Badge = ({ children }: { children: React.ReactNode }) => (
  <span className="absolute top-2 left-2 rounded-full bg-action px-2 py-0.5 text-xs font-medium text-white">
    {children}
  </span>
);

ProductCard.Body = ({ children }: { children: React.ReactNode }) => <div className="p-4">{children}</div>;
ProductCard.Actions = ({ children }: { children: React.ReactNode }) => <div className="flex gap-2 p-4 pt-0">{children}</div>;

// Usage — any combination, no extra props needed
<ProductCard>
  <div className="relative">
    <ProductCard.Image src={product.image} alt={product.name} />
    <ProductCard.Badge>Sale</ProductCard.Badge>
  </div>
  <ProductCard.Body>
    <h3>{product.name}</h3>
    <p>{product.price}</p>
  </ProductCard.Body>
  <ProductCard.Actions>
    <button onClick={() => onAddToCart(product.id)}>Add to cart</button>
  </ProductCard.Actions>
</ProductCard>
```

---

### Example 2 (Moderate): Performance Audit with Web Vitals Optimization

**Input:**
> "Our LCP is 4.8s in the field. Lighthouse scores 38. The main page has a hero image and loads a large product grid."

**Diagnosis:** Run `npx lhci autorun` to capture the waterfall. Check the Filmstrip tab to identify the LCP element. Open bundle analyzer to find what's blocking the initial load.

**Root causes found:**
- Hero image is 1.4MB JPEG with no `width`/`height` → causes CLS and late discovery
- Image not preloaded → browser discovers it only after parsing CSS
- Product grid imports a 340KB charting library on the initial bundle
- No `font-display: swap` → FOIT delays text rendering

**Fixes:**

```html
<!-- index.html: preload the LCP image -->
<link
  rel="preload"
  as="image"
  href="/hero-960.webp"
  imagesrcset="/hero-480.webp 480w, /hero-960.webp 960w"
  imagesizes="100vw"
/>
```

```typescript
// Convert hero to responsive WebP with explicit dimensions
<img
  src="/hero-960.webp"
  srcSet="/hero-480.webp 480w, /hero-960.webp 960w, /hero-1440.webp 1440w"
  sizes="100vw"
  width={960}
  height={540}
  fetchPriority="high"
  alt="Browse our latest collection"
/>
```

```typescript
// Lazy-load the charting library — not needed on initial render
const SalesChart = lazy(() => import('./components/SalesChart'));

// Replace immediate render with deferred
<Suspense fallback={<ChartSkeleton />}>
  <SalesChart data={salesData} />
</Suspense>
```

```css
/* global.css: prevent FOIT */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-var.woff2') format('woff2');
  font-display: swap;
  font-weight: 100 900;
}
```

**Expected results after fixes:** LCP 4.8s → ~1.9s, CLS 0.28 → 0.04, bundle -340KB gzip.

---

### Example 3 (Complex): Design System Implementation with Accessibility

**Input:**
> "We need a reusable Button component that supports multiple variants, sizes, loading state, and meets WCAG 2.1 AA."

**Implementation:**

```typescript
// src/components/ui/Button/Button.tsx
import { forwardRef, ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Spinner } from '../Spinner';

const buttonVariants = cva(
  // Base styles shared across all variants
  [
    'inline-flex items-center justify-center gap-2',
    'rounded-md font-medium transition-colors',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action',
    'disabled:cursor-not-allowed disabled:opacity-50',
    'aria-disabled:cursor-not-allowed aria-disabled:opacity-50',
  ],
  {
    variants: {
      variant: {
        primary: 'bg-action text-white hover:bg-action-hover active:bg-action-active',
        secondary: 'bg-surface border border-border text-text-primary hover:bg-surface-muted',
        danger: 'bg-danger text-white hover:bg-danger-hover',
        ghost: 'text-text-primary hover:bg-surface-muted',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-base',
        lg: 'h-12 px-6 text-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  loadingText?: string;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant, size, loading, loadingText, disabled, children, className, ...props }, ref) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-busy={loading}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >
        {loading && (
          <>
            <Spinner size="sm" aria-hidden="true" />
            <span className="sr-only">{loadingText ?? 'Loading'}</span>
          </>
        )}
        <span aria-hidden={loading}>{children}</span>
      </button>
    );
  }
);

Button.displayName = 'Button';
export { Button, buttonVariants };
export type { ButtonProps };
```

```typescript
// src/components/ui/Button/Button.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Button } from './Button';

expect.extend(toHaveNoViolations);

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Save changes</Button>);
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click me</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('is not clickable when disabled', async () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>Submit</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('shows loading indicator and suppresses click when loading', async () => {
    const onClick = vi.fn();
    render(<Button loading onClick={onClick}>Save</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('Loading')).toBeInTheDocument(); // sr-only text
    await userEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('has no accessibility violations across all variants', async () => {
    const { container } = render(
      <div>
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="danger">Delete</Button>
        <Button variant="ghost">Ghost</Button>
        <Button disabled>Disabled</Button>
        <Button loading>Loading</Button>
      </div>
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

```typescript
// src/components/ui/Button/index.ts
export { Button, buttonVariants } from './Button';
export type { ButtonProps } from './Button';
```

**Storybook story for design system documentation:**

Add Storybook stories alongside each component. Use the `@storybook/addon-a11y` panel to catch color contrast violations and focus issues during development before they reach CI.
