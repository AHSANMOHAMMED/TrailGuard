FULL USE CASE MODEL - not limited to 4 majors
==============================================
01_usecase.puml contains 40+ first-class use cases covering:

PATROL (9): Assign Route, Start, GPS Waypoint, Manual Waypoint, Finish,
  Save Offline, Sync Patrol, View Coverage, Reassign Active Patrol

INCIDENTS (9): Create Incident, Capture Photo, Evidence Omission,
  Manual Location, Save Offline, Sync Complete-Receipt, Review Camera,
  Classify Type, Attach Observation Time

CONFLICT (13): Ingest Collar, Validate Freshness, Assess Risk Zone,
  Create Alert, Update Alert, Submit Community Report, Verify Community,
  Assign Officer, Notify, Acknowledge, Escalate, Close Alert, Delivery State

REPORTING (11): Select Filters, Validate Scope, Query Snapshot,
  Calculate Counts, Calculate Coverage, Calculate Trends,
  Generate Report, Display Cutoff, Export PDF, Export CSV, Empty Result

All ovals INSIDE system boundary. Actors OUTSIDE.
<<include>> and <<extend>> between related use cases.

HOW TO GENERATE:
  https://www.plantuml.com/plantuml/uml/  (paste file)
  draw.io > Arrange > Insert > Advanced > PlantUML
  VS Code PlantUML extension

Also in this folder:
  02_class.puml, 03-06 sequence diagrams
