export enum HappinessLevel {
  EXTREMELY_HAPPY = 'Extremely Happy',
  VERY_HAPPY = 'Very Happy',
  JUST_OK = 'Just Ok',
  UNHAPPY = 'Unhappy',
  HORRIBLE = 'Horrible'
}

// Utility function to convert happiness level to numeric rating (1-5)
export function happinessToRating(happiness: HappinessLevel): number {
  switch (happiness) {
    case HappinessLevel.EXTREMELY_HAPPY:
      return 5;
    case HappinessLevel.VERY_HAPPY:
      return 4;
    case HappinessLevel.JUST_OK:
      return 3;
    case HappinessLevel.UNHAPPY:
      return 2;
    case HappinessLevel.HORRIBLE:
      return 1;
    default:
      return 3; // Default to neutral
  }
}

export interface ServiceAnalysisData {
  happiness: HappinessLevel;
  reason: string;
  suggested_improvement: string;
  overall_sentiment?: string;
}

export interface ServiceAnalysisRequest {
  sessionId: string;
  userId: string;
  waiterId?: string;
  analysis: ServiceAnalysisData;
}
