/** headers()/cookies() do Next na página publicada. */
export async function headers() {
  return new Headers({ origin: window.location.origin, host: window.location.host, "x-forwarded-proto": window.location.protocol.replace(":", "") });
}

export async function cookies() {
  const jar = new Map<string, string>();
  return {
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
    getAll: () => [...jar].map(([name, value]) => ({ name, value })),
    set: (name: string, value: string) => void jar.set(name, value),
    delete: (name: string) => void jar.delete(name),
    has: (name: string) => jar.has(name),
  };
}
