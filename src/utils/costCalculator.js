import { SCA_BAND_COSTS } from './constants';

export const calculateCourseCost = (semesters) => {
  let totalCost = 0;
  
  semesters.forEach(semester => {
    if (semester.isAcademicLeave) return;
    if (semester.semesterType === 'Prior Credit') return;
    
    semester.units.forEach(unit => {
      if (!unit || unit === 'ACADEMIC_LEAVE') return;
      
      const creditPoints = unit.credit_points || 6;
      const creditMultiplier = creditPoints / 6;

      let scaBand = unit.sca_band || '';
      
      if (typeof scaBand === 'string') {
        scaBand = scaBand.replace(/['"]/g, '').trim();
      }
      
      const bandCost = SCA_BAND_COSTS[scaBand] || 0;
      totalCost += bandCost * creditMultiplier;
    });
  });
  
  return totalCost;
};