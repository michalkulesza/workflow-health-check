FROM node:22-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS build
COPY . .
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
ENV PAYLOAD_SECRET=build-only-secret-that-is-at-least-32-characters
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/app ./app
COPY --from=build /app/lib ./lib
COPY --from=build /app/server ./server
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/payload.config.ts ./payload.config.ts
COPY --from=build /app/next.config.mjs ./next.config.mjs
COPY --from=build /app/payload-types.ts ./payload-types.ts
COPY --from=build /app/tsconfig.json ./tsconfig.json
EXPOSE 3000
CMD ["npm", "run", "start"]
