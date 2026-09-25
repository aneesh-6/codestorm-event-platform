import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { 
  Bug, 
  Play, 
  Send, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Save, 
  Terminal,
  CheckCircle2
} from 'lucide-react';

const LANGUAGES = [
  { id: 'python', label: 'Python 3', monaco: 'python' },
  { id: 'cpp', label: 'C++ (G++)', monaco: 'cpp' },
  { id: 'c', label: 'C (GCC)', monaco: 'c' },
  { id: 'java', label: 'Java 15', monaco: 'java' }
];

export default function BugBusterRound({ onBackToDashboard }) {
  const { authFetch } = useAuth();
  const { timerState } = useSocket();

  const [questions, setQuestions] = useState([]);
  const [activeQIndex, setActiveQIndex] = useState(0);
  const [selectedLang, setSelectedLang] = useState('python');
  const [editorCode, setEditorCode] = useState('');
  const [customInput, setCustomInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [activeBottomTab, setActiveBottomTab] = useState('tests'); // 'tests' | 'console' | 'history'
  const [mySubmissions, setMySubmissions] = useState([]);
  const [saveStatus, setSaveStatus] = useState('Saved');

  useEffect(() => {
    authFetch('/api/questions/round/1')
      .then(r => {
        if (!r.ok) throw new Error('Round 1 not accessible');
        return r.json();
      })
      .then(data => {
        setQuestions(data);
        if (data.length > 0) {
          loadQuestionCode(data[0], selectedLang);
        }
      })
      .catch(err => console.error(err));
  }, []);

  const loadQuestionCode = (q, lang) => {
    authFetch(`/api/progress/1/${q.id}`)
      .then(r => r.json())
      .then(saved => {
        if (saved && saved.codeOrAnswer) {
          setEditorCode(saved.codeOrAnswer);
          if (saved.selectedLanguage) setSelectedLang(saved.selectedLanguage);
          setSaveStatus('Draft restored');
        } else {
          const code = q.buggyCode?.[lang] || q.buggyCode?.python || '// No template';
          setEditorCode(code);
          setSaveStatus('Template loaded');
        }
      })
      .catch(() => {
        const code = q.buggyCode?.[lang] || q.buggyCode?.python || '// No template';
        setEditorCode(code);
      });

    loadSubmissionsForQ(q.id);
  };

  const loadSubmissionsForQ = (qId) => {
    authFetch(`/api/submissions/my?roundId=1&questionId=${qId}`)
      .then(r => r.json())
      .then(subs => setMySubmissions(subs))
      .catch(() => {});
  };

  const handleSelectQuestion = (idx) => {
    setActiveQIndex(idx);
    const q = questions[idx];
    loadQuestionCode(q, selectedLang);
    setRunResult(null);
    setSubmissionResult(null);
  };

  const handleLanguageChange = (newLang) => {
    setSelectedLang(newLang);
    const q = questions[activeQIndex];
    if (q) {
      const code = q.buggyCode?.[newLang] || q.buggyCode?.python || '';
      setEditorCode(code);
    }
  };

  const handleCodeChange = (newVal) => {
    setEditorCode(newVal);
    setSaveStatus('Saving...');
    const q = questions[activeQIndex];
    if (q) {
      clearTimeout(window._autoSaveTimer);
      window._autoSaveTimer = setTimeout(() => {
        authFetch('/api/progress/save', {
          method: 'POST',
          body: JSON.stringify({
            roundId: 1,
            questionId: q.id,
            codeOrAnswer: newVal,
            selectedLanguage: selectedLang
          })
        })
          .then(() => setSaveStatus('Auto-saved'))
          .catch(() => setSaveStatus('Save error'));
      }, 1200);
    }
  };

  const handleRunCode = async () => {
    setIsRunning(true);
    setActiveBottomTab('console');
    setRunResult(null);

    const q = questions[activeQIndex];
    const sampleInput = customInput || q?.testCases?.[0]?.input || '';

    try {
      const res = await authFetch('/api/run', {
        method: 'POST',
        body: JSON.stringify({
          language: selectedLang,
          code: editorCode,
          input: sampleInput
        })
      });
      const data = await res.json();
      setRunResult(data);
    } catch (err) {
      setRunResult({ status: 'Error', stderr: err.message });
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmitCode = async () => {
    const q = questions[activeQIndex];
    if (!q) return;

    setIsSubmitting(true);
    setActiveBottomTab('tests');
    setSubmissionResult(null);

    try {
      const res = await authFetch('/api/submit', {
        method: 'POST',
        body: JSON.stringify({
          questionId: q.id,
          roundId: 1,
          codeOrAnswer: editorCode,
          language: selectedLang
        })
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Submission failed');
        return;
      }

      setSubmissionResult(data.submission);
      loadSubmissionsForQ(q.id);
    } catch (err) {
      alert('Error submitting code: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentQ = questions[activeQIndex];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - var(--navbar-h))', overflow: 'hidden' }}>
      {/* Sub Header */}
      <div style={{
        padding: '10px 24px',
        background: '#ffffff',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button onClick={onBackToDashboard} className="btn btn-sm btn-outline">
            ← Dashboard
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--primary)' }}>ROUND 1 — BUGBUSTER</span>
            <span className="badge badge-live">DEBUGGING ARENA</span>
          </div>
        </div>

        {/* Question Selector Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {questions.map((q, idx) => (
            <button
              key={q.id}
              onClick={() => handleSelectQuestion(idx)}
              className={`btn btn-sm ${activeQIndex === idx ? 'btn-primary' : 'btn-outline'}`}
              style={{ minHeight: '34px', padding: '6px 14px' }}
            >
              Question {idx + 1}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          <Save size={14} color="var(--teal)" />
          <span>{saveStatus}</span>
        </div>
      </div>

      {/* Main Split Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '42% 58%', flex: 1, overflow: 'hidden' }}>
        {/* Left Column: Problem Guidance */}
        <div style={{
          borderRight: '1px solid var(--border)',
          padding: '24px',
          overflowY: 'auto',
          background: '#ffffff'
        }}>
          {currentQ ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--secondary)', fontWeight: 800, textTransform: 'uppercase' }}>
                  QUESTION {activeQIndex + 1} OF {questions.length}
                </span>
                <span className="badge badge-primary">
                  {currentQ.points} POINTS
                </span>
              </div>

              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '14px' }}>
                {currentQ.title}
              </h2>

              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '0.8125rem', color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 700 }}>
                  Problem Description & Buggy Behavior
                </h4>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  {currentQ.description}
                </p>
              </div>

              <div style={{ marginBottom: '20px', background: 'var(--bg-soft)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <h4 style={{ fontSize: '0.8125rem', color: 'var(--teal)', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 700 }}>
                  Expected Target Behavior
                </h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--text)', lineHeight: 1.5 }}>
                  {currentQ.expectedBehavior}
                </p>
              </div>

              {/* Sample Test Cases */}
              <div>
                <h4 style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '10px', fontWeight: 700 }}>
                  Sample Test Cases
                </h4>
                {currentQ.testCases?.filter(tc => !tc.isHidden).map((tc, i) => (
                  <div key={tc.id || i} style={{
                    marginBottom: '10px',
                    background: 'var(--bg-soft)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    padding: '12px'
                  }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700, marginBottom: '6px' }}>
                      Sample Case {i + 1}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.8125rem' }}>
                      <div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>INPUT:</span>
                        <pre style={{ background: '#ffffff', border: '1px solid var(--border)', padding: '6px 8px', borderRadius: '4px', marginTop: '2px', color: 'var(--primary)' }}>{tc.input}</pre>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>EXPECTED:</span>
                        <pre style={{ background: '#ffffff', border: '1px solid var(--border)', padding: '6px 8px', borderRadius: '4px', marginTop: '2px', color: 'var(--teal)' }}>{tc.expectedOutput}</pre>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
              Loading question...
            </div>
          )}
        </div>

        {/* Right Column: Editor & Test Runner */}
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#f8fafc' }}>
          {/* Controls Bar */}
          <div style={{
            padding: '8px 16px',
            background: '#ffffff',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>LANGUAGE:</span>
              <select
                value={selectedLang}
                onChange={(e) => handleLanguageChange(e.target.value)}
                style={{
                  background: 'var(--bg-soft)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8125rem',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {LANGUAGES.map(l => (
                  <option key={l.id} value={l.id}>{l.label}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={handleRunCode}
                disabled={isRunning || isSubmitting}
                className="btn btn-sm btn-outline"
              >
                <Play size={14} />
                <span>{isRunning ? 'Running...' : 'Run Code'}</span>
              </button>

              <button
                onClick={handleSubmitCode}
                disabled={isRunning || isSubmitting}
                className="btn btn-sm btn-secondary"
              >
                <Send size={14} />
                <span>{isSubmitting ? 'Evaluating...' : 'Submit'}</span>
              </button>
            </div>
          </div>

          {/* Monaco Editor */}
          <div style={{ flex: 1, minHeight: '300px' }}>
            <Editor
              height="100%"
              theme="vs"
              language={LANGUAGES.find(l => l.id === selectedLang)?.monaco || 'python'}
              value={editorCode}
              onChange={handleCodeChange}
              options={{
                fontSize: 14,
                fontFamily: 'Fira Code, monospace',
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                lineNumbers: 'on',
                automaticLayout: true,
                tabSize: 4
              }}
            />
          </div>

          {/* Bottom Drawer */}
          <div style={{
            height: '240px',
            borderTop: '1px solid var(--border)',
            background: '#ffffff',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              borderBottom: '1px solid var(--border)',
              padding: '0 16px',
              background: 'var(--bg-soft)'
            }}>
              <button
                onClick={() => setActiveBottomTab('tests')}
                style={{
                  padding: '8px 16px',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeBottomTab === 'tests' ? '2px solid var(--primary)' : '2px solid transparent',
                  color: activeBottomTab === 'tests' ? 'var(--primary)' : 'var(--text-muted)',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                  cursor: 'pointer'
                }}
              >
                Evaluation Results {submissionResult && `(${submissionResult.status})`}
              </button>

              <button
                onClick={() => setActiveBottomTab('console')}
                style={{
                  padding: '8px 16px',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeBottomTab === 'console' ? '2px solid var(--primary)' : '2px solid transparent',
                  color: activeBottomTab === 'console' ? 'var(--primary)' : 'var(--text-muted)',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                  cursor: 'pointer'
                }}
              >
                Custom STDIN Console
              </button>

              <button
                onClick={() => setActiveBottomTab('history')}
                style={{
                  padding: '8px 16px',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeBottomTab === 'history' ? '2px solid var(--primary)' : '2px solid transparent',
                  color: activeBottomTab === 'history' ? 'var(--primary)' : 'var(--text-muted)',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                  cursor: 'pointer'
                }}
              >
                My Submissions ({mySubmissions.length})
              </button>
            </div>

            {/* Verdict */}
            {activeBottomTab === 'tests' && (
              <div style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
                {submissionResult ? (
                  <div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-md)',
                      marginBottom: '12px',
                      background: submissionResult.status === 'Accepted' ? '#ecfdf5' : '#fef2f2',
                      border: `1px solid ${submissionResult.status === 'Accepted' ? '#a7f3d0' : '#fecaca'}`
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {submissionResult.status === 'Accepted' ? (
                          <CheckCircle size={20} color="#059669" />
                        ) : (
                          <XCircle size={20} color="#dc2626" />
                        )}
                        <div>
                          <span style={{
                            fontWeight: 800,
                            fontSize: '0.95rem',
                            color: submissionResult.status === 'Accepted' ? '#059669' : '#dc2626'
                          }}>
                            {submissionResult.status}
                          </span>
                          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginLeft: '12px' }}>
                            Passed {submissionResult.passedTests}/{submissionResult.totalTests} Test Cases
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '16px', fontSize: '0.85rem' }}>
                        <span>Score: <strong style={{ color: 'var(--primary)' }}>+{submissionResult.score}</strong></span>
                        <span>Execution: <strong>{submissionResult.executionTimeMs}ms</strong></span>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px' }}>
                      {submissionResult.testCaseResults?.map((tc, i) => (
                        <div key={tc.id || i} style={{
                          padding: '10px 12px',
                          background: 'var(--bg-soft)',
                          borderRadius: 'var(--radius-md)',
                          border: `1px solid ${tc.passed ? '#a7f3d0' : '#fecaca'}`,
                          fontSize: '0.75rem'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontWeight: 600 }}>Case {i + 1} {tc.isHidden && '(Hidden)'}</span>
                            <span style={{ color: tc.passed ? '#059669' : '#dc2626', fontWeight: 700 }}>
                              {tc.passed ? 'PASSED' : 'FAILED'}
                            </span>
                          </div>
                          {!tc.passed && tc.stderr && (
                            <div style={{ color: '#dc2626', fontSize: '0.7rem' }}>{tc.stderr}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    Click <strong>Submit</strong> to evaluate your code against the test runner.
                  </div>
                )}
              </div>
            )}

            {/* Custom Console */}
            {activeBottomTab === 'console' && (
              <div style={{ flex: 1, padding: '12px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', overflowY: 'auto' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>
                    CUSTOM STDIN:
                  </div>
                  <textarea
                    rows={4}
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    placeholder="Enter input here..."
                    className="form-control"
                    style={{ height: '110px', fontSize: '0.8125rem', fontFamily: 'var(--font-mono)' }}
                  />
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>
                    OUTPUT:
                  </div>
                  <pre style={{
                    height: '110px',
                    background: 'var(--bg-soft)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '8px 12px',
                    fontSize: '0.8125rem',
                    overflowY: 'auto',
                    color: runResult?.stderr ? '#dc2626' : 'var(--primary)'
                  }}>
                    {runResult ? (runResult.stdout || runResult.stderr || '[Empty output]') : 'Run code to view output...'}
                  </pre>
                </div>
              </div>
            )}

            {/* Submissions History */}
            {activeBottomTab === 'history' && (
              <div style={{ flex: 1, padding: '12px 16px', overflowY: 'auto' }}>
                {mySubmissions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                    No prior submissions for this problem.
                  </div>
                ) : (
                  <table className="codestorm-table">
                    <thead>
                      <tr>
                        <th>Status</th>
                        <th>Score</th>
                        <th>Lang</th>
                        <th>Passed</th>
                        <th>Time</th>
                        <th>Submitted At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mySubmissions.map(s => (
                        <tr key={s.id}>
                          <td style={{ color: s.status === 'Accepted' ? '#059669' : '#dc2626', fontWeight: 700 }}>
                            {s.status}
                          </td>
                          <td style={{ color: 'var(--primary)', fontWeight: 700 }}>+{s.score}</td>
                          <td><code>{s.language}</code></td>
                          <td>{s.passedTests}/{s.totalTests}</td>
                          <td>{s.executionTimeMs}ms</td>
                          <td>{new Date(s.submittedAt).toLocaleTimeString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
