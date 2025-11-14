import React from 'react'
import { authService } from '../../services/auth.service'

type LiveStreamProps = {
  className?: string
  quality?: number
  fps?: number
}

export default function LiveStream({ className, quality = 70, fps = 15 }: LiveStreamProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const [size, setSize] = React.useState<{ w: number; h: number }>({ w: 0, h: 0 })
  const [src, setSrc] = React.useState<string>('')
  const [useToken, setUseToken] = React.useState<boolean>(false)

  const baseUrl = React.useMemo(() => {
    if (process.env.VITE_VISION_CAPTURE_SERVICE_URL) {
      return process.env.VITE_VISION_CAPTURE_SERVICE_URL
    }
    if (typeof window !== 'undefined') {
      return window.location.origin
    }
    return 'http://localhost:6410'
  }, [])

  // Observe container size
  React.useEffect(() => {
    if (!containerRef.current) return
    const el = containerRef.current
    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect()
      const w = Math.max(1, Math.floor(rect.width))
      const h = Math.max(1, Math.floor(rect.height))
      setSize({ w, h })
    })
    ro.observe(el)
    // initial
    const rect = el.getBoundingClientRect()
    setSize({ w: Math.max(1, Math.floor(rect.width)), h: Math.max(1, Math.floor(rect.height)) })
    return () => ro.disconnect()
  }, [])

  // Build stream URL when size or token changes
  React.useEffect(() => {
    const token = useToken ? (authService.getCurrentToken() || '') : ''
    const params = new URLSearchParams()
    if (size.w) params.set('w', String(size.w))
    else params.set('w', '640')
    if (size.h) params.set('h', String(size.h))
    else params.set('h', '360')
    params.set('q', String(quality))
    params.set('fps', String(fps))
    if (token) params.set('token', token)
    setSrc(`${baseUrl}/api/v1/stream/mjpeg?${params.toString()}`)
  }, [size.w, size.h, quality, fps, baseUrl, useToken])

  // If tokenized stream fails (401/403), retry without token
  const handleImgError = React.useCallback(() => {
    if (useToken) {
      setUseToken(false)
    }
  }, [useToken])

  return (
    <div ref={containerRef} className={className} style={{ position: 'relative' }}>
      {src && (
        <img
          src={src}
          alt="Live stream"
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
          onError={handleImgError}
        />)
      }
    </div>
  )
}


