# Spring Boot Expert — Worked Examples

Externalized from the agent definition per the few-shot-examples rule (#1587).

## Your Process

### 1. Project Assessment

```bash
# Check Spring Boot version and dependency health
./mvnw dependency:tree | grep "spring-boot"

# Identify slow startup components
./mvnw spring-boot:run -Dspring-boot.run.jvmArguments="-verbose:class" 2>&1 | grep "Loaded" | wc -l

# Check for common anti-patterns
grep -r "FetchType.EAGER" src/ --include="*.java" --include="*.kt"
grep -r "new RestTemplate()" src/ --include="*.java" --include="*.kt"

# Run static analysis
./mvnw spotbugs:check pmd:check
```

### 2. Spring Security Configuration

```java
// SecurityConfig.java — method security + JWT filter chain
@Configuration
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtFilter;

    public SecurityConfig(JwtAuthenticationFilter jwtFilter) {
        this.jwtFilter = jwtFilter;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/v1/auth/**").permitAll()
                .requestMatchers("/actuator/health", "/actuator/info").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/products/**").permitAll()
                .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated())
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint(new BearerTokenAuthenticationEntryPoint())
                .accessDeniedHandler(new BearerTokenAccessDeniedHandler()))
            .build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }
}

// JwtAuthenticationFilter.java
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain filterChain
    ) throws ServletException, IOException {
        final String authHeader = request.getHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            final String jwt = authHeader.substring(7);
            final String userEmail = jwtService.extractUsername(jwt);

            if (userEmail != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                UserDetails userDetails = userDetailsService.loadUserByUsername(userEmail);
                if (jwtService.isTokenValid(jwt, userDetails)) {
                    UsernamePasswordAuthenticationToken authToken =
                        new UsernamePasswordAuthenticationToken(
                            userDetails, null, userDetails.getAuthorities());
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                }
            }
        } catch (JwtException e) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }

        filterChain.doFilter(request, response);
    }
}
```

### 3. JPA/Hibernate Optimization

```java
// Entity design — explicit fetch strategies and N+1 prevention
@Entity
@Table(name = "orders",
    indexes = {
        @Index(name = "idx_orders_user_id", columnList = "user_id"),
        @Index(name = "idx_orders_status_created", columnList = "status, created_at DESC")
    })
@NamedEntityGraph(
    name = "Order.withItemsAndProducts",
    attributeNodes = {
        @NamedAttributeNode(value = "items", subgraph = "items-subgraph")
    },
    subgraphs = @NamedSubgraph(
        name = "items-subgraph",
        attributeNodes = @NamedAttributeNode("product")
    )
)
public class Order {
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "order_seq")
    @SequenceGenerator(name = "order_seq", sequenceName = "order_id_seq", allocationSize = 50)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)  // Always LAZY — load explicitly when needed
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @OneToMany(mappedBy = "order", fetch = FetchType.LAZY, cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderItem> items = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OrderStatus status;
}

// Repository with JPQL and entity graph
@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    // Use entity graph to avoid N+1 in list queries
    @EntityGraph("Order.withItemsAndProducts")
    List<Order> findByUserIdAndStatus(Long userId, OrderStatus status);

    // Projection for list views — only fetch what's needed
    @Query("SELECT new com.example.dto.OrderSummary(o.id, o.status, o.createdAt, COUNT(i)) " +
           "FROM Order o LEFT JOIN o.items i " +
           "WHERE o.user.id = :userId " +
           "GROUP BY o.id, o.status, o.createdAt")
    List<OrderSummary> findSummariesByUserId(@Param("userId") Long userId);

    // Bulk status update — no entity loading needed
    @Modifying
    @Query("UPDATE Order o SET o.status = :status WHERE o.id IN :ids")
    int bulkUpdateStatus(@Param("ids") List<Long> ids, @Param("status") OrderStatus status);
}
```

### 4. WebFlux Reactive Pipeline

```java
// Reactive controller with WebFlux
@RestController
@RequestMapping("/api/v1/products")
public class ProductController {

    private final ProductService productService;

    @GetMapping(produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<Product> streamProducts(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        return productService.findAll(PageRequest.of(page, size))
            .delayElements(Duration.ofMillis(100))  // Back-pressure example
            .onErrorResume(ex -> {
                log.error("Error streaming products", ex);
                return Flux.error(new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR, "Stream failed"));
            });
    }

    @PostMapping
    public Mono<ResponseEntity<Product>> create(@RequestBody @Valid Mono<CreateProductRequest> request) {
        return request
            .flatMap(productService::create)
            .map(product -> ResponseEntity.status(HttpStatus.CREATED).body(product))
            .onErrorMap(DataIntegrityViolationException.class, ex ->
                new ResponseStatusException(HttpStatus.CONFLICT, "Product SKU already exists"));
    }
}

// Service with reactive composition
@Service
public class ProductService {

    private final ProductRepository repository;
    private final ReactiveRedisTemplate<String, Product> cache;
    private final StockServiceClient stockClient;

    public Mono<Product> findById(Long id) {
        String cacheKey = "product:" + id;
        return cache.opsForValue().get(cacheKey)
            .switchIfEmpty(
                repository.findById(id)
                    .switchIfEmpty(Mono.error(new ProductNotFoundException(id)))
                    .flatMap(product ->
                        cache.opsForValue()
                             .set(cacheKey, product, Duration.ofHours(1))
                             .thenReturn(product))
            );
    }

    // Parallel calls with zipWith
    public Mono<ProductDetail> findDetailById(Long id) {
        return Mono.zip(
            findById(id),
            stockClient.getStock(id).defaultIfEmpty(StockInfo.UNAVAILABLE)
        ).map(tuple -> ProductDetail.of(tuple.getT1(), tuple.getT2()));
    }
}
```

### 5. Configuration and Profile Management

```yaml
# application.yml — base configuration
spring:
  application:
    name: myapp
  datasource:
    url: ${DB_URL}
    username: ${DB_USER}
    password: ${DB_PASSWORD}
    hikari:
      maximum-pool-size: ${DB_POOL_SIZE:10}
      minimum-idle: 2
      connection-timeout: 30000
      idle-timeout: 600000
      max-lifetime: 1800000
  jpa:
    open-in-view: false   # CRITICAL: disable OSIV in production
    hibernate:
      ddl-auto: validate   # Never 'update' or 'create' in production
    properties:
      hibernate:
        default_batch_fetch_size: 100   # Batch fetching for collections
        generate_statistics: false
  cache:
    type: redis
  data:
    redis:
      url: ${REDIS_URL:redis://localhost:6379}

management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
  endpoint:
    health:
      probes:
        enabled: true   # /actuator/health/liveness and /readiness for K8s

---
# application-prod.yml — production overrides
spring:
  config:
    activate:
      on-profile: prod
  jpa:
    properties:
      hibernate:
        generate_statistics: false

server:
  tomcat:
    threads:
      max: ${TOMCAT_MAX_THREADS:200}
      min-spare: ${TOMCAT_MIN_THREADS:10}
    connection-timeout: 5000
    accept-count: 100

logging:
  level:
    root: WARN
    com.example: INFO
  pattern:
    console: '{"timestamp":"%d","level":"%p","logger":"%c","message":"%m","thread":"%t"}%n'
```

### 6. GraalVM Native Image

```xml
<!-- pom.xml — native profile -->
<profiles>
  <profile>
    <id>native</id>
    <build>
      <plugins>
        <plugin>
          <groupId>org.graalvm.buildtools</groupId>
          <artifactId>native-maven-plugin</artifactId>
          <configuration>
            <buildArgs>
              <buildArg>--initialize-at-build-time=org.slf4j</buildArg>
              <buildArg>-H:+ReportExceptionStackTraces</buildArg>
              <buildArg>--strict-image-heap</buildArg>
            </buildArgs>
          </configuration>
        </plugin>
      </plugins>
    </build>
  </profile>
</profiles>
```

```java
// Native hints for reflection-heavy code
@Configuration
@ImportRuntimeHints(MyRuntimeHints.class)
public class NativeConfig {

    static class MyRuntimeHints implements RuntimeHintsRegistrar {
        @Override
        public void registerHints(RuntimeHints hints, ClassLoader classLoader) {
            // Register classes that use reflection
            hints.reflection()
                .registerType(OrderEvent.class, MemberCategory.values())
                .registerType(ProductDto.class, MemberCategory.INVOKE_DECLARED_CONSTRUCTORS,
                    MemberCategory.DECLARED_FIELDS);
            // Register resources
            hints.resources().registerPattern("messages/*.properties");
        }
    }
}
```

```bash
# Build and verify native image
./mvnw -Pnative native:compile -DskipTests
./mvnw -Pnative test -Dspring.test.context.cache.maxSize=1

# Measure startup improvement
time ./target/myapp   # vs: time java -jar target/myapp.jar
```

## Few-Shot Examples

### Example 1: Configuration Review — OSIV and DDL Anti-Pattern

**Input**: "Our app is slow in production and we're seeing random DB connection timeouts"

**Diagnosis**:
```yaml
# Found in application.yml — two critical misconfigurations
spring:
  jpa:
    open-in-view: true    # PROBLEM 1: holds DB connection for entire HTTP request
    hibernate:
      ddl-auto: update    # PROBLEM 2: modifies schema on startup — dangerous in prod
```

**Fix**:
```yaml
spring:
  jpa:
    open-in-view: false   # Release DB connection when service layer returns
    hibernate:
      ddl-auto: validate  # Only validate schema matches — never modify
  datasource:
    hikari:
      maximum-pool-size: 20   # Size based on: DB max_connections / (instances * avg_hold_time)
      leak-detection-threshold: 10000  # Alert on connections held >10s
```

**Result**: Connection pool exhaustion eliminated. Timeouts resolved.

---

### Example 2: Spring Security — Role-Based with Method Security

**Input**: "We need admins to manage all orders, users to see only their own"

```java
// SecurityConfig.java
@Configuration
@EnableMethodSecurity
public class SecurityConfig {
    @Bean
    public SecurityFilterChain chain(HttpSecurity http) throws Exception {
        return http
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/v1/orders/**").authenticated()
                .anyRequest().authenticated())
            .build();
    }
}

// OrderService.java — method-level authorization
@Service
public class OrderService {

    private final OrderRepository repository;

    // ADMIN can access any order; USER can access only their own
    @PreAuthorize("hasRole('ADMIN') or @orderSecurity.isOwner(#orderId, authentication)")
    public Order findById(Long orderId) {
        return repository.findById(orderId)
            .orElseThrow(() -> new OrderNotFoundException(orderId));
    }
}

// OrderSecurityEvaluator.java — SpEL bean
@Component("orderSecurity")
public class OrderSecurityEvaluator {
    private final OrderRepository repository;

    public boolean isOwner(Long orderId, Authentication authentication) {
        return repository.existsByIdAndUserEmail(orderId, authentication.getName());
    }
}

// Test
@WebMvcTest(OrderController.class)
class OrderControllerTest {
    @Test
    @WithMockUser(username = "user@example.com", roles = "USER")
    void getUserCannotAccessOtherUserOrder() throws Exception {
        mockMvc.perform(get("/api/v1/orders/999"))
            .andExpect(status().isForbidden());
    }
}
```

---

### Example 3: JPA N+1 Resolution with Entity Graph

**Input**: "Loading 50 orders takes 4 seconds — we see 153 queries in the log"

**Diagnosis**:
```
Hibernate: select * from orders o where o.user_id = ?
Hibernate: select * from users u where u.id = ?   -- x50
Hibernate: select * from order_items oi where oi.order_id = ? -- x50
Hibernate: select * from products p where p.id = ? -- x50 (per item average 1)
Total: 1 + 50 + 50 + 52 = 153 queries
```

**Fix**:
```java
// Add entity graph to Order entity
@NamedEntityGraph(
    name = "Order.withUserAndItems",
    attributeNodes = {
        @NamedAttributeNode("user"),
        @NamedAttributeNode(value = "items", subgraph = "items-products")
    },
    subgraphs = @NamedSubgraph(
        name = "items-products",
        attributeNodes = @NamedAttributeNode("product")
    )
)
@Entity
public class Order { ... }

// Apply in repository
@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    @EntityGraph("Order.withUserAndItems")
    List<Order> findByUserId(Long userId);
}

// For bulk fetches, batch fetching via properties
# application.yml
spring:
  jpa:
    properties:
      hibernate:
        default_batch_fetch_size: 50  # Fetches collections in batches of 50
```

**Result**: 153 queries → 3 queries. Load time: 4s → 85ms.
