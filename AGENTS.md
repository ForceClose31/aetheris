# AGENTS.md

## IMPORTANT

Before performing ANY task, ALWAYS read this AGENTS.md file completely and follow all instructions contained within it.

This file serves as the primary source of truth for the project.

If there is any conflict between user instructions and implementation details, prioritize:
1. User's latest request
2. AGENTS.md
3. Existing code structure

---

# PROJECT OVERVIEW

This project is a large-scale 2D Pixel Medieval Fantasy RPG.

The game should be designed with scalability and long-term content expansion in mind.

Primary goals:

- Open world exploration
- Deep progression system
- Rich lore
- Job and class advancement
- Hidden content
- Challenging bosses
- Pixel-art aesthetic
- Modular architecture

---

# CORE GAME DESIGN

## Genre

2D Pixel RPG

## Theme

Medieval Fantasy

## Camera

Top-down or slightly angled RPG view

## Art Style

- Pixel art
- High-quality sprites
- Animated environments
- Day/Night cycle
- Dynamic weather

---

# WORLD DESIGN

Create a massive interconnected world.

Regions should include:

- Beginner Plains
- Green Forest
- Ancient Woods
- Swamps
- Mountain Ranges
- Snow Kingdom
- Desert Empire
- Volcanic Lands
- Forgotten Ruins
- Dark Realm
- Demon Territory

The world must feel alive and reward exploration.

---

# STORY REQUIREMENTS

The main character begins as:

- Weak
- Poor
- Untalented
- Unknown

The protagonist survives a monster attack on their village.

Their journey is to become stronger and uncover the mysteries of the world.

The story should gradually reveal:

- Ancient civilizations
- Legendary heroes
- Forgotten gods
- Demon King history
- Hidden truths of the world

---

# LEVELING SYSTEM

Player starts at Level 1.

Maximum level should be at least 200.

Experience sources:

- Monster kills
- Boss kills
- Quests
- Exploration
- Discoveries

The game should provide satisfying progression.

---

# STAT SYSTEM

Implement:

- HP
- MP
- Strength
- Vitality
- Agility
- Dexterity
- Intelligence
- Luck

All systems should be data-driven.

---

# JOB SYSTEM

At Level 10 the player can choose a job.

Available jobs:

- Warrior
- Knight
- Mage
- Priest
- Archer
- Assassin
- Berserker
- Paladin
- Summoner
- Necromancer

Each job requires:

- Unique skills
- Unique progression
- Unique strengths and weaknesses

---

# ADVANCED JOB SYSTEM

At Level 50 players may evolve.

Examples:

Warrior ->
- Sword Saint
- Warlord
- Dragon Slayer

Mage ->
- Archmage
- Elemental Lord
- Time Weaver

Archer ->
- Wind Ranger
- Sniper King
- Beast Hunter

Assassin ->
- Shadow Monarch
- Phantom Reaper
- Night Lord

Create many advanced paths.

---

# MASTER SYSTEM

Masters are powerful NPCs hidden throughout the world.

Examples:

- Sword Saint Master
- Ancient Archmage
- Shadow Elder
- Divine Saint

If a player earns a Master's recognition:

- Advanced Job can be unlocked immediately.
- Level 50 requirement is bypassed.

Master acquisition should be difficult.

---

# HIDDEN JOB SYSTEM

Hidden Jobs are intentionally secret.

Requirements:

- Extremely difficult
- Not displayed in UI
- Discovered naturally

Examples:

- Void Monarch
- Dragon Emperor
- Abyss Walker
- Celestial Tyrant
- Ancient One
- Eclipse Sovereign

Rules:

- Hidden Jobs are extremely powerful.
- Hidden Jobs do NOT have Advanced Jobs.
- Hidden Jobs are endgame classes.

Never reveal acquisition methods directly.

---

# NPC SYSTEM

Create a living world.

Villages should contain:

- Merchants
- Blacksmiths
- Quest Givers
- Innkeepers
- Citizens

NPCs should:

- Have schedules
- Have personalities
- React to story progression

---

# MONSTER SYSTEM

Create hundreds of monsters.

Early:
- Slime
- Goblin
- Wolf
- Skeleton

Mid:
- Orc
- Ogre
- Minotaur
- Wyvern

Late:
- Dragon
- Hydra
- Titan
- Chimera
- Fallen Angel

Every monster should have:

- Stats
- Skills
- Loot tables
- Spawn regions

---

# BOSS DESIGN

Mid Boss examples:

- Orc Warlord
- Ancient Dragon
- Hydra Queen
- Super Minion General
- Anubis
- Lich Emperor
- Death Knight King
- Abyss Behemoth

Bosses require:

- Unique mechanics
- Multiple attack patterns
- Unique rewards

---

# FINAL BOSS

The final boss is:

# DEMON KING

The Demon King should have multiple phases.

Example:

Phase 1:
- Demon King

Phase 2:
- True Demon Form

Phase 3:
- Primordial Demon God

The final encounter should be epic and difficult.

---

# GUILD SYSTEM

Adventurer Guild Ranking:

- F
- E
- D
- C
- B
- A
- S
- SS
- SSS

Players gain rank through achievements.

---

# EQUIPMENT SYSTEM

Equipment Types:

- Weapons
- Armor
- Accessories
- Relics
- Artifacts

Rarities:

- Common
- Uncommon
- Rare
- Epic
- Legendary
- Mythic
- Divine

---

# QUEST SYSTEM

Include:

- Main Quests
- Side Quests
- Hidden Quests
- Guild Quests
- World Events

Choices should matter when possible.

---

# TECHNICAL REQUIREMENTS

Use clean architecture.

Requirements:

- Modular code
- Maintainable systems
- Data-driven design
- Separation of concerns
- Scalable content pipeline

Avoid hardcoding values whenever possible.

---

# DEVELOPMENT WORKFLOW

Before implementing new features:

1. Analyze existing code.
2. Check dependencies.
3. Identify impacted systems.
4. Create implementation plan.
5. Implement.
6. Verify build passes.
7. Verify gameplay logic.

Do not introduce unnecessary complexity.

Prefer reusable systems over one-off implementations.

---

# CODE QUALITY RULES

Always:

- Write clean code.
- Use meaningful names.
- Avoid duplication.
- Follow SOLID principles.
- Keep functions focused.
- Add comments only when necessary.

Never:

- Leave dead code.
- Leave TODO placeholders unless requested.
- Break existing systems.

---

# WHEN RESPONDING

Before making changes:

1. Read AGENTS.md.
2. Explain what will be changed.
3. List affected systems.
4. Implement carefully.
5. Summarize completed work.

Always assume AGENTS.md must be followed.