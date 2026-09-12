'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { Copy, Check, Maximize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import 'highlight.js/styles/github-dark.css'

function CodeBlock({ inline, className, children, language, onOpenInCanvas, ...props }) {
  const [copied, setCopied] = useState(false)
  const codeString = String(children).replace(/\n$/, '')
  
  const handleCopy = () => {
    navigator.clipboard.writeText(codeString)
    setCopied(true)
    toast.success('Code copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleOpenInCanvas = () => {
    if (onOpenInCanvas) {
      onOpenInCanvas(codeString, language)
    }
  }

  if (inline) {
    return (
      <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono border border-border" {...props}>
        {children}
      </code>
    )
  }

  return (
    <div className="group relative my-4 rounded-xl overflow-hidden border border-border bg-slate-950 dark:bg-slate-950">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 dark:bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2">
          {language && (
            <span className="text-xs font-medium text-slate-400">
              {language}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            onClick={handleCopy}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
          {onOpenInCanvas && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              onClick={handleOpenInCanvas}
              title="Open in Canvas"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
      
      {/* Code Content */}
      <div className="overflow-x-auto">
        <code className={`${className} block p-4 text-sm leading-relaxed`} {...props}>
          {children}
        </code>
      </div>
    </div>
  )
}

export function MarkdownRenderer({ content, className = '', onOpenInCanvas }) {
  return (
    <div className={`prose prose-sm dark:prose-invert max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
        // Customize code blocks
        code({ node, inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '')
          const language = match ? match[1] : null
          
          return (
            <CodeBlock
              inline={inline}
              className={className}
              language={language}
              onOpenInCanvas={onOpenInCanvas}
              {...props}
            >
              {children}
            </CodeBlock>
          )
        },
        // Customize links
        a({ node, children, ...props }) {
          return (
            <a
              className="text-primary hover:underline"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            >
              {children}
            </a>
          )
        },
        // Customize headings
        h1({ node, children, ...props }) {
          return (
            <h1 className="text-2xl font-bold mt-4 mb-2" {...props}>
              {children}
            </h1>
          )
        },
        h2({ node, children, ...props }) {
          return (
            <h2 className="text-xl font-semibold mt-3 mb-2" {...props}>
              {children}
            </h2>
          )
        },
        h3({ node, children, ...props }) {
          return (
            <h3 className="text-lg font-semibold mt-2 mb-1" {...props}>
              {children}
            </h3>
          )
        },
        // Customize lists
        ul({ node, children, ...props }) {
          return (
            <ul className="list-disc list-inside my-2 space-y-1" {...props}>
              {children}
            </ul>
          )
        },
        ol({ node, children, ...props }) {
          return (
            <ol className="list-decimal list-inside my-2 space-y-1" {...props}>
              {children}
            </ol>
          )
        },
        // Customize blockquotes
        blockquote({ node, children, ...props }) {
          return (
            <blockquote
              className="border-l-4 border-primary pl-4 italic my-2"
              {...props}
            >
              {children}
            </blockquote>
          )
        },
        // Customize tables
        table({ node, children, ...props }) {
          return (
            <div className="overflow-x-auto my-2">
              <table className="min-w-full border-collapse border border-border" {...props}>
                {children}
              </table>
            </div>
          )
        },
        th({ node, children, ...props }) {
          return (
            <th className="border border-border px-3 py-2 bg-muted font-semibold text-left" {...props}>
              {children}
            </th>
          )
        },
        td({ node, children, ...props }) {
          return (
            <td className="border border-border px-3 py-2" {...props}>
              {children}
            </td>
          )
        },
        // Customize paragraphs
        p({ node, children, ...props }) {
          // Check if paragraph contains block-level elements that should not be nested in <p>
          // This includes code blocks, which render as <div> elements
          const hasBlockElements = node?.children?.some(child => {
            if (child.type === 'element') {
              // Check for code elements (both inline and block)
              if (child.tagName === 'code' || child.tagName === 'pre') {
                // Block code has className with language-*
                const hasLanguageClass = child.properties?.className?.some(
                  cls => cls.startsWith('language-')
                )
                return hasLanguageClass
              }
              // Also check for other block elements
              return ['div', 'section', 'article', 'aside'].includes(child.tagName)
            }
            return false
          })
          
          // If it contains block elements, render as fragment to avoid invalid HTML nesting
          if (hasBlockElements) {
            return <div className="my-2 leading-relaxed">{children}</div>
          }
          
          return (
            <p className="my-2 leading-relaxed" {...props}>
              {children}
            </p>
          )
        },
        // Customize pre (prevent double wrapping with CodeBlock)
        pre({ node, children, ...props }) {
          // Just pass through children since CodeBlock handles the wrapper
          return <>{children}</>
        },
      }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
