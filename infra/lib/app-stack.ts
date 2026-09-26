import * as cdk from "aws-cdk-lib";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as apigwv2authorizers from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import * as apigwv2integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as targets from "aws-cdk-lib/aws-route53-targets";
import * as rds from "aws-cdk-lib/aws-rds";
import * as crypto from "node:crypto";
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
      environment: {
        SSM_PARAM_PATH: "/focuslog/prod/",
        DB_SECRET_ARN: dbSecret.secretArn,
        // Dockerfile が ENV でイメージに焼き込んでいる response_stream を関数レベルで上書きする。
        // レスポンスストリーミングは Lambda Function URL 経由でしか成立せず、API Gateway 経由の
        // 呼び出しでは Lambda がストリーミング用のレスポンス形式を返してしまい、API Gateway 側が
        // 解釈できず 500 になる。関数の環境変数はイメージの ENV より優先されるため、ここで
        // 明示的に "buffered"(既定の一括レスポンス)に戻す必要がある。
        AWS_LWA_INVOKE_MODE: "buffered",
      },
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [props.lambdaSg],
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

    // ---- CloudFront ↔ API Gateway 間の合言葉 ----
    // OAC(署名検証)は S3 と Lambda Function URL 向けの自動設定しか無く、API Gateway には
    // 使えない。代わりに CloudFront がカスタムヘッダーへ合言葉を載せ、API Gateway の前段の
    // 認可用 Lambda(Authorizer)でその値を検証する。カスタムオリジンヘッダーは同名の
    // ビューアーヘッダーを常に上書きして転送されるため、この合言葉は外部から偽装できない。
    // synth のたびに値が変わるため、デプロイのたびに自動でローテーションされる副次効果もある。
    const originVerifySecret = crypto.randomBytes(24).toString("hex");

    const authorizerFn = new lambda.Function(this, "OriginVerifyAuthorizer", {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "index.handler",
      code: lambda.Code.fromInline(`
        exports.handler = async (event) => ({
          isAuthorized: event.headers?.["x-origin-verify"] === process.env.SECRET,
        });
      `),
      environment: { SECRET: originVerifySecret },
      timeout: cdk.Duration.seconds(3),
    });

    const httpApi = new apigwv2.HttpApi(this, "Api", {
      defaultIntegration: new apigwv2integrations.HttpLambdaIntegration(
        "WebIntegration",
        webFn,
      ),
      defaultAuthorizer: new apigwv2authorizers.HttpLambdaAuthorizer(
        "OriginVerify",
        authorizerFn,
        {
          responseTypes: [apigwv2authorizers.HttpLambdaResponseType.SIMPLE],
          identitySource: ["$request.header.x-origin-verify"],
        },
      ),
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

    // apiEndpoint は "https://xxxx.execute-api.<region>.amazonaws.com" というトークン文字列。
    // HttpOrigin はホスト名のみを要求するため "/" 分割の3番目の要素(index 2)を取り出す。
    const apiHost = cdk.Fn.select(2, cdk.Fn.split("/", httpApi.apiEndpoint));

    const origin = new origins.HttpOrigin(apiHost, {
      customHeaders: { "x-origin-verify": originVerifySecret },
    });

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
        // Host ヘッダをオリジンにそのまま転送すると API Gateway 側のドメインと不一致になるため、
        // Host だけ除外する専用ポリシーを使う(実ホスト名は forward-host.js が別ヘッダーで運ぶ)。
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
    new cdk.CfnOutput(this, "ApiEndpoint", { value: httpApi.apiEndpoint });
  }
}
