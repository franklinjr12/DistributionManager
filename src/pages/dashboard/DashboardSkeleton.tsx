import { Card, Skeleton } from '@/components/ui'

export function DashboardSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Carregando painel">
      <Card padding="lg">
        <Skeleton className="h-5 w-64" />
        <Skeleton className="mt-5 h-12 w-40" />
        <Skeleton className="mt-6 h-4 w-full rounded-full" />
        <Skeleton className="mt-6" lines={2} />
      </Card>
      <div className="grid gap-3 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Card key={i}>
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-4 h-8 w-full" />
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <Card key={i}>
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-4 h-7 w-20" />
          </Card>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <Skeleton className="h-72 w-full" />
        </Card>
        <Card>
          <Skeleton className="h-72 w-full" />
        </Card>
      </div>
    </div>
  )
}
