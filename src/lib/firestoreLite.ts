/**
 * Firestore API subset backed by Supabase. Collection `users` maps to table `profiles`.
 */
import { supabase } from '../config/supabase';

export const db = {};

export type DocumentData = Record<string, unknown>;

export interface CollectionReferenceLite {
  id: string;
}

export interface DocumentReferenceLite {
  id: string;
  parent: CollectionReferenceLite;
}

export interface QueryDocumentSnapshotLite {
  id: string;
  ref: DocumentReferenceLite;
  data: () => DocumentData;
}

export interface QuerySnapshotLite {
  empty: boolean;
  docs: QueryDocumentSnapshotLite[];
  size: number;
  forEach(callback: (doc: QueryDocumentSnapshotLite) => void): void;
}

class QC {
  constructor(
    public kind: 'where' | 'orderBy' | 'limit' | 'startAfter',
    public args: unknown[]
  ) {}
}

export function collection(_db: unknown, id: string): CollectionReferenceLite {
  return { id };
}

export function doc(_db: unknown, col: string, id: string): DocumentReferenceLite {
  return { id, parent: { id: col } };
}

export function query(ref: CollectionReferenceLite, ...cs: QC[]): Query {
  return new Query(ref.id, cs);
}

export function where(field: string, op: string, value: unknown): QC {
  return new QC('where', [field, op, value]);
}

export function orderBy(field: string, dir: 'asc' | 'desc' = 'asc'): QC {
  return new QC('orderBy', [field, dir]);
}

export function limit(n: number): QC {
  return new QC('limit', [n]);
}

export function startAfter(docSnap: QueryDocumentSnapshotLite): QC {
  return new QC('startAfter', [docSnap]);
}

export class Query {
  constructor(
    public col: string,
    public constraints: QC[]
  ) {}

  where(field: string, op: string, value: unknown): Query {
    return new Query(this.col, [...this.constraints, where(field, op, value)]);
  }

  orderBy(field: string, dir: 'asc' | 'desc' = 'asc'): Query {
    return new Query(this.col, [...this.constraints, orderBy(field, dir)]);
  }

  limit(n: number): Query {
    return new Query(this.col, [...this.constraints, limit(n)]);
  }

  startAfter(docSnap: QueryDocumentSnapshotLite): Query {
    return new Query(this.col, [...this.constraints, startAfter(docSnap)]);
  }
}

const tableName = (c: string) => (c === 'users' ? 'profiles' : c);

/** ISO timestamps from Postgres behave like Firestore Timestamp (`.toDate()`). */
function timestampLikeFromIso(iso: string): { toDate: () => Date; toMillis: () => number } {
  const d = new Date(iso);
  return {
    toDate: () => d,
    toMillis: () => d.getTime(),
  };
}

function normalizeDates(v: unknown): unknown {
  if (v == null) return v;
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v)) return timestampLikeFromIso(v);
  if (Array.isArray(v)) return v.map(normalizeDates);
  if (typeof v === 'object' && !(v instanceof Date)) {
    const o: DocumentData = {};
    for (const [k, val] of Object.entries(v as object)) o[k] = normalizeDates(val) as never;
    return o;
  }
  return v;
}

function wrapDoc(col: string, row: DocumentData): QueryDocumentSnapshotLite {
  const id = String(row.id ?? '');
  const ref: DocumentReferenceLite = { id, parent: { id: col } };
  return {
    id,
    ref,
    data: () => normalizeDates({ ...row }) as DocumentData,
  };
}

function isArrayRemove(v: unknown): v is { __arrayRemove: unknown } {
  return !!v && typeof v === 'object' && '__arrayRemove' in (v as object);
}

export function arrayRemove(element: unknown): { __arrayRemove: unknown } {
  return { __arrayRemove: element };
}

export async function getDocs(q: Query | CollectionReferenceLite): Promise<QuerySnapshotLite> {
  const col = q instanceof Query ? q.col : q.id;
  const constraints = q instanceof Query ? q.constraints : [];
  const table = tableName(col);
  let req = supabase.from(table).select('*');

  let orderField: string | null = null;
  let orderAsc = true;
  let lim: number | null = null;
  let start: QueryDocumentSnapshotLite | null = null;

  for (const c of constraints) {
    if (c.kind === 'where') {
      const [f, op, val] = c.args as [string, string, unknown];
      if (op === '==') req = req.eq(f, val as never);
      else if (op === '>=') req = req.gte(f, val as never);
      else if (op === '<=') req = req.lte(f, val as never);
      else if (op === '>') req = req.gt(f, val as never);
      else if (op === '<') req = req.lt(f, val as never);
      else throw new Error(`Unsupported where op ${op}`);
    } else if (c.kind === 'orderBy') {
      const [f, d] = c.args as [string, 'asc' | 'desc'];
      orderField = f;
      orderAsc = d !== 'desc';
    } else if (c.kind === 'limit') {
      lim = c.args[0] as number;
    } else if (c.kind === 'startAfter') {
      start = c.args[0] as QueryDocumentSnapshotLite;
    }
  }

  if (orderField) req = req.order(orderField, { ascending: orderAsc });
  if (start && orderField) {
    const v = (start.data() as DocumentData)[orderField];
    req = orderAsc ? req.gt(orderField, v as never) : req.lt(orderField, v as never);
  }
  if (lim) req = req.limit(lim);

  const { data, error } = await req;
  if (error) throw error;
  const rows = (data || []) as DocumentData[];
  const docs = rows.map((r) => wrapDoc(col, r));
  return {
    empty: docs.length === 0,
    docs,
    size: docs.length,
    forEach(callback: (d: QueryDocumentSnapshotLite) => void) {
      docs.forEach(callback);
    },
  };
}

export async function getDoc(ref: DocumentReferenceLite): Promise<{
  exists: () => boolean;
  data: () => DocumentData | undefined;
  id: string;
}> {
  const table = tableName(ref.parent.id);
  const { data, error } = await supabase.from(table).select('*').eq('id', ref.id).maybeSingle();
  if (error) throw error;
  return {
    exists: () => !!data,
    data: () => (data ? (normalizeDates(data) as DocumentData) : undefined),
    id: ref.id,
  };
}

export async function setDoc(ref: DocumentReferenceLite, data: DocumentData): Promise<void> {
  const table = tableName(ref.parent.id);
  const row = { ...data, id: ref.id };
  const { error } = await supabase.from(table).upsert(row as never);
  if (error) throw error;
}

export async function updateDoc(ref: DocumentReferenceLite, patch: DocumentData): Promise<void> {
  const table = tableName(ref.parent.id);
  const flat: DocumentData = { ...patch };
  for (const [k, v] of Object.entries(patch)) {
    if (isArrayRemove(v)) {
      const { data: cur } = await supabase.from(table).select(k).eq('id', ref.id).maybeSingle();
      const arr = ((cur as DocumentData)?.[k] as unknown[]) || [];
      const rm = v.__arrayRemove;
      flat[k] = arr.filter((x) => x !== rm) as never;
    }
  }
  const { error } = await supabase.from(table).update(flat as never).eq('id', ref.id);
  if (error) throw error;
}

export async function deleteDoc(ref: DocumentReferenceLite): Promise<void> {
  const table = tableName(ref.parent.id);
  const { error } = await supabase.from(table).delete().eq('id', ref.id);
  if (error) throw error;
}

export async function addDoc(col: CollectionReferenceLite, data: DocumentData): Promise<DocumentReferenceLite> {
  const table = tableName(col.id);
  const { data: row, error } = await supabase.from(table).insert(data as never).select('id').single();
  if (error) throw error;
  const id = (row as { id: string }).id;
  return doc(db, col.id, id);
}

export async function getCountFromServer(
  q: Query | CollectionReferenceLite
): Promise<{ data: () => { count: number } }> {
  const queryObj = q instanceof Query ? q : new Query(q.id, []);
  const table = tableName(queryObj.col);
  let req = supabase.from(table).select('*', { count: 'exact', head: true });
  for (const c of queryObj.constraints) {
    if (c.kind === 'where') {
      const [f, op, val] = c.args as [string, string, unknown];
      if (op === '==') req = req.eq(f, val as never);
      else if (op === '>=') req = req.gte(f, val as never);
      else if (op === '<=') req = req.lte(f, val as never);
      else if (op === '>') req = req.gt(f, val as never);
      else if (op === '<') req = req.lt(f, val as never);
      else throw new Error(`Unsupported where op ${op}`);
    }
  }
  const { count, error } = await req;
  if (error) throw error;
  return { data: () => ({ count: count ?? 0 }) };
}

export function writeBatch() {
  const ops: Array<() => Promise<void>> = [];
  return {
    update(r: DocumentReferenceLite, d: DocumentData) {
      ops.push(() => updateDoc(r, d));
    },
    delete(r: DocumentReferenceLite) {
      ops.push(() => deleteDoc(r));
    },
    async commit() {
      for (const o of ops) await o();
    },
  };
}

export function serverTimestamp(): string {
  return new Date().toISOString();
}

export function increment(_n: number): { __increment: number } {
  return { __increment: _n };
}

/** Firestore compatibility: mostly unused; some screens import the symbol. */
export class Timestamp {
  constructor(
    public seconds: number,
    public nanoseconds = 0
  ) {}

  toDate(): Date {
    return new Date(this.seconds * 1000 + this.nanoseconds / 1e6);
  }

  static fromDate(d: Date): Timestamp {
    const ms = d.getTime();
    return new Timestamp(Math.floor(ms / 1000), (ms % 1000) * 1e6);
  }

  static now(): Timestamp {
    return Timestamp.fromDate(new Date());
  }
}

export type DocumentDataExport = DocumentData;
export type CountQuerySnapshot = never;

export function onSnapshot(
  q: Query,
  onNext: (snap: QuerySnapshotLite) => void,
  onError?: (e: Error) => void
): () => void {
  const tick = async () => {
    try {
      onNext(await getDocs(q));
    } catch (e) {
      onError?.(e as Error);
    }
  };
  void tick();
  const id = window.setInterval(() => void tick(), 4000);
  return () => clearInterval(id);
}
