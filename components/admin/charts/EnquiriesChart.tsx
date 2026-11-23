"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHANNEL_SERIES, type EnquiryDay } from "./data";

/** Enquiries per day, stacked by channel. */
export default function EnquiriesChart({ data }: { data: EnquiryDay[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -24 }} barCategoryGap="22%">
        <CartesianGrid vertical={false} stroke="#e2e7eb" strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: "#8a949d" }}
          interval="preserveStartEnd"
          minTickGap={14}
        />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#8a949d" }} />
        <Tooltip
          cursor={{ fill: "rgba(31,157,85,0.06)" }}
          contentStyle={{ borderRadius: 10, border: "none", boxShadow: "0 8px 28px rgba(13,30,40,0.14)", fontSize: 12 }}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        {CHANNEL_SERIES.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            stackId="enq"
            fill={s.color}
            radius={i === CHANNEL_SERIES.length - 1 ? [4, 4, 0, 0] : 0}
            maxBarSize={18}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
