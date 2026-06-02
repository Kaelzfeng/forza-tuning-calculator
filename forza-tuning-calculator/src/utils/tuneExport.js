export function buildTuneExport(tune) {
  return {
    title: tune.title || '',
    vehicle_id: tune.vehicle_id || null,
    vehicle_name: tune.vehicle_name || null,
    pi_class: tune.pi_class || null,
    build_type: tune.build_type || null,
    driving_style: tune.driving_style || null,
    drivetrain: tune.drivetrain || null,
    notes: tune.notes || null,
    tire_pressure_front: tune.tire_pressure_front ?? null,
    tire_pressure_rear: tune.tire_pressure_rear ?? null,
    gear_final_drive: tune.gear_final_drive ?? null,
    camber_front: tune.camber_front ?? null,
    camber_rear: tune.camber_rear ?? null,
    toe_front: tune.toe_front ?? null,
    toe_rear: tune.toe_rear ?? null,
    antiroll_front: tune.antiroll_front ?? null,
    antiroll_rear: tune.antiroll_rear ?? null,
    spring_front: tune.spring_front ?? null,
    spring_rear: tune.spring_rear ?? null,
    ride_height_front: tune.ride_height_front ?? null,
    ride_height_rear: tune.ride_height_rear ?? null,
    brake_balance: tune.brake_balance ?? null,
    brake_pressure: tune.brake_pressure ?? null,
    diff_accel: tune.diff_accel ?? null,
    diff_decel: tune.diff_decel ?? null,
    tune_data: tune.tune_data || null,
    exported_at: new Date().toISOString(),
    version: '1.0',
  }
}

export function downloadJson(data, filename) {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function exportTuneToJson(tune) {
  const data = buildTuneExport(tune)
  const slug = tune.slug || tune.id || 'tune'
  const filename = `${slug}.json`
  downloadJson(data, filename)
}
