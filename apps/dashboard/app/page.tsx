'use client'
import React, { useState, useEffect } from 'react'
import { EvaluationResult } from './types'
import { MetricsPanel } from './components/MetricsPanel'
import { DataInspector } from './components/DataInspector'
import dynamic from 'next/dynamic'

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
)

export default function EvaluationDashboard() {
  const [records, setRecords] = useState<EvaluationResult[]>([])
  const [selectedRecord, setSelectedRecord] = useState<EvaluationResult | null>(null)
  const [activeCategory, setActiveCategory] = useState<string>('All')
  const [selectedModel, setSelectedModel] = useState<string>('All')

  // 1. ADDED: Native Date State Management Inputs (Defaults to blank for global range view)
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')

  const [isLoading, setIsLoading] = useState<boolean>(true)
  const apiEndpoint = process.env.API_URL || 'https://vuxabdj16a.execute-api.us-west-2.amazonaws.com/Stage/v1/evaluations'

  useEffect(() => {
    const controller = new AbortController()

    async function fetchMetrics() {
      setIsLoading(true)

      if (!apiEndpoint) {
        console.warn('API endpoint is not configured')
        setIsLoading(false)
        return
      }

      try {
        const url =
            `${apiEndpoint}?category=${
                encodeURIComponent(activeCategory)
            }`

        const response = await fetch(url, {
          method: 'GET',
          signal: controller.signal
        })

        if (!response.ok) {
          const responseBody = await response.text()

          throw new Error(
              `API request failed: ${response.status} ` +
              `${response.statusText} ${responseBody}`
          )
        }

        const data: unknown = await response.json()

        if (!Array.isArray(data)) {
          throw new Error(
              'API response is not an array'
          )
        }

        setRecords(data)

        if (data.length > 0) {
          setSelectedRecord(data[0])
        }
        else {
          setSelectedRecord(null)
        }
      }
      catch (error: unknown) {
        if (
            error instanceof DOMException &&
            error.name === 'AbortError'
        ) {
          return
        }

        console.warn('Failed to fetch evaluations', error)
        setRecords([])
        setSelectedRecord(null)
      }
      finally {
        setIsLoading(false)
      }
    }

    void fetchMetrics()

    return () => {
      controller.abort()
    }
  }, [
    activeCategory,
    apiEndpoint
  ])

  const modelsList: string[] = ['All', ...Array.from(new Set(records.map((r: EvaluationResult) => r.model_version)))]

  // 2. FIXED: Compounding multi-filter lookup matching Category, Model, and Date Range targets
  const filteredRecords = records.filter((record: EvaluationResult) => {
    const matchesCategory = activeCategory === 'All' || record.category === activeCategory
    const matchesModel = selectedModel === 'All' || record.model_version === selectedModel

    // Check if the record timestamp falls inside the selected boundaries
    if (!record.created_at) return matchesCategory && matchesModel

    const recordTime = new Date(record.created_at).getTime()

    // Set up limits using local midnight constraints for smooth date matching
    const startLimit = startDate ? new Date(`${startDate}T00:00:00`).getTime() : null
    const endLimit = endDate ? new Date(`${endDate}T23:59:59`).getTime() : null

    const matchesStart = startLimit === null || recordTime >= startLimit
    const matchesEnd = endLimit === null || recordTime <= endLimit

    return matchesCategory && matchesModel && matchesStart && matchesEnd
  })

  const categoriesList: string[] = ['All', 'Temporal', 'Safety', 'Hydration', 'General']

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
                        onClick={() => { setStartDate(''); setEndDate('') }}
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
  )
}
