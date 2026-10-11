// Version web : les navigateurs ne permettent pas les rappels programmés à l'avance comme sur iPhone.
// Les rappels ne fonctionnent donc que dans l'app iPhone ; ici, tout est sans effet.
import { Exam, MedicalRecord, Medication, Profile } from './types';

export async function ensurePermission(): Promise<boolean> {
  return false;
}

export async function rescheduleReminders(_input: {
  meds: Medication[];
  profile: Profile;
  todayPins: Record<string, number>;
  takenIds: string[];
  exams: Exam[];
  records: MedicalRecord[];
  skipsOf: (day: string) => string[];
  askPermission: boolean;
}) {
  // pas de rappels sur le web
}
