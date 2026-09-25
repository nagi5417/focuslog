import { Stack, type StackProps } from "aws-cdk-lib";
import type { Construct } from "constructs";

/**
 * Phase 2 時点のプレースホルダー。`cdk bootstrap` はアプリ内に
 * スタックが1つ以上ないと実行できないため、リソースを持たない
 * 空のスタックだけを用意している。Phase 3 以降で本物のスタック
 * （cert-stack, network-stack, data-stack, app-stack, cicd-stack）
 * に置き換わっていく想定。
 */
export class PlaceholderStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
  }
}
