export interface Region {
  id: 'refA' | 'refB' | 'test' | 'control';
  label: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  width: number; // percentage 0-100
  height: number; // percentage 0-100
  color?: string;
}

export interface AnalysisResult {
  reference_A: {
    value: number;
  };
  reference_B: {
    value: number;
  };
  lighting_normalization: {
    method: string;
    notes: string;
  };
  pct_to_A: number;
  pct_to_B: number;
  estimated_value: number;
  luminosity: {
    value: number;
    unit: string;
    description: string;
  };
  explanation: string;
}

export interface HistoryItem {
  id: number;
  timestamp: string;
  title: string;
  image: string;
  regions: Region[];
  valueA: number;
  valueB: number;
  result: AnalysisResult;
}
