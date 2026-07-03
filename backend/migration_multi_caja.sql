-- ============================================
-- MIGRACION: Caja Unica CAM 15
-- ============================================

-- 1. Crear tabla de cajas
CREATE TABLE IF NOT EXISTS cajas (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL UNIQUE,
    descripcion TEXT,
    activa BOOLEAN NOT NULL DEFAULT true,
    saldo_inicial DECIMAL(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para cajas
CREATE INDEX idx_cajas_activa ON cajas(activa);

-- 2. Insertar caja unica
INSERT INTO cajas (nombre, descripcion, saldo_inicial) VALUES
('CAFETERIA CAM 15', 'Caja registradora unica de la cafeteria CAM 15', 0)
ON CONFLICT (nombre) DO NOTHING;

-- 3. Agregar columna caja_id a la tabla products
ALTER TABLE products ADD COLUMN IF NOT EXISTS caja_id BIGINT REFERENCES cajas(id) ON DELETE SET NULL;

-- Asignar productos existentes a la caja unica por defecto
UPDATE products SET caja_id = (SELECT id FROM cajas WHERE nombre = 'CAFETERIA CAM 15' LIMIT 1) WHERE caja_id IS NULL;

-- Crear índice para caja_id en products
CREATE INDEX IF NOT EXISTS idx_products_caja_id ON products(caja_id);

-- 4. Agregar columna caja_id a la tabla transactions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS caja_id BIGINT REFERENCES cajas(id) ON DELETE SET NULL;

-- Asignar transacciones existentes a la caja unica por defecto
UPDATE transactions SET caja_id = (SELECT id FROM cajas WHERE nombre = 'CAFETERIA CAM 15' LIMIT 1) WHERE caja_id IS NULL;

-- Crear índice para caja_id en transactions
CREATE INDEX IF NOT EXISTS idx_transactions_caja_id ON transactions(caja_id);

-- 5. Agregar columna caja_id a la tabla cash_operations
ALTER TABLE cash_operations ADD COLUMN IF NOT EXISTS caja_id BIGINT REFERENCES cajas(id) ON DELETE SET NULL;

-- Asignar operaciones de caja existentes a la caja unica por defecto
UPDATE cash_operations SET caja_id = (SELECT id FROM cajas WHERE nombre = 'CAFETERIA CAM 15' LIMIT 1) WHERE caja_id IS NULL;

-- Crear índice para caja_id en cash_operations
CREATE INDEX IF NOT EXISTS idx_cash_operations_caja_id ON cash_operations(caja_id);

-- 6. Actualizar funciones para incluir caja_id
CREATE OR REPLACE FUNCTION get_daily_sales(date_param DATE DEFAULT CURRENT_DATE, caja_id_param BIGINT DEFAULT NULL)
RETURNS TABLE (
    total_ventas DECIMAL,
    total_transacciones BIGINT,
    total_efectivo DECIMAL,
    total_credito DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(total), 0)::DECIMAL as total_ventas,
        COUNT(*)::BIGINT as total_transacciones,
        COALESCE(SUM(pago), 0)::DECIMAL as total_efectivo,
        COALESCE(SUM(CASE WHEN pagado = 'NO' THEN total - pago ELSE 0 END), 0)::DECIMAL as total_credito
    FROM transactions
    WHERE DATE(fecha) = date_param
    AND (caja_id_param IS NULL OR caja_id = caja_id_param);
END;
$$ LANGUAGE plpgsql;

-- 7. Función para obtener saldo de una caja específica
CREATE OR REPLACE FUNCTION get_caja_balance(caja_id_param BIGINT)
RETURNS DECIMAL AS $$
DECLARE
    balance DECIMAL;
BEGIN
    SELECT saldo INTO balance
    FROM cash_operations
    WHERE caja_id = caja_id_param
    ORDER BY fecha DESC, id DESC
    LIMIT 1;
    
    -- Si no hay operaciones, obtener el saldo inicial de la caja
    IF balance IS NULL THEN
        SELECT saldo_inicial INTO balance
        FROM cajas
        WHERE id = caja_id_param;
    END IF;
    
    RETURN COALESCE(balance, 0);
END;
$$ LANGUAGE plpgsql;

-- 8. Eliminar vistas existentes y recrearlas
DROP VIEW IF EXISTS dashboard_summary_por_caja;
DROP VIEW IF EXISTS dashboard_summary;

-- Vista actualizada para dashboard de caja unica
CREATE VIEW dashboard_summary_por_caja AS
SELECT 
    c.id as caja_id,
    c.nombre as caja_nombre,
    c.activa,
    (SELECT COUNT(*) FROM products WHERE caja_id = c.id) as total_productos,
    get_caja_balance(c.id) as saldo_caja,
    (SELECT COUNT(*) FROM transactions WHERE DATE(fecha) = CURRENT_DATE AND caja_id = c.id) as ventas_hoy,
    (SELECT COALESCE(SUM(total), 0) FROM transactions WHERE DATE(fecha) = CURRENT_DATE AND caja_id = c.id) as total_ventas_hoy
FROM cajas c
WHERE c.activa = true;

-- 9. Vista consolidada
CREATE VIEW dashboard_summary AS
SELECT 
    (SELECT COUNT(*) FROM products) as total_productos,
    (SELECT COUNT(*) FROM debtors) as total_deudores,
    (SELECT COALESCE(SUM(deuda), 0) FROM debtors) as total_deuda,
    (SELECT COALESCE(SUM(get_caja_balance(id)), 0) FROM cajas WHERE activa = true) as saldo_caja,
    (SELECT COUNT(*) FROM transactions WHERE DATE(fecha) = CURRENT_DATE) as ventas_hoy,
    (SELECT COALESCE(SUM(total), 0) FROM transactions WHERE DATE(fecha) = CURRENT_DATE) as total_ventas_hoy;

-- ============================================
-- INSTRUCCIONES DE EJECUCIÓN
-- ============================================
-- 1. Ejecutar este script en Supabase SQL Editor
-- 2. Verificar que la caja unica se creo correctamente:
--    SELECT * FROM cajas;
-- 3. Verificar que los productos tienen caja asignada:
--    SELECT id, name, caja_id FROM products LIMIT 10;
-- 4. Actualizar el backend para usar caja_id en las operaciones
