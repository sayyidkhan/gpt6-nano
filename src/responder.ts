import type { Memory, RecallItem, RespondResult, GraphData } from './types';
import { keywords, similarity } from './similarity';

function shortDate(iso: string): string {
  const d = new Date(iso);
  const y = d.getUTCFullYear();
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${day} ${d.toLocaleString('en', { month: 'short' })} ${y}`;
}

function topRelated(query: string, memories: Memory[], limit = 5): Memory[] {
  const scored = memories.map(m => ({ m, s: similarity(query + ' ' + (m.tags || []).join(' '), `${m.title} ${m.summary} ${(m.content||'')}`) }));
  scored.sort((a, b) => b.s - a.s);
  return scored.slice(0, limit).map(x => x.m);
}

function buildRecall(memories: Memory[]): RecallItem[] {
  return memories.map(m => ({ id: m.id, date: shortDate(m.date), title: m.title, summary: m.summary, tags: m.tags || [] }));
}

function deriveConcepts(query: string, memories: Memory[]): { mergeLine: string; concepts: string[] } {
  const qKeys = keywords(query, 6);
  const memKeys = Array.from(new Set(memories.flatMap(m => [ ...(m.tags||[]), ...m.ideas || [], ...keywords(m.summary, 3) ])));
  const combined = Array.from(new Set([...qKeys, ...memKeys]));
  const buckets: Record<string, string[]> = {
    'People': Array.from(new Set(memories.flatMap(m => m.people || []))),
    'Ideas': Array.from(new Set(memories.flatMap(m => m.ideas || []))),
    'Events': Array.from(new Set(memories.flatMap(m => m.events || []))),
  };
  const mergeLine = `Merging "${qKeys.slice(0,2).join(' + ') || 'new insight'}" with ${memories[0]?.title ?? 'prior work'} suggests a multilayer approach across ${Object.keys(buckets).join(', ')}.`;
  const concepts = [ ...combined.slice(0, 8) ];
  return { mergeLine, concepts };
}

function pickUnexpected(query: string, memories: Memory[], alreadyUsed: Set<string>): string {
  if (memories.length === 0) return 'Unexpected link: pair current topic with acoustic metamaterials to attenuate friction—noise-aware control can also reduce energy losses.';
  // choose a memory with low-medium similarity
  const scored = memories.map(m => ({ m, s: similarity(query, `${m.title} ${m.summary} ${(m.content||'')}`) }));
  scored.sort((a, b) => a.s - b.s);
  const candidate = scored.find(x => !alreadyUsed.has(x.m.id)) || scored[0];
  const bridge = keywords(query + ' ' + candidate.m.summary, 4).slice(0,2).join(' & ');
  return `Unexpected connection: blend "${candidate.m.title}" via ${bridge || 'a shared systems lens'} to provoke a novel angle.`;
}

function buildGraph(query: string, memories: Memory[]): GraphData {
  // Nodes: query, memory nodes, and concept nodes; edges link by tags/ideas/people
  const nodes: GraphData['nodes'] = [];
  const edges: GraphData['edges'] = [];

  nodes.push({ id: 'q', label: `Current Topic\n${query.slice(0, 48)}${query.length>48?'…':''}`, group: 'query', value: 3 });

  const conceptSet = new Set<string>();

  for (const m of memories) {
    nodes.push({ id: m.id, label: m.title, group: 'memory', value: 2 });
    edges.push({ from: 'q', to: m.id, value: 1, label: 'related' });
    for (const tag of (m.tags || [])) { conceptSet.add(tag); edges.push({ from: m.id, to: `tag:${tag}`, label: 'tag' }); }
    for (const idea of (m.ideas || [])) { conceptSet.add(idea); edges.push({ from: m.id, to: `idea:${idea}`, label: 'idea' }); }
    for (const person of (m.people || [])) { conceptSet.add(person); edges.push({ from: m.id, to: `person:${person}`, label: 'person' }); }
  }

  Array.from(conceptSet).forEach(c => nodes.push({ id: `c:${c}`, label: c, group: 'concept', value: 1 }));

  // Fix edge endpoints to actual concept node ids
  for (const e of edges) {
    const toStr = String(e.to);
    if (toStr.startsWith('tag:')) e.to = `c:${toStr.slice(4)}`;
    if (toStr.startsWith('idea:')) e.to = `c:${toStr.slice(5)}`;
    if (toStr.startsWith('person:')) e.to = `c:${toStr.slice(7)}`;
  }

  return { nodes, edges };
}

export function respond(query: string, allMemories: Memory[]): RespondResult {
  const related = topRelated(query, allMemories, 5);
  const recall = buildRecall(related);
  const { mergeLine } = deriveConcepts(query, related);
  const used = new Set(related.map(r => r.id));
  const unexpectedConnection = pickUnexpected(query, allMemories, used);
  const graph = buildGraph(query, related);

  return {
    query,
    recall,
    primaryConnection: mergeLine,
    unexpectedConnection,
    graph,
  };
}
