import type { NextConfig } from "next";

// next.config.ts はビルド時に評価され server.js に埋め込まれるため、
// ここで参照する環境変数は「実行時」ではなく「docker build 時」に渡す必要がある。
const appDomain = process.env.APP_DOMAIN ?? "localhost:3000";

const nextConfig: NextConfig = {
  // Docker 向けの自己完結ビルド。.next/standalone に server.js が出力される。
  output: "standalone",

  experimental: {
    serverActions: {
      // CloudFront + Lambda Function URL 構成では Host が Lambda の URL になるため、
      // 独自ドメインを明示的に許可しないと Server Actions が CSRF 判定で全て拒否される。
      allowedOrigins: [appDomain],
    },
  },

  // standalone のファイル追跡が Prisma のクエリエンジンを取りこぼす場合の保険。
  outputFileTracingIncludes: {
    "/*": ["node_modules/.prisma/client/**"],
  },

  // デプロイ間のバージョンずれを検知し、古いアセットを掴んだクライアントを再読み込みさせる。
  deploymentId: process.env.DEPLOYMENT_ID,
};

export default nextConfig;
