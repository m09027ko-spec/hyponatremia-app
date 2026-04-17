import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { PatientSession, AppMode, Strategy, AgeMode } from '../types';
import { saveSession, audit } from '../db/dexie';

interface SessionStore {
  session: PatientSession | null;
  consented: boolean;
  startNewSession: (params: { mode: AppMode; strategy: Strategy; ageMode: AgeMode }) => void;
  setConsented: () => void;
  update: (patch: Partial<PatientSession>) => void;
  reset: () => void;
}

function createEmptySession(params: {
  mode: AppMode;
  strategy: Strategy;
  ageMode: AgeMode;
}): PatientSession {
  const now = new Date().toISOString();
  return {
    sessionId: uuidv4(),
    createdAt: now,
    updatedAt: now,
    mode: params.mode,
    strategy: params.strategy,
    ageMode: params.ageMode,
    measurements: [],
    interventions: [],
    monitoring: [],
    notes: '',
    consented: true,
  };
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  session: null,
  consented: false,
  startNewSession: (params) => {
    const session = createEmptySession(params);
    set({ session });
    void saveSession(session);
    void audit('session.start', session.sessionId, JSON.stringify(params));
  },
  setConsented: () => {
    set({ consented: true });
  },
  update: (patch) => {
    const current = get().session;
    if (!current) return;
    const next: PatientSession = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    set({ session: next });
    void saveSession(next);
  },
  reset: () => {
    set({ session: null });
  },
}));
