#!/usr/bin/env node
import { App } from "aws-cdk-lib";
import { CertStack } from "../lib/cert-stack";
import { NetworkStack } from "../lib/network-stack";

// 以降のフェーズで使うスタックも、この定数を通じて同じドメイン名を参照する。
const DOMAIN_NAME = "focuslog.dev";

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
new NetworkStack(app, "FocuslogNetwork", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: "ap-northeast-1",
  },
});

app.synth();
