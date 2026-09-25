# ⚡ CODESTORM 2026 — Official Event Conducting Platform

> **Live Competition Arena & Real-Time Event Management System**  
> Department of CSE – Data Science  
> Malla Reddy Engineering College and Management Sciences (UGC Autonomous)  
> Hyderabad, Telangana, India

---

## 🎯 Platform Overview

The **CodeStorm 2026 Event Conducting Platform** is the dedicated, high-security competitive programming system used by organizers, faculty coordinators, and registered participants **during the live CodeStorm competition**.

It operates completely independently of the public landing, registration, and payment website, providing a professional LeetCode/HackerRank/CodeChef grade competitive arena with custom CodeStorm cyber-dark aesthetics.

---

## 🔑 Pre-Seeded Access Credentials

| Role | Designation | Login Identifier | Password | Access Rights |
| :--- | :--- | :--- | :--- | :--- |
| **ADMIN** | ADMIN | `admin@codestorm.mrem.ac.in` | `admin123` | Master Control: round start/pause/end, timer sync, question bank CRUD, check-in, freeze/publish results |
| **FACULTY COORDINATOR** | FACULTY COORDINATOR | `coordinator@codestorm.mrem.ac.in` | `coord123` | Check-in attendees, live submissions stream, leaderboard monitor, broadcast alerts, anti-cheat view |
| **PARTICIPANT** | PARTICIPANT | `CS26-1042` or `aneesh@mrem.ac.in` | `pass123` | Compete in BugBuster, Trace & Race, Code Challenge, auto-save code, view rank & certificates |
| **PARTICIPANT** | PARTICIPANT | `CS26-1043` or `tijil@mrem.ac.in` | `pass123` | Compete, real-time grading, submission history |
| **PARTICIPANT** | PARTICIPANT | `CS26-1044` | `pass123` | Compete in active rounds |
| **PARTICIPANT** | PARTICIPANT | `CS26-1045` | `pass123` | Compete in active rounds |
| **PARTICIPANT** | PARTICIPANT | `CS26-1046` | `pass123` | Compete in active rounds |


---

## ⚡ Competition Rounds

### 1. ROUND 1 — BUGBUSTER (Debugging Arena)
- Dedicated debugging arena with embedded **Monaco Code Editor**.
- Supported languages: **Python, C, C++, Java**.
- Participants analyze buggy source code, fix logic/indexing errors, and test via "Run Code".
- "Submit" triggers multi-test case sandboxed evaluation with execution time, memory usage, and verdicts (Accepted, Wrong Answer, Compilation Error, Runtime Error, Time Limit Exceeded).

### 2. ROUND 2 — TRACE & RACE (Speed Logic & Output Prediction)
- Fast-paced output prediction and logical programming questions.
- Dark syntax-highlighted code snippets.
- Interactive question palette with Answered, Flagged, and Unanswered statuses.
- Real-time auto-save on option selection.
- Configurable negative marking (+10 / -2) with answers locked after submission until official publishing.

### 3. ROUND 3 — CODE CHALLENGE (Competitive Programming)
- Split 3-panel layout:
  - **Left**: Problem description, constraints, input/output formats, and copyable examples.
  - **Right**: Monaco Editor with multi-language starter templates, theme controls, and full-screen mode.
  - **Bottom**: Custom input console, sample test runner, and submission history table.

---

## 🛡️ Key Features

- **Server-Authoritative Competition Timer**: True time kept on backend and synced via WebSockets. Reconnecting or refreshing never alters the countdown. Warning indicators at 10m (amber), 5m (orange pulse), and 1m (critical red alert). Automatic lockout upon expiration.
- **Auditorium Projector Display (`/live`)**: Designed specifically for stage projection with giant countdown timer, active participant meters, top-3 podium, and marquee announcement ticker.
- **Anti-Cheat Surveillance**: Tracks browser tab switches (`visibilitychange`) and window blurs. Durations and severity are automatically logged and flagged in Admin/Coordinator monitors.
- **Event Check-In Desk**: Instant search by Participant ID or roll number with duplicate prevention and live percentage meters.
- **Live Leaderboard & Publishing**: Live rank updates, Freeze leaderboard mode to build suspense, and Publish Final Results.
- **Celebration & Certificates**: Interactive winner podium screen (`/winners`) with confetti burst and downloadable/printable official certificates with verified IDs and signatures.

---

## 🚀 Running the Platform Locally

### 1. Start Server
```bash
cd "codestorm-platform/server"
node server.js
```
The server will start at **`http://localhost:5000`** with real-time WebSockets and embedded database.

### 2. Open in Browser
Open `http://localhost:5000` in your web browser.
