# E3.M1 extended sketch tools

**Load Demos → E3.M1 Extended Sketches** includes an exact half-round solid and a separate **Extended sketch practice** feature. The solid is a 16 mm radius semicircular profile extruded 8 mm. Edit the practice sketch to try the operations without changing the solid.

- **Arc** uses three clicks for center, start and end. The **Major arc** option takes the complementary sweep. Endpoints, center, radius and diameter have semantic references. **Polygon** uses a center, first vertex and 3–12 sides. Its connected edges use a construction circle and equality relations.
- **Trim** removes the clicked interval of a line or arc between analytic intersections or between an intersection and the endpoint. Click on the horizontal practice line to the right of the vertical cutting line. **Split** keeps both pieces and joins them at the clicked point. Surviving endpoint references keep their role on the correct segment. The edit is refused if it would remove a referenced endpoint or invalidate a driver such as the original segment length.
- Select entities before opening **Mirror entities** or **Sketch pattern**. Use the separate construction line as a mirror axis. Mirror creates symmetry relations. Linear and circular patterns create independent editable copies in one transaction. Count includes the original.
- Symmetry accepts two selected points and then a line axis. Arc/circle relations reuse the real solver. Tangency to an arc checks that the contact lies on its sweep. Existing line angle, parallel, perpendicular and equal relations remain available.

Model and semantic tool mutations use the same checked worker and history. Exact mixed contours use OCCT arcs and an independent area, perimeter and centroid calculation. This stage retains the existing Drawing projection scope. The default sheet generator can still reject partial circular outlines. Assembly, general feature patterns and machining documentation are separate milestones.

Browser acceptance creates an arc and polygon, trims and splits, mirrors, patterns and saves/reopens. Domain acceptance checks DOF, constrained drag, dependent relations, conflicting arc tangency and independent exact solid measurements.
