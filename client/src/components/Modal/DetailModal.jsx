import { X, ExternalLink } from 'lucide-react';

const DetailModal = ({ isOpen, onClose, data, title, fields }) => {
    if (!isOpen || !data) return null;

    console.log('DetailModal data:', data);
    console.log('DetailModal fields:', fields);

    const renderValue = (value, field) => {
        if (!value && value !== 0) return '-';

        // Handle arrays (like dignitaries)
        if (Array.isArray(value)) {
            if (value.length === 0) return '-';
            return (
                <ul className="list-disc list-inside">
                    {value.map((item, idx) => (
                        <li key={idx}>{item}</li>
                    ))}
                </ul>
            );
        }

        // Handle dates
        if (field.type === 'date') {
            return new Date(value).toLocaleDateString();
        }

        // Handle links
        if (field.type === 'link' || field.key === 'driveLink' || field.key === 'articleLink') {
            return (
                <a href={value} target="_blank" rel="noopener noreferrer" className="link link-primary flex items-center gap-1">
                    View Link <ExternalLink size={14} />
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
                    className="link link-primary"
                >
                    {value}
                </a>
            );
        }

        // Handle long text
        if (typeof value === 'string' && value.length > 100) {
            return <p className="whitespace-pre-wrap">{value}</p>;
        }

        return value;
    };

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={onClose}></div>

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                <div className="bg-base-100 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden pointer-events-auto">
                    {/* Header */}
                    <div className="flex justify-between items-center p-6 border-b border-base-300">
                        <h2 className="text-2xl font-bold">{title}</h2>
                        <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                        <div className="grid grid-cols-1 gap-4">
                            {fields.map((field) => {
                                const value = data[field.key];
                                return (
                                    <div key={field.key} className="border-b border-base-200 pb-3 last:border-0">
                                        <label className="font-semibold text-sm text-base-content/70 uppercase tracking-wide block">
                                            {field.label}
                                        </label>
                                        <div className="mt-1 text-base-content">
                                            {renderValue(value, field)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end p-6 border-t border-base-300">
                        <button onClick={onClose} className="btn btn-primary">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default DetailModal;
