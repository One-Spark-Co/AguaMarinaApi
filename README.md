# Agua Marina API - Sistema de Gestión de Litros

## Descripción del Negocio

Sistema para gestionar los litros de agua disponibles de los clientes de Agua Marina. El sistema permite:

- **Consultar litros disponibles**: Los clientes pueden ver su balance de litros en su cuenta de Tienda Nube
- **Actualizar litros automáticamente**: Cuando se completa una compra, se actualizan automáticamente los litros del cliente
- **Integración con Tienda Nube**: Utiliza la API externa de Tienda Nube para gestionar clientes y órdenes

## Arquitectura

- **AWS Lambda**: Funciones serverless para la lógica de negocio
- **AWS API Gateway**: Exposición de endpoints HTTP
- **Tienda Nube External API**: API externa para gestionar clientes y órdenes
- **Frontend JavaScript**: Script embebido en Tienda Nube para mostrar litros

## Endpoints de API Gateway

### GET /get-user-liters
Obtiene los litros disponibles de un cliente específico.

**URL**: `https://ff8xt2bfj7.execute-api.us-east-1.amazonaws.com/get-user-liters`

**Método**: GET

**Parámetros de Query**:
- `userId` (string, requerido): ID del cliente en Tienda Nube

**Ejemplo de Request**:
```bash
curl -X GET "https://ff8xt2bfj7.execute-api.us-east-1.amazonaws.com/get-user-liters?userId=120732076" \
  -H "Content-Type: application/json"
```

**Ejemplo de Response**:
```json
{
  "message": "Customer 120732076 has 5 liters.",
  "liters": 5
}
```

### POST /set-user-liters
Procesa una orden y actualiza los litros del cliente.

**URL**: `https://ff8xt2bfj7.execute-api.us-east-1.amazonaws.com/set-user-liters`

**Método**: POST

**Body**:
```json
{
  "orderId": "1605228171"
}
```

**Ejemplo de Request**:
```bash
curl -X POST "https://ff8xt2bfj7.execute-api.us-east-1.amazonaws.com/set-user-liters" \
  -H "Content-Type: application/json" \
  -d '{"orderId": "1605228171"}'
```

**Ejemplo de Response**:
```json
{
  "message": "Customer 120732076 liters updated successfully. New balance: 6 liters.",
  "customerId": "120732076",
  "orderId": "1605228171",
  "litersAdded": 1,
  "newBalance": 6
}
```

## Variables de Entorno Requeridas

### GitHub Secrets
Configurar los siguientes secrets en GitHub Actions:

- `AWS_ACCESS_KEY_ID`: Access Key ID del usuario IAM
- `AWS_SECRET_ACCESS_KEY`: Secret Access Key del usuario IAM
- `AWS_REGION`: Región de AWS (ej: us-east-1)
- `TIENDA_NUBE_EXTERNAL_API_URL`: URL de la API de Tienda Nube (ej: https://api.tiendanube.com/v1/1946847)
- `TIENDA_NUBE_AUTH_TOKEN`: Token de autenticación de Tienda Nube
- `TIENDA_NUBE_USER_AGENT`: User Agent para las peticiones (ej: Aguamarina API (jorgenavadelapena@gmail.com))
- `LITERS_PER_PRODUCT`: Litros por producto (ej: 1)

## Lógica de Negocio

### get-user-liters.js
1. Recibe el `userId` como parámetro de query string
2. Consulta la información del cliente en Tienda Nube usando `GET /customers/{userId}`
3. Extrae los litros del campo `note` del cliente
4. Retorna el balance de litros disponibles

### set-user-liters.js
1. Recibe el `orderId` en el body de la petición
2. Consulta los detalles de la orden en Tienda Nube usando `GET /orders/{orderId}`
3. Calcula los litros basado en `LITERS_PER_PRODUCT` y la cantidad de productos
4. Obtiene la información actual del cliente
5. Actualiza el campo `note` del cliente con el nuevo balance de litros
6. Retorna el resultado de la actualización

## Mejoras Implementadas

### Corrección de CORS y Métodos HTTP
- **Problema identificado**: El API Gateway tenía configurado `GET /get-user-liters` pero el frontend hacía peticiones `POST`
- **Solución**: Actualizado el script frontend para usar `GET` con parámetros de query string
- **CORS configurado**: Headers correctos para permitir peticiones desde `https://www.a118.mx`

### Manejo de Parámetros
- **Query Parameters**: `get-user-liters` ahora acepta `userId` como query parameter
- **Body JSON**: `set-user-liters` mantiene el `orderId` en el body
- **Compatibilidad**: Ambas funciones mantienen compatibilidad con diferentes formatos de entrada

## CI/CD y Despliegue

El proyecto utiliza GitHub Actions para despliegue automático:

1. **Trigger**: Se ejecuta en cada push a la rama `main`
2. **AWS Credentials**: Configura credenciales usando `aws-actions/configure-aws-credentials@v4`
3. **Deployment**: Usa `aws-actions/aws-lambda-deploy@v1.1.0` para desplegar funciones
4. **Environment Variables**: Inyecta automáticamente las variables de entorno desde GitHub Secrets
5. **Handler Configuration**: Actualiza automáticamente los handlers de las funciones Lambda

## Scripts de package.json

- `npm ci`: Instala dependencias
- `npm run build`: Build del proyecto (si existe)
- ZIP automático: Crea archivos ZIP para despliegue

## Frontend Integration - renderLitersComponent.html

### Propósito
Script JavaScript que se embebe en la página de cuenta de Tienda Nube para mostrar el balance de litros del cliente.

### Funcionalidad
- Detecta automáticamente el ID del cliente desde `LS.customer`
- Hace una petición GET al endpoint `/get-user-liters` con el `userId`
- Renderiza dinámicamente un componente "BALANCE" en la página
- Maneja errores y muestra mensajes apropiados

### Relación con Lambda
- Consume el endpoint `GET /get-user-liters` de AWS API Gateway
- Pasa el `customerId` como parámetro de query string
- Recibe y muestra el balance de litros en tiempo real

### Cómo Funciona
1. Se ejecuta solo en la página `/account/` de Tienda Nube
2. Obtiene el `customerId` del objeto global `LS.customer`
3. Construye la URL con el parámetro de query: `?userId=${customerId}`
4. Hace petición GET al endpoint de AWS API Gateway
5. Inserta dinámicamente el componente de balance en el DOM
6. Actualiza el contenido con los litros recibidos

### Instalación en Tienda Nube
1. Ir a **Tienda Nube Partners** → **Aplicaciones** → **Agua Marina API**
2. Copiar el contenido del archivo `renderLitersComponent.html`
3. En **Tienda Nube**, ir a **Configuración** → **Código personalizado**
4. Agregar el script en la sección **JavaScript** del tema
5. Guardar cambios

### Consideraciones Críticas del DOM
- **Target Section**: El script busca `section.account-page.top-line.bottom-line`
- **Insertion Point**: Coloca el componente después de esta sección
- **Styling**: Aplica estilos CSS inline para consistencia visual
- **Error Handling**: Muestra mensajes de error si no puede cargar los datos

## Configuración de Aplicación en Tienda Nube Partners

### Detalles de la Aplicación
- **Nombre**: Agua Marina API
- **Descripción**: Sistema de gestión de litros de agua
- **ACCESS_TOKEN**: `29ea5aba75ffc1888cad777322f24db83e430f0e`
- **Store ID**: 1946847

### Permisos Requeridos
- `customers_read`: Para leer información de clientes
- `customers_write`: Para actualizar litros de clientes
- `orders_read`: Para leer detalles de órdenes

## Configuración de Webhooks en Tienda Nube

### Webhook para order/paid
Registra un webhook para procesar automáticamente las órdenes pagadas:

```bash
curl -X POST "https://api.tiendanube.com/v1/1946847/webhooks" \
  -H "Content-Type: application/json" \
  -H "Authentication: bearer 29ea5aba75ffc1888cad777322f24db83e430f0e" \
  -H "User-Agent: Aguamarina API (jorgenavadelapena@gmail.com)" \
  -d '{
    "event": "order/paid",
    "url": "https://ff8xt2bfj7.execute-api.us-east-1.amazonaws.com/set-user-liters"
  }'
```

### Verificar Webhooks Existentes
```bash
curl -X GET "https://api.tiendanube.com/v1/1946847/webhooks" \
  -H "Authentication: bearer 29ea5aba75ffc1888cad777322f24db83e430f0e" \
  -H "User-Agent: Aguamarina API (jorgenavadelapena@gmail.com)"
```

## Troubleshooting

### Errores Comunes

1. **CORS Error**: Verificar que el API Gateway tenga CORS configurado correctamente
2. **404 Not Found**: Confirmar que las rutas estén configuradas en API Gateway
3. **401 Unauthorized**: Verificar que el ACCESS_TOKEN de Tienda Nube sea válido
4. **405 Method Not Allowed**: Asegurar que el método HTTP coincida con la configuración

### Logs y Monitoreo
- **CloudWatch Logs**: Revisar logs de las funciones Lambda para debugging
- **API Gateway Logs**: Monitorear peticiones y respuestas
- **Console del Navegador**: Verificar errores de JavaScript en el frontend

## Estado Actual

✅ **Funciones Lambda**: Desplegadas y funcionando
✅ **API Gateway**: Configurado con CORS y rutas correctas
✅ **Frontend Script**: Actualizado para usar GET con query parameters
✅ **Webhook Integration**: Configurado para procesar órdenes automáticamente
✅ **CI/CD Pipeline**: Automatizado con GitHub Actions

El sistema está completamente funcional y listo para producción.
