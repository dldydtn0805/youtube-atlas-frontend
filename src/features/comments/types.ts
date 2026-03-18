export interface ChatMessage {
  id: number;
  video_id: string;
  author: string;
  content: string;
  client_id: string;
  created_at: string;
}

export interface SendMessageInput {
  videoId: string;
  author: string;
  content: string;
  clientId: string;
}
