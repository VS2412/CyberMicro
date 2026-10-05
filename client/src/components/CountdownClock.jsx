import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, ShieldAlert } from 'lucide-react';

export default function CountdownClock({ deadline, triggered }) {
  const [timeLeft, setTimeLeft] = useState({ hours: 72, minutes: 0, seconds: 0, isExpired: false, totalMs: 0 });

  useEffect(() => {
    if (!triggered || !deadline) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const target = new Date(deadline).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, isExpired: true, totalMs: 0 });
        clearInterval(interval);
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft({ hours, minutes, seconds, isExpired: false, totalMs: diff });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [deadline, triggered]);

  if (!triggered) {
    return (
      <div className="bg-panelDark border border-borderDark px-4 py-3 rounded-lg flex items-center gap-3 text-slate-400">
        <Clock className="w-5 h-5" />
        <span className="text-sm font-medium">72-Hour Regulatory Notification Clock: Inactive</span>
      </div>
    );
  }

  // Tier Colors: < 12h: Red | < 24h: Orange | > 24h: Emerald
  const hoursLeft = timeLeft.hours;
  const badgeColor = timeLeft.isExpired
    ? 'bg-rose-950/80 border-rose-600 text-rose-300'
    : hoursLeft < 12
    ? 'bg-rose-900/50 border-rose-500 text-rose-200'
    : hoursLeft < 24
    ? 'bg-amber-900/50 border-amber-500 text-amber-200'
    : 'bg-emerald-950/50 border-emerald-500 text-emerald-200';

  return (
    <div className={`border rounded-lg px-4 py-3 flex items-center justify-between transition-all ${badgeColor}`}>
      <div className="flex items-center gap-3">
        {timeLeft.isExpired || hoursLeft < 12 ? (
          <ShieldAlert className="w-6 h-6 animate-pulse text-rose-400" />
        ) : (
          <Clock className="w-6 h-6 text-emerald-400" />
        )}
        <div>
          <div className="text-xs uppercase tracking-wider font-semibold opacity-80">
            GDPR / Banking 72-Hour Breach Clock
          </div>
          <div className="text-xl font-mono font-bold tracking-tight">
            {timeLeft.isExpired
              ? 'DEADLINE EXPIRED - REGULATORY BREACH'
              : `${String(timeLeft.hours).padStart(2, '0')}h : ${String(timeLeft.minutes).padStart(2, '0')}m : ${String(timeLeft.seconds).padStart(2, '0')}s`}
          </div>
        </div>
      </div>
      <div className="text-xs font-mono border border-current/30 px-2.5 py-1 rounded">
        {timeLeft.isExpired ? 'SLA VIOLATION' : `${timeLeft.hours}H REMAINING`}
      </div>
    </div>
  );
}