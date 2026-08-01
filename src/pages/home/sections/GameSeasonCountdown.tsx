import { useEffect, useMemo, useState } from 'react';
import { formatSeasonTimeLeft } from './gameSeasonCountdownFormat';
import './GameSeasonCountdown.css';

const SECOND_MS = 1_000;

interface GameSeasonCountdownProps {
  endAt: string;
  startAt?: string | null;
}

export default function GameSeasonCountdown({ endAt, startAt }: GameSeasonCountdownProps) {
  const [nowMs, setNowMs] = useState(Date.now);
  const label = useMemo(() => formatSeasonTimeLeft(endAt, nowMs, startAt), [endAt, nowMs, startAt]);

  useEffect(() => {
    const timerId = window.setInterval(() => setNowMs(Date.now()), SECOND_MS);

    return () => window.clearInterval(timerId);
  }, []);

  if (!label) {
    return null;
  }

  return <p className="app-shell__game-season-countdown">{label}</p>;
}
