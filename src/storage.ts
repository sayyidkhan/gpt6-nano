import type { Memory } from './types';

const STORAGE_KEY = 'gpt6_memories_v1';

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function loadMemories(): Memory[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seeded = seedMemories();
    saveMemories(seeded);
    return seeded;
  }
  try {
    return JSON.parse(raw) as Memory[];
  } catch {
    return [];
  }
}

export function saveMemories(memories: Memory[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(memories));
}

export function addMemory(partial: Omit<Memory, 'id' | 'date'> & Partial<Pick<Memory, 'date'>>): Memory {
  const mem: Memory = {
    id: uid(),
    date: partial.date ?? new Date().toISOString(),
    title: partial.title,
    summary: partial.summary,
    tags: partial.tags ?? [],
    people: partial.people ?? [],
    ideas: partial.ideas ?? [],
    events: partial.events ?? [],
    content: partial.content,
  };
  const current = loadMemories();
  current.push(mem);
  saveMemories(current);
  return mem;
}

function seedMemories(): Memory[] {
  const d = (y: number, m: number, day: number) => new Date(Date.UTC(y, m - 1, day)).toISOString();
  return [
    {
      id: 'm1',
      date: d(2024, 3, 14),
      title: 'AI-optimised solar panels',
      summary: 'Explored machine learning to tune inverter MPPT and panel tilt for higher yield.',
      tags: ['solar', 'AI', 'energy'],
      people: ['You'],
      ideas: ['smart inverters', 'photovoltaics'],
      events: [],
      content: 'Using ML to optimise PV output via MPPT control and predictive weather scheduling.'
    },
    {
      id: 'm2',
      date: d(2024, 10, 2),
      title: 'Urban wind turbines concept',
      summary: 'Looked into low-noise vertical-axis turbines for rooftop use.',
      tags: ['wind', 'urban', 'energy'],
      people: [],
      ideas: ['VAWT', 'noise control'],
      events: [],
      content: 'Compact VAWT designs for cities; focus on vibration and acoustic mitigation.'
    },
    {
      id: 'm3',
      date: d(2025, 1, 5),
      title: 'Edge robotics + vision',
      summary: 'Deployed light vision models on microcontrollers for real-time navigation.',
      tags: ['robotics', 'vision', 'embedded'],
      people: [],
      ideas: ['SLAM-lite', 'event cameras'],
      events: [],
      content: 'TinyML with quantized CNNs guiding robots in constrained environments.'
    },
    {
      id: 'm4',
      date: d(2023, 12, 7),
      title: 'Bio-signal wearables',
      summary: 'Prototyped stress detection from HRV and skin temperature.',
      tags: ['health', 'wearables'],
      people: ['Dr. Lin'],
      ideas: ['HRV', 'non-invasive sensors'],
      events: ['user study']
    },
    {
      id: 'm5',
      date: d(2024, 6, 21),
      title: 'Urban micro-mobility data',
      summary: 'Aggregated scooter and bike GPS data to optimise lanes.',
      tags: ['mobility', 'GIS', 'urban'],
      people: ['CityLab'],
      ideas: ['lane optimisation', 'heatmaps'],
      events: []
    },
    {
      id: 'm6',
      date: d(2022, 9, 9),
      title: 'Acoustic metamaterials',
      summary: 'Explored materials that bend sound for noise abatement.',
      tags: ['materials', 'acoustics'],
      people: [],
      ideas: ['phononic crystals'],
      events: []
    }
  ];
}
