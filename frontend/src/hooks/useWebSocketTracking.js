import { useState, useEffect, useRef } from 'react';
import { ManagedWebSocket } from '../api/websocket';
import { SOCKET_URLS } from '../constants';
import { deliveryService } from '../services/deliveryService';

export function useWebSocketTracking(orderId, agentId = null, initialAgentLocation = null) {
  const [agentLocation, setAgentLocation] = useState(initialAgentLocation);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [lastUpdated, setLastUpdated] = useState(null);
  const socketRef = useRef(null);

  // Sync initial location from props if available
  useEffect(() => {
    if (initialAgentLocation && initialAgentLocation.lat && initialAgentLocation.lng) {
      setAgentLocation(initialAgentLocation);
      setLastUpdated(new Date());
    }
  }, [initialAgentLocation?.lat, initialAgentLocation?.lng]);

  // Fetch initial location from REST API on mount / refresh if not provided in props
  useEffect(() => {
    if (!agentId) return;
    async function fetchInitialLocation() {
      try {
        const res = await deliveryService.getLocation(agentId);
        if (res?.lat && res?.lng) {
          setAgentLocation({
            lat: Number(res.lat),
            lng: Number(res.lng),
            agentId,
            timestamp: new Date().toISOString()
          });
          setLastUpdated(new Date());
        }
      } catch (e) {
        console.warn('Initial agent location fetch notice:', e.message);
      }
    }
    fetchInitialLocation();
  }, [agentId]);

  useEffect(() => {
    if (!orderId) return;

    const wsUrl = SOCKET_URLS.ORDER_TRACKING(orderId);

    const onMessage = (data) => {
      if (data.event === 'live_location' || data.lat) {
        const newCoords = {
          lat: Number(data.lat),
          lng: Number(data.lng),
          agentId: data.agentId,
          timestamp: data.timestamp || new Date().toISOString()
        };
        setAgentLocation(newCoords);
        setLastUpdated(new Date());
      }
    };

    const onStatus = (status) => {
      setConnectionStatus(status);
    };

    socketRef.current = new ManagedWebSocket(wsUrl, onMessage, onStatus);
    // Reset closed flag before connecting (StrictMode-safe: prevents the
    // cleanup from a first mount blocking the second mount's connection)
    socketRef.current.isClosedManually = false;
    socketRef.current.connect();

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [orderId]);

  // Compute staleness (if no update received for >60s)
  const isStale = lastUpdated ? (new Date() - lastUpdated) > 60000 : false;
  const secondsAgo = lastUpdated ? Math.floor((new Date() - lastUpdated) / 1000) : null;

  return {
    agentLocation,
    connectionStatus,
    isStale,
    secondsAgo
  };
}
