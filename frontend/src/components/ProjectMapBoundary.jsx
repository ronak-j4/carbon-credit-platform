import { useState, useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet-draw";
import {
  Search,
  MapPin,
  Trash2,
  Edit3,
  Check,
  Layers,
  AlertCircle,
  X,
  Undo2,
  Maximize2,
  Square,
  Triangle,
  Move,
} from "lucide-react";

export default function ProjectMapBoundary({
  polygon,
  onChange,
  onCenterChange,
  overlappingProjects = [],
  locationQuery = "",
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const drawnItemsRef = useRef(null);
  const overlapLayerGroupRef = useRef(null);
  const drawControlRef = useRef(null);
  const polygonHandlerRef = useRef(null);
  const activePolygonLayerRef = useRef(null);

  const [verticesCount, setVerticesCount] = useState(0);
  const [approxArea, setApproxArea] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);

  // Active drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [activeVertexCount, setActiveVertexCount] = useState(0);

  // Helper to enable editing handles (corners & line midpoint pull handles)
  const enablePolygonEditing = useCallback((layer) => {
    if (!layer) return;
    activePolygonLayerRef.current = layer;

    if (layer.editing) {
      layer.editing.enable();
    } else if (L.Edit && L.Edit.Poly) {
      layer.editing = new L.Edit.Poly(layer);
      layer.editing.enable();
    }

    // Attach edit event so dragging corners or pulling edge midpoints updates immediately
    layer.on("edit", () => {
      syncPolygonGeometry(layer);
    });
  }, []);

  // Convert Leaflet polygon layer to GeoJSON Polygon [[[lng, lat], ...]]
  const syncPolygonGeometry = useCallback(
    (layer) => {
      if (!layer) {
        setVerticesCount(0);
        setApproxArea(null);
        activePolygonLayerRef.current = null;
        onChange(null);
        if (onCenterChange) onCenterChange(null);
        return;
      }

      const latlngs = layer.getLatLngs();
      const ring = Array.isArray(latlngs[0]) ? latlngs[0] : latlngs;
      const coords = ring.map((pt) => [
        Number(pt.lng.toFixed(6)),
        Number(pt.lat.toFixed(6)),
      ]);

      // Close polygon loop if not closed
      if (coords.length > 0) {
        const first = coords[0];
        const last = coords[coords.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) {
          coords.push([first[0], first[1]]);
        }
      }

      setVerticesCount(ring.length);

      // Geodesic area calculation on spherical coordinates
      const calculateSphericalAreaKm2 = (pts) => {
        if (pts.length < 3) return 0;
        const radius = 6378137;
        let area = 0;
        for (let i = 0; i < pts.length; i++) {
          const p1 = pts[i];
          const p2 = pts[(i + 1) % pts.length];
          area +=
            (p2.lng - p1.lng) *
            (Math.PI / 180) *
            (2 +
              Math.sin(p1.lat * (Math.PI / 180)) +
              Math.sin(p2.lat * (Math.PI / 180)));
        }
        area = Math.abs((area * radius * radius) / 2.0);
        return (area / 1e6).toFixed(4);
      };

      setApproxArea(calculateSphericalAreaKm2(ring));

      const geojson = {
        type: "Polygon",
        coordinates: [coords],
      };
      onChange(geojson);

      const bounds = layer.getBounds();
      const center = bounds.getCenter();
      if (onCenterChange) {
        onCenterChange({
          latitude: Number(center.lat.toFixed(6)),
          longitude: Number(center.lng.toFixed(6)),
        });
      }
    },
    [onChange, onCenterChange]
  );

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [20.5937, 78.9629],
      zoom: 5,
      zoomControl: true,
    });
    mapInstanceRef.current = map;

    // OpenStreetMap standard street tile layer (Free, no key)
    const osmLayer = L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }
    );

    // Esri World Imagery Satellite (Free, no key)
    const satelliteLayer = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        maxZoom: 19,
        attribution:
          "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP",
      }
    );

    satelliteLayer.addTo(map);

    L.control
      .layers({
        "Satellite Imagery": satelliteLayer,
        "Street Map (OSM)": osmLayer,
      })
      .addTo(map);

    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    drawnItemsRef.current = drawnItems;

    const overlapGroup = new L.LayerGroup();
    map.addLayer(overlapGroup);
    overlapLayerGroupRef.current = overlapGroup;

    // Leaflet Draw Control on map
    const drawControl = new L.Control.Draw({
      edit: {
        featureGroup: drawnItems,
        remove: true,
      },
      draw: {
        polygon: {
          allowIntersection: false,
          showArea: true,
          maxPoints: 8,
          drawError: {
            color: "#ef4444",
            message: "<strong>Warning:</strong> Polygon lines cannot cross!",
          },
          shapeOptions: {
            color: "#22c55e",
            fillColor: "#22c55e",
            fillOpacity: 0.35,
            weight: 2,
            className: "drawing-polygon-preview",
            interactive: false, // Prevents SVG path from blocking clicks during drawing
          },
          guidelineDistance: 15,
        },
        polyline: false,
        circle: false,
        rectangle: {
          shapeOptions: {
            color: "#22c55e",
            fillColor: "#22c55e",
            fillOpacity: 0.35,
            weight: 2,
          },
        },
        marker: false,
        circlemarker: false,
      },
    });

    map.addControl(drawControl);
    drawControlRef.current = drawControl;

    // Grab polygon handler instance from toolbar
    if (drawControl._toolbars?.draw?._modes?.polygon?.handler) {
      polygonHandlerRef.current =
        drawControl._toolbars.draw._modes.polygon.handler;
    } else {
      polygonHandlerRef.current = new L.Draw.Polygon(map, {
        allowIntersection: false,
        showArea: true,
        maxPoints: 8,
        drawError: {
          color: "#ef4444",
          message: "<strong>Warning:</strong> Polygon lines cannot cross!",
        },
        shapeOptions: {
          color: "#22c55e",
          fillColor: "#22c55e",
          fillOpacity: 0.35,
          weight: 2,
          className: "drawing-polygon-preview",
          interactive: false,
        },
        guidelineDistance: 15,
      });
    }

    // DRAWSTART event
    map.on(L.Draw.Event.DRAWSTART, () => {
      setIsDrawing(true);
      setActiveVertexCount(0);
    });

    // DRAWVERTEX event (tracks real-time vertex clicks, auto-finishes at 8 points)
    map.on(L.Draw.Event.DRAWVERTEX, (e) => {
      const count = e.layers ? e.layers.getLayers().length : 0;
      setActiveVertexCount(count);

      // Auto-finish when 8 vertices are reached
      if (count >= 8) {
        const handler =
          polygonHandlerRef.current ||
          map._toolbars?.draw?._modes?.polygon?.handler;
        if (handler && typeof handler.completeShape === "function") {
          setTimeout(() => {
            handler.completeShape();
          }, 50);
        }
      }
    });

    // DRAWSTOP event
    map.on(L.Draw.Event.DRAWSTOP, () => {
      setIsDrawing(false);
      setActiveVertexCount(0);
    });

    // CREATED event: immediately enable line-pulling & corner-dragging!
    map.on(L.Draw.Event.CREATED, (e) => {
      drawnItems.clearLayers();
      const layer = e.layer;
      drawnItems.addLayer(layer);
      enablePolygonEditing(layer);
      syncPolygonGeometry(layer);
      setIsDrawing(false);
      setActiveVertexCount(0);
    });

    // EDITED event
    map.on(L.Draw.Event.EDITED, () => {
      const layers = drawnItems.getLayers();
      if (layers.length > 0) {
        syncPolygonGeometry(layers[0]);
      }
    });

    // DELETED event
    map.on(L.Draw.Event.DELETED, () => {
      syncPolygonGeometry(null);
    });

    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [syncPolygonGeometry, enablePolygonEditing]);

  // Reliable Multi-Provider Geocoding (Photon OSM + Open-Meteo fallback)
  const handleSearch = async (queryToSearch) => {
    const rawQ = queryToSearch || searchQuery;
    if (!rawQ || rawQ.trim().length < 2) return;

    setSearching(true);
    setSearchError(null);
    const cleanQ = rawQ.replace(/,/g, " ").replace(/\s+/g, " ").trim();

    try {
      // 1. Try Photon (OSM-based, CORS-friendly, no API key required)
      const resPhoton = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(cleanQ)}&limit=1`
      );
      if (resPhoton.ok) {
        const data = await resPhoton.json();
        if (data?.features && data.features.length > 0) {
          const feat = data.features[0];
          const [lon, lat] = feat.geometry.coordinates;
          const extent = feat.properties?.extent;

          if (mapInstanceRef.current) {
            if (extent && extent.length === 4) {
              const west = Math.min(extent[0], extent[2]);
              const south = Math.min(extent[1], extent[3]);
              const east = Math.max(extent[0], extent[2]);
              const north = Math.max(extent[1], extent[3]);
              mapInstanceRef.current.fitBounds(
                [
                  [south, west],
                  [north, east],
                ],
                { padding: [40, 40] }
              );
            } else {
              mapInstanceRef.current.setView([lat, lon], 12);
            }
          }
          setSearching(false);
          return;
        }
      }

      // 2. Fallback to Open-Meteo Geocoding
      const firstWord = cleanQ.split(" ")[0];
      const resMeteo = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(firstWord)}&count=1`
      );
      if (resMeteo.ok) {
        const data = await resMeteo.json();
        if (data?.results && data.results.length > 0) {
          const item = data.results[0];
          if (mapInstanceRef.current) {
            mapInstanceRef.current.setView([item.latitude, item.longitude], 12);
          }
          setSearching(false);
          return;
        }
      }

      setSearchError("No location found for this query. Try a city or state name.");
    } catch (err) {
      setSearchError("Location search unavailable. Please navigate on the map directly.");
    } finally {
      setSearching(false);
    }
  };

  // Sync locationQuery prop from parent form
  useEffect(() => {
    if (!locationQuery || locationQuery.trim().length < 3) return;
    const timer = setTimeout(() => {
      handleSearch(locationQuery);
    }, 800);
    return () => clearTimeout(timer);
  }, [locationQuery]);

  // Render Overlapping Polygons on Map
  useEffect(() => {
    if (!mapInstanceRef.current || !overlapLayerGroupRef.current) return;

    overlapLayerGroupRef.current.clearLayers();

    if (!overlappingProjects || overlappingProjects.length === 0) return;

    const bounds = L.latLngBounds();

    overlappingProjects.forEach((item) => {
      if (item.existing_boundary?.coordinates) {
        const ring = item.existing_boundary.coordinates[0];
        const latlngs = ring.map(([lng, lat]) => [lat, lng]);

        const existingPolygon = L.polygon(latlngs, {
          color: "#ef4444",
          fillColor: "#ef4444",
          fillOpacity: 0.25,
          weight: 2,
        }).bindPopup(`
          <div style="font-family:sans-serif; font-size:12px; color:#111;">
            <strong style="color:#b91c1c;">Existing Project:</strong> ${item.project_name} (#${item.project_id})<br/>
            <strong>Status:</strong> ${item.status}<br/>
            <strong>Overlap:</strong> ${item.overlap_percentage}% (${item.overlap_area_km2} km²)
          </div>
        `);

        overlapLayerGroupRef.current.addLayer(existingPolygon);
        latlngs.forEach((pt) => bounds.extend(pt));
      }

      if (item.intersection_geojson) {
        const geom = item.intersection_geojson;
        const rings = [];

        if (geom.type === "Polygon") {
          rings.push(geom.coordinates[0]);
        } else if (geom.type === "MultiPolygon") {
          geom.coordinates.forEach((polyCoords) => rings.push(polyCoords[0]));
        }

        rings.forEach((ring) => {
          const latlngs = ring.map(([lng, lat]) => [lat, lng]);
          const intersectPoly = L.polygon(latlngs, {
            color: "#f97316",
            fillColor: "#f97316",
            fillOpacity: 0.65,
            weight: 3,
            dashArray: "4, 4",
          }).bindPopup(`
            <div style="font-family:sans-serif; font-size:12px; color:#111;">
              <strong style="color:#c2410c;">Overlap Zone</strong><br/>
              Area: ${item.overlap_area_km2} km²
            </div>
          `);
          overlapLayerGroupRef.current.addLayer(intersectPoly);
        });
      }
    });

    if (drawnItemsRef.current) {
      const drawnLayers = drawnItemsRef.current.getLayers();
      if (drawnLayers.length > 0) {
        bounds.extend(drawnLayers[0].getBounds());
      }
    }

    if (bounds.isValid()) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [overlappingProjects]);

  // Quick Action: Add an initial editable Triangle to map center
  const handleAddTriangle = () => {
    if (!mapInstanceRef.current || !drawnItemsRef.current) return;

    drawnItemsRef.current.clearLayers();
    syncPolygonGeometry(null);

    const center = mapInstanceRef.current.getCenter();
    const bounds = mapInstanceRef.current.getBounds();
    const span = (bounds.getNorth() - bounds.getSouth()) * 0.16;

    const latlngs = [
      [center.lat + span, center.lng],
      [center.lat - span, center.lng - span * 1.2],
      [center.lat - span, center.lng + span * 1.2],
    ];

    const poly = L.polygon(latlngs, {
      color: "#22c55e",
      fillColor: "#22c55e",
      fillOpacity: 0.35,
      weight: 2,
    });

    drawnItemsRef.current.addLayer(poly);
    enablePolygonEditing(poly);
    syncPolygonGeometry(poly);
  };

  // Quick Action: Add an initial editable Square/Rectangle to map center
  const handleAddSquare = () => {
    if (!mapInstanceRef.current || !drawnItemsRef.current) return;

    drawnItemsRef.current.clearLayers();
    syncPolygonGeometry(null);

    const center = mapInstanceRef.current.getCenter();
    const bounds = mapInstanceRef.current.getBounds();
    const span = (bounds.getNorth() - bounds.getSouth()) * 0.14;

    const latlngs = [
      [center.lat + span, center.lng - span * 1.3],
      [center.lat + span, center.lng + span * 1.3],
      [center.lat - span, center.lng + span * 1.3],
      [center.lat - span, center.lng - span * 1.3],
    ];

    const poly = L.polygon(latlngs, {
      color: "#22c55e",
      fillColor: "#22c55e",
      fillOpacity: 0.35,
      weight: 2,
    });

    drawnItemsRef.current.addLayer(poly);
    enablePolygonEditing(poly);
    syncPolygonGeometry(poly);
  };

  // Handlers for click-by-click drawing lifecycle
  const handleStartDraw = () => {
    if (drawnItemsRef.current) {
      drawnItemsRef.current.clearLayers();
    }
    syncPolygonGeometry(null);

    const handler =
      polygonHandlerRef.current ||
      mapInstanceRef.current?._toolbars?.draw?._modes?.polygon?.handler;

    if (handler) {
      handler.disable();
      handler.enable();
      setIsDrawing(true);
      setActiveVertexCount(0);
    }
  };

  const handleFinishShape = () => {
    const handler =
      polygonHandlerRef.current ||
      mapInstanceRef.current?._toolbars?.draw?._modes?.polygon?.handler;

    if (handler && typeof handler.completeShape === "function") {
      handler.completeShape();
    }
  };

  const handleUndoVertex = () => {
    const handler =
      polygonHandlerRef.current ||
      mapInstanceRef.current?._toolbars?.draw?._modes?.polygon?.handler;

    if (handler && typeof handler.deleteLastVertex === "function") {
      handler.deleteLastVertex();
      setActiveVertexCount((prev) => Math.max(0, prev - 1));
    }
  };

  const handleCancelDrawing = () => {
    const handler =
      polygonHandlerRef.current ||
      mapInstanceRef.current?._toolbars?.draw?._modes?.polygon?.handler;

    if (handler) {
      handler.disable();
    }
    setIsDrawing(false);
    setActiveVertexCount(0);
  };

  const handleClear = () => {
    if (drawnItemsRef.current) {
      drawnItemsRef.current.clearLayers();
    }
    syncPolygonGeometry(null);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.titleRow}>
          <MapPin size={18} color="var(--accent-green)" />
          <span style={styles.title}>Project Boundary Map</span>
          <span style={styles.badgeRequired}>Required</span>
        </div>
        <p style={styles.instruction}>
          Add a boundary by drawing points or starting with a shape. Pull the green dots in the middle of any line to turn 1 line into 2 lines (add points up to 8). Drag corner squares to reshape.
        </p>
      </div>

      {/* Search and action toolbar */}
      <div style={styles.toolbar}>
        <div style={styles.searchBox}>
          <Search size={16} color="var(--text-secondary)" style={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search address or region (e.g. Pune, Rajasthan, London)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSearch();
              }
            }}
            style={styles.searchInput}
          />
          <button
            type="button"
            onClick={() => handleSearch()}
            style={styles.searchButton}
            disabled={searching}
          >
            {searching ? "Searching..." : "Locate"}
          </button>
        </div>

        <div style={styles.actions}>
          {!isDrawing && (
            <>
              <button
                type="button"
                onClick={handleAddTriangle}
                style={{ ...styles.actionBtn, ...styles.presetBtn }}
                title="Add a 3-point triangle you can pull into a square or any shape"
              >
                <Triangle size={13} color="var(--accent-green)" /> Add Triangle
              </button>

              <button
                type="button"
                onClick={handleAddSquare}
                style={{ ...styles.actionBtn, ...styles.presetBtn }}
                title="Add a 4-point rectangle you can pull into any shape"
              >
                <Square size={13} color="var(--accent-green)" /> Add Square
              </button>

              <button
                type="button"
                onClick={handleStartDraw}
                style={{ ...styles.actionBtn, ...styles.drawBtn }}
                title="Click points one by one on the map"
              >
                <Edit3 size={13} color="var(--accent-green)" />
                {verticesCount > 0 ? "Redraw" : "Draw Custom"}
              </button>

              {verticesCount > 0 && (
                <button
                  type="button"
                  onClick={handleClear}
                  style={{ ...styles.actionBtn, ...styles.clearBtn }}
                  title="Clear Boundary"
                >
                  <Trash2 size={13} color="#ff8080" /> Clear
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Active Drawing Banner Toolbar */}
      {isDrawing && (
        <div style={styles.drawingToolbar} className="fade-slide-in">
          <div style={styles.drawingStatus}>
            <span style={styles.drawingDot} />
            <strong style={styles.drawingText}>
              Drawing Polygon: {activeVertexCount} / 8 points
            </strong>
            <span style={styles.drawingTip}>
              {activeVertexCount < 3
                ? `(Click on map to place points. Need at least 3 points)`
                : `(Click 'Finish Shape' anytime, then pull edges to add more points)`}
            </span>
          </div>

          <div style={styles.drawingButtons}>
            <button
              type="button"
              onClick={handleFinishShape}
              disabled={activeVertexCount < 3}
              style={{
                ...styles.finishBtn,
                ...(activeVertexCount >= 3 ? styles.finishBtnReady : styles.finishBtnDisabled),
              }}
              title={
                activeVertexCount >= 3
                  ? "Click to close and finalize the polygon"
                  : "Requires at least 3 points before finishing"
              }
            >
              <Check size={15} />
              {activeVertexCount >= 3
                ? `Finish Shape (${activeVertexCount} pts)`
                : `Finish (need 3 pts)`}
            </button>

            <button
              type="button"
              onClick={handleUndoVertex}
              disabled={activeVertexCount === 0}
              style={{
                ...styles.actionBtn,
                opacity: activeVertexCount > 0 ? 1 : 0.4,
              }}
              title="Undo the last placed point"
            >
              <Undo2 size={14} /> Undo Point
            </button>

            <button
              type="button"
              onClick={handleCancelDrawing}
              style={{ ...styles.actionBtn, ...styles.clearBtn }}
            >
              <X size={14} color="#ff8080" /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* Edge-Pulling Interactive Hint Banner when shape is active */}
      {!isDrawing && verticesCount >= 3 && (
        <div style={styles.interactiveHintBanner}>
          <div style={styles.hintContent}>
            <Move size={14} color="var(--accent-green)" />
            <span>
              <strong>Interactive Boundary Active:</strong> Pull the <strong>green circles in the middle of any line</strong> to split that 1 line into 2 lines (add points up to 8). Drag the <strong>white corner squares</strong> to reposition any vertex.
            </span>
          </div>
          <span style={styles.pointPill}>
            {verticesCount} / 8 points {verticesCount >= 8 && "(Max reached)"}
          </span>
        </div>
      )}

      {searchError && (
        <div style={styles.searchError}>
          <AlertCircle size={14} color="#ff8080" /> {searchError}
        </div>
      )}

      {/* Map Viewport */}
      <div style={styles.mapWrapper}>
        <div ref={mapContainerRef} style={styles.mapElement} />
      </div>

      {/* Metrics Footer */}
      <div style={styles.metaRow}>
        <div style={styles.metricItem}>
          <span style={styles.metricLabel}>Vertices:</span>
          <span style={styles.metricValue}>
            {isDrawing ? `${activeVertexCount} points (in progress)` : `${verticesCount} points`}
          </span>
        </div>
        {approxArea && !isDrawing && (
          <div style={styles.metricItem}>
            <span style={styles.metricLabel}>Approx. Boundary Area:</span>
            <span style={styles.metricValue}>{approxArea} km²</span>
          </div>
        )}
        <div style={styles.legend}>
          <span style={styles.legendItem}>
            <span style={{ ...styles.legendDot, background: "#22c55e" }} /> Proposed Project
          </span>
          {overlappingProjects && overlappingProjects.length > 0 && (
            <>
              <span style={styles.legendItem}>
                <span style={{ ...styles.legendDot, background: "#ef4444" }} /> Existing Project
              </span>
              <span style={styles.legendItem}>
                <span style={{ ...styles.legendDot, background: "#f97316" }} /> Overlap Region
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    background: "rgba(10, 18, 14, 0.7)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "16px",
    padding: "20px",
    marginTop: "6px",
    marginBottom: "8px",
  },
  header: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  titleRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
  },
  title: {
    fontSize: "15px",
    fontWeight: 700,
    color: "#fff",
  },
  badgeRequired: {
    fontSize: "11px",
    padding: "2px 8px",
    borderRadius: "10px",
    background: "rgba(34, 197, 94, 0.15)",
    color: "var(--accent-green)",
    fontWeight: 700,
  },
  instruction: {
    fontSize: "13px",
    color: "var(--text-secondary)",
    lineHeight: 1.5,
    margin: 0,
  },
  toolbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
    flexWrap: "wrap",
  },
  searchBox: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    flex: "1 1 280px",
  },
  searchIcon: {
    position: "absolute",
    left: "12px",
    pointerEvents: "none",
  },
  searchInput: {
    width: "100%",
    padding: "10px 90px 10px 36px",
    borderRadius: "10px",
    border: "1px solid var(--border-subtle)",
    background: "rgba(4, 10, 7, 0.9)",
    color: "#fff",
    fontSize: "13px",
    outline: "none",
  },
  searchButton: {
    position: "absolute",
    right: "6px",
    padding: "6px 12px",
    borderRadius: "7px",
    background: "rgba(34, 197, 94, 0.2)",
    border: "1px solid rgba(34, 197, 94, 0.4)",
    color: "var(--accent-green)",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
  },
  searchError: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    color: "#ff8080",
    fontSize: "12px",
    marginTop: "-4px",
  },
  actions: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
  },
  actionBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 12px",
    borderRadius: "8px",
    border: "1px solid var(--border-subtle)",
    background: "rgba(255, 255, 255, 0.05)",
    color: "#fff",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  presetBtn: {
    background: "rgba(34, 197, 94, 0.08)",
    borderColor: "rgba(34, 197, 94, 0.3)",
    color: "#d1fae5",
  },
  drawBtn: {
    background: "rgba(34, 197, 94, 0.16)",
    borderColor: "rgba(34, 197, 94, 0.45)",
    color: "#fff",
  },
  clearBtn: {
    background: "rgba(239, 68, 68, 0.08)",
    borderColor: "rgba(239, 68, 68, 0.25)",
  },
  interactiveHintBanner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
    padding: "8px 12px",
    background: "rgba(16, 36, 24, 0.8)",
    border: "1px solid rgba(34, 197, 94, 0.35)",
    borderRadius: "8px",
    fontSize: "12px",
    color: "#e2f9ea",
    flexWrap: "wrap",
  },
  hintContent: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  pointPill: {
    fontSize: "11px",
    padding: "2px 8px",
    borderRadius: "999px",
    background: "rgba(34, 197, 94, 0.2)",
    color: "var(--accent-green)",
    fontWeight: 700,
  },
  drawingToolbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    padding: "10px 14px",
    background: "rgba(16, 32, 24, 0.95)",
    border: "1px solid rgba(34, 197, 94, 0.4)",
    borderRadius: "10px",
    flexWrap: "wrap",
  },
  drawingStatus: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "13px",
  },
  drawingDot: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    background: "#22c55e",
    boxShadow: "0 0 10px #22c55e",
    display: "inline-block",
  },
  drawingText: {
    color: "#fff",
  },
  drawingTip: {
    color: "var(--text-secondary)",
    fontSize: "12px",
  },
  drawingButtons: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
  },
  finishBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 16px",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: 700,
    border: "none",
    transition: "all 0.2s ease",
  },
  finishBtnReady: {
    background: "#22c55e",
    color: "#031508",
    cursor: "pointer",
    boxShadow: "0 0 15px rgba(34, 197, 94, 0.4)",
  },
  finishBtnDisabled: {
    background: "rgba(255, 255, 255, 0.1)",
    color: "rgba(255, 255, 255, 0.4)",
    cursor: "not-allowed",
  },
  mapWrapper: {
    position: "relative",
    width: "100%",
    height: "380px",
    borderRadius: "12px",
    overflow: "hidden",
    border: "1px solid rgba(80, 220, 130, 0.2)",
    background: "#08100c",
    zIndex: 1,
  },
  mapElement: {
    width: "100%",
    height: "100%",
  },
  metaRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "12px",
    paddingTop: "4px",
  },
  metricItem: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "12px",
  },
  metricLabel: {
    color: "var(--text-secondary)",
  },
  metricValue: {
    color: "#fff",
    fontWeight: 600,
  },
  legend: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    fontSize: "12px",
    color: "var(--text-secondary)",
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  legendDot: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    display: "inline-block",
  },
};
