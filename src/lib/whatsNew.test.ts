import { describe, expect, it } from 'vitest';
import { entryDate, latestId, unseenEntries, type ChangelogEntry } from './whatsNew';
import { CHANGELOG } from '@/data/changelog';

const E = (id: string): ChangelogEntry => ({ id, title: id, body: '' });
const LIST = [E('2026-11-06-avis'), E('2026-11-18-neuf'), E('2026-11-12-android')];

describe('unseenEntries', () => {
  it('tout, du plus recent au plus ancien, si rien n’a ete vu', () => {
    expect(unseenEntries(LIST, undefined).map((e) => e.id)).toEqual([
      '2026-11-18-neuf',
      '2026-11-12-android',
      '2026-11-06-avis',
    ]);
  });
  it('seulement ce qui est plus recent que la derniere vue', () => {
    expect(unseenEntries(LIST, '2026-11-12-android').map((e) => e.id)).toEqual(['2026-11-18-neuf']);
  });
  it('rien si la plus recente a ete vue', () => {
    expect(unseenEntries(LIST, '2026-11-18-neuf')).toEqual([]);
  });
  it('reste juste si l’entree vue a ete retiree de la liste', () => {
    expect(unseenEntries(LIST, '2026-11-10-retiree').map((e) => e.id)).toEqual([
      '2026-11-18-neuf',
      '2026-11-12-android',
    ]);
  });
});

describe('latestId / entryDate', () => {
  it('la plus recente', () => {
    expect(latestId(LIST)).toBe('2026-11-18-neuf');
    expect(latestId([])).toBeUndefined();
  });
  it('date tiree de l’id', () => {
    expect(entryDate(E('2026-11-18-neuf'))).toBe('2026-11-18');
  });
});

describe('CHANGELOG', () => {
  it('id au format AAAA-MM-JJ-sujet, uniques', () => {
    const ids = CHANGELOG.map((e) => e.id);
    for (const id of ids) expect(id).toMatch(/^\d{4}-\d{2}-\d{2}-[a-z0-9-]+$/);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
