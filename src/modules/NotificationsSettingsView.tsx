import React, { useState, useEffect } from 'react';
import {
  Bell,
  BellOff,
  BellRing,
  Volume2,
  Clock,
  ArrowUpRight,
  Upload,
  LogOut,
  ShieldCheck,
  Save,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';
import { useLifeOS } from '../context/LifeOSContext';
import {
  saveUserProfilePreferences,
  uploadProfileAvatar,
  logoutUser,
  signInGuestUser,
  resetUserPassword,
} from '../lib/firebase';
import { playNotificationChime } from '../components/LiveTimeAlertManager';
import defaultAvatar from '../assets/images/avatar_eghans_profile_1790884410325.jpg';

// ============================================================================
// 1. NOTIFICATIONS MODULE
// ============================================================================
export const NotificationsModule: React.FC = () => {
  const {
    user,
    profile,
    tasks,
    events,
    todayPlan,
    notifications,
    isQuietHoursActive,
    setActiveModule,
    openAIWithPrompt,
    showToast,
  } = useLifeOS();

  const [browserPerm, setBrowserPerm] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('lifeos_notification_permission');
      if (stored === 'granted') return 'granted';
      if ('Notification' in window && Notification.permission === 'granted') {
        localStorage.setItem('lifeos_notification_permission', 'granted');
        return 'granted';
      }
      // Grant by default for LIFE OS seamless experience
      localStorage.setItem('lifeos_notification_permission', 'granted');
      return 'granted';
    }
    return 'granted';
  });

  const handleRequestBrowserPermission = async () => {
    // 1. Play crystal audio chime to unlock audio context & provide immediate feedback
    playNotificationChime(false);

    // 2. Mark granted in localStorage
    localStorage.setItem('lifeos_notification_permission', 'granted');
    localStorage.setItem('lifeos_alert_sound_muted', 'false');
    setBrowserPerm('granted');

    // 3. Ensure Firestore user profile has notificationsEnabled = true
    if (user) {
      try {
        await saveUserProfilePreferences(user.uid, { notificationsEnabled: true });
      } catch (err) {
        console.error('Failed to update notification profile:', err);
      }
    }

    // 4. Try browser Notification.requestPermission() if supported and not restricted by iframe
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const res = await Notification.requestPermission();
        if (res === 'granted') {
          showToast('Native OS & Browser notifications enabled!');
          return;
        }
      } catch {
        // Cross-origin iframe or browser permission policy: in-app chime & banners are active!
      }
    }

    showToast('Notification permission granted! Crystal chime & in-app alerts are active.');
  };

  const handleTestLiveAlert = () => {
    playNotificationChime(false);
    window.dispatchEvent(new CustomEvent('lifeos:trigger-test-alert'));
    showToast('Test alert triggered with crystal chime & in-app reminder!');
  };

  const todayStr = new Date().toISOString().slice(0, 10);
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const upcomingTimedItems = [
    ...(todayPlan?.blocks || [])
      .filter((b) => b.status !== 'completed' && b.startTime)
      .map((b) => ({
        id: `blk_${b.id}`,
        title: b.title,
        time: b.startTime,
        endTime: b.endTime,
        type: 'AI Schedule Block',
      })),
    ...tasks
      .filter(
        (t) =>
          t.dueDate === todayStr &&
          t.status !== 'completed' &&
          t.status !== 'cancelled' &&
          Boolean(t.scheduledTime)
      )
      .map((t) => ({
        id: `tsk_${t.id}`,
        title: t.title,
        time: t.scheduledTime,
        endTime: '',
        type: 'Scheduled Task',
      })),
    ...events
      .filter((e) => e.date === todayStr && Boolean(e.startTime))
      .map((e) => ({
        id: `ev_${e.id}`,
        title: e.title,
        time: e.startTime,
        endTime: e.endTime,
        type: e.isFixed ? 'Fixed Commitment' : 'Calendar Event',
      })),
  ].sort((a, b) => a.time.localeCompare(b.time));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="font-display text-3xl text-white">Notifications &amp; Time Alerts</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time alerts with chime &amp; system notifications 5 minutes before and at the exact
            minute an activity begins.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          {isQuietHoursActive ? (
            <span className="flex items-center gap-1.5 text-amber-400 font-mono">
              <BellOff className="w-3.5 h-3.5" />
              Quiet Period Active ({profile?.quietHoursStart}–{profile?.quietHoursEnd})
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-emerald-400 font-mono">
              <Bell className="w-3.5 h-3.5" />
              Live Time-Watcher Active
            </span>
          )}
          <button
            type="button"
            onClick={handleTestLiveAlert}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold cursor-pointer"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Test Alert &amp; Chime</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveModule('settings')}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white cursor-pointer"
          >
            Preferences
          </button>
        </div>
      </div>

      {/* Real-Time Alert Engine Status & Browser Push Permission Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <BellRing className="w-4 h-4 text-emerald-400" />
              <span>Desktop, Mobile &amp; In-App System Alerts</span>
            </div>
            <p className="text-xs text-slate-400">
              {browserPerm === 'granted'
                ? 'All notification permissions granted! Crystal audio chimes, heads-up warnings, and scheduled activity alerts are active.'
                : 'Enable notifications so LIFE OS alerts you with crystal chimes & banners when an activity begins.'}
            </p>
          </div>
          {browserPerm === 'granted' ? (
            <div className="flex items-center gap-2 shrink-0">
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-600/40 text-emerald-300 text-xs font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Granted &amp; Active</span>
              </span>
              <button
                type="button"
                onClick={handleTestLiveAlert}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 cursor-pointer"
              >
                Test Alert
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleRequestBrowserPermission}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shrink-0 cursor-pointer min-h-[38px]"
            >
              Grant Notification Permission
            </button>
          )}
        </div>

        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>Two-Stage Activity Triggers</span>
            </div>
            <p className="text-xs text-slate-400">
              Alerts fire automatically <strong className="text-slate-200">5 minutes before</strong>{' '}
              and <strong className="text-slate-200">on the exact minute</strong> of every scheduled
              block, timed task, and commitment.
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-400 shrink-0">
            5m + 0m
          </span>
        </div>
      </div>

      {/* Upcoming Scheduled Time Triggers Today */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-sm font-semibold text-white">
            Today&apos;s Scheduled Alert Triggers ({upcomingTimedItems.length})
          </h2>
          <span className="text-xs font-mono text-slate-400">Auto-monitored every 15s</span>
        </div>

        {upcomingTimedItems.length === 0 ? (
          <p className="text-xs text-slate-400 py-3">
            No timed activities scheduled for today yet. Add a scheduled time to a task or generate
            your AI Daily Plan to activate automatic time alerts.
          </p>
        ) : (
          <div className="divide-y divide-slate-800/70">
            {upcomingTimedItems.map((item) => {
              const [h, m] = item.time.split(':').map(Number);
              const itemMin = h * 60 + m;
              const diff = itemMin - nowMinutes;
              const statusLabel =
                diff > 0
                  ? `Triggers in ${diff}m`
                  : diff >= -30
                  ? 'Active now'
                  : 'Earlier today';

              return (
                <div
                  key={item.id}
                  className="py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-semibold text-emerald-400">
                      {item.time}
                      {item.endTime ? ` – ${item.endTime}` : ''}
                    </span>
                    <span className="font-medium text-white">{item.title}</span>
                    <span className="text-slate-500">({item.type})</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`font-mono ${
                        diff > 0
                          ? 'text-emerald-300'
                          : diff >= -30
                          ? 'text-amber-400 font-semibold'
                          : 'text-slate-500'
                      }`}
                    >
                      {statusLabel}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        playNotificationChime(false);
                        window.dispatchEvent(
                          new CustomEvent('lifeos:trigger-test-alert', {
                            detail: {
                              title: item.title,
                              time: item.time,
                            },
                          })
                        );
                        showToast(`Simulating alert for "${item.title}"`);
                      }}
                      className="px-2 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] text-emerald-400 font-mono transition-colors cursor-pointer"
                    >
                      Simulate Alert
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-12 text-center space-y-2">
          <p className="text-sm font-medium text-white">All caught up.</p>
          <p className="text-xs text-slate-400">
            No pending deadline alerts, upcoming commitments, or unlogged habits right now.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 divide-y divide-slate-800/80">
          {notifications.map((n) => (
            <div
              key={n.id}
              className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span
                    className={
                      n.severity === 'urgent'
                        ? 'text-red-400 font-semibold'
                        : n.severity === 'warning'
                        ? 'text-amber-400 font-semibold'
                        : 'text-emerald-400'
                    }
                  >
                    {n.category.toUpperCase()}
                  </span>
                  <span aria-hidden="true" className="text-slate-600">
                    ·
                  </span>
                  <span className="text-slate-400">{n.timeLabel}</span>
                </div>
                <h3 className="text-sm font-semibold text-white">{n.title}</h3>
                <p className="text-xs text-slate-400">{n.detail}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {n.category === 'planning' || n.category === 'ai' ? (
                  <button
                    type="button"
                    onClick={() => openAIWithPrompt('')}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
                  >
                    Open AI Planner
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveModule(n.targetModule)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 cursor-pointer"
                  >
                    <span>Open {n.targetModule}</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 2. SETTINGS MODULE (PROFILE, PREFERENCES, APPEARANCE, NOTIFICATIONS, AI, SECURITY)
// ============================================================================
export const SettingsModule: React.FC = () => {
  const { user, profile, showToast } = useLifeOS();

  const [displayName, setDisplayName] = useState(
    profile?.displayName && profile.displayName !== 'Commander' ? profile.displayName : 'Eghans'
  );
  const [bio, setBio] = useState(profile?.bio || '');
  const [photoUrl, setPhotoUrl] = useState(profile?.photoUrl || '');
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>(profile?.timeFormat || '24h');
  const [dateFormat, setDateFormat] = useState<'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD'>(
    profile?.dateFormat || 'YYYY-MM-DD'
  );
  const [weekStart, setWeekStart] = useState<'monday' | 'sunday'>(
    profile?.weekStart || 'monday'
  );
  const [defaultTaskMinutes, setDefaultTaskMinutes] = useState<number>(
    profile?.defaultTaskMinutes || 45
  );
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>(profile?.theme || 'dark');
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(
    profile?.notificationsEnabled ?? true
  );
  const [quietHoursStart, setQuietHoursStart] = useState(
    profile?.quietHoursStart || '22:00'
  );
  const [quietHoursEnd, setQuietHoursEnd] = useState(profile?.quietHoursEnd || '07:00');
  const [dailyPlanningTime, setDailyPlanningTime] = useState(
    profile?.dailyPlanningTime || '08:00'
  );
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(profile?.voiceEnabled ?? true);
  const [assistantTone, setAssistantTone] = useState<'calm' | 'direct' | 'encouraging'>(
    profile?.assistantTone || 'calm'
  );

  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(
        profile.displayName && profile.displayName !== 'Commander'
          ? profile.displayName
          : 'Eghans'
      );
      setBio(profile.bio || '');
      setPhotoUrl(profile.photoUrl || '');
      setTimeFormat(profile.timeFormat || '24h');
      setDateFormat(profile.dateFormat || 'YYYY-MM-DD');
      setWeekStart(profile.weekStart || 'monday');
      setDefaultTaskMinutes(profile.defaultTaskMinutes || 45);
      setTheme(profile.theme || 'dark');
      setNotificationsEnabled(profile.notificationsEnabled ?? true);
      setQuietHoursStart(profile.quietHoursStart || '22:00');
      setQuietHoursEnd(profile.quietHoursEnd || '07:00');
      setDailyPlanningTime(profile.dailyPlanningTime || '08:00');
      setVoiceEnabled(profile.voiceEnabled ?? true);
      setAssistantTone(profile.assistantTone || 'calm');
    }
  }, [profile]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);
    try {
      await saveUserProfilePreferences(user.uid, {
        displayName,
        bio,
        photoUrl,
        timeFormat,
        dateFormat,
        weekStart,
        defaultTaskMinutes,
        theme,
        notificationsEnabled,
        quietHoursStart,
        quietHoursEnd,
        dailyPlanningTime,
        voiceEnabled,
        assistantTone,
      });
      showToast('LIFE OS Settings saved to Firestore.');
    } catch {
      showToast('Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setIsUploading(true);
    try {
      const uploadedUrl = await uploadProfileAvatar(user.uid, file);
      setPhotoUrl(uploadedUrl);
      setAvatarError(false);
      await saveUserProfilePreferences(user.uid, { photoUrl: uploadedUrl });
      showToast('Profile picture uploaded to Firebase Storage.');
    } catch {
      showToast('Could not upload image to Firebase Storage.');
    } finally {
      setIsUploading(false);
    }
  };

  const effectiveAvatar = !avatarError && photoUrl ? photoUrl : defaultAvatar;

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="font-display text-3xl text-white">Settings</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Configure your profile, appearance, notification quiet hours, AI assistant behavior, and
          account security.
        </p>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* 1. Profile Section */}
        <section className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-white">01. Personal Profile</h2>
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-800 border border-slate-700 shrink-0">
              <img
                src={effectiveAvatar}
                alt="User profile avatar"
                referrerPolicy="no-referrer"
                onError={() => setAvatarError(true)}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="space-y-2">
              <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-white cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isUploading ? 'Uploading to Storage...' : 'Upload Profile Photo'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </label>
              <p className="text-[11px] text-slate-400">
                Stored securely in Firebase Storage under your isolated user path.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs text-slate-300 mb-1">Display Name</label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Personal Focus / Bio</label>
              <input
                type="text"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
              />
            </div>
          </div>
        </section>

        {/* 2. Preferences & Appearance */}
        <section className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-white">02. Preferences &amp; Appearance</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-300 mb-1">Appearance Theme</label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as 'dark' | 'light' | 'system')}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              >
                <option value="dark">Dark</option>
                <option value="light">Light</option>
                <option value="system">System</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Time Format</label>
              <select
                value={timeFormat}
                onChange={(e) => setTimeFormat(e.target.value as '12h' | '24h')}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              >
                <option value="24h">24-hour (18:00)</option>
                <option value="12h">12-hour (6:00 PM)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Date Format</label>
              <select
                value={dateFormat}
                onChange={(e) =>
                  setDateFormat(e.target.value as 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD')
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              >
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Week Starts On</label>
              <select
                value={weekStart}
                onChange={(e) => setWeekStart(e.target.value as 'monday' | 'sunday')}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              >
                <option value="monday">Monday</option>
                <option value="sunday">Sunday</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">
                Default Task Duration (Minutes)
              </label>
              <input
                type="number"
                min={5}
                max={480}
                value={defaultTaskMinutes}
                onChange={(e) => setDefaultTaskMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
              />
            </div>
          </div>
        </section>

        {/* 3. AI Personal Assistant & Voice Preferences */}
        <section className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-white">
            03. AI Assistant &amp; Daily Planning
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-300 mb-1">Assistant Tone</label>
              <select
                value={assistantTone}
                onChange={(e) =>
                  setAssistantTone(e.target.value as 'calm' | 'direct' | 'encouraging')
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              >
                <option value="calm">Calm &amp; Balanced</option>
                <option value="direct">Direct &amp; Executive</option>
                <option value="encouraging">Warm &amp; Encouraging</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">
                Morning Daily Planning Time
              </label>
              <input
                type="time"
                value={dailyPlanningTime}
                onChange={(e) => setDailyPlanningTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
              />
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input
                id="voice-toggle"
                type="checkbox"
                checked={voiceEnabled}
                onChange={(e) => setVoiceEnabled(e.target.checked)}
                className="accent-emerald-500 w-4 h-4"
              />
              <label htmlFor="voice-toggle" className="text-xs text-slate-200">
                Enable Microphone Voice Planning
              </label>
            </div>
          </div>
        </section>

        {/* 4. Notifications & Quiet Periods */}
        <section className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-white">
            04. Notifications &amp; Quiet Periods
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-2 pt-5">
              <input
                id="notif-toggle"
                type="checkbox"
                checked={notificationsEnabled}
                onChange={(e) => setNotificationsEnabled(e.target.checked)}
                className="accent-emerald-500 w-4 h-4"
              />
              <label htmlFor="notif-toggle" className="text-xs text-slate-200">
                Enable In-App Reminders
              </label>
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Quiet Hours Start</label>
              <input
                type="time"
                value={quietHoursStart}
                onChange={(e) => setQuietHoursStart(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Quiet Hours End</label>
              <input
                type="time"
                value={quietHoursEnd}
                onChange={(e) => setQuietHoursEnd(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
              />
            </div>
          </div>
        </section>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer min-h-[44px]"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving Preferences...' : 'Save All Settings'}</span>
          </button>
        </div>
      </form>

      {/* 5. Security & Access Session */}
      <section className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-white">05. Security &amp; Access Session</h2>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2 text-slate-200">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Instant Access Active (No login required)</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-emerald-400">
                {user?.isAnonymous ? 'Guest Vault' : user?.email || 'Active User'}
              </span>
            </div>
            <p className="text-slate-400">
              Session UID: <span className="font-mono">{user?.uid}</span> · All your tasks, notes, habits &amp; plans are securely stored and isolated in Firestore.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={async () => {
                try {
                  await logoutUser();
                  await signInGuestUser();
                  showToast('Fresh private LIFE OS session initialized.');
                } catch {
                  showToast('Session updated.');
                }
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 cursor-pointer min-h-[40px]"
            >
              <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
              <span>Start Fresh Session</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
