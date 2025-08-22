// oberhalb export default … steht bereits: import Link from 'next/link'
<header className="border-b border-neutral-800">
  <div className="container flex h-14 items-center justify-between">
    <Link href="/" className="font-semibold">Familien‑Momente</Link>
    <nav className="text-sm text-neutral-400 flex gap-4">
      <Link href="/signin" className="hover:text-neutral-200">Anmelden</Link>
      <Link href="/logout" className="hover:text-neutral-200">Abmelden</Link>
      <Link href="/legal" className="hover:text-neutral-200">Rechtliches</Link>
    </nav>
  </div>
</header>
