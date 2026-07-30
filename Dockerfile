FROM node:22-alpine AS build
WORKDIR /app
ENV DOCKER_BUILD=1
ENV NODE_OPTIONS=--max-old-space-size=1536
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV DATA_DIR=/app/data
COPY --from=build /app/dist ./dist
COPY package*.json ./
RUN npm ci --omit=dev
COPY server.mjs ./server.mjs
RUN mkdir -p /app/data
EXPOSE 8080
CMD ["node", "server.mjs"]
