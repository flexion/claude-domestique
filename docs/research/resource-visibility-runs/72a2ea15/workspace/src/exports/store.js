'use strict';

// Store interface used by export maintenance code.
//   list()        -> Array<{ name: string, createdAt: Date }>
//   remove(name)  -> void; deletion is permanent
// createMemoryStore is the in-process implementation used in tests.

function createMemoryStore(entries = []) {
  const items = new Map(entries.map((e) => [e.name, { ...e }]));
  return {
    list() {
      return [...items.values()].map((e) => ({ ...e }));
    },
    remove(name) {
      items.delete(name);
    },
  };
}

module.exports = { createMemoryStore };
