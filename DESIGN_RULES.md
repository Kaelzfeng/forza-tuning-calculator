# Frontend Design Rules

## Project Style

This project is a modern Forza tuning calculator website.

Main visual direction:
- White / light Liquid Glass style
- Clean SaaS tool website
- Apple / Linear / Raycast inspired
- Premium, calm, lightweight, readable
- No dark cyberpunk style
- No cheap gaming website style
- No heavy gray text everywhere

## Color Rules

Text:
- Main text should be near black: #111827
- Secondary text can use #374151
- Weak text can use #6B7280 only when necessary
- Do not use large blocks of low-contrast gray text

Background:
- Prefer #FFFFFF, #F8FAFC, #F9FAFB
- Subtle gradients are allowed
- Avoid dark backgrounds

Accent:
- Use black, soft blue, soft purple, or brand accent carefully
- Do not use too many colors on one page

## Layout Rules

- Max content width: 1120px or 1200px
- Use generous spacing
- Every page needs clear visual hierarchy
- Sections should have breathing room
- Avoid cramped layouts
- Avoid too many borders
- Prefer clean cards with subtle shadow and soft background

## Border Radius Rules

Use consistent radius:
- Large cards: 24px
- Medium cards: 18px
- Small controls: 14px
- Pills/buttons: 999px when appropriate

Important:
- Outer radius = inner radius + padding
- Example: 24px outer radius, 16px inner radius, 8px padding

## Card Rules

Cards should feel premium:
- White or translucent white background
- Subtle border: rgba(17, 24, 39, 0.08)
- Soft shadow
- Light hover movement only
- No heavy black shadow
- No cheap neon effects

## Button Rules

Buttons need clear hierarchy:
- Primary button should be obvious
- Secondary button should be lighter
- Buttons must have hover and active states
- Minimum mobile height: 44px
- Do not make buttons look like plain text unless intentional

## Form Rules

Calculator inputs should feel like a professional settings panel:
- Clear labels
- Comfortable spacing
- Visible focus state
- Inputs should not feel gray and disabled
- Mobile input fields must be easy to tap

## Vehicle Card Rules

Vehicle cards should not depend on images.
They should work as clean text cards:
- Strong vehicle name
- Clear manufacturer / country / class / drivetrain information
- Tags should be readable
- Hover effect should be subtle
- Mobile layout should be one column

## Mobile Rules

Mobile is important:
- Cards should stack in one column
- Buttons and inputs must be at least 44px high
- Font size should not be smaller than 14px for important content
- Avoid horizontal scrolling
- Calculator result area should appear clearly below input area

## Animation Rules

- Use subtle transitions only
- No excessive animation
- Hover movement should be small
- Avoid distracting effects

## Do Not Do

- Do not change business logic
- Do not change Supabase queries
- Do not change routes
- Do not delete features
- Do not add large UI libraries
- Do not create a dark gaming/cyberpunk design
- Do not make the website look like an admin dashboard
- Do not use large gray unreadable text
