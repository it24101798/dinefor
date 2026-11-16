export const meals = [
  ['lunch','Lunch'], ['dinner','Dinner'], ['high-tea','High Tea'], ['breakfast','Breakfast'],
  ['brunch','Brunch'], ['seafood','Seafood'], ['bbq','BBQ'], ['weekend-buffet','Weekend Buffet'],
];
export const cities = ['Colombo','Galle','Kandy','Negombo','Bentota'];
export const filters = ['query','location','meal','minPrice','maxPrice','minRating','diet','amenities','date','guests','sort'];
export const mealKey = value => String(value || '').toLowerCase().trim().replace(/\s+/g,'-');
export const mealLabel = value => meals.find(([key]) => key === mealKey(value))?.[1] || value;
export const money = value => `LKR ${Number(value).toLocaleString('en-LK', { maximumFractionDigits: 2 })}`;

export function readFilters(params) {
  const values = Object.fromEntries(filters.map(key => [key, params.get(key) || '']));
  values.location ||= params.get('area') || '';
  values.minRating ||= params.get('rating') || '';
  values.meal = mealKey(values.meal);
  return values;
}
export function searchParamsFor(values) {
  return new URLSearchParams(filters.filter(key => values[key]).map(key => [key, values[key]]));
}
