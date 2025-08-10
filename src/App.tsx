import { useEffect, useMemo, useRef, useState } from 'react';
import type React from 'react';
import './App.css';
import KnowledgeGraph from './KnowledgeGraph';
import type { KnowledgeGraphHandle } from './KnowledgeGraph';
import { loadMemories, saveMemories } from './storage';
import { respond } from './responder';
import type { Memory, RespondResult, RecallItem } from './types';
import { Maximize2, Minimize2, Mic, Send } from 'lucide-react';

function App() {
  const [query, setQuery] = useState('Design a hybrid urban micro-grid using AI.');
  const [memories, setMemories] = useState<Memory[]>([]);
  const [result, setResult] = useState<RespondResult | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedMemories, setSelectedMemories] = useState<Record<string, boolean>>({});
  const [selectedTags, setSelectedTags] = useState<Record<string, Record<string, boolean>>>({});
  const [bulkTag, setBulkTag] = useState('');
  const historyGraphRef = useRef<KnowledgeGraphHandle | null>(null);
  const resultGraphRef = useRef<KnowledgeGraphHandle | null>(null);
  const [isHistoryFs, setIsHistoryFs] = useState(false);
  const [isResultFs, setIsResultFs] = useState(false);

  useEffect(() => {
    setMemories(loadMemories());
  }, []);

  const handleAsk = () => {
    if (!query.trim()) return;
    const r = respond(query.trim(), memories);
    setResult(r);
  };

  const toggleMemory = (id: string) => {
    const nextChecked = !selectedMemories[id];
    // Toggle chat selection
    setSelectedMemories(prev => ({ ...prev, [id]: nextChecked }));
    // Rule: when a chat is selected, select all its tags; when unselected, unselect all its tags
    setSelectedTags(prev => {
      const mem = memories.find(m => m.id === id);
      if (!mem) return prev;
      if (nextChecked) {
        const allTags: Record<string, boolean> = {};
        (mem.tags || []).forEach(t => { allTags[t] = true; });
        return { ...prev, [id]: allTags };
      } else {
        const { [id]: _removed, ...rest } = prev;
        return rest;
      }
    });
  };

  const toggleTag = (mid: string, tag: string) => {
    setSelectedTags(prev => {
      const inner = { ...(prev[mid] || {}) };
      inner[tag] = !inner[tag];
      return { ...prev, [mid]: inner };
    });
  };

  const shortNow = useMemo(() => new Date().toLocaleString('en', { day: '2-digit', month: 'short', year: 'numeric' }), []);

  const historyGraph = useMemo(() => respond(query || 'History Overview', memories).graph, [memories, query]);
  const selectedChatCount = useMemo(() => Object.values(selectedMemories).filter(Boolean).length, [selectedMemories]);
  const selectedTagCount = useMemo(() => Object.values(selectedTags).reduce((acc, m) => acc + Object.values(m).filter(Boolean).length, 0), [selectedTags]);
  const selectedConcepts = useMemo(() => {
    const set = new Set<string>();
    for (const mid in selectedTags) {
      const tags = selectedTags[mid];
      for (const t in tags) {
        if (tags[t]) set.add(t);
      }
    }
    return set;
  }, [selectedTags]);

  const selectAllMemories = () => {
    const all: Record<string, boolean> = {};
    const allTagMap: Record<string, Record<string, boolean>> = {};
    memories.forEach(m => {
      all[m.id] = true;
      const tags: Record<string, boolean> = {};
      (m.tags || []).forEach(t => { tags[t] = true; });
      allTagMap[m.id] = tags;
    });
    setSelectedMemories(all);
    setSelectedTags(allTagMap);
  };

  const clearSelections = () => {
    setSelectedMemories({});
    setSelectedTags({});
  };

  const applyBulkTag = () => {
    const t = bulkTag.trim();
    if (!t) return;
    const next = memories.map(m => selectedMemories[m.id] ? { ...m, tags: m.tags.includes(t) ? m.tags : [...m.tags, t] } : m);
    setMemories(next);
    saveMemories(next);
    setBulkTag('');
  };

  // When a concept node (tag/idea/person unified as concept) is toggled in the graph,
  // sync it to the tag checkboxes: toggle this concept across all memories that contain it.
  const handleConceptToggle = (concept: string) => {
    // determine if we should select or deselect based on majority/all current state
    const carriers = memories.filter(m => (m.tags || []).includes(concept));
    if (carriers.length === 0) return;
    const allSelected = carriers.every(m => !!selectedTags[m.id]?.[concept]);
    setSelectedTags(prev => {
      const next = { ...prev } as Record<string, Record<string, boolean>>;
      for (const m of carriers) {
        const inner = { ...(next[m.id] || {}) };
        if (allSelected) {
          // deselect across all carriers
          delete inner[concept];
        } else {
          inner[concept] = true;
        }
        // clean up empty inner maps
        if (Object.keys(inner).length === 0) {
          delete next[m.id];
        } else {
          next[m.id] = inner;
        }
      }
      return next;
    });
  };

  return (
    <div className="layout">
      {/* Sidebar */}
      <aside className="sidebar"> 
        <div className="brand">
          <div className="label-text brand-title">GPT‑6</div>
        </div>
        <div className="quick-links">
          <a href="#" className="quick-link" onClick={(e) => { e.preventDefault(); setQuery(''); setResult(null); }}>New chat</a>
          <a href="#" className="quick-link" onClick={(e) => { e.preventDefault(); const el = document.querySelector<HTMLInputElement>('.search-input'); el?.focus(); }}>Search chats</a>
          <a href="#" className="quick-link" onClick={(e) => { e.preventDefault(); setShowHistory(true); }}>Library</a>
          <a href="https://openai.com/sora" className="quick-link" target="_blank" rel="noreferrer">Sora</a>
          <a href="https://chat.openai.com/gpts" className="quick-link" target="_blank" rel="noreferrer">GPTs</a>
        </div>
        
        <hr className="side-divider" />
        <div className="label-text" style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Recent</div>
        <div className="side-list">
          {memories.slice().sort((a,b)=> new Date(b.date).getTime()-new Date(a.date).getTime()).slice(0,12).map(m => (
            <div key={m.id} className="side-item" onClick={() => { setQuery(m.title); const r = respond(m.title, memories); setResult(r); }}>
              <span className="side-icon">🗂️</span>
              <span className="label-text">{m.title}</span>
            </div>
          ))}
        </div>
      </aside>

      {/* Main content */}
      <main className="main">
        <div className="container">
      <header className="header hero">
        <div>
          <h1 className="headline">GPT-6: Multi-Dimensional Memory</h1>
          <p className="subhead">Confident, friendly, futuristic — thinking across timelines and ideas.</p>
        </div>
        <div className="date">Most recently trained: {shortNow}</div>
      </header>
      <section style={{ marginTop: 16 }}>
        <div className="search-bar" onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => { if (e.key === 'Enter') handleAsk(); }}>
          <button className="icon-btn" title="New chat" onClick={() => { setQuery(''); setResult(null); }}>
            +
          </button>
          <input
            className="search-input"
            placeholder="Ask anything"
            value={query}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
          />
          <div className="actions">
            <button className="icon-btn" title="Voice" aria-label="Voice">
              <Mic size={20} strokeWidth={2} aria-hidden="true" />
            </button>
            <button className="icon-btn primary" title="Send" onClick={handleAsk} aria-label="Send">
              <Send size={20} strokeWidth={2} aria-hidden="true" />
            </button>
            
            <button className="btn-ghost" onClick={() => setShowHistory((s: boolean) => !s)}>{showHistory ? 'Close' : 'History & Graph'}</button>
          </div>
        </div>
        
        {showHistory && (
          <div className="card" style={{ marginTop: 12 }}>
            <div className="grid">
              <div>
                <h3 style={{ marginTop: 0 }}>Historical Chats</h3>
                <div className="bulk-actions">
                  <span className="bulk-badge">Selected: {selectedChatCount} chats • {selectedTagCount} tags</span>
                  <button className="btn-ghost" onClick={selectAllMemories}>Select all</button>
                  <button className="btn-ghost" onClick={clearSelections}>Clear</button>
                  <input className="input" placeholder="Add tag to selected…" value={bulkTag} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBulkTag(e.target.value)} style={{ maxWidth: 220, height: 36 }} />
                  <button className="btn-primary" onClick={applyBulkTag}>Add tag</button>
                </div>
                <ul className="history-scroll" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {memories
                    .slice()
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((m: Memory) => (
                      <li key={m.id} style={{ padding: '10px 0', borderBottom: '1px solid rgba(15,23,42,0.08)' }}>
                        <div className="row" style={{ alignItems: 'flex-start', gap: 8 }}>
                          <input type="checkbox" checked={!!selectedMemories[m.id]} onChange={() => toggleMemory(m.id)} style={{ marginTop: 4 }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600 }}>On {new Date(m.date).toLocaleString('en', { day: '2-digit', month: 'short', year: 'numeric' })} you explored {m.title}.</div>
                            <div className="muted">{m.summary}</div>
                            {m.tags?.length ? (
                              <div className="date" style={{ marginTop: 6 }}>
                                {m.tags.map((tag: string) => (
                                  <label key={tag} className="tag-check">
                                    <input type="checkbox" checked={!!selectedTags[m.id]?.[tag]} onChange={() => toggleTag(m.id, tag)} />
                                    <span>{tag}</span>
                                  </label>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </li>
                    ))}
                </ul>
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ marginTop: 0 }}>Knowledge Graph</h3>
                  <button
                    className="icon-btn"
                    title={isHistoryFs ? 'Exit full screen' : 'Full screen'}
                    aria-label={isHistoryFs ? 'Exit full screen' : 'Full screen'}
                    onClick={() => historyGraphRef.current?.toggleFullscreen()}
                  >
                    {isHistoryFs ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                  </button>
                </div>
                <div className="graph-box">
                  <KnowledgeGraph
                    ref={historyGraphRef}
                    data={historyGraph}
                    onConceptToggle={handleConceptToggle}
                    onMemoryToggle={toggleMemory}
                    selectedChatCount={selectedChatCount}
                    selectedTagCount={selectedTagCount}
                    onFullscreenChange={setIsHistoryFs}
                    selectedMemories={selectedMemories}
                    selectedConcepts={selectedConcepts}
                  />
                </div>
                <div className="date" style={{ marginTop: 6 }}>Auto-generated from your memories.</div>
              </div>
            </div>
          </div>
        )}
      </section>

      {result && (
        <section className="grid" style={{ marginTop: 24 }}>
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Memory Recall</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {result.recall.map((r: RecallItem) => (
                <li key={r.id} style={{ padding: '10px 0', borderBottom: '1px solid rgba(15,23,42,0.08)' }}>
                  <div style={{ fontWeight: 600 }}>On {r.date} you explored {r.title}.</div>
                  <div className="muted">{r.summary}</div>
                  {r.tags?.length ? <div className="muted" style={{ marginTop: 4, fontSize: 12 }}>Tags: {r.tags.join(', ')}</div> : null}
                </li>
              ))}
            </ul>

            <div style={{ marginTop: 16 }}>
              <h3 style={{ margin: '12px 0 4px' }}>Connections & Suggestions</h3>
              <p>Connection: {result.primaryConnection}</p>
              <p className="accent">{result.unexpectedConnection}</p>
            </div>
          </div>
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ marginTop: 0 }}>Knowledge Graph</h3>
              <button
                className="icon-btn"
                title={isResultFs ? 'Exit full screen' : 'Full screen'}
                aria-label={isResultFs ? 'Exit full screen' : 'Full screen'}
                onClick={() => resultGraphRef.current?.toggleFullscreen()}
              >
                {isResultFs ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
            </div>
            <div className="graph-box">
              <KnowledgeGraph
                ref={resultGraphRef}
                data={result.graph}
                onConceptToggle={handleConceptToggle}
                onMemoryToggle={toggleMemory}
                selectedChatCount={selectedChatCount}
                selectedTagCount={selectedTagCount}
                onFullscreenChange={setIsResultFs}
                selectedMemories={selectedMemories}
                selectedConcepts={selectedConcepts}
              />
            </div>
            <div className="date" style={{ marginTop: 6 }}>Nodes represent past conversations and concepts; edges connect shared tags, ideas, and people.</div>
          </div>
        </section>
      )}

      {!result && (
        <section className="card" style={{ marginTop: 24 }}>
          <div className="pill">Tip: Ask anything — I will instantly recall related memories, fuse ideas, and render an interactive vis.js knowledge graph.</div>
        </section>
      )}

      <footer className="date" style={{ marginTop: 28, textAlign: 'center' }}>
        Visualisation powered by vis.js (vis-network). Your memories persist locally in your browser.
        <hr className="divider" style={{ maxWidth: 640, margin: '10px auto' }} />
        <div style={{ marginTop: 6 }}>Powered by chatgpt-6, built by its predecessor gpt-5.</div>
      </footer>
        </div>
      </main>
    </div>
  );
}

export default App
