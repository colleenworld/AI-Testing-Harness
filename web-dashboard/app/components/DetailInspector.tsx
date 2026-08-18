'use client';

import React from 'react';
import { EvaluationResult } from '../types';

interface DetailProps {
    selectedRecord: EvaluationResult | null;
}

export function DetailInspector({ selectedRecord }: DetailProps) {
    if (!selectedRecord) {
        return (
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex min-h-[600px] max-h-[680px] p-6 text-left">
                <div className="m-auto text-slate-400 text-sm flex flex-col items-center space-y-2">
                    <span className="text-2xl">👁️</span>
                    <span>Select an evaluation record row element to view its complete generation logs.</span>
                </div>
            </div>
        );
    }

    const isSystemCrash = selectedRecord.raw_output?.includes('CRITICAL FAILURE');

    return (
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col min-h-[600px] max-h-[680px] p-6 text-left">
            <div className="space-y-6 flex flex-col h-full overflow-y-auto pr-1">
                {/* Metric Badge Array Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs font-mono">
                    <div className="bg-white p-2 rounded border border-slate-100 shadow-sm">
                        <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-0.5">Tokens In/Out</div>
                        <div className="font-bold text-indigo-600 text-sm">{selectedRecord.prompt_tokens} / {selectedRecord.completion_tokens}</div>
                    </div>
                    <div className="bg-white p-2 rounded border border-slate-100 shadow-sm">
                        <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-0.5">Latency Profile</div>
                        <div className="font-bold text-amber-600 text-sm">{selectedRecord.latency_ms} ms</div>
                    </div>
                    <div className="bg-white p-2 rounded border border-slate-100 shadow-sm">
                        <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-0.5">Factuality Score</div>
                        <div className="font-bold text-slate-800 text-sm">{selectedRecord.parsed_metrics?.factuality ?? 'N/A'} / 5</div>
                    </div>
                    <div className="bg-white p-2 rounded border border-slate-100 shadow-sm">
                        <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-0.5">Calculated Cost</div>
                        <div className="font-bold text-emerald-600 text-sm">${Number(selectedRecord.calculated_cost_usd).toFixed(5)}</div>
                    </div>
                </div>

                {/* Input Text Box */}
                <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">📥 Input Prompt String Context</h4>
                    <div className="p-3 bg-slate-50 text-slate-800 rounded-lg border border-slate-200 text-sm max-h-[120px] overflow-y-auto font-medium leading-relaxed">
                        {selectedRecord.prompt}
                    </div>
                </div>

                {/* Side-by-Side Split Grid Pane */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                    <div className="flex flex-col">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">⚖️ Expected Ground Truth Baseline</h4>
                        <div className="p-3 bg-indigo-50/30 text-indigo-950 rounded-lg border border-indigo-100 text-xs font-medium font-sans leading-relaxed overflow-y-auto h-[200px] flex-1">
                            {selectedRecord.ground_truth || "No verification target baseline schema loaded for this dataset."}
                        </div>
                    </div>

                    <div className="flex flex-col">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">🔮 Raw Model Performance Output</h4>
                        <div className={`p-3 rounded-lg border text-xs font-mono leading-relaxed overflow-y-auto h-[200px] flex-1 whitespace-pre-wrap ${
                            isSystemCrash ? 'bg-rose-950 text-rose-200 border-rose-900 shadow-inner' : 'bg-slate-900 text-slate-100 border-slate-950 shadow-md'
                        }`}>
                            {selectedRecord.raw_output}
                        </div>
                    </div>
                </div>

                {/* Dynamic Exception Trace Block */}
                {selectedRecord.parsed_metrics?.error_log && (
                    <div className="bg-amber-50 text-amber-900 border border-amber-200 rounded-lg p-3 text-xs flex gap-2.5 items-start">
                        <span className="text-sm">⚠️</span>
                        <div className="space-y-0.5">
                            <div className="font-bold uppercase tracking-wider text-amber-800 text-[10px]">Schema Validation Trace Log Exception</div>
                            <div className="font-mono text-slate-700 whitespace-pre-wrap max-h-[100px] overflow-y-auto">{selectedRecord.parsed_metrics.error_log}</div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
