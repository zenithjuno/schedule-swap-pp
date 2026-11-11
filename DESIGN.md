---
name: "Schedule Swap — Preview Set A"
description: "Library wayfinding clarity for a Thai teacher’s comparison workspace; preview only."
colors:
  primary: "#164b50"
  primary-hover: "#0c3e43"
  nav-hover: "#2b6166"
  nav-active: "#376c70"
  paper: "#e8f3f0"
  surface: "#ffffff"
  surface-wash: "#edf5f3"
  ink: "#20353a"
  ink-soft: "#466068"
  line: "#ccdedb"
  line-strong: "#97b5af"
  control-border: "#789c95"
  focus: "#397f84"
  caveat: "#805116"
  preview-ground: "#f9f4e8"
  danger: "#962b2b"
typography:
  headline:
    fontFamily: "Tahoma, Thonburi, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: 1.4
  title:
    fontFamily: "Tahoma, Thonburi, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.5
  body:
    fontFamily: "Tahoma, Thonburi, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Tahoma, Thonburi, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.55
  table:
    fontFamily: "Tahoma, Thonburi, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.55
  helper:
    fontFamily: "Tahoma, Thonburi, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.55
  print:
    fontFamily: "TH Sarabun New, Sarabun, serif"
rounded:
  control: "7px"
  nav: "8px"
  surface: "12px"
  pill: "999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  workspace: "18px"
  lg: "20px"
  card: "22px"
  page: "24px"
  wide: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "9px 13px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.surface}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    rounded: "{rounded.control}"
    padding: "9px 13px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "9px 10px"
  nav:
    textColor: "#edf7f5"
    rounded: "{rounded.nav}"
    padding: "10px 16px"
  nav-active:
    backgroundColor: "{colors.nav-active}"
    textColor: "{colors.surface}"
  semester-pill:
    textColor: "#eef4f2"
    rounded: "{rounded.pill}"
    padding: "3px 11px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.surface}"
    padding: "22px"
  period-active:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "12px 10px"
  selected-summary:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.surface}"
    padding: "18px 22px"
---

# Design System: Schedule Swap — Preview Set A

## Overview

**Creative North Star: "Library wayfinding clarity"**

This preview uses the clarity of school library signage: a deep teal navigation shell, pale teal ground and white work surfaces. Readable Thai sans text and quiet boundaries keep dates, people and caveats available for comparison. There is no library ornament or new raster imagery.

This is the implemented Set A system in preview/index.html, derived from its final previewUxA screen overrides and inherited controls. It covers the preview shell, entry view and comparison workspace. The stable root index.html retains its existing visual system. Set A is a partial overhaul: later simulation, communication documents and status changes are not implemented by this design record; existing legacy routes can retain older treatments.

**Key Characteristics:**
- Deep teal wayfinding with pale teal and white working surfaces.
- Desktop comparison first; compact, labeled reading blocks on mobile.
- Explicit proposal selection with a lower summary in normal document flow.
- Flat panels, visible keyboard focus and restrained state changes.

## Colors

The primary palette is deep teal, pale teal and white; amber supports caveats and the preview-data context. Frontmatter owns the exact token values.

### Primary
- **Deep Teal** (`primary`): navigation shell, primary buttons, selected text accents and active tabs.
- **Deeper Teal** (`primary-hover`): primary button hover.
- **Wayfinding Teals** (`nav-hover`, `nav-active`): separate hover and current navigation states.
- **Pale Teal** (`paper`, `surface-wash`): page ground, contextual strips, comparison headings and active period background.
- **Focus Teal** (`focus`): keyboard focus outlines.

### Secondary
- **Caveat Amber** (`caveat`, `preview-ground`): preview badge and warm preview context. Candidate caveat text also uses the observed related brown (#795019); it remains subordinate to dates and actions.
- **Destructive Red** (`danger`): inherited destructive-button text, never the primary selection action.

### Neutral
- **White Work Surface** (`surface`): panels, controls and summary band.
- **Dark Thai Ink** (`ink`): body and comparison text.
- **Muted Ink** (`ink-soft`): explanatory text, metadata and field labels.
- **Quiet Boundaries** (`line`, `line-strong`, `control-border`): dividers and controls. Table and period separators use nearby inherited teal-gray shades.

**The Wayfinding Rule.** Use the deep teal shell to orient the user; keep comparison content on light surfaces with dark text.

## Typography

**Display Font:** no separate display face; the interface uses the same workhorse sans stack throughout.
**Body Font:** Tahoma, Thonburi, system-ui, sans-serif.
**Document Font:** TH Sarabun New, Sarabun, serif for document and timetable paper surfaces, including print.

**Character:** practical Thai reading with tabular numerals. Weight and spacing establish hierarchy without expressive display lettering.

### Hierarchy
- **Headline:** page heading; frontmatter role, reduced to (25px) on narrow screens.
- **Title:** card heading; the plan heading is (24px) and comparison heading (23px), both becoming (20px) on mobile.
- **Body:** general screen text. Page introductions use (15px), with a maximum width of (75ch), and become (14px) on mobile.
- **Label:** field labels. Navigation uses (15px, 600), reduced to (12px) on mobile.
- **Table:** dense desktop comparison and dashboard text. Candidate names use (15px, 700), increasing to (16px) on mobile.
- **Helper:** supporting dates, counts and evidence. Existing micro metadata reaches (11px); this is a current density exception, not the recommended size for new reading content.

**The Reading Rule.** Use the Thai workhorse sans stack for the screen interface and retain TH Sarabun New for document and timetable paper surfaces.

## Layout

The main canvas is centered with a maximum width of (1560px), desktop padding (24px 32px 48px). The horizontal header has a brand column (115px) and a flexible navigation column, followed by a full-width context strip. Secondary tabs remain reachable and scroll locally when needed.

The entry view has a left form column (340px) and flexible dashboard, separated by (20px). The comparison workspace has a period rail (235px), flexible comparison panel and (18px) gap. Its five table columns allocate (21%, 16%, 19%, 26%, 18%) to candidate, return period, return week, caveats and action. Expanded evidence stays directly beneath its candidate. The lower selected-proposal band is in normal flow with a top margin (16px); it is not fixed over controls.

Desktop rail and comparison scroll independently. The rail list uses a maximum height of calc(100dvh - 480px) and minimum height (180px); the table uses clamp(220px, calc(100dvh - 560px), 440px). Sticky comparison headers remain within that local region.

At the (1180px) breakpoint, the rail becomes (210px), page side padding (22px), and the comparison table gains minimum width (780px) with local horizontal scrolling. The entry form column becomes (310px).

At the (760px) breakpoint, main padding becomes (20px 16px 36px), entry and workspace stack, and periods form a horizontally scrollable strip of (180px) choices. The comparison becomes labeled reading blocks, each using two columns with candidate, caveats and action spanning both. Its header row is hidden; each field retains its label. The comparison height cap is removed. Slot details stack, and the selected summary stacks its action below the heading. This records the final implementation rather than the earlier table-scroll sketch.

## Elevation & Depth

The new workspace is flat. White panels sit on pale teal; contextual washes, separators and active outlines convey grouping. Cards, buttons and the new comparison surface have no box shadow. Existing legacy overlays are outside this extracted panel system.

**The Flat Surface Rule.** Use tonal grouping and boundaries for the new workspace panels; do not add card shadows to these panels.

## Shapes

Work panels use soft corners (`surface`); buttons, fields and active period choices use tighter corners (`control`). Navigation uses its own slightly softer corners (`nav`). Existing semester context uses a pill (`pill`). Unselected desktop periods are rows with bottom separators, becoming outlined compact tiles on mobile. These are functional containers, without ornamental silhouettes.

## Components

### Buttons
Compact, explicit controls. Primary buttons use Deep Teal and white; secondary buttons use white, Deep Teal text and a thin control boundary. The baseline minimum height is (42px), padding (9px 13px), weight (600), size (13px). Comparison actions adjust to (12px), padding (7px 9px), then (13px) and minimum height (42px) on mobile. Primary hover uses Deeper Teal; secondary hover uses Surface Wash. Disabled controls use a not-allowed cursor; inherited button-specific opacity is (.5), while the general disabled fallback is (.65).

Keyboard focus for buttons, links, summaries, fields and tabbable regions uses a (3px) Focus Teal outline with (3px) offset; the table region uses (2px) offset. The more specific inherited button focus rule retains a (2px) primary outline with (2px) offset.

### Chips
Semester context is an informational pill in the header: translucent white fill and border, pale text and padding (3px 11px). The preview badge is a compact amber label with white text, (6px) corners and padding (2px 10px). These are context labels, not invented filter controls.

### Cards / Containers
White, borderless, flat work panels use the surface corner token. Standard cards have padding (22px), comparison panels (20px) and summary bands (18px 22px). Mobile cards use (20px), comparison panels (16px) and summary bands (18px).

### Inputs / Fields
White fields have a thin Line Strong boundary, control corners, padding (9px 10px), size (15px) and minimum height (44px). Labels sit above fields. Field focus also retains the inherited primary-colored border and (2px) outline at (1px) offset where its more specific selector wins. The return-week select is denser: (12px), minimum height (40px), (6px) corners and padding (6px), growing to (13px) on mobile. Preserve native select behavior.

### Navigation
Horizontal, wrapping primary navigation uses transparent pale-text buttons with a minimum height (44px); hover and current page each have distinct teal fills. Current navigation uses aria-current; secondary tabs use aria-selected and a bottom accent line. Mobile primary navigation stays horizontal and wrapping, with minimum height (42px). Under reduced-motion preference its optional navigation and active-period background transitions are absent; otherwise they use (.16s ease-out). Inherited button state transitions use (.12s).

### Period Rail and Comparison
The active period combines pale background and an inset outline (#73998f), with explicit aria-current. The comparison uses sticky pale teal headings and light row dividers; opening detail adds a light wash. Dates and caveats stay in the comparison while score evidence sits inside expandable details. Warning marks are inline SVG. The view exposes an explicit selection-and-save action; opening detail does not save or approve.

### Selected Proposal Band
A white lower panel shows the current round’s selected proposals, groups expandable details by partner, and links to the existing status register. Its note distinguishes proposals from approval and names communication simulation as future work. Keep the compact heading, count and action visible without overlaying the workspace.

## Do's and Don'ts

### Do:
- Do keep actual dates and caveats visible beside each candidate’s selection action.
- Do retain labeled mobile comparison fields, visible focus and explicit selected states.
- Do keep the selected-proposal summary in document flow below the workspace.
- Do preserve TH Sarabun New on printed document surfaces.

### Don't:
- Don't apply this preview system to the protected stable root page.
- Don't turn previewing, opening details or printing into an approval action.
- Don't add ornamental library illustrations, new raster decoration or synthetic personal data.
- Don't treat legacy typography, glyph decoration or later unbuilt flows as newly approved design rules.

Not canonized: legacy glyph decoration, micro metadata and remaining route-specific treatments are carried by the partial implementation, not a new rule for future screens. The finish review's two material findings were resolved with disposition ship; this document does not claim a new whole-flow review or completion of later sets.
