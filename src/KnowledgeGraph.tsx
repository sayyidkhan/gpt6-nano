import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { Network } from 'vis-network';
import type { GraphData } from './types';
import { Maximize2, Minimize2 } from 'lucide-react';

interface Props {
  data: GraphData;
  onConceptToggle?: (concept: string) => void;
  onMemoryToggle?: (memoryId: string) => void;
  selectedChatCount?: number;
  selectedTagCount?: number;
  onFullscreenChange?: (isFullscreen: boolean) => void;
  selectedMemories?: Record<string, boolean>;
  selectedConcepts?: Set<string>;
}

export type KnowledgeGraphHandle = {
  enterFullscreen: () => Promise<void> | void;
  exitFullscreen: () => Promise<void> | void;
  toggleFullscreen: () => Promise<void> | void;
};

const KnowledgeGraph = forwardRef<KnowledgeGraphHandle, Props>(function KnowledgeGraph({ data, onConceptToggle, onMemoryToggle, selectedChatCount, selectedTagCount, onFullscreenChange, selectedMemories, selectedConcepts }: Props, ref) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const networkRef = useRef<Network | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Helper to apply selection-driven styling to nodes
  const styleNode = (n: any) => {
    const id = String(n.id);
    const isConcept = id.startsWith('c:');
    const isQuery = id === 'q';
    let isSelected = false;
    if (isConcept) {
      const concept = id.slice(2);
      isSelected = !!selectedConcepts?.has(concept);
    } else if (!isQuery) {
      isSelected = !!selectedMemories?.[id];
    }
    if (isSelected) {
      const baseFont = (n.font || {}) as any;
      return {
        ...n,
        color: {
          background: '#2563eb',
          border: '#1e40af',
          highlight: { background: '#2563eb', border: '#1e40af' },
          hover: { background: '#1d4ed8', border: '#1e3a8a' }
        },
        font: { ...baseFont, color: '#ffffff' }
      };
    }
    return n;
  };

  useEffect(() => {
    if (!containerRef.current) return;

    if (!networkRef.current) {
      networkRef.current = new Network(containerRef.current, { nodes: data.nodes.map(styleNode), edges: data.edges }, {
        nodes: {
          shape: 'dot',
          size: 12,
          font: { color: '#e2e8f0' },
          chosen: false,
        },
        edges: {
          color: '#64748b',
          smooth: true,
          chosen: false,
        },
        physics: {
          stabilization: false,
          barnesHut: { gravitationalConstant: -3000, springLength: 120 },
        },
        interaction: { hover: true, selectConnectedEdges: false },
      });
    } else {
      networkRef.current.setData({ nodes: data.nodes.map(styleNode), edges: data.edges });
      networkRef.current.redraw();
    }

    const network = networkRef.current;
    const resize = () => network.fit({ animation: true });
    const id = setTimeout(resize, 200);
    // bind click handler to propagate selections back to parent
    const handleClick = (params: any) => {
      if (!params || !params.nodes || params.nodes.length === 0) return;
      const nodeId = String(params.nodes[0]);
      if (nodeId === 'q') return;
      if (nodeId.startsWith('c:')) {
        const concept = nodeId.slice(2);
        onConceptToggle && onConceptToggle(concept);
      } else {
        onMemoryToggle && onMemoryToggle(nodeId);
      }
      // Clear vis selection so visuals solely reflect app-driven selection state
      try { (networkRef.current as any)?.unselectAll?.(); } catch {}
    };
    network.on('click', handleClick);
    return () => {
      clearTimeout(id);
      network.off('click', handleClick);
    };
  }, [data]);

  // Selection-driven visual update without resetting layout
  useEffect(() => {
    const network: any = networkRef.current as any;
    if (!network) return;
    const ds = network?.body?.data?.nodes;
    const mapped = data.nodes.map(styleNode);
    if (ds && typeof ds.update === 'function') {
      ds.update(mapped);
      network.redraw();
    } else if (network.setData) {
      network.setData({ nodes: mapped, edges: data.edges });
      network.redraw();
    }
  }, [selectedMemories, selectedConcepts]);

  useEffect(() => {
    const onResize = () => {
      if (networkRef.current) {
        networkRef.current.redraw();
        networkRef.current.fit({ animation: false });
      }
    };
    const onFsChange = () => {
      setIsFullscreen(document.fullscreenElement === wrapperRef.current);
      onFullscreenChange?.(document.fullscreenElement === wrapperRef.current);
      setTimeout(() => {
        if (networkRef.current) networkRef.current.fit({ animation: true });
      }, 60);
    };
    window.addEventListener('resize', onResize);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => {
      window.removeEventListener('resize', onResize);
      document.removeEventListener('fullscreenchange', onFsChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    const el = wrapperRef.current;
    if (!el) return;
    try {
      const isFs = document.fullscreenElement === el || (document as any).webkitFullscreenElement === el;
      if (isFs) {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if ((document as any).webkitExitFullscreen) await (document as any).webkitExitFullscreen();
      } else {
        if (el.requestFullscreen) await el.requestFullscreen();
        else if ((el as any).webkitRequestFullscreen) await (el as any).webkitRequestFullscreen();
      }
    } catch (e) {
      // noop
    }
  };

  const enterFullscreen = async () => {
    const el = wrapperRef.current;
    if (!el) return;
    if (document.fullscreenElement === el) return;
    if (el.requestFullscreen) await el.requestFullscreen();
    else if ((el as any).webkitRequestFullscreen) await (el as any).webkitRequestFullscreen();
  };

  const exitFullscreen = async () => {
    if (document.exitFullscreen) await document.exitFullscreen();
    else if ((document as any).webkitExitFullscreen) await (document as any).webkitExitFullscreen();
  };

  useImperativeHandle(ref, () => ({ enterFullscreen, exitFullscreen, toggleFullscreen }), []);

  const infoText = (typeof selectedChatCount === 'number' && typeof selectedTagCount === 'number')
    ? `Selected: ${selectedChatCount} chats • ${selectedTagCount} tags`
    : null;

  return (
    <div ref={wrapperRef} className="kg-wrapper">
      {isFullscreen && infoText ? (
        <div className="kg-info-badge">{infoText}</div>
      ) : null}
      <button
        className="icon-btn kg-fs-btn"
        title={isFullscreen ? 'Exit full screen' : 'Full screen'}
        aria-label={isFullscreen ? 'Exit full screen' : 'Full screen'}
        onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
      >
        {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
      </button>
      <div ref={containerRef} className="kg-canvas" />
    </div>
  )
});

export default KnowledgeGraph;
