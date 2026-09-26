#!/usr/bin/env node
import { App } from "aws-cdk-lib";
import { CertStack } from "../lib/cert-stack";
import { DataStack } from "../lib/data-stack";
import { NetworkStack } from "../lib/network-stack";

// 以降のフェーズで使うスタックも、この定数を通じて同じドメイン名を参照する。
const DOMAIN_NAME = "focuslog.dev";
// スタックをまたいで参照するリソース（vpc / dbSg 等）は、この定数を通じて
// 東京リージョンのスタック同士でだけやり取りする（CertStack は us-east-1 で独立）。
const APP_ENV = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: "ap-northeast-1",
};

const app = new App();

// CloudFront に付ける証明書は us-east-1 でしか発行できないため、
// アプリ本体（ap-northeast-1）とはリージョンを分けている（Phase 3）。
new CertStack(app, "FocuslogCert", {
  domainName: DOMAIN_NAME,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: "us-east-1",
  },
});

// Lambda と Aurora を置く VPC（Phase 4）。アプリ本体は東京リージョン。
const network = new NetworkStack(app, "FocuslogNetwork", {
  env: APP_ENV,
});

// Aurora Serverless v2（Phase 5）。NetworkStack が作った VPC・SG の中に置く。
new DataStack(app, "FocuslogData", {
  env: APP_ENV,
  vpc: network.vpc,
  dbSg: network.dbSg,
});

app.synth();
