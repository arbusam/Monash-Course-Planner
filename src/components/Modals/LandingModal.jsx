export default function LandingModal({ onStartNew }) {
  return (
    <div className="min-h-screen bg-blue-600 flex items-center justify-center p-8">
      <div className="bg-white shadow-2xl p-12 max-w-2xl">
        <h1 className="text-4xl font-bold text-gray-800 mb-6">Monash Course Planner</h1>
        <div className="bg-blue-50 border-l-4 border-blue-500 p-6 mb-8">
          <h2 className="font-bold text-lg mb-3">Instructions:</h2>
          <ul className="space-y-2 text-gray-700">
            <li>• Contains 5000+ units from the Monash handbook</li>
            <li>• Drag units from the sidebar into your semester grid</li>
            <li>• Click the menu button on semesters for more options</li>
            <li>• Create multiple plans and switch between them</li>
            <li>• Your plans auto-save in your browser</li>
            <li>• Flags handbook prerequisite, corequisite, and prohibition issues</li>
            <li>• Record prior Monash units, VCE subjects, study scores, and ATAR</li>
            <li>• Always check the handbook before making final decisions</li>
          </ul>
        </div>
        <div className="flex gap-4">
          <button
            onClick={onStartNew}
            className="flex-1 bg-blue-600 text-white py-4 px-6 font-semibold hover:bg-blue-700 transition"
          >
            Start New Plan
          </button>
        </div>
      </div>
    </div>
  );
}
