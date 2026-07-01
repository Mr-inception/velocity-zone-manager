import client from "./client";

export interface ZoneType {
  id: number;
  property_id: number;
  name: string;
  zone_type: string;
  mower_count: number;
  status: string;
  geometry: GeoJSON.Polygon;
  acreage: number;
  understaffed: boolean;
}

export interface ZonesSummary {
  total_zones: number;
  total_acreage: number;
  total_mowers: number;
  understaffed_count: number;
}

export async function listZones(propertyId: number): Promise<ZoneType[]> {
  const res = await client.get<ZoneType[]>(`/properties/${propertyId}/zones`);
  return res.data;
}

export async function createZone(propertyId: number, data: {
  name: string; zone_type: string; mower_count: number;
  status: string; geometry: GeoJSON.Polygon;
}): Promise<ZoneType> {
  const res = await client.post<ZoneType>(`/properties/${propertyId}/zones`, data);
  return res.data;
}

export async function updateZone(propertyId: number, zoneId: number, data: Partial<{
  name: string; zone_type: string; mower_count: number;
  status: string; geometry: GeoJSON.Polygon;
}>): Promise<ZoneType> {
  const res = await client.put<ZoneType>(`/properties/${propertyId}/zones/${zoneId}`, data);
  return res.data;
}

export async function deleteZone(propertyId: number, zoneId: number): Promise<void> {
  await client.delete(`/properties/${propertyId}/zones/${zoneId}`);
}

export async function getZonesSummary(propertyId: number): Promise<ZonesSummary> {
  const res = await client.get<ZonesSummary>(`/properties/${propertyId}/zones/summary`);
  return res.data;
}

export async function exportZones(propertyId: number): Promise<GeoJSON.FeatureCollection> {
  const res = await client.get<GeoJSON.FeatureCollection>(`/properties/${propertyId}/zones/export`);
  return res.data;
}

export async function importZones(propertyId: number, geojson: GeoJSON.FeatureCollection) {
  const res = await client.post(`/properties/${propertyId}/zones/import`, geojson);
  return res.data;
}