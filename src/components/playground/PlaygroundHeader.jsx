import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function PlaygroundHeader() {
  const router = useRouter()

  return (
    <div className="mb-8">
      <Button
        variant="ghost"
        onClick={() => router.back()}
        className="mb-4 hover:bg-accent"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>
      <h1 className="text-4xl font-bold mb-2">API Playground</h1>
      <p className="text-muted-foreground">
        Manage your API keys, monitor usage, set limits, and test endpoints
      </p>
    </div>
  )
}
