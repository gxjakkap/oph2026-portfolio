import { createFileRoute, Link } from '@tanstack/react-router'
import { panel } from '../admin/ui'
import { admin } from '../data'
import { useT } from '../i18n'

export const Route = createFileRoute('/admin/audit')({
  loader: admin.audit,
  component: Audit,
})

function Audit() {
  const t = useT()
  const a = t.admin
  const log = Route.useLoaderData()
  return (
    <div className={`${panel} overflow-x-auto p-3`}>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b-2 border-navy">
            <th className="p-2">{a.when}</th>
            <th className="p-2">{a.who}</th>
            <th className="p-2">{a.action}</th>
            <th className="p-2">slug</th>
            <th className="p-2">{a.snapshot}</th>
          </tr>
        </thead>
        <tbody>
          {log.map((e) => (
            <tr key={e.id} className="border-b border-navy/10 align-top">
              <td className="p-2 whitespace-nowrap">{new Date(e.at).toLocaleString(t.locale)}</td>
              <td className="p-2" title={e.actorDiscordId}>
                {e.actor}
              </td>
              <td className="p-2 font-semibold">{a.actions[e.action]}</td>
              <td className="p-2 font-mono">
                {e.action === 'delete' ? (
                  e.slug
                ) : (
                  <Link to="/admin/$id" params={{ id: e.portfolioId }} className="text-lilac hover:underline">
                    {e.slug}
                  </Link>
                )}
              </td>
              <td className="p-2">
                <details>
                  <summary className="cursor-pointer text-lilac">JSON</summary>
                  <pre className="mt-1 max-w-xl overflow-x-auto rounded-lg bg-navy p-2 text-xs text-cream">
                    {JSON.stringify(e.snapshot, null, 2)}
                  </pre>
                </details>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
