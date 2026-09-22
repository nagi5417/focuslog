// Lambda 起動時に SSM Parameter Store と Secrets Manager から設定を読み、
// process.env に載せてから本来のコマンド（Next.js サーバー / prisma migrate）を起動する。
//
// 使い方: node bootstrap.mjs <実行したいコマンド> [引数...]
//   例) node bootstrap.mjs node server.js
import { spawn } from "node:child_process";
import { SSMClient, GetParametersByPathCommand } from "@aws-sdk/client-ssm";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

const PARAM_PATH = process.env.SSM_PARAM_PATH; // 例: /focuslog/prod/
const DB_SECRET_ARN = process.env.DB_SECRET_ARN;

/**
 * SSM のパス配下のパラメータを一括取得し、環境変数名に変換して読み込む。
 * 例: /focuslog/prod/AUTH_SECRET → process.env.AUTH_SECRET
 */
async function loadParameters() {
  if (!PARAM_PATH) return;
  const ssm = new SSMClient({});
  let nextToken;
  do {
    const res = await ssm.send(
      new GetParametersByPathCommand({
        Path: PARAM_PATH,
        WithDecryption: true, // SecureString を復号する
        Recursive: true,
        NextToken: nextToken,
      }),
    );
    for (const p of res.Parameters ?? []) {
      const key = p.Name.slice(PARAM_PATH.length)
        .replace(/\//g, "_")
        .toUpperCase();
      process.env[key] = p.Value;
    }
    nextToken = res.NextToken;
  } while (nextToken);
}

/**
 * RDS が管理する Secrets Manager のシークレットから接続文字列を組み立てる。
 * パスワードを人間が扱わずに済むのが、この方式を採る一番の理由。
 */
async function loadDatabaseUrl() {
  if (!DB_SECRET_ARN) return;
  const sm = new SecretsManagerClient({});
  const res = await sm.send(
    new GetSecretValueCommand({ SecretId: DB_SECRET_ARN }),
  );
  const s = JSON.parse(res.SecretString);
  const user = encodeURIComponent(s.username);
  const pass = encodeURIComponent(s.password);
  // Aurora Serverless v2 は 0 ACU からの再開に約15秒かかるため、
  // 既定の接続タイムアウトでは初回アクセスが失敗しうる。余裕を持たせる。
  // dbname はシークレットに含まれないことがあるため既定値を用意する。
  const dbName = s.dbname ?? "focuslog";
  const url =
    `postgresql://${user}:${pass}@${s.host}:${s.port}/${dbName}` +
    `?sslmode=require&connect_timeout=30`;
  // Aurora では pooled / unpooled の区別が無いため両方に同じ値を入れる。
  process.env.DATABASE_URL = url;
  process.env.DATABASE_URL_UNPOOLED = url;
}

await loadParameters();
await loadDatabaseUrl();

const [command, ...args] = process.argv.slice(2);
if (!command) {
  console.error("bootstrap.mjs: 実行するコマンドが指定されていません");
  process.exit(1);
}

const child = spawn(command, args, { stdio: "inherit", env: process.env });
child.on("exit", (code) => process.exit(code ?? 0));
