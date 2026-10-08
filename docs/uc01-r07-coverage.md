# UC01 R-07 Coverage Formula

`coverage% = min(100, round(trackKm / routeKm * 100))`

- `trackKm` — haversine length of recorded waypoints
- `routeKm` — assigned route distance (NB-03 = 7.4 km)
- Gate for Complete: ≥ 95% (`isRouteCovered`)
