# 🏥 MediQueue — Clinic Appointment & Queue Management System

> A full-stack MERN application that digitises a small clinic's front desk: **appointment booking, a live patient queue, conflict-safe slot reservation, wait-time estimation, and a complete clinical audit trail** — wrapped in three tailored portals for **patients, staff, and doctors**.

[![Node](https://img.shields.io/badge/Node.js-22-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)](https://expressjs.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-7-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)](https://vite.dev)
[![JWT](https://img.shields.io/badge/Auth-JWT-000000?logo=jsonwebtokens&logoColor=white)](https://jwt.io)
[![Tests](https://img.shields.io/badge/tests-47%2F47%20passing-2ea44f)]()

---

## ✨ Highlights

| **Portal** | **Who** | **Home** |
| --- | --- | --- |
| 🛡️ Admin | Clinic owner / manager | `/admin/dashboard` |
| 🧑💼 Staff | Front desk / reception | `/staff/dashboard` |
| 🩺 Doctor | Consulting physician | `/doctor/dashboard` |
| 🧑 Patient | The person being treated | `/patient/dashboard` |

Every route is guarded **twice** — client-side role guards *and* server-side role middleware with per-row ownership checks.

---

## 🚀 Features

- **Smart slot booking** — slots are generated from each doctor's weekly availability and consultation duration, and validated server-side *at the exact moment of booking*.
- **Booking wizard** — pick doctor → date → live time-slot grid → confirm with a reason.
- **Live queue** (`STAFF`) — per-doctor `SCHEDULED → WAITING → IN_CONSULT → COMPLETED` with 1-based `queuePosition`, `#3`-style labels, and an estimated wait derived from the doctor's average consultation length.
- **Strict status machine** — enforced in the service layer and recorded as a full `StatusHistory`; invalid transitions (cancelling an `IN_CONSULT`, completing someone else's consultation…) are rejected with specific error codes.
- **Race-safe bookers** — overlapping-slot validation + a partial unique index on `(doctor, date, startTime)` for active statuses, so two patients can never hold the same slot even under simultaneous requests (`SLOT_CONFLICT`).
- **Patient self-service** — cancel anytime before check-in.
- **Staff tools** — check-in, reschedule, cancel, today's board, patient search, and reporting.
- **Doctor tools** — now-serving screen, start/complete consultations with mandatory clinical notes, patient history.
- **Dashboards** — KPIs for all three roles (today's totals, queue length, average duration, upcoming visits, wait time).
- **Live updates** — auto-refresh via React Query polling keeps the queue current.
- **Admin console** — full team management: add/edit/deactivate doctors (with schedule & availability), create/manage staff accounts, oversee patient accounts, and view clinic-wide stats.
- **Hand-rolled design system** — responsive, accessible, no UI framework.

---

## 🧱 Tech Stack

| Layer | Technology |
| --- | --- |
| **Backend** | Node.js 22, Express 5, Mongoose, JWT (`jsonwebtoken`), `bcryptjs`, `express-validator` |
| **Frontend** | React 18, Vite 5, `@tanstack/react-query`, `react-router-dom`, `axios`, `lucide-react` |
| **Database** | MongoDB (local `localhost:27017`) |
| **Tooling** | `nodemon`, seed script, 47-check end-to-end test suite |

---

## 📁 Project Layout

```
MediQueue/
├─ server/                     # Express REST API (port 5100)
│  └─ src/
│     ├─ config/               # env + MongoDB connection
│     ├─ models/               # User, DoctorProfile, Appointment, StatusHistory
│     ├─ services/             # auth, doctors, queue, appointments logic
│     ├─ controllers/          # request handlers
│     ├─ routes/               # /api/auth /api/doctors /api/appointments /api/staff /api/doctor
│     ├─ utils/                # time helpers, constants (status machine), ApiError
│     ├─ seed/seed.js          # demo data generator
│     └─ e2e-test.js           # end-to-end API verification (47 checks)
├─ client/                     # React + Vite SPA (port 5174)
│  └─ src/
│     ├─ context/              # Auth + Toast providers
│     ├─ services/             # typed API wrappers
│     ├─ components/           # shared UI (Modal, tables, badges, timeline…)
│     ├─ pages/                # patient/, staff/, doctor/, auth
│     └─ main.jsx / App.jsx / index.css
└─ README.md
```

---

## ⚡ Quick Start

### Prerequisites

- **Node.js 18+** (tested on 22)
- **MongoDB** running on `localhost:27017`

### 1. Backend

```bash
cd server
npm install
copy .env.example .env      # set JWT_SECRET, MONGODB_URI
npm run seed                # optional — loads demo data
npm run dev                 # http://localhost:5100
```

### 2. Frontend

```bash
cd client
npm install
npm run dev                 # http://localhost:5174 (proxies /api → :5100)
```

### 3. Demo logins

| Role | Email | Password |
| --- | --- | --- |
| 🛡️ Admin | `admin@mediqueue.com` | `Admin1234` |
| 🧑‍💼 Staff | `staff@mediqueue.com` | `Staff1234` |
| 🩺 Doctor | `ananya@mediqueue.com` | `Doctor1234` |
| 🩺 Doctor | `rajiv@mediqueue.com` | `Doctor1234` |
| 🧑 Patient | `patient@mediqueue.com` | `Patient1234` |

> All seeded patients share `Patient1234`; all seeded doctors share `Doctor1234`.

---

## 🎬 Quick Demo Walkthrough

1. **Log in as patient** → browse doctors → book the free **10:30** slot.
2. **Log in as staff** → see the appointment appear on today's board → **check the patient in** (moves to *Waiting*).
3. **Log in as doctor** → open **Today's Queue** → **start consultation** → **add clinical notes** → complete.
4. **Log back in as patient** → open the appointment → read your completed prescription. 🎉

---

## 🔌 API Overview

```
POST /api/auth/register                       Register a new patient
POST /api/auth/login                          Login → JWT
GET  /api/auth/me                             Current user
GET  /api/doctors                             Doctor directory
GET  /api/doctors/:id/availability?date=      Open slots for doctor + date
POST /api/appointments                        Book an appointment
GET  /api/appointments/my                     Patient's appointments
GET  /api/appointments/:id                    Detail (queued: position + wait)
PATCH /api/appointments/:id/status            Staff status transitions
PATCH /api/appointments/:id/start-consultation   Doctor: WAITING → IN_CONSULT
PATCH /api/appointments/:id/complete-consultation Doctor: → COMPLETED (notes)
PATCH /api/appointments/:id/cancel            Cancel (patient/staff)
PATCH /api/appointments/:id/reschedule        Staff only
GET  /api/staff/…                             Today, queue, appointments, patients, history, summary
GET  /api/doctor/…                            Today, queue, appointments, patients, history
GET  /api/admin/summary                       Admin dashboard stats          (ADMIN)
GET  /api/admin/doctors                       List doctors + profiles         (ADMIN)
POST /api/admin/doctors                       Create a doctor account         (ADMIN)
PATCH /api/admin/doctors/:id                  Update doctor profile           (ADMIN)
PATCH /api/admin/doctors/:id/active           Activate/deactivate doctor      (ADMIN)
GET  /api/admin/staff                         List staff accounts             (ADMIN)
POST /api/admin/staff                         Create a staff account          (ADMIN)
PATCH /api/admin/staff/:id(/active)           Update / toggle staff           (ADMIN)
GET  /api/admin/patients                      List patients (search + page)   (ADMIN)
PATCH /api/admin/patients/:id/active          Activate/deactivate patient     (ADMIN)
```

---

## 🔄 Status Machine (enforced server-side)

```
SCHEDULED ──(staff check-in)──► WAITING ──(doctor)──► IN_CONSULT ──(doctor + notes)──► COMPLETED
     └──────────────────────────── CANCELLED (patient/staff, with reason)
```

- Only the **assigned doctor** can start/complete a consultation.
- `COMPLETED` requires mandatory clinical notes; prescriptions are hidden from patients until the visit is completed.
- `CANCELLED` requires a reason, and is allowed from `SCHEDULED` (patient) or `SCHEDULED`/`WAITING` (staff).

---

## 🛡️ Security

- Passwords hashed with `bcryptjs`; JWTs signed with an env-provided secret.
- Role-based access control on every route + per-record ownership checks.
- Clinical notes/prescriptions are only returned to the treating doctor/staff.
- Errors are normalized to `{ message, code }` — clients never see stack traces.

---

## 🧪 Tests

```bash
cd server
node src/seed/seed.js   # reseed the demo database
node e2e-test.js        # 47 checks: auth, RBAC, status machine, queues, conflicts…
```

Run the API first (`npm run dev` — port 5100); the e2e suite verifies `PASS 47 | FAIL 0`.

---

## 📄 License

For demo and educational use. All clinical and demographic data is **synthetic**.