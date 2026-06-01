import Dexie, { type Table } from 'dexie';
import type { SavedProject } from '../types/editor';

class MindPaintDatabase extends Dexie {
  projects!: Table<SavedProject, string>;

  constructor() {
    super('mindPaintDb');
    this.version(1).stores({
      projects: 'id, name, updatedAt, createdAt',
    });
  }
}

export const db = new MindPaintDatabase();

export async function saveProject(project: SavedProject) {
  await db.projects.put(project);
}

export async function listProjects() {
  return db.projects.orderBy('updatedAt').reverse().toArray();
}

export async function getProject(id: string) {
  return db.projects.get(id);
}

export async function deleteProject(id: string) {
  await db.projects.delete(id);
}
