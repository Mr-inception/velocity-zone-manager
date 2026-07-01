from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from extensions import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    properties = db.relationship("Property", backref="owner", cascade="all, delete-orphan")

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {"id": self.id, "email": self.email}


class Property(db.Model):
    __tablename__ = "properties"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    type = db.Column(db.String(50), nullable=False)  # Golf Course / Airport / Corporate Campus / Other
    total_acreage = db.Column(db.Float, nullable=False)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    zones = db.relationship("Zone", backref="property", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "type": self.type,
            "total_acreage": self.total_acreage,
            "notes": self.notes,
            "created_at": self.created_at.isoformat(),
        }


class Zone(db.Model):
    __tablename__ = "zones"

    id = db.Column(db.Integer, primary_key=True)
    property_id = db.Column(db.Integer, db.ForeignKey("properties.id"), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    zone_type = db.Column(db.String(50), nullable=False)  # Fairway / Rough / Perimeter / Exclusion
    mower_count = db.Column(db.Integer, nullable=False, default=1)
    status = db.Column(db.String(20), nullable=False, default="Active")  # Active / Inactive
    geometry = db.Column(db.JSON, nullable=False)  # GeoJSON Polygon
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self, include_understaffed=True):
        from services.zone_service import calculate_acreage, is_understaffed

        acreage = calculate_acreage(self.geometry)
        data = {
            "id": self.id,
            "property_id": self.property_id,
            "name": self.name,
            "zone_type": self.zone_type,
            "mower_count": self.mower_count,
            "status": self.status,
            "geometry": self.geometry,
            "acreage": round(acreage, 2),
        }
        if include_understaffed:
            data["understaffed"] = is_understaffed(acreage, self.mower_count)
        return data