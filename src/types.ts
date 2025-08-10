export interface Memory {
  id: string;
  date: string; // ISO string
  title: string;
  summary: string;
  tags: string[];
  people: string[];
  ideas: string[];
  events: string[];
  content?: string;
}

export interface RecallItem {
  id: string;
  date: string; // formatted short date
  title: string;
  summary: string;
  tags: string[];
}

export interface GraphData {
  nodes: Array<{ id: string | number; label: string; group?: string; value?: number }>;
  edges: Array<{ from: string | number; to: string | number; value?: number; label?: string }>;
}

export interface RespondResult {
  query: string;
  recall: RecallItem[];
  primaryConnection: string; // how old and new ideas combine
  unexpectedConnection: string; // surprising link
  graph: GraphData;
}
