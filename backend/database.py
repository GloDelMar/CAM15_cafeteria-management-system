import os
from pymongo import ASCENDING, MongoClient, ReturnDocument
from dotenv import load_dotenv
import certifi

load_dotenv()

mongodb_uri: str = os.getenv("MONGODB_URI", "").strip()
mongodb_db_name: str = os.getenv("MONGODB_DB", "cafeteria_cam15").strip()
mongodb_timeout_ms: int = int(os.getenv("MONGODB_SERVER_SELECTION_TIMEOUT_MS", "15000"))

if not mongodb_uri:
    raise RuntimeError("Missing MONGODB_URI in environment configuration")

mongo_client: MongoClient = MongoClient(
    mongodb_uri,
    serverSelectionTimeoutMS=mongodb_timeout_ms,
    tls=True,
    tlsCAFile=certifi.where(),
)
mongo_client.admin.command("ping")
db = mongo_client[mongodb_db_name]


def get_next_sequence(collection_name: str) -> int:
    counter = db.counters.find_one_and_update(
        {"_id": collection_name},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    return int(counter["seq"])


def _initialize_indexes() -> None:
    collections_with_numeric_id = [
        "cajas",
        "products",
        "transactions",
        "debtors",
        "cash_operations",
        "documents",
    ]
    for collection in collections_with_numeric_id:
        db[collection].create_index([("id", ASCENDING)], unique=True)

    db.cajas.create_index([("nombre", ASCENDING)], unique=True)
    db.products.create_index([("name", ASCENDING)])
    db.transactions.create_index([("fecha", ASCENDING)])
    db.debtors.create_index([("deuda", ASCENDING)])
    db.cash_operations.create_index([("fecha", ASCENDING)])
    db.documents.create_index([("created_at", ASCENDING)])


_initialize_indexes()
