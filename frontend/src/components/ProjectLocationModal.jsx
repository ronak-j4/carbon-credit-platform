import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { X, MapPin, Layers, ExternalLink } from "lucide-react";

// Create custom sleek MapPin icon with zero external asset dependencies
function createCustomPin(color = "#22c55e") {
  return L.divIcon({
    className: "custom-map-pin",
    html: `
      <div style="
        background: ${color};
        color: #031508;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid #ffffff;
        box-shadow: 0 0 16px ${color}aa, 0 4px 8px rgba(0,0,0,0.5);
      ">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#031508" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
}

export default function ProjectLocationModal({ project, onClose }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Default center
    let center = [20.5937, 78.9629];
    let zoom = 5;

    if (project.center?.latitude && project.center?.longitude) {
      center = [project.center.latitude, project.center.longitude];
      zoom = 13;
    }

    const map = L.map(mapContainerRef.current, {
      center,
      zoom,
      zoomControl: true,
    });
    mapInstanceRef.current = map;

    // Free OpenStreetMap base layer
    const osmLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    });

    // Free Esri satellite imagery
    const satelliteLayer = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        maxZoom: 19,
        attribution: "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye",
      }
    );

    satelliteLayer.addTo(map);

    L.control.layers({
      "Satellite Imagery": satelliteLayer,
      "Street Map (OSM)": osmLayer,
    }).addTo(map);

    const bounds = L.latLngBounds();

    // 1. If project has polygon coordinates, draw polygon
    if (project.polygon?.coordinates && project.polygon.coordinates.length > 0) {
      const ring = project.polygon.coordinates[0];
      const latlngs = ring.map(([lng, lat]) => [lat, lng]);

      const polyLayer = L.polygon(latlngs, {
        color: "#22c55e",
        fillColor: "#22c55e",
        fillOpacity: 0.35,
        weight: 3,
      }).addTo(map);

      polyLayer.bindPopup(`
        <div style="font-family:sans-serif; font-size:13px; color:#111;">
          <strong style="color:#16a34a;">${project.name}</strong><br/>
          Location: ${project.location}<br/>
          Status: ${project.status}<br/>
          Type: ${project.project_type}<br/>
          Vertices: ${ring.length} points
        </div>
      `).openPopup();

      latlngs.forEach((pt) => bounds.extend(pt));
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (project.center?.latitude && project.center?.longitude) {
      // 2. Project has center point
      const marker = L.marker([project.center.latitude, project.center.longitude], {
        icon: createCustomPin("#22c55e"),
      }).addTo(map);
      marker.bindPopup(`<strong>${project.name}</strong><br/>${project.location}`).openPopup();
      map.setView([project.center.latitude, project.center.longitude], 12);
    } else if (project.location) {
      // 3. Fallback: Geocode city/region using Photon + Open-Meteo
      const cleanQ = project.location.replace(/,/g, " ").replace(/\s+/g, " ").trim();

      fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(cleanQ)}&limit=1`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.features?.length > 0 && mapInstanceRef.current) {
            const [lon, lat] = data.features[0].geometry.coordinates;
            const marker = L.marker([lat, lon], {
              icon: createCustomPin("#22c55e"),
            }).addTo(mapInstanceRef.current);
            marker.bindPopup(`<strong>${project.name}</strong><br/>${project.location}`).openPopup();
            mapInstanceRef.current.setView([lat, lon], 12);
          } else {
            // Open-Meteo fallback
            const firstWord = cleanQ.split(" ")[0];
            return fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(firstWord)}&count=1`)
              .then((r) => (r.ok ? r.json() : null))
              .then((mData) => {
                if (mData?.results?.length > 0 && mapInstanceRef.current) {
                  const item = mData.results[0];
                  const marker = L.marker([item.latitude, item.longitude], {
                    icon: createCustomPin("#22c55e"),
                  }).addTo(mapInstanceRef.current);
                  marker.bindPopup(`<strong>${project.name}</strong><br/>${project.location}`).openPopup();
                  mapInstanceRef.current.setView([item.latitude, item.longitude], 12);
                }
              });
          }
        })
        .catch(() => {});
    }

    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [project]);

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalCard} onClick={(e) => e.stopPropagation()} className="fade-slide-in">
        <div style={styles.modalHeader}>
          <div style={styles.titleGroup}>
            <div style={styles.iconWrap}>
              <MapPin size={20} color="var(--accent-green)" />
            </div>
            <div>
              <h3 style={styles.title}>{project.name}</h3>
              <p style={styles.locationSubtitle}>
                {project.location} · {project.project_type}
                {project.polygon?.coordinates && (
                  <span style={styles.badgeGeofenced}>✓ Geofenced Boundary</span>
                )}
              </p>
            </div>
          </div>

          <button onClick={onClose} style={styles.closeBtn}>
            <X size={20} />
          </button>
        </div>

        <div style={styles.mapContainer}>
          <div ref={mapContainerRef} style={styles.mapElement} />
        </div>

        <div style={styles.modalFooter}>
          <div style={styles.footerInfo}>
            <span>
              Status: <strong style={{ color: project.status === "Approved" ? "var(--accent-green)" : "#eab308" }}>{project.status || "Listed"}</strong>
            </span>
            {project.polygon?.coordinates && (
              <span>Points: <strong>{project.polygon.coordinates[0]?.length || 0} vertices</strong></span>
            )}
          </div>
          <button onClick={onClose} style={styles.doneBtn}>
            Close Map
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0, 0, 0, 0.75)",
    backdropFilter: "blur(6px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: "20px",
  },
  modalCard: {
    background: "var(--bg-card)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "20px",
    width: "min(860px, 100%)",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 25px 60px rgba(0, 0, 0, 0.35)",
    overflow: "hidden",
  },
  modalHeader: {
    padding: "20px 24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottom: "1px solid var(--border-subtle)",
  },
  titleGroup: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  iconWrap: {
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    background: "rgba(34, 197, 94, 0.12)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: "18px",
    fontWeight: 700,
    color: "var(--text-primary)",
    margin: 0,
  },
  locationSubtitle: {
    fontSize: "13px",
    color: "var(--text-secondary)",
    margin: "4px 0 0 0",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
  },
  badgeGeofenced: {
    fontSize: "11px",
    color: "var(--accent-green)",
    background: "rgba(34, 197, 94, 0.12)",
    padding: "2px 8px",
    borderRadius: "999px",
    fontWeight: 600,
  },
  closeBtn: {
    background: "var(--bg-card-subtle)",
    border: "1px solid var(--border-subtle)",
    color: "var(--text-secondary)",
    width: "36px",
    height: "36px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  mapContainer: {
    width: "100%",
    height: "420px",
    position: "relative",
    background: "var(--bg-main)",
  },
  mapElement: {
    width: "100%",
    height: "100%",
  },
  modalFooter: {
    padding: "16px 24px",
    borderTop: "1px solid var(--border-subtle)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "var(--bg-card-subtle)",
  },
  footerInfo: {
    display: "flex",
    alignItems: "center",
    gap: "18px",
    fontSize: "13px",
    color: "var(--text-secondary)",
  },
  doneBtn: {
    padding: "9px 20px",
    borderRadius: "10px",
    background: "var(--accent-green)",
    color: "#031508",
    border: "none",
    fontWeight: 700,
    fontSize: "13px",
    cursor: "pointer",
  },
};
