import { describe, expect, it, vi } from 'vitest';

import { EventBus, type GameEventMap } from './EventBus';
import { initLogger, LogLevel, MemorySink } from './Logger';

describe('EventBus', () => {
  it('delivers payloads to subscribers', () => {
    const bus = new EventBus<GameEventMap>();
    const handler = vi.fn();
    bus.on('core.ping', handler);
    bus.emit('core.ping', { at: 123 });
    expect(handler).toHaveBeenCalledWith({ at: 123 });
  });

  it('once() unsubscribes after the first emit', () => {
    const bus = new EventBus<GameEventMap>();
    const handler = vi.fn();
    bus.once('core.ping', handler);
    bus.emit('core.ping', { at: 1 });
    bus.emit('core.ping', { at: 2 });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('off() prevents further delivery', () => {
    const bus = new EventBus<GameEventMap>();
    const handler = vi.fn();
    const off = bus.on('core.ping', handler);
    off();
    bus.emit('core.ping', { at: 1 });
    expect(handler).not.toHaveBeenCalled();
  });

  it('safely tolerates handlers that unsubscribe during dispatch', () => {
    const bus = new EventBus<GameEventMap>();
    const calls: string[] = [];
    const offA = bus.on('core.ping', () => {
      calls.push('A');
      offA();
    });
    bus.on('core.ping', () => calls.push('B'));
    bus.emit('core.ping', { at: 0 });
    expect(calls).toEqual(['A', 'B']);
    bus.emit('core.ping', { at: 1 });
    expect(calls).toEqual(['A', 'B', 'B']);
  });

  it('isolates throwing handlers and continues dispatch', () => {
    // Silence error logs from the bus during this test.
    const sink = new MemorySink();
    initLogger(LogLevel.Error, sink);

    const bus = new EventBus<GameEventMap>();
    const ok = vi.fn();
    bus.on('core.ping', () => {
      throw new Error('boom');
    });
    bus.on('core.ping', ok);
    bus.emit('core.ping', { at: 0 });
    expect(ok).toHaveBeenCalledTimes(1);
    expect(sink.records.some((r) => r.message.includes('threw'))).toBe(true);

    // Restore default logger to avoid bleeding state into other tests.
    initLogger(LogLevel.Info);
  });
});
