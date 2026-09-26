#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { AppStack } from "../lib/app-stack";
import { CertStack } from "../lib/cert-stack";
import { DataStack } from "../lib/data-stack";
import { NetworkStack } from "../lib/network-stack";

const app = new cdk.App();

const account = process.env.CDK_DEFAULT_ACCOUNT;
// -c domainName=... / -c imageTag=... で渡す。未指定時は focuslog.dev を既定にする
// （Phase 3 で取得したドメイン。手順書の <DOMAIN> に対応）。
const domainName = app.node.tryGetContext("domainName") ?? "focuslog.dev";
const imageTag = app.node.tryGetContext("imageTag") ?? "latest";

const tokyo = { account, region: "ap-northeast-1" };
const virginia = { account, region: "us-east-1" };

// 証明書だけ us-east-1（CloudFront の要件）。
const cert = new CertStack(app, "FocuslogCert", {
  env: virginia,
  domainName,
  crossRegionReferences: true, // 別リージョンのスタックから参照するために必要
});

const network = new NetworkStack(app, "FocuslogNetwork", { env: tokyo });

const data = new DataStack(app, "FocuslogData", {
  env: tokyo,
  vpc: network.vpc,
  dbSg: network.dbSg,
});

new AppStack(app, "FocuslogApp", {
  env: tokyo,
  crossRegionReferences: true,
  vpc: network.vpc,
  lambdaSg: network.lambdaSg,
  cluster: data.cluster,
  certificate: cert.certificate,
  domainName,
  imageTag,
});

// Phase 11 で作る CI/CD 用スタック。ここまでの Phase では未作成でよい。
// new CicdStack(app, "FocuslogCicd", {
//   env: tokyo,
//   githubOwner: "<GITHUB_OWNER>",
//   githubRepo: "<GITHUB_REPO>",
// });
