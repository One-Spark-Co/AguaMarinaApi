# Lambda Functions - Gestión de Litros de Agua Marina

## Descripción del Negocio

Este sistema gestiona el control de litros de agua para clientes de Agua Marina, integrando con una API externa para:
- Consultar el saldo de litros disponibles por cliente
- Procesar órdenes y actualizar automáticamente los litros de los clientes

### Casos de Uso
1. **Consulta de Saldo**: Un cliente quiere saber cuántos litros tiene disponibles en su cuenta
2. **Procesamiento de Órdenes**: 
   - Cuando un cliente hace una orden de productos
   - El sistema calcula automáticamente los litros basado en la cantidad de productos
   - Se actualiza el saldo del cliente sumando los nuevos litros a los existentes

### Flujo de Negocio
1. Cliente hace una orden de productos
2. Sistema obtiene la orden por ID
3. Calcula litros: `cantidad_productos × litros_por_producto`
4. Obtiene el cliente actual y sus litros existentes
5. Suma los nuevos litros a los existentes
6. Actualiza el cliente con el nuevo total

## Arquitectura Técnica

### Componentes
- **AWS Lambda**: Funciones serverless para la lógica de negocio
- **API Gateway**: Expone endpoints HTTP RESTful
- **API Externa**: Sistema principal de Agua Marina (clientes y órdenes)

### Estructura del Proyecto
```
.
├── .github/
│   └── workflows/          # Configuración de CI/CD
├── get-user-liters.js     # Lambda para consultar saldo de cliente
├── set-user-liters.js     # Lambda para procesar órdenes y actualizar litros
├── package.json           # Dependencias y scripts
└── README.md             # Documentación
```

## API Gateway Endpoints

### GET /litros/{userId}
Obtiene el saldo de litros de un cliente.

**URL**: https://[api-id].execute-api.[region].amazonaws.com/[stage]/litros/{userId}

**Método**: GET

**Parámetros URL**:
- userId (requerido): ID del cliente

**Respuesta Exitosa**:
```json
{
  "message": "Customer 120729851 has 150 liters.",
  "liters": 150
}
```

**Códigos de Respuesta**:
- 200: Éxito
- 400: ID de cliente inválido
- 404: Cliente no encontrado
- 500: Error del servidor

### POST /litros
Procesa una orden y actualiza los litros del cliente.

**URL**: https://[api-id].execute-api.[region].amazonaws.com/[stage]/litros

**Método**: POST

**Body**:
```json
{
  "id": "ORDER_12345"
}
```

**Respuesta Exitosa**:
```json
"Customer 120729851 liters where updated from 100 to 150"
```

**Códigos de Respuesta**:
- 200: Éxito
- 400: ID de orden inválido
- 404: Orden o cliente no encontrado
- 500: Error del servidor

## Variables de Entorno

### Secrets Requeridos

Configura estos secretos en tu repositorio de GitHub (Settings > Secrets > Actions):

| Nombre | Descripción | Ejemplo |
|--------|-------------|---------|
| `AWS_ACCESS_KEY_ID` | Access Key ID de AWS | AKIA... |
| `AWS_SECRET_ACCESS_KEY` | Secret Access Key de AWS | wJalrXUtnFEMI... |
| `AWS_REGION` | Región de AWS | us-east-1 |
| `TIENDA_NUBE_EXTERNAL_API_URL` | URL base de la API externa de Tienda Nube | https://api.nuvemshop.com.br/v1/1946847 |
| `TIENDA_NUBE_AUTH_TOKEN` | Token de autenticación Bearer de Tienda Nube | eyJhbGciOiJIUzI1NiIs... |
| `TIENDA_NUBE_USER_AGENT` | User agent para las requests a Tienda Nube | AguaMarina-Lambda/1.0 |
| `LITERS_PER_PRODUCT` | Litros por producto | 1 |

### Configuración de Environment Variables

Las funciones Lambda reciben estas variables de entorno:

```bash
TIENDA_NUBE_EXTERNAL_API_URL=https://api.nuvemshop.com.br/v1/1946847
TIENDA_NUBE_AUTH_TOKEN=your_bearer_token_here
TIENDA_NUBE_USER_AGENT=AguaMarina-Lambda/1.0
LITERS_PER_PRODUCT=1
```

## Despliegue Automatizado (GitHub Actions)

Este proyecto usa GitHub Actions para el despliegue automático a AWS Lambda. Cada push a la rama `main` desplegará ambas funciones.

### Trigger del Workflow
El workflow se ejecuta cuando se modifican estos archivos:
- `get-user-liters.js`
- `set-user-liters.js`
- `package.json`
- `.github/workflows/main.yml`

### IAM Policy Requerida

El usuario AWS necesita estos permisos mínimos:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "lambda:UpdateFunctionCode",
                "lambda:UpdateFunctionConfiguration"
            ],
            "Resource": [
                "arn:aws:lambda:*:*:function:aguamarina-get-user-liters",
                "arn:aws:lambda:*:*:function:aguamarina-set-user-liters"
            ]
        }
    ]
}
```

## Despliegue Manual

### 1. Preparación de Funciones Lambda

```bash
# Instalar dependencias
npm install

# Empaquetar funciones
npm run zip:get-liters
npm run zip:set-liters
```

### 2. Crear Funciones Lambda en AWS

1. Ir a AWS Console > Lambda
2. Crear dos nuevas funciones:
   - Nombre: `aguamarina-get-user-liters`
   - Nombre: `aguamarina-set-user-liters`
   - Runtime: Node.js 22.x
   - Arquitectura: x86_64
3. Subir los archivos ZIP correspondientes
4. Configurar las environment variables

### 3. Configurar API Gateway

1. Ir a AWS Console > API Gateway
2. Crear nueva API REST
3. Crear recursos y métodos:

```bash
# Crear API
aws apigateway create-rest-api --name "Agua-Marina-API" --region us-east-1

# Obtener ID del recurso raíz
aws apigateway get-resources --rest-api-id [API_ID]

# Crear recurso /litros
aws apigateway create-resource \
  --rest-api-id [API_ID] \
  --parent-id [ROOT_RESOURCE_ID] \
  --path-part "litros"

# Crear método GET con path parameter
aws apigateway put-method \
  --rest-api-id [API_ID] \
  --resource-id [LITROS_RESOURCE_ID] \
  --http-method GET \
  --authorization-type NONE

# Crear método POST
aws apigateway put-method \
  --rest-api-id [API_ID] \
  --resource-id [LITROS_RESOURCE_ID] \
  --http-method POST \
  --authorization-type NONE
```

### 4. Integrar Lambda con API Gateway

1. En cada método de API Gateway:
   - Tipo de integración: Lambda Function
   - Lambda Region: us-east-1
   - Lambda Function: aguamarina-get-user-liters / aguamarina-set-user-liters

2. Configurar los mapeos de integración:

**GET Integration Request** (para /litros/{userId}):
```json
{
  "pathParameters": {
    "userId": "$input.params('userId')"
  }
}
```

**POST Integration Request**:
```json
{
  "body": "$input.json('$')"
}
```

### 5. Desplegar la API

```bash
# Crear stage de desarrollo
aws apigateway create-deployment \
  --rest-api-id [API_ID] \
  --stage-name dev

# Obtener URL base
aws apigateway get-stage \
  --rest-api-id [API_ID] \
  --stage-name dev
```

## Pruebas

### Probar getUserLiters (GET)
```bash
curl -X GET https://[api-id].execute-api.[region].amazonaws.com/dev/litros/120729851
```

**Respuesta esperada**:
```json
{
  "message": "Customer 120729851 has 150 liters.",
  "liters": 150
}
```

### Probar setUserLiters (POST)
```bash
curl -X POST \
  https://[api-id].execute-api.[region].amazonaws.com/dev/litros \
  -H "Content-Type: application/json" \
  -d '{"id":"ORDER_12345"}'
```

**Respuesta esperada**:
```json
"Customer 120729851 liters where updated from 100 to 150"
```

## Lógica de Negocio Detallada

### get-user-liters.js
1. **Validación de entrada**: Extrae y valida el ID del cliente desde path parameters o body
2. **Request a Tienda Nube**: Hace request GET a `${TIENDA_NUBE_EXTERNAL_API_URL}/customers/${userId}` con timeout de 10s
3. **Procesamiento de datos**: Extrae los litros del campo `note` del cliente con validación
4. **Respuesta estructurada**: Retorna mensaje y cantidad de litros en formato JSON
5. **Manejo de errores**: Gestiona errores HTTP específicos (404, 401, 503) y timeouts

### set-user-liters.js
1. **Validación de entrada**: Extrae y valida el ID de la orden desde el body JSON
2. **Obtención de orden**: Request GET a `${TIENDA_NUBE_EXTERNAL_API_URL}/orders/${orderId}` con timeout
3. **Cálculo de litros**: Calcula litros usando `ORDER.products[0].quantity × LITERS_PER_PRODUCT`
4. **Obtención de cliente**: Request GET a `${TIENDA_NUBE_EXTERNAL_API_URL}/customers/${customerId}`
5. **Actualización de litros**: Suma litros actuales + nuevos y actualiza con PUT request
6. **Validaciones**: Verifica que la orden tenga cliente asociado y datos válidos
7. **Respuesta detallada**: Retorna mensaje de confirmación con litros anteriores y nuevos

### Funcionalidades
- **Validación de entrada**: Verificación de IDs y parámetros requeridos
- **Fallbacks seguros**: Valores por defecto para evitar errores
- **Respuestas consistentes**: Formato uniforme de éxito y error
- **CORS configurado**: Headers CORS para integración con frontend
- **Performance optimizada**: Configuración de timeouts y manejo eficiente

## Seguridad

Se recomienda implementar:
1. **Autenticación**: AWS Cognito o JWT para proteger los endpoints
2. **Rate Limiting**: En API Gateway para prevenir abuso
3. **Cifrado**: HTTPS obligatorio para todas las comunicaciones
4. **IAM Roles**: Mínimos privilegios para las funciones Lambda
5. **Secrets Management**: Usar AWS Secrets Manager para tokens sensibles

## Monitoreo y Logs

### CloudWatch Logs
Las funciones generan logs estructurados y detallados:
- **Event received**: Log completo del evento recibido en formato JSON
- **Validation logs**: Logs de validación de entrada y errores
- **API requests**: Logs de requests a Tienda Nube con IDs y parámetros
- **Processing steps**: Logs de cada paso del procesamiento
- **Success responses**: Logs de respuestas exitosas
- **Error details**: Logs detallados de errores con stack traces
- **Performance metrics**: Tiempos de respuesta y timeouts

### Métricas Recomendadas
- Tiempo de respuesta de las funciones
- Tasa de éxito/error
- Número de requests por minuto
- Tiempo de respuesta de la API externa

### Alertas
Configurar alertas para:
- Errores 5xx en las funciones
- Tiempo de respuesta > 10 segundos
- Tasa de error > 5%

## Mantenimiento

### Actualizar Funciones
```bash
# Actualizar código de función
aws lambda update-function-code \
  --function-name aguamarina-get-user-liters \
  --zip-file fileb://get-user-liters.zip

aws lambda update-function-code \
  --function-name aguamarina-set-user-liters \
  --zip-file fileb://set-user-liters.zip
```

### Actualizar Environment Variables
```bash
aws lambda update-function-configuration \
  --function-name aguamarina-get-user-liters \
  --environment Variables='{TIENDA_NUBE_EXTERNAL_API_URL=https://api.nuvemshop.com.br/v1/1946847}'
```

### Limpieza de Recursos
```bash
# Eliminar API Gateway
aws apigateway delete-rest-api --rest-api-id [API_ID]

# Eliminar funciones Lambda
aws lambda delete-function --function-name aguamarina-get-user-liters
aws lambda delete-function --function-name aguamarina-set-user-liters
```

## Troubleshooting

### Errores Comunes

1. **Error 401 Unauthorized**
   - Verificar que `TIENDA_NUBE_AUTH_TOKEN` sea válido
   - Confirmar que el token no haya expirado
   - Revisar logs de autenticación en CloudWatch

2. **Error 404 Not Found**
   - Verificar que el cliente/orden existe en Tienda Nube
   - Confirmar que `TIENDA_NUBE_EXTERNAL_API_URL` sea correcta
   - Validar que los IDs sean válidos

3. **Error 403 Access Denied**
   - Verificar permisos del token de Tienda Nube
   - Confirmar que el token tenga acceso a customers y orders

4. **Error 503 Service Unavailable**
   - La API de Tienda Nube puede estar temporalmente indisponible
   - Verificar conectividad de red
   - Revisar logs de timeout (10 segundos configurado)

5. **Error de Timeout**
   - La API externa puede estar lenta
   - Considerar aumentar el timeout de Lambda (actualmente 10s)
   - Verificar latencia de red

6. **Error de Environment Variables**
   - Verificar que todos los secrets estén configurados en GitHub
   - Confirmar que las variables estén en las funciones Lambda
   - Validar formato de las variables de entorno

7. **Error de Validación de Entrada**
   - Verificar formato del JSON en el body
   - Confirmar que los IDs no estén vacíos
   - Validar que los parámetros requeridos estén presentes

### Logs de Debug
Las funciones incluyen logs estructurados y detallados para debugging:

```javascript
// Log del evento recibido
console.log('Event received:', JSON.stringify(event, null, 2));

// Logs de validación
console.log(`Fetching customer info for user ID: ${userId}`);
console.log(`Processing order ID: ${orderId}`);

// Logs de procesamiento
console.log(`Order has ${orderLiters} liters for customer ${customerId}`);
console.log(`Updating customer ${customerId} from ${currentLiters} to ${updatedLiters} liters`);

// Logs de respuesta
console.log('Success response:', response);

// Logs de error detallados
console.error('Error in handler:', error);
console.error('Invalid or missing user ID');
```

---

> **Nota**: Reemplaza [api-id], [region] y otros placeholders con tus valores reales.
