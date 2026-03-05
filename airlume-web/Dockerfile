FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY . .
RUN mvn clean package -DskipTests

FROM eclipse-temurin:17-jre
WORKDIR /app
RUN apt-get update && apt-get install -y wget unzip && \
    wget -q https://download.eclipse.org/ee4j/glassfish/glassfish-7.0.0.zip && \
    unzip -q glassfish-7.0.0.zip -d /opt && \
    rm glassfish-7.0.0.zip
COPY --from=build /app/target/airlume-web.war \
     /opt/glassfish7/glassfish/domains/domain1/autodeploy/
EXPOSE 8080
CMD ["/opt/glassfish7/bin/asadmin", "start-domain", "--verbose"]