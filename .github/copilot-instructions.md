# Cafeteria CAM 15 - POS Web Application

## Project Overview
Full-stack Point of Sale web application migrated from Kivy to modern web technologies.

**Stack:**
- Frontend: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Backend: FastAPI + Python
- Database: MongoDB Atlas

**Deployment:**
- Frontend: Vercel (free tier)
- Backend: Render (free tier)
- Database: MongoDB Atlas (free tier)

## Project Structure
```
/frontend          - Next.js application
/backend           - FastAPI application
/kivy_app          - Original Kivy application (reference)
```

## Development Setup

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

## Features
- Product management with images
- Shopping cart and checkout
- Transaction history with detailed products
- Debtor tracking system
- Cash register operations
- Receipt generation (PDF)
- Responsive design
- Dark/light theme

## Environment Variables
See `.env.example` files in frontend and backend directories.
