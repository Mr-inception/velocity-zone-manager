import { useEffect, useState } from "react";
import { listZones, deleteZone, getZonesSummary } from "../api/zones";
import type { ZoneType, ZonesSummary } from "../api/zones";

interface Props {
  propertyId: number;
  zonesVersion?: number;
  onZonesChange?: () => void;
}

export default function ZoneSidebar({ propertyId, zonesVersion, onZonesChange }: Props) {
  const [zones, setZones] = useState<ZoneType[]>([]);
  const [summary, setSummary] = useState<ZonesSummary | null>(null);

  const load = async () => {
    const [z, s] = await Promise.all([
      listZones(propertyId),
      getZonesSummary(propertyId),
    ]);
    setZones(z);
    setSummary(s);
  };

  useEffect(() => { load(); }, [propertyId, zonesVersion]);

  const handleDelete = async (zoneId: number) => {
    if (!confirm("Delete this zone?")) return;
    await deleteZone(propertyId, zoneId);
    await load();
    onZonesChange?.();
  };

  return (
    <div className="w-64 bg-white border-l flex flex-col overflow-hidden">
      {/* Summary Header */}
      {summary && (
        <div className="p-3 bg-gray-50 border-b text-xs">
          <div className="font-semibold text-sm mb-2">Zone Summary</div>
          <div className="grid grid-cols-2 gap-1">
            <div>Total Zones: <span className="font-medium">{summary.total_zones}</span></div>
            <div>Total Mowers: <span className="font-medium">{summary.total_mowers}</span></div>
            <div>Total Acreage: <span className="font-medium">{summary.total_acreage.toFixed(1)}</span></div>
            <div>Understaffed: <span className={`font-medium ${summary.understaffed_count > 0 ? "text-red-600" : "text-green-600"}`}>
              {summary.understaffed_count}
            </span></div>
          </div>
        </div>
      )}

      {/* Zone List */}
      <div className="overflow-y-auto flex-1">
        {zones.length === 0 && (
          <div className="text-xs text-gray-400 p-4 text-center">No zones yet. Draw one on the map.</div>
        )}
        {zones.map((z) => (
          <div key={z.id} className={`p-3 border-b text-sm ${z.understaffed ? "bg-red-50" : ""}`}>
            <div className="flex items-center justify-between">
              <span className="font-medium">{z.name}</span>
              {z.understaffed && (
                <span className="text-xs bg-red-100 text-red-700 px-1 rounded">⚠ Understaffed</span>
              )}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {z.zone_type} · {z.acreage.toFixed(2)} acres
            </div>
            <div className="text-xs text-gray-500">
              {z.mower_count} mower{z.mower_count !== 1 ? "s" : ""} · {z.status}
            </div>
            <button onClick={() => handleDelete(z.id)}
              className="text-xs text-red-500 mt-1 hover:underline">
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}