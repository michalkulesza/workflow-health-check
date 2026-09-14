FROM node:22.20.0-alpine AS base
RUN npm install --global npm@11.17.0 && npm --version

FROM base AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS build
COPY . .
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
ENV PAYLOAD_SECRET=build-only-secret-that-is-at-least-32-characters
# Windows-hosted agent guidance is symlinked outside Docker's build context.
# Next inspects these paths during its build, but they are not runtime inputs.
RUN rm -f general.md typescript-react-guidelines.md \
  && touch general.md typescript-react-guidelines.md \
  && npm run build

FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --chown=node:node --from=dependencies /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/.next ./.next
COPY --chown=node:node --from=build /app/app ./app
COPY --chown=node:node --from=build /app/lib ./lib
COPY --chown=node:node --from=build /app/server ./server
COPY --chown=node:node --from=build /app/scripts ./scripts
COPY --chown=node:node --from=build /app/package.json ./package.json
COPY --chown=node:node --from=build /app/payload.config.ts ./payload.config.ts
COPY --chown=node:node --from=build /app/next.config.mjs ./next.config.mjs
COPY --chown=node:node --from=build /app/payload-types.ts ./payload-types.ts
COPY --chown=node:node --from=build /app/tsconfig.json ./tsconfig.json
USER node
EXPOSE 3000
CMD ["npm", "run", "start"]
