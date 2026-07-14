FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV DATA_DIR=/app/data
COPY --from=build /app/dist ./dist
COPY server.mjs ./server.mjs
RUN mkdir -p /app/data
EXPOSE 3000
CMD ["node", "server.mjs"]
