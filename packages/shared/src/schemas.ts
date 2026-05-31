import { z } from "zod";
import { questionTypes } from "./questionTypes";

export const subjectSchema = z.enum(["listening", "reading"]);
export type Subject = z.infer<typeof subjectSchema>;

export const partSchema = z.enum(["P1", "P2", "P3", "P4"]);
export type Part = z.infer<typeof partSchema>;

export const frequencyClassSchema = z.enum(["high", "medium", "low", "unknown"]);
export type FrequencyClass = z.infer<typeof frequencyClassSchema>;

export const questionTypeSchema = z.enum(questionTypes);
export type QuestionTypeSchema = z.infer<typeof questionTypeSchema>;
