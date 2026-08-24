FROM node:24-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS build
ARG PUBLIC_POCKETBASE_URL=http://localhost:8090
ENV PUBLIC_POCKETBASE_URL=$PUBLIC_POCKETBASE_URL
COPY . .
RUN npm run build

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY package.json ./package.json
EXPOSE 3000
CMD ["node", "build"]
