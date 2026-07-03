#!/usr/bin/env python3
"""
Script para preparar la caja unica del sistema en MongoDB.
"""
from pymongo import ASCENDING

from database import db
from single_caja import get_or_create_single_caja


def ensure_indexes() -> None:
    db.cajas.create_index([("id", ASCENDING)], unique=True)
    db.cajas.create_index([("nombre", ASCENDING)], unique=True)


def main() -> None:
    print("🚀 Inicializando caja unica en MongoDB...")
    print("=" * 60)
    print()

    print("📦 Paso 1: Verificando indices...")
    ensure_indexes()
    print("   ✅ Indices verificados")
    print()

    print("📝 Paso 2: Garantizando caja unica...")
    caja = get_or_create_single_caja()
    print(f"   ✅ Caja activa: {caja['nombre']} (ID: {caja['id']})")
    print(f"      Saldo inicial: ${float(caja.get('saldo_inicial', 0)):.2f}")
    print()

    print("✅ Verificacion final:")
    cajas = list(db.cajas.find({}, {"_id": 0, "id": 1, "nombre": 1, "activa": 1, "saldo_inicial": 1}).sort("nombre", ASCENDING))
    for item in cajas:
                status = "Activa" if item.get("activa") else "Inactiva"
                print(f"   - {item['nombre']} (ID: {item['id']}) [{status}]")
    print()

    print("=" * 60)
    print("🎉 Inicializacion completada")
    print()


if __name__ == "__main__":
    main()
