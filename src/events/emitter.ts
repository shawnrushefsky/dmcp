import type { Response } from "express";

export interface GameEvent {
  type: string;
  gameId: string;
  entityId?: string;
  entityType?: string;
  timestamp: string;
  data?: unknown;
}

type SSEClient = Response;

class GameEventEmitter {
  private clients: Map<string, Set<SSEClient>> = new Map();
  private keepAliveIntervals: Map<SSEClient, NodeJS.Timeout> = new Map();

  subscribe(gameId: string, res: SSEClient): void {
    if (!this.clients.has(gameId)) {
      this.clients.set(gameId, new Set());
    }
    this.clients.get(gameId)!.add(res);

    // Send initial connection event
    this.sendToClient(res, {
      type: "connected",
      gameId,
      timestamp: new Date().toISOString(),
    });

    // Set up keep-alive ping every 30 seconds
    const interval = setInterval(() => {
      this.sendToClient(res, {
        type: "ping",
        gameId,
        timestamp: new Date().toISOString(),
      });
    }, 30000);
    this.keepAliveIntervals.set(res, interval);
  }

  unsubscribe(gameId: string, res: SSEClient): void {
    const gameClients = this.clients.get(gameId);
    if (gameClients) {
      gameClients.delete(res);
      if (gameClients.size === 0) {
        this.clients.delete(gameId);
      }
    }

    // Clear keep-alive interval
    const interval = this.keepAliveIntervals.get(res);
    if (interval) {
      clearInterval(interval);
      this.keepAliveIntervals.delete(res);
    }
  }

  emit(event: GameEvent): void {
    const gameClients = this.clients.get(event.gameId);
    if (!gameClients || gameClients.size === 0) {
      return;
    }

    for (const client of gameClients) {
      this.sendToClient(client, event);
    }
  }

  private sendToClient(client: SSEClient, event: GameEvent): void {
    try {
      client.write(`data: ${JSON.stringify(event)}\n\n`);
    } catch {
      // Client disconnected, will be cleaned up on close event
    }
  }

  getClientCount(gameId: string): number {
    return this.clients.get(gameId)?.size ?? 0;
  }

  getTotalClientCount(): number {
    let total = 0;
    for (const clients of this.clients.values()) {
      total += clients.size;
    }
    return total;
  }
}

// Singleton instance
export const gameEvents = new GameEventEmitter();
