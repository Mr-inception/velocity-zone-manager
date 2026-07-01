import client from "./client";

export interface PropertyType {
  id: number;
  name: string;
  type: string;
  total_acreage: number;
  notes: string;
  created_at: string;
}

export async function listProperties(search?: string, type?: string): Promise<PropertyType[]> {
  const params: Record<string, string> = {};
  if (search) params.search = search;
  if (type) params.type = type;
  const res = await client.get<PropertyType[]>("/properties", { params });
  return res.data;
}

export async function createProperty(data: {
  name: string; type: string; total_acreage: number; notes?: string;
}): Promise<PropertyType> {
  const res = await client.post<PropertyType>("/properties", data);
  return res.data;
}

export async function updateProperty(id: number, data: Partial<{
  name: string; type: string; total_acreage: number; notes: string;
}>): Promise<PropertyType> {
  const res = await client.put<PropertyType>(`/properties/${id}`, data);
  return res.data;
}

export async function deleteProperty(id: number): Promise<void> {
  await client.delete(`/properties/${id}`);
}