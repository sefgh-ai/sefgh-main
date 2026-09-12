import { Activity, AlertTriangle, CheckCircle2, Clock, Server, Wifi } from "lucide-react";
import AppFooter from "@/components/ui/app-footer";

const services = [
  {
    name: "Realtime Search API",
    status: "operational",
    uptime: "99.97%",
    lastIncident: "2026-03-10",
    description: "Core API powering semantic and keyword search requests.",
    icon: Activity,
  },
  {
    name: "Auth & Identity",
    status: "operational",
    uptime: "99.99%",
    lastIncident: "2026-02-21",
    description: "Login, signup, SSO, and token refresh flows.",
    icon: CheckCircle2,
  },
  {
    name: "Vector Indexing",
    status: "degraded",
    uptime: "99.61%",
    lastIncident: "2026-03-28",
    description: "Embedding updates and background refresh jobs.",
    icon: Server,
  },
  {
    name: "Notifications",
    status: "maintenance",
    uptime: "99.80%",
    lastIncident: "Scheduled",
    description: "Email and in-app notifications for saved searches.",
    icon: Wifi,
  },
];

const incidents = [
  {
    date: "Mar 28, 2026",
    severity: "minor",
    title: "Delayed embedding refresh",
    impact: "Some trending results were stale for ~24 minutes.",
    status: "Resolved",
  },
  {
    date: "Mar 14, 2026",
    severity: "maintenance",
    title: "Planned search model rollout",
    impact: "Brief read-only window during deployment (6 minutes).",
    status: "Completed",
  },
];

const metrics = [
  { label: "Uptime (30d)", value: "99.93%", trend: "+0.04%" },
  { label: "Median latency", value: "182 ms", trend: "-6 ms" },
  { label: "Requests past 24h", value: "4.2M", trend: "+3%" },
  { label: "Error rate", value: "0.08%", trend: "-0.02%" },
];

export const metadata = {
  title: "Status | SEFGH",
  description: "Live service health, uptime, and incident history for SEFGH.",
};

function StatusBadge({ status }) {
  const variants = {
    operational: "bg-emerald-500/10 text-emerald-200 border-emerald-500/40",
    degraded: "bg-warning/10 text-warning border-amber-500/40",
    maintenance: "bg-primary/10 text-primary border-blue-500/40",
  };
  const labels = {
    operational: "Operational",
    degraded: "Degraded",
    maintenance: "Maintenance",
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-sm font-medium border inline-flex items-center gap-2 ${variants[status]}`}
    >
      <span className="h-2 w-2 rounded-full bg-current" />
      {labels[status]}
    </span>
  );
}

export default function StatusPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        <header className="space-y-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-sm font-medium">
            <CheckCircle2 className="h-4 w-4" />
            All systems monitored
          </div>
          <h1 className="text-4xl md:text-5xl font-bold">SEFGH Status</h1>
          <p className="text-muted-foreground">
            Real-time service health, historical uptime, and current incidents.
          </p>
          <p className="text-xs text-muted-foreground">Updated every 5 minutes</p>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="p-4 rounded-xl border border-border bg-card/70 backdrop-blur"
            >
              <p className="text-sm text-muted-foreground">{metric.label}</p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-semibold">{metric.value}</span>
                <span className="text-sm text-emerald-400">{metric.trend}</span>
              </div>
            </div>
          ))}
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-2xl font-semibold">Service status</h2>
              <p className="text-muted-foreground text-sm">
                Uptime and recent history for core components.
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Last updated just now
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {services.map(({ name, status, uptime, lastIncident, description, icon: Icon }) => (
              <div
                key={name}
                className="p-5 rounded-xl border border-border bg-card/70 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{name}</p>
                      <p className="text-sm text-muted-foreground">{description}</p>
                    </div>
                  </div>
                  <StatusBadge status={status} />
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="px-3 py-1 rounded-lg bg-muted/70 border border-border">Uptime {uptime}</span>
                  <span className="text-muted-foreground">Last incident: {lastIncident}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-300" />
            <h2 className="text-2xl font-semibold">Recent incidents</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {incidents.map(({ date, severity, title, impact, status }) => (
              <div
                key={`${date}-${title}`}
                className="p-5 rounded-xl border border-border bg-card/70 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-muted-foreground">{date}</p>
                  <span className="px-2 py-1 text-xs rounded-full border border-border text-foreground">
                    {status}
                  </span>
                </div>
                <p className="font-semibold">{title}</p>
                <p className="text-sm text-muted-foreground">{impact}</p>
                <span
                  className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${
                    severity === "minor"
                      ? "bg-warning/10 text-warning border-amber-500/40"
                      : "bg-primary/10 text-primary border-blue-500/40"
                  }`}
                >
                  {severity === "minor" ? "Minor" : "Maintenance"}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <AppFooter />
    </main>
  );
}
