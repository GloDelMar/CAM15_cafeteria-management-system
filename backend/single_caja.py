from datetime import datetime
from typing import Optional

from database import db, get_next_sequence

SINGLE_CAJA_NOMBRE = "CAFETERIA CAM 15"
SINGLE_CAJA_DESCRIPCION = "Caja registradora unica de la cafeteria CAM 15"


def get_or_create_single_caja() -> dict:
    """Garantiza que exista una caja unica para la cafeteria CAM 15."""
    caja = db.cajas.find_one({"nombre": SINGLE_CAJA_NOMBRE}, {"_id": 0})
    if caja:
        if not caja.get("activa", True):
            db.cajas.update_one({"id": caja["id"]}, {"$set": {"activa": True}})
            caja["activa"] = True
        return caja

    caja_doc = {
        "id": get_next_sequence("cajas"),
        "nombre": SINGLE_CAJA_NOMBRE,
        "descripcion": SINGLE_CAJA_DESCRIPCION,
        "activa": True,
        "saldo_inicial": 0.0,
        "created_at": datetime.utcnow(),
    }
    db.cajas.insert_one(caja_doc)
    return caja_doc


def get_single_caja_id() -> int:
    return int(get_or_create_single_caja()["id"])


def normalize_caja_id(_: Optional[int] = None) -> int:
    """Fuerza el uso de la caja unica, ignorando cualquier caja solicitada."""
    return get_single_caja_id()
