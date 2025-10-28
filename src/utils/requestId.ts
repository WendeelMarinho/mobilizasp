// src/utils/requestId.ts

import { randomUUID } from 'crypto';

export function generateRequestId(): string {
  return randomUUID();
}

