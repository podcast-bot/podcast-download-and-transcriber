const { DynamoDBClient, UpdateItemCommand } = require("@aws-sdk/client-dynamodb");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");
const { TextDecoder } = require('util');  // import the TextDecoder

exports.handler = async function(event) {
  console.log("request:", JSON.stringify(event, undefined, 2));

  // create AWS SDK clients
  const dynamo = new DynamoDBClient();
  const lambda = new LambdaClient();

  // update dynamo entry for "path" with hits++
  const updateCommand = new UpdateItemCommand({
    TableName: process.env.HITS_TABLE_NAME,
    Key: { path: { S: event.path } },
    UpdateExpression: 'ADD hits :incr',
    ExpressionAttributeValues: { ':incr': { N: '1' } }
  });
  await dynamo.send(updateCommand);

  // call downstream function and capture response
  const invokeCommand = new InvokeCommand({
    FunctionName: process.env.DOWNSTREAM_FUNCTION_NAME,
    Payload: JSON.stringify(event)
  });
  const resp = await lambda.send(invokeCommand);

  // convert Uint8Array response to string
  const decoder = new TextDecoder('utf8');
  const respPayload = decoder.decode(resp.Payload);

  console.log('downstream response:', respPayload);

  // return response back to upstream caller
  return JSON.parse(respPayload);
};
