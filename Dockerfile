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

# MaxRAMPercentage: the JVM reads the memory limit of the container and uses at most
# 75% of it for the heap. Without it the JVM guesses based on the HOST RAM, which is a
# classic source of "the container was killed by the OOM killer" in production.
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "-jar", "/app/app.jar"]
