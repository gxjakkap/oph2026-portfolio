import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { PortfolioForm } from '../admin/PortfolioForm'
import { admin } from '../data'
import { useT } from '../i18n'

export const Route = createFileRoute('/admin/new')({
  loader: async () => projectsOf(await admin.list()),
  component: New,
})

export const projectsOf = (list: { applications: { project: string }[] }[]) =>
  [...new Set(list.flatMap((p) => p.applications.map((a) => a.project)))].sort((a, b) => a.localeCompare(b, 'th'))

function New() {
  const navigate = useNavigate()
  return (
    <>
      <h1 className="mb-4 text-2xl font-extrabold text-cream">{useT().admin.new}</h1>
      <PortfolioForm projects={Route.useLoaderData()} onSaved={(p) => navigate({ to: '/admin/$id', params: { id: p.id } })} />
    </>
  )
}
