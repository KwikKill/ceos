import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Ceos - Todo App',
  description: 'Todo App made by KwikKill',
  generator: 'KwikKill',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className='dark'>{children}</body>
    </html>
  )
}
