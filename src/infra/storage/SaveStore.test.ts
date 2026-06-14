import { describe, expect, it } from 'vitest';

import { AUTO_SLOT, InMemorySaveStore, SAVE_VERSION } from './SaveStore';

describe('InMemorySaveStore', () => {
  it('writes, reads, lists, and deletes slots', async () => {
    const store = new InMemorySaveStore();
    expect(await store.list()).toEqual([]);

    await store.write(AUTO_SLOT, {
      meta: { slot: AUTO_SLOT, savedAt: 1, version: SAVE_VERSION, playtimeMs: 0 },
      payload: { hello: 'world' },
    });

    const read = await store.read<{ hello: string }>(AUTO_SLOT);
    expect(read?.payload.hello).toBe('world');

    const list = await store.list();
    expect(list).toHaveLength(1);
    expect(list[0]?.slot).toBe(AUTO_SLOT);

    await store.delete(AUTO_SLOT);
    expect(await store.read(AUTO_SLOT)).toBeNull();
  });
});
