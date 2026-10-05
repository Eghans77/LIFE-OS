import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  BellRing,
  Timer,
  CheckCircle2,
  Clock,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLifeOS } from '../context/LifeOSContext';
import { toggleTaskRecord, saveDailyPlanRecord } from '../lib/firebase';
import { ScheduleBlock } from '../types/lifeos';

export interface ActiveTimeAlert {
  id: string;
  stage: 'now' | 'upcoming_5m' | 'snoozed' | 'planning';
  title: string;
  activityTitle: string;
  subtitle: string;
  timeLabel: string;
  durationMinutes: number;
  sourceType: 'block' | 'task' | 'event' | 'planning';
  sourceId?: string;
  blockData?: ScheduleBlock;
}

interface SnoozedAlertItem {
  alert: ActiveTimeAlert;
  triggerAtMs: number;
}

/**
 * Plays a gentle two-tone crystal chime using Web Audio API
 */
export function playNotificationChime(urgent = false) {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;

    const notes = urgent ? [587.33, 783.99, 1046.5] : [523.25, 659.25, 783.99];

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.14);

      gain.gain.setValueAtTime(0.0001, now + idx * 0.14);
      gain.gain.exponentialRampToValueAtTime(0.16, now + idx * 0.14 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.14 + 0.55);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.14);
      osc.stop(now + idx * 0.14 + 0.6);
    });
  } catch {
    // Ignore audio context autoplay restrictions if user hasn't interacted yet
  }
}

/**
 * Dispatches a native OS / Phone notification (via Service Worker on mobile or desktop Notification)
 */
export function sendBrowserNotification(title: string, body: string, tag: string) {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    // Trigger phone vibration if supported
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate([200, 100, 200]);
      } catch {
        // Ignore vibration restriction if user hasn't interacted
      }
    }

    // On mobile devices and PWAs, service worker showNotification sends native phone notifications
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready
        .then((registration) => {
          registration.showNotification(title, {
            body,
            icon: '/pwa-192x192.png',
            badge: '/pwa-192x192.png',
            tag,
            // @ts-expect-error PWA notification options
            vibrate: [200, 100, 200],
            renotify: true,
          });
        })
        .catch(() => {
          new Notification(title, {
            body,
            icon: '/pwa-192x192.png',
            badge: '/pwa-192x192.png',
            tag,
          });
        });
    } else {
      new Notification(title, {
        body,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag,
      });
    }
  } catch {
    // Ignore environments where Notification constructor is restricted
  }
}

function parseHHMMToMinutes(hhmm?: string): number | null {
  if (!hhmm || !hhmm.includes(':')) return null;
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

export const LiveTimeAlertManager: React.FC = () => {
  const {
    user,
    profile,
    tasks,
    events,
    dailyPlans,
    isQuietHoursActive,
    openFocusTimer,
    openAIWithPrompt,
    showToast,
  } = useLifeOS();

  const [activeAlerts, setActiveAlerts] = useState<ActiveTimeAlert[]>([]);
  const [soundMuted, setSoundMuted] = useState<boolean>(() => {
    return localStorage.getItem('lifeos_alert_sound_muted') === 'true';
  });
  const snoozedRef = useRef<SnoozedAlertItem[]>([]);

  const toggleSoundMute = () => {
    setSoundMuted((prev) => {
      const next = !prev;
      localStorage.setItem('lifeos_alert_sound_muted', String(next));
      return next;
    });
  };

  const triggerAlert = useCallback(
    (alert: ActiveTimeAlert, bypassQuietHours = false) => {
      if (!bypassQuietHours && (profile?.notificationsEnabled === false || isQuietHoursActive)) {
        return;
      }

      setActiveAlerts((prev) => {
        if (prev.some((a) => a.id === alert.id)) return prev;
        return [alert, ...prev].slice(0, 4);
      });

      if (!soundMuted) {
        playNotificationChime(alert.stage === 'now');
      }

      sendBrowserNotification(
        alert.title,
        `${alert.activityTitle} (${alert.timeLabel}) — ${alert.subtitle}`,
        alert.id
      );
    },
    [profile?.notificationsEnabled, isQuietHoursActive, soundMuted]
  );

  // Listen for manual test alert trigger from Notifications / Settings view
  useEffect(() => {
    const handleTestAlert = (e: Event) => {
      const custom = (e as CustomEvent)?.detail;
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const title = custom?.title || 'Focused Deep Work Session';
      const timeLabel = custom?.time || `${hh}:${mm}`;
      triggerAlert(
        {
          id: `test_alert_${Date.now()}`,
          stage: 'now',
          title: "It's Time! · Activity Reminder",
          activityTitle: title,
          subtitle: `Your scheduled activity is starting right now. Ready to begin, ${profile?.displayName && profile.displayName !== 'Commander' ? profile.displayName : 'Eghans'}?`,
          timeLabel,
          durationMinutes: 45,
          sourceType: 'block',
        },
        true
      );
    };

    window.addEventListener('lifeos:trigger-test-alert', handleTestAlert);
    return () => window.removeEventListener('lifeos:trigger-test-alert', handleTestAlert);
  }, [triggerAlert, profile?.displayName]);

  // Real-time 15-second watcher comparing current clock against today's schedule, tasks & events
  useEffect(() => {
    const checkScheduleAlerts = () => {
      if (profile?.notificationsEnabled === false || isQuietHoursActive) return;

      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);
      const nowMinutes = now.getHours() * 60 + now.getMinutes();

      const storageKey = `lifeos_fired_alerts_${todayStr}`;
      let firedMap: Record<string, boolean> = {};
      try {
        firedMap = JSON.parse(localStorage.getItem(storageKey) || '{}');
      } catch {
        firedMap = {};
      }

      const markFired = (key: string) => {
        firedMap[key] = true;
        try {
          localStorage.setItem(storageKey, JSON.stringify(firedMap));
        } catch {
          // Ignore storage quota issues
        }
      };

      // 1. Check Snoozed Alerts Queue
      const nowMs = Date.now();
      const dueSnoozes = snoozedRef.current.filter((item) => nowMs >= item.triggerAtMs);
      if (dueSnoozes.length > 0) {
        snoozedRef.current = snoozedRef.current.filter((item) => nowMs < item.triggerAtMs);
        dueSnoozes.forEach((item) => {
          triggerAlert({
            ...item.alert,
            id: `${item.alert.id}_snooze_${nowMs}`,
            stage: 'snoozed',
            title: "Snooze Ended · It's Time!",
          });
        });
      }

      // 2. Check Today's AI Daily Plan Schedule Blocks
      const todayPlan = dailyPlans.find((p) => p.date === todayStr);
      if (todayPlan && todayPlan.blocks.length > 0) {
        todayPlan.blocks.forEach((blk) => {
          if (blk.status === 'completed') return;
          const startMin = parseHHMMToMinutes(blk.startTime);
          const endMin = parseHHMMToMinutes(blk.endTime);
          if (startMin === null) return;
          const duration = endMin !== null && endMin > startMin ? endMin - startMin : 45;

          // 5-Minute Heads-Up
          const headsUpKey = `blk_5m_${blk.id}_${blk.startTime}`;
          if (startMin - nowMinutes === 5 && !firedMap[headsUpKey]) {
            markFired(headsUpKey);
            triggerAlert({
              id: headsUpKey,
              stage: 'upcoming_5m',
              title: 'Starting in 5 Minutes',
              activityTitle: blk.title,
              subtitle: `Scheduled ${blk.startTime}–${blk.endTime}. Wrap up your current work.`,
              timeLabel: `${blk.startTime} – ${blk.endTime}`,
              durationMinutes: duration,
              sourceType: 'block',
              sourceId: blk.id,
              blockData: blk,
            });
          }

          // Exact Start Time ("It's Time!")
          const startKey = `blk_now_${blk.id}_${blk.startTime}`;
          if (nowMinutes >= startMin && nowMinutes <= startMin + 1 && !firedMap[startKey]) {
            markFired(startKey);
            triggerAlert({
              id: startKey,
              stage: 'now',
              title: "It's Time! · Scheduled Block",
              activityTitle: blk.title,
              subtitle: blk.notes || `Scheduled from ${blk.startTime} to ${blk.endTime}.`,
              timeLabel: `${blk.startTime} – ${blk.endTime}`,
              durationMinutes: duration,
              sourceType: 'block',
              sourceId: blk.id,
              blockData: blk,
            });
          }
        });
      }

      // 3. Check Today's Scheduled Tasks
      tasks
        .filter(
          (t) =>
            t.dueDate === todayStr &&
            t.status !== 'completed' &&
            t.status !== 'cancelled' &&
            Boolean(t.scheduledTime)
        )
        .forEach((task) => {
          const startMin = parseHHMMToMinutes(task.scheduledTime);
          if (startMin === null) return;
          const duration = task.estimatedMinutes || profile?.defaultTaskMinutes || 45;

          const headsUpKey = `task_5m_${task.id}_${task.scheduledTime}`;
          if (startMin - nowMinutes === 5 && !firedMap[headsUpKey]) {
            markFired(headsUpKey);
            triggerAlert({
              id: headsUpKey,
              stage: 'upcoming_5m',
              title: 'Task in 5 Minutes',
              activityTitle: task.title,
              subtitle: `Priority: ${task.priority.toUpperCase()} · Est. ${duration}m`,
              timeLabel: task.scheduledTime,
              durationMinutes: duration,
              sourceType: 'task',
              sourceId: task.id,
            });
          }

          const startKey = `task_now_${task.id}_${task.scheduledTime}`;
          if (nowMinutes >= startMin && nowMinutes <= startMin + 1 && !firedMap[startKey]) {
            markFired(startKey);
            triggerAlert({
              id: startKey,
              stage: 'now',
              title: "It's Time! · Task Due Now",
              activityTitle: task.title,
              subtitle:
                task.description || `Priority: ${task.priority.toUpperCase()} · Est. ${duration}m`,
              timeLabel: task.scheduledTime,
              durationMinutes: duration,
              sourceType: 'task',
              sourceId: task.id,
            });
          }
        });

      // 4. Check Today's Calendar Commitments
      events
        .filter((e) => e.date === todayStr && Boolean(e.startTime))
        .forEach((ev) => {
          const startMin = parseHHMMToMinutes(ev.startTime);
          const endMin = parseHHMMToMinutes(ev.endTime);
          if (startMin === null) return;
          const duration = endMin !== null && endMin > startMin ? endMin - startMin : 60;

          const headsUpKey = `ev_5m_${ev.id}_${ev.startTime}`;
          if (startMin - nowMinutes === 5 && !firedMap[headsUpKey]) {
            markFired(headsUpKey);
            triggerAlert({
              id: headsUpKey,
              stage: 'upcoming_5m',
              title: 'Commitment in 5 Minutes',
              activityTitle: ev.title,
              subtitle: ev.isFixed
                ? 'Fixed commitment — cannot be moved.'
                : 'Scheduled calendar event.',
              timeLabel: `${ev.startTime} – ${ev.endTime}`,
              durationMinutes: duration,
              sourceType: 'event',
              sourceId: ev.id,
            });
          }

          const startKey = `ev_now_${ev.id}_${ev.startTime}`;
          if (nowMinutes >= startMin && nowMinutes <= startMin + 1 && !firedMap[startKey]) {
            markFired(startKey);
            triggerAlert({
              id: startKey,
              stage: 'now',
              title: "It's Time! · Calendar Commitment",
              activityTitle: ev.title,
              subtitle: ev.description || `Starts now (${ev.startTime} – ${ev.endTime}).`,
              timeLabel: `${ev.startTime} – ${ev.endTime}`,
              durationMinutes: duration,
              sourceType: 'event',
              sourceId: ev.id,
            });
          }
        });

      // 5. Check Daily Planning Reminder Time
      const planMin = parseHHMMToMinutes(profile?.dailyPlanningTime || '08:00');
      const planKey = `daily_plan_${todayStr}`;
      if (
        planMin !== null &&
        (!todayPlan || todayPlan.blocks.length === 0) &&
        nowMinutes >= planMin &&
        nowMinutes <= planMin + 1 &&
        !firedMap[planKey]
      ) {
        markFired(planKey);
        triggerAlert({
          id: planKey,
          stage: 'planning',
          title: 'Daily Planning Time',
          activityTitle: 'Build Today’s AI Schedule',
          subtitle: 'Tell LIFE OS what your day looks like so your timeline is protected.',
          timeLabel: profile?.dailyPlanningTime || '08:00',
          durationMinutes: 15,
          sourceType: 'planning',
        });
      }
    };

    checkScheduleAlerts();
    const interval = setInterval(checkScheduleAlerts, 15000);
    return () => clearInterval(interval);
  }, [
    dailyPlans,
    tasks,
    events,
    profile?.notificationsEnabled,
    profile?.dailyPlanningTime,
    profile?.defaultTaskMinutes,
    isQuietHoursActive,
    triggerAlert,
  ]);

  const dismissAlert = (id: string) => {
    setActiveAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSnooze10m = (alert: ActiveTimeAlert) => {
    snoozedRef.current.push({
      alert,
      triggerAtMs: Date.now() + 10 * 60 * 1000,
    });
    dismissAlert(alert.id);
    showToast(`Snoozed "${alert.activityTitle}" for 10 minutes.`);
  };

  const handleStartFocus = (alert: ActiveTimeAlert) => {
    dismissAlert(alert.id);
    openFocusTimer(alert.activityTitle, alert.durationMinutes || 45);
  };

  const handleMarkDone = async (alert: ActiveTimeAlert) => {
    dismissAlert(alert.id);
    if (!user) return;

    const todayStr = new Date().toISOString().slice(0, 10);
    const todayPlan = dailyPlans.find((p) => p.date === todayStr);

    if (alert.sourceType === 'block' && alert.sourceId && todayPlan) {
      const updatedBlocks = todayPlan.blocks.map((b) =>
        b.id === alert.sourceId ? { ...b, status: 'completed' as const } : b
      );
      await saveDailyPlanRecord(
        user.uid,
        todayStr,
        {
          ...todayPlan,
          blocks: updatedBlocks,
        },
        todayPlan.id
      );
      showToast(`Marked "${alert.activityTitle}" completed!`);
    } else if (alert.sourceType === 'task' && alert.sourceId) {
      await toggleTaskRecord(alert.sourceId, true);
      showToast(`Task "${alert.activityTitle}" completed!`);
    } else {
      showToast(`Acknowledged "${alert.activityTitle}".`);
    }
  };

  const handleRescheduleAI = (alert: ActiveTimeAlert) => {
    dismissAlert(alert.id);
    openAIWithPrompt(
      `It's time for "${alert.activityTitle}" (${alert.timeLabel}), but I need to reschedule it to later today. Please reorganize my remaining schedule.`
    );
  };

  if (activeAlerts.length === 0) return null;

  return (
    <div className="fixed top-16 right-4 z-50 w-full max-w-sm space-y-3 pointer-events-none">
      <AnimatePresence>
        {activeAlerts.map((alert) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, x: 40, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.95 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-auto rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-emerald-500/60 p-4 shadow-2xl space-y-3"
          >
            {/* Top row: Alert Badge + Sound Toggle + Dismiss */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
                  <BellRing className="w-3.5 h-3.5 animate-bounce" />
                </span>
                <div>
                  <p className="text-[11px] font-mono font-semibold uppercase tracking-wider text-emerald-400">
                    {alert.title}
                  </p>
                  <p className="text-[11px] font-mono text-slate-400">{alert.timeLabel}</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={toggleSoundMute}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                  title={soundMuted ? 'Unmute alert chime' : 'Mute alert chime'}
                >
                  {soundMuted ? (
                    <VolumeX className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => dismissAlert(alert.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                  aria-label="Dismiss alert"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Activity Title & Subtitle */}
            <div className="space-y-1">
              <h3 className="font-display text-base font-bold text-white leading-snug">
                {alert.activityTitle}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">{alert.subtitle}</p>
            </div>

            {/* Quick Action Buttons */}
            {alert.sourceType === 'planning' ? (
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    dismissAlert(alert.id);
                    openAIWithPrompt('');
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Open AI Planner</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSnooze10m(alert)}
                  className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 cursor-pointer"
                >
                  Snooze 10m
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleStartFocus(alert)}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white cursor-pointer"
                >
                  <Timer className="w-3.5 h-3.5" />
                  <span>Start Focus</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleMarkDone(alert)}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Mark Done</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSnooze10m(alert)}
                  className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 cursor-pointer"
                >
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>Snooze 10m</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRescheduleAI(alert)}
                  className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] text-emerald-300 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Reschedule</span>
                </button>
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
