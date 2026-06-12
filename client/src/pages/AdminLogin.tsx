import { useState } from 'react';
import { useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { Shield, Lock, User } from 'lucide-react';

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
    onError: () => setError('Hatalı kullanıcı adı veya şifre'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    loginMutation.mutate({ username, password });
  };

  const isPending = loginMutation.isPending;

  return (
    <div className="min-h-screen flex" style={{ background: 'hsl(220 18% 8%)' }}>
      {/* Left decorative panel */}
      <div
        className="hidden lg:flex flex-col justify-between w-[420px] shrink-0 p-10"
        style={{ background: 'hsl(220 65% 36%)' }}
      >
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-white/80" strokeWidth={1.5} />
          <span className="text-white/60 text-[11px] tracking-[0.2em] uppercase font-medium">Güvenli Erişim</span>
        </div>
        <div>
          <p className="text-white/30 text-[11px] tracking-[0.25em] uppercase mb-4">Ecarte Jeans</p>
          <h2
            className="font-display text-white leading-tight mb-4"
            style={{ fontSize: 'clamp(36px, 4vw, 52px)', letterSpacing: '-0.02em' }}
          >
            Yönetim<br />Paneli
          </h2>
          <p className="text-white/50 text-[13px] leading-relaxed max-w-[260px]">
            Ürünler, siparişler ve site ayarlarını buradan yönetirsin.
          </p>
        </div>
        <p className="text-white/25 text-[11px]">TOOV Panel v2 © 2026</p>
      </div>

      {/* Right login panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-[380px]">
          {/* Badge */}
          <div className="flex items-center gap-2 mb-8">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'hsl(220 65% 36%)' }}
            >
              <Shield className="w-4 h-4 text-white" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-white text-[13px] font-semibold tracking-wide">TOOV Panel</p>
              <p className="text-white/30 text-[10px] tracking-[0.15em] uppercase">v2 — Admin</p>
            </div>
          </div>

          <h1 className="text-white text-2xl font-semibold mb-1" data-testid="text-brand">
            Hoş geldin
          </h1>
          <p className="text-white/40 text-[13px] mb-8">
            Devam etmek için yönetici hesabınla giriş yap.
          </p>

          {/* Card */}
          <div
            className="rounded-2xl p-6 space-y-4"
            style={{ background: 'hsl(220 18% 12%)', border: '1px solid hsl(220 18% 18%)' }}
          >
            {error && (
              <div
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-[13px]"
                style={{ background: 'hsl(0 60% 15%)', border: '1px solid hsl(0 60% 25%)', color: 'hsl(0 80% 70%)' }}
                role="alert"
                data-testid="text-error"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <label htmlFor="username" className="block text-[11px] font-medium tracking-[0.08em] uppercase" style={{ color: 'hsl(220 15% 55%)' }}>
                  Kullanıcı Adı
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'hsl(220 15% 40%)' }} strokeWidth={1.5} />
                  <input
                    id="username"
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={isPending}
                    required
                    placeholder="admin"
                    className="w-full h-11 pl-10 pr-4 text-[14px] rounded-lg transition-all focus:outline-none disabled:opacity-50"
                    style={{
                      background: 'hsl(220 18% 16%)',
                      border: '1px solid hsl(220 18% 22%)',
                      color: 'white',
                    }}
                    data-testid="input-username"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="block text-[11px] font-medium tracking-[0.08em] uppercase" style={{ color: 'hsl(220 15% 55%)' }}>
                  Şifre
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'hsl(220 15% 40%)' }} strokeWidth={1.5} />
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isPending}
                    required
                    placeholder="••••••••"
                    className="w-full h-11 pl-10 pr-4 text-[14px] rounded-lg transition-all focus:outline-none disabled:opacity-50"
                    style={{
                      background: 'hsl(220 18% 16%)',
                      border: '1px solid hsl(220 18% 22%)',
                      color: 'white',
                    }}
                    data-testid="input-password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full h-11 rounded-lg text-[13px] font-semibold tracking-wide text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                style={{ background: 'hsl(220 65% 36%)' }}
                data-testid="button-login"
              >
                {isPending ? (
                  <span className="flex items-center justify-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-white/80 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                ) : 'Giriş Yap'}
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-[11px]" style={{ color: 'hsl(220 15% 35%)' }}>
            Yetkisiz erişim girişimleri kayıt altına alınır.
          </p>
        </div>
      </div>
    </div>
  );
}
