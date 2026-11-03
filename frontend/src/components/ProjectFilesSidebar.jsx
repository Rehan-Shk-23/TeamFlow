import { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Download,
  RefreshCw,
  Trash2,
  FileText,
  FileArchive,
  FileCode,
  Image as ImageIcon,
  File,
  Loader2,
  Clock,
  User,
  AlertCircle,
  CheckCircle2,
  FolderOpen,
  Plus,
  Shield,
  ChevronDown,
  ChevronUp,
  History,
} from 'lucide-react';

function getFileIcon(type, filename = '') {
  const ext = (type || filename.split('.').pop() || '').toLowerCase();
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) {
    return <ImageIcon className="w-4 h-4 text-emerald-500" />;
  }
  if (['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(ext)) {
    return <FileText className="w-4 h-4 text-indigo-500" />;
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return <FileArchive className="w-4 h-4 text-amber-500" />;
  }
  if (['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'html', 'css', 'json', 'sql'].includes(ext)) {
    return <FileCode className="w-4 h-4 text-cyan-500" />;
  }
  return <File className="w-4 h-4 text-slate-500" />;
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDateTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function ProjectFilesSidebar({
  projectId,
  files = [],
  loading = false,
  onRefresh,
  currentUserId,
  canDelete = false,
}) {
  const [activeTab, setActiveTab] = useState('files'); // 'files' | 'activity'
  const [activities, setActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [showAllActivities, setShowAllActivities] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [reuploadingId, setReuploadingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [targetReuploadFile, setTargetReuploadFile] = useState(null);

  const fileInputRef = useRef(null);
  const reuploadInputRef = useRef(null);

  // Fetch audit log of who uploaded or updated files
  const fetchActivities = async () => {
    if (!projectId) return;
    setActivitiesLoading(true);
    try {
      const res = await fetch(`http://127.0.0.1:5000/api/projects/${projectId}/file-activities`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setActivities(data);
      }
    } catch (err) {
      console.error('Error fetching file activities:', err);
    } finally {
      setActivitiesLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [projectId, files]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !projectId || !currentUserId) return;

    setUploading(true);
    setErrorMessage('');
    setSuccessMessage('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('user_id', currentUserId);

    try {
      const res = await fetch(`http://127.0.0.1:5000/api/projects/${projectId}/files`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMessage(`"${file.name}" uploaded!`);
        if (onRefresh) onRefresh();
        fetchActivities();
        setTimeout(() => setSuccessMessage(''), 3500);
      } else {
        setErrorMessage(data.error || 'Failed to upload.');
      }
    } catch {
      setErrorMessage('Network error while uploading.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const triggerReupload = (fileObj) => {
    setTargetReuploadFile(fileObj);
    if (reuploadInputRef.current) {
      reuploadInputRef.current.value = '';
      reuploadInputRef.current.click();
    }
  };

  const handleReuploadSubmit = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !targetReuploadFile || !currentUserId) return;

    setReuploadingId(targetReuploadFile.id);
    setErrorMessage('');
    setSuccessMessage('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('user_id', currentUserId);

    try {
      const res = await fetch(
        `http://127.0.0.1:5000/api/projects/${projectId}/files/${targetReuploadFile.id}/reupload`,
        {
          method: 'POST',
          body: formData,
        }
      );
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMessage(`Updated to v${data.file.version}!`);
        if (onRefresh) onRefresh();
        fetchActivities();
        setTimeout(() => setSuccessMessage(''), 3500);
      } else {
        setErrorMessage(data.error || 'Failed to update file.');
      }
    } catch {
      setErrorMessage('Network error while updating file.');
    } finally {
      setReuploadingId(null);
      setTargetReuploadFile(null);
      if (reuploadInputRef.current) reuploadInputRef.current.value = '';
    }
  };

  const handleDelete = async (fileId, fileName) => {
    if (!canDelete) {
      alert('Only faculty and team leads can delete project files.');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete "${fileName}"?`)) return;

    try {
      const res = await fetch(
        `http://127.0.0.1:5000/api/files/${fileId}?requested_by=${currentUserId}`,
        {
          method: 'DELETE',
        }
      );
      const data = await res.json();
      if (res.ok) {
        setSuccessMessage(`"${fileName}" deleted.`);
        if (onRefresh) onRefresh();
        fetchActivities();
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrorMessage(data.error || 'Failed to delete file.');
      }
    } catch {
      setErrorMessage('Network error while deleting file.');
    }
  };

  // Limit activities to top 5 unless "showAllActivities" is toggled
  const displayedActivities = showAllActivities ? activities : activities.slice(0, 5);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 flex flex-col h-full">
      {/* Hidden file inputs */}
      <input type="file" ref={fileInputRef} onChange={handleUpload} className="hidden" />
      <input type="file" ref={reuploadInputRef} onChange={handleReuploadSubmit} className="hidden" />

      {/* Header with Title and Upload Button */}
      <div className="flex items-center justify-between gap-2 pb-3 mb-2 border-b border-slate-100">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <FolderOpen className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5 truncate">
              <span>Project Files</span>
              <span className="text-[11px] font-bold px-1.5 py-0.2 rounded-full bg-indigo-50 text-indigo-700 shrink-0">
                {files.length}
              </span>
            </h3>
            <p className="text-[10px] text-slate-400 truncate">Shared resources & docs</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-2xs active:scale-95 disabled:opacity-60 transition-all shrink-0 cursor-pointer"
          title="Upload new project file"
        >
          {uploading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <>
              <Plus className="w-3.5 h-3.5" />
              <span>Upload</span>
            </>
          )}
        </button>
      </div>

      {/* Tabs: Files vs Activity History */}
      <div className="flex items-center gap-1 p-1 bg-slate-100/80 rounded-xl mb-3">
        <button
          type="button"
          onClick={() => setActiveTab('files')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'files'
              ? 'bg-white text-indigo-700 shadow-2xs'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <FolderOpen className="w-3.5 h-3.5" />
          <span>Files ({files.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('activity')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'activity'
              ? 'bg-white text-indigo-700 shadow-2xs'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Activity Log ({activities.length})</span>
        </button>
      </div>

      {/* Alerts */}
      {errorMessage && (
        <div className="mb-3 p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[11px] flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{errorMessage}</span>
        </div>
      )}
      {successMessage && (
        <div className="mb-3 p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{successMessage}</span>
        </div>
      )}

      {/* TAB 1: FILES LIST */}
      {activeTab === 'files' && (
        <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[580px] pr-0.5">
          {loading && files.length === 0 ? (
            <div className="py-12 text-center text-slate-400 flex flex-col items-center">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mb-1.5" />
              <p className="text-[11px]">Loading files...</p>
            </div>
          ) : files.length === 0 ? (
            <div className="border border-dashed border-slate-200 rounded-xl p-6 text-center bg-slate-50/50 my-2">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto mb-2">
                <Upload className="w-4 h-4" />
              </div>
              <p className="font-semibold text-slate-800 text-xs">No files yet</p>
              <p className="text-[10px] text-slate-400 mt-0.5 mb-2.5">
                Upload requirement specs, datasets, or code files for this project.
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold text-indigo-600 bg-white border border-indigo-200 hover:bg-indigo-50 transition-all cursor-pointer"
              >
                <Upload className="w-3 h-3" />
                <span>Choose File</span>
              </button>
            </div>
          ) : (
            files.map((file) => {
              const isReuploading = reuploadingId === file.id;

              return (
                <div
                  key={file.id}
                  className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/40 hover:bg-white hover:border-slate-300 hover:shadow-2xs transition-all group"
                >
                  {/* File Name & Badges */}
                  <div className="flex items-start gap-2.5 justify-between">
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                        {getFileIcon(file.file_type, file.original_name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4
                          className="font-semibold text-slate-900 text-xs truncate leading-snug group-hover:text-indigo-600 transition-colors"
                          title={file.original_name}
                        >
                          {file.original_name}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-400">
                          <span className="font-bold px-1 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                            v{file.version}
                          </span>
                          <span>{formatBytes(file.file_size)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Uploader and Timestamp */}
                  <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-500">
                    <span className="inline-flex items-center gap-1 font-medium text-slate-700 truncate max-w-[120px]" title={file.uploader_name}>
                      <User className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{file.uploader_name}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-slate-400 shrink-0">
                      <Clock className="w-3 h-3 text-slate-300 shrink-0" />
                      <span>{formatDateTime(file.updated_at || file.created_at)}</span>
                    </span>
                  </div>

                  {/* Action Buttons: Download, Reupload, Delete */}
                  <div className="mt-2.5 flex items-center justify-between gap-1.5 pt-1.5 border-t border-slate-100">
                    <div className="flex items-center gap-1.5">
                      {/* Download Link */}
                      <a
                        href={`http://127.0.0.1:5000/api/files/${file.id}/download`}
                        download={file.original_name}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors"
                        title="Download this file"
                      >
                        <Download className="w-3 h-3" />
                        <span>Download</span>
                      </a>

                      {/* Re-upload / Update Version */}
                      <button
                        type="button"
                        onClick={() => triggerReupload(file)}
                        disabled={isReuploading}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-slate-600 bg-white hover:bg-slate-100 hover:text-indigo-600 border border-slate-200 transition-colors cursor-pointer"
                        title="Upload an updated version of this file"
                      >
                        <RefreshCw className={`w-3 h-3 ${isReuploading ? 'animate-spin text-indigo-600' : ''}`} />
                        <span>{isReuploading ? 'Updating...' : 'Update'}</span>
                      </button>
                    </div>

                    {/* Delete Button (Only for Faculty & Team Leads) */}
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => handleDelete(file.id, file.original_name)}
                        className="p-1 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete file (Faculty/Lead only)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: ACTIVITY LOG (Users who updated or uploaded, latest on top, up to 5 + show more) */}
      {activeTab === 'activity' && (
        <div className="flex-1 overflow-y-auto space-y-2 max-h-[580px] pr-0.5">
          {activitiesLoading ? (
            <div className="py-12 text-center text-slate-400 flex flex-col items-center">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mb-1.5" />
              <p className="text-[11px]">Loading activity history...</p>
            </div>
          ) : activities.length === 0 ? (
            <div className="border border-dashed border-slate-200 rounded-xl p-6 text-center bg-slate-50/50 my-2">
              <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                <History className="w-4 h-4" />
              </div>
              <p className="font-semibold text-slate-700 text-xs">No activity logged yet</p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Uploads and updates by team members will be tracked here with timestamps.
              </p>
            </div>
          ) : (
            <>
              {displayedActivities.map((act) => {
                const isUploaded = act.action === 'uploaded';

                return (
                  <div
                    key={act.id}
                    className="p-2.5 rounded-xl border border-slate-200/80 bg-white hover:border-slate-300 transition-all flex flex-col gap-1.5"
                  >
                    {/* Top Row: User + Action Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-700 shrink-0">
                          {act.user_name ? act.user_name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <span className="font-semibold text-slate-900 text-xs truncate" title={act.user_name}>
                          {act.user_name}
                        </span>
                        {act.user_role === 'faculty' && (
                          <span className="text-[9px] font-bold px-1 rounded bg-violet-50 text-violet-700 border border-violet-100 shrink-0">
                            Faculty
                          </span>
                        )}
                      </div>

                      {/* Action Badge: Uploaded vs Updated vs Deleted */}
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                          act.action === 'uploaded'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : act.action === 'deleted'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}
                      >
                        {act.action === 'uploaded' ? (
                          <>
                            <Upload className="w-2.5 h-2.5" />
                            <span>Uploaded</span>
                          </>
                        ) : act.action === 'deleted' ? (
                          <>
                            <Trash2 className="w-2.5 h-2.5" />
                            <span>Deleted</span>
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-2.5 h-2.5" />
                            <span>Updated (v{act.version})</span>
                          </>
                        )}
                      </span>
                    </div>

                    {/* Middle Row: File Name */}
                    <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border ${
                      act.action === 'deleted'
                        ? 'bg-rose-50/40 border-rose-100 text-rose-800'
                        : 'bg-slate-50/80 border-slate-100 text-slate-700'
                    }`}>
                      <FileText className={`w-3.5 h-3.5 shrink-0 ${act.action === 'deleted' ? 'text-rose-400' : 'text-slate-400'}`} />
                      <span className={`truncate font-medium text-[11px] ${act.action === 'deleted' ? 'line-through text-slate-500' : ''}`} title={act.file_name}>
                        {act.file_name}
                      </span>
                    </div>

                    {/* Bottom Row: Timestamp */}
                    <div className="flex items-center justify-end text-[10px] text-slate-400">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-300" />
                        <span>{formatDateTime(act.created_at)}</span>
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Show More / Show Less Button */}
              {activities.length > 5 && (
                <button
                  type="button"
                  onClick={() => setShowAllActivities((prev) => !prev)}
                  className="w-full mt-2 py-1.5 px-3 rounded-xl text-xs font-semibold text-indigo-600 bg-indigo-50/60 hover:bg-indigo-50 border border-indigo-100 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  {showAllActivities ? (
                    <>
                      <span>Show Less</span>
                      <ChevronUp className="w-3.5 h-3.5" />
                    </>
                  ) : (
                    <>
                      <span>Show More ({activities.length - 5} older)</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Footer hint */}
      <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
        <span className="flex items-center gap-1">
          <Shield className="w-3 h-3 text-slate-400" />
          Deletion restricted to Faculty & Leads
        </span>
      </div>
    </div>
  );
}

export default ProjectFilesSidebar;
