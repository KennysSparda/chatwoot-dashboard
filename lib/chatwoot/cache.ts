// Interface simples para o Cache
export interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class ChatwootService {
  // Map simples em memória para guardar respostas temporárias
  private static cache = new Map<string, CacheEntry<any>>();

  protected getFromCache<T>(key: string): T | null {
    const entry = ChatwootService.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      ChatwootService.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  protected setCache<T>(key: string, data: T, ttlSeconds: number): void {
    ChatwootService.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }
}
