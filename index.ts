import { APIGatewayEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { createHash } from 'crypto';
import geoip from 'geoip-country';
import AWS from 'aws-sdk';
import { v4 } from 'uuid';
import moment from 'moment';

const DDBClient = new AWS.DynamoDB.DocumentClient();

export const handler = async (event: APIGatewayEvent, context: Context): Promise<APIGatewayProxyResult> => {
  console.log(`Event: ${JSON.stringify(event, null, 2)}`);
  console.log(`Context: ${JSON.stringify(context, null, 2)}`);

  const ip = event.requestContext.identity.sourceIp;

  const hashedIP = createHash('md5').update(ip).digest('hex');
  const lookupData = geoip.lookup(ip);

  if (event.body && process.env.DDB_TABLE) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const update = {
      ...JSON.parse(event.body),
      id: v4(),
      ip: hashedIP,
      country: lookupData?.country,
      timestamp: moment.utc().format()
    };

    console.log(`Saving: ${JSON.stringify(update, null, 2)}`);

    await DDBClient.put({
      TableName: process.env.DDB_TABLE,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      Item: update
    }).promise();
  }
  
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'OK'
    })
  };
};