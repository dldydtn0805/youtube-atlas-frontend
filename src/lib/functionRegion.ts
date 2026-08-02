export const DATABASE_FUNCTION_REGION = 'ap-northeast-1';

export function addDatabaseFunctionRegion(url: string) {
  const parsedUrl = new URL(url);

  if (!parsedUrl.searchParams.has('forceFunctionRegion')) {
    parsedUrl.searchParams.set('forceFunctionRegion', DATABASE_FUNCTION_REGION);
  }

  return parsedUrl.toString();
}
