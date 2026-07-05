import React, { useEffect, useState } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { adminService } from '../../services/portalService';
import toast from 'react-hot-toast';
import {
  IoCheckmarkCircleOutline,
  IoCloseCircleOutline,
  IoTimeOutline,
  IoLayersOutline,
  IoPersonOutline,
  IoRefreshOutline,
  IoEyeOutline,
} from 'react-icons/io5';

const AdminApprovals = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [rejectReasonMap, setRejectReasonMap] = useState({});
  const [showRejectForm, setShowRejectForm] = useState(null);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const res = await adminService.getPendingCourses();
      if (res.data?.data?.courses) setCourses(res.data.data.courses);
    } catch (err) {
      toast.error('Failed to load pending courses.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPending(); }, []);

  const handleApprove = async (id) => {
    setActionId(id);
    try {
      await adminService.approveCourse(id);
      toast.success('Course approved and published!');
      setCourses((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Approval failed.');
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (id) => {
    const reason = rejectReasonMap[id] || '';
    setActionId(id);
    try {
      await adminService.rejectCourse(id, reason);
      toast.success('Course rejected.');
      setCourses((prev) => prev.filter((c) => c.id !== id));
      setShowRejectForm(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Rejection failed.');
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-primary-900">Course Approvals</h1>
          <p className="text-sm text-slate-500 mt-1">
            Review instructor-submitted courses and edit requests. Approve to publish, or reject with feedback.
          </p>
        </div>
        <button
          onClick={fetchPending}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-100 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-600 transition-all cursor-pointer"
        >
          <IoRefreshOutline size={14} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-white border border-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <Card hover={false} className="bg-white border border-slate-100 p-16 text-center">
          <IoCheckmarkCircleOutline size={48} className="mx-auto mb-3 text-emerald-300" />
          <h3 className="text-base font-bold text-slate-700">All clear!</h3>
          <p className="text-sm text-slate-400 mt-1">No courses are pending approval right now.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {courses.map((course) => (
            <Card key={course.id} hover={false} className="bg-white border border-slate-100 p-6 rounded-2xl space-y-4">
              <div className="flex items-start gap-4">
                {/* Thumbnail */}
                <div className="shrink-0">
                  {course.thumbnail ? (
                    <img
                      src={`http://localhost:5000${course.thumbnail}`}
                      alt={course.title}
                      className="h-16 w-24 object-cover rounded-xl border border-slate-100"
                    />
                  ) : (
                    <div className="h-16 w-24 bg-primary-50 rounded-xl flex items-center justify-center">
                      <IoLayersOutline size={24} className="text-primary-300" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-heading font-bold text-slate-900 leading-tight">{course.title}</h3>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{course.shortDescription || course.description}</p>
                    </div>
                    <span className="shrink-0 flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full">
                      <IoTimeOutline size={12} /> Pending
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-3 mt-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <IoPersonOutline size={13} />
                      <strong className="text-slate-700">{course.instructor?.name}</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <IoLayersOutline size={13} />
                      {course._count?.modules} modules
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-50 border border-slate-100 font-semibold">{course.level}</span>
                    <span className="px-2 py-0.5 rounded-full bg-primary-50 border border-primary-100 text-primary-700 font-semibold">
                      {course.category?.name}
                    </span>
                    {course.pendingEdits && (
                      <span className="px-2 py-0.5 rounded-full bg-violet-50 border border-violet-100 text-violet-700 font-semibold">
                        Edit Request
                      </span>
                    )}
                  </div>

                  {course.pendingEdits && (
                    <div className="mt-3 p-3 bg-violet-50 border border-violet-100 rounded-xl text-xs">
                      <p className="font-bold text-violet-700 mb-1">Proposed Edits:</p>
                      <ul className="space-y-0.5 text-violet-600">
                        {Object.entries(course.pendingEdits).map(([k, v]) => (
                          <li key={k}><span className="font-semibold">{k}:</span> {String(v).substring(0, 100)}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Reject Reason Form */}
              {showRejectForm === course.id && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl space-y-2">
                  <label className="text-xs font-bold text-red-700 uppercase tracking-wider">Rejection Reason (optional)</label>
                  <textarea
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border border-red-100 focus:outline-none focus:border-red-300 text-xs resize-none bg-white"
                    placeholder="Provide feedback to the instructor..."
                    value={rejectReasonMap[course.id] || ''}
                    onChange={(e) => setRejectReasonMap((prev) => ({ ...prev, [course.id]: e.target.value }))}
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2 border-t border-slate-50">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleApprove(course.id)}
                  disabled={actionId === course.id}
                  className="flex items-center gap-1.5"
                >
                  <IoCheckmarkCircleOutline size={16} />
                  {actionId === course.id ? 'Processing...' : 'Approve & Publish'}
                </Button>

                {showRejectForm === course.id ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleReject(course.id)}
                    disabled={actionId === course.id}
                    className="flex items-center gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <IoCloseCircleOutline size={16} />
                    Confirm Reject
                  </Button>
                ) : (
                  <button
                    onClick={() => setShowRejectForm(course.id)}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-red-500 hover:text-red-700 border border-red-100 hover:border-red-200 rounded-xl hover:bg-red-50 transition-all cursor-pointer"
                  >
                    <IoCloseCircleOutline size={14} />
                    Reject
                  </button>
                )}

                {showRejectForm === course.id && (
                  <button
                    onClick={() => setShowRejectForm(null)}
                    className="text-xs text-slate-400 hover:text-slate-600 ml-auto cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminApprovals;
