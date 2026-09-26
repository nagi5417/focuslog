#!/usr/bin/env bash
# Aurora（isolated サブネット）へ、NAT インスタンスを踏み台にした
# SSM ポートフォワードでアクセスするためのスクリプト。
# Phase 5-2 / Phase 9 で共通して使う。
#
# 使い方: ./scripts/db-port-forward.sh
#   別のターミナルで、表示される接続文字列を使って psql に接続する。
#   終了するときはこのターミナルで Ctrl+C。
set -euo pipefail

PROFILE="focuslog"
REGION="ap-northeast-1"
STACK_NAME="FocuslogData"

echo "1. NAT インスタンス（踏み台）の ID を取得..."
NAT_ID=$(aws ec2 describe-instances --profile "$PROFILE" --region "$REGION" \
  --filters "Name=instance-state-name,Values=running" "Name=instance-type,Values=t4g.nano" \
  --query 'Reservations[0].Instances[0].InstanceId' --output text)
echo "   踏み台: $NAT_ID"

echo "2. Aurora のエンドポイントと認証情報を取得..."
DB_HOST=$(aws cloudformation describe-stacks --profile "$PROFILE" --region "$REGION" \
  --stack-name "$STACK_NAME" \
  --query 'Stacks[0].Outputs[?OutputKey==`DbEndpoint`].OutputValue' --output text)
DB_SECRET_ARN=$(aws cloudformation describe-stacks --profile "$PROFILE" --region "$REGION" \
  --stack-name "$STACK_NAME" \
  --query 'Stacks[0].Outputs[?OutputKey==`DbSecretArn`].OutputValue' --output text)
SECRET=$(aws secretsmanager get-secret-value --profile "$PROFILE" --region "$REGION" \
  --secret-id "$DB_SECRET_ARN" --query SecretString --output text)
DB_USER=$(echo "$SECRET" | jq -r .username)
DB_PASS=$(echo "$SECRET" | jq -r .password)

echo ""
echo "=========================================================="
echo "別のターミナルで、この接続文字列を使って psql してください:"
echo ""
echo "psql \"postgresql://${DB_USER}:${DB_PASS}@localhost:5433/focuslog?sslmode=require\""
echo "=========================================================="
echo ""
echo "3. ポートフォワードを開始します（このターミナルは開いたままにする）..."

aws ssm start-session --profile "$PROFILE" --region "$REGION" \
  --target "$NAT_ID" \
  --document-name AWS-StartPortForwardingSessionToRemoteHost \
  --parameters "{\"host\":[\"$DB_HOST\"],\"portNumber\":[\"5432\"],\"localPortNumber\":[\"5433\"]}"
