import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';
import { PageHeader, Spinner, EmptyState, Badge } from '../components/ui';
import { formatDate } from '../utils/format';

const PortalAnnouncements = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['portalAnnouncements'],
    queryFn: () => api.get('/portal/announcements').then((r) => r.data),
  });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="School notices" subtitle="Everything the school has shared with you" />
      {isLoading ? (
        <Spinner className="mx-auto h-8 w-8" />
      ) : !data || data.announcements.length === 0 ? (
        <EmptyState message="No notices from the school yet" />
      ) : (
        <div className="space-y-3">
          {data.announcements.map((a) => (
            <div key={a.id} className={`card p-4 ${a.isPinned ? 'border-amber-300 bg-amber-50/50' : ''}`}>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold">{a.title}</h3>
                {a.isPinned && <Badge tone="amber">Pinned</Badge>}
                {a.class && <Badge tone="blue">{a.class.name}</Badge>}
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{a.body}</p>
              <p className="mt-2 text-[10px] text-slate-400">{formatDate(a.createdAt)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PortalAnnouncements;
