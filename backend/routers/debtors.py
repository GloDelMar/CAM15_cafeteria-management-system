from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from models.schemas import Debtor, DebtorCreate, DebtorUpdate, PaymentResponse
from database import db, get_next_sequence
from datetime import datetime
from pymongo import DESCENDING
from single_caja import normalize_caja_id

router = APIRouter()


def _current_balance(caja_id: Optional[int]) -> float:
    caja_id = normalize_caja_id(caja_id)
    balance_filter = {}
    balance_filter["caja_id"] = caja_id

    last_operation = db.cash_operations.find_one(
        balance_filter,
        {"_id": 0},
        sort=[("fecha", DESCENDING), ("id", DESCENDING)],
    )

    if last_operation:
        return float(last_operation.get("saldo", 0))

    caja = db.cajas.find_one({"id": caja_id}, {"_id": 0, "saldo_inicial": 1})
    if caja:
        return float(caja.get("saldo_inicial", 0))

    return 0.0

@router.get("/", response_model=List[Debtor])
async def get_all_debtors(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    grupo: Optional[str] = None,
    nombre: Optional[str] = None,
    caja_id: Optional[int] = None
):
    """Obtener todos los deudores con filtros opcionales"""
    try:
        mongo_filter = {}
        mongo_filter["caja_id"] = normalize_caja_id(caja_id)
        if grupo:
            mongo_filter["grupo"] = grupo
        if nombre:
            mongo_filter["nombre"] = {"$regex": nombre, "$options": "i"}

        debtors = list(
            db.debtors.find(mongo_filter, {"_id": 0})
            .sort("deuda", DESCENDING)
            .skip(skip)
            .limit(limit)
        )
        return debtors
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener deudores: {str(e)}")

@router.get("/{debtor_id}", response_model=Debtor)
async def get_debtor(debtor_id: int):
    """Obtener un deudor por ID"""
    try:
        debtor = db.debtors.find_one({"id": debtor_id}, {"_id": 0})
        if not debtor:
            raise HTTPException(status_code=404, detail="Deudor no encontrado")
        return debtor
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener deudor: {str(e)}")

@router.get("/by-name/{nombre}/{grupo}", response_model=Debtor)
async def get_debtor_by_name(nombre: str, grupo: str):
    """Obtener un deudor por nombre y grupo"""
    try:
        debtor = db.debtors.find_one(
            {"nombre": nombre, "grupo": grupo, "caja_id": normalize_caja_id()},
            {"_id": 0},
        )
        if not debtor:
            raise HTTPException(status_code=404, detail="Deudor no encontrado")
        return debtor
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener deudor: {str(e)}")

@router.post("/", response_model=Debtor, status_code=201)
async def create_debtor(debtor: DebtorCreate):
    """Crear un nuevo deudor"""
    try:
        # Verificar si ya existe
        existing = db.debtors.find_one(
            {"nombre": debtor.nombre, "grupo": debtor.grupo, "caja_id": normalize_caja_id(debtor.caja_id)},
            {"_id": 0},
        )
        if existing:
            raise HTTPException(status_code=400, detail="El deudor ya existe")

        debtor_dict = debtor.model_dump()
        debtor_dict["caja_id"] = normalize_caja_id(debtor_dict.get("caja_id"))
        now = datetime.utcnow()
        debtor_dict["id"] = get_next_sequence("debtors")
        debtor_dict["fecha_primera_deuda"] = now
        debtor_dict["ultima_compra"] = now
        db.debtors.insert_one(debtor_dict)
        debtor_dict.pop("_id", None)
        return debtor_dict
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al crear deudor: {str(e)}")

@router.patch("/{debtor_id}/pay", response_model=PaymentResponse)
async def pay_debt(
    debtor_id: int, 
    monto: float = Query(..., gt=0),
    caja_id: Optional[int] = Query(None, description="ID de la caja donde se recibe el pago")
):
    """Registrar pago de deuda"""
    try:
        # Obtener deudor actual
        debtor = db.debtors.find_one({"id": debtor_id}, {"_id": 0})
        if not debtor:
            raise HTTPException(status_code=404, detail="Deudor no encontrado")

        nueva_deuda = debtor["deuda"] - monto

        if nueva_deuda < 0:
            raise HTTPException(status_code=400, detail="El monto excede la deuda")

        resolved_caja_id = normalize_caja_id(caja_id)
        current_balance = _current_balance(resolved_caja_id)

        # Si la deuda queda en 0, eliminar el deudor
        if nueva_deuda == 0:
            db.debtors.delete_one({"id": debtor_id})

            # Registrar en caja el pago
            cash_operation = {
                "tipo_operacion": "INGRESO",
                "monto": monto,
                "saldo": current_balance + monto,
                "descripcion": f"Pago de deuda - {debtor['nombre']} ({debtor['grupo']}) - Saldada completamente",
                "caja_id": resolved_caja_id,
                "id": get_next_sequence("cash_operations"),
                "fecha": datetime.utcnow(),
            }
            db.cash_operations.insert_one(cash_operation)

            return PaymentResponse(
                mensaje="Deuda saldada completamente",
                deuda_restante=0,
                debtor=None
            )
        else:
            # Actualizar deuda
            db.debtors.update_one({"id": debtor_id}, {"$set": {"deuda": nueva_deuda}})
            updated_debtor = db.debtors.find_one({"id": debtor_id}, {"_id": 0})

            # Registrar en caja el pago
            cash_operation = {
                "tipo_operacion": "INGRESO",
                "monto": monto,
                "saldo": current_balance + monto,
                "descripcion": f"Pago parcial de deuda - {debtor['nombre']} ({debtor['grupo']}) - Resta ${nueva_deuda:.2f}",
                "caja_id": resolved_caja_id,
                "id": get_next_sequence("cash_operations"),
                "fecha": datetime.utcnow(),
            }
            db.cash_operations.insert_one(cash_operation)

            return PaymentResponse(
                mensaje="Pago registrado exitosamente",
                deuda_restante=nueva_deuda,
                debtor=updated_debtor
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al procesar pago: {str(e)}")

@router.put("/{debtor_id}", response_model=Debtor)
async def update_debtor(debtor_id: int, debtor: DebtorUpdate):
    """Actualizar deuda manualmente"""
    try:
        existing = db.debtors.find_one({"id": debtor_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Deudor no encontrado")

        update_dict = debtor.model_dump(exclude_unset=True)
        if not update_dict:
            raise HTTPException(status_code=400, detail="No hay campos para actualizar")

        db.debtors.update_one({"id": debtor_id}, {"$set": update_dict})
        updated = db.debtors.find_one({"id": debtor_id}, {"_id": 0})
        return updated
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al actualizar deudor: {str(e)}")

@router.delete("/{debtor_id}", status_code=204)
async def delete_debtor(debtor_id: int):
    """Eliminar un deudor (condonar deuda)"""
    try:
        existing = db.debtors.find_one({"id": debtor_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Deudor no encontrado")

        db.debtors.delete_one({"id": debtor_id})
        return None
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al eliminar deudor: {str(e)}")

@router.get("/stats/summary")
async def get_debtors_summary(caja_id: Optional[int] = None):
    """Obtener resumen de deudas"""
    try:
        debtors = list(db.debtors.find({"caja_id": normalize_caja_id(caja_id)}, {"_id": 0}))

        total_deuda = sum(d["deuda"] for d in debtors)

        # Agrupar por grupo
        grupos = {}
        for debtor in debtors:
            grupo = debtor["grupo"]
            if grupo not in grupos:
                grupos[grupo] = {"cantidad": 0, "total": 0}
            grupos[grupo]["cantidad"] += 1
            grupos[grupo]["total"] += debtor["deuda"]

        return {
            "total_deudores": len(debtors),
            "total_deuda": total_deuda,
            "promedio_deuda": total_deuda / len(debtors) if debtors else 0,
            "por_grupo": grupos
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener resumen: {str(e)}")
