"""
Script to add stats, filters, and pagination to all module List pages
"""

import os
import re

# Module configurations: (folder_name, api_endpoint, display_name, state_var_name)
MODULES = [
    ('CampusVisits', 'campus-visits', 'Campus Visits', 'visits'),
    ('Events', 'events', 'Events', 'events'),
    ('Conferences', 'conferences', 'Conferences', 'conferences'),
    ('MouSigningCeremonies', 'mou-signing-ceremonies', 'MoU Signing Ceremonies', 'ceremonies'),
    ('Scholars', 'scholars-in-residence', 'Scholars in Residence', 'scholars'),
    ('MouUpdates', 'mou-updates', 'MoU Updates', 'updates'),
    ('ImmersionPrograms', 'immersion-programs', 'Immersion Programs', 'programs'),
    ('StudentExchange', 'student-exchange', 'Student Exchange', 'exchanges'),
    ('MastersAbroad', 'masters-abroad', 'Masters Abroad', 'programs'),
    ('Memberships', 'memberships', 'Memberships', 'memberships'),
    ('DigitalMedia', 'digital-media', 'Digital Media', 'media'),
]

IMPORTS_TO_ADD = """import StatsCard from '../../components/StatsCard';
import FilterBar from '../../components/FilterBar';
import Pagination from '../../components/Pagination';"""

def get_stats_state():
    return """    const [stats, setStats] = useState({ total: 0, thisMonth: 0, pending: 0 });
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    
    // Filter state
    const [filters, setFilters] = useState({
        search: '',
        status: '',
        startDate: '',
        endDate: '',
        country: ''
    });"""

def get_fetch_stats_function(api_endpoint):
    return f"""
    const fetchStats = async () => {{
        try {{
            const response = await api.get('/{api_endpoint}/stats');
            setStats(response.data.stats);
        }} catch (error) {{
            console.error('Error fetching stats:', error);
        }}
    }};"""

def get_stats_cards():
    return """
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <StatsCard 
                    title="Total" 
                    value={stats.total} 
                    icon={Users}
                    color="primary"
                />
                <StatsCard 
                    title="This Month" 
                    value={stats.thisMonth} 
                    icon={TrendingUp}
                    color="secondary"
                    trend={`+${stats.thisMonth} new entries`}
                />
                <StatsCard 
                    title="Pending Approval" 
                    value={stats.pending} 
                    icon={Clock}
                    color="warning"
                />
            </div>"""

def get_filter_bar():
    return """
            {/* Filters */}
            <FilterBar
                filters={filters}
                onFilterChange={handleFilterChange}
                onClearFilters={handleClearFilters}
                showCountryFilter={false}
            />"""

def get_pagination():
    return """
                    {/* Pagination */}
                    {totalItems > 0 && (
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={totalItems}
                            itemsPerPage={itemsPerPage}
                            onPageChange={setCurrentPage}
                            onItemsPerPageChange={(newLimit) => {
                                setItemsPerPage(newLimit);
                                setCurrentPage(1);
                            }}
                        />
                    )}"""

def get_filter_handlers():
    return """
    const handleFilterChange = (newFilters) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
        setCurrentPage(1);
    };

    const handleClearFilters = () => {
        setFilters({
            search: '',
            status: '',
            startDate: '',
            endDate: '',
            country: ''
        });
        setCurrentPage(1);
    };"""

print("Module enhancement script created!")
print(f"Ready to update {len(MODULES)} modules")
print("\nModules to update:")
for folder, endpoint, name, _ in MODULES:
    print(f"  - {name} ({folder})")
