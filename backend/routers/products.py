from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import FileResponse, RedirectResponse, Response
from typing import List, Optional
from models.schemas import Product, ProductCreate, ProductUpdate
from database import db, get_next_sequence
from pymongo import ASCENDING
import uuid
from datetime import datetime
from services.storage import (
    save_product_image,
    delete_product_image,
    get_local_product_image_path,
    load_s3_product_image,
)
from single_caja import normalize_caja_id

router = APIRouter()


def _serialize(doc: Optional[dict]) -> Optional[dict]:
    if not doc:
        return None
    doc.pop("_id", None)
    return doc

@router.get("/", response_model=List[Product])
async def get_all_products(caja_id: Optional[int] = None):
    """Obtener todos los productos de la caja unica."""
    try:
        query = {"caja_id": normalize_caja_id(caja_id)}

        products = list(db.products.find(query, {"_id": 0}).sort("name", ASCENDING))
        return products
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener productos: {str(e)}")

@router.get("/{product_id}", response_model=Product)
async def get_product(product_id: int):
    """Obtener un producto por ID"""
    try:
        product = db.products.find_one({"id": product_id}, {"_id": 0})
        if not product:
            raise HTTPException(status_code=404, detail="Producto no encontrado")
        return product
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener producto: {str(e)}")


@router.get("/{product_id}/image")
async def get_product_image(product_id: int):
    """Servir la imagen del producto mediante el backend para evitar URLs rotas o privadas."""
    try:
        product = db.products.find_one({"id": product_id}, {"_id": 0})
        if not product:
            raise HTTPException(status_code=404, detail="Producto no encontrado")

        image_url = product.get("image_url")
        if not image_url:
            raise HTTPException(status_code=404, detail="Producto sin imagen")

        if image_url.startswith("http"):
            try:
                content, content_type = load_s3_product_image(image_url)
                return Response(content=content, media_type=content_type)
            except Exception:
                return RedirectResponse(url=image_url, status_code=307)

        image_path = get_local_product_image_path(image_url)
        if not image_path.exists():
            raise HTTPException(status_code=404, detail="Archivo de imagen no encontrado")

        return FileResponse(path=image_path)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener imagen: {str(e)}")

@router.post("/", response_model=Product, status_code=201)
async def create_product(product: ProductCreate):
    """Crear un nuevo producto"""
    try:
        product_dict = product.model_dump()
        product_dict["caja_id"] = normalize_caja_id(product_dict.get("caja_id"))
        product_dict["id"] = get_next_sequence("products")
        product_dict["created_at"] = datetime.utcnow()
        print(f"[DEBUG] Creating product with data: {product_dict}")
        db.products.insert_one(product_dict)
        print("[DEBUG] Mongo insert completed")
        return _serialize(product_dict)
    except Exception as e:
        print(f"[ERROR] Exception creating product: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error al crear producto: {str(e)}")

@router.put("/{product_id}", response_model=Product)
async def update_product(product_id: int, product: ProductUpdate):
    """Actualizar un producto existente"""
    try:
        # Verificar que existe
        existing = db.products.find_one({"id": product_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Producto no encontrado")

        # Actualizar solo campos proporcionados
        update_dict = product.model_dump(exclude_unset=True)
        if not update_dict:
            raise HTTPException(status_code=400, detail="No hay campos para actualizar")

        if "caja_id" in update_dict:
            update_dict["caja_id"] = normalize_caja_id(update_dict.get("caja_id"))

        db.products.update_one({"id": product_id}, {"$set": update_dict})
        updated = db.products.find_one({"id": product_id}, {"_id": 0})
        return updated
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al actualizar producto: {str(e)}")

@router.delete("/{product_id}", status_code=204)
async def delete_product(product_id: int):
    """Eliminar un producto"""
    try:
        existing = db.products.find_one({"id": product_id}, {"_id": 0})
        if not existing:
            raise HTTPException(status_code=404, detail="Producto no encontrado")

        # Eliminar imagen si existe
        if existing.get("image_url"):
            try:
                delete_product_image(existing["image_url"])
            except:
                pass  # Continuar aunque falle el borrado de imagen

        db.products.delete_one({"id": product_id})
        return None
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al eliminar producto: {str(e)}")

@router.post("/upload-image/{product_id}")
async def upload_product_image(product_id: int, file: UploadFile = File(...)):
    """Subir imagen para un producto"""
    try:
        # Verificar que el producto existe
        existing = db.products.find_one({"id": product_id}, {"_id": 0})
        if not existing:
            raise HTTPException(status_code=404, detail="Producto no encontrado")

        # Validar tipo de archivo
        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="El archivo debe ser una imagen")

        # Generar nombre único
        ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
        unique_name = f"{product_id}_{uuid.uuid4()}.{ext}"

        # Guardar archivo en S3 (si esta configurado) o localmente como fallback
        file_bytes = await file.read()
        public_url = save_product_image(
            unique_name=unique_name,
            file_bytes=file_bytes,
            content_type=file.content_type or "image/jpeg",
        )

        # Actualizar producto con nueva URL
        db.products.update_one({"id": product_id}, {"$set": {"image_url": public_url}})

        return {"image_url": public_url}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al subir imagen: {str(e)}")
