import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { getErrorMessage } from '../utils/api';
import { PageHeader, EmptyState } from '../components/ui';
import { formatDate, termLabel, ordinalSuffixClient } from '../utils/format';
import { useAuth } from '../context/AuthContext';

const ReportCards = () => {
  const { can } = useAuth();
  const [classId, setClassId] = useState('');
  const [termId, setTermId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [locked, setLocked] = useState(false);
  const queryClient = useQueryClient();
  const [publishMsg, setPublishMsg] = useState('');

  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get('/academic/classes').then((r) => r.data),
  });
  const { data: termsData } = useQuery({
    queryKey: ['terms'],
    queryFn: () => api.get('/academic/terms').then((r) => r.data),
  });

  const { data: results } = useQuery({
    queryKey: ['results', classId, termId],
    queryFn: () => api.get('/assessments/results', { params: { classId, termId } }).then((r) => r.data),
    enabled: !!classId && !!termId,
  });

  const publish = useMutation({
    mutationFn: () => api.post('/reports/publish', { classId: Number(classId), termId: Number(termId) }),
    onSuccess: (res) => {
      setPublishMsg(res.data.message);
      queryClient.invalidateQueries({ queryKey: ['reports', classId, termId] });
      setTimeout(() => setPublishMsg(''), 4000);
    },
  });

  const lock = useMutation({
    mutationFn: (lockIt) =>
      api.post('/reports/lock', { classId: Number(classId), termId: Number(termId), locked: lockIt }),
    onSuccess: (res) => {
      setLocked(!!res.config.data && JSON.parse(res.config.data).locked);
      setPublishMsg(res.data.message);
      setTimeout(() => setPublishMsg(''), 5000);
    },
  });

  const { data: report } = useQuery({
    queryKey: ['report', studentId, termId],
    queryFn: () => api.get(`/reports/student/${studentId}`, { params: { termId } }).then((r) => r.data),
    enabled: !!studentId && !!termId,
  });

  const classes = classesData?.classes || [];

  return (
    <div>
      <div className="no-print">
        <PageHeader
          title="Report cards"
          subtitle="Preview computed results, then publish to freeze official report cards"
        actions={
          can('reports.publish') && classId && termId && (
            <div className="flex gap-2">
              <button className="btn-secondary" onClick={() => lock.mutate(!locked)} disabled={lock.isPending}>
                {lock.isPending ? 'Working…' : locked ? 'Unlock results' : 'Lock results'}
              </button>
              <button className="btn-primary" onClick={() => publish.mutate()} disabled={publish.isPending}>
                {publish.isPending ? 'Publishing…' : 'Publish class reports'}
              </button>
            </div>
          )
        }
        />
        {publishMsg && <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{publishMsg}</p>}
        {publish.isError && <p className="mb-4 text-sm text-red-600">{getErrorMessage(publish.error)}</p>}

        <div className="mb-4 flex flex-wrap gap-3">
          <select className="input max-w-48" value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">Select class…</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="input max-w-40" value={termId} onChange={(e) => setTermId(e.target.value)}>
            <option value="">Select term…</option>
            {(termsData?.terms || []).map((t) => (
              <option key={t.id} value={t.id}>{t.name.replace('TERM_', 'Term ')}</option>
            ))}
          </select>
          {results && (
            <select className="input max-w-56" value={studentId} onChange={(e) => setStudentId(Number(e.target.value))}>
              <option value="">Select pupil to preview…</option>
              {results.students.map((s) => (
                <option key={s.studentId} value={s.studentId}>
                  {s.positionLabel ? `${s.positionLabel} — ` : ''}{s.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {!classId || !termId ? (
          <EmptyState message="Choose a class and term to see computed results" />
        ) : null}
      </div>

      {report?.reportCard && (
        <div className="print-area card mx-auto max-w-3xl p-8">
          <ReportCardView report={report} />
          <div className="no-print mt-6 text-center">
            <button className="btn-primary" onClick={() => window.print()}>Print report card</button>
          </div>
        </div>
      )}

      {!report && classId && termId && results && (
        <div className="no-print card overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="th">Pos</th>
                <th className="th">Pupil</th>
                <th className="th">Subjects</th>
                <th className="th">Total</th>
                <th className="th">Average</th>
                <th className="th">Attendance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {results.students.map((s) => (
                <tr
                  key={s.studentId}
                  className={`cursor-pointer hover:bg-slate-50 ${studentId === s.studentId ? 'bg-brand-50' : ''}`}
                  onClick={() => setStudentId(s.studentId)}
                >
                  <td className="td font-semibold">{s.positionLabel || '—'}</td>
                  <td className="td">{s.name}</td>
                  <td className="td">{s.subjectsExamined}</td>
                  <td className="td">{s.totalScore || '—'}</td>
                  <td className="td font-medium">{s.average ?? '—'}</td>
                  <td className="td text-slate-500">{s.daysPresent}/{s.daysOpened}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

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

export default ReportCards;
