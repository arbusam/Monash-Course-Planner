import { useState, useEffect } from 'react';
import { MenuDots } from '../Icons/Icons';
import UnitSlot from './UnitSlot';

export default function SemesterRow({ 
  semester, 
  semIdx,
  isLastSemester,
  selectedUnit,
  draggedUnit,
  setDraggedUnit,
  contextMenuSemester,
  setContextMenuSemester,
  onDrop,
  onRemoveUnit,
  onUnitClick,
  setSemesters,
  semesters,
  unitValidationMap = {}
}) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = ('ontouchstart' in window || navigator.maxTouchPoints > 0) && window.innerWidth < 1024;
      setIsMobile(mobile);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const isPriorCredit = semester.semesterType === 'Prior Credit';
  const hasPriorCredit = semesters.some((s) => s.semesterType === 'Prior Credit');

  const resetSemester = () => {
    const newSemesters = [...semesters];
    const semIndex = newSemesters.findIndex(s => s.id === semester.id);
    
    if (semester.semesterType === 'Summer' || semester.semesterType === 'Winter') {
      newSemesters[semIndex].units = [null, null];
    } else {
      newSemesters[semIndex].units = [null, null, null, null];
    }
    
    newSemesters[semIndex].isAcademicLeave = false;
    setSemesters(newSemesters);
    setContextMenuSemester(null);
  };

  const addPriorCredit = () => {
    if (hasPriorCredit) {
      setContextMenuSemester(null);
      return;
    }

    setSemesters([
      {
        id: `prior-${Date.now()}`,
        label: 'Prior study / credit',
        semesterType: 'Prior Credit',
        units: [null, null, null, null]
      },
      ...semesters
    ]);
    setContextMenuSemester(null);
  };

  const removePriorCredit = () => {
    setSemesters(semesters.filter((s) => s.id !== semester.id));
    setContextMenuSemester(null);
  };

  const setAcademicLeave = () => {
    const newSemesters = [...semesters];
    const semIndex = newSemesters.findIndex(s => s.id === semester.id);
    newSemesters[semIndex].units = ['ACADEMIC_LEAVE'];
    newSemesters[semIndex].isAcademicLeave = true;
    setSemesters(newSemesters);
    setContextMenuSemester(null);
  };

  const removeAcademicLeave = () => {
    const newSemesters = [...semesters];
    const semIndex = newSemesters.findIndex(s => s.id === semester.id);
    newSemesters[semIndex].units = [null, null, null, null];
    newSemesters[semIndex].isAcademicLeave = false;
    setSemesters(newSemesters);
    setContextMenuSemester(null);
  };

  const addOverloadUnit = () => {
    const newSemesters = [...semesters];
    const semIndex = newSemesters.findIndex(s => s.id === semester.id);
    newSemesters[semIndex].units.push(null);
    setSemesters(newSemesters);
    setContextMenuSemester(null);
  };

  const removeOverloadUnit = () => {
    const newSemesters = [...semesters];
    const semIndex = newSemesters.findIndex(s => s.id === semester.id);
    if (newSemesters[semIndex].units.length > 4) {
      newSemesters[semIndex].units.pop();
      setSemesters(newSemesters);
    }
    setContextMenuSemester(null);
  };

  const addSummerSemester = () => {
    const newSemesters = [...semesters];
    const semIndex = newSemesters.findIndex(s => s.id === semester.id);
    const currentYear = parseInt(semester.label.split(', ')[1]);

    const newSummer = {
      id: `summer-${Date.now()}`,
      label: `Summer Semester A/B, ${currentYear}`,
      semesterType: 'Summer',
      units: [null, null]
    };

    newSemesters.splice(semIndex + 1, 0, newSummer);
    setSemesters(newSemesters);
    setContextMenuSemester(null);
  };

  const addWinterSemester = () => {
    const newSemesters = [...semesters];
    const semIndex = newSemesters.findIndex(s => s.id === semester.id);
    const currentYear = parseInt(semester.label.split(', ')[1]);

    const newWinter = {
      id: `winter-${Date.now()}`,
      label: `Winter Semester, ${currentYear}`,
      semesterType: 'Winter',
      units: [null, null]
    };

    newSemesters.splice(semIndex + 1, 0, newWinter);
    setSemesters(newSemesters);
    setContextMenuSemester(null);
  };

  const removeSummerSemester = () => {
    const newSemesters = semesters.filter(s => s.id !== semester.id);
    setSemesters(newSemesters);
    setContextMenuSemester(null);
  };

  const removeWinterSemester = () => {
    const newSemesters = semesters.filter(s => s.id !== semester.id);
    setSemesters(newSemesters);
    setContextMenuSemester(null);
  };

  const deleteSemester = () => {
    if (isLastSemester && semesters.length > 1) {
      setSemesters(semesters.slice(0, -1));
    }
    setContextMenuSemester(null);
  };

  return (
    <tr>
      <td
        className={`border border-gray-300 p-3 font-medium relative align-top semester-menu-container ${
          isPriorCredit ? 'bg-amber-50' : 'bg-gray-50'
        }`}
        style={{width: '180px'}}
      >
        <div className="flex items-center justify-between">
          <span className={isPriorCredit ? 'text-amber-900' : 'text-gray-800'}>
            {semester.label}
          </span>
          <button
            onClick={() => setContextMenuSemester(contextMenuSemester === semester.id ? null : semester.id)}
            className="text-gray-500 hover:text-gray-700 p-1"
          >
            <MenuDots />
          </button>
        </div>
        {isPriorCredit && (
          <div className="text-xs text-amber-700 mt-1 leading-snug">
            Counts as completed before Semester 1
          </div>
        )}
        
        {contextMenuSemester === semester.id && (
          <div className="absolute left-full ml-2 top-0 bg-white border border-gray-300 rounded-lg shadow-lg z-50 w-56">
            <button
              onClick={resetSemester}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-gray-700"
            >
              Reset Semester
            </button>
            {semester.semesterType === 'Semester 1' && !hasPriorCredit && (
              <button
                onClick={addPriorCredit}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-gray-700"
              >
                Add prior credit
              </button>
            )}
            {semester.semesterType === 'Semester 1' && (
              <button
                onClick={addWinterSemester}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-gray-700"
              >
                Add a winter semester
              </button>
            )}
            {semester.semesterType === 'Semester 2' && (
              <button
                onClick={addSummerSemester}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-gray-700"
              >
                Add a summer semester
              </button>
            )}
            {semester.semesterType === 'Summer' && (
              <button
                onClick={removeSummerSemester}
                className="w-full text-left px-4 py-2 hover:bg-red-100 text-red-600 text-sm border-t border-gray-200"
              >
                Remove Summer Semester
              </button>
            )}
            {semester.semesterType === 'Winter' && (
              <button
                onClick={removeWinterSemester}
                className="w-full text-left px-4 py-2 hover:bg-red-100 text-red-600 text-sm border-t border-gray-200"
              >
                Remove Winter Semester
              </button>
            )}
            {isPriorCredit && (
              <button
                onClick={removePriorCredit}
                className="w-full text-left px-4 py-2 hover:bg-red-100 text-red-600 text-sm border-t border-gray-200"
              >
                Remove Prior Credit
              </button>
            )}
            {!semester.isAcademicLeave && (
              <>
                <button
                  onClick={addOverloadUnit}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-gray-700"
                >
                  Add Overload Unit
                </button>
                {semester.units.length > 4 && (
                  <button
                    onClick={removeOverloadUnit}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-gray-700"
                  >
                    Remove Overload Unit
                  </button>
                )}
                {!isPriorCredit && (
                  <button
                    onClick={setAcademicLeave}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-gray-700 flex items-center gap-2"
                  >
                    Set as Academic Leave
                  </button>
                )}
              </>
            )}
            {semester.isAcademicLeave && (
              <button
                onClick={removeAcademicLeave}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-gray-700 flex items-center gap-2"
              >
                Remove Academic Leave
              </button>
            )}
            {isLastSemester && !isPriorCredit && (
              <button
                onClick={deleteSemester}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-gray-700 flex items-center gap-2"
              >
                Delete Semester
              </button>
            )}
          </div>
        )}
      </td>
      <td className="border border-gray-300 p-2 align-top">
        {semester.isAcademicLeave ? (
          <div className="h-24 bg-white border-2 border-yellow-500 rounded-lg flex items-center justify-center">
            <span className="text-yellow-600 font-semibold">Academic Leave</span>
          </div>
        ) : (
          <div className={isMobile ? 'grid gap-2 grid-cols-2' : 'grid gap-2 auto-cols-fr'} 
              style={isMobile ? {} : { 
                display: 'grid',
                gridTemplateColumns: `repeat(${Math.max(4, semester.units.length)}, 1fr)`,
                gap: '0.5rem'
              }}>
            {semester.units.map((unit, unitIdx) => {
              // Skip rendering if this slot is occupied by a multi-slot unit
              if (unitIdx > 0 && !unit) {
                // Check if previous slots contain a multi-credit unit that spans here
                for (let checkIdx = unitIdx - 1; checkIdx >= 0; checkIdx--) {
                  const checkUnit = semester.units[checkIdx];
                  if (checkUnit && checkUnit.credit_points) {
                    const span = Math.round(checkUnit.credit_points / 6);
                    if (checkIdx + span > unitIdx) {
                      return null; // Skip - this is occupied by the multi-credit unit
                    }
                  }
                }
              }
              
              return (
                <UnitSlot
                  key={unit?._instanceId || `empty-${unitIdx}`}
                  unit={unit}
                  unitIdx={unitIdx}
                  semester={semester}
                  selectedUnit={selectedUnit}
                  draggedUnit={draggedUnit}
                  setDraggedUnit={setDraggedUnit}
                  onDrop={onDrop}
                  onRemoveUnit={onRemoveUnit}
                  onUnitClick={onUnitClick}
                  validationIssues={unit?._instanceId ? unitValidationMap[unit._instanceId] : null}
                />
              );
            })}
          </div>
        )}
      </td>
    </tr>
  );
}