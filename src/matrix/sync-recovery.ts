import { MatrixClient, ClientEvent, SyncState } from "matrix-js-sdk";

/**
 * Sync recovery manager with exponential backoff.
 * Handles connection drops and automatic reconnection.
 */
export class SyncRecovery {
  private client: MatrixClient;
  private retryCount = 0;
  private maxRetries = 10;
  private baseDelay = 1000; // 1 second
  private maxDelay = 30000; // 30 seconds
  private isRecovering = false;
  private onStatusChange?: (status: string) => void;

  constructor(client: MatrixClient, onStatusChange?: (status: string) => void) {
    this.client = client;
    this.onStatusChange = onStatusChange;
    this.setupListeners();
  }

  private setupListeners() {
    this.client.on(ClientEvent.Sync as any, (state: SyncState) => {
      if (state === SyncState.Error) {
        this.handleSyncError();
      } else if (state === SyncState.Syncing) {
        // Successfully synced, reset retry counter
        this.retryCount = 0;
        this.isRecovering = false;
        this.onStatusChange?.("Connected");
      } else if (state === SyncState.Reconnecting) {
        this.onStatusChange?.("Reconnecting...");
      }
    });
  }

  private async handleSyncError() {
    if (this.isRecovering) return;
    
    this.isRecovering = true;
    this.onStatusChange?.("Connection lost");

    while (this.retryCount < this.maxRetries) {
      const delay = Math.min(
        this.baseDelay * Math.pow(2, this.retryCount),
        this.maxDelay
      );

      this.onStatusChange?.(`Reconnecting in ${Math.round(delay / 1000)}s...`);
      await this.sleep(delay);

      try {
        this.retryCount++;
        await this.client.startClient({ initialSyncLimit: 10 });
        this.onStatusChange?.("Reconnected");
        this.isRecovering = false;
        return;
      } catch (error) {
        console.error(`Reconnection attempt ${this.retryCount} failed:`, error);
      }
    }

    this.onStatusChange?.("Failed to reconnect. Please refresh the page.");
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public getStatus(): string {
    if (this.isRecovering) {
      return "Reconnecting...";
    }
    return "Connected";
  }
}
