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
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

/**
 * Extrae el ID de la orden desde el body del evento
 * @param {Object} event - Evento de API Gateway
 * @returns {string|null} ID de la orden o null si no se encuentra
 */
function extractOrderId(event) {
  if (!event.body) {
    return null;
  }
  
  try {
    const body = JSON.parse(event.body);
    return body.id;
  } catch (error) {
    console.error('Error parsing JSON body:', error.message);
    return null;
  }
}

/**
 * Valida que el ID de la orden sea válido
 * @param {string} orderId - ID de la orden a validar
 * @returns {boolean} true si es válido, false en caso contrario
 */
function isValidOrderId(orderId) {
  return orderId && typeof orderId === 'string' && orderId.trim().length > 0;
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
  
  // Manejar preflight CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: ''
    };
  }
  
  // Validar método HTTP
  if (event.httpMethod !== 'POST') {
    return buildErrorResponse(405, 'Method Not Allowed');
  }
  
  try {
    // Extraer y validar ID de la orden
    const orderId = extractOrderId(event);
    
    if (!isValidOrderId(orderId)) {
      console.error('Invalid or missing order ID');
      return buildErrorResponse(400, 'Missing or invalid order ID');
    }
    
    console.log(`Processing order ID: ${orderId}`);
    
    // Paso 1: Obtener información de la orden
    const order = await getOrderInfo(orderId);
    
    if (!order) {
      console.error(`Order not found for ID: ${orderId}`);
      return buildErrorResponse(404, 'Order not found');
    }
    
    // Paso 2: Extraer información relevante de la orden
    const orderLiters = calculateOrderLiters(order);
    const customerId = order?.customer?.id;
    
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
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(response)
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
