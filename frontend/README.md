# Frontend - Cafeteria CAM 15

Aplicacion web del sistema POS (Next.js App Router).

## Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4

## Requisitos

- Node.js 20+
- npm 10+

## Configuracion

1. Instalar dependencias:

```bash
npm install
```

2. Crear frontend/.env.local:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_AUTH_PASSWORD=cicloescolar2025-2026
```

## Ejecutar en desarrollo

```bash
npm run dev
```

Si 3000 esta ocupado:

```bash
npm run dev -- --port 3002
```

## Build de produccion

```bash
npm run build
npm run start
```

## Estructura importante

- app/page.tsx: pantalla principal de ventas
- app/comandas/page.tsx: vista de comandas para cocina
- app/productos/page.tsx: gestion de productos
- app/deudores/page.tsx: gestion de deudores
- app/caja/page.tsx: operaciones de caja
- components/Navigation.tsx: barra superior y navegacion
- lib/api.ts: cliente HTTP y tipos compartidos

## Flujo general

1. Login con clave local (NEXT_PUBLIC_AUTH_PASSWORD).
2. Operacion de ventas y registro de transacciones.
3. Generacion/consulta de comandas y estado de entrega.
4. Consulta de recibos, caja y deudores.

## Notas

- Este frontend depende de la API del backend en NEXT_PUBLIC_API_URL.
- Si cambias dominio o puerto del backend, actualiza .env.local.
