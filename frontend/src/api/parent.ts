import { parentApi } from "./client";
import type { AgeBand, Child, ParentMe, ProfileOptions } from "../types";

export interface ChildInput {
  nickname: string;
  avatar: string;
  age_band: AgeBand;
}

export async function fetchParentMe(): Promise<ParentMe> {
  const { data } = await parentApi.get<ParentMe>("/api/parent/me");
  return data;
}

export async function fetchOptions(): Promise<ProfileOptions> {
  const { data } = await parentApi.get<ProfileOptions>("/api/parent/options");
  return data;
}

export async function setPin(pin: string): Promise<void> {
  await parentApi.put("/api/parent/pin", { pin });
}

export async function resendVerification(): Promise<void> {
  await parentApi.post("/api/parent/resend-verification");
}

export async function addChild(input: ChildInput): Promise<Child> {
  const { data } = await parentApi.post<Child>("/api/parent/children", input);
  return data;
}

export async function updateChild(id: string, input: Partial<ChildInput>): Promise<Child> {
  const { data } = await parentApi.patch<Child>(`/api/parent/children/${id}`, input);
  return data;
}

export async function deleteChild(id: string): Promise<void> {
  await parentApi.delete(`/api/parent/children/${id}`);
}
