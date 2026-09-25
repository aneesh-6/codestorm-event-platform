import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { 
  Code2, 
  Play, 
  Send, 
  Copy, 
  Check, 
  Save, 
  CheckCircle, 
  XCircle
} from 'lucide-react';

const LANGUAGES = [
  { id: 'python', label: 'Python 3', monaco: 'python' },
  { id: 'cpp', label: 'C++ (G++)', monaco: 'cpp' },
  { id: 'c', label: 'C (GCC)', monaco: 'c' },
  { id: 'java', label: 'Java 15', monaco: 'java' }
];

export default function CodeChallengeRound({ onBackToDashboard }) {
  const { authFetch } = useAuth();
  const { timerState } = useSocket();

  const [questions, setQuestions] = useState([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [selectedLang, setSelectedLang] = useState('python');
  const [editorCode, setEditorCode] = useState('');
  const [customInput, setCustomInput] = useState('');
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [mySubmissions, setMySubmissions] = useState([]);
  const [activeBottomTab, setActiveBottomTab] = useState('tests');
  const [saveStatus, setSaveStatus] = useState('Saved');

  useEffect(() => {
    authFetch('/api/questions/round/3')
      .then(r => {
        if (!r.ok) throw new Error('Round 3 not accessible');
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
    authFetch(`/api/progress/3/${q.id}`)
      .then(r => r.json())
      .then(saved => {
        if (saved && saved.codeOrAnswer) {
          setEditorCode(saved.codeOrAnswer);
          if (saved.selectedLanguage) setSelectedLang(saved.selectedLanguage);
          setSaveStatus('Draft restored');
        } else {
          const code = q.starterCode?.[lang] || q.starterCode?.python || '// Write solution here';
          setEditorCode(code);
          setSaveStatus('Template loaded');
        }
      })
      .catch(() => {
        const code = q.starterCode?.[lang] || q.starterCode?.python || '// Write solution here';
        setEditorCode(code);
      });

    loadSubmissionsForQ(q.id);
  };

  const loadSubmissionsForQ = (qId) => {
    authFetch(`/api/submissions/my?roundId=3&questionId=${qId}`)
      .then(r => r.json())
      .then(subs => setMySubmissions(subs))
      .catch(() => {});
  };

  const handleSelectQuestion = (idx) => {
    setActiveIdx(idx);
    const q = questions[idx];
    loadQuestionCode(q, selectedLang);
    setRunResult(null);
    setSubmissionResult(null);
  };

  const handleLanguageChange = (newLang) => {
    setSelectedLang(newLang);
    const q = questions[activeIdx];
    if (q) {
      const code = q.starterCode?.[newLang] || q.starterCode?.python || '';
      setEditorCode(code);
    }
  };

  const handleCodeChange = (newVal) => {
    setEditorCode(newVal);
    setSaveStatus('Saving...');
    const q = questions[activeIdx];
    if (q) {
      clearTimeout(window._autoSaveTimer3);
      window._autoSaveTimer3 = setTimeout(() => {
        authFetch('/api/progress/save', {
          method: 'POST',
          body: JSON.stringify({
            roundId: 3,
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

  const handleCopySample = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleRunCode = async () => {
    setIsRunning(true);
    setActiveBottomTab('console');
    setRunResult(null);

    const q = questions[activeIdx];
    const sampleInput = customInput || q?.examples?.[0]?.input || '';

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
    const q = questions[activeIdx];
    if (!q) return;

    setIsSubmitting(true);
    setActiveBottomTab('tests');
    setSubmissionResult(null);

    try {
      const res = await authFetch('/api/submit', {
        method: 'POST',
        body: JSON.stringify({
          questionId: q.id,
          roundId: 3,
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

  const currentQ = questions[activeIdx];

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
            <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--primary)' }}>ROUND 3 — CODE CHALLENGE</span>
            <span className="badge badge-live">COMPETITIVE ARENA</span>
          </div>
        </div>

        {/* Problem Navigator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {questions.map((q, idx) => (
            <button
              key={q.id}
              onClick={() => handleSelectQuestion(idx)}
              className={`btn btn-sm ${activeIdx === idx ? 'btn-primary' : 'btn-outline'}`}
              style={{ minHeight: '34px', padding: '6px 14px' }}
            >
              Problem {idx + 1}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          <Save size={14} color="var(--teal)" />
          <span>{saveStatus}</span>
        </div>
      </div>

      {/* Main Split Layout: Left Problem Statement & Right Editor */}
      <div style={{ display: 'grid', gridTemplateColumns: '44% 56%', flex: 1, overflow: 'hidden' }}>
        {/* Left Column: Problem */}
        <div style={{
          borderRight: '1px solid var(--border)',
          padding: '24px',
          overflowY: 'auto',
          background: '#ffffff'
        }}>
          {currentQ ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--secondary)', fontWeight: 800 }}>
                  PROBLEM 0{activeIdx + 1} OF {questions.length}
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <span className="badge badge-upcoming">
                    {currentQ.difficulty || 'Medium'}
                  </span>
                  <span className="badge badge-primary">
                    {currentQ.points} PTS
                  </span>
                </div>
              </div>

              <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '16px' }}>
                {currentQ.title}
              </h1>

              <div style={{ marginBottom: '20px', fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                {currentQ.description}
              </div>

              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ fontSize: '0.8125rem', color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 700 }}>
                  Input Format
                </h4>
                <div style={{ fontSize: '0.85rem', color: 'var(--text)', background: 'var(--bg-soft)', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', whiteSpace: 'pre-line' }}>
                  {currentQ.inputFormat}
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ fontSize: '0.8125rem', color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 700 }}>
                  Output Format
                </h4>
                <div style={{ fontSize: '0.85rem', color: 'var(--text)', background: 'var(--bg-soft)', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', whiteSpace: 'pre-line' }}>
                  {currentQ.outputFormat}
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '0.8125rem', color: 'var(--secondary)', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 700 }}>
                  Constraints
                </h4>
                <pre style={{ fontSize: '0.85rem', color: 'var(--text)', background: 'var(--bg-soft)', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontFamily: 'var(--font-mono)' }}>
                  {currentQ.constraints}
                </pre>
              </div>

              {/* Examples */}
              <div>
                <h4 style={{ fontSize: '0.8125rem', color: 'var(--teal)', textTransform: 'uppercase', marginBottom: '10px', fontWeight: 700 }}>
                  Examples
                </h4>
                {currentQ.examples?.map((ex, i) => (
                  <div key={i} style={{
                    marginBottom: '12px',
                    background: 'var(--bg-soft)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    padding: '14px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)' }}>
                        Example {i + 1}
                      </span>
                      <button
                        onClick={() => handleCopySample(ex.input, i)}
                        className="btn btn-sm btn-outline"
                        style={{ padding: '4px 10px', fontSize: '0.75rem', minHeight: '28px' }}
                      >
                        {copiedIdx === i ? <Check size={12} color="var(--teal)" /> : <Copy size={12} />}
                        <span>{copiedIdx === i ? 'Copied' : 'Copy Input'}</span>
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.8125rem' }}>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '2px' }}>INPUT:</div>
                        <pre style={{ background: '#ffffff', border: '1px solid var(--border)', padding: '8px', borderRadius: '4px', color: 'var(--primary)' }}>{ex.input}</pre>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '2px' }}>OUTPUT:</div>
                        <pre style={{ background: '#ffffff', border: '1px solid var(--border)', padding: '8px', borderRadius: '4px', color: 'var(--teal)' }}>{ex.output}</pre>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
              Loading problem statement...
            </div>
          )}
        </div>

        {/* Right Column: Code Editor & Execution Runner */}
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#f8fafc' }}>
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
                <span>{isRunning ? 'Running...' : 'Run'}</span>
              </button>

              <button
                onClick={handleSubmitCode}
                disabled={isRunning || isSubmitting}
                className="btn btn-sm btn-secondary"
              >
                <Send size={14} />
                <span>{isSubmitting ? 'Evaluating...' : 'Submit Code'}</span>
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
                Custom Test Console
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
                Submission History ({mySubmissions.length})
              </button>
            </div>

            {/* Verdict Display */}
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
                    Click <strong>Submit Code</strong> to evaluate your solution against the test suite.
                  </div>
                )}
              </div>
            )}

            {/* Custom STDIN Console */}
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
                    placeholder="Enter custom input..."
                    className="form-control"
                    style={{ height: '110px', fontSize: '0.8125rem', fontFamily: 'var(--font-mono)' }}
                  />
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>
                    EXECUTION OUTPUT:
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
                    {runResult ? (runResult.stdout || runResult.stderr || '[Empty output]') : 'Run code to see output...'}
                  </pre>
                </div>
              </div>
            )}

            {/* Submissions History Table */}
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
                        <th>Language</th>
                        <th>Tests Passed</th>
                        <th>Execution Time</th>
                        <th>Timestamp</th>
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
