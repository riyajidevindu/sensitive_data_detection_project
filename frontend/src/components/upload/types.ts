import { DetectionOptions } from '../../services/api';
import { ProcessingResult } from '../../types/api';

export interface ProcessedItem {
  id: string;
  originalFile: File;
  originalPreviewUrl: string;
  parameters: DetectionOptions;
  result: ProcessingResult;
  isReprocessing: boolean;
  cacheBust: number;
}
