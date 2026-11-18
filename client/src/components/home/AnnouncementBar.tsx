import { useState } from 'react';
import { BadgeCheck, Pause, Play, ShieldCheck, Truck } from 'lucide-react';
import './announcement-bar.css';

const announcements = [
  { text: '500 TL Üzeri Ücretsiz Kargo', Icon: Truck },
  { text: 'Orijinal Koleksiyon Kartları', Icon: BadgeCheck },
  { text: 'Güvenli Ödeme', Icon: ShieldCheck },
];

function AnnouncementItems({ decorative = false }: { decorative?: boolean }) {
  return (
    <span className="announcement-bar__items" aria-hidden={decorative || undefined}>
      {announcements.map(({ text, Icon }) => (
        <span className="announcement-bar__item" key={text}>
          <Icon className="announcement-bar__icon" aria-hidden="true" strokeWidth={1.7} />
          <span>{text}</span>
          <span className="announcement-bar__separator" aria-hidden="true" />
        </span>
      ))}
    </span>
  );
}

export function AnnouncementBar() {
  const [paused, setPaused] = useState(false);

  return (
    <div
      className="announcement-bar"
      data-testid="bar-announcement"
    >
      <p className="announcement-bar__sr-only">
        500 TL Üzeri Ücretsiz Kargo. Orijinal Koleksiyon Kartları. Güvenli Ödeme.
      </p>
      <div
        className={`announcement-bar__viewport${paused ? ' is-paused' : ''}`}
      >
        <div className="announcement-bar__track" data-testid="announcement-track" aria-hidden="true">
          <AnnouncementItems decorative />
          <AnnouncementItems decorative />
        </div>
      </div>
      <button
        className="announcement-bar__toggle"
        type="button"
        onClick={() => setPaused((current) => !current)}
        aria-label={paused ? 'Duyuru akışını başlat' : 'Duyuru akışını duraklat'}
        aria-pressed={paused}
      >
        {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
      </button>
    </div>
  );
}
