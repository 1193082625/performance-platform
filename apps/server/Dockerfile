FROM node:24.19.0-alpine

WORKDIR /workspace

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/server/package.json apps/server/package.json
COPY packages/protocol/package.json packages/protocol/package.json

RUN pnpm install \
    --frozen-lockfile \
    --filter @performance-platform/server...

COPY packages/protocol packages/protocol
COPY apps/server apps/server

RUN pnpm \
    --filter @performance-platform/protocol \
    build

RUN pnpm \
    --filter @performance-platform/server \
    build

EXPOSE 3000

CMD ["node","apps/server/dist/index.js"]