import { useEffect, useRef, useState } from "react";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { Draw, Modify } from "ol/interaction";
import { GeoJSON as OLGeoJSON } from "ol/format";
import { fromLonLat } from "ol/proj";
import { Fill, Stroke, Style } from "ol/style";
import { Feature } from "ol";
import { Polygon } from "ol/geom";
import { extend, createEmpty } from "ol/extent";
import "ol/ol.css";

import { listZones, createZone, updateZone, importZones, exportZones } from "../api/zones";
import type { ZoneType } from "../api/zones";

const ZONE_TYPE_COLORS: Record<string, string> = {
  Fairway: "rgba(34,197,94,0.4)",
  Rough: "rgba(234,179,8,0.4)",
  Perimeter: "rgba(59,130,246,0.4)",
  Exclusion: "rgba(239,68,68,0.4)",
};

const UNDERSTAFFED_COLOR = "rgba(239,68,68,0.6)";

function makeStyle(zoneType: string, understaffed: boolean) {
  return new Style({
    fill: new Fill({ color: understaffed ? UNDERSTAFFED_COLOR : (ZONE_TYPE_COLORS[zoneType] || "rgba(100,100,255,0.4)") }),
    stroke: new Stroke({ color: "#333", width: 2 }),
  });
}

interface Props {
  propertyId: number;
  zonesVersion?: number;
  onZonesChange?: () => void;
}

export default function MapView({ propertyId, zonesVersion, onZonesChange }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<Map | null>(null);
  const vectorSource = useRef(new VectorSource());
  const drawInteraction = useRef<Draw | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [pendingGeometry, setPendingGeometry] = useState<GeoJSON.Polygon | null>(null);
  const [formData, setFormData] = useState({ name: "", zone_type: "Fairway", mower_count: 1, status: "Active" });
  const [formError, setFormError] = useState("");

  const loadZones = async () => {
    const data = await listZones(propertyId);
    renderZones(data);
  };

  const renderZones = (data: ZoneType[]) => {
    vectorSource.current.clear();
    const format = new OLGeoJSON();
    data.forEach((z) => {
      const feature = format.readFeature(
        { type: "Feature", geometry: z.geometry, properties: { id: z.id } },
        { dataProjection: "EPSG:4326", featureProjection: "EPSG:3857" }
      ) as Feature;
      feature.setId(z.id);
      feature.setStyle(makeStyle(z.zone_type, z.understaffed));
      vectorSource.current.addFeature(feature);
    });

    // Zoom to extent if zones exist
    if (data.length > 0 && mapInstance.current) {
      let extent = createEmpty();
      vectorSource.current.getFeatures().forEach((f) => {
        const geom = f.getGeometry();
        if (geom) extend(extent, geom.getExtent());
      });
      mapInstance.current.getView().fit(extent, { padding: [40, 40, 40, 40], maxZoom: 18 });
    }
  };

  useEffect(() => {
    if (!mapRef.current) return;

    const map = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({ source: new OSM() }),
        new VectorLayer({ source: vectorSource.current }),
      ],
      view: new View({
        center: fromLonLat([78.9629, 20.5937]), // India center
        zoom: 5,
      }),
    });

    // Modify interaction for editing existing zones
    const modify = new Modify({ source: vectorSource.current });
    modify.on("modifyend", async (e) => {
      const format = new OLGeoJSON();
      for (const feature of e.features.getArray()) {
        const id = feature.getId() as number;
        const geojson = JSON.parse(format.writeFeature(feature as Feature, {
          dataProjection: "EPSG:4326",
          featureProjection: "EPSG:3857",
        }));
        try {
          await updateZone(propertyId, id, { geometry: geojson.geometry });
          await loadZones();
          onZonesChange?.();
        } catch (err) {
          console.error("Failed to save zone edit", err);
        }
      }
    });
    map.addInteraction(modify);

    mapInstance.current = map;
    loadZones();

    return () => map.setTarget(undefined);
  }, [propertyId]);

  useEffect(() => {
    if (mapInstance.current) loadZones();
  }, [zonesVersion]);

  const startDrawing = () => {
    if (!mapInstance.current) return;
    setDrawing(true);

    const draw = new Draw({ source: vectorSource.current, type: "Polygon" });
    draw.on("drawend", (e) => {
      const feature = e.feature as Feature<Polygon>;
      const format = new OLGeoJSON();
      const geojson = JSON.parse(format.writeFeature(feature, {
        dataProjection: "EPSG:4326",
        featureProjection: "EPSG:3857",
      }));
      vectorSource.current.removeFeature(feature); // will re-add after save
      setPendingGeometry(geojson.geometry);
      setShowForm(true);
      setDrawing(false);
      mapInstance.current?.removeInteraction(draw);
    });

    drawInteraction.current = draw;
    mapInstance.current.addInteraction(draw);
  };

  const cancelDrawing = () => {
    if (drawInteraction.current && mapInstance.current) {
      mapInstance.current.removeInteraction(drawInteraction.current);
    }
    setDrawing(false);
  };

  const handleSaveZone = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!pendingGeometry) return;
    try {
      await createZone(propertyId, { ...formData, geometry: pendingGeometry });
      setShowForm(false);
      setPendingGeometry(null);
      setFormData({ name: "", zone_type: "Fairway", mower_count: 1, status: "Active" });
      await loadZones();
      onZonesChange?.();
    } catch (err: any) {
      setFormError(err.response?.data?.error || "Failed to save zone.");
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const geojson = JSON.parse(text);
      await importZones(propertyId, geojson);
      await loadZones();
      onZonesChange?.();
    } catch (err: any) {
      alert(err.response?.data?.error || "Import failed.");
    }
  };

  const handleExport = async () => {
    const data = await exportZones(propertyId);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `property-${propertyId}-zones.geojson`;
    a.click();
  };

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" />

      {/* Toolbar */}
      <div className="absolute top-3 left-3 flex gap-2 z-10">
        {!drawing ? (
          <button onClick={startDrawing}
            className="bg-white border shadow px-3 py-1 rounded text-sm font-medium hover:bg-gray-50">
            + Draw Zone
          </button>
        ) : (
          <button onClick={cancelDrawing}
            className="bg-red-100 border border-red-300 shadow px-3 py-1 rounded text-sm font-medium">
            Cancel Drawing
          </button>
        )}
        <label className="bg-white border shadow px-3 py-1 rounded text-sm font-medium hover:bg-gray-50 cursor-pointer">
          Import GeoJSON
          <input type="file" accept=".geojson,.json" onChange={handleImport} className="hidden" />
        </label>
        <button onClick={handleExport}
          className="bg-white border shadow px-3 py-1 rounded text-sm font-medium hover:bg-gray-50">
          Export GeoJSON
        </button>
      </div>

      {/* Zone Form Modal */}
      {showForm && (
        <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center z-20">
          <form onSubmit={handleSaveZone} className="bg-white rounded-lg p-6 w-80 shadow-xl">
            <h2 className="text-lg font-bold mb-4">New Zone</h2>
            {formError && <div className="bg-red-100 text-red-700 text-sm p-2 rounded mb-3">{formError}</div>}
            <input placeholder="Zone name" value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border rounded p-2 mb-3 text-sm" required />
            <select value={formData.zone_type}
              onChange={(e) => setFormData({ ...formData, zone_type: e.target.value })}
              className="w-full border rounded p-2 mb-3 text-sm">
              <option>Fairway</option>
              <option>Rough</option>
              <option>Perimeter</option>
              <option>Exclusion</option>
            </select>
            <input type="number" min={0} placeholder="Mower count"
              value={formData.mower_count}
              onChange={(e) => setFormData({ ...formData, mower_count: parseInt(e.target.value) })}
              className="w-full border rounded p-2 mb-3 text-sm" required />
            <select value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full border rounded p-2 mb-3 text-sm">
              <option>Active</option>
              <option>Inactive</option>
            </select>
            <div className="flex gap-2">
              <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded text-sm">Save Zone</button>
              <button type="button" onClick={() => { setShowForm(false); setPendingGeometry(null); loadZones(); }}
                className="flex-1 bg-gray-200 py-2 rounded text-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}