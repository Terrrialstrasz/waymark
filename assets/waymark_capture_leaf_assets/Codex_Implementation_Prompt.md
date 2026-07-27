# Codex Implementation Prompt — Waymark CaptureLeafButton

Implement `CaptureLeafButton` using the approved Waymark design board direction: **Candidate A — Full broad leaf**, inside a mockup-aligned botanical badge.

## Scope
- Visual implementation only.
- Do not redesign the product model.
- Do not create new entities.
- Do not create a new capture flow.
- Do not make the button open camera directly.
- Do not make the button create a Mark directly.

## Product rule
`CaptureLeafButton` is the center action inside `BottomNavigation`.
It opens `CaptureChooser` only.
`CaptureChooser` is where the user chooses `Mark`, `Memory`, or `Backlog`.
Photo/camera is only an optional attachment inside capture, not the main capture action.

## Approved visual direction
Use **Candidate A — Full broad leaf**.
The button should feel like a small botanical seal in a private field journal.

Badge anatomy:
1. Invisible accessible tap target: 56×56px.
2. Visible badge: 44×44px.
3. Warm cream outer ring.
4. Subtle beige outer edge/rim.
5. Deep green enamel inner disc.
6. Soft top-left highlight on inner disc.
7. White dashed circular stitch ring inside green disc.
8. White full broad leaf glyph with green internal vein cuts.
9. Soft badge elevation.
10. Pressed state compresses subtly.

## States to implement
- Idle
- Pressed
- Active sheet-open
- Disabled
- Focus-visible
- Reduced-motion

## Token names to add or map
Use existing Waymark tokens if available. If not available, add semantic `captureLeaf` tokens.

Required tokens:
- `captureLeaf.outerRingLight`
- `captureLeaf.outerRing`
- `captureLeaf.outerRingShadow`
- `captureLeaf.outerRingEdge`
- `captureLeaf.enamelSurface`
- `captureLeaf.enamelDeep`
- `captureLeaf.enamelPressed`
- `captureLeaf.enamelActive`
- `captureLeaf.enamelDisabled`
- `captureLeaf.icon`
- `captureLeaf.vein`
- `captureLeaf.dashRing`
- `captureLeaf.focusRing`
- `captureLeaf.size.visual`
- `captureLeaf.size.tapTarget`
- `captureLeaf.radius.badge`
- `captureLeaf.shadow.idle`
- `captureLeaf.shadow.pressed`
- `captureLeaf.shadow.active`
- `captureLeaf.motion.pressDuration`
- `captureLeaf.motion.releaseDuration`
- `captureLeaf.motion.easing`
- `captureLeaf.motion.pressedScale`
- `captureLeaf.motion.pressedTranslateY`

## Suggested values
- visible badge: `44px`
- tap target: `56px`
- outer ring light: `#FFF8EA`
- outer ring: `#F4EEDC`
- outer ring shadow: `#E6D8BC`
- outer edge: `#D8C9A9`
- enamel surface: `#11712E`
- enamel deep: `#075B24`
- enamel pressed: `#06481D`
- enamel active: `#18813A`
- disabled green: `#9BAA96`
- leaf icon: `#F8F4E8`
- vein cut: `#11712E`
- dash ring: `rgba(248,244,232,.72)`
- pressed transform: `translateY(1px) scale(.975)`

## Accessibility
- Icon-only button must have localized accessible label.
- English label: `Open capture chooser`.
- Vietnamese label: `Mở lựa chọn ghi nhận`.
- Active/open state should expose that Capture Chooser is open.
- Disabled state should be exposed to assistive technology.
- Respect reduced motion.
- Do not mention camera in the button label.

## Component lab / Storybook previews
Add previews for:
1. Isolated badge.
2. Bottom navigation placement.
3. Idle state.
4. Pressed state.
5. Active sheet-open state.
6. Disabled state.
7. Focus-visible state.
8. Reduced-motion state.
9. Size comparison: 40px, 44px, 48px, 64px.
10. Anti-patterns: plus, camera, emoji, oversized FAB.

## Do not implement
- No plus icon.
- No camera icon.
- No emoji leaf.
- No sparkle.
- No bounce.
- No notification badge.
- No oversized floating action button.
- No social compose behavior.
- No direct Mark creation.
- No direct camera opening.

## Acceptance criteria
- Button reads as a botanical seal, not a generic add button.
- Leaf reads as a full broad leaf at 44px.
- Button remains inside bottom navigation.
- Tap opens CaptureChooser only.
- Visual state changes are subtle and calm.
- All final styling uses tokens or mapped existing design system values.
