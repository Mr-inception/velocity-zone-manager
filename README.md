# Velocity Zone Manager

A full-stack web application for managing robotic mower zones across commercial turf properties. Built for the Ottermap × TerraSync internship assessment.

## Tech Stack

- **Frontend**: React 19 + TypeScript + OpenLayers + Tailwind CSS + Vite
- **Backend**: Python Flask + Flask-SQLAlchemy + Flask-JWT-Extended
- **Database**: PostgreSQL 16
- **Infrastructure**: Docker Compose (3 services)

## Quick Start

### Prerequisites

- Docker Desktop installed and running

### Run the application

```bash
git clone https://github.com/Mr-inception/velocity-zone-manager.git
cd velocity-zone-manager
docker compose up --build
```

Then open: http://localhost:5173

### Demo credentials (created on first boot)

- Email: `demo@velocity.com`
- Password: `demo1234`

### Seed data

On first boot, a seed script automatically creates:

- 1 demo property: Bengaluru Golf Club (Golf Course, 150 acres)
- 3 pre-drawn zones: Hole 1 Fairway, Perimeter Fence, Rough Area North

## Features

### TER-S01 — Foundation

- JWT authentication (signup, login, logout, protected routes)
- Property CRUD with search by name and filter by type
- Draw polygon zones on an OpenLayers map
- Edit zone boundaries directly on the map (drag vertices)
- Upload a GeoJSON FeatureCollection to pre-populate zones
- Download current zones as a valid GeoJSON FeatureCollection
- Map zooms to zone extent on load; defaults to India view if no zones
- Zone sidebar with auto-calculated acreage and understaffed flag

### TER-S02 — Business Logic

- Creating or updating a zone with `mower_count=0` returns 400 with message: `"A zone must have at least one assigned mower."`
- Understaffed flag computed when acreage > mower_count × 2 acres
- Understaffed zones visually distinct in sidebar (red background + warning badge) and on map (red fill)
- `GET /properties/:id/zones/summary` returns total zones, acreage, mowers, understaffed count
- Validation logic shared via `services/zone_service.py` — not duplicated between create and update

## Geometry Storage Decision

Zones are stored as **JSONB** (not PostGIS) in PostgreSQL.

**Reasoning**: PostGIS requires a custom Docker image and adds significant setup complexity. JSONB stores GeoJSON natively, is queryable, and acreage calculation is handled in Python via Shapely + pyproj geodesic area — which is accurate for property-scale zones. This is a deliberate engineering tradeoff: faster to ship correctly in the given timeframe, with no functional difference at this scale.

## API Endpoints

```
POST   /auth/signup
POST   /auth/login

GET    /properties
POST   /properties
GET    /properties/:id
PUT    /properties/:id
DELETE /properties/:id

GET    /properties/:id/zones
POST   /properties/:id/zones
PUT    /properties/:id/zones/:zone_id
DELETE /properties/:id/zones/:zone_id
GET    /properties/:id/zones/summary
GET    /properties/:id/zones/export
POST   /properties/:id/zones/import
```

## Project Structure

```
velocity-zone-manager/
├── docker-compose.yml
├── README.md
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── app.py
│   ├── models.py
│   ├── extensions.py
│   ├── auth_utils.py
│   ├── seed.py
│   ├── routes/
│   │   ├── auth.py
│   │   ├── properties.py
│   │   └── zones.py
│   └── services/
│       └── zone_service.py
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── tailwind.config.js
    └── src/
        ├── api/
        ├── components/
        └── pages/
```

## AI Workflow

### Q1 — Which AI tools did you use and what specifically for?

**Claude (Anthropic)** was used throughout this project:

- Generated the initial Docker Compose configuration with health checks and service dependencies
- Wrote the Flask application factory pattern with SQLAlchemy and JWT setup
- Generated the OpenLayers map component including Draw and Modify interactions, GeoJSON projection transformations (EPSG:4326 ↔ EPSG:3857), and zoom-to-extent logic
- Suggested the JSONB vs PostGIS tradeoff and provided the reasoning used in this README
- Generated the Shapely/pyproj-based acreage calculation in `zone_service.py`
- Helped debug the circular import error between `app.py` and `models.py`

### Q2 — One example of AI output accepted with no changes

**Prompt given:**
"Write a Flask decorator that verifies JWT tokens and returns 401 if missing or invalid, and a helper function to get the current user ID from the token."

**Output used verbatim** (`backend/auth_utils.py`):

```python
from functools import wraps
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity

def jwt_required_custom(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        try:
            verify_jwt_in_request()
        except Exception:
            return jsonify({"error": "Authentication required."}), 401
        return fn(*args, **kwargs)
    return wrapper

def current_user_id():
    return int(get_jwt_identity())
```

This was accepted without changes because it cleanly wraps Flask-JWT-Extended's built-in functions, handles the exception correctly, and is reusable across all protected routes.

### Q3 — One example of AI output rejected or significantly edited

AI initially generated the acreage calculation using a flat square-degree approximation:

```python
area_sq_meters = polygon.area * (111000 ** 2)
```

This was edited because multiplying area in square degrees by 111000² is only accurate near the equator and breaks for polygons at higher latitudes. The corrected version uses pyproj's WGS84 geodesic area calculation via `Geod.geometry_area_perimeter()`, which returns accurate square meters regardless of latitude — appropriate for property-scale polygons anywhere in the world.

### Q4 — One part where AI was not useful

**Debugging the OpenLayers Modify interaction saving wrong zone IDs.**

When editing zone boundaries on the map, the `modifyend` event was firing with incorrect feature IDs — it was saving geometry changes to the wrong zone in the database. AI suggested generic debugging steps (console.log, check event object) but couldn't identify the root cause.

The actual fix required understanding that OpenLayers assigns internal feature IDs separately from the application IDs set via `feature.setId()`, and that after a `vectorSource.clear()` and re-render, the feature ID reference was being lost. This required reading the OpenLayers source documentation directly and tracing the feature lifecycle manually — something AI couldn't do because it required runtime state inspection specific to this codebase.
