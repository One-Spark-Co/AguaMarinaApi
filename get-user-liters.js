/**
 * AWS Lambda function para obtener litros de un cliente desde Tienda Nube
 * 
 * Esta función consulta la API de Tienda Nube para obtener los litros disponibles
 * de un cliente específico, usando el campo 'note' del cliente.
 * 
 * @param {Object} event - Evento de API Gateway
 * @param {string} event.httpMethod - Método HTTP (GET/POST)
 * @param {Object} event.pathParameters - Parámetros de la URL
 * @param {string} event.pathParameters.userId - ID del cliente
 * @param {string} event.body - Body de la request (para POST)
 * @returns {Object} Respuesta con statusCode, headers y body
 */
const axios = require('axios');

// Configuración de CORS para respuestas
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

/**
 * Extrae el ID del cliente desde diferentes fuentes del evento
 * @param {Object} event - Evento de API Gateway
 * @returns {string|null} ID del cliente o null si no se encuentra
 */
function extractUserId(event) {
  // Prioridad 1: Query parameters (GET /get-user-liters?userId=123)
  if (event.queryStringParameters?.userId) {
    return event.queryStringParameters.userId;
  }
  
  // Prioridad 2: Path parameters (GET /litros/{userId})
  if (event.pathParameters?.userId) {
    return event.pathParameters.userId;
  }
  
  // Prioridad 3: Body JSON (POST /litros)
  if (event.body) {
    try {
      const body = JSON.parse(event.body);
      return body.id;
    } catch (error) {
      console.error('Error parsing JSON body:', error.message);
      return null;
    }
  }
  
  return null;
}

/**
 * Valida que el ID del cliente sea válido
 * @param {string} userId - ID del cliente a validar
 * @returns {boolean} true si es válido, false en caso contrario
 */
function isValidUserId(userId) {
  return userId && typeof userId === 'string' && userId.trim().length > 0;
}

/**
 * Obtiene información del cliente desde Tienda Nube
 * @param {string} userId - ID del cliente
 * @returns {Object} Información del cliente
 */
async function getCustomerInfo(userId) {
  const config = {
    method: 'get',
    url: `${process.env.TIENDA_NUBE_EXTERNAL_API_URL}/customers/${userId}`,
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
 * Construye la respuesta exitosa
 * @param {Object} customer - Información del cliente
 * @returns {Object} Respuesta formateada
 */
function buildSuccessResponse(customer) {
  const liters = customer?.note || 0;
  
  return {
    message: `Customer ${customer?.id} has ${liters} liters.`,
    liters: parseInt(liters) || 0
  };
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
  
  try {
    // Extraer y validar ID del cliente
    const userId = extractUserId(event);
    
    if (!isValidUserId(userId)) {
      console.error('Invalid or missing user ID');
      return buildErrorResponse(400, 'Missing or invalid user ID');
    }
    
    console.log(`Fetching customer info for user ID: ${userId}`);
    
    // Obtener información del cliente
    const customer = await getCustomerInfo(userId);
    
    if (!customer) {
      console.error(`Customer not found for ID: ${userId}`);
      return buildErrorResponse(404, 'Customer not found');
    }
    
    // Construir respuesta exitosa
    const response = buildSuccessResponse(customer);
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
      const message = error.response.status === 404 
        ? 'Customer not found' 
        : `External API error: ${error.response.status}`;
      
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
