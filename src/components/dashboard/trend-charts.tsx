'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { useMemo } from 'react';

interface TrendChartsProps {
  data: any[];
}

const COLORS = [
  '#2563eb', // Blue 600
  '#dc2626', // Red 600
  '#16a34a', // Green 600
  '#d97706', // Amber 600
  '#7c3aed', // Violet 600
  '#db2777', // Pink 600
  '#0891b2', // Cyan 600
  '#4b5563', // Gray 600
];

export function TrendCharts({ data }: TrendChartsProps) {
  // Extract brand names from the data keys
  const brands = useMemo(() => {
    if (data.length === 0) return [];
    const keys = Object.keys(data[0]);
    return keys.filter(k => k !== 'date' && !k.endsWith('_rank'));
  }, [data]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg shadow-md p-3 text-xs">
          <p className="font-bold mb-1 border-b pb-1">{label}</p>
          <div className="space-y-1 mt-1">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex justify-between gap-4">
                <span style={{ color: entry.color }} className="font-medium">
                  {entry.name}:
                </span>
                <span className="font-bold">{entry.value}%</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  const RankTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg shadow-md p-3 text-xs">
          <p className="font-bold mb-1 border-b pb-1">{label}</p>
          <div className="space-y-1 mt-1">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex justify-between gap-4">
                <span style={{ color: entry.color }} className="font-medium">
                  {entry.name?.replace('_rank', '')}:
                </span>
                <span className="font-bold">{entry.value === null ? 'N/A' : entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Mention Rate Trend (%)</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis 
                dataKey="date" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
                minTickGap={30}
              />
              <YAxis 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" height={36}/>
              {brands.map((brand, i) => (
                <Line
                  key={brand}
                  type="monotone"
                  dataKey={brand}
                  name={brand}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Average Rank Trend</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis 
                dataKey="date" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
                minTickGap={30}
              />
              <YAxis 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
                reversed={true} // Lower rank is better
                domain={[1, 'auto']}
              />
              <Tooltip content={<RankTooltip />} />
              <Legend verticalAlign="top" height={36}/>
              {brands.map((brand, i) => (
                <Line
                  key={`${brand}_rank`}
                  type="stepAfter"
                  dataKey={`${brand}_rank`}
                  name={brand}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  connectNulls={true}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
