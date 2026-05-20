import { useMemo } from 'react';
import { Schedule } from '../types/schedule';

export interface ConflictInfo {
  schedule: Schedule;
  overlapStart: string;
  overlapEnd: string;
}

export function useConflictCheck(
  schedules: Schedule[] | undefined,
  childId: string | null,
  startTime: string | null,
  endTime: string | null,
  excludeId?: string
): ConflictInfo[] {
  return useMemo(() => {
    if (!schedules || !childId || !startTime || !endTime) return [];

    const newStart = new Date(startTime).getTime();
    const newEnd = new Date(endTime).getTime();

    if (isNaN(newStart) || isNaN(newEnd) || newEnd <= newStart) return [];

    return schedules
      .filter((s) => {
        if (excludeId && s.id === excludeId) return false;
        if (s.childId !== childId) return false;
        if (s.isAllDay) return false;

        const existStart = new Date(s.startTime).getTime();
        const existEnd = new Date(s.endTime).getTime();

        return newStart < existEnd && newEnd > existStart;
      })
      .map((s) => {
        const existStart = new Date(s.startTime).getTime();
        const existEnd = new Date(s.endTime).getTime();
        return {
          schedule: s,
          overlapStart: new Date(Math.max(newStart, existStart)).toISOString(),
          overlapEnd: new Date(Math.min(newEnd, existEnd)).toISOString(),
        };
      });
  }, [schedules, childId, startTime, endTime, excludeId]);
}
