import { useEffect, useState } from 'react';
import type { CardSetPublic } from '@/hooks/useTcg';
import { getRiftboundSetAssets } from '@shared/riftboundSets';

type SetLogoProps = {
  set: CardSetPublic;
  game: 'pokemon' | 'riftbound';
  className?: string;
  imageClassName?: string;
  nameClassName?: string;
};

export function SetLogo({ set, game, className = '', imageClassName = '', nameClassName = '' }: SetLogoProps) {
  const assets = game === 'riftbound' ? getRiftboundSetAssets(set.slug) : null;
  const fallback = game === 'pokemon' ? '/icon-pokemon.svg' : '/icon-riftbound.svg';
  const candidates = [assets?.logo, set.logo_url, fallback].filter((src): src is string => Boolean(src));
  const [candidateIndex, setCandidateIndex] = useState(0);

  useEffect(() => {
    setCandidateIndex(0);
  }, [set.id, candidates.join('|')]);

  return (
    <span className={`inline-flex min-w-0 items-center gap-2 ${className}`}>
      {candidateIndex < candidates.length && (
        <img
          src={candidates[candidateIndex]}
          alt=""
          aria-hidden="true"
          className={`shrink-0 object-contain ${imageClassName}`}
          onError={() => setCandidateIndex(index => index + 1)}
        />
      )}
      <span className={`min-w-0 truncate ${nameClassName}`}>{set.name}</span>
    </span>
  );
}
