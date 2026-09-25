import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import { FckNatInstanceProvider } from "cdk-fck-nat";
import { Construct } from "constructs";

export class NetworkStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;
  public readonly lambdaSg: ec2.SecurityGroup;
  public readonly dbSg: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // NAT ゲートウェイ(約¥6,500/月)の代わりに t4g.nano の NAT インスタンス(約¥700/月)を使う。
    // fck-nat は Auto Scaling Group(desired=1)で自動復旧する仕組みを内包している。
    const natProvider = new FckNatInstanceProvider({
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T4G,
        ec2.InstanceSize.NANO,
      ),
    });

    this.vpc = new ec2.Vpc(this, "Vpc", {
      ipAddresses: ec2.IpAddresses.cidr("10.0.0.0/16"),
      maxAzs: 2, // Aurora が最低2AZ を要求するため
      natGatewayProvider: natProvider,
      natGateways: 1, // NAT は1台のみ（コスト優先。AZ 障害時は縮退する）
      subnetConfiguration: [
        { name: "public", subnetType: ec2.SubnetType.PUBLIC, cidrMask: 24 },
        {
          name: "private",
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
        {
          name: "isolated",
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        },
      ],
    });

    // VPC 内からの通信だけを NAT インスタンスに通す。
    // セキュリティグループの description は AWS 側の制約で ASCII のみ許可されるため英語で書く。
    natProvider.securityGroup.addIngressRule(
      ec2.Peer.ipv4(this.vpc.vpcCidrBlock),
      ec2.Port.allTraffic(),
      "Allow outbound traffic from within the VPC only",
    );

    // SSM Session Manager でポートフォワードできるようにする（Aurora への踏み台用。4-2 注記）。
    natProvider.role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        "AmazonSSMManagedInstanceCore",
      ),
    );

    // Next.js を動かす Lambda 用。
    this.lambdaSg = new ec2.SecurityGroup(this, "LambdaSg", {
      vpc: this.vpc,
      description: "Security group for the Lambda function running Next.js",
      allowAllOutbound: true,
    });

    // Aurora 用。
    this.dbSg = new ec2.SecurityGroup(this, "DbSg", {
      vpc: this.vpc,
      description: "Security group for Aurora",
      allowAllOutbound: false,
    });

    // DB への入口は Lambda の SG からの 5432 番だけ。IP ではなく SG を指定するのが要点で、
    // Lambda の IP が変わっても設定を追随させる必要がなくなる。
    this.dbSg.addIngressRule(
      this.lambdaSg,
      ec2.Port.tcp(5432),
      "Allow PostgreSQL connections from Lambda only",
    );

    // NAT インスタンスを DB 接続用の踏み台としても使う（Phase 5 / Phase 9）。
    // 踏み台 EC2 を別に立てずに済むため追加コストがゼロになる。
    this.dbSg.addIngressRule(
      natProvider.securityGroup,
      ec2.Port.tcp(5432),
      "Maintenance access via the NAT instance acting as a bastion",
    );
  }
}
