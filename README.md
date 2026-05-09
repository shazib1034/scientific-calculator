# Calculator App

## Overview
This project is a fully functional glassmorphism scientific calculator built with HTML, CSS, and JavaScript. It delivers a premium, futuristic UI inspired by modern macOS widgets while supporting reliable arithmetic and scientific operations in the browser.

## Features
- Premium glassmorphism interface with layered blur, translucent surfaces, and neon accents
- Dark gradient background with animated glow blobs for depth
- Fully responsive layout for desktop and mobile screens
- Basic operations: `+`, `-`, `*`, `/`, `%`, clear (`C`), delete (`DEL`), and equals (`=`)
- Scientific operations: `sin`, `cos`, `tan`, `log`, `ln`, `sqrt`, exponent (`^`), square (`x²`), reciprocal (`1/x`), constants (`π`, `e`), and parentheses
- Graceful error handling for invalid expressions and divide/modulo by zero
- Keyboard support (`0-9`, operators, `.`, `(`, `)`, `^`, `Enter`, `Backspace`, `Escape`)
- Interactive polish: hover lift, press animation, floating card motion, tilt effect, ripple clicks
- Light/dark theme toggle with persisted preference

## Usage
1. Open `index.html` in a web browser.
2. Click buttons (or use your keyboard) to enter numbers, operators, and scientific functions.
3. Press `=` or `Enter` to evaluate the expression.
4. Use `C` to reset all input and `DEL` / `Backspace` to remove the last character.
5. Use the top-right theme toggle to switch between dark and light modes.

## Design Choices
- The UI relies on glassmorphism principles: transparent layers, blur, soft borders, and glowing accents.
- CSS transitions and keyframe animations keep interactions smooth and modern without heavy dependencies.
- Calculator logic uses tokenization + precedence-aware evaluation to avoid direct `eval` usage.
- Scientific expressions are parsed safely using a shunting-yard style pipeline (tokens -> RPN -> evaluation).

## Project Structure
- `index.html` - semantic calculator layout and controls
- `css/styles.css` - glassmorphism visuals, responsive styles, and animations
- `js/script.js` - calculator state management, expression evaluation, keyboard support, and UI interactions