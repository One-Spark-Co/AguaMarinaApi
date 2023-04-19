
const axios = require('axios');

async function main(args) {
  console.log('> input :', args)
  const API_URL = process.env.API_URL;
  const AUTH_TOKEN = process.env.AUTH_TOKEN;
  const USER_AGENT = process.env.USER_AGENT;
  const USER_ID = args.id;

  try {    
    // * GET USER
    const GET_USER_CONFIG = {
      method: 'get',
      url: `${API_URL}/customers/${USER_ID}`,
      headers: {
        'Content-Type': 'application/json',
        'Authentication': `bearer ${AUTH_TOKEN}`,
        'User-Agent': USER_AGENT
      }
    };
    const CUSTOMER_RESPONSE = await axios(GET_USER_CONFIG);
    const CUSTOMER = CUSTOMER_RESPONSE?.data;

    // * GET USER (LITERS) NOTES FIELD 
    const CUSTOMER_ACTUAL_LITERS = CUSTOMER?.note ? CUSTOMER.note : 0;

    const RESPONSE = {data: {
      message: `Customer ${CUSTOMER?.id} has ${CUSTOMER_ACTUAL_LITERS} liters.`,
      liters: CUSTOMER_ACTUAL_LITERS
    } };
    console.log('> output  :', RESPONSE);
    return {
      statusCode: 200,
      body: RESPONSE.data
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
}