"use client"

import { useState, useEffect, useCallback } from "react"
import { AppShell } from "@/components/app-shell"
import { LeadCard } from "@/components/lead-card"
import { Button } from "@/components/ui/button"
import { Inbox } from "lucide-react"

const STATUS_OPTIONS = ["pending", "replied", "follow_up_ready", "converted", "dismissed"]
const STATUS_LABELS = {
  pending: "Pending",
  replied: "Replied",
  follow_up_ready: "Follow-up",
  converted: "Converted",
  dismissed: "Dismissed",
}

export default function LeadQueuePage() {
  return (
    <AppShell>
      {({ products, selectedProduct, refreshProducts }) => (
        <LeadQueue
          products={products}
          selectedProduct={selectedProduct}
          refreshProducts={refreshProducts}
        />
      )}
    </AppShell>
  )
}

function LeadQueue({ products, selectedProduct, refreshProducts }) {
  const [leads, setLeads] = useState([])
  const [statusFilter, setStatusFilter] = useState("pending")
  const [loading, setLoading] = useState(true)

  const loadLeads = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("status", statusFilter)
      if (selectedProduct && selectedProduct !== "all") {
        params.set("product_id", selectedProduct)
      }
      const res = await fetch(`/api/leads?${params}`)
      if (res.ok) {
        const data = await res.json()
        setLeads(data)
      }
    } catch (err) {
      console.error("Failed to load leads:", err)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, selectedProduct])

  useEffect(() => {
    loadLeads()
  }, [loadLeads])

  useEffect(() => {
    function handleScanComplete() {
      loadLeads()
    }
    window.addEventListener("scan-complete", handleScanComplete)
    return () => window.removeEventListener("scan-complete", handleScanComplete)
  }, [loadLeads])

  function handleStatusChange(leadId, newStatus) {
    if (newStatus === "converted" || newStatus === "dismissed") {
      setLeads((prev) => prev.filter((l) => l.id !== leadId))
    } else {
      // Refresh in place for replied / follow_up_ready transitions
      loadLeads()
    }
    refreshProducts()
  }

  // Build product index map for colors
  const productIndexMap = {}
  products.forEach((p, i) => {
    productIndexMap[p.id] = i
  })

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Lead Queue</h2>
        <div className="flex gap-1">
          {STATUS_OPTIONS.map((s) => (
            <Button
              key={s}
              size="sm"
              variant={statusFilter === s ? "default" : "outline"}
              onClick={() => setStatusFilter(s)}
            >
              {STATUS_LABELS[s] || s}
            </Button>
          ))}
        </div>
      </div>

      {/* Lead list */}
      {loading ? (
        <div className="text-center text-muted-foreground py-12">Loading leads...</div>
      ) : leads.length === 0 ? (
        <div className="text-center text-muted-foreground py-12 space-y-2">
          <Inbox className="h-12 w-12 mx-auto opacity-30" />
          <p>No leads yet. Hit Run Scan to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {leads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              productIndex={productIndexMap[lead.product_id] || 0}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  )
}
