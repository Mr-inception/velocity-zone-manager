import client from "./client";

export interface User {
  id: number;
  email: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export async function signup(email: string, password: string): Promise<AuthResponse> {
  const res = await client.post<AuthResponse>("/auth/signup", { email, password });
  return res.data;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await client.post<AuthResponse>("/auth/login", { email, password });
  return res.data;
}