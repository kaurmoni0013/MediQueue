const ROLES = Object.freeze({ PATIENT: 'PATIENT', STAFF: 'STAFF', DOCTOR: 'DOCTOR' });

const APPOINTMENT_STATUS = Object.freeze({
  SCHEDULED: 'SCHEDULED',
  WAITING: 'WAITING',
  IN_CONSULT: 'IN_CONSULT',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
});

/** Active appointments take part in the queue and occupy slots. */
const ACTIVE_STATUSES = ['SCHEDULED', 'WAITING', 'IN_CONSULT'];
/** Appointments in these states release their slot for re-booking. */
const SLOT_FREE_STATUSES = ['CANCELLED', 'COMPLETED'];

/**
 * State machine for appointment workflow.
 *    SCHEDULED -> WAITING -> IN_CONSULT -> COMPLETED
 * Cancellation is a separate edge (see cancel rules in appointmentService).
 */
const TRANSITIONS = Object.freeze({
  SCHEDULED: ['WAITING'],
  WAITING: ['IN_CONSULT'],
  IN_CONSULT: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
});

/** Which role is allowed to perform which transition. */
const TRANSITION_ACTORS = Object.freeze({
  'SCHEDULED->WAITING': [ROLES.STAFF],
  'WAITING->IN_CONSULT': [ROLES.DOCTOR],
  'IN_CONSULT->COMPLETED': [ROLES.DOCTOR],
});

/** Cancellation rules: which actor may cancel which source status. */
const CANCELLATION_RULES = Object.freeze({
  [ROLES.PATIENT]: ['SCHEDULED'],
  [ROLES.STAFF]: ['SCHEDULED', 'WAITING'],
});

/** Machine readable error codes returned in API error payloads. */
const ERROR_CODES = Object.freeze({
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  SLOT_CONFLICT: 'SLOT_CONFLICT',
  INVALID_STATUS_TRANSITION: 'INVALID_STATUS_TRANSITION',
  APPOINTMENT_NOT_FOUND: 'APPOINTMENT_NOT_FOUND',
  DOCTOR_NOT_AVAILABLE: 'DOCTOR_NOT_AVAILABLE',
  APPOINTMENT_ALREADY_CANCELLED: 'APPOINTMENT_ALREADY_CANCELLED',
  APPOINTMENT_ALREADY_COMPLETED: 'APPOINTMENT_ALREADY_COMPLETED',
  CANNOT_CANCEL: 'CANNOT_CANCEL',
  EMAIL_IN_USE: 'EMAIL_IN_USE',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
});

module.exports = {
  ROLES,
  APPOINTMENT_STATUS,
  ACTIVE_STATUSES,
  SLOT_FREE_STATUSES,
  TRANSITIONS,
  TRANSITION_ACTORS,
  CANCELLATION_RULES,
  ERROR_CODES,
};