import React, { useState } from 'react';
import {
  BarChart, Bar,
  LineChart, Line,
  AreaChart, Area,
  PieChart, Pie, Cell,
  ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { BarChart3, LineChart as LineIcon, PieChart as PieIcon, Activity, Maximize2 } from 'lucide-react';

// Monochromatic Blue Color Spectrum (Google Blue #1A73E8 primary)
const MONO_BLUE_PALETTE = [
  '#1A73E8', // Primary Google Blue
  '#4285F4', // Medium Blue
  '#1557B0', // Deep Indigo Blue
  '#8AB4F8', // Soft Sky Blue
  '#0D47A1', // Navy Midnight Blue
  '#669DF6', // Vibrant Cornflower Blue
  '#AECBFA', // Pale Ice Blue
  '#174EA6'  // Slate Royal Blue
];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-md p-3 rounded-xl border border-[#D2E3FC] shadow-lg text-xs space-y-1">
        <p className="font-bold text-[#1E293B] border-b border-[#E2E8F0] pb-1">{label}</p>
        {payload.map((entry, index) => (
          <div key={`item-${index}`} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-[#5F6368]">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.name}:
            </span>
            <span className="font-semibold text-[#1A73E8] font-mono">
              {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function ChartView({ chartSpec }) {
  if (!chartSpec || !chartSpec.data || chartSpec.data.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#D2E3FC] p-8 text-center text-xs text-[#5F6368]">
        No chart visualization available for this result.
      </div>
    );
  }

  // Active chart type toggle
  const [selectedType, setSelectedType] = useState(chartSpec.chart_type || 'bar');

  const { x_key, y_keys = [], labels = {}, data = [] } = chartSpec;

  return (
    <div className="bg-white rounded-2xl border border-[#D2E3FC] p-5 shadow-xs transition-all space-y-4">
      
      {/* Header & Type Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-[#1E293B] flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#1A73E8]" />
            {chartSpec.title || 'Data Visualization'}
          </h3>
          {chartSpec.description && (
            <p className="text-xs text-[#5F6368] mt-0.5">{chartSpec.description}</p>
          )}
        </div>

        {/* Chart Switcher Buttons */}
        <div className="flex items-center bg-[#F8FAFD] border border-[#E2E8F0] p-1 rounded-xl gap-0.5">
          <button
            onClick={() => setSelectedType('bar')}
            className={`p-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1 ${
              selectedType === 'bar' ? 'bg-[#1A73E8] text-white shadow-2xs' : 'text-[#5F6368] hover:text-[#1E293B]'
            }`}
            title="Bar Chart"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Bar</span>
          </button>

          <button
            onClick={() => setSelectedType('line')}
            className={`p-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1 ${
              selectedType === 'line' ? 'bg-[#1A73E8] text-white shadow-2xs' : 'text-[#5F6368] hover:text-[#1E293B]'
            }`}
            title="Line Chart"
          >
            <LineIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Line</span>
          </button>

          <button
            onClick={() => setSelectedType('area')}
            className={`p-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1 ${
              selectedType === 'area' ? 'bg-[#1A73E8] text-white shadow-2xs' : 'text-[#5F6368] hover:text-[#1E293B]'
            }`}
            title="Area Chart"
          >
            <Activity className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Area</span>
          </button>

          {data.length <= 10 && (
            <button
              onClick={() => setSelectedType('pie')}
              className={`p-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1 ${
                selectedType === 'pie' ? 'bg-[#1A73E8] text-white shadow-2xs' : 'text-[#5F6368] hover:text-[#1E293B]'
              }`}
              title="Donut / Pie Chart"
            >
              <PieIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Pie</span>
            </button>
          )}
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div className="w-full h-72 sm:h-80 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          {selectedType === 'bar' && (
            <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis
                dataKey={x_key}
                tick={{ fontSize: 11, fill: '#64748B' }}
                axisLine={{ stroke: '#CBD5E1' }}
                tickLine={false}
                interval={0}
                angle={data.length > 6 ? -25 : 0}
                textAnchor={data.length > 6 ? 'end' : 'middle'}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#64748B' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val)}
              />
              <Tooltip content={<CustomTooltip />} />
              {y_keys.length > 1 && <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />}
              {y_keys.map((yKey, index) => (
                <Bar
                  key={yKey}
                  dataKey={yKey}
                  name={labels[yKey] || yKey}
                  fill={MONO_BLUE_PALETTE[index % MONO_BLUE_PALETTE.length]}
                  radius={[6, 6, 0, 0]}
                  maxBarSize={48}
                />
              ))}
            </BarChart>
          )}

          {selectedType === 'line' && (
            <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis
                dataKey={x_key}
                tick={{ fontSize: 11, fill: '#64748B' }}
                axisLine={{ stroke: '#CBD5E1' }}
                tickLine={false}
                angle={data.length > 6 ? -25 : 0}
                textAnchor={data.length > 6 ? 'end' : 'middle'}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#64748B' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val)}
              />
              <Tooltip content={<CustomTooltip />} />
              {y_keys.length > 1 && <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />}
              {y_keys.map((yKey, index) => (
                <Line
                  key={yKey}
                  type="monotone"
                  dataKey={yKey}
                  name={labels[yKey] || yKey}
                  stroke={MONO_BLUE_PALETTE[index % MONO_BLUE_PALETTE.length]}
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#FFFFFF', stroke: MONO_BLUE_PALETTE[index % MONO_BLUE_PALETTE.length], strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          )}

          {selectedType === 'area' && (
            <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 25 }}>
              <defs>
                <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1A73E8" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#1A73E8" stopOpacity={0.02}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis
                dataKey={x_key}
                tick={{ fontSize: 11, fill: '#64748B' }}
                axisLine={{ stroke: '#CBD5E1' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#64748B' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              {y_keys.map((yKey, index) => (
                <Area
                  key={yKey}
                  type="monotone"
                  dataKey={yKey}
                  name={labels[yKey] || yKey}
                  stroke="#1A73E8"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#blueGradient)"
                />
              ))}
            </AreaChart>
          )}

          {selectedType === 'pie' && (
            <PieChart>
              <Tooltip content={<CustomTooltip />} />
              <Pie
                data={data}
                dataKey={y_keys[0]}
                nameKey={x_key}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={95}
                paddingAngle={3}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={MONO_BLUE_PALETTE[index % MONO_BLUE_PALETTE.length]}
                  />
                ))}
              </Pie>
              <Legend wrapperStyle={{ fontSize: '11px' }} />
            </PieChart>
          )}

          {selectedType === 'scatter' && (
            <ScatterChart margin={{ top: 10, right: 20, left: 0, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey={x_key} name={labels[x_key] || x_key} tick={{ fontSize: 11 }} />
              <YAxis dataKey={y_keys[0]} name={labels[y_keys[0]] || y_keys[0]} tick={{ fontSize: 11 }} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Scatter name="Points" data={data} fill="#1A73E8" />
            </ScatterChart>
          )}
        </ResponsiveContainer>
      </div>

    </div>
  );
}
