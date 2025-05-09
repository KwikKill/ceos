import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Ceos - Todo App',
  description: 'Todo App made by KwikKill',
  authors: [{ name: 'KwikKill' }],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
      </head>
      <body className='dark'>{children}</body>
    </html>
  )
}
