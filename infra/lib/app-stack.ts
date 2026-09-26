import * as cdk from "aws-cdk-lib";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as targets from "aws-cdk-lib/aws-route53-targets";
import * as rds from "aws-cdk-lib/aws-rds";
import * as fs from "node:fs";
import * as path from "node:path";
import { Construct } from "constructs";

interface AppStackProps extends cdk.StackProps {
  vpc: ec2.IVpc;
  lambdaSg: ec2.ISecurityGroup;
  cluster: rds.DatabaseCluster;
  certificate: acm.ICertificate;
  domainName: string;
  imageTag: string;
}

export class AppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AppStackProps) {
    super(scope, id, props);

    const repo = ecr.Repository.fromRepositoryName(this, "Repo", "focuslog");
    const dbSecret = props.cluster.secret!;

    const commonEnv = {
      SSM_PARAM_PATH: "/focuslog/prod/",
      DB_SECRET_ARN: dbSecret.secretArn,
    };

    const commonVpc = {
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [props.lambdaSg],
    };

    // ---- アプリ本体の Lambda ----
    const webFn = new lambda.DockerImageFunction(this, "Web", {
      code: lambda.DockerImageCode.fromEcr(repo, {
        tagOrDigest: props.imageTag,
      }),
      architecture: lambda.Architecture.ARM_64, // x86 より約2割安い
      memorySize: 1024,
      // 1リクエストの処理上限。CloudFront 側(30秒)より短くして、
      // タイムアウト時にどちらの層で切れたか判別できるようにする。
      timeout: cdk.Duration.seconds(25),
      environment: { ...commonEnv, AWS_LWA_INVOKE_MODE: "response_stream" },
      ...commonVpc,
    });

    dbSecret.grantRead(webFn);
    webFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["ssm:GetParametersByPath", "ssm:GetParameters"],
        resources: [
          `arn:aws:ssm:${this.region}:${this.account}:parameter/focuslog/prod/*`,
        ],
      }),
    );
    // SES の送信権限。API キーを持たずに送れるのがロール認証の利点。
    webFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["ses:SendEmail"],
        resources: ["*"],
      }),
    );

    const fnUrl = webFn.addFunctionUrl({
      // 誰でも叩ける状態にせず、CloudFront からの署名付きリクエストだけ通す。
      authType: lambda.FunctionUrlAuthType.AWS_IAM,
      invokeMode: lambda.InvokeMode.RESPONSE_STREAM,
    });

    // ---- CloudFront ----
    const forwardHostFn = new cloudfront.Function(this, "ForwardHost", {
      code: cloudfront.FunctionCode.fromInline(
        fs.readFileSync(
          path.join(__dirname, "functions/forward-host.js"),
          "utf8",
        ),
      ),
      runtime: cloudfront.FunctionRuntime.JS_2_0,
    });

    // OAC 付きのオリジン。CloudFront が SigV4 で署名し、Lambda 側は IAM で検証する。
    const origin = origins.FunctionUrlOrigin.withOriginAccessControl(fnUrl);

    const distribution = new cloudfront.Distribution(this, "Cdn", {
      domainNames: [props.domainName],
      certificate: props.certificate,
      defaultBehavior: {
        origin,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        // Server Actions は POST を使うため全メソッドを通す。
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        // 動的ページはユーザーごとに内容が違うのでキャッシュしない。
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        // Host ヘッダを転送すると OAC の署名が壊れるため、Host だけ除外する専用ポリシーを使う。
        originRequestPolicy:
          cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        functionAssociations: [
          {
            function: forwardHostFn,
            eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
          },
        ],
      },
      additionalBehaviors: {
        // ハッシュ付きの不変ファイル。長期キャッシュして Lambda の起動回数を減らす。
        "/_next/static/*": {
          origin,
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        },
      },
    });

    // FunctionUrlOrigin.withOriginAccessControl() が自動付与するのは
    // lambda:InvokeFunctionUrl の権限のみ。2025年10月以降、AWS 側の要件として
    // CloudFront からの OAC 経由アクセスには lambda:InvokeFunction も別途必要になっており、
    // これが無いと CloudFront 経由のリクエストが「Forbidden」で拒否される。
    // https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-lambda.html
    webFn.addPermission("AllowCloudFrontInvoke", {
      principal: new iam.ServicePrincipal("cloudfront.amazonaws.com"),
      action: "lambda:InvokeFunction",
      sourceArn: `arn:aws:cloudfront::${this.account}:distribution/${distribution.distributionId}`,
    });

    // ---- DNS ----
    const zone = route53.HostedZone.fromLookup(this, "Zone", {
      domainName: props.domainName,
    });
    new route53.ARecord(this, "AliasRecord", {
      zone,
      recordName: props.domainName,
      target: route53.RecordTarget.fromAlias(
        new targets.CloudFrontTarget(distribution),
      ),
    });

    new cdk.CfnOutput(this, "DistributionDomain", {
      value: distribution.distributionDomainName,
    });
  }
}
