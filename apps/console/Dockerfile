FROM node:24.19.0-alpine AS build

WORKDIR /workspace

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/console/package.json apps/console/package.json
COPY packages/protocol/package.json packages/protocol/package.json

RUN pnpm install \
    --frozen-lockfile \
    --filter @performance-platform/console...

COPY packages/protocol packages/protocol
COPY apps/console apps/console

RUN pnpm \
    --filter @performance-platform/protocol \
    build

RUN pnpm \
    --filter @performance-platform/console \
    build

FROM nginx:1.27-alpine

COPY apps/console/nginx.conf \
    /etc/nginx/conf.d/default.conf

COPY --from=build \
    /workspace/apps/console/dist \
    /usr/share/nginx/html

EXPOSE 80