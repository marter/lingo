import { familyApi, publicApi } from "./client";
import type { Family } from "../types";

export interface Credentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  family_token: string;
  parent_token: string;
}

export async function register(input: Credentials): Promise<LoginResponse> {
  const { data } = await publicApi.post<LoginResponse>("/api/auth/register", input);
  return data;
}

export async function login(input: Credentials): Promise<LoginResponse> {
  const { data } = await publicApi.post<LoginResponse>("/api/auth/login", input);
  return data;
}

export async function fetchRegistrationOpen(): Promise<boolean> {
  const { data } = await publicApi.get<{ open: boolean }>("/api/auth/registration");
  return data.open;
}

export async function verifyEmail(token: string): Promise<void> {
  await publicApi.post("/api/auth/verify-email", { token });
}

export async function fetchFamily(): Promise<Family> {
  const { data } = await familyApi.get<Family>("/api/family");
  return data;
}

export async function startChildSession(childId: string): Promise<string> {
  const { data } = await familyApi.post<{ token: string }>(
    `/api/family/children/${childId}/session`,
  );
  return data.token;
}

export async function unlockWithPin(pin: string): Promise<string> {
  const { data } = await familyApi.post<{ token: string }>("/api/family/unlock", { pin });
  return data.token;
}
