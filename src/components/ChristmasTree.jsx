/**
 * Interactive Christmas Tree with Hand Gesture Control
 * Features: 3D Christmas tree, spiral galaxy transformation, heart shape mode
 * 
 * Copyright (c) 2025 A-WF
 * GitHub: https://github.com/a-wf
 * 
 * Licensed under the MIT License
 */

import React, { useRef, useMemo, useEffect, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'

// Base URL for assets (handles GitHub Pages paths)
const BASE_URL = import.meta.env.BASE_URL || '/'

// Configuration
const CONFIG = {
  TREE_POINTS: 50000,
  GROUND_POINTS: 4000,
  STAR_POINTS: 1200,
  HEART_POINTS: 1000,
  SNOW2D_POINTS: 10,
  TREE_HEIGHT: 12.0,
  CAM_DIST: 27,
  CAM_HEIGHT: 5.0,
  PITCH: -0.25,
}

// Color themes
const COLOR_THEMES = {
  classic: {
    name: 'Pink & White',
    tree: { deep: [255, 60, 180], medium: [255, 100, 190], light: [255, 160, 200], white: true },
    ground: { r: [100, 150], g: [150, 200], b: 255 },
    heart: [255, 220, 50],
    stars: [215, 255],
    music: `${BASE_URL}calm-christmas-piano-262888.mp3`,
  },
  traditional: {
    name: 'Christmas Green',
    tree: { deep: [0, 80, 0], medium: [34, 139, 34], light: [50, 150, 50], white: true },
    ground: { r: [34, 80], g: [80, 120], b: [34, 60] },
    heart: [255, 215, 0],
    stars: [200, 255],
    music: `${BASE_URL}we-wish-you-a-merry-christmas-452819.mp3`,
  },
  red: {
    name: 'Vermillion Red',
    tree: { deep: [220, 20, 60], medium: [255, 47, 0], light: [255, 99, 71], white: false },
    ground: { r: [139, 200], g: [0, 50], b: [0, 30] },
    heart: [255, 215, 0],
    stars: [255, 200],
    music: `${BASE_URL}merry-christmas-261280.mp3`,
  },
  blue: {
    name: 'Ice Blue',
    tree: { deep: [0, 100, 255], medium: [50, 150, 255], light: [100, 200, 255], white: true },
    ground: { r: [0, 50], g: [50, 150], b: 255 },
    heart: [255, 255, 200],
    stars: [150, 255],
    music: `${BASE_URL}winter-day-christmas-holidays-270802.mp3`,
  },
  purple: {
    name: 'Purple Dream',
    tree: { deep: [138, 43, 226], medium: [147, 112, 219], light: [186, 85, 211], white: false },
    ground: { r: [75, 150], g: [0, 80], b: [130, 255] },
    heart: [255, 215, 0],
    stars: [180, 255],
    music: `${BASE_URL}christmas-jazz-short-450773.mp3`,
  },
}

// Generate tree particles with dual positions (tree + scatter)
function generateTreePoints(theme) {
  const points = []
  const loops = 9
  const spiralN = Math.floor(CONFIG.TREE_POINTS * 0.7)
  const colors = theme.tree

  // 70% spiral lights
  for (let i = 0; i < spiralN; i++) {
    const u = Math.random()
    const h = Math.pow(u, 1.6)
    const y = CONFIG.TREE_HEIGHT * h + 0.2

    let baseR = Math.pow(1 - h, 1.1) * 3.2
    const branchWave = Math.max(0, Math.sin((h * 5.8 + 0.15) * Math.PI * 2))
    const branchFactor = 1.0 + 0.65 * branchWave
    baseR *= branchFactor

    const t = u * loops * Math.PI * 2
    const angle = t + (Math.random() - 0.5) * 0.44
    const r = baseR * (0.85 + Math.random() * 0.23)

    const x = Math.cos(angle) * r
    const z = Math.sin(angle) * r

    // Calculate scatter position (tight galaxy spiral arms)
    const armIndex = Math.floor(Math.random() * 2) // 2 spiral arms
    const armAngleOffset = armIndex * Math.PI
    const distFromCenter = 2 + Math.random() * 12 // Tighter radius
    const spiralTightness = 0.5 // Tighter spiral
    const armAngle = armAngleOffset + spiralTightness * distFromCenter + (Math.random() - 0.5) * 0.4
    
    const scatterPos = [
      Math.cos(armAngle) * distFromCenter + (Math.random() - 0.5) * 1.0,
      -2 + (Math.random() - 0.5) * 0.4, // Thinner disc
      Math.sin(armAngle) * distFromCenter + (Math.random() - 0.5) * 1.0
    ]

    let color
    const colorRand = Math.random()
    // Add tiny red dots for traditional theme
    if (colors.deep[0] === 0 && colors.deep[1] === 80 && colors.deep[2] === 0 && colorRand < 0.10) {
      // Small chance of red dots for traditional green theme only
      color = new THREE.Color(200/255, 20/255, 20/255)
    } else if (colorRand < 0.15) {
      // Deep color
      const [r, g, b] = colors.deep
      color = new THREE.Color(r/255, (g + Math.random() * 20)/255, (b + Math.random() * 20)/255)
    } else if (colorRand < 0.3) {
      // Medium color
      const [r, g, b] = colors.medium
      color = new THREE.Color(r/255, (g + Math.random() * 20)/255, (b + Math.random() * 20)/255)
    } else if (colorRand < 0.45) {
      // Light color
      const [r, g, b] = colors.light
      color = new THREE.Color(r/255, (g + Math.random() * 20)/255, (b + Math.random() * 20)/255)
    } else {
      // White (increased probability)
      if (colors.white) {
        // For traditional theme, use deeper green instead of white
        if (colors.deep[0] === 0 && colors.deep[1] === 80 && colors.deep[2] === 0) {
          // Traditional green theme only - use much deeper green
          const brightness = Math.floor(Math.random() * 25 + 60)
          color = new THREE.Color(brightness * 0.15/255, brightness/255, brightness * 0.15/255)
        } else {
          // Other themes - use normal white
          const brightness = Math.floor(Math.random() * 50 + 205)
          color = new THREE.Color(brightness/255, brightness/255, brightness/255)
        }
      } else {
        const [r, g, b] = colors.light
        color = new THREE.Color((r + 30)/255, (g + 30)/255, (b + 30)/255)
      }
    }

    points.push({ position: [x, y, z], scatterPos, color })
  }

  // 30% fill
  const fillN = CONFIG.TREE_POINTS - spiralN
  for (let i = 0; i < fillN; i++) {
    const h = Math.pow(Math.random(), 1.9)
    const y = CONFIG.TREE_HEIGHT * h + 0.2 + (Math.random() - 0.5) * 0.16

    let baseR = Math.pow(1 - h, 1.1) * 4.3
    const branchWave = Math.max(0, Math.sin((h * 5.8 + 0.15) * Math.PI * 2))
    const branchFactor = 1.0 + 0.65 * branchWave
    baseR *= branchFactor

    const r = baseR * Math.sqrt(Math.random())
    const angle = Math.random() * Math.PI * 2

    const x = Math.cos(angle) * r + (Math.random() - 0.5) * 0.16
    const z = Math.sin(angle) * r + (Math.random() - 0.5) * 0.16

    // Calculate scatter position (extremely tight galaxy spiral arms)
    const armIndex = Math.floor(Math.random() * 2) // 2 spiral arms
    const armAngleOffset = armIndex * Math.PI
    // Weight distribution towards center - more points in inner region
    const distRandom = Math.random()
    const distFromCenter = distRandom < 0.5 ? 0.3 + Math.random() * 3 : 3 + Math.random() * 8
    const spiralTightness = 2.5 // Even tighter spiral
    const armAngle = armAngleOffset + spiralTightness * distFromCenter + (Math.random() - 0.5) * 0.1
    
    const scatterPos = [
      Math.cos(armAngle) * distFromCenter + (Math.random() - 0.5) * 0.15,
      -2 + (Math.random() - 0.5) * 0.12, // Flatter
      Math.sin(armAngle) * distFromCenter + (Math.random() - 0.5) * 0.15
    ]

    // Generate heart position (3D heart shape) - elevated to star level
    const t = Math.random() * Math.PI * 2
    const heartScale = 3.0
    const heartX = heartScale * 16 * Math.pow(Math.sin(t), 3)
    const heartY = heartScale * (13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t))
    const heartZ = (Math.random() - 0.5) * 2.0
    const heartPos = [heartX / 16, heartY / 16 + 12, heartZ] // +12 to elevate higher, stars inside heart

    let color
    const colorRand = Math.random()
    if (colorRand < 0.25) {
      const [r, g, b] = colors.deep
      color = new THREE.Color(r/255, (g + Math.random() * 20)/255, (b + Math.random() * 20)/255)
    } else if (colorRand < 0.5) {
      const [r, g, b] = colors.medium
      color = new THREE.Color(r/255, (g + Math.random() * 20)/255, (b + Math.random() * 20)/255)
    } else if (colorRand < 0.75) {
      const [r, g, b] = colors.light
      color = new THREE.Color(r/255, (g + Math.random() * 20)/255, (b + Math.random() * 20)/255)
    } else {
      if (colors.white) {
        // For traditional theme, use deeper green instead of white
        if (colors.deep[0] === 0 && colors.deep[1] === 80 && colors.deep[2] === 0) {
          // Traditional green theme only - use deeper green
          const brightness = Math.floor(Math.random() * 30 + 100)
          color = new THREE.Color(brightness * 0.2/255, brightness/255, brightness * 0.2/255)
        } else {
          // Other themes - use normal white
          const brightness = Math.floor(Math.random() * 50 + 205)
          color = new THREE.Color(brightness/255, brightness/255, brightness/255)
        }
      } else {
        const [r, g, b] = colors.light
        color = new THREE.Color((r + 40)/255, (g + 40)/255, (b + 40)/255)
      }
    }

    points.push({ position: [x, y, z], scatterPos, heartPos, color })
  }

  return points
}

// Generate ground particles
function generateGroundPoints(theme) {
  const points = []
  const rings = [4.6, 6.0, 7.4, 8.8, 10.2, 11.4]
  const ground = theme.ground

  for (let i = 0; i < CONFIG.GROUND_POINTS; i++) {
    const ring = rings[Math.floor(Math.random() * rings.length)]
    const r = ring + (Math.random() - 0.5) * 0.6
    const theta = Math.random() * Math.PI * 2
    const x = Math.cos(theta) * r
    const z = Math.sin(theta) * r
    const y = -0.25

    // Scatter position - ultra-tight spiral with bright core
    const useCenter = Math.random() < 0.85 // 85% in center and inner spiral
    let scatterPos
    
    if (useCenter) {
      // Bright dense core - slightly larger for more visible density
      const rCore = Math.random() * Math.random() * 2.0 // Dense but visible core
      const thetaCore = Math.random() * Math.PI * 2
      scatterPos = [
        Math.cos(thetaCore) * rCore,
        -2 + (Math.random() - 0.5) * 0.2,
        Math.sin(thetaCore) * rCore
      ]
    } else {
      // Tight spiral arms extending from core
      const armIndex = Math.floor(Math.random() * 2)
      const armAngleOffset = armIndex * Math.PI
      const distFromCenter = 1.5 + Math.random() * 9
      const spiralTightness = 2.3 // Even tighter spiral
      const armAngle = armAngleOffset + spiralTightness * distFromCenter + (Math.random() - 0.5) * 0.1
      
      scatterPos = [
        Math.cos(armAngle) * distFromCenter + (Math.random() - 0.5) * 0.2,
        -2 + (Math.random() - 0.5) * 0.15,
        Math.sin(armAngle) * distFromCenter + (Math.random() - 0.5) * 0.2
      ]
    }

    // Generate heart position for ground particles - elevated to star level
    const t = Math.random() * Math.PI * 2
    const heartScale = 3.0
    const heartX = heartScale * 16 * Math.pow(Math.sin(t), 3)
    const heartY = heartScale * (13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t))
    const heartZ = (Math.random() - 0.5) * 2.0
    const heartPos = [heartX / 16, heartY / 16 + 12, heartZ] // +12 to elevate higher, stars inside heart

    const colorRand = Math.random()
    let color
    if (colorRand < 0.3) {
      const r = Math.floor(Math.random() * (ground.r[1] - ground.r[0]) + ground.r[0])
      const g = Math.floor(Math.random() * (ground.g[1] - ground.g[0]) + ground.g[0])
      const b = Array.isArray(ground.b) ? Math.floor(Math.random() * (ground.b[1] - ground.b[0]) + ground.b[0]) : ground.b
      color = new THREE.Color(r/255, g/255, b/255)
    } else if (colorRand < 0.6) {
      const r = Math.floor(Math.random() * 30 + ground.r[0])
      const g = Math.floor(Math.random() * 40 + ground.g[0])
      const b = Array.isArray(ground.b) ? ground.b[1] : ground.b
      color = new THREE.Color(r/255, g/255, b/255)
    } else {
      const r = Math.floor(Math.random() * 30 + Math.min(150, ground.r[1]))
      const g = Math.floor(Math.random() * 30 + Math.min(200, ground.g[1]))
      const b = Array.isArray(ground.b) ? ground.b[1] : ground.b
      color = new THREE.Color(r/255, g/255, b/255)
    }

    points.push({ position: [x, y, z], scatterPos, heartPos, color })
  }

  return points
}

// Generate star points
function generateStarPoints(theme) {
  const points = []
  const [min, max] = theme.stars
  
  // Create small hearts scattered around - each heart is made of multiple particles
  const numHearts = 15 // Number of small hearts
  const particlesPerHeart = Math.floor(CONFIG.STAR_POINTS / numHearts)
  
  for (let h = 0; h < numHearts; h++) {
    // Random position for each small heart
    const heartCenterX = (Math.random() - 0.5) * 30
    const heartCenterY = 5 + Math.random() * 10
    const heartCenterZ = (Math.random() - 0.5) * 30
    const heartScale = 0.5 + Math.random() * 0.5 // Small hearts
    
    for (let i = 0; i < particlesPerHeart; i++) {
      // Original star position
      const x = (Math.random() - 0.5) * 36
      const z = (Math.random() - 0.5) * 36
      const y = 3 + Math.random() * 15

      // Keep stars in place during scatter mode
      const scatterPos = [x, y, z]
      
      // Heart outline position - particles form heart shape
      const t = (i / particlesPerHeart) * Math.PI * 2
      const heartX = heartScale * 16 * Math.pow(Math.sin(t), 3)
      const heartY = heartScale * (13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t))
      const heartPos = [
        heartX / 16 + heartCenterX,
        heartY / 16 + heartCenterY,
        heartCenterZ
      ]

      const base = Math.floor(Math.random() * (max - min) + min)
      const color = new THREE.Color(base/255, base/255, 255/255)

      points.push({ position: [x, y, z], scatterPos, heartPos, color })
    }
  }

  return points
}

// Generate star mesh (actual 3D star geometry, not particles)
function StarMesh({ theme }) {
  const starRef = useRef()
  const [r, g, b] = theme.heart
  
  const starGeometry = useMemo(() => {
    const shape = new THREE.Shape()
    const outerRadius = 0.55
    const innerRadius = 0.22
    const numPoints = 5
    
    for (let i = 0; i < numPoints * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius
      const angle = (i * Math.PI) / numPoints - Math.PI / 2
      const x = Math.cos(angle) * radius
      const y = Math.sin(angle) * radius
      if (i === 0) shape.moveTo(x, y)
      else shape.lineTo(x, y)
    }
    shape.closePath()
    
    const extrudeSettings = {
      depth: 0.22,
      bevelEnabled: true,
      bevelThickness: 0.07,
      bevelSize: 0.07,
      bevelSegments: 4
    }
    
    return new THREE.ExtrudeGeometry(shape, extrudeSettings)
  }, [])
  
  const starColor = useMemo(() => new THREE.Color(r/255, g/255, b/255), [r, g, b])
  const emissiveColor = useMemo(() => new THREE.Color(
    Math.max(0, r - 50)/255, 
    Math.max(0, g - 50)/255, 
    Math.max(0, b - 50)/255
  ), [r, g, b])
  
  // Gentle rotation animation
  useFrame((state) => {
    if (starRef.current) {
      starRef.current.rotation.z += 0.005
    }
  })
  
  return (
    <group position={[0, CONFIG.TREE_HEIGHT + 0.4, 0]}>
      <mesh ref={starRef} geometry={starGeometry} rotation={[0, 0, Math.PI]}>
        <meshStandardMaterial
          color={starColor}
          emissive={emissiveColor}
          emissiveIntensity={1.8}
          metalness={0.8}
          roughness={0.15}
        />
      </mesh>
      
      {/* Outer glow star */}
      <mesh geometry={starGeometry} rotation={[0, 0, Math.PI]} position={[0, 0, -0.12]} scale={1.08}>
        <meshBasicMaterial
          color={0xffff00}
          transparent={true}
          opacity={0.2}
        />
      </mesh>
      
      {/* Point light at star */}
      <pointLight
        position={[0, 0, 0.3]}
        color={starColor}
        intensity={2.5}
        distance={12}
      />
    </group>
  )
}

// Generate heart points - REMOVED, replaced by StarMesh
function generateHeartPoints(theme) {
  return [] // No longer using particle-based star
}

// Particle system component with animation
function Particles({ points, mode }) {
  const meshRef = useRef()
  const positionsRef = useRef(null)

  const [colors] = useMemo(() => {
    const colors = new Float32Array(points.length * 3)

    points.forEach((p, i) => {
      colors[i * 3] = p.color.r
      colors[i * 3 + 1] = p.color.g
      colors[i * 3 + 2] = p.color.b
    })

    return [colors]
  }, [points])

  // Initialize positions
  useMemo(() => {
    const positions = new Float32Array(points.length * 3)
    points.forEach((p, i) => {
      positions[i * 3] = p.position[0]
      positions[i * 3 + 1] = p.position[1]
      positions[i * 3 + 2] = p.position[2]
    })
    positionsRef.current = positions
    return positions
  }, [points])

  // Animate positions based on mode
  useFrame((state, delta) => {
    if (meshRef.current && positionsRef.current) {
      const geometry = meshRef.current.geometry
      const positions = geometry.attributes.position.array
      const lerpSpeed = 2.0 * delta

      points.forEach((p, i) => {
        const idx = i * 3
        let targetX, targetY, targetZ

        if (mode === 'HEART' && p.heartPos) {
          // Heart mode - move to heart shape
          targetX = p.heartPos[0]
          targetY = p.heartPos[1]
          targetZ = p.heartPos[2]
        } else if (mode === 'SCATTER' && p.scatterPos) {
          // Scatter mode - move to sphere positions
          targetX = p.scatterPos[0]
          targetY = p.scatterPos[1]
          targetZ = p.scatterPos[2]
        } else {
          // Tree mode - return to tree positions
          targetX = p.position[0]
          targetY = p.position[1]
          targetZ = p.position[2]
        }

        // Lerp to target position
        positions[idx] += (targetX - positions[idx]) * lerpSpeed
        positions[idx + 1] += (targetY - positions[idx + 1]) * lerpSpeed
        positions[idx + 2] += (targetZ - positions[idx + 2]) * lerpSpeed
      })

      geometry.attributes.position.needsUpdate = true
    }
  })

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positionsRef.current ? positionsRef.current.length / 3 : 0}
          array={positionsRef.current}
          itemSize={3}
          usage={THREE.DynamicDrawUsage}
        />
        <bufferAttribute
          attach="attributes-color"
          count={colors.length / 3}
          args={[colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial size={0.2} vertexColors={true} sizeAttenuation={true} transparent={true} opacity={0.95} />
    </points>
  )
}

// Snowflakes component (2D overlay, no Three.js hooks)
function Snowflakes() {
  const [flakes, setFlakes] = useState(() => {
    return Array.from({ length: CONFIG.SNOW2D_POINTS }, () => ({
      x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1600),
      y: -80 - Math.random() * 70,
      radius: 10 + Math.random() * 6,
      speed: 30 + Math.random() * 15,
    }))
  })

  useEffect(() => {
    let animationId
    let lastTime = Date.now()

    const animate = () => {
      const now = Date.now()
      const delta = (now - lastTime) / 1000
      lastTime = now

      setFlakes((prev) =>
        prev.map((flake) => {
          let newY = flake.y + flake.speed * delta
          let newX = flake.x

          if (newY > window.innerHeight + 50) {
            newY = -80 - Math.random() * 70
            newX = Math.random() * window.innerWidth
          }

          return { ...flake, x: newX, y: newY }
        })
      )

      animationId = requestAnimationFrame(animate)
    }

    animationId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationId)
  }, [])

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 100,
      }}
    >
      {flakes.map((flake, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: flake.x,
            top: flake.y,
            width: flake.radius * 2,
            height: flake.radius * 2,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.3) 50%, transparent 70%)',
            boxShadow: '0 0 10px rgba(255,255,255,0.5)',
          }}
        />
      ))}
    </div>
  )
}

// Scene setup
function Scene({ currentTheme, gestureState }) {
  const groupRef = useRef()
  const { camera } = useThree()
  const [seed, setSeed] = useState(0)

  const theme = COLOR_THEMES[currentTheme]
  const treePoints = useMemo(() => generateTreePoints(theme), [seed, currentTheme])
  const groundPoints = useMemo(() => generateGroundPoints(theme), [seed, currentTheme])
  const starPoints = useMemo(() => generateStarPoints(theme), [seed, currentTheme])

  useEffect(() => {
    camera.position.set(0, CONFIG.CAM_HEIGHT + 4, CONFIG.CAM_DIST+5)
    camera.rotation.x = CONFIG.PITCH
  }, [camera])

  useFrame((state, delta) => {
    if (groupRef.current && gestureState) {
      // Gesture-based rotation
      const threshold = 0.3
      const speed = 1.2
      
      if (gestureState.mode === 'SCATTER' && gestureState.hand.detected) {
        // Edge rotation control
        if (gestureState.hand.x > threshold) {
          gestureState.rotation.y += speed * delta * (gestureState.hand.x - threshold)
        } else if (gestureState.hand.x < -threshold) {
          gestureState.rotation.y += speed * delta * (gestureState.hand.x + threshold)
        }
        
        if (gestureState.hand.y > threshold) {
          gestureState.rotation.x += speed * delta * (gestureState.hand.y - threshold)
        } else if (gestureState.hand.y < -threshold) {
          gestureState.rotation.x += speed * delta * (gestureState.hand.y + threshold)
        }
      } else if (gestureState.mode === 'TREE') {
        // Gentle auto-rotation in tree mode (closed fist gesture)
        gestureState.rotation.y += 0.15 * delta
        gestureState.rotation.x += (0 - gestureState.rotation.x) * 2.0 * delta
      } else if (gestureState.mode === 'HEART') {
        // Slow rotation in heart mode
        gestureState.rotation.y += 0.1 * delta
        gestureState.rotation.x += (0 - gestureState.rotation.x) * 1.5 * delta
      } else {
        // Slow drift in scatter mode
        gestureState.rotation.y += 0.05 * delta
      }
      
      groupRef.current.rotation.y = gestureState.rotation.y
      groupRef.current.rotation.x = gestureState.rotation.x
    } else if (groupRef.current) {
      // Fallback rotation when no gesture
      groupRef.current.rotation.y += 0.002
    }
  })

  return (
    <group ref={groupRef} position={[0, -5.5, 0]}>
      <Particles points={treePoints} mode={gestureState?.mode || 'TREE'} />
      <Particles points={groundPoints} mode={gestureState?.mode || 'TREE'} />
      <Particles points={starPoints} mode={gestureState?.mode || 'TREE'} />
      <StarMesh theme={theme} />
      
      <ambientLight intensity={0.8} />
      <pointLight position={[10, 10, 10]} intensity={1.5} />
      <pointLight position={[-10, 5, -10]} color="#6688ff" intensity={0.8} />
    </group>
  )
}

// Main component
export default function ChristmasTree() {
  const [currentTheme, setCurrentTheme] = useState(() => {
    const saved = localStorage.getItem('christmasTheme')
    return (saved && COLOR_THEMES[saved]) ? saved : 'classic'
  })
  const [userName, setUserName] = useState(() => {
    return localStorage.getItem('christmasName') || ''
  })
  
  // Gesture state
  const [gestureState] = useState({
    mode: 'TREE', // TREE, SCATTER, HEART
    hand: { detected: false, x: 0, y: 0 },
    rotation: { x: 0, y: 0 }
  })
  const [gestureHint, setGestureHint] = useState('Initializing camera...')
  const [cameraActive, setCameraActive] = useState(false)
  const [isMusicPlaying, setIsMusicPlaying] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const audioRef = useRef(null)
  const videoRef = useRef(null)
  const handLandmarkerRef = useRef(null)
  const lastVideoTimeRef = useRef(-1)
  const userInteractedRef = useRef(false)

  // Auto-play music on load and on first user interaction
  useEffect(() => {
    const tryAutoPlay = () => {
      if (audioRef.current && !userInteractedRef.current) {
        audioRef.current.play()
          .then(() => {
            setIsMusicPlaying(true)
            userInteractedRef.current = true
            console.log('Music auto-playing')
          })
          .catch(err => {
            console.log('Autoplay blocked, waiting for user interaction:', err)
            setIsMusicPlaying(false)
          })
      }
    }

    // Try immediate autoplay
    const timer = setTimeout(tryAutoPlay, 100)

    // Also try on first user interaction
    const handleInteraction = () => {
      if (!userInteractedRef.current && audioRef.current) {
        audioRef.current.play()
          .then(() => {
            setIsMusicPlaying(true)
            userInteractedRef.current = true
            console.log('Music started after user interaction')
          })
          .catch(err => console.log('Play failed:', err))
      }
    }

    // Listen for any user interaction
    document.addEventListener('click', handleInteraction, { once: true })
    document.addEventListener('keydown', handleInteraction, { once: true })
    document.addEventListener('touchstart', handleInteraction, { once: true })

    return () => {
      clearTimeout(timer)
      document.removeEventListener('click', handleInteraction)
      document.removeEventListener('keydown', handleInteraction)
      document.removeEventListener('touchstart', handleInteraction)
    }
  }, [isMusicPlaying])

  // Initialize MediaPipe
  useEffect(() => {
    let animationId
    
    async function initMediaPipe() {
      try {
        // Load MediaPipe
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        )
        
        handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        })
        
        // Start webcam
        if (navigator.mediaDevices?.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true })
          if (videoRef.current) {
            videoRef.current.srcObject = stream
            
            // Auto-play music after camera permission is granted
            setTimeout(() => {
              if (audioRef.current) {
                // Check if audio is actually playing
                if (audioRef.current.paused) {
                  audioRef.current.play()
                    .then(() => {
                      setIsMusicPlaying(true)
                      userInteractedRef.current = true
                      console.log('Music started after camera permission granted')
                    })
                    .catch(err => console.log('Music play failed:', err))
                }
              }
            }, 500)

            // Wait for video to be ready
            videoRef.current.addEventListener('loadeddata', () => {
              setCameraActive(true)
              setGestureHint('Waiting for hand...')
              
              // Start detection loop after video is ready
              const detectGestures = () => {
                if (videoRef.current && videoRef.current.currentTime !== lastVideoTimeRef.current) {
                  lastVideoTimeRef.current = videoRef.current.currentTime
                  
                  if (handLandmarkerRef.current) {
                    try {
                      const result = handLandmarkerRef.current.detectForVideo(
                        videoRef.current,
                        performance.now()
                      )
                      processGestures(result)
                    } catch (err) {
                      console.error('Detection error:', err)
                    }
                  }
                }
                animationId = requestAnimationFrame(detectGestures)
              }
              detectGestures()
            })
          }
        }
      } catch (error) {
        console.error('MediaPipe init error:', error)
        setGestureHint('Camera unavailable')
      }
    }
    
    function processGestures(result) {
      if (result.landmarks && result.landmarks.length > 0) {
        gestureState.hand.detected = true
        const lm = result.landmarks[0]
        gestureState.hand.x = (lm[9].x - 0.5) * 2
        gestureState.hand.y = (lm[9].y - 0.5) * 2

        const thumb = lm[4]
        const index = lm[8]
        const wrist = lm[0]
        const pinchDist = Math.hypot(thumb.x - index.x, thumb.y - index.y)
        
        const tips = [lm[8], lm[12], lm[16], lm[20]]
        let openDist = 0
        tips.forEach(t => openDist += Math.hypot(t.x - wrist.x, t.y - wrist.y))
        openDist /= 4

        // Gesture detection - adjusted thresholds
        if (pinchDist < 0.05) {
          // Pinch gesture - heart mode
          gestureState.mode = 'HEART'
          setGestureHint(`❤️ HEART MODE - Pinch detected (${pinchDist.toFixed(3)})`)
        } else if (openDist < 0.30) {
          // Closed fist - tree mode
          gestureState.mode = 'TREE'
          setGestureHint(`✊ TREE MODE - Auto-rotating (${openDist.toFixed(2)})`)
        } else if (openDist > 0.35) {
          // Open hand - scatter mode
          gestureState.mode = 'SCATTER'
          setGestureHint(`✋ SCATTER MODE - Move to edge to rotate (${openDist.toFixed(2)})`)
        } else {
          // Transition state
          setGestureHint(`🖐️ Transitioning... openDist: ${openDist.toFixed(2)}, pinch: ${pinchDist.toFixed(3)}`)  
        }
      } else {
        gestureState.hand.detected = false
        gestureState.mode = 'TREE' // Default to tree mode when no hand
        setGestureHint('Waiting for hand...')
      }
    }
    
    initMediaPipe()
    
    // Listen for fullscreen changes
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    document.addEventListener('mozfullscreenchange', handleFullscreenChange)
    document.addEventListener('MSFullscreenChange', handleFullscreenChange)

    return () => {
      if (animationId) cancelAnimationFrame(animationId)
      if (videoRef.current?.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks()
        tracks.forEach(track => track.stop())
      }
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange)
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange)
    }
  }, [])

  const cycleTheme = () => {
    const themes = Object.keys(COLOR_THEMES)
    const currentIndex = themes.indexOf(currentTheme)
    const nextIndex = (currentIndex + 1) % themes.length
    const nextTheme = themes[nextIndex]
    setCurrentTheme(nextTheme)
    localStorage.setItem('christmasTheme', nextTheme)

    // Change music and play
    if (audioRef.current) {
      audioRef.current.src = COLOR_THEMES[nextTheme].music
      audioRef.current.play()
        .then(() => {
          setIsMusicPlaying(true)
        })
        .catch(err => console.error('Music play failed:', err))
    }
  }

  const handleNameChange = (e) => {
    const name = e.target.value
    setUserName(name)
    if (name.trim()) {
      localStorage.setItem('christmasName', name.trim())
    } else {
      localStorage.removeItem('christmasName')
    }
  }

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen()
        setIsFullscreen(true)
      } else {
        await document.exitFullscreen()
        setIsFullscreen(false)
      }
    } catch (err) {
      console.error('Fullscreen error:', err)
    }
  }

  const toggleMusic = () => {
    if (!audioRef.current) return

    if (isMusicPlaying) {
      audioRef.current.pause()
      setIsMusicPlaying(false)
    } else {
      // Try to load and play
      audioRef.current.load()
      const playPromise = audioRef.current.play()

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsMusicPlaying(true)
            console.log('Music playing successfully')
          })
          .catch(err => {
            console.error('Audio play failed:', err)
            alert('Failed to play music. Please check your browser settings or try clicking again.')
          })
      }
    }
  }

  const displayName = 'W.Yr.';//userName.trim() || '[Name]'
  const themeName = COLOR_THEMES[currentTheme].name

  return (
    <>
      <Canvas
        camera={{ position: [0, CONFIG.CAM_HEIGHT, CONFIG.CAM_DIST], fov: 40 }}
        style={{ background: '#000' }}
      >
        <Scene currentTheme={currentTheme} gestureState={gestureState} />
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={10}
          maxDistance={50}
        />
      </Canvas>

      <div className="ui-overlay">
        <h1 className="title">Merry Christmas {displayName}</h1>
        
        <div className="top-right-controls">
          <button className="elegant-btn" onClick={toggleMusic}>
            {isMusicPlaying ? '🔊 Music ON' : '🔇 Music OFF'}
          </button>
          <button className="elegant-btn" onClick={toggleFullscreen}>
            {isFullscreen ? '⛶ Exit Fullscreen' : '⛶ Fullscreen'}
          </button>
        </div>

        <div className="controls-container">
          {/* <input
            type="text"
            className="name-input"
            placeholder="Enter Name"
            // value={userName}
            onChange={handleNameChange}
          /> */}
          
          <button className="elegant-btn" onClick={cycleTheme}>
            🎨 {themeName}
          </button>
          
          <div className="hint-text">Press 'H' to hide UI</div>
        </div>
      </div>

      {/* Webcam preview */}
      <div id="webcam-wrapper">
        <video 
          ref={videoRef}
          id="webcam" 
          autoPlay 
          playsInline 
          muted
        />
        <div id="cam-status" className={cameraActive ? 'active' : ''}></div>
      </div>

      {/* Gesture hint */}
      <div id="gesture-hint">{gestureHint}</div>

      {/* Background Music */}
      <audio
        ref={audioRef}
        loop
        autoPlay
        preload="auto"
        src={COLOR_THEMES[currentTheme].music}
        onPlay={() => setIsMusicPlaying(true)}
        onPause={() => setIsMusicPlaying(false)}
      />

      <Snowflakes />
    </>
  )
}
