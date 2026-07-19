import { useState, useEffect, useMemo, useRef } from 'react';
import { useUnitsData } from './hooks/useUnitsData';
import { useDarkMode } from './hooks/useDarkMode';
import { Loader } from './components/Icons/Icons';
import LandingModal from './components/Modals/LandingModal';
import SetupModal from './components/Modals/SetupModal';
import InfoModal from './components/Modals/InfoModal';
import PriorStudyModal from './components/Modals/PriorStudyModal';
import Sidebar from './components/Sidebar/Sidebar';
import Header from './components/Header/Header';
import SemesterGrid from './components/Grid/SemesterGrid';
import {
  REQUISITES_CACHE_VERSION,
  REQUISITES_FETCH_CONCURRENCY,
  STORAGE_KEYS
} from './utils/constants';
import { calculateCourseCost } from './utils/costCalculator';
import {
  describeRequisite,
  evaluateRequisite,
  getPriorStudyUnitCodes
} from './utils/requisites';

function App() {
  const { unitsData, loading, error } = useUnitsData();
  const { darkMode, toggleDarkMode } = useDarkMode();
  const [showLanding, setShowLanding] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showPriorStudyModal, setShowPriorStudyModal] = useState(false);
  const [plans, setPlans] = useState([]);
  const [currentPlanId, setCurrentPlanId] = useState(null);
  const [startYear, setStartYear] = useState(2025);
  const [degreeLength, setDegreeLength] = useState(4);
  const [semesters, setSemesters] = useState([]);
  const [priorStudy, setPriorStudy] = useState({
    monashUnitCodes: [],
    atar: null,
    vceSubjects: []
  });
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [draggedUnit, setDraggedUnit] = useState(null);
  const [courseCost, setCourseCost] = useState(0);
  const [requisitesByCode, setRequisitesByCode] = useState({});
  const [requisitesCacheReady, setRequisitesCacheReady] = useState(false);
  const requisitesFetchInFlight = useRef(new Set());

  const saveRequisitesCache = (cache) => {
    try {
      localStorage.setItem(STORAGE_KEYS.REQUISITES_CACHE, JSON.stringify(cache));
      localStorage.setItem(STORAGE_KEYS.REQUISITES_CACHE_VERSION, REQUISITES_CACHE_VERSION);
    } catch (cacheError) {
      console.error('Error saving requisites cache:', cacheError);
    }
  };

  const fetchUnitRequisites = async (unitCode) => {
    const response = await fetch(`/api/requisites?code=${encodeURIComponent(unitCode)}`);
    if (!response.ok) {
      throw new Error(`Failed to load requisites for ${unitCode} (${response.status})`);
    }
    const data = await response.json();
    return Array.isArray(data.rules) ? data.rules : [];
  };

  // Save to localStorage whenever semesters change
  useEffect(() => {
    if (semesters.length > 0 && currentPlanId && plans.length > 0) {
      const updatedPlans = plans.map(p => 
        p.id === currentPlanId 
          ? { ...p, semesters, startYear, degreeLength, priorStudy }
          : p
      );
      savePlans(updatedPlans, currentPlanId);
    }
  }, [semesters, priorStudy]);

  // Load saved plans when units data is ready
  useEffect(() => {
    if (unitsData.length === 0) return;
    
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PLANS);
      if (saved) {
        const allPlans = JSON.parse(saved);
        
        // Refresh unit data for all plans
        const refreshedPlans = allPlans.map(plan => ({
          ...plan,
          semesters: plan.semesters.map(sem => ({
            ...sem,
            units: sem.units.map(unit => {
              if (!unit || unit === 'ACADEMIC_LEAVE') return unit;
              // Find fresh unit data
              const freshUnit = unitsData.find(u => u.code === unit.code);
              if (freshUnit) {
                return { ...freshUnit, _instanceId: unit._instanceId || Date.now() + Math.random() };
              }
              return unit;
            })
          }))
        }));
        
        setPlans(refreshedPlans);
        
        if (refreshedPlans.length > 0) {
          const lastPlanId = localStorage.getItem(STORAGE_KEYS.LAST_PLAN_ID);
          const planToLoad = refreshedPlans.find(p => p.id === lastPlanId) || refreshedPlans[0];
          setCurrentPlanId(planToLoad.id);
          loadPlan(planToLoad);
          setShowLanding(false);
        }
      }
    } catch (error) {
      console.error('Error loading saved plans:', error);
      localStorage.removeItem(STORAGE_KEYS.PLANS);
    }
  }, [unitsData]);

  useEffect(() => {
    const cost = calculateCourseCost(semesters);
    setCourseCost(cost);
  }, [semesters]);

  useEffect(() => {
    const cacheVersion = localStorage.getItem(STORAGE_KEYS.REQUISITES_CACHE_VERSION);
    const cachedRequisites = localStorage.getItem(STORAGE_KEYS.REQUISITES_CACHE);

    if (cacheVersion !== REQUISITES_CACHE_VERSION) {
      localStorage.removeItem(STORAGE_KEYS.REQUISITES_CACHE);
      localStorage.setItem(STORAGE_KEYS.REQUISITES_CACHE_VERSION, REQUISITES_CACHE_VERSION);
      setRequisitesByCode({});
      setRequisitesCacheReady(true);
      return;
    }

    if (cachedRequisites) {
      try {
        setRequisitesByCode(JSON.parse(cachedRequisites));
      } catch (cacheError) {
        console.error('Error parsing requisites cache:', cacheError);
        localStorage.removeItem(STORAGE_KEYS.REQUISITES_CACHE);
      }
    }

    setRequisitesCacheReady(true);
  }, []);

  useEffect(() => {
    if (!requisitesCacheReady) {
      return;
    }

    const unitCodes = [];
    const seen = new Set();
    semesters.forEach((semester) => {
      semester.units.forEach((unit) => {
        if (unit && unit !== 'ACADEMIC_LEAVE' && unit.code) {
          const code = unit.code.toUpperCase();
          if (!seen.has(code)) {
            seen.add(code);
            unitCodes.push(code);
          }
        }
      });
    });

    const pendingCodes = unitCodes.filter((unitCode) => {
      const cached = requisitesByCode[unitCode];
      return !(
        cached?.status === 'loaded' ||
        cached?.status === 'error' ||
        cached?.status === 'loading' ||
        requisitesFetchInFlight.current.has(unitCode)
      );
    });

    if (pendingCodes.length === 0) {
      return;
    }

    let active = 0;
    let nextIndex = 0;

    const startNext = () => {
      while (active < REQUISITES_FETCH_CONCURRENCY && nextIndex < pendingCodes.length) {
        const unitCode = pendingCodes[nextIndex];
        nextIndex += 1;
        active += 1;
        requisitesFetchInFlight.current.add(unitCode);

        setRequisitesByCode((prev) => ({
          ...prev,
          [unitCode]: { status: 'loading', rules: [], loadedAt: Date.now() }
        }));

        fetchUnitRequisites(unitCode)
          .then((rules) => {
            setRequisitesByCode((prev) => {
              const updated = {
                ...prev,
                [unitCode]: {
                  status: 'loaded',
                  rules,
                  loadedAt: Date.now()
                }
              };
              saveRequisitesCache(updated);
              return updated;
            });
          })
          .catch((fetchError) => {
            console.error(`Error loading requisites for ${unitCode}:`, fetchError);
            setRequisitesByCode((prev) => {
              const updated = {
                ...prev,
                [unitCode]: {
                  status: 'error',
                  rules: [],
                  error: fetchError.message,
                  loadedAt: Date.now()
                }
              };
              saveRequisitesCache(updated);
              return updated;
            });
          })
          .finally(() => {
            requisitesFetchInFlight.current.delete(unitCode);
            active -= 1;
            startNext();
          });
      }
    };

    startNext();
  }, [semesters, requisitesByCode, requisitesCacheReady]);

  const unitValidationMap = useMemo(() => {
    const validation = {};
    const allPlacedCodes = getPriorStudyUnitCodes(priorStudy);

    semesters.forEach((semester) => {
      semester.units.forEach((unit) => {
        if (unit && unit !== 'ACADEMIC_LEAVE' && unit.code) {
          allPlacedCodes.add(unit.code.toUpperCase());
        }
      });
    });

    const completedCodes = getPriorStudyUnitCodes(priorStudy);
    semesters.forEach((semester) => {
      const semesterCodes = new Set();
      const seenInstanceIds = new Set();

      semester.units.forEach((unit) => {
        if (!unit || unit === 'ACADEMIC_LEAVE' || !unit._instanceId || seenInstanceIds.has(unit._instanceId)) {
          return;
        }

        seenInstanceIds.add(unit._instanceId);
        const unitCode = unit.code?.toUpperCase();
        if (!unitCode) {
          return;
        }

        semesterCodes.add(unitCode);

        const unitRequisites = requisitesByCode[unitCode];
        if (!unitRequisites || unitRequisites.status !== 'loaded') {
          return;
        }

        const issues = [];
        unitRequisites.rules.forEach((rule) => {
          const ruleType = (rule.type || '').toLowerCase();

          if (ruleType.includes('prereq')) {
            const prerequisiteMet = evaluateRequisite(rule, {
              completedCodes,
              atar: priorStudy.atar,
              vceSubjects: priorStudy.vceSubjects
            });
            if (!prerequisiteMet) {
              const unitList = describeRequisite(rule);
              issues.push(
                unitList
                  ? `Prerequisite not met. Requires: ${unitList}`
                  : 'Prerequisite not met.'
              );
            }
          }

          if (ruleType.includes('coreq')) {
            const corequisiteMet = evaluateRequisite(
              rule,
              {
                completedCodes: new Set([...completedCodes, ...semesterCodes]),
                atar: priorStudy.atar,
                vceSubjects: priorStudy.vceSubjects
              }
            );
            if (!corequisiteMet) {
              const unitList = describeRequisite(rule);
              issues.push(
                unitList
                  ? `Corequisite not met. Requires with/after: ${unitList}`
                  : 'Corequisite not met.'
              );
            }
          }

          if (ruleType.includes('prohibit')) {
            const otherTakenCodes = new Set(
              [...allPlacedCodes].filter((code) => code !== unitCode)
            );
            const prohibitionBreached = evaluateRequisite(rule, {
              completedCodes: otherTakenCodes,
              atar: priorStudy.atar,
              vceSubjects: priorStudy.vceSubjects
            });
            if (prohibitionBreached) {
              const conflictingCodes = (rule.unitCodes || []).filter((code) =>
                otherTakenCodes.has(code)
              );
              const conflictText = conflictingCodes.slice(0, 8).join(', ') ||
                describeRequisite(rule);
              issues.push(
                conflictText
                  ? `Prohibition breached with: ${conflictText}`
                  : 'Prohibition breached.'
              );
            }
          }
        });

        if (issues.length > 0) {
          validation[unit._instanceId] = issues;
        }
      });

      semesterCodes.forEach((code) => completedCodes.add(code));
    });

    return validation;
  }, [semesters, requisitesByCode, priorStudy]);

  const mapIssues = useMemo(() => {
    const issues = [];
    semesters.forEach((semester) => {
      const seenInstanceIds = new Set();
      semester.units.forEach((unit) => {
        if (!unit || unit === 'ACADEMIC_LEAVE' || !unit._instanceId || seenInstanceIds.has(unit._instanceId)) {
          return;
        }
        seenInstanceIds.add(unit._instanceId);
        const unitIssues = unitValidationMap[unit._instanceId];
        if (unitIssues && unitIssues.length > 0) {
          issues.push({
            code: unit.code,
            semester: semester.label,
            messages: unitIssues
          });
        }
      });
    });
    return issues;
  }, [semesters, unitValidationMap]);

  const loadPlan = (plan) => {
    const validSemesters = plan.semesters.map(sem => ({
      ...sem,
      units: Array.isArray(sem.units) ? sem.units : [null, null, null, null]
    }));
    setStartYear(plan.startYear);
    setDegreeLength(plan.degreeLength);
    setSemesters(validSemesters);
    setPriorStudy({
      monashUnitCodes: plan.priorStudy?.monashUnitCodes || [],
      atar: plan.priorStudy?.atar ?? null,
      vceSubjects: plan.priorStudy?.vceSubjects || []
    });
  };

  const savePlans = (updatedPlans, planId) => {
    setPlans(updatedPlans);
    localStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(updatedPlans));
    localStorage.setItem(STORAGE_KEYS.LAST_PLAN_ID, planId);
  };

  const handleStartNew = () => {
    setShowLanding(false);
    setShowSetup(true);
  };

  const handleSetupComplete = () => {
    const newSemesters = [];
    for (let year = 0; year < degreeLength; year++) {
      newSemesters.push({
        id: `s1-${year}`,
        label: `Semester 1, ${startYear + year}`,
        semesterType: 'Semester 1',
        units: [null, null, null, null]
      });
      newSemesters.push({
        id: `s2-${year}`,
        label: `Semester 2, ${startYear + year}`,
        semesterType: 'Semester 2',
        units: [null, null, null, null]
      });
    }
    
    const newPlan = {
      id: 'plan-' + Date.now(),
      name: `Plan ${plans.length + 1}`,
      startYear,
      degreeLength,
      semesters: newSemesters,
      priorStudy: { monashUnitCodes: [], atar: null, vceSubjects: [] }
    };
    
    const updatedPlans = [...plans, newPlan];
    savePlans(updatedPlans, newPlan.id);
    setCurrentPlanId(newPlan.id);
    setSemesters(newSemesters);
    setPriorStudy(newPlan.priorStudy);
    setShowSetup(false);
  };

  const renamePlan = (planId, newName) => {
    if (!newName.trim()) return;
    
    const updatedPlans = plans.map(p => 
      p.id === planId ? { ...p, name: newName.trim() } : p
    );
    savePlans(updatedPlans, currentPlanId);
  };

  const createNewPlan = () => {
    const yearInput = prompt('Enter start year for new plan:', '2025');
    if (yearInput === null) return; 
    
    const newStartYear = parseInt(yearInput);
    if (isNaN(newStartYear) || newStartYear < 2000 || newStartYear > 2100) {
      alert('Please enter a valid year between 2000 and 2100');
      return;
    }
    
    const lengthInput = prompt('Enter degree length in years:', '4');
    if (lengthInput === null) return; 
    
    const newDegreeLength = parseInt(lengthInput);
    if (isNaN(newDegreeLength) || newDegreeLength < 1 || newDegreeLength > 12) {
      alert('Please enter a valid degree length between 1 and 12 years');
      return;
    }
    
    const newPlan = {
      id: 'plan-' + Date.now(),
      name: `Plan ${plans.length + 1}`,
      startYear: newStartYear,
      degreeLength: newDegreeLength,
      semesters: [],
      priorStudy: { monashUnitCodes: [], atar: null, vceSubjects: [] }
    };
    
    const newSemesters = [];
    for (let year = 0; year < newDegreeLength; year++) {
      newSemesters.push({
        id: `s1-${year}`,
        label: `Semester 1, ${newStartYear + year}`,
        semesterType: 'Semester 1',
        units: [null, null, null, null]
      });
      newSemesters.push({
        id: `s2-${year}`,
        label: `Semester 2, ${newStartYear + year}`,
        semesterType: 'Semester 2',
        units: [null, null, null, null]
      });
    }
    newPlan.semesters = newSemesters;
    const updatedPlans = [...plans, newPlan];
    savePlans(updatedPlans, newPlan.id);
    setCurrentPlanId(newPlan.id);
    loadPlan(newPlan);
  };

  const switchPlan = (planId) => {
    const plan = plans.find(p => p.id === planId);
    if (plan) {
      setCurrentPlanId(planId);
      loadPlan(plan);
      localStorage.setItem(STORAGE_KEYS.LAST_PLAN_ID, planId);
    }
  };

  const deletePlan = (planId) => {
    const planToDelete = plans.find(p => p.id === planId);
    const planName = planToDelete?.name || 'this plan';
    
    if (!confirm(`Are you sure you want to delete "${planName}"? This action cannot be undone.`)) {
      return;
    }
    
    if (plans.length === 1) {
      setPlans([]);
      setSemesters([]);
      setCurrentPlanId(null);
      setShowLanding(true);
      localStorage.removeItem(STORAGE_KEYS.PLANS);
      localStorage.removeItem(STORAGE_KEYS.LAST_PLAN_ID);
    } else {
      const updatedPlans = plans.filter(p => p.id !== planId);
      const newCurrentPlan = currentPlanId === planId ? updatedPlans[0] : plans.find(p => p.id === currentPlanId);
      savePlans(updatedPlans, newCurrentPlan.id);
      if (currentPlanId === planId) {
        setCurrentPlanId(newCurrentPlan.id);
        loadPlan(newCurrentPlan);
      }
    }
  };

  const clearPlan = (planId) => {
    if (confirm('Clear all units from this plan? This cannot be undone.')) {
      const plan = plans.find(p => p.id === planId);
      if (plan) {
        const clearedSemesters = plan.semesters.map(sem => ({
          ...sem,
          units: sem.semesterType === 'Summer' || sem.semesterType === 'Winter' 
            ? [null, null] 
            : [null, null, null, null]
        }));
        
        const updatedPlans = plans.map(p => 
          p.id === planId ? { ...p, semesters: clearedSemesters } : p
        );
        savePlans(updatedPlans, currentPlanId);
        
        if (planId === currentPlanId) {
          setSemesters(clearedSemesters);
        }
      }
    }
  };

  const exportPlan = () => {
    const currentPlan = plans.find(p => p.id === currentPlanId);
    const dataStr = JSON.stringify({ 
      startYear, 
      degreeLength, 
      semesters,
      priorStudy,
      name: currentPlan?.name || 'Course Plan'
    }, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `monash-${currentPlan?.name.toLowerCase().replace(/\s+/g, '-')}-${startYear}.json`;
    link.click();
  };

  const importPlan = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          
          const fileName = file.name.replace('.json', '').replace(/[-_]/g, ' ');
          const planName = data.name || fileName || `Imported Plan`;
          
          const newPlan = {
            id: 'plan-' + Date.now(),
            name: planName,
            startYear: data.startYear || 2025,
            degreeLength: data.degreeLength || 4,
            semesters: data.semesters || [],
            priorStudy: data.priorStudy || { monashUnitCodes: [], atar: null, vceSubjects: [] }
          };
          
          // Refresh unit data from current unitsData
          const validSemesters = newPlan.semesters.map(sem => ({
            ...sem,
            units: Array.isArray(sem.units) 
              ? sem.units.map(unit => {
                  if (!unit || unit === 'ACADEMIC_LEAVE') return unit;
                  // Find the fresh unit data
                  const freshUnit = unitsData.find(u => u.code === unit.code);
                  if (freshUnit) {
                    return { ...freshUnit, _instanceId: Date.now() + Math.random() };
                  }
                  return unit;
                })
              : [null, null, null, null],
            isAcademicLeave: sem.isAcademicLeave || false
          }));
          newPlan.semesters = validSemesters;
          
          const updatedPlans = [...plans, newPlan];
          savePlans(updatedPlans, newPlan.id);
          setCurrentPlanId(newPlan.id);
          setStartYear(newPlan.startYear);
          setDegreeLength(newPlan.degreeLength);
          setSemesters(validSemesters);
          setPriorStudy(newPlan.priorStudy);
          
        } catch (error) {
          console.error('Error importing plan:', error);
          alert('Failed to import plan. Please make sure it\'s a valid course plan file.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-blue-600 flex items-center justify-center">
        <div className="bg-white shadow-2xl p-12 text-center">
          <div className="mx-auto mb-4"><Loader /></div>
          <h2 className="text-2xl font-bold text-gray-800">Loading Monash Units...</h2>
          <p className="text-gray-600 mt-2">Fetching 5000+ units from database</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-red-600 flex items-center justify-center p-8">
        <div className="bg-white shadow-2xl p-12 max-w-md text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error Loading Data</h2>
          <p className="text-gray-700">{error}</p>
        </div>
      </div>
    );
  }

  if (showLanding) {
    return (
      <LandingModal 
        onStartNew={handleStartNew}
      />
    );
  }

  if (showSetup) {
    return (
      <SetupModal
        startYear={startYear}
        setStartYear={setStartYear}
        degreeLength={degreeLength}
        setDegreeLength={setDegreeLength}
        onComplete={handleSetupComplete}
      />
    );
  }

  return (
    <div className={`flex h-screen ${darkMode ? 'dark' : ''}`}>
      <Sidebar
        unitsData={unitsData}
        selectedFaculty={selectedFaculty}
        setSelectedFaculty={setSelectedFaculty}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedUnit={selectedUnit}
        onUnitClick={setSelectedUnit}
        onDragStart={setDraggedUnit}
      />
      
      <div className="flex-1 flex flex-col bg-gray-50">
        <Header
          plans={plans}
          currentPlanId={currentPlanId}
          onSwitchPlan={switchPlan}
          onCreatePlan={createNewPlan}
          onDeletePlan={deletePlan}
          onClearPlan={clearPlan}
          onRenamePlan={renamePlan}
          onExport={exportPlan}
          onImport={importPlan}
          darkMode={darkMode}
          onToggleDarkMode={toggleDarkMode}
          onShowInfo={() => setShowInfoModal(true)}
          onShowPriorStudy={() => setShowPriorStudyModal(true)}
          priorStudyCount={
            priorStudy.monashUnitCodes.length +
            priorStudy.vceSubjects.length +
            (priorStudy.atar == null ? 0 : 1)
          }
          courseCost={courseCost}
        />
        
        <SemesterGrid
          semesters={semesters}
          setSemesters={setSemesters}
          selectedUnit={selectedUnit}
          draggedUnit={draggedUnit}
          setDraggedUnit={setDraggedUnit}
          onUnitClick={setSelectedUnit}
          unitsData={unitsData}
          unitValidationMap={unitValidationMap}
          mapIssues={mapIssues}
        />
      </div>

      {showInfoModal && <InfoModal onClose={() => setShowInfoModal(false)} />}
      {showPriorStudyModal && (
        <PriorStudyModal
          initialValue={priorStudy}
          unitsData={unitsData}
          onClose={() => setShowPriorStudyModal(false)}
          onSave={(value) => {
            setPriorStudy(value);
            setShowPriorStudyModal(false);
          }}
        />
      )}
    </div>
  );
}

export default App;