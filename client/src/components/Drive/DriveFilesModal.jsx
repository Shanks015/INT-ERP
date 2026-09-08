// DriveFilesModal.jsx — one shared modal for the ERP Drive feature: every
// drive-module list opens it to see, preview and upload files for ONE record.
//
//   • Files are stored in the office Google Drive (one account, configured by an
//     admin in Settings). The server lists LIVE from Drive, so files the office
//     adds directly in Drive appear here too.
//   • Not connected → we say so instead of failing.
//   • Any approved user can upload; deleting is limited to the uploader/admin
//     (the server marks each file `canDelete`).
//   • Uploading to a record with no folder yet creates the folder and writes its
//     Drive link onto the record.
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
    X, FolderOpen, Upload, Trash2, FileText, Eye, ExternalLink,
    Loader2, Image as ImageIcon, Lock
} from 'lucide-react';
import api from '../../api';
import { useDateFormat } from '../../utils/dateFormat';

const PREVIEW_HOST = 'https://drive.google.com/file/d/';

const formatBytes = (bytes) => {
    if (bytes == null || isNaN(bytes)) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    let n = Number(bytes);
    let i = 0;
    while (n >= 1024 && i < units.length - 1) { n /= 1024; i += 1; }
    return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
};

const isImage = (f) => /^image\//.test(f.mimeType || '') || /\.(png|jpe?g|gif|webp|bmp|svg|heic)$/i.test(f.name || '');

const driveFilePreviewUrl = (id) => `${PREVIEW_HOST}${id}/preview`;

const DriveFilesModal = ({ isOpen, onClose, moduleSlug, recordId, recordLabel = 'Record' }) => {
    const formatDate = useDateFormat();
    const fileInputRef = useRef(null);

    const [connected, setConnected] = useState(null); // null = loading, true/false after
    const [folder, setFolder] = useState(null);       // { id, url } or null
    const [files, setFiles] = useState([]);
    const [loadError, setLoadError] = useState('');
    const [selected, setSelected] = useState([]);     // picked, not yet uploaded
    const [uploading, setUploading] = useState(false);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [preview, setPreview] = useState(null);     // file object being previewed

    const load = async () => {
        setLoadError('');
        setPreview(null);
        setConfirmDeleteId(null);
        try {
            const res = await api.get(`/drive/${moduleSlug}/${recordId}`);
            setConnected(res.data.connected);
            setFolder(res.data.folder || null);
            setFiles(res.data.files || []);
        } catch (err) {
            setConnected(false);
            setFiles([]);
            setLoadError(err.response?.data?.message || 'Could not load files.');
        }
    };

    // Reload whenever the modal opens (or the record changes).
    useEffect(() => {
        if (isOpen) {
            setSelected([]);
            setUploading(false);
            setPreview(null);
            setConfirmDeleteId(null);
            setFiles([]);
            setConnected(null);
            load();
        }
    }, [isOpen, moduleSlug, recordId]);

    if (!isOpen) return null;

    const handlePick = (e) => {
        const incoming = Array.from(e.target.files || []);
        setSelected((prev) => [...prev, ...incoming]);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleUpload = async () => {
        if (!selected.length || uploading) return;
        const body = new FormData();
        for (const f of selected) body.append('files', f);
        setUploading(true);
        try {
            const res = await api.post(`/drive/${moduleSlug}/${recordId}/files`, body, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setFolder(res.data.folder || folder);
            setFiles(res.data.files || []);
            setSelected([]);
            toast.success(res.data.message || 'Files uploaded');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (f) => {
        try {
            await api.delete(`/drive/${moduleSlug}/${recordId}/files/${f.id}`);
            setFiles((prev) => prev.filter((x) => x.id !== f.id));
            if (preview?.id === f.id) setPreview(null);
            toast.success('File deleted');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not delete file');
        } finally {
            setConfirmDeleteId(null);
        }
    };

    const previewable = (f) => !isImage(f); // images show inline; others open the Drive viewer

    return (
        <dialog className="modal modal-open">
            <div className="modal-box max-w-3xl">
                <button type="button" onClick={onClose} className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">
                    <X size={18} />
                </button>

                <h3 className="font-bold text-lg flex items-center gap-2">
                    <FolderOpen size={20} className="text-primary" />
                    <span className="truncate">{recordLabel}</span>
                    <span className="badge badge-outline badge-sm whitespace-nowrap">Files</span>
                </h3>

                {/* Loading */}
                {connected === null && !loadError && (
                    <div className="flex items-center justify-center gap-3 py-12 text-base-content/60">
                        <Loader2 size={20} className="animate-spin" /> Loading files…
                    </div>
                )}

                {/* Load error (but still show a usable empty state) */}
                {loadError && <p className="alert alert-warning my-4 py-2 text-sm">{loadError}</p>}

                {/* Not connected */}
                {connected === false && (
                    <div className="py-10 text-center">
                        <Lock size={34} className="mx-auto text-base-content/40 mb-3" />
                        <p className="font-semibold">ERP Drive is not configured</p>
                        <p className="text-sm text-base-content/70 mt-1 max-w-md mx-auto">
                            Files are stored in the office Google Drive. An administrator
                            needs to finish the ERP Drive setup (done once, at deployment).
                        </p>
                    </div>
                )}

                {connected === true && (
                    <>
                        {/* Upload toolbar (always available once connected) */}
                        <div className="flex flex-wrap items-center gap-2 mt-4">
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                className="file-input file-input-bordered file-input-sm flex-1 min-w-[220px]"
                                onChange={handlePick}
                                title="Choose files to upload"
                            />
                            <button className="btn btn-primary btn-sm" onClick={handleUpload} disabled={!selected.length || uploading}>
                                {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                                {uploading ? 'Uploading…' : `Upload ${selected.length ? `(${selected.length})` : ''}`}
                            </button>
                        </div>
                        {selected.length > 0 && !uploading && (
                            <div className="mt-2 flex flex-wrap gap-1">
                                {selected.map((f, i) => (
                                    <span key={`${f.name}-${i}`} className="badge badge-neutral gap-1 py-3">
                                        {f.name}
                                        <button
                                            type="button"
                                            className="btn btn-xs btn-circle btn-ghost"
                                            onClick={() => setSelected((prev) => prev.filter((_, idx) => idx !== i))}
                                            title="Remove"
                                        >
                                            <X size={12} />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* File area */}
                        <div className="mt-4 max-h-[55vh] overflow-y-auto">
                            {files.length === 0 ? (
                                <div className="text-center py-10 border border-dashed rounded-lg">
                                    <FileText size={28} className="mx-auto text-base-content/30 mb-2" />
                                    <p className="text-sm text-base-content/70">
                                        {folder ? 'No files in this folder yet.' : 'No folder yet — uploading the first file creates it.'}
                                    </p>
                                    <p className="text-xs text-base-content/50 mt-1">Photos, PDFs, Word/Excel — any file up to 25 MB each.</p>
                                </div>
                            ) : (
                                <ul className="space-y-2">
                                    {files.map((f) => (
                                        <li key={f.id} className="flex items-center gap-3 p-2 rounded-lg bg-base-200/50 hover:bg-base-200">
                                            {isImage(f) ? (
                                                f.thumbnailLink
                                                    ? <img src={f.thumbnailLink} alt={f.name} className="w-11 h-11 rounded object-cover shrink-0" />
                                                    : <div className="w-11 h-11 rounded flex items-center justify-center bg-base-300 shrink-0"><ImageIcon size={18} /></div>
                                            ) : (
                                                <div className="w-11 h-11 rounded flex items-center justify-center bg-base-300 shrink-0"><FileText size={18} /></div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate" title={f.name}>{f.name}</p>
                                                <p className="text-xs text-base-content/60">
                                                    {formatBytes(f.size) && <span>{formatBytes(f.size)} · </span>}
                                                    {f.modifiedTime || f.uploadedAt ? formatDate(f.modifiedTime || f.uploadedAt) : '—'}
                                                </p>
                                            </div>
                                            {f.webViewLink && (
                                                <button type="button" className="btn btn-ghost btn-xs" title="Open in Drive"
                                                    onClick={() => { setPreview(null); window.open(f.webViewLink, '_blank', 'noopener'); }}>
                                                    <ExternalLink size={15} />
                                                </button>
                                            )}
                                            {previewable(f) && (
                                                <button type="button" className="btn btn-info btn-xs" title="Preview"
                                                    onClick={() => setPreview(preview?.id === f.id ? null : f)}>
                                                    <Eye size={15} /> Preview
                                                </button>
                                            )}
                                            {f.canDelete && (
                                                confirmDeleteId === f.id ? (
                                                    <span className="flex items-center gap-1">
                                                        <button type="button" className="btn btn-error btn-xs" onClick={() => handleDelete(f)}>Delete</button>
                                                        <button type="button" className="btn btn-ghost btn-xs" onClick={() => setConfirmDeleteId(null)}>Cancel</button>
                                                    </span>
                                                ) : (
                                                    <button type="button" className="btn btn-ghost btn-xs text-error" title="Delete file"
                                                        onClick={() => setConfirmDeleteId(f.id)}>
                                                        <Trash2 size={15} />
                                                    </button>
                                                )
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}

                            {folder && (
                                <div className="mt-4 text-center">
                                    <a href={folder.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm btn-outline">
                                        <FolderOpen size={16} /> Open folder in Google Drive
                                    </a>
                                </div>
                            )}
                        </div>

                        {/* In-modal preview pane */}
                        {preview && (
                            <div className="mt-4 border rounded-lg overflow-hidden">
                                <div className="flex items-center justify-between px-3 py-2 bg-base-200">
                                    <p className="text-sm font-medium truncate">{preview.name}</p>
                                    <button type="button" className="btn btn-ghost btn-xs" onClick={() => setPreview(null)}><X size={15} /> Close</button>
                                </div>
                                <iframe
                                    src={driveFilePreviewUrl(preview.id)}
                                    title={preview.name}
                                    className="w-full"
                                    style={{ height: '50vh' }}
                                    loading="lazy"
                                />
                            </div>
                        )}
                    </>
                )}

                <div className="modal-action">
                    <button type="button" className="btn" onClick={onClose}>Close</button>
                </div>
            </div>
            <form method="dialog" className="modal-backdrop" onClick={onClose}>
                <button>close</button>
            </form>
        </dialog>
    );
};

export default DriveFilesModal;
