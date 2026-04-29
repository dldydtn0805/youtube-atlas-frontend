import type { ReactNode } from 'react';
import './PlayerStageWatchLayout.css';

interface PlayerStageWatchLayoutProps {
  active: boolean;
  chatContent: ReactNode;
  primaryContent: ReactNode;
}

export default function PlayerStageWatchLayout({
  active,
  chatContent,
  primaryContent,
}: PlayerStageWatchLayoutProps) {
  return (
    <div
      className="app-shell__watch-layout"
      data-active={active ? 'true' : 'false'}
      data-has-chat={chatContent ? 'true' : 'false'}
    >
      <div className="app-shell__watch-primary">{primaryContent}</div>
      {chatContent ? (
        <aside aria-label="실시간 채팅" className="app-shell__watch-chat">
          {chatContent}
        </aside>
      ) : null}
    </div>
  );
}
