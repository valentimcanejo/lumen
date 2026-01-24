import type { Lang } from "./lang";

export type I18nText = Partial<Record<Lang, string>>;

export type Track = {
  id: string;
  title: I18nText;
  description: I18nText;
  tags: string[];
  order: number;
  difficulty: 1 | 2 | 3;
};
