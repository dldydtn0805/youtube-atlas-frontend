import { Client, type IMessage, type StompSubscription } from '@stomp/stompjs';
import { getWebSocketUrl } from '../../lib/api';
import { CHAT_PARTICIPANT_HEADER, getChatParticipantId } from '../comments/participant';

type TopicHandler = (messageBody: string) => void;
type ConnectionHandler = () => void;

let sharedClient: Client | null = null;
let isConnected = false;
const handlersByTopic = new Map<string, Set<TopicHandler>>();
const subscriptionsByTopic = new Map<string, StompSubscription>();
const connectionHandlers = new Set<ConnectionHandler>();

function dispatchMessage(topic: string, message: IMessage) {
  const handlers = handlersByTopic.get(topic);

  if (!handlers) {
    return;
  }

  [...handlers].forEach((handler) => {
    handler(message.body);
  });
}

function dispatchConnection() {
  [...connectionHandlers].forEach((handler) => {
    handler();
  });
}

function subscribeTopic(topic: string) {
  if (!sharedClient || !isConnected || subscriptionsByTopic.has(topic) || !handlersByTopic.has(topic)) {
    return;
  }

  const subscription = sharedClient.subscribe(topic, (message) => {
    dispatchMessage(topic, message);
  });

  subscriptionsByTopic.set(topic, subscription);
}

function ensureSharedClient() {
  if (sharedClient) {
    return sharedClient;
  }

  const client = new Client({
    brokerURL: getWebSocketUrl(),
    connectHeaders: {
      [CHAT_PARTICIPANT_HEADER]: getChatParticipantId(),
    },
    debug: () => {},
    reconnectDelay: 5_000,
  });

  client.onConnect = () => {
    if (sharedClient !== client) {
      void client.deactivate();
      return;
    }

    isConnected = true;
    handlersByTopic.forEach((_handlers, topic) => {
      subscribeTopic(topic);
    });
    dispatchConnection();
  };

  client.onWebSocketClose = () => {
    isConnected = false;
    subscriptionsByTopic.clear();
  };

  sharedClient = client;
  client.activate();

  return client;
}

function deactivateSharedClient() {
  if (!sharedClient || handlersByTopic.size > 0) {
    return;
  }

  subscriptionsByTopic.forEach((subscription) => {
    subscription.unsubscribe();
  });
  subscriptionsByTopic.clear();
  isConnected = false;
  void sharedClient.deactivate();
  sharedClient = null;
}

export function subscribeToRealtimeTopic(topic: string, handler: TopicHandler) {
  const existingHandlers = handlersByTopic.get(topic);

  if (existingHandlers) {
    existingHandlers.add(handler);
  } else {
    handlersByTopic.set(topic, new Set([handler]));
  }

  ensureSharedClient();
  subscribeTopic(topic);

  return () => {
    const handlers = handlersByTopic.get(topic);

    if (!handlers) {
      return;
    }

    handlers.delete(handler);

    if (handlers.size === 0) {
      handlersByTopic.delete(topic);
      const subscription = subscriptionsByTopic.get(topic);
      subscription?.unsubscribe();
      subscriptionsByTopic.delete(topic);
    }

    deactivateSharedClient();
  };
}

export function subscribeToRealtimeConnection(handler: ConnectionHandler) {
  connectionHandlers.add(handler);
  ensureSharedClient();

  if (isConnected) {
    handler();
  }

  return () => {
    connectionHandlers.delete(handler);
    deactivateSharedClient();
  };
}

export function resetSharedRealtimeClientForTests() {
  subscriptionsByTopic.forEach((subscription) => {
    subscription.unsubscribe();
  });
  subscriptionsByTopic.clear();
  handlersByTopic.clear();
  connectionHandlers.clear();
  isConnected = false;
  void sharedClient?.deactivate();
  sharedClient = null;
}
