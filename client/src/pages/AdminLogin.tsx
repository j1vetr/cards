import { useState } from 'react';
import { useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { Lock, User, Loader2 } from 'lucide-react';

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      if (!response.ok) throw new Error('Login failed');
      return response.json();
    },
    onSuccess: () => setLocation('/toov-admin'),
    onError: () => setError('Kullanıcı adı veya şifre hatalı.'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    loginMutation.mutate({ username, password });
  };

  const isPending = loginMutation.isPending;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5 py-10 relative overflow-hidden"
      style={{ background: '#0a0c10' }}
    >
      {/* Subtle grid background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(hsl(220 30% 100% / 0.03) 1px, transparent 1px), linear-gradient(90deg, hsl(220 30% 100% / 0.03) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      {/* Glow */}
      <div
        className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, hsl(195 100% 50% / 0.07) 0%, transparent 70%)' }}
      />

      <div className="relative w-full max-w-[400px] flex flex-col items-center">

        {/* TOOV Logo */}
        <div className="mb-8 w-full max-w-[220px]">
          <img
            src="/toov-logo.png"
            alt="TOOV"
            className="w-full h-auto select-none"
            draggable={false}
          />
        </div>

        {/* Brand label */}
        <div className="flex flex-col items-center gap-1 mb-8 text-center">
          <p
            className="text-[11px] font-semibold tracking-[0.30em] uppercase"
            style={{ color: 'hsl(195 100% 55%)' }}
          >
            Ecarte Jeans
          </p>
          <h1
            className="text-white text-[22px] font-semibold tracking-tight"
            data-testid="text-brand"
          >
            Yönetim Paneli
          </h1>
        </div>

        {/* Login card */}
        <div
          className="w-full rounded-2xl p-6 space-y-4"
          style={{
            background: 'hsl(220 20% 10%)',
            border: '1px solid hsl(220 20% 18%)',
          }}
        >
          {error && (
            <div
              className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-[13px]"
              style={{
                background: 'hsl(0 55% 13%)',
                border: '1px solid hsl(0 55% 23%)',
                color: 'hsl(0 80% 72%)',
              }}
              role="alert"
              data-testid="text-error"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
            {/* Username */}
            <div className="space-y-1.5">
              <label
                htmlFor="username"
                className="block text-[11px] font-medium tracking-[0.10em] uppercase"
                style={{ color: 'hsl(220 15% 50%)' }}
              >
                Kullanıcı Adı
              </label>
              <div className="relative">
                <User
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: 'hsl(220 15% 38%)' }}
                  strokeWidth={1.5}
                />
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isPending}
                  required
                  placeholder="admin"
                  className="w-full h-11 pl-10 pr-4 text-[14px] rounded-xl transition-colors focus:outline-none disabled:opacity-50"
                  style={{
                    background: 'hsl(220 20% 14%)',
                    border: '1px solid hsl(220 20% 22%)',
                    color: 'white',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'hsl(195 100% 45%)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'hsl(220 20% 22%)'; }}
                  data-testid="input-username"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-[11px] font-medium tracking-[0.10em] uppercase"
                style={{ color: 'hsl(220 15% 50%)' }}
              >
                Şifre
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: 'hsl(220 15% 38%)' }}
                  strokeWidth={1.5}
                />
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isPending}
                  required
                  placeholder="••••••••"
                  className="w-full h-11 pl-10 pr-4 text-[14px] rounded-xl transition-colors focus:outline-none disabled:opacity-50"
                  style={{
                    background: 'hsl(220 20% 14%)',
                    border: '1px solid hsl(220 20% 22%)',
                    color: 'white',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'hsl(195 100% 45%)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'hsl(220 20% 22%)'; }}
                  data-testid="input-password"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isPending}
              className="w-full h-11 rounded-xl text-[13px] font-semibold tracking-wide transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-1 flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg, hsl(195 100% 40%) 0%, hsl(195 100% 30%) 100%)',
                color: '#fff',
                boxShadow: '0 4px 20px hsl(195 100% 50% / 0.20)',
              }}
              data-testid="button-login"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Giriş Yap'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p
          className="mt-6 text-[11px] text-center"
          style={{ color: 'hsl(220 15% 28%)' }}
        >
          TOOV · Ecarte Jeans © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
