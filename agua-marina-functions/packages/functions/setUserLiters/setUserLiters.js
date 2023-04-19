
const axios = require('axios');

async function main(args) {
  console.log('> input :', args)
  const API_URL = process.env.API_URL;
  const AUTH_TOKEN = process.env.AUTH_TOKEN;
  const USER_AGENT = process.env.USER_AGENT;
  const ORDER_ID = args.id;
  const LITERS_PER_PRODUCT = parseInt(process.env.LITERS_PER_PRODUCT);

  console.log('[NAVA] LITERS_PER_PRODUCT :', LITERS_PER_PRODUCT);

  try {
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
    const ORDER_RESPONSE = await axios(GET_ORDER_CONFIG);
    const ORDER = ORDER_RESPONSE?.data;

    // * GET DATA FROM ORDER
    const ORDER_LITERS = ORDER?.products[0]?.quantity * LITERS_PER_PRODUCT;
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
    const CUSTOMER_RESPONSE = await axios(GET_USER_CONFIG);
    const CUSTOMER = CUSTOMER_RESPONSE?.data;

    // * GET PRODUCT BOUGHT
    // ! POSSIBLE LOSS OF DATA (LITERS)
    const CUSTOMER_ACTUAL_LITERS = CUSTOMER?.note >= 0 ? CUSTOMER.note : 0;
    const CUSTOMER_UPDATED_LITERS = parseInt(CUSTOMER_ACTUAL_LITERS) + parseInt(ORDER_LITERS);
    
    // * UPDATE USER INFORMATION
    // DISCOVER HOW TO MAKE CORRECTLY THIS REQUEST
    const UPDATE_USER_OBJECT = {
      "id": CUSTOMER?.id,
      "note": CUSTOMER_UPDATED_LITERS.toString()
    }

    const UPDATE_USER_CONFIG = {
      method: 'put',
      url: `${API_URL}/customers/${ORDER_CUSTOMER?.id}`,
      headers: {
        'Content-Type': 'application/json',
        'Authentication': `bearer ${AUTH_TOKEN}`,
        'User-Agent': USER_AGENT
      },
      data: UPDATE_USER_OBJECT 
    };
    const CUSTOMER_UPDATED_RESPONSE = await axios(UPDATE_USER_CONFIG);
    const CUSTOMER_UPDATED = CUSTOMER_UPDATED_RESPONSE?.data;

    const RESPONSE = {data: `Customer ${CUSTOMER?.id} liters where updated from ${CUSTOMER_ACTUAL_LITERS} to ${CUSTOMER_UPDATED?.note}` };
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