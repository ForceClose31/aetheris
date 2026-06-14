/**
 * WorldScene - the gameplay scene.
 *
 * Phase 3 ships data-driven map loading:
 *   - Loads the current MapDef from ContentRegistry; rebuilds tiles, NPCs, monster spawns.
 *   - Player movement honors tile collisions.
 *   - Map exits transition between maps; NPC interaction opens DialogueScene.
 *   - Day/night overlay tracks the WorldClock.
 *   - Quest progression hooks: monster.killed, npc.talked, map.entered.
 */


import { getLogger } from '@core/Logger';
import type { Rng } from '@core/Rng';
import { getRootLocator } from '@core/ServiceLocator';
import type { WorldClock, WorldDate } from '@core/Time';
import type { ContentRegistry } from '@data/registry/ContentRegistry';
import type { MapDef } from '@data/schemas/map.schema';
import type { Monster } from '@data/schemas/monster.schema';
import type { Npc } from '@data/schemas/npc.schema';
import { MonsterInstance } from '@domain/actors/MonsterInstance';
import type { Player } from '@domain/actors/Player';
import type { Inventory } from '@domain/inventory/Inventory';
import { BasicAi, DEFAULT_AI_TUNING } from '@systems/ai/BasicAi';
import type { CooldownTracker } from '@systems/combat/CooldownTracker';
import type { SkillExecutor } from '@systems/combat/SkillExecutor';
import type { WorldFlags } from '@systems/flags/WorldFlags';
import type { InputManager } from '@systems/input/InputManager';
import { rollLoot } from '@systems/loot/Loot';
import { resolveNpcSlot } from '@systems/npc/ScheduleResolver';
import type { QuestSystem } from '@systems/quest/QuestSystem';
import {
  isWalkableTile,
  mapPixelHeight,
  mapPixelWidth,
  tileToWorld,
} from '@systems/world/TileGrid';
import type { WorldState } from '@systems/world/WorldState';
import Phaser from 'phaser';

import { TOKENS } from './BootScene';

const PLAYER_SIZE = 12;
const PLAYER_SPEED_BASE = 90;
const SPAWN_INTERVAL_MS = 4000;
const INTERACT_RANGE = 22;

const TILE_COLORS: Record<number, number> = {
  0: 0x202028,
  1: 0x3a3a44,
  2: 0x6a4a30,
  3: 0x3060a0,
  4: 0x6a5a40,
  5: 0x2a4a2a,
};

interface MonsterEntity {
  readonly instance: MonsterInstance;
  readonly ai: BasicAi;
  readonly sprite: Phaser.GameObjects.Rectangle;
  readonly hpBar: Phaser.GameObjects.Rectangle;
  readonly hpBarBg: Phaser.GameObjects.Rectangle;
  alive: boolean;
}

interface NpcEntity {
  readonly npc: Npc;
  readonly sprite: Phaser.GameObjects.Rectangle;
  readonly label: Phaser.GameObjects.Text;
  dialogueId: string;
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
  private flags!: WorldFlags;
  private quests!: QuestSystem;
  private worldState!: WorldState;
  private clock!: WorldClock;

  private mapDef!: MapDef;
  private mapContainer!: Phaser.GameObjects.Container;
  private playerSprite!: Phaser.GameObjects.Rectangle;
  private playerBody!: Phaser.GameObjects.Rectangle;
  private dayNightOverlay!: Phaser.GameObjects.Rectangle;
  private monsters: MonsterEntity[] = [];
  private npcs: NpcEntity[] = [];
  private spawnAccumMs = 0;
  private floats: FloatingText[] = [];
  private grounds: GroundLoot[] = [];
  private deathOverlay: Phaser.GameObjects.Text | null = null;
  private respawnTimerMs = 0;
  private hintText!: Phaser.GameObjects.Text;
  private isDialogueOpen = false;
  private exitDebounceMs = 0;
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
    this.flags = locator.get(TOKENS.WorldFlags);
    this.quests = locator.get(TOKENS.QuestSystem);
    this.worldState = locator.get(TOKENS.WorldState);
    this.clock = locator.get(TOKENS.WorldClock);

    this.cameras.main.setBackgroundColor('#0a0a0e');

    this.mapContainer = this.add.container(0, 0);

    const { width, height } = this.scale;
    this.playerBody = this.add
      .rectangle(width / 2, height / 2 + 2, PLAYER_SIZE, PLAYER_SIZE - 2, 0x6cc6ff)
      .setStrokeStyle(1, 0x1a1a22);
    this.playerSprite = this.add
      .rectangle(width / 2, height / 2 - PLAYER_SIZE / 2 + 1, PLAYER_SIZE - 2, 4, 0xe6e6ec)
      .setStrokeStyle(1, 0x1a1a22);

    this.dayNightOverlay = this.add
      .rectangle(0, 0, width, height, 0x000020, 0)
      .setOrigin(0, 0)
      .setDepth(1000);

    this.hintText = this.add
      .text(width / 2, 8, '', { fontFamily: 'monospace', fontSize: '6px', color: '#5a5a66' })
      .setOrigin(0.5, 0)
      .setDepth(1001);

    this.bindInput();
    this.scene.launch('Hud');

    this.loadCurrentMap();
    this.quests.reevaluate();
  }

  private loadCurrentMap(): void {
    const mapId = this.worldState.getCurrentMapId();
    const marker = this.worldState.getCurrentSpawnMarker();
    this.mapDef = this.registry_.requireMap(mapId);

    this.mapContainer.removeAll(true);
    this.clearMonsters();
    this.clearNpcs();
    this.clearGrounds();
    this.cooldowns.clear();
    this.spawnAccumMs = 0;
    this.exitDebounceMs = 250;

    this.drawMapTiles();
    this.spawnNpcs();

    const spawn = this.mapDef.spawns.find((s) => s.id === marker) ?? this.mapDef.spawns[0];
    if (spawn !== undefined) {
      const [x, y] = tileToWorld(this.mapDef, spawn.pos[0], spawn.pos[1]);
      this.playerBody.x = x;
      this.playerBody.y = y;
      this.playerSprite.x = x;
      this.playerSprite.y = y - PLAYER_SIZE / 2 + 1 - 2;
    }

    this.cameras.main.setBounds(0, 0, mapPixelWidth(this.mapDef), mapPixelHeight(this.mapDef));
    this.cameras.main.startFollow(this.playerBody, true, 1, 1);

    const skill1 = 'skl.basic_slash';
    const skill2 = 'skl.firebolt';
    void skill1;
    void skill2;
    this.hintText.setText(
      'WASD: move   J: slash   K: firebolt   E: interact / use door',
    );

    this.quests.emit({ kind: 'map.entered', id: mapId });
    this.log.info(`entered map "${mapId}" at "${marker}"`);
  }

  private drawMapTiles(): void {
    const ts = this.mapDef.tileSize;
    for (let r = 0; r < this.mapDef.tiles.length; r++) {
      const row = this.mapDef.tiles[r];
      if (row === undefined) {
        continue;
      }
      for (let c = 0; c < row.length; c++) {
        const code = row[c] ?? 0;
        const color = TILE_COLORS[code] ?? 0x101018;
        const tile = this.add
          .rectangle(c * ts + ts / 2, r * ts + ts / 2, ts - 1, ts - 1, color)
          .setStrokeStyle(0);
        this.mapContainer.add(tile);
      }
    }
  }

  private spawnNpcs(): void {
    const hour = this.clock.now().hour;
    for (const placement of this.mapDef.npcs) {
      const npc = this.registry_.getNpc(placement.npcId);
      if (npc === undefined) {
        continue;
      }
      const slot = resolveNpcSlot(npc, hour);
      if (slot !== null && slot.mapId !== this.mapDef.id) {
        continue; // NPC is elsewhere right now
      }
      const [col, row] = slot?.pos ?? placement.spawn;
      const [x, y] = tileToWorld(this.mapDef, col, row);
      const color = parseInt(npc.placeholderColor, 16);
      const sprite = this.add.rectangle(x, y, 12, 12, color).setStrokeStyle(1, 0x1a1a22);
      const label = this.add
        .text(x, y - 12, npc.name.en, {
          fontFamily: 'monospace',
          fontSize: '6px',
          color: '#aaaab0',
        })
        .setOrigin(0.5, 1);
      this.npcs.push({
        npc,
        sprite,
        label,
        dialogueId: slot?.dialogueId ?? npc.dialogueId,
      });
    }
  }

  private bindInput(): void {
    const im = this.input_;
    this.input.keyboard?.on('keydown', (ev: KeyboardEvent) => im.keyDown(ev.code));
    this.input.keyboard?.on('keyup', (ev: KeyboardEvent) => im.keyUp(ev.code));
    this.game.events.on(Phaser.Core.Events.BLUR, () => im.reset());
  }

  override update(_time: number, delta: number): void {
    if (this.isDialogueOpen) {
      this.input_.endFrame();
      return;
    }

    const dt = delta / 1000;
    this.cooldowns.update(delta);
    this.clock.update(delta);
    this.applyDayNightOverlay(this.clock.now());

    if (this.exitDebounceMs > 0) {
      this.exitDebounceMs -= delta;
    }

    if (this.player.isDead()) {
      this.tickRespawn(delta);
      this.input_.endFrame();
      return;
    }

    this.handleMovement(dt);
    this.handleCombatInputs();
    this.handleInteract();
    this.checkExit();
    this.tickSpawn(delta);
    this.tickMonsters(delta);
    this.tickFloats(delta);
    this.tickGrounds(delta);
    this.input_.endFrame();
  }

  private applyDayNightOverlay(date: WorldDate): void {
    if (this.mapDef.indoor) {
      this.dayNightOverlay.setFillStyle(0x000000, 0);
      return;
    }
    // Smooth tint between hours 18->22 (dusk), 22->6 (night), 6->8 (dawn).
    const h = date.hour + date.minute / 60;
    let alpha = 0;
    let color = 0x00001a;
    if (h >= 22 || h < 6) {
      alpha = 0.55;
      color = 0x00001a;
    } else if (h >= 18 && h < 22) {
      alpha = (h - 18) / 4 * 0.55;
      color = 0x150028;
    } else if (h >= 6 && h < 8) {
      alpha = (1 - (h - 6) / 2) * 0.4;
      color = 0x180a08;
    } else {
      alpha = 0;
    }
    this.dayNightOverlay.setFillStyle(color, alpha);
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
    this.tryMovePlayer(dx * speed * dt, 0);
    this.tryMovePlayer(0, dy * speed * dt);
  }

  private tryMovePlayer(dx: number, dy: number): void {
    const ts = this.mapDef.tileSize;
    const targetX = this.playerBody.x + dx;
    const targetY = this.playerBody.y + dy;
    const half = PLAYER_SIZE / 2 - 1;
    // Test the four corners of the player's bounding box at the target.
    const corners: [number, number][] = [
      [targetX - half, targetY - half],
      [targetX + half, targetY - half],
      [targetX - half, targetY + half],
      [targetX + half, targetY + half],
    ];
    for (const [cx, cy] of corners) {
      const col = Math.floor(cx / ts);
      const row = Math.floor(cy / ts);
      if (!isWalkableTile(this.mapDef, col, row)) {
        return;
      }
    }
    const drift = targetX - this.playerBody.x;
    const drifty = targetY - this.playerBody.y;
    this.playerBody.x = targetX;
    this.playerBody.y = targetY;
    this.playerSprite.x += drift;
    this.playerSprite.y += drifty;
  }

  private handleCombatInputs(): void {
    const im = this.input_;
    if (im.wasPressed('attack.light')) {
      this.tryCastPlayerSkill('skl.basic_slash');
    }
    if (im.wasPressed('attack.heavy')) {
      this.tryCastPlayerSkill('skl.firebolt');
    }
  }

  private handleInteract(): void {
    if (!this.input_.wasPressed('interact')) {
      return;
    }
    const npc = this.findNpcInRange(INTERACT_RANGE);
    if (npc === null) {
      return;
    }
    this.openDialogue(npc);
  }

  private openDialogue(npc: NpcEntity): void {
    this.isDialogueOpen = true;
    this.scene.launch('Dialogue', {
      dialogueId: npc.dialogueId,
      npcId: npc.npc.id,
      onClose: (result: { flags: Record<string, boolean | number | string>; npcId?: string }) => {
        this.isDialogueOpen = false;
        if (result.npcId !== undefined) {
          this.quests.emit({ kind: 'npc.talked', id: result.npcId });
        }
        const shopFlag = result.flags['ui.open_shop'];
        if (typeof shopFlag === 'string') {
          this.openShopFor(shopFlag);
          this.flags.delete('ui.open_shop');
        }
        this.quests.reevaluate();
      },
    });
  }

  private openShopFor(npcId: string): void {
    const npc = this.registry_.getNpc(npcId);
    if (npc === undefined || npc.shop === undefined) {
      return;
    }
    // Phase 3 shop UI is a quick "auto-buy first stock" stub.
    // A proper UI lands in a UI-pass phase. For now we just announce.
    const lines = npc.shop.sells.map((s) => {
      const item = this.registry_.getItem(s.itemId);
      return `${item?.name.en ?? s.itemId} - ${s.price ?? '?'}g`;
    });
    this.spawnFloat(this.playerBody.x, this.playerBody.y - 16, lines.join(' / '), '#ffd87a');
  }

  private findNpcInRange(range: number): NpcEntity | null {
    let best: { e: NpcEntity; d: number } | null = null;
    for (const e of this.npcs) {
      const d = Phaser.Math.Distance.Between(
        this.playerBody.x,
        this.playerBody.y,
        e.sprite.x,
        e.sprite.y,
      );
      if (d <= range && (best === null || d < best.d)) {
        best = { e, d };
      }
    }
    return best?.e ?? null;
  }

  private checkExit(): void {
    if (this.exitDebounceMs > 0) {
      return;
    }
    const ts = this.mapDef.tileSize;
    const col = Math.floor(this.playerBody.x / ts);
    const row = Math.floor(this.playerBody.y / ts);
    for (const ex of this.mapDef.exits) {
      const [rx, ry, rw, rh] = ex.rect;
      if (col >= rx && col < rx + rw && row >= ry && row < ry + rh) {
        if (ex.requireFlags.length > 0) {
          const ok = ex.requireFlags.every((f) => this.flags.has(f));
          if (!ok) {
            this.spawnFloat(this.playerBody.x, this.playerBody.y - 14, 'locked', '#aa8888');
            return;
          }
        }
        if (this.worldState.transitionTo(ex.to.mapId, ex.to.marker)) {
          this.loadCurrentMap();
        }
        return;
      }
    }
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
            : INTERACT_RANGE;

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
          ent.sprite.setFillStyle(this.monsterColor(ent.instance.def));
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

  private monsterColor(def: Monster): number {
    return def.family === 'slime' ? 0x6acc7a : 0xc6a06a;
  }

  private tickSpawn(deltaMs: number): void {
    if (this.mapDef.monsters.length === 0) {
      return;
    }
    this.spawnAccumMs += deltaMs;
    if (this.spawnAccumMs < SPAWN_INTERVAL_MS) {
      return;
    }
    this.spawnAccumMs = 0;
    // Pick a spawn entry whose maxConcurrent is not yet reached.
    const eligible = this.mapDef.monsters.filter((s) => {
      const active = this.monsters.filter(
        (m) => m.alive && m.instance.def.id === s.monsterId,
      ).length;
      return active < s.maxConcurrent;
    });
    if (eligible.length === 0) {
      return;
    }
    const entry = this.rng.weightedPick(
      eligible.map((e) => ({ value: e, weight: e.weight })),
    );
    const def = this.registry_.getMonster(entry.monsterId);
    if (def === undefined) {
      return;
    }
    this.spawnMonster(def);
  }

  private spawnMonster(def: Monster): void {
    const level = this.rng.int(def.levelRange[0], def.levelRange[1]);
    const inst = new MonsterInstance(def, level);
    const w = mapPixelWidth(this.mapDef);
    const h = mapPixelHeight(this.mapDef);
    let x = 0;
    let y = 0;
    // Random walkable tile away from player.
    for (let attempt = 0; attempt < 24; attempt++) {
      const col = this.rng.int(1, (this.mapDef.tiles[0]?.length ?? 1) - 2);
      const row = this.rng.int(1, this.mapDef.tiles.length - 2);
      if (!isWalkableTile(this.mapDef, col, row)) {
        continue;
      }
      const [px, py] = tileToWorld(this.mapDef, col, row);
      const dist = Phaser.Math.Distance.Between(this.playerBody.x, this.playerBody.y, px, py);
      if (dist > 40) {
        x = px;
        y = py;
        break;
      }
    }
    if (x === 0 && y === 0) {
      x = w - 16;
      y = h - 16;
    }

    const color = this.monsterColor(def);
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
    this.monsters.push({ instance: inst, ai, sprite, hpBar, hpBarBg, alive: true });
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
        const speed = DEFAULT_AI_TUNING.speed + m.instance.getStats().spd * 0.3;
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

    const update = this.quests.emit({ kind: 'monster.killed', id: m.instance.def.id });
    for (const u of update.updates) {
      this.spawnFloat(
        this.playerBody.x,
        this.playerBody.y - 48,
        `${u.questId} ${u.progress}/${u.target}`,
        '#a0c0ff',
      );
    }
    for (const c of update.completed) {
      this.spawnFloat(this.playerBody.x, this.playerBody.y - 60, `quest done: ${c.questId}`, '#ffe066');
    }

    const table = this.registry_.getLootTable(m.instance.def.lootTableId);
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
          this.quests.emit({ kind: 'item.acquired', id: item.id, count: g.qty });
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
      .setOrigin(0.5, 1)
      .setDepth(1002);
    this.floats.push({ obj, ttlMs: 800, vy: -16 });
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
      f.obj.alpha = Math.max(0, f.ttlMs / 800);
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
      .text(width / 2, height / 2, 'YOU DIED\nrespawning in Eldermill...', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#ff6060',
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(2000);
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
    this.player.heal(99999);
    if (this.worldState.transitionTo('map.plains.eldermill', 'spawn.center')) {
      this.loadCurrentMap();
    }
  }

  private clearMonsters(): void {
    for (const m of this.monsters) {
      if (m.alive) {
        m.sprite.destroy();
        m.hpBar.destroy();
        m.hpBarBg.destroy();
      }
    }
    this.monsters = [];
  }

  private clearNpcs(): void {
    for (const n of this.npcs) {
      n.sprite.destroy();
      n.label.destroy();
    }
    this.npcs = [];
  }

  private clearGrounds(): void {
    for (const g of this.grounds) {
      g.rect.destroy();
    }
    this.grounds = [];
  }
}
