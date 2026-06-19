# React Expert — Worked Examples

Externalized from the agent definition per the few-shot-examples rule (#1587).

### Example 1: Component Architecture Review

**Input**: "Review our product listing page — it's slow and has a 6-second TTI"

**Analysis approach**:
```bash
# Check what's client-rendered that could be server-rendered
grep -r '"use client"' src/app/products/
# Check bundle contribution
npx next build --debug 2>&1 | grep "products"
```

**Findings and fix**:
```typescript
// BEFORE: Entire page is a Client Component, blocking TTI
"use client";
import { useState, useEffect } from "react";

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  useEffect(() => {
    fetch("/api/products").then(r => r.json()).then(setProducts);
  }, []);
  return <ProductGrid products={products} />;
}

// AFTER: Server Component fetches data, Client Component handles interactivity
// app/products/page.tsx — no "use client"
export default async function ProductsPage({
  searchParams,
}: {
  searchParams: { category?: string };
}) {
  const products = await db.product.findMany({
    where: { category: searchParams.category },
    take: 24,
  });
  return (
    <>
      <CategoryFilter /> {/* Client Component */}
      <Suspense fallback={<ProductGridSkeleton />}>
        <ProductGrid products={products} /> {/* Server Component */}
      </Suspense>
    </>
  );
}
```

**Result**: TTI drops from 6s to 1.2s by eliminating client-side data fetch waterfall.

---

### Example 2: Performance Optimization — Unnecessary Re-renders

**Input**: "Our product list with 500 items is janky when the cart updates"

**Diagnosis**:
```typescript
// React DevTools Profiler shows ProductCard re-renders 500 times on cart change
// Root cause: onAddToCart function reference changes every render

// BEFORE: new function reference every render
function ProductList({ products }) {
  const [cart, setCart] = useState([]);

  return products.map((p) => (
    <ProductCard
      key={p.id}
      product={p}
      // New function on every render → breaks memo
      onAddToCart={(id) => setCart((prev) => [...prev, id])}
    />
  ));
}

// AFTER: stable references + memo
const ProductCard = memo(function ProductCard({ product, onAddToCart }) {
  return (
    <article>
      <h2>{product.name}</h2>
      <button onClick={() => onAddToCart(product.id)}>Add</button>
    </article>
  );
});

function ProductList({ products }) {
  const [cart, setCart] = useState<string[]>([]);

  const handleAddToCart = useCallback((id: string) => {
    setCart((prev) => [...prev, id]);
  }, []); // Stable: no deps change

  return products.map((p) => (
    <ProductCard key={p.id} product={p} onAddToCart={handleAddToCart} />
  ));
}
```

**Result**: Re-renders drop from 500 to 1 on cart update. Interaction latency under 16ms.

---

### Example 3: Migration from Class Components to Hooks

**Input**: "Migrate our legacy class component with lifecycle methods to hooks"

```typescript
// BEFORE: Class component with lifecycle methods
class UserProfile extends React.Component<Props, State> {
  state = { user: null, loading: true, error: null };

  componentDidMount() {
    this.fetchUser();
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.userId !== this.props.userId) {
      this.fetchUser();
    }
  }

  componentWillUnmount() {
    this.abortController?.abort();
  }

  fetchUser = async () => {
    this.abortController = new AbortController();
    try {
      const user = await getUser(this.props.userId, this.abortController.signal);
      this.setState({ user, loading: false });
    } catch (err) {
      if (err.name !== "AbortError") {
        this.setState({ error: err, loading: false });
      }
    }
  };

  render() {
    const { user, loading, error } = this.state;
    if (loading) return <Spinner />;
    if (error) return <ErrorMessage error={error} />;
    return <UserCard user={user} />;
  }
}

// AFTER: Functional component with hooks
function UserProfile({ userId }: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    getUser(userId, controller.signal)
      .then((u) => { setUser(u); setLoading(false); })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setError(err);
          setLoading(false);
        }
      });

    return () => controller.abort(); // Cleanup on unmount or userId change
  }, [userId]); // Re-runs when userId changes — replaces componentDidUpdate

  if (loading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;
  if (!user) return null;
  return <UserCard user={user} />;
}

// Better: extract to custom hook for reuse and testability
function useUser(userId: string) {
  const [state, setState] = useState<{ user: User | null; loading: boolean; error: Error | null }>({
    user: null, loading: true, error: null,
  });

  useEffect(() => {
    const controller = new AbortController();
    setState({ user: null, loading: true, error: null });

    getUser(userId, controller.signal)
      .then((user) => setState({ user, loading: false, error: null }))
      .catch((error) => {
        if (error.name !== "AbortError") {
          setState({ user: null, loading: false, error });
        }
      });

    return () => controller.abort();
  }, [userId]);

  return state;
}

function UserProfile({ userId }: Props) {
  const { user, loading, error } = useUser(userId);
  if (loading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;
  if (!user) return null;
  return <UserCard user={user} />;
}
```
