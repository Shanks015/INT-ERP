import { X } from 'lucide-react';

const DeleteConfirmModal = ({
    isOpen,
    onClose,
    onConfirm,
    itemName = 'this record',
    requireReason = false
}) => {
    const handleSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const reason = formData.get('reason');

        if (requireReason && !reason?.trim()) {
            return;
        }

        onConfirm(reason);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <dialog className="modal modal-open">
            <div className="modal-box">
                <button
                    type="button"
                    onClick={onClose}
                    className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
                >
                    <X size={18} />
                </button>

                <h3 className="font-bold text-lg">Confirm Delete</h3>

                <form onSubmit={handleSubmit}>
                    <p className="py-4">
                        Are you sure you want to delete {itemName}?
                    </p>

                    {requireReason && (
                        <div className="form-control w-full">
                            <label className="label">
                                <span className="label-text">Reason for deletion *</span>
                            </label>
                            <textarea
                                name="reason"
                                className="textarea textarea-bordered w-full"
                                placeholder="Please provide a reason..."
                                rows={3}
                                required
                            />
                        </div>
                    )}

                    <div className="modal-action">
                        <button type="button" className="btn" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-error">
                            {requireReason ? 'Submit for Approval' : 'Delete'}
                        </button>
                    </div>
                </form>
            </div>
            <form method="dialog" className="modal-backdrop" onClick={onClose}>
                <button>close</button>
            </form>
        </dialog>
    );
};

export default DeleteConfirmModal;
