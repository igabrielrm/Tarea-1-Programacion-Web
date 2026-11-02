# syntax=docker/dockerfile:1
# =====================================================================================
#  PRODUCTS API - PRODUCTION IMAGE
#
#  Multi-stage build: the first stage compiles the project with Maven and a full JDK,
#  the second stage keeps ONLY the JRE and the executable .jar. The final image does
#  not contain Maven, the source code or the JDK, so it is much smaller and safer.
#
#  Build:  docker build -t products-api:1.0.0 .
#  Run:    docker run -p 8080:8080 products-api:1.0.0
# =====================================================================================


# -------------------------------------------------------------------------------------
#  STAGE 1 - BUILD  (discarded at the end, it only leaves the .jar behind)
# -------------------------------------------------------------------------------------
FROM maven:3.9.9-eclipse-temurin-21 AS build

WORKDIR /build

# Copy ONLY the pom.xml first. Docker caches each instruction in a layer, so as long as
# the dependencies do not change this layer is reused and Maven does not download them
# again on every code edit. Copying the whole project here would invalidate the cache
# on every single change and turn a 5 second build into a 2 minute build.
COPY pom.xml .
RUN mvn -B -q dependency:go-offline

# Now copy the source code and package the application. "-DskipTests" is intentional:
# the tests already run in the CI pipeline (GitHub Actions) and in "mvn test" locally,
# so the image build stays fast and independent from the database.
COPY src ./src
RUN mvn -B -q clean package -DskipTests


# -------------------------------------------------------------------------------------
#  STAGE 2 - RUNTIME  (this is the only stage that survives)
# -------------------------------------------------------------------------------------
FROM eclipse-temurin:21-jre-alpine

# Unprivileged user. If the application is ever compromised, the attacker cannot write
# to the filesystem of the container nor run as root.
RUN addgroup -S spring && adduser -S spring -G spring

WORKDIR /app
USER spring

# Copy only the artifact produced in the build stage. "java -jar" needs nothing else.
# The name comes from pom.xml: artifactId + version.
COPY --from=build /build/target/products-api-1.0.0.jar app.jar

# Documentation only: it does not publish the port by itself, "docker run -p" does.
EXPOSE 8080

# -------------------------------------------------------------------------------------
#  RUNTIME MEMORY  (the -Xms / -Xmx flags of the JVM)
#
#  The target machine is a t3.micro: 1 GB of RAM for the WHOLE instance, which has to
#  feed the operating system, PostgreSQL and the JVM at the same time.
#
#  JAVA_OPTS is defined here with a sane default so the image is self-sufficient, and
#  docker-compose.yml overrides it with the value used in production.
#
#    -Xms128m = initial heap. Reserving 128 MB at startup stops the JVM from growing the
#               heap step by step under the first requests (that growth is what makes a
#               small instance look "frozen" during a demo).
#    -Xmx384m = maximum heap. The JVM is never allowed to reserve more than 384 MB of
#               heap, so it can never ask the kernel for memory that is not there and
#               get itself killed by the OOM killer.
#
#  Why NOT -XX:MaxRAMPercentage (used in the previous version)? Because it depends on a
#  memory limit declared for the container. With no limit it reads the RAM of the HOST
#  and, at 75 %, would reserve 768 MB of heap on a 1 GB instance, leaving almost nothing
#  for PostgreSQL and the kernel. An explicit -Xmx is deterministic and does not change
#  depending on how the container was started.
# -------------------------------------------------------------------------------------
ENV JAVA_OPTS="-Xms128m -Xmx384m"

# Shell form with "exec" instead of the JSON array form, on purpose:
#   - the JSON array form does NOT expand variables, so $JAVA_OPTS would be ignored;
#   - "exec" replaces the shell with the JVM, so java becomes PID 1 and receives the
#     SIGTERM sent by "docker compose down", which allows a graceful shutdown.
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]
