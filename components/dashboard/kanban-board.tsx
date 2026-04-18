
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { updateBriefStatus, loadMoreBriefs } from '@/actions/brief'
import { Brief, AIAnalysis, User } from '@prisma/client'

type BriefWithRelations = Brief & { 
  analysis: AIAnalysis | null,
  assignee: User | null 
}

const COLUMNS = ['NEW', 'UNDER_REVIEW', 'PROPOSAL_SENT', 'WON']

export default function KanbanBoard({ 
  initialBriefs, 
  initialNextCursor 
}: { 
  initialBriefs: BriefWithRelations[],
  initialNextCursor?: string
}) {
  const [briefs, setBriefs] = useState<BriefWithRelations[]>(initialBriefs)
  const [nextCursor, setNextCursor] = useState<string | undefined>(initialNextCursor)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setBriefs(initialBriefs)
    setNextCursor(initialNextCursor)
  }, [initialBriefs, initialNextCursor])

  useEffect(() => {
    const eventSource = new EventSource('/api/sse')
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.refresh) router.refresh()
    }
    return () => eventSource.close()
  }, [router])

  
  const handleDragStart = (e: React.DragEvent, briefId: string) => {
    e.dataTransfer.setData('briefId', briefId)
  }

  const handleDragOver = (e: React.DragEvent) => e.preventDefault()

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault()
    const briefId = e.dataTransfer.getData('briefId')

    setBriefs((prev) => 
      prev.map((b) => (b.id === briefId ? { ...b, status: newStatus as any } : b))
    )

    const result = await updateBriefStatus(briefId, newStatus)
    if (!result.success) {
      alert(result.error || "Failed to update status")
      router.refresh()
    }
  }

  // --- PAGINATION HANDLER ---
  const handleLoadMore = async () => {
    if (!nextCursor) return
    setIsLoadingMore(true)
    
    try {
      const { briefs: newBriefs, nextCursor: newCursor } = await loadMoreBriefs(nextCursor)
      // Append the newly fetched briefs to the existing state
      setBriefs((prev) => [...prev, ...newBriefs as BriefWithRelations[]])
      setNextCursor(newCursor)
    } catch (error) {
      console.error("Failed to load more:", error)
    } finally {
      setIsLoadingMore(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="grid grid-cols-4 gap-6 flex-1">
        {COLUMNS.map((status) => (
          <div 
            key={status} 
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, status)}
            className="bg-gray-200/50 p-4 rounded-xl h-[70vh] overflow-y-auto border border-gray-200"
          >
            <h2 className="font-bold mb-4 text-sm text-gray-600 tracking-wider capitalize">
              {status.replace('_', ' ')}
            </h2>
            
            <div className="space-y-4">
              {briefs
                .filter((b) => b.status === status)
                .map((brief) => (
                  <div 
                    key={brief.id} 
                    draggable 
                    onDragStart={(e) => handleDragStart(e, brief.id)}
                    className="bg-white p-4 rounded-lg shadow-sm cursor-grab active:cursor-grabbing border border-gray-200 hover:border-blue-400 transition-colors relative group"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-semibold text-gray-900 pr-8">{brief.title}</h3>
                      <Link 
                        href={`/dashboard/${brief.id}`}
                        className="text-xs text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity hover:underline absolute right-4 top-4 bg-white/90 px-1 rounded"
                      >
                        View
                      </Link>
                    </div>

                    <p className="text-xs text-gray-500 font-medium">{brief.budget}</p>
                    
                    {brief.analysis ? (
                      <div className="mt-3 text-xs flex justify-between items-center bg-blue-50 text-blue-700 p-2 rounded-md font-medium">
                        <span>Score: {brief.analysis.complexityScore}/5</span>
                        <span>{brief.analysis.effortHours} hrs</span>
                      </div>
                    ) : (
                      <div className="mt-3 text-xs text-amber-600 bg-amber-50 p-2 rounded-md animate-pulse">
                        AI Analyzing...
                      </div>
                    )}
                  </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {nextCursor && (
        <div className="mt-6 flex justify-center pb-4">
          <button 
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-2 rounded-full text-sm font-bold shadow-sm transition-colors disabled:opacity-50"
          >
            {isLoadingMore ? "Loading..." : "Load Older Projects ↓"}
          </button>
        </div>
      )}
    </div>
  )
}