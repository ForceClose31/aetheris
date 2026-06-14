/**
 * BootScene - the very first scene.
 *
 * Responsibilities:
 *   - Initialize root services (Logger, EventBus, ServiceLocator)
 *   - Load and validate ContentRegistry
 *   - Hand off to PreloadScene on success, or render a fatal error otherwise.
 */

import { GAME_CONFIG } from '@config/game.config';
import { EventBus, type GameEventMap } from '@core/EventBus';
import { initLogger, LogLevel } from '@core/Logger';
import { createToken, getRootLocator } from '@core/ServiceLocator';
import { WorldClock } from '@core/Time';
import { ContentRegistry } from '@data/registry/ContentRegistry';
import { collectBalanceRecords } from '@data/registry/loaders/balanceLoader';
import { collectItemRecords } from '@data/registry/loaders/itemsLoader';
import { Player } from '@domain/actors/Player';
import { InMemorySaveStore, type SaveStore } from '@infra/storage/SaveStore';
import { InputManager } from '@systems/input/InputManager';
import Phaser from 'phaser';

export const TOKENS = {
  EventBus: createToken<EventBus<GameEventMap>>('EventBus'),
  ContentRegistry: createToken<ContentRegistry>('ContentRegistry'),
  WorldClock: createToken<WorldClock>('WorldClock'),
  SaveStore: createToken<SaveStore>('SaveStore'),
  InputManager: createToken<InputManager>('InputManager'),
  Player: createToken<Player>('Player'),
} as const;

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Boot' });
  }

  create(): void {
    const log = initLogger(LogLevel.Info);
    log.info(`Aetheris ${GAME_CONFIG.version} booting`);

    const locator = getRootLocator();
    locator.register(TOKENS.EventBus, new EventBus<GameEventMap>());
    locator.register(
      TOKENS.WorldClock,
      new WorldClock({ secondsPerGameHour: GAME_CONFIG.secondsPerGameHour }),
    );
    locator.register(TOKENS.SaveStore, new InMemorySaveStore());

    const registry = new ContentRegistry();
    const loadResult = registry.loadAll({
      items: collectItemRecords(),
      balance: collectBalanceRecords(),
    });
    if (!loadResult.ok) {
      this.renderFatal('Content validation failed', loadResult.error);
      for (const e of loadResult.error) {
        log.error(e.message);
      }
      return;
    }
    locator.register(TOKENS.ContentRegistry, registry);

    const balance = registry.getBalance();
    locator.register(TOKENS.Player, new Player(balance.playerBase));
    locator.register(TOKENS.InputManager, new InputManager());

    log.info(`content loaded: ${loadResult.value.counts.item} items, balance bundle ready`);
    this.scene.start('Preload');
  }

  private renderFatal(headline: string, errors: readonly Error[]): void {
    const { width, height } = this.scale;
    this.add
      .text(width / 2, height / 2 - 16, headline, {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#ff8080',
      })
      .setOrigin(0.5);
    this.add
      .text(
        width / 2,
        height / 2 + 4,
        errors
          .slice(0, 3)
          .map((e) => e.message.split('\n')[0])
          .join('\n'),
        {
          fontFamily: 'monospace',
          fontSize: '8px',
          color: '#ffaaaa',
          align: 'center',
        },
      )
      .setOrigin(0.5);
  }
}
