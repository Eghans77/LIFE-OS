import React, { useState } from 'react';
import { Lock, Mail, User as UserIcon, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  loginWithEmail,
  registerWithEmail,
  resetUserPassword,
} from '../lib/firebase';
import authSanctuaryImg from '../assets/images/auth_sanctuary_visual_1790884391551.jpg';
import avatarEghansImg from '../assets/images/avatar_eghans_profile_1790884410325.jpg';

export const AuthScreen: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email.trim()) {
      setErrorMsg('Please enter your email address.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'reset') {
        await resetUserPassword(email);
        setSuccessMsg('Password reset link sent to your email.');
      } else if (mode === 'register') {
        if (password.length < 6) {
          setErrorMsg('Password must be at least 6 characters.');
          setLoading(false);
          return;
        }
        await registerWithEmail(email, password, displayName || 'Eghans');
      } else {
        await loginWithEmail(email, password);
      }
    } catch (err: unknown) {
      const code = err instanceof Error ? err.message : String(err);
      if (
        code.includes('invalid-credential') ||
        code.includes('wrong-password') ||
        code.includes('user-not-found')
      ) {
        setErrorMsg('Invalid email or password.');
      } else if (code.includes('email-already-in-use')) {
        setErrorMsg('An account with this email already exists.');
      } else {
        setErrorMsg('Unable to sign in. Please check your credentials and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient background visual with deep overlay */}
      <div className="absolute inset-0 pointer-events-none">
        <img
          src={authSanctuaryImg}
          alt="LIFE OS Sanctuary"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover opacity-20 scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/90 to-slate-950" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md rounded-2xl bg-slate-900/95 border border-slate-800 overflow-hidden shadow-2xl"
      >
        {/* Visual Hero Header Banner inside Auth Card */}
        <div className="relative h-36 w-full overflow-hidden border-b border-slate-800">
          <img
            src={authSanctuaryImg}
            alt="LIFE OS Personal Command Sanctuary"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/45 to-transparent" />
          <div className="absolute bottom-3 left-6 right-6 flex items-end justify-between">
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-white">
                LIFE OS
              </h1>
              <p className="text-xs text-slate-300">
                {mode === 'login'
                  ? 'Sign in with your email and password'
                  : mode === 'register'
                  ? 'Create your account'
                  : 'Reset your password'}
              </p>
            </div>
            <img
              src={avatarEghansImg}
              alt="Eghans Profile Emblem"
              referrerPolicy="no-referrer"
              className="w-11 h-11 rounded-xl border border-emerald-500/50 object-cover shadow-lg"
            />
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-5">
          <AnimatePresence mode="wait">
            {errorMsg && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="p-3 rounded-xl bg-red-950/60 border border-red-800/60 text-xs text-red-200 flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </motion.div>
            )}

            {successMsg && (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-xs text-emerald-200 flex items-start gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleEmailAuth} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Name</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Eghans"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {mode !== 'reset' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-300">Password</label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('reset');
                        setErrorMsg(null);
                        setSuccessMsg(null);
                      }}
                      className="text-xs text-emerald-400 hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors cursor-pointer min-h-[44px]"
            >
              {loading
                ? 'Please wait...'
                : mode === 'login'
                ? 'Sign In'
                : mode === 'register'
                ? 'Create Account'
                : 'Send Reset Link'}
            </button>
          </form>

          <div className="pt-3 border-t border-slate-800 text-center text-xs text-slate-400">
            {mode === 'login' ? (
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="text-emerald-400 hover:underline font-medium"
              >
                Create an account
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="text-emerald-400 hover:underline font-medium"
              >
                Back to Sign In
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
