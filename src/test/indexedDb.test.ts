import { describe, expect, it } from 'vitest';
import { sortProjectsByUpdatedAt } from '../db/indexedDb';
import type { SavedProject } from '../types/editor';

function project(id: string, updatedAt: number): SavedProject {
  return {
    id,
    name: id,
    width: 1600,
    height: 1000,
    layers: [{ id: 'layer-base', name: 'Layer 1', visible: true, locked: false }],
    elements: [],
    backgroundMode: 'normal',
    createdAt: updatedAt,
    updatedAt,
  };
}

describe('sortProjectsByUpdatedAt', () => {
  it('returns newest projects first without mutating the input', () => {
    const input = [project('old', 1), project('new', 3), project('middle', 2)];

    expect(sortProjectsByUpdatedAt(input).map(({ id }) => id)).toEqual(['new', 'middle', 'old']);
    expect(input.map(({ id }) => id)).toEqual(['old', 'new', 'middle']);
  });
});
