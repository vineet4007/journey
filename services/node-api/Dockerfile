FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm prune --production

FROM gcr.io/distroless/nodejs20-debian12
WORKDIR /app
COPY --from=build /app .
USER 10001
EXPOSE 3000
HEALTHCHECK CMD ["node","-e","process.exit(0)"]
CMD ["src/index.js"]
