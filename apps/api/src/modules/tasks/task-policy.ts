/**
 * Task rules shared by the DTOs and the service (decision 0012).
 */

/** Due days and times are read in India time: tasks have no venue of their own. */
export const TASK_TIME_ZONE = 'Asia/Kolkata';

/** The most tasks one list returns; it says when there are more. */
export const TASK_LIST_LIMIT = 200;

export const TASK_LIMITS = { title: 120, description: 2000, search: 100 } as const;
