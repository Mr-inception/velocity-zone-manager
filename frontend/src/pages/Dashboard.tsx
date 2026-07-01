import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { listProperties, createProperty, deleteProperty } from "../api/properties";
import type { PropertyType } from "../api/properties";
import MapView from "../components/MapView";
import ZoneSidebar from "../components/ZoneSidebar";

export default function Dashboard() {
  const [properties, setProperties] = useState<PropertyType[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<PropertyType | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProp, setNewProp] = useState({ name: "", type: "Golf Course", total_acreage: 0, notes: "" });
  const [error, setError] = useState("");
  const [zonesVersion, setZonesVersion] = useState(0);
  const navigate = useNavigate();

  const bumpZones = () => setZonesVersion((v) => v + 1);

  const loadProperties = async () => {
    try {
      const data = await listProperties(search, typeFilter);
      setProperties(data);
    } catch {
      setError("Failed to load properties.");
    }
  };

  useEffect(() => { loadProperties(); }, [search, typeFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createProperty(newProp);
      setShowCreateForm(false);
      setNewProp({ name: "", type: "Golf Course", total_acreage: 0, notes: "" });
      loadProperties();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create property.");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this property and all its zones?")) return;
    await deleteProperty(id);
    if (selectedProperty?.id === id) setSelectedProperty(null);
    loadProperties();
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-blue-700 text-white px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold">Velocity Zone Manager</h1>
        <button onClick={handleLogout} className="text-sm bg-blue-800 px-3 py-1 rounded hover:bg-blue-900">
          Logout
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Properties */}
        <div className="w-72 bg-gray-50 border-r flex flex-col overflow-hidden">
          <div className="p-3 border-b">
            <input placeholder="Search properties..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border rounded p-2 text-sm mb-2" />
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full border rounded p-2 text-sm mb-2">
              <option value="">All Types</option>
              <option>Golf Course</option>
              <option>Airport</option>
              <option>Corporate Campus</option>
              <option>Other</option>
            </select>
            <button onClick={() => setShowCreateForm(true)}
              className="w-full bg-blue-600 text-white py-1 rounded text-sm hover:bg-blue-700">
              + New Property
            </button>
          </div>

          {error && <div className="text-red-600 text-xs p-2">{error}</div>}

          {/* Create Form */}
          {showCreateForm && (
            <form onSubmit={handleCreate} className="p-3 border-b bg-white text-sm">
              <input placeholder="Property name" value={newProp.name}
                onChange={(e) => setNewProp({ ...newProp, name: e.target.value })}
                className="w-full border rounded p-1 mb-2" required />
              <select value={newProp.type}
                onChange={(e) => setNewProp({ ...newProp, type: e.target.value })}
                className="w-full border rounded p-1 mb-2">
                <option>Golf Course</option>
                <option>Airport</option>
                <option>Corporate Campus</option>
                <option>Other</option>
              </select>
              <input type="number" placeholder="Total acreage" value={newProp.total_acreage || ""}
                onChange={(e) => setNewProp({ ...newProp, total_acreage: parseFloat(e.target.value) })}
                className="w-full border rounded p-1 mb-2" required />
              <textarea placeholder="Notes (optional)" value={newProp.notes}
                onChange={(e) => setNewProp({ ...newProp, notes: e.target.value })}
                className="w-full border rounded p-1 mb-2 text-xs" rows={2} />
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-green-600 text-white py-1 rounded text-xs">Save</button>
                <button type="button" onClick={() => setShowCreateForm(false)}
                  className="flex-1 bg-gray-300 py-1 rounded text-xs">Cancel</button>
              </div>
            </form>
          )}

          {/* Property List */}
          <div className="overflow-y-auto flex-1">
            {properties.map((p) => (
              <div key={p.id}
                onClick={() => setSelectedProperty(p)}
                className={`p-3 border-b cursor-pointer hover:bg-blue-50 ${selectedProperty?.id === p.id ? "bg-blue-100 border-l-4 border-l-blue-600" : ""}`}>
                <div className="font-medium text-sm">{p.name}</div>
                <div className="text-xs text-gray-500">{p.type} · {p.total_acreage} acres</div>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}
                  className="text-xs text-red-500 mt-1 hover:underline">Delete</button>
              </div>
            ))}
            {properties.length === 0 && (
              <div className="text-sm text-gray-400 p-4 text-center">No properties yet.</div>
            )}
          </div>
        </div>

        {/* Main Content */}
        {selectedProperty ? (
          <div className="flex flex-1 overflow-hidden">
            <div className="flex-1 relative">
              <MapView
                propertyId={selectedProperty.id}
                zonesVersion={zonesVersion}
                onZonesChange={bumpZones}
              />
            </div>
            <ZoneSidebar
              propertyId={selectedProperty.id}
              zonesVersion={zonesVersion}
              onZonesChange={bumpZones}
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <div className="text-4xl mb-3">🗺️</div>
              <div>Select a property to manage zones</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}