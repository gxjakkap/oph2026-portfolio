import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { btn, btnDanger, btnPrimary, panel } from '../admin/ui'
import { admin, programColor, type Portfolio } from '../data'
import { useT } from '../i18n'

export const Route = createFileRoute('/admin/')({
  loader: admin.list,
  component: AdminList,
})

function AdminList() {
  const t = useT()
  const a = t.admin
  const list = Route.useLoaderData()
  const router = useRouter()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')

  const run = async (id: string, fn: () => Promise<unknown>) => {
    setError('')
    setBusy(id)
    try {
      await fn()
      await router.invalidate()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy('')
    }
  }

  const remove = (p: Portfolio) => {
    if (confirm(a.confirmDelete(p.slug))) run(p.id, () => admin.remove(p.id))
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3">
        <Link to="/admin/new" className={btnPrimary}>
          {a.new}
        </Link>
        <Link to="/admin/upload" className={`${btn} self-center`}>
          {a.bulk}
        </Link>
      </div>
      {error && <p className="rounded-xl bg-red-100 px-3 py-2 text-sm font-semibold text-red-800">{error}</p>}
      {list.length === 0 && <p className="py-8 text-center font-semibold text-cream">{a.empty}</p>}
      <ul className="flex flex-col gap-3">
        {list.map((p) => (
          <li key={p.id} className={`${panel} flex flex-wrap items-center gap-4 p-3`}>
            {p.cover ? (
              <img src={p.cover} alt="" className="h-20 w-15 shrink-0 rounded-lg border-2 border-navy object-cover object-top" />
            ) : (
              <div className="h-20 w-15 shrink-0 rounded-lg border-2 border-dashed border-navy/40" />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-extrabold">
                {p.nickname || '—'} <span className="font-semibold text-navy/70">· {p.name || '—'}</span>
              </p>
              <p className="font-mono text-xs text-navy/60">/p/{p.slug}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${p.published ? 'bg-teal text-navy' : 'bg-navy/10'}`}>
                  {p.published ? a.published : a.draft}
                </span>
                {!p.pdf && <span className="rounded-full bg-sun px-2 py-0.5 text-xs font-bold">{a.noPdf}</span>}
                {p.applications.map((x, i) => (
                  <span key={i} className={`rounded-full px-2 py-0.5 text-xs font-semibold ${programColor[x.program]}`}>
                    {t.programsShort[x.program]} · {t.roundN(x.round)} · {x.project}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/admin/$id" params={{ id: p.id }} className={btn}>
                {a.edit}
              </Link>
              <button
                className={btn}
                disabled={busy === p.id}
                onClick={() => run(p.id, () => admin.update(p.id, { published: !p.published }))}
              >
                {p.published ? a.unpublish : a.publish}
              </button>
              <button className={btnDanger} disabled={busy === p.id} onClick={() => remove(p)}>
                {a.del}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
