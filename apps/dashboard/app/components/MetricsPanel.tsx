'use client';

import React from 'react';
import { EvaluationResult } from '../types';

export function MetricsPanel({ records }: { records: EvaluationResult[] }) {
    const totalTasks = records.length;
    const totalCost = records.reduce((sum, r) => sum + Number(r.calculated_cost_usd), 0);
    const totalTokens = records.reduce((sum, r) => sum + r.total_tokens, 0);
    const averageLatency = totalTasks > 0 ? Math.round(records.reduce((sum, r) => sum + r.latency_ms, 0) / totalTasks) : 0;

    return (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Evaluated Batches</span>
                <span className="text-2xl font-bold text-slate-800 mt-2">{totalTasks} records</span>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Accumulated Volume</span>
                <span className="text-2xl font-bold text-indigo-600 mt-2">{totalTokens.toLocaleString()} tokens</span>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Model Run Spend</span>
                <span className="text-2xl font-bold text-emerald-600 mt-2">${totalCost.toFixed(4)} USD</span>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Mean Batch Latency</span>
                <span className="text-2xl font-bold text-amber-600 mt-2">{averageLatency} ms</span>
            </div>
        </section>
    );
}
