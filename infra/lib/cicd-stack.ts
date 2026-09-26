import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

interface CicdStackProps extends cdk.StackProps {
  githubOwner: string;
  githubRepo: string;
}

export class CicdStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: CicdStackProps) {
    super(scope, id, props);

    const provider = new iam.OpenIdConnectProvider(this, "GithubOidc", {
      url: "https://token.actions.githubusercontent.com",
      clientIds: ["sts.amazonaws.com"],
    });

    // sub 条件で「このリポジトリの main ブランチから」に限定する。
    // ここを緩めると他リポジトリからも AssumeRole できてしまうため要注意。
    const role = new iam.Role(this, "DeployRole", {
      roleName: "focuslog-github-actions",
      assumedBy: new iam.WebIdentityPrincipal(
        provider.openIdConnectProviderArn,
        {
          StringEquals: {
            "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          },
          StringLike: {
            "token.actions.githubusercontent.com:sub": `repo:${props.githubOwner}/${props.githubRepo}:ref:refs/heads/main`,
          },
        },
      ),
      maxSessionDuration: cdk.Duration.hours(1),
    });

    // 本来は最小権限にすべきだが、cdk deploy は広い権限を要求する。
    // 個人プロジェクトのため CDK の実行ロールを引き受ける権限に絞る形で妥協する。
    role.addToPolicy(
      new iam.PolicyStatement({
        actions: ["sts:AssumeRole"],
        resources: [`arn:aws:iam::${this.account}:role/cdk-*`],
      }),
    );
    role.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:PutImage",
          "ecr:BatchGetImage",
        ],
        resources: ["*"],
      }),
    );

    new cdk.CfnOutput(this, "DeployRoleArn", { value: role.roleArn });
  }
}
