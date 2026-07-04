from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse, Response
from typing import List, Optional
from models.schemas import Transaction, TransactionCreate
from database import db, get_next_sequence
from datetime import datetime
from pymongo import DESCENDING
from single_caja import normalize_caja_id
from services.storage import (
    get_local_static_file_path,
    load_s3_product_image,
    save_document_file,
)
from io import BytesIO
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter

router = APIRouter()


def _build_ticket_pdf(transaction_data: dict) -> bytes:
    """Genera un PDF simple del ticket para almacenamiento en S3."""
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=letter)

    _, height = letter
    y = height - 50

    pdf.setFont("Helvetica-Bold", 14)
    pdf.drawString(50, y, "Cafeteria CAM 15 - Ticket de Venta")
    y -= 24

    pdf.setFont("Helvetica", 10)
    pdf.drawString(50, y, f"Ticket: #{transaction_data['id']}")
    y -= 16

    fecha = transaction_data.get("fecha")
    fecha_str = fecha.strftime("%Y-%m-%d %H:%M:%S") if isinstance(fecha, datetime) else str(fecha)
    pdf.drawString(50, y, f"Fecha: {fecha_str}")
    y -= 16

    pdf.drawString(50, y, f"Cliente: {transaction_data.get('cliente', 'Cliente general')}")
    y -= 16
    pdf.drawString(50, y, f"Grupo: {transaction_data.get('grupo', 'General')}")
    y -= 24

    pdf.setFont("Helvetica-Bold", 11)
    pdf.drawString(50, y, "Productos")
    y -= 18

    pdf.setFont("Helvetica", 9)
    for item in transaction_data.get("productos", []):
        line = f"{item.get('cantidad', 0)} x {item.get('nombre', '')} - ${float(item.get('subtotal', 0)):.2f}"
        pdf.drawString(50, y, line[:110])
        y -= 14

        for option in item.get("opciones", []):
            values = option.get("values", [])
            if values:
                option_line = f"  - {option.get('group_label', option.get('group_key', 'opcion'))}: {', '.join(values)}"
                pdf.drawString(60, y, option_line[:105])
                y -= 12

        if y < 80:
            pdf.showPage()
            y = height - 50
            pdf.setFont("Helvetica", 9)

    y -= 8
    pdf.setFont("Helvetica-Bold", 10)
    pdf.drawString(50, y, f"Total: ${float(transaction_data.get('total', 0)):.2f}")
    y -= 14
    pdf.drawString(50, y, f"Pago: ${float(transaction_data.get('pago', 0)):.2f}")
    y -= 14
    pdf.drawString(50, y, f"Cambio: ${float(transaction_data.get('cambio', 0)):.2f}")
    y -= 14
    pdf.drawString(50, y, f"Estado: {'PAGADO' if transaction_data.get('pagado') == 'SI' else 'CREDITO'}")

    pdf.save()
    buffer.seek(0)
    return buffer.getvalue()


def _store_transaction_ticket_document(transaction_data: dict) -> dict:
    """Genera y guarda el ticket en el bucket/documentos y registra su metadata."""
    ticket_pdf = _build_ticket_pdf(transaction_data)
    filename = f"ticket_{transaction_data['id']}.pdf"

    file_url = save_document_file(
        category="tickets",
        unique_name=filename,
        file_bytes=ticket_pdf,
        content_type="application/pdf",
    )

    doc_record = {
        "id": get_next_sequence("documents"),
        "filename": filename,
        "content_type": "application/pdf",
        "size": len(ticket_pdf),
        "category": "tickets",
        "reference_type": "transaction",
        "reference_id": str(transaction_data["id"]),
        "file_url": file_url,
        "created_at": datetime.utcnow(),
    }

    db.documents.insert_one(doc_record)
    doc_record.pop("_id", None)
    return doc_record


def _parse_date(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


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

@router.get("/", response_model=List[Transaction])
async def get_transactions(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    cliente: Optional[str] = None,
    grupo: Optional[str] = None,
    caja_id: Optional[int] = None,
    pagado: Optional[str] = None
):
    """Obtener transacciones con filtros opcionales"""
    try:
        mongo_filter = {}
        if fecha_desde:
            mongo_filter.setdefault("fecha", {})["$gte"] = _parse_date(fecha_desde)
        if fecha_hasta:
            mongo_filter.setdefault("fecha", {})["$lte"] = _parse_date(fecha_hasta)
        if cliente:
            mongo_filter["cliente"] = {"$regex": cliente, "$options": "i"}
        if grupo:
            mongo_filter["grupo"] = grupo
        mongo_filter["caja_id"] = normalize_caja_id(caja_id)
        if pagado:
            mongo_filter["pagado"] = pagado

        transactions = list(
            db.transactions.find(mongo_filter, {"_id": 0})
            .sort([("fecha", DESCENDING), ("id", DESCENDING)])
            .skip(skip)
            .limit(limit)
        )
        return transactions
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener transacciones: {str(e)}")

@router.get("/{transaction_id}", response_model=Transaction)
async def get_transaction(transaction_id: int):
    """Obtener una transacción por ID"""
    try:
        transaction = db.transactions.find_one({"id": transaction_id}, {"_id": 0})
        if not transaction:
            raise HTTPException(status_code=404, detail="Transacción no encontrada")
        return transaction
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener transacción: {str(e)}")


@router.get("/{transaction_id}/ticket/download")
async def download_transaction_ticket(transaction_id: int):
    """Descarga el ticket PDF almacenado para impresión bajo demanda."""
    try:
        transaction = db.transactions.find_one(
            {"id": transaction_id},
            {"_id": 0, "id": 1, "ticket_document_id": 1, "ticket_url": 1},
        )
        if not transaction:
            raise HTTPException(status_code=404, detail="Transacción no encontrada")

        ticket_url = transaction.get("ticket_url")
        ticket_document_id = transaction.get("ticket_document_id")

        if not ticket_url and ticket_document_id:
            doc = db.documents.find_one({"id": ticket_document_id}, {"_id": 0, "file_url": 1})
            ticket_url = doc.get("file_url") if doc else None

        if not ticket_url:
            fallback_doc = db.documents.find_one(
                {
                    "reference_type": "transaction",
                    "reference_id": str(transaction_id),
                    "category": "tickets",
                },
                {"_id": 0, "file_url": 1},
                sort=[("id", DESCENDING)],
            )
            ticket_url = fallback_doc.get("file_url") if fallback_doc else None

        if not ticket_url:
            raise HTTPException(status_code=404, detail="Ticket no encontrado para esta transacción")

        filename = f"ticket_{transaction_id}.pdf"
        headers = {"Content-Disposition": f'attachment; filename="{filename}"'}

        if ticket_url.startswith("http"):
            content, content_type = load_s3_product_image(ticket_url)
            return Response(
                content=content,
                media_type=content_type or "application/pdf",
                headers=headers,
            )

        local_file_path = get_local_static_file_path(ticket_url)
        if not local_file_path.exists():
            raise HTTPException(status_code=404, detail="Archivo de ticket no encontrado")

        return FileResponse(
            path=local_file_path,
            media_type="application/pdf",
            filename=filename,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al descargar ticket: {str(e)}")

@router.post("/", response_model=Transaction, status_code=201)
async def create_transaction(transaction: TransactionCreate):
    """Crear una nueva transacción"""
    try:
        transaction_dict = transaction.model_dump()
        transaction_dict["caja_id"] = normalize_caja_id(transaction_dict.get("caja_id"))
        transaction_dict["id"] = get_next_sequence("transactions")
        transaction_dict["fecha"] = datetime.utcnow()
        print(f"[DEBUG] Transaction data received: {transaction_dict}")

        # Registrar en transacciones
        db.transactions.insert_one(transaction_dict)
        created_transaction = dict(transaction_dict)
        created_transaction.pop("_id", None)

        # Generar y guardar ticket PDF en S3 (bucket configurado)
        try:
            ticket_document = _store_transaction_ticket_document(created_transaction)
        except Exception:
            db.transactions.delete_one({"id": created_transaction["id"]})
            raise

        # Guardar referencia del ticket en la transacción
        db.transactions.update_one(
            {"id": created_transaction["id"]},
            {
                "$set": {
                    "ticket_document_id": ticket_document["id"],
                    "ticket_url": ticket_document["file_url"],
                }
            },
        )

        # Si no está pagado, registrar como deudor
        if transaction.pagado == "NO":
            debtor_data = {
                "nombre": transaction.cliente,
                "grupo": transaction.grupo,
                "deuda": transaction.total - transaction.pago,
                "caja_id": transaction_dict["caja_id"]
            }

            # Verificar si el deudor ya existe
            existing_filter = {"nombre": transaction.cliente, "grupo": transaction.grupo}
            existing_filter["caja_id"] = transaction_dict["caja_id"]
            existing = db.debtors.find_one(existing_filter, {"_id": 0})

            if existing:
                # Actualizar deuda existente
                new_debt = float(existing["deuda"]) + float(debtor_data["deuda"])
                db.debtors.update_one(
                    {"id": existing["id"]},
                    {"$set": {"deuda": new_debt, "ultima_compra": created_transaction["fecha"]}},
                )
            else:
                # Crear nuevo deudor
                debtor_data["id"] = get_next_sequence("debtors")
                debtor_data["fecha_primera_deuda"] = created_transaction["fecha"]
                debtor_data["ultima_compra"] = created_transaction["fecha"]
                db.debtors.insert_one(debtor_data)

        # Registrar movimiento en caja solo si hay pago
        if transaction.pago > 0:
            current_balance = _current_balance(transaction_dict["caja_id"])

            # Usar el TOTAL de la venta, no el pago
            cash_operation = {
                "tipo_operacion": "VENTA",
                "monto": transaction.total,  # Total de la venta, no el pago
                "descripcion": f"Venta a {transaction.cliente} - {len(transaction.productos)} productos",
                "caja_id": transaction_dict["caja_id"],
                "saldo": current_balance + transaction.total,  # Sumar el total
                "id": get_next_sequence("cash_operations"),
                "fecha": created_transaction["fecha"],
            }

            db.cash_operations.insert_one(cash_operation)

        return created_transaction
    except Exception as e:
        print(f"[ERROR] Error creating transaction: {str(e)}")
        print(f"[ERROR] Error type: {type(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error al crear transacción: {str(e)}")

@router.get("/stats/daily")
async def get_daily_stats(fecha: Optional[str] = None, caja_id: Optional[int] = None):
    """Obtener estadísticas del día"""
    try:
        if not fecha:
            fecha = datetime.now().strftime("%Y-%m-%d")
        
        fecha_inicio = datetime.fromisoformat(f"{fecha}T00:00:00")
        fecha_fin = datetime.fromisoformat(f"{fecha}T23:59:59")

        # Transacciones del día
        transactions = list(
            db.transactions.find(
                {
                    "fecha": {"$gte": fecha_inicio, "$lte": fecha_fin},
                    "caja_id": normalize_caja_id(caja_id),
                },
                {"_id": 0},
            )
        )

        total_ventas = sum(t["total"] for t in transactions)
        total_efectivo = sum(t["pago"] for t in transactions)
        total_credito = sum(t["total"] - t["pago"] for t in transactions if t["pagado"] == "NO")

        return {
            "fecha": fecha,
            "total_transacciones": len(transactions),
            "total_ventas": total_ventas,
            "total_efectivo": total_efectivo,
            "total_credito": total_credito,
            "promedio_ticket": total_ventas / len(transactions) if transactions else 0
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener estadísticas: {str(e)}")

@router.get("/stats/monthly")
async def get_monthly_stats(
    year: int = Query(...),
    month: int = Query(..., ge=1, le=12),
    caja_id: Optional[int] = None,
):
    """Obtener estadísticas del mes"""
    try:
        fecha_inicio = datetime.fromisoformat(f"{year}-{month:02d}-01T00:00:00")

        # Calcular último día del mes
        if month == 12:
            next_month = datetime.fromisoformat(f"{year + 1}-01-01T00:00:00")
        else:
            next_month = datetime.fromisoformat(f"{year}-{month + 1:02d}-01T00:00:00")

        transactions = list(
            db.transactions.find(
                {
                    "fecha": {"$gte": fecha_inicio, "$lt": next_month},
                    "caja_id": normalize_caja_id(caja_id),
                },
                {"_id": 0},
            )
        )

        total_ventas = sum(t["total"] for t in transactions)
        total_efectivo = sum(t["pago"] for t in transactions)

        return {
            "year": year,
            "month": month,
            "total_transacciones": len(transactions),
            "total_ventas": total_ventas,
            "total_efectivo": total_efectivo,
            "promedio_diario": total_ventas / 30 if transactions else 0
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener estadísticas mensuales: {str(e)}")

@router.get("/by-teacher/{teacher_name}", response_model=List[Transaction])
async def get_transactions_by_teacher(
    teacher_name: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    only_unpaid: bool = False,
    caja_id: Optional[int] = None
):
    """Obtener todas las transacciones de un maestro específico"""
    try:
        mongo_filter = {"cliente": teacher_name, "caja_id": normalize_caja_id(caja_id)}

        # Aplicar filtros
        if fecha_desde:
            mongo_filter.setdefault("fecha", {})["$gte"] = _parse_date(fecha_desde)
        if fecha_hasta:
            mongo_filter.setdefault("fecha", {})["$lte"] = _parse_date(fecha_hasta)
        if only_unpaid:
            mongo_filter["pagado"] = "NO"

        transactions = list(
            db.transactions.find(mongo_filter, {"_id": 0})
            .sort([("fecha", DESCENDING), ("id", DESCENDING)])
            .skip(skip)
            .limit(limit)
        )
        return transactions
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener transacciones del maestro: {str(e)}")

@router.get("/by-teacher/{teacher_name}/summary")
async def get_teacher_summary(teacher_name: str, caja_id: Optional[int] = None):
    """Obtener resumen de transacciones de un maestro"""
    try:
        # Obtener todas las transacciones del maestro
        transactions = list(
            db.transactions.find(
                {"cliente": teacher_name, "caja_id": normalize_caja_id(caja_id)},
                {"_id": 0},
            )
        )

        if not transactions:
            return {
                "teacher_name": teacher_name,
                "total_transactions": 0,
                "total_amount": 0,
                "total_paid": 0,
                "total_pending": 0,
                "unpaid_transactions": []
            }

        total_amount = sum(t["total"] for t in transactions)
        total_paid = sum(t["pago"] for t in transactions)
        total_pending = sum(t["total"] - t["pago"] for t in transactions if t["pagado"] == "NO")
        unpaid_transactions = [t for t in transactions if t["pagado"] == "NO"]

        return {
            "teacher_name": teacher_name,
            "grupo": transactions[0]["grupo"] if transactions else "",
            "total_transactions": len(transactions),
            "total_amount": total_amount,
            "total_paid": total_paid,
            "total_pending": total_pending,
            "unpaid_transactions": unpaid_transactions
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener resumen del maestro: {str(e)}")
