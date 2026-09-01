FROM node:24.19.0-alpine AS build

WORKDIR /workspace

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/demo-web/package.json apps/demo-web/package.json
COPY packages/sdk-browser/package.json packages/sdk-browser/package.json
COPY packages/protocol/package.json packages/protocol/package.json

RUN pnpm install \
    --frozen-lockfile \
    --filter @performance-platform/demo-web...

COPY packages/protocol packages/protocol
COPY packages/sdk-browser packages/sdk-browser
COPY apps/demo-web apps/demo-web

ARG VITE_MONITOR_ENDPOINT
ARG VITE_APP_ID
ARG VITE_APP_VERSION
ARG VITE_APP_ENVIRONMENT

ENV VITE_MONITOR_ENDPOINT=$VITE_MONITOR_ENDPOINT
ENV VITE_APP_ID=$VITE_APP_ID
ENV VITE_APP_VERSION=$VITE_APP_VERSION
ENV VITE_APP_ENVIRONMENT=$VITE_APP_ENVIRONMENT

RUN test -n "$VITE_MONITOR_ENDPOINT" \
    && test -n "$VITE_APP_ID" \
    && test -n "$VITE_APP_VERSION" \
    && test -n "$VITE_APP_ENVIRONMENT"

RUN pnpm \
    --filter @performance-platform/protocol \
    build

RUN pnpm \
    --filter @performance-platform/browser \
    build

RUN pnpm \
    --filter @performance-platform/demo-web \
    build

FROM nginx:1.27-alpine

COPY apps/demo-web/nginx.conf \
    /etc/nginx/conf.d/default.conf

COPY --from=build \
    /workspace/apps/demo-web/dist \
    /usr/share/nginx/html

EXPOSE 80