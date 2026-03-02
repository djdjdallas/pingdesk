"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Radar, Inbox, PenLine, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/cn"

const PRODUCT_COLORS = [
  "bg-blue-100 text-blue-800",
  "bg-green-100 text-green-800",
  "bg-purple-100 text-purple-800",
  "bg-orange-100 text-orange-800",
  "bg-pink-100 text-pink-800",
  "bg-teal-100 text-teal-800",
  "bg-yellow-100 text-yellow-800",
]

export function Sidebar({ products, selectedProduct, onSelectProduct }) {
  const pathname = usePathname()
  const [scanning, setScanning] = useState(false)
  const [lastScan, setLastScan] = useState(null)

  useEffect(() => {
    const stored = localStorage.getItem("pingdesk_last_scan")
    if (stored) setLastScan(new Date(stored))
  }, [])

  async function runScan() {
    setScanning(true)
    try {
      const res = await fetch("/api/scan", { method: "POST" })
      const data = await res.json()
      const now = new Date()
      setLastScan(now)
      localStorage.setItem("pingdesk_last_scan", now.toISOString())
      // Trigger a refresh of leads
      window.dispatchEvent(new CustomEvent("scan-complete", { detail: data }))
    } catch (err) {
      console.error("Scan failed:", err)
    } finally {
      setScanning(false)
    }
  }

  const totalPending = products.reduce((sum, p) => sum + (p.pending_count || 0), 0)

  return (
    <aside className="w-64 h-screen bg-sidebar text-sidebar-foreground border-r flex flex-col shrink-0">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <Radar className="h-6 w-6 text-primary" />
          <h1 className="text-lg font-bold">PingDesk</h1>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-3 space-y-1">
        <Link
          href="/"
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
            pathname === "/" ? "bg-sidebar-muted" : "hover:bg-sidebar-muted"
          )}
        >
          <Inbox className="h-4 w-4" />
          Lead Queue
          {totalPending > 0 && (
            <Badge variant="secondary" className="ml-auto text-xs">
              {totalPending}
            </Badge>
          )}
        </Link>
        <Link
          href="/compose"
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
            pathname === "/compose" ? "bg-sidebar-muted" : "hover:bg-sidebar-muted"
          )}
        >
          <PenLine className="h-4 w-4" />
          Compose
        </Link>
      </nav>

      {/* Product filters */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3">
          Products
        </p>
        <button
          onClick={() => onSelectProduct("all")}
          className={cn(
            "w-full flex items-center justify-between px-3 py-1.5 rounded-md text-sm transition-colors",
            selectedProduct === "all" ? "bg-sidebar-muted font-medium" : "hover:bg-sidebar-muted"
          )}
        >
          All Products
          {totalPending > 0 && (
            <span className="text-xs text-muted-foreground">{totalPending}</span>
          )}
        </button>
        {products.map((product, i) => (
          <button
            key={product.id}
            onClick={() => onSelectProduct(product.id)}
            className={cn(
              "w-full flex items-center justify-between px-3 py-1.5 rounded-md text-sm transition-colors",
              selectedProduct === product.id
                ? "bg-sidebar-muted font-medium"
                : "hover:bg-sidebar-muted"
            )}
          >
            <span className="flex items-center gap-2">
              <span
                className={cn(
                  "w-2 h-2 rounded-full inline-block",
                  PRODUCT_COLORS[i % PRODUCT_COLORS.length].split(" ")[0]
                )}
              />
              {product.name}
            </span>
            {product.pending_count > 0 && (
              <span className="text-xs text-muted-foreground">{product.pending_count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Scan button */}
      <div className="p-3 border-t space-y-2">
        <Button
          onClick={runScan}
          disabled={scanning}
          className="w-full"
          size="sm"
        >
          {scanning ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Scanning...
            </>
          ) : (
            "Run Scan"
          )}
        </Button>
        {lastScan && (
          <p className="text-xs text-muted-foreground text-center">
            Last scan: {lastScan.toLocaleTimeString()}
          </p>
        )}
      </div>
    </aside>
  )
}

export { PRODUCT_COLORS }
