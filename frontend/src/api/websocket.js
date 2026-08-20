/**
 * Managed WebSocket Helper with exponential backoff and cleanup
 */
export class ManagedWebSocket {
  constructor(url, onMessage, onStatusChange) {
    this.url = url;
    this.onMessage = onMessage;
    this.onStatusChange = onStatusChange;
    this.socket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000;
    this.isClosedManually = false;
  }

  connect() {
    if (this.isClosedManually) return; // Don't reconnect if already closed
    try {
      this.socket = new WebSocket(this.url);
      if (this.onStatusChange) this.onStatusChange('connecting');

      this.socket.onopen = () => {
        if (this.isClosedManually) {
          // Was closed while connecting — close immediately
          this.socket.close();
          return;
        }
        this.reconnectAttempts = 0;
        if (this.onStatusChange) this.onStatusChange('connected');
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (this.onMessage) this.onMessage(data);
        } catch (e) {
          console.warn('[WS Parse Error]', e);
        }
      };

      this.socket.onerror = (err) => {
        if (!this.isClosedManually) {
          console.warn('[WS Error]', err);
          if (this.onStatusChange) this.onStatusChange('error');
        }
      };

      this.socket.onclose = () => {
        if (this.isClosedManually) {
          if (this.onStatusChange) this.onStatusChange('disconnected');
          return;
        }

        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          if (this.onStatusChange) this.onStatusChange(`reconnecting (${this.reconnectAttempts})`);
          setTimeout(() => {
            if (!this.isClosedManually) this.connect();
          }, this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1));
        } else {
          if (this.onStatusChange) this.onStatusChange('failed');
        }
      };
    } catch (err) {
      console.error('[WS Setup Failed]', err);
      if (this.onStatusChange) this.onStatusChange('failed');
    }
  }

  send(data) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(typeof data === 'string' ? data : JSON.stringify(data));
    }
  }

  close() {
    this.isClosedManually = true;
    if (this.socket) {
      // Only close if not already closing/closed
      if (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING) {
        this.socket.close();
      }
      this.socket = null;
    }
  }
}
