import { useEffect, useState } from "react";
import axiosClient from "../api/axiosClient";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { TrendingUp, PieChart as PieIcon, BarChart3, Loader2 } from "lucide-react";

// Theme colors (match the design tokens)
const C = {
  present: "#4ade80", absent: "#f87171", late: "#fbbf24",
  grid: "rgba(196,205,224,0.08)", axis: "#667085", violet: "#b4a8ff", cyan: "#67dfe8",
};

const tooltipStyle = {
  background: "rgba(12,18,32,0.96)",
  border: "1px solid rgba(196,205,224,0.15)",
  borderRadius: 10,
  fontSize: 12,
  color: "#f5f7fb",
};

const Panel = ({ icon: Icon, title, children, sub }) => (
  <div className="card">
    <div className="mb-4 flex items-center gap-2">
      <Icon className="h-4 w-4" style={{ color: C.violet }} />
      <h3 className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>{title}</h3>
      {sub && <span className="ml-auto text-[11px]" style={{ color: "var(--text-3)" }}>{sub}</span>}
    </div>
    {children}
  </div>
);

const AnalyticsCharts = () => {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    axiosClient.get("admin/analytics/?weeks=8")
      .then(r => setData(r.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 lg:grid-cols-3">
        {[0, 1, 2].map(i => <div key={i} className="skeleton h-64 rounded-[var(--radius-lg)]" />)}
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="card text-center text-sm" style={{ color: "var(--text-3)" }}>
        Impossible de charger les statistiques pour le moment.
      </div>
    );
  }

  const dist = data.status_distribution || {};
  const pieData = [
    { name: "Présent",   value: dist.present || 0, color: C.present },
    { name: "Absent",    value: dist.absent  || 0, color: C.absent  },
    { name: "En retard", value: dist.late    || 0, color: C.late    },
  ].filter(d => d.value > 0);

  const filiereData = (data.by_filiere || []).slice(0, 6);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>
          Statistiques de présence
        </h2>
        <span className="badge badge-violet">{data.total_records} enregistrements</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Weekly trend — spans 2 cols */}
        <div className="lg:col-span-2">
          <Panel icon={TrendingUp} title="Tendance hebdomadaire" sub={`${data.weeks} dernières semaines`}>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={data.trend} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="gP" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.present} stopOpacity={0.5} />
                    <stop offset="100%" stopColor={C.present} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.absent} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={C.absent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
                <XAxis dataKey="week" stroke={C.axis} fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke={C.axis} fontSize={11} tickLine={false} axisLine={false} width={36} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: C.grid }} />
                <Legend wrapperStyle={{ fontSize: 11, color: C.axis }} />
                <Area type="monotone" dataKey="present" name="Présent" stroke={C.present} fill="url(#gP)" strokeWidth={2} />
                <Area type="monotone" dataKey="absent"  name="Absent"  stroke={C.absent}  fill="url(#gA)" strokeWidth={2} />
                <Area type="monotone" dataKey="late"    name="En retard" stroke={C.late} fill="none" strokeWidth={2} strokeDasharray="4 3" />
              </AreaChart>
            </ResponsiveContainer>
          </Panel>
        </div>

        {/* Status distribution donut */}
        <Panel icon={PieIcon} title="Répartition globale">
          {pieData.length === 0 ? (
            <div className="flex h-[240px] items-center justify-center text-xs" style={{ color: "var(--text-3)" }}>
              Aucune donnée
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                     innerRadius={52} outerRadius={84} paddingAngle={3} stroke="none">
                  {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11, color: C.axis }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Panel>
      </div>

      {/* Per-filière attendance rate */}
      <Panel icon={BarChart3} title="Taux de présence par filière" sub="les plus faibles en premier">
        {filiereData.length === 0 ? (
          <div className="flex h-[200px] items-center justify-center text-xs" style={{ color: "var(--text-3)" }}>
            Aucune donnée
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(180, filiereData.length * 42)}>
            <BarChart data={filiereData} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.grid} horizontal={false} />
              <XAxis type="number" domain={[0, 100]} stroke={C.axis} fontSize={11} tickLine={false} axisLine={false} unit="%" />
              <YAxis type="category" dataKey="filiere" stroke={C.axis} fontSize={11} tickLine={false} axisLine={false} width={70} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(196,205,224,0.04)" }}
                       formatter={(v) => [`${v}%`, "Taux de présence"]} />
              <Bar dataKey="rate" radius={[0, 6, 6, 0]} barSize={18}>
                {filiereData.map((d, i) => (
                  <Cell key={i} fill={d.rate >= 75 ? C.present : d.rate >= 50 ? C.late : C.absent} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Panel>
    </div>
  );
};

export default AnalyticsCharts;
