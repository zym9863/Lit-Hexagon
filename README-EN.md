# Rotating Hexagon Ball Bounce Game

**English | [中文](./README.md)**

A physics simulation game based on Lit framework and Canvas 2D, featuring a ball bouncing inside a rotating hexagon with realistic gravity, friction, and collision bounce effects.

## 🎮 Game Features

- **Realistic Physics Simulation**: Ball falls freely under gravity with velocity decay and energy loss
- **Rotating Wall Interaction**: Hexagon continuously rotates, wall movement affects ball's bounce direction and speed
- **Precise Collision Detection**: Implements accurate collision detection and response between ball and rotating hexagon walls
- **Enhanced Visual Effects**:
  - Motion trail display
  - Collision flash effects
  - Gradient colors and glow effects
  - High DPI screen adaptation

## 🚀 Quick Start

### Prerequisites

- Node.js 18.0 or higher
- pnpm 8.0 or higher

### Install Dependencies

```bash
pnpm install
```

### Development Mode

```bash
pnpm dev
```

Then open http://localhost:5173 in your browser

### Build Production Version

```bash
pnpm build
```

### Preview Production Version

```bash
pnpm preview
```

## 🏗️ Technical Architecture

### Core Technology Stack

- **Lit 3.3**: Web Components framework, responsible for component lifecycle management
- **TypeScript 5.8**: Type-safe JavaScript superset
- **Vite 7.1**: Modern frontend build tool
- **Canvas 2D API**: Game rendering engine

### Project Structure

```
src/
├── components/
│   └── hex-bounce-game.ts    # Main game component
├── physics/
│   ├── vector2.ts            # 2D vector math utilities
│   ├── hex.ts                # Hexagon geometry definition
│   ├── collision.ts          # Collision detection and response
│   └── engine.ts             # Physics engine main loop
├── my-element.ts             # Application entry component
└── index.css                 # Global styles
```

### Physics Engine Features

#### Fixed Time Step
- Uses 120Hz fixed physics update frequency
- Time accumulator handles variable frame rates
- Maximum frame time limit prevents spiral death

#### Collision System
- Hexagon defined using inscribed circle radius (apothem)
- World space normals calculated in real-time
- Multi-face collision iteration processing
- Velocity threshold prevents numerical jitter

#### Physics Parameters

| Parameter | Default Value | Description |
|-----|--------|-----|
| gravity | 1400 px/s² | Gravity acceleration |
| frictionGamma | 0.8 /s | Global velocity decay coefficient |
| restitution | 0.9 | Normal restitution coefficient (elasticity) |
| tangentDamping | 0.98 | Tangential velocity damping |
| rotationSpeed | 0.6 rad/s | Hexagon rotation speed |
| ballRadius | apothem × 0.07 | Ball radius ratio |
| maxSpeed | 2000 px/s | Maximum speed limit |

## 🎨 Game Controls

### Interface Buttons
- **Reset**: Reset ball to initial position
- **Pause/Resume**: Control game running state

### Automatic Behavior
- Auto pause when window loses focus
- Auto resume when window gains focus
- Auto adapt when window size changes

## 🔧 Configuration & Extension

### Custom Physics Parameters

You can adjust physics behavior by modifying component properties:

```typescript
<hex-bounce-game 
  gravity="1600"
  restitution="0.95"
  rotationSpeed="0.8">
</hex-bounce-game>
```

### Performance Optimization

- Vector object reuse reduces GC pressure
- Fixed time step ensures physics stability
- Canvas layer optimization reduces redraw
- RequestAnimationFrame optimizes rendering

## 📝 Development Notes

### Vector Operation Optimization
All vector operations support result object reuse, avoiding frequent creation of temporary objects:

```typescript
// Reuse result object
add(v1, v2, result);  

// Instead of creating new object each time
const result = add(v1, v2);
```

### Collision Response Process
1. Detect penetration depth for all edges
2. Select edge with maximum penetration as collision surface
3. Calculate wall velocity at contact point
4. Decompose relative velocity into normal and tangential components
5. Apply restitution coefficient and damping
6. Compose new velocity vector

### Rendering Optimization
- Use devicePixelRatio for high DPI screen adaptation
- Trail uses alpha decay for fade-out effect
- Collision flash uses exponential decay

## 🐛 Known Issues & Limitations

- Very high speeds may cause penetration (mitigated by speed limiting)
- Slight jitter may occur with multi-face simultaneous collisions (handled by velocity threshold)
- Physics performance may be unstable on very low frame rate devices

## 📄 License

MIT

## 👥 Contributing

Issues and Pull Requests are welcome!

## 🙏 Acknowledgments

- Lit team for the excellent Web Components framework
- Vite team for the efficient build tool