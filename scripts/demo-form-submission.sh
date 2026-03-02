#!/usr/bin/env bash
# ─── OrgPilot Demo: Simulate form submissions ───────────────────
# Prerequisites: dev server running at http://localhost:3000
# Usage: bash scripts/demo-form-submission.sh

BASE_URL="${1:-http://localhost:3000}"

echo "============================================"
echo "  OrgPilot — Demo Form Submissions"
echo "============================================"
echo ""

# 1. EVENT_REQUEST
echo "1) Submitting EVENT_REQUEST (Annual Talent Show)..."
curl -s -X POST "$BASE_URL/api/webhooks/forms" \
  -H "Content-Type: application/json" \
  -d '{
    "formType": "EVENT_REQUEST",
    "payload": {
      "title": "Annual Talent Show",
      "description": "Student council talent show. Need stage setup, sound system, 3 judges, and ticket sales. Expected 300 attendees.",
      "requestedBy": "James Chen",
      "preferredDate": "2026-05-20",
      "estimatedAttendees": 300,
      "venue": "Main Auditorium"
    }
  }'
echo ""
echo ""

# 2. FACILITY_ISSUE
echo "2) Submitting FACILITY_ISSUE (Air conditioning in Library)..."
curl -s -X POST "$BASE_URL/api/webhooks/forms" \
  -H "Content-Type: application/json" \
  -d '{
    "formType": "FACILITY_ISSUE",
    "payload": {
      "title": "AC unit broken in Library Wing B",
      "description": "The air conditioning in Library Wing B has not been working for 2 days. Temperature is above 85F. Students are unable to study comfortably.",
      "reportedBy": "Sofia Martinez",
      "location": "Library Wing B, 2nd Floor",
      "urgency": "high"
    }
  }'
echo ""
echo ""

# 3. FINANCE_REQUEST
echo "3) Submitting FINANCE_REQUEST (Club supplies)..."
curl -s -X POST "$BASE_URL/api/webhooks/forms" \
  -H "Content-Type: application/json" \
  -d '{
    "formType": "FINANCE_REQUEST",
    "payload": {
      "title": "Photography Club Equipment Purchase",
      "description": "Requesting $450 for 2 tripods ($120 each) and 1 lighting kit ($210) for the Photography Club spring exhibition.",
      "requestedBy": "Aisha Patel",
      "amount": 450,
      "category": "Club Supplies",
      "dueDate": "2026-03-20"
    }
  }'
echo ""
echo ""

# 4. Check results
echo "============================================"
echo "  Checking results..."
echo "============================================"
echo ""
echo "Tasks:"
curl -s "$BASE_URL/api/tasks" | grep -o '"title":"[^"]*"' | sed 's/"title":/ -/'
echo ""
echo ""
echo "Recent logs:"
curl -s "$BASE_URL/api/logs?limit=5" | grep -o '"actionDescription":"[^"]*"' | sed 's/"actionDescription":/ -/'
echo ""
echo ""
echo "Done! Open $BASE_URL in your browser to see the dashboard."
