export class EventBus extends EventTarget {
  emit(event, data) {
    this.dispatchEvent(new CustomEvent(event, { detail: data }));
  }

  on(event, callback) {
    this.addEventListener(event, callback);
  }
}

// Singleton instance
export const eventBus = new EventBus();