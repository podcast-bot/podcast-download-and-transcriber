#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { PodcastDownloadAndTranscriberStack } from '../lib/podcast-download-and-transcriber-stack';

const app = new cdk.App();
new PodcastDownloadAndTranscriberStack(app, 'PodcastDownloadAndTranscriberStack');
