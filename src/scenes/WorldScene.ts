/**
 * WorldScene - the gameplay scene.
 *
 * Phase 2 ships the combat MVP:
 *   - Movement (Phase 1) preserved.
 *   - 2 monster types spawning periodically (slime, goblin scout).
 *   - Skill 1: basic slash (melee).
 *   - Skill 2: firebolt (ranged, may apply Burn).
 *   - Loot popups, gold pickup auto, item pickup auto-into-Inventory.
 *   - HudScene shows skill cooldowns and gold.
 *   - Death/respawn for the player.
 */

import { getLogger } from '@core/Logger';
import { getRootLocator } from '@core/ServiceLocator';
import { MonsterInstance } from '@domain/actors/MonsterInstance';
import { BasicAi, DEFAULT_AI_TUNING } from '@systems/ai/BasicAi';
import { rollLoot } from '@systems/loot/Loot';
import Phaser from 'phaser';

import type { Rng } from '@core/Rng';


import type { CooldownTracker } from '@systems/combat/CooldownTracker';
import type { SkillExecutor } from '@systems/combat/SkillExecutor';
import type { InputManager } from '@systems/input/InputManager';

import type { Player } from '@domain/actors/Player';
import type { Inventory } from '@domain/inventory/Inventory';

import type { ContentRegistry } from '@data/registry/ContentRegistry';
import type { LootTable } from '@data/schemas/loot_table.schema';
import type { Monster } from '@data/schemas/monster.schema';




import { TOKENS } from './BootScene';

const PLAYER_SIZE = 12;
const PLAYER_SPEED_BASE = 90;
const SPAWN_INTERVAL_MS = 4000;
const MAX_MONSTERS = 4;
const PLAYER_HIT_RANGE = 22;
const ATTACK_PRESS_COOLDOWN_MS = 100;

interface MonsterEntity {
  readonly instance: MonsterInstance;
  readonly ai: BasicAi;
  readonly sprite: Phaser.GameObjects.Rectangle;
  readonly hpBar: Phaser.GameObjects.Rectangle;
  readonly hpBarBg: Phaser.GameObjects.Rectangle;
  readonly attackCooldownKey: string;
  alive: boolean;
}

interface FloatingText {
  obj: Phaser.GameObjects.Text;
  ttlMs: number;
  vy: number;
}

interface GroundLoot {
  rect: Phaser.GameObjects.Rectangle;
  itemId: string;
  qty: number;
  ttlMs: number;
}

export class WorldScene extends Phaser.Scene {
  private input_!: InputManager;
  private player!: Player;
  private registry_!: ContentRegistry;
  private inventory!: Inventory;
  private cooldowns!: CooldownTracker;
  private executor!: SkillExecutor;
  private rng!: Rng;

  private playerSprite!: Phaser.GameObjects.Rectangle;
  private playerBody!: Phaser.GameObjects.Rectangle;

  private monsters: MonsterEntity[] = [];
  private spawnAccumMs = 0;
  private floats: FloatingText[] = [];
  private grounds: GroundLoot[] = [];
  private deathOverlay: Phaser.GameObjects.Text | null = null;
  private respawnTimerMs = 0;
  private hintText!: Phaser.GameObjects.Text;
  private monsterDefs: Monster[] = [];

  private readonly log = getLogger('WorldScene');

  constructor() {
    super({ key: 'World' });
  }

  create(): void {
    const locator = getRootLocator();
    this.input_ = locator.get(TOKENS.InputManager);
    this.player = locator.get(TOKENS.Player);
    this.registry_ = locator.get(TOKENS.ContentRegistry);
    this.inventory = locator.get(TOKENS.Inventory);
    this.cooldowns = locator.get(TOKENS.CooldownTracker);
    this.executor = locator.get(TOKENS.SkillExecutor);
    this.rng = locator.get(TOKENS.Rng).fork('world');

    this.cameras.main.setBackgroundColor('#171720');
    this.drawTileGrid();

    const { width, height } = this.scale;
    this.playerBody = this.add
      .rectangle(width / 2, height / 2 + 2, PLAYER_SIZE, PLAYER_SIZE - 2, 0x6cc6ff)
      .setStrokeStyle(1, 0x1a1a22);
    this.playerSprite = this.add
      .rectangle(width / 2, height / 2 - PLAYER_SIZE / 2 + 1, PLAYER_SIZE - 2, 4, 0xe6e6ec)
      .setStrokeStyle(1, 0x1a1a22);

    this.hintText = this.add
      .text(
        width / 2,
        8,
        'WASD/Arrows: move    J: slash    K: firebolt    monsters spawn nearby',
        { fontFamily: 'monospace', fontSize: '6px', color: '#5a5a66' },
      )
      .setOrigin(0.5, 0);

    this.monsterDefs = this.registry_.listMonsters();

    this.bindInput();
    this.scene.launch('Hud');
    this.log.info(`WorldScene ready, ${this.monsterDefs.length} monster def(s) available`);
  }

  private drawTileGrid(): void {
    const { width, height } = this.scale;
    const g = this.add.graphics({ lineStyle: { width: 1, color: 0x222229, alpha: 0.5 } });
    const tile = 16;
    for (let x = 0; x <= width; x += tile) {
      g.lineBetween(x, 0, x, height);
    }
    for (let y = 0; y <= height; y += tile) {
      g.lineBetween(0, y, width, y);
    }
  }

  private bindInput(): void {
    const im = this.input_;
    this.input.keyboard?.on('keydown', (ev: KeyboardEvent) => im.keyDown(ev.code));
    this.input.keyboard?.on('keyup', (ev: KeyboardEvent) => im.keyUp(ev.code));
    this.game.events.on(Phaser.Core.Events.BLUR, () => im.reset());
  }

  override update(_time: number, delta: number): void {
    const dt = delta / 1000;
    this.cooldowns.update(delta);

    if (this.player.isDead()) {
      this.tickRespawn(delta);
      this.input_.endFrame();
      return;
    }

    this.handleMovement(dt);
    this.handleCombatInputs();
    this.tickSpawn(delta);
    this.tickMonsters(delta);
    this.tickFloats(delta);
    this.tickGrounds(delta);
    this.input_.endFrame();
  }

  private handleMovement(dt: number): void {
    const im = this.input_;
    let dx = 0;
    let dy = 0;
    if (im.isDown('move.left')) {
      dx -= 1;
    }
    if (im.isDown('move.right')) {
      dx += 1;
    }
    if (im.isDown('move.up')) {
      dy -= 1;
    }
    if (im.isDown('move.down')) {
      dy += 1;
    }
    if (dx === 0 && dy === 0) {
      return;
    }
    const len = Math.hypot(dx, dy);
    dx /= len;
    dy /= len;
    const derived = this.player.computeDerived();
    const speed = (PLAYER_SPEED_BASE * derived.spd) / 60;
    const moveX = dx * speed * dt;
    const moveY = dy * speed * dt;
    this.playerBody.x += moveX;
    this.playerBody.y += moveY;
    this.playerSprite.x += moveX;
    this.playerSprite.y += moveY;
    this.clampToScreen();
  }

  private clampToScreen(): void {
    const { width, height } = this.scale;
    const half = PLAYER_SIZE / 2;
    const clampedX = Phaser.Math.Clamp(this.playerBody.x, half, width - half);
    const clampedY = Phaser.Math.Clamp(this.playerBody.y, half, height - half);
    const dx = clampedX - this.playerBody.x;
    const dy = clampedY - this.playerBody.y;
    this.playerBody.x += dx;
    this.playerBody.y += dy;
    this.playerSprite.x += dx;
    this.playerSprite.y += dy;
  }

  private handleCombatInputs(): void {
    const im = this.input_;
    if (im.wasPressed('attack.light')) {
      this.tryCastPlayerSkill('skl.basic_slash');
    }
    if (im.wasPressed('attack.heavy')) {
      this.tryCastPlayerSkill('skl.firebolt');
    }
    void ATTACK_PRESS_COOLDOWN_MS; // reserved for held-attack pacing later.
  }

  private tryCastPlayerSkill(skillId: string): void {
    const skill = this.registry_.getSkill(skillId);
    if (skill === undefined) {
      return;
    }
    const range =
      skill.shape.kind === 'single'
        ? skill.shape.range
        : skill.shape.kind === 'projectile'
          ? skill.shape.range
          : skill.shape.kind === 'aoe'
            ? skill.shape.radius
            : PLAYER_HIT_RANGE;

    const targets = this.findTargetsInRange(range);
    if (targets.length === 0) {
      this.spawnFloat(this.playerBody.x, this.playerBody.y - 16, 'no target', '#aa8888');
      return;
    }
    const formula = this.registry_.getBalance().damageFormula;
    const result = this.executor.execute(this.player, skillId, targets, formula);
    if (result.kind !== 'ok') {
      const reason = this.failReason(result.kind);
      this.spawnFloat(this.playerBody.x, this.playerBody.y - 16, reason, '#aa8888');
      return;
    }
    for (const r of result.results) {
      const ent = this.findEntityFor(r.target);
      if (ent === null) {
        continue;
      }
      const color = r.crit ? '#ffe066' : '#ffd0d0';
      this.spawnFloat(ent.sprite.x, ent.sprite.y - 8, `${r.damage}${r.crit ? '!' : ''}`, color);
      ent.sprite.setFillStyle(0xffaaaa);
      this.time.delayedCall(80, () => {
        if (ent.alive) {
          ent.sprite.setFillStyle(0xa44a4a);
        }
      });
      if (r.target.isDead()) {
        this.handleMonsterDeath(ent);
      }
    }
  }

  private failReason(kind: string): string {
    switch (kind) {
      case 'cooldown':
        return 'cooling';
      case 'insufficient_mp':
        return 'no MP';
      case 'insufficient_stamina':
        return 'tired';
      case 'insufficient_hp':
        return 'no HP';
      default:
        return kind;
    }
  }

  private findTargetsInRange(range: number): MonsterInstance[] {
    const out: MonsterInstance[] = [];
    for (const m of this.monsters) {
      if (!m.alive) {
        continue;
      }
      const d = Phaser.Math.Distance.Between(
        this.playerBody.x,
        this.playerBody.y,
        m.sprite.x,
        m.sprite.y,
      );
      if (d <= range + 6) {
        out.push(m.instance);
      }
    }
    return out;
  }

  private findEntityFor(instance: MonsterInstance): MonsterEntity | null {
    return this.monsters.find((m) => m.instance === instance) ?? null;
  }

  private tickSpawn(deltaMs: number): void {
    if (this.monsterDefs.length === 0) {
      return;
    }
    const alive = this.monsters.filter((m) => m.alive).length;
    if (alive >= MAX_MONSTERS) {
      this.spawnAccumMs = 0;
      return;
    }
    this.spawnAccumMs += deltaMs;
    if (this.spawnAccumMs < SPAWN_INTERVAL_MS) {
      return;
    }
    this.spawnAccumMs = 0;
    this.spawnMonster();
  }

  private spawnMonster(): void {
    const def = this.rng.pick(this.monsterDefs);
    const level = this.rng.int(def.levelRange[0], def.levelRange[1]);
    const inst = new MonsterInstance(def, level);
    const { width, height } = this.scale;
    // Spawn at a random edge.
    let x = 0;
    let y = 0;
    const edge = this.rng.int(0, 3);
    if (edge === 0) {
      x = this.rng.int(8, width - 8);
      y = 8;
    } else if (edge === 1) {
      x = this.rng.int(8, width - 8);
      y = height - 8;
    } else if (edge === 2) {
      x = 8;
      y = this.rng.int(8, height - 8);
    } else {
      x = width - 8;
      y = this.rng.int(8, height - 8);
    }

    const color = def.family === 'slime' ? 0x6acc7a : 0xc6a06a;
    const size = def.size === 'S' ? 10 : def.size === 'L' ? 16 : 12;
    const sprite = this.add.rectangle(x, y, size, size, color).setStrokeStyle(1, 0x1a1a22);
    const hpBarBg = this.add.rectangle(x, y - size / 2 - 4, size, 2, 0x222229).setOrigin(0.5);
    const hpBar = this.add
      .rectangle(x - size / 2, y - size / 2 - 4, size, 2, 0xc6403a)
      .setOrigin(0, 0.5);

    const tuning = {
      ...DEFAULT_AI_TUNING,
      attackRange: 14,
      aggroRange: 64,
      speed: 30 + inst.getStats().spd * 0.4,
    };

    const ai = new BasicAi(inst, tuning);
    this.monsters.push({
      instance: inst,
      ai,
      sprite,
      hpBar,
      hpBarBg,
      attackCooldownKey: `mon_atk_${this.monsters.length}`,
      alive: true,
    });
  }

  private tickMonsters(deltaMs: number): void {
    const dt = deltaMs / 1000;
    for (const m of this.monsters) {
      if (!m.alive) {
        continue;
      }

      const dotEvents = m.instance.update(deltaMs);
      for (const ev of dotEvents) {
        m.instance.damage(ev.damage);
        if (ev.damage > 0) {
          this.spawnFloat(m.sprite.x, m.sprite.y - 8, `${ev.damage}`, '#ff9966');
        }
      }
      if (m.instance.isDead()) {
        this.handleMonsterDeath(m);
        continue;
      }

      const distance = Phaser.Math.Distance.Between(
        this.playerBody.x,
        this.playerBody.y,
        m.sprite.x,
        m.sprite.y,
      );
      const hpRatio = m.instance.getHp() / m.instance.getStats().hp;
      const out = m.ai.step({
        distanceToPlayer: distance,
        hpRatio,
        canAttack: !m.instance.isOnCooldown(m.instance.def.skills[0] ?? ''),
        deltaMs,
      });

      if (out.moveTowardPlayer !== 0 && distance > 0.001) {
        const tuning = DEFAULT_AI_TUNING;
        const speed = tuning.speed + m.instance.getStats().spd * 0.3;
        const dx = (this.playerBody.x - m.sprite.x) / distance;
        const dy = (this.playerBody.y - m.sprite.y) / distance;
        const moveX = dx * speed * dt * out.moveTowardPlayer;
        const moveY = dy * speed * dt * out.moveTowardPlayer;
        m.sprite.x += moveX;
        m.sprite.y += moveY;
        m.hpBar.x += moveX;
        m.hpBar.y += moveY;
        m.hpBarBg.x += moveX;
        m.hpBarBg.y += moveY;
      }

      if (out.attack) {
        this.monsterAttackPlayer(m);
      }

      const ratio = Math.max(0, m.instance.getHp() / m.instance.getStats().hp);
      m.hpBar.width = m.hpBarBg.width * ratio;
    }
  }

  private monsterAttackPlayer(m: MonsterEntity): void {
    const skillId = m.instance.def.skills[0];
    if (skillId === undefined) {
      return;
    }
    if (m.instance.isOnCooldown(skillId)) {
      return;
    }
    const skill = this.registry_.getSkill(skillId);
    if (skill === undefined) {
      return;
    }

    const playerDerived = this.player.computeDerived();
    const stats = m.instance.getStats();
    const offense = stats.atk;
    const power = skill.power.base + skill.power.coef * (offense + stats.str * 0.5);
    const formula = this.registry_.getBalance().damageFormula;
    let dmg = power - playerDerived.def * formula.defCoef;
    dmg = Math.max(formula.minDamage, Math.floor(Math.max(0, dmg)));
    this.player.damage(dmg);
    this.spawnFloat(this.playerBody.x, this.playerBody.y - 14, `-${dmg}`, '#ff8080');
    m.instance.startCooldown(skillId, skill.cost.cooldownMs);

    if (this.player.isDead()) {
      this.onPlayerDeath();
    }
  }

  private handleMonsterDeath(m: MonsterEntity): void {
    if (!m.alive) {
      return;
    }
    m.alive = false;
    m.sprite.destroy();
    m.hpBar.destroy();
    m.hpBarBg.destroy();

    // Award EXP.
    const balance = this.registry_.getBalance();
    const exp = m.instance.def.expReward;
    const result = this.player.awardExp(balance.expCurve, balance.statCurves, exp);
    this.spawnFloat(this.playerBody.x, this.playerBody.y - 24, `+${exp} EXP`, '#c0e6ff');
    if (result.leveledUp) {
      this.spawnFloat(
        this.playerBody.x,
        this.playerBody.y - 36,
        `LEVEL ${result.state.level}!`,
        '#ffe066',
      );
    }

    // Drop loot.
    const table: LootTable | undefined = this.registry_.getLootTable(
      m.instance.def.lootTableId,
    );
    if (table === undefined) {
      return;
    }
    const drops = rollLoot(table, {
      luk: this.player.computeDerived().luk,
      rng: this.rng.fork(`loot:${m.instance.def.id}:${this.monsters.length}`),
    });
    for (const drop of drops) {
      if (drop.kind === 'gold') {
        this.inventory.addGold(drop.qty);
        this.spawnFloat(m.sprite.x, m.sprite.y - 8, `+${drop.qty}g`, '#ffd87a');
      } else if (drop.itemId !== undefined) {
        this.dropOnGround(m.sprite.x, m.sprite.y, drop.itemId, drop.qty);
      }
    }
  }

  private dropOnGround(x: number, y: number, itemId: string, qty: number): void {
    const rect = this.add.rectangle(x, y, 6, 6, 0xffd87a).setStrokeStyle(1, 0x1a1a22);
    this.grounds.push({ rect, itemId, qty, ttlMs: 30_000 });
  }

  private tickGrounds(deltaMs: number): void {
    for (let i = this.grounds.length - 1; i >= 0; i--) {
      const g = this.grounds[i];
      if (g === undefined) {
        continue;
      }
      g.ttlMs -= deltaMs;
      const d = Phaser.Math.Distance.Between(
        this.playerBody.x,
        this.playerBody.y,
        g.rect.x,
        g.rect.y,
      );
      if (d < 10) {
        const item = this.registry_.getItem(g.itemId);
        if (item !== undefined) {
          this.inventory.add(item, g.qty);
          this.spawnFloat(g.rect.x, g.rect.y - 8, `+${g.qty} ${item.name.en}`, '#c0e6ff');
        }
        g.rect.destroy();
        this.grounds.splice(i, 1);
        continue;
      }
      if (g.ttlMs <= 0) {
        g.rect.destroy();
        this.grounds.splice(i, 1);
      }
    }
  }

  private spawnFloat(x: number, y: number, text: string, color: string): void {
    const obj = this.add
      .text(x, y, text, { fontFamily: 'monospace', fontSize: '7px', color })
      .setOrigin(0.5, 1);
    this.floats.push({ obj, ttlMs: 600, vy: -16 });
  }

  private tickFloats(deltaMs: number): void {
    const dt = deltaMs / 1000;
    for (let i = this.floats.length - 1; i >= 0; i--) {
      const f = this.floats[i];
      if (f === undefined) {
        continue;
      }
      f.ttlMs -= deltaMs;
      f.obj.y += f.vy * dt;
      f.obj.alpha = Math.max(0, f.ttlMs / 600);
      if (f.ttlMs <= 0) {
        f.obj.destroy();
        this.floats.splice(i, 1);
      }
    }
  }

  private onPlayerDeath(): void {
    const { width, height } = this.scale;
    this.respawnTimerMs = 2500;
    this.deathOverlay = this.add
      .text(width / 2, height / 2, 'YOU DIED\nrespawning...', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#ff6060',
        align: 'center',
      })
      .setOrigin(0.5);
  }

  private tickRespawn(deltaMs: number): void {
    this.respawnTimerMs -= deltaMs;
    if (this.respawnTimerMs > 0) {
      return;
    }
    if (this.deathOverlay !== null) {
      this.deathOverlay.destroy();
      this.deathOverlay = null;
    }
    const { width, height } = this.scale;
    this.playerBody.x = width / 2;
    this.playerBody.y = height / 2;
    this.playerSprite.x = width / 2;
    this.playerSprite.y = height / 2 - PLAYER_SIZE / 2 + 1 - 2;
    this.player.heal(99999);
    // Clear all monsters around so respawn is safe.
    for (const m of this.monsters) {
      if (m.alive) {
        this.handleMonsterDeath(m);
      }
    }
    this.monsters = [];
    this.cooldowns.clear();
  }
}
