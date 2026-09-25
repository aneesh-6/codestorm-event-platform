import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { 
  Cpu, 
  Clock, 
  CheckCircle2, 
  Send, 
  ArrowRight, 
  ArrowLeft, 
  Bookmark,
  Check
} from 'lucide-react';

export default function TraceRaceRound({ onBackToDashboard }) {
  const { authFetch } = useAuth();
  const { timerState } = useSocket();

  const [questions, setQuestions] = useState([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [submittedAnswers, setSubmittedAnswers] = useState({});
  const [flagged, setFlagged] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    authFetch('/api/questions/round/2')
      .then(r => {
        if (!r.ok) throw new Error('Round 2 not accessible');
        return r.json();
      })
      .then(data => {
        setQuestions(data);
        data.forEach(q => {
          authFetch(`/api/progress/2/${q.id}`)
            .then(res => res.json())
            .then(saved => {
              if (saved && saved.codeOrAnswer) {
                setSelectedAnswers(prev => ({ ...prev, [q.id]: saved.codeOrAnswer }));
              }
            })
            .catch(() => {});
        });
      })
      .catch(err => console.error(err));

    authFetch('/api/submissions/my?roundId=2')
      .then(r => r.json())
      .then(subs => {
        const subMap = {};
        const ansMap = {};
        subs.forEach(s => {
          subMap[s.questionId] = true;
          ansMap[s.questionId] = s.codeOrAnswer;
        });
        setSubmittedAnswers(subMap);
        setSelectedAnswers(prev => ({ ...prev, ...ansMap }));
      })
      .catch(() => {});
  }, []);

  const currentQ = questions[activeIdx];

  const handleSelectOption = (optId) => {
    if (!currentQ || submittedAnswers[currentQ.id]) return;

    setSelectedAnswers(prev => ({ ...prev, [currentQ.id]: optId }));

    authFetch('/api/progress/save', {
      method: 'POST',
      body: JSON.stringify({
        roundId: 2,
        questionId: currentQ.id,
        codeOrAnswer: optId
      })
    }).catch(() => {});
  };

  const handleToggleFlag = () => {
    if (!currentQ) return;
    setFlagged(prev => ({ ...prev, [currentQ.id]: !prev[currentQ.id] }));
  };

  const handleSubmitAnswer = async () => {
    if (!currentQ) return;
    const answer = selectedAnswers[currentQ.id];
    if (!answer) {
      alert('Please select an option before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await authFetch('/api/submit', {
        method: 'POST',
        body: JSON.stringify({
          questionId: currentQ.id,
          roundId: 2,
          codeOrAnswer: answer,
          language: 'text'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Submission failed');
        return;
      }

      setSubmittedAnswers(prev => ({ ...prev, [currentQ.id]: true }));
      setToastMessage(`Answer for Question ${activeIdx + 1} submitted!`);
      setTimeout(() => setToastMessage(null), 3500);

      if (activeIdx < questions.length - 1) {
        setActiveIdx(activeIdx + 1);
      }
    } catch (err) {
      alert('Error submitting answer: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const answeredCount = Object.keys(submittedAnswers).length;
  const unansweredCount = questions.length - answeredCount;
  const progressPercent = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;

  return (
    <div className="container" style={{ padding: '24px 20px', minHeight: 'calc(100vh - var(--navbar-h))' }}>
      {/* Header bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '24px',
        paddingBottom: '16px',
        borderBottom: '1px solid var(--border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button onClick={onBackToDashboard} className="btn btn-sm btn-outline">
            ← Dashboard
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>ROUND 2 — TRACE & RACE</h1>
              <span className="badge badge-live">SPEED LOGIC SPRINT</span>
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Mental code tracing & output prediction • Scoring: +10 / -2
            </div>
          </div>
        </div>

        {/* Progress Tracker */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>PROGRESS</div>
            <div style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--primary)' }}>
              {answeredCount} / {questions.length} Answered ({progressPercent}%)
            </div>
          </div>

          <div style={{
            width: '120px',
            height: '8px',
            background: 'var(--border)',
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${progressPercent}%`,
              height: '100%',
              background: 'linear-gradient(90deg, var(--teal), var(--primary))',
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>
      </div>

      {toastMessage && (
        <div style={{
          background: '#ecfdf5',
          border: '1px solid #a7f3d0',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          color: '#059669',
          fontSize: '0.875rem',
          fontWeight: 600,
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Check size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Grid: Question Content & Question Navigator */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 280px', gap: '24px' }}>
        {/* Left: Active Question */}
        <div className="card" style={{ padding: '28px' }}>
          {currentQ ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--secondary)', fontWeight: 800, textTransform: 'uppercase' }}>
                  QUESTION 0{activeIdx + 1} OF {questions.length}
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="badge badge-primary">
                    +{currentQ.points || 10} PTS / -{currentQ.negativePoints || 2} NEG
                  </span>

                  <button
                    onClick={handleToggleFlag}
                    className="btn btn-sm btn-outline"
                    style={{
                      color: flagged[currentQ.id] ? 'var(--secondary)' : 'var(--text-muted)',
                      borderColor: flagged[currentQ.id] ? 'var(--secondary)' : 'var(--border)'
                    }}
                  >
                    <Bookmark size={14} style={{ fill: flagged[currentQ.id] ? 'var(--secondary)' : 'none' }} />
                    <span>{flagged[currentQ.id] ? 'Flagged' : 'Flag'}</span>
                  </button>
                </div>
              </div>

              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '12px' }}>
                {currentQ.title}
              </h2>

              <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', marginBottom: '20px', lineHeight: 1.6 }}>
                {currentQ.description}
              </p>

              {/* Code Snippet */}
              {currentQ.codeSnippet && (
                <div style={{ marginBottom: '24px' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 14px',
                    background: '#1a2d5a',
                    borderTopLeftRadius: 'var(--radius-md)',
                    borderTopRightRadius: 'var(--radius-md)',
                    fontSize: '0.75rem',
                    color: '#ffffff',
                    fontWeight: 600,
                    letterSpacing: '0.05em'
                  }}>
                    <span>CODE SNIPPET</span>
                    <span>TRACE CAREFULLY</span>
                  </div>
                  <pre style={{
                    background: '#0d162a',
                    borderBottomLeftRadius: 'var(--radius-md)',
                    borderBottomRightRadius: 'var(--radius-md)',
                    padding: '18px',
                    fontSize: '0.875rem',
                    lineHeight: 1.6,
                    color: '#e2e8f0',
                    overflowX: 'auto',
                    fontFamily: 'var(--font-mono)'
                  }}>
                    <code>{currentQ.codeSnippet}</code>
                  </pre>
                </div>
              )}

              {/* Options */}
              <div style={{ marginBottom: '28px' }}>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '12px' }}>
                  SELECT ANSWER:
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {currentQ.options?.map((opt) => {
                    const isSelected = selectedAnswers[currentQ.id] === opt.id;
                    const isLocked = submittedAnswers[currentQ.id];

                    return (
                      <div
                        key={opt.id}
                        onClick={() => handleSelectOption(opt.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '14px',
                          padding: '14px 18px',
                          borderRadius: 'var(--radius-md)',
                          border: `1.5px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                          background: isSelected ? 'rgba(26, 45, 90, 0.05)' : '#ffffff',
                          cursor: isLocked ? 'not-allowed' : 'pointer',
                          transition: 'var(--transition)'
                        }}
                      >
                        <div style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          background: isSelected ? 'var(--primary)' : 'var(--bg-soft)',
                          color: isSelected ? '#ffffff' : 'var(--text-muted)',
                          border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`
                        }}>
                          {opt.id}
                        </div>
                        <div style={{
                          fontSize: '0.9375rem',
                          fontWeight: isSelected ? 600 : 400,
                          color: isSelected ? 'var(--primary)' : 'var(--text)',
                          fontFamily: 'var(--font-mono)'
                        }}>
                          {opt.text}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Navigation */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
                <button
                  onClick={() => setActiveIdx(Math.max(0, activeIdx - 1))}
                  disabled={activeIdx === 0}
                  className="btn btn-outline"
                >
                  <ArrowLeft size={16} /> Previous
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {submittedAnswers[currentQ.id] ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#059669', fontWeight: 700, fontSize: '0.875rem' }}>
                      <CheckCircle2 size={18} /> Answer Submitted
                    </span>
                  ) : (
                    <button
                      onClick={handleSubmitAnswer}
                      disabled={isSubmitting || !selectedAnswers[currentQ.id]}
                      className="btn btn-secondary"
                    >
                      <Send size={16} />
                      <span>{isSubmitting ? 'Recording...' : 'Submit Answer'}</span>
                    </button>
                  )}

                  <button
                    onClick={() => setActiveIdx(Math.min(questions.length - 1, activeIdx + 1))}
                    disabled={activeIdx === questions.length - 1}
                    className="btn btn-outline"
                  >
                    Next <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
              Loading question...
            </div>
          )}
        </div>

        {/* Right: Question Palette Navigator */}
        <div>
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '14px', textTransform: 'uppercase' }}>
              Question Palette
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '20px' }}>
              {questions.map((q, idx) => {
                const isCurrent = activeIdx === idx;
                const isSubmitted = submittedAnswers[q.id];
                const isFlagged = flagged[q.id];
                const hasAnswer = selectedAnswers[q.id];

                let bg = 'var(--bg-soft)';
                let border = 'var(--border)';
                let color = 'var(--text-muted)';

                if (isSubmitted) {
                  bg = '#ecfdf5';
                  border = '#a7f3d0';
                  color = '#059669';
                } else if (hasAnswer) {
                  bg = 'rgba(26, 45, 90, 0.08)';
                  border = 'var(--primary-light)';
                  color = 'var(--primary)';
                }

                if (isCurrent) {
                  border = '2px solid var(--secondary)';
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => setActiveIdx(idx)}
                    style={{
                      height: '40px',
                      borderRadius: 'var(--radius-md)',
                      background: bg,
                      border: border,
                      color: color,
                      fontWeight: 700,
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'var(--transition)'
                    }}
                  >
                    {idx + 1}
                    {isFlagged && (
                      <span style={{
                        position: 'absolute',
                        top: '3px',
                        right: '3px',
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: 'var(--secondary)'
                      }} />
                    )}
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#ecfdf5', border: '1px solid #a7f3d0' }} />
                <span>Submitted ({answeredCount})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(26, 45, 90, 0.08)', border: '1px solid var(--primary-light)' }} />
                <span>Selected Draft</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--bg-soft)', border: '1px solid var(--border)' }} />
                <span>Unanswered ({unansweredCount})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--secondary)' }} />
                <span>Flagged for Review</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
