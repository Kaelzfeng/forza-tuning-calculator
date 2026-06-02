/**
 * SEO Guide Center — All tuning guide content
 *
 * Each guide:
 * - 800–1200 words of substantive Forza tuning content
 * - SEO metadata (title, description)
 * - Key principles, common mistakes, recommended settings
 * - Related vehicles (filter config for Supabase fetch)
 * - Related guides (cross-linked slugs)
 */

export const GUIDES = [
  // ═══════════════════════════════════════════════════════════
  // 1. How to Tune AWD
  // ═══════════════════════════════════════════════════════════
  {
    slug: 'how-to-tune-awd',
    seoTitle: 'How To Tune AWD Cars In Forza — Complete Guide',
    seoDescription: 'Master AWD tuning in Forza Horizon and Motorsport. Learn suspension, differential, tire pressure, and gearing setups for all-wheel-drive cars.',
    h1: 'How To Tune AWD Cars In Forza',
    introduction: [
      'All-wheel-drive (AWD) cars dominate Forza leaderboards for good reason — they deliver superior traction, predictable handling, and launch harder than any other drivetrain. But a poorly tuned AWD car understeers like a freight train and wastes its potential on corner exit.',
      'This guide covers everything you need to turn an AWD car from a heavy, pushy mess into a corner-carving weapon. We\'ll walk through suspension geometry, differential tuning, tire pressure strategy, and final drive optimization specifically for AWD platforms.',
    ],
    keyPrinciples: [
      {
        title: 'Front-to-Rear Power Distribution',
        body: 'Most Forza AWD cars default to 50/50 torque split. For road racing, shift bias rearward (60-70% rear) to reduce understeer on corner exit. For dirt and rally, keep it closer to 50/50 or even front-biased (55/45 front) for maximum traction on loose surfaces.',
      },
      {
        title: 'Differential Tuning Is Critical',
        body: 'AWD cars have three differentials — front, center, and rear. The center diff is unique to AWD and controls front-to-rear torque transfer. Higher rear accel lock (70-85%) gives you RWD-like rotation on throttle. Keep front accel lock moderate (25-40%) to prevent the front from pulling wide.',
      },
      {
        title: 'Softer Front Springs, Stiffer Rear',
        body: 'AWD cars naturally understeer due to front weight and driven front wheels. Run 10-15% softer front springs than rear to help the car rotate. Pair this with a stiffer rear anti-roll bar to limit body roll without making the front too rigid.',
      },
      {
        title: 'Camber for AWD Grip',
        body: 'AWD cars benefit from moderate negative camber — around -2.0° to -2.5° front, and -1.5° to -2.0° rear. This maximizes the contact patch during cornering while the driven front wheels maintain acceleration grip.',
      },
      {
        title: 'Tire Pressure: Lower is Safer',
        body: 'Run 28-30 PSI on all four corners for road builds. Slightly lower rear pressure (0.5-1.0 PSI less than front) helps rear grip and reduces snap oversteer when the rear steps out under power.',
      },
    ],
    commonMistakes: [
      {
        title: 'Maxing Out Front Accel Lock',
        body: 'High front diff accel lock forces both front wheels to spin at the same speed, causing severe understeer. Keep front accel lock between 25-40% for most builds.',
      },
      {
        title: 'Equal Spring Rates Front and Rear',
        body: 'Copying front spring rates to the rear ignores the AWD understeer tendency. Always bias softer front or stiffer rear by at least 10%.',
      },
      {
        title: 'Ignoring Center Differential',
        body: 'The center diff is the most powerful tuning tool on AWD cars. A high rear bias (75%+) transforms corner exit rotation — don\'t leave it at the default 50/50.',
      },
      {
        title: 'Too Much Rear Downforce',
        body: 'Excessive rear aero on AWD cars creates high-speed understeer. Balance aero 55/45 front-to-rear or even 50/50 for neutral high-speed behavior.',
      },
    ],
    recommendedSettings: [
      { parameter: 'Tire Pressure', front: '28.5 PSI', rear: '28.0 PSI', notes: 'Lower 1 PSI for drift/dirt' },
      { parameter: 'Camber', front: '-2.2°', rear: '-1.8°', notes: 'Add -0.3° for S1+ class' },
      { parameter: 'Anti-Roll Bars', front: '20.0', rear: '24.0', notes: 'Stiffer rear for rotation' },
      { parameter: 'Springs', front: '550 lb/in', rear: '620 lb/in', notes: 'Scale with vehicle weight' },
      { parameter: 'Ride Height', front: '4.5 in', rear: '4.3 in', notes: 'Slight forward rake' },
      { parameter: 'Diff Accel', front: '35%', rear: '75%', notes: 'Center diff: 70% rear bias' },
      { parameter: 'Diff Decel', front: '15%', rear: '45%', notes: 'Lower decel = easier turn-in' },
    ],
    relatedVehiclesFilter: { drivetrain: 'AWD', orderField: 'horsepower', orderDir: false, limit: 4 },
    relatedGuides: ['road-tuning-guide', 'how-to-fix-understeer', 'how-to-fix-oversteer'],
  },

  // ═══════════════════════════════════════════════════════════
  // 2. How to Tune RWD
  // ═══════════════════════════════════════════════════════════
  {
    slug: 'how-to-tune-rwd',
    seoTitle: 'How To Tune RWD Cars In Forza — Complete Guide',
    seoDescription: 'Master rear-wheel-drive tuning for Forza. Learn to control oversteer, optimize differential settings, and build stable RWD setups for road and drift.',
    h1: 'How To Tune RWD Cars In Forza',
    introduction: [
      'Rear-wheel-drive (RWD) cars are the purest driving experience in Forza — light, agile, and endlessly adjustable. But they demand respect. Too much throttle mid-corner and you\'re facing the wrong way. Too little rear grip and every corner becomes a drift you didn\'t ask for.',
      'This guide teaches you how to harness RWD dynamics. We\'ll cover rear differential tuning, suspension setup for traction, tire pressure strategy, and how to build confidence-inspiring RWD setups that still rotate when you want them to.',
    ],
    keyPrinciples: [
      {
        title: 'Rear Differential Is Everything',
        body: 'On RWD cars, the rear diff controls how power reaches the ground. High accel lock (75-90%) forces both rear wheels to spin together — great for drifting, but causes snap oversteer on road builds. For road racing, target 60-75% accel lock. For drift, push to 85-95%.',
      },
      {
        title: 'Soft Rear Springs for Traction',
        body: 'Unlike AWD, RWD cars need softer rear springs to squat under acceleration and maximize rear tire contact. Run rear springs 10-20% softer than front on road builds. This lets the rear dig in on corner exit instead of spinning up.',
      },
      {
        title: 'Throttle Control Through Geometry',
        body: 'Rear toe-in (0.1° to 0.3°) stabilizes the rear under power. Negative front toe (-0.1° to -0.2°) sharpens turn-in. Together they create a car that turns eagerly but doesn\'t snap on exit.',
      },
      {
        title: 'Brake Balance Rearward',
        body: 'Shift brake bias slightly rearward (45-48% front) on RWD cars. This uses engine braking through the rear wheels to stabilize the car on corner entry — a technique called trail-braking that\'s essential for fast RWD driving.',
      },
      {
        title: 'Aero Balance Matters More',
        body: 'RWD cars lack front-driven wheels to pull them out of corners. Run slightly more front downforce than rear (55/45 split) to keep the nose planted during high-speed direction changes.',
      },
    ],
    commonMistakes: [
      {
        title: 'Stiff Rear Springs for "Responsiveness"',
        body: 'Stiff rear springs on RWD cars reduce weight transfer to the rear — the car can\'t squat, can\'t grip, and wheelspins everywhere. Softer rear springs are almost always faster.',
      },
      {
        title: '100% Rear Accel Diff Lock',
        body: 'Maximum accel lock forces both rear tires to break traction simultaneously. You want progressive slip, not binary grip/no-grip behavior. Stay at 60-80% for road.',
      },
      {
        title: 'Zero Rear Toe',
        body: 'Zero rear toe makes RWD cars twitchy under acceleration. Even 0.1° of toe-in dramatically stabilizes the rear without hurting rotation.',
      },
      {
        title: 'Ignoring Tire Compounds',
        body: 'RWD cars are more sensitive to tire choice than AWD. If you\'re struggling with traction, upgrade to semi-slick or race compounds before chasing suspension fixes.',
      },
    ],
    recommendedSettings: [
      { parameter: 'Tire Pressure', front: '29.0 PSI', rear: '28.0 PSI', notes: 'Lower rear for grip' },
      { parameter: 'Camber', front: '-2.5°', rear: '-1.5°', notes: 'More front camber for turn-in' },
      { parameter: 'Anti-Roll Bars', front: '22.0', rear: '18.0', notes: 'Softer rear for squat' },
      { parameter: 'Springs', front: '600 lb/in', rear: '500 lb/in', notes: '15-20% softer rear' },
      { parameter: 'Ride Height', front: '4.3 in', rear: '4.5 in', notes: 'Rear slightly higher' },
      { parameter: 'Diff Accel', rear: '70%', notes: 'Higher for drift (85-95%)' },
      { parameter: 'Diff Decel', rear: '35%', notes: 'Lower = looser on entry' },
      { parameter: 'Brake Balance', setting: '47% front', notes: 'Slight rear bias' },
    ],
    relatedVehiclesFilter: { drivetrain: 'RWD', orderField: 'horsepower', orderDir: false, limit: 4 },
    relatedGuides: ['drift-tuning-guide', 'how-to-fix-oversteer', 'road-tuning-guide'],
  },

  // ═══════════════════════════════════════════════════════════
  // 3. How to Fix Understeer
  // ═══════════════════════════════════════════════════════════
  {
    slug: 'how-to-fix-understeer',
    seoTitle: 'How To Fix Understeer In Forza — Complete Tuning Guide',
    seoDescription: 'Eliminate understeer in Forza with these proven tuning techniques. Adjust suspension, differentials, tire pressure, and aero for sharper turn-in and mid-corner rotation.',
    h1: 'How To Fix Understeer In Forza',
    introduction: [
      'Understeer is the most common handling complaint in Forza — the car pushes wide when you turn the wheel, refusing to rotate. It\'s frustrating, slow, and affects FWD and AWD cars most severely. But understeer is a tuning problem, not a permanent trait.',
      'This guide breaks down every tuning lever you can pull to eliminate understeer. From front suspension softening to differential adjustments and tire pressure tricks, you\'ll learn exactly which knobs to turn and in what order.',
    ],
    keyPrinciples: [
      {
        title: 'Soften the Front End First',
        body: 'The number one cause of understeer is a front end that\'s too stiff. Soften front springs by 10-20% and reduce front anti-roll bar stiffness. This lets the front tires load up progressively and maintain grip through the corner.',
      },
      {
        title: 'Stiffen the Rear',
        body: 'A stiffer rear end reduces rear grip relative to the front, naturally rotating the car. Increase rear spring rates by 10-15% and rear anti-roll bar by 20-30%. This is the fastest way to dial out push without sacrificing front mechanical grip.',
      },
      {
        title: 'Front Negative Camber',
        body: 'Increasing front negative camber to -2.5° or even -3.0° dramatically improves mid-corner front grip. The outside front tire rolls onto its full contact patch instead of its outer shoulder. This is especially effective on high-downforce S1 and S2 builds.',
      },
      {
        title: 'Differential Fixes for AWD',
        body: 'On AWD cars, reduce front accel diff lock to 20-30% and increase rear accel lock to 75-85%. Shift center diff bias rearward (65-75% rear). This makes the car behave more like RWD on exit, pulling the nose in.',
      },
      {
        title: 'Tire Pressure Differential',
        body: 'Run slightly higher front tire pressure (0.5-1.5 PSI more than rear). Higher pressure reduces the contact patch slightly, which seems counterintuitive — but it reduces rolling resistance at the front and helps the car rotate.',
      },
    ],
    commonMistakes: [
      {
        title: 'Adding More Front Downforce',
        body: 'More front aero seems like it should help — it pushes the nose down, right? But it actually increases understeer at speed by overloading the front tires. Reduce front aero or increase rear aero instead.',
      },
      {
        title: 'Lowering the Front Too Much',
        body: 'Slamming the front ride height looks aggressive but destroys suspension travel. The front suspension bottoms out mid-corner and the car skips wide. Keep at least 4.0 inches of front ride height.',
      },
      {
        title: 'Toe-In at the Front',
        body: 'Front toe-in stabilizes straight-line driving but resists turn-in. For sharper rotation, run 0° to -0.2° front toe (toe-out). The outside wheel turns slightly more than the inside, pulling the car into the corner.',
      },
    ],
    recommendedSettings: [
      { parameter: 'Front Springs', setting: '-15% from baseline', notes: 'Softer = more front grip' },
      { parameter: 'Rear Springs', setting: '+15% from baseline', notes: 'Stiffer = more rotation' },
      { parameter: 'Front ARB', setting: '-20% from baseline', notes: 'Less roll resistance up front' },
      { parameter: 'Rear ARB', setting: '+25% from baseline', notes: 'More roll resistance at rear' },
      { parameter: 'Front Camber', setting: '-2.5° to -3.0°', notes: 'Maximizes cornering contact' },
      { parameter: 'Front Toe', setting: '-0.1° to 0°', notes: 'Slight toe-out for turn-in' },
      { parameter: 'Tire Pressure', front: '30.0 PSI', rear: '28.5 PSI', notes: 'Front slightly higher' },
    ],
    relatedVehiclesFilter: { drivetrains: ['AWD', 'FWD'], orderField: 'horsepower', orderDir: false, limit: 4 },
    relatedGuides: ['how-to-tune-awd', 'road-tuning-guide', 'how-to-fix-oversteer'],
  },

  // ═══════════════════════════════════════════════════════════
  // 4. How to Fix Oversteer
  // ═══════════════════════════════════════════════════════════
  {
    slug: 'how-to-fix-oversteer',
    seoTitle: 'How To Fix Oversteer In Forza — Complete Tuning Guide',
    seoDescription: 'Stop spinning out in Forza. Learn to fix oversteer with precise suspension, differential, aero, and tire pressure adjustments for stable, predictable handling.',
    h1: 'How To Fix Oversteer In Forza',
    introduction: [
      'Oversteer — the rear end steps out mid-corner and suddenly you\'re facing the infield. While some oversteer is desirable for rotation, excessive oversteer is slow, unpredictable, and destroys lap times. RWD cars suffer most, but even AWD builds can develop snap oversteer with the wrong setup.',
      'This guide covers every technique to tame a loose rear end. From softening the rear suspension to dialing in differential decel lock and aero balance, you\'ll learn to build cars that are fast, stable, and confidence-inspiring.',
    ],
    keyPrinciples: [
      {
        title: 'Soften the Rear Suspension',
        body: 'A rear end that\'s too stiff bounces over bumps and loses contact with the road. Soften rear springs by 10-20% and reduce rear anti-roll bar stiffness. The rear tires need compliance to maintain grip — a rigid rear is a sliding rear.',
      },
      {
        title: 'Increase Rear Toe-In',
        body: 'Rear toe-in is the single most effective fix for oversteer. Each 0.1° of toe-in dramatically stabilizes the rear under acceleration and braking. Start at 0.2° and increase to 0.4° if needed. The trade-off is slightly more tire wear and drag.',
      },
      {
        title: 'Differential Decel Lock',
        body: 'Low rear diff decel lock (under 25%) lets the rear wheels spin at different speeds when you lift off the throttle — this causes lift-off oversteer. Increase decel lock to 40-55% to stabilize the rear during corner entry and braking.',
      },
      {
        title: 'Rear Downforce',
        body: 'Adding rear aero is the fastest high-speed oversteer fix. Even a small rear wing at minimum downforce stabilizes the car above 100 mph. For S1+ builds, run 55-65% of total downforce at the rear.',
      },
      {
        title: 'Softer Rear Damping',
        body: 'Reduce rear rebound damping by 10-15%. This lets the rear suspension extend more quickly after compression, keeping the tires planted over undulations instead of skipping across the surface.',
      },
    ],
    commonMistakes: [
      {
        title: 'Lowering Rear Tire Pressure Too Much',
        body: 'Dropping rear pressure seems logical for grip, but below 27 PSI the tire sidewall flexes excessively and the contact patch becomes unstable. Stay at 28-30 PSI for road builds.',
      },
      {
        title: 'Maximum Rear Downforce',
        body: 'Too much rear wing creates high-speed understeer and kills straight-line speed. Find the minimum rear downforce setting that stabilizes the car — usually 40-60% of the available range.',
      },
      {
        title: 'Ignoring Rear Camber',
        body: 'Excessive rear negative camber (-2.0° or more) reduces the contact patch under acceleration. Keep rear camber between -1.0° and -1.5° for stability under power.',
      },
    ],
    recommendedSettings: [
      { parameter: 'Rear Springs', setting: '-15% from baseline', notes: 'Softer rear = more grip' },
      { parameter: 'Rear ARB', setting: '-20% from baseline', notes: 'Less roll stiffness at rear' },
      { parameter: 'Rear Toe-In', setting: '0.2° to 0.4°', notes: 'Stability under power' },
      { parameter: 'Rear Camber', setting: '-1.2°', notes: 'Flatter contact patch' },
      { parameter: 'Rear Diff Decel', setting: '45-55%', notes: 'Higher = more stable on lift-off' },
      { parameter: 'Rear Aero', setting: '55% of max', notes: 'Start low, increase if needed' },
      { parameter: 'Tire Pressure', front: '29.0 PSI', rear: '29.5 PSI', notes: 'Rear slightly higher for stability' },
    ],
    relatedVehiclesFilter: { drivetrain: 'RWD', orderField: 'horsepower', orderDir: false, limit: 4 },
    relatedGuides: ['how-to-tune-rwd', 'drift-tuning-guide', 'how-to-fix-understeer'],
  },

  // ═══════════════════════════════════════════════════════════
  // 5. Complete Road Tuning Guide
  // ═══════════════════════════════════════════════════════════
  {
    slug: 'road-tuning-guide',
    seoTitle: 'Complete Road Tuning Guide For Forza — All Classes',
    seoDescription: 'The ultimate Forza road tuning guide covering every parameter: suspension, gearing, differential, aero, and tire pressure for D through S2 class road racing builds.',
    h1: 'Complete Road Tuning Guide',
    introduction: [
      'Road racing is the heart of Forza — asphalt circuits, point-to-point sprints, and street races demand a car that balances grip, stability, and rotation. Whether you\'re building a D-class hot hatch or an S2-class hypercar, the tuning principles are the same — only the numbers change.',
      'This comprehensive guide walks through every tuning category in order of importance. Follow this sequence when building a road tune from scratch, and you\'ll end up with a car that\'s fast, predictable, and race-ready.',
    ],
    keyPrinciples: [
      {
        title: 'Start With Tire Pressure',
        body: 'Tire pressure is your foundation. For road racing, target 28-30 PSI front and rear. Hot tire pressure (after 2-3 laps) should be 32-34 PSI — if it\'s higher, lower the starting pressure. If it\'s lower, raise it. Proper pressures maximize the contact patch and ensure consistent grip throughout a race.',
      },
      {
        title: 'Gearing for the Track',
        body: 'Final drive ratio determines your acceleration vs. top speed balance. For most road circuits, set the final drive so you hit the rev limiter at the end of the longest straight in top gear. For shorter, technical tracks, shorten the final drive by 5-10% for better corner exit acceleration.',
      },
      {
        title: 'Camber for Cornering Load',
        body: 'The harder you corner, the more negative camber you need. For D-B class: -1.5° to -2.0° front. For A-S1: -2.0° to -2.5° front. For S2-X: -2.5° to -3.0° front. Rear camber should be 0.3° to 0.5° less than front for stability under acceleration.',
      },
      {
        title: 'Suspension Stiffness by Class',
        body: 'Faster classes need stiffer springs to handle higher cornering loads. D-C class: 400-550 lb/in. B-A class: 550-700 lb/in. S1: 650-850 lb/in. S2-X: 750-1000+ lb/in. Always match damping to spring rates — stiffer springs need firmer damping.',
      },
      {
        title: 'Ride Height and Rake',
        body: 'Lower ride height reduces center of gravity and improves cornering. But too low destroys suspension travel. For road: 4.0-5.0 inches front, with 0.1-0.3 inches of forward rake (front lower than rear). Rake improves turn-in and high-speed stability.',
      },
    ],
    commonMistakes: [
      {
        title: 'Tuning in the Wrong Order',
        body: 'Many players jump straight to camber and springs before setting tire pressures. Wrong. Tire pressure → gearing → ride height → springs → damping → camber → toe → aero. Follow this order.',
      },
      {
        title: 'Copy-Pasting Tunes Between Cars',
        body: 'A perfect S1 Ferrari tune won\'t work on an S1 Audi. Weight distribution, wheelbase, and aero profile change everything. Each car needs its own baseline before fine-tuning.',
      },
      {
        title: 'Ignoring Track Characteristics',
        body: 'A tune for the Nürburgring (long straights, sweeping corners) is completely wrong for Maple Valley (tight, technical). Adjust final drive and aero for each track.',
      },
      {
        title: 'All Stiffness, No Compliance',
        body: 'Maxing out every stiffness slider creates a car that\'s twitchy and hard to drive. Compliance = grip. Leave some softness in the springs and bars.',
      },
    ],
    recommendedSettings: [
      { parameter: 'Tire Pressure', front: '29.0 PSI', rear: '29.0 PSI', notes: 'Adjust for hot 32-34 PSI' },
      { parameter: 'Final Drive', setting: '3.80-4.20', notes: 'Depends on track and power' },
      { parameter: 'Camber', front: '-2.2°', rear: '-1.8°', notes: 'More for higher class' },
      { parameter: 'Toe', front: '0°', rear: '0.1° in', notes: 'Stability baseline' },
      { parameter: 'Anti-Roll Bars', front: '22.0', rear: '20.0', notes: 'Slightly stiffer front' },
      { parameter: 'Springs', setting: 'Matched to class/weight', notes: 'See class guidelines above' },
      { parameter: 'Ride Height', front: '4.3 in', rear: '4.5 in', notes: '0.2 in forward rake' },
      { parameter: 'Brake Balance', setting: '50%', notes: 'Bias rearward for trail braking' },
    ],
    relatedVehiclesFilter: { classIn: ['S1', 'S2', 'A'], orderField: 'horsepower', orderDir: false, limit: 4 },
    relatedGuides: ['how-to-tune-awd', 'how-to-tune-rwd', 'how-to-fix-understeer', 'how-to-fix-oversteer'],
  },

  // ═══════════════════════════════════════════════════════════
  // 6. Complete Drift Tuning Guide
  // ═══════════════════════════════════════════════════════════
  {
    slug: 'drift-tuning-guide',
    seoTitle: 'Complete Drift Tuning Guide For Forza — Angle & Control',
    seoDescription: 'Build the ultimate Forza drift car. Master drift-specific suspension, differential, tire pressure, and gearing setups for high-angle, high-speed drifting.',
    h1: 'Complete Drift Tuning Guide',
    introduction: [
      'Drifting in Forza is an art form — and every great drift car starts with a purpose-built tune. A drift setup is radically different from a road racing setup. You\'re not chasing lap times — you\'re chasing angle, smoke, and style. Every parameter from tire pressure to differential lock serves a completely different goal.',
      'This guide covers the full drift tuning workflow: how to set up your suspension for smooth transitions, how to lock your diff for sustained slides, and how to choose tire pressures and gearing that let you hold angle from entry to exit.',
    ],
    keyPrinciples: [
      {
        title: 'Maximum Rear Diff Lock',
        body: 'Drift cars need both rear wheels spinning together at all times. Set rear diff accel to 90-100% and decel to 85-100%. This locks the rear axle, making both tires break traction simultaneously for predictable, sustained drifts.',
      },
      {
        title: 'Front Negative Camber for Angle',
        body: 'Drift cars spend most of their time at full opposite lock. High front negative camber (-3.0° to -4.5°) ensures the leading front tire maintains a flat contact patch when counter-steering. This is critical for controlling drift angle.',
      },
      {
        title: 'Stiff Front, Soft Rear',
        body: 'Opposite of road tuning: stiff front springs (650-900 lb/in) keep the nose responsive, while soft rear springs (350-500 lb/in) let the rear squat and maintain traction during transitions. This setup makes initiating and holding drifts effortless.',
      },
      {
        title: 'Rear Toe-Out for Initiation',
        body: 'Unlike road cars which use toe-in for stability, drift cars benefit from 0° to -0.3° rear toe (toe-out). This makes the rear more eager to step out on initiation. For smoother drifting, keep it at 0° — for aggressive entries, add toe-out.',
      },
      {
        title: 'Gearing for the Power Band',
        body: 'Drift cars need to stay in the power band through the entire corner. Set your final drive so you\'re at 70-80% of redline in your drift gear. Most drifters use 3rd or 4th gear — choose one gear and tune the final drive around it.',
      },
    ],
    commonMistakes: [
      {
        title: 'Stock Tire Compound',
        body: 'Stock or street tires have too much grip for drifting. Use sport or semi-slick tires (not race) — you want progressive breakaway, not binary grip levels. Race tires grip too hard and cause snappy transitions.',
      },
      {
        title: 'Road Tune Carryover',
        body: 'Drivers often keep road camber, toe, and spring settings when building a drift car. These settings fight against your drifts. Reset everything and build from scratch with drift-specific numbers.',
      },
      {
        title: 'Too Much Horsepower',
        body: 'You don\'t need 1,000+ HP to drift. 400-700 HP is the sweet spot — enough to break traction in 3rd/4th gear without making the car uncontrollable. More power just makes throttle modulation harder.',
      },
      {
        title: 'Low Rear Tire Pressure',
        body: 'Deflating rear tires for "more grip" on a drift car actually makes transitions sluggish. Keep rear pressures at 30-32 PSI for crisp, responsive breakaway characteristics.',
      },
    ],
    recommendedSettings: [
      { parameter: 'Tire Pressure', front: '30.0 PSI', rear: '32.0 PSI', notes: 'Higher rear for crisp slides' },
      { parameter: 'Front Camber', setting: '-3.5° to -4.5°', notes: 'Flatter contact at full lock' },
      { parameter: 'Rear Camber', setting: '-0.5° to -1.0°', notes: 'Minimal for rear grip' },
      { parameter: 'Front Toe', setting: '0° to 0.2° out', notes: 'Slight toe-out for initiation' },
      { parameter: 'Rear Toe', setting: '-0.2° to 0°', notes: 'Toe-out = more aggressive' },
      { parameter: 'Front Springs', setting: '700-900 lb/in', notes: 'Stiff for responsive front' },
      { parameter: 'Rear Springs', setting: '350-500 lb/in', notes: 'Soft for rear squat' },
      { parameter: 'Rear Diff Accel', setting: '95-100%', notes: 'Fully locked for drift' },
      { parameter: 'Rear Diff Decel', setting: '90-100%', notes: 'Locked on decel too' },
    ],
    relatedVehiclesFilter: { drivetrain: 'RWD', orderField: 'horsepower', orderDir: false, limit: 4 },
    relatedGuides: ['how-to-tune-rwd', 'how-to-fix-oversteer', 'road-tuning-guide'],
  },
]

/**
 * Get a guide by its slug.
 */
export function getGuideBySlug(slug) {
  return GUIDES.find(g => g.slug === slug) || null
}

/**
 * Get all guide slugs (for routing and sitemaps).
 */
export function getAllGuideSlugs() {
  return GUIDES.map(g => g.slug)
}
