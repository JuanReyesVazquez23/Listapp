import { randomUUID } from 'expo-crypto';

export type IdGenerator = () => string;

export const generateId: IdGenerator = () => randomUUID();
