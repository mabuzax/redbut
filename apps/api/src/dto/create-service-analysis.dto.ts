import { IsString, IsOptional, IsObject, IsEnum, IsInt, Min, Max } from 'class-validator';

export enum HappinessLevel {
  EXTREMELY_HAPPY = 'Extremely Happy',
  VERY_HAPPY = 'Very Happy',
  JUST_OK = 'Just Ok',
  UNHAPPY = 'Unhappy',
  HORRIBLE = 'Horrible'
}

// Utility function to convert happiness level to numeric rating
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

export class CreateServiceAnalysisDto {
  @IsEnum(HappinessLevel)
  happiness: HappinessLevel;

  @IsString()
  reason: string;

  @IsString()
  suggested_improvement: string;

  @IsString()
  @IsOptional()
  overall_sentiment?: string;
}

export class ServiceAnalysisRequestDto {
  @IsString()
  sessionId: string;

  @IsString()
  userId: string;

  @IsString()
  @IsOptional()
  waiterId?: string;

  @IsString()
  serviceType: string; // 'request' or 'order'

  @IsObject()
  analysis: CreateServiceAnalysisDto;
}
