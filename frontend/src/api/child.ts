import { childApi } from "./client";
import type { Child } from "../types";

export async function fetchChildMe(): Promise<Child> {
  const { data } = await childApi.get<Child>("/api/child/me");
  return data;
}
