import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../utils/api'
import { useAuth } from '../context/AuthContext'
import { Card, CardHeader, CardBody, Button, Badge, Skeleton } from '../components/ui'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, ChevronLeft, ChevronRight, CheckCircle, XCircle, Send, AlertTriangle, Save } from 'lucide-react'
import toast from 'react-hot-toast'

const QUESTION_TYPES = {
  MC: 'Multiple Choice',
  TF: 'True/False',
  ID: 'Identification',
  ES: 'Essay',
  multiple_choice: 'Multiple Choice',
  true_false: 'True/False',
  identification: 'Identification',
  essay: 'Essay',
}

const AUTOSAVE_INTERVAL = 15000

const slideVariants = {
  enter: (direction) => ({ x: direction > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction) => ({ x: direction < 0 ? 300 : -300, opacity: 0 }),
}

function LoadingSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96" />
      <Card>
        <CardBody className="p-6 space-y-4">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-10 w-40 mt-6" />
        </CardBody>
      </Card>
    </div>
  )
}

function QuizInfoScreen({ quiz, onStart, loading, hasAttempt, attemptsUsed, maxAttempts }) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Button variant="ghost" onClick={() => window.history.back()} className="mb-4">
        <ChevronLeft className="w-4 h-4 mr-1" /> Back
      </Button>

      <Card>
        <CardHeader>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{quiz.title}</h1>
          {quiz.grade_component && (
            <Badge variant="primary" className="mt-1">{quiz.grade_component}</Badge>
          )}
        </CardHeader>
        <CardBody className="space-y-6">
          {quiz.description && (
            <p className="text-gray-600 dark:text-gray-300">{quiz.description}</p>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">Questions</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {quiz.question_count ?? quiz.questions?.length ?? 0}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">Time Limit</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {quiz.time_limit_minutes ? `${quiz.time_limit_minutes} min` : 'None'}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Points</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {quiz.total_points ?? quiz.questions?.reduce((s, q) => s + (q.points || 1), 0) ?? 0}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">Passing Score</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {quiz.passing_score != null ? `${quiz.passing_score}%` : 'N/A'}
              </p>
            </div>
          </div>

          {quiz.description && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-amber-800 dark:text-amber-300 text-sm">Instructions</h3>
                  <p className="text-amber-700 dark:text-amber-400 text-sm mt-1 whitespace-pre-wrap">{quiz.description}</p>
                </div>
              </div>
            </div>
          )}

          {quiz.time_limit_minutes && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <p className="text-blue-700 dark:text-blue-300 text-sm font-medium">
                  This quiz has a {quiz.time_limit_minutes}-minute time limit. The quiz will auto-submit when time runs out.
                </p>
              </div>
            </div>
          )}

          {hasAttempt && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                <p className="text-green-700 dark:text-green-300 text-sm font-medium">
                  You have already attempted this quiz. {attemptsUsed}/{maxAttempts} attempts used.
                </p>
              </div>
            </div>
          )}

          <Button onClick={onStart} disabled={loading} className="w-full sm:w-auto" size="lg">
            {loading ? 'Starting...' : hasAttempt ? 'Retake Quiz' : 'Start Quiz'}
          </Button>
        </CardBody>
      </Card>
    </div>
  )
}

function QuestionNavigator({ questions, answers, markedQuestions, currentQuestion, onSelect }) {
  const getStatus = (q) => {
    if (markedQuestions.has(q.id)) return 'marked'
    if (answers[q.id] !== undefined && answers[q.id] !== '') return 'answered'
    return 'unanswered'
  }

  const statusColors = {
    answered: 'bg-green-500 text-white',
    marked: 'bg-amber-500 text-white',
    unanswered: 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Questions</h3>
      <div className="grid grid-cols-5 gap-2">
        {questions.map((q, idx) => {
          const status = getStatus(q)
          return (
            <button
              key={q.id}
              onClick={() => onSelect(idx)}
              className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                currentQuestion === idx
                  ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-800 scale-110'
                  : ''
              } ${statusColors[status]}`}
            >
              {idx + 1}
            </button>
          )
        })}
      </div>
      <div className="flex items-center gap-4 mt-4 text-xs text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-green-500" /> Answered
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-amber-500" /> Marked
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-gray-200 dark:bg-gray-700" /> Unanswered
        </span>
      </div>
    </div>
  )
}

function QuestionRenderer({ question, answer, onAnswer }) {
  const type = question.question_type || question.type

  if (type === 'MC' || type === 'multiple_choice') {
    return (
      <div className="space-y-3">
        {question.options?.map((opt, idx) => (
          <label
            key={opt.label ?? opt.id ?? idx}
            className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
              answer === opt.label
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <input
              type="radio"
              name={`q-${question.id}`}
              checked={answer === opt.label}
              onChange={() => onAnswer(opt.label)}
              className="mt-1 accent-blue-500"
            />
            <span className="text-gray-800 dark:text-gray-200">
              <span className="font-medium">{opt.label}.</span> {opt.text}
            </span>
          </label>
        ))}
      </div>
    )
  }

  if (type === 'TF' || type === 'true_false') {
    const trueLabel = question.options?.find(o => o.text === 'True' || o.label === 'True')?.label || 'True'
    const falseLabel = question.options?.find(o => o.text === 'False' || o.label === 'False')?.label || 'False'
    return (
      <div className="flex gap-4">
        {[trueLabel, falseLabel].map((label) => (
          <label
            key={label}
            className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-all ${
              answer === label
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <input
              type="radio"
              name={`q-${question.id}`}
              checked={answer === label}
              onChange={() => onAnswer(label)}
              className="accent-blue-500"
            />
            <span className="font-medium text-gray-800 dark:text-gray-200">{label}</span>
          </label>
        ))}
      </div>
    )
  }

  if (type === 'ID' || type === 'identification') {
    return (
      <input
        type="text"
        value={answer ?? ''}
        onChange={(e) => onAnswer(e.target.value)}
        placeholder="Type your answer here..."
        className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none transition-colors"
      />
    )
  }

  if (type === 'ES' || type === 'essay') {
    return (
      <textarea
        value={answer ?? ''}
        onChange={(e) => onAnswer(e.target.value)}
        placeholder="Write your essay answer here..."
        rows={8}
        className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none transition-colors resize-y"
      />
    )
  }

  return <p className="text-gray-500">Unsupported question type</p>
}

function Timer({ timeRemaining }) {
  const hours = Math.floor(timeRemaining / 3600)
  const minutes = Math.floor((timeRemaining % 3600) / 60)
  const seconds = timeRemaining % 60

  const isLow = timeRemaining <= 300
  const isUrgent = timeRemaining <= 60

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full font-mono text-sm font-semibold transition-colors ${
        isUrgent
          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 animate-pulse'
          : isLow
          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
          : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
      }`}
    >
      <Clock className="w-4 h-4" />
      <span>
        {hours > 0 ? `${hours}:` : ''}
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </span>
    </div>
  )
}

function ConfirmDialog({ open, onConfirm, onCancel, unansweredCount, markedCount }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-sm mx-4 w-full"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Submit Quiz?</h3>
        </div>
        {unansweredCount > 0 && (
          <p className="text-amber-600 dark:text-amber-400 text-sm font-medium mb-2">
            You have {unansweredCount} unanswered question{unansweredCount !== 1 ? 's' : ''}.
          </p>
        )}
        {markedCount > 0 && (
          <p className="text-amber-600 dark:text-amber-400 text-sm font-medium mb-2">
            You have {markedCount} marked question{markedCount !== 1 ? 's' : ''} for review.
          </p>
        )}
        <p className="text-gray-600 dark:text-gray-300 text-sm mb-6">
          Are you sure you want to submit your quiz? This action cannot be undone.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={onConfirm} className="bg-green-600 hover:bg-green-700 text-white">Submit</Button>
        </div>
      </motion.div>
    </div>
  )
}

function ResultsScreen({ results, quiz, onBack }) {
  const score = results.total_score ?? results.score ?? 0
  const total = results.max_score ?? results.total_points ?? results.total ?? 0
  const percentage = results.percentage ?? (total > 0 ? Math.round((score / total) * 100) : 0)
  const passed = results.passed ?? (quiz.passing_score != null ? percentage >= quiz.passing_score : null)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <Button variant="ghost" onClick={onBack}>
        <ChevronLeft className="w-4 h-4 mr-1" /> Back to Quizzes
      </Button>

      <Card>
        <CardBody className="p-6 text-center space-y-4">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', duration: 0.6 }}>
            <div
              className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center ${
                passed === true
                  ? 'bg-green-100 dark:bg-green-900/30'
                  : passed === false
                  ? 'bg-red-100 dark:bg-red-900/30'
                  : 'bg-blue-100 dark:bg-blue-900/30'
              }`}
            >
              {passed === true ? (
                <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
              ) : passed === false ? (
                <XCircle className="w-12 h-12 text-red-600 dark:text-red-400" />
              ) : (
                <Send className="w-12 h-12 text-blue-600 dark:text-blue-400" />
              )}
            </div>
          </motion.div>

          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{percentage}%</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {score} / {total} points
            </p>
          </div>

          {passed !== null && (
            <Badge
              variant={passed ? 'success' : 'danger'}
              className="text-base px-4 py-1"
            >
              {passed ? 'PASSED' : 'FAILED'}
            </Badge>
          )}
        </CardBody>
      </Card>

      {results.answers && results.answers.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Review Answers</h3>
          {results.answers.map((detail, idx) => {
            const type = detail.question_type || detail.type
            const isCorrect = detail.is_correct

            return (
              <Card key={detail.question ?? idx}>
                <CardBody className="p-5">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Q{idx + 1}</span>
                      <Badge variant={type === 'essay' ? 'warning' : isCorrect ? 'success' : 'danger'} className="text-xs">
                        {type === 'essay' ? 'Pending Review' : isCorrect ? 'Correct' : 'Incorrect'}
                      </Badge>
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {detail.points_earned ?? 0}/{detail.question_points ?? detail.points ?? 1} pts
                    </span>
                  </div>

                  <p className="text-gray-800 dark:text-gray-200 font-medium mb-3">{detail.question_content ?? detail.question_text ?? detail.question}</p>

                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Your answer: </span>
                      <span className={`${isCorrect ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'} font-medium`}>
                        {Array.isArray(detail.answer) ? detail.answer.join(', ') : (detail.answer || 'No answer')}
                      </span>
                    </div>

                    {!isCorrect && detail.correct_answer_display != null && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Correct answer: </span>
                        <span className="text-green-600 dark:text-green-400 font-medium">{detail.correct_answer_display}</span>
                      </div>
                    )}
                  </div>
                </CardBody>
              </Card>
            )
          })}
        </div>
      )}

      <div className="flex justify-center pt-4">
        <Button onClick={onBack} size="lg">Back to Quizzes</Button>
      </div>
    </div>
  )
}

export default function QuizTake() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user: _user } = useAuth()

  const [quiz, setQuiz] = useState(null)
  const [attempt, setAttempt] = useState(null)
  const [answers, setAnswers] = useState({})
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [results, setResults] = useState(null)
  const [markedQuestions, setMarkedQuestions] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [direction, setDirection] = useState(1)
  const [autosaveStatus, setAutosaveStatus] = useState(null)
  const [lastSaved, setLastSaved] = useState(null)

  const timerRef = useRef(null)
  const autosaveRef = useRef(null)
  const answersRef = useRef(answers)
  const attemptRef = useRef(attempt)

  const questions = attempt?.questions ?? quiz?.questions ?? []

  useEffect(() => {
    answersRef.current = answers
  }, [answers])

  useEffect(() => {
    attemptRef.current = attempt
  }, [attempt])

  useEffect(() => {
    async function loadQuiz() {
      try {
        setLoading(true)
        const res = await api.get(`/quizzes/${id}/`)
        setQuiz(res.data)
      } catch {
        toast.error('Failed to load quiz')
        navigate('/my-quizzes')
      } finally {
        setLoading(false)
      }
    }
    loadQuiz()
  }, [id, navigate])

  useEffect(() => {
    if (!attempt) return

    if (attempt.time_limit_minutes && attempt.started_at && timeRemaining === null) {
      const started = new Date(attempt.started_at).getTime()
      const end = started + attempt.time_limit_minutes * 60 * 1000
      const remaining = Math.max(0, Math.floor((end - Date.now()) / 1000))
      setTimeRemaining(remaining)
    } else if (!attempt.time_limit_minutes) {
      setTimeRemaining(null)
    }
  }, [attempt])

  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0 || submitted) return

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          handleSubmit()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timerRef.current)
  }, [timeRemaining !== null, submitted])

  const logIntegrityEvent = useCallback(async (eventType, details = {}) => {
    if (!attemptRef.current || submitted) return
    try {
      await api.post(`/quizzes/${id}/log_integrity/`, {
        event_type: eventType,
        details,
      })
    } catch {
      // Silently fail - don't disrupt the student
    }
  }, [id, submitted])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && attemptRef.current && !submitted) {
        logIntegrityEvent('tab_blur', { timestamp: Date.now() })
      }
    }

    const handleBeforeUnload = (e) => {
      if (attemptRef.current && !submitted) {
        e.preventDefault()
        e.returnValue = ''
        logIntegrityEvent('window_blur', { timestamp: Date.now() })
      }
    }

    const handleKeyDown = (e) => {
      if (attemptRef.current && !submitted) {
        if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
          logIntegrityEvent('devtools_open', { key: e.key })
        }
        if (e.ctrlKey && e.key === 'u') {
          e.preventDefault()
          logIntegrityEvent('copy_attempt', { action: 'view_source' })
        }
      }
    }

    const handleContextMenu = () => {
      if (attemptRef.current && !submitted) {
        logIntegrityEvent('right_click', { timestamp: Date.now() })
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('contextmenu', handleContextMenu)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('contextmenu', handleContextMenu)
    }
  }, [submitted, logIntegrityEvent])

  const performAutosave = useCallback(async () => {
    if (!attemptRef.current || submitted) return

    const currentAnswers = answersRef.current
    const answerEntries = Object.entries(currentAnswers).filter(([, v]) => v !== undefined && v !== '')

    if (answerEntries.length === 0) return

    setAutosaveStatus('saving')
    try {
      const answersPayload = answerEntries.map(([questionId, value]) => ({
        question_id: parseInt(questionId),
        answer: value,
      }))

      await api.post(`/quizzes/${id}/autosave/`, { answers: answersPayload })
      setAutosaveStatus('saved')
      setLastSaved(new Date())
      setTimeout(() => setAutosaveStatus(null), 2000)
    } catch {
      setAutosaveStatus('error')
      setTimeout(() => setAutosaveStatus(null), 3000)
    }
  }, [id, submitted])

  useEffect(() => {
    if (!attempt || submitted) return

    autosaveRef.current = setInterval(performAutosave, AUTOSAVE_INTERVAL)

    return () => {
      if (autosaveRef.current) {
        clearInterval(autosaveRef.current)
      }
    }
  }, [attempt, submitted, performAutosave])

  const handleStart = useCallback(async () => {
    try {
      setLoading(true)
      const res = await api.post(`/quizzes/${id}/start/`)
      setAttempt(res.data)

      const savedAnswers = {}
      if (res.data.questions) {
        res.data.questions.forEach(q => {
          if (q.student_answer !== undefined) {
            savedAnswers[q.id] = q.student_answer
          }
        })
      }
      setAnswers(savedAnswers)
      setCurrentQuestion(0)
      setMarkedQuestions(new Set())
      setDirection(1)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to start quiz')
    } finally {
      setLoading(false)
    }
  }, [id])

  const handleAnswer = useCallback((questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }, [])

  const navigateQuestion = useCallback((newIdx) => {
    setDirection(newIdx > currentQuestion ? 1 : -1)
    setCurrentQuestion(newIdx)
  }, [currentQuestion])

  const toggleMark = useCallback((questionId) => {
    setMarkedQuestions((prev) => {
      const next = new Set(prev)
      if (next.has(questionId)) {
        next.delete(questionId)
      } else {
        next.add(questionId)
      }
      return next
    })
  }, [])

  const handleSubmit = useCallback(async () => {
    if (submitted || submitting) return

    try {
      setSubmitting(true)
      clearInterval(timerRef.current)
      if (autosaveRef.current) {
        clearInterval(autosaveRef.current)
      }

      const answersPayload = questions.map((q) => ({
        question_id: q.id,
        answer: answers[q.id] ?? '',
      }))

      const res = await api.post(`/quizzes/${id}/submit/`, { answers: answersPayload })
      setResults(res.data)
      setSubmitted(true)
      toast.success('Quiz submitted successfully!')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to submit quiz')
    } finally {
      setSubmitting(false)
      setShowConfirm(false)
    }
  }, [id, questions, answers, submitted, submitting])

  if (loading && !quiz) return <LoadingSkeleton />

  if (!quiz) return null

  if (submitted && results) {
    return <ResultsScreen results={results} quiz={quiz} onBack={() => navigate('/my-quizzes')} />
  }

  if (!attempt) {
    return (
      <QuizInfoScreen
        quiz={quiz}
        onStart={handleStart}
        loading={loading}
        hasAttempt={quiz.student_has_attempted}
        attemptsUsed={quiz.student_attempts_used ?? 0}
        maxAttempts={quiz.max_attempts}
      />
    )
  }

  const q = questions[currentQuestion]
  const currentQType = q?.question_type ?? q?.type

  const answeredCount = Object.keys(answers).filter((k) => answers[k] !== undefined && answers[k] !== '').length
  const markedCount = markedQuestions.size

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold text-gray-900 dark:text-white truncate">{quiz.title}</h1>
          <div className="flex items-center gap-3">
            {autosaveStatus && (
              <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                autosaveStatus === 'saving' ? 'text-amber-600 bg-amber-50' :
                autosaveStatus === 'saved' ? 'text-green-600 bg-green-50' :
                'text-red-600 bg-red-50'
              }`}>
                <Save className="w-3 h-3" />
                {autosaveStatus === 'saving' ? 'Saving...' :
                 autosaveStatus === 'saved' ? 'Saved' : 'Save failed'}
              </div>
            )}
            {lastSaved && !autosaveStatus && (
              <span className="text-xs text-gray-400">
                Last saved: {lastSaved.toLocaleTimeString()}
              </span>
            )}
            {timeRemaining !== null && (
              <Timer timeRemaining={timeRemaining} onTimeUp={handleSubmit} />
            )}
            <Button
              onClick={() => setShowConfirm(true)}
              disabled={submitting}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Send className="w-4 h-4 mr-1" /> Submit
            </Button>
          </div>
        </div>

        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-6">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${questions.length > 0 ? ((currentQuestion + 1) / questions.length) * 100 : 0}%` }}
          />
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={currentQuestion}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25 }}
              >
                {q && (
                  <Card>
                    <CardBody className="p-6">
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-gray-500 dark:text-gray-400">
                            Question {currentQuestion + 1} of {questions.length}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {QUESTION_TYPES[currentQType] ?? currentQType}
                          </Badge>
                          {q.points != null && (
                            <Badge variant="secondary" className="text-xs">{q.points} pt{q.points !== 1 ? 's' : ''}</Badge>
                          )}
                        </div>
                        <button
                          onClick={() => toggleMark(q.id)}
                          className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium transition-all ${
                            markedQuestions.has(q.id)
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                              : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                          }`}
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                          {markedQuestions.has(q.id) ? 'Marked' : 'Mark'}
                        </button>
                      </div>

                      <p className="text-gray-800 dark:text-gray-200 text-lg font-medium mb-6 whitespace-pre-wrap">
                        {q.content ?? q.question_text ?? q.question}
                      </p>

                      <QuestionRenderer
                        question={q}
                        answer={answers[q.id]}
                        onAnswer={(val) => handleAnswer(q.id, val)}
                      />

                      <div className="flex items-center justify-between mt-8 pt-4 border-t border-gray-100 dark:border-gray-800">
                        <Button
                          variant="outline"
                          onClick={() => navigateQuestion(currentQuestion - 1)}
                          disabled={currentQuestion === 0}
                        >
                          <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                        </Button>

                        {currentQuestion === questions.length - 1 ? (
                          <Button onClick={() => setShowConfirm(true)} disabled={submitting}>
                            <Send className="w-4 h-4 mr-1" /> Submit Quiz
                          </Button>
                        ) : (
                          <Button onClick={() => navigateQuestion(currentQuestion + 1)}>
                            Next <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        )}
                      </div>
                    </CardBody>
                  </Card>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="lg:w-64 flex-shrink-0 space-y-4">
            <QuestionNavigator
              questions={questions}
              answers={answers}
              markedQuestions={markedQuestions}
              currentQuestion={currentQuestion}
              onSelect={navigateQuestion}
            />

            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Answered</span>
                <span className="font-semibold text-green-600 dark:text-green-400">
                  {answeredCount}/{questions.length}
                </span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Marked</span>
                <span className="font-semibold text-amber-600 dark:text-amber-400">{markedCount}</span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Unanswered</span>
                <span className="font-semibold text-gray-900 dark:text-gray-200">
                  {questions.length - answeredCount}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        <ConfirmDialog
          open={showConfirm}
          onConfirm={handleSubmit}
          onCancel={() => setShowConfirm(false)}
          unansweredCount={questions.length - answeredCount}
          markedCount={markedCount}
        />
      </AnimatePresence>
    </div>
  )
}