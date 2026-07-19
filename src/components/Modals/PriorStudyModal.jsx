import { useMemo, useState } from 'react';
import {
  VCE_SUBJECTS,
  VCE_SUBJECT_BY_ID,
  VCE_UNIT_CREDIT_EQUIVALENTS
} from '../../data/vceSubjects';

const emptyStudy = () => ({ monashUnitCodes: [], atar: null, vceSubjects: [] });

export default function PriorStudyModal({ initialValue, unitsData, onSave, onClose }) {
  const [draft, setDraft] = useState(() => ({
    ...emptyStudy(),
    ...initialValue,
    monashUnitCodes: [...(initialValue?.monashUnitCodes || [])],
    vceSubjects: (initialValue?.vceSubjects || []).map((item) => ({ ...item }))
  }));
  const [unitQuery, setUnitQuery] = useState('');
  const [vceQuery, setVceQuery] = useState('');

  const selectedUnits = useMemo(() => {
    const byCode = new Map(unitsData.map((unit) => [unit.code, unit]));
    return draft.monashUnitCodes.map((code) => byCode.get(code) || { code, name: 'Monash unit' });
  }, [draft.monashUnitCodes, unitsData]);

  const unitResults = useMemo(() => {
    const query = unitQuery.trim().toLowerCase();
    if (!query) return [];
    const selected = new Set(draft.monashUnitCodes);
    return unitsData
      .filter((unit) => !selected.has(unit.code) &&
        (unit.code.toLowerCase().includes(query) || unit.name.toLowerCase().includes(query)))
      .slice(0, 8);
  }, [draft.monashUnitCodes, unitQuery, unitsData]);

  const vceResults = useMemo(() => {
    const query = vceQuery.trim().toLowerCase();
    const selected = new Set(draft.vceSubjects.map((item) => item.subjectId));
    return VCE_SUBJECTS.filter((subject) =>
      !selected.has(subject.id) && (!query ||
        subject.name.toLowerCase().includes(query) ||
        subject.category.toLowerCase().includes(query))
    );
  }, [draft.vceSubjects, vceQuery]);

  const addUnit = (code) => {
    setDraft((current) => ({
      ...current,
      monashUnitCodes: [...current.monashUnitCodes, code]
    }));
    setUnitQuery('');
  };

  const addVceSubject = (subjectId) => {
    setDraft((current) => ({
      ...current,
      vceSubjects: [...current.vceSubjects, { subjectId, studyScore: null }]
    }));
    setVceQuery('');
  };

  const save = () => {
    const atar = draft.atar === '' || draft.atar == null ? null : Number(draft.atar);
    if (atar != null && (!Number.isFinite(atar) || atar < 0 || atar > 99.95)) return;
    if (draft.vceSubjects.some((item) => item.studyScore !== '' && item.studyScore != null &&
      (!Number.isInteger(Number(item.studyScore)) || Number(item.studyScore) < 0 || Number(item.studyScore) > 50))) return;
    onSave({
      monashUnitCodes: [...new Set(draft.monashUnitCodes)],
      atar,
      vceSubjects: draft.vceSubjects.map((item) => ({
        subjectId: item.subjectId,
        studyScore: item.studyScore === '' || item.studyScore == null
          ? null
          : Number(item.studyScore)
      }))
    });
  };

  const invalidAtar = draft.atar !== '' && draft.atar != null &&
    (!Number.isFinite(Number(draft.atar)) || Number(draft.atar) < 0 || Number(draft.atar) > 99.95);
  const invalidStudyScore = draft.vceSubjects.some((item) =>
    item.studyScore !== '' && item.studyScore != null &&
    (!Number.isInteger(Number(item.studyScore)) || Number(item.studyScore) < 0 || Number(item.studyScore) > 50)
  );

  return (
    <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="p-5 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Prior Study</h2>
            <p className="text-sm text-gray-600">Results completed before your course plan.</p>
          </div>
          <button onClick={onClose} className="text-2xl text-gray-500 hover:text-gray-800" aria-label="Close">×</button>
        </div>

        <div className="p-5 overflow-y-auto space-y-7">
          <section>
            <h3 className="font-semibold text-gray-800 mb-2">Monash units</h3>
            <input
              value={unitQuery}
              onChange={(event) => setUnitQuery(event.target.value)}
              placeholder="Search by unit code or name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
            {unitResults.length > 0 && (
              <div className="border border-gray-200 rounded-lg mt-1 divide-y max-h-48 overflow-y-auto">
                {unitResults.map((unit) => (
                  <button key={unit.code} onClick={() => addUnit(unit.code)}
                    className="w-full text-left px-3 py-2 hover:bg-blue-50">
                    <span className="font-medium">{unit.code}</span> — {unit.name}
                  </button>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-2 mt-3">
              {selectedUnits.map((unit) => (
                <button key={unit.code}
                  onClick={() => setDraft((current) => ({
                    ...current,
                    monashUnitCodes: current.monashUnitCodes.filter((code) => code !== unit.code)
                  }))}
                  className="bg-blue-50 text-blue-800 border border-blue-200 rounded-full px-3 py-1 text-sm"
                  title="Remove">
                  {unit.code} ×
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className="font-semibold text-gray-800 mb-2">VCE results</h3>
            <label className="block text-sm text-gray-700 mb-1" htmlFor="prior-atar">ATAR</label>
            <input id="prior-atar" type="number" min="0" max="99.95" step="0.05"
              value={draft.atar ?? ''} onChange={(event) => setDraft({ ...draft, atar: event.target.value })}
              placeholder="e.g. 95.00" className="w-40 px-3 py-2 border border-gray-300 rounded-lg mb-4" />

            <input value={vceQuery} onChange={(event) => setVceQuery(event.target.value)}
              placeholder="Search all VCE subjects" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            <div className="border border-gray-200 rounded-lg mt-1 max-h-44 overflow-y-auto divide-y">
              {vceResults.map((subject) => (
                <button key={subject.id} onClick={() => addVceSubject(subject.id)}
                  className="w-full text-left px-3 py-2 hover:bg-blue-50 flex justify-between gap-3">
                  <span>{subject.name}</span>
                  <span className="text-xs text-gray-500">{subject.category}</span>
                </button>
              ))}
            </div>

            <div className="space-y-2 mt-3">
              {draft.vceSubjects.map((item) => {
                const subject = VCE_SUBJECT_BY_ID.get(item.subjectId);
                return (
                  <div key={item.subjectId} className="flex items-center gap-3 bg-gray-50 border rounded-lg p-3">
                    <span className="flex-1 font-medium text-gray-800">
                      {subject?.name || item.subjectId}
                      {VCE_UNIT_CREDIT_EQUIVALENTS[item.subjectId] && (
                        <span className="block text-xs font-normal text-blue-700">
                          Credit: {VCE_UNIT_CREDIT_EQUIVALENTS[item.subjectId].join(' or ')}
                        </span>
                      )}
                    </span>
                    <label className="text-sm text-gray-600">Raw study score</label>
                    <input type="number" min="0" max="50" step="1" value={item.studyScore ?? ''}
                      onChange={(event) => setDraft((current) => ({
                        ...current,
                        vceSubjects: current.vceSubjects.map((entry) =>
                          entry.subjectId === item.subjectId
                            ? { ...entry, studyScore: event.target.value }
                            : entry)
                      }))}
                      className="w-20 px-2 py-1 border border-gray-300 rounded" />
                    <button onClick={() => setDraft((current) => ({
                      ...current,
                      vceSubjects: current.vceSubjects.filter((entry) => entry.subjectId !== item.subjectId)
                    }))} className="text-gray-500 hover:text-red-600" aria-label={`Remove ${subject?.name}`}>×</button>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <div className="p-5 border-t border-gray-200 flex justify-end gap-3">
          {(invalidAtar || invalidStudyScore) && (
            <span className="mr-auto text-sm text-red-600">
              Enter an ATAR from 0–99.95 and whole-number study scores from 0–50.
            </span>
          )}
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg">Cancel</button>
          <button onClick={save} disabled={invalidAtar || invalidStudyScore}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
            Save Prior Study
          </button>
        </div>
      </div>
    </div>
  );
}
