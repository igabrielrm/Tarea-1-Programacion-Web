# AI_RULES.md — Master Instructions for This Repository

> **Status:** binding. These rules apply to every change made in this repository,
> by a human or by an AI agent, from now on.
>
> **Precedence:** if a rule here conflicts with an ad-hoc request, this file wins.
> If a rule here conflicts with an explicit instruction from the repository owner,
> ask for confirmation before breaking it.
>
> **Scope:** the whole `products-api` project (backend, frontend, docs, Git history).

---

## 1. Strict Language Rule

**All source code, variable names, function names, class names, HTML, CSS, file
names, comments inside the code, commit messages, and the `README.md` MUST be
written entirely in ENGLISH. Zero exceptions.**

### Applies to

| Artifact | Required language |
|---|---|
| Java code (classes, methods, fields, constants, local variables) | English |
| JavaScript code (functions, variables, DOM ids, CSS classes) | English |
| HTML attributes, `id`, `class`, `name`, `data-*` | English |
| SQL (table names, column names, constraints, seed data) | English |
| Comments of every kind (`//`, `/* */`, `/** */`, `--`, `#`, `<!-- -->`) | English |
| HTTP endpoints and JSON field names | English |
| Commit messages and branch names | English |
| `README.md` and any committed documentation | English |
| `application.properties` keys and inline comments | English |
| Log messages and user-facing API error messages | English |

### Explicitly out of scope (may stay in Spanish)

- `guia_estudio_personal.md` — private study notes, ignored by Git.
- Chat conversation with the repository owner (see Rule 2).

### Verification before every commit

- No Spanish identifiers: `producto`, `precio`, `descripcion`, `nombre`, `buscar`,
  `guardar`, `eliminar`, `actualizar`, `crear`, `mensaje`, `nuevo`, `peticion`, ...
- No accented characters in identifiers. Accents inside English comments are
  acceptable only when quoting Spanish data (e.g. explaining UTF-8 handling of `ñ`).
- Every class, method and field has a short direct comment explaining **what it does
  and why it is needed**, and that comment is in English.

---

## 2. Tutor Mode Rule

**When chatting with the repository owner, ALWAYS respond in SPANISH. Explain
concepts clearly and concisely.**

### Applies to

- Every chat reply, including progress updates, summaries and error explanations.
- Explanations of *why* a change was made, not just *what* changed.

### Does NOT apply to

- Code, comments, identifiers, commit messages, `README.md` (Rule 1 governs those).
- `guia_estudio_personal.md`, which is already Spanish by design.

### Style

- Direct and didactic: state the problem, the decision, and the reason.
- When a bug is found, say what it was, how it was detected, and how it was fixed.
- Prefer concrete file paths and short code snippets over abstractions.
- Do not pad the answer: no filler, no restating the question.

---

## 3. Study Guide Rule

**Every time a new feature, library, or piece of complex logic is added, the file
`guia_estudio_personal.md` MUST be updated automatically. Add a new section
explaining the new concepts implemented.**

### Rules for the update

1. `guia_estudio_personal.md` stays in **Spanish** and stays **ignored by Git**
   (see `.gitignore`). Never commit it, never translate it to English.
2. Add a **new numbered section** at the end, continuing the existing numbering
   (the guide currently ends at section 11, so the next new topic is `12`).
   Do not renumber or rewrite existing sections.
3. Each new section must follow the guide's existing didactic format:
   - `### 🧠 ¿Qué es...?` — the concept in plain words.
   - `### 🔍 En mi proyecto` — the exact file and line where it lives, so it can
     be pointed at during an oral defense.
   - `### ❓ Si te preguntan...` — the short, exam-ready answer.
4. Every new section must explain **why** the concept exists, not only how to use it.
5. If the change adds a library or a version, document the version and the reason
   for choosing it.
6. If the change fixes a bug, add it to section 9 (exam questions) as a
   "did you find a bug?" answer, describing the symptom, the cause and the fix.

### Definition of "new feature / library / complex logic"

Includes, but is not limited to: a new endpoint, a new dependency in `pom.xml`,
a new validation rule, a new error handler, a new frontend module, a new Docker
service, a new build step, a non-trivial algorithm (debounce, pagination, caching).

A typo fix or a pure rename does **not** require a new section, but a rename that
changes a concept (e.g. `Producto` → `Product`) should be mentioned if it affects
how the project is explained.

---

## 4. Modular Code Rule

**JavaScript code must never live in a monolithic file. It must be separated by
responsibility inside a `src/` folder.**

### Required layout

```text
src/
├── api/          # HTTP layer ONLY: fetch calls, URLs, headers, error mapping
├── ui/           # View layer ONLY: DOM queries, rendering, event binding
├── main.js       # Entry point ONLY: wires api + ui together, app bootstrap
└── styles/       # CSS, split by component or concern
```

### Hard constraints

1. **`src/api/*`** — the only place where `fetch` may appear. No DOM access
   (`document`, `window`, `localStorage`) is allowed here.
2. **`src/ui/*`** — may touch the DOM freely, but must never call `fetch` directly.
   It receives data as arguments and returns/paints it.
3. **`src/main.js`** — contains no business logic and no `fetch`. It only imports
   the other modules, subscribes events, and starts the app.
4. One file = one responsibility. If a file exceeds roughly 200 lines or mixes two
   of the concerns above, split it.
5. Use ES modules (`export` / `import`) instead of global functions. Avoid relying
   on globals shared between `<script>` tags, and avoid name collisions by prefixing
   event handlers (`handleXxx`) vs. api functions.
6. HTML loads a single entry point:
   `<script type="module" src="src/main.js"></script>`

### Current layout (compliant as of the last refactor)

```text
frontend/
├── index.html                  # structure only, loads src/main.js as a module
└── src/
    ├── api/products.js         # fetch() lives here and nowhere else
    ├── ui/productTable.js      # all DOM access lives here
    ├── main.js                 # wiring + state (edit mode, debounce)
    └── styles/main.css         # presentation
```

The old `frontend-example/` folder was deleted during this refactor. Do not recreate
it and do not add `<script src="js/...">` tags: the page loads exactly one module.

Because ES modules do not create globals, inline `onclick="..."` attributes are
forbidden. Row buttons must carry `data-action` / `data-id` and be handled through
event delegation in `ui/productTable.js`.

---

## 5. Git Flow Rule

**Remind the owner to commit changes to a feature branch. Never commit directly
to `main`.**

### Branch model

```text
main            protected, release-ready only
└── dev         integration branch
    └── feature/<short-slug>   one branch per change
```

### Hard constraints

1. **Never commit or push directly to `main`.**
2. Do not commit directly to `dev` either: `dev` only receives merges.
3. Every change starts on a branch created from `dev`:
   ```bash
   git switch dev
   git pull
   git switch -c feature/<short-slug>
   ```
4. Branch and commit names are in **English** (Rule 1), using Conventional Commits:
   ```text
   feat: add product search endpoint
   fix: return 400 instead of 500 for a non-numeric id
   docs: document the error mapping
   refactor: move frontend modules into src/
   ```
5. Finish with a pull request into `dev`. Merge to `main` only for a release.
6. Never force-push a shared branch (`main`, `dev`).

### When the owner asks for a change while on `main`

Stop and warn before editing: state the current branch, propose the feature branch
command, and only continue if the owner confirms.

---

## 6. Compliance checklist

Run through this before declaring any task done:

- [ ] All code, identifiers, comments and committed docs are in English.
- [ ] Chat reply is in Spanish, didactic and concise.
- [ ] Every new class/method/field has a short "what and why" comment.
- [ ] If a feature, library or complex logic was added → `guia_estudio_personal.md`
      has a new Spanish section.
- [ ] If JavaScript changed → it lives in `src/` split by responsibility
      (api / ui / main), uses ES modules, and `fetch` appears only in `src/api/`.
- [ ] Changes are on a `feature/*` branch, not on `main`.
- [ ] Commit messages follow Conventional Commits, in English.
- [ ] `mvn test` passes and the build is green.

---

## 7. Project context

| Item | Value |
|---|---|
| Repository | `Tarea-1-Programacion-Web` |
| Stack | Java 21 · Spring Boot 3.5.16 · Spring Data JPA · PostgreSQL · Maven |
| Base package | `com.tienda.products` |
| API base path | `/api/products` |
| Backend port | `8080` |
| Frontend demo port | `5500` (Live Server, serves `frontend/`) |
| Docker | `Dockerfile` (multi-stage) + `docker-compose.yml` (postgres + api) |
| Published host ports | `8080` (API) · `5433` (PostgreSQL) |
| CI/CD | `.github/workflows/ci-cd.yml` (GitHub Actions) |
| Private study guide | `guia_estudio_personal.md` (ignored) |

### Reference commands

```bash
mvn spring-boot:run              # start the API locally
mvn test                         # run the test suite
mvn clean package                # build target/products-api-1.0.0.jar
docker build -t products-api:1.0.0 .   # build the image only
docker compose up -d --build     # start PostgreSQL + API
docker compose logs -f api       # follow the API logs
docker compose down -v           # stop and delete the data volume
```

> **Windows note:** set `JAVA_HOME` per-command if the environment is stale:
> `$env:JAVA_HOME="C:\Program Files\Java\jdk-21.0.12.1"`
