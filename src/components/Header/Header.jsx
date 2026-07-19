import { Info, Bug } from '../Icons/Icons';
import PlanTabs from './PlanTabs';
import SettingsMenu from './SettingsMenu';

export default function Header({ 
  plans, 
  currentPlanId, 
  onSwitchPlan,
  onCreatePlan,
  onDeletePlan,
  onClearPlan,
  onRenamePlan,
  onExport,
  onImport,
  darkMode,
  onToggleDarkMode,
  onShowInfo,
  onShowPriorStudy,
  priorStudyCount,
  courseCost 
}) {
  return (
    <>
      <div className="bg-blue-600 p-4 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">Monash Course Planner</h1>
            <button
              onClick={onShowInfo}
              className="text-white hover:text-blue-100 transition border border-white/50 rounded-full p-1 hover:bg-white/10"
              title="About this project"
            >
              <Info />
            </button>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => window.open('https://github.com/JoelK06/Monash-Course-Planner/issues', '_blank')}
              className="flex items-center gap-2 border border-white/50 text-white px-3 py-1 rounded-lg hover:bg-white/10 transition text-sm"
            >
              <Bug />
              Report Bugs
            </button>
          </div>
        </div>
      </div>
      
      <div className="bg-white border-b border-gray-200 p-4 flex justify-between items-center flex-shrink-0">
        <PlanTabs
          plans={plans}
          currentPlanId={currentPlanId}
          onSwitchPlan={onSwitchPlan}
          onCreatePlan={onCreatePlan}
          onDeletePlan={onDeletePlan}
          onClearPlan={onClearPlan}
          onRenamePlan={onRenamePlan} 
        />
        
        <div className="flex items-center gap-3">
          <button
            onClick={onShowPriorStudy}
            className="flex items-center gap-2 border border-blue-600 text-blue-600 bg-white px-4 py-2 rounded-lg hover:bg-blue-50 transition"
          >
            Prior Study
            {priorStudyCount > 0 && (
              <span className="bg-blue-600 text-white rounded-full min-w-5 h-5 px-1 text-xs flex items-center justify-center">
                {priorStudyCount}
              </span>
            )}
          </button>
          <SettingsMenu
            onExport={onExport}
            onImport={onImport}
            darkMode={darkMode}
            onToggleDarkMode={onToggleDarkMode}
            courseCost={courseCost}
          />
        </div>
      </div>
    </>
  );
}