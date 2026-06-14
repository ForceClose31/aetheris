/**
 * ServiceLocator - a simple, typed locator for cross-cutting services.
 *
 * Used sparingly. Most modules should receive their dependencies explicitly. The locator
 * is for the few singletons that systems share (EventBus, Logger root, ContentRegistry).
 */

export class ServiceLocator {
  private readonly services = new Map<symbol, unknown>();

  register<T>(token: ServiceToken<T>, instance: T): void {
    if (this.services.has(token.symbol)) {
      throw new Error(`ServiceLocator: token "${token.name}" already registered`);
    }
    this.services.set(token.symbol, instance);
  }

  replace<T>(token: ServiceToken<T>, instance: T): void {
    this.services.set(token.symbol, instance);
  }

  get<T>(token: ServiceToken<T>): T {
    const v = this.services.get(token.symbol);
    if (v === undefined) {
      throw new Error(`ServiceLocator: token "${token.name}" not registered`);
    }
    return v as T;
  }

  has<T>(token: ServiceToken<T>): boolean {
    return this.services.has(token.symbol);
  }

  unregister<T>(token: ServiceToken<T>): void {
    this.services.delete(token.symbol);
  }

  clear(): void {
    this.services.clear();
  }
}

export interface ServiceToken<_T> {
  readonly name: string;
  readonly symbol: symbol;
}

export const createToken = <T>(name: string): ServiceToken<T> => ({
  name,
  symbol: Symbol(name),
});

let rootLocator: ServiceLocator | null = null;

export const getRootLocator = (): ServiceLocator => {
  if (rootLocator === null) {
    rootLocator = new ServiceLocator();
  }
  return rootLocator;
};

export const resetRootLocator = (): void => {
  rootLocator = new ServiceLocator();
};
