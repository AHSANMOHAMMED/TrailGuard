# TrailGuard
Offline-first wildlife conservation & anti-poaching field system.

## Quick start

### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
API docs: http://127.0.0.1:8000/docs

### Mobile (Expo)
```bash
cd mobile
npm install
npx expo start
```

### Environment
Copy `backend/.env.example` → `backend/.env`

## Modules
- UC01 Patrol · UC02 Incidents · UC03 Conflict · UC04 Reports
