import { useState, useEffect, useRef } from 'react';
import {
  X,
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
} from 'lucide-react';

function getFileIcon(type, filename = '') {
  const ext = (type || filename.split('.').pop() || '').toLowerCase();
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) {
    return <ImageIcon className="w-5 h-5 text-emerald-500" />;
  }
  if (['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(ext)) {
    return <FileText className="w-5 h-5 text-indigo-500" />;
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return <FileArchive className="w-5 h-5 text-amber-500" />;
  }
  if (['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'html', 'css', 'json', 'sql'].includes(ext)) {
    return <FileCode className="w-5 h-5 text-cyan-500" />;
  }
  return <File className="w-5 h-5 text-slate-500" />;
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
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function ProjectFilesModal({ isOpen, onClose, projectId, projectTitle, currentUserId, onFilesCountChange, canDelete = false }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [reuploadingId, setReuploadingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const newFileInputRef = useRef(null);
  const reuploadInputRef = useRef(null);
  const [targetReuploadFile, setTargetReuploadFile] = useState(null);

  const fetchFiles = async () => {
    if (!projectId) return;
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await fetch(`http://127.0.0.1:5000/api/projects/${projectId}/files`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setFiles(data);
        if (onFilesCountChange) onFilesCountChange(data.length);
      }
    } catch (err) {
      console.error('Failed to load project files:', err);
      setErrorMessage('Could not load project files. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && projectId) {
      fetchFiles();
      setErrorMessage('');
      setSuccessMessage('');
    }
  }, [isOpen, projectId]);

  // Handle uploading a brand new file
  const handleUploadNewFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
        setSuccessMessage(`"${file.name}" uploaded successfully!`);
        fetchFiles();
      } else {
        setErrorMessage(data.error || 'Failed to upload file.');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('Network error while uploading file.');
    } finally {
      setUploading(false);
      if (newFileInputRef.current) newFileInputRef.current.value = '';
    }
  };

  // Open file picker to re-upload / update an existing file
  const triggerReupload = (fileObj) => {
    setTargetReuploadFile(fileObj);
    if (reuploadInputRef.current) {
      reuploadInputRef.current.value = '';
      reuploadInputRef.current.click();
    }
  };

  // Handle re-uploading an updated version
  const handleReuploadSubmit = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !targetReuploadFile) return;

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
        setSuccessMessage(`Updated to version ${data.file.version} with "${file.name}"!`);
        fetchFiles();
      } else {
        setErrorMessage(data.error || 'Failed to update file.');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('Network error while updating file.');
    } finally {
      setReuploadingId(null);
      setTargetReuploadFile(null);
      if (reuploadInputRef.current) reuploadInputRef.current.value = '';
    }
  };

  // Handle deleting a file
  const handleDelete = async (fileId, fileName) => {
    if (!canDelete) {
      alert('Only faculty and team leads can delete project files.');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete "${fileName}"?`)) return;

    try {
      const res = await fetch(`http://127.0.0.1:5000/api/files/${fileId}?requested_by=${currentUserId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMessage(`File "${fileName}" deleted.`);
        fetchFiles();
      } else {
        setErrorMessage(data.error || 'Failed to delete file.');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('Network error while deleting file.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-bold text-slate-900">Project Files & Attachments</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Files uploaded for <span className="font-semibold text-slate-700">{projectTitle}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hidden File Inputs */}
        <input
          type="file"
          ref={newFileInputRef}
          onChange={handleUploadNewFile}
          className="hidden"
        />
        <input
          type="file"
          ref={reuploadInputRef}
          onChange={handleReuploadSubmit}
          className="hidden"
        />

        {/* Alerts */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Upload Action Bar */}
        <div className="px-6 pt-5 pb-3 flex items-center justify-between gap-4">
          <div className="text-xs text-slate-500">
            Total files: <span className="font-bold text-slate-800">{files.length}</span>
          </div>
          <button
            type="button"
            onClick={() => newFileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs shadow-indigo-200 active:scale-98 disabled:opacity-60 transition-all cursor-pointer"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Upload New File</span>
              </>
            )}
          </button>
        </div>

        {/* Files List Container */}
        <div className="flex-1 overflow-y-auto px-6 py-2">
          {loading ? (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
              <p className="text-xs">Loading files...</p>
            </div>
          ) : files.length === 0 ? (
            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center my-4 bg-slate-50/50">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto mb-3">
                <Upload className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-slate-800 text-sm">No files uploaded yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                Share requirement specs, datasets, documentation, or design files with your team.
              </p>
              <button
                type="button"
                onClick={() => newFileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-indigo-600 bg-white border border-indigo-200 hover:bg-indigo-50 shadow-2xs transition-all"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Choose a file to upload</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3 pb-4">
              {files.map((file) => {
                const isReuploading = reuploadingId === file.id;
                const isUpdated = file.version > 1;

                return (
                  <div
                    key={file.id}
                    className="p-4 rounded-2xl border border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    {/* Left: File icon + details */}
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                        {getFileIcon(file.file_type, file.original_name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-slate-900 text-sm truncate" title={file.original_name}>
                            {file.original_name}
                          </h4>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 shrink-0">
                            v{file.version}
                          </span>
                          <span className="text-xs text-slate-400 font-medium shrink-0">
                            {formatBytes(file.file_size)}
                          </span>
                        </div>

                        {/* Uploader and Timestamp details */}
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                          <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                            <User className="w-3 h-3 text-slate-400" />
                            {isUpdated ? `Updated by ${file.uploader_name}` : `Uploaded by ${file.uploader_name}`}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="inline-flex items-center gap-1 text-slate-500">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {formatDateTime(file.updated_at || file.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions (Download, Re-upload, Delete) */}
                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 w-full sm:w-auto justify-end">
                      {/* Download Button */}
                      <a
                        href={`http://127.0.0.1:5000/api/files/${file.id}/download`}
                        download={file.original_name}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors"
                        title="Download file"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </a>

                      {/* Re-upload / Update Button */}
                      <button
                        type="button"
                        onClick={() => triggerReupload(file)}
                        disabled={isReuploading}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 hover:text-indigo-600 border border-slate-200 transition-colors"
                        title="Upload an updated version of this file"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isReuploading ? 'animate-spin text-indigo-600' : ''}`} />
                        <span>{isReuploading ? 'Updating...' : 'Re-upload'}</span>
                      </button>

                      {/* Delete Button (Faculty & Leads Only) */}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => handleDelete(file.id, file.original_name)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete file (Faculty/Lead only)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <p className="text-[11px] text-slate-400">
            Files can be downloaded, edited locally, and re-uploaded with automated version tracking.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 shadow-2xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProjectFilesModal;
