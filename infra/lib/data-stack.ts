import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";
import { Construct } from "constructs";

interface DataStackProps extends cdk.StackProps {
  vpc: ec2.IVpc;
  dbSg: ec2.ISecurityGroup;
}

export class DataStack extends cdk.Stack {
  public readonly cluster: rds.DatabaseCluster;

  constructor(scope: Construct, id: string, props: DataStackProps) {
    super(scope, id, props);

    this.cluster = new rds.DatabaseCluster(this, "Db", {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        // 0 ACU への自動停止は PostgreSQL 16.3 以降で対応。
        // 16.6 は AWS 側で既に提供終了していたため、CDK(aws-cdk-lib@2.270.0)が
        // 定数を持つ最新版 16.13 を使う（AWS 側の利用可能バージョンとも一致することを確認済み）。
        version: rds.AuroraPostgresEngineVersion.VER_16_13,
      }),
      vpc: props.vpc,
      // インターネットから到達できない isolated サブネットに置く。
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [props.dbSg],
      writer: rds.ClusterInstance.serverlessV2("writer"),
      serverlessV2MinCapacity: 0, // 0 = アイドル時に自動停止
      serverlessV2MaxCapacity: 1,
      defaultDatabaseName: "focuslog",
      // パスワードを人が扱わずに済むよう Secrets Manager に自動生成させる。
      credentials: rds.Credentials.fromGeneratedSecret("focuslog"),
      storageEncrypted: true,
      backup: { retention: cdk.Duration.days(1) },
      // 誤って destroy してもスナップショットが残るようにする。
      removalPolicy: cdk.RemovalPolicy.SNAPSHOT,
    });

    // 自動停止までの待ち時間は L2 が未対応の場合があるため、CFN リソースに直接設定する。
    // （aws-cdk-lib のバージョンによっては L2 のプロパティで設定できる）
    const cfnCluster = this.cluster.node.defaultChild as rds.CfnDBCluster;
    cfnCluster.serverlessV2ScalingConfiguration = {
      minCapacity: 0,
      maxCapacity: 1,
      secondsUntilAutoPause: 300, // 5分アクセスが無ければ停止
    };

    new cdk.CfnOutput(this, "DbSecretArn", {
      value: this.cluster.secret!.secretArn,
    });
    new cdk.CfnOutput(this, "DbEndpoint", {
      value: this.cluster.clusterEndpoint.hostname,
    });
  }
}
