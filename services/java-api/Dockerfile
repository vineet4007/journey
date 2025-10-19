FROM eclipse-temurin:17-jre as base
WORKDIR /app
# Expect app.jar to be produced by your build
COPY target/*.jar /app/app.jar
USER 10001
EXPOSE 8080
ENTRYPOINT ["java","-jar","/app/app.jar"]
