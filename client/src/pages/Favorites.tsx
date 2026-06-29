import { Header } from '@/components/Header';
import { Heart } from 'lucide-react';

export default function Favorites() {
  return (
    <div style={{ background: '#09090f' }} className="min-h-screen">
      <Header />
      <div className="max-w-md mx-auto px-6 py-32 text-center">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mx-auto mb-5">
          <Heart className="w-8 h-8 text-indigo-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-display)' }}>
          Favorilerim
        </h1>
        <p className="text-zinc-500 text-sm">
          Yakında — beğendiğin kartları buradan takip edebileceksin.
        </p>
      </div>
    </div>
  );
}
