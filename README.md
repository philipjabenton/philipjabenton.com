# philipjabenton.com

Front-end scripts for [philipjabenton.com](https://philipjabenton.com) — a photography portfolio built on Webflow.

## Overview

This repository hosts the JavaScript files that power the site's interactions and animations. Files are served via jsDelivr CDN and loaded directly into Webflow via Project Settings and Page Settings custom code.

## Tech Stack

- **Platform**: Webflow (Finsweet Client-First conventions)
- **Animation**: GSAP + ScrollTrigger
- **Slider**: Splide JS
- **CDN**: jsDelivr

## File Structure

| File | Scope | Description |
|------|-------|-------------|
| `global.js` | All pages | Nav behaviour, marquee rotator, mobile menu |
| `home.js` | Homepage only | Homepage-specific interactions and sliders |

## Usage

Files are loaded in Webflow via script tags referencing jsDelivr:
```html
<!-- Global — Project Settings footer code -->
<script src="https://cdn.jsdelivr.net/gh/philipjabenton/philipjabenton.com@main/global.js"></script>

<!-- Homepage — Page Settings footer code -->
<script src="https://cdn.jsdelivr.net/gh/philipjabenton/philipjabenton.com@main/home.js"></script>
```

After pushing changes, purge the jsDelivr cache to ensure the latest version is served:

`https://purge.jsdelivr.net/gh/philipjabenton/philipjabenton.com@main/global.js`

## Copyright

© 2026 Philip Benton. All rights reserved. This code is proprietary and may not be reused or redistributed.
