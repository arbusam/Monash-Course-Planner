import { Bug } from '../Icons/Icons';

export default function InfoModal({ onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-2xl font-bold text-gray-800">About Monash Course Planner</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>
          <div className="text-gray-700 space-y-4">
            <p>
              This project was born due to the official Mon Planner being outdated and not 
              including new units (The combination of Mech Aero and Mechatronic engineering units). 
              It was first developed as an excel spreadsheet using lookup tables then later 
              developed into this git hub page where it is free for anyone to use.
            </p>
            <p>
              The hope is that it may help make someone's course planning just a little easier.
              It checks unit-code prerequisites, corequisites, and prohibitions from the handbook
              for units in your plan, and flags offering/semester mismatches. Credit-point totals,
              course-level rules, and permission-based enrolment are not fully validated — always
              confirm against the official handbook before enrolling.
            </p>
            <p>Thank you for using my program!</p>
            <p className="font-semibold">Created by Joel Knight</p>
          </div>
          <div className="mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={() => {
                window.open('https://github.com/JoelK06/Monash-Course-Planner/issues', '_blank');
                onClose();
              }}
              className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition w-full justify-center"
            >
              <Bug />
              Report Bugs on GitHub
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
