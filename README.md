# Cafeteria CAM 15 POS - Sistema Web

Sistema de punto de venta para la Cafeteria CAM 15 desarrollado con Next.js, FastAPI y MongoDB.

## 🏗️ Arquitectura

- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS
- **Backend**: FastAPI + Python 3.11
- **Base de Datos**: MongoDB Atlas
- **Storage**: AWS S3 (recomendado) o archivos locales servidos por FastAPI (`/static`)

## 📁 Estructura del Proyecto

```
cafeteria_cam15/
├── frontend/          # Aplicación Next.js
├── backend/           # API FastAPI
│   ├── routers/      # Endpoints de la API
│   ├── models/       # Modelos Pydantic
│   ├── database.py   # Conexión MongoDB
│   ├── main.py       # App FastAPI
│   └── .env          # Variables de entorno
├── kivy_app/         # App original de Kivy (referencia)
└── README.md
```

## 🚀 Inicio Rápido

### Prerrequisitos

- Python 3.11+
- Node.js 20+ (recomendado)
- Cuenta de MongoDB Atlas (opcional para producción)

### Configuración Backend

1. **Crear entorno virtual**:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
# o
venv\Scripts\activate     # Windows
```

2. **Instalar dependencias**:
```bash
pip install -r requirements.txt
```

3. **Configurar variables de entorno**:
```bash
# Editar backend/.env con tu configuración de MongoDB
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=cafeteria_cam15
FRONTEND_URL=http://localhost:3000
MONGODB_SERVER_SELECTION_TIMEOUT_MS=15000

# Opcional: Storage en AWS S3 para imagenes de productos
AWS_S3_BUCKET=tu-bucket
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=tu-access-key
AWS_SECRET_ACCESS_KEY=tu-secret-key
# Opcional si usas CDN o CloudFront:
# AWS_S3_PUBLIC_URL=https://cdn.tudominio.com
# Opcional para S3-compatible (no AWS puro):
# AWS_S3_ENDPOINT_URL=https://s3.tu-proveedor.com
```

4. **Para producción con Atlas**:
   - Crea un cluster en MongoDB Atlas (M0 Free)
   - Crea usuario de base de datos con permisos `readWrite`
   - En `Network Access`, permite IPs necesarias (temporalmente `0.0.0.0/0`)
   - Usa una URI tipo `mongodb+srv://...`

5. **Insertar datos de prueba** (opcional):
```bash
python seed_data.py
```

6. **Iniciar servidor**:
```bash
uvicorn main:app --reload
```

API disponible en: http://localhost:8000
Documentación: http://localhost:8000/docs

### Configuración Frontend

1. **Instalar dependencias**:
```bash
cd frontend
npm install
```

2. **Configurar variables de entorno**:
```bash
# Crear frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_AUTH_PASSWORD=cicloescolar2025-2026
```

> **Nota de Seguridad**: La contraseña por defecto es `cicloescolar2025-2026`. Asegúrate de cambiarla en producción.

3. **Iniciar aplicación**:
```bash
npm run dev
```

Aplicación disponible en: http://localhost:3000

## 🔐 Sistema de Autenticación

El sistema cuenta con protección por contraseña:

- **Acceso**: Solo personal autorizado del Taller de Formación Laboral, CAM15-Nayarit
- **Contraseña por defecto**: `cicloescolar2025-2026`
- **Configuración**: Se define en `NEXT_PUBLIC_AUTH_PASSWORD` del archivo `.env.local`
- **Protección**: Todas las páginas excepto `/login` requieren autenticación
- **Sesión**: Se mantiene en localStorage del navegador
- **Cerrar sesión**: Botón "Salir" en la navegación superior

Para cambiar la contraseña, modifica el valor en el archivo `.env.local`

## 📚 API Endpoints

### Productos (`/api/products`)
- `GET /` - Listar todos los productos
- `GET /{id}` - Obtener producto por ID
- `POST /` - Crear producto
- `PUT /{id}` - Actualizar producto
- `DELETE /{id}` - Eliminar producto
- `POST /upload-image/{id}` - Subir imagen

### Transacciones (`/api/transactions`)
- `GET /` - Listar transacciones (con filtros)
- `GET /{id}` - Obtener transacción por ID
- `POST /` - Crear transacción
- `GET /stats/daily` - Estadísticas del día
- `GET /stats/monthly` - Estadísticas del mes

### Deudores (`/api/debtors`)
- `GET /` - Listar deudores
- `GET /{id}` - Obtener deudor por ID
- `GET /by-name/{nombre}/{grupo}` - Buscar por nombre
- `POST /` - Crear deudor
- `PATCH /{id}/pay` - Registrar pago
- `PUT /{id}` - Actualizar deuda
- `DELETE /{id}` - Eliminar deudor
- `GET /stats/summary` - Resumen de deudas

### Caja (`/api/cash`)
- `GET /` - Listar operaciones
- `GET /balance` - Saldo actual
- `POST /income` - Registrar ingreso
- `POST /expense` - Registrar egreso
- `POST /adjust` - Ajustar saldo
- `GET /stats/daily` - Estadísticas del día

Ver documentación completa en: `backend/API_DOCS.md`

## 🧪 Testing

### Backend
```bash
cd backend
pytest
```

### Frontend
```bash
cd frontend
npm test
```

## 📦 Deployment

### Backend (Render)
1. Conectar repositorio a Render
2. Configurar variables de entorno
3. Deploy automático desde `main`

### Frontend (Vercel)
1. Conectar repositorio a Vercel
2. Configurar variables de entorno
3. Deploy automático desde `main`

Ver guías detalladas en la carpeta `/docs`

## 🛠️ Tecnologías

### Frontend
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- React Query (data fetching)
- Zustand (state management)

### Backend
- FastAPI 0.115.5
- Pydantic 2.10.3 (validación)
- PyMongo 4.10.1 (acceso a MongoDB)
- Certifi (CA bundle para TLS en Atlas)
- Python-dotenv (env vars)
- ReportLab (generación de PDFs)

### Base de Datos
- MongoDB (colecciones)
- Colecciones principales: products, transactions, debtors, cash_operations, cajas
- Imagenes en AWS S3 cuando `AWS_S3_BUCKET` esta configurado
- Fallback a `/static/products` cuando S3 no esta configurado

## 📝 Características

✅ **Gestión de Productos**
- CRUD completo
- Carga de imágenes
- Precios y stock

✅ **Punto de Venta**
- Carrito de compras
- Cálculo automático de totales
- Registro de transacciones

✅ **Gestión de Créditos**
- Registro de deudores
- Pagos parciales/totales
- Historial de deudas

✅ **Control de Caja Unica**
- Saldo en tiempo real
- Ingresos y egresos
- Estadísticas diarias/mensuales

✅ **Reportes y Estadísticas**
- Ventas diarias/mensuales
- Productos más vendidos
- Dashboard con métricas

## 🔒 Seguridad

- API Keys en variables de entorno
- CORS configurado
- Validación de datos con Pydantic
- Control de acceso por contraseña en frontend

## 📄 Licencia

Propietaria (Todos los derechos reservados).

Ver [LICENSE](LICENSE).

## © Aviso de Derechos y Uso

Creado por Gloriela Suárez Casañeda para uso exclusivo de los alumnos del grupo de Taller de Formación Laboral de CAM 15 de Bahía de Banderas, Nayarit, México, y con consentimiento de Gloriela.

## 👥 Contribuir

1. Fork el proyecto
2. Crea una rama (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📞 Soporte

- Documentación: `/docs`
- Issues: GitHub Issues
- Email: soporte@latiendita.com

---

Desarrollado con ❤️ para facilitar la gestión de pequeños negocios
