"""
Backend API para Cafeteria CAM 15 POS
Documentación y guía de configuración
"""

# Rutas principales de la API

## Productos (/api/products)
- GET    /              -> Listar todos los productos
- GET    /{id}          -> Obtener producto por ID
- POST   /              -> Crear producto
- PUT    /{id}          -> Actualizar producto
- DELETE /{id}          -> Eliminar producto
- POST   /upload-image/{id} -> Subir imagen

## Transacciones (/api/transactions)
- GET  /                -> Listar transacciones (con filtros)
- GET  /{id}            -> Obtener transacción por ID
- POST /                -> Crear transacción (registra venta)
- GET  /stats/daily     -> Estadísticas del día
- GET  /stats/monthly   -> Estadísticas del mes

## Deudores (/api/debtors)
- GET    /                  -> Listar deudores
- GET    /{id}              -> Obtener deudor por ID
- GET    /by-name/{nombre}/{grupo} -> Buscar por nombre y grupo
- POST   /                  -> Crear deudor
- PATCH  /{id}/pay?monto=X  -> Registrar pago de deuda
- PUT    /{id}              -> Actualizar deuda manualmente
- DELETE /{id}              -> Eliminar deudor (condonar)
- GET    /stats/summary     -> Resumen de deudas

## Caja (/api/cash)
- GET    /                -> Listar operaciones
- GET    /balance         -> Obtener saldo actual
- GET    /{id}            -> Obtener operación por ID
- POST   /                -> Crear operación
- POST   /income?monto=X&descripcion=Y   -> Registrar ingreso
- POST   /expense?monto=X&descripcion=Y  -> Registrar egreso
- POST   /adjust?monto=X&descripcion=Y   -> Ajustar saldo
- GET    /stats/daily     -> Estadísticas del día

## Documentos (/api/documents)
- POST /upload -> Subir documentos generados (tickets, recibos, archivos)
- GET  /{id} -> Obtener metadata del documento
- GET  /{id}/content -> Descargar/visualizar contenido del documento
