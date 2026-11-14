# E3.M2 Feature operations

Axiom Platform **Load Demos → E3.M2 Shaft and Flange** opens a connected single solid with a revolved shaft, an additive flange, an extruded bore, a mirrored bore, circular and linear arrays, and a revolved groove.

To test an edit, open **Linear hole array** in Features and change **Instances including source** from 2 to 3. The model removes another 24π mm³. The initial volume is 27,664.8649075 mm³ and the edited volume is 27,589.4666838 mm³. Save and reopen to verify the operation and resulting solid.

Use a closed sketch to start Extruded Cut, Revolve or Revolved Cut. Revolve takes a construction line in the same sketch and an angle greater than zero up to 360°. A profile crossing the axis, a cut missing its solid and a disconnected result are rejected. Feature mirrors and arrays take a previous extrusion, cut or revolve as their tool. Linear and circular arrays use the X, Y or Z datum directions. A mirror uses a plane normal and an offset. Counts include the source. These operations retain source and base dependencies and currently build one connected body.

Sketch editing preserves the camera through Undo and Redo. Open circular edges have verified identities and can project as arcs or as bounded edge-on spans. The Sketch Manager lists editable operations and their participants, followed by all entities in source order. Individual pattern copies can be removed without changing other instances. Independent mirrors and patterns retain compatible internal relations and have no parent transform. Equation endpoints support dimensions, coincidence and endpoint tangency against lines or circular geometry. Double-click the equation curve to edit it.

Current limits include one connected solid, canonical solid-pattern axes, supported closed line and circular profiles, and endpoint tangency for equation curves. General multibody operation histories and drawings of arbitrary feature chains are subsequent scope.
