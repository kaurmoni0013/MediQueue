/**
 * MediQueue development seed.
 * Creates 1 staff, 2 doctors, 10 patients, and a realistic day of
 * appointments across every status, plus completed history for the portals.
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('../config/env');
const User = require('../models/User');
const DoctorProfile = require('../models/DoctorProfile');
const Appointment = require('../models/Appointment');
const StatusHistory = require('../models/StatusHistory');
const { dateKey, addDays, toMinutes, fromMinutes } = require('../utils/time');

const today = dateKey(new Date());

const at = (daysAgo, hhmm) => {
  const d = addDays(new Date(), -daysAgo);
  d.setHours(...hhmm.split(':').map(Number), 0, 0);
  return d;
};

const RANGES = [
  { start: '09:00', end: '13:00' },
  { start: '17:00', end: '20:00' },
];
const AVAILABILITY = Array.from({ length: 7 }, (_, day) => ({ day, ranges: RANGES }));

async function hash(pw) {
  return bcrypt.hash(pw, 10);
}

async function createUser(name, email, password, role, extra = {}) {
  return User.create({ name, email, passwordHash: await hash(password), role, ...extra });
}

function history(appointment, previousStatus, newStatus, changedBy, note, when) {
  return StatusHistory.create({ appointment, previousStatus, newStatus, changedBy, note, createdAt: when });
}

function addInitialHistory(appt, changedBy, when, note) {
  return history(appt._id, null, 'SCHEDULED', changedBy, note, when);
}

async function seed({ clear = true } = {}) {
  if (clear) {
    console.log('[seed] clearing existing data...');
    await Promise.all([
      StatusHistory.deleteMany({}),
      Appointment.deleteMany({}),
      DoctorProfile.deleteMany({}),
      User.deleteMany({}),
    ]);
  }

  /* ------------------------------ accounts ------------------------------ */
  const admin = await createUser('Moni Kaur', 'admin@mediqueue.com', 'Admin1234', 'ADMIN', { phone: '+91 98200 10000' });
  const staff = await createUser('Ashwin Rao', 'staff@mediqueue.com', 'Staff1234', 'STAFF');

  const ananya = await createUser('Dr. Ananya Sharma', 'ananya@mediqueue.com', 'Doctor1234', 'DOCTOR', { phone: '+91 98200 11001' });
  const rajiv = await createUser('Dr. Rajiv Kapoor', 'rajiv@mediqueue.com', 'Doctor1234', 'DOCTOR', { phone: '+91 98200 11002' });

  const ananyaProfile = await DoctorProfile.create({
    user: ananya._id,
    specialization: 'General Medicine',
    qualification: 'MBBS, MD (Internal Medicine)',
    experienceYears: 8,
    consultationDuration: 15,
    fees: 500,
    bio: 'Internal medicine physician focused on preventive care and chronic disease management.',
    availability: AVAILABILITY,
  });
  const rajivProfile = await DoctorProfile.create({
    user: rajiv._id,
    specialization: 'Pediatrics',
    qualification: 'MBBS, DCH',
    experienceYears: 12,
    consultationDuration: 15,
    fees: 600,
    bio: 'Pediatrician with a special interest in child nutrition and vaccination schedules.',
    availability: AVAILABILITY,
  });

  const PATIENTS = [
    ['Rahul Mehta', 'patient@mediqueue.com', '+91 98101 23401'],
    ['Priya Singh', 'priya@mediqueue.com', '+91 98101 23402'],
    ['Aman Verma', 'aman@mediqueue.com', '+91 98101 23403'],
    ['Neha Gupta', 'neha@mediqueue.com', '+91 98101 23404'],
    ['Kavita Iyer', 'kavita@mediqueue.com', '+91 98101 23405'],
    ['Vikram Joshi', 'vikram@mediqueue.com', '+91 98101 23406'],
    ['Sana Khan', 'sana@mediqueue.com', '+91 98101 23407'],
    ['Arjun Nair', 'arjun@mediqueue.com', '+91 98101 23408'],
    ['Meera Pillai', 'meera@mediqueue.com', '+91 98101 23409'],
    ['Rohan Das', 'rohan@mediqueue.com', '+91 98101 23410'],
  ];
  const patients = {};
  for (const [name, email, phone] of PATIENTS) {
    patients[name] = await createUser(name, email, 'Patient1234', 'PATIENT', { phone });
  }

  /* ------------------------ today's appointments ------------------------- */
  const mk = (patient, doctor, doctorProfile, startTime, status, extra = {}) =>
    Appointment.create({
      patient: patients[patient]._id,
      doctor: doctor._id,
      doctorProfile: doctorProfile._id,
      date: today,
      startTime,
      endTime: fromMinutes(toMinutes(startTime) + doctorProfile.consultationDuration),
      status,
      reason: extra.reason || '',
      notes: extra.notes || '',
      prescription: extra.prescription || '',
      followUp: extra.followUp || '',
      cancellationReason: extra.cancellationReason || '',
      cancelledBy: extra.cancelledBy,
      checkedInAt: extra.checkedInAt,
      consultStartedAt: extra.consultStartedAt,
      completedAt: extra.completedAt,
    });

  // Dr. Sharma — completed, waiting, scheduled, cancelled.
  const mehta = await mk('Rahul Mehta', ananya, ananyaProfile, '09:00', 'COMPLETED', {
    reason: 'Fever and headache since two days',
    notes: 'Temperature 100.4F, throat mildly congested. Viral fever. Advised hydration and rest.',
    prescription: 'Paracetamol 650mg after meals for 3 days. ORS 2-3 times daily.',
    followUp: 'Review if fever persists beyond 48 hours.',
    completedAt: at(0, '09:16'),
  });
  await mk('Priya Singh', ananya, ananyaProfile, '09:30', 'COMPLETED', {
    reason: 'Seasonal allergy, sneezing and watery eyes',
    notes: 'Allergic rhinitis. Nasal mucosa pale and oedematous.',
    prescription: 'Cetirizine 10mg once daily at night. Saline nasal spray BD.',
    followUp: 'Follow up in 1 week if symptoms persist.',
    completedAt: at(0, '09:46'),
  });
  await mk('Neha Gupta', ananya, ananyaProfile, '10:00', 'WAITING', {
    reason: 'Persistent cough for 2 weeks',
    checkedInAt: at(0, '09:42'),
  });
  await mk('Kavita Iyer', ananya, ananyaProfile, '10:15', 'WAITING', {
    reason: 'Lower back pain after lifting weights',
    checkedInAt: at(0, '09:51'),
  });
  // 10:30 / 10:45 / 11:00 deliberately kept free for the hackathon demo booking.
  await mk('Arjun Nair', ananya, ananyaProfile, '11:15', 'SCHEDULED', { reason: 'Annual health check-up' });
  await mk('Meera Pillai', ananya, ananyaProfile, '11:45', 'SCHEDULED', { reason: 'Thyroid function follow-up' });
  await mk('Rohan Das', ananya, ananyaProfile, '17:00', 'CANCELLED', {
    reason: 'Patient requested cancellation - travel conflict',
    cancelledBy: staff._id,
  });

  // Dr. Kapoor — completed, in consult, waiting.
  await mk('Rohan Das', rajiv, rajivProfile, '09:15', 'COMPLETED', {
    reason: 'Routine vaccination review',
    notes: 'All scheduled vaccines up to date.',
    prescription: 'No medication required.',
    followUp: 'Next vaccination due in 6 months.',
    completedAt: at(0, '09:30'),
  });
  await mk('Aman Verma', rajiv, rajivProfile, '10:00', 'IN_CONSULT', {
    reason: 'Recurring stomach pain after meals',
    consultStartedAt: at(0, '10:02'),
  });
  await mk('Vikram Joshi', rajiv, rajivProfile, '10:30', 'WAITING', {
    reason: 'Child with fever since yesterday',
    checkedInAt: at(0, '10:00'),
  });
  await mk('Sana Khan', rajiv, rajivProfile, '11:00', 'WAITING', {
    reason: 'Scheduled immunization - child',
    checkedInAt: at(0, '10:06'),
  });

  /* --------------------------- past history ------------------------------ */
  const past = async (patient, doctor, doctorProfile, daysAgo, startTime, status, extra = {}) => {
    const endTime = fromMinutes(toMinutes(startTime) + doctorProfile.consultationDuration);
    return Appointment.create({
      patient: patients[patient]._id,
      doctor: doctor._id,
      doctorProfile: doctorProfile._id,
      date: dateKey(addDays(new Date(), -daysAgo)),
      startTime,
      endTime,
      status,
      reason: extra.reason || '',
      notes: extra.notes || '',
      prescription: extra.prescription || '',
      followUp: extra.followUp || '',
      cancellationReason: extra.cancellationReason || '',
      cancelledBy: extra.cancelledBy,
      completedAt: extra.completedAt,
      checkedInAt: extra.checkedInAt,
    });
  };

  await past('Aman Verma', rajiv, rajivProfile, 3, '10:00', 'COMPLETED', {
    reason: 'Mild gastritis',
    prescription: 'Pantoprazole 40mg before breakfast for 14 days.',
    notes: 'Advise smaller, frequent meals. Avoid spicy food and late-night eating.',
    followUp: 'Revisit if symptoms return after finishing the course.',
    completedAt: at(3, '10:15'),
  });
  await past('Priya Singh', ananya, ananyaProfile, 5, '11:00', 'COMPLETED', {
    reason: 'Migraine follow-up',
    prescription: 'Sumatriptan 50mg at onset, max 2 per week.',
    notes: 'Triggers noted: sleep deprivation and screen time.',
    followUp: 'Maintain sleep schedule; review in 1 month.',
    completedAt: at(5, '11:15'),
  });
  await past('Neha Gupta', rajiv, rajivProfile, 2, '17:30', 'COMPLETED', {
    reason: 'Child with skin rash',
    prescription: 'Calamine lotion locally TDS.',
    notes: 'Mild eczema flare, advise regular moisturiser use.',
    followUp: 'Review in 2 weeks if not improved.',
    completedAt: at(2, '17:45'),
  });
  await past('Rahul Mehta', ananya, ananyaProfile, 7, '18:00', 'COMPLETED', {
    reason: 'Blood pressure review',
    prescription: 'Tab Amlodipine 5mg once daily.',
    notes: 'BP 132/84 today. Continue current lifestyle measures.',
    followUp: 'Next review in 3 months with home BP log.',
    completedAt: at(7, '18:15'),
  });
  await past('Rohan Das', ananya, ananyaProfile, 3, '18:30', 'CANCELLED', {
    reason: 'Doctor unavailable - emergency duty',
    cancelledBy: staff._id,
  });
  await past('Kavita Iyer', ananya, ananyaProfile, 4, '10:30', 'COMPLETED', {
    reason: 'Annual check-up',
    prescription: 'No medication. Routine blood panel recommended.',
    notes: 'All vitals normal.',
    followUp: 'Next annual check-up.',
    completedAt: at(4, '10:45'),
  });
  await past('Vikram Joshi', rajiv, rajivProfile, 6, '11:30', 'COMPLETED', {
    reason: 'Child with recurrent cold',
    prescription: 'Syrup paracetamol SOS. Steam inhalation.',
    notes: 'No abnormal findings.',
    followUp: 'Review if fever spikes.',
    completedAt: at(6, '11:45'),
  });
  await past('Arjun Nair', ananya, ananyaProfile, 1, '17:30', 'COMPLETED', {
    reason: 'Acute throat infection',
    prescription: 'Amoxicillin 500mg TDS for 5 days. Warm saline gargles.',
    notes: 'Tonsillar congestion present.',
    followUp: 'Complete the full antibiotic course.',
    completedAt: at(1, '17:45'),
  });

  /* --------------------------- status history ---------------------------- */
  await addInitialHistory(mehta, mehta.patient, at(0, '08:58'), 'Appointment booked');
  await history(mehta._id, 'SCHEDULED', 'WAITING', staff._id, 'Checked in', at(0, '09:00'));
  await history(mehta._id, 'WAITING', 'IN_CONSULT', ananya._id, 'Consultation started', at(0, '09:00'));
  await history(mehta._id, 'IN_CONSULT', 'COMPLETED', ananya._id, 'Consultation completed', at(0, '09:16'));

  console.log('[seed] demo accounts created.');
  console.log('[seed] today:', today);
  console.log('   ADMIN  admin@mediqueue.com    / Admin1234');
  console.log('   STAFF  staff@mediqueue.com   / Staff1234');
  console.log('   DOCTOR ananya@mediqueue.com  / Doctor1234');
  console.log('   DOCTOR rajiv@mediqueue.com   / Doctor1234');
  console.log('   PATIENT patient@mediqueue.com / Patient1234');
}

async function run() {
  try {
    await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 5000 });
    await seed({ clear: true });
    console.log('[seed] done.');
  } catch (err) {
    console.error('[seed] failed:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

// Idempotent first-boot seeding for fresh deployments (used by auto-seed on
// Render). Seeds only when the database has no doctors yet, so it never wipes
// or overwrites real data on subsequent boots. If the caller already holds an
// open Mongoose connection, it is left untouched.
async function seedIfEmpty() {
  const wasConnected = mongoose.connection.readyState === 1;
  if (!wasConnected) {
    await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 5000 });
  }
  try {
    const hasDoctors = (await DoctorProfile.estimatedDocumentCount()) > 0;
    if (hasDoctors) {
      console.log('[seed] demo data already present — skipping.');
      return;
    }
    await seed({ clear: false });
    console.log('[seed] demo data seeded.');
  } finally {
    if (!wasConnected) await mongoose.disconnect();
  }
}

module.exports = { seed, seedIfEmpty };

if (require.main === module) run();