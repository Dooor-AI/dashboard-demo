import { prisma } from '@/lib/db';

async function getStats() {
  try {
    const [totalSessions, totalMessages, recentSessions] = await Promise.all([
      prisma.chatSession.count(),
      prisma.chatMessage.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      prisma.chatSession.findMany({
        take: 5,
        orderBy: { updatedAt: 'desc' },
        include: {
          _count: { select: { messages: true } },
        },
      }),
    ]);

    return { totalSessions, totalMessages, recentSessions, error: null };
  } catch {
    return {
      totalSessions: 0,
      totalMessages: 0,
      recentSessions: [],
      error: 'Database not connected. Visit /api/setup to initialize.',
    };
  }
}

function MetricCard({
  label,
  value,
  delta,
  icon,
}: {
  label: string;
  value: string | number;
  delta?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="p-2 bg-zinc-800 rounded-lg">{icon}</div>
        {delta && (
          <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">
            {delta}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-zinc-100 mb-1">{value}</p>
      <p className="text-sm text-zinc-500">{label}</p>
    </div>
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export default async function DashboardPage() {
  const { totalSessions, totalMessages, recentSessions, error } = await getStats();

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-100">Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Platform overview and activity metrics
        </p>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <p className="text-sm text-amber-400">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard
          label="Total Chat Sessions"
          value={totalSessions}
          delta="+12%"
          icon={
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-emerald-400"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          }
        />
        <MetricCard
          label="Messages Today"
          value={totalMessages}
          delta="+8%"
          icon={
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-emerald-400"
            >
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
          }
        />
        <MetricCard
          label="Avg Response Time"
          value="1.2s"
          delta="-5%"
          icon={
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-emerald-400"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          }
        />
        <MetricCard
          label="Active Users"
          value="24"
          delta="+3"
          icon={
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-emerald-400"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-zinc-300 mb-6">Message Volume - Last 7 Days</h2>
          <SimpleBarChart />
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-zinc-300 mb-4">Recent Sessions</h2>

          {recentSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10">
              <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center mb-3">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-zinc-600"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <p className="text-sm text-zinc-600">No activity yet</p>
              <p className="text-xs text-zinc-700 mt-1">Start a chat to see sessions here</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {recentSessions.map((session) => (
                <li
                  key={session.id}
                  className="flex items-start gap-3 py-2 border-b border-zinc-800 last:border-0"
                >
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-emerald-400"
                    >
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-300 truncate">{session.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-zinc-600">{session._count.messages} messages</span>
                      <span className="text-zinc-700">-</span>
                      <span className="text-xs text-zinc-600">{formatDate(session.updatedAt)}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function SimpleBarChart() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const values = [42, 78, 55, 91, 63, 38, 85];
  const maxVal = Math.max(...values);

  return (
    <div className="flex items-end gap-2 h-40">
      {days.map((day, i) => {
        const heightPercent = (values[i] / maxVal) * 100;
        return (
          <div key={day} className="flex-1 flex flex-col items-center gap-2">
            <div className="w-full flex items-end justify-center h-32">
              <div
                className="w-full rounded-t-sm bg-emerald-500/30 hover:bg-emerald-500/50 transition-colors relative group cursor-default"
                style={{ height: `${heightPercent}%` }}
              >
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs text-zinc-400 whitespace-nowrap">{values[i]}</span>
                </div>
                <div
                  className="w-full rounded-t-sm bg-emerald-500"
                  style={{ height: '3px', position: 'absolute', top: 0 }}
                />
              </div>
            </div>
            <span className="text-xs text-zinc-600">{day}</span>
          </div>
        );
      })}
    </div>
  );
}
