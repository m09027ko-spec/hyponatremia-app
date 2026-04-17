import Dexie, { type Table } from 'dexie';
import type { PatientSession } from '../types';

export interface ConsentLog {
  id?: number;
  timestamp: string;
}

export interface AuditLog {
  id?: number;
  timestamp: string;
  sessionId?: string;
  action: string;
  detail?: string;
}

class HyponatremiaDB extends Dexie {
  sessions!: Table<PatientSession, string>;
  consents!: Table<ConsentLog, number>;
  audits!: Table<AuditLog, number>;

  constructor() {
    super('hyponatremia-app');
    this.version(1).stores({
      sessions: 'sessionId, createdAt, updatedAt',
      consents: '++id, timestamp',
      audits: '++id, timestamp, sessionId',
    });
  }
}

export const db = new HyponatremiaDB();

export async function recordConsent(): Promise<void> {
  await db.consents.add({ timestamp: new Date().toISOString() });
}

export async function audit(action: string, sessionId?: string, detail?: string): Promise<void> {
  await db.audits.add({
    timestamp: new Date().toISOString(),
    sessionId,
    action,
    detail,
  });
}

export async function saveSession(session: PatientSession): Promise<void> {
  await db.sessions.put({ ...session, updatedAt: new Date().toISOString() });
}

export async function loadSession(sessionId: string): Promise<PatientSession | undefined> {
  return db.sessions.get(sessionId);
}
