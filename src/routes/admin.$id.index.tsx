import { createFileRoute, Link, notFound, useRouter } from '@tanstack/react-router'
import { PortfolioForm } from '../admin/PortfolioForm'
import { btn } from '../admin/ui'
import { admin } from '../data'
import { useT } from '../i18n'
import { projectsOf } from './admin.new'

export const Route = createFileRoute('/admin/$id/')({
  loader: async ({ params }) => {
    const list = await admin.list()
    const p = list.find((x) => x.id === params.id)
    if (!p) throw notFound()
    return { p, projects: projectsOf(list) }
  },
  component: Edit,
})

function Edit() {
  const { p, projects } = Route.useLoaderData()
  const router = useRouter()
  const a = useT().admin
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold text-cream">
          {a.edit}: {p.nickname || p.slug}
        </h1>
        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${p.published ? 'bg-teal text-navy' : 'bg-cream text-navy'}`}>
          {p.published ? a.published : a.draft}
        </span>
        <Link to="/admin/$id/preview" params={{ id: p.id }} className={`${btn} ml-auto`}>
          {a.preview}
        </Link>
      </div>
      <PortfolioForm initial={p} projects={projects} onSaved={() => router.invalidate()} />
    </>
  )
}
