const h = require('../skills/herdr/scripts/herd.js');

const AGENTS = {
  result: {
    agents: [
      { name: 'sly', pane_id: 'w1:p1', workspace_id: 'w1', agent_status: 'idle' },
      { name: 'jay', pane_id: 'w1:p2', workspace_id: 'w1', agent_status: 'working' },
      { name: 'tim', pane_id: 'w2:p1', workspace_id: 'w2', agent_status: 'done' },
      { pane_id: 'w3:p1', workspace_id: 'w3', agent_status: 'idle' }, // unnamed
    ],
  },
};

const WORKTREE = {
  result: { worktree: { open_workspace_id: 'w7', path: '/wt/x' }, root_pane: { pane_id: 'w7:p1' } },
};

describe('pane', () => {
  test('returns pane_id for a handle', () => {
    expect(h.pane(AGENTS, 'jay')).toBe('w1:p2');
  });
  test('undefined for unknown handle', () => {
    expect(h.pane(AGENTS, 'nope')).toBeUndefined();
  });
});

describe('status', () => {
  test('by handle', () => { expect(h.status(AGENTS, 'tim')).toBe('done'); });
  test('by pane_id', () => { expect(h.status(AGENTS, 'w1:p1')).toBe('idle'); });
});

describe('members', () => {
  test('all named handles when no workspace', () => {
    expect(h.members(AGENTS).sort()).toEqual(['jay', 'sly', 'tim']);
  });
  test('filtered by workspace_id', () => {
    expect(h.members(AGENTS, 'w1').sort()).toEqual(['jay', 'sly']);
  });
});

describe('field', () => {
  test('extracts a dot path', () => {
    expect(h.field(WORKTREE, 'result.worktree.open_workspace_id')).toBe('w7');
  });
  test('nested', () => {
    expect(h.field(WORKTREE, 'result.root_pane.pane_id')).toBe('w7:p1');
  });
  test('undefined for missing path', () => {
    expect(h.field(WORKTREE, 'result.nope.x')).toBeUndefined();
  });
});

describe('format', () => {
  test('arrays join by newline', () => { expect(h.format(['a', 'b'])).toBe('a\nb'); });
  test('null/undefined -> empty string', () => {
    expect(h.format(undefined)).toBe('');
    expect(h.format(null)).toBe('');
  });
  test('scalars stringified', () => { expect(h.format('w7')).toBe('w7'); });
});

describe('dispatch', () => {
  test('routes members --workspace', () => {
    expect(h.dispatch(['members', '--workspace', 'w2'], AGENTS)).toEqual(['tim']);
  });
  test('throws on unknown command', () => {
    expect(() => h.dispatch(['bogus'], AGENTS)).toThrow(/unknown command/);
  });
});
