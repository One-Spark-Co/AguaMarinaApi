
const axios = require('axios');

async function main(args) {
  /*
    Get order id
    Get order
    Get user from order
    Get product bought liters from order
    Sum actual user liters with the ones bought
    Update user information
  */
  console.log('[NAVA] args :', args);
  console.log('[NAVA] process.env :', process.env.API_URL);
  const API_URL = process.env.API_URL;
  const AUTH_TOKEN = process.env.AUTH_TOKEN;
  const USER_AGENT = process.env.USER_AGENT;
  const ORDER_ID = args.orderId;

  try {
  
    const RESPONSE = {data: 'TESTING PHASE'};
    /*
    // * GET ORDER
    const GET_ORDER_CONFIG = {
      method: 'get',
      url: `${API_URL}/orders/${ORDER_ID}`,
      headers: {
        'Content-Type': 'application/json',
        'Authentication': `bearer ${AUTH_TOKEN}`,
        'User-Agent': USER_AGENT
      }
    };
    const ORDER = await axios(GET_ORDER_CONFIG);
    
    // * GET DATA FROM ORDER
    const ORDER_LITERS = ORDER?.products[0]?.quantity;
    const ORDER_CUSTOMER = ORDER?.customer;
    
    // * GET USER
    const GET_USER_CONFIG = {
      method: 'get',
      url: `${API_URL}/customers/${ORDER_CUSTOMER?.id}`,
      headers: {
        'Content-Type': 'application/json',
        'Authentication': `bearer ${AUTH_TOKEN}`,
        'User-Agent': USER_AGENT
      }
    };
    const CUSTOMER = await axios(GET_USER_CONFIG);
    
    // * GET PRODUCT BOUGHT
    const CUSTOMER_ACTUAL_LITERS = CUSTOMER?.extra?.liters ? CUSTOMER.extra.liters : 0;
    const CUSTOMER_UPDATED_LITERS = CUSTOMER_ACTUAL_LITERS + ORDER_LITERS;
    
    // * UPDATE USER INFORMATION
    const UPDATE_USER_OBJECT = {
      "extra": {
        "liters": CUSTOMER_UPDATED_LITERS
      }
    }
    const UPDATE_USER_CONFIG = {
      method: 'put',
      url: `${API_URL}/customers/${ORDER_CUSTOMER?.id}`,
      headers: {
        'Content-Type': 'application/json',
        'Authentication': `bearer ${AUTH_TOKEN}`,
        'User-Agent': USER_AGENT
      }
    };
    const CUSTOMER_UPDATED = await axios(UPDATE_USER_CONFIG);
    */

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