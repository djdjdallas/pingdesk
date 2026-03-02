import "./globals.css"

export const metadata = {
  title: "PingDesk — Reddit Social Listening",
  description: "Monitor Reddit for leads, draft replies, and compose outreach messages.",
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
