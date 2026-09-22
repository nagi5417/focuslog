#!/usr/bin/env node
import { App } from "aws-cdk-lib";
import { PlaceholderStack } from "../lib/placeholder-stack";

// Phase 2 時点ではまだ本物のスタックを定義していない。
// `cdk bootstrap` はアプリ内にスタックが1つ以上ないと実行できないため、
// リソースを持たない PlaceholderStack だけを登録しておく。
// 各スタックは Phase 3 以降でここに追加し、PlaceholderStack は最終的に外す。
const app = new App();

new PlaceholderStack(app, "FocuslogPlaceholder", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

app.synth();
