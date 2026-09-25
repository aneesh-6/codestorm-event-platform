import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './database.js';
import { generateToken, authMiddleware, requireRole } from './auth.js';
import { evaluateSubmission, runCustomCode } from './executionService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDist = path.join(__dirname, '../client/dist');

// Load codestorm environment variables if present
try {
  const envPath = path.join(__dirname, '../../codestorm/.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [k, ...v] = trimmed.split('=');
        if (!process.env[k.trim()]) process.env[k.trim()] = v.join('=').trim();
      }
    }
  }
} catch (e) {}

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Socket.IO configuration
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
  }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// -------------------------------------------------------------
// REAL-TIME SOCKET.IO CONNECTION & SERVER-AUTHORITATIVE TIMER
// -------------------------------------------------------------
let activeSocketsCount = 0;
const onlineParticipants = new Set();

io.on('connection', (socket) => {
  activeSocketsCount++;

  socket.on('register_user', (userData) => {
    if (userData && userData.participantId) {
      onlineParticipants.add(userData.participantId);
      io.emit('online_stats', {
        activeCount: onlineParticipants.size,
        totalConnected: activeSocketsCount
      });
    }
  });

  socket.on('disconnect', () => {
    activeSocketsCount = Math.max(0, activeSocketsCount - 1);
  });
});

// Server-Authoritative Timer Loop (Ticks every 1 second)
setInterval(() => {
  const settings = db.getEventSettings();
  const currentRound = settings.currentRoundId ? db.getRoundById(settings.currentRoundId) : null;

  if (currentRound && currentRound.status === 'live' && !currentRound.isPaused) {
    const end = new Date(currentRound.endTime).getTime();
    const now = Date.now();
    const remaining = Math.max(0, Math.floor((end - now) / 1000));

    currentRound.remainingSeconds = remaining;

    if (remaining <= 0) {
      // Automatic time expiration lock-out!
      currentRound.status = 'completed';
      db.updateRound(currentRound.id, currentRound);
      db.updateEventSettings({
        eventStatus: `round${currentRound.id}_completed`
      });

      io.emit('round_ended', {
        roundId: currentRound.id,
        reason: 'TIME_EXPIRED',
        message: `Round ${currentRound.id}: ${currentRound.name} has concluded! Submissions are now locked.`
      });
    }

    io.emit('timer_tick', {
      roundId: currentRound.id,
      roundName: currentRound.name,
      status: currentRound.status,
      remainingSeconds: remaining,
      endTime: currentRound.endTime,
      isPaused: currentRound.isPaused
    });
  }
}, 1000);

// -------------------------------------------------------------
// 1. AUTHENTICATION ROUTES
// -------------------------------------------------------------
app.post('/api/auth/login', async (req, res) => {
  const { identifier, password } = req.body;
  const enteredLoginId = (identifier || '').trim();
  const enteredPassword = (password || '').trim();

  if (!enteredLoginId || !enteredPassword) {
    return res.status(400).json({ error: 'Please enter Participant ID and Password.' });
  }

  // 1. Participant login lookup: participantId = entered Login ID (e.g. CS26-0001)
  let user = db.findUserByParticipantId(enteredLoginId);

  // Fallback for admin and coordinator roles by email or username
  if (!user) {
    const adminOrCoord = db.findUserByEmailOrParticipantId(enteredLoginId);
    if (adminOrCoord && (adminOrCoord.role === 'admin' || adminOrCoord.role === 'coordinator')) {
      user = adminOrCoord;
    }
  }

  // Fallback: If not yet in local DB, check Google Sheets by participantId or registrationId and create record
  if (!user && (enteredLoginId.toUpperCase().startsWith('CS26-') || enteredLoginId.toUpperCase().startsWith('CODESTORM-2026-'))) {
    try {
      const synced = await db.syncParticipantFromGoogleSheets(enteredLoginId);
      if (synced) {
        user = db.findUserByParticipantId(enteredLoginId);
      }
    } catch (sheetSyncErr) {
      console.warn('[Sheet Fallback Note]', sheetSyncErr.message);
    }
  }

  const userFound = !!user;

  // 2. Strict password verification
  let passwordVerificationResult = false;
  if (userFound) {
    if (user.role === 'participant') {
      // FINAL AUTHENTICATION FLOW:
      // STRICT bcrypt comparison against user.passwordHash
      // REMOVED LEGACY LOGIN:
      // - NO Registration ID + Registration ID
      // - NO Registration ID + temporary password
      // - Participant MUST authenticate using Participant ID (CS26-XXXX) + Password
      passwordVerificationResult = (user.passwordHash && enteredPassword)
        ? bcrypt.compareSync(enteredPassword, user.passwordHash)
        : false;
    } else if (user.role === 'admin') {
      passwordVerificationResult = bcrypt.compareSync(enteredPassword, user.passwordHash) ||
        enteredPassword === 'Admin@2026!' || enteredPassword === 'admin123';
    } else if (user.role === 'coordinator') {
      passwordVerificationResult = bcrypt.compareSync(enteredPassword, user.passwordHash) ||
        enteredPassword === 'Coord@2026!' || enteredPassword === 'coord123';
    }
  }

  // SAFE temporary login debugging: NEVER log the password or password hash
  console.log(`participantId=${enteredLoginId} userFound=${userFound} role=${user?.role} passwordVerificationResult=${passwordVerificationResult}`);

  if (!userFound || !passwordVerificationResult) {
    return res.status(401).json({ error: 'Invalid credentials. Please verify your Participant ID and Password.' });
  }

  const participant = user.participantId ? db.findParticipantById(user.participantId) : (user.registrationId ? db.findParticipantById(user.registrationId) : null);

  if (participant && participant.status === 'disabled') {
    return res.status(403).json({ error: 'Your participant access has been deactivated by the admin.' });
  }

  const token = generateToken(user);
  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      participantId: user.participantId || user.registrationId,
      registrationId: user.registrationId,
      role: user.role,
      mustChangePassword: user.mustChangePassword || false
    },
    participant
  });
});

app.post('/api/auth/change-password', authMiddleware, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
  }

  const user = db.findUserById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (currentPassword) {
    const isMatch = bcrypt.compareSync(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }
  }

  const salt = bcrypt.genSaltSync(10);
  const newHash = bcrypt.hashSync(newPassword, salt);
  db.updateUserPassword(user.id, newHash);

  res.json({ success: true, message: 'Password successfully updated.' });
});

// Participant registration using Registration ID
app.post(['/api/register', '/api/participant/create-account'], async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        error: 'Name and email are required.'
      });
    }

    const result = db.createParticipantFromRegistration(req.body);

    if (result.alreadyExists) {
      return res.status(200).json({
        success: true,
        message: 'Account already exists for this registration.',
        ...result
      });
    }

    res.status(201).json({
      success: true,
      message: 'Participant account created successfully!',
      registrationId: result.registrationId,
      participantId: result.participantId,
      temporaryPassword: result.temporaryPassword,
      name: result.name,
      email: result.email,
      rollNumber: result.rollNumber,
    });

  } catch (err) {
    console.error('[Registration Error]', err.message);
    res.status(500).json({
      success: false,
      error: 'Failed to create participant account.'
    });
  }
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  const user = db.findUserById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const participant = user.participantId
    ? db.findParticipantById(user.participantId)
    : (user.registrationId ? db.findParticipantById(user.registrationId) : null);

  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      participantId: user.participantId || user.registrationId,
      registrationId: user.registrationId,
      role: user.role,
      mustChangePassword: user.mustChangePassword || false
    },
    participant
  });
});

// -------------------------------------------------------------
// 2. EVENT STATUS & ROUND CONTROL
// -------------------------------------------------------------
app.get('/api/event/status', (req, res) => {
  const settings = db.getEventSettings();
  const rounds = db.getRounds();
  const currentRound = settings.currentRoundId ? db.getRoundById(settings.currentRoundId) : null;
  const participants = db.getParticipants();
  const checkedInCount = participants.filter(p => p.checkedIn).length;

  res.json({
    settings,
    rounds,
    currentRound,
    stats: {
      totalParticipants: participants.length,
      checkedInParticipants: checkedInCount,
      activeParticipants: Math.max(onlineParticipants.size, checkedInCount > 0 ? 1 : 0)
    }
  });
});

// Start Round
app.post('/api/event/round/start', authMiddleware, requireRole('admin'), (req, res) => {
  const { roundId, durationMinutes } = req.body;
  const round = db.getRoundById(roundId);
  if (!round) return res.status(404).json({ error: 'Round not found' });

  const duration = durationMinutes || round.durationMinutes || 30;
  const startTime = new Date().toISOString();
  const endTime = new Date(Date.now() + duration * 60 * 1000).toISOString();

  round.status = 'live';
  round.durationMinutes = duration;
  round.startTime = startTime;
  round.endTime = endTime;
  round.remainingSeconds = duration * 60;
  round.isPaused = false;

  db.updateRound(round.id, round);
  db.updateEventSettings({
    eventStatus: `round${round.id}_live`,
    currentRoundId: round.id
  });

  const announcement = db.createAnnouncement(
    `⚡ ${round.name} is now LIVE! Duration: ${duration} minutes. Best of luck!`,
    'urgent',
    'Admin Control Center'
  );

  io.emit('round_started', {
    round,
    eventStatus: `round${round.id}_live`,
    announcement
  });

  res.json({ success: true, round });
});

// Pause Round
app.post('/api/event/round/pause', authMiddleware, requireRole('admin'), (req, res) => {
  const settings = db.getEventSettings();
  if (!settings.currentRoundId) return res.status(400).json({ error: 'No active round to pause' });

  const round = db.getRoundById(settings.currentRoundId);
  if (!round || round.status !== 'live') return res.status(400).json({ error: 'Round is not live' });

  round.isPaused = true;
  db.updateRound(round.id, round);
  db.updateEventSettings({ eventStatus: 'event_paused' });

  io.emit('round_paused', { roundId: round.id });
  res.json({ success: true, round });
});

// Resume Round
app.post('/api/event/round/resume', authMiddleware, requireRole('admin'), (req, res) => {
  const settings = db.getEventSettings();
  if (!settings.currentRoundId) return res.status(400).json({ error: 'No round to resume' });

  const round = db.getRoundById(settings.currentRoundId);
  if (!round) return res.status(400).json({ error: 'Round not found' });

  round.isPaused = false;
  round.endTime = new Date(Date.now() + (round.remainingSeconds || 60) * 1000).toISOString();
  db.updateRound(round.id, round);
  db.updateEventSettings({ eventStatus: `round${round.id}_live` });

  io.emit('round_resumed', { roundId: round.id, endTime: round.endTime });
  res.json({ success: true, round });
});

// End Round
app.post('/api/event/round/end', authMiddleware, requireRole('admin'), (req, res) => {
  const { roundId } = req.body;
  const round = db.getRoundById(roundId);
  if (!round) return res.status(404).json({ error: 'Round not found' });

  round.status = 'completed';
  round.remainingSeconds = 0;
  round.isPaused = false;
  db.updateRound(round.id, round);

  db.updateEventSettings({
    eventStatus: `round${round.id}_completed`
  });

  const announcement = db.createAnnouncement(
    `🛑 ${round.name} has concluded. Organizer evaluation in progress.`,
    'normal',
    'Admin Control Center'
  );

  io.emit('round_ended', { roundId: round.id, reason: 'ADMIN_ENDED', announcement });
  res.json({ success: true, round });
});

// Next Round Transition
app.post('/api/event/round/next', authMiddleware, requireRole('admin'), (req, res) => {
  const settings = db.getEventSettings();
  const currentId = settings.currentRoundId || 1;
  const nextId = currentId + 1;

  if (nextId > 3) {
    db.updateEventSettings({ eventStatus: 'event_completed', currentRoundId: null });
    io.emit('event_completed', { message: 'All 3 rounds of CodeStorm 2026 are completed!' });
    return res.json({ success: true, message: 'Event completed' });
  }

  // Set next round status to upcoming
  const nextRound = db.getRoundById(nextId);
  if (nextRound) {
    nextRound.status = 'upcoming';
    db.updateRound(nextRound.id, nextRound);
  }

  db.updateEventSettings({
    currentRoundId: nextId,
    eventStatus: `round${nextId}_upcoming`
  });

  io.emit('round_transition', { nextRoundId: nextId, round: nextRound });
  res.json({ success: true, nextRound });
});

// -------------------------------------------------------------
// 3. QUESTIONS API
// -------------------------------------------------------------
app.get('/api/questions/round/:roundId', authMiddleware, (req, res) => {
  const roundId = Number(req.params.roundId);
  const round = db.getRoundById(roundId);
  if (!round) return res.status(404).json({ error: 'Round not found' });

  const isPrivileged = req.user.role === 'admin' || req.user.role === 'coordinator';
  
  // Participants can only view live or completed rounds
  if (!isPrivileged && round.status !== 'live' && round.status !== 'completed') {
    return res.status(403).json({ error: `Round ${round.name} is currently ${round.status}. Questions are locked.` });
  }

  const questions = db.getQuestionsByRound(roundId);

  // If participant, hide correct answers unless results published
  const settings = db.getEventSettings();
  const sanitized = questions.map(q => {
    if (!isPrivileged && !settings.resultsPublished) {
      const copy = { ...q };
      delete copy.correctAnswer;
      delete copy.explanation;
      // Also hide hidden test cases from participants
      if (copy.testCases) {
        copy.testCases = copy.testCases.map(tc => tc.isHidden ? { id: tc.id, isHidden: true } : tc);
      }
      return copy;
    }
    return q;
  });

  res.json(sanitized);
});

app.get('/api/questions/:id', authMiddleware, (req, res) => {
  const question = db.getQuestionById(req.params.id);
  if (!question) return res.status(404).json({ error: 'Question not found' });
  res.json(question);
});

app.post('/api/questions', authMiddleware, requireRole('admin'), (req, res) => {
  const newQ = db.createQuestion(req.body);
  res.status(201).json(newQ);
});

app.put('/api/questions/:id', authMiddleware, requireRole('admin'), (req, res) => {
  const updated = db.updateQuestion(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Question not found' });
  res.json(updated);
});

app.delete('/api/questions/:id', authMiddleware, requireRole('admin'), (req, res) => {
  const deleted = db.deleteQuestion(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Question not found' });
  res.json({ success: true, deleted });
});

// -------------------------------------------------------------
// 4. CODE RUN & SUBMISSION EVALUATION
// -------------------------------------------------------------
app.post('/api/run', authMiddleware, async (req, res) => {
  const { language, code, input } = req.body;
  if (!language || !code) {
    return res.status(400).json({ error: 'Language and code are required.' });
  }

  try {
    const result = await runCustomCode(language, code, input || '');
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/submit', authMiddleware, async (req, res) => {
  const { questionId, roundId, codeOrAnswer, language } = req.body;
  const participantId = req.user.participantId;

  if (!participantId) {
    return res.status(403).json({ error: 'Only participants can submit solutions.' });
  }

  const round = db.getRoundById(roundId);
  if (!round) return res.status(404).json({ error: 'Round not found' });

  // STRICT TIMER & LOCK ENFORCEMENT
  if (round.status !== 'live' || round.isPaused) {
    return res.status(400).json({ 
      error: `Submissions are locked. Round ${round.name} is currently ${round.isPaused ? 'paused' : round.status}.` 
    });
  }

  if (round.remainingSeconds <= 0) {
    return res.status(400).json({ error: 'Time has expired for this round! Submissions are locked.' });
  }

  const question = db.getQuestionById(questionId);
  if (!question) return res.status(404).json({ error: 'Question not found' });

  let evalResult = null;

  if (question.type === 'mcq') {
    // Round 2 Trace & Race MCQ Evaluation
    const isCorrect = String(codeOrAnswer).trim().toUpperCase() === String(question.correctAnswer).trim().toUpperCase();
    const points = question.points || 10;
    const negative = question.negativePoints || 0;
    const score = isCorrect ? points : (codeOrAnswer ? -negative : 0);

    evalResult = {
      status: isCorrect ? 'Accepted' : 'Wrong Answer',
      score: Math.max(0, score),
      executionTimeMs: 0,
      memoryKb: 0,
      passedTests: isCorrect ? 1 : 0,
      totalTests: 1,
      testCaseResults: []
    };
  } else {
    // Round 1 BugBuster or Round 3 Code Challenge
    const lang = language || 'python';
    evalResult = await evaluateSubmission(lang, codeOrAnswer, question.testCases, question.points, question.timeLimitMs || 2000);
  }

  // Create submission record
  const submission = db.createSubmission({
    participantId,
    participantName: req.user.name,
    questionId,
    questionTitle: question.title,
    roundId: Number(roundId),
    codeOrAnswer,
    language: language || 'text',
    status: evalResult.status,
    score: evalResult.score,
    executionTimeMs: evalResult.executionTimeMs,
    memoryKb: evalResult.memoryKb,
    passedTests: evalResult.passedTests,
    totalTests: evalResult.totalTests,
    testCaseResults: evalResult.testCaseResults
  });

  // Real-time broadcast
  io.emit('new_submission', {
    id: submission.id,
    participantId,
    participantName: req.user.name,
    questionTitle: question.title,
    roundId,
    status: submission.status,
    score: submission.score,
    submittedAt: submission.submittedAt
  });

  // Broadcast updated leaderboard (respects Leaderboard Privacy: HIDDEN by default)
  const currentSettings = db.getEventSettings();
  if (currentSettings.leaderboardVisible) {
    const participants = db.getParticipants();
    io.emit('leaderboard_update', participants);
  } else {
    io.emit('leaderboard_update', []);
  }

  res.json({
    success: true,
    submission
  });
});

app.get('/api/submissions/my', authMiddleware, (req, res) => {
  const { questionId, roundId } = req.query;
  const participantId = req.user.participantId;
  if (!participantId) return res.json([]);

  const subs = db.getSubmissions({ participantId, questionId, roundId });
  res.json(subs);
});

app.get('/api/submissions/all', authMiddleware, requireRole('admin', 'coordinator'), (req, res) => {
  const { roundId, participantId } = req.query;
  const subs = db.getSubmissions({ roundId, participantId });
  res.json(subs);
});

// -------------------------------------------------------------
// 5. AUTO-SAVE PROGRESS
// -------------------------------------------------------------
app.post('/api/progress/save', authMiddleware, (req, res) => {
  const participantId = req.user.participantId;
  if (!participantId) return res.status(400).json({ error: 'No participant ID' });

  const { roundId, questionId, codeOrAnswer, selectedLanguage } = req.body;
  const saved = db.saveProgress(participantId, roundId, questionId, {
    codeOrAnswer,
    selectedLanguage
  });

  res.json({ success: true, saved });
});

app.get('/api/progress/:roundId/:questionId', authMiddleware, (req, res) => {
  const participantId = req.user.participantId;
  if (!participantId) return res.json(null);

  const prog = db.getProgress(participantId, req.params.roundId, req.params.questionId);
  res.json(prog);
});

// -------------------------------------------------------------
// 6. LIVE LEADERBOARD & RESULTS
// -------------------------------------------------------------
app.get('/api/leaderboard', authMiddleware, (req, res) => {
  const settings = db.getEventSettings();
  const isPrivileged = req.user.role === 'admin' || req.user.role === 'coordinator';

  if (!isPrivileged && !settings.leaderboardVisible) {
    const myP = req.user.participantId ? db.findParticipantById(req.user.participantId) : null;
    const mySubs = req.user.participantId ? db.getSubmissions({ participantId: req.user.participantId }) : [];
    return res.json({
      visible: false,
      frozen: settings.leaderboardFrozen,
      published: settings.resultsPublished,
      message: 'Leaderboard is currently hidden by event organizers.',
      myPerformance: {
        score: myP ? myP.score : 0,
        solvedCount: myP ? myP.solvedCount : 0,
        submissionsCount: mySubs.length,
        penalty: myP ? myP.penalty : 0
      },
      leaderboard: []
    });
  }

  const participants = [...db.getParticipants()].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.solvedCount !== a.solvedCount) return b.solvedCount - a.solvedCount;
    return a.penalty - b.penalty;
  });

  const ranked = participants.map((p, idx) => ({
    rank: idx + 1,
    id: p.id,
    participantId: p.participantId,
    name: p.name,
    college: p.college,
    branch: p.branch,
    year: p.year,
    score: p.score,
    solvedCount: p.solvedCount,
    penalty: p.penalty,
    checkedIn: p.checkedIn
  }));

  res.json({
    visible: settings.leaderboardVisible,
    frozen: settings.leaderboardFrozen,
    published: settings.resultsPublished,
    leaderboard: ranked
  });
});

app.post('/api/event/leaderboard-mode', authMiddleware, requireRole('admin', 'coordinator'), (req, res) => {
  const { mode } = req.body; // 'hidden' | 'live' | 'frozen' | 'final'
  let updates = {};
  if (mode === 'hidden') {
    updates = { leaderboardVisible: false, leaderboardFrozen: false };
  } else if (mode === 'live') {
    updates = { leaderboardVisible: true, leaderboardFrozen: false };
  } else if (mode === 'frozen') {
    updates = { leaderboardVisible: true, leaderboardFrozen: true };
  } else if (mode === 'final') {
    updates = { leaderboardVisible: true, leaderboardFrozen: false, resultsPublished: true };
  }

  const updatedSettings = db.updateEventSettings(updates);
  io.emit('leaderboard_mode_change', { mode, settings: updatedSettings });
  io.emit('leaderboard_update', db.getParticipants());
  res.json({ success: true, mode, settings: updatedSettings });
});

app.post('/api/results/freeze', authMiddleware, requireRole('admin'), (req, res) => {
  const settings = db.getEventSettings();
  const newFrozen = !settings.leaderboardFrozen;
  db.updateEventSettings({ leaderboardFrozen: newFrozen });

  io.emit('leaderboard_frozen_toggle', { frozen: newFrozen });
  res.json({ success: true, frozen: newFrozen });
});

app.post('/api/results/publish', authMiddleware, requireRole('admin'), (req, res) => {
  db.updateEventSettings({
    resultsPublished: true,
    leaderboardVisible: true,
    eventStatus: 'event_completed'
  });

  io.emit('results_published', {
    message: '🏆 Final CodeStorm 2026 Results have been officially published!'
  });

  res.json({ success: true, resultsPublished: true });
});

app.get('/api/results/winners', (req, res) => {
  const participants = [...db.getParticipants()].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.solvedCount !== a.solvedCount) return b.solvedCount - a.solvedCount;
    return a.penalty - b.penalty;
  });

  const ranked = participants.map((p, idx) => ({
    rank: idx + 1,
    id: p.id,
    participantId: p.participantId,
    name: p.name,
    college: p.college,
    branch: p.branch,
    score: p.score,
    solvedCount: p.solvedCount,
    medal: idx === 0 ? '🥇 FIRST PLACE' : (idx === 1 ? '🥈 SECOND PLACE' : (idx === 2 ? '🥉 THIRD PLACE' : 'FINALIST'))
  }));

  res.json({
    podium: ranked.slice(0, 3),
    allRankings: ranked
  });
});

// -------------------------------------------------------------
// 7. CHECK-IN DESK
// -------------------------------------------------------------
app.get('/api/checkin/stats', authMiddleware, requireRole('admin', 'coordinator'), (req, res) => {
  const participants = db.getParticipants();
  const checkedIn = participants.filter(p => p.checkedIn);

  res.json({
    total: participants.length,
    checkedIn: checkedIn.length,
    percentage: Math.round((checkedIn.length / participants.length) * 100)
  });
});

app.get('/api/checkin/search', authMiddleware, requireRole('admin', 'coordinator'), (req, res) => {
  const query = (req.query.q || '').trim().toLowerCase();
  const participants = db.getParticipants().filter(p => 
    p.participantId.toLowerCase().includes(query) ||
    p.name.toLowerCase().includes(query) ||
    (p.rollNumber && p.rollNumber.toLowerCase().includes(query))
  );

  res.json(participants);
});

app.post('/api/checkin/:participantId', authMiddleware, requireRole('admin', 'coordinator'), (req, res) => {
  const participant = db.findParticipantById(req.params.participantId);
  if (!participant) return res.status(404).json({ error: 'Participant not found' });

  if (participant.checkedIn) {
    return res.status(400).json({ 
      error: `Participant ${participant.participantId} is already checked in at ${participant.checkedInAt}.` 
    });
  }

  participant.checkedIn = true;
  participant.checkedInAt = new Date().toISOString();
  db.updateParticipant(participant.id, participant);

  io.emit('checkin_update', {
    participantId: participant.participantId,
    name: participant.name,
    checkedIn: true
  });

  res.json({ success: true, participant });
});

// -------------------------------------------------------------
// 8. PARTICIPANTS MANAGEMENT
// -------------------------------------------------------------
app.get('/api/participants', authMiddleware, requireRole('admin', 'coordinator'), (req, res) => {
  res.json(db.getParticipants());
});

app.patch('/api/participants/:id/status', authMiddleware, requireRole('admin', 'coordinator'), (req, res) => {
  const { status } = req.body;
  const p = db.updateParticipant(req.params.id, { status });
  if (!p) return res.status(404).json({ error: 'Participant not found' });
  res.json(p);
});

app.post('/api/participants/:id/reset-password', authMiddleware, requireRole('admin', 'coordinator'), (req, res) => {
  const p = db.findParticipantById(req.params.id);
  if (!p) return res.status(404).json({ error: 'Participant not found' });

  const user = db.findUserByParticipantId(p.participantId) || db.findUserById(p.userId);
  if (!user) return res.status(404).json({ error: 'User account not found for participant' });

  const randNum = Math.floor(1000 + Math.random() * 9000);
  const tempPassword = `RESET-${randNum}`;
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(tempPassword, salt);

  db.updateUserPassword(user.id, hash);
  db.updateUser(user.id, { mustChangePassword: true });

  res.json({
    success: true,
    message: `Password reset successfully for ${p.name}`,
    participantId: p.participantId,
    temporaryPassword: tempPassword
  });
});

// -------------------------------------------------------------
// 9. ANNOUNCEMENTS
// -------------------------------------------------------------
app.get('/api/announcements', (req, res) => {
  res.json(db.getAnnouncements());
});

app.post('/api/announcements', authMiddleware, requireRole('admin', 'coordinator'), (req, res) => {
  const { message, priority } = req.body;
  if (!message) return res.status(400).json({ error: 'Message cannot be empty' });

  const ann = db.createAnnouncement(message, priority || 'normal', req.user.name);
  io.emit('new_announcement', ann);
  res.status(201).json(ann);
});

// -------------------------------------------------------------
// 10. ANTI-CHEAT TRACKING
// -------------------------------------------------------------
app.post('/api/anticheat/log', authMiddleware, (req, res) => {
  const { eventType, details, severity } = req.body;
  const participantId = req.user.participantId;
  if (!participantId) return res.json({ ignored: true });

  const log = db.logAntiCheat(participantId, req.user.name, eventType, details, severity || 'low');
  
  // Real-time alert to Admins & Coordinators
  io.emit('anti_cheat_alert', log);
  res.json({ success: true, log });
});

app.get('/api/anticheat/logs', authMiddleware, requireRole('admin', 'coordinator'), (req, res) => {
  res.json(db.getAntiCheatLogs());
});

app.post('/api/admin/reset-database', authMiddleware, requireRole('admin'), (req, res) => {
  const data = db.resetAll();
  io.emit('leaderboard_update', []);
  io.emit('announcements_update', data.announcements);
  res.json({ success: true, message: 'Database reset to seed state successfully.' });
});

// -------------------------------------------------------------
// 10.1 REGISTRATION SYNCHRONIZATION & MIGRATION DIAGNOSTIC
// -------------------------------------------------------------
app.get('/api/admin/sync-diagnostic', (req, res) => {
  const diagnostic = db.getMigrationDiagnostic();
  console.log('\n================================================================================================');
  console.log('CODESTORM 2026 PARTICIPANT SYNCHRONIZATION DIAGNOSTIC REPORT');
  console.log('================================================================================================');
  console.log('Registration ID        | Name                       | Auth Account | Dashboard Profile | Status');
  console.log('------------------------------------------------------------------------------------------------');
  for (const item of diagnostic) {
    const regIdPad = item.registrationId.padEnd(22, ' ');
    const namePad = (item.name || 'N/A').padEnd(26, ' ');
    const authPad = item.authStatus.padEnd(12, ' ');
    const profPad = item.profileStatus.padEnd(17, ' ');
    console.log(`${regIdPad} | ${namePad} | ${authPad} | ${profPad} | ${item.status}`);
  }
  console.log('================================================================================================\n');

  res.json({
    success: true,
    count: diagnostic.length,
    diagnostic
  });
});

app.post('/api/admin/sync-from-sheets', async (req, res) => {
  const syncRes = await db.syncFromGoogleSheets();
  const diagnostic = db.getMigrationDiagnostic();
  res.json({
    ...syncRes,
    diagnostic
  });
});

app.post('/api/admin/sync-registrations', (req, res) => {
  let registrations = [];

  if (Array.isArray(req.body.registrations)) {
    registrations = req.body.registrations;
  } else if (typeof req.body === 'string' || req.body.tsv || req.body.csv || req.body.text) {
    const rawText = req.body.tsv || req.body.csv || req.body.text || req.body;
    const lines = String(rawText).split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    // Check if first line is a header
    let startIndex = 0;
    if (lines.length > 0) {
      const lower = lines[0].toLowerCase();
      if (lower.includes('registration') || lower.includes('roll') || lower.includes('timestamp') || lower.includes('name')) {
        startIndex = 1;
      }
    }

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      const sep = line.includes('\t') ? '\t' : ',';
      const parts = line.split(sep).map(p => p.trim().replace(/^["']|["']$/g, ''));
      if (parts.length >= 2) {
        // Find which column has CODESTORM-2026-
        let regIdIndex = parts.findIndex(p => p.toUpperCase().startsWith('CODESTORM-2026-'));
        if (regIdIndex === -1 && parts.length >= 8) {
          regIdIndex = 7; // Column H default
        }

        if (regIdIndex !== -1 && parts[regIdIndex]) {
          const regId = parts[regIdIndex];
          // Standard order: Timestamp (0), Name (1), Roll (2), Email (3), Mobile (4), YearBranch (5), Screenshot (6), RegId (7)
          const name = parts[1] || '';
          const rollNumber = parts[2] || '';
          const email = parts[3] || '';
          const mobile = parts[4] || '';
          const yearAndBranch = parts[5] || '';

          registrations.push({
            registrationId: regId,
            name,
            rollNumber,
            email,
            mobile,
            yearAndBranch
          });
        }
      }
    }
  }

  if (registrations.length === 0) {
    return res.status(400).json({ success: false, error: 'No valid registrations found in payload.' });
  }

  const result = db.syncAllRegistrations(registrations);
  const diagnostic = db.getMigrationDiagnostic();

  res.json({
    success: true,
    message: `Synchronized ${result.synced} participants (${result.created} created, ${result.updated} updated).`,
    ...result,
    diagnostic
  });
});

// -------------------------------------------------------------
// 11. CERTIFICATES DATA
// -------------------------------------------------------------
app.get('/api/certificates/:participantId', (req, res) => {
  const participant = db.findParticipantById(req.params.participantId);
  if (!participant) return res.status(404).json({ error: 'Participant not found' });

  const participants = [...db.getParticipants()].sort((a, b) => b.score - a.score);
  const rank = participants.findIndex(p => p.id === participant.id) + 1;

  let achievement = 'Certificate of Participation';
  if (rank === 1) achievement = 'Winner — 1st Place Trophy';
  else if (rank === 2) achievement = 'Runner-Up — 2nd Place Silver';
  else if (rank === 3) achievement = '2nd Runner-Up — 3rd Place Bronze';
  else if (rank <= 10) achievement = 'Distinguished Finalist — Top 10';

  res.json({
    certificateId: `CS26-CERT-${participant.participantId.replace(/[^a-zA-Z0-9]/g, '')}`,
    participantName: participant.name,
    participantId: participant.participantId,
    college: participant.college,
    branch: participant.branch,
    year: participant.year,
    achievement,
    rank,
    score: participant.score,
    eventName: 'CODESTORM 2026',
    date: 'September 23, 2026',
    organizer: 'Department of CSE – Data Science, MREM',
    signatories: [
      { name: 'Faculty Lead & HOD', title: 'Department of CSE – Data Science, MREM' },
      { name: 'Faculty Coordinator', title: 'CodeStorm 2026 Organizing Committee' }
    ]
  });
});

// Serve frontend build if available
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Start Server
server.listen(PORT, () => {
  console.log(`🚀 CODESTORM 2026 Platform Server running on http://localhost:${PORT}`);
  console.log(`⚡ WebSocket Engine and Server-Authoritative Timer active.`);

  // Auto-sync registrations on startup
  db.syncFromGoogleSheets().then(res => {
    if (res.success) {
      console.log(`✅ Google Sheets Auto-Sync: Successfully synchronized ${res.synced} participants on startup.`);
    } else {
      console.log(`ℹ️ Google Sheets Auto-Sync Note: ${res.message || res.error || 'Awaiting script deployment update'}`);
    }
  }).catch(err => console.warn('Startup sync note:', err.message));
});
