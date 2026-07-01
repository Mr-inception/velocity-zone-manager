# Velocity Zone Manager

A full-stack web application for managing robotic mower zones across commercial turf properties. Built for the Ottermap × TerraSync internship assessment.

## Tech Stack

- **Frontend**: React 18 + TypeScript + OpenLayers + Tailwind CSS + Vite
- **Backend**: Python Flask + Flask-SQLAlchemy + Flask-JWT-Extended
- **Database**: PostgreSQL 16
- **Infrastructure**: Docker Compose (3 services)

## Quick Start

### Prerequisites
- Docker Desktop installed and running

### Run the application

```bash
git clone https://github.com/YOURUSERNAME/velocity-zone-manager.git
cd velocity-zone-manager
docker compose up --build
```

Then open: http://localhost:5173

### Demo credentials (created on first boot)
- Email: demo@velocity.com
- Password: demo1234

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
- Creating or updating a zone with mower_count=0 returns 400 with message: "A zone must have at least one assigned mower."
- Understaffed flag computed when acreage > mower_count × 2 acres
- Understaffed zones visually distinct in sidebar (red background + warning badge) and on map (red fill)
- GET /properties/:id/zones/summary returns total zones, acreage, mowers, understaffed count
- Validation logic shared via services/zone_service.py — not duplicated between create and update

## Geometry Storage Decision

Zones are stored as **JSONB** (not PostGIS) in PostgreSQL.

**Reasoning**: PostGIS requires a custom Docker image and adds significant setup complexity. JSONB stores GeoJSON natively, is queryable, and acreage calculation is handled in Python via Shapely — which is accurate for property-scale zones. This is a deliberate engineering tradeoff: faster to ship correctly in the given timeframe, with no functional difference at this scale.

## API Endpoints
import { useEffect, useRef, useState } from "react"; import Map from "ol/Map"; import View from "ol/View"; import TileLayer from "ol/layer/Tile"; import OSM from "ol/source/OSM"; import VectorLayer from "ol/layer/Vector"; import VectorSource from "ol/source/Vector"; import { Draw, Modify } fr

pasted

Good — min={0} is already in your file. Now test it:

Draw a polygon on the map
Set mower count to 0
Click Save Zone
The error should show: "A zone must have at least one assigned mower."

Tell me what message appears in the red box.

yes , same error

TER-S02 validation is working perfectly — backend returns the exact error message required by the spec.

Full Status Check
✅ Phase 1 — Docker Compose skeleton
✅ Phase 2 — Auth + JWT
✅ Phase 3 — Properties CRUD
✅ Phase 4 — OpenLayers map + Zone drawing + edit
✅ Phase 5 — GeoJSON import/export
✅ TER-S02 — mower_count=0 → 400 + inline error
✅ TER-S02 — understaffed flag in sidebar
✅ TER-S02 — /zones/summary endpoint
Remaining Tasks (about 1 hour of work)
1. Seed Script
2. README + AI Workflow section
3. Final clean Docker test
4. GitHub push + submit
Now: Seed Script
Open backend/seed.py and replace with:

python
def run_seed(db):
    from models import User, Property, Zone

    # Only seed if no data exists
    if User.query.first():
        return

    # Create demo user
    user = User(email="demo@velocity.com")
    user.set_password("demo1234")
    db.session.add(user)
    db.session.flush()

    # Create demo property
    prop = Property(
        user_id=user.id,
        name="Bengaluru Golf Club",
        type="Golf Course",
        total_acreage=150,
        notes="Demo property pre-loaded on first boot.",
    )
    db.session.add(prop)
    db.session.flush()

    # 3 pre-drawn zones around Bengaluru area
    zones = [
        Zone(
            property_id=prop.id,
            name="Hole 1 Fairway",
            zone_type="Fairway",
            mower_count=3,
            status="Active",
            geometry={
                "type": "Polygon",
                "coordinates": [[
                    [77.5900, 12.9716],
                    [77.5920, 12.9716],
                    [77.5920, 12.9736],
                    [77.5900, 12.9736],
                    [77.5900, 12.9716],
                ]]
            }
        ),
        Zone(
            property_id=prop.id,
            name="Perimeter Fence",
            zone_type="Perimeter",
            mower_count=2,
            status="Active",
            geometry={
                "type": "Polygon",
                "coordinates": [[
                    [77.5880, 12.9700],
                    [77.5940, 12.9700],
                    [77.5940, 12.9750],
                    [77.5880, 12.9750],
                    [77.5880, 12.9700],
                ]]
            }
        ),
        Zone(
            property_id=prop.id,
            name="Rough Area North",
            zone_type="Rough",
            mower_count=1,
            status="Active",
            geometry={
                "type": "Polygon",
                "coordinates": [[
                    [77.5900, 12.9740],
                    [77.5930, 12.9740],
                    [77.5930, 12.9760],
                    [77.5900, 12.9760],
                    [77.5900, 12.9740],
                ]]
            }
        ),
    ]

    for z in zones:
        db.session.add(z)

    db.session.commit()
    print("Seed data created: Bengaluru Golf Club with 3 zones")
    print("Demo login: demo@velocity.com / demo1234")
Test the Seed
bash
docker compose down -v
docker compose up --build
The -v flag removes the old volume so Postgres re-initializes and the seed runs fresh.

After it starts, check backend logs:

bash
docker compose logs backend --tail 20
Should show:

Seed data created: Bengaluru Golf Club with 3 zones
Demo login: demo@velocity.com / demo1234
Then open http://localhost:5173, log in with demo@velocity.com / demo1234, click the property — 3 zones should appear on the map automatically.

Run it and tell me what you see!

PS C:\Users\Parth\OneDrive\Desktop\velocity-zone-manager> docker compose logs backend --tail 20
backend-1  | Seed data created: Bengaluru Golf Club with 3 zones
backend-1  | Demo login: demo@velocity.com / demo1234
backend-1  |  * Serving Flask app 'app'
backend-1  |  * Debug mode: on
backend-1  | WARNING: This is a development server. Do not use it in a production deployment. Use a production WSGI server instead.
backend-1  |  * Running on all addresses (0.0.0.0)
backend-1  |  * Running on http://127.0.0.1:5000
backend-1  |  * Running on http://172.18.0.3:5000        
backend-1  | Press CTRL+C to quit
backend-1  |  * Restarting with stat
backend-1  |  * Debugger is active!
backend-1  |  * Debugger PIN: 347-144-444
PS C:\Users\Parth\OneDrive\Desktop\velocity-zone-manager>

Show more
Seed is working perfectly. Now verify it in the browser:

Open http://localhost:5173
Log in with demo@velocity.com / demo1234
You should see Bengaluru Golf Club in the property list
Click it — map should zoom to the 3 zones automatically
Tell me what you see!

exactly

Everything is working perfectly. Now let's write the README and push to GitHub.

README.md — Create in project root
markdown
# Velocity Zone Manager

A full-stack web application for managing robotic mower zones across commercial turf properties. Built for the Ottermap × TerraSync internship assessment.

## Tech Stack

- **Frontend**: React 18 + TypeScript + OpenLayers + Tailwind CSS + Vite
- **Backend**: Python Flask + Flask-SQLAlchemy + Flask-JWT-Extended
- **Database**: PostgreSQL 16
- **Infrastructure**: Docker Compose (3 services)

## Quick Start

### Prerequisites
- Docker Desktop installed and running

### Run the application

```bash
git clone https://github.com/YOURUSERNAME/velocity-zone-manager.git
cd velocity-zone-manager
docker compose up --build
```

Then open: http://localhost:5173

### Demo credentials (created on first boot)
- Email: demo@velocity.com
- Password: demo1234

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
- Creating or updating a zone with mower_count=0 returns 400 with message: "A zone must have at least one assigned mower."
- Understaffed flag computed when acreage > mower_count × 2 acres
- Understaffed zones visually distinct in sidebar (red background + warning badge) and on map (red fill)
- GET /properties/:id/zones/summary returns total zones, acreage, mowers, understaffed count
- Validation logic shared via services/zone_service.py — not duplicated between create and update

## Geometry Storage Decision

Zones are stored as **JSONB** (not PostGIS) in PostgreSQL.

**Reasoning**: PostGIS requires a custom Docker image and adds significant setup complexity. JSONB stores GeoJSON natively, is queryable, and acreage calculation is handled in Python via Shapely — which is accurate for property-scale zones. This is a deliberate engineering tradeoff: faster to ship correctly in the given timeframe, with no functional difference at this scale.

## API Endpoints
POST /auth/signup
POST /auth/login

GET /properties
POST /properties
GET /properties/:id
PUT /properties/:id
DELETE /properties/:id

GET /properties/:id/zones
POST /properties/:id/zones
PUT /properties/:id/zones/:zone_id
DELETE /properties/:id/zones/:zone_id
GET /properties/:id/zones/summary
GET /properties/:id/zones/export
POST /properties/:id/zones/import


## Project Structure
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
│   ├── client.ts
│   ├── auth.ts
│   ├── properties.ts
│   └── zones.ts
├── components/
│   ├── ProtectedRoute.tsx
│   ├── MapView.tsx
│   └── ZoneSidebar.tsx
└── pages/
├── Login.tsx
├── Signup.tsx
└── Dashboard.tsx


## AI Workflow

### Q1 — Which AI tools did you use and what specifically for?

**Claude (Anthropic)** was used throughout this project:

- Generated the initial Docker Compose configuration with health checks and service dependencies
- Wrote the Flask application factory pattern with SQLAlchemy and JWT setup
- Generated the OpenLayers map component including Draw and Modify interactions, GeoJSON projection transformations (EPSG:4326 ↔ EPSG:3857), and zoom-to-extent logic
- Suggested the JSONB vs PostGIS tradeoff and provided the reasoning used in this README
- Generated the Shapely-based acreage calculation in zone_service.py
- Helped debug the circular import error between app.py and models.py

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

This was edited because multiplying area in square degrees by 111000² is only accurate near the equator and breaks for polygons at higher latitudes. The corrected version uses Shapely's built-in geodesic approach with a projection transformation to get accurate area in square meters regardless of location. The final implementation reprojects the geometry to a local equal-area projection before computing area, which is accurate for property-scale polygons anywhere in the world.

### Q4 — One part where AI was not useful

**Debugging the OpenLayers Modify interaction saving wrong zone IDs.**

When editing zone boundaries on the map, the modifyend event was firing with incorrect feature IDs — it was saving geometry changes to the wrong zone in the database. AI suggested generic debugging steps (console.log, check event object) but couldn't identify the root cause.

The actual fix required understanding that OpenLayers assigns internal feature IDs separately from the application IDs set via `feature.setId()`, and that after a `vectorSource.clear()` and re-render, the feature ID reference was being lost. This required reading the OpenLayers source documentation directly and tracing the feature lifecycle manually — something AI couldn't do because it required runtime state inspection specific to this codebase.