"use client"

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';

const chartTheme = {
  grid: "#262626",
  text: "#737373",
  primary: "#6366f1", // indigo-500
  secondary: "#a855f7", // purple-500
  accent: "#10b981", // emerald-500
  orders: "#c084fc", // purple-400
  background: "rgba(0, 0, 0, 0.9)"
};

export function SalesAreaChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={chartTheme.primary} stopOpacity={0.3}/>
            <stop offset="95%" stopColor={chartTheme.primary} stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={chartTheme.grid} strokeDasharray="3 3" opacity={0.4} />
        <XAxis
          dataKey="name"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: chartTheme.text, fontWeight: 700 }}
          dy={10}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: chartTheme.text, fontWeight: 700 }}
          width={40}
        />
        <Tooltip
          contentStyle={{ 
            backgroundColor: chartTheme.background, 
            backdropFilter: 'blur(16px)', 
            border: '1px solid #333', 
            borderRadius: '16px', 
            padding: '14px 18px',
            boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.4)'
          }}
          itemStyle={{ color: 'white', fontSize: '12px', fontWeight: '900' }}
          labelStyle={{ color: chartTheme.text, fontSize: '10px', fontWeight: 'bold', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.1em' }}
          cursor={{ stroke: chartTheme.primary, strokeWidth: 1.5, strokeDasharray: '4 4' }}
        />
        <Area
          type="monotone"
          dataKey="sales"
          stroke={chartTheme.primary}
          strokeWidth={3}
          fill="url(#colorSales)"
          animationDuration={1500}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function RevenueAreaChart({ data, period, formatCurrency }: { data: any[]; period: string; formatCurrency: (v: number) => string }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
        <defs>
          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={chartTheme.primary} stopOpacity={0.4}/>
            <stop offset="95%" stopColor={chartTheme.primary} stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={chartTheme.grid} strokeDasharray="3 3" opacity={0.3} />
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 10, fill: chartTheme.text, fontWeight: 800 }}
          dy={15}
          interval={period === 'day' ? 3 : 0}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 10, fill: chartTheme.text, fontWeight: 800 }}
          tickFormatter={(value) => formatCurrency(value)}
          width={60}
        />
        <Tooltip
          contentStyle={{ 
            backgroundColor: chartTheme.background, 
            backdropFilter: 'blur(20px)', 
            border: '1px solid #333', 
            borderRadius: '16px', 
            padding: '14px 18px',
            boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.5)'
          }}
          itemStyle={{ color: 'white', fontSize: '13px', fontWeight: '900' }}
          labelStyle={{ color: chartTheme.text, fontSize: '10px', fontWeight: 'bold', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.15em' }}
          formatter={(value) => [formatCurrency(Number(value ?? 0)), 'Net Revenue']}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke={chartTheme.primary}
          strokeWidth={4}
          fillOpacity={1}
          fill="url(#colorRevenue)"
          animationDuration={2000}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function WeekdayBarChart({ data, formatCurrency }: { data: any[]; formatCurrency: (v: number) => string }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid vertical={false} stroke={chartTheme.grid} strokeDasharray="3 3" opacity={0.3} />
        <XAxis
          dataKey="day"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 10, fill: chartTheme.text, fontWeight: 800 }}
          tickFormatter={(value) => value?.toString().toUpperCase()}
          dy={8}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 10, fill: chartTheme.text, fontWeight: 800 }}
          tickFormatter={(value) => formatCurrency(value)}
          width={50}
        />
        <Tooltip
          cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
          contentStyle={{ 
            backgroundColor: chartTheme.background, 
            backdropFilter: 'blur(16px)', 
            border: '1px solid #333', 
            borderRadius: '16px', 
            padding: '12px 16px',
            boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.4)'
          }}
          itemStyle={{ color: chartTheme.accent, fontSize: '13px', fontWeight: '900' }}
          labelStyle={{ color: chartTheme.text, fontSize: '10px', fontWeight: 'bold', marginBottom: '4px', textTransform: 'uppercase' }}
          formatter={(value) => [formatCurrency(Number(value ?? 0)), 'Daily Sales']}
        />
        <Bar dataKey="revenue" radius={[8, 8, 0, 0]} animationDuration={1500}>
          {data.map((_, index) => (
             <Cell key={`cell-${index}`} fill={index % 2 === 0 ? chartTheme.accent : "#059669"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function OrdersBarChart({ data, period }: { data: any[]; period: string }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid vertical={false} stroke={chartTheme.grid} strokeDasharray="3 3" opacity={0.3} />
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 10, fill: chartTheme.text, fontWeight: 800 }}
          tickFormatter={(value) => value?.toString().toUpperCase()}
          dy={8}
          interval={period === 'day' ? 3 : 0}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 10, fill: chartTheme.text, fontWeight: 800 }}
          allowDecimals={false}
          width={30}
        />
        <Tooltip
          cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
          contentStyle={{ 
            backgroundColor: chartTheme.background, 
            backdropFilter: 'blur(16px)', 
            border: '1px solid #333', 
            borderRadius: '16px', 
            padding: '12px 16px',
            boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.4)'
          }}
          itemStyle={{ color: chartTheme.orders, fontSize: '13px', fontWeight: '900' }}
          labelStyle={{ color: chartTheme.text, fontSize: '10px', fontWeight: 'bold', marginBottom: '4px', textTransform: 'uppercase' }}
          formatter={(value) => [Number(value ?? 0), 'Orders Completed']}
        />
        <Bar dataKey="orders" fill={chartTheme.orders} radius={[8, 8, 0, 0]} animationDuration={1800} />
      </BarChart>
    </ResponsiveContainer>
  );
}
