import React, { useMemo, useState } from 'react';
import { AnalyticsData, RankingStats } from '../types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface Props {
  analyticsData: AnalyticsData | null;
  rankingStats: RankingStats | null;
}

export function HistoryAnalytics({ analyticsData, rankingStats }: Props) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Data for the main view (Overall Season)
  const summaryData = useMemo(() => {
    if (!analyticsData?.summary) return [];
    return analyticsData.summary.map((s) => ({
      name: `Date: ${s.date}`,
      fullDate: s.fullDate,
      date: s.date,
      rp: s.rp,
      matches: s.matchCount
    }));
  }, [analyticsData]);

  const detailsData = useMemo(() => {
    if (!selectedDate || !analyticsData?.details?.[selectedDate]) return [];
    return analyticsData.details[selectedDate].map((d, index) => ({
      name: `เกมที่ ${index + 1}`,
      time: d.time,
      rp: d.rp,
      is_win: d.is_win
    }));
  }, [selectedDate, analyticsData]);

  // Process data for Win Rate Doughnut Chart
  const pieData = useMemo(() => {
    const wins = rankingStats?.win || 0;
    const losses = rankingStats?.lose || 0;
    if (wins === 0 && losses === 0) return [];
    return [
      { name: 'Wins', value: wins, color: '#2ecc71' },
      { name: 'Losses', value: losses, color: '#e74c3c' }
    ];
  }, [rankingStats]);

  if (!analyticsData?.summary?.length && (!rankingStats || !rankingStats.match_played)) {
    return null;
  }

  const handleChartClick = (data: any) => {
    if (data && data.activePayload && data.activePayload.length > 0) {
      const clickedData = data.activePayload[0].payload;
      if (clickedData.fullDate) {
        setSelectedDate(clickedData.fullDate);
      }
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      {/* RP Progression Line Chart */}
      <div className="md:col-span-2 bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur-md relative">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">
              RP Progression
            </h3>
            {summaryData.length > 0 && (
              <select
                value={selectedDate || ''}
                onChange={(e) => setSelectedDate(e.target.value || null)}
                className="bg-[#1e293b] border border-white/10 text-white text-xs font-bold rounded-lg px-3 py-1.5 outline-none focus:border-[#2ecc71] cursor-pointer"
              >
                <option value="">ภาพรวมทั้งซีซั่น (Overall)</option>
                {[...summaryData].reverse().map(s => (
                  <option key={s.fullDate} value={s.fullDate}>วันที่ {s.date}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* SUMMARY CHART */}
        {!selectedDate && summaryData.length > 0 && (
          <div className="h-[250px] w-full cursor-pointer">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={summaryData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }} onClick={handleChartClick}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                  labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                  formatter={(value: any, name: any) => [value, name === 'rp' ? 'RP' : name]}
                />
                <Line 
                  type="monotone" 
                  dataKey="rp" 
                  stroke="#2ecc71" 
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#1e293b', stroke: '#2ecc71', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: '#2ecc71' }}
                />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-center text-xs text-slate-500 mt-2">Click on a point to view matches for that day</p>
          </div>
        )}

        {/* DETAILS CHART (DRILL DOWN) */}
        {selectedDate && detailsData.length > 0 && (
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={detailsData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                  labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                  formatter={(value: any, name: any) => [value, name === 'rp' ? 'RP' : name]}
                />
                <Line 
                  type="monotone" 
                  dataKey="rp" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#1e293b', stroke: '#3b82f6', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: '#3b82f6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {summaryData.length === 0 && (
          <div className="h-[250px] w-full flex items-center justify-center">
            <p className="text-slate-500">ไม่มีข้อมูลการแข่งขัน</p>
          </div>
        )}
      </div>

      {/* Win Rate Doughnut Chart */}
      <div className="bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur-md flex flex-col items-center">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2 w-full text-left">Win Rate</h3>
        
        {pieData.length > 0 ? (
          <>
            <div className="h-[200px] w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              
              {/* Center Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-white">
                  {rankingStats?.match_played ? Math.round(((rankingStats?.win || 0) / rankingStats.match_played) * 100) : 0}%
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Win Rate</span>
              </div>
            </div>
            
            {/* Legend Custom */}
            <div className="flex gap-4 mt-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#2ecc71]"></div>
                <span className="text-xs font-bold text-slate-300">Win ({rankingStats?.win || 0})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#e74c3c]"></div>
                <span className="text-xs font-bold text-slate-300">Loss ({rankingStats?.lose || 0})</span>
              </div>
            </div>
          </>
        ) : (
          <div className="h-[200px] w-full flex items-center justify-center">
             <p className="text-slate-500">ไม่มีสถิติ</p>
          </div>
        )}
      </div>
    </div>
  );
}
