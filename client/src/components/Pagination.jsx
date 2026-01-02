import { ChevronLeft, ChevronRight } from 'lucide-react';

const Pagination = ({
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    onPageChange,
    onItemsPerPageChange
}) => {
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    return (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6">
            {/* Items per page selector */}
            <div className="flex items-center gap-2">
                <span className="text-sm">Show:</span>
                <select
                    className="select select-bordered select-sm"
                    value={itemsPerPage}
                    onChange={(e) => onItemsPerPageChange(parseInt(e.target.value))}
                >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                </select>
                <span className="text-sm">per page</span>
            </div>

            {/* Page info */}
            <div className="text-sm text-base-content/70">
                Showing {startItem} to {endItem} of {totalItems} entries
            </div>

            {/* Page navigation */}
            <div className="join">
                <button
                    className="join-item btn btn-sm"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                >
                    <ChevronLeft size={16} />
                </button>

                {/* Page numbers */}
                {[...Array(Math.min(5, totalPages))].map((_, idx) => {
                    let pageNum;
                    if (totalPages <= 5) {
                        pageNum = idx + 1;
                    } else if (currentPage <= 3) {
                        pageNum = idx + 1;
                    } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + idx;
                    } else {
                        pageNum = currentPage - 2 + idx;
                    }

                    return (
                        <button
                            key={pageNum}
                            className={`join-item btn btn-sm ${currentPage === pageNum ? 'btn-active' : ''}`}
                            onClick={() => onPageChange(pageNum)}
                        >
                            {pageNum}
                        </button>
                    );
                })}

                <button
                    className="join-item btn btn-sm"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                >
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>
    );
};

export default Pagination;
