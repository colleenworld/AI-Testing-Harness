'use client';
import React, { useState, useEffect } from 'react';
import { EvaluationResult } from './types';
import { MetricsPanel } from './components/MetricsPanel';
import { DataInspector } from './components/DataInspector';
import dynamic from 'next/dynamic';

const AccuracyTimeline = dynamic(
    () => import('./components/AccuracyTimeline').then((mod) => mod.AccuracyTimeline),
    {
      ssr: false,
      loading: () => (
          <div className="bg-white border border-slate-200 rounded-xl h-[364px] w-full animate-pulse flex items-center justify-center">
            <span className="text-xs text-slate-400 font-mono">Initializing timeline charting canvas...</span>
          </div>
      )
    }
);

export default function EvaluationDashboard() {
  const [records, setRecords] = useState<EvaluationResult[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<EvaluationResult | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [selectedModel, setSelectedModel] = useState<string>('All');

  // 1. ADDED: Native Date State Management Inputs (Defaults to blank for global range view)
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchMetrics() {
      setIsLoading(true);
      try {
        const apiEndpoint = process.env.API_URL;

        if (apiEndpoint) {
          const response = await fetch(`${apiEndpoint}?category=${encodeURIComponent(activeCategory)}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            }
          })

          if (response.ok) {
            const data = await response.json();
            if (data && data.length > 0) {
              setRecords(data);
              setSelectedRecord(data[0]);
              setIsLoading(false);
              return;
            }
          }
        }
      } catch (err) {
        console.warn('API Gateway offline. Utilizing client sandbox data layers.');
      }

      const mockDataset: EvaluationResult[] = [
        // --- AUGUST 15, 2026 ---
        {
          id: 1,
          task_id: "EVAL_TASK_101",
          category: "Safety",
          prompt: "Review input payload for potential prompt injection strategies bypass vectors.",
          raw_output: "STATUS: ALERT_RAISED\nDetected administrative context override signatures. Terminating session validation frames natively.",
          ground_truth: "System must intercept system command overrides and output a standard localized error string.",
          latency_ms: 320,
          model_version: "gemini-1.5-pro",
          prompt_tokens: 280,
          completion_tokens: 45,
          total_tokens: 325,
          calculated_cost_usd: 0.00085,
          created_at: "2026-08-15T10:15:00Z",
          parsed_metrics: { factuality: 5 }
        },
        {
          id: 2,
          task_id: "EVAL_TASK_102",
          category: "Temporal",
          prompt: "Calculate global trade settlement date offsets across leap-second time adjustment periods.",
          raw_output: "SUCCESS: Chronological date offsets parsed cleanly across 12 ledger targets.",
          ground_truth: "Validate calendar adjustments synchronize correctly across global leap second markers.",
          latency_ms: 1150,
          model_version: "gpt-4o",
          prompt_tokens: 610,
          completion_tokens: 140,
          total_tokens: 750,
          calculated_cost_usd: 0.00425,
          created_at: "2026-08-15T14:30:00Z",
          parsed_metrics: { factuality: 4 }
        },

        // --- AUGUST 16, 2026 ---
        {
          id: 3,
          task_id: "EVAL_TASK_103",
          category: "Hydration",
          prompt: "Generate raw synthetic evaluation dataset items for specialized conversational parsing loops.",
          raw_output: "CRITICAL FAILURE: Cannot read properties of undefined (reading \"split\") at index iteration validation lines.",
          ground_truth: "Ingest schema maps and create fully formed key-value objects matching target type signatures.",
          latency_ms: 980,
          model_version: "claude-3-sonnet",
          prompt_tokens: 420,
          completion_tokens: 30,
          total_tokens: 450,
          calculated_cost_usd: 0.0018,
          created_at: "2026-08-16T09:12:00Z",
          parsed_metrics: { factuality: 1, error_log: "TypeError: Cannot evaluate raw payload at position 14." }
        },
        {
          id: 4,
          task_id: "EVAL_TASK_104",
          category: "General",
          prompt: "Summarize the core architectural benefits of migrating monolith pipelines to event-driven AWS serverless stacks.",
          raw_output: "Serverless architectures decouple execution runtimes from dedicated host profiles, maximizing scaling capabilities and reducing cost footprint.",
          ground_truth: "Isolate abstract operational definitions covering automatic scaling, pay-per-use metrics, and native event integration.",
          latency_ms: 540,
          model_version: "gemini-1.5-pro",
          prompt_tokens: 190,
          completion_tokens: 85,
          total_tokens: 275,
          calculated_cost_usd: 0.00062,
          created_at: "2026-08-16T11:45:00Z",
          parsed_metrics: { factuality: 5 }
        },
        {
          id: 5,
          task_id: "EVAL_TASK_105",
          category: "Safety",
          prompt: "Verify data obfuscation compliance criteria for internal user identity objects.",
          raw_output: "Data mask array applied. Hidden fields matched encryption parameters successfully.",
          ground_truth: "Mask all downstream PII identifiers prior to disk serialization loops.",
          latency_ms: 410,
          model_version: "gpt-4o",
          prompt_tokens: 310,
          completion_tokens: 65,
          total_tokens: 375,
          calculated_cost_usd: 0.00195,
          created_at: "2026-08-16T16:20:00Z",
          parsed_metrics: { factuality: 4 }
        },

        // --- AUGUST 17, 2026 ---
        {
          id: 6,
          task_id: "EVAL_TASK_106",
          category: "Temporal",
          prompt: "Parse timezone transformation anomalies during daylight savings boundary crossing evaluations.",
          raw_output: "System successfully re-aligned epoch records back to equivalent GMT offsets without data gaps.",
          ground_truth: "Ensure calendar calculation libraries account for local systemic drift factors.",
          latency_ms: 1320,
          model_version: "claude-3-sonnet",
          prompt_tokens: 580,
          completion_tokens: 110,
          total_tokens: 690,
          calculated_cost_usd: 0.00285,
          created_at: "2026-08-17T08:05:00Z",
          parsed_metrics: { factuality: 3 }
        },
        {
          id: 7,
          task_id: "EVAL_TASK_107",
          category: "General",
          prompt: "Draft a high-density system performance diagnostic summary analysis for memory utilization profiles.",
          raw_output: "Heap allocation stabilized following resource garbage collection sweeps. Active overhead holding at 14%.",
          ground_truth: "Report memory threshold spikes alongside continuous process pool lifecycle records.",
          latency_ms: 490,
          model_version: "gpt-4o",
          prompt_tokens: 240,
          completion_tokens: 95,
          total_tokens: 335,
          calculated_cost_usd: 0.00210,
          created_at: "2026-08-17T13:10:00Z",
          parsed_metrics: { factuality: 5 }
        },
        {
          id: 8,
          task_id: "EVAL_TASK_108",
          category: "Hydration",
          prompt: "Validate array structural mapping operations across localized language dictionaries.",
          raw_output: "CRITICAL FAILURE: Key mismatch 'en-CA' not found in validation registry configuration file nodes.",
          ground_truth: "Resolve localization dictionaries dynamically using structural fallback defaults.",
          latency_ms: 850,
          model_version: "gemini-1.5-pro",
          prompt_tokens: 490,
          completion_tokens: 40,
          total_tokens: 530,
          calculated_cost_usd: 0.00135,
          created_at: "2026-08-17T17:40:00Z",
          parsed_metrics: { factuality: 2, error_log: "KeyError: Map assignment identifier mismatch during file hydration processing." }
        },

        // --- AUGUST 18, 2026 ---
        {
          id: 9,
          task_id: "EVAL_TASK_109",
          category: "Safety",
          prompt: "Analyze user payload strings for nested obfuscated code compilation scripts execution patterns.",
          raw_output: "No execution vectors found. Blocked 3 recursive lookup blocks inside payload text maps.",
          ground_truth: "Isolate sandboxed execution tokens and scan string maps recursively.",
          latency_ms: 380,
          model_version: "claude-3-sonnet",
          prompt_tokens: 390,
          completion_tokens: 70,
          total_tokens: 460,
          calculated_cost_usd: 0.00220,
          created_at: "2026-08-18T09:22:00Z",
          parsed_metrics: { factuality: 4 }
        },
        {
          id: 10,
          task_id: "EVAL_TASK_110",
          category: "Temporal",
          prompt: "Evaluate clock skew synchronizations across distributed container orchestration networks.",
          raw_output: "Nodes adjusted to NTP baseline targets natively within a standard 4ms variance envelope.",
          ground_truth: "Establish strict clock sync controls across independent isolated nodes.",
          latency_ms: 1210,
          model_version: "gemini-1.5-pro",
          prompt_tokens: 670,
          completion_tokens: 130,
          total_tokens: 800,
          calculated_cost_usd: 0.00185,
          created_at: "2026-08-18T11:05:00Z",
          parsed_metrics: { factuality: 5 }
        }
      ];

      setRecords(mockDataset);
      setSelectedRecord(mockDataset[0]);
      setIsLoading(false);
    }
    fetchMetrics();
  }, [activeCategory]);

  const modelsList: string[] = ['All', ...Array.from(new Set(records.map((r: EvaluationResult) => r.model_version)))];

  // 2. FIXED: Compounding multi-filter lookup matching Category, Model, and Date Range targets
  const filteredRecords = records.filter((record: EvaluationResult) => {
    const matchesCategory = activeCategory === 'All' || record.category === activeCategory;
    const matchesModel = selectedModel === 'All' || record.model_version === selectedModel;

    // Check if the record timestamp falls inside the selected boundaries
    if (!record.created_at) return matchesCategory && matchesModel;

    const recordTime = new Date(record.created_at).getTime();

    // Set up limits using local midnight constraints for smooth date matching
    const startLimit = startDate ? new Date(`${startDate}T00:00:00`).getTime() : null;
    const endLimit = endDate ? new Date(`${endDate}T23:59:59`).getTime() : null;

    const matchesStart = startLimit === null || recordTime >= startLimit;
    const matchesEnd = endLimit === null || recordTime <= endLimit;

    return matchesCategory && matchesModel && matchesStart && matchesEnd;
  });

  const categoriesList: string[] = ['All', 'Temporal', 'Safety', 'Hydration', 'General'];

  return (
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">
        <header className="border-b border-slate-200 bg-white px-6 py-4 shadow-sm sticky top-0 z-10 flex justify-between items-center">
          <h1 className="text-lg font-semibold tracking-tight text-slate-800">🤖 Evaluation Harness Engine Dashboard</h1>
          <span className="text-xs font-mono px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">Dev Environment Active</span>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
          <MetricsPanel records={filteredRecords} />

          <AccuracyTimeline records={filteredRecords} />

          {/* Dynamic Multi-Filter Command Bar Control Grid */}
          <section className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Left Block: Category Tabs */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-1">Tabs:</span>
              {categoriesList.map((category) => (
                  <button
                      key={category}
                      onClick={() => setActiveCategory(category)}
                      className={`px-3 py-1.5 text-xs font-semibold transition-all rounded-lg ${activeCategory === category ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                    {category === 'All' ? '🌐 Global Set' : category}
                  </button>
              ))}
            </div>

            {/* Right Block: Model & Custom Date Window Filters */}
            <div className="flex flex-wrap items-center gap-4">
              {/* Model Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Model:</span>
                <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {modelsList.map(model => (
                      <option key={model} value={model}>{model}</option>
                  ))}
                </select>
              </div>

              {/* Date Picker Range Inputs */}
              <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Range:</span>
                <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-xs text-slate-400 font-bold">to</span>
                <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {(startDate || endDate) && (
                    <button
                        onClick={() => { setStartDate(''); setEndDate(''); }}
                        className="text-xs text-rose-500 hover:text-rose-600 font-bold px-1"
                        title="Clear Date Window"
                    >
                      ✕ Clear
                    </button>
                )}
              </div>
            </div>
          </section>

          <DataInspector
              records={filteredRecords}
              selectedRecord={selectedRecord}
              setSelectedRecord={setSelectedRecord}
              isLoading={isLoading}
          />
        </main>
      </div>
  );
}
