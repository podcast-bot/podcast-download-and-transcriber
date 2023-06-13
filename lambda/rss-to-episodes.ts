import parsePodcast from "node-podcast-parser";
const request = require("request");

import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

exports.handler = async function (event: any) {
  console.log("request:", JSON.stringify(event, undefined, 2));
  console.log("podcast rss: ", process.env.RSS_FEED_URL);
  console.log("topic arn: ", process.env.TOPIC_ARN);

  await downloadPodcast(process.env.RSS_FEED_URL!, 10);
};

function downloadPodcast(url: string, limit: number) {
  // create AWS SDK clients
  const sns = new SNSClient();
  console.log(`sns: ${sns}`);

  return new Promise((resolve, reject) => {
    console.log(`url: ${url}`);
    getRSS(url)
      .then((rss: any) => {
        console.log(`rss: ${rss}`);
        const podcast = { ...rss, episodes: undefined };
        let downloadEpisodes: any[] = [];
        let episodes = limit == 0 ? rss.episodes : rss.episodes.slice(0, limit);
        console.log(`episodes: ${episodes}`);
        const podcastPromises = episodes.map((episode: any) => {
          console.log(`episode: ${episode.title}:${episode.enclosure.url}`);
          const publishCommand = new PublishCommand({
            TopicArn: process.env.TOPIC_ARN,
            Message: JSON.stringify({
              podcast,
              episode,
            }),
          });
          return sns
            .send(publishCommand)
            .then((publishResult) => {
              console.log(`Message sent. The ID is ${publishResult.MessageId}`);
              downloadEpisodes.push(podcast);
            })
            .catch((error) => {
              reject(error);
            });
        });

        return Promise.all(podcastPromises).then(() => downloadEpisodes);
      })
      .then((downloadEpisodes) => {
        resolve(downloadEpisodes);
      })
      .catch((error) => {
        reject(error);
      });
  });
}

function getRSS(url: string) {
  return new Promise((resolve, reject) => {
    request(url, (err: string, res: any, data: any) => {
      if (err) reject(`Network error: ${err}`);

      parsePodcast(data, (err: any, data: any) => {
        if (err) reject(`Parsing error: ${err}`);

        resolve(data);
      });
    });
  });
}
