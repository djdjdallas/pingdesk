/**
 * RFC 4180 compliant CSV field escaping.
 * Wraps in quotes if the value contains commas, quotes, or newlines.
 */
export function escapeCsvField(value) {
  if (value === null || value === undefined) return ""
  const str = String(value)
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return '"' + str.replace(/"/g, '""') + '"'
  }
  return str
}

const CSV_COLUMNS = [
  { header: "Product", accessor: (l) => l.products?.name },
  { header: "Status", accessor: (l) => l.status },
  { header: "Touch", accessor: (l) => l.touch },
  { header: "Relevance Score", accessor: (l) => l.relevance_score },
  { header: "Subreddit", accessor: (l) => l.subreddit },
  { header: "Post Title", accessor: (l) => l.post_title },
  { header: "Post URL", accessor: (l) => l.post_url },
  { header: "Author", accessor: (l) => l.author },
  { header: "Post Body", accessor: (l) => l.post_body },
  { header: "Relevance Reason", accessor: (l) => l.relevance_reason },
  { header: "AI Draft", accessor: (l) => l.drafted_reply },
  { header: "Humanized Reply", accessor: (l) => l.humanized_reply },
  { header: "Follow-up Reply", accessor: (l) => l.follow_up_reply },
  { header: "Created At", accessor: (l) => l.created_at },
]

/**
 * Converts leads array to CSV and triggers a browser download.
 */
export function exportLeadsCsv(leads, filename = "pingdesk-leads.csv") {
  const header = CSV_COLUMNS.map((c) => c.header).join(",")
  const rows = leads.map((lead) =>
    CSV_COLUMNS.map((c) => escapeCsvField(c.accessor(lead))).join(",")
  )

  // UTF-8 BOM for Excel compatibility
  const bom = "\uFEFF"
  const csv = bom + header + "\n" + rows.join("\n")

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
