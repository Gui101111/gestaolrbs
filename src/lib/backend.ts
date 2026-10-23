import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { blobs, idb } from './idb';
import type { Project, User } from './types';

/**
 * Camada de dados do app. Há dois modos:
 *  - "supabase": contas reais e projetos salvos na nuvem (quando VITE_SUPABASE_URL e
 *    VITE_SUPABASE_ANON_KEY estão configuradas);
 *  - "local": contas e projetos salvos no próprio navegador (IndexedDB), sem configuração.
 * O vídeo original fica sempre no navegador, para permitir refazer a edição.
 */
export interface Backend {
  mode: 'local' | 'supabase';
  currentUser(): Promise<User | null>;
  onAuthChange(cb: (user: User | null) => void): () => void;
  signUp(name: string, email: string, password: string): Promise<{ user: User | null; needsConfirmation: boolean }>;
  signIn(email: string, password: string): Promise<User>;
  signOut(): Promise<void>;
  resetPassword(email: string): Promise<void>;
  accessToken(): Promise<string | null>;
  listProjects(userId: string): Promise<Project[]>;
  getProject(id: string): Promise<Project | null>;
  saveProject(project: Project): Promise<void>;
  deleteProject(project: Project): Promise<void>;
  saveOutput(project: Project, blob: Blob): Promise<string | null>;
  outputUrl(project: Project): Promise<string | null>;
}

export class AuthError extends Error {}

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const byUpdatedDesc = (a: Project, b: Project) => b.updatedAt.localeCompare(a.updatedAt);

// ───────────────────────── modo local ─────────────────────────

interface LocalUserRecord extends User {
  salt: string;
  hash: string;
}

const SESSION_KEY = 'tribuna.session';

function toHex(buf: ArrayBuffer) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password: string, saltHex: string) {
  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map((h) => parseInt(h, 16)));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 120_000 }, key, 256);
  return toHex(bits);
}

function readSession(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

function writeSession(email: string | null) {
  try {
    if (email) localStorage.setItem(SESSION_KEY, email);
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* navegador sem armazenamento: a sessão dura até fechar a aba */
  }
}

function createLocalBackend(): Backend {
  const listeners = new Set<(u: User | null) => void>();
  const emit = (u: User | null) => listeners.forEach((cb) => cb(u));
  const strip = ({ id, email, name }: LocalUserRecord): User => ({ id, email, name });

  return {
    mode: 'local',
    async currentUser() {
      const email = readSession();
      if (!email) return null;
      const rec = await idb.get<LocalUserRecord>('users', email);
      return rec ? strip(rec) : null;
    },
    onAuthChange(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    async signUp(name, rawEmail, password) {
      const email = normalizeEmail(rawEmail);
      if (await idb.get('users', email)) throw new AuthError('Já existe uma conta com este e-mail. Entre com sua senha.');
      const salt = toHex(crypto.getRandomValues(new Uint8Array(16)).buffer);
      const rec: LocalUserRecord = { id: crypto.randomUUID(), email, name: name.trim(), salt, hash: await hashPassword(password, salt) };
      await idb.put('users', rec);
      writeSession(email);
      emit(strip(rec));
      return { user: strip(rec), needsConfirmation: false };
    },
    async signIn(rawEmail, password) {
      const email = normalizeEmail(rawEmail);
      const rec = await idb.get<LocalUserRecord>('users', email);
      if (!rec || (await hashPassword(password, rec.salt)) !== rec.hash) throw new AuthError('E-mail ou senha incorretos.');
      writeSession(email);
      emit(strip(rec));
      return strip(rec);
    },
    async signOut() {
      writeSession(null);
      emit(null);
    },
    async resetPassword() {
      throw new AuthError('No modo local as contas ficam neste navegador e a senha não pode ser recuperada por e-mail. Crie uma nova conta.');
    },
    async accessToken() {
      return null;
    },
    async listProjects(userId) {
      const list = await idb.byIndex<Project>('projects', 'userId', userId);
      return list.sort(byUpdatedDesc);
    },
    async getProject(id) {
      return (await idb.get<Project>('projects', id)) ?? null;
    },
    async saveProject(project) {
      await idb.put('projects', project);
    },
    async deleteProject(project) {
      await idb.delete('projects', project.id);
      await blobs.deleteAll(project.id);
    },
    async saveOutput(project, blob) {
      await blobs.put(project.id, 'output', blob);
      return null;
    },
    async outputUrl(project) {
      const blob = await blobs.get(project.id, 'output');
      return blob ? URL.createObjectURL(blob) : null;
    },
  };
}

// ───────────────────────── modo Supabase ─────────────────────────

const BUCKET = 'videos';

function translateSupabaseError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login')) return 'E-mail ou senha incorretos.';
  if (m.includes('already registered') || m.includes('already exists')) return 'Já existe uma conta com este e-mail. Entre com sua senha.';
  if (m.includes('email not confirmed')) return 'Confirme seu e-mail pelo link que enviamos antes de entrar.';
  if (m.includes('password should be')) return 'A senha precisa ter pelo menos 6 caracteres.';
  if (m.includes('rate limit')) return 'Muitas tentativas seguidas. Aguarde um minuto e tente de novo.';
  return message;
}

function createSupabaseBackend(sb: SupabaseClient): Backend {
  const toUser = (u: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null | undefined): User | null =>
    u ? { id: u.id, email: u.email ?? '', name: String(u.user_metadata?.name ?? u.email?.split('@')[0] ?? '') } : null;
  const outputPath = (p: Project) => `${p.userId}/${p.id}.${p.outputExt ?? 'mp4'}`;

  return {
    mode: 'supabase',
    async currentUser() {
      const { data } = await sb.auth.getSession();
      return toUser(data.session?.user);
    },
    onAuthChange(cb) {
      const { data } = sb.auth.onAuthStateChange((_event, session) => cb(toUser(session?.user)));
      return () => data.subscription.unsubscribe();
    },
    async signUp(name, email, password) {
      const { data, error } = await sb.auth.signUp({
        email: normalizeEmail(email),
        password,
        options: { data: { name: name.trim() }, emailRedirectTo: window.location.origin + '/projetos' },
      });
      if (error) throw new AuthError(translateSupabaseError(error.message));
      return { user: toUser(data.session?.user), needsConfirmation: !data.session };
    },
    async signIn(email, password) {
      const { data, error } = await sb.auth.signInWithPassword({ email: normalizeEmail(email), password });
      if (error) throw new AuthError(translateSupabaseError(error.message));
      return toUser(data.user)!;
    },
    async signOut() {
      await sb.auth.signOut();
    },
    async resetPassword(email) {
      const { error } = await sb.auth.resetPasswordForEmail(normalizeEmail(email), { redirectTo: window.location.origin + '/entrar' });
      if (error) throw new AuthError(translateSupabaseError(error.message));
    },
    async accessToken() {
      const { data } = await sb.auth.getSession();
      return data.session?.access_token ?? null;
    },
    async listProjects() {
      const { data, error } = await sb.from('projects').select('data').order('updated_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []).map((row) => row.data as Project);
    },
    async getProject(id) {
      const { data, error } = await sb.from('projects').select('data').eq('id', id).maybeSingle();
      if (error) throw new Error(error.message);
      return (data?.data as Project) ?? null;
    },
    async saveProject(project) {
      const { error } = await sb.from('projects').upsert({
        id: project.id,
        user_id: project.userId,
        title: project.title,
        status: project.status,
        data: project,
        updated_at: project.updatedAt,
      });
      if (error) throw new Error(error.message);
    },
    async deleteProject(project) {
      await sb.storage.from(BUCKET).remove([outputPath(project)]);
      const { error } = await sb.from('projects').delete().eq('id', project.id);
      if (error) throw new Error(error.message);
      await blobs.deleteAll(project.id);
    },
    async saveOutput(project, blob) {
      await blobs.put(project.id, 'output', blob);
      const { error } = await sb.storage.from(BUCKET).upload(outputPath(project), blob, { upsert: true, contentType: blob.type });
      return error ? 'O vídeo ficou salvo neste navegador, mas não foi possível enviá-lo para a nuvem (' + error.message + ').' : null;
    },
    async outputUrl(project) {
      const local = await blobs.get(project.id, 'output');
      if (local) return URL.createObjectURL(local);
      const { data } = await sb.storage.from(BUCKET).createSignedUrl(outputPath(project), 60 * 60);
      return data?.signedUrl ?? null;
    },
  };
}

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const backend: Backend = url && anonKey ? createSupabaseBackend(createClient(url, anonKey)) : createLocalBackend();
