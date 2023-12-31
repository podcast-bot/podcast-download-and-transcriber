import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subs from 'aws-cdk-lib/aws-sns-subscriptions';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import { HitCounter } from './hitcounter';
import { TableViewer } from 'cdk-dynamo-table-viewer';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';

export class PodcastDownloadAndTranscriberStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const queue = new sqs.Queue(this, 'Podcast-to-Episode-Queue', {
      visibilityTimeout: Duration.seconds(300)
    });

    const topic = new sns.Topic(this, 'Podcast-to-Episode-Topic');

    topic.addSubscription(new subs.SqsSubscription(queue));

    // defines an AWS Lambda resource
    const hello = new lambda.Function(this, 'HelloHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,    // execution environment
      code: lambda.Code.fromAsset('lambda'),  // code loaded from "lambda" directory
      handler: 'hello.handler'                // file is "hello", function is "handler"
    });

    const helloWithCounter = new HitCounter(this, 'HelloHitCounter', {
      downstream: hello
    });

    // defines an API Gateway REST API resource backed by our "hello" function.
    new apigw.LambdaRestApi(this, 'HelloHandler-Endpoint', {
      handler: helloWithCounter.handler
    });

    new TableViewer(this, 'ViewHitCounter', {
      title: 'Hello Hits',
      table: helloWithCounter.table,
      sortBy: '-hits'       // optional ("-" denotes descending order),
    });


    // defines an AWS Lambda resource
    const rssToEpisodes = new NodejsFunction(this, 'RSS-To-Episodes', {
      bundling: {
        externalModules: [],
        minify: false,
        nodeModules: ['node-podcast-parser', '@aws-sdk/client-sns'],
      },
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: __dirname + '/../lambda/rss-to-episodes.ts',
      handler: 'handler',
      timeout: Duration.seconds(360),
      environment: {
        RSS_FEED_URL: "https://anchor.fm/s/fa79b44/podcast/rss",
        TOPIC_ARN: topic.topicArn
      }
    });

    const snsTopicPolicy = new iam.PolicyStatement({
      actions: ['sns:publish'],
      resources: ['*'],
    });

    rssToEpisodes.addToRolePolicy(snsTopicPolicy);
  }

}
