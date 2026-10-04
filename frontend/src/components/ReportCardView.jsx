import { formatDate, termLabel, ordinalSuffixClient } from '../utils/format';

// The official printable report card — shared by staff (publish/preview) and
// the parent portal. Expects a `report` payload shaped like:
// { school, term: { name, academicYear, endDate, vacationDate, nextTermBegins },
//   student: { firstName, otherNames, lastName, admissionNo, currentClass },
//   reportCard: { ...snapshot incl. subjects JSON, remarks, attendance } }
const ReportCardView = ({ report }) => {
  const rc = report.reportCard;
  const s = report.student;
  const school = report.school || {};
  const term = report.term || {};

  return (
    <div className="text-sm">
      <div className="border-b-2 border-slate-800 pb-3 text-center">
        <h1 className="text-lg font-bold uppercase">{school.name}</h1>
        {school.motto && <p className="text-xs italic text-slate-500">"{school.motto}"</p>}
        <p className="text-xs text-slate-500">
          {[school.address, school.city, school.region].filter(Boolean).join(', ')}
          {school.phone ? ` · ${school.phone}` : ''}
        </p>
        <h2 className="mt-2 font-semibold uppercase tracking-wide">Terminal Report Card — {termLabel(term.name)} ({term.academicYear})</h2>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 border-b pb-3 text-xs">
        <p><span className="text-slate-500">Name:</span> <span className="font-semibold">{s.firstName} {s.otherNames || ''} {s.lastName}</span></p>
        <p><span className="text-slate-500">Admission №:</span> {s.admissionNo}</p>
        <p><span className="text-slate-500">Class:</span> {s.currentClass?.name || '—'}</p>
        <p><span className="text-slate-500">Position in class:</span> <span className="font-semibold">{rc.classPosition ? ordinalSuffixClient(rc.classPosition) : '—'}</span></p>
        <p><span className="text-slate-500">Attendance:</span> {rc.daysPresent} days present out of {rc.daysOpened}</p>
        <p><span className="text-slate-500">Vacation:</span> {formatDate(term.vacationDate || term.endDate)}</p>
        <p><span className="text-slate-500">Next term begins:</span> {formatDate(term.nextTermBegins)}</p>
      </div>

      <table className="mt-3 w-full border-collapse text-xs">
        <thead>
          <tr className="bg-slate-100">
            <th className="border border-slate-300 px-2 py-1.5 text-left">Subject</th>
            <th className="border border-slate-300 px-2 py-1.5 text-center">Total (100%)</th>
            <th className="border border-slate-300 px-2 py-1.5 text-center">Grade</th>
            <th className="border border-slate-300 px-2 py-1.5 text-center">Position</th>
            <th className="border border-slate-300 px-2 py-1.5 text-left">Remark</th>
          </tr>
        </thead>
        <tbody>
          {rc.subjects.map((sub) => (
            <tr key={sub.subjectId}>
              <td className="border border-slate-300 px-2 py-1.5">{sub.subject}</td>
              <td className="border border-slate-300 px-2 py-1.5 text-center">{sub.total ?? '—'}</td>
              <td className="border border-slate-300 px-2 py-1.5 text-center font-semibold">{sub.grade ?? '—'}</td>
              <td className="border border-slate-300 px-2 py-1.5 text-center">{sub.position ? ordinalSuffixClient(sub.position) : '—'}</td>
              <td className="border border-slate-300 px-2 py-1.5">{sub.remark ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
        <p className="border border-slate-300 px-2 py-1.5"><span className="text-slate-500">Total score:</span> <span className="font-semibold">{rc.totalScore}</span></p>
        <p className="border border-slate-300 px-2 py-1.5"><span className="text-slate-500">Average:</span> <span className="font-semibold">{rc.average}%</span></p>
        <p className="border border-slate-300 px-2 py-1.5"><span className="text-slate-500">Promoted:</span> {rc.promoted === true ? 'Yes' : rc.promoted === false ? 'No' : '—'}</p>
      </div>

      <div className="mt-3 space-y-2 text-xs">
        <p><span className="font-medium">Conduct:</span> {rc.conduct || '—'}</p>
        <p><span className="font-medium">Interest:</span> {rc.interest || '—'} &nbsp; <span className="font-medium">Talent:</span> {rc.talent || '—'}</p>
        <p className="min-h-8 rounded border border-slate-300 p-2"><span className="font-medium">Class teacher's remarks:</span> {rc.teacherRemark || '—'}</p>
        <p className="min-h-8 rounded border border-slate-300 p-2"><span className="font-medium">Headteacher's remarks:</span> {rc.headRemark || '—'}</p>
      </div>

      <div className="mt-6 flex justify-between text-xs text-slate-500">
        <div>
          <div className="h-10 w-40 border-b border-slate-400" />
          <p className="mt-1">Class Teacher</p>
        </div>
        <div>
          <div className="h-10 w-40 border-b border-slate-400" />
          <p className="mt-1">Headteacher & Stamp</p>
        </div>
      </div>
      <p className="mt-3 text-center text-[10px] text-slate-400">
        Published {formatDate(rc.publishedAt)}{school.gesRegNumber ? ` · ${school.gesRegNumber}` : ''}
      </p>
    </div>
  );
};

export default ReportCardView;
