/**
 * BootScene - the very first scene.
 *
 * Responsibilities:
 *   - Initialize root services (Logger, EventBus, ServiceLocator)
 *   - Load and validate ContentRegistry
 *   - Wire Player, Inventory, Equipment, InputManager, CooldownTracker, SkillExecutor
 *   - Hand off to PreloadScene on success, or render a fatal error otherwise.
 */


import { GAME_CONFIG } from '@config/game.config';
import { EventBus, type GameEventMap } from '@core/EventBus';
import { initLogger, LogLevel } from '@core/Logger';
import { Rng } from '@core/Rng';
import { createToken, getRootLocator } from '@core/ServiceLocator';
import { WorldClock } from '@core/Time';
import { ContentRegistry } from '@data/registry/ContentRegistry';
import { collectBalanceRecords } from '@data/registry/loaders/balanceLoader';
import { collectItemRecords } from '@data/registry/loaders/itemsLoader';
import { collectLootTableRecords } from '@data/registry/loaders/lootTablesLoader';
import { collectMonsterRecords } from '@data/registry/loaders/monstersLoader';
import { collectSkillRecords } from '@data/registry/loaders/skillsLoader';
import { collectStatusEffectRecords } from '@data/registry/loaders/statusEffectsLoader';
import { Player } from '@domain/actors/Player';
import { Equipment } from '@domain/inventory/Equipment';
import { Inventory } from '@domain/inventory/Inventory';
import { InMemorySaveStore, type SaveStore } from '@infra/storage/SaveStore';
import { CooldownTracker } from '@systems/combat/CooldownTracker';
import { SkillExecutor } from '@systems/combat/SkillExecutor';
import { InputManager } from '@systems/input/InputManager';
import Phaser from 'phaser';

export const TOKENS = {
  EventBus: createToken<EventBus<GameEventMap>>('EventBus'),
  ContentRegistry: createToken<ContentRegistry>('ContentRegistry'),
  WorldClock: createToken<WorldClock>('WorldClock'),
  SaveStore: createToken<SaveStore>('SaveStore'),
  InputManager: createToken<InputManager>('InputManager'),
  Player: createToken<Player>('Player'),
  Inventory: createToken<Inventory>('Inventory'),
  Equipment: createToken<Equipment>('Equipment'),
  CooldownTracker: createToken<CooldownTracker>('CooldownTracker'),
  SkillExecutor: createToken<SkillExecutor>('SkillExecutor'),
  Rng: createToken<Rng>('Rng'),
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
      skills: collectSkillRecords(),
      statusEffects: collectStatusEffectRecords(),
      monsters: collectMonsterRecords(),
      lootTables: collectLootTableRecords(),
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
    const player = new Player(balance.playerBase);
    const inventory = new Inventory();
    const equipment = new Equipment(player);
    const cooldowns = new CooldownTracker();
    const rng = new Rng(0xa17e_5701);
    const executor = new SkillExecutor(registry, cooldowns, rng.fork('skills'));

    locator.register(TOKENS.Player, player);
    locator.register(TOKENS.Inventory, inventory);
    locator.register(TOKENS.Equipment, equipment);
    locator.register(TOKENS.CooldownTracker, cooldowns);
    locator.register(TOKENS.SkillExecutor, executor);
    locator.register(TOKENS.Rng, rng);
    locator.register(TOKENS.InputManager, new InputManager());

    log.info(
      `content loaded: ${loadResult.value.counts.item} items, ${loadResult.value.counts.skill} skills, ${loadResult.value.counts.monster} monsters`,
    );
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
