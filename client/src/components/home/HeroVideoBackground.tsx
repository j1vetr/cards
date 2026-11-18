import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import './hero-video-background.css';

const VIDEO_ORIGIN = 'https://www.youtube-nocookie.com';
const VIDEO_URL = `${VIDEO_ORIGIN}/embed/ZHhqwBwmRkI?enablejsapi=1&autoplay=1&mute=1&loop=1&playlist=ZHhqwBwmRkI&controls=0&playsinline=1&rel=0&disablekb=1&fs=0`;

export function HeroVideoBackground() {
  const [reducedMotion, setReducedMotion] = useState(true);
  const [paused, setPaused] = useState(false);
  const [playing, setPlaying] = useState(false);
  const playerRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(preference.matches);
    update();
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    setPlaying(false);
    if (paused || reducedMotion) return;
    const receive = (event: MessageEvent) => {
      if (event.origin !== VIDEO_ORIGIN || event.source !== playerRef.current?.contentWindow) return;
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data?.event === 'onStateChange') setPlaying(data.info === 1);
        if (data?.event === 'infoDelivery' && typeof data.info?.playerState === 'number') {
          setPlaying(data.info.playerState === 1);
        }
        if (data?.event === 'onError') setPlaying(false);
      } catch {
        // Ignore unrelated or malformed messages from the embedded player.
      }
    };
    const subscribe = () => {
      const player = playerRef.current?.contentWindow;
      player?.postMessage(JSON.stringify({ event: 'listening', id: 'hero-youtube' }), VIDEO_ORIGIN);
      player?.postMessage(JSON.stringify({ event: 'command', func: 'addEventListener', args: ['onStateChange'] }), VIDEO_ORIGIN);
    };
    window.addEventListener('message', receive);
    const timer = window.setInterval(subscribe, 1000);
    return () => {
      window.removeEventListener('message', receive);
      window.clearInterval(timer);
    };
  }, [paused, reducedMotion]);

  if (reducedMotion) return null;

  return (
    <>
      <div className={`gocards-hero-video${playing ? ' is-playing' : ''}`} aria-hidden="true">
        {!paused && (
          <iframe
            ref={playerRef}
            data-testid="hero-background-video"
            src={VIDEO_URL}
            title="GoCards Arka Plan Videosu"
            allow="autoplay; encrypted-media"
            referrerPolicy="strict-origin-when-cross-origin"
            tabIndex={-1}
          />
        )}
        <div className="gocards-hero-video__shade" />
      </div>
      <button
        type="button"
        className="gocards-hero-video__toggle"
        onClick={() => setPaused(value => !value)}
        aria-label={paused ? 'Arka Plan Videosunu Oynat' : 'Arka Plan Videosunu Durdur'}
        aria-pressed={paused}
        data-testid="button-hero-video"
      >
        {paused ? <Play size={14} aria-hidden="true" /> : <Pause size={14} aria-hidden="true" />}
      </button>
    </>
  );
}
