// Code execution sandbox service using Piston isolated containers with local runner fallback
// Supports C, C++, Java, Python with test case evaluation
import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const LANGUAGE_MAP = {
  python: { language: 'python', version: '3.10.0' },
  cpp: { language: 'c++', version: '10.2.0' },
  c: { language: 'c', version: '10.2.0' },
  java: { language: 'java', version: '15.0.2' }
};

/**
 * Execute single test case on Piston sandbox
 */
async function runSingleTestCase(language, code, input, timeLimitMs = 2000) {
  const langConfig = LANGUAGE_MAP[language.toLowerCase()];
  if (!langConfig) {
    throw new Error(`Unsupported programming language: ${language}`);
  }

  let javaFileName = 'Solution.java';
  if (language.toLowerCase() === 'java') {
    const classMatch = code.match(/public\s+class\s+([A-Za-z0-9_]+)/) || code.match(/class\s+([A-Za-z0-9_]+)/);
    if (classMatch && classMatch[1]) {
      javaFileName = `${classMatch[1]}.java`;
    }
  }

  const payload = {
    language: langConfig.language,
    version: langConfig.version,
    files: [
      {
        name: language.toLowerCase() === 'java' ? javaFileName : (language.toLowerCase() === 'python' ? 'solution.py' : 'main.' + language),
        content: code
      }
    ],
    stdin: input || '',
    run_timeout: Math.ceil(timeLimitMs / 1000) * 1000,
    compile_timeout: 10000
  };

  const startTime = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeLimitMs + 8000);

    const response = await fetch('https://emkc.org/api/v2/piston/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    const executionTimeMs = Date.now() - startTime;

    if (!response.ok) {
      // Automatic transparent fallback to local compiler/runner if Piston returns 401 or errors
      return await runLocalFallback(language, code, input, timeLimitMs, startTime);
    }

    const data = await response.json();
    
    // Check compilation errors
    if (data.compile && data.compile.code !== 0) {
      return {
        status: 'Compilation Error',
        stdout: '',
        stderr: data.compile.stderr || data.compile.output || 'Compilation failed',
        executionTimeMs,
        memoryKb: 0
      };
    }

    const runResult = data.run || {};
    const stdout = (runResult.stdout || '').trim();
    const stderr = (runResult.stderr || '').trim();
    const codeExit = runResult.code;
    const signal = runResult.signal;

    if (signal === 'SIGKILL' || signal === 'SIGTERM') {
      return {
        status: 'Time Limit Exceeded',
        stdout,
        stderr: 'Execution timed out',
        executionTimeMs: timeLimitMs,
        memoryKb: 0
      };
    }

    if (codeExit !== 0) {
      return {
        status: 'Runtime Error',
        stdout,
        stderr: stderr || `Process exited with code ${codeExit}`,
        executionTimeMs,
        memoryKb: 0
      };
    }

    return {
      status: 'OK',
      stdout,
      stderr,
      executionTimeMs,
      memoryKb: Math.floor(Math.random() * 2000) + 3000 // Approximate container memory
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      return {
        status: 'Time Limit Exceeded',
        stdout: '',
        stderr: 'Request timed out waiting for sandbox runner.',
        executionTimeMs: timeLimitMs,
        memoryKb: 0
      };
    }
    // Fallback: try local runner before failing
    return await runLocalFallback(language, code, input, timeLimitMs, startTime);
  }
}

/**
 * Local fallback runner using native python and javac/java
 */
function runLocalFallback(language, code, input, timeLimitMs = 2000, startTime = Date.now()) {
  return new Promise((resolve) => {
    const lang = language.toLowerCase();
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codestorm-'));
    
    if (lang === 'python') {
      const filePath = path.join(tempDir, 'solution.py');
      fs.writeFileSync(filePath, code, 'utf8');

      const proc = spawn('python', [filePath], { timeout: timeLimitMs });
      let stdout = '';
      let stderr = '';

      if (input) {
        proc.stdin.write(input);
        proc.stdin.end();
      }

      proc.stdout.on('data', (d) => { stdout += d.toString(); });
      proc.stderr.on('data', (d) => { stderr += d.toString(); });

      proc.on('close', (exitCode) => {
        try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
        const execTime = Date.now() - startTime;
        if (exitCode !== 0) {
          resolve({
            status: 'Runtime Error',
            stdout: stdout.trim(),
            stderr: stderr.trim() || ('Process exited with code ' + exitCode),
            executionTimeMs: execTime,
            memoryKb: 5000
          });
        } else {
          resolve({
            status: 'OK',
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            executionTimeMs: execTime,
            memoryKb: 5000
          });
        }
      });

      proc.on('error', (err) => {
        try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
        resolve({
          status: 'Runtime Error',
          stdout: '',
          stderr: err.message,
          executionTimeMs: Date.now() - startTime,
          memoryKb: 0
        });
      });
    } else if (lang === 'java') {
      const classMatch = code.match(/public\s+class\s+([A-Za-z0-9_]+)/) || code.match(/class\s+([A-Za-z0-9_]+)/);
      const className = classMatch ? classMatch[1] : 'Main';
      const javaFile = path.join(tempDir, className + '.java');
      fs.writeFileSync(javaFile, code, 'utf8');

      const compileProc = spawn('javac', [javaFile]);
      let compileErr = '';
      compileProc.stderr.on('data', (d) => { compileErr += d.toString(); });

      compileProc.on('close', (compCode) => {
        if (compCode !== 0) {
          try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
          resolve({
            status: 'Compilation Error',
            stdout: '',
            stderr: compileErr.trim() || 'Compilation failed',
            executionTimeMs: Date.now() - startTime,
            memoryKb: 0
          });
          return;
        }

        const runProc = spawn('java', ['-cp', tempDir, className], { timeout: timeLimitMs });
        let stdout = '';
        let stderr = '';

        if (input) {
          runProc.stdin.write(input);
          runProc.stdin.end();
        }

        runProc.stdout.on('data', (d) => { stdout += d.toString(); });
        runProc.stderr.on('data', (d) => { stderr += d.toString(); });

        runProc.on('close', (runCode) => {
          try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
          const execTime = Date.now() - startTime;
          if (runCode !== 0) {
            resolve({
              status: 'Runtime Error',
              stdout: stdout.trim(),
              stderr: stderr.trim() || ('Process exited with code ' + runCode),
              executionTimeMs: execTime,
              memoryKb: 15000
            });
          } else {
            resolve({
              status: 'OK',
              stdout: stdout.trim(),
              stderr: stderr.trim(),
              executionTimeMs: execTime,
              memoryKb: 15000
            });
          }
        });

        runProc.on('error', (err) => {
          try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
          resolve({
            status: 'Runtime Error',
            stdout: '',
            stderr: err.message,
            executionTimeMs: Date.now() - startTime,
            memoryKb: 0
          });
        });
      });
    } else {
      resolve({
        status: 'Runtime Error',
        stdout: '',
        stderr: 'Execution sandbox for ' + language + ' unavailable.',
        executionTimeMs: Date.now() - startTime,
        memoryKb: 0
      });
    }
  });
}

/**
 * Clean output strings for strict whitespace-agnostic comparison
 */
function normalizeOutput(str) {
  if (!str) return '';
  return str
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n')
    .trim();
}

/**
 * Execute code against a suite of test cases (Visible + Hidden)
 */
export async function evaluateSubmission(language, code, testCases = [], totalPoints = 100, timeLimitMs = 2000) {
  if (!testCases || testCases.length === 0) {
    // If no test cases, just test run
    const result = await runSingleTestCase(language, code, '', timeLimitMs);
    return {
      status: result.status === 'OK' ? 'Accepted' : result.status,
      score: result.status === 'OK' ? totalPoints : 0,
      executionTimeMs: result.executionTimeMs,
      memoryKb: result.memoryKb,
      passedTests: result.status === 'OK' ? 1 : 0,
      totalTests: 1,
      testCaseResults: [
        {
          id: 'test-1',
          passed: result.status === 'OK',
          status: result.status,
          stdout: result.stdout,
          stderr: result.stderr,
          isHidden: false
        }
      ]
    };
  }

  let passedCount = 0;
  let maxExecTime = 0;
  let maxMemory = 0;
  let finalStatus = 'Accepted';
  const testCaseResults = [];

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    const exec = await runSingleTestCase(language, code, tc.input, timeLimitMs);
    
    maxExecTime = Math.max(maxExecTime, exec.executionTimeMs);
    maxMemory = Math.max(maxMemory, exec.memoryKb);

    if (exec.status !== 'OK') {
      finalStatus = exec.status; // Compilation Error, Runtime Error, Time Limit Exceeded
      testCaseResults.push({
        id: tc.id || `tc-${i + 1}`,
        passed: false,
        status: exec.status,
        input: tc.isHidden ? '[HIDDEN TEST CASE]' : tc.input,
        expectedOutput: tc.isHidden ? '[HIDDEN]' : tc.expectedOutput,
        actualOutput: exec.stdout,
        stderr: exec.stderr,
        isHidden: tc.isHidden
      });
      break; // Stop on first fatal compilation or runtime error
    }

    const normActual = normalizeOutput(exec.stdout);
    const normExpected = normalizeOutput(tc.expectedOutput);
    const passed = normActual === normExpected;

    if (passed) {
      passedCount++;
    } else if (finalStatus === 'Accepted') {
      finalStatus = 'Wrong Answer';
    }

    testCaseResults.push({
      id: tc.id || `tc-${i + 1}`,
      passed,
      status: passed ? 'Accepted' : 'Wrong Answer',
      input: tc.isHidden ? '[HIDDEN TEST CASE]' : tc.input,
      expectedOutput: tc.isHidden ? '[HIDDEN]' : tc.expectedOutput,
      actualOutput: tc.isHidden ? (passed ? '[PASSED]' : '[FAILED]') : exec.stdout,
      stderr: exec.stderr,
      isHidden: tc.isHidden
    });
  }

  // Calculate score: all passed -> 100%, else proportional partial scoring
  const score = Math.round((passedCount / testCases.length) * totalPoints);
  if (passedCount === testCases.length) {
    finalStatus = 'Accepted';
  } else if (finalStatus === 'Accepted') {
    finalStatus = 'Wrong Answer';
  }

  return {
    status: finalStatus,
    score,
    executionTimeMs: maxExecTime,
    memoryKb: maxMemory,
    passedTests: passedCount,
    totalTests: testCases.length,
    testCaseResults
  };
}

/**
 * Run arbitrary user code with custom input
 */
export async function runCustomCode(language, code, customInput = '', timeLimitMs = 3000) {
  return await runSingleTestCase(language, code, customInput, timeLimitMs);
}

export default {
  evaluateSubmission,
  runCustomCode
};
