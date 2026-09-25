# syntax=docker/dockerfile:1

# ---------- deps: 依存インストール（レイヤーキャッシュを効かせるため分離） ----------
FROM node:22-slim AS deps
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable
# postinstall で prisma generate が走るため schema を先に置く。
# これが無いと "Could not find Prisma Schema" で install が失敗する。
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile

# ---------- builder: Next.js のビルド ----------
FROM node:22-slim AS builder
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# next.config.ts はビルド時に評価され server.js に埋め込まれるため、
# ドメインとデプロイ ID はここで渡す（実行時の環境変数では効かない）。
ARG APP_DOMAIN
ARG DEPLOYMENT_ID
ENV APP_DOMAIN=$APP_DOMAIN
ENV DEPLOYMENT_ID=$DEPLOYMENT_ID
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm prisma generate && pnpm build

# ---------- tools: 起動スクリプトが使う AWS SDK を npm で用意 ----------
# pnpm のシンボリックリンク構造はイメージ間 COPY で壊れるため、ここだけ npm を使う。
FROM node:22-slim AS tools
WORKDIR /tools
RUN npm init -y \
  && npm install --omit=dev \
    @aws-sdk/client-ssm \
    @aws-sdk/client-secrets-manager

# ---------- runner: 実行イメージ ----------
FROM node:22-slim AS runner
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Lambda Web Adapter。これを /opt/extensions に置くだけで、
# 通常の HTTP サーバーが Lambda のイベントを受け取れるようになる。
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.9.1 /lambda-adapter /opt/extensions/lambda-adapter

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# レスポンスストリーミングを有効にする（Lambda の Function URL 側の設定と揃える）。
ENV AWS_LWA_INVOKE_MODE=response_stream
# Next.js が listen し終わるまで Adapter に待たせる。
# HTTP チェック（既定）にすると proxy.ts の認証処理まで走り、Aurora の再開待ち(約15秒)と
# Lambda の初期化制限(10秒)がぶつかって起動失敗しうる。TCP なら「ポートが開いたか」だけを見る。
ENV AWS_LWA_READINESS_CHECK_PROTOCOL=tcp
ENV AWS_LWA_READINESS_CHECK_PORT=3000

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
# 起動スクリプトと、それが使う AWS SDK。
COPY --from=tools /tools/node_modules/. ./node_modules/
COPY bootstrap.mjs ./bootstrap.mjs

# 設定を読み込んでから Next.js のサーバーを起動する。
CMD ["node", "bootstrap.mjs", "node", "server.js"]
