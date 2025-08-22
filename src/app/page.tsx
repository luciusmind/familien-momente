import { supabase } from '@/lib/supabase-browser'


'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'


const router = useRouter()
useEffect(() => {
  supabase.auth.getSession().then(({ data }) => {
    if (!data.session) router.replace('/signin')
  })
}, [router])

export default function Home() {
  return (
    <div className="container">
      <h1 className="text-2xl font-bold mb-4">Hallo Familie 👋</h1>
      <p className="card p-4">
        Wenn du das hier siehst, laufen Next.js + Tailwind lokal. 🎉
      </p>
      <button className="btn mt-4">Test-Button</button>
    </div>
  );
}
