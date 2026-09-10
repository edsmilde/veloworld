export function calculateTargetSpeed(power, grade) {
  const mass = 85;
  const gravity = 9.81;
  const rollingResistance = 0.004;
  const dragArea = 0.32;
  const airDensity = 1.225;
  const usablePower = power * 0.97;
  const gradeFraction = grade / 100;

  let low = 0;
  let high = 25;
  for (let iteration = 0; iteration < 30; iteration += 1) {
    const speed = (low + high) / 2;
    const force = mass * gravity * (rollingResistance + Math.max(gradeFraction, -0.003))
      + 0.5 * airDensity * dragArea * speed ** 2;
    if (force * speed > usablePower) high = speed;
    else low = speed;
  }

  const speed = grade < 0 ? Math.min(25, low + Math.abs(grade) * 0.13) : low;
  return {
    speed,
    model: {
      power: Math.round(power),
      usable: Math.round(usablePower),
      gravity: (mass * gravity * gradeFraction).toFixed(1),
      rolling: (mass * gravity * rollingResistance).toFixed(1),
      aero: (0.5 * airDensity * dragArea * speed ** 2).toFixed(1),
    },
  };
}
