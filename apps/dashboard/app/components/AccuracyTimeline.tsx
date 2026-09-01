'use client';

import React, { useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { EvaluationResult } from '../types';

interface TimelinePlotRow {
    date: string;
    [modelVersion: string]: string | number;
}

interface MetricAccumulator {
    sum: number;
    count: number;
}

interface DateGroupAccumulator {
    [modelKey: string]: MetricAccumulator;
}

export function AccuracyTimeline({ records }: { records: EvaluationResult[] }) {
    const chartData = useMemo<TimelinePlotRow[]>(() => {
        const dataMap: { [date: string]: DateGroupAccumulator } = {};

        records.forEach((record) => {
            const rawDate = record.created_at || (record as { createdAt?: string }).createdAt;
            if (!rawDate) return;

            const parsedDate = new Date(rawDate);
            if (isNaN(parsedDate.getTime())) return;

            const dateLabel = parsedDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
            });

            if (!dataMap[dateLabel]) {
                dataMap[dateLabel] = {};
            }

            const score = record.parsed_metrics?.factuality;
            if (typeof score === 'number') {
                const modelKey = record.model_version || 'Unknown Model';
                if (!dataMap[dateLabel][modelKey]) {
                    dataMap[dateLabel][modelKey] = { sum: score, count: 1 };
                } else {
                    dataMap[dateLabel][modelKey].sum += score;
                    dataMap[dateLabel][modelKey].count += 1;
                }
            }
        });

        // Format calculated scores into clean flat chart payload data nodes
        const results = Object.keys(dataMap).map((date) => {
            const entry = dataMap[date];
            const row: TimelinePlotRow = { date };

            Object.keys(entry).forEach((key) => {
                row[key] = parseFloat((entry[key].sum / entry[key].count).toFixed(2));
            });
            return row;
        });

        // FIXED: Safely parses and sorts chronologically without raw text concatenation bugs
        return results.sort((a, b) => {
            const timeA = new Date(a.date).getTime() || 0;
            const timeB = new Date(b.date).getTime() || 0;
            return timeA - timeB;
        });
    }, [records]);

    const uniqueModels = useMemo<string[]>(() => {
        const models = new Set<string>();
        records.forEach((r) => {
            if (r.model_version) models.add(r.model_version);
        });
        return Array.from(models);
    }, [records]);

    const lineColors = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#a855f7'];

    if (chartData.length === 0) {
        return (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-400 font-medium flex flex-col items-center justify-center space-y-2 h-[364px]">
                <span className="text-xl">📊</span>
                <span>No chronological evaluation metrics available to display on the timeline plot chart.</span>
                <span className="text-[11px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
          Tip: Select &apos;🌐 Global Set&apos; tab to populate records array context
        </span>
            </div>
        );
    }

    return (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-4">
            <div className="text-left flex justify-between items-center">
                <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">📈 Model Accuracy Evolution Metrics</h3>
                    <p className="text-xs text-slate-500">Historical view of Mean Factuality Evaluation Scores mapped chronologically.</p>
                </div>
                <div className="text-[10px] font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200">
                    {chartData.length} Data Points
                </div>
            </div>

            <div className="h-64 w-full text-xs font-mono min-h-[256px]">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="date" stroke="#94a3b8" />
                        <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} stroke="#94a3b8" />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#0f172a', color: '#f8fafc', borderRadius: '8px', border: 'none' }}
                            itemStyle={{ color: '#cbd5e1' }}
                        />
                        <Legend verticalAlign="top" height={36} iconType="circle" />
                        {uniqueModels.map((model, idx) => (
                            <Line
                                key={model}
                                type="monotone"
                                dataKey={model}
                                name={model}
                                stroke={lineColors[idx % lineColors.length]}
                                strokeWidth={2.5}
                                activeDot={{ r: 6 }}
                                connectNulls
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
