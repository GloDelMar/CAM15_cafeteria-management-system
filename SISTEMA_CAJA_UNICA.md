# Sistema de Caja Unica - Cafeteria CAM 15

## Descripcion

El sistema fue migrado de un enfoque multicaja a una sola caja registradora para la Cafeteria CAM 15.

## Comportamiento actual

- Existe una sola caja activa en el sistema.
- Backend normaliza cualquier `caja_id` recibido para operar siempre con la caja unica.
- Frontend ya no permite seleccionar ni cambiar de caja.
- Las pantallas operan directamente sobre la caja unica.

## Caja por defecto

- Nombre: `CAFETERIA CAM 15`
- Descripcion: `Caja registradora unica de la cafeteria CAM 15`

Esta caja se crea automaticamente si no existe al iniciar el backend.

## Endpoints relevantes

### Cajas
- `GET /api/cajas` - Devuelve la caja unica en una lista.
- `GET /api/cajas/current` - Devuelve la caja activa del sistema.
- `GET /api/cajas/{id}` - Consulta de la caja unica por ID.
- `PATCH /api/cajas/{id}` - Actualiza nombre, descripcion o saldo inicial.

### Operacion
- `GET /api/products` - Productos de la caja unica.
- `GET /api/transactions` - Transacciones de la caja unica.
- `GET /api/debtors` - Deudores de la caja unica.
- `GET /api/cash` - Movimientos de caja unica.

## Script de inicializacion

Ejecutar en backend:

```bash
python run_migration.py
```

Este script verifica indices y garantiza que exista la caja unica.

## Nota de compatibilidad

Se mantienen rutas historicas relacionadas con cajas para no romper clientes existentes, pero funcionalmente el sistema opera con una sola caja.
