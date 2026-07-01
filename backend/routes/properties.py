from flask import Blueprint, request, jsonify
from extensions import db
from models import Property
from auth_utils import jwt_required_custom, current_user_id

properties_bp = Blueprint("properties", __name__)


@properties_bp.route("", methods=["GET"])
@jwt_required_custom
def list_properties():
    user_id = current_user_id()
    search = request.args.get("search", "").strip()
    type_filter = request.args.get("type", "").strip()

    query = Property.query.filter_by(user_id=user_id)

    if search:
        query = query.filter(Property.name.ilike(f"%{search}%"))
    if type_filter:
        query = query.filter_by(type=type_filter)

    properties = query.order_by(Property.created_at.desc()).all()
    return jsonify([p.to_dict() for p in properties]), 200


@properties_bp.route("", methods=["POST"])
@jwt_required_custom
def create_property():
    user_id = current_user_id()
    data = request.get_json() or {}

    name = data.get("name", "").strip()
    type_ = data.get("type", "").strip()
    total_acreage = data.get("total_acreage")
    notes = data.get("notes", "")

    if not name:
        return jsonify({"error": "Property name is required."}), 400
    if type_ not in ["Golf Course", "Airport", "Corporate Campus", "Other"]:
        return jsonify({"error": "Invalid property type."}), 400
    if total_acreage is None or total_acreage <= 0:
        return jsonify({"error": "Total acreage must be a positive number."}), 400

    prop = Property(
        user_id=user_id,
        name=name,
        type=type_,
        total_acreage=total_acreage,
        notes=notes,
    )
    db.session.add(prop)
    db.session.commit()

    return jsonify(prop.to_dict()), 201


@properties_bp.route("/<int:property_id>", methods=["GET"])
@jwt_required_custom
def get_property(property_id):
    user_id = current_user_id()
    prop = Property.query.filter_by(id=property_id, user_id=user_id).first()

    if not prop:
        return jsonify({"error": "Property not found."}), 404

    return jsonify(prop.to_dict()), 200


@properties_bp.route("/<int:property_id>", methods=["PUT"])
@jwt_required_custom
def update_property(property_id):
    user_id = current_user_id()
    prop = Property.query.filter_by(id=property_id, user_id=user_id).first()

    if not prop:
        return jsonify({"error": "Property not found."}), 404

    data = request.get_json() or {}

    if "name" in data:
        if not data["name"].strip():
            return jsonify({"error": "Property name cannot be empty."}), 400
        prop.name = data["name"].strip()

    if "type" in data:
        if data["type"] not in ["Golf Course", "Airport", "Corporate Campus", "Other"]:
            return jsonify({"error": "Invalid property type."}), 400
        prop.type = data["type"]

    if "total_acreage" in data:
        if data["total_acreage"] is None or data["total_acreage"] <= 0:
            return jsonify({"error": "Total acreage must be a positive number."}), 400
        prop.total_acreage = data["total_acreage"]

    if "notes" in data:
        prop.notes = data["notes"]

    db.session.commit()
    return jsonify(prop.to_dict()), 200


@properties_bp.route("/<int:property_id>", methods=["DELETE"])
@jwt_required_custom
def delete_property(property_id):
    user_id = current_user_id()
    prop = Property.query.filter_by(id=property_id, user_id=user_id).first()

    if not prop:
        return jsonify({"error": "Property not found."}), 404

    db.session.delete(prop)
    db.session.commit()
    return jsonify({"message": "Property deleted."}), 200