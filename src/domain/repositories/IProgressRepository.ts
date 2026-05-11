import type { Progress } from '../../types';

export interface IProgressRepository {
  load(): Promise<Progress>;
  save(progress: Progress): Promise<void>;
  reset(): Promise<void>;
}