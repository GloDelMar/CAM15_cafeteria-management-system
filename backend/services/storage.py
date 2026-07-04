import os
from pathlib import Path
from urllib.parse import urlparse
import re


def _s3_enabled() -> bool:
    return bool(
        os.getenv("AWS_S3_BUCKET")
        and os.getenv("AWS_ACCESS_KEY_ID")
        and os.getenv("AWS_SECRET_ACCESS_KEY")
    )


def _get_s3_client():
    try:
        import boto3
    except ImportError as exc:
        raise RuntimeError(
            "boto3 no esta instalado. Instala dependencias del backend para usar S3."
        ) from exc

    region = os.getenv("AWS_REGION", "us-east-1")
    endpoint_url = os.getenv("AWS_S3_ENDPOINT_URL")

    return boto3.client(
        "s3",
        region_name=region,
        endpoint_url=endpoint_url if endpoint_url else None,
    )


def _build_s3_public_url(object_key: str) -> str:
    custom_public_url = os.getenv("AWS_S3_PUBLIC_URL", "").rstrip("/")
    if custom_public_url:
        return f"{custom_public_url}/{object_key}"

    bucket = os.getenv("AWS_S3_BUCKET")
    region = os.getenv("AWS_REGION", "us-east-1")

    if region == "us-east-1":
        return f"https://{bucket}.s3.amazonaws.com/{object_key}"

    return f"https://{bucket}.s3.{region}.amazonaws.com/{object_key}"


def _sanitize_path_component(value: str) -> str:
    sanitized = re.sub(r"[^a-zA-Z0-9._-]", "-", value.strip())
    return sanitized.strip("-") or "general"


def save_product_image(unique_name: str, file_bytes: bytes, content_type: str) -> str:
    """Guarda imagen en S3 si esta configurado; si no, usa almacenamiento local."""
    if _s3_enabled():
        bucket = os.getenv("AWS_S3_BUCKET")
        object_key = f"products/{unique_name}"
        s3_client = _get_s3_client()
        s3_client.put_object(
            Bucket=bucket,
            Key=object_key,
            Body=file_bytes,
            ContentType=content_type,
        )
        return _build_s3_public_url(object_key)

    uploads_dir = Path(__file__).resolve().parents[1] / "uploads" / "products"
    uploads_dir.mkdir(parents=True, exist_ok=True)
    target_file = uploads_dir / unique_name
    target_file.write_bytes(file_bytes)
    return f"/static/products/{unique_name}"


def save_document_file(category: str, unique_name: str, file_bytes: bytes, content_type: str) -> str:
    """Guarda documentos generados (pdf/docx/etc.) en S3 o local."""
    safe_category = _sanitize_path_component(category)
    safe_name = _sanitize_path_component(unique_name)

    if _s3_enabled():
        bucket = os.getenv("AWS_S3_BUCKET")
        object_key = f"documents/{safe_category}/{safe_name}"
        s3_client = _get_s3_client()
        s3_client.put_object(
            Bucket=bucket,
            Key=object_key,
            Body=file_bytes,
            ContentType=content_type,
        )
        return _build_s3_public_url(object_key)

    uploads_dir = Path(__file__).resolve().parents[1] / "uploads" / "documents" / safe_category
    uploads_dir.mkdir(parents=True, exist_ok=True)
    target_file = uploads_dir / safe_name
    target_file.write_bytes(file_bytes)
    return f"/static/documents/{safe_category}/{safe_name}"


def delete_product_image(image_url: str) -> None:
    if not image_url:
        return

    if _s3_enabled() and image_url.startswith("http"):
        bucket = os.getenv("AWS_S3_BUCKET")
        parsed = urlparse(image_url)
        object_key = parsed.path.lstrip("/")

        if object_key:
            try:
                s3_client = _get_s3_client()
                s3_client.delete_object(Bucket=bucket, Key=object_key)
            except Exception:
                pass
        return

    # Fallback para URLs locales /static/products/<archivo>
    image_path = image_url.split("/")[-1]
    image_file = Path(__file__).resolve().parents[1] / "uploads" / "products" / image_path
    if image_file.exists():
        image_file.unlink()


def get_local_product_image_path(image_url: str) -> Path:
    image_name = image_url.split("/")[-1]
    return Path(__file__).resolve().parents[1] / "uploads" / "products" / image_name


def get_local_static_file_path(file_url: str) -> Path:
    relative_path = file_url.replace("/static/", "", 1)
    return Path(__file__).resolve().parents[1] / "uploads" / relative_path


def get_s3_object_key(image_url: str) -> str:
    parsed = urlparse(image_url)
    return parsed.path.lstrip("/")


def _get_s3_bucket_and_key(image_url: str) -> tuple[str, str]:
    parsed = urlparse(image_url)
    host = (parsed.netloc or "").lower()
    raw_path = parsed.path.lstrip("/")

    # Formato virtual-hosted:
    # - <bucket>.s3.amazonaws.com/<key>
    # - <bucket>.s3.<region>.amazonaws.com/<key>
    # - <bucket>.s3-<region>.amazonaws.com/<key>
    if ".s3." in host or ".s3-" in host:
        bucket = host.split(".s3", 1)[0]
        key = raw_path
        if bucket and key:
            return bucket, key

    # Formato path-style:
    # - s3.amazonaws.com/<bucket>/<key>
    # - s3.<region>.amazonaws.com/<bucket>/<key>
    # - s3-<region>.amazonaws.com/<bucket>/<key>
    if host.startswith("s3"):
        parts = raw_path.split("/", 1)
        if len(parts) == 2 and parts[0] and parts[1]:
            return parts[0], parts[1]

    # Fallback (CDN/custom domain): usar bucket configurado y path como key.
    bucket = os.getenv("AWS_S3_BUCKET", "").strip()
    if bucket and raw_path:
        return bucket, raw_path

    raise FileNotFoundError("No se pudo determinar bucket/key desde image_url")


def load_s3_product_image(image_url: str) -> tuple[bytes, str]:
    bucket, object_key = _get_s3_bucket_and_key(image_url)

    s3_client = _get_s3_client()
    response = s3_client.get_object(Bucket=bucket, Key=object_key)
    content_type = response.get("ContentType") or "application/octet-stream"
    return response["Body"].read(), content_type
