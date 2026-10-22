# Products REST API — Spring Boot + PostgreSQL

Complete CRUD (GET, POST, PUT, DELETE) over the **Product** entity (`id`, `name`, `description`, `price`),
organised in layers (Entity → Repository → Service → Controller), with global CORS for a Vanilla JS frontend.

**Stack:** Java 21 · Spring Boot 3.5.16 · Spring Data JPA (Hibernate) · PostgreSQL 16 · Maven

---

## 1. Project structure

```
products-api/
├── pom.xml                                  Dependencies and the Spring Boot version
├── docker-compose.yml                       Brings PostgreSQL up without installing it
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
└── frontend-example/                        Demo Vanilla JS frontend
    ├── index.html
    └── js/{api.js, app.js}
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

**Option B — Docker (if you do not want to touch your installation):**

Since your local PostgreSQL already takes port 5432, run the container on another port:

```bash
POSTGRES_PORT=5433 docker compose up -d
```

And in `application.properties`:

```properties
spring.datasource.url=jdbc:postgresql://localhost:5433/products_db
```

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

Open `frontend-example/index.html` with the **Live Server** extension of VS Code (port 5500).
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

### 5.3 Search — `GET /api/products/search?q=term`

The endpoint uses a derived query: `findByNameContainingIgnoreCaseOrderByNameAsc(term)`, which
Spring Data turns into `SELECT * FROM products WHERE LOWER(name) LIKE LOWER('%term%') ORDER BY name ASC`.

The frontend applies a **4 second debounce** (see `frontend-example/js/app.js`) so the request is
only sent once the user stops typing.

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
mvn spring-boot:run        # Start the API
mvn test                   # Run the 24 automated tests
mvn clean package          # Build target/products-api-1.0.0.jar
java -jar target/products-api-1.0.0.jar
docker compose up -d       # Start PostgreSQL
docker compose down        # Stop PostgreSQL (keeping the data)
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
- **Debounced search** so typing does not flood the backend with requests.

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

### 9.4 The debounce, measured in the browser

Typing `lap` (3 keystrokes) in the search box and watching the Network tab:

```
keystrokes typed ............ 3
requests fired immediately .. 0     <- the timer was still pending
requests fired after 4 s .... 1     GET /api/products/search?q=lap -> 200
console errors .............. 0
```

The table was filtered down to the single matching product.

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
