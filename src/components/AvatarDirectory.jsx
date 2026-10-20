import { useContext, useEffect } from 'react';
import { AvatarContext } from '../lib/avatar-context';
import { useResource } from '../lib/hooks';

// Share one signed-URL request across all identities on a page, including repeated cards.
export default function AvatarDirectory({ profiles = [], children }) {
 const ids = [...new Set(profiles.filter(p => p.avatar_path).map(p => p.id))].sort();
 const batches = [];
 for (let i = 0; i < ids.length; i += 100) batches.push(ids.slice(i, i + 100).join(','));
 if (!batches.length) batches.push('');
 return batches.reduceRight((content, ids, index) => <AvatarBatch key={index} ids={ids}>{content}</AvatarBatch>, children);
}
function AvatarBatch({ ids, children }) {
 const parent = useContext(AvatarContext);
 const source = useResource(ids ? `/profiles/avatars?ids=${ids}` : null);
 const reload = source.reload;
 useEffect(() => {
  if (!ids) return;
  const timer = setInterval(reload, 12 * 60 * 1000);
  const visible = () => { if (document.visibilityState === 'visible') reload(); };
  document.addEventListener('visibilitychange', visible);
  return () => { clearInterval(timer); document.removeEventListener('visibilitychange', visible); };
 }, [reload, ids]);
 return <AvatarContext.Provider value={{ ...parent, ...source.data }}>{children}</AvatarContext.Provider>;
}
