"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface ChartData {
  name: string;
  value: number;
  fill?: string;
}

interface ChartPanelProps {
  title: string;
  data: ChartData[];
  type?: "bar" | "distribution";
}

const COLORS = [
  "var(--primary)",
  "var(--primary-light)",
  "var(--accent)",
  "var(--success)",
  "var(--error)",
];

export function ChartPanel({ title, data, type = "bar" }: ChartPanelProps) {
  if (data.length === 0) {
    return (
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
        <h3 className="font-semibold mb-4">{title}</h3>
        <p className="text-[var(--muted)] text-center py-8">No data available</p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
      <h3 className="font-semibold mb-4">{title}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout={type === "distribution" ? "vertical" : "horizontal"}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            {type === "distribution" ? (
              <>
                <XAxis type="number" stroke="var(--muted)" fontSize={12} />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="var(--muted)"
                  fontSize={12}
                  width={30}
                />
              </>
            ) : (
              <>
                <XAxis
                  dataKey="name"
                  stroke="var(--muted)"
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis stroke="var(--muted)" fontSize={12} />
              </>
            )}
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
              }}
              labelStyle={{ color: "var(--foreground)" }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.fill || COLORS[index % COLORS.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

