import { useEffect, useState } from "react";
import axiosClient from "../../api/axiosClient";
import DashboardLayout from "../../components/layout/DashboardLayout";
import {
  ScanFace, CheckCircle2, XCircle, Clock, RefreshCcw,
  User, Hash, Layers, Calendar, X, AlertCircle, Check,
  ZoomIn, ChevronDown,
} from "lucide-react";

// ── Toast ─────────────────────────────────────────────────────────────────────
const Toast = ({ message, type = "success", onClose }) => (
  <div className="fixed bottom-5 right-5 z-[100] flex items-center gap-3 rounded-xl border border-white/10 bg-[#0c1120] px-4 py-3 shadow-xl">
    <div className={`flex h-6 w-6 items-center justify-center rounded-full ${type === "success" ? "bg-green-500/20" : "bg-red-500/20"}`}>
      {type === "success" ? <Check className="h-3.5 w-3.5 text-green-400" /> : <AlertCircle className="h-3.5 w-3.5 text-red-400" />}
    </div>
    <p className="text-sm text-white">{message}</p>
    <button onClick={onClose} className="ml-2 text-white/40 hover:text-white"><X className="h-4 w-4" /></button>
  </div>
);

// ── Image Lightbox ─────────────────────────────────────────────────────────────
const Lightbox = ({ src, onClose }) => {
  if (!src) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
         style={{ background: "rgba(0,0,0,0.92)" }}
         onClick={onClose}>
      <button className="absolute top-4 right-4 text-white/50 hover:text-white transition">
        <X className="h-6 w-6" />
      </button>
      <img src={src} alt="Face submission"
           className="max-h-[85vh] max-w-[85vw] rounded-2xl object-contain shadow-2xl"
           onClick={e => e.stopPropagation()} />
    </div>
  );
};

// ── Reject Reason Modal ────────────────────────────────────────────────────────
const RejectModal = ({ open, onClose, onConfirm, loading }) => {
  const [reason, setReason] = useState("");
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.80)" }}>
      <div className="w-full max-w-sm rounded-2xl border border-red-500/20 bg-[#0c1120] p-6 shadow-2xl">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-500/15 mb-4">
          <XCircle className="h-5 w-5 text-red-400" />
        </div>
        <h3 className="text-base font-semibold text-white">Reject Request</h3>
        <p className="mt-1 text-sm text-white/50">Optionally tell the student why the photo was rejected.</p>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="e.g. Face not clearly visible, sunglasses, poor lighting..."
          rows={3}
          className="mt-4 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-white/25 focus:outline-none resize-none"
        />
        <div className="mt-4 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-lg border border-white/10 px-4 py-2 text-sm text-white/60 hover:bg-white/[0.05] transition">Cancel</button>
          <button onClick={() => onConfirm(reason)} disabled={loading}
                  className="flex-1 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-400 disabled:opacity-50 transition">
            {loading ? "Rejecting..." : "Reject"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Status badge ──────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const map = {
    PENDING:  { icon: Clock,        color: "text-amber-300",  bg: "bg-amber-500/10",  border: "border-amber-500/25",  label: "Pending" },
    APPROVED: { icon: CheckCircle2, color: "text-green-300",  bg: "bg-green-500/10",  border: "border-green-500/25",  label: "Approved" },
    REJECTED: { icon: XCircle,      color: "text-red-300",    bg: "bg-red-500/10",    border: "border-red-500/25",    label: "Rejected" },
  };
  const s = map[status] || map.PENDING;
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${s.color} ${s.bg} ${s.border}`}>
      <Icon className="h-3 w-3" /> {s.label}
    </span>
  );
};

// ── Main ──────────────────────────────────────────────────────────────────────
const FaceRequestsPage = () => {
  const [requests,      setRequests]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [filter,        setFilter]        = useState("PENDING");
  const [lightboxSrc,   setLightboxSrc]   = useState(null);
  const [rejectTarget,  setRejectTarget]  = useState(null); // request id
  const [actionLoading, setActionLoading] = useState(null); // request id being acted on
  const [toast,         setToast]         = useState(null);
  const [expanded,      setExpanded]      = useState({}); // { [id]: bool }

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get(`admin/face-requests/?status=${filter}`);
      setRequests(res.data.requests || []);
    } catch {
      showToast("Failed to load requests", "error");
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchRequests(); }, [filter]);

  const handleApprove = async (id) => {
    setActionLoading(id);
    try {
      await axiosClient.post(`admin/face-requests/${id}/approve/`);
      showToast("Face registered and request approved!", "success");
      fetchRequests();
    } catch (e) {
      showToast(e.response?.data?.error || "Approval failed.", "error");
    } finally { setActionLoading(null); }
  };

  const handleReject = async (reason) => {
    if (!rejectTarget) return;
    setActionLoading(rejectTarget);
    try {
      await axiosClient.post(`admin/face-requests/${rejectTarget}/reject/`, { reason });
      showToast("Request rejected and student notified.", "success");
      setRejectTarget(null);
      fetchRequests();
    } catch (e) {
      showToast(e.response?.data?.error || "Rejection failed.", "error");
    } finally { setActionLoading(null); }
  };

  const toggleExpand = (id) => setExpanded(p => ({ ...p, [id]: !p[id] }));

  const filterTabs = [
    { key: "PENDING",  label: "Pending",  color: "text-amber-300" },
    { key: "APPROVED", label: "Approved", color: "text-green-300" },
    { key: "REJECTED", label: "Rejected", color: "text-red-300"   },
    { key: "",         label: "All",      color: "text-white/60"  },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="page-header">
          <div>
            <p className="label">Admin / Users</p>
            <h1 className="page-title mt-1">Face Registration Requests</h1>
            <p className="page-sub">Review student face photos before they're added to the recognition system.</p>
          </div>
          <button onClick={fetchRequests} className="btn-ghost gap-1.5 flex items-center">
            <RefreshCcw className="h-4 w-4" /> Refresh
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex rounded-[var(--radius)] p-1" style={{ border: "1px solid var(--border)", background: "var(--surface)", width: "fit-content" }}>
          {filterTabs.map(({ key, label }) => (
            <button key={key} onClick={() => setFilter(key)}
                    className={`rounded-[var(--radius-sm)] px-4 py-1.5 text-xs font-medium transition ${filter === key ? "bg-[var(--text-1)] text-[var(--bg)]" : "text-[var(--text-3)] hover:text-[var(--text-2)]"}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-28 rounded-[var(--radius-lg)]" />)}</div>
        ) : requests.length === 0 ? (
          <div className="empty-state">
            <ScanFace className="h-8 w-8" style={{ color: "var(--text-3)" }} />
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--text-1)" }}>
                No {filter.toLowerCase() || ""} requests
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>
                Students will appear here when they submit a face photo.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map(req => {
              const isExpanded = !!expanded[req.id];
              const isActing   = actionLoading === req.id;

              return (
                <div key={req.id} className="rounded-[var(--radius-lg)] border overflow-hidden transition"
                     style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>

                  {/* Main row */}
                  <div className="flex items-center gap-4 px-5 py-4">

                    {/* Photo thumbnail */}
                    <div
                      className="relative h-16 w-16 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-white/10 bg-black group"
                      onClick={() => setLightboxSrc(req.image_url)}
                    >
                      {req.image_url ? (
                        <>
                          <img src={req.image_url} alt="Face" className="h-full w-full object-cover" />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition">
                            <ZoomIn className="h-5 w-5 text-white" />
                          </div>
                        </>
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <ScanFace className="h-6 w-6 text-white/20" />
                        </div>
                      )}
                    </div>

                    {/* Student info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-white">{req.student.full_name}</p>
                        <StatusBadge status={req.status} />
                      </div>
                      <div className="mt-1 flex items-center gap-3 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-white/40">
                          <Hash className="h-3 w-3" /> {req.student.student_id}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-white/40">
                          <Layers className="h-3 w-3" /> {req.student.filiere || "N/A"} S{req.student.semester}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-white/40">
                          <Calendar className="h-3 w-3" />
                          {new Date(req.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      {req.status === "REJECTED" && req.reject_reason && (
                        <p className="mt-1 text-xs text-red-400/80">Reason: {req.reject_reason}</p>
                      )}
                      {req.status !== "PENDING" && req.reviewed_by && (
                        <p className="mt-0.5 text-xs text-white/30">Reviewed by @{req.reviewed_by}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {req.status === "PENDING" && (
                        <>
                          <button
                            onClick={() => setRejectTarget(req.id)}
                            disabled={isActing}
                            className="flex items-center gap-1.5 rounded-lg border border-red-500/25 bg-red-500/8 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/15 disabled:opacity-40 transition"
                          >
                            <XCircle className="h-3.5 w-3.5" /> Reject
                          </button>
                          <button
                            onClick={() => handleApprove(req.id)}
                            disabled={isActing}
                            className="flex items-center gap-1.5 rounded-lg bg-green-500 px-3 py-2 text-xs font-semibold text-white hover:bg-green-400 disabled:opacity-50 transition"
                          >
                            {isActing ? (
                              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            )}
                            Approve
                          </button>
                        </>
                      )}

                      {/* Expand toggle to see full image */}
                      <button onClick={() => toggleExpand(req.id)}
                              className="rounded-lg border border-white/10 p-2 text-white/40 hover:text-white hover:bg-white/[0.05] transition">
                        <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      </button>
                    </div>
                  </div>

                  {/* Expanded photo view */}
                  {isExpanded && (
                    <div className="border-t border-white/8 bg-white/[0.015] px-5 py-5">
                      <p className="mb-3 text-xs font-medium uppercase tracking-wider text-white/30">Submitted Photo</p>
                      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
                        {req.image_url ? (
                          <div className="group relative cursor-pointer overflow-hidden rounded-xl border border-white/10"
                               style={{ maxWidth: "260px" }}
                               onClick={() => setLightboxSrc(req.image_url)}>
                            <img src={req.image_url} alt="Face submission" className="w-full object-cover" />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition">
                              <ZoomIn className="h-6 w-6 text-white" />
                            </div>
                          </div>
                        ) : (
                          <div className="flex h-36 w-36 items-center justify-center rounded-xl border border-white/10 bg-white/[0.02]">
                            <ScanFace className="h-8 w-8 text-white/15" />
                          </div>
                        )}
                        {/* Student detail card */}
                        <div className="flex-1 space-y-2">
                          {[
                            { icon: User,     label: "Full Name",  value: req.student.full_name },
                            { icon: Hash,     label: "Student ID", value: req.student.student_id },
                            { icon: User,     label: "Username",   value: `@${req.student.username}` },
                            { icon: Layers,   label: "Programme",  value: `${req.student.filiere || "N/A"} — Semester ${req.student.semester}` },
                          ].map(({ icon: Icon, label, value }) => (
                            <div key={label} className="flex items-center gap-3 rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2">
                              <Icon className="h-3.5 w-3.5 text-white/30 shrink-0" />
                              <div>
                                <p className="text-[10px] text-white/30 uppercase tracking-wide">{label}</p>
                                <p className="text-sm text-white/80">{value}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <RejectModal
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        onConfirm={handleReject}
        loading={!!actionLoading}
      />
      <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </DashboardLayout>
  );
};

export default FaceRequestsPage;
