#!/bin/bash
# Batch script to help identify stats card patterns across modules

echo "=== Finding Stats Card Patterns ==="
echo ""

echo "Events List:"
grep -n "StatsCard" client/src/pages/Events/EventsList.jsx | head -5

echo ""
echo "Scholars List:"
grep -n "StatsCard" client/src/pages/Scholars/ScholarsList.jsx | head -5

echo ""
echo "Student Exchange List:"
grep -n "StatsCard" client/src/pages/StudentExchange/StudentExchangeList.jsx | head -5

echo ""
echo "Memberships List:"
grep -n "StatsCard" client/src/pages/Memberships/MembershipsList.jsx | head -5
