import * as cdk from "aws-cdk-lib";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as route53 from "aws-cdk-lib/aws-route53";
import { Construct } from "constructs";

interface CertStackProps extends cdk.StackProps {
  domainName: string;
}

/**
 * CloudFront に付ける証明書は us-east-1 でしか発行できないため、
 * このスタックだけリージョンを分けている。
 */
export class CertStack extends cdk.Stack {
  public readonly certificate: acm.ICertificate;

  constructor(scope: Construct, id: string, props: CertStackProps) {
    super(scope, id, props);

    const zone = route53.HostedZone.fromLookup(this, "Zone", {
      domainName: props.domainName,
    });

    // DNS 検証にすると Route 53 に検証用レコードが自動作成され、手作業が不要になる。
    this.certificate = new acm.Certificate(this, "Cert", {
      domainName: props.domainName,
      subjectAlternativeNames: [`www.${props.domainName}`],
      validation: acm.CertificateValidation.fromDns(zone),
    });
  }
}
