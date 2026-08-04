ZDC Breach Report - Revised Summary
===================================

VISIBLE BREACH ANALYSIS
-----------------------

Total Wrong Access Entries: 29
├── Visible in Dashboard (completed): 22
└── NOT Visible (rejected_*): 4

Total Unique Wrong Users: 25
├── Had Visible Breach: 22
└── Only Rejected Claims (no breach): 3
    (Lawanda Rogness, Shakhnoza Bobokhonova, Starla Gatson - each had 1 completed + 1 rejected)

VISIBLE BREACHES BY ORDER
-------------------------

Orders with 1 visible wrong user: 15
Orders with 2 visible wrong users: 4
  - Heidi Carey (2 visible)
  - Varina Winder (2 visible)
  - Naiya Saleem (2 visible)
  - Nicole Leonard (2 visible)
  - Felicia Davis (2 visible)
  - DAmen Wellen (2 visible)

REJECTED CLAIMS TO DELETE (not visible)
---------------------------------------

These claims failed early (Draft Order) and were never shown to users.
They should be DELETED from zero_dollar_claims:

1. Lawanda Rogness - rejected_invalid_user - Order 6895726919724
2. Shakhnoza Bobokhonova - rejected_monthly_limit - Order 6904208752684
3. Starla Gatson - rejected_invalid_user - Order 6906816004140
4. Atalie Pellerito - rejected_invalid_user - Order 6910164992044

FILES
-----

ZDC-breach-report-correct-owners-revised.csv
  - 19 orders with correct owners
  - visible_wrong_access_count: how many had VISIBLE breach

ZDC-breach-report-wrong-access-revised.csv
  - 29 entries (25 unique users)
  - visible_in_dashboard: YES/NO
  - claim_status: completed/rejected_*
  - should_delete: TRUE for rejected claims

RECOMMENDED FIX
--------------

For wrong users with visible breaches (22 entries):
  - Clear their redemption_url (URL becomes empty)
  - Their claim stays on record

For wrong users with rejected claims (4 entries):
  - DELETE the claim record entirely
  - Never exposed, never shown in dashboard

For correct owners (19 orders):
  - Keep their URL as-is (they're the legitimate owner)
