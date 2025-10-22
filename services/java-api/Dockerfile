# cat > services/java-api/Dockerfile <<'EOF'
FROM eclipse-temurin:25-jre
WORKDIR /app
COPY target/java-api-0.1.0.jar /app/app.jar
USER 10001
EXPOSE 8081
ENTRYPOINT ["java","-jar","/app/app.jar"]
# EOF
