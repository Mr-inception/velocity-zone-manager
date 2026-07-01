from pyproj import Geod
from shapely.geometry import shape

SQ_METERS_PER_ACRE = 4046.86
GEOD = Geod(ellps="WGS84")


def calculate_acreage(geojson_geometry):
    """Calculates acreage from a GeoJSON Polygon using WGS84 geodesic area."""
    polygon = shape(geojson_geometry)
    area_sq_meters, _ = GEOD.geometry_area_perimeter(polygon)
    return abs(area_sq_meters) / SQ_METERS_PER_ACRE


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