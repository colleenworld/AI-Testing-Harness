'use client';

import React from 'react';
import { EvaluationResult } from '../types';
import { DetailInspector } from './DetailInspector';

interface InspectorProps {
    records: EvaluationResult[];
    selectedRecord: EvaluationResult | null;
    setSelectedRecord: (r: EvaluationResult) => void;
    isLoading: boolean;
}

export function DataInspector({ records, selectedRecord, setSelectedRecord, isLoading }: InspectorProps) {
    return (
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT COLUMN LIST VIEW */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col max-h-[680px]">
                <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Evaluation Records</span>
                    <span className="text-xs font-mono bg-slate-200/80 px-2 py-0.5 rounded text-slate-600 font-bold">{records.length} tasks</span>
                </div>

                {isLoading ? (
                    <div className="p-12 text-center text-sm text-slate-400 font-medium">Loading evaluation matrix...</div>
                ) : records.length === 0 ? (
                    <div className="p-12 text-center text-sm text-slate-400 font-medium">No records match this active category tab.</div>
                ) : (
                    <div className="overflow-y-auto divide-y divide-slate-100 max-h-[630px]">
                        {records.map((record) => {
                            const isSystemCrash = record.raw_output?.includes('CRITICAL FAILURE');

                            return (
                                <div
                                    key={record.id}
                                    onClick={() => setSelectedRecord(record)}
                                    className={`p-4 cursor-pointer text-left transition-all border-l-4 ${
                                        selectedRecord?.id === record.id
                                            ? 'bg-indigo-50/60 border-l-indigo-600'
                                            : isSystemCrash
                                                ? 'hover:bg-rose-50/30 border-l-amber-400'
                                                : 'hover:bg-slate-50/80 border-l-transparent'
                                    }`}
                                >
                                    <div className="flex justify-between items-center mb-1.5">
                                        <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{record.task_id}</span>
                                        <span className="text-[11px] font-mono px-1.5 py-0.5 bg-slate-50 text-slate-500 rounded border border-slate-200">{record.model_version}</span>
                                    </div>
                                    <p className="text-sm text-slate-700 font-medium line-clamp-2 leading-relaxed">{record.prompt}</p>
                                    <div className="flex justify-between items-center text-[11px] font-mono text-slate-400 pt-2">
                                        <span>⏱️ {record.latency_ms}ms</span>
                                        <span className={isSystemCrash ? 'text-amber-600 font-bold' : 'text-emerald-600 font-semibold'}>
                      {isSystemCrash ? '⚠️ Run Crash' : `$${Number(record.calculated_cost_usd).toFixed(5)}`}
                    </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* RIGHT COLUMN DETAIL INJECTOR */}
            <DetailInspector selectedRecord={selectedRecord} />
        </section>
    );
}
