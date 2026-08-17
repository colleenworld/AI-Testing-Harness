'use client';

import React from 'react';
import { EvaluationResult } from '../types';

interface InspectorProps {
    records: EvaluationResult[];
    selectedRecord: EvaluationResult | null;
    setSelectedRecord: (r: EvaluationResult) => void;
    isLoading: boolean;
}

export function DataInspector({ records, selectedRecord, setSelectedRecord, isLoading }: InspectorProps) {
    return (
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left List Column */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col max-h-[600px]">
                <div className="bg-slate-50/70 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Evaluation Records</span>
                </div>
                {isLoading ? (
                    <div className="p-8 text-center text-sm text-slate-400">Loading data stream...</div>
                ) : (
                    <div className="overflow-y-auto divide-y divide-slate-100">
                        {records.map((record) => (
                            <div
                                key={record.id}
                                onClick={() => setSelectedRecord(record)}
                                className={`p-4 cursor-pointer text-left ${selectedRecord?.id === record.id ? 'bg-indigo-50/60 border-l-4 border-indigo-600' : 'hover:bg-slate-50/80 border-l-4 border-transparent'}`}
                            >
                                <div className="flex justify-between items-center mb-1">
                                    <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{record.task_id}</span>
                                    <span className="text-[11px] font-mono text-slate-400">{record.model_version}</span>
                                </div>
                                <p className="text-sm text-slate-600 font-medium line-clamp-2">{record.prompt}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Right Detail Inspector Column */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col min-h-[500px] max-h-[600px] overflow-y-auto p-5 text-left">
                {selectedRecord ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded border text-xs font-mono">
                            <div>
                                <div className="text-slate-400 text-[10px]">Tokens In/Out</div>
                                <div className="font-bold">{selectedRecord.prompt_tokens} / {selectedRecord.completion_tokens}</div>
                            </div>
                            <div>
                                <div className="text-slate-400 text-[10px]">Latency</div>
                                <div className="font-bold">{selectedRecord.latency_ms} ms</div>
                            </div>
                            <div>
                                <div className="text-slate-400 text-[10px]">Factuality</div>
                                <div className="font-bold text-indigo-600">{selectedRecord.parsed_metrics?.factuality ?? 'N/A'}/5</div>
                            </div>
                            <div>
                                <div className="text-slate-400 text-[10px]">Cost</div>
                                <div className="font-bold text-emerald-600">${Number(selectedRecord.calculated_cost_usd).toFixed(5)}</div>
                            </div>
                        </div>
                        <div>
                            <h4 className="text-xs font-bold uppercase text-slate-400 mb-1">Input Prompt</h4>
                            <div className="p-3 bg-slate-50 rounded border text-sm max-h-[100px] overflow-y-auto">{selectedRecord.prompt}</div>
                        </div>
                        <div>
                            <h4 className="text-xs font-bold uppercase text-slate-400 mb-1">Raw Output</h4>
                            <div className="p-3 bg-slate-900 text-slate-100 font-mono rounded text-sm max-h-[200px] overflow-y-auto whitespace-pre-wrap">{selectedRecord.raw_output}</div>
                        </div>
                    </div>
                ) : (
                    <div className="m-auto text-slate-400 text-sm">Select a row to display full prompt generation profiles.</div>
                )}
            </div>
        </section>
    );
}
