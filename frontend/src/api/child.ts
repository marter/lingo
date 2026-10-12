import { childApi } from "./client";
import type { Child, Lesson, LessonResult, Unit } from "../types";

export async function fetchChildMe(): Promise<Child> {
  const { data } = await childApi.get<Child>("/api/child/me");
  return data;
}

export async function fetchCourse(): Promise<Unit[]> {
  const { data } = await childApi.get<{ units: Unit[] }>("/api/child/course");
  return data.units;
}

export async function fetchLesson(id: string): Promise<Lesson> {
  const { data } = await childApi.get<Lesson>(`/api/child/lessons/${id}`);
  return data;
}

export async function completeLesson(id: string, result: LessonResult): Promise<void> {
  await childApi.post(`/api/child/lessons/${id}/complete`, result);
}
