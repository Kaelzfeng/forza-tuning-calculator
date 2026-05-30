/**
 * Rule-based Forza tuning calculator with Driver Intent System v1.
 *
 * All outputs are clamped to realistic Forza-tuning ranges.
 * Units follow in-game conventions where possible.
 *
 * Input shape:
 * {
 *   drivetrain: 'FWD' | 'RWD' | 'AWD',
 *   buildType:  'Road' | 'Dirt' | 'Drift' | 'Drag' | 'Beginner',
 *   drivingStyle: 'Stable' | 'Balanced' | 'Aggressive' | 'Drifty' | 'Beginner Friendly',
 *   classTier:  'D' | 'C' | 'B' | 'A' | 'S1' | 'S2' | 'X',
 *   weightKg:   number,
 *   powerHp:    number,
 *   frontWeightPercent: number,
 *   tireCompound: 'Stock' | 'Street' | 'Sport' | 'Race' | 'Slick',
 * }
 */

function clamp(v, lo, hi) {
  return Math.min(Math.max(v, lo), hi)
}

function roundTo(val, decimals) {
  const m = 10 ** decimals
  return Math.round(val * m) / m
}

function mapClassToFactor(tier) {
  const map = { D: 1.0, C: 1.15, B: 1.3, A: 1.45, S1: 1.6, S2: 1.8, X: 2.0 }
  return map[tier] || 1.0
}

function tireCompoundOffset(compound) {
  const map = { Stock: 2, Street: 0, Sport: -1, Race: -2, Slick: -3 }
  return map[compound] || 0
}

const PROFILES = {
  Road: {
    tirePressureBase: { f: 32, r: 32 },
    camberBase: { f: -1.6, r: -1.2 },
    toeBase: { f: 0.05, r: -0.1 },
    arbMult: { f: 1.0, r: 0.8 },
    springMult: { f: 1.0, r: 0.9 },
    rideHeightBase: 9.0,
    brakeBias: 55,
    brakePressure: 105,
    diffAccelBase: 45,
    diffDecelBase: 15,
    finalDriveBase: 3.95,
  },

  Dirt: {
    tirePressureBase: { f: 27, r: 27 },
    camberBase: { f: -0.7, r: -0.6 },
    toeBase: { f: 0.1, r: 0.0 },
    arbMult: { f: 0.45, r: 0.35 },
    springMult: { f: 0.48, r: 0.42 },
    rideHeightBase: 14.0,
    brakeBias: 58,
    brakePressure: 85,
    diffAccelBase: 70,
    diffDecelBase: 22,
    finalDriveBase: 4.35,
  },

  Drift: {
    tirePressureBase: { f: 30, r: 36 },
    camberBase: { f: -3.5, r: -1.6 },
    toeBase: { f: 0.25, r: 0.2 },
    arbMult: { f: 1.2, r: 1.5 },
    springMult: { f: 0.9, r: 1.15 },
    rideHeightBase: 8.0,
    brakeBias: 48,
    brakePressure: 100,
    diffAccelBase: 90,
    diffDecelBase: 40,
    finalDriveBase: 3.65,
  },

  Drag: {
    tirePressureBase: { f: 42, r: 22 },
    camberBase: { f: -0.4, r: -0.3 },
    toeBase: { f: 0.0, r: 0.0 },
    arbMult: { f: 0.7, r: 1.1 },
    springMult: { f: 0.65, r: 1.3 },
    rideHeightBase: 6.0,
    brakeBias: 57,
    brakePressure: 130,
    diffAccelBase: 85,
    diffDecelBase: 25,
    finalDriveBase: 3.20,
  },

  Beginner: {
    tirePressureBase: { f: 32, r: 32 },
    camberBase: { f: -1.0, r: -0.5 },
    toeBase: { f: 0.0, r: -0.05 },
    arbMult: { f: 0.6, r: 0.5 },
    springMult: { f: 0.65, r: 0.6 },
    rideHeightBase: 10.0,
    brakeBias: 58,
    brakePressure: 95,
    diffAccelBase: 35,
    diffDecelBase: 12,
    finalDriveBase: 3.95,
  },
}

const STYLE_OFFSETS = {
  'Stable': {
    camber:       { f:  0.30, r:  0.15 },
    toe:          { f:  0.04, r: -0.05 },
    arbFactor:    { f:  1.05, r:  0.85 },
    springFactor: { f:  1.02, r:  0.96 },
    diffAccel:    -8,
    diffDecel:    -3,
    brakeBias:     1,
    behavior: { stability: 85, rotation: 25, grip: 70, forgiveness: 75, aggression: 15 },
  },
  'Balanced': {
    camber:       { f:  0, r:  0 },
    toe:          { f:  0, r:  0 },
    arbFactor:    { f:  1.0, r:  1.0 },
    springFactor: { f:  1.0, r:  1.0 },
    diffAccel:     0,
    diffDecel:     0,
    brakeBias:     0,
    behavior: { stability: 55, rotation: 50, grip: 65, forgiveness: 55, aggression: 40 },
  },
  'Aggressive': {
    camber:       { f: -0.50, r: -0.30 },
    toe:          { f: -0.03, r:  0.05 },
    arbFactor:    { f:  0.95, r:  1.20 },
    springFactor: { f:  0.98, r:  1.08 },
    diffAccel:     10,
    diffDecel:      4,
    brakeBias:     -2,
    behavior: { stability: 30, rotation: 80, grip: 60, forgiveness: 25, aggression: 85 },
  },
  'Drifty': {
    camber:       { f: -0.30, r: -0.50 },
    toe:          { f:  0.08, r:  0.10 },
    arbFactor:    { f:  0.80, r:  1.50 },
    springFactor: { f:  0.90, r:  1.20 },
    diffAccel:     20,
    diffDecel:      8,
    brakeBias:     -4,
    behavior: { stability: 20, rotation: 90, grip: 40, forgiveness: 15, aggression: 75 },
  },
  'Beginner Friendly': {
    camber:       { f:  0.50, r:  0.30 },
    toe:          { f:  0.02, r: -0.08 },
    arbFactor:    { f:  0.85, r:  0.70 },
    springFactor: { f:  0.90, r:  0.85 },
    diffAccel:    -12,
    diffDecel:     -5,
    brakeBias:      2,
    behavior: { stability: 90, rotation: 15, grip: 75, forgiveness: 95, aggression: 5 },
  },
}

export function calculateTune(input) {
  const {
    drivetrain = 'RWD',
    buildType = 'Road',
    drivingStyle = 'Balanced',
    classTier = 'A',
    weightKg = 1400,
    powerHp = 400,
    frontWeightPercent = 54,
    tireCompound = 'Sport',
  } = input

  const profile = PROFILES[buildType] || PROFILES.Road
  const style = STYLE_OFFSETS[drivingStyle] || STYLE_OFFSETS.Balanced
  const cls = mapClassToFactor(classTier)
  const tCompOff = tireCompoundOffset(tireCompound)
  const fwd = frontWeightPercent / 100
  const rwd = 1 - fwd

  const weightFactor = clamp(weightKg / 1400, 0.4, 2.2)
  const powerFactor = clamp(powerHp / 400, 0.1, 5.0)
  const pwRatio = clamp(powerHp / Math.max(weightKg, 1), 0.01, 2.5)

  const tireF = clamp(
    profile.tirePressureBase.f + tCompOff + (weightFactor - 1) * 2 + (cls - 1) * 1.5,
    18, 55,
  )
  const tireR = clamp(
    profile.tirePressureBase.r + tCompOff + (weightFactor - 1) * 2 + (cls - 1) * 1.5,
    18, 55,
  )

  const springBaseF = weightKg * 0.10 * cls * profile.springMult.f * style.springFactor.f * fwd
  const springBaseR = weightKg * 0.10 * cls * profile.springMult.r * style.springFactor.r * rwd
  const springF = clamp(roundTo(springBaseF, 1), 20, 250)
  const springR = clamp(roundTo(springBaseR, 1), 18, 250)

  const arbBaseF = 22 * profile.arbMult.f * style.arbFactor.f * cls * weightFactor * fwd
  const arbBaseR = 22 * profile.arbMult.r * style.arbFactor.r * cls * weightFactor * rwd
  const arbF = clamp(roundTo(arbBaseF, 1), 1, 65)
  const arbR = clamp(roundTo(arbBaseR, 1), 1, 65)

  const camberF = clamp(roundTo(profile.camberBase.f - (cls - 1) * 0.25 + style.camber.f, 1), -5.0, 0.0)
  const camberR = clamp(roundTo(profile.camberBase.r - (cls - 1) * 0.2 + style.camber.r, 1), -5.0, 0.0)

  const toeF = clamp(roundTo(profile.toeBase.f + (cls - 1) * 0.02 + style.toe.f, 2), -0.5, 0.5)
  const toeR = clamp(roundTo(profile.toeBase.r + (cls - 1) * 0.01 + style.toe.r, 2), -0.5, 0.5)

  const rhBase = profile.rideHeightBase + (cls - 1) * -0.5
  const rh = clamp(roundTo(rhBase, 1), 4.5, 16.0)

  const bb = clamp(roundTo(profile.brakeBias + (fwd - 0.54) * 10 + style.brakeBias, 0), 40, 65)

  const bp = clamp(roundTo(profile.brakePressure + (cls - 1) * 2 + (powerFactor - 1) * 3, 0), 75, 150)

  const diffAccel = clamp(roundTo(profile.diffAccelBase + (cls - 1) * 3 + (pwRatio - 0.3) * 10 + style.diffAccel, 0), 10, 100)
  const diffDecel = clamp(roundTo(profile.diffDecelBase + (cls - 1) * 1 + (pwRatio - 0.3) * 4 + style.diffDecel, 0), 0, 75)

  const fdBase = profile.finalDriveBase - (powerFactor - 1) * 0.25 - (cls - 1) * 0.08
  const fd = clamp(roundTo(fdBase, 2), 2.20, 5.00)

  const isFWD = drivetrain === 'FWD'

  return {
    tirePressureFront: tireF,
    tirePressureRear: tireR,
    finalDrive: fd,
    camberFront: camberF,
    camberRear: camberR,
    toeFront: toeF,
    toeRear: toeR,
    antirollFront: arbF,
    antirollRear: arbR,
    springFront: springF,
    springRear: springR,
    rideHeight: rh,
    brakeBalance: bb,
    brakePressure: bp,
    diffAccel: isFWD ? 0 : diffAccel,
    diffDecel: isFWD ? 0 : diffDecel,
    behavior: { ...style.behavior },
  }
}

const PERSONALITY = {
  'Stable': {
    Road: {
      title: 'Stable High-Speed Grip',
      summary: 'Predictable corner entry with strong rear-end stability. The car inspires confidence during high-speed sweepers and resists mid-corner rotation.',
      tips: ['Brake early, carry speed through the apex', 'Smooth throttle application on exit', 'Ideal for highway pulls and circuit racing'],
    },
    Dirt: {
      title: 'Controlled Off-Road Balance',
      summary: 'Softened damping and high ride height keep the chassis settled over ruts. Minimal oversteer makes it easy to hold a line on loose surfaces.',
      tips: ['Use weight transfer to aid rotation', 'Avoid sudden steering inputs in deep gravel', 'Feels planted on mixed-surface stages'],
    },
    Drift: {
      title: 'Stable Angle Holder',
      summary: 'Enough rear stiffness to hold a slide without snapping. The tune favors long, controlled drifts over aggressive transitions.',
      tips: ['Initiate with clutch kick or weight shift', 'Maintain throttle to keep angle steady', 'Forgiving if you over-rotate mid-drift'],
    },
    Drag: {
      title: 'Straight-Line Stability',
      summary: 'Minimal rear squat variation keeps the car tracking true off the line. Rear grip is prioritized for consistent launch behavior.',
      tips: ['Focus on launch RPM for best 60-foot', 'Minimal steering correction needed', 'Tire temp management is key to consistency'],
    },
    Beginner: {
      title: 'Confidence Builder',
      summary: 'Extra-safe handling with gentle limit behavior. The car communicates clearly before letting go, giving you time to react and learn.',
      tips: ['Focus on smooth, deliberate inputs', 'The car will warn you before losing grip', 'Great for learning track layouts safely'],
    },
  },
  'Balanced': {
    Road: {
      title: 'Neutral All-Rounder',
      summary: 'Evenly balanced between front and rear grip. The car responds proportionally to your inputs without favoring understeer or oversteer.',
      tips: ['Adaptable to most driving styles', 'Mid-corner balance is predictable', 'A strong baseline for track day tuning'],
    },
    Dirt: {
      title: 'Mixed-Surface Control',
      summary: 'Balanced damping and ride height handle both gravel and tarmac transitions. The car stays composed when surfaces change mid-stage.',
      tips: ['Adjust line with throttle, not just steering', 'Works well on rally-cross style layouts', 'Predictable when grip levels change suddenly'],
    },
    Drift: {
      title: 'Balanced Slide Control',
      summary: 'Enough rear stiffness for easy initiation without being snappy. The car transitions smoothly between drift directions.',
      tips: ['Good for learning drift fundamentals', 'Throttle-adjustable angle mid-slide', 'Transitions feel natural and progressive'],
    },
    Drag: {
      title: 'Consistent Launch Platform',
      summary: 'Even weight transfer and predictable tire behavior. The car hooks up consistently run after run.',
      tips: ['Find your ideal launch RPM and stick with it', 'Consistent 60-foot times run to run', 'Works across a range of tire compounds'],
    },
    Beginner: {
      title: 'All-Purpose Starter Tune',
      summary: 'No surprises. The car goes where you point it and recovers cleanly from mistakes. A safe starting point for any driving style.',
      tips: ['Build your fundamentals with this setup', 'Explore different lines through corners', 'Gradually increase pace as confidence grows'],
    },
  },
  'Aggressive': {
    Road: {
      title: 'Sharp Turn-In Hunter',
      summary: 'Rapid front-end response with a lively rear that rotates eagerly on corner entry. The car rewards precise, committed inputs.',
      tips: ['Trail-brake deep into corners for rotation', 'Be ready to catch the rear on exit', 'Throttle control is essential for fast laps'],
    },
    Dirt: {
      title: 'Aggressive Rally Attack',
      summary: 'Lively rear end helps rotate the car on loose surfaces. Quick direction changes feel sharp and immediate.',
      tips: ['Scandinavian flick becomes your best friend', 'Left-foot brake to control rotation angle', 'Rewards aggressive driving, punishes hesitation'],
    },
    Drift: {
      title: 'High-Angle Aggressor',
      summary: 'Snappy transitions and high-angle capability. The car wants to slide and responds instantly to throttle and steering inputs.',
      tips: ['Commit fully to each initiation', 'Quick hands required for rapid transitions', 'Not for the faint-hearted — this setup bites'],
    },
    Drag: {
      title: 'Maximum Launch Attack',
      summary: 'Aggressive rear bias and stiff rear suspension prioritize weight transfer to the drive wheels for maximum hole-shot.',
      tips: ['Heat tires to optimal temp before each run', 'Aggressive launch control settings work best', 'Be ready to pedal if it breaks loose'],
    },
    Beginner: {
      title: 'Spirited Starter Setup',
      summary: 'A taste of aggressive handling with a safety net. The car feels lively but still catches you if you overstep.',
      tips: ['Push gently at first to find the limit', 'Learn to feel rotation before it becomes slide', 'A stepping stone toward full-aggressive tuning'],
    },
  },
  'Drifty': {
    Road: {
      title: 'Playful Rear-End Character',
      summary: 'The rear end lives to rotate. Even mild throttle on corner exit will step the tail out, making every corner an opportunity for style.',
      tips: ['Throttle-steer through every corner', 'Easy to initiate with a lift or tap of brake', 'Best enjoyed on wide, open circuits'],
    },
    Dirt: {
      title: 'Loose Surface Specialist',
      summary: 'Maximum rear activity for effortless slides on gravel and dirt. The car feels like it was born sideways.',
      tips: ['Keep RPM high to maintain wheel speed', 'Steering is secondary — steer with the throttle', 'Perfect for rally-cross and dirt circuits'],
    },
    Drift: {
      title: 'Full Tandem Drift Machine',
      summary: 'Maximum rear slip with progressive breakaway. The car holds deep angles and transitions fluidly for tandem runs.',
      tips: ['Initiate early, the car will carry the angle', 'Modulate throttle to adjust proximity to lead', 'Built for smoke, style, and door-to-door action'],
    },
    Drag: {
      title: 'Controlled Wheel-Spin Launch',
      summary: 'Intentional rear slip for rolling burnouts and show-style launches. Not the quickest, but definitely the most dramatic.',
      tips: ['Smoke the tires for crowd-pleasing launches', 'Modulate clutch to control wheelspin', 'Style over elapsed time with this setup'],
    },
    Beginner: {
      title: 'Gentle Slide Introduction',
      summary: 'A forgiving introduction to rear-end movement. The car slides progressively, giving you time to react and learn drift basics.',
      tips: ['Start with low-speed corner exits', 'Feel how the rear moves before committing', 'A safe way to explore oversteer behavior'],
    },
  },
  'Beginner Friendly': {
    Road: {
      title: 'Easy-Going Confidence Builder',
      summary: 'Ultra-forgiving handling with soft limit behavior. The car resists spinning and gives clear, early warning before grip runs out.',
      tips: ['Focus on learning racing lines', 'Mistakes are easily corrected — dont stress', 'Build speed gradually, the car will support you'],
    },
    Dirt: {
      title: 'Gentle Off-Road Companion',
      summary: 'Soft suspension and mild differential settings keep the car predictable on loose surfaces. Even rough stages feel manageable.',
      tips: ['The car handles bumps without unsettling', 'Focus on steering accuracy over aggression', 'A relaxed, enjoyable off-road experience'],
    },
    Drift: {
      title: 'Easy Slide Starter',
      summary: 'Mild rear bias with slow, controllable transitions. Perfect for learning drift basics without fear of spinning out.',
      tips: ['Practice figure-eights to learn transitions', 'The car gives you time to think mid-slide', 'Build muscle memory without the stress'],
    },
    Drag: {
      title: 'Hassle-Free Launch Pad',
      summary: 'Forgiving launch behavior with minimal wheelspin. Consistent, easy launches that build your drag racing confidence.',
      tips: ['Focus on reaction time, not launch tricks', 'Consistent results build racing confidence', 'Low stress, high consistency setup'],
    },
    Beginner: {
      title: 'Ultimate Safety Net',
      summary: 'The most forgiving setup possible. Maximum stability, minimal surprises. The car feels like it is looking out for you.',
      tips: ['Just focus on having fun behind the wheel', 'The car handles mistakes gracefully', 'Your perfect starting point — welcome to tuning'],
    },
  },
}

// ═══════════════════════════════════════════
//  i18n text maps
// ═══════════════════════════════════════════

const STEP_TEXTS = {
  en: {
    tirePressure: 'Tire Pressure',
    gearing: 'Gearing',
    alignment: 'Alignment',
    antiRollBars: 'Anti-Roll Bars',
    springsRideHeight: 'Springs & Ride Height',
    brakes: 'Brakes',
    differential: 'Differential',
    fwdNoDiff: 'No differential adjustment needed for FWD',
    setFrontTire: (v) => `Set Front Tire Pressure to ${v} PSI`,
    setRearTire: (v) => `Set Rear Tire Pressure to ${v} PSI`,
    setFinalDrive: (v) => `Set Final Drive to ${v}`,
    setFrontCamber: (v) => `Set Front Camber to ${v}°`,
    setRearCamber: (v) => `Set Rear Camber to ${v}°`,
    setFrontToe: (v) => `Set Front Toe to ${v}°`,
    setRearToe: (v) => `Set Rear Toe to ${v}°`,
    setFrontARB: (v) => `Set Front ARB to ${v}`,
    setRearARB: (v) => `Set Rear ARB to ${v}`,
    setFrontSprings: (v) => `Set Front Springs to ${v} N/mm`,
    setRearSprings: (v) => `Set Rear Springs to ${v} N/mm`,
    setRideHeight: (v) => `Set Ride Height to ${v} cm`,
    setBrakeBalance: (v) => `Set Brake Balance to ${v}% Front`,
    setBrakePressure: (v) => `Set Brake Pressure to ${v}%`,
    setDiffAccel: (v) => `Set Diff Accel to ${v}%`,
    setDiffDecel: (v) => `Set Diff Decel to ${v}%`,
  },
  zh: {
    tirePressure: '胎压',
    gearing: '齿比',
    alignment: '车轮定位',
    antiRollBars: '防倾杆',
    springsRideHeight: '弹簧与车身高度',
    brakes: '制动系统',
    differential: '差速器',
    fwdNoDiff: '前驱车无需调整差速器',
    setFrontTire: (v) => `将前轮胎压调整为 ${v} PSI`,
    setRearTire: (v) => `将后轮胎压调整为 ${v} PSI`,
    setFinalDrive: (v) => `将终传比调整为 ${v}`,
    setFrontCamber: (v) => `将前轮外倾角调整为 ${v}°`,
    setRearCamber: (v) => `将后轮外倾角调整为 ${v}°`,
    setFrontToe: (v) => `将前轮前束角调整为 ${v}°`,
    setRearToe: (v) => `将后轮前束角调整为 ${v}°`,
    setFrontARB: (v) => `将前防倾杆调整为 ${v}`,
    setRearARB: (v) => `将后防倾杆调整为 ${v}`,
    setFrontSprings: (v) => `将前弹簧硬度调整为 ${v} N/mm`,
    setRearSprings: (v) => `将后弹簧硬度调整为 ${v} N/mm`,
    setRideHeight: (v) => `将车身高度调整为 ${v} cm`,
    setBrakeBalance: (v) => `将制动力分配调整为 ${v}% 前`,
    setBrakePressure: (v) => `将制动压力调整为 ${v}%`,
    setDiffAccel: (v) => `将差速器加速锁定调整为 ${v}%`,
    setDiffDecel: (v) => `将差速器减速锁定调整为 ${v}%`,
  },
}

const PERSONALITY_ZH = {
  'Stable': {
    Road: { title: '稳定高速抓地', summary: '可预测的入弯表现，车尾稳定性出色。高速弯道中给驾驶者充足信心，弯中不易出现多余的旋转。', tips: ['提早刹车，带速通过弯心', '出弯时平顺给油', '非常适合高速巡航与赛道竞速'] },
    Dirt: { title: '受控越野平衡', summary: '柔和的阻尼与较高的底盘让车辆在颠簸中保持安定。转向过度被充分抑制，松散路面也能轻松控车。', tips: ['利用重心转移辅助转向', '避免在深沙石中突然打方向', '在混合路面上倍感扎实'] },
    Drift: { title: '稳定持角漂移', summary: '尾部刚性足以维持滑动而不突然回正，适合长距离受控漂移而非激进切换。', tips: ['通过弹离合或重心转移起漂', '维持油门保持角度不变', '即使漂移过度也能轻松救回'] },
    Drag: { title: '直线稳定加速', summary: '最小化车尾下蹲变化，确保车辆起步直线稳定。优先保障后轮抓地力，带来稳定的起步表现。', tips: ['专注起步转速以争取最佳60英尺成绩', '几乎不需要方向修正', '轮胎温度管理是保持稳定性的关键'] },
    Beginner: { title: '信心建立者', summary: '极度安全的操控特性，极限反馈温和。车辆在失控前会清晰提醒，给驾驶者充足的反应和学习时间。', tips: ['专注于平顺、刻意的操作', '车辆会在失去抓地力前提醒你', '非常适合安全地学习赛道走线'] },
  },
  'Balanced': {
    Road: { title: '均衡型调教', summary: '前后抓地力分配均衡，车辆会根据你的输入稳定响应，不会明显偏向转向不足或转向过度。', tips: ['适合大多数驾驶风格', '弯中姿态更容易预判', '可作为赛道调教的可靠起点'] },
    Dirt: { title: '混合路面掌控', summary: '均衡的阻尼与底盘高度能同时应对砂石与柏油路面。路面变化时车辆依然保持沉稳。', tips: ['通过油门而非仅靠方向调整走线', '非常适合拉力穿越式赛道', '路面抓地力突变时依然可控'] },
    Drift: { title: '均衡漂移控制', summary: '尾部刚性足以轻松起漂，又不会过于灵敏。车辆在左右漂移切换时表现顺畅。', tips: ['适合学习漂移基本功', '漂移中可通过油门调整角度', '方向切换自然渐进'] },
    Drag: { title: '稳定起步平台', summary: '均匀的重心转移与可预测的轮胎表现。车辆每次起步都能稳定抓地。', tips: ['找到最佳起步转速并保持稳定', '60英尺成绩波动小', '适用多种轮胎配方'] },
    Beginner: { title: '全能入门调教', summary: '毫无意外。车辆精准跟随方向指令，出现失误时也能干净利落地恢复。是任何驾驶风格的可靠起点。', tips: ['用这套调教打好基本功', '尝试不同的过弯走线', '随信心增长逐步提升节奏'] },
  },
  'Aggressive': {
    Road: { title: '锐利入弯猎手', summary: '前轴响应极快，车尾活跃且入弯积极旋转。车辆回馈精准、果断的操作。', tips: ['用循迹刹车深入弯道引发旋转', '出弯时准备好接住车尾', '油门控制是刷圈的关键'] },
    Dirt: { title: '激进拉力攻击', summary: '活跃的车尾有助于松散路面上旋转车辆。快速变向感觉犀利而即时。', tips: ['斯堪的纳维亚甩尾是你的好帮手', '左脚刹车控制旋转角度', '奖励激进驾驶、惩罚犹豫'] },
    Drift: { title: '大角度进攻者', summary: '快速切换与大角度能力。车辆渴望滑动，对油门和方向输入响应迅速。', tips: ['每次起漂都要全力投入', '快速切换需要快手速', '不适合胆小者——这套调教有脾气'] },
    Drag: { title: '极限起步攻击', summary: '激进的后轴偏重与硬朗的后悬挂最大化重心转移至驱动轮。', tips: ['每次发车前将轮胎加热至最佳温度', '激进的起步控制设定效果最好', '如果打滑要随时准备收油'] },
    Beginner: { title: '带感入门调教', summary: '激进操控的初步体验，带有安全网。车辆感觉活跃，但在你越界时仍会保护你。', tips: ['循序渐进探索极限', '学会在旋转变成滑动前感知它', '是通往全激进调教的跳板'] },
  },
  'Drifty': {
    Road: { title: '俏皮尾部性格', summary: '车尾天生爱旋转。出弯时哪怕轻微给油都能让尾部滑出，每个弯道都是展示机会。', tips: ['每个弯道都可以用油门转向', '轻松通过收油或轻点刹车起漂', '在宽阔开放赛道最有乐趣'] },
    Dirt: { title: '松散路面专家', summary: '最大化的尾部活跃度，在砂石路面上轻松漂移。车辆仿佛生来就该横着走。', tips: ['保持高转速以维持轮速', '方向是次要的——用油门转向', '非常适合拉力穿越与泥地赛道'] },
    Drift: { title: '全速双车漂移机', summary: '最大尾部滑动与渐进脱离。车辆能保持深角度并流畅切换，适合双车追逐。', tips: ['早一点起漂，车子会帮你带着角度', '通过油门调节与前车的距离', '为烟雾、风格和贴身对决而生'] },
    Drag: { title: '受控打滑起步', summary: '刻意营造的后轮滑动，适合滚动烧胎和表演式起步。不是最快的，但是最有看头的。', tips: ['让轮胎冒烟给观众看', '通过离合器控制打滑程度', '这套调教追求风格而非用时'] },
    Beginner: { title: '温柔漂移入门', summary: '车尾运动的温和入门。车辆渐进滑动，给驾驶者充分时间反应和学习漂移基础。', tips: ['从低速弯道出弯开始练习', '在全力投入前先感受尾部如何移动', '以安全的方式探索转向过度特性'] },
  },
  'Beginner Friendly': {
    Road: { title: '轻松信心缔造者', summary: '极度宽容的操控，柔和的极限特性。车辆抗拒打转，在抓地力耗尽前给出清晰、早期预警。', tips: ['专注于学习赛车走线', '失误很容易纠正——别有压力', '逐步提速，车辆会一直支持你'] },
    Dirt: { title: '温柔越野伴侣', summary: '柔软悬挂与温和差速器设定让车辆在松散路面始终可控。即使颠簸赛段也感觉很从容。', tips: ['车辆能从容应对颠簸而不失稳', '把注意力放在转向精度而非激进程度上', '一次轻松愉快的越野体验'] },
    Drift: { title: '轻松漂移起步', summary: '轻微尾部偏重，切换缓慢可控。非常适合学习漂移基础，不用担心打转失控。', tips: ['用八字练习来学习方向切换', '车辆在漂移过程中给你充分的思考时间', '无压力地建立肌肉记忆'] },
    Drag: { title: '无忧起步台', summary: '宽容的起步特性，最小化打滑。稳定、轻松的起步经历，逐步建立你的直线加速信心。', tips: ['专注反应时间而非花哨的起步技巧', '稳定的成绩才能建立赛车信心', '低压高稳的调教方案'] },
    Beginner: { title: '终极安全网', summary: '最宽容的调教。最大化稳定性，零意外。车辆就像是你的守护者。', tips: ['只管享受驾驶的乐趣', '车辆会优雅地处理你的失误', '你的完美起点——欢迎来到调教的世界'] },
  },
}

const DRIVETRAIN_CONTEXT_ZH = {
  FWD: ' 前驱系统让车辆在给油时保持天然稳定。',
  RWD: ' 后驱系统奖励通过弯道时的平顺油门控制。',
  AWD: ' 全驱系统提供强劲抓地力与全天候自信。',
}

const INSIGHT_TEXTS = {
  en: {
    cornerEntry: 'Corner Entry',
    midCorner: 'Mid Corner',
    cornerExit: 'Corner Exit',
    highSpeed: 'High Speed',
    tunePersonality: 'Tune Personality',
    stableReluctant: 'Stable but reluctant',
    stableReluctantDesc: 'Very stable on entry, but may feel slightly reluctant to rotate. Trail-braking helps initiate turn-in.',
    sharpTurnIn: 'Sharp turn-in',
    sharpTurnInDesc: 'Sharp turn-in response. Requires smoother steering and throttle control to avoid unsettling the car.',
    livelyEntry: 'Lively entry',
    livelyEntryDesc: 'Quick to rotate on corner entry. Trail-braking requires careful modulation to avoid spinning.',
    confidentEntry: 'Confident entry',
    confidentEntryDesc: 'Plant and predictable on corner entry. The front end goes exactly where you point it.',
    understeer: 'Understeer tendency',
    understeerDesc: 'May resist turning in, especially at higher speeds. Earlier braking and slower hands help.',
    neutralTurnIn: 'Neutral turn-in',
    neutralTurnInDesc: 'Neutral turn-in with predictable initial response. The car communicates its limits clearly.',
    lockedIn: 'Locked-in feel',
    lockedInDesc: 'Holds the line confidently through mid-corner with minimal correction needed. Planted and predictable.',
    looseMid: 'Loose mid-corner',
    looseMidDesc: 'May feel loose mid-corner. Throttle adjustments will affect the line — use smooth, partial throttle.',
    activeRotation: 'Active rotation',
    activeRotationDesc: 'Active mid-corner rotation keeps the car alive. Be ready with opposite lock if the rear steps out.',
    strongGrip: 'Strong grip',
    strongGripDesc: 'Excellent mid-corner grip. You can carry more speed through the apex than the car suggests.',
    limitedGrip: 'Limited grip',
    limitedGripDesc: 'Mid-corner grip is limited. Focus on a clean racing line and avoid mid-corner throttle spikes.',
    balancedHold: 'Balanced hold',
    balancedHoldDesc: 'Predictable mid-corner balance with progressive limit feedback. Easy to lean on and trust.',
    forgivingExit: 'Forgiving exit',
    forgivingExitDesc: 'Forgiving under throttle, easier to recover from small mistakes. Great for building confidence.',
    punishingExit: 'Punishing exit',
    punishingExitDesc: 'Punishing on exit if throttle is applied too aggressively. Smooth, progressive inputs are essential.',
    throttleSteer: 'Throttle-steer exit',
    throttleSteerDesc: 'The rear will step out on power. Use the throttle to steer and adjust your line on exit.',
    demandingExit: 'Demanding exit',
    demandingExitDesc: 'Limited forgiveness demands discipline on exit. Feed throttle progressively and stay smooth.',
    cleanExit: 'Clean exit',
    cleanExitDesc: 'Clean, predictable exit behavior with progressive power delivery. The car hooks up and goes.',
    nervousSpeed: 'Nervous at speed',
    nervousSpeedDesc: 'Fast response, but may feel nervous during high-speed direction changes. Smooth, small inputs only.',
    highSpeedConfidence: 'High-speed confidence',
    highSpeedConfidenceDesc: 'Plant and confident at speed. Minimal steering correction needed — the car tracks true.',
    reducedConfidence: 'Reduced confidence',
    reducedConfidenceDesc: 'Reduced confidence at high speed. Aero balance and line choice become critical for stability.',
    livelySpeed: 'Lively at speed',
    livelySpeedDesc: 'Quick, lively response at speed. Exciting but demands full attention — stay ahead of the car.',
    stableCruiser: 'Stable cruiser',
    stableCruiserDesc: 'Stable at speed with predictable response to steering inputs. Confident and composed.',
  },
  zh: {
    cornerEntry: '入弯',
    midCorner: '弯中',
    cornerExit: '出弯',
    highSpeed: '高速',
    tunePersonality: '调教风格',
    stableReluctant: '稳定但不愿入弯',
    stableReluctantDesc: '入弯非常稳定，但可能稍显迟钝。循迹刹车有助于诱导入弯。',
    sharpTurnIn: '敏锐入弯',
    sharpTurnInDesc: '入弯响应敏锐，需要更平顺的方向和油门控制以避免车身失稳。',
    livelyEntry: '活跃入弯',
    livelyEntryDesc: '入弯旋转很快，循迹刹车需要精细控制以避免打转。',
    confidentEntry: '自信入弯',
    confidentEntryDesc: '入弯沉稳可预测，车头精准指向你想去的方向。',
    understeer: '转向不足倾向',
    understeerDesc: '可能抗拒入弯，尤其在高速时。提早刹车、放慢方向有助于改善。',
    neutralTurnIn: '中性入弯',
    neutralTurnInDesc: '中性入弯，初始响应可预测，车辆会清晰传达极限信号。',
    lockedIn: '稳锁弯心',
    lockedInDesc: '弯中牢牢抓住走线，几乎无需修正。沉稳可预测。',
    looseMid: '弯中松散',
    looseMidDesc: '弯中可能感觉松散，油门调整会影响走线——使用平顺的部分油门。',
    activeRotation: '活跃旋转',
    activeRotationDesc: '弯中车身活跃旋转，如果尾部滑出需准备反打方向。',
    strongGrip: '强劲抓地',
    strongGripDesc: '弯中抓地力出色，可以比预想中带更多速度通过弯心。',
    limitedGrip: '抓地力有限',
    limitedGripDesc: '弯中抓地力有限，专注干净的赛车线，避免弯中油门突增。',
    balancedHold: '均衡稳住',
    balancedHoldDesc: '弯中姿态可预测，极限反馈渐进。容易信赖和依靠。',
    forgivingExit: '宽容出弯',
    forgivingExitDesc: '给油时宽容度高，小失误容易补救，非常适合建立信心。',
    punishingExit: '出弯惩罚性',
    punishingExitDesc: '给油太猛会在出弯时受到惩罚。平顺、渐进的油门输入至关重要。',
    throttleSteer: '油门转向出弯',
    throttleSteerDesc: '加油时尾部会滑出，用油门来转向并调整出弯走线。',
    demandingExit: '高要求出弯',
    demandingExitDesc: '容错率有限，出弯需要自律。渐进给油、保持平顺。',
    cleanExit: '干净出弯',
    cleanExitDesc: '出弯干净可预测，动力输出渐进。车辆稳稳抓住地面并向前推进。',
    nervousSpeed: '高速神经质',
    nervousSpeedDesc: '响应很快，但高速变向时可能感觉紧张。只做平顺的小幅度输入。',
    highSpeedConfidence: '高速信心',
    highSpeedConfidenceDesc: '高速下车身沉稳自信，几乎无需方向修正——车辆直直向前。',
    reducedConfidence: '信心减弱',
    reducedConfidenceDesc: '高速下信心减弱。空力平衡与走线选择对稳定性至关重要。',
    livelySpeed: '高速活跃',
    livelySpeedDesc: '高速下响应快速活跃，刺激但需要全神贯注——始终领先车辆一步。',
    stableCruiser: '稳定巡航',
    stableCruiserDesc: '高速稳定，方向输入响应可预测。自信从容。',
  },
}

function tStep(key, lang) {
  const texts = STEP_TEXTS[lang] || STEP_TEXTS.en
  return texts[key]
}

function tInsight(key, lang) {
  const texts = INSIGHT_TEXTS[lang] || INSIGHT_TEXTS.en
  return texts[key] || key
}

export function generatePersonalitySummary(buildType, drivingStyle, drivetrain, behavior, lang = 'en') {
  if (lang === 'zh') {
    const zhData = PERSONALITY_ZH[drivingStyle] || PERSONALITY_ZH['Balanced']
    const zhEntry = zhData[buildType] || zhData['Road']

    if (buildType === 'Drift' && drivetrain === 'FWD') {
      return {
        title: '前驱惯性漂移',
        summary: '前驱漂移依赖重心转移与惯性而非后轮动力。车辆靠前轮抓地力拉着车身滑动，奖励精准的走线与果断的操作。',
        tips: ['通过重心转移或手刹轻拉起漂', '过弯时保持高惯性', '前轮负责工作——小心管理抓地力'],
      }
    }

    return {
      title: zhEntry.title,
      summary: zhEntry.summary + (DRIVETRAIN_CONTEXT_ZH[drivetrain] || ''),
      tips: zhEntry.tips,
    }
  }

  const styleData = PERSONALITY[drivingStyle] || PERSONALITY['Balanced']

  if (buildType === 'Drift' && drivetrain === 'FWD') {
    const fwdEntry = {
      title: 'FWD Momentum Drifter',
      summary: 'Front-wheel drive drift relies on weight transfer and momentum rather than rear-wheel power. The car pulls through slides with front-end grip, rewarding precise line choice and commitment.',
      tips: ['Initiate with weight shift or handbrake tap', 'Keep momentum high through the corner', 'Front tires do the work — manage grip carefully'],
    }
    return {
      title: fwdEntry.title,
      summary: fwdEntry.summary,
      tips: fwdEntry.tips,
    }
  }

  const entry = styleData[buildType] || styleData['Road']

  const drivetrainContext = {
    FWD: ' Front-wheel drive keeps the car inherently stable under power.',
    RWD: ' Rear-wheel drive rewards smooth throttle control through corners.',
    AWD: ' All-wheel drive provides tenacious grip and all-weather confidence.',
  }

  return {
    title: entry.title,
    summary: entry.summary + (drivetrainContext[drivetrain] || ''),
    tips: entry.tips,
  }
}

export function generateDrivingInsights(result, lang = 'en') {
  const b = result.behavior
  if (!b) return []

  const { stability, rotation, grip, forgiveness, aggression } = b

  const hi = (v) => v >= 70
  const lo = (v) => v <= 35

  const insights = []

  // ── Corner Entry ──
  if (hi(stability) && lo(rotation)) {
    insights.push({ title: tInsight('cornerEntry', lang), status: tInsight('stableReluctant', lang), description: tInsight('stableReluctantDesc', lang), severity: 'neutral' })
  } else if (hi(rotation) && hi(aggression)) {
    insights.push({ title: tInsight('cornerEntry', lang), status: tInsight('sharpTurnIn', lang), description: tInsight('sharpTurnInDesc', lang), severity: 'warning' })
  } else if (lo(stability) && hi(rotation)) {
    insights.push({ title: tInsight('cornerEntry', lang), status: tInsight('livelyEntry', lang), description: tInsight('livelyEntryDesc', lang), severity: 'warning' })
  } else if (hi(stability)) {
    insights.push({ title: tInsight('cornerEntry', lang), status: tInsight('confidentEntry', lang), description: tInsight('confidentEntryDesc', lang), severity: 'good' })
  } else if (lo(rotation)) {
    insights.push({ title: tInsight('cornerEntry', lang), status: tInsight('understeer', lang), description: tInsight('understeerDesc', lang), severity: 'neutral' })
  } else {
    insights.push({ title: tInsight('cornerEntry', lang), status: tInsight('neutralTurnIn', lang), description: tInsight('neutralTurnInDesc', lang), severity: 'good' })
  }

  // ── Mid Corner ──
  if (hi(grip) && hi(stability)) {
    insights.push({ title: tInsight('midCorner', lang), status: tInsight('lockedIn', lang), description: tInsight('lockedInDesc', lang), severity: 'good' })
  } else if (lo(grip) && hi(rotation)) {
    insights.push({ title: tInsight('midCorner', lang), status: tInsight('looseMid', lang), description: tInsight('looseMidDesc', lang), severity: 'warning' })
  } else if (hi(rotation) && lo(stability)) {
    insights.push({ title: tInsight('midCorner', lang), status: tInsight('activeRotation', lang), description: tInsight('activeRotationDesc', lang), severity: 'warning' })
  } else if (hi(grip)) {
    insights.push({ title: tInsight('midCorner', lang), status: tInsight('strongGrip', lang), description: tInsight('strongGripDesc', lang), severity: 'good' })
  } else if (lo(grip)) {
    insights.push({ title: tInsight('midCorner', lang), status: tInsight('limitedGrip', lang), description: tInsight('limitedGripDesc', lang), severity: 'neutral' })
  } else {
    insights.push({ title: tInsight('midCorner', lang), status: tInsight('balancedHold', lang), description: tInsight('balancedHoldDesc', lang), severity: 'good' })
  }

  // ── Corner Exit ──
  if (hi(forgiveness)) {
    insights.push({ title: tInsight('cornerExit', lang), status: tInsight('forgivingExit', lang), description: tInsight('forgivingExitDesc', lang), severity: 'good' })
  } else if (lo(forgiveness) && hi(aggression)) {
    insights.push({ title: tInsight('cornerExit', lang), status: tInsight('punishingExit', lang), description: tInsight('punishingExitDesc', lang), severity: 'warning' })
  } else if (hi(rotation)) {
    insights.push({ title: tInsight('cornerExit', lang), status: tInsight('throttleSteer', lang), description: tInsight('throttleSteerDesc', lang), severity: 'neutral' })
  } else if (lo(forgiveness)) {
    insights.push({ title: tInsight('cornerExit', lang), status: tInsight('demandingExit', lang), description: tInsight('demandingExitDesc', lang), severity: 'neutral' })
  } else {
    insights.push({ title: tInsight('cornerExit', lang), status: tInsight('cleanExit', lang), description: tInsight('cleanExitDesc', lang), severity: 'good' })
  }

  // ── High Speed ──
  if (hi(aggression) && lo(stability)) {
    insights.push({ title: tInsight('highSpeed', lang), status: tInsight('nervousSpeed', lang), description: tInsight('nervousSpeedDesc', lang), severity: 'warning' })
  } else if (hi(stability)) {
    insights.push({ title: tInsight('highSpeed', lang), status: tInsight('highSpeedConfidence', lang), description: tInsight('highSpeedConfidenceDesc', lang), severity: 'good' })
  } else if (lo(grip)) {
    insights.push({ title: tInsight('highSpeed', lang), status: tInsight('reducedConfidence', lang), description: tInsight('reducedConfidenceDesc', lang), severity: 'neutral' })
  } else if (hi(aggression)) {
    insights.push({ title: tInsight('highSpeed', lang), status: tInsight('livelySpeed', lang), description: tInsight('livelySpeedDesc', lang), severity: 'neutral' })
  } else {
    insights.push({ title: tInsight('highSpeed', lang), status: tInsight('stableCruiser', lang), description: tInsight('stableCruiserDesc', lang), severity: 'good' })
  }

  return insights
}

export function formatTuneText(result, input) {
  const modeLabel = { Road: 'Road', Dirt: 'Dirt', Drift: 'Drift', Drag: 'Drag', Beginner: 'Beginner' }
  const label = modeLabel[input.buildType] || input.buildType
  const dsLabel = input.drivingStyle || 'Balanced'

  const insights = generateDrivingInsights(result)
  const insightLines = insights.length > 0
    ? [
        ``,
        `--- Driving Insights ---`,
        ...insights.map(i => `${i.title}: ${i.status} — ${i.description}`),
      ]
    : []

  return [
    `Forza Tuning Calculator`,
    `Build: ${label}  |  Driving Style: ${dsLabel}  |  Drivetrain: ${input.drivetrain}  |  Class: ${input.classTier}`,
    `Weight: ${input.weightKg} kg  |  Power: ${input.powerHp} HP  |  Distribution: ${input.frontWeightPercent}% front`,
    `Tires: ${input.tireCompound}`,
    ``,
    `--- Settings ---`,
    `Tire Pressure:       ${result.tirePressureFront} psi front  /  ${result.tirePressureRear} psi rear`,
    `Final Drive:         ${result.finalDrive}`,
    `Camber:              ${result.camberFront}° front  /  ${result.camberRear}° rear`,
    `Toe:                 ${result.toeFront}° front  /  ${result.toeRear}° rear`,
    `Anti-Roll Bars:      ${result.antirollFront} front  /  ${result.antirollRear} rear`,
    `Springs:             ${result.springFront} N/mm front  /  ${result.springRear} N/mm rear`,
    `Ride Height:         ${result.rideHeight} cm`,
    `Brake Balance:       ${result.brakeBalance}% front`,
    `Brake Pressure:      ${result.brakePressure}%`,
    `Diff Accel:          ${result.diffAccel}%`,
    `Diff Decel:          ${result.diffDecel}%`,
    ...insightLines,
  ].join('\n')
}

export function generateApplySteps(result, lang = 'en') {
  const T = (key) => tStep(key, lang)
  return [
    {
      title: T('tirePressure'),
      items: [
        T('setFrontTire')(result.tirePressureFront),
        T('setRearTire')(result.tirePressureRear),
      ],
    },
    {
      title: T('gearing'),
      items: [
        T('setFinalDrive')(result.finalDrive),
      ],
    },
    {
      title: T('alignment'),
      items: [
        T('setFrontCamber')(result.camberFront),
        T('setRearCamber')(result.camberRear),
        T('setFrontToe')(result.toeFront),
        T('setRearToe')(result.toeRear),
      ],
    },
    {
      title: T('antiRollBars'),
      items: [
        T('setFrontARB')(result.antirollFront),
        T('setRearARB')(result.antirollRear),
      ],
    },
    {
      title: T('springsRideHeight'),
      items: [
        T('setFrontSprings')(result.springFront),
        T('setRearSprings')(result.springRear),
        T('setRideHeight')(result.rideHeight),
      ],
    },
    {
      title: T('brakes'),
      items: [
        T('setBrakeBalance')(result.brakeBalance),
        T('setBrakePressure')(result.brakePressure),
      ],
    },
    {
      title: T('differential'),
      items: result.diffAccel > 0
        ? [
            T('setDiffAccel')(result.diffAccel),
            T('setDiffDecel')(result.diffDecel),
          ]
        : [T('fwdNoDiff')],
    },
  ]
}

export function formatApplyStepsText(steps) {
  const lines = ['Forza Tuning Calculator — Apply In Game', '']
  steps.forEach((section, i) => {
    lines.push(`${i + 1}. ${section.title}`)
    section.items.forEach((item) => {
      lines.push(`   ${item}`)
    })
    lines.push('')
  })
  return lines.join('\n')
}
