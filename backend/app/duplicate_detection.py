from web3 import Web3
import json
import logging
from typing import Optional, List, Tuple
from shapely.geometry import shape, mapping, Polygon, MultiPolygon
from shapely.validation import make_valid
from pyproj import Geod

from app.config import settings
from app.models import ProjectMetadata

logger = logging.getLogger(__name__)
geod = Geod(ellps="WGS84")


def normalize_project_fields(name: str, location: str, project_type: str, start_date: str, end_date: str) -> str:
    """Reduce project identifying fields to a single normalized string.
    Including the project period means two projects with identical name,
    location, and type but DIFFERENT date ranges are treated as distinct
    projects — e.g. a solar farm's 2022-2025 monitoring period is a
    separate registration from the same farm's 2025-2028 period."""
    return (
        f"{name.strip().lower()}|{location.strip().lower()}|{project_type.strip().lower()}"
        f"|{start_date.strip()}|{end_date.strip()}"
    )


def compute_fingerprint(name: str, location: str, project_type: str, start_date: str, end_date: str) -> str:
    """Compute the keccak256 fingerprint hash for a project.

    Returns a 0x-prefixed 32-byte hex string, matching the `bytes32`
    fingerprint type expected by the smart contract's submitProject().

    Note: Web3.keccak(...).hex() does NOT reliably include the '0x'
    prefix across web3.py versions, so we normalize it explicitly here
    rather than assuming a fixed format.
    """
    normalized = normalize_project_fields(name, location, project_type, start_date, end_date)
    raw_hex = Web3.keccak(text=normalized).hex()
    if not raw_hex.startswith("0x"):
        raw_hex = "0x" + raw_hex
    return raw_hex


def calculate_geodesic_area_km2(geom) -> float:
    """Calculate the geodesic surface area of a Shapely geometry on the WGS84 ellipsoid in km²."""
    if geom is None or geom.is_empty:
        return 0.0

    total_m2 = 0.0
    if geom.geom_type == "Polygon":
        poly_area, _ = geod.geometry_area_perimeter(geom)
        total_m2 += abs(poly_area)
    elif geom.geom_type == "MultiPolygon":
        for poly in geom.geoms:
            poly_area, _ = geod.geometry_area_perimeter(poly)
            total_m2 += abs(poly_area)
    elif geom.geom_type == "GeometryCollection":
        for sub_geom in geom.geoms:
            if sub_geom.geom_type in ("Polygon", "MultiPolygon"):
                total_m2 += calculate_geodesic_area_km2(sub_geom) * 1e6
    return total_m2 / 1e6


def compute_polygon_overlap(
    poly1_geojson: dict,
    poly2_geojson: dict,
) -> Optional[dict]:
    """Calculate geospatial intersection between two GeoJSON polygon geometries.
    
    Returns None if geometries do not intersect or overlap area is effectively zero.
    Otherwise returns:
    {
        "overlap_area_km2": float,
        "overlap_percentage": float, # relative to the new polygon (poly1)
        "intersection_geojson": dict # GeoJSON geometry
    }
    """
    try:
        s1 = shape(poly1_geojson)
        s2 = shape(poly2_geojson)

        if not s1.is_valid:
            s1 = make_valid(s1)
        if not s2.is_valid:
            s2 = make_valid(s2)

        if not s1.intersects(s2):
            return None

        intersection = s1.intersection(s2)
        if intersection.is_empty:
            return None

        # Filter out 0D points or 1D lines if polygons only touch at a single point or line edge
        if intersection.geom_type in ("Point", "MultiPoint", "LineString", "MultiLineString"):
            return None

        poly1_area_km2 = calculate_geodesic_area_km2(s1)
        overlap_area_km2 = calculate_geodesic_area_km2(intersection)

        if overlap_area_km2 <= 0:
            return None

        pct = (overlap_area_km2 / poly1_area_km2 * 100.0) if poly1_area_km2 > 0 else 0.0

        return {
            "overlap_area_km2": round(overlap_area_km2, 4),
            "overlap_percentage": round(pct, 2),
            "intersection_geojson": mapping(intersection),
        }
    except Exception as e:
        logger.warning(f"Error computing polygon intersection: {e}")
        return None


def check_geospatial_overlaps(db, new_polygon_geojson: dict, exclude_project_id: Optional[int] = None) -> List[dict]:
    """Checks the proposed polygon against all existing projects with boundaries in the database."""
    from app import blockchain

    existing_projects = (
        db.query(ProjectMetadata)
        .filter(ProjectMetadata.boundary_geojson.isnot(None))
        .all()
    )

    overlaps = []
    for proj in existing_projects:
        if exclude_project_id and proj.onchain_project_id == exclude_project_id:
            continue

        try:
            stored_boundary = json.loads(proj.boundary_geojson)
        except Exception:
            continue

        overlap_result = compute_polygon_overlap(new_polygon_geojson, stored_boundary)
        if not overlap_result:
            continue

        # Check threshold
        area_km2 = overlap_result["overlap_area_km2"]
        pct = overlap_result["overlap_percentage"]

        if (
            pct >= settings.overlap_threshold_percent
            or area_km2 >= settings.overlap_threshold_area_km2
        ):
            # Fetch current onchain status if possible
            status = "Pending"
            if proj.onchain_project_id:
                try:
                    onchain = blockchain.get_project_onchain(proj.onchain_project_id)
                    status = onchain.get("status", "Pending")
                except Exception:
                    pass

            overlaps.append({
                "project_id": proj.onchain_project_id or proj.id,
                "project_name": proj.name,
                "status": status,
                "overlap_area_km2": area_km2,
                "overlap_percentage": pct,
                "existing_boundary": stored_boundary,
                "intersection_geojson": overlap_result["intersection_geojson"],
            })

    return overlaps
