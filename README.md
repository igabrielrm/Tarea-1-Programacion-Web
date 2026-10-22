# Products REST API — Spring Boot + PostgreSQL

Complete CRUD (GET, POST, PUT, DELETE) over the **Product** entity (`id`, `name`, `description`, `price`),
organised in layers (Entity → Repository → Service → Controller), with global CORS for a Vanilla JS frontend.

**Stack:** Java 21 · Spring Boot 3.5.16 · Spring Data JPA (Hibernate) · PostgreSQL 16 · Maven · Docker · GitHub Actions

---

## 1. Project structure

```
products-api/
├── pom.xml                                  Dependencies and the Spring Boot version
├── Dockerfile                               Multi-stage image (build + runtime)
├── .dockerignore                            What never enters the build context
├── docker-compose.yml                       PostgreSQL + API as two containers
├── .github/workflows/ci-cd.yml              GitHub Actions pipeline
├── http/products-api.http                   Test requests (IntelliJ / VS Code)
│
├── src/main/java/com/tienda/products/
│   ├── ProductsApiApplication.java          @SpringBootApplication -> entry point
│   ├── entity/
│   │   └── Product.java                     @Entity -> maps the "products" table
│   ├── repository/
│   │   └── ProductRepository.java           @Repository -> Spring Data generates the SQL
│   ├── service/
│   │   ├── ProductService.java              Contract (interface) of the business layer
│   │   └── impl/ProductServiceImpl.java     @Service -> business logic + @Transactional
│   ├── controller/
│   │   └── ProductController.java           @RestController -> HTTP endpoints
│   ├── dto/
│   │   ├── ProductRequest.java              Input (JSON) with validations
│   │   ├── ProductResponse.java             Output (JSON)
│   │   └── ApiError.java                    Standard error shape
│   ├── exception/
│   │   ├── ResourceNotFoundException.java   404
│   │   ├── DuplicateResourceException.java  409
│   │   └── GlobalExceptionHandler.java      @RestControllerAdvice -> errors in JSON
│   └── config/
│       └── CorsConfig.java                  @Configuration -> global CORS
│
├── src/main/resources/
│   ├── application.properties               Configuration (DB, JPA, CORS, logs)
│   └── data.sql                             Sample data (idempotent)
│
├── src/test/java/com/tienda/products/
│   ├── service/impl/ProductServiceImplTest.java   9 unit tests (Mockito, no database)
│   └── controller/ProductControllerTest.java      15 web tests (MockMvc, no server)
│
└── frontend/                                Demo Vanilla JS frontend (ES modules)
    ├── index.html                           Structure only, loads src/main.js + Tailwind CDN
    └── src/
        ├── api/products.js                  HTTP layer: the only file that calls fetch()
        ├── ui/productGrid.js                View layer: the only file that touches the DOM
        └── main.js                          Wiring, state (edit mode) and the instant filter
```

---

## 2. Getting started

### 2.1 Database

> ⚠️ **This machine already has PostgreSQL 18 installed and running** (service
> `postgresql-x64-18`, port 5432, with `scram-sha-256` authentication).
> You have two options, **use only one**:

**Option A — Your local PostgreSQL (recommended):**

```sql
CREATE DATABASE products_db;
```

And in `application.properties` put **your real password**:

```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/products_db
spring.datasource.username=postgres
spring.datasource.password=YOUR_REAL_PASSWORD
```

**Option B — Docker, database only (API runs locally with Maven):**

Since your local PostgreSQL already takes port 5432, the container is published on 5433:

```bash
docker compose up -d postgres
```

And in `application.properties`:

```properties
spring.datasource.url=jdbc:postgresql://localhost:5433/products_db
```

**Option C — Docker, database + API together (nothing installed locally):**

```bash
docker compose up -d --build
```

This builds the image from the `Dockerfile` and starts both containers. The API is on
`http://localhost:8080`, PostgreSQL on `localhost:5433`, and the API receives its
connection settings as environment variables (`SPRING_DATASOURCE_URL` → host
`postgres`, the name of the service), so `application.properties` does not need to be
edited at all. Details in section 10.

> The `products` table **is created automatically** when the API starts
> (`spring.jpa.hibernate.ddl-auto=update`), together with 3 sample products (`data.sql`).
> You do not have to create anything by hand.

### 2.2 Running the API

```bash
mvn spring-boot:run
```

Or from IntelliJ IDEA: right click on `ProductsApiApplication` → *Run*.

> **Windows note:** if Maven complains about `JAVA_HOME`, set it with:
> `setx JAVA_HOME "C:\Program Files\Java\jdk-21.0.12.1"` and restart the terminal.

### 2.3 Running the frontend

Serve the `frontend/` folder over HTTP — for example with the **Live Server** extension
of VS Code (port 5500) — and open `http://localhost:5500`.

> ⚠️ **Do not open `frontend/index.html` by double-clicking it.** The page uses ES
> modules, and browsers refuse to load modules from a `file://` URL (CORS error). It
> has to be served by a web server. Any static server works:
> `python -m http.server 5500 --directory frontend`

If you use another port, add it in `application.properties` → `app.cors.allowed-origins`.

### 2.4 Checking it

```bash
curl http://localhost:8080/api/products
```

---

## 3. The endpoints

| Method | Route                   | Description              | Response |
|--------|-------------------------|--------------------------|----------|
| GET    | `/api/products`         | List all                 | `200` + JSON array |
| GET    | `/api/products/search?q=` | Search by name         | `200` + JSON array |
| GET    | `/api/products/{id}`    | Find one                 | `200` + JSON object |
| POST   | `/api/products`         | Create                   | `201` + created object |
| PUT    | `/api/products/{id}`    | Update                   | `200` + updated object |
| DELETE | `/api/products/{id}`    | Delete                   | `204` no body |

`POST` example:

```bash
curl -X POST http://localhost:8080/api/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Monitor 27 inches","description":"QHD 165Hz monitor","price":349.00}'
```

---

## 4. The main Spring annotations

| Annotation | Where | What it does |
|---|---|---|
| `@SpringBootApplication` | Main class | Boots the app: scans components, creates the context and the web server. |
| `@Entity` | `Product` | Turns the class into a JPA entity mapped to a PostgreSQL table. |
| `@Id` | `Product.id` | Marks the attribute as the Primary Key. |
| `@GeneratedValue` | `Product.id` | Delegates id generation to the database (a PostgreSQL `bigserial` sequence). |
| `@Column` | `Product` | Adjusts the name, length, nullability, precision and scale of the column. |
| `@Repository` | `ProductRepository` | Marks the interface as the data access component. |
| `@Service` | `ProductServiceImpl` | Marks the class as a business component. Spring registers it as a bean. |
| `@Transactional` | Service | Groups the operations into a transaction: if anything fails, it ROLLBACKs. |
| `@RestController` | `ProductController` | `@Controller` + `@ResponseBody`: the returned value is serialised to JSON. |
| `@RequestMapping` | Controller | Common prefix of the routes (`/api/products`). |
| `@GetMapping` / `@PostMapping` / `@PutMapping` / `@DeleteMapping` | Controller | Binds each method to its HTTP verb. |
| `@PathVariable` | Controller | Extracts a path variable (`{id}`) as a method parameter. |
| `@RequestParam` | Controller | Reads a query string parameter (`?q=term`). |
| `@RequestBody` | Controller | Converts the JSON request body into a Java object. |
| `@Valid` | Controller | Activates the Bean Validation of the received DTO. |
| `@Autowired` | Service / Controller | Dependency injection: Spring finds the bean and hands it to the constructor. |
| `@Configuration` | `CorsConfig` | Marks the class as a global Spring configuration. |
| `@RestControllerAdvice` | `GlobalExceptionHandler` | Catches exceptions globally and returns them as JSON. |
| `@ExceptionHandler` | `GlobalExceptionHandler` | Declares which exception a method handles and the status it answers with. |
| `@Value` | `CorsConfig` | Injects a value from `application.properties`. |

---

## 5. The data flow, step by step

### 5.1 Read — `GET /api/products`

```
1. BROWSER          The JavaScript calls fetch("http://localhost:8080/api/products")
        |
        |  (For POST/PUT/DELETE the browser first sends an extra OPTIONS request,
        |   the so-called "preflight": the backend answers 200 with the CORS headers
        |   and only then the browser lets the real request through.)
        v
2. TOMCAT / SPRING MVC  Receives the HTTP request on port 8080.
                        Spring MVC looks for the method of the Controller that matches
                        that URL + HTTP verb (GET /api/products).
                        |
                        v
3. PRODUCTCONTROLLER   The findAll() method runs.
                        It returns a ResponseEntity with the list and the status 200.
                        |
                        v
4. PRODUCTSERVICE      findAll() — @Transactional(readOnly = true).
                        It opens a read-only transaction and calls the Repository.
                        |
                        v
5. PRODUCTREPOSITORY   findAllByOrderByNameAsc()
                        Spring Data detects that there is NO hand-written implementation
                        and generates a proxy that turns the method name into SQL:
                            SELECT * FROM products ORDER BY name ASC
                        |
                        v
6. HIBERNATE + JDBC     Translates the Java entity into SQL, takes a free connection
                        from the HikariCP pool and runs the query on PostgreSQL.
                        |
                        v
7. POSTGRESQL          Runs the SELECT on the "products" table, returns the rows,
                        serialises them and sends them back.
                        |
                        v
8. BACK                PostgreSQL -> JDBC -> Hibernate (entities) ->
                        Service (DTOs) -> Controller (JSON) -> HTTP 200 response.
                        Jackson serialises the JSON and the browser receives it.
```

### 5.2 Write — `POST /api/products`

```
1. BROWSER     fetch(url, {method:'POST', body: JSON.stringify({...})})
                with the "Content-Type: application/json" header
        v
2. SPRING MVC  Finds the create() method (POST /api/products)
        v
3. CONTROLLER  @RequestBody: Jackson turns the JSON into a ProductRequest
               @Valid: Bean Validation checks @NotBlank, @NotNull,
                       @DecimalMin, @Digits
               -> if something fails: MethodArgumentNotValidException -> 400
                  (the database is never touched)
        v
4. SERVICE     create() — @Transactional
               Checks that no other product already uses that name
               -> if it does: DuplicateResourceException -> 409
        v
5. REPOSITORY  save(product) -> Spring Data + Hibernate generate:
                       INSERT INTO products (name, description, price)
                       VALUES (?, ?, ?)
                       RETURNING id
               The id is generated by PostgreSQL (bigserial) and Hibernate reads it back.
        v
6. POSTGRESQL  Runs the INSERT inside the transaction and returns the id.
               If anything fails, Spring ROLLBACKs and nothing is left half-done.
        v
7. RESPONSE    The Service returns the DTO with the generated id,
               the Controller answers 201 Created with the JSON of the created product.
```

### 5.3 Search — two different things share the name

There are **two** search implementations in this project, and they are not the same:

| | Server-side endpoint | Client-side filter (what the UI uses) |
|---|---|---|
| Name | `GET /api/products/search?q=` | `filterProducts()` in `frontend/src/main.js` |
| How | `findByNameContainingIgnoreCaseOrderByNameAsc(term)` → `SELECT ... WHERE LOWER(name) LIKE LOWER('%term%')` | `Array.prototype.filter()` + `String.prototype.includes()` |
| Network | one request per call | **zero** requests |
| When it is the right choice | thousands of rows, pagination | the whole list already fits in memory |

The UI loads the full list **once** with `GET /api/products`, keeps it in the
`allProducts` array and filters that array on every keystroke. That is why the grid
updates instantly and the Network tab stays silent while typing. The endpoint is kept
because it is the only viable option the day the list has to be paginated.

The **4 second debounce** described in earlier versions of this README was removed on
purpose: a debounce exists to protect the server from a request per keystroke, and
there is no request anymore.

### 5.4 Errors

```
The Service throws an exception
        v
@ExceptionHandler in GlobalExceptionHandler catches it
        v
An ApiError is built (timestamp, status, error, message, path)
        v
Spring serialises it to JSON and returns it with the matching HTTP status
(404 not found / 409 conflict / 400 bad request / 500 internal server error)
```

### 5.5 The complete error mapping

Every error leaves the API as JSON with the same `ApiError` shape — never as the
default HTML error page of Tomcat.

| Situation | Exception thrown by Spring | Status | Message |
|---|---|---|---|
| The product does not exist | `ResourceNotFoundException` (ours) | `404` | `Product not found with id: 99` |
| The name is already taken | `DuplicateResourceException` (ours) | `409` | `A product with the name already exists: ...` |
| A field breaks the validation | `MethodArgumentNotValidException` | `400` | `name: name is required; price: price cannot be negative` |
| The body is not valid JSON | `HttpMessageNotReadableException` | `400` | `The request body is not valid JSON` |
| The id is not a number (`/abc`) | `MethodArgumentTypeMismatchException` | `400` | `Parameter 'id' has an invalid value: abc` |
| A required query parameter is missing | `MissingServletRequestParameterException` | `400` | the message of Spring |
| The route matches no controller | `NoResourceFoundException` | `404` | `The requested endpoint does not exist: /api/...` |
| The verb is not supported by the route | `HttpRequestMethodNotSupportedException` | `405` | the message of Spring |
| Any other unexpected error | `Exception` | `500` | `An unexpected error occurred on the server` (the real one goes to the log) |

Example of an error body:

```json
{
  "timestamp": "2026-10-21T10:27:45.8575992",
  "status": 404,
  "error": "Not Found",
  "message": "Product not found with id: 999",
  "path": "/api/products/999"
}
```

---

## 6. CORS configuration

Everything lives in `config/CorsConfig.java` + the `app.cors.allowed-origins` property.

```java
registry.addMapping("/api/**")
        .allowedOrigins(allowedOrigins)
        .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
        .allowedHeaders("*")
        .allowCredentials(true)
        .maxAge(3600);
```

> **If the project used Spring Security**, the correct approach would be to define a
> `CorsConfigurationSource` bean instead of overriding `addCorsMappings`:
>
> ```java
> @Bean
> public CorsConfigurationSource corsConfigurationSource() {
>     CorsConfiguration config = new CorsConfiguration();
>     config.setAllowedOrigins(List.of("http://localhost:5500"));
>     config.setAllowedMethods(List.of("GET","POST","PUT","DELETE","OPTIONS"));
>     UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
>     source.registerCorsConfiguration("/api/**", config);
>     return source;
> }
> ```

---

## 7. Useful commands

```bash
mvn spring-boot:run              # Start the API locally
mvn test                         # Run the 24 automated tests
mvn clean package                # Build target/products-api-1.0.0.jar
java -jar target/products-api-1.0.0.jar

docker build -t products-api:1.0.0 .    # Build the image only
docker compose up -d --build     # Start PostgreSQL + the API
docker compose logs -f api       # Follow the API logs
docker compose ps                # See container status / healthchecks
docker compose down              # Stop both (keeping the data)
docker compose down -v           # Stop both and delete the volume
```

---

## 8. Best practices included

- **Constructor injection** instead of field `@Autowired`: immutable and testable code.
- **DTOs** so the entity is never exposed and the client cannot send the `id`.
- **Bean Validation** to reject invalid data before it reaches the database.
- **`BigDecimal`** for the price (`double` has rounding errors).
- **`Optional`** in the Repository, forcing the "not found" case to be handled.
- **`@Transactional`** with `readOnly = true` on the reads (faster, it does not lock rows).
- **Global exception handler** so every error leaves as JSON.
- **Automated tests with Mockito and MockMvc** that need neither a database nor a server.
- **Instant client-side filtering** so typing never generates a single HTTP request.
- **Modular frontend** (`api` / `ui` / `main`) with ES modules, so no file mixes HTTP,
  DOM and orchestration.
- **Tailwind CSS with a pinned CDN** and a strictly responsive 1 / 2 / 3 column grid.
- **Multi-stage Dockerfile** and a compose stack with healthchecks.
- **CI pipeline** that blocks the build when a test fails.

---

## 9. Proof that it works

All of the following was executed against a **real PostgreSQL 16** (Docker) and a **real
browser**, not just described.

### 9.1 The build

```
[INFO] Tests run: 15, Failures: 0, Errors: 0, Skipped: 0  -- ProductControllerTest
[INFO] Tests run:  9, Failures: 0, Errors: 0, Skipped: 0  -- ProductServiceImplTest
[INFO] Tests run: 24, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
```

### 9.2 The status code matrix

| Request | Status |
|---|---|
| `GET /api/products` | `200` |
| `GET /api/products/search?q=laptop` | `200` |
| `GET /api/products/1` | `200` |
| `GET /api/products/9999` | `404` |
| `GET /api/products/abc` | `400` |
| `GET /api/totally-unknown` | `404` |
| `POST /api/products` (valid) | `201` |
| `POST /api/products` (invalid fields) | `400` |
| `POST /api/products` (broken JSON) | `400` |
| `POST /api/products` (duplicate name) | `409` |
| `PUT /api/products/1` | `200` |
| `DELETE /api/products/1` | `204` |
| `DELETE /api/products/1` (again) | `404` |

### 9.3 The CORS preflight

```
HTTP/1.1 200
Access-Control-Allow-Origin: http://localhost:5500
Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS
Access-Control-Allow-Headers: content-type
Access-Control-Allow-Credentials: true
Access-Control-Max-Age: 3600
```

### 9.4 The instant search, measured in the browser

Typing `l`, `la`, `lap`, `zzz` and then clearing the box. The DOM was read in the
**same synchronous tick** as the `input` event, with no `await` and no `setTimeout`:

| Typed | Cards in the DOM | Counter | Empty state | API requests |
|---|---|---|---|---|
| `l` | 3 | 3 | hidden | 2 |
| `la` | 1 | 1 | hidden | 2 |
| `lap` | 1 | 1 | hidden | 2 |
| `zzz` | 0 | 0 | visible | 2 |
| *(cleared)* | 3 | 3 | hidden | 2 |

The API request count never moved: **zero requests per keystroke**. The two entries
were measured once before typing and are the module file (`/src/api/products.js`) plus
the single initial `GET /api/products`. Console errors: 0.

### 9.4.1 The responsive grid, measured

The whole page was loaded in iframes of fixed width and the computed
`grid-template-columns` of `#productGrid` was read:

| Viewport | Columns | Tailwind class responsible |
|---|---|---|
| `375 px` | 1 | `grid-cols-1` |
| `800 px` | 2 | `sm:grid-cols-2` |
| `1440 px` | 3 | `lg:grid-cols-3` |

### 9.4.2 The CRUD still works through the cards

```
Edit button (event delegation) -> form filled: "Editing product #1", id=1, €1,299.90
Cancel                        -> back to "New product"
Create form                   -> 4 cards, "Product created successfully", €12.50
Delete button + confirm       -> 3 cards, "Product deleted successfully"
```

### 9.5 The SQL that Hibernate really generates

```sql
-- GET /api/products
select p1_0.id, p1_0.description, p1_0.name, p1_0.price
from products p1_0 order by p1_0.name;

-- GET /api/products/search?q=lap
select p1_0.id, p1_0.description, p1_0.name, p1_0.price
from products p1_0
where upper(p1_0.name) like upper(?) escape '\' order by p1_0.name;
-- binding parameter (1:VARCHAR) <- [%lap%]

-- POST /api/products
insert into products (description, name, price) values (?, ?, ?);
-- binding parameter (1:STRING)  <- [QHD 165 Hz panel]
-- binding parameter (2:STRING)  <- [Monitor 27 inches]
-- binding parameter (3:NUMERIC) <- [349.00]
```

### 9.6 The table created in PostgreSQL

```sql
create table products (
    id          bigint generated by default as identity,
    description varchar(500),
    name        varchar(120) not null,
    price       numeric(10,2) not null,
    primary key (id)
);
```

### 9.7 The container stack, measured

`docker build` and `docker compose up -d --build` were actually executed:

```
#12 [build 4/6] RUN mvn -B -q dependency:go-offline          DONE 43.7s
#16 [build 6/6] RUN mvn -B -q clean package -DskipTests      DONE 12.9s
#18 exporting to image                                       DONE  5.6s

NAME           STATUS                    PORTS
products-api   Up 31 seconds (healthy)   0.0.0.0:8080->8080/tcp
products-db    Up 37 seconds (healthy)   0.0.0.0:5433->5432/tcp
```

The two healthchecks turned `healthy`, which proves that the API reached PostgreSQL
through the internal DNS name `postgres` and not through `localhost`.

### 9.8 The refactored frontend, measured in a real browser

After moving the JavaScript into `frontend/src/`, every module was requested over HTTP
and the whole CRUD was exercised again from the browser:

```
GET /                       200
GET /src/main.js            200
GET /src/api/products.js    200
GET /src/ui/productGrid.js  200

cards rendered .............. 3     (counter = 3)
Edit button (event delegation) filled the form with id=1, price=1299.9
POST via the form ........... card count 4, message "Product created successfully"
DELETE via the delegated button + confirm ... card count back to 3
console errors .............. 0
```

---

## 10. Docker

### 10.1 The Dockerfile (multi-stage)

```dockerfile
FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /build
COPY pom.xml .
RUN mvn -B -q dependency:go-offline
COPY src ./src
RUN mvn -B -q clean package -DskipTests

FROM eclipse-temurin:21-jre-alpine
RUN addgroup -S spring && adduser -S spring -G spring
WORKDIR /app
USER spring
COPY --from=build /build/target/products-api-1.0.0.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "-jar", "/app/app.jar"]
```

Three optimisations worth explaining in the defence:

| Decision | Why |
|---|---|
| Two stages | The final image has **no Maven, no JDK and no source code**, only the JRE and the `.jar`. It goes from ~600 MB to ~180 MB. |
| `COPY pom.xml` before `COPY src` | Docker caches layers. Dependencies are downloaded again **only** when `pom.xml` changes, not on every code edit. |
| Non-root user (`USER spring`) | If the process is compromised it cannot write to the filesystem or run as root. |
| `-XX:MaxRAMPercentage=75.0` | The JVM sizes its heap from the **container** limit instead of the host RAM, which avoids the OOM killer. |

`.dockerignore` keeps `target/`, `.git/`, `frontend/`, the README and the private study
guide out of the build context.

### 10.2 The compose stack

`docker-compose.yml` declares two services and one network:

```
                     products-network (bridge, internal DNS)
   ┌───────────────────────────────┐        ┌──────────────────────────────┐
   │           api                 │        │          postgres            │
   │  products-api:1.0.0           │  TCP   │  postgres:16-alpine          │
   │  :8080  ──────────────────────┼───────>│  :5432                       │
   └───────────────────────────────┘        └──────────────────────────────┘
              │                                          │
        host :8080                                host :5433
                                                    (volume postgres_data)
```

Two details that are easy to get wrong:

1. **The host is `postgres`, not `localhost`.** Inside a container, `localhost` is that
   same container. Docker's internal DNS resolves the *service name* to the IP of the
   other container, so the JDBC URL is `jdbc:postgresql://postgres:5432/products_db`.
2. **`depends_on: condition: service_healthy`.** A plain `depends_on` only waits for the
   container to be *created*, not for PostgreSQL to accept connections. With the
   `pg_isready` healthcheck, the API starts only when the database is really ready.

### 10.3 Why the environment variables work

Spring Boot implements **relaxed binding** for environment variables:

```
SPRING_DATASOURCE_URL       ->  spring.datasource.url
SPRING_DATASOURCE_USERNAME  ->  spring.datasource.username
SPRING_JPA_HIBERNATE_DDL_AUTO ->  spring.jpa.hibernate.ddl-auto
```

Upper case, dots replaced by underscores. That is why the image can be configured
without touching `application.properties` and without rebuilding it.

---

## 11. CI/CD with GitHub Actions

`.github/workflows/ci-cd.yml` runs on every `push` and every `pull_request` targeting
`main` or `dev`:

```
push / pull_request  ──>  job "test"  ──(needs)──>  job "package"
                          checkout                    checkout
                          setup-java 21 + cache       setup-java 21 + cache
                          mvn test                    mvn clean package -DskipTests
                          upload surefire-reports     upload products-api-jar
```

| Concept | Meaning in this project |
|---|---|
| **Workflow** | The YAML file. Here: `CI/CD`. |
| **Event** (`on`) | `push` and `pull_request` filtered by branch. |
| **Job** | `test` and `package`, each on a fresh virtual machine. |
| **Runner** | `ubuntu-latest`, provided by GitHub. |
| **Step** | One command: `uses:` for a reusable action, `run:` for a shell command. |
| **Action** | `actions/checkout@v4`, `actions/setup-java@v4`, `actions/upload-artifact@v4`. |
| **Artifact** | The `.jar` and the test reports, downloadable from the run page. |
| **`needs: test`** | `package` does not start if the tests fail. |

No database service is needed: the service tests mock the repository with Mockito and
the controller tests use `@WebMvcTest` + MockMvc, so they never open a connection.

Why `-DskipTests` in the packaging job is not cheating: `needs: test` already guarantees
that the same commit passed the suite, and running it twice would only waste minutes.

> **Where the "CD" part goes:** a third job would build and push the Docker image to a
> registry and deploy it. It is deliberately left out because it needs credentials and a
> real server; a fake deploy step is worse than an honest gap.

---

## 12. The user interface (Tailwind CSS)

### 12.1 Why the CDN is pinned

```html
<script src="https://cdn.tailwindcss.com/3.4.17"></script>
```

`https://cdn.tailwindcss.com` alone always serves the newest build, so the design could
change between two runs of the same commit. Pinning `3.4.17` makes the page
reproducible. The Play CDN compiles the classes **in the browser**, which is perfect for
a class project and wrong for production: a real deployment pre-compiles Tailwind with
Vite/PostCSS and ships a plain `.css` file.

### 12.2 The strict grid

```html
<section id="productGrid"
         class="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
```

| Class | What it does | Breakpoint |
|---|---|---|
| `grid` | Turns the container into a CSS grid (`display: grid`). | always |
| `grid-cols-1` | `grid-template-columns: repeat(1, minmax(0, 1fr))` — 1 column. | `0 px` |
| `sm:grid-cols-2` | The same with 2 columns. | `≥ 640 px` |
| `lg:grid-cols-3` | The same with 3 columns — the desktop layout. | `≥ 1024 px` |
| `gap-6` | `gap: 1.5rem` between cards, horizontally and vertically. | always |

Tailwind is **mobile first**: the unprefixed class applies to every width, and each
`sm:` / `lg:` variant only overrides it from its breakpoint upwards. That is why the
order is `1 → 2 → 3` and not `3 → 2 → 1`.

`minmax(0, 1fr)` matters: with plain `1fr` a grid item refuses to shrink below its
content (a long product name would blow the column up). `minmax(0, …)` allows it.

### 12.3 The card

```html
<article class="group flex flex-col justify-between rounded-2xl border border-slate-200
                bg-white p-5 shadow-sm transition duration-200
                hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg">
    ...
    <div class="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <span class="text-lg font-bold tracking-tight text-slate-900">€1,299.90</span>
        <button data-action="edit" data-id="1" class="...">Edit</button>
        <button data-action="delete" data-id="1" class="...">Delete</button>
    </div>
</article>
```

`flex flex-col justify-between` is what makes every card the same height with the price
pinned to the bottom, even when one description is two lines longer than another: the
grid stretches all items of a row, and `justify-between` pushes the footer down.

`line-clamp-3` truncates a long description with an ellipsis after three lines.

### 12.4 The instant filter

```js
function filterProducts(products, term) {
    const needle = term.trim().toLowerCase();
    if (needle === '') return products;                    // empty search -> everything
    return products.filter((p) => p.name.toLowerCase().includes(needle));
}

searchInput.addEventListener('input', () => handlers.onSearch(getSearchTerm()));
```

Three decisions behind it:

1. **Client-side, not server-side.** The full list is read once and kept in the
   `allProducts` array. Filtering that array is a few microseconds; a request is tens of
   milliseconds at best. For a few hundred products the network is pure latency.
2. **No debounce.** A debounce delays a *side effect* (the request). With no request
   there is nothing to delay, and adding a timer would only make the UI feel slow.
3. **`filter` returns a new array.** `allProducts` is never mutated, so the next
   keystroke still filters the complete list instead of the previous result.

When the dataset grows past what fits in memory, this design has to change: paginate on
the server and go back to `GET /api/products/search?q=` (which is exactly why that
endpoint still exists).

### 12.5 Why Tailwind instead of a CSS file

The previous version had `src/styles/main.css` with hand-written selectors
(`.card h2`, `td.actions button`, …). Tailwind replaces it because:

- The design lives **next to the markup** it styles, so a class and the element it
  affects are never in two different files.
- Deleting a card deletes its styles, so dead CSS cannot accumulate.
- Responsive behaviour (`sm:`, `lg:`) is a prefix, not a second file with media queries.

The trade-off is a long `class` attribute. That is why the card's class list and the
message colour variants are kept in constants at the top of `ui/productGrid.js`.
