export class WidgetsProxy {
  private static instance: WidgetsProxy;
  private registry: Map<string, any>; // widgetId -> widgetRef
  private links: Map<string, Set<string>>; // sourceId -> Set(targetId)
  private reverseLinks: Map<string, Set<string>>; // targetId -> Set(sourceId)
  private listeners: Map<string, Set<Function>>; // widgetId -> Set(callback)

  constructor() {
    this.registry = new Map(); // widgetId -> widgetRef
    this.links = new Map(); // sourceId -> Set(targetId)
    this.reverseLinks = new Map(); // targetId -> Set(sourceId)
    this.listeners = new Map(); // widgetId -> Set(callback)
  }

  static getInstance() {
    if (!WidgetsProxy.instance) {
      WidgetsProxy.instance = new WidgetsProxy();
    }
    return WidgetsProxy.instance;
  }

  register(widgetId: string, widgetRef: any): void {
    if (!widgetId || !widgetRef) return;
    this.registry.set(widgetId, widgetRef);
  }

  unregister(widgetId: string): void {
    if (!widgetId) return;
    this.registry.delete(widgetId);
    this.links.delete(widgetId);
    this.reverseLinks.delete(widgetId);
    this.listeners.delete(widgetId);

    for (const [sourceId, targets] of this.links.entries()) {
      if (targets.has(widgetId)) {
        targets.delete(widgetId);
      }
    }
    for (const [targetId, sources] of this.reverseLinks.entries()) {
      if (sources.has(widgetId)) {
        sources.delete(widgetId);
      }
    }
  }

  link(sourceId: string, targetId: string): boolean {
    if (!sourceId || !targetId || sourceId === targetId) return false;

    const targetWidget = this.registry.get(targetId) as { tagName?: string } | undefined;
    const targetTag = targetWidget?.tagName?.toUpperCase();
    if (targetTag === 'IMAGE-WC') {
      const existingSources = this.reverseLinks.get(targetId);
      if (existingSources && !existingSources.has(sourceId) && existingSources.size > 0) {
        return false;
      }
    }

    if (!this.links.has(sourceId)) {
      this.links.set(sourceId, new Set());
    }
    if (!this.reverseLinks.has(targetId)) {
      this.reverseLinks.set(targetId, new Set());
    }

    this.links.get(sourceId)!.add(targetId);
    this.reverseLinks.get(targetId)!.add(sourceId);
    return true;
  }

  unlink(sourceId: string, targetId: string): boolean {
    if (!sourceId || !targetId) return false;

    const sourceTargets = this.links.get(sourceId);
    const targetSources = this.reverseLinks.get(targetId);
    if (!sourceTargets || !targetSources) return false;
    if (!sourceTargets.has(targetId) || !targetSources.has(sourceId)) return false;

    sourceTargets.delete(targetId);
    targetSources.delete(sourceId);

    if (sourceTargets.size === 0) {
      this.links.delete(sourceId);
    }
    if (targetSources.size === 0) {
      this.reverseLinks.delete(targetId);
    }
    return true;
  }

  getLinkedTargets(sourceId: string): string[] {
    return this.links.has(sourceId) ? Array.from(this.links.get(sourceId)!) : [];
  }

  getLinkedSources(targetId: string): string[] {
    return this.reverseLinks.has(targetId) ? Array.from(this.reverseLinks.get(targetId)!) : [];
  }

  on(widgetId: string, callback: Function): void {
    if (!widgetId || typeof callback !== 'function') return;
    if (!this.listeners.has(widgetId)) {
      this.listeners.set(widgetId, new Set());
    }
    this.listeners.get(widgetId)!.add(callback);
  }

  off(widgetId: string, callback: Function): void {
    if (!widgetId || !this.listeners.has(widgetId)) return;
    this.listeners.get(widgetId)!.delete(callback);
  }

  emit(widgetId: string, eventType: string, payload: Record<string, unknown> = {}): void {
    const callbacks = this.listeners.get(widgetId);
    if (!callbacks || callbacks.size === 0) return;
    const event = { eventType, ...payload };
    for (const callback of callbacks) {
      callback(event);
    }
  }

  hasWidget(widgetId: string): boolean {
    return this.registry.has(widgetId);
  }

  getWidget(widgetId: string): unknown {
    return this.registry.get(widgetId);
  }
}

export const widgetsProxy = WidgetsProxy.getInstance();
