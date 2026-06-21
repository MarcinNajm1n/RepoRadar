export type AiCostSummary = {
  analysesToday: number;
  analysesThisWeek: number;
  analysesAllTime: number;
  estimatedNextActions: {
    summary: string;
    report: string;
    idea: string;
    research: string;
  };
};
