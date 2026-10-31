import { createFileRoute, notFound } from '@tanstack/react-router'
import { getPublished } from '../data'
import { PortfolioView } from '../PortfolioView'

export const Route = createFileRoute('/p/$slug')({
  loader: async ({ params }) => {
    const p = (await getPublished()).find((x) => x.slug === params.slug)
    if (!p) throw notFound()
    return p
  },
  component: Detail,
})

function Detail() {
  return <PortfolioView p={Route.useLoaderData()} />
}
