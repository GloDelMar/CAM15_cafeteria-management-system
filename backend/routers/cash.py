from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from models.schemas import CashOperation, CashOperationCreate
from database import db, get_next_sequence
from datetime import datetime
from pymongo import DESCENDING
from single_caja import normalize_caja_id

router = APIRouter()


def _parse_date(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    return datetime.fromisoformat(value.replace("Z", "+00:00"))

@router.get("/", response_model=List[CashOperation])
async def get_cash_operations(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    tipo_operacion: Optional[str] = None,
    caja_id: Optional[int] = None
):
    """Obtener movimientos de caja con filtros opcionales"""
    try:
        mongo_filter = {}
        if fecha_desde:
            mongo_filter.setdefault("fecha", {})["$gte"] = _parse_date(fecha_desde)
        if fecha_hasta:
            mongo_filter.setdefault("fecha", {})["$lte"] = _parse_date(fecha_hasta)
        if tipo_operacion:
            mongo_filter["tipo_operacion"] = tipo_operacion
        mongo_filter["caja_id"] = normalize_caja_id(caja_id)

        operations = list(
            db.cash_operations.find(mongo_filter, {"_id": 0})
            .sort([("fecha", DESCENDING), ("id", DESCENDING)])
            .skip(skip)
            .limit(limit)
        )
        return operations
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener operaciones: {str(e)}")

@router.get("/balance")
async def get_current_balance(caja_id: Optional[int] = None):
    """Obtener saldo actual de caja (todas o una específica)"""
    try:
        caja_id = normalize_caja_id(caja_id)
        mongo_filter = {"caja_id": caja_id}

        last_operation = db.cash_operations.find_one(
            mongo_filter,
            {"_id": 0},
            sort=[("fecha", DESCENDING), ("id", DESCENDING)],
        )

        if not last_operation:
            caja = db.cajas.find_one({"id": caja_id}, {"_id": 0, "saldo_inicial": 1, "nombre": 1})
            if caja:
                return {
                    "saldo": caja["saldo_inicial"],
                    "ultima_actualizacion": None,
                    "caja_id": caja_id,
                    "caja_nombre": caja["nombre"]
                }
            return {"saldo": 0, "ultima_actualizacion": None, "caja_id": caja_id}

        result = {
            "saldo": last_operation["saldo"],
            "ultima_actualizacion": last_operation["fecha"]
        }

        result["caja_id"] = caja_id
        caja = db.cajas.find_one({"id": caja_id}, {"_id": 0, "nombre": 1})
        if caja:
            result["caja_nombre"] = caja["nombre"]

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener saldo: {str(e)}")

@router.get("/{operation_id}", response_model=CashOperation)
async def get_cash_operation(operation_id: int):
    """Obtener una operación por ID"""
    try:
        operation = db.cash_operations.find_one({"id": operation_id}, {"_id": 0})
        if not operation:
            raise HTTPException(status_code=404, detail="Operación no encontrada")
        return operation
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener operación: {str(e)}")

@router.post("/", response_model=CashOperation, status_code=201)
async def create_cash_operation(operation: CashOperationCreate):
    """Crear una nueva operación de caja (ingreso, egreso o ajuste)"""
    try:
        operation.caja_id = normalize_caja_id(operation.caja_id)
        # Obtener saldo actual de la caja específica
        last_filter = {}
        last_filter["caja_id"] = operation.caja_id

        last_operation = db.cash_operations.find_one(
            last_filter,
            {"_id": 0},
            sort=[("fecha", DESCENDING), ("id", DESCENDING)],
        )

        # Si no hay operaciones previas y hay caja_id, usar saldo inicial de la caja
        if not last_operation:
            caja = db.cajas.find_one({"id": operation.caja_id}, {"_id": 0, "saldo_inicial": 1})
            current_balance = caja["saldo_inicial"] if caja else 0
        else:
            current_balance = last_operation["saldo"] if last_operation else 0

        # Calcular nuevo saldo
        if operation.tipo_operacion in ["INGRESO", "VENTA"]:
            new_balance = current_balance + abs(operation.monto)
        elif operation.tipo_operacion == "EGRESO":
            new_balance = current_balance - abs(operation.monto)
        else:  # AJUSTE
            new_balance = current_balance + operation.monto
        
        # Crear operación
        operation_dict = operation.model_dump()
        operation_dict["saldo"] = new_balance
        operation_dict["id"] = get_next_sequence("cash_operations")
        operation_dict["fecha"] = datetime.utcnow()

        db.cash_operations.insert_one(operation_dict)
        operation_dict.pop("_id", None)
        return operation_dict
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al crear operación: {str(e)}")

@router.post("/income", response_model=CashOperation, status_code=201)
async def add_income(monto: float = Query(..., gt=0), descripcion: str = Query(...), caja_id: Optional[int] = None):
    """Registrar un ingreso de efectivo"""
    try:
        operation = CashOperationCreate(
            tipo_operacion="INGRESO",
            monto=monto,
            descripcion=descripcion,
            caja_id=caja_id
        )
        return await create_cash_operation(operation)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al registrar ingreso: {str(e)}")

@router.post("/expense", response_model=CashOperation, status_code=201)
async def add_expense(monto: float = Query(..., gt=0), descripcion: str = Query(...), caja_id: Optional[int] = None):
    """Registrar un egreso de efectivo"""
    try:
        operation = CashOperationCreate(
            tipo_operacion="EGRESO",
            monto=monto,
            descripcion=descripcion,
            caja_id=caja_id
        )
        return await create_cash_operation(operation)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al registrar egreso: {str(e)}")

@router.post("/adjust", response_model=CashOperation, status_code=201)
async def adjust_balance(monto: float = Query(...), descripcion: str = Query("Ajuste manual"), caja_id: Optional[int] = None):
    """Ajustar saldo de caja (positivo o negativo)"""
    try:
        operation = CashOperationCreate(
            tipo_operacion="AJUSTE",
            monto=monto,
            descripcion=descripcion,
            caja_id=caja_id
        )
        return await create_cash_operation(operation)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al ajustar saldo: {str(e)}")

@router.get("/stats/daily")
async def get_daily_cash_stats(fecha: Optional[str] = None, caja_id: Optional[int] = None):
    """Obtener estadísticas de caja del día"""
    try:
        caja_id = normalize_caja_id(caja_id)
        if not fecha:
            fecha = datetime.now().strftime("%Y-%m-%d")
        
        fecha_inicio = datetime.fromisoformat(f"{fecha}T00:00:00")
        fecha_fin = datetime.fromisoformat(f"{fecha}T23:59:59")

        print(f"[DEBUG] getDailyStats - fecha: {fecha}, caja_id: {caja_id}")
        print(f"[DEBUG] Rango: {fecha_inicio} a {fecha_fin}")

        current_day_filter = {"fecha": {"$gte": fecha_inicio, "$lte": fecha_fin}, "caja_id": caja_id}
        operations = list(db.cash_operations.find(current_day_filter, {"_id": 0}))

        print(f"[DEBUG] Operaciones encontradas: {len(operations)}")
        if operations:
            print(f"[DEBUG] Primera operación: {operations[0]}")

        ingresos = sum(op["monto"] for op in operations if op["tipo_operacion"] in ["INGRESO", "VENTA"] and op["monto"] > 0)
        egresos = sum(abs(op["monto"]) for op in operations if op["tipo_operacion"] == "EGRESO")
        ajustes = sum(op["monto"] for op in operations if op["tipo_operacion"] == "AJUSTE")

        print(f"[DEBUG] ingresos: {ingresos}, egresos: {egresos}, ajustes: {ajustes}")

        # Saldo al inicio del día
        query_before = {"fecha": {"$lt": fecha_inicio}, "caja_id": caja_id}
        operation_before = db.cash_operations.find_one(
            query_before,
            {"_id": 0},
            sort=[("fecha", DESCENDING), ("id", DESCENDING)],
        )

        # Si no hay operaciones previas y hay caja_id, usar saldo inicial de la caja
        if not operation_before:
            caja = db.cajas.find_one({"id": caja_id}, {"_id": 0, "saldo_inicial": 1})
            saldo_inicial = caja["saldo_inicial"] if caja else 0
        else:
            saldo_inicial = operation_before["saldo"] if operation_before else 0

        # Saldo actual
        query_current = {"caja_id": caja_id}
        current = db.cash_operations.find_one(
            query_current,
            {"_id": 0},
            sort=[("fecha", DESCENDING), ("id", DESCENDING)],
        )
        saldo_actual = current["saldo"] if current else saldo_inicial

        return {
            "fecha": fecha,
            "saldo_inicial": saldo_inicial,
            "ingresos": ingresos,
            "egresos": egresos,
            "ajustes": ajustes,
            "saldo_actual": saldo_actual,
            "diferencia": saldo_actual - saldo_inicial
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener estadísticas: {str(e)}")

@router.delete("/{operation_id}", status_code=204)
async def delete_cash_operation(operation_id: int):
    """Eliminar una operación de caja (requiere recalcular saldos)"""
    try:
        # Obtener la operación a eliminar
        operation = db.cash_operations.find_one({"id": operation_id}, {"_id": 0})
        if not operation:
            raise HTTPException(status_code=404, detail="Operación no encontrada")

        # Esta es una operación compleja que requiere recalcular todos los saldos posteriores
        # Por seguridad, mejor no permitir eliminar operaciones
        raise HTTPException(
            status_code=400, 
            detail="No se permite eliminar operaciones de caja. Use un ajuste para corregir errores."
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al eliminar operación: {str(e)}")
