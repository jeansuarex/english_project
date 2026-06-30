import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useUser, useAuth } from '@clerk/react'
import { ArrowLeft, Maximize2, Minimize2, X, ChevronDown, ArrowLeftRight, Volume2, CheckCircle2 } from 'lucide-react'
import { Document, Page, pdfjs } from 'react-pdf'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker

import 'react-pdf/dist/Page/TextLayer.css'
import 'react-pdf/dist/Page/AnnotationLayer.css'

interface ResourceData {
  id: string
  title: string
  filename: string
}

export default function Reading() {
  const { resourceId } = useParams<{ resourceId: string }>()
  const { user } = useUser()
  const { getToken } = useAuth()
  const navigate = useNavigate()

  const [resource, setResource] = useState<ResourceData | null>(null)
  const [numPages, setNumPages] = useState<number | null>(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [vocabulary, setVocabulary] = useState<string[]>([])
  const [newWord, setNewWord] = useState('')
  const [loading, setLoading] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [lastClickedWord, setLastClickedWord] = useState<string | null>(null)
  const [translateInput, setTranslateInput] = useState('')
  const [translation, setTranslation] = useState<string | null>(null)
  const [translationLoading, setTranslationLoading] = useState(false)
  const [sourceLang, setSourceLang] = useState('en')
  const [targetLang, setTargetLang] = useState('es')
  const [learnedWords, setLearnedWords] = useState<Set<string>>(new Set())
  const [learnedAnim, setLearnedAnim] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    getToken().then(async (token) => {
      try {
        const res = await fetch('/api/vocabulary/learned', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const words: { word: string }[] = await res.json()
        setLearnedWords(new Set(words.map(w => w.word)))
      } catch {}
    })
  }, [user, getToken])

  useEffect(() => {
    if (!learnedAnim) return
    const timer = setTimeout(() => {
      setVocabulary((prev) => prev.filter((w) => w !== learnedAnim))
      setLearnedAnim(null)
    }, 1200)
    return () => clearTimeout(timer)
  }, [learnedAnim])

  useEffect(() => {
    function onFSChange() {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', onFSChange)
    return () => document.removeEventListener('fullscreenchange', onFSChange)
  }, [])

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      document.documentElement.requestFullscreen()
    }
  }

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    async function load() {
      if (!resourceId || !user) return
      try {
        const token = await getToken()
        const headers = { Authorization: `Bearer ${token}` }
        const [resRes, readingRes] = await Promise.all([
          fetch(`/api/resources/${resourceId}`, { headers }),
          fetch(`/api/resources/reading/${resourceId}`, { headers }),
        ])
        const resData = await resRes.json()
        setResource(resData)

        if (readingRes.ok) {
          const readingData = await readingRes.json()
          setVocabulary(readingData.vocabulary || [])
          setPageNumber(readingData.lastPage || 1)
        }
      } catch (err) {
        console.error('Failed to load resource:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [resourceId, user])

  const saveVocabulary = useCallback(async (words: string[], page: number) => {
    if (!user || !resourceId) return
    try {
      const token = await getToken()
      await fetch('/api/resources/reading/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          resourceId,
          vocabulary: words,
          lastPage: page,
        }),
      })
    } catch (err) {
      console.error('Failed to save reading session:', err)
    }
  }, [user, resourceId, getToken])

  const debouncedSave = useCallback((words: string[], page: number) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => saveVocabulary(words, page), 1000)
  }, [saveVocabulary])

  useEffect(() => {
    if (!loading) {
      debouncedSave(vocabulary, pageNumber)
    }
  }, [vocabulary, pageNumber, loading, debouncedSave])

  const vocabularyRef = useRef(vocabulary)
  useEffect(() => { vocabularyRef.current = vocabulary }, [vocabulary])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2000)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    if (!translateInput.trim()) return
    setTranslationLoading(true)
    setTranslation(null)
    fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(translateInput.trim())}&langpair=${sourceLang}|${targetLang}`)
      .then(r => r.json())
      .then(data => {
        setTranslation(data.responseStatus === 200 ? data.responseData.translatedText : '—')
      })
      .catch(() => setTranslation('—'))
      .finally(() => setTranslationLoading(false))
  }, [translateInput, sourceLang, targetLang])

  const selectWord = useCallback((word: string) => {
    setLastClickedWord(word)
    setTranslateInput(word)
  }, [])

  const speakWord = useCallback((text: string, lang: string) => {
    if (!text.trim()) return
    try {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text.trim())
      utterance.lang = lang
      utterance.rate = 0.85
      window.speechSynthesis.speak(utterance)
    } catch {}
  }, [])

  const addWordToVocab = useCallback((word: string) => {
    const cleaned = word.replace(/^[^\w]+|[^\w]+$/g, '').toLowerCase()
    if (cleaned) {
      if (!vocabularyRef.current.includes(cleaned)) {
        setVocabulary((prev) => [...prev, cleaned])
        setToast(cleaned)
      }
      selectWord(cleaned)
    }
  }, [selectWord])

  const processTextLayer = useCallback(() => {
    const textLayer = document.querySelector('.textLayer')
    if (!textLayer) return

    const spans = textLayer.querySelectorAll(':scope > span')
    spans.forEach((span) => {
      if (span.classList.contains('endOfContent') || span.hasAttribute('data-vocab')) return
      span.setAttribute('data-vocab', 'true')

      span.addEventListener('click', (e) => {
        const el = e.currentTarget as HTMLElement
        const ox = (e as MouseEvent).offsetX
        const text = el.textContent || ''
        if (!text.trim()) return

        const parts = text.split(/(\s+)/)
        const totalChars = text.length
        const spanW = el.offsetWidth || 1

        let cumX = 0
        for (const part of parts) {
          if (!part) continue
          const partW = spanW * (part.length / totalChars)
          if (part.trim() === '') { cumX += partW; continue }

          if (ox >= cumX && ox < cumX + partW) {
            addWordToVocab(part)
            return
          }
          cumX += partW
        }
      })
    })
  }, [addWordToVocab])

  const addWord = () => {
    const trimmed = newWord.trim().toLowerCase()
    if (trimmed) {
      if (!vocabulary.includes(trimmed)) {
        setVocabulary((prev) => [...prev, trimmed])
        setToast(trimmed)
      }
      selectWord(trimmed)
    }
    setNewWord('')
  }

  const removeWord = (word: string) => {
    setVocabulary((prev) => prev.filter((w) => w !== word))
  }

  const learnedRef = useRef(learnedWords)
  learnedRef.current = learnedWords

  const toggleLearnedWord = useCallback(async (word: string) => {
    const cleaned = word.replace(/^[^\w]+|[^\w]+$/g, '').toLowerCase()
    if (!cleaned) return
    const isLearned = learnedRef.current.has(cleaned)
    try {
      const token = await getToken()
      if (isLearned) {
        await fetch('/api/vocabulary/learn', {
          method: 'DELETE', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ word: cleaned }),
        })
        setLearnedWords((prev) => { const next = new Set(prev); next.delete(cleaned); return next })
      } else {
        const res = await fetch('/api/vocabulary/learn', {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ word: cleaned }),
        })
        if (res.ok) {
          setLearnedAnim(word)
          setLearnedWords((prev) => new Set(prev).add(cleaned))
        }
      }
    } catch {}
  }, [getToken])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addWord()
    }
  }

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages)
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') {
        setPageNumber((p) => Math.min(numPages || p, p + 1))
      } else if (e.key === 'ArrowLeft') {
        setPageNumber((p) => Math.max(1, p - 1))
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [numPages])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-cream)' }}>
        <p>Loading reading session...</p>
      </div>
    )
  }

  if (!resource) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-cream)' }}>
        <div style={{ textAlign: 'center' }}>
          <h2>Resource not found</h2>
           <button onClick={() => navigate('/dashboard?tab=resources')} style={{
            marginTop: '16px', padding: '12px 24px', background: 'var(--sage)',
            color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 600, cursor: 'pointer',
          }}>
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-cream)' }}>
      <header style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 24px', background: 'var(--card-white)', boxShadow: 'var(--shadow-soft)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button onClick={() => navigate('/dashboard?tab=resources')} style={{
            padding: '8px 16px', background: 'transparent', border: '1px solid var(--olive)',
            borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '14px',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            <ArrowLeft size={18} /> Back
          </button>
          <h1 style={{ fontSize: '18px', color: 'var(--sage)' }}>{resource.title}</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={toggleFullscreen}
            style={{
              padding: '6px 12px', background: 'transparent', border: '1px solid var(--olive)',
              borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '14px',
            }}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
          <button
            onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
            disabled={pageNumber <= 1}
            style={{
              padding: '6px 12px', background: 'var(--sage)', color: 'white',
              border: 'none', borderRadius: 'var(--radius-sm)', cursor: pageNumber <= 1 ? 'not-allowed' : 'pointer',
              opacity: pageNumber <= 1 ? 0.5 : 1,
            }}
          >
            Previous
          </button>
          <span style={{ fontSize: '14px', color: 'var(--text-subtle)' }}>
            Page {pageNumber} of {numPages || '?'}
          </span>
          <button
            onClick={() => setPageNumber((p) => Math.min(numPages || p, p + 1))}
            disabled={!numPages || pageNumber >= numPages}
            style={{
              padding: '6px 12px', background: 'var(--sage)', color: 'white',
              border: 'none', borderRadius: 'var(--radius-sm)', cursor: !numPages || pageNumber >= numPages ? 'not-allowed' : 'pointer',
              opacity: !numPages || pageNumber >= numPages ? 0.5 : 1,
            }}
          >
            Next
          </button>
        </div>
      </header>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{
          flex: 4, overflow: 'auto', display: 'flex', justifyContent: 'center',
          padding: '24px', background: 'var(--bg-cream)',
        }}>
          <Document
            file={`/api/resources/${resourceId}/file`}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={<p style={{ padding: '48px' }}>Loading PDF...</p>}
            error={<p style={{ padding: '48px', color: 'var(--danger-color)' }}>Failed to load PDF</p>}
          >
            <Page
              pageNumber={pageNumber}
              renderTextLayer
              renderAnnotationLayer
              width={Math.min(900, window.innerWidth * 0.55)}
              onRenderTextLayerSuccess={processTextLayer}
            />
          </Document>
        </div>

        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          background: 'var(--card-white)', boxShadow: 'var(--shadow-soft)',
          borderLeft: '1px solid var(--olive)',
        }}>
          <div style={{ flex: 3, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid var(--olive)' }}>
              <h2 style={{ fontSize: '16px', marginBottom: '4px', color: 'var(--sage)' }}>Vocabulary</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>Words you don't know</p>
            </div>

            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--olive)' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={newWord}
                  onChange={(e) => setNewWord(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Add a word..."
                  style={{
                    flex: 1, padding: '10px 12px', border: '2px solid var(--olive)',
                    borderRadius: 'var(--radius-sm)', fontSize: '14px',
                    background: 'var(--bg-cream)', outline: 'none',
                  }}
                />
                <button
                  onClick={addWord}
                  disabled={!newWord.trim()}
                  style={{
                    padding: '10px 16px', background: newWord.trim() ? 'var(--sage)' : 'var(--olive)',
                    color: 'white', border: 'none', borderRadius: 'var(--radius-sm)',
                    fontWeight: 600, cursor: newWord.trim() ? 'pointer' : 'not-allowed', fontSize: '14px',
                  }}
                >
                  Add
                </button>
              </div>
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: '12px 20px' }}>
              {vocabulary.length === 0 ? (
                <p style={{ color: 'var(--text-subtle)', fontSize: '14px', textAlign: 'center', padding: '32px 0' }}>
                  No words yet. Add words you don't know as you read.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {vocabulary.map((word) => {
                    const isAnimating = learnedAnim === word
                    const isAlreadyLearned = learnedWords.has(word.replace(/^[^\w]+|[^\w]+$/g, '').toLowerCase())
                    return (
                    <div
                      key={word}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '10px 12px',
                        background: isAnimating ? 'var(--score-bg-correct)' : 'var(--bg-cream)',
                        borderRadius: 'var(--radius-sm)', fontSize: '14px',
                        transition: 'background 0.3s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                        {isAnimating ? (
                          <span style={{ color: 'var(--sage)', fontWeight: 600, fontSize: '13px' }}>✓ Learned!</span>
                        ) : (
                          <>
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleLearnedWord(word) }}
                              style={{
                                background: 'none', border: 'none', cursor: 'pointer', padding: '2px',
                                display: 'flex', alignItems: 'center',
                                color: isAlreadyLearned ? 'var(--sage)' : 'var(--text-subtle)',
                              }}
                              title={isAlreadyLearned ? 'Learned' : 'Mark as learned'}
                            >
                              <CheckCircle2 size={16} />
                            </button>
                            <span
                              onClick={() => selectWord(word)}
                              style={{ fontWeight: 500, cursor: 'pointer' }}
                            >{word}</span>
                          </>
                        )}
                      </div>
                      {!isAnimating && (
                        <button
                          onClick={(e) => { e.stopPropagation(); removeWord(word) }}
                          style={{
                            background: 'none', border: 'none', color: 'var(--danger-color)',
                            cursor: 'pointer', padding: '2px 6px',
                            display: 'flex', alignItems: 'center',
                          }}
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div style={{ padding: '16px 20px', borderTop: '1px solid var(--olive)', fontSize: '12px', color: 'var(--text-subtle)' }}>
              {vocabulary.length} word{vocabulary.length !== 1 ? 's' : ''} • Auto-saved
            </div>
          </div>

          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            borderTop: '1px solid var(--border-light)',
            padding: '14px 14px 12px', overflow: 'hidden',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '8px', marginBottom: '12px',
            }}>
              <div style={{ position: 'relative' }}>
                <select
                  value={sourceLang}
                  onChange={(e) => setSourceLang(e.target.value)}
                  style={{
                    padding: '5px 28px 5px 12px',
                    border: '1px solid var(--border-light)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    background: 'var(--bg-cream)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    cursor: 'pointer',
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    MozAppearance: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = 'var(--sage)' }}
                  onBlur={(e) => { e.target.style.borderColor = 'var(--border-light)' }}
                >
                  <option value="en">EN</option>
                  <option value="es">ES</option>
                  <option value="pt">PT</option>
                  <option value="fr">FR</option>
                  <option value="de">DE</option>
                </select>
                <ChevronDown
                  size={12}
                  style={{
                    position: 'absolute', right: '9px', top: '50%',
                    transform: 'translateY(-50%)', pointerEvents: 'none',
                    color: 'var(--text-subtle)',
                  }}
                />
              </div>

              <button
                onClick={() => { const s = sourceLang; setSourceLang(targetLang); setTargetLang(s); }}
                style={{
                  width: '26px', height: '26px', borderRadius: '50%',
                  border: '1px solid var(--border-light)',
                  background: 'transparent',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--text-subtle)',
                  transition: 'all 0.2s',
                  flexShrink: 0,
                  padding: 0,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-muted)'; e.currentTarget.style.color = 'var(--sage)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-subtle)' }}
                title="Swap languages"
              >
                <ArrowLeftRight size={13} />
              </button>

              <div style={{ position: 'relative' }}>
                <select
                  value={targetLang}
                  onChange={(e) => setTargetLang(e.target.value)}
                  style={{
                    padding: '5px 28px 5px 12px',
                    border: '1px solid var(--border-light)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    background: 'var(--bg-cream)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    cursor: 'pointer',
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    MozAppearance: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = 'var(--sage)' }}
                  onBlur={(e) => { e.target.style.borderColor = 'var(--border-light)' }}
                >
                  <option value="es">ES</option>
                  <option value="pt">PT</option>
                  <option value="en">EN</option>
                  <option value="fr">FR</option>
                  <option value="de">DE</option>
                </select>
                <ChevronDown
                  size={12}
                  style={{
                    position: 'absolute', right: '9px', top: '50%',
                    transform: 'translateY(-50%)', pointerEvents: 'none',
                    color: 'var(--text-subtle)',
                  }}
                />
              </div>
            </div>

            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              background: 'var(--bg-cream)',
              borderRadius: '10px',
              padding: '10px 12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="text"
                  value={translateInput}
                  onChange={(e) => setTranslateInput(e.target.value)}
                  placeholder={sourceLang.toUpperCase() + ' word...'}
                  style={{
                    flex: 1, padding: '0', border: 'none',
                    fontSize: '14px', fontWeight: 600,
                    background: 'transparent', outline: 'none',
                    color: 'var(--text-primary)',
                    lineHeight: 1.4,
                  }}
                  autoComplete="off"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
                <button
                  onClick={() => speakWord(translateInput, sourceLang === 'en' ? 'en-US' : sourceLang)}
                  disabled={!translateInput.trim()}
                  style={{
                    width: '26px', height: '26px', borderRadius: '50%',
                    border: 'none', background: 'transparent',
                    cursor: translateInput.trim() ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: translateInput.trim() ? 'var(--sage)' : 'var(--border-light)',
                    transition: 'all 0.2s', flexShrink: 0, padding: 0,
                  }}
                  onMouseEnter={(e) => { if (translateInput.trim()) { e.currentTarget.style.background = 'var(--surface-muted)' } }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                  title="Listen to pronunciation"
                >
                  <Volume2 size={14} />
                </button>
              </div>

              <div style={{ height: '1px', background: 'var(--border-light)', margin: '6px 0' }} />

              <div style={{
                fontSize: '13px', color: 'var(--sage)', lineHeight: 1.4,
                minHeight: '18px', fontWeight: 500,
              }}>
                {translateInput.trim() ? (
                  translationLoading ? (
                    <span style={{ color: 'var(--text-subtle)', fontSize: '11px', fontStyle: 'italic' }}>
                      translating...
                    </span>
                  ) : (
                    translation
                  )
                ) : (
                  <span style={{ color: 'var(--text-subtle)', fontSize: '11px', fontWeight: 400 }}>
                    Type or click a word
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px',
          background: 'var(--sage)', color: 'white',
          padding: '12px 20px', borderRadius: 'var(--radius-sm)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          fontSize: '14px', fontWeight: 600,
          zIndex: 1000,
          animation: 'toastIn 0.3s ease',
        }}>
          ✓ {toast}
        </div>
      )}

      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
