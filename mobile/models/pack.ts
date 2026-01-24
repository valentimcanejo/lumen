import type { Lang } from "./lang";

export type PackSource = "local" | "remote" | "ai";

export type LessonBlock =
  | { type: "h2"; text: string }
  | { type: "p"; text: string }
  | { type: "quote"; text: string }
  | { type: "bullets"; items: string[] };

export type PackCard = {
  id: string; // ex: "c1"
  front: string;
  back: string;
};

export type PackQuizQuestion = {
  id: string; // ex: "q1"
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
};

export type PackLesson = {
  title: string;
  summary: string;
  audioUrl?: string; // mp3 no Storage ou TTS
  blocks: LessonBlock[];
};

export type Pack = {
  id: string; // "balance_of_power"
  version: number; // 1
  lang: Lang;
  estimatedMinutes: number;
  tags: string[];
  difficulty: 1 | 2 | 3;
  lesson: PackLesson;
  cards: PackCard[];
  quiz: PackQuizQuestion[];
  source: PackSource;
};
