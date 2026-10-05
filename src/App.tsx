/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  LayoutDashboard,
  CheckSquare,
  FolderKanban,
  Target,
  Calendar,
  FileText,
  Repeat,
  BookOpen,
  Wallet,
  Bell,
  Settings,
  Search,
  Plus,
  Mic,
  Menu,
  X,
  Timer,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LifeOSProvider, useLifeOS } from './context/LifeOSContext';
import avatarEghansImg from './assets/images/avatar_eghans_profile_1790884410325.jpg';
import { AIAssistantPanel } from './components/AIAssistantModal';
import { FocusTimerModal } from './components/FocusTimerModal';
import { GlobalQuickAddModal } from './components/GlobalQuickAddModal';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { LiveTimeAlertManager } from './components/LiveTimeAlertManager';
import { OfflineIndicator } from './components/OfflineIndicator';
import { DashboardView } from './modules/DashboardView';
import { TasksModule, ProjectsModule, GoalsModule } from './modules/TasksProjectsGoalsView';
import { CalendarModule, NotesModule } from './modules/CalendarNotesView';
import {
  HabitsModule,
  LearningModule,
  FinanceModule,
} from './modules/HabitsLearningFinanceView';
import {
  NotificationsModule,
  SettingsModule,
} from './modules/NotificationsSettingsView';
import { ModuleId } from './types/lifeos';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message || 'Unexpected error occurred.' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4">
            <h1 className="text-lg font-semibold text-white">LIFE OS Recovery Notice</h1>
            <p className="text-xs text-slate-300 leading-relaxed break-words">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, message: '' });
                window.location.reload();
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
            >
              Reload LIFE OS
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const NAV_ITEMS: { id: ModuleId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'daily_planning', label: 'AI Daily Planner', icon: Mic },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'projects', label: 'Projects', icon: FolderKanban },
  { id: 'goals', label: 'Goals', icon: Target },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'notes', label: 'Second Brain', icon: FileText },
  { id: 'habits', label: 'Habits', icon: Repeat },
  { id: 'learning', label: 'Learning', icon: BookOpen },
  { id: 'finance', label: 'Finance', icon: Wallet },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const LifeOSWorkspace: React.FC = () => {
  const {
    user,
    profile,
    authReady,
    dataLoading,
    hasPendingWrites,
    activeModule,
    setActiveModule,
    notifications,
    isAIModalOpen,
    setIsAIModalOpen,
    openAIWithPrompt,
    openQuickAdd,
    openFocusTimer,
    setIsSearchOpen,
    toastMessage,
  } = useLifeOS();

  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-300 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono text-slate-400">Initializing LIFE OS...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-300 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono text-slate-400">Opening LIFE OS Workspace...</p>
        </div>
      </div>
    );
  }

  const renderActiveModule = () => {
    if (dataLoading) {
      return (
        <div className="space-y-4 py-8">
          <div className="h-24 rounded-2xl bg-slate-900/70 border border-slate-800 animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-32 rounded-2xl bg-slate-900/70 border border-slate-800 animate-pulse" />
            <div className="h-32 rounded-2xl bg-slate-900/70 border border-slate-800 animate-pulse" />
            <div className="h-32 rounded-2xl bg-slate-900/70 border border-slate-800 animate-pulse" />
          </div>
        </div>
      );
    }

    switch (activeModule) {
      case 'dashboard':
        return <DashboardView />;
      case 'daily_planning':
        return <AIAssistantPanel embedded />;
      case 'tasks':
        return <TasksModule />;
      case 'projects':
        return <ProjectsModule />;
      case 'goals':
        return <GoalsModule />;
      case 'calendar':
        return <CalendarModule />;
      case 'notes':
        return <NotesModule />;
      case 'habits':
        return <HabitsModule />;
      case 'learning':
        return <LearningModule />;
      case 'finance':
        return <FinanceModule />;
      case 'notifications':
        return <NotificationsModule />;
      case 'settings':
        return <SettingsModule />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Top Bar Contract: Strictly 3 zones (Brand wordmark | 5 nav links | Primary actions) */}
      <header className="sticky top-0 z-30 h-14 flex items-center justify-between px-4 sm:px-6 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80">
        {/* Zone 1: Brand Wordmark & Eghans Avatar Badge */}
        <a
          href="#dashboard"
          onClick={(e) => {
            e.preventDefault();
            setActiveModule('dashboard');
          }}
          className="flex items-center gap-2.5 font-display text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0"
        >
          <img
            src={profile?.photoUrl || avatarEghansImg}
            alt="Eghans"
            referrerPolicy="no-referrer"
            className="w-7 h-7 rounded-lg object-cover border border-emerald-500/50"
          />
          <span>LIFE OS</span>
        </a>

        {/* Zone 2: 5 clean text navigation links */}
        <nav className="hidden lg:flex items-center gap-6 text-xs font-medium text-slate-400">
          {(
            [
              { id: 'dashboard', label: 'Dashboard' },
              { id: 'daily_planning', label: 'Daily Plan' },
              { id: 'tasks', label: 'Tasks' },
              { id: 'calendar', label: 'Calendar' },
              { id: 'notes', label: 'Second Brain' },
            ] as const
          ).map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={(e) => {
                e.preventDefault();
                setActiveModule(item.id);
              }}
              className={`hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap ${
                activeModule === item.id ? 'text-white font-semibold' : ''
              }`}
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Zone 3: Primary Actions (Search, + Add, Install PWA) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer whitespace-nowrap min-h-[40px]"
            aria-label="Global Search"
          >
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Search</span>
          </button>

          <button
            type="button"
            onClick={() => openFocusTimer('Deep Focus Session', 45)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer whitespace-nowrap min-h-[40px]"
            aria-label="Open Deep Work Focus Timer"
          >
            <Timer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Focus</span>
          </button>

          <button
            type="button"
            onClick={() => openQuickAdd('task')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition-colors cursor-pointer whitespace-nowrap min-h-[40px]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Container */}
      <div className="flex-1 flex max-w-[1440px] w-full mx-auto">
        {/* Desktop Sidebar Navigation (240px width) */}
        <aside className="hidden md:flex flex-col justify-between w-60 shrink-0 border-r border-slate-800/80 p-4 select-none">
          <div className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeModule === item.id;
              const badgeCount =
                item.id === 'notifications' && notifications.length > 0
                  ? notifications.length
                  : null;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveModule(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer min-h-[40px] ${
                    isActive
                      ? 'bg-slate-900 text-white border border-slate-800'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-emerald-400' : 'text-slate-500'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {badgeCount !== null && (
                    <span className="font-mono text-[11px] text-emerald-400">{badgeCount}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Sidebar AI Assistant Trigger */}
          <div className="pt-4 border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => openAIWithPrompt('')}
              className="w-full py-2.5 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left space-y-1 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between text-xs font-semibold text-emerald-400">
                <span>AI Assistant</span>
                <Mic className="w-3.5 h-3.5" />
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                Speak or type to plan your day
              </p>
            </button>
          </div>
        </aside>

        {/* Main Content Viewport with smooth module transition */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 pb-24 md:pb-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeModule}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            >
              {renderActiveModule()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile Fixed Bottom Tab Bar (Thumb-Zone Navigation, <= 15% sticky cap, >= 44px hitboxes) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 grid grid-cols-5 items-center px-1">
        {(
          [
            { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
            { id: 'tasks', label: 'Tasks', icon: CheckSquare },
            { id: 'daily_planning', label: 'AI Plan', icon: Mic },
            { id: 'calendar', label: 'Calendar', icon: Calendar },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeModule === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveModule(tab.id);
                setMobileDrawerOpen(false);
              }}
              className={`min-h-[44px] min-w-[44px] flex flex-col items-center justify-center transition-colors ${
                isActive ? 'text-emerald-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium tracking-tight mt-1">{tab.label}</span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setMobileDrawerOpen((prev) => !prev)}
          className={`min-h-[44px] min-w-[44px] flex flex-col items-center justify-center ${
            mobileDrawerOpen ? 'text-emerald-400' : 'text-slate-400'
          }`}
        >
          {mobileDrawerOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          <span className="text-[10px] font-medium tracking-tight mt-1">Modules</span>
        </button>
      </nav>

      {/* Mobile Bottom Sheet Drawer for All 12 Modules */}
      {mobileDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-black/70 backdrop-blur-sm flex items-end pb-16">
          <div className="w-full rounded-t-3xl bg-slate-900 border-t border-slate-800 p-5 space-y-4 max-h-[75vh] overflow-y-auto">
            <div className="w-10 h-1.5 bg-slate-700 rounded-full mx-auto" />
            <div className="grid grid-cols-2 gap-2.5">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeModule === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveModule(item.id);
                      setMobileDrawerOpen(false);
                    }}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-medium min-h-[44px] ${
                      isActive
                        ? 'bg-slate-800 border-emerald-500/60 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-300'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* AI Assistant Modal with smooth transition */}
      <AnimatePresence>
        {isAIModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-3xl"
            >
              <AIAssistantPanel onClose={() => setIsAIModalOpen(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Quick Add, Focus Timer, Live Time Alerts & Global Search Modals */}
      <LiveTimeAlertManager />
      <FocusTimerModal />
      <GlobalQuickAddModal />
      <GlobalSearchModal />

      {/* Offline & Firestore Sync Indicator */}
      <OfflineIndicator hasPendingWrites={hasPendingWrites} />

      {/* Toast Notification with smooth slide-up transition */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.22 }}
            className="fixed bottom-20 md:bottom-6 right-4 z-50 px-4 py-2.5 rounded-xl bg-slate-900 border border-emerald-500/50 text-xs font-medium text-emerald-200 shadow-2xl"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function App() {
  return (
    <AppErrorBoundary>
      <LifeOSProvider>
        <LifeOSWorkspace />
      </LifeOSProvider>
    </AppErrorBoundary>
  );
}
