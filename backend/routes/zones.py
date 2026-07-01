from flask import Blueprint, request, jsonify
from extensions import db
from models import Property, Zone
from auth_utils import jwt_required_custom, current_user_id
from services.zone_service import calculate_acreage, is_understaffed, validate_mower_count

zones_bp = Blueprint("zones", __name__)

VALID_ZONE_TYPES = ["Fairway", "Rough", "Perimeter", "Exclusion"]
VALID_STATUSES = ["Active", "Inactive"]


def _get_owned_property(property_id, user_id):
    return Property.query.filter_by(id=property_id, user_id=user_id).first()


@zones_bp.route("/<int:property_id>/zones", methods=["GET"])
@jwt_required_custom
def list_zones(property_id):
    user_id = current_user_id()
    prop = _get_owned_property(property_id, user_id)
    if not prop:
        return jsonify({"error": "Property not found."}), 404

    zones = Zone.query.filter_by(property_id=property_id).all()
    return jsonify([z.to_dict() for z in zones]), 200


@zones_bp.route("/<int:property_id>/zones", methods=["POST"])
@jwt_required_custom
def create_zone(property_id):
    user_id = current_user_id()
    prop = _get_owned_property(property_id, user_id)
    if not prop:
        return jsonify({"error": "Property not found."}), 404

    data = request.get_json() or {}

    name = data.get("name", "").strip()
    zone_type = data.get("zone_type", "")
    mower_count = data.get("mower_count")
    status = data.get("status", "Active")
    geometry = data.get("geometry")

    if not name:
        return jsonify({"error": "Zone name is required."}), 400
    if zone_type not in VALID_ZONE_TYPES:
        return jsonify({"error": f"Invalid zone type. Must be one of {VALID_ZONE_TYPES}."}), 400
    if status not in VALID_STATUSES:
        return jsonify({"error": f"Invalid status. Must be one of {VALID_STATUSES}."}), 400
    if not geometry:
        return jsonify({"error": "Zone geometry (GeoJSON Polygon) is required."}), 400

    # Shared validation helper - TER-S02 requirement
    mower_error = validate_mower_count(mower_count)
    if mower_error:
        return jsonify({"error": mower_error}), 400

    zone = Zone(
        property_id=property_id,
        name=name,
        zone_type=zone_type,
        mower_count=mower_count,
        status=status,
        geometry=geometry,
    )
    db.session.add(zone)
    db.session.commit()

    return jsonify(zone.to_dict()), 201


@zones_bp.route("/<int:property_id>/zones/<int:zone_id>", methods=["PUT"])
@jwt_required_custom
def update_zone(property_id, zone_id):
    user_id = current_user_id()
    prop = _get_owned_property(property_id, user_id)
    if not prop:
        return jsonify({"error": "Property not found."}), 404

    zone = Zone.query.filter_by(id=zone_id, property_id=property_id).first()
    if not zone:
        return jsonify({"error": "Zone not found."}), 404

    data = request.get_json() or {}

    if "name" in data:
        if not data["name"].strip():
            return jsonify({"error": "Zone name cannot be empty."}), 400
        zone.name = data["name"].strip()

    if "zone_type" in data:
        if data["zone_type"] not in VALID_ZONE_TYPES:
            return jsonify({"error": f"Invalid zone type. Must be one of {VALID_ZONE_TYPES}."}), 400
        zone.zone_type = data["zone_type"]

    if "status" in data:
        if data["status"] not in VALID_STATUSES:
            return jsonify({"error": f"Invalid status. Must be one of {VALID_STATUSES}."}), 400
        zone.status = data["status"]

    if "mower_count" in data:
        # Shared validation helper - TER-S02 requirement (same as create)
        mower_error = validate_mower_count(data["mower_count"])
        if mower_error:
            return jsonify({"error": mower_error}), 400
        zone.mower_count = data["mower_count"]

    if "geometry" in data:
        if not data["geometry"]:
            return jsonify({"error": "Geometry cannot be empty."}), 400
        zone.geometry = data["geometry"]

    db.session.commit()
    return jsonify(zone.to_dict()), 200


@zones_bp.route("/<int:property_id>/zones/<int:zone_id>", methods=["DELETE"])
@jwt_required_custom
def delete_zone(property_id, zone_id):
    user_id = current_user_id()
    prop = _get_owned_property(property_id, user_id)
    if not prop:
        return jsonify({"error": "Property not found."}), 404

    zone = Zone.query.filter_by(id=zone_id, property_id=property_id).first()
    if not zone:
        return jsonify({"error": "Zone not found."}), 404

    db.session.delete(zone)
    db.session.commit()
    return jsonify({"message": "Zone deleted."}), 200


@zones_bp.route("/<int:property_id>/zones/summary", methods=["GET"])
@jwt_required_custom
def zones_summary(property_id):
    user_id = current_user_id()
    prop = _get_owned_property(property_id, user_id)
    if not prop:
        return jsonify({"error": "Property not found."}), 404

    zones = Zone.query.filter_by(property_id=property_id).all()

    total_zones = len(zones)
    total_acreage = 0
    total_mowers = 0
    understaffed_count = 0

    for z in zones:
        acreage = calculate_acreage(z.geometry)
        total_acreage += acreage
        total_mowers += z.mower_count
        if is_understaffed(acreage, z.mower_count):
            understaffed_count += 1

    return jsonify({
        "total_zones": total_zones,
        "total_acreage": round(total_acreage, 2),
        "total_mowers": total_mowers,
        "understaffed_count": understaffed_count,
    }), 200


@zones_bp.route("/<int:property_id>/zones/export", methods=["GET"])
@jwt_required_custom
def export_zones(property_id):
    user_id = current_user_id()
    prop = _get_owned_property(property_id, user_id)
    if not prop:
        return jsonify({"error": "Property not found."}), 404

    zones = Zone.query.filter_by(property_id=property_id).all()

    features = []
    for z in zones:
        features.append({
            "type": "Feature",
            "geometry": z.geometry,
            "properties": {
                "name": z.name,
                "zone_type": z.zone_type,
                "mower_count": z.mower_count,
                "status": z.status,
            },
        })

    feature_collection = {
        "type": "FeatureCollection",
        "features": features,
    }

    return jsonify(feature_collection), 200


@zones_bp.route("/<int:property_id>/zones/import", methods=["POST"])
@jwt_required_custom
def import_zones(property_id):
    user_id = current_user_id()
    prop = _get_owned_property(property_id, user_id)
    if not prop:
        return jsonify({"error": "Property not found."}), 404

    data = request.get_json() or {}

    if data.get("type") != "FeatureCollection" or "features" not in data:
        return jsonify({"error": "Invalid GeoJSON: expected a FeatureCollection."}), 400

    created_zones = []
    errors = []

    for idx, feature in enumerate(data["features"]):
        geometry = feature.get("geometry")
        props = feature.get("properties", {})

        if not geometry or geometry.get("type") != "Polygon":
            errors.append(f"Feature {idx}: only Polygon geometries are supported, skipped.")
            continue

        name = props.get("name", f"Imported Zone {idx + 1}")
        zone_type = props.get("zone_type", "Fairway")
        mower_count = props.get("mower_count", 1)
        status = props.get("status", "Active")

        if zone_type not in VALID_ZONE_TYPES:
            zone_type = "Fairway"
        if status not in VALID_STATUSES:
            status = "Active"

        mower_error = validate_mower_count(mower_count)
        if mower_error:
            mower_count = 1  # default to valid value on import rather than rejecting whole file

        zone = Zone(
            property_id=property_id,
            name=name,
            zone_type=zone_type,
            mower_count=mower_count,
            status=status,
            geometry=geometry,
        )
        db.session.add(zone)
        created_zones.append(zone)

    db.session.commit()

    return jsonify({
        "imported": len(created_zones),
        "errors": errors,
        "zones": [z.to_dict() for z in created_zones],
    }), 201