interface UnauthorizedEvent {
  endpoint: string;
  status: number;
}

type UnauthorizedListener = (event: UnauthorizedEvent) => void;

const unauthorizedListeners = new Set<UnauthorizedListener>();

export function subscribeToUnauthorized(listener: UnauthorizedListener) {
  unauthorizedListeners.add(listener);

  return () => {
    unauthorizedListeners.delete(listener);
  };
}

export function notifyUnauthorized(event: UnauthorizedEvent) {
  unauthorizedListeners.forEach((listener) => {
    listener(event);
  });
}
