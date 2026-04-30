import type { ChatPresenceParticipant as Participant } from '../../features/comments/types';
import './CommentPresenceBadge.css';

type Props = { activeCount: number; participants?: Participant[] };

function CommentPresenceBadge({ activeCount, participants = [] }: Props) {
  const items = participants.filter((item) => item.participant_id);

  return (
    <div
      aria-label={`참여 ${activeCount}명`}
      className="comment-section__presence--overlay chat-presence"
      tabIndex={0}
    >
      실시간 {activeCount}명
      <div className="chat-presence__panel">
        <strong>참여 중</strong>
        {items.length ? (
          <ul>
            {items.map((item, index) => (
              <li key={item.participant_id}>
                {item.display_name?.trim() || `익명 ${index + 1}`}
              </li>
            ))}
          </ul>
        ) : (
          <p>이름 정보 없음</p>
        )}
      </div>
    </div>
  );
}

export default CommentPresenceBadge;
