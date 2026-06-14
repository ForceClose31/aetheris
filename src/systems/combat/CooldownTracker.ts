/**
 * PlayerCooldowns - small helper that the SkillExecutor and HUD share.
 *
 * Lives outside the Player domain object because cooldowns are a runtime concern
 * (per-session), not a stat. Persistence later would just snapshot remaining ms.
 */

export class CooldownTracker {
  private readonly map = new Map<string, number>();

  isOnCooldown(skillId: string): boolean {
    return (this.map.get(skillId) ?? 0) > 0;
  }
  remaining(skillId: string): number {
    return this.map.get(skillId) ?? 0;
  }
  startCooldown(skillId: string, ms: number): void {
    if (ms > 0) {
      this.map.set(skillId, ms);
    }
  }
  update(deltaMs: number): void {
    if (this.map.size === 0) {
      return;
    }
    for (const [k, v] of this.map) {
      const next = v - deltaMs;
      if (next <= 0) {
        this.map.delete(k);
      } else {
        this.map.set(k, next);
      }
    }
  }
  clear(): void {
    this.map.clear();
  }
  entries(): { skillId: string; remainingMs: number }[] {
    return [...this.map.entries()].map(([skillId, remainingMs]) => ({ skillId, remainingMs }));
  }
}
