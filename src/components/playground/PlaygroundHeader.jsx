import { Button } from '@/components/ui/button'
import { ArrowLeftIcon } from '@phosphor-icons/react/ssr'
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
        <ArrowLeftIcon className="h-4 w-4 mr-2" />
        Back
      </Button>
      <h1 className="text-4xl font-bold mb-2">API Playground</h1>
      <p className="text-muted-foreground">
        {process.env.NEXT_PUBLIC_SEFGH_KEYS_V1 === '1'
          ? 'Create personal API keys and test public repository search'
          : 'Manage your API keys, monitor usage, set limits, and test endpoints'}
      </p>
    </div>
  )
}
