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

#### Procesamiento de Órdenes (set-user-liters)
1. Cliente hace una orden de productos
2. Sistema obtiene la orden por ID
3. Calcula litros: `cantidad_productos × litros_por_producto`
4. Obtiene el cliente actual y sus litros existentes
5. Suma los nuevos litros a los existentes
6. Actualiza el cliente con el nuevo total

#### Consulta de Saldo (get-user-liters)
1. Usuario accede a una página web
2. `renderLitersComponent.html` se ejecuta en el navegador
3. Hace petición al API Gateway
4. API Gateway invoca la función Lambda `get-user-liters`
5. Lambda consulta la API externa para obtener los litros del cliente
6. Respuesta se devuelve al frontend
7. `renderLitersComponent.html` muestra los litros en la página

## Arquitectura Técnica

### Componentes
- **AWS Lambda**: Funciones serverless para la lógica de negocio
- **API Gateway**: Expone endpoints HTTP RESTful
- **API Externa**: Sistema principal de Agua Marina (clientes y órdenes)
- **Frontend**: Scripts JavaScript para mostrar información en páginas web

### Estructura del Proyecto
```
.
├── .github/
│   └── workflows/          # Configuración de CI/CD
├── get-user-liters.js     # Lambda para consultar saldo de cliente
├── set-user-liters.js     # Lambda para procesar órdenes y actualizar litros
├── renderLitersComponent.html # Script frontend (HTML+JS) para mostrar litros en páginas web
├── package.json           # Dependencias y scripts de despliegue
├── .env.example           # Template de variables de entorno
├── .env                   # Variables de entorno locales (no en git)
└── README.md             # Documentación
```

## API Gateway Endpoints

### GET /get-user-liters
Obtiene el saldo de litros de un cliente.

**URL**: `https://ff8xt2bfj7.execute-api.us-east-1.amazonaws.com/get-user-liters`

### POST /set-user-liters
Procesa una orden y actualiza los litros del cliente. **Maneja tanto peticiones directas como webhooks de Tienda Nube**.

**URL**: `https://ff8xt2bfj7.execute-api.us-east-1.amazonaws.com/set-user-liters`

#### Petición directa:
```json
{
  "orderId": "12345"
}
```

#### Webhook de Tienda Nube (order/paid):
```json
{
  "event": "order/paid",
  "data": {
    "id": 12345,
    "customer": {
      "id": 67890
    }
  }
}
```

**Método**: GET

**Body**:
```json
{
  "id": "120729851"
}
```

**Respuesta Exitosa**:
```json
{
  "message": "Customer 120729851 has 25 liters.",
  "liters": 25
}
```

**Códigos de Respuesta**:
- 200: Éxito
- 400: ID de cliente inválido
- 404: Cliente no encontrado
- 500: Error del servidor

### POST /set-user-liters
Procesa una orden y actualiza los litros del cliente.

**URL**: `https://ff8xt2bfj7.execute-api.us-east-1.amazonaws.com/set-user-liters`

**Método**: POST

**Body**:
```json
{
  "orderId": "12345"
}
```

**Respuesta Exitosa**:
```json
{
  "message": "Order 12345 processed successfully. Customer now has 30 liters.",
  "liters": 30
}
```

**Códigos de Respuesta**:
- 200: Éxito
- 400: ID de orden inválido
- 404: Orden o cliente no encontrado
- 500: Error del servidor

## Frontend Integration - renderLitersComponent.html

### Propósito
El archivo `renderLitersComponent.html` contiene un **script de frontend** (inline) que se ejecuta en el navegador para mostrar dinámicamente la información de litros de un cliente en páginas web.

### Funcionalidad
1. **Consulta de datos**: Hace una petición HTTP POST a la función Lambda `get-user-liters`
2. **Renderizado dinámico**: Modifica el DOM de la página para mostrar la información
3. **Integración visual**: Agrega un ícono y texto con los litros del cliente

### Relación con las Funciones Lambda
- **Consume**: La función Lambda `get-user-liters` a través del API Gateway
- **Endpoint utilizado**: `https://ff8xt2bfj7.execute-api.us-east-1.amazonaws.com/get-user-liters`
- **Método**: POST con body `{"id": "<CUSTOMER_ID>"}`

### Cómo funciona
```html
<script>
const customerId = LS.customer;
if (customerId != null && window.location.pathname === "/account/"){
  const endpoint = "https://ff8xt2bfj7.execute-api.us-east-1.amazonaws.com/get-user-liters";
  fetch(endpoint, {
    method: "POST",
    body: JSON.stringify({ id: customerId }),
    headers: { "Content-Type": "application/json" }
  })
  .then(r => r.json())
  .then(data => {
    // Renderiza el balance y el texto con los litros
  });
}
</script>
```

### Instalación en Tienda Nube
1. **Acceder a la plataforma de administración** de Tienda Nube
2. **Navegar a**: Configuración → Código Externo → Códigos de Tracking
3. **Copiar y pegar** el contenido completo del archivo `renderLitersComponent.html`
4. **Guardar** la configuración

### Consideraciones para el funcionamiento correcto
1. **Dependencias del DOM**:
   - El script requiere que exista un elemento con clase `.visible-when-content-ready`
   - Necesita un elemento con clase `.contact-data` que contenga al menos 2 elementos hijos
   - La variable global `LS.customer` debe estar disponible (proporcionada por Tienda Nube)

2. **Contexto de ejecución**:
   - Solo se ejecuta en la página `/account/` (cuenta del cliente)
   - Requiere que el cliente esté autenticado para obtener `LS.customer`
   - El script debe cargarse después de que el DOM esté listo

3. **Requisitos de red**:
   - El endpoint de AWS API Gateway debe estar accesible desde el navegador
   - Se requiere conexión a internet para hacer la petición HTTP
   - El dominio debe tener permisos CORS configurados en API Gateway

4. **Estructura esperada del DOM**:
   ```html
   <div class="visible-when-content-ready">
     <!-- El script insertará el balance aquí -->
   </div>
   <div class="contact-data">
     <div>...</div>  <!-- Primer hijo: se agregará el ícono -->
     <div>...</div>  <!-- Segundo hijo: se agregará el texto -->
   </div>
   ```

### Uso en páginas web
1. **El script se ejecuta automáticamente** cuando se cumple la condición
2. **Configura el customerId** automáticamente usando `LS.customer` provisto por Tienda Nube
3. **Modifica el DOM dinámicamente**:
   - Busca un elemento con clase `.visible-when-content-ready`
   - Busca un elemento con clase `.contact-data`
   - Agrega un ícono de gota de agua
   - Muestra los litros del cliente

### Resultado visual
```
💧 Litros del usuario: 25
```

## Configuración de Webhooks en Tienda Nube

### Configurar Webhook para order/paid

Para que las órdenes se procesen automáticamente cuando se complete una compra, configura el webhook en Tienda Nube:

1. **Obtén tu ACCESS_TOKEN** de la aplicación de Tienda Nube
2. **Ejecuta el comando curl** para registrar el webhook:

```bash
curl -X POST 'https://api.tiendanube.com/2025-03/webhooks' \
  -H 'Authentication: bearer <ACCESS_TOKEN>' \
  -H 'User-Agent: <TuApp> <tu-email>' \
  -H 'Content-Type: application/json' \
  -d '{
    "event": "order/paid",
    "url": "https://ff8xt2bfj7.execute-api.us-east-1.amazonaws.com/set-user-liters"
  }'
```

### Consideraciones importantes:
- **Endpoint HTTPS**: El endpoint debe ser HTTPS y no puede ser localhost
- **Timeout**: Tienda Nube espera respuesta 2XX en ~10 segundos
- **Reintentos**: Si no respondes con 2XX, Tienda Nube reintentará automáticamente
- **Cabecera de firma**: Tienda Nube incluye `x-linkedstore-hmac-sha256` para verificación
- **Procesamiento automático**: Cuando se complete una compra, el webhook llamará automáticamente a `set-user-liters`

## Pruebas de los Endpoints

### Probar GET /get-user-liters
```bash
curl -X GET "https://ff8xt2bfj7.execute-api.us-east-1.amazonaws.com/get-user-liters" \
  -H "Content-Type: application/json" \
  -d '{"id": "120729851"}'
```

**Respuesta esperada**:
```json
{
  "message": "Customer 120729851 has 1 liters.",
  "liters": 1
}
```

### Probar POST /set-user-liters
```bash
curl -X POST "https://ff8xt2bfj7.execute-api.us-east-1.amazonaws.com/set-user-liters" \
  -H "Content-Type: application/json" \
  -d '{"orderId": "12345"}'
```

**Respuesta esperada**:
```json
{
  "message": "Order 12345 processed successfully. Customer now has 6 liters.",
  "liters": 6
}
```

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

Este proyecto usa GitHub Actions para el despliegue automático a AWS Lambda. Cada push a la rama `main` desplegará automáticamente ambas funciones con sus variables de entorno configuradas.

### Trigger del Workflow
El workflow se ejecuta con **cualquier push** a la rama `main`, sin importar qué archivos cambien.

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
                "lambda:UpdateFunctionConfiguration",
                "lambda:GetFunction",
                "lambda:GetFunctionConfiguration"
            ],
            "Resource": [
                "arn:aws:lambda:*:*:function:aguamarina-get-user-liters",
                "arn:aws:lambda:*:*:function:aguamarina-set-user-liters"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "iam:PassRole"
            ],
            "Resource": "*"
        }
    ]
}
```

## Scripts Disponibles

### Scripts de Package.json

El proyecto incluye varios scripts útiles para desarrollo y despliegue:

```bash
# Empaquetar funciones Lambda
npm run zip:get-liters      # Crea get-user-liters.zip
npm run zip:set-liters      # Crea set-user-liters.zip

# Desplegar funciones Lambda (solo código, sin variables de entorno)
npm run deploy:get-liters   # Despliega aguamarina-get-user-liters
npm run deploy:set-liters   # Despliega aguamarina-set-user-liters
```

**Nota**: Los scripts de despliegue solo actualizan el código. Para un despliegue completo con variables de entorno, usa el workflow de GitHub Actions.

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
4. **Nota**: Las environment variables se configurarán automáticamente en el primer despliegue

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

### CI/CD y Despliegue
- **Actions oficiales de AWS**: Uso de `aws-actions/aws-lambda-deploy` para despliegue confiable
- **Environment variables automáticas**: Configuración automática de variables de entorno
- **Despliegue continuo**: Cada push a `main` despliega automáticamente
- **Configuración simplificada**: No requiere archivos `.env` en el ZIP

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
# Actualizar código de función usando scripts de package.json
npm run deploy:get-liters
npm run deploy:set-liters

# O manualmente con AWS CLI
aws lambda update-function-code \
  --function-name aguamarina-get-user-liters \
  --zip-file fileb://get-user-liters.zip

aws lambda update-function-code \
  --function-name aguamarina-set-user-liters \
  --zip-file fileb://set-user-liters.zip
```

### Actualizar Environment Variables
```bash
# Las variables de entorno se configuran automáticamente en cada despliegue
# No es necesario configurarlas manualmente
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
   - Confirmar que las variables se configuraron automáticamente en las funciones Lambda
   - Validar que el workflow se ejecutó correctamente

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
