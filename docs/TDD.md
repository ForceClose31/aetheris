# Technical Design Document (TDD)

**Project:** Aetheris (working title)
**Owner spec:** `AGENTS.md` (primary)
**Companion doc:** `docs/GDD.md`
**Status:** Engine and platform priority confirmed. Phase 0 implementation in progress.

**Platform priority (confirmed):**
1. Web (primary, served as a static site)
2. Windows desktop via Tauri wrapper
3. Linux/macOS desktop via Tauri (architecture-ready, not v1)
4. Mobile (architecture-ready, not v1)

---

## 1. Engine Recommendation

### 1.1 Decision

**Confirmed: Phaser 3 (TypeScript, strict mode) with Vite as the build tool. Web is the primary target; Windows desktop ships as a Tauri wrapper around the same web build.**

### 1.2 Why this stack fits the project

| Requirement from AGENTS.md           | How Phaser 3 + TS satisfies it                                                                 |
|--------------------------------------|------------------------------------------------------------------------------------------------|
| 2D pixel-art, top-down               | First-class WebGL/Canvas 2D renderer, pixel-perfect mode, sprite/animation pipeline            |
| Massive interconnected world         | Tiled (TMX/JSON) map import; streaming chunked maps via plugin pattern                         |
| Modular, data-driven                 | TypeScript + JSON Schema + clean ECS-style modules; trivial to load content packs at runtime    |
| Long-term scalability                | Browser/Tauri target avoids platform lock-in; content packs ship as JSON+sprite asset folders   |
| Day/night, weather, schedules        | Implementable as systems on a global world clock; lighting via shader/blend layers              |
| Save system, deterministic content   | JSON saves; deterministic via seeded RNG (mulberry32 or similar)                                |
| Working dir is `C:\laragon\www\game` | Web-native engine aligns with existing tooling                                                  |

### 1.3 Alternatives considered

- **Godot 4 (GDScript or C#)**: excellent for 2D, scene system, native exports. Strong alternative. Rejected as primary because (a) the working directory is a web stack, (b) data-driven content pipelines and CI tooling are easier in TS/Node.
- **Unity 2D**: powerful, but heavier, asset/store-driven, slower iteration, and overkill for 2D pixel scope.
- **LibGDX, MonoGame, raw HTML5 canvas**: viable, but Phaser 3 has the best out-of-the-box 2D feature set with Tiled integration.

### 1.4 Confirmation status

Engine choice (Phaser 3 + TS + Vite) and platform priority (Web first, Windows via Tauri second) are confirmed by the user. Implementation proceeds under Phase 0.

---

## 2. Architecture Overview

Layered, data-driven, ECS-leaning (not strict ECS - hybrid OOP/composition for Phaser ergonomics).

```
+---------------------------------------------------------------+
|                         Presentation                          |
|  Phaser Scenes (Boot, Preload, World, Battle, UI overlays)    |
+---------------------------------------------------------------+
|                         Application                           |
|  GameLoop, SceneRouter, InputManager, AudioManager, SaveMgr   |
+---------------------------------------------------------------+
|                          Systems                              |
|  Combat, Movement, AI, Spawn, Quest, Dialogue, Weather, Time, |
|  Job, Skill, Stat, Inventory, Equipment, Crafting, Loot,      |
|  Master, Reputation, Guild, Economy, World Events, Codex      |
+---------------------------------------------------------------+
|                          Domain                               |
|  Entities (Actor, Player, NPC, Monster, Boss, Projectile),    |
|  Items, Skills, Jobs, Quests, Dialogues, Regions, Maps        |
+---------------------------------------------------------------+
|                           Data                                |
|  ContentRegistry, JSON loaders, Schemas (Zod), Asset Atlases  |
+---------------------------------------------------------------+
|                       Infrastructure                          |
|  Storage (IndexedDB/FS), RNG, EventBus, Logger, Telemetry     |
+---------------------------------------------------------------+
```

Key principles:

- **One-way dependency:** outer layers may depend on inner; never the reverse.
- **EventBus** for cross-system signals (e.g., `monster.killed`, `level.up`, `quest.objective.met`).
- **ContentRegistry** is the single source of truth for definitions; systems never import data files directly.
- **Schemas (Zod)** validate every JSON file at load and throw with file+path on mismatch.
- **Deterministic RNG** per seeded context (combat seed, loot seed, encounter seed).

---

## 3. Folder Structure

```
game/
  AGENTS.md
  README.md
  package.json
  tsconfig.json
  vite.config.ts
  index.html
  docs/
    GDD.md
    TDD.md
    schemas/                  # JSON Schema exports for tooling
    diagrams/                 # generated UML/PlantUML output
  src/
    main.ts                   # Phaser Game bootstrap
    config/
      game.config.ts
      balance.config.ts       # tuneable curves (referenced by data, not hardcoded)
      keybindings.config.ts
    core/
      EventBus.ts
      Logger.ts
      Rng.ts
      Time.ts                 # world clock
      Result.ts               # Result<T,E> helper
      Schema.ts               # Zod helpers
      ServiceLocator.ts
    scenes/
      BootScene.ts
      PreloadScene.ts
      TitleScene.ts
      WorldScene.ts
      BattleHudScene.ts
      MenuScene.ts
      DialogueScene.ts
      MapScene.ts
      DebugScene.ts
    systems/
      combat/
      movement/
      ai/
      spawn/
      quest/
      dialogue/
      weather/
      time/
      job/
      skill/
      stat/
      inventory/
      equipment/
      crafting/
      loot/
      master/
      reputation/
      guild/
      economy/
      worldEvents/
      codex/
      save/
    domain/
      actors/
        Actor.ts
        Player.ts
        Npc.ts
        Monster.ts
        Boss.ts
        Projectile.ts
      items/
      skills/
      jobs/
      quests/
      dialogues/
      regions/
      maps/
    data/
      registry/
        ContentRegistry.ts
        loaders/
          itemsLoader.ts
          skillsLoader.ts
          jobsLoader.ts
          monstersLoader.ts
          bossesLoader.ts
          mapsLoader.ts
          questsLoader.ts
          dialoguesLoader.ts
          npcsLoader.ts
          mastersLoader.ts
          regionsLoader.ts
          lootTablesLoader.ts
          spawnRulesLoader.ts
      schemas/
        item.schema.ts
        skill.schema.ts
        job.schema.ts
        monster.schema.ts
        boss.schema.ts
        map.schema.ts
        quest.schema.ts
        dialogue.schema.ts
        npc.schema.ts
        master.schema.ts
        region.schema.ts
        lootTable.schema.ts
        spawnRule.schema.ts
    ui/
      hud/
      menus/
      widgets/
      theme/
    infra/
      storage/
        SaveStore.ts
        IndexedDbAdapter.ts
        FileAdapter.ts
      assets/
        AtlasManifest.ts
    tests/
      unit/
      integration/
  content/
    items/
      common/
      uncommon/
      rare/
      epic/
      legendary/
      mythic/
      divine/
    skills/
      base/
      advanced/
      hidden/
    jobs/
      base/
      advanced/
      hidden/
    monsters/
      tier1/ ... tier5/
    bosses/
      mid/
      final/
    maps/
      regions/
        beginner_plains/
        green_forest/
        ...
    quests/
      main/
      side/
      hidden/
      guild/
      world_events/
    dialogues/
    npcs/
    masters/
    regions/
    loot_tables/
    spawn_rules/
    locales/
      en/
      ja/
  assets/
    sprites/
      actors/
      monsters/
      bosses/
      tiles/
      vfx/
    atlases/
    audio/
      bgm/
      sfx/
    fonts/
    shaders/
  tools/
    content-validator/        # CLI: validates all JSON against schemas
    content-packer/           # CLI: bundles content+assets into a release pack
    map-importer/             # CLI: TMX -> internal map JSON
    balance-tuner/            # CLI: previews EXP, drop, stat curves
  scripts/
    dev.ps1
    build.ps1
    validate-content.ps1
  .github/
    workflows/
      ci.yml
```

Notes:
- `content/` is data-only. Adding a new monster never touches `src/`.
- `tools/` are runnable Node scripts; CI uses them for validation gates.
- `assets/` is binary art/audio. Versioned via Git LFS once added.

---

## 4. Class Diagrams (textual UML)

### 4.1 Actor hierarchy

```
                +-------------------+
                |     <<abstract>>  |
                |      Actor        |
                +-------------------+
                | id: string        |
                | stats: StatBlock  |
                | status: Status[]  |
                | pos: Vec2         |
                | sprite: Sprite    |
                +-------------------+
                | takeDamage()      |
                | heal()            |
                | applyStatus()     |
                | tick(dt)          |
                +-------------------+
                          ^
        +-----------------+-----------------+----------------+
        |                 |                 |                |
+---------------+ +---------------+ +---------------+ +---------------+
|    Player     | |     Npc       | |    Monster    | |     Boss      |
+---------------+ +---------------+ +---------------+ +---------------+
| job: Job      | | dialogueId    | | familyId      | | phases[]      |
| level         | | scheduleId    | | aiTreeId      | | patternSet    |
| exp           | | shopId?       | | lootTableId   | | arenaId       |
| inventory     | | questHooks[]  | | spawnRuleId   | | cinematics    |
| equipment     | | reactions     | | level         | |               |
| skills[]      | |               | |               | |               |
| flags         | |               | |               | |               |
+---------------+ +---------------+ +---------------+ +---------------+
```

### 4.2 Job/Skill model

```
+----------+        +----------+         +---------+
|   Job    |1------*|   Skill  |*-------1| Element |
+----------+        +----------+         +---------+
| id       |        | id       |
| tier     |        | jobId    |
| baseId   |        | level    |
| advancedOf?      | cost     |
| hidden?  |        | coef     |
| growth   |        | element  |
| skillIds |        | shape    |
+----------+        | effects  |
                    +----------+
```

### 4.3 Quest state machine

```
Quest -> Objective[] -> Condition[] -> Reward[]
       |
       +-> Trigger (reveal, start, complete, fail)
       |
       +-> WorldFlags (read/write)
```

### 4.4 ContentRegistry

```
+------------------------------------------+
|             ContentRegistry              |
+------------------------------------------+
| items: Map<id, Item>                     |
| skills: Map<id, Skill>                   |
| jobs: Map<id, Job>                       |
| monsters: Map<id, Monster>               |
| bosses: Map<id, Boss>                    |
| maps: Map<id, MapDef>                    |
| quests: Map<id, Quest>                   |
| dialogues: Map<id, Dialogue>             |
| npcs: Map<id, NpcDef>                    |
| masters: Map<id, Master>                 |
| regions: Map<id, Region>                 |
| lootTables: Map<id, LootTable>           |
| spawnRules: Map<id, SpawnRule>           |
+------------------------------------------+
| loadAll(): Promise<Result<void, Error>>  |
| get<T>(kind, id): T                      |
| list<T>(kind, filter?): T[]              |
| validate(): ValidationReport             |
+------------------------------------------+
```

---

## 5. Data-Driven Schemas (representative)

All schemas are authored with **Zod** in TS and exported as JSON Schema for editor support.

### 5.1 Item schema (sketch)

```ts
Item = {
  id: string,                // namespaced: "wpn.iron_sword"
  name: { en: string, ja?: string },
  slot: "main"|"off"|"helm"|"chest"|"legs"|"boots"|"gloves"|"cape"|"ring"|"amulet"|"relic"|"artifact"|"consumable"|"material",
  rarity: "common"|"uncommon"|"rare"|"epic"|"legendary"|"mythic"|"divine",
  level: number,
  reqs?: { level?: number, jobs?: string[], stats?: Partial<StatBlock> },
  stats?: Partial<StatBlock>,
  affixes?: AffixRoll[],
  setId?: string,
  tags: string[],
  icon: string,              // atlas key
  description?: string,
  source: "drop"|"craft"|"quest"|"merchant"|"hidden"
}
```

### 5.2 Skill schema (sketch)

```ts
Skill = {
  id: string,
  name: Localized,
  jobId: string,
  unlockLevel: number,
  cost: { mp?: number, hp?: number, stamina?: number, cooldownMs: number },
  power: { coef: number, base: number, scaling: "STR"|"INT"|"DEX"|"VIT"|"AGI"|"LUK" },
  element: "phys"|"fire"|"ice"|"lightning"|"earth"|"holy"|"dark"|"void",
  shape: { kind: "single"|"line"|"cone"|"aoe"|"projectile", ...params },
  effects?: StatusEffect[],
  vfx: string,
  sfx: string
}
```

### 5.3 Monster schema (sketch)

```ts
Monster = {
  id: string,
  family: string,
  tier: 1|2|3|4|5,
  levelRange: [number, number],
  base: StatBlock,
  growth: StatGrowth,
  resistances: Partial<Record<Element, number>>,
  skills: string[],
  aiTreeId: string,
  lootTableId: string,
  spawnRuleId: string,
  size: "S"|"M"|"L"|"XL",
  flags: string[]
}
```

### 5.4 Map schema (sketch)

```ts
MapDef = {
  id: string,
  regionId: string,
  type: "field"|"town"|"dungeon"|"hidden"|"boss_arena",
  tiledRef: string,                 // path to TMX/JSON
  spawnRules: string[],
  hazards?: HazardDef[],
  weatherTable?: string,
  exits: { id: string, to: { mapId: string, marker: string }, conditions?: Condition[] }[],
  music?: string,
  ambient?: string
}
```

### 5.5 Quest schema (sketch)

```ts
Quest = {
  id: string,
  type: "main"|"side"|"hidden"|"guild"|"world_event",
  hidden?: boolean,
  reveal?: Trigger,
  prereqs?: Condition[],
  objectives: Objective[],
  rewards: Reward[],
  flagsOnComplete?: string[],
  failConditions?: Condition[]
}
```

### 5.6 Master schema (sketch)

```ts
Master = {
  id: string,
  name: Localized,
  npcId: string,
  recognition: {
    max: 100,
    triggers: Trigger[]              // each grants delta on satisfied conditions
  },
  rewards: { advancedJobUnlock?: string, hiddenJobHint?: string, masterTechnique?: string }
}
```

All other schemas (Job, Boss, Region, NPC, Dialogue, LootTable, SpawnRule) follow the same pattern.

---

## 6. Save System

- **Format:** JSON, gzip-compressed, base64 wrapper, optional XOR signature
- **Slots:** 8 slots + autosave + quicksave
- **Schema versioning:** `saveVersion: number`. Migrators run in order on load.
- **Storage:**
  - Browser: IndexedDB
  - Tauri/Electron: filesystem under user data dir
  - Single `SaveStore` interface; adapters chosen at runtime.
- **Contents:** player, world flags, world clock, region states, quest states, inventory, equipment, codex, masters, reputations, guild rank, RNG seeds, settings.

---

## 7. Content Pipeline

Goal: add a new job, monster, map, skill, quest, or NPC by adding files only.

### 7.1 Authoring

1. Author drops a JSON file under `content/<kind>/.../foo.json`.
2. Optional sprite assets land in `assets/sprites/...` and are referenced by atlas key.
3. (Maps only) Author exports a `.tmx` from Tiled into `content/maps/regions/.../foo.tmx`.

### 7.2 Validation

- `pnpm content:validate` runs:
  1. JSON Schema validation per file
  2. Cross-reference checks (every `lootTableId` exists, every `aiTreeId` exists, no orphan `mapId` exits)
  3. ID collision check
  4. Locale completeness report
- CI gate: validation must pass for any PR touching `content/`.

### 7.3 Build

- `pnpm content:build` compiles:
  - All JSON into a single `content.bundle.json` (or per-region bundles for streaming)
  - All sprites into atlases (TexturePacker CLI or `free-tex-packer-core`)
  - All TMX maps into runtime JSON via `tools/map-importer`
- Output goes to `dist/content/`.

### 7.4 Runtime

- `ContentRegistry.loadAll()` reads bundles, validates a second time defensively, resolves cross-references into typed objects, and exposes `get`/`list`.
- Hot-reload in dev: watch `content/` and re-emit the bundle.

### 7.5 Adding new things (zero core code)

| To add a...     | Drop file at                                | Reference systems pick it up via                    |
|-----------------|---------------------------------------------|-----------------------------------------------------|
| Job             | `content/jobs/base/foo.json`                | JobSystem reads from registry on player choice      |
| Advanced Job    | `content/jobs/advanced/foo.json`            | JobSystem checks `advancedOf` and triggers          |
| Hidden Job      | `content/jobs/hidden/foo.json`              | QuestSystem flags trigger unlock                    |
| Skill           | `content/skills/<tier>/foo.json`            | SkillSystem references via `jobId`                  |
| Monster         | `content/monsters/tier3/foo.json`           | SpawnSystem reads spawn rules                       |
| Boss            | `content/bosses/mid/foo.json`               | BossSystem mounts arena scene by id                 |
| Map             | `content/maps/regions/.../foo.tmx` + json   | WorldScene loads on `transitionTo(mapId)`           |
| Quest           | `content/quests/<type>/foo.json`            | QuestSystem registers triggers                      |
| NPC             | `content/npcs/foo.json`                     | NpcSystem instantiates per map placement            |
| Master          | `content/masters/foo.json`                  | MasterSystem hooks into recognition triggers        |

---

## 8. Phased Implementation Plan

Each phase ends with a demoable build and a tagged release.

### Phase 0 - Foundations (1-2 weeks)
- Repo init, TS, Vite, Phaser 3, ESLint, Prettier, Vitest
- ServiceLocator, EventBus, Logger, Rng, Time, Schema (Zod), Result
- ContentRegistry skeleton + 1 schema (item) + loader
- BootScene, PreloadScene, TitleScene
- CI: lint + test + content:validate
- Save system stub (in-memory adapter)

### Phase 1 - Core Player Loop (2-3 weeks)
- Player actor, movement, animation states
- StatBlock, derived stats, level-up flow
- BalanceConfig curves wired
- Single test map (Eldermill stub)
- Input manager, gamepad, rebinds
- HUD shell

### Phase 2 - Combat MVP (3 weeks)
- Damage formula, status effects, elements
- Skill execution pipeline (cost, cooldown, shape, effect)
- 2 enemies (Slime, Goblin), basic AI tree
- Loot drops + Inventory
- Equipment slots and modifier stacking

### Phase 3 - World and NPCs (3 weeks)
- Tiled import pipeline
- Beginner Plains region: Eldermill + 2 fields + 1 dungeon
- NPC schedules, dialogues, shops
- World clock, basic day/night
- Quest system + first main quest arc

### Phase 4 - Job System (2-3 weeks)
- Base Jobs with skills and growth
- Job selection at Lv 10
- Skill tree UI
- Codex system (monsters/items)

### Phase 5 - Multi-region World (4-6 weeks)
- Green Forest, Ancient Woods, Swamps, Mountains
- Mid Boss framework + first 2 mid bosses
- Weather system, biome rules
- Guild system + Rank F/E/D content

### Phase 6 - Advanced Jobs and Masters (3-4 weeks)
- Advanced Jobs (all branches)
- Master system (recognition triggers)
- Snow Kingdom + Desert Empire content

### Phase 7 - Endgame Spine (4-6 weeks)
- Volcanic Lands, Forgotten Ruins, Dark Realm
- Hidden Jobs framework
- Hidden quests, hidden zones, time/weather gates
- Mythic/Divine gear pools

### Phase 8 - Demon King (3-4 weeks)
- Demon Territory
- 3-phase Demon King encounter
- Final cinematics, ending variants

### Phase 9 - Post-game and Polish (open-ended)
- New Game+, Eclipse Sovereign thread, superbosses
- Performance pass, accessibility pass, localization expansion
- Mod-friendly content pack loader

---

## 9. Quality Gates

- **Type safety:** strict TS, no `any` in `src/`.
- **Tests:** unit tests on systems (combat math, stat formulas, loot rolls, quest state machines) with seeded RNG. Integration tests for save/load and content validation.
- **Lint:** ESLint with strict ruleset; Prettier for formatting.
- **CI:** lint + typecheck + unit + content:validate on every PR.
- **Performance budget:** 60 FPS at 1080p with 100 active entities; documented and tracked.

---

## 10. Risks and Mitigations

| Risk                                              | Mitigation                                                                 |
|---------------------------------------------------|----------------------------------------------------------------------------|
| Scope creep across 11 regions                     | Phased plan; each phase ships playable; never start phase N+1 until N green |
| Pixel art bottleneck                              | Placeholder atlas + style guide; modular sprite parts (head/body/weapon)    |
| Hidden Job design becoming unfair or untrackable  | All triggers are data; QA harness can force-set flags for testing           |
| Save migrations breaking long-running playthroughs| Versioned saves with migrators and an automated migration test corpus      |
| Web/Desktop parity                                | Single SaveStore + AssetSource interface; CI builds both targets            |

---

## 11. Resolved Decisions and Open Questions

Resolved by the user:

1. **Engine:** Phaser 3 + TypeScript + Vite (confirmed).
2. **Platform priority:** Web first, Windows (via Tauri) second.

Still open (defaults applied unless changed):

3. **Combat style:** real-time action (default per GDD).
4. **Multiplayer:** single-player only for v1 (default per AGENTS.md).
5. **Art:** placeholder pixel atlases until a finalized style guide lands.
6. **Localization:** English-only for v1 with i18n hooks; Indonesian/Japanese/Chinese planned.
7. **Save target:** browser (IndexedDB) first; desktop FS adapter follows the Tauri wrap.

Phase 0 implementation proceeds under these defaults.
