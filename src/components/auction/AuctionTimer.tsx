import { useEffect, useState, useRef } from "react";

interface AuctionTimerProps {
  timerEndsAt: string | null;
  onTimerEnd: () => void;
  isBidding: boolean;
}

const AuctionTimer = ({ timerEndsAt, onTimerEnd, isBidding }: AuctionTimerProps) => {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    hasTriggeredRef.current = false;
  }, [timerEndsAt]);

  useEffect(() => {
    if (!timerEndsAt || !isBidding) {
      setSecondsLeft(0);
      return;
    }

    const update = () => {
      const end = new Date(timerEndsAt).getTime();
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((end - now) / 1000));
      setSecondsLeft(remaining);

      if (remaining === 0 && !hasTriggeredRef.current) {
        hasTriggeredRef.current = true;
        onTimerEnd();
      }
    };

    update();
    const interval = setInterval(update, 100);
    return () => clearInterval(interval);
  }, [timerEndsAt, isBidding, onTimerEnd]);

  const percentage = timerEndsAt
    ? Math.min(100, (secondsLeft / 30) * 100)
    : 0;

  const isUrgent = secondsLeft <= 5 && secondsLeft > 0;
  const isWarning = secondsLeft <= 10 && secondsLeft > 5;

  return (
    <div className="bg-card rounded-xl border p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm uppercase tracking-wider text-muted-foreground font-semibold">
          Time Remaining
        </span>
        <span
          className={`font-display text-4xl tracking-wide ${
            isUrgent
              ? "text-destructive animate-pulse"
              : isWarning
              ? "text-orange-500"
              : "text-primary"
          }`}
        >
          {secondsLeft}s
        </span>
      </div>
      <div className="h-3 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-200 ${
            isUrgent
              ? "bg-destructive"
              : isWarning
              ? "bg-orange-500"
              : "bg-primary"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default AuctionTimer;
