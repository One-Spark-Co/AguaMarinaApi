/**
 * AWS Lambda function para procesar órdenes y actualizar litros de clientes en Tienda Nube
 * 
 * Esta función procesa una orden de Tienda Nube, calcula los litros basado en la cantidad
 * de productos, y actualiza automáticamente los litros del cliente correspondiente.
 * 
 * @param {Object} event - Evento de API Gateway
 * @param {string} event.httpMethod - Método HTTP (POST)
 * @param {string} event.body - Body de la request con ID de la orden
 * @returns {Object} Respuesta con statusCode, headers y body
 */
const axios = require('axios');

// Configuración de CORS para respuestas
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,x-linkedstore-hmac-sha256',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

/**
 * Extrae el método HTTP del evento (compatible con API Gateway v1 y v2)
 * @param {Object} event - Evento de API Gateway
 * @returns {string} Método HTTP
 */
function getHttpMethod(event) {
  // API Gateway v2 (HTTP API)
  if (event.requestContext && event.requestContext.http && event.requestContext.http.method) {
    return event.requestContext.http.method;
  }
  
  // API Gateway v1 (REST API)
  if (event.httpMethod) {
    return event.httpMethod;
  }
  
  return 'GET'; // Default fallback
}

/**
 * Extrae el ID de la orden desde el body del evento
 * Maneja tanto peticiones directas como webhooks de Tienda Nube
 * @param {Object} event - Evento de API Gateway
 * @returns {Object|null} Objeto con orderId y customerId, o null si no se encuentra
 */
function extractOrderInfo(event) {
  if (!event.body) {
    return null;
  }
  
  try {
    const body = JSON.parse(event.body);
    
    // Caso 1: Petición directa con orderId
    if (body.orderId || body.id) {
      return {
        orderId: body.orderId || body.id,
        customerId: null // Se obtendrá de la orden
      };
    }
    
    // Caso 2: Webhook de Tienda Nube
    if (body.event === 'order/paid' && body.data) {
      const orderData = body.data;
      return {
        orderId: orderData.id?.toString(),
        customerId: orderData.customer?.id?.toString()
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing JSON body:', error.message);
    return null;
  }
}

/**
 * Valida que la información de la orden sea válida
 * @param {Object} orderInfo - Información de la orden
 * @returns {boolean} true si es válido, false en caso contrario
 */
function isValidOrderInfo(orderInfo) {
  return orderInfo && 
         orderInfo.orderId && 
         typeof orderInfo.orderId === 'string' && 
         orderInfo.orderId.trim().length > 0;
}

/**
 * Obtiene información de una orden desde Tienda Nube
 * @param {string} orderId - ID de la orden
 * @returns {Object} Información de la orden
 */
async function getOrderInfo(orderId) {
  const config = {
    method: 'get',
    url: `${process.env.TIENDA_NUBE_EXTERNAL_API_URL}/orders/${orderId}`,
    headers: {
      'Content-Type': 'application/json',
      'Authentication': `bearer ${process.env.TIENDA_NUBE_AUTH_TOKEN}`,
      'User-Agent': process.env.TIENDA_NUBE_USER_AGENT
    },
    timeout: 10000 // 10 segundos timeout
  };
  
  const response = await axios(config);
  return response.data;
}

/**
 * Obtiene información del cliente desde Tienda Nube
 * @param {string} customerId - ID del cliente
 * @returns {Object} Información del cliente
 */
async function getCustomerInfo(customerId) {
  const config = {
    method: 'get',
    url: `${process.env.TIENDA_NUBE_EXTERNAL_API_URL}/customers/${customerId}`,
    headers: {
      'Content-Type': 'application/json',
      'Authentication': `bearer ${process.env.TIENDA_NUBE_AUTH_TOKEN}`,
      'User-Agent': process.env.TIENDA_NUBE_USER_AGENT
    },
    timeout: 10000 // 10 segundos timeout
  };
  
  const response = await axios(config);
  return response.data;
}

/**
 * Calcula los litros totales de una orden
 * @param {Object} order - Información de la orden
 * @returns {number} Total de litros calculados
 */
function calculateOrderLiters(order) {
  const litersPerProduct = parseInt(process.env.LITERS_PER_PRODUCT) || 1;
  const quantity = order?.products?.[0]?.quantity || 0;
  
  return quantity * litersPerProduct;
}

/**
 * Actualiza los litros del cliente en Tienda Nube
 * @param {string} customerId - ID del cliente
 * @param {number} newLiters - Nuevo total de litros
 * @returns {Object} Respuesta de la actualización
 */
async function updateCustomerLiters(customerId, newLiters) {
  const updateData = {
    id: customerId,
    note: newLiters.toString()
  };
  
  const config = {
    method: 'put',
    url: `${process.env.TIENDA_NUBE_EXTERNAL_API_URL}/customers/${customerId}`,
    headers: {
      'Content-Type': 'application/json',
      'Authentication': `bearer ${process.env.TIENDA_NUBE_AUTH_TOKEN}`,
      'User-Agent': process.env.TIENDA_NUBE_USER_AGENT
    },
    data: updateData,
    timeout: 10000 // 10 segundos timeout
  };
  
  const response = await axios(config);
  return response.data;
}

/**
 * Construye la respuesta exitosa
 * @param {Object} customer - Información del cliente actualizada
 * @param {number} previousLiters - Litros anteriores
 * @returns {string} Mensaje de confirmación
 */
function buildSuccessResponse(customer, previousLiters) {
  const newLiters = customer?.note || 0;
  return `Customer ${customer?.id} liters where updated from ${previousLiters} to ${newLiters}`;
}

/**
 * Construye respuesta de error
 * @param {number} statusCode - Código de estado HTTP
 * @param {string} message - Mensaje de error
 * @returns {Object} Respuesta de error formateada
 */
function buildErrorResponse(statusCode, message) {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify({ error: message })
  };
}

/**
 * Handler principal de la función Lambda
 */
exports.handler = async (event) => {
  console.log('Event received:', JSON.stringify(event, null, 2));
  
  // Obtener el método HTTP de forma compatible con API Gateway v1 y v2
  const httpMethod = getHttpMethod(event);
  console.log('HTTP Method:', httpMethod);
  
  // Manejar preflight CORS
  if (httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: ''
    };
  }
  
  // Validar método HTTP
  if (httpMethod !== 'POST') {
    console.log(`Method ${httpMethod} not allowed, only POST is supported`);
    return buildErrorResponse(405, 'Method Not Allowed');
  }
  
  try {
    // Extraer y validar información de la orden
    const orderInfo = extractOrderInfo(event);
    
    if (!isValidOrderInfo(orderInfo)) {
      console.error('Invalid or missing order information');
      return buildErrorResponse(400, 'Missing or invalid order information');
    }
    
    const { orderId, customerId: webhookCustomerId } = orderInfo;
    console.log(`Processing order ID: ${orderId}`);
    
    // Paso 1: Obtener información de la orden
    const order = await getOrderInfo(orderId);
    
    if (!order) {
      console.error(`Order not found for ID: ${orderId}`);
      return buildErrorResponse(404, 'Order not found');
    }
    
    // Paso 2: Extraer información relevante de la orden
    const orderLiters = calculateOrderLiters(order);
    const customerId = webhookCustomerId || order?.customer?.id;
    
    if (!customerId) {
      console.error('No customer found in order');
      return buildErrorResponse(400, 'Order has no associated customer');
    }
    
    console.log(`Order has ${orderLiters} liters for customer ${customerId}`);
    
    // Paso 3: Obtener información actual del cliente
    const customer = await getCustomerInfo(customerId);
    
    if (!customer) {
      console.error(`Customer not found for ID: ${customerId}`);
      return buildErrorResponse(404, 'Customer not found');
    }
    
    // Paso 4: Calcular nuevos litros
    const currentLiters = parseInt(customer?.note) || 0;
    const updatedLiters = currentLiters + orderLiters;
    
    console.log(`Updating customer ${customerId} from ${currentLiters} to ${updatedLiters} liters`);
    
    // Paso 5: Actualizar cliente con nuevos litros
    const updatedCustomer = await updateCustomerLiters(customerId, updatedLiters);
    
    // Paso 6: Construir respuesta exitosa
    const response = buildSuccessResponse(updatedCustomer, currentLiters);
    console.log('Success response:', response);
    
    // Para webhooks, siempre responder con 200 para evitar reintentos
    const responseBody = {
      message: response,
      orderId: orderId,
      customerId: customerId,
      liters: updatedLiters
    };
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(responseBody)
    };
    
  } catch (error) {
    console.error('Error in handler:', error);
    
    // Manejar errores específicos de axios
    if (error.response) {
      const statusCode = error.response.status;
      let message;
      
      switch (statusCode) {
        case 404:
          message = 'Order or customer not found';
          break;
        case 401:
          message = 'Authentication failed';
          break;
        case 403:
          message = 'Access denied';
          break;
        default:
          message = `External API error: ${statusCode}`;
      }
      
      return buildErrorResponse(statusCode, message);
    }
    
    // Error de timeout o conexión
    if (error.code === 'ECONNABORTED' || error.code === 'ENOTFOUND') {
      return buildErrorResponse(503, 'External service unavailable');
    }
    
    // Error genérico
    return buildErrorResponse(500, 'Internal server error');
  }
};
