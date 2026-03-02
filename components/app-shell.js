"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/sidebar"

export function AppShell({ children }) {
  const [products, setProducts] = useState([])
  const [selectedProduct, setSelectedProduct] = useState("all")

  async function loadProducts() {
    try {
      const res = await fetch("/api/products")
      if (res.ok) {
        const data = await res.json()
        setProducts(data)
      }
    } catch (err) {
      console.error("Failed to load products:", err)
    }
  }

  useEffect(() => {
    loadProducts()

    function handleScanComplete() {
      loadProducts()
    }
    window.addEventListener("scan-complete", handleScanComplete)
    return () => window.removeEventListener("scan-complete", handleScanComplete)
  }, [])

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        products={products}
        selectedProduct={selectedProduct}
        onSelectProduct={setSelectedProduct}
      />
      <main className="flex-1 overflow-y-auto">
        {typeof children === "function"
          ? children({ products, selectedProduct, refreshProducts: loadProducts })
          : children}
      </main>
    </div>
  )
}
