FROM node:22-bookworm-slim

# better-sqlite3 compiles a native addon at install time
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Node's bundled corepack can be too old to run newer pnpm CJS bundles
# (ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING) — use a current one instead.
RUN npm install -g corepack@latest && corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

ENV NODE_ENV=production
EXPOSE 3000
CMD ["pnpm", "start"]
