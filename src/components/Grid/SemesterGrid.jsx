import { useState, useEffect } from 'react';
import { Plus } from '../Icons/Icons';
import SemesterRow from './SemesterRow';

export default function SemesterGrid({ 
  semesters, 
  setSemesters, 
  selectedUnit, 
  draggedUnit,
  setDraggedUnit,
  onUnitClick,
  unitsData,
  unitValidationMap = {},
  mapIssues = []
}) {
  const [contextMenuSemester, setContextMenuSemester] = useState(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (contextMenuSemester && !e.target.closest('.semester-menu-container')) {
        setContextMenuSemester(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [contextMenuSemester]);

  const addSemester = () => {
    const lastSem = semesters[semesters.length - 1];
    const lastYear = parseInt(lastSem.label.split(', ')[1]);
    const isS1 = lastSem.semesterType === 'Semester 1';
    const newYear = isS1 ? lastYear : lastYear + 1;
    const newSemType = isS1 ? 'Semester 2' : 'Semester 1';
    
    setSemesters([...semesters, {
      id: `${newSemType.toLowerCase().replace(' ', '')}-${Date.now()}`,
      label: `${newSemType}, ${newYear}`,
      semesterType: newSemType,
      units: [null, null, null, null]
    }]);
  };

  const handleDrop = (semesterId, unitIndex) => {
    const unitToPlace = draggedUnit || selectedUnit;
    if (!unitToPlace) return;
                
    const newSemesters = [...semesters];
    const semIndex = newSemesters.findIndex(s => s.id === semesterId);
    
    const creditPoints = unitToPlace.credit_points || 6;
    const slotsNeeded = Math.round(creditPoints / 6);

    const totalSlots = newSemesters[semIndex].units.length;
    if (unitIndex + slotsNeeded > totalSlots) {
      unitIndex = Math.max(0, totalSlots - slotsNeeded);
    }

    const isFromGrid = unitToPlace._instanceId !== undefined;
    
    if (isFromGrid) {
      let fromSemIndex = -1;
      let fromUnitIndex = -1;
      let fromSlotsUsed = 1;
      
      for (let i = 0; i < newSemesters.length; i++) {
        const foundIndex = newSemesters[i].units.findIndex(u => 
          u && u._instanceId === unitToPlace._instanceId
        );
        if (foundIndex !== -1) {
          fromSemIndex = i;
          fromUnitIndex = foundIndex;
          fromSlotsUsed = Math.round((newSemesters[i].units[foundIndex].credit_points || 6) / 6);
          break;
        }
      }
      
      if (fromSemIndex === semIndex && fromUnitIndex === unitIndex) {
        if (setDraggedUnit) setDraggedUnit(null);
        return;
      }
      
      const displacedUnits = [];
      for (let i = 0; i < slotsNeeded && unitIndex + i < newSemesters[semIndex].units.length; i++) {
        const targetSlot = newSemesters[semIndex].units[unitIndex + i];
        if (targetSlot && targetSlot._instanceId !== unitToPlace._instanceId) {
          displacedUnits.push(targetSlot);
        }
      }
      
      const sourceUnits = [];
      if (fromSemIndex !== -1) {
        for (let i = 0; i < fromSlotsUsed && fromUnitIndex + i < newSemesters[fromSemIndex].units.length; i++) {
          sourceUnits.push(newSemesters[fromSemIndex].units[fromUnitIndex + i]);
        }
      }

      if (fromSemIndex !== -1) {
        for (let i = 0; i < fromSlotsUsed && fromUnitIndex + i < newSemesters[fromSemIndex].units.length; i++) {
          newSemesters[fromSemIndex].units[fromUnitIndex + i] = null;
        }
      }

      for (let i = 0; i < slotsNeeded && unitIndex + i < newSemesters[semIndex].units.length; i++) {
        newSemesters[semIndex].units[unitIndex + i] = null;
      }

      newSemesters[semIndex].units[unitIndex] = unitToPlace;
      for (let i = 1; i < slotsNeeded && unitIndex + i < newSemesters[semIndex].units.length; i++) {
        newSemesters[semIndex].units[unitIndex + i] = null;
      }

      let displacedIdx = 0;
      if (fromSemIndex !== -1) {
        for (let i = 0; i < fromSlotsUsed && fromUnitIndex + i < newSemesters[fromSemIndex].units.length; i++) {
          if (displacedIdx < displacedUnits.length) {
            newSemesters[fromSemIndex].units[fromUnitIndex + i] = displacedUnits[displacedIdx];
            const unitSlots = Math.round((displacedUnits[displacedIdx].credit_points || 6) / 6);
            for (let j = 1; j < unitSlots && fromUnitIndex + i + j < newSemesters[fromSemIndex].units.length; j++) {
              newSemesters[fromSemIndex].units[fromUnitIndex + i + j] = null;
              i++;
            }
            displacedIdx++;
          }
        }
      }
    } else {
      for (let i = 0; i < slotsNeeded && unitIndex + i < newSemesters[semIndex].units.length; i++) {
        newSemesters[semIndex].units[unitIndex + i] = null;
      }
      
      const newUnit = { ...unitToPlace, _instanceId: Date.now() + Math.random() };
      newSemesters[semIndex].units[unitIndex] = newUnit;
    }
    
    setSemesters(newSemesters);
    onUnitClick(null);
    if (setDraggedUnit) setDraggedUnit(null);
  };

  const removeUnit = (semesterId, unitIndex) => {
    const newSemesters = [...semesters];
    const semIndex = newSemesters.findIndex(s => s.id === semesterId);
    newSemesters[semIndex].units[unitIndex] = null;
    setSemesters(newSemesters);
  };

  return (
    <div className="flex-1 overflow-auto p-8 relative">
      {mapIssues.length > 0 && (
        <div className="mb-4 border border-red-300 bg-red-50 p-4 rounded-lg">
          <div className="font-semibold text-red-700">
            This map is not valid yet ({mapIssues.length} unit{mapIssues.length > 1 ? 's' : ''} with requisites issues)
          </div>
          <div className="text-sm text-red-700 mt-1">
            Units with prerequisite/corequisite/prohibition breaches are marked in red.
          </div>
        </div>
      )}
      <div className="bg-white shadow-lg overflow-hidden">
        <table className="w-full border-collapse" style={{ minWidth: '900px' }}>
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 p-3 text-left font-semibold text-gray-800" style={{width: '180px'}}>
                Semester
              </th>
              <th className="border border-gray-300 p-3 text-center font-semibold text-gray-800">
                Units
              </th>
            </tr>
          </thead>
          <tbody>
            {semesters.map((semester, semIdx) => (
              <SemesterRow
                key={semester.id}
                semester={semester}
                semIdx={semIdx}
                isLastSemester={semIdx === semesters.length - 1}
                selectedUnit={selectedUnit}
                draggedUnit={draggedUnit}
                setDraggedUnit={setDraggedUnit}
                contextMenuSemester={contextMenuSemester}
                setContextMenuSemester={setContextMenuSemester}
                onDrop={handleDrop}
                onRemoveUnit={removeUnit}
                onUnitClick={onUnitClick}
                setSemesters={setSemesters}
                semesters={semesters}
                unitValidationMap={unitValidationMap}
              />
            ))}    
          </tbody>
        </table>
        
        <div className="p-4 bg-gray-50 border-t border-gray-300 flex justify-center">
          <button
            onClick={addSemester}
            className="flex items-center gap-2 border border-gray-300 text-gray-700 bg-white px-6 py-3 rounded-lg hover:bg-gray-50 transition font-medium"
          >
            <Plus />
            Add Semester
          </button>
        </div>
      </div>
    </div>
  );
}