from datetime import datetime
from pathlib import Path
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, Response

from database import db, get_next_sequence
from services.storage import get_local_static_file_path, load_s3_product_image, save_document_file

router = APIRouter()

ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/png",
    "image/jpeg",
    "image/webp",
}


@router.post("/upload", status_code=201)
async def upload_document(
    file: UploadFile = File(...),
    category: str = Form("general"),
    reference_type: Optional[str] = Form(None),
    reference_id: Optional[str] = Form(None),
):
    """Sube documentos generados por el sistema (tickets, reportes, etc.)."""
    try:
        if not file.filename:
            raise HTTPException(status_code=400, detail="Archivo invalido")

        content_type = file.content_type or "application/octet-stream"
        if content_type not in ALLOWED_CONTENT_TYPES:
            raise HTTPException(status_code=400, detail="Tipo de archivo no permitido")

        file_bytes = await file.read()
        if not file_bytes:
            raise HTTPException(status_code=400, detail="Archivo vacio")

        max_bytes = 15 * 1024 * 1024
        if len(file_bytes) > max_bytes:
            raise HTTPException(status_code=400, detail="El archivo excede 15MB")

        extension = Path(file.filename).suffix or ".bin"
        unique_name = f"{uuid4().hex}{extension}"
        file_url = save_document_file(category=category, unique_name=unique_name, file_bytes=file_bytes, content_type=content_type)

        record = {
            "id": get_next_sequence("documents"),
            "filename": file.filename,
            "content_type": content_type,
            "size": len(file_bytes),
            "category": category,
            "reference_type": reference_type,
            "reference_id": reference_id,
            "file_url": file_url,
            "created_at": datetime.utcnow(),
        }

        db.documents.insert_one(record)
        record.pop("_id", None)
        return record
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al subir documento: {str(e)}")


@router.get("/{document_id}")
async def get_document(document_id: int):
    try:
        doc = db.documents.find_one({"id": document_id}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Documento no encontrado")
        return doc
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener documento: {str(e)}")


@router.get("/{document_id}/content")
async def get_document_content(document_id: int):
    try:
        doc = db.documents.find_one({"id": document_id}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Documento no encontrado")

        file_url = doc.get("file_url")
        if not file_url:
            raise HTTPException(status_code=404, detail="Documento sin URL")

        if file_url.startswith("http"):
            content, content_type = load_s3_product_image(file_url)
            return Response(content=content, media_type=content_type)

        local_file_path = get_local_static_file_path(file_url)
        if not local_file_path.exists():
            raise HTTPException(status_code=404, detail="Archivo local no encontrado")

        return FileResponse(path=local_file_path)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener contenido: {str(e)}")
