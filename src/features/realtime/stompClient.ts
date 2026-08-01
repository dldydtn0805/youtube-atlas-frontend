import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { getChatParticipantId } from '../comments/participant';
import { readStoredAuthSession } from '../auth/storage';

type TopicHandler = (messageBody: string) => void;
type ConnectionHandler = () => void;
type RealtimePublisher = {
  connected: boolean;
  publish: (message: { body?: string; destination: string }) => void;
};
type AuthenticatedConnectionHandler = (client: RealtimePublisher) => void;

const handlersByTopic = new Map<string, Set<TopicHandler>>();
const channelsByTopic = new Map<string, RealtimeChannel>();
const connectionHandlers = new Set<ConnectionHandler>();
let connectedChannelCount = 0;
let connectionChannel: RealtimeChannel | null = null;

function dispatchMessage(topic: string, payload: unknown) {
  const handlers = handlersByTopic.get(topic);

  if (!handlers) {
    return;
  }

  const messageBody = JSON.stringify(payload);
  [...handlers].forEach((handler) => {
    handler(messageBody);
  });
}

function dispatchConnection() {
  [...connectionHandlers].forEach((handler) => {
    handler();
  });
}

function toNotification(payload: Record<string, unknown>) {
  return {
    channelTitle: payload.channel_title ?? null,
    createdAt: payload.created_at,
    highlightScore: payload.highlight_score ?? null,
    id: String(payload.id),
    message: payload.message,
    notificationEventType: payload.event_type,
    notificationType: payload.notification_type,
    positionId: payload.position_id ?? null,
    readAt: payload.read_at ?? null,
    showModal: payload.show_modal ?? false,
    strategyTags: payload.strategy_tags ?? [],
    thumbnailUrl: payload.thumbnail_url ?? null,
    title: payload.title,
    titleCode: payload.title_code ?? null,
    titleDisplayName: payload.title_display_name ?? null,
    titleGrade: payload.title_grade ?? null,
    videoId: payload.video_id ?? null,
    videoTitle: payload.video_title ?? null,
  };
}

function createTopicChannel(topic: string) {
  if (!supabase) {
    return null;
  }

  const channelName = `atlas:${topic.replace(/[^a-zA-Z0-9_-]/g, ':')}`;
  const channel = supabase.channel(channelName);

  if (topic === '/topic/comments') {
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'comments',
      },
      (payload) => {
        dispatchMessage(topic, payload.new);
      },
    );
  } else if (topic === '/topic/comments/presence') {
    channel.on('presence', { event: 'sync' }, () => {
      const participants = Object.values(channel.presenceState())
        .flat()
        .map((presence) => {
          const presenceData = presence as unknown as Record<string, unknown>;

          return {
            display_name:
              typeof presenceData.display_name === 'string'
                ? presenceData.display_name
                : '익명',
            participant_id:
              typeof presenceData.participant_id === 'string'
                ? presenceData.participant_id
                : String(presenceData.presence_ref ?? ''),
          };
        })
        .filter((participant) => participant.participant_id);

      dispatchMessage(topic, {
        active_count: participants.length,
        participants,
      });
    });
  } else if (topic === '/user/queue/game/notifications') {
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'game_notifications',
      },
      (payload) => {
        dispatchMessage(topic, toNotification(payload.new));
      },
    );
  } else if (topic.startsWith('/topic/game/')) {
    const regionCode = topic.slice('/topic/game/'.length).toUpperCase();

    channel.on(
      'postgres_changes',
      {
        event: '*',
        filter: `region_code=eq.${regionCode}`,
        schema: 'public',
        table: 'game_positions',
      },
      () => {
        dispatchMessage(topic, {
          capturedAt: null,
          eventType: 'wallet-updated',
          occurredAt: new Date().toISOString(),
          regionCode,
          seasonId: null,
        });
      },
    );

    channel.on(
      'postgres_changes',
      {
        event: '*',
        filter: `region_code=eq.${regionCode}`,
        schema: 'public',
        table: 'video_trend_signals',
      },
      (payload) => {
        const signal = payload.new as Record<string, unknown>;

        dispatchMessage(topic, {
          capturedAt: typeof signal.captured_at === 'string' ? signal.captured_at : null,
          eventType: 'market-updated',
          occurredAt: new Date().toISOString(),
          regionCode,
          seasonId: null,
        });
      },
    );
  } else {
    channel.on('broadcast', { event: 'message' }, ({ payload }) => {
      dispatchMessage(topic, payload);
    });
  }

  channel.subscribe((status) => {
    if (status !== 'SUBSCRIBED') {
      return;
    }

    connectedChannelCount += 1;
    dispatchConnection();

    if (topic === '/topic/comments/presence') {
      const session = readStoredAuthSession();
      void channel.track({
        display_name: session?.user.displayName ?? '익명',
        participant_id: getChatParticipantId(),
      });
    }
  });

  channelsByTopic.set(topic, channel);
  return channel;
}

function ensureTopicChannel(topic: string) {
  return channelsByTopic.get(topic) ?? createTopicChannel(topic);
}

function removeTopicChannel(topic: string) {
  const channel = channelsByTopic.get(topic);

  if (!channel || !supabase) {
    return;
  }

  channelsByTopic.delete(topic);
  connectedChannelCount = Math.max(0, connectedChannelCount - 1);
  void supabase.removeChannel(channel);
}

export function subscribeToRealtimeTopic(topic: string, handler: TopicHandler) {
  const handlers = handlersByTopic.get(topic) ?? new Set<TopicHandler>();

  handlers.add(handler);
  handlersByTopic.set(topic, handlers);
  ensureTopicChannel(topic);

  return () => {
    const currentHandlers = handlersByTopic.get(topic);

    currentHandlers?.delete(handler);
    if (!currentHandlers || currentHandlers.size === 0) {
      handlersByTopic.delete(topic);
      removeTopicChannel(topic);
    }
  };
}

export function subscribeToRealtimeConnection(handler: ConnectionHandler) {
  connectionHandlers.add(handler);

  if (connectedChannelCount > 0) {
    handler();
  } else if (supabase && !connectionChannel) {
    connectionChannel = supabase.channel('atlas:connection');
    connectionChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        dispatchConnection();
      }
    });
  }

  return () => {
    connectionHandlers.delete(handler);

    if (connectionHandlers.size === 0 && connectionChannel && supabase) {
      void supabase.removeChannel(connectionChannel);
      connectionChannel = null;
    }
  };
}

export function subscribeToAuthenticatedRealtimeTopic(
  topic: string,
  _accessToken: string,
  handler: TopicHandler,
  onConnect?: AuthenticatedConnectionHandler,
) {
  const unsubscribe = subscribeToRealtimeTopic(topic, handler);

  onConnect?.({
    connected: true,
    publish: () => {},
  });

  return unsubscribe;
}

export function resetSharedRealtimeClientForTests() {
  handlersByTopic.clear();
  connectionHandlers.clear();

  if (supabase) {
    const activeSupabase = supabase;

    channelsByTopic.forEach((channel) => {
      void activeSupabase.removeChannel(channel);
    });

    if (connectionChannel) {
      void activeSupabase.removeChannel(connectionChannel);
    }
  }

  channelsByTopic.clear();
  connectedChannelCount = 0;
  connectionChannel = null;
}
