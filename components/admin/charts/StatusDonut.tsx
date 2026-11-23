"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { StatusSlice } from "./data";

/** Listings by status (donut). Empty statuses are left out. */
export default function StatusDonut({ data }: { data: StatusSlice[] }) {
  const slices = data.filter((d) => d.value > 0);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={slices} dataKey="value" nameKey="label" innerRadius="62%" outerRadius="92%" paddingAngle={2} stroke="none">
          {slices.map((s) => (
            <Cell key={s.status} fill={s.color} />
          ))}
        </Pie>
        <Tooltip contentStyle={{ borderRadius: 10, border: "none", boxShadow: "0 8px 28px rgba(13,30,40,0.14)", fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
