# Game Design Document (GDD)

**Project codename:** Aetheris (working title)
**Genre:** 2D Pixel Medieval Fantasy Action RPG
**Perspective:** Top-down (slight 3/4 angle for tall sprites)
**Engine:** Phaser 3 (TypeScript, strict mode) on Vite
**Primary target:** Web (modern desktop browsers, served from a static site)
**Secondary target:** Windows desktop (Steam) via Tauri wrapper around the same web build
**Tertiary targets:** Linux desktop, macOS desktop (Tauri); the architecture must not block them
**Future targets:** Android, iOS (mobile-friendly input later; not in v1 scope)
**Players:** Single-player only for v1
**Source spec:** `AGENTS.md` (primary)

---

## 1. Vision Statement

Aetheris is a long-form, exploration-driven pixel RPG where a powerless protagonist rises from a destroyed village to confront the Demon King. The game rewards curiosity: hidden masters, hidden jobs, secret regions, and missable lore reward players who pay attention. Mechanics are deep but data-driven, so the world can grow indefinitely through content packs, not engine rewrites.

Three pillars:

1. **Earned power.** Progression is slow, deliberate, and meaningful. Levels, jobs, and skills feel like milestones.
2. **Hidden depth.** Most powerful content (Hidden Jobs, Masters, Secret Regions, Mythic gear) is undiscoverable through menus. Players find it by playing.
3. **Living world.** NPCs follow schedules, weather and day/night affect spawns and quests, regions react to story progression.

---

## 2. Core Loop

```
Explore -> Encounter -> Combat -> Loot/EXP -> Upgrade (stats/gear/skills) -> Quest/Story -> New region/job -> Explore
```

Secondary loops:

- **Crafting/economy loop** (gather -> sell/craft -> upgrade gear)
- **Mastery loop** (find Master -> earn recognition -> unlock advanced/hidden path)
- **Guild loop** (Guild Quests -> Rank up F -> SSS -> unlock Rank-gated content)

---

## 3. Story Outline

### Act I: Ash and Embers (Lv 1-15)
The protagonist is the unremarkable child of a Beginner Plains village. A monster horde, led by a Death Knight scout, razes the village. The protagonist survives by hiding. They are found by a wandering Adventurer who escorts them to **Eldermill**, the nearest town, where they register at the Adventurer Guild at Rank F.

### Act II: First Steps (Lv 15-35)
Travel through Green Forest and Ancient Woods. Choose a Job at Lv 10. Investigate why monsters are organized. Encounter the first Mid Boss: **Orc Warlord**.

### Act III: The Five Kingdoms (Lv 35-80)
The world opens. Visit Snow Kingdom (Frosthold), Desert Empire (Sahir), Swamp confederacy. Each kingdom has a regional storyline and a Mid Boss. Hints of "the old war" appear. First Master encounters become possible.

### Act IV: The Sealed Truth (Lv 80-130)
Volcanic Lands and Forgotten Ruins. Ancient civilization revealed. Players begin earning Advanced Jobs (Lv 50 baseline, earlier via Masters). Mid Bosses: Ancient Dragon, Lich Emperor.

### Act V: Descent (Lv 130-180)
Dark Realm. Allies fall. The forgotten gods are revealed as fractured. Hidden Jobs become attainable for players who have followed the right threads.

### Act VI: The Demon King (Lv 180-200+)
Demon Territory. The three-phase Demon King encounter. Post-game opens: superbosses, Mythic dungeons, New Game+ with Eclipse Sovereign endgame thread.

---

## 4. World Design

### 4.1 Region Tiers

| Tier | Region              | Lv Range | Capital/Hub      | Mid Boss              |
|------|---------------------|----------|------------------|------------------------|
| 1    | Beginner Plains     | 1-10     | Eldermill        | Goblin Chieftain       |
| 2    | Green Forest        | 10-20    | Foxglen          | Treant Elder           |
| 3    | Ancient Woods       | 20-35    | Whisperhold      | Orc Warlord            |
| 4    | Swamps              | 30-50    | Mireford         | Hydra Queen            |
| 5    | Mountain Ranges     | 45-65    | Ironcrag         | Stone Titan            |
| 6    | Snow Kingdom        | 55-80    | Frosthold        | Frost Wyrm             |
| 7    | Desert Empire       | 65-95    | Sahir            | Anubis                 |
| 8    | Volcanic Lands      | 90-120   | Emberreach       | Ancient Dragon         |
| 9    | Forgotten Ruins     | 110-145  | The Veiled Gate  | Lich Emperor           |
| 10   | Dark Realm          | 140-175  | (no safe hub)    | Death Knight King      |
| 11   | Demon Territory     | 175-200  | (no safe hub)    | Demon King (3 phases)  |
| ?    | Eclipse (hidden)    | 200+     | unknown          | Eclipse Sovereign      |

### 4.2 World Map Structure

Each Region contains:

- **1-3 Hub settlements** (city/town/village) with Inn, Guild branch, Merchant, Blacksmith, Quest Board
- **3-6 Field maps** (overworld zones with monster spawns, gathering nodes, hidden encounters)
- **2-5 Dungeons** (instanced, themed, mini-boss + boss)
- **1 Mid Boss arena** (regional climax)
- **0-2 Hidden sub-zones** (require specific item/quest/Master/time-of-day to enter)
- **Travel nodes** (roads, ferry, teleport stones unlocked progressively)

### 4.3 Settlement Detail (representative)

**Eldermill (Beginner Plains hub)**
- Adventurer Guild branch (Rank F intake)
- Jonas the Innkeeper, Marn the Merchant, Old Brann the Blacksmith
- Quest Givers: Mayor Talvin (main quest), Old Widow Hesta (side), unnamed cloaked figure (hidden quest)
- Schedules: Marn opens 7-19, Brann opens 8-20, NPCs sleep 22-6

---

## 5. Character System

### 5.1 Base Attributes
- **HP** (vit-driven), **MP** (int-driven)
- **STR** -> physical attack, carry weight
- **VIT** -> max HP, physical defense
- **AGI** -> turn order, evasion, move speed
- **DEX** -> hit rate, ranged damage, crit rate
- **INT** -> magic attack, max MP, magic defense
- **LUK** -> crit chance, rare drops, hidden encounter rate

### 5.2 Derived Stats
ATK, MATK, DEF, MDEF, ACC, EVA, CRIT%, CRITDMG, SPD. All derived stats are computed from a single formula table (data-driven), never hardcoded.

### 5.3 Stat Allocation
- +5 free points per level
- +1 bonus point every 5 levels
- Job and Equipment grant flat/percent modifiers stacking via a typed modifier system (Flat -> %Add -> %Mult).

---

## 6. Combat System

**Mode:** Real-time action combat. Reference touchstones: CrossCode, Ragnarok Online (action feel), modern indie ARPGs (Hyper Light Drifter, Tunic). Hitboxes use Phaser 3 `Arcade.Body` with sub-pixel offsets aligned to a tile grid for spawn logic.

### 6.1 Player Action Kit

- **Light attack combo** - 3-hit chain (`A1 -> A2 -> A3`) with progressive damage, with the final hit producing extra knockback or stagger. Combo timing window is data-driven.
- **Heavy attack** - hold input; consumes Stamina; armor-piercing or stagger-heavy depending on weapon type.
- **Dodge / roll** - i-frames during a configurable window; consumes Stamina; cancel-out of attack recovery.
- **Block / parry** (weapon-dependent) - perfect parry returns posture damage and opens a riposte window.
- **Active skills** - up to 4 equipped at once on hotkeys, each with cooldown, MP/Stamina cost, and shape (single, line, cone, AoE, projectile, trap, summon).
- **Ultimate** - charges via damage dealt/taken; one slot, long cooldown, dramatic VFX.
- **Movement skills** - dashes, blinks, hookshots, mounts (all data-driven items/skills).

### 6.2 Resources

- **HP** (lethal), **MP** (skill costs), **Stamina** (dodge, sprint, heavy attack, block).
- Stamina regenerates passively when not attacking; MP regenerates slowly out of combat or via items/skills.

### 6.3 Pillars

- **Telegraphs** - every dangerous attack is readable (windup animation + ground decal where appropriate).
- **Poise and stagger** - large enemies and bosses have a poise bar; depleting it triggers a stagger window.
- **Status effects** - Burn, Freeze, Shock, Poison, Bleed, Curse, Silence, Stun, Slow, Root, Sleep.
- **Hitstop and screen feedback** - configurable hitstop frames, screen shake, hit flash; all togglable for accessibility.
- **Aggro** - threat table per enemy; taunts, stealth, line-of-sight rules.
- **Elements** - Physical, Fire, Ice, Lightning, Earth, Holy, Dark, Void (Hidden). Resistance/weakness chart is data-driven.

### 6.4 Damage formula (data-driven)

```
base   = ATK * skillCoef - DEF * defCoef
base  *= 1 + sum(%Add) + element_modifier
base  *= product(%Mult)
if crit: base *= CRITDMG
base  *= status_modifiers
damage = clamp(base, 1, +inf)
```

All coefficients live in `content/balance/` JSON files; tuning never touches engine code.

### 6.5 Boss Mechanics

- Multi-phase fights with HP-threshold transitions and arena state changes (hazards, adds, lighting).
- Pattern set per phase: deterministic openers + stochastic mid-phase + scripted enrage.
- Mechanics include zone denials, projectile barrages, summon waves, environmental traps, and unique counter-windows (perfect parry, exposed core, status break).
- Cinematic intros/outros are optional hooks defined in the boss data file.

---

## 7. Leveling System

- **Cap:** 200 (post-game raises soft cap with prestige/awakening)
- **Curve:** `EXP(L) = floor(50 * L^2.4 + 100 * L)` (final values tuned in CSV; formula is data-driven)
- **Sources:** monsters, bosses, quests, exploration first-discovery, codex completion, hidden discoveries
- **Rested EXP** when sleeping at inns
- **Penalty on death:** small EXP loss past Lv 30; 0% in Beginner Plains

---

## 8. Job System

### 8.1 Base Jobs (unlock Lv 10)
Warrior, Knight, Mage, Priest, Archer, Assassin, Berserker, Paladin, Summoner, Necromancer.

Each base job ships:
- 1 starter skill, 1 passive
- 8-12 skills unlocked across Lv 10-50
- Distinct stat growth multipliers
- Job-specific equipment proficiencies

### 8.2 Advanced Jobs (unlock Lv 50, OR via Master)
Each base job has 2-3 advanced branches. Choice is permanent per save (respec is a rare consumable).

| Base        | Advanced Options                                  |
|-------------|---------------------------------------------------|
| Warrior     | Sword Saint, Warlord, Dragon Slayer               |
| Knight      | Templar, Black Knight, Rune Knight                |
| Mage        | Archmage, Elemental Lord, Time Weaver             |
| Priest      | Bishop, Inquisitor, Oracle                        |
| Archer      | Wind Ranger, Sniper King, Beast Hunter            |
| Assassin    | Shadow Monarch*, Phantom Reaper, Night Lord       |
| Berserker   | Bloodlord, Titanbreaker, Frenzy Saint             |
| Paladin     | Crusader, Holy Sentinel, Divine Vanguard          |
| Summoner    | Beastmaster, Spirit Caller, Pact Keeper           |
| Necromancer | Death Lord, Soul Reaper, Bone King                |

(*Shadow Monarch is intentionally adjacent to a Hidden Job; design is allowed to overlap thematically.)

### 8.3 Hidden Jobs (Lv 50+, secret only)

| Hidden Job         | Theme              | Acquisition pattern (example, undocumented in-game) |
|--------------------|--------------------|------------------------------------------------------|
| Void Monarch       | Anti-magic, gravity| Complete Forgotten Ruins lore chain + defeat a Master |
| Dragon Emperor     | Draconic command   | Slay one of each dragon type + present Dragon Heart  |
| Abyss Walker       | Curse, lifesteal   | Survive Dark Realm without resting at any waypoint   |
| Celestial Tyrant   | Divine wrath       | Earn 4 god-favor reputations + perform Solar Eclipse rite |
| Ancient One        | Time, primordial   | Find all 7 Forgotten Stelae                          |
| Eclipse Sovereign  | Endgame apex       | New Game+ exclusive thread                           |

Rules:
- Never displayed in UI before unlock.
- Cannot evolve into Advanced Jobs (they are terminal).
- Trigger by `Trigger` records in data, evaluated by the Quest/Flag system.

---

## 9. Master / Teacher System

Masters are unique NPCs scattered across the world. Each Master:

- Has a `recognition` score (0-100)
- Has a recognition recipe (defeat condition, item gift, dialogue path, secret quest, time/weather constraint)
- When recognition reaches 100, can grant either:
  - Early Advanced Job unlock (bypassing Lv 50)
  - A Master-exclusive technique
  - A pointer toward a Hidden Job

Examples:
- **Sword Saint Yumio** - Snow Kingdom, recognition via dueling without using shields
- **Ancient Archmage Velis** - Forgotten Ruins, recognition via solving 4 elemental puzzles
- **Shadow Elder Kein** - Mireford rooftops 02:00-04:00 only
- **Divine Saint Auria** - Frosthold cathedral, recognition only after a paladin betrayal sidequest

---

## 10. NPC System

- Each NPC has: personality (data), schedule (data), dialogue tree (data), quest hooks (data), reaction table (data).
- World state flags (`flags.json`) drive reactions: e.g. `village.eldermill.burned = true` changes greetings everywhere.
- Schedules tick on world clock (1 in-game hour ~ 60 real seconds, configurable).

---

## 11. Monster System

Each monster definition includes:
- ID, family, tier, level range
- Base stats (per level via formula)
- Skillset, AI behavior tree ID
- Element + status resistances
- Loot table (weighted, with Mythic Find gated by LUK)
- Spawn rules: regions, biomes, time-of-day, weather, density, max active per zone

Sample families: Slime, Goblin, Wolf, Skeleton, Orc, Ogre, Minotaur, Wyvern, Dragon, Hydra, Titan, Chimera, Fallen Angel, Demon.

---

## 12. Boss System

Boss definitions add to monster definition:
- Phases (HP thresholds)
- Patterns per phase (deterministic + stochastic mix)
- Arena hazards
- Cinematic intro/outro hooks
- Unique drop guaranteed

The Demon King uses 3 phase records with shared boss ID and unique Stage IDs.

---

## 13. Equipment System

- Slots: Main Hand, Off Hand, Helm, Chest, Legs, Boots, Gloves, Cape, 2x Ring, Amulet, Relic, Artifact
- Rarities: Common, Uncommon, Rare, Epic, Legendary, Mythic, Divine
- Affix system: prefix + suffix rolls (rarity-gated pools), enchantments, sockets, gems
- Set bonuses (data-driven)
- Durability optional (config flag - off by default in current scope)

---

## 14. Quest System

- Types: Main, Side, Hidden, Guild, World Event
- Quests are state machines defined in JSON (objectives -> conditions -> rewards)
- Hidden quests do not appear in the journal until a `reveal` condition fires
- Choices set world flags consumed by NPC reactions, future quests, and ending variants

---

## 15. Guild System

- Ranks F, E, D, C, B, A, S, SS, SSS
- Each rank-up requires N completed Guild Quests + 1 Rank Trial
- Higher ranks gate exclusive contracts, dungeons, and merchants

---

## 16. Economy

- Gold (common), Soul Shards (boss currency), Ancient Marks (hidden zones), Divine Tokens (post-game)
- Merchants have stock rotation by day, reputation discounts, rare-stock-by-weather rules.

---

## 17. Progression Roadmap (Lv 1-200)

| Phase    | Levels   | Player Goals                                 | World gates opened              |
|----------|----------|----------------------------------------------|---------------------------------|
| Awakening| 1-10     | Survive, reach Eldermill, choose Base Job    | Beginner Plains, Eldermill      |
| Apprentice| 10-25   | First dungeon, Guild Rank E                  | Green Forest                    |
| Wanderer | 25-45    | Cross-region travel, Guild Rank D            | Ancient Woods, Swamps           |
| Veteran  | 45-65    | Advanced Job unlock window opens (Masters)   | Mountains                       |
| Expert   | 65-90    | Choose Advanced Job at 50; multi-region arcs | Snow Kingdom, Desert Empire     |
| Master   | 90-120   | First Mythic gear, Guild Rank A              | Volcanic Lands                  |
| Sage     | 120-145  | Forgotten Ruins arc                          | Forgotten Ruins                 |
| Legend   | 145-175  | Hidden Job possible; Guild Rank S            | Dark Realm                      |
| Mythic   | 175-200  | Demon King prep, Mythic dungeons             | Demon Territory                 |
| Endgame  | 200+     | Phase 3+, NG+, Eclipse Sovereign thread      | Eclipse                         |

---

## 18. Difficulty and Pacing

- Three difficulty modes: Story, Adventurer (default), Legend
- Difficulty affects monster stats, drop quality, status resistance - not content gating.
- Boss fights have adaptive checkpoints in Story mode only.

---

## 19. Accessibility and Localization

Accessibility:
- Remappable controls; gamepad first-class (Xbox/PlayStation/generic)
- Colorblind-safe element icons (shape + color, never color alone)
- Toggles: screen shake, flash, hitstop, large UI, dyslexia font
- Subtitle and dialogue speed controls
- Hold-to-confirm option for destructive actions

Localization:
- All in-game text is externalized; no string literals in scripts.
- v1 ships English only.
- Planned languages: **Indonesian, Japanese, Chinese (Simplified)**.
- Translation files use a JSON dictionary format under `content/locales/<lang>/`.
- Locale Manager handles font fallbacks (CJK font set), pluralization, and right-to-left readiness.
- Every new content file must include a `name` and any user-visible strings as locale keys, never raw strings.
