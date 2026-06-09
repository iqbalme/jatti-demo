---
name: Light Blue Corporate Modern
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#424656'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#727687'
  outline-variant: '#c2c6d8'
  surface-tint: '#0054d6'
  primary: '#0050cb'
  on-primary: '#ffffff'
  primary-container: '#0066ff'
  on-primary-container: '#f8f7ff'
  inverse-primary: '#b3c5ff'
  secondary: '#50616b'
  on-secondary: '#ffffff'
  secondary-container: '#d3e5f1'
  on-secondary-container: '#566771'
  tertiary: '#005f89'
  on-tertiary: '#ffffff'
  tertiary-container: '#0079ad'
  on-tertiary-container: '#f3f8ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae1ff'
  primary-fixed-dim: '#b3c5ff'
  on-primary-fixed: '#001849'
  on-primary-fixed-variant: '#003fa4'
  secondary-fixed: '#d3e5f1'
  secondary-fixed-dim: '#b7c9d5'
  on-secondary-fixed: '#0c1e26'
  on-secondary-fixed-variant: '#384953'
  tertiary-fixed: '#c9e6ff'
  tertiary-fixed-dim: '#89ceff'
  on-tertiary-fixed: '#001e2f'
  on-tertiary-fixed-variant: '#004c6e'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 24px
  margin-desktop: 64px
  margin-mobile: 16px
  container-max: 1280px
---

## Brand & Style
The design system is anchored in a philosophy of "Aerated Professionalism." It targets modern enterprise and SaaS platforms that require a balance between high-trust reliability and a fresh, contemporary user experience. The aesthetic is rooted in **Corporate / Modern** principles with a heavy lean towards **Minimalism**. 

The UI should evoke an emotional response of clarity, calmness, and efficiency. By utilizing expansive whitespace and a refined light-blue palette, the design system minimizes cognitive load, allowing users to navigate complex workflows with a sense of ease and precision.

## Colors
The palette is centered around a vibrant, high-energy primary blue that signals action and intelligence. 

- **Primary Blue (#0066FF):** Used for core actions, active states, and brand identifiers.
- **Secondary Sky (#E0F2FE):** A soft, luminous blue used for large surface areas, subtle highlights, and background washes to prevent "stark white" fatigue.
- **Surface Neutrals:** We utilize a range of cool-toned grays (derived from Slate) to maintain a cohesive professional atmosphere. The background is a crisp `#F8FAFC` to ensure the light blue accents feel "airy."

## Typography
This design system utilizes **Inter** exclusively to leverage its systematic, utilitarian nature. The type hierarchy is built on a tight scale to maintain a professional, data-dense environment without feeling cluttered. 

Headlines use a slightly tighter letter-spacing and heavier weights to create an authoritative presence. Body text is optimized for legibility with a generous line-height, while labels utilize medium and semi-bold weights to ensure they stand out in functional UI contexts like navigation and data tables.

## Layout & Spacing
The layout follows a **Fixed Grid** model for desktop to ensure content remains readable on ultra-wide monitors, transitioning to a fluid model for tablet and mobile devices. 

- **Grid:** A 12-column system is used globally.
- **Rhythm:** An 8px linear scale (with 4px increments for micro-adjustments) governs all padding and margins. 
- **Adaptation:** On mobile, margins shrink to 16px and columns collapse to a single-stack layout. High-touch elements like buttons maintain a minimum 44px height regardless of screen size to ensure accessibility.

## Elevation & Depth
Depth in this design system is conveyed through **Tonal Layers** rather than heavy shadows. We use subtle shifts in background color (e.g., moving from `#FFFFFF` to `#F8FAFC`) to indicate hierarchy. 

Where shadows are necessary for floating elements (modals, dropdowns), they are **Ambient Shadows**: extremely diffused, low-opacity (5-10%), and slightly tinted with the primary blue to maintain the "fresh" aesthetic. This creates a soft "lift" effect that feels natural and integrated rather than "pasted on."

## Shapes
The shape language is consistently **Rounded** (Level 2). This choice balances the seriousness of the blue palette with an approachable, modern feel.

- **Standard Components (Buttons, Inputs):** 0.5rem (8px).
- **Large Components (Cards, Containers):** 1rem (16px).
- **Extreme Elements (Banners, Modals):** 1.5rem (24px).

This geometric consistency ensures that even when the content changes, the structural "DNA" of the design system remains recognizable.

## Components
- **Buttons:** Primary buttons use a solid `#0066FF` fill with white text. Secondary buttons use the sky-blue `#E0F2FE` background with primary-colored text. 
- **Input Fields:** Use a subtle 1px border in a mid-tone gray-blue. On focus, the border thickens and glows with a soft primary blue ambient shadow.
- **Cards:** Cards are primarily defined by a 1px border in `#E2E8F0` or a very subtle background shift. This maintains a flat, modern look that avoids the "clutter" of heavy shadows.
- **Chips:** Highly rounded (pill-shaped) with a light blue tint to denote categories or tags without competing with primary action buttons.
- **Lists:** Clean, border-less rows with subtle hover states using the secondary blue color to provide clear feedback.