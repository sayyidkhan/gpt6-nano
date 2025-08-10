import { STOPWORDS } from './stopwords';

export type Vector = Map<string, number>;

function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]+/g) || []).filter(t => !STOPWORDS.has(t));
}

function termFreq(tokens: string[]): Vector {
  const tf: Vector = new Map();
  for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
  // normalize by length
  const len = Math.sqrt(Array.from(tf.values()).reduce((s, v) => s + v * v, 0)) || 1;
  for (const [k, v] of tf) tf.set(k, v / len);
  return tf;
}

export function vectorize(text: string): Vector {
  return termFreq(tokenize(text));
}

export function cosineSim(a: Vector, b: Vector): number {
  let dot = 0;
  for (const [k, v] of a) {
    const bv = b.get(k);
    if (bv) dot += v * bv;
  }
  return dot; // since both are normalized
}

export function similarity(query: string, doc: string): number {
  return cosineSim(vectorize(query), vectorize(doc));
}

export function keywords(text: string, topN = 6): string[] {
  const tf = termFreq(tokenize(text));
  return Array.from(tf.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([k]) => k);
}
