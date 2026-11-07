'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { QrCodeIcon, DownloadSimpleIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export function RepoQRCode({ repoFullName }) {
  const [isOpen, setIsOpen] = useState(false)

  // The QR URL is derived from a prop, so it is plain state-free computation.
  // It used to be set from an effect that called a function declared after it,
  // with `isOpen` in the deps for no reason.
  const qrCodeUrl = useMemo(() => {
    if (!repoFullName) return ''
    const target = `https://github.com/${repoFullName}`
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(target)}`
  }, [repoFullName])

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = qrCodeUrl
    link.download = `${repoFullName.replace('/', '-')}-qr.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" title="Show QR Code">
          <QrCodeIcon className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Repository QR Code</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center space-y-4">
          {qrCodeUrl ? (
            <>
              {/* White quiet zone in both themes, so the code stays scannable. */}
              <div className="p-4 bg-white rounded-lg">
                <Image
                  src={qrCodeUrl}
                  alt={`QR code linking to the ${repoFullName} repository on GitHub`}
                  width={256}
                  height={256}
                  unoptimized
                  className="w-64 h-64"
                />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Scan to visit {repoFullName} on GitHub
              </p>
              <Button onClick={handleDownload} className="w-full">
                <DownloadSimpleIcon className="h-4 w-4 mr-2" />
                Download QR Code
              </Button>
            </>
          ) : (
            <div className="w-64 h-64 bg-muted animate-pulse rounded-lg" />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
