import { useState } from 'react';
import { X } from '../Icons/Icons';
import { FACULTY_COLORS } from '../../utils/constants';
import { isUnitOffered, hasDuplicateInSemester } from '../../utils/validation';

export default function UnitSlot({ 
  unit, 
  unitIdx, 
  semester, 
  selectedUnit,
  draggedUnit,
  setDraggedUnit,
  onDrop,
  onRemoveUnit,
  onUnitClick,
  validationIssues
}) {
  const [hoveredUnit, setHoveredUnit] = useState(null);
  const [hoverTimeout, setHoverTimeout] = useState(null);

  const handleMouseEnter = (unit) => {
    const timeout = setTimeout(() => {
      setHoveredUnit(unit);
    }, 800);
    setHoverTimeout(timeout);
  };

  const handleMouseLeave = () => {
    if (hoverTimeout) clearTimeout(hoverTimeout);
    const timeout = setTimeout(() => {
      setHoveredUnit(null);
    }, 300);
    setHoverTimeout(timeout);
  };

  const handlePopupEnter = () => {
    if (hoverTimeout) clearTimeout(hoverTimeout);
  };

  const handlePopupLeave = () => {
    setHoveredUnit(null);
  };

  const handleDragStart = (e, unit) => {
    if (setDraggedUnit) {
      setDraggedUnit(unit);
    }
    onUnitClick(null);
  };

  const handleTouchStart = (e, unit) => {
    if (setDraggedUnit) setDraggedUnit(unit);
  };

  const handleTouchMove = (e) => {
    if (!draggedUnit) return;
    e.preventDefault();
  };

  const handleTouchEnd = (e) => {
    if (!draggedUnit) return;
    onDrop(semester.id, unitIdx);
  };

  const handleSlotClick = () => {
    if (selectedUnit) {
      onDrop(semester.id, unitIdx);
    }
  };

  // Calculate how many slots this unit should span
  const getUnitSpan = (unit) => {
    if (!unit || !unit.credit_points) return 1;
    const cp = unit.credit_points;
    if (cp === 0) return 1;
    return Math.round(cp / 6);
  };

  if (unit) {
    const unitSpan = getUnitSpan(unit);
    const shouldShowCP = unit.credit_points && unit.credit_points > 0;
    const hasEligibilityIssue = Array.isArray(validationIssues) && validationIssues.length > 0;
    const getShortIssueLabel = () => {
      if (!hasEligibilityIssue) return '';
      if (validationIssues.some((issue) => issue.toLowerCase().includes('prerequisite'))) {
        return '⚠️ Prerequisite not met';
      }
      if (validationIssues.some((issue) => issue.toLowerCase().includes('corequisite'))) {
        return '⚠️ Corequisite not met';
      }
      if (validationIssues.some((issue) => issue.toLowerCase().includes('prohibition'))) {
        return '⚠️ Prohibition breached';
      }
      return '⚠️ Requisites issue';
    };
    
    return (
      <div
        className={`relative border rounded-lg h-24 flex group cursor-pointer ${
          hasEligibilityIssue ? 'bg-red-50 border-red-400' : 'bg-white border-gray-200'
        }`}
        style={{ 
          gridColumn: unitSpan > 1 ? `span ${unitSpan}` : undefined,
          width: unitSpan > 1 ? '100%' : undefined
        }}
        draggable
        onDragStart={(e) => handleDragStart(e, unit)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          onDrop(semester.id, unitIdx);
        }}
        onTouchStart={(e) => handleTouchStart(e, unit)}
        onTouchMove={handleTouchMove}
        onMouseEnter={() => handleMouseEnter(unit)}
        onMouseLeave={handleMouseLeave}
        onClick={(e) => {
          e.stopPropagation();
          onUnitClick(unit);
        }}
      >
        <div
          className="w-2 rounded-l-lg mr-3 flex-shrink-0"
          style={{ backgroundColor: FACULTY_COLORS[unit.faculty] || FACULTY_COLORS["Unknown"] }}
        />
        <div className="flex-1 min-w-0 overflow-hidden pt-1 pb-1 flex flex-col">
          <div className="font-bold text-gray-800 text-sm">{unit.code}</div>
          <div className="text-xs text-gray-600 line-clamp-2 flex-1">{unit.name}</div>
          
          {/* Credit Points Display */}
          {shouldShowCP && (
            <div className="text-xs text-gray-500 mt-auto">
              {unit.credit_points} Credit points
            </div>
          )}

          {hasEligibilityIssue && (
            <div className="text-xs text-red-700 mt-1 truncate" title="Hover the unit for details">
              {getShortIssueLabel()}
            </div>
          )}
          
          {/* Warnings */}
          {!hasEligibilityIssue && hasDuplicateInSemester(semester, unit.code) ? (
            <div className="text-xs text-orange-600 mt-1">
              ⚠️ No duplicates
            </div>
          ) : !hasEligibilityIssue ? (() => {
            const semesterYear = parseInt(semester.label.split(', ')[1]);
            let dataYear = semesterYear;
            
            // If year is in the future (beyond our data)
            if (semesterYear > 2026) {
              // Check if we have ANY data at all for this unit
              const hasAnyData = 
                (unit.semesters_2020 && unit.semesters_2020.trim() !== '') ||
                (unit.semesters_2021 && unit.semesters_2021.trim() !== '') ||
                (unit.semesters_2022 && unit.semesters_2022.trim() !== '') ||
                (unit.semesters_2023 && unit.semesters_2023.trim() !== '') ||
                (unit.semesters_2024 && unit.semesters_2024.trim() !== '') ||
                (unit.semesters_2025 && unit.semesters_2025.trim() !== '') ||
                (unit.semesters_2026 && unit.semesters_2026.trim() !== '');
              
              // If we have NO data at all for any year, don't show warning (it's a new/future unit)
              if (!hasAnyData) {
                return null;
              }
              // If we have SOME data but not for this future year, show warning
              dataYear = 2026;
            } else if (semesterYear < 2020) {
              return null;
            }
            
            const semesterKey = `semesters_${dataYear}`;
            const semesterData = unit[semesterKey];
            
            if (!semesterData || semesterData.trim() === '' || semesterData.includes('Not offered')) {
              return (
                <div className="text-xs text-red-600 mt-1 truncate" title="No offering data available">
                  ⚠️ No offering
                </div>
              );
            }
            
            if (!isUnitOffered(unit, semester.semesterType, semester.label)) {
              const semType = semester.semesterType === 'Semester 1' ? 'S1' : 
                          semester.semesterType === 'Semester 2' ? 'S2' : 
                          semester.semesterType === 'Summer' ? 'Sum A/B' : 'Winter';
              return (
                <div className="text-xs text-red-600 mt-1 truncate"
                  title={`Not offered ${semester.semesterType}`}>
                  ⚠️ Not offered {semType}
                </div>
              );
            }
            
            return null;
          })() : null}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemoveUnit(semester.id, unitIdx);
          }}
          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition flex-shrink-0 text-gray-800"
        >
          <X />
        </button>
        
        {hoveredUnit && hoveredUnit._instanceId === unit._instanceId && (
          <div
            className="absolute z-50 bg-gray-800 text-white p-2 rounded shadow-lg text-xs top-full mt-1 left-0 max-w-sm whitespace-normal"
            onMouseEnter={handlePopupEnter}
            onMouseLeave={handlePopupLeave}
          >
            <a
              href={`https://handbook.monash.edu/2026/units/${unit.code}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              View in Handbook →
            </a>
            {hasEligibilityIssue && (
              <div className="mt-2 border-t border-gray-600 pt-2">
                <div className="text-red-300 font-semibold mb-1">Eligibility issues</div>
                <ul className="list-disc pl-4 space-y-1 text-gray-100">
                  {validationIssues.map((issue, idx) => (
                    <li key={`${unit._instanceId}-issue-${idx}`} className="leading-snug">
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`h-24 border-2 border-dashed rounded-lg flex items-center justify-center text-gray-400 text-xs w-full cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition ${
        selectedUnit ? 'border-blue-500' : 'border-gray-200'
      }`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={() => onDrop(semester.id, unitIdx)}
      onTouchEnd={handleTouchEnd}
      onClick={handleSlotClick}
    >
      {selectedUnit ? 'Click to place unit' : 'Drop unit here'}
    </div>
  );
}
