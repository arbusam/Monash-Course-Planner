export const UNITS_CSV_URL = 'https://raw.githubusercontent.com/JoelK06/Monash-units/refs/heads/main/data/monash_units_complete.csv';

export const DATA_VERSION = '3';

export const REQUISITES_CACHE_VERSION = '4';
export const REQUISITES_FETCH_CONCURRENCY = 4;
export const HANDBOOK_YEAR = '2026';

export const FACULTY_COLORS = {
  "Business & Economics": "#00bcd4",
  "Engineering": "#ff9800",
  "Science": "#009688",
  "Arts": "#e91e63",
  "Medicine, Nursing & Health Sciences": "#2196f3",
  "Information Technology": "#9c27b0",
  "Law": "#795548",
  "Education": "#f06292",
  "Pharmacy & Pharmaceutical Sciences": "#8bc34a",
  "Art, Design & Architecture": "#607d8b",
  "Unknown": "#0069a7"
};

export const SCA_BAND_COSTS = {
  'SCA Band 1': 578,
  'SCA Band 2': 1164,
  'SCA Band 3': 1655,
  'SCA Band 4': 2124,
};

export const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 1 week

export const STORAGE_KEYS = {
  UNITS_DATA: 'monashUnitsData',
  CACHE_TIME: 'monashUnitsCacheTime',
  DATA_VERSION: 'monashUnitsDataVersion',
  REQUISITES_CACHE: 'monashUnitRequisitesCache',
  REQUISITES_CACHE_VERSION: 'monashUnitRequisitesCacheVersion',
  PLANS: 'monashCoursePlans',
  LAST_PLAN_ID: 'monashLastPlanId',
  DARK_MODE: 'monashDarkMode'
};
