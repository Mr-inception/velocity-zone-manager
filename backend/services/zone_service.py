from shapely.geometry import shape


def calculate_acreage(geojson_geometry):
    """
    Calculates acreage from a GeoJSON Polygon geometry.
    Uses an approximate conversion from square degrees to acres,
    suitable for small-scale property zones (not large-scale GIS).
    """
    polygon = shape(geojson_geometry)
    area_sq_degrees = polygon.area

    # Rough conversion: 1 degree latitude/longitude near equator ~ 111km
    # This is an approximation appropriate for property-scale zones.
    area_sq_meters = area_sq_degrees * (111000 ** 2)
    acres = area_sq_meters / 4046.86

    return acres


def is_understaffed(acreage, mower_count):
    """A zone is understaffed if acreage exceeds mower_count * 2 acres."""
    if mower_count <= 0:
        return True
    return acreage > (mower_count * 2)


def validate_mower_count(mower_count):
    """
    Shared validation for create and update zone endpoints.
    Returns an error message string if invalid, None if valid.
    """
    if mower_count is None or mower_count == 0:
        return "A zone must have at least one assigned mower."
    if mower_count < 0:
        return "Mower count cannot be negative."
    return None