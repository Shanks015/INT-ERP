import { 
    X, 
    ExternalLink, 
    Mail, 
    Calendar, 
    FileText, 
    Globe, 
    Phone, 
    User, 
    Activity, 
    Info, 
    Link2, 
    ShieldCheck,
    Paperclip
} from 'lucide-react';
import { formatDate, toDDMMM } from '../../utils/dateFormat';
import { statusBadgeClass } from '../../utils/statusBadge';

// Timestamp render for outreach reply meta: canonical dd/MMM/yyyy date + the
// time-of-day part of the localized string (e.g. "03/Sep/2026, 09:41:00").
const formatDateTime = (value) => {
    const dt = new Date(value);
    if (isNaN(dt.getTime())) return value;
    return `${toDDMMM(dt)}, ${dt.toLocaleString('en-IN').split(', ').slice(1).join(', ')}`;
};


const DetailModal = ({ isOpen, onClose, data, title, fields }) => {
    if (!isOpen || !data) return null;

    const serverBaseUrl = import.meta.env.VITE_API_URL
        ? import.meta.env.VITE_API_URL.replace('/api', '')
        : `${window.location.protocol}//${window.location.hostname}:5000`;

    // Reuses the shared statusBadge util so detail-view badges match the module
    // list badges for every human status (Scholar Completed/Upcoming…, Exchange
    // statuses, programStatus, etc.) instead of a fixed palette (C4).
    const getStatusBadgeClass = (val) => `badge ${statusBadgeClass(val)} gap-1 font-semibold py-2.5 px-3`;

    const getFieldIcon = (field) => {
        const key = field.key.toLowerCase();
        const type = field.type;

        if (type === 'email' || key.includes('email')) {
            return <Mail size={16} className="text-primary/70" />;
        }
        if (type === 'date' || key.includes('date') || key.endsWith('at')) {
            return <Calendar size={16} className="text-secondary/70" />;
        }
        if (type === 'link' || key.includes('link') || key.includes('website') || key.includes('url')) {
            return <Link2 size={16} className="text-accent/70" />;
        }
        if (key.includes('name') || key.includes('person') || key.includes('employee') || key.includes('student') || key.includes('scholar') || key.includes('by')) {
            return <User size={16} className="text-info/70" />;
        }
        if (key.includes('country')) {
            return <Globe size={16} className="text-success/70" />;
        }
        if (key.includes('phone') || key.includes('mobile')) {
            return <Phone size={16} className="text-warning/70" />;
        }
        if (key.includes('status') || key.includes('confidence')) {
            return <Activity size={16} className="text-primary/70" />;
        }
        return <Info size={16} className="text-base-content/40" />;
    };

    const renderValue = (value, field) => {
        if (!value && value !== 0) return <span className="text-base-content/40 font-normal">-</span>;

        // Handle status/confidence badges
        const key = field.key.toLowerCase();
        if (key.includes('status') || key.includes('confidence')) {
            return <span className={getStatusBadgeClass(value)}>{value}</span>;
        }

        // Handle detectedReplies specifically
        if (field.key === 'detectedReplies') {
            if (!Array.isArray(value) || value.length === 0) {
                return <span className="text-base-content/40 font-normal">No replies detected yet.</span>;
            }
            return (
                <div className="space-y-4 w-full">
                    {value.map((reply, idx) => {
                        const dateStr = formatDateTime(reply.detectedAt);

                        const imageAttachments = reply.attachments ? reply.attachments.filter(att => att.contentType?.startsWith('image/')) : [];
                        const otherAttachments = reply.attachments ? reply.attachments.filter(att => !att.contentType?.startsWith('image/')) : [];

                        return (
                            <div key={reply._id || idx} className="border border-base-300 rounded-xl overflow-hidden bg-base-50/50 flex flex-col">
                                {/* Reply Header */}
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 bg-base-200/50 gap-2 border-b border-base-300">
                                    <div className="flex flex-col">
                                        <span className="font-semibold text-sm text-base-content flex items-center gap-1.5">
                                            <Mail size={14} className="text-primary/70" />
                                            {reply.fromEmail}
                                        </span>
                                        <span className="text-xs text-base-content/50 mt-0.5">
                                            Subject: <span className="font-medium text-base-content/75">{reply.subject}</span>
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-base-content/50">{dateStr}</span>
                                        <span className={getStatusBadgeClass(reply.reviewStatus)}>
                                            {reply.reviewStatus === 'pending_review' ? 'Pending Review' : reply.reviewStatus}
                                        </span>
                                    </div>
                                </div>

                                {/* Reply Metadata & Details */}
                                <div className="flex flex-wrap gap-x-4 gap-y-1.5 px-4 py-2 bg-base-100/50 border-b border-base-200 text-xs text-base-content/65">
                                    <div className="flex items-center gap-1.5">
                                        <Calendar size={12} className="text-base-content/40" />
                                        <span className="font-semibold text-base-content/85">Received:</span>
                                        <span>{dateStr}</span>
                                    </div>
                                    {reply.matchConfidence && (
                                        <div className="flex items-center gap-1.5">
                                            <Activity size={12} className="text-base-content/40" />
                                            <span className="font-semibold text-base-content/85">Match Confidence:</span>
                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                                reply.matchConfidence === 'high' 
                                                    ? 'bg-success/10 text-success border border-success/20' 
                                                    : 'bg-warning/10 text-warning border border-warning/20'
                                            }`}>
                                                {reply.matchConfidence}
                                            </span>
                                        </div>
                                    )}
                                    {reply.reviewedAt && (
                                        <div className="flex items-center gap-1.5">
                                            <ShieldCheck size={12} className="text-base-content/40" />
                                            <span className="font-semibold text-base-content/85">Reviewed At:</span>
                                            <span>{formatDateTime(reply.reviewedAt)}</span>
                                        </div>
                                    )}
                                    {reply.messageId && (
                                        <div className="flex items-center gap-1.5 max-w-[250px] truncate" title={reply.messageId}>
                                            <Info size={12} className="text-base-content/40" />
                                            <span className="font-semibold text-base-content/85">Message ID:</span>
                                            <span className="font-mono text-[10px] text-base-content/60">{reply.messageId}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Reply Body */}
                                <div className="p-4 text-sm bg-base-100 flex-1">
                                    <p className="whitespace-pre-wrap leading-relaxed text-sm text-base-content/90 font-sans">
                                        {reply.bodyContent || <span className="text-base-content/30 italic">(Empty Body)</span>}
                                    </p>

                                    {/* Inline Images Gallery */}
                                    {imageAttachments.length > 0 && (
                                        <div className="mt-4 pt-3 border-t border-base-200/80">
                                            <span className="text-xs font-semibold text-base-content/50 block mb-2">Images ({imageAttachments.length}):</span>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                {imageAttachments.map((att, attIdx) => {
                                                    const attUrl = `${serverBaseUrl}${att.path}`;
                                                    return (
                                                        <a 
                                                            key={attIdx}
                                                            href={attUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="group relative aspect-video rounded-lg overflow-hidden border border-base-200 hover:border-primary/50 transition-all bg-base-50 flex items-center justify-center"
                                                        >
                                                            <img 
                                                                src={attUrl} 
                                                                alt={att.filename} 
                                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                                                onError={(e) => { e.target.style.display = 'none'; }}
                                                            />
                                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                <span className="text-white text-xs font-semibold">View Full Image</span>
                                                            </div>
                                                        </a>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Non-image Attachments List */}
                                    {otherAttachments.length > 0 && (
                                        <div className="mt-4 pt-3 border-t border-base-200/80">
                                            <span className="text-xs font-semibold text-base-content/50 block mb-2">Attachments ({otherAttachments.length}):</span>
                                            <div className="flex flex-wrap gap-2">
                                                {otherAttachments.map((att, attIdx) => {
                                                    const attUrl = `${serverBaseUrl}${att.path}`;
                                                    return (
                                                        <a
                                                            key={attIdx}
                                                            href={attUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1.5 text-xs bg-base-200 hover:bg-base-300 text-base-content/85 hover:text-base-content px-3 py-1.5 rounded-lg transition-colors border border-base-300 font-medium"
                                                            title={att.filename}
                                                        >
                                                            <Paperclip size={12} className="text-base-content/50" />
                                                            <span className="max-w-[150px] truncate">{att.filename}</span>
                                                        </a>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Reply Quick Actions */}
                                <div className="px-4 py-2.5 bg-base-200/40 border-t border-base-300/60 flex flex-wrap items-center justify-start gap-2">
                                    <a
                                        href={`https://mail.google.com/mail/?view=cm&fs=1&to=${reply.fromEmail}&su=${encodeURIComponent('Re: ' + (reply.subject || ''))}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn btn-xs btn-primary gap-1 font-semibold normal-case"
                                    >
                                        <ExternalLink size={12} />
                                        Reply in Gmail
                                    </a>
                                    <a
                                        href={`mailto:${reply.fromEmail}?subject=${encodeURIComponent('Re: ' + (reply.subject || ''))}`}
                                        className="btn btn-xs btn-outline gap-1 font-semibold normal-case"
                                        style={{ color: 'var(--fallback-bc,oklch(var(--bc)/1))' }}
                                    >
                                        <Mail size={12} />
                                        Reply via Mail Client
                                    </a>
                                </div>
                            </div>
                        );
                    })}
                </div>
            );
        }

        // Handle replyAttachments specifically
        if (field.key === 'replyAttachments') {
            if (!Array.isArray(value) || value.length === 0) return <span className="text-base-content/40 font-normal">-</span>;
            return (
                <div className="flex flex-wrap gap-2">
                    {value.map((att, attIdx) => {
                        const attUrl = `${serverBaseUrl}${att.path}`;
                        return (
                            <a
                                key={attIdx}
                                href={attUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs bg-base-200 hover:bg-base-300 text-base-content/85 hover:text-base-content px-3 py-1.5 rounded-lg transition-colors border border-base-300 font-medium"
                                title={att.filename}
                            >
                                <Paperclip size={12} className="text-base-content/50" />
                                <span className="max-w-[150px] truncate">{att.filename}</span>
                            </a>
                        );
                    })}
                </div>
            );
        }

        // Handle arrays (like dignitaries)
        if (Array.isArray(value)) {
            if (value.length === 0) return <span className="text-base-content/40 font-normal">-</span>;
            return (
                <ul className="list-disc list-inside space-y-1 mt-1 text-sm text-base-content/95">
                    {value.map((item, idx) => (
                        <li key={idx} className="marker:text-primary">{item}</li>
                    ))}
                </ul>
            );
        }

        // Handle dates
        if (field.type === 'date') {
            try {
                if (field.format) {
                    const formatted = formatDate(value, field.format);
                    return formatted || value;
                }
                // Canonical dd/MMM/yyyy (the project standard for every module)
                return toDDMMM(value) || value;
            } catch (e) {
                return value;
            }
        }

        // Handle links
        if (field.type === 'link' || field.key === 'driveLink' || field.key === 'articleLink' || field.key === 'website') {
            return (
                <a 
                    href={value.startsWith('http') ? value : `https://${value}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="link link-primary hover:link-accent inline-flex items-center gap-1.5 font-semibold transition-all"
                >
                    View Document <ExternalLink size={14} />
                </a>
            );
        }

        // Handle emails
        if (field.type === 'email') {
            return (
                <a
                    href={`https://mail.google.com/mail/?view=cm&fs=1&to=${value}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link link-primary hover:link-accent inline-flex items-center gap-1.5 font-semibold transition-all"
                >
                    {value}
                </a>
            );
        }

        // Handle long text
        if (typeof value === 'string' && (value.length > 80 || value.includes('\n'))) {
            return <p className="whitespace-pre-wrap leading-relaxed text-sm text-base-content/90 font-sans">{value}</p>;
        }

        return <span className="text-base-content/95 font-medium">{value}</span>;
    };

    return (
        <>
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300" 
                onClick={onClose}
            ></div>

            {/* Modal Wrapper */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                <div className="bg-base-100 border border-base-300 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden pointer-events-auto transform transition-all duration-300 flex flex-col">
                    {/* Header */}
                    <div className="flex justify-between items-center p-6 border-b border-base-300 bg-base-200/50">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                                <ShieldCheck size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold tracking-tight text-base-content">{title}</h2>
                                <p className="text-xs text-base-content/50 mt-0.5">Detailed system record overview</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="btn btn-ghost btn-circle hover:bg-base-300/50">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto flex-1 bg-gradient-to-b from-base-100 to-base-200/20">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {fields.map((field) => {
                                const value = data[field.key];
                                const isLongText = typeof value === 'string' && (value.length > 80 || value.includes('\n'));
                                const isArray = Array.isArray(value);
                                const forceFullWidthKeys = ['replybodycontent', 'notes', 'summary', 'purpose', 'remarks', 'description', 'dignitaries', 'reply', 'detectedreplies', 'replyattachments'];
                                const shouldBeFullWidth = isLongText || isArray || forceFullWidthKeys.includes(field.key.toLowerCase());

                                if (shouldBeFullWidth) {
                                    return (
                                        <div key={field.key} className="md:col-span-2 bg-base-200/30 border border-base-300/30 rounded-2xl p-5 hover:bg-base-200/50 transition-all">
                                            <span className="text-xs font-bold text-base-content/50 uppercase tracking-wider flex items-center gap-2 mb-3">
                                                {getFieldIcon(field)}
                                                {field.label}
                                            </span>
                                            <div className="bg-base-100/90 border border-base-300/40 rounded-xl p-4 text-sm shadow-inner min-h-[3.5rem]">
                                                {renderValue(value, field)}
                                            </div>
                                        </div>
                                    );
                                }

                                return (
                                    <div key={field.key} className="bg-base-200/30 hover:bg-base-200/50 border border-base-300/20 rounded-xl p-4 transition-all flex flex-col justify-between min-h-[5.5rem]">
                                        <span className="text-xs font-bold text-base-content/50 uppercase tracking-wider flex items-center gap-2 mb-2">
                                            {getFieldIcon(field)}
                                            {field.label}
                                        </span>
                                        <div className="text-base text-base-content font-medium flex-1 flex items-center">
                                            {renderValue(value, field)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-2 p-5 border-t border-base-300 bg-base-200/30">
                        <button onClick={onClose} className="btn btn-primary px-6 rounded-xl shadow-lg shadow-primary/20">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default DetailModal;
