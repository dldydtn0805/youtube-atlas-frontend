import { describe, expect, it } from 'vitest';
import {
  addDatabaseFunctionRegion,
  DATABASE_FUNCTION_REGION,
} from './functionRegion';

describe('addDatabaseFunctionRegion', () => {
  it('routes database-backed Edge Functions to the database region', () => {
    expect(
      addDatabaseFunctionRegion(
        'https://project.supabase.co/functions/v1/api/trending/top-videos?regionCode=KR',
      ),
    ).toBe(
      `https://project.supabase.co/functions/v1/api/trending/top-videos?regionCode=KR&forceFunctionRegion=${DATABASE_FUNCTION_REGION}`,
    );
  });

  it('preserves an explicitly selected function region', () => {
    expect(
      addDatabaseFunctionRegion(
        'https://project.supabase.co/functions/v1/api/health?forceFunctionRegion=ap-northeast-2',
      ),
    ).toContain('forceFunctionRegion=ap-northeast-2');
  });
});
