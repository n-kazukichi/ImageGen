import { type SSTConfig } from "sst";
import { NextjsSite } from "sst/constructs";
import { env } from "~/env.mjs";
import {
  aws_certificatemanager as acm,
  aws_route53 as route53,
  aws_route53_targets as route53Targets,
} from "aws-cdk-lib";

export default {
  config(_input) {
    return {
      name: "MyImageGen",
      region: "us-west-2",
    };
  },
  stacks(app) {
    app.stack(function Site({ stack }) {
      const certificate = acm.Certificate.fromCertificateArn(
        stack,
        "Certificate",
        process.env.AWS_CERTIFICATE_ARN ?? ""
      );
      const site = new NextjsSite(stack, "MyImageGenSite", {
        timeout: "1 minute",
        environment: {
          ...env,
        },
        customDomain: {
          isExternalDomain: true,
          domainName: "www.robavo.net",
          alternateNames: ["robavo.net"],
          cdk: {
            certificate,
          },
        },
      });

      if (site.cdk && site.cdk.hostedZone) {
        const recordProps = {
          recordName: "robavo.net",
          zone: site.cdk.hostedZone,
          target: route53.RecordTarget.fromAlias(
            new route53Targets.CloudFrontTarget(site.cdk.distribution)
          ),
        };
        new route53.ARecord(stack, "AlternateARecord", recordProps);
        new route53.AaaaRecord(stack, "AlternateAAAARecord", recordProps);
      }

      stack.addOutputs({
        SiteUrl: site.url,
      });
    });

    app.setDefaultFunctionProps({
      logRetention: "one_week",
    });
  },
} satisfies SSTConfig;
