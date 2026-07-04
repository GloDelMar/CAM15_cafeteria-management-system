from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from routers import products, transactions, debtors, cash, cajas, documents
from pathlib import Path
from dotenv import load_dotenv
from single_caja import get_or_create_single_caja

load_dotenv()

app = FastAPI(
    title="Cafeteria CAM 15 API",
    description="Point of Sale API for Cafeteria CAM 15",
    version="1.0.0"
)

uploads_dir = Path(__file__).resolve().parent / "uploads"
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(uploads_dir)), name="static")

# CORS configuration - Allow all origins for production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for Vercel deployment
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(cajas.router, prefix="/api/cajas", tags=["cajas"])
app.include_router(products.router, prefix="/api/products", tags=["products"])
app.include_router(transactions.router, prefix="/api/transactions", tags=["transactions"])
app.include_router(debtors.router, prefix="/api/debtors", tags=["debtors"])
app.include_router(cash.router, prefix="/api/cash", tags=["cash"])
app.include_router(documents.router, prefix="/api/documents", tags=["documents"])


@app.on_event("startup")
async def ensure_single_caja() -> None:
    get_or_create_single_caja()

@app.get("/")
async def root():
    return {"message": "Cafeteria CAM 15 API - Point of Sale System"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
