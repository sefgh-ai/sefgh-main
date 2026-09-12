'use client'

import { useState, useEffect } from "react"
import { ArrowLeft, FileText, Code, Paintbrush, Download, Copy, Play, Settings, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import python from 'highlight.js/lib/languages/python'
import java from 'highlight.js/lib/languages/java'
import cpp from 'highlight.js/lib/languages/cpp'
import csharp from 'highlight.js/lib/languages/csharp'
import go from 'highlight.js/lib/languages/go'
import rust from 'highlight.js/lib/languages/rust'
import ruby from 'highlight.js/lib/languages/ruby'
import php from 'highlight.js/lib/languages/php'
import swift from 'highlight.js/lib/languages/swift'
import kotlin from 'highlight.js/lib/languages/kotlin'
import css from 'highlight.js/lib/languages/css'
import html from 'highlight.js/lib/languages/xml'
import json from 'highlight.js/lib/languages/json'
import markdown from 'highlight.js/lib/languages/markdown'
import plaintext from 'highlight.js/lib/languages/plaintext'
import 'highlight.js/styles/github-dark.css'

// Register languages
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('python', python)
hljs.registerLanguage('java', java)
hljs.registerLanguage('cpp', cpp)
hljs.registerLanguage('csharp', csharp)
hljs.registerLanguage('go', go)
hljs.registerLanguage('rust', rust)
hljs.registerLanguage('ruby', ruby)
hljs.registerLanguage('php', php)
hljs.registerLanguage('swift', swift)
hljs.registerLanguage('kotlin', kotlin)
hljs.registerLanguage('css', css)
hljs.registerLanguage('html', html)
hljs.registerLanguage('json', json)
hljs.registerLanguage('markdown', markdown)
hljs.registerLanguage('plaintext', plaintext)

export function Canvas({ content, onChange, onClose, initialLanguage = 'javascript' }) {
  const [activeTab, setActiveTab] = useState('code')
  const [code, setCode] = useState('// Start coding...')
  const [language, setLanguage] = useState('javascript')
  const [notes, setNotes] = useState('')

  // Update code when content prop changes
  useEffect(() => {
    if (content) {
      setCode(content)
      console.log('Canvas: Content updated:', content.substring(0, 50) + '...')
    }
  }, [content])

  // Update language when initialLanguage changes
  useEffect(() => {
    if (initialLanguage) {
      setLanguage(initialLanguage)
      console.log('Canvas: Language updated to:', initialLanguage)
    }
  }, [initialLanguage])

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    toast.success('Code copied to clipboard!')
  }

  const handleDownload = () => {
    const ext = getFileExtension(language)
    const blob = new Blob([code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `canvas-code.${ext}`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Code downloaded!')
  }

  const getFileExtension = (lang) => {
    const extensions = {
      javascript: 'js',
      typescript: 'ts',
      python: 'py',
      java: 'java',
      cpp: 'cpp',
      csharp: 'cs',
      go: 'go',
      rust: 'rs',
      ruby: 'rb',
      php: 'php',
      swift: 'swift',
      kotlin: 'kt',
      css: 'css',
      html: 'html',
      json: 'json',
      markdown: 'md'
    }
    return extensions[lang] || 'txt'
  }

  const handleCodeChange = (value) => {
    setCode(value)
    if (onChange) onChange(value)
  }

  const getHighlightedCode = () => {
    if (!code) return ''
    try {
      const highlighted = hljs.highlight(code, { language }).value
      return highlighted
    } catch (error) {
      console.error('Highlight error:', error)
      // If highlight fails, try with plain text
      try {
        return hljs.highlight(code, { language: 'plaintext' }).value
      } catch (e) {
        return code
      }
    }
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b p-4 bg-slate-900 dark:bg-slate-950">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="flex-shrink-0 text-slate-300 hover:text-white"
            >
              <X className="h-5 w-5" />
            </Button>
            <div>
              <h2 className="text-xl font-bold text-white">Canvas</h2>
              <p className="text-sm text-slate-400">
                Write, edit, and visualize code
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-[140px] bg-slate-800 border-slate-700 text-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="javascript">JavaScript</SelectItem>
                <SelectItem value="typescript">TypeScript</SelectItem>
                <SelectItem value="python">Python</SelectItem>
                <SelectItem value="java">Java</SelectItem>
                <SelectItem value="cpp">C++</SelectItem>
                <SelectItem value="csharp">C#</SelectItem>
                <SelectItem value="go">Go</SelectItem>
                <SelectItem value="rust">Rust</SelectItem>
                <SelectItem value="ruby">Ruby</SelectItem>
                <SelectItem value="php">PHP</SelectItem>
                <SelectItem value="swift">Swift</SelectItem>
                <SelectItem value="kotlin">Kotlin</SelectItem>
                <SelectItem value="html">HTML</SelectItem>
                <SelectItem value="css">CSS</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="markdown">Markdown</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleCopy} className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700">
              <Copy className="h-3 w-3 mr-1.5" />
              Copy
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload} className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700">
              <Download className="h-3 w-3 mr-1.5" />
              Download
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col bg-slate-900 dark:bg-slate-950">
        <div className="border-b border-slate-800 px-4">
          <TabsList className="w-full justify-start h-12 bg-transparent">
            <TabsTrigger value="code" className="gap-2 data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400">
              <Code className="h-4 w-4" />
              Editor
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-2 data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400">
              <Paintbrush className="h-4 w-4" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="notes" className="gap-2 data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400">
              <FileText className="h-4 w-4" />
              Notes
            </TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4">
            {/* Code Editor Tab */}
            <TabsContent value="code" className="mt-0">
              <div className="space-y-4">
                <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                  {/* Code Editor with Line Numbers */}
                  <div className="flex">
                    {/* Line Numbers */}
                    <div className="select-none bg-slate-900 text-slate-500 text-xs font-mono py-4 px-3 border-r border-slate-800">
                      {code.split('\n').map((_, i) => (
                        <div key={i} className="leading-6 text-right">
                          {i + 1}
                        </div>
                      ))}
                    </div>
                    
                    {/* Code Input */}
                    <Textarea
                      value={code}
                      onChange={(e) => handleCodeChange(e.target.value)}
                      className="flex-1 min-h-[600px] font-mono text-sm bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 resize-none text-slate-100 leading-6 p-4"
                      placeholder="// Start coding here..."
                      spellCheck={false}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Preview Tab */}
            <TabsContent value="preview" className="mt-0">
              <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-400">
                    {language}
                  </span>
                </div>
                <ScrollArea className="h-[600px]">
                  <pre className="p-4 overflow-x-auto">
                    <code 
                      className={`hljs language-${language} text-sm`}
                      dangerouslySetInnerHTML={{ __html: getHighlightedCode() }}
                    />
                  </pre>
                </ScrollArea>
              </div>
            </TabsContent>

            {/* Notes Tab */}
            <TabsContent value="notes" className="mt-0">
              <div className="space-y-4">
                <div className="text-sm text-slate-400 bg-slate-900 p-3 rounded-lg border border-slate-800">
                  Take notes, add documentation, or write explanations about your code.
                </div>
                <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="min-h-[600px] bg-transparent border-0 text-slate-100 focus-visible:ring-0 focus-visible:ring-offset-0"
                    placeholder="Write your notes here..."
                  />
                </div>
              </div>
            </TabsContent>
          </div>
        </ScrollArea>
      </Tabs>
    </div>
  )
}
