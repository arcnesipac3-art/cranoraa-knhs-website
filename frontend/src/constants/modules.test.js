import { describe, it, expect } from 'vitest';
import {
  MODULES,
  MODULE_GROUPS,
  MODULE_KEYS,
  MODULE_LABELS,
  groupSelected,
  normalizeGroups,
  summarizeModules,
} from './modules';

describe('module registry', () => {
  it('has unique keys', () => {
    expect(new Set(MODULE_KEYS).size).toBe(MODULE_KEYS.length);
  });

  it('maps every module to a declared group', () => {
    const groupKeys = MODULE_GROUPS.map((g) => g.key);
    for (const m of MODULES) {
      expect(groupKeys).toContain(m.group);
    }
  });

  it('covers every module across the groups', () => {
    const covered = MODULES.filter((m) => MODULE_GROUPS.some((g) => g.key === m.group));
    expect(covered).toHaveLength(MODULES.length);
  });

  it('uses non-empty labels and URL-safe keys', () => {
    for (const m of MODULES) {
      expect(m.label.trim().length).toBeGreaterThan(0);
      expect(m.key).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it('exposes a label lookup for every key', () => {
    for (const key of MODULE_KEYS) {
      expect(MODULE_LABELS[key]).toBeTruthy();
    }
  });
});

describe('normalizeGroups', () => {
  it('falls back to the built-in registry when no payload is usable', () => {
    expect(normalizeGroups(null)).toEqual(
      MODULE_GROUPS.map((g) => ({
        key: g.key,
        label: g.label,
        modules: MODULES.filter((m) => m.group === g.key).map((m) => ({ key: m.key, label: m.label })),
      })).filter((g) => g.modules.length > 0),
    );
    expect(normalizeGroups(undefined)).toEqual(normalizeGroups(null));
    expect(normalizeGroups([])).toEqual(normalizeGroups(null));
    expect(normalizeGroups([{ key: 'a', label: 'A', modules: [] }])).toEqual(normalizeGroups(null));
  });

  it('uses the backend payload when present', () => {
    const fromApi = [
      { key: 'people', label: 'People', modules: [{ key: 'departments', label: 'Departments' }] },
    ];
    expect(normalizeGroups(fromApi)).toEqual([
      { key: 'people', label: 'People', modules: [{ key: 'departments', label: 'Departments' }] },
    ]);
  });

  it('drops keys that are not in the registry', () => {
    const fromApi = [
      { key: 'people', label: 'People', modules: [{ key: 'departments' }, { key: 'sf9-forms' }] },
    ];
    expect(normalizeGroups(fromApi)[0].modules).toEqual([{ key: 'departments', label: 'Departments' }]);
  });
});

describe('summarizeModules', () => {
  it('describes an empty grant', () => {
    expect(summarizeModules([])).toEqual({ count: 0, text: 'No access', tone: 'none' });
    expect(summarizeModules(undefined)).toEqual({ count: 0, text: 'No access', tone: 'none' });
  });

  it('describes a full grant', () => {
    const s = summarizeModules(MODULE_KEYS);
    expect(s.tone).toBe('all');
    expect(s.count).toBe(MODULE_KEYS.length);
    expect(s.text).toBe(`All ${MODULE_KEYS.length} modules`);
  });

  it('describes a partial grant', () => {
    expect(summarizeModules(['enrollment'])).toEqual({ count: 1, text: '1 module', tone: 'some' });
    expect(summarizeModules(['enrollment', 'people'])).toEqual({ count: 2, text: '2 modules', tone: 'some' });
  });
});

describe('groupSelected', () => {
  it('orders by the declared groups and omits empty ones', () => {
    const grouped = groupSelected(['settings', 'enrollment']);
    expect(grouped.map((g) => g.key)).toEqual(['enrollment', 'system']);
    expect(grouped[0].modules.map((m) => m.key)).toEqual(['enrollment']);
    expect(grouped[1].modules.map((m) => m.key)).toEqual(['settings']);
  });

  it('returns nothing for an empty grant', () => {
    expect(groupSelected([])).toEqual([]);
    expect(groupSelected(null)).toEqual([]);
  });

  it('is stable regardless of the order keys arrive in', () => {
    expect(groupSelected(['settings', 'enrollment'])).toEqual(groupSelected(['enrollment', 'settings']));
  });
});
