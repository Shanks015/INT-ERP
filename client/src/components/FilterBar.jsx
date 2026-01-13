import { Search, X } from 'lucide-react';

const FilterBar = ({ filters, onFilterChange, onClearFilters, showCountryFilter = false, countries = [] }) => {
    const handleChange = (field, value) => {
        onFilterChange({ [field]: value });
    };

    return (
        <div className="card bg-base-100 shadow-xl mb-6">
            <div className="card-body">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Filters</h3>
                    <button
                        onClick={onClearFilters}
                        className="btn btn-ghost btn-sm gap-2"
                    >
                        <X size={16} /> Clear All
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Search */}
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text">Search</span>
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search by name..."
                                className="input input-bordered w-full pr-10"
                                value={filters.search || ''}
                                onChange={(e) => handleChange('search', e.target.value)}
                            />
                            <Search className="absolute right-3 top-3 text-base-content/50" size={20} />
                        </div>
                    </div>

                    {/* Record Status Filter */}
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text">Status</span>
                        </label>
                        <select
                            className="select select-bordered w-full"
                            value={filters.recordStatus || ''}
                            onChange={(e) => handleChange('recordStatus', e.target.value)}
                        >
                            <option value="">All Status</option>
                            <option value="active">Active</option>
                            <option value="expired">Expired</option>
                        </select>
                    </div>

                    {/* Start Date */}
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text">From Date</span>
                        </label>
                        <input
                            type="date"
                            className="input input-bordered w-full"
                            value={filters.startDate || ''}
                            onChange={(e) => handleChange('startDate', e.target.value)}
                        />
                    </div>

                    {/* End Date */}
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text">To Date</span>
                        </label>
                        <input
                            type="date"
                            className="input input-bordered w-full"
                            value={filters.endDate || ''}
                            onChange={(e) => handleChange('endDate', e.target.value)}
                        />
                    </div>

                    {/* Country Filter (optional) */}
                    {showCountryFilter && (
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text">Country</span>
                            </label>
                            <select
                                className="select select-bordered w-full"
                                value={filters.country || ''}
                                onChange={(e) => handleChange('country', e.target.value)}
                            >
                                <option value="">All Countries</option>
                                {countries.map((country) => (
                                    <option key={country} value={country}>
                                        {country}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FilterBar;
