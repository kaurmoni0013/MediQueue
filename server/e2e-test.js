/* End-to-end smoke test against the running MediQueue API. */
const BASE = 'http://localhost:5100/api';
let pass = 0;
let fail = 0;

function results() {
  console.log(`\nPASS ${pass} | FAIL ${fail}`);
  if (fail > 0) process.exitCode = 1;
}

async function req(method, path, { token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

function check(name, cond, extra = '') {
  if (cond) {
    pass++;
    console.log(`  ok  ${name}`);
  } else {
    fail++;
    console.log(`  !!  ${name} ${extra}`);
  }
}

const today = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

async function main() {
  // 1. Auth
  const pa = await req('POST', '/auth/login', { body: { email: 'patient@mediqueue.com', password: 'Patient1234' } });
  check('patient login', pa.status === 200 && pa.json.token, `status=${pa.status}`);
  const patientToken = pa.json.token;

  const st = await req('POST', '/auth/login', { body: { email: 'staff@mediqueue.com', password: 'Staff1234' } });
  check('staff login', st.status === 200 && st.json.token, `status=${st.status}`);
  const staffToken = st.json.token;

  const dr = await req('POST', '/auth/login', { body: { email: 'ananya@mediqueue.com', password: 'Doctor1234' } });
  check('doctor login', dr.status === 200 && dr.json.token, `status=${dr.status}`);
  const doctorToken = dr.json.token;

  const bad = await req('POST', '/auth/login', { body: { email: 'patient@mediqueue.com', password: 'WrongPass1' } });
  check('bad password rejected', bad.status === 401);

  const reg = await req('POST', '/auth/register', { body: { name: 'Demo Tester', email: `demo${Date.now()}@mediqueue.com`, password: 'TestPass123' } });
  check('register patient', reg.status === 201 && reg.json.token, `status=${reg.status} msg=${reg.json.message}`);
  const demoToken = reg.json.token;
  const demoUser = reg.json.user;

  const me = await req('GET', '/auth/me', { token: patientToken });
  check('me endpoint', me.status === 200 && me.json.user.role === 'PATIENT');

  // 2. Role authorization enforcement
  const f1 = await req('GET', '/staff/appointments/today', { token: patientToken });
  check('patient blocked from staff API', f1.status === 403, `status=${f1.status}`);
  const f2 = await req('GET', '/api-doctor/today', { token: staffToken });
  const f2b = await req('GET', '/doctor/appointments/today', { token: staffToken });
  check('staff blocked from doctor API', f2b.status === 403, `status=${f2b.status}`);
  const f3 = await req('GET', '/doctors', {});
  check('unauthenticated blocked', f3.status === 401, `status=${f3.status}`);

  // 3. Doctors
  const dls = await req('GET', '/doctors', { token: patientToken });
  check('doctor list', dls.status === 200 && dls.json.doctors.length >= 2);
  const sharma = dls.json.doctors.find((d) => d.name.includes('Ananya'));
  check('sharma present', !!sharma);
  check('sharma has availability', sharma.availability.length === 7, `days=${sharma.availability.length}`);

  const avail = await req('GET', `/doctors/${sharma.id}/availability?date=${today(0)}`, { token: patientToken });
  check('availability today', avail.status === 200 && avail.json.slots.length > 0, `status=${avail.status}`);

  // 4. Booking + conflict detection
  const slot = avail.json.slots.find((s) => s.available && s.start === '10:30');
  check('10:30 slot free today', !!slot, JSON.stringify(avail.json.slots.slice(0, 4)));

  // Patient books 10:30 today with Sharma
  const b1 = await req('POST', '/appointments', {
    token: demoToken,
    body: { doctorId: sharma.id, date: today(0), startTime: '10:30' },
  });
  check('book 10:30 succeeds', b1.status === 201, `status=${b1.status} msg=${b1.json.message}`);
  const newAppt = b1.json && b1.json.appointment;

  // Second patient attempts the SAME slot
  const b2 = await req('POST', '/appointments', {
    token: patientToken,
    body: { doctorId: sharma.id, date: today(0), startTime: '10:30' },
  });
  check('duplicate booking rejected (SLOT_CONFLICT)', b2.status === 409 && b2.json.code === 'SLOT_CONFLICT', `status=${b2.status} code=${b2.json.code}`);

  // Overlapping slot (10:45 - 11:00) while 10:30-10:45 is taken
  const b3 = await req('POST', '/appointments', {
    token: demoToken,
    body: { doctorId: sharma.id, date: today(0), startTime: '10:45' },
  });
  check('adjacent slot 10:45 is free', b3.status === 201, `status=${b3.status} msg=${b3.json.message}`);

  // Doctor unavailable on a conflicting out-of-schedule time
  const b4 = await req('POST', '/appointments', {
    token: demoToken,
    body: { doctorId: sharma.id, date: today(0), startTime: '14:00' },
  });
  check('out-of-schedule time rejected', b4.status === 409, `status=${b4.status}`);

  // 5. My appointments + queue info + live detail
  const myUp = await req('GET', '/appointments/my?tab=upcoming', { token: demoToken });
  check('my upcoming', myUp.status === 200 && myUp.json.appointments.length >= 2);
  const booked = myUp.json.appointments.find((a) => a.id === newAppt.id);
  check('queue position computed for SCHEDULED', booked && booked.queuePosition >= 1, JSON.stringify(booked && { p: booked.queuePosition, w: booked.estimatedWait }));
  check('estimated wait computed', booked && typeof booked.estimatedWait === 'number');

  const live = await req('GET', `/appointments/${newAppt.id}`, { token: demoToken });
  check('live appointment detail', live.status === 200 && live.json.appointment.queuePosition >= 1);

  // 6. State machine
  const badT = await req('PATCH', `/appointments/${newAppt.id}/status`, {
    token: staffToken,
    body: { newStatus: 'COMPLETED' },
  });
  check('SCHEDULED->COMPLETED rejected', badT.status === 409 && badT.json.code === 'INVALID_STATUS_TRANSITION', `status=${badT.status} code=${badT.json.code}`);

  const badActor = await req('PATCH', `/appointments/${newAppt.id}/status`, {
    token: doctorToken,
    body: { newStatus: 'WAITING' },
  });
  check('doctor cannot check-in (actor rule)', badActor.status === 403, `status=${badActor.status}`);

  const ci = await req('PATCH', `/appointments/${newAppt.id}/status`, {
    token: staffToken,
    body: { newStatus: 'WAITING' },
  });
  check('staff SCHEDULED->WAITING', ci.status === 200 && ci.json.appointment.status === 'WAITING', `status=${ci.status}`);

  const wrongDoctor = await req('PATCH', `/appointments/${newAppt.id}/start-consultation`, {
    token: (await req('POST', '/auth/login', { body: { email: 'rajiv@mediqueue.com', password: 'Doctor1234' } })).json.token,
  });
  check('other doctor cannot consult this appointment', wrongDoctor.status === 403, `status=${wrongDoctor.status}`);

  const start = await req('PATCH', `/appointments/${newAppt.id}/start-consultation`, { token: doctorToken });
  check('doctor WAITING->IN_CONSULT', start.status === 200 && start.json.appointment.status === 'IN_CONSULT', `status=${start.status}`);

  const emptyComplete = await req('PATCH', `/appointments/${newAppt.id}/complete-consultation`, { token: doctorToken, body: {} });
  check('complete without notes rejected', emptyComplete.status === 400, `status=${emptyComplete.status}`);

  const complete = await req('PATCH', `/appointments/${newAppt.id}/complete-consultation`, {
    token: doctorToken,
    body: { notes: 'Mild viral fever', prescription: 'Paracetamol 650mg', followUp: 'Rest and hydration' },
  });
  check('IN_CONSULT->COMPLETED with notes', complete.status === 200 && complete.json.appointment.status === 'COMPLETED', `status=${complete.status}`);

  const revert = await req('PATCH', `/appointments/${newAppt.id}/start-consultation`, { token: doctorToken });
  check('COMPLETED cannot go back', revert.status === 409, `status=${revert.status}`);

  const hist = await req('GET', `/appointments/${newAppt.id}/history`, { token: staffToken });
  check('status history recorded', hist.status === 200 && Array.isArray(hist.json.history) && hist.json.history.length === 4, `len=${hist.json.history && hist.json.history.length}`);

  // 7. Patient sees notes only after completion
  const myDetail = await req('GET', `/appointments/${newAppt.id}`, { token: demoToken });
  check('patient sees prescription after completion', myDetail.json.appointment.prescription.includes('Paracetamol'), `pres=${myDetail.json.appointment.prescription}`);

  // 8. Cancellation
  const c1 = await req('POST', '/appointments', {
    token: demoToken,
    body: { doctorId: sharma.id, date: today(1), startTime: '10:30' },
  });
  const cancelTarget = c1.json.appointment;
  const canc = await req('PATCH', `/appointments/${cancelTarget.id}/cancel`, { token: demoToken, body: { reason: 'Schedule change' } });
  check('patient cancels SCHEDULED', canc.status === 200 && canc.json.appointment.status === 'CANCELLED', `status=${canc.status}`);

  const canc2 = await req('PATCH', `/appointments/${cancelTarget.id}/cancel`, { token: demoToken, body: { reason: 'Again' } });
  check('double cancel rejected', canc2.status === 409 && canc2.json.code === 'APPOINTMENT_ALREADY_CANCELLED', `status=${canc2.status}`);

  // Cancel of WAITING by staff
  const c2 = await req('POST', '/appointments', {
    token: demoToken,
    body: { doctorId: sharma.id, date: today(1), startTime: '11:00' },
  });
  await req('PATCH', `/appointments/${c2.json.appointment.id}/status`, { token: staffToken, body: { newStatus: 'WAITING' } });
  const c3 = await req('PATCH', `/appointments/${c2.json.appointment.id}/cancel`, { token: staffToken, body: { reason: 'Doctor unavailable' } });
  check('staff cancels WAITING', c3.status === 200 && c3.json.appointment.status === 'CANCELLED', `status=${c3.status}`);

  // 9. Reschedule with conflict
  const r1 = await req('POST', '/appointments', {
    token: demoToken,
    body: { doctorId: sharma.id, date: today(1), startTime: '09:00' },
  });
  const rsTarget = r1.json.appointment;
  const rs = await req('PATCH', `/appointments/${rsTarget.id}/reschedule`, {
    token: staffToken,
    body: { date: today(1), startTime: '09:15' },
  });
  check('staff reschedules to free slot', rs.status === 200 && rs.json.appointment.startTime === '09:15', `status=${rs.status} msg=${rs.json.message}`);

  // occupy 09:30 then try to reschedule another into it
  await req('POST', '/appointments', { token: demoToken, body: { doctorId: sharma.id, date: today(1), startTime: '09:30' } });
  const rs2 = await req('PATCH', `/appointments/${rsTarget.id}/reschedule`, {
    token: staffToken,
    body: { date: today(1), startTime: '09:30' },
  });
  check('reschedule into occupied slot rejected', rs2.status === 409 && rs2.json.code === 'SLOT_CONFLICT', `status=${rs2.status}`);

  // patient cannot book directly to COMPLETED, and cannot use reschedule
  const rs3 = await req('PATCH', `/appointments/${rsTarget.id}/reschedule`, {
    token: demoToken,
    body: { date: today(1), startTime: '10:00' },
  });
  check('patient reschedule blocked', rs3.status === 403, `status=${rs3.status}`);

  // 10. Staff dashboard + queue
  const stToday = await req('GET', '/staff/appointments/today', { token: staffToken });
  check('staff today returns appointments', stToday.status === 200 && stToday.json.appointments.length >= 10, `status=${stToday.status}`);
  const sorted = stToday.json.appointments.every((a, i, arr) => i === 0 || arr[i - 1].startTime <= a.startTime);
  check('today list is chronological', sorted);

  const q = await req('GET', `/staff/queue?doctorId=${sharma.id}`, { token: staffToken });
  check('staff queue endpoint', q.status === 200 && q.json.queue.length >= 2, `status=${q.status}`);

  const stSummary = await req('GET', '/staff/summary', { token: staffToken });
  check('staff summary', stSummary.status === 200 && typeof stSummary.json.total === 'number');

  // 11. Doctor dashboard
  const drToday = await req('GET', '/doctor/appointments/today', { token: doctorToken });
  check('doctor today', drToday.status === 200 && drToday.json.appointments.length >= 6, `status=${drToday.status}`);
  check('doctor nowServing present', drToday.json.nowServing != null);

  // patient detail for doctor history
  const others = await req('POST', '/auth/login', { body: { email: 'patient@mediqueue.com', password: 'Patient1234' } });
  const hist2 = await req('GET', `/doctor/patients/${others.json.user.id}/history`, { token: doctorToken });
  check('doctor patient history', hist2.status === 200 && hist2.json.appointments.length >= 2, `status=${hist2.status}`);

  // search & filter
  const search = await req('GET', '/staff/appointments?search=Mehta', { token: staffToken });
  check('staff search by patient name', search.status === 200 && search.json.appointments.length >= 1, `status=${search.status}`);

  // pagination shape
  const pg = await req('GET', '/staff/appointments?page=1&limit=5', { token: staffToken });
  check('staff pagination meta', pg.status === 200 && typeof pg.json.total === 'number' && pg.json.limit === 5);

  // cleanup: remove the test user created by this run plus any appointments
  if (demoUser) {
    const mongoose = require('mongoose');
    const Appointment = require('./src/models/Appointment');
    const User = require('./src/models/User');
    await mongoose.connect(require('./src/config/env').mongoUri, { serverSelectionTimeoutMS: 3000 });
    await Appointment.deleteMany({ patient: demoUser.id });
    await User.deleteOne({ _id: demoUser.id });
    await mongoose.disconnect();
    console.log('  ok  test data cleaned up');
  }

  results();
  // Ensure node exits even if a connection lingers.
  setTimeout(() => process.exit(fail ? 1 : 0), 500);
}

main().catch((e) => {
  console.error('test crashed', e);
  process.exitCode = 1;
});