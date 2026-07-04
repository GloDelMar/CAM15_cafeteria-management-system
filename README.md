# Cafeteria CAM 15 POS

Sistema web de punto de venta para Cafeteria CAM 15.

## Resumen

- Frontend: Next.js 16 + React 19 + TypeScript + Tailwind CSS 4
- Backend: FastAPI + Python 3.11
- Base de datos: MongoDB
- Archivos (tickets e imagenes): AWS S3 o almacenamiento local en backend/uploads

## Estructura del proyecto

```text
cafeteria_cam15/
|-- frontend/         # Aplicacion web (Next.js)
|-- backend/          # API (FastAPI + MongoDB)
|-- kivy_app/         # Referencia de la app original
|-- README.md
```

## Requisitos

- Python 3.11+
- Node.js 20+
- npm 10+
- MongoDB local o Atlas

## Configuracion rapida

### 1) Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate    # Linux/macOS
# venv\Scripts\activate     # Windows
pip install -r requirements.txt
```

Crear o editar backend/.env:

```env
MONGODB_URI=mongodb+srv://TU_USUARIO:TU_PASSWORD@TU_CLUSTER.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB=cafeteria_cam15
MONGODB_SERVER_SELECTION_TIMEOUT_MS=15000

# Opcional: CORS explicito (actualmente la API permite "*")
FRONTEND_URL=http://localhost:3000

# Opcional: AWS S3 para documentos e imagenes
AWS_S3_BUCKET=tu-bucket
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=tu-access-key
AWS_SECRET_ACCESS_KEY=tu-secret-key
# AWS_S3_PUBLIC_URL=https://cdn.tudominio.com
# AWS_S3_ENDPOINT_URL=https://s3.tu-proveedor.com
```

Levantar API:

```bash
uvicorn main:app --reload --port 8000
```

URLs utiles:

- API: http://localhost:8000
- Swagger: http://localhost:8000/docs

### 2) Frontend

```bash
cd frontend
npm install
```

Crear frontend/.env.local:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_AUTH_PASSWORD=cicloescolar2025-2026
```

Levantar frontend:

```bash
npm run dev
```

Si el puerto 3000 esta ocupado:

```bash
npm run dev -- --port 3002
```

URL: http://localhost:3000 (o el puerto alternativo)

## Funcionalidades principales

- Gestion de productos con imagenes
- Venta con carrito y personalizaciones
- Registro de transacciones
- Sistema de deudores y abonos
- Caja unica (ingresos, egresos, ajustes)
- Comandas para cocina con estados pendiente/entregada
- Tickets con almacenamiento en S3 (si esta configurado)

## Endpoints principales

- Productos: /api/products
- Transacciones: /api/transactions
- Deudores: /api/debtors
- Caja: /api/cash
- Cajas: /api/cajas
- Documentos: /api/documents

Referencia detallada: backend/API_DOCS.md

## Limpieza de datos

Si quieres limpiar datos de operacion (ventas, productos, deudores, etc.), usa un script de mantenimiento controlado y deja siempre una caja activa. Si no tienes script, puedes automatizarlo con un comando interno de soporte.

## Build de produccion

Frontend:

```bash
cd frontend
npm run build
npm run start
```

Backend:

```bash
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000
```

## Notas de seguridad

- Cambia NEXT_PUBLIC_AUTH_PASSWORD en produccion.
- Nunca subas archivos .env al repositorio.
- Usa credenciales IAM con permisos minimos para AWS.

## Licencia y uso

Proyecto de uso institucional. Consulta LICENSE para detalles legales de uso y distribucion.
