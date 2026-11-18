import { BadgeCheck, ShieldCheck, Truck } from 'lucide-react';
import './announcement-bar.css';

const announcements = [
  { text: '500 TL Üzeri Ücretsiz Kargo', Icon: Truck },
  { text: 'Orijinal Koleksiyon Kartları', Icon: BadgeCheck },
  { text: 'Güvenli Ödeme', Icon: ShieldCheck },
];

const REPEATS = 4;

function AnnouncementItems() {
  return (
    <span className="announcement-bar__items" aria-hidden="true">
      {Array.from({ length: REPEATS }).flatMap((_, round) =>
        announcements.map(({ text, Icon }) => (
          <span className="announcement-bar__item" key={`${round}-${text}`}>
            <Icon className="announcement-bar__icon" aria-hidden="true" strokeWidth={1.8} />
            <span>{text}</span>
            <span className="announcement-bar__separator" aria-hidden="true" />
          </span>
        )),
      )}
    </span>
  );
}

export function AnnouncementBar() {
  return (
    <div className="announcement-bar" data-testid="bar-announcement">
      <p className="announcement-bar__sr-only">
        500 TL Üzeri Ücretsiz Kargo. Orijinal Koleksiyon Kartları. Güvenli Ödeme.
      </p>
      <div className="announcement-bar__viewport">
        <div className="announcement-bar__track" data-testid="announcement-track" aria-hidden="true">
          <AnnouncementItems />
          <AnnouncementItems />
        </div>
      </div>
    </div>
  );
}
