import { useSearch } from 'wouter';
import { useEffect } from 'react';
import { useLocation } from 'wouter';

export default function Store() {
  const search = useSearch();
  const [, navigate] = useLocation();

  useEffect(() => {
    navigate('/kartlar' + (search ? '?' + search : ''), { replace: true });
  }, []);

  return null;
}
