export interface ChatMessage {
  id: number;
  video_id: string;
  message_type?: string;
  system_event_type?: 'TRADE' | 'LOGIN' | 'TIER' | string | null;
  author: string;
  content: string;
  client_id: string;
  user_id?: number | null;
  created_at: string;
}

export interface ChatPresence {
  active_count: number;
  participants?: ChatPresenceParticipant[];
}

export interface ChatPresenceParticipant {
  participant_id: string;
  display_name: string;
}

export interface SendMessageInput {
  videoId: string;
  author: string;
  content: string;
  clientId: string;
}
