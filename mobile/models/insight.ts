export type InsightConnection = {
  headline: string;
  body: string;
};

export type KnowledgeInsight = {
  id: string;
  generatedAt: number;
  lang: string;
  trackIds: string[];
  title: string;
  intro: string;
  connections: InsightConnection[];
  takeaway: string;
  read: boolean;
};
